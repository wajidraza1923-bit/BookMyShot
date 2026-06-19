import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  FlatList, Image, TouchableOpacity, Dimensions, Animated, Platform, Easing, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../theme';
import { creatorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CinematicHero from '../components/CinematicHero';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.8;
const HALF = (width - spacing.xl * 2 - 10) / 2;

const WEDDING_IMGS = [
  'https://images.unsplash.com/photo-1604604557852-d41e7a0a5c32?w=900',
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=900',
  'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=900',
  'https://images.unsplash.com/photo-1620162009541-a3015e766be4?w=900',
];

const CATEGORIES_DEFAULT = [
  { id: 'wedding', icon: 'camera', label: 'Wedding Photography', count: '4.2K+', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200' },
  { id: 'candid', icon: 'aperture', label: 'Candid Photography', count: '2.3K+', img: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200' },
  { id: 'videography', icon: 'videocam', label: 'Wedding Films', count: '1.8K+', img: 'https://images.unsplash.com/photo-1505932794465-147d1f1b2c97?w=200' },
  { id: 'drone', icon: 'airplane', label: 'Drone Coverage', count: '1.2K+', img: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=200' },
  { id: 'prewedding', icon: 'heart-circle', label: 'Pre Wedding', count: '1.5K+', img: 'https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=200' },
  { id: 'cinematography', icon: 'film', label: 'Cinematography', count: '900+', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=200' },
];

const WEDDING_MOMENTS = [
  { img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500', label: 'Royal Wedding', city: 'Udaipur, India' },
  { img: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500', label: 'Bride Portrait', city: 'Jaipur, India' },
  { img: 'https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=500', label: 'Mehndi Ceremony', city: 'Delhi, India' },
  { img: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500', label: 'Reception', city: 'Mumbai, India' },
  { img: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500', label: 'Destination Wedding', city: 'Goa, India' },
  { img: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500', label: 'Cinematic Couple', city: 'Kerala, India' },
  { img: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=500', label: 'Palace Wedding', city: 'Jodhpur, India' },
  { img: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=500', label: 'Wedding Film', city: 'Bangalore, India' },
];

const TESTIMONIALS: any[] = [];

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
  const [moments, setMoments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(CATEGORIES_DEFAULT);
  const [testimonials, setTestimonials] = useState<any[]>(TESTIMONIALS);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const goldSweep = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Shimmer loop for header logo
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, []);

  // Gold sweep on "Wedding Creator" every 4s
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(4000),
      Animated.timing(goldSweep, { toValue: 1, duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(goldSweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  const [liveStats, setLiveStats] = useState<any>({ creators: 0, bookings: 0, cities: 0, reviews: 0, avgRating: 0 });

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes, featuredRes, catsRes, statsRes] = await Promise.all([
        creatorsAPI.getAll(),
        api.get('/promotions/featured-status').catch(() => ({ data: { slots: {} } })),
        api.get('/discover/categories').catch(() => ({ data: { data: [] } })),
        api.get('/live-stats').catch(() => ({ data: { stats: {} } })),
      ]);

      // Live stats from DB
      if (statsRes.data?.stats) setLiveStats(statsRes.data.stats);

      // Load categories from DB (fallback to defaults)
      const dbCats = catsRes.data?.data || [];
      if (dbCats.length > 0) {
        setCategories(dbCats.map((c: any) => ({
          id: c.slug || c.name?.toLowerCase().replace(/\s+/g, '-'),
          icon: c.icon || 'camera',
          label: c.name,
          count: `${c.creatorCount || 0}+`,
          img: c.imageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200',
        })));
      }

      // Fetch wedding moments from API (fallback to hardcoded)
      let momentsData: any[] = [];
      try {
        const momRes = await api.get('/featured-wedding-moments');
        momentsData = momRes.data?.data || [];
      } catch {}
      setMoments(momentsData.length > 0 ? momentsData : WEDDING_MOMENTS);

      // Fetch testimonials — prefer REAL reviews from users, fallback to admin testimonials
      try {
        // First try to get real platform reviews
        const revRes = await api.get('/reviews/platform');
        const realReviews = revRes.data?.data || [];
        if (realReviews.length > 0) {
          setTestimonials(realReviews.map((r: any) => ({
            name: r.name || r.user?.name || 'User',
            city: r.city || '',
            text: r.text || r.review || '',
            rating: r.rating || 5,
            event: r.eventType || 'Wedding',
            verified: true,
          })));
        } else {
          // Fallback to admin-managed testimonials
          const testRes = await api.get('/testimonials');
          const testData = testRes.data?.data || [];
          if (testData.length > 0) setTestimonials(testData.map((t: any) => ({
            name: t.name,
            city: t.city || '',
            text: t.review || t.text || '',
            rating: t.rating || 5,
            event: t.eventType || 'Wedding',
            verified: t.verifiedBooking || false,
          })));
        }
      } catch {}
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

  // Show loading screen until data arrives
  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={s.logoCore}><Text style={s.logoBMS}>BMS</Text></View>
          <Text style={[s.brandText, { marginTop: 14 }]}>BOOKMYSHOT</Text>
          <ActivityIndicator size="small" color="#FF8C2B" style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C2B" colors={['#FF8C2B']} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >

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
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Profile')}><Ionicons name="person-circle-outline" size={26} color="#FF8C2B" /></TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.signInPill} onPress={() => navigation.navigate('Account')}><Text style={s.signInText}>Sign In</Text></TouchableOpacity>
          )}
        </View>

        {/* ═══ FULL-SCREEN CINEMATIC HERO ═══ */}
        <CinematicHero scrollY={scrollY} onNavigate={(screen) => navigation.navigate(screen)} />

        {/* BELOW HERO — Real stats from database */}
        <Animated.View style={{ opacity: fadeAnim }}>

        {/* LIVE STATS GLASS CARD */}
        <View style={s.liveStatsCard}>
          <View style={s.lsRow}>
            <View style={s.lsItem}><Text style={s.lsNum}>{liveStats.creators > 0 ? `${liveStats.creators.toLocaleString('en-IN')}+` : '—'}</Text><Text style={s.lsLabel}>Creators</Text></View>
            <View style={s.lsDivider} />
            <View style={s.lsItem}><Text style={s.lsNum}>{liveStats.bookings > 0 ? `${liveStats.bookings.toLocaleString('en-IN')}+` : '—'}</Text><Text style={s.lsLabel}>Bookings</Text></View>
            <View style={s.lsDivider} />
            <View style={s.lsItem}><Text style={s.lsNum}>{liveStats.cities > 0 ? `${liveStats.cities}+` : '—'}</Text><Text style={s.lsLabel}>Cities</Text></View>
            <View style={s.lsDivider} />
            <View style={s.lsItem}><Text style={s.lsNum}>{liveStats.avgRating > 0 ? `${liveStats.avgRating}` : '—'}</Text><Text style={s.lsLabel}>Rating</Text></View>
          </View>
        </View>

        {/* WEDDING MOMENTS CAROUSEL */}
        <View style={s.momentsSection}>
          <Text style={s.momentsTitle}>Featured Wedding Moments</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={moments}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={s.momentCard}>
                <Image source={{ uri: item.imageUrl || item.img }} style={s.momentImg} />
                <View style={s.momentOverlay} />
                <View style={s.momentWatermark}><Text style={s.momentWM}>BMS</Text></View>
                <View style={s.momentContent}>
                  <View style={s.momentAccent} />
                  <Text style={s.momentLabel}>{item.title || item.label}</Text>
                  <Text style={s.momentCity}>{item.location || item.city}</Text>
                </View>
              </View>
            )}
          />
        </View>

        {/* CATEGORIES */}
        <View style={s.catHeader}><Text style={s.secTitle}>Browse by Category</Text><TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.viewAll}>See All →</Text></TouchableOpacity></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={categories} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.catCard} onPress={() => navigation.navigate('Discover', { category: item.id })} activeOpacity={0.8}>
              <Image source={{ uri: item.img }} style={s.catCardImg} />
              <View style={s.catCardOverlay} />
              <View style={s.catCardIcon}><Ionicons name={item.icon as any} size={14} color="#FF8C2B" /></View>
              <View style={s.catCardContent}>
                <Text style={s.catName}>{item.label}</Text>
                <Text style={s.catCount}>{item.count}</Text>
              </View>
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
              <View style={s.gRow}><Ionicons name="star" size={10} color="#FF8C2B" /><Text style={s.gRating}>{item.rating || '5.0'}</Text>{item.startingPrice > 0 && <Text style={s.gPrice}>₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}</View></View>
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

        {/* TESTIMONIALS — Real reviews from database */}
        <View style={{ marginTop: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
            <View>
              <Text style={s.secTitle}>What Couples Say</Text>
              {liveStats.avgRating > 0 && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 20 }}>★ {liveStats.avgRating} average from {liveStats.reviews} reviews</Text>}
            </View>
            <TouchableOpacity style={s.writeRevBtn} onPress={() => navigation.navigate('PlatformReview')}>
              <Ionicons name="create-outline" size={12} color="#FF8C2B" /><Text style={s.writeRevText}>Write Review</Text>
            </TouchableOpacity>
          </View>
          {testimonials.length > 0 ? (
            <FlatList horizontal showsHorizontalScrollIndicator={false} data={testimonials} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={s.testCard}>
                  <View style={s.testStars}>{[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={12} color={i <= (item.rating || 5) ? '#FF8C2B' : 'rgba(255,255,255,0.15)'} />)}</View>
                  <Text style={s.testText}>"{item.review || item.text}"</Text>
                  <View style={s.testBottom}><Text style={s.testName}>{item.name}</Text><Text style={s.testMeta}>{item.city} • {item.eventType || item.event}</Text></View>
                  {(item.verifiedBooking || item.verified) && <View style={s.testBadge}><Ionicons name="checkmark-circle" size={10} color="#10B981" /><Text style={s.testBadgeText}>Verified</Text></View>}
                </View>
              )} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Ionicons name="chatbubble-outline" size={28} color="rgba(255,255,255,0.1)" />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>No reviews yet</Text>
              <TouchableOpacity style={[s.writeRevBtn, { marginTop: 12 }]} onPress={() => navigation.navigate('PlatformReview')}>
                <Ionicons name="create-outline" size={12} color="#FF8C2B" /><Text style={s.writeRevText}>Be the first to review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* GENERAL INQUIRY */}
        <View style={s.inquirySection}>
          <Text style={s.inquiryTitle}>Need Help Finding the Right Creator?</Text>
          <Text style={s.inquirySub}>Tell us your requirements and our team will connect you with the best creators.</Text>
          <TouchableOpacity style={s.inquiryBtn} onPress={() => navigation.navigate('Inquiry')} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#000" />
            <Text style={s.inquiryBtnText}>Submit Inquiry</Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        {!isAuthenticated && (
          <View style={s.cta}><Text style={s.ctaIcon}>📸</Text><Text style={s.ctaTitle}>Are you a wedding creator?</Text><Text style={s.ctaSub}>Join 10,000+ verified professionals. Get discovered by couples.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Account')}><Text style={s.ctaBtnText}>Join as Creator</Text><Ionicons name="arrow-forward" size={13} color="#000" /></TouchableOpacity></View>
        )}

        </Animated.View>

        {/* FOOTER */}
        <View style={s.footer}>
          <View style={s.fCenter}>
            <Text style={s.fLogo}>BOOKMYSHOT</Text>
            <Text style={s.fTag}>India's Premium Wedding Creator Marketplace</Text>
            <Text style={s.fAbout}>BookMyShot connects couples with verified photographers, videographers, drone operators and wedding filmmakers. Browse portfolios, compare creators and book the perfect team for your special day.</Text>
          </View>
          <View style={s.fDivider} />
          <View style={s.fGrid}>
            <View style={s.fCol}>
              <Text style={s.fHead}>COMPANY</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'About' })}><Text style={s.fLink}>About Us</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Contact' })}><Text style={s.fLink}>Contact</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Careers' })}><Text style={s.fLink}>Careers</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Press' })}><Text style={s.fLink}>Press</Text></TouchableOpacity>
            </View>
            <View style={s.fCol}>
              <Text style={s.fHead}>CREATORS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Account')}><Text style={s.fLink}>Join as Creator</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Resources' })}><Text style={s.fLink}>Pricing</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Resources' })}><Text style={s.fLink}>Resources</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Help' })}><Text style={s.fLink}>Help Center</Text></TouchableOpacity>
            </View>
            <View style={s.fCol}>
              <Text style={s.fHead}>CUSTOMERS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Discover')}><Text style={s.fLink}>Find Creator</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Discover', { category: 'wedding' })}><Text style={s.fLink}>Photography</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Discover', { category: 'videography' })}><Text style={s.fLink}>Videography</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Help' })}><Text style={s.fLink}>Support</Text></TouchableOpacity>
            </View>
          </View>
          <View style={s.fDivider} />
          <View style={s.fCenter}>
            <Text style={s.fHead}>LEGAL</Text>
            <View style={s.fLegalRow}>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Privacy' })}><Text style={s.fLink}>Privacy Policy</Text></TouchableOpacity>
              <Text style={s.fDot}>•</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Terms' })}><Text style={s.fLink}>Terms</Text></TouchableOpacity>
              <Text style={s.fDot}>•</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Refund' })}><Text style={s.fLink}>Refund</Text></TouchableOpacity>
              <Text style={s.fDot}>•</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Cancellation' })}><Text style={s.fLink}>Cancellation</Text></TouchableOpacity>
            </View>
          </View>
          <View style={s.fDivider} />
          <View style={s.fCenter}>
            <Text style={s.fSocialTitle}>CONNECT WITH US</Text>
            <View style={s.socialRow}>
              <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://instagram.com/bookmyshot')}><Ionicons name="logo-instagram" size={16} color="#FF8C2B" /></TouchableOpacity>
              <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://facebook.com/bookmyshot')}><Ionicons name="logo-facebook" size={16} color="#FF8C2B" /></TouchableOpacity>
              <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://youtube.com/@bookmyshot')}><Ionicons name="logo-youtube" size={16} color="#FF8C2B" /></TouchableOpacity>
              <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://linkedin.com/company/bookmyshot')}><Ionicons name="logo-linkedin" size={16} color="#FF8C2B" /></TouchableOpacity>
              <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://twitter.com/bookmyshot')}><Ionicons name="logo-twitter" size={16} color="#FF8C2B" /></TouchableOpacity>
              <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://wa.me/918492922173')}><Ionicons name="logo-whatsapp" size={16} color="#FF8C2B" /></TouchableOpacity>
            </View>
          </View>
          <View style={s.fDivider} />
          <View style={s.fCenter}>
            <TouchableOpacity style={s.fBottomRow} onPress={() => Linking.openURL('mailto:support@bookmyshot.in')}>
              <Ionicons name="mail-outline" size={12} color="rgba(245,185,66,0.6)" />
              <Text style={s.fEmail}>support@bookmyshot.in</Text>
            </TouchableOpacity>
            <Text style={s.fCopy}>© 2026 BookMyShot. All Rights Reserved.</Text>
            <Text style={s.fVersion}>Made with ❤️ in India • v2.0.0</Text>
          </View>
        </View>
      </Animated.ScrollView>
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
            <View style={s.pChip}><Ionicons name="location-outline" size={10} color="#FF8C2B" /><Text style={s.pChipText}>{item.city || 'India'}</Text></View>
            <View style={s.pChip}><Ionicons name="star" size={10} color="#FF8C2B" /><Text style={s.pChipText}>{item.rating || '5.0'} ({item.reviewCount || 0})</Text></View>
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
  // Loading screen styles
  logoCore: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 2, borderColor: 'rgba(255,140,43,0.3)', alignItems: 'center', justifyContent: 'center' },
  logoBMS: { fontSize: 18, fontWeight: '800', color: '#FF8C2B', letterSpacing: 2 },
  brandText: { fontSize: 14, fontWeight: '300', color: '#FF8C2B', letterSpacing: 5 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10 },
  logo: { fontSize: 18, fontWeight: '400', color: '#FF8C2B', letterSpacing: 4 },
  logoIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#FF8C2B', alignItems: 'center', justifyContent: 'center' },
  logoAperture: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(245,185,66,0.4)' },
  logoDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF8C2B' },
  shimmer: { position: 'absolute', top: 0, left: 0, width: 50, height: '100%', backgroundColor: 'rgba(255,200,60,0.2)', transform: [{ skewX: '-20deg' }] },
  headerBtn: { padding: 4 },
  signInPill: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FF8C2B', borderRadius: 16 },
  signInText: { fontSize: 11, fontWeight: '700', color: '#000' },
  // Live Stats Card — Dark luxury glassmorphism
  liveStatsCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 12, backgroundColor: 'rgba(255,138,42,0.05)', borderWidth: 1, borderTopColor: 'rgba(255,138,42,0.15)', borderBottomColor: 'rgba(255,138,42,0.15)', borderLeftColor: 'rgba(255,138,42,0.08)', borderRightColor: 'rgba(255,138,42,0.08)', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 12 },
  lsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  lsItem: { alignItems: 'center', flex: 1 },
  lsNum: { fontSize: 20, fontWeight: '800', color: '#FF8A2A' },
  lsLabel: { fontSize: 8, color: 'rgba(255,255,255,0.45)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  lsDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,138,42,0.12)' },
  // Hero
  heroWrap: { paddingBottom: 20, position: 'relative', overflow: 'hidden', minHeight: 620 },
  // Ambient glow
  ambientGlow: { position: 'absolute', top: 60, alignSelf: 'center', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(249,115,22,0.04)' },
  ambientGlow2: { position: 'absolute', top: 180, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(249,115,22,0.015)' },
  // Light beams
  beam1: { position: 'absolute', top: 50, left: width * 0.3, width: 2, height: 300, backgroundColor: '#F97316', transform: [{ rotate: '15deg' }] },
  beam2: { position: 'absolute', top: 30, right: width * 0.25, width: 1.5, height: 350, backgroundColor: '#F97316', transform: [{ rotate: '-12deg' }] },
  beam3: { position: 'absolute', top: 100, left: width * 0.5, width: 1, height: 250, backgroundColor: '#FFB347', transform: [{ rotate: '25deg' }] },
  // Particles
  gp: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(249,115,22,0.5)' },
  gpSm: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(249,115,22,0.35)' },
  gpLg: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(249,115,22,0.25)' },
  // Typography
  heroTextBlock: { paddingHorizontal: 20, marginTop: 30 },
  heroMini: { fontSize: 9, fontWeight: '700', color: '#F97316', letterSpacing: 4, marginBottom: 16 },
  heroH1Light: { fontSize: 36, fontWeight: '200', color: '#fff', lineHeight: 42, letterSpacing: -0.5 },
  heroH1Bold: { fontSize: 42, fontWeight: '800', color: '#FFB347', lineHeight: 48, letterSpacing: -1, textShadowColor: 'rgba(249,115,22,0.2)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  goldSweep: { position: 'absolute', top: 0, left: 0, width: 80, height: '100%', backgroundColor: 'rgba(255,220,130,0.06)', transform: [{ skewX: '-15deg' }] },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 14, lineHeight: 20, maxWidth: width * 0.75 },
  // Glass cards
  glassCardFloat: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  gcf1: { top: 90, right: 16 },
  gcf2: { top: 180, right: 20 },
  gcf3: { top: 290, right: 14 },
  gcf4: { top: 370, right: 18 },
  gcfNum: { fontSize: 13, fontWeight: '800', color: '#fff' },
  gcfLabel: { fontSize: 7, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Bottom
  heroBottom: { paddingHorizontal: 20, marginTop: 20 },
  // Ticker
  ticker: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  tickDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  tickIcon: { fontSize: 11 },
  tickText: { fontSize: 9, color: 'rgba(255,255,255,0.4)', maxWidth: width * 0.5 },
  // Buttons
  btnRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F97316', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12, shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#000' },
  btnGlass: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.3)', backgroundColor: 'rgba(255,255,255,0.02)' },
  btnGlassText: { fontSize: 14, fontWeight: '600', color: '#FFB347' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FF8C2B', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14 },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#000' },
  btnGlass: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.35)', backgroundColor: 'rgba(255,255,255,0.03)' },
  btnGlassText: { fontSize: 14, fontWeight: '600', color: '#FFB347' },
  // Sections
  secTitle: { fontSize: 15, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginTop: 30, marginBottom: 12 },
  secLabel: { fontSize: 8, fontWeight: '700', color: '#FF8C2B', letterSpacing: 2 },
  secTitle2: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 2 },
  viewAll: { fontSize: 11, fontWeight: '600', color: '#FF8C2B' },
  // Moments carousel
  momentsSection: { marginTop: 24 },
  momentsTitle: { fontSize: 15, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginBottom: 12 },
  momentCard: { width: width * 0.7, height: 220, borderRadius: 20, overflow: 'hidden', marginRight: 12 },
  momentImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  momentOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  momentWatermark: { position: 'absolute', top: 12, right: 12, opacity: 0.18 },
  momentWM: { fontSize: 12, fontWeight: '800', color: '#FF8C2B', letterSpacing: 2 },
  momentContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  momentAccent: { width: 24, height: 2, backgroundColor: '#FF8C2B', marginBottom: 6, borderRadius: 1 },
  momentLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  momentCity: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  // Categories
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  catCard: { width: 110, height: 80, borderRadius: 12, overflow: 'hidden', marginRight: 10 },
  catCardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  catCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  catCardIcon: { position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,140,43,0.15)', alignItems: 'center', justifyContent: 'center' },
  catCardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  catName: { fontSize: 10, fontWeight: '600', color: '#fff' },
  catCount: { fontSize: 9, color: '#FF8C2B', marginTop: 2 },
  // Premium Card
  pCard: { width: CARD_W, height: 280, borderRadius: 20, overflow: 'hidden' },
  pImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  pOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  pBadgeRow: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  pBadge: { backgroundColor: '#FF8C2B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
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
  pPrice: { fontSize: 11, fontWeight: '700', color: '#FF8C2B', marginLeft: 'auto' },
  pBtnRow: { flexDirection: 'row', gap: 8 },
  pBtnOutline: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,185,66,0.3)' },
  pBtnOutlineText: { fontSize: 10, fontWeight: '600', color: '#FF8C2B' },
  pBtnSolid: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, backgroundColor: '#FF8C2B' },
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
  gPrice: { fontSize: 10, fontWeight: '600', color: '#FF8C2B', marginLeft: 'auto' },
  // Why
  whySec: { paddingHorizontal: 20, marginTop: 36 },
  whyTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 14 },
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  whyCard: { width: HALF, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  whyIc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  whyT: { fontSize: 11, fontWeight: '600', color: '#fff' },
  whyD: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  // Testimonials
  writeRevBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  writeRevText: { fontSize: 10, fontWeight: '600', color: '#FF8C2B' },
  testCard: { width: width * 0.72, backgroundColor: 'rgba(245,185,66,0.03)', borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1, borderColor: 'rgba(245,185,66,0.1)' },
  testStars: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  testText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 18 },
  testBottom: { marginTop: 10 },
  testName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  testMeta: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  testBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  testBadgeText: { fontSize: 9, color: '#10B981' },
  // Inquiry
  inquirySection: { marginHorizontal: 16, marginTop: 32, padding: 22, backgroundColor: 'rgba(255,140,43,0.03)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.12)', borderRadius: 20, alignItems: 'center' },
  inquiryTitle: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' },
  inquirySub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6, lineHeight: 18, marginBottom: 16 },
  inquiryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF8C2B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  inquiryBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  // CTA
  cta: { marginHorizontal: 16, marginTop: 36, backgroundColor: 'rgba(245,185,66,0.03)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.12)', borderRadius: 20, padding: 24, alignItems: 'center' },
  ctaIcon: { fontSize: 32, marginBottom: 8 },
  ctaTitle: { fontSize: 15, fontWeight: '700', color: '#FF8C2B' },
  ctaSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6, lineHeight: 17, marginBottom: 14 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF8C2B', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  ctaBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Footer
  footer: { marginTop: 44, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(8,6,4,0.98)' },
  fCenter: { alignItems: 'center' },
  fLogo: { fontSize: 14, fontWeight: '300', color: '#FF8C2B', letterSpacing: 5, textAlign: 'center' },
  fTag: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, textAlign: 'center' },
  fAbout: { fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 17, marginTop: 10, textAlign: 'center', paddingHorizontal: 10 },
  fGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  fCol: { alignItems: 'center' },
  fHead: { fontSize: 9, fontWeight: '700', color: '#FF8C2B', letterSpacing: 1.5, marginBottom: 8, textAlign: 'center' },
  fLink: { fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingVertical: 4, textAlign: 'center' },
  fDot: { fontSize: 8, color: 'rgba(255,255,255,0.2)', marginHorizontal: 6 },
  fLegalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 4 },
  fDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 16 },
  fSocialTitle: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 10, textAlign: 'center' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  socialBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,185,66,0.06)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.15)', alignItems: 'center', justifyContent: 'center' },
  fBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  fEmail: { fontSize: 11, color: 'rgba(245,185,66,0.6)' },
  fCopy: { fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },
  fVersion: { fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 4, textAlign: 'center' },
});
