import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import PremiumModal from '../components/PremiumModal';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { register: authRegister } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'creator'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await authRegister(name.trim(), email.trim().toLowerCase(), password, role);
    setLoading(false);
    console.log('REGISTER RESULT:', JSON.stringify(result));
    if (result.success) {
      // Auto-login happened, RootNavigator will route
      return;
    }
    // Check if email verification is needed
    if (result.requiresVerification) {
      navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
    } else {
      setErrorModal({ visible: true, title: 'Registration Failed', message: result.message || 'Something went wrong. Please try again.' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join BookMyShot and discover premium wedding creators</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'user' && styles.roleBtnActive]}
            onPress={() => { setRole('user'); Haptics.selectionAsync(); }}
          >
            <Ionicons name="heart-outline" size={18} color={role === 'user' ? colors.primary : colors.textMuted} />
            <Text style={[styles.roleLabel, role === 'user' && styles.roleLabelActive]}>I'm a Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'creator' && styles.roleBtnActive]}
            onPress={() => { setRole('creator'); Haptics.selectionAsync(); }}
          >
            <Ionicons name="camera-outline" size={18} color={role === 'creator' ? colors.primary : colors.textMuted} />
            <Text style={[styles.roleLabel, role === 'creator' && styles.roleLabelActive]}>I'm a Creator</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Full Name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            autoCapitalize="words"
            error={errors.name}
          />
          <Input
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 6 characters"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={errors.password}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.registerBtn}
          />
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By creating an account, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PremiumModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        type="error"
        title={errorModal.title}
        message={errorModal.message}
        buttons={[{ text: 'Try Again', onPress: () => setErrorModal({ ...errorModal, visible: false }), variant: 'primary' }]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['5xl'],
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.displaySm, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, marginBottom: spacing['3xl'] },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing['3xl'] },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  roleLabel: { ...typography.labelMd, color: colors.textMuted },
  roleLabelActive: { color: colors.primary },
  form: {},
  registerBtn: { marginTop: spacing.md },
  terms: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing['2xl'], lineHeight: 18 },
  termsLink: { color: colors.primary },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing['2xl'] },
  loginText: { ...typography.bodyMd, color: colors.textSecondary },
  loginLink: { ...typography.labelLg, color: colors.primary },
});
