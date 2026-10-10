import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { useProject } from '@/hooks/use-project';
import { useProjectsStore } from '@/stores/projects-store';
import { layout, spacing, useColors } from '@/theme';

function RenameForm({ id, initialName }: { id: string; initialName: string }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await useProjectsStore.getState().renameProject(id, name);
    setBusy(false);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: layout.screenPadding, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }} testID="rename-screen">
      <AppText variant="title2">Renomear projeto</AppText>
      <TextField label="Nome" value={name} onChangeText={setName} maxLength={80} autoFocus returnKeyType="done" onSubmitEditing={save} testID="rename-input" />
      <Button title="Salvar" loading={busy} disabled={!name.trim()} onPress={save} testID="rename-save" />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} />
    </View>
  );
}

export function RenameScreen({ id }: { id: string }) {
  const { project } = useProject(id);
  return (
    <>
      {project ? <RenameForm key={project.id} id={project.id} initialName={project.name} /> : null}
    </>
  );
}
