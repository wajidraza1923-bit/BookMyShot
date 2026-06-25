import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminRankings({ navigation }: any) {
  const [featured, setFeatured] = useState<any[]>([]);
  const [overall, setOverall] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'featured' | 'overall'>('featured');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const [featRes, overRes] = await Promise.all([
        api.get('/admin/ranking-management/featured'),
        api.get('/admin/ranking-management/overall?limit=100'),
      ]);
      setFeatured(featRes.data?.data || []);
      setOverall(overRes.data?.data || []);
      setCreators(overRes.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const setFeaturedRank = async (creatorId: string, rank: number) => {
    try {
      await api.put(`/admin/ranking-management/featured/${creatorId}/${rank}`);
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const removeFeatured = async (creatorId: string) => {
    try {
      await api.delete(`/admin/ranking-management/featured/${creatorId}`);
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const moveCreator = async (creatorId: string, direction: 'up' | 'down') => {
    try {
      await api.put(`/admin/ranking-management/overall/${creatorId}/move`, { direction });
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const filtered = creators.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.user?.name || '').toLowerCase().includes(s) || (c.creatorId || '').toLowerCase().includes(s) || (c.city || '').toLowerCase().includes(s);
  });

  if (loading) return <View style={s.root}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.head}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.headTitle}>Ranking Management</Text>
      </View>

      {/* Tab Chips */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tabChip, tab === 'featured' && s.tabActive]} onPress={() => setTab('featured')}>
          <Text style={[s.tabText, tab === 'featured' && s.tabTextActive]}>Featured ({featured.length}/4)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabChip, tab === 'overall' && s.tabActive]} onPress={() => setTab('overall')}>
          <Text style={[s.tabText, tab === 'overall' && s.tabTextActive]}>Overall ({overall.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100 }}>

        {/* ═══ FEATURED TAB ═══ */}
        {tab === 'featured' && (
          <>
            <Text style={s.subHead}>Top 4 Featured Creators (manually selected)</Text>
            {/* Current Featured */}
            {[1,2,3,4].map(rank => {
              const c = featured.find((f: any) => f.featuredRank === rank);
              const bg = rank === 1 ? '#FFD70012' : rank === 2 ? '#C0C0C010' : rank === 3 ? '#CD7F3210' : 'transparent';
              const numColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : colors.primary;
              return (
                <View key={rank} style={[s.row, { backgroundColor: bg }]}>
                  <Text style={[s.rankNum, { color: numColor }]}>#{rank}</Text>
                  {c ? (
                    <>
                      <Image source={{ uri: c.user?.avatar || 'https://via.placeholder.com/28' }} style={s.av} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>{c.user?.name || '—'}</Text>
                        <Text style={s.meta}>{c.city || ''} • ★{c.rating || '5.0'}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFeatured(c._id)}><Ionicons name="close-circle" size={18} color={colors.error} /></TouchableOpacity>
                    </>
                  ) : (
                    <Text style={s.emptySlot}>Empty — tap a creator below to assign</Text>
                  )}
                </View>
              );
            })}

            {/* Assign Creator to Featured */}
            <Text style={[s.subHead, { marginTop: 16 }]}>Assign Creator</Text>
            <TextInput style={s.searchBox} placeholder="Search by name or city..." placeholderTextColor="rgba(255,255,255,0.2)" value={search} onChangeText={setSearch} />
            {filtered.filter(c => !featured.find((f: any) => f._id === c._id)).slice(0, 8).map(c => (
              <View key={c._id} style={s.assignRow}>
                <Image source={{ uri: c.user?.avatar || 'https://via.placeholder.com/24' }} style={s.smAv} />
                <View style={{ flex: 1 }}>
                  <Text style={s.assignName}>{c.user?.name || 'Creator'}</Text>
                  <Text style={s.assignMeta}>{c.city || ''} • ★{c.rating || '5.0'}</Text>
                </View>
                {[1,2,3,4].map(r => (
                  <TouchableOpacity key={r} style={s.posBtn} onPress={() => setFeaturedRank(c._id, r)}>
                    <Text style={s.posBtnText}>#{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </>
        )}

        {/* ═══ OVERALL TAB ═══ */}
        {tab === 'overall' && (
          <>
            <Text style={s.subHead}>All Creators — Manual Order</Text>
            <TextInput style={s.searchBox} placeholder="Search..." placeholderTextColor="rgba(255,255,255,0.2)" value={search} onChangeText={setSearch} />
            {filtered.map((c: any, i: number) => (
              <View key={c._id} style={s.row}>
                <Text style={[s.rankNum, { color: colors.textMuted }]}>#{c.displayOrder || i + 1}</Text>
                <Image source={{ uri: c.user?.avatar || 'https://via.placeholder.com/28' }} style={s.av} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.user?.name || '—'}</Text>
                  <Text style={s.meta}>{c.city || ''} • ★{c.rating || '5.0'}</Text>
                </View>
                <TouchableOpacity onPress={() => moveCreator(c._id, 'up')} style={s.moveBtn}><Ionicons name="chevron-up" size={16} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => moveCreator(c._id, 'down')} style={s.moveBtn}><Ionicons name="chevron-down" size={16} color={colors.primary} /></TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 8, gap: 10 },
  headTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  tabs: { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginBottom: 8 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  subHead: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 4, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.025)' },
  rankNum: { fontSize: 13, fontWeight: '800', width: 28 },
  av: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 12, fontWeight: '600', color: colors.text },
  meta: { fontSize: 9, color: colors.textMuted },
  emptySlot: { flex: 1, fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  searchBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, color: colors.text, fontSize: 12, marginBottom: 8 },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.025)' },
  smAv: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border },
  assignName: { fontSize: 11, fontWeight: '600', color: colors.text },
  assignMeta: { fontSize: 9, color: colors.textMuted },
  posBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary + '30' },
  posBtnText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  moveBtn: { padding: 4 },
});
