import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

export default function CreatorBackup({ navigation }: any) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeBookings, setIncludeBookings] = useState(true);
  const [includePayments, setIncludePayments] = useState(true);
  const [includeInquiries, setIncludeInquiries] = useState(true);
  const [includeWallet, setIncludeWallet] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pickingDate, setPickingDate] = useState<'from' | 'to' | null>(null);

  const requestBackup = async () => {
    if (!includeBookings && !includePayments && !includeInquiries && !includeWallet) {
      Alert.alert('Select Data', 'Please select at least one data category to backup.');
      return;
    }

    // Validate date format if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateFrom && !dateRegex.test(dateFrom)) {
      Alert.alert('Invalid Date', 'From date must be in YYYY-MM-DD format.');
      return;
    }
    if (dateTo && !dateRegex.test(dateTo)) {
      Alert.alert('Invalid Date', 'To date must be in YYYY-MM-DD format.');
      return;
    }

    setLoading(true);
    setSuccess(false);
    try {
      const body: any = { includeBookings, includePayments, includeInquiries, includeWallet };
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;

      await api.post('/creator/backup', body);
      setSuccess(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to request backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ToggleItem = ({
    label,
    icon,
    value,
    onToggle,
  }: {
    label: string;
    icon: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.toggleLeft}>
        <View style={[styles.toggleIcon, value && styles.toggleIconActive]}>
          <Ionicons name={icon as any} size={16} color={value ? colors.primary : colors.textMuted} />
        </View>
        <Text style={[styles.toggleLabel, !value && styles.toggleLabelMuted]}>{label}</Text>
      </View>
      <View style={[styles.checkbox, value && styles.checkboxActive]}>
        {value && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Data Backup</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={styles.infoText}>
            Backup report with all data will be sent to your registered email. You can save/print it as PDF from your email.
          </Text>
        </View>

        {/* Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range (Optional)</Text>
          <Text style={styles.sectionSubtitle}>Leave empty for all-time data</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateField} onPress={() => { if (!dateFrom) setDateFrom(new Date().toISOString().split('T')[0]); setPickingDate('from'); }}>
              <Text style={styles.dateLabel}>From</Text>
              <View style={[styles.dateInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={{ flex: 1, fontSize: 13, color: dateFrom ? colors.text : colors.textMuted }}>{dateFrom || 'Select date'}</Text>
                {dateFrom ? <TouchableOpacity onPress={() => setDateFrom('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
              </View>
            </TouchableOpacity>
            <View style={styles.dateSeparator}>
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            </View>
            <TouchableOpacity style={styles.dateField} onPress={() => { if (!dateTo) setDateTo(new Date().toISOString().split('T')[0]); setPickingDate('to'); }}>
              <Text style={styles.dateLabel}>To</Text>
              <View style={[styles.dateInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={{ flex: 1, fontSize: 13, color: dateTo ? colors.text : colors.textMuted }}>{dateTo || 'Select date'}</Text>
                {dateTo ? <TouchableOpacity onPress={() => setDateTo('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
              </View>
            </TouchableOpacity>
          </View>
          {/* Simple date editor */}
          {pickingDate && (
            <View style={{ marginTop: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Enter {pickingDate === 'from' ? 'From' : 'To'} Date</Text>
              <TextInput style={[styles.dateInput, { marginBottom: 8 }]} value={pickingDate === 'from' ? dateFrom : dateTo} onChangeText={v => pickingDate === 'from' ? setDateFrom(v) : setDateTo(v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={10} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' }} onPress={() => { const d = new Date(); d.setDate(d.getDate() - 7); const v = d.toISOString().split('T')[0]; pickingDate === 'from' ? setDateFrom(v) : setDateTo(v); }}><Text style={{ fontSize: 11, color: colors.text }}>7 days ago</Text></TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' }} onPress={() => { const d = new Date(); d.setDate(d.getDate() - 30); const v = d.toISOString().split('T')[0]; pickingDate === 'from' ? setDateFrom(v) : setDateTo(v); }}><Text style={{ fontSize: 11, color: colors.text }}>30 days ago</Text></TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' }} onPress={() => { const v = new Date().toISOString().split('T')[0]; pickingDate === 'from' ? setDateFrom(v) : setDateTo(v); }}><Text style={{ fontSize: 11, color: colors.text }}>Today</Text></TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }} onPress={() => setPickingDate(null)}><Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>Done</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Data Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Include in Backup</Text>
          <Text style={styles.sectionSubtitle}>Select the data you want to export</Text>
          <View style={styles.toggleList}>
            <ToggleItem
              label="Bookings"
              icon="calendar-outline"
              value={includeBookings}
              onToggle={() => setIncludeBookings(!includeBookings)}
            />
            <ToggleItem
              label="Payments"
              icon="card-outline"
              value={includePayments}
              onToggle={() => setIncludePayments(!includePayments)}
            />
            <ToggleItem
              label="Inquiries"
              icon="mail-outline"
              value={includeInquiries}
              onToggle={() => setIncludeInquiries(!includeInquiries)}
            />
            <ToggleItem
              label="Wallet Transactions"
              icon="wallet-outline"
              value={includeWallet}
              onToggle={() => setIncludeWallet(!includeWallet)}
            />
          </View>
        </View>

        {/* Success Message */}
        {success && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>
              Backup sent successfully! Check your email.
            </Text>
          </View>
        )}

        {/* Request Button */}
        <TouchableOpacity
          style={[styles.requestBtn, loading && styles.requestBtnDisabled]}
          onPress={requestBackup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="mail-outline" size={18} color="#fff" />
              <Text style={styles.requestBtnText}>Send to Email</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Download PDF Button */}
        <TouchableOpacity
          style={[styles.requestBtn, { backgroundColor: '#1F2937', marginTop: -8 }]}
          onPress={async () => {
            if (!includeBookings && !includePayments && !includeInquiries && !includeWallet) {
              Alert.alert('Select Data', 'Select at least one category'); return;
            }
            setLoading(true);
            try {
              const body: any = { includeBookings, includePayments, includeInquiries, includeWallet, returnHtml: true };
              if (dateFrom) body.dateFrom = dateFrom;
              if (dateTo) body.dateTo = dateTo;
              
              console.log('[Backup] Requesting HTML for PDF...');
              const res = await api.post('/creator/backup', body);
              console.log('[Backup] Response keys:', Object.keys(res.data || {}));
              
              const html = res.data?.html;
              if (!html || html.length < 50) {
                Alert.alert('Error', 'Server returned empty data. Try again.');
                setLoading(false);
                return;
              }
              
              console.log('[Backup] HTML received, length:', html.length);
              const Print = require('expo-print');
              const Sharing = require('expo-sharing');
              
              const result = await Print.printToFileAsync({ html, base64: false });
              console.log('[Backup] PDF generated:', result?.uri);
              
              if (result?.uri) {
                const available = await Sharing.isAvailableAsync();
                if (available) {
                  await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'BookMyShot Backup' });
                } else {
                  await Print.printAsync({ html });
                }
              } else {
                // Fallback: just print directly
                await Print.printAsync({ html });
              }
            } catch (e: any) {
              console.log('[Backup] PDF error:', e.message, e.response?.status, e.response?.data?.message);
              Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to generate PDF. Try Send to Email instead.');
            }
            finally { setLoading(false); }
          }}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.requestBtnText}>Download as PDF</Text>
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.noteText}>
          Send to Email: delivers backup report to your registered email.{'\n'}Download PDF: generates a PDF file on your device.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.info,
    flex: 1,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: 2,
  },
  sectionSubtitle: {
    ...typography.bodySm,
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    ...typography.labelSm,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
  },
  dateSeparator: {
    paddingTop: 18,
  },
  toggleList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconActive: {
    backgroundColor: colors.primaryMuted,
  },
  toggleLabel: {
    ...typography.labelLg,
  },
  toggleLabelMuted: {
    color: colors.textMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  successText: {
    ...typography.bodyMd,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  requestBtnDisabled: {
    opacity: 0.7,
  },
  requestBtnText: {
    ...typography.btnLg,
    color: '#fff',
  },
  noteText: {
    ...typography.bodySm,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
