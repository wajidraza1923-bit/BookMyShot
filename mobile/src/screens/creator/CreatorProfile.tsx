import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorProfile({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', specialty: '', bio: '', experience: '', city: '', location: '', instagram: '' });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const user = res.data?.user;
      const creator = res.data?.creator;
      setProfile({ user, creator });
      setForm({
        name: user?.name || '',
        phone: user?.phone || '',
        specialty: creator?.specialty || '',
        bio: creator?.bio || '',
        experience: creator?.experience || '',
        city: creator?.city || '',
        location: creator?.location || '',
        instagram: creator?.social?.instagram || '',
      });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { name: form.name, phone: form.phone });
      await api.put('/creators/profile', {
        specialty: form.specialty,
        bio: form.bio,
        experience: form.experience,
        city: form.city,
        location: form.location,
        social: { instagram: form.instagram },
      });
      Alert.alert('Saved', 'Profile updated successfully');
      setEditing(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} style={styles.editBtn}>
          {saving ? <ActivityIndicator size="small" color={colors.primary} /> :
            <Text style={styles.editText}>{editing ? 'Save' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
        <Field label="Full Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} editable={editing} icon="person-outline" />
        <Field label="Phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} editable={editing} icon="call-outline" keyboardType="phone-pad" />
        <Field label="Specialty" value={form.specialty} onChange={(v: string) => setForm({ ...form, specialty: v })} editable={editing} icon="camera-outline" />
        <Field label="City" value={form.city} onChange={(v: string) => setForm({ ...form, city: v })} editable={editing} icon="location-outline" />
        <Field label="Experience" value={form.experience} onChange={(v: string) => setForm({ ...form, experience: v })} editable={editing} icon="briefcase-outline" />
        <Field label="Location / Area" value={form.location} onChange={(v: string) => setForm({ ...form, location: v })} editable={editing} icon="map-outline" />
        <Field label="Instagram" value={form.instagram} onChange={(v: string) => setForm({ ...form, instagram: v })} editable={editing} icon="logo-instagram" />
        <Field label="Bio" value={form.bio} onChange={(v: string) => setForm({ ...form, bio: v })} editable={editing} icon="document-text-outline" multiline />
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, editable, icon, multiline, keyboardType }: any) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputWrap, editable && fieldStyles.inputEditable]}>
        <Ionicons name={icon} size={16} color={editable ? colors.primary : colors.textMuted} style={fieldStyles.icon} />
        <TextInput
          style={[fieldStyles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChange}
          editable={editable}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          multiline={multiline}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { ...typography.labelMd, color: colors.textSecondary, marginBottom: spacing.xs, marginLeft: spacing.xs },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  inputEditable: { borderColor: colors.primary + '40' },
  icon: { marginRight: spacing.sm, marginTop: 2 },
  input: { flex: 1, ...typography.bodyMd, color: colors.text, padding: 0 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  editBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primaryMuted, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderGold },
  editText: { ...typography.labelMd, color: colors.primary, fontWeight: '600' },
});
