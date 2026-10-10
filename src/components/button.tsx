import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useColors, type ThemeColors } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tonal';
type Size = 'sm' | 'md' | 'lg';

const sizes = {
  sm: { minHeight: 36, paddingHorizontal: spacing.md, gap: spacing.xs, icon: 16, text: 'subhead' as const },
  md: { minHeight: 48, paddingHorizontal: spacing.lg, gap: spacing.sm, icon: 20, text: 'headline' as const },
  lg: { minHeight: 56, paddingHorizontal: spacing.xl, gap: spacing.sm, icon: 22, text: 'headline' as const },
};

function variantColors(variant: Variant, colors: ThemeColors, pressed: boolean) {
  switch (variant) {
    case 'primary':
      return { bg: pressed ? colors.primaryPressed : colors.primary, fg: colors.onPrimary, border: 'transparent' };
    case 'secondary':
      return { bg: pressed ? colors.surfaceMuted : colors.surface, fg: colors.text, border: colors.borderStrong };
    case 'tonal':
      return { bg: pressed ? colors.surfaceSunken : colors.primarySoft, fg: colors.primary, border: 'transparent' };
    case 'danger':
      return { bg: pressed ? colors.dangerSoft : 'transparent', fg: colors.danger, border: colors.danger };
    case 'ghost':
    default:
      return { bg: pressed ? colors.surfaceMuted : 'transparent', fg: colors.primary, border: 'transparent' };
  }
}

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Short description for screen readers when the title alone is not enough. */
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const colors = useColors();
  const s = sizes[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      role="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      aria-disabled={!!inactive}
      aria-busy={!!loading}
      disabled={inactive}
      testID={testID}
      onPress={() => {
        if (process.env.EXPO_OS === 'ios' && variant === 'primary') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.();
      }}
      style={({ pressed }) => {
        const c = variantColors(variant, colors, pressed);
        return [
          {
            minHeight: s.minHeight,
            paddingHorizontal: s.paddingHorizontal,
            borderRadius: radius.full,
            backgroundColor: c.bg,
            borderWidth: variant === 'secondary' || variant === 'danger' ? 1 : 0,
            borderColor: c.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: s.gap,
            opacity: inactive ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          style,
        ];
      }}>
      {({ pressed }) => {
        const c = variantColors(variant, colors, pressed);
        return (
          <>
            {loading ? (
              <ActivityIndicator color={c.fg} />
            ) : icon ? (
              <Icon name={icon} size={s.icon} color={c.fg} />
            ) : null}
            <AppText variant={s.text} style={{ color: c.fg }} numberOfLines={1}>
              {title}
            </AppText>
            {iconRight && !loading ? <Icon name={iconRight} size={s.icon} color={c.fg} /> : null}
          </>
        );
      }}
    </Pressable>
  );
}

/** Round icon-only button with a required accessible label. */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'secondary',
  size = 44,
  testID,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'secondary' | 'ghost' | 'overlay';
  size?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            variant === 'overlay' ? 'rgba(20,16,12,0.55)' : variant === 'secondary' ? colors.surface : 'transparent',
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <View>
        <Icon name={icon} size={Math.round(size * 0.46)} color={variant === 'overlay' ? '#FFFFFF' : colors.text} />
      </View>
    </Pressable>
  );
}
