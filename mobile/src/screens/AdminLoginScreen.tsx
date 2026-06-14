import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminLoginScreen({ navigation }: any) {
  const { login, setAuthDirect } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Send OTP (same as website POST /auth/admin-login-otp)
  const sendOtp = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Enter admin email'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await api.post('/auth/admin-login-otp', { email: email.trim().toLowerCase() });
      setStep('otp');
      Alert.alert('OTP Sent', 'Check your email for the login OTP.');
    } catch (e: any) {
      Alert.alert('Failed', e.response?.data?.message || 'Could not send OTP');
    } finally { setLoading(false); }
  };

  // Step 2: Verify OTP (same as website POST /auth/admin-verify-otp-login)
  const verifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 4) { Alert.alert('Error', 'Enter the OTP from your email'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const res = await api.post('/auth/admin-verify-otp-login', { email: email.trim().toLowerCase(), otp: otp.trim() });
      const data = res.data;
      if (data.token && data.user) {
        const normalizedUser = { _id: data.user.id || data.user._id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar || '' };
        await AsyncStorage.setItem('bms_token', data.token);
        await AsyncStorage.setItem('bms_user', JSON.stringify(normalizedUser));
        // Directly set auth state — no restart needed
        setAuthDirect(data.token, normalizedUser);
        // RootNavigator will auto-switch to AdminNavigator because role='admin'
      } else {
        Alert.alert('Error', data.message || 'No token received');
      }
    } catch (e: any) {
      Alert.alert('Failed', e.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  // Also support direct password login (fallback)
  const passwordLogin = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Email required'); return; }
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), otp || 'admin');
    setLoading(false);
    if (!result.success) {
      // If password fails, suggest OTP
      Alert.alert('Password Login Failed', 'Admin accounts use OTP login. Tap "Send OTP" instead.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconWrap}><Ionicons name="shield-checkmark" size={32} color={colors.error} /></View>
          <Text style={styles.title}>Admin Login</Text>
          <Text style={styles.subtitle}>BookMyShot Super Admin Panel</Text>
        </View>

        {step === 'email' ? (
          <View style={styles.form}>
            <Input label="Admin Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="admin@bookmyshot.in" keyboardType="email-address" autoCapitalize="none" />
            <Button title="Send OTP" onPress={sendOtp} loading={loading} size="lg" style={styles.mainBtn} />
            <TouchableOpacity style={styles.altBtn} onPress={passwordLogin}><Text style={styles.altBtnText}>Login with password instead</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.otpInfo}>OTP sent to {email}</Text>
            <Input label="Enter OTP" icon="key-outline" value={otp} onChangeText={setOtp} placeholder="Enter 6-digit OTP" keyboardType="number-pad" />
            <Button title="Verify & Login" onPress={verifyOtp} loading={loading} size="lg" style={styles.mainBtn} />
            <TouchableOpacity style={styles.altBtn} onPress={() => setStep('email')}><Text style={styles.altBtnText}>← Change email</Text></TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <Text style={styles.infoText}>Admin access is restricted. OTP is sent to the registered admin email only.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: spacing['5xl'], borderWidth: 1, borderColor: colors.border },
  header: { alignItems: 'center', marginTop: spacing['3xl'], marginBottom: spacing['3xl'] },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title: { ...typography.displaySm, color: colors.text },
  subtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs },
  form: { marginBottom: spacing.xl },
  mainBtn: { marginTop: spacing.md },
  otpInfo: { ...typography.bodySm, color: colors.primary, marginBottom: spacing.lg, textAlign: 'center' },
  altBtn: { alignItems: 'center', marginTop: spacing.xl },
  altBtnText: { ...typography.labelMd, color: colors.textMuted },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' },
  infoText: { ...typography.bodySm, color: colors.warning, flex: 1, lineHeight: 18 },
});
