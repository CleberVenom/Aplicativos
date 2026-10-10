import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type OptionCardProps = {
  title: string;
  description?: string;
  icon?: IconName;
  swatches?: readonly string[];
  selected: boolean;
  onPress: () => void;
  /** Multiple choice renders as checkbox, single choice as radio (for screen readers). */
  multiple?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Visual, tappable answer used across the questionnaire. */
export function OptionCard({ title, description, icon, swatches, selected, onPress, multiple, disabled, testID, style }: OptionCardProps) {
  const colors = useColors();
  return (
    <Pressable
      role={multiple ? 'checkbox' : 'radio'}
      aria-checked={selected}
      aria-disabled={disabled}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          flexBasis: '47%',
          flexGrow: 1,
          minHeight: 64,
          padding: spacing.md,
          gap: spacing.sm,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : pressed ? colors.surfaceMuted : colors.surface,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {icon ? <Icon name={icon} size={22} color={selected ? colors.primary : colors.textSecondary} /> : null}
        <AppText variant="headline" style={{ flex: 1 }} numberOfLines={2}>
          {title}
        </AppText>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: multiple ? 6 : 11,
            borderWidth: selected ? 0 : 1.5,
            borderColor: colors.borderStrong,
            backgroundColor: selected ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {selected ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
        </View>
      </View>
      {swatches?.length ? (
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {swatches.map((hex) => (
            <View key={hex} style={{ flex: 1, height: 18, borderRadius: 4, backgroundColor: hex, borderWidth: 1, borderColor: colors.border }} />
          ))}
        </View>
      ) : null}
      {description ? (
        <AppText variant="footnote" tone="secondary">
          {description}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function OptionGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{children}</View>;
}
