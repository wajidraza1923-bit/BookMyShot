import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

export default function BookingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Your Bookings</Text>
        <Text style={styles.subtitle}>
          Sign in to view your upcoming events and booking history
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  title: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
