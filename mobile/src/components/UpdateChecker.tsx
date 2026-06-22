/**
 * UpdateChecker — Checks for app updates on startup
 * Shows modal if new version available. Force update blocks app usage.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const APP_VERSION = '2.0.0';
const APP_VERSION_CODE = 1;
const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

export default function UpdateChecker({ children }: { children: React.ReactNode }) {
  const [showUpdate, setShowUpdate] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const res = await fetch(`${API_BASE}/app-version`);
      const data = await res.json();
      if (!data.success) return;

      const serverCode = data.versionCode || 0;
      const minCode = data.minVersionCode || 0;

      if (serverCode > APP_VERSION_CODE) {
        setUpdateInfo(data);
        setShowUpdate(true);
        if (APP_VERSION_CODE < minCode || data.forceUpdate) {
          setForceUpdate(true);
        }
      }
    } catch {}
  };

  const handleUpdate = () => {
    if (updateInfo?.playStoreUrl) {
      Linking.openURL(updateInfo.playStoreUrl);
    } else if (updateInfo?.downloadUrl) {
      Linking.openURL(updateInfo.downloadUrl);
    }
  };

  return (
    <>
      {children}
      <Modal visible={showUpdate} transparent animationType="fade">
        <View style={st.overlay}>
          <View style={st.card}>
            <View style={st.iconWrap}><Ionicons name="rocket-outline" size={28} color="#F97316" /></View>
            <Text style={st.title}>Update Available</Text>
            <Text style={st.version}>v{updateInfo?.version}</Text>
            <Text style={st.message}>{updateInfo?.updateMessage || 'A new version is available with improvements and bug fixes.'}</Text>
            {updateInfo?.releaseNotes && <Text style={st.notes}>{updateInfo.releaseNotes}</Text>}
            <TouchableOpacity style={st.updateBtn} onPress={handleUpdate}>
              <Ionicons name="download-outline" size={16} color="#000" />
              <Text style={st.updateBtnText}>Update Now</Text>
            </TouchableOpacity>
            {!forceUpdate && (
              <TouchableOpacity style={st.laterBtn} onPress={() => setShowUpdate(false)}>
                <Text style={st.laterText}>Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  card: { backgroundColor: '#111', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  version: { fontSize: 12, color: '#F97316', fontWeight: '600', marginBottom: 10 },
  message: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 19, marginBottom: 8 },
  notes: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F97316', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, width: '100%', justifyContent: 'center' },
  updateBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  laterBtn: { marginTop: 12, paddingVertical: 8 },
  laterText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
