import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import PremiumModal from '../components/PremiumModal';
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
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  // Category selection for creators
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('wedding-photographer');
  const [selectedCategoryName, setSelectedCategoryName] = useState('Wedding Photographer');
  const [selectedGroup, setSelectedGroup] = useState('Photography & Video');
  const [categories, setCategories] = useState<any[]>([]);
  const [groupedCats, setGroupedCats] = useState<Record<string, any[]>>({});
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [catsLoading, setCatsLoading] = useState(false);

  useEffect(() => {
    if (role === 'creator') loadCategories();
  }, [role]);

  const loadCategories = async () => {
    setCatsLoading(true);
    try {
      const res = await api.get('/discover/categories');
      const cats = res.data?.data || [];
      setCategories(cats);
      // Group by group field
      const groups: Record<string, any[]> = {};
      for (const cat of cats) {
        const g = cat.group || 'Other';
        if (!groups[g]) groups[g] = [];
        groups[g].push(cat);
      }
      setGroupedCats(groups);
    } catch {} finally { setCatsLoading(false); }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (role === 'creator' && !selectedCategorySlug) e.category = 'Please select your service category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await authRegister(
      name.trim(),
      email.trim().toLowerCase(),
      password,
      role,
      role === 'creator' ? { categorySlug: selectedCategorySlug, categoryGroup: selectedGroup, category: selectedCategorySlug } : undefined
    );
    setLoading(false);
    if (result.success) return;
    if (result.requiresVerification) {
      navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
    } else {
      setErrorModal({ visible: true, title: 'Registration Failed', message: result.message || 'Something went wrong. Please try again.' });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join BookMyShot — India's Wedding Marketplace</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          <TouchableOpacity style={[styles.roleBtn, role === 'user' && styles.roleBtnActive]} onPress={() => { setRole('user'); Haptics.selectionAsync(); }}>
            <Ionicons name="heart-outline" size={18} color={role === 'user' ? colors.primary : colors.textMuted} />
            <Text style={[styles.roleLabel, role === 'user' && styles.roleLabelActive]}>I'm a Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleBtn, role === 'creator' && styles.roleBtnActive]} onPress={() => { setRole('creator'); Haptics.selectionAsync(); }}>
            <Ionicons name="camera-outline" size={18} color={role === 'creator' ? colors.primary : colors.textMuted} />
            <Text style={[styles.roleLabel, role === 'creator' && styles.roleLabelActive]}>I'm a Vendor</Text>
          </TouchableOpacity>
        </View>

        {/* Category picker for creators */}
        {role === 'creator' && (
          <View style={styles.catSection}>
            <Text style={styles.catLabel}>Select Your Service *</Text>
            <TouchableOpacity style={[styles.catPicker, errors.category ? { borderColor: colors.error } : {}]} onPress={() => setShowCatPicker(true)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catPickerGroup}>{selectedGroup}</Text>
                <Text style={styles.catPickerName}>{selectedCategoryName}</Text>
              </View>
              {catsLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-down" size={16} color={colors.primary} />}
            </TouchableOpacity>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>
        )}

        <View style={styles.form}>
          <Input label="Full Name" icon="person-outline" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" error={errors.name} />
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry={!showPassword} rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'} onRightIconPress={() => setShowPassword(!showPassword)} error={errors.password} />
          <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" style={styles.registerBtn} />
        </View>

        <Text style={styles.terms}>By creating an account, you agree to our <Text style={styles.termsLink}>Terms</Text> and <Text style={styles.termsLink}>Privacy Policy</Text></Text>
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.loginLink}>Sign In</Text></TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal visible={showCatPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Service</Text>
            <TouchableOpacity onPress={() => setShowCatPicker(false)}><Ionicons name="close" size={22} color={colors.text} /></TouchableOpacity>
          </View>
          <FlatList
            data={Object.entries(groupedCats)}
            keyExtractor={([g]) => g}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            renderItem={({ item: [group, cats] }) => (
              <View>
                <Text style={styles.groupHeader}>{group}</Text>
                {cats.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.slug}
                    style={[styles.catItem, selectedCategorySlug === cat.slug && styles.catItemActive]}
                    onPress={() => {
                      setSelectedCategorySlug(cat.slug);
                      setSelectedCategoryName(cat.name);
                      setSelectedGroup(cat.group || group);
                      setShowCatPicker(false);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={(cat.icon as any) || 'storefront-outline'} size={16} color={selectedCategorySlug === cat.slug ? colors.primary : colors.textMuted} />
                    <Text style={[styles.catItemText, selectedCategorySlug === cat.slug && { color: colors.primary, fontWeight: '700' }]}>{cat.name}</Text>
                    {selectedCategorySlug === cat.slug && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>
      </Modal>

      <PremiumModal visible={errorModal.visible} onClose={() => setErrorModal({ ...errorModal, visible: false })} type="error" title={errorModal.title} message={errorModal.message} buttons={[{ text: 'Try Again', onPress: () => setErrorModal({ ...errorModal, visible: false }), variant: 'primary' }]} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: spacing['5xl'], marginBottom: spacing['2xl'], borderWidth: 1, borderColor: colors.border },
  title: { ...typography.displaySm, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, marginBottom: spacing['3xl'] },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing['2xl'] },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md + 2, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  roleLabel: { ...typography.labelMd, color: colors.textMuted },
  roleLabelActive: { color: colors.primary },
  catSection: { marginBottom: spacing['2xl'] },
  catLabel: { ...typography.labelSm, color: colors.textMuted, marginBottom: spacing.sm },
  catPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  catPickerGroup: { ...typography.caption, color: colors.primary, marginBottom: 2 },
  catPickerName: { ...typography.headlineSm, color: colors.text },
  errorText: { ...typography.caption, color: colors.error, marginTop: 4 },
  form: {},
  registerBtn: { marginTop: spacing.md },
  terms: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing['2xl'], lineHeight: 18 },
  termsLink: { color: colors.primary },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing['2xl'] },
  loginText: { ...typography.bodyMd, color: colors.textSecondary },
  loginLink: { ...typography.labelLg, color: colors.primary },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl, paddingTop: spacing['3xl'], borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { ...typography.headlineLg, color: colors.text },
  groupHeader: { ...typography.labelSm, color: colors.primary, backgroundColor: 'rgba(255,140,43,0.06)', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, marginTop: spacing.md, letterSpacing: 1 },
  catItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  catItemActive: { backgroundColor: 'rgba(255,140,43,0.06)' },
  catItemText: { ...typography.bodyMd, color: colors.text, flex: 1 },
});
