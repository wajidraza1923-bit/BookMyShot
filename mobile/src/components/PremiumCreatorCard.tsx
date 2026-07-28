/**
 * PremiumCreatorCard — World-class marketplace creator card
 * Inspired by Airbnb, Urban Company, WedMeGood
 * BookMyShot branding: Purple gradient + elegant minimal design
 */
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface Props {
  item: any;
  onPress: () => void;
  onGetQuote: () => void;
  onWishlist?: () => void;
  isSaved?: boolean;
}

export default function PremiumCreatorCard({ item, onPress, onGetQuote, onWishlist, isSaved }: Props) {
  const getImg = () => {
    if (item.coverImage) return item.coverImage;
    const p = item.portfolio?.[0];
    if (p) return typeof p === 'string' ? p : (p.url || '');
    return item.user?.avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600';
  };

  const portfolioCount = (item.portfolio || []).length;

  return (
    <View style={st.card}>
      {/* ═══ IMAGE SECTION ═══ */}
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={st.imgWrap}>
          <Image source={{ uri: getImg() }} style={st.img} />
          {/* Dark gradient overlay at bottom */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={st.imgOverlay} />

          {/* Badges — top left */}
          <View style={st.badges}>
            {item.verified && (
              <View style={st.badgePill}>
                <Ionicons name="shield-checkmark" size={10} color="#fff" />
                <Text style={st.badgeText}>Verified</Text>
              </View>
            )}
            {item.featured && (
              <View style={[st.badgePill, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="star" size={10} color="#fff" />
                <Text style={st.badgeText}>Featured</Text>
              </View>
            )}
            {(item.cashbackPercent || 0) > 0 && (
              <View style={[st.badgePill, { backgroundColor: '#10B981' }]}>
                <Text style={st.badgeText}>🎁 {item.cashbackPercent}%</Text>
              </View>
            )}
          </View>

          {/* Wishlist — top right, frosted glass */}
          <TouchableOpacity style={st.wishlistBtn} onPress={onWishlist} activeOpacity={0.7}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? '#EF4444' : '#FFFFFF'} />
          </TouchableOpacity>

          {/* Creator info overlay — bottom left */}
          <View style={st.imgInfo}>
            <Text style={st.imgName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
            <View style={st.imgMeta}>
              <Ionicons name="camera" size={10} color="rgba(255,255,255,0.8)" />
              <Text style={st.imgMetaText}>{item.specialty || 'Photographer'}</Text>
              <Text style={st.imgDot}>•</Text>
              <Ionicons name="location" size={10} color="rgba(255,255,255,0.8)" />
              <Text style={st.imgMetaText}>{item.baseCity || item.city || 'India'}</Text>
            </View>
          </View>

          {/* Portfolio count — bottom right */}
          {portfolioCount > 0 && (
            <View style={st.portfolioBadge}>
              <Ionicons name="images-outline" size={10} color="#fff" />
              <Text style={st.portfolioText}>{portfolioCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ═══ CONTENT SECTION ═══ */}
      <View style={st.body}>
        {/* Stats Row */}
        <View style={st.statsRow}>
          <View style={st.stat}>
            <Text style={st.statVal}>⭐ {item.rating || '5.0'}</Text>
            <Text style={st.statLbl}>{item.reviewCount || 0} reviews</Text>
          </View>
          <View style={st.statSep} />
          <View style={st.stat}>
            <Text style={st.statVal}>{item.weddingsCount || 0}+</Text>
            <Text style={st.statLbl}>Bookings</Text>
          </View>
          <View style={st.statSep} />
          <View style={st.stat}>
            <Text style={st.statVal}>₹{((item.budgetMin || 10000) / 1000).toFixed(0)}k+</Text>
            <Text style={st.statLbl}>Starting</Text>
          </View>
          <View style={st.statSep} />
          <View style={st.stat}>
            <Text style={st.statVal}>{item.experience || '3'}+</Text>
            <Text style={st.statLbl}>Years</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={st.tagsRow}>
          <View style={st.tagGreen}><Text style={st.tagGreenText}>✓ Available</Text></View>
          {item.serviceAreas && item.serviceAreas.length > 0 && (
            <View style={st.tagLight}><Text style={st.tagLightText}>📍 {item.serviceAreas.length} Service Areas</Text></View>
          )}
        </View>

        {/* Buttons */}
        <View style={st.btnsRow}>
          <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ flex: 1 }}>
            <LinearGradient colors={['#7C3AED', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.btnPrimary}>
              <Text style={st.btnPrimaryText}>View Profile</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={st.btnSecondary} activeOpacity={0.85} onPress={onGetQuote}>
            <Ionicons name="chatbubble-outline" size={14} color="#7C3AED" />
            <Text style={st.btnSecondaryText}>Get Quote</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { width: CARD_WIDTH, alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 18, overflow: 'hidden', elevation: 4, shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
  // Image
  imgWrap: { width: '100%', height: 180, position: 'relative' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 },
  // Badges
  badges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  // Wishlist
  wishlistBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  // Image overlay info
  imgInfo: { position: 'absolute', bottom: 12, left: 14 },
  imgName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  imgMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  imgMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  imgDot: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  // Portfolio
  portfolioBadge: { position: 'absolute', bottom: 12, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  portfolioText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  // Body
  body: { padding: 16 },
  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 13, fontWeight: '800', color: '#1F2937' },
  statLbl: { fontSize: 9, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  statSep: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  // Tags
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tagGreen: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  tagGreenText: { fontSize: 10, fontWeight: '600', color: '#065F46' },
  tagLight: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  tagLightText: { fontSize: 10, fontWeight: '500', color: '#374151' },
  // Buttons
  btnsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, elevation: 3, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 48, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: '#7C3AED', backgroundColor: '#FFFFFF' },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
});
