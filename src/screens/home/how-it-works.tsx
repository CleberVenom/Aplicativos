import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { radius, spacing, useColors } from '@/theme';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'camera', title: 'Foto', text: 'Fotografe o ambiente ou escolha uma imagem.' },
  { icon: 'list', title: 'Preferências', text: 'Responda perguntas rápidas sobre estilo e orçamento.' },
  { icon: 'sparkles', title: '3 propostas', text: 'Análise profissional e três caminhos diferentes.' },
  { icon: 'cube', title: 'Ajustes e 3D', text: 'Refine a favorita e explore uma maquete 3D.' },
];

export function HowItWorks() {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
      {STEPS.map((step, index) => (
        <View
          key={step.title}
          accessible
          accessibilityLabel={`Passo ${index + 1}: ${step.title}. ${step.text}`}
          style={{ width: 168, padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={step.icon} size={18} color={colors.primary} />
            </View>
            <AppText variant="title3" tone="tertiary">
              {index + 1}
            </AppText>
          </View>
          <AppText variant="headline">{step.title}</AppText>
          <AppText variant="footnote" tone="secondary">
            {step.text}
          </AppText>
        </View>
      ))}
    </ScrollView>
  );
}
