/**
 * CreatorProfileScreen — Premium Luxury Creator Portfolio
 * Design: Airbnb + Instagram + WedMeGood inspired
 * Floating cards, glassmorphism, gold accents, masonry gallery
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Linking, Platform, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import Button from '../components/Button';
import LoginRequiredSheet from '../components/LoginRequiredSheet';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const COL = (width - 44) / 2;

// Dynamic services based on creator category
const SERVICE_MAP: Record<string, { name: string; icon: string; color: string; bg: string }[]> = {
  'photography': [
    { name: 'Photography', icon: 'camera', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Wedding', icon: 'diamond', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Pre Wedding', icon: 'heart', color: '#F43F5E', bg: '#FFF1F2' },
    { name: 'Cinematography', icon: 'film', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Drone', icon: 'airplane', color: '#0EA5E9', bg: '#E0F2FE' },
    { name: 'Candid', icon: 'aperture', color: '#10B981', bg: '#ECFDF5' },
    { name: 'Albums', icon: 'albums', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Events', icon: 'sparkles', color: '#EC4899', bg: '#FDF2F8' },
  ],
  'videography': [
    { name: 'Videography', icon: 'videocam', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Drone', icon: 'airplane', color: '#0EA5E9', bg: '#E0F2FE' },
    { name: 'Live Stream', icon: 'radio', color: '#EF4444', bg: '#FEF2F2' },
    { name: 'Reels', icon: 'play-circle', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Wedding Film', icon: 'film', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Highlights', icon: 'flash', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Cinematic', icon: 'camera', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'LED Wall', icon: 'tv', color: '#10B981', bg: '#ECFDF5' },
  ],
  'makeup': [
    { name: 'Bridal', icon: 'color-palette', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Party', icon: 'sparkles', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'HD Makeup', icon: 'brush', color: '#F43F5E', bg: '#FFF1F2' },
    { name: 'Hair Styling', icon: 'cut', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Engagement', icon: 'diamond', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Mehndi Look', icon: 'hand-left', color: '#10B981', bg: '#ECFDF5' },
    { name: 'Reception', icon: 'star', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Airbrush', icon: 'water', color: '#0EA5E9', bg: '#E0F2FE' },
  ],
  'mehndi': [
    { name: 'Bridal Mehndi', icon: 'hand-left', color: '#10B981', bg: '#ECFDF5' },
    { name: 'Arabic Design', icon: 'leaf', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Full Hand', icon: 'hand-right', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Engagement', icon: 'diamond', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Glitter Mehndi', icon: 'sparkles', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Leg Mehndi', icon: 'footsteps', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Baby Shower', icon: 'happy', color: '#F43F5E', bg: '#FFF1F2' },
    { name: 'Minimal', icon: 'ellipse', color: '#0EA5E9', bg: '#E0F2FE' },
  ],
  'decoration': [
    { name: 'Stage Decor', icon: 'easel', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Floral', icon: 'rose', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Mandap', icon: 'home', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Lighting', icon: 'bulb', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Tent House', icon: 'cube', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Car Decor', icon: 'car', color: '#0EA5E9', bg: '#E0F2FE' },
    { name: 'Entrance', icon: 'enter', color: '#10B981', bg: '#ECFDF5' },
    { name: 'LED Screens', icon: 'tv', color: '#F43F5E', bg: '#FFF1F2' },
  ],
  'catering': [
    { name: 'Veg Menu', icon: 'leaf', color: '#10B981', bg: '#ECFDF5' },
    { name: 'Non-Veg', icon: 'restaurant', color: '#EF4444', bg: '#FEF2F2' },
    { name: 'Multi-Cuisine', icon: 'globe', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Live Counter', icon: 'flame', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Desserts', icon: 'ice-cream', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Beverages', icon: 'cafe', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Chaat Counter', icon: 'fast-food', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Tent & Setup', icon: 'cube', color: '#0EA5E9', bg: '#E0F2FE' },
  ],
  'dj': [
    { name: 'DJ Night', icon: 'musical-notes', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Sound System', icon: 'volume-high', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'LED Setup', icon: 'tv', color: '#0EA5E9', bg: '#E0F2FE' },
    { name: 'Anchor/Host', icon: 'mic', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Dhol', icon: 'musical-note', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Live Band', icon: 'people', color: '#10B981', bg: '#ECFDF5' },
    { name: 'Sangeet', icon: 'sparkles', color: '#F43F5E', bg: '#FFF1F2' },
    { name: 'Fog Machine', icon: 'cloud', color: '#F59E0B', bg: '#FFFBEB' },
  ],
  'planner': [
    { name: 'Full Planning', icon: 'clipboard', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Day-of Coord', icon: 'calendar', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Venue Search', icon: 'search', color: '#10B981', bg: '#ECFDF5' },
    { name: 'Vendor Mgmt', icon: 'people', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Budget Plan', icon: 'wallet', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Destination', icon: 'airplane', color: '#0EA5E9', bg: '#E0F2FE' },
    { name: 'Guest Mgmt', icon: 'list', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Logistics', icon: 'car', color: '#F43F5E', bg: '#FFF1F2' },
  ],
  'venue': [
    { name: 'Banquet Hall', icon: 'business', color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Resort', icon: 'bed', color: '#EC4899', bg: '#FDF2F8' },
    { name: 'Lawn/Garden', icon: 'leaf', color: '#10B981', bg: '#ECFDF5' },
    { name: 'Farmhouse', icon: 'home', color: '#D97706', bg: '#FEF3C7' },
    { name: 'Rooftop', icon: 'sunny', color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Indoor AC', icon: 'snow', color: '#0EA5E9', bg: '#E0F2FE' },
    { name: 'Parking', icon: 'car', color: '#8B5CF6', bg: '#F3E8FF' },
    { name: 'Catering', icon: 'restaurant', color: '#F43F5E', bg: '#FFF1F2' },
  ],
};

// Map category slugs to SERVICE_MAP keys
function getServiceKey(creator: any): string {
  const cat = (creator.categorySlug || creator.category || '').toLowerCase();
  const sub = (creator.subcategorySlug || '').toLowerCase();
  
  if (cat.includes('photography') || cat.includes('video') || sub.includes('photography') || sub.includes('cinematography') || sub.includes('drone')) return 'photography';
  if (cat.includes('makeup') || sub.includes('makeup') || sub.includes('hair') || sub.includes('bridal-makeup')) return 'makeup';
  if (cat.includes('mehndi') || sub.includes('mehndi') || sub.includes('mehandi')) return 'mehndi';
  if (cat.includes('decoration') || cat.includes('floral') || sub.includes('decoration') || sub.includes('tent') || sub.includes('lighting') || sub.includes('mandap')) return 'decoration';
  if (cat.includes('catering') || sub.includes('catering') || sub.includes('food')) return 'catering';
  if (cat.includes('dj') || cat.includes('entertainment') || sub.includes('dj') || sub.includes('anchor') || sub.includes('dhol')) return 'dj';
  if (cat.includes('planner') || sub.includes('planner') || sub.includes('coordinator')) return 'planner';
  if (cat.includes('venue') || sub.includes('venue') || sub.includes('banquet') || sub.includes('resort')) return 'venue';
  if (cat.includes('videography') || sub.includes('videography') || sub.includes('film')) return 'videography';
  return 'photography'; // fallback for unknown categories
}

// Feature carousel — 4 per row
const FEATURES = [
  { icon: 'shield-checkmark', text: 'Verified', gradient: ['#6C3BFF', '#8B5CF6'] },
  { icon: 'flash', text: 'Fast Response', gradient: ['#F59E0B', '#FBBF24'] },
  { icon: 'diamond', text: 'Premium', gradient: ['#EC4899', '#F472B6'] },
  { icon: 'people', text: 'Pro Team', gradient: ['#10B981', '#34D399'] },
];

export default function CreatorProfileScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { isAuthenticated } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>({ avg: 0, count: 0 });
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ likes: 0, saves: 0, shares: 0, views: 0 });
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState('');
  const scrollRef = React.useRef<ScrollView>(null);
  const [reviewsY, setReviewsY] = useState(0);

  const goBack = () => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('CustomerTabs', { screen: 'Home' }); };
  const restrict = () => { if (!isAuthenticated) { setShowLogin(true); return true; } return false; };

  useEffect(() => { load(); }, [id]);
  const load = async () => {
    try {
      const res = await api.get(`/creators/${id}/public`);
      const d = res.data?.creator || res.data;
      setCreator(d);
      try { const r = await api.get(`/reviews/creator/${d._id || id}`); setReviews(r.data?.reviews || []); setReviewStats(r.data?.stats || {}); } catch {}
      try { const s = await api.get(`/profile-interactions/stats/${d._id || id}`); if (s.data?.data) setStats(s.data.data); } catch {}
      if (isAuthenticated) {
        try { const m = await api.get(`/profile-interactions/my/${d._id || id}`); if (m.data?.data) { setLiked(m.data.data.liked); setSaved(m.data.data.saved); } } catch {}
        try { await api.post('/profile-interactions/view', { creatorId: d._id || id }); } catch {}
        try { const inq = await api.get(`/inquiries/check/${d._id || id}`); setContactUnlocked(inq.data?.hasAccepted || false); } catch {}
        // Check if user can write a review (has completed booking with this creator)
        try {
          const revCheck = await api.get(`/reviews/can-review/${d._id || id}`);
          if (revCheck.data?.canReview) { setCanReview(true); setReviewBookingId(revCheck.data.bookingId || ''); }
        } catch {
          // Fallback: check user bookings directly
          try {
            const bRes = await api.get('/user/bookings');
            const myBookings = bRes.data?.bookings || [];
            const completed = myBookings.find((b: any) => (String(b.creator) === String(d._id || id) || String(b.creator?._id) === String(d._id || id)) && (b.status === 'Completed' || b.status === 'completed'));
            if (completed) { setCanReview(true); setReviewBookingId(completed._id); }
          } catch {}
        }
      }
    } catch {} finally { setLoading(false); }
  };

  const toggleLike = async () => {
    if (restrict()) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      const r = await api.post('/profile-interactions/toggle', { creatorId: creator._id, type: 'like' });
      if (r.data?.success) {
        setLiked(r.data.action === 'added');
        setStats(p => ({ ...p, likes: r.data.action === 'added' ? p.likes + 1 : Math.max(0, p.likes - 1) }));
      }
    } catch (e: any) {
      console.log('[Like] Error:', e.response?.data?.message || e.message);
    }
  };

  const toggleSave = async () => {
    if (restrict()) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      const r = await api.post('/profile-interactions/toggle', { creatorId: creator._id, type: 'save' });
      if (r.data?.success) {
        setSaved(r.data.action === 'added');
      }
    } catch (e: any) {
      console.log('[Save] Error:', e.response?.data?.message || e.message);
    }
  };

  const doShare = async () => {
    try {
      await Share.share({ message: `${creator.user?.name} on BookMyShot\nhttps://bookmyshot.in/creator/${creator._id}` });
      if (isAuthenticated) {
        try { await api.post('/profile-interactions/share', { creatorId: creator._id }); } catch {}
      }
    } catch {}
  };

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;
  if (!creator) return <View style={st.center}><Text style={{ color: '#6B7280' }}>Creator not found</Text><TouchableOpacity onPress={goBack} style={{ marginTop: 12 }}><Text style={{ color: '#6C3BFF' }}>← Back</Text></TouchableOpacity></View>;

  const u = creator.user || {};
  const name = u.name || 'Creator';
  const avatar = u.avatar || '';
  const portfolio = (creator.portfolio || []).map((i: any) => typeof i === 'string' ? i : i?.url || '').filter(Boolean);
  const videos = creator.videos || [];
  const packages = creator.packages || [];
  const social = creator.social || {};
  const phone = u.phone || '';
  const rating = reviewStats.avg || creator.rating || 5.0;
  const reviewCount = reviewStats.count || reviews.length;

  return (
    <View style={st.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* ═══ COVER ═══ */}
        <View style={st.cover}>
          <Image source={{ uri: creator.coverImage || portfolio[0] || avatar || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800' }} style={st.coverImg} />
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />
          <View style={st.coverNav}>
            <TouchableOpacity style={st.glassBtn} onPress={goBack}><Ionicons name="arrow-back" size={18} color="#fff" /></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={st.glassBtn} onPress={toggleLike}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FF4FA3' : '#fff'} /></TouchableOpacity>
              <TouchableOpacity style={st.glassBtn} onPress={toggleSave}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? '#FBBF24' : '#fff'} /></TouchableOpacity>
              <TouchableOpacity style={st.glassBtn} onPress={doShare}><Ionicons name="share-outline" size={18} color="#fff" /></TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ═══ FLOATING PROFILE CARD ═══ */}
        <View style={st.floatingCard}>
          <Image source={{ uri: avatar || 'https://via.placeholder.com/72' }} style={st.profileAvatar} />
          <View style={st.profileRight}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={st.profileName}>{name}</Text>
              {creator.verified && <Ionicons name="checkmark-circle" size={16} color="#6C3BFF" />}
              {creator.featured && <View style={st.featuredPill}><Ionicons name="star" size={8} color="#fff" /><Text style={st.featuredPillText}>FEATURED</Text></View>}
            </View>
            <Text style={st.profileSpec}>{creator.specialty || 'Photographer'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="location" size={11} color="#6C3BFF" /><Text style={st.metaText}>{creator.city || 'India'}</Text>
              <Text style={st.metaText}>•</Text><Text style={st.metaText}>{creator.experience === 'Fresher' ? 'Fresher' : `${creator.experience || '2+'} Yrs`}</Text>
            </View>
          </View>
        </View>

        {/* ═══ STATISTICS ═══ */}
        <View style={st.statsBar}>
          <View style={st.statBox}><Text style={st.statNum}>{rating.toFixed(1)}</Text><Text style={st.statLbl}>⭐ Rating</Text></View>
          <View style={st.statDivider} />
          <View style={st.statBox}><Text style={st.statNum}>{stats.likes}</Text><Text style={st.statLbl}>❤️ Likes</Text></View>
          <View style={st.statDivider} />
          <View style={st.statBox}><Text style={st.statNum}>{stats.views}</Text><Text style={st.statLbl}>👁 Views</Text></View>
          <View style={st.statDivider} />
          <View style={st.statBox}><Text style={st.statNum}>{reviewCount}</Text><Text style={st.statLbl}>💬 Reviews</Text></View>
        </View>

        {/* ═══ FEATURE CARDS — 4 per row ═══ */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 16 }}>
          {FEATURES.map((f, i) => (
            <LinearGradient key={i} colors={f.gradient} style={st.featureCard}>
              <Ionicons name={f.icon as any} size={16} color="#fff" />
              <Text style={st.featureText}>{f.text}</Text>
            </LinearGradient>
          ))}
        </View>

        {/* ═══ QUICK ACTION BAR ═══ */}
        <View style={st.quickBar}>
          <TouchableOpacity style={st.quickBtn} onPress={toggleLike}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#EC4899' : '#6B7280'} />
            <Text style={[st.quickLabel, liked && { color: '#EC4899' }]}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.quickBtn} onPress={toggleSave}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? '#6C3BFF' : '#6B7280'} />
            <Text style={[st.quickLabel, saved && { color: '#6C3BFF' }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.quickBtn} onPress={doShare}>
            <Ionicons name="share-social-outline" size={20} color="#6B7280" />
            <Text style={st.quickLabel}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.quickBtn} onPress={() => { scrollRef.current?.scrollTo({ y: reviewsY, animated: true }); }}>
            <Ionicons name="star-outline" size={20} color="#6B7280" />
            <Text style={st.quickLabel}>Review</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ ABOUT ME ═══ */}
        {creator.bio && (
          <View style={st.sec}>
            <Text style={st.secTitle}>About</Text>
            <Text style={st.aboutText}>{creator.bio}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {creator.experience && <View style={st.infoPill}><Ionicons name="briefcase-outline" size={12} color="#6C3BFF" /><Text style={st.infoPillText}>{creator.experience} Experience</Text></View>}
              <View style={st.infoPill}><Ionicons name="flash-outline" size={12} color="#F59E0B" /><Text style={st.infoPillText}>Replies in ~15 min</Text></View>
              <View style={st.infoPill}><Ionicons name="airplane-outline" size={12} color="#3B82F6" /><Text style={st.infoPillText}>Travel Available</Text></View>
            </View>
          </View>
        )}

        {/* ═══ TRUST SECTION ═══ */}
        <View style={st.sec}>
          <Text style={st.secTitle}>Why Book With Me</Text>
          <View style={st.trustGrid}>
            {[
              { icon: 'shield-checkmark', text: '100% Verified', color: '#6C3BFF' },
              { icon: 'lock-closed', text: 'Secure Payments', color: '#10B981' },
              { icon: 'flash', text: 'Fast Response', color: '#F59E0B' },
              { icon: 'hardware-chip', text: 'Pro Equipment', color: '#3B82F6' },
              { icon: 'time', text: 'On-time Delivery', color: '#8B5CF6' },
              { icon: 'airplane', text: 'Travel Anywhere', color: '#EC4899' },
            ].map((t, i) => (
              <View key={i} style={st.trustItem}><Ionicons name={t.icon as any} size={16} color={t.color} /><Text style={st.trustText}>{t.text}</Text></View>
            ))}
          </View>
        </View>

        {/* ═══ SERVICES (dynamic by category) ═══ */}
        <View style={st.sec}>
          <Text style={st.secTitle}>Services</Text>
          <View style={st.serviceGrid}>
            {(SERVICE_MAP[getServiceKey(creator)] || SERVICE_MAP['photography']).map((svc, i) => (
              <View key={i} style={[st.serviceCard, { backgroundColor: svc.bg }]}>
                <Ionicons name={(svc.icon + '-outline') as any} size={20} color={svc.color} />
                <Text style={[st.serviceName, { color: svc.color }]}>{svc.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ PORTFOLIO ═══ */}
        <View style={st.sec}>
          <Text style={st.secTitle}>Portfolio</Text>
          <View style={st.tabBar}>
            <TouchableOpacity style={[st.tabBtn, activeTab === 'photos' && st.tabBtnActive]} onPress={() => setActiveTab('photos')}><Ionicons name="images" size={14} color={activeTab === 'photos' ? '#fff' : '#6B7280'} /><Text style={[st.tabBtnText, activeTab === 'photos' && { color: '#fff' }]}>Photos</Text></TouchableOpacity>
            <TouchableOpacity style={[st.tabBtn, activeTab === 'videos' && st.tabBtnActive]} onPress={() => setActiveTab('videos')}><Ionicons name="videocam" size={14} color={activeTab === 'videos' ? '#fff' : '#6B7280'} /><Text style={[st.tabBtnText, activeTab === 'videos' && { color: '#fff' }]}>Videos</Text></TouchableOpacity>
          </View>
          {activeTab === 'photos' ? (
            <View style={st.masonry}>
              {portfolio.length > 0 ? portfolio.map((img: string, i: number) => (
                <Image key={i} source={{ uri: img }} style={[st.masonryImg, i % 3 === 0 && { height: COL * 1.3 }]} />
              )) : <Text style={st.empty}>No photos yet</Text>}
            </View>
          ) : (
            <View style={st.masonry}>
              {videos.length > 0 ? videos.map((v: any, i: number) => (
                <TouchableOpacity key={i} style={st.videoCard} onPress={() => Linking.openURL(typeof v === 'string' ? v : v?.url || '')}>
                  <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.9)" />
                  <Text style={st.videoLabel}>Video {i + 1}</Text>
                </TouchableOpacity>
              )) : <Text style={st.empty}>No videos yet</Text>}
            </View>
          )}
        </View>

        {/* ═══ PACKAGES ═══ */}
        {packages.length > 0 && (
          <View style={st.sec}>
            <Text style={st.secTitle}>Packages</Text>
            {packages.map((pkg: any, i: number) => (
              <View key={i} style={st.pkgCard}>
                <LinearGradient colors={i === 0 ? ['#6C3BFF', '#8B5CF6'] : ['#F8F6FF', '#FFFFFF']} style={st.pkgGrad}>
                  <Text style={[st.pkgName, i === 0 && { color: '#fff' }]}>{pkg.name || `Package ${i + 1}`}</Text>
                  <Text style={[st.pkgPrice, i === 0 && { color: '#FBBF24' }]}>₹{(pkg.price || 0).toLocaleString('en-IN')}</Text>
                </LinearGradient>
                {pkg.description && <Text style={st.pkgDesc}>{pkg.description}</Text>}
                {pkg.features?.map((f: string, j: number) => (
                  <View key={j} style={st.pkgRow}><Ionicons name="checkmark-circle" size={13} color="#10B981" /><Text style={st.pkgRowText}>{f}</Text></View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ═══ REVIEWS ═══ */}
        <View style={st.sec} onLayout={(e) => setReviewsY(e.nativeEvent.layout.y)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={st.secTitle}>Reviews ({reviewCount})</Text>
            {canReview && (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }} onPress={() => navigation.navigate('WriteReview', { creatorId: creator._id || id, creatorName: u.name, bookingId: reviewBookingId })}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Write Review</Text>
              </TouchableOpacity>
            )}
          </View>
          {reviews.length > 0 ? reviews.slice(0, 3).map((rev: any, i: number) => (
            <View key={i} style={st.revCard}>
              <View style={st.revHead}>
                <Image source={{ uri: rev.user?.avatar || 'https://via.placeholder.com/28' }} style={st.revAvatar} />
                <View style={{ flex: 1 }}><Text style={st.revName}>{rev.user?.name || 'Customer'}</Text><View style={{ flexDirection: 'row' }}>{Array.from({ length: 5 }).map((_, j) => <Ionicons key={j} name={j < rev.rating ? 'star' : 'star-outline'} size={11} color="#F59E0B" />)}</View></View>
                <Text style={st.revDate}>{new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
              </View>
              {rev.text && <Text style={st.revText}>{rev.text}</Text>}
              {rev.reply && <View style={st.revReply}><Text style={st.revReplyLabel}>Creator:</Text><Text style={st.revReplyText}>{rev.reply}</Text></View>}
            </View>
          )) : <Text style={st.empty}>No reviews yet. Be the first to book!</Text>}
          {reviews.length > 3 && (
            <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 10, backgroundColor: '#F3E8FF', borderRadius: 10, marginTop: 4 }} onPress={() => navigation.navigate('AllReviews', { creatorId: creator._id || id, creatorName: u.name })}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6C3BFF' }}>View All {reviews.length} Reviews →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ SOCIAL LINKS ═══ */}
        {(social.instagram || social.youtube || social.facebook || social.website || social.twitter) && (
          <View style={st.sec}>
            <Text style={st.secTitle}>Follow & Connect</Text>
            <View style={st.contactGrid}>
              {social.instagram && (
                <TouchableOpacity style={st.contactCard} onPress={() => Linking.openURL(social.instagram.startsWith('http') ? social.instagram : `https://${social.instagram}`)}>
                  <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                  <Text style={st.contactCardText}>Instagram</Text>
                </TouchableOpacity>
              )}
              {social.youtube && (
                <TouchableOpacity style={st.contactCard} onPress={() => Linking.openURL(social.youtube.startsWith('http') ? social.youtube : `https://${social.youtube}`)}>
                  <Ionicons name="logo-youtube" size={22} color="#FF0000" />
                  <Text style={st.contactCardText}>YouTube</Text>
                </TouchableOpacity>
              )}
              {social.facebook && (
                <TouchableOpacity style={st.contactCard} onPress={() => Linking.openURL(social.facebook.startsWith('http') ? social.facebook : `https://${social.facebook}`)}>
                  <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                  <Text style={st.contactCardText}>Facebook</Text>
                </TouchableOpacity>
              )}
              {social.website && (
                <TouchableOpacity style={st.contactCard} onPress={() => Linking.openURL(social.website.startsWith('http') ? social.website : `https://${social.website}`)}>
                  <Ionicons name="globe-outline" size={22} color="#6C3BFF" />
                  <Text style={st.contactCardText}>Website</Text>
                </TouchableOpacity>
              )}
              {social.twitter && (
                <TouchableOpacity style={st.contactCard} onPress={() => Linking.openURL(social.twitter.startsWith('http') ? social.twitter : `https://${social.twitter}`)}>
                  <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
                  <Text style={st.contactCardText}>Twitter / X</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ═══ LOCKED CONTACT ═══ */}
        <View style={st.sec}>
          <Text style={st.secTitle}>Contact</Text>
          {contactUnlocked ? (
            <View style={st.contactGrid}>
              {phone && <TouchableOpacity style={st.contactCard} onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}><Ionicons name="logo-whatsapp" size={22} color="#25D366" /><Text style={st.contactCardText}>WhatsApp</Text></TouchableOpacity>}
              {phone && <TouchableOpacity style={st.contactCard} onPress={() => Linking.openURL(`tel:${phone}`)}><Ionicons name="call" size={22} color="#3B82F6" /><Text style={st.contactCardText}>Call</Text></TouchableOpacity>}
            </View>
          ) : (
            <LinearGradient colors={['#F8F6FF', '#FFFFFF']} style={st.lockedCard}>
              <View style={st.lockIcon}><Ionicons name="lock-closed" size={24} color="#6C3BFF" /></View>
              <Text style={st.lockedTitle}>Contact details are protected</Text>
              <Text style={st.lockedSub}>Submit an inquiry to unlock WhatsApp, Call and Instagram.</Text>
            </LinearGradient>
          )}
        </View>
      </ScrollView>

      {/* ═══ STICKY CTA ═══ */}
      <View style={st.cta}>
        <View><Text style={st.ctaLabel}>Starting from</Text><Text style={st.ctaPrice}>₹{(packages[0]?.price || creator.budgetMin || 0).toLocaleString('en-IN')}</Text></View>
        <Button title="Send Inquiry" onPress={() => { if (!restrict()) navigation.navigate('Inquiry', { creatorId: id, creatorName: name }); }} size="md" style={{ minWidth: 140, borderRadius: 14 }} />
      </View>

      <LoginRequiredSheet visible={showLogin} onClose={() => setShowLogin(false)} onLogin={() => { setShowLogin(false); navigation.navigate('Login'); }} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  // Cover
  cover: { width: '100%', height: 300, position: 'relative' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverNav: { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 38, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glassBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  // Floating Profile Card
  floatingCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: -36, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 14, elevation: 8, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16 },
  profileAvatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: '#6C3BFF' },
  profileRight: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  profileSpec: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  metaText: { fontSize: 11, color: '#9CA3AF' },
  featuredPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  featuredPillText: { fontSize: 7, fontWeight: '800', color: '#fff' },
  // Stats
  statsBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#FAFBFC', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  statLbl: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: '#F1F5F9' },
  // Feature Cards — 4 per row
  featureCard: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', gap: 4 },
  featureText: { fontSize: 8, fontWeight: '700', color: '#fff', textAlign: 'center' },
  // Quick Action Bar
  quickBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#FAFBFC', borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  quickBtn: { flex: 1, alignItems: 'center', gap: 4 },
  quickLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  // Info Pills
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8F6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#EDE9FE' },
  infoPillText: { fontSize: 10, fontWeight: '500', color: '#374151' },
  // Trust Section
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', width: '48%' },
  trustText: { fontSize: 11, fontWeight: '500', color: '#374151' },
  // Sections
  sec: { paddingHorizontal: 16, marginTop: 24 },
  secTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 14, letterSpacing: -0.3 },
  aboutText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  // Services
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceCard: { width: (width - 56) / 4, alignItems: 'center', paddingVertical: 14, borderRadius: 14, gap: 6 },
  serviceName: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  // Portfolio
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabBtnActive: { backgroundColor: '#6C3BFF' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  masonry: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  masonryImg: { width: COL, height: COL, borderRadius: 14, resizeMode: 'cover' },
  videoCard: { width: COL, height: COL, borderRadius: 14, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  videoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  empty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 30 },
  // Packages
  pkgCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#fff' },
  pkgGrad: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  pkgName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  pkgPrice: { fontSize: 16, fontWeight: '800', color: '#6C3BFF' },
  pkgDesc: { fontSize: 12, color: '#6B7280', paddingHorizontal: 16, paddingBottom: 8 },
  pkgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 3 },
  pkgRowText: { fontSize: 12, color: '#374151' },
  // Reviews
  revCard: { backgroundColor: '#FAFBFC', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  revHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  revAvatar: { width: 28, height: 28, borderRadius: 14 },
  revName: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  revDate: { fontSize: 9, color: '#9CA3AF' },
  revText: { fontSize: 12, color: '#4B5563', lineHeight: 18 },
  revReply: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  revReplyLabel: { fontSize: 9, fontWeight: '700', color: '#6C3BFF' },
  revReplyText: { fontSize: 11, color: '#4B5563', marginTop: 2 },
  // Contact
  contactGrid: { flexDirection: 'row', gap: 10 },
  contactCard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  contactCardText: { fontSize: 10, fontWeight: '600', color: '#374151' },
  lockedCard: { borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  lockIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  lockedTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  lockedSub: { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  // CTA
  cta: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  ctaLabel: { fontSize: 10, color: '#9CA3AF' },
  ctaPrice: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
});
