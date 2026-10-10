import { base64ToBytes } from '@/utils/base64';

import type { ServerConfig } from '../config';
import { Errors } from '../errors';
import { providerFetch, providerHttpError, readJson } from './http';
import type { ImageEditProvider } from './types';

const ENDPOINT = 'https://api.openai.com/v1/images/edits';
const NAME = 'de imagens (OpenAI)';

/**
 * GPT Image 2+ accepts any WIDTHxHEIGHT divisible by 16 with an aspect ratio between
 * 1:3 and 3:1 and at least 655,360 pixels. Keeps the photo's aspect ratio.
 */
export function openAiSize(width: number, height: number, longSide = 1536): string {
  const ratio = Math.min(3, Math.max(1 / 3, width / height));
  const round16 = (v: number) => Math.max(16, Math.round(v / 16) * 16);
  let w = ratio >= 1 ? longSide : round16(longSide * ratio);
  let h = ratio >= 1 ? round16(longSide / ratio) : longSide;
  while (w * h < 655_360) {
    w += 16;
    h = round16(w / ratio);
  }
  return `${w}x${h}`;
}

type EditResponse = { data?: { b64_json?: string }[] };

/** OpenAI GPT Image editing (POST /v1/images/edits, multipart). */
export function createOpenAiImageProvider(config: ServerConfig['image']['openai']): ImageEditProvider {
  if (!config.apiKey) throw Errors.notConfigured('imagens (OpenAI)');
  const legacyModel = /^gpt-image-1/.test(config.model);
  // High input fidelity exists on gpt-image-1 and gpt-image-1.5 (not on -mini or 2.x).
  const highFidelity = /^gpt-image-1(\.5)?($|-\d)/.test(config.model);
  return {
    provider: 'openai',
    model: config.model,
    async edit({ image, prompt, signal }) {
      const form = new FormData();
      form.append('model', config.model);
      form.append('prompt', prompt);
      const extension = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
      form.append('image', new Blob([base64ToBytes(image.base64) as BlobPart], { type: image.mimeType }), `room.${extension}`);
      form.append('size', legacyModel ? (image.width >= image.height ? '1536x1024' : '1024x1536') : openAiSize(image.width, image.height));
      form.append('quality', config.quality);
      form.append('output_format', 'jpeg');
      form.append('output_compression', '90');
      if (highFidelity) form.append('input_fidelity', 'high');

      const response = await providerFetch(NAME, ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: form,
        signal,
      });
      if (!response.ok) throw providerHttpError(NAME, response.status);
      const json = (await readJson(response, NAME)) as EditResponse;
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw Errors.providerRejected(NAME);
      return { base64: b64, mimeType: 'image/jpeg', provider: 'openai', model: config.model };
    },
  };
}
