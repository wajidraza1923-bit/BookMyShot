import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorAvailability({ navigation }: any) {
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/calendar/availability');
      setBlockedDates((res.data?.events || []).filter((e: any) => e.type === 'unavailable'));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const blockDate = async () => {
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Error', 'Enter date as YYYY-MM-DD'); return; }
    try {
      await api.post('/creator/calendar/private', { title: newReason || 'Unavailable', date: newDate, type: 'unavailable', category: 'Personal' });
      setShowAdd(false); setNewDate(''); setNewReason('');
      await load();
      Alert.alert('Done', 'Date blocked successfully');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to block date'); }
  };

  const unblockDate = async (id: string) => {
    Alert.alert('Unblock', 'Make this date available again?', [
      { text: 'Cancel' },
      { text: 'Unblock', onPress: async () => {
        try { await api.delete(`/creator/calendar/private/${id}`); await load(); } catch {}
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Availability</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}><Ionicons name={showAdd ? 'close' : 'add'} size={20} color={colors.primary} /></TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={styles.infoText}>Blocked dates appear as unavailable on your public portfolio</Text>
      </View>

      {/* Add Form */}
      {showAdd && (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.textMuted} value={newDate} onChangeText={setNewDate} selectionColor={colors.primary} />
          <TextInput style={styles.input} placeholder="Reason (optional)" placeholderTextColor={colors.textMuted} value={newReason} onChangeText={setNewReason} selectionColor={colors.primary} />
          <TouchableOpacity style={styles.blockBtn} onPress={blockDate}><Ionicons name="ban" size={14} color="#fff" /><Text style={styles.blockBtnText}>Block Date</Text></TouchableOpacity>
        </View>
      )}

      {/* Blocked Dates List */}
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={blockedDates}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyTitle}>All dates available</Text><Text style={styles.emptySubtitle}>Block dates when you're unavailable for shoots</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.dateCard}>
              <View style={styles.dateIcon}><Ionicons name="ban" size={16} color={colors.error} /></View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateText}>{item.date ? new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
                <Text style={styles.dateReason}>{item.title || 'Unavailable'}</Text>
              </View>
              <TouchableOpacity onPress={() => unblockDate(item._id)} style={styles.unblockBtn}><Text style={styles.unblockText}>Unblock</Text></TouchableOpacity>
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.sm, backgroundColor: 'rgba(59,130,246,0.06)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)' },
  infoText: { ...typography.bodySm, color: colors.info, flex: 1 },
  addForm: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, marginBottom: spacing.md },
  blockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.error, borderRadius: radius.md, paddingVertical: spacing.md },
  blockBtnText: { ...typography.labelLg, color: '#fff', fontWeight: '600' },
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  dateIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  dateInfo: { flex: 1 },
  dateText: { ...typography.headlineSm, color: colors.text },
  dateReason: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  unblockBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.sm, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  unblockText: { ...typography.labelSm, color: colors.success, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyTitle: { ...typography.headlineMd, color: colors.text, marginTop: spacing.md },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
});
