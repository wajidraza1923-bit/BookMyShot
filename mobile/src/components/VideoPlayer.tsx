/**
 * VideoPlayer — In-app video playback using WebView
 * No native module required — works in Expo Go and production APKs
 * Streams video from URL with full controls (play/pause/seek/fullscreen)
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface VideoPlayerProps {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export default function VideoPlayer({ visible, url, onClose }: VideoPlayerProps) {
  if (!visible || !url) return null;

  // HTML5 video player with native controls, auto-play, dark background
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center}
video{width:100%;height:100%;object-fit:contain;background:#000}
</style>
</head>
<body>
<video
  src="${url}"
  autoplay
  playsinline
  controls
  controlsList="nodownload"
  style="width:100%;height:100%"
></video>
</body>
</html>`;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={st.container}>
        <StatusBar hidden />
        <WebView
          source={{ html }}
          style={st.webview}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          scalesPageToFit={true}
        />
        {/* Close button */}
        <TouchableOpacity style={st.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
