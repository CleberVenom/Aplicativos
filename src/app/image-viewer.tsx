import { useLocalSearchParams } from 'expo-router';

import { ImageViewerScreen } from '@/screens/image-viewer';

export default function ImageViewerRoute() {
  const { projectId, key } = useLocalSearchParams<{ projectId: string; key: string }>();
  return <ImageViewerScreen projectId={projectId} imageKey={key} />;
}
