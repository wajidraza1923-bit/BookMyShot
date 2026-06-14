import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminInquiries({ navigation }: any) {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.get('/admin/homepage-enquiries'); setInquiries(res.data?.enquiries || res.data?.data || []); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>Inquiries</Text><Text style={s.count}>{inquiries.length}</Text></View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={inquiries} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No inquiries</Text></View>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name}>{item.name || item.clientName || 'Unknown'}</Text>
              <Text style={s.meta}>{item.phone || ''} • {item.email || ''}</Text>
              <Text style={s.meta}>{item.eventType || 'General'} • {item.city || ''}</Text>
              {item.message && <Text style={s.msg} numberOfLines={2}>"{item.message}"</Text>}
              <Text style={s.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} • Status: {item.status || 'new'}</Text>
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
  count: { ...typography.labelMd, color: colors.primary, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  name: { ...typography.headlineSm, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  msg: { ...typography.bodySm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.sm },
  date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted },
});
