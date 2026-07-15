/**
 * PlatformReviewScreen — Rate BookMyShot (platform review)
 * Supports: Logged-in users (auto) + Guests (name + phone + city)
 * Uses: POST /api/reviews/platform (same DB as website)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

export default function PlatformReviewScreen({ navigation }: any) {
  const { isAuthenticated, user } = useAuth();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { Alert.alert('Required', 'Please select a star rating'); return; }
    if (!text.trim() || text.trim().length < 10) { Alert.alert('Required', 'Please write your review (at least 10 characters)'); return; }

    if (!isAuthenticated) {
      if (!name.trim() || name.trim().length < 2) { Alert.alert('Required', 'Please enter your name'); return; }
      if (!phone || !/^\d{10}$/.test(phone)) { Alert.alert('Invalid Phone', 'Phone must be exactly 10 digits'); return; }
    }

    setLoading(true);
    try {
      const payload: any = { rating, text: text.trim(), city: city.trim() };
      if (!isAuthenticated) { payload.phone = phone; payload.name = name.trim(); }

      const headers: any = { 'Content-Type': 'application/json' };
      if (isAuthenticated) {
        const token = await AsyncStorage.getItem('bms_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/reviews/platform`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({ success: false, message: 'Server error' }));

      if (response.ok && data.success) {
        Alert.alert('Thank You! 🎉', 'Your review has been submitted and will appear on our homepage.', [
          { text: 'Done', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Cannot Submit', data.message || 'Failed to submit review');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
        <Text style={st.headerTitle}>Rate BookMyShot</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <View style={st.topCard}>
          <Text style={st.topEmoji}>⭐</Text>
          <Text style={st.topTitle}>Share Your Experience</Text>
          <Text style={st.topSub}>Help other couples find the best wedding creators</Text>
        </View>

        {/* Star Rating */}
        <Text style={st.label}>Your Rating *</Text>
        <View style={st.starsRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setRating(i)} style={st.starBtn}>
              <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={34} color={i <= rating ? '#FF8C2B' : 'rgba(255,255,255,0.12)'} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={st.ratingLabel}>{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][rating]}</Text>

        {/* Guest fields */}
        {!isAuthenticated && (
          <>
            <Text style={st.label}>Your Name *</Text>
            <TextInput style={st.input} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" />

            <Text style={st.label}>Phone Number * (10 digits)</Text>
            <TextInput style={st.input} value={phone} onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="9876543210" placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" keyboardType="number-pad" maxLength={10} />
          </>
        )}

        {isAuthenticated && (
          <View style={st.loggedIn}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={st.loggedInText}>Reviewing as {user?.name}</Text>
          </View>
        )}

        <Text style={st.label}>City (Optional)</Text>
        <TextInput style={st.input} value={city} onChangeText={setCity} placeholder="e.g. Jammu, Srinagar" placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" />

        <Text style={st.label}>Your Review *</Text>
        <TextInput style={[st.input, st.textArea]} value={text} onChangeText={setText} placeholder="Tell us about your experience with BookMyShot..." placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" multiline textAlignVertical="top" />
        <Text style={st.charCount}>{text.length}/500</Text>

        {/* Submit */}
        <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : (
            <><Ionicons name="send" size={14} color="#000" /><Text style={st.submitText}>Submit Review</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  topCard: { alignItems: 'center', backgroundColor: 'rgba(255,140,43,0.04)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.1)', borderRadius: 16, padding: 20, marginBottom: 20 },
  topEmoji: { fontSize: 28, marginBottom: 6 },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  topSub: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 14 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  starBtn: { padding: 4 },
  ratingLabel: { textAlign: 'center', fontSize: 12, color: '#6C3BFF', fontWeight: '700', marginTop: 4, marginBottom: 6 },
  input: { backgroundColor: '#F8F6FF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1F2937' },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: 3 },
  loggedIn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.04)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10 },
  loggedInText: { fontSize: 11, color: '#10B981' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6C3BFF', borderRadius: 12, paddingVertical: 14, marginTop: 24 },
  submitText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
