import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminNotifications({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/notifications');
      setHistory(res.data?.notifications || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const sendToAll = async () => {
    if (!title.trim() || !message.trim()) { Alert.alert('Error', 'Title and message required'); return; }
    setSending(true);
    try {
      await api.post('/admin/notifications/send', { title: title.trim(), message: message.trim(), target: 'all_creators' });
      Alert.alert('Sent', 'Notification sent to all creators');
      setTitle(''); setMessage('');
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    finally { setSending(false); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
        {/* Send Section */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Send Notification</Text>
          <TextInput style={s.input} placeholder="Title" placeholderTextColor="rgba(255,255,255,0.2)" value={title} onChangeText={setTitle} />
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Message" placeholderTextColor="rgba(255,255,255,0.2)" value={message} onChangeText={setMessage} multiline />
          <TouchableOpacity style={s.sendBtn} onPress={sendToAll} disabled={sending}>
            {sending ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="send" size={14} color="#000" /><Text style={s.sendText}>Send to All Creators</Text></>}
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={s.sectionTitle}>Recent Notifications</Text>
        {history.slice(0, 15).map((n: any) => (
          <View key={n._id} style={s.histItem}>
            <Text style={s.histTitle}>{n.title}</Text>
            <Text style={s.histMsg} numberOfLines={1}>{n.message}</Text>
            <Text style={s.histTime}>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  cardTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, color: colors.text, fontSize: 13, marginBottom: spacing.sm },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.sm },
  sendText: { ...typography.labelMd, color: '#000', fontWeight: '700' },
  sectionTitle: { ...typography.headlineSm, color: colors.text, marginBottom: spacing.md },
  histItem: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  histTitle: { ...typography.bodySm, color: colors.text, fontWeight: '600' },
  histMsg: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  histTime: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontSize: 10 },
});
