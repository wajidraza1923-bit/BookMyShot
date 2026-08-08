/**
 * UpdateChecker — Mandatory Force Update System
 *
 * HOW IT WORKS:
 * 1. On every app launch/resume, reads the REAL native installed version
 *    using expo-application (Application.nativeApplicationVersion + nativeBuildVersion).
 * 2. Fetches /api/app-version from the server.
 * 3. If server versionCode > installed versionCode AND forceUpdate=true:
 *    - Blocks the entire app with a full-screen Update Required screen.
 *    - "Update Now" opens the website/download URL via Linking.openURL().
 * 4. The app NEVER fakes/stores/modifies the version number locally.
 * 5. No expo-file-system, no in-app APK download, no createDownloadResumable.
 * 6. Version is considered "updated" only when user installs the new APK and
 *    the app relaunches — at that point nativeBuildVersion is the new code.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  BackHandler, StatusBar, ScrollView, AppState, AppStateStatus, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Load expo-application safely (available in EAS builds, not in Expo Go)
let Application: any = null;
try {
  Application = require('expo-application');
} catch {}

const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

// Fallback version name if expo-application is not available
const FALLBACK_VERSION_NAME = '2.3.0';
const FALLBACK_BUILD_CODE = 12;

function getNativeVersion(): { versionName: string; buildCode: number } {
  if (Application) {
    try {
      const name = Application.nativeApplicationVersion || FALLBACK_VERSION_NAME;
      const code = parseInt(String(Application.nativeBuildVersion || FALLBACK_BUILD_CODE), 10);
      return { versionName: name, buildCode: isNaN(code) ? FALLBACK_BUILD_CODE : code };
    } catch {}
  }
  return { versionName: FALLBACK_VERSION_NAME, buildCode: FALLBACK_BUILD_CODE };
}

interface UpdateInfo {
  version: string;
  versionCode: number;
  minVersionCode: number;
  title: string;
  description: string;
  downloadUrl: string;
  playStoreUrl: string;
  forceUpdate: boolean;
  optionalUpdate: boolean;
}

export default function UpdateChecker({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [optionalAvailable, setOptionalAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [opening, setOpening] = useState(false);

  // Read REAL native version — never from AsyncStorage
  const { versionName, buildCode } = getNativeVersion();

  useEffect(() => {
    checkVersion();
  }, []);

  // Re-check when app returns to foreground (user may have installed update)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkVersion();
    });
    return () => sub.remove();
  }, []);

  // Block hardware back button during force update
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

      if (!res.ok) { setChecking(false); return; }
      const data = await res.json();

      if (!data.success || !data.versionCode) { setChecking(false); return; }

      // Re-read native version every check (in case app was updated)
      const { buildCode: currentCode } = getNativeVersion();
      const serverCode: number = data.versionCode;
      const minCode: number = data.minVersionCode || 0;

      if (serverCode > currentCode) {
        setInfo(data);
        if (data.forceUpdate === true || currentCode < minCode) {
          setUpdateRequired(true);
          setOptionalAvailable(false);
        } else if (data.optionalUpdate === true) {
          setOptionalAvailable(true);
        }
      } else {
        // App is up-to-date — clear any stale update state
        setUpdateRequired(false);
        setOptionalAvailable(false);
      }
    } catch {
      // Network error — don't block the app
    } finally {
      setChecking(false);
    }
  };

  // Opens download URL via website — does NOT track download completion
  // The update is only "complete" when user installs the APK and the app relaunches
  const handleUpdateNow = async () => {
    const url = info?.downloadUrl || info?.playStoreUrl;
    if (!url) {
      Alert.alert('Update', 'Could not find download URL. Please visit bookmyshot.in to download the latest version.');
      return;
    }

    const fullUrl = url.startsWith('http') ? url : `https://site--bookmyshot--ykz2mr8mzlrv.code.run${url}`;

    setOpening(true);
    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        // Try fallback website URL
        await Linking.openURL('https://bookmyshot.in');
      }
    } catch (e: any) {
      Alert.alert(
        'Cannot Open Link',
        'Please visit bookmyshot.in in your browser to download the latest version.',
        [{ text: 'OK' }]
      );
    } finally {
      setOpening(false);
    }
    // NOTE: We do NOT mark update as complete here.
    // The update is only complete when the user installs the APK and relaunches the app.
    // On relaunch, checkVersion() runs again and reads the new native build code.
  };

  if (checking) {
    return <>{children}</>;
  }

  // ═══ FORCE UPDATE: Block entire app ═══
  if (updateRequired && info) {
    return (
      <View style={s.blockScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={s.blockContent}>
          <View style={s.iconCircle}>
            <Ionicons name="arrow-up-circle" size={44} color="#D4AF37" />
          </View>

          <Text style={s.blockTitle}>Update Required</Text>
          <Text style={s.blockVersion}>v{info.version}</Text>

          {info.title ? (
            <Text style={s.updateTitle}>{info.title}</Text>
          ) : null}

          {info.description ? (
            <ScrollView style={s.descScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={s.descText}>{info.description}</Text>
            </ScrollView>
          ) : (
            <Text style={s.blockMessage}>
              A critical update is required to continue using BookMyShot. Please update to the latest version.
            </Text>
          )}

          <View style={s.warningBox}>
            <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
            <Text style={s.warningText}>
              This update is mandatory for security and performance. You cannot use the app until it is installed.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.updateBtn, opening && { opacity: 0.7 }]}
            onPress={handleUpdateNow}
            activeOpacity={0.85}
            disabled={opening}
          >
            <Ionicons name="open-outline" size={18} color="#000" />
            <Text style={s.updateBtnText}>{opening ? 'Opening...' : 'Update Now'}</Text>
          </TouchableOpacity>

          <Text style={s.howToText}>
            Tap "Update Now" → website opens → download and install the APK → reopen the app.
          </Text>

          <Text style={s.currentText}>
            Your version: v{versionName} (build {buildCode}) • Required: v{info.version} (build {info.versionCode})
          </Text>
        </View>
      </View>
    );
  }

  // ═══ OPTIONAL UPDATE: Non-blocking dialog over content ═══
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
              <ScrollView style={s.optDescScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={s.optDesc}>{info.description}</Text>
              </ScrollView>
            ) : (
              <Text style={s.optDesc}>A new version is available with improvements and bug fixes.</Text>
            )}

            <TouchableOpacity
              style={[s.optUpdateBtn, opening && { opacity: 0.7 }]}
              onPress={handleUpdateNow}
              activeOpacity={0.85}
              disabled={opening}
            >
              <Ionicons name="open-outline" size={16} color="#000" />
              <Text style={s.optUpdateText}>{opening ? 'Opening...' : 'Update Now'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.optLaterBtn} onPress={() => { setDismissed(true); setOptionalAvailable(false); }}>
              <Text style={s.optLaterText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  // Force update full-screen block
  blockScreen: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  blockContent: { alignItems: 'center', width: '100%', maxWidth: 340 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  blockTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  blockVersion: { fontSize: 14, color: '#D4AF37', fontWeight: '600', marginBottom: 16 },
  updateTitle: {
    fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', marginBottom: 8,
  },
  descScroll: { maxHeight: 140, width: '100%', marginBottom: 16 },
  descText: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)',
    lineHeight: 20, textAlign: 'center',
  },
  blockMessage: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', lineHeight: 20, marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)',
    borderRadius: 10, padding: 12, marginBottom: 24, width: '100%',
  },
  warningText: { fontSize: 11, color: 'rgba(212,175,55,0.8)', flex: 1, lineHeight: 16 },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#D4AF37',
    width: '100%', paddingVertical: 16, borderRadius: 14,
  },
  updateBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  howToText: {
    fontSize: 10, color: 'rgba(255,255,255,0.25)',
    textAlign: 'center', marginTop: 14, lineHeight: 15,
  },
  currentText: {
    fontSize: 10, color: 'rgba(255,255,255,0.15)',
    marginTop: 6, textAlign: 'center',
  },
  // Optional update overlay
  optionalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 28, zIndex: 9999,
  },
  optionalCard: {
    backgroundColor: '#111', borderRadius: 18, padding: 24,
    alignItems: 'center', width: '100%', maxWidth: 340,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.12)',
  },
  optIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(212,175,55,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  optTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 2 },
  optVersion: { fontSize: 12, color: '#D4AF37', fontWeight: '600', marginBottom: 10 },
  optDescScroll: { maxHeight: 100, width: '100%', marginBottom: 14 },
  optDesc: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', lineHeight: 18, marginBottom: 14,
  },
  optUpdateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#D4AF37',
    width: '100%', paddingVertical: 13, borderRadius: 10,
  },
  optUpdateText: { fontSize: 14, fontWeight: '700', color: '#000' },
  optLaterBtn: { marginTop: 10, paddingVertical: 6 },
  optLaterText: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
});
