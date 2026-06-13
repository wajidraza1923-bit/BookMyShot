import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorSubscription({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashRes, configRes] = await Promise.all([
        api.get('/creator/dashboard'),
        api.get('/config/public'),
      ]);
      setData(dashRes.data);
      setConfig(configRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSubscribe = async () => {
    try {
      const { getRazorpayConfig, createSubscription, openRazorpaySubscription, verifySubscription, isNativeRazorpayAvailable } = require('../../services/payment');

      const rpConfig = await getRazorpayConfig();
      if (!rpConfig.configured) {
        Alert.alert('Unavailable', 'Payment gateway not configured. Contact admin.');
        return;
      }

      // Create subscription on backend (same as website POST /razorpay/create-subscription)
      const subRes = await createSubscription();

      if (subRes.status === 'active' || subRes.message === 'Subscription already active') {
        Alert.alert('Active', 'Your subscription is already active!');
        await load();
        return;
      }

      if (!subRes.subscriptionId) {
        Alert.alert('Error', 'Failed to create subscription. Try again.');
        return;
      }

      // Check if native Razorpay SDK is available (production APK only)
      if (isNativeRazorpayAvailable()) {
        try {
          const meRes = await api.get('/auth/me');
          const user = meRes.data?.user;

          // Open native Razorpay checkout (same as website Razorpay popup)
          const paymentResult = await openRazorpaySubscription(
            rpConfig.keyId,
            subRes.subscriptionId,
            user?.name || '',
            user?.email || ''
          );

          // Verify on backend (same as website POST /razorpay/verify-subscription)
          const verified = await verifySubscription(
            paymentResult.razorpay_subscription_id,
            paymentResult.razorpay_payment_id,
            paymentResult.razorpay_signature
          );

          if (verified) {
            Alert.alert('Success! 🎉', 'Subscription activated successfully!');
            await load();
          } else {
            Alert.alert('Verification Failed', 'Payment made but verification failed. Contact support if charged.');
          }
        } catch (e: any) {
          // Razorpay checkout was dismissed or payment failed
          if (e.code === 'PAYMENT_CANCELLED') {
            Alert.alert('Cancelled', 'Payment was cancelled.');
          } else {
            Alert.alert('Payment Failed', e.description || e.message || 'Please try again.');
          }
        }
      } else {
        // Development mode: show subscription ID for testing
        Alert.alert(
          'Development Mode',
          `Razorpay native SDK not available (Expo Go).\n\nSubscription ID: ${subRes.subscriptionId}\n\nIn production APK, the Razorpay checkout will open automatically.\n\nTo test: Use the website subscription page.`,
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to create subscription');
    }
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const subStatus = data?.subscriptionStatus || 'inactive';
  const planPrice = data?.subscriptionPlanPrice || config?.subscription?.monthlyPlanPrice || 0;
  const renewalPrice = config?.subscription?.monthlyPlanPrice || planPrice;
  const endDate = data?.subscriptionExpiry;
  const daysLeft = endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)) : 0;

  const isActive = subStatus === 'active' || subStatus === 'trial';
  const isExpired = subStatus === 'expired' || subStatus === 'suspended' || subStatus === 'overdue';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Subscription</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Status Card */}
        <View style={[s.statusCard, { borderColor: isActive ? colors.success + '30' : colors.error + '30' }]}>
          <View style={[s.statusIcon, { backgroundColor: isActive ? colors.success + '15' : colors.error + '15' }]}>
            <Ionicons name={isActive ? 'checkmark-circle' : 'alert-circle'} size={28} color={isActive ? colors.success : colors.error} />
          </View>
          <Text style={s.statusLabel}>{isActive ? 'Active Subscription' : isExpired ? 'Subscription Expired' : 'No Active Subscription'}</Text>
          <Text style={[s.statusBadge, { color: isActive ? colors.success : colors.error }]}>{subStatus.toUpperCase()}</Text>

          {isActive && endDate && (
            <View style={s.expiryRow}>
              <Text style={s.expiryLabel}>Expires: {new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
              <Text style={[s.daysLeft, { color: daysLeft <= 7 ? colors.error : colors.success }]}>{daysLeft} days left</Text>
            </View>
          )}
        </View>

        {/* Plan Details */}
        <View style={s.planCard}>
          <Text style={s.planTitle}>Creator Pro Plan</Text>
          <View style={s.priceRow}>
            <Text style={s.priceAmount}>₹{planPrice}</Text>
            <Text style={s.priceUnit}>/month</Text>
          </View>
          {planPrice !== renewalPrice && (
            <Text style={s.renewalNote}>Renewal price: ₹{renewalPrice}/month</Text>
          )}

          <View style={s.features}>
            <Feature text="Profile visible in search & listings" />
            <Feature text="Receive inquiries & bookings" />
            <Feature text="Accept payments from clients" />
            <Feature text="Portfolio & reels showcase" />
            <Feature text="Calendar & availability management" />
            <Feature text="Commission-based earnings" />
            <Feature text="Featured listing eligibility" />
            <Feature text="Priority support" />
          </View>

          {(!isActive || isExpired) && (
            <TouchableOpacity style={s.subscribeBtn} onPress={handleSubscribe} activeOpacity={0.85}>
              <Text style={s.subscribeBtnText}>{isExpired ? 'Renew Subscription' : 'Subscribe Now'} — ₹{renewalPrice}/mo</Text>
            </TouchableOpacity>
          )}

          {isActive && (
            <View style={s.activeNote}>
              <Ionicons name="shield-checkmark" size={14} color={colors.success} />
              <Text style={s.activeNoteText}>AutoPay active — renews automatically</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <Text style={s.infoText}>
            {isExpired
              ? 'Your subscription has expired. New bookings, inquiries, and events are disabled until you renew.'
              : 'Subscription is managed via Razorpay AutoPay. Payment is charged automatically each month.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return <View style={s.featureRow}><Ionicons name="checkmark-circle" size={14} color={colors.primary} /><Text style={s.featureText}>{text}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  statusCard: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, alignItems: 'center' },
  statusIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  statusLabel: { ...typography.headlineMd, color: colors.text, marginBottom: spacing.xs },
  statusBadge: { ...typography.labelMd, fontWeight: '700', letterSpacing: 1 },
  expiryRow: { marginTop: spacing.lg, alignItems: 'center' },
  expiryLabel: { ...typography.bodySm, color: colors.textSecondary },
  daysLeft: { ...typography.labelLg, fontWeight: '700', marginTop: spacing.xs },
  planCard: { marginHorizontal: spacing.xl, marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderGold },
  planTitle: { ...typography.headlineLg, color: colors.primary, marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.xs },
  priceAmount: { fontSize: 36, fontWeight: '700', color: colors.text },
  priceUnit: { ...typography.bodyMd, color: colors.textMuted, marginLeft: spacing.xs },
  renewalNote: { ...typography.caption, color: colors.warning, marginBottom: spacing.lg },
  features: { gap: spacing.md, marginTop: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureText: { ...typography.bodyMd, color: colors.textSecondary },
  subscribeBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center' },
  subscribeBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  activeNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  activeNoteText: { ...typography.bodySm, color: colors.success },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.xl, backgroundColor: 'rgba(59,130,246,0.06)', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)' },
  infoText: { ...typography.bodySm, color: colors.info, flex: 1, lineHeight: 18 },
});
