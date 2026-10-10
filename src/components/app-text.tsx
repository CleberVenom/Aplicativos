import { Text, type TextProps } from 'react-native';

import { typeScale, useColors, type ThemeColors, type TypeVariant } from '@/theme';

type Tone = 'default' | 'secondary' | 'tertiary' | 'primary' | 'accent' | 'danger' | 'success' | 'warning' | 'onPrimary';

const toneToColor: Record<Tone, keyof ThemeColors> = {
  default: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  primary: 'primary',
  accent: 'accent',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
  onPrimary: 'onPrimary',
};

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
};

/** The only place screens get font sizes from: always pick a `variant`. */
export function AppText({ variant = 'body', tone = 'default', align, style, ...props }: AppTextProps) {
  const colors = useColors();
  return (
    <Text
      {...props}
      style={[typeScale[variant], { color: colors[toneToColor[tone]] }, align ? { textAlign: align } : null, style]}
    />
  );
}
