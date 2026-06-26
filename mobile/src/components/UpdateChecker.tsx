/**
 * UpdateChecker — Complete Force Update System
 * 
 * Checks /api/app-version on every startup.
 * If server versionCode > app versionCode:
 *   - forceUpdate=true  → Blocks entire app. No back. Only "Update Now".
 *   - optionalUpdate=true → Shows dialog with "Update Now" + "Later".
 * 
 * "Update Now" opens the APK download URL from the database.
 * Admin controls everything from the website panel — no APK rebuild needed.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  BackHandler,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ═══ MUST MATCH mobile/app.json versionCode ═══
const APP_VERSION_CODE = 4;
const APP_VERSION_NAME = '2.2.0';
const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

interface UpdateInfo {
  version: string;
  versionCode: number;
  title: string;
  description: string;
  downloadUrl: string;
  playStoreUrl: string;
  forceUpdate: boolean;
  optionalUpdate: boolean;
  minVersionCode: number;
}

export default function UpdateChecker({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [optionalAvailable, setOptionalAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    checkVersion();
  }, []);

  // Re-check when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkVersion();
    });
    return () => sub.remove();
  }, []);

  // Block back button when force update is active
  useEffect(() => {
    if (updateRequired) {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }
  }, [updateRequired]);

  const checkVersion = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE}/app-version`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();

      if (!data.success || !data.versionCode) {
        setChecking(false);
        return;
      }

      const serverCode = data.versionCode;
      const minCode = data.minVersionCode || 0;
      const isForce = data.forceUpdate === true;
      const isOptional = data.optionalUpdate === true;

      if (serverCode > APP_VERSION_CODE) {
        setInfo(data);

        // Force update: app version below minimum OR forceUpdate flag is ON
        if (isForce || APP_VERSION_CODE < minCode) {
          setUpdateRequired(true);
        } else if (isOptional) {
          setOptionalAvailable(true);
        }
      }
    } catch (e) {
      // Network error — let user continue (can't force without server)
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = () => {
    const url = info?.playStoreUrl || info?.downloadUrl;
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleLater = () => {
    setDismissed(true);
    setOptionalAvailable(false);
  };

  // ═══ FORCE UPDATE: Block entire app ═══
  if (updateRequired && info) {
    return (
      <View style={s.blockScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={s.blockContent}>
          {/* Icon */}
          <View style={s.iconCircle}>
            <Ionicons name="arrow-up-circle" size={44} color="#D4AF37" />
          </View>

          {/* Title */}
          <Text style={s.blockTitle}>Update Required</Text>
          <Text style={s.blockVersion}>v{info.version}</Text>

          {/* Description */}
          {info.title && <Text style={s.updateTitle}>{info.title}</Text>}
          {info.description ? (
            <ScrollView style={s.descScroll} nestedScrollEnabled>
              <Text style={s.descText}>{info.description}</Text>
            </ScrollView>
          ) : (
            <Text style={s.blockMessage}>
              A critical update is available. Please update to continue using BookMyShot.
            </Text>
          )}

          {/* Warning */}
          <View style={s.warningBox}>
            <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
            <Text style={s.warningText}>This update is mandatory for security and performance.</Text>
          </View>

          {/* Update Button */}
          <TouchableOpacity style={s.updateBtn} onPress={handleUpdate} activeOpacity={0.85}>
            <Ionicons name="download-outline" size={18} color="#000" />
            <Text style={s.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          {/* Current version info */}
          <Text style={s.currentText}>Current version: v{APP_VERSION_NAME} (code {APP_VERSION_CODE})</Text>
        </View>
      </View>
    );
  }

  // ═══ OPTIONAL UPDATE: Dialog over content ═══
  if (optionalAvailable && !dismissed && info) {
    return (
      <>
        {children}
        <View style={s.optionalOverlay}>
          <View style={s.optionalCard}>
            <View style={s.optIconCircle}>
              <Ionicons name="sparkles" size={24} color="#D4AF37" />
            </View>
            <Text style={s.optTitle}>{info.title || 'Update Available'}</Text>
            <Text style={s.optVersion}>v{info.version}</Text>

            {info.description ? (
              <ScrollView style={s.optDescScroll} nestedScrollEnabled>
                <Text style={s.optDesc}>{info.description}</Text>
              </ScrollView>
            ) : (
              <Text style={s.optDesc}>A new version is available with improvements.</Text>
            )}

            <TouchableOpacity style={s.optUpdateBtn} onPress={handleUpdate} activeOpacity={0.85}>
              <Ionicons name="download-outline" size={16} color="#000" />
              <Text style={s.optUpdateText}>Update Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.optLaterBtn} onPress={handleLater} activeOpacity={0.7}>
              <Text style={s.optLaterText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  // ═══ Loading state (brief) ═══
  if (checking) {
    return (
      <View style={s.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="small" color="#D4AF37" />
      </View>
    );
  }

  // ═══ Normal: No update needed or dismissed ═══
  return <>{children}</>;
}

const s = StyleSheet.create({
  // Force update full-screen blocker
  blockScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 32 },
  blockContent: { alignItems: 'center', width: '100%', maxWidth: 340 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,175,55,0.06)', borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  blockTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  blockVersion: { fontSize: 14, color: '#D4AF37', fontWeight: '600', marginBottom: 16 },
  updateTitle: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 8 },
  descScroll: { maxHeight: 140, width: '100%', marginBottom: 16 },
  descText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20, textAlign: 'center' },
  blockMessage: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(212,175,55,0.06)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)', borderRadius: 10, padding: 12, marginBottom: 24, width: '100%' },
  warningText: { fontSize: 11, color: 'rgba(212,175,55,0.8)', flex: 1, lineHeight: 16 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D4AF37', width: '100%', paddingVertical: 16, borderRadius: 14 },
  updateBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  currentText: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 16 },

  // Optional update overlay
  optionalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 28, zIndex: 9999 },
  optionalCard: { backgroundColor: '#111', borderRadius: 18, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340, borderWidth: 1, borderColor: 'rgba(212,175,55,0.12)' },
  optIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(212,175,55,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  optTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 2 },
  optVersion: { fontSize: 12, color: '#D4AF37', fontWeight: '600', marginBottom: 10 },
  optDescScroll: { maxHeight: 100, width: '100%', marginBottom: 14 },
  optDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  optUpdateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#D4AF37', width: '100%', paddingVertical: 13, borderRadius: 10 },
  optUpdateText: { fontSize: 14, fontWeight: '700', color: '#000' },
  optLaterBtn: { marginTop: 10, paddingVertical: 6 },
  optLaterText: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  // Loading
  loadingScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
});
