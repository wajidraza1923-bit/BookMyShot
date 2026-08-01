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
      if (res.data?.data) {
        setData(res.data.data);
        // If already paid, set paid state immediately
        if (res.data.data.feeStatus === 'paid') {
          setPaid(true);
        }
      }
    } catch { Alert.alert('Error', 'Could not load booking details'); }
    finally { setLoading(false); }
  };

  const feePercent = data?.bookingFeePercent || 5;
  const remainingPercent = 100 - feePercent;

  const handlePay = async () => {
    // Don't allow re-payment if already paid
    if (paid || data?.feeStatus === 'paid') {
      Alert.alert('Already Paid', 'Advance payment has already been completed for this booking.');
      return;
    }
    setPaying(true);
    try {
      const orderRes = await api.post(`/booking-fee/create-order/${bookingId}`);
      const order = orderRes.data?.data;
      if (!order) { Alert.alert('Error', 'Could not create payment order'); setPaying(false); return; }

      setRpConfig({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        name: 'BookMyShot',
        description: `${feePercent}% Advance Booking Fee`,
        prefillName: order.customerName || '',
        prefillEmail: order.customerEmail || '',
        prefillPhone: order.customerPhone || '',
      });
      setShowRazorpay(true);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Payment failed';
      if (msg.includes('already paid')) {
        setPaid(true);
        Alert.alert('Already Paid', 'Advance payment has already been completed for this booking.');
      } else {
        Alert.alert('Error', msg);
      }
      setPaying(false);
    }
  };

  const handleRazorpaySuccess = async (paymentData: any) => {
    setShowRazorpay(false);
    console.log('[BookingPayment] Razorpay success callback received:', JSON.stringify(paymentData));
    
    // Retry verification up to 3 times (WebView → app context switch can cause timing issues)
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[BookingPayment] Verify attempt ${attempts}/${maxAttempts} for booking ${bookingId}`);
        const verifyRes = await api.post(`/booking-fee/verify/${bookingId}`, {
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_signature: paymentData.razorpay_signature,
        });
        console.log('[BookingPayment] Verify success:', JSON.stringify(verifyRes.data));
        setPaid(true);
        Alert.alert('✅ Booking Confirmed!', 'Your advance payment has been received. The booking is now confirmed.');
        setPaying(false);
        return; // Success — exit retry loop
      } catch (e: any) {
        console.log(`[BookingPayment] Verify attempt ${attempts} failed:`, e.response?.status, e.response?.data, e.message);
        if (attempts < maxAttempts) {
          // Wait before retrying (1s, 2s)
          await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        } else {
          // All retries failed
          const msg = e.response?.data?.message || 'Payment verification failed. Contact support if amount was deducted.';
          if (msg.includes('already paid') || msg.includes('already confirmed')) {
            setPaid(true);
            Alert.alert('✅ Booking Confirmed!', 'Payment was already verified successfully.');
          } else {
            Alert.alert('⚠️ Verification Pending', `Payment was received (ID: ${paymentData.razorpay_payment_id}) but verification failed. Your booking will be confirmed automatically within a few minutes. If not, contact support with payment ID.`);
          }
        }
      }
    }
    setPaying(false);
  };

  const handleRazorpayFailure = (error: any) => {
    setShowRazorpay(false);
    setPaying(false);
    Alert.alert('Payment Failed', error?.description || 'Payment could not be completed. Please try again.');
  };

  const handleRazorpayClose = () => {
    setShowRazorpay(false);
    setPaying(false);
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
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Booking Payment</Text>
        </View>

        {/* Status Badge */}
        <View style={s.statusRow}>
          <View style={[s.statusBadge, paid || data.feeStatus === 'paid' ? s.statusPaid : s.statusPending]}>
            <Ionicons name={paid || data.feeStatus === 'paid' ? 'checkmark-circle' : 'time'} size={14} color={paid || data.feeStatus === 'paid' ? '#065F46' : '#92400E'} />
            <Text style={[s.statusText, paid || data.feeStatus === 'paid' ? { color: '#065F46' } : { color: '#92400E' }]}>
              {paid || data.feeStatus === 'paid' ? 'Advance Payment Completed' : 'Pending Advance Payment'}
            </Text>
          </View>
        </View>

        {/* Booking Summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Booking Summary</Text>
          <View style={s.row}><Text style={s.rowLabel}>Creator</Text><Text style={s.rowValue}>{data.creatorName}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Service</Text><Text style={s.rowValue}>{data.service}</Text></View>
          {data.eventDate && <View style={s.row}><Text style={s.rowLabel}>Event Date</Text><Text style={s.rowValue}>{new Date(data.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text></View>}
          {data.eventLocation && <View style={s.row}><Text style={s.rowLabel}>Location</Text><Text style={s.rowValue}>{data.eventLocation}</Text></View>}
          <View style={s.divider} />
          <View style={s.row}><Text style={s.rowLabel}>Total Booking Amount</Text><Text style={[s.rowValue, s.bold, { fontSize: 14 }]}>₹{Number(data.totalAmount).toLocaleString('en-IN')}</Text></View>
        </View>

        {/* Payment Breakdown */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Payment Breakdown</Text>
          <View style={s.breakdownItem}>
            <View style={s.breakdownLeft}>
              <View style={[s.breakdownDot, { backgroundColor: '#6C3BFF' }]} />
              <View>
                <Text style={s.breakdownLabel}>Advance Booking ({feePercent}%)</Text>
                <Text style={s.breakdownSub}>Pay now to confirm booking</Text>
              </View>
            </View>
            <Text style={[s.breakdownAmount, s.purple]}>₹{Number(data.bookingFee).toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.breakdownItem}>
            <View style={s.breakdownLeft}>
              <View style={[s.breakdownDot, { backgroundColor: '#F59E0B' }]} />
              <View>
                <Text style={s.breakdownLabel}>Remaining ({remainingPercent}%)</Text>
                <Text style={s.breakdownSub}>Pay directly to creator</Text>
              </View>
            </View>
            <Text style={s.breakdownAmount}>₹{Number(data.remainingAmount).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Info Notice */}
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark" size={18} color="#6C3BFF" />
          <Text style={s.infoText}>
            You are paying only a <Text style={s.bold}>{feePercent}% advance</Text> (₹{Number(data.bookingFee).toLocaleString('en-IN')}) to confirm your booking. The remaining <Text style={s.bold}>{remainingPercent}% (₹{Number(data.remainingAmount).toLocaleString('en-IN')})</Text> is payable directly to the creator as per your agreed terms.
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
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            <Text style={s.successTitle}>Booking Confirmed!</Text>
            <Text style={s.successSub}>Advance payment of ₹{Number(data.bookingFee).toLocaleString('en-IN')} received successfully.</Text>
            <Text style={s.successRemaining}>Remaining ₹{Number(data.remainingAmount).toLocaleString('en-IN')} to be paid to creator</Text>
            <TouchableOpacity style={s.viewBookingBtn} onPress={() => navigation.navigate('Bookings')}>
              <Text style={s.viewBookingText}>View My Bookings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.payBtn} onPress={handlePay} disabled={paying} activeOpacity={0.85}>
            {paying ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <Text style={s.payBtnText}>Pay Now ₹{Number(data.bookingFee).toLocaleString('en-IN')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Powered by */}
        <View style={s.poweredBy}>
          <Ionicons name="lock-closed" size={11} color="#9CA3AF" />
          <Text style={s.poweredByText}>Secured by Razorpay</Text>
        </View>
      </ScrollView>

      {/* Razorpay Checkout */}
      {showRazorpay && rpConfig && (
        <RazorpayWebCheckout
          visible={true}
          keyId={rpConfig.keyId}
          orderId={rpConfig.orderId}
          amount={rpConfig.amount}
          name={rpConfig.name}
          description={rpConfig.description}
          prefillName={rpConfig.prefillName}
          prefillEmail={rpConfig.prefillEmail}
          prefillPhone={rpConfig.prefillPhone}
          onSuccess={handleRazorpaySuccess}
          onFailure={handleRazorpayFailure}
          onClose={handleRazorpayClose}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  errorText: { fontSize: 14, color: '#6B7280' },
  scroll: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  // Status
  statusRow: { paddingHorizontal: 20, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPaid: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' },
  statusPending: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  statusText: { fontSize: 11, fontWeight: '600' },
  // Cards
  card: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 12, color: '#1F2937', textAlign: 'right' },
  bold: { fontWeight: '700' },
  purple: { color: '#6C3BFF' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  // Breakdown
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  breakdownSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  breakdownAmount: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  // Info
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginTop: 16, backgroundColor: '#F8F6FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE9FE' },
  infoText: { fontSize: 11, color: '#4B5563', lineHeight: 17, flex: 1 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 10, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  warningText: { fontSize: 10, color: '#92400E', flex: 1 },
  // Success
  successCard: { alignItems: 'center', marginHorizontal: 20, marginTop: 24, backgroundColor: '#ECFDF5', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#D1FAE5' },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#065F46', marginTop: 10 },
  successSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  successRemaining: { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginTop: 8 },
  viewBookingBtn: { marginTop: 16, backgroundColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  viewBookingText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  // Pay Button
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 24, backgroundColor: '#6C3BFF', borderRadius: 16, paddingVertical: 16, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  payBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  // Powered by
  poweredBy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 },
  poweredByText: { fontSize: 10, color: '#9CA3AF' },
});
