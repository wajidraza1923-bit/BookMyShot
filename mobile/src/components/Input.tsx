import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, Animated, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export default function Input({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, focused && styles.labelFocused, error && styles.labelError]}>
        {label}
      </Text>
      <View style={[styles.inputWrap, { borderColor }]}>
        {icon && (
          <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={styles.icon} />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={rightIcon} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  label: {
    ...typography.labelMd,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  labelFocused: { color: colors.primary },
  labelError: { color: colors.error },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  icon: { marginRight: spacing.md },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.text,
    height: '100%',
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
