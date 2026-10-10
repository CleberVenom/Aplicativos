import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { OptionCard } from '@/components/option-card';
import { GOALS, type GoalId } from '@/domain/catalog';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

const MAX = 3;

export function GoalsStep() {
  const goals = useDraftStore((s) => s.answers.goals);
  const update = useDraftStore((s) => s.updateAnswers);

  const toggle = (id: GoalId) =>
    update({ goals: goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id].slice(0, MAX) });

  return (
    <View style={{ gap: spacing.md }}>
      {GOALS.map((goal) => {
        const selected = goals.includes(goal.id);
        return (
          <OptionCard
            key={goal.id}
            multiple
            title={goal.label}
            description={goal.description}
            selected={selected}
            disabled={!selected && goals.length >= MAX}
            onPress={() => toggle(goal.id)}
            testID={`goal-${goal.id}`}
            style={{ flexBasis: 'auto' }}
          />
        );
      })}
      {goals.length >= MAX ? (
        <AppText variant="footnote" tone="secondary">
          Você escolheu 3 objetivos. Desmarque um para trocar.
        </AppText>
      ) : null}
    </View>
  );
}
