import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminCreators({ navigation }: any) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/creator-accounts');
      // Backend returns: { success, data: { creators: [...], total, page, limit } }
      const responseData = res.data?.data;
      const creatorsList = Array.isArray(responseData?.creators)
        ? responseData.creators
        : Array.isArray(responseData)
          ? responseData
          : Array.isArray(res.data?.creators)
            ? res.data.creators
            : [];
      setCreators(creatorsList);
    } catch (e: any) {
      console.log('[AdminCreators] Load error:', e.response?.status, e.message);
      Alert.alert('Error', 'Failed to load creators: ' + (e.response?.data?.message || e.message));
      setCreators([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const safeCreators = Array.isArray(creators) ? creators : [];
  const filtered = safeCreators.filter(c => {
    if (tab === 'all') return true;
    if (tab === 'pending') return c.status === 'pending';
    if (tab === 'approved') return c.status === 'approved';
    if (tab === 'rejected') return c.status === 'rejected';
    if (tab === 'suspended') return c.status === 'suspended' || (c.subscriptionStatus === 'suspended' && c.status !== 'rejected');
    return true;
  });

  const updateStatus = (id: string, status: string, label: string) => {
    Alert.alert(label, `${label} this creator?`, [
      { text: 'Cancel' },
      { text: label, style: status === 'rejected' || status === 'suspended' ? 'destructive' : 'default', onPress: async () => {
        try {
          let endpoint = '';
          if (status === 'approved') endpoint = `/admin/creator-accounts/${id}/activate`;
          else if (status === 'rejected') endpoint = `/admin/creator-accounts/${id}/deactivate`;
          else if (status === 'suspended') endpoint = `/admin/creator-accounts/${id}/suspend`;
          else endpoint = `/admin/creator-accounts/${id}/activate`;
          
          await api.patch(endpoint, { reason: `${label} by admin` });
          await load();
          Alert.alert('Success', `Creator ${label.toLowerCase()}d successfully`);
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.message || 'Failed to update creator');
        }
      }}
    ]);
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    try {
      await api.patch(`/admin/creators/${id}/featured`, { featured });
      await load();
      Alert.alert('Done', featured ? 'Creator is now featured' : 'Creator unfeatured');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update featured status');
    }
  };

  const deleteCreator = (id: string, name: string) => {
    Alert.alert(
      '⚠️ Permanent Delete',
      `Are you sure you want to PERMANENTLY delete "${name}"?\n\nThis will remove:\n• Creator profile & portfolio\n• All bookings & inquiries\n• Reviews & payment records\n• User account\n\nThis action CANNOT be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'DELETE PERMANENTLY', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/admin/creators/${id}`);
            await load();
            Alert.alert('Deleted', 'Creator and all associated data permanently removed.');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete creator');
          }
        }}
      ]
    );
  };

  const setRank = (id: string, currentRank: number) => {
    Alert.alert('Set Rank', 'Choose ranking position for Best Reviewed section:', [
      { text: '#1', onPress: () => applyRank(id, 1) },
      { text: '#2', onPress: () => applyRank(id, 2) },
      { text: '#3', onPress: () => applyRank(id, 3) },
      { text: '#4', onPress: () => applyRank(id, 4) },
      { text: currentRank ? 'Remove Rank' : 'Cancel', style: 'cancel', onPress: () => { if (currentRank) applyRank(id, 0); } },
    ]);
  };

  const applyRank = async (id: string, rank: number) => {
    try {
      await api.patch(`/admin/creator-accounts/${id}/rank`, { rank });
      const badge = rank > 0 ? `rank_${rank}` : '';
      await api.patch(`/admin/creator-accounts/${id}/badge`, { badge });
      await load();
      Alert.alert('Done', rank > 0 ? `Creator set as #${rank} in Best Reviewed` : 'Rank removed');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to set rank');
    }
  };

  const getStatusColor = (s: string) => s === 'approved' ? colors.success : s === 'pending' ? colors.warning : colors.error;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Creators</Text>
        <Text style={s.count}>{safeCreators.length}</Text>
      </View>

      <View style={s.tabs}>
        {['all', 'pending', 'approved', 'rejected', 'suspended'].map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'suspended' ? 'Susp.' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
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
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No creators in this tab</Text></View>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Image source={{ uri: item.user?.avatar || 'https://via.placeholder.com/40' }} style={s.avatar} />
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.user?.name || 'Creator'}</Text>
                  <Text style={s.cardMeta}>{item.specialty || 'Photographer'} • {item.city || 'India'}</Text>
                  <Text style={s.cardEmail}>{item.user?.email}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[s.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.cardMeta2}>
                <Text style={s.metaItem}>Sub: {item.subscriptionStatus || 'none'}</Text>
                <Text style={s.metaItem}>ID: {item.creatorId || '—'}</Text>
                {item.subscriptionEndDate && <Text style={s.metaItem}>Exp: {new Date(item.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>}
              </View>
              <View style={s.actions}>
                {item.status === 'pending' && <>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => updateStatus(item._id, 'rejected', 'Reject')}><Text style={s.rejectText}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(item._id, 'approved', 'Approve')}><Text style={s.approveText}>Approve</Text></TouchableOpacity>
                </>}
                {item.status === 'approved' && item.subscriptionStatus !== 'suspended' && <>
                  <TouchableOpacity style={s.suspendBtn} onPress={() => updateStatus(item._id, 'suspended', 'Suspend')}><Text style={s.suspendText}>Suspend</Text></TouchableOpacity>
                  <TouchableOpacity style={s.rankBtn} onPress={() => setRank(item._id, item.rank)}><Text style={s.rankBtnText}>{item.rank ? `#${item.rank}` : 'Rank'}</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.rankBtn, item.featured && { backgroundColor: 'rgba(249,115,22,0.2)' }]} onPress={() => toggleFeatured(item._id, !item.featured)}><Text style={s.rankBtnText}>{item.featured ? '★' : 'Feature'}</Text></TouchableOpacity>
                </>}
                {(item.status === 'suspended' || item.subscriptionStatus === 'suspended') && <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(item._id, 'approved', 'Unsuspend')}><Text style={s.approveText}>Unsuspend</Text></TouchableOpacity>}
                {item.status === 'rejected' && <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(item._id, 'approved', 'Reactivate')}><Text style={s.approveText}>Reactivate</Text></TouchableOpacity>}
                <TouchableOpacity style={s.deleteBtn} onPress={() => deleteCreator(item._id, item.user?.name || 'Creator')}><Ionicons name="trash-outline" size={14} color={colors.error} /><Text style={s.deleteText}>Delete</Text></TouchableOpacity>
              </View>
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
  count: { ...typography.labelMd, color: colors.primary, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  cardEmail: { ...typography.caption, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  cardMeta2: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  metaItem: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  rejectBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  approveBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.primary },
  approveText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  suspendBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  suspendText: { ...typography.labelMd, color: colors.warning },
  rankBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center', borderRadius: radius.sm, backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  rankBtnText: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  deleteText: { ...typography.labelSm, color: colors.error, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted },
});
