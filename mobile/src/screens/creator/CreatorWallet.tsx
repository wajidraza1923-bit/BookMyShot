import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import { getRazorpayConfig, createCommissionOrder, openRazorpayOrder, verifyCommissionPayment, isNativeRazorpayAvailable, getCreatorEarnings } from '../../services/payment';

export default function CreatorWallet({ navigation }: any) {
  const [data, setData] = useState<any>({ totalEarnings: 0, monthlyEarnings: 0, commissionDue: 0, commissionPaid: 0, pendingPayments: 0, subscriptionStatus: '', subscriptionPlanPrice: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/dashboard');
      if (res.data) setData(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ═══ PAY COMMISSION (same as website - Razorpay Checkout) ═══
  const handlePayCommission = async () => {
    if (!data.commissionDue || data.commissionDue <= 0) { Alert.alert('No Dues', 'No commission due'); return; }
    try {
      const rpConfig = await getRazorpayConfig();
      if (!rpConfig.configured) { Alert.alert('Unavailable', 'Payment gateway not configured.'); return; }

      // Create order on backend (same as website POST /razorpay/create-commission-order)
      const order = await createCommissionOrder(data.commissionDue);
      if (!order.id) { Alert.alert('Error', 'Failed to create payment order'); return; }

      if (isNativeRazorpayAvailable()) {
        try {
          const meRes = await api.get('/auth/me');
          const result = await openRazorpayOrder(rpConfig.keyId, order.id, data.commissionDue, 'Commission Payment', meRes.data?.user?.name || '');
          const verified = await verifyCommissionPayment(result.razorpay_order_id, result.razorpay_payment_id, result.razorpay_signature, data.commissionDue);
          if (verified) { Alert.alert('Success! ✅', 'Commission paid successfully!'); await load(); }
          else Alert.alert('Verification Failed', 'Contact support if charged.');
        } catch (e: any) {
          if (e.code !== 'PAYMENT_CANCELLED') Alert.alert('Failed', e.description || e.message || 'Payment failed');
        }
      } else {
        Alert.alert('Development Mode', `Commission: ₹${data.commissionDue}\nOrder ID: ${order.id}\n\nNative Razorpay requires production APK. Use website to pay commission during development.`);
      }
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Wallet</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Earnings</Text>
          <Text style={styles.balanceAmount}>₹{data.totalEarnings.toLocaleString('en-IN')}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}><Text style={styles.balanceStatLabel}>This Month</Text><Text style={styles.balanceStatValue}>₹{data.monthlyEarnings.toLocaleString('en-IN')}</Text></View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}><Text style={styles.balanceStatLabel}>Pending</Text><Text style={[styles.balanceStatValue, { color: colors.warning }]}>{data.pendingPayments}</Text></View>
          </View>
        </View>

        {/* Commission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission</Text>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Ionicons name="trending-down" size={16} color={colors.error} />
              <View><Text style={styles.rowLabel}>Due</Text><Text style={[styles.rowValue, { color: colors.error }]}>₹{data.commissionDue.toLocaleString('en-IN')}</Text></View>
            </View>
            <View style={styles.rowItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <View><Text style={styles.rowLabel}>Paid</Text><Text style={[styles.rowValue, { color: colors.success }]}>₹{(data.commissionPaid || 0).toLocaleString('en-IN')}</Text></View>
            </View>
          </View>
          {data.commissionDue > 0 && (
            <TouchableOpacity style={styles.payBtn} onPress={handlePayCommission}><Text style={styles.payBtnText}>Pay Commission ₹{data.commissionDue.toLocaleString('en-IN')}</Text></TouchableOpacity>
          )}
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.subRow}>
            <View>
              <Text style={styles.subPlan}>Creator Plan</Text>
              <Text style={styles.subPrice}>₹{data.subscriptionPlanPrice || 0}/month</Text>
            </View>
            <View style={[styles.subBadge, { backgroundColor: data.subscriptionStatus === 'active' ? colors.success + '15' : colors.warning + '15' }]}>
              <Text style={[styles.subBadgeText, { color: data.subscriptionStatus === 'active' ? colors.success : colors.warning }]}>{data.subscriptionStatus || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  balanceCard: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.xl, padding: spacing.xl },
  balanceLabel: { ...typography.labelMd, color: colors.textSecondary },
  balanceAmount: { ...typography.displayLg, color: colors.primary, marginTop: spacing.xs },
  balanceRow: { flexDirection: 'row', marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderGold },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatLabel: { ...typography.caption, color: colors.textMuted },
  balanceStatValue: { ...typography.headlineMd, color: colors.text, marginTop: 2 },
  balanceDivider: { width: 1, height: 30, backgroundColor: colors.borderGold },
  section: { marginHorizontal: spacing.xl, marginTop: spacing['2xl'] },
  sectionTitle: { ...typography.headlineSm, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  rowLabel: { ...typography.caption, color: colors.textMuted },
  rowValue: { ...typography.headlineSm, color: colors.text, marginTop: 1 },
  payBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  payBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  subPlan: { ...typography.headlineSm, color: colors.text },
  subPrice: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  subBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 1, borderRadius: radius.full },
  subBadgeText: { ...typography.labelMd, fontWeight: '600', textTransform: 'capitalize' },
});
