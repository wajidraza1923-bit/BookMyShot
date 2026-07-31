import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, TextInput, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminUserWallet({ route, navigation }: any) {
  const { userId, userName } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/wallet/user/${userId}/wallet`);
      setData(res.data?.data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openAction = (type: 'credit' | 'debit') => {
    setModalType(type);
    setAmount('');
    setReason('');
    setShowModal(true);
  };

  const executeAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid', 'Enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Reason is mandatory');
      return;
    }
    setSaving(true);
    try {
      const endpoint = `/admin/wallet/user/${userId}/wallet/${modalType}`;
      const res = await api.post(endpoint, {
        amount: parseFloat(amount),
        reason: reason.trim(),
        type: modalType,
      });
      Alert.alert('✅ Done', res.data?.message || `₹${amount} ${modalType}ed`);
      setShowModal(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 80 }} />
      </View>
    );
  }

  const stats = data?.stats || {};
  const transactions = data?.transactions || [];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{userName || 'User'} Wallet</Text>
          <Text style={s.subtitle}>
            Balance: ₹{(stats.walletBalance || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3BFF" />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* Stats */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statValue}>
              ₹{(stats.walletBalance || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={s.statLabel}>Balance</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: '#10B981' }]}>
              ₹{(stats.totalCredits || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={s.statLabel}>Total Credits</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: '#EF4444' }]}>
              ₹{(stats.totalDebits || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={s.statLabel}>Total Debits</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: '#F59E0B' }]}>
              ₹{(stats.totalCashback || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={s.statLabel}>Cashback Earned</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: '#8B5CF6' }]}>
              ₹{(stats.pendingCashback || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={s.statLabel}>Pending CB</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
            onPress={() => openAction('credit')}
          >
            <Ionicons name="add-circle" size={18} color="#10B981" />
            <Text style={[s.actionText, { color: '#10B981' }]}>Credit Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}
            onPress={() => openAction('debit')}
          >
            <Ionicons name="remove-circle" size={18} color="#EF4444" />
            <Text style={[s.actionText, { color: '#EF4444' }]}>Debit Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <Text style={s.sectionTitle}>Transaction History</Text>
        {transactions.length === 0 ? (
          <Text style={s.empty}>No transactions yet</Text>
        ) : (
          transactions.map((tx: any) => (
            <View key={tx._id} style={s.txCard}>
              <View style={s.txLeft}>
                <Ionicons
                  name={tx.type.includes('credit') ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={20}
                  color={tx.type.includes('credit') ? '#10B981' : '#EF4444'}
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={s.txType}>
                    {tx.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Text>
                  <Text style={s.txReason} numberOfLines={1}>{tx.reason || '—'}</Text>
                  <Text style={s.txDate}>
                    {new Date(tx.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    s.txAmount,
                    { color: tx.type.includes('credit') ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {tx.type.includes('credit') ? '+' : '-'}₹{tx.amount}
                </Text>
                <Text style={s.txBalance}>Bal: ₹{tx.balanceAfter}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Credit/Debit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>
              {modalType === 'credit' ? '💰 Credit Wallet' : '🔻 Debit Wallet'}
            </Text>
            <Text style={s.modalLabel}>Amount (₹)</Text>
            <TextInput
              style={s.modalInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 100"
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={s.modalLabel}>Reason (mandatory)</Text>
            <TextInput
              style={[s.modalInput, { height: 70 }]}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Refund for cancelled booking"
              multiline
              placeholderTextColor="#9CA3AF"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#F3F4F6' }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.modalBtn,
                  { backgroundColor: modalType === 'credit' ? '#10B981' : '#EF4444' },
                ]}
                onPress={executeAction}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {modalType === 'credit' ? 'Credit' : 'Debit'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: {
    width: '47%', backgroundColor: '#F9FAFB', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#F3F4F6',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  statLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  actionText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  empty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  txCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FAFBFC', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txType: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  txReason: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  txDate: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txBalance: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  modalInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, color: '#1F2937',
  },
  modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
});
