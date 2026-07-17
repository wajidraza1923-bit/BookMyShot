/**
 * AdminContentManager — Full CMS for managing all dynamic frontend content
 * Manages: Categories, Districts, Trending Searches, Inspiration, Testimonials, Wedding Moments
 * All CRUD operations use the same APIs as the website admin panel.
 * Real-time sync: changes here reflect immediately on website + mobile app.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, Platform, Image, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

const { width } = Dimensions.get('window');

type ContentType = 'categories' | 'districts' | 'trending' | 'inspiration' | 'testimonials' | 'moments';

interface ContentConfig {
  id: ContentType;
  label: string;
  icon: string;
  endpoint: string;
  fields: FieldConfig[];
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'multiline' | 'icon' | 'image' | 'boolean' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

const CONTENT_CONFIGS: ContentConfig[] = [
  {
    id: 'categories', label: 'Categories', icon: 'grid', endpoint: '/discover/admin/categories',
    fields: [
      { key: 'name', label: 'Category Name', type: 'text', required: true, placeholder: 'e.g. Wedding Photography' },
      { key: 'icon', label: 'Icon (Ionicons)', type: 'icon', placeholder: 'e.g. camera, film, videocam' },
      { key: 'imageUrl', label: 'Cover Image URL', type: 'image', placeholder: 'https://...' },
      { key: 'sortOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      { key: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
  {
    id: 'districts', label: 'Districts', icon: 'location', endpoint: '/discover/admin/districts',
    fields: [
      { key: 'name', label: 'District Name', type: 'text', required: true, placeholder: 'e.g. Poonch' },
      { key: 'state', label: 'State', type: 'text', placeholder: 'Jammu & Kashmir' },
      { key: 'imageUrl', label: 'District Image URL', type: 'image', placeholder: 'https://...' },
      { key: 'sortOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      { key: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
  {
    id: 'trending', label: 'Trending Searches', icon: 'trending-up', endpoint: '/discover/admin/trending-searches',
    fields: [
      { key: 'title', label: 'Search Title', type: 'text', required: true, placeholder: 'e.g. Pre Wedding' },
      { key: 'icon', label: 'Icon (Ionicons)', type: 'icon', placeholder: 'e.g. heart-circle, camera' },
      { key: 'sortOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      { key: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
  {
    id: 'inspiration', label: 'Inspiration Gallery', icon: 'images', endpoint: '/discover/admin/inspiration',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Royal Kashmiri Weddings' },
      { key: 'imageUrl', label: 'Image URL', type: 'image', required: true, placeholder: 'https://...' },
      { key: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Traditional, Cinematic' },
      { key: 'sortOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      { key: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
  {
    id: 'testimonials', label: 'Testimonials', icon: 'chatbubbles', endpoint: '/testimonials/admin',
    fields: [
      { key: 'name', label: 'Couple Name', type: 'text', required: true, placeholder: 'e.g. Priya & Rahul' },
      { key: 'city', label: 'City', type: 'text', placeholder: 'e.g. Srinagar' },
      { key: 'eventType', label: 'Event Type', type: 'text', placeholder: 'e.g. Wedding, Pre Wedding' },
      { key: 'rating', label: 'Rating (1-5)', type: 'number', placeholder: '5' },
      { key: 'review', label: 'Review Text', type: 'multiline', required: true, placeholder: 'Write the testimonial...' },
      { key: 'verifiedBooking', label: 'Verified Booking', type: 'boolean' },
      { key: 'sortOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      { key: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
  {
    id: 'moments', label: 'Wedding Moments', icon: 'heart', endpoint: '/featured-wedding-moments/admin',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Royal Wedding' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Udaipur, India' },
      { key: 'imageUrl', label: 'Image URL', type: 'image', required: true, placeholder: 'https://...' },
      { key: 'sortOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      { key: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
];

export default function AdminContentManager({ navigation }: any) {
  const [activeType, setActiveType] = useState<ContentType>('categories');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const config = CONTENT_CONFIGS.find(c => c.id === activeType)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(config.endpoint);
      setItems(res.data?.data || []);
    } catch (e: any) {
      console.log('[CMS] Load error:', e.message);
      setItems([]);
    } finally { setLoading(false); }
  }, [activeType]);

  useEffect(() => { load(); }, [activeType]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Open modal for adding
  const openAdd = () => {
    const defaults: any = {};
    config.fields.forEach(f => {
      if (f.type === 'boolean') defaults[f.key] = true;
      else if (f.type === 'number') defaults[f.key] = 0;
      else defaults[f.key] = '';
    });
    setEditingItem(null);
    setFormData(defaults);
    setModalVisible(true);
  };

  // Open modal for editing
  const openEdit = (item: any) => {
    const data: any = {};
    config.fields.forEach(f => {
      data[f.key] = item[f.key] ?? (f.type === 'boolean' ? true : f.type === 'number' ? 0 : '');
    });
    setEditingItem(item);
    setFormData(data);
    setModalVisible(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    // Validate required fields
    const missingFields = config.fields.filter(f => f.required && !formData[f.key]);
    if (missingFields.length > 0) {
      Alert.alert('Required', `Please fill: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {};
      config.fields.forEach(f => {
        let val = formData[f.key];
        if (f.type === 'number') val = Number(val) || 0;
        payload[f.key] = val;
      });

      if (editingItem) {
        await api.put(`${config.endpoint}/${editingItem._id}`, payload);
      } else {
        await api.post(config.endpoint, payload);
      }
      setModalVisible(false);
      setFormData({});
      setEditingItem(null);
      await load();
      Alert.alert('Success', editingItem ? 'Item updated' : 'Item created');
    } catch (e: any) {
      console.log('[CMS] Save error:', e.response?.status, e.response?.data);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  // Upload image from gallery
  const pickImage = async (fieldKey: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission Required', 'Allow photo library access.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    Alert.alert('Uploading...', 'Please wait while the image uploads.');

    try {
      const fd = new FormData();
      fd.append('image', { uri: asset.uri, name: 'image.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      const res = await api.post('/discover/admin/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      if (res.data?.url) {
        setFormData({ ...formData, [fieldKey]: res.data.url });
        Alert.alert('Uploaded', 'Image uploaded successfully');
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e.response?.data?.message || 'Could not upload image');
    }
  };

  // Delete
  const handleDelete = (item: any) => {
    const name = item.name || item.title || 'this item';
    Alert.alert('Delete', `Delete "${name}"? This will remove it from the website and app immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`${config.endpoint}/${item._id}`);
          await load();
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.message || 'Failed to delete');
        }
      }},
    ]);
  };

  // Toggle active status
  const toggleActive = async (item: any) => {
    try {
      await api.put(`${config.endpoint}/${item._id}`, { isActive: !item.isActive });
      await load();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Move item order
  const moveItem = async (item: any, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i._id === item._id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const swapItem = items[swapIdx];
    try {
      await Promise.all([
        api.put(`${config.endpoint}/${item._id}`, { sortOrder: swapItem.sortOrder ?? swapIdx }),
        api.put(`${config.endpoint}/${swapItem._id}`, { sortOrder: item.sortOrder ?? idx }),
      ]);
      await load();
    } catch {
      Alert.alert('Error', 'Failed to reorder');
    }
  };

  const getImageUrl = (item: any) => item.imageUrl || item.image || '';
  const getDisplayName = (item: any) => item.name || item.title || item.label || '—';
  const getSubtext = (item: any) => {
    if (activeType === 'categories') return `Icon: ${item.icon || 'none'} • Order: ${item.sortOrder ?? 0}`;
    if (activeType === 'districts') return `${item.state || 'J&K'} • Creators: ${item.creatorCount || 0}`;
    if (activeType === 'trending') return `Icon: ${item.icon || 'search'} • Order: ${item.sortOrder ?? 0}`;
    if (activeType === 'inspiration') return `${item.category || 'General'} • Order: ${item.sortOrder ?? 0}`;
    if (activeType === 'testimonials') return `${item.city || ''} • ${item.eventType || 'Wedding'} • ⭐${item.rating || 5}`;
    if (activeType === 'moments') return `${item.location || 'India'} • Order: ${item.sortOrder ?? 0}`;
    return '';
  };

  const hasImage = ['categories', 'districts', 'inspiration', 'moments'].includes(activeType);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Content Management</Text>
          <Text style={s.subtitle}>Manage website & app content</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={s.addBtn}>
          <Ionicons name="add" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Type Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {CONTENT_CONFIGS.map(t => (
          <TouchableOpacity key={t.id} style={[s.tab, activeType === t.id && s.tabActive]} onPress={() => setActiveType(t.id)}>
            <Ionicons name={t.icon as any} size={13} color={activeType === t.id ? '#000' : '#FF8C2B'} />
            <Text style={[s.tabText, activeType === t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Bar */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{items.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: '#10B981' }]}>{items.filter(i => i.isActive !== false).length}</Text>
          <Text style={s.statLabel}>Active</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: '#6B7280' }]}>{items.filter(i => i.isActive === false).length}</Text>
          <Text style={s.statLabel}>Hidden</Text>
        </View>
      </View>

      {/* Items List */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#FF8C2B" />
          <Text style={s.loadingText}>Loading {config.label}...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C2B" colors={['#FF8C2B']} />}
          keyExtractor={item => item._id || String(Math.random())}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="folder-open-outline" size={42} color="rgba(255,255,255,0.08)" />
              <Text style={s.emptyTitle}>No {config.label}</Text>
              <Text style={s.emptyText}>Tap the + button to add your first item.</Text>
              <Text style={s.emptyNote}>Items created here will appear on website & app immediately.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[s.itemCard, item.isActive === false && s.itemCardInactive]}>
              {/* Thumbnail */}
              {hasImage && getImageUrl(item) ? (
                <Image source={{ uri: getImageUrl(item) }} style={s.itemThumb} />
              ) : hasImage ? (
                <View style={s.itemThumbPlaceholder}>
                  <Ionicons name="image-outline" size={18} color="rgba(255,255,255,0.15)" />
                </View>
              ) : (
                <View style={s.itemIconWrap}>
                  <Ionicons name={(item.icon || config.icon) as any} size={16} color="#FF8C2B" />
                </View>
              )}

              {/* Info */}
              <View style={s.itemInfo}>
                <View style={s.itemNameRow}>
                  <Text style={s.itemName} numberOfLines={1}>{getDisplayName(item)}</Text>
                  {item.isActive === false && (
                    <View style={s.hiddenBadge}><Text style={s.hiddenBadgeText}>HIDDEN</Text></View>
                  )}
                  {item.verifiedBooking && (
                    <View style={s.verifiedBadge}><Ionicons name="checkmark-circle" size={10} color="#10B981" /></View>
                  )}
                </View>
                <Text style={s.itemSub} numberOfLines={1}>{getSubtext(item)}</Text>
                {activeType === 'testimonials' && item.review && (
                  <Text style={s.itemReview} numberOfLines={2}>"{item.review}"</Text>
                )}
                <Text style={s.itemDate}>
                  {item.createdAt ? `Added: ${new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                </Text>
              </View>

              {/* Actions */}
              <View style={s.itemActions}>
                {/* Reorder */}
                <View style={s.reorderCol}>
                  <TouchableOpacity onPress={() => moveItem(item, 'up')} disabled={index === 0} style={[s.reorderBtn, index === 0 && { opacity: 0.2 }]}>
                    <Ionicons name="chevron-up" size={12} color="#FF8C2B" />
                  </TouchableOpacity>
                  <Text style={s.orderNum}>{item.sortOrder ?? index}</Text>
                  <TouchableOpacity onPress={() => moveItem(item, 'down')} disabled={index === items.length - 1} style={[s.reorderBtn, index === items.length - 1 && { opacity: 0.2 }]}>
                    <Ionicons name="chevron-down" size={12} color="#FF8C2B" />
                  </TouchableOpacity>
                </View>
                {/* Toggle / Edit / Delete */}
                <TouchableOpacity onPress={() => toggleActive(item)} style={[s.toggleBtn, item.isActive !== false ? s.toggleOn : s.toggleOff]}>
                  <Ionicons name={item.isActive !== false ? 'eye' : 'eye-off'} size={12} color={item.isActive !== false ? '#10B981' : '#6B7280'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(item)} style={s.editBtn}>
                  <Ionicons name="pencil" size={12} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={s.deleteBtn}>
                  <Ionicons name="trash" size={12} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editingItem ? 'Edit' : 'Add'} {config.label.replace(/s$/, '')}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setFormData({}); setEditingItem(null); }} style={s.modalClose}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {editingItem && (
                <View style={s.editingInfo}>
                  <Ionicons name="information-circle" size={14} color="#3B82F6" />
                  <Text style={s.editingInfoText}>Changes will reflect on website & app immediately after save.</Text>
                </View>
              )}

              {/* Form Fields */}
              {config.fields.map(field => (
                <View key={field.key} style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>
                    {field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                  </Text>

                  {field.type === 'boolean' ? (
                    <TouchableOpacity
                      style={[s.boolToggle, formData[field.key] && s.boolToggleActive]}
                      onPress={() => setFormData({ ...formData, [field.key]: !formData[field.key] })}
                    >
                      <View style={[s.boolDot, formData[field.key] && s.boolDotActive]} />
                      <Text style={s.boolText}>{formData[field.key] ? 'Yes' : 'No'}</Text>
                    </TouchableOpacity>
                  ) : field.type === 'image' ? (
                    <View>
                      {/* Upload from Gallery Button */}
                      <TouchableOpacity style={s.uploadImgBtn} onPress={() => pickImage(field.key)}>
                        <Ionicons name="cloud-upload-outline" size={16} color="#FF8C2B" />
                        <Text style={s.uploadImgText}>Upload from Gallery</Text>
                      </TouchableOpacity>
                      {/* OR manual URL input */}
                      <TextInput
                        style={[s.fieldInput, { marginTop: 8 }]}
                        value={String(formData[field.key] || '')}
                        onChangeText={v => setFormData({ ...formData, [field.key]: v })}
                        placeholder="Or paste image URL..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        selectionColor="#FF8C2B"
                        autoCapitalize="none"
                      />
                      {formData[field.key] ? (
                        <View style={s.previewWrap}>
                          <Image source={{ uri: formData[field.key] }} style={s.previewImg} />
                          <TouchableOpacity style={s.removeImgBtn} onPress={() => setFormData({ ...formData, [field.key]: '' })}>
                            <Ionicons name="trash-outline" size={12} color="#EF4444" />
                            <Text style={s.removeImgText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ) : field.type === 'icon' ? (
                    <View>
                      <TextInput
                        style={s.fieldInput}
                        value={String(formData[field.key] || '')}
                        onChangeText={v => setFormData({ ...formData, [field.key]: v })}
                        placeholder={field.placeholder}
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        selectionColor="#FF8C2B"
                        autoCapitalize="none"
                      />
                      {formData[field.key] ? (
                        <View style={s.iconPreview}>
                          <Ionicons name={formData[field.key] as any} size={20} color="#FF8C2B" />
                          <Text style={s.iconPreviewText}>{formData[field.key]}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : field.type === 'multiline' ? (
                    <TextInput
                      style={[s.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                      value={String(formData[field.key] || '')}
                      onChangeText={v => setFormData({ ...formData, [field.key]: v })}
                      placeholder={field.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      selectionColor="#FF8C2B"
                      multiline
                    />
                  ) : field.type === 'number' ? (
                    <TextInput
                      style={s.fieldInput}
                      value={String(formData[field.key] || '')}
                      onChangeText={v => setFormData({ ...formData, [field.key]: v.replace(/[^0-9]/g, '') })}
                      placeholder={field.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      selectionColor="#FF8C2B"
                      keyboardType="numeric"
                    />
                  ) : (
                    <TextInput
                      style={s.fieldInput}
                      value={String(formData[field.key] || '')}
                      onChangeText={v => setFormData({ ...formData, [field.key]: v })}
                      placeholder={field.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      selectionColor="#FF8C2B"
                    />
                  )}
                </View>
              ))}

              {/* Save / Cancel buttons */}
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.modalCancelBtn} onPress={() => { setModalVisible(false); setFormData({}); setEditingItem(null); }}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalSaveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#000" /> : (
                    <><Ionicons name="checkmark" size={14} color="#000" /><Text style={s.modalSaveText}>{editingItem ? 'Update' : 'Create'}</Text></>
                  )}
                </TouchableOpacity>
              </View>

              {/* Delete button in edit mode */}
              {editingItem && (
                <TouchableOpacity style={s.modalDeleteBtn} onPress={() => { setModalVisible(false); handleDelete(editingItem); }}>
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={s.modalDeleteText}>Delete this item</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  // Tabs
  tabsScroll: { maxHeight: 44, marginBottom: 4 },
  tabsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#EDE9FE', backgroundColor: '#F8F6FF' },
  tabActive: { backgroundColor: '#6C3BFF', borderColor: '#6C3BFF' },
  tabText: { fontSize: 10, color: '#6C3BFF', fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  // Stats bar
  statsBar: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 8, backgroundColor: '#F8F6FF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#EDE9FE' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '700', color: '#6C3BFF' },
  statLabel: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#EDE9FE' },
  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText: { fontSize: 12, color: '#9CA3AF', marginTop: 10 },
  // Empty
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#4B5563', marginTop: 12 },
  emptyText: { fontSize: 11, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  emptyNote: { fontSize: 10, color: '#6C3BFF', marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  // Item Card
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F1F0F7', marginBottom: 8 },
  itemCardInactive: { opacity: 0.55, borderColor: '#E5E7EB' },
  itemThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F3F4F6' },
  itemThumbPlaceholder: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  itemIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1F2937', flex: 1 },
  hiddenBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  hiddenBadgeText: { fontSize: 7, fontWeight: '700', color: '#DC2626' },
  verifiedBadge: { marginLeft: 2 },
  itemSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  itemReview: { fontSize: 9, color: '#9CA3AF', marginTop: 3, fontStyle: 'italic', lineHeight: 13 },
  itemDate: { fontSize: 8, color: '#9CA3AF', marginTop: 3 },
  // Actions
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reorderCol: { alignItems: 'center', marginRight: 4 },
  reorderBtn: { padding: 2 },
  orderNum: { fontSize: 8, color: '#9CA3AF' },
  toggleBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: '#D1FAE5' },
  toggleOff: { backgroundColor: '#F3F4F6' },
  editBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '90%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  editingInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 10, padding: 10, marginBottom: 14 },
  editingInfoText: { fontSize: 10, color: '#2563EB', flex: 1 },
  // Form
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: '#4B5563', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' },
  fieldInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1F2937' },
  boolToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  boolToggleActive: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  boolDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#D1D5DB' },
  boolDotActive: { backgroundColor: '#10B981' },
  boolText: { fontSize: 12, color: '#1F2937' },
  previewWrap: { marginTop: 8, alignItems: 'center' },
  previewImg: { width: width - 80, height: 120, borderRadius: 10, backgroundColor: '#F3F4F6' },
  previewLabel: { fontSize: 9, color: '#9CA3AF', marginTop: 4 },
  uploadImgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F8F6FF', borderWidth: 1, borderColor: '#EDE9FE', borderRadius: 10, paddingVertical: 12, borderStyle: 'dashed' },
  uploadImgText: { fontSize: 12, fontWeight: '600', color: '#6C3BFF' },
  removeImgBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  removeImgText: { fontSize: 10, color: '#EF4444' },
  iconPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, backgroundColor: '#F8F6FF', borderRadius: 8, padding: 8 },
  iconPreviewText: { fontSize: 11, color: '#6B7280' },
  // Modal buttons
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  modalCancelText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  modalSaveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#6C3BFF' },
  modalSaveText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  modalDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#FEE2E2', borderRadius: 10 },
  modalDeleteText: { fontSize: 12, color: '#EF4444' },
});

