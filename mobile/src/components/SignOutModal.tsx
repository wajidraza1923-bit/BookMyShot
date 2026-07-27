/**
 * SignOutModal — Premium Sign Out confirmation dialog
 * Used across Customer, Creator, and Admin screens.
 * Replaces default Alert.alert with animated bottom sheet.
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SignOutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SignOutModal({ visible, onClose, onConfirm }: SignOutModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleConfirm = useRef(new Animated.Value(1)).current;
  const scaleCancel = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
  };

  const handleConfirm = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => onConfirm());
  };

  const pressIn = (anim: Animated.Value) => Animated.spring(anim, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  const pressOut = (anim: Animated.Value) => Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleClose} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }] }]}>
          {/* Handle */}
          <View style={s.handle}><View style={s.handleBar} /></View>

          {/* Icon */}
          <View style={s.iconWrap}>
            <LinearGradient colors={['#F97316', '#FB923C']} style={s.iconGradient}>
              <Ionicons name="log-out-outline" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Text */}
          <Text style={s.title}>Sign Out</Text>
          <Text style={s.subtitle}>Are you sure you want to sign out of your account?</Text>

          {/* Buttons */}
          <Animated.View style={{ transform: [{ scale: scaleConfirm }], width: '100%' }}>
            <TouchableOpacity
              style={s.confirmBtn}
              onPress={handleConfirm}
              onPressIn={() => pressIn(scaleConfirm)}
              onPressOut={() => pressOut(scaleConfirm)}
              activeOpacity={1}
            >
              <LinearGradient colors={['#F97316', '#FB923C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.confirmGradient}>
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={s.confirmText}>Yes, Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: scaleCancel }], width: '100%' }}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={handleClose}
              onPressIn={() => pressIn(scaleCancel)}
              onPressOut={() => pressOut(scaleCancel)}
              activeOpacity={1}
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Info Card */}
          <View style={s.infoCard}>
            <Ionicons name="lock-closed" size={14} color="#6B7280" />
            <Text style={s.infoText}>Your data is safe. You'll be able to sign back in anytime using your account.</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 },
  handle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  iconWrap: { marginTop: 8, marginBottom: 16 },
  iconGradient: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 24, maxWidth: 280 },
  confirmBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 10, elevation: 3, shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#F97316', alignItems: 'center', marginBottom: 16 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#F97316' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, width: '100%' },
  infoText: { fontSize: 11, color: '#6B7280', lineHeight: 16, flex: 1 },
});
