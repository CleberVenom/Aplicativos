import { Redirect, router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { getStepPosition, isStepComplete, nextStep, STEP_META, type StepId } from '@/domain/questionnaire';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

import { BudgetStep } from './steps/budget';
import { FurnitureStep } from './steps/furniture';
import { GoalsStep } from './steps/goals';
import { PreferencesStep } from './steps/preferences';
import { PropertyStep } from './steps/property';
import { ReviewFooter, ReviewStep } from './steps/review';
import { RoomStep } from './steps/room';
import { StyleStep } from './steps/style';

const STEPS: Record<StepId, () => React.ReactElement> = {
  room: RoomStep,
  goals: GoalsStep,
  style: StyleStep,
  budget: BudgetStep,
  furniture: FurnitureStep,
  preferences: PreferencesStep,
  property: PropertyStep,
  review: ReviewStep,
};

export function QuestionnaireScreen({ step, fromReview }: { step: StepId; fromReview: boolean }) {
  const hydrated = useDraftStore((s) => s.hydrated);
  const photo = useDraftStore((s) => s.photo);
  const answers = useDraftStore((s) => s.answers);

  useEffect(() => {
    useDraftStore.getState().hydrate();
  }, []);

  if (!hydrated) return null;
  if (!photo) return <Redirect href="/photo" />;

  const { index, total } = getStepPosition(step, answers);
  const meta = STEP_META[step];
  const complete = isStepComplete(step, answers);
  const StepBody = STEPS[step];

  function goNext() {
    if (fromReview) {
      router.back();
      return;
    }
    const next = nextStep(step, answers);
    if (next) router.push({ pathname: '/questionnaire/[step]', params: { step: next } });
  }

  const footer =
    step === 'review' ? (
      <ReviewFooter />
    ) : (
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {!fromReview ? (
          <Button title="Voltar" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} testID="step-back" />
        ) : null}
        <Button
          title={fromReview ? 'Voltar ao resumo' : meta.optional ? 'Continuar' : 'Próximo'}
          iconRight={fromReview ? undefined : 'arrowRight'}
          disabled={!complete}
          onPress={goNext}
          style={{ flex: 2 }}
          testID="step-next"
        />
      </View>
    );

  return (
    <>
      <Stack.Screen options={{ title: `Etapa ${index + 1} de ${total}` }} />
      <Screen footer={footer} testID={`step-${step}`}>
        <View style={{ gap: spacing.md }}>
          <ProgressBar value={(index + 1) / total} label={`Etapa ${index + 1} de ${total}`} />
          <View style={{ gap: spacing.xs }}>
            <AppText variant="title1" accessibilityRole="header">
              {meta.title}
            </AppText>
            <AppText variant="callout" tone="secondary">
              {meta.subtitle}
              {meta.optional ? ' (opcional)' : ''}
            </AppText>
          </View>
        </View>
        <StepBody />
      </Screen>
    </>
  );
}
