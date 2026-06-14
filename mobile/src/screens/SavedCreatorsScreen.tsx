import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function SavedCreatorsScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const res = await api.get('/user/favorites');
      setCreators(res.data?.favorites || res.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const removeFavorite = (id: string, name: string) => {
    Alert.alert('Remove', `Remove ${name} from saved?`, [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.delete(`/user/favorites/${id}`); await load(); } catch {}
      }}
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={s.container}>
        <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>Saved Creators</Text></View>
        <View style={s.empty}><Ionicons name="heart-outline" size={48} color={colors.textMuted} /><Text style={s.emptyTitle}>Sign in to see saved creators</Text></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Saved Creators</Text>
        <Text style={s.count}>{creators.length}</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={creators}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="heart-outline" size={48} color={colors.textMuted} /><Text style={s.emptyTitle}>No saved creators</Text><Text style={s.emptySubtitle}>Tap the heart icon on any creator to save them here</Text></View>}
          renderItem={({ item }) => {
            const creator = item.creator || item;
            const name = creator.user?.name || creator.name || 'Creator';
            const avatar = creator.user?.avatar || '';
            return (
              <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate('CreatorProfile', { id: creator._id })}>
                <Image source={{ uri: avatar || 'https://via.placeholder.com/60' }} style={s.avatar} />
                <View style={s.info}>
                  <Text style={s.name} numberOfLines={1}>{name}</Text>
                  <Text style={s.spec}>{creator.specialty || 'Photographer'} • {creator.city || 'India'}</Text>
                  {creator.rating && <View style={s.ratingRow}><Ionicons name="star" size={11} color={colors.primary} /><Text style={s.rating}>{creator.rating}</Text></View>}
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => removeFavorite(creator._id, name)}>
                  <Ionicons name="heart" size={20} color={colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  count: { ...typography.labelMd, color: colors.primary, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: colors.borderGold },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.headlineSm, color: colors.text },
  spec: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.xs },
  rating: { ...typography.labelSm, color: colors.textSecondary },
  removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing['6xl'] },
  emptyTitle: { ...typography.headlineMd, color: colors.text, marginTop: spacing.lg },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing['3xl'] },
});
