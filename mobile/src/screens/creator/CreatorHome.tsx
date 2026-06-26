import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getRazorpayConfig, createCommissionOrder, verifyCommissionPayment } from '../../services/payment';
import RazorpayWebCheckout from '../../components/RazorpayWebCheckout';

export default function CreatorHome({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalEarnings: 0, monthlyEarnings: 0, totalBookings: 0, pendingPayments: 0, upcomingEventsCount: 0, newInquiries: 0, favorites: 0, reviews: 0, commissionDue: 0 });
  const [loading, setLoading] = useState(true);
  const [promo, setPromo] = useState<any>({ featured: null, rank: null, pending: 0 });
  const [paying, setPaying] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [rpConfig, setRpConfig] = useState<{ keyId: string; orderId: string; amount: number; name: string }>({ keyId: '', orderId: '', amount: 0, name: '' });

  const loadDashboard = useCallback(async () => {
    try {
      const [dashRes, featuredRes, activeRes, requestsRes] = await Promise.all([
        api.get('/creator/dashboard'),
        api.get('/promotions/my-featured').catch(() => ({ data: { active: null } })),
        api.get('/promotions/my-active').catch(() => ({ data: { active: null } })),
        api.get('/promotions/my-requests').catch(() => ({ data: { data: [] } })),
      ]);
      if (dashRes.data) setStats(dashRes.data);
      const pending = (requestsRes.data?.data || []).filter((r: any) => r.status === 'pending').length;
      setPromo({ featured: featuredRes.data?.active, rank: activeRes.data?.active, pending });
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, []);
  useFocusEffect(useCallback(() => { loadDashboard(); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadDashboard(); setRefreshing(false); };

  // ═══ PAY COMMISSION DIRECTLY FROM DASHBOARD ═══
  const handlePayNow = async () => {
    const amount = stats.commissionDue;
    if (amount <= 0) { Alert.alert('No Dues', '✅ No commission pending'); return; }

    setPaying(true);
    try {
      const config = await getRazorpayConfig();
      if (!config.configured) { Alert.alert('Unavailable', 'Payment gateway not configured.'); setPaying(false); return; }

      const order = await createCommissionOrder(amount);
      if (!order.id) { Alert.alert('Error', 'Failed to create payment order.'); setPaying(false); return; }

      const meRes = await api.get('/auth/me');
      setRpConfig({ keyId: config.keyId, orderId: order.id, amount, name: meRes.data?.user?.name || '' });
      setShowRazorpay(true);
      setPaying(false);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Payment failed');
      setPaying(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    setShowRazorpay(false);
    setPaying(true);
    try {
      const verified = await verifyCommissionPayment(paymentData.razorpay_order_id, paymentData.razorpay_payment_id, paymentData.razorpay_signature, rpConfig.amount);
      if (verified) { Alert.alert('Success! ✅', 'Commission paid successfully!'); await loadDashboard(); }
      else Alert.alert('Verification Failed', 'Contact support if charged.');
    } catch (e: any) { Alert.alert('Error', e.message || 'Verification failed'); }
    setPaying(false);
  };

  const statCards = [
    { label: 'Total Earnings', value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`, icon: 'wallet', color: colors.primary },
    { label: 'This Month', value: `₹${stats.monthlyEarnings.toLocaleString('en-IN')}`, icon: 'trending-up', color: colors.success },
    { label: 'Total Bookings', value: String(stats.totalBookings), icon: 'calendar', color: colors.info },
    { label: 'Pending Payouts', value: String(stats.pendingPayments), icon: 'time', color: colors.warning },
  ];

  const quickActions = [
    { icon: 'calendar-outline', label: 'Bookings', screen: 'CreatorBookings' },
    { icon: 'people-outline', label: 'Inquiries', screen: 'CreatorLeads' },
    { icon: 'images-outline', label: 'Portfolio', screen: 'CreatorPortfolio' },
    { icon: 'pricetag-outline', label: 'Packages', screen: 'CreatorPackages' },
    { icon: 'card-outline', label: 'Wallet', screen: 'CreatorWallet' },
    { icon: 'rocket-outline', label: 'Promotions', screen: 'CreatorPromotions' },
    { icon: 'calendar-clear-outline', label: 'Calendar', screen: 'CreatorCalendar' },
    { icon: 'settings-outline', label: 'Settings', screen: 'CreatorSettings' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.name}>{user?.name || 'Creator'}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Commission Alert */}
        {stats.commissionDue > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Commission Due: ₹{stats.commissionDue.toLocaleString('en-IN')}</Text>
              <Text style={styles.alertSubtitle}>Pay before due date to avoid suspension</Text>
            </View>
            <TouchableOpacity style={styles.alertBtn} onPress={handlePayNow} disabled={paying}>
              {paying ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.alertBtnText}>Pay Now</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Expiry Warning */}
        {(stats as any).expiryWarning && (
          <TouchableOpacity style={[styles.alertCard, { borderColor: (stats as any).expiryWarning.level === 'critical' || (stats as any).expiryWarning.level === 'expired' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)', backgroundColor: (stats as any).expiryWarning.level === 'critical' || (stats as any).expiryWarning.level === 'expired' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)' }]} activeOpacity={0.8} onPress={() => navigation.navigate('CreatorSubscription')}>
            <Ionicons name={(stats as any).expiryWarning.level === 'critical' || (stats as any).expiryWarning.level === 'expired' ? 'warning' : 'time-outline'} size={18} color={(stats as any).expiryWarning.level === 'critical' || (stats as any).expiryWarning.level === 'expired' ? colors.error : colors.warning} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: (stats as any).expiryWarning.level === 'critical' || (stats as any).expiryWarning.level === 'expired' ? colors.error : colors.warning }]}>
                {(stats as any).expiryWarning.level === 'expired' ? 'Subscription Expired' : `Expires in ${(stats as any).subscriptionDaysLeft} day${(stats as any).subscriptionDaysLeft > 1 ? 's' : ''}`}
              </Text>
              <Text style={styles.alertSubtitle}>{(stats as any).expiryWarning.message}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate(a.screen)}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ GROWTH & PROMOTION ═══ */}
        <Text style={styles.sectionTitle}>Growth & Promotion</Text>

        {/* Featured Status */}
        {promo.featured ? (
          <View style={styles.featuredCard}>
            <View style={styles.featuredBadge}><Ionicons name="star" size={14} color={colors.textInverse} /><Text style={styles.featuredBadgeText}>FEATURED</Text></View>
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle}>{promo.featured.planType?.replace('_', ' #').replace('featured', 'Featured') || 'Featured Creator'}</Text>
              <Text style={styles.featuredExpiry}>Expires: {promo.featured.expiryDate ? new Date(promo.featured.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} • {promo.featured.daysRemaining || 0} days left</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.promoCard} onPress={() => navigation.navigate('CreatorPromotions')} activeOpacity={0.85}>
            <View style={styles.promoIcon}><Ionicons name="rocket-outline" size={22} color={colors.primary} /></View>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Get Featured</Text>
              <Text style={styles.promoSubtitle}>Boost your profile visibility and get more bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Rank Status */}
        {promo.rank && (
          <View style={styles.rankCard}>
            <Text style={styles.rankEmoji}>{promo.rank.planType === 'rank_1' ? '🥇' : promo.rank.planType === 'rank_2' ? '🥈' : promo.rank.planType === 'rank_3' ? '🥉' : '🏅'}</Text>
            <View style={styles.rankInfo}>
              <Text style={styles.rankTitle}>{promo.rank.planType?.replace('_', ' #').replace('rank', 'Rank')}</Text>
              <Text style={styles.rankExpiry}>{promo.rank.daysRemaining || 0} days remaining</Text>
            </View>
            <View style={styles.rankBadge}><Text style={styles.rankBadgeText}>ACTIVE</Text></View>
          </View>
        )}

        {/* Pending Requests */}
        {promo.pending > 0 && (
          <TouchableOpacity style={styles.pendingCard} onPress={() => navigation.navigate('CreatorPromotions')} activeOpacity={0.8}>
            <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
            <Text style={styles.pendingText}>{promo.pending} promotion request{promo.pending > 1 ? 's' : ''} pending approval</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Promote Button */}
        <TouchableOpacity style={styles.promoteBtn} onPress={() => navigation.navigate('CreatorPromotions')} activeOpacity={0.85}>
          <Ionicons name="star-outline" size={16} color={colors.primary} />
          <Text style={styles.promoteBtnText}>View Promotions & Rankings</Text>
        </TouchableOpacity>

        {/* Activity Summary */}
        <Text style={styles.sectionTitle}>Activity Overview</Text>
        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{stats.newInquiries}</Text>
            <Text style={styles.activityLabel}>New Inquiries</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{stats.upcomingEventsCount}</Text>
            <Text style={styles.activityLabel}>Upcoming Events</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{stats.favorites}</Text>
            <Text style={styles.activityLabel}>Favorites</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{stats.reviews}</Text>
            <Text style={styles.activityLabel}>Reviews</Text>
          </View>
        </View>

        {/* Subscription Status */}
        <View style={styles.subCard}>
          <View style={styles.subInfo}>
            <Ionicons name="diamond" size={16} color={colors.primary} />
            <Text style={styles.subTitle}>Pro Subscription</Text>
          </View>
          <Text style={styles.subStatus}>Active</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Razorpay WebView Checkout for Commission Payment */}
      <RazorpayWebCheckout
        visible={showRazorpay}
        keyId={rpConfig.keyId}
        orderId={rpConfig.orderId}
        amount={rpConfig.amount}
        name="BookMyShot"
        description={`Commission Payment — ₹${rpConfig.amount}`}
        prefillName={rpConfig.name}
        onSuccess={handlePaymentSuccess}
        onFailure={(error) => { setShowRazorpay(false); Alert.alert('Payment Failed', error?.description || 'Payment not completed'); }}
        onClose={() => setShowRazorpay(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.lg },
  greeting: { ...typography.bodySm, color: colors.textMuted },
  name: { ...typography.displaySm, color: colors.text, marginTop: 2 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  notifDot: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.md },
  statCard: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  statValue: { ...typography.headlineLg, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  alertCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)', borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  alertContent: { flex: 1 },
  alertTitle: { ...typography.labelMd, color: colors.error },
  alertSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  alertBtn: { backgroundColor: colors.error, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.sm },
  alertBtnText: { ...typography.labelMd, color: '#fff', fontWeight: '600' },
  sectionTitle: { ...typography.headlineSm, color: colors.text, paddingHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: spacing.md },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
  actionCard: { width: '23%', alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  actionLabel: { ...typography.labelSm, color: colors.textSecondary, textAlign: 'center' },
  activityRow: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, borderWidth: 1, borderColor: colors.border },
  activityItem: { flex: 1, alignItems: 'center' },
  activityValue: { ...typography.headlineMd, color: colors.text },
  activityLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  activityDivider: { width: 1, height: 32, backgroundColor: colors.border },
  subCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.xl, marginTop: spacing.xl, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.lg, padding: spacing.lg },
  subInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subTitle: { ...typography.labelLg, color: colors.primary },
  subStatus: { ...typography.labelMd, color: colors.success, fontWeight: '600' },
  // Growth & Promotion
  featuredCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: 'rgba(212,175,55,0.06)', borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.sm },
  featuredBadgeText: { ...typography.labelSm, color: colors.textInverse, fontWeight: '800', letterSpacing: 0.5 },
  featuredInfo: { flex: 1 },
  featuredTitle: { ...typography.headlineSm, color: colors.primary },
  featuredExpiry: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  promoCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  promoIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  promoContent: { flex: 1 },
  promoTitle: { ...typography.headlineSm, color: colors.text },
  promoSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rankCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  rankEmoji: { fontSize: 28 },
  rankInfo: { flex: 1 },
  rankTitle: { ...typography.headlineSm, color: colors.text },
  rankExpiry: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rankBadge: { backgroundColor: colors.success + '15', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  rankBadgeText: { ...typography.labelSm, color: colors.success, fontWeight: '700' },
  pendingCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)', borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  pendingText: { ...typography.bodySm, color: colors.warning, flex: 1 },
  promoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginBottom: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold },
  promoteBtnText: { ...typography.labelMd, color: colors.primary, fontWeight: '600' },
});
