import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './app-text';

/** Titled block of content with an optional trailing link-style action. */
export function Section({
  title,
  subtitle,
  action,
  children,
  style,
  testID,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View style={[{ gap: spacing.md }, style]} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="overline" tone="secondary" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="footnote" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10}>
            <AppText variant="subhead" tone="primary">
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
