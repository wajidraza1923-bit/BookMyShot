/**
 * PremiumModal — Reusable BookMyShot branded modal system
 * Replaces all native Alert.alert() dialogs throughout the app
 * Types: success, error, warning, confirm, info
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

export type ModalType = 'success' | 'error' | 'warning' | 'confirm' | 'info';

interface ModalButton {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  type?: ModalType;
  title: string;
  message?: string;
  details?: { label: string; value: string }[];
  buttons?: ModalButton[];
  icon?: keyof typeof Ionicons.glyphMap;
}

const typeConfig: Record<ModalType, { icon: string; color: string; bgColor: string }> = {
  success: { icon: 'checkmark-circle', color: '#10B981', bgColor: 'rgba(16,185,129,0.08)' },
  error: { icon: 'close-circle', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)' },
  warning: { icon: 'warning', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)' },
  confirm: { icon: 'help-circle', color: colors.primary, bgColor: colors.primaryMuted },
  info: { icon: 'information-circle', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.08)' },
};

export default function PremiumModal({
  visible,
  onClose,
  type = 'info',
  title,
  message,
  details,
  buttons,
  icon,
}: PremiumModalProps) {
  const { width } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const config = typeConfig[type];
  const displayIcon = icon || config.icon;

  const defaultButtons: ModalButton[] = buttons || [
    { text: 'OK', onPress: onClose, variant: 'primary' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[st.container, { maxWidth: width - 48, transform: [{ scale: scaleAnim }] }]}>
          {/* Icon */}
          <View style={[st.iconWrap, { backgroundColor: config.bgColor }]}>
            <Ionicons name={displayIcon as any} size={36} color={config.color} />
          </View>

          {/* Title */}
          <Text style={st.title}>{title}</Text>

          {/* Message */}
          {message && <Text style={st.message}>{message}</Text>}

          {/* Details (key-value pairs) */}
          {details && details.length > 0 && (
            <View style={st.detailsWrap}>
              {details.map((d, i) => (
                <View key={i} style={st.detailRow}>
                  <Text style={st.detailLabel}>{d.label}</Text>
                  <Text style={st.detailValue}>{d.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Buttons */}
          <View style={[st.buttonRow, defaultButtons.length === 1 && { flexDirection: 'column' }]}>
            {defaultButtons.map((btn, i) => {
              const isPrimary = btn.variant === 'primary' || btn.variant === 'destructive';
              const isDestructive = btn.variant === 'destructive';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    st.btn,
                    isPrimary ? [st.btnPrimary, isDestructive && st.btnDestructive] : st.btnSecondary,
                    defaultButtons.length === 1 && { flex: 0, width: '100%' },
                  ]}
                  onPress={btn.onPress}
                  activeOpacity={0.8}
                >
                  <Text style={[st.btnText, isPrimary ? st.btnTextPrimary : st.btnTextSecondary, isDestructive && st.btnTextDestructive]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { width: '100%', backgroundColor: colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  iconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { ...typography.headlineLg, color: colors.text, textAlign: 'center', marginBottom: 8 },
  message: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  detailsWrap: { width: '100%', backgroundColor: colors.background, borderRadius: radius.md, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  detailLabel: { ...typography.bodySm, color: colors.textMuted },
  detailValue: { ...typography.bodySm, color: colors.text, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  btn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md },
  btnPrimary: { backgroundColor: colors.primary },
  btnDestructive: { backgroundColor: '#EF4444' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnText: { fontSize: 14, fontWeight: '700' },
  btnTextPrimary: { color: '#000' },
  btnTextDestructive: { color: '#fff' },
  btnTextSecondary: { color: colors.textSecondary },
});
