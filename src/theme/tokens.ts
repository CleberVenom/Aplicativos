/** Spacing scale on a 4-point grid. Screen edge padding is `spacing.xl`. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  card: '0 1px 2px rgba(30, 25, 21, 0.05), 0 4px 14px rgba(30, 25, 21, 0.06)',
  raised: '0 8px 24px rgba(30, 25, 21, 0.12)',
  overlay: '0 12px 32px rgba(0, 0, 0, 0.25)',
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

/** Max width for content on tablets/web so lines stay readable. */
export const layout = {
  maxContentWidth: 720,
  screenPadding: spacing.xl,
  touchTarget: 48,
} as const;
