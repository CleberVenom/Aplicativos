import { View } from 'react-native';

import { spacing, useColors } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';
import { Icon, type IconName } from './icon';

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
}) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <AppText variant="title3" align="center">
        {title}
      </AppText>
      <AppText variant="callout" tone="secondary" align="center">
        {message}
      </AppText>
      {action ? <Button title={action.label} icon={action.icon} onPress={action.onPress} style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}
