/**
 * InquiryScreen — Send inquiry to creator (same API as website)
 * Supports: Direct inquiry (from creator profile) + General inquiry
 * Uses: POST /api/inquiries (same endpoint as website)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function InquiryScreen({ route, navigation }: any) {
  const { isAuthenticated, user } = useAuth();
  const creatorId = route?.params?.creatorId;
  const creatorName = route?.params?.creatorName || 'Creator';
  const isDirect = !!creatorId;

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    eventType: '',
    eventDate: '',
    city: '',
    budget: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<'form' | 'selectCreator'>('form');
  const [allCreators, setAllCreators] = useState<any[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(creatorId || null);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.eventType) {
      Alert.alert('Required', 'Please fill Name, Phone, and Event Type');
      return;
    }

    setLoading(true);
    try {
      const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';
      const payload: any = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        eventType: form.eventType,
        eventDate: form.eventDate || undefined,
        city: form.city,
        budget: Number(form.budget) || 0,
        message: form.message,
      };

      let endpoint = '/general-inquiries'; // Default: goes to admin only

      // If a creator was selected (direct or user-chosen), use inquiries endpoint
      if (selectedCreatorId) {
        endpoint = '/inquiries';
        payload.creatorId = selectedCreatorId;
      }

      console.log('[Inquiry] Endpoint:', endpoint, 'Payload:', JSON.stringify(payload));

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { success: false, message: 'Server error' }; }

      if (response.ok && data?.success) {
        setSubmitted(true);
      } else {
        Alert.alert('Failed', data?.message || 'Could not submit inquiry');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const loadCreators = async () => {
    try {
      const res = await api.get('/creators');
      setAllCreators(res.data?.creators || res.data?.data || []);
    } catch {}
  };

  const goToSelectCreator = () => {
    if (!form.name || !form.phone || !form.eventType) {
      Alert.alert('Required', 'Please fill Name, Phone, and Event Type first');
      return;
    }
    loadCreators();
    setStep('selectCreator');
  };

  if (submitted) {
    return (
      <View style={s.container}>
        <View style={s.successView}>
          <View style={s.successIcon}><Ionicons name="checkmark-circle" size={48} color="#10B981" /></View>
          <Text style={s.successTitle}>Inquiry Sent!</Text>
          <Text style={s.successSub}>{isDirect ? `Your inquiry has been sent to ${creatorName}. They will respond within 24 hours.` : 'Our team will connect you with the best creators for your event.'}</Text>
          <TouchableOpacity style={s.successBtn} onPress={() => navigation.goBack()}>
            <Text style={s.successBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
        <Text style={s.headerTitle}>{isDirect ? `Inquiry to ${creatorName}` : 'Submit Inquiry'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {step === 'form' ? (<>
          {isDirect && (
            <View style={s.directBadge}><Ionicons name="person" size={12} color="#FF8C2B" /><Text style={s.directText}>Direct inquiry to {creatorName}</Text></View>
          )}

          <Field label="Full Name *" icon="person-outline" value={form.name} onChange={(v: string) => update('name', v)} />
          <Field label="Phone Number *" icon="call-outline" value={form.phone} onChange={(v: string) => update('phone', v)} keyboard="phone-pad" />
          <Field label="Email" icon="mail-outline" value={form.email} onChange={(v: string) => update('email', v)} keyboard="email-address" />
          <Field label="Event Type *" icon="calendar-outline" value={form.eventType} onChange={(v: string) => update('eventType', v)} placeholder="e.g. Wedding, Pre-Wedding, Reception" />
          <Field label="Event Date" icon="today-outline" value={form.eventDate} onChange={(v: string) => update('eventDate', v)} placeholder="DD/MM/YYYY" />
          <Field label="City / District" icon="location-outline" value={form.city} onChange={(v: string) => update('city', v)} />
          <Field label="Budget (₹)" icon="wallet-outline" value={form.budget} onChange={(v: string) => update('budget', v)} keyboard="numeric" placeholder="e.g. 50000" />
          <Field label="Message / Requirements" icon="chatbubble-outline" value={form.message} onChange={(v: string) => update('message', v)} multiline placeholder="Tell us about your event..." />

          {/* Submit directly (goes to admin) */}
          <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#000" /> : <><Ionicons name="send" size={15} color="#000" /><Text style={s.submitText}>Submit Inquiry</Text></>}
          </TouchableOpacity>

          {/* Choose creator option (only for general inquiries) */}
          {!isDirect && (
            <TouchableOpacity style={s.chooseBtn} onPress={goToSelectCreator} activeOpacity={0.85}>
              <Ionicons name="people-outline" size={15} color="#FF8C2B" />
              <Text style={s.chooseBtnText}>Choose a Specific Creator</Text>
            </TouchableOpacity>
          )}
        </>) : (
          /* CREATOR SELECTION STEP */
          <>
            <Text style={s.selectTitle}>Select a Creator</Text>
            <Text style={s.selectSub}>Your inquiry will be sent directly to the selected creator.</Text>
            {allCreators.length === 0 ? <ActivityIndicator color="#FF8C2B" style={{ marginTop: 30 }} /> :
              allCreators.map(c => (
                <TouchableOpacity key={c._id} style={[s.creatorRow, selectedCreatorId === c._id && s.creatorRowActive]} onPress={() => setSelectedCreatorId(c._id)}>
                  <Image source={{ uri: c.user?.avatar || c.portfolio?.[0] }} style={s.creatorAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.creatorName}>{c.user?.name || 'Creator'}</Text>
                    <Text style={s.creatorMeta}>{c.specialty || 'Photographer'} • {c.city || 'J&K'}</Text>
                  </View>
                  {selectedCreatorId === c._id && <Ionicons name="checkmark-circle" size={20} color="#FF8C2B" />}
                </TouchableOpacity>
              ))
            }
            <TouchableOpacity style={[s.submitBtn, !selectedCreatorId && { opacity: 0.4 }, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={!selectedCreatorId || loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#000" /> : <><Ionicons name="send" size={15} color="#000" /><Text style={s.submitText}>Send to Creator</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={s.backLink} onPress={() => setStep('form')}><Text style={s.backLinkText}>← Back to form</Text></TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, icon, value, onChange, keyboard, placeholder, multiline }: any) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldInput, multiline && { height: 90, alignItems: 'flex-start' }]}>
        <Ionicons name={icon} size={16} color="rgba(255,140,43,0.5)" style={{ marginTop: multiline ? 12 : 0 }} />
        <TextInput style={[s.fieldText, multiline && { height: 80, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} keyboardType={keyboard || 'default'} placeholder={placeholder || ''} placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" multiline={multiline} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  directBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,140,43,0.06)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.15)', borderRadius: 10, padding: 10, marginBottom: 16 },
  directText: { fontSize: 12, color: '#FF8C2B', fontWeight: '500' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: 0.3 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  fieldText: { flex: 1, fontSize: 14, color: '#fff' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF8C2B', borderRadius: 14, paddingVertical: 14, marginTop: 20 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#000' },
  chooseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,140,43,0.3)', borderRadius: 14, paddingVertical: 13, marginTop: 12 },
  chooseBtnText: { fontSize: 13, fontWeight: '600', color: '#FF8C2B' },
  // Creator selection
  selectTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  selectSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 8 },
  creatorRowActive: { borderColor: 'rgba(255,140,43,0.3)', backgroundColor: 'rgba(255,140,43,0.04)' },
  creatorAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,140,43,0.2)' },
  creatorName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  creatorMeta: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  backLink: { alignItems: 'center', marginTop: 14 },
  backLinkText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  // Success
  successView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  successSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  successBtn: { marginTop: 24, backgroundColor: '#FF8C2B', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  successBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
