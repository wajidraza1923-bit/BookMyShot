/**
 * BookMyShot — Booking Chat Screen
 * Real-time messaging tied to a specific booking.
 * Shows messages, typing indicator, read receipts, and enforces read-only on closed bookings.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import useRealTime from '../hooks/useRealTime';

export default function BookingChatScreen({ route, navigation }: any) {
  const { bookingId } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  // Load messages
  const load = useCallback(async () => {
    if (!bookingId) { setError('No booking ID provided'); setLoading(false); return; }
    try {
      const res = await api.get(`/messages/booking/${bookingId}`);
      // Verify response is valid JSON with expected shape
      if (!res.data || typeof res.data !== 'object') {
        setError('Chat service is currently unavailable. Please update the app or try again later.');
        return;
      }
      if (res.data.success === false) {
        setError(res.data.message || 'Chat is not available for this booking.');
        return;
      }
      setMessages(res.data?.messages || []);
      setBookingInfo(res.data?.booking || null);
      setError(null);
    } catch (e: any) {
      let msg = 'Failed to load chat';
      if (e.response) {
        const status = e.response.status;
        const data = e.response.data;
        if (typeof data === 'string' && (data.includes('<!DOCTYPE') || data.includes('<html'))) {
          msg = 'Chat service is updating. Please try again in a few minutes.';
        } else if (data?.message) {
          // Check for common MongoDB cast errors (old server)
          if (data.message.includes('Cast to ObjectId') || data.message.includes('CastError')) {
            msg = 'Chat requires a server update. The admin needs to deploy the latest code.';
          } else {
            msg = data.message;
          }
        } else if (status === 404) {
          msg = 'Chat endpoint not available. An app or server update may be required.';
        } else if (status === 403) {
          msg = 'Chat is not available for this booking. The booking must be accepted first.';
        } else if (status === 401) {
          msg = 'Session expired. Please log in again.';
        } else if (status === 500) {
          msg = 'Server error. Please try again or contact support.';
        } else {
          msg = `Unexpected error (${status}). Please try again.`;
        }
      } else if (e.request) {
        msg = 'Network error. Check your internet connection and try again.';
      } else {
        msg = e.message || 'An unknown error occurred.';
      }
      console.log(`[Chat] Load error: ${msg} (status: ${e.response?.status})`);
      setError(msg);
    } finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  // ═══ REAL-TIME: New messages ═══
  useRealTime('chat:message', (data: any) => {
    if (data.bookingId === bookingId && data.message) {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
      // Mark as read if I'm the receiver
      if (data.message.receiver === user?._id || data.message.receiver?._id === user?._id) {
        api.post(`/messages/booking/${bookingId}/read`).catch(() => {});
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  });

  // ═══ REAL-TIME: Read receipts ═══
  useRealTime('chat:read', (data: any) => {
    if (data.bookingId === bookingId) {
      setMessages(prev => prev.map(m => {
        if ((m.sender?._id || m.sender) === user?._id && !m.read) {
          return { ...m, read: true, readAt: new Date().toISOString() };
        }
        return m;
      }));
    }
  });

  // ═══ REAL-TIME: Typing indicator ═══
  useRealTime('chat:typing', (data: any) => {
    if (data.bookingId === bookingId && data.userId !== user?._id) {
      if (data.isTyping) {
        setTyping(data.userName || 'typing...');
        // Auto-clear after 3 seconds
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTyping(null), 3000);
      } else {
        setTyping(null);
      }
    }
  });

  // Send typing indicator when user types
  const handleTextChange = (value: string) => {
    setText(value);
    // Debounced typing indicator
    if (value.trim()) {
      api.post('/messages/typing', { bookingId, isTyping: true }).catch(() => {});
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setSending(true);
    setText('');
    // Stop typing indicator
    api.post('/messages/typing', { bookingId, isTyping: false }).catch(() => {});

    try {
      const res = await api.post(`/messages/booking/${bookingId}`, { content });
      if (!res.data?.deduplicated) {
        // Message will arrive via socket, but add optimistically if not already there
        const msg = res.data?.message;
        if (msg) {
          setMessages(prev => {
            if (prev.find(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        }
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setText(content); // Restore text on error
      const errMsg = e.response?.data?.message || e.message || 'Failed to send';
      console.log('[Chat] Send error:', errMsg);
      Alert.alert('Send Failed', errMsg);
    } finally {
      setSending(false);
    }
  };

  const isMyMessage = (msg: any) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId === user?._id;
  };

  const isReadOnly = bookingInfo?.readOnly === true;
  const otherName = bookingInfo?.clientName || bookingInfo?.eventType || 'Chat';

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
          <Text style={s.headerName}>Loading...</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
          <View style={s.headerInfo}><Text style={s.headerName}>Chat</Text></View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
          <Text style={{ ...typography.headlineSm, color: colors.text, marginTop: 16, textAlign: 'center' }}>Chat Unavailable</Text>
          <Text style={{ ...typography.bodyMd, color: colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>{error}</Text>
          <TouchableOpacity style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }} onPress={() => { setError(null); setLoading(true); load(); }}>
            <Text style={{ ...typography.labelMd, color: colors.textInverse }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerName} numberOfLines={1}>{otherName}</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {typing ? `${typing} is typing...` : bookingInfo?.eventType || 'Booking Chat'}
          </Text>
        </View>
        {isReadOnly && (
          <View style={s.readOnlyBadge}><Text style={s.readOnlyText}>Read Only</Text></View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 }}
        keyExtractor={(item, i) => item._id || String(i)}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
            <Text style={s.emptyText}>No messages yet</Text>
            <Text style={s.emptySubtext}>Send the first message to start the conversation</Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = isMyMessage(item);
          return (
            <View style={[s.msgRow, mine && s.msgRowMine]}>
              <View style={[s.msgBubble, mine ? s.msgBubbleMine : s.msgBubbleOther]}>
                <Text style={[s.msgText, mine && s.msgTextMine]}>{item.content}</Text>
                <View style={s.msgMeta}>
                  <Text style={[s.msgTime, mine && s.msgTimeMine]}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                  {mine && (
                    <Ionicons
                      name={item.read ? "checkmark-done" : item.delivered ? "checkmark-done-outline" : "checkmark"}
                      size={14}
                      color={item.read ? '#4FC3F7' : mine ? 'rgba(0,0,0,0.35)' : colors.textMuted}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Typing indicator */}
      {typing && (
        <View style={s.typingBar}>
          <Text style={s.typingText}>{typing} is typing...</Text>
        </View>
      )}

      {/* Input or Read-Only notice */}
      {isReadOnly ? (
        <View style={s.readOnlyBar}>
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          <Text style={s.readOnlyBarText}>This booking is closed. Chat is read-only.</Text>
        </View>
      ) : (
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Ionicons name="send" size={18} color={text.trim() ? colors.textInverse : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerInfo: { flex: 1 },
  headerName: { ...typography.headlineSm, color: colors.text },
  headerSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  readOnlyBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  readOnlyText: { ...typography.labelSm, color: colors.warning, fontSize: 9 },
  msgRow: { marginBottom: spacing.sm, alignItems: 'flex-start' },
  msgRowMine: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '78%', borderRadius: radius.lg, padding: spacing.md, paddingBottom: spacing.sm },
  msgBubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: spacing.xs },
  msgBubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: spacing.xs },
  msgText: { ...typography.bodyMd, color: colors.text, lineHeight: 20 },
  msgTextMine: { color: colors.textInverse },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.xs },
  msgTime: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  msgTimeMine: { color: 'rgba(0,0,0,0.4)' },
  typingBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  typingText: { ...typography.caption, color: colors.primary, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  readOnlyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  readOnlyBarText: { ...typography.bodySm, color: colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing['6xl'] },
  emptyText: { ...typography.headlineSm, color: colors.textMuted, marginTop: spacing.lg },
  emptySubtext: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
});
