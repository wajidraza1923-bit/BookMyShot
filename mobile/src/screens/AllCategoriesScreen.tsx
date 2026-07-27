/**
 * AllCategoriesScreen — Displays ALL service categories in a responsive grid.
 * Fetches dynamically from /discover/categories API.
 * Tapping a category navigates to SubCategories (which then filters creators).
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Dimensions, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_GAP = 12;
const HORIZONTAL_PAD = 16;
const CARD_WIDTH = (width - HORIZONTAL_PAD * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Icon/gradient mapping for known categories (fallback for missing images)
const CATEGORY_META: Record<string, { icon: string; gradient: string[] }> = {
  'photography-videography': { icon: 'camera-outline', gradient: ['#818CF8', '#6366F1'] },
  'videography': { icon: 'videocam-outline', gradient: ['#F472B6', '#EC4899'] },
  'makeup-artists': { icon: 'color-palette-outline', gradient: ['#FBBF24', '#F59E0B'] },
  'decoration-floral': { icon: 'flower-outline', gradient: ['#34D399', '#10B981'] },
  'catering-services': { icon: 'restaurant-outline', gradient: ['#FB923C', '#F97316'] },
  'mehndi-artist': { icon: 'hand-left-outline', gradient: ['#FB7185', '#F43F5E'] },
  'venues': { icon: 'business-outline', gradient: ['#38BDF8', '#0EA5E9'] },
  'djs-entertainment': { icon: 'musical-notes-outline', gradient: ['#A78BFA', '#8B5CF6'] },
  'wedding-planners': { icon: 'clipboard-outline', gradient: ['#4ADE80', '#22C55E'] },
};

const DEFAULT_GRADIENT = ['#6C3BFF', '#A78BFA'];

export default function AllCategoriesScreen({ navigation }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(false);
    try {
      // Fetch ALL categories (no homepage filter)
      const res = await api.get('/discover/categories');
      const data = res.data?.data || [];
      if (data.length > 0) {
        setCategories(data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (item: any) => {
    const slug = item.slug || item.name?.toLowerCase().replace(/\s+/g, '-');
    navigation.navigate('SubCategories', {
      slug,
      name: item.name,
      icon: item.icon || 'grid-outline',
    });
  };

  const renderCategory = ({ item }: any) => {
    const slug = item.slug || item.name?.toLowerCase().replace(/\s+/g, '-');
    const meta = CATEGORY_META[slug];
    const gradient = meta?.gradient || DEFAULT_GRADIENT;
    const icon = item.icon || meta?.icon || 'grid-outline';
    const imageUrl = item.imageUrl || '';
    const creatorCount = item.creatorCount || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => handleCategoryPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} category, ${creatorCount} creators`}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <LinearGradient colors={gradient as [string, string]} style={styles.cardImage}>
            <Ionicons name={icon as any} size={40} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardOverlay}
        />
        <View style={styles.cardContent}>
          <View style={styles.iconBadge}>
            <Ionicons name={icon as any} size={16} color="#fff" />
          </View>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          {creatorCount > 0 && (
            <Text style={styles.cardCount}>{creatorCount} Creator{creatorCount !== 1 ? 's' : ''}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>All Categories</Text>
          <Text style={styles.headerSubtitle}>
            {categories.length} categories available
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C3BFF" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : error || categories.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.errorText}>Unable to load categories</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadCategories}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item._id || item.slug || item.name}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  grid: {
    padding: HORIZONTAL_PAD,
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 18,
  },
  cardCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#6C3BFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
