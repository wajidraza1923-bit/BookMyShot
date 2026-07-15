import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminDashboard({ navigation }: any) {
  const { user, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard-overview');
      setData(res.data?.data || res.data);
    } catch (e: any) {
      console.log('[AdminDash] Error:', e.response?.status, e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const stats = data || {};

  const statCards = [
    { label: 'Total Creators', value: stats.totalCreators || 0, icon: 'camera', color: colors.primary },
    { label: 'Active', value: stats.activeCreators || 0, icon: 'checkmark-circle', color: colors.success },
    { label: 'Pending', value: stats.pendingApprovals || 0, icon: 'hourglass', color: colors.warning },
    { label: 'Suspended', value: stats.suspendedCreators || 0, icon: 'ban', color: colors.error },
    { label: 'Featured', value: stats.featuredCreators || 0, icon: 'star', color: '#F59E0B' },
    { label: 'Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: 'wallet', color: colors.primary },
  ];

  const menuItems = [
    { icon: 'people-outline', label: 'Creator Management', desc: 'Approve, reject, manage creators', screen: 'AdminCreators' },
    { icon: 'person-outline', label: 'User Management', desc: 'View and manage normal users', screen: 'AdminUsers' },
    { icon: 'calendar-outline', label: 'Booking Management', desc: 'All bookings, payments, events', screen: 'AdminBookings' },
    { icon: 'chatbubble-outline', label: 'Inquiries', desc: 'Homepage & contact inquiries', screen: 'AdminInquiries' },
    { icon: 'diamond-outline', label: 'Subscriptions', desc: 'Plans, renewals, billing', screen: 'AdminSubscriptions' },
    { icon: 'cash-outline', label: 'Earnings & Commission', desc: 'Revenue reports, commissions', screen: 'AdminEarnings' },
    { icon: 'star-outline', label: 'Promotions', desc: 'Featured creators, boosts', screen: 'AdminPromotions' },
    { icon: 'notifications-outline', label: 'Notifications', desc: 'Send notifications, alerts', screen: 'AdminNotifications' },
    { icon: 'settings-outline', label: 'Platform Settings', desc: 'Commission %, pricing, config', screen: 'AdminSettings' },
    { icon: 'flask-outline', label: 'QA Testing', desc: 'Run API tests, verify features', screen: 'QADashboard' },
    { icon: 'create-outline', label: 'Content Management', desc: 'Categories, districts, galleries, testimonials', screen: 'ContentManager' },
    { icon: 'star-outline', label: 'Reviews Management', desc: 'Creator reviews, app reviews, moderation', screen: 'AdminReviews' },
    { icon: 'share-social-outline', label: 'Social Links', desc: 'Manage social media links (syncs to website + app)', screen: 'AdminSocialLinks' },
    { icon: 'server-outline', label: 'Backups', desc: 'Database backup management', screen: 'AdminBackups' },
    { icon: 'document-text-outline', label: 'Creator Reports', desc: 'Send performance reports to creators', screen: 'AdminReportMgmt' },
    { icon: 'warning-outline', label: 'Overdue Management', desc: 'Track pending payments, defaulters', screen: 'AdminOverdue' },
    { icon: 'trophy-outline', label: 'Creator Rankings', desc: 'Manage positions in all sections', screen: 'AdminRankings' },
    { icon: 'phone-portrait-outline', label: 'App Updates', desc: 'Manage versions, force update, APK', screen: 'AdminAppUpdates' },
    { icon: 'grid-outline', label: 'Categories', desc: 'Manage categories & subcategories', screen: 'ContentManager' },
    { icon: 'gift-outline', label: 'Cashback Management', desc: 'Cashback %, limits, offers, reports', screen: 'AdminCashback' },
  ];

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Admin Panel</Text>
            <Text style={s.name}>{user?.name || 'Super Admin'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('AdminNotifications')}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.logoutBtn} onPress={logout}><Ionicons name="log-out-outline" size={18} color={colors.error} /></TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          {statCards.map((st, i) => (
            <View key={i} style={s.statCard}>
              <Ionicons name={st.icon as any} size={18} color={st.color} />
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <Text style={s.sectionTitle}>Management</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={s.menuItem} activeOpacity={0.7} onPress={() => {
            if (item.screen) navigation.navigate(item.screen);
            else Alert.alert(item.label, 'This section is coming soon.');
          }}>
            <View style={s.menuIcon}><Ionicons name={item.icon as any} size={20} color={colors.primary} /></View>
            <View style={s.menuContent}>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.lg },
  greeting: { ...typography.bodySm, color: colors.textMuted },
  name: { ...typography.displaySm, color: colors.text, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
  statCard: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', flexGrow: 1 },
  statValue: { ...typography.headlineMd, color: colors.text, marginTop: spacing.sm },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { ...typography.headlineSm, color: colors.text, paddingHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  menuContent: { flex: 1 },
  menuLabel: { ...typography.headlineSm, color: colors.text },
  menuDesc: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
