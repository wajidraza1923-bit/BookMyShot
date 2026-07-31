import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function CreatorWithdrawals({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator-wallet/withdrawals');
      setWithdrawals(res.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getStatusColor = (s: string) => s === 'paid' ? '#10B981' : s === 'rejected' ? '#EF4444' : s === 'approved' ? '#3B82F6' : '#F59E0B';

  if (loading) return <View style={s.c}><ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.c}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={20} color="#1F2937" /></TouchableOpacity>
        <Text style={s.title}>Withdrawal History</Text>
      </View>

      <FlatList
        data={withdrawals}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyExtractor={i => i._id}
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 40 }}><Ionicons name="wallet-outline" size={40} color="#E5E7EB" /><Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 10 }}>No withdrawal requests yet</Text></View>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.amount}>₹{item.amount?.toLocaleString('en-IN')}</Text>
                <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                <Text style={[s.badgeT, { color: getStatusColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>
            <View style={s.details}>
              {item.upiId ? <Text style={s.detail}>UPI: {item.upiId}</Text> : null}
              {item.bankName ? <Text style={s.detail}>Bank: {item.bankName} • {item.accountNumber}</Text> : null}
              {item.accountHolderName ? <Text style={s.detail}>Name: {item.accountHolderName}</Text> : null}
              {item.ifscCode ? <Text style={s.detail}>IFSC: {item.ifscCode}</Text> : null}
              {item.transactionId ? <Text style={s.detail}>Txn ID: {item.transactionId}</Text> : null}
              {item.adminRemarks ? <Text style={s.detail}>Remarks: {item.adminRemarks}</Text> : null}
              {item.processedAt ? <Text style={s.detail}>Processed: {new Date(item.processedAt).toLocaleDateString('en-IN')}</Text> : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  card: { backgroundColor: '#FAFBFC', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  amount: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  date: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeT: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  details: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, gap: 3 },
  detail: { fontSize: 11, color: '#6B7280' },
});
