import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Image,
  TouchableOpacity, Dimensions, Animated, Platform, ActivityIndicator,
  StatusBar, TextInput, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { creatorsAPI } from '../services/api';
import api from '../services/api';
import AppFooter from '../components/AppFooter';

const { width } = Dimensions.get('window');

// Hero wedding image — used as integrated background artwork
const HERO_IMAGE_URI = 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';

const CATEGORIES_DEFAULT = [
  { id: 'photography-videography', label: 'Photography', emoji: '📷', color: '#EEF2FF' },
  { id: 'videography', label: 'Videography', emoji: '🎥', color: '#FDF2F8' },
  { id: 'makeup-artists', label: 'Makeup Artists', emoji: '💄', color: '#FEF3C7' },
  { id: 'decoration-floral', label: 'Decoration', emoji: '🌸', color: '#ECFDF5' },
  { id: 'catering-services', label: 'Catering', emoji: '🍽️', color: '#FFF7ED' },
  { id: 'mehndi-artist', label: 'Mehndi Artists', emoji: '🤲', color: '#FFF1F2' },
  { id: 'venues', label: 'Venues', emoji: '🏛️', color: '#E0F2FE' },
  { id: 'djs-entertainment', label: 'DJ & Music', emoji: '🎧', color: '#F3E8FF' },
  { id: 'wedding-planners', label: 'Wedding Planners', emoji: '💍', color: '#F0FDF4' },
  { id: 'more', label: 'More', emoji: '•••', color: '#F9FAFB' },
];

// Smart number formatter: shows actual number below 1000, K+ format above
function formatStat(num: number): string {
  if (!num || num === 0) return '0';
  if (num < 1000) return String(num);
  if (num < 10000) return `${(num / 1000).toFixed(1)}K+`;
  return `${Math.floor(num / 1000)}K+`;
}

export default function HomeScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>(CATEGORIES_DEFAULT);
  const [stats, setStats] = useState({ creators: 0, bookings: 0, cities: 0, avgRating: 0 });
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [locationCity, setLocationCity] = useState('');
  const [locationArea, setLocationArea] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroConfig, setHeroConfig] = useState({ cashbackPercentage: 10, heroTitle: 'Your Dream Wedding,', heroTitleAccent: 'More Rewards!', heroSubtitle: 'Book verified wedding creators and get exciting cashback on every successful booking.', heroEyebrow: 'CELEBRATE BEAUTIFULLY. SAVE MORE.', heroCta1Text: 'Find Creator', heroCta2Text: 'Get Free Quote' });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;

  // Shine animation loop for cashback card
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(4000),
      Animated.timing(shineAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(shineAnim, { toValue: -1, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const loadData = useCallback(async () => {
    try {
      // Get user location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [addr] = await Location.reverseGeocodeAsync(loc.coords);
          if (addr) {
            setLocationArea(addr.name || addr.street || addr.subregion || '');
            setLocationCity(addr.city || addr.subregion || addr.region || '');
          }
        }
      } catch {}

      const [catsRes, statsRes, creatorsRes, homeConfigRes] = await Promise.all([
        api.get('/discover/categories?homepage=true').catch(() => ({ data: { data: [] } })),
        api.get('/live-stats').catch(() => ({ data: { stats: null } })),
        creatorsAPI.getAll().catch(() => ({ data: { data: [] } })),
        api.get('/homepage-config').catch(() => ({ data: { data: null } })),
      ]);

      // Hero config from admin panel
      if (homeConfigRes.data?.data) setHeroConfig(homeConfigRes.data.data);

      // Stats from DB
      const s = statsRes.data?.stats;
      if (s) {
        setStats({ creators: s.creators || 0, bookings: s.bookings || 0, cities: s.cities || 0, avgRating: s.avgRating || 0 });
      }

      // Categories from DB
      const dbCats = catsRes.data?.data || [];
      if (dbCats.length > 0) {
        // Map slug to icon/color for reliable matching
        const iconMap: Record<string, { icon: string; color: string }> = {
          'photography-videography': { icon: 'camera-outline', color: '#EEF2FF' },
          'videography': { icon: 'videocam-outline', color: '#FDF2F8' },
          'makeup-artists': { icon: 'color-palette-outline', color: '#FEF3C7' },
          'decoration-floral': { icon: 'flower-outline', color: '#ECFDF5' },
          'catering-services': { icon: 'restaurant-outline', color: '#FFF7ED' },
          'mehndi-artist': { icon: 'hand-left-outline', color: '#FFF1F2' },
          'venues': { icon: 'business-outline', color: '#E0F2FE' },
          'djs-entertainment': { icon: 'musical-notes-outline', color: '#F3E8FF' },
          'wedding-planners': { icon: 'clipboard-outline', color: '#F0FDF4' },
        };
        const mapped = dbCats.map((c: any) => {
          const slug = c.slug || c.name?.toLowerCase().replace(/\s+/g, '-');
          const match = iconMap[slug];
          return {
            id: slug,
            label: c.name?.length > 14 ? c.name.split(' ')[0] : c.name,
            icon: c.icon ? `${c.icon}${c.icon.includes('-outline') ? '' : '-outline'}` : (match?.icon || 'grid-outline'),
            color: match?.color || '#F3E8FF',
            count: c.creatorCount || 0,
          };
        });
        if (mapped.length > 9) mapped.splice(9, mapped.length - 9, { id: 'more', label: 'More', icon: 'ellipsis-horizontal', color: '#F9FAFB', count: 0 });
        setCategories(mapped.length > 0 ? mapped : CATEGORIES_DEFAULT);
      }

      // Top Creators
      const all = creatorsRes.data?.creators || creatorsRes.data?.data || [];
      const top = [...all].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
      setTopCreators(top);
    } catch {} finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const getCreatorImg = (item: any) => {
    const p = item.portfolio?.[0];
    if (p) return typeof p === 'string' ? p : (p.url || p.secure_url || '');
    return item.user?.avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300';
  };

  if (loading) return <View style={[st.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Animated.ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" colors={['#6C3BFF']} />} style={{ opacity: fadeAnim }}>

        {/* ═══ HEADER ═══ */}
        <View style={st.header}>
          <View style={st.hLeft}>
            <View style={st.logoBadge}><Ionicons name="aperture" size={16} color="#6C3BFF" /></View>
            <Text style={st.logoTxt}>BOOK<Text style={{ color: '#FF4FA3' }}>MYSHOT</Text></Text>
          </View>
          <View style={st.hRight}>
            <TouchableOpacity style={st.hIconBtn}><Ionicons name="notifications-outline" size={18} color="#1F2937" /><View style={st.notifDot} /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate(isAuthenticated ? 'Profile' : 'Account')}><Ionicons name="person-circle-outline" size={28} color="#6B7280" /></TouchableOpacity>
          </View>
        </View>

        {/* LOCATION */}
        <View style={st.locRow}>
          <Ionicons name="location" size={16} color="#6C3BFF" />
          <Text style={st.locText}>{locationArea ? `${locationArea}, ` : ''}{locationCity || 'Detecting...'}</Text>
          <Text style={st.locDrop}>▾</Text>
          <TouchableOpacity style={st.changeLoc}><Ionicons name="navigate-outline" size={11} color="#6C3BFF" /><Text style={st.changeLocT}>Change Location</Text></TouchableOpacity>
        </View>

        {/* SEARCH */}
        <View style={st.searchRow}>
          <View style={st.searchBar}>
            <Ionicons name="search" size={15} color="#9CA3AF" />
            <TextInput style={st.searchInput} placeholder="Search creators, services or anything..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => { if (searchQuery.length > 1) navigation.navigate('Discover', { search: searchQuery }); }} />
          </View>
          <TouchableOpacity style={st.filtersBtn} onPress={() => navigation.navigate('Discover')}>
            <Ionicons name="options" size={14} color="#fff" /><Text style={st.filtersBtnT}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ HERO BANNER — Image as integrated background artwork ═══ */}
        <View style={st.heroBanner}>
          {/* Layer 1: Full-bleed wedding image as background */}
          <Image source={{ uri: HERO_IMAGE_URI }} style={st.heroFullImg} resizeMode="cover" />

          {/* Layer 2: Soft dreamy overlay on entire image */}
          <View style={st.heroSoftOverlay} />

          {/* Layer 3: Strong left-to-right gradient for text readability */}
          <LinearGradient
            colors={['rgba(255,255,255,0.97)', 'rgba(255,255,255,0.9)', 'rgba(255,248,250,0.65)', 'rgba(255,240,245,0.2)', 'transparent']}
            locations={[0, 0.25, 0.45, 0.65, 0.85]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={st.heroContentOverlay}
          />

          {/* Layer 4: Bottom gradient for badge */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.8)']}
            style={st.heroBottomFade}
          />

          {/* Layer 5: Floating decorative petals */}
          <View style={[st.heroPetal, { top: 18, right: '20%', width: 10, height: 10, backgroundColor: 'rgba(244,180,0,0.3)' }]} />
          <View style={[st.heroPetal, { top: 50, right: '42%', width: 7, height: 7, backgroundColor: 'rgba(255,79,163,0.2)' }]} />
          <View style={[st.heroPetal, { top: 105, right: '14%', width: 6, height: 6, backgroundColor: 'rgba(244,180,0,0.25)' }]} />
          <View style={[st.heroPetal, { bottom: 95, right: '32%', width: 8, height: 8, backgroundColor: 'rgba(255,79,163,0.15)' }]} />
          <View style={[st.heroPetal, { bottom: 60, left: '36%', width: 6, height: 6, backgroundColor: 'rgba(244,180,0,0.2)' }]} />
          <View style={[st.heroPetal, { top: 145, right: '25%', width: 5, height: 5, backgroundColor: 'rgba(255,192,203,0.35)' }]} />

          {/* Layer 6: Left text content */}
          <View style={st.heroTextBlock}>
            <Text style={st.heroEyebrowText}>{heroConfig.heroEyebrow}</Text>
            <Text style={st.heroMainTitle}>{heroConfig.heroTitle}</Text>
            <Text style={st.heroPinkTitle}>{heroConfig.heroTitleAccent}</Text>
            <Text style={st.heroDescription}>{heroConfig.heroSubtitle}</Text>

            {/* Premium Cashback Badge — compact luxury design */}
            <View style={st.heroCashbackPill}>
              <View style={st.heroCashbackIconCircle}>
                <Ionicons name="gift-outline" size={14} color="#D4860A" />
              </View>
              <View style={{ marginLeft: 6 }}>
                <Text style={st.heroCbLabel}>Up to</Text>
                <Text style={st.heroCbValue}>{heroConfig.cashbackPercentage}%<Text style={st.heroCbWord}> Cashback</Text></Text>
                <Text style={st.heroCbLabel}>On Every Booking</Text>
              </View>
              {/* Shine sweep */}
              <Animated.View style={[st.heroShine, { transform: [{ translateX: shineAnim.interpolate({ inputRange: [-1, 1], outputRange: [-60, 120] }) }] }]} />
            </View>

            <View style={st.heroButtonRow}>
              <TouchableOpacity style={st.heroFindBtn} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
                <Ionicons name="search" size={14} color="#fff" />
                <Text style={st.heroFindBtnText}>{heroConfig.heroCta1Text}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.heroQuoteBtn} onPress={() => navigation.navigate('Inquiry')} activeOpacity={0.85}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#374151" />
                <Text style={st.heroQuoteBtnText}>{heroConfig.heroCta2Text}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ═══ STATS ═══ */}
        <View style={st.statsRow}>
          {[
            { icon: 'people-outline', val: formatStat(stats.creators), label: 'Trusted Creators', c: '#6C3BFF' },
            { icon: 'calendar-outline', val: formatStat(stats.bookings), label: 'Bookings Done', c: '#FF4FA3' },
            { icon: 'location-outline', val: stats.cities > 0 ? `${stats.cities}+` : '0', label: 'Cities Covered', c: '#10B981' },
            { icon: 'star-outline', val: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '0', label: 'Average Rating', c: '#F4B400' },
          ].map((s, i) => (
            <View key={i} style={st.stat}><Ionicons name={s.icon as any} size={20} color={s.c} /><Text style={st.statVal}>{s.val}</Text><Text style={st.statLbl}>{s.label}</Text></View>
          ))}
        </View>

        {/* ═══ CATEGORIES ═══ */}
        <View style={st.secHead}><Text style={st.secTitle}>Browse Categories</Text><TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={st.viewAll}>View All →</Text></TouchableOpacity></View>
        <View style={st.catGrid}>
          {categories.slice(0, 10).map(cat => (
            <TouchableOpacity key={cat.id} style={st.catCard} onPress={() => cat.id === 'more' ? navigation.navigate('Discover') : navigation.navigate('SubCategories', { slug: cat.id, name: cat.label, icon: 'grid' })} activeOpacity={0.7}>
              <View style={[st.catIconWrap, { backgroundColor: cat.color }]}><Ionicons name={cat.icon as any} size={20} color="#6C3BFF" /></View>
              <Text style={st.catName}>{cat.label}</Text>
              {cat.count > 0 && <Text style={st.catCount}>{cat.count}+ Creators</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ TOP CREATORS ═══ */}
        {topCreators.length > 0 && (
          <View>
            <View style={st.secHead}><Text style={st.secTitle}>🔥 Top Creators Near You</Text><TouchableOpacity onPress={() => navigation.navigate('Near Me')}><Text style={st.viewAll}>View All →</Text></TouchableOpacity></View>
            <FlatList horizontal showsHorizontalScrollIndicator={false} data={topCreators.slice(0, 6)} contentContainerStyle={{ paddingHorizontal: 16 }} keyExtractor={i => i._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={st.tcCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.8}>
                  <Image source={{ uri: getCreatorImg(item) }} style={st.tcImg} />
                  <View style={st.tcOnline}><View style={st.tcGreenDot} /><Text style={st.tcOnlineT}>Online</Text></View>
                  <View style={st.tcRating}><Text style={st.tcRatingT}>{item.rating || '4.9'} ⭐</Text></View>
                  <TouchableOpacity style={st.tcHeart}><Ionicons name="heart-outline" size={16} color="#9CA3AF" /></TouchableOpacity>
                  <View style={st.tcInfo}>
                    <Text style={st.tcName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
                    <Text style={st.tcSpec}>{item.specialty || 'Photographer'} • {item.experience || '5+'} Years</Text>
                    <View style={st.tcMeta}><Ionicons name="location" size={9} color="#6C3BFF" /><Text style={st.tcMetaT}>{(Math.random() * 3 + 0.5).toFixed(1)} km away</Text></View>
                    <Text style={st.tcPrice}>Starts from ₹{(item.startingPrice || item.budgetMin || 25000).toLocaleString('en-IN')}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ═══ BENEFITS ═══ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.benefitsRow}>
          {[{ i: 'shield-checkmark', l: 'Verified Creators', s: '100% Verified', c: '#10B981' }, { i: 'pricetag', l: 'Best Prices', s: 'Compare & Save', c: '#FF4FA3' }, { i: 'time', l: 'Real-time\nAvailability', s: 'Book Instantly', c: '#6C3BFF' }, { i: 'headset', l: '24/7 Support', s: "We're here to help", c: '#F4B400' }].map((b, i) => (
            <View key={i} style={st.benefit}><Ionicons name={b.i as any} size={18} color={b.c} /><Text style={st.benefitL}>{b.l}</Text><Text style={st.benefitS}>{b.s}</Text></View>
          ))}
        </ScrollView>

        {/* ═══ OFFER BANNER — Clean, readable ═══ */}
        <View style={st.offerWrap}>
          <LinearGradient colors={['#6C3BFF', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.offer}>
            <Text style={{ fontSize: 28 }}>🎁</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.offerTitle}>More Bookings, More Cashback!</Text>
              <Text style={st.offerSub}>The more you book, the more you earn.</Text>
            </View>
            <View style={st.offerBadge}>
              <Text style={st.offerBadgeLabel}>Special Offer</Text>
              <Text style={st.offerBadgeValue}>Upto {heroConfig.cashbackPercentage}%</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ═══ CASHBACK WALLET QUICK ACCESS ═══ */}
        {isAuthenticated && (
          <TouchableOpacity style={st.walletQuick} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.8}>
            <Ionicons name="wallet-outline" size={20} color="#6C3BFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.walletQuickTitle}>My Cashback Wallet</Text>
              <Text style={st.walletQuickSub}>View balance, history & earn rewards</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* ═══ FOOTER ═══ */}
        <AppFooter navigation={navigation} />
      </Animated.ScrollView>
    </View>
  );
}


const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 6 },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  logoTxt: { fontSize: 15, fontWeight: '800', color: '#1F2937', letterSpacing: 0.5 },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hIconBtn: { position: 'relative' },
  notifDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4FA3', borderWidth: 1.5, bordercolor: '#1F2937' },
  // Location
  locRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 6, gap: 4 },
  locText: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  locDrop: { fontSize: 10, color: '#6B7280', marginRight: 8 },
  changeLoc: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#6C3BFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  changeLocT: { fontSize: 9, fontWeight: '600', color: '#6C3BFF' },
  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  searchInput: { flex: 1, fontSize: 12, color: '#1F2937' },
  filtersBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 14, height: 44 },
  filtersBtnT: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  // ═══ HERO — Image as integrated full background ═══
  heroBanner: { marginHorizontal: 0, marginTop: 10, overflow: 'hidden', height: 380, position: 'relative' },
  heroFullImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', zIndex: 0, opacity: 0.85 },
  heroSoftOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 1 },
  heroContentOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  heroBottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, zIndex: 2 },
  heroPetal: { position: 'absolute', borderRadius: 50, zIndex: 3 },
  heroTextBlock: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '64%', paddingTop: 30, paddingLeft: 26, paddingBottom: 26, paddingRight: 8, justifyContent: 'center', zIndex: 4 },
  heroEyebrowText: { fontSize: 9, fontWeight: '700', color: '#7C3AED', letterSpacing: 1.5, marginBottom: 10 },
  heroMainTitle: { fontSize: 25, fontWeight: '800', color: '#111827', lineHeight: 32, marginBottom: 2 },
  heroPinkTitle: { fontSize: 29, fontWeight: '900', color: '#FF4FA3', lineHeight: 36, marginBottom: 12 },
  heroDescription: { fontSize: 13.5, fontWeight: '600', color: '#1F2937', lineHeight: 21, marginBottom: 18, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  heroCashbackPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.2, borderColor: '#F5C542', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start', marginBottom: 16, elevation: 4, shadowColor: '#F5C542', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, overflow: 'hidden' },
  heroCashbackIconCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(245,197,66,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroCbLabel: { fontSize: 9, fontWeight: '500', color: '#8B7355' },
  heroCbValue: { fontSize: 20, fontWeight: '900', color: '#D4860A', lineHeight: 24 },
  heroCbWord: { fontSize: 12, fontWeight: '600', color: '#B8860B' },
  heroShine: { position: 'absolute', top: 0, width: 20, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ skewX: '-15deg' }] },
  heroButtonRow: { flexDirection: 'row', gap: 12 },
  heroFindBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6C3BFF', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, elevation: 4, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 },
  heroFindBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  heroQuoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: '#D1D5DB', paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  heroQuoteBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  // Stats
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 28, gap: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: '#F8F6FF', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#EDE9FE', elevation: 1, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  statVal: { fontSize: 15, fontWeight: '800', color: '#1F2937', marginTop: 6 },
  statLbl: { fontSize: 8.5, color: '#6B7280', marginTop: 3, textAlign: 'center', fontWeight: '500' },
  // Sections
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 30, marginBottom: 14 },
  secTitle: { fontSize: 17, fontWeight: '800', color: '#1F2937' },
  viewAll: { fontSize: 11, fontWeight: '600', color: '#6C3BFF' },
  // Categories — 5-column grid (matches reference)
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  catCard: { width: (width - 24 - 32) / 5, alignItems: 'center', paddingVertical: 14 },
  catIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catName: { fontSize: 9.5, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  catCount: { fontSize: 8, color: '#374151', marginTop: 2, fontWeight: '500' },
  // Top Creators — clean white cards, no overlays
  tcCard: { width: 160, borderRadius: 16, overflow: 'hidden', marginRight: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  tcImg: { width: '100%', height: 110, resizeMode: 'cover' },
  tcOnline: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, elevation: 1 },
  tcGreenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  tcOnlineT: { fontSize: 7, color: '#1F2937', fontWeight: '600' },
  tcRating: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, elevation: 1 },
  tcRatingT: { fontSize: 8, color: '#1F2937', fontWeight: '700' },
  tcHeart: { position: 'absolute', top: 84, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  tcInfo: { padding: 10, backgroundColor: '#fff' },
  tcName: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  tcSpec: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  tcMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  tcMetaT: { fontSize: 9, color: '#6B7280' },
  tcPrice: { fontSize: 10, fontWeight: '700', color: '#1F2937', marginTop: 4 },
  // Benefits
  benefitsRow: { paddingHorizontal: 16, paddingVertical: 18, gap: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 20 },
  benefit: { alignItems: 'center', width: 80, gap: 4 },
  benefitL: { fontSize: 9, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  benefitS: { fontSize: 7, color: '#6B7280', textAlign: 'center' },
  // Offer
  offerWrap: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  offer: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  offerTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  offerSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  offerBadge: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  offerBadgeLabel: { fontSize: 8, fontWeight: '600', color: '#6C3BFF' },
  offerBadgeValue: { fontSize: 13, fontWeight: '800', color: '#1F2937', marginTop: 1 },
  // Wallet Quick Access
  walletQuick: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE9FE' },
  walletQuickTitle: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  walletQuickSub: { fontSize: 10, color: '#6B7280', marginTop: 1 },
});
