import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { setNavigationRef } from './navigationService';

import CustomerNavigator from './CustomerNavigator';
import CreatorNavigator from './CreatorNavigator';
import AdminNavigator from './AdminNavigator';
import GuestNavigator from './GuestNavigator';
import SuspendedScreen from '../screens/SuspendedScreen';

const navTheme = {
  dark: false,
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
    <NavigationContainer
      theme={navTheme}
      ref={(ref) => { if (ref) setNavigationRef(ref); }}
      onUnhandledAction={(action) => {
        // Suppress GO_BACK warnings when there's no screen to go back to
        // This prevents the yellow warning box in development
        if (__DEV__) {
          console.log('[Nav] Unhandled action:', action.type, '— suppressed');
        }
      }}
    >
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

// Professional pending/rejected/suspended screen for creators
function PendingApprovalScreen({ status }: { status: string }) {
  const { logout } = useAuth();
  const config = {
    pending: { icon: 'hourglass-outline', iconColor: '#F59E0B', title: 'Account Under Review', subtitle: 'Your creator account is being reviewed by our team. This usually takes 24-48 hours. You will be notified once approved.', bgColor: '#FFFBEB' },
    rejected: { icon: 'close-circle-outline', iconColor: '#EF4444', title: 'Account Rejected', subtitle: 'Your creator account application has been rejected. This may be due to incomplete information or policy violations. Please contact support for details.', bgColor: '#FEF2F2' },
    suspended: { icon: 'ban-outline', iconColor: '#EF4444', title: 'Account Suspended', subtitle: 'Your account has been suspended by the BookMyShot team. Please contact support to resolve this issue.', bgColor: '#FEF2F2' },
    deleted: { icon: 'trash-outline', iconColor: '#6B7280', title: 'Account Not Found', subtitle: 'This account may have been deleted or does not exist. You can create a new account to get started.', bgColor: '#F3F4F6' },
  }[status] || { icon: 'alert-circle-outline', iconColor: '#F59E0B', title: 'Account Status Unknown', subtitle: 'Please try logging out and back in. If the issue persists, contact support.', bgColor: '#FFFBEB' };

  return (
    <View style={styles.pending}>
      <View style={[styles.pendingIcon, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={40} color={config.iconColor} />
      </View>
      <Text style={styles.pendingTitle}>{config.title}</Text>
      <Text style={styles.pendingSub}>{config.subtitle}</Text>

      <TouchableOpacity style={[styles.pendingBtn, { backgroundColor: '#6C3BFF' }]} onPress={() => Linking.openURL('mailto:support@bookmyshot.in?subject=Account Help')}>
        <Text style={styles.pendingBtnText}>Contact Support</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.pendingBtn, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', marginTop: 12 }]} onPress={logout}>
        <Text style={[styles.pendingBtnText, { color: '#6B7280' }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pending: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  pendingIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pendingTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  pendingSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 10, lineHeight: 20 },
  pendingBtn: { marginTop: 30, backgroundColor: '#6C3BFF', borderWidth: 1, borderColor: '#6C3BFF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  pendingBtnText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
});
