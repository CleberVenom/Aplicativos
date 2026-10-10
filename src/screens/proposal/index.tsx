import { router, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { BeforeAfter } from '@/components/before-after';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { confirmAsync } from '@/components/confirm';
import { EmptyState } from '@/components/empty-state';
import { Icon, type IconName } from '@/components/icon';
import { Notice } from '@/components/notice';
import { PaletteStrip } from '@/components/palette-strip';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { INVESTMENT_LEVELS, labelOf } from '@/domain/catalog';
import { PLAN_AREA_LABELS, type ProposalKey } from '@/domain/design';
import { currentVersion } from '@/domain/project';
import { useProject } from '@/hooks/use-project';
import { restoreVersion, selectProposal } from '@/services/design-service';
import { useProjectsStore } from '@/stores/projects-store';
import { spacing, useColors } from '@/theme';
import { formatBRL } from '@/utils/units';

import { ProposalImage } from '../project/proposal-card';

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {items.map((item, i) => (
        <AppText key={`${i}-${item}`} variant="callout" selectable>
          • {item}
        </AppText>
      ))}
    </View>
  );
}

const CHANGE_GROUPS: { key: 'keep' | 'reposition' | 'add' | 'remove' | 'replace'; label: string; icon: IconName }[] = [
  { key: 'keep', label: 'Mantido', icon: 'check' },
  { key: 'reposition', label: 'Reposicionado', icon: 'move' },
  { key: 'add', label: 'Adicionado', icon: 'plus' },
  { key: 'replace', label: 'Substituído', icon: 'swap' },
  { key: 'remove', label: 'Removido', icon: 'ban' },
];

export function ProposalScreen({ id, proposalKey }: { id: string; proposalKey: ProposalKey }) {
  const colors = useColors();
  const { project, loaded } = useProject(id);
  const busy = useProjectsStore((s) => s.busy[`${id}:${proposalKey}`]);

  if (!loaded) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  const record = project?.proposals.find((p) => p.key === proposalKey);
  if (!project || !record) {
    return (
      <Screen>
        <EmptyState icon="info" title="Proposta não encontrada" message="Volte ao projeto e tente novamente." />
      </Screen>
    );
  }

  const version = currentVersion(record);
  const c = version.content;
  const selected = project.selectedKey === proposalKey;

  function choose() {
    if (!project) return;
    selectProposal(project.id, proposalKey);
    router.push({ pathname: '/project/[id]/invite3d', params: { id: project.id } });
  }

  async function restore(versionNumber: number) {
    if (!project) return;
    const ok = await confirmAsync('Restaurar versão?', `A versão ${versionNumber} volta a ser a atual. O histórico é preservado.`, 'Restaurar');
    if (ok) await restoreVersion(project.id, proposalKey, versionNumber);
  }

  const footer = (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <Button
        title="Ajustar"
        icon="wand"
        variant="secondary"
        disabled={busy === 'refine'}
        onPress={() => router.push({ pathname: '/project/[id]/adjust/[key]', params: { id: project.id, key: proposalKey } })}
        style={{ flex: 1 }}
        testID="adjust-proposal"
      />
      {selected ? (
        <Button title="Ver em 3D" icon="cube" onPress={() => router.push({ pathname: '/project/[id]/viewer3d', params: { id: project.id } })} style={{ flex: 1.4 }} testID="view-3d" />
      ) : (
        <Button title="Escolher esta" icon="heart" onPress={choose} style={{ flex: 1.4 }} testID="choose-proposal" />
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `Proposta ${proposalKey}` }} />
      <Screen footer={footer} testID="proposal-screen">
        {version.image ? (
          <View style={{ gap: spacing.sm }}>
            <BeforeAfter
              before={project.photo.path}
              after={version.image.path}
              aspectRatio={project.photo.width / project.photo.height}
              accessibilityLabel={`Comparação entre a foto original e a proposta ${c.name}`}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                Imagem conceitual gerada por IA ({version.image.provider}). Proporções e detalhes podem variar.
              </AppText>
              <Button
                title="Ampliar"
                icon="expand"
                size="sm"
                variant="ghost"
                onPress={() => router.push({ pathname: '/image-viewer', params: { projectId: project.id, key: proposalKey } })}
              />
            </View>
          </View>
        ) : (
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <ProposalImage project={project} record={record} />
          </Card>
        )}

        {busy === 'refine' ? (
          <Notice tone="info" title="Aplicando seu ajuste…">
            A nova versão aparece aqui em instantes.
          </Notice>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Badge label={`Proposta ${proposalKey}`} tone="primary" />
            <Badge label={`Investimento ${labelOf(INVESTMENT_LEVELS, c.investment.level).toLowerCase()}`} tone="accent" />
            {version.version > 1 ? <Badge label={`Versão ${version.version}`} /> : null}
            {selected ? <Badge label="Sua escolha" tone="success" /> : null}
          </View>
          <AppText variant="title1" selectable>
            {c.name}
          </AppText>
          <AppText variant="subhead" tone="secondary">
            {c.style}
          </AppText>
          <AppText variant="body">{c.tagline}</AppText>
        </View>

        <Section title="Objetivo e paleta">
          <AppText variant="callout">{c.objective}</AppText>
          <PaletteStrip colors={c.palette} labeled />
        </Section>

        <Section title="Por que esta proposta">
          <AppText variant="callout" selectable>
            {c.rationale}
          </AppText>
          {c.userFit.length ? (
            <Card tone="muted">
              <AppText variant="headline">Como atende ao que você pediu</AppText>
              <Bullets items={c.userFit} />
            </Card>
          ) : null}
        </Section>

        <Section title="Plano de transformação">
          <View style={{ gap: spacing.md }}>
            {c.plan.map((area) => (
              <Card key={area.area}>
                <AppText variant="headline">{PLAN_AREA_LABELS[area.area]}</AppText>
                <Bullets items={area.actions} />
              </Card>
            ))}
          </View>
        </Section>

        <Section title="O que muda no ambiente">
          <Card padded={false}>
            {CHANGE_GROUPS.filter((g) => c.changes[g.key].length).map((group, i) => (
              <View key={group.key} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <Icon name={group.icon} size={20} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <AppText variant="headline">{group.label}</AppText>
                  <AppText variant="callout" tone="secondary" selectable>
                    {c.changes[group.key].join(' · ')}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </Section>

        <Section title="Investimento">
          <Card>
            <AppText variant="title3">{labelOf(INVESTMENT_LEVELS, c.investment.level)}</AppText>
            {c.investment.estimateBRL ? (
              <AppText variant="headline" selectable>
                Estimativa indicativa: {formatBRL(c.investment.estimateBRL.min)} a {formatBRL(c.investment.estimateBRL.max)}
              </AppText>
            ) : null}
            <AppText variant="footnote" tone="secondary" selectable>
              {c.investment.basis}
            </AppText>
            {c.investment.estimateBRL ? (
              <AppText variant="caption" tone="tertiary">
                Valores aproximados, não constituem orçamento. Preços variam por região, loja e acabamento.
              </AppText>
            ) : null}
          </Card>
        </Section>

        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: 260 }}>
            <AppText variant="headline" tone="success">
              Vantagens
            </AppText>
            <Bullets items={c.advantages} />
          </Card>
          <Card style={{ flex: 1, minWidth: 260 }}>
            <AppText variant="headline" tone="warning">
              Limitações
            </AppText>
            <Bullets items={c.limitations} />
          </Card>
        </View>

        {record.versions.length > 1 ? (
          <Section title="Histórico de ajustes">
            <View style={{ gap: spacing.md }}>
              {[...record.versions].reverse().map((v) => (
                <Card key={v.version} tone={v.version === version.version ? 'primary' : 'default'}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Icon name="history" size={18} color={colors.textSecondary} />
                    <AppText variant="headline" style={{ flex: 1 }}>
                      Versão {v.version}
                      {v.version === version.version ? ' (atual)' : ''}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      {new Date(v.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </AppText>
                  </View>
                  {v.request ? <AppText variant="callout">Pedido: “{v.request}”</AppText> : <AppText variant="callout">Versão original</AppText>}
                  {v.changeSummary ? (
                    <AppText variant="footnote" tone="secondary">
                      {v.changeSummary}
                    </AppText>
                  ) : null}
                  {v.version !== version.version ? (
                    <Button title="Restaurar esta versão" size="sm" variant="ghost" icon="refresh" onPress={() => restore(v.version)} style={{ alignSelf: 'flex-start', marginLeft: -spacing.md }} />
                  ) : null}
                </Card>
              ))}
            </View>
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
