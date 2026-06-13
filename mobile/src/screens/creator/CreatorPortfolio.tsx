import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, radius } from '../../theme';
import api from '../../services/api';

const { width } = Dimensions.get('window');
const IMG_SIZE = (width - spacing.xl * 2 - spacing.sm * 2) / 3;

export default function CreatorPortfolio({ navigation }: any) {
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow access to photo library'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      result.assets.forEach((asset, i) => {
        const uri = asset.uri;
        const name = uri.split('/').pop() || `photo_${i}.jpg`;
        const type = asset.mimeType || 'image/jpeg';
        formData.append('photos', { uri, name, type } as any);
      });

      await api.post('/creators/upload/portfolio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      Alert.alert('Success', `${result.assets.length} photo(s) uploaded`);
      await load();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.response?.data?.message || e.message || 'Try again');
    } finally { setUploading(false); }
  };

  const deletePhoto = (url: string) => {
    Alert.alert('Delete Photo', 'Remove this from your portfolio?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/creators/portfolio', { data: { url } });
          await load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to delete'); }
      }}
    ]);
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Portfolio</Text>
        <TouchableOpacity onPress={pickAndUpload} style={styles.uploadBtn} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statVal}>{portfolio.length}</Text><Text style={styles.statLabel}>Photos</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={styles.statVal}>{videos.length}</Text><Text style={styles.statLabel}>Videos</Text></View>
      </View>

      {/* Gallery */}
      <FlatList
        data={portfolio}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        columnWrapperStyle={{ gap: spacing.sm }}
        keyExtractor={(item, i) => item + i}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No portfolio photos</Text>
            <Text style={styles.emptySubtitle}>Upload your best work to attract clients</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={pickAndUpload}><Ionicons name="add" size={16} color={colors.textInverse} /><Text style={styles.emptyBtnText}>Upload Photos</Text></TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.imageWrap} onLongPress={() => deletePhoto(item)} activeOpacity={0.8}>
            <Image source={{ uri: item }} style={styles.image} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], paddingBottom: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headlineLg, color: colors.text, flex: 1 },
  uploadBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { ...typography.headlineLg, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  imageWrap: { width: IMG_SIZE, height: IMG_SIZE, borderRadius: radius.sm, overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
  emptyTitle: { ...typography.headlineMd, color: colors.text, marginTop: spacing.lg },
  emptySubtitle: { ...typography.bodyMd, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  emptyBtnText: { ...typography.labelLg, color: colors.textInverse, fontWeight: '600' },
});
