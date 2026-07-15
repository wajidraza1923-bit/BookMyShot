import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setErrors({});
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) {
      setErrors({ general: result.message || 'Invalid email or password. Please try again.' });
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Back button */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={s.logoSection}>
          <LinearGradient colors={['#6C3BFF', '#FF4FA3']} style={s.logoCircle}>
            <Ionicons name="aperture" size={28} color="#fff" />
          </LinearGradient>
          <Text style={s.logoText}>BOOK<Text style={{ color: '#FF4FA3' }}>MYSHOT</Text></Text>
        </View>

        {/* Welcome */}
        <Text style={s.title}>Welcome Back 👋</Text>
        <Text style={s.subtitle}>Sign in to continue to your account</Text>

        {/* Error */}
        {errors.general && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={s.errorBannerText}>{errors.general}</Text>
          </View>
        )}

        {/* Form */}
        <View style={s.form}>
          {/* Email */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Email</Text>
            <View style={[s.inputRow, errors.email && s.inputError]}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
              <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#D1D5DB" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            {errors.email && <Text style={s.fieldError}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Password</Text>
            <View style={[s.inputRow, errors.password && s.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
              <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#D1D5DB" secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={s.fieldError}>{errors.password}</Text>}
          </View>

          {/* Forgot */}
          <TouchableOpacity style={s.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={s.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} disabled={loading}>
            <LinearGradient colors={['#6C3BFF', '#8B5CF6', '#FF4FA3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.loginBtn}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="log-in-outline" size={18} color="#fff" /><Text style={s.loginBtnText}>Sign In</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Register */}
        <TouchableOpacity style={s.registerBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={s.registerBtnText}>Create New Account</Text>
        </TouchableOpacity>

        <View style={s.bottomRow}>
          <Text style={s.bottomText}>By signing in, you agree to our </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Terms' })}><Text style={s.bottomLink}>Terms</Text></TouchableOpacity>
          <Text style={s.bottomText}> & </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Info', { page: 'Privacy' })}><Text style={s.bottomLink}>Privacy Policy</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginTop: Platform.OS === 'ios' ? 56 : 40 },
  // Logo
  logoSection: { alignItems: 'center', marginTop: 32, marginBottom: 28 },
  logoCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 18, fontWeight: '800', color: '#1F2937', letterSpacing: 1 },
  // Welcome
  title: { fontSize: 24, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorBannerText: { fontSize: 12, color: '#DC2626', flex: 1 },
  // Form
  form: { marginBottom: 20 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 50, gap: 10 },
  inputError: { borderColor: '#EF4444' },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 4 },
  forgotText: { fontSize: 12, fontWeight: '600', color: '#6C3BFF' },
  // Login button
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { paddingHorizontal: 14, fontSize: 12, color: '#9CA3AF' },
  // Register
  registerBtn: { borderWidth: 1.5, borderColor: '#6C3BFF', borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center' },
  registerBtnText: { fontSize: 14, fontWeight: '600', color: '#6C3BFF' },
  // Bottom
  bottomRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 },
  bottomText: { fontSize: 11, color: '#9CA3AF' },
  bottomLink: { fontSize: 11, color: '#6C3BFF', fontWeight: '600' },
});
