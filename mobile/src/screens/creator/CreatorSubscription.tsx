import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import RazorpayWebCheckout from '../../components/RazorpayWebCheckout';
import useRealTime from '../../hooks/useRealTime';

export default function CreatorSubscription({ navigation }: any) {
  const [creator, setCreator] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
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

  // ═══ REAL-TIME: Listen for subscription status changes via Socket.IO ═══
  useRealTime('subscription:updated', (data: any) => {
    console.log('[Subscription] Real-time update received:', data);
    // Merge the real-time data into creator state
    setCreator((prev: any) => ({
      ...prev,
      subscriptionStatus: data.subscriptionStatus || prev?.subscriptionStatus,
      autoRenew: data.autoRenew ?? prev?.autoRenew,
      subscriptionExpiry: data.subscriptionEndDate || prev?.subscriptionExpiry,
      _autopay: {
        ...prev?._autopay,
        autopayActive: data.autopayActive ?? false,
        razorpayStatus: data.razorpayStatus || prev?._autopay?.razorpayStatus,
        autoRenew: data.autoRenew ?? false,
        subscriptionEndDate: data.subscriptionEndDate || prev?._autopay?.subscriptionEndDate,
        daysRemaining: data.daysRemaining ?? prev?._autopay?.daysRemaining,
        message: data.message || prev?._autopay?.message,
      },
    }));
  });

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { getRazorpayConfig, createSubscription, openRazorpaySubscription, openRazorpayOrder, verifySubscription, verifyCommissionPayment, isNativeRazorpayAvailable } = require('../../services/payment');

      // Check if AutoPay is already ON (monthly only)
      if (selectedPlan === 'monthly') {
        const ap = creator?._autopay;
        if (ap?.autopayActive === true) {
          Alert.alert('AutoPay Already Enabled', 'Your AutoPay is already active. Future subscription payments will be deducted automatically.');
          setSubscribing(false);
          return;
        }
      }

      const rpConfig = await getRazorpayConfig();
      if (!rpConfig.configured) {
        Alert.alert('Unavailable', 'Payment gateway not configured. Contact admin.');
        return;
      }

      // Create subscription/order on backend
      const subRes = await createSubscription(selectedPlan);

      // ═══ YEARLY: One-time payment flow (Razorpay Orders API) ═══
      if (subRes.isOneTime && subRes.orderId) {
        const meRes = await api.get('/auth/me');
        const userName = meRes.data?.user?.name || '';

        if (isNativeRazorpayAvailable()) {
          try {
            const paymentResult = await openRazorpayOrder(rpConfig.keyId, subRes.orderId, subRes.amount, 'BookMyShot Yearly Subscription', userName);
            // Verify yearly payment
            const verifyRes = await api.post('/razorpay/verify-yearly-payment', {
              razorpay_order_id: paymentResult.razorpay_order_id,
              razorpay_payment_id: paymentResult.razorpay_payment_id,
              razorpay_signature: paymentResult.razorpay_signature,
            });
            if (verifyRes.data?.success) {
              Alert.alert('Success! 🎉', verifyRes.data.message || 'Yearly subscription activated!');
              await load();
            } else {
              Alert.alert('Verification Failed', 'Payment made but verification failed. Contact support.');
            }
          } catch (e: any) {
            if (e.code === 'PAYMENT_CANCELLED') Alert.alert('Cancelled', 'Payment was cancelled.');
            else Alert.alert('Payment Failed', e.description || e.message || 'Please try again.');
          }
        } else {
          // WebView fallback for yearly
          const meRes2 = await api.get('/auth/me');
          setRpSubConfig({ keyId: rpConfig.keyId, subscriptionId: subRes.orderId, name: meRes2.data?.user?.name || '', email: meRes2.data?.user?.email || '' });
          setShowRazorpay(true);
        }
        setSubscribing(false);
        return;
      }

      // ═══ MONTHLY: Recurring subscription flow ═══
      if (subRes.status === 'active' && subRes.autopayActive) {
        Alert.alert('AutoPay Already Enabled', 'Your AutoPay is already active.');
        await load();
        setSubscribing(false);
        return;
      }

      if (!subRes.subscriptionId) {
        Alert.alert('Error', 'Failed to create subscription. Try again.');
        setSubscribing(false);
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

  // ═══ CANCEL AUTOPAY (turn off auto-renewal, keep subscription active) ═══
  const handleCancelAutoPay = async () => {
    Alert.alert(
      'Turn Off AutoPay?',
      'Auto-renewal will be disabled. Your subscription will remain active until the expiry date. You can enable AutoPay again anytime.',
      [
        { text: 'Keep AutoPay', style: 'cancel' },
        {
          text: 'Turn Off',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await api.post('/razorpay/cancel-subscription', {});
              if (res.data?.success) {
                Alert.alert(
                  'AutoPay Turned Off',
                  res.data.message || 'Your subscription remains active until expiry. Auto-renewal has been disabled.',
                );
                await load();
              } else {
                Alert.alert('Error', res.data?.message || 'Failed to turn off AutoPay');
              }
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to cancel AutoPay');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
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

  // Parse subscription data
  const subStatus = creator?.subscriptionStatus || 'inactive';
  const subEndDate = creator?.subscriptionExpiry ? new Date(creator.subscriptionExpiry) : (creator?.subscriptionEndDate ? new Date(creator.subscriptionEndDate) : null);
  const subStartDate = creator?.subscriptionStartDate ? new Date(creator.subscriptionStartDate) : null;
  const lastPaymentDate = creator?.lastPaymentDate ? new Date(creator.lastPaymentDate) : null;
  const autoRenew = creator?._autopay?.autopayActive === true || (creator?._autopay?.autoRenew === true) || false;
  const daysRemaining = subEndDate ? Math.max(0, Math.ceil((subEndDate.getTime() - Date.now()) / 86400000)) : 0;
  const currentPlanType = creator?.subscriptionPlanType || 'monthly';

  // Prices from admin panel (NOT hardcoded)
  const monthlyPlanPrice = config?.subscription?.monthlyPlanPrice || 0;
  const yearlyPlanPrice = config?.subscription?.yearlyPlanPrice || (monthlyPlanPrice * 10);
  const creatorPlanPrice = creator?.subscriptionPlanPrice || monthlyPlanPrice;

  // Status
  const isActive = subStatus === 'active' || subStatus === 'trial';
  const isTrial = subStatus === 'trial';
  const isExpired = subStatus === 'expired' || subStatus === 'suspended' || subStatus === 'overdue';
  const isOverdue = subStatus === 'overdue';

  // Is the user viewing the yearly preview (selected yearly but doesn't have it yet)
  const isViewingYearlyPreview = selectedPlan === 'yearly' && !(isActive && currentPlanType === 'yearly');
  const isViewingMonthlyPreview = selectedPlan === 'monthly' && !(isActive && currentPlanType === 'monthly');

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
                <Text style={s.planName}>
                  {isViewingYearlyPreview ? 'Yearly Premium Plan' : (isActive && currentPlanType === 'yearly') ? 'Yearly Plan' : isActive ? 'Monthly Plan' : 'Subscription'}
                </Text>
              </View>

              {/* Details Grid — switches between current plan data and yearly preview */}
              <View style={s.detailsGrid}>
                {isViewingYearlyPreview && !isActive ? (
                  <>
                    <DetailRow label="Status" value="Available" valueColor={colors.primary} />
                    <DetailRow label="Plan Type" value="Yearly (12 Months)" />
                    <DetailRow label="AutoPay" value="Not Required (One-time)" valueColor={colors.textMuted} />
                    <DetailRow label="Start Date" value="Today (after purchase)" />
                    <DetailRow label="Expiry Date" value={formatDate(new Date(Date.now() + 365 * 86400000))} />
                    <DetailRow label="Days" value="365 days" />
                    <DetailRow label="Offer" value={config?.subscription?.yearlyPlanDescription || '12 months for price of 10'} valueColor={colors.success} />
                  </>
                ) : isViewingYearlyPreview && isActive ? (
                  <>
                    <DetailRow label="Current" value={`${statusLabel} (Monthly)`} valueColor={statusColor} />
                    <DetailRow label="Upgrade To" value="Yearly (12 Months)" valueColor={colors.primary} bold />
                    <DetailRow label="AutoPay" value="Not Required" valueColor={colors.textMuted} />
                    <DetailRow label="New Start" value="Today (after payment)" />
                    <DetailRow label="New Expiry" value={formatDate(new Date(Date.now() + 365 * 86400000))} />
                    <DetailRow label="Duration" value="365 days" />
                    <DetailRow label="Offer" value={config?.subscription?.yearlyPlanDescription || '12 months for price of 10'} valueColor={colors.success} />
                  </>
                ) : (
                  <>
                    <DetailRow label="Status" value={statusLabel} valueColor={statusColor} bold />
                    <DetailRow label="Plan Type" value={currentPlanType === 'yearly' ? 'Yearly (12 Months)' : 'Monthly (AutoPay)'} />
                    <DetailRow label="AutoPay" value={currentPlanType === 'yearly' ? 'OFF (One-time)' : (autoRenew ? 'ON' : 'OFF')} valueColor={currentPlanType === 'yearly' ? colors.textMuted : (autoRenew ? colors.success : colors.error)} />
                    <DetailRow label="Start Date" value={subStartDate ? formatDate(subStartDate) : '\u2014'} />
                    <DetailRow label="Expiry Date" value={subEndDate ? formatDate(subEndDate) : '\u2014'} valueColor={daysRemaining <= 7 ? colors.warning : undefined} />
                    <DetailRow label="Days Remaining" value={isActive ? String(daysRemaining) : '\u2014'} valueColor={daysRemaining <= 5 ? colors.error : daysRemaining <= 15 ? colors.warning : undefined} bold={daysRemaining <= 7} />
                    <DetailRow label="Last Payment" value={lastPaymentDate ? formatDate(lastPaymentDate) : '\u2014'} />
                  </>
                )}
              </View>
            </View>

            {/* Price — updates based on selection */}
            <View style={s.priceBox}>
              <Text style={s.priceAmount}>
                {isViewingYearlyPreview
                  ? `\u20B9${yearlyPlanPrice}`
                  : isActive && currentPlanType === 'yearly' && selectedPlan !== 'monthly'
                    ? `\u20B9${creatorPlanPrice || yearlyPlanPrice}`
                    : isActive && selectedPlan === 'monthly'
                      ? `\u20B9${monthlyPlanPrice}`
                      : selectedPlan === 'yearly'
                        ? `\u20B9${yearlyPlanPrice}`
                        : `\u20B9${monthlyPlanPrice}`
                }
              </Text>
              <Text style={s.priceUnit}>
                {isViewingYearlyPreview || (isActive && currentPlanType === 'yearly' && selectedPlan !== 'monthly') ? 'per year' : 'per month'}
              </Text>
            </View>
          </View>

          {/* Plan Selection — ALWAYS visible */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.labelMd, color: colors.textMuted, marginBottom: spacing.sm }}>Available Plans</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {/* Monthly Plan Card */}
              <TouchableOpacity
                style={[s.planOption, (isActive && creator?.subscriptionPlanType !== 'yearly') ? s.planOptionActive : (selectedPlan === 'monthly' && !isActive) ? s.planOptionActive : undefined]}
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.8}
              >
                {isActive && creator?.subscriptionPlanType !== 'yearly' && (
                  <View style={[s.bestValueBadge, { backgroundColor: colors.success }]}><Text style={s.bestValueText}>ACTIVE</Text></View>
                )}
                <Text style={[s.planOptionTitle, (isActive && creator?.subscriptionPlanType !== 'yearly') && { color: colors.success }]}>Monthly</Text>
                <Text style={s.planOptionPrice}>₹{monthlyPlanPrice}/mo</Text>
                <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>1 Month • AutoPay</Text>
              </TouchableOpacity>
              {/* Yearly Plan Card */}
              <TouchableOpacity
                style={[s.planOption, (isActive && creator?.subscriptionPlanType === 'yearly') ? s.planOptionActive : (selectedPlan === 'yearly' && !isActive) ? s.planOptionActive : undefined, { position: 'relative' }]}
                onPress={() => setSelectedPlan('yearly')}
                activeOpacity={0.8}
              >
                {isActive && creator?.subscriptionPlanType === 'yearly' ? (
                  <View style={[s.bestValueBadge, { backgroundColor: colors.success }]}><Text style={s.bestValueText}>ACTIVE</Text></View>
                ) : (config?.subscription?.yearlyShowSaveBadge !== false) ? (
                  <View style={s.bestValueBadge}><Text style={s.bestValueText}>SAVE 2 MONTHS</Text></View>
                ) : null}
                <Text style={[s.planOptionTitle, (isActive && creator?.subscriptionPlanType === 'yearly') && { color: colors.success }]}>
                  {config?.subscription?.yearlyShowRecommended !== false ? 'Yearly ⭐' : 'Yearly'}
                </Text>
                <Text style={s.planOptionPrice}>₹{config?.subscription?.yearlyPlanPrice || (monthlyPlanPrice * 10)}/yr</Text>
                <Text style={{ fontSize: 9, color: colors.success, marginTop: 2 }}>
                  {config?.subscription?.yearlyPlanDescription || '12 months for price of 10'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Subscribe/Upgrade Button — only for non-active plans */}
          {(() => {
            const currentPlanType = creator?.subscriptionPlanType || 'monthly';
            const isCurrentPlanSelected = isActive && selectedPlan === currentPlanType;
            
            // Don't show button if the currently active plan is selected
            if (isCurrentPlanSelected) return null;

            // Show buy/upgrade button
            if (isExpired || !subStatus || subStatus === 'inactive' || subStatus === 'pending_payment') {
              return (
                <TouchableOpacity style={s.payBtn} onPress={handleSubscribe} disabled={subscribing} activeOpacity={0.85}>
                  {subscribing ? <ActivityIndicator size="small" color={colors.textInverse} /> : (
                    <Text style={s.payBtnText}>
                      {selectedPlan === 'yearly' ? `Buy Yearly Plan — ₹${config?.subscription?.yearlyPlanPrice || monthlyPlanPrice * 10}` : `Subscribe Monthly — ₹${monthlyPlanPrice}`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }
            
            // Active but selecting a different plan = upgrade
            if (isActive) {
              return (
                <TouchableOpacity style={[s.payBtn, s.payBtnOutline]} onPress={handleSubscribe} disabled={subscribing} activeOpacity={0.85}>
                  {subscribing ? <ActivityIndicator size="small" color={colors.primary} /> : (
                    <Text style={[s.payBtnText, { color: colors.primary }]}>
                      {selectedPlan === 'yearly' ? `Upgrade to Yearly — ₹${config?.subscription?.yearlyPlanPrice || monthlyPlanPrice * 10}` : `Switch to Monthly — ₹${monthlyPlanPrice}/mo`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }
            return null;
          })()}
        </View>

        {/* Features — different for Monthly vs Yearly */}
        <View style={s.featuresCard}>
          <Text style={s.featuresTitle}>{selectedPlan === 'yearly' ? 'Yearly Premium Benefits' : 'Plan Benefits'}</Text>
          <View style={s.featuresList}>
            <Feature text="Profile visible in search & listings" />
            <Feature text="Receive inquiries & bookings" />
            <Feature text="Accept payments from clients" />
            <Feature text="Portfolio & reels showcase" />
            <Feature text="Calendar & availability management" />
            <Feature text="Commission-based earnings" />
            <Feature text="Featured listing eligibility" />
            <Feature text="Priority support" />
            {selectedPlan === 'yearly' && (
              <>
                <Feature text="Unlimited booking invoices & PDF generation" />
                <Feature text="Unlimited WhatsApp invoice sharing" />
                <Feature text="Priority search ranking boost" />
                <Feature text="Premium verified badge" />
                <Feature text="12 months uninterrupted access" />
                <Feature text="No AutoPay required (one-time payment)" />
              </>
            )}
          </View>
        </View>

        {/* AutoPay Info — shows REAL Razorpay status + Enable/Disable controls */}
        {(() => {
          const ap = creator?._autopay;
          const rpActive = ap?.autopayActive === true;
          const rpStatus = ap?.razorpayStatus || 'none';
          const apMessage = ap?.message || '';
          const apDaysRemaining = ap?.daysRemaining ?? daysRemaining;

          if (rpActive) {
            return (
              <View>
                <View style={s.infoCard}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoText}>AutoPay: ON ({rpStatus})</Text>
                    <Text style={[s.infoText, { color: colors.textMuted, marginTop: 4 }]}>Your subscription renews automatically each month via Razorpay.</Text>
                  </View>
                </View>
                {/* Turn OFF AutoPay button */}
                <TouchableOpacity
                  style={[s.autoPayBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }]}
                  onPress={handleCancelAutoPay}
                  disabled={cancelling}
                  activeOpacity={0.8}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <Ionicons name="pause-circle-outline" size={16} color={colors.error} />
                      <Text style={[s.autoPayBtnText, { color: colors.error }]}>Turn Off AutoPay</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          } else if (isActive && (rpStatus === 'cancelled' || rpStatus === 'completed' || rpStatus === 'paused' || rpStatus === 'mandate_revoked' || !autoRenew || rpStatus === 'none')) {
            // AutoPay OFF but subscription still active — show "Enable AutoPay Again" button
            return (
              <View>
                <View style={[s.infoCard, { borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.04)' }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.infoText, { color: colors.warning }]}>AutoPay: OFF</Text>
                    <Text style={[s.infoText, { color: colors.textMuted, marginTop: 4 }]}>
                      {apMessage || `Your subscription remains active until ${subEndDate ? formatDate(subEndDate) : 'expiry'}. Auto-renewal has been turned off. You can enable AutoPay again anytime.`}
                    </Text>
                    <View style={s.statusRow}>
                      <Text style={s.statusLabel}>Subscription:</Text>
                      <Text style={[s.statusValue, { color: colors.success }]}>Active (until {subEndDate ? formatDate(subEndDate) : '—'})</Text>
                    </View>
                    <View style={s.statusRow}>
                      <Text style={s.statusLabel}>AutoPay:</Text>
                      <Text style={[s.statusValue, { color: colors.error }]}>OFF</Text>
                    </View>
                    <View style={s.statusRow}>
                      <Text style={s.statusLabel}>Renewal:</Text>
                      <Text style={[s.statusValue, { color: colors.error }]}>Disabled</Text>
                    </View>
                  </View>
                </View>
                {/* Enable AutoPay Again button */}
                <TouchableOpacity
                  style={[s.autoPayBtn, { borderColor: colors.borderGold, backgroundColor: colors.primaryMuted }]}
                  onPress={handleSubscribe}
                  disabled={subscribing}
                  activeOpacity={0.8}
                >
                  {subscribing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="refresh-circle-outline" size={16} color={colors.primary} />
                      <Text style={[s.autoPayBtnText, { color: colors.primary }]}>Enable AutoPay Again</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          } else if (rpStatus !== 'none' && rpStatus !== 'error' && !isActive) {
            return (
              <View style={[s.infoCard, { borderColor: 'rgba(239,68,68,0.15)', backgroundColor: 'rgba(239,68,68,0.04)' }]}>
                <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                <Text style={[s.infoText, { color: colors.error }]}>AutoPay: OFF (Subscription Expired). Subscribe again to restore your profile.</Text>
              </View>
            );
          } else if (rpStatus === 'none' && isActive) {
            return (
              <View style={[s.infoCard, { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={[s.infoText, { color: colors.textMuted }]}>AutoPay status unknown. If your subscription doesn't renew automatically, use the Pay button above.</Text>
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
  // AutoPay controls
  autoPayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  autoPayBtnText: { ...typography.labelMd, fontWeight: '600' },
  // Plan selection
  planOption: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  planOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  planOptionTitle: { ...typography.headlineSm, color: colors.text },
  planOptionPrice: { ...typography.bodySm, color: colors.textMuted, marginTop: 2 },
  bestValueBadge: { position: 'absolute', top: -8, right: -4, backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  bestValueText: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  statusLabel: { ...typography.caption, color: colors.textMuted, width: 80 },
  statusValue: { ...typography.bodySm, color: colors.text, fontWeight: '600' },
});
