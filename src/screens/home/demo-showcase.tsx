import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BeforeAfter } from '@/components/before-after';
import { spacing } from '@/theme';

/**
 * Original illustrations made for this app (no third-party images). They show the
 * kind of transformation the app proposes; they are not a generated result.
 */
const BEFORE = require('@/assets/demo/before.png');
const AFTER = require('@/assets/demo/after.png');

export function DemoShowcase() {
  return (
    <View style={{ gap: spacing.sm }}>
      <BeforeAfter
        before={BEFORE}
        after={AFTER}
        aspectRatio={4 / 3}
        accessibilityLabel="Ilustração de antes e depois de uma sala de estar"
      />
      <AppText variant="footnote" tone="secondary">
        Arraste o controle para comparar. Ilustração criada para demonstrar o conceito — não é um resultado gerado por IA.
      </AppText>
    </View>
  );
}
