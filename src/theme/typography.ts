import type { TextStyle } from 'react-native';

/**
 * Display text uses Fraunces (OFL, bundled via @expo-google-fonts) for an editorial,
 * interior-design feel. Body text uses the platform system font for legibility.
 */
export const fontFamilies = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
} as const;

export const typeScale = {
  display: { fontFamily: fontFamilies.displayBold, fontSize: 34, lineHeight: 40 },
  title1: { fontFamily: fontFamilies.display, fontSize: 28, lineHeight: 34 },
  title2: { fontFamily: fontFamilies.display, fontSize: 22, lineHeight: 28 },
  title3: { fontFamily: fontFamilies.display, fontSize: 19, lineHeight: 24 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;
