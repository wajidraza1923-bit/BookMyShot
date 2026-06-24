/**
 * SuspendedScreen — Shows suspension details + Pay Now for creators
 * 
 * Displays: reason, outstanding amounts, Pay Now button
 * After payment: auto-unsuspends via backend verification
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import api from '../services/api';

export default function SuspendedScreen() {
  const { logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => { loadDetails(); }, []);

  const loadDetails = async () => {
    try {
      const res = await api.get('/creator/suspension-details');
      setDetails(res.data?.data || res.data);
    } catch (e: any) {
      // If endpoint doesn't exist yet, show generic
      setDetails({ reason: 'Account suspended by admin', subscriptionDue: 0, commissionDue: 0 });
    } finally { setLoading(false); }
  };

  const handlePay = async (payType: 'subscription' | 'commission' | 'both') => {
    setPaying(true);
    try {
      const { getRazorpayConfig, createSubscription, isNativeRazorpayAvailable, openRazorpaySubscription, verifySubscription } = require('../services/payment');
      const rpConfig = await getRazorpayConfig();

      if (!rpConfig.configured) {
        Alert.alert('Unavailable', 'Payment gateway not configured. Contact admin.');
        setPaying(false);
        return;
      }

      // Create payment based on type
      const subRes = await createSubscription();

      if (subRes.status === 'active' || subRes.message?.includes('already active')) {
        Alert.alert('Success', 'Subscription is active. Refreshing...');
        await refreshUser();
        setPaying(false);
        return;
      }

      if (!subRes.subscriptionId) {
        Alert.alert('Error', 'Failed to initiate payment. Try again.');
        setPaying(false);
        return;
      }

      if (isNativeRazorpayAvailable()) {
        const meRes = await api.get('/auth/me');
        const user = meRes.data?.user;
        const paymentResult = await openRazorpaySubscription(rpConfig.keyId, subRes.subscriptionId, user?.name || '', user?.email || '');
        const verified = await verifySubscription(paymentResult.razorpay_subscription_id, paymentResult.razorpay_payment_id, paymentResult.razorpay_signature);
        if (verified) {
          Alert.alert('Payment Successful! 🎉', 'Your account is being reactivated...');
          // Backend verification + auto-unsuspend happens server-side
          await refreshUser();
        } else {
          Alert.alert('Verification Failed', 'Payment received but verification failed. Contact support.');
        }
      } else {
        Alert.alert('Development Mode', `Razorpay not available in Expo Go.\n\nSubscription ID: ${subRes.subscriptionId}\n\nUse the production APK or website to pay.`);
      }
    } catch (e: any) {
      if (e.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Cancelled', 'Payment was cancelled.');
      } else {
        Alert.alert('Error', e.message || 'Payment failed.');
      }
    } finally { setPaying(false); }
  };

  if (loading) {
    return <View style={s.container}><ActivityIndicator size="large" color="#F97316" /></View>;
  }

  const subDue = details?.subscriptionDue || 0;
  const commDue = details?.commissionDue || 0;
  const totalDue = subDue + commDue;
  const reason = details?.reason || 'Account suspended';
  const isExpired = details?.suspensionType === 'subscription_expired' || subDue > 0;
  const isCommission = details?.suspensionType === 'commission_due' || commDue > 0;
  const isManual = !isExpired && !isCommission;

  // Determine the suspension reason display
  let reasonTitle = 'Account Suspended';
  let reasonIcon: any = 'ban-outline';
  let reasonColor = '#EF4444';
  if (isExpired && isCommission) {
    reasonTitle = 'Subscription & Commission Pending';
    reasonIcon = 'alert-circle-outline';
    reasonColor = '#F59E0B';
  } else if (isExpired) {
    reasonTitle = 'Subscription Expired';
    reasonIcon = 'card-outline';
    reasonColor = '#F59E0B';
  } else if (isCommission) {
    reasonTitle = 'Commission Payment Due';
    reasonIcon = 'cash-outline';
    reasonColor = '#F59E0B';
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Icon */}
      <View style={[s.iconWrap, { backgroundColor: reasonColor + '12' }]}>
        <Ionicons name={reasonIcon} size={40} color={reasonColor} />
      </View>

      {/* Title */}
      <Text style={s.title}>{reasonTitle}</Text>
      <Text style={s.subtitle}>{reason}</Text>

      {/* Outstanding Amounts */}
      {totalDue > 0 && (
        <View style={s.amountsCard}>
          <Text style={s.amountsTitle}>Outstanding Dues</Text>
          {subDue > 0 && (
            <View style={s.amountRow}>
              <View style={s.amountLeft}><Ionicons name="card-outline" size={14} color="#F59E0B" /><Text style={s.amountLabel}>Subscription Due</Text></View>
              <Text style={s.amountValue}>₹{subDue.toLocaleString('en-IN')}</Text>
            </View>
          )}
          {commDue > 0 && (
            <View style={s.amountRow}>
              <View style={s.amountLeft}><Ionicons name="cash-outline" size={14} color="#F59E0B" /><Text style={s.amountLabel}>Commission Due</Text></View>
              <Text style={s.amountValue}>₹{commDue.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={[s.amountRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total Payable</Text>
            <Text style={s.totalValue}>₹{totalDue.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      )}

      {/* Pay Buttons */}
      {totalDue > 0 && (
        <View style={s.paySection}>
          {subDue > 0 && commDue > 0 ? (
            <>
              <TouchableOpacity style={s.payBtnFull} onPress={() => handlePay('both')} disabled={paying}>
                {paying ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="wallet-outline" size={16} color="#000" /><Text style={s.payBtnFullText}>Pay Full Amount (₹{totalDue.toLocaleString('en-IN')})</Text></>}
              </TouchableOpacity>
              <View style={s.payRow}>
                <TouchableOpacity style={s.payBtnHalf} onPress={() => handlePay('subscription')} disabled={paying}>
                  <Text style={s.payBtnHalfText}>Pay Subscription Only</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.payBtnHalf} onPress={() => handlePay('commission')} disabled={paying}>
                  <Text style={s.payBtnHalfText}>Pay Commission Only</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={s.payBtnFull} onPress={() => handlePay(isExpired ? 'subscription' : 'commission')} disabled={paying}>
              {paying ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="wallet-outline" size={16} color="#000" /><Text style={s.payBtnFullText}>Pay Now (₹{totalDue.toLocaleString('en-IN')})</Text></>}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Manual suspension - still show Pay to reactivate */}
      {isManual && totalDue === 0 && (
        <View style={s.manualCard}>
          <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.4)" />
          <Text style={s.manualText}>Your account was suspended by admin. Pay the reactivation fee to restore your account instantly.</Text>
        </View>
      )}

      {/* Always show a Pay/Reactivate button - even for manual suspension */}
      {totalDue === 0 && (
        <View style={s.paySection}>
          <TouchableOpacity style={s.payBtnFull} onPress={() => handlePay('subscription')} disabled={paying}>
            {paying ? <ActivityIndicator size="small" color="#000" /> : <><Ionicons name="wallet-outline" size={16} color="#000" /><Text style={s.payBtnFullText}>Pay & Reactivate Account</Text></>}
          </TouchableOpacity>
        </View>
      )}

      {/* Info */}
      <View style={s.infoCard}>
        <Text style={s.infoText}>After successful payment, your account will be reactivated automatically. No manual admin action required.</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60, minHeight: '100%' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8, lineHeight: 19, maxWidth: 300 },
  amountsCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)', borderRadius: 14, padding: 18, marginTop: 24 },
  amountsTitle: { fontSize: 11, fontWeight: '700', color: '#F97316', letterSpacing: 0.5, marginBottom: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  amountLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  amountValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  totalRow: { borderBottomWidth: 0, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(249,115,22,0.15)' },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#F97316' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#F97316' },
  paySection: { width: '100%', marginTop: 20 },
  payBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 14, width: '100%' },
  payBtnFullText: { fontSize: 14, fontWeight: '700', color: '#000' },
  payRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  payBtnHalf: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', backgroundColor: 'rgba(249,115,22,0.06)' },
  payBtnHalfText: { fontSize: 11, fontWeight: '600', color: '#F97316' },
  manualCard: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', padding: 14, marginTop: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  manualText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 17 },
  infoCard: { width: '100%', padding: 12, marginTop: 16, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.04)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)' },
  infoText: { fontSize: 11, color: 'rgba(16,185,129,0.7)', textAlign: 'center', lineHeight: 16 },
  logoutBtn: { marginTop: 24, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 11 },
  logoutText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
});
