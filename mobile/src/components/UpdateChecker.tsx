/**
 * UpdateChecker — Complete Force Update System with Real-Time Download Progress
 * 
 * Checks /api/app-version on every startup.
 * If server versionCode > app versionCode:
 *   - forceUpdate=true  → Blocks entire app. Only "Update Now".
 *   - optionalUpdate=true → Shows dialog with "Update Now" + "Later".
 * 
 * "Update Now" downloads APK with real-time progress (speed, ETA, size)
 * then triggers Android package installer.
 */
import React, { useEffect, useState, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ═══ MUST MATCH mobile/app.json versionCode ═══
const APP_VERSION_CODE = 8;
const APP_VERSION_NAME = '2.3.0';
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
  fileSize: number;
}

interface DownloadProgress {
  status: 'idle' | 'downloading' | 'installing' | 'complete' | 'error';
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
  error?: string;
}

export default function UpdateChecker({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [optionalAvailable, setOptionalAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dl, setDl] = useState<DownloadProgress>({
    status: 'idle', progress: 0, downloadedBytes: 0, totalBytes: 0, speed: 0, eta: 0,
  });
  const downloadRef = useRef<any>(null);
  const speedSamples = useRef<number[]>([]);
  const lastProgressTime = useRef<number>(0);
  const lastProgressBytes = useRef<number>(0);

  useEffect(() => { checkVersion(); }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && dl.status === 'idle') checkVersion();
    });
    return () => sub.remove();
  }, [dl.status]);

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

      if (!data.success || !data.versionCode) { setChecking(false); return; }

      const serverCode = data.versionCode;
      const minCode = data.minVersionCode || 0;

      if (serverCode > APP_VERSION_CODE) {
        setInfo(data);
        if (data.forceUpdate === true || APP_VERSION_CODE < minCode) {
          setUpdateRequired(true);
        } else if (data.optionalUpdate === true) {
          setOptionalAvailable(true);
        }
      }
    } catch (e) {} finally { setChecking(false); }
  };

  // ═══ REAL DOWNLOAD WITH PROGRESS ═══
  const handleUpdate = async () => {
    const url = info?.downloadUrl;
    if (!url) {
      // Fallback to browser
      const fallback = info?.playStoreUrl || info?.downloadUrl;
      if (fallback) Linking.openURL(fallback);
      return;
    }

    // If URL is a relative path, prepend the base
    const fullUrl = url.startsWith('http') ? url : `https://site--bookmyshot--ykz2mr8mzlrv.code.run${url}`;

    // Try in-app download with progress (only works in EAS builds, not Expo Go)
    let FileSystem: any = null;
    let IntentLauncher: any = null;
    try {
      FileSystem = require('expo-file-system');
      IntentLauncher = require('expo-intent-launcher');
    } catch (e) {
      // Module not available (Expo Go) — fallback to browser
      Linking.openURL(fullUrl);
      return;
    }

    if (!FileSystem || !FileSystem.createDownloadResumable) {
      Linking.openURL(fullUrl);
      return;
    }

    // Start download
    setDl({ status: 'downloading', progress: 0, downloadedBytes: 0, totalBytes: info?.fileSize || 0, speed: 0, eta: 0 });
    lastProgressTime.current = Date.now();
    lastProgressBytes.current = 0;
    speedSamples.current = [];

    const fileUri = FileSystem.documentDirectory + `bookmyshot-v${info?.version || 'update'}.apk`;

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        fullUrl,
        fileUri,
        {},
        (downloadProgress: any) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
          const now = Date.now();
          const timeDiff = (now - lastProgressTime.current) / 1000; // seconds

          // Calculate speed (rolling average)
          if (timeDiff > 0.3) {
            const bytesDiff = totalBytesWritten - lastProgressBytes.current;
            const currentSpeed = bytesDiff / timeDiff;
            speedSamples.current.push(currentSpeed);
            if (speedSamples.current.length > 5) speedSamples.current.shift();
            lastProgressTime.current = now;
            lastProgressBytes.current = totalBytesWritten;
          }

          const avgSpeed = speedSamples.current.length > 0
            ? speedSamples.current.reduce((a, b) => a + b, 0) / speedSamples.current.length
            : 0;

          const remaining = totalBytesExpectedToWrite - totalBytesWritten;
          const eta = avgSpeed > 0 ? Math.ceil(remaining / avgSpeed) : 0;
          const pct = totalBytesExpectedToWrite > 0
            ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
            : 0;

          setDl({
            status: 'downloading',
            progress: pct,
            downloadedBytes: totalBytesWritten,
            totalBytes: totalBytesExpectedToWrite,
            speed: avgSpeed,
            eta,
          });
        }
      );

      downloadRef.current = downloadResumable;
      const result = await downloadResumable.downloadAsync();

      if (!result || !result.uri) {
        setDl(prev => ({ ...prev, status: 'error', error: 'Download failed — no file received' }));
        return;
      }

      // Download complete
      setDl(prev => ({ ...prev, status: 'installing', progress: 100 }));

      // Trigger APK install
      if (Platform.OS === 'android') {
        try {
          // Use content URI for Android install
          const contentUri = await FileSystem.getContentUriAsync(result.uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
          });
          setDl(prev => ({ ...prev, status: 'complete' }));
        } catch (installErr: any) {
          // Fallback: try Linking
          try {
            const contentUri = await FileSystem.getContentUriAsync(result.uri);
            await Linking.openURL(contentUri);
            setDl(prev => ({ ...prev, status: 'complete' }));
          } catch {
            // Final fallback: open in browser
            Linking.openURL(fullUrl);
            setDl(prev => ({ ...prev, status: 'complete' }));
          }
        }
      } else {
        Linking.openURL(fullUrl);
        setDl(prev => ({ ...prev, status: 'complete' }));
      }
    } catch (e: any) {
      console.log('[Update] Download error:', e.message);
      setDl(prev => ({ ...prev, status: 'error', error: e.message || 'Download failed' }));
    }
  };

  const handleRetry = () => {
    setDl({ status: 'idle', progress: 0, downloadedBytes: 0, totalBytes: 0, speed: 0, eta: 0 });
    handleUpdate();
  };

  const handleLater = () => {
    setDismissed(true);
    setOptionalAvailable(false);
  };

  // ═══ FORMAT HELPERS ═══
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatSpeed = (bps: number) => {
    if (bps < 1024) return bps.toFixed(0) + ' B/s';
    if (bps < 1024 * 1024) return (bps / 1024).toFixed(0) + ' KB/s';
    return (bps / 1024 / 1024).toFixed(1) + ' MB/s';
  };

  const formatEta = (seconds: number) => {
    if (seconds <= 0) return '...';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // ═══ DOWNLOAD PROGRESS UI ═══
  const renderDownloadProgress = () => {
    if (dl.status === 'idle') return null;

    return (
      <View style={s.dlContainer}>
        {/* Large centered percentage */}
        <Text style={s.dlPercentage}>
          {dl.status === 'downloading' ? `${dl.progress}%` :
           dl.status === 'installing' ? '100%' :
           dl.status === 'complete' ? '✓' : '!'}
        </Text>

        {/* Status label */}
        <View style={s.dlStatusRow}>
          {dl.status === 'downloading' && <ActivityIndicator size="small" color="#D4AF37" />}
          {dl.status === 'installing' && <ActivityIndicator size="small" color="#10b981" />}
          {dl.status === 'complete' && <Ionicons name="checkmark-circle" size={16} color="#10b981" />}
          {dl.status === 'error' && <Ionicons name="alert-circle" size={16} color="#ef4444" />}
          <Text style={s.dlStatusText}>
            {dl.status === 'downloading' && dl.progress < 5 ? 'Preparing update...' :
             dl.status === 'downloading' ? `Downloading... ${dl.progress}%` :
             dl.status === 'installing' ? 'Installing update...' :
             dl.status === 'complete' ? 'Update Complete ✅' :
             'Download Failed'}
          </Text>
        </View>

        {/* Progress Bar */}
        {(dl.status === 'downloading' || dl.status === 'installing') && (
          <View style={s.dlProgressBarBg}>
            <View style={[s.dlProgressBarFill, { width: `${Math.max(2, dl.progress)}%` }]} />
          </View>
        )}

        {/* Stats row */}
        {dl.status === 'downloading' && dl.progress > 0 && (
          <View style={s.dlStats}>
            <Text style={s.dlStat}>{formatBytes(dl.downloadedBytes)} / {formatBytes(dl.totalBytes)}</Text>
            <Text style={s.dlStat}>{formatSpeed(dl.speed)}</Text>
            <Text style={s.dlStat}>ETA: {formatEta(dl.eta)}</Text>
          </View>
        )}

        {/* Verifying message after 95% */}
        {dl.status === 'downloading' && dl.progress >= 95 && dl.progress < 100 && (
          <Text style={s.dlVerifying}>Verifying download...</Text>
        )}

        {/* Error + Retry */}
        {dl.status === 'error' && (
          <View style={s.dlErrorBox}>
            <Text style={s.dlErrorText}>{dl.error || 'Unknown error'}</Text>
            <TouchableOpacity style={s.dlRetryBtn} onPress={handleRetry}>
              <Ionicons name="refresh" size={14} color="#D4AF37" />
              <Text style={s.dlRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

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
          {info.title && <Text style={s.updateTitle}>{info.title}</Text>}
          {info.description ? (
            <ScrollView style={s.descScroll} nestedScrollEnabled>
              <Text style={s.descText}>{info.description}</Text>
            </ScrollView>
          ) : (
            <Text style={s.blockMessage}>A critical update is available. Please update to continue using BookMyShot.</Text>
          )}
          <View style={s.warningBox}>
            <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
            <Text style={s.warningText}>This update is mandatory for security and performance.</Text>
          </View>

          {/* Download Progress or Update Button */}
          {dl.status !== 'idle' ? renderDownloadProgress() : (
            <TouchableOpacity style={s.updateBtn} onPress={handleUpdate} activeOpacity={0.85}>
              <Ionicons name="download-outline" size={18} color="#000" />
              <Text style={s.updateBtnText}>Update Now</Text>
            </TouchableOpacity>
          )}

          <Text style={s.currentText}>Current: v{APP_VERSION_NAME} (code {APP_VERSION_CODE})</Text>
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

            {/* Download Progress or Buttons */}
            {dl.status !== 'idle' ? renderDownloadProgress() : (
              <>
                <TouchableOpacity style={s.optUpdateBtn} onPress={handleUpdate} activeOpacity={0.85}>
                  <Ionicons name="download-outline" size={16} color="#000" />
                  <Text style={s.optUpdateText}>Update Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.optLaterBtn} onPress={handleLater} activeOpacity={0.7}>
                  <Text style={s.optLaterText}>Later</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </>
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  // Force update
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
  // Optional
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
  // Download Progress
  dlContainer: { width: '100%', marginTop: 4, alignItems: 'center' },
  dlPercentage: { fontSize: 48, fontWeight: '800', color: '#D4AF37', marginBottom: 8, textAlign: 'center' },
  dlStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dlStatusText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  dlProgressBarBg: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  dlProgressBarFill: { height: 8, backgroundColor: '#D4AF37', borderRadius: 4 },
  dlStats: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  dlStat: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  dlVerifying: { fontSize: 11, color: 'rgba(212,175,55,0.7)', fontStyle: 'italic', marginTop: 4 },
  dlErrorBox: { alignItems: 'center', marginTop: 8 },
  dlErrorText: { fontSize: 11, color: '#ef4444', textAlign: 'center', marginBottom: 10 },
  dlRetryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212,175,55,0.1)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  dlRetryText: { fontSize: 12, fontWeight: '600', color: '#D4AF37' },
});
