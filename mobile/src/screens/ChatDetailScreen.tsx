import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ChatDetailScreen({ route, navigation }: any) {
  const { userId, userName, userAvatar } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/messages/${userId}`);
      setMessages(res.data?.messages || res.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); const interval = setInterval(load, 10000); return () => clearInterval(interval); }, [load]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/messages/${userId}`, { content: text.trim() });
      setText('');
      await load();
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch {} finally { setSending(false); }
  };

  const isMyMessage = (msg: any) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId === user?._id;
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Image source={{ uri: userAvatar || 'https://via.placeholder.com/40' }} style={styles.headerAvatar} />
        <Text style={styles.headerName} numberOfLines={1}>{userName || 'Chat'}</Text>
      </View>

      {/* Messages */}
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          ref={flatListRef}
          data={messages}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.md }}
          keyExtractor={(item, i) => item._id || String(i)}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No messages yet. Start the conversation!</Text></View>}
          renderItem={({ item }) => {
            const mine = isMyMessage(item);
            return (
              <View style={[styles.msgRow, mine && styles.msgRowMine]}>
                <View style={[styles.msgBubble, mine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
                  <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.content}</Text>
                  <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!text.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Ionicons name="send" size={18} color={text.trim() ? colors.textInverse : colors.textMuted} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderGold },
  headerName: { ...typography.headlineSm, color: colors.text, flex: 1 },
  msgRow: { marginBottom: spacing.sm, alignItems: 'flex-start' },
  msgRowMine: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '78%', borderRadius: radius.lg, padding: spacing.md, paddingBottom: spacing.sm },
  msgBubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: spacing.xs },
  msgBubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: spacing.xs },
  msgText: { ...typography.bodyMd, color: colors.text },
  msgTextMine: { color: colors.textInverse },
  msgTime: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(0,0,0,0.4)' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center' },
});
