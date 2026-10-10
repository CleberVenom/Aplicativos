import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import { processPickedPhoto } from '@/services/photo';
import { localStore } from '@/services/storage/local-store';
import { useDraftStore } from '@/stores/draft-store';

export type PickSource = 'camera' | 'gallery';
export type PickTarget = 'main' | 'extra';
export type PickOutcome = 'ok' | 'cancelled' | 'error';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  exif: false,
};

async function storeAsset(asset: ImagePicker.ImagePickerAsset, target: PickTarget): Promise<string | null> {
  const processed = await processPickedPhoto({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    fileName: asset.fileName,
  });
  if (processed.errors.length) return processed.errors.join('\n');

  const path = await localStore.saveImage('draft', `${target}-${Date.now()}.jpg`, processed.base64);
  const image = { path, width: processed.width, height: processed.height };
  if (target === 'main') await useDraftStore.getState().setPhoto(image, processed.check);
  else useDraftStore.getState().addExtraPhoto(image);
  return null;
}

/** Camera/gallery selection with permission handling, validation and normalization. */
export function usePhotoPicker() {
  const [busy, setBusy] = useState<PickSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: PickSource, target: PickTarget = 'main'): Promise<PickOutcome> {
    setError(null);
    try {
      if (source === 'camera' && process.env.EXPO_OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(
            permission.canAskAgain
              ? 'Para fotografar o ambiente, permita o acesso à câmera.'
              : 'O acesso à câmera está bloqueado. Ative-o nas configurações do aparelho ou escolha uma foto da galeria.',
          );
          return 'error';
        }
      }
      setBusy(source);
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync({ ...PICKER_OPTIONS, selectionLimit: 1 });
      if (result.canceled || !result.assets?.[0]) return 'cancelled';
      const problem = await storeAsset(result.assets[0], target);
      if (problem) {
        setError(problem);
        return 'error';
      }
      return 'ok';
    } catch {
      setError('Não foi possível carregar a foto. Tente novamente ou escolha outra imagem.');
      return 'error';
    } finally {
      setBusy(null);
    }
  }

  /** Android may kill the app while the camera is open; recover that photo on return. */
  async function recoverPending(): Promise<boolean> {
    if (process.env.EXPO_OS !== 'android') return false;
    try {
      const pending = await ImagePicker.getPendingResultAsync();
      if (pending && 'assets' in pending && !pending.canceled && pending.assets?.[0]) {
        const problem = await storeAsset(pending.assets[0], 'main');
        if (problem) setError(problem);
        return !problem;
      }
    } catch {
      // nothing pending
    }
    return false;
  }

  return { pick, recoverPending, busy, error, clearError: () => setError(null) };
}
