import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadows } from '../theme';

interface CreatorCardProps {
  creator: {
    _id: string;
    user?: { name: string; avatar?: string };
    specialty?: string;
    city?: string;
    rating?: number;
    startingPrice?: number;
    portfolio?: string[];
    featured?: boolean;
  };
  onPress: (id: string) => void;
  variant?: 'default' | 'compact' | 'featured';
}

export default function CreatorCard({ creator, onPress, variant = 'default' }: CreatorCardProps) {
  const name = creator.user?.name || 'Creator';
  const avatar = creator.user?.avatar;
  const coverImage = creator.portfolio?.[0];
  const isFeatured = variant === 'featured' || creator.featured;

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compact}
        onPress={() => onPress(creator._id)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: avatar || 'https://via.placeholder.com/80' }}
          style={styles.compactAvatar}
        />
        <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
        <Text style={styles.compactSpec} numberOfLines={1}>{creator.specialty || 'Photographer'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, isFeatured && styles.featuredCard]}
      onPress={() => onPress(creator._id)}
      activeOpacity={0.9}
    >
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: coverImage || avatar || 'https://via.placeholder.com/300x200' }}
          style={styles.coverImage}
        />
        {isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color={colors.textInverse} />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        {creator.startingPrice && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₹{creator.startingPrice?.toLocaleString('en-IN')}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Image
            source={{ uri: avatar || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
          <View style={styles.infoText}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.spec} numberOfLines={1}>
              {creator.specialty || 'Photographer'} • {creator.city || 'India'}
            </Text>
          </View>
        </View>
        {creator.rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.primary} />
            <Text style={styles.rating}>{creator.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  featuredCard: {
    borderColor: colors.borderGold,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  featuredText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  priceBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  priceText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  info: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  infoText: {
    flex: 1,
  },
  name: {
    ...typography.labelLg,
    color: colors.text,
  },
  spec: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    ...typography.labelMd,
    color: colors.textSecondary,
  },
  // Compact variant
  compact: {
    alignItems: 'center',
    width: 80,
    marginRight: spacing.lg,
  },
  compactAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.borderGold,
    marginBottom: spacing.sm,
  },
  compactName: {
    ...typography.labelMd,
    color: colors.text,
    textAlign: 'center',
  },
  compactSpec: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
