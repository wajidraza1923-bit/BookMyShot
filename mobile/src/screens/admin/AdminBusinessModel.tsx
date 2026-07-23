/**
 * AdminBusinessModel — Native mobile admin screen for Business Model settings
 * Controls: Lead mode, pricing, free limits, toggles
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme';
import api from '../../services/api';

export default function AdminBusinessModel({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await api.get('/leads/admin/settings');
      if (res.data?.data) setSettings(res.data.data);
    } catch (e: any) { Alert.alert('Error', 'Failed to load settings'); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/leads/admin/settings', {
        leadCountMode: settings.leadCountMode || 'booking',
        freeLeadLimit: Number(settings.freeLeadLimit) || 3,
        leadUnlockPrice: Number(settings.leadUnlockPrice) || 70,
        monthlyPrice: Number(settings.monthlyPrice) || 199,
        yearlyPrice: Number(settings.yearlyPrice) || 1999,
        subscriptionDurationDays: Number(settings.subscriptionDurationDays) || 30,
        enableLeadLimit: settings.enableLeadLimit !== false,
        enablePerLeadPurchase: settings.enablePerLeadPurchase !== false,
        enableSubscription: settings.enableSubscription !== false,
        showLeadDashboardCard: settings.showLeadDashboardCard !== false,
      });
      Alert.alert('✅ Saved', 'Business model settings updated!');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const update = (key: string, val: any) => setSettings((s: any) => ({ ...s, [key]: val }));

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.title}>Business Model</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Mode Selection */}
        <Text style={s.secTitle}>Unlock Mode</Text>
        <View style={s.modeRow}>
          <TouchableOpacity style={[s.modeCard, settings.leadCountMode === 'booking' && s.modeActive]} onPress={() => update('leadCountMode', 'booking')}>
            <Ionicons name="calendar" size={22} color={settings.leadCountMode === 'booking' ? '#6C3BFF' : '#9CA3AF'} />
            <Text style={[s.modeLabel, settings.leadCountMode === 'booking' && { color: '#6C3BFF' }]}>Booking Based</Text>
            <Text style={s.modeSub}>Count on booking created</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.modeCard, settings.leadCountMode === 'lead' && s.modeActive]} onPress={() => update('leadCountMode', 'lead')}>
            <Ionicons name="mail" size={22} color={settings.leadCountMode === 'lead' ? '#6C3BFF' : '#9CA3AF'} />
            <Text style={[s.modeLabel, settings.leadCountMode === 'lead' && { color: '#6C3BFF' }]}>Lead Based</Text>
            <Text style={s.modeSub}>Count on inquiry received</Text>
          </TouchableOpacity>
        </View>

        {/* Pricing */}
        <Text style={s.secTitle}>Pricing</Text>
        <View style={s.card}>
          <Field label="Free Limit" value={String(settings.freeLeadLimit || 3)} onChange={(v: string) => update('freeLeadLimit', v)} icon="gift-outline" />
          <Field label="Per Lead Unlock (₹)" value={String(settings.leadUnlockPrice || 70)} onChange={(v: string) => update('leadUnlockPrice', v)} icon="pricetag-outline" />
          <Field label="Monthly Subscription (₹)" value={String(settings.monthlyPrice || 199)} onChange={(v: string) => update('monthlyPrice', v)} icon="card-outline" />
          <Field label="Yearly Subscription (₹)" value={String(settings.yearlyPrice || 1999)} onChange={(v: string) => update('yearlyPrice', v)} icon="calendar-outline" />
          <Field label="Subscription Duration (Days)" value={String(settings.subscriptionDurationDays || 30)} onChange={(v: string) => update('subscriptionDurationDays', v)} icon="time-outline" />
        </View>

        {/* Toggles */}
        <Text style={s.secTitle}>Feature Toggles</Text>
        <View style={s.card}>
          <ToggleRow label="Enable Lead/Booking Limit" value={settings.enableLeadLimit !== false} onChange={(v: boolean) => update('enableLeadLimit', v)} />
          <ToggleRow label="Enable Per-Lead Purchase" value={settings.enablePerLeadPurchase !== false} onChange={(v: boolean) => update('enablePerLeadPurchase', v)} />
          <ToggleRow label="Enable Subscription" value={settings.enableSubscription !== false} onChange={(v: boolean) => update('enableSubscription', v)} />
          <ToggleRow label="Show Lead Card in Dashboard" value={settings.showLeadDashboardCard !== false} onChange={(v: boolean) => update('showLeadDashboardCard', v)} />
        </View>

        {/* Save */}
        <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={s.saveBtnText}>Save Settings</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, icon }: any) {
  return (
    <View style={s.field}>
      <View style={s.fieldRow}>
        <Ionicons name={icon} size={16} color="#6C3BFF" />
        <Text style={s.fieldLabel}>{label}</Text>
      </View>
      <TextInput style={s.fieldInput} value={value} onChangeText={onChange} keyboardType="numeric" selectionColor="#6C3BFF" />
    </View>
  );
}

function ToggleRow({ label, value, onChange }: any) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }} thumbColor={value ? '#6C3BFF' : '#9CA3AF'} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 20, marginBottom: 10 },
  // Mode
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  modeCard: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#FAFBFC', gap: 6 },
  modeActive: { borderColor: '#6C3BFF', backgroundColor: '#F8F6FF' },
  modeLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  modeSub: { fontSize: 10, color: '#9CA3AF' },
  // Card
  card: { backgroundColor: '#FAFBFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  // Field
  field: { marginBottom: 14 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  fieldInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '700', color: '#1F2937' },
  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleLabel: { fontSize: 13, color: '#374151', flex: 1 },
  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6C3BFF', borderRadius: 14, paddingVertical: 16, marginTop: 24, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
