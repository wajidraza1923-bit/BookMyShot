import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminOverdue({ navigation }: any) {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/overdue');
      setData(res.data?.data || []);
      setSummary(res.data?.summary || {});
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = data.filter(r => {
    if (filter === 'suspended') return r.accountStatus === 'suspended';
    if (filter === '30') return r.daysOverdue >= 30;
    if (filter === '60') return r.daysOverdue >= 60;
    if (filter === '90') return r.daysOverdue >= 90;
    return true;
  });

  const sendReminder = async (id: string) => {
    try { await api.post(`/admin/overdue/${id}/remind`); Alert.alert('Done', 'Reminder sent'); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };
  const suspend = async (id: string) => {
    Alert.alert('Suspend', 'Suspend for non-payment?', [{ text: 'Cancel' }, { text: 'Suspend', style: 'destructive', onPress: async () => { try { await api.post(`/admin/overdue/${id}/suspend`); await load(); } catch {} } }]);
  };
  const reactivate = async (id: string) => {
    Alert.alert('Reactivate', 'Reactivate this creator?', [{ text: 'Cancel' }, { text: 'Yes', onPress: async () => { try { await api.post(`/admin/overdue/${id}/reactivate`); await load(); } catch {} } }]);
  };

  const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN');

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Overdue</Text>
        <Text style={s.count}>{data.length}</Text>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderLeftColor: colors.error }]}><Text style={s.summaryVal}>{fmt(summary?.totalPendingAmount || 0)}</Text><Text style={s.summaryLabel}>Total Pending</Text></View>
        <View style={s.summaryCard}><Text style={s.summaryVal}>{summary?.suspendedCreators || 0}</Text><Text style={s.summaryLabel}>Suspended</Text></View>
        <View style={s.summaryCard}><Text style={s.summaryVal}>{summary?.overdue30 || 0}</Text><Text style={s.summaryLabel}>30+ Days</Text></View>
      </View>

      {/* Filters */}
      <View style={s.filters}>
        {[['all','All'],['suspended','Suspended'],['30','30+d'],['60','60+d'],['90','90+d']].map(([k,l]) => (
          <TouchableOpacity key={k} style={[s.filterBtn, filter===k && s.filterActive]} onPress={() => setFilter(k)}><Text style={[s.filterText, filter===k && s.filterTextActive]}>{l}</Text></TouchableOpacity>
        ))}
      </View>

      <FlatList data={filtered} keyExtractor={i => i._id} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="checkmark-circle" size={40} color={colors.success} /><Text style={s.emptyText}>No overdue creators 🎉</Text></View>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.cardMeta}>{item.creatorId} • {item.email}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: item.accountStatus === 'suspended' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                <Text style={[s.statusText, { color: item.accountStatus === 'suspended' ? colors.error : '#f59e0b' }]}>{item.accountStatus}</Text>
              </View>
            </View>
            <View style={s.amountRow}>
              {item.subscriptionDue > 0 && <View style={s.amountItem}><Text style={s.amountLabel}>Sub Due</Text><Text style={[s.amountVal, { color: colors.error }]}>{fmt(item.subscriptionDue)}</Text></View>}
              {item.commissionDue > 0 && <View style={s.amountItem}><Text style={s.amountLabel}>Comm Due</Text><Text style={[s.amountVal, { color: '#f59e0b' }]}>{fmt(item.commissionDue)}</Text></View>}
              <View style={s.amountItem}><Text style={s.amountLabel}>Total</Text><Text style={[s.amountVal, { color: colors.primary }]}>{fmt(item.totalDue)}</Text></View>
              <View style={s.amountItem}><Text style={s.amountLabel}>Overdue</Text><Text style={[s.amountVal, { color: item.daysOverdue >= 30 ? colors.error : '#f59e0b' }]}>{item.daysOverdue}d</Text></View>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => sendReminder(item._id)}><Ionicons name="mail-outline" size={14} color={colors.primary} /><Text style={s.actionText}>Remind</Text></TouchableOpacity>
              {item.accountStatus !== 'suspended' ? (
                <TouchableOpacity style={[s.actionBtn, { borderColor: 'rgba(239,68,68,0.2)' }]} onPress={() => suspend(item._id)}><Ionicons name="ban-outline" size={14} color={colors.error} /><Text style={[s.actionText, { color: colors.error }]}>Suspend</Text></TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s.actionBtn, { borderColor: 'rgba(16,185,129,0.2)' }]} onPress={() => reactivate(item._id)}><Ionicons name="checkmark-circle-outline" size={14} color={colors.success} /><Text style={[s.actionText, { color: colors.success }]}>Reactivate</Text></TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  count: { ...typography.labelMd, color: colors.error, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.border },
  summaryVal: { ...typography.headlineSm, color: colors.text },
  summaryLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  filters: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.xs, marginBottom: spacing.sm },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  filterText: { ...typography.labelSm, color: colors.textMuted },
  filterTextActive: { color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  amountRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  amountItem: { alignItems: 'center' },
  amountLabel: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  amountVal: { ...typography.labelMd, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', backgroundColor: 'rgba(249,115,22,0.04)' },
  actionText: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMd, color: colors.textMuted },
});
