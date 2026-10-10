import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { Notice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { createProjectFromDraft } from '@/services/design-service';
import { useAppStore } from '@/stores/app-store';
import { spacing, useColors } from '@/theme';

const PROVIDER_NAMES: Record<string, string> = {
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google (Gemini)',
  openai: 'OpenAI',
  worldlabs: 'World Labs',
};

function Row({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <Icon name={icon} size={22} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="callout" tone="secondary">
          {text}
        </AppText>
      </View>
    </View>
  );
}

/** Shown before the first time photos are sent to external AI services. */
export function ConsentScreen() {
  const health = useAppStore((s) => s.health);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analysis = health?.analysis.provider ? PROVIDER_NAMES[health.analysis.provider] : 'o provedor de IA configurado';
  const image = health?.image.provider ? PROVIDER_NAMES[health.image.provider] : null;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await useAppStore.getState().updateSettings({ consentAt: new Date().toISOString() });
      const id = await createProjectFromDraft('ai');
      router.dismissAll();
      router.push({ pathname: '/project/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar.');
    } finally {
      setBusy(false);
    }
  }

  async function useDemo() {
    setBusy(true);
    try {
      const id = await createProjectFromDraft('demo');
      router.dismissAll();
      router.push({ pathname: '/project/[id]', params: { id } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      testID="consent-screen"
      footer={
        <>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Button title="Concordo, gerar propostas" icon="sparkles" size="lg" loading={busy} onPress={accept} testID="consent-accept" />
          <Button title="Usar o modo demonstração" variant="ghost" disabled={busy} onPress={useDemo} />
        </>
      }>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title1">Antes de enviar sua foto</AppText>
        <AppText variant="callout" tone="secondary">
          Para criar propostas personalizadas, a foto e suas respostas precisam ser processadas por serviços de IA.
        </AppText>
      </View>
      <Card>
        <Row
          icon="server"
          title="O que é enviado"
          text={`A foto (redimensionada e sem metadados de localização), as fotos extras que você incluiu e as respostas do questionário vão para o servidor do app, que as encaminha para ${analysis}, responsável pela análise e pelas propostas${image ? `, e para ${image}, responsável pelas imagens` : ''}.`}
        />
        <Row
          icon="shield"
          title="O que não fazemos"
          text="O servidor do app não guarda suas fotos nem as usa para outros fins. Não é preciso criar conta."
        />
        <Row
          icon="info"
          title="Políticas dos provedores"
          text="Cada provedor de IA processa os dados conforme a própria política de privacidade e retenção. O 3D imersivo, quando disponível, só é gerado se você pedir e terá um aviso próprio."
        />
        <Row icon="folder" title="Onde ficam seus projetos" text="Somente neste aparelho. Você pode excluí-los a qualquer momento." />
      </Card>
    </Screen>
  );
}
