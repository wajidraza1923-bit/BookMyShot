/**
 * BookingDetail — Creator Dashboard · Booking · View Full
 * Theme: White + Green + Gold (BookMyShot premium)
 * Fix: ₹ symbol via Unicode \u20B9 — no encoding issues
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  TextInput, Modal, RefreshControl, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Import from theme.ts (white theme) NOT theme/index.ts (dark theme)
import { colors, spacing, radius, typography } from '../../theme';
import api from '../../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { buildInvoiceHTML } from '../../utils/buildInvoice';

// ─── Safe ₹ formatter (Unicode — no encoding issues) ────────────────────────
const rs = (n: number) => '\u20B9' + (n || 0).toLocaleString('en-IN');

// ─── Safe date formatter ─────────────────────────────────────────────────────
const fmtDate = (d: any, opts?: object) => {
  if (!d) return '\u2014';
  try { return new Date(d).toLocaleDateString('en-IN', opts || { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '\u2014'; }
};

// ─── BookMyShot theme constants ──────────────────────────────────────────────
const G = '#0F5132';   // Emerald green
const GOLD = '#D4AF37';
const CHAMP = '#F8F5EF';
const WHITE = '#FFFFFF';
const TXT = '#1a1a1a';
const MUTED = '#6b7280';

export default function BookingDetail({ route, navigation }: any) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [payForm, setPayForm] = useState({ amount: '', type: 'advance', notes: '' });
  const [eventForm, setEventForm] = useState({ name: '', date: '', location: '', notes: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bRes, pRes, eRes] = await Promise.all([
        api.get('/creator/booking-requests'),
        api.get(`/payment-records/booking/${bookingId}`).catch(() => ({ data: { records: [] } })),
        api.get(`/booking-events/booking/${bookingId}`).catch(() => ({ data: { events: [] } })),
      ]);
      const b = (bRes.data?.bookings || []).find((x: any) => x._id === bookingId);
      if (b) setBooking(b);
      setPaymentRecords(pRes.data?.records || pRes.data?.data || []);
      setEvents(eRes.data?.events || eRes.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ── Set Amount ────────────────────────────────────────────────────────────
  const setProjectAmount = async () => {
    const amount = Number(amountInput);
    if (!amount || amount <= 0) { Alert.alert('Invalid Amount', 'Please enter a valid amount'); return; }
    try {
      await api.patch(`/payment-records/booking/${bookingId}/amount`, { amount });
      setShowAmountModal(false);
      await load();
      Alert.alert('Amount Set', 'Project amount set to ' + rs(amount));
    } catch (e: any) { Alert.alert('Failed', e.response?.data?.message || 'Failed to set amount'); }
  };

  // ── Record Payment ────────────────────────────────────────────────────────
  const recordPayment = async () => {
    if (savingPayment) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) { Alert.alert('Invalid Amount', 'Enter a valid amount'); return; }
    const bookingTotal = booking.amount || 0;
    if (bookingTotal <= 0) { Alert.alert('Set Amount First', 'Set the booking amount first'); return; }
    const alreadyPaid = paymentRecords.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    if (alreadyPaid + amount > bookingTotal) {
      Alert.alert('Exceeds Limit', 'Total: ' + rs(bookingTotal) + '\nPaid: ' + rs(alreadyPaid) + '\nMax allowed: ' + rs(Math.max(0, bookingTotal - alreadyPaid)));
      return;
    }
    setSavingPayment(true);
    try {
      await api.post('/payment-records/creator', { bookingId, amount, paymentType: payForm.type, notes: payForm.notes });
      setShowPaymentModal(false);
      setPayForm({ amount: '', type: 'advance', notes: '' });
      await load();
      Alert.alert('Recorded', rs(amount) + ' ' + payForm.type + ' payment recorded');
    } catch (e: any) { Alert.alert('Failed', e.response?.data?.message || 'Network error'); }
    finally { setSavingPayment(false); }
  };

  const markPaid = () => setPendingComplete(true);
  const cancelPendingComplete = () => setPendingComplete(false);

  // ── Accept Booking ────────────────────────────────────────────────────────
  const acceptBooking = async () => {
    const amount = Number(amountInput);
    if (!amount || amount <= 0) { Alert.alert('Invalid Amount', 'Enter the booking amount'); return; }
    try {
      await api.patch(`/creator/booking-requests/${bookingId}`, { status: 'Creator Accepted', amount });
      setShowAmountModal(false);
      await load();
      Alert.alert('Accepted', 'Booking accepted for ' + rs(amount));
    } catch (e: any) { Alert.alert('Failed', e.response?.data?.message || 'Failed'); }
  };

  const rejectBooking = () => Alert.alert('Reject Booking', 'Reject this booking?', [
    { text: 'Cancel' },
    { text: 'Reject', style: 'destructive', onPress: async () => {
      try { await api.patch(`/creator/booking-requests/${bookingId}`, { status: 'rejected' }); await load(); }
      catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }},
  ]);

  // ── Complete Booking ──────────────────────────────────────────────────────
  const completeBooking = () => {
    if (completing) return;
    Alert.alert('Complete Booking', 'This will lock payment records and generate an invoice.', [
      { text: 'Cancel' },
      { text: 'Complete', onPress: async () => {
        setCompleting(true);
        try {
          await api.patch(`/payment-records/booking/${bookingId}/mark-paid`);
          await api.patch(`/creator/bookings/${bookingId}/complete`);
          await load();
          setPendingComplete(false);
          Alert.alert('Done!', 'Booking completed. Invoice ready for download.');
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
        finally { setCompleting(false); }
      }},
    ]);
  };

  // ── Contact ───────────────────────────────────────────────────────────────
  const callCustomer = () => booking?.clientPhone && Linking.openURL('tel:' + booking.clientPhone);
  const whatsApp = () => booking?.clientPhone && Linking.openURL('https://wa.me/91' + booking.clientPhone.replace(/\D/g, '').slice(-10));

  // ── Payment Reminder ──────────────────────────────────────────────────────
  const sendPaymentReminder = () => {
    if (!booking?.clientPhone) { Alert.alert('No Phone', 'Customer phone not available'); return; }
    const phone = booking.clientPhone.replace(/\D/g, '').slice(-10);
    const paid = paymentRecords.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const pending = Math.max(0, (booking.amount || 0) - paid);
    const msg = 'Hi ' + (booking.clientName || 'there') + ',\n\nFriendly payment reminder from ' + (booking.creatorName || 'your vendor') + ' via BookMyShot.\n\n'
      + 'Booking: ' + (booking.eventType || 'Service') + '\n'
      + 'Event Date: ' + fmtDate(booking.eventDate) + '\n'
      + 'Total: ' + rs(booking.amount || 0) + '\n'
      + 'Paid: ' + rs(paid) + '\n'
      + 'Pending: ' + rs(pending) + '\n\nPlease clear the pending amount at your earliest. Thank you!';
    Linking.openURL('https://wa.me/91' + phone + '?text=' + encodeURIComponent(msg));
  };

  // ── Add Event ─────────────────────────────────────────────────────────────
  const addEvent = async () => {
    if (!eventForm.name) { Alert.alert('Name required'); return; }
    try {
      await api.post('/booking-events', { bookingId, eventName: eventForm.name, eventDate: eventForm.date, location: eventForm.location, notes: eventForm.notes });
      setShowEventModal(false);
      setEventForm({ name: '', date: '', location: '', notes: '' });
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
  };

  const deleteEvent = (id: string) => Alert.alert('Delete Event', 'Remove this event?', [
    { text: 'Cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete('/booking-events/' + id); await load(); } catch {} } },
  ]);

  // ── Shared helper: generate PDF to cache and return URI ─────────────────
  const generatePDF = async (html: string, fileName: string): Promise<string | null> => {
    try {
      console.log('[PDF] Starting generation for:', fileName, 'HTML length:', html.length);

      // Strip CSS that Android WebView PDF engine cannot handle
      const safeHtml = html
        .replace(/linear-gradient\([^)]+\)/g, '#7C3AED')
        .replace(/backdrop-filter[^;]+;/g, '')
        .replace(/@import[^;]+;/g, '');

      console.log('[PDF] Calling printToFileAsync...');
      const result = await Print.printToFileAsync({ html: safeHtml, base64: false });
      console.log('[PDF] Result:', JSON.stringify({ uri: result?.uri, pages: result?.numberOfPages }));

      if (!result?.uri) {
        console.log('[PDF] No URI returned');
        return null;
      }

      const cacheDir = FileSystem.cacheDirectory || '';
      const destUri = cacheDir + fileName;
      console.log('[PDF] Copying to:', destUri);
      try {
        await FileSystem.copyAsync({ from: result.uri, to: destUri });
        const info = await FileSystem.getInfoAsync(destUri);
        console.log('[PDF] Dest file exists:', info.exists);
        return info.exists ? destUri : result.uri;
      } catch (copyErr: any) {
        console.log('[PDF] Copy failed:', copyErr.message, '— using original:', result.uri);
        return result.uri;
      }
    } catch (e: any) {
      console.log('[PDF] printToFileAsync FAILED:', e?.message, e?.code, e?.stack?.substring(0, 200));
      // Fallback: ultra-simple HTML guaranteed to work
      try {
        console.log('[PDF] Trying simple fallback HTML...');
        const simpleHtml = buildSimpleInvoiceHTML();
        const result2 = await Print.printToFileAsync({ html: simpleHtml, base64: false });
        console.log('[PDF] Fallback result:', JSON.stringify({ uri: result2?.uri }));
        if (result2?.uri) {
          const dest = (FileSystem.cacheDirectory || '') + fileName;
          try { await FileSystem.copyAsync({ from: result2.uri, to: dest }); return dest; } catch { return result2.uri; }
        }
      } catch (e2: any) {
        console.log('[PDF] Fallback also failed:', e2?.message);
      }
      return null;
    }
  };

  // ── Minimal fallback HTML (no gradients, no complex CSS) ─────────────────
  const buildSimpleInvoiceHTML = (): string => {
    const b = booking;
    const approved = paymentRecords.filter((r: any) => r.status === 'approved');
    const totalPaid = approved.reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const amt = b.amount || 0;
    const remaining = Math.max(0, amt - totalPaid);
    const docNo = b.invoiceNumber || ('BMS-' + (b._id || '').slice(-8).toUpperCase());
    const fmtC = (n: number) => 'Rs.' + (n || 0).toLocaleString('en-IN');
    const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-IN') : '-';
    const rows = approved.map((p: any) =>
      '<tr><td>' + fmtD(p.createdAt) + '</td><td>' + fmtC(p.amount) + '</td><td>' + (p.paymentType || '-') + '</td></tr>'
    ).join('');
    return '<!DOCTYPE html><html><head><meta charset="utf-8">'
      + '<style>body{font-family:sans-serif;padding:20px;color:#000}h1{color:#7C3AED;font-size:18px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#f0f0f0}.label{color:#666;font-size:11px}.val{font-weight:bold;font-size:13px}</style>'
      + '</head><body>'
      + '<h1>BookMyShot — Payment Receipt</h1>'
      + '<p class="label">Document #</p><p class="val">' + docNo + '</p>'
      + '<p class="label">Client</p><p class="val">' + (b.clientName || '-') + '</p>'
      + '<p class="label">Service</p><p class="val">' + (b.eventType || '-') + '</p>'
      + '<p class="label">Event Date</p><p class="val">' + fmtD(b.eventDate) + '</p>'
      + '<p class="label">Booking Amount</p><p class="val">' + fmtC(amt) + '</p>'
      + '<p class="label">Amount Paid</p><p class="val">' + fmtC(totalPaid) + '</p>'
      + '<p class="label">Balance Due</p><p class="val">' + (remaining > 0 ? fmtC(remaining) : 'Nil') + '</p>'
      + (rows ? '<table><thead><tr><th>Date</th><th>Amount</th><th>Type</th></tr></thead><tbody>' + rows + '</tbody></table>' : '')
      + '<br><p style="font-size:10px;color:#666">Generated by BookMyShot | bookmyshot.in</p>'
      + '</body></html>';
  };

  // ── Download Invoice (completed booking) — opens PDF viewer / print dialog
  const downloadInvoice = async () => {
    try {
      const html = buildInvoiceHTML(booking, paymentRecords, false);
      if (!html) { Alert.alert('Error', 'Booking data not loaded'); return; }

      const docNo = booking.invoiceNumber || ('BMS-' + (booking._id || '').slice(-8).toUpperCase());
      const uri = await generatePDF(html, 'Invoice_' + docNo + '.pdf');
      if (!uri) { Alert.alert('Error', 'Could not generate PDF'); return; }

      // Open with viewer (user can save from there)
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Invoice ' + docNo, UTI: 'com.adobe.pdf' });
      } else {
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('dismiss')) return;
      Alert.alert('Error', 'Could not open invoice: ' + (e.message || ''));
    }
  };

  // ── Receipt button — DOWNLOAD only, NO share sheet ───────────────────────
  const downloadPartialInvoice = async () => {
    try {
      const html = buildInvoiceHTML(booking, paymentRecords, true);
      if (!html) { Alert.alert('Error', 'Booking data not loaded'); return; }

      const docNo = 'BMS-PR-' + (booking._id || '').slice(-8).toUpperCase();
      const uri = await generatePDF(html, 'Receipt_' + docNo + '.pdf');
      if (!uri) { Alert.alert('Error', 'Could not generate receipt PDF. Please try again.'); return; }

      // Download only — open in PDF viewer so user can save, do NOT open share sheet
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        // Use share with copy-only intent to open in PDF viewer (not share chooser)
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Receipt',
          UTI: 'com.adobe.pdf',
        });
        // The above opens the Android app chooser — user picks their file manager / PDF viewer
      } else {
        // Fallback: print dialog
        await Print.printAsync({ html });
      }
      Alert.alert('Receipt Ready', 'Your receipt has been generated. You can save it from the opened app.', [{ text: 'OK' }]);
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('dismiss')) return;
      Alert.alert('Error', 'Could not generate receipt');
    }
  };

  // ── Send Invoice (Share PDF via WhatsApp, Gmail, etc.) ───────────────────
  const shareInvoicePDF = async () => {
    try {
      const html = buildInvoiceHTML(booking, paymentRecords, false);
      if (!html) { Alert.alert('Error', 'Booking data not loaded'); return; }

      const docNo = booking.invoiceNumber || ('BMS-' + (booking._id || '').slice(-8).toUpperCase());

      // Generate PDF without base64 (more reliable on Android)
      const result = await Print.printToFileAsync({ html, base64: false });
      if (!result?.uri) { Alert.alert('Error', 'PDF generation failed'); return; }

      const cacheDir = FileSystem.cacheDirectory || '';
      const destUri = cacheDir + 'Invoice_' + docNo + '.pdf';

      // Copy to named file
      try { await FileSystem.copyAsync({ from: result.uri, to: destUri }); }
      catch { /* use original if copy fails */ }

      const shareUri = (await FileSystem.getInfoAsync(destUri).catch(() => ({ exists: false }))).exists
        ? destUri
        : result.uri;

      // Open share sheet
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Send Invoice — ' + docNo,
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback: open print dialog
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      const msg = (e?.message || String(e) || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('denied')) return;
      Alert.alert('Share Failed', e?.message || 'Please use the Invoice button to view/print instead.');
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || !booking) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={G} />
        <Text style={s.loadingTxt}>Loading booking...</Text>
      </View>
    );
  }

  // ── Computed values ───────────────────────────────────────────────────────
  const approvedPays = paymentRecords.filter((r: any) => r.status === 'approved');
  const totalPaid = approvedPays.reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const bookingAmt = booking.amount || 0;
  const remaining = Math.max(0, bookingAmt - totalPaid);
  const progress = bookingAmt > 0 ? Math.min(100, Math.round((totalPaid / bookingAmt) * 100)) : 0;
  const advancePaid = booking.bookingFeeAmount || Math.round(bookingAmt * 0.05);
  const receivable = booking.creatorReceivable || (bookingAmt - (booking.commissionAmount || 0));
  const isCompleted = booking.status === 'Completed' || booking.status === 'completed';

  const statusColors: Record<string, string> = {
    'Completed': '#0F5132', 'completed': '#0F5132',
    'rejected': '#DC2626', 'cancelled': '#DC2626',
    'Booking Created': '#D97706',
    'Creator Accepted': '#2563EB',
    'Payment Submitted': '#7C3AED',
    'Payment Approved': '#0891B2',
    'Event Scheduled': '#059669',
  };
  const statusColor = statusColors[booking.status] || '#6B7280';

  const payStatusMap: Record<string, string> = {
    unpaid: 'Unpaid', partial: 'Partially Paid',
    'proof-submitted': 'Proof Submitted', 'pending-verification': 'Pending',
    verified: 'Approved', rejected: 'Rejected', paid: 'Fully Paid',
  };
  const payStatusLabel = payStatusMap[booking.paymentStatus] || booking.paymentStatus || '\u2014';

  return (
    <View style={s.root}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={G} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{booking.clientName || 'Booking'}</Text>
          <Text style={s.headerSub}>{booking.eventType || 'Service'}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: statusColor + '15', borderColor: statusColor + '40' }]}>
          <Text style={[s.statusPillTxt, { color: statusColor }]}>{booking.status}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} colors={[G]} />}
        contentContainerStyle={{ paddingBottom: 130 }}
      >

        {/* ── PAYMENT DASHBOARD ─────────────────────────────────────────── */}
        <View style={s.payDash}>
          <Text style={s.payDashTitle}>Payment Summary</Text>

          <View style={s.payCardRow}>
            <View style={[s.payCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Text style={s.payCardLabel}>Booking Amount</Text>
              <Text style={[s.payCardAmt, { color: G }]}>{rs(bookingAmt)}</Text>
            </View>
            <View style={[s.payCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Text style={s.payCardLabel}>Advance (5%)</Text>
              <Text style={[s.payCardAmt, { color: '#92400E' }]}>{rs(advancePaid)}</Text>
              <Text style={s.payCardSub}>Paid to BookMyShot</Text>
            </View>
          </View>

          <View style={s.payCardRow}>
            <View style={[s.payCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Text style={s.payCardLabel}>Remaining to Vendor</Text>
              <Text style={[s.payCardAmt, { color: remaining > 0 ? '#B45309' : G }]}>
                {remaining > 0 ? rs(remaining) : 'Settled'}
              </Text>
            </View>
            <View style={[s.payCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
              <Text style={s.payCardLabel}>Vendor Receivable</Text>
              <Text style={[s.payCardAmt, { color: '#0369A1' }]}>{rs(receivable)}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: progress + '%' as any }]} />
            </View>
            <View style={s.progressRow}>
              <Text style={s.progressLbl}>{rs(totalPaid)} paid</Text>
              <Text style={[s.progressPct, { color: progress >= 100 ? G : GOLD }]}>{progress}%</Text>
              <Text style={s.progressLbl}>{rs(remaining)} due</Text>
            </View>
          </View>

          {/* Advance note */}
          <View style={s.advanceNote}>
            <Ionicons name="information-circle-outline" size={14} color={GOLD} />
            <Text style={s.advanceNoteTxt}>
              5% advance ({rs(advancePaid)}) paid to BookMyShot as booking confirmation. Remaining ({rs(remaining)}) payable directly to vendor.
            </Text>
          </View>
        </View>

        {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
        {isCompleted ? (
          <View style={s.actionGrid}>
            <ABtn icon="chatbubble-outline" label="Chat" color={G} onPress={() => navigation.navigate('BookingChat', { bookingId })} />
            <ABtn icon="document-text-outline" label="Invoice" color={G} onPress={downloadInvoice} />
            <ABtn icon="share-social-outline" label="Share PDF" color={GOLD} onPress={shareInvoicePDF} />
            <ABtn icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={() => {
              const phone = (booking.clientPhone || '').replace(/\D/g, '').slice(-10);
              const docNo = booking.invoiceNumber || ('BMS-' + (booking._id || '').slice(-8).toUpperCase());
              const msg = 'Hi ' + (booking.clientName || 'there') + ',\n\nYour BookMyShot invoice is ready!\n\nBooking ID: ' + docNo + '\nService: ' + (booking.eventType || 'Booking') + '\nDate: ' + (booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN') : 'TBD') + '\nAmount: \u20B9' + (booking.amount || 0).toLocaleString('en-IN') + '\n\nThank you for choosing BookMyShot!';
              const url = phone ? 'https://wa.me/91' + phone + '?text=' + encodeURIComponent(msg) : 'https://wa.me/?text=' + encodeURIComponent(msg);
              Linking.openURL(url);
            }} />
          </View>
        ) : pendingComplete ? (
          <View style={s.actionGrid}>
            <ABtn icon="checkmark-circle" label="Complete" color={G} onPress={completeBooking} loading={completing} />
            <ABtn icon="chatbubble-outline" label="Chat" color={G} onPress={() => navigation.navigate('BookingChat', { bookingId })} />
            <ABtn icon="close-circle-outline" label="Cancel" color="#EF4444" onPress={cancelPendingComplete} />
          </View>
        ) : (
          <>
            <View style={s.actionGrid}>
              <ABtn icon="pencil-outline" label="Set Amount" color={G} onPress={() => { setAmountInput(String(booking.amount || '')); setShowAmountModal(true); }} />
              <ABtn icon="card-outline" label="Record Pay" color={GOLD} onPress={() => setShowPaymentModal(true)} />
              <ABtn icon="checkmark-done-outline" label="Mark Paid" color="#059669" onPress={markPaid} />
              <ABtn icon="chatbubble-outline" label="Chat" color={G} onPress={() => navigation.navigate('BookingChat', { bookingId })} />
            </View>
            {totalPaid > 0 && (
              <View style={[s.actionGrid, { marginTop: 0, marginBottom: 20 }]}>
                <ABtn icon="logo-whatsapp" label="Remind" color="#25D366" onPress={sendPaymentReminder} />
                <ABtn icon="receipt-outline" label="Receipt" color="#7C3AED" onPress={downloadPartialInvoice} />
                <ABtn icon="calendar-outline" label="Add Event" color={G} onPress={() => setShowEventModal(true)} />
              </View>
            )}
          </>
        )}

        {/* ── CUSTOMER CARD ─────────────────────────────────────────────── */}
        <Card icon="person-circle-outline" title="Customer">
          <View style={s.customerTop}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarTxt}>{(booking.clientName || 'C')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.customerName}>{booking.clientName || '\u2014'}</Text>
              <Text style={s.customerPhone}>{booking.clientPhone || 'No phone'}</Text>
              {booking.clientEmail && <Text style={s.customerEmail}>{booking.clientEmail}</Text>}
            </View>
          </View>
          <View style={s.contactRow}>
            <ContactBtn icon="call" label="Call" color="#2563EB" onPress={callCustomer} />
            <ContactBtn icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={whatsApp} />
            {booking.clientEmail && (
              <ContactBtn icon="mail-outline" label="Email" color={G} onPress={() => Linking.openURL('mailto:' + booking.clientEmail)} />
            )}
          </View>
          {remaining > 0 && bookingAmt > 0 && (
            <TouchableOpacity style={s.reminderBtn} onPress={sendPaymentReminder}>
              <Ionicons name="logo-whatsapp" size={15} color="#fff" />
              <Text style={s.reminderBtnTxt}>Send Payment Reminder</Text>
              <Text style={s.reminderAmt}>{rs(remaining)} pending</Text>
            </TouchableOpacity>
          )}
          {bookingAmt > 0 && remaining <= 0 && (
            <View style={s.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color={G} />
              <Text style={[s.paidBadgeTxt, { color: G }]}>Payment Completed</Text>
            </View>
          )}
        </Card>

        {/* ── EVENT DETAILS CARD ─────────────────────────────────────────── */}
        <Card icon="calendar-outline" title="Event Details">
          <View style={s.chipGrid}>
            <DetailChip label="Service" value={booking.eventType || '\u2014'} highlight />
            <DetailChip label="Package" value={booking.packageName || 'Standard'} />
            <DetailChip label="Event Date" value={fmtDate(booking.scheduledDate || booking.eventDate, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })} />
            {(booking.scheduledTime || booking.eventTime) && <DetailChip label="Time" value={booking.scheduledTime || booking.eventTime} />}
            <DetailChip label="Venue" value={booking.scheduledLocation || booking.eventLocation || '\u2014'} />
            <DetailChip label="Booking Status" value={booking.status} statusColor={statusColor} />
            <DetailChip label="Payment Status" value={payStatusLabel} />
            <DetailChip label="Booking ID" value={(booking.invoiceNumber || booking._id?.slice(-8) || '\u2014').toString().toUpperCase()} />
          </View>
        </Card>

        {/* ── PAYMENT HISTORY ───────────────────────────────────────────── */}
        <Card icon="receipt-outline" title={'Payment History (' + paymentRecords.length + ')'}>
          {paymentRecords.length > 0 ? paymentRecords.map((r: any, i: number) => (
            <View key={r._id || i} style={[s.payRecord, i === paymentRecords.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.payRecordDot, { backgroundColor: r.status === 'approved' ? G : GOLD }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.payRecordType}>{(r.paymentType || 'Payment').toUpperCase()}</Text>
                <Text style={s.payRecordMeta}>
                  {fmtDate(r.createdAt)} \u00B7 {r.addedBy || 'creator'}
                  {r.notes ? ' \u00B7 ' + r.notes : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.payRecordAmt, { color: r.status === 'approved' ? G : GOLD }]}>{rs(r.amount || 0)}</Text>
                <View style={[s.payRecordBadge, { backgroundColor: r.status === 'approved' ? '#F0FDF4' : '#FFFBEB', borderColor: r.status === 'approved' ? '#BBF7D0' : '#FDE68A' }]}>
                  <Text style={[s.payRecordBadgeTxt, { color: r.status === 'approved' ? G : '#92400E' }]}>{r.status}</Text>
                </View>
              </View>
            </View>
          )) : (
            <View style={s.emptyWrap}>
              <Ionicons name="receipt-outline" size={28} color={GOLD + '60'} />
              <Text style={s.emptyTxt}>No payments recorded yet</Text>
            </View>
          )}
        </Card>

        {/* ── EVENTS ────────────────────────────────────────────────────── */}
        <Card icon="calendar-clear-outline" title={'Events (' + events.length + ')'} action={{ label: '+ Add', onPress: () => setShowEventModal(true) }}>
          {events.length > 0 ? events.map((ev: any, i: number) => (
            <View key={ev._id || i} style={[s.eventRow, i === events.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.eventDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.eventName}>{ev.eventName || 'Event'}</Text>
                <Text style={s.eventMeta}>{fmtDate(ev.eventDate)}{ev.location ? ' \u00B7 ' + ev.location : ''}</Text>
              </View>
              <TouchableOpacity style={s.eventDel} onPress={() => deleteEvent(ev._id)}>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )) : (
            <View style={s.emptyWrap}>
              <Text style={s.emptyTxt}>No events added yet</Text>
            </View>
          )}
        </Card>

        {/* ── NOTES ─────────────────────────────────────────────────────── */}
        {(booking.message || booking.creatorNotes) && (
          <Card icon="chatbubble-ellipses-outline" title="Notes">
            {booking.message && (
              <View style={s.noteBlock}>
                <Text style={s.noteLabel}>Client Message</Text>
                <Text style={s.noteText}>"{booking.message}"</Text>
              </View>
            )}
            {booking.creatorNotes && (
              <View style={[s.noteBlock, { marginTop: booking.message ? 8 : 0, borderBottomWidth: 0 }]}>
                <Text style={s.noteLabel}>Creator Notes</Text>
                <Text style={s.noteText}>{booking.creatorNotes}</Text>
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {/* ── BOTTOM BAR ───────────────────────────────────────────────────── */}
      <View style={s.bottomBar}>
        {booking.status === 'Booking Created' && (
          <>
            <TouchableOpacity style={s.btnReject} onPress={rejectBooking}>
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={s.btnRejectTxt}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnAccept} onPress={() => { setAmountInput(String(booking.amount || booking.budget || '')); setShowAmountModal(true); }}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={s.btnAcceptTxt}>Accept Booking</Text>
            </TouchableOpacity>
          </>
        )}
        {isCompleted && (
          <TouchableOpacity style={s.btnDownload} onPress={downloadInvoice}>
            <Ionicons name="document-text-outline" size={16} color="#fff" />
            <Text style={s.btnDownloadTxt}>Download Invoice</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SET AMOUNT MODAL ──────────────────────────────────────────────── */}
      <Modal visible={showAmountModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{booking.status === 'Booking Created' ? 'Accept & Set Amount' : 'Update Project Amount'}</Text>
            <Text style={s.modalSub}>Amount affects platform fee calculation. Once set, it only increases.</Text>
            <TextInput style={s.modalInput} value={amountInput} onChangeText={setAmountInput} keyboardType="numeric" placeholder="\u20B9 Enter amount" placeholderTextColor={MUTED} autoFocus />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowAmountModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={booking.status === 'Booking Created' ? acceptBooking : setProjectAmount}>
                <Text style={s.modalConfirmTxt}>{booking.status === 'Booking Created' ? 'Accept' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* ── RECORD PAYMENT MODAL ─────────────────────────────────────────── */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Record Payment</Text>
            <View style={s.payTypeRow}>
              {['advance', 'partial', 'final'].map(t => (
                <TouchableOpacity key={t}
                  style={[s.payTypeBtn, payForm.type === t && s.payTypeBtnActive]}
                  onPress={() => setPayForm({ ...payForm, type: t })}
                  disabled={savingPayment}>
                  <Text style={[s.payTypeTxt, payForm.type === t && { color: '#0F5132', fontWeight: '700' as const }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.modalInput} value={payForm.amount}
              onChangeText={v => setPayForm({ ...payForm, amount: v })}
              keyboardType="numeric" placeholder={'\u20B9 Amount'} placeholderTextColor="#9CA3AF"
              editable={!savingPayment} />
            <TextInput style={[s.modalInput, { height: 64 }]} value={payForm.notes}
              onChangeText={v => setPayForm({ ...payForm, notes: v })}
              placeholder="Notes (optional)" placeholderTextColor="#9CA3AF"
              multiline editable={!savingPayment} />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowPaymentModal(false)} disabled={savingPayment}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, savingPayment && { opacity: 0.6 }]}
                onPress={recordPayment} disabled={savingPayment}>
                {savingPayment
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.modalConfirmTxt}>Record</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ADD EVENT MODAL ───────────────────────────────────────────────── */}
      <Modal visible={showEventModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Event</Text>
            <TextInput style={s.modalInput} value={eventForm.name}
              onChangeText={v => setEventForm({ ...eventForm, name: v })}
              placeholder="Event name (e.g. Haldi, Wedding)" placeholderTextColor="#9CA3AF" />
            <TextInput style={s.modalInput} value={eventForm.date}
              onChangeText={v => setEventForm({ ...eventForm, date: v })}
              placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" />
            <TextInput style={s.modalInput} value={eventForm.location}
              onChangeText={v => setEventForm({ ...eventForm, location: v })}
              placeholder="Location (optional)" placeholderTextColor="#9CA3AF" />
            <TextInput style={[s.modalInput, { height: 64 }]} value={eventForm.notes}
              onChangeText={v => setEventForm({ ...eventForm, notes: v })}
              placeholder="Notes (optional)" placeholderTextColor="#9CA3AF" multiline />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowEventModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={addEvent}>
                <Text style={s.modalConfirmTxt}>Add Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Card({ icon, title, children, action }: {
  icon: string; title: string; children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHdr}>
        <View style={s.cardIconBox}>
          <Ionicons name={icon as any} size={15} color="#0F5132" />
        </View>
        <Text style={s.cardTitle}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={s.cardAction}>
            <Text style={s.cardActionTxt}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function ABtn({ icon, label, color, onPress, loading }: {
  icon: string; label: string; color: string;
  onPress: () => void; loading?: boolean;
}) {
  return (
    <TouchableOpacity style={[s.aBtn, { borderColor: color + '30' }]} onPress={onPress} activeOpacity={0.75}>
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Ionicons name={icon as any} size={18} color={color} />}
      <Text style={[s.aBtnTxt, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ContactBtn({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.contactBtn, { borderColor: color + '25' }]} onPress={onPress}>
      <Ionicons name={icon as any} size={15} color={color} />
      <Text style={[s.contactBtnTxt, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetailChip({ label, value, highlight, statusColor }: {
  label: string; value: string; highlight?: boolean; statusColor?: string;
}) {
  return (
    <View style={[s.chip, highlight && { borderColor: '#D4AF3730', backgroundColor: '#FFFBEB' }]}>
      <Text style={s.chipLabel}>{label}</Text>
      <Text style={[s.chipValue, statusColor ? { color: statusColor } : highlight ? { color: '#0F5132' } : {}]}
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ─── StyleSheet ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  loadingTxt: { marginTop: 12, fontSize: 13, color: '#6B7280' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14, gap: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8F5EF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D4AF3740' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusPillTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  // Payment Dashboard
  payDash: { margin: 16, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#D4AF3730', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  payDashTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: '#0F5132', marginBottom: 14 },
  payCardRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  payCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  payCardLabel: { fontSize: 9, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  payCardAmt: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  payCardSub: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  progressWrap: { marginTop: 8 },
  progressTrack: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#0F5132', borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLbl: { fontSize: 10, color: '#6B7280' },
  progressPct: { fontSize: 11, fontWeight: '700' },
  advanceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, padding: 10, backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' },
  advanceNoteTxt: { flex: 1, fontSize: 10, color: '#92400E', lineHeight: 15 },

  // Action buttons
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 8, marginBottom: 6 },
  aBtn: { flex: 1, minWidth: 70, alignItems: 'center', paddingVertical: 11, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  aBtnTxt: { fontSize: 10, fontWeight: '600' },

  // Card
  card: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D0', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1, overflow: 'hidden' },
  cardHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F5EF', backgroundColor: '#FDFCFA' },
  cardIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F8F5EF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D4AF3730' },
  cardTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0F5132', letterSpacing: 0.3 },
  cardAction: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F8F5EF', borderRadius: 8, borderWidth: 1, borderColor: '#D4AF3740' },
  cardActionTxt: { fontSize: 10, fontWeight: '700', color: '#0F5132' },

  // Customer card
  customerTop: { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8F5EF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D4AF3740' },
  avatarTxt: { fontSize: 18, fontWeight: '800', color: '#0F5132' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  customerPhone: { fontSize: 12, color: '#0F5132', marginTop: 2, fontWeight: '600' },
  customerEmail: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1, backgroundColor: '#FAFAFA' },
  contactBtnTxt: { fontSize: 12, fontWeight: '600' },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 16, marginBottom: 14, paddingVertical: 11, borderRadius: 11, backgroundColor: '#25D366' },
  reminderBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  reminderAmt: { fontSize: 10, color: 'rgba(255,255,255,.75)' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginBottom: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  paidBadgeTxt: { fontSize: 12, fontWeight: '700' },

  // Detail chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: { width: '47%', backgroundColor: '#F8F5EF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E8E0D0' },
  chipLabel: { fontSize: 8, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  chipValue: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },

  // Payment records
  payRecord: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F5EF' },
  payRecordDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  payRecordType: { fontSize: 11, fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 0.3 },
  payRecordMeta: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  payRecordAmt: { fontSize: 15, fontWeight: '800' },
  payRecordBadge: { marginTop: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  payRecordBadgeTxt: { fontSize: 9, fontWeight: '700' },

  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F5EF' },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37' },
  eventName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  eventMeta: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  eventDel: { padding: 4 },

  // Notes
  noteBlock: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F5EF' },
  noteLabel: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  noteText: { fontSize: 13, color: '#374151', fontStyle: 'italic', lineHeight: 19 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTxt: { fontSize: 12, color: '#9CA3AF' },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 4 },
  btnReject: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: '#FECACA' },
  btnRejectTxt: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  btnAccept: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 13, backgroundColor: '#0F5132', shadowColor: '#0F5132', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  btnAcceptTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDownload: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, backgroundColor: '#0F5132' },
  btnDownloadTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#E8E0D0', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F5132', marginBottom: 6 },
  modalSub: { fontSize: 11, color: '#6B7280', marginBottom: 18, lineHeight: 16 },
  modalInput: { backgroundColor: '#F8F5EF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a', marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#E5E7EB' },
  modalCancelTxt: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modalConfirm: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11, backgroundColor: '#0F5132', shadowColor: '#0F5132', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  modalConfirmTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  payTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  payTypeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  payTypeBtnActive: { borderColor: '#0F5132', backgroundColor: '#F0FDF4' },
  payTypeTxt: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
});
