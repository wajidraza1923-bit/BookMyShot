import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, ScrollView, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminUsers({ navigation }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  // Cashback modal
  const [cashbackModal, setCashbackModal] = useState(false);
  const [cbAmount, setCbAmount] = useState('');
  const [cbType, setCbType] = useState<'credit' | 'debit'>('credit');
  const [cbReason, setCbReason] = useState('');
  const [cbSaving, setCbSaving] = useState(false);
  // Suspend modal
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const load = useCallback(async () => {
    try {
      const url = '/admin/customers' + (search ? '?search=' + encodeURIComponent(search) : '');
      const res = await api.get(url);
      const data = res.data?.data || res.data?.users || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // Fallback to old endpoint if new one isn't deployed yet
      try {
        const res2 = await api.get('/admin/users');
        const users2 = res2.data?.users || [];
        setUsers(users2.map((u: any) => ({ ...u, walletBalance: 0, bookingCount: 0, totalEarned: 0 })));
      } catch { setUsers([]); }
    }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openDetail = async (id: string) => {
    setDetailVisible(true); setDetailLoading(true); setActiveTab('overview');
    try {
      const res = await api.get('/admin/customers/' + id);
      setDetail(res.data?.data || null);
    } catch {
      // If customer detail endpoint not available, show basic info
      const user = users.find(u => u._id === id);
      if (user) {
        setDetail({ user, summary: { walletBalance: user.walletBalance || 0, totalCredited: user.totalEarned || 0, totalWithdrawnPaid: 0, totalPending: user.pendingCashback || 0, totalBookings: user.bookingCount || 0, totalSpent: 0, totalCancelled: 0, totalWithdrawnPending: 0, balanceMismatch: false, expectedBalance: 0 }, bookings: [], cashbackTxns: [], withdrawals: [], payments: [], timeline: [] });
      } else { Alert.alert('Error', 'Failed to load'); setDetailVisible(false); }
    }
    finally { setDetailLoading(false); }
  };

  const suspendUser = async (id: string, isSuspended: boolean) => {
    if (isSuspended) {
      // Reactivate directly
      Alert.alert('Reactivate', 'Reactivate this user?', [
        { text: 'Cancel' },
        { text: 'Confirm', onPress: async () => {
          try { await api.patch('/admin/customers/' + id + '/status', { status: 'active' }); load(); openDetail(id); } catch {}
        }},
      ]);
    } else {
      setSuspendReason('');
      setSuspendModal(true);
    }
  };

  const confirmSuspend = async () => {
    if (!detail?.user?._id) return;
    try {
      await api.patch('/admin/customers/' + detail.user._id + '/status', { status: 'suspended' });
      setSuspendModal(false);
      load();
      openDetail(detail.user._id);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const openCashbackModal = () => {
    setCbAmount(''); setCbType('credit'); setCbReason(''); setCashbackModal(true);
  };

  const submitCashback = async () => {
    if (!detail?.user?._id) return;
    const amt = Number(cbAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!cbReason.trim()) { Alert.alert('Error', 'Reason is required'); return; }

    setCbSaving(true);
    try {
      const endpoint = cbType === 'credit' ? '/admin/customers/' + detail.user._id + '/add-cashback' : '/admin/customers/' + detail.user._id + '/deduct-cashback';
      const res = await api.post(endpoint, { amount: amt, reason: cbReason.trim() });
      const data = res.data || res;
      if (data.success) {
        Alert.alert('Success', data.message || `₹${amt} ${cbType === 'credit' ? 'credited' : 'debited'} successfully`);
        setCashbackModal(false);
        openDetail(detail.user._id);
      } else {
        // Show real server error including raw response if available
        const errMsg = data.message || 'Operation failed';
        const rawHint = data._raw ? '\n\nServer response: ' + data._raw.substring(0, 150) : '';
        Alert.alert('Failed', errMsg + rawHint);
      }
    } catch (e: any) {
      const errData = e.response?.data;
      const msg = errData?.message || e.message || 'Network error';
      const rawHint = errData?._raw ? '\n\nRaw: ' + errData._raw.substring(0, 150) : '';
      Alert.alert('Error', msg + rawHint);
    } finally { setCbSaving(false); }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#1F2937" /></TouchableOpacity>
        <Text style={s.title}>👤 User Management</Text>
        <Text style={s.count}>{users.length}</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color="#9CA3AF" />
        <TextInput style={s.searchInput} placeholder="Search name, email, phone..." placeholderTextColor="#9CA3AF" value={search} onChangeText={setSearch} onSubmitEditing={load} returnKeyType="search" />
      </View>

      {/* List */}
      {loading ? <ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={users}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C3BFF']} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={40} color="#D1D5DB" /><Text style={s.emptyText}>No users found</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => openDetail(item._id)}>
              <View style={s.cardRow}>
                <View style={s.avatar}><Ionicons name="person" size={18} color="#6C3BFF" /></View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.name || 'User'}</Text>
                  <Text style={s.cardSub}>{item.email}</Text>
                  {item.phone ? <Text style={s.cardSub}>{item.phone}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.walletBadge}>₹{(item.walletBalance || 0).toLocaleString('en-IN')}</Text>
                  <Text style={s.bookingBadge}>{item.bookingCount || 0} bookings</Text>
                </View>
              </View>
              <View style={s.cardBottom}>
                <Text style={s.cardDate}>Joined {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                <View style={[s.statusDot, { backgroundColor: item.accountDeleteRequested ? '#EF4444' : '#10B981' }]} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{detail?.user?.name || 'Customer'}</Text>
            <TouchableOpacity onPress={() => setDetailVisible(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
          </View>

          {detailLoading ? <ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 40 }} /> : detail ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {/* Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 6 }}>
                {['overview', 'bookings', 'cashback', 'withdrawals', 'payments', 'timeline', 'actions'].map(t => (
                  <TouchableOpacity key={t} style={[s.tab, activeTab === t && s.tabActive]} onPress={() => setActiveTab(t)}>
                    <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <View>
                  <View style={s.profileCard}>
                    <Row label="Name" value={detail.user.name} />
                    <Row label="Email" value={detail.user.email} />
                    <Row label="Phone" value={detail.user.phone || '—'} />
                    <Row label="User ID" value={detail.user._id} />
                    <Row label="Joined" value={new Date(detail.user.createdAt).toLocaleDateString('en-IN')} />
                    <Row label="Status" value={detail.user.accountDeleteRequested ? '🔴 Suspended' : '🟢 Active'} />
                  </View>
                  <Text style={s.secTitle}>Wallet & Cashback</Text>
                  <View style={s.statsGrid}>
                    <Stat val={`₹${detail.summary.walletBalance.toLocaleString('en-IN')}`} label="Balance" color="#6C3BFF" />
                    <Stat val={`₹${detail.summary.totalCredited.toLocaleString('en-IN')}`} label="Earned" color="#10B981" />
                    <Stat val={`₹${detail.summary.totalWithdrawnPaid.toLocaleString('en-IN')}`} label="Withdrawn" color="#F59E0B" />
                    <Stat val={`₹${detail.summary.totalPending.toLocaleString('en-IN')}`} label="Pending" color="#3B82F6" />
                  </View>
                  <View style={s.statsGrid}>
                    <Stat val={String(detail.summary.totalBookings)} label="Bookings" color="#6C3BFF" />
                    <Stat val={`₹${detail.summary.totalSpent.toLocaleString('en-IN')}`} label="Fees Paid" color="#10B981" />
                  </View>
                  {detail.summary.balanceMismatch && <View style={s.warning}><Ionicons name="warning" size={14} color="#D97706" /><Text style={s.warningText}>⚠ Balance mismatch detected</Text></View>}
                </View>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <View>
                  {detail.bookings.length === 0 ? <Text style={s.noData}>No bookings</Text> : detail.bookings.map((b: any, i: number) => (
                    <View key={i} style={s.listCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.listTitle}>{b.eventType}</Text>
                        <View style={[s.badge, { backgroundColor: b.status === 'Completed' ? '#D1FAE5' : b.status === 'cancelled' ? '#FEE2E2' : '#FEF3C7' }]}>
                          <Text style={[s.badgeText, { color: b.status === 'Completed' ? '#059669' : b.status === 'cancelled' ? '#DC2626' : '#D97706' }]}>{b.status}</Text>
                        </View>
                      </View>
                      <Text style={s.listSub}>Creator: {b.creator?.user?.name || b.creator?.businessName || '—'}</Text>
                      <Text style={s.listSub}>Amount: ₹{(b.amount || b.budget || 0).toLocaleString('en-IN')} • Fee: {b.bookingFeePaid ? '₹' + b.bookingFeeAmount : 'Unpaid'}</Text>
                      <Text style={s.listDate}>{new Date(b.createdAt).toLocaleDateString('en-IN')} • Event: {new Date(b.eventDate).toLocaleDateString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Cashback Tab */}
              {activeTab === 'cashback' && (
                <View>
                  {detail.cashbackTxns.length === 0 ? <Text style={s.noData}>No cashback</Text> : detail.cashbackTxns.map((tx: any, i: number) => (
                    <View key={i} style={s.listCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.listTitle}>₹{tx.amount} ({tx.percentage}%)</Text>
                        <View style={[s.badge, { backgroundColor: tx.status === 'credited' ? '#D1FAE5' : tx.status === 'cancelled' ? '#FEE2E2' : '#FEF3C7' }]}>
                          <Text style={[s.badgeText, { color: tx.status === 'credited' ? '#059669' : tx.status === 'cancelled' ? '#DC2626' : '#D97706' }]}>{tx.status}</Text>
                        </View>
                      </View>
                      <Text style={s.listSub}>On booking: ₹{tx.bookingAmount.toLocaleString('en-IN')}</Text>
                      {tx.notes ? <Text style={s.listSub}>{tx.notes}</Text> : null}
                      <Text style={s.listDate}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Withdrawals Tab */}
              {activeTab === 'withdrawals' && (
                <View>
                  {detail.withdrawals.length === 0 ? <Text style={s.noData}>No withdrawals</Text> : detail.withdrawals.map((w: any, i: number) => (
                    <View key={i} style={s.listCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.listTitle}>₹{w.amount.toLocaleString('en-IN')}</Text>
                        <View style={[s.badge, { backgroundColor: w.status === 'paid' ? '#D1FAE5' : w.status === 'rejected' ? '#FEE2E2' : '#FEF3C7' }]}>
                          <Text style={[s.badgeText, { color: w.status === 'paid' ? '#059669' : w.status === 'rejected' ? '#DC2626' : '#D97706' }]}>{w.status}</Text>
                        </View>
                      </View>
                      <Text style={s.listSub}>{w.accountHolderName} • {w.bankAccountNumber}</Text>
                      {w.utrNumber ? <Text style={[s.listSub, { color: '#10B981' }]}>UTR: {w.utrNumber}</Text> : null}
                      {w.rejectionReason ? <Text style={[s.listSub, { color: '#EF4444' }]}>Reason: {w.rejectionReason}</Text> : null}
                      <Text style={s.listDate}>{new Date(w.createdAt).toLocaleDateString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <View>
                  {detail.payments.length === 0 ? <Text style={s.noData}>No payments</Text> : detail.payments.map((p: any, i: number) => (
                    <View key={i} style={s.listCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.listTitle}>₹{p.amount}</Text>
                        <View style={[s.badge, { backgroundColor: p.status === 'paid' ? '#D1FAE5' : '#FEF3C7' }]}>
                          <Text style={[s.badgeText, { color: p.status === 'paid' ? '#059669' : '#D97706' }]}>{p.status}</Text>
                        </View>
                      </View>
                      {p.razorpayPaymentId ? <Text style={s.listSub}>Payment ID: {p.razorpayPaymentId}</Text> : null}
                      {p.razorpayOrderId ? <Text style={s.listSub}>Order ID: {p.razorpayOrderId}</Text> : null}
                      <Text style={s.listDate}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <View>
                  {detail.timeline.slice(0, 30).map((t: any, i: number) => {
                    const colors: any = { account_created: '#6C3BFF', inquiry_sent: '#F59E0B', creator_accepted: '#10B981', advance_paid: '#3B82F6', booking_completed: '#10B981', booking_cancelled: '#EF4444', cashback_added: '#10B981', cashback_cancelled: '#EF4444', withdrawal_pending: '#F59E0B', withdrawal_paid: '#10B981', withdrawal_rejected: '#EF4444' };
                    return (
                      <View key={i} style={s.timelineItem}>
                        <View style={[s.timelineDot, { backgroundColor: colors[t.type] || '#6B7280' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.timelineDesc}>{t.desc}</Text>
                          <Text style={s.timelineDate}>{t.date ? new Date(t.date).toLocaleString('en-IN') : ''}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && (
                <View style={{ gap: 10 }}>
                  <TouchableOpacity style={s.actionBtn} onPress={openCashbackModal}><Ionicons name="add-circle" size={18} color="#6C3BFF" /><Text style={s.actionBtnText}>Add / Deduct Cashback</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: detail.user.accountDeleteRequested ? '#D1FAE5' : '#FEE2E2' }]} onPress={() => suspendUser(detail.user._id, detail.user.accountDeleteRequested)}>
                    <Ionicons name={detail.user.accountDeleteRequested ? 'checkmark-circle' : 'ban'} size={18} color={detail.user.accountDeleteRequested ? '#10B981' : '#EF4444'} />
                    <Text style={[s.actionBtnText, { color: detail.user.accountDeleteRequested ? '#10B981' : '#EF4444' }]}>{detail.user.accountDeleteRequested ? 'Reactivate User' : 'Suspend User'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* ═══ CASHBACK MODAL ═══ */}
      <Modal visible={cashbackModal} transparent animationType="fade">
        <View style={s.cbOverlay}>
          <View style={s.cbModal}>
            <Text style={s.cbTitle}>💰 Manual Cashback</Text>
            {detail && (
              <View style={s.cbInfo}>
                <Text style={s.cbInfoText}>Customer: {detail.user?.name}</Text>
                <Text style={s.cbInfoText}>Balance: ₹{(detail.summary?.walletBalance || 0).toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={s.cbTypeRow}>
              <TouchableOpacity style={[s.cbTypeBtn, cbType === 'credit' && s.cbTypeBtnActive]} onPress={() => setCbType('credit')}>
                <Ionicons name="add-circle" size={16} color={cbType === 'credit' ? '#fff' : '#10B981'} />
                <Text style={[s.cbTypeBtnText, cbType === 'credit' && { color: '#fff' }]}>Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cbTypeBtn, cbType === 'debit' && s.cbTypeBtnActiveRed]} onPress={() => setCbType('debit')}>
                <Ionicons name="remove-circle" size={16} color={cbType === 'debit' ? '#fff' : '#EF4444'} />
                <Text style={[s.cbTypeBtnText, cbType === 'debit' && { color: '#fff' }]}>Debit</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.cbLabel}>Amount (₹) *</Text>
            <TextInput style={s.cbInput} value={cbAmount} onChangeText={setCbAmount} placeholder="Enter amount" keyboardType="numeric" />
            <Text style={s.cbLabel}>Reason / Notes *</Text>
            <TextInput style={[s.cbInput, { height: 70, textAlignVertical: 'top' }]} value={cbReason} onChangeText={setCbReason} placeholder="e.g. Compensation, Bonus, Error correction" multiline />
            <View style={s.cbBtns}>
              <TouchableOpacity style={s.cbCancelBtn} onPress={() => setCashbackModal(false)}><Text style={s.cbCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.cbSubmitBtn, cbSaving && { opacity: 0.5 }]} onPress={submitCashback} disabled={cbSaving}>
                <Text style={s.cbSubmitText}>{cbSaving ? 'Processing...' : `${cbType === 'credit' ? 'Credit' : 'Debit'} ₹${cbAmount || '0'}`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ SUSPEND MODAL ═══ */}
      <Modal visible={suspendModal} transparent animationType="fade">
        <View style={s.cbOverlay}>
          <View style={s.cbModal}>
            <Text style={s.cbTitle}>🚫 Suspend User</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>This will prevent the user from logging in.</Text>
            <Text style={s.cbLabel}>Reason for Suspension</Text>
            <TextInput style={[s.cbInput, { height: 70, textAlignVertical: 'top' }]} value={suspendReason} onChangeText={setSuspendReason} placeholder="Explain why..." multiline />
            <View style={s.cbBtns}>
              <TouchableOpacity style={s.cbCancelBtn} onPress={() => setSuspendModal(false)}><Text style={s.cbCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.cbSubmitBtn, { backgroundColor: '#EF4444' }]} onPress={confirmSuspend}>
                <Text style={s.cbSubmitText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View>;
}

function Stat({ val, label, color }: { val: string; label: string; color: string }) {
  return <View style={s.statCard}><Text style={[s.statVal, { color }]}>{val}</Text><Text style={s.statLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1F2937' },
  count: { fontSize: 11, fontWeight: '700', color: '#6C3BFF', backgroundColor: '#F3E8FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 50 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 13, color: '#1F2937' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: '#9CA3AF', marginTop: 10 },
  // Card
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F0F7' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  cardSub: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  walletBadge: { fontSize: 12, fontWeight: '700', color: '#6C3BFF' },
  bookingBadge: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  cardDate: { fontSize: 9, color: '#9CA3AF' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  // Tabs
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: '#6C3BFF', borderColor: '#6C3BFF' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  tabTextActive: { color: '#FFFFFF' },
  // Profile
  profileCard: { backgroundColor: '#F8F6FF', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#EDE9FE' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EDE9FE' },
  rowLabel: { fontSize: 11, color: '#6B7280' },
  rowValue: { fontSize: 11, fontWeight: '600', color: '#1F2937', maxWidth: '60%', textAlign: 'right' },
  secTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 10, marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#F8F6FF', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  statVal: { fontSize: 13, fontWeight: '800' },
  statLabel: { fontSize: 8, color: '#6B7280', marginTop: 2 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 10 },
  warningText: { fontSize: 11, color: '#92400E' },
  // List cards
  listCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F0F7' },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  listSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  listDate: { fontSize: 9, color: '#9CA3AF', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  noData: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingVertical: 30 },
  // Timeline
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  timelineDesc: { fontSize: 11, color: '#374151' },
  timelineDate: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  // Actions
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EDE9FE', backgroundColor: '#F8F6FF' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#6C3BFF' },
  // Cashback / Suspend Modal
  cbOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  cbModal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '88%', maxHeight: '80%' },
  cbTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  cbInfo: { backgroundColor: '#F8F6FF', borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#EDE9FE' },
  cbInfoText: { fontSize: 11, color: '#4B5563', marginBottom: 2 },
  cbTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  cbTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  cbTypeBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  cbTypeBtnActiveRed: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  cbTypeBtnText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  cbLabel: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginBottom: 5, marginTop: 8 },
  cbInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1F2937' },
  cbBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cbCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cbCancelText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  cbSubmitBtn: { flex: 2, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#6C3BFF' },
  cbSubmitText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
