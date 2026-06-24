import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import CustomerNavigator from './CustomerNavigator';
import CreatorNavigator from './CreatorNavigator';
import AdminNavigator from './AdminNavigator';
import GuestNavigator from './GuestNavigator';
import SuspendedScreen from '../screens/SuspendedScreen';

const navTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

export default function RootNavigator() {
  const { isLoading, isAuthenticated, role, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getNavigator = () => {
    if (!isAuthenticated) return <GuestNavigator />;
    
    // Check if creator needs to complete payment or is pending approval
    if (role === 'creator' && user?.creatorStatus && user.creatorStatus !== 'approved') {
      // If subscription not paid yet, show payment required screen
      if (user.subscriptionStatus === 'pending_payment') {
        return <PaymentRequiredScreen />;
      }
      // If suspended, show detailed suspension screen with Pay Now
      if (user.creatorStatus === 'suspended') {
        return <SuspendedScreen />;
      }
      // Otherwise show pending approval / rejected screen
      return <PendingApprovalScreen status={user.creatorStatus} />;
    }
    
    switch (role) {
      case 'creator': return <CreatorNavigator />;
      case 'admin': return <AdminNavigator />;
      default: return <CustomerNavigator />;
    }
  };

  return (
    <NavigationContainer theme={navTheme}>
      {getNavigator()}
    </NavigationContainer>
  );
}

// Payment required screen for creators who haven't paid subscription
function PaymentRequiredScreen() {
  const { logout, refreshUser } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { getRazorpayConfig, createSubscription, isNativeRazorpayAvailable, openRazorpaySubscription, verifySubscription } = require('../services/payment');
      const rpConfig = await getRazorpayConfig();

      if (!rpConfig.configured) {
        // In dev mode or if Razorpay not configured, simulate payment for testing
        const api = require('../services/api').default;
        await api.post('/razorpay/simulate-payment');
        await refreshUser();
        return;
      }

      const subRes = await createSubscription();
      if (subRes.status === 'active') {
        await refreshUser();
        return;
      }

      if (!subRes.subscriptionId) {
        Alert.alert('Error', 'Failed to create subscription. Try again.');
        return;
      }

      if (isNativeRazorpayAvailable()) {
        const api = require('../services/api').default;
        const meRes = await api.get('/auth/me');
        const user = meRes.data?.user;
        const paymentResult = await openRazorpaySubscription(rpConfig.keyId, subRes.subscriptionId, user?.name || '', user?.email || '');
        const verified = await verifySubscription(paymentResult.razorpay_subscription_id, paymentResult.razorpay_payment_id, paymentResult.razorpay_signature);
        if (verified) {
          Alert.alert('Success! 🎉', 'Subscription activated! Your account is now pending admin approval.');
          await refreshUser();
        }
      } else {
        Alert.alert('Payment', `Razorpay checkout is only available in the production APK.\n\nSubscription ID: ${subRes.subscriptionId}\n\nPlease use the website to complete payment, or install the production APK.`);
      }
    } catch (e: any) {
      if (e.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Cancelled', 'Payment was cancelled.');
      } else {
        Alert.alert('Error', e.message || 'Payment failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.pending}>
      <View style={[styles.pendingIcon, { backgroundColor: 'rgba(249,115,22,0.08)' }]}><Ionicons name="card-outline" size={40} color="#F97316" /></View>
      <Text style={styles.pendingTitle}>Subscription Required</Text>
      <Text style={styles.pendingSub}>Complete your subscription payment to activate your creator account. After payment, your account will be reviewed by our team.</Text>
      <TouchableOpacity style={[styles.pendingBtn, { backgroundColor: '#F97316', borderColor: '#F97316' }]} onPress={handlePayment} disabled={loading}>
        <Text style={[styles.pendingBtnText, { color: '#000', fontWeight: '700' }]}>{loading ? 'Processing...' : 'Pay & Subscribe'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.pendingBtn, { marginTop: 12 }]} onPress={logout}><Text style={styles.pendingBtnText}>Logout</Text></TouchableOpacity>
    </View>
  );
}

// Simple pending approval screen for creators waiting for admin
function PendingApprovalScreen({ status }: { status: string }) {
  const { logout } = useAuth();
  return (
    <View style={styles.pending}>
      <View style={styles.pendingIcon}><Ionicons name="hourglass-outline" size={40} color="#F97316" /></View>
      <Text style={styles.pendingTitle}>Account {status === 'pending' ? 'Pending Approval' : status === 'rejected' ? 'Rejected' : 'Suspended'}</Text>
      <Text style={styles.pendingSub}>{status === 'pending' ? 'Your creator account is being reviewed by our team. You will be notified once approved.' : status === 'rejected' ? 'Your creator account has been rejected. Please contact support.' : 'Your account has been suspended. Please contact support.'}</Text>
      <TouchableOpacity style={styles.pendingBtn} onPress={logout}><Text style={styles.pendingBtnText}>Logout</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  pending: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  pendingIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(249,115,22,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pendingTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  pendingSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 10, lineHeight: 20 },
  pendingBtn: { marginTop: 30, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  pendingBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});
