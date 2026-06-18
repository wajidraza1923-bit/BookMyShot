/**
 * CinematicHero — Compact luxury hero with BMS logo intro animation
 * Reduced height, no excessive blank space, CTAs visible immediately
 * BMS logo: scales 0.2→5→1, glow pulse, then settles into hero
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ACTIVITIES = [
  { icon: '📸', text: 'Creator booked in Srinagar' },
  { icon: '⭐', text: 'Photographer hired in Delhi' },
  { icon: '💬', text: 'New inquiry from Rajouri' },
  { icon: '🎬', text: 'Filmmaker booked in Poonch' },
];

function AnimCounter({ end, suffix = '+' }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0; const step = Math.ceil(end / 35);
    const t = setInterval(() => { n += step; if (n >= end) { setVal(end); clearInterval(t); } else setVal(n); }, 40);
    return () => clearInterval(t);
  }, [end]);
  return <Text style={st.cVal}>{val.toLocaleString('en-IN')}{suffix}</Text>;
}

export default function CinematicHero({ onNavigate }: { onNavigate: (s: string) => void }) {
  // ═══ INTRO ANIMATION: BMS logo scales 0.2 → 5 → 1 ═══
  const logoScale = useRef(new Animated.Value(0.2)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const introOpacity = useRef(new Animated.Value(1)).current; // Full-screen intro overlay
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;

  // Continuous
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const tickSlide = useRef(new Animated.Value(15)).current;
  const [actIdx, setActIdx] = useState(0);

  // INTRO SEQUENCE (2s total)
  useEffect(() => {
    Animated.sequence([
      // Phase 1: Logo scales up big (0.2 → 5) with glow (0.6s)
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 5, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // Phase 2: Hold at large scale (0.4s)
      Animated.delay(400),
      // Phase 3: Shrink to hero position (0.7s) + reveal content
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 25, friction: 7, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        Animated.timing(introOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // CONTINUOUS LOOPS
  useEffect(() => {
    Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.25, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p1, { toValue: -10, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p1, { toValue: 10, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p2, { toValue: 8, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p2, { toValue: -8, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p3, { toValue: -7, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p3, { toValue: 7, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  // Activity ticker
  useEffect(() => {
    const t = setInterval(() => {
      setActIdx(i => (i + 1) % ACTIVITIES.length);
      Animated.sequence([
        Animated.timing(tickSlide, { toValue: -10, duration: 0, useNativeDriver: true }),
        Animated.spring(tickSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={st.wrap}>
      {/* Background depth */}
      <Animated.View style={[st.glowOrb, { opacity: glowPulse, transform: [{ scale: pulse }] }]} />
      <Animated.View style={[st.ray1, { opacity: glowPulse }]} />
      <Animated.View style={[st.ray2, { opacity: glowPulse }]} />

      {/* Particles */}
      <Animated.View style={[st.dot, { left: 20, top: 40, transform: [{ translateY: p1 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { right: 30, top: 70, transform: [{ translateY: p2 }] }]} />
      <Animated.View style={[st.dot, { left: width * 0.6, top: 30, transform: [{ translateX: p3 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { right: 50, top: 150, transform: [{ translateY: p1 }] }]} />
      <Animated.View style={[st.dot, { left: 40, top: 180, transform: [{ translateX: p2 }] }]} />

      {/* ═══ BMS ENERGY CORE ═══ */}
      <Animated.View style={[st.logoWrap, { transform: [{ scale: logoScale }] }]}>
        <Animated.View style={[st.logoGlowBg, { opacity: logoGlow, transform: [{ scale: pulse }] }]} />
        <Animated.View style={[st.ring2, { transform: [{ rotate: ring2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />
        <Animated.View style={[st.ring1, { transform: [{ rotate: ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: pulse }] }]} />
        <View style={st.logoCore}>
          <Text style={st.logoText}>B</Text>
        </View>
        <Animated.View style={[st.logoSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) }, { rotate: '-20deg' }] }]} />
      </Animated.View>

      {/* ═══ CONTENT ═══ */}
      <Animated.View style={[st.content, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
        <Text style={st.eyebrow}>INDIA'S PREMIUM WEDDING MARKETPLACE</Text>
        <Text style={st.h1Light}>Find Your Perfect</Text>
        <View style={{ overflow: 'hidden' }}>
          <Text style={st.h1Bold}>Wedding Creator</Text>
          <Animated.View style={[st.textSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width, width] }) }] }]} />
        </View>
        <Text style={st.sub}>Verified photographers, filmmakers and artists across India.</Text>

        {/* Stats */}
        <View style={st.statsRow}>
          <View style={st.statItem}><AnimCounter end={10000} /><Text style={st.cLabel}>Creators</Text></View>
          <View style={st.statDiv} />
          <View style={st.statItem}><AnimCounter end={50000} /><Text style={st.cLabel}>Bookings</Text></View>
          <View style={st.statDiv} />
          <View style={st.statItem}><AnimCounter end={100} /><Text style={st.cLabel}>Cities</Text></View>
        </View>

        {/* Ticker */}
        <Animated.View style={[st.ticker, { transform: [{ translateY: tickSlide }] }]}>
          <View style={st.tickDot} />
          <Text style={st.tickIcon}>{ACTIVITIES[actIdx].icon}</Text>
          <Text style={st.tickText}>{ACTIVITIES[actIdx].text}</Text>
        </Animated.View>

        {/* CTAs */}
        <View style={st.btns}>
          <TouchableOpacity style={st.btnP} onPress={() => onNavigate('Discover')} activeOpacity={0.85}>
            <Ionicons name="search" size={14} color="#000" /><Text style={st.btnPT}>Find Creator</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.btnO} onPress={() => onNavigate('Inquiry')} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color="#FFB347" /><Text style={st.btnOT}>Get Quote</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* INTRO OVERLAY (fades out after logo animation) */}
      <Animated.View style={[st.introOverlay, { opacity: introOpacity }]} pointerEvents="none" />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width, paddingTop: 12, paddingBottom: 14, alignItems: 'center', backgroundColor: '#050505', overflow: 'hidden' },
  // Background
  glowOrb: { position: 'absolute', top: 20, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(249,115,22,0.04)' },
  ray1: { position: 'absolute', top: 30, left: width * 0.4, width: 1.5, height: 180, backgroundColor: 'rgba(249,115,22,0.035)', transform: [{ rotate: '12deg' }] },
  ray2: { position: 'absolute', top: 20, right: width * 0.35, width: 1, height: 160, backgroundColor: 'rgba(249,115,22,0.025)', transform: [{ rotate: '-10deg' }] },
  // Particles
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(249,115,22,0.5)' },
  dotSm: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(249,115,22,0.35)' },
  // Logo
  logoWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoGlowBg: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(249,115,22,0.08)' },
  ring2: { position: 'absolute', width: 75, height: 75, borderRadius: 37.5, borderWidth: 1, borderColor: 'rgba(249,115,22,0.1)' },
  ring1: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.18)' },
  logoCore: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(249,115,22,0.05)', borderWidth: 2, borderColor: 'rgba(249,115,22,0.35)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 16, fontWeight: '900', color: '#F97316' },
  logoSweep: { position: 'absolute', width: 5, height: 60, backgroundColor: 'rgba(255,220,150,0.06)', borderRadius: 3 },
  // Content
  content: { alignItems: 'center', paddingHorizontal: 20 },
  eyebrow: { fontSize: 7, fontWeight: '700', color: '#F97316', letterSpacing: 3.5, marginBottom: 8 },
  h1Light: { fontSize: 24, fontWeight: '200', color: '#fff', textAlign: 'center', lineHeight: 30 },
  h1Bold: { fontSize: 28, fontWeight: '800', color: '#FFB347', textAlign: 'center', lineHeight: 34, textShadowColor: 'rgba(249,115,22,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  textSweep: { position: 'absolute', top: 0, width: 60, height: '100%', backgroundColor: 'rgba(255,220,130,0.05)', transform: [{ skewX: '-15deg' }] },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.38)', textAlign: 'center', marginTop: 8, lineHeight: 16, maxWidth: 260 },
  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginTop: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  cVal: { fontSize: 14, fontWeight: '800', color: '#F97316' },
  cLabel: { fontSize: 7, color: 'rgba(255,255,255,0.3)', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDiv: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  // Ticker
  ticker: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.015)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 },
  tickDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' },
  tickIcon: { fontSize: 10 },
  tickText: { fontSize: 8, color: 'rgba(255,255,255,0.35)' },
  // Buttons
  btns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnP: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 11, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnPT: { fontSize: 12, fontWeight: '700', color: '#000' },
  btnO: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.28)', backgroundColor: 'rgba(255,255,255,0.015)' },
  btnOT: { fontSize: 12, fontWeight: '600', color: '#FFB347' },
  // Intro overlay
  introOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' },
});
