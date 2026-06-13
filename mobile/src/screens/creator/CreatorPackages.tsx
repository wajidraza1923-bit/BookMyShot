import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorPackages({ navigation }: any) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', description: '', features: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/packages');
      setPackages(res.data?.packages || res.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { Alert.alert('Error', 'Name and price are required'); return; }
    try {
      const pkg = { name: form.name, price: parseInt(form.price), description: form.description, features: form.features.split('\n').filter(Boolean) };
      await api.post('/creator/packages', pkg);
      setShowForm(false);
      setForm({ name: '', price: '', description: '', features: '' });
      setEditId(null);
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Package', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/creator/packages/${id}`); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Packages</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}><Ionicons name={showForm ? 'close' : 'add'} size={20} color={colors.primary} /></TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={styles.formWrap} contentContainerStyle={{ padding: spacing.lg }}>
          <TextInput style={styles.input} placeholder="Package name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={t => setForm({ ...form, name: t })} selectionColor={colors.primary} />
          <TextInput style={styles.input} placeholder="Price (₹)" placeholderTextColor={colors.textMuted} value={form.price} onChangeText={t => setForm({ ...form, price: t })} keyboardType="numeric" selectionColor={colors.primary} />
          <TextInput style={styles.input} placeholder="Description" placeholderTextColor={colors.textMuted} value={form.description} onChangeText={t => setForm({ ...form, description: t })} selectionColor={colors.primary} />
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Features (one per line)" placeholderTextColor={colors.textMuted} value={form.features} onChangeText={t => setForm({ ...form, features: t })} multiline selectionColor={colors.primary} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Save Package</Text></TouchableOpacity>
        </ScrollView>
      )}

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={packages}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="pricetag-outline" size={40} color={colors.textMuted} /><Text style={styles.emptyText}>No packages yet</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardPrice}>₹{(item.price || 0).toLocaleString('en-IN')}</Text>
              </View>
              {item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
              {item.features?.length > 0 && (
                <View style={styles.features}>
                  {item.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureRow}><Ionicons name="checkmark-circle" size={13} color={colors.primary} /><Text style={styles.featureText}>{f}</Text></View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}><Ionicons name="trash-outline" size={14} color={colors.error} /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  formWrap: { maxHeight: 320, marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, marginBottom: spacing.md },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardName: { ...typography.headlineSm, color: colors.text, flex: 1 },
  cardPrice: { ...typography.headlineMd, color: colors.primary },
  cardDesc: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.md },
  features: { gap: spacing.xs, marginBottom: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { ...typography.bodySm, color: colors.textSecondary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.06)' },
  deleteText: { ...typography.labelSm, color: colors.error },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
