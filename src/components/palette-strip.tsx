import { View } from 'react-native';

import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';

type Swatch = { hex: string; name: string };

/** Color palette as connected blocks, optionally labeled. */
export function PaletteStrip({ colors: swatches, labeled = false, height = 36 }: { colors: Swatch[]; labeled?: boolean; height?: number }) {
  const colors = useColors();
  const description = swatches.map((s) => s.name).join(', ');
  return (
    <View style={{ gap: spacing.xs }} accessible accessibilityLabel={`Paleta: ${description}`}>
      <View style={{ flexDirection: 'row', height, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        {swatches.map((s, i) => (
          <View key={`${s.hex}-${i}`} style={{ flex: 1, backgroundColor: s.hex }} />
        ))}
      </View>
      {labeled ? (
        <View style={{ flexDirection: 'row' }}>
          {swatches.map((s, i) => (
            <AppText key={`${s.hex}-${i}`} variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={2}>
              {s.name}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}
