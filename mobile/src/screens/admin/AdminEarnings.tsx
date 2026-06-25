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
    try {
      const res = await api.get('/admin/analytics');
      setData(res.data?.data);
    } catch (e: any) {
      console.log('[Earnings] Error:', e.response?.status, e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN');

  if (loading) return <View style={s.root}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;
  if (!data) return <View style={s.root}><Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 80 }}>Failed to load analytics</Text><TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ marginTop: 16, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}><Text style={{ color: '#000', fontWeight: '700' }}>Retry</Text></TouchableOpacity></View>;

  const { revenue, commission, subscriptions, forecast, payments, creators, bookings } = data;

  return (
    <View style={s.root}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.headTitle}>Earnings & Revenue</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>

        {/* Revenue Overview */}
        <Section title="💰 Revenue Overview">
          <Row label="Lifetime Revenue" value={fmt(revenue.lifetime)} highlight />
          <Row label="Today" value={fmt(revenue.today)} />
          <Row label="This Week" value={fmt(revenue.week)} />
          <Row label="This Month" value={fmt(revenue.month)} />
          <Row label="This Year" value={fmt(revenue.year)} />
          <Row label="Avg Daily" value={fmt(revenue.avgDaily)} muted />
          <Row label="Avg Monthly" value={fmt(revenue.avgMonthly)} muted />
        </Section>

        {/* Commission */}
        <Section title="📊 Commission Analytics">
          <Row label="Total Commission" value={fmt(commission.total)} highlight />
          <Row label="Platform Earnings" value={fmt(commission.platformEarnings)} color="#10B981" />
          <Row label="Creator Earnings" value={fmt(commission.creatorEarnings)} />
          <Row label="Pending" value={fmt(commission.pending)} color="#F59E0B" />
          <Row label="Paid" value={fmt(commission.paid)} color="#10B981" />
          <Row label="Today" value={fmt(commission.today)} muted />
          <Row label="This Month" value={fmt(commission.month)} muted />
        </Section>

        {/* Subscriptions */}
        <Section title="💎 Subscriptions">
          <StatRow data={[
            { label: 'Active', value: subscriptions.active, color: '#10B981' },
            { label: 'Pending', value: subscriptions.pending, color: '#F59E0B' },
            { label: 'Expired', value: subscriptions.expired, color: '#EF4444' },
            { label: 'Trial', value: subscriptions.trial, color: '#3B82F6' },
          ]} />
        </Section>

        {/* Forecast */}
        <Section title="📈 Revenue Forecast">
          <Row label="Next 7 Days" value={fmt(forecast.next7)} />
          <Row label="Next 30 Days" value={fmt(forecast.next30)} />
          <Row label="Next 3 Months" value={fmt(forecast.next90)} color="#10B981" />
          <Row label="Next 6 Months" value={fmt(forecast.next180)} />
          <Row label="Next 12 Months" value={fmt(forecast.next365)} highlight />
        </Section>

        {/* Payments */}
        <Section title="💳 Payments">
          <StatRow data={[
            { label: 'Success', value: payments.successful, color: '#10B981' },
            { label: 'Failed', value: payments.failed, color: '#EF4444' },
            { label: 'Pending', value: payments.pending, color: '#F59E0B' },
          ]} />
        </Section>

        {/* Bookings */}
        <Section title="📅 Bookings">
          <Row label="Total" value={bookings.total} highlight />
          <StatRow data={[
            { label: 'Today', value: bookings.today, color: '#F97316' },
            { label: 'Monthly', value: bookings.monthly, color: '#3B82F6' },
            { label: 'Completed', value: bookings.completed, color: '#10B981' },
            { label: 'Cancelled', value: bookings.cancelled, color: '#EF4444' },
          ]} />
        </Section>

        {/* Creators */}
        <Section title="👥 Creators">
          <StatRow data={[
            { label: 'Total', value: creators.total, color: '#F97316' },
            { label: 'Active', value: creators.active, color: '#10B981' },
            { label: 'Pending', value: creators.pending, color: '#F59E0B' },
            { label: 'Suspended', value: creators.suspended, color: '#EF4444' },
          ]} />
        </Section>

        {/* Revenue Trend */}
        {data.trends?.revenue && (
          <Section title="📉 Revenue Trend (Last 7 Days)">
            {data.trends.revenue.map((d: any, i: number) => (
              <Row key={i} label={new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} value={fmt(d.revenue)} muted={d.revenue === 0} />
            ))}
          </Section>
        )}
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
  section: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 10, letterSpacing: 0.3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  rowLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  rowValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  statRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  statVal: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
});
