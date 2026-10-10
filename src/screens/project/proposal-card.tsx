import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { PaletteStrip } from '@/components/palette-strip';
import { StoredImage } from '@/components/stored-image';
import { INVESTMENT_LEVELS, labelOf } from '@/domain/catalog';
import type { ProposalKey } from '@/domain/design';
import { currentVersion, type Project, type ProposalRecord } from '@/domain/project';
import { renderProposal } from '@/services/design-service';
import { useAppStore } from '@/stores/app-store';
import { useProjectsStore } from '@/stores/projects-store';
import { radius, spacing, useColors } from '@/theme';

/** Demo mode has no generated image: show the proposal's palette as a mood board. */
function PaletteMoodboard({ palette, aspectRatio }: { palette: { hex: string; name: string }[]; aspectRatio: number }) {
  const [main, ...rest] = palette;
  return (
    <View style={{ aspectRatio, flexDirection: 'row' }} accessible accessibilityLabel={`Paleta da proposta: ${palette.map((p) => p.name).join(', ')}`}>
      <View style={{ flex: 3, backgroundColor: main?.hex }} />
      <View style={{ flex: 2 }}>
        {rest.slice(0, 3).map((c, i) => (
          <View key={`${c.hex}-${i}`} style={{ flex: 1, backgroundColor: c.hex }} />
        ))}
      </View>
      <View style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md }}>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: 'rgba(20,16,12,0.65)' }}>
          <AppText variant="caption" style={{ color: '#FFFFFF' }}>
            Exemplo sem imagem de IA · veja a maquete 3D
          </AppText>
        </View>
      </View>
    </View>
  );
}

export function ProposalImage({ project, record }: { project: Project; record: ProposalRecord }) {
  const colors = useColors();
  const version = currentVersion(record);
  const busy = useProjectsStore((s) => s.busy[`${project.id}:${record.key}`]);
  const imageAvailable = useAppStore((s) => !!s.health?.image.available);
  const aspect = project.photo.width / project.photo.height;

  if (version.image) {
    return (
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Ampliar imagem da proposta ${version.content.name}`}
        onPress={() => router.push({ pathname: '/image-viewer', params: { projectId: project.id, key: record.key } })}>
        <StoredImage path={version.image.path} aspectRatio={version.image.width / version.image.height} rounded={false} accessibilityLabel={`Visualização da proposta ${version.content.name}`} />
      </Pressable>
    );
  }

  let content: React.ReactNode;
  if (busy === 'render') {
    content = (
      <>
        <ActivityIndicator color={colors.primary} />
        <AppText variant="footnote" tone="secondary" align="center">
          Gerando a imagem da proposta…
        </AppText>
      </>
    );
  } else if (version.imageError) {
    content = (
      <>
        <Icon name="warning" color={colors.warning} />
        <AppText variant="footnote" tone="secondary" align="center" selectable>
          {version.imageError}
        </AppText>
        <Button title="Gerar imagem novamente" size="sm" variant="secondary" icon="refresh" onPress={() => renderProposal(project.id, record.key)} />
      </>
    );
  } else if (project.mode === 'demo') {
    return <PaletteMoodboard palette={version.content.palette} aspectRatio={aspect} />;
  } else if (!imageAvailable) {
    content = (
      <>
        <Icon name="info" color={colors.textSecondary} />
        <AppText variant="footnote" tone="secondary" align="center">
          Imagem não gerada: o provedor de imagens não está configurado no servidor.
        </AppText>
      </>
    );
  } else {
    content = (
      <>
        <AppText variant="footnote" tone="secondary" align="center">
          A imagem ainda não foi gerada.
        </AppText>
        <Button title="Gerar imagem" size="sm" variant="secondary" icon="sparkles" onPress={() => renderProposal(project.id, record.key)} />
      </>
    );
  }

  return (
    <View style={{ aspectRatio: aspect, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg }}>
      {content}
    </View>
  );
}

export function ProposalCard({ project, record }: { project: Project; record: ProposalRecord }) {
  const colors = useColors();
  const version = currentVersion(record);
  const content = version.content;
  const selected = project.selectedKey === record.key;
  const busy = useProjectsStore((s) => s.busy[`${project.id}:${record.key}`]);

  return (
    <Card padded={false} testID={`proposal-card-${record.key}`} style={{ overflow: 'hidden', borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 }}>
      <ProposalImage project={project} record={record} />
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Badge label={`Proposta ${record.key}`} tone="primary" />
          <Badge label={labelOf(INVESTMENT_LEVELS, content.investment.level)} tone="accent" />
          {version.version > 1 ? <Badge label={`Versão ${version.version}`} /> : null}
          {selected ? <Badge label="Sua escolha" tone="success" /> : null}
          {busy === 'refine' ? <Badge label="Ajustando…" tone="info" /> : null}
        </View>
        <AppText variant="title2">{content.name}</AppText>
        <AppText variant="subhead" tone="secondary">
          {content.style}
        </AppText>
        <AppText variant="callout">{content.tagline}</AppText>
        <PaletteStrip colors={content.palette} height={20} />
        <Button
          title="Ver proposta completa"
          variant="secondary"
          iconRight="chevronRight"
          onPress={() => router.push({ pathname: '/project/[id]/proposal/[key]', params: { id: project.id, key: record.key } })}
          testID={`open-proposal-${record.key}`}
        />
      </View>
    </Card>
  );
}

export function PendingProposalCard({ keyName, title, error, onRetry }: { keyName: ProposalKey; title?: string; error?: string; onRetry?: () => void }) {
  const colors = useColors();
  return (
    <View
      style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: error ? colors.danger : colors.borderStrong }}
      testID={`proposal-pending-${keyName}`}>
      <Badge label={`Proposta ${keyName}`} tone={error ? 'warning' : 'neutral'} />
      {error ? (
        <>
          <AppText variant="callout" selectable>
            {error}
          </AppText>
          {onRetry ? <Button title="Tentar novamente" size="sm" variant="secondary" icon="refresh" onPress={onRetry} style={{ alignSelf: 'flex-start' }} /> : null}
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="callout" tone="secondary" style={{ flex: 1 }}>
            {title ? `Detalhando "${title}"…` : 'Criando a proposta…'}
          </AppText>
        </View>
      )}
    </View>
  );
}
