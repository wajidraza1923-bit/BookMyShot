import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, Alert, TextInput, Modal, RefreshControl, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminWithdrawals({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [payModal, setPayModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [utr, setUtr] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [customerHistory, setCustomerHistory] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/withdrawal/admin/all');
      setRequests(res.data?.data || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  const filtered = filter ? requests.filter(r => r.status === filter) : requests;
  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    today: requests.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString()).length,
    totalPaid: requests.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const approve = async (id: string) => {
    Alert.alert('Approve', 'Approve this withdrawal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try { await api.put(`/withdrawal/admin/approve/${id}`); loadData(); }
        catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
      }},
    ]);
  };

  const submitPay = async () => {
    if (!utr.trim()) { Alert.alert('Error', 'UTR number is required'); return; }
    try {
      await api.put(`/withdrawal/admin/pay/${selectedReq._id}`, {
        utrNumber: utr.trim(), adminNotes: payNotes.trim() || undefined,
      });
      setPayModal(false); setUtr(''); setPayNotes(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) { Alert.alert('Error', 'Reason is required'); return; }
    try {
      await api.put(`/withdrawal/admin/reject/${selectedReq._id}`, { rejectionReason: rejectReason.trim() });
      setRejectModal(false); setRejectReason(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const loadCustomerHistory = async (req: any) => {
    try {
      const userId = req.user?._id || req.user;
      const res = await api.get(`/withdrawal/admin/customer-history/${userId}`);
      setCustomerHistory(res.data?.data || null);
    } catch { setCustomerHistory(null); }
  };

  const statusColor = (s: string) => {
    if (s === 'pending') return '#F59E0B';
    if (s === 'approved') return '#3B82F6';
    if (s === 'paid') return '#10B981';
    if (s === 'rejected') return '#EF4444';
    return '#6B7280';
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  const renderItem = ({ item: r }: any) => {
    const user = r.user || {};
    const date = new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardName}>{user.name || 'Unknown'}</Text>
            <Text style={s.cardSub}>{user.phone || user.email || ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.cardAmount}>₹{r.amount.toLocaleString('en-IN')}</Text>
            <View style={[s.badge, { backgroundColor: statusColor(r.status) + '20' }]}>
              <Text style={[s.badgeText, { color: statusColor(r.status) }]}>{r.status}</Text>
            </View>
          </View>
        </View>
        <Text style={s.bankInfo}>{r.accountHolderName} • {r.bankAccountNumber} • IFSC: {r.ifscCode}</Text>
        {r.availableBalance !== undefined && (
          <Text style={{ fontSize: 10, color: '#6C3BFF', fontWeight: '600', marginBottom: 6 }}>Wallet: ₹{(r.availableBalance || 0).toLocaleString('en-IN')} available</Text>
        )}
        <View style={s.cardActions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => { setSelectedReq(r); loadCustomerHistory(r); setDetailModal(true); }}>
            <Ionicons name="eye-outline" size={14} color="#6C3BFF" /><Text style={s.actionText}>View</Text>
          </TouchableOpacity>
          {r.status === 'pending' && (
            <>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => approve(r._id)}>
                <Ionicons name="checkmark" size={14} color="#059669" /><Text style={[s.actionText, { color: '#059669' }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#DBEAFE' }]} onPress={() => { setSelectedReq(r); setPayModal(true); }}>
                <Ionicons name="card-outline" size={14} color="#2563EB" /><Text style={[s.actionText, { color: '#2563EB' }]}>Mark Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => { setSelectedReq(r); setRejectModal(true); }}>
                <Ionicons name="close" size={14} color="#DC2626" /><Text style={[s.actionText, { color: '#DC2626' }]}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {r.status === 'approved' && (
            <>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#DBEAFE' }]} onPress={() => { setSelectedReq(r); setPayModal(true); }}>
                <Ionicons name="card-outline" size={14} color="#2563EB" /><Text style={[s.actionText, { color: '#2563EB' }]}>Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => { setSelectedReq(r); setRejectModal(true); }}>
                <Ionicons name="close" size={14} color="#DC2626" /><Text style={[s.actionText, { color: '#DC2626' }]}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        <Text style={s.cardDate}>{date}</Text>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>💸 Withdrawals</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderTopColor: '#F59E0B' }]}><Text style={[s.statVal, { color: '#F59E0B' }]}>{stats.pending}</Text><Text style={s.statLbl}>Pending</Text></View>
        <View style={[s.statCard, { borderTopColor: '#6C3BFF' }]}><Text style={[s.statVal, { color: '#6C3BFF' }]}>{stats.today}</Text><Text style={s.statLbl}>Today</Text></View>
        <View style={[s.statCard, { borderTopColor: '#10B981' }]}><Text style={[s.statVal, { color: '#10B981' }]}>₹{stats.totalPaid.toLocaleString('en-IN')}</Text><Text style={s.statLbl}>Paid</Text></View>
        <View style={[s.statCard, { borderTopColor: '#EF4444' }]}><Text style={[s.statVal, { color: '#EF4444' }]}>{stats.rejected}</Text><Text style={s.statLbl}>Rejected</Text></View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {['', 'pending', 'approved', 'paid', 'rejected'].map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#6C3BFF']} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="wallet-outline" size={40} color="#E5E7EB" /><Text style={s.emptyText}>No requests found</Text></View>}
      />

      {/* Pay Modal */}
      <Modal visible={payModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>💳 Mark as Paid</Text>
            <Text style={s.fieldLabel}>UTR / Transaction Number *</Text>
            <TextInput style={s.input} value={utr} onChangeText={setUtr} placeholder="Enter UTR number" />
            <Text style={s.fieldLabel}>Admin Notes (optional)</Text>
            <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={payNotes} onChangeText={setPayNotes} placeholder="Notes..." multiline />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setPayModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.submitBtn} onPress={submitPay}><Text style={s.submitText}>Mark as Paid</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={rejectModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>❌ Reject Withdrawal</Text>
            <Text style={s.fieldLabel}>Reason for Rejection *</Text>
            <TextInput style={[s.input, { height: 90, textAlignVertical: 'top' }]} value={rejectReason} onChangeText={setRejectReason} placeholder="Explain why..." multiline />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setRejectModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: '#EF4444' }]} onPress={submitReject}><Text style={s.submitText}>Reject</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: '90%' }]}>
            <Text style={s.modalTitle}>📋 Customer Details & History</Text>
            {selectedReq && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10 }}>
                  <DetailRow label="Customer" value={selectedReq.user?.name || 'N/A'} />
                  <DetailRow label="Phone" value={selectedReq.user?.phone || 'N/A'} />
                  <DetailRow label="Amount" value={`₹${selectedReq.amount?.toLocaleString('en-IN')}`} />
                  <DetailRow label="Account Holder" value={selectedReq.accountHolderName} />
                  <DetailRow label="Bank Account" value={selectedReq.bankAccountNumber} />
                  <DetailRow label="IFSC" value={selectedReq.ifscCode} />
                  <DetailRow label="UPI" value={selectedReq.upiId || 'N/A'} />
                  <DetailRow label="Status" value={selectedReq.status} />
                  <DetailRow label="Requested" value={new Date(selectedReq.createdAt).toLocaleString('en-IN')} />
                  {selectedReq.utrNumber ? <DetailRow label="UTR" value={selectedReq.utrNumber} /> : null}
                  {selectedReq.rejectionReason ? <DetailRow label="Rejection" value={selectedReq.rejectionReason} /> : null}
                </View>

                {/* Wallet Summary */}
                {customerHistory?.summary && (
                  <View style={{ marginTop: 14, backgroundColor: '#F8F6FF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#EDE9FE' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#6C3BFF', marginBottom: 6 }}>💰 Wallet Summary</Text>
                    <DetailRow label="Total Earned" value={`₹${(customerHistory.summary.totalCredited || 0).toLocaleString('en-IN')}`} />
                    <DetailRow label="Cancelled" value={`₹${(customerHistory.summary.totalCancelled || 0).toLocaleString('en-IN')}`} />
                    <DetailRow label="Withdrawn (Paid)" value={`₹${(customerHistory.summary.totalWithdrawnPaid || 0).toLocaleString('en-IN')}`} />
                    <DetailRow label="Available" value={`₹${(customerHistory.summary.availableBalance || 0).toLocaleString('en-IN')}`} />
                  </View>
                )}

                {/* Timeline */}
                {customerHistory?.timeline && customerHistory.timeline.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>📋 Full Timeline</Text>
                    {customerHistory.timeline.slice(0, 20).map((item: any, idx: number) => {
                      const icon = item.type === 'booking_fee' ? '💳' : item.type === 'cashback_credited' ? '🎁' : item.type === 'cashback_cancelled' ? '❌' : '💸';
                      const color = item.type === 'cashback_credited' ? '#10B981' : item.type === 'cashback_cancelled' ? '#EF4444' : item.type === 'booking_fee' ? '#6C3BFF' : '#F59E0B';
                      const date = new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      return (
                        <View key={idx} style={{ flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14 }}>{icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color }}>{item.description}</Text>
                            <Text style={{ fontSize: 8, color: '#9CA3AF' }}>{date}{item.bookingStatus ? ` • ${item.bookingStatus}` : ''}{item.utrNumber ? ` • UTR: ${item.utrNumber}` : ''}</Text>
                          </View>
                          <Text style={{ fontSize: 11, fontWeight: '700', color }}>₹{item.amount?.toLocaleString('en-IN')}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            )}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setDetailModal(false); setCustomerHistory(null); }}><Text style={s.cancelText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 12, color: '#6B7280', flex: 0.4 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 0.6, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  // Stats
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F1F0F7', borderTopWidth: 3 },
  statVal: { fontSize: 14, fontWeight: '800' },
  statLbl: { fontSize: 8, color: '#6B7280', marginTop: 2 },
  // Filters
  filterScroll: { marginTop: 14, maxHeight: 44 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  filterActive: { backgroundColor: '#6C3BFF', borderColor: '#6C3BFF' },
  filterText: { fontSize: 12, fontWeight: '500', color: '#4B5563', textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  // Card
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1F0F7' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  cardSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, marginTop: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  bankInfo: { fontSize: 10, color: '#6B7280', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  actionText: { fontSize: 11, fontWeight: '600', color: '#6C3BFF' },
  cardDate: { fontSize: 9, color: '#9CA3AF', marginTop: 8, textAlign: 'right' },
  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: '#9CA3AF', marginTop: 10 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '88%', maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1F2937' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cancelText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#6C3BFF' },
  submitText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
