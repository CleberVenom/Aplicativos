import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';
import { Icon, type IconName } from './icon';

type Tone = 'info' | 'warning' | 'danger' | 'success' | 'demo';

const ICON: Record<Tone, IconName> = {
  info: 'info',
  warning: 'warning',
  danger: 'error',
  success: 'checkCircle',
  demo: 'sparkles',
};

type NoticeProps = {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Inline message for limitations, warnings and errors — always with plain-language copy. */
export function Notice({ tone = 'info', title, children, icon, action, style, testID }: NoticeProps) {
  const colors = useColors();
  const palette = {
    info: { bg: colors.infoSoft, fg: colors.info },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success },
    demo: { bg: colors.accentSoft, fg: colors.accent },
  }[tone];

  return (
    <View
      testID={testID}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[
        { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: palette.bg },
        style,
      ]}>
      <Icon name={icon ?? ICON[tone]} size={20} color={palette.fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        {title ? (
          <AppText variant="headline" style={{ color: palette.fg }}>
            {title}
          </AppText>
        ) : null}
        {typeof children === 'string' ? (
          <AppText variant="callout" selectable>
            {children}
          </AppText>
        ) : (
          children
        )}
        {action ? (
          <Button title={action.label} variant="ghost" size="sm" onPress={action.onPress} style={{ alignSelf: 'flex-start', marginLeft: -spacing.md }} />
        ) : null}
      </View>
    </View>
  );
}
