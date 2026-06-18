/**
 * WriteReviewScreen — Submit/Edit review for a creator
 * Uses: POST /api/reviews (same DB as website)
 * Requires: completed booking with the creator
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function WriteReviewScreen({ route, navigation }: any) {
  const { creatorId, creatorName } = route.params;
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { Alert.alert('Required', 'Please select a star rating'); return; }
    if (!text.trim()) { Alert.alert('Required', 'Please write your review'); return; }

    setLoading(true);
    try {
      await api.post('/reviews', { creatorId, rating, title: title.trim(), text: text.trim() });
      Alert.alert('Thank You!', 'Your review has been submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to submit review';
      Alert.alert('Cannot Submit', msg);
    } finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>Write Review</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.content}>
        <Text style={s.creatorLabel}>Reviewing</Text>
        <Text style={s.creatorName}>{creatorName}</Text>

        {/* Star Rating */}
        <Text style={s.sectionLabel}>Your Rating</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setRating(i)} style={s.starBtn}>
              <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={32} color={i <= rating ? '#FF8C2B' : 'rgba(255,255,255,0.15)'} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.ratingLabel}>{rating === 5 ? 'Excellent!' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}</Text>

        {/* Title */}
        <Text style={s.sectionLabel}>Review Title (Optional)</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Amazing experience!" placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" />

        {/* Review Text */}
        <Text style={s.sectionLabel}>Your Review *</Text>
        <TextInput style={[s.input, s.textArea]} value={text} onChangeText={setText} placeholder="Share your experience with this creator..." placeholderTextColor="rgba(255,255,255,0.2)" selectionColor="#FF8C2B" multiline textAlignVertical="top" />

        {/* Note */}
        <View style={s.noteBox}>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.3)" />
          <Text style={s.noteText}>Reviews can only be submitted for creators you have a completed booking with. Your review will be visible on the creator's profile.</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : (
            <><Ionicons name="send" size={15} color="#000" /><Text style={s.submitText}>Submit Review</Text></>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050403' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  content: { padding: 20 },
  creatorLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase' },
  creatorName: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8, marginTop: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  starBtn: { padding: 4 },
  ratingLabel: { textAlign: 'center', fontSize: 12, color: '#FF8C2B', fontWeight: '600', marginTop: 6, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top' },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 10 },
  noteText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', flex: 1, lineHeight: 14 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF8C2B', borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  submitText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
