import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');

interface FooterLink {
  label: string;
  url?: string;
  screen?: string;
  enabled?: boolean;
}

export default function AppFooter({ navigation }: { navigation: any }) {
  const [footer, setFooter] = useState<any>({
    tagline: "India's Premium Wedding Creator Marketplace",
    description: "Book verified photographers, videographers, makeup artists and more. Earn cashback on every booking.",
    quickLinks: [
      { label: "About Us", screen: "Info", enabled: true },
      { label: "How It Works", screen: "Info", enabled: true },
      { label: "Blog", screen: "Info", enabled: true },
      { label: "Careers", screen: "Info", enabled: true },
      { label: "Contact Us", screen: "Info", enabled: true },
      { label: "FAQ", screen: "Info", enabled: true },
    ],
    creatorLinks: [
      { label: "List Your Business", screen: "Account", enabled: true },
      { label: "Creator Login", screen: "Account", enabled: true },
      { label: "Pricing", screen: "Info", enabled: true },
      { label: "Creator Resources", screen: "Info", enabled: true },
      { label: "Success Stories", screen: "Info", enabled: true },
    ],
    supportLinks: [
      { label: "Help Center", screen: "Info", enabled: true },
      { label: "Safety Center", screen: "Info", enabled: true },
      { label: "Cancellation Policy", screen: "Info", enabled: true },
      { label: "Privacy Policy", screen: "Info", enabled: true },
      { label: "Terms & Conditions", screen: "Info", enabled: true },
    ],
    instagram: "",
    facebook: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    playStoreUrl: "",
    appStoreUrl: "",
    copyrightText: "BookMyShot © All Rights Reserved",
    madeInText: "Made with ❤️ in India",
    enabled: true,
  });

  useEffect(() => {
    api.get('/footer').then(res => {
      if (res.data?.data) setFooter(res.data.data);
    }).catch(() => {});
  }, []);

  if (!footer || !footer.enabled) return null;

  const handleLink = (link: FooterLink) => {
    if (link.url) {
      Linking.openURL(link.url);
    } else if (link.screen) {
      navigation.navigate(link.screen, { page: link.label });
    }
  };

  const socialIcons: { key: string; icon: string }[] = [
    { key: 'instagram', icon: 'logo-instagram' },
    { key: 'facebook', icon: 'logo-facebook' },
    { key: 'youtube', icon: 'logo-youtube' },
    { key: 'twitter', icon: 'logo-twitter' },
    { key: 'linkedin', icon: 'logo-linkedin' },
  ];

  const year = new Date().getFullYear();

  return (
    <View style={s.footer}>
      {/* Brand */}
      <View style={s.brand}>
        <View style={s.logoRow}>
          <View style={s.logoBadge}><Ionicons name="aperture" size={14} color="#6C3BFF" /></View>
          <Text style={s.logoText}>BOOK<Text style={{ color: '#FF4FA3' }}>MYSHOT</Text></Text>
        </View>
        <Text style={s.tagline}>{footer.tagline}</Text>
        <Text style={s.desc} numberOfLines={2}>{footer.description}</Text>
      </View>

      {/* Links — 3 columns side by side */}
      <View style={s.linkGrid}>
        <View style={s.linkCol}>
          <Text style={s.linkHead}>Quick Links</Text>
          {(footer.quickLinks || []).filter((l: FooterLink) => l.enabled !== false).map((link: FooterLink, i: number) => (
            <TouchableOpacity key={i} onPress={() => handleLink(link)} style={s.linkTouchable}><Text style={s.linkItem}>{link.label}</Text></TouchableOpacity>
          ))}
        </View>
        <View style={s.linkCol}>
          <Text style={s.linkHead}>For Creators</Text>
          {(footer.creatorLinks || []).filter((l: FooterLink) => l.enabled !== false).map((link: FooterLink, i: number) => (
            <TouchableOpacity key={i} onPress={() => handleLink(link)} style={s.linkTouchable}><Text style={s.linkItem}>{link.label}</Text></TouchableOpacity>
          ))}
        </View>
        <View style={s.linkCol}>
          <Text style={s.linkHead}>Support</Text>
          {(footer.supportLinks || []).filter((l: FooterLink) => l.enabled !== false).map((link: FooterLink, i: number) => (
            <TouchableOpacity key={i} onPress={() => handleLink(link)} style={s.linkTouchable}><Text style={s.linkItem}>{link.label}</Text></TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Social */}
      {socialIcons.some(si => footer[si.key]) && (
        <View style={s.socialRow}>
          {socialIcons.filter(si => footer[si.key]).map(si => (
            <TouchableOpacity key={si.key} style={s.socialBtn} onPress={() => Linking.openURL(footer[si.key])}>
              <Ionicons name={si.icon as any} size={16} color="#6C3BFF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bottom */}
      <View style={s.bottom}>
        <Text style={s.madeIn}>{footer.madeInText}</Text>
        <Text style={s.copyright}>{footer.copyrightText?.replace('©', `© ${year}`)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  footer: { backgroundColor: '#FAFAFA', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  // Brand
  brand: { marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  logoBadge: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#6C3BFF', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  tagline: { fontSize: 10, fontWeight: '700', color: '#6C3BFF', marginBottom: 3 },
  desc: { fontSize: 9.5, color: '#6B7280', lineHeight: 14 },
  // Links — 3 columns, left-aligned
  linkGrid: { flexDirection: 'row', marginBottom: 16 },
  linkCol: { flex: 1 },
  linkHead: { fontSize: 10, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  linkTouchable: { paddingVertical: 3 },
  linkItem: { fontSize: 9.5, color: '#6B7280' },
  // Social
  socialRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  socialBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  // Bottom — tight, centered
  bottom: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  madeIn: { fontSize: 9.5, color: '#6B7280' },
  copyright: { fontSize: 8.5, color: '#9CA3AF', marginTop: 2 },
});
