/**
 * AdminSubscriptions — Redirects to Business Model (old subscription UI removed)
 * All subscription settings are now managed from Business Model.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminSubscriptions({ navigation }: any) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.title}>Subscriptions</Text>
      </View>

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Ionicons name="swap-horizontal" size={36} color="#6C3BFF" />
        </View>
        <Text style={s.heading}>Moved to Business Model</Text>
        <Text style={s.desc}>
          Subscription settings are now managed from the Business Model page.{'\n\n'}
          You can control:{'\n'}
          • Monthly subscription price{'\n'}
          • Free lead/booking limit{'\n'}
          • Per-lead unlock price{'\n'}
          • Enable/disable subscriptions{'\n'}
          • Subscription duration
        </Text>
        <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('AdminBusinessModel')} activeOpacity={0.85}>
          <Ionicons name="options" size={18} color="#FFFFFF" />
          <Text style={s.btnText}>Open Business Model Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 13, color: '#6B7280', lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6C3BFF', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
