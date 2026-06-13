import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI } from '../services/api';

const tabs = ['Upcoming', 'Completed', 'Cancelled'];

export default function BookingsScreen({ navigation }: any) {
  const { isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const res = role === 'creator'
        ? await bookingsAPI.getCreatorBookings()
        : await bookingsAPI.getUserBookings();
      const data = res.data?.bookings || res.data?.data || [];
      setBookings(data);
    } catch {
      setBookings([]);
    } finally { setLoading(false); }
  }, [isAuthenticated, role]);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  const onRefresh = async () => { setRefreshing(true); await loadBookings(); setRefreshing(false); };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('accept') || s.includes('confirm') || s.includes('scheduled')) return colors.success;
    if (s.includes('complete')) return colors.primary;
    if (s.includes('cancel') || s.includes('reject')) return colors.error;
    if (s.includes('pending') || s.includes('created')) return colors.warning;
    return colors.textMuted;
  };

  const filterBookings = () => {
    return bookings.filter(b => {
      const s = (b.status || '').toLowerCase();
      if (activeTab === 'Upcoming') return !s.includes('complete') && !s.includes('cancel') && !s.includes('reject');
      if (activeTab === 'Completed') return s.includes('complete');
      return s.includes('cancel') || s.includes('reject');
    });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.title}>My Bookings</Text></View>
        <View style={styles.emptyAuth}>
          <View style={styles.emptyIcon}><Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} /></View>
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptySubtitle}>Log in to view your bookings</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}><Text style={styles.signInText}>Sign In</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const filtered = filterBookings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <View style={styles.countBadge}><Text style={styles.countText}>{bookings.length}</Text></View>
      </View>

      <View style={styles.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['4xl'] }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}>
          {filtered.length > 0 ? filtered.map(booking => (
            <View key={booking._id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Image source={{ uri: booking.user?.avatar || booking.creator?.user?.avatar || 'https://via.placeholder.com/50' }} style={styles.bookingAvatar} />
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingCreator} numberOfLines={1}>{booking.clientName || booking.creator?.user?.name || 'Client'}</Text>
                  <Text style={styles.bookingEvent}>{booking.eventType || 'Booking'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '15', borderColor: getStatusColor(booking.status) + '30' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{booking.status}</Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.detailText}>{booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
                </View>
                {booking.eventLocation && (
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.detailText}>{booking.eventLocation}</Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.primary }]}>₹{(booking.amount || booking.budget || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          )) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} bookings</Text>
              <Text style={styles.emptySubtitle}>Your bookings will appear here</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.lg },
  title: { ...typography.displaySm, color: colors.text },
  countBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderGold },
  countText: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelMd, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  list: { padding: spacing.xl, paddingBottom: 100 },
  bookingCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  bookingAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  bookingInfo: { flex: 1, marginLeft: spacing.md },
  bookingCreator: { ...typography.headlineSm, color: colors.text },
  bookingEvent: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1 },
  statusText: { ...typography.labelSm, fontWeight: '600' },
  bookingDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { ...typography.bodySm, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: spacing['6xl'] },
  emptyAuth: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  emptyTitle: { ...typography.headlineMd, color: colors.text },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  signInBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, paddingHorizontal: spacing['3xl'], paddingVertical: spacing.md, borderRadius: radius.md },
  signInText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
});
