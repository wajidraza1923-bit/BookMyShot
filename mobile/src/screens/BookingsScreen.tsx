import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI } from '../services/api';
import api from '../services/api';

const tabs = ['Upcoming', 'Completed', 'Cancelled'];

export default function BookingsScreen({ navigation }: any) {
  const { isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const res = role === 'creator' ? await bookingsAPI.getCreatorBookings() : await bookingsAPI.getUserBookings();
      const data = res.data?.bookings || res.data?.data || [];
      setBookings(data);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  }, [isAuthenticated, role]);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  const onRefresh = async () => { setRefreshing(true); await loadBookings(); setRefreshing(false); };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('accept') || s.includes('confirm') || s.includes('scheduled')) return '#10B981';
    if (s.includes('complete')) return '#3B82F6';
    if (s.includes('cancel') || s.includes('reject')) return '#EF4444';
    return '#F59E0B';
  };

  const filterBookings = () => bookings.filter(b => {
    const s = (b.status || '').toLowerCase();
    if (activeTab === 'Upcoming') return !s.includes('complete') && !s.includes('cancel') && !s.includes('reject');
    if (activeTab === 'Completed') return s.includes('complete');
    return s.includes('cancel') || s.includes('reject');
  });

  // Upload payment proof
  const uploadProof = async (bookingId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to photos to upload proof.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: false });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.uri) return;

    setUploading(bookingId);
    try {
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, type: 'image/jpeg', name: 'payment-proof.jpg' } as any);
      formData.append('folder', 'bookmyshot/payment-proofs');

      // Upload to Cloudinary via backend
      const uploadRes = await api.post('/creator/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl = uploadRes.data?.url;

      if (!imageUrl) { Alert.alert('Error', 'Upload failed'); setUploading(null); return; }

      // Create payment proof record
      await api.post('/payment-proofs', { bookingId, amount: 0, screenshot: imageUrl, note: 'Payment proof uploaded from app' });

      Alert.alert('Success ✅', 'Payment proof uploaded successfully. The creator will be notified.');
      await loadBookings();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to upload');
    } finally { setUploading(null); }
  };

  if (!isAuthenticated) {
    return (
      <View style={s.container}>
        <View style={s.header}><Text style={s.title}>My Bookings</Text></View>
        <View style={s.emptyAuth}>
          <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Sign in required</Text>
          <TouchableOpacity style={s.signInBtn} onPress={() => navigation.navigate('Login')}><Text style={s.signInText}>Sign In</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const filtered = filterBookings();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>My Bookings</Text>
        <View style={s.badge}><Text style={s.badgeText}>{bookings.length}</Text></View>
      </View>

      <View style={s.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
          {filtered.length > 0 ? filtered.map(b => {
            const creatorName = b.creator?.user?.name || b.clientName || 'Creator';
            const creatorAvatar = typeof b.creator?.user?.avatar === 'string' ? b.creator.user.avatar : '';
            const eventDate = b.eventDate ? new Date(b.eventDate) : null;
            const validDate = eventDate && eventDate.getFullYear() > 2000;
            const amount = b.amount || b.budget || 0;
            const paid = b.advancePaid || 0;
            const remaining = amount - paid;
            const paymentPct = amount > 0 ? Math.min(100, Math.round((paid / amount) * 100)) : 0;
            const statusColor = getStatusColor(b.status);

            return (
              <View key={b._id} style={s.card}>
                {/* Header */}
                <View style={s.cardHead}>
                  {creatorAvatar ? <Image source={{ uri: creatorAvatar }} style={s.avatar} /> : <View style={[s.avatar, { backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="person" size={16} color="#F97316" /></View>}
                  <View style={{ flex: 1 }}>
                    <Text style={s.creatorName}>{creatorName}</Text>
                    <Text style={s.eventType}>{b.eventType || 'Booking'}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{b.status}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={s.details}>
                  <DetailRow icon="calendar" label="Event Date" value={validDate ? eventDate!.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                  {b.eventLocation ? <DetailRow icon="location" label="Location" value={b.eventLocation} /> : null}
                  <DetailRow icon="wallet" label="Amount" value={`₹${amount.toLocaleString('en-IN')}`} highlight />
                  {paid > 0 && <DetailRow icon="checkmark-circle" label="Paid" value={`₹${paid.toLocaleString('en-IN')}`} color="#10B981" />}
                  {remaining > 0 && <DetailRow icon="alert-circle" label="Remaining" value={`₹${remaining.toLocaleString('en-IN')}`} color="#F59E0B" />}
                  <DetailRow icon="card" label="Payment" value={b.paymentStatus || 'unpaid'} />
                </View>

                {/* Payment Progress */}
                {amount > 0 && (
                  <View style={s.progressWrap}>
                    <View style={s.progressBar}><View style={[s.progressFill, { width: `${paymentPct}%` }]} /></View>
                    <Text style={s.progressText}>{paymentPct}% paid</Text>
                  </View>
                )}

                {/* Chat Button — only for accepted bookings */}
                {['Creator Accepted', 'Payment Submitted', 'Payment Approved', 'Event Scheduled'].includes(b.status) && (
                  <TouchableOpacity style={s.chatBtn} onPress={() => navigation.navigate('BookingChat', { bookingId: b._id })} activeOpacity={0.7}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                    <Text style={s.chatBtnText}>Chat with Creator</Text>
                  </TouchableOpacity>
                )}

                {/* Upload Proof Button */}
                {b.paymentStatus !== 'paid' && b.paymentStatus !== 'verified' && b.status !== 'rejected' && b.status !== 'cancelled' && (
                  <TouchableOpacity style={s.uploadBtn} onPress={() => navigation.navigate('PaymentProof', { bookingId: b._id, totalAmount: amount, paidAmount: paid, creatorName })}>
                    <Ionicons name="card-outline" size={16} color="#000" />
                    <Text style={s.uploadText}>Pay Now / Upload Proof</Text>
                  </TouchableOpacity>
                )}

                {/* Invoice buttons — only for completed bookings */}
                {(b.status === 'Completed' || b.status === 'completed') && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TouchableOpacity style={[s.chatBtn, { flex: 1 }]} onPress={async () => {
                      try {
                        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                        const Print = require('expo-print');
                        const tkn = await AsyncStorage.getItem('bms_token');
                        const resp = await fetch(`https://site--bookmyshot--ykz2mr8mzlrv.code.run/api/invoice/${b._id}?token=${encodeURIComponent(tkn || '')}`, { headers: { 'Authorization': `Bearer ${tkn}`, 'x-access-token': tkn || '' } });
                        const htm = await resp.text();
                        if (!resp.ok || htm.includes('"success":false')) { Alert.alert('Error', 'Failed to load invoice'); return; }
                        await Print.printAsync({ html: htm });
                      } catch { Alert.alert('Error', 'Invoice download failed'); }
                    }} activeOpacity={0.7}>
                      <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                      <Text style={s.chatBtnText}>Download Invoice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.chatBtn, { flex: 1, borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.04)' }]} onPress={async () => {
                      try {
                        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                        const tkn = await AsyncStorage.getItem('bms_token');
                        const invoiceUrl = `https://site--bookmyshot--ykz2mr8mzlrv.code.run/api/invoice/${b._id}?token=${encodeURIComponent(tkn || '')}`;
                        let shared = false;
                        try {
                          const Print = require('expo-print');
                          const Sharing = require('expo-sharing');
                          if (Print?.printToFileAsync && Sharing?.shareAsync) {
                            const resp = await fetch(invoiceUrl, { headers: { 'Authorization': `Bearer ${tkn}`, 'x-access-token': tkn || '' } });
                            let htm = await resp.text();
                            if (resp.ok && htm && !htm.includes('"success":false')) {
                              htm = htm.replace(/<button[^>]*class="print-btn"[^>]*>.*?<\/button>/gi, '');
                              const result = await Print.printToFileAsync({ html: htm });
                              if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Share Invoice' }); shared = true; }
                            }
                          }
                        } catch {}
                        if (!shared) { Linking.openURL(invoiceUrl); }
                      } catch { Alert.alert('Error', 'Share failed'); }
                    }} activeOpacity={0.7}>
                      <Ionicons name="share-outline" size={16} color="#22C55E" />
                      <Text style={[s.chatBtnText, { color: '#22C55E' }]}>Share PDF</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Booking meta */}
                <View style={s.meta}>
                  <Text style={s.metaText}>ID: {b.invoiceNumber || b._id?.slice(-8)}</Text>
                  <Text style={s.metaText}>{new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</Text>
                </View>
              </View>
            );
          }) : (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No {activeTab.toLowerCase()} bookings</Text>
              <Text style={s.emptySub}>Your bookings will appear here</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({ icon, label, value, highlight, color }: any) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon + '-outline'} size={13} color={color || colors.textMuted} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, highlight && { color: colors.primary, fontWeight: '700' }, color && { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  badge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  tabs: { flexDirection: 'row', marginHorizontal: 14, backgroundColor: colors.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  // Card
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border },
  creatorName: { fontSize: 13, fontWeight: '600', color: colors.text },
  eventType: { fontSize: 10, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  // Details
  details: { marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  detailLabel: { fontSize: 11, color: colors.textMuted, width: 70 },
  detailValue: { fontSize: 12, color: colors.text, flex: 1, textAlign: 'right' },
  // Progress
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 2 },
  progressText: { fontSize: 10, color: colors.textMuted },
  // Upload
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 10, marginBottom: 8 },
  uploadText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Chat
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primaryMuted, borderRadius: 10, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.borderGold },
  chatBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  // Meta
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 9, color: 'rgba(255,255,255,0.2)' },
  // Empty
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  emptySub: { fontSize: 12, color: '#9CA3AF' },
  emptyAuth: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  signInBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  signInText: { fontSize: 13, fontWeight: '700', color: '#000' },
});
