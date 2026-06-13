import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../theme';
import { SectionHeader, CreatorCard, SearchBar, CategoryPill, SkeletonLoader } from '../components';
import { creatorsAPI, homepageAPI } from '../services/api';

const { width } = Dimensions.get('window');

const categories = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'wedding', label: 'Wedding', icon: '💒' },
  { id: 'pre-wedding', label: 'Pre-Wedding', icon: '💑' },
  { id: 'cinematography', label: 'Cinema', icon: '🎬' },
  { id: 'makeup', label: 'Makeup', icon: '💄' },
  { id: 'mehendi', label: 'Mehendi', icon: '🌿' },
  { id: 'drone', label: 'Drone', icon: '🚁' },
];

export default function HomeScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes] = await Promise.all([
        creatorsAPI.getAll(),
      ]);
      const allCreators = creatorsRes.data?.creators || creatorsRes.data?.data || [];
      setFeaturedCreators(allCreators.filter((c: any) => c.featured).slice(0, 5));
      setTopCreators(allCreators.slice(0, 10));
    } catch (e) {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Welcome to</Text>
        <Text style={styles.brandName}>BookMyShot</Text>
      </View>
      <TouchableOpacity style={styles.notifBtn}>
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
        <View style={styles.notifDot} />
      </TouchableOpacity>
    </View>
  );

  const renderSearch = () => (
    <View style={styles.searchContainer}>
      <TouchableOpacity
        style={styles.searchFake}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Search creators, cities, specialties...</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategories = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesContainer}
    >
      {categories.map((cat) => (
        <CategoryPill
          key={cat.id}
          label={cat.label}
          icon={cat.icon}
          active={activeCategory === cat.id}
          onPress={() => setActiveCategory(cat.id)}
        />
      ))}
    </ScrollView>
  );

  const renderFeaturedSection = () => {
    if (loading) {
      return (
        <View style={styles.featuredLoading}>
          <SkeletonLoader width={width * 0.75} height={220} borderRadius={radius.lg} />
        </View>
      );
    }

    if (featuredCreators.length === 0) return null;

    return (
      <>
        <SectionHeader
          title="Featured Creators"
          subtitle="Handpicked for you"
          actionLabel="See all"
          onAction={() => navigation.navigate('Search', { filter: 'featured' })}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={featuredCreators}
          contentContainerStyle={styles.featuredList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.featuredCard}
              onPress={() => navigation.navigate('CreatorProfile', { id: item._id })}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: item.portfolio?.[0] || item.user?.avatar || 'https://via.placeholder.com/300x200' }}
                style={styles.featuredImage}
              />
              <View style={styles.featuredOverlay}>
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={10} color={colors.textInverse} />
                  <Text style={styles.featuredBadgeText}>Featured</Text>
                </View>
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredName}>{item.user?.name || 'Creator'}</Text>
                  <Text style={styles.featuredSpec}>
                    {item.specialty || 'Photographer'} • {item.city || 'India'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item._id}
        />
      </>
    );
  };

  const renderTopCreators = () => {
    if (loading) {
      return (
        <View style={styles.topLoading}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ marginBottom: spacing.lg, paddingHorizontal: spacing.xl }}>
              <SkeletonLoader height={200} borderRadius={radius.lg} />
            </View>
          ))}
        </View>
      );
    }

    return (
      <>
        <SectionHeader
          title="Top Creators"
          subtitle="Most booked this month"
          actionLabel="View all"
          onAction={() => navigation.navigate('Search')}
        />
        <View style={styles.topList}>
          {topCreators.map((creator) => (
            <CreatorCard
              key={creator._id}
              creator={creator}
              onPress={(id) => navigation.navigate('CreatorProfile', { id })}
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {renderHeader()}
        {renderSearch()}
        {renderCategories()}
        {renderFeaturedSection()}
        {renderTopCreators()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing.md,
  },
  greeting: {
    ...typography.bodySm,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  brandName: {
    ...typography.displayMd,
    color: colors.text,
    marginTop: spacing.xs,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchFake: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 48,
    gap: spacing.md,
  },
  searchPlaceholder: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  featuredLoading: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  featuredList: {
    paddingHorizontal: spacing.xl,
  },
  featuredCard: {
    width: width * 0.72,
    height: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginRight: spacing.lg,
    ...shadows.md,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
  },
  featuredBadgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featuredInfo: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  featuredName: {
    ...typography.headlineSm,
    color: colors.text,
  },
  featuredSpec: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topLoading: {
    marginTop: spacing['2xl'],
  },
  topList: {
    paddingHorizontal: spacing.xl,
  },
});
