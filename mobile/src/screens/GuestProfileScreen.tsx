import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Animated, Dimensions, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function GuestProfileScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
    ]).start();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Animated.ScrollView showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <View style={s.logoBadge}><Ionicons name="aperture" size={16} color="#6C3BFF" /></View>
            <Text style={s.logoText}>BOOK<Text style={{ color: '#FF4FA3' }}>MYSHOT</Text></Text>
          </View>
          <TouchableOpacity><Ionicons name="notifications-outline" size={22} color="#6B7280" /></TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={s.welcomeSection}>
          <View style={s.welcomeIcon}>
            <LinearGradient colors={['#6C3BFF', '#FF4FA3']} style={s.welcomeGradient}>
              <Ionicons name="person-outline" size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={s.welcomeTitle}>Welcome Back 👋</Text>
          <Text style={s.welcomeHeading}>Book creators faster than ever.</Text>
          <Text style={s.welcomeSub}>Login to manage bookings, save favourites, track cashback and connect with verified creators.</Text>
        </View>

        {/* Login Buttons */}
        <View style={s.btnSection}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Login')}>
            <LinearGradient colors={['#6C3BFF', '#8B5CF6', '#FF4FA3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnPrimary}>
              <Ionicons name="log-in-outline" size={16} color="#fff" />
              <Text style={s.btnPrimaryText}>Login</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} activeOpacity={0.85} onPress={() => navigation.navigate('Register')}>
            <Ionicons name="person-add-outline" size={15} color="#6C3BFF" />
            <Text style={s.btnSecondaryText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Access</Text>
          <View style={s.cardRow}>
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
              <View style={[s.cardIcon, { backgroundColor: '#F3E8FF' }]}><Ionicons name="camera-outline" size={20} color="#6C3BFF" /></View>
              <Text style={s.cardTitle}>Creator Portal</Text>
              <Text style={s.cardSub}>Become a Creator</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('AdminLogin')} activeOpacity={0.8}>
              <View style={[s.cardIcon, { backgroundColor: '#FDF2F8' }]}><Ionicons name="shield-checkmark-outline" size={20} color="#FF4FA3" /></View>
              <Text style={s.cardTitle}>Admin Panel</Text>
              <Text style={s.cardSub}>Admin Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Why BookMyShot</Text>
          <View style={s.featureGrid}>
            {[
              { icon: 'shield-checkmark', label: 'Verified Creators', color: '#10B981', bg: '#ECFDF5' },
              { icon: 'diamond', label: 'Premium Quality', color: '#6C3BFF', bg: '#F3E8FF' },
              { icon: 'lock-closed', label: 'Secure Booking', color: '#3B82F6', bg: '#EFF6FF' },
              { icon: 'gift', label: 'Cashback Rewards', color: '#FF4FA3', bg: '#FDF2F8' },
            ].map((f, i) => (
              <View key={i} style={s.featureCard}>
                <View style={[s.featureIcon, { backgroundColor: f.bg }]}><Ionicons name={f.icon as any} size={18} color={f.color} /></View>
                <Text style={s.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Support */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Need Help?</Text>
          <View style={s.supportGrid}>
            {[
              { icon: 'chatbubble-ellipses', label: 'Chat Support', action: () => navigation.navigate('Info', { page: 'Help' }) },
              { icon: 'logo-whatsapp', label: 'WhatsApp', action: () => Linking.openURL('https://wa.me/918492922173') },
              { icon: 'mail', label: 'Email', action: () => Linking.openURL('mailto:support@bookmyshot.in') },
              { icon: 'call', label: 'Call', action: () => Linking.openURL('tel:+918492922173') },
            ].map((s2, i) => (
              <TouchableOpacity key={i} style={s.supportBtn} onPress={s2.action} activeOpacity={0.8}>
                <Ionicons name={s2.icon as any} size={18} color="#6C3BFF" />
                <Text style={s.supportLabel}>{s2.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal Links */}
        <View style={s.legalSection}>
          {['About Us', 'Privacy Policy', 'Terms & Conditions', 'Refund Policy'].map((page, i) => (
            <TouchableOpacity key={i} style={s.legalLink} onPress={() => navigation.navigate('Info', { page })}>
              <Text style={s.legalText}>{page}</Text>
              <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  // Welcome
  welcomeSection: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 30, paddingBottom: 24 },
  welcomeIcon: { marginBottom: 16 },
  welcomeGradient: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  welcomeHeading: { fontSize: 22, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 8 },
  welcomeSub: { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  // Buttons
  btnSection: { paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 18, borderWidth: 1.5, borderColor: '#6C3BFF', backgroundcolor: '#1F2937' },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#6C3BFF' },
  // Section
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  // Cards
  cardRow: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundcolor: '#1F2937', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  cardSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  // Features
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: { width: (width - 40 - 10) / 2, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundcolor: '#1F2937', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  featureIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 11, fontWeight: '600', color: '#1F2937', flex: 1 },
  // Support
  supportGrid: { flexDirection: 'row', gap: 10 },
  supportBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#F8F6FF', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#EDE9FE' },
  supportLabel: { fontSize: 9, fontWeight: '600', color: '#4B5563' },
  // Legal
  legalSection: { paddingHorizontal: 20, marginBottom: 12 },
  legalLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  legalText: { fontSize: 12, color: '#4B5563' },
});
