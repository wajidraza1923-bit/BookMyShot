import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminReportMgmt({ navigation }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [histRes, statsRes, creatorsRes] = await Promise.all([
        api.get('/admin/report-management'),
        api.get('/admin/report-management/stats'),
        api.get('/admin/creators'),
      ]);
      setLogs(histRes.data?.data || []);
      setStats(statsRes.data?.data);
      const allCreators = creatorsRes.data?.creators || [];
      setCreators(allCreators.filter((c: any) => c.status === 'approved'));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const sendToCreator = (id: string, name: string) => {
    Alert.alert('Send Report', `Send live performance report to ${name}?`, [
      { text: 'Cancel' },
      { text: 'Send', onPress: async () => {
        setSending(true);
        try {
          await api.post(`/admin/report-management/send/${id}`);
          Alert.alert('Sent', `Report emailed to ${name}`);
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
        finally { setSending(false); }
      }}
    ]);
  };

  const sendAll = () => {
    Alert.alert('Send to All', 'Send monthly reports to all creators with 2+ bookings?', [
      { text: 'Cancel' },
      { text: 'Send All', onPress: async () => {
        setSending(true);
        try {
          const res = await api.post('/admin/report-management/send-all');
          Alert.alert('Done', `Reports sent: ${res.data?.sent || 0}`);
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
        finally { setSending(false); }
      }}
    ]);
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Creator Reports</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}><Text style={s.statVal}>{stats?.totalReports || 0}</Text><Text style={s.statLabel}>Total Sent</Text></View>
          <View style={s.statCard}><Text style={s.statVal}>{stats?.thisMonth?.sent || 0}</Text><Text style={s.statLabel}>This Month</Text></View>
          <View style={s.statCard}><Text style={[s.statVal, { color: colors.error }]}>{stats?.allTime?.failed || 0}</Text><Text style={s.statLabel}>Failed</Text></View>
        </View>

        {/* Send All Button */}
        <TouchableOpacity style={s.sendAllBtn} onPress={sendAll} disabled={sending}>
          {sending ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="send-outline" size={16} color="#000" /><Text style={s.sendAllText}>Send Reports to All (2+ Bookings)</Text></>}
        </TouchableOpacity>

        {/* Creator List - Send Individual */}
        <Text style={s.sectionTitle}>Send to Individual Creator</Text>
        {creators.slice(0, 20).map((c: any) => (
          <View key={c._id} style={s.creatorRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.creatorName}>{c.user?.name || 'Creator'}</Text>
              <Text style={s.creatorEmail}>{c.user?.email || '—'}</Text>
            </View>
            <TouchableOpacity style={s.sendBtn} onPress={() => sendToCreator(c._id, c.user?.name || 'Creator')}>
              <Ionicons name="paper-plane-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}

        {/* History */}
        <Text style={[s.sectionTitle, { marginTop: spacing.xl }]}>Sent History</Text>
        {logs.slice(0, 20).map((l: any) => (
          <View key={l._id} style={s.logItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.logTo}>{l.to}</Text>
              <Text style={s.logDate}>{new Date(l.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: l.status === 'sent' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
              <Text style={[s.statusText, { color: l.status === 'sent' ? colors.success : colors.error }]}>{l.status}</Text>
            </View>
          </View>
        ))}
        {logs.length === 0 && <Text style={s.emptyText}>No reports sent yet</Text>}
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
  statVal: { ...typography.headlineMd, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sendAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md + 2, marginBottom: spacing.xl },
  sendAllText: { ...typography.labelLg, color: '#000', fontWeight: '700' },
  sectionTitle: { ...typography.headlineSm, color: colors.text, marginBottom: spacing.md },
  creatorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  creatorName: { ...typography.bodySm, color: colors.text, fontWeight: '600' },
  creatorEmail: { ...typography.caption, color: colors.textMuted },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  logItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  logTo: { ...typography.bodySm, color: colors.text },
  logDate: { ...typography.caption, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center' },
});
