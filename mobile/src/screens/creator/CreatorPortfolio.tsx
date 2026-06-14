import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const { width } = Dimensions.get('window');
const IMG_SIZE = (width - spacing.xl * 2 - spacing.sm * 2) / 3;

// Exact website limits
const MAX_PHOTOS = 10;
const MAX_VIDEOS = 4;
const PHOTO_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const VIDEO_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'];

export default function CreatorPortfolio({ navigation }: any) {
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'photos' | 'videos'>('photos');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const creator = res.data?.creator;
      setPortfolio(creator?.portfolio || []);
      setVideos(creator?.videos || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ═══ PHOTO UPLOAD (same flow as website) ═══
  const uploadPhotos = async () => {
    const currentCount = portfolio.length;
    const remaining = MAX_PHOTOS - currentCount;

    if (remaining <= 0) {
      Alert.alert('Limit Reached', `Maximum ${MAX_PHOTOS} portfolio photos allowed. Delete an existing photo to upload a new one.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission Required', 'Allow access to photo library to upload portfolio images.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: remaining,
    });

    if (result.canceled || !result.assets?.length) return;

    // Validate file types and sizes (same as website middleware)
    const validAssets = result.assets.filter(asset => {
      const type = asset.mimeType || 'image/jpeg';
      if (!ALLOWED_PHOTO_TYPES.includes(type)) {
        Alert.alert('Invalid Format', 'Allowed formats: JPG, JPEG, PNG, WEBP');
        return false;
      }
      if (asset.fileSize && asset.fileSize > PHOTO_SIZE_LIMIT) {
        Alert.alert('File Too Large', 'Photo size exceeds 10 MB limit.');
        return false;
      }
      return true;
    });

    if (validAssets.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      validAssets.forEach((asset, i) => {
        console.log(`[Portfolio] UPLOAD FILE ${i}: ${asset.uri}`);
        console.log(`[Portfolio] TYPE: ${asset.mimeType}`);
        console.log(`[Portfolio] SIZE: ${asset.fileSize ? (asset.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'unknown'}`);
        formData.append('photos', { uri: asset.uri, name: asset.fileName || `photo_${i}.jpg`, type: asset.mimeType || 'image/jpeg' } as any);
      });

      console.log('[Portfolio] API URL: POST /creators/upload/portfolio');
      const res = await api.post('/creators/upload/portfolio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      console.log('[Portfolio] RESPONSE STATUS: 200');
      console.log('[Portfolio] RESPONSE BODY:', JSON.stringify(res.data)?.substring(0, 300));

      const slots = res.data?.slots;
      Alert.alert('Uploaded', `${res.data?.uploaded || validAssets.length} photo(s) uploaded.${slots ? `\n${slots.remaining} slots remaining.` : ''}`);
      await load();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.response?.data?.message || 'Failed to upload photos. Try again.');
    } finally { setUploading(false); }
  };

  // ═══ VIDEO UPLOAD (same flow as website) ═══
  const uploadVideo = async () => {
    const currentCount = videos.length;
    const remaining = MAX_VIDEOS - currentCount;

    if (remaining <= 0) {
      Alert.alert('Limit Reached', `Maximum ${MAX_VIDEOS} portfolio videos allowed. Delete an existing video to upload a new one.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission Required', 'Allow access to photo library.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > VIDEO_SIZE_LIMIT) {
      Alert.alert('File Too Large', 'Video size exceeds 50 MB limit.');
      return;
    }

    setUploading(true);
    try {
      console.log(`[Portfolio] VIDEO UPLOAD FILE: ${asset.uri}`);
      console.log(`[Portfolio] VIDEO TYPE: ${asset.mimeType}`);
      console.log(`[Portfolio] VIDEO SIZE: ${asset.fileSize ? (asset.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'unknown'}`);

      const formData = new FormData();
      formData.append('videos', { uri: asset.uri, name: asset.fileName || 'video.mp4', type: asset.mimeType || 'video/mp4' } as any);

      console.log('[Portfolio] API URL: POST /creators/upload/videos');
      const res = await api.post('/creators/upload/videos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 min for video
      });
      console.log('[Portfolio] VIDEO RESPONSE STATUS: 200');
      console.log('[Portfolio] VIDEO RESPONSE:', JSON.stringify(res.data)?.substring(0, 300));

      const slots = res.data?.slots;
      Alert.alert('Uploaded', `Video uploaded.${slots ? `\n${slots.remaining} slots remaining.` : ''}`);
      await load();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.response?.data?.message || 'Video size exceeds 50 MB limit.');
    } finally { setUploading(false); }
  };

  // ═══ DELETE PHOTO (same as website) ═══
  const deletePhoto = (item: any) => {
    const url = typeof item === 'string' ? item : item.url;
    const publicId = typeof item === 'string' ? '' : (item.publicId || '');
    console.log('[Portfolio] DELETE PHOTO URL:', url);
    console.log('[Portfolio] DELETE PHOTO publicId:', publicId);
    Alert.alert('Delete Photo', 'Remove this photo from your portfolio?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          console.log('[Portfolio] API URL: DELETE /creators/portfolio');
          console.log('[Portfolio] REQUEST BODY:', JSON.stringify({ url, publicId }));
          const res = await api.delete('/creators/portfolio', { data: { url, publicId } });
          console.log('[Portfolio] DELETE RESPONSE:', JSON.stringify(res.data)?.substring(0, 200));
          await load();
          Alert.alert('Deleted', 'Photo removed from portfolio');
        } catch (e: any) {
          console.log('[Portfolio] DELETE ERROR:', e.response?.status, e.response?.data?.message || e.message);
          Alert.alert('Error', e.response?.data?.message || 'Failed to delete');
        }
      }}
    ]);
  };

  // ═══ DELETE VIDEO (same as website) ═══
  const deleteVideo = (item: any) => {
    const url = typeof item === 'string' ? item : item.url;
    const publicId = typeof item === 'string' ? '' : (item.publicId || '');
    console.log('[Portfolio] DELETE VIDEO URL:', url);
    console.log('[Portfolio] DELETE VIDEO publicId:', publicId);
    Alert.alert('Delete Video', 'Remove this video from your portfolio?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          console.log('[Portfolio] API URL: DELETE /creators/videos');
          console.log('[Portfolio] REQUEST BODY:', JSON.stringify({ url, publicId }));
          const res = await api.delete('/creators/videos', { data: { url, publicId } });
          console.log('[Portfolio] DELETE VIDEO RESPONSE:', JSON.stringify(res.data)?.substring(0, 200));
          await load();
          Alert.alert('Deleted', 'Video removed from portfolio');
        } catch (e: any) {
          console.log('[Portfolio] DELETE VIDEO ERROR:', e.response?.status, e.response?.data?.message || e.message);
          Alert.alert('Error', e.response?.data?.message || 'Failed to delete');
        }
      }}
    ]);
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  const photoSlots = `${portfolio.length}/${MAX_PHOTOS}`;
  const videoSlots = `${videos.length}/${MAX_VIDEOS}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Portfolio</Text>
        <TouchableOpacity onPress={tab === 'photos' ? uploadPhotos : uploadVideo} style={styles.uploadBtn} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Slot counter */}
      <View style={styles.slotsBar}>
        <View style={styles.slotItem}><Ionicons name="images-outline" size={14} color={colors.primary} /><Text style={styles.slotText}>Photos: {photoSlots}</Text></View>
        <View style={styles.slotItem}><Ionicons name="videocam-outline" size={14} color={colors.primary} /><Text style={styles.slotText}>Videos: {videoSlots}</Text></View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'photos' && styles.tabActive]} onPress={() => setTab('photos')}><Text style={[styles.tabText, tab === 'photos' && styles.tabTextActive]}>Photos ({portfolio.length})</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'videos' && styles.tabActive]} onPress={() => setTab('videos')}><Text style={[styles.tabText, tab === 'videos' && styles.tabTextActive]}>Videos ({videos.length})</Text></TouchableOpacity>
      </View>

      {/* Gallery */}
      {tab === 'photos' ? (
        <FlatList
          key="photos-grid"
          data={portfolio}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          columnWrapperStyle={{ gap: spacing.sm }}
          keyExtractor={(item, i) => 'photo-' + (typeof item === 'string' ? item : item.url) + i}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No portfolio photos</Text>
              <Text style={styles.emptySubtitle}>Upload up to {MAX_PHOTOS} photos (max 10 MB each)</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={uploadPhotos}><Ionicons name="add" size={16} color={colors.textInverse} /><Text style={styles.emptyBtnText}>Upload Photos</Text></TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.imageWrap} onLongPress={() => deletePhoto(item)} activeOpacity={0.8}>
              <Image source={{ uri: typeof item === 'string' ? item : item.url }} style={styles.image} />
              <View style={styles.deleteOverlay}><Ionicons name="trash-outline" size={12} color="#fff" /></View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          key="videos-list"
          data={videos}
          numColumns={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyExtractor={(item, i) => 'video-' + (typeof item === 'string' ? item : item.url) + i}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="videocam-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No videos</Text>
              <Text style={styles.emptySubtitle}>Upload up to {MAX_VIDEOS} videos (max 50 MB each)</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={uploadVideo}><Ionicons name="add" size={16} color={colors.textInverse} /><Text style={styles.emptyBtnText}>Upload Video</Text></TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.videoCard} onLongPress={() => deleteVideo(item)} activeOpacity={0.85}>
              <View style={styles.videoThumb}><Ionicons name="play-circle" size={40} color={colors.primary} /></View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoUrl} numberOfLines={1}>{typeof item === 'string' ? item : item.url}</Text>
                <Text style={styles.videoMeta}>Long press to delete</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Upload hint */}
      <View style={styles.hintBar}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={styles.hintText}>Long press any item to delete. Photos: JPG/PNG/WEBP (10MB). Videos: MP4/MOV (50MB).</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  uploadBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  slotsBar: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.sm, marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  slotItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  slotText: { ...typography.labelMd, color: colors.textSecondary },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.xl, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.labelMd, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  imageWrap: { width: IMG_SIZE, height: IMG_SIZE, borderRadius: radius.sm, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  deleteOverlay: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.8)', alignItems: 'center', justifyContent: 'center' },
  videoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  videoThumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg },
  videoInfo: { flex: 1 },
  videoUrl: { ...typography.bodySm, color: colors.text },
  videoMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyTitle: { ...typography.headlineMd, color: colors.text, marginTop: spacing.lg },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  emptyBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
  hintBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  hintText: { ...typography.caption, color: colors.textMuted, flex: 1 },
});
