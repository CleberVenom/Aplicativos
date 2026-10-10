import { useLocalSearchParams } from 'expo-router';

import { RenameScreen } from '@/screens/rename';

export default function RenameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RenameScreen id={id} />;
}
