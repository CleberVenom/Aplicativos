import { useLocalSearchParams } from 'expo-router';

import { Invite3dScreen } from '@/screens/invite3d';

export default function Invite3dRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Invite3dScreen id={id} />;
}
