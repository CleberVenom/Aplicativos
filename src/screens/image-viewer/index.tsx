import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/button';
import { ZoomableImage } from '@/components/zoomable-image';
import { PROPOSAL_KEYS, type ProposalKey } from '@/domain/design';
import { getProposal } from '@/domain/project';
import { useProject } from '@/hooks/use-project';
import { localStore } from '@/services/storage/local-store';
import { spacing } from '@/theme';

/** Full-screen, zoomable view of the original photo or a proposal render. */
export function ImageViewerScreen({ projectId, imageKey }: { projectId: string; imageKey: string }) {
  const insets = useSafeAreaInsets();
  const { project } = useProject(projectId);

  let path: string | null = null;
  let title = '';
  if (project) {
    if (imageKey === 'photo') {
      path = project.photo.path;
      title = 'Foto original';
    } else if ((PROPOSAL_KEYS as readonly string[]).includes(imageKey)) {
      const version = getProposal(project, imageKey as ProposalKey);
      path = version?.image?.path ?? null;
      title = version ? `Proposta ${imageKey} · ${version.content.name}` : '';
    }
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: '#000000' }} testID="image-viewer">
        {path ? <ZoomableImage uri={localStore.resolveUri(path)} accessibilityLabel={title} /> : null}
        <View
          style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          pointerEvents="box-none">
          <IconButton icon="close" label="Fechar" variant="overlay" onPress={() => router.back()} testID="close-viewer" />
          <AppText variant="subhead" style={{ color: '#FFFFFF', flex: 1 }} numberOfLines={1}>
            {title}
          </AppText>
        </View>
      </View>
    </>
  );
}
