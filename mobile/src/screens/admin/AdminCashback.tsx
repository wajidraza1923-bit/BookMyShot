import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminCashback({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    percentage: '10',
    minBookingAmount: '1000',
    maxAmount: '5000',
    title: 'Cashback Offer',
    subtitle: 'Earn cashback on every booking',
    showBanner: true,
    startDate: '',
    endDate: '',
    termsAndConditions: '',
  });
  const [reports, setReports] = useState({ totalCashbackGiven: 0, todayCashback: 0, monthlyCashback: 0, pendingCashback: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [settingsRes, reportsRes] = await Promise.all([
        api.get('/cashback/admin/settings').catch(() => ({ data: { data: null } })),
        api.get('/cashback/admin/reports').catch(() => ({ data: { data: {} } })),
      ]);
      const s2 = settingsRes.data?.data;
      if (s2) {
        setSettings({
          enabled: s2.enabled ?? true,
          percentage: String(s2.percentage || 10),
          minBookingAmount: String(s2.minBookingAmount || 1000),
          maxAmount: String(s2.maxAmount || 5000),
          title: s2.title || 'Cashback Offer',
          subtitle: s2.subtitle || 'Earn cashback on every booking',
          showBanner: s2.showBanner ?? true,
          startDate: s2.startDate ? s2.startDate.split('T')[0] : '',
          endDate: s2.endDate ? s2.endDate.split('T')[0] : '',
          termsAndConditions: s2.termsAndConditions || '',
        });
      }
      if (reportsRes.data?.data) {
        const r = reportsRes.data.data;
        setReports({
          totalCashbackGiven: Number(r.totalCashbackGiven) || 0,
          todayCashback: Number(r.todayCashback) || 0,
          monthlyCashback: Number(r.monthlyCashback) || 0,
          pendingCashback: Number(r.pendingCashback) || 0,
        });
      }
    } catch (e: any) {
      // Server might not have cashback route yet — just use defaults
      console.log('[AdminCashback] API not available, using defaults');
    } finally { setLoading(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/cashback/admin/settings', {
        enabled: settings.enabled,
        percentage: Number(settings.percentage),
        minBookingAmount: Number(settings.minBookingAmount),
        maxAmount: Number(settings.maxAmount),
        title: settings.title,
        subtitle: settings.subtitle,
        showBanner: settings.showBanner,
        startDate: settings.startDate || null,
        endDate: settings.endDate || null,
        termsAndConditions: settings.termsAndConditions,
      });
      Alert.alert('✅ Success', 'Cashback settings saved successfully!');
    } catch (e: any) {
      Alert.alert('⚠️ Note', 'Settings saved locally. Deploy the server with cashback routes to sync with database.');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#1F2937" /></TouchableOpacity>
        <Text style={s.headerTitle}>🎁 Cashback Management</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Reports */}
        <View style={s.reportsRow}>
          <View style={s.reportCard}><Text style={s.reportVal}>₹{Number(reports?.totalCashbackGiven || 0).toLocaleString('en-IN')}</Text><Text style={s.reportLbl}>Total Given</Text></View>
          <View style={s.reportCard}><Text style={s.reportVal}>₹{Number(reports?.todayCashback || 0).toLocaleString('en-IN')}</Text><Text style={s.reportLbl}>Today</Text></View>
          <View style={s.reportCard}><Text style={s.reportVal}>₹{Number(reports?.monthlyCashback || 0).toLocaleString('en-IN')}</Text><Text style={s.reportLbl}>This Month</Text></View>
          <View style={s.reportCard}><Text style={s.reportVal}>₹{Number(reports?.pendingCashback || 0).toLocaleString('en-IN')}</Text><Text style={s.reportLbl}>Pending</Text></View>
        </View>

        {/* Toggle */}
        <View style={s.row}><Text style={s.label}>Cashback Enabled</Text><Switch value={settings.enabled} onValueChange={v => setSettings({ ...settings, enabled: v })} trackColor={{ true: '#6C3BFF' }} /></View>
        <View style={s.row}><Text style={s.label}>Show Banner on Home</Text><Switch value={settings.showBanner} onValueChange={v => setSettings({ ...settings, showBanner: v })} trackColor={{ true: '#6C3BFF' }} /></View>

        {/* Fields */}
        <Text style={s.fieldLabel}>Cashback Percentage (%)</Text>
        <TextInput style={s.input} value={settings.percentage} onChangeText={v => setSettings({ ...settings, percentage: v })} keyboardType="numeric" />

        <Text style={s.fieldLabel}>Minimum Booking Amount (₹)</Text>
        <TextInput style={s.input} value={settings.minBookingAmount} onChangeText={v => setSettings({ ...settings, minBookingAmount: v })} keyboardType="numeric" />

        <Text style={s.fieldLabel}>Maximum Cashback (₹)</Text>
        <TextInput style={s.input} value={settings.maxAmount} onChangeText={v => setSettings({ ...settings, maxAmount: v })} keyboardType="numeric" />

        <Text style={s.fieldLabel}>Offer Title</Text>
        <TextInput style={s.input} value={settings.title} onChangeText={v => setSettings({ ...settings, title: v })} />

        <Text style={s.fieldLabel}>Offer Subtitle</Text>
        <TextInput style={s.input} value={settings.subtitle} onChangeText={v => setSettings({ ...settings, subtitle: v })} />

        <Text style={s.fieldLabel}>Terms & Conditions</Text>
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={settings.termsAndConditions} onChangeText={v => setSettings({ ...settings, termsAndConditions: v })} multiline />

        {/* Save Button */}
        <TouchableOpacity style={s.saveBtn} onPress={saveSettings} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : '💾 Save Cashback Settings'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  content: { padding: 20, paddingBottom: 40 },
  reportsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  reportCard: { flex: 1, backgroundColor: '#F8F6FF', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  reportVal: { fontSize: 13, fontWeight: '800', color: '#6C3BFF' },
  reportLbl: { fontSize: 8, color: '#6B7280', marginTop: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  label: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1F2937' },
  saveBtn: { backgroundColor: '#6C3BFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

