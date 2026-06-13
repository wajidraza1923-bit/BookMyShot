import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const STATUS_FLOW = ['Booking Created', 'Creator Accepted', 'Payment Submitted', 'Payment Approved', 'Event Scheduled', 'Completed'];

export default function CreatorBookings({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [amountInput, setAmountInput] = useState('');
  const [showAmountModal, setShowAmountModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/booking-requests');
      setBookings(res.data?.bookings || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = bookings.filter(b => {
    if (tab === 'all') return true;
    if (tab === 'pending') return b.status === 'Booking Created';
    if (tab === 'active') return ['Creator Accepted', 'Payment Submitted', 'Payment Approved', 'Event Scheduled'].includes(b.status);
    if (tab === 'done') return b.status === 'Completed' || b.status === 'completed';
    if (tab === 'rejected') return b.status === 'rejected' || b.status === 'cancelled';
    return true;
  });

  // Accept booking: requires amount input (same as website)
  const handleAccept = (booking: any) => {
    setSelectedBooking(booking);
    setAmountInput(String(booking.amount || booking.budget || ''));
    setShowAmountModal(true);
  };

  const confirmAccept = async () => {
    const amount = parseInt(amountInput) || 0;
    if (amount <= 0) { Alert.alert('Error', 'Enter a valid booking amount'); return; }
    try {
      await api.patch(`/creator/booking-requests/${selectedBooking._id}`, { status: 'Creator Accepted', amount });
      setShowAmountModal(false);
      setSelectedBooking(null);
      await load();
      Alert.alert('Accepted', `Booking accepted for ₹${amount.toLocaleString('en-IN')}`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to accept'); }
  };

  // Reject booking
  const handleReject = (booking: any) => {
    Alert.alert('Reject Booking', `Reject booking from ${booking.clientName || 'client'}?`, [
      { text: 'Cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await api.patch(`/creator/booking-requests/${booking._id}`, { status: 'rejected' });
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  // Mark completed
  const handleComplete = (booking: any) => {
    Alert.alert('Complete Booking', 'Mark this booking as completed?', [
      { text: 'Cancel' },
      { text: 'Complete', onPress: async () => {
        try {
          await api.patch(`/creator/bookings/${booking._id}/complete`);
          await load();
          Alert.alert('Done', 'Booking marked as completed');
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  const getColor = (s: string) => {
    if (s === 'Completed' || s === 'completed') return colors.success;
    if (s === 'Booking Created') return colors.warning;
    if (s === 'rejected' || s === 'cancelled') return colors.error;
    if (s?.includes('Accepted') || s?.includes('Scheduled') || s?.includes('Approved')) return colors.info;
    return colors.textMuted;
  };

  const getActions = (booking: any) => {
    switch (booking.status) {
      case 'Booking Created':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(booking)}><Ionicons name="close" size={14} color={colors.error} /><Text style={styles.rejectText}>Reject</Text></TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(booking)}><Ionicons name="checkmark" size={14} color={colors.textInverse} /><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
          </View>
        );
      case 'Creator Accepted':
      case 'Payment Submitted':
      case 'Payment Approved':
      case 'Event Scheduled':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(booking)}><Ionicons name="checkmark-done" size={14} color={colors.success} /><Text style={styles.completeText}>Mark Complete</Text></TouchableOpacity>
          </View>
        );
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.count}>{bookings.length}</Text>
      </View>

      {/* Tabs */}
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
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No bookings in this tab</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Client Info */}
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.clientName || item.user?.name || 'Client'}</Text>
                  <Text style={styles.cardMeta}>{item.clientEmail || item.user?.email || ''}</Text>
                  {item.clientPhone && <Text style={styles.cardMeta}>{item.clientPhone}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: getColor(item.status) + '15', borderColor: getColor(item.status) + '30' }]}>
                  <Text style={[styles.badgeText, { color: getColor(item.status) }]} numberOfLines={1}>{item.status}</Text>
                </View>
              </View>

              {/* Event Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="camera-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.detailText}>{item.eventType || 'Event'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.detailText}>{item.eventDate ? new Date(item.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
                </View>
                {item.eventLocation && <View style={styles.detailItem}><Ionicons name="location-outline" size={13} color={colors.textMuted} /><Text style={styles.detailText}>{item.eventLocation}</Text></View>}
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={13} color={colors.primary} />
                  <Text style={[styles.detailText, { color: colors.primary, fontWeight: '600' }]}>₹{(item.amount || item.budget || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Commission info */}
              {item.commissionAmount > 0 && (
                <View style={styles.commRow}>
                  <Text style={styles.commLabel}>Commission ({item.commissionPercent || 5}%):</Text>
                  <Text style={styles.commValue}>₹{item.commissionAmount.toLocaleString('en-IN')}</Text>
                  <Text style={styles.commLabel}> | You receive:</Text>
                  <Text style={[styles.commValue, { color: colors.success }]}>₹{(item.creatorReceivable || 0).toLocaleString('en-IN')}</Text>
                </View>
              )}

              {/* Message */}
              {item.message && <Text style={styles.cardMessage} numberOfLines={2}>"{item.message}"</Text>}

              {/* Payment status */}
              {item.paymentStatus && item.paymentStatus !== 'unpaid' && (
                <View style={styles.paymentRow}>
                  <Ionicons name="card-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.paymentText}>Payment: {item.paymentStatus}</Text>
                </View>
              )}

              {/* Actions */}
              {getActions(item)}
            </View>
          )}
        />
      )}

      {/* Amount Modal (same as website prompt) */}
      <Modal visible={showAmountModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Accept Booking</Text>
            <Text style={styles.modalSubtitle}>Enter the booking amount (₹). Commission will be calculated on this.</Text>
            <TextInput
              style={styles.modalInput}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="numeric"
              placeholder="e.g. 45000"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              autoFocus
            />
            {amountInput && parseInt(amountInput) > 0 && (
              <Text style={styles.modalCalc}>Commission (5%): ₹{Math.round(parseInt(amountInput) * 0.05).toLocaleString('en-IN')} | You receive: ₹{Math.round(parseInt(amountInput) * 0.95).toLocaleString('en-IN')}</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAmountModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmAccept}><Text style={styles.modalConfirmText}>Accept ₹{amountInput || '0'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardInfo: { flex: 1, marginRight: spacing.sm },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1, maxWidth: 120 },
  badgeText: { ...typography.labelSm, fontWeight: '600', fontSize: 9 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { ...typography.bodySm, color: colors.textSecondary },
  commRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.sm, paddingTop: spacing.sm },
  commLabel: { ...typography.caption, color: colors.textMuted },
  commValue: { ...typography.labelSm, color: colors.error },
  cardMessage: { ...typography.bodySm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.sm },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  paymentText: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.primary },
  acceptText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  completeText: { ...typography.labelMd, color: colors.success, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 18 },
  modalInput: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary + '40', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.headlineMd, color: colors.primary, textAlign: 'center' },
  modalCalc: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalCancel: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { ...typography.labelLg, color: colors.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  modalConfirmText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
});
