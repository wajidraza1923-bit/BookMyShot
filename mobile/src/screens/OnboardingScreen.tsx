import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, radius } from '../theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '📸',
    title: 'Discover Premium\nCreators',
    subtitle: 'Find the best wedding photographers, cinematographers, and makeup artists in your city.',
    accent: 'Browse curated portfolios and reviews',
  },
  {
    id: '2',
    icon: '✨',
    title: 'Book With\nConfidence',
    subtitle: 'Secure payments, verified profiles, and transparent pricing. Your dream wedding team awaits.',
    accent: 'Trusted by 500+ couples',
  },
  {
    id: '3',
    icon: '🎬',
    title: 'Your Vision,\nCaptured Forever',
    subtitle: 'From pre-wedding shoots to reception reels — every moment preserved in cinematic quality.',
    accent: 'Start your journey today',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => (
    <View style={styles.slide}>
      {/* Large emoji icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.slideIcon}>{item.icon}</Text>
      </View>

      {/* Title */}
      <Text style={styles.slideTitle}>{item.title}</Text>

      {/* Subtitle */}
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

      {/* Accent text */}
      <View style={styles.accentContainer}>
        <View style={styles.accentDot} />
        <Text style={styles.accentText}>{item.accent}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
      />

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          {activeIndex === slides.length - 1 ? (
            <Text style={styles.nextBtnText}>Get Started</Text>
          ) : (
            <Ionicons name="arrow-forward" size={22} color={colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: spacing.xl,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.labelLg,
    color: colors.textMuted,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingBottom: 120,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  slideIcon: {
    fontSize: 44,
  },
  slideTitle: {
    ...typography.displayLg,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  slideSubtitle: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing['2xl'],
  },
  accentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  accentText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  pagination: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  nextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 13,
  },
});
