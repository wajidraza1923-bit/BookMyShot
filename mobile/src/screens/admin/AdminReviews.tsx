/**
 * AdminReviews — Full review management for admin
 * Tabs: Creator Reviews | Platform Reviews | Hidden
 * Actions: Hide/Unhide/Delete, Filter by creator/rating
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

type Tab = 'creator' | 'platform' | 'hidden';

export default function AdminReviews({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('creator');
  const [reviews, setReviews] = useState<any[]>([]);
  const [platformReviews, setPlatformReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [crRes, plRes] = await Promise.all([
        api.get('/reviews/admin/all'),
        api.get('/reviews/admin/platform'),
      ]);
      setReviews(crRes.data?.data || []);
      setPlatformReviews(plRes.data?.data || []);
    } catch (e: any) { console.log('[AdminReviews] Error:', e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getDisplayData = () => {
    if (tab === 'creator') return reviews.filter(r => !r.hidden);
    if (tab === 'platform') return platformReviews;
    return reviews.filter(r => r.hidden);
  };

  const toggleVisibility = async (review: any) => {
    const action = review.hidden ? 'Unhide' : 'Hide';
    Alert.alert(action, `${action} this review?`, [
      { text: 'Cancel' },
      { text: action, onPress: async () => {
        try {
          await api.patch(`/reviews/admin/${review._id}/visibility`);
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }},
    ]);
  };

  const deleteReview = (review: any, isPlatform: boolean) => {
    Alert.alert('Delete Review', 'Permanently delete this review?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const endpoint = isPlatform ? `/reviews/admin/platform/${review._id}` : `/reviews/admin/${review._id}`;
          await api.delete(endpoint);
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }},
    ]);
  };

  const totalCreatorReviews = reviews.length;
  const hiddenCount = reviews.filter(r => r.hidden).length;
  const avgRating = reviews.length > 0 ? (reviews.filter(r => !r.hidden).reduce((s, r) => s + (r.rating || 0), 0) / Math.max(1, reviews.filter(r => !r.hidden).length)).toFixed(1) : '0';

  const data = getDisplayData();

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Reviews Management</Text>
          <Text style={st.subtitle}>★ {avgRating} avg • {totalCreatorReviews} creator • {platformReviews.length} platform • {hiddenCount} hidden</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={st.tabs}>
        {([['creator', 'Creator Reviews'], ['platform', 'App Reviews'], ['hidden', 'Hidden']] as [Tab, string][]).map(([id, label]) => (
          <TouchableOpacity key={id} style={[st.tab, tab === id && st.tabActive]} onPress={() => setTab(id)}>
            <Text style={[st.tabText, tab === id && st.tabTextActive]}>{label}</Text>
            <View style={[st.tabBadge, tab === id && st.tabBadgeActive]}>
              <Text style={st.tabBadgeText}>{id === 'creator' ? reviews.filter(r => !r.hidden).length : id === 'platform' ? platformReviews.length : hiddenCount}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? <ActivityIndicator size="large" color="#FF8C2B" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={data}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C2B" colors={['#FF8C2B']} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={st.empty}><Ionicons name="chatbubble-outline" size={32} color="rgba(255,255,255,0.08)" /><Text style={st.emptyText}>No reviews</Text></View>}
          renderItem={({ item }) => {
            const isPlatform = tab === 'platform';
            const creatorName = item.creator?.user?.name || 'Unknown Creator';
            const reviewerName = item.user?.name || item.name || 'Anonymous';
            return (
              <View style={[st.card, item.hidden && st.cardHidden]}>
                {/* Header */}
                <View style={st.cardHeader}>
                  <View style={{ flex: 1 }}>
                    {!isPlatform && <Text style={st.creatorName}>{creatorName}</Text>}
                    <Text style={st.reviewerName}>{reviewerName}</Text>
                    <View style={st.starsRow}>
                      {[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={11} color={i <= item.rating ? '#FF8C2B' : 'rgba(255,255,255,0.1)'} />)}
                      <Text style={st.ratingNum}>{item.rating}</Text>
                    </View>
                  </View>
                  <View style={st.cardMeta}>
                    <Text style={st.dateText}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</Text>
                    {item.hidden && <View style={st.hiddenBadge}><Text style={st.hiddenBadgeText}>HIDDEN</Text></View>}
                    {item.phone && <Text style={st.phoneText}>📱 {item.phone}</Text>}
                  </View>
                </View>
                {/* Text */}
                {item.text && <Text style={st.reviewText} numberOfLines={3}>{item.text}</Text>}
                {item.city && <Text style={st.cityText}>📍 {item.city}</Text>}
                {/* Actions */}
                <View style={st.actions}>
                  {!isPlatform && (
                    <TouchableOpacity style={st.actionBtn} onPress={() => toggleVisibility(item)}>
                      <Ionicons name={item.hidden ? 'eye-outline' : 'eye-off-outline'} size={14} color={item.hidden ? '#10B981' : '#6B7280'} />
                      <Text style={[st.actionText, item.hidden && { color: '#10B981' }]}>{item.hidden ? 'Show' : 'Hide'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[st.actionBtn, st.deleteBtn]} onPress={() => deleteReview(item, isPlatform)}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={[st.actionText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  // Tabs
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(255,140,43,0.08)' },
  tabText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  tabTextActive: { color: '#6C3BFF', fontWeight: '700' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: 'rgba(255,140,43,0.15)' },
  tabBadgeText: { fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  // Cards
  card: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  cardHidden: { opacity: 0.5, borderColor: 'rgba(107,114,128,0.2)' },
  cardHeader: { flexDirection: 'row', marginBottom: 6 },
  creatorName: { fontSize: 11, fontWeight: '700', color: '#6C3BFF', marginBottom: 1 },
  reviewerName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 3 },
  ratingNum: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 4 },
  cardMeta: { alignItems: 'flex-end' },
  dateText: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },
  hiddenBadge: { backgroundColor: 'rgba(107,114,128,0.2)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginTop: 3 },
  hiddenBadgeText: { fontSize: 7, fontWeight: '700', color: '#6B7280' },
  phoneText: { fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 2 },
  reviewText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 16, marginBottom: 4 },
  cityText: { fontSize: 9, color: 'rgba(255,255,255,0.25)', marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  deleteBtn: { borderColor: 'rgba(239,68,68,0.15)' },
  actionText: { fontSize: 9, color: '#6B7280' },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
});
