import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radius, shadows } from '../theme';
import Button from '../components/Button';
import LoginRequiredSheet from '../components/LoginRequiredSheet';
import { creatorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const GALLERY_SIZE = (width - spacing.xl * 2 - spacing.sm * 2) / 3;

export default function CreatorProfileScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { isAuthenticated } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'packages' | 'reviews'>('portfolio');
  const [showLoginSheet, setShowLoginSheet] = useState(false);

  const handleRestrictedAction = () => {
    if (!isAuthenticated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLoginSheet(true);
      return true;
    }
    return false;
  };

  useEffect(() => {
    loadCreator();
  }, [id]);

  const loadCreator = async () => {
    try {
      const res = await creatorsAPI.getById(id);
      setCreator(res.data?.creator || res.data);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Creator not found</Text>
      </View>
    );
  }

  const name = creator.user?.name || 'Creator';
  const avatar = creator.user?.avatar;
  const portfolio = creator.portfolio || [];
  const packages = creator.packages || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Cover */}
        <View style={styles.hero}>
          <Image
            source={{ uri: portfolio[0] || avatar || 'https://via.placeholder.com/400x300' }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />

          {/* Back + Share */}
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.heroRight}>
              <TouchableOpacity style={styles.heroBtn}>
                <Ionicons name="heart-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn}>
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Featured badge */}
          {creator.featured && (
            <View style={styles.heroBadge}>
              <Ionicons name="star" size={12} color={colors.textInverse} />
              <Text style={styles.heroBadgeText}>Featured Creator</Text>
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            <Image source={{ uri: avatar || 'https://via.placeholder.com/80' }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.specialty}>{creator.specialty || 'Photographer'}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={styles.location}>{creator.city || 'India'}</Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{portfolio.length}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{creator.experience || '2'}+</Text>
              <Text style={styles.statLabel}>Years</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{packages.length}</Text>
              <Text style={styles.statLabel}>Packages</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Bio */}
          {creator.bio && (
            <Text style={styles.bio}>{creator.bio}</Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['portfolio', 'packages', 'reviews'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => { setActiveTab(tab); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'portfolio' && (
          <View style={styles.gallery}>
            {portfolio.length > 0 ? (
              portfolio.map((img: string, i: number) => (
                <TouchableOpacity key={i} style={styles.galleryItem} activeOpacity={0.8}>
                  <Image source={{ uri: img }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyTab}>
                <Ionicons name="images-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>No portfolio yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'packages' && (
          <View style={styles.packagesContainer}>
            {packages.length > 0 ? (
              packages.map((pkg: any, i: number) => (
                <View key={i} style={styles.packageCard}>
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>₹{(pkg.price || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  {pkg.description && <Text style={styles.packageDesc}>{pkg.description}</Text>}
                  {pkg.features && pkg.features.length > 0 && (
                    <View style={styles.packageFeatures}>
                      {pkg.features.map((f: string, j: number) => (
                        <View key={j} style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                          <Text style={styles.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyTab}>
                <Ionicons name="pricetag-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>No packages listed</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.emptyTab}>
            <Ionicons name="chatbubble-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTabText}>No reviews yet</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed CTA */}
      <View style={styles.ctaBar}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceLabel}>Starting from</Text>
          <Text style={styles.ctaPriceValue}>
            ₹{(packages[0]?.price || creator.startingPrice || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <Button title="Send Inquiry" onPress={() => { if (!handleRestrictedAction()) { /* TODO: open inquiry form */ } }} size="md" style={styles.ctaBtn} />
      </View>

      {/* Login Required Sheet for Guest Users */}
      <LoginRequiredSheet
        visible={showLoginSheet}
        onClose={() => setShowLoginSheet(false)}
        onLogin={() => { setShowLoginSheet(false); navigation.navigate('Login'); }}
        onSignUp={() => { setShowLoginSheet(false); navigation.navigate('Register'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.bodyMd, color: colors.textMuted },
  hero: { width: '100%', height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100,
    backgroundColor: 'transparent',
    // Gradient effect via overlay
  },
  heroActions: {
    position: 'absolute', top: spacing['5xl'], left: spacing.xl, right: spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  heroBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm,
  },
  heroRight: { flexDirection: 'row' },
  heroBadge: {
    position: 'absolute', bottom: spacing.lg, left: spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  heroBadgeText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  profileSection: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.borderGold },
  profileInfo: { flex: 1 },
  name: { ...typography.headlineLg, color: colors.text },
  specialty: { ...typography.labelMd, color: colors.primary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { ...typography.caption, color: colors.textMuted },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl,
  },
  stat: { alignItems: 'center' },
  statValue: { ...typography.headlineMd, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  bio: { ...typography.bodyMd, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border,
    marginHorizontal: spacing.xl, marginBottom: spacing.lg,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { ...typography.labelLg, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
  galleryItem: { width: GALLERY_SIZE, height: GALLERY_SIZE, borderRadius: radius.sm, overflow: 'hidden' },
  galleryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  emptyTab: { alignItems: 'center', paddingVertical: spacing['4xl'] },
  emptyTabText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
  packagesContainer: { paddingHorizontal: spacing.xl },
  packageCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  packageName: { ...typography.headlineSm, color: colors.text },
  packagePrice: { ...typography.headlineMd, color: colors.primary },
  packageDesc: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.md },
  packageFeatures: { gap: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { ...typography.bodySm, color: colors.textSecondary },
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  ctaPrice: {},
  ctaPriceLabel: { ...typography.caption, color: colors.textMuted },
  ctaPriceValue: { ...typography.headlineMd, color: colors.text },
  ctaBtn: { minWidth: 140 },
});
