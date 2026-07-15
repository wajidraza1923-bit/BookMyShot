/**
 * BookMyShot Official Theme — White + Purple + Pink
 * This is the single source of truth for all UI styling across the app.
 * Every screen MUST use these values instead of hardcoded colors.
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8F6FF',
  surfaceAlt: '#F9FAFB',
  card: '#FFFFFF',

  // Primary (Purple)
  primary: '#6C3BFF',
  primaryLight: '#8B5CF6',
  primaryMuted: '#F3E8FF',
  primaryBorder: '#EDE9FE',

  // Secondary (Pink)
  secondary: '#FF4FA3',
  secondaryLight: '#FDF2F8',
  secondaryMuted: '#FFF1F2',

  // Accent (Gold — for cashback)
  accent: '#F4B400',
  accentLight: '#FEF3C7',
  accentBorder: '#FCD34D',

  // Status
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',

  // Text
  text: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders
  border: '#F1F5F9',
  borderLight: '#F3F4F6',
  borderMedium: '#E5E7EB',
  borderDark: '#D1D5DB',

  // Gradients
  gradientPrimary: ['#6C3BFF', '#8B5CF6', '#FF4FA3'] as const,
  gradientPurple: ['#6C3BFF', '#8B5CF6'] as const,
  gradientPink: ['#FF4FA3', '#F472B6'] as const,
  gradientHero: ['#EDE5FF', '#F5E8F2', '#FCF0F4', '#FFFFFF'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 48,
  '6xl': 64,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const typography = {
  // Headings
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.text, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '800' as const, color: colors.text, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.text, lineHeight: 24 },
  h4: { fontSize: 15, fontWeight: '700' as const, color: colors.text, lineHeight: 20 },

  // Legacy aliases (used by admin screens)
  displaySm: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  headlineMd: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  headlineSm: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  caption: { fontSize: 11, fontWeight: '400' as const, color: colors.textMuted },

  // Body
  bodyLg: { fontSize: 15, fontWeight: '400' as const, color: colors.textSecondary, lineHeight: 22 },
  bodyMd: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary, lineHeight: 18 },
  bodySm: { fontSize: 11, fontWeight: '400' as const, color: colors.textMuted, lineHeight: 16 },

  // Labels
  labelLg: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  labelMd: { fontSize: 12, fontWeight: '600' as const, color: colors.text },
  labelSm: { fontSize: 10, fontWeight: '600' as const, color: colors.textMuted },

  // Buttons
  btnLg: { fontSize: 15, fontWeight: '700' as const },
  btnMd: { fontSize: 13, fontWeight: '700' as const },
  btnSm: { fontSize: 11, fontWeight: '600' as const },
};

export const shadows = {
  sm: { elevation: 1, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  md: { elevation: 2, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  lg: { elevation: 4, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  btn: { elevation: 3, shadowColor: '#6C3BFF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
};
