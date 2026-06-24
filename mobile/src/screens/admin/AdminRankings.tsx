import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const SECTIONS = [
  { key: 'all_creators', label: 'All Creators' },
  { key: 'best_reviewed', label: 'Best Reviewed' },
  { key: 'featured', label: 'Featured' },
  { key: 'top_creators', label: 'Top Creators' },
  { key: 'trending', label: 'Trending' },
];

export default function AdminRankings({ navigation }: any) {
  const [rankings, setRankings] = useState<any>({});
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('all_creators');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [rankRes, creatorsRes] = await Promise.all([
        api.get('/admin/rankings'),
        api.get('/admin/creator-accounts'),
      ]);
      setRankings(rankRes.data?.data || {});
      // Handle both response formats
      const responseData = creatorsRes.data?.data;
      const all = Array.isArray(responseData?.creators)
        ? responseData.creators
        : Array.isArray(creatorsRes.data?.creators)
          ? creatorsRes.data.creators
          : [];
      setCreators(all.filter((c: any) => c.status === 'approved'));
    } catch (e: any) {
      console.log('[Rankings] Load error:', e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const setRank = (creatorId: string, name: string) => {
    Alert.alert('Set Position', `Choose position for "${name}" in ${SECTIONS.find(s2=>s2.key===activeSection)?.label}:`, [
      { text: '#1', onPress: () => applyRank(creatorId, 1) },
      { text: '#2', onPress: () => applyRank(creatorId, 2) },
      { text: '#3', onPress: () => applyRank(creatorId, 3) },
      { text: '#4', onPress: () => applyRank(creatorId, 4) },
      { text: '#5', onPress: () => applyRank(creatorId, 5) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const applyRank = async (creatorId: string, position: number) => {
    if (!position || position < 1) return;
    try {
      await api.put(`/admin/rankings/${activeSection}/${position}`, { creatorId });
      await load();
      Alert.alert('Done', `Set at #${position} in ${SECTIONS.find(s=>s.key===activeSection)?.label}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to set rank');
    }
  };

  const removeRank = async (position: number) => {
    try {
      await api.delete(`/admin/rankings/${activeSection}/${position}`);
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const currentRankings = rankings[activeSection] || [];
  const filteredCreators = creators.filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.user?.name?.toLowerCase().includes(s) || c.user?.email?.toLowerCase().includes(s) || c.creatorId?.toLowerCase().includes(s);
  });

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Rankings</Text>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {SECTIONS.map(sec => (
          <TouchableOpacity key={sec.key} style={[s.tab, activeSection === sec.key && s.tabActive]} onPress={() => setActiveSection(sec.key)}>
            <Text style={[s.tabText, activeSection === sec.key && s.tabTextActive]}>{sec.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>

        {/* Current Rankings */}
        <Text style={s.sectionTitle}>Current Rankings — {SECTIONS.find(s2=>s2.key===activeSection)?.label}</Text>
        {currentRankings.length > 0 ? currentRankings.map((r: any) => (
          <View key={r._id} style={s.rankCard}>
            <View style={s.rankBadge}><Text style={s.rankNum}>#{r.position}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rankName}>{r.creator?.name || '—'}</Text>
              <Text style={s.rankMeta}>{r.creator?.specialty || ''} • {r.creator?.city || ''} • {r.source}</Text>
            </View>
            {r.source === 'promotion' ? (
              <View style={s.promoBadge}><Text style={s.promoText}>PAID</Text></View>
            ) : (
              <TouchableOpacity onPress={() => removeRank(r.position)} style={s.removeBtn}><Ionicons name="close-circle" size={20} color={colors.error} /></TouchableOpacity>
            )}
          </View>
        )) : (
          <View style={s.emptyCard}><Text style={s.emptyText}>No manual rankings set yet. Tap any creator below to assign a position. ({creators.length} creators available)</Text></View>
        )}

        {/* Add Creator */}
        <Text style={[s.sectionTitle, { marginTop: spacing.xl }]}>Add Creator to Section</Text>
        <TextInput style={s.searchInput} placeholder="Search creator by name, email, or ID..." placeholderTextColor="rgba(255,255,255,0.2)" value={search} onChangeText={setSearch} />

        {filteredCreators.slice(0, 15).map((c: any) => (
          <TouchableOpacity key={c._id} style={s.creatorRow} onPress={() => setRank(c._id, c.user?.name || 'Creator')}>
            <View style={{ flex: 1 }}>
              <Text style={s.creatorName}>{c.user?.name || 'Creator'}</Text>
              <Text style={s.creatorMeta}>{c.creatorId} • {c.specialty || ''} • ★{c.rating || '5.0'}</Text>
            </View>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  tabsScroll: { maxHeight: 44, marginBottom: spacing.sm },
  tabsContent: { paddingHorizontal: spacing.xl, gap: spacing.xs },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  sectionTitle: { ...typography.headlineSm, color: colors.text, marginBottom: spacing.md },
  rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  rankNum: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  rankName: { ...typography.headlineSm, color: colors.text },
  rankMeta: { ...typography.caption, color: colors.textMuted },
  promoBadge: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  promoText: { fontSize: 9, fontWeight: '700', color: colors.success },
  removeBtn: { padding: 4 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
  searchInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, color: colors.text, fontSize: 13, marginBottom: spacing.md },
  creatorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  creatorName: { ...typography.bodySm, color: colors.text, fontWeight: '600' },
  creatorMeta: { ...typography.caption, color: colors.textMuted },
});
