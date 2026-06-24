import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminUsers({ navigation }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data?.users || []);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load users');
      setUsers([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const deleteUser = (id: string, name: string) => {
    Alert.alert('Delete User', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/admin/users/${id}`);
          await load();
          Alert.alert('Deleted', 'User removed.');
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.message || 'Failed to delete');
        }
      }}
    ]);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Users</Text>
        <Text style={s.count}>{users.length}</Text>
      </View>

      <View style={s.infoBar}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={s.infoText}>Showing normal app users only. Creators are managed in Creator Management.</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={users}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={40} color={colors.textMuted} /><Text style={s.emptyText}>No users registered yet</Text></View>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.avatar}><Ionicons name="person" size={18} color={colors.textMuted} /></View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.name || 'User'}</Text>
                  <Text style={s.cardEmail}>{item.email}</Text>
                  {item.phone ? <Text style={s.cardMeta}>{item.phone}</Text> : null}
                </View>
                <Text style={s.cardDate}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</Text>
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.deleteBtn} onPress={() => deleteUser(item._id, item.name)}>
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={s.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  count: { ...typography.labelMd, color: colors.primary, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  infoBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  infoText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardEmail: { ...typography.caption, color: colors.textMuted },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  cardDate: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', marginTop: spacing.sm, justifyContent: 'flex-end' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  deleteText: { ...typography.labelSm, color: colors.error, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMd, color: colors.textMuted },
});
