import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminBackups({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const load = useCallback(async () => {
    try {
      const [histRes, statsRes] = await Promise.all([
        api.get('/admin/backups'),
        api.get('/admin/backups/stats'),
      ]);
      setData(histRes.data);
      setStats(statsRes.data?.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const triggerBackup = async () => {
    Alert.alert('Manual Backup', 'Start a backup now?', [
      { text: 'Cancel' },
      { text: 'Start', onPress: async () => {
        setTriggering(true);
        try {
          await api.post('/admin/backups/trigger', { type: 'manual' });
          Alert.alert('Done', 'Backup completed successfully');
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Backup failed'); }
        finally { setTriggering(false); }
      }}
    ]);
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const backups = data?.data || [];
  const bStats = data?.stats || {};

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Backups</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}><Text style={s.statVal}>{bStats.completed || 0}</Text><Text style={s.statLabel}>Successful</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>{bStats.failed || 0}</Text><Text style={[s.statLabel, { color: colors.error }]}>Failed</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>{stats?.totalSizeMB || '0'} MB</Text><Text style={s.statLabel}>Storage</Text></View>
        </View>

        {/* Last Backup */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Last Backup</Text>
          <Text style={s.cardValue}>{bStats.lastBackup ? new Date(bStats.lastBackup.createdAt).toLocaleString('en-IN') : 'Never'}</Text>
          <Text style={[s.cardStatus, { color: bStats.lastBackup?.status === 'completed' ? colors.success : colors.error }]}>{bStats.lastBackup?.status || '—'}</Text>
        </View>

        {/* Atlas Info */}
        <View style={[s.card, { borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.04)' }]}>
          <Ionicons name="cloud-done-outline" size={16} color={colors.success} />
          <Text style={[s.cardTitle, { color: colors.success, marginTop: 4 }]}>MongoDB Atlas Backup</Text>
          <Text style={s.cardSub}>Continuous backup enabled. Restore via Atlas Dashboard anytime.</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={s.actionBtn} onPress={triggerBackup} disabled={triggering}>
          {triggering ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="download-outline" size={16} color="#000" /><Text style={s.actionBtnText}>Run Manual Backup</Text></>}
        </TouchableOpacity>

        {/* Retention */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Retention Policy</Text>
          <Text style={s.infoText}>• Daily backups: 90 days</Text>
          <Text style={s.infoText}>• Weekly backups (Sun): 1 year</Text>
          <Text style={s.infoText}>• MongoDB Atlas: continuous (point-in-time)</Text>
        </View>

        {/* History */}
        <Text style={s.sectionTitle}>Backup History</Text>
        {backups.slice(0, 15).map((b: any) => (
          <View key={b._id} style={s.historyItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.histDate}>{new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
              <Text style={s.histType}>{b.type} • {b.sizeBytes ? (b.sizeBytes / 1024 / 1024).toFixed(1) + ' MB' : '—'}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: b.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
              <Text style={[s.statusText, { color: b.status === 'completed' ? colors.success : colors.error }]}>{b.status}</Text>
            </View>
          </View>
        ))}
        {backups.length === 0 && <Text style={s.emptyText}>No backups yet. Run your first backup above.</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statVal: { ...typography.headlineMd, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { ...typography.labelMd, color: colors.textMuted },
  cardValue: { ...typography.headlineSm, color: colors.text, marginTop: 4 },
  cardStatus: { ...typography.labelSm, marginTop: 2 },
  cardSub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md + 2, marginBottom: spacing.lg },
  actionBtnText: { ...typography.labelLg, color: '#000', fontWeight: '700' },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  infoTitle: { ...typography.labelMd, color: colors.primary, marginBottom: spacing.sm },
  infoText: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  sectionTitle: { ...typography.headlineSm, color: colors.text, marginBottom: spacing.md },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  histDate: { ...typography.bodySm, color: colors.text },
  histType: { ...typography.caption, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
