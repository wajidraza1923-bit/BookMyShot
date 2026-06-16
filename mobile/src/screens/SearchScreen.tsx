import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { creatorsAPI } from '../services/api';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function SearchScreen({ navigation, route }: any) {
  const [query, setQuery] = useState('');
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(route?.params?.city || '');
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.category || '');
  const [showResults, setShowResults] = useState(!!route?.params?.city || !!route?.params?.category);

  // Dynamic data from API
  const [districts, setDistricts] = useState<any[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [inspiration, setInspiration] = useState<any[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<any[]>([]);

  useEffect(() => { loadDiscoverData(); }, []);

  const loadDiscoverData = async () => {
    try {
      const [distRes, trendRes, configRes, inspRes, trendCreatorsRes] = await Promise.all([
        api.get('/discover/districts').catch(() => ({ data: { data: [] } })),
        api.get('/discover/trending-searches').catch(() => ({ data: { data: [] } })),
        api.get('/app-config').catch(() => ({ data: { categories: [] } })),
        api.get('/discover/inspiration').catch(() => ({ data: { data: [] } })),
        api.get('/discover/trending').catch(() => ({ data: { data: [] } })),
      ]);
      setDistricts(distRes.data?.data || []);
      setTrendingSearches(trendRes.data?.data || []);
      setCategories((configRes.data?.categories || []).filter((c: any) => c.id !== 'all'));
      setInspiration(inspRes.data?.data || []);
      setTrendingCreators(trendCreatorsRes.data?.data || []);
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
      setCreators(res.data?.creators || res.data?.data || []);
    } catch { setCreators([]); }
    finally { setLoading(false); }
  }, [query, selectedCity, selectedCategory]);

  useEffect(() => {
    if (showResults || query.length > 0) {
      const t = setTimeout(searchCreators, 300);
      return () => clearTimeout(t);
    }
  }, [query, selectedCity, selectedCategory, showResults]);

  useEffect(() => { searchCreators(); }, []);

  const handleSearch = (text: string) => { setQuery(text); if (text.length > 0) setShowResults(true); };

  // ═══ DISCOVERY VIEW ═══
  const renderDiscovery = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Trending Searches */}
      {trendingSearches.length > 0 && (<>
        <Text style={st.secTitle}>Trending Searches</Text>
        <View style={st.trendWrap}>
          {trendingSearches.map((t, i) => (
            <TouchableOpacity key={i} style={st.trendPill} onPress={() => { setQuery(t.title); setShowResults(true); }}>
              <Text style={st.trendIcon}>{t.icon || '🔍'}</Text>
              <Text style={st.trendText}>{t.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>)}

      {/* Categories */}
      {categories.length > 0 && (<>
        <Text style={st.secTitle}>Browse by Category</Text>
        <View style={st.catGrid}>
          {categories.map(cat => (
            <TouchableOpacity key={cat.id} style={st.catCard} onPress={() => { setSelectedCategory(cat.id); setShowResults(true); }}>
              {cat.image ? <Image source={{ uri: cat.image }} style={st.catImg} /> : <Text style={st.catEmoji}>{cat.icon || '📷'}</Text>}
              <Text style={st.catLabel}>{cat.label}</Text>
              <Text style={st.catCount}>{cat.count || 0} creators</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>)}

      {/* Popular Districts */}
      {districts.length > 0 && (<>
        <Text style={st.secTitle}>Popular Districts</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={districts.slice(0, 8)} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i._id || i.name}
          renderItem={({ item }) => (
            <TouchableOpacity style={st.distCard} onPress={() => { setSelectedCity(item.name); setShowResults(true); }}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={st.distImg} /> : <View style={st.distPlaceholder}><Ionicons name="location" size={20} color="#FF8C2B" /></View>}
              <Text style={st.distName}>{item.name}</Text>
              <Text style={st.distCount}>{item.creatorCount || 0} creators</Text>
            </TouchableOpacity>
          )} />
      </>)}

      {/* Trending This Week */}
      {trendingCreators.length > 0 && (<>
        <Text style={st.secTitle}>Trending This Week</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={trendingCreators} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i._id}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={st.trendCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
              <View style={st.trendRank}><Text style={st.trendRankText}>#{index + 1}</Text></View>
              <Image source={{ uri: item.user?.avatar || item.portfolio?.[0] }} style={st.trendAvatar} />
              <Text style={st.trendName} numberOfLines={1}>{item.user?.name}</Text>
              <Text style={st.trendSpec}>{item.city || item.specialty}</Text>
              <View style={st.trendRating}><Ionicons name="star" size={10} color="#FF8C2B" /><Text style={st.trendRatingText}>{item.rating || '5.0'}</Text></View>
            </TouchableOpacity>
          )} />
      </>)}

      {/* Inspiration */}
      {inspiration.length > 0 && (<>
        <Text style={st.secTitle}>Wedding Inspiration</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={inspiration} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i._id || i.title}
          renderItem={({ item }) => (
            <View style={st.inspCard}>
              <Image source={{ uri: item.imageUrl }} style={st.inspImg} />
              <View style={st.inspOverlay} />
              <Text style={st.inspTitle}>{item.title}</Text>
            </View>
          )} />
      </>)}
    </ScrollView>
  );

  // ═══ RESULTS VIEW ═══
  const renderResults = () => (
    <FlatList data={creators} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      ListHeaderComponent={<View style={st.resHeader}><Text style={st.resCount}>{creators.length} creators found</Text></View>}
      ListEmptyComponent={<View style={st.empty}><Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" /><Text style={st.emptyTitle}>No creators found</Text><Text style={st.emptySub}>Try different search terms</Text></View>}
      renderItem={({ item }) => (
        <TouchableOpacity style={st.resCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.85}>
          <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar }} style={st.resImg} />
          <View style={st.resInfo}>
            <Text style={st.resName} numberOfLines={1}>{item.user?.name}</Text>
            <Text style={st.resMeta}>{item.specialty || 'Photographer'} • {item.city || 'J&K'}</Text>
            <View style={st.resRow}><Ionicons name="star" size={11} color="#FF8C2B" /><Text style={st.resRating}>{item.rating || '5.0'}</Text>
              {item.startingPrice > 0 && <Text style={st.resPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}</View>
          </View>
        </TouchableOpacity>
      )} keyExtractor={i => i._id} />
  );

  return (
    <View style={st.container}>
      {/* Search Header */}
      <View style={st.searchHeader}>
        <TouchableOpacity onPress={() => { if (showResults) { setShowResults(false); setQuery(''); setSelectedCity(''); setSelectedCategory(''); } else navigation.goBack(); }} style={st.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={st.searchInput}>
          <Ionicons name="search" size={15} color="rgba(255,255,255,0.4)" />
          <TextInput style={st.input} value={query} onChangeText={handleSearch} placeholder="Search creators, districts..." placeholderTextColor="rgba(255,255,255,0.3)" selectionColor="#FF8C2B" />
          {query.length > 0 && <TouchableOpacity onPress={() => { setQuery(''); setShowResults(false); }}><Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" /></TouchableOpacity>}
        </View>
      </View>

      {/* Active Filters */}
      {(selectedCity || selectedCategory) && showResults && (
        <View style={st.filterRow}>
          {selectedCity ? <TouchableOpacity style={st.filterChip} onPress={() => setSelectedCity('')}><Text style={st.filterText}>{selectedCity}</Text><Ionicons name="close" size={12} color="#FF8C2B" /></TouchableOpacity> : null}
          {selectedCategory ? <TouchableOpacity style={st.filterChip} onPress={() => setSelectedCategory('')}><Text style={st.filterText}>{selectedCategory}</Text><Ionicons name="close" size={12} color="#FF8C2B" /></TouchableOpacity> : null}
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color="#FF8C2B" style={{ marginTop: 60 }} /> : showResults ? renderResults() : renderDiscovery()}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 46, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, height: 42, gap: 8 },
  input: { flex: 1, fontSize: 14, color: '#fff' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,140,43,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  filterText: { fontSize: 11, color: '#FF8C2B', fontWeight: '500' },
  // Sections
  secTitle: { fontSize: 15, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  // Trending
  trendWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  trendIcon: { fontSize: 14 },
  trendText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  // Categories
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  catCard: { width: (width - 56) / 3, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  catImg: { width: 36, height: 36, borderRadius: 18, marginBottom: 6 },
  catEmoji: { fontSize: 24, marginBottom: 6 },
  catLabel: { fontSize: 10, fontWeight: '500', color: '#fff', textAlign: 'center' },
  catCount: { fontSize: 9, color: 'rgba(255,140,43,0.7)', marginTop: 2 },
  // Districts
  distCard: { alignItems: 'center', marginRight: 14, width: 80 },
  distImg: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.2)', marginBottom: 6 },
  distPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  distName: { fontSize: 10, fontWeight: '500', color: '#fff', textAlign: 'center' },
  distCount: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  // Trending creators
  trendCard: { alignItems: 'center', width: 100, marginRight: 12, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  trendRank: { position: 'absolute', top: 6, left: 6, backgroundColor: '#FF8C2B', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  trendRankText: { fontSize: 8, fontWeight: '800', color: '#000' },
  trendAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.25)', marginBottom: 6 },
  trendName: { fontSize: 11, fontWeight: '600', color: '#fff', textAlign: 'center' },
  trendSpec: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  trendRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  trendRatingText: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  // Inspiration
  inspCard: { width: width * 0.6, height: 140, borderRadius: 14, overflow: 'hidden', marginRight: 10 },
  inspImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  inspOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  inspTitle: { position: 'absolute', bottom: 12, left: 12, fontSize: 13, fontWeight: '600', color: '#fff' },
  // Results
  resHeader: { marginBottom: 12 },
  resCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  resCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  resImg: { width: 64, height: 64, borderRadius: 12 },
  resInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  resName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  resMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  resRating: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginRight: 8 },
  resPrice: { fontSize: 11, fontWeight: '600', color: '#FF8C2B' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 12 },
  emptySub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
});
