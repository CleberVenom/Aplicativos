import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { StoredImage } from '@/components/stored-image';
import { firstIncompleteStep } from '@/domain/questionnaire';
import { usePhotoPicker } from '@/hooks/use-photo-picker';
import { PHOTO_TIPS } from '@/services/photo-quality';
import { useDraftStore } from '@/stores/draft-store';
import { radius, spacing, useColors } from '@/theme';

export function PhotoScreen() {
  const colors = useColors();
  const picker = usePhotoPicker();
  const extraPicker = usePhotoPicker();
  const hydrated = useDraftStore((s) => s.hydrated);
  const photo = useDraftStore((s) => s.photo);
  const check = useDraftStore((s) => s.photoCheck);
  const extraPhotos = useDraftStore((s) => s.extraPhotos);
  const answers = useDraftStore((s) => s.answers);

  useEffect(() => {
    useDraftStore.getState().hydrate();
    picker.recoverPending();
    // Recover once on mount (Android activity restarts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const warnings = check?.warnings ?? [];

  function proceed() {
    const step = firstIncompleteStep(answers) ?? 'review';
    router.push({ pathname: '/questionnaire/[step]', params: { step } });
  }

  return (
    <Screen
      testID="photo-screen"
      footer={
        photo ? (
          <Button title="Continuar" iconRight="arrowRight" size="lg" onPress={proceed} testID="photo-continue" />
        ) : null
      }>
      {!hydrated ? null : photo ? (
        <View style={{ gap: spacing.lg }}>
          <StoredImage
            path={photo.path}
            aspectRatio={photo.width / photo.height}
            accessibilityLabel="Foto escolhida do ambiente"
            testID="photo-preview"
          />
          {warnings.length ? (
            <Notice tone="warning" title="A foto pode ser melhorada" testID="photo-warnings">
              <View style={{ gap: spacing.xs }}>
                {warnings.map((w) => (
                  <AppText key={w} variant="callout" selectable>
                    • {w}
                  </AppText>
                ))}
                <AppText variant="footnote" tone="secondary">
                  Você pode continuar assim mesmo ou trocar a foto.
                </AppText>
              </View>
            </Notice>
          ) : (
            <Notice tone="success" title="Foto pronta">
              Boa iluminação e resolução para a análise.
            </Notice>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button title="Tirar outra" icon="camera" variant="secondary" size="sm" loading={picker.busy === 'camera'} onPress={() => picker.pick('camera')} />
            <Button title="Escolher outra" icon="gallery" variant="secondary" size="sm" loading={picker.busy === 'gallery'} onPress={() => picker.pick('gallery')} />
            <Button title="Remover" icon="trash" variant="danger" size="sm" onPress={() => useDraftStore.getState().clearPhoto()} testID="photo-remove" />
          </View>
          {picker.error ? <Notice tone="danger">{picker.error}</Notice> : null}

          <Section title="Outros ângulos (opcional)" subtitle="Até 2 fotos extras ajudam a IA a entender melhor o espaço. As propostas são desenhadas sobre a foto principal.">
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {extraPhotos.map((extra, index) => (
                <View key={extra.path} style={{ width: 96 }}>
                  <StoredImage path={extra.path} aspectRatio={1} accessibilityLabel={`Foto adicional ${index + 1}`} />
                  <IconButton
                    icon="close"
                    label={`Remover foto adicional ${index + 1}`}
                    variant="overlay"
                    size={28}
                    onPress={() => useDraftStore.getState().removeExtraPhoto(index)}
                    style={{ position: 'absolute', top: 4, right: 4 }}
                  />
                </View>
              ))}
              {extraPhotos.length < 2 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar foto de outro ângulo"
                  onPress={() => extraPicker.pick('gallery', 'extra')}
                  style={({ pressed }) => ({
                    width: 96,
                    height: 96,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.borderStrong,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.xs,
                    backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                  })}>
                  <Icon name="photoAdd" size={24} color={colors.textSecondary} />
                  <AppText variant="caption" tone="secondary">
                    {extraPicker.busy ? 'Carregando…' : 'Adicionar'}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            {extraPicker.error ? <Notice tone="danger">{extraPicker.error}</Notice> : null}
          </Section>
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <AppText variant="title2">Mostre o ambiente que você quer transformar</AppText>
          <View style={{ gap: spacing.md }}>
            <Button title="Fotografar ambiente" icon="camera" size="lg" loading={picker.busy === 'camera'} onPress={() => picker.pick('camera')} />
            <Button title="Escolher da galeria" icon="gallery" size="lg" variant="secondary" loading={picker.busy === 'gallery'} onPress={() => picker.pick('gallery')} />
          </View>
          {picker.error ? <Notice tone="danger" title="Não foi possível usar esta foto">{picker.error}</Notice> : null}
        </View>
      )}

      <Card tone="muted">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="viewfinder" size={20} color={colors.primary} />
          <AppText variant="headline">Dicas para uma boa foto</AppText>
        </View>
        {PHOTO_TIPS.map((tip) => (
          <AppText key={tip} variant="callout" tone="secondary">
            • {tip}
          </AppText>
        ))}
      </Card>

      <Notice tone="info" icon="shield" title="Sua privacidade">
        A foto fica guardada somente neste aparelho. Ela só é enviada aos serviços de IA quando você pedir as propostas — e você
        será avisado antes. Metadados como a localização são removidos.
      </Notice>
    </Screen>
  );
}
