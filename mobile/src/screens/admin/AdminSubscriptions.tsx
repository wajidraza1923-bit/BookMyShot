import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown';
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day} ${month} ${year}, ${hours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
}

export default function AdminSubscriptions({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tab, setTab] = useState<'settings' | 'creators'>('settings');

  // Settings fields
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [trialDays, setTrialDays] = useState('');
  const [gracePeriod, setGracePeriod] = useState('');
  const [autoRenewDefault, setAutoRenewDefault] = useState(true);
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);

  // Original values
  const [original, setOriginal] = useState<any>(null);
  const [lastUpdatedRaw, setLastUpdatedRaw] = useState<string | null>(null);

  // Creators with subscriptions
  const [creators, setCreators] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [settingsRes, creatorsRes] = await Promise.all([
        api.get('/admin/subscription-settings'),
        api.get('/admin/creator-accounts'),
      ]);

      const sub = settingsRes.data?.data || settingsRes.data?.settings || settingsRes.data || {};
      setMonthlyPrice(String(sub.monthlyPlanPrice || 0));
      setTrialDays(String(sub.trialDays || 0));
      setGracePeriod(String(sub.gracePeriodDays || 7));
      setAutoRenewDefault(sub.autoRenewDefault !== false);
      setFreeTrialEnabled(sub.freeTrialEnabled !== false);
      setOriginal({
        monthlyPlanPrice: sub.monthlyPlanPrice || 0,
        trialDays: sub.trialDays || 0,
        gracePeriodDays: sub.gracePeriodDays || 7,
      });
      setHasChanges(false);
      if (sub.updatedAt) setLastUpdatedRaw(sub.updatedAt);

      const allCreators = creatorsRes.data?.creators || [];
      setCreators(allCreators.filter((c: any) => c.subscriptionStatus));
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Detect changes
  useEffect(() => {
    if (!original) return;
    const changed =
      String(original.monthlyPlanPrice) !== monthlyPrice ||
      String(original.trialDays) !== trialDays ||
      String(original.gracePeriodDays) !== gracePeriod;
    setHasChanges(changed);
  }, [monthlyPrice, trialDays, gracePeriod, original]);

  const handleSave = () => {
    const mp = Number(monthlyPrice);
    const td = Number(trialDays);
    const gp = Number(gracePeriod);
    if (isNaN(mp) || mp < 0) return Alert.alert('Invalid', 'Monthly price must be ≥ 0');
    if (isNaN(td) || td < 0 || !Number.isInteger(td)) return Alert.alert('Invalid', 'Trial days must be a whole number');
    if (isNaN(gp) || gp < 0) return Alert.alert('Invalid', 'Grace period must be ≥ 0');

    Alert.alert('Confirm', `Save subscription settings?\n\nMonthly Price: ₹${mp}\nTrial Days: ${td}\nGrace Period: ${gp} days`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: saveToBackend },
    ]);
  };

  const saveToBackend = async () => {
    setSaving(true);
    try {
      await api.put('/admin/subscription-settings', {
        monthlyPlanPrice: Number(monthlyPrice),
        trialDays: Number(trialDays),
        gracePeriodDays: Number(gracePeriod),
        autoRenewDefault,
        freeTrialEnabled,
      });
      Alert.alert('✓ Saved', 'Subscription settings updated. New creators will use these values.');
      await load();
    } catch (e: any) {
      Alert.alert('Save Failed', e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (st: string) => st === 'active' ? colors.success : st === 'trial' ? colors.info : st === 'expired' ? colors.error : st === 'overdue' ? colors.error : colors.warning;

  // Stats
  const activeCount = creators.filter(c => c.subscriptionStatus === 'active').length;
  const trialCount = creators.filter(c => c.subscriptionStatus === 'trial').length;
  const expiredCount = creators.filter(c => c.subscriptionStatus === 'expired' || c.subscriptionStatus === 'overdue').length;

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
          <Text style={s.title}>Subscriptions</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Subscriptions</Text>
        {hasChanges && <View style={s.changedBadge}><Text style={s.changedText}>Unsaved</Text></View>}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'settings' && s.tabActive]} onPress={() => setTab('settings')}>
          <Text style={[s.tabText, tab === 'settings' && s.tabTextActive]}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'creators' && s.tabActive]} onPress={() => setTab('creators')}>
          <Text style={[s.tabText, tab === 'creators' && s.tabTextActive]}>Creators ({creators.length})</Text>
        </TouchableOpacity>
      </View>

      {tab === 'settings' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>

            {/* Stats Row */}
            <View style={s.statsRow}>
              <View style={s.statBox}><Text style={[s.statVal, { color: colors.success }]}>{activeCount}</Text><Text style={s.statLabel}>Active</Text></View>
              <View style={s.statBox}><Text style={[s.statVal, { color: colors.info }]}>{trialCount}</Text><Text style={s.statLabel}>Trial</Text></View>
              <View style={s.statBox}><Text style={[s.statVal, { color: colors.error }]}>{expiredCount}</Text><Text style={s.statLabel}>Expired</Text></View>
            </View>

            {/* Editable Fields */}
            <Text style={s.sectionLabel}>Subscription Pricing</Text>
            <View style={s.card}>
              <SettingField label="Monthly Subscription Price" value={monthlyPrice} onChangeText={setMonthlyPrice} prefix="₹" placeholder="e.g. 499" />
              <SettingField label="Trial Days (New Creators)" value={trialDays} onChangeText={setTrialDays} suffix="days" placeholder="e.g. 30" />
              <SettingField label="Grace Period After Expiry" value={gracePeriod} onChangeText={setGracePeriod} suffix="days" placeholder="e.g. 7" isLast />
            </View>

            {/* Toggle options */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Free Trial Enabled</Text>
              <TouchableOpacity style={[s.toggle, freeTrialEnabled && s.toggleOn]} onPress={() => setFreeTrialEnabled(!freeTrialEnabled)}>
                <Text style={[s.toggleText, freeTrialEnabled && s.toggleTextOn]}>{freeTrialEnabled ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Auto-Renew Default</Text>
              <TouchableOpacity style={[s.toggle, autoRenewDefault && s.toggleOn]} onPress={() => setAutoRenewDefault(!autoRenewDefault)}>
                <Text style={[s.toggleText, autoRenewDefault && s.toggleTextOn]}>{autoRenewDefault ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>

            {/* Last Updated */}
            {lastUpdatedRaw && (
              <View style={s.lastUpdatedRow}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={s.lastUpdatedText}>Last updated: {formatDateTime(lastUpdatedRaw)}</Text>
              </View>
            )}

            {/* Save */}
            <TouchableOpacity style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]} onPress={handleSave} disabled={!hasChanges || saving} activeOpacity={0.7}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={hasChanges ? colors.textInverse : colors.textMuted} />
                  <Text style={[s.saveBtnText, !hasChanges && s.saveBtnTextDisabled]}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={creators}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="diamond-outline" size={40} color={colors.textMuted} /><Text style={s.emptyText}>No creators with subscriptions</Text></View>}
          renderItem={({ item }) => {
            const daysLeft = item.subscriptionEndDate ? Math.max(0, Math.ceil((new Date(item.subscriptionEndDate).getTime() - Date.now()) / 86400000)) : 0;
            return (
              <View style={s.creatorCard}>
                <View style={s.creatorRow}>
                  <Text style={s.creatorName}>{item.user?.name || 'Creator'}</Text>
                  <View style={[s.badge, { backgroundColor: getStatusColor(item.subscriptionStatus) + '15' }]}>
                    <Text style={[s.badgeText, { color: getStatusColor(item.subscriptionStatus) }]}>{item.subscriptionStatus}</Text>
                  </View>
                </View>
                <View style={s.creatorMeta}>
                  <Text style={s.metaText}>₹{item.subscriptionPlanPrice || monthlyPrice}/mo</Text>
                  <Text style={s.metaText}>Expires: {item.subscriptionEndDate ? new Date(item.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
                  {item.subscriptionStatus === 'active' && <Text style={[s.metaText, daysLeft <= 5 ? { color: colors.warning } : {}]}>{daysLeft} days left</Text>}
                </View>
              </View>
            );
          }}
        />
      )}
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
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.labelMd, color: colors.textMuted },
  tabTextActive: { color: colors.textInverse, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statVal: { ...typography.headlineLg, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sectionLabel: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  toggleLabel: { ...typography.bodyMd, color: colors.textSecondary },
  toggle: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { ...typography.labelSm, color: colors.textMuted, fontWeight: '600' },
  toggleTextOn: { color: colors.textInverse },
  lastUpdatedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, justifyContent: 'center' },
  lastUpdatedText: { ...typography.caption, color: colors.textMuted },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing['2xl'] },
  saveBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  saveBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  saveBtnTextDisabled: { color: colors.textMuted },
  // Creators list
  creatorCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  creatorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  creatorName: { ...typography.headlineSm, color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  creatorMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  metaText: { ...typography.caption, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
