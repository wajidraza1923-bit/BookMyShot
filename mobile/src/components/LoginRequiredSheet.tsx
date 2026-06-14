import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  title?: string;
  message?: string;
}

export default function LoginRequiredSheet({ visible, onClose, onLogin, onSignUp, title, message }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Icon */}
          <View style={s.iconWrap}>
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>

          {/* Content */}
          <Text style={s.title}>{title || 'Create your account'}</Text>
          <Text style={s.message}>{message || 'Sign up or log in to send inquiries, book creators and manage your bookings.'}</Text>

          {/* Buttons */}
          <TouchableOpacity style={s.loginBtn} onPress={onLogin} activeOpacity={0.85}>
            <Text style={s.loginBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.signupBtn} onPress={onSignUp} activeOpacity={0.85}>
            <Text style={s.signupBtnText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.continueBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.continueBtnText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: spacing['4xl'], alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.xl },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderGold },
  title: { ...typography.headlineLg, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  message: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing['2xl'], paddingHorizontal: spacing.lg },
  loginBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  loginBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '700' },
  signupBtn: { width: '100%', backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  signupBtnText: { ...typography.labelLg, color: colors.primary, fontWeight: '700' },
  continueBtn: { paddingVertical: spacing.sm },
  continueBtnText: { ...typography.labelMd, color: colors.textMuted },
});
