import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip, ChipGroup } from '@/components/chip';
import { MeasureField } from '@/components/measure-field';
import { Notice } from '@/components/notice';
import { OptionCard } from '@/components/option-card';
import { LIMITATIONS, RENOVATION_SCOPES, TENURES, type LimitationId } from '@/domain/catalog';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

export function PropertyStep() {
  const answers = useDraftStore((s) => s.answers);
  const update = useDraftStore((s) => s.updateAnswers);
  const toggleLimitation = (id: LimitationId) =>
    update({ limitations: answers.limitations.includes(id) ? answers.limitations.filter((l) => l !== id) : [...answers.limitations, id] });

  return (
    <View style={{ gap: spacing.xxl }}>
      <View style={{ gap: spacing.md }}>
        <AppText variant="headline">O imóvel é</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {TENURES.map((t) => (
            <OptionCard
              key={t.id}
              title={t.label}
              selected={answers.tenure === t.id}
              onPress={() => update({ tenure: t.id })}
              testID={`tenure-${t.id}`}
            />
          ))}
        </View>
        {answers.tenure === 'alugado' ? (
          <Notice tone="info">Vamos priorizar soluções sem obras e fáceis de remover ao devolver o imóvel.</Notice>
        ) : null}
      </View>

      {answers.tenure !== 'alugado' ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="headline">Até onde você topa ir?</AppText>
          {RENOVATION_SCOPES.map((r) => (
            <OptionCard
              key={r.id}
              title={r.label}
              description={r.description}
              selected={answers.renovationScope === r.id}
              onPress={() => update({ renovationScope: r.id })}
              style={{ flexBasis: 'auto' }}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <AppText variant="headline">Há alguma limitação?</AppText>
        <ChipGroup>
          {LIMITATIONS.map((l) => (
            <Chip key={l.id} label={l.label} selected={answers.limitations.includes(l.id)} onPress={() => toggleLimitation(l.id)} />
          ))}
        </ChipGroup>
      </View>

      <View style={{ gap: spacing.md }}>
        <AppText variant="headline">Medidas do ambiente</AppText>
        <AppText variant="footnote" tone="secondary">
          Opcional. Com as medidas, as estimativas e a maquete 3D ficam mais fiéis. Sem elas, a IA estima pela foto.
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <MeasureField label="Largura" value={answers.dimensions.widthM} onChange={(widthM) => update({ dimensions: { ...answers.dimensions, widthM } })} />
          <MeasureField label="Comprimento" value={answers.dimensions.lengthM} onChange={(lengthM) => update({ dimensions: { ...answers.dimensions, lengthM } })} />
          <MeasureField label="Pé-direito" value={answers.dimensions.heightM} onChange={(heightM) => update({ dimensions: { ...answers.dimensions, heightM } })} />
        </View>
      </View>
    </View>
  );
}
