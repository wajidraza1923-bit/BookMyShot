/**
 * AllCreatorsScreen — Dedicated creator listing page
 * Separate from Discover. District filter + all creators.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { creatorsAPI } from '../services/api';
import api from '../services/api';

const { width } = Dimensions.get('window');


// Helper: safely extract image URI from portfolio item (can be string or object)
function _img(item: any): string { if (!item) return ''; if (typeof item === 'string') return item; return item?.url || item?.secure_url || item?.uri || ''; }

export default function AllCreatorsScreen({ navigation }: any) {
  const [creators, setCreators] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [crRes, distRes] = await Promise.all([
        creatorsAPI.getAll(),
        api.get('/discover/districts').catch(() => ({ data: { data: [] } })),
      ]);
      setCreators(crRes.data?.creators || crRes.data?.data || []);
      setDistricts(distRes.data?.data || []);
    } catch {} finally { setLoading(false); }
  };

  // Filter creators by district and search
  const filtered = creators.filter(c => {
    const matchDistrict = !selectedDistrict || (c.city || '').toLowerCase().includes(selectedDistrict.toLowerCase()) || (c.location || '').toLowerCase().includes(selectedDistrict.toLowerCase());
    const matchQuery = !query || (c.user?.name || '').toLowerCase().includes(query.toLowerCase()) || (c.specialty || '').toLowerCase().includes(query.toLowerCase()) || (c.city || '').toLowerCase().includes(query.toLowerCase());
    return matchDistrict && matchQuery;
  });

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={st.title}>All Creators</Text><Text style={st.subtitle}>{filtered.length} creators available</Text></View>
      </View>

      {/* Search */}
      <View style={st.searchRow}>
        <Ionicons name="search" size={14} color="rgba(255,255,255,0.3)" />
        <TextInput style={st.searchInput} value={query} onChangeText={setQuery} placeholder="Search by name, city, category..." placeholderTextColor="rgba(255,255,255,0.25)" selectionColor="#FF8C2B" />
        {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" /></TouchableOpacity>}
      </View>

      {/* District Filter — Horizontal scroll with images */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.distScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        <TouchableOpacity style={[st.distCard, !selectedDistrict && st.distCardActive]} onPress={() => setSelectedDistrict('')}>
          <View style={st.distImgPlaceholder}><Ionicons name="grid-outline" size={16} color="#FF8C2B" /></View>
          <Text style={[st.distName, !selectedDistrict && st.distNameActive]}>All</Text>
        </TouchableOpacity>
        {districts.map((d: any) => (
          <TouchableOpacity key={d.name} style={[st.distCard, selectedDistrict === d.name && st.distCardActive]} onPress={() => setSelectedDistrict(selectedDistrict === d.name ? '' : d.name)}>
            {d.imageUrl ? <Image source={{ uri: d.imageUrl }} style={[st.distImg, selectedDistrict === d.name && st.distImgActive]} /> : <View style={st.distImgPlaceholder}><Ionicons name="location" size={16} color="#FF8C2B" /></View>}
            <Text style={[st.distName, selectedDistrict === d.name && st.distNameActive]}>{d.name}</Text>
            <Text style={st.distCount}>{d.creatorCount || 0} Creators</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Creator List */}
      {loading ? <ActivityIndicator size="large" color="#FF8C2B" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          keyExtractor={(item: any) => item._id}
          ListEmptyComponent={<View style={st.empty}><Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.08)" /><Text style={st.emptyTitle}>No creators found{selectedDistrict ? ` in ${selectedDistrict}` : ''}</Text><Text style={st.emptySub}>Try a different district or search term</Text></View>}
          renderItem={({ item }: any) => (
            <TouchableOpacity style={st.card} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.85}>
              <Image source={{ uri: _img(item.portfolio?.[0]) || item.user?.avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300' }} style={st.cardImg} />
              <View style={st.cardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={st.cardName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
                  {item.verified && <Ionicons name="checkmark-circle" size={12} color="#10B981" />}
                </View>
                <Text style={st.cardMeta}>{item.specialty || 'Photographer'} • {item.city || 'J&K'}</Text>
                {item.bio ? <Text style={st.cardBio} numberOfLines={2}>{item.bio}</Text> : null}
                <View style={st.cardRow}>
                  <Ionicons name="star" size={10} color="#FF8C2B" />
                  <Text style={st.cardRating}>{item.rating || '5.0'}</Text>
                  <Text style={st.cardReviews}>({item.reviewCount || 0} reviews)</Text>
                  {item.startingPrice > 0 && <Text style={st.cardPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}
                </View>
                <TouchableOpacity style={st.viewBtn} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
                  <Text style={st.viewBtnText}>View Profile</Text><Ionicons name="arrow-forward" size={12} color="#FF8C2B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 8, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, backgroundColor: '#F8F6FF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1F2937' },
  // Districts
  distScroll: { marginTop: 12, maxHeight: 90 },
  distCard: { alignItems: 'center', width: 65 },
  distCardActive: {},
  distImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#F1F5F9' },
  distImgPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.12)', alignItems: 'center', justifyContent: 'center' },
  distName: { fontSize: 9, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  distNameActive: { color: '#6C3BFF', fontWeight: '700' },
  distCount: { fontSize: 7, color: '#9CA3AF', textAlign: 'center', marginTop: 1 },
  distImgActive: { bordercolor: '#6C3BFF' },
  // Cards
  card: { backgroundColor: '#FAFAFA', borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardImg: { width: '100%', height: 140, resizeMode: 'cover' },
  cardBody: { padding: 12 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1 },
  cardMeta: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  cardBio: { fontSize: 10, color: '#9CA3AF', marginTop: 4, lineHeight: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cardRating: { fontSize: 11, color: '#6B7280' },
  cardReviews: { fontSize: 9, color: '#9CA3AF' },
  cardPrice: { fontSize: 11, fontWeight: '700', color: '#6C3BFF', marginLeft: 'auto' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,140,43,0.2)', backgroundColor: 'rgba(255,140,43,0.04)' },
  viewBtnText: { fontSize: 11, fontWeight: '600', color: '#6C3BFF' },
  // Empty
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyTitle: { fontSize: 13, color: '#9CA3AF', marginTop: 10 },
  emptySub: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 },
});
