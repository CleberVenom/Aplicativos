import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip, ChipGroup } from '@/components/chip';
import { MeasureField } from '@/components/measure-field';
import { Notice } from '@/components/notice';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { PROPOSAL_KEYS, type ProposalKey } from '@/domain/design';
import { currentVersion, type Project } from '@/domain/project';
import { sceneForProposal } from '@/domain/viewer-scene';
import { STATUS_COLORS, STATUS_LABELS, type CameraPreset, type SelectedItem, type ViewerToHost } from '@/features/viewer3d/protocol';
import { ViewerCanvas, type ViewerHandle } from '@/features/viewer3d/viewer-canvas';
import { useProject } from '@/hooks/use-project';
import { updateMeasurements } from '@/services/design-service';
import { layout, spacing, useColors } from '@/theme';
import { formatMeters } from '@/utils/units';

import { WorldCard } from './world-card';

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'photo', label: 'Como na foto' },
  { id: 'top', label: 'Planta' },
];

function Body({ project, initialKey, focusMeasure }: { project: Project; initialKey: ProposalKey; focusMeasure: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const viewer = useRef<ViewerHandle>(null);
  const [key, setKey] = useState<ProposalKey>(initialKey);
  const [preset, setPreset] = useState<CameraPreset>('overview');
  const [highlight, setHighlight] = useState(false);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState(project.measurements);

  const record = project.proposals.find((p) => p.key === key) ?? project.proposals[0];
  const version = record ? currentVersion(record) : null;
  const viewerScene = useMemo(
    () => (version ? sceneForProposal(project, version, record!.key) : null),
    // Recompute when the version, the measurements or the proposal change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version?.version, record?.key, project.measurements, project.id],
  );
  const [initial] = useState(() => (viewerScene ? { type: 'scene' as const, scene: viewerScene.scene, highlight: false, camera: 'overview' as const } : null));
  const lastSent = useRef(viewerScene?.scene);

  // Push a new scene to the viewer when the proposal, version or measurements change.
  useEffect(() => {
    if (status !== 'ready' || !viewerScene || lastSent.current === viewerScene.scene) return;
    lastSent.current = viewerScene.scene;
    viewer.current?.send({ type: 'scene', scene: viewerScene.scene, highlight, camera: preset });
  }, [viewerScene, status, highlight, preset]);

  if (!version || !viewerScene || !initial) {
    return <Notice tone="info">Ainda não há propostas para visualizar.</Notice>;
  }

  function onMessage(message: ViewerToHost) {
    if (message.type === 'ready' || message.type === 'rendered') setStatus('ready');
    else if (message.type === 'select') setSelected(message.item);
    else if (message.type === 'error') {
      setStatus('error');
      setError(message.message);
    }
  }

  function changePreset(next: CameraPreset | undefined) {
    if (!next) return;
    setPreset(next);
    viewer.current?.send({ type: 'camera', preset: next });
  }

  function toggleHighlight(enabled: boolean) {
    setHighlight(enabled);
    viewer.current?.send({ type: 'highlight', enabled });
  }

  const room = viewerScene.scene.room;
  const statuses = [...new Set(viewerScene.scene.items.map((i) => i.status))];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ height: Math.max(300, height * 0.5) }} testID="viewer-canvas">
        <ViewerCanvas ref={viewer} initial={initial} onMessage={onMessage} />
        <View pointerEvents="none" style={{ position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, alignItems: 'center' }}>
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: 'rgba(20,16,12,0.6)' }}>
            <AppText variant="caption" style={{ color: '#FFFFFF' }}>
              {status === 'loading' ? 'Carregando o 3D…' : 'Arraste para girar · pinça para zoom · toque num móvel'}
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: layout.screenPadding, paddingBottom: insets.bottom + spacing.xxxl, gap: spacing.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled">
        {status === 'error' ? <Notice tone="danger" title="Não foi possível mostrar o 3D">{error ?? 'Erro desconhecido.'}</Notice> : null}

        <Segmented options={PRESETS} value={preset} onChange={changePreset} accessibilityLabel="Câmera" />

        <Notice tone="info" title="Maquete 3D aproximada">
          {`${viewerScene.dimensionsNote} ${viewerScene.usedTemplate ? 'A disposição dos móveis é um modelo genérico para este tipo de ambiente.' : 'Os móveis são representações simplificadas da proposta, não modelos exatos.'}`}
        </Notice>

        {project.proposals.length > 1 ? (
          <Section title="Proposta exibida">
            <ChipGroup>
              {PROPOSAL_KEYS.filter((k) => project.proposals.some((p) => p.key === k)).map((k) => (
                <Chip
                  key={k}
                  label={`${k} · ${currentVersion(project.proposals.find((p) => p.key === k)!).content.name}`}
                  selected={k === key}
                  onPress={() => {
                    setKey(k);
                    setSelected(null);
                  }}
                />
              ))}
            </ChipGroup>
          </Section>
        ) : null}

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <AppText variant="headline">Destacar mudanças</AppText>
              <AppText variant="footnote" tone="secondary">
                Colore o que é novo, substituído ou reposicionado.
              </AppText>
            </View>
            <Switch value={highlight} onValueChange={toggleHighlight} accessibilityLabel="Destacar mudanças" trackColor={{ true: colors.primary, false: colors.borderStrong }} />
          </View>
          {highlight ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {statuses.map((s) => (
                <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: STATUS_COLORS[s] }} />
                  <AppText variant="caption">{STATUS_LABELS[s]}</AppText>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        {selected ? (
          <Card tone="primary" testID="selected-item">
            <AppText variant="overline" tone="primary">
              Item selecionado
            </AppText>
            <AppText variant="title3">{selected.label}</AppText>
            <AppText variant="callout" tone="secondary">
              {STATUS_LABELS[selected.status] ?? selected.status} · {formatMeters(selected.widthM)} × {formatMeters(selected.depthM)} × {formatMeters(selected.heightM)} (aprox.)
            </AppText>
            <Button title="Voltar à visão geral" size="sm" variant="ghost" onPress={() => { viewer.current?.send({ type: 'focus', index: null }); changePreset('overview'); }} style={{ alignSelf: 'flex-start', marginLeft: -spacing.md }} />
          </Card>
        ) : null}

        <Section title="Itens da maquete" subtitle="Toque para aproximar a câmera do item.">
          <ChipGroup>
            {viewerScene.scene.items.map((item, index) => (
              <Chip key={`${item.kind}-${index}`} label={item.label} onPress={() => viewer.current?.send({ type: 'focus', index })} />
            ))}
          </ChipGroup>
        </Section>

        <Section title="Medidas do ambiente" subtitle={`Atual: ${formatMeters(room.widthM)} × ${formatMeters(room.lengthM)} · pé-direito ${formatMeters(room.heightM)}`}>
          {focusMeasure ? <Notice tone="info">Informe as medidas reais para que a maquete e as estimativas fiquem mais fiéis.</Notice> : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <MeasureField label="Largura" value={dims.widthM} onChange={(widthM) => setDims((d) => ({ ...d, widthM }))} />
            <MeasureField label="Comprimento" value={dims.lengthM} onChange={(lengthM) => setDims((d) => ({ ...d, lengthM }))} />
            <MeasureField label="Pé-direito" value={dims.heightM} onChange={(heightM) => setDims((d) => ({ ...d, heightM }))} />
          </View>
          <Button title="Aplicar medidas" icon="ruler" variant="secondary" size="sm" onPress={() => updateMeasurements(project.id, dims)} style={{ alignSelf: 'flex-start' }} testID="apply-measures" />
          <AppText variant="caption" tone="tertiary">
            Largura: de parede a parede, da esquerda para a direita na foto. Comprimento: da parede do fundo até onde você estava ao fotografar.
          </AppText>
        </Section>

        <WorldCard project={project} proposalKey={record!.key} version={version} />
      </ScrollView>
    </View>
  );
}

export function Viewer3dScreen({ id, focusMeasure }: { id: string; focusMeasure: boolean }) {
  const { project } = useProject(id);
  return (
    <>
      <Stack.Screen options={{ title: 'Visualização 3D' }} />
      {project ? <Body key={project.id} project={project} initialKey={project.selectedKey ?? project.proposals[0]?.key ?? 'A'} focusMeasure={focusMeasure} /> : null}
    </>
  );
}
