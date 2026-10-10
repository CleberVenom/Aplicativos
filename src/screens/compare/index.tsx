import { router, Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { PaletteStrip } from '@/components/palette-strip';
import { StoredImage } from '@/components/stored-image';
import { INVESTMENT_LEVELS, labelOf } from '@/domain/catalog';
import { currentVersion } from '@/domain/project';
import { useProject } from '@/hooks/use-project';
import { selectProposal } from '@/services/design-service';
import { layout, radius, spacing, useColors } from '@/theme';

const COLUMN = 280;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Side-by-side comparison; scroll horizontally on phones. */
export function CompareScreen({ id }: { id: string }) {
  const colors = useColors();
  const { project } = useProject(id);
  if (!project) return null;

  const rows: { label: string; render: (i: number) => React.ReactNode }[] = [];
  const records = project.proposals;
  const versions = records.map(currentVersion);

  rows.push({
    label: 'Estilo',
    render: (i) => <AppText variant="callout">{versions[i].content.style}</AppText>,
  });
  rows.push({
    label: 'Investimento',
    render: (i) => <Badge label={labelOf(INVESTMENT_LEVELS, versions[i].content.investment.level)} tone="accent" />,
  });
  rows.push({ label: 'Paleta', render: (i) => <PaletteStrip colors={versions[i].content.palette} height={22} /> });
  rows.push({
    label: 'Mudanças',
    render: (i) => {
      const ch = versions[i].content.changes;
      return (
        <AppText variant="footnote" tone="secondary">
          {[
            count(ch.keep.length, 'mantido', 'mantidos'),
            count(ch.reposition.length, 'reposicionado', 'reposicionados'),
            count(ch.add.length, 'novo', 'novos'),
            count(ch.replace.length, 'substituído', 'substituídos'),
            count(ch.remove.length, 'removido', 'removidos'),
          ].join(' · ')}
        </AppText>
      );
    },
  });
  rows.push({
    label: 'Vantagens',
    render: (i) => (
      <View style={{ gap: spacing.xxs }}>
        {versions[i].content.advantages.slice(0, 3).map((a) => (
          <AppText key={a} variant="footnote">
            + {a}
          </AppText>
        ))}
      </View>
    ),
  });
  rows.push({
    label: 'Limitações',
    render: (i) => (
      <View style={{ gap: spacing.xxs }}>
        {versions[i].content.limitations.slice(0, 3).map((a) => (
          <AppText key={a} variant="footnote" tone="secondary">
            − {a}
          </AppText>
        ))}
      </View>
    ),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Comparar propostas' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingVertical: spacing.lg }} testID="compare-screen">
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: layout.screenPadding, gap: spacing.md }}>
          {records.map((record, i) => {
            const v = versions[i];
            const selected = project.selectedKey === record.key;
            return (
              <View
                key={record.key}
                style={{
                  width: COLUMN,
                  borderRadius: radius.lg,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                  overflow: 'hidden',
                }}>
                {v.image ? (
                  <StoredImage path={v.image.path} aspectRatio={4 / 3} rounded={false} accessibilityLabel={`Imagem da proposta ${v.content.name}`} />
                ) : (
                  <View style={{ aspectRatio: 4 / 3, padding: spacing.lg, justifyContent: 'center', backgroundColor: colors.surfaceMuted }}>
                    <PaletteStrip colors={v.content.palette} height={40} />
                  </View>
                )}
                <View style={{ padding: spacing.md, gap: spacing.md }}>
                  <View style={{ gap: spacing.xxs }}>
                    <Badge label={`Proposta ${record.key}`} tone="primary" />
                    <AppText variant="title3" numberOfLines={2}>
                      {v.content.name}
                    </AppText>
                  </View>
                  {rows.map((row) => (
                    <View key={row.label} style={{ gap: spacing.xs }}>
                      <AppText variant="overline" tone="tertiary">
                        {row.label}
                      </AppText>
                      {row.render(i)}
                    </View>
                  ))}
                  <Button
                    title={selected ? 'Escolhida' : 'Escolher'}
                    icon={selected ? 'checkCircle' : 'heart'}
                    variant={selected ? 'tonal' : 'primary'}
                    size="sm"
                    disabled={selected}
                    onPress={() => {
                      selectProposal(project.id, record.key);
                      router.push({ pathname: '/project/[id]/invite3d', params: { id: project.id } });
                    }}
                  />
                  <Button
                    title="Detalhes"
                    variant="ghost"
                    size="sm"
                    onPress={() => router.push({ pathname: '/project/[id]/proposal/[key]', params: { id: project.id, key: record.key } })}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </>
  );
}
