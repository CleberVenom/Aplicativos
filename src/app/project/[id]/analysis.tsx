import { useLocalSearchParams } from 'expo-router';

import { AnalysisScreen } from '@/screens/analysis';

export default function AnalysisRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AnalysisScreen id={id} />;
}
