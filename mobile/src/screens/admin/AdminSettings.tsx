import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface SubscriptionSettings {
  monthlyPlanPrice: number;
  trialDays: number;
  featuredPortfolioPrice: number;
}

interface CommissionSettings {
  bmsLeadCommissionPercent: number;
  creatorLeadCommissionPercent: number;
}

export default function AdminSettings({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Editable fields
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [trialDays, setTrialDays] = useState('');
  const [featuredPrice, setFeaturedPrice] = useState('');
  const [bmsCommission, setBmsCommission] = useState('');
  const [creatorCommission, setCreatorCommission] = useState('');

  // Original values for change detection
  const [original, setOriginal] = useState<{ sub: SubscriptionSettings; comm: CommissionSettings } | null>(null);

  // Last updated info
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [subRes, commRes] = await Promise.all([
        api.get('/admin/subscription-settings'),
        api.get('/admin/commission-settings'),
      ]);

      const sub = subRes.data?.data || subRes.data?.settings || subRes.data || {};
      const comm = commRes.data?.data || commRes.data?.settings || commRes.data || {};

      const subValues: SubscriptionSettings = {
        monthlyPlanPrice: sub.monthlyPlanPrice || 0,
        trialDays: sub.trialDays || 0,
        featuredPortfolioPrice: sub.featuredPortfolioPrice || 0,
      };

      const commValues: CommissionSettings = {
        bmsLeadCommissionPercent: comm.bmsLeadCommissionPercent || 0,
        creatorLeadCommissionPercent: comm.creatorLeadCommissionPercent || 0,
      };

      setMonthlyPrice(String(subValues.monthlyPlanPrice));
      setTrialDays(String(subValues.trialDays));
      setFeaturedPrice(String(subValues.featuredPortfolioPrice));
      setBmsCommission(String(commValues.bmsLeadCommissionPercent));
      setCreatorCommission(String(commValues.creatorLeadCommissionPercent));

      setOriginal({ sub: subValues, comm: commValues });
      setHasChanges(false);

      // Get last updated time if available
      if (sub.updatedAt) {
        setLastUpdated(new Date(sub.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load settings: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Detect changes
  useEffect(() => {
    if (!original) return;
    const changed =
      String(original.sub.monthlyPlanPrice) !== monthlyPrice ||
      String(original.sub.trialDays) !== trialDays ||
      String(original.sub.featuredPortfolioPrice) !== featuredPrice ||
      String(original.comm.bmsLeadCommissionPercent) !== bmsCommission ||
      String(original.comm.creatorLeadCommissionPercent) !== creatorCommission;
    setHasChanges(changed);
  }, [monthlyPrice, trialDays, featuredPrice, bmsCommission, creatorCommission, original]);

  const handleSave = async () => {
    // Validate inputs
    const mp = Number(monthlyPrice);
    const td = Number(trialDays);
    const fp = Number(featuredPrice);
    const bc = Number(bmsCommission);
    const cc = Number(creatorCommission);

    if (isNaN(mp) || mp < 0) return Alert.alert('Invalid', 'Monthly price must be a valid number ≥ 0');
    if (isNaN(td) || td < 0 || !Number.isInteger(td)) return Alert.alert('Invalid', 'Trial days must be a whole number ≥ 0');
    if (isNaN(fp) || fp < 0) return Alert.alert('Invalid', 'Featured price must be a valid number ≥ 0');
    if (isNaN(bc) || bc < 0 || bc > 100) return Alert.alert('Invalid', 'BMS commission must be between 0–100%');
    if (isNaN(cc) || cc < 0 || cc > 100) return Alert.alert('Invalid', 'Creator commission must be between 0–100%');

    Alert.alert(
      'Confirm Changes',
      `Are you sure you want to update platform settings?\n\nMonthly Price: ₹${mp}\nTrial Days: ${td}\nFeatured Price: ₹${fp}\nBMS Commission: ${bc}%\nCreator Commission: ${cc}%`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', style: 'destructive', onPress: saveToBackend },
      ]
    );
  };

  const saveToBackend = async () => {
    setSaving(true);
    try {
      // Update subscription settings
      await api.put('/admin/subscription-settings', {
        monthlyPlanPrice: Number(monthlyPrice),
        trialDays: Number(trialDays),
        featuredPortfolioPrice: Number(featuredPrice),
      });

      // Update commission settings
      await api.put('/admin/commission-settings', {
        bmsLeadCommissionPercent: Number(bmsCommission),
        creatorLeadCommissionPercent: Number(creatorCommission),
      });

      Alert.alert('✓ Saved', 'Platform settings updated successfully. Changes are effective immediately.');
      setHasChanges(false);
      setLastUpdated(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));

      // Refresh to get confirmed values from DB
      await load();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to save settings';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Platform Settings</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Platform Settings</Text>
        {hasChanges && <View style={s.changedBadge}><Text style={s.changedText}>Unsaved</Text></View>}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        >
          {/* Admin Info */}
          <View style={s.infoBar}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={s.infoText}>Logged in as {user?.name || 'Super Admin'}</Text>
          </View>

          {/* Subscription Section */}
          <Text style={s.sectionLabel}>Subscription Settings</Text>
          <View style={s.card}>
            <SettingField
              label="Monthly Subscription Price"
              value={monthlyPrice}
              onChangeText={setMonthlyPrice}
              prefix="₹"
              keyboardType="numeric"
              placeholder="e.g. 499"
            />
            <SettingField
              label="Trial Days"
              value={trialDays}
              onChangeText={setTrialDays}
              suffix="days"
              keyboardType="numeric"
              placeholder="e.g. 7"
            />
            <SettingField
              label="Featured Creator Price"
              value={featuredPrice}
              onChangeText={setFeaturedPrice}
              prefix="₹"
              keyboardType="numeric"
              placeholder="e.g. 999"
              isLast
            />
          </View>

          {/* Commission Section */}
          <Text style={s.sectionLabel}>Commission Settings</Text>
          <View style={s.card}>
            <SettingField
              label="BMS Lead Commission"
              value={bmsCommission}
              onChangeText={setBmsCommission}
              suffix="%"
              keyboardType="numeric"
              placeholder="e.g. 5"
            />
            <SettingField
              label="Creator Lead Commission"
              value={creatorCommission}
              onChangeText={setCreatorCommission}
              suffix="%"
              keyboardType="numeric"
              placeholder="e.g. 3"
              isLast
            />
          </View>

          {/* Last Updated */}
          {lastUpdated && (
            <View style={s.lastUpdatedRow}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={s.lastUpdatedText}>Last updated: {lastUpdated}</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={hasChanges ? colors.textInverse : colors.textMuted} />
                <Text style={[s.saveBtnText, !hasChanges && s.saveBtnTextDisabled]}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Audit Notice */}
          <View style={s.auditNotice}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
            <Text style={s.auditText}>All changes are logged with admin ID, timestamp, and previous values for audit compliance.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface SettingFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  prefix?: string;
  suffix?: string;
  keyboardType?: 'numeric' | 'default';
  placeholder?: string;
  isLast?: boolean;
}

function SettingField({ label, value, onChangeText, prefix, suffix, keyboardType = 'default', placeholder, isLast }: SettingFieldProps) {
  return (
    <View style={[fieldStyles.container, !isLast && fieldStyles.borderBottom]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        {prefix && <Text style={fieldStyles.prefix}>{prefix}</Text>}
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
        />
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
  infoBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  infoText: { ...typography.bodySm, color: colors.primary },
  sectionLabel: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border },
  lastUpdatedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, justifyContent: 'center' },
  lastUpdatedText: { ...typography.caption, color: colors.textMuted },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing['2xl'] },
  saveBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  saveBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  saveBtnTextDisabled: { color: colors.textMuted },
  auditNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xl, paddingHorizontal: spacing.sm },
  auditText: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 16 },
});
