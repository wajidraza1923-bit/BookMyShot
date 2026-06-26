/**
 * CreateInquiry — Creator creates an inquiry (for offline clients)
 * Uses same calendar picker as booking/inquiry screens
 * Auto-creates booking + calculates commission
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreateInquiry({ navigation }: any) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', eventType: '', city: '', budget: '', message: '' });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.eventType.trim() || !selectedDate) {
      Alert.alert('Required', 'Name, Event Type, and Event Date are required');
      return;
    }
    setSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const res = await api.post('/creator/inquiries', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        eventType: form.eventType.trim(),
        city: form.city.trim(),
        eventDate: dateStr,
        budget: parseInt(form.budget) || 0,
        message: form.message.trim(),
      });
      if (res.data?.success) {
        Alert.alert('Created! ✅', 'Inquiry created and booking auto-generated.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to create inquiry');
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to create inquiry';
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  };

  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Create Inquiry</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <Text style={s.subtitle}>Add an offline client inquiry. This will also create a booking and calculate commission automatically.</Text>

        <Field label="Client Name *" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} placeholder="Full name" />
        <Field label="Phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} placeholder="Mobile number" keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} placeholder="Email (optional)" keyboardType="email-address" />
        <Field label="Event Type *" value={form.eventType} onChange={(v: string) => setForm({ ...form, eventType: v })} placeholder="Wedding, Pre-Wedding, etc." />
        <Field label="City" value={form.city} onChange={(v: string) => setForm({ ...form, city: v })} placeholder="Event city" />

        {/* Date Picker */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Event Date *</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowCalendar(true)} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={18} color={selectedDate ? colors.primary : colors.textMuted} />
            <Text style={[s.dateBtnText, selectedDate && { color: colors.text }]}>
              {selectedDate ? formatDate(selectedDate) : 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>

        <Field label="Budget (₹)" value={form.budget} onChange={(v: string) => setForm({ ...form, budget: v })} placeholder="0" keyboardType="numeric" />
        <Field label="Notes" value={form.message} onChange={(v: string) => setForm({ ...form, message: v })} placeholder="Additional details..." multiline />

        <TouchableOpacity style={[s.createBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
          <Text style={s.createBtnText}>{saving ? 'Creating...' : 'Create Inquiry + Booking'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={(date) => { setSelectedDate(date); setShowCalendar(false); }}
        selected={selectedDate}
      />
    </KeyboardAvoidingView>
  );
}

// ═══ Calendar Modal (same as InquiryScreen/BookingScreen) ═══
function CalendarModal({ visible, onClose, onSelect, selected }: { visible: boolean; onClose: () => void; onSelect: (d: Date) => void; selected: Date | null }) {
  const [viewDate, setViewDate] = useState(selected || new Date());
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isSelected = (day: number) => {
    if (!selected) return false;
    return selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
  };

  const isPast = (day: number) => new Date(year, month, day) < today;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cs.overlay}>
        <View style={cs.card}>
          {/* Month Navigation */}
          <View style={cs.monthRow}>
            <TouchableOpacity onPress={prevMonth} style={cs.navBtn}><Ionicons name="chevron-back" size={18} color={colors.text} /></TouchableOpacity>
            <Text style={cs.monthText}>{viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={nextMonth} style={cs.navBtn}><Ionicons name="chevron-forward" size={18} color={colors.text} /></TouchableOpacity>
          </View>

          {/* Week Headers */}
          <View style={cs.weekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <Text key={d} style={cs.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Day Grid */}
          <View style={cs.daysGrid}>
            {days.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[cs.dayCell, day && isSelected(day) && cs.dayCellSelected]}
                onPress={() => day && !isPast(day) && onSelect(new Date(year, month, day))}
                disabled={!day || isPast(day)}
              >
                {day && (
                  <Text style={[cs.dayText, isPast(day) && cs.dayPast, isSelected(day) && cs.dayTextSelected]}>
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Close */}
          <TouchableOpacity style={cs.closeBtn} onPress={onClose}>
            <Text style={cs.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, multiline }: any) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={[s.fieldInput, multiline && { height: 70, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} selectionColor={colors.primary} keyboardType={keyboardType} multiline={multiline} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  subtitle: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 18 },
  field: { marginBottom: spacing.lg },
  fieldLabel: { ...typography.labelMd, color: colors.textSecondary, marginBottom: spacing.xs, marginLeft: spacing.xs },
  fieldInput: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  dateBtnText: { ...typography.bodyMd, color: colors.textMuted },
  createBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createBtnText: { ...typography.labelLg, color: '#000', fontWeight: '700' },
});

const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.border },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontSize: 15, fontWeight: '600', color: colors.text },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.textMuted },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: 20 },
  dayText: { fontSize: 13, color: colors.text },
  dayPast: { color: 'rgba(255,255,255,0.15)' },
  dayTextSelected: { color: '#000', fontWeight: '700' },
  closeBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  closeBtnText: { fontSize: 13, color: colors.textMuted },
});
