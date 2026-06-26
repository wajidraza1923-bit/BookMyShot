/**
 * CreatorLeads — Premium Inquiry Management Screen
 * Uses BookMyShot custom modals instead of native Alert dialogs
 * Professional inquiry cards with all required info
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import PremiumModal from '../../components/PremiumModal';
import Toast from '../../components/Toast';

export default function CreatorLeads({ navigation }: any) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');
  const [processing, setProcessing] = useState(false);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; lead: any | null; action: 'accept' | 'reject' }>({ visible: false, lead: null, action: 'accept' });
  const [resultModal, setResultModal] = useState<{ visible: boolean; type: 'success' | 'error'; title: string; message: string; bookingCreated?: boolean }>({ visible: false, type: 'success', title: '', message: '' });
  const [toast, setToast] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; title: string; message?: string }>({ visible: false, type: 'info', title: '' });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/leads');
      setLeads(res.data?.inquiries || []);
    } catch (e: any) {
      setToast({ visible: true, type: 'error', title: 'Failed to load', message: e.response?.data?.message || 'Check your connection' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = leads.filter(l => {
    if (tab === 'all') return true;
    if (tab === 'pending') return l.status === 'pending';
    if (tab === 'accepted') return l.status === 'accepted';
    if (tab === 'rejected') return l.status === 'rejected';
    return true;
  });

  // Show accept confirmation modal
  const promptAccept = (lead: any) => {
    setConfirmModal({ visible: true, lead, action: 'accept' });
  };

  // Show reject confirmation modal
  const promptReject = (lead: any) => {
    setConfirmModal({ visible: true, lead, action: 'reject' });
  };

  // Execute accept
  const executeAccept = async () => {
    const lead = confirmModal.lead;
    setConfirmModal({ visible: false, lead: null, action: 'accept' });
    setProcessing(true);
    try {
      const res = await api.patch(`/creator/inquiries/${lead._id}/reply`, { status: 'accepted' });
      await load();
      setResultModal({
        visible: true,
        type: 'success',
        title: '🎉 Booking Created Successfully',
        message: 'The inquiry has been accepted and the booking has been created successfully.',
        bookingCreated: !!res.data?.booking,
      });
    } catch (e: any) {
      setResultModal({
        visible: true,
        type: 'error',
        title: 'Failed to Accept',
        message: e.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally { setProcessing(false); }
  };

  // Execute reject
  const executeReject = async () => {
    const lead = confirmModal.lead;
    setConfirmModal({ visible: false, lead: null, action: 'reject' });
    setProcessing(true);
    try {
      await api.patch(`/creator/inquiries/${lead._id}/reply`, { status: 'rejected' });
      await load();
      setToast({ visible: true, type: 'info', title: 'Inquiry Rejected', message: `${lead.name}'s inquiry has been declined.` });
    } catch (e: any) {
      setResultModal({
        visible: true,
        type: 'error',
        title: 'Failed to Reject',
        message: e.response?.data?.message || 'Something went wrong.',
      });
    } finally { setProcessing(false); }
  };

  const getStatusColor = (s: string) => s === 'accepted' ? colors.success : s === 'rejected' ? colors.error : colors.warning;

  const pendingCount = leads.filter(l => l.status === 'pending').length;

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={st.title}>Inquiries</Text>
        {pendingCount > 0 && (
          <View style={st.pendingBadge}>
            <Text style={st.pendingText}>{pendingCount}</Text>
          </View>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('CreateInquiry')} style={st.addBtn}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={st.tabs}>
        {['all', 'pending', 'accepted', 'rejected'].map(t => (
          <TouchableOpacity key={t} style={[st.tab, tab === t && st.tabActive]} onPress={() => setTab(t)}>
            <Text style={[st.tabText, tab === t && st.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={st.loadingText}>Loading inquiries...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={
            <View style={st.empty}>
              <View style={st.emptyIcon}>
                <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={st.emptyTitle}>No inquiries yet</Text>
              <Text style={st.emptySub}>New inquiries will appear here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={st.card}>
              {/* Card Header */}
              <View style={st.cardHead}>
                <View style={st.cardAvatar}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={st.cardInfo}>
                  <Text style={st.cardName}>{item.name || 'Client'}</Text>
                  {item.phone && <Text style={st.cardContact}>📞 {item.phone}</Text>}
                  {item.user?.email && <Text style={st.cardContact}>✉ {item.user.email}</Text>}
                </View>
                <View style={[st.badge, { backgroundColor: getStatusColor(item.status) + '12' }]}>
                  <View style={[st.badgeDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={[st.badgeText, { color: getStatusColor(item.status) }]}>{item.status || 'pending'}</Text>
                </View>
              </View>

              {/* Details Grid */}
              <View style={st.detailGrid}>
                <DetailChip icon="camera-outline" text={item.eventType || 'Event'} />
                {item.eventDate && <DetailChip icon="calendar-outline" text={new Date(item.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />}
                {item.city && <DetailChip icon="location-outline" text={item.city} />}
                {item.budget > 0 && <DetailChip icon="cash-outline" text={`₹${item.budget.toLocaleString('en-IN')}`} highlight />}
              </View>

              {/* Message */}
              {item.message && (
                <View style={st.messageWrap}>
                  <Text style={st.messageText} numberOfLines={3}>"{item.message}"</Text>
                </View>
              )}

              {/* Inquiry ID + Time */}
              <View style={st.metaRow}>
                <Text style={st.metaId}>ID: {item._id?.slice(-8).toUpperCase()}</Text>
                <Text style={st.metaTime}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </Text>
              </View>

              {/* Contact Actions */}
              {item.phone && (
                <View style={st.contactRow}>
                  <TouchableOpacity style={st.contactBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                    <Ionicons name="call" size={14} color="#3B82F6" />
                    <Text style={st.contactText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.contactBtn} onPress={() => Linking.openURL(`https://wa.me/91${item.phone.replace(/\D/g, '').slice(-10)}`)}>
                    <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                    <Text style={st.contactText}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.contactBtn} onPress={() => {}}>
                    <Ionicons name="eye-outline" size={14} color={colors.primary} />
                    <Text style={st.contactText}>Details</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Accept / Reject (only for pending) */}
              {item.status === 'pending' && (
                <View style={st.actionRow}>
                  <TouchableOpacity style={st.rejectBtn} onPress={() => promptReject(item)}>
                    <Ionicons name="close" size={15} color={colors.error} />
                    <Text style={st.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.acceptBtn} onPress={() => promptAccept(item)}>
                    <Ionicons name="checkmark" size={15} color="#000" />
                    <Text style={st.acceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* ═══ ACCEPT CONFIRMATION MODAL ═══ */}
      <PremiumModal
        visible={confirmModal.visible && confirmModal.action === 'accept'}
        onClose={() => setConfirmModal({ visible: false, lead: null, action: 'accept' })}
        type="confirm"
        title="Accept Inquiry"
        message="Are you sure you want to accept this inquiry? A booking will be created automatically."
        details={confirmModal.lead ? [
          { label: 'Customer', value: confirmModal.lead.name || 'Client' },
          { label: 'Event Type', value: confirmModal.lead.eventType || 'Event' },
          { label: 'Event Date', value: confirmModal.lead.eventDate ? new Date(confirmModal.lead.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
          { label: 'Budget', value: confirmModal.lead.budget ? `₹${confirmModal.lead.budget.toLocaleString('en-IN')}` : '—' },
          { label: 'Location', value: confirmModal.lead.city || '—' },
        ] : []}
        buttons={[
          { text: 'Cancel', onPress: () => setConfirmModal({ visible: false, lead: null, action: 'accept' }), variant: 'secondary' },
          { text: '✅ Accept Inquiry', onPress: executeAccept, variant: 'primary' },
        ]}
      />

      {/* ═══ REJECT CONFIRMATION MODAL ═══ */}
      <PremiumModal
        visible={confirmModal.visible && confirmModal.action === 'reject'}
        onClose={() => setConfirmModal({ visible: false, lead: null, action: 'reject' })}
        type="warning"
        title="Reject Inquiry"
        message={`Are you sure you want to decline ${confirmModal.lead?.name || 'this client'}'s inquiry?`}
        buttons={[
          { text: 'Cancel', onPress: () => setConfirmModal({ visible: false, lead: null, action: 'reject' }), variant: 'secondary' },
          { text: 'Reject', onPress: executeReject, variant: 'destructive' },
        ]}
      />

      {/* ═══ SUCCESS/ERROR RESULT MODAL ═══ */}
      <PremiumModal
        visible={resultModal.visible}
        onClose={() => setResultModal({ ...resultModal, visible: false })}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        buttons={resultModal.bookingCreated ? [
          { text: 'View Bookings', onPress: () => { setResultModal({ ...resultModal, visible: false }); navigation.navigate('CreatorBookings'); }, variant: 'primary' },
          { text: 'Done', onPress: () => setResultModal({ ...resultModal, visible: false }), variant: 'secondary' },
        ] : [
          { text: 'OK', onPress: () => setResultModal({ ...resultModal, visible: false }), variant: 'primary' },
        ]}
      />

      {/* ═══ TOAST ═══ */}
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      {/* Processing overlay */}
      {processing && (
        <View style={st.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={st.processingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

function DetailChip({ icon, text, highlight }: { icon: string; text: string; highlight?: boolean }) {
  return (
    <View style={[st.chip, highlight && st.chipHighlight]}>
      <Ionicons name={icon as any} size={12} color={highlight ? colors.primary : colors.textMuted} />
      <Text style={[st.chipText, highlight && { color: colors.primary, fontWeight: '700' }]}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  pendingBadge: { backgroundColor: colors.warning + '20', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: colors.warning + '30' },
  pendingText: { ...typography.labelSm, color: colors.warning, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { ...typography.bodySm, color: colors.textMuted },
  // Empty
  empty: { alignItems: 'center', paddingTop: spacing['4xl'], gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  emptyTitle: { ...typography.headlineSm, color: colors.textSecondary },
  emptySub: { ...typography.bodySm, color: colors.textMuted },
  // Card
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  cardInfo: { flex: 1 },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardContact: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { ...typography.labelSm, fontWeight: '700', textTransform: 'capitalize', fontSize: 10 },
  // Details
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  chipHighlight: { borderColor: colors.primary + '30', backgroundColor: colors.primaryMuted },
  chipText: { ...typography.caption, color: colors.textSecondary, fontSize: 11 },
  // Message
  messageWrap: { backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.primary + '30' },
  messageText: { ...typography.bodySm, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  // Meta
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  metaId: { ...typography.caption, color: colors.textMuted, fontFamily: 'monospace' },
  metaTime: { ...typography.caption, color: colors.textMuted },
  // Contact
  contactRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  contactText: { ...typography.labelSm, color: colors.text, fontWeight: '500' },
  // Actions
  actionRow: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '700' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primary },
  acceptText: { ...typography.labelMd, color: '#000', fontWeight: '700' },
  // Processing
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', gap: 12 },
  processingText: { ...typography.bodyMd, color: 'rgba(255,255,255,0.6)' },
});
