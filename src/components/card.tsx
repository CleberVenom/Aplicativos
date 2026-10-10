import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, shadows, spacing, useColors } from '@/theme';

type CardProps = {
  children: ReactNode;
  tone?: 'default' | 'muted' | 'primary' | 'accent';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function useToneColors(tone: NonNullable<CardProps['tone']>) {
  const colors = useColors();
  switch (tone) {
    case 'muted':
      return { bg: colors.surfaceMuted, border: 'transparent' };
    case 'primary':
      return { bg: colors.primarySoft, border: 'transparent' };
    case 'accent':
      return { bg: colors.accentSoft, border: 'transparent' };
    default:
      return { bg: colors.surface, border: colors.border };
  }
}

export function Card({ children, tone = 'default', padded = true, style, testID }: CardProps) {
  const c = useToneColors(tone);
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: tone === 'default' ? 1 : 0,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          padding: padded ? spacing.lg : 0,
          gap: spacing.md,
          boxShadow: tone === 'default' ? shadows.card : undefined,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function PressableCard({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps & { onPress: () => void; accessibilityLabel: string; accessibilityHint?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          overflow: 'hidden',
          boxShadow: shadows.card,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}
