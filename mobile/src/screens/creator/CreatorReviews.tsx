import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function CreatorReviews({ navigation }: any) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Get creator ID first, then fetch reviews
      const meRes = await api.get('/auth/me');
      const creatorId = meRes.data?.creator?._id;
      if (creatorId) {
        const res = await api.get(`/reviews/creator/${creatorId}`);
        setReviews(res.data?.reviews || res.data?.data || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Ionicons key={i} name={i < rating ? 'star' : 'star-outline'} size={12} color={i < rating ? colors.primary : colors.textMuted} />
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Reviews</Text>
      </View>

      {/* Rating Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryRating}>{avgRating}</Text>
        <View style={styles.summaryStars}>{renderStars(Math.round(parseFloat(avgRating)))}</View>
        <Text style={styles.summaryCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={reviews}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="chatbubble-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No reviews yet</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image source={{ uri: item.user?.avatar || 'https://via.placeholder.com/40' }} style={styles.reviewAvatar} />
                <View style={styles.reviewInfo}>
                  <Text style={styles.reviewName}>{item.user?.name || 'Customer'}</Text>
                  <View style={styles.reviewStars}>{renderStars(item.rating || 0)}</View>
                </View>
                <Text style={styles.reviewDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</Text>
              </View>
              {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
              {item.text && <Text style={styles.reviewText}>{item.text}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  summaryCard: { alignItems: 'center', marginHorizontal: spacing.xl, marginTop: spacing.md, backgroundColor: colors.primaryMuted, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderGold },
  summaryRating: { ...typography.displayLg, color: colors.primary },
  summaryStars: { flexDirection: 'row', gap: 3, marginTop: spacing.xs },
  summaryCount: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: spacing.md },
  reviewInfo: { flex: 1 },
  reviewName: { ...typography.headlineSm, color: colors.text },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewDate: { ...typography.caption, color: colors.textMuted },
  reviewTitle: { ...typography.labelLg, color: colors.text, marginBottom: spacing.xs },
  reviewText: { ...typography.bodyMd, color: colors.textSecondary, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
