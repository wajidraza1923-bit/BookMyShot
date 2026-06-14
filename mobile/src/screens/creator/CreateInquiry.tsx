import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreateInquiry({ navigation }: any) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', eventType: '', city: '', eventDate: '', budget: '', message: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.eventType.trim() || !form.eventDate.trim()) {
      Alert.alert('Required', 'Name, Event Type, and Event Date are required');
      return;
    }
    setSaving(true);
    try {
      // Uses exact same API as website: POST /creator/inquiries
      await api.post('/creator/inquiries', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        eventType: form.eventType.trim(),
        city: form.city.trim(),
        eventDate: form.eventDate.trim(),
        budget: parseInt(form.budget) || 0,
        message: form.message.trim(),
      });
      Alert.alert('Created! ✅', 'Inquiry created and booking auto-generated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create inquiry');
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Create Inquiry</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <Text style={s.subtitle}>Add an offline client inquiry. This will also create a booking automatically.</Text>

        <Field label="Client Name *" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} placeholder="Full name" />
        <Field label="Phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} placeholder="Mobile number" keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} placeholder="Email (optional)" keyboardType="email-address" />
        <Field label="Event Type *" value={form.eventType} onChange={(v: string) => setForm({ ...form, eventType: v })} placeholder="Wedding, Pre-Wedding, etc." />
        <Field label="City" value={form.city} onChange={(v: string) => setForm({ ...form, city: v })} placeholder="Event city" />
        <Field label="Event Date *" value={form.eventDate} onChange={(v: string) => setForm({ ...form, eventDate: v })} placeholder="YYYY-MM-DD" />
        <Field label="Budget (₹)" value={form.budget} onChange={(v: string) => setForm({ ...form, budget: v })} placeholder="0" keyboardType="numeric" />
        <Field label="Notes" value={form.message} onChange={(v: string) => setForm({ ...form, message: v })} placeholder="Additional details..." multiline />

        <TouchableOpacity style={s.createBtn} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
          <Text style={s.createBtnText}>{saving ? 'Creating...' : 'Create Inquiry + Booking'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, multiline }: any) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={[s.fieldInput, multiline && { height: 70, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} selectionColor={colors.primary} keyboardType={keyboardType} multiline={multiline} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  subtitle: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 18 },
  field: { marginBottom: spacing.lg },
  fieldLabel: { ...typography.labelMd, color: colors.textSecondary, marginBottom: spacing.xs, marginLeft: spacing.xs },
  fieldInput: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text },
  createBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center' },
  createBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
});
