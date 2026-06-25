import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfileScreen({ navigation }: any) {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, saved: 0, reviews: 0, notifications: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      if (role === 'creator') {
        const res = await api.get('/creator/dashboard');
        setStats({ bookings: res.data?.totalBookings || 0, saved: res.data?.favorites || 0, reviews: res.data?.reviews || 0, notifications: res.data?.newInquiries || 0 });
      } else {
        const [bookRes, notifRes] = await Promise.all([
          api.get('/user/bookings').catch(() => ({ data: { bookings: [] } })),
          api.get('/notifications').catch(() => ({ data: { unreadCount: 0 } })),
        ]);
        setStats({ bookings: (bookRes.data?.bookings || []).length, saved: 0, reviews: 0, notifications: notifRes.data?.unreadCount || 0 });
      }
    } catch {}
  }, [isAuthenticated, role]);

  useEffect(() => { loadStats(); }, [loadStats]);
  const onRefresh = async () => { setRefreshing(true); await loadStats(); setRefreshing(false); };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await logout();
      }}
    ]);
  };

  const navigateTo = (screen: string) => {
    Haptics.selectionAsync();
    navigation.navigate(screen);
  };

  // Build menu sections based on role
  const sections = role === 'creator' ? [
    {
      title: 'Creator Tools',
      items: [
        { icon: 'calendar-outline', label: 'My Bookings', screen: 'CreatorBookings', badge: stats.bookings > 0 ? String(stats.bookings) : null },
        { icon: 'images-outline', label: 'My Portfolio', screen: 'CreatorPortfolio' },
        { icon: 'pricetag-outline', label: 'Packages', screen: 'CreatorPackages' },
        { icon: 'card-outline', label: 'Wallet & Earnings', screen: 'CreatorWallet' },
        { icon: 'shield-checkmark-outline', label: 'Payment Verification', screen: 'CreatorPaymentVerification' },
        { icon: 'diamond-outline', label: 'Subscription', screen: 'CreatorSubscription', badge: 'PRO' },
      ],
    },
    {
      title: 'Activity',
      items: [
        { icon: 'notifications-outline', label: 'Notifications', screen: 'CreatorNotifications', badge: stats.notifications > 0 ? String(stats.notifications) : null },
        { icon: 'star-outline', label: 'Reviews', screen: 'CreatorReviews', badge: stats.reviews > 0 ? String(stats.reviews) : null },
        { icon: 'calendar-clear-outline', label: 'Calendar', screen: 'CreatorCalendar' },
        { icon: 'ban-outline', label: 'Availability', screen: 'CreatorAvailability' },
      ],
    },
  ] : [
    {
      title: 'Account',
      items: [
        { icon: 'calendar-outline', label: 'My Bookings', screen: 'Bookings', badge: stats.bookings > 0 ? String(stats.bookings) : null },
        { icon: 'notifications-outline', label: 'Notifications', screen: 'CreatorNotifications', badge: stats.notifications > 0 ? String(stats.notifications) : null },
      ],
    },
  ];

  // Common settings section
  const settingsSection = {
    title: 'Settings',
    items: [
      { icon: 'person-outline', label: 'Edit Profile', screen: role === 'creator' ? 'CreatorSettings' : 'EditProfile' },
      { icon: 'help-circle-outline', label: 'Help & FAQ', action: () => Linking.openURL('https://bookmyshot.in/faq') },
      { icon: 'document-text-outline', label: 'Terms & Privacy', action: () => Linking.openURL('https://bookmyshot.in/terms') },
      { icon: 'star-outline', label: 'Rate BookMyShot', action: () => Linking.openURL('https://play.google.com/store/apps/details?id=in.bookmyshot.app').catch(() => Alert.alert('Coming Soon', 'App Store link will be available after launch.')) },
      { icon: 'information-circle-outline', label: 'About BookMyShot', action: () => Alert.alert('BookMyShot', 'Version 2.0.0\n\nPremium Wedding Creator Marketplace\n\nhttps://bookmyshot.in') },
    ],
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>

      {/* Profile Header */}
      <View style={styles.header}>
        {isAuthenticated && user ? (
          <>
            <View style={styles.avatarWrap}>
              {user.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatarImage} /> : <Text style={styles.avatarInitial}>{(user.name || 'U')[0].toUpperCase()}</Text>}
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name={role === 'creator' ? 'camera' : 'person'} size={12} color={colors.primary} />
              <Text style={styles.roleText}>{role === 'creator' ? 'Creator' : 'Customer'}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.avatarWrap}><Ionicons name="person" size={32} color={colors.primary} /></View>
            <Text style={styles.name}>Welcome</Text>
            <Text style={styles.email}>Sign in to access your account</Text>
            <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}><Text style={styles.signInText}>Sign In</Text></TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats Row (authenticated only) */}
      {isAuthenticated && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}><Text style={styles.statValue}>{stats.bookings}</Text><Text style={styles.statLabel}>Bookings</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>{stats.saved}</Text><Text style={styles.statLabel}>Favorites</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>{stats.reviews}</Text><Text style={styles.statLabel}>Reviews</Text></View>
        </View>
      )}

      {/* Menu Sections */}
      {isAuthenticated && sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, ii) => (
              <TouchableOpacity key={ii} style={[styles.menuItem, ii < section.items.length - 1 && styles.menuItemBorder]} activeOpacity={0.7} onPress={() => item.screen && navigateTo(item.screen)}>
                <View style={styles.menuIconWrap}><Ionicons name={item.icon as any} size={20} color={colors.textSecondary} /></View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.badge && <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge}</Text></View>}
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{settingsSection.title}</Text>
        <View style={styles.sectionCard}>
          {settingsSection.items.map((item, ii) => (
            <TouchableOpacity key={ii} style={[styles.menuItem, ii < settingsSection.items.length - 1 && styles.menuItemBorder]} activeOpacity={0.7} onPress={() => item.action ? item.action() : item.screen && navigateTo(item.screen)}>
              <View style={styles.menuIconWrap}><Ionicons name={item.icon as any} size={20} color={colors.textSecondary} /></View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      {isAuthenticated && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.version}>BookMyShot v2.0.0 • Made with ❤️ in India</Text>
      <View style={{ height: spacing['4xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', paddingTop: spacing['6xl'], paddingBottom: spacing['2xl'], paddingHorizontal: spacing.xl },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, borderWidth: 2, borderColor: colors.borderGold, overflow: 'hidden' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 28, fontWeight: '600', color: colors.primary },
  name: { ...typography.headlineLg, color: colors.text },
  email: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md, backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 1, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderGold },
  roleText: { ...typography.labelSm, color: colors.primary },
  signInBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, paddingHorizontal: spacing['3xl'], paddingVertical: spacing.md, borderRadius: radius.md },
  signInText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  statItem: { alignItems: 'center' },
  statValue: { ...typography.headlineLg, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  sectionTitle: { ...typography.labelMd, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md, marginLeft: spacing.xs },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: { width: 32, alignItems: 'center' },
  menuLabel: { ...typography.bodyMd, color: colors.text, flex: 1, marginLeft: spacing.md },
  menuBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, marginRight: spacing.sm },
  menuBadgeText: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing['3xl'], marginHorizontal: spacing.xl, paddingVertical: spacing.lg, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { ...typography.labelLg, color: colors.error },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing['2xl'] },
});
