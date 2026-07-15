import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function WalletScreen() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWallet(); }, []);

  const loadWallet = async () => {
    try {
      const res = await api.get('/cashback/wallet');
      if (res.data?.data) setWallet(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={s.title}>💰 My Wallet</Text>

      {/* Balance Cards */}
      <View style={s.balanceRow}>
        <View style={[s.balanceCard, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
          <Text style={[s.balanceVal, { color: '#10B981' }]}>₹{(wallet?.earned || 0).toLocaleString('en-IN')}</Text>
          <Text style={s.balanceLbl}>Cashback Earned</Text>
        </View>
        <View style={[s.balanceCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={[s.balanceVal, { color: '#F59E0B' }]}>₹{(wallet?.pending || 0).toLocaleString('en-IN')}</Text>
          <Text style={s.balanceLbl}>Pending</Text>
        </View>
      </View>

      {/* Transaction History */}
      <Text style={s.historyTitle}>Transaction History</Text>
      {wallet?.transactions?.length > 0 ? (
        <FlatList
          data={wallet.transactions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={s.txCard}>
              <View style={s.txIcon}><Ionicons name={item.status === 'credited' ? 'checkmark-circle' : 'time'} size={18} color={item.status === 'credited' ? '#10B981' : '#F59E0B'} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.txTitle}>Booking Cashback</Text>
                <Text style={s.txSub}>{item.percentage}% of ₹{item.bookingAmount?.toLocaleString('en-IN')}</Text>
                <Text style={s.txDate}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.txAmount, { color: item.status === 'credited' ? '#10B981' : '#F59E0B' }]}>+₹{item.amount?.toLocaleString('en-IN')}</Text>
                <Text style={s.txStatus}>{item.status}</Text>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={s.empty}>
          <Text style={{ fontSize: 32 }}>🎁</Text>
          <Text style={s.emptyText}>No cashback yet</Text>
          <Text style={s.emptySub}>Book a creator to earn cashback!</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2937' },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  balanceCard: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center' },
  balanceVal: { fontSize: 22, fontWeight: '800' },
  balanceLbl: { fontSize: 10, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  txSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  txDate: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txStatus: { fontSize: 9, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginTop: 8 },
  emptySub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});
