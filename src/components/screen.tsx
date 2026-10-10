import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing, useColors } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Sticky bottom area for the main action(s) of the screen. */
  footer?: ReactNode;
  /** Screens without a stack header must handle the top inset themselves. */
  topInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Scrollable screen body with consistent padding, max width and safe areas. */
export function Screen({ children, footer, topInset, contentStyle, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID={testID}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            paddingHorizontal: layout.screenPadding,
            paddingTop: topInset ? insets.top + spacing.lg : spacing.lg,
            paddingBottom: (footer ? spacing.lg : insets.bottom + spacing.xxxl),
            gap: spacing.xxl,
            width: '100%',
            maxWidth: layout.maxContentWidth,
            alignSelf: 'center',
          },
          contentStyle,
        ]}>
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}>
          <View style={{ width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.sm }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}
