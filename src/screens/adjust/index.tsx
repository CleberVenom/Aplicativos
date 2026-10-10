import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip, ChipGroup } from '@/components/chip';
import { Notice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { TextField } from '@/components/text-field';
import { COLOR_OPTIONS, FURNITURE_BY_ROOM } from '@/domain/catalog';
import type { DemoAdjustment } from '@/domain/demo-adjustments';
import type { ProposalKey } from '@/domain/design';
import { currentVersion } from '@/domain/project';
import { useProject } from '@/hooks/use-project';
import { ApiError } from '@/services/api-client';
import { applyDemoAdjustmentToProject, requestAdjustment } from '@/services/design-service';
import { selectAiAvailable, useAppStore } from '@/stores/app-store';

const SUGGESTIONS = [
  'Troque as cores principais por tons mais claros',
  'Mantenha o sofá atual',
  'Deixe a iluminação mais quente e aconchegante',
  'Torne o projeto mais econômico',
  'Inclua mais plantas',
  'Use menos móveis para ganhar espaço',
];

export function AdjustScreen({ id, proposalKey }: { id: string; proposalKey: ProposalKey }) {
  const { project } = useProject(id);
  const aiAvailable = useAppStore(selectAiAvailable);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accent, setAccent] = useState<string | null>(null);
  const [keepItem, setKeepItem] = useState<string | null>(null);

  if (!project) return null;
  const record = project.proposals.find((p) => p.key === proposalKey);
  if (!record) return null;
  const name = currentVersion(record).content.name;
  const useAi = project.mode === 'ai' && aiAvailable;

  async function submitAi() {
    setBusy(true);
    setError(null);
    try {
      await requestAdjustment(id, proposalKey, text.trim());
      router.back();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Não foi possível aplicar o ajuste.');
    } finally {
      setBusy(false);
    }
  }

  async function applyDemo(adjustment: DemoAdjustment) {
    setBusy(true);
    await applyDemoAdjustmentToProject(id, proposalKey, adjustment);
    setBusy(false);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Ajustar proposta' }} />
      {useAi ? (
        <Screen
          testID="adjust-screen"
          footer={
            <>
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button title="Aplicar ajuste" icon="wand" size="lg" loading={busy} disabled={text.trim().length < 3} onPress={submitAi} testID="adjust-submit" />
            </>
          }>
          <AppText variant="callout" tone="secondary">
            Descreva o que você quer mudar em “{name}”. A IA atualiza a proposta e gera uma nova imagem, sem refazer o projeto. A versão atual fica no histórico.
          </AppText>
          <TextField
            label="O que você quer mudar?"
            placeholder="Ex.: troque o verde por azul-marinho e mantenha a estante"
            multiline
            maxLength={600}
            value={text}
            onChangeText={setText}
            testID="adjust-text"
          />
          <Section title="Sugestões">
            <ChipGroup>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => setText((t) => (t.trim() ? `${t.trim()}. ${s}` : s))} />
              ))}
            </ChipGroup>
          </Section>
        </Screen>
      ) : (
        <Screen testID="adjust-screen">
          <Notice tone="demo" title={project.mode === 'demo' ? 'Ajustes do modo demonstração' : 'IA indisponível no momento'}>
            {project.mode === 'demo'
              ? 'Pedidos em texto livre precisam da IA configurada. Aqui você pode aplicar ajustes automáticos, feitos no aparelho e marcados como tal no histórico.'
              : 'O servidor de IA não está disponível agora. Você pode aplicar um ajuste automático ou tentar mais tarde.'}
          </Notice>
          <Button title="Deixar mais econômica" variant="secondary" icon="money" disabled={busy} onPress={() => applyDemo({ type: 'cheaper' })} testID="demo-cheaper" />
          <Button title="Iluminação mais quente" variant="secondary" icon="lightbulb" disabled={busy} onPress={() => applyDemo({ type: 'warmer_light' })} />
          <Section title="Trocar a cor de destaque">
            <ChipGroup>
              {COLOR_OPTIONS.map((c) => (
                <Chip key={c.id} label={c.label} color={c.hex} selected={accent === c.id} onPress={() => setAccent(c.id)} />
              ))}
            </ChipGroup>
            <Button
              title="Aplicar cor"
              size="sm"
              disabled={!accent || busy}
              onPress={() => accent && applyDemo({ type: 'accent', colorId: accent as (typeof COLOR_OPTIONS)[number]['id'] })}
              style={{ alignSelf: 'flex-start' }}
            />
          </Section>
          <Section title="Manter um item como está">
            <ChipGroup>
              {FURNITURE_BY_ROOM[project.answers.roomType ?? 'outro'].map((item) => (
                <Chip key={item} label={item} selected={keepItem === item} onPress={() => setKeepItem(item)} />
              ))}
            </ChipGroup>
            <Button title="Manter item" size="sm" disabled={!keepItem || busy} onPress={() => keepItem && applyDemo({ type: 'keep', item: keepItem })} style={{ alignSelf: 'flex-start' }} />
          </Section>
        </Screen>
      )}
    </>
  );
}
