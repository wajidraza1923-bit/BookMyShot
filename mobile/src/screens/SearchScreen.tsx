import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { creatorsAPI } from '../services/api';
import api from '../services/api';

export default function SearchScreen({ navigation, route }: any) {
  const [query, setQuery] = useState('');
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(route?.params?.city || '');
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.category || '');
  const [showResults, setShowResults] = useState(!!route?.params?.city || !!route?.params?.category);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

  useEffect(() => {
    loadConfig();
    // Load all creators on mount
    searchCreators();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await api.get('/app-config');
      if (res.data?.categories) setCategories(res.data.categories.filter((c: any) => c.id !== 'all'));
      if (res.data?.cities) setCities(res.data.cities);
      // Use city names as trending searches
      const trending = (res.data?.cities || []).slice(0, 3).map((c: any) => `${c.name} photographer`);
      trending.push('Pre-wedding shoot', 'Candid photography');
      setTrendingSearches(trending);
    } catch {}
  };

  const searchCreators = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (query) params.search = query;
      if (selectedCity) params.city = selectedCity;
      if (selectedCategory) params.category = selectedCategory;
      const res = await creatorsAPI.getAll(params);
      const data = res.data?.creators || res.data?.data || [];
      setCreators(data);
    } catch { setCreators([]); }
    finally { setLoading(false); }
  }, [query, selectedCity, selectedCategory]);

  useEffect(() => {
    if (showResults || query.length > 0) {
      const t = setTimeout(searchCreators, 300);
      return () => clearTimeout(t);
    }
  }, [query, selectedCity, selectedCategory, showResults]);

  const handleSearch = (text: string) => { setQuery(text); if (text.length > 0) setShowResults(true); };

  const renderDiscovery = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Trending Searches */}
      <Text style={styles.sectionLabel}>Trending Searches</Text>
      <View style={styles.trendingWrap}>
        {trendingSearches.map((t, i) => (
          <TouchableOpacity key={i} style={styles.trendingPill} onPress={() => { setQuery(t); setShowResults(true); }}>
            <Ionicons name="trending-up" size={12} color={colors.primary} />
            <Text style={styles.trendingText}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Categories */}
      <Text style={styles.sectionLabel}>Browse by Category</Text>
      <View style={styles.catGrid}>
        {categories.map(cat => (
          <TouchableOpacity key={cat.id} style={styles.catCard} onPress={() => { setSelectedCategory(cat.id); setShowResults(true); }}>
            <Text style={styles.catCardIcon}>{cat.icon}</Text>
            <Text style={styles.catCardLabel}>{cat.label}</Text>
            <Text style={styles.catCardCount}>{cat.count} creators</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cities */}
      <Text style={styles.sectionLabel}>Popular Cities</Text>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={cities}
        contentContainerStyle={{ paddingHorizontal: spacing.xl }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.cityChip} onPress={() => { setSelectedCity(item.name); setShowResults(true); }}>
            <Image source={{ uri: item.image }} style={styles.cityChipImg} />
            <Text style={styles.cityChipName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={i => i.id}
      />
    </ScrollView>
  );

  const renderResults = () => (
    <FlatList
      data={creators}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
      ListHeaderComponent={
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>{creators.length} creators found</Text>
          <TouchableOpacity style={styles.sortBtn}><Ionicons name="swap-vertical" size={14} color={colors.primary} /><Text style={styles.sortText}>Sort</Text></TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.resultCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.85}>
          <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar }} style={styles.resultImg} />
          <View style={styles.resultInfo}>
            <View style={styles.resultNameRow}>
              <Text style={styles.resultName} numberOfLines={1}>{item.user?.name}</Text>
              {item.verified && <Ionicons name="checkmark-circle" size={14} color={colors.success} />}
            </View>
            <Text style={styles.resultSpec}>{item.specialty} • {item.city}</Text>
            <View style={styles.resultBottom}>
              <View style={styles.resultRating}><Ionicons name="star" size={11} color={colors.primary} /><Text style={styles.resultRatingText}>{item.rating} ({item.reviewCount || 0})</Text></View>
              <Text style={styles.resultPrice}>₹{(item.startingPrice || 0).toLocaleString('en-IN')}</Text>
            </View>
            {item.available !== false && <View style={styles.availBadge}><View style={styles.availDot} /><Text style={styles.availText}>Available</Text></View>}
          </View>
          <TouchableOpacity style={styles.favBtn}><Ionicons name="heart-outline" size={18} color={colors.textMuted} /></TouchableOpacity>
        </TouchableOpacity>
      )}
      keyExtractor={i => i._id}
      ListEmptyComponent={
        <View style={styles.empty}><Text style={styles.emptyIcon}>🔍</Text><Text style={styles.emptyTitle}>No creators found</Text><Text style={styles.emptySubtitle}>Try a different search</Text></View>
      }
    />
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => { if (showResults) { setShowResults(false); setQuery(''); } else navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput style={styles.input} value={query} onChangeText={handleSearch} placeholder="Search creators, cities..." placeholderTextColor={colors.textMuted} selectionColor={colors.primary} autoFocus={!route?.params?.city} />
          {query.length > 0 && <TouchableOpacity onPress={() => { setQuery(''); setShowResults(false); }}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></TouchableOpacity>}
        </View>
      </View>

      {/* Filters */}
      {showResults && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
          {selectedCity && <TouchableOpacity style={styles.filterChip} onPress={() => setSelectedCity('')}><Text style={styles.filterChipText}>{selectedCity}</Text><Ionicons name="close" size={12} color={colors.primary} /></TouchableOpacity>}
          {selectedCategory && <TouchableOpacity style={styles.filterChip} onPress={() => setSelectedCategory('')}><Text style={styles.filterChipText}>{selectedCategory}</Text><Ionicons name="close" size={12} color={colors.primary} /></TouchableOpacity>}
          <TouchableOpacity style={styles.filterChipOutline}><Ionicons name="options-outline" size={14} color={colors.textSecondary} /><Text style={styles.filterChipOutlineText}>Filters</Text></TouchableOpacity>
        </ScrollView>
      )}

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['4xl'] }} /> : showResults ? renderResults() : renderDiscovery()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 44, gap: spacing.sm },
  input: { flex: 1, ...typography.bodyMd, color: colors.text, height: '100%' },
  filterRow: { maxHeight: 44, marginTop: spacing.md },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full },
  filterChipText: { ...typography.labelSm, color: colors.primary },
  filterChipOutline: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full },
  filterChipOutlineText: { ...typography.labelSm, color: colors.textSecondary },
  sectionLabel: { ...typography.headlineSm, color: colors.text, paddingHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: spacing.md },
  trendingWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
  trendingPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  trendingText: { ...typography.bodySm, color: colors.textSecondary },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
  catCard: { width: '30%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  catCardIcon: { fontSize: 24, marginBottom: spacing.xs },
  catCardLabel: { ...typography.labelMd, color: colors.text },
  catCardCount: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  cityChip: { alignItems: 'center', marginRight: spacing.lg },
  cityChipImg: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.borderGold, marginBottom: spacing.sm },
  cityChipName: { ...typography.labelMd, color: colors.textSecondary },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  resultsCount: { ...typography.bodySm, color: colors.textMuted },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { ...typography.labelMd, color: colors.primary },
  resultCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  resultImg: { width: 72, height: 72, borderRadius: radius.md },
  resultInfo: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  resultName: { ...typography.headlineSm, color: colors.text, flex: 1 },
  resultSpec: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  resultBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  resultRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultRatingText: { ...typography.labelSm, color: colors.textSecondary },
  resultPrice: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  availText: { ...typography.caption, color: colors.success },
  favBtn: { position: 'absolute', top: spacing.md, right: spacing.md },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { ...typography.headlineMd, color: colors.text },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs },
});
