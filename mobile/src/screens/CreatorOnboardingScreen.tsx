/**
 * CreatorOnboardingScreen — Multi-step detailed onboarding after first login
 * Collects: Basic Info (phone mandatory), Location, Business Details, About
 * After submission → premium success modal → pending admin verification
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, Modal, FlatList, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EXPERIENCE_OPTIONS = ['Fresher', '1–2 Years', '3–5 Years', '5–10 Years', '10+ Years'];
const BUSINESS_TYPES = ['Freelancer', 'Studio', 'Agency'];
const TEAM_SIZES = ['Solo', '2–5 Members', '6–10 Members', '10+ Members'];
const PRICE_RANGES = ['₹10k–25k', '₹25k–50k', '₹50k–1L', '₹1L+'];
const SERVICE_RADIUS = ['My City', 'My District', 'My State', 'Multi-State', 'Pan India'];
const EQUIPMENT_LEVELS = ['Basic', 'Professional', 'Premium'];
const DELIVERY_TIMES = ['3 Days', '7 Days', '15 Days', '30 Days'];
const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Urdu', 'Kashmiri', 'Dogri', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Odia'];
const TOTAL_STEPS = 5;

// Category options — slug must match Category collection slugs in DB
const CATEGORIES = [
  { slug: 'photography-videography', label: 'Photography & Videography', emoji: '📷', desc: 'Wedding, candid, pre-wedding, cinematic videos' },
  { slug: 'makeup-artists', label: 'Makeup Artist', emoji: '💄', desc: 'Bridal makeup, hair styling, mehndi' },
  { slug: 'decoration-floral', label: 'Decoration & Floral', emoji: '🌸', desc: 'Mandap, stage, floral, lighting' },
  { slug: 'catering-services', label: 'Catering Services', emoji: '🍽️', desc: 'Veg, non-veg, multi-cuisine, bakers' },
  { slug: 'venues', label: 'Venues', emoji: '🏛️', desc: 'Banquet halls, hotels, farm houses' },
  { slug: 'djs-entertainment', label: 'DJ & Entertainment', emoji: '🎧', desc: 'DJs, live bands, singers, anchors' },
  { slug: 'wedding-planners', label: 'Wedding Planner', emoji: '💍', desc: 'Full planning, coordination, budgeting' },
  { slug: 'mehndi-artist', label: 'Mehndi Artist', emoji: '🤲', desc: 'Bridal mehndi, traditional designs' },
];

export default function CreatorOnboardingScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const scaleAnim = useState(new Animated.Value(0))[0];
  const [supportInfo, setSupportInfo] = useState({ email: 'bookmyshott@gmail.com', phone: '8492922173' });

  // Step 1 - Basic Info
  const [studioName, setStudioName] = useState('');
  const [experience, setExperience] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2 - Category (NEW — required)
  const [selectedCategory, setSelectedCategory] = useState('');

  // Step 2 - Location (REQUIRED)
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [serviceRadius, setServiceRadius] = useState('My District');

  // Step 3 - Business Details
  const [businessType, setBusinessType] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [equipmentLevel, setEquipmentLevel] = useState('');
  const [editingIncluded, setEditingIncluded] = useState(true);
  const [droneAvailable, setDroneAvailable] = useState(false);
  const [liveStreaming, setLiveStreaming] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('7 Days');
  const [languages, setLanguages] = useState<string[]>(['Hindi']);
  const [destinationWeddings, setDestinationWeddings] = useState(false);

  // Step 4 - About
  const [bio, setBio] = useState('');

  // Picker states
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => { loadStates(); }, []);
  useEffect(() => { api.get('/master-settings').then(r => { const d = r.data?.data; if (d) setSupportInfo({ email: d.supportEmail || 'bookmyshott@gmail.com', phone: d.supportPhone || '8492922173' }); }).catch(() => {}); }, []);

  const loadStates = async () => { try { const r = await api.get('/discovery/states'); setStates(r.data?.states || []); } catch {} };
  const loadDistricts = async (s: string) => { try { const r = await api.get('/discovery/districts', { params: { state: s } }); setDistricts(r.data?.districts || []); } catch {} };
  const loadCities = async (d: string) => { try { const r = await api.get('/discovery/cities', { params: { district: d, state: selectedState } }); setCities(r.data?.cities || []); } catch {} };
  const toggleLanguage = (lang: string) => { setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]); };

  const isPhoneValid = phone.replace(/\D/g, '').length >= 10;

  const validateStep1 = () => {
    if (!isPhoneValid) { Alert.alert('Required', 'Enter a valid 10-digit phone number'); return false; }
    return true;
  };
  const validateStep2 = () => {
    if (!selectedCategory) { Alert.alert('Required', 'Please select your service category'); return false; }
    return true;
  };
  const validateStep3 = () => {
    if (!selectedState) { Alert.alert('Required', 'Select your state'); return false; }
    if (!selectedDistrict) { Alert.alert('Required', 'Select your district'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep1()) { setStep(1); return; }
    if (!validateStep2()) { setStep(2); return; }
    if (!validateStep3()) { setStep(3); return; }
    setLoading(true);
    try {
      const travelPrefMap: Record<string, string> = { 'Pan India': 'pan_india', 'My State': 'entire_state', 'My District': 'my_district', 'My City': 'only_my_city', 'Multi-State': 'multiple_states' };
      const catObj = CATEGORIES.find(c => c.slug === selectedCategory);
      const payload = {
        name: user?.name || '', phone, studioName, experience,
        // Category — critical for Browse filtering
        categorySlug: selectedCategory,
        category: catObj?.label || selectedCategory,
        specialty: catObj?.label || selectedCategory,
        // Location
        state: selectedState, district: selectedDistrict,
        baseCity: selectedCity || selectedDistrict, city: selectedCity || selectedDistrict,
        serviceAreas: [selectedCity || selectedDistrict, selectedDistrict].filter(Boolean),
        travelPreference: travelPrefMap[serviceRadius] || 'my_district',
        // Business details
        businessType: businessType.toLowerCase(),
        teamSize: teamSize === 'Solo' ? 'solo' : teamSize === '2–5 Members' ? '2-5' : teamSize === '6–10 Members' ? '6-10' : teamSize === '10+ Members' ? '10+' : '',
        priceRange, budgetMin: budgetMin ? parseInt(budgetMin) : 0,
        equipmentLevel: equipmentLevel.toLowerCase(),
        editingIncluded, droneAvailable, liveStreaming, deliveryTime,
        languages, destinationWeddings, bio,
      };
      const res = await api.post('/creators/complete-onboarding', payload);
      if (res.data?.success) {
        await refreshUser();
        setShowSuccessModal(true);
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
      } else {
        Alert.alert('Error', res.data?.message || 'Submission failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : null} style={st.backBtn} disabled={step === 1}>
          <Ionicons name="arrow-back" size={20} color={step > 1 ? '#1F2937' : '#D1D5DB'} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Complete Your Profile</Text>
        <Text style={st.stepIndicator}>{step}/{TOTAL_STEPS}</Text>
      </View>
      <View style={st.progressBar}><View style={[st.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} /></View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2Category()}
        {step === 3 && renderStep3Location()}
        {step === 4 && renderStep4Business()}
        {step === 5 && renderStep5About()}
      </ScrollView>

      <PickerModal visible={showStatePicker} title="Select State" data={states} onSelect={(s) => { setSelectedState(s); setSelectedDistrict(''); setSelectedCity(''); setShowStatePicker(false); loadDistricts(s); }} onClose={() => setShowStatePicker(false)} />
      <PickerModal visible={showDistrictPicker} title="Select District" data={districts} onSelect={(d) => { setSelectedDistrict(d); setSelectedCity(''); setShowDistrictPicker(false); }} onClose={() => setShowDistrictPicker(false)} />
      <PickerModal visible={showCityPicker} title="Select City" data={cities} onSelect={(c) => { setSelectedCity(c); setShowCityPicker(false); }} onClose={() => setShowCityPicker(false)} />

      {/* ═══ SUCCESS MODAL ═══ */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={st.successOverlay}>
          <Animated.View style={[st.successCard, { transform: [{ scale: scaleAnim }] }]}>
            <View style={st.successIcon}><Ionicons name="checkmark-circle" size={56} color="#10B981" /></View>
            <Text style={st.successTitle}>🎉 Profile Submitted Successfully!</Text>
            <Text style={st.successMsg}>Your profile has been submitted for admin verification.{'\n\n'}Our team will review your profile shortly. You'll receive a notification as soon as your account is approved.{'\n\n'}Thank you for joining BookMyShot.</Text>
            <View style={st.successContact}>
              <Text style={st.successContactTitle}>Need Help?</Text>
              <Text style={st.successContactText}>📧 {supportInfo.email}</Text>
              <Text style={st.successContactText}>📞 +91 {supportInfo.phone}</Text>
            </View>
            <TouchableOpacity style={st.successBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={st.successBtnText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );

  // ═══ STEP 1: Basic Info (Phone Mandatory) ═══
  function renderStep1() {
    return (<>
      <Text style={st.secTitle}>👤 Basic Information</Text>
      <Text style={st.secDesc}>Tell us about yourself and your work</Text>
      <Text style={st.label}>Your Name</Text>
      <View style={st.readOnly}><Text style={st.readOnlyText}>{user?.name || 'Creator'}</Text></View>
      <Text style={st.label}>Email</Text>
      <View style={st.readOnly}><Text style={st.readOnlyText}>{user?.email || ''}</Text></View>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Phone Number *</Text>
        <View style={[st.fieldRow, !isPhoneValid && phone.length > 0 && { borderColor: '#EF4444' }]}>
          <Ionicons name="call-outline" size={16} color="#7C3AED" />
          <TextInput style={st.fieldInput} value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" maxLength={10} />
          {isPhoneValid && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
        </View>
        {!isPhoneValid && phone.length > 0 && <Text style={st.fieldError}>Enter valid 10-digit number</Text>}
      </View>

      <Field label="Studio / Brand Name (Optional)" value={studioName} onChange={setStudioName} placeholder="Your studio name" icon="business-outline" />

      <Text style={st.label}>Experience</Text>
      <View style={st.optionRow}>
        {EXPERIENCE_OPTIONS.map(e => (
          <TouchableOpacity key={e} style={[st.optionChip, experience === e && st.optionChipActive]} onPress={() => setExperience(e)}>
            <Text style={[st.optionText, experience === e && st.optionTextActive]}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[st.nextBtn, !isPhoneValid && st.nextBtnDisabled]} onPress={nextStep} disabled={!isPhoneValid}>
        <Text style={st.nextBtnText}>Next → Your Category</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </>);
  }

  // ═══ STEP 2: Category Selection (NEW — required for Browse filtering) ═══
  function renderStep2Category() {
    return (<>
      <Text style={st.secTitle}>🎯 What do you offer?</Text>
      <Text style={st.secDesc}>Select your main service category. This determines where you appear in Browse.</Text>
      {CATEGORIES.map(cat => (
        <TouchableOpacity
          key={cat.slug}
          style={[st.catOption, selectedCategory === cat.slug && st.catOptionActive]}
          onPress={() => setSelectedCategory(cat.slug)}
          activeOpacity={0.8}
        >
          <Text style={st.catEmoji}>{cat.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[st.catLabel, selectedCategory === cat.slug && st.catLabelActive]}>{cat.label}</Text>
            <Text style={st.catDesc}>{cat.desc}</Text>
          </View>
          {selectedCategory === cat.slug && <Ionicons name="checkmark-circle" size={22} color="#6C3BFF" />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[st.nextBtn, !selectedCategory && st.nextBtnDisabled]} onPress={nextStep} disabled={!selectedCategory}>
        <Text style={st.nextBtnText}>Next → Location</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </>);
  }

  // ═══ STEP 3: Location ═══
  function renderStep3Location() {
    return (<>
      <Text style={st.secTitle}>📍 Location (Required)</Text>
      <Text style={st.secDesc}>Where do you operate? This helps customers find you.</Text>
      <Text style={st.label}>State *</Text>
      <TouchableOpacity style={st.selector} onPress={() => setShowStatePicker(true)}>
        <Text style={selectedState ? st.selectorText : st.selectorPlaceholder}>{selectedState || 'Select State'}</Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>
      <Text style={st.label}>District *</Text>
      <TouchableOpacity style={st.selector} onPress={() => { if (selectedState) setShowDistrictPicker(true); else Alert.alert('', 'Select state first'); }}>
        <Text style={selectedDistrict ? st.selectorText : st.selectorPlaceholder}>{selectedDistrict || 'Select District'}</Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>
      <Text style={st.label}>City / Town</Text>
      <TouchableOpacity style={st.selector} onPress={() => { if (selectedDistrict) { setShowCityPicker(true); loadCities(selectedDistrict); } else Alert.alert('', 'Select district first'); }}>
        <Text style={selectedCity ? st.selectorText : st.selectorPlaceholder}>{selectedCity || 'Select City (Optional)'}</Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>
      <Text style={st.label}>Service Radius</Text>
      <View style={st.optionRow}>
        {SERVICE_RADIUS.map(r => (<TouchableOpacity key={r} style={[st.optionChip, serviceRadius === r && st.optionChipActive]} onPress={() => setServiceRadius(r)}><Text style={[st.optionText, serviceRadius === r && st.optionTextActive]}>{r}</Text></TouchableOpacity>))}
      </View>
      <TouchableOpacity style={st.nextBtn} onPress={nextStep}><Text style={st.nextBtnText}>Next → Business Details</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></TouchableOpacity>
    </>);
  }

  // ═══ STEP 4: Business Details ═══
  function renderStep4Business() {
    return (<>
      <Text style={st.secTitle}>💼 Business Details</Text>
      <Text style={st.secDesc}>Help us understand your work setup</Text>
      <Text style={st.label}>Business Type</Text>
      <View style={st.optionRow}>{BUSINESS_TYPES.map(b => (<TouchableOpacity key={b} style={[st.optionChip, businessType === b && st.optionChipActive]} onPress={() => setBusinessType(b)}><Text style={[st.optionText, businessType === b && st.optionTextActive]}>{b}</Text></TouchableOpacity>))}</View>
      <Text style={st.label}>Team Size</Text>
      <View style={st.optionRow}>{TEAM_SIZES.map(t => (<TouchableOpacity key={t} style={[st.optionChip, teamSize === t && st.optionChipActive]} onPress={() => setTeamSize(t)}><Text style={[st.optionText, teamSize === t && st.optionTextActive]}>{t}</Text></TouchableOpacity>))}</View>
      <Text style={st.label}>Starting Price</Text>
      <View style={st.fieldRow}><Ionicons name="cash-outline" size={16} color="#7C3AED" /><TextInput style={st.fieldInput} value={budgetMin} onChangeText={setBudgetMin} placeholder="e.g. 15000" placeholderTextColor="#9CA3AF" keyboardType="number-pad" /></View>
      <Text style={st.label}>Price Range</Text>
      <View style={st.optionRow}>{PRICE_RANGES.map(p => (<TouchableOpacity key={p} style={[st.optionChip, priceRange === p && st.optionChipActive]} onPress={() => setPriceRange(p)}><Text style={[st.optionText, priceRange === p && st.optionTextActive]}>{p}</Text></TouchableOpacity>))}</View>
      <Text style={st.label}>Equipment Level</Text>
      <View style={st.optionRow}>{EQUIPMENT_LEVELS.map(e => (<TouchableOpacity key={e} style={[st.optionChip, equipmentLevel === e && st.optionChipActive]} onPress={() => setEquipmentLevel(e)}><Text style={[st.optionText, equipmentLevel === e && st.optionTextActive]}>{e}</Text></TouchableOpacity>))}</View>
      <Text style={st.label}>Delivery Time</Text>
      <View style={st.optionRow}>{DELIVERY_TIMES.map(d => (<TouchableOpacity key={d} style={[st.optionChip, deliveryTime === d && st.optionChipActive]} onPress={() => setDeliveryTime(d)}><Text style={[st.optionText, deliveryTime === d && st.optionTextActive]}>{d}</Text></TouchableOpacity>))}</View>
      <View style={st.toggleRow}><Text style={st.toggleLabel}>Editing Included</Text><TouchableOpacity style={[st.toggle, editingIncluded && st.toggleActive]} onPress={() => setEditingIncluded(!editingIncluded)}><Text style={[st.toggleText, editingIncluded && st.toggleTextActive]}>{editingIncluded ? 'Yes' : 'No'}</Text></TouchableOpacity></View>
      <View style={st.toggleRow}><Text style={st.toggleLabel}>Drone Available</Text><TouchableOpacity style={[st.toggle, droneAvailable && st.toggleActive]} onPress={() => setDroneAvailable(!droneAvailable)}><Text style={[st.toggleText, droneAvailable && st.toggleTextActive]}>{droneAvailable ? 'Yes' : 'No'}</Text></TouchableOpacity></View>
      <View style={st.toggleRow}><Text style={st.toggleLabel}>Live Streaming</Text><TouchableOpacity style={[st.toggle, liveStreaming && st.toggleActive]} onPress={() => setLiveStreaming(!liveStreaming)}><Text style={[st.toggleText, liveStreaming && st.toggleTextActive]}>{liveStreaming ? 'Yes' : 'No'}</Text></TouchableOpacity></View>
      <View style={st.toggleRow}><Text style={st.toggleLabel}>Destination Weddings</Text><TouchableOpacity style={[st.toggle, destinationWeddings && st.toggleActive]} onPress={() => setDestinationWeddings(!destinationWeddings)}><Text style={[st.toggleText, destinationWeddings && st.toggleTextActive]}>{destinationWeddings ? 'Yes' : 'No'}</Text></TouchableOpacity></View>
      <TouchableOpacity style={st.nextBtn} onPress={nextStep}><Text style={st.nextBtnText}>Next → About You</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></TouchableOpacity>
    </>);
  }

  // ═══ STEP 5: About + Submit ═══
  function renderStep5About() {
    return (<>
      <Text style={st.secTitle}>✍️ About You</Text>
      <Text style={st.secDesc}>A short intro and languages you speak</Text>
      <Text style={st.label}>About Me (max 300 chars)</Text>
      <TextInput style={st.textArea} value={bio} onChangeText={(t) => setBio(t.substring(0, 300))} placeholder="Tell customers about your work style, specialties..." placeholderTextColor="#9CA3AF" multiline numberOfLines={4} textAlignVertical="top" />
      <Text style={st.charCount}>{bio.length}/300</Text>
      <Text style={st.label}>Languages (Multi-select)</Text>
      <View style={st.optionRow}>
        {LANGUAGES.map(l => (<TouchableOpacity key={l} style={[st.optionChip, languages.includes(l) && st.optionChipActive]} onPress={() => toggleLanguage(l)}><Text style={[st.optionText, languages.includes(l) && st.optionTextActive]}>{l}</Text></TouchableOpacity>))}
      </View>
      <TouchableOpacity style={st.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={st.submitBtnText}>Submit for Verification</Text></>)}
      </TouchableOpacity>
      <Text style={st.note}>Your profile will be reviewed by our team. You can add portfolio photos later from your dashboard.</Text>
    </>);
  }
}

// ═══ Reusable Components ═══
function Field({ label, value, onChange, placeholder, icon, keyboard }: any) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.label}>{label}</Text>
      <View style={st.fieldRow}>
        <Ionicons name={icon} size={16} color="#7C3AED" />
        <TextInput style={st.fieldInput} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9CA3AF" keyboardType={keyboard} />
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
  scroll: { padding: 20, paddingBottom: 60 },
  secTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  secDesc: { fontSize: 12, color: '#6B7280', marginBottom: 18 },
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  fieldInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  fieldError: { fontSize: 10, color: '#EF4444', marginTop: 3, marginLeft: 4 },
  readOnly: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, height: 46, justifyContent: 'center', marginBottom: 14 },
  readOnlyText: { fontSize: 14, color: '#6B7280' },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, height: 46, marginBottom: 14 },
  selectorText: { fontSize: 14, color: '#1F2937' },
  selectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  optionChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  optionText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  optionTextActive: { color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  toggleLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  toggle: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  toggleActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },
  textArea: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 14, color: '#1F2937', minHeight: 100, marginBottom: 4 },
  charCount: { fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginBottom: 16 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, marginTop: 10 },
  nextBtnDisabled: { backgroundColor: '#D1D5DB' },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, marginTop: 16, elevation: 3, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  note: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 12, lineHeight: 16 },
  // Category selection styles
  catOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10 },
  catOptionActive: { borderColor: '#6C3BFF', backgroundColor: '#F5F3FF' },
  catEmoji: { fontSize: 28 },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  catLabelActive: { color: '#6C3BFF' },
  catDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  // Success Modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 12 },
  successMsg: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  successContact: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, width: '100%', marginBottom: 16 },
  successContactTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  successContactText: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  successBtn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, elevation: 2 },
  successBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
