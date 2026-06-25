/**
 * GuestProfileScreen — Premium Account Screen
 * Mobile-first, responsive, production-ready
 * Official BookMyShot camera logo, gold+black luxury theme
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#D4AF37';

export default function GuestProfileScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const onPressIn = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  // Responsive scale (base 390)
  const s = Math.min(width / 390, 1.12);
  const hPad = Math.max(16, width * 0.048);

  return (
    <Animated.View style={[st.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      {/* Subtle gold mesh background — top area only */}
      <View style={st.meshBg}>
        <View style={[st.meshArc, { width: width * 0.9, height: width * 0.45, top: -width * 0.18, left: width * 0.05, borderRadius: width * 0.45 }]} />
        <View style={[st.meshArc2, { width: width * 0.6, height: width * 0.3, top: -width * 0.08, right: -width * 0.1, borderRadius: width * 0.3 }]} />
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 14 * s, paddingBottom: insets.bottom + 80, paddingHorizontal: hPad, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ═══ Logo — Camera icon in gold ring ═══ */}
        <View style={[st.logoOuter, { width: 62 * s, height: 62 * s, borderRadius: 31 * s }]}>
          <View style={[st.logoInner, { width: 40 * s, height: 40 * s, borderRadius: 20 * s }]}>
            <Ionicons name="videocam-outline" size={22 * s} color={GOLD} />
          </View>
        </View>
        <Text style={[st.brand, { fontSize: 13 * s, marginTop: 8 * s }]}>BOOKMYSHOT</Text>
        <Text style={[st.tagline, { fontSize: 6.5 * s, marginTop: 3 * s }]}>CAPTURE  •  CONNECT  •  CELEBRATE</Text>

        {/* ═══ Profile Avatar ═══ */}
        <View style={[st.avatarWrap, { marginTop: 14 * s }]}>
          <View style={[st.avatarGlow, { width: 68 * s, height: 12 * s, bottom: -5 * s, borderRadius: 34 * s }]} />
          <View style={[st.avatar, { width: 82 * s, height: 82 * s, borderRadius: 41 * s }]}>
            <Ionicons name="person-outline" size={40 * s} color={GOLD} />
          </View>
        </View>

        {/* ═══ Welcome ═══ */}
        <Text style={[st.welcomeTitle, { fontSize: 22 * s, marginTop: 12 * s }]}>
          Welcome to <Text style={st.gold}>BookMyShot</Text>
        </Text>
        <Text style={[st.welcomeSub, { fontSize: 12.5 * s, marginTop: 6 * s, marginBottom: 22 * s }]}>
          Sign in to book creators, save favorites,{'\n'}send inquiries and manage your account.
        </Text>

        {/* ═══ Login Button ═══ */}
        <Animated.View style={[st.fullW, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={[st.loginBtn, { height: 50 * s, borderRadius: 25 * s }]}
            onPress={() => navigation.navigate('Login')}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={19 * s} color="#000" />
            <Text style={[st.loginTxt, { fontSize: 15.5 * s }]}>Login</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ═══ Create Account ═══ */}
        <TouchableOpacity
          style={[st.createBtn, { height: 50 * s, borderRadius: 25 * s, marginTop: 10 * s }]}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={17 * s} color={GOLD} />
          <Text style={[st.createTxt, { fontSize: 14.5 * s }]}>Create Account</Text>
        </TouchableOpacity>

        {/* ═══ Quick Access Divider ═══ */}
        <View style={[st.dividerRow, { marginTop: 22 * s, marginBottom: 12 * s }]}>
          <View style={st.divLine} />
          <Text style={[st.divLabel, { fontSize: 10.5 * s }]}>Quick Access</Text>
          <View style={st.divLine} />
        </View>

        {/* ═══ Cards Row ═══ */}
        <View style={st.cardsRow}>
          <TouchableOpacity style={[st.card, { padding: 12 * s, borderRadius: 12 * s }]} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
            <View style={[st.cardIconWrap, { width: 30 * s, height: 30 * s, borderRadius: 15 * s }]}>
              <Ionicons name="camera-outline" size={14 * s} color={GOLD} />
            </View>
            <Text style={[st.cardTitle, { fontSize: 11.5 * s }]}>I'm a Creator</Text>
            <Text style={[st.cardSub, { fontSize: 9.5 * s }]}>Join as a creator and{'\n'}showcase your work.</Text>
            <Ionicons name="chevron-forward" size={12 * s} color="rgba(255,255,255,0.22)" style={st.cardArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={[st.card, { padding: 12 * s, borderRadius: 12 * s }]} onPress={() => navigation.navigate('AdminLogin')} activeOpacity={0.8}>
            <View style={[st.cardIconWrap, { width: 30 * s, height: 30 * s, borderRadius: 15 * s }]}>
              <Ionicons name="shield-outline" size={14 * s} color={GOLD} />
            </View>
            <Text style={[st.cardTitle, { fontSize: 11.5 * s }]}>Admin Login</Text>
            <Text style={[st.cardSub, { fontSize: 9.5 * s }]}>Secure admin access{'\n'}for management.</Text>
            <Ionicons name="chevron-forward" size={12 * s} color="rgba(255,255,255,0.22)" style={st.cardArrow} />
          </TouchableOpacity>
        </View>

        {/* ═══ Features Card ═══ */}
        <View style={[st.featCard, { marginTop: 16 * s, paddingVertical: 14 * s, borderRadius: 12 * s }]}>
          <View style={st.featCol}>
            <Ionicons name="checkmark-circle-outline" size={20 * s} color={GOLD} />
            <Text style={[st.featTitle, { fontSize: 9.5 * s }]}>100% Verified</Text>
            <Text style={[st.featSub, { fontSize: 8.5 * s }]}>Trusted Creators</Text>
          </View>
          <View style={[st.featDiv, { height: 36 * s }]} />
          <View style={st.featCol}>
            <Ionicons name="star-outline" size={20 * s} color={GOLD} />
            <Text style={[st.featTitle, { fontSize: 9.5 * s }]}>Premium Quality</Text>
            <Text style={[st.featSub, { fontSize: 8.5 * s }]}>Top Professionals</Text>
          </View>
          <View style={[st.featDiv, { height: 36 * s }]} />
          <View style={st.featCol}>
            <Ionicons name="lock-closed-outline" size={20 * s} color={GOLD} />
            <Text style={[st.featTitle, { fontSize: 9.5 * s }]}>Secure Booking</Text>
            <Text style={[st.featSub, { fontSize: 8.5 * s }]}>Safe & Reliable</Text>
          </View>
        </View>

        {/* ═══ Contact Support ═══ */}
        <TouchableOpacity style={[st.supportRow, { marginTop: 20 * s }]} onPress={() => Linking.openURL('https://wa.me/918492922173')} activeOpacity={0.7}>
          <Ionicons name="headset-outline" size={14 * s} color="rgba(255,255,255,0.4)" />
          <Text style={[st.supportTxt, { fontSize: 11.5 * s }]}>
            Need help? <Text style={st.gold}>Contact Support</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },

  // Mesh background
  meshBg: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', overflow: 'hidden' },
  meshArc: { position: 'absolute', borderWidth: 0.6, borderColor: GOLD, opacity: 0.045 },
  meshArc2: { position: 'absolute', borderWidth: 0.5, borderColor: GOLD, opacity: 0.035 },

  // Logo
  logoOuter: { borderWidth: 1.4, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  logoInner: { borderWidth: 0.7, borderColor: GOLD + '40', alignItems: 'center', justifyContent: 'center' },
  brand: { fontWeight: '300', color: GOLD, letterSpacing: 6.5 },
  tagline: { color: GOLD + '70', letterSpacing: 3, fontWeight: '400' },

  // Avatar
  avatarWrap: { alignItems: 'center', position: 'relative' },
  avatarGlow: { position: 'absolute', backgroundColor: GOLD, opacity: 0.07 },
  avatar: { backgroundColor: 'rgba(212,175,55,0.03)', borderWidth: 1.4, borderColor: 'rgba(212,175,55,0.25)', alignItems: 'center', justifyContent: 'center' },

  // Welcome
  welcomeTitle: { fontWeight: '700', color: '#fff', textAlign: 'center' },
  gold: { color: GOLD, fontWeight: '700' },
  welcomeSub: { color: 'rgba(255,255,255,0.46)', textAlign: 'center', lineHeight: 20 },

  // Buttons
  fullW: { width: '100%' },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: GOLD, shadowColor: GOLD, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  loginTxt: { fontWeight: '700', color: '#000', letterSpacing: 0.3 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', borderWidth: 1.5, borderColor: GOLD, backgroundColor: 'transparent' },
  createTxt: { fontWeight: '700', color: GOLD, letterSpacing: 0.2 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.13)' },
  divLabel: { color: 'rgba(255,255,255,0.36)', marginHorizontal: 12, fontWeight: '500', letterSpacing: 0.3 },

  // Cards
  cardsRow: { flexDirection: 'row', width: '100%', gap: 10 },
  card: { flex: 1, backgroundColor: 'rgba(212,175,55,0.03)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.16)', position: 'relative' },
  cardIconWrap: { backgroundColor: 'rgba(212,175,55,0.08)', borderWidth: 0.8, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  cardTitle: { fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardSub: { color: 'rgba(255,255,255,0.36)', lineHeight: 13 },
  cardArrow: { position: 'absolute', top: 12, right: 10 },

  // Features
  featCard: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(212,175,55,0.03)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.13)', alignItems: 'center', paddingHorizontal: 4 },
  featCol: { flex: 1, alignItems: 'center' },
  featDiv: { width: 1, backgroundColor: 'rgba(212,175,55,0.13)' },
  featTitle: { fontWeight: '700', color: '#fff', marginTop: 5, textAlign: 'center' },
  featSub: { color: 'rgba(255,255,255,0.36)', marginTop: 1, textAlign: 'center' },

  // Support
  supportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  supportTxt: { color: 'rgba(255,255,255,0.4)' },
});
