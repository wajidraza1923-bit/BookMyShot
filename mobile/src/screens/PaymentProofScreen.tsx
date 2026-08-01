/**
 * PaymentProofScreen — Payment proof submission for remaining amount
 * Shows remaining after booking fee deduction. Fetches fee from backend.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';
import api from '../services/api';

const METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Other'];

export default function PaymentProofScreen({ route, navigation }: any) {
  const { bookingId, totalAmount = 0, paidAmount = 0, creatorName = 'Creator' } = route?.params || {};

  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { loadBookingDetails(); }, [bookingId]);

  const loadBookingDetails = async () => {
    try {
      const res = await api.get(`/booking-fee/calculate/${bookingId}`);
      if (res.data?.data) setBookingData(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  const bookingTotal = bookingData?.totalAmount || totalAmount;
  const bookingFeeAmount = bookingData?.bookingFee || 0;
  const bookingFeePaid = bookingData?.feeStatus === 'paid';
  const feePercent = bookingData?.bookingFeePercent || 5;
  const alreadyPaidTotal = (bookingFeePaid ? bookingFeeAmount : 0) + paidAmount;
  const actualRemaining = Math.max(0, bookingTotal - alreadyPaidTotal);

  useEffect(() => {
    if (!loading && actualRemaining > 0) setAmount(String(actualRemaining));
  }, [loading, actualRemaining]);

  const pickImage = async (source: 'camera' | 'gallery') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
      setImagePreview(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const payAmount = parseInt(amount) || 0;
    if (payAmount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!image) { Alert.alert('Error', 'Please upload payment proof screenshot'); return; }
    setUploading(true);
    try {
      let screenshotUrl = '';
      try {
        const formData = new FormData();
        formData.append('file', { uri: image.uri, type: 'image/jpeg', name: 'payment-proof.jpg' } as any);
        const uploadRes = await api.post('/user/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        screenshotUrl = uploadRes.data?.url || '';
      } catch {
        try {
          const formData = new FormData();
          formData.append('file', { uri: image.uri, type: 'image/jpeg', name: 'payment-proof.jpg' } as any);
          formData.append('folder', 'bookmyshot/payment-proofs');
          const uploadRes = await api.post('/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          screenshotUrl = uploadRes.data?.url || '';
        } catch { screenshotUrl = image.uri; }
      }
      if (!screenshotUrl) { Alert.alert('Error', 'Image upload failed.'); setUploading(false); return; }
      await api.post('/payment-proofs', { bookingId, amount: payAmount, screenshot: screenshotUrl, note: notes || `${method} payment to creator` });
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Submission failed.');
    } finally { setUploading(false); }
  };

  if (loading) return <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color="#6C3BFF" /></View>;

  if (submitted) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Ionicons name="checkmark-circle" size={56} color="#10B981" />
        <Text style={s.successTitle}>Payment Submitted! ✅</Text>
        <Text style={s.successSub}>Your payment proof has been sent to {creatorName}. You'll be notified once verified.</Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}><Text style={s.doneBtnText}>Done</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color="#1F2937" /></TouchableOpacity>
        <Text style={s.headerTitle}>Submit Payment Proof</Text>
        <View style={{ width: 20 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Booking Fee Paid Badge */}
        {bookingFeePaid && (
          <View style={s.feePaidCard}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.feePaidTitle}>Booking Fee Paid via Razorpay ✅</Text>
              <Text style={s.feePaidSub}>₹{bookingFeeAmount.toLocaleString('en-IN')} ({feePercent}%) already paid to BookMyShot</Text>
            </View>
          </View>
        )}

        {/* Payment Summary */}
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Remaining Payment to {creatorName}</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}><Text style={s.summaryNum}>₹{bookingTotal.toLocaleString('en-IN')}</Text><Text style={s.summaryCaption}>Total</Text></View>
            <View style={s.summaryItem}><Text style={[s.summaryNum, { color: '#10B981' }]}>₹{alreadyPaidTotal.toLocaleString('en-IN')}</Text><Text style={s.summaryCaption}>Paid</Text></View>
            <View style={s.summaryItem}><Text style={[s.summaryNum, { color: '#6C3BFF', fontSize: 20 }]}>₹{actualRemaining.toLocaleString('en-IN')}</Text><Text style={[s.summaryCaption, { color: '#6C3BFF', fontWeight: '600' }]}>Remaining</Text></View>
          </View>
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={16} color="#6C3BFF" />
          <Text style={s.infoText}>Upload proof only for the amount paid <Text style={{ fontWeight: '700' }}>directly to the creator</Text>. Booking fee was already paid via Razorpay.</Text>
        </View>

        {/* Amount */}
        <View style={s.field}><Text style={s.label}>Amount Paid to Creator (₹) *</Text>
          <View style={s.inputRow}><Ionicons name="cash-outline" size={18} color="#6B7280" /><TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Enter amount" placeholderTextColor="#9CA3AF" /></View>
        </View>

        {/* Method */}
        <View style={s.field}><Text style={s.label}>Payment Method *</Text>
          <View style={s.methodRow}>{METHODS.map(m => (
            <TouchableOpacity key={m} style={[s.methodBtn, method === m && s.methodActive]} onPress={() => setMethod(m)}><Text style={[s.methodText, method === m && s.methodTextActive]}>{m}</Text></TouchableOpacity>
          ))}</View>
        </View>

        {/* Notes */}
        <View style={s.field}><Text style={s.label}>Notes / Transaction ID (Optional)</Text>
          <View style={[s.inputRow, { height: 60, alignItems: 'flex-start', paddingTop: 10 }]}><TextInput style={[s.input, { textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="UPI ref, bank transfer ID..." placeholderTextColor="#9CA3AF" multiline /></View>
        </View>

        {/* Upload */}
        <View style={s.field}><Text style={s.label}>Payment Screenshot *</Text>
          {imagePreview ? (
            <View style={s.previewWrap}><Image source={{ uri: imagePreview }} style={s.preview} /><TouchableOpacity style={s.removeImg} onPress={() => { setImage(null); setImagePreview(''); }}><Ionicons name="close-circle" size={24} color="#EF4444" /></TouchableOpacity></View>
          ) : (
            <View style={s.uploadRow}>
              <TouchableOpacity style={s.uploadOption} onPress={() => pickImage('camera')}><Ionicons name="camera-outline" size={22} color="#6C3BFF" /><Text style={s.uploadOptionText}>Camera</Text></TouchableOpacity>
              <TouchableOpacity style={s.uploadOption} onPress={() => pickImage('gallery')}><Ionicons name="images-outline" size={22} color="#6C3BFF" /><Text style={s.uploadOptionText}>Gallery</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, uploading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={uploading} activeOpacity={0.85}>
          {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><Ionicons name="send" size={16} color="#FFFFFF" /><Text style={s.submitText}>Submit Payment Proof</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingBottom: 10, gap: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  feePaidCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#D1FAE5' },
  feePaidTitle: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  feePaidSub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  summaryCard: { backgroundColor: '#F8F6FF', borderWidth: 1, borderColor: '#EDE9FE', borderRadius: 14, padding: 16, marginBottom: 14 },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryNum: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  summaryCaption: { fontSize: 9, color: '#6B7280', marginTop: 3 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8F6FF', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EDE9FE' },
  infoText: { fontSize: 11, color: '#4B5563', lineHeight: 16, flex: 1 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
  methodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  methodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  methodActive: { borderColor: '#6C3BFF', backgroundColor: '#F3E8FF' },
  methodText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  methodTextActive: { color: '#6C3BFF', fontWeight: '700' },
  uploadRow: { flexDirection: 'row', gap: 12 },
  uploadOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 12, borderWidth: 1.5, borderColor: '#EDE9FE', borderStyle: 'dashed', backgroundColor: '#F8F6FF' },
  uploadOptionText: { fontSize: 11, color: '#6C3BFF', marginTop: 4, fontWeight: '600' },
  previewWrap: { position: 'relative' },
  preview: { width: '100%', height: 180, borderRadius: 12, resizeMode: 'cover' },
  removeImg: { position: 'absolute', top: 8, right: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6C3BFF', borderRadius: 14, paddingVertical: 15, marginTop: 8, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  successSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 280 },
  doneBtn: { marginTop: 24, backgroundColor: '#6C3BFF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  doneBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
