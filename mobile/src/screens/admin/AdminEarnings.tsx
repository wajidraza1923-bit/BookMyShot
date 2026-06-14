import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminEarnings({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.get('/admin/payment-history'); setData(res.data); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const stats = data?.stats || {};

  return (
    <View style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>Earnings</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
        <View style={s.card}>
          <Text style={s.cardLabel}>Total Revenue</Text>
          <Text style={s.cardValue}>₹{(stats.totalRevenue || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>This Month</Text>
          <Text style={[s.cardValue, { color: colors.success }]}>₹{(stats.monthlyRevenue || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Active Subscriptions</Text>
          <Text style={s.cardValue}>{stats.activeSubscriptions || 0}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Failed Payments</Text>
          <Text style={[s.cardValue, { color: colors.error }]}>{stats.failedPayments || 0}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Expired</Text>
          <Text style={s.cardValue}>{stats.expiredSubscriptions || 0}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardLabel: { ...typography.labelMd, color: colors.textMuted },
  cardValue: { ...typography.displayMd, color: colors.text, marginTop: spacing.sm },
});
