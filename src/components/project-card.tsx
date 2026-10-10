import { View } from 'react-native';

import type { ProjectSummary } from '@/domain/project';
import { spacing, useColors } from '@/theme';

import { AppText } from './app-text';
import { PressableCard } from './card';
import { StoredImage } from './stored-image';

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function statusLabel(summary: ProjectSummary) {
  if (summary.status === 'generating') return 'Em andamento';
  if (summary.status === 'error') return 'Com erro';
  if (summary.selectedName) return `Escolhida: ${summary.selectedName}`;
  return `${summary.proposalCount} propostas`;
}

export function ProjectCard({ summary, onPress, compact }: { summary: ProjectSummary; onPress: () => void; compact?: boolean }) {
  const colors = useColors();
  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`Projeto ${summary.name}, ${summary.roomLabel}, ${statusLabel(summary)}`}
      accessibilityHint="Abre o projeto"
      testID={`project-card-${summary.id}`}
      style={compact ? { width: 220 } : undefined}>
      <StoredImage
        path={summary.thumbnail.path}
        aspectRatio={compact ? 4 / 3 : 16 / 9}
        rounded={false}
        accessibilityLabel={`Imagem do projeto ${summary.name}`}
      />
      <View style={{ padding: spacing.md, gap: spacing.xxs }}>
        <AppText variant="headline" numberOfLines={1}>
          {summary.name}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {statusLabel(summary)} · {formatDate(summary.updatedAt)}
        </AppText>
        {summary.mode === 'demo' ? (
          <AppText variant="caption" style={{ color: colors.accent }}>
            Exemplo (modo demonstração)
          </AppText>
        ) : null}
      </View>
    </PressableCard>
  );
}
