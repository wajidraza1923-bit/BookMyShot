/**
 * AdminAppUpdates — Mobile Admin: App Update Management
 * Upload APK, publish versions, control force updates
 * Uses SAME backend API as Website Admin — fully synchronized in real time
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';
import { useRealTime } from '../../hooks/useRealTime';

const APP_VERSION_CODE = 2;
const APP_VERSION_NAME = '2.1.0';

export default function AdminAppUpdates({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // APK file
  const [apkFile, setApkFile] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    version: '', versionCode: '', title: '', description: '',
    forceUpdate: false, optionalUpdate: true,
  });

  const load = useCallback(async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        api.get('/app-version'),
        api.get('/app-version/history'),
      ]);
      setLatest(latestRes.data);
      setHistory(historyRes.data?.versions || []);
    } catch (e: any) {
      console.log('[AppUpdates] Load error:', e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Real-time: auto-refresh when version published from website admin
  useRealTime('appVersion:published', () => { load(); });

  // Pick APK file from device
  const pickApk = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.android.package-archive',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (!file.name.endsWith('.apk')) {
        Alert.alert('Invalid File', 'Please select a .apk file');
        return;
      }
      setApkFile(file);
    } catch (e: any) {
      Alert.alert('Error', 'Could not pick file: ' + e.message);
    }
  };

  // Publish with APK upload
  const handlePublish = async () => {
    if (!form.version || !form.versionCode) {
      Alert.alert('Required', 'Version name and code are required');
      return;
    }
    if (!apkFile) {
      Alert.alert('Required', 'Please select an APK file to upload');
      return;
    }

    setPublishing(true);
    setUploadProgress('Uploading APK...');

    try {
      const formData = new FormData();
      formData.append('version', form.version);
      formData.append('versionCode', form.versionCode);
      formData.append('title', form.title || `BookMyShot v${form.version}`);
      formData.append('description', form.description);
      formData.append('minVersionCode', '1');
      formData.append('forceUpdate', form.forceUpdate.toString());
      formData.append('optionalUpdate', form.optionalUpdate.toString());

      // Append APK file
      formData.append('apk', {
        uri: apkFile.uri,
        type: 'application/vnd.android.package-archive',
        name: apkFile.name || 'app.apk',
      } as any);

      setUploadProgress('Uploading APK... (this may take a minute)');

      const res = await api.post('/app-version', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min timeout for large APK
      });

      if (res.data?.success) {
        setUploadProgress('');
        Alert.alert('Published ✅', `v${form.version} is now live!\nAPK uploaded successfully.`);
        setShowForm(false);
        setApkFile(null);
        setForm({ version: '', versionCode: '', title: '', description: '', forceUpdate: false, optionalUpdate: true });
        await load();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to publish');
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e.response?.data?.message || e.message || 'Network error. Check your connection.');
    } finally {
      setPublishing(false);
      setUploadProgress('');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this version permanently?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/app-version/${id}`); await load(); } catch {}
      }},
    ]);
  };

  const fmtSize = (bytes: number) => bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—';
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <View style={st.root}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>App Updates</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={st.addBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
      >
        {/* Current App Version */}
        <View style={st.card}>
          <Text style={st.sectionTitle}>📱 Installed Version</Text>
          <View style={st.infoRow}>
            <Text style={st.infoLabel}>Version</Text>
            <Text style={st.infoValue}>v{APP_VERSION_NAME} (code {APP_VERSION_CODE})</Text>
          </View>
        </View>

        {/* Latest Server Version */}
        {latest && latest.versionCode > 0 && (
          <View style={st.card}>
            <View style={st.cardHead}>
              <Text style={st.sectionTitle}>🚀 Latest Published</Text>
              {latest.forceUpdate && <View style={st.forceBadge}><Text style={st.forceText}>FORCE</Text></View>}
            </View>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Version</Text>
              <Text style={[st.infoValue, { color: colors.primary }]}>v{latest.version} (code {latest.versionCode})</Text>
            </View>
            {latest.title && <View style={st.infoRow}><Text style={st.infoLabel}>Title</Text><Text style={st.infoValue}>{latest.title}</Text></View>}
            {latest.description && (
              <View style={st.notesBox}>
                <Text style={st.notesLabel}>Release Notes</Text>
                <Text style={st.notesText}>{latest.description}</Text>
              </View>
            )}
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Force Update</Text>
              <Text style={[st.infoValue, { color: latest.forceUpdate ? '#dc2626' : '#10b981' }]}>{latest.forceUpdate ? 'ON' : 'OFF'}</Text>
            </View>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>APK Status</Text>
              <Text style={[st.infoValue, { color: latest.downloadUrl ? '#10b981' : '#f59e0b' }]}>{latest.downloadUrl ? '✓ Uploaded' : '⚠ No APK'}</Text>
            </View>
            {latest.downloadUrl && (
              <TouchableOpacity style={st.downloadBtn} onPress={() => Linking.openURL(latest.downloadUrl)}>
                <Ionicons name="download-outline" size={14} color="#000" />
                <Text style={st.downloadText}>Download APK</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ═══ Publish Form ═══ */}
        {showForm && (
          <View style={st.card}>
            <Text style={st.sectionTitle}>📤 Publish New Update</Text>

            <InputField label="Version Name *" value={form.version} onChangeText={(v: string) => setForm({...form, version: v})} placeholder="2.2.0" />
            <InputField label="Version Code *" value={form.versionCode} onChangeText={(v: string) => setForm({...form, versionCode: v})} placeholder="3" keyboardType="numeric" />
            <InputField label="Update Title" value={form.title} onChangeText={(v: string) => setForm({...form, title: v})} placeholder="Major Performance Update" />
            <InputField label="What's New *" value={form.description} onChangeText={(v: string) => setForm({...form, description: v})} placeholder="• Bug fixes&#10;• New features" multiline />

            {/* APK File Picker */}
            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>Upload APK *</Text>
              <TouchableOpacity style={[st.apkPicker, apkFile && st.apkPickerSelected]} onPress={pickApk} activeOpacity={0.7}>
                {apkFile ? (
                  <View style={st.apkSelected}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <View style={{ flex: 1 }}>
                      <Text style={st.apkFileName} numberOfLines={1}>{apkFile.name}</Text>
                      <Text style={st.apkFileSize}>{fmtSize(apkFile.size || 0)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setApkFile(null)}>
                      <Ionicons name="close-circle" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={st.apkEmpty}>
                    <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                    <Text style={st.apkPickText}>Choose APK File</Text>
                    <Text style={st.apkPickSub}>Tap to browse your device</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Toggles */}
            <View style={st.toggleRow}>
              <TouchableOpacity style={st.toggleItem} onPress={() => setForm({...form, forceUpdate: !form.forceUpdate})}>
                <Ionicons name={form.forceUpdate ? 'checkbox' : 'square-outline'} size={20} color={form.forceUpdate ? '#dc2626' : colors.textMuted} />
                <View>
                  <Text style={[st.toggleLabel, form.forceUpdate && { color: '#dc2626' }]}>Force Update</Text>
                  <Text style={st.toggleSub}>Blocks app until updated</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={st.toggleItem} onPress={() => setForm({...form, optionalUpdate: !form.optionalUpdate})}>
                <Ionicons name={form.optionalUpdate ? 'checkbox' : 'square-outline'} size={20} color={form.optionalUpdate ? colors.primary : colors.textMuted} />
                <View>
                  <Text style={[st.toggleLabel, form.optionalUpdate && { color: colors.primary }]}>Optional Update</Text>
                  <Text style={st.toggleSub}>Shows Later button</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Upload Progress */}
            {uploadProgress ? (
              <View style={st.progressBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={st.progressText}>{uploadProgress}</Text>
              </View>
            ) : null}

            {/* Publish Button */}
            <TouchableOpacity
              style={[st.publishBtn, publishing && { opacity: 0.5 }]}
              onPress={handlePublish}
              disabled={publishing}
              activeOpacity={0.85}
            >
              {publishing ? <ActivityIndicator size="small" color="#000" /> : (
                <><Ionicons name="rocket-outline" size={16} color="#000" /><Text style={st.publishText}>Publish Update</Text></>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ Version History ═══ */}
        <Text style={st.historyTitle}>📋 Version History</Text>
        {history.length === 0 ? (
          <Text style={st.emptyText}>No versions published yet</Text>
        ) : (
          history.map(v => (
            <View key={v._id} style={st.historyCard}>
              <View style={st.historyHead}>
                <View style={{ flex: 1 }}>
                  <Text style={st.historyVer}>v{v.version} <Text style={st.historyCode}>(code {v.versionCode})</Text></Text>
                  {v.title && <Text style={st.historyTitleText}>{v.title}</Text>}
                </View>
                <View style={st.badges}>
                  {v.forceUpdate && <View style={st.badgeRed}><Text style={st.badgeRedText}>Force</Text></View>}
                  {v.downloadUrl && <View style={st.badgeGreen}><Text style={st.badgeGreenText}>APK ✓</Text></View>}
                  {!v.downloadUrl && <View style={st.badgeYellow}><Text style={st.badgeYellowText}>No APK</Text></View>}
                </View>
              </View>
              {v.description && <Text style={st.historyDesc} numberOfLines={2}>{v.description}</Text>}
              <View style={st.historyMeta}>
                <Text style={st.metaText}>{fmtDate(v.createdAt)}</Text>
                {v.fileSize > 0 && <Text style={st.metaText}>{fmtSize(v.fileSize)}</Text>}
                {v.downloadUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(v.downloadUrl)}>
                    <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '600' }}>⬇ APK</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(v._id)}>
                  <Text style={st.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function InputField({ label, value, onChangeText, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={[st.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
        selectionColor={colors.primary}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 10, gap: 10 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 8, letterSpacing: 0.3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  infoLabel: { fontSize: 12, color: colors.textMuted },
  infoValue: { fontSize: 12, fontWeight: '600', color: colors.text },
  notesBox: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginVertical: 6, borderWidth: 1, borderColor: colors.border },
  notesLabel: { fontSize: 10, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  notesText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 16 },
  forceBadge: { backgroundColor: 'rgba(220,38,38,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  forceText: { fontSize: 9, fontWeight: '700', color: '#dc2626' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, marginTop: 8 },
  downloadText: { fontSize: 12, fontWeight: '700', color: '#000' },
  // Form
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
  fieldInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#fff' },
  // APK Picker
  apkPicker: { borderWidth: 2, borderColor: 'rgba(212,175,55,0.2)', borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center' },
  apkPickerSelected: { borderColor: '#10b981', borderStyle: 'solid', backgroundColor: 'rgba(16,185,129,0.03)' },
  apkEmpty: { alignItems: 'center', gap: 4 },
  apkPickText: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 4 },
  apkPickSub: { fontSize: 11, color: colors.textMuted },
  apkSelected: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  apkFileName: { fontSize: 12, fontWeight: '600', color: '#10b981' },
  apkFileSize: { fontSize: 10, color: colors.textMuted },
  // Toggles
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  toggleItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
  toggleLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  toggleSub: { fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 1 },
  // Progress
  progressBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(212,175,55,0.04)', borderRadius: 8, padding: 10, marginBottom: 10 },
  progressText: { fontSize: 11, color: colors.primary },
  // Publish
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14 },
  publishText: { fontSize: 14, fontWeight: '700', color: '#000' },
  // History
  historyTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
  emptyText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  historyCard: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  historyHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  historyVer: { fontSize: 13, fontWeight: '700', color: colors.text },
  historyCode: { fontWeight: '400', color: colors.textMuted },
  historyTitleText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  historyDesc: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6, lineHeight: 14 },
  badges: { flexDirection: 'row', gap: 4 },
  badgeRed: { backgroundColor: 'rgba(220,38,38,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeRedText: { fontSize: 9, fontWeight: '700', color: '#dc2626' },
  badgeGreen: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeGreenText: { fontSize: 9, fontWeight: '700', color: '#10b981' },
  badgeYellow: { backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeYellowText: { fontSize: 9, fontWeight: '700', color: '#f59e0b' },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 9, color: 'rgba(255,255,255,0.25)' },
  deleteText: { fontSize: 10, color: '#dc2626', fontWeight: '600' },
});
