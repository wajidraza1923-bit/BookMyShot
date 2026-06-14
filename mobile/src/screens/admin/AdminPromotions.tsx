import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const PLAN_NAMES: Record<string, string> = { homepage_featured: 'Homepage Featured', featured_1: 'Featured #1', featured_2: 'Featured #2', featured_3: 'Featured #3', featured_4: 'Featured #4', rank_1: 'Rank #1', rank_2: 'Rank #2', rank_3: 'Rank #3', rank_4: 'Rank #4' };

export default function AdminPromotions({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/promotions/admin/all');
      setRequests(res.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const approve = (id: string) => Alert.alert('Approve', 'Activate this promotion for 30 days?', [
    { text: 'Cancel' },
    { text: 'Approve', onPress: async () => {
      try { await api.patch(`/promotions/admin/${id}/approve`); await load(); Alert.alert('Done', 'Promotion approved and activated'); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const reject = (id: string) => Alert.alert('Reject', 'Reject this promotion request?', [
    { text: 'Cancel' },
    { text: 'Reject', style: 'destructive', onPress: async () => {
      try { await api.patch(`/promotions/admin/${id}/reject`, { reason: 'Rejected by admin' }); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const expire = (id: string) => Alert.alert('Expire', 'Force expire this promotion?', [
    { text: 'Cancel' },
    { text: 'Expire', style: 'destructive', onPress: async () => {
      try { await api.patch(`/promotions/admin/${id}/expire`); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const getStatusColor = (s: string) => s === 'approved' ? colors.success : s === 'rejected' ? colors.error : s === 'expired' ? colors.textMuted : colors.warning;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Promotion Requests</Text>
        <Text style={s.count}>{requests.filter(r => r.status === 'pending').length} pending</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={requests}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="star-outline" size={40} color={colors.textMuted} /><Text style={s.emptyText}>No promotion requests</Text></View>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.creator?.user?.name || item.creatorName || 'Creator'}</Text>
                  <Text style={s.cardPlan}>{PLAN_NAMES[item.planType] || item.planType}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[s.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>

              <View style={s.cardDetails}>
                <Text style={s.detailText}>₹{(item.price || 0).toLocaleString('en-IN')}</Text>
                {item.utr && <Text style={s.detailText}>UTR: {item.utr}</Text>}
                <Text style={s.detailText}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</Text>
                {item.expiryDate && <Text style={s.detailText}>Expires: {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>}
              </View>

              {/* Actions */}
              {item.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => reject(item._id)}><Ionicons name="close" size={14} color={colors.error} /><Text style={s.rejectText}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity style={s.approveBtn} onPress={() => approve(item._id)}><Ionicons name="checkmark" size={14} color={colors.textInverse} /><Text style={s.approveText}>Approve</Text></TouchableOpacity>
                </View>
              )}
              {item.status === 'approved' && (
                <TouchableOpacity style={s.expireBtn} onPress={() => expire(item._id)}><Text style={s.expireText}>Force Expire</Text></TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  count: { ...typography.labelSm, color: colors.warning, backgroundColor: colors.warning + '15', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardInfo: { flex: 1 },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardPlan: { ...typography.labelMd, color: colors.primary, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailText: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.primary },
  approveText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  expireBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  expireText: { ...typography.labelMd, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
