import { decode } from 'jpeg-js';

import type { PhotoCheck } from '@/domain/project';
import { base64ToBytes } from '@/utils/base64';

/**
 * Photo checks that run entirely on the device (nothing is uploaded):
 * format, size, resolution and exposure/contrast measured on a tiny thumbnail.
 * They catch obvious problems; whether the photo really shows the room is judged
 * later by the AI analysis (when it is configured).
 */

export const PHOTO_LIMITS = {
  maxFileBytes: 30 * 1024 * 1024,
  minShortSide: 480,
  recommendedShortSide: 900,
  maxAspect: 2.4,
} as const;

const SUPPORTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
const SUPPORTED_EXT = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

export type PickedAsset = {
  uri: string;
  width: number;
  height: number;
  mimeType?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
};

export type BasicValidation = { errors: string[]; warnings: string[] };

export function validateAsset(asset: PickedAsset): BasicValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const mime = asset.mimeType?.toLowerCase() ?? null;
  const ext = (asset.fileName ?? asset.uri).split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const knownType = (mime && SUPPORTED_MIME.includes(mime)) || SUPPORTED_EXT.includes(ext) || asset.uri.startsWith('data:image/');
  if (!knownType && (mime || ext)) {
    errors.push('Formato não suportado. Use uma foto em JPG, PNG, HEIC ou WebP.');
  }
  if (mime?.startsWith('video/')) errors.push('Selecione uma foto, não um vídeo.');

  if (asset.fileSize && asset.fileSize > PHOTO_LIMITS.maxFileBytes) {
    errors.push('A foto é muito grande (mais de 30 MB). Escolha outra ou reduza a resolução.');
  }

  if (asset.width > 0 && asset.height > 0) {
    const shortSide = Math.min(asset.width, asset.height);
    const aspect = Math.max(asset.width, asset.height) / shortSide;
    if (shortSide < PHOTO_LIMITS.minShortSide) {
      errors.push(`Resolução muito baixa (${asset.width}×${asset.height}). Use uma foto com pelo menos ${PHOTO_LIMITS.minShortSide} px no menor lado.`);
    } else if (shortSide < PHOTO_LIMITS.recommendedShortSide) {
      warnings.push('A resolução é baixa; detalhes do ambiente podem se perder na análise.');
    }
    if (aspect > PHOTO_LIMITS.maxAspect) {
      warnings.push('A foto é muito estreita (panorâmica ou recortada). Uma foto 4:3 ou 3:4 mostra melhor o ambiente.');
    }
  }
  return { errors, warnings };
}

/** Mean luminance (0–255) and its standard deviation, from a small JPEG thumbnail. */
export function measureExposure(thumbnailBase64: string): { brightness: number; contrast: number } {
  const { data, width, height } = decode(base64ToBytes(thumbnailBase64), { useTArray: true, formatAsRGBA: true });
  const pixels = width * height;
  if (!pixels) return { brightness: 0, contrast: 0 };
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += y;
    sumSq += y * y;
  }
  const mean = sum / pixels;
  const variance = Math.max(0, sumSq / pixels - mean * mean);
  return { brightness: Math.round(mean), contrast: Math.round(Math.sqrt(variance)) };
}

export function exposureWarnings({ brightness, contrast }: { brightness: number; contrast: number }): string[] {
  const warnings: string[] = [];
  if (brightness < 45) warnings.push('A foto está muito escura. Acenda as luzes ou abra as cortinas e fotografe de novo.');
  else if (brightness < 70) warnings.push('A foto está um pouco escura; mais luz ajuda a IA a identificar cores e materiais.');
  if (brightness > 225) warnings.push('A foto está muito clara (estourada). Evite fotografar contra a luz da janela.');
  if (contrast < 18) warnings.push('A imagem tem pouco contraste e pode não mostrar bem o ambiente. Verifique se a lente está limpa e a foto, nítida.');
  return warnings;
}

export function buildPhotoCheck(exposure: { brightness: number; contrast: number }, basic: BasicValidation): PhotoCheck {
  return { ...exposure, warnings: [...basic.warnings, ...exposureWarnings(exposure)] };
}

export const PHOTO_TIPS = [
  'Fotografe de um canto do ambiente, na altura do peito, para mostrar o máximo do espaço.',
  'Mantenha o celular na horizontal e reto, sem inclinar para cima ou para baixo.',
  'Acenda as luzes e abra as cortinas; evite fotografar contra a janela.',
  'Inclua piso, paredes e teto e afaste objetos que estejam na frente da lente.',
];
