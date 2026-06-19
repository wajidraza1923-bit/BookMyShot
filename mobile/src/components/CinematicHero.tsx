/**
 * CinematicHero — Clean premium hero (Apple/Stripe/Linear style)
 * No stats, no images. Pure motion + typography + glass.
 * BMS logo with orbiting dots, live indicator, golden particles.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Props { scrollY: Animated.Value; onNavigate: (s: string) => void; }

export default function CinematicHero({ scrollY, onNavigate }: Props) {
  // Intro
  const introScale = useRef(new Animated.Value(0.3)).current;
  const introOverlay = useRef(new Animated.Value(1)).current;
  const contentReveal = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(16)).current;
  // Continuous
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.3)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0.6)).current;

  // Intro (1.6s)
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(introScale, { toValue: 3, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(introScale, { toValue: 1, tension: 25, friction: 7, useNativeDriver: true }),
        Animated.timing(introOverlay, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(contentReveal, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Loops
  useEffect(() => {
    Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 22000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2, { toValue: 1, duration: 32000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.55, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.25, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p1, { toValue: -8, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p1, { toValue: 8, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(p2, { toValue: 6, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(p2, { toValue: -6, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(livePulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(livePulse, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  // Scroll interpolations
  const logoY = scrollY.interpolate({ inputRange: [0, 80, 200], outputRange: [0, -15, -100], extrapolate: 'clamp' });
  const logoSS = scrollY.interpolate({ inputRange: [0, 60, 200], outputRange: [1, 1.08, 0.3], extrapolate: 'clamp' });
  const logoOp = scrollY.interpolate({ inputRange: [0, 150, 220], outputRange: [1, 0.5, 0], extrapolate: 'clamp' });
  const contentY = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -30], extrapolate: 'clamp' });
  const contentOp = scrollY.interpolate({ inputRange: [0, 140, 250], outputRange: [1, 0.6, 0], extrapolate: 'clamp' });

  return (
    <View style={st.wrap}>
      {/* BG */}
      <Animated.View style={[st.glowOrb, { opacity: glow, transform: [{ scale: pulse }] }]} />
      <Animated.View style={[st.ray1, { opacity: glow }]} />
      <Animated.View style={[st.ray2, { opacity: glow }]} />
      {/* Particles */}
      <Animated.View style={[st.dot, { left: 24, top: 30, transform: [{ translateY: p1 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { right: 32, top: 55, transform: [{ translateY: p2 }] }]} />
      <Animated.View style={[st.dot, { left: width * 0.58, top: 20, transform: [{ translateX: p1 }] }]} />
      <Animated.View style={[st.dot, st.dotSm, { left: 50, top: 120, transform: [{ translateX: p2 }] }]} />

      {/* ═══ BMS LOGO with orbiting dots + rings ═══ */}
      <Animated.View style={[st.logoWrap, { opacity: logoOp, transform: [{ translateY: logoY }, { scale: Animated.multiply(introScale, logoSS) }] }]}>
        <Animated.View style={[st.logoGlow, { opacity: glow, transform: [{ scale: pulse }] }]} />
        {/* Outer ring */}
        <Animated.View style={[st.ringOut, { transform: [{ rotate: ring2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />
        {/* Inner ring */}
        <Animated.View style={[st.ringIn, { transform: [{ rotate: ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: pulse }] }]} />
        {/* Orbiting golden dots */}
        <Animated.View style={[st.orbitWrap, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
          <View style={[st.orbitDot, { top: 0, left: '50%', marginLeft: -3 }]} />
          <View style={[st.orbitDot, st.orbitDotSm, { bottom: 0, left: '50%', marginLeft: -2 }]} />
          <View style={[st.orbitDot, st.orbitDotSm, { top: '50%', left: 0, marginTop: -2 }]} />
          <View style={[st.orbitDot, { top: '50%', right: 0, marginTop: -3 }]} />
        </Animated.View>
        {/* Core */}
        <View style={st.logoCore}><Text style={st.logoText}>BMS</Text></View>
        {/* Sweep */}
        <Animated.View style={[st.logoSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-22, 22] }) }, { rotate: '-18deg' }] }]} />
      </Animated.View>

      {/* LIVE indicator */}
      <Animated.View style={[st.liveWrap, { opacity: Animated.multiply(contentReveal, logoOp) }]}>
        <Animated.View style={[st.liveDot, { opacity: livePulse }]} />
        <Text style={st.liveText}>LIVE</Text>
        <Text style={st.liveCount}>24 creators online</Text>
      </Animated.View>

      {/* ═══ CONTENT ═══ */}
      <Animated.View style={[st.content, { opacity: Animated.multiply(contentReveal, contentOp), transform: [{ translateY: Animated.add(contentSlide, contentY) }] }]}>
        <Text style={st.eyebrow}>INDIA'S PREMIUM WEDDING MARKETPLACE</Text>
        <Text style={st.h1a}>Find Your Perfect</Text>
        <View style={{ overflow: 'hidden' }}>
          <Text style={st.h1b}>Wedding Creator</Text>
          <Animated.View style={[st.textSweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width, width] }) }] }]} />
        </View>
        <Text style={st.sub}>Verified photographers, filmmakers and wedding artists across India.</Text>

        {/* CTAs */}
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
  wrap: { width, paddingTop: 6, paddingBottom: 8, alignItems: 'center', backgroundColor: '#050505', overflow: 'hidden' },
  glowOrb: { position: 'absolute', top: 10, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(249,115,22,0.04)' },
  ray1: { position: 'absolute', top: 20, left: width * 0.4, width: 1.2, height: 130, backgroundColor: 'rgba(249,115,22,0.03)', transform: [{ rotate: '10deg' }] },
  ray2: { position: 'absolute', top: 15, right: width * 0.35, width: 0.8, height: 110, backgroundColor: 'rgba(249,115,22,0.02)', transform: [{ rotate: '-8deg' }] },
  dot: { position: 'absolute', width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: 'rgba(249,115,22,0.5)' },
  dotSm: { width: 1.5, height: 1.5, borderRadius: 0.75, backgroundColor: 'rgba(249,115,22,0.35)' },
  // Logo
  logoWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(249,115,22,0.07)' },
  ringOut: { position: 'absolute', width: 95, height: 95, borderRadius: 47.5, borderWidth: 1, borderColor: 'rgba(249,115,22,0.12)' },
  ringIn: { position: 'absolute', width: 74, height: 74, borderRadius: 37, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.18)' },
  orbitWrap: { position: 'absolute', width: 96, height: 96 },
  orbitDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(249,115,22,0.6)' },
  orbitDotSm: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(249,115,22,0.4)' },
  logoCore: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(249,115,22,0.04)', borderWidth: 2, borderColor: 'rgba(249,115,22,0.32)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 14, fontWeight: '900', color: '#F97316', letterSpacing: 2 },
  logoSweep: { position: 'absolute', width: 4, height: 55, backgroundColor: 'rgba(255,220,150,0.05)', borderRadius: 2 },
  // Live
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.015)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  liveText: { fontSize: 7, fontWeight: '800', color: '#10B981', letterSpacing: 1.5 },
  liveCount: { fontSize: 8, color: 'rgba(255,255,255,0.3)' },
  // Content
  content: { alignItems: 'center', paddingHorizontal: 12, width: '100%' },
  eyebrow: { fontSize: 8, fontWeight: '700', color: '#F97316', letterSpacing: 3, marginBottom: 10 },
  h1a: { fontSize: 26, fontWeight: '300', color: '#fff', textAlign: 'center', lineHeight: 32, width: '90%' },
  h1b: { fontSize: 30, fontWeight: '800', color: '#FFB347', textAlign: 'center', lineHeight: 38, textShadowColor: 'rgba(249,115,22,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16, width: '90%' },
  textSweep: { position: 'absolute', top: 0, width: 55, height: '100%', backgroundColor: 'rgba(255,220,130,0.04)', transform: [{ skewX: '-15deg' }] },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8, lineHeight: 18, width: '85%' },
  btns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnP: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 11, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnPT: { fontSize: 13, fontWeight: '700', color: '#000' },
  btnO: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.28)', backgroundColor: 'rgba(255,255,255,0.015)' },
  btnOT: { fontSize: 12, fontWeight: '600', color: '#FFB347' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' },
});
