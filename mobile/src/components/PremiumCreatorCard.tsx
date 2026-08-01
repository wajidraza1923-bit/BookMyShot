/**
 * PremiumCreatorCard — Compact, modern marketplace card
 * Inspired by Airbnb/Swiggy/Zomato: 2-3 cards visible per screen
 */
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_W = Dimensions.get('window').width;

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
    if (p && typeof p === 'string' && p.startsWith('http')) return p;
    if (p && typeof p === 'object' && p.url) return p.url;
    if (item.user?.avatar && item.user.avatar.startsWith('http')) return item.user.avatar;
    return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=250&fit=crop';
  };

  return (
    <View style={st.card}>
      {/* IMAGE */}
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={st.imgWrap}>
          <Image source={{ uri: getImg() }} style={st.img} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={st.gradient} />

          {/* Badges */}
          <View style={st.badges}>
            {item.verified && <View style={st.badge}><Ionicons name="shield-checkmark" size={8} color="#fff" /><Text style={st.badgeT}>Verified</Text></View>}
            {item.featured && <View style={[st.badge, { backgroundColor: '#F59E0B' }]}><Text style={st.badgeT}>⭐ Featured</Text></View>}
          </View>

          {/* Heart */}
          <TouchableOpacity style={st.heart} onPress={onWishlist}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={16} color={isSaved ? '#EF4444' : '#fff'} />
          </TouchableOpacity>

          {/* Name overlay */}
          <View style={st.overlay}>
            <Text style={st.overlayName} numberOfLines={1}>{item.user?.name || 'Creator'}</Text>
            <Text style={st.overlayMeta}>{item.specialty || item.subcategorySlug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || item.categorySlug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || item.category?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Creator'} • {item.baseCity || item.city || 'India'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* BODY */}
      <View style={st.body}>
        {/* Stats */}
        <View style={st.stats}>
          <View style={st.statItem}><Ionicons name="star" size={11} color="#F59E0B" /><Text style={st.statV}>{item.rating || '5.0'}</Text><Text style={st.statL}>({item.reviewCount || 0})</Text></View>
          <View style={st.statItem}><Ionicons name="calendar-outline" size={11} color="#7C3AED" /><Text style={st.statV}>{item.weddingsCount || 0}</Text><Text style={st.statL}>done</Text></View>
          <View style={st.statItem}><Ionicons name="wallet-outline" size={11} color="#10B981" /><Text style={st.statV}>₹{((item.budgetMin || 10000) / 1000).toFixed(0)}k+</Text></View>
          <View style={[st.availBadge]}><Text style={st.availText}>Available</Text></View>
        </View>

        {/* Buttons */}
        <View style={st.btns}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85} onPress={onPress}>
            <LinearGradient colors={['#7C3AED', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.btnP}>
              <Text style={st.btnPT}>View Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={st.btnS} activeOpacity={0.85} onPress={onGetQuote}>
            <Ionicons name="chatbubble-outline" size={12} color="#7C3AED" />
            <Text style={st.btnST}>Get Quote</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  // Image
  imgWrap: { width: '100%', height: 130, position: 'relative' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  // Badges
  badges: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#7C3AED', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  badgeT: { fontSize: 9, fontWeight: '700', color: '#fff' },
  // Heart
  heart: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  // Overlay
  overlay: { position: 'absolute', bottom: 8, left: 10 },
  overlayName: { fontSize: 15, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  overlayMeta: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1, fontWeight: '500' },
  // Body
  body: { padding: 12 },
  // Stats
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statV: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  statL: { fontSize: 10, color: '#6B7280' },
  availBadge: { marginLeft: 'auto', backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#A7F3D0' },
  availText: { fontSize: 9, fontWeight: '700', color: '#065F46' },
  // Buttons
  btns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnP: { height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPT: { fontSize: 12, fontWeight: '700', color: '#fff' },
  btnS: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', gap: 4 },
  btnST: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
});
