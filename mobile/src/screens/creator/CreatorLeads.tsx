import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorLeads({ navigation }: any) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/leads');
      setLeads(res.data?.inquiries || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = leads.filter(l => {
    if (tab === 'all') return true;
    if (tab === 'pending') return l.status === 'pending';
    if (tab === 'accepted') return l.status === 'accepted';
    if (tab === 'rejected') return l.status === 'rejected';
    return true;
  });

  // Accept inquiry → creates booking automatically (same as website)
  const handleAccept = (lead: any) => {
    Alert.alert('Accept Inquiry', `Accept ${lead.name}'s inquiry for ${lead.eventType}?\n\nThis will automatically create a booking.`, [
      { text: 'Cancel' },
      { text: 'Accept', onPress: async () => {
        try {
          const res = await api.patch(`/creator/inquiries/${lead._id}/reply`, { status: 'accepted' });
          await load();
          Alert.alert('Accepted', res.data?.booking ? 'Inquiry accepted and booking created!' : 'Inquiry accepted');
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  // Reject inquiry
  const handleReject = (lead: any) => {
    Alert.alert('Reject', `Decline ${lead.name}'s inquiry?`, [
      { text: 'Cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await api.patch(`/creator/inquiries/${lead._id}/reply`, { status: 'rejected' });
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  const getStatusColor = (s: string) => s === 'accepted' ? colors.success : s === 'rejected' ? colors.error : colors.warning;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Leads & Inquiries</Text>
        <Text style={styles.count}>{leads.filter(l => l.status === 'pending').length} new</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['all', 'pending', 'accepted', 'rejected'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No leads in this category</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name || 'Client'}</Text>
                  {item.phone && <Text style={styles.cardContact}>{item.phone}</Text>}
                  {item.user?.email && <Text style={styles.cardContact}>{item.user.email}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status || 'pending'}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}><Ionicons name="camera-outline" size={12} color={colors.textMuted} /><Text style={styles.detailText}>{item.eventType || 'Event'}</Text></View>
                {item.eventDate && <View style={styles.detailItem}><Ionicons name="calendar-outline" size={12} color={colors.textMuted} /><Text style={styles.detailText}>{new Date(item.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text></View>}
                {item.city && <View style={styles.detailItem}><Ionicons name="location-outline" size={12} color={colors.textMuted} /><Text style={styles.detailText}>{item.city}</Text></View>}
                {item.budget > 0 && <View style={styles.detailItem}><Ionicons name="cash-outline" size={12} color={colors.primary} /><Text style={[styles.detailText, { color: colors.primary }]}>₹{item.budget.toLocaleString('en-IN')}</Text></View>}
              </View>

              {/* Message */}
              {item.message && <Text style={styles.cardMessage} numberOfLines={3}>"{item.message}"</Text>}

              {/* Timestamp */}
              <Text style={styles.timestamp}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</Text>

              {/* Actions (only for pending) */}
              {item.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}><Ionicons name="close" size={14} color={colors.error} /><Text style={styles.rejectText}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)}><Ionicons name="checkmark" size={14} color={colors.textInverse} /><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
                </View>
              )}
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
  count: { ...typography.labelSm, color: colors.warning, backgroundColor: colors.warning + '15', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardInfo: { flex: 1 },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardContact: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText: { ...typography.bodySm, color: colors.textSecondary },
  cardMessage: { ...typography.bodySm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.md, lineHeight: 18 },
  timestamp: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.primary },
  acceptText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
