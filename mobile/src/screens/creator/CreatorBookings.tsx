import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorBookings({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/bookings/creator');
      setBookings(res.data?.bookings || res.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = bookings.filter(b => {
    if (tab === 'all') return true;
    if (tab === 'pending') return b.status === 'Booking Created';
    if (tab === 'active') return ['Creator Accepted', 'Payment Submitted', 'Payment Approved', 'Event Scheduled'].includes(b.status);
    if (tab === 'done') return b.status === 'Completed';
    return false;
  });

  const updateBooking = async (id: string, status: string) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      await load(); // Refresh list
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update');
    }
  };

  const getColor = (s: string) => {
    if (s === 'Completed') return colors.success;
    if (s === 'Booking Created') return colors.warning;
    if (s?.includes('Accepted') || s?.includes('Scheduled')) return colors.info;
    return colors.textMuted;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.count}>{bookings.length}</Text>
      </View>

      <View style={styles.tabs}>
        {['all', 'pending', 'active', 'done'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No bookings</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.clientName || 'Client'}</Text>
                  <Text style={styles.cardMeta}>{item.eventType || 'Event'} • {item.eventDate ? new Date(item.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getColor(item.status) + '15', borderColor: getColor(item.status) + '30' }]}>
                  <Text style={[styles.badgeText, { color: getColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardAmount}>₹{(item.amount || 0).toLocaleString('en-IN')}</Text>
                {item.eventLocation && <Text style={styles.cardLocation}><Ionicons name="location-outline" size={11} color={colors.textMuted} /> {item.eventLocation}</Text>}
              </View>
              {item.status === 'Booking Created' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => updateBooking(item._id, 'rejected')}><Text style={styles.rejectText}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => updateBooking(item._id, 'Creator Accepted')}><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  count: { ...typography.labelMd, color: colors.primary, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  badgeText: { ...typography.labelSm, fontWeight: '600', fontSize: 9 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  cardAmount: { ...typography.headlineSm, color: colors.primary },
  cardLocation: { ...typography.caption, color: colors.textMuted },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rejectBtn: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  acceptBtn: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.primary },
  acceptText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
