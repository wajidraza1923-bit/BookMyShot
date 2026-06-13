import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radius } from '../theme';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('bms_user');
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {
      // Silently handle - user stays null (guest mode)
    }
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await AsyncStorage.removeItem('bms_token');
    await AsyncStorage.removeItem('bms_user');
    setUser(null);
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: 'calendar-outline', label: 'My Bookings', badge: null },
        { icon: 'heart-outline', label: 'Saved Creators', badge: null },
        { icon: 'wallet-outline', label: 'Wallet & Payments', badge: null },
        { icon: 'diamond-outline', label: 'Subscription', badge: 'PRO' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline', label: 'Notifications', badge: null },
        { icon: 'moon-outline', label: 'Appearance', badge: null },
        { icon: 'language-outline', label: 'Language', badge: null },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'chatbubble-ellipses-outline', label: 'Help & FAQ', badge: null },
        { icon: 'document-text-outline', label: 'Terms & Privacy', badge: null },
        { icon: 'star-outline', label: 'Rate the App', badge: null },
        { icon: 'information-circle-outline', label: 'About BookMyShot', badge: null },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        {user ? (
          <>
            <View style={styles.avatarWrap}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>{(user.name || 'U')[0].toUpperCase()}</Text>
              )}
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Ionicons
                name={user.role === 'creator' ? 'camera' : 'person'}
                size={12}
                color={colors.primary}
              />
              <Text style={styles.roleText}>
                {user.role === 'creator' ? 'Creator' : 'Customer'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <Text style={styles.name}>Welcome</Text>
            <Text style={styles.email}>Sign in to access your account</Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats Row */}
      {user && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}><Text style={styles.statValue}>3</Text><Text style={styles.statLabel}>Bookings</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>8</Text><Text style={styles.statLabel}>Saved</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>2</Text><Text style={styles.statLabel}>Reviews</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>150</Text><Text style={styles.statLabel}>Points</Text></View>
        </View>
      )}

      {/* Referral Banner */}
      <View style={styles.referralBanner}>
        <View style={styles.referralContent}>
          <Text style={styles.referralTitle}>Refer & Earn ₹2000</Text>
          <Text style={styles.referralSubtitle}>Share BookMyShot with friends</Text>
        </View>
        <TouchableOpacity style={styles.referralBtn}><Text style={styles.referralBtnText}>Invite</Text></TouchableOpacity>
      </View>

      {/* Menu Sections */}
      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                style={[styles.menuItem, ii < section.items.length - 1 && styles.menuItemBorder]}
                activeOpacity={0.7}
                onPress={() => Haptics.selectionAsync()}
              >
                <View style={styles.menuIconWrap}>
                  <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.badge && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout */}
      {user && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      )}

      {/* Version */}
      <Text style={styles.version}>BookMyShot v2.0.0 • Made with ❤️ in India</Text>
      <View style={{ height: spacing['4xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingTop: spacing['6xl'],
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.borderGold,
    overflow: 'hidden',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 28, fontWeight: '600', color: colors.primary },
  name: { ...typography.headlineLg, color: colors.text },
  email: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  roleText: { ...typography.labelSm, color: colors.primary },
  signInBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  signInText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  statItem: { alignItems: 'center' },
  statValue: { ...typography.headlineLg, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  referralBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  referralContent: { flex: 1 },
  referralTitle: { ...typography.headlineSm, color: colors.primary },
  referralSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  referralBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm },
  referralBtnText: { ...typography.labelMd, color: colors.textInverse, fontWeight: '600' },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  sectionTitle: {
    ...typography.labelMd,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: { width: 32, alignItems: 'center' },
  menuLabel: { ...typography.bodyMd, color: colors.text, flex: 1, marginLeft: spacing.md },
  menuBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  menuBadgeText: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['3xl'],
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: { ...typography.labelLg, color: colors.error },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
});
