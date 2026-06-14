import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';

export default function GuestProfileScreen({ navigation }: any) {
  return (
    <View style={s.container}>
      <View style={s.content}>
        {/* Icon */}
        <View style={s.iconWrap}>
          <Ionicons name="person-outline" size={36} color={colors.primary} />
        </View>

        <Text style={s.title}>Welcome to BookMyShot</Text>
        <Text style={s.subtitle}>Sign in to book creators, save favorites, send inquiries and manage your account.</Text>

        {/* Login */}
        <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <Ionicons name="log-in-outline" size={18} color={colors.textInverse} />
          <Text style={s.loginBtnText}>Login</Text>
        </TouchableOpacity>

        {/* Sign Up */}
        <TouchableOpacity style={s.signupBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
          <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          <Text style={s.signupBtnText}>Create Account</Text>
        </TouchableOpacity>

        {/* Creator Login */}
        <TouchableOpacity style={s.creatorBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={16} color={colors.textMuted} />
          <Text style={s.creatorBtnText}>I'm a Creator</Text>
        </TouchableOpacity>

        {/* Admin Login */}
        <TouchableOpacity style={s.adminBtn} onPress={() => navigation.navigate('AdminLogin')} activeOpacity={0.8}>
          <Ionicons name="shield-outline" size={14} color={colors.textMuted} />
          <Text style={s.adminBtnText}>Admin Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  content: { paddingHorizontal: spacing['2xl'], alignItems: 'center' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.borderGold },
  title: { ...typography.headlineLg, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing['3xl'], paddingHorizontal: spacing.md },
  loginBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginBottom: spacing.md },
  loginBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  signupBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginBottom: spacing.xl },
  signupBtnText: { ...typography.labelLg, color: colors.primary, fontWeight: '700' },
  creatorBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  creatorBtnText: { ...typography.labelMd, color: colors.textMuted },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, marginTop: spacing.sm },
  adminBtnText: { ...typography.caption, color: colors.textMuted },
});
