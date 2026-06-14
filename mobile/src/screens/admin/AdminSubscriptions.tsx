import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminSubscriptions({ navigation }: any) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.get('/admin/creator-accounts'); setCreators((res.data?.creators || []).filter((c: any) => c.subscriptionStatus)); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getColor = (s: string) => s === 'active' ? colors.success : s === 'trial' ? colors.info : s === 'expired' ? colors.error : colors.warning;

  return (
    <View style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>Subscriptions</Text></View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={creators} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.row}><Text style={s.name}>{item.user?.name || 'Creator'}</Text><View style={[s.badge, { backgroundColor: getColor(item.subscriptionStatus) + '15' }]}><Text style={[s.badgeText, { color: getColor(item.subscriptionStatus) }]}>{item.subscriptionStatus}</Text></View></View>
              <Text style={s.meta}>Plan: {item.subscriptionPlan || 'basic'} • ₹{item.subscriptionPlanPrice || 0}/mo</Text>
              <Text style={s.meta}>Expires: {item.subscriptionEndDate ? new Date(item.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
            </View>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  name: { ...typography.headlineSm, color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
