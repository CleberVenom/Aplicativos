import { useLocalSearchParams } from 'expo-router';

import { CompareScreen } from '@/screens/compare';

export default function CompareRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CompareScreen id={id} />;
}
