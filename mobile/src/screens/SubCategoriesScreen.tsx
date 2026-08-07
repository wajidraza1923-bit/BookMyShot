import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Dimensions, Platform, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { useServiceLocation } from '../context/LocationContext';

const { width } = Dimensions.get('window');
const CARD_W = (width - 20 * 2 - 12) / 2; // 2 columns

// Premium images for each subcategory
const SUB_IMAGES: Record<string, string> = {
  'wedding-photography': 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&w=400',
  'pre-wedding-shoot': 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&w=400',
  'maternity-shoot': 'https://images.pexels.com/photos/3662770/pexels-photo-3662770.jpeg?auto=compress&w=400',
  'baby-shoot': 'https://images.pexels.com/photos/3661272/pexels-photo-3661272.jpeg?auto=compress&w=400',
  'candid-photography': 'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&w=400',
  'wedding-films': 'https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg?auto=compress&w=400',
  'cinematic-video': 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&w=400',
  'drone-videography': 'https://images.pexels.com/photos/1034662/pexels-photo-1034662.jpeg?auto=compress&w=400',
  'bridal-makeup': 'https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&w=400',
  'party-makeup': 'https://images.pexels.com/photos/2681751/pexels-photo-2681751.jpeg?auto=compress&w=400',
  'engagement-makeup': 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&w=400',
  'hair-styling': 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&w=400',
  'mehndi-artist': 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&w=400',
  'mandap-decoration': 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&w=400',
  'stage-decoration': 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&w=400',
  'floral-arrangement': 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&w=400',
  'lighting-led': 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&w=400',
  'car-decoration': 'https://images.pexels.com/photos/1260727/pexels-photo-1260727.jpeg?auto=compress&w=400',
  'full-wedding-planning': 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&w=400',
  'day-of-coordination': 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&w=400',
  'destination-wedding-planning': 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&w=400',
  'budget-planning': 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&w=400',
  'tent-house': 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&w=400',
  'veg-catering': 'https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg?auto=compress&w=400',
  'non-veg-catering': 'https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&w=400',
  'multi-cuisine': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=400',
  'live-food-counter': 'https://images.pexels.com/photos/2544829/pexels-photo-2544829.jpeg?auto=compress&w=400',
  'bakery-cakes': 'https://images.pexels.com/photos/1702373/pexels-photo-1702373.jpeg?auto=compress&w=400',
  'banquet-halls': 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&w=400',
  'hotels-resorts': 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&w=400',
  'farm-houses': 'https://images.pexels.com/photos/462024/pexels-photo-462024.jpeg?auto=compress&w=400',
  'open-lawns': 'https://images.pexels.com/photos/931018/pexels-photo-931018.jpeg?auto=compress&w=400',
  'heritage-properties': 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&w=400',
  'wedding-dj': 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&w=400',
  'live-band': 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&w=400',
  'singer-performer': 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&w=400',
  'anchor-emcee': 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&w=400',
  'dhol-brass-band': 'https://images.pexels.com/photos/2747446/pexels-photo-2747446.jpeg?auto=compress&w=400',
};

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
    { _id: '5', name: 'Tent House', slug: 'tent-house', icon: 'home-outline', creatorCount: 0 },
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
  const { location: savedLocation } = useServiceLocation();
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
      const locParams = savedLocation.district || savedLocation.city || savedLocation.state
        ? `?district=${encodeURIComponent(savedLocation.district || '')}&city=${encodeURIComponent(savedLocation.city || '')}&state=${encodeURIComponent(savedLocation.state || '')}`
        : '';
      const res = await api.get(`/subcategories/${slug}${locParams}`);
      const apiData = res.data?.data || [];
      const fallback = FALLBACK_SUBCATEGORIES[slug] || [];
      
      // Merge: use API data + add any fallback items not in API (by slug)
      const apiSlugs = new Set(apiData.map((d: any) => d.slug));
      const merged = [...apiData, ...fallback.filter(f => !apiSlugs.has(f.slug))];
      setSubcategories(merged.length > 0 ? merged : fallback);
    } catch {
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
    // Navigate to AllCreators with category + subcategory filter + location
    navigation.navigate('AllCreators', {
      categorySlug: slug,
      subcategorySlug: item.slug,
      subcategoryName: item.name,
      categoryName: name,
      district: savedLocation.district || '',
      city: savedLocation.city || '',
      state: savedLocation.state || '',
    });
  };

  const renderSubcategoryCard = ({ item }: any) => {
    const imgUrl = item.imageUrl || SUB_IMAGES[item.slug] || 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&w=400';
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleSubcategoryPress(item)} activeOpacity={0.85}>
        <Image source={{ uri: imgUrl }} style={styles.cardImg} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.cardGradient} />
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardBottom}>
            <Text style={styles.cardCount}>{item.creatorCount || 0} Creators</Text>
            <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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
    color: '#1F2937',
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
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
});
