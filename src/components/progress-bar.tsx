import { View } from 'react-native';

import { radius, useColors } from '@/theme';

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const colors = useColors();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: radius.full, backgroundColor: colors.primary }} />
    </View>
  );
}
