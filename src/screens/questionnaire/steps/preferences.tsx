import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip, ChipGroup } from '@/components/chip';
import { TextField } from '@/components/text-field';
import { COLOR_OPTIONS, MATERIAL_OPTIONS, needsForRoom } from '@/domain/catalog';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

function toggle(list: string[], id: string, max: number) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id].slice(0, max);
}

export function PreferencesStep() {
  const answers = useDraftStore((s) => s.answers);
  const update = useDraftStore((s) => s.updateAnswers);

  return (
    <View style={{ gap: spacing.xxl }}>
      <View style={{ gap: spacing.md }}>
        <AppText variant="headline">Cores que você gosta</AppText>
        <ChipGroup>
          {COLOR_OPTIONS.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              color={c.hex}
              selected={answers.favoriteColors.includes(c.id)}
              onPress={() =>
                update({
                  favoriteColors: toggle(answers.favoriteColors, c.id, 6),
                  avoidColors: answers.avoidColors.filter((x) => x !== c.id),
                })
              }
              testID={`fav-${c.id}`}
            />
          ))}
        </ChipGroup>
      </View>

      <View style={{ gap: spacing.md }}>
        <AppText variant="headline">Cores que prefere evitar</AppText>
        <ChipGroup>
          {COLOR_OPTIONS.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              color={c.hex}
              selected={answers.avoidColors.includes(c.id)}
              onPress={() =>
                update({
                  avoidColors: toggle(answers.avoidColors, c.id, 6),
                  favoriteColors: answers.favoriteColors.filter((x) => x !== c.id),
                })
              }
            />
          ))}
        </ChipGroup>
      </View>

      <View style={{ gap: spacing.md }}>
        <AppText variant="headline">Materiais preferidos</AppText>
        <ChipGroup>
          {MATERIAL_OPTIONS.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              selected={answers.materials.includes(m.id)}
              onPress={() => update({ materials: toggle(answers.materials, m.id, 6) })}
            />
          ))}
        </ChipGroup>
      </View>

      <View style={{ gap: spacing.md }}>
        <AppText variant="headline">Necessidades do dia a dia</AppText>
        <ChipGroup>
          {needsForRoom(answers.roomType).map((n) => (
            <Chip
              key={n.id}
              label={n.label}
              selected={answers.needs.includes(n.id)}
              onPress={() => update({ needs: toggle(answers.needs, n.id, 8) })}
              testID={`need-${n.id}`}
            />
          ))}
        </ChipGroup>
      </View>

      <TextField
        label="Algo mais que devemos saber?"
        placeholder="Ex.: a sala recebe sol à tarde; gosto de ler no sofá"
        value={answers.notes ?? ''}
        maxLength={600}
        multiline
        onChangeText={(notes) => update({ notes })}
      />
    </View>
  );
}
