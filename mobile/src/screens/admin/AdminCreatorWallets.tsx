import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminCreatorWallets({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tab, setTab] = useState<'wallets' | 'withdrawals'>('wallets');
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjType, setAdjType] = useState<'credit' | 'debit'>('credit');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [walletsRes, wdRes] = await Promise.all([
        api.get('/creator-wallet/admin/all'),
        api.get('/creator-wallet/admin/withdrawals/all'),
      ]);
      setCreators(walletsRes.data?.data || []);
      setWithdrawals(wdRes.data?.data || []);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const adjustWallet = async () => {
    if (!adjAmount || parseFloat(adjAmount) <= 0) { Alert.alert('Invalid', 'Enter valid amount'); return; }
    if (!adjReason.trim()) { Alert.alert('Required', 'Reason is mandatory'); return; }
    setSaving(true);
    try {
      await api.post(`/creator-wallet/admin/${adjustModal._id}/adjust`, { amount: parseFloat(adjAmount), type: adjType, reason: adjReason.trim() });
      Alert.alert('✅ Done', `₹${adjAmount} ${adjType}ed`);
      setAdjustModal(null); setAdjAmount(''); setAdjReason(''); await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const processWithdrawal = (wd: any, status: string) => {
    Alert.alert(`${status} Withdrawal`, `₹${wd.amount} for ${wd.creator?.user?.name || 'Creator'}?`, [
      { text: 'Cancel' },
      { text: status, onPress: async () => {
        try {
          await api.patch(`/creator-wallet/admin/withdrawals/${wd._id}`, { status, remarks: `${status} by admin` });
          Alert.alert('Done', `Withdrawal ${status}`); await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  const openCreatorDetail = async (creatorId: string) => {
    setDetailLoading(true);
    setDetailModal(true);
    try {
      const res = await api.get(`/creator-wallet/admin/${creatorId}`);
      setDetailData(res.data?.data);
    } catch (e: any) { Alert.alert('Error', 'Failed to load details'); setDetailModal(null); }
    finally { setDetailLoading(false); }
  };

  if (loading) return <View style={s.c}><ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.c}>
      <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={20} color="#1F2937" /></TouchableOpacity><Text style={s.title}>Creator Wallets</Text></View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'wallets' && s.tabActive]} onPress={() => setTab('wallets')}><Text style={[s.tabT, tab === 'wallets' && s.tabTActive]}>Wallets</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'withdrawals' && s.tabActive]} onPress={() => setTab('withdrawals')}><Text style={[s.tabT, tab === 'withdrawals' && s.tabTActive]}>Withdrawals ({withdrawals.filter(w => w.status === 'pending').length})</Text></TouchableOpacity>
      </View>

      {tab === 'wallets' ? (
        <FlatList data={creators} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyExtractor={i => i._id}
          ListEmptyComponent={<Text style={s.empty}>No creators</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{item.user?.name || 'Creator'}</Text>
                  <Text style={s.cardEmail}>{item.user?.email || ''}</Text>
                </View>
                <Text style={s.cardBal}>₹{(item.walletBalance || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.cardStats}>
                <Text style={s.cardStat}>Earned: ₹{(item.totalCashbackEarned || 0).toLocaleString('en-IN')}</Text>
                <Text style={s.cardStat}>Withdrawn: ₹{(item.totalWithdrawn || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.cardActions}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]} onPress={() => { setAdjustModal(item); setAdjType('credit'); }}>
                  <Text style={[s.actionBtnT, { color: '#10B981' }]}>+ Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]} onPress={() => { setAdjustModal(item); setAdjType('debit'); }}>
                  <Text style={[s.actionBtnT, { color: '#EF4444' }]}>- Debit</Text>
                </TouchableOpacity>
              </View>
            </View>
          )} />
      ) : (
        <FlatList data={withdrawals} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyExtractor={i => i._id}
          ListEmptyComponent={<Text style={s.empty}>No withdrawal requests</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => openCreatorDetail(item.creator?._id)}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{item.creator?.user?.name || 'Creator'}</Text>
                  <Text style={s.cardEmail}>₹{item.amount} • {item.upiId || item.bankName || 'Bank'}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: item.status === 'paid' ? '#ECFDF5' : item.status === 'rejected' ? '#FEF2F2' : '#FEF3C7' }]}>
                  <Text style={[s.statusT, { color: item.status === 'paid' ? '#10B981' : item.status === 'rejected' ? '#EF4444' : '#F59E0B' }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={s.cardEmail}>{new Date(item.createdAt).toLocaleDateString('en-IN')} • {item.accountHolderName || ''} • IFSC: {item.ifscCode || '—'}</Text>
              <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>Tap to view full wallet history & verify</Text>
              {item.status === 'pending' && (
                <View style={s.cardActions}>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]} onPress={() => processWithdrawal(item, 'paid')}>
                    <Text style={[s.actionBtnT, { color: '#10B981' }]}>✅ Pay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]} onPress={() => processWithdrawal(item, 'rejected')}>
                    <Text style={[s.actionBtnT, { color: '#EF4444' }]}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          )} />
      )}

      {/* Creator Detail / Transparency Modal */}
      <Modal visible={!!detailModal} transparent animationType="slide">
        <View style={s.mOverlay}><View style={[s.mContent, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.mTitle}>📊 Wallet Transparency</Text>
            <TouchableOpacity onPress={() => { setDetailModal(null); setDetailData(null); }}><Ionicons name="close" size={22} color="#1F2937" /></TouchableOpacity>
          </View>
          {detailLoading ? <ActivityIndicator size="large" color="#6C3BFF" style={{ marginVertical: 30 }} /> : detailData ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Creator Info */}
              <View style={{ backgroundColor: '#F8F6FF', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1F2937' }}>{detailData.creator?.name || 'Creator'}</Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Balance: ₹{(detailData.creator?.walletBalance || 0).toLocaleString('en-IN')} • Earned: ₹{(detailData.creator?.totalCashbackEarned || 0).toLocaleString('en-IN')} • Withdrawn: ₹{(detailData.creator?.totalWithdrawn || 0).toLocaleString('en-IN')}</Text>
              </View>

              {/* All Transactions — full audit trail */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>💰 Complete Transaction History</Text>
              {(detailData.transactions || []).length === 0 ? <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>No transactions</Text> : (detailData.transactions || []).map((tx: any) => (
                <View key={tx._id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFBFC', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#F3F4F6' }}>
                  <Ionicons name={tx.type.includes('credit') ? 'arrow-down-circle' : 'arrow-up-circle'} size={16} color={tx.type.includes('credit') ? '#10B981' : '#EF4444'} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#1F2937' }}>{tx.type.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={{ fontSize: 9, color: '#6B7280' }}>{tx.reason || '—'}</Text>
                    <Text style={{ fontSize: 8, color: '#9CA3AF' }}>{new Date(tx.createdAt).toLocaleString('en-IN')} • {tx.status === 'completed' ? '✅' : tx.status === 'cancelled' ? '❌' : '⏳'} {tx.status}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: tx.type.includes('credit') ? '#10B981' : '#EF4444' }}>{tx.type.includes('credit') ? '+' : '-'}₹{tx.amount}</Text>
                    <Text style={{ fontSize: 8, color: '#9CA3AF' }}>Bal: ₹{tx.balanceAfter}</Text>
                  </View>
                </View>
              ))}

              {/* Booking Payments (Razorpay Verified) */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginTop: 12, marginBottom: 8 }}>💳 Booking Advance Payments (Razorpay)</Text>
              {(detailData.bookings || []).length === 0 ? <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>No bookings</Text> : (detailData.bookings || []).map((bk: any) => (
                <View key={bk._id} style={{ backgroundColor: bk.bookingFeePaid ? '#ECFDF5' : '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: bk.bookingFeePaid ? '#D1FAE5' : '#FDE68A' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>{bk.clientName}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: bk.bookingFeePaid ? '#10B981' : '#F59E0B' }}>{bk.bookingFeePaid ? '✅ PAID' : '⏳ UNPAID'}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 3 }}>Event: {bk.eventType} • Amount: ₹{(bk.amount || bk.budget || 0).toLocaleString('en-IN')}</Text>
                  <Text style={{ fontSize: 10, color: '#6B7280' }}>Date: {new Date(bk.eventDate || bk.createdAt).toLocaleDateString('en-IN')}</Text>
                  {bk.bookingFeePaid ? (
                    <View style={{ marginTop: 4, backgroundColor: '#fff', borderRadius: 6, padding: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#10B981' }}>✅ Advance Paid: ₹{(bk.bookingFeeAmount || 0).toLocaleString('en-IN')}</Text>
                      <Text style={{ fontSize: 8, color: '#6B7280' }}>Razorpay ID: {bk.bookingFeePaymentId || '—'}</Text>
                      <Text style={{ fontSize: 8, color: '#6B7280' }}>Paid on: {bk.bookingFeePaidAt ? new Date(bk.bookingFeePaidAt).toLocaleString('en-IN') : '—'}</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 9, color: '#F59E0B', marginTop: 3, fontWeight: '600' }}>⚠️ Customer has NOT paid advance yet</Text>
                  )}
                  <Text style={{ fontSize: 8, color: '#9CA3AF', marginTop: 2 }}>Status: {bk.status} • Customer: {bk.clientPhone || bk.clientEmail}</Text>
                </View>
              ))}

              {/* Withdrawal History */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginTop: 12, marginBottom: 8 }}>📤 Withdrawal Requests</Text>
              {(detailData.withdrawals || []).length === 0 ? <Text style={{ fontSize: 12, color: '#9CA3AF' }}>No withdrawals</Text> : (detailData.withdrawals || []).map((wd: any) => (
                <View key={wd._id} style={{ backgroundColor: '#FAFBFC', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#F3F4F6' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>₹{wd.amount}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: wd.status === 'paid' ? '#10B981' : wd.status === 'rejected' ? '#EF4444' : '#F59E0B' }}>{wd.status.toUpperCase()}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: '#6B7280', marginTop: 3 }}>Requested: {new Date(wd.createdAt).toLocaleDateString('en-IN')}{wd.processedAt ? ` • Processed: ${new Date(wd.processedAt).toLocaleDateString('en-IN')}` : ''}</Text>
                  <Text style={{ fontSize: 9, color: '#6B7280' }}>{wd.upiId ? `UPI: ${wd.upiId}` : ''} {wd.bankName ? `Bank: ${wd.bankName}` : ''} {wd.accountNumber ? `A/C: ${wd.accountNumber}` : ''}</Text>
                  {wd.adminRemarks ? <Text style={{ fontSize: 9, color: '#EF4444', marginTop: 2 }}>Remarks: {wd.adminRemarks}</Text> : null}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View></View>
      </Modal>

      {/* Adjust Modal */}
      <Modal visible={!!adjustModal} transparent animationType="slide">
        <View style={s.mOverlay}><View style={s.mContent}>
          <Text style={s.mTitle}>{adjType === 'credit' ? '💰 Credit' : '🔻 Debit'} — {adjustModal?.user?.name}</Text>
          <Text style={s.mLabel}>Amount (₹)</Text>
          <TextInput style={s.mInput} value={adjAmount} onChangeText={setAdjAmount} placeholder="e.g. 500" keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
          <Text style={s.mLabel}>Reason (mandatory)</Text>
          <TextInput style={[s.mInput, { height: 60 }]} value={adjReason} onChangeText={setAdjReason} placeholder="e.g. Bonus credit" multiline placeholderTextColor="#9CA3AF" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setAdjustModal(null)}><Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: adjType === 'credit' ? '#10B981' : '#EF4444' }]} onPress={adjustWallet} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{adjType === 'credit' ? 'Credit' : 'Debit'}</Text>}
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: '#6C3BFF' },
  tabT: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTActive: { color: '#fff' },
  empty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 30 },
  card: { backgroundColor: '#FAFBFC', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  cardEmail: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  cardBal: { fontSize: 16, fontWeight: '900', color: '#6C3BFF' },
  cardStats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  cardStat: { fontSize: 10, color: '#6B7280' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnT: { fontSize: 12, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusT: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  mContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  mTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  mLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
  mInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, color: '#1F2937' },
  mBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
});
