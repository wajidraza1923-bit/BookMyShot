import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const PLAN_NAMES: Record<string, string> = {
  homepage_featured: 'Homepage Featured',
  featured_1: 'Featured #1', featured_2: 'Featured #2', featured_3: 'Featured #3', featured_4: 'Featured #4',
  rank_1: 'Rank #1', rank_2: 'Rank #2', rank_3: 'Rank #3', rank_4: 'Rank #4',
};

function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffset);
  const day = ist.getUTCDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

export default function AdminPromotions({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tab, setTab] = useState<'slots' | 'settings' | 'requests'>('slots');

  // Settings fields (promotion pricing)
  const [featuredPrice, setFeaturedPrice] = useState('');
  const [rank1Price, setRank1Price] = useState('');
  const [rank2Price, setRank2Price] = useState('');
  const [rank3Price, setRank3Price] = useState('');
  const [rank4Price, setRank4Price] = useState('');
  const [homepageFeaturedPrice, setHomepageFeaturedPrice] = useState('');

  const [original, setOriginal] = useState<any>(null);
  const [lastUpdatedRaw, setLastUpdatedRaw] = useState<string | null>(null);

  // Slot occupancy
  const [featuredSlots, setFeaturedSlots] = useState<any>({});
  const [rankSlots, setRankSlots] = useState<any>({});

  // Requests
  const [requests, setRequests] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [settingsRes, featuredRes, rankRes, reqRes] = await Promise.all([
        api.get('/admin/subscription-settings'),
        api.get('/promotions/featured-status'),
        api.get('/promotions/rank-status'),
        api.get('/promotions/admin/all'),
      ]);

      const sub = settingsRes.data?.data || settingsRes.data?.settings || settingsRes.data || {};
      setFeaturedPrice(String(sub.featuredPortfolioPrice || 0));
      setRank1Price(String(sub.rank1Price || 0));
      setRank2Price(String(sub.rank2Price || 0));
      setRank3Price(String(sub.rank3Price || 0));
      setRank4Price(String(sub.rank4Price || 0));
      setHomepageFeaturedPrice(String(sub.homepageFeaturedPrice || 0));
      setOriginal({
        featuredPortfolioPrice: sub.featuredPortfolioPrice || 0,
        rank1Price: sub.rank1Price || 0,
        rank2Price: sub.rank2Price || 0,
        rank3Price: sub.rank3Price || 0,
        rank4Price: sub.rank4Price || 0,
        homepageFeaturedPrice: sub.homepageFeaturedPrice || 0,
      });
      setHasChanges(false);
      if (sub.updatedAt) setLastUpdatedRaw(sub.updatedAt);

      setFeaturedSlots(featuredRes.data?.slots || {});
      setRankSlots(rankRes.data?.slots || {});
      setRequests(reqRes.data?.data || []);
    } catch (e: any) {
      console.log('[AdminPromotions] Load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Change detection
  useEffect(() => {
    if (!original) return;
    const changed =
      String(original.featuredPortfolioPrice) !== featuredPrice ||
      String(original.rank1Price) !== rank1Price ||
      String(original.rank2Price) !== rank2Price ||
      String(original.rank3Price) !== rank3Price ||
      String(original.rank4Price) !== rank4Price ||
      String(original.homepageFeaturedPrice) !== homepageFeaturedPrice;
    setHasChanges(changed);
  }, [featuredPrice, rank1Price, rank2Price, rank3Price, rank4Price, homepageFeaturedPrice, original]);

  const handleSave = () => {
    const vals = [Number(featuredPrice), Number(rank1Price), Number(rank2Price), Number(rank3Price), Number(rank4Price), Number(homepageFeaturedPrice)];
    if (vals.some(v => isNaN(v) || v < 0)) return Alert.alert('Invalid', 'All prices must be valid numbers ≥ 0');

    Alert.alert('Confirm', 'Save promotion pricing?\n\nCreators will see updated prices immediately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: saveToBackend },
    ]);
  };

  const saveToBackend = async () => {
    setSaving(true);
    try {
      await api.put('/admin/subscription-settings', {
        featuredPortfolioPrice: Number(featuredPrice),
        rank1Price: Number(rank1Price),
        rank2Price: Number(rank2Price),
        rank3Price: Number(rank3Price),
        rank4Price: Number(rank4Price),
        homepageFeaturedPrice: Number(homepageFeaturedPrice),
      });
      Alert.alert('✓ Saved', 'Promotion pricing updated. Creators will see new prices on their next visit.');
      await load();
    } catch (e: any) {
      Alert.alert('Save Failed', e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const approve = (id: string) => Alert.alert('Approve', 'Activate this promotion for 30 days?', [
    { text: 'Cancel' },
    { text: 'Approve', onPress: async () => {
      try { await api.patch(`/promotions/admin/${id}/approve`); await load(); Alert.alert('Done', 'Promotion approved'); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const reject = (id: string) => Alert.alert('Reject', 'Reject this promotion request?', [
    { text: 'Cancel' },
    { text: 'Reject', style: 'destructive', onPress: async () => {
      try { await api.patch(`/promotions/admin/${id}/reject`, { reason: 'Rejected by admin' }); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const expire = (id: string) => Alert.alert('Force Expire', 'This will immediately remove the promotion.', [
    { text: 'Cancel' },
    { text: 'Expire', style: 'destructive', onPress: async () => {
      try { await api.patch(`/promotions/admin/${id}/expire`); await load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
    }}
  ]);

  const getStatusColor = (st: string) => st === 'approved' ? colors.success : st === 'rejected' ? colors.error : st === 'expired' ? colors.textMuted : colors.warning;

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
          <Text style={s.title}>Promotions</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Promotions</Text>
        {pendingCount > 0 && <View style={s.pendingBadge}><Text style={s.pendingText}>{pendingCount} pending</Text></View>}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'slots' && s.tabActive]} onPress={() => setTab('slots')}>
          <Text style={[s.tabText, tab === 'slots' && s.tabTextActive]}>Slots</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'settings' && s.tabActive]} onPress={() => setTab('settings')}>
          <Text style={[s.tabText, tab === 'settings' && s.tabTextActive]}>Pricing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'requests' && s.tabActive]} onPress={() => setTab('requests')}>
          <Text style={[s.tabText, tab === 'requests' && s.tabTextActive]}>Requests</Text>
        </TouchableOpacity>
      </View>

      {tab === 'slots' && (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
          {/* Featured Slots */}
          <Text style={s.sectionLabel}>Featured Slots (4)</Text>
          {['featured_1', 'featured_2', 'featured_3', 'featured_4'].map((slotId, i) => {
            const slot = featuredSlots[slotId];
            const occupied = !!slot?.occupied;
            return (
              <View key={slotId} style={[s.slotCard, occupied && s.slotOccupied]}>
                <View style={s.slotRow}>
                  <View style={[s.slotIcon, { backgroundColor: occupied ? colors.primary + '15' : 'rgba(255,255,255,0.04)' }]}>
                    <Ionicons name={occupied ? 'star' : 'star-outline'} size={16} color={occupied ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.slotTitle}>Featured #{i + 1}</Text>
                    {occupied ? (
                      <>
                        <Text style={s.slotOwner}>{slot.ownerName}</Text>
                        <Text style={s.slotExpiry}>Expires: {formatDateTime(slot.expiryDate)}</Text>
                      </>
                    ) : (
                      <Text style={s.slotAvailable}>Available</Text>
                    )}
                  </View>
                  <View style={[s.slotBadge, { backgroundColor: occupied ? colors.primary + '15' : colors.success + '15' }]}>
                    <Text style={[s.slotBadgeText, { color: occupied ? colors.primary : colors.success }]}>{occupied ? 'OCCUPIED' : 'OPEN'}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Rank Slots */}
          <Text style={[s.sectionLabel, { marginTop: spacing.xl }]}>Rank Slots (4)</Text>
          {['rank_1', 'rank_2', 'rank_3', 'rank_4'].map((slotId, i) => {
            const slot = rankSlots[slotId];
            const occupied = !!slot?.occupied;
            const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
            return (
              <View key={slotId} style={[s.slotCard, occupied && s.slotOccupied]}>
                <View style={s.slotRow}>
                  <Text style={s.slotEmoji}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.slotTitle}>Rank #{i + 1}</Text>
                    {occupied ? (
                      <>
                        <Text style={s.slotOwner}>{slot.ownerName}</Text>
                        <Text style={s.slotExpiry}>Expires: {formatDateTime(slot.expiryDate)}</Text>
                      </>
                    ) : (
                      <Text style={s.slotAvailable}>Available</Text>
                    )}
                  </View>
                  <View style={[s.slotBadge, { backgroundColor: occupied ? colors.warning + '15' : colors.success + '15' }]}>
                    <Text style={[s.slotBadgeText, { color: occupied ? colors.warning : colors.success }]}>{occupied ? 'OCCUPIED' : 'OPEN'}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {tab === 'settings' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
            <Text style={s.sectionLabel}>Featured Pricing</Text>
            <View style={s.card}>
              <SettingField label="Featured Slot Price (each)" value={featuredPrice} onChangeText={setFeaturedPrice} prefix="₹" placeholder="e.g. 999" />
              <SettingField label="Homepage Featured Price" value={homepageFeaturedPrice} onChangeText={setHomepageFeaturedPrice} prefix="₹" placeholder="e.g. 1499" isLast />
            </View>

            <Text style={[s.sectionLabel, { marginTop: spacing.xl }]}>Rank Pricing</Text>
            <View style={s.card}>
              <SettingField label="Rank #1 Price" value={rank1Price} onChangeText={setRank1Price} prefix="₹" placeholder="e.g. 1999" />
              <SettingField label="Rank #2 Price" value={rank2Price} onChangeText={setRank2Price} prefix="₹" placeholder="e.g. 1499" />
              <SettingField label="Rank #3 Price" value={rank3Price} onChangeText={setRank3Price} prefix="₹" placeholder="e.g. 999" />
              <SettingField label="Rank #4 Price" value={rank4Price} onChangeText={setRank4Price} prefix="₹" placeholder="e.g. 799" isLast />
            </View>

            {lastUpdatedRaw && (
              <View style={s.lastUpdatedRow}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={s.lastUpdatedText}>Last updated: {formatDateTime(lastUpdatedRaw)}</Text>
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]} onPress={handleSave} disabled={!hasChanges || saving} activeOpacity={0.7}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={hasChanges ? colors.textInverse : colors.textMuted} />
                  <Text style={[s.saveBtnText, !hasChanges && s.saveBtnTextDisabled]}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {tab === 'requests' && (
        <FlatList
          data={requests}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={item => item._id}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="star-outline" size={40} color={colors.textMuted} /><Text style={s.emptyText}>No promotion requests</Text></View>}
          renderItem={({ item }) => (
            <View style={s.reqCard}>
              <View style={s.reqTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.reqName}>{item.creator?.user?.name || item.creatorName || 'Creator'}</Text>
                  <Text style={s.reqPlan}>{PLAN_NAMES[item.planType] || item.planType}</Text>
                </View>
                <View style={[s.reqBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[s.reqBadgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
              <View style={s.reqDetails}>
                <Text style={s.reqDetail}>₹{(item.price || 0).toLocaleString('en-IN')}</Text>
                {item.utr && <Text style={s.reqDetail}>UTR: {item.utr}</Text>}
                <Text style={s.reqDetail}>{item.createdAt ? formatDateTime(item.createdAt) : ''}</Text>
                {item.expiryDate && <Text style={s.reqDetail}>Expires: {formatDateTime(item.expiryDate)}</Text>}
              </View>
              {item.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => reject(item._id)}><Ionicons name="close" size={14} color={colors.error} /><Text style={s.rejectText}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity style={s.approveBtn} onPress={() => approve(item._id)}><Ionicons name="checkmark" size={14} color={colors.textInverse} /><Text style={s.approveText}>Approve</Text></TouchableOpacity>
                </View>
              )}
              {item.status === 'approved' && (
                <TouchableOpacity style={s.expireBtn} onPress={() => expire(item._id)}><Text style={s.expireText}>Force Expire</Text></TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function SettingField({ label, value, onChangeText, prefix, suffix, placeholder, isLast }: any) {
  return (
    <View style={[fieldStyles.container, !isLast && fieldStyles.borderBottom]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        {prefix && <Text style={fieldStyles.prefix}>{prefix}</Text>}
        <TextInput style={fieldStyles.input} value={value} onChangeText={onChangeText} keyboardType="numeric" placeholder={placeholder} placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
        {suffix && <Text style={fieldStyles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { paddingVertical: spacing.lg },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { ...typography.labelSm, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  prefix: { ...typography.headlineMd, color: colors.primary, marginRight: spacing.xs },
  suffix: { ...typography.labelMd, color: colors.textSecondary, marginLeft: spacing.xs },
  input: { flex: 1, ...typography.headlineMd, color: colors.text, paddingVertical: spacing.md },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  pendingBadge: { backgroundColor: colors.warning + '15', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1, borderColor: colors.warning + '30' },
  pendingText: { ...typography.labelSm, color: colors.warning, fontWeight: '600' },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.labelMd, color: colors.textMuted },
  tabTextActive: { color: colors.textInverse, fontWeight: '700' },
  sectionLabel: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  // Slot cards
  slotCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  slotOccupied: { borderColor: colors.borderGold },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  slotIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  slotEmoji: { fontSize: 24, width: 36, textAlign: 'center' },
  slotTitle: { ...typography.headlineSm, color: colors.text },
  slotOwner: { ...typography.bodyMd, color: colors.primary, marginTop: 2 },
  slotExpiry: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  slotAvailable: { ...typography.bodySm, color: colors.success, marginTop: 2 },
  slotBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  slotBadgeText: { ...typography.labelSm, fontWeight: '700', letterSpacing: 0.5 },
  // Settings
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border },
  lastUpdatedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, justifyContent: 'center' },
  lastUpdatedText: { ...typography.caption, color: colors.textMuted },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing['2xl'] },
  saveBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  saveBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  saveBtnTextDisabled: { color: colors.textMuted },
  // Requests
  reqCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  reqName: { ...typography.headlineSm, color: colors.text },
  reqPlan: { ...typography.labelMd, color: colors.primary, marginTop: 2 },
  reqBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  reqBadgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  reqDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  reqDetail: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.primary },
  approveText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  expireBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  expireText: { ...typography.labelMd, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyText: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.md },
});
