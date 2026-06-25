/**
 * LoadingOverlay — BookMyShot branded loading animation
 * Replaces default ActivityIndicator with premium branded experience
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message = 'Loading...' }: LoadingOverlayProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      spinAnim.setValue(0);
      pulseAnim.setValue(0.8);
    }
  }, [visible]);

  if (!visible) return null;

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <Animated.View style={[st.container, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.View style={[st.ring, { transform: [{ rotate: spin }] }]}>
            <View style={st.ringDot} />
          </Animated.View>
          <View style={st.logoWrap}>
            <Ionicons name="videocam-outline" size={22} color={colors.primary} />
          </View>
        </Animated.View>
        <Text style={st.message}>{message}</Text>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  container: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2.5, borderColor: 'rgba(212,175,55,0.15)', borderTopColor: colors.primary },
  ringDot: { position: 'absolute', top: -4, left: '50%', marginLeft: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  logoWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(212,175,55,0.08)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center' },
  message: { ...typography.bodyMd, color: 'rgba(255,255,255,0.6)', marginTop: 20, letterSpacing: 0.3 },
});
