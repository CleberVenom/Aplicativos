import { Pressable, View } from 'react-native';

import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
  testID?: string;
};

/** Small selectable pill. With `color`, shows a swatch dot (color choices). */
export function Chip({ label, selected = false, onPress, color, disabled, testID }: ChipProps) {
  const colors = useColors();
  return (
    <Pressable
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 40,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : pressed ? colors.surfaceMuted : colors.surface,
        opacity: disabled ? 0.45 : 1,
      })}>
      {color ? (
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 1, borderColor: colors.borderStrong }} />
      ) : null}
      <AppText variant="subhead" style={{ color: selected ? colors.primary : colors.text }}>
        {label}
      </AppText>
      {selected && !color ? <Icon name="check" size={14} color={colors.primary} /> : null}
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}
