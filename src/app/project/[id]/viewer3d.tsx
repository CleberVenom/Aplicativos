import { useLocalSearchParams } from 'expo-router';

import { Viewer3dScreen } from '@/screens/viewer3d';

export default function Viewer3dRoute() {
  const { id, measure } = useLocalSearchParams<{ id: string; measure?: string }>();
  return <Viewer3dScreen id={id} focusMeasure={measure === '1'} />;
}
