import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function CreatorWalletScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [wAmount, setWAmount] = useState('');
  const [wName, setWName] = useState('');
  const [wBank, setWBank] = useState('');
  const [wAccount, setWAccount] = useState('');
  const [wIfsc, setWIfsc] = useState('');
  const [wUpi, setWUpi] = useState('');
  const [wNote, setWNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator-wallet/my');
      setData(res.data?.data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load wallet');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const submitWithdrawal = async () => {
    if (!wAmount || parseFloat(wAmount) <= 0) { Alert.alert('Invalid', 'Enter valid amount'); return; }
    if (!wName && !wUpi) { Alert.alert('Required', 'Enter bank details or UPI'); return; }
    setSubmitting(true);
    try {
      await api.post('/creator-wallet/withdraw', {
        amount: parseFloat(wAmount), accountHolderName: wName, bankName: wBank,
        accountNumber: wAccount, ifscCode: wIfsc, upiId: wUpi, note: wNote,
      });
      Alert.alert('✅ Submitted', 'Withdrawal request sent. Admin will process it.');
      setShowWithdraw(false); setWAmount(''); await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={s.c}><ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 80 }} /></View>;

  const bal = data?.walletBalance || 0;
  const earned = data?.totalCashbackEarned || 0;
  const withdrawn = data?.totalWithdrawn || 0;
  const pending = data?.pendingWithdrawal || 0;
  const txs = data?.transactions || [];

  return (
    <View style={s.c}>
      <View style={s.h}><TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={20} color="#1F2937" /></TouchableOpacity><Text style={s.title}>My Wallet</Text></View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Balance Card */}
        <View style={s.balCard}>
          <Text style={s.balLabel}>Available Balance</Text>
          <Text style={s.balAmount}>₹{bal.toLocaleString('en-IN')}</Text>
          <View style={s.balRow}>
            <View style={s.balItem}><Text style={s.balItemL}>Earned</Text><Text style={[s.balItemV, { color: '#10B981' }]}>₹{earned.toLocaleString('en-IN')}</Text></View>
            <View style={s.balItem}><Text style={s.balItemL}>Withdrawn</Text><Text style={[s.balItemV, { color: '#EF4444' }]}>₹{withdrawn.toLocaleString('en-IN')}</Text></View>
            <View style={s.balItem}><Text style={s.balItemL}>Pending</Text><Text style={[s.balItemV, { color: '#F59E0B' }]}>₹{pending.toLocaleString('en-IN')}</Text></View>
          </View>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity style={s.withdrawBtn} onPress={() => setShowWithdraw(true)}>
          <Ionicons name="wallet-outline" size={16} color="#fff" /><Text style={s.withdrawBtnT}>Withdraw Funds</Text>
        </TouchableOpacity>

        {/* Transactions */}
        <Text style={s.secTitle}>Transaction History</Text>
        {txs.length === 0 ? <Text style={s.empty}>No transactions yet</Text> : txs.map((tx: any) => (
          <View key={tx._id} style={s.txCard}>
            <Ionicons name={tx.type.includes('credit') ? 'arrow-down-circle' : 'arrow-up-circle'} size={20} color={tx.type.includes('credit') ? '#10B981' : '#EF4444'} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.txType}>{tx.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</Text>
              <Text style={s.txReason} numberOfLines={1}>{tx.reason || tx.customerName || '—'}</Text>
              <Text style={s.txDate}>{new Date(tx.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Text style={[s.txAmt, { color: tx.type.includes('credit') ? '#10B981' : '#EF4444' }]}>{tx.type.includes('credit') ? '+' : '-'}₹{tx.amount}</Text>
          </View>
        ))}

        {/* Withdrawal History link */}
        <TouchableOpacity style={s.linkBtn} onPress={() => navigation.navigate('CreatorWithdrawals')}>
          <Ionicons name="time-outline" size={14} color="#6C3BFF" /><Text style={s.linkBtnT}>View Withdrawal History</Text><Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={showWithdraw} transparent animationType="slide">
        <View style={s.mOverlay}><View style={s.mContent}>
          <Text style={s.mTitle}>💸 Withdraw Funds</Text>
          <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>Available: ₹{bal.toLocaleString('en-IN')}</Text>
          <Text style={s.mLabel}>Amount (₹)</Text>
          <TextInput style={s.mInput} value={wAmount} onChangeText={setWAmount} placeholder="e.g. 500" keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
          <Text style={s.mLabel}>Account Holder Name</Text>
          <TextInput style={s.mInput} value={wName} onChangeText={setWName} placeholder="Your name" placeholderTextColor="#9CA3AF" />
          <Text style={s.mLabel}>UPI ID (or bank details below)</Text>
          <TextInput style={s.mInput} value={wUpi} onChangeText={setWUpi} placeholder="yourname@upi" placeholderTextColor="#9CA3AF" />
          <Text style={s.mLabel}>Bank Name</Text>
          <TextInput style={s.mInput} value={wBank} onChangeText={setWBank} placeholder="e.g. SBI" placeholderTextColor="#9CA3AF" />
          <Text style={s.mLabel}>Account Number</Text>
          <TextInput style={s.mInput} value={wAccount} onChangeText={setWAccount} placeholder="Account number" keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
          <Text style={s.mLabel}>IFSC Code</Text>
          <TextInput style={s.mInput} value={wIfsc} onChangeText={setWIfsc} placeholder="e.g. SBIN0001234" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setShowWithdraw(false)}><Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: '#6C3BFF' }]} onPress={submitWithdrawal} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#fff' },
  h: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  balCard: { backgroundColor: '#F8F6FF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#EDE9FE', marginBottom: 16 },
  balLabel: { fontSize: 12, color: '#6B7280' },
  balAmount: { fontSize: 28, fontWeight: '900', color: '#1F2937', marginTop: 4 },
  balRow: { flexDirection: 'row', marginTop: 14, gap: 12 },
  balItem: { flex: 1 },
  balItemL: { fontSize: 10, color: '#6B7280' },
  balItemV: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6C3BFF', borderRadius: 12, paddingVertical: 14, marginBottom: 20 },
  withdrawBtnT: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  empty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFBFC', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  txType: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  txReason: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  txDate: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '800' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E8FF', borderRadius: 12, padding: 14, marginTop: 16 },
  linkBtnT: { flex: 1, fontSize: 13, fontWeight: '600', color: '#6C3BFF' },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  mContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  mTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  mLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
  mInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, color: '#1F2937' },
  mBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
});
