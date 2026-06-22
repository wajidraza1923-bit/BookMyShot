import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import CustomerNavigator from './CustomerNavigator';
import CreatorNavigator from './CreatorNavigator';
import AdminNavigator from './AdminNavigator';
import GuestNavigator from './GuestNavigator';

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
    
    // Check if creator is pending approval
    if (role === 'creator' && user?.creatorStatus && user.creatorStatus !== 'approved') {
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
