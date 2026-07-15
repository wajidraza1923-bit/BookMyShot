import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function EditProfileScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    try {
      await api.put('/auth/profile', { name: name.trim(), phone: phone.trim() });
      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.field}>
          <Text style={s.label}>Full Name</Text>
          <View style={s.inputRow}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.3)" />
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.2)" />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Phone Number</Text>
          <View style={s.inputRow}>
            <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.3)" />
            <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="phone-pad" />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <View style={[s.inputRow, { opacity: 0.5 }]}>
            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.3)" />
            <Text style={[s.input, { color: '#9CA3AF' }]}>{user?.email || '—'}</Text>
          </View>
          <Text style={s.hint}>Email cannot be changed</Text>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="checkmark-circle" size={18} color="#000" /><Text style={s.saveBtnText}>Save Changes</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingBottom: 12, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, letterSpacing: 0.3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8F6FF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  input: { flex: 1, fontSize: 15, color: '#1F2937' },
  hint: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 15, marginTop: 24 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
