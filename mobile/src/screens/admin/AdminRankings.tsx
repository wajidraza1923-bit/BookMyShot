import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const SECTIONS = [
  { key: 'all_creators', label: 'All Creators', icon: 'people' },
  { key: 'best_reviewed', label: 'Best Reviewed', icon: 'star' },
  { key: 'featured', label: 'Featured', icon: 'diamond' },
  { key: 'top_creators', label: 'Top Creators', icon: 'trophy' },
  { key: 'trending', label: 'Trending', icon: 'trending-up' },
];

const POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function AdminRankings({ navigation }: any) {
  const [rankings, setRankings] = useState<any>({});
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('all_creators');
  const [search, setSearch] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [rankRes, creatorsRes] = await Promise.all([
        api.get('/admin/rankings'),
        api.get('/admin/creator-accounts'),
      ]);
      setRankings(rankRes.data?.data || {});
      const responseData = creatorsRes.data?.data;
      const all = Array.isArray(responseData?.creators) ? responseData.creators : Array.isArray(creatorsRes.data?.creators) ? creatorsRes.data.creators : [];
      setCreators(all.filter((c: any) => c.status === 'approved'));
    } catch (e: any) {
      console.log('[Rankings] Error:', e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const applyRank = async (creatorId: string, position: number) => {
    try {
      await api.put(`/admin/rankings/${activeSection}/${position}`, { creatorId });
      setShowAddPanel(false);
      setSelectedCreator(null);
      await load();
      Alert.alert('Done', `Set at #${position} in ${SECTIONS.find(s => s.key === activeSection)?.label}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to set rank');
    }
  };

  const removeRank = async (position: number) => {
    Alert.alert('Remove', `Remove position #${position}?`, [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.delete(`/admin/rankings/${activeSection}/${position}`); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  const currentRankings = rankings[activeSection] || [];
  const filteredCreators = creators.filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.user?.name || '').toLowerCase().includes(s) || (c.user?.email || '').toLowerCase().includes(s) || (c.creatorId || '').toLowerCase().includes(s);
  });

  // Find which positions are available (not taken by promotions)
  const takenPositions = new Set(currentRankings.map((r: any) => r.position));

  if (loading) return <View style={st.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const sectionInfo = SECTIONS.find(s => s.key === activeSection)!;

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={st.title}>Creator Rankings</Text>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabsContent}>
        {SECTIONS.map(sec => (
          <TouchableOpacity key={sec.key} style={[st.tab, activeSection === sec.key && st.tabActive]} onPress={() => { setActiveSection(sec.key); setShowAddPanel(false); }}>
            <Ionicons name={sec.icon as any} size={14} color={activeSection === sec.key ? colors.primary : colors.textMuted} />
            <Text style={[st.tabText, activeSection === sec.key && st.tabTextActive]}>{sec.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>

        {/* Section Header */}
        <View style={st.sectionHeader}>
          <View>
            <Text style={st.sectionTitle}>{sectionInfo.label}</Text>
            <Text style={st.sectionSub}>{currentRankings.length} ranked • Same creator can appear in multiple sections</Text>
          </View>
          <TouchableOpacity style={st.addBtn} onPress={() => setShowAddPanel(!showAddPanel)}>
            <Ionicons name={showAddPanel ? "close" : "add"} size={18} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Current Leaderboard */}
        {currentRankings.length > 0 ? (
          <View style={st.leaderboard}>
            {currentRankings.map((r: any) => {
              const isPromo = r.source === 'promotion';
              const isManual = r.source === 'admin_manual';
              const badgeColor = isPromo ? '#10B981' : isManual ? '#F97316' : '#6B7280';
              const badgeText = isPromo ? 'PROMOTED' : isManual ? 'MANUAL' : 'AUTO';
              return (
                <View key={r._id || r.position} style={st.rankCard}>
                  {/* Rank Badge */}
                  <View style={[st.rankBadge, r.position <= 3 && { backgroundColor: r.position === 1 ? 'rgba(255,215,0,0.15)' : r.position === 2 ? 'rgba(192,192,192,0.12)' : 'rgba(205,127,50,0.12)' }]}>
                    <Text style={[st.rankNum, r.position <= 3 && { color: r.position === 1 ? '#FFD700' : r.position === 2 ? '#C0C0C0' : '#CD7F32' }]}>#{r.position}</Text>
                  </View>
                  {/* Creator Info */}
                  <Image source={{ uri: r.creator?.avatar || 'https://via.placeholder.com/36' }} style={st.creatorAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.creatorName}>{r.creator?.name || '—'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={st.creatorMeta}>{r.creator?.specialty || ''}</Text>
                      {r.creator?.rating && <Text style={st.ratingBadge}>★ {r.creator.rating}</Text>}
                    </View>
                  </View>
                  {/* Source Badge */}
                  <View style={[st.sourceBadge, { backgroundColor: badgeColor + '18' }]}>
                    <Text style={[st.sourceText, { color: badgeColor }]}>{badgeText}</Text>
                  </View>
                  {/* Remove (only non-promotion) */}
                  {!isPromo && (
                    <TouchableOpacity onPress={() => removeRank(r.position)} style={st.removeIcon}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={st.emptyCard}>
            <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
            <Text style={st.emptyTitle}>Using Automatic Ranking</Text>
            <Text style={st.emptyText}>Creators are currently ordered by rating and completed bookings. Tap + to manually assign positions.</Text>
          </View>
        )}

        {/* Add Creator Panel */}
        {showAddPanel && (
          <View style={st.addPanel}>
            <Text style={st.addPanelTitle}>Add Creator to {sectionInfo.label}</Text>
            
            {/* If creator selected, show position picker */}
            {selectedCreator ? (
              <View style={st.positionPicker}>
                <View style={st.selectedCreatorCard}>
                  <Image source={{ uri: selectedCreator.user?.avatar || 'https://via.placeholder.com/30' }} style={st.miniAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.selectedName}>{selectedCreator.user?.name}</Text>
                    <Text style={st.selectedMeta}>{selectedCreator.creatorId}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedCreator(null)}><Ionicons name="close" size={18} color={colors.textMuted} /></TouchableOpacity>
                </View>
                <Text style={st.pickLabel}>Select Position:</Text>
                <View style={st.posGrid}>
                  {POSITIONS.map(pos => {
                    const taken = currentRankings.find((r: any) => r.position === pos && r.source === 'promotion');
                    return (
                      <TouchableOpacity key={pos} style={[st.posBtn, taken && st.posBtnDisabled]} onPress={() => !taken && applyRank(selectedCreator._id, pos)} disabled={!!taken}>
                        <Text style={[st.posBtnText, taken && { color: colors.textMuted }]}>#{pos}</Text>
                        {taken && <Text style={st.posTaken}>PROMO</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* Search and select creator */
              <>
                <TextInput style={st.searchInput} placeholder="Search creator by name, email, or ID..." placeholderTextColor="rgba(255,255,255,0.2)" value={search} onChangeText={setSearch} autoFocus />
                {filteredCreators.slice(0, 8).map((c: any) => (
                  <TouchableOpacity key={c._id} style={st.creatorListItem} onPress={() => setSelectedCreator(c)}>
                    <Image source={{ uri: c.user?.avatar || 'https://via.placeholder.com/30' }} style={st.miniAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.listName}>{c.user?.name || 'Creator'}</Text>
                      <Text style={st.listMeta}>{c.creatorId} • ★{c.rating || '5.0'} • {c.city || ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
                {filteredCreators.length === 0 && <Text style={st.noResults}>No creators found</Text>}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  tabsContent: { paddingHorizontal: spacing.xl, gap: spacing.xs, paddingBottom: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sectionTitle: { ...typography.headlineMd, color: colors.text },
  sectionSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  // Leaderboard
  leaderboard: { marginBottom: spacing.xl },
  rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 13, fontWeight: '800', color: colors.primary },
  creatorAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  creatorName: { ...typography.headlineSm, color: colors.text, fontSize: 13 },
  creatorMeta: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  ratingBadge: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  removeIcon: { padding: 6 },
  // Empty
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing['2xl'], alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  emptyTitle: { ...typography.headlineSm, color: colors.textMuted, marginTop: spacing.md },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 18 },
  // Add Panel
  addPanel: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary + '30' },
  addPanelTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, color: colors.text, fontSize: 13, marginBottom: spacing.md },
  creatorListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', gap: spacing.sm },
  miniAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border },
  listName: { ...typography.bodySm, color: colors.text, fontWeight: '600', fontSize: 12 },
  listMeta: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  noResults: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  // Position Picker
  positionPicker: {},
  selectedCreatorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.06)', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)' },
  selectedName: { ...typography.bodySm, color: colors.text, fontWeight: '600', fontSize: 12 },
  selectedMeta: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  pickLabel: { ...typography.labelSm, color: colors.textMuted, marginBottom: spacing.sm },
  posGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  posBtn: { width: 54, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary + '30' },
  posBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: colors.border },
  posBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  posTaken: { fontSize: 7, color: colors.textMuted, marginTop: 1 },
});
