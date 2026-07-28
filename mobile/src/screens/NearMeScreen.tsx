/**
 * NearMe Screen — Service Area Based Discovery
 * No GPS dependency. Uses customer's saved city/district.
 * Location selector dropdown for manual change.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Dimensions, Platform, StatusBar, TextInput,
  ScrollView, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

  // Wishlist toggle
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const toggleWishlist = (id: string) => {
    setWishlist(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    // TODO: sync with backend
  };

  // ═══ PREMIUM CREATOR CARD ═══
  const CreatorCard = ({ item }: any) => {
    const portfolioCount = (item.portfolio || []).length;
    const isSaved = wishlist.has(item._id);
    return (
      <View style={s.card}>
        {/* Image Section */}
        <View style={s.cardImgWrap}>
          <Image source={{ uri: getImg(item) }} style={s.cardImg} />
          {/* Badges overlay */}
          <View style={s.badgeRow}>
            {item.verified && <View style={s.badge}><Ionicons name="shield-checkmark" size={9} color="#fff" /><Text style={s.badgeText}>Verified</Text></View>}
            {item.featured && <View style={[s.badge, { backgroundColor: '#F59E0B' }]}><Ionicons name="star" size={9} color="#fff" /><Text style={s.badgeText}>Featured</Text></View>}
          </View>
          {/* Wishlist heart */}
          <TouchableOpacity style={s.heartBtn} onPress={() => toggleWishlist(item._id)}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? '#EF4444' : '#fff'} />
          </TouchableOpacity>
          {/* Portfolio count */}
          {portfolioCount > 0 && <View style={s.portfolioCount}><Ionicons name="images" size={9} color="#fff" /><Text style={s.portfolioCountText}>{portfolioCount}</Text></View>}
        </View>

        {/* Body */}
        <TouchableOpacity style={s.cardBody} activeOpacity={0.85} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
          {/* Name + Verified */}
          <View style={s.nameRow}>
            <Text style={s.cardName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
            {item.verified && <Ionicons name="checkmark-circle" size={14} color="#7C3AED" />}
          </View>

          {/* Specialty + Experience */}
          <Text style={s.cardSpec}>{item.specialty || 'Photographer'}{item.experience ? ` • ${item.experience} Yrs` : ''}</Text>

          {/* Location + Service Areas */}
          <View style={s.locationRow}>
            <Ionicons name="location" size={10} color="#7C3AED" />
            <Text style={s.locationText}>{item.baseCity || item.city || '—'}</Text>
            {item.serviceAreas && item.serviceAreas.length > 1 && <Text style={s.moreAreas}>+{item.serviceAreas.length - 1} areas</Text>}
          </View>

          {/* Stats Row: Rating, Reviews, Bookings */}
          <View style={s.statsRow}>
            <View style={s.statItem}><Text style={s.statValue}>⭐ {item.rating || '5.0'}</Text><Text style={s.statLabel}>{item.reviewCount || 0} reviews</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Text style={s.statValue}>{item.weddingsCount || 0}</Text><Text style={s.statLabel}>Bookings</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Text style={s.statValue}>₹{((item.budgetMin || 10000) / 1000).toFixed(0)}k</Text><Text style={s.statLabel}>Starts at</Text></View>
          </View>

          {/* Tags: Cashback, Available */}
          <View style={s.tagRow}>
            {item.cashbackPercent > 0 && <View style={s.tag}><Text style={s.tagText}>🎁 {item.cashbackPercent}% Cashback</Text></View>}
            <View style={[s.tag, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}><Text style={[s.tagText, { color: '#166534' }]}>✓ Available</Text></View>
          </View>

          {/* CTA Row */}
          <View style={s.ctaRow}>
            <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
              <Text style={s.ctaBtnText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ctaSecondary} onPress={() => navigation.navigate('Inquiry', { creatorId: item._id, creatorName: item.user?.name })}>
              <Ionicons name="chatbubble-outline" size={12} color="#7C3AED" />
              <Text style={s.ctaSecondaryText}>Get Quote</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
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
          {CATEGORIES.map(c => {
            const isActive = selectedCat === c.id;
            return (
              <TouchableOpacity key={c.id} activeOpacity={0.8} onPress={() => { setSelectedCat(c.id); fetchCreators(selectedCity, selectedDistrict, selectedState); }}>
                {isActive ? (
                  <LinearGradient colors={['#7C3AED', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.chipGradient}>
                    <Text style={s.chipEmojiActive}>{c.emoji}</Text>
                    <Text style={s.chipLabelActive}>{c.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={s.chip}>
                    <Text style={s.chipEmoji}>{c.emoji}</Text>
                    <Text style={s.chipLabel}>{c.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CREATOR LIST — directly below chips, no flex container */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: 20 }}><ActivityIndicator size="large" color="#6C3BFF" /><Text style={s.loadT}>Finding creators...</Text></View>
          ) : filtered.length > 0 ? (
            <>
              <Text style={s.resTitle}>{filtered.length} Creator{filtered.length !== 1 ? 's' : ''} in {selectedCity || selectedDistrict || 'your area'}</Text>
              {filtered.map(item => <CreatorCard key={item._id} item={item} />)}
            </>
          ) : (
            <View style={s.empty}>
              <Ionicons name="search-outline" size={44} color="#E5E7EB" />
              <Text style={s.emptyTitle}>No creators found</Text>
              <Text style={s.emptySub}>Try selecting a different location or expanding your search</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => { loadStates(); setPickerStep('state'); setShowLocationPicker(true); }}>
                <Ionicons name="location-outline" size={14} color="#fff" /><Text style={s.emptyBtnT}>Change Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

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
  chipRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, minWidth: 90, paddingHorizontal: 18, borderRadius: 23, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, minWidth: 90, paddingHorizontal: 20, borderRadius: 23, elevation: 5, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8 },
  chipEmoji: { fontSize: 14 },
  chipEmojiActive: { fontSize: 14 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  chipLabelActive: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  // Results
  resTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  // Premium Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', elevation: 3, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
  cardImgWrap: { position: 'relative', width: '100%', height: 160 },
  cardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeRow: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#7C3AED', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  heartBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  portfolioCount: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  portfolioCountText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  cardBody: { padding: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1 },
  cardSpec: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  locationText: { fontSize: 11, color: '#7C3AED', fontWeight: '500' },
  moreAreas: { fontSize: 9, color: '#9CA3AF', marginLeft: 4 },
  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  statLabel: { fontSize: 9, color: '#9CA3AF', marginTop: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: '#F3F4F6' },
  // Tags
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  tagText: { fontSize: 9, fontWeight: '600', color: '#92400E' },
  // CTA
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ctaBtn: { flex: 1, backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  ctaBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1, borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 10, paddingVertical: 10 },
  ctaSecondaryText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  // Empty
  empty: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginTop: 14 },
  emptySub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#7C3AED', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnT: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  // Loading
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
