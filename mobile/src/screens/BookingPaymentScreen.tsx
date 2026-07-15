import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import RazorpayWebCheckout from '../components/RazorpayWebCheckout';

export default function BookingPaymentScreen({ route, navigation }: any) {
  const { bookingId } = route.params || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [rpConfig, setRpConfig] = useState<any>(null);

  useEffect(() => { if (bookingId) loadPaymentDetails(); }, [bookingId]);

  const loadPaymentDetails = async () => {
    try {
      const res = await api.get(`/booking-fee/calculate/${bookingId}`);
      if (res.data?.data) setData(res.data.data);
    } catch { Alert.alert('Error', 'Could not load booking details'); }
    finally { setLoading(false); }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const orderRes = await api.post(`/booking-fee/create-order/${bookingId}`);
      const order = orderRes.data?.data;
      if (!order) { Alert.alert('Error', 'Could not create payment order'); setPaying(false); return; }

      // Open real Razorpay checkout
      setRpConfig({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        name: 'BookMyShot',
        description: `5% Advance Booking Fee`,
        prefill: {
          name: order.customerName || '',
          email: order.customerEmail || '',
          contact: order.customerPhone || '',
        },
      });
      setShowRazorpay(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Payment failed');
      setPaying(false);
    }
  };

  const handleRazorpaySuccess = async (paymentData: any) => {
    setShowRazorpay(false);
    try {
      await api.post(`/booking-fee/verify/${bookingId}`, {
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_signature: paymentData.razorpay_signature,
      });
      setPaid(true);
      Alert.alert('✅ Success', 'Booking confirmed! Advance payment received.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Payment verification failed');
    }
    setPaying(false);
  };

  const handleRazorpayError = () => {
    setShowRazorpay(false);
    setPaying(false);
    Alert.alert('Payment Cancelled', 'You can try again anytime.');
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#6C3BFF" /></View>;
  if (!data) return <View style={s.center}><Text style={s.errorText}>Booking not found</Text></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Booking Payment</Text>
        </View>

        {/* Booking Summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Booking Summary</Text>
          <View style={s.row}><Text style={s.rowLabel}>Creator</Text><Text style={s.rowValue}>{data.creatorName}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Service</Text><Text style={s.rowValue}>{data.service}</Text></View>
          {data.eventDate && <View style={s.row}><Text style={s.rowLabel}>Event Date</Text><Text style={s.rowValue}>{new Date(data.eventDate).toLocaleDateString('en-IN')}</Text></View>}
          {data.eventLocation && <View style={s.row}><Text style={s.rowLabel}>Location</Text><Text style={s.rowValue}>{data.eventLocation}</Text></View>}
          <View style={s.divider} />
          <View style={s.row}><Text style={s.rowLabel}>Total Booking Amount</Text><Text style={[s.rowValue, s.bold]}>₹{Number(data.totalAmount).toLocaleString('en-IN')}</Text></View>
        </View>

        {/* Payment Breakdown */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Payment Breakdown</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Advance Booking Amount (5%)</Text>
            <Text style={[s.rowValue, s.purple, s.bold]}>₹{Number(data.bookingFee).toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Remaining (95%) — Pay to Creator</Text>
            <Text style={s.rowValue}>₹{Number(data.remainingAmount).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Info Notice */}
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark" size={18} color="#6C3BFF" />
          <Text style={s.infoText}>
            You are paying only a <Text style={s.bold}>5% advance</Text> to confirm your booking with the creator. The remaining <Text style={s.bold}>95% (₹{Number(data.remainingAmount).toLocaleString('en-IN')})</Text> must be paid directly to the creator as per your agreed terms. BookMyShot does not collect the remaining payment.
          </Text>
        </View>

        {/* Non-refundable notice */}
        <View style={s.warningCard}>
          <Ionicons name="information-circle" size={16} color="#F59E0B" />
          <Text style={s.warningText}>This advance is non-refundable once the booking is confirmed by the creator.</Text>
        </View>

        {/* Pay Button or Success */}
        {paid || data.feeStatus === 'paid' ? (
          <View style={s.successCard}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <Text style={s.successTitle}>Booking Confirmed!</Text>
            <Text style={s.successSub}>Advance payment received successfully.</Text>
            <TouchableOpacity style={s.viewBookingBtn} onPress={() => navigation.goBack()}>
              <Text style={s.viewBookingText}>View Booking</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.payBtn} onPress={handlePay} disabled={paying} activeOpacity={0.85}>
            {paying ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="card-outline" size={18} color="#fff" />
                <Text style={s.payBtnText}>Pay Advance ₹{Number(data.bookingFee).toLocaleString('en-IN')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Razorpay Checkout */}
      {showRazorpay && rpConfig && (
        <RazorpayWebCheckout
          keyId={rpConfig.keyId}
          orderId={rpConfig.orderId}
          amount={rpConfig.amount}
          name={rpConfig.name}
          description={rpConfig.description}
          prefill={rpConfig.prefill}
          onSuccess={handleRazorpaySuccess}
          onError={handleRazorpayError}
          onDismiss={handleRazorpayError}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  errorText: { fontSize: 14, color: '#6B7280' },
  scroll: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  // Cards
  card: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 12, color: '#1F2937', textAlign: 'right' },
  bold: { fontWeight: '700' },
  purple: { color: '#6C3BFF' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  // Info
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginTop: 16, backgroundColor: '#F8F6FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE9FE' },
  infoText: { fontSize: 11, color: '#4B5563', lineHeight: 17, flex: 1 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 10, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  warningText: { fontSize: 10, color: '#92400E', flex: 1 },
  // Success
  successCard: { alignItems: 'center', marginHorizontal: 20, marginTop: 24, backgroundColor: '#ECFDF5', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#D1FAE5' },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#065F46', marginTop: 10 },
  successSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  viewBookingBtn: { marginTop: 16, backgroundColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  viewBookingText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  // Pay Button
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 24, backgroundColor: '#6C3BFF', borderRadius: 16, paddingVertical: 16, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  payBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

