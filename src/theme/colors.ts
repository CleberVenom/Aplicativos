import { useColorScheme } from 'react-native';

/**
 * Brand palette. The app has its own visual identity (warm neutrals + terracotta),
 * so colors are explicit light/dark pairs instead of platform semantic colors.
 * Text/background pairs were checked for WCAG AA contrast (>= 4.5:1 for body text).
 */
const light = {
  background: '#F6F1EA',
  surface: '#FFFFFF',
  surfaceMuted: '#EFE8DE',
  surfaceSunken: '#E7DED2',
  border: '#E0D5C7',
  borderStrong: '#CDBFAE',
  text: '#1E1915',
  textSecondary: '#5F554C',
  textTertiary: '#706458',
  primary: '#9A4527',
  primaryPressed: '#7F381F',
  primarySoft: '#F4E3D9',
  onPrimary: '#FFFFFF',
  accent: '#4F5D45',
  accentSoft: '#E3E8DB',
  success: '#2F6B4A',
  successSoft: '#DDEFE3',
  warning: '#8A5D0B',
  warningSoft: '#FBEFD5',
  danger: '#A83224',
  dangerSoft: '#F8E0DB',
  info: '#2F5A7A',
  infoSoft: '#DDE9F2',
  overlay: 'rgba(20, 16, 12, 0.55)',
  imagePlaceholder: '#E2D8CB',
  shadow: 'rgba(30, 25, 21, 0.08)',
} as const;

export type ThemeColors = { [K in keyof typeof light]: string };

const dark: ThemeColors = {
  background: '#161311',
  surface: '#201C19',
  surfaceMuted: '#2A2521',
  surfaceSunken: '#120F0D',
  border: '#3A332D',
  borderStrong: '#4D443C',
  text: '#F4EEE7',
  textSecondary: '#C9BEB2',
  textTertiary: '#A39588',
  primary: '#E08A63',
  primaryPressed: '#C9724C',
  primarySoft: '#3B2A22',
  onPrimary: '#1E1410',
  accent: '#A9B79A',
  accentSoft: '#2B3127',
  success: '#7CC39A',
  successSoft: '#1F3328',
  warning: '#E3B15A',
  warningSoft: '#3A2E17',
  danger: '#F08A7C',
  dangerSoft: '#3D1F1A',
  info: '#8AB8DA',
  infoSoft: '#1D2C38',
  overlay: 'rgba(0, 0, 0, 0.65)',
  imagePlaceholder: '#2E2823',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export const palettes = { light, dark } as const;

export type ColorSchemeName = 'light' | 'dark';

/** Returns the palette for the active color scheme (re-renders when it changes). */
export function useColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export function useSchemeName(): ColorSchemeName {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}
