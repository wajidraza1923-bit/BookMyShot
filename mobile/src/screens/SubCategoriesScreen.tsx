import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Dimensions, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_W = (width - 20 * 2 - 10) / 2; // 2 columns with 20px padding and 10px gap

// Local fallback subcategories when API is unavailable
const FALLBACK_SUBCATEGORIES: Record<string, any[]> = {
  'photography-videography': [
    { _id: '1', name: 'Wedding Photography', slug: 'wedding-photography', icon: 'camera-outline', creatorCount: 0 },
    { _id: '2', name: 'Pre-Wedding Shoot', slug: 'pre-wedding-shoot', icon: 'heart-outline', creatorCount: 0 },
    { _id: '3', name: 'Maternity Shoot', slug: 'maternity-shoot', icon: 'flower-outline', creatorCount: 0 },
    { _id: '4', name: 'Baby Shoot', slug: 'baby-shoot', icon: 'happy-outline', creatorCount: 0 },
    { _id: '5', name: 'Candid Photography', slug: 'candid-photography', icon: 'aperture-outline', creatorCount: 0 },
    { _id: '6', name: 'Wedding Films', slug: 'wedding-films', icon: 'film-outline', creatorCount: 0 },
    { _id: '7', name: 'Cinematic Video', slug: 'cinematic-video', icon: 'videocam-outline', creatorCount: 0 },
    { _id: '8', name: 'Drone Videography', slug: 'drone-videography', icon: 'airplane-outline', creatorCount: 0 },
  ],
  'makeup-artists': [
    { _id: '1', name: 'Bridal Makeup', slug: 'bridal-makeup', icon: 'color-palette-outline', creatorCount: 0 },
    { _id: '2', name: 'Party Makeup', slug: 'party-makeup', icon: 'sparkles-outline', creatorCount: 0 },
    { _id: '3', name: 'Engagement Makeup', slug: 'engagement-makeup', icon: 'diamond-outline', creatorCount: 0 },
    { _id: '4', name: 'Hair Styling', slug: 'hair-styling', icon: 'cut-outline', creatorCount: 0 },
    { _id: '5', name: 'Mehndi Artist', slug: 'mehndi-artist', icon: 'hand-left-outline', creatorCount: 0 },
  ],
  'decoration-floral': [
    { _id: '1', name: 'Mandap Decoration', slug: 'mandap-decoration', icon: 'home-outline', creatorCount: 0 },
    { _id: '2', name: 'Stage Decoration', slug: 'stage-decoration', icon: 'easel-outline', creatorCount: 0 },
    { _id: '3', name: 'Floral Arrangement', slug: 'floral-arrangement', icon: 'flower-outline', creatorCount: 0 },
    { _id: '4', name: 'Lighting & LED', slug: 'lighting-led', icon: 'bulb-outline', creatorCount: 0 },
    { _id: '5', name: 'Car Decoration', slug: 'car-decoration', icon: 'car-outline', creatorCount: 0 },
  ],
  'wedding-planners': [
    { _id: '1', name: 'Full Wedding Planning', slug: 'full-wedding-planning', icon: 'clipboard-outline', creatorCount: 0 },
    { _id: '2', name: 'Day-of Coordination', slug: 'day-of-coordination', icon: 'today-outline', creatorCount: 0 },
    { _id: '3', name: 'Destination Wedding', slug: 'destination-wedding-planning', icon: 'navigate-outline', creatorCount: 0 },
    { _id: '4', name: 'Budget Planning', slug: 'budget-planning', icon: 'wallet-outline', creatorCount: 0 },
  ],
  'catering-services': [
    { _id: '1', name: 'Veg Catering', slug: 'veg-catering', icon: 'leaf-outline', creatorCount: 0 },
    { _id: '2', name: 'Non-Veg Catering', slug: 'non-veg-catering', icon: 'restaurant-outline', creatorCount: 0 },
    { _id: '3', name: 'Multi-Cuisine', slug: 'multi-cuisine', icon: 'globe-outline', creatorCount: 0 },
    { _id: '4', name: 'Live Food Counter', slug: 'live-food-counter', icon: 'flame-outline', creatorCount: 0 },
    { _id: '5', name: 'Bakery & Cakes', slug: 'bakery-cakes', icon: 'cafe-outline', creatorCount: 0 },
  ],
  'venues': [
    { _id: '1', name: 'Banquet Halls', slug: 'banquet-halls', icon: 'business-outline', creatorCount: 0 },
    { _id: '2', name: 'Hotels & Resorts', slug: 'hotels-resorts', icon: 'bed-outline', creatorCount: 0 },
    { _id: '3', name: 'Farm Houses', slug: 'farm-houses', icon: 'leaf-outline', creatorCount: 0 },
    { _id: '4', name: 'Open Lawns', slug: 'open-lawns', icon: 'sunny-outline', creatorCount: 0 },
    { _id: '5', name: 'Heritage Properties', slug: 'heritage-properties', icon: 'library-outline', creatorCount: 0 },
  ],
  'djs-entertainment': [
    { _id: '1', name: 'Wedding DJ', slug: 'wedding-dj', icon: 'musical-notes-outline', creatorCount: 0 },
    { _id: '2', name: 'Live Band', slug: 'live-band', icon: 'mic-outline', creatorCount: 0 },
    { _id: '3', name: 'Singer / Performer', slug: 'singer-performer', icon: 'person-outline', creatorCount: 0 },
    { _id: '4', name: 'Anchor / Emcee', slug: 'anchor-emcee', icon: 'megaphone-outline', creatorCount: 0 },
    { _id: '5', name: 'Dhol / Brass Band', slug: 'dhol-brass-band', icon: 'volume-high-outline', creatorCount: 0 },
  ],
};

export default function SubCategoriesScreen({ navigation, route }: any) {
  const { slug, name, icon } = route.params || {};
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadSubcategories();
  }, [slug]);

  const loadSubcategories = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/subcategories/${slug}`);
      const data = res.data?.data || [];
      if (data.length > 0) {
        setSubcategories(data);
      } else {
        // API returned empty — use fallback
        setSubcategories(FALLBACK_SUBCATEGORIES[slug] || []);
      }
    } catch {
      // API failed — use local fallback subcategories
      const fallback = FALLBACK_SUBCATEGORIES[slug];
      if (fallback && fallback.length > 0) {
        setSubcategories(fallback);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryPress = (item: any) => {
    // Go back to home first, then switch to Discover tab with filters
    // This works because 'Discover' is a tab name accessible from anywhere in the tree
    navigation.navigate('Discover', {
      category: slug,
      subcategory: item.slug,
      subcategoryName: item.name,
    });
  };

  const renderSubcategoryCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSubcategoryPress(item)}
      activeOpacity={0.8}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImg} />
      ) : (
        <View style={styles.cardImgPlaceholder}>
          <Ionicons name={(item.icon || 'ellipse-outline') as any} size={28} color="#6C3BFF" />
        </View>
      )}
      <View style={styles.cardOverlay} />
      <View style={styles.cardIconBadge}>
        <Ionicons name={(item.icon || 'ellipse-outline') as any} size={14} color="#6C3BFF" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardCount}>{item.creatorCount || 0}+ Creators</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050403" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={(icon || 'grid-outline') as any} size={16} color="#6C3BFF" />
          <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Sub Categories'}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6C3BFF" />
          <Text style={styles.loadingText}>Loading subcategories...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="rgba(255,255,255,0.3)" />
          <Text style={styles.errorText}>Couldn't load subcategories</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSubcategories}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : subcategories.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="folder-open-outline" size={40} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>No subcategories available</Text>
          <Text style={styles.emptySubText}>Check back later for updates</Text>
        </View>
      ) : (
        <FlatList
          data={subcategories}
          keyExtractor={(item) => item._id || item.slug}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderSubcategoryCard}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    maxWidth: width * 0.55,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6C3BFF',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_W,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F8F6FF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#6C3BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImgPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardIconBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(108,59,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 16,
  },
  cardCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
    fontWeight: '500',
  },
});
