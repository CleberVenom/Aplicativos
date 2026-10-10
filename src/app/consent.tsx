import { Stack } from 'expo-router';

import { ConsentScreen } from '@/screens/consent';

export default function ConsentRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacidade' }} />
      <ConsentScreen />
    </>
  );
}
