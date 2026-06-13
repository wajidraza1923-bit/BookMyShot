import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function CreatorHome({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalEarnings: 0, monthlyEarnings: 0, totalBookings: 0, pendingPayments: 0, upcomingEventsCount: 0, newInquiries: 0, favorites: 0, reviews: 0, commissionDue: 0 });
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/creator/dashboard');
      if (res.data) setStats(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadDashboard(); setRefreshing(false); };

  const statCards = [
    { label: 'Total Earnings', value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`, icon: 'wallet', color: colors.primary },
    { label: 'This Month', value: `₹${stats.monthlyEarnings.toLocaleString('en-IN')}`, icon: 'trending-up', color: colors.success },
    { label: 'Total Bookings', value: String(stats.totalBookings), icon: 'calendar', color: colors.info },
    { label: 'Pending Payouts', value: String(stats.pendingPayments), icon: 'time', color: colors.warning },
  ];

  const quickActions = [
    { icon: 'calendar-outline', label: 'Bookings', screen: 'CreatorBookings' },
    { icon: 'people-outline', label: 'Leads', screen: 'CreatorLeads' },
    { icon: 'images-outline', label: 'Portfolio', screen: 'CreatorPortfolio' },
    { icon: 'pricetag-outline', label: 'Packages', screen: 'CreatorPackages' },
    { icon: 'card-outline', label: 'Wallet', screen: 'CreatorWallet' },
    { icon: 'star-outline', label: 'Reviews', screen: 'CreatorReviews' },
    { icon: 'calendar-clear-outline', label: 'Availability', screen: 'CreatorAvailability' },
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
            <TouchableOpacity style={styles.alertBtn}><Text style={styles.alertBtnText}>Pay</Text></TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} activeOpacity={0.7}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
});
