import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, ActivityIndicator, StatusBar, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function RegisterScreen({ navigation }: any) {
  const { register: authRegister } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'creator'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('Select Service');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [showCatPicker, setShowCatPicker] = useState(false);

  useEffect(() => { if (role === 'creator') loadCategories(); }, [role]);

  const loadCategories = async () => {
    try { const res = await api.get('/discover/categories'); setCategories(res.data?.data || []); } catch {}
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (role === 'creator' && !selectedCategorySlug) e.category = 'Select your service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setErrors({});
    const result = await authRegister(name.trim(), email.trim().toLowerCase(), password, role, role === 'creator' ? { categorySlug: selectedCategorySlug, categoryGroup: selectedGroup, category: selectedCategorySlug } : undefined);
    setLoading(false);
    if (result.success) return;
    if (result.requiresVerification) { navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() }); }
    else { setErrors({ general: result.message || 'Registration failed. Try again.' }); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>

        {/* Header */}
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Join BookMyShot — India's Premium Wedding Marketplace</Text>

        {/* Role Selector */}
        <View style={s.roleRow}>
          <TouchableOpacity style={[s.roleBtn, role === 'user' && s.roleBtnActive]} onPress={() => { setRole('user'); Haptics.selectionAsync(); }}>
            <Ionicons name="heart" size={16} color={role === 'user' ? '#6C3BFF' : '#9CA3AF'} />
            <Text style={[s.roleText, role === 'user' && s.roleTextActive]}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.roleBtn, role === 'creator' && s.roleBtnActive]} onPress={() => { setRole('creator'); Haptics.selectionAsync(); }}>
            <Ionicons name="camera" size={16} color={role === 'creator' ? '#6C3BFF' : '#9CA3AF'} />
            <Text style={[s.roleText, role === 'creator' && s.roleTextActive]}>Creator / Vendor</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {errors.general && (
          <View style={s.errorBanner}><Ionicons name="alert-circle" size={16} color="#EF4444" /><Text style={s.errorBannerText}>{errors.general}</Text></View>
        )}

        {/* Category for creators */}
        {role === 'creator' && (
          <View style={s.fieldWrap}>
            <Text style={s.label}>Service Category *</Text>
            <TouchableOpacity style={[s.inputRow, errors.category && s.inputError]} onPress={() => setShowCatPicker(true)}>
              <Ionicons name="briefcase-outline" size={18} color="#9CA3AF" />
              <Text style={[s.input, { color: selectedCategorySlug ? '#1F2937' : '#D1D5DB' }]}>{selectedCategoryName}</Text>
              <Ionicons name="chevron-down" size={16} color="#6C3BFF" />
            </TouchableOpacity>
            {errors.category && <Text style={s.fieldError}>{errors.category}</Text>}
          </View>
        )}

        {/* Form Fields */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Full Name</Text>
          <View style={[s.inputRow, errors.name && s.inputError]}>
            <Ionicons name="person-outline" size={18} color="#9CA3AF" />
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#D1D5DB" autoCapitalize="words" />
          </View>
          {errors.name && <Text style={s.fieldError}>{errors.name}</Text>}
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Email</Text>
          <View style={[s.inputRow, errors.email && s.inputError]}>
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#D1D5DB" keyboardType="email-address" autoCapitalize="none" />
          </View>
          {errors.email && <Text style={s.fieldError}>{errors.email}</Text>}
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Password</Text>
          <View style={[s.inputRow, errors.password && s.inputError]}>
            <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
            <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor="#D1D5DB" secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" /></TouchableOpacity>
          </View>
          {errors.password && <Text style={s.fieldError}>{errors.password}</Text>}
        </View>

        {/* Register Button */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleRegister} disabled={loading} style={{ marginTop: 20 }}>
          <LinearGradient colors={['#6C3BFF', '#8B5CF6', '#FF4FA3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.registerBtnGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="person-add-outline" size={18} color="#fff" /><Text style={s.registerBtnText}>Create Account</Text></>}
          </LinearGradient>
        </TouchableOpacity>

        {/* Login link */}
        <View style={s.loginRow}>
          <Text style={s.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={s.loginLink}>Sign In</Text></TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={s.terms}>By creating an account, you agree to our <Text style={s.termsLink}>Terms of Service</Text> and <Text style={s.termsLink}>Privacy Policy</Text></Text>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal visible={showCatPicker} transparent animationType="slide">
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setShowCatPicker(false)}>
          <View style={s.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetBar} />
            <Text style={s.sheetTitle}>Select Your Service</Text>
            <FlatList data={categories} keyExtractor={item => item.slug || item._id} renderItem={({ item }) => (
              <TouchableOpacity style={[s.catItem, selectedCategorySlug === item.slug && s.catItemActive]} onPress={() => { setSelectedCategorySlug(item.slug); setSelectedCategoryName(item.name); setSelectedGroup(item.group || ''); setShowCatPicker(false); }}>
                <Ionicons name={item.icon || 'camera'} size={18} color={selectedCategorySlug === item.slug ? '#6C3BFF' : '#6B7280'} />
                <Text style={[s.catItemText, selectedCategorySlug === item.slug && { color: '#6C3BFF', fontWeight: '700' }]}>{item.name}</Text>
                {selectedCategorySlug === item.slug && <Ionicons name="checkmark-circle" size={18} color="#6C3BFF" />}
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginTop: Platform.OS === 'ios' ? 56 : 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginTop: 24, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  // Role selector
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  roleBtnActive: { borderColor: '#6C3BFF', backgroundColor: '#F3E8FF' },
  roleText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  roleTextActive: { color: '#6C3BFF' },
  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorBannerText: { fontSize: 12, color: '#DC2626', flex: 1 },
  // Fields
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 50, gap: 10 },
  inputError: { borderColor: '#EF4444' },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  // Register button
  registerBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  registerBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Login
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  loginText: { fontSize: 13, color: '#6B7280' },
  loginLink: { fontSize: 13, fontWeight: '700', color: '#6C3BFF' },
  // Terms
  terms: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 16, lineHeight: 15 },
  termsLink: { color: '#6C3BFF', fontWeight: '500' },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  sheetBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  catItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  catItemActive: { backgroundColor: '#F8F6FF', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 },
  catItemText: { fontSize: 13, color: '#4B5563', flex: 1 },
});
