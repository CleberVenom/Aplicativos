import { Stack } from 'expo-router';

import { PhotoScreen } from '@/screens/photo';

export default function PhotoRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Foto do ambiente' }} />
      <PhotoScreen />
    </>
  );
}
