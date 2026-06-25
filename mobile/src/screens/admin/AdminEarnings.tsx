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

  const { revenue, commission, subscriptions, forecast, payments, creators, bookings } = data;

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
        {/* ═══ Admin Revenue (Actually Received) ═══ */}
        <Section title="💰 Admin Revenue (Actually Received)">
          <Row label="Total Admin Revenue" value={fmt(revenue?.lifetime)} highlight />
          <Row label="Commission Received" value={fmt(revenue?.commissionReceived)} color="#10B981" />
          <Row label="Subscription Received" value={fmt(revenue?.subscriptionReceived)} />
          <Separator />
          <Row label="Today" value={fmt(revenue?.today)} />
          <Row label="This Week" value={fmt(revenue?.week)} />
          <Row label="This Month" value={fmt(revenue?.month)} />
          <Row label="This Year" value={fmt(revenue?.year)} />
          <Separator />
          <Row label="Avg Daily" value={fmt(revenue?.avgDaily)} muted />
          <Row label="Avg Monthly" value={fmt(revenue?.avgMonthly)} muted />
        </Section>

        {/* ═══ Commission ═══ */}
        <Section title="📊 Commission">
          <Row label="Total Generated" value={fmt(commission?.total)} />
          <Row label="Actually Received" value={fmt(commission?.received)} color="#10B981" highlight />
          <Row label="Pending (Not Received)" value={fmt(commission?.pending)} color="#F59E0B" />
          {commission?.cancelled > 0 && <Row label="Cancelled" value={fmt(commission.cancelled)} color="#EF4444" muted />}
          <Separator />
          <Row label="Today (Generated)" value={fmt(commission?.today)} />
          <Row label="This Month (Generated)" value={fmt(commission?.month)} />
        </Section>

        {/* ═══ Creator Earnings (Info Only) ═══ */}
        {data.creatorInfo && (
          <Section title="👤 Creator Earnings (Info Only)">
            <Row label="Total Creator Earnings" value={fmt(data.creatorInfo.totalEarnings)} muted />
            <Row label="Total Booking Value" value={fmt(data.creatorInfo.totalBookingValue)} muted />
          </Section>
        )}

        {/* ═══ Subscriptions ═══ */}
        <Section title="💎 Subscriptions">
          <StatRow data={[
            { label: 'Active', value: subscriptions?.active || 0, color: '#10B981' },
            { label: 'Pending', value: subscriptions?.pending || 0, color: '#F59E0B' },
            { label: 'Expired', value: subscriptions?.expired || 0, color: '#EF4444' },
            { label: 'Trial', value: subscriptions?.trial || 0, color: '#3B82F6' },
          ]} />
        </Section>

        {/* ═══ Revenue Forecast ═══ */}
        <Section title="📈 Revenue Forecast">
          <Row label="Pending Commission" value={fmt(forecast?.pendingCommission)} color="#F59E0B" />
          <Row label="Monthly Subscription" value={fmt(forecast?.expectedMonthlySubscription)} />
          <Separator />
          <Row label="Next 7 Days" value={fmt(forecast?.next7)} />
          <Row label="Next 30 Days" value={fmt(forecast?.next30)} />
          <Row label="Next 3 Months" value={fmt(forecast?.next90)} color="#10B981" />
          <Row label="Next 6 Months" value={fmt(forecast?.next180)} />
          <Row label="Next 12 Months" value={fmt(forecast?.next365)} highlight />
          {forecast?.note && <Text style={s.note}>{forecast.note}</Text>}
        </Section>

        {/* ═══ Payments ═══ */}
        <Section title="💳 Payments">
          <StatRow data={[
            { label: 'Approved', value: payments?.successful || 0, color: '#10B981' },
            { label: 'Failed', value: payments?.failed || 0, color: '#EF4444' },
            { label: 'Pending', value: payments?.pending || 0, color: '#F59E0B' },
          ]} />
        </Section>

        {/* ═══ Bookings ═══ */}
        <Section title="📅 Bookings">
          <Row label="Total" value={bookings?.total || 0} highlight />
          <StatRow data={[
            { label: 'Today', value: bookings?.today || 0, color: '#F97316' },
            { label: 'Monthly', value: bookings?.monthly || 0, color: '#3B82F6' },
            { label: 'Completed', value: bookings?.completed || 0, color: '#10B981' },
            { label: 'Cancelled', value: bookings?.cancelled || 0, color: '#EF4444' },
          ]} />
        </Section>

        {/* ═══ Creators ═══ */}
        <Section title="👥 Creators">
          <StatRow data={[
            { label: 'Total', value: creators?.total || 0, color: '#F97316' },
            { label: 'Active', value: creators?.active || 0, color: '#10B981' },
            { label: 'Pending', value: creators?.pending || 0, color: '#F59E0B' },
            { label: 'Suspended', value: creators?.suspended || 0, color: '#EF4444' },
          ]} />
        </Section>

        {/* ═══ Revenue Trend (Last 7 Days) ═══ */}
        {data.trends?.revenue && data.trends.revenue.length > 0 && (
          <Section title="📉 Revenue Trend (Last 7 Days)">
            {data.trends.revenue.map((d: any, i: number) => (
              <Row
                key={i}
                label={new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                value={fmt(d.revenue)}
                muted={d.revenue === 0}
              />
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
