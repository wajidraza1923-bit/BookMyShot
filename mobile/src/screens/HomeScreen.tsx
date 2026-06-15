import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  FlatList, Image, TouchableOpacity, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../theme';
import { creatorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.xl * 2;

export default function HomeScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes, featuredRes] = await Promise.all([
        creatorsAPI.getAll(),
        api.get('/promotions/featured-status').catch(() => ({ data: { slots: {} } })),
      ]);

      const allCreators = creatorsRes.data?.creators || creatorsRes.data?.data || [];

      // Featured creators from promotion slots (ordered 1-4)
      const slots = featuredRes.data?.slots || {};
      const featuredSlotIds: string[] = [];
      const orderedFeatured: any[] = [];

      for (const slotKey of ['featured_1', 'featured_2', 'featured_3', 'featured_4']) {
        const slot = slots[slotKey];
        if (slot?.occupied && slot?.creatorId) {
          featuredSlotIds.push(slot.creatorId.toString());
          const creator = allCreators.find((c: any) => c._id === slot.creatorId || c._id?.toString() === slot.creatorId?.toString());
          if (creator) orderedFeatured.push({ ...creator, _slot: slotKey });
        }
      }

      setFeaturedCreators(orderedFeatured);

      // Homepage shows max 4 creators (promoted first, then approved fallback)
      const nonFeatured = allCreators.filter((c: any) => !featuredSlotIds.includes(c._id?.toString()));
      if (orderedFeatured.length >= 4) {
        setCreators([]); // Featured section has 4, no need for "all" below
      } else {
        setCreators(nonFeatured.slice(0, 4 - orderedFeatured.length));
      }
    } catch {}
    finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}>

        {/* ═══ HEADER ═══ */}
        <View style={s.header}>
          <Text style={s.logo}>BOOKMYSHOT</Text>
          {isAuthenticated ? (
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Account')}>
              <Text style={s.loginBtnText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ HERO SECTION ═══ */}
        <Animated.View style={[s.hero, { opacity: fadeAnim }]}>
          <View style={s.heroGlow} />
          <Text style={s.heroTitle}>India's Premium{'\n'}Creator Marketplace</Text>
          <Text style={s.heroSubtitle}>Find verified photographers, videographers, drone pilots and creative professionals.</Text>
          <TouchableOpacity style={s.searchBar} onPress={() => navigation.navigate('Discover')} activeOpacity={0.8}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <Text style={s.searchText}>Search creators, cities, specialties...</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ═══ GUEST CTA ═══ */}
        {!isAuthenticated && (
          <View style={s.guestCta}>
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.guestTitle}>Book Your Dream Creator</Text>
              <Text style={s.guestSub}>Sign up to send inquiries and book creators</Text>
            </View>
            <TouchableOpacity style={s.guestBtn} onPress={() => navigation.navigate('Account')}>
              <Text style={s.guestBtnText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ FEATURED CREATORS (only if promotions active) ═══ */}
        {featuredCreators.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionLabel}>FEATURED</Text>
                <Text style={s.sectionTitle}>Premium Creators</Text>
              </View>
            </View>
            {featuredCreators.map((item, index) => (
              <TouchableOpacity key={item._id} style={s.creatorCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.9}>
                <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || 'https://via.placeholder.com/400x200' }} style={s.cardImage} />
                <View style={s.cardOverlay}>
                  <View style={s.cardBadgeRow}>
                    <View style={s.featuredBadge}><Ionicons name="star" size={10} color="#000" /><Text style={s.featuredBadgeText}>FEATURED</Text></View>
                    {item.verified && <View style={s.verifiedBadge}><Ionicons name="checkmark-circle" size={11} color="#fff" /></View>}
                  </View>
                  <View style={s.cardContent}>
                    <Text style={s.cardName}>{item.user?.name || 'Creator'}</Text>
                    <Text style={s.cardMeta}>{item.specialty || 'Photographer'} • {item.city || 'India'}</Text>
                    <View style={s.cardBottom}>
                      <View style={s.ratingRow}><Ionicons name="star" size={12} color={colors.primary} /><Text style={s.ratingText}>{item.rating || '5.0'}</Text></View>
                      {item.startingPrice > 0 && <Text style={s.cardPrice}>from ₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* ═══ ALL CREATORS (max 4, or fallback when no featured) ═══ */}
        {creators.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionLabel}>DISCOVER</Text>
                <Text style={s.sectionTitle}>All Creators</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
                <Text style={s.viewAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            {creators.map((item) => (
              <TouchableOpacity key={item._id} style={s.creatorCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.9}>
                <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar || 'https://via.placeholder.com/400x200' }} style={s.cardImage} />
                <View style={s.cardOverlay}>
                  <View style={s.cardBadgeRow}>
                    {item.verified && <View style={s.verifiedBadge}><Ionicons name="checkmark-circle" size={11} color="#fff" /></View>}
                  </View>
                  <View style={s.cardContent}>
                    <Text style={s.cardName}>{item.user?.name || 'Creator'}</Text>
                    <Text style={s.cardMeta}>{item.specialty || 'Photographer'} • {item.city || 'India'}</Text>
                    <View style={s.cardBottom}>
                      <View style={s.ratingRow}><Ionicons name="star" size={12} color={colors.primary} /><Text style={s.ratingText}>{item.rating || '5.0'}</Text></View>
                      {item.startingPrice > 0 && <Text style={s.cardPrice}>from ₹{item.startingPrice?.toLocaleString('en-IN')}</Text>}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* ═══ TRUST SIGNALS ═══ */}
        <View style={s.trustSection}>
          <Text style={s.trustTitle}>Why BookMyShot</Text>
          <View style={s.trustGrid}>
            <TrustItem icon="shield-checkmark" label="Verified Creators" />
            <TrustItem icon="card" label="Secure Payments" />
            <TrustItem icon="star" label="Real Reviews" />
            <TrustItem icon="time" label="Instant Booking" />
          </View>
        </View>

        {/* ═══ BECOME A CREATOR ═══ */}
        <View style={s.ctaBanner}>
          <Text style={s.ctaTitle}>Are you a creator?</Text>
          <Text style={s.ctaSubtitle}>Join India's premium marketplace. Get verified, get booked.</Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Account')} activeOpacity={0.85}>
            <Text style={s.ctaBtnText}>Join as Creator</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.trustItem}>
      <View style={s.trustIcon}><Ionicons name={icon as any} size={18} color={colors.primary} /></View>
      <Text style={s.trustLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.sm },
  logo: { fontSize: 16, fontWeight: '300', color: colors.primary, letterSpacing: 5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  loginBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md },
  loginBtnText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  // Hero
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing['2xl'] },
  heroGlow: { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(212,175,55,0.04)' },
  heroTitle: { fontSize: 28, fontWeight: '700', color: colors.text, lineHeight: 36, letterSpacing: -0.5 },
  heroSubtitle: { ...typography.bodyMd, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 22 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl, paddingHorizontal: spacing.lg, height: 48, gap: spacing.md },
  searchText: { ...typography.bodyMd, color: colors.textMuted },
  // Guest CTA
  guestCta: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.xl, padding: spacing.lg, backgroundColor: 'rgba(212,175,55,0.04)', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderGold, gap: spacing.md },
  guestTitle: { ...typography.labelLg, color: colors.text },
  guestSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  guestBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm },
  guestBtnText: { ...typography.labelSm, color: colors.textInverse, fontWeight: '700' },
  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.lg },
  sectionLabel: { ...typography.caption, color: colors.primary, letterSpacing: 2, fontWeight: '600' },
  sectionTitle: { ...typography.headlineLg, color: colors.text, marginTop: 2 },
  viewAll: { ...typography.labelMd, color: colors.primary },
  // Creator cards
  creatorCard: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', height: 200, ...shadows.md },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.35)' },
  cardBadgeRow: { flexDirection: 'row', gap: spacing.sm },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  featuredBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  verifiedBadge: { backgroundColor: 'rgba(16,185,129,0.9)', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardContent: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: radius.md, padding: spacing.md },
  cardName: { ...typography.headlineSm, color: '#fff' },
  cardMeta: { ...typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { ...typography.labelSm, color: 'rgba(255,255,255,0.8)' },
  cardPrice: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  // Trust
  trustSection: { paddingHorizontal: spacing.xl, marginTop: spacing['3xl'] },
  trustTitle: { ...typography.headlineMd, color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  trustItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  trustIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  trustLabel: { ...typography.labelMd, color: colors.textSecondary },
  // CTA
  ctaBanner: { marginHorizontal: spacing.xl, marginTop: spacing['3xl'], backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center' },
  ctaTitle: { ...typography.headlineMd, color: colors.primary },
  ctaSubtitle: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  ctaBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
});
