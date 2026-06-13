import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function BookingDetail({ route, navigation }: any) {
  const { booking: initialBooking } = route.params;
  const [booking, setBooking] = useState(initialBooking);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [amountInput, setAmountInput] = useState(String(booking.amount || booking.budget || ''));
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(booking.creatorNotes || '');

  const refresh = async () => {
    try {
      const res = await api.get('/creator/booking-requests');
      const updated = (res.data?.bookings || []).find((b: any) => b._id === booking._id);
      if (updated) setBooking(updated);
    } catch {}
  };

  // ═══ ACTIONS ═══
  const handleAccept = () => { setAmountInput(String(booking.amount || booking.budget || '')); setShowAmountModal(true); };

  const confirmAccept = async () => {
    const amount = parseInt(amountInput) || 0;
    if (amount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    try {
      await api.patch(`/creator/booking-requests/${booking._id}`, { status: 'Creator Accepted', amount });
      await refresh();
      setShowAmountModal(false);
      Alert.alert('Accepted', `Booking accepted for ₹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const handleReject = () => Alert.alert('Reject Booking', 'Are you sure?', [
    { text: 'Cancel' },
    { text: 'Reject', style: 'destructive', onPress: async () => {
      try { await api.patch(`/creator/booking-requests/${booking._id}`, { status: 'rejected' }); await refresh(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const handleComplete = () => Alert.alert('Complete', 'Mark this booking as completed?', [
    { text: 'Cancel' },
    { text: 'Complete', onPress: async () => {
      try { await api.patch(`/creator/bookings/${booking._id}/complete`); await refresh(); Alert.alert('Done', 'Booking completed'); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const handleCancel = () => Alert.alert('Cancel Booking', 'This cannot be undone.', [
    { text: 'Back' },
    { text: 'Cancel Booking', style: 'destructive', onPress: async () => {
      try { await api.patch(`/creator/booking-requests/${booking._id}`, { status: 'cancelled' }); await refresh(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const saveNotes = async () => {
    try {
      await api.patch(`/creator/booking-requests/${booking._id}`, { status: booking.status, creatorNotes: notes });
      setEditingNotes(false);
      await refresh();
    } catch {}
  };

  const callCustomer = () => { if (booking.clientPhone) Linking.openURL(`tel:${booking.clientPhone}`); };
  const whatsApp = () => { if (booking.clientPhone) Linking.openURL(`https://wa.me/91${booking.clientPhone.replace(/\D/g, '').slice(-10)}`); };

  const getStatusColor = (s: string) => {
    if (s === 'Completed' || s === 'completed') return colors.success;
    if (s === 'Booking Created') return colors.warning;
    if (s === 'rejected' || s === 'cancelled') return colors.error;
    return colors.info;
  };

  // ═══ TIMELINE ═══
  const getTimeline = () => {
    const steps = [
      { label: 'Inquiry Received', done: true, date: booking.createdAt },
      { label: 'Creator Accepted', done: ['Creator Accepted', 'Payment Submitted', 'Payment Approved', 'Event Scheduled', 'Completed', 'completed'].includes(booking.status) },
      { label: 'Payment Received', done: booking.paymentStatus === 'paid' || booking.paymentStatus === 'verified' || booking.advancePaid > 0 },
      { label: 'Event Completed', done: booking.status === 'Completed' || booking.status === 'completed' },
    ];
    return steps;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Booking Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '15', borderColor: getStatusColor(booking.status) + '30' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{booking.status}</Text>
          </View>
          <Text style={styles.invoiceNum}>{booking.invoiceNumber || ''}</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.sectionCard}>
            <InfoRow icon="person-outline" label="Name" value={booking.clientName || '—'} />
            <InfoRow icon="call-outline" label="Phone" value={booking.clientPhone || '—'} />
            <InfoRow icon="mail-outline" label="Email" value={booking.clientEmail || '—'} />
          </View>
          <View style={styles.contactActions}>
            <TouchableOpacity style={styles.contactBtn} onPress={callCustomer}><Ionicons name="call" size={16} color={colors.info} /><Text style={styles.contactText}>Call</Text></TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn} onPress={whatsApp}><Ionicons name="logo-whatsapp" size={16} color={colors.success} /><Text style={styles.contactText}>WhatsApp</Text></TouchableOpacity>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event</Text>
          <View style={styles.sectionCard}>
            <InfoRow icon="camera-outline" label="Type" value={booking.eventType || '—'} />
            <InfoRow icon="calendar-outline" label="Date" value={booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
            {booking.eventTime && <InfoRow icon="time-outline" label="Time" value={booking.eventTime} />}
            <InfoRow icon="location-outline" label="Location" value={booking.eventLocation || booking.scheduledLocation || '—'} />
            <InfoRow icon="briefcase-outline" label="Package" value={booking.packageName || 'Standard'} />
            <InfoRow icon="megaphone-outline" label="Lead Source" value={booking.leadSource || 'bookmyshot'} />
          </View>
        </View>

        {/* Payment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}><Text style={styles.payLabel}>Total Amount</Text><Text style={styles.payValue}>₹{(booking.amount || 0).toLocaleString('en-IN')}</Text></View>
            <View style={styles.paymentRow}><Text style={styles.payLabel}>Advance Paid</Text><Text style={[styles.payValue, { color: colors.success }]}>₹{(booking.advancePaid || 0).toLocaleString('en-IN')}</Text></View>
            <View style={styles.paymentRow}><Text style={styles.payLabel}>Remaining</Text><Text style={[styles.payValue, { color: colors.warning }]}>₹{(booking.remaining || (booking.amount - (booking.advancePaid || 0)) || 0).toLocaleString('en-IN')}</Text></View>
            <View style={styles.divider} />
            <View style={styles.paymentRow}><Text style={styles.payLabel}>Commission ({booking.commissionPercent || 0}%)</Text><Text style={[styles.payValue, { color: colors.error }]}>-₹{(booking.commissionAmount || 0).toLocaleString('en-IN')}</Text></View>
            <View style={styles.paymentRow}><Text style={[styles.payLabel, { fontWeight: '600' }]}>Net Earnings</Text><Text style={[styles.payValue, { color: colors.primary, fontWeight: '700' }]}>₹{(booking.creatorReceivable || 0).toLocaleString('en-IN')}</Text></View>
            <View style={styles.divider} />
            <View style={styles.paymentRow}><Text style={styles.payLabel}>Payment Status</Text><Text style={[styles.payValue, { textTransform: 'capitalize' }]}>{booking.paymentStatus || 'unpaid'}</Text></View>
            <View style={styles.paymentRow}><Text style={styles.payLabel}>Commission Status</Text><Text style={styles.payValue}>{booking.commissionStatus || '—'}</Text></View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timeline}>
            {getTimeline().map((step, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={[styles.timelineDot, step.done && styles.timelineDotDone]} />
                {i < 3 && <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />}
                <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TouchableOpacity onPress={() => editingNotes ? saveNotes() : setEditingNotes(true)}>
              <Text style={styles.editLink}>{editingNotes ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          {editingNotes ? (
            <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} multiline placeholder="Add notes..." placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          ) : (
            <Text style={styles.notesText}>{booking.creatorNotes || booking.message || 'No notes'}</Text>
          )}
        </View>

        {/* Client Message */}
        {booking.message && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Message</Text>
            <Text style={styles.clientMessage}>"{booking.message}"</Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <View style={styles.bottomBar}>
        {booking.status === 'Booking Created' && <>
          <TouchableOpacity style={styles.bottomReject} onPress={handleReject}><Text style={styles.bottomRejectText}>Reject</Text></TouchableOpacity>
          <TouchableOpacity style={styles.bottomAccept} onPress={handleAccept}><Text style={styles.bottomAcceptText}>Accept Booking</Text></TouchableOpacity>
        </>}
        {['Creator Accepted', 'Payment Submitted', 'Payment Approved', 'Event Scheduled'].includes(booking.status) && <>
          <TouchableOpacity style={styles.bottomCancel} onPress={handleCancel}><Text style={styles.bottomCancelText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={styles.bottomComplete} onPress={handleComplete}><Text style={styles.bottomCompleteText}>Mark Complete</Text></TouchableOpacity>
        </>}
      </View>

      {/* Amount Modal */}
      <Modal visible={showAmountModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Booking Amount</Text>
            <Text style={styles.modalSubtitle}>Commission is calculated on this amount (highest amount rule applies)</Text>
            <TextInput style={styles.modalInput} value={amountInput} onChangeText={setAmountInput} keyboardType="numeric" placeholder="₹ Amount" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} autoFocus />
            {parseInt(amountInput) > 0 && (
              <View style={styles.modalCalc}>
                <Text style={styles.calcRow}>Commission (5%): <Text style={{ color: colors.error }}>₹{Math.round(parseInt(amountInput) * 0.05).toLocaleString('en-IN')}</Text></Text>
                <Text style={styles.calcRow}>You receive: <Text style={{ color: colors.success }}>₹{Math.round(parseInt(amountInput) * 0.95).toLocaleString('en-IN')}</Text></Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAmountModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmAccept}><Text style={styles.modalConfirmText}>Accept</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={14} color={colors.textMuted} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 1, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { ...typography.bodySm, color: colors.textMuted, width: 80, marginLeft: spacing.sm },
  value: { ...typography.bodyMd, color: colors.text, flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  statusSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  statusBadge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1 },
  statusText: { ...typography.labelLg, fontWeight: '700', textTransform: 'capitalize' },
  invoiceNum: { ...typography.caption, color: colors.textMuted },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  contactActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  contactText: { ...typography.labelMd, color: colors.text },
  paymentCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderGold },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  payLabel: { ...typography.bodySm, color: colors.textSecondary },
  payValue: { ...typography.bodyMd, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  timeline: { paddingLeft: spacing.sm },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg, position: 'relative' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, marginRight: spacing.md, marginTop: 2 },
  timelineDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineLine: { position: 'absolute', left: 5, top: 14, width: 2, height: 24, backgroundColor: colors.border },
  timelineLineDone: { backgroundColor: colors.primary },
  timelineLabel: { ...typography.bodyMd, color: colors.textMuted },
  timelineLabelDone: { color: colors.text, fontWeight: '500' },
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editLink: { ...typography.labelMd, color: colors.primary },
  notesInput: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary + '40', padding: spacing.lg, ...typography.bodyMd, color: colors.text, minHeight: 80, textAlignVertical: 'top' },
  notesText: { ...typography.bodyMd, color: colors.textSecondary, lineHeight: 20 },
  clientMessage: { ...typography.bodyMd, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, paddingBottom: spacing['2xl'], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  bottomReject: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  bottomRejectText: { ...typography.labelLg, color: colors.error, fontWeight: '600' },
  bottomAccept: { flex: 2, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  bottomAcceptText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  bottomCancel: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  bottomCancelText: { ...typography.labelLg, color: colors.textSecondary },
  bottomComplete: { flex: 2, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.success },
  bottomCompleteText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 18 },
  modalInput: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary + '40', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, ...typography.displaySm, color: colors.primary, textAlign: 'center' },
  modalCalc: { marginTop: spacing.lg, alignItems: 'center' },
  calcRow: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing['2xl'] },
  modalCancel: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { ...typography.labelLg, color: colors.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  modalConfirmText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
});
