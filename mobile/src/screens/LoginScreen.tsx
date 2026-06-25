/**
 * LoginScreen — Premium BookMyShot login with custom error handling
 * No native Alert dialogs — uses PremiumModal for all feedback
 */
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
import { colors, spacing, typography, radius } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import PremiumModal from '../components/PremiumModal';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Error modal state (replaces Alert.alert)
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Minimum 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) {
      // Determine error type for better messaging
      const msg = result.message || 'Check your credentials.';
      let title = 'Login Failed';
      let displayMsg = msg;

      if (msg.includes('503') || msg.includes('temporarily') || msg.includes('Cannot reach')) {
        title = 'Server Unavailable';
        displayMsg = 'The server is temporarily unavailable. Please try again in a few minutes.';
      } else if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('Invalid')) {
        title = 'Invalid Credentials';
        displayMsg = 'The email or password you entered is incorrect. Please try again.';
      } else if (msg.includes('verify') || msg.includes('email')) {
        title = 'Email Verification Required';
        displayMsg = 'Please verify your email address before logging in. Check your inbox for the verification OTP.';
      } else if (msg.includes('many attempts') || msg.includes('429')) {
        title = 'Too Many Attempts';
        displayMsg = 'You\'ve made too many login attempts. Please wait 15 minutes and try again.';
      }

      setErrorModal({ visible: true, title, message: displayMsg });
    }
    // If success, AuthContext updates → RootNavigator auto-routes by role
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
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>📸</Text>
          </View>
          <Text style={styles.brandName}>BOOKMYSHOT</Text>
          <Text style={styles.tagline}>Premium Wedding Creators</Text>
        </View>

        {/* Welcome */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your account</Text>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
          <Input
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={errors.password}
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginBtn}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Register */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ═══ ERROR MODAL (replaces Alert.alert) ═══ */}
      <PremiumModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        type="error"
        title={errorModal.title}
        message={errorModal.message}
        buttons={[
          { text: 'Try Again', onPress: () => setErrorModal({ ...errorModal, visible: false }), variant: 'primary' },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },
  brand: { alignItems: 'center', marginTop: spacing['6xl'], marginBottom: spacing['4xl'] },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoEmoji: { fontSize: 28 },
  brandName: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.primary,
    letterSpacing: 5,
    marginBottom: spacing.xs,
  },
  tagline: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.displaySm, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, marginBottom: spacing['3xl'] },
  form: { marginBottom: spacing.xl },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing['2xl'] },
  forgotText: { ...typography.labelMd, color: colors.primary },
  loginBtn: { marginTop: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing['2xl'] },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.caption, color: colors.textMuted, marginHorizontal: spacing.lg },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { ...typography.bodyMd, color: colors.textSecondary },
  registerLink: { ...typography.labelLg, color: colors.primary },
});
