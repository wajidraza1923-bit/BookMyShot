import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  FlatList, Image, TouchableOpacity, Dimensions, Animated, Platform, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../theme';
import { creatorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.78;
const SMALL_CARD = (width - spacing.xl * 2 - spacing.sm) / 2;

// Wedding stock images for hero
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
  'https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=800',
];

// ═══ ANIMATED COUNTER ═══
function Counter({ end, suffix = '+' }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0; const step = Math.ceil(end / 60);
    const t = setInterval(() => { n += step; if (n >= end) { setVal(end); clearInterval(t); } else setVal(n); }, 25);
    return () => clearInterval(t);
  }, [end]);
  return <Text style={s.counterNum}>{val.toLocaleString('en-IN')}{suffix}</Text>;
}

// ═══ SHIMMER LOGO ═══
function ShimmerLogo() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View>
      <Text style={s.logo}>BOOKMYSHOT</Text>
      <Animated.View style={[s.shimmerOverlay, { transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-100, 200] }) }] }]} />
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes, featuredRes] = await Promise.all([
        creatorsAPI.getAll(),
        api.get('/promotions/featured-status').catch(() => ({ data: { slots: {} } })),
      ]);
      const all = creatorsRes.data?.creators || creatorsRes.data?.data || [];
      const slots = featuredRes.data?.slots || {};
      const fIds: string[] = [];
      const ordered: any[] = [];
      for (const k of ['featured_1', 'featured_2', 'featured_3', 'featured_4']) {
        const sl = slots[k];
        if (sl?.occupied && sl?.creatorId) {
          fIds.push(sl.creatorId.toString());
          const c = all.find((x: any) => x._id?.toString() === sl.creatorId?.toString());
          if (c) ordered.push(c);
        }
      }
      setFeatured(ordered);
      setCreators(all.filter((c: any) => !fIds.includes(c._id?.toString())));
    } catch {}
    finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
      ]).start();
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };
  const topRated = [...creators].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5B942" colors={['#F5B942']} />}>

        {/* ═══ HEADER ═══ */}
        <View style={s.header}>
          <ShimmerLogo />
          {isAuthenticated ? (
            <TouchableOpacity style={s.headerIcon} onPress={() => navigation.navigate('Profile')}><Ionicons name="notifications-outline" size={18} color="#fff" /></TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.signInBtn} onPress={() => navigation.navigate('Account')}><Text style={s.signInText}>Sign In</Text></TouchableOpacity>
          )}
        </View>

        {/* ═══ HERO ═══ */}
        <Animated.View style={[s.heroWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Image source={{ uri: HERO_IMAGES[0] }} style={s.heroImg} blurRadius={1} />
          <View style={s.heroOverlay} />
          <View style={s.heroContent}>
            <Text style={s.heroLabel}>PREMIUM WEDDING MARKETPLACE</Text>
            <Text style={s.heroTitle}>Discover India's{'\n'}Best Wedding Creators</Text>
            <Text style={s.heroSub}>Verified photographers, videographers, drone operators & filmmakers for your special day.</Text>
            <TouchableOpacity style={s.heroCta} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
              <Ionicons name="search" size={16} color="#000" />
              <Text style={s.heroCtaText}>Find Your Creator</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ═══ STATS ═══ */}
        <Animated.View style={[s.statsCard, { opacity: fadeAnim }]}>
          <View style={s.statItem}><Counter end={10000} /><Text style={s.statLabel}>Creators</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Counter end={5000} /><Text style={s.statLabel}>Weddings</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Counter end={100} /><Text style={s.statLabel}>Cities</Text></View>
        </Animated.View>

        {/* ═══ FEATURED CREATORS ═══ */}
        {featured.length > 0 && (
          <>
            <SectionHead label="FEATURED" title="Premium Wedding Creators" onViewAll={() => navigation.navigate('Discover')} />
            <FlatList horizontal showsHorizontalScrollIndicator={false} data={featured} contentContainerStyle={{ paddingHorizontal: spacing.xl }} keyExtractor={i => i._id}
              renderItem={({ item }) => <LuxuryCard item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} badge="FEATURED" />} />
          </>
        )}

        {/* ═══ TOP RATED ═══ */}
        {topRated.length > 0 && (
          <>
            <SectionHead label="TOP RATED" title="Highest Reviewed Creators" onViewAll={() => navigation.navigate('Discover')} />
            <FlatList horizontal showsHorizontalScrollIndicator={false} data={topRated} contentContainerStyle={{ paddingHorizontal: spacing.xl }} keyExtractor={i => i._id}
              renderItem={({ item }) => <LuxuryCard item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} />} />
          </>
        )}

        {/* ═══ ALL CREATORS GRID ═══ */}
        {creators.length > 0 && (
          <>
            <SectionHead label="DISCOVER" title="All Wedding Creators" onViewAll={() => navigation.navigate('Discover')} />
            <View style={s.gridWrap}>
              {creators.slice(0, 4).map(item => <GridCard key={item._id} item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} />)}
            </View>
          </>
        )}

        {/* ═══ WHY BOOKMYSHOT ═══ */}
        <View style={s.whySection}>
          <Text style={s.whyTitle}>Why Choose BookMyShot?</Text>
          <View style={s.whyGrid}>
            <WhyCard icon="shield-checkmark" title="Verified Professionals" desc="Every creator is verified for quality" color="#10B981" />
            <WhyCard icon="lock-closed" title="Secure Inquiries" desc="Your data is always protected" color="#3B82F6" />
            <WhyCard icon="star" title="Real Reviews" desc="Genuine feedback from real clients" color="#F59E0B" />
            <WhyCard icon="flash" title="Fast Response" desc="Average reply within 2 hours" color="#8B5CF6" />
          </View>
        </View>

        {/* ═══ TESTIMONIAL ═══ */}
        <View style={s.testimonialCard}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#F5B942" />
          <Text style={s.testimonialText}>"BookMyShot helped us find the most amazing photographer for our wedding. The experience was seamless and the quality was beyond expectations!"</Text>
          <Text style={s.testimonialAuthor}>— Priya & Rahul, Mumbai</Text>
        </View>

        {/* ═══ CTA BANNER ═══ */}
        {!isAuthenticated && (
          <View style={s.ctaBanner}>
            <Text style={s.ctaEmoji}>📸</Text>
            <Text style={s.ctaTitle}>Are you a wedding creator?</Text>
            <Text style={s.ctaSub}>Join 10,000+ verified professionals. Get discovered by couples planning their dream wedding.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Account')} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Join as Creator</Text>
              <Ionicons name="arrow-forward" size={14} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ FOOTER ═══ */}
        <View style={s.footer}>
          <Text style={s.footerLogo}>BOOKMYSHOT</Text>
          <Text style={s.footerDesc}>India's Premium Wedding Creator Marketplace</Text>
          <View style={s.footerLinks}>
            <Text style={s.footerLink}>About</Text>
            <Text style={s.footerDot}>•</Text>
            <Text style={s.footerLink}>Privacy</Text>
            <Text style={s.footerDot}>•</Text>
            <Text style={s.footerLink}>Terms</Text>
            <Text style={s.footerDot}>•</Text>
            <Text style={s.footerLink}>Contact</Text>
          </View>
          <View style={s.socialRow}>
            <Ionicons name="logo-instagram" size={18} color="#F5B942" />
            <Ionicons name="logo-facebook" size={18} color="#F5B942" />
            <Ionicons name="logo-youtube" size={18} color="#F5B942" />
            <Ionicons name="logo-linkedin" size={18} color="#F5B942" />
            <Ionicons name="logo-twitter" size={18} color="#F5B942" />
          </View>
          <Text style={s.footerCopy}>© 2026 BookMyShot. All Rights Reserved.</Text>
          <Text style={s.footerVersion}>v2.0.0</Text>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

// ═══ LUXURY CREATOR CARD ═══
function LuxuryCard({ item, onPress, badge }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: spacing.md }}>
      <TouchableOpacity style={s.luxCard} onPress={onPress} activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 1.03, useNativeDriver: true, tension: 300, friction: 10 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}>
        <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || HERO_IMAGES[1] }} style={s.luxImg} />
        <View style={s.luxGradient} />
        <View style={s.luxContent}>
          <View style={s.luxBadgeRow}>
            {badge && <View style={s.luxBadge}><Ionicons name="star" size={8} color="#000" /><Text style={s.luxBadgeText}>{badge}</Text></View>}
            {item.verified && <View style={s.verifiedDot}><Ionicons name="checkmark" size={9} color="#fff" /></View>}
          </View>
          <View style={s.luxInfo}>
            <Text style={s.luxName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
            <Text style={s.luxMeta}>{item.specialty || 'Wedding Photography'} • {item.city || 'India'}</Text>
            <View style={s.luxBottom}>
              <View style={s.luxRating}><Ionicons name="star" size={11} color="#F5B942" /><Text style={s.luxRatingText}>{item.rating || '5.0'}</Text><Text style={s.luxReviews}>({item.reviewCount || 0})</Text></View>
              {item.startingPrice > 0 && <Text style={s.luxPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══ GRID CARD ═══
function GridCard({ item, onPress }: any) {
  return (
    <TouchableOpacity style={s.gridCard} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: item.user?.avatar || HERO_IMAGES[2] }} style={s.gridAvatar} />
      <Text style={s.gridName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
      <Text style={s.gridSpec}>{item.specialty || 'Photography'}</Text>
      <View style={s.gridRating}><Ionicons name="star" size={10} color="#F5B942" /><Text style={s.gridRatingText}>{item.rating || '5.0'}</Text></View>
      <Text style={s.gridCity}>{item.city || 'India'}</Text>
    </TouchableOpacity>
  );
}

// ═══ SECTION HEAD ═══
function SectionHead({ label, title, onViewAll }: any) {
  return (
    <View style={s.sectionHead}>
      <View><Text style={s.sectionLabel}>{label}</Text><Text style={s.sectionTitle}>{title}</Text></View>
      <TouchableOpacity onPress={onViewAll}><Text style={s.viewAll}>View All →</Text></TouchableOpacity>
    </View>
  );
}

// ═══ WHY CARD ═══
function WhyCard({ icon, title, desc, color }: any) {
  return (
    <View style={s.whyCard}>
      <View style={[s.whyIcon, { backgroundColor: color + '15' }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={s.whyCardTitle}>{title}</Text>
      <Text style={s.whyCardDesc}>{desc}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060504' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingBottom: spacing.sm },
  logo: { fontSize: 16, fontWeight: '300', color: '#F5B942', letterSpacing: 6 },
  shimmerOverlay: { position: 'absolute', top: 0, left: 0, width: 60, height: '100%', backgroundColor: 'rgba(255,200,50,0.15)', transform: [{ skewX: '-20deg' }] },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  signInBtn: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#F5B942', borderRadius: 20 },
  signInText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Hero
  heroWrap: { marginHorizontal: spacing.xl, borderRadius: 22, overflow: 'hidden', height: 260, marginTop: spacing.lg },
  heroImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.xl },
  heroLabel: { fontSize: 9, fontWeight: '700', color: '#F5B942', letterSpacing: 3, marginBottom: 6 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff', lineHeight: 28 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6, lineHeight: 18 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5B942', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', marginTop: 14 },
  heroCtaText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Stats
  statsCard: { flexDirection: 'row', marginHorizontal: spacing.xl, marginTop: -20, backgroundColor: 'rgba(20,16,12,0.95)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(245,185,66,0.15)', ...shadows.md },
  statItem: { flex: 1, alignItems: 'center' },
  counterNum: { fontSize: 18, fontWeight: '700', color: '#F5B942' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },
  // Sections
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.xl, marginTop: 32, marginBottom: 14 },
  sectionLabel: { fontSize: 9, fontWeight: '700', color: '#F5B942', letterSpacing: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  viewAll: { fontSize: 12, fontWeight: '600', color: '#F5B942' },
  // Luxury Card
  luxCard: { width: CARD_W, height: 200, borderRadius: 18, overflow: 'hidden' },
  luxImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  luxGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  luxContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: 14 },
  luxBadgeRow: { flexDirection: 'row', gap: 6 },
  luxBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F5B942', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  luxBadgeText: { fontSize: 8, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  verifiedDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.9)', alignItems: 'center', justifyContent: 'center' },
  luxInfo: { backgroundColor: 'rgba(10,8,6,0.85)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(245,185,66,0.1)' },
  luxName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  luxMeta: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  luxBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  luxRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  luxRatingText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  luxReviews: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  luxPrice: { fontSize: 12, fontWeight: '700', color: '#F5B942' },
  // Grid
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
  gridCard: { width: SMALL_CARD, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  gridAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(245,185,66,0.3)', marginBottom: 8 },
  gridName: { fontSize: 13, fontWeight: '600', color: '#fff', textAlign: 'center' },
  gridSpec: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  gridRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  gridRatingText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  gridCity: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  // Why section
  whySection: { paddingHorizontal: spacing.xl, marginTop: 40 },
  whyTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 16 },
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  whyCard: { width: SMALL_CARD, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  whyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  whyCardTitle: { fontSize: 12, fontWeight: '600', color: '#fff' },
  whyCardDesc: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 14 },
  // Testimonial
  testimonialCard: { marginHorizontal: spacing.xl, marginTop: 36, backgroundColor: 'rgba(245,185,66,0.04)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(245,185,66,0.12)' },
  testimonialText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 20, marginTop: 10 },
  testimonialAuthor: { fontSize: 11, color: '#F5B942', fontWeight: '600', marginTop: 10 },
  // CTA
  ctaBanner: { marginHorizontal: spacing.xl, marginTop: 36, backgroundColor: 'rgba(245,185,66,0.03)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.15)', borderRadius: 20, padding: 24, alignItems: 'center' },
  ctaEmoji: { fontSize: 36, marginBottom: 10 },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: '#F5B942' },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6, lineHeight: 18, marginBottom: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5B942', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  ctaBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  // Footer
  footer: { marginTop: 48, paddingHorizontal: spacing.xl, paddingVertical: 32, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  footerLogo: { fontSize: 14, fontWeight: '300', color: '#F5B942', letterSpacing: 5, marginBottom: 6 },
  footerDesc: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  footerLink: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  footerDot: { fontSize: 8, color: 'rgba(255,255,255,0.2)' },
  socialRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  footerCopy: { fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 16 },
  footerVersion: { fontSize: 8, color: 'rgba(255,255,255,0.1)', marginTop: 4 },
});
