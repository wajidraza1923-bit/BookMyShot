import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Format UTC date to IST: "14 Jun 2026, 2:01 PM"
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown';
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffset);
  const day = ist.getUTCDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[ist.getUTCMonth()];
  const year = ist.getUTCFullYear();
  let hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minuteStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${day} ${month} ${year}, ${hours}:${minuteStr} ${ampm}`;
}

export default function AdminSettings({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Commission fields only
  const [bmsCommission, setBmsCommission] = useState('');
  const [creatorCommission, setCreatorCommission] = useState('');

  // Original values
  const [original, setOriginal] = useState<{ bms: number; creator: number } | null>(null);
  const [lastUpdatedRaw, setLastUpdatedRaw] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/commission-settings');
      const comm = res.data?.data || res.data?.settings || res.data || {};

      const bms = comm.bmsLeadCommissionPercent || 0;
      const cr = comm.creatorLeadCommissionPercent || 0;

      setBmsCommission(String(bms));
      setCreatorCommission(String(cr));
      setOriginal({ bms, creator: cr });
      setHasChanges(false);

      if (comm.updatedAt) setLastUpdatedRaw(comm.updatedAt);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Detect changes
  useEffect(() => {
    if (!original) return;
    const changed = String(original.bms) !== bmsCommission || String(original.creator) !== creatorCommission;
    setHasChanges(changed);
  }, [bmsCommission, creatorCommission, original]);

  const handleSave = () => {
    const bc = Number(bmsCommission);
    const cc = Number(creatorCommission);
    if (isNaN(bc) || bc < 0 || bc > 100) return Alert.alert('Invalid', 'BMS commission must be 0–100%');
    if (isNaN(cc) || cc < 0 || cc > 100) return Alert.alert('Invalid', 'Creator commission must be 0–100%');

    Alert.alert('Confirm', `Save commission settings?\n\nBMS Lead: ${bc}%\nCreator Lead: ${cc}%`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: saveToBackend },
    ]);
  };

  const saveToBackend = async () => {
    setSaving(true);
    try {
      await api.put('/admin/commission-settings', {
        bmsLeadCommissionPercent: Number(bmsCommission),
        creatorLeadCommissionPercent: Number(creatorCommission),
      });
      Alert.alert('✓ Saved', 'Commission settings updated. All future calculations will use these values.');
      await load();
    } catch (e: any) {
      Alert.alert('Save Failed', e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
          <Text style={s.title}>Platform Settings</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Platform Settings</Text>
        {hasChanges && <View style={s.changedBadge}><Text style={s.changedText}>Unsaved</Text></View>}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>

          {/* Admin info */}
          <View style={s.infoBar}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={s.infoText}>Logged in as {user?.name || 'Super Admin'}</Text>
          </View>

          {/* Explanation */}
          <View style={s.explainCard}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={s.explainText}>Commission percentages applied to all bookings. BMS Lead = bookings from BookMyShot platform. Creator Lead = bookings from creator's own clients.</Text>
          </View>

          {/* Commission Settings */}
          <Text style={s.sectionLabel}>Commission Settings</Text>
          <View style={s.card}>
            <SettingField label="BMS Lead Commission" value={bmsCommission} onChangeText={setBmsCommission} suffix="%" placeholder="e.g. 5" />
            <SettingField label="Creator Lead Commission" value={creatorCommission} onChangeText={setCreatorCommission} suffix="%" placeholder="e.g. 3" isLast />
          </View>

          {/* Last Updated */}
          {lastUpdatedRaw && (
            <View style={s.lastUpdatedRow}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={s.lastUpdatedText}>Last updated: {formatDateTime(lastUpdatedRaw)}</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]} onPress={handleSave} disabled={!hasChanges || saving} activeOpacity={0.7}>
            {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={hasChanges ? colors.textInverse : colors.textMuted} />
                <Text style={[s.saveBtnText, !hasChanges && s.saveBtnTextDisabled]}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Audit notice */}
          <View style={s.auditNotice}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
            <Text style={s.auditText}>All changes are logged with admin ID, timestamp, and previous values for audit compliance.</Text>
          </View>

          {/* Navigation helpers */}
          <Text style={s.sectionLabel}>Other Settings</Text>
          <TouchableOpacity style={s.navCard} onPress={() => navigation.navigate('AdminSubscriptions')} activeOpacity={0.7}>
            <Ionicons name="diamond-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.navTitle}>Subscription Settings</Text>
              <Text style={s.navDesc}>Monthly price, trial days, renewal</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.navCard} onPress={() => navigation.navigate('AdminPromotions')} activeOpacity={0.7}>
            <Ionicons name="star-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.navTitle}>Promotion Settings</Text>
              <Text style={s.navDesc}>Featured prices, rank prices, slot management</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.navCard} onPress={() => navigation.navigate('AdminBusinessModel')} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={18} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={s.navTitle}>Business Model</Text>
              <Text style={s.navDesc}>Lead mode, pricing, free limits, unlock price</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SettingField({ label, value, onChangeText, prefix, suffix, placeholder, isLast }: any) {
  return (
    <View style={[fieldStyles.container, !isLast && fieldStyles.borderBottom]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        {prefix && <Text style={fieldStyles.prefix}>{prefix}</Text>}
        <TextInput style={fieldStyles.input} value={value} onChangeText={onChangeText} keyboardType="numeric" placeholder={placeholder} placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
        {suffix && <Text style={fieldStyles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { paddingVertical: spacing.lg },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { ...typography.labelSm, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  prefix: { ...typography.headlineMd, color: colors.primary, marginRight: spacing.xs },
  suffix: { ...typography.labelMd, color: colors.textSecondary, marginLeft: spacing.xs },
  input: { flex: 1, ...typography.headlineMd, color: colors.text, paddingVertical: spacing.md },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  changedBadge: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  changedText: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  infoBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  infoText: { ...typography.bodySm, color: colors.primary },
  explainCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xl, backgroundColor: 'rgba(59,130,246,0.06)', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(59,130,246,0.12)' },
  explainText: { ...typography.bodySm, color: colors.info, flex: 1, lineHeight: 18 },
  sectionLabel: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border },
  lastUpdatedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, justifyContent: 'center' },
  lastUpdatedText: { ...typography.caption, color: colors.textMuted },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing['2xl'] },
  saveBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  saveBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  saveBtnTextDisabled: { color: colors.textMuted },
  auditNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xl, paddingHorizontal: spacing.sm },
  auditText: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 16 },
  navCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  navTitle: { ...typography.headlineSm, color: colors.text },
  navDesc: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
