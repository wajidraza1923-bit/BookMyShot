import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator, Platform, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function WalletScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null);
  const [cashbackOffer, setCashbackOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [walletRes, settingsRes] = await Promise.all([
        api.get('/cashback/wallet').catch(() => ({ data: { data: null } })),
        api.get('/cashback/settings').catch(() => ({ data: { data: null } })),
      ]);
      if (walletRes.data?.data) setWallet(walletRes.data.data);
      if (settingsRes.data?.data) setCashbackOffer(settingsRes.data.data);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  const earned = wallet?.earned || 0;
  const pending = wallet?.pending || 0;
  const available = earned; // Available = credited cashback

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Cashback Wallet</Text>
        </View>

        {/* Balance Card */}
        <View style={s.balanceCard}>
          <View style={s.balanceRow}>
            <View style={s.balanceItem}>
              <Ionicons name="wallet-outline" size={20} color="#6C3BFF" />
              <Text style={s.balanceVal}>₹{available.toLocaleString('en-IN')}</Text>
              <Text style={s.balanceLbl}>Available</Text>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={s.balanceVal}>₹{pending.toLocaleString('en-IN')}</Text>
              <Text style={s.balanceLbl}>Pending</Text>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Ionicons name="gift-outline" size={20} color="#10B981" />
              <Text style={s.balanceVal}>₹{(earned + pending).toLocaleString('en-IN')}</Text>
              <Text style={s.balanceLbl}>Lifetime</Text>
            </View>
          </View>
        </View>

        {/* Current Offer */}
        {cashbackOffer?.enabled && (
          <View style={s.offerCard}>
            <Ionicons name="sparkles" size={18} color="#6C3BFF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.offerTitle}>Current Offer: {cashbackOffer.percentage}% Cashback</Text>
              <Text style={s.offerSub}>Earn up to ₹{cashbackOffer.maxAmount?.toLocaleString('en-IN') || '5,000'} on your next booking</Text>
            </View>
          </View>
        )}

        {/* How It Works */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>How Cashback Works</Text>
          <View style={s.stepsCard}>
            {[
              { icon: 'person-add', text: 'Create your own BookMyShot account', done: true },
              { icon: 'search', text: 'Book a verified creator', done: true },
              { icon: 'card', text: 'Pay 5% Booking Fee via Razorpay', done: false },
              { icon: 'calendar', text: 'Complete your event', done: false },
              { icon: 'checkmark-circle', text: 'Confirm booking completion', done: false },
              { icon: 'gift', text: 'Cashback credited to Wallet!', done: false },
            ].map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={[s.stepIcon, step.done && s.stepIconDone]}>
                  <Ionicons name={step.icon as any} size={14} color={step.done ? '#fff' : '#6C3BFF'} />
                </View>
                <Text style={[s.stepText, step.done && s.stepTextDone]}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Important Note */}
        <View style={s.noteCard}>
          <Ionicons name="information-circle" size={16} color="#6C3BFF" />
          <Text style={s.noteText}>Cashback is available only for customers who register and book directly through their own BookMyShot account. Manually created inquiries by creators are not eligible.</Text>
        </View>

        {/* Wallet Rules */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Wallet Rules</Text>
          <View style={s.rulesCard}>
            {[
              'Cashback cannot be converted to cash',
              'Cannot be transferred to another account',
              'Can only be used on future BookMyShot bookings',
              'Automatically deducted when you choose to use it',
            ].map((rule, i) => (
              <View key={i} style={s.ruleRow}>
                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                <Text style={s.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Transaction History */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Cashback History</Text>
          {wallet?.transactions?.length > 0 ? (
            wallet.transactions.map((tx: any, i: number) => (
              <View key={i} style={s.txCard}>
                <View style={[s.txIcon, { backgroundColor: tx.status === 'credited' ? '#ECFDF5' : '#FEF3C7' }]}>
                  <Ionicons name={tx.status === 'credited' ? 'checkmark-circle' : 'time'} size={16} color={tx.status === 'credited' ? '#10B981' : '#F59E0B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txTitle}>Booking Cashback</Text>
                  <Text style={s.txSub}>{tx.percentage}% of ₹{Number(tx.bookingAmount || 0).toLocaleString('en-IN')}</Text>
                  <Text style={s.txDate}>{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.txAmount, { color: tx.status === 'credited' ? '#10B981' : '#F59E0B' }]}>+₹{Number(tx.amount || 0).toLocaleString('en-IN')}</Text>
                  <Text style={s.txStatus}>{tx.status}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="wallet-outline" size={36} color="#E5E7EB" />
              <Text style={s.emptyTitle}>No cashback yet</Text>
              <Text style={s.emptySub}>Book a creator and earn cashback!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  scroll: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  // Balance
  balanceCard: { marginHorizontal: 20, backgroundColor: '#F8F6FF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#EDE9FE' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  balanceItem: { alignItems: 'center', gap: 6 },
  balanceVal: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  balanceLbl: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  balanceDivider: { width: 1, height: 40, backgroundColor: '#EDE9FE' },
  // Offer
  offerCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14, backgroundColor: '#F3E8FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE9FE' },
  offerTitle: { fontSize: 13, fontWeight: '700', color: '#6C3BFF' },
  offerSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  // Section
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  // Steps
  stepsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  stepIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  stepIconDone: { backgroundColor: '#10B981' },
  stepText: { fontSize: 12, color: '#4B5563', flex: 1 },
  stepTextDone: { color: '#1F2937', fontWeight: '600' },
  // Note
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 14, backgroundColor: '#F8F6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EDE9FE' },
  noteText: { fontSize: 10, color: '#6B7280', lineHeight: 15, flex: 1 },
  // Rules
  rulesCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', gap: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 11, color: '#4B5563' },
  // Transactions
  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  txSub: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  txDate: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txStatus: { fontSize: 9, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginTop: 8 },
  emptySub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});

