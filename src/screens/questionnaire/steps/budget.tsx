import { View } from 'react-native';

import { OptionCard } from '@/components/option-card';
import { BUDGETS } from '@/domain/catalog';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

export function BudgetStep() {
  const budget = useDraftStore((s) => s.answers.budget);
  const update = useDraftStore((s) => s.updateAnswers);
  return (
    <View style={{ gap: spacing.md }}>
      {BUDGETS.map((option) => (
        <OptionCard
          key={option.id}
          title={option.label}
          description={option.description}
          icon="wallet"
          selected={budget === option.id}
          onPress={() => update({ budget: option.id })}
          testID={`budget-${option.id}`}
          style={{ flexBasis: 'auto' }}
        />
      ))}
    </View>
  );
}
