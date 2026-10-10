import { Pressable, View } from 'react-native';

import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';

type Option<T extends string> = { id: T; label: string };

/**
 * Compact single choice where tapping the selected option clears it
 * ("no preference"). Used for keep / move / replace decisions.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  accessibilityLabel: string;
}) {
  const colors = useColors();
  return (
    <View
      role="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceSunken, borderRadius: radius.full, padding: 3, gap: 3 }}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            role="radio"
            aria-checked={selected}
            accessibilityLabel={`${accessibilityLabel}: ${option.label}`}
            onPress={() => onChange(selected ? undefined : option.id)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 36,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.primary : pressed ? colors.surfaceMuted : 'transparent',
            })}>
            <AppText variant="caption" style={{ color: selected ? colors.onPrimary : colors.textSecondary }} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
