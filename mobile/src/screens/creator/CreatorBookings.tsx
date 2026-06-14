import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorBookings({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [payForm, setPayForm] = useState({ amount: '', type: 'advance', notes: '' });
  const [eventForm, setEventForm] = useState({ name: '', date: '', location: '' });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/booking-requests');
      setBookings(res.data?.bookings || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = bookings.filter(b => {
    let tabMatch = true;
    if (tab === 'pending') tabMatch = b.status === 'Booking Created';
    else if (tab === 'active') tabMatch = ['Creator Accepted', 'Payment Submitted', 'Payment Approved', 'Event Scheduled'].includes(b.status);
    else if (tab === 'done') tabMatch = b.status === 'Completed' || b.status === 'completed';
    else if (tab === 'rejected') tabMatch = b.status === 'rejected' || b.status === 'cancelled';
    if (!tabMatch) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (b.clientName || '').toLowerCase().includes(q) || (b.clientPhone || '').includes(q) || (b.eventType || '').toLowerCase().includes(q) || (b.eventLocation || '').toLowerCase().includes(q);
  });

  // ═══ ACTIONS (reuse same API calls as BookingDetail) ═══
  const acceptBooking = async () => {
    const amount = parseInt(amountInput);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    try {
      await api.patch(`/creator/booking-requests/${activeBookingId}`, { status: 'Creator Accepted', amount });
      setShowAmountModal(false); await load();
      Alert.alert('Accepted', `Booking accepted for ₹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const setProjectAmount = async () => {
    const amount = parseInt(amountInput);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Invalid amount'); return; }
    try {
      await api.patch(`/payment-records/booking/${activeBookingId}/amount`, { amount });
      setShowAmountModal(false); await load();
      Alert.alert('Updated', `Amount set to ₹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const recordPayment = async () => {
    const amount = parseInt(payForm.amount);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter valid amount'); return; }
    try {
      await api.post('/payment-records/creator', { bookingId: activeBookingId, amount, paymentType: payForm.type, notes: payForm.notes });
      setShowPaymentModal(false); setPayForm({ amount: '', type: 'advance', notes: '' }); await load();
      Alert.alert('Recorded', `₹${amount.toLocaleString('en-IN')} payment recorded`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const markPaid = (id: string) => Alert.alert('Mark Paid', 'Mark as fully paid?', [{ text: 'Cancel' }, { text: 'Confirm', onPress: async () => { try { await api.patch(`/payment-records/booking/${id}/mark-paid`); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); } } }]);

  const addEvent = async () => {
    if (!eventForm.name || !eventForm.date) { Alert.alert('Error', 'Name and date required'); return; }
    try {
      await api.post('/booking-events', { bookingId: activeBookingId, eventName: eventForm.name, eventDate: eventForm.date, location: eventForm.location });
      setShowEventModal(false); setEventForm({ name: '', date: '', location: '' }); await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const rejectBooking = (id: string) => Alert.alert('Reject', 'Reject this booking?', [{ text: 'Cancel' }, { text: 'Reject', style: 'destructive', onPress: async () => { try { await api.patch(`/creator/booking-requests/${id}`, { status: 'rejected' }); await load(); } catch {} } }]);
  const completeBooking = (id: string) => Alert.alert('Complete', 'Mark as completed?', [{ text: 'Cancel' }, { text: 'Complete', onPress: async () => { try { await api.patch(`/creator/bookings/${id}/complete`); await load(); } catch {} } }]);

  const getStatusColor = (s: string) => {
    if (s === 'Completed' || s === 'completed') return colors.success;
    if (s === 'Booking Created') return colors.warning;
    if (s === 'rejected' || s === 'cancelled') return colors.error;
    return colors.info;
  };

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const renderCard = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item._id;
    const totalPaid = item.advancePaid || 0;
    const remaining = (item.amount || 0) - totalPaid;
    const progress = item.amount > 0 ? Math.min(100, Math.round((totalPaid / item.amount) * 100)) : 0;
    const sc = getStatusColor(item.status);

    return (
      <View style={styles.card}>
        {/* ═══ COLLAPSED VIEW ═══ */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => toggleExpand(item._id)}>
          <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.clientName || 'Client'}</Text>
              <Text style={styles.cardMeta}>{item.eventType || 'Event'} • {item.eventDate ? new Date(item.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: sc + '15', borderColor: sc + '30' }]}>
              <Text style={[styles.badgeText, { color: sc }]} numberOfLines={1}>{item.status}</Text>
            </View>
          </View>

          {/* Financial Summary (always visible) */}
          <View style={styles.financialRow}>
            <View style={styles.finItem}><Text style={styles.finLabel}>Total</Text><Text style={styles.finValue}>₹{(item.amount || 0).toLocaleString('en-IN')}</Text></View>
            <View style={styles.finItem}><Text style={styles.finLabel}>Paid</Text><Text style={[styles.finValue, { color: colors.success }]}>₹{totalPaid.toLocaleString('en-IN')}</Text></View>
            <View style={styles.finItem}><Text style={styles.finLabel}>Due</Text><Text style={[styles.finValue, { color: remaining > 0 ? colors.warning : colors.success }]}>₹{Math.max(0, remaining).toLocaleString('en-IN')}</Text></View>
          </View>

          {/* Progress bar */}
          {item.amount > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}

          {/* Commission + Net */}
          {item.commissionAmount > 0 && (
            <View style={styles.commRow}>
              <Text style={styles.commText}>Commission ({item.commissionPercent || 5}%): <Text style={{ color: colors.error }}>-₹{item.commissionAmount.toLocaleString('en-IN')}</Text></Text>
              <Text style={styles.commText}>You receive: <Text style={{ color: colors.primary, fontWeight: '700' }}>₹{(item.creatorReceivable || 0).toLocaleString('en-IN')}</Text></Text>
            </View>
          )}

          {/* Payment status badge */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Ionicons name="card-outline" size={11} color={colors.textMuted} /><Text style={styles.metaText}>{item.paymentStatus || 'unpaid'}</Text></View>
            {item.eventLocation && <View style={styles.metaItem}><Ionicons name="location-outline" size={11} color={colors.textMuted} /><Text style={styles.metaText}>{item.eventLocation}</Text></View>}
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ═══ EXPANDED VIEW ═══ */}
        {isExpanded && (
          <View style={styles.expanded}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <ActionBtn icon="cash-outline" label="Set Amount" onPress={() => { setActiveBookingId(item._id); setAmountInput(String(item.amount || '')); setShowAmountModal(true); }} />
              <ActionBtn icon="card-outline" label="Record Pay" onPress={() => { setActiveBookingId(item._id); setShowPaymentModal(true); }} />
              <ActionBtn icon="checkmark-done" label="Mark Paid" onPress={() => markPaid(item._id)} />
              <ActionBtn icon="calendar-outline" label="Add Event" onPress={() => { setActiveBookingId(item._id); setShowEventModal(true); }} />
            </View>

            {/* Status Actions */}
            {item.status === 'Booking Created' && (
              <View style={styles.statusActions}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectBooking(item._id)}><Ionicons name="close" size={14} color={colors.error} /><Text style={styles.rejectText}>Reject</Text></TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => { setActiveBookingId(item._id); setAmountInput(String(item.budget || '')); setShowAmountModal(true); }}><Ionicons name="checkmark" size={14} color={colors.textInverse} /><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
              </View>
            )}
            {['Creator Accepted', 'Event Scheduled'].includes(item.status) && (
              <TouchableOpacity style={styles.completeBtn} onPress={() => completeBooking(item._id)}><Ionicons name="checkmark-done" size={14} color={colors.success} /><Text style={styles.completeText}>Mark Complete</Text></TouchableOpacity>
            )}

            {/* View Full Details */}
            <TouchableOpacity style={styles.detailsBtn} onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })}>
              <Text style={styles.detailsBtnText}>View Full Details</Text><Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.count}>{bookings.length}</Text>
      </View>

      <View style={styles.tabs}>
        {['all', 'pending', 'active', 'done', 'rejected'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListHeaderComponent={
            <View style={styles.searchWrap}><Ionicons name="search" size={16} color={colors.textMuted} /><TextInput style={styles.searchInput} placeholder="Search name, phone, city..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} selectionColor={colors.primary} />{searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}</View>
          }
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No bookings found</Text></View>}
          renderItem={renderCard}
        />
      )}

      {/* ═══ SET AMOUNT MODAL ═══ */}
      <Modal visible={showAmountModal} transparent animationType="fade">
        <View style={styles.modalBg}><View style={styles.modal}>
          <Text style={styles.modalTitle}>Set Project Amount</Text>
          <Text style={styles.modalSub}>Commission calculated on highest amount (never decreases)</Text>
          <TextInput style={styles.modalInput} value={amountInput} onChangeText={setAmountInput} keyboardType="numeric" placeholder="₹ Amount" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} autoFocus />
          {parseInt(amountInput) > 0 && <Text style={styles.modalCalc}>Commission (5%): ₹{Math.round(parseInt(amountInput) * 0.05).toLocaleString('en-IN')} • You: ₹{Math.round(parseInt(amountInput) * 0.95).toLocaleString('en-IN')}</Text>}
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAmountModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} onPress={() => { const b = bookings.find(x => x._id === activeBookingId); b?.status === 'Booking Created' ? acceptBooking() : setProjectAmount(); }}><Text style={styles.modalConfirmText}>{bookings.find(x => x._id === activeBookingId)?.status === 'Booking Created' ? 'Accept' : 'Save'}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* ═══ RECORD PAYMENT MODAL ═══ */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.modalBg}><View style={styles.modal}>
          <Text style={styles.modalTitle}>Record Payment</Text>
          <View style={styles.payTypeRow}>{['advance', 'partial', 'final'].map(t => (<TouchableOpacity key={t} style={[styles.payTypeBtn, payForm.type === t && styles.payTypeBtnActive]} onPress={() => setPayForm({ ...payForm, type: t })}><Text style={[styles.payTypeText, payForm.type === t && styles.payTypeTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text></TouchableOpacity>))}</View>
          <TextInput style={styles.modalInput} value={payForm.amount} onChangeText={v => setPayForm({ ...payForm, amount: v })} keyboardType="numeric" placeholder="₹ Amount" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <TextInput style={[styles.modalInput, { height: 50 }]} value={payForm.notes} onChangeText={v => setPayForm({ ...payForm, notes: v })} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} multiline />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPaymentModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} onPress={recordPayment}><Text style={styles.modalConfirmText}>Record</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* ═══ ADD EVENT MODAL ═══ */}
      <Modal visible={showEventModal} transparent animationType="fade">
        <View style={styles.modalBg}><View style={styles.modal}>
          <Text style={styles.modalTitle}>Add Event</Text>
          <TextInput style={styles.modalInput} value={eventForm.name} onChangeText={v => setEventForm({ ...eventForm, name: v })} placeholder="Event name (e.g. Haldi)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <TextInput style={styles.modalInput} value={eventForm.date} onChangeText={v => setEventForm({ ...eventForm, date: v })} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <TextInput style={styles.modalInput} value={eventForm.location} onChangeText={v => setEventForm({ ...eventForm, location: v })} placeholder="Location (optional)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEventModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} onPress={addEvent}><Text style={styles.modalConfirmText}>Add</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

function ActionBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.actionBtn} onPress={onPress}><Ionicons name={icon as any} size={16} color={colors.primary} /><Text style={styles.actionLabel}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  count: { ...typography.labelMd, color: colors.primary, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelSm, color: colors.textMuted, fontSize: 9 },
  tabTextActive: { color: colors.primary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 40, gap: spacing.sm, marginBottom: spacing.lg },
  searchInput: { flex: 1, ...typography.bodySm, color: colors.text, height: '100%' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardInfo: { flex: 1, marginRight: spacing.sm },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1, maxWidth: 110 },
  badgeText: { ...typography.labelSm, fontWeight: '600', fontSize: 9 },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  finItem: { alignItems: 'center', flex: 1 },
  finLabel: { ...typography.caption, color: colors.textMuted },
  finValue: { ...typography.labelLg, color: colors.text, fontWeight: '700', marginTop: 1 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressBar: { flex: 1, height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: colors.success, borderRadius: 3 },
  progressText: { ...typography.labelSm, color: colors.textMuted, width: 30 },
  commRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  commText: { ...typography.caption, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  expanded: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2, backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, gap: 2 },
  actionLabel: { ...typography.labelSm, color: colors.textSecondary, fontSize: 9 },
  statusActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.primary },
  acceptText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', marginBottom: spacing.md },
  completeText: { ...typography.labelMd, color: colors.success, fontWeight: '600' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold },
  detailsBtnText: { ...typography.labelMd, color: colors.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.xs },
  modalSub: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xl },
  modalInput: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, marginBottom: spacing.md },
  modalCalc: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  modalCancel: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { ...typography.labelLg, color: colors.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  modalConfirmText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  payTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  payTypeBtn: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  payTypeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  payTypeText: { ...typography.labelMd, color: colors.textMuted },
  payTypeTextActive: { color: colors.primary },
});
