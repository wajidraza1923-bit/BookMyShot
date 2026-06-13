import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';

const mockConversations = [
  { id: '1', name: 'Arjun Kapoor Studios', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', lastMessage: 'Sure, I can do the pre-wedding shoot on 15th July!', time: '2m ago', unread: 2, online: true },
  { id: '2', name: 'Priya Sharma Films', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', lastMessage: 'I\'ve sent you the final edited reel 🎬', time: '1h ago', unread: 0, online: true },
  { id: '3', name: 'Studio Luxe', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100', lastMessage: 'The booking is confirmed. See you!', time: '3h ago', unread: 1, online: false },
  { id: '4', name: 'Riya Makeover Studio', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', lastMessage: 'Can you share the venue details?', time: 'Yesterday', unread: 0, online: false },
  { id: '5', name: 'Vikram Photography', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', lastMessage: 'Photos from the Haldi ceremony are ready!', time: '2d ago', unread: 0, online: false },
];

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Conversations */}
      <FlatList
        data={mockConversations}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} activeOpacity={0.7}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              {item.online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatTop}>
                <Text style={[styles.chatName, item.unread > 0 && styles.chatNameBold]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.chatTime, item.unread > 0 && { color: colors.primary }]}>{item.time}</Text>
              </View>
              <View style={styles.chatBottom}>
                <Text style={[styles.chatMsg, item.unread > 0 && styles.chatMsgBold]} numberOfLines={1}>{item.lastMessage}</Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={i => i.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.lg },
  title: { ...typography.displaySm, color: colors.text },
  newBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatarContainer: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: colors.border },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.background },
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
});
