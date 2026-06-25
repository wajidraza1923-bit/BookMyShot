/**
 * CreatorPaymentVerification — Verify user payment proofs
 * Shows pending proofs, approve/reject with remarks
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorPaymentVerification({ navigation }: any) {
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('pending');
  const [viewImage, setViewImage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/payment-proofs/creator');
      setProofs(res.data?.proofs || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const approve = async (id: string) => {
    Alert.alert('Approve Payment', 'Confirm this payment proof?', [
      { text: 'Cancel' },
      { text: 'Approve', onPress: async () => {
        try {
          await api.patch(`/payment-proofs/${id}/creator-verify`, { status: 'verified' });
          await load();
          Alert.alert('Done', 'Payment approved');
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  const reject = (id: string) => {
    Alert.alert('Reject Payment', 'Enter reason for rejection:', [
      { text: 'Cancel' },
      { text: 'Blurry Screenshot', onPress: () => doReject(id, 'Blurry or unclear screenshot') },
      { text: 'Wrong Amount', onPress: () => doReject(id, 'Amount does not match') },
      { text: 'Invalid Proof', onPress: () => doReject(id, 'Payment proof is invalid') },
    ]);
  };

  const doReject = async (id: string, reason: string) => {
    try {
      await api.patch(`/payment-proofs/${id}/creator-verify`, { status: 'rejected', adminNote: reason });
      await load();
      Alert.alert('Done', 'Payment rejected. User has been notified.');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const filtered = proofs.filter(p => {
    if (tab === 'pending') return p.status === 'pending';
    if (tab === 'approved') return p.status === 'verified';
    return p.status === 'rejected';
  });

  const pendingCount = proofs.filter(p => p.status === 'pending').length;

  if (loading) return <View style={s.root}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.root}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.headTitle}>Payment Verification</Text>
        {pendingCount > 0 && <View style={s.pendingBadge}><Text style={s.pendingBadgeText}>{pendingCount}</Text></View>}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[{ key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' }].map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={filtered} keyExtractor={i => i._id} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="card-outline" size={36} color={colors.textMuted} /><Text style={s.emptyText}>No {tab} payments</Text></View>}
        renderItem={({ item }) => {
          const statusColor = item.status === 'verified' ? '#10B981' : item.status === 'rejected' ? '#EF4444' : '#F59E0B';
          return (
            <View style={s.card}>
              {/* Header */}
              <View style={s.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{item.user?.name || 'User'}</Text>
                  <Text style={s.bookingId}>Booking: {item.booking?.invoiceNumber || item.booking?._id?.slice(-8) || '—'}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: statusColor + '15' }]}>
                  <Text style={[s.statusText, { color: statusColor }]}>{item.status === 'verified' ? 'Approved' : item.status === 'rejected' ? 'Rejected' : 'Pending'}</Text>
                </View>
              </View>

              {/* Amount */}
              <View style={s.amountRow}>
                <View style={s.amountItem}><Text style={s.amountLabel}>Amount</Text><Text style={s.amountVal}>₹{(item.amount || 0).toLocaleString('en-IN')}</Text></View>
                <View style={s.amountItem}><Text style={s.amountLabel}>Method</Text><Text style={s.amountVal}>{item.paymentMethod || item.note || '—'}</Text></View>
                <View style={s.amountItem}><Text style={s.amountLabel}>Date</Text><Text style={s.amountVal}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text></View>
              </View>

              {/* Proof Image */}
              {item.screenshot && (
                <TouchableOpacity onPress={() => setViewImage(item.screenshot)} style={s.proofWrap}>
                  <Image source={{ uri: item.screenshot }} style={s.proofThumb} />
                  <View style={s.proofOverlay}><Ionicons name="expand-outline" size={16} color="#fff" /><Text style={s.proofText}>Tap to view</Text></View>
                </TouchableOpacity>
              )}

              {/* Rejection reason */}
              {item.status === 'rejected' && item.adminNote && (
                <View style={s.remarkCard}><Ionicons name="alert-circle" size={14} color="#EF4444" /><Text style={s.remarkText}>{item.adminNote}</Text></View>
              )}

              {/* Actions (only for pending) */}
              {item.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => reject(item._id)}>
                    <Ionicons name="close-circle" size={16} color="#EF4444" /><Text style={s.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.approveBtn} onPress={() => approve(item._id)}>
                    <Ionicons name="checkmark-circle" size={16} color="#000" /><Text style={s.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Image Viewer Modal */}
      <Modal visible={!!viewImage} transparent animationType="fade">
        <View style={s.modalBg}>
          <TouchableOpacity style={s.modalClose} onPress={() => setViewImage('')}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
          {viewImage ? <Image source={{ uri: viewImage }} style={s.modalImg} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 8, gap: 10 },
  headTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  pendingBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#000' },
  tabs: { flexDirection: 'row', marginHorizontal: 14, backgroundColor: colors.surface, borderRadius: 8, padding: 3, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 6 },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  // Card
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userName: { fontSize: 14, fontWeight: '600', color: colors.text },
  bookingId: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  amountRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  amountItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 6, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  amountLabel: { fontSize: 9, color: colors.textMuted },
  amountVal: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 2 },
  // Proof
  proofWrap: { position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  proofThumb: { width: '100%', height: 120, borderRadius: 10 },
  proofOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  proofText: { fontSize: 10, color: '#fff', fontWeight: '500' },
  // Remark
  remarkCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: 6, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)' },
  remarkText: { fontSize: 11, color: '#EF4444', flex: 1 },
  // Actions
  actions: { flexDirection: 'row', gap: 8 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  rejectText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#10B981' },
  approveText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Empty
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  modalImg: { width: '90%', height: '70%' },
});
