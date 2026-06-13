import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function BookingDetail({ route, navigation }: any) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [payForm, setPayForm] = useState({ amount: '', type: 'advance', notes: '' });
  const [eventForm, setEventForm] = useState({ name: '', date: '', location: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const [bookingRes, paymentsRes, eventsRes] = await Promise.all([
        api.get('/creator/booking-requests'),
        api.get(`/payment-records/booking/${bookingId}`).catch(() => ({ data: { records: [] } })),
        api.get(`/booking-events/booking/${bookingId}`).catch(() => ({ data: { events: [] } })),
      ]);
      const b = (bookingRes.data?.bookings || []).find((x: any) => x._id === bookingId);
      if (b) setBooking(b);
      setPaymentRecords(paymentsRes.data?.records || paymentsRes.data?.data || []);
      setEvents(eventsRes.data?.events || eventsRes.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ═══ SET AMOUNT (same as website: highest-amount-wins commission logic) ═══
  const setProjectAmount = async () => {
    const amount = parseInt(amountInput);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Invalid amount'); return; }
    try {
      await api.patch(`/payment-records/booking/${bookingId}/amount`, { amount });
      setShowAmountModal(false);
      await load();
      Alert.alert('Amount Set', `Project amount set to ₹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to set amount'); }
  };

  // ═══ RECORD PAYMENT (same as website: advance/partial/final) ═══
  const recordPayment = async () => {
    const amount = parseInt(payForm.amount);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    try {
      await api.post('/payment-records/creator', {
        bookingId,
        amount,
        paymentType: payForm.type,
        notes: payForm.notes,
      });
      setShowPaymentModal(false);
      setPayForm({ amount: '', type: 'advance', notes: '' });
      await load();
      Alert.alert('Recorded', `₹${amount.toLocaleString('en-IN')} ${payForm.type} payment recorded`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to record payment'); }
  };

  // ═══ MARK PAID (same as website) ═══
  const markPaid = () => Alert.alert('Mark Fully Paid', 'Mark this booking as fully paid?', [
    { text: 'Cancel' },
    { text: 'Mark Paid', onPress: async () => {
      try { await api.patch(`/payment-records/booking/${bookingId}/mark-paid`); await load(); Alert.alert('Done', 'Booking marked as fully paid'); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  // ═══ ACCEPT (with amount) ═══
  const acceptBooking = async () => {
    const amount = parseInt(amountInput);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter booking amount'); return; }
    try {
      await api.patch(`/creator/booking-requests/${bookingId}`, { status: 'Creator Accepted', amount });
      setShowAmountModal(false);
      await load();
      Alert.alert('Accepted', `Booking accepted for ₹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  // ═══ REJECT ═══
  const rejectBooking = () => Alert.alert('Reject', 'Reject this booking?', [
    { text: 'Cancel' },
    { text: 'Reject', style: 'destructive', onPress: async () => {
      try { await api.patch(`/creator/booking-requests/${bookingId}`, { status: 'rejected' }); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  // ═══ COMPLETE ═══
  const completeBooking = () => Alert.alert('Complete', 'Mark as completed?', [
    { text: 'Cancel' },
    { text: 'Complete', onPress: async () => {
      try { await api.patch(`/creator/bookings/${bookingId}/complete`); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  // ═══ ADD EVENT ═══
  const addEvent = async () => {
    if (!eventForm.name || !eventForm.date) { Alert.alert('Error', 'Event name and date are required'); return; }
    try {
      await api.post('/booking-events', { bookingId, eventName: eventForm.name, eventDate: eventForm.date, location: eventForm.location, notes: eventForm.notes });
      setShowEventModal(false);
      setEventForm({ name: '', date: '', location: '', notes: '' });
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  // ═══ DELETE EVENT ═══
  const deleteEvent = (id: string) => Alert.alert('Delete Event', 'Remove this event?', [
    { text: 'Cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/booking-events/${id}`); await load(); } catch {} }}
  ]);

  // ═══ CONTACT ═══
  const callCustomer = () => booking?.clientPhone && Linking.openURL(`tel:${booking.clientPhone}`);
  const whatsApp = () => booking?.clientPhone && Linking.openURL(`https://wa.me/91${booking.clientPhone.replace(/\D/g, '').slice(-10)}`);

  if (loading || !booking) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const totalPaid = paymentRecords.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount || 0), 0);
  const remaining = (booking.amount || 0) - totalPaid;
  const progress = booking.amount > 0 ? Math.min(100, Math.round((totalPaid / booking.amount) * 100)) : 0;
  const statusColor = booking.status === 'Completed' ? colors.success : booking.status === 'rejected' ? colors.error : booking.status === 'Booking Created' ? colors.warning : colors.info;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{booking.clientName || 'Booking'}</Text>
        <View style={[s.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}><Text style={[s.statusText, { color: statusColor }]}>{booking.status}</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ═══ PAYMENT DASHBOARD ═══ */}
        <View style={s.payDash}>
          <View style={s.payRow}><Text style={s.payLabel}>Total</Text><Text style={s.payVal}>₹{(booking.amount || 0).toLocaleString('en-IN')}</Text></View>
          <View style={s.payRow}><Text style={s.payLabel}>Paid</Text><Text style={[s.payVal, { color: colors.success }]}>₹{totalPaid.toLocaleString('en-IN')}</Text></View>
          <View style={s.payRow}><Text style={s.payLabel}>Remaining</Text><Text style={[s.payVal, { color: remaining > 0 ? colors.warning : colors.success }]}>₹{Math.max(0, remaining).toLocaleString('en-IN')}</Text></View>
          {/* Progress bar */}
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={s.progressText}>{progress}% paid</Text>
          <View style={s.payRow}><Text style={s.payLabel}>Commission ({booking.commissionPercent || 0}%)</Text><Text style={[s.payVal, { color: colors.error, fontSize: 13 }]}>-₹{(booking.commissionAmount || 0).toLocaleString('en-IN')}</Text></View>
          <View style={s.payRow}><Text style={[s.payLabel, { fontWeight: '600' }]}>Net Receivable</Text><Text style={[s.payVal, { color: colors.primary }]}>₹{(booking.creatorReceivable || 0).toLocaleString('en-IN')}</Text></View>
        </View>

        {/* ═══ QUICK ACTIONS ═══ */}
        <View style={s.actionsRow}>
          <ActionBtn icon="cash-outline" label="Set Amount" onPress={() => { setAmountInput(String(booking.amount || '')); setShowAmountModal(true); }} />
          <ActionBtn icon="card-outline" label="Record Pay" onPress={() => setShowPaymentModal(true)} />
          <ActionBtn icon="checkmark-done" label="Mark Paid" onPress={markPaid} />
          <ActionBtn icon="calendar-outline" label="Add Event" onPress={() => setShowEventModal(true)} />
        </View>

        {/* ═══ CUSTOMER ═══ */}
        <Section title="Customer">
          <Row label="Name" value={booking.clientName || '—'} />
          <Row label="Phone" value={booking.clientPhone || '—'} />
          <Row label="Email" value={booking.clientEmail || '—'} />
          <View style={s.contactRow}>
            <TouchableOpacity style={s.contactBtn} onPress={callCustomer}><Ionicons name="call" size={15} color={colors.info} /><Text style={s.contactText}>Call</Text></TouchableOpacity>
            <TouchableOpacity style={s.contactBtn} onPress={whatsApp}><Ionicons name="logo-whatsapp" size={15} color={colors.success} /><Text style={s.contactText}>WhatsApp</Text></TouchableOpacity>
          </View>
        </Section>

        {/* ═══ EVENT ═══ */}
        <Section title="Event Details">
          <Row label="Type" value={booking.eventType || '—'} />
          <Row label="Date" value={booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
          {booking.eventTime && <Row label="Time" value={booking.eventTime} />}
          <Row label="Location" value={booking.eventLocation || booking.scheduledLocation || '—'} />
          <Row label="Package" value={booking.packageName || 'Standard'} />
          <Row label="Source" value={booking.leadSource || 'bookmyshot'} />
          <Row label="Invoice" value={booking.invoiceNumber || '—'} />
        </Section>

        {/* ═══ PAYMENT HISTORY ═══ */}
        <Section title={`Payment History (${paymentRecords.length})`}>
          {paymentRecords.length > 0 ? paymentRecords.map((r, i) => (
            <View key={r._id || i} style={s.payRecord}>
              <View style={s.payRecordLeft}>
                <Text style={s.payRecordType}>{r.paymentType || 'Payment'}</Text>
                <Text style={s.payRecordDate}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''} • {r.addedBy || 'creator'}</Text>
                {r.notes && <Text style={s.payRecordNotes}>{r.notes}</Text>}
              </View>
              <View style={s.payRecordRight}>
                <Text style={s.payRecordAmount}>₹{(r.amount || 0).toLocaleString('en-IN')}</Text>
                <Text style={[s.payRecordStatus, { color: r.status === 'approved' ? colors.success : colors.warning }]}>{r.status}</Text>
              </View>
            </View>
          )) : <Text style={s.emptyText}>No payments recorded yet</Text>}
        </Section>

        {/* ═══ EVENTS ═══ */}
        <Section title={`Events (${events.length})`}>
          {events.length > 0 ? events.map((ev, i) => (
            <View key={ev._id || i} style={s.eventItem}>
              <View style={s.eventDot} />
              <View style={s.eventInfo}>
                <Text style={s.eventName}>{ev.eventName || 'Event'}</Text>
                <Text style={s.eventDate}>{ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} {ev.location ? `• ${ev.location}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteEvent(ev._id)}><Ionicons name="trash-outline" size={14} color={colors.error} /></TouchableOpacity>
            </View>
          )) : <Text style={s.emptyText}>No events added yet</Text>}
        </Section>

        {/* ═══ NOTES ═══ */}
        {booking.message && <Section title="Client Message"><Text style={s.messageText}>"{booking.message}"</Text></Section>}
        {booking.creatorNotes && <Section title="Creator Notes"><Text style={s.messageText}>{booking.creatorNotes}</Text></Section>}
      </ScrollView>

      {/* ═══ BOTTOM ACTIONS ═══ */}
      <View style={s.bottomBar}>
        {booking.status === 'Booking Created' && <>
          <TouchableOpacity style={s.btnReject} onPress={rejectBooking}><Text style={s.btnRejectText}>Reject</Text></TouchableOpacity>
          <TouchableOpacity style={s.btnAccept} onPress={() => { setAmountInput(String(booking.amount || booking.budget || '')); setShowAmountModal(true); }}><Text style={s.btnAcceptText}>Accept</Text></TouchableOpacity>
        </>}
        {['Creator Accepted', 'Event Scheduled'].includes(booking.status) && <TouchableOpacity style={s.btnComplete} onPress={completeBooking}><Text style={s.btnCompleteText}>Mark Complete</Text></TouchableOpacity>}
      </View>

      {/* ═══ SET AMOUNT MODAL ═══ */}
      <Modal visible={showAmountModal} transparent animationType="fade">
        <View style={s.modalBg}><View style={s.modal}>
          <Text style={s.modalTitle}>{booking.status === 'Booking Created' ? 'Accept & Set Amount' : 'Update Project Amount'}</Text>
          <Text style={s.modalSub}>Commission is calculated on highest amount ever set (never decreases)</Text>
          <TextInput style={s.modalInput} value={amountInput} onChangeText={setAmountInput} keyboardType="numeric" placeholder="₹ Amount" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} autoFocus />
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowAmountModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.modalConfirm} onPress={booking.status === 'Booking Created' ? acceptBooking : setProjectAmount}><Text style={s.modalConfirmText}>{booking.status === 'Booking Created' ? 'Accept' : 'Save'}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* ═══ RECORD PAYMENT MODAL ═══ */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={s.modalBg}><View style={s.modal}>
          <Text style={s.modalTitle}>Record Payment</Text>
          <View style={s.payTypeRow}>
            {['advance', 'partial', 'final'].map(t => (
              <TouchableOpacity key={t} style={[s.payTypeBtn, payForm.type === t && s.payTypeBtnActive]} onPress={() => setPayForm({ ...payForm, type: t })}>
                <Text style={[s.payTypeText, payForm.type === t && s.payTypeTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={s.modalInput} value={payForm.amount} onChangeText={v => setPayForm({ ...payForm, amount: v })} keyboardType="numeric" placeholder="₹ Amount" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <TextInput style={[s.modalInput, { height: 60 }]} value={payForm.notes} onChangeText={v => setPayForm({ ...payForm, notes: v })} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} multiline />
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowPaymentModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.modalConfirm} onPress={recordPayment}><Text style={s.modalConfirmText}>Record</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* ═══ ADD EVENT MODAL ═══ */}
      <Modal visible={showEventModal} transparent animationType="fade">
        <View style={s.modalBg}><View style={s.modal}>
          <Text style={s.modalTitle}>Add Event</Text>
          <TextInput style={s.modalInput} value={eventForm.name} onChangeText={v => setEventForm({ ...eventForm, name: v })} placeholder="Event name (e.g. Haldi, Wedding)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <TextInput style={s.modalInput} value={eventForm.date} onChangeText={v => setEventForm({ ...eventForm, date: v })} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <TextInput style={s.modalInput} value={eventForm.location} onChangeText={v => setEventForm({ ...eventForm, location: v })} placeholder="Location (optional)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <TextInput style={[s.modalInput, { height: 60 }]} value={eventForm.notes} onChangeText={v => setEventForm({ ...eventForm, notes: v })} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} multiline />
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowEventModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.modalConfirm} onPress={addEvent}><Text style={s.modalConfirmText}>Add</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text><View style={s.sectionCard}>{children}</View></View>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue} numberOfLines={1}>{value}</Text></View>;
}
function ActionBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <TouchableOpacity style={s.actionBtn} onPress={onPress}><Ionicons name={icon as any} size={18} color={colors.primary} /><Text style={s.actionLabel}>{label}</Text></TouchableOpacity>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineMd, color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 1, borderRadius: radius.full, borderWidth: 1 },
  statusText: { ...typography.labelSm, fontWeight: '700', fontSize: 9 },
  payDash: { marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderGold, marginBottom: spacing.lg },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs + 2 },
  payLabel: { ...typography.bodySm, color: colors.textSecondary },
  payVal: { ...typography.headlineSm, color: colors.text },
  progressBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: spacing.md, marginBottom: spacing.xs, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.success, borderRadius: 3 },
  progressText: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  actionsRow: { flexDirection: 'row', marginHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xl },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  actionLabel: { ...typography.labelSm, color: colors.textSecondary },
  section: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.bodySm, color: colors.textMuted, width: 80 },
  rowValue: { ...typography.bodyMd, color: colors.text, flex: 1, textAlign: 'right' },
  contactRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  contactText: { ...typography.labelMd, color: colors.text },
  payRecord: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  payRecordLeft: { flex: 1 },
  payRecordType: { ...typography.labelMd, color: colors.text, textTransform: 'capitalize' },
  payRecordDate: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  payRecordNotes: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  payRecordRight: { alignItems: 'flex-end' },
  payRecordAmount: { ...typography.headlineSm, color: colors.success },
  payRecordStatus: { ...typography.labelSm, marginTop: 1 },
  eventItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: spacing.md },
  eventInfo: { flex: 1 },
  eventName: { ...typography.labelLg, color: colors.text },
  eventDate: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  messageText: { ...typography.bodyMd, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, paddingBottom: spacing['2xl'], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  btnReject: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  btnRejectText: { ...typography.labelLg, color: colors.error },
  btnAccept: { flex: 2, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  btnAcceptText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  btnComplete: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.success },
  btnCompleteText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.xs },
  modalSub: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 16 },
  modalInput: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, marginBottom: spacing.md },
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
