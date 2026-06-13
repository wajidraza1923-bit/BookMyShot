import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorLeads({ navigation }: any) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/leads');
      setLeads(res.data?.inquiries || res.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getStatusColor = (s: string) => s === 'accepted' ? colors.success : s === 'rejected' ? colors.error : colors.warning;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Leads & Inquiries</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={leads}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No leads yet</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name || 'Client'}</Text>
                  <Text style={styles.cardMeta}>{item.eventType || 'Event'} • {item.city || ''}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status || 'pending'}</Text>
                </View>
              </View>
              {item.message && <Text style={styles.cardMsg} numberOfLines={2}>{item.message}</Text>}
              <View style={styles.cardDetails}>
                {item.budget > 0 && <Text style={styles.detailItem}>₹{item.budget.toLocaleString('en-IN')}</Text>}
                {item.phone && <Text style={styles.detailItem}>{item.phone}</Text>}
                {item.eventDate && <Text style={styles.detailItem}>{new Date(item.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>}
              </View>
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
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600' },
  cardMsg: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.md, fontStyle: 'italic' },
  cardDetails: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  detailItem: { ...typography.labelSm, color: colors.primary },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
