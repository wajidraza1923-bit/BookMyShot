import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert('Error', 'Email and password required'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) Alert.alert('Login Failed', result.message || 'Invalid credentials');
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

        <View style={styles.form}>
          <Input label="Admin Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="admin@bookmyshot.in" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          <Button title="Login as Admin" onPress={handleLogin} loading={loading} size="lg" style={styles.loginBtn} />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <Text style={styles.infoText}>Admin access is restricted. Only authorized personnel can access the admin panel.</Text>
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
  loginBtn: { marginTop: spacing.md },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' },
  infoText: { ...typography.bodySm, color: colors.warning, flex: 1, lineHeight: 18 },
});
