import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import { buildInvoiceHTML } from '../../utils/buildInvoice';

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
  const [savingPayment, setSavingPayment] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false); // Shows Mark Complete after Mark Paid with due > 0

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

  // â•â•â• SET AMOUNT (same as website: highest-amount-wins commission logic) â•â•â•
  const setProjectAmount = async () => {
    const amount = Number(amountInput);
    if (!amount || amount <= 0 || isNaN(amount)) { Alert.alert('Invalid Amount', 'Please enter a valid amount'); return; }
    try {
      console.log('[Payment] Setting amount:', { bookingId, amount });
      const res = await api.patch(`/payment-records/booking/${bookingId}/amount`, { amount });
      console.log('[Payment] Amount set response:', res.data?.booking?.amount);
      setShowAmountModal(false);
      await load();
      Alert.alert('Amount Set', `Project amount set to â‚¹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) {
      console.log('[Payment] Set amount error:', e.response?.status, e.response?.data);
      Alert.alert('Failed', e.response?.data?.message || 'Failed to set amount');
    }
  };

  // â•â•â• RECORD PAYMENT (same as website: advance/partial/final) â•â•â•
  const recordPayment = async () => {
    if (savingPayment) return; // Prevent double-clicks
    
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0 || isNaN(amount)) { Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0'); return; }
    
    // Client-side validation: check against remaining
    const bookingTotal = booking.amount || 0;
    if (bookingTotal > 0) {
      const alreadyPaid = paymentRecords.filter(r => r.status === 'approved').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      if (alreadyPaid + amount > bookingTotal) {
        const maxAllowed = Math.max(0, bookingTotal - alreadyPaid);
        Alert.alert('Amount Exceeds Limit', `Booking total: â‚¹${bookingTotal.toLocaleString('en-IN')}\nAlready paid: â‚¹${alreadyPaid.toLocaleString('en-IN')}\nMaximum allowed: â‚¹${maxAllowed.toLocaleString('en-IN')}`);
        return;
      }
    }
    
    if (bookingTotal <= 0) {
      Alert.alert('Set Amount First', 'Please set the booking deal amount before recording payments.');
      return;
    }

    setSavingPayment(true);
    try {
      console.log('[Payment] Recording:', { bookingId, amount, type: payForm.type, notes: payForm.notes });
      const res = await api.post('/payment-records/creator', {
        bookingId,
        amount,
        paymentType: payForm.type,
        notes: payForm.notes,
      });
      console.log('[Payment] Success:', res.data);
      setShowPaymentModal(false);
      setPayForm({ amount: '', type: 'advance', notes: '' });
      await load();
      Alert.alert('Recorded', `â‚¹${amount.toLocaleString('en-IN')} ${payForm.type} payment recorded successfully`);
    } catch (e: any) {
      console.log('[Payment] Error:', e.response?.status, e.response?.data);
      const msg = e.response?.data?.message || e.message || 'Network error';
      Alert.alert('Payment Failed', msg);
    } finally {
      setSavingPayment(false);
    }
  };

  // â•â•â• MARK PAID â€” just a UI confirmation step, does NOT change backend data â•â•â•
  const markPaid = () => {
    // Simply switch to pending complete state â€” shows Mark Complete + Cancel
    setPendingComplete(true);
  };

  // â•â•â• CANCEL PENDING COMPLETE (go back to payment buttons) â•â•â•
  const cancelPendingComplete = () => setPendingComplete(false);

  // â•â•â• ACCEPT (with amount) â•â•â•
  const acceptBooking = async () => {
    const amount = Number(amountInput);
    if (!amount || amount <= 0 || isNaN(amount)) { Alert.alert('Invalid Amount', 'Please enter the booking amount'); return; }
    try {
      console.log('[Booking] Accepting:', { bookingId, amount });
      await api.patch(`/creator/booking-requests/${bookingId}`, { status: 'Creator Accepted', amount });
      setShowAmountModal(false);
      await load();
      Alert.alert('Accepted', `Booking accepted for â‚¹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) {
      console.log('[Booking] Accept error:', e.response?.status, e.response?.data);
      Alert.alert('Failed', e.response?.data?.message || 'Failed to accept booking');
    }
  };

  // â•â•â• REJECT â•â•â•
  const rejectBooking = () => Alert.alert('Reject', 'Reject this booking?', [
    { text: 'Cancel' },
    { text: 'Reject', style: 'destructive', onPress: async () => {
      try { await api.patch(`/creator/booking-requests/${bookingId}`, { status: 'rejected' }); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  // â•â•â• COMPLETE â€” called only after Mark Paid â†’ Mark Complete confirmation â•â•â•
  const completeBooking = () => {
    if (completing) return;
    Alert.alert('Complete Booking', 'This will mark the booking as fully paid and completed. Payment records will be locked and an invoice will be generated.', [
      { text: 'Cancel' },
      { text: 'Complete', onPress: async () => {
        setCompleting(true);
        try {
          // Mark as paid in backend (sets remaining to 0)
          await api.patch(`/payment-records/booking/${bookingId}/mark-paid`);
          // Then complete the booking
          await api.patch(`/creator/bookings/${bookingId}/complete`);
          await load();
          setPendingComplete(false);
          Alert.alert('Done! ðŸŽ‰', 'Booking completed. Invoice is ready for download.');
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to complete booking');
        } finally {
          setCompleting(false);
        }
      }}
    ]);
  };

  // ═══ DOWNLOAD INVOICE ═══
  const downloadInvoice = async () => {
    try {
      const html = buildInvoiceHTML(booking, paymentRecords, false);
      if (!html) { Alert.alert('Error', 'Booking data not loaded yet'); return; }
      const Print = require('expo-print');
      await Print.printAsync({ html });
    } catch (e: any) {
      console.log('[Invoice] Download error:', e.message);
      Alert.alert('Error', 'Failed to download invoice. Please try again.');
    }
  };

  // â•â•â• DOWNLOAD PARTIAL PAYMENT RECEIPT â•â•â•
  const downloadPartialInvoice = async () => {
    try {
      const html = buildInvoiceHTML(booking, paymentRecords, true);
      if (!html) { Alert.alert('Error', 'Booking data not loaded yet'); return; }
      const Print = require('expo-print');
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to download payment receipt.');
    }
  };
  // â•â•â• SEND INVOICE PDF VIA SHARE SHEET (WhatsApp etc.) â•â•â•
  const shareInvoicePDF = async () => {
    try {
      let html = buildInvoiceHTML(booking, paymentRecords, false);
      if (!html) { Alert.alert('Error', 'Booking data not loaded yet'); return; }

      let Print: any = null;
      let Sharing: any = null;
      try {
        Print = require('expo-print');
        Sharing = require('expo-sharing');
      } catch {
        Alert.alert('Error', 'PDF module not available.');
        return;
      }

      if (!Print?.printToFileAsync) {
        Alert.alert('Error', 'PDF generation not supported in this build.');
        return;
      }

      let pdfResult: any = null;
      try {
        pdfResult = await Print.printToFileAsync({ html, base64: false });
      } catch (pdfErr: any) {
        Alert.alert('PDF Error', 'Failed to generate PDF: ' + (pdfErr.message || 'Unknown error'));
        return;
      }

      if (!pdfResult || !pdfResult.uri) {
        Alert.alert('PDF Error', 'PDF was generated but file path is invalid.');
        return;
      }
      console.log('[Invoice] Step 4: PDF generated âœ… at:', pdfResult.uri);

      // Step 5: Share the PDF
      if (!Sharing?.shareAsync) {
        // No sharing API â€” open WhatsApp with booking link as fallback
        const fallbackUrl = `https://bookmyshot.in`;
        openWhatsAppFallback(fallbackUrl);
        return;
      }

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        const fallbackUrl = `https://bookmyshot.in`;
        openWhatsAppFallback(fallbackUrl);
        return;
      }

      console.log('[Invoice] Step 5: Opening share sheet...');
      try {
        await Sharing.shareAsync(pdfResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Send Invoice',
          UTI: 'com.adobe.pdf',
        });
        console.log('[Invoice] âœ… Share completed');
      } catch (shareErr: any) {
        // User might have cancelled the share â€” that's not an error
        if (shareErr.message?.includes('cancelled') || shareErr.message?.includes('dismiss')) {
          console.log('[Invoice] Share cancelled by user');
          return;
        }
        console.log('[Invoice] Share sheet error:', shareErr.message);
        // Try WhatsApp fallback
        Alert.alert(
          'Share Issue',
          'Could not open share sheet. Would you like to send via WhatsApp link instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send via WhatsApp', onPress: () => openWhatsAppFallback('https://bookmyshot.in') },
          ]
        );
      }
    } catch (e: any) {
      console.log('[Invoice] Unexpected error:', e.message);
      Alert.alert('Error', 'Invoice sharing failed: ' + (e.message || 'Unknown error'));
    }
  };

  // WhatsApp fallback â€” sends invoice link directly
  const openWhatsAppFallback = (invoiceUrl: string) => {
    const phone = (booking.clientPhone || '').replace(/\D/g, '').slice(-10);
    const msg = `Hi ${booking.clientName || 'there'},\n\nYour booking invoice is ready.\n\nðŸ“„ View/Download Invoice:\n${invoiceUrl}\n\nThank you!\nâ€” ${booking.creator?.user?.name || 'Your Creator'} via BookMyShot`;
    if (phone) {
      Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`);
    } else {
      Linking.openURL(invoiceUrl);
    }
  };

  // â•â•â• ADD EVENT â•â•â•
  const addEvent = async () => {
    if (!eventForm.name || !eventForm.date) { Alert.alert('Error', 'Event name and date are required'); return; }
    try {
      await api.post('/booking-events', { bookingId, eventName: eventForm.name, eventDate: eventForm.date, location: eventForm.location, notes: eventForm.notes });
      setShowEventModal(false);
      setEventForm({ name: '', date: '', location: '', notes: '' });
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  // â•â•â• DELETE EVENT â•â•â•
  const deleteEvent = (id: string) => Alert.alert('Delete Event', 'Remove this event?', [
    { text: 'Cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/booking-events/${id}`); await load(); } catch {} }}
  ]);

  // â•â•â• CONTACT â•â•â•
  const callCustomer = () => booking?.clientPhone && Linking.openURL(`tel:${booking.clientPhone}`);
  const whatsApp = () => booking?.clientPhone && Linking.openURL(`https://wa.me/91${booking.clientPhone.replace(/\D/g, '').slice(-10)}`);

  // â•â•â• WHATSAPP PAYMENT REMINDER â•â•â•
  const sendPaymentReminder = () => {
    if (!booking?.clientPhone) { Alert.alert('No Phone', 'Customer phone number not available'); return; }
    const phone = booking.clientPhone.replace(/\D/g, '').slice(-10);
    const customerName = booking.clientName || 'Customer';
    const creatorName = user?.name || 'Creator';
    const eventDate = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
    const bookingAmount = booking.amount || 0;
    const paidAmount = paymentRecords.filter((r: any) => r.status === 'approved').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const pendingAmount = Math.max(0, bookingAmount - paidAmount);

    const message = `Hi ${customerName},\n\nThis is a friendly payment reminder from *${creatorName}* via BookMyShot.\n\nYour booking details:\nâ€¢ Booking ID: ${booking.invoiceNumber || booking._id?.slice(-8)}\nâ€¢ Event: ${booking.eventType || 'Booking'}\nâ€¢ Event Date: ${eventDate}\nâ€¢ Total Project Amount: â‚¹${bookingAmount.toLocaleString('en-IN')}\nâ€¢ Amount Paid: â‚¹${paidAmount.toLocaleString('en-IN')}\nâ€¢ *Pending Amount: â‚¹${pendingAmount.toLocaleString('en-IN')}*\n\nKindly clear your pending payment of â‚¹${pendingAmount.toLocaleString('en-IN')} at your earliest convenience.\n\nThank you for choosing BookMyShot. ðŸ™`;

    const encoded = encodeURIComponent(message);
    Linking.openURL(`https://wa.me/91${phone}?text=${encoded}`);
  };

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

        {/* â•â•â• PAYMENT DASHBOARD â•â•â• */}
        <View style={s.payDash}>
          <View style={s.payRow}><Text style={s.payLabel}>Total</Text><Text style={s.payVal}>â‚¹{(booking.amount || 0).toLocaleString('en-IN')}</Text></View>
          <View style={s.payRow}><Text style={s.payLabel}>Paid</Text><Text style={[s.payVal, { color: colors.success }]}>â‚¹{totalPaid.toLocaleString('en-IN')}</Text></View>
          <View style={s.payRow}><Text style={s.payLabel}>Remaining</Text><Text style={[s.payVal, { color: remaining > 0 ? colors.warning : colors.success }]}>â‚¹{Math.max(0, remaining).toLocaleString('en-IN')}</Text></View>
          {/* Progress bar */}
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={s.progressText}>{progress}% paid</Text>
          <View style={s.payRow}><Text style={s.payLabel}>Commission ({booking.commissionPercent || 0}%)</Text><Text style={[s.payVal, { color: colors.error, fontSize: 13 }]}>-â‚¹{(booking.commissionAmount || 0).toLocaleString('en-IN')}</Text></View>
          <View style={s.payRow}><Text style={[s.payLabel, { fontWeight: '600' }]}>Net Receivable</Text><Text style={[s.payVal, { color: colors.primary }]}>â‚¹{(booking.creatorReceivable || 0).toLocaleString('en-IN')}</Text></View>
        </View>

        {/* â•â•â• QUICK ACTIONS â€” 3 states â•â•â• */}
        {booking.status === 'Completed' || booking.status === 'completed' ? (
          /* STATE 3: COMPLETED â€” Chat + Invoice + Send Invoice */
          <View style={s.actionsRow}>
            <ActionBtn icon="chatbubble-outline" label="Chat" onPress={() => navigation.navigate('BookingChat', { bookingId })} />
            <ActionBtn icon="download-outline" label="Invoice" onPress={downloadInvoice} />
            <ActionBtn icon="share-social-outline" label="Send Invoice" onPress={shareInvoicePDF} />
          </View>
        ) : pendingComplete ? (
          /* STATE 2: PENDING COMPLETE (Mark Paid clicked, due > 0) â€” Mark Complete + Cancel */
          <View style={s.actionsRow}>
            <ActionBtn icon="checkmark-circle-outline" label="Complete" onPress={completeBooking} />
            <ActionBtn icon="chatbubble-outline" label="Chat" onPress={() => navigation.navigate('BookingChat', { bookingId })} />
            <ActionBtn icon="close-circle-outline" label="Cancel" onPress={cancelPendingComplete} />
          </View>
        ) : (
          /* STATE 1: ACTIVE â€” Payment controls */
          <>
            <View style={s.actionsRow}>
              <ActionBtn icon="cash-outline" label="Set Amount" onPress={() => { setAmountInput(String(booking.amount || '')); setShowAmountModal(true); }} />
              <ActionBtn icon="card-outline" label="Record Pay" onPress={() => setShowPaymentModal(true)} />
              <ActionBtn icon="checkmark-done" label="Mark Paid" onPress={markPaid} />
              <ActionBtn icon="chatbubble-outline" label="Chat" onPress={() => navigation.navigate('BookingChat', { bookingId })} />
            </View>
            {remaining > 0 && booking.amount > 0 && (
              <View style={[s.actionsRow, { marginTop: 0 }]}>
                <ActionBtn icon="logo-whatsapp" label="Remind" onPress={sendPaymentReminder} />
                {totalPaid > 0 && <ActionBtn icon="receipt-outline" label="Payment Invoice" onPress={downloadPartialInvoice} />}
              </View>
            )}
            {remaining <= 0 && totalPaid > 0 && booking.amount > 0 && (
              <View style={[s.actionsRow, { marginTop: 0 }]}>
                <ActionBtn icon="receipt-outline" label="Payment Invoice" onPress={downloadPartialInvoice} />
              </View>
            )}
          </>
        )}

        {/* â•â•â• CUSTOMER â•â•â• */}
        <Section title="Customer">
          <Row label="Name" value={booking.clientName || 'â€”'} />
          <Row label="Phone" value={booking.clientPhone || 'â€”'} />
          <Row label="Email" value={booking.clientEmail || 'â€”'} />
          <View style={s.contactRow}>
            <TouchableOpacity style={s.contactBtn} onPress={callCustomer}><Ionicons name="call" size={15} color={colors.info} /><Text style={s.contactText}>Call</Text></TouchableOpacity>
            <TouchableOpacity style={s.contactBtn} onPress={whatsApp}><Ionicons name="logo-whatsapp" size={15} color={colors.success} /><Text style={s.contactText}>WhatsApp</Text></TouchableOpacity>
          </View>
          {/* WhatsApp Payment Reminder */}
          {remaining > 0 && booking.amount > 0 ? (
            <TouchableOpacity style={s.waReminderBtn} onPress={sendPaymentReminder} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={s.waReminderText}>Send Payment Reminder</Text>
              <Text style={s.waReminderAmount}>â‚¹{remaining.toLocaleString('en-IN')} pending</Text>
            </TouchableOpacity>
          ) : booking.amount > 0 ? (
            <View style={s.payCompleteBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={s.payCompleteText}>Payment Completed âœ…</Text>
            </View>
          ) : null}
        </Section>

        {/* â•â•â• EVENT â•â•â• */}
        <Section title="Event Details">
          <Row label="Type" value={booking.eventType || 'â€”'} />
          <Row label="Date" value={booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : 'â€”'} />
          {booking.eventTime && <Row label="Time" value={booking.eventTime} />}
          <Row label="Location" value={booking.eventLocation || booking.scheduledLocation || 'â€”'} />
          <Row label="Package" value={booking.packageName || 'Standard'} />
          <Row label="Source" value={booking.leadSource || 'bookmyshot'} />
          <Row label="Invoice" value={booking.invoiceNumber || 'â€”'} />
        </Section>

        {/* â•â•â• PAYMENT HISTORY â•â•â• */}
        <Section title={`Payment History (${paymentRecords.length})`}>
          {paymentRecords.length > 0 ? paymentRecords.map((r, i) => (
            <View key={r._id || i} style={s.payRecord}>
              <View style={s.payRecordLeft}>
                <Text style={s.payRecordType}>{r.paymentType || 'Payment'}</Text>
                <Text style={s.payRecordDate}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''} â€¢ {r.addedBy || 'creator'}</Text>
                {r.notes && <Text style={s.payRecordNotes}>{r.notes}</Text>}
              </View>
              <View style={s.payRecordRight}>
                <Text style={s.payRecordAmount}>â‚¹{(r.amount || 0).toLocaleString('en-IN')}</Text>
                <Text style={[s.payRecordStatus, { color: r.status === 'approved' ? colors.success : colors.warning }]}>{r.status}</Text>
              </View>
            </View>
          )) : <Text style={s.emptyText}>No payments recorded yet</Text>}
        </Section>

        {/* â•â•â• EVENTS â•â•â• */}
        <Section title={`Events (${events.length})`}>
          {events.length > 0 ? events.map((ev, i) => (
            <View key={ev._id || i} style={s.eventItem}>
              <View style={s.eventDot} />
              <View style={s.eventInfo}>
                <Text style={s.eventName}>{ev.eventName || 'Event'}</Text>
                <Text style={s.eventDate}>{ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} {ev.location ? `â€¢ ${ev.location}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteEvent(ev._id)}><Ionicons name="trash-outline" size={14} color={colors.error} /></TouchableOpacity>
            </View>
          )) : <Text style={s.emptyText}>No events added yet</Text>}
        </Section>

        {/* â•â•â• NOTES â•â•â• */}
        {booking.message && <Section title="Client Message"><Text style={s.messageText}>"{booking.message}"</Text></Section>}
        {booking.creatorNotes && <Section title="Creator Notes"><Text style={s.messageText}>{booking.creatorNotes}</Text></Section>}
      </ScrollView>

      {/* â•â•â• BOTTOM ACTIONS â•â•â• */}
      <View style={s.bottomBar}>
        {booking.status === 'Booking Created' && <>
          <TouchableOpacity style={s.btnReject} onPress={rejectBooking}><Text style={s.btnRejectText}>Reject</Text></TouchableOpacity>
          <TouchableOpacity style={s.btnAccept} onPress={() => { setAmountInput(String(booking.amount || booking.budget || '')); setShowAmountModal(true); }}><Text style={s.btnAcceptText}>Accept</Text></TouchableOpacity>
        </>}
        {(booking.status === 'Completed' || booking.status === 'completed') && (
          <TouchableOpacity style={[s.btnComplete, { backgroundColor: colors.primary }]} onPress={downloadInvoice}>
            <Text style={s.btnCompleteText}>ðŸ“¥ Download Invoice</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* â•â•â• SET AMOUNT MODAL â•â•â• */}
      <Modal visible={showAmountModal} transparent animationType="fade">
        <View style={s.modalBg}><View style={s.modal}>
          <Text style={s.modalTitle}>{booking.status === 'Booking Created' ? 'Accept & Set Amount' : 'Update Project Amount'}</Text>
          <Text style={s.modalSub}>Commission is calculated on highest amount ever set (never decreases)</Text>
          <TextInput style={s.modalInput} value={amountInput} onChangeText={setAmountInput} keyboardType="numeric" placeholder="â‚¹ Amount" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} autoFocus />
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowAmountModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.modalConfirm} onPress={booking.status === 'Booking Created' ? acceptBooking : setProjectAmount}><Text style={s.modalConfirmText}>{booking.status === 'Booking Created' ? 'Accept' : 'Save'}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* â•â•â• RECORD PAYMENT MODAL â•â•â• */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={s.modalBg}><View style={s.modal}>
          <Text style={s.modalTitle}>Record Payment</Text>
          <View style={s.payTypeRow}>
            {['advance', 'partial', 'final'].map(t => (
              <TouchableOpacity key={t} style={[s.payTypeBtn, payForm.type === t && s.payTypeBtnActive]} onPress={() => setPayForm({ ...payForm, type: t })} disabled={savingPayment}>
                <Text style={[s.payTypeText, payForm.type === t && s.payTypeTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={s.modalInput} value={payForm.amount} onChangeText={v => setPayForm({ ...payForm, amount: v })} keyboardType="numeric" placeholder="â‚¹ Amount" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} editable={!savingPayment} />
          <TextInput style={[s.modalInput, { height: 60 }]} value={payForm.notes} onChangeText={v => setPayForm({ ...payForm, notes: v })} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} multiline editable={!savingPayment} />
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowPaymentModal(false)} disabled={savingPayment}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.modalConfirm, savingPayment && { opacity: 0.6 }]} onPress={recordPayment} disabled={savingPayment}>
              {savingPayment ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={s.modalConfirmText}>Record</Text>}
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* â•â•â• ADD EVENT MODAL â•â•â• */}
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
  // WhatsApp Reminder
  waReminderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: '#25D366' },
  waReminderText: { ...typography.labelMd, color: '#fff', fontWeight: '600' },
  waReminderAmount: { ...typography.caption, color: 'rgba(255,255,255,0.7)', marginLeft: spacing.xs },
  payCompleteBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)' },
  payCompleteText: { ...typography.labelMd, color: colors.success },
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
