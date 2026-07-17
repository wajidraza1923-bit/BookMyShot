import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, Alert, TextInput, Image, RefreshControl, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

const MAX_IMAGES = 10;

export default function AdminFeaturedMoments({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [moments, setMoments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [uploading, setUploading] = useState('');
  const [coverFile, setCoverFile] = useState<any>(null);
  const [form, setForm] = useState({
    coverImage: '', title: '', description: '', category: 'Photography',
    city: '', creatorName: '', rating: '', sortOrder: '0', status: 'active', isFeatured: true,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/featured-moments/admin/all');
      setMoments(res.data?.data || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  const saveForm = async () => {
    if (!form.title || !form.city) { Alert.alert('Error', 'Title and city required'); return; }
    if (!editId && !form.coverImage && !coverFile) { Alert.alert('Error', 'Cover image is required'); return; }
    try {
      const body: any = { ...form, rating: Number(form.rating) || 0, sortOrder: Number(form.sortOrder) || 0 };
      if (editId) {
        if (coverFile) {
          setUploading('cover');
          const fd = new FormData();
          const ext = coverFile.uri.split('.').pop() || 'jpg';
          fd.append('cover', { uri: coverFile.uri, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`, name: `cover.${ext}` } as any);
          const upRes = await api.post(`/featured-moments/admin/${editId}/upload-cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
          if (upRes.data?.data?.coverImage) body.coverImage = upRes.data.data.coverImage;
          setUploading('');
        }
        await api.put(`/featured-moments/admin/${editId}`, body);
      } else {
        body.coverImage = body.coverImage || 'pending';
        const createRes = await api.post('/featured-moments/admin/create', body);
        const newId = createRes.data?.data?._id;
        if (newId && coverFile) {
          setUploading('cover');
          const fd = new FormData();
          const ext = coverFile.uri.split('.').pop() || 'jpg';
          fd.append('cover', { uri: coverFile.uri, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`, name: `cover.${ext}` } as any);
          await api.post(`/featured-moments/admin/${newId}/upload-cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
          setUploading('');
        }
      }
      Alert.alert('Success', editId ? 'Updated!' : 'Created!');
      resetForm(); loadData();
    } catch (e: any) { setUploading(''); Alert.alert('Error', e.response?.data?.message || e.message || 'Failed'); }
  };

  const deleteMoment = (id: string) => {
    Alert.alert('Delete', 'Delete this moment and all its images from Cloudinary?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/featured-moments/admin/${id}`); loadData(); }
        catch {} }
      },
    ]);
  };

  const toggleStatus = async (id: string, current: string) => {
    try { await api.put(`/featured-moments/admin/${id}`, { status: current === 'active' ? 'inactive' : 'active' }); loadData(); } catch {}
  };

  const editMoment = (m: any) => {
    setEditId(m._id);
    setForm({ coverImage: m.coverImage || '', title: m.title || '', description: m.description || '', category: m.category || 'Photography', city: m.city || '', creatorName: m.creatorName || '', rating: String(m.rating || ''), sortOrder: String(m.sortOrder || 0), status: m.status || 'active', isFeatured: m.isFeatured !== false });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditId(''); setShowForm(false); setCoverFile(null);
    setForm({ coverImage: '', title: '', description: '', category: 'Photography', city: '', creatorName: '', rating: '', sortOrder: '0', status: 'active', isFeatured: true });
  };

  // ═══ IMAGE UPLOAD ═══
  const uploadImages = async (momentId: string) => {
    const m = moments.find(x => x._id === momentId);
    const currentCount = (m?.galleryImages || []).length;
    if (currentCount >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    const remaining = MAX_IMAGES - currentCount;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission', 'Allow photo library access'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    // Validate
    for (const asset of result.assets) {
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        Alert.alert('Error', 'Max 10 MB per image');
        return;
      }
    }

    setUploading(momentId);
    try {
      const formData = new FormData();
      result.assets.forEach((asset, i) => {
        const ext = asset.uri.split('.').pop() || 'jpg';
        formData.append('images', {
          uri: asset.uri,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          name: `moment_${i}.${ext}`,
        } as any);
      });

      const res = await api.post(`/featured-moments/admin/${momentId}/upload-images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      if (res.data?.success) {
        Alert.alert('Uploaded', res.data.message || `${result.assets.length} image(s) uploaded`);
        loadData();
      } else {
        Alert.alert('Error', res.data?.message || 'Upload failed');
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e.response?.data?.message || e.message || 'Network error');
    } finally { setUploading(''); }
  };

  const deleteImage = (momentId: string, imageId: string) => {
    Alert.alert('Delete Image', 'Remove this image permanently?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/featured-moments/admin/${momentId}/image/${imageId}`); loadData(); }
        catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
      }},
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#1F2937" /></TouchableOpacity>
        <Text style={s.headerTitle}>✨ Featured Moments</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(!showForm); }}><Ionicons name={showForm ? 'close' : 'add-circle'} size={24} color="#6C3BFF" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#6C3BFF']} />}>
        {/* Create/Edit Form */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>{editId ? 'Edit Moment' : 'Add New Moment'}</Text>
            <Text style={s.label}>Cover Image *</Text>
            <TouchableOpacity style={s.coverPicker} onPress={async () => {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) { Alert.alert('Permission', 'Allow photo access'); return; }
              const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
              if (!r.canceled && r.assets?.length) { setCoverFile(r.assets[0]); setForm({...form, coverImage: r.assets[0].uri}); }
            }}>
              {form.coverImage ? (
                <Image source={{ uri: form.coverImage }} style={s.coverPreview} />
              ) : (
                <View style={s.coverEmpty}>
                  <Ionicons name="image-outline" size={28} color="#6C3BFF" />
                  <Text style={s.coverPickText}>Tap to select cover image</Text>
                  <Text style={{ fontSize: 9, color: '#9CA3AF' }}>16:9 ratio recommended</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={s.label}>Title *</Text>
            <TextInput style={s.input} value={form.title} onChangeText={v => setForm({...form, title: v})} placeholder="Beautiful Wedding" />
            <Text style={s.label}>Description</Text>
            <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => setForm({...form, description: v})} placeholder="About..." multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={s.label}>Category</Text><TextInput style={s.input} value={form.category} onChangeText={v => setForm({...form, category: v})} /></View>
              <View style={{ flex: 1 }}><Text style={s.label}>City *</Text><TextInput style={s.input} value={form.city} onChangeText={v => setForm({...form, city: v})} placeholder="Mumbai" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={s.label}>Creator</Text><TextInput style={s.input} value={form.creatorName} onChangeText={v => setForm({...form, creatorName: v})} /></View>
              <View style={{ flex: 1 }}><Text style={s.label}>Rating</Text><TextInput style={s.input} value={form.rating} onChangeText={v => setForm({...form, rating: v})} keyboardType="numeric" /></View>
            </View>
            <TouchableOpacity style={s.saveBtn} onPress={saveForm}><Text style={s.saveBtnText}>{editId ? 'Update' : 'Create'}</Text></TouchableOpacity>
          </View>
        )}

        {/* Moments List */}
        {moments.length === 0 ? (
          <View style={s.empty}><Ionicons name="images-outline" size={40} color="#E5E7EB" /><Text style={{ color: '#9CA3AF', marginTop: 10 }}>No moments yet. Create one above.</Text></View>
        ) : moments.map(m => (
          <View key={m._id} style={s.card}>
            {m.coverImage ? <Image source={{ uri: m.coverImage }} style={s.cardImage} /> : null}
            <View style={s.cardBody}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={s.catBadge}><Text style={s.catBadgeText}>{m.category}</Text></View>
                <View style={[s.statusBadge, { backgroundColor: m.status === 'active' ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: m.status === 'active' ? '#059669' : '#DC2626' }}>{m.status}</Text>
                </View>
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>{m.title}</Text>
              <Text style={s.cardMeta}>👤 {m.creatorName || 'N/A'} • 📍 {m.city} • ⭐ {m.rating || 0}</Text>

              {/* Gallery Images */}
              <View style={s.gallerySection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={s.galleryTitle}>📷 Gallery ({(m.galleryImages || []).length}/{MAX_IMAGES})</Text>
                  <TouchableOpacity
                    style={[s.uploadBtn, uploading === m._id && { opacity: 0.5 }]}
                    onPress={() => uploadImages(m._id)}
                    disabled={uploading === m._id}
                  >
                    {uploading === m._id ? (
                      <ActivityIndicator size="small" color="#6C3BFF" />
                    ) : (
                      <><Ionicons name="cloud-upload" size={14} color="#6C3BFF" /><Text style={s.uploadBtnText}>Upload</Text></>
                    )}
                  </TouchableOpacity>
                </View>

                {(m.galleryImages || []).length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {m.galleryImages.map((img: any) => (
                      <View key={img._id} style={s.galleryItem}>
                        <Image source={{ uri: img.url }} style={s.galleryImg} />
                        <TouchableOpacity style={s.galleryDelete} onPress={() => deleteImage(m._id, img._id)}>
                          <Ionicons name="close" size={10} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', paddingVertical: 10 }}>No images. Tap Upload to add.</Text>
                )}
              </View>

              {/* Actions */}
              <View style={s.cardActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => editMoment(m)}><Ionicons name="create-outline" size={14} color="#6C3BFF" /><Text style={s.actionText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: m.status === 'active' ? '#FEF3C7' : '#D1FAE5' }]} onPress={() => toggleStatus(m._id, m.status)}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: m.status === 'active' ? '#B45309' : '#059669' }}>{m.status === 'active' ? 'Disable' : 'Enable'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => deleteMoment(m._id)}><Ionicons name="trash-outline" size={14} color="#DC2626" /></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  // Form
  formCard: { backgroundColor: '#F8F6FF', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EDE9FE' },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1F2937' },
  coverPicker: { borderWidth: 2, borderColor: '#EDE9FE', borderStyle: 'dashed', borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  coverPreview: { width: '100%', height: 140, resizeMode: 'cover' },
  coverEmpty: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  coverPickText: { fontSize: 12, fontWeight: '600', color: '#6C3BFF' },
  saveBtn: { backgroundColor: '#6C3BFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 60 },
  // Card
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#F1F0F7' },
  cardImage: { width: '100%', height: 160, resizeMode: 'cover' },
  cardBody: { padding: 14 },
  catBadge: { backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 9, fontWeight: '700', color: '#7C3AED' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  cardMeta: { fontSize: 10, color: '#6B7280', marginBottom: 8 },
  // Gallery
  gallerySection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#F1F0F7' },
  galleryTitle: { fontSize: 11, fontWeight: '700', color: '#1F2937' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3E8FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  uploadBtnText: { fontSize: 10, fontWeight: '700', color: '#6C3BFF' },
  galleryItem: { position: 'relative' },
  galleryImg: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6' },
  galleryDelete: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  // Actions
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  actionText: { fontSize: 10, fontWeight: '600', color: '#6C3BFF' },
});
