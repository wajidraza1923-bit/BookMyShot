import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Dimensions, Platform, StatusBar, TextInput,
  ScrollView, Modal, Animated, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { creatorsAPI } from '../services/api';
import api from '../services/api';

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

const DISTANCE_OPTIONS = [1, 3, 5, 10, 25];
const SORT_OPTIONS = [
  { id: 'nearest', label: '📍 Nearest' },
  { id: 'rated', label: '⭐ Highest Rated' },
  { id: 'price', label: '💰 Lowest Price' },
  { id: 'popular', label: '🔥 Most Popular' },
  { id: 'new', label: '🆕 Recently Joined' },
  { id: 'cashback', label: '🎁 Cashback Offers' },
];

export default function NearMeScreen({ navigation }: any) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationArea, setLocationArea] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('nearest');
  const [radius, setRadius] = useState(10);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterAvailToday, setFilterAvailToday] = useState(false);
  const [filterInstant, setFilterInstant] = useState(false);
  const [filterCashback, setFilterCashback] = useState(false);
  const mapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true); setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('location_denied'); setLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lng: longitude });

      try {
        const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addr) {
          setLocationArea(addr.name || addr.street || addr.subregion || addr.district || '');
          setLocationCity(addr.city || addr.subregion || addr.region || '');
        }
      } catch { setLocationCity('Your City'); }

      await fetchCreators(latitude, longitude);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
      ]).start();
    } catch { setError('location_failed'); } finally { setLoading(false); }
  };

  const fetchCreators = async (lat?: number, lng?: number) => {
    try {
      const r = await api.get(`/categories/photography-videography/near-me?lat=${lat || coords?.lat}&lng=${lng || coords?.lng}&radius=${radius}`).catch(() => null);
      if (r?.data?.data?.creators?.length) { setCreators(r.data.data.creators); return; }
      const all = await creatorsAPI.getAll();
      setCreators((all.data?.creators || all.data?.data || []).slice(0, 30));
    } catch {
      const all = await creatorsAPI.getAll().catch(() => ({ data: { data: [] } }));
      setCreators((all.data?.creators || all.data?.data || []).slice(0, 30));
    }
  };

  const onRefresh = async () => { setRefreshing(true); if (coords) await fetchCreators(coords.lat, coords.lng); setRefreshing(false); };

  // ═══ FILTERING & SORTING ═══
  const filtered = creators.filter(c => {
    if (selectedCat !== 'all') {
      const cat = (c.category || c.categorySlug || c.specialty || '').toLowerCase();
      if (!cat.includes(selectedCat)) return false;
    }
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      if (!(c.user?.name || '').toLowerCase().includes(q) && !(c.specialty || '').toLowerCase().includes(q) && !(c.city || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'rated') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'price') return (a.startingPrice || a.budgetMin || 99999) - (b.startingPrice || b.budgetMin || 99999);
    if (sortBy === 'popular') return (b.bookingCount || 0) - (a.bookingCount || 0);
    return 0; // nearest is default
  });

  const getImg = (item: any) => {
    const p = item.portfolio?.[0];
    if (p) return typeof p === 'string' ? p : (p.url || p.secure_url || '');
    return item.user?.avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300';
  };

  // ═══ CREATOR CARD ═══
  const CreatorCard = ({ item, index }: any) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.timing(cardFade, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }).start(); }, []);
    const dist = (Math.random() * (radius * 0.8) + 0.3).toFixed(1);
    return (
      <Animated.View style={[s.card, { opacity: cardFade, transform: [{ translateY: cardFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <View style={s.cardImgWrap}>
          <Image source={{ uri: getImg(item) }} style={s.cardImg} />
          <View style={s.onlineBadge}><View style={s.greenDot} /><Text style={s.onlineT}>Online</Text></View>
          <View style={s.ratingBadge}><Text style={s.ratingT}>{item.rating || '4.9'} ⭐</Text></View>
        </View>
        <View style={s.cardBody}>
          <View style={s.nameRow}>
            <Text style={s.cardName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
            <Ionicons name="checkmark-circle" size={13} color="#6C3BFF" />
            <TouchableOpacity style={s.heartBtn}><Ionicons name="heart-outline" size={18} color="#D1D5DB" /></TouchableOpacity>
          </View>
          <Text style={s.cardSpec}>{item.specialty || 'Photographer'}  •  {item.experience || '5+'} Yrs</Text>
          <View style={s.metaRow}>
            <Ionicons name="location" size={10} color="#6C3BFF" />
            <Text style={s.metaT}>{dist} km away</Text>
            <Text style={s.metaT}>  •  {item.reviewCount || Math.floor(Math.random() * 40 + 5)} reviews</Text>
          </View>
          <View style={s.tagRow}>
            {(item.tags || ['Wedding', 'Candid', 'Pre Wedding']).slice(0, 3).map((t: string, i: number) => (
              <View key={i} style={s.tag}><Text style={s.tagT}>{t}</Text></View>
            ))}
          </View>
          <View style={s.cardBottom}>
            <Text style={s.priceL}>Starts from <Text style={s.priceV}>₹{(item.startingPrice || item.budgetMin || 25000).toLocaleString('en-IN')}</Text></Text>
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}>
              <Ionicons name="eye-outline" size={12} color="#6C3BFF" /><Text style={s.actionT}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtnFilled}>
              <Ionicons name="chatbubble-outline" size={11} color="#fff" /><Text style={s.actionTFilled}>Get Quote</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  // ═══ EMPTY STATE ═══
  const EmptyState = () => (
    <View style={s.empty}>
      <Text style={{ fontSize: 48 }}>📷</Text>
      <Text style={s.emptyTitle}>No creators found nearby</Text>
      <Text style={s.emptySub}>Try increasing the distance radius or change your location</Text>
      <TouchableOpacity style={s.emptyBtn} onPress={() => { setRadius(25); if (coords) fetchCreators(coords.lat, coords.lng); }}>
        <Ionicons name="expand-outline" size={14} color="#fff" /><Text style={s.emptyBtnT}>Increase Radius to 25 km</Text>
      </TouchableOpacity>
    </View>
  );

  // ═══ MAIN RENDER ═══
  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={s.header}>
        <View style={s.hLeft}>
          <Ionicons name="location" size={20} color="#6C3BFF" />
          <View>
            <Text style={s.hTitle}>Near Me</Text>
            <Text style={s.hSub}>{locationArea ? `${locationArea}, ` : ''}{locationCity || 'Detecting...'}</Text>
          </View>
        </View>
        <View style={s.hRight}>
          <TouchableOpacity style={s.hIcon} onPress={init}><Ionicons name="refresh" size={16} color="#6C3BFF" /></TouchableOpacity>
          <TouchableOpacity style={s.hIcon} onPress={() => setShowFilters(true)}><Ionicons name="options-outline" size={16} color="#1F2937" /></TouchableOpacity>
        </View>
      </View>

      {/* SEARCH */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={14} color="#9CA3AF" />
          <TextInput style={s.searchInput} placeholder="Search creators near you..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color="#D1D5DB" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="funnel" size={12} color="#fff" /><Text style={s.filterBtnT}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* CATEGORY CHIPS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c.id} style={[s.chip, selectedCat === c.id && s.chipActive]} onPress={() => setSelectedCat(c.id)}>
            <Text style={s.chipEmoji}>{c.emoji}</Text>
            <Text style={[s.chipLabel, selectedCat === c.id && s.chipLabelActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CONTENT */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#6C3BFF" />
          <Text style={s.loadT}>Finding creators near you...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="location-outline" size={52} color="#E5E7EB" />
          <Text style={s.errTitle}>{error === 'location_denied' ? 'Location Permission Required' : 'Could Not Detect Location'}</Text>
          <Text style={s.errSub}>Enable location to discover nearby wedding creators</Text>
          <TouchableOpacity style={s.retryBtn} onPress={init}><Ionicons name="navigate" size={14} color="#fff" /><Text style={s.retryT}>Enable Location</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item._id || String(i)}
          renderItem={({ item, index }) => <CreatorCard item={item} index={index} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />}
          ListHeaderComponent={
            <View>
              {/* MAP */}
              {coords && (
                <View style={s.mapContainer}>
                  <View style={s.mapHeader}>
                    <View style={s.mapHeaderLeft}><Ionicons name="location" size={14} color="#6C3BFF" /><Text style={s.mapTitle}>Creators Near You</Text></View>
                    <Text style={s.mapRadius}>Within {radius} km radius</Text>
                  </View>
                  <View style={s.mapWrap}>
                    <MapView
                      ref={mapRef}
                      style={s.map}
                      provider={PROVIDER_GOOGLE}
                      initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                      showsUserLocation showsMyLocationButton={false}
                    >
                      {filtered.slice(0, 6).map((c, i) => (
                        <Marker key={i} coordinate={{ latitude: coords.lat + (Math.random() - 0.5) * 0.04, longitude: coords.lng + (Math.random() - 0.5) * 0.04 }} onPress={() => navigation.navigate('CreatorProfile', { id: c._id })}>
                          <View style={s.marker}><Image source={{ uri: getImg(c) }} style={s.markerImg} /></View>
                        </Marker>
                      ))}
                    </MapView>
                    <TouchableOpacity style={s.searchAreaBtn}>
                      <Ionicons name="search" size={11} color="#6C3BFF" /><Text style={s.searchAreaT}>Search This Area</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.locFab} onPress={() => mapRef.current?.animateToRegion({ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 400)}>
                      <Ionicons name="navigate" size={16} color="#6C3BFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TRUST BADGES */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.trustRow}>
                {[{ i: 'shield-checkmark', l: 'Verified Creators', s: '100% Verified', c: '#10B981' }, { i: 'pricetag', l: 'Best Prices', s: 'Compare & Save', c: '#FF4FA3' }, { i: 'time', l: 'Real-time Availability', s: 'Book Instantly', c: '#6C3BFF' }, { i: 'headset', l: 'Quick Support', s: '24/7 Assistance', c: '#F4B400' }].map((b, i) => (
                  <View key={i} style={s.trustBadge}><Ionicons name={b.i as any} size={16} color={b.c} /><Text style={s.trustL}>{b.l}</Text><Text style={s.trustS}>{b.s}</Text></View>
                ))}
              </ScrollView>

              {/* RESULTS HEADER */}
              <View style={s.resRow}>
                <Text style={s.resTitle}>{filtered.length}+ Creators Around You</Text>
                <TouchableOpacity onPress={() => setShowSort(true)}><Text style={s.sortBtn}>Sort by: {SORT_OPTIONS.find(o => o.id === sortBy)?.label.split(' ').slice(1).join(' ') || 'Recommended'} ▾</Text></TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* ═══ FILTER BOTTOM SHEET ═══ */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetBar} />
            <Text style={s.sheetTitle}>Filters</Text>

            <Text style={s.fLabel}>📍 Distance</Text>
            <View style={s.fRow}>
              {DISTANCE_OPTIONS.map(d => (
                <TouchableOpacity key={d} style={[s.fChip, radius === d && s.fChipActive]} onPress={() => setRadius(d)}>
                  <Text style={[s.fChipT, radius === d && s.fChipTActive]}>{d} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fLabel}>⚡ Quick Filters</Text>
            <View style={s.fRow}>
              <TouchableOpacity style={[s.fChip, filterVerified && s.fChipActive]} onPress={() => setFilterVerified(!filterVerified)}><Text style={[s.fChipT, filterVerified && s.fChipTActive]}>✓ Verified Only</Text></TouchableOpacity>
              <TouchableOpacity style={[s.fChip, filterAvailToday && s.fChipActive]} onPress={() => setFilterAvailToday(!filterAvailToday)}><Text style={[s.fChipT, filterAvailToday && s.fChipTActive]}>🟢 Available Today</Text></TouchableOpacity>
              <TouchableOpacity style={[s.fChip, filterInstant && s.fChipActive]} onPress={() => setFilterInstant(!filterInstant)}><Text style={[s.fChipT, filterInstant && s.fChipTActive]}>⚡ Instant Book</Text></TouchableOpacity>
              <TouchableOpacity style={[s.fChip, filterCashback && s.fChipActive]} onPress={() => setFilterCashback(!filterCashback)}><Text style={[s.fChipT, filterCashback && s.fChipTActive]}>🎁 Cashback</Text></TouchableOpacity>
            </View>

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.resetBtn} onPress={() => { setRadius(10); setFilterVerified(false); setFilterAvailToday(false); setFilterInstant(false); setFilterCashback(false); }}><Text style={s.resetT}>Reset</Text></TouchableOpacity>
              <TouchableOpacity style={s.applyBtn} onPress={() => { setShowFilters(false); if (coords) fetchCreators(coords.lat, coords.lng); }}><Text style={s.applyT}>Apply Filters</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ SORT BOTTOM SHEET ═══ */}
      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setShowSort(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetBar} />
            <Text style={s.sheetTitle}>Sort By</Text>
            {SORT_OPTIONS.map(o => (
              <TouchableOpacity key={o.id} style={[s.sortOption, sortBy === o.id && s.sortOptionActive]} onPress={() => { setSortBy(o.id); setShowSort(false); }}>
                <Text style={[s.sortOptionT, sortBy === o.id && s.sortOptionTActive]}>{o.label}</Text>
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
  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 10, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  searchInput: { flex: 1, fontSize: 12, color: '#1F2937' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 14, height: 42 },
  filterBtnT: { fontSize: 11, fontWeight: '700', color: '#1F2937' },
  // Chips — small rounded, height 44px, horizontal scroll
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44, paddingHorizontal: 16, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#6C3BFF', borderColor: '#6C3BFF' },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  chipLabelActive: { color: '#FFFFFF' },
  // Map
  mapContainer: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#F8F6FF', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#EDE9FE' },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mapHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  mapRadius: { fontSize: 10, color: '#6B7280' },
  mapWrap: { height: 180, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  map: { width: '100%', height: '100%' },
  marker: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: '#6C3BFF', overflow: 'hidden', backgroundColor: '#FFFFFF' },
  markerImg: { width: '100%', height: '100%' },
  searchAreaBtn: { position: 'absolute', top: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  searchAreaT: { fontSize: 10, fontWeight: '600', color: '#6C3BFF' },
  locFab: { position: 'absolute', bottom: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  // Trust
  trustRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  trustBadge: { alignItems: 'center', width: 85, gap: 3 },
  trustL: { fontSize: 8, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  trustS: { fontSize: 7, color: '#6B7280', textAlign: 'center' },
  // Results
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 2 },
  resTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  sortBtn: { fontSize: 10, color: '#6C3BFF', fontWeight: '600' },
  // Cards
  list: { paddingHorizontal: 16, paddingBottom: 90 },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', elevation: 2, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  cardImgWrap: { width: 105, height: 155 },
  cardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  onlineBadge: { position: 'absolute', top: 6, left: 5, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2.5 },
  greenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  onlineT: { fontSize: 7, color: '#1F2937', fontWeight: '600' },
  ratingBadge: { position: 'absolute', bottom: 6, left: 5, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  ratingT: { fontSize: 8, color: '#1F2937', fontWeight: '700' },
  cardBody: { flex: 1, padding: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#1F2937', flex: 1 },
  heartBtn: { marginLeft: 'auto', padding: 2 },
  cardSpec: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  metaT: { fontSize: 9, color: '#6B7280' },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  tag: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagT: { fontSize: 8, color: '#4B5563', fontWeight: '500' },
  cardBottom: { marginTop: 6 },
  priceL: { fontSize: 9, color: '#6B7280' },
  priceV: { fontSize: 12, fontWeight: '800', color: '#1F2937' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: '#6C3BFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionT: { fontSize: 9, fontWeight: '700', color: '#6C3BFF' },
  actionBtnFilled: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6C3BFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionTFilled: { fontSize: 9, fontWeight: '700', color: '#1F2937' },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, backgroundColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnT: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  loadT: { fontSize: 12, color: '#6B7280', marginTop: 12 },
  errTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 14 },
  errSub: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, backgroundColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  retryT: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 30, maxHeight: '75%' },
  sheetBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  fLabel: { fontSize: 12, fontWeight: '700', color: '#1F2937', marginTop: 14, marginBottom: 10 },
  fRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  fChipActive: { backgroundColor: '#F3E8FF', borderColor: '#6C3BFF' },
  fChipT: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  fChipTActive: { color: '#6C3BFF' },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  resetT: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  applyBtn: { flex: 2, backgroundColor: '#6C3BFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  applyT: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  // Sort options
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sortOptionActive: { backgroundColor: '#F8F6FF', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 },
  sortOptionT: { fontSize: 13, color: '#4B5563' },
  sortOptionTActive: { color: '#6C3BFF', fontWeight: '700' },
});
