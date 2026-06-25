/**
 * GuestProfileScreen — Premium Account/Login screen
 * Matches BookMyShot luxury dark + gold design
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F4C542';

export default function GuestProfileScreen({ navigation }: any) {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Logo */}
      <View style={s.logoWrap}>
        <View style={s.logoCircle}>
          <View style={s.logoInner}><Text style={s.logoB}>B</Text></View>
        </View>
        <Text style={s.brandName}>BOOKMYSHOT</Text>
        <Text style={s.brandTag}>CAPTURE • CONNECT • CELEBRATE</Text>
      </View>

      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={s.avatarCircle}>
          <Ionicons name="person-outline" size={44} color={GOLD} />
        </View>
      </View>

      {/* Welcome */}
      <Text style={s.welcomeTitle}>Welcome to <Text style={{ color: GOLD }}>BookMyShot</Text></Text>
      <Text style={s.welcomeSub}>Sign in to book creators, save favorites,{'\n'}send inquiries and manage your account.</Text>

      {/* Buttons */}
      <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
        <Ionicons name="log-in-outline" size={20} color="#000" />
        <Text style={s.loginText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.registerBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
        <Ionicons name="person-add-outline" size={20} color={GOLD} />
        <Text style={s.registerText}>Create Account</Text>
      </TouchableOpacity>

      {/* Quick Access */}
      <Text style={s.sectionLabel}>Quick Access</Text>
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <View style={s.quickIcon}><Ionicons name="camera-outline" size={20} color={GOLD} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.quickTitle}>I'm a Creator</Text>
            <Text style={s.quickSub}>Join as a creator and showcase your work.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('AdminLogin')} activeOpacity={0.85}>
          <View style={s.quickIcon}><Ionicons name="shield-checkmark-outline" size={20} color={GOLD} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.quickTitle}>Admin Login</Text>
            <Text style={s.quickSub}>Secure admin access for management.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={s.featuresRow}>
        <View style={s.featureCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color={GOLD} />
          <Text style={s.featureTitle}>100% Verified</Text>
          <Text style={s.featureSub}>Trusted Creators</Text>
        </View>
        <View style={s.featureCard}>
          <Ionicons name="star-outline" size={24} color={GOLD} />
          <Text style={s.featureTitle}>Premium Quality</Text>
          <Text style={s.featureSub}>Top Professionals</Text>
        </View>
        <View style={s.featureCard}>
          <Ionicons name="lock-closed-outline" size={24} color={GOLD} />
          <Text style={s.featureTitle}>Secure Booking</Text>
          <Text style={s.featureSub}>Safe & Reliable</Text>
        </View>
      </View>

      {/* Support */}
      <TouchableOpacity style={s.supportRow} onPress={() => Linking.openURL('https://wa.me/918492922173')}>
        <Ionicons name="headset-outline" size={16} color="rgba(255,255,255,0.4)" />
        <Text style={s.supportText}>Need help? <Text style={{ color: GOLD }}>Contact Support</Text></Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 50, paddingBottom: 30 },
  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoInner: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: GOLD + '60', alignItems: 'center', justifyContent: 'center' },
  logoB: { fontSize: 22, fontWeight: '700', color: GOLD },
  brandName: { fontSize: 16, fontWeight: '300', color: GOLD, letterSpacing: 6 },
  brandTag: { fontSize: 8, color: GOLD + '80', letterSpacing: 3, marginTop: 4 },
  // Avatar
  avatarWrap: { marginVertical: 16 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(212,175,55,0.06)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center' },
  // Welcome
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  welcomeSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  // Buttons
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', backgroundColor: GOLD, borderRadius: 18, paddingVertical: 16 },
  loginText: { fontSize: 16, fontWeight: '700', color: '#000' },
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', borderWidth: 1.5, borderColor: GOLD, borderRadius: 18, paddingVertical: 15, marginTop: 12 },
  registerText: { fontSize: 16, fontWeight: '700', color: GOLD },
  // Quick Access
  sectionLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 28, marginBottom: 12 },
  quickRow: { width: '100%', gap: 10 },
  quickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(212,175,55,0.04)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)', borderRadius: 14, padding: 14 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212,175,55,0.08)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  quickSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  // Features
  featuresRow: { flexDirection: 'row', gap: 8, marginTop: 24, width: '100%' },
  featureCard: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.03)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.1)', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 6 },
  featureTitle: { fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 6, textAlign: 'center' },
  featureSub: { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, textAlign: 'center' },
  // Support
  supportRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 },
  supportText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
