/**
 * CreatorProfile — Full Profile Builder (matches website dashboard)
 * Editable: name, phone, specialty, bio, experience, city, location, category,
 * budgetMin, budgetMax, social links (instagram, youtube, website, twitter, facebook)
 * Also: avatar upload, preview mode
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorProfile({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creators/profile');
      const creator = res.data?.creator;
      const user = creator?.user || {};
      setProfile({ user, creator });
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        specialty: creator?.specialty || '',
        bio: creator?.bio || '',
        experience: creator?.experience || '',
        city: creator?.city || '',
        location: creator?.location || '',
        category: creator?.category || 'wedding',
        budgetMin: String(creator?.budgetMin || ''),
        budgetMax: String(creator?.budgetMax || ''),
        instagram: creator?.social?.instagram || '',
        youtube: creator?.social?.youtube || '',
        website: creator?.social?.website || '',
        twitter: creator?.social?.twitter || '',
        facebook: creator?.social?.facebook || '',
      });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load profile');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    setSaving(true);
    try {
      await api.put('/creators/profile', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        specialty: form.specialty.trim(),
        bio: form.bio.trim(),
        experience: form.experience.trim(),
        city: form.city.trim(),
        location: form.location.trim(),
        category: form.category.trim(),
        budgetMin: Number(form.budgetMin) || 0,
        budgetMax: Number(form.budgetMax) || 0,
        social: {
          instagram: form.instagram.trim(),
          youtube: form.youtube.trim(),
          website: form.website.trim(),
          twitter: form.twitter.trim(),
          facebook: form.facebook.trim(),
        },
      });
      Alert.alert('Saved', 'Profile updated successfully. Changes are live on website & app.');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const uploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission Required', 'Allow photo library access.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('avatar', { uri: asset.uri, name: 'avatar.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      const res = await api.post('/creators/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      if (res.data?.url) {
        Alert.alert('Updated', 'Profile photo updated');
        await load();
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to upload photo');
    } finally { setUploading(false); }
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color="#FF8C2B" style={{ marginTop: 80 }} /></View>;

  const avatar = profile?.user?.avatar || '';
  const creatorId = profile?.creator?.creatorId || '';

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Profile Builder</Text>
          {creatorId && <Text style={s.subtitle}>ID: {creatorId}</Text>}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CreatorProfile', { id: profile?.creator?._id })} style={s.previewBtn}>
          <Ionicons name="eye-outline" size={14} color="#FF8C2B" />
          <Text style={s.previewText}>Preview</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C2B" />}>
        {/* Avatar Section */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={uploadAvatar} style={s.avatarWrap}>
            {avatar ? <Image source={{ uri: avatar }} style={s.avatarImg} /> : <View style={s.avatarPlaceholder}><Ionicons name="person" size={28} color="rgba(255,255,255,0.2)" /></View>}
            <View style={s.avatarBadge}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={12} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text style={s.avatarHint}>Tap to change photo</Text>
        </View>

        {/* BASIC INFO */}
        <SectionHeader title="Basic Information" icon="person-outline" />
        <View style={s.fieldGroup}>
          <Field label="Full Name *" value={form.name} onChange={(v: string) => setForm({...form, name: v})} icon="person-outline" />
          <Field label="Phone" value={form.phone} onChange={(v: string) => setForm({...form, phone: v})} icon="call-outline" keyboard="phone-pad" />
          <Field label="Specialty / Profession" value={form.specialty} onChange={(v: string) => setForm({...form, specialty: v})} icon="camera-outline" placeholder="e.g. Wedding Photographer" />
          <Field label="Category" value={form.category} onChange={(v: string) => setForm({...form, category: v})} icon="grid-outline" placeholder="e.g. wedding, cinematography" />
          <Field label="City" value={form.city} onChange={(v: string) => setForm({...form, city: v})} icon="location-outline" placeholder="e.g. Poonch" />
          <Field label="Location / Area" value={form.location} onChange={(v: string) => setForm({...form, location: v})} icon="map-outline" placeholder="e.g. Jammu & Kashmir" />
          <Field label="Experience" value={form.experience} onChange={(v: string) => setForm({...form, experience: v})} icon="briefcase-outline" placeholder="e.g. 5+ years" />
        </View>

        {/* BIO */}
        <SectionHeader title="About Me" icon="document-text-outline" />
        <View style={s.fieldGroup}>
          <Field label="Bio / About" value={form.bio} onChange={(v: string) => setForm({...form, bio: v})} icon="document-text-outline" multiline placeholder="Tell clients about yourself, your style, and your work..." />
        </View>

        {/* PRICING */}
        <SectionHeader title="Pricing" icon="wallet-outline" />
        <View style={s.fieldGroup}>
          <View style={s.priceRow}>
            <View style={{ flex: 1 }}>
              <Field label="Min Budget (₹)" value={form.budgetMin} onChange={(v: string) => setForm({...form, budgetMin: v})} icon="trending-down-outline" keyboard="numeric" placeholder="e.g. 10000" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Max Budget (₹)" value={form.budgetMax} onChange={(v: string) => setForm({...form, budgetMax: v})} icon="trending-up-outline" keyboard="numeric" placeholder="e.g. 100000" />
            </View>
          </View>
        </View>

        {/* SOCIAL LINKS */}
        <SectionHeader title="Social Links" icon="globe-outline" />
        <View style={s.fieldGroup}>
          <Field label="Instagram" value={form.instagram} onChange={(v: string) => setForm({...form, instagram: v})} icon="logo-instagram" placeholder="https://instagram.com/..." />
          <Field label="YouTube" value={form.youtube} onChange={(v: string) => setForm({...form, youtube: v})} icon="logo-youtube" placeholder="https://youtube.com/..." />
          <Field label="Website" value={form.website} onChange={(v: string) => setForm({...form, website: v})} icon="globe-outline" placeholder="https://yoursite.com" />
          <Field label="Twitter / X" value={form.twitter} onChange={(v: string) => setForm({...form, twitter: v})} icon="logo-twitter" placeholder="https://x.com/..." />
          <Field label="Facebook" value={form.facebook} onChange={(v: string) => setForm({...form, facebook: v})} icon="logo-facebook" placeholder="https://facebook.com/..." />
        </View>

        {/* QUICK LINKS */}
        <SectionHeader title="More Settings" icon="settings-outline" />
        <View style={s.linksGroup}>
          <QuickLink icon="images-outline" label="Manage Portfolio" sub={`${profile?.creator?.portfolio?.length || 0} photos, ${profile?.creator?.videos?.length || 0} videos`} onPress={() => navigation.navigate('CreatorPortfolio')} />
          <QuickLink icon="pricetag-outline" label="Manage Packages" sub={`${profile?.creator?.packages?.length || 0} packages`} onPress={() => navigation.navigate('CreatorPackages')} />
          <QuickLink icon="calendar-outline" label="Availability Calendar" onPress={() => navigation.navigate('CreatorAvailability')} />
          <QuickLink icon="star-outline" label="Reviews" sub={`${profile?.creator?.rating?.toFixed(1) || '5.0'} rating`} onPress={() => navigation.navigate('CreatorReviews')} />
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="checkmark-circle" size={16} color="#000" /><Text style={s.saveBtnText}>Save Profile</Text></>}
        </TouchableOpacity>

        <Text style={s.syncNote}>Changes sync instantly to website & app</Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={s.secHeader}>
      <Ionicons name={icon as any} size={14} color="#FF8C2B" />
      <Text style={s.secTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, value, onChange, icon, multiline, keyboard, placeholder }: any) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldInput, multiline && { height: 90, alignItems: 'flex-start' }]}>
        <Ionicons name={icon} size={14} color="rgba(255,140,43,0.4)" style={{ marginTop: multiline ? 10 : 0 }} />
        <TextInput
          style={[s.fieldText, multiline && { height: 80, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || ''}
          placeholderTextColor="rgba(255,255,255,0.15)"
          selectionColor="#FF8C2B"
          multiline={multiline}
          keyboardType={keyboard || 'default'}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

function QuickLink({ icon, label, sub, onPress }: any) {
  return (
    <TouchableOpacity style={s.quickLink} onPress={onPress} activeOpacity={0.7}>
      <View style={s.qlIcon}><Ionicons name={icon} size={16} color="#FF8C2B" /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.qlLabel}>{label}</Text>
        {sub && <Text style={s.qlSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.15)', borderRadius: 8 },
  previewText: { fontSize: 10, fontWeight: '600', color: '#6C3BFF' },
  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 16 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,140,43,0.3)' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#050403' },
  avatarHint: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 },
  // Sections
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  secTitle: { fontSize: 12, fontWeight: '700', color: '#6C3BFF', letterSpacing: 0.5 },
  fieldGroup: { paddingHorizontal: 20 },
  priceRow: { flexDirection: 'row', gap: 10 },
  // Fields
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: 5, letterSpacing: 0.2 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 12, height: 42 },
  fieldText: { flex: 1, fontSize: 13, color: '#fff' },
  // Quick Links
  linksGroup: { paddingHorizontal: 20, gap: 6 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  qlIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,140,43,0.06)', alignItems: 'center', justifyContent: 'center' },
  qlLabel: { fontSize: 12, fontWeight: '600', color: '#fff' },
  qlSub: { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 20, marginTop: 24, backgroundColor: '#6C3BFF', paddingVertical: 14, borderRadius: 12 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  syncNote: { fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8 },
});
