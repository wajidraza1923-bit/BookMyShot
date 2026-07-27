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
      const res = await api.get('/profile-interactions/saved');
      setCreators(res.data?.data || []);
    } catch (e: any) {
      console.log('[SavedCreators] Load error:', e.message);
    } finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const removeFavorite = (id: string, name: string) => {
    Alert.alert('Remove', `Remove ${name} from saved?`, [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.post('/profile-interactions/toggle', { creatorId: id, type: 'save' });
          setCreators(prev => prev.filter(c => (c._id || c.creator?._id) !== id));
        } catch (e: any) { console.log('[SavedCreators] Remove error:', e.message); }
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
            const portfolio0 = (creator.portfolio || [])[0];
            const coverImg = creator.coverImage || (typeof portfolio0 === 'string' ? portfolio0 : portfolio0?.url || '') || '';
            return (
              <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate('CreatorProfile', { id: creator._id })}>
                {coverImg ? <Image source={{ uri: coverImg }} style={s.coverImg} /> : null}
                <View style={s.cardBody}>
                  <Image source={{ uri: avatar || 'https://via.placeholder.com/48' }} style={s.avatar} />
                  <View style={s.info}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={s.name} numberOfLines={1}>{name}</Text>
                      {creator.verified && <Ionicons name="checkmark-circle" size={13} color="#6C3BFF" />}
                      {creator.featured && <View style={s.featBadge}><Ionicons name="star" size={8} color="#fff" /></View>}
                    </View>
                    <Text style={s.spec}>{creator.specialty || 'Photographer'} • {creator.city || 'India'}</Text>
                    <View style={s.metaRow}>
                      {creator.rating > 0 && <View style={s.ratingRow}><Ionicons name="star" size={11} color="#F59E0B" /><Text style={s.rating}>{creator.rating?.toFixed(1)}</Text></View>}
                      {(creator.budgetMin || creator.startingPrice) > 0 && <Text style={s.price}>₹{(creator.budgetMin || creator.startingPrice || 0).toLocaleString('en-IN')}</Text>}
                    </View>
                  </View>
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeFavorite(creator._id, name)}>
                    <Ionicons name="bookmark" size={18} color="#6C3BFF" />
                  </TouchableOpacity>
                </View>
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
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  coverImg: { width: '100%', height: 100, resizeMode: 'cover' },
  cardBody: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#6C3BFF' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  spec: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 11, fontWeight: '600', color: '#374151' },
  price: { fontSize: 11, fontWeight: '700', color: '#6C3BFF' },
  featBadge: { backgroundColor: '#F59E0B', width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing['6xl'] },
  emptyTitle: { ...typography.headlineMd, color: colors.text, marginTop: spacing.lg },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing['3xl'] },
});
