import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => { if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); } }, [countdown]);

  // Step 1: Send OTP
  const sendOtp = async () => {
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
      const data = await res.json();
      if (res.status === 429) { setError('Too many requests. Wait and try again.'); setLoading(false); return; }
      if (data.success) { setStep('otp'); setCountdown(60); }
      else setError(data.message || 'Failed to send OTP');
    } catch (e: any) { setError('Network error'); }
    finally { setLoading(false); }
  };

  // Step 2: Verify OTP
  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-reset-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }) });
      const data = await res.json();
      if (data.success && data.resetToken) { setResetToken(data.resetToken); setStep('password'); }
      else setError(data.message || 'Invalid OTP');
    } catch (e: any) { setError('Network error'); }
    finally { setLoading(false); }
  };

  // Step 3: Reset Password
  const resetPassword = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), resetToken, password }) });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success ✅', 'Password changed successfully. You can now login.', [{ text: 'Login', onPress: () => navigation.navigate('Login') }]);
      } else setError(data.message || 'Failed to reset password');
    } catch (e: any) { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp]; newOtp[index] = text; setOtp(newOtp); setError('');
    if (text && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKey = (e: any, index: number) => { if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus(); };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => step === 'email' ? navigation.goBack() : setStep(step === 'password' ? 'otp' : 'email')}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={s.iconWrap}><Ionicons name={step === 'email' ? 'key-outline' : step === 'otp' ? 'shield-checkmark-outline' : 'lock-closed-outline'} size={32} color="#F97316" /></View>
        <Text style={s.title}>{step === 'email' ? 'Forgot Password' : step === 'otp' ? 'Verify OTP' : 'New Password'}</Text>
        <Text style={s.subtitle}>{step === 'email' ? 'Enter your registered email to receive a reset code.' : step === 'otp' ? `Enter the 6-digit code sent to ${email}` : 'Create a new password for your account.'}</Text>

        {/* Step 1: Email */}
        {step === 'email' && (
          <>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.3)" />
              <TextInput style={s.input} value={email} onChangeText={(t) => { setEmail(t); setError(''); }} placeholder="Email address" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="email-address" autoCapitalize="none" autoFocus />
            </View>
            <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={sendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <>
            <View style={s.otpRow}>
              {otp.map((d, i) => (
                <TextInput key={i} ref={r => otpRefs.current[i] = r} style={[s.otpBox, d && s.otpFilled]} value={d} onChangeText={t => handleOtpChange(t.replace(/[^0-9]/g, ''), i)} onKeyPress={e => handleOtpKey(e, i)} keyboardType="number-pad" maxLength={1} autoFocus={i === 0} />
              ))}
            </View>
            <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={verifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>Verify Code</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={countdown > 0 ? undefined : sendOtp} style={s.resendBtn}>
              <Text style={s.resendText}>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.3)" />
              <TextInput style={s.input} value={password} onChangeText={(t) => { setPassword(t); setError(''); }} placeholder="New password (min 8 chars)" placeholderTextColor="rgba(255,255,255,0.2)" secureTextEntry={!showPass} />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}><Ionicons name={showPass ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.3)" /></TouchableOpacity>
            </View>
            <View style={[s.inputRow, { marginTop: 12 }]}>
              <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.3)" />
              <TextInput style={s.input} value={confirmPassword} onChangeText={(t) => { setConfirmPassword(t); setError(''); }} placeholder="Confirm password" placeholderTextColor="rgba(255,255,255,0.2)" secureTextEntry={!showPass} />
            </View>
            <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={resetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.loginLink}>
          <Text style={s.loginText}>← Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 44, left: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 19 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, fontSize: 15, color: '#fff' },
  btn: { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  otpBox: { width: 44, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#fff' },
  otpFilled: { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.06)' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 13, color: '#F97316', fontWeight: '600' },
  error: { fontSize: 12, color: '#EF4444', textAlign: 'center', marginTop: 12 },
  loginLink: { alignItems: 'center', marginTop: 24 },
  loginText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
});
