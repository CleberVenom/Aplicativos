import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { currentVersion, type Project } from '@/domain/project';
import type { JobState } from '@/stores/projects-store';
import { spacing, useColors } from '@/theme';

type StageState = 'done' | 'active' | 'pending';

function StageRow({ label, state, detail }: { label: string; state: StageState; detail?: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }} accessible accessibilityLabel={`${label}: ${state === 'done' ? 'concluído' : state === 'active' ? 'em andamento' : 'aguardando'}`}>
      <View style={{ width: 24, alignItems: 'center' }}>
        {state === 'done' ? (
          <Icon name="checkCircle" size={22} color={colors.success} />
        ) : state === 'active' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong }} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant={state === 'active' ? 'headline' : 'callout'} tone={state === 'pending' ? 'tertiary' : 'default'}>
          {label}
        </AppText>
        {detail ? (
          <AppText variant="footnote" tone="secondary">
            {detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/** Clear multi-stage progress for the minutes the AI takes, so the screen never looks frozen. */
export function GenerationProgress({ project, job, imagesEnabled }: { project: Project; job: JobState; imagesEnabled: boolean }) {
  const finishedProposals = project.proposals.length + project.proposalErrors.length;
  const images = project.proposals.filter((p) => currentVersion(p).image).length;
  const analysisState: StageState = project.analysis ? 'done' : 'active';
  const proposalsState: StageState = !project.analysis ? 'pending' : finishedProposals >= 3 ? 'done' : 'active';
  const imagesState: StageState = images >= project.proposals.length && project.proposals.length > 0 ? 'done' : project.proposals.length ? 'active' : 'pending';

  return (
    <Card testID="generation-progress">
      <AppText variant="title3">Criando seu projeto</AppText>
      <StageRow label="Analisando a foto e as respostas" state={analysisState} detail={analysisState === 'active' ? job.message : undefined} />
      <StageRow label={`Elaborando as propostas (${project.proposals.length}/3)`} state={proposalsState} />
      {imagesEnabled ? <StageRow label={`Gerando as imagens (${images}/${Math.max(project.proposals.length, 3)})`} state={imagesState} /> : null}
      <AppText variant="footnote" tone="secondary">
        Isso costuma levar de 1 a 3 minutos. Você pode navegar pelo app; mantenha-o aberto até concluir.
      </AppText>
    </Card>
  );
}
