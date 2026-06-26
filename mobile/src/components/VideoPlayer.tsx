/**
 * VideoPlayer — Full-screen in-app video player
 * Streams from URL, supports play/pause, seek, mute, fullscreen
 */
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, StatusBar, ActivityIndicator, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface VideoPlayerProps {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export default function VideoPlayer({ visible, url, onClose }: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsBuffering(true);
      return;
    }
    setIsBuffering(status.isBuffering || false);
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) await videoRef.current.pauseAsync();
    else await videoRef.current.playAsync();
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;
    await videoRef.current.setIsMutedAsync(!isMuted);
    setIsMuted(!isMuted);
  };

  const seekForward = async () => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(Math.min(position + 10000, duration));
  };

  const seekBackward = async () => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(Math.max(position - 10000, 0));
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={st.container}>
        <StatusBar hidden />

        {/* Video */}
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={st.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={true}
          isMuted={isMuted}
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
        />

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={st.bufferOverlay}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        )}

        {/* Controls Overlay */}
        <View style={st.controlsOverlay}>
          {/* Top Bar */}
          <View style={st.topBar}>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMute} style={st.muteBtn}>
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Center Controls */}
          <View style={st.centerControls}>
            <TouchableOpacity onPress={seekBackward} style={st.seekBtn}>
              <Ionicons name="play-back" size={24} color="rgba(255,255,255,0.7)" />
              <Text style={st.seekText}>10s</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={st.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={seekForward} style={st.seekBtn}>
              <Ionicons name="play-forward" size={24} color="rgba(255,255,255,0.7)" />
              <Text style={st.seekText}>10s</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Bar - Progress */}
          <View style={st.bottomBar}>
            <Text style={st.timeText}>{formatTime(position)}</Text>
            <View style={st.progressBar}>
              <View style={[st.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={st.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video: { width: SCREEN_W, height: SCREEN_H },
  bufferOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  muteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  seekBtn: { alignItems: 'center' },
  seekText: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', minWidth: 36 },
  progressBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },
});
