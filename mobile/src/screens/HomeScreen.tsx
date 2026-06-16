import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  FlatList, Image, TouchableOpacity, Dimensions, Animated, Platform, Easing, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../theme';
import { creatorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.8;
const HALF = (width - spacing.xl * 2 - 10) / 2;

const WEDDING_IMGS = [
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=900',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=900',
  'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=900',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=900',
];

const CATEGORIES = [
  { id: 'wedding', icon: '💒', label: 'Wedding Photography', count: '4.2K+' },
  { id: 'candid', icon: '📸', label: 'Candid Photography', count: '2.3K+' },
  { id: 'videography', icon: '🎬', label: 'Wedding Films', count: '1.8K+' },
  { id: 'prewedding', icon: '💑', label: 'Pre Wedding', count: '1.5K+' },
  { id: 'drone', icon: '🚁', label: 'Drone Coverage', count: '600+' },
  { id: 'cinematography', icon: '🎥', label: 'Cinematography', count: '1.2K+' },
  { id: 'bridal', icon: '👰', label: 'Bridal Shoots', count: '900+' },
  { id: 'engagement', icon: '💍', label: 'Engagement', count: '700+' },
];

const TESTIMONIALS = [
  { name: 'Priya & Rahul', city: 'Mumbai', text: 'Found our dream photographer in minutes. The quality was beyond expectations!', rating: 5, event: 'Wedding' },
  { name: 'Ankit & Meera', city: 'Delhi', text: 'BookMyShot made our pre-wedding shoot magical. Highly recommend!', rating: 5, event: 'Pre Wedding' },
  { name: 'Sneha & Varun', city: 'Bangalore', text: 'Professional, verified creators. Our wedding film is absolutely stunning.', rating: 5, event: 'Cinematography' },
];

function Counter({ end, suffix = '+' }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0; const step = Math.ceil(end / 50);
    const t = setInterval(() => { n += step; if (n >= end) { setVal(end); clearInterval(t); } else setVal(n); }, 30);
    return () => clearInterval(t);
  }, [end]);
  return <Text style={s.counterNum}>{val.toLocaleString('en-IN')}{suffix}</Text>;
}

export default function HomeScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  // Shimmer loop for logo
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, []);

  // Hero image rotation
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % WEDDING_IMGS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes, featuredRes] = await Promise.all([
        creatorsAPI.getAll(),
        api.get('/promotions/featured-status').catch(() => ({ data: { slots: {} } })),
      ]);
      const all = creatorsRes.data?.creators || creatorsRes.data?.data || [];
      const slots = featuredRes.data?.slots || {};
      const fIds: string[] = []; const ordered: any[] = [];
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
    } catch {} finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 35, friction: 8 }),
      ]).start();
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };
  const topRated = [...creators].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5B942" colors={['#F5B942']} />}>

        {/* HEADER */}
        <View style={s.header}>
          <View style={{ overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.logoIcon}><View style={s.logoAperture} /><View style={s.logoDot} /></View>
            <View>
              <Text style={s.logo}>BOOKMYSHOT</Text>
              <Animated.View style={[s.shimmer, { transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 220] }) }] }]} />
            </View>
          </View>
          {isAuthenticated ? (
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Profile')}><Ionicons name="person-circle-outline" size={26} color="#F5B942" /></TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.signInPill} onPress={() => navigation.navigate('Account')}><Text style={s.signInText}>Sign In</Text></TouchableOpacity>
          )}
        </View>

        {/* HERO */}
        <Animated.View style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Image source={{ uri: WEDDING_IMGS[heroIdx] }} style={s.heroImg} />
          <View style={s.heroOverlay} />
          <View style={s.heroVignette} />
          {/* Decorative aperture rings */}
          <View style={s.apertureRing1} />
          <View style={s.apertureRing2} />
          <View style={s.heroInner}>
            <Text style={s.heroTag}>✦ PREMIUM WEDDING CINEMA</Text>
            <Text style={s.heroTitle}>Capture Your Dream{'\n'}Wedding Experience</Text>
            <Text style={s.heroSub}>Cinematic photographers, award-winning filmmakers & creative professionals — all verified.</Text>
            <View style={s.trustRow}>
              <View style={s.trustChip}><Ionicons name="checkmark-circle" size={12} color="#10B981" /><Text style={s.trustChipText}>Verified</Text></View>
              <View style={s.trustChip}><Ionicons name="star" size={12} color="#F5B942" /><Text style={s.trustChipText}>Real Reviews</Text></View>
              <View style={s.trustChip}><Ionicons name="flash" size={12} color="#8B5CF6" /><Text style={s.trustChipText}>Fast Reply</Text></View>
            </View>
            <View style={s.heroBtnRow}>
              <TouchableOpacity style={s.heroBtn} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
                <Ionicons name="search" size={14} color="#000" /><Text style={s.heroBtnText}>Find Creator</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.heroBtnGlass} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
                <Text style={s.heroBtnGlassText}>Explore</Text><Ionicons name="arrow-forward" size={12} color="#F5B942" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* STATS */}
        <View style={s.statsBar}>
          <View style={s.stat}><Counter end={10000} /><Text style={s.statLbl}>Creators</Text></View>
          <View style={s.statDiv} />
          <View style={s.stat}><Counter end={5000} /><Text style={s.statLbl}>Weddings</Text></View>
          <View style={s.statDiv} />
          <View style={s.stat}><Counter end={100} /><Text style={s.statLbl}>Cities</Text></View>
        </View>

        {/* CATEGORIES */}
        <Text style={s.secTitle}>Browse by Category</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATEGORIES} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.catChip} onPress={() => navigation.navigate('Discover', { category: item.id })} activeOpacity={0.8}>
              <Text style={s.catIcon}>{item.icon}</Text>
              <Text style={s.catName}>{item.label}</Text>
              <Text style={s.catCount}>{item.count}</Text>
            </TouchableOpacity>
          )} />

        {/* FEATURED */}
        {featured.length > 0 && (<>
          <View style={s.secRow}><View><Text style={s.secLabel}>FEATURED</Text><Text style={s.secTitle2}>Premium Creators</Text></View><TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.viewAll}>View All →</Text></TouchableOpacity></View>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={featured} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i._id}
            renderItem={({ item }) => <PremiumCard item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} badge="⭐ FEATURED" />} />
        </>)}

        {/* TOP RATED */}
        {topRated.length > 0 && (<>
          <View style={s.secRow}><View><Text style={s.secLabel}>TOP RATED</Text><Text style={s.secTitle2}>Best Reviewed</Text></View><TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.viewAll}>See All →</Text></TouchableOpacity></View>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={topRated} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i._id}
            renderItem={({ item }) => <PremiumCard item={item} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} />} />
        </>)}

        {/* ALL CREATORS GRID */}
        {creators.length > 0 && (<>
          <View style={s.secRow}><View><Text style={s.secLabel}>DISCOVER</Text><Text style={s.secTitle2}>All Creators</Text></View><TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.viewAll}>Browse →</Text></TouchableOpacity></View>
          <View style={s.grid}>{creators.slice(0, 4).map(item => (
            <TouchableOpacity key={item._id} style={s.gCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.85}>
              <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || WEDDING_IMGS[0] }} style={s.gImg} />
              <View style={s.gInfo}><Text style={s.gName} numberOfLines={1}>{item.user?.name}</Text><Text style={s.gMeta}>{item.specialty} • {item.city}</Text>
              <View style={s.gRow}><Ionicons name="star" size={10} color="#F5B942" /><Text style={s.gRating}>{item.rating || '5.0'}</Text>{item.startingPrice > 0 && <Text style={s.gPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}</View></View>
            </TouchableOpacity>
          ))}</View>
        </>)}

        {/* WHY BOOKMYSHOT */}
        <View style={s.whySec}>
          <Text style={s.whyTitle}>Why Choose BookMyShot?</Text>
          <View style={s.whyGrid}>
            {[{i:'shield-checkmark',t:'Verified Pros',d:'Quality checked',c:'#10B981'},{i:'lock-closed',t:'Secure',d:'Data protected',c:'#3B82F6'},{i:'star',t:'Real Reviews',d:'Genuine feedback',c:'#F59E0B'},{i:'flash',t:'Fast Response',d:'Reply in 2hrs',c:'#8B5CF6'}].map((w,idx) => (
              <View key={idx} style={s.whyCard}><View style={[s.whyIc,{backgroundColor:w.c+'18'}]}><Ionicons name={w.i as any} size={18} color={w.c} /></View><Text style={s.whyT}>{w.t}</Text><Text style={s.whyD}>{w.d}</Text></View>
            ))}
          </View>
        </View>

        {/* TESTIMONIALS */}
        <Text style={[s.secTitle, {marginTop: 32}]}>What Couples Say</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={TESTIMONIALS} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={s.testCard}>
              <View style={s.testStars}>{[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={12} color="#F5B942" />)}</View>
              <Text style={s.testText}>"{item.text}"</Text>
              <View style={s.testBottom}><Text style={s.testName}>{item.name}</Text><Text style={s.testMeta}>{item.city} • {item.event}</Text></View>
              <View style={s.testBadge}><Ionicons name="checkmark-circle" size={10} color="#10B981" /><Text style={s.testBadgeText}>Verified Booking</Text></View>
            </View>
          )} />

        {/* CTA */}
        {!isAuthenticated && (
          <View style={s.cta}><Text style={s.ctaIcon}>📸</Text><Text style={s.ctaTitle}>Are you a wedding creator?</Text><Text style={s.ctaSub}>Join 10,000+ verified professionals. Get discovered by couples.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Account')}><Text style={s.ctaBtnText}>Join as Creator</Text><Ionicons name="arrow-forward" size={13} color="#000" /></TouchableOpacity></View>
        )}

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.fLogo}>BOOKMYSHOT</Text>
          <Text style={s.fTag}>India's Premium Wedding Creator Marketplace</Text>
          <Text style={s.fAbout}>BookMyShot connects couples with verified photographers, videographers, drone operators and wedding filmmakers. Browse portfolios, compare creators and book the perfect team for your special day.</Text>
          <View style={s.fDivider} />
          <View style={s.fGrid}>
            <View style={s.fCol}>
              <Text style={s.fHead}>COMPANY</Text>
              <TouchableOpacity onPress={() => Alert.alert('About Us', 'BookMyShot is India\'s premium wedding creator marketplace. We connect couples with verified photographers, videographers, and filmmakers across 100+ cities.')}><Text style={s.fLink}>About Us</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@bookmyshot.in')}><Text style={s.fLink}>Contact</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Careers', 'We\'re hiring! Send your resume to support@bookmyshot.in with subject "Careers"')}><Text style={s.fLink}>Careers</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Press', 'For media inquiries, email support@bookmyshot.in')}><Text style={s.fLink}>Press</Text></TouchableOpacity>
            </View>
            <View style={s.fCol}>
              <Text style={s.fHead}>CREATORS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Account')}><Text style={s.fLink}>Join as Creator</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Pricing', 'Monthly subscription: Database-driven pricing.\nCommission: 3-5% per booking.\nFeatured listing: Premium placement.')}><Text style={s.fLink}>Pricing</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Creator Resources', 'Tips to grow your business:\n• Complete your portfolio\n• Add 10 best photos\n• Set competitive pricing\n• Respond to inquiries fast')}><Text style={s.fLink}>Resources</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@bookmyshot.in?subject=Help')}><Text style={s.fLink}>Help Center</Text></TouchableOpacity>
            </View>
            <View style={s.fCol}>
              <Text style={s.fHead}>CUSTOMERS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.fLink}>Find Creator</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Discover', { category: 'wedding' })}><Text style={s.fLink}>Photography</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Discover', { category: 'videography' })}><Text style={s.fLink}>Videography</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@bookmyshot.in?subject=Support')}><Text style={s.fLink}>Support</Text></TouchableOpacity>
            </View>
          </View>
          <View style={s.fDivider} />
          <Text style={s.fHead}>LEGAL</Text>
          <View style={s.fLegalRow}>
            <TouchableOpacity onPress={() => Linking.openURL('https://bookmyshot.in/privacy-policy.html')}><Text style={s.fLink}>Privacy Policy</Text></TouchableOpacity>
            <Text style={s.fDot}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://bookmyshot.in/terms.html')}><Text style={s.fLink}>Terms</Text></TouchableOpacity>
            <Text style={s.fDot}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://bookmyshot.in/refund-policy.html')}><Text style={s.fLink}>Refund</Text></TouchableOpacity>
            <Text style={s.fDot}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://bookmyshot.in/cancellation-policy.html')}><Text style={s.fLink}>Cancellation</Text></TouchableOpacity>
          </View>
          <View style={s.fDivider} />
          <Text style={s.fSocialTitle}>CONNECT WITH US</Text>
          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://instagram.com/bookmyshot')}><Ionicons name="logo-instagram" size={16} color="#F5B942" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://facebook.com/bookmyshot')}><Ionicons name="logo-facebook" size={16} color="#F5B942" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://youtube.com/@bookmyshot')}><Ionicons name="logo-youtube" size={16} color="#F5B942" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://linkedin.com/company/bookmyshot')}><Ionicons name="logo-linkedin" size={16} color="#F5B942" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://twitter.com/bookmyshot')}><Ionicons name="logo-twitter" size={16} color="#F5B942" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://wa.me/918492922173')}><Ionicons name="logo-whatsapp" size={16} color="#F5B942" /></TouchableOpacity>
          </View>
          <View style={s.fDivider} />
          <TouchableOpacity style={s.fBottomRow} onPress={() => Linking.openURL('mailto:support@bookmyshot.in')}>
            <Ionicons name="mail-outline" size={12} color="rgba(245,185,66,0.6)" />
            <Text style={s.fEmail}>support@bookmyshot.in</Text>
          </TouchableOpacity>
          <Text style={s.fCopy}>© 2026 BookMyShot. All Rights Reserved.</Text>
          <Text style={s.fVersion}>Made with ❤️ in India • v2.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══ PREMIUM CARD ═══
function PremiumCard({ item, onPress, badge }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: 12 }}>
      <TouchableOpacity style={s.pCard} onPress={onPress} activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 1.035, useNativeDriver: true, tension: 300, friction: 10 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}>
        <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || WEDDING_IMGS[1] }} style={s.pImg} />
        <View style={s.pOverlay} />
        {/* Badge */}
        <View style={s.pBadgeRow}>
          {badge && <View style={s.pBadge}><Text style={s.pBadgeText}>{badge}</Text></View>}
          {item.verified && <View style={s.pVerified}><Ionicons name="checkmark" size={10} color="#fff" /></View>}
        </View>
        {/* Info Panel */}
        <View style={s.pInfo}>
          <View style={s.pAvatarRow}>
            <Image source={{ uri: item.user?.avatar || WEDDING_IMGS[2] }} style={s.pAvatar} />
            <View style={{flex:1}}>
              <Text style={s.pName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
              <Text style={s.pSpec}>{item.specialty || 'Wedding Photography'}</Text>
            </View>
          </View>
          <View style={s.pMetaRow}>
            <View style={s.pChip}><Ionicons name="location-outline" size={10} color="#F5B942" /><Text style={s.pChipText}>{item.city || 'India'}</Text></View>
            <View style={s.pChip}><Ionicons name="star" size={10} color="#F5B942" /><Text style={s.pChipText}>{item.rating || '5.0'} ({item.reviewCount || 0})</Text></View>
            {item.startingPrice > 0 && <Text style={s.pPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}
          </View>
          <View style={s.pBtnRow}>
            <TouchableOpacity style={s.pBtnOutline} onPress={onPress}><Text style={s.pBtnOutlineText}>View Portfolio</Text></TouchableOpacity>
            <TouchableOpacity style={s.pBtnSolid} onPress={onPress}><Text style={s.pBtnSolidText}>Book Now</Text></TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 46, paddingBottom: 8 },
  logo: { fontSize: 15, fontWeight: '300', color: '#F5B942', letterSpacing: 6 },
  logoIcon: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#F5B942', alignItems: 'center', justifyContent: 'center' },
  logoAperture: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(245,185,66,0.4)' },
  logoDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5B942' },
  shimmer: { position: 'absolute', top: 0, left: 0, width: 50, height: '100%', backgroundColor: 'rgba(255,200,60,0.2)', transform: [{ skewX: '-20deg' }] },
  headerBtn: { padding: 4 },
  signInPill: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F5B942', borderRadius: 16 },
  signInText: { fontSize: 11, fontWeight: '700', color: '#000' },
  // Hero
  hero: { marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', height: 300, marginTop: 12 },
  heroImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  heroVignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', borderWidth: 40, borderColor: 'rgba(0,0,0,0.4)', borderRadius: 24 },
  heroInner: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  heroTag: { fontSize: 9, fontWeight: '700', color: '#F5B942', letterSpacing: 2, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32, textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 20 },
  heroSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 17, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  trustRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  trustChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trustChipText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5B942', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', marginTop: 14 },
  heroBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },
  heroBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroBtnGlass: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.25)' },
  heroBtnGlassText: { fontSize: 12, fontWeight: '600', color: '#F5B942' },
  // Aperture decorative rings
  apertureRing1: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(245,185,66,0.08)' },
  apertureRing2: { position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(245,185,66,0.05)' },
  // Stats
  statsBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: -16, backgroundColor: 'rgba(15,12,8,0.96)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(245,185,66,0.12)' },
  stat: { flex: 1, alignItems: 'center' },
  counterNum: { fontSize: 17, fontWeight: '700', color: '#F5B942' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statDiv: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.05)' },
  // Sections
  secTitle: { fontSize: 15, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginTop: 30, marginBottom: 12 },
  secLabel: { fontSize: 8, fontWeight: '700', color: '#F5B942', letterSpacing: 2 },
  secTitle2: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 2 },
  viewAll: { fontSize: 11, fontWeight: '600', color: '#F5B942' },
  // Categories
  catChip: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', minWidth: 90 },
  catIcon: { fontSize: 22, marginBottom: 4 },
  catName: { fontSize: 10, fontWeight: '500', color: '#fff', textAlign: 'center' },
  catCount: { fontSize: 9, color: 'rgba(245,185,66,0.7)', marginTop: 2 },
  // Premium Card
  pCard: { width: CARD_W, height: 280, borderRadius: 20, overflow: 'hidden' },
  pImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  pOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  pBadgeRow: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  pBadge: { backgroundColor: '#F5B942', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pBadgeText: { fontSize: 8, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  pVerified: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  pInfo: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(8,6,4,0.92)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(245,185,66,0.1)' },
  pAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(245,185,66,0.3)' },
  pName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  pSpec: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  pMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pChipText: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  pPrice: { fontSize: 11, fontWeight: '700', color: '#F5B942', marginLeft: 'auto' },
  pBtnRow: { flexDirection: 'row', gap: 8 },
  pBtnOutline: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,185,66,0.3)' },
  pBtnOutlineText: { fontSize: 10, fontWeight: '600', color: '#F5B942' },
  pBtnSolid: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, backgroundColor: '#F5B942' },
  pBtnSolidText: { fontSize: 10, fontWeight: '700', color: '#000' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  gCard: { width: HALF, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  gImg: { width: '100%', height: 100, resizeMode: 'cover' },
  gInfo: { padding: 10 },
  gName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  gMeta: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  gRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gRating: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  gPrice: { fontSize: 10, fontWeight: '600', color: '#F5B942', marginLeft: 'auto' },
  // Why
  whySec: { paddingHorizontal: 20, marginTop: 36 },
  whyTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 14 },
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  whyCard: { width: HALF, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  whyIc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  whyT: { fontSize: 11, fontWeight: '600', color: '#fff' },
  whyD: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  // Testimonials
  testCard: { width: width * 0.72, backgroundColor: 'rgba(245,185,66,0.03)', borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1, borderColor: 'rgba(245,185,66,0.1)' },
  testStars: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  testText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 18 },
  testBottom: { marginTop: 10 },
  testName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  testMeta: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  testBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  testBadgeText: { fontSize: 9, color: '#10B981' },
  // CTA
  cta: { marginHorizontal: 16, marginTop: 36, backgroundColor: 'rgba(245,185,66,0.03)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.12)', borderRadius: 20, padding: 24, alignItems: 'center' },
  ctaIcon: { fontSize: 32, marginBottom: 8 },
  ctaTitle: { fontSize: 15, fontWeight: '700', color: '#F5B942' },
  ctaSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6, lineHeight: 17, marginBottom: 14 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5B942', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  ctaBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Footer
  footer: { marginTop: 44, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(8,6,4,0.98)' },
  fLogo: { fontSize: 14, fontWeight: '300', color: '#F5B942', letterSpacing: 5 },
  fTag: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
  fAbout: { fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 17, marginTop: 10 },
  fGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  fCol: { flex: 1 },
  fHead: { fontSize: 9, fontWeight: '700', color: '#F5B942', letterSpacing: 1.5, marginBottom: 8 },
  fLink: { fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingVertical: 4 },
  fDot: { fontSize: 8, color: 'rgba(255,255,255,0.2)', marginHorizontal: 6 },
  fLegalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  fDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 16 },
  fSocialTitle: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 10 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,185,66,0.06)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.15)', alignItems: 'center', justifyContent: 'center' },
  fBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  fEmail: { fontSize: 11, color: 'rgba(245,185,66,0.6)' },
  fCopy: { fontSize: 9, color: 'rgba(255,255,255,0.2)' },
  fVersion: { fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 4 },
});
