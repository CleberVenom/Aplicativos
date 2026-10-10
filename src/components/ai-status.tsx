import { Pressable, View } from 'react-native';

import { selectAiAvailable, useAppStore } from '@/stores/app-store';
import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';

/** Small pill telling whether real AI or the demo mode will be used. */
export function AiStatusPill({ onPress }: { onPress?: () => void }) {
  const colors = useColors();
  const status = useAppStore((s) => s.healthStatus);
  const aiAvailable = useAppStore(selectAiAvailable);
  const preferDemo = useAppStore((s) => s.settings.preferDemo);

  const label =
    status === 'checking' || status === 'idle'
      ? 'Verificando servidor de IA…'
      : aiAvailable
        ? 'IA conectada'
        : preferDemo
          ? 'Modo demonstração (escolhido por você)'
          : 'Modo demonstração';
  const dot = aiAvailable ? colors.success : status === 'checking' || status === 'idle' ? colors.textTertiary : colors.warning;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Abrir configurações`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 32,
        borderRadius: radius.full,
        backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceMuted,
      })}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </Pressable>
  );
}
