import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { Card } from '../components';

export default function ProfileScreen() {
  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', route: 'EditProfile' },
    { icon: 'heart-outline', label: 'Saved Creators', route: 'Saved' },
    { icon: 'card-outline', label: 'Payment History', route: 'Payments' },
    { icon: 'notifications-outline', label: 'Notifications', route: 'Notifications' },
    { icon: 'help-circle-outline', label: 'Help & Support', route: 'Help' },
    { icon: 'information-circle-outline', label: 'About BookMyShot', route: 'About' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <Text style={styles.name}>Guest User</Text>
        <Text style={styles.email}>Sign in to access your account</Text>

        <TouchableOpacity style={styles.signInBtn} activeOpacity={0.85}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Version */}
      <Text style={styles.version}>BookMyShot v2.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingTop: spacing['6xl'],
    paddingBottom: spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  },
  name: { ...typography.headlineLg, color: colors.text },
  email: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
  signInBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  signInText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  menu: { paddingTop: spacing.xl },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: { width: 36, alignItems: 'center' },
  menuLabel: { ...typography.bodyMd, color: colors.text, flex: 1, marginLeft: spacing.md },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing['3xl'] },
});
