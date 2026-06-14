import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
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
      setData(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const stats = data?.stats || {};

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers || 0, icon: 'people', color: colors.info },
    { label: 'Total Creators', value: stats.totalCreators || 0, icon: 'camera', color: colors.primary },
    { label: 'Total Bookings', value: stats.totalBookings || 0, icon: 'calendar', color: colors.success },
    { label: 'Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: 'wallet', color: colors.primary },
    { label: 'Subscriptions', value: stats.activeSubscriptions || 0, icon: 'diamond', color: colors.warning },
    { label: 'Pending', value: stats.pendingApprovals || 0, icon: 'hourglass', color: colors.error },
  ];

  const menuItems = [
    { icon: 'people-outline', label: 'Creator Management', desc: 'Approve, reject, manage creators' },
    { icon: 'person-outline', label: 'User Management', desc: 'View and manage users' },
    { icon: 'calendar-outline', label: 'Booking Management', desc: 'All bookings, payments, events' },
    { icon: 'chatbubble-outline', label: 'Inquiries', desc: 'Homepage & contact inquiries' },
    { icon: 'diamond-outline', label: 'Subscriptions', desc: 'Plans, renewals, billing' },
    { icon: 'cash-outline', label: 'Earnings & Commission', desc: 'Revenue reports, commissions' },
    { icon: 'star-outline', label: 'Promotions', desc: 'Featured creators, boosts' },
    { icon: 'notifications-outline', label: 'Notifications', desc: 'Send notifications, alerts' },
    { icon: 'settings-outline', label: 'Platform Settings', desc: 'Commission %, pricing, config' },
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
          <TouchableOpacity style={s.logoutBtn} onPress={logout}><Ionicons name="log-out-outline" size={18} color={colors.error} /></TouchableOpacity>
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
          <TouchableOpacity key={i} style={s.menuItem} activeOpacity={0.7}>
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
