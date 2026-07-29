/**
 * CreatorServiceAreas — Manage service locations
 * Creator can add/remove cities where they provide services
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function CreatorServiceAreas({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Creator fields
  const [homeState, setHomeState] = useState('');
  const [homeDistrict, setHomeDistrict] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [address, setAddress] = useState('');
  const [studioName, setStudioName] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [travelPreference, setTravelPreference] = useState('my_district');
  // Location picker
  const [showAddArea, setShowAddArea] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [addStep, setAddStep] = useState<'state' | 'district' | 'city'>('state');
  const [addState, setAddState] = useState('');
  const [addDistrict, setAddDistrict] = useState('');
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/creators/profile');
      const c = res.data?.creator;
      if (c) {
        setHomeState(c.state || '');
        setHomeDistrict(c.district || '');
        setHomeCity(c.baseCity || c.city || '');
        setPinCode(c.pincode || '');
        setAddress(c.studioAddress || '');
        setStudioName(c.studioName || '');
        setServiceAreas(c.serviceAreas || []);
        setTravelPreference(c.travelPreference || 'my_district');
      }
    } catch {} finally { setLoading(false); }
  };

  const save = async () => {
    if (serviceAreas.length === 0 && homeCity) {
      setServiceAreas([homeCity]);
    }
    setSaving(true);
    try {
      await api.put('/discovery/creator/service-areas', {
        state: homeState,
        district: homeDistrict,
        baseCity: homeCity,
        pincode: pinCode,
        studioAddress: address,
        studioName,
        serviceAreas: serviceAreas.length > 0 ? serviceAreas : (homeCity ? [homeCity] : []),
        travelPreference,
      });
      Alert.alert('✅ Saved', 'Service areas updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const removeArea = (area: string) => {
    setServiceAreas(prev => prev.filter(a => a !== area));
  };

  const addArea = (city: string) => {
    if (!serviceAreas.includes(city)) {
      setServiceAreas(prev => [...prev, city]);
    }
    setShowAddArea(false);
    setAddStep('state');
    setSearchQ('');
  };

  // Location data loaders
  const loadStates = async () => { try { const r = await api.get('/discovery/states'); setStates(r.data?.states || []); } catch {} };
  const loadDistricts = async (s: string) => { try { const r = await api.get('/discovery/districts', { params: { state: s } }); setDistricts(r.data?.districts || []); } catch {} };
  const loadCities = async (d: string) => { try { const r = await api.get('/discovery/cities', { params: { district: d, state: addState } }); setCities(r.data?.cities || []); } catch {} };

  const TRAVEL_OPTIONS = [
    { id: 'only_my_city', label: 'Only My City', icon: 'home' },
    { id: 'my_district', label: 'My District', icon: 'business' },
    { id: 'multiple_districts', label: 'Multiple Districts', icon: 'map' },
    { id: 'entire_state', label: 'Entire State', icon: 'globe' },
    { id: 'multiple_states', label: 'Multiple States', icon: 'earth' },
    { id: 'pan_india', label: 'Pan India', icon: 'airplane' },
  ];

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color="#7C3AED" /></View>;

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}><Ionicons name="arrow-back" size={20} color="#1F2937" /></TouchableOpacity>
        <Text style={st.title}>Service Areas</Text>
        <TouchableOpacity onPress={save} disabled={saving} style={st.saveBtn}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {/* Home Location */}
        <Text style={st.secTitle}>📍 Home Location</Text>
        <View style={st.card}>
          <Field label="State" value={homeState} onChange={setHomeState} placeholder="e.g. Jammu & Kashmir" />
          <Field label="District" value={homeDistrict} onChange={setHomeDistrict} placeholder="e.g. Poonch" />
          <Field label="City / Town" value={homeCity} onChange={setHomeCity} placeholder="e.g. Surankote" />
          <Field label="Studio / Business Name" value={studioName} onChange={setStudioName} placeholder="Optional" />
          <Field label="PIN Code" value={pinCode} onChange={setPinCode} placeholder="Optional" keyboard="numeric" />
          <Field label="Full Address" value={address} onChange={setAddress} placeholder="Optional" multiline />
        </View>

        {/* Travel Preference */}
        <Text style={st.secTitle}>🚗 Travel Preference</Text>
        <View style={st.card}>
          {TRAVEL_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.id} style={[st.travelOption, travelPreference === opt.id && st.travelOptionActive]} onPress={() => setTravelPreference(opt.id)}>
              <Ionicons name={opt.icon as any} size={16} color={travelPreference === opt.id ? '#7C3AED' : '#6B7280'} />
              <Text style={[st.travelLabel, travelPreference === opt.id && { color: '#7C3AED', fontWeight: '700' }]}>{opt.label}</Text>
              {travelPreference === opt.id && <Ionicons name="checkmark-circle" size={18} color="#7C3AED" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Areas */}
        <Text style={st.secTitle}>🗺️ Service Areas ({serviceAreas.length})</Text>
        <View style={st.card}>
          <Text style={st.hint}>Add all cities/towns where you can provide services. Customers in these locations will see your profile.</Text>
          
          {/* Current areas */}
          <View style={st.areasWrap}>
            {serviceAreas.map(area => (
              <View key={area} style={st.areaPill}>
                <Ionicons name="location" size={12} color="#7C3AED" />
                <Text style={st.areaPillText}>{area}</Text>
                <TouchableOpacity onPress={() => removeArea(area)}><Ionicons name="close-circle" size={16} color="#EF4444" /></TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Add button */}
          <TouchableOpacity style={st.addBtn} onPress={() => { setShowAddArea(true); setAddStep('state'); loadStates(); }}>
            <Ionicons name="add-circle" size={18} color="#7C3AED" />
            <Text style={st.addBtnText}>Add Service Area</Text>
          </TouchableOpacity>
        </View>

        {/* Add Area Picker (inline) */}
        {showAddArea && (
          <View style={st.pickerCard}>
            <View style={st.pickerHeader}>
              <Text style={st.pickerTitle}>{addStep === 'state' ? 'Select State' : addStep === 'district' ? 'Select District' : 'Select City'}</Text>
              {addStep !== 'state' && <TouchableOpacity onPress={() => setAddStep(addStep === 'city' ? 'district' : 'state')}><Text style={st.pickerBack}>← Back</Text></TouchableOpacity>}
              <TouchableOpacity onPress={() => setShowAddArea(false)} style={{ marginLeft: 'auto' }}><Ionicons name="close" size={18} color="#6B7280" /></TouchableOpacity>
            </View>

            {/* Search */}
            <View style={st.pickerSearch}>
              <Ionicons name="search" size={14} color="#9CA3AF" />
              <TextInput style={st.pickerSearchInput} value={searchQ} onChangeText={setSearchQ} placeholder="Search..." placeholderTextColor="#9CA3AF" />
            </View>

            <ScrollView style={st.pickerList} nestedScrollEnabled>
              {addStep === 'state' && states.filter(s => !searchQ || s.toLowerCase().includes(searchQ.toLowerCase())).map(s => (
                <TouchableOpacity key={s} style={st.pickerItem} onPress={() => { setAddState(s); setAddStep('district'); loadDistricts(s); setSearchQ(''); }}>
                  <Text style={st.pickerItemText}>{s}</Text><Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
              {addStep === 'district' && districts.filter(d => !searchQ || d.toLowerCase().includes(searchQ.toLowerCase())).map(d => (
                <TouchableOpacity key={d} style={st.pickerItem} onPress={() => { setAddDistrict(d); setAddStep('city'); loadCities(d); setSearchQ(''); }}>
                  <Text style={st.pickerItemText}>{d}</Text><Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
              {addStep === 'city' && cities.filter(c => !searchQ || c.toLowerCase().includes(searchQ.toLowerCase())).map(c => (
                <TouchableOpacity key={c} style={st.pickerItem} onPress={() => addArea(c)}>
                  <Ionicons name="add-circle-outline" size={16} color="#10B981" />
                  <Text style={[st.pickerItemText, { marginLeft: 6, color: '#10B981' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quick add by typing */}
            <View style={st.quickAdd}>
              <TextInput style={st.quickAddInput} placeholder="Or type a city name..." placeholderTextColor="#9CA3AF" value={searchQ} onChangeText={setSearchQ} onSubmitEditing={() => { if (searchQ.trim()) { addArea(searchQ.trim()); setSearchQ(''); } }} returnKeyType="done" />
              <TouchableOpacity style={st.quickAddBtn} onPress={() => { if (searchQ.trim()) { addArea(searchQ.trim()); setSearchQ(''); } }}>
                <Text style={st.quickAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity style={st.bigSaveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={st.bigSaveBtnText}>Save Service Areas</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, multiline }: any) {
  return (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput style={[st.fieldInput, multiline && { height: 70, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9CA3AF" keyboardType={keyboard || 'default'} multiline={multiline} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1F2937' },
  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  scroll: { padding: 16, paddingBottom: 40 },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: '#FAFBFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  // Field
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  fieldInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' },
  // Travel
  travelOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  travelOptionActive: { backgroundColor: '#F8F6FF', marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 10 },
  travelLabel: { fontSize: 13, color: '#374151' },
  // Areas
  hint: { fontSize: 11, color: '#6B7280', marginBottom: 10, lineHeight: 16 },
  areasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  areaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F3E8FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#DDD6FE' },
  areaPillText: { fontSize: 12, fontWeight: '600', color: '#5B21B6' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
  // Picker
  pickerCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginTop: 12 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pickerTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  pickerBack: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 10, height: 38, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  pickerSearchInput: { flex: 1, fontSize: 13, color: '#1F2937' },
  pickerList: { maxHeight: 200 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerItemText: { fontSize: 13, color: '#1F2937' },
  quickAdd: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickAddInput: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 10, height: 38, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 13, color: '#1F2937' },
  quickAddBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  quickAddBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  // Big Save
  bigSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, marginTop: 24, elevation: 3, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8 },
  bigSaveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
