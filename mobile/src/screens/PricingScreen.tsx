/**
 * PricingScreen — Professional pricing page for BookMyShot
 * Shows plans, commission model, promotions, CRM features, and FAQs.
 * Fetches subscription prices dynamically from admin settings.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function PricingScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState(499);
  const [yearlyPrice, setYearlyPrice] = useState(3999);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const res = await api.get('/admin/subscription-settings');
      if (res.data?.data) {
        setMonthlyPrice(res.data.data.monthlyPlanPrice || 499);
        setYearlyPrice(res.data.data.yearlyPlanPrice || 3999);
      }
    } catch {
      // Use defaults if admin settings unavailable
    } finally {
      setLoading(false);
    }
  };

  const yearlySavings = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

  const FAQs = [
    { q: 'How do free leads work?', a: 'Every new creator gets 3 free leads. When a customer sends you an inquiry, that counts as 1 lead. After 3 leads are used, you need a Premium subscription to receive more.' },
    { q: 'What happens after 3 free leads?', a: 'Your profile stays active but you won\'t receive new inquiries until you upgrade to Premium. Existing conversations continue normally.' },
    { q: 'How is the 5% commission calculated?', a: 'Commission is charged only on the advance payment amount of a confirmed booking. Example: If advance is ₹20,000, commission is ₹1,000. No booking = no commission.' },
    { q: 'How is cashback calculated?', a: 'Cashback = Razorpay Booking Fee × Admin Cashback Percentage. Example: Booking Fee ₹5,000 × 2.5% = ₹125 cashback credited to customer wallet after creator confirms payment within 30 days.' },
    { q: 'When does the customer receive cashback?', a: 'Only after the creator marks "Payment Completed" in their dashboard AND the confirmation is within 30 days of booking date. Once credited, it never expires.' },
    { q: 'Can I cancel my subscription anytime?', a: 'Yes! Cancel anytime from your dashboard. You keep Premium benefits until the end of your billing period. No refund for partial periods.' },
    { q: 'Is there a yearly discount?', a: `Yes! Yearly plan saves you ${yearlySavings}% compared to monthly billing. Pay ₹${yearlyPrice.toLocaleString('en-IN')}/year instead of ₹${(monthlyPrice * 12).toLocaleString('en-IN')}/year.` },
    { q: 'When do I receive payments?', a: 'Customer payments (minus 5% commission) are settled to your bank account within 3-5 business days after the booking advance is received.' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6C3BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pricing</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <LinearGradient colors={['#6C3BFF', '#8B5CF6']} style={styles.hero}>
          <Text style={styles.heroTitle}>Grow Your Wedding Business with BookMyShot</Text>
          <Text style={styles.heroSub}>Get discovered by thousands of customers, receive direct booking inquiries, manage your business with CRM, and grow faster.</Text>
        </LinearGradient>

        {/* ═══ FREE PLAN ═══ */}
        <View style={styles.planCard}>
          <View style={styles.planBadge}><Text style={styles.planBadgeText}>FREE FOREVER</Text></View>
          <Text style={styles.planName}>Free Plan</Text>
          <Text style={styles.planPrice}>₹0</Text>
          <Text style={styles.planPeriod}>Forever Free</Text>
          <View style={styles.divider} />
          <Text style={styles.featureHead}>What's Included:</Text>
          {['3 Free Leads', 'Basic Profile Listing', 'Portfolio Upload', 'Direct Customer Chat', 'Booking Management', 'CRM Dashboard', 'Calendar & Availability'].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          {['Featured Listing', 'Promotions'].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="close-circle" size={16} color="#D1D5DB" />
              <Text style={[styles.featureText, { color: '#9CA3AF' }]}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.freeBtn}>
            <Text style={styles.freeBtnText}>Start Free</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ PREMIUM PLAN ═══ */}
        <LinearGradient colors={['#F8F6FF', '#EDE9FE']} style={styles.premiumCard}>
          <View style={styles.premiumBadgeRow}>
            <View style={styles.premiumBadge}><Ionicons name="diamond" size={12} color="#fff" /><Text style={styles.premiumBadgeText}>PREMIUM</Text></View>
            {yearlySavings > 0 && <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save {yearlySavings}%</Text></View>}
          </View>
          <Text style={styles.planName}>Premium Creator Plan</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceCol}>
              <Text style={styles.premiumPrice}>₹{monthlyPrice.toLocaleString('en-IN')}</Text>
              <Text style={styles.planPeriod}>/month</Text>
            </View>
            <Text style={styles.priceOr}>or</Text>
            <View style={styles.priceCol}>
              <Text style={styles.premiumPrice}>₹{yearlyPrice.toLocaleString('en-IN')}</Text>
              <Text style={styles.planPeriod}>/year</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.featureHead}>Premium Benefits:</Text>
          {['Unlimited Leads', 'Unlimited Booking Requests', 'Featured Creator Badge', 'Higher Search Ranking', 'Premium Profile', 'Priority Customer Support', 'Business Analytics', 'Advanced CRM', 'Invoice Generation', 'WhatsApp Booking Notifications', 'Payment Tracking', 'Event Reminders'].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#6C3BFF" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.premiumBtn}>
            <LinearGradient colors={['#6C3BFF', '#8B5CF6']} style={styles.premiumBtnGrad}>
              <Text style={styles.premiumBtnText}>Upgrade Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* ═══ FEATURED PROMOTION ═══ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionIcon}><Ionicons name="trending-up" size={20} color="#FF4FA3" /></View>
          <Text style={styles.sectionTitle}>Featured Promotion</Text>
          <Text style={styles.sectionDesc}>Purchase Featured Promotion to appear at the top of search results and Discover page.</Text>
          <View style={styles.benefitGrid}>
            {['More Visibility', 'More Leads', 'More Bookings'].map((b, i) => (
              <View key={i} style={styles.benefitChip}><Ionicons name="star" size={12} color="#F59E0B" /><Text style={styles.benefitChipText}>{b}</Text></View>
            ))}
          </View>
        </View>

        {/* ═══ COMMISSION ═══ */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="cash" size={20} color="#D97706" /></View>
          <Text style={styles.sectionTitle}>Commission</Text>
          <Text style={styles.sectionDesc}>BookMyShot charges 5% commission only on the advance payment of every successful booking.</Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>Example:</Text>
            <View style={styles.exampleRow}><Text style={styles.exampleLabel}>Advance Paid</Text><Text style={styles.exampleValue}>₹20,000</Text></View>
            <View style={styles.exampleRow}><Text style={styles.exampleLabel}>BookMyShot Commission (5%)</Text><Text style={[styles.exampleValue, { color: '#EF4444' }]}>₹1,000</Text></View>
            <View style={[styles.exampleRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 }]}><Text style={[styles.exampleLabel, { fontWeight: '700' }]}>Creator Receives</Text><Text style={[styles.exampleValue, { color: '#10B981', fontWeight: '700' }]}>₹19,000</Text></View>
          </View>
          <Text style={[styles.sectionDesc, { marginTop: 8, fontStyle: 'italic' }]}>No commission is charged if there is no confirmed booking.</Text>
        </View>

        {/* ═══ CASHBACK ═══ */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}><Ionicons name="gift" size={20} color="#10B981" /></View>
          <Text style={styles.sectionTitle}>Customer Cashback</Text>
          <Text style={styles.sectionDesc}>Customers receive cashback after successful booking as per current platform rules. More bookings = more cashback rewards.</Text>
          <View style={[styles.exampleBox, { marginTop: 12 }]}>
            <Text style={styles.exampleTitle}>Cashback Timeline:</Text>
            <View style={{ gap: 6, marginTop: 6 }}>
              {['1. Book through BookMyShot', '2. Complete the remaining payment within 30 days', '3. Creator confirms payment completion', '4. Cashback is credited automatically'].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={{ fontSize: 12, color: '#374151', flex: 1 }}>{step}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginTop: 10 }}>
              <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>⚠️ Payments after 30 days are NOT eligible for cashback. The cashback amount will be retained by BookMyShot.</Text>
            </View>
          </View>
        </View>

        {/* ═══ CRM FEATURES ═══ */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}><Ionicons name="grid" size={20} color="#6C3BFF" /></View>
          <Text style={styles.sectionTitle}>CRM Features</Text>
          <Text style={styles.sectionDesc}>Premium creators get powerful business management tools:</Text>
          <View style={styles.crmGrid}>
            {[
              { icon: 'calendar', label: 'Booking Management' },
              { icon: 'people', label: 'Client Records' },
              { icon: 'card', label: 'Payment Tracking' },
              { icon: 'alert-circle', label: 'Pending Payments' },
              { icon: 'document-text', label: 'Invoice Generator' },
              { icon: 'today', label: 'Event Calendar' },
              { icon: 'notifications', label: 'Reminder Notifications' },
              { icon: 'analytics', label: 'Business Dashboard' },
            ].map((item, i) => (
              <View key={i} style={styles.crmItem}>
                <Ionicons name={item.icon as any} size={18} color="#6C3BFF" />
                <Text style={styles.crmLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ WHY UPGRADE ═══ */}
        <LinearGradient colors={['#6C3BFF', '#8B5CF6']} style={styles.whySection}>
          <Text style={styles.whyTitle}>Why Upgrade?</Text>
          <View style={styles.whyGrid}>
            {['Get More Customers', 'Higher Visibility', 'Unlimited Leads', 'Professional Business Tools', 'Save Time', 'Grow Faster'].map((w, i) => (
              <View key={i} style={styles.whyItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.whyText}>{w}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ═══ FAQ ═══ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          {FAQs.map((faq, i) => (
            <TouchableOpacity key={i} style={styles.faqItem} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)} activeOpacity={0.7}>
              <View style={styles.faqQ}>
                <Text style={styles.faqQText}>{faq.q}</Text>
                <Ionicons name={expandedFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
              </View>
              {expandedFaq === i && <Text style={styles.faqA}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  scroll: { paddingBottom: 40 },
  // Hero
  hero: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 24, alignItems: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 24 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  // Plan cards
  planCard: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 1.5, borderColor: '#E5E7EB', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  planBadge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  planBadgeText: { fontSize: 10, fontWeight: '700', color: '#10B981', letterSpacing: 0.5 },
  planName: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  planPrice: { fontSize: 32, fontWeight: '800', color: '#1F2937' },
  planPeriod: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  featureHead: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  featureText: { fontSize: 13, color: '#4B5563' },
  freeBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#6C3BFF', alignItems: 'center' },
  freeBtnText: { fontSize: 14, fontWeight: '700', color: '#6C3BFF' },
  // Premium
  premiumCard: { marginHorizontal: 16, marginTop: 20, borderRadius: 20, padding: 24, borderWidth: 2, borderColor: '#6C3BFF' },
  premiumBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6C3BFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  premiumBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  saveBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  saveBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  priceCol: { alignItems: 'center' },
  premiumPrice: { fontSize: 26, fontWeight: '800', color: '#6C3BFF' },
  priceOr: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  premiumBtn: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  premiumBtnGrad: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  premiumBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Section cards
  sectionCard: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FDF2F8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  sectionDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  benefitChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  benefitChipText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  // Example box
  exampleBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginTop: 12 },
  exampleTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  exampleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  exampleLabel: { fontSize: 12, color: '#6B7280' },
  exampleValue: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  // CRM grid
  crmGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  crmItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%', backgroundColor: '#F8F6FF', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  crmLabel: { fontSize: 11, fontWeight: '500', color: '#374151' },
  // Why upgrade
  whySection: { marginHorizontal: 16, marginTop: 20, borderRadius: 16, padding: 20 },
  whyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  whyGrid: { gap: 8 },
  whyItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whyText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  // FAQ
  faqSection: { marginHorizontal: 16, marginTop: 24, marginBottom: 20 },
  faqTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  faqItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  faqQ: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQText: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
  faqA: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginTop: 10 },
});
