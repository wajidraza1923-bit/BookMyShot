/**
 * CinematicHero — Scroll-tied cinematic hero
 * BMS logo animates based on scroll position:
 * - At top: large centered logo with rings + glow
 * - On scroll: logo moves up, shrinks, fades → becomes navbar
 * - Hero text parallax fades
 * Accepts scrollY Animated.Value from parent ScrollView
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

interface Props {
  scrollY: Animated.Value;
  onNavigate: (screen: string) => void;
}

export default function CinematicHero({ scrollY, onNavigate }: Props) {
  // Intro animation
  const introScale = useRef(new Animated.Value(0.3)).current;
  const introGlow = useRef(new Animated.Value(0)).current;
  const introOverlay = useRef(new Animated.Value(1)).current;
  const contentReveal = useRef(new Animated.Value(0)).current;

  // Continuous
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const tickSlide = useRef(new Animated.Value(12)).current;
  const [actIdx, setActIdx] = useState(0);

  // INTRO (1.8s)
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(introScale, { toValue: 3.5, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(introGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(350),
      Animated.parallel([
        Animated.spring(introScale, { toValue: 1, tension: 22, friction: 7, useNativeDriver: true }),
        Animated.timing(introGlow, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.timing(introOverlay, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(contentReveal, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Loops
  useEffect(() => {
    Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2, { toValue: 1, duration: 28000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.55, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.25, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p1, { toValue: -9, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p1, { toValue: 9, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p2, { toValue: 7, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p2, { toValue: -7, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setActIdx(i => (i + 1) % ACTIVITIES.length);
      Animated.sequence([
        Animated.timing(tickSlide, { toValue: -8, duration: 0, useNativeDriver: true }),
        Animated.spring(tickSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 3500);
    return () => clearInterval(t);
  }, []);

  // ═══ SCROLL-TIED INTERPOLATIONS ═══
  // Logo: moves up, shrinks, fades as user scrolls (0→200px scroll range)
  const logoTranslateY = scrollY.interpolate({ inputRange: [0, 80, 200], outputRange: [0, -20, -120], extrapolate: 'clamp' });
  const logoScrollScale = scrollY.interpolate({ inputRange: [0, 60, 200], outputRange: [1, 1.1, 0.35], extrapolate: 'clamp' });
  const logoOpacity = scrollY.interpolate({ inputRange: [0, 150, 250], outputRange: [1, 0.6, 0], extrapolate: 'clamp' });
  // Content: parallax up + fade
  const contentTranslateY = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });
  const contentOpacity = scrollY.interpolate({ inputRange: [0, 150, 280], outputRange: [1, 0.7, 0], extrapolate: 'clamp' });

  return (
    <View style={st.wrap}>
      {/* Background */}
      <Animated.View style={[st.glowOrb, { opacity: glowPulse, transform: [{ scale: pulse }] }]} />
      <Animated.View style={[st.ray1, { opacity: glowPulse }]} />
      <Animated.View style={[st.ray2, { opacity: glowPulse }]} />
      {/* Particles */}
      <Animated.View style={[st.dot, { left: 22, top: 35, transform: [{ translateY: p1 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { right: 28, top: 60, transform: [{ translateY: p2 }] }]} />
      <Animated.View style={[st.dot, { left: width * 0.55, top: 25, transform: [{ translateX: p1 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { right: 50, top: 130, transform: [{ translateY: p1 }] }]} />
      <Animated.View style={[st.dot, { left: 45, top: 155, transform: [{ translateX: p2 }] }]} />

      {/* ═══ BMS LOGO — scroll-tied ═══ */}
      <Animated.View style={[st.logoArea, { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }, { scale: Animated.multiply(introScale, logoScrollScale) }] }]}>
        <Animated.View style={[st.logoGlow, { opacity: introGlow, transform: [{ scale: pulse }] }]} />
        <Animated.View style={[st.ringOuter, { transform: [{ rotate: ring2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />
        <Animated.View style={[st.ringInner, { transform: [{ rotate: ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: pulse }] }]} />
        <View style={st.logoCore}>
          <Text style={st.logoText}>BMS</Text>
        </View>
        <Animated.View style={[st.logoSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-25, 25] }) }, { rotate: '-18deg' }] }]} />
      </Animated.View>

      {/* ═══ CONTENT — scroll parallax ═══ */}
      <Animated.View style={[st.content, { opacity: Animated.multiply(contentReveal, contentOpacity), transform: [{ translateY: contentTranslateY }] }]}>
        <Text style={st.eyebrow}>INDIA'S PREMIUM WEDDING MARKETPLACE</Text>
        <Text style={st.h1Light}>Find Your Perfect</Text>
        <View style={{ overflow: 'hidden' }}>
          <Text style={st.h1Bold}>Wedding Creator</Text>
          <Animated.View style={[st.textSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width, width] }) }] }]} />
        </View>
        <Text style={st.sub}>Verified photographers, filmmakers and artists across India.</Text>

        <View style={st.statsRow}>
          <View style={st.statItem}><AnimCounter end={10000} /><Text style={st.cLabel}>Creators</Text></View>
          <View style={st.statDiv} />
          <View style={st.statItem}><AnimCounter end={50000} /><Text style={st.cLabel}>Bookings</Text></View>
          <View style={st.statDiv} />
          <View style={st.statItem}><AnimCounter end={100} /><Text style={st.cLabel}>Cities</Text></View>
        </View>

        <Animated.View style={[st.ticker, { transform: [{ translateY: tickSlide }] }]}>
          <View style={st.tickDot} />
          <Text style={st.tickIcon}>{ACTIVITIES[actIdx].icon}</Text>
          <Text style={st.tickText}>{ACTIVITIES[actIdx].text}</Text>
        </Animated.View>

        <View style={st.btns}>
          <TouchableOpacity style={st.btnP} onPress={() => onNavigate('Discover')} activeOpacity={0.85}>
            <Ionicons name="search" size={13} color="#000" /><Text style={st.btnPT}>Find Creator</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.btnO} onPress={() => onNavigate('Inquiry')} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color="#FFB347" /><Text style={st.btnOT}>Get Quote</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Intro overlay */}
      <Animated.View style={[st.overlay, { opacity: introOverlay }]} pointerEvents="none" />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width, paddingTop: 10, paddingBottom: 12, alignItems: 'center', backgroundColor: '#050505', overflow: 'hidden' },
  glowOrb: { position: 'absolute', top: 15, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(249,115,22,0.04)' },
  ray1: { position: 'absolute', top: 25, left: width * 0.38, width: 1.5, height: 160, backgroundColor: 'rgba(249,115,22,0.03)', transform: [{ rotate: '10deg' }] },
  ray2: { position: 'absolute', top: 20, right: width * 0.33, width: 1, height: 140, backgroundColor: 'rgba(249,115,22,0.02)', transform: [{ rotate: '-8deg' }] },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(249,115,22,0.5)' },
  dotSm: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(249,115,22,0.35)' },
  // Logo
  logoArea: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoGlow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(249,115,22,0.07)' },
  ringOuter: { position: 'absolute', width: 85, height: 85, borderRadius: 42.5, borderWidth: 1, borderColor: 'rgba(249,115,22,0.1)' },
  ringInner: { position: 'absolute', width: 66, height: 66, borderRadius: 33, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.18)' },
  logoCore: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(249,115,22,0.04)', borderWidth: 2, borderColor: 'rgba(249,115,22,0.35)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 14, fontWeight: '900', color: '#F97316', letterSpacing: 2 },
  logoSweep: { position: 'absolute', width: 5, height: 55, backgroundColor: 'rgba(255,220,150,0.05)', borderRadius: 3 },
  // Content
  content: { alignItems: 'center', paddingHorizontal: 20 },
  eyebrow: { fontSize: 7, fontWeight: '700', color: '#F97316', letterSpacing: 3.5, marginBottom: 8 },
  h1Light: { fontSize: 24, fontWeight: '200', color: '#fff', textAlign: 'center', lineHeight: 29 },
  h1Bold: { fontSize: 28, fontWeight: '800', color: '#FFB347', textAlign: 'center', lineHeight: 34, textShadowColor: 'rgba(249,115,22,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  textSweep: { position: 'absolute', top: 0, width: 55, height: '100%', backgroundColor: 'rgba(255,220,130,0.04)', transform: [{ skewX: '-15deg' }] },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 6, lineHeight: 16, maxWidth: 250 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.015)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.035)', borderRadius: 11, paddingVertical: 7, paddingHorizontal: 12, marginTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  cVal: { fontSize: 13, fontWeight: '800', color: '#F97316' },
  cLabel: { fontSize: 7, color: 'rgba(255,255,255,0.28)', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDiv: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.04)' },
  ticker: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.012)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  tickDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' },
  tickIcon: { fontSize: 9 },
  tickText: { fontSize: 8, color: 'rgba(255,255,255,0.3)' },
  btns: { flexDirection: 'row', gap: 9, marginTop: 12 },
  btnP: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F97316', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  btnPT: { fontSize: 12, fontWeight: '700', color: '#000' },
  btnO: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.25)', backgroundColor: 'rgba(255,255,255,0.01)' },
  btnOT: { fontSize: 12, fontWeight: '600', color: '#FFB347' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' },
});
