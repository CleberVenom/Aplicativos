import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { Segmented } from '@/components/segmented';
import { TextField } from '@/components/text-field';
import { FURNITURE_BY_ROOM, FURNITURE_DECISIONS, type FurnitureDecisionId } from '@/domain/catalog';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

export function FurnitureStep() {
  const answers = useDraftStore((s) => s.answers);
  const update = useDraftStore((s) => s.updateAnswers);
  const items = FURNITURE_BY_ROOM[answers.roomType ?? 'outro'];

  const setDecision = (item: string, decision: FurnitureDecisionId | undefined) => {
    const furniture = { ...answers.furniture };
    if (decision) furniture[item] = decision;
    else delete furniture[item];
    update({ furniture });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {answers.budget === 'economico' ? (
        <Notice tone="info" title="Orçamento econômico">
          <AppText variant="callout">Vamos priorizar manter e renovar o que você já tem.</AppText>
          <Button
            title="Marcar tudo como manter"
            variant="ghost"
            size="sm"
            style={{ alignSelf: 'flex-start', marginLeft: -spacing.md }}
            onPress={() => update({ furniture: Object.fromEntries(items.map((i) => [i, 'manter' as const])) })}
          />
        </Notice>
      ) : null}
      <Card padded={false}>
        {items.map((item, index) => (
          <View
            key={item}
            style={{
              padding: spacing.md,
              gap: spacing.sm,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: 'rgba(127,127,127,0.15)',
            }}>
            <AppText variant="headline">{item}</AppText>
            <Segmented
              options={FURNITURE_DECISIONS}
              value={answers.furniture[item]}
              onChange={(value) => setDecision(item, value)}
              accessibilityLabel={item}
            />
          </View>
        ))}
      </Card>
      <TextField
        label="Algo específico que deseja manter?"
        placeholder="Ex.: a poltrona da minha avó, o quadro azul"
        value={answers.keepNotes ?? ''}
        maxLength={400}
        multiline
        onChangeText={(keepNotes) => update({ keepNotes })}
      />
    </View>
  );
}
