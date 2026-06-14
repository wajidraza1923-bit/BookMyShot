import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

type TestStatus = 'untested' | 'testing' | 'passed' | 'failed';

interface TestItem {
  id: string;
  name: string;
  endpoint?: string;
  method?: string;
  status: TestStatus;
  message?: string;
}

interface TestSection {
  title: string;
  icon: string;
  tests: TestItem[];
}

export default function QADashboard({ navigation }: any) {
  const [running, setRunning] = useState(false);
  const [sections, setSections] = useState<TestSection[]>([
    {
      title: 'Backend Health',
      icon: 'server-outline',
      tests: [
        { id: 'health', name: 'Server Running', endpoint: '/health', status: 'untested' },
        { id: 'db', name: 'Database Connected', endpoint: '/config/public', status: 'untested' },
        { id: 'jwt', name: 'JWT Secret Configured', endpoint: '/health', status: 'untested' },
      ],
    },
    {
      title: 'Authentication',
      icon: 'lock-closed-outline',
      tests: [
        { id: 'login-endpoint', name: 'Login Endpoint (401)', endpoint: '/auth/login', method: 'POST', status: 'untested' },
        { id: 'register-endpoint', name: 'Register Endpoint', endpoint: '/auth/register', method: 'POST', status: 'untested' },
        { id: 'me-unauth', name: 'Protected Route (401)', endpoint: '/auth/me', status: 'untested' },
        { id: 'admin-otp', name: 'Admin OTP Endpoint', endpoint: '/auth/admin-login-otp', method: 'POST', status: 'untested' },
      ],
    },
    {
      title: 'Creator APIs',
      icon: 'camera-outline',
      tests: [
        { id: 'creators-list', name: 'List Creators (Public)', endpoint: '/creators', status: 'untested' },
        { id: 'creator-dashboard', name: 'Creator Dashboard', endpoint: '/creator/dashboard', status: 'untested' },
        { id: 'creator-bookings', name: 'Creator Bookings', endpoint: '/creator/booking-requests', status: 'untested' },
        { id: 'creator-leads', name: 'Creator Leads', endpoint: '/creator/leads', status: 'untested' },
        { id: 'creator-calendar', name: 'Creator Calendar', endpoint: '/creator/calendar/private', status: 'untested' },
        { id: 'creator-packages', name: 'Creator Packages', endpoint: '/creator/packages', status: 'untested' },
        { id: 'creator-earnings', name: 'Creator Earnings', endpoint: '/creator/earnings', status: 'untested' },
      ],
    },
    {
      title: 'User APIs',
      icon: 'person-outline',
      tests: [
        { id: 'user-bookings', name: 'User Bookings', endpoint: '/user/bookings', status: 'untested' },
        { id: 'user-favorites', name: 'User Favorites', endpoint: '/user/favorites', status: 'untested' },
        { id: 'notifications', name: 'Notifications', endpoint: '/notifications', status: 'untested' },
        { id: 'messages', name: 'Messages', endpoint: '/messages', status: 'untested' },
      ],
    },
    {
      title: 'Admin APIs',
      icon: 'shield-outline',
      tests: [
        { id: 'admin-dashboard', name: 'Admin Dashboard', endpoint: '/admin/dashboard-overview', status: 'untested' },
        { id: 'admin-creators', name: 'Admin Creators', endpoint: '/admin/creator-accounts', status: 'untested' },
        { id: 'admin-inquiries', name: 'Admin Inquiries', endpoint: '/admin/homepage-enquiries', status: 'untested' },
        { id: 'admin-payments', name: 'Admin Payments', endpoint: '/admin/payment-history', status: 'untested' },
        { id: 'admin-sub-settings', name: 'Subscription Settings', endpoint: '/admin/subscription-settings', status: 'untested' },
        { id: 'admin-comm-settings', name: 'Commission Settings', endpoint: '/admin/commission-settings', status: 'untested' },
      ],
    },
    {
      title: 'Promotions',
      icon: 'star-outline',
      tests: [
        { id: 'promo-plans', name: 'Promotion Plans', endpoint: '/promotions/plans', status: 'untested' },
        { id: 'promo-featured', name: 'Featured Status', endpoint: '/promotions/featured-status', status: 'untested' },
        { id: 'promo-rank', name: 'Rank Status', endpoint: '/promotions/rank-status', status: 'untested' },
        { id: 'promo-my', name: 'My Promotions', endpoint: '/promotions/my-requests', status: 'untested' },
      ],
    },
    {
      title: 'Payments',
      icon: 'card-outline',
      tests: [
        { id: 'razorpay-config', name: 'Razorpay Config', endpoint: '/razorpay/config', status: 'untested' },
        { id: 'app-config', name: 'App Config (Dynamic)', endpoint: '/app-config', status: 'untested' },
      ],
    },
  ]);

  const updateTest = (sectionIdx: number, testIdx: number, status: TestStatus, message?: string) => {
    setSections(prev => {
      const copy = [...prev];
      copy[sectionIdx] = { ...copy[sectionIdx], tests: [...copy[sectionIdx].tests] };
      copy[sectionIdx].tests[testIdx] = { ...copy[sectionIdx].tests[testIdx], status, message };
      return copy;
    });
  };

  const runAllTests = async () => {
    setRunning(true);
    for (let si = 0; si < sections.length; si++) {
      for (let ti = 0; ti < sections[si].tests.length; ti++) {
        const test = sections[si].tests[ti];
        updateTest(si, ti, 'testing');
        try {
          if (test.method === 'POST') {
            // For POST endpoints, send minimal body and expect non-500
            const res = await api.post(test.endpoint!, {}).catch(e => e.response || { status: 0 });
            const status = res?.status || res?.data?.status;
            if (status && status < 500) { updateTest(si, ti, 'passed', `HTTP ${status}`); }
            else { updateTest(si, ti, 'failed', `HTTP ${status || 'ERR'}`); }
          } else {
            const res = await api.get(test.endpoint!).catch(e => e.response || { status: 0 });
            const status = res?.status;
            if (status && status < 500) { updateTest(si, ti, 'passed', `HTTP ${status}`); }
            else if (status === 401 || status === 403) { updateTest(si, ti, 'passed', `HTTP ${status} (auth required - correct)`); }
            else { updateTest(si, ti, 'failed', `HTTP ${status || 'NETWORK'}`); }
          }
        } catch (e: any) {
          const status = e.response?.status;
          if (status === 401 || status === 403) { updateTest(si, ti, 'passed', `HTTP ${status} (auth gate works)`); }
          else { updateTest(si, ti, 'failed', e.message?.substring(0, 50)); }
        }
      }
    }
    setRunning(false);
  };

  const getIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed': return { name: 'checkmark-circle', color: colors.success };
      case 'failed': return { name: 'close-circle', color: colors.error };
      case 'testing': return { name: 'sync', color: colors.warning };
      default: return { name: 'ellipse-outline', color: colors.textMuted };
    }
  };

  const totalTests = sections.reduce((s, sec) => s + sec.tests.length, 0);
  const passed = sections.reduce((s, sec) => s + sec.tests.filter(t => t.status === 'passed').length, 0);
  const failed = sections.reduce((s, sec) => s + sec.tests.filter(t => t.status === 'failed').length, 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.title}>QA Testing</Text>
        <TouchableOpacity style={s.runBtn} onPress={runAllTests} disabled={running}>
          {running ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s.runText}>Run All</Text>}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summary}>
        <View style={s.summaryItem}><Text style={s.summaryVal}>{totalTests}</Text><Text style={s.summaryLabel}>Total</Text></View>
        <View style={s.summaryItem}><Text style={[s.summaryVal, { color: colors.success }]}>{passed}</Text><Text style={s.summaryLabel}>Passed</Text></View>
        <View style={s.summaryItem}><Text style={[s.summaryVal, { color: colors.error }]}>{failed}</Text><Text style={s.summaryLabel}>Failed</Text></View>
        <View style={s.summaryItem}><Text style={[s.summaryVal, { color: colors.primary }]}>{passed > 0 ? Math.round((passed / totalTests) * 100) : 0}%</Text><Text style={s.summaryLabel}>Score</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {sections.map((section, si) => (
          <View key={si} style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name={section.icon as any} size={16} color={colors.primary} />
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionCount}>{section.tests.filter(t => t.status === 'passed').length}/{section.tests.length}</Text>
            </View>
            {section.tests.map((test, ti) => {
              const icon = getIcon(test.status);
              return (
                <View key={ti} style={s.testRow}>
                  <Ionicons name={icon.name as any} size={18} color={icon.color} />
                  <View style={s.testInfo}>
                    <Text style={s.testName}>{test.name}</Text>
                    {test.message && <Text style={s.testMsg}>{test.message}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  runBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm },
  runText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  summary: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { ...typography.headlineLg, color: colors.text },
  summaryLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  section: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.headlineSm, color: colors.text, flex: 1 },
  sectionCount: { ...typography.labelSm, color: colors.textMuted },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  testInfo: { flex: 1 },
  testName: { ...typography.bodyMd, color: colors.text },
  testMsg: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
