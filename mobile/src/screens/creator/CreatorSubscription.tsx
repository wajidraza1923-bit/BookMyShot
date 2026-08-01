/**
 * CreatorSubscription — Clean, clear subscription management
 * Shows: Current plan status, Monthly/Yearly options, Payment history
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import RazorpayWebCheckout from '../../components/RazorpayWebCheckout';
import { useAuth } from '../../context/AuthContext';

export default function CreatorSubscription({ navigation }: any) {
  const { refreshUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>({ monthlyPrice: 199, yearlyPrice: 1999 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [rpConfig, setRpConfig] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [dashRes, msRes, invRes] = await Promise.all([
        api.get('/creator/dashboard').catch(() => ({ data: {} })),
        api.get('/master-settings').catch(() => ({ data: { data: {} } })),
        api.get('/razorpay/autopay-status').catch(() => ({ data: { data: {} } })),
      ]);
      setData({ ...dashRes.data, _autopay: invRes.data?.data || {} });
      const ms = msRes.data?.data || {};
      setConfig({
        monthlyPrice: ms.monthlySubscriptionPrice || 199,
        yearlyPrice: ms.yearlySubscriptionPrice || 1999,
      });
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ═══ SUBSCRIBE ═══
  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    setSubscribing(true);
    try {
      const { getRazorpayConfig, createSubscription, isNativeRazorpayAvailable } = require('../../services/payment');
      const rpCfg = await getRazorpayConfig();
      if (!rpCfg.configured) { Alert.alert('Unavailable', 'Payment gateway not configured'); setSubscribing(false); return; }

      const subRes = await createSubscription(planType);

      // Get user info for prefill
      const meRes = await api.get('/auth/me').catch(() => ({ data: { user: {} } }));
      const user = meRes.data?.user || {};

      if (subRes.isOneTime && subRes.orderId) {
        // Yearly: one-time order
        setRpConfig({ keyId: rpCfg.keyId, orderId: subRes.orderId, amount: subRes.amount, name: 'BookMyShot Yearly Plan', description: `₹${subRes.amount} for 12 months`, prefillName: user.name || '', prefillEmail: user.email || '', planType: 'yearly' });
      } else if (subRes.subscriptionId) {
        // Monthly: subscription
        setRpConfig({ keyId: rpCfg.keyId, subscriptionId: subRes.subscriptionId, name: 'BookMyShot Monthly Plan', description: `₹${config.monthlyPrice}/month AutoPay`, prefillName: user.name || '', prefillEmail: user.email || '', planType: 'monthly' });
      } else {
        Alert.alert('Error', 'Failed to create subscription');
        setSubscribing(false);
        return;
      }
      setShowRazorpay(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Subscription failed');
    }
    setSubscribing(false);
  };

  // ═══ RAZORPAY CALLBACKS ═══
  const onPaySuccess = async (paymentData: any) => {
    setShowRazorpay(false);
    setSubscribing(true);
    try {
      if (rpConfig?.planType === 'yearly') {
        const res = await api.post('/razorpay/verify-yearly-payment', {
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        });
        if (res.data?.success) { Alert.alert('🎉 Success!', res.data.message || 'Yearly plan activated!'); }
        else Alert.alert('Verification Failed', 'Contact support if charged.');
      } else {
        const { verifySubscription } = require('../../services/payment');
        const verified = await verifySubscription(paymentData.razorpay_subscription_id, paymentData.razorpay_payment_id, paymentData.razorpay_signature);
        if (verified) Alert.alert('🎉 Success!', 'Monthly AutoPay activated!');
        else Alert.alert('Verification Failed', 'Contact support if charged.');
      }
      await load();
      await refreshUser();
    } catch (e: any) { Alert.alert('Error', e.message || 'Verification failed'); }
    setSubscribing(false);
  };

  const onPayFail = (err: any) => { setShowRazorpay(false); Alert.alert('Payment Failed', err?.description || 'Try again'); };
  const onPayClose = () => { setShowRazorpay(false); setSubscribing(false); };

  // ═══ CANCEL AUTOPAY ═══
  const cancelAutoPay = () => {
    Alert.alert('Turn Off AutoPay?', 'Your subscription stays active until expiry. Auto-renewal will be disabled.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Turn Off', style: 'destructive', onPress: async () => {
        try {
          await api.post('/razorpay/cancel-subscription');
          Alert.alert('Done', 'AutoPay disabled. Subscription active until expiry.');
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }},
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  // Parse data
  const status = data?.subscriptionStatus || 'free';
  const planType = data?.subscriptionPlanType || 'none';
  const endDate = data?.subscriptionExpiry ? new Date(data.subscriptionExpiry) : null;
  const startDate = data?.subscriptionStartDate ? new Date(data.subscriptionStartDate) : null;
  const lastPay = data?.lastPaymentDate ? new Date(data.lastPaymentDate) : null;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : 0;
  const isActive = status === 'active' || status === 'trial';
  const autoRenew = data?.autoRenew === true || data?._autopay?.autopayActive === true || data?._autopay?.autoRenew === true;
  const planPrice = data?.subscriptionPlanPrice || config.monthlyPrice;

  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.title}>Subscription</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ═══ CURRENT PLAN STATUS ═══ */}
        <View style={[s.statusCard, isActive ? s.statusActive : s.statusInactive]}>
          <View style={s.statusHeader}>
            <Ionicons name={isActive ? 'shield-checkmark' : 'alert-circle'} size={28} color={isActive ? '#10B981' : '#EF4444'} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.statusTitle}>{isActive ? '✅ Active' : status === 'expired' ? '⚠️ Expired' : '🔒 Free Plan'}</Text>
              <Text style={s.statusSub}>
                {isActive ? `${planType === 'yearly' ? 'Yearly' : 'Monthly'} Plan • ₹${planPrice}${planType === 'monthly' ? '/mo' : '/yr'}` : status === 'expired' ? 'Your subscription has expired' : 'Subscribe to unlock unlimited leads & bookings'}
              </Text>
            </View>
          </View>

          {isActive && (
            <View style={s.statusDetails}>
              <View style={s.detailRow}><Text style={s.detailLabel}>Plan Type</Text><Text style={s.detailValue}>{planType === 'yearly' ? '📅 Yearly (12 months)' : '🔄 Monthly (AutoPay)'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Amount</Text><Text style={s.detailValue}>₹{planPrice}{planType === 'monthly' ? '/month' : '/year'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Started</Text><Text style={s.detailValue}>{startDate ? formatDate(startDate) : '—'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Expires</Text><Text style={[s.detailValue, daysLeft <= 7 && { color: '#EF4444', fontWeight: '700' }]}>{endDate ? formatDate(endDate) : '—'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Days Left</Text><Text style={[s.detailValue, daysLeft <= 7 && { color: '#EF4444', fontWeight: '700' }]}>{daysLeft} days</Text></View>
              {planType === 'monthly' && <View style={s.detailRow}><Text style={s.detailLabel}>AutoPay</Text><Text style={[s.detailValue, { color: autoRenew ? '#10B981' : '#EF4444' }]}>{autoRenew ? '✅ ON' : '❌ OFF'}</Text></View>}
              {lastPay && <View style={s.detailRow}><Text style={s.detailLabel}>Last Payment</Text><Text style={s.detailValue}>{formatDate(lastPay)}</Text></View>}
            </View>
          )}

          {/* AutoPay toggle */}
          {isActive && planType === 'monthly' && autoRenew && (
            <TouchableOpacity style={s.cancelBtn} onPress={cancelAutoPay}>
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={s.cancelText}>Turn Off AutoPay</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ PLANS SECTION ═══ */}
        <Text style={s.sectionTitle}>{isActive ? 'Switch Plan' : 'Choose a Plan'}</Text>

        {/* Monthly Plan */}
        <TouchableOpacity style={[s.planCard, planType === 'monthly' && isActive && s.planCardActive]} activeOpacity={0.85} onPress={() => { if (isActive && planType === 'monthly') return; handleSubscribe('monthly'); }} disabled={subscribing}>
          <View style={s.planHeader}>
            <View style={[s.planIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="refresh" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.planName}>Monthly Plan</Text>
              <Text style={s.planDesc}>AutoPay • Renews every month</Text>
            </View>
            <View style={s.priceBox}>
              <Text style={s.priceAmount}>₹{config.monthlyPrice}</Text>
              <Text style={s.priceUnit}>/month</Text>
            </View>
          </View>
          <View style={s.planFeatures}>
            <Feature text="Pay ₹199 now + ₹199 auto-deducted monthly" />
            <Feature text="Cancel anytime from this screen" />
            <Feature text="Unlimited leads & bookings" />
            <Feature text="Profile visible in search" />
          </View>
          {planType === 'monthly' && isActive ? (
            <View style={s.currentBadge}><Text style={s.currentBadgeText}>✅ CURRENT PLAN</Text></View>
          ) : (
            <View style={s.buyBtnWrap}>
              {subscribing ? <ActivityIndicator color="#fff" /> : <Text style={s.buyBtnText}>Subscribe Monthly — ₹{config.monthlyPrice}</Text>}
            </View>
          )}
        </TouchableOpacity>

        {/* Yearly Plan */}
        <TouchableOpacity style={[s.planCard, planType === 'yearly' && isActive && s.planCardActive]} activeOpacity={0.85} onPress={() => { if (isActive && planType === 'yearly') return; handleSubscribe('yearly'); }} disabled={subscribing}>
          <View style={s.planHeader}>
            <View style={[s.planIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="diamond" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.planName}>Yearly Plan ⭐</Text>
              <Text style={s.planDesc}>One-time payment • Save 2 months</Text>
            </View>
            <View style={s.priceBox}>
              <Text style={s.priceAmount}>₹{config.yearlyPrice}</Text>
              <Text style={s.priceUnit}>/year</Text>
            </View>
          </View>
          <View style={s.planFeatures}>
            <Feature text={`Pay ₹${config.yearlyPrice} once (saves ₹${config.monthlyPrice * 12 - config.yearlyPrice})`} />
            <Feature text="No AutoPay — single payment for 12 months" />
            <Feature text="Unlimited leads & bookings" />
            <Feature text="Priority support & premium badge" />
          </View>
          {planType === 'yearly' && isActive ? (
            <View style={s.currentBadge}><Text style={s.currentBadgeText}>✅ CURRENT PLAN</Text></View>
          ) : (
            <View style={[s.buyBtnWrap, { backgroundColor: '#D97706' }]}>
              {subscribing ? <ActivityIndicator color="#fff" /> : <Text style={s.buyBtnText}>Buy Yearly — ₹{config.yearlyPrice}</Text>}
            </View>
          )}
        </TouchableOpacity>

        {/* ═══ FREE PLAN INFO (if not subscribed) ═══ */}
        {!isActive && (
          <View style={s.freeInfo}>
            <Ionicons name="information-circle" size={16} color="#6B7280" />
            <Text style={s.freeInfoText}>Free plan: {data?.freeLeadsLimit || 3} leads/month. Subscribe to unlock unlimited.</Text>
          </View>
        )}

        {/* ═══ PAYMENT HISTORY ═══ */}
        <Text style={s.sectionTitle}>Payment History</Text>
        {lastPay ? (
          <View style={s.historyCard}>
            <View style={s.historyItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.historyTitle}>{planType === 'yearly' ? 'Yearly Subscription' : 'Monthly AutoPay'}</Text>
                <Text style={s.historyDate}>{lastPay ? formatDate(lastPay) : '—'}</Text>
              </View>
              <Text style={s.historyAmount}>₹{planPrice}</Text>
            </View>
          </View>
        ) : (
          <Text style={s.emptyHistory}>No payments yet</Text>
        )}
      </ScrollView>

      {/* ═══ RAZORPAY WEBVIEW ═══ */}
      {showRazorpay && rpConfig && (
        <RazorpayWebCheckout
          visible={true}
          keyId={rpConfig.keyId}
          subscriptionId={rpConfig.subscriptionId}
          orderId={rpConfig.orderId}
          amount={rpConfig.amount}
          name={rpConfig.name}
          description={rpConfig.description}
          prefillName={rpConfig.prefillName}
          prefillEmail={rpConfig.prefillEmail}
          onSuccess={onPaySuccess}
          onFailure={onPayFail}
          onClose={onPayClose}
        />
      )}
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
      <Text style={{ fontSize: 11, color: '#4B5563' }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },

  // Status Card
  statusCard: { margin: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  statusActive: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusInactive: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusHeader: { flexDirection: 'row', alignItems: 'center' },
  statusTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  statusSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 12, color: '#6B7280' },
  detailValue: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  cancelText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

  // Section
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },

  // Plan Cards
  planCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  planCardActive: { borderColor: '#10B981', borderWidth: 2, backgroundColor: '#F0FDF4' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  planIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  planDesc: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  priceBox: { alignItems: 'flex-end' },
  priceAmount: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  priceUnit: { fontSize: 10, color: '#9CA3AF' },
  planFeatures: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  currentBadge: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' },
  currentBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  buyBtnWrap: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#6C3BFF' },
  buyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Free info
  freeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 10 },
  freeInfoText: { fontSize: 11, color: '#6B7280', flex: 1 },

  // History
  historyCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  historyItem: { flexDirection: 'row', alignItems: 'center' },
  historyTitle: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  historyDate: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  historyAmount: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  emptyHistory: { fontSize: 12, color: '#9CA3AF', marginLeft: 16, marginBottom: 20 },
});
