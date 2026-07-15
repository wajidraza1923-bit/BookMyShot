/**
 * InfoScreen — Reusable full-page content screen for About, Contact, Legal, etc.
 * Renders rich content with premium dark theme, back button, and scroll.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PAGES: Record<string, { title: string; content: any[] }> = {
  About: {
    title: 'About BookMyShot',
    content: [
      { type: 'heading', text: 'Our Mission' },
      { type: 'paragraph', text: 'BookMyShot exists to make finding and booking exceptional wedding photographers and videographers effortless. We believe every couple deserves access to verified, talented creators who can capture their special moments with artistry and professionalism.' },
      { type: 'heading', text: 'Our Vision' },
      { type: 'paragraph', text: 'To become India\'s most trusted platform for wedding and event photography services — where every creator thrives and every client finds their perfect match.' },
      { type: 'heading', text: 'How It Works' },
      { type: 'bullet', items: ['Browse verified creators by city, category and budget', 'View detailed portfolios, reviews and pricing', 'Send inquiries and discuss your event details', 'Book securely through our platform', 'Enjoy your event and leave a review'] },
      { type: 'heading', text: 'Platform Stats' },
      { type: 'paragraph', text: '10,000+ Creators • 5,000+ Weddings Captured • 100+ Cities • 4.8★ Average Rating' },
      { type: 'heading', text: 'Our Story' },
      { type: 'paragraph', text: 'BookMyShot was born from a simple observation — talented wedding photographers struggle to get discovered, while couples settle for whoever their relatives recommend. We bridge this gap with a premium marketplace that celebrates creativity and ensures quality.' },
    ],
  },
  Contact: {
    title: 'Contact Us',
    content: [
      { type: 'heading', text: 'Get In Touch' },
      { type: 'paragraph', text: 'We\'d love to hear from you. Whether you need support, have feedback, or want to partner with us.' },
      { type: 'action', icon: 'mail', label: 'Email Us', value: 'support@bookmyshot.in', url: 'mailto:support@bookmyshot.in' },
      { type: 'action', icon: 'call', label: 'Call Us', value: '+91 84929 22173', url: 'tel:+918492922173' },
      { type: 'action', icon: 'logo-whatsapp', label: 'WhatsApp', value: 'Chat with us', url: 'https://wa.me/918492922173' },
      { type: 'action', icon: 'globe', label: 'Website', value: 'bookmyshot.in', url: 'https://bookmyshot.in' },
      { type: 'heading', text: 'Business Hours' },
      { type: 'paragraph', text: 'Monday – Saturday: 10:00 AM – 7:00 PM IST\nSunday: Closed' },
      { type: 'heading', text: 'Response Time' },
      { type: 'bullet', items: ['Email: Within 24 hours', 'WhatsApp: Within 2 hours', 'Phone: Mon-Sat, 10AM-7PM IST', 'Dispute Resolution: Within 48 hours'] },
    ],
  },
  Careers: {
    title: 'Careers',
    content: [
      { type: 'heading', text: 'Join Our Team' },
      { type: 'paragraph', text: 'BookMyShot is building the future of wedding creator discovery in India. We\'re looking for passionate people who want to make a difference.' },
      { type: 'heading', text: 'Open Positions' },
      { type: 'bullet', items: ['Full Stack Developer (Node.js + React Native)', 'UI/UX Designer', 'Marketing Manager', 'Creator Relations Executive', 'Customer Support Associate'] },
      { type: 'heading', text: 'How to Apply' },
      { type: 'paragraph', text: 'Send your resume and portfolio to support@bookmyshot.in with the subject line "Careers - [Position Name]"' },
      { type: 'action', icon: 'mail', label: 'Apply Now', value: 'support@bookmyshot.in', url: 'mailto:support@bookmyshot.in?subject=Careers' },
    ],
  },
  Press: {
    title: 'Press & Media',
    content: [
      { type: 'heading', text: 'Media Inquiries' },
      { type: 'paragraph', text: 'For press releases, interviews, partnership announcements and media coverage, please contact our communications team.' },
      { type: 'action', icon: 'mail', label: 'Press Contact', value: 'support@bookmyshot.in', url: 'mailto:support@bookmyshot.in?subject=Press Inquiry' },
      { type: 'heading', text: 'About BookMyShot' },
      { type: 'paragraph', text: 'BookMyShot is India\'s premium wedding creator marketplace connecting couples with 10,000+ verified photographers, videographers, and filmmakers across 100+ cities.' },
      { type: 'heading', text: 'Brand Assets' },
      { type: 'paragraph', text: 'For logo usage, brand guidelines and press kit, please email us directly.' },
    ],
  },
  Privacy: {
    title: 'Privacy Policy',
    content: [
      { type: 'paragraph', text: 'Last updated: January 2025' },
      { type: 'heading', text: '1. Information We Collect' },
      { type: 'bullet', items: ['Name, email, phone number', 'Billing and payment information', 'Location and event details', 'Portfolio content (creators)', 'Device and usage data'] },
      { type: 'heading', text: '2. How We Use Your Data' },
      { type: 'bullet', items: ['Processing bookings and inquiries', 'Payment processing via Razorpay', 'Communication and notifications', 'Platform improvement', 'Legal compliance'] },
      { type: 'heading', text: '3. Data Sharing' },
      { type: 'paragraph', text: 'We do not sell personal data. We share with: booking parties (client/creator), payment processors (Razorpay), cloud services, and legal authorities when required.' },
      { type: 'heading', text: '4. Your Rights' },
      { type: 'bullet', items: ['Access your data', 'Correct inaccurate info', 'Request deletion', 'Withdraw marketing consent'] },
      { type: 'heading', text: '5. Contact' },
      { type: 'paragraph', text: 'Email: support@bookmyshot.in' },
    ],
  },
  Terms: {
    title: 'Terms & Conditions',
    content: [
      { type: 'paragraph', text: 'Last updated: January 2025' },
      { type: 'heading', text: '1. Acceptance' },
      { type: 'paragraph', text: 'By using BookMyShot, you agree to these terms. You must be 18+ to use this platform.' },
      { type: 'heading', text: '2. User Responsibilities' },
      { type: 'bullet', items: ['Provide accurate information', 'Honour confirmed bookings', 'Communicate professionally', 'Do not circumvent platform fees'] },
      { type: 'heading', text: '3. Creator Obligations' },
      { type: 'bullet', items: ['Maintain accurate portfolio', 'Deliver services as agreed', 'Respond to inquiries timely', 'Pay platform commission'] },
      { type: 'heading', text: '4. Payments' },
      { type: 'paragraph', text: 'All payments processed via Razorpay. BookMyShot charges platform commission on bookings. Creators pay monthly subscription for visibility.' },
      { type: 'heading', text: '5. Disputes' },
      { type: 'paragraph', text: 'Disputes resolved via BookMyShot support first, then arbitration under Indian law.' },
    ],
  },
  Refund: {
    title: 'Refund Policy',
    content: [
      { type: 'paragraph', text: 'Last updated: January 2025' },
      { type: 'heading', text: 'Subscription Refunds' },
      { type: 'bullet', items: ['Within 48 hours: Full refund if unused', 'After 48 hours: No refund for current period', 'Auto-renewal: Refundable within 24 hours'] },
      { type: 'heading', text: 'Commission Refunds' },
      { type: 'bullet', items: ['Client cancels: Commission refunded to creator', 'Creator cancels: Full refund to client', 'Mutual: Commission refunded to both'] },
      { type: 'heading', text: 'Promotion Refunds' },
      { type: 'bullet', items: ['Before going live: Full refund', 'Within 24 hours of live: 50% refund', 'After 24 hours: No refund'] },
      { type: 'heading', text: 'Processing' },
      { type: 'paragraph', text: 'Refunds processed within 5-7 business days to original payment method.' },
    ],
  },
  Cancellation: {
    title: 'Cancellation Policy',
    content: [
      { type: 'paragraph', text: 'Last updated: January 2025' },
      { type: 'heading', text: 'Client Cancellation' },
      { type: 'bullet', items: ['30+ days before: Full refund', '15-30 days: 75% refund', '7-14 days: 50% refund', '3-6 days: 25% refund', 'Less than 3 days: No refund'] },
      { type: 'heading', text: 'Creator Cancellation' },
      { type: 'bullet', items: ['30+ days: Warning issued', '15-30 days: Visibility reduced 7 days', '7-14 days: Full refund + 10% compensation', 'Less than 7 days: Suspension risk'] },
      { type: 'heading', text: 'Force Majeure' },
      { type: 'paragraph', text: 'In case of natural disasters or government restrictions: full refund, no penalties.' },
    ],
  },
  Help: {
    title: 'Help Center',
    content: [
      { type: 'heading', text: 'Frequently Asked Questions' },
      { type: 'heading', text: 'How do I book a creator?' },
      { type: 'paragraph', text: 'Browse creators, view their portfolio, and tap "Send Inquiry". Fill in your event details and the creator will respond within 24 hours.' },
      { type: 'heading', text: 'How do I register as a creator?' },
      { type: 'paragraph', text: 'Tap "Join as Creator" and complete your profile with portfolio, pricing, and availability. Verification takes 24-48 hours.' },
      { type: 'heading', text: 'Is my payment secure?' },
      { type: 'paragraph', text: 'Yes. All payments are processed through Razorpay with bank-grade encryption.' },
      { type: 'heading', text: 'How does commission work?' },
      { type: 'paragraph', text: 'BookMyShot charges 3-5% commission on bookings. Commission is calculated on the highest deal amount.' },
      { type: 'heading', text: 'Need more help?' },
      { type: 'action', icon: 'mail', label: 'Email Support', value: 'support@bookmyshot.in', url: 'mailto:support@bookmyshot.in?subject=Help' },
      { type: 'action', icon: 'logo-whatsapp', label: 'WhatsApp', value: 'Chat now', url: 'https://wa.me/918492922173' },
    ],
  },
  Resources: {
    title: 'Creator Resources',
    content: [
      { type: 'heading', text: 'Grow Your Business' },
      { type: 'paragraph', text: 'Tips and best practices to maximize your BookMyShot presence and get more bookings.' },
      { type: 'heading', text: 'Complete Your Profile' },
      { type: 'bullet', items: ['Add 10 best portfolio photos', 'Upload 2-4 video reels', 'Write a compelling bio', 'Set competitive pricing', 'Add your availability calendar'] },
      { type: 'heading', text: 'Get More Inquiries' },
      { type: 'bullet', items: ['Respond to inquiries within 2 hours', 'Keep your portfolio fresh and updated', 'Ask satisfied clients for reviews', 'Use Featured promotion for visibility', 'Maintain 4.5+ star rating'] },
      { type: 'heading', text: 'Pricing Strategy' },
      { type: 'paragraph', text: 'Research competitors in your city. Start competitive, build reviews, then gradually increase pricing as demand grows.' },
      { type: 'heading', text: 'Need Help?' },
      { type: 'action', icon: 'mail', label: 'Creator Support', value: 'support@bookmyshot.in', url: 'mailto:support@bookmyshot.in?subject=Creator Help' },
    ],
  },
};

export default function InfoScreen({ route, navigation }: any) {
  const pageId = route?.params?.page || 'About';
  const page = PAGES[pageId] || PAGES.About;

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>{page.title}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {page.content.map((block: any, idx: number) => {
          if (block.type === 'heading') return <Text key={idx} style={st.heading}>{block.text}</Text>;
          if (block.type === 'paragraph') return <Text key={idx} style={st.para}>{block.text}</Text>;
          if (block.type === 'bullet') return (
            <View key={idx} style={st.bullets}>{block.items.map((b: string, i: number) => (
              <View key={i} style={st.bulletRow}><Text style={st.bulletDot}>•</Text><Text style={st.bulletText}>{b}</Text></View>
            ))}</View>
          );
          if (block.type === 'action') return (
            <TouchableOpacity key={idx} style={st.actionCard} onPress={() => Linking.openURL(block.url)}>
              <Ionicons name={block.icon as any} size={18} color="#F5B942" />
              <View style={{ flex: 1 }}><Text style={st.actionLabel}>{block.label}</Text><Text style={st.actionValue}>{block.value}</Text></View>
              <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          );
          return null;
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginRight: 38 },
  scroll: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 15, fontWeight: '700', color: '#6C3BFF', marginTop: 24, marginBottom: 8 },
  para: { fontSize: 13, color: '#4B5563', lineHeight: 21, marginBottom: 12 },
  bullets: { marginBottom: 12 },
  bulletRow: { flexDirection: 'row', marginBottom: 6 },
  bulletDot: { fontSize: 14, color: '#6C3BFF', marginRight: 8, marginTop: -1 },
  bulletText: { fontSize: 13, color: '#4B5563', lineHeight: 19, flex: 1 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8F6FF', borderWidth: 1, borderColor: '#EDE9FE', borderRadius: 14, padding: 14, marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  actionValue: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
