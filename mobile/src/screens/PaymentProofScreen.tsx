/**
 * PaymentProofScreen — Professional payment submission flow
 * Shows: Amount, Method, UTR, Image upload, Preview
 * Uploads to Cloudinary, creates PaymentProof record
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius } from '../theme';
import api from '../services/api';

const METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Other'];

export default function PaymentProofScreen({ route, navigation }: any) {
  const { bookingId, totalAmount = 0, paidAmount = 0, creatorName = 'Creator' } = route?.params || {};
  const remaining = Math.max(0, totalAmount - paidAmount);

  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : '');
  const [method, setMethod] = useState('UPI');
  const [utr, setUtr] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const pickImage = async (source: 'camera' | 'gallery') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') { Alert.alert('Permission needed'); return; }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

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
      // 1. Upload image to Cloudinary
      const formData = new FormData();
      formData.append('file', { uri: image.uri, type: 'image/jpeg', name: 'payment-proof.jpg' } as any);
      formData.append('folder', 'bookmyshot/payment-proofs');
      const uploadRes = await api.post('/creator/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const screenshotUrl = uploadRes.data?.url;
      if (!screenshotUrl) { Alert.alert('Error', 'Image upload failed'); setUploading(false); return; }

      // 2. Create payment proof record
      await api.post('/payment-proofs', {
        bookingId,
        amount: payAmount,
        screenshot: screenshotUrl,
        note: notes || `${method} payment`,
        transactionId: utr || '',
        paymentMethod: method,
      });

      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Submission failed');
    } finally { setUploading(false); }
  };

  // Success screen
  if (submitted) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <View style={s.successIcon}><Ionicons name="checkmark-circle" size={56} color="#10B981" /></View>
        <Text style={s.successTitle}>Payment Submitted! ✅</Text>
        <Text style={s.successSub}>Your payment proof has been sent to {creatorName}. You'll be notified once it's verified.</Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={s.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>Submit Payment</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Payment Summary */}
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Payment to {creatorName}</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}><Text style={s.summaryNum}>₹{totalAmount.toLocaleString('en-IN')}</Text><Text style={s.summaryCaption}>Total</Text></View>
            <View style={s.summaryItem}><Text style={[s.summaryNum, { color: '#10B981' }]}>₹{paidAmount.toLocaleString('en-IN')}</Text><Text style={s.summaryCaption}>Paid</Text></View>
            <View style={s.summaryItem}><Text style={[s.summaryNum, { color: '#F59E0B' }]}>₹{remaining.toLocaleString('en-IN')}</Text><Text style={s.summaryCaption}>Remaining</Text></View>
          </View>
        </View>

        {/* Amount Input */}
        <View style={s.field}>
          <Text style={s.label}>Amount Paid (₹) *</Text>
          <View style={s.inputRow}>
            <Ionicons name="cash-outline" size={18} color="rgba(255,255,255,0.3)" />
            <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Enter amount" placeholderTextColor="rgba(255,255,255,0.2)" />
          </View>
        </View>

        {/* Payment Method */}
        <View style={s.field}>
          <Text style={s.label}>Payment Method *</Text>
          <View style={s.methodRow}>
            {METHODS.map(m => (
              <TouchableOpacity key={m} style={[s.methodBtn, method === m && s.methodActive]} onPress={() => setMethod(m)}>
                <Text style={[s.methodText, method === m && s.methodTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* UTR */}
        <View style={s.field}>
          <Text style={s.label}>Transaction ID / UTR</Text>
          <View style={s.inputRow}>
            <Ionicons name="key-outline" size={18} color="rgba(255,255,255,0.3)" />
            <TextInput style={s.input} value={utr} onChangeText={setUtr} placeholder="Enter UTR or reference number" placeholderTextColor="rgba(255,255,255,0.2)" />
          </View>
        </View>

        {/* Notes */}
        <View style={s.field}>
          <Text style={s.label}>Notes (Optional)</Text>
          <View style={[s.inputRow, { height: 60, alignItems: 'flex-start', paddingTop: 10 }]}>
            <TextInput style={[s.input, { textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Any additional info..." placeholderTextColor="rgba(255,255,255,0.2)" multiline />
          </View>
        </View>

        {/* Upload Proof */}
        <View style={s.field}>
          <Text style={s.label}>Payment Screenshot *</Text>
          {imagePreview ? (
            <View style={s.previewWrap}>
              <Image source={{ uri: imagePreview }} style={s.preview} />
              <TouchableOpacity style={s.removeImg} onPress={() => { setImage(null); setImagePreview(''); }}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.uploadRow}>
              <TouchableOpacity style={s.uploadOption} onPress={() => pickImage('camera')}>
                <Ionicons name="camera-outline" size={22} color="#F97316" />
                <Text style={s.uploadOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.uploadOption} onPress={() => pickImage('gallery')}>
                <Ionicons name="images-outline" size={22} color="#F97316" />
                <Text style={s.uploadOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, uploading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={uploading} activeOpacity={0.85}>
          {uploading ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="send" size={16} color="#000" /><Text style={s.submitText}>Submit Payment Proof</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingBottom: 10, gap: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  // Summary
  summaryCard: { backgroundColor: 'rgba(249,115,22,0.04)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.12)', borderRadius: 14, padding: 16, marginBottom: 20 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryNum: { fontSize: 18, fontWeight: '700', color: colors.text },
  summaryCaption: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
  // Fields
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 14, color: '#fff' },
  // Method
  methodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  methodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' },
  methodActive: { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.08)' },
  methodText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  methodTextActive: { color: '#F97316', fontWeight: '700' },
  // Upload
  uploadRow: { flexDirection: 'row', gap: 12 },
  uploadOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)', borderStyle: 'dashed', backgroundColor: 'rgba(249,115,22,0.03)' },
  uploadOptionText: { fontSize: 11, color: '#F97316', marginTop: 4, fontWeight: '600' },
  previewWrap: { position: 'relative' },
  preview: { width: '100%', height: 180, borderRadius: 12, resizeMode: 'cover' },
  removeImg: { position: 'absolute', top: 8, right: 8 },
  // Submit
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 15, marginTop: 8 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#000' },
  // Success
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  successSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 280 },
  doneBtn: { marginTop: 24, backgroundColor: '#F97316', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  doneBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
