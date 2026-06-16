import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { creatorsAPI } from '../services/api';
import api from '../services/api';

const { width } = Dimensions.get('window');
const HALF = (width - 52) / 2;

const DEFAULT_DISTRICTS = [
  { name: 'Poonch', creatorCount: 120, imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200' },
  { name: 'Surankote', creatorCount: 45, imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200' },
  { name: 'Rajouri', creatorCount: 85, imageUrl: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=200' },
  { name: 'Jammu', creatorCount: 250, imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=200' },
  { name: 'Srinagar', creatorCount: 180, imageUrl: 'https://images.unsplash.com/photo-1597074866923-dc0589150458?w=200' },
  { name: 'Kathua', creatorCount: 60, imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200' },
  { name: 'Udhampur', creatorCount: 55, imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200' },
  { name: 'Anantnag', creatorCount: 70, imageUrl: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200' },
  { name: 'Baramulla', creatorCount: 65, imageUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=200' },
  { name: 'Doda', creatorCount: 30, imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200' },
];

const DEFAULT_TRENDING = [
  { title: 'Pre Wedding', icon: 'heart-circle' },
  { title: 'Wedding Photography', icon: 'camera' },
  { title: 'Cinematography', icon: 'film' },
  { title: 'Drone Coverage', icon: 'airplane' },
  { title: 'Bridal Shoot', icon: 'diamond' },
  { title: 'Destination Wedding', icon: 'navigate' },
];

const DEFAULT_INSPIRATION = [
  { title: 'Royal Kashmiri Weddings', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400' },
  { title: 'Mountain Weddings', imageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400' },
  { title: 'Traditional Ceremonies', imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400' },
  { title: 'Cinematic Films', imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400' },
];

export default function SearchScreen({ navigation, route }: any) {
  const [query, setQuery] = useState('');
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(route?.params?.city || '');
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.category || '');
  const [showResults, setShowResults] = useState(!!route?.params?.city || !!route?.params?.category);
  const [districts, setDistricts] = useState<any[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [inspiration, setInspiration] = useState<any[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [distR, trendR, catR, inspR, trendCR, featR] = await Promise.all([
        api.get('/discover/districts').catch(() => ({ data: { data: [] } })),
        api.get('/discover/trending-searches').catch(() => ({ data: { data: [] } })),
        api.get('/app-config').catch(() => ({ data: { categories: [] } })),
        api.get('/discover/inspiration').catch(() => ({ data: { data: [] } })),
        api.get('/discover/trending').catch(() => ({ data: { data: [] } })),
        api.get('/discover/featured-creators').catch(() => ({ data: { data: [] } })),
      ]);
      setDistricts((distR.data?.data || []).length > 0 ? distR.data.data : DEFAULT_DISTRICTS);
      setTrendingSearches((trendR.data?.data || []).length > 0 ? trendR.data.data : DEFAULT_TRENDING);
      setCategories((catR.data?.categories || []).filter((c: any) => c.id !== 'all'));
      setInspiration((inspR.data?.data || []).length > 0 ? inspR.data.data : DEFAULT_INSPIRATION);
      setTrendingCreators(trendCR.data?.data || []);
      setFeaturedCreators(featR.data?.data || []);
    } catch {}
    searchCreators();
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
    if (showResults || query.length > 0) { const t = setTimeout(searchCreators, 300); return () => clearTimeout(t); }
  }, [query, selectedCity, selectedCategory, showResults]);

  const handleSearch = (t: string) => { setQuery(t); if (t.length > 0) setShowResults(true); };
  const clearFilters = () => { setQuery(''); setSelectedCity(''); setSelectedCategory(''); setShowResults(false); };

  return (
    <View style={s.container}>
      {/* HEADER */}
      <View style={s.header}>
        <View><Text style={s.headerTitle}>Discover</Text><Text style={s.headerSub}>Find your perfect creator</Text></View>
        <View style={s.headerIcons}>
          <TouchableOpacity style={s.iconBtn}><Ionicons name="options-outline" size={18} color="#FF8C2B" /></TouchableOpacity>
        </View>
      </View>

      {/* SEARCH */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={15} color="rgba(255,255,255,0.3)" />
          <TextInput style={s.searchInput} value={query} onChangeText={handleSearch} placeholder="Search creators, cities, categories..." placeholderTextColor="rgba(255,255,255,0.25)" selectionColor="#FF8C2B" />
          {query.length > 0 && <TouchableOpacity onPress={clearFilters}><Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.3)" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={s.locBtn}><Ionicons name="location" size={14} color="#FF8C2B" /><Text style={s.locText}>J&K</Text></TouchableOpacity>
      </View>

      {/* FILTERS */}
      {(selectedCity || selectedCategory) && (
        <View style={s.filterRow}>
          {selectedCity ? <TouchableOpacity style={s.filterChip} onPress={() => setSelectedCity('')}><Text style={s.filterText}>{selectedCity}</Text><Ionicons name="close" size={11} color="#FF8C2B" /></TouchableOpacity> : null}
          {selectedCategory ? <TouchableOpacity style={s.filterChip} onPress={() => setSelectedCategory('')}><Text style={s.filterText}>{selectedCategory}</Text><Ionicons name="close" size={11} color="#FF8C2B" /></TouchableOpacity> : null}
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color="#FF8C2B" style={{ marginTop: 50 }} /> :
        showResults ? <ResultsList creators={creators} navigation={navigation} /> :
        <DiscoverContent districts={districts} trendingSearches={trendingSearches} categories={categories} inspiration={inspiration} trendingCreators={trendingCreators} featuredCreators={featuredCreators} navigation={navigation} setQuery={setQuery} setSelectedCity={setSelectedCity} setSelectedCategory={setSelectedCategory} setShowResults={setShowResults} />
      }
    </View>
  );
}

// ═══ DISCOVER CONTENT ═══
function DiscoverContent({ districts, trendingSearches, categories, inspiration, trendingCreators, featuredCreators, navigation, setQuery, setSelectedCity, setSelectedCategory, setShowResults }: any) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Trending Searches */}
      {trendingSearches.length > 0 && (<>
        <Text style={s.secTitle}>Trending Searches</Text>
        <View style={s.pillWrap}>{trendingSearches.map((t: any, i: number) => (
          <TouchableOpacity key={i} style={s.pill} onPress={() => { setQuery(t.title); setShowResults(true); }}><Ionicons name={(t.icon || 'search') as any} size={13} color="#FF8C2B" /><Text style={s.pillText}>{t.title}</Text></TouchableOpacity>
        ))}</View>
      </>)}

      {/* Categories */}
      {categories.length > 0 && (<>
        <View style={s.secRow}><Text style={s.secTitle}>Browse by Category</Text><TouchableOpacity><Text style={s.seeAll}>See All →</Text></TouchableOpacity></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={categories} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(i: any) => i.id}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={s.catCard} onPress={() => { setSelectedCategory(item.id); setShowResults(true); }}>
              {item.image ? <Image source={{ uri: item.image }} style={s.catImg} /> : <View style={s.catPlaceholder}><Ionicons name={(item.icon || 'camera') as any} size={24} color="#FF8C2B" /></View>}
              <View style={s.catOverlay} />
              <View style={s.catBottom}><Text style={s.catLabel}>{item.label}</Text><Text style={s.catCount}>{item.count || 0}+</Text></View>
            </TouchableOpacity>
          )} />
      </>)}

      {/* Featured Creators */}
      {featuredCreators.length > 0 && (<>
        <View style={s.secRow}><Text style={s.secTitle}>Featured Creators</Text><TouchableOpacity><Text style={s.seeAll}>View All →</Text></TouchableOpacity></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={featuredCreators} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(i: any) => i._id}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={s.fcCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
              <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || 'https://via.placeholder.com/300x180' }} style={s.fcImg} />
              <View style={s.fcOverlay} />
              <View style={s.fcBadge}><Ionicons name="star" size={8} color="#000" /><Text style={s.fcBadgeText}>FEATURED</Text></View>
              {item.verified && <View style={s.fcVerified}><Ionicons name="checkmark" size={9} color="#fff" /></View>}
              <View style={s.fcInfo}>
                <Text style={s.fcName} numberOfLines={1}>{item.user?.name}</Text>
                <Text style={s.fcMeta}>{item.city || item.specialty}</Text>
                <View style={s.fcRow}><Ionicons name="star" size={10} color="#FF8C2B" /><Text style={s.fcRating}>{item.rating || '5.0'}</Text>
                  {item.startingPrice > 0 && <Text style={s.fcPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}</View>
              </View>
            </TouchableOpacity>
          )} />
      </>)}

      {/* Popular Districts */}
      {districts.length > 0 && (<>
        <View style={s.secRow}><Text style={s.secTitle}>Popular Districts</Text><TouchableOpacity><Text style={s.seeAll}>See All →</Text></TouchableOpacity></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={districts.slice(0, 10)} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(i: any) => i._id || i.name}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={s.distCard} onPress={() => { setSelectedCity(item.name); setShowResults(true); }}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.distImg} /> : <View style={s.distPlaceholder}><Ionicons name="location" size={22} color="#FF8C2B" /></View>}
              <Text style={s.distName}>{item.name}</Text>
              <Text style={s.distCount}>{item.creatorCount || 0}+ Creators</Text>
            </TouchableOpacity>
          )} />
      </>)}

      {/* Trending This Week */}
      {trendingCreators.length > 0 && (<>
        <View style={s.secRow}><Text style={s.secTitle}>Trending This Week</Text></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={trendingCreators.slice(0, 8)} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(i: any) => i._id}
          renderItem={({ item, index }: any) => (
            <TouchableOpacity style={s.trCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
              <View style={s.trRank}><Text style={s.trRankText}>#{index + 1}</Text></View>
              <Image source={{ uri: item.user?.avatar || item.portfolio?.[0] || 'https://via.placeholder.com/100' }} style={s.trAvatar} />
              <Text style={s.trName} numberOfLines={1}>{item.user?.name}</Text>
              <Text style={s.trCity}>{item.city || item.specialty}</Text>
              <View style={s.trRatingRow}><Ionicons name="star" size={9} color="#FF8C2B" /><Text style={s.trRatingText}>{item.rating || '5.0'}</Text></View>
            </TouchableOpacity>
          )} />
      </>)}

      {/* Inspiration Gallery */}
      {inspiration.length > 0 && (<>
        <View style={s.secRow}><Text style={s.secTitle}>Wedding Inspiration</Text></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={inspiration} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(i: any) => i._id || i.title}
          renderItem={({ item }: any) => (
            <View style={s.inspCard}><Image source={{ uri: item.imageUrl }} style={s.inspImg} /><View style={s.inspOverlay} /><Text style={s.inspTitle}>{item.title}</Text></View>
          )} />
      </>)}

      {/* AI Recommend */}
      <View style={s.aiCard}>
        <Text style={s.aiTitle}>Can't Decide?</Text>
        <Text style={s.aiSub}>Let us recommend your perfect creator based on your preferences.</Text>
        <TouchableOpacity style={s.aiBtn} onPress={() => navigation.navigate('Inquiry')}><Ionicons name="sparkles" size={14} color="#000" /><Text style={s.aiBtnText}>Find My Match</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ═══ RESULTS ═══
function ResultsList({ creators, navigation }: any) {
  return (
    <FlatList data={creators} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      ListHeaderComponent={<Text style={s.resCount}>{creators.length} creators found</Text>}
      ListEmptyComponent={<View style={s.empty}><Ionicons name="search-outline" size={36} color="rgba(255,255,255,0.1)" /><Text style={s.emptyTitle}>No creators found</Text></View>}
      keyExtractor={(i: any) => i._id}
      renderItem={({ item }: any) => (
        <TouchableOpacity style={s.resCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
          <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || 'https://via.placeholder.com/200' }} style={s.resImg} />
          <View style={s.resInfo}>
            <Text style={s.resName} numberOfLines={1}>{item.user?.name}</Text>
            <Text style={s.resMeta}>{item.specialty} • {item.city}</Text>
            <View style={s.resRow}><Ionicons name="star" size={10} color="#FF8C2B" /><Text style={s.resRating}>{item.rating || '5.0'}</Text>{item.startingPrice > 0 && <Text style={s.resPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}</View>
          </View>
        </TouchableOpacity>
      )} />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 44 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,140,43,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.15)', alignItems: 'center', justifyContent: 'center' },
  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 14, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#fff' },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.15)', borderRadius: 12, paddingHorizontal: 10, height: 42 },
  locText: { fontSize: 10, fontWeight: '600', color: '#FF8C2B' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginTop: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,140,43,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  filterText: { fontSize: 10, color: '#FF8C2B' },
  // Sections
  secTitle: { fontSize: 15, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  seeAll: { fontSize: 11, color: '#FF8C2B', fontWeight: '600' },
  // Trending pills
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  pillText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  // Category cards
  catCard: { width: 120, height: 80, borderRadius: 12, overflow: 'hidden', marginRight: 10 },
  catImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  catPlaceholder: { width: '100%', height: '100%', backgroundColor: 'rgba(255,140,43,0.06)', alignItems: 'center', justifyContent: 'center' },
  catOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  catBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  catLabel: { fontSize: 10, fontWeight: '600', color: '#fff' },
  catCount: { fontSize: 8, color: '#FF8C2B', marginTop: 1 },
  // Featured creator cards
  fcCard: { width: width * 0.65, height: 180, borderRadius: 16, overflow: 'hidden', marginRight: 12 },
  fcImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  fcOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  fcBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FF8C2B', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  fcBadgeText: { fontSize: 7, fontWeight: '800', color: '#000' },
  fcVerified: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  fcInfo: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(5,4,3,0.85)', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: 'rgba(255,140,43,0.08)' },
  fcName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  fcMeta: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  fcRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  fcRating: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  fcPrice: { fontSize: 10, fontWeight: '600', color: '#FF8C2B', marginLeft: 'auto' },
  // Districts
  distCard: { alignItems: 'center', marginRight: 14, width: 76 },
  distImg: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.2)', marginBottom: 5 },
  distPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  distName: { fontSize: 10, fontWeight: '500', color: '#fff', textAlign: 'center' },
  distCount: { fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  // Trending
  trCard: { alignItems: 'center', width: 90, marginRight: 10, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  trRank: { position: 'absolute', top: 5, left: 5, backgroundColor: '#FF8C2B', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trRankText: { fontSize: 7, fontWeight: '800', color: '#000' },
  trAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,140,43,0.2)', marginBottom: 5 },
  trName: { fontSize: 10, fontWeight: '600', color: '#fff', textAlign: 'center' },
  trCity: { fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  trRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  trRatingText: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  // Inspiration
  inspCard: { width: width * 0.55, height: 130, borderRadius: 14, overflow: 'hidden', marginRight: 10 },
  inspImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  inspOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  inspTitle: { position: 'absolute', bottom: 10, left: 10, fontSize: 12, fontWeight: '600', color: '#fff' },
  // AI
  aiCard: { marginHorizontal: 20, marginTop: 28, padding: 20, backgroundColor: 'rgba(255,140,43,0.04)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.12)', borderRadius: 18, alignItems: 'center' },
  aiTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  aiSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 4, marginBottom: 14 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF8C2B', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  aiBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Results
  resCount: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 12 },
  resCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  resImg: { width: 60, height: 60, borderRadius: 10 },
  resInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  resName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  resMeta: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  resRating: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginRight: 6 },
  resPrice: { fontSize: 10, fontWeight: '600', color: '#FF8C2B' },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyTitle: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 10 },
});
