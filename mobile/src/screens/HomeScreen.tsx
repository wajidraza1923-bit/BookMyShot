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

const { width } = Dimensions.get('window');
const CARD_W = width * 0.8;
const HALF = (width - spacing.xl * 2 - 10) / 2;

const WEDDING_IMGS = [
  'https://images.unsplash.com/photo-1604604557852-d41e7a0a5c32?w=900',
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=900',
  'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=900',
  'https://images.unsplash.com/photo-1620162009541-a3015e766be4?w=900',
];

const CATEGORIES = [
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
  const [moments, setMoments] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>(TESTIMONIALS);
  const [heroIdx, setHeroIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const ring1Rot = useRef(new Animated.Value(0)).current;
  const ring2Rot = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;
  const goldSweep = useRef(new Animated.Value(0)).current;

  // Shimmer loop for logo
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, []);

  // Rotating lens rings
  useEffect(() => {
    Animated.loop(Animated.timing(ring1Rot, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2Rot, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);

  // Glow pulse
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.8, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.4, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  // Floating particles
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(particle1Y, { toValue: -12, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(particle1Y, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(particle2Y, { toValue: 10, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(particle2Y, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  // Gold sweep on "Dream Wedding" every 4s
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(4000),
      Animated.timing(goldSweep, { toValue: 1, duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(goldSweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
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
      // Fetch wedding moments from API (fallback to hardcoded)
      let momentsData: any[] = [];
      try {
        const momRes = await api.get('/featured-wedding-moments');
        momentsData = momRes.data?.data || [];
      } catch {}
      setMoments(momentsData.length > 0 ? momentsData : WEDDING_MOMENTS);

      // Fetch testimonials
      try {
        const testRes = await api.get('/testimonials');
        const testData = testRes.data?.data || [];
        if (testData.length > 0) setTestimonials(testData);
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
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C2B" colors={['#FF8C2B']} />}>

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

        {/* HERO */}
        <Animated.View style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.heroBg}>
            {/* Multiple lens layers - LEFT */}
            <View style={s.lensL1} /><View style={s.lensL2} /><View style={s.lensL3} />
            {/* Multiple lens layers - RIGHT (larger, more visible) */}
            <View style={s.lensR1} /><View style={s.lensR2} /><View style={s.lensR3} /><View style={s.lensR4} /><View style={s.lensR5} />
            {/* Center glow */}
            <View style={s.centerGlow} />
            {/* Flare particles - animated */}
            <Animated.View style={[s.particle1, { transform: [{ translateY: particle1Y }] }]} />
            <Animated.View style={[s.particle2, { transform: [{ translateY: particle2Y }] }]} />
            <Animated.View style={[s.particle3, { transform: [{ translateY: particle1Y }] }]} />
            <Animated.View style={[s.particle4, { transform: [{ translateY: particle2Y }] }]} />
            <Animated.View style={[s.particle5, { transform: [{ translateY: particle1Y }] }]} />
            {/* Light streaks */}
            <Animated.View style={[s.streak1, { transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-250, width + 150] }) }] }]} />
            <View style={s.streak2} />
          </View>

          {/* BMS LOGO - Large centered with animated rings */}
          <View style={s.logoArea}>
            <Animated.View style={[s.logoGlow, { opacity: glowPulse }]} />
            <Animated.View style={[s.logoRing4, { transform: [{ rotate: ring2Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
            <Animated.View style={[s.logoRing3, { transform: [{ rotate: ring1Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />
            <Animated.View style={[s.logoRing2, { transform: [{ rotate: ring2Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
            <View style={s.logoRing1} />
            <View style={s.logoCore}>
              <Text style={s.logoBMS}>BMS</Text>
            </View>
          </View>

          {/* Brand */}
          <View style={s.brandArea}>
            <Text style={s.brandText}>B O O K M Y S H O T</Text>
            <View style={s.brandFlare} />
            <Text style={s.brandSub}>India's Premium Wedding Creator Marketplace</Text>
          </View>

          {/* Content */}
          <View style={s.heroContent}>
            <View style={s.tagRow}><View style={s.tagLine} /><Text style={s.tagText}>PREMIUM WEDDING CINEMA</Text><View style={s.tagLine} /></View>
            <Text style={s.h1White}>Capture Your</Text>
            <View style={{ overflow: 'hidden' }}>
              <Text style={s.h1Gold}>Dream Wedding</Text>
              <Animated.View style={[s.goldSweepOverlay, { transform: [{ translateX: goldSweep.interpolate({ inputRange: [0, 1], outputRange: [-width, width] }) }] }]} />
            </View>
            <Text style={s.h1White}>Experience</Text>
            <Text style={s.heroDesc}>Cinematic photographers, award-winning filmmakers & creative professionals — all verified.</Text>
            <View style={s.chipRow}>
              <View style={s.chip}><Ionicons name="checkmark-circle" size={13} color="#10B981" /><Text style={s.chipText}>Verified</Text></View>
              <View style={s.chip}><Ionicons name="star" size={13} color="#FFB347" /><Text style={s.chipText}>Real Reviews</Text></View>
              <View style={s.chip}><Ionicons name="flash" size={13} color="#A78BFA" /><Text style={s.chipText}>Fast Reply</Text></View>
            </View>
            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
                <Ionicons name="search" size={15} color="#000" /><Text style={s.btnPrimaryText}>Find Creator</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGlass} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
                <Text style={s.btnGlassText}>Explore</Text><Ionicons name="arrow-forward" size={13} color="#FFB347" />
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
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATEGORIES} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={i => i.id}
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

        {/* TESTIMONIALS */}
        <Text style={[s.secTitle, {marginTop: 32}]}>What Couples Say</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={testimonials} contentContainerStyle={{ paddingHorizontal: 20 }} keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={s.testCard}>
              <View style={s.testStars}>{[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={12} color={i <= (item.rating || 5) ? '#FF8C2B' : 'rgba(255,255,255,0.15)'} />)}</View>
              <Text style={s.testText}>"{item.review || item.text}"</Text>
              <View style={s.testBottom}><Text style={s.testName}>{item.name}</Text><Text style={s.testMeta}>{item.city} • {item.eventType || item.event}</Text></View>
              {(item.verifiedBooking || item.verified) && <View style={s.testBadge}><Ionicons name="checkmark-circle" size={10} color="#10B981" /><Text style={s.testBadgeText}>Verified Booking</Text></View>}
            </View>
          )} />

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

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.fLogo}>BOOKMYSHOT</Text>
          <Text style={s.fTag}>India's Premium Wedding Creator Marketplace</Text>
          <Text style={s.fAbout}>BookMyShot connects couples with verified photographers, videographers, drone operators and wedding filmmakers. Browse portfolios, compare creators and book the perfect team for your special day.</Text>
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
              <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Resources' })}><Text style={s.fLink}>Creator Resources</Text></TouchableOpacity>
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
          <View style={s.fDivider} />
          <Text style={s.fSocialTitle}>CONNECT WITH US</Text>
          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://instagram.com/bookmyshot')}><Ionicons name="logo-instagram" size={16} color="#FF8C2B" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://facebook.com/bookmyshot')}><Ionicons name="logo-facebook" size={16} color="#FF8C2B" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://youtube.com/@bookmyshot')}><Ionicons name="logo-youtube" size={16} color="#FF8C2B" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://linkedin.com/company/bookmyshot')}><Ionicons name="logo-linkedin" size={16} color="#FF8C2B" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://twitter.com/bookmyshot')}><Ionicons name="logo-twitter" size={16} color="#FF8C2B" /></TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL('https://wa.me/918492922173')}><Ionicons name="logo-whatsapp" size={16} color="#FF8C2B" /></TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 46, paddingBottom: 8 },
  logo: { fontSize: 15, fontWeight: '300', color: '#FF8C2B', letterSpacing: 6 },
  logoIcon: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#FF8C2B', alignItems: 'center', justifyContent: 'center' },
  logoAperture: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(245,185,66,0.4)' },
  logoDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF8C2B' },
  shimmer: { position: 'absolute', top: 0, left: 0, width: 50, height: '100%', backgroundColor: 'rgba(255,200,60,0.2)', transform: [{ skewX: '-20deg' }] },
  headerBtn: { padding: 4 },
  signInPill: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FF8C2B', borderRadius: 16 },
  signInText: { fontSize: 11, fontWeight: '700', color: '#000' },
  // Hero
  hero: { overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#030303' },
  // Left lens layers
  lensL1: { position: 'absolute', left: -100, top: 20, width: 280, height: 280, borderRadius: 140, borderWidth: 2.5, borderColor: 'rgba(255,140,43,0.09)' },
  lensL2: { position: 'absolute', left: -80, top: 40, width: 240, height: 240, borderRadius: 120, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.06)' },
  lensL3: { position: 'absolute', left: -60, top: 60, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,140,43,0.04)' },
  // Right lens layers (larger, more prominent)
  lensR1: { position: 'absolute', right: -80, top: 10, width: 300, height: 300, borderRadius: 150, borderWidth: 3, borderColor: 'rgba(255,140,43,0.08)' },
  lensR2: { position: 'absolute', right: -60, top: 30, width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: 'rgba(255,140,43,0.06)' },
  lensR3: { position: 'absolute', right: -40, top: 50, width: 220, height: 220, borderRadius: 110, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.05)' },
  lensR4: { position: 'absolute', right: -20, top: 70, width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: 'rgba(255,140,43,0.04)' },
  lensR5: { position: 'absolute', right: 0, top: 90, width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(255,255,255,0.025)' },
  // Center glow
  centerGlow: { position: 'absolute', top: 60, left: width / 2 - 100, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,140,43,0.04)' },
  // Particles
  particle1: { position: 'absolute', left: 40, top: 80, width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,140,43,0.4)' },
  particle2: { position: 'absolute', right: 60, top: 140, width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,180,71,0.35)' },
  particle3: { position: 'absolute', left: width * 0.3, top: 180, width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,200,100,0.25)' },
  particle4: { position: 'absolute', right: 100, top: 60, width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,160,50,0.3)' },
  particle5: { position: 'absolute', left: 80, top: 200, width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,140,43,0.4)' },
  // Streaks
  streak1: { position: 'absolute', top: 160, width: 160, height: 1.5, backgroundColor: 'rgba(255,180,71,0.12)', transform: [{ rotate: '-8deg' }] },
  streak2: { position: 'absolute', top: 100, left: 60, width: 80, height: 0.5, backgroundColor: 'rgba(255,200,100,0.08)', transform: [{ rotate: '15deg' }] },
  // Logo
  logoArea: { alignItems: 'center', justifyContent: 'center', marginTop: 36, height: 180 },
  logoGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,140,43,0.06)' },
  logoRing4: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: 'rgba(255,140,43,0.06)' },
  logoRing3: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.1)' },
  logoRing2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: 'rgba(255,140,43,0.15)' },
  logoRing1: { position: 'absolute', width: 95, height: 95, borderRadius: 47.5, borderWidth: 2.5, borderColor: 'rgba(255,140,43,0.2)' },
  logoCore: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,140,43,0.08)', borderWidth: 2, borderColor: 'rgba(255,140,43,0.35)', alignItems: 'center', justifyContent: 'center' },
  logoBMS: { fontSize: 26, fontWeight: '800', color: '#FF8C2B', letterSpacing: 3 },
  // Brand
  brandArea: { alignItems: 'center', marginTop: 18 },
  brandText: { fontSize: 18, fontWeight: '300', color: '#fff', letterSpacing: 5 },
  brandFlare: { width: 60, height: 2, backgroundColor: 'rgba(255,140,43,0.3)', marginVertical: 8, borderRadius: 1 },
  brandSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  // Content
  heroContent: { paddingHorizontal: 22, marginTop: 30, paddingBottom: 0 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  tagLine: { height: 1, width: 28, backgroundColor: 'rgba(255,140,43,0.5)' },
  tagText: { fontSize: 11, fontWeight: '700', color: '#FF8C2B', letterSpacing: 4 },
  h1White: { fontSize: 32, fontWeight: '300', color: '#fff', lineHeight: 40 },
  h1Gold: { fontSize: 36, fontWeight: '700', color: '#FFB347', lineHeight: 44, textShadowColor: 'rgba(255,140,43,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  goldSweepOverlay: { position: 'absolute', top: 0, left: 0, width: 80, height: '100%', backgroundColor: 'rgba(255,220,130,0.15)', transform: [{ skewX: '-15deg' }] },
  heroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 16, lineHeight: 21 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FF8C2B', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14 },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#000' },
  btnGlass: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.35)', backgroundColor: 'rgba(255,255,255,0.03)' },
  btnGlassText: { fontSize: 14, fontWeight: '600', color: '#FFB347' },
  // Stats
  statsBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 24, backgroundColor: 'rgba(15,12,8,0.96)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,140,43,0.12)' },
  stat: { flex: 1, alignItems: 'center' },
  counterNum: { fontSize: 17, fontWeight: '700', color: '#FF8C2B' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statDiv: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.05)' },
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
  fLogo: { fontSize: 14, fontWeight: '300', color: '#FF8C2B', letterSpacing: 5 },
  fTag: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
  fAbout: { fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 17, marginTop: 10 },
  fGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  fCol: { flex: 1 },
  fHead: { fontSize: 9, fontWeight: '700', color: '#FF8C2B', letterSpacing: 1.5, marginBottom: 8 },
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
