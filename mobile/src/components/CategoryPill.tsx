import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../theme';

interface CategoryPillProps {
  label: string;
  icon?: string;
  active?: boolean;
  onPress: () => void;
}

export default function CategoryPill({ label, icon, active = false, onPress }: CategoryPillProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.active]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  active: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    ...typography.labelMd,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.primary,
  },
});
