import { View } from 'react-native';

import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';

type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'info';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const colors = useColors();
  const c = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
  }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.full, backgroundColor: c.bg }}>
      <AppText variant="caption" style={{ color: c.fg }}>
        {label}
      </AppText>
    </View>
  );
}
