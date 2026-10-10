import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { confirmAsync } from '@/components/confirm';
import { EmptyState } from '@/components/empty-state';
import { Notice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { StoredImage } from '@/components/stored-image';
import { DEMO_NOTICE } from '@/domain/demo';
import { PROPOSAL_KEYS } from '@/domain/design';
import { getProposal } from '@/domain/project';
import { useProject } from '@/hooks/use-project';
import { retryProposal, runGeneration } from '@/services/design-service';
import { useAppStore } from '@/stores/app-store';
import { useProjectsStore } from '@/stores/projects-store';
import { spacing, useColors } from '@/theme';

import { GenerationProgress } from './generation-progress';
import { PendingProposalCard, ProposalCard } from './proposal-card';

export function ProjectScreen({ id }: { id: string }) {
  const colors = useColors();
  const { project, loaded } = useProject(id);
  const job = useProjectsStore((s) => s.jobs[id]);
  const imagesEnabled = useAppStore((s) => !!s.health?.image.available);

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!project) {
    return (
      <Screen>
        <EmptyState icon="folder" title="Projeto não encontrado" message="Ele pode ter sido excluído." action={{ label: 'Voltar ao início', onPress: () => router.replace('/') }} />
      </Screen>
    );
  }

  const interrupted = project.status === 'generating' && !job && project.mode === 'ai';
  const selected = project.selectedKey ? getProposal(project, project.selectedKey) : null;

  async function remove() {
    if (!project) return;
    const ok = await confirmAsync('Excluir projeto?', 'A foto, as propostas e o histórico deste projeto serão apagados deste aparelho.', 'Excluir', true);
    if (!ok) return;
    await useProjectsStore.getState().deleteProject(project.id);
    router.replace('/');
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerRight: () => (
            <IconButton icon="pencil" label="Renomear projeto" variant="ghost" size={40} onPress={() => router.push({ pathname: '/rename', params: { id: project.id } })} />
          ),
        }}
      />
      <Screen testID="project-screen">
        {project.mode === 'demo' ? (
          <Notice tone="demo" title="Exemplos do modo demonstração" testID="demo-notice">
            {DEMO_NOTICE}
          </Notice>
        ) : null}

        {job ? <GenerationProgress project={project} job={job} imagesEnabled={imagesEnabled} /> : null}
        {interrupted ? (
          <Notice tone="warning" title="A geração foi interrompida" action={{ label: 'Retomar agora', onPress: () => runGeneration(project.id) }}>
            O app foi fechado ou perdeu a conexão antes de concluir. Retome para continuar de onde parou.
          </Notice>
        ) : null}
        {project.status === 'error' && !job ? (
          <Notice tone="danger" title="Não foi possível concluir" action={{ label: 'Tentar novamente', onPress: () => runGeneration(project.id) }}>
            {project.error ?? 'Ocorreu um erro ao gerar as propostas.'}
          </Notice>
        ) : null}

        {selected ? (
          <Card tone="primary" testID="selected-banner">
            <AppText variant="overline" tone="primary">
              Sua proposta escolhida
            </AppText>
            <AppText variant="title3">{selected.content.name}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button title="Ver em 3D" icon="cube" size="sm" onPress={() => router.push({ pathname: '/project/[id]/viewer3d', params: { id: project.id } })} testID="open-3d" />
              <Button
                title="Abrir proposta"
                size="sm"
                variant="secondary"
                onPress={() => router.push({ pathname: '/project/[id]/proposal/[key]', params: { id: project.id, key: project.selectedKey! } })}
              />
            </View>
          </Card>
        ) : null}

        <Section
          title="Três propostas para o seu ambiente"
          action={project.proposals.length >= 2 ? { label: 'Comparar', onPress: () => router.push({ pathname: '/project/[id]/compare', params: { id: project.id } }) } : undefined}>
          <View style={{ gap: spacing.xl }}>
            {PROPOSAL_KEYS.map((key, index) => {
              const record = project.proposals.find((p) => p.key === key);
              if (record) return <ProposalCard key={key} project={project} record={record} />;
              const error = project.proposalErrors.find((e) => e.key === key);
              if (error) return <PendingProposalCard key={key} keyName={key} error={error.message} onRetry={() => retryProposal(project.id, key)} />;
              if (job || project.status === 'generating') return <PendingProposalCard key={key} keyName={key} title={project.directions[index]?.title} />;
              return null;
            })}
          </View>
        </Section>

        <Section title="A análise do ambiente">
          {project.analysis ? (
            <Card>
              <AppText variant="callout">{project.analysis.summary}</AppText>
              {project.analysis.photo.issues.length ? (
                <Notice tone="warning" title="Sobre a foto">
                  {project.analysis.photo.issues.join(' ')}
                </Notice>
              ) : null}
              <Button
                title="Ver análise completa"
                variant="secondary"
                iconRight="chevronRight"
                onPress={() => router.push({ pathname: '/project/[id]/analysis', params: { id: project.id } })}
                testID="open-analysis"
              />
            </Card>
          ) : project.mode === 'demo' ? (
            <Card tone="muted">
              <AppText variant="callout" tone="secondary">
                No modo demonstração a foto não é analisada. Configure o servidor de IA para receber a análise profissional do seu ambiente.
              </AppText>
            </Card>
          ) : (
            <Card tone="muted">
              <AppText variant="callout" tone="secondary">
                A análise aparece aqui assim que estiver pronta.
              </AppText>
            </Card>
          )}
        </Section>

        <Section title="Foto original">
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Ampliar foto original"
            onPress={() => router.push({ pathname: '/image-viewer', params: { projectId: project.id, key: 'photo' } })}>
            <StoredImage path={project.photo.path} aspectRatio={project.photo.width / project.photo.height} accessibilityLabel="Foto original do ambiente" />
          </Pressable>
        </Section>

        <Button title="Excluir projeto" variant="danger" icon="trash" onPress={remove} testID="delete-project" />
      </Screen>
    </>
  );
}
