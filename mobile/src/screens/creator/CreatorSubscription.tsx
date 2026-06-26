import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import RazorpayWebCheckout from '../../components/RazorpayWebCheckout';

export default function CreatorSubscription({ navigation }: any) {
  const [creator, setCreator] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  // WebView Razorpay state for subscription
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [rpSubConfig, setRpSubConfig] = useState<{ keyId: string; subscriptionId: string; name: string; email: string }>({ keyId: '', subscriptionId: '', name: '', email: '' });

  const load = useCallback(async () => {
    try {
      const [dashRes, configRes, autopayRes] = await Promise.all([
        api.get('/creator/dashboard'),
        api.get('/config/public'),
        api.get('/razorpay/autopay-status').catch(() => ({ data: { data: {} } })),
      ]);
      setCreator(dashRes.data);
      setConfig(configRes.data);
      // Store autopay status in creator state
      if (autopayRes.data?.data) {
        setCreator((prev: any) => ({ ...prev, _autopay: autopayRes.data.data }));
      }
    } catch (e: any) {
      console.log('[Subscription] Load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSubscribe = async () => {
    setSubscribing(true);
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

          const paymentResult = await openRazorpaySubscription(
            rpConfig.keyId,
            subRes.subscriptionId,
            user?.name || '',
            user?.email || ''
          );

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
          if (e.code === 'PAYMENT_CANCELLED') {
            Alert.alert('Cancelled', 'Payment was cancelled.');
          } else {
            Alert.alert('Payment Failed', e.description || e.message || 'Please try again.');
          }
        }
      } else {
        // WebView fallback: open Razorpay checkout via WebView (works everywhere)
        const meRes = await api.get('/auth/me');
        setRpSubConfig({
          keyId: rpConfig.keyId,
          subscriptionId: subRes.subscriptionId,
          name: meRes.data?.user?.name || '',
          email: meRes.data?.user?.email || '',
        });
        setShowRazorpay(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to process subscription');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Subscription</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  // Parse subscription data (same fields as website uses)
  const subStatus = creator?.subscriptionStatus || 'inactive';
  const subEndDate = creator?.subscriptionExpiry ? new Date(creator.subscriptionExpiry) : null;
  const subStartDate = creator?.subscriptionStartDate ? new Date(creator.subscriptionStartDate) : null;
  const lastPaymentDate = creator?.lastPaymentDate ? new Date(creator.lastPaymentDate) : null;
  const autoRenew = creator?.autoRenew !== false;
  const daysRemaining = subEndDate ? Math.max(0, Math.ceil((subEndDate.getTime() - Date.now()) / 86400000)) : 0;

  // Price from platform settings database (NOT hardcoded)
  const monthlyPlanPrice = config?.subscription?.monthlyPlanPrice || 0;
  const creatorPlanPrice = creator?.subscriptionPlanPrice || monthlyPlanPrice;
  const renewalPrice = monthlyPlanPrice; // Current DB price for renewal
  const priceChanged = creatorPlanPrice > 0 && renewalPrice > 0 && creatorPlanPrice !== renewalPrice;

  // Status display
  const isActive = subStatus === 'active' || subStatus === 'trial';
  const isTrial = subStatus === 'trial';
  const isExpired = subStatus === 'expired' || subStatus === 'suspended' || subStatus === 'overdue';
  const isOverdue = subStatus === 'overdue';

  const statusColor = subStatus === 'active' ? colors.success
    : subStatus === 'trial' ? colors.primary
    : subStatus === 'overdue' ? colors.error
    : subStatus === 'expired' ? colors.error
    : colors.textMuted;

  const statusLabel = subStatus === 'active' ? 'Active'
    : subStatus === 'trial' ? 'Free Trial'
    : subStatus === 'overdue' ? 'OVERDUE'
    : subStatus === 'expired' ? 'Expired'
    : subStatus === 'suspended' ? 'Suspended'
    : 'Inactive';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Subscription</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Warning Banners */}
        {isOverdue && (
          <View style={s.warningBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={s.warningText}>Your account is overdue. Booking creation is disabled until payment is made.</Text>
          </View>
        )}
        {!isOverdue && isActive && daysRemaining > 0 && daysRemaining <= 5 && (
          <View style={[s.warningBanner, { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }]}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={[s.warningText, { color: colors.warning }]}>{daysRemaining} day{daysRemaining > 1 ? 's' : ''} remaining until subscription expires.</Text>
          </View>
        )}

        {/* Subscription Card */}
        <View style={[s.subCard, { borderLeftColor: statusColor }]}>
          <View style={s.subCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={s.planRow}>
                <Ionicons name="diamond" size={16} color={colors.primary} />
                <Text style={s.planName}>Subscription · Basic Plan</Text>
              </View>

              {/* Details Grid (same as website) */}
              <View style={s.detailsGrid}>
                <DetailRow label="Status" value={statusLabel} valueColor={statusColor} bold />
                <DetailRow label="Auto Renew" value={autoRenew ? 'ON' : 'OFF'} />
                <DetailRow label="Next Billing" value={subEndDate ? formatDate(subEndDate) : '—'} />
                <DetailRow label="Last Payment" value={lastPaymentDate ? formatDate(lastPaymentDate) : '—'} />
                <DetailRow label="Start Date" value={subStartDate ? formatDate(subStartDate) : '—'} />
                <DetailRow label="Days Remaining" value={subStatus ? String(daysRemaining) : '—'} valueColor={daysRemaining <= 5 ? colors.warning : undefined} bold={daysRemaining <= 5} />
              </View>
            </View>

            {/* Price */}
            <View style={s.priceBox}>
              <Text style={s.priceAmount}>₹{isActive ? creatorPlanPrice : renewalPrice}</Text>
              <Text style={s.priceUnit}>per month</Text>
              {priceChanged && isActive && (
                <Text style={s.renewalNote}>Renewal: ₹{renewalPrice}/mo</Text>
              )}
            </View>
          </View>

          {/* Subscribe/Renew Button */}
          {(isExpired || !subStatus || subStatus === 'inactive' || subStatus === 'pending_payment') && (
            <TouchableOpacity style={s.payBtn} onPress={handleSubscribe} disabled={subscribing} activeOpacity={0.85}>
              {subscribing ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={s.payBtnText}>Pay Subscription ₹{renewalPrice}</Text>
              )}
            </TouchableOpacity>
          )}

          {isActive && (
            <TouchableOpacity style={[s.payBtn, s.payBtnOutline]} onPress={handleSubscribe} disabled={subscribing} activeOpacity={0.85}>
              {subscribing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[s.payBtnText, { color: colors.primary }]}>Pay Subscription ₹{renewalPrice}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Features */}
        <View style={s.featuresCard}>
          <Text style={s.featuresTitle}>Plan Benefits</Text>
          <View style={s.featuresList}>
            <Feature text="Profile visible in search & listings" />
            <Feature text="Receive inquiries & bookings" />
            <Feature text="Accept payments from clients" />
            <Feature text="Portfolio & reels showcase" />
            <Feature text="Calendar & availability management" />
            <Feature text="Commission-based earnings" />
            <Feature text="Featured listing eligibility" />
            <Feature text="Priority support" />
          </View>
        </View>

        {/* AutoPay Info — shows REAL Razorpay status */}
        {(() => {
          const ap = creator?._autopay;
          const rpActive = ap?.autopayActive === true;
          const rpStatus = ap?.razorpayStatus || 'none';
          if (rpActive) {
            return (
              <View style={s.infoCard}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                <Text style={s.infoText}>AutoPay Active ({rpStatus}). Your subscription renews automatically each month via Razorpay.</Text>
              </View>
            );
          } else if (rpStatus !== 'none' && rpStatus !== 'error') {
            return (
              <View style={[s.infoCard, { borderColor: 'rgba(245,158,11,0.15)', backgroundColor: 'rgba(245,158,11,0.04)' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={[s.infoText, { color: colors.warning }]}>AutoPay is NOT active (status: {rpStatus}). Your subscription will NOT renew automatically. Tap "Pay Subscription" to re-enable.</Text>
              </View>
            );
          } else if (isActive) {
            return (
              <View style={[s.infoCard, { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={[s.infoText, { color: colors.textMuted }]}>AutoPay status unknown. If your subscription doesn't renew automatically, use the Pay button below.</Text>
              </View>
            );
          }
          return null;
        })()}

        {isExpired && (
          <View style={[s.infoCard, { borderColor: 'rgba(239,68,68,0.15)', backgroundColor: 'rgba(239,68,68,0.04)' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[s.infoText, { color: colors.error }]}>Your subscription has expired. New bookings, inquiries, and events are disabled until you renew.</Text>
          </View>
        )}

        {isTrial && (
          <View style={[s.infoCard, { borderColor: colors.borderGold, backgroundColor: 'rgba(212,175,55,0.04)' }]}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            <Text style={[s.infoText, { color: colors.primary }]}>You're on a free trial. Subscribe before it ends to keep your profile active.</Text>
          </View>
        )}
      </ScrollView>

      {/* Razorpay WebView Checkout for Subscription */}
      <RazorpayWebCheckout
        visible={showRazorpay}
        keyId={rpSubConfig.keyId}
        subscriptionId={rpSubConfig.subscriptionId}
        name="BookMyShot"
        description="Creator Monthly Subscription (AutoPay)"
        prefillName={rpSubConfig.name}
        prefillEmail={rpSubConfig.email}
        onSuccess={async (paymentData) => {
          setShowRazorpay(false);
          setSubscribing(true);
          try {
            const { verifySubscription } = require('../../services/payment');
            const verified = await verifySubscription(
              paymentData.razorpay_subscription_id,
              paymentData.razorpay_payment_id,
              paymentData.razorpay_signature
            );
            if (verified) { Alert.alert('Success! 🎉', 'Subscription activated!'); await load(); }
            else Alert.alert('Verification Failed', 'Contact support if charged.');
          } catch (e: any) { Alert.alert('Error', e.message || 'Verification failed'); }
          setSubscribing(false);
        }}
        onFailure={(error) => { setShowRazorpay(false); Alert.alert('Payment Failed', error?.description || 'Subscription payment was not completed'); }}
        onClose={() => { setShowRazorpay(false); setSubscribing(false); }}
      />
    </View>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DetailRow({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, valueColor ? { color: valueColor } : undefined, bold ? { fontWeight: '700' } : undefined]}>{value}</Text>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={s.featureRow}>
      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
      <Text style={s.featureText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },

  // Warning banners
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.md, padding: spacing.md, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: radius.lg },
  warningText: { ...typography.bodySm, color: colors.error, flex: 1 },

  // Subscription card
  subCard: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3 },
  subCardHeader: { flexDirection: 'row', gap: spacing.lg },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  planName: { ...typography.headlineSm, color: colors.primary },

  // Details grid
  detailsGrid: { gap: spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  detailLabel: { ...typography.caption, color: colors.textMuted },
  detailValue: { ...typography.bodySm, color: colors.text },

  // Price box
  priceBox: { alignItems: 'center', justifyContent: 'center' },
  priceAmount: { fontSize: 24, fontWeight: '700', color: colors.primary },
  priceUnit: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  renewalNote: { ...typography.caption, color: colors.warning, marginTop: spacing.xs },

  // Pay button
  payBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  payBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  payBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },

  // Features card
  featuresCard: { marginHorizontal: spacing.xl, marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderGold },
  featuresTitle: { ...typography.headlineSm, color: colors.text, marginBottom: spacing.lg },
  featuresList: { gap: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureText: { ...typography.bodyMd, color: colors.textSecondary },

  // Info cards
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.xl, backgroundColor: 'rgba(34,197,94,0.04)', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  infoText: { ...typography.bodySm, color: colors.success, flex: 1, lineHeight: 18 },
});
