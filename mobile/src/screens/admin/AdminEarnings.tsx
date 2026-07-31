/**
 * AdminEarnings — Earnings & Revenue Dashboard
 * ALL values from real database — no hardcoded or estimated data
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminEarnings({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/admin/analytics/full');
      const d = res.data?.data || res.data;
      if (!d || (!d.revenue && !d.commission)) {
        setError('Invalid response from server');
        return;
      }
      setData(d);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to load';
      setError(msg);
      console.log('[Earnings] Error:', e.response?.status, msg);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN');

  if (loading) return (
    <View style={s.root}>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      <Text style={s.loadingText}>Loading analytics...</Text>
    </View>
  );

  if (!data) return (
    <View style={s.root}>
      <View style={s.errorWrap}>
        <Ionicons name="warning-outline" size={36} color={colors.error} />
        <Text style={s.errorTitle}>Failed to Load</Text>
        <Text style={s.errorMsg}>{error || 'Could not connect to server'}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const rev = data?.revenue || {};
  const comm = data?.commission || {};
  const stats2 = data?.stats || {};
  const periods = data?.periods || {};
  const forecast = data?.forecast || {};

  return (
    <View style={s.root}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headTitle}>Earnings & Revenue</Text>
        <View style={s.liveBadge}><View style={s.liveDot} /><Text style={s.liveText}>Live</Text></View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
      >
        {/* ═══ Revenue Overview ═══ */}
        <Section title="💰 Revenue Overview">
          <Row label="Total Revenue" value={fmt(rev.totalRevenue)} highlight />
          <Row label="Net Profit" value={fmt(rev.netProfit)} color="#10B981" highlight />
          <Row label="Booking Advances" value={fmt(rev.totalAdvance)} />
          <Row label="Subscription Revenue" value={fmt(rev.subRevenue)} />
          <Row label="Cashback Paid (Deduction)" value={`-${fmt(rev.totalCashbackPaid)}`} color="#EF4444" />
          <Separator />
          <Row label="Total Booking Value" value={fmt(rev.totalBookingValue)} muted />
        </Section>

        {/* ═══ Period Breakdown ═══ */}
        <Section title="📊 Period Breakdown">
          <Row label="Today" value={`${fmt(periods.today?.advance)} (${periods.today?.bookings || 0} bookings)`} />
          <Row label="This Week" value={`${fmt(periods.thisWeek?.advance)} (${periods.thisWeek?.bookings || 0} bookings)`} />
          <Row label="This Month" value={`${fmt(periods.thisMonth?.advance)} (${periods.thisMonth?.bookings || 0} bookings)`} />
          <Row label="All Time" value={`${fmt(comm.overall)} (${stats2.paidBookings || 0} paid bookings)`} highlight />
        </Section>

        {/* ═══ Revenue Forecast ═══ */}
        <Section title="📈 Revenue Forecast">
          <Row label="Monthly Average" value={fmt(forecast.monthlyAvg)} />
          <Row label="Projected This Month" value={fmt(forecast.projectedMonthly)} color="#10B981" highlight />
        </Section>

        {/* ═══ Platform Stats ═══ */}
        <Section title="👥 Platform Stats">
          <StatRow data={[
            { label: 'Creators', value: stats2.totalCreators || 0, color: '#F97316' },
            { label: 'Active', value: stats2.activeCreators || 0, color: '#10B981' },
            { label: 'Pending', value: stats2.pendingCreators || 0, color: '#F59E0B' },
            { label: 'Users', value: stats2.totalUsers || 0, color: '#3B82F6' },
          ]} />
          <StatRow data={[
            { label: 'Bookings', value: stats2.totalBookings || 0, color: '#6C3BFF' },
            { label: 'Paid', value: stats2.paidBookings || 0, color: '#10B981' },
            { label: 'Subscribed', value: stats2.activeSubscriptions || 0, color: '#F59E0B' },
          ]} />
        </Section>

        {/* ═══ Subscriptions ═══ */}
        <Section title="💎 Subscriptions">
          <Row label="Active Subscriptions" value={String(stats2.activeSubscriptions || 0)} color="#10B981" />
          <Row label="Subscription Revenue" value={fmt(rev.subRevenue)} highlight />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Separator() {
  return <View style={s.separator} />;
}

function Row({ label, value, highlight, muted, color }: { label: string; value: any; highlight?: boolean; muted?: boolean; color?: string }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, muted && { color: 'rgba(255,255,255,0.25)' }]}>{label}</Text>
      <Text style={[s.rowValue, highlight && { color: colors.primary, fontSize: 15, fontWeight: '800' }, color && { color }, muted && { color: 'rgba(255,255,255,0.25)' }]}>{value}</Text>
    </View>
  );
}

function StatRow({ data }: { data: { label: string; value: number; color: string }[] }) {
  return (
    <View style={s.statRow}>
      {data.map((d, i) => (
        <View key={i} style={s.statItem}>
          <Text style={[s.statVal, { color: d.color }]}>{d.value}</Text>
          <Text style={s.statLabel}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 8, gap: 10 },
  headTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { fontSize: 9, fontWeight: '700', color: '#10B981' },
  loadingText: { color: colors.textMuted, textAlign: 'center', marginTop: 12, fontSize: 13 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  errorMsg: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryText: { color: '#000', fontWeight: '700', fontSize: 13 },
  section: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 10, letterSpacing: 0.3 },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  rowLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  rowValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  statRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  statVal: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
  note: { fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 8, fontStyle: 'italic', textAlign: 'center' },
});
