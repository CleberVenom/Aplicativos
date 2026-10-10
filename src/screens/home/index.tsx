import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';

import { AiStatusPill } from '@/components/ai-status';
import { AppText } from '@/components/app-text';
import { BrandLockup } from '@/components/brand-mark';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { ProjectCard } from '@/components/project-card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { roomTypeLabel } from '@/domain/answers';
import { usePhotoPicker, type PickSource } from '@/hooks/use-photo-picker';
import { useDraftStore } from '@/stores/draft-store';
import { useProjectsStore } from '@/stores/projects-store';
import { spacing } from '@/theme';

import { DemoShowcase } from './demo-showcase';
import { HowItWorks } from './how-it-works';

export function HomeScreen() {
  const picker = usePhotoPicker();
  const summaries = useProjectsStore((s) => s.summaries);
  const refreshList = useProjectsStore((s) => s.refreshList);
  const draftPhoto = useDraftStore((s) => s.photo);
  const draftAnswers = useDraftStore((s) => s.answers);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  async function start(source: PickSource) {
    const outcome = await picker.pick(source);
    if (outcome === 'ok') router.push('/photo');
  }

  const recent = summaries.slice(0, 6);

  return (
    <Screen topInset testID="home-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BrandLockup />
        <IconButton icon="settings" label="Configurações e privacidade" onPress={() => router.push('/settings')} testID="open-settings" />
      </View>

      <View style={{ gap: spacing.md }}>
        <AppText variant="display" accessibilityRole="header">
          Seu ambiente, repensado com IA
        </AppText>
        <AppText variant="body" tone="secondary">
          Fotografe um cômodo, conte o que você deseja e receba três propostas de design com justificativas, plano de mudanças e
          visualização — inclusive em 3D.
        </AppText>
        <AiStatusPill onPress={() => router.push('/settings')} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Button
          title="Fotografar ambiente"
          icon="camera"
          size="lg"
          loading={picker.busy === 'camera'}
          disabled={!!picker.busy}
          onPress={() => start('camera')}
          testID="start-camera"
        />
        <Button
          title="Escolher da galeria"
          icon="gallery"
          size="lg"
          variant="secondary"
          loading={picker.busy === 'gallery'}
          disabled={!!picker.busy}
          onPress={() => start('gallery')}
          testID="start-gallery"
        />
        {picker.error ? (
          <Notice tone="danger" title="Não foi possível usar esta foto">
            {picker.error}
          </Notice>
        ) : null}
      </View>

      {draftPhoto ? (
        <Card tone="primary">
          <AppText variant="headline">Projeto em andamento</AppText>
          <AppText variant="callout" tone="secondary">
            {draftAnswers.roomType ? `${roomTypeLabel(draftAnswers)} — ` : ''}suas respostas foram salvas neste aparelho.
          </AppText>
          <Button title="Continuar de onde parei" variant="tonal" iconRight="arrowRight" onPress={() => router.push('/photo')} testID="resume-draft" />
        </Card>
      ) : null}

      <Section title="Como funciona">
        <HowItWorks />
      </Section>

      <Section title="Exemplo de transformação" subtitle="Ilustração do tipo de resultado. Suas propostas usam a sua própria foto.">
        <DemoShowcase />
      </Section>

      <Section
        title="Seus projetos"
        action={summaries.length ? { label: 'Ver todos', onPress: () => router.push('/projects') } : undefined}>
        {recent.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {recent.map((summary) => (
              <ProjectCard
                key={summary.id}
                compact
                summary={summary}
                onPress={() => router.push({ pathname: '/project/[id]', params: { id: summary.id } })}
              />
            ))}
          </ScrollView>
        ) : (
          <Card tone="muted">
            <AppText variant="callout" tone="secondary">
              Seus projetos aparecem aqui e ficam salvos somente neste aparelho.
            </AppText>
          </Card>
        )}
      </Section>
    </Screen>
  );
}
