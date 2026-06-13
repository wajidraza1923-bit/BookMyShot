import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';
import { mockBookings } from '../constants/mockData';

const tabs = ['Upcoming', 'Completed', 'Cancelled'];

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState('Upcoming');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': case 'upcoming': return colors.success;
      case 'completed': return colors.primary;
      case 'cancelled': return colors.error;
      default: return colors.textMuted;
    }
  };

  const filteredBookings = mockBookings.filter(b => {
    if (activeTab === 'Upcoming') return b.status === 'confirmed' || b.status === 'upcoming';
    if (activeTab === 'Completed') return b.status === 'completed';
    return b.status === 'cancelled';
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity style={styles.calBtn}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filteredBookings.length > 0 ? filteredBookings.map(booking => (
          <View key={booking._id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Image source={{ uri: booking.avatar }} style={styles.bookingAvatar} />
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingCreator}>{booking.creatorName}</Text>
                <Text style={styles.bookingEvent}>{booking.eventType}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '15', borderColor: getStatusColor(booking.status) + '30' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{booking.status}</Text>
              </View>
            </View>

            <View style={styles.bookingDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{new Date(booking.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{booking.location}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.detailText, { color: colors.primary }]}>₹{booking.amount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.bookingActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.actionText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <Text style={styles.actionTextPrimary}>View Details</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /></View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} bookings</Text>
            <Text style={styles.emptySubtitle}>Your {activeTab.toLowerCase()} bookings will appear here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.lg },
  title: { ...typography.displaySm, color: colors.text },
  calBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelMd, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  list: { padding: spacing.xl, paddingBottom: 100 },
  bookingCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  bookingAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.borderGold },
  bookingInfo: { flex: 1, marginLeft: spacing.md },
  bookingCreator: { ...typography.headlineSm, color: colors.text },
  bookingEvent: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1 },
  statusText: { ...typography.labelSm, fontWeight: '600', textTransform: 'capitalize' },
  bookingDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { ...typography.bodySm, color: colors.textSecondary },
  bookingActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  actionBtnPrimary: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.borderGold },
  actionText: { ...typography.labelMd, color: colors.textSecondary },
  actionTextPrimary: { ...typography.labelMd, color: colors.primary },
  empty: { alignItems: 'center', paddingTop: spacing['6xl'] },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  emptyTitle: { ...typography.headlineMd, color: colors.text },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs },
});
