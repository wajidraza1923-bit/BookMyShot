import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminBookings({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.get('/admin/creator-accounts'); /* Use bookings endpoint if available */
      // Try the general bookings list
      const bRes = await api.get('/bookings/creator').catch(() => api.get('/admin/creator-accounts'));
      setBookings(bRes.data?.bookings || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getColor = (s: string) => s?.includes('Complete') ? colors.success : s?.includes('reject') || s?.includes('cancel') ? colors.error : s === 'Booking Created' ? colors.warning : colors.info;

  return (
    <View style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>All Bookings</Text></View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={bookings} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No bookings found</Text></View>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.row}><Text style={s.name}>{item.clientName || 'Client'}</Text><View style={[s.badge, { backgroundColor: getColor(item.status) + '15' }]}><Text style={[s.badgeText, { color: getColor(item.status) }]}>{item.status}</Text></View></View>
              <Text style={s.meta}>{item.eventType} • {item.eventDate ? new Date(item.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'} • ₹{(item.amount || 0).toLocaleString('en-IN')}</Text>
              <Text style={s.meta}>Payment: {item.paymentStatus || 'unpaid'}</Text>
            </View>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  name: { ...typography.headlineSm, color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', fontSize: 9 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted },
});
