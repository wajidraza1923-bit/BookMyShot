import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CreatorCalendar({ navigation }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', notes: '', category: 'Shoot' });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/creator/calendar/private');
      setEvents(res.data?.events || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const getEventsForDate = (dateStr: string) => events.filter(e => e.date?.substring(0, 10) === dateStr);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const addEvent = async () => {
    if (!selectedDate || !newEvent.title.trim()) { Alert.alert('Error', 'Select date and enter title'); return; }
    try {
      await api.post('/creator/calendar/private', { title: newEvent.title, date: selectedDate, notes: newEvent.notes, category: newEvent.category, type: 'event' });
      setShowAddModal(false);
      setNewEvent({ title: '', notes: '', category: 'Shoot' });
      await load();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to add event'); }
  };

  const deleteEvent = async (id: string) => {
    Alert.alert('Delete', 'Remove this event?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/creator/calendar/private/${id}`); await load(); } catch {}
      }}
    ]);
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const renderCalendarGrid = () => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = getEventsForDate(dateStr);
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;
      cells.push(
        <TouchableOpacity key={d} style={[styles.dayCell, isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]} onPress={() => setSelectedDate(dateStr)}>
          <Text style={[styles.dayNum, isToday && styles.dayNumToday, isSelected && styles.dayNumSelected]}>{d}</Text>
          {dayEvents.length > 0 && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );
    }
    return cells;
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}><Ionicons name="add" size={20} color={colors.primary} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
          <Text style={styles.monthText}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth}><Ionicons name="chevron-forward" size={22} color={colors.text} /></TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>{DAYS.map(d => <Text key={d} style={styles.dayHeader}>{d}</Text>)}</View>

        {/* Calendar Grid */}
        <View style={styles.calGrid}>{renderCalendarGrid()}</View>

        {/* Selected Date Events */}
        {selectedDate && (
          <View style={styles.eventsSection}>
            <Text style={styles.eventsTitle}>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            {selectedEvents.length > 0 ? selectedEvents.map(ev => (
              <View key={ev._id} style={styles.eventCard}>
                <View style={[styles.eventColor, { backgroundColor: ev.category === 'Shoot' ? colors.primary : ev.category === 'Meeting' ? colors.info : colors.success }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  {ev.notes && <Text style={styles.eventNotes}>{ev.notes}</Text>}
                  <Text style={styles.eventCat}>{ev.category || 'Event'}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteEvent(ev._id)}><Ionicons name="trash-outline" size={16} color={colors.error} /></TouchableOpacity>
              </View>
            )) : <Text style={styles.noEvents}>No events</Text>}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Event Modal */}
      {showAddModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Event</Text>
            <Text style={styles.modalDate}>{selectedDate || 'Select a date first'}</Text>
            <TextInput style={styles.modalInput} placeholder="Event title" placeholderTextColor={colors.textMuted} value={newEvent.title} onChangeText={t => setNewEvent({ ...newEvent, title: t })} selectionColor={colors.primary} />
            <TextInput style={[styles.modalInput, { height: 60 }]} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} value={newEvent.notes} onChangeText={t => setNewEvent({ ...newEvent, notes: t })} multiline selectionColor={colors.primary} />
            <View style={styles.catRow}>
              {['Shoot', 'Meeting', 'Travel', 'Personal'].map(c => (
                <TouchableOpacity key={c} style={[styles.catChip, newEvent.category === c && styles.catChipActive]} onPress={() => setNewEvent({ ...newEvent, category: c })}>
                  <Text style={[styles.catChipText, newEvent.category === c && styles.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addEvent}><Text style={styles.saveText}>Add Event</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  monthText: { ...typography.headlineMd, color: colors.text },
  dayHeaders: { flexDirection: 'row', paddingHorizontal: spacing.md },
  dayHeader: { flex: 1, textAlign: 'center', ...typography.labelSm, color: colors.primary, paddingVertical: spacing.sm },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellToday: { backgroundColor: colors.primaryMuted, borderRadius: radius.full },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: radius.full },
  dayNum: { ...typography.bodyMd, color: colors.text },
  dayNumToday: { color: colors.primary, fontWeight: '700' },
  dayNumSelected: { color: colors.textInverse, fontWeight: '700' },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 },
  eventsSection: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  eventsTitle: { ...typography.headlineSm, color: colors.text, marginBottom: spacing.md },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  eventColor: { width: 4, height: 32, borderRadius: 2, marginRight: spacing.md },
  eventInfo: { flex: 1 },
  eventTitle: { ...typography.headlineSm, color: colors.text },
  eventNotes: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  eventCat: { ...typography.labelSm, color: colors.primary, marginTop: spacing.xs },
  noEvents: { ...typography.bodyMd, color: colors.textMuted },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl, zIndex: 100 },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.headlineLg, color: colors.text, marginBottom: spacing.xs },
  modalDate: { ...typography.bodySm, color: colors.primary, marginBottom: spacing.xl },
  modalInput: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.bodyMd, color: colors.text, marginBottom: spacing.md },
  catRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  catChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  catChipText: { ...typography.labelSm, color: colors.textMuted },
  catChipTextActive: { color: colors.primary },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  cancelText: { ...typography.labelLg, color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  saveText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
});
