import { View } from 'react-native';

import { useColors } from '@/theme';

import { AppText } from './app-text';
import { APP_NAME } from '@/constants';

/** Brand symbol: an arched doorway inside a terracotta tile (no third-party marks). */
export function BrandMark({ size = 36 }: { size?: number }) {
  const colors = useColors();
  const archW = size * 0.42;
  const archH = size * 0.56;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <View
        style={{
          width: archW,
          height: archH,
          borderTopLeftRadius: archW / 2,
          borderTopRightRadius: archW / 2,
          backgroundColor: '#F6EBDD',
          marginBottom: size * 0.16,
        }}
      />
    </View>
  );
}

export function BrandLockup() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityRole="header" accessibilityLabel={APP_NAME}>
      <BrandMark />
      <AppText variant="title2">{APP_NAME}</AppText>
    </View>
  );
}
