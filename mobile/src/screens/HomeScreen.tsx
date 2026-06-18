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
  const [categories, setCategories] = useState<any[]>(CATEGORIES_DEFAULT);
  const [testimonials, setTestimonials] = useState<any[]>(TESTIMONIALS);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const goldSweep = useRef(new Animated.Value(0)).current;
  // Luxury animations
  const lensRotate = useRef(new Animated.Value(0)).current;
  const lensPulse = useRef(new Animated.Value(1)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;
  const activitySlide = useRef(new Animated.Value(40)).current;
  const shutterAnim = useRef(new Animated.Value(0)).current;

  // Shimmer loop for header logo
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, []);

  // Gold sweep on "Dream Wedding" every 4s
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(4000),
      Animated.timing(goldSweep, { toValue: 1, duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(goldSweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  // Lens rotation + pulse (subtle breathing)
  useEffect(() => {
    Animated.loop(Animated.timing(lensRotate, { toValue: 1, duration: 25000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(lensPulse, { toValue: 1.04, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(lensPulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  // Golden particles floating
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(particle1, { toValue: -10, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(particle1, { toValue: 10, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(particle2, { toValue: 8, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(particle2, { toValue: -8, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(particle3, { toValue: -6, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(particle3, { toValue: 6, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  // Shutter opening on load
  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(shutterAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  // Activity feed animation
  const [activityIdx, setActivityIdx] = useState(0);
  const ACTIVITIES = [
    { icon: '📸', text: 'New booking confirmed in Srinagar', time: '2m ago' },
    { icon: '⭐', text: 'Creator rated 5 stars in Jammu', time: '5m ago' },
    { icon: '💬', text: 'New inquiry from Rajouri', time: '8m ago' },
    { icon: '🎬', text: 'Cinematographer booked in Poonch', time: '12m ago' },
    { icon: '📷', text: 'Portfolio updated by creator', time: '15m ago' },
  ];
  useEffect(() => {
    const t = setInterval(() => {
      setActivityIdx(i => (i + 1) % ACTIVITIES.length);
      Animated.sequence([
        Animated.timing(activitySlide, { toValue: -20, duration: 0, useNativeDriver: true }),
        Animated.spring(activitySlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes, featuredRes, catsRes] = await Promise.all([
        creatorsAPI.getAll(),
        api.get('/promotions/featured-status').catch(() => ({ data: { slots: {} } })),
        api.get('/discover/categories').catch(() => ({ data: { data: [] } })),
      ]);

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

        {/* ═══ CINEMATIC HERO ═══ */}
        <Animated.View style={[s.heroWrap, { opacity: fadeAnim }]}>
          {/* Depth layers */}
          <View style={s.heroBg1} />
          <View style={s.heroBg2} />

          {/* Gold particles */}
          <Animated.View style={[s.gp, { left: 20, top: 50, transform: [{ translateY: particle1 }] }]} />
          <Animated.View style={[s.gp, s.gpSm, { right: 35, top: 80, transform: [{ translateY: particle2 }] }]} />
          <Animated.View style={[s.gp, { left: width * 0.5, top: 30, transform: [{ translateX: particle3 }] }]} />
          <Animated.View style={[s.gp, s.gpLg, { right: 15, top: 160, transform: [{ translateY: particle1 }] }]} />
          <Animated.View style={[s.gp, s.gpSm, { left: 45, top: 190, transform: [{ translateX: particle2 }] }]} />
          <Animated.View style={[s.gp, { left: width * 0.7, top: 120, transform: [{ translateY: particle3 }] }]} />

          {/* CAMERA LENS */}
          <Animated.View style={[s.lens, { transform: [{ scale: shutterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
            <Animated.View style={[s.lGlow, { opacity: lensPulse.interpolate({ inputRange: [1, 1.04], outputRange: [0.25, 0.55] }), transform: [{ scale: lensPulse }] }]} />
            <Animated.View style={[s.lR6, { transform: [{ rotate: lensRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
            <Animated.View style={[s.lR5, { transform: [{ rotate: lensRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] }) }] }]} />
            <Animated.View style={[s.lR4, { transform: [{ rotate: lensRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '120deg'] }) }] }]} />
            <Animated.View style={[s.lR3, { transform: [{ rotate: lensRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-240deg'] }) }] }]} />
            <Animated.View style={[s.lR2, { transform: [{ rotate: lensRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }]} />
            <View style={s.lR1} />
            {/* Glass reflection */}
            <Animated.View style={[s.lRefl, { transform: [{ translateX: goldSweep.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] }) }, { rotate: '-22deg' }] }]} />
            {/* Core */}
            <Animated.View style={[s.lCore, { transform: [{ scale: shutterAnim }] }]}>
              <Text style={s.lBMS}>BMS</Text>
            </Animated.View>
            {/* Flare */}
            <Animated.View style={[s.lFlare, { opacity: lensPulse.interpolate({ inputRange: [1, 1.04], outputRange: [0, 0.35] }) }]} />
          </Animated.View>

          {/* Content */}
          <Animated.View style={[s.heroContent, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.heroEyebrow}>INDIA'S PREMIUM WEDDING MARKETPLACE</Text>
            <Text style={s.h1a}>Find Your Perfect</Text>
            <View style={{ overflow: 'hidden' }}>
              <Text style={s.h1b}>Wedding Creator</Text>
              <Animated.View style={[s.goldSweep, { transform: [{ translateX: goldSweep.interpolate({ inputRange: [0, 1], outputRange: [-width, width] }) }] }]} />
            </View>
            <Text style={s.heroSub}>10,000+ verified photographers, filmmakers & artists</Text>

            {/* Activity ticker */}
            <Animated.View style={[s.ticker, { transform: [{ translateY: activitySlide }] }]}>
              <View style={s.tickDot} />
              <Text style={s.tickIcon}>{ACTIVITIES[activityIdx].icon}</Text>
              <Text style={s.tickText} numberOfLines={1}>{ACTIVITIES[activityIdx].text}</Text>
            </Animated.View>

            {/* Stat cards */}
            <View style={s.statCards}>
              <View style={s.statCard}><Text style={s.scNum}>10K+</Text><Text style={s.scLabel}>Creators</Text></View>
              <View style={s.statCard}><Text style={s.scNum}>5K+</Text><Text style={s.scLabel}>Weddings</Text></View>
              <View style={s.statCard}><Text style={s.scNum}>100+</Text><Text style={s.scLabel}>Cities</Text></View>
            </View>

            {/* Trust */}
            <View style={s.trustRow}>
              <View style={s.trustItem}><Ionicons name="checkmark-circle" size={12} color="#10B981" /><Text style={s.trustTxt}>Verified</Text></View>
              <View style={s.trustItem}><Ionicons name="star" size={12} color="#FFB347" /><Text style={s.trustTxt}>4.9 Rated</Text></View>
              <View style={s.trustItem}><Ionicons name="lock-closed" size={12} color="#3B82F6" /><Text style={s.trustTxt}>Secure</Text></View>
            </View>

            {/* CTAs */}
            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('Discover')} activeOpacity={0.85}>
                <Ionicons name="search" size={14} color="#000" /><Text style={s.btnPrimaryText}>Find Creator</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGlass} onPress={() => navigation.navigate('Inquiry')} activeOpacity={0.85}>
                <Ionicons name="chatbubble-ellipses-outline" size={13} color="#FFB347" /><Text style={s.btnGlassText}>Get Quote</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>

        {/* HERO CONTENT — below fold */}
        <Animated.View style={{ opacity: fadeAnim }}>

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
  heroWrap: { paddingBottom: 10, position: 'relative', overflow: 'hidden' },
  heroBg1: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: 'rgba(255,140,43,0.012)' },
  heroBg2: { position: 'absolute', top: 60, left: -40, width: width + 80, height: 180, backgroundColor: 'rgba(255,100,20,0.008)', borderRadius: 90, transform: [{ rotate: '-4deg' }] },
  gp: { position: 'absolute', width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: 'rgba(255,160,40,0.4)' },
  gpSm: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,180,60,0.3)' },
  gpLg: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,140,43,0.2)' },
  // Lens
  lens: { alignSelf: 'center', width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  lGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,140,43,0.05)' },
  lR6: { position: 'absolute', width: 148, height: 148, borderRadius: 74, borderWidth: 0.5, borderColor: 'rgba(255,140,43,0.06)' },
  lR5: { position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 1, borderColor: 'rgba(255,140,43,0.08)' },
  lR4: { position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.11)' },
  lR3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(255,140,43,0.14)' },
  lR2: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: 'rgba(255,140,43,0.18)' },
  lR1: { position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, borderColor: 'rgba(255,140,43,0.24)' },
  lRefl: { position: 'absolute', width: 10, height: 120, backgroundColor: 'rgba(255,220,150,0.06)', borderRadius: 5 },
  lCore: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,140,43,0.05)', borderWidth: 2, borderColor: 'rgba(255,140,43,0.35)', alignItems: 'center', justifyContent: 'center' },
  lBMS: { fontSize: 16, fontWeight: '900', color: '#FF8C2B', letterSpacing: 2.5 },
  lFlare: { position: 'absolute', top: -8, right: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,200,100,0.15)' },
  // Content
  heroContent: { paddingHorizontal: 20 },
  heroEyebrow: { fontSize: 8, fontWeight: '700', color: '#FF8C2B', letterSpacing: 3, textAlign: 'center', marginBottom: 8 },
  h1a: { fontSize: 26, fontWeight: '300', color: '#fff', textAlign: 'center', lineHeight: 32 },
  h1b: { fontSize: 30, fontWeight: '700', color: '#FFB347', textAlign: 'center', lineHeight: 38, textShadowColor: 'rgba(255,140,43,0.2)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  goldSweep: { position: 'absolute', top: 0, left: 0, width: 50, height: '100%', backgroundColor: 'rgba(255,220,130,0.1)', transform: [{ skewX: '-15deg' }] },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  // Ticker
  ticker: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  tickDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  tickIcon: { fontSize: 11 },
  tickText: { fontSize: 9, color: 'rgba(255,255,255,0.4)', maxWidth: width * 0.55 },
  // Stat cards
  statCards: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  statCard: { backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 80 },
  scNum: { fontSize: 16, fontWeight: '800', color: '#FF8C2B' },
  scLabel: { fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Trust
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 12 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trustTxt: { fontSize: 9, color: 'rgba(255,255,255,0.45)' },
  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'center' },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF8C2B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#000' },
  btnGlass: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,140,43,0.3)', backgroundColor: 'rgba(255,255,255,0.02)' },
  btnGlassText: { fontSize: 13, fontWeight: '600', color: '#FFB347' },
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
