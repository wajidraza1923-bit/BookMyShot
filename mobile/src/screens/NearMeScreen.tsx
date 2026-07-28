/**
 * NearMe Screen — Service Area Based Discovery
 * No GPS dependency. Uses customer's saved city/district.
 * Location selector dropdown for manual change.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Dimensions, Platform, StatusBar, TextInput,
  ScrollView, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { creatorsAPI } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useServiceLocation } from '../context/LocationContext';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🔍' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
  { id: 'videography', label: 'Videography', emoji: '🎥' },
  { id: 'makeup', label: 'Makeup', emoji: '💄' },
  { id: 'decoration', label: 'Decor', emoji: '🌸' },
  { id: 'dj', label: 'DJ', emoji: '🎤' },
  { id: 'catering', label: 'Catering', emoji: '🍽' },
  { id: 'planner', label: 'Planner', emoji: '💍' },
  { id: 'venues', label: 'Venue', emoji: '🏛' },
];

const SORT_OPTIONS = [
  { id: 'nearest', label: '📍 Service Area Match' },
  { id: 'rated', label: '⭐ Highest Rated' },
  { id: 'price', label: '💰 Lowest Price' },
  { id: 'bookings', label: '🔥 Most Booked' },
  { id: 'newest', label: '🆕 Recently Joined' },
  { id: 'featured', label: '✨ Featured' },
];

export default function NearMeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { location: savedLocation, setLocation: saveLocation } = useServiceLocation();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCity, setSelectedCity] = useState(savedLocation.city || '');
  const [selectedDistrict, setSelectedDistrict] = useState(savedLocation.district || '');
  const [selectedState, setSelectedState] = useState(savedLocation.state || '');
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('nearest');
  // Location picker data
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [pickerState, setPickerState] = useState('');
  const [pickerDistrict, setPickerDistrict] = useState('');
  const [pickerCity, setPickerCity] = useState('');
  const [pickerStep, setPickerStep] = useState<'state' | 'district' | 'city'>('state');

  // Load saved location on mount (from shared context)
  useEffect(() => {
    if (savedLocation.district || savedLocation.city) {
      setSelectedCity(savedLocation.city || '');
      setSelectedDistrict(savedLocation.district || '');
      setSelectedState(savedLocation.state || '');
      fetchCreators(savedLocation.city, savedLocation.district, savedLocation.state);
    } else {
      setLoading(false);
      setShowLocationPicker(true);
      loadStates();
    }
  }, []);

  const fetchCreators = async (city?: string, district?: string, state?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (city) params.city = city;
      if (district) params.district = district;
      if (state) params.state = state;
      if (selectedCat !== 'all') params.category = selectedCat;
      if (sortBy !== 'nearest') params.sort = sortBy;

      const res = await api.get('/discovery/creators-by-area', { params });
      setCreators(res.data?.creators || []);
      console.log(`[NearMe] Found ${res.data?.count || 0} creators in ${city || district || state}`);
    } catch (e: any) {
      console.log('[NearMe] Fetch error:', e.message);
      // Fallback to all creators
      try {
        const all = await creatorsAPI.getAll();
        setCreators(all.data?.creators || []);
      } catch { setCreators([]); }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCreators(selectedCity, selectedDistrict, selectedState);
    setRefreshing(false);
  };

  // Location picker
  const loadStates = async () => {
    try {
      const res = await api.get('/discovery/states');
      setStates(res.data?.states || []);
    } catch {}
  };
  const loadDistricts = async (state: string) => {
    try {
      const res = await api.get('/discovery/districts', { params: { state } });
      setDistricts(res.data?.districts || []);
    } catch {}
  };
  const loadCities = async (district: string) => {
    try {
      const res = await api.get('/discovery/cities', { params: { district: district, state: pickerState } });
      setCities(res.data?.cities || []);
    } catch {}
  };

  const selectState = (s: string) => { setPickerState(s); setPickerStep('district'); loadDistricts(s); };
  const selectDistrict = (d: string) => { setPickerDistrict(d); setPickerStep('city'); loadCities(d); };
  const selectCity = async (c: string) => {
    setPickerCity(c);
    setSelectedCity(c);
    setSelectedDistrict(pickerDistrict);
    setSelectedState(pickerState);
    setShowLocationPicker(false);
    // Save to shared context (syncs with Home)
    await saveLocation({ city: c, district: pickerDistrict, state: pickerState });
    fetchCreators(c, pickerDistrict, pickerState);
  };

  // Filter by search
  const filtered = creators.filter(c => {
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      return (c.user?.name || '').toLowerCase().includes(q) ||
        (c.specialty || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.serviceAreas || []).some((a: string) => a.toLowerCase().includes(q));
    }
    return true;
  });

  const getImg = (item: any) => {
    if (item.coverImage) return item.coverImage;
    const p = item.portfolio?.[0];
    if (p) return typeof p === 'string' ? p : (p.url || '');
    return item.user?.avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300';
  };

  // ═══ CREATOR CARD ═══
  const CreatorCard = ({ item }: any) => (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
      <Image source={{ uri: getImg(item) }} style={s.cardImg} />
      <View style={s.cardBody}>
        <View style={s.nameRow}>
          <Text style={s.cardName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
          {item.verified && <Ionicons name="checkmark-circle" size={13} color="#6C3BFF" />}
          {item.featured && <Ionicons name="star" size={11} color="#F59E0B" />}
        </View>
        <Text style={s.cardSpec}>{item.specialty || 'Photographer'}</Text>
        <View style={s.locationRow}>
          <Ionicons name="location" size={10} color="#6C3BFF" />
          <Text style={s.locationText}>{item.baseCity || item.city || '—'}</Text>
        </View>
        {item.serviceAreas && item.serviceAreas.length > 0 && (
          <View style={s.serviceRow}>
            <Text style={s.servingLabel}>Serving: </Text>
            <Text style={s.servingAreas} numberOfLines={1}>{item.serviceAreas.slice(0, 3).join(', ')}{item.serviceAreas.length > 3 ? ` +${item.serviceAreas.length - 3}` : ''}</Text>
          </View>
        )}
        <View style={s.cardBottom}>
          <Text style={s.ratingText}>⭐ {item.rating || '5.0'}</Text>
          <Text style={s.priceText}>₹{(item.budgetMin || 10000).toLocaleString('en-IN')}+</Text>
        </View>
        <TouchableOpacity style={s.bookBtn} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
          <Text style={s.bookBtnText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={s.header}>
        <View style={s.hLeft}>
          <Ionicons name="location" size={20} color="#6C3BFF" />
          <View>
            <Text style={s.hTitle}>Near Me</Text>
            <Text style={s.hSub}>{selectedCity || selectedDistrict || 'Select Location'}</Text>
          </View>
        </View>
        <View style={s.hRight}>
          <TouchableOpacity style={s.hIcon} onPress={onRefresh}><Ionicons name="refresh" size={16} color="#6C3BFF" /></TouchableOpacity>
        </View>
      </View>

      {/* SERVICE LOCATION SELECTOR */}
      <TouchableOpacity style={s.locSelector} onPress={() => { loadStates(); setPickerStep('state'); setShowLocationPicker(true); }}>
        <Ionicons name="navigate-circle" size={18} color="#6C3BFF" />
        <Text style={s.locText}>{selectedCity ? `${selectedCity}, ${selectedDistrict}` : 'Select your service location'}</Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {/* SEARCH */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={14} color="#9CA3AF" />
          <TextInput style={s.searchInput} placeholder="Search city, district or creator..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={setSearchQuery} returnKeyType="search" onSubmitEditing={() => { if (searchQuery.length >= 2) fetchCreators(searchQuery, searchQuery, ''); }} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => { setSearchQuery(''); fetchCreators(selectedCity, selectedDistrict, selectedState); }}><Ionicons name="close-circle" size={16} color="#D1D5DB" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={s.sortBtn} onPress={() => setShowSort(true)}>
          <Ionicons name="swap-vertical" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CATEGORY CHIPS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c.id} style={[s.chip, selectedCat === c.id && s.chipActive]} onPress={() => { setSelectedCat(c.id); fetchCreators(selectedCity, selectedDistrict, selectedState); }}>
            <Text style={s.chipEmoji}>{c.emoji}</Text>
            <Text style={[s.chipLabel, selectedCat === c.id && s.chipLabelActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CONTENT */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /><Text style={s.loadT}>Finding creators...</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item._id || String(i)}
          renderItem={({ item }) => <CreatorCard item={item} />}
          contentContainerStyle={filtered.length === 0 ? { paddingHorizontal: 16, paddingTop: 4 } : s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />}
          ListHeaderComponent={filtered.length > 0 ?
            <Text style={s.resTitle}>{filtered.length} Creator{filtered.length !== 1 ? 's' : ''} in {selectedCity || selectedDistrict || 'your area'}</Text>
            : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="search-outline" size={44} color="#E5E7EB" />
              <Text style={s.emptyTitle}>No creators found</Text>
              <Text style={s.emptySub}>Try selecting a different location or expanding your search</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => { loadStates(); setPickerStep('state'); setShowLocationPicker(true); }}>
                <Ionicons name="location-outline" size={14} color="#fff" /><Text style={s.emptyBtnT}>Change Location</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ═══ LOCATION PICKER MODAL ═══ */}
      <Modal visible={showLocationPicker} transparent animationType="slide" onRequestClose={() => setShowLocationPicker(false)}>
        <View style={s.modalBg}>
          <View style={s.sheet}>
            <View style={s.sheetBar} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>
                {pickerStep === 'state' ? 'Select State' : pickerStep === 'district' ? 'Select District' : 'Select City'}
              </Text>
              {pickerStep !== 'state' && (
                <TouchableOpacity onPress={() => setPickerStep(pickerStep === 'city' ? 'district' : 'state')}>
                  <Text style={s.backLink}>← Back</Text>
                </TouchableOpacity>
              )}
            </View>

            {pickerStep === 'state' && (
              <ScrollView style={s.pickerList}>
                {states.length === 0 ? <ActivityIndicator color="#6C3BFF" style={{ marginTop: 20 }} /> :
                  states.map(st => (
                    <TouchableOpacity key={st} style={s.pickerItem} onPress={() => selectState(st)}>
                      <Text style={s.pickerItemText}>{st}</Text>
                      <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            )}
            {pickerStep === 'district' && (
              <ScrollView style={s.pickerList}>
                <Text style={s.pickerSub}>{pickerState}</Text>
                {districts.length === 0 ? <ActivityIndicator color="#6C3BFF" style={{ marginTop: 20 }} /> :
                  districts.map(d => (
                    <TouchableOpacity key={d} style={s.pickerItem} onPress={() => selectDistrict(d)}>
                      <Text style={s.pickerItemText}>{d}</Text>
                      <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            )}
            {pickerStep === 'city' && (
              <ScrollView style={s.pickerList}>
                <Text style={s.pickerSub}>{pickerState} → {pickerDistrict}</Text>
                {cities.length === 0 ? <ActivityIndicator color="#6C3BFF" style={{ marginTop: 20 }} /> :
                  cities.map(c => (
                    <TouchableOpacity key={c} style={s.pickerItem} onPress={() => selectCity(c)}>
                      <Ionicons name="location" size={14} color="#6C3BFF" />
                      <Text style={[s.pickerItemText, { marginLeft: 8 }]}>{c}</Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            )}

            <TouchableOpacity style={s.sheetClose} onPress={() => setShowLocationPicker(false)}>
              <Text style={s.sheetCloseT}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══ SORT MODAL ═══ */}
      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setShowSort(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetBar} />
            <Text style={s.sheetTitle}>Sort By</Text>
            {SORT_OPTIONS.map(o => (
              <TouchableOpacity key={o.id} style={[s.sortOption, sortBy === o.id && s.sortOptionActive]} onPress={() => { setSortBy(o.id); setShowSort(false); fetchCreators(selectedCity, selectedDistrict, selectedState); }}>
                <Text style={[s.sortOptionT, sortBy === o.id && { color: '#6C3BFF', fontWeight: '700' }]}>{o.label}</Text>
                {sortBy === o.id && <Ionicons name="checkmark-circle" size={18} color="#6C3BFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 8 },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hTitle: { fontSize: 17, fontWeight: '800', color: '#1F2937' },
  hSub: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  hRight: { flexDirection: 'row', gap: 8 },
  hIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  // Location Selector
  locSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, backgroundColor: '#F8F6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EDE9FE' },
  locText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1F2937' },
  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 10, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  searchInput: { flex: 1, fontSize: 12, color: '#1F2937' },
  sortBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  // Chips
  chipRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40, minWidth: 90, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#6C3BFF', borderColor: '#6C3BFF' },
  chipEmoji: { fontSize: 13 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  chipLabelActive: { color: '#FFFFFF' },
  // Results
  resTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937', paddingHorizontal: 4, paddingBottom: 4 },
  // Card
  list: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 90 },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', elevation: 2, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  cardImg: { width: 100, height: 150, resizeMode: 'cover' },
  cardBody: { flex: 1, padding: 10, justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#1F2937', flex: 1 },
  cardSpec: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  locationText: { fontSize: 10, color: '#6C3BFF', fontWeight: '500' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  servingLabel: { fontSize: 9, color: '#9CA3AF' },
  servingAreas: { fontSize: 9, color: '#6B7280', fontWeight: '500', flex: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  ratingText: { fontSize: 10, color: '#1F2937', fontWeight: '600' },
  priceText: { fontSize: 11, fontWeight: '700', color: '#1F2937' },
  bookBtn: { marginTop: 6, backgroundColor: '#6C3BFF', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  bookBtnText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  // Empty
  empty: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, backgroundColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnT: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  // Loading
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadT: { fontSize: 12, color: '#6B7280', marginTop: 12 },
  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '80%' },
  sheetBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  backLink: { fontSize: 12, color: '#6C3BFF', fontWeight: '600' },
  sheetClose: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  sheetCloseT: { fontSize: 13, color: '#9CA3AF' },
  // Picker
  pickerList: { maxHeight: 400 },
  pickerSub: { fontSize: 11, color: '#9CA3AF', marginBottom: 8, fontWeight: '500' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerItemText: { fontSize: 14, color: '#1F2937' },
  // Sort
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sortOptionActive: { backgroundColor: '#F8F6FF', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 },
  sortOptionT: { fontSize: 14, color: '#4B5563' },
});
