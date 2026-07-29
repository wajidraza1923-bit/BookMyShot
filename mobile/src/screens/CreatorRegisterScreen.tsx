/**
 * CreatorRegisterScreen — Multi-step creator registration
 * Step 1: Basic Info (Name, Studio, Category, Experience) 
 * Step 2: Location (State, District, City, Service Radius, Service Areas)
 * Only Step 2 (Location) is required. Rest is optional for initial submission.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EXPERIENCE_OPTIONS = ['Fresher', '1–2 Years', '3–5 Years', '5–10 Years', '10+ Years'];
const BUSINESS_TYPES = ['Freelancer', 'Studio', 'Agency'];
const TEAM_SIZES = ['Solo', '2–5 Members', '6–10 Members', '10+ Members'];
const PRICE_RANGES = ['₹10k–25k', '₹25k–50k', '₹50k–1L', '₹1L+'];
const SERVICE_RADIUS = ['My City', 'My District', 'My State', 'Multi-State', 'Pan India'];
const EQUIPMENT_LEVELS = ['Basic', 'Professional', 'Premium'];
const DELIVERY_TIMES = ['3 Days', '7 Days', '15 Days', '30 Days'];

const CATEGORIES = [
  { slug: 'photography-videography', name: 'Photography & Videography', icon: 'camera-outline' },
  { slug: 'makeup-artists', name: 'Beauty & Makeup', icon: 'color-palette-outline' },
  { slug: 'decoration-floral', name: 'Decoration & Floral', icon: 'flower-outline' },
  { slug: 'catering-services', name: 'Catering', icon: 'restaurant-outline' },
  { slug: 'djs-entertainment', name: 'DJs & Entertainment', icon: 'musical-notes-outline' },
  { slug: 'venues', name: 'Venues', icon: 'business-outline' },
  { slug: 'wedding-planners', name: 'Wedding Planners', icon: 'clipboard-outline' },
];

export default function CreatorRegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [experience, setExperience] = useState('');

  // Step 2 - Location (REQUIRED)
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [serviceRadius, setServiceRadius] = useState('My District');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  // Picker states
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => { loadStates(); }, []);

  const loadStates = async () => { try { const r = await api.get('/discovery/states'); setStates(r.data?.states || []); } catch {} };
  const loadDistricts = async (s: string) => { try { const r = await api.get('/discovery/districts', { params: { state: s } }); setDistricts(r.data?.districts || []); } catch {} };
  const loadCities = async (d: string) => { try { const r = await api.get('/discovery/cities', { params: { district: d, state: selectedState } }); setCities(r.data?.cities || []); } catch {} };

  const validateStep1 = () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter your full name'); return false; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Required', 'Enter a valid email'); return false; }
    if (!password || password.length < 6) { Alert.alert('Required', 'Password must be 6+ characters'); return false; }
    if (!selectedCategory) { Alert.alert('Required', 'Select your service category'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!selectedState) { Alert.alert('Required', 'Select your state'); return false; }
    if (!selectedDistrict) { Alert.alert('Required', 'Select your district'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim().toLowerCase(), password, 'creator', {
        categorySlug: selectedCategory,
        subcategorySlug: selectedSubcategory || selectedCategory,
        categoryGroup: selectedCategoryName,
        studioName,
        state: selectedState,
        district: selectedDistrict,
        city: selectedCity || selectedDistrict,
        baseCity: selectedCity || selectedDistrict,
        serviceAreas: serviceAreas.length > 0 ? serviceAreas : [selectedCity || selectedDistrict],
        travelPreference: serviceRadius === 'Pan India' ? 'pan_india' : serviceRadius === 'My State' ? 'entire_state' : serviceRadius === 'My District' ? 'my_district' : serviceRadius === 'My City' ? 'only_my_city' : 'my_district',
        experience,
        phone,
      });
      setLoading(false);
      if (result.success) {
        Alert.alert('🎉 Registration Submitted!', 'Your profile has been sent for admin verification. You will be notified once approved.');
      } else if (result.requiresVerification) {
        navigation.navigate('OTPVerification', { email: result.email || email });
      } else {
        Alert.alert('Error', result.message || 'Registration failed');
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Something went wrong');
    }
  };

  // ═══ RENDER ═══
  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Creator Registration</Text>
        <Text style={st.stepIndicator}>Step {step}/2</Text>
      </View>

      {/* Progress */}
      <View style={st.progressBar}>
        <View style={[st.progressFill, { width: `${step * 50}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {step === 1 ? (
          <>
            <Text style={st.secTitle}>👤 Basic Information</Text>

            <Field label="Full Name *" value={name} onChange={setName} placeholder="Your full name" icon="person-outline" />
            <Field label="Studio / Brand Name" value={studioName} onChange={setStudioName} placeholder="Optional" icon="business-outline" />
            <Field label="Email *" value={email} onChange={setEmail} placeholder="you@email.com" icon="mail-outline" keyboard="email-address" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="Mobile number" icon="call-outline" keyboard="phone-pad" />
            <Field label="Password *" value={password} onChange={setPassword} placeholder="Min 6 characters" icon="lock-closed-outline" secure />

            {/* Category */}
            <Text style={st.label}>Service Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.slug} style={[st.chip, selectedCategory === c.slug && st.chipActive]} onPress={() => { setSelectedCategory(c.slug); setSelectedCategoryName(c.name); }}>
                  <Ionicons name={c.icon as any} size={14} color={selectedCategory === c.slug ? '#fff' : '#6B7280'} />
                  <Text style={[st.chipText, selectedCategory === c.slug && st.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Experience */}
            <Text style={st.label}>Experience</Text>
            <View style={st.optionRow}>
              {EXPERIENCE_OPTIONS.map(e => (
                <TouchableOpacity key={e} style={[st.optionChip, experience === e && st.optionChipActive]} onPress={() => setExperience(e)}>
                  <Text style={[st.optionText, experience === e && st.optionTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={st.nextBtn} onPress={() => { if (validateStep1()) setStep(2); }}>
              <Text style={st.nextBtnText}>Next → Location</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={st.secTitle}>📍 Location (Required)</Text>

            {/* State */}
            <Text style={st.label}>State *</Text>
            <TouchableOpacity style={st.selector} onPress={() => setShowStatePicker(true)}>
              <Text style={selectedState ? st.selectorText : st.selectorPlaceholder}>{selectedState || 'Select State'}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* District */}
            <Text style={st.label}>District *</Text>
            <TouchableOpacity style={st.selector} onPress={() => { if (selectedState) setShowDistrictPicker(true); else Alert.alert('', 'Select state first'); }}>
              <Text style={selectedDistrict ? st.selectorText : st.selectorPlaceholder}>{selectedDistrict || 'Select District'}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* City */}
            <Text style={st.label}>City / Town</Text>
            <TouchableOpacity style={st.selector} onPress={() => { if (selectedDistrict) { setShowCityPicker(true); loadCities(selectedDistrict); } else Alert.alert('', 'Select district first'); }}>
              <Text style={selectedCity ? st.selectorText : st.selectorPlaceholder}>{selectedCity || 'Select City (Optional)'}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Service Radius */}
            <Text style={st.label}>Service Radius</Text>
            <View style={st.optionRow}>
              {SERVICE_RADIUS.map(r => (
                <TouchableOpacity key={r} style={[st.optionChip, serviceRadius === r && st.optionChipActive]} onPress={() => setServiceRadius(r)}>
                  <Text style={[st.optionText, serviceRadius === r && st.optionTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity style={st.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={st.submitBtnText}>Submit for Verification</Text></>
              )}
            </TouchableOpacity>

            <Text style={st.note}>Your profile will be reviewed by our team. You'll be notified once approved.</Text>
          </>
        )}
      </ScrollView>

      {/* Pickers */}
      <PickerModal visible={showStatePicker} title="Select State" data={states} onSelect={(s) => { setSelectedState(s); setSelectedDistrict(''); setSelectedCity(''); setShowStatePicker(false); loadDistricts(s); }} onClose={() => setShowStatePicker(false)} />
      <PickerModal visible={showDistrictPicker} title="Select District" data={districts} onSelect={(d) => { setSelectedDistrict(d); setSelectedCity(''); setShowDistrictPicker(false); }} onClose={() => setShowDistrictPicker(false)} />
      <PickerModal visible={showCityPicker} title="Select City" data={cities} onSelect={(c) => { setSelectedCity(c); setShowCityPicker(false); }} onClose={() => setShowCityPicker(false)} />
    </View>
  );
}

function Field({ label, value, onChange, placeholder, icon, keyboard, secure }: any) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.label}>{label}</Text>
      <View style={st.fieldRow}>
        <Ionicons name={icon} size={16} color="#7C3AED" />
        <TextInput style={st.fieldInput} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9CA3AF" keyboardType={keyboard} secureTextEntry={secure} />
      </View>
    </View>
  );
}

function PickerModal({ visible, title, data, onSelect, onClose }: any) {
  const [search, setSearch] = useState('');
  const filtered = data.filter((d: string) => !search || d.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>{title}</Text>
          <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 12, fontSize: 13 }} placeholder="Search..." value={search} onChangeText={setSearch} />
          <FlatList data={filtered} keyExtractor={(i) => i} renderItem={({ item }) => (
            <TouchableOpacity style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => { onSelect(item); setSearch(''); }}>
              <Text style={{ fontSize: 14, color: '#1F2937' }}>{item}</Text>
            </TouchableOpacity>
          )} />
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 14 }} onPress={() => { onClose(); setSearch(''); }}><Text style={{ color: '#9CA3AF' }}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1F2937' },
  stepIndicator: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  progressBar: { height: 3, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  progressFill: { height: 3, backgroundColor: '#7C3AED', borderRadius: 2 },
  scroll: { padding: 20, paddingBottom: 40 },
  secTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  // Fields
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  fieldInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  // Selector
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, height: 46, marginBottom: 14 },
  selectorText: { fontSize: 14, color: '#1F2937' },
  selectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  // Chips
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FFFFFF' },
  // Options
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  optionChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  optionText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  optionTextActive: { color: '#FFFFFF' },
  // Buttons
  nextBtn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, marginTop: 16, elevation: 3, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  note: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
