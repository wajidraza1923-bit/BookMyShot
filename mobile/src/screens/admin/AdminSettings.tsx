import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function AdminSettings({ navigation }: any) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [subRes, commRes] = await Promise.all([
        api.get('/admin/subscription-settings'),
        api.get('/admin/commission-settings'),
      ]);
      setSettings({ subscription: subRes.data?.settings || subRes.data, commission: commRes.data?.settings || commRes.data });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const sub = settings?.subscription || {};
  const comm = settings?.commission || {};

  return (
    <View style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><Text style={s.title}>Settings</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}>
        <Text style={s.section}>Subscription Settings</Text>
        <View style={s.card}><Row label="Monthly Price" value={`₹${sub.monthlyPlanPrice || 0}`} /><Row label="Trial Days" value={String(sub.trialDays || 0)} /><Row label="Featured Price" value={`₹${sub.featuredPortfolioPrice || 0}`} /></View>

        <Text style={s.section}>Commission Settings</Text>
        <View style={s.card}><Row label="BMS Lead %" value={`${comm.bmsLeadCommissionPercent || 5}%`} /><Row label="Creator Lead %" value={`${comm.creatorLeadCommissionPercent || 3}%`} /></View>

        <Text style={s.note}>To change these values, use the website admin panel → Settings section.</Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  section: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.bodyMd, color: colors.textSecondary },
  rowValue: { ...typography.headlineSm, color: colors.primary },
  note: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center', lineHeight: 18 },
});
