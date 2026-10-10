import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { PaletteStrip } from '@/components/palette-strip';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import type { Observation } from '@/domain/design';
import { useProject } from '@/hooks/use-project';
import { spacing, useColors } from '@/theme';
import { formatMeters } from '@/utils/units';

const ASPECT_LABEL: Record<Observation['aspect'], string> = {
  layout: 'Layout',
  mobiliario: 'Mobiliário',
  cores: 'Cores',
  materiais: 'Materiais',
  iluminacao: 'Iluminação',
  espaco: 'Espaço',
  arquitetura: 'Arquitetura',
  conservacao: 'Conservação',
};

const CONFIDENCE = { alta: 'confiança alta', media: 'confiança média', baixa: 'confiança baixa' } as const;
const SUGGESTION = { manter: 'Manter', reposicionar: 'Reposicionar', substituir: 'Substituir', remover: 'Remover', avaliar: 'Avaliar' } as const;

function List({ items }: { items: string[] }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {items.map((t, i) => (
        <AppText key={`${i}-${t}`} variant="callout" selectable>
          • {t}
        </AppText>
      ))}
    </View>
  );
}

export function AnalysisScreen({ id }: { id: string }) {
  const colors = useColors();
  const { project } = useProject(id);
  const a = project?.analysis;
  if (!project || !a) return null;

  return (
    <>
      <Stack.Screen options={{ title: 'Análise do ambiente' }} />
      <Screen testID="analysis-screen">
        <Notice tone="info" title="Como ler esta análise">
          Itens marcados como “Observado” são visíveis na foto. “Hipótese” indica uma inferência que a foto sozinha não permite confirmar.
        </Notice>

        {!a.photo.usable || a.photo.issues.length ? (
          <Notice tone="warning" title="Sobre a foto">
            <List items={[...a.photo.issues, ...a.photo.tips]} />
          </Notice>
        ) : null}

        {!a.matchesDeclaredRoom ? (
          <Notice tone="warning">{`A foto parece mostrar: ${a.detectedRoomType}. Se não for o ambiente certo, crie um novo projeto com outra foto.`}</Notice>
        ) : null}

        <Section title="Resumo">
          <AppText variant="body" selectable>
            {a.summary}
          </AppText>
        </Section>

        <Section title="Observações">
          <View style={{ gap: spacing.md }}>
            {a.observations.map((o, i) => (
              <Card key={i}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  <Badge label={ASPECT_LABEL[o.aspect]} />
                  <Badge label={o.basis === 'observado' ? 'Observado' : 'Hipótese'} tone={o.basis === 'observado' ? 'success' : 'warning'} />
                  <Badge label={CONFIDENCE[o.confidence]} tone="info" />
                </View>
                <AppText variant="callout" selectable>
                  {o.text}
                </AppText>
              </Card>
            ))}
          </View>
        </Section>

        {a.visibleItems.length ? (
          <Section title="Itens identificados">
            <Card padded={false}>
              {a.visibleItems.map((item, i) => (
                <View key={i} style={{ padding: spacing.md, gap: spacing.xxs, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <AppText variant="headline" style={{ flex: 1 }}>
                      {item.name}
                    </AppText>
                    <Badge label={SUGGESTION[item.suggestion]} tone="primary" />
                  </View>
                  <AppText variant="footnote" tone="secondary">
                    {item.location}
                    {item.condition ? ` · ${item.condition}` : ''}
                  </AppText>
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        <Section title="Paleta atual">
          <PaletteStrip colors={a.currentPalette} labeled />
        </Section>

        <Section title="Iluminação">
          <Card>
            <AppText variant="callout">Natural: {a.lighting.natural}</AppText>
            <AppText variant="callout">Artificial: {a.lighting.artificial}</AppText>
            <AppText variant="callout" tone="secondary">
              {a.lighting.assessment}
            </AppText>
          </Card>
        </Section>

        <Section title="Pontos fortes a preservar">
          <List items={a.strengths} />
        </Section>
        <Section title="Oportunidades de melhoria">
          <List items={a.opportunities} />
        </Section>
        {a.constraints.length ? (
          <Section title="Restrições consideradas">
            <List items={a.constraints} />
          </Section>
        ) : null}

        <Section title="Dimensões">
          <Card>
            <AppText variant="headline">
              {formatMeters(a.dimensions.widthM)} × {formatMeters(a.dimensions.lengthM)} · pé-direito {formatMeters(a.dimensions.heightM)}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Badge
                label={a.dimensions.source === 'usuario' ? 'Informadas por você' : a.dimensions.source === 'misto' ? 'Parte estimada' : 'Estimadas pela foto'}
                tone={a.dimensions.source === 'usuario' ? 'success' : 'warning'}
              />
              <Badge label={CONFIDENCE[a.dimensions.confidence]} tone="info" />
            </View>
            <AppText variant="footnote" tone="secondary" selectable>
              {a.dimensions.note}
            </AppText>
            {a.measurementRequests.length ? (
              <>
                <AppText variant="subhead">Medidas que melhorariam o projeto:</AppText>
                <List items={a.measurementRequests} />
                <Button
                  title="Informar medidas"
                  icon="ruler"
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/project/[id]/viewer3d', params: { id: project.id, measure: '1' } })}
                  style={{ alignSelf: 'flex-start' }}
                />
              </>
            ) : null}
          </Card>
        </Section>

        <Section title="Orçamento">
          <AppText variant="callout" selectable>
            {a.budgetNote}
          </AppText>
        </Section>
      </Screen>
    </>
  );
}
