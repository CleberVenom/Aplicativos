import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { PhotoCheck } from '@/domain/project';

import { buildPhotoCheck, measureExposure, validateAsset, type PickedAsset } from './photo-quality';

export type ProcessedPhoto = {
  uri: string;
  width: number;
  height: number;
  base64: string;
  check: PhotoCheck;
  errors: string[];
};

/** Longest side sent to the AI. Larger images cost more and do not improve the analysis. */
export const MAX_LONG_SIDE = 1600;

/**
 * Validates and normalizes a picked photo: resizes to <= 1600 px and re-encodes as
 * JPEG. Re-encoding also drops metadata such as GPS location before anything is
 * stored or uploaded.
 */
export async function processPickedPhoto(asset: PickedAsset): Promise<ProcessedPhoto> {
  const basic = validateAsset(asset);
  if (basic.errors.length) {
    return { uri: asset.uri, width: asset.width, height: asset.height, base64: '', check: { brightness: 0, contrast: 0, warnings: [] }, errors: basic.errors };
  }

  const context = ImageManipulator.manipulate(asset.uri);
  const longSide = Math.max(asset.width, asset.height);
  if (longSide > MAX_LONG_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_LONG_SIDE } : { height: MAX_LONG_SIDE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG, base64: true });

  // Recheck resolution with the real decoded size (some pickers report 0×0).
  const sized = validateAsset({ ...asset, width: saved.width, height: saved.height, mimeType: 'image/jpeg' });
  if (sized.errors.length) {
    return { uri: saved.uri, width: saved.width, height: saved.height, base64: '', check: { brightness: 0, contrast: 0, warnings: [] }, errors: sized.errors };
  }

  const thumbContext = ImageManipulator.manipulate(saved.uri);
  thumbContext.resize({ width: 64 });
  const thumb = await (await thumbContext.renderAsync()).saveAsync({ compress: 0.9, format: SaveFormat.JPEG, base64: true });
  let exposure = { brightness: 128, contrast: 50 };
  try {
    if (thumb.base64) exposure = measureExposure(thumb.base64);
  } catch {
    // If the thumbnail cannot be decoded we simply skip the exposure warnings.
  }

  return {
    uri: saved.uri,
    width: saved.width,
    height: saved.height,
    base64: saved.base64 ?? '',
    check: buildPhotoCheck(exposure, { errors: [], warnings: [...new Set([...basic.warnings, ...sized.warnings])] }),
    errors: [],
  };
}
