/**
 * PremiumHero — Cinematic pseudo-3D camera lens hero section
 * Uses: React Native Animated API with perspective transforms,
 * multi-layer parallax, glass reflections, dynamic shadows,
 * particle system, gradient lighting, shutter animation
 * 
 * Target: 60fps on all devices via useNativeDriver
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';

const { width, height: SCREEN_H } = Dimensions.get('window');
const LENS_SIZE = Math.min(width * 0.82, 320);
const CENTER = LENS_SIZE / 2;

// Golden particle positions (pre-calculated for performance)
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: Math.random() * width,
  y: 40 + Math.random() * 280,
  size: 1.5 + Math.random() * 3.5,
  opacity: 0.15 + Math.random() * 0.35,
  speed: 2500 + Math.random() * 4000,
  delay: Math.random() * 2000,
  drift: 6 + Math.random() * 12,
}));

// Bokeh light positions
const BOKEH = Array.from({ length: 8 }, (_, i) => ({
  x: 20 + Math.random() * (width - 60),
  y: 60 + Math.random() * 240,
  size: 12 + Math.random() * 28,
  opacity: 0.03 + Math.random() * 0.06,
  speed: 4000 + Math.random() * 3000,
}));

export default function PremiumHero() {
  // ─── ANIMATION VALUES ───
  const introOpacity = useRef(new Animated.Value(0)).current;
  const lensY = useRef(new Animated.Value(-80)).current;
  const lensScale = useRef(new Animated.Value(1.2)).current;
  const shutterOpen = useRef(new Animated.Value(0)).current;
  const logoReveal = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(30)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  // Continuous animations
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const ring4 = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const sweep = useRef(new Animated.Value(-1)).current;
  const flare = useRef(new Animated.Value(0)).current;

  // Particles
  const particleAnims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;
  const particleDrift = useRef(PARTICLES.map(() => new Animated.Value(0))).current;
  const bokehAnims = useRef(BOKEH.map(() => new Animated.Value(0))).current;

  // ─── INTRO SEQUENCE ───
  useEffect(() => {
    Animated.sequence([
      // Phase 1: Particles appear
      Animated.timing(introOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      // Phase 2: Lens descends and scales
      Animated.parallel([
        Animated.spring(lensY, { toValue: 0, tension: 12, friction: 8, useNativeDriver: true }),
        Animated.spring(lensScale, { toValue: 1, tension: 14, friction: 7, useNativeDriver: true }),
      ]),
      // Phase 3: Shutter opens
      Animated.timing(shutterOpen, { toValue: 1, duration: 700, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      // Phase 4: Logo reveals
      Animated.timing(logoReveal, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      // Phase 5: Brand text slides in
      Animated.parallel([
        Animated.spring(brandSlide, { toValue: 0, tension: 30, friction: 8, useNativeDriver: true }),
        Animated.timing(brandOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ─── CONTINUOUS LOOPS ───
  useEffect(() => {
    // Ring rotations at different speeds
    Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2, { toValue: 1, duration: 25000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring3, { toValue: 1, duration: 35000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring4, { toValue: 1, duration: 50000, easing: Easing.linear, useNativeDriver: true })).start();

    // Breathing
    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.03, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0.98, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    // Glow pulse
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.7, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.3, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    // Light sweep
    Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(sweep, { toValue: 1, duration: 1500, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();

    // Lens flare
    Animated.loop(Animated.sequence([
      Animated.delay(7000),
      Animated.timing(flare, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(flare, { toValue: 0, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ])).start();

    // Particles
    PARTICLES.forEach((p, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(particleAnims[i], { toValue: -p.drift, duration: p.speed, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(particleAnims[i], { toValue: p.drift * 0.6, duration: p.speed * 0.8, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(particleAnims[i], { toValue: 0, duration: p.speed * 0.5, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(particleDrift[i], { toValue: p.drift * 0.4, duration: p.speed * 1.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(particleDrift[i], { toValue: -p.drift * 0.3, duration: p.speed, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    });

    // Bokeh
    BOKEH.forEach((b, i) => {
      Animated.loop(Animated.sequence([
        Animated.timing(bokehAnims[i], { toValue: 1, duration: b.speed, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bokehAnims[i], { toValue: 0, duration: b.speed, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    });
  }, []);

  return (
    <Animated.View style={[st.container, { opacity: introOpacity }]}>
      {/* ═══ BACKGROUND LAYERS ═══ */}

      {/* Fog / gradient depth layers */}
      <View style={st.fogLayer1} />
      <View style={st.fogLayer2} />

      {/* Bokeh lights */}
      {BOKEH.map((b, i) => (
        <Animated.View key={`bk${i}`} style={[st.bokeh, {
          left: b.x, top: b.y, width: b.size, height: b.size, borderRadius: b.size / 2,
          opacity: bokehAnims[i].interpolate({ inputRange: [0, 1], outputRange: [b.opacity, b.opacity * 2.5] }),
          transform: [{ scale: bokehAnims[i].interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
        }]} />
      ))}

      {/* Golden particles */}
      {PARTICLES.map((p, i) => (
        <Animated.View key={`pt${i}`} style={[st.particle, {
          left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: p.size / 2,
          opacity: p.opacity,
          transform: [{ translateY: particleAnims[i] }, { translateX: particleDrift[i] }],
        }]} />
      ))}

      {/* Light rays */}
      <Animated.View style={[st.lightRay1, { opacity: glowPulse }]} />
      <Animated.View style={[st.lightRay2, { opacity: glowPulse, transform: [{ rotate: '45deg' }] }]} />

      {/* ═══ CAMERA LENS SYSTEM ═══ */}
      <Animated.View style={[st.lensContainer, {
        transform: [{ translateY: lensY }, { scale: lensScale }, { perspective: 800 }],
      }]}>
        {/* Outer shadow for depth */}
        <Animated.View style={[st.lensShadow, { opacity: glowPulse, transform: [{ scale: breathe }] }]} />

        {/* Ring 7 — outermost metallic */}
        <Animated.View style={[st.ring7, { transform: [{ rotate: ring4.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />

        {/* Ring 6 — glass reflection */}
        <Animated.View style={[st.ring6, { transform: [{ rotate: ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />

        {/* Ring 5 — metallic texture */}
        <Animated.View style={[st.ring5, { transform: [{ rotate: ring4.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }, { scale: breathe }] }]} />

        {/* Ring 4 */}
        <Animated.View style={[st.ring4, { transform: [{ rotate: ring2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />

        {/* Ring 3 — counter-rotate for depth */}
        <Animated.View style={[st.ring3, { transform: [{ rotate: ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />

        {/* Ring 2 — inner glass */}
        <Animated.View style={[st.ring2, { transform: [{ rotate: ring2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />

        {/* Ring 1 — inner metallic */}
        <View style={st.ring1} />

        {/* Shutter blades (8 triangular sections closing/opening) */}
        <Animated.View style={[st.shutterContainer, {
          opacity: shutterOpen.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.6, 0] }),
          transform: [{ scale: shutterOpen.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
                       { rotate: shutterOpen.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
        }]}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <View key={deg} style={[st.shutterBlade, { transform: [{ rotate: `${deg}deg` }] }]} />
          ))}
        </Animated.View>

        {/* Core — BMS Logo (revealed after shutter) */}
        <Animated.View style={[st.core, { opacity: logoReveal, transform: [{ scale: logoReveal.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
          <Text style={st.bmsText}>BMS</Text>
        </Animated.View>

        {/* Glass reflection overlay */}
        <Animated.View style={[st.glassReflection, {
          transform: [{ translateX: sweep.interpolate({ inputRange: [-1, 1], outputRange: [-LENS_SIZE, LENS_SIZE] }) },
                       { rotate: '-25deg' }],
        }]} />

        {/* Lens flare */}
        <Animated.View style={[st.lensFlare, { opacity: flare }]} />

        {/* Focus ticks */}
        <Animated.View style={[st.focusRingOuter, { transform: [{ rotate: ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '60deg'] }) }] }]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={[st.tick, { transform: [{ rotate: `${i * 30}deg` }, { translateY: -(LENS_SIZE / 2 - 6) }] }]} />
          ))}
        </Animated.View>
      </Animated.View>

      {/* ═══ BRAND TEXT ═══ */}
      <Animated.View style={[st.brandArea, { opacity: brandOpacity, transform: [{ translateY: brandSlide }] }]}>
        <Text style={st.brandName}>B O O K M Y S H O T</Text>
        <View style={st.brandLine} />
        <Text style={st.brandTag}>India's Premium Wedding Creator Marketplace</Text>
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  container: { width: '100%', height: 420, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Background
  fogLayer1: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,140,43,0.012)' },
  fogLayer2: { position: 'absolute', top: 50, left: -50, width: width + 100, height: 300, backgroundColor: 'rgba(255,120,30,0.008)', borderRadius: 150, transform: [{ rotate: '-3deg' }] },
  bokeh: { position: 'absolute', backgroundColor: 'rgba(255,180,60,0.08)' },
  particle: { position: 'absolute', backgroundColor: 'rgba(255,160,40,1)' },
  lightRay1: { position: 'absolute', top: 100, left: width / 2 - 120, width: 240, height: 1, backgroundColor: 'rgba(255,140,43,0.06)' },
  lightRay2: { position: 'absolute', top: 80, left: width / 2 - 80, width: 160, height: 0.5, backgroundColor: 'rgba(255,180,80,0.04)' },
  // Lens
  lensContainer: { width: LENS_SIZE, height: LENS_SIZE, alignItems: 'center', justifyContent: 'center' },
  lensShadow: { position: 'absolute', width: LENS_SIZE + 40, height: LENS_SIZE + 40, borderRadius: (LENS_SIZE + 40) / 2, backgroundColor: 'rgba(255,140,43,0.03)' },
  ring7: { position: 'absolute', width: LENS_SIZE, height: LENS_SIZE, borderRadius: LENS_SIZE / 2, borderWidth: 1, borderColor: 'rgba(255,140,43,0.04)', borderStyle: 'dashed' },
  ring6: { position: 'absolute', width: LENS_SIZE * 0.9, height: LENS_SIZE * 0.9, borderRadius: LENS_SIZE * 0.45, borderWidth: 1.5, borderColor: 'rgba(255,160,50,0.06)' },
  ring5: { position: 'absolute', width: LENS_SIZE * 0.8, height: LENS_SIZE * 0.8, borderRadius: LENS_SIZE * 0.4, borderWidth: 2, borderColor: 'rgba(255,140,43,0.08)' },
  ring4: { position: 'absolute', width: LENS_SIZE * 0.7, height: LENS_SIZE * 0.7, borderRadius: LENS_SIZE * 0.35, borderWidth: 2, borderColor: 'rgba(255,140,43,0.1)' },
  ring3: { position: 'absolute', width: LENS_SIZE * 0.6, height: LENS_SIZE * 0.6, borderRadius: LENS_SIZE * 0.3, borderWidth: 2.5, borderColor: 'rgba(255,140,43,0.14)' },
  ring2: { position: 'absolute', width: LENS_SIZE * 0.5, height: LENS_SIZE * 0.5, borderRadius: LENS_SIZE * 0.25, borderWidth: 3, borderColor: 'rgba(255,140,43,0.18)' },
  ring1: { position: 'absolute', width: LENS_SIZE * 0.42, height: LENS_SIZE * 0.42, borderRadius: LENS_SIZE * 0.21, borderWidth: 3.5, borderColor: 'rgba(255,140,43,0.25)' },
  // Shutter
  shutterContainer: { position: 'absolute', width: LENS_SIZE * 0.38, height: LENS_SIZE * 0.38, alignItems: 'center', justifyContent: 'center' },
  shutterBlade: { position: 'absolute', width: 0, height: 0, borderLeftWidth: LENS_SIZE * 0.1, borderRightWidth: LENS_SIZE * 0.1, borderBottomWidth: LENS_SIZE * 0.19, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(10,8,5,0.95)' },
  // Core
  core: { width: LENS_SIZE * 0.32, height: LENS_SIZE * 0.32, borderRadius: LENS_SIZE * 0.16, backgroundColor: 'rgba(255,140,43,0.05)', borderWidth: 2.5, borderColor: 'rgba(255,140,43,0.35)', alignItems: 'center', justifyContent: 'center' },
  bmsText: { fontSize: LENS_SIZE * 0.1, fontWeight: '900', color: '#FF8C2B', letterSpacing: 4 },
  // Effects
  glassReflection: { position: 'absolute', width: LENS_SIZE * 0.15, height: LENS_SIZE * 1.2, backgroundColor: 'rgba(255,220,150,0.06)', borderRadius: LENS_SIZE * 0.05 },
  lensFlare: { position: 'absolute', width: LENS_SIZE * 0.6, height: LENS_SIZE * 0.6, borderRadius: LENS_SIZE * 0.3, backgroundColor: 'rgba(255,200,100,0.06)' },
  focusRingOuter: { position: 'absolute', width: LENS_SIZE, height: LENS_SIZE, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', width: 1.5, height: 8, backgroundColor: 'rgba(255,140,43,0.12)', borderRadius: 0.75 },
  // Brand
  brandArea: { alignItems: 'center', marginTop: 18 },
  brandName: { fontSize: 17, fontWeight: '300', color: '#fff', letterSpacing: 5 },
  brandLine: { width: 50, height: 1.5, backgroundColor: 'rgba(255,140,43,0.35)', marginVertical: 8, borderRadius: 1 },
  brandTag: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 },
});
