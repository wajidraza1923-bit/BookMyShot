import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorNotifications({ navigation }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data?.notifications || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return { name: 'calendar', color: colors.info };
      case 'payment': return { name: 'card', color: colors.success };
      case 'promotion': return { name: 'star', color: colors.primary };
      case 'subscription': return { name: 'diamond', color: colors.primary };
      case 'info': return { name: 'information-circle', color: colors.textSecondary };
      default: return { name: 'notifications', color: colors.primary };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markBtn}><Text style={styles.markText}>Mark all read</Text></TouchableOpacity>
        )}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={notifications}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No notifications</Text></View>}
          renderItem={({ item }) => {
            const icon = getIcon(item.type);
            const timeAgo = getTimeAgo(item.createdAt);
            return (
              <TouchableOpacity style={[styles.notifItem, !item.read && styles.notifUnread]} onPress={() => markRead(item._id)} activeOpacity={0.7}>
                <View style={[styles.notifIcon, { backgroundColor: icon.color + '15' }]}>
                  <Ionicons name={icon.name as any} size={18} color={icon.color} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.notifTime}>{timeAgo}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  markBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.sm, backgroundColor: colors.primaryMuted },
  markText: { ...typography.labelSm, color: colors.primary },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  notifUnread: { backgroundColor: 'rgba(212,175,55,0.03)' },
  notifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  notifContent: { flex: 1 },
  notifTitle: { ...typography.headlineSm, color: colors.text },
  notifMsg: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  notifTime: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
