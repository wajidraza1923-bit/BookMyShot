import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

export default function VerifyEmailScreen({ route, navigation }: any) {
  const { setAuthDirect } = useAuth();
  const email = route?.params?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) { setError('Please enter 6-digit OTP'); return; }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const text = await response.text();
      console.log('[VerifyOTP] Status:', response.status, 'Body:', text.substring(0, 300));

      let data: any;
      try { data = JSON.parse(text); } catch { setError('Server error. Try again.'); setLoading(false); return; }

      if (!response.ok || !data.success) {
        setError(data.message || 'Verification failed');
        setLoading(false);
        return;
      }

      // Success - save token and login
      if (data.token) {
        await AsyncStorage.setItem('bms_token', data.token);
        const user = data.user || { email, role: 'user' };
        await AsyncStorage.setItem('bms_user', JSON.stringify(user));
        setAuthDirect(data.token, user);
      } else {
        // Token wasn't returned - show success and go to login
        Alert.alert('Verified!', 'Email verified successfully. Please login.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const response = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const text = await response.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = {}; }
      if (data.success) {
        setCountdown(60);
        setError('');
        Alert.alert('OTP Sent', 'A new verification code has been sent to your email.');
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (e: any) {
      setError('Network error');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={s.content}>
        <View style={s.iconWrap}><Ionicons name="mail-open-outline" size={32} color="#FF8C2B" /></View>
        <Text style={s.title}>Verify Your Email</Text>
        <Text style={s.subtitle}>We've sent a 6-digit code to</Text>
        <Text style={s.email}>{email}</Text>

        {/* OTP Input */}
        <View style={s.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => inputs.current[i] = ref}
              style={[s.otpBox, digit ? s.otpBoxFilled : null, error ? s.otpBoxError : null]}
              value={digit}
              onChangeText={t => handleChange(t.replace(/[^0-9]/g, ''), i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectionColor="#FF8C2B"
              autoFocus={i === 0}
            />
          ))}
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* Verify Button */}
        <TouchableOpacity style={[s.verifyBtn, loading && s.verifyBtnDisabled]} onPress={verifyOtp} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={s.verifyBtnText}>Verify Email</Text>}
        </TouchableOpacity>

        {/* Resend */}
        <View style={s.resendRow}>
          <Text style={s.resendLabel}>Didn't receive the code?</Text>
          {countdown > 0 ? (
            <Text style={s.countdownText}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={resendOtp} disabled={resending}>
              <Text style={s.resendBtn}>{resending ? 'Sending...' : 'Resend OTP'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 44, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,140,43,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  email: { fontSize: 14, fontWeight: '600', color: '#FFB347', marginTop: 4, marginBottom: 32 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpBox: { width: 44, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#fff' },
  otpBoxFilled: { borderColor: '#FF8C2B', backgroundColor: 'rgba(255,140,43,0.06)' },
  otpBoxError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginBottom: 12 },
  verifyBtn: { width: '100%', backgroundColor: '#FF8C2B', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  resendRow: { alignItems: 'center', marginTop: 24 },
  resendLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  countdownText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  resendBtn: { fontSize: 13, fontWeight: '600', color: '#FF8C2B', marginTop: 4 },
});
