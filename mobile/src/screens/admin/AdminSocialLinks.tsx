import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', placeholder: 'https://instagram.com/yourpage' },
  { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', placeholder: 'https://facebook.com/yourpage' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', placeholder: 'https://wa.me/91XXXXXXXXXX' },
  { key: 'twitter', label: 'X / Twitter', icon: 'logo-twitter', placeholder: 'https://x.com/yourhandle' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', placeholder: 'https://linkedin.com/company/yourpage' },
  { key: 'telegram', label: 'Telegram', icon: 'paper-plane-outline', placeholder: 'https://t.me/yourchannel' },
];

export default function AdminSocialLinks({ navigation }: any) {
  const [links, setLinks] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/social-links');
      setLinks(res.data?.data || {});
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load social links');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      PLATFORMS.forEach(p => { payload[p.key] = links[p.key] || ''; });
      await api.put('/admin/social-links', payload);
      Alert.alert('Saved', 'Social links updated successfully.\n\nChanges will reflect on both Website and App immediately.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const updateLink = (key: string, value: string) => {
    setLinks((prev: any) => ({ ...prev, [key]: value }));
  };

  const clearLink = (key: string) => {
    setLinks((prev: any) => ({ ...prev, [key]: '' }));
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Social Links</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
        
        <View style={s.infoCard}>
          <Ionicons name="sync-outline" size={16} color={colors.primary} />
          <Text style={s.infoText}>Changes sync instantly to both Website and Mobile App. One update = everywhere.</Text>
        </View>

        {PLATFORMS.map(platform => (
          <View key={platform.key} style={s.linkCard}>
            <View style={s.linkHeader}>
              <Ionicons name={platform.icon as any} size={18} color={links[platform.key] ? colors.primary : colors.textMuted} />
              <Text style={[s.linkLabel, links[platform.key] && { color: colors.text }]}>{platform.label}</Text>
              {links[platform.key] ? (
                <View style={s.activeBadge}><Text style={s.activeBadgeText}>Active</Text></View>
              ) : (
                <View style={s.inactiveBadge}><Text style={s.inactiveBadgeText}>Not Set</Text></View>
              )}
            </View>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={links[platform.key] || ''}
                onChangeText={(v) => updateLink(platform.key, v)}
                placeholder={platform.placeholder}
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {links[platform.key] ? (
                <TouchableOpacity style={s.clearBtn} onPress={() => clearLink(platform.key)}>
                  <Ionicons name="close-circle" size={18} color={colors.error} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="checkmark-circle" size={18} color="#000" /><Text style={s.saveBtnText}>Save All Links</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(249,115,22,0.06)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)', borderRadius: radius.lg, marginBottom: spacing.xl },
  infoText: { ...typography.bodySm, color: colors.textMuted, flex: 1 },
  linkCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  linkHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  linkLabel: { ...typography.headlineSm, color: colors.textMuted, flex: 1 },
  activeBadge: { backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { fontSize: 10, fontWeight: '600', color: colors.success },
  inactiveBadge: { backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, color: colors.text, fontSize: 13 },
  clearBtn: { marginLeft: spacing.sm, padding: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md + 4, marginTop: spacing.xl },
  saveBtnText: { ...typography.labelLg, color: '#000', fontWeight: '700' },
});
