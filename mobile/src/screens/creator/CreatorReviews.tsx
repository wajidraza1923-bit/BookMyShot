/**
 * CreatorReviews — Creator Dashboard reviews management
 * Uses: GET /api/reviews/my-reviews (same DB as website)
 * Features: View all reviews, hide/show, rating breakdown
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function CreatorReviews({ navigation }: any) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/reviews/my-reviews');
      setReviews(res.data?.reviews || []);
      setStats(res.data?.stats || {});
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleHide = (review: any) => {
    const action = review.hidden ? 'Show' : 'Hide';
    Alert.alert(`${action} Review`, `${action} this review from your public profile?`, [
      { text: 'Cancel' },
      { text: action, onPress: async () => {
        try {
          await api.patch(`/reviews/creator/${review._id}/hide`);
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }},
    ]);
  };

  const avg = stats.avg ? stats.avg.toFixed(1) : '0.0';
  const total = stats.count || 0;
  const dist = [stats.r1 || 0, stats.r2 || 0, stats.r3 || 0, stats.r4 || 0, stats.r5 || 0];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
        <Text style={s.title}>Reviews</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <ActivityIndicator size="large" color="#FF8C2B" style={{ marginTop: 60 }} /> : (
        <FlatList
          data={reviews}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C2B" colors={['#FF8C2B']} />}
          keyExtractor={(item, i) => item._id || String(i)}
          ListHeaderComponent={
            <View style={s.summaryCard}>
              <View style={s.summaryLeft}>
                <Text style={s.summaryNum}>{avg}</Text>
                <View style={s.starsRow}>{[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={14} color={i <= Math.round(Number(avg)) ? '#FF8C2B' : 'rgba(255,255,255,0.1)'} />)}</View>
                <Text style={s.summaryCount}>{total} reviews</Text>
              </View>
              <View style={s.summaryBars}>
                {[5,4,3,2,1].map(star => (
                  <View key={star} style={s.barRow}>
                    <Text style={s.barLabel}>{star}★</Text>
                    <View style={s.barBg}><View style={[s.barFill, { width: `${total > 0 ? (dist[star-1] / total) * 100 : 0}%` }]} /></View>
                    <Text style={s.barCount}>{dist[star-1]}</Text>
                  </View>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={<View style={s.empty}><Ionicons name="chatbubble-outline" size={36} color="rgba(255,255,255,0.1)" /><Text style={s.emptyText}>No reviews yet</Text><Text style={s.emptyHint}>Reviews from your clients will appear here.</Text></View>}
          renderItem={({ item }) => (
            <View style={[s.reviewCard, item.hidden && s.reviewHidden]}>
              <View style={s.reviewHeader}>
                <Image source={{ uri: item.user?.avatar || 'https://via.placeholder.com/40' }} style={s.reviewAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>{item.user?.name || 'Customer'}</Text>
                  <View style={s.reviewStars}>{[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={10} color={i <= item.rating ? '#FF8C2B' : 'rgba(255,255,255,0.1)'} />)}</View>
                </View>
                <Text style={s.reviewDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</Text>
              </View>
              {item.title && <Text style={s.reviewTitle}>{item.title}</Text>}
              {item.text && <Text style={s.reviewText}>{item.text}</Text>}
              <View style={s.reviewActions}>
                {item.hidden && <View style={s.hiddenBadge}><Ionicons name="eye-off" size={10} color="#6B7280" /><Text style={s.hiddenText}>Hidden from public</Text></View>}
                <TouchableOpacity style={s.hideBtn} onPress={() => toggleHide(item)}>
                  <Ionicons name={item.hidden ? 'eye-outline' : 'eye-off-outline'} size={13} color={item.hidden ? '#10B981' : '#6B7280'} />
                  <Text style={[s.hideBtnText, item.hidden && { color: '#10B981' }]}>{item.hidden ? 'Show' : 'Hide'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  // Summary
  summaryCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16, gap: 16 },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', width: 80 },
  summaryNum: { fontSize: 30, fontWeight: '800', color: '#6C3BFF' },
  starsRow: { flexDirection: 'row', gap: 1, marginTop: 4 },
  summaryCount: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
  summaryBars: { flex: 1, justifyContent: 'center', gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', width: 18 },
  barBg: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#6C3BFF', borderRadius: 3 },
  barCount: { fontSize: 9, color: 'rgba(255,255,255,0.3)', width: 16, textAlign: 'right' },
  // Reviews
  reviewCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  reviewHidden: { opacity: 0.5, borderColor: 'rgba(107,114,128,0.2)' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16 },
  reviewName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  reviewStars: { flexDirection: 'row', gap: 1, marginTop: 2 },
  reviewDate: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },
  reviewTitle: { fontSize: 12, fontWeight: '600', color: '#fff', marginBottom: 3 },
  reviewText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 16 },
  reviewActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  hiddenBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(107,114,128,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hiddenText: { fontSize: 9, color: '#6B7280' },
  hideBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  hideBtnText: { fontSize: 10, color: '#6B7280' },
  // Empty
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 10 },
  emptyHint: { fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 },
});
