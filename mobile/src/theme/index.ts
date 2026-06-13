/**
 * BookMyShot — Premium Design System
 * Luxury wedding-tech marketplace identity
 */

export const colors = {
  // Primary palette
  primary: '#D4AF37',       // Luxury gold
  primaryLight: '#E8D5A3',  // Light gold
  primaryDark: '#8B7025',   // Deep gold
  primaryMuted: 'rgba(212, 175, 55, 0.12)',

  // Backgrounds
  background: '#0A0A0A',    // True black
  surface: '#141414',       // Card surface
  surfaceLight: '#1C1C1C',  // Elevated surface
  surfaceGlass: 'rgba(20, 20, 20, 0.85)', // Glassmorphism

  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  textInverse: '#0A0A0A',

  // Accents
  accent: '#FF8C42',        // Warm orange
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderGold: 'rgba(212, 175, 55, 0.2)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const typography = {
  // Display
  displayLg: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 42 },
  displayMd: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 36 },
  displaySm: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 32 },

  // Headlines
  headlineLg: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 28 },
  headlineMd: { fontSize: 18, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 26 },
  headlineSm: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 24 },

  // Body
  bodyLg: { fontSize: 16, fontWeight: '400' as const, letterSpacing: 0.1, lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.1, lineHeight: 22 },
  bodySm: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.2, lineHeight: 18 },

  // Labels
  labelLg: { fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.3, lineHeight: 20 },
  labelMd: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.4, lineHeight: 16 },
  labelSm: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.5, lineHeight: 14 },

  // Caption
  caption: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.3, lineHeight: 16 },
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  gold: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: { damping: 15, stiffness: 150, mass: 0.5 },
};
