import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const SUGGESTIONS = [
  { title: '🎉 Special Discount!', body: 'Get {discount}% OFF on your next booking. Book now and save big!', audience: 'users' },
  { title: '💰 Cashback Alert!', body: 'Earn up to {cashback}% cashback on every booking. Don\'t miss out!', audience: 'users' },
  { title: '🔥 Limited Time Offer', body: 'Exclusive deals available for a limited time. Book your favourite creator today!', audience: 'users' },
  { title: '⚡ Flash Sale - 24 Hours Only', body: 'Hurry! Special prices on premium creators for the next 24 hours.', audience: 'users' },
  { title: '📸 New Creators Near You', body: 'We have added new verified creators in your area. Check them out!', audience: 'users' },
  { title: '⭐ Rate Your Experience', body: 'How was your last booking? Leave a review and help other customers.', audience: 'users' },
  { title: '🎁 Refer & Earn', body: 'Invite your friends to BookMyShot and earn rewards!', audience: 'users' },
  { title: '🚨 Payment Reminder', body: 'You have a pending payment. Complete it now to avoid losing your cashback!', audience: 'users' },
  { title: '📢 Profile Boost Available', body: 'Boost your profile to get more inquiries. Limited slots available!', audience: 'creators' },
  { title: '💎 Upgrade to Premium', body: 'Unlock unlimited leads and bookings. Subscribe now at special price!', audience: 'creators' },
  { title: '📊 Weekly Performance Report', body: 'Check your weekly stats. See how many views and inquiries you received.', audience: 'creators' },
  { title: '⚠️ Subscription Expiring Soon', body: 'Your subscription expires in 3 days. Renew now to stay visible.', audience: 'creators' },
  { title: '🏆 New Badge Earned', body: 'Congratulations! You have earned a new badge on your profile.', audience: 'creators' },
  { title: '📅 Update Your Availability', body: 'Keep your calendar updated to receive more bookings.', audience: 'creators' },
  { title: '🔧 System Maintenance', body: 'BookMyShot will be under maintenance tonight 2AM-4AM. Sorry for inconvenience.', audience: 'all' },
  { title: '🎊 Happy Festival Season!', body: 'Wishing you a wonderful festival season. Book now for upcoming celebrations!', audience: 'all' },
  { title: '📱 App Update Available', body: 'A new version of BookMyShot is available. Update now for the best experience.', audience: 'all' },
  { title: '🛑 Emergency: Service Disruption', body: 'We are experiencing technical issues. Our team is working on it. Thank you for patience.', audience: 'all' },
];

export default function AdminPushNotifications({ navigation }: any) {
  const [sending, setSending] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [audience, setAudience] = useState<'users' | 'creators' | 'all'>('all');

  const sendNotification = async (title: string, body: string, target: string) => {
    setSending(true);
    try {
      await api.post('/admin/push-broadcast', { title, body, audience: target });
      Alert.alert('✅ Sent!', `Push notification sent to ${target === 'all' ? 'everyone' : target}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send notification');
    } finally { setSending(false); }
  };

  const sendSuggestion = (sug: any) => {
    Alert.alert('Send Push Notification', `"${sug.title}"\n\nTo: ${sug.audience === 'all' ? 'Everyone' : sug.audience === 'users' ? 'All Customers' : 'All Creators'}`, [
      { text: 'Cancel' },
      { text: 'Send to Customers', onPress: () => sendNotification(sug.title, sug.body, 'users') },
      { text: 'Send to Creators', onPress: () => sendNotification(sug.title, sug.body, 'creators') },
      { text: 'Send to All', onPress: () => sendNotification(sug.title, sug.body, 'all') },
    ]);
  };

  const sendCustom = () => {
    if (!customTitle.trim() || !customBody.trim()) { Alert.alert('Required', 'Both title and message are required'); return; }
    sendNotification(customTitle.trim(), customBody.trim(), audience);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.title}>Push Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Quick Send Suggestions */}
        <Text style={s.secTitle}>⚡ Quick Send (Tap to send)</Text>
        <Text style={s.secDesc}>Pre-built notifications — tap any to send instantly</Text>

        {SUGGESTIONS.map((sug, i) => (
          <TouchableOpacity key={i} style={s.sugCard} onPress={() => sendSuggestion(sug)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={s.sugTitle}>{sug.title}</Text>
              <Text style={s.sugBody} numberOfLines={2}>{sug.body}</Text>
            </View>
            <View style={[s.sugBadge, { backgroundColor: sug.audience === 'users' ? '#ECFDF5' : sug.audience === 'creators' ? '#F3E8FF' : '#FEF3C7' }]}>
              <Text style={[s.sugBadgeText, { color: sug.audience === 'users' ? '#10B981' : sug.audience === 'creators' ? '#7C3AED' : '#F59E0B' }]}>
                {sug.audience === 'users' ? '👤' : sug.audience === 'creators' ? '📸' : '🌐'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Custom Notification */}
        <View style={s.customCard}>
          <Text style={s.customTitle}>✍️ Custom Notification</Text>
          <Text style={s.customDesc}>Write and send your own push notification</Text>

          <Text style={s.label}>Title</Text>
          <TextInput style={s.input} value={customTitle} onChangeText={setCustomTitle} placeholder="e.g. Special Announcement" placeholderTextColor="#9CA3AF" />

          <Text style={s.label}>Message</Text>
          <TextInput style={[s.input, { height: 80 }]} value={customBody} onChangeText={setCustomBody} placeholder="Write your notification message..." placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" />

          <Text style={s.label}>Send To</Text>
          <View style={s.audienceRow}>
            {(['users', 'creators', 'all'] as const).map(a => (
              <TouchableOpacity key={a} style={[s.audienceBtn, audience === a && s.audienceBtnActive]} onPress={() => setAudience(a)}>
                <Text style={[s.audienceBtnText, audience === a && s.audienceBtnTextActive]}>
                  {a === 'users' ? '👤 Customers' : a === 'creators' ? '📸 Creators' : '🌐 Everyone'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={sendCustom} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : (
              <><Ionicons name="send" size={16} color="#fff" /><Text style={s.sendBtnText}>Send Push Notification</Text></>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  scroll: { padding: 16, paddingBottom: 60 },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  secDesc: { fontSize: 11, color: '#6B7280', marginBottom: 14 },
  sugCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFBFC', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  sugTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  sugBody: { fontSize: 10, color: '#6B7280', marginTop: 3, lineHeight: 14 },
  sugBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  sugBadgeText: { fontSize: 14 },
  customCard: { backgroundColor: '#F8F6FF', borderRadius: 16, padding: 20, marginTop: 20, borderWidth: 1, borderColor: '#EDE9FE' },
  customTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  customDesc: { fontSize: 11, color: '#6B7280', marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, height: 44, fontSize: 13, color: '#1F2937' },
  audienceRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  audienceBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  audienceBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  audienceBtnText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  audienceBtnTextActive: { color: '#FFFFFF' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  sendBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
