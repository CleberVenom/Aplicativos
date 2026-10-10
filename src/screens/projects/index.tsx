import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { confirmAsync } from '@/components/confirm';
import { EmptyState } from '@/components/empty-state';
import { ProjectCard } from '@/components/project-card';
import { useProjectsStore } from '@/stores/projects-store';
import { layout, spacing, useColors } from '@/theme';

export function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const summaries = useProjectsStore((s) => s.summaries);
  const loaded = useProjectsStore((s) => s.summariesLoaded);

  useEffect(() => {
    useProjectsStore.getState().refreshList();
  }, []);

  async function remove(id: string, name: string) {
    const ok = await confirmAsync('Excluir projeto?', `“${name}” e todas as imagens dele serão apagados deste aparelho.`, 'Excluir', true);
    if (ok) await useProjectsStore.getState().deleteProject(id);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Meus projetos' }} />
      <FlatList
        testID="projects-screen"
        data={summaries}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: layout.screenPadding,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.xl,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon="folder"
              title="Nenhum projeto ainda"
              message="Fotografe um ambiente para criar seu primeiro projeto. Tudo fica salvo neste aparelho."
              action={{ label: 'Começar', icon: 'camera', onPress: () => router.replace('/') }}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ gap: spacing.sm }}>
            <ProjectCard summary={item} onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Renomear"
                icon="pencil"
                size="sm"
                variant="secondary"
                onPress={() => router.push({ pathname: '/rename', params: { id: item.id } })}
                testID={`rename-${item.id}`}
              />
              <Button title="Excluir" icon="trash" size="sm" variant="danger" onPress={() => remove(item.id, item.name)} testID={`delete-${item.id}`} />
            </View>
          </View>
        )}
      />
    </>
  );
}
