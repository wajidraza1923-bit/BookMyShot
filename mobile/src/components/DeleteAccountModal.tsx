/**
 * DeleteAccountModal — Premium confirmation modal for account deletion
 * Requires typing "DELETE" to enable the button.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Animated, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  role: 'user' | 'creator' | 'admin';
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteAccountModal({ visible, role, onClose, onConfirm }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setConfirmText('');
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
    } else { slideAnim.setValue(0); }
  }, [visible]);

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    try { await onConfirm(); } catch {} finally { setDeleting(false); }
  };

  const warnings = role === 'creator' ? [
    'Your subscription/trial will end immediately.',
    'Your portfolio will be deleted permanently.',
    'Your creator verification will be removed.',
    'Featured status and ranking will be removed.',
    'Pending payouts follow admin policy.',
    'Re-registration requires full verification.',
  ] : [
    'Your cashback balance will be permanently lost.',
    'Your wallet balance cannot be recovered.',
    'Your booking history will be removed.',
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] }]}>
          <View style={s.handle}><View style={s.handleBar} /></View>
          {/* Icon */}
          <View style={s.iconWrap}><Ionicons name="trash" size={28} color="#EF4444" /></View>
          <Text style={s.title}>Delete BookMyShot Account?</Text>
          <Text style={s.subtitle}>This action is permanent and cannot be undone.</Text>

          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            <Text style={s.descTitle}>Deleting your account will permanently remove:</Text>
            {['Profile & account data', 'Bookings & inquiries', 'Portfolio & uploads', 'Wallet & cashback', 'Notifications & chats', 'Reviews & login access'].map((item, i) => (
              <View key={i} style={s.listItem}><Ionicons name="close-circle" size={12} color="#EF4444" /><Text style={s.listText}>{item}</Text></View>
            ))}
            {warnings.map((w, i) => (
              <View key={i} style={s.warnItem}><Ionicons name="warning" size={12} color="#F59E0B" /><Text style={s.warnText}>{w}</Text></View>
            ))}
          </ScrollView>

          {/* Confirm input */}
          <Text style={s.inputLabel}>Type DELETE to confirm:</Text>
          <TextInput style={s.input} value={confirmText} onChangeText={setConfirmText} placeholder="DELETE" placeholderTextColor="#D1D5DB" autoCapitalize="characters" editable={!deleting} />

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={deleting}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.deleteBtn, !isConfirmed && { opacity: 0.4 }]} onPress={handleDelete} disabled={!isConfirmed || deleting}>
              {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.deleteText}>Delete Permanently</Text>}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '85%' },
  handle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  descTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  listText: { fontSize: 11, color: '#4B5563' },
  warnItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginTop: 2 },
  warnText: { fontSize: 11, color: '#92400E', fontWeight: '500' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: '#EF4444', textAlign: 'center', letterSpacing: 2 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center' },
  deleteText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
