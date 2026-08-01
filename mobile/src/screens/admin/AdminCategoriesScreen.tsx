/**
 * AdminCategoriesScreen — Full category & subcategory management
 * Manage: categories (name, slug, group, icon, image, emoji, order)
 * Manage: subcategories under each category
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

interface Category {
  _id: string;
  name: string;
  slug: string;
  group: string;
  icon: string;
  imageUrl: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  showOnHomepage: boolean;
  creatorCount?: number;
}

interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  parentCategorySlug: string;
  icon: string;
  imageUrl: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  creatorCount?: number;
}

export default function AdminCategoriesScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: '', group: '', icon: 'camera-outline', imageUrl: '', description: '', sortOrder: '0', isActive: true, showOnHomepage: true });
  const [subForm, setSubForm] = useState({ name: '', icon: 'ellipse-outline', imageUrl: '', description: '', sortOrder: '0', isActive: true });

  const loadCategories = useCallback(async () => {
    try {
      // Fetch categories with creator counts (same data as public endpoint)
      const res = await api.get('/discover/categories');
      setCategories(res.data?.data || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load categories');
    } finally { setLoading(false); }
  }, []);

  const loadSubcategories = async (catSlug: string) => {
    try {
      const res = await api.get(`/subcategories/${catSlug}`);
      setSubcategories(res.data?.data || []);
    } catch { setSubcategories([]); }
  };

  useEffect(() => { loadCategories(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadCategories(); if (selectedCat) await loadSubcategories(selectedCat.slug); setRefreshing(false); };

  // ═══ CATEGORY CRUD ═══
  const openAddCategory = () => {
    setEditItem(null);
    setForm({ name: '', group: '', icon: 'camera-outline', imageUrl: '', description: '', sortOrder: String(categories.length + 1), isActive: true, showOnHomepage: true });
    setShowCatModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditItem(cat);
    setForm({ name: cat.name, group: cat.group || '', icon: cat.icon || 'camera-outline', imageUrl: cat.imageUrl || '', description: cat.description || '', sortOrder: String(cat.sortOrder || 0), isActive: cat.isActive !== false, showOnHomepage: cat.showOnHomepage !== false });
    setShowCatModal(true);
  };

  const saveCategory = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Category name is required'); return; }
    setSaving(true);
    try {
      const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const payload = { ...form, slug, sortOrder: parseInt(form.sortOrder) || 0 };
      if (editItem) {
        await api.put(`/discover/admin/categories/${editItem._id}`, payload);
      } else {
        await api.post('/discover/admin/categories', payload);
      }
      setShowCatModal(false);
      await loadCategories();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteCategory = (cat: Category) => {
    Alert.alert('Delete Category', `Are you sure you want to delete "${cat.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/discover/admin/categories/${cat._id}`);
          await loadCategories();
          if (selectedCat?._id === cat._id) { setSelectedCat(null); setSubcategories([]); }
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to delete'); }
      }},
    ]);
  };

  // ═══ SUBCATEGORY CRUD ═══
  const openAddSub = () => {
    if (!selectedCat) { Alert.alert('Select a category first'); return; }
    setEditItem(null);
    setSubForm({ name: '', icon: 'ellipse-outline', imageUrl: '', description: '', sortOrder: String(subcategories.length + 1), isActive: true });
    setShowSubModal(true);
  };

  const openEditSub = (sub: Subcategory) => {
    setEditItem(sub);
    setSubForm({ name: sub.name, icon: sub.icon || 'ellipse-outline', imageUrl: sub.imageUrl || '', description: sub.description || '', sortOrder: String(sub.sortOrder || 0), isActive: sub.isActive !== false });
    setShowSubModal(true);
  };

  const saveSub = async () => {
    if (!subForm.name.trim() || !selectedCat) { Alert.alert('Error', 'Subcategory name is required'); return; }
    setSaving(true);
    try {
      const slug = subForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const payload = { ...subForm, slug, parentCategorySlug: selectedCat.slug, sortOrder: parseInt(subForm.sortOrder) || 0 };
      if (editItem) {
        await api.put(`/subcategories/${editItem._id}`, payload);
      } else {
        await api.post('/subcategories', payload);
      }
      setShowSubModal(false);
      await loadSubcategories(selectedCat.slug);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteSub = (sub: Subcategory) => {
    Alert.alert('Delete Subcategory', `Delete "${sub.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/subcategories/${sub._id}`);
          if (selectedCat) await loadSubcategories(selectedCat.slug);
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }},
    ]);
  };

  const selectCategory = (cat: Category) => {
    setSelectedCat(cat);
    loadSubcategories(cat.slug);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.title}>Categories & Services</Text>
        <TouchableOpacity onPress={openAddCategory} style={s.addBtn}>
          <Ionicons name="add" size={20} color="#6C3BFF" />
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Categories List */}
        <Text style={s.sectionTitle}>Categories ({categories.length})</Text>
        {categories.map(cat => (
          <TouchableOpacity key={cat._id} style={[s.catCard, selectedCat?._id === cat._id && s.catCardActive]} onPress={() => selectCategory(cat)} activeOpacity={0.8}>
            <View style={s.catLeft}>
              {cat.imageUrl ? (
                <Image source={{ uri: cat.imageUrl }} style={s.catImg} />
              ) : (
                <View style={s.catIcon}><Ionicons name={(cat.icon || 'grid-outline') as any} size={20} color="#6C3BFF" /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.catName}>{cat.name}</Text>
                <Text style={s.catMeta}>{cat.group || 'General'} • {cat.creatorCount || 0} creators</Text>
                {cat.description ? <Text style={s.catDesc} numberOfLines={1}>{cat.description}</Text> : null}
              </View>
            </View>
            <View style={s.catActions}>
              <View style={[s.statusDot, { backgroundColor: cat.isActive ? '#10B981' : '#EF4444' }]} />
              <TouchableOpacity onPress={() => openEditCategory(cat)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="create-outline" size={18} color="#6C3BFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCategory(cat)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Subcategories */}
        {selectedCat && (
          <View style={s.subSection}>
            <View style={s.subHeader}>
              <Text style={s.sectionTitle}>Subcategories — {selectedCat.name} ({subcategories.length})</Text>
              <TouchableOpacity onPress={openAddSub} style={s.addSubBtn}>
                <Ionicons name="add-circle" size={22} color="#6C3BFF" />
              </TouchableOpacity>
            </View>
            {subcategories.length === 0 ? (
              <Text style={s.emptyText}>No subcategories yet. Tap + to add.</Text>
            ) : (
              subcategories.map(sub => (
                <View key={sub._id} style={s.subCard}>
                  <View style={s.subLeft}>
                    <View style={s.subIcon}><Ionicons name={(sub.icon || 'ellipse-outline') as any} size={16} color="#7C3AED" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.subName}>{sub.name}</Text>
                      <Text style={s.subMeta}>slug: {sub.slug} • {sub.creatorCount || 0} creators</Text>
                    </View>
                  </View>
                  <View style={s.catActions}>
                    <View style={[s.statusDot, { backgroundColor: sub.isActive ? '#10B981' : '#EF4444' }]} />
                    <TouchableOpacity onPress={() => openEditSub(sub)}><Ionicons name="create-outline" size={16} color="#6C3BFF" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteSub(sub)}><Ionicons name="trash-outline" size={16} color="#EF4444" /></TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ═══ CATEGORY MODAL ═══ */}
      <Modal visible={showCatModal} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>{editItem ? 'Edit Category' : 'Add Category'}</Text>
              <Text style={s.fieldLabel}>Name *</Text>
              <TextInput style={s.input} value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="e.g. Makeup Artists" placeholderTextColor="#9CA3AF" />
              <Text style={s.fieldLabel}>Group</Text>
              <TextInput style={s.input} value={form.group} onChangeText={v => setForm({ ...form, group: v })} placeholder="e.g. Beauty, Photography & Video" placeholderTextColor="#9CA3AF" />
              <Text style={s.fieldLabel}>Icon (Ionicons name)</Text>
              <TextInput style={s.input} value={form.icon} onChangeText={v => setForm({ ...form, icon: v })} placeholder="e.g. camera-outline, color-palette-outline" placeholderTextColor="#9CA3AF" />
              <Text style={s.fieldLabel}>Image URL</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[s.input, { flex: 1 }]} value={form.imageUrl} onChangeText={v => setForm({ ...form, imageUrl: v })} placeholder="https://... or pick from gallery" placeholderTextColor="#9CA3AF" />
                <TouchableOpacity style={{ backgroundColor: '#6C3BFF', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }} onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: true });
                  if (!result.canceled && result.assets[0]) {
                    try {
                      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
                      const uploadRes = await api.post('/creators/upload/avatar', { imageUrl: base64 });
                      if (uploadRes.data?.url) setForm({ ...form, imageUrl: uploadRes.data.url });
                    } catch { Alert.alert('Upload Failed', 'Could not upload image'); }
                  }
                }}>
                  <Ionicons name="image-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={{ width: '100%', height: 100, borderRadius: 8, marginTop: 8, marginBottom: 10 }} /> : null}
              <Text style={s.fieldLabel}>Description</Text>
              <TextInput style={[s.input, { height: 60 }]} value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholder="Short description..." placeholderTextColor="#9CA3AF" multiline />
              <Text style={s.fieldLabel}>Sort Order</Text>
              <TextInput style={s.input} value={form.sortOrder} onChangeText={v => setForm({ ...form, sortOrder: v })} keyboardType="number-pad" placeholder="1" placeholderTextColor="#9CA3AF" />
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Active</Text>
                <TouchableOpacity style={[s.toggle, form.isActive && s.toggleActive]} onPress={() => setForm({ ...form, isActive: !form.isActive })}>
                  <Text style={[s.toggleText, form.isActive && { color: '#fff' }]}>{form.isActive ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Show on Homepage</Text>
                <TouchableOpacity style={[s.toggle, form.showOnHomepage && s.toggleActive]} onPress={() => setForm({ ...form, showOnHomepage: !form.showOnHomepage })}>
                  <Text style={[s.toggleText, form.showOnHomepage && { color: '#fff' }]}>{form.showOnHomepage ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCatModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={saveCategory} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>{editItem ? 'Update' : 'Create'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══ SUBCATEGORY MODAL ═══ */}
      <Modal visible={showSubModal} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>{editItem ? 'Edit Subcategory' : 'Add Subcategory'}</Text>
              <Text style={s.fieldLabel}>Name *</Text>
              <TextInput style={s.input} value={subForm.name} onChangeText={v => setSubForm({ ...subForm, name: v })} placeholder="e.g. Bridal Makeup" placeholderTextColor="#9CA3AF" />
              <Text style={s.fieldLabel}>Icon (Ionicons name)</Text>
              <TextInput style={s.input} value={subForm.icon} onChangeText={v => setSubForm({ ...subForm, icon: v })} placeholder="e.g. color-palette-outline" placeholderTextColor="#9CA3AF" />
              <Text style={s.fieldLabel}>Image URL</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[s.input, { flex: 1 }]} value={subForm.imageUrl} onChangeText={v => setSubForm({ ...subForm, imageUrl: v })} placeholder="https://... or pick from gallery" placeholderTextColor="#9CA3AF" />
                <TouchableOpacity style={{ backgroundColor: '#6C3BFF', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }} onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: true });
                  if (!result.canceled && result.assets[0]) {
                    try {
                      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
                      const uploadRes = await api.post('/creators/upload/avatar', { imageUrl: base64 });
                      if (uploadRes.data?.url) setSubForm({ ...subForm, imageUrl: uploadRes.data.url });
                    } catch { Alert.alert('Upload Failed', 'Could not upload image'); }
                  }
                }}>
                  <Ionicons name="image-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              {subForm.imageUrl ? <Image source={{ uri: subForm.imageUrl }} style={{ width: '100%', height: 80, borderRadius: 8, marginTop: 8, marginBottom: 10 }} /> : null}
              <Text style={s.fieldLabel}>Description</Text>
              <TextInput style={[s.input, { height: 50 }]} value={subForm.description} onChangeText={v => setSubForm({ ...subForm, description: v })} placeholder="Optional description" placeholderTextColor="#9CA3AF" multiline />
              <Text style={s.fieldLabel}>Sort Order</Text>
              <TextInput style={s.input} value={subForm.sortOrder} onChangeText={v => setSubForm({ ...subForm, sortOrder: v })} keyboardType="number-pad" placeholder="1" placeholderTextColor="#9CA3AF" />
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Active</Text>
                <TouchableOpacity style={[s.toggle, subForm.isActive && s.toggleActive]} onPress={() => setSubForm({ ...subForm, isActive: !subForm.isActive })}>
                  <Text style={[s.toggleText, subForm.isActive && { color: '#fff' }]}>{subForm.isActive ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowSubModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={saveSub} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>{editItem ? 'Update' : 'Create'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1F2937' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  // Category Card
  catCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  catCardActive: { borderColor: '#6C3BFF', backgroundColor: '#FAFAFF' },
  catLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  catImg: { width: 40, height: 40, borderRadius: 8 },
  catIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  catMeta: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  catDesc: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  catActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  // Subcategory
  subSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  addSubBtn: { padding: 4 },
  subCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  subLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  subIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  subName: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  subMeta: { fontSize: 9, color: '#9CA3AF', marginTop: 1 },
  emptyText: { fontSize: 12, color: '#9CA3AF', marginLeft: 16, marginTop: 8 },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, color: '#1F2937' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  toggleLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  toggle: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  toggleActive: { backgroundColor: '#6C3BFF', borderColor: '#6C3BFF' },
  toggleText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#6C3BFF' },
  saveText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
