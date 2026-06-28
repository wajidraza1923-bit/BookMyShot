import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { messagesAPI } from '../services/api';

export default function MessagesScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const res = await messagesAPI.getConversations();
      const data = res.data?.conversations || res.data?.data || res.data || [];
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    } finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  const onRefresh = async () => { setRefreshing(true); await loadConversations(); setRefreshing(false); };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.title}>Messages</Text></View>
        <View style={styles.emptyAuth}>
          <View style={styles.emptyIcon}><Ionicons name="chatbubble-outline" size={36} color={colors.textMuted} /></View>
          <Text style={styles.emptyTitle}>Sign in to view messages</Text>
          <Text style={styles.emptySubtitle}>Chat with creators about your bookings</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}><Text style={styles.signInText}>Sign In</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['4xl'] }} />
      ) : conversations.length > 0 ? (
        <FlatList
          data={conversations}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
          renderItem={({ item }) => {
            const otherUser = item.otherUser || item.user || {};
            const name = otherUser.name || 'User';
            const avatar = otherUser.avatar;
            const lastMsg = item.lastMessage?.content || item.lastMessage || '';
            const time = item.lastMessage?.createdAt ? getTimeAgo(item.lastMessage.createdAt) : '';
            const unread = item.unreadCount || 0;

            return (
              <TouchableOpacity style={styles.chatItem} activeOpacity={0.7} onPress={() => navigation.navigate('BookingChat', { bookingId: item.bookingId || item._id })}>
                <Image source={{ uri: avatar || 'https://via.placeholder.com/50' }} style={styles.avatar} />
                <View style={styles.chatInfo}>
                  <View style={styles.chatTop}>
                    <Text style={[styles.chatName, unread > 0 && styles.chatNameBold]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.chatTime, unread > 0 && { color: colors.primary }]}>{time}</Text>
                  </View>
                  <View style={styles.chatBottom}>
                    <Text style={[styles.chatMsg, unread > 0 && styles.chatMsgBold]} numberOfLines={1}>{lastMsg || (item.eventType ? `📷 ${item.eventType}` : 'Start chatting...')}</Text>
                    {unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread}</Text></View>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item, index) => item._id || String(index)}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} /></View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Start a conversation by booking a creator</Text>
        </View>
      )}
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.lg },
  title: { ...typography.displaySm, color: colors.text },
  newBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: colors.border },
  chatInfo: { flex: 1, marginLeft: spacing.md },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { ...typography.headlineSm, color: colors.text, flex: 1, marginRight: spacing.sm },
  chatNameBold: { fontWeight: '700' },
  chatTime: { ...typography.caption, color: colors.textMuted },
  chatBottom: { flexDirection: 'row', alignItems: 'center' },
  chatMsg: { ...typography.bodySm, color: colors.textMuted, flex: 1, marginRight: spacing.sm },
  chatMsgBold: { color: colors.textSecondary, fontWeight: '500' },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { fontSize: 10, fontWeight: '800', color: colors.textInverse },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing['6xl'] },
  emptyAuth: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  emptyTitle: { ...typography.headlineMd, color: colors.text },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  signInBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, paddingHorizontal: spacing['3xl'], paddingVertical: spacing.md, borderRadius: radius.md },
  signInText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
});
