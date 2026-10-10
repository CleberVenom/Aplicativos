import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { OptionCard, OptionGrid } from '@/components/option-card';
import { TextField } from '@/components/text-field';
import { styleLabels } from '@/domain/answers';
import { STYLES, type StyleId } from '@/domain/catalog';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

const MAX = 2;

export function StyleStep() {
  const answers = useDraftStore((s) => s.answers);
  const update = useDraftStore((s) => s.updateAnswers);
  const selected = answers.styles;

  const toggle = (id: StyleId) =>
    update({ styles: selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id].slice(0, MAX) });

  return (
    <View style={{ gap: spacing.lg }}>
      {selected.length === 2 ? (
        <AppText variant="callout" tone="primary">
          Combinação: {styleLabels(answers).join(' + ')}
        </AppText>
      ) : null}
      <OptionGrid>
        {STYLES.map((style) => {
          const isSelected = selected.includes(style.id);
          return (
            <OptionCard
              key={style.id}
              multiple
              title={style.label}
              description={style.description}
              swatches={style.id === 'outro' ? undefined : style.palette}
              icon={style.id === 'outro' ? 'pencil' : undefined}
              selected={isSelected}
              disabled={!isSelected && selected.length >= MAX}
              onPress={() => toggle(style.id)}
              testID={`style-${style.id}`}
            />
          );
        })}
      </OptionGrid>
      {selected.includes('outro') ? (
        <TextField
          label="Descreva o estilo"
          placeholder="Ex.: boho com toques mediterrâneos"
          value={answers.styleOther ?? ''}
          maxLength={160}
          onChangeText={(styleOther) => update({ styleOther })}
          testID="style-other"
        />
      ) : null}
    </View>
  );
}
