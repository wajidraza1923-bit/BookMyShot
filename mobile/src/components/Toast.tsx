/**
 * Toast — BookMyShot branded toast notification
 * Slides in from top, auto-dismisses, premium dark+gold design
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onHide: () => void;
}

const toastConfig: Record<ToastType, { icon: string; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  error: { icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { icon: 'warning', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  info: { icon: 'information-circle', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
};

export default function Toast({ visible, type = 'info', title, message, duration = 3000, onHide }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View style={[st.wrap, { top: insets.top + 8, transform: [{ translateY }], opacity }]}>
      <View style={[st.container, { borderLeftColor: config.color }]}>
        <View style={[st.iconWrap, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={st.content}>
          <Text style={st.title}>{title}</Text>
          {message && <Text style={st.message} numberOfLines={2}>{message}</Text>}
        </View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999 },
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  title: { ...typography.labelMd, color: colors.text, fontWeight: '700' },
  message: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
