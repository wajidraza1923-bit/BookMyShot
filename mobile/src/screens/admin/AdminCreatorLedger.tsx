/**
 * AdminCreatorLedger — Full financial audit for a creator
 * Shows bookings, commissions, subscriptions, promotions, transactions
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminCreatorLedger({ route, navigation }: any) {
  const { creatorId, creatorName } = route?.params || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditType, setCreditType] = useState<'credit' | 'debit'>('credit');
  const [creditSaving, setCreditSaving] = useState(false);

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
          <SummaryCard label="Booking Value" value={fmt(s.totalBookingValue)} color="#6C3BFF" />
          <SummaryCard label="Commission" value={fmt(s.totalCommissionDeducted)} color="#dc2626" />
          <SummaryCard label="Earnings" value={fmt(s.totalCreatorEarnings)} color="#10b981" />
          <SummaryCard label="Subscription" value={fmt(s.totalSubscriptionPaid)} color="#60a5fa" />
          <SummaryCard label="Promotions" value={fmt(s.totalPromotionPaid)} color="#f59e0b" />
          <SummaryCard label="Bookings" value={String(s.totalBookings)} color="#1F2937" />
        </View>

        {/* Manual Credit/Debit Button */}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, marginBottom: 14 }} onPress={() => setShowCreditModal(true)}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Credit / Debit Wallet</Text>
        </TouchableOpacity>

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

      {/* Credit/Debit Modal */}
      <Modal visible={showCreditModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4 }}>💰 Credit / Debit</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>Manually adjust wallet for: {creatorName}</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: creditType === 'credit' ? '#10B981' : '#F3F4F6' }} onPress={() => setCreditType('credit')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: creditType === 'credit' ? '#fff' : '#6B7280' }}>+ Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: creditType === 'debit' ? '#EF4444' : '#F3F4F6' }} onPress={() => setCreditType('debit')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: creditType === 'debit' ? '#fff' : '#6B7280' }}>− Debit</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Amount (₹)</Text>
            <TextInput style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#1F2937' }} value={creditAmount} onChangeText={setCreditAmount} placeholder="e.g. 500" keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
            
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 }}>Reason</Text>
            <TextInput style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 13, color: '#1F2937' }} value={creditReason} onChangeText={setCreditReason} placeholder="e.g. Manual cashback credit" placeholderTextColor="#9CA3AF" />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6' }} onPress={() => { setShowCreditModal(false); setCreditAmount(''); setCreditReason(''); }}>
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: creditType === 'credit' ? '#10B981' : '#EF4444' }} onPress={async () => {
                const amt = parseFloat(creditAmount);
                if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter valid amount'); return; }
                setCreditSaving(true);
                try {
                  await api.post('/creator-wallet/admin/adjust', { creatorId, type: creditType, amount: amt, reason: creditReason || `Manual ${creditType} by admin` });
                  Alert.alert('✅ Done', `₹${amt} ${creditType}ed to ${creatorName}'s wallet`);
                  setShowCreditModal(false); setCreditAmount(''); setCreditReason('');
                  await load();
                } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
                finally { setCreditSaving(false); }
              }} disabled={creditSaving}>
                {creditSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{creditType === 'credit' ? '+ Credit' : '− Debit'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
