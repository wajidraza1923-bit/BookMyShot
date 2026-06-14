import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radius } from '../theme';

export default function RoleSelectScreen({ navigation }: any) {
  const selectRole = (role: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (role === 'admin') navigation.navigate('AdminLogin');
    else navigation.navigate('Login', { role });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.logoIcon}><Text style={styles.logoEmoji}>📸</Text></View>
        <Text style={styles.brandName}>BOOKMYSHOT</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>Welcome to BookMyShot</Text>
      <Text style={styles.subtitle}>Choose how you want to continue</Text>

      {/* Role Cards */}
      <View style={styles.cards}>
        {/* USER */}
        <TouchableOpacity style={styles.card} onPress={() => selectRole('user')} activeOpacity={0.85}>
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
            <Ionicons name="person" size={28} color={colors.info} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>User</Text>
            <Text style={styles.cardDesc}>Book photographers, videographers and creators.</Text>
          </View>
          <View style={styles.cardBtn}><Text style={styles.cardBtnText}>Continue as User</Text><Ionicons name="arrow-forward" size={14} color={colors.primary} /></View>
        </TouchableOpacity>

        {/* CREATOR */}
        <TouchableOpacity style={[styles.card, styles.cardGold]} onPress={() => selectRole('creator')} activeOpacity={0.85}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="camera" size={28} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Creator</Text>
            <Text style={styles.cardDesc}>Manage bookings, portfolio, calendar and earnings.</Text>
          </View>
          <View style={styles.cardBtn}><Text style={styles.cardBtnText}>Continue as Creator</Text><Ionicons name="arrow-forward" size={14} color={colors.primary} /></View>
        </TouchableOpacity>

        {/* Creator Signup Link */}
        <TouchableOpacity style={styles.creatorSignup} onPress={() => navigation.navigate('Register', { role: 'creator' })}>
          <Text style={styles.creatorSignupText}>New Creator? <Text style={styles.creatorSignupLink}>Sign Up as Creator</Text></Text>
        </TouchableOpacity>

        {/* ADMIN */}
        <TouchableOpacity style={styles.card} onPress={() => selectRole('admin')} activeOpacity={0.85}>
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
            <Ionicons name="shield" size={28} color={colors.error} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Admin</Text>
            <Text style={styles.cardDesc}>Manage platform, creators, subscriptions and inquiries.</Text>
          </View>
          <View style={styles.cardBtn}><Text style={styles.cardBtnText}>Admin Login</Text><Ionicons name="arrow-forward" size={14} color={colors.primary} /></View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing['4xl'] },
  brand: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logoIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryMuted, borderWidth: 1.5, borderColor: colors.borderGold, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoEmoji: { fontSize: 28 },
  brandName: { fontSize: 14, fontWeight: '300', color: colors.primary, letterSpacing: 5 },
  title: { ...typography.displaySm, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center', marginBottom: spacing['3xl'] },
  cards: { gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  cardGold: { borderColor: colors.borderGold, backgroundColor: 'rgba(212,175,55,0.03)' },
  cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  cardContent: { marginBottom: spacing.lg },
  cardTitle: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.xs },
  cardDesc: { ...typography.bodyMd, color: colors.textSecondary, lineHeight: 20 },
  cardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primaryMuted, borderRadius: radius.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.borderGold },
  cardBtnText: { ...typography.labelLg, color: colors.primary, fontWeight: '600' },
  creatorSignup: { alignItems: 'center', paddingVertical: spacing.sm },
  creatorSignupText: { ...typography.bodyMd, color: colors.textMuted },
  creatorSignupLink: { color: colors.primary, fontWeight: '600' },
});
