import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import { getRazorpayConfig, createCommissionOrder, openRazorpayOrder, verifyCommissionPayment, isNativeRazorpayAvailable } from '../../services/payment';
import RazorpayWebCheckout from '../../components/RazorpayWebCheckout';

export default function CreatorWallet({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  // WebView Razorpay checkout state
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayConfig, setRazorpayConfig] = useState<{ keyId: string; orderId: string; amount: number; name: string }>({ keyId: '', orderId: '', amount: 0, name: '' });

  const load = useCallback(async () => {
    try {
      const [dashRes, configRes, bookingsRes] = await Promise.all([
        api.get('/creator/dashboard'),
        api.get('/config/public'),
        api.get('/creator/booking-requests').catch(() => ({ data: { bookings: [] } })),
      ]);
      setData(dashRes.data);
      setConfig(configRes.data);
      // Only bookings with amounts (for revenue breakdown)
      const allBookings = bookingsRes.data?.bookings || [];
      setBookings(allBookings.filter((b: any) => b.amount > 0 && !['rejected', 'cancelled'].includes(b.status)));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ═══ PAY COMMISSION (WebView fallback for guaranteed compatibility) ═══
  const handlePayCommission = async () => {
    let amount = 0;
    try {
      const freshData = await api.get('/creator/dashboard');
      amount = freshData.data?.commissionDue || 0;
    } catch {
      amount = data?.commissionDue || 0;
    }

    if (amount <= 0) { Alert.alert('No Dues', '✅ No commission dues'); return; }

    setPaying(true);
    try {
      const rpConfig = await getRazorpayConfig();
      if (!rpConfig.configured) { Alert.alert('Unavailable', 'Payment gateway not configured. Contact admin.'); setPaying(false); return; }

      const order = await createCommissionOrder(amount);
      if (!order.id) { Alert.alert('Error', 'Failed to create payment order. Try again.'); setPaying(false); return; }

      // Try native Razorpay first (production APK)
      if (isNativeRazorpayAvailable()) {
        try {
          const meRes = await api.get('/auth/me');
          const result = await openRazorpayOrder(rpConfig.keyId, order.id, amount, `Commission Payment — ₹${amount}`, meRes.data?.user?.name || '');
          const verified = await verifyCommissionPayment(result.razorpay_order_id, result.razorpay_payment_id, result.razorpay_signature, amount);
          if (verified) { Alert.alert('Success! ✅', 'Commission paid successfully!'); await load(); }
          else Alert.alert('Verification Failed', 'Contact support if charged.');
        } catch (e: any) {
          if (e.code !== 'PAYMENT_CANCELLED') Alert.alert('Failed', e.description || e.message || 'Payment failed');
        }
        setPaying(false);
      } else {
        // Fallback: WebView-based Razorpay checkout (works everywhere)
        const meRes = await api.get('/auth/me');
        setRazorpayConfig({ keyId: rpConfig.keyId, orderId: order.id, amount, name: meRes.data?.user?.name || '' });
        setShowRazorpay(true);
        setPaying(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to initiate payment');
      setPaying(false);
    }
  };

  // Handle WebView Razorpay success
  const handleRazorpaySuccess = async (paymentData: any) => {
    setShowRazorpay(false);
    setPaying(true);
    try {
      const verified = await verifyCommissionPayment(
        paymentData.razorpay_order_id,
        paymentData.razorpay_payment_id,
        paymentData.razorpay_signature,
        razorpayConfig.amount
      );
      if (verified) { Alert.alert('Success! ✅', 'Commission paid successfully!'); await load(); }
      else Alert.alert('Verification Failed', 'Payment received but verification failed. Contact support.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Verification failed');
    }
    setPaying(false);
  };

  if (loading) return <View style={s.container}><View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>Wallet & Earnings</Text></View><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const totalEarnings = data?.totalEarnings || 0;
  const monthlyEarnings = data?.monthlyEarnings || 0;
  const commissionDue = data?.commissionDue || 0;
  const commissionPaid = data?.commissionPaid || 0;
  const commissionTotal = data?.commissionTotal || 0;
  const subscriptionStatus = data?.subscriptionStatus || '';
  const subscriptionPrice = data?.subscriptionPlanPrice || 0;

  // Commission percentages from config
  const bmsPercent = config?.commission?.bmsLeadPercent || 5;
  const creatorPercent = config?.commission?.creatorLeadPercent || 3;

  // Revenue breakdown from bookings
  const bmsBookings = bookings.filter(b => b.leadSource !== 'creator');
  const creatorBookings = bookings.filter(b => b.leadSource === 'creator');
  const bmsRevenue = bmsBookings.reduce((s, b) => s + (b.amount || 0), 0);
  const creatorRevenue = creatorBookings.reduce((s, b) => s + (b.amount || 0), 0);
  const bmsCommission = bmsBookings.reduce((s, b) => s + (b.commissionAmount || 0), 0);
  const creatorCommission = creatorBookings.reduce((s, b) => s + (b.commissionAmount || 0), 0);
  const netEarnings = totalEarnings - commissionPaid;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Wallet & Earnings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ═══ SUBSCRIPTION CARD (same as website) ═══ */}
        <View style={[s.subCard, { borderLeftColor: subscriptionStatus === 'active' ? colors.success : subscriptionStatus === 'trial' ? colors.primary : colors.error }]}>
          <View style={s.subHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.subTitle}>Subscription · Basic Plan</Text>
              <View style={s.subGrid}>
                <Text style={s.subGridItem}><Text style={s.subGridLabel}>Status: </Text><Text style={{ color: subscriptionStatus === 'active' ? colors.success : subscriptionStatus === 'trial' ? colors.primary : colors.error, fontWeight: '600' }}>{subscriptionStatus === 'active' ? 'Active' : subscriptionStatus === 'trial' ? 'Free Trial' : subscriptionStatus === 'expired' ? 'Expired' : subscriptionStatus || 'N/A'}</Text></Text>
                <Text style={s.subGridItem}><Text style={s.subGridLabel}>AutoPay: </Text><Text style={{ color: data?.autoRenew ? colors.success : colors.error, fontWeight: '600' }}>{data?.autoRenew ? 'ON' : 'OFF'}</Text></Text>
                <Text style={s.subGridItem}><Text style={s.subGridLabel}>Days Left: </Text><Text style={{ color: (data?.subscriptionDaysLeft || 0) <= 5 ? colors.warning : colors.text, fontWeight: (data?.subscriptionDaysLeft || 0) <= 5 ? '700' : '400' }}>{data?.subscriptionDaysLeft ?? '—'}</Text></Text>
                {data?.subscriptionExpiry && <Text style={s.subGridItem}><Text style={s.subGridLabel}>Expiry: </Text>{new Date(data.subscriptionExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>}
              </View>
            </View>
            <View style={s.subPriceBox}>
              <Text style={s.subPriceAmount}>₹{subscriptionPrice}</Text>
              <Text style={s.subPriceUnit}>per month</Text>
            </View>
          </View>
          {/* AutoPay OFF message */}
          {!data?.autoRenew && (subscriptionStatus === 'active' || subscriptionStatus === 'trial') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' }}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
              <Text style={{ flex: 1, fontSize: 11, color: colors.warning }}>AutoPay is OFF. Subscription active until expiry. Enable AutoPay to avoid interruption.</Text>
            </View>
          )}
          <TouchableOpacity style={[s.subPayBtn, subscriptionStatus === 'active' && data?.autoRenew && s.subPayBtnOutline]} onPress={() => navigation.navigate('CreatorSubscription')} activeOpacity={0.8}>
            <Ionicons name={!data?.autoRenew && subscriptionStatus === 'active' ? "refresh-circle-outline" : "card-outline"} size={14} color={!data?.autoRenew && subscriptionStatus === 'active' ? colors.primary : subscriptionStatus === 'active' ? colors.primary : colors.textInverse} />
            <Text style={[s.subPayText, (subscriptionStatus === 'active') && { color: colors.primary }]}>
              {!data?.autoRenew && subscriptionStatus === 'active' ? 'Enable AutoPay' : subscriptionStatus === 'expired' || subscriptionStatus === 'overdue' ? 'Renew Subscription' : 'Manage Subscription'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ COMMISSION CARD (same as website) ═══ */}
        <View style={[s.commCard, { borderLeftColor: colors.primary }]}>
          <Text style={s.commTitle}>Commission</Text>
          <View style={s.commGrid}>
            <View style={s.commRow}><Text style={s.commLabel}>Total Earnings</Text><Text style={s.commVal}>₹{totalEarnings.toLocaleString('en-IN')}</Text></View>
            <View style={s.commRow}><Text style={s.commLabel}>Commission %</Text><Text style={s.commVal}>{bmsPercent}% / {creatorPercent}%</Text></View>
            <View style={s.commRow}><Text style={s.commLabel}>Commission Due</Text><Text style={[s.commVal, { color: colors.error, fontWeight: '700' }]}>₹{commissionDue.toLocaleString('en-IN')}</Text></View>
            <View style={s.commRow}><Text style={s.commLabel}>Commission Paid</Text><Text style={[s.commVal, { color: colors.success }]}>₹{commissionPaid.toLocaleString('en-IN')}</Text></View>
          </View>
          {commissionDue > 0 ? (
            <TouchableOpacity style={s.payBtn} onPress={handlePayCommission} disabled={paying} activeOpacity={0.8}>
              {paying ? <ActivityIndicator size="small" color={colors.textInverse} /> : (
                <Text style={s.payBtnText}>Pay Commission ₹{commissionDue.toLocaleString('en-IN')}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={s.noDuesBox}><Ionicons name="checkmark-circle" size={14} color={colors.success} /><Text style={s.noDuesText}>No commission dues</Text></View>
          )}
        </View>

        {/* ═══ STATS GRID (same as website) ═══ */}
        <View style={s.statsGrid}>
          <View style={s.statCard}><Text style={s.statVal}>{bookings.length}</Text><Text style={s.statLabel}>Total Bookings</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>{bmsBookings.length}</Text><Text style={s.statLabel}>BMS Leads</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>{creatorBookings.length}</Text><Text style={s.statLabel}>Creator Leads</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>₹{totalEarnings.toLocaleString('en-IN')}</Text><Text style={s.statLabel}>Revenue</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>₹{commissionTotal.toLocaleString('en-IN')}</Text><Text style={s.statLabel}>Platform Fee</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>₹{(totalEarnings - commissionTotal).toLocaleString('en-IN')}</Text><Text style={s.statLabel}>Your Earnings</Text></View>
        </View>

        {/* ═══ MONTHLY STATEMENT (same as website) ═══ */}
        <View style={s.statementCard}>
          <Text style={s.statementTitle}>Monthly Statement — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
          <StatementRow label={`BookMyShot Leads Revenue`} value={`₹${bmsRevenue.toLocaleString('en-IN')}`} />
          <StatementRow label={`BookMyShot Commission (${bmsPercent}%)`} value={`₹${bmsCommission.toLocaleString('en-IN')}`} danger />
          <StatementRow label={`Creator Leads Revenue`} value={`₹${creatorRevenue.toLocaleString('en-IN')}`} />
          <StatementRow label={`Creator Commission (${creatorPercent}%)`} value={`₹${creatorCommission.toLocaleString('en-IN')}`} danger />
          <View style={[s.statementRow, { borderBottomWidth: 0, paddingTop: spacing.md }]}>
            <Text style={[s.statementLabel, { color: colors.primary, fontWeight: '700' }]}>Total Commission Due</Text>
            <Text style={[s.statementVal, { color: colors.primary, fontWeight: '700' }]}>₹{commissionDue.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Fee Info */}
        <View style={s.feeInfo}>
          <Ionicons name="information-circle-outline" size={14} color={colors.info} />
          <Text style={s.feeText}>BMS leads ({bmsPercent}%) = bookings from BookMyShot platform. Creator leads ({creatorPercent}%) = your own clients added via the app. Commission is based on the highest deal amount set.</Text>
        </View>
      </ScrollView>

      {/* Razorpay WebView Checkout */}
      <RazorpayWebCheckout
        visible={showRazorpay}
        keyId={razorpayConfig.keyId}
        orderId={razorpayConfig.orderId}
        amount={razorpayConfig.amount}
        name="BookMyShot"
        description={`Commission Payment — ₹${razorpayConfig.amount}`}
        prefillName={razorpayConfig.name}
        onSuccess={handleRazorpaySuccess}
        onFailure={(error) => { setShowRazorpay(false); Alert.alert('Payment Failed', error?.description || 'Payment was not completed'); }}
        onClose={() => setShowRazorpay(false)}
      />
    </View>
  );
}

function StatementRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={s.statementRow}>
      <Text style={s.statementLabel}>{label}</Text>
      <Text style={[s.statementVal, danger && { color: colors.error }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  // Subscription Card
  subCard: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3 },
  subHeader: { flexDirection: 'row', gap: spacing.md },
  subTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.sm },
  subGrid: { gap: 3 },
  subGridItem: { ...typography.bodySm, color: colors.text },
  subGridLabel: { color: colors.textMuted },
  subPriceBox: { alignItems: 'center' },
  subPriceAmount: { ...typography.headlineLg, color: colors.primary },
  subPriceUnit: { ...typography.caption, color: colors.textMuted },
  subPayBtn: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  subPayBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  subPayText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  // Commission Card
  commCard: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3 },
  commTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md },
  commGrid: { gap: spacing.xs },
  commRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  commLabel: { ...typography.bodySm, color: colors.textMuted },
  commVal: { ...typography.bodySm, color: colors.text },
  payBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  payBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  noDuesBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.sm },
  noDuesText: { ...typography.bodySm, color: colors.success },
  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: spacing.xl, marginTop: spacing.xl, gap: spacing.sm },
  statCard: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  statVal: { ...typography.headlineSm, color: colors.primary, textAlign: 'center' },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  // Monthly Statement
  statementCard: { marginHorizontal: spacing.xl, marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  statementTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md },
  statementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  statementLabel: { ...typography.bodySm, color: colors.textMuted },
  statementVal: { ...typography.bodySm, color: colors.text },
  // Fee info
  feeInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.xl, backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(59,130,246,0.1)' },
  feeText: { ...typography.caption, color: colors.info, flex: 1, lineHeight: 16 },
});
