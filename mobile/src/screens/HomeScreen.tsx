import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  FlatList, Image, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../theme';
import { SectionHeader, SkeletonLoader, CategoryPill } from '../components';
import { creatorsAPI } from '../services/api';
import { mockCreators, mockCategories, mockCities, promotionalBanners } from '../constants/mockData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;

export default function HomeScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>(mockCreators);
  const [activeCategory, setActiveCategory] = useState('all');

  const loadData = useCallback(async () => {
    try {
      const res = await creatorsAPI.getAll();
      const data = res.data?.creators || res.data?.data || [];
      if (data.length > 0) setCreators(data);
    } catch { /* use mock data */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const featured = creators.filter(c => c.featured).slice(0, 5);
  const topRated = [...creators].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
  const trending = creators.slice(0, 4);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}>

        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Welcome 👋</Text>
            <Text style={styles.brandName}>BookMyShot</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ═══ SEARCH BAR ═══ */}
        <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Discover')} activeOpacity={0.8}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchText}>Search photographers, cities...</Text>
          <View style={styles.searchFilter}>
            <Ionicons name="options-outline" size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* ═══ PROMO BANNERS ═══ */}
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={promotionalBanners}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}
          renderItem={({ item }) => (
            <View style={[styles.promoBanner, { backgroundColor: item.color + '15', borderColor: item.color + '30' }]}>
              <Text style={[styles.promoTitle, { color: item.color }]}>{item.title}</Text>
              <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
            </View>
          )}
          keyExtractor={i => i.id}
        />

        {/* ═══ CATEGORIES ═══ */}
        <SectionHeader title="Categories" actionLabel="See all" onAction={() => navigation.navigate('Discover')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {mockCategories.map(cat => (
            <TouchableOpacity key={cat.id} style={[styles.catItem, activeCategory === cat.id && styles.catItemActive]} onPress={() => setActiveCategory(cat.id)}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, activeCategory === cat.id && styles.catLabelActive]}>{cat.label}</Text>
              <Text style={styles.catCount}>{cat.count}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ═══ FEATURED CREATORS ═══ */}
        <SectionHeader title="Featured Creators" subtitle="Handpicked for you" actionLabel="View all" onAction={() => navigation.navigate('Discover')} />
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={featured}
          contentContainerStyle={{ paddingHorizontal: spacing.xl }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.featuredCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.9}>
              <Image source={{ uri: item.portfolio?.[0] || item.user?.avatar }} style={styles.featuredImg} />
              <View style={styles.featuredOverlay}>
                {item.verified && <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={styles.verifiedText}>Verified</Text></View>}
                <View style={styles.featuredBottom}>
                  <Text style={styles.featuredName} numberOfLines={1}>{item.user?.name}</Text>
                  <Text style={styles.featuredMeta}>{item.specialty} • {item.city}</Text>
                  <View style={styles.featuredRow}>
                    <View style={styles.ratingBadge}><Ionicons name="star" size={10} color={colors.primary} /><Text style={styles.ratingText}>{item.rating}</Text></View>
                    <Text style={styles.featuredPrice}>₹{(item.startingPrice || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={i => i._id}
        />

        {/* ═══ TRENDING THIS WEEK ═══ */}
        <SectionHeader title="Trending This Week" subtitle="Most booked creators" actionLabel="See all" onAction={() => navigation.navigate('Discover')} />
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={trending}
          contentContainerStyle={{ paddingHorizontal: spacing.xl }}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.trendingCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.9}>
              <View style={styles.trendingRank}><Text style={styles.trendingRankText}>#{index + 1}</Text></View>
              <Image source={{ uri: item.user?.avatar }} style={styles.trendingAvatar} />
              <Text style={styles.trendingName} numberOfLines={1}>{item.user?.name}</Text>
              <Text style={styles.trendingSpec}>{item.specialty}</Text>
              <View style={styles.trendingRating}><Ionicons name="star" size={10} color={colors.primary} /><Text style={styles.trendingRatingText}>{item.rating}</Text></View>
            </TouchableOpacity>
          )}
          keyExtractor={i => i._id}
        />

        {/* ═══ POPULAR CITIES ═══ */}
        <SectionHeader title="Popular Cities" subtitle="Explore by location" />
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={mockCities}
          contentContainerStyle={{ paddingHorizontal: spacing.xl }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cityCard} onPress={() => navigation.navigate('Discover', { city: item.name })} activeOpacity={0.85}>
              <Image source={{ uri: item.image }} style={styles.cityImg} />
              <View style={styles.cityOverlay}>
                <Text style={styles.cityName}>{item.name}</Text>
                <Text style={styles.cityCount}>{item.count} creators</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={i => i.id}
        />

        {/* ═══ TOP RATED ═══ */}
        <SectionHeader title="Top Rated" subtitle="Highest reviewed creators" actionLabel="View all" onAction={() => navigation.navigate('Discover')} />
        {topRated.slice(0, 3).map(item => (
          <TouchableOpacity key={item._id} style={styles.listCard} onPress={() => navigation.navigate('CreatorProfile', { id: item._id })} activeOpacity={0.85}>
            <Image source={{ uri: item.user?.avatar }} style={styles.listAvatar} />
            <View style={styles.listInfo}>
              <View style={styles.listNameRow}>
                <Text style={styles.listName} numberOfLines={1}>{item.user?.name}</Text>
                {item.verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
              </View>
              <Text style={styles.listSpec}>{item.specialty} • {item.city}</Text>
              <View style={styles.listBottom}>
                <View style={styles.ratingBadge}><Ionicons name="star" size={10} color={colors.primary} /><Text style={styles.ratingText}>{item.rating} ({item.reviewCount})</Text></View>
                <Text style={styles.listPrice}>from ₹{(item.startingPrice || 0).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* ═══ BECOME A CREATOR CTA ═══ */}
        <View style={styles.ctaBanner}>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Are you a photographer?</Text>
            <Text style={styles.ctaSubtitle}>Join 500+ creators earning with BookMyShot</Text>
            <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85}>
              <Text style={styles.ctaBtnText}>Become a Creator</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
          <Text style={styles.ctaEmoji}>📸</Text>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.sm },
  greeting: { ...typography.bodySm, color: colors.textMuted },
  brandName: { ...typography.displayMd, color: colors.text, marginTop: 2 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  notifDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.xl, marginTop: spacing.lg, paddingHorizontal: spacing.lg, height: 48, gap: spacing.md },
  searchText: { flex: 1, ...typography.bodyMd, color: colors.textMuted },
  searchFilter: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  promoBanner: { width: 220, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, borderRadius: radius.lg, borderWidth: 1, marginRight: spacing.md },
  promoTitle: { ...typography.headlineMd, marginBottom: 2 },
  promoSubtitle: { ...typography.bodySm, color: colors.textSecondary },
  catRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  catItem: { alignItems: 'center', width: 72, marginRight: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  catItemActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  catIcon: { fontSize: 22, marginBottom: spacing.xs },
  catLabel: { ...typography.labelSm, color: colors.textSecondary },
  catLabelActive: { color: colors.primary },
  catCount: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  featuredCard: { width: CARD_WIDTH, height: 240, borderRadius: radius.xl, overflow: 'hidden', marginRight: spacing.lg, ...shadows.md },
  featuredImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.2)' },
  verifiedBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(16,185,129,0.9)', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  verifiedText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  featuredBottom: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: radius.md, padding: spacing.md },
  featuredName: { ...typography.headlineSm, color: colors.text },
  featuredMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  featuredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { ...typography.labelSm, color: colors.textSecondary },
  featuredPrice: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  trendingCard: { alignItems: 'center', width: 110, marginRight: spacing.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  trendingRank: { position: 'absolute', top: spacing.sm, left: spacing.sm, backgroundColor: colors.primary, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trendingRankText: { fontSize: 9, fontWeight: '800', color: colors.textInverse },
  trendingAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.borderGold, marginBottom: spacing.sm },
  trendingName: { ...typography.labelMd, color: colors.text, textAlign: 'center' },
  trendingSpec: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  trendingRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.sm },
  trendingRatingText: { ...typography.labelSm, color: colors.textSecondary },
  cityCard: { width: 140, height: 100, borderRadius: radius.lg, overflow: 'hidden', marginRight: spacing.md },
  cityImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cityOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)' },
  cityName: { ...typography.labelMd, color: colors.text },
  cityCount: { ...typography.caption, color: colors.textMuted },
  listCard: { flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  listAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: colors.borderGold },
  listInfo: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  listName: { ...typography.headlineSm, color: colors.text, flex: 1 },
  listSpec: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  listBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  listPrice: { ...typography.labelSm, color: colors.primary },
  ctaBanner: { marginHorizontal: spacing.xl, marginTop: spacing['2xl'], backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.xl, padding: spacing.xl, flexDirection: 'row', alignItems: 'center' },
  ctaContent: { flex: 1 },
  ctaTitle: { ...typography.headlineMd, color: colors.text, marginBottom: spacing.xs },
  ctaSubtitle: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.lg },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, alignSelf: 'flex-start' },
  ctaBtnText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  ctaEmoji: { fontSize: 44 },
});
