import { Redirect, useLocalSearchParams } from 'expo-router';

import { isStepId } from '@/domain/questionnaire';
import { QuestionnaireScreen } from '@/screens/questionnaire';

export default function QuestionnaireStepRoute() {
  const { step, from } = useLocalSearchParams<{ step: string; from?: string }>();
  if (!isStepId(step)) return <Redirect href="/photo" />;
  return <QuestionnaireScreen step={step} fromReview={from === 'review'} />;
}
