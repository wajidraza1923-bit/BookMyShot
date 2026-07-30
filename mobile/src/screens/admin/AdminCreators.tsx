import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminCreators({ navigation }: any) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');
  const [detailCreator, setDetailCreator] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/creator-accounts');
      // Backend returns: { success, data: { creators: [...], total, page, limit } }
      const responseData = res.data?.data;
      const creatorsList = Array.isArray(responseData?.creators)
        ? responseData.creators
        : Array.isArray(responseData)
          ? responseData
          : Array.isArray(res.data?.creators)
            ? res.data.creators
            : [];
      setCreators(creatorsList);
    } catch (e: any) {
      console.log('[AdminCreators] Load error:', e.response?.status, e.message);
      Alert.alert('Error', 'Failed to load creators: ' + (e.response?.data?.message || e.message));
      setCreators([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const safeCreators = Array.isArray(creators) ? creators : [];
  const filtered = safeCreators.filter(c => {
    if (tab === 'all') return true;
    if (tab === 'pending') return c.status === 'pending';
    if (tab === 'approved') return c.status === 'approved';
    if (tab === 'rejected') return c.status === 'rejected';
    if (tab === 'suspended') return c.status === 'suspended' || (c.subscriptionStatus === 'suspended' && c.status !== 'rejected');
    return true;
  });

  const updateStatus = (id: string, status: string, label: string) => {
    Alert.alert(label, `${label} this creator?`, [
      { text: 'Cancel' },
      { text: label, style: status === 'rejected' || status === 'suspended' ? 'destructive' : 'default', onPress: async () => {
        try {
          let endpoint = '';
          if (status === 'approved') endpoint = `/admin/creator-accounts/${id}/activate`;
          else if (status === 'rejected') endpoint = `/admin/creator-accounts/${id}/deactivate`;
          else if (status === 'suspended') endpoint = `/admin/creator-accounts/${id}/suspend`;
          else endpoint = `/admin/creator-accounts/${id}/activate`;
          
          await api.patch(endpoint, { reason: `${label} by admin` });
          await load();
          Alert.alert('Success', `Creator ${label.toLowerCase()}d successfully`);
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.message || 'Failed to update creator');
        }
      }}
    ]);
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    try {
      await api.patch(`/admin/creators/${id}/featured`, { featured });
      await load();
      Alert.alert('Done', featured ? 'Creator is now featured' : 'Creator unfeatured');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update featured status');
    }
  };

  const deleteCreator = (id: string, name: string) => {
    Alert.alert(
      '⚠️ Permanent Delete',
      `Are you sure you want to PERMANENTLY delete "${name}"?\n\nThis will remove:\n• Creator profile & portfolio\n• All bookings & inquiries\n• Reviews & payment records\n• User account\n\nThis action CANNOT be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'DELETE PERMANENTLY', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/admin/creators/${id}`);
            await load();
            Alert.alert('Deleted', 'Creator and all associated data permanently removed.');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete creator');
          }
        }}
      ]
    );
  };

  const setRank = (id: string, currentRank: number) => {
    Alert.alert('Set Rank', 'Choose ranking position for Best Reviewed section:', [
      { text: '#1', onPress: () => applyRank(id, 1) },
      { text: '#2', onPress: () => applyRank(id, 2) },
      { text: '#3', onPress: () => applyRank(id, 3) },
      { text: '#4', onPress: () => applyRank(id, 4) },
      { text: currentRank ? 'Remove Rank' : 'Cancel', style: 'cancel', onPress: () => { if (currentRank) applyRank(id, 0); } },
    ]);
  };

  const applyRank = async (id: string, rank: number) => {
    try {
      await api.patch(`/admin/creator-accounts/${id}/rank`, { rank });
      const badge = rank > 0 ? `rank_${rank}` : '';
      await api.patch(`/admin/creator-accounts/${id}/badge`, { badge });
      await load();
      Alert.alert('Done', rank > 0 ? `Creator set as #${rank} in Best Reviewed` : 'Rank removed');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to set rank');
    }
  };

  const getStatusColor = (s: string) => s === 'approved' ? colors.success : s === 'pending' ? colors.warning : colors.error;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Creators</Text>
        <Text style={s.count}>{safeCreators.length}</Text>
      </View>

      <View style={s.tabs}>
        {['all', 'pending', 'approved', 'rejected', 'suspended'].map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'suspended' ? 'Susp.' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No creators in this tab</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => setDetailCreator(item)}>
              <View style={s.cardTop}>
                <Image source={{ uri: item.user?.avatar || 'https://via.placeholder.com/40' }} style={s.avatar} />
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.user?.name || 'Creator'}</Text>
                  <Text style={s.cardMeta}>{item.specialty || 'Photographer'} • {item.city || 'India'}</Text>
                  <Text style={s.cardEmail}>{item.user?.email}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[s.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.cardMeta2}>
                <Text style={s.metaItem}>Sub: {item.subscriptionStatus || 'none'}</Text>
                <Text style={s.metaItem}>ID: {item.creatorId || '—'}</Text>
                {item.subscriptionEndDate && <Text style={s.metaItem}>Exp: {new Date(item.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>}
              </View>
              <View style={s.actions}>
                {item.status === 'pending' && <>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => updateStatus(item._id, 'rejected', 'Reject')}><Text style={s.rejectText}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(item._id, 'approved', 'Approve')}><Text style={s.approveText}>Approve</Text></TouchableOpacity>
                </>}
                {item.status === 'approved' && item.subscriptionStatus !== 'suspended' && <>
                  <TouchableOpacity style={s.suspendBtn} onPress={() => updateStatus(item._id, 'suspended', 'Suspend')}><Text style={s.suspendText}>Suspend</Text></TouchableOpacity>
                  <TouchableOpacity style={s.rankBtn} onPress={() => setRank(item._id, item.rank)}><Text style={s.rankBtnText}>{item.rank ? `#${item.rank}` : 'Rank'}</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.rankBtn, item.featured && { backgroundColor: 'rgba(249,115,22,0.2)' }]} onPress={() => toggleFeatured(item._id, !item.featured)}><Text style={s.rankBtnText}>{item.featured ? '★' : 'Feature'}</Text></TouchableOpacity>
                </>}
                {(item.status === 'suspended' || item.subscriptionStatus === 'suspended') && <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(item._id, 'approved', 'Unsuspend')}><Text style={s.approveText}>Unsuspend</Text></TouchableOpacity>}
                {item.status === 'rejected' && <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(item._id, 'approved', 'Reactivate')}><Text style={s.approveText}>Reactivate</Text></TouchableOpacity>}
                <TouchableOpacity style={s.deleteBtn} onPress={() => deleteCreator(item._id, item.user?.name || 'Creator')}><Ionicons name="trash-outline" size={14} color={colors.error} /><Text style={s.deleteText}>Delete</Text></TouchableOpacity>
                <TouchableOpacity style={s.financeBtn} onPress={() => navigation.navigate('AdminCreatorLedger', { creatorId: item._id, creatorName: item.user?.name })}><Ionicons name="wallet-outline" size={13} color="#10b981" /><Text style={s.financeBtnText}>Finances</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ═══ CREATOR DETAIL MODAL ═══ */}
      {detailCreator && (
        <Modal visible={!!detailCreator} transparent animationType="slide" onRequestClose={() => setDetailCreator(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Creator Details</Text>
                <TouchableOpacity onPress={() => setDetailCreator(null)}><Ionicons name="close" size={22} color={colors.text} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {/* Profile */}
                <View style={s.detailSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Image source={{ uri: detailCreator.user?.avatar || 'https://via.placeholder.com/50' }} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.primary }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{detailCreator.user?.name || 'Creator'}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{detailCreator.studioName || ''}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: getStatusColor(detailCreator.status) + '15' }]}>
                      <Text style={[s.badgeText, { color: getStatusColor(detailCreator.status) }]}>{detailCreator.status}</Text>
                    </View>
                  </View>
                </View>

                {/* Info Grid */}
                <View style={s.detailSection}>
                  <Text style={s.detailSectionTitle}>📋 Profile Information</Text>
                  <DetailRow label="📧 Email" value={detailCreator.user?.email} />
                  <DetailRow label="📱 Phone" value={detailCreator.user?.phone || '—'} />
                  <DetailRow label="📁 Category" value={detailCreator.categoryGroup || detailCreator.categorySlug || '—'} />
                  <DetailRow label="🏷 Subcategory" value={detailCreator.subcategorySlug || '—'} />
                  <DetailRow label="💼 Experience" value={detailCreator.experience === 'Fresher' ? 'Fresher' : (detailCreator.experience || '—')} />
                  <DetailRow label="🏢 Business Type" value={detailCreator.businessType || '—'} />
                  <DetailRow label="👥 Team Size" value={detailCreator.teamSize || '—'} />
                  <DetailRow label="📍 State" value={detailCreator.state || '—'} />
                  <DetailRow label="🏘 District" value={detailCreator.district || '—'} />
                  <DetailRow label="🌆 City" value={detailCreator.baseCity || detailCreator.city || '—'} />
                  <DetailRow label="💰 Price Range" value={detailCreator.priceRange || (detailCreator.budgetMin ? `₹${detailCreator.budgetMin}` : '—')} />
                  <DetailRow label="🎯 Equipment" value={detailCreator.equipmentLevel || '—'} />
                  <DetailRow label="🚗 Travel" value={detailCreator.travelPreference || '—'} />
                  <DetailRow label="📅 Delivery" value={detailCreator.deliveryTime || '—'} />
                  <DetailRow label="🗓 Registered" value={detailCreator.createdAt ? new Date(detailCreator.createdAt).toLocaleDateString('en-IN') : '—'} />
                </View>

                {/* Bio */}
                {detailCreator.bio ? (
                  <View style={s.detailSection}>
                    <Text style={s.detailSectionTitle}>✍️ About</Text>
                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19 }}>{detailCreator.bio}</Text>
                  </View>
                ) : null}

                {/* Languages */}
                {detailCreator.languages && detailCreator.languages.length > 0 ? (
                  <View style={s.detailSection}>
                    <Text style={s.detailSectionTitle}>🗣 Languages</Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>{detailCreator.languages.join(', ')}</Text>
                  </View>
                ) : null}

                {/* Portfolio */}
                {detailCreator.portfolio && detailCreator.portfolio.length > 0 ? (
                  <View style={s.detailSection}>
                    <Text style={s.detailSectionTitle}>📸 Portfolio ({detailCreator.portfolio.length} photos)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {detailCreator.portfolio.filter((p: any) => p).slice(0, 8).map((p: any, i: number) => (
                        <Image key={i} source={{ uri: typeof p === 'string' ? p : p?.url || '' }} style={{ width: 70, height: 70, borderRadius: 10, marginRight: 8 }} />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={[s.detailSection, { paddingBottom: 30 }]}>
                  {detailCreator.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[s.approveBtn, { flex: 1, paddingVertical: 14 }]} onPress={() => { updateStatus(detailCreator._id, 'approved', 'Approve'); setDetailCreator(null); }}>
                        <Text style={s.approveText}>✅ Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.rejectBtn, { flex: 1, paddingVertical: 14 }]} onPress={() => { updateStatus(detailCreator._id, 'rejected', 'Reject'); setDetailCreator(null); }}>
                        <Text style={s.rejectText}>❌ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {detailCreator.status === 'approved' && (
                    <TouchableOpacity style={[s.suspendBtn, { paddingVertical: 14 }]} onPress={() => { updateStatus(detailCreator._id, 'suspended', 'Suspend'); setDetailCreator(null); }}>
                      <Text style={[s.suspendText, { textAlign: 'center' }]}>Suspend Creator</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }}>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500', maxWidth: '55%', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  count: { ...typography.labelMd, color: colors.primary, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelSm, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardName: { ...typography.headlineSm, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  cardEmail: { ...typography.caption, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  cardMeta2: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  metaItem: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  rejectBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  approveBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.primary },
  approveText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  suspendBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  suspendText: { ...typography.labelMd, color: colors.warning },
  rankBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center', borderRadius: radius.sm, backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  rankBtnText: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  deleteText: { ...typography.labelSm, color: colors.error, fontWeight: '600' },
  financeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  financeBtnText: { ...typography.labelSm, color: '#10b981', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted },
  // Detail Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  detailSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
});
