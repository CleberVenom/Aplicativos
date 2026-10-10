import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { getProposal } from '@/domain/project';
import { useProject } from '@/hooks/use-project';
import { answerInvite3d } from '@/services/design-service';
import { layout, spacing, useColors } from '@/theme';

/** Asked right after the user picks a proposal. */
export function Invite3dScreen({ id }: { id: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { project } = useProject(id);
  const selected = project?.selectedKey ? getProposal(project, project.selectedKey) : null;

  function answer(yes: boolean) {
    if (project?.selectedKey) answerInvite3d(project.id, project.selectedKey);
    if (yes) router.replace({ pathname: '/project/[id]/viewer3d', params: { id } });
    else router.back();
  }

  return (
    <>
      <View
        testID="invite3d-screen"
        style={{ flex: 1, backgroundColor: colors.background, padding: layout.screenPadding, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cube" size={36} color={colors.primary} />
          </View>
          <AppText variant="title1" align="center">
            Gostou deste projeto?
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            Quer visualizar como “{selected?.content.name ?? 'a proposta'}” ficaria em 3D? Você poderá girar, aproximar e explorar o ambiente.
          </AppText>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button title="Sim, visualizar em 3D" icon="cube" size="lg" onPress={() => answer(true)} testID="invite-yes" />
          <Button title="Agora não" variant="ghost" onPress={() => answer(false)} testID="invite-no" />
        </View>
      </View>
    </>
  );
}
