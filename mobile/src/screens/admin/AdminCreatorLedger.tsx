/**
 * AdminCreatorLedger — Full financial audit for a creator
 * Shows bookings, commissions, subscriptions, promotions, transactions
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminCreatorLedger({ route, navigation }: any) {
  const { creatorId, creatorName } = route?.params || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/admin/creator-ledger/${creatorId}`);
      setData(res.data?.data || null);
    } catch (e: any) {
      console.log('[Ledger] Error:', e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN');
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <View style={st.root}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;
  if (!data) return <View style={st.root}><Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 80 }}>Failed to load</Text></View>;

  const { profile: p, summary: s, bookings, monthlySummary, ledger } = data;

  return (
    <View style={st.root}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={st.headerTitle}>💰 Financial Ledger</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>

        {/* Profile */}
        <View style={st.card}>
          <Text style={st.name}>{p.name}</Text>
          <Text style={st.meta}>{p.email} • {p.creatorId}</Text>
          <View style={st.badges}>
            <Badge text={p.status} color={p.status === 'approved' ? '#10b981' : '#dc2626'} />
            <Badge text={`Sub: ${p.subscriptionStatus}`} color="#60a5fa" />
            {p.featured && <Badge text="⭐ Featured" color="#D4AF37" />}
          </View>
          <Text style={st.meta}>Joined: {fmtDate(p.joinDate)} • Expires: {fmtDate(p.subscriptionEndDate)}</Text>
        </View>

        {/* Summary Cards */}
        <View style={st.grid}>
          <SummaryCard label="Booking Value" value={fmt(s.totalBookingValue)} color="#fff" />
          <SummaryCard label="Commission" value={fmt(s.totalCommissionDeducted)} color="#dc2626" />
          <SummaryCard label="Earnings" value={fmt(s.totalCreatorEarnings)} color="#10b981" />
          <SummaryCard label="Subscription" value={fmt(s.totalSubscriptionPaid)} color="#60a5fa" />
          <SummaryCard label="Promotions" value={fmt(s.totalPromotionPaid)} color="#f59e0b" />
          <SummaryCard label="Bookings" value={String(s.totalBookings)} color="#D4AF37" />
        </View>

        {/* Booking Ledger */}
        <Text style={st.sectionTitle}>📋 Booking Ledger ({bookings.length})</Text>
        {bookings.slice(0, 20).map((b: any, i: number) => (
          <View key={i} style={st.bookingRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.bookingName}>{b.clientName} — {b.eventType}</Text>
              <Text style={st.bookingMeta}>{fmtDate(b.date)} • {b.status}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.bookingAmount}>{fmt(b.amount)}</Text>
              <Text style={st.bookingComm}>−{fmt(b.commissionAmount)} ({b.commissionPercent}%)</Text>
              <Text style={st.bookingEarn}>→ {fmt(b.creatorReceived)}</Text>
            </View>
          </View>
        ))}

        {/* Monthly Summary */}
        <Text style={st.sectionTitle}>📊 Monthly Summary</Text>
        {monthlySummary.map((m: any, i: number) => (
          <View key={i} style={st.monthRow}>
            <Text style={st.monthLabel}>{m.month}</Text>
            <Text style={st.monthVal}>{m.bookings} bookings</Text>
            <Text style={[st.monthVal, { color: '#10b981' }]}>{fmt(m.earnings)}</Text>
          </View>
        ))}

        {/* Transaction Ledger */}
        <Text style={st.sectionTitle}>📒 Transactions ({ledger.length})</Text>
        {ledger.slice(0, 30).map((t: any, i: number) => (
          <View key={i} style={st.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.txDesc} numberOfLines={1}>{t.description}</Text>
              <Text style={st.txDate}>{fmtDate(t.date)} • {t.status}</Text>
            </View>
            <Text style={[st.txAmount, { color: t.type === 'credit' ? '#10b981' : '#dc2626' }]}>
              {t.type === 'credit' ? '+' : '−'}{fmt(t.amount)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return <View style={[st.badge, { backgroundColor: color + '15' }]}><Text style={[st.badgeText, { color }]}>{text}</Text></View>;
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={st.summaryCard}>
      <Text style={[st.summaryValue, { color }]}>{value}</Text>
      <Text style={st.summaryLabel}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 10, gap: 10 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  summaryCard: { width: '31%', backgroundColor: colors.surface, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  summaryLabel: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 12, marginBottom: 8 },
  bookingRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  bookingName: { fontSize: 12, fontWeight: '600', color: colors.text },
  bookingMeta: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  bookingAmount: { fontSize: 12, fontWeight: '700', color: colors.text },
  bookingComm: { fontSize: 9, color: '#dc2626', marginTop: 1 },
  bookingEarn: { fontSize: 10, color: '#10b981', fontWeight: '600' },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  monthLabel: { flex: 1, fontSize: 12, color: colors.text },
  monthVal: { fontSize: 11, color: colors.textMuted, marginLeft: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  txDesc: { fontSize: 11, color: colors.text },
  txDate: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  txAmount: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
});
