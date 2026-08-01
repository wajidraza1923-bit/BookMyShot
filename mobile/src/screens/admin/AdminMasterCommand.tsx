import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminMasterCommand({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [savingSupport, setSavingSupport] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);
  const [savingCashback, setSavingCashback] = useState(false);
  const [savingOffers, setSavingOffers] = useState(false);
  const [savingSub, setSavingSub] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [bookingCommission, setBookingCommission] = useState('');
  const [cashbackPercentage, setCashbackPercentage] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [cashbackDays, setCashbackDays] = useState('');
  const [creatorCbPercent, setCreatorCbPercent] = useState('');
  const [subPrice, setSubPrice] = useState('');
  const [yearlyPrice, setYearlyPrice] = useState('');
  const [subMode, setSubMode] = useState<'lead' | 'booking'>('lead');
  const [freeLimit, setFreeLimit] = useState('');
  const [freeBookings, setFreeBookings] = useState('');
  const [perLeadPrice, setPerLeadPrice] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/master-settings');
      const data = res.data?.data;
      if (data) {
        setSupportEmail(data.supportEmail || '');
        setSupportPhone(data.supportPhone || '');
        setBookingCommission(String(data.bookingCommission ?? '2.5'));
        setCashbackPercentage(String(data.cashbackPercentage ?? '2.5'));
        setDiscountPercentage(String(data.discountPercentage ?? '10'));
        setCashbackDays(String(data.cashbackDeadlineDays ?? '30'));
        setCreatorCbPercent(String(data.creatorCashbackPercent ?? '4'));
        setSubPrice(String(data.monthlySubscriptionPrice ?? '199'));
        setYearlyPrice(String(data.yearlySubscriptionPrice ?? '1499'));
        setSubMode(data.subscriptionMode || 'lead');
        setFreeLimit(String(data.freeMonthlyLimit ?? '3'));
        setFreeBookings(String(data.freeBookingsLimit ?? '3'));
        setPerLeadPrice(String(data.perLeadUnlockPrice ?? '70'));
      }
    } catch {} finally { setLoading(false); }
  };

  const saveSupport = async () => {
    if (!supportEmail.trim() || !supportPhone.trim()) { Alert.alert('Required', 'Both email and phone are required'); return; }
    setSavingSupport(true);
    try {
      await api.put('/master-settings', { supportEmail: supportEmail.trim(), supportPhone: supportPhone.trim() });
      Alert.alert('✅ Saved', 'Support contact updated across the entire app.');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
    finally { setSavingSupport(false); }
  };

  const saveCommission = async () => {
    const val = parseFloat(bookingCommission);
    if (isNaN(val) || val < 0 || val > 100) { Alert.alert('Invalid', 'Enter a valid percentage (0-100)'); return; }
    setSavingCommission(true);
    try {
      await api.put('/master-settings', { bookingCommission: val });
      Alert.alert('✅ Saved', `Booking commission set to ${val}% globally.`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
    finally { setSavingCommission(false); }
  };

  const saveCashback = async () => {
    const val = parseFloat(cashbackPercentage);
    if (isNaN(val) || val < 0 || val > 100) { Alert.alert('Invalid', 'Enter a valid percentage (0-100)'); return; }
    setSavingCashback(true);
    try {
      await api.put('/master-settings', { cashbackPercentage: val });
      Alert.alert('✅ Saved', `Cashback set to ${val}% globally.`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
    finally { setSavingCashback(false); }
  };

  const saveOffers = async () => {
    const disc = parseFloat(discountPercentage);
    const cb = parseFloat(cashbackPercentage);
    const comm = parseFloat(bookingCommission);
    const days = parseInt(cashbackDays);
    if (isNaN(disc) || disc < 0 || disc > 100) { Alert.alert('Invalid', 'Discount must be 0-100'); return; }
    if (isNaN(cb) || cb < 0 || cb > 100) { Alert.alert('Invalid', 'Cashback must be 0-100'); return; }
    if (isNaN(comm) || comm < 0 || comm > 100) { Alert.alert('Invalid', 'Commission must be 0-100'); return; }
    if (isNaN(days) || days < 1) { Alert.alert('Invalid', 'Deadline must be at least 1 day'); return; }
    setSavingOffers(true);
    try {
      await api.put('/master-settings', { discountPercentage: disc, cashbackPercentage: cb, bookingCommission: comm, cashbackDeadlineDays: days, creatorCashbackPercent: parseFloat(creatorCbPercent) || 4 });
      Alert.alert('✅ Saved', `Offers updated globally:\n• Discount: ${disc}%\n• Customer Cashback: ${cb}%\n• Creator Cashback: ${creatorCbPercent}%\n• Commission: ${comm}%\n• Deadline: ${days} days`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
    finally { setSavingOffers(false); }
  };

  const saveSubscription = async () => {
    const price = parseFloat(subPrice);
    const yPrice = parseFloat(yearlyPrice);
    const limit = parseInt(freeLimit);
    const bLimit = parseInt(freeBookings);
    const leadPrice = parseFloat(perLeadPrice);
    if (isNaN(price) || price < 0) { Alert.alert('Invalid', 'Enter a valid monthly price'); return; }
    if (isNaN(yPrice) || yPrice < 0) { Alert.alert('Invalid', 'Enter a valid yearly price'); return; }
    if (isNaN(limit) || limit < 0) { Alert.alert('Invalid', 'Enter a valid free leads limit'); return; }
    setSavingSub(true);
    try {
      await api.put('/master-settings', { monthlySubscriptionPrice: price, yearlySubscriptionPrice: yPrice, subscriptionMode: subMode, freeMonthlyLimit: limit, freeBookingsLimit: bLimit || 3, perLeadUnlockPrice: leadPrice || 70 });
      Alert.alert('✅ Saved', `Subscription updated:\n• Monthly: ₹${price}\n• Yearly: ₹${yPrice}\n• Free Leads: ${limit}\n• Free Bookings: ${bLimit}\n• Per Lead: ₹${leadPrice}`);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to save'); }
    finally { setSavingSub(false); }
  };

  if (loading) return <View style={s.container}><ActivityIndicator size="large" color="#6C3BFF" style={{ marginTop: 80 }} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.title}>Master Command</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.subtitle}>Global settings — changes apply instantly across the entire app</Text>

        {/* Push Notifications Button */}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF4444', borderRadius: 12, padding: 14, marginBottom: 16 }} onPress={() => navigation.navigate('AdminPushNotifications')}>
          <Ionicons name="notifications" size={18} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 }}>Send Push Notifications</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Module 1: Customer Support */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="headset-outline" size={20} color="#6C3BFF" />
            <Text style={s.cardTitle}>Customer Support</Text>
          </View>
          <Text style={s.cardDesc}>Official support contact shown everywhere in the app</Text>
          <Text style={s.label}>Support Email</Text>
          <View style={s.inputRow}>
            <Ionicons name="mail-outline" size={16} color="#6C3BFF" />
            <TextInput style={s.input} value={supportEmail} onChangeText={setSupportEmail} placeholder="support@bookmyshot.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <Text style={s.label}>Support Phone Number</Text>
          <View style={s.inputRow}>
            <Ionicons name="call-outline" size={16} color="#6C3BFF" />
            <TextInput style={s.input} value={supportPhone} onChangeText={setSupportPhone} placeholder="10-digit number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" maxLength={10} />
          </View>
          <TouchableOpacity style={[s.saveBtn, savingSupport && { opacity: 0.6 }]} onPress={saveSupport} disabled={savingSupport}>
            {savingSupport ? <ActivityIndicator color="#fff" size="small" /> : (<><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={s.saveBtnText}>Update Support Info</Text></>)}
          </TouchableOpacity>
        </View>

        {/* Module 2: Offers & Rewards */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="gift-outline" size={20} color="#F59E0B" />
            <Text style={s.cardTitle}>Offers & Rewards Settings</Text>
          </View>
          <Text style={s.cardDesc}>Controls all offer banners, calculations & promotional displays</Text>

          <Text style={s.label}>Discount Percentage (%)</Text>
          <View style={s.inputRow}>
            <Ionicons name="pricetag-outline" size={16} color="#EF4444" />
            <TextInput style={s.input} value={discountPercentage} onChangeText={setDiscountPercentage} placeholder="e.g. 10" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            <Text style={s.inputSuffix}>%</Text>
          </View>

          <Text style={s.label}>Cashback Percentage (%)</Text>
          <View style={s.inputRow}>
            <Ionicons name="gift-outline" size={16} color="#10B981" />
            <TextInput style={s.input} value={cashbackPercentage} onChangeText={setCashbackPercentage} placeholder="e.g. 5" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            <Text style={s.inputSuffix}>%</Text>
          </View>

          <Text style={s.label}>Booking Commission (%)</Text>
          <View style={s.inputRow}>
            <Ionicons name="cash-outline" size={16} color="#F59E0B" />
            <TextInput style={s.input} value={bookingCommission} onChangeText={setBookingCommission} placeholder="e.g. 2.5" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            <Text style={s.inputSuffix}>%</Text>
          </View>

          <Text style={s.label}>Cashback Deadline (Days)</Text>
          <View style={s.inputRow}>
            <Ionicons name="timer-outline" size={16} color="#EF4444" />
            <TextInput style={s.input} value={cashbackDays} onChangeText={setCashbackDays} placeholder="e.g. 30" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            <Text style={s.inputSuffix}>days</Text>
          </View>

          <Text style={s.hint}>Cashback Policy: Customer must complete full payment within {cashbackDays} days of booking AND creator must accept. If even 1 day late → NO cashback.</Text>

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#F59E0B' }, savingOffers && { opacity: 0.6 }]} onPress={saveOffers} disabled={savingOffers}>
            {savingOffers ? <ActivityIndicator color="#fff" size="small" /> : (<><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={s.saveBtnText}>Update Offers & Commission</Text></>)}
          </TouchableOpacity>
        </View>

        {/* Module 3: Subscription Settings */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="card-outline" size={20} color="#8B5CF6" />
            <Text style={s.cardTitle}>Subscription Settings</Text>
          </View>
          <Text style={s.cardDesc}>Monthly subscription pricing, mode, and free limits for creators</Text>

          <Text style={s.label}>Monthly Subscription Price (₹)</Text>
          <View style={s.inputRow}>
            <Ionicons name="cash-outline" size={16} color="#8B5CF6" />
            <TextInput style={s.input} value={subPrice} onChangeText={setSubPrice} placeholder="e.g. 199" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            <Text style={s.inputSuffix}>₹/mo</Text>
          </View>

          <Text style={s.label}>Yearly Subscription Price (₹)</Text>
          <View style={s.inputRow}>
            <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
            <TextInput style={s.input} value={yearlyPrice} onChangeText={setYearlyPrice} placeholder="e.g. 1499" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            <Text style={s.inputSuffix}>₹/yr</Text>
          </View>

          <Text style={s.label}>Subscription Mode</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity style={[s.modeBtn, subMode === 'lead' && s.modeBtnActive]} onPress={() => setSubMode('lead')}>
              <Ionicons name="mail-outline" size={14} color={subMode === 'lead' ? '#fff' : '#6B7280'} />
              <Text style={[s.modeBtnText, subMode === 'lead' && s.modeBtnTextActive]}>Lead-Based{'\n'}(Inquiry)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modeBtn, subMode === 'booking' && s.modeBtnActive]} onPress={() => setSubMode('booking')}>
              <Ionicons name="calendar-outline" size={14} color={subMode === 'booking' ? '#fff' : '#6B7280'} />
              <Text style={[s.modeBtnText, subMode === 'booking' && s.modeBtnTextActive]}>Booking-Based{'\n'}(Accepted)</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Free Leads / Month</Text>
          <View style={s.inputRow}>
            <Ionicons name="mail-outline" size={16} color="#8B5CF6" />
            <TextInput style={s.input} value={freeLimit} onChangeText={setFreeLimit} placeholder="e.g. 3" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            <Text style={s.inputSuffix}>leads</Text>
          </View>

          <Text style={s.label}>Free Bookings / Month</Text>
          <View style={s.inputRow}>
            <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
            <TextInput style={s.input} value={freeBookings} onChangeText={setFreeBookings} placeholder="e.g. 3" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            <Text style={s.inputSuffix}>bookings</Text>
          </View>

          <Text style={s.label}>Per Lead Unlock Price (₹)</Text>
          <View style={s.inputRow}>
            <Ionicons name="lock-open-outline" size={16} color="#8B5CF6" />
            <TextInput style={s.input} value={perLeadPrice} onChangeText={setPerLeadPrice} placeholder="e.g. 70" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            <Text style={s.inputSuffix}>₹</Text>
          </View>

          <Text style={s.hint}>Creators get {freeLimit} free leads + {freeBookings} free bookings/month. After that: Subscribe ₹{subPrice}/mo or unlock ₹{perLeadPrice}/lead</Text>

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#8B5CF6' }, savingSub && { opacity: 0.6 }]} onPress={saveSubscription} disabled={savingSub}>
            {savingSub ? <ActivityIndicator color="#fff" size="small" /> : (<><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={s.saveBtnText}>Update Subscription Settings</Text></>)}
          </TouchableOpacity>
        </View>

        {/* Module 4: Creator Cashback Settings */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="sparkles-outline" size={20} color="#10B981" />
            <Text style={s.cardTitle}>Creator Cashback Settings</Text>
          </View>
          <Text style={s.cardDesc}>Controls cashback distribution between customer and creator</Text>

          <Text style={s.label}>Customer Cashback (%)</Text>
          <View style={s.inputRow}>
            <Ionicons name="person-outline" size={16} color="#10B981" />
            <TextInput style={s.input} value={cashbackPercentage} onChangeText={setCashbackPercentage} placeholder="e.g. 5" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            <Text style={s.inputSuffix}>%</Text>
          </View>

          <Text style={s.label}>Creator Cashback (% — when customer misses deadline)</Text>
          <View style={s.inputRow}>
            <Ionicons name="camera-outline" size={16} color="#8B5CF6" />
            <TextInput style={s.input} value={creatorCbPercent} onChangeText={setCreatorCbPercent} placeholder="e.g. 4" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            <Text style={s.inputSuffix}>%</Text>
          </View>

          <Text style={s.hint}>If customer pays on time → gets {cashbackPercentage}% cashback. If late → Creator gets {creatorCbPercent}% cashback instead.</Text>

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#10B981' }, savingOffers && { opacity: 0.6 }]} onPress={async () => {
            const cb = parseFloat(cashbackPercentage);
            const ccb = parseFloat(creatorCbPercent);
            if (isNaN(cb) || cb < 0 || cb > 100) { Alert.alert('Invalid', 'Customer cashback must be 0-100%'); return; }
            if (isNaN(ccb) || ccb < 0 || ccb > 100) { Alert.alert('Invalid', 'Creator cashback must be 0-100%'); return; }
            setSavingOffers(true);
            try {
              await api.put('/master-settings', { cashbackPercentage: cb, creatorCashbackPercent: ccb, customerCashbackPercent: cb });
              Alert.alert('✅ Saved', `Cashback updated:\n• Customer: ${cb}%\n• Creator (deadline missed): ${ccb}%`);
            } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
            finally { setSavingOffers(false); }
          }} disabled={savingOffers}>
            {savingOffers ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={s.saveBtnText}>Save Cashback Settings</Text></>}
          </TouchableOpacity>
        </View>

        <Text style={s.footerNote}>All values sync instantly across:{'\n'}Home • Bookings • Dashboard • Invoices • Wallet • FAQ • Footer • Notifications</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  scroll: { padding: 20, paddingBottom: 60 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  card: { backgroundColor: '#FAFBFC', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
  inputSuffix: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  hint: { fontSize: 11, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6C3BFF', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  modeBtnActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  modeBtnTextActive: { color: '#FFFFFF' },
  footerNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 18, marginTop: 10 },
});
