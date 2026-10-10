import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Switch, View } from 'react-native';

import { AiStatusPill } from '@/components/ai-status';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { confirmAsync } from '@/components/confirm';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { APP_NAME } from '@/constants';
import type { ProviderStatus } from '@/domain/api';
import { getApiBaseUrl } from '@/services/api-client';
import { useAppStore } from '@/stores/app-store';
import { useDraftStore } from '@/stores/draft-store';
import { useProjectsStore } from '@/stores/projects-store';
import { spacing, useColors } from '@/theme';

const NAMES: Record<string, string> = { anthropic: 'Anthropic (Claude)', gemini: 'Google Gemini', openai: 'OpenAI', worldlabs: 'World Labs (Marble)' };

function ProviderRow({ label, status }: { label: string; status: ProviderStatus | undefined }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: status?.available ? colors.success : colors.borderStrong }} />
      <View style={{ flex: 1 }}>
        <AppText variant="headline">{label}</AppText>
        <AppText variant="footnote" tone="secondary" selectable>
          {status?.available ? `${NAMES[status.provider ?? ''] ?? status.provider} · ${status.model}` : 'Não configurado'}
        </AppText>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const colors = useColors();
  const health = useAppStore((s) => s.health);
  const healthStatus = useAppStore((s) => s.healthStatus);
  const healthError = useAppStore((s) => s.healthError);
  const settings = useAppStore((s) => s.settings);

  useEffect(() => {
    useAppStore.getState().loadSettings();
    useAppStore.getState().checkHealth();
  }, []);

  async function deleteEverything() {
    const ok = await confirmAsync(
      'Excluir todos os dados?',
      'Todos os projetos, fotos, imagens e o rascunho em andamento serão apagados deste aparelho. Esta ação não pode ser desfeita.',
      'Excluir tudo',
      true,
    );
    if (!ok) return;
    await useProjectsStore.getState().deleteAll();
    await useDraftStore.getState().reset();
    await useAppStore.getState().updateSettings({ consentAt: null });
    router.replace('/');
  }

  const server = getApiBaseUrl();

  return (
    <>
      <Stack.Screen options={{ title: 'Configurações' }} />
      <Screen testID="settings-screen">
        <Section title="Inteligência artificial">
          <Card>
            <AiStatusPill />
            <AppText variant="footnote" tone="secondary" selectable>
              Servidor: {server ?? 'não configurado'}
              {healthStatus === 'offline' && healthError ? `\n${healthError}` : ''}
            </AppText>
            <ProviderRow label="Análise e propostas" status={health?.analysis} />
            <ProviderRow label="Imagens das propostas" status={health?.image} />
            <ProviderRow label="3D imersivo (opcional)" status={health?.world} />
            <Button title="Verificar novamente" icon="refresh" size="sm" variant="secondary" onPress={() => useAppStore.getState().checkHealth()} style={{ alignSelf: 'flex-start' }} />
          </Card>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <AppText variant="headline">Usar sempre o modo demonstração</AppText>
                <AppText variant="footnote" tone="secondary">
                  Gera exemplos no aparelho, sem enviar fotos. A foto não é analisada e não há imagens geradas.
                </AppText>
              </View>
              <Switch
                accessibilityLabel="Usar sempre o modo demonstração"
                value={settings.preferDemo}
                onValueChange={(preferDemo) => useAppStore.getState().updateSettings({ preferDemo })}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                testID="prefer-demo"
              />
            </View>
          </Card>
        </Section>

        <Section title="Privacidade">
          <Card>
            <AppText variant="headline">Onde ficam seus dados</AppText>
            <AppText variant="callout" tone="secondary">
              Projetos, fotos e imagens ficam apenas na área privada do {APP_NAME} neste aparelho. Não há conta nem sincronização em nuvem nesta versão.
            </AppText>
            <AppText variant="headline">Quando algo é enviado</AppText>
            <AppText variant="callout" tone="secondary">
              Somente quando você pede propostas, ajustes ou o 3D imersivo com a IA ativa. A foto vai redimensionada e sem metadados de localização para o servidor do app, que a repassa aos provedores listados acima e não a armazena.
            </AppText>
            <AppText variant="callout" tone="secondary">
              {settings.consentAt
                ? `Você autorizou o envio em ${new Date(settings.consentAt).toLocaleDateString('pt-BR')}.`
                : 'Você ainda não autorizou o envio de fotos para a IA.'}
            </AppText>
            {settings.consentAt ? (
              <Button
                title="Revogar autorização"
                size="sm"
                variant="ghost"
                onPress={() => useAppStore.getState().updateSettings({ consentAt: null })}
                style={{ alignSelf: 'flex-start', marginLeft: -spacing.md }}
              />
            ) : null}
          </Card>
          <Button title="Excluir todos os meus dados" icon="trash" variant="danger" onPress={deleteEverything} testID="delete-all" />
        </Section>

        <Section title="Sobre">
          <AppText variant="footnote" tone="secondary">
            {APP_NAME} 1.0.0 (versão de teste). As propostas são sugestões conceituais e não substituem um projeto de arquiteto ou designer de interiores habilitado, especialmente para obras, elétrica e hidráulica.
          </AppText>
        </Section>
      </Screen>
    </>
  );
}
