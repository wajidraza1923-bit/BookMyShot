import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const SECTIONS = [
  { key: 'all_creators', label: 'All' },
  { key: 'best_reviewed', label: 'Best Reviewed' },
  { key: 'featured', label: 'Featured' },
  { key: 'top_creators', label: 'Top' },
  { key: 'trending', label: 'Trending' },
];

export default function AdminRankings({ navigation }: any) {
  const [rankings, setRankings] = useState<any>({});
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all_creators');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerCreator, setPickerCreator] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [rankRes, creatorsRes] = await Promise.all([
        api.get('/admin/rankings'),
        api.get('/admin/creator-accounts'),
      ]);
      setRankings(rankRes.data?.data || {});
      const rd = creatorsRes.data?.data;
      const all = Array.isArray(rd?.creators) ? rd.creators : Array.isArray(creatorsRes.data?.creators) ? creatorsRes.data.creators : [];
      setCreators(all.filter((c: any) => c.status === 'approved'));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const assign = async (creatorId: string, pos: number) => {
    try {
      await api.put(`/admin/rankings/${tab}/${pos}`, { creatorId });
      setAdding(false); setPickerCreator(null); setSearch('');
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const remove = (pos: number) => {
    Alert.alert('Remove', `Remove #${pos}?`, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { try { await api.delete(`/admin/rankings/${tab}/${pos}`); await load(); } catch {} } }]);
  };

  const list = rankings[tab] || [];
  const filtered = creators.filter(c => { if (!search) return true; const s = search.toLowerCase(); return (c.user?.name||'').toLowerCase().includes(s) || (c.creatorId||'').toLowerCase().includes(s); });

  if (loading) return <View style={s.root}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.root}>
      {/* Compact Header */}
      <View style={s.head}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.headTitle}>Rankings</Text>
        <TouchableOpacity onPress={() => { setAdding(!adding); setPickerCreator(null); }} style={s.addIcon}><Ionicons name={adding ? "close" : "add"} size={18} color="#000" /></TouchableOpacity>
      </View>

      {/* Compact Chip Tabs */}
      <View style={s.chips}>
        {SECTIONS.map(sec => (
          <TouchableOpacity key={sec.key} style={[s.chip, tab === sec.key && s.chipActive]} onPress={() => { setTab(sec.key); setAdding(false); }}>
            <Text style={[s.chipText, tab === sec.key && s.chipTextActive]}>{sec.label}</Text>
            <Text style={[s.chipCount, tab === sec.key && { color: colors.primary }]}>{(rankings[sec.key] || []).length}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>

        {/* Add Panel */}
        {adding && (
          <View style={s.addPanel}>
            {pickerCreator ? (
              <View>
                <View style={s.pickerHead}>
                  <Image source={{ uri: pickerCreator.user?.avatar || 'https://via.placeholder.com/24' }} style={s.tinyAv} />
                  <Text style={s.pickerName}>{pickerCreator.user?.name}</Text>
                  <TouchableOpacity onPress={() => setPickerCreator(null)}><Ionicons name="close" size={16} color={colors.textMuted} /></TouchableOpacity>
                </View>
                <View style={s.posRow}>
                  {[1,2,3,4,5,6,7,8].map(p => {
                    const taken = list.find((r: any) => r.position === p && r.source === 'promotion');
                    return <TouchableOpacity key={p} style={[s.posChip, taken && s.posDisabled]} disabled={!!taken} onPress={() => assign(pickerCreator._id, p)}><Text style={[s.posText, taken && { color: colors.textMuted }]}>#{p}</Text></TouchableOpacity>;
                  })}
                </View>
              </View>
            ) : (
              <View>
                <TextInput style={s.searchBox} placeholder="Search creator..." placeholderTextColor="rgba(255,255,255,0.2)" value={search} onChangeText={setSearch} />
                {filtered.slice(0, 6).map(c => (
                  <TouchableOpacity key={c._id} style={s.searchItem} onPress={() => setPickerCreator(c)}>
                    <Image source={{ uri: c.user?.avatar || 'https://via.placeholder.com/20' }} style={s.tinyAv} />
                    <Text style={s.searchName} numberOfLines={1}>{c.user?.name || 'Creator'}</Text>
                    <Text style={s.searchRating}>★{c.rating || '5.0'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Leaderboard — Compact rows */}
        {list.length > 0 ? list.map((r: any) => {
          const pos = r.position;
          const bg = pos === 1 ? '#FFD70015' : pos === 2 ? '#C0C0C015' : pos === 3 ? '#CD7F3215' : 'transparent';
          const numColor = pos === 1 ? '#FFD700' : pos === 2 ? '#C0C0C0' : pos === 3 ? '#CD7F32' : colors.primary;
          const srcColor = r.source === 'promotion' ? '#10B981' : r.source === 'admin_manual' ? '#F97316' : '#6B7280';
          const srcLabel = r.source === 'promotion' ? 'Promo' : r.source === 'admin_manual' ? 'Manual' : 'Auto';
          return (
            <View key={r._id || pos} style={[s.row, { backgroundColor: bg }]}>  
              <Text style={[s.rowNum, { color: numColor }]}>#{pos}</Text>
              <Image source={{ uri: r.creator?.avatar || 'https://via.placeholder.com/28' }} style={s.rowAv} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowName} numberOfLines={1}>{r.creator?.name || '—'}</Text>
                <Text style={s.rowMeta}>{r.creator?.city || ''}{r.creator?.rating ? ` • ★${r.creator.rating}` : ''}</Text>
              </View>
              <View style={[s.srcBadge, { backgroundColor: srcColor + '18' }]}><Text style={[s.srcText, { color: srcColor }]}>{srcLabel}</Text></View>
              {r.source !== 'promotion' && <TouchableOpacity onPress={() => remove(pos)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name="close" size={14} color="rgba(239,68,68,0.6)" /></TouchableOpacity>}
            </View>
          );
        }) : (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Automatic Ranking Active</Text>
            <Text style={s.emptyDesc}>Sorted by rating & bookings. Tap + to override.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8, gap: 12 },
  headTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
  addIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  // Chips
  chips: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  chipCount: { fontSize: 9, color: colors.textMuted, fontWeight: '700' },
  // Add Panel
  addPanel: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.primary + '30' },
  searchBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, color: colors.text, fontSize: 12, marginBottom: 8 },
  searchItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  searchName: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '500' },
  searchRating: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  tinyAv: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  pickerHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  pickerName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  posChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary + '30' },
  posDisabled: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: colors.border },
  posText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  // Leaderboard rows
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.025)' },
  rowNum: { fontSize: 13, fontWeight: '800', width: 26 },
  rowAv: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  rowName: { fontSize: 12, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 9, color: colors.textMuted },
  srcBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  srcText: { fontSize: 8, fontWeight: '700' },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  emptyDesc: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
});
