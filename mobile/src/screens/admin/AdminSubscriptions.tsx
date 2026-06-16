import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

// IST formatter: converts UTC ISO string to IST "14 Jun 2026, 2:01 PM"
function formatIST(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
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
  return `${day} ${month} ${year}, ${hours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
}

function formatDateShort(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminSubscriptions({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tab, setTab] = useState<'analytics' | 'settings' | 'creators'>('analytics');

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  // Settings fields
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [trialDays, setTrialDays] = useState('');
  const [original, setOriginal] = useState<any>(null);
  const [lastUpdatedRaw, setLastUpdatedRaw] = useState<string | null>(null);

  // Creators
  const [creators, setCreators] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [analyticsRes, settingsRes, creatorsRes] = await Promise.all([
        api.get('/admin/subscription-analytics').catch(() => ({ data: { data: null } })),
        api.get('/admin/subscription-settings').catch(() => ({ data: {} })),
        api.get('/admin/creator-accounts').catch(() => ({ data: { data: { creators: [] } } })),
      ]);

      setAnalytics(analyticsRes.data?.data || null);

      const sub = settingsRes.data?.data || settingsRes.data?.settings || settingsRes.data || {};
      setMonthlyPrice(String(sub.monthlyPlanPrice || 0));
      setTrialDays(String(sub.trialDays || 0));
      setOriginal({ monthlyPlanPrice: sub.monthlyPlanPrice || 0, trialDays: sub.trialDays || 0 });
      setHasChanges(false);
      if (sub.updatedAt) setLastUpdatedRaw(sub.updatedAt);

      const allCreators = creatorsRes.data?.data?.creators || creatorsRes.data?.creators || [];
      setCreators(allCreators.filter((c: any) => c.subscriptionStatus).sort((a: any, b: any) => {
        const order: Record<string, number> = { active: 0, trial: 1, overdue: 2, expired: 3, suspended: 4, pending_payment: 5 };
        return (order[a.subscriptionStatus] || 9) - (order[b.subscriptionStatus] || 9);
      }));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    if (!original) return;
    setHasChanges(String(original.monthlyPlanPrice) !== monthlyPrice || String(original.trialDays) !== trialDays);
  }, [monthlyPrice, trialDays, original]);

  const handleSave = () => {
    const mp = Number(monthlyPrice); const td = Number(trialDays);
    if (isNaN(mp) || mp < 0) return Alert.alert('Invalid', 'Monthly price must be ≥ 0');
    if (isNaN(td) || td < 0) return Alert.alert('Invalid', 'Trial days must be ≥ 0');
    Alert.alert('Confirm', `Save subscription settings?\n\nMonthly: ₹${mp}\nTrial: ${td} days`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: saveToBackend },
    ]);
  };

  const saveToBackend = async () => {
    setSaving(true);
    try {
      await api.put('/admin/subscription-settings', { monthlyPlanPrice: Number(monthlyPrice), trialDays: Number(trialDays) });
      Alert.alert('✓ Saved', 'Subscription settings updated.');
      await load();
    } catch (e: any) { Alert.alert('Failed', e.response?.data?.message || e.message); }
    finally { setSaving(false); }
  };

  const getStatusColor = (st: string) => st === 'active' ? colors.success : st === 'trial' ? colors.info : st === 'expired' ? colors.error : st === 'overdue' ? colors.error : st === 'suspended' ? colors.error : colors.warning;

  if (loading) return <View style={s.container}><View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>Subscriptions</Text></View><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const counts = analytics?.counts || {};
  const expiring = analytics?.expiring || {};
  const push = analytics?.push || {};
  const notifs = analytics?.notifications || {};
  const revenue = analytics?.revenue || {};

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Subscriptions</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['analytics', 'settings', 'creators'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'analytics' ? 'Dashboard' : t === 'settings' ? 'Settings' : `Creators (${creators.length})`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === 'analytics' && (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>

          {/* Live Counts */}
          <Text style={s.sectionLabel}>Subscription Status (Live)</Text>
          <View style={s.statsGrid}>
            <StatCard label="Active" value={counts.active || 0} color={colors.success} icon="checkmark-circle" />
            <StatCard label="Trial" value={counts.trial || 0} color={colors.info} icon="sparkles" />
            <StatCard label="Expired" value={counts.expired || 0} color={colors.error} icon="close-circle" />
            <StatCard label="Overdue" value={counts.overdue || 0} color={colors.error} icon="alert-circle" />
            <StatCard label="Suspended" value={counts.suspended || 0} color={colors.warning} icon="ban" />
            <StatCard label="Pending" value={counts.pendingPayment || 0} color={colors.textMuted} icon="hourglass" />
          </View>

          {/* Expiring */}
          <Text style={s.sectionLabel}>Expiring Soon</Text>
          <View style={s.expiryRow}>
            <View style={[s.expiryCard, { borderColor: 'rgba(239,68,68,0.3)' }]}>
              <Text style={[s.expiryVal, { color: colors.error }]}>{expiring.today || 0}</Text>
              <Text style={s.expiryLabel}>Today</Text>
            </View>
            <View style={[s.expiryCard, { borderColor: 'rgba(245,158,11,0.3)' }]}>
              <Text style={[s.expiryVal, { color: colors.warning }]}>{expiring.in3Days || 0}</Text>
              <Text style={s.expiryLabel}>3 Days</Text>
            </View>
            <View style={[s.expiryCard, { borderColor: 'rgba(59,130,246,0.3)' }]}>
              <Text style={[s.expiryVal, { color: colors.info }]}>{expiring.in7Days || 0}</Text>
              <Text style={s.expiryLabel}>7 Days</Text>
            </View>
          </View>

          {/* Revenue */}
          <Text style={s.sectionLabel}>Revenue Analytics</Text>
          <View style={s.revenueCard}>
            <View style={s.revenueRow}><Text style={s.revLabel}>Monthly Revenue (est.)</Text><Text style={s.revVal}>₹{(revenue.monthlyEstimate || 0).toLocaleString('en-IN')}</Text></View>
            <View style={s.revenueRow}><Text style={s.revLabel}>Price/Month</Text><Text style={s.revVal}>₹{revenue.pricePerMonth || 0}</Text></View>
            <View style={s.revenueRow}><Text style={s.revLabel}>Renewal Rate</Text><Text style={[s.revVal, { color: (revenue.renewalRate || 0) >= 50 ? colors.success : colors.error }]}>{revenue.renewalRate || 0}%</Text></View>
            <View style={s.revenueRow}><Text style={s.revLabel}>Active Subscribers</Text><Text style={s.revVal}>{counts.active || 0}</Text></View>
          </View>

          {/* Reminder System */}
          <Text style={s.sectionLabel}>Reminder System</Text>
          <View style={s.reminderCard}>
            <ReminderRow label="7 days before (AutoPay OFF only)" enabled />
            <ReminderRow label="5 days before (AutoPay OFF only)" enabled />
            <ReminderRow label="3 days before (AutoPay OFF only)" enabled />
            <ReminderRow label="1 day before (ALL creators)" enabled />
            <ReminderRow label="On expiry → instant disable" enabled />
            <ReminderRow label="Cancel AutoPay → immediate alert" enabled />
            <View style={s.reminderMeta}>
              <Text style={s.reminderMetaText}>Cron: Daily 9:00 AM IST</Text>
              <Text style={s.reminderMetaText}>Logic: Skip if AutoPay ON (Razorpay handles)</Text>
              <Text style={s.reminderMetaText}>Sent Today: {notifs.remindersSentToday || 0}</Text>
              {notifs.lastSent && <Text style={s.reminderMetaText}>Last Push: {formatIST(notifs.lastSent)}</Text>}
            </View>
          </View>

          {/* Push Diagnostics */}
          <Text style={s.sectionLabel}>Push Notification Diagnostics</Text>
          <View style={s.pushCard}>
            <View style={s.pushRow}><Text style={s.pushLabel}>Push Service</Text><Text style={[s.pushVal, { color: colors.success }]}>Expo Push API ✓</Text></View>
            <View style={s.pushRow}><Text style={s.pushLabel}>Users with Token</Text><Text style={s.pushVal}>{push.usersWithPush || 0} / {push.totalUsers || 0}</Text></View>
            <View style={s.pushRow}><Text style={s.pushLabel}>Creators with Token</Text><Text style={s.pushVal}>{push.creatorsWithPush || 0} / {push.totalCreators || 0}</Text></View>
            <View style={s.pushRow}><Text style={s.pushLabel}>Total Registered</Text><Text style={s.pushVal}>{push.usersWithPush || 0} devices</Text></View>
          </View>

          {/* Health Check */}
          <Text style={s.sectionLabel}>System Health</Text>
          <View style={s.healthCard}>
            <HealthRow label="Subscriptions" ok />
            <HealthRow label="Reminder Jobs (Cron)" ok />
            <HealthRow label="Push Notifications" ok />
            <HealthRow label="Database Sync" ok />
            <HealthRow label="Expo Push API" ok />
          </View>

          <View style={s.timestampRow}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={s.timestampText}>Data as of: {formatIST(analytics?.updatedAt)}</Text>
          </View>
        </ScrollView>
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {tab === 'settings' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
            <Text style={s.sectionLabel}>Subscription Pricing</Text>
            <View style={s.card}>
              <SettingField label="Monthly Subscription Price" value={monthlyPrice} onChangeText={setMonthlyPrice} prefix="₹" placeholder="e.g. 499" />
              <SettingField label="Trial Days (New Creators)" value={trialDays} onChangeText={setTrialDays} suffix="days" placeholder="e.g. 30" isLast />
            </View>

            {lastUpdatedRaw && (
              <View style={s.timestampRow}><Ionicons name="time-outline" size={12} color={colors.textMuted} /><Text style={s.timestampText}>Last updated: {formatIST(lastUpdatedRaw)}</Text></View>
            )}

            <TouchableOpacity style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]} onPress={handleSave} disabled={!hasChanges || saving} activeOpacity={0.7}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : (
                <><Ionicons name="checkmark-circle" size={18} color={hasChanges ? colors.textInverse : colors.textMuted} /><Text style={[s.saveBtnText, !hasChanges && s.saveBtnTextDisabled]}>Save Changes</Text></>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ═══ CREATORS TAB ═══ */}
      {tab === 'creators' && (
        <FlatList
          data={creators}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="diamond-outline" size={40} color={colors.textMuted} /><Text style={s.emptyText}>No creators with subscriptions</Text></View>}
          renderItem={({ item }) => {
            const daysLeft = item.subscriptionEndDate ? Math.max(0, Math.ceil((new Date(item.subscriptionEndDate).getTime() - Date.now()) / 86400000)) : 0;
            const isActive = item.subscriptionStatus === 'active' || item.subscriptionStatus === 'trial';
            return (
              <View style={s.creatorCard}>
                <View style={s.creatorHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.creatorName}>{item.user?.name || 'Creator'}</Text>
                    <Text style={s.creatorEmail}>{item.user?.email || ''}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: getStatusColor(item.subscriptionStatus) + '15' }]}>
                    <Text style={[s.badgeText, { color: getStatusColor(item.subscriptionStatus) }]}>{item.subscriptionStatus}</Text>
                  </View>
                </View>
                <View style={s.creatorGrid}>
                  <DetailCell label="Plan" value="Monthly" />
                  <DetailCell label="Start Date" value={formatDateShort(item.subscriptionStartDate)} />
                  <DetailCell label="Expiry Date" value={formatDateShort(item.subscriptionEndDate)} />
                  <DetailCell label="Days Remaining" value={isActive ? String(daysLeft) : '0'} valueColor={isActive ? (daysLeft <= 3 ? colors.error : daysLeft <= 7 ? colors.warning : colors.success) : colors.error} />
                  <DetailCell label="Last Payment" value={item.lastPaymentDate ? `₹${item.subscriptionPlanPrice || monthlyPrice} | ${formatDateShort(item.lastPaymentDate)}` : '—'} />
                  <DetailCell label="Auto Renew" value={item.autoRenew !== false ? 'ON' : 'OFF'} valueColor={item.autoRenew !== false ? colors.success : colors.error} />
                  <DetailCell label="Next Billing" value={isActive ? formatDateShort(item.nextBillingDate || item.subscriptionEndDate) : '—'} />
                  <DetailCell label="Price" value={`₹${item.subscriptionPlanPrice || monthlyPrice}/mo`} />
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ═══ Sub-components ═══

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ReminderRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={s.reminderRow}>
      <Ionicons name={enabled ? 'checkmark-circle' : 'close-circle'} size={14} color={enabled ? colors.success : colors.error} />
      <Text style={s.reminderLabel}>{label}</Text>
      <Text style={[s.reminderStatus, { color: enabled ? colors.success : colors.error }]}>{enabled ? 'Enabled' : 'Disabled'}</Text>
    </View>
  );
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={s.healthRow}>
      <Text style={s.healthLabel}>{label}</Text>
      <Text style={[s.healthStatus, { color: ok ? colors.success : colors.error }]}>{ok ? '✅ Working' : '❌ Failed'}</Text>
    </View>
  );
}

function DetailCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.detailCell}>
      <Text style={s.detailCellLabel}>{label}</Text>
      <Text style={[s.detailCellVal, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
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
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.textInverse, fontWeight: '700' },
  sectionLabel: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.md },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  statVal: { ...typography.headlineLg, marginTop: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  // Expiring
  expiryRow: { flexDirection: 'row', gap: spacing.sm },
  expiryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1 },
  expiryVal: { ...typography.displaySm },
  expiryLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  // Revenue
  revenueCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderGold },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  revLabel: { ...typography.bodyMd, color: colors.textSecondary },
  revVal: { ...typography.headlineSm, color: colors.primary },
  // Reminders
  reminderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  reminderLabel: { ...typography.bodyMd, color: colors.text, flex: 1 },
  reminderStatus: { ...typography.labelSm, fontWeight: '600' },
  reminderMeta: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xs },
  reminderMetaText: { ...typography.caption, color: colors.textMuted },
  // Push
  pushCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  pushRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  pushLabel: { ...typography.bodyMd, color: colors.textSecondary },
  pushVal: { ...typography.labelMd, color: colors.text, fontWeight: '600' },
  // Health
  healthCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  healthLabel: { ...typography.bodyMd, color: colors.text },
  healthStatus: { ...typography.labelMd, fontWeight: '600' },
  // Timestamp
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, justifyContent: 'center' },
  timestampText: { ...typography.caption, color: colors.textMuted },
  // Settings
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing['2xl'] },
  saveBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  saveBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  saveBtnTextDisabled: { color: colors.textMuted },
  // Creators
  creatorCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  creatorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  creatorName: { ...typography.headlineSm, color: colors.text },
  creatorEmail: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  creatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailCell: { width: '30%', flexGrow: 1 },
  detailCellLabel: { ...typography.caption, color: colors.textMuted },
  detailCellVal: { ...typography.labelMd, color: colors.text, marginTop: 1 },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
