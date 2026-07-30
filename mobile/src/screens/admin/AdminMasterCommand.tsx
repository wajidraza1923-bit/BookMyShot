import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminMasterCommand({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/master-settings');
      const data = res.data?.data;
      if (data) {
        setSupportEmail(data.supportEmail || '');
        setSupportPhone(data.supportPhone || '');
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!supportEmail.trim() || !supportPhone.trim()) {
      Alert.alert('Required', 'Both email and phone are required');
      return;
    }
    setSaving(true);
    try {
      await api.put('/master-settings', { supportEmail: supportEmail.trim(), supportPhone: supportPhone.trim() });
      Alert.alert('✅ Saved', 'Settings updated across the entire app.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.title}>Master Command</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.subtitle}>Global settings that apply across the entire app</Text>

        {/* Module 1: Customer Support */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="headset-outline" size={20} color="#6C3BFF" />
            <Text style={s.cardTitle}>Customer Support</Text>
          </View>
          <Text style={s.cardDesc}>Official support contact shown everywhere in the app</Text>

          <Text style={s.label}>Support Email</Text>
          <View style={s.inputRow}>
            <Ionicons name="mail-outline" size={16} color="#6C3BFF" />
            <TextInput style={s.input} value={supportEmail} onChangeText={setSupportEmail} placeholder="support@bookmyshot.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <Text style={s.label}>Support Phone Number</Text>
          <View style={s.inputRow}>
            <Ionicons name="call-outline" size={16} color="#6C3BFF" />
            <TextInput style={s.input} value={supportPhone} onChangeText={setSupportPhone} placeholder="10-digit number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" maxLength={10} />
          </View>

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={s.saveBtnText}>Save & Sync Globally</Text></>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footerNote}>Changes apply instantly across all screens:{'\n'}Contact Us • Help • Footer • Invoices • Emails • Popups • Dashboards</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  scroll: { padding: 20, paddingBottom: 60 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  card: { backgroundColor: '#FAFBFC', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6C3BFF', borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  footerNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 18, marginTop: 10 },
});
