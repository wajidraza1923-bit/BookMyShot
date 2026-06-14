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

type LoginMode = 'select' | 'otp-email' | 'otp-verify' | 'password';

export default function AdminLoginScreen({ navigation }: any) {
  const { login, setAuthDirect } = useAuth();
  const [mode, setMode] = useState<LoginMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ═══ PASSWORD LOGIN ═══
  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) { Alert.alert('Error', 'Email and password required'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Login Failed', result.message || 'Invalid credentials');
    }
    // If success, AuthContext updates role=admin → RootNavigator auto-shows AdminNavigator
  };

  // ═══ OTP STEP 1: Send OTP ═══
  const sendOtp = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Enter admin email'); return; }
    if (cooldown > 0) { Alert.alert('Wait', `Please wait ${cooldown}s before requesting again`); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await api.post('/auth/admin-login-otp', { email: email.trim().toLowerCase() });
      setMode('otp-verify');
      Alert.alert('OTP Sent ✉️', 'Check your email for the 6-digit login code.');
      // Start cooldown
      setCooldown(60);
      const interval = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; }), 1000);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Could not send OTP';
      Alert.alert('OTP Failed', `${msg}\n\nUse password login instead.`);
      // Auto-switch to password mode as fallback
    } finally { setLoading(false); }
  };

  // ═══ OTP STEP 2: Verify OTP ═══
  const verifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 4) { Alert.alert('Error', 'Enter the OTP'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const res = await api.post('/auth/admin-verify-otp-login', { email: email.trim().toLowerCase(), otp: otp.trim() });
      const data = res.data;
      if (data.token && data.user) {
        const normalizedUser = { _id: data.user.id || data.user._id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar || '' };
        await AsyncStorage.setItem('bms_token', data.token);
        await AsyncStorage.setItem('bms_user', JSON.stringify(normalizedUser));
        setAuthDirect(data.token, normalizedUser);
        // Auto-navigates to AdminDashboard via RootNavigator
      } else {
        Alert.alert('Error', data.message || 'Verification failed');
      }
    } catch (e: any) {
      Alert.alert('Failed', e.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={() => mode === 'select' ? navigation.goBack() : setMode('select')}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={s.iconWrap}><Ionicons name="shield-checkmark" size={32} color={colors.error} /></View>
          <Text style={s.title}>Admin Login</Text>
          <Text style={s.subtitle}>BookMyShot Super Admin</Text>
        </View>

        {/* ═══ MODE: SELECT ═══ */}
        {mode === 'select' && (
          <View style={s.selectCards}>
            <TouchableOpacity style={s.selectCard} onPress={() => setMode('otp-email')} activeOpacity={0.85}>
              <View style={[s.selectIcon, { backgroundColor: 'rgba(59,130,246,0.08)' }]}><Ionicons name="mail" size={22} color={colors.info} /></View>
              <Text style={s.selectTitle}>Login with OTP</Text>
              <Text style={s.selectDesc}>Secure one-time code sent to admin email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.selectCard} onPress={() => setMode('password')} activeOpacity={0.85}>
              <View style={[s.selectIcon, { backgroundColor: colors.primaryMuted }]}><Ionicons name="lock-closed" size={22} color={colors.primary} /></View>
              <Text style={s.selectTitle}>Login with Password</Text>
              <Text style={s.selectDesc}>Use admin email and password</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ MODE: OTP EMAIL ═══ */}
        {mode === 'otp-email' && (
          <View style={s.form}>
            <Input label="Admin Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="admin@bookmyshot.in" keyboardType="email-address" autoCapitalize="none" />
            <Button title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP'} onPress={sendOtp} loading={loading} size="lg" disabled={cooldown > 0} style={s.mainBtn} />
            <TouchableOpacity style={s.switchBtn} onPress={() => setMode('password')}><Text style={s.switchText}>Use password instead</Text></TouchableOpacity>
          </View>
        )}

        {/* ═══ MODE: OTP VERIFY ═══ */}
        {mode === 'otp-verify' && (
          <View style={s.form}>
            <Text style={s.otpSent}>OTP sent to {email}</Text>
            <Input label="Enter OTP" icon="key-outline" value={otp} onChangeText={setOtp} placeholder="6-digit code" keyboardType="number-pad" />
            <Button title="Verify & Login" onPress={verifyOtp} loading={loading} size="lg" style={s.mainBtn} />
            <View style={s.otpActions}>
              <TouchableOpacity onPress={sendOtp} disabled={cooldown > 0}><Text style={[s.switchText, cooldown > 0 && { opacity: 0.4 }]}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('password')}><Text style={s.switchText}>Use password</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══ MODE: PASSWORD ═══ */}
        {mode === 'password' && (
          <View style={s.form}>
            <Input label="Admin Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="admin@bookmyshot.in" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
            <Button title="Login" onPress={handlePasswordLogin} loading={loading} size="lg" style={s.mainBtn} />
            <TouchableOpacity style={s.switchBtn} onPress={() => setMode('otp-email')}><Text style={s.switchText}>Use OTP instead</Text></TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <Text style={s.infoText}>Admin access is restricted. Only authorized personnel can access the admin panel.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: spacing['5xl'], borderWidth: 1, borderColor: colors.border },
  header: { alignItems: 'center', marginTop: spacing['2xl'], marginBottom: spacing['3xl'] },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title: { ...typography.displaySm, color: colors.text },
  subtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs },
  // Select mode
  selectCards: { gap: spacing.lg },
  selectCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  selectIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  selectTitle: { ...typography.headlineMd, color: colors.text, marginBottom: spacing.xs },
  selectDesc: { ...typography.bodySm, color: colors.textMuted },
  // Form
  form: {},
  mainBtn: { marginTop: spacing.md },
  switchBtn: { alignItems: 'center', marginTop: spacing.xl },
  switchText: { ...typography.labelMd, color: colors.primary },
  otpSent: { ...typography.bodySm, color: colors.success, textAlign: 'center', marginBottom: spacing.xl },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  // Info
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing['3xl'], backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' },
  infoText: { ...typography.bodySm, color: colors.warning, flex: 1, lineHeight: 18 },
});
