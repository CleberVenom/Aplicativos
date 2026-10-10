import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { StoredImage } from '@/components/stored-image';
import { describeAnswers } from '@/domain/answers';
import { getActiveSteps, STEP_META, type StepId } from '@/domain/questionnaire';
import { createProjectFromDraft } from '@/services/design-service';
import { selectAiAvailable, useAppStore } from '@/stores/app-store';
import { useDraftStore } from '@/stores/draft-store';
import { spacing, useColors } from '@/theme';

/** Which questionnaire step each summary row comes from (for "Editar"). */
const ROW_STEP: Record<string, StepId> = {
  Ambiente: 'room',
  Objetivos: 'goals',
  Estilo: 'style',
  'Orçamento': 'budget',
  Manter: 'furniture',
  Reposicionar: 'furniture',
  'Pode trocar': 'furniture',
  'Observações sobre o que manter': 'furniture',
  'Cores preferidas': 'preferences',
  'Cores a evitar': 'preferences',
  'Materiais preferidos': 'preferences',
  Necessidades: 'preferences',
  'Outras observações': 'preferences',
  'Imóvel': 'property',
  'Intervenções possíveis': 'property',
  'Limitações': 'property',
  'Medidas informadas': 'property',
};

function edit(step: StepId) {
  router.push({ pathname: '/questionnaire/[step]', params: { step, from: 'review' } });
}

/** Explains, before generating, whether real AI or the demo mode will be used. */
function ModeNotice() {
  const aiAvailable = useAppStore(selectAiAvailable);
  const healthStatus = useAppStore((s) => s.healthStatus);
  const preferDemo = useAppStore((s) => s.settings.preferDemo);
  if (healthStatus === 'checking' || healthStatus === 'idle') return null;
  if (aiAvailable) {
    return (
      <Notice tone="info" icon="sparkles" title="Propostas criadas por IA">
        A foto e as respostas serão analisadas por IA para criar três propostas com imagens. Leva de 1 a 3 minutos.
      </Notice>
    );
  }
  return (
    <Notice tone="demo" title="Modo demonstração" testID="review-demo-notice">
      {preferDemo
        ? 'Você escolheu usar o modo demonstração nas configurações. As propostas serão exemplos montados a partir das suas respostas.'
        : 'O servidor de IA não está disponível ou não foi configurado. Você verá propostas de exemplo montadas a partir das suas respostas — a foto não será analisada e nenhuma imagem será gerada.'}
    </Notice>
  );
}

export function ReviewStep() {
  const colors = useColors();
  const answers = useDraftStore((s) => s.answers);
  const photo = useDraftStore((s) => s.photo);
  const extraCount = useDraftStore((s) => s.extraPhotos.length);
  const rows = describeAnswers(answers);
  const steps = getActiveSteps(answers).filter((s) => s !== 'review');
  const answeredSteps = new Set(rows.map((r) => ROW_STEP[r.label]));

  return (
    <View style={{ gap: spacing.lg }}>
      <ModeNotice />
      {photo ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Trocar a foto" onPress={() => router.push('/photo')} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <StoredImage path={photo.path} aspectRatio={1} style={{ width: 72 }} accessibilityLabel="Foto do ambiente" />
          <View style={{ flex: 1 }}>
            <AppText variant="headline">Foto do ambiente</AppText>
            <AppText variant="footnote" tone="secondary">
              {extraCount ? `+ ${extraCount} foto(s) de outros ângulos · ` : ''}Toque para trocar
            </AppText>
          </View>
        </Pressable>
      ) : null}

      <Card padded={false} testID="review-summary">
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <AppText variant="caption" tone="secondary">
                {row.label}
              </AppText>
              <AppText variant="callout" selectable>
                {row.value}
              </AppText>
            </View>
            {ROW_STEP[row.label] ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${row.label}`} hitSlop={8} onPress={() => edit(ROW_STEP[row.label])}>
                <AppText variant="subhead" tone="primary">
                  Editar
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>

      {steps.some((s) => STEP_META[s].optional && !answeredSteps.has(s)) ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="footnote" tone="secondary">
            Etapas opcionais sem resposta (você pode completá-las se quiser):
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {steps
              .filter((s) => STEP_META[s].optional && !answeredSteps.has(s))
              .map((s) => (
                <Button key={s} title={STEP_META[s].title} size="sm" variant="secondary" onPress={() => edit(s)} />
              ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Footer of the review step: explains what will happen and starts the generation. */
export function ReviewFooter() {
  const aiAvailable = useAppStore(selectAiAvailable);
  const healthStatus = useAppStore((s) => s.healthStatus);
  const preferDemo = useAppStore((s) => s.settings.preferDemo);
  const consentAt = useAppStore((s) => s.settings.consentAt);
  const [busy, setBusy] = useState<'ai' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useAppStore.getState().loadSettings();
    useAppStore.getState().checkHealth();
  }, []);

  async function generate(mode: 'ai' | 'demo') {
    setError(null);
    if (mode === 'ai' && !consentAt) {
      router.push('/consent');
      return;
    }
    setBusy(mode);
    try {
      const id = await createProjectFromDraft(mode);
      router.dismissAll();
      router.push({ pathname: '/project/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar.');
    } finally {
      setBusy(null);
    }
  }

  const checking = healthStatus === 'checking' || healthStatus === 'idle';

  return (
    <View style={{ gap: spacing.sm }}>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {checking ? (
        <AppText variant="footnote" tone="secondary" align="center">
          Verificando o servidor de IA…
        </AppText>
      ) : aiAvailable ? (
        <>
          <Button title="Gerar 3 propostas com IA" icon="sparkles" size="lg" loading={busy === 'ai'} disabled={!!busy} onPress={() => generate('ai')} testID="generate-ai" />
          <Button title="Ver exemplos sem IA (demonstração)" variant="ghost" size="sm" disabled={!!busy} onPress={() => generate('demo')} testID="generate-demo-secondary" />
        </>
      ) : (
        <>
          <Button title="Gerar exemplos (demonstração)" icon="sparkles" size="lg" loading={busy === 'demo'} disabled={!!busy} onPress={() => generate('demo')} testID="generate-demo" />
          {!preferDemo ? (
            <Button title="Tentar conectar de novo" variant="ghost" size="sm" onPress={() => useAppStore.getState().checkHealth()} />
          ) : null}
        </>
      )}
    </View>
  );
}
