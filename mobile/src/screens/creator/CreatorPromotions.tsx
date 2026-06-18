import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const POSITION_COLORS = { featured_1: '#D4AF37', featured_2: '#C0C0C0', featured_3: '#CD7F32', featured_4: '#8B7025' };
const POSITION_LABELS = { featured_1: 'Featured #1', featured_2: 'Featured #2', featured_3: 'Featured #3', featured_4: 'Featured #4', rank_1: 'Rank #1', rank_2: 'Rank #2', rank_3: 'Rank #3', rank_4: 'Rank #4' };
const POSITION_ICONS = { featured_1: '🥇', featured_2: '🥈', featured_3: '🥉', featured_4: '🏅' };

export default function CreatorPromotions({ navigation }: any) {
  const [plans, setPlans] = useState<any[]>([]);
  const [featuredSlots, setFeaturedSlots] = useState<any>({});
  const [rankSlots, setRankSlots] = useState<any>({});
  const [myFeatured, setMyFeatured] = useState<any>(null);
  const [myActive, setMyActive] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyType, setApplyType] = useState('');
  const [utr, setUtr] = useState('');

  const load = useCallback(async () => {
    try {
      const [plansRes, featuredRes, rankRes, myFeaturedRes, myActiveRes, requestsRes] = await Promise.all([
        api.get('/promotions/plans'),
        api.get('/promotions/featured-status'),
        api.get('/promotions/rank-status'),
        api.get('/promotions/my-featured').catch(() => ({ data: { active: null } })),
        api.get('/promotions/my-active').catch(() => ({ data: { active: null } })),
        api.get('/promotions/my-requests').catch(() => ({ data: { data: [] } })),
      ]);
      setPlans(plansRes.data?.plans || []);
      setFeaturedSlots(featuredRes.data?.slots || {});
      setRankSlots(rankRes.data?.slots || {});
      setMyFeatured(myFeaturedRes.data?.active);
      setMyActive(myActiveRes.data?.active);
      setMyRequests(requestsRes.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleApply = async (planType: string) => {
    setApplyType(planType);
    try {
      const { getRazorpayConfig, createPromotionOrder, openRazorpayOrder, verifyPromotionPayment, isNativeRazorpayAvailable } = require('../../services/payment');

      // Get plan price
      const plan = plans?.find((p: any) => p.id === planType);
      const price = plan?.price || 999;

      const rpConfig = await getRazorpayConfig();
      if (!rpConfig.configured) {
        // Fallback to UTR if Razorpay not configured
        setUtr('');
        setShowApplyModal(true);
        return;
      }

      if (isNativeRazorpayAvailable()) {
        // Use Razorpay (same as website)
        const order = await createPromotionOrder(planType, price);
        if (!order.id) { Alert.alert('Error', 'Failed to create payment order'); return; }

        const meRes = await api.get('/auth/me');
        const user = meRes.data?.user;
        const result = await openRazorpayOrder(rpConfig.keyId, order.id, price, `Promotion: ${planType}`, user?.name || '');

        // Verify payment (same as website POST /razorpay/verify-payment)
        const verified = await verifyPromotionPayment(result.razorpay_order_id, result.razorpay_payment_id, result.razorpay_signature, price, planType);
        if (verified) {
          Alert.alert('Success! 🎉', 'Promotion activated for 30 days!');
          await load();
        } else {
          Alert.alert('Verification Failed', 'Contact support if charged.');
        }
      } else {
        // Development mode - show order info
        Alert.alert('Development Mode', `Razorpay native SDK not available (Expo Go).\n\nPlan: ${planType}\nPrice: ₹${price}\n\nIn production APK, Razorpay checkout opens. For now, use UTR method.`);
        setUtr('');
        setShowApplyModal(true);
      }
    } catch (e: any) {
      if (e.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Cancelled', 'Payment was cancelled.');
      } else {
        // Fallback to UTR modal
        setUtr('');
        setShowApplyModal(true);
      }
    }
  };

  const submitApplication = async () => {
    if (!utr.trim()) { Alert.alert('Required', 'Enter UTR/Transaction ID after payment'); return; }
    try {
      await api.post('/promotions/apply', { planType: applyType, screenshot: 'mobile-app', utr: utr.trim() });
      setShowApplyModal(false);
      await load();
      Alert.alert('Submitted! 🎉', 'Your promotion request has been submitted. Admin will review and approve.');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to submit'); }
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>Promotions</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* My Active Promotion */}
        {(myFeatured || myActive) && (
          <View style={s.activeCard}>
            <Ionicons name="star" size={20} color={colors.primary} />
            <View style={s.activeInfo}>
              <Text style={s.activeTitle}>You hold: {POSITION_LABELS[(myFeatured?.planType || myActive?.planType) as keyof typeof POSITION_LABELS] || 'Promotion'}</Text>
              <Text style={s.activeExpiry}>Expires: {(myFeatured?.expiryDate || myActive?.expiryDate) ? new Date(myFeatured?.expiryDate || myActive?.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} • {myFeatured?.daysRemaining || myActive?.daysRemaining || 0} days left</Text>
            </View>
          </View>
        )}

        {/* Featured Slots */}
        <Text style={s.sectionTitle}>⭐ Featured Positions</Text>
        <View style={s.slotsGrid}>
          {['featured_1', 'featured_2', 'featured_3', 'featured_4'].map(id => {
            const slot = featuredSlots[id];
            const isMySlot = myFeatured?.planType === id;
            const plan = plans.find(p => p.id === id);
            const color = POSITION_COLORS[id as keyof typeof POSITION_COLORS] || colors.primary;
            return (
              <View key={id} style={[s.slotCard, isMySlot && s.slotCardOwned, slot?.occupied && !isMySlot && s.slotCardTaken]}>
                <Text style={s.slotIcon}>{POSITION_ICONS[id as keyof typeof POSITION_ICONS] || '⭐'}</Text>
                <Text style={[s.slotName, { color }]}>{POSITION_LABELS[id as keyof typeof POSITION_LABELS]}</Text>
                <Text style={s.slotPrice}>₹{(plan?.price || 999).toLocaleString('en-IN')}</Text>
                {isMySlot ? (
                  <Text style={s.slotOwned}>YOU OWN THIS</Text>
                ) : slot?.occupied ? (
                  <Text style={s.slotTaken}>{slot.ownerName}{'\n'}Until {slot.expiryDate ? new Date(slot.expiryDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''}</Text>
                ) : (
                  <TouchableOpacity style={s.applyBtn} onPress={() => handleApply(id)}><Text style={s.applyBtnText}>Apply Now</Text></TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Rank Slots */}
        <Text style={s.sectionTitle}>🏆 Promotion Ranks</Text>
        <View style={s.slotsGrid}>
          {['rank_1', 'rank_2', 'rank_3', 'rank_4'].map(id => {
            const slot = rankSlots[id];
            const isMyRank = myActive?.planType === id;
            const plan = plans.find(p => p.id === id);
            return (
              <View key={id} style={[s.slotCard, isMyRank && s.slotCardOwned, slot?.occupied && !isMyRank && s.slotCardTaken]}>
                <Text style={s.slotIcon}>{id === 'rank_1' ? '🥇' : id === 'rank_2' ? '🥈' : id === 'rank_3' ? '🥉' : '🏅'}</Text>
                <Text style={s.slotName}>{POSITION_LABELS[id as keyof typeof POSITION_LABELS]}</Text>
                <Text style={s.slotPrice}>₹{(plan?.price || 999).toLocaleString('en-IN')}</Text>
                {isMyRank ? (
                  <Text style={s.slotOwned}>YOU OWN THIS</Text>
                ) : slot?.occupied ? (
                  <Text style={s.slotTaken}>{slot.ownerName}{'\n'}Until {slot.expiryDate ? new Date(slot.expiryDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''}</Text>
                ) : (
                  <TouchableOpacity style={s.applyBtn} onPress={() => handleApply(id)}><Text style={s.applyBtnText}>Apply Now</Text></TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* My Requests History */}
        {myRequests.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Request History</Text>
            {myRequests.map((req, i) => (
              <View key={req._id || i} style={s.requestCard}>
                <View style={s.requestRow}>
                  <Text style={s.requestType}>{POSITION_LABELS[req.planType as keyof typeof POSITION_LABELS] || req.planType}</Text>
                  <View style={[s.requestBadge, { backgroundColor: req.status === 'approved' ? colors.success + '15' : req.status === 'rejected' ? colors.error + '15' : req.status === 'expired' ? colors.textMuted + '15' : colors.warning + '15' }]}>
                    <Text style={[s.requestBadgeText, { color: req.status === 'approved' ? colors.success : req.status === 'rejected' ? colors.error : req.status === 'expired' ? colors.textMuted : colors.warning }]}>{req.status}</Text>
                  </View>
                </View>
                <Text style={s.requestMeta}>₹{(req.price || 0).toLocaleString('en-IN')} • {req.requestDate ? new Date(req.requestDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Apply Modal */}
      <Modal visible={showApplyModal} transparent animationType="fade">
        <View style={s.modalBg}><View style={s.modal}>
          <Text style={s.modalTitle}>Apply for Promotion</Text>
          <Text style={s.modalSubtitle}>{POSITION_LABELS[applyType as keyof typeof POSITION_LABELS] || applyType}</Text>
          <Text style={s.modalInstruction}>Make payment to BookMyShot account, then enter UTR/Transaction ID below.</Text>
          <TextInput style={s.modalInput} value={utr} onChangeText={setUtr} placeholder="UTR / Transaction ID" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowApplyModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.modalConfirm} onPress={submitApplication}><Text style={s.modalConfirmText}>Submit Request</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  activeCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginTop: spacing.md, backgroundColor: 'rgba(212,175,55,0.06)', borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  activeInfo: { flex: 1 },
  activeTitle: { ...typography.headlineSm, color: colors.primary },
  activeExpiry: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { ...typography.headlineMd, color: colors.text, paddingHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: spacing.md },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
  slotCard: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', flexGrow: 1 },
  slotCardOwned: { borderColor: colors.success, backgroundColor: 'rgba(16,185,129,0.04)' },
  slotCardTaken: { borderColor: 'rgba(239,68,68,0.15)', opacity: 0.7 },
  slotIcon: { fontSize: 28, marginBottom: spacing.sm },
  slotName: { ...typography.labelLg, color: colors.text, textAlign: 'center' },
  slotPrice: { ...typography.headlineSm, color: colors.primary, marginTop: spacing.xs },
  slotOwned: { ...typography.labelSm, color: colors.success, fontWeight: '700', marginTop: spacing.sm },
  slotTaken: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
  applyBtn: { marginTop: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderRadius: radius.sm },
  applyBtnText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  requestCard: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  requestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestType: { ...typography.labelLg, color: colors.text },
  requestBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  requestBadgeText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  requestMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.labelLg, color: colors.primary, marginBottom: spacing.md },
  modalInstruction: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 18 },
  modalInput: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, marginBottom: spacing.lg },
  modalBtns: { flexDirection: 'row', gap: spacing.md },
  modalCancel: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { ...typography.labelLg, color: colors.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  modalConfirmText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
});
