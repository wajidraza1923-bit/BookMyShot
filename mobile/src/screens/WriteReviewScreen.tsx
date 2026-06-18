/**
 * WriteReviewScreen — Submit review for a creator
 * Supports: Logged-in users (auto) OR Guest users (phone verification)
 * Uses: POST /api/reviews (same DB as website)
 * Rules: One user/phone = one review per creator, 10-digit phone only
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

export default function WriteReviewScreen({ route, navigation }: any) {
  const { creatorId, creatorName } = route.params;
  const { isAuthenticated, user } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { Alert.alert('Required', 'Please select a star rating'); return; }
    if (!text.trim() || text.trim().length < 5) { Alert.alert('Required', 'Please write your review (at least 5 characters)'); return; }

    // Guest validation
    if (!isAuthenticated) {
      if (!guestName.trim() || guestName.trim().length < 2) { Alert.alert('Required', 'Please enter your name (at least 2 characters)'); return; }
      if (!phone || !/^\d{10}$/.test(phone)) { Alert.alert('Invalid Phone', 'Phone number must be exactly 10 digits (numbers only, no letters)'); return; }
    }

    setLoading(true);
    try {
      const payload: any = { creatorId, rating, title: title.trim(), text: text.trim() };

      if (!isAuthenticated) {
        // Guest mode: include phone + name
        payload.phone = phone;
        payload.name = guestName.trim();
      }

      // Build headers with auth token if logged in
      const headers: any = { 'Content-Type': 'application/json' };
      if (isAuthenticated) {
        const token = await AsyncStorage.getItem('bms_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: any;
      try { data = JSON.parse(responseText); } catch { data = { success: false, message: 'Server error' }; }

      if (response.ok && data.success) {
        Alert.alert('Thank You! 🎉', 'Your review has been submitted successfully and is now visible on the creator\'s profile.', [
          { text: 'Done', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Cannot Submit', data.message || 'Failed to submit review');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error. Please try again.');
    } finally { setLoading(false); }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Write Review</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Creator info */}
        <View style={s.creatorCard}>
          <Ionicons name="person-circle-outline" size={28} color="#FF8C2B" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.creatorLabel}>Reviewing</Text>
            <Text style={s.creatorName}>{creatorName}</Text>
          </View>
        </View>

        {/* Star Rating */}
        <Text style={s.sectionLabel}>Your Rating *</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setRating(i)} style={s.starBtn} activeOpacity={0.7}>
              <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={36} color={i <= rating ? '#FF8C2B' : 'rgba(255,255,255,0.12)'} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.ratingLabel}>{ratingLabels[rating]}</Text>

        {/* Guest Info (only if not logged in) */}
        {!isAuthenticated && (
          <View style={s.guestSection}>
            <View style={s.guestBadge}>
              <Ionicons name="person-outline" size={12} color="#FF8C2B" />
              <Text style={s.guestBadgeText}>Guest Review — verify with phone number</Text>
            </View>
            <Text style={s.sectionLabel}>Your Name *</Text>
            <TextInput style={s.input} value={guestName} onChangeText={setGuestName} placeholder="Enter your full name" placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" />

            <Text style={s.sectionLabel}>Phone Number * (10 digits)</Text>
            <TextInput style={s.input} value={phone} onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="e.g. 9876543210" placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" keyboardType="number-pad" maxLength={10} />
            {phone.length > 0 && phone.length < 10 && <Text style={s.phoneHint}>{10 - phone.length} more digits needed</Text>}
            {phone.length === 10 && <Text style={s.phoneValid}>✓ Valid phone number</Text>}
          </View>
        )}

        {isAuthenticated && (
          <View style={s.loggedInBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={s.loggedInText}>Reviewing as {user?.name}</Text>
          </View>
        )}

        {/* Review Title */}
        <Text style={s.sectionLabel}>Review Title (Optional)</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Amazing experience!" placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" />

        {/* Review Text */}
        <Text style={s.sectionLabel}>Your Review *</Text>
        <TextInput style={[s.input, s.textArea]} value={text} onChangeText={setText} placeholder="Share your experience with this creator..." placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" multiline textAlignVertical="top" />
        <Text style={s.charCount}>{text.length}/500</Text>

        {/* Rules */}
        <View style={s.rulesBox}>
          <Text style={s.rulesTitle}>Review Guidelines</Text>
          <Text style={s.ruleItem}>• One review per creator per user/phone</Text>
          <Text style={s.ruleItem}>• Phone must be exactly 10 digits (no letters)</Text>
          <Text style={s.ruleItem}>• Review will be visible on creator's profile</Text>
          <Text style={s.ruleItem}>• Be honest and respectful</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : (
            <><Ionicons name="send" size={15} color="#000" /><Text style={s.submitText}>Submit Review</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  // Creator card
  creatorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,140,43,0.04)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.12)', borderRadius: 12, padding: 14, marginBottom: 20 },
  creatorLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase' },
  creatorName: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 1 },
  // Stars
  sectionLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8, marginTop: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  starBtn: { padding: 4 },
  ratingLabel: { textAlign: 'center', fontSize: 13, color: '#FF8C2B', fontWeight: '700', marginTop: 6, marginBottom: 4 },
  // Guest section
  guestSection: { marginTop: 8 },
  guestBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,140,43,0.04)', borderWidth: 1, borderColor: 'rgba(255,140,43,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  guestBadgeText: { fontSize: 10, color: '#FF8C2B' },
  phoneHint: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 },
  phoneValid: { fontSize: 9, color: '#10B981', marginTop: 3 },
  // Logged in badge
  loggedInBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.04)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8, marginBottom: 4 },
  loggedInText: { fontSize: 11, color: '#10B981' },
  // Inputs
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#fff' },
  textArea: { height: 110, textAlignVertical: 'top' },
  charCount: { fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: 3 },
  // Rules
  rulesBox: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  rulesTitle: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  ruleItem: { fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 16 },
  // Submit
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF8C2B', borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  submitText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
