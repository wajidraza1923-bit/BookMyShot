import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  FlatList, Image, TouchableOpacity, Dimensions, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../theme';
import { creatorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.75;
const SMALL_CARD_W = width * 0.42;

// ═══ ANIMATED COUNTER ═══
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1800;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(timer); }
      else setVal(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <Text style={s.statNum}>{val.toLocaleString('en-IN')}{suffix}</Text>;
}

export default function HomeScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes, featuredRes, configRes] = await Promise.all([
        creatorsAPI.getAll(),
        api.get('/promotions/featured-status').catch(() => ({ data: { slots: {} } })),
        api.get('/app-config').catch(() => ({ data: { categories: [] } })),
      ]);

      const allCreators = creatorsRes.data?.creators || creatorsRes.data?.data || [];
      if (configRes.data?.categories?.length) setCategories(configRes.data.categories);

      // Featured from promotion slots
      const slots = featuredRes.data?.slots || {};
      const featuredIds: string[] = [];
      const ordered: any[] = [];
      for (const key of ['featured_1', 'featured_2', 'featured_3', 'featured_4']) {
        const slot = slots[key];
        if (slot?.occupied && slot?.creatorId) {
          featuredIds.push(slot.creatorId.toString());
          const c = allCreators.find((x: any) => x._id?.toString() === slot.creatorId?.toString());
          if (c) ordered.push({ ...c, _featured: true });
        }
      }
      setFeaturedCreators(ordered);
      setCreators(allCreators.filter((c: any) => !featuredIds.includes(c._id?.toString())));
    } catch {}
    finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 9 }),
      ]).start();
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const topRated = [...creators].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}>

        {/* ═══ HEADER ═══ */}
        <View style={s.header}>
          <Text style={s.logo}>BOOKMYSHOT</Text>
          {isAuthenticated ? (
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="notifications-outline" size={19} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.loginPill} onPress={() => navigation.navigate('Account')}>
              <Text style={s.loginPillText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ HERO STATS ═══ */}
        <Animated.View style={[s.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.heroTitle}>India's Premium{'\n'}Creator Marketplace</Text>
          <Text style={s.heroSub}>Find verified photographers, videographers{'\n'}& creative professionals for your events.</Text>
          <View style={s.statsRow}>
            <View style={s.statItem}><AnimatedCounter end={10000} suffix="+" /><Text style={s.statLabel}>Creators</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><AnimatedCounter end={5000} suffix="+" /><Text style={s.statLabel}>Bookings</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><AnimatedCounter end={100} suffix="+" /><Text style={s.statLabel}>Cities</Text></View>
          </View>
        </Animated.View>

        {/* ═══ SEARCH BAR ═══ */}
        <TouchableOpacity style={s.searchBar} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
          <View style={s.searchIconWrap}><Ionicons name="search" size={16} color={colors.primary} /></View>
          <Text style={s.searchPlaceholder}>Search creators, cities, styles...</Text>
          <View style={s.searchFilter}><Ionicons name="options-outline" size={15} color={colors.textMuted} /></View>
        </TouchableOpacity>

        {/* ═══ FEATURED CREATORS ═══ */}
        {featuredCreators.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.sectionRow}>
              <View><Text style={s.sectionLabel}>FEATURED</Text><Text style={s.sectionTitle}>Premium Creators</Text></View>
              <TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.viewAll}>View All</Text></TouchableOpacity>
            </View>
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={featuredCreators}
              contentContainerStyle={{ paddingHorizontal: spacing.xl }}
              keyExtractor={i => i._id}
              renderItem={({ item }) => <CreatorCard item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} featured />}
            />
          </Animated.View>
        )}

        {/* ═══ TOP RATED ═══ */}
        {topRated.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.sectionRow}>
              <View><Text style={s.sectionLabel}>TOP RATED</Text><Text style={s.sectionTitle}>Highest Reviewed</Text></View>
              <TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.viewAll}>See All</Text></TouchableOpacity>
            </View>
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={topRated}
              contentContainerStyle={{ paddingHorizontal: spacing.xl }}
              keyExtractor={i => i._id}
              renderItem={({ item }) => <SmallCreatorCard item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} />}
            />
          </Animated.View>
        )}

        {/* ═══ ALL CREATORS ═══ */}
        {creators.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.sectionRow}>
              <View><Text style={s.sectionLabel}>DISCOVER</Text><Text style={s.sectionTitle}>All Creators</Text></View>
              <TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.viewAll}>Browse</Text></TouchableOpacity>
            </View>
            {creators.slice(0, 4).map(item => (
              <CreatorListCard key={item._id} item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} />
            ))}
          </Animated.View>
        )}

        {/* ═══ WHY BOOKMYSHOT ═══ */}
        <View style={s.trustSection}>
          <Text style={s.trustTitle}>Why BookMyShot?</Text>
          <View style={s.trustGrid}>
            <TrustPill icon="shield-checkmark" text="Verified Creators" />
            <TrustPill icon="card" text="Secure Payments" />
            <TrustPill icon="star" text="Genuine Reviews" />
            <TrustPill icon="flash" text="Instant Booking" />
          </View>
        </View>

        {/* ═══ CTA ═══ */}
        {!isAuthenticated && (
          <View style={s.ctaBanner}>
            <Text style={s.ctaTitle}>Are you a creator?</Text>
            <Text style={s.ctaSub}>Join 10,000+ verified professionals. Get discovered.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Account')} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Join Now</Text><Ionicons name="arrow-forward" size={14} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ═══ CREATOR CARD (Featured Carousel) ═══
function CreatorCard({ item, onPress, featured }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 1.03, useNativeDriver: true, tension: 300, friction: 10 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity style={s.fCard} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600' }} style={s.fCardImg} />
        <View style={s.fCardGradient} />
        <View style={s.fCardContent}>
          {featured && <View style={s.fBadge}><Ionicons name="star" size={9} color="#000" /><Text style={s.fBadgeText}>FEATURED</Text></View>}
          <View style={s.fCardInfo}>
            <Text style={s.fCardName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
            <Text style={s.fCardMeta}>{item.specialty || 'Photographer'} • {item.city || 'India'}</Text>
            <View style={s.fCardRow}>
              <View style={s.ratingPill}><Ionicons name="star" size={10} color={colors.primary} /><Text style={s.ratingVal}>{item.rating || '5.0'}</Text></View>
              {item.startingPrice > 0 && <Text style={s.fCardPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══ SMALL CARD (Top Rated) ═══
function SmallCreatorCard({ item, onPress }: any) {
  return (
    <TouchableOpacity style={s.sCard} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: item.user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={s.sCardAvatar} />
      <Text style={s.sCardName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
      <Text style={s.sCardSpec}>{item.specialty || 'Photo'}</Text>
      <View style={s.sCardRating}><Ionicons name="star" size={10} color={colors.primary} /><Text style={s.sCardRatingText}>{item.rating || '5.0'}</Text></View>
    </TouchableOpacity>
  );
}

// ═══ LIST CARD (All Creators) ═══
function CreatorListCard({ item, onPress }: any) {
  return (
    <TouchableOpacity style={s.lCard} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: item.user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={s.lCardAvatar} />
      <View style={s.lCardInfo}>
        <Text style={s.lCardName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
        <Text style={s.lCardMeta}>{item.specialty || 'Photographer'} • {item.city || 'India'}</Text>
        <View style={s.lCardRow}>
          <View style={s.ratingPill}><Ionicons name="star" size={9} color={colors.primary} /><Text style={s.ratingVal}>{item.rating || '5.0'}</Text></View>
          {item.startingPrice > 0 && <Text style={s.lCardPrice}>from ₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function TrustPill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.trustPill}>
      <Ionicons name={icon as any} size={16} color={colors.primary} />
      <Text style={s.trustPillText}>{text}</Text>
    </View>
  );
}

const defaultCategories = [
  { id: 'wedding', icon: '💒', label: 'Wedding', count: 4200 },
  { id: 'photography', icon: '📷', label: 'Photography', count: 2300 },
  { id: 'videography', icon: '🎬', label: 'Videography', count: 1800 },
  { id: 'drone', icon: '🚁', label: 'Drone', count: 600 },
  { id: 'makeup', icon: '💄', label: 'Makeup', count: 900 },
  { id: 'prewedding', icon: '💑', label: 'Pre-Wedding', count: 1500 },
];

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: Platform.OS === 'ios' ? 56 : spacing['4xl'], paddingBottom: spacing.sm },
  logo: { fontSize: 15, fontWeight: '300', color: colors.primary, letterSpacing: 5 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  loginPill: { paddingHorizontal: spacing.lg, paddingVertical: 7, backgroundColor: colors.primary, borderRadius: 20 },
  loginPillText: { ...typography.labelSm, color: '#000', fontWeight: '700' },
  // Hero
  heroSection: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  heroTitle: { fontSize: 26, fontWeight: '700', color: colors.text, lineHeight: 34, letterSpacing: -0.5 },
  heroSub: { ...typography.bodyMd, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 22 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.xl, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48 },
  searchIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  searchPlaceholder: { flex: 1, ...typography.bodyMd, color: colors.textMuted },
  searchFilter: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  // Sections
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: spacing.md },
  sectionLabel: { ...typography.caption, color: colors.primary, letterSpacing: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 1 },
  viewAll: { ...typography.labelMd, color: colors.primary },
  // Categories
  catChip: { alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginRight: spacing.sm, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, minWidth: 80 },
  catIcon: { fontSize: 22, marginBottom: spacing.xs },
  catLabel: { ...typography.labelSm, color: colors.text, fontWeight: '500' },
  catCount: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  // Featured Card
  fCard: { width: CARD_W, height: 180, borderRadius: 18, overflow: 'hidden', marginRight: spacing.md, ...shadows.md },
  fCardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  fCardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', backgroundColor: 'transparent', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, ...Platform.select({ android: { backgroundColor: 'rgba(0,0,0,0.5)' }, ios: { backgroundColor: 'rgba(0,0,0,0.45)' } }) },
  fCardContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: spacing.md },
  fBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  fBadgeText: { fontSize: 8, fontWeight: '800', color: '#000', letterSpacing: 0.8 },
  fCardInfo: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: spacing.sm + 2, backdropFilter: 'blur(10px)' },
  fCardName: { ...typography.headlineSm, color: '#fff', fontSize: 14 },
  fCardMeta: { ...typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  fCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  fCardPrice: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingVal: { ...typography.labelSm, color: 'rgba(255,255,255,0.8)' },
  // Small Card
  sCard: { width: SMALL_CARD_W, alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  sCardAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.borderGold, marginBottom: spacing.sm },
  sCardName: { ...typography.labelMd, color: colors.text, textAlign: 'center' },
  sCardSpec: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  sCardRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.sm },
  sCardRatingText: { ...typography.labelSm, color: colors.textSecondary },
  // List Card
  lCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  lCardAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: colors.borderGold },
  lCardInfo: { flex: 1, marginLeft: spacing.md },
  lCardName: { ...typography.headlineSm, color: colors.text, fontSize: 14 },
  lCardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  lCardRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.md },
  lCardPrice: { ...typography.caption, color: colors.primary },
  // Trust
  trustSection: { paddingHorizontal: spacing.xl, marginTop: spacing['3xl'] },
  trustTitle: { ...typography.headlineMd, color: colors.text, marginBottom: spacing.lg },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  trustPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  trustPillText: { ...typography.labelSm, color: colors.textSecondary },
  // CTA
  ctaBanner: { marginHorizontal: spacing.xl, marginTop: spacing['3xl'], backgroundColor: 'rgba(212,175,55,0.04)', borderWidth: 1, borderColor: colors.borderGold, borderRadius: 18, padding: spacing.xl, alignItems: 'center' },
  ctaTitle: { ...typography.headlineMd, color: colors.primary },
  ctaSub: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 12 },
  ctaBtnText: { ...typography.labelLg, color: '#000', fontWeight: '700' },
});
