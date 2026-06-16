/**
 * AdminContentManager — Unified CMS for managing all dynamic content
 * Manages: Categories, Districts, Trending Searches, Inspiration, Testimonials, Wedding Moments
 * All CRUD operations use the same APIs as the website admin panel.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

type ContentType = 'categories' | 'districts' | 'trending' | 'inspiration' | 'testimonials' | 'moments';

const CONTENT_TYPES: { id: ContentType; label: string; icon: string; endpoint: string }[] = [
  { id: 'categories', label: 'Categories', icon: 'grid', endpoint: '/discover/admin/categories' },
  { id: 'districts', label: 'Districts', icon: 'location', endpoint: '/discover/admin/districts' },
  { id: 'trending', label: 'Trending Searches', icon: 'trending-up', endpoint: '/discover/admin/trending-searches' },
  { id: 'inspiration', label: 'Inspiration Gallery', icon: 'images', endpoint: '/discover/admin/inspiration' },
  { id: 'testimonials', label: 'Testimonials', icon: 'chatbubbles', endpoint: '/testimonials/admin' },
  { id: 'moments', label: 'Wedding Moments', icon: 'heart', endpoint: '/featured-wedding-moments/admin' },
];

export default function AdminContentManager({ navigation }: any) {
  const [activeType, setActiveType] = useState<ContentType>('categories');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<any>({});

  const currentType = CONTENT_TYPES.find(t => t.id === activeType)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(currentType.endpoint);
      setItems(res.data?.data || []);
    } catch (e: any) {
      console.log('[CMS] Load error:', e.message);
      setItems([]);
    } finally { setLoading(false); }
  }, [activeType]);

  useEffect(() => { load(); }, [activeType]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAdd = async () => {
    const endpoint = currentType.endpoint.replace('/admin', '/admin');
    try {
      await api.post(endpoint, newItem);
      setShowAdd(false);
      setNewItem({});
      await load();
      Alert.alert('Added', 'Item created successfully');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`${currentType.endpoint}/${id}`);
          await load();
        } catch (e: any) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`${currentType.endpoint}/${id}`, { isActive: !currentStatus });
      await load();
    } catch {}
  };

  const getDisplayName = (item: any) => item.name || item.title || item.label || '—';
  const getSubtext = (item: any) => {
    if (item.location) return item.location;
    if (item.city) return item.city;
    if (item.slug) return item.slug;
    if (item.state) return item.state;
    if (item.eventType) return item.eventType;
    return item.icon || '';
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
        <Text style={s.title}>Content Management</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.addBtn}><Ionicons name="add" size={18} color="#000" /></TouchableOpacity>
      </View>

      {/* Type Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {CONTENT_TYPES.map(t => (
          <TouchableOpacity key={t.id} style={[s.tab, activeType === t.id && s.tabActive]} onPress={() => setActiveType(t.id)}>
            <Ionicons name={t.icon as any} size={14} color={activeType === t.id ? '#000' : '#FF8C2B'} />
            <Text style={[s.tabText, activeType === t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Form */}
      {showAdd && (
        <View style={s.addForm}>
          <Text style={s.addTitle}>Add New {currentType.label.slice(0, -1)}</Text>
          {activeType === 'categories' && (<>
            <Input label="Name" value={newItem.name} onChange={v => setNewItem({...newItem, name: v})} />
            <Input label="Icon (Ionicons name)" value={newItem.icon} onChange={v => setNewItem({...newItem, icon: v})} placeholder="e.g. camera, film, videocam" />
            <Input label="Image URL" value={newItem.imageUrl} onChange={v => setNewItem({...newItem, imageUrl: v})} />
          </>)}
          {activeType === 'districts' && (<>
            <Input label="District Name" value={newItem.name} onChange={v => setNewItem({...newItem, name: v})} />
            <Input label="Image URL" value={newItem.imageUrl} onChange={v => setNewItem({...newItem, imageUrl: v})} />
          </>)}
          {activeType === 'trending' && (<>
            <Input label="Search Title" value={newItem.title} onChange={v => setNewItem({...newItem, title: v})} />
            <Input label="Icon (Ionicons)" value={newItem.icon} onChange={v => setNewItem({...newItem, icon: v})} placeholder="e.g. camera, heart-circle" />
          </>)}
          {activeType === 'inspiration' && (<>
            <Input label="Title" value={newItem.title} onChange={v => setNewItem({...newItem, title: v})} />
            <Input label="Image URL" value={newItem.imageUrl} onChange={v => setNewItem({...newItem, imageUrl: v})} />
            <Input label="Category" value={newItem.category} onChange={v => setNewItem({...newItem, category: v})} />
          </>)}
          {activeType === 'testimonials' && (<>
            <Input label="Couple Name" value={newItem.name} onChange={v => setNewItem({...newItem, name: v})} />
            <Input label="City" value={newItem.city} onChange={v => setNewItem({...newItem, city: v})} />
            <Input label="Event Type" value={newItem.eventType} onChange={v => setNewItem({...newItem, eventType: v})} />
            <Input label="Review" value={newItem.review} onChange={v => setNewItem({...newItem, review: v})} multiline />
            <Input label="Rating (1-5)" value={String(newItem.rating || '')} onChange={v => setNewItem({...newItem, rating: Number(v)})} />
          </>)}
          {activeType === 'moments' && (<>
            <Input label="Title" value={newItem.title} onChange={v => setNewItem({...newItem, title: v})} />
            <Input label="Location" value={newItem.location} onChange={v => setNewItem({...newItem, location: v})} />
            <Input label="Image URL" value={newItem.imageUrl} onChange={v => setNewItem({...newItem, imageUrl: v})} />
          </>)}
          <View style={s.addBtnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowAdd(false); setNewItem({}); }}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleAdd}><Text style={s.saveText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? <ActivityIndicator size="large" color="#FF8C2B" style={{ marginTop: 40 }} /> : (
        <FlatList data={items} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C2B" colors={['#FF8C2B']} />}
          keyExtractor={item => item._id || String(Math.random())}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="folder-open-outline" size={36} color="rgba(255,255,255,0.1)" /><Text style={s.emptyText}>No items. Tap + to add.</Text></View>}
          renderItem={({ item }) => (
            <View style={s.itemCard}>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{getDisplayName(item)}</Text>
                <Text style={s.itemSub}>{getSubtext(item)}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleActive(item._id, item.isActive !== false)} style={[s.statusDot, { backgroundColor: item.isActive !== false ? '#10B981' : '#6B7280' }]} />
              <TouchableOpacity onPress={() => handleDelete(item._id, getDisplayName(item))}><Ionicons name="trash-outline" size={16} color="#EF4444" /></TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

function Input({ label, value, onChange, placeholder, multiline }: any) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput style={[s.input, multiline && { height: 70, textAlignVertical: 'top' }]} value={value || ''} onChangeText={onChange} placeholder={placeholder || ''} placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" multiline={multiline} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF8C2B', alignItems: 'center', justifyContent: 'center' },
  // Tabs
  tabsScroll: { maxHeight: 44 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,140,43,0.2)', backgroundColor: 'rgba(255,140,43,0.04)' },
  tabActive: { backgroundColor: '#FF8C2B', borderColor: '#FF8C2B' },
  tabText: { fontSize: 11, color: '#FF8C2B', fontWeight: '500' },
  tabTextActive: { color: '#000' },
  // Add form
  addForm: { margin: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  addTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 12 },
  inputGroup: { marginBottom: 10 },
  inputLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#fff' },
  addBtnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cancelText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  saveBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#FF8C2B' },
  saveText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Items
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 6 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  itemSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
});
