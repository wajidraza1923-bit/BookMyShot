/**
 * CreatorPendingScreen — Shown when creator has submitted details 
 * but is awaiting admin verification/approval.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function CreatorPendingScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh every 30 seconds to check if approved
  useEffect(() => {
    const interval = setInterval(() => { refreshUser(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  const statusText = user?.creatorStatus === 'rejected'
    ? 'Your application was not approved. Please contact support.'
    : 'Your profile is under review by our admin team. You will be notified once approved.';

  const statusIcon = user?.creatorStatus === 'rejected' ? 'close-circle' : 'time';
  const statusColor = user?.creatorStatus === 'rejected' ? '#EF4444' : '#F59E0B';

  return (
    <View style={s.container}>
      <View style={s.content}>
        <View style={[s.iconWrap, { borderColor: statusColor + '30' }]}>
          <Ionicons name={statusIcon} size={48} color={statusColor} />
        </View>

        <Text style={s.title}>
          {user?.creatorStatus === 'rejected' ? 'Application Not Approved' : 'Account Under Verification'}
        </Text>
        <Text style={s.message}>{statusText}</Text>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={s.infoText}>{user?.name || 'Creator'}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" />
            <Text style={s.infoText}>{user?.email || ''}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
            <Text style={s.infoText}>Status: {user?.creatorStatus === 'rejected' ? 'Rejected' : 'Pending Review'}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
          {refreshing ? <ActivityIndicator color="#7C3AED" size="small" /> : (
            <>
              <Ionicons name="refresh" size={16} color="#7C3AED" />
              <Text style={s.refreshBtnText}>Check Status</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          <Text style={s.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FEF3C7', borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 10 },
  message: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  infoCard: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, gap: 12, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 13, color: '#4B5563' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3E8FF', marginBottom: 12 },
  refreshBtnText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FEF2F2' },
  logoutBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
});
