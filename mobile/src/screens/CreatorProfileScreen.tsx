import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, FlatList, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radius } from '../theme';
import Button from '../components/Button';
import LoginRequiredSheet from '../components/LoginRequiredSheet';
import VideoPlayer from '../components/VideoPlayer';
import { creatorsAPI } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const COL2 = (width - 40 - 4) / 2;
const COL3 = (width - 40 - 8) / 3;

export default function CreatorProfileScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { isAuthenticated } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'videos' | 'packages' | 'reviews'>('portfolio');
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const handleRestrictedAction = () => {
    if (!isAuthenticated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLoginSheet(true);
      return true;
    }
    return false;
  };

  useEffect(() => { loadCreator(); }, [id]);

  const loadCreator = async () => {
    try {
      // Use /public endpoint to get full creator data including email for contact
      const res = await api.get(`/creators/${id}/public`);
      const data = res.data?.creator || res.data;
      setCreator(data);
      // Fetch reviews
      try {
        const revRes = await api.get(`/reviews/creator/${id}`);
        setReviews(revRes.data?.reviews || []);
      } catch {}
    } catch {} finally { setLoading(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!creator) return (
    <View style={s.center}>
      <Ionicons name="person-outline" size={40} color="rgba(255,255,255,0.15)" />
      <Text style={s.errorText}>Creator not found</Text>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>This profile may be unavailable</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,140,43,0.1)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.25)', borderRadius: 10 }}>
        <Text style={{ color: '#6C3BFF', fontSize: 13, fontWeight: '600' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const user = creator.user || {};
  const name = user.name || 'Creator';
  const avatar = user.avatar || '';
  const portfolio = (creator.portfolio || []).map((item: any) => typeof item === 'string' ? item : item?.url || item?.secure_url || '').filter(Boolean);
  const videos = creator.videos || [];
  const packages = creator.packages || [];
  const social = creator.social || {};
  const rating = creator.rating || 5.0;
  const reviewCount = reviews.length;
  const weddingsCount = creator.weddingsCount || 0;
  const phone = user.phone || '';

  // Rating breakdown
  const ratingDist = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++; });

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View style={s.hero}>
          <Image source={{ uri: (typeof portfolio[0] === 'string' ? portfolio[0] : '') || avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800' }} style={s.heroImg} />
          <View style={s.heroGrad} />
          {/* Nav */}
          <View style={s.heroNav}>
            <TouchableOpacity style={s.heroBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.heroRight}>
              <TouchableOpacity style={s.heroBtn}><Ionicons name="heart-outline" size={18} color="#fff" /></TouchableOpacity>
              <TouchableOpacity style={s.heroBtn}><Ionicons name="share-outline" size={18} color="#fff" /></TouchableOpacity>
            </View>
          </View>
          {/* Badges */}
          <View style={s.badgeRow}>
            {creator.featured && <View style={s.badge}><Ionicons name="star" size={10} color="#000" /><Text style={s.badgeText}>FEATURED</Text></View>}
            {creator.verified && <View style={[s.badge, { backgroundColor: '#10B981' }]}><Ionicons name="checkmark-circle" size={10} color="#fff" /><Text style={[s.badgeText, { color: '#1F2937' }]}>VERIFIED</Text></View>}
          </View>
        </View>

        {/* PROFILE INFO */}
        <View style={s.profileSec}>
          <View style={s.profileRow}>
            <Image source={{ uri: avatar || 'https://via.placeholder.com/80' }} style={s.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{name}</Text>
              <Text style={s.specialty}>{creator.specialty || 'Photographer'}</Text>
              <View style={s.locRow}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={s.locText}>{creator.city || 'India'}</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <StatItem value={rating.toFixed(1)} label="Rating" icon="star" />
            <View style={s.statDiv} />
            <StatItem value={String(reviewCount)} label="Reviews" />
            <View style={s.statDiv} />
            <StatItem value={creator.experience || '2+'} label="Years" />
            <View style={s.statDiv} />
            <StatItem value={String(weddingsCount)} label="Weddings" />
          </View>

          {/* Bio */}
          {creator.bio ? <Text style={s.bio}>{creator.bio}</Text> : null}

          {/* Social Links */}
          {(social.instagram || social.youtube || social.website || phone) && (
            <View style={s.socialRow}>
              {social.instagram && <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL(social.instagram)}><Ionicons name="logo-instagram" size={16} color="#FF8C2B" /></TouchableOpacity>}
              {social.youtube && <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL(social.youtube)}><Ionicons name="logo-youtube" size={16} color="#FF8C2B" /></TouchableOpacity>}
              {social.website && <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL(social.website)}><Ionicons name="globe-outline" size={16} color="#FF8C2B" /></TouchableOpacity>}
              {phone && <TouchableOpacity style={s.socialBtn} onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`)}><Ionicons name="logo-whatsapp" size={16} color="#FF8C2B" /></TouchableOpacity>}
            </View>
          )}
        </View>

        {/* TABS */}
        <View style={s.tabs}>
          {(['portfolio', 'videos', 'packages', 'reviews'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => { setActiveTab(tab); Haptics.selectionAsync(); }}>
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab === 'portfolio' ? `Photos (${portfolio.length})` : tab === 'videos' ? `Videos (${videos.length})` : tab === 'packages' ? `Packages` : `Reviews (${reviewCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TAB: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <View style={s.galleryWrap}>
            {portfolio.length > 0 ? (
              <View style={s.masonry}>
                {portfolio.map((img: string, i: number) => {
                  const isWide = i % 5 === 0;
                  return (
                    <View key={i} style={[s.masonryItem, isWide ? s.masonryWide : s.masonryNormal]}>
                      <Image source={{ uri: img }} style={s.masonryImg} resizeMode="cover" />
                    </View>
                  );
                })}
              </View>
            ) : (
              <EmptyState icon="images-outline" text="No portfolio photos yet" />
            )}
          </View>
        )}

        {/* TAB: VIDEOS */}
        {activeTab === 'videos' && (
          <View style={s.videosWrap}>
            {videos.length > 0 ? videos.map((v: any, i: number) => {
              const videoUrl = typeof v === 'string' ? v : v.url || '';
              const thumbUrl = videoUrl
                ? videoUrl.replace(/\.(mp4|mov|avi|webm)$/i, '.jpg').replace('/video/upload/', '/video/upload/c_fill,w_400,h_400,so_1/')
                : '';
              return (
                <TouchableOpacity key={i} style={s.videoGridItem} onPress={() => setPlayingVideo(videoUrl)}>
                  <Image source={{ uri: thumbUrl }} style={s.videoGridThumb} />
                  <View style={s.videoPlayOverlay}><Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" /></View>
                </TouchableOpacity>
              );
            }) : (
              <EmptyState icon="videocam-outline" text="No videos uploaded yet" />
            )}
          </View>
        )}

        {/* In-App Video Player */}
        <VideoPlayer visible={!!playingVideo} url={playingVideo || ''} onClose={() => setPlayingVideo(null)} />

        {/* TAB: PACKAGES */}
        {activeTab === 'packages' && (
          <View style={s.packagesWrap}>
            {packages.length > 0 ? packages.map((pkg: any, i: number) => (
              <View key={i} style={s.pkgCard}>
                <View style={s.pkgHeader}>
                  <Text style={s.pkgName}>{pkg.name}</Text>
                  <Text style={s.pkgPrice}>₹{(pkg.price || 0).toLocaleString('en-IN')}</Text>
                </View>
                {pkg.description && <Text style={s.pkgDesc}>{pkg.description}</Text>}
                {pkg.features?.length > 0 && (
                  <View style={s.pkgFeatures}>
                    {pkg.features.map((f: string, j: number) => (
                      <View key={j} style={s.featureRow}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                        <Text style={s.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )) : (
              <EmptyState icon="pricetag-outline" text="No packages listed" />
            )}
          </View>
        )}

        {/* TAB: REVIEWS */}
        {activeTab === 'reviews' && (
          <View style={s.reviewsWrap}>
            {/* Rating Summary */}
            {reviewCount > 0 && (
              <View style={s.ratingSummary}>
                <View style={s.ratingBig}>
                  <Text style={s.ratingNum}>{rating.toFixed(1)}</Text>
                  <View style={s.starsRow}>{[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={14} color={i <= Math.round(rating) ? '#FF8C2B' : 'rgba(255,255,255,0.1)'} />)}</View>
                  <Text style={s.ratingCount}>{reviewCount} reviews</Text>
                </View>
                <View style={s.ratingBars}>
                  {[5,4,3,2,1].map(star => (
                    <View key={star} style={s.barRow}>
                      <Text style={s.barLabel}>{star}</Text>
                      <View style={s.barBg}><View style={[s.barFill, { width: `${reviewCount > 0 ? (ratingDist[star-1] / reviewCount) * 100 : 0}%` }]} /></View>
                      <Text style={s.barCount}>{ratingDist[star-1]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {/* Write Review Button */}
            <TouchableOpacity style={s.writeReviewBtn} onPress={() => navigation.navigate('WriteReview', { creatorId: id, creatorName: name })}>
              <Ionicons name="create-outline" size={15} color="#000" />
              <Text style={s.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
            {/* Review Cards */}
            {reviews.length > 0 ? reviews.filter(r => !r.hidden).map((r: any, i: number) => (
              <View key={r._id || i} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <Image source={{ uri: r.user?.avatar || 'https://via.placeholder.com/40' }} style={s.reviewAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewName}>{r.user?.name || 'User'}</Text>
                    <Text style={s.reviewDate}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</Text>
                  </View>
                  <View style={s.reviewStars}>{[1,2,3,4,5].map(j => <Ionicons key={j} name="star" size={11} color={j <= r.rating ? '#FF8C2B' : 'rgba(255,255,255,0.1)'} />)}</View>
                </View>
                {r.title && <Text style={s.reviewTitle}>{r.title}</Text>}
                <Text style={s.reviewText}>{r.text || r.comment || ''}</Text>
              </View>
            )) : (
              <EmptyState icon="chatbubble-outline" text="No reviews yet" />
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={s.ctaBar}>
        <View>
          <Text style={s.ctaLabel}>Starting from</Text>
          <Text style={s.ctaPrice}>₹{(packages[0]?.price || creator.budgetMin || 0).toLocaleString('en-IN')}</Text>
        </View>
        <Button title="Send Inquiry" onPress={() => { if (!handleRestrictedAction()) navigation.navigate('Inquiry', { creatorId: id, creatorName: name }); }} size="md" style={{ minWidth: 130 }} />
      </View>

      <LoginRequiredSheet visible={showLoginSheet} onClose={() => setShowLoginSheet(false)} onLogin={() => { setShowLoginSheet(false); navigation.navigate('Login'); }} onSignUp={() => { setShowLoginSheet(false); navigation.navigate('Register'); }} />
    </View>
  );
}

function StatItem({ value, label, icon }: { value: string; label: string; icon?: string }) {
  return (
    <View style={s.stat}>
      {icon && <Ionicons name={icon as any} size={12} color="#FF8C2B" style={{ marginBottom: 2 }} />}
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return <View style={s.empty}><Ionicons name={icon as any} size={36} color="rgba(255,255,255,0.1)" /><Text style={s.emptyText}>{text}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14, color: '#9CA3AF' },
  // Hero
  hero: { width: '100%', height: 260, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  heroNav: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  heroBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  heroRight: { flexDirection: 'row' },
  badgeRow: { position: 'absolute', bottom: 12, left: 16, flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#6C3BFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 8, fontWeight: '800', color: '#FFFFFF' },
  // Profile
  profileSec: { paddingHorizontal: 20, paddingTop: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#EDE9FE' },
  name: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  specialty: { fontSize: 12, color: '#6C3BFF', marginTop: 1 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locText: { fontSize: 11, color: '#9CA3AF' },
  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#FAFAFA', borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 14 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  statLbl: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  statDiv: { width: 1, height: 24, backgroundColor: '#F3F4F6' },
  bio: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  // Social
  socialRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  socialBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginHorizontal: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6C3BFF' },
  tabText: { fontSize: 10, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { color: '#6C3BFF', fontWeight: '600' },
  // Gallery
  galleryWrap: { paddingHorizontal: 16, paddingTop: 12 },
  masonry: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  masonryItem: { borderRadius: 8, overflow: 'hidden' },
  masonryWide: { width: width - 32, height: 200 },
  masonryNormal: { width: COL2, height: COL2 },
  masonryImg: { width: '100%', height: '100%' },
  // Videos
  videosWrap: { paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  videoGridItem: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#FAFAFA' },
  videoGridThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  // Packages
  packagesWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  pkgCard: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pkgName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  pkgPrice: { fontSize: 15, fontWeight: '700', color: '#6C3BFF' },
  pkgDesc: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  pkgFeatures: { gap: 5 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 11, color: '#6B7280' },
  // Reviews
  reviewsWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  ratingSummary: { flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10, gap: 16 },
  ratingBig: { alignItems: 'center', justifyContent: 'center', width: 80 },
  ratingNum: { fontSize: 28, fontWeight: '800', color: '#6C3BFF' },
  starsRow: { flexDirection: 'row', gap: 1, marginTop: 4 },
  ratingCount: { fontSize: 9, color: '#9CA3AF', marginTop: 3 },
  ratingBars: { flex: 1, justifyContent: 'center', gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 9, color: '#9CA3AF', width: 10 },
  barBg: { flex: 1, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#6C3BFF', borderRadius: 2 },
  barCount: { fontSize: 9, color: '#9CA3AF', width: 14, textAlign: 'right' },
  reviewCard: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6C3BFF', borderRadius: 10, paddingVertical: 11, marginBottom: 12 },
  writeReviewText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16 },
  reviewName: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  reviewDate: { fontSize: 9, color: '#9CA3AF' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewTitle: { fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 3 },
  reviewText: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  // CTA
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(5,4,3,0.95)', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  ctaLabel: { fontSize: 9, color: '#9CA3AF' },
  ctaPrice: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
});

