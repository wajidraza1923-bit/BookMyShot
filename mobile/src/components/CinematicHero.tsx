/**
 * CinematicHero — Full-screen luxury hero section
 * Zero images. Pure motion + typography + glass + light + energy core.
 * Inspired by: Apple Vision Pro, Linear, Nothing, Stripe, Tesla
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = SCREEN_H - 64; // Full screen minus tab bar

// Activity feed data
const ACTIVITIES = [
  { icon: '📸', text: 'Creator booked in Srinagar' },
  { icon: '⭐', text: 'Photographer hired in Delhi' },
  { icon: '💬', text: 'New inquiry from Rajouri' },
  { icon: '🎬', text: 'Filmmaker booked in Poonch' },
  { icon: '📷', text: 'Portfolio updated in Jammu' },
];

function AnimCounter({ end, suffix = '+' }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0; const step = Math.ceil(end / 40);
    const t = setInterval(() => { n += step; if (n >= end) { setVal(end); clearInterval(t); } else setVal(n); }, 35);
    return () => clearInterval(t);
  }, [end]);
  return <Text style={st.counterVal}>{val.toLocaleString('en-IN')}{suffix}</Text>;
}

export default function CinematicHero({ onNavigate }: { onNavigate: (screen: string) => void }) {
  // ═══ ANIMATIONS ═══
  const fadeIn = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(40)).current;
  const coreScale = useRef(new Animated.Value(0.6)).current;
  const coreOpacity = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(30)).current;
  const tickSlide = useRef(new Animated.Value(20)).current;
  const [actIdx, setActIdx] = useState(0);

  // Intro sequence
  useEffect(() => {
    Animated.sequence([
      // Phase 1: Core appears
      Animated.parallel([
        Animated.spring(coreScale, { toValue: 1, tension: 15, friction: 6, useNativeDriver: true }),
        Animated.timing(coreOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      // Phase 2: Text reveals
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(textSlide, { toValue: 0, tension: 30, friction: 8, useNativeDriver: true }),
      ]),
      // Phase 3: Buttons
      Animated.spring(btnSlide, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Continuous loops
  useEffect(() => {
    // Ring rotations
    Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring3, { toValue: 1, duration: 45000, easing: Easing.linear, useNativeDriver: true })).start();
    // Pulse
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    // Glow
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.3, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    // Particles
    Animated.loop(Animated.sequence([
      Animated.timing(p1, { toValue: -12, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p1, { toValue: 12, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p2, { toValue: 10, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p2, { toValue: -10, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p3, { toValue: -8, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p3, { toValue: 8, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    // Sweep
    Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(sweep, { toValue: 1, duration: 1500, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  // Activity ticker
  useEffect(() => {
    const t = setInterval(() => {
      setActIdx(i => (i + 1) % ACTIVITIES.length);
      Animated.sequence([
        Animated.timing(tickSlide, { toValue: -15, duration: 0, useNativeDriver: true }),
        Animated.spring(tickSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={st.container}>
      {/* ═══ BACKGROUND LAYERS ═══ */}
      <Animated.View style={[st.glowOrb, { opacity: glowPulse, transform: [{ scale: pulse }] }]} />
      <View style={st.fogLayer1} />
      <View style={st.fogLayer2} />

      {/* Light rays */}
      <Animated.View style={[st.ray1, { opacity: glowPulse }]} />
      <Animated.View style={[st.ray2, { opacity: glowPulse }]} />
      <Animated.View style={[st.ray3, { opacity: glowPulse }]} />

      {/* Particles */}
      <Animated.View style={[st.dot, { left: 30, top: HERO_H * 0.15, transform: [{ translateY: p1 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { right: 40, top: HERO_H * 0.25, transform: [{ translateY: p2 }] }]} />
      <Animated.View style={[st.dot, { left: width * 0.6, top: HERO_H * 0.1, transform: [{ translateX: p3 }] }]} />
      <Animated.View style={[st.dot, st.dotLg, { right: 25, top: HERO_H * 0.45, transform: [{ translateY: p1 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { left: 50, top: HERO_H * 0.55, transform: [{ translateX: p2 }] }]} />
      <Animated.View style={[st.dot, { left: width * 0.75, top: HERO_H * 0.35, transform: [{ translateY: p3 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { left: width * 0.2, top: HERO_H * 0.7, transform: [{ translateX: p3 }] }]} />
      <Animated.View style={[st.dot, { right: 55, top: HERO_H * 0.65, transform: [{ translateY: p2 }] }]} />

      {/* ═══ ENERGY CORE ═══ */}
      <Animated.View style={[st.coreWrap, { opacity: coreOpacity, transform: [{ scale: coreScale }] }]}>
        {/* Outer glow */}
        <Animated.View style={[st.coreGlow, { opacity: glowPulse, transform: [{ scale: pulse }] }]} />
        {/* Ring 3 (outermost) */}
        <Animated.View style={[st.coreRing3, { transform: [{ rotate: ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
        {/* Ring 2 */}
        <Animated.View style={[st.coreRing2, { transform: [{ rotate: ring2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />
        {/* Ring 1 */}
        <Animated.View style={[st.coreRing1, { transform: [{ rotate: ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: pulse }] }]} />
        {/* Inner core */}
        <View style={st.coreInner}>
          <Text style={st.coreLogo}>B</Text>
        </View>
        {/* Light sweep */}
        <Animated.View style={[st.coreSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] }) }, { rotate: '-20deg' }] }]} />
      </Animated.View>

      {/* ═══ TYPOGRAPHY ═══ */}
      <Animated.View style={[st.textBlock, { opacity: fadeIn, transform: [{ translateY: textSlide }] }]}>
        <Text style={st.eyebrow}>INDIA'S PREMIUM WEDDING MARKETPLACE</Text>
        <Text style={st.h1Light}>Find Your Perfect</Text>
        <View style={{ overflow: 'hidden' }}>
          <Text style={st.h1Bold}>Wedding Creator</Text>
          <Animated.View style={[st.textSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width, width] }) }] }]} />
        </View>
        <Text style={st.sub}>Verified photographers, filmmakers and artists across India.</Text>
      </Animated.View>

      {/* ═══ TRUST BADGES ═══ */}
      <Animated.View style={[st.trustRow, { opacity: fadeIn }]}>
        <View style={st.trustChip}><Ionicons name="checkmark-circle" size={11} color="#10B981" /><Text style={st.trustText}>Verified</Text></View>
        <View style={st.trustChip}><Ionicons name="star" size={11} color="#F97316" /><Text style={st.trustText}>4.9 Rated</Text></View>
        <View style={st.trustChip}><Ionicons name="lock-closed" size={11} color="#3B82F6" /><Text style={st.trustText}>Secure</Text></View>
      </Animated.View>

      {/* ═══ STATS ═══ */}
      <Animated.View style={[st.statsRow, { opacity: fadeIn }]}>
        <View style={st.statItem}><AnimCounter end={10000} /><Text style={st.statLabel}>Creators</Text></View>
        <View style={st.statDivider} />
        <View style={st.statItem}><AnimCounter end={50000} /><Text style={st.statLabel}>Bookings</Text></View>
        <View style={st.statDivider} />
        <View style={st.statItem}><AnimCounter end={100} /><Text style={st.statLabel}>Cities</Text></View>
      </Animated.View>

      {/* ═══ ACTIVITY TICKER ═══ */}
      <Animated.View style={[st.tickerWrap, { transform: [{ translateY: tickSlide }] }]}>
        <View style={st.tickerDot} />
        <Text style={st.tickerIcon}>{ACTIVITIES[actIdx].icon}</Text>
        <Text style={st.tickerText}>{ACTIVITIES[actIdx].text}</Text>
      </Animated.View>

      {/* ═══ CTAs ═══ */}
      <Animated.View style={[st.ctaRow, { transform: [{ translateY: btnSlide }] }]}>
        <TouchableOpacity style={st.btnPrimary} onPress={() => onNavigate('Discover')} activeOpacity={0.85}>
          <Ionicons name="search" size={14} color="#000" /><Text style={st.btnPText}>Find Creator</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.btnOutline} onPress={() => onNavigate('Inquiry')} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color="#FFB347" /><Text style={st.btnOText}>Get Quote</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { width, height: HERO_H, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Background
  glowOrb: { position: 'absolute', top: HERO_H * 0.18, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(249,115,22,0.035)' },
  fogLayer1: { position: 'absolute', top: HERO_H * 0.3, left: -60, width: width + 120, height: 180, backgroundColor: 'rgba(249,115,22,0.006)', borderRadius: 90, transform: [{ rotate: '-4deg' }] },
  fogLayer2: { position: 'absolute', bottom: HERO_H * 0.2, right: -40, width: width * 0.7, height: 120, backgroundColor: 'rgba(249,115,22,0.004)', borderRadius: 60, transform: [{ rotate: '3deg' }] },
  // Rays
  ray1: { position: 'absolute', top: HERO_H * 0.2, left: width * 0.35, width: 1.5, height: HERO_H * 0.4, backgroundColor: 'rgba(249,115,22,0.04)', transform: [{ rotate: '12deg' }] },
  ray2: { position: 'absolute', top: HERO_H * 0.15, right: width * 0.3, width: 1, height: HERO_H * 0.35, backgroundColor: 'rgba(249,115,22,0.03)', transform: [{ rotate: '-8deg' }] },
  ray3: { position: 'absolute', top: HERO_H * 0.25, left: width * 0.5, width: 0.8, height: HERO_H * 0.3, backgroundColor: 'rgba(255,179,71,0.025)', transform: [{ rotate: '20deg' }] },
  // Particles
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(249,115,22,0.5)' },
  dotSm: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(249,115,22,0.35)' },
  dotLg: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(249,115,22,0.25)' },
  // Energy Core
  coreWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  coreGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(249,115,22,0.06)' },
  coreRing3: { position: 'absolute', width: 135, height: 135, borderRadius: 67.5, borderWidth: 0.5, borderColor: 'rgba(249,115,22,0.08)', borderStyle: 'dashed' },
  coreRing2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.12)' },
  coreRing1: { position: 'absolute', width: 85, height: 85, borderRadius: 42.5, borderWidth: 2, borderColor: 'rgba(249,115,22,0.2)' },
  coreInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(249,115,22,0.06)', borderWidth: 2, borderColor: 'rgba(249,115,22,0.35)', alignItems: 'center', justifyContent: 'center' },
  coreLogo: { fontSize: 22, fontWeight: '900', color: '#F97316', letterSpacing: 1 },
  coreSweep: { position: 'absolute', width: 8, height: 100, backgroundColor: 'rgba(255,220,150,0.05)', borderRadius: 4 },
  // Typography
  textBlock: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  eyebrow: { fontSize: 8, fontWeight: '700', color: '#F97316', letterSpacing: 4, marginBottom: 12 },
  h1Light: { fontSize: 28, fontWeight: '200', color: '#fff', textAlign: 'center', lineHeight: 34 },
  h1Bold: { fontSize: 34, fontWeight: '800', color: '#FFB347', textAlign: 'center', lineHeight: 42, textShadowColor: 'rgba(249,115,22,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  textSweep: { position: 'absolute', top: 0, width: 70, height: '100%', backgroundColor: 'rgba(255,220,130,0.06)', transform: [{ skewX: '-15deg' }] },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 10, lineHeight: 18, maxWidth: 280 },
  // Trust
  trustRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  trustChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  trustText: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  counterVal: { fontSize: 15, fontWeight: '800', color: '#F97316' },
  statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.05)' },
  // Ticker
  tickerWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  tickerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  tickerIcon: { fontSize: 11 },
  tickerText: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  // CTAs
  ctaRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F97316', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12, shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
  btnPText: { fontSize: 13, fontWeight: '700', color: '#000' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.3)', backgroundColor: 'rgba(255,255,255,0.02)' },
  btnOText: { fontSize: 13, fontWeight: '600', color: '#FFB347' },
});
