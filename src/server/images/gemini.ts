import type { ServerConfig } from '../config';
import { Errors } from '../errors';
import { providerFetch, providerHttpError, readJson } from './http';
import type { ImageEditProvider } from './types';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const NAME = 'de imagens (Google Gemini)';

const ASPECTS = [
  ['1:1', 1],
  ['4:3', 4 / 3],
  ['3:4', 3 / 4],
  ['3:2', 3 / 2],
  ['2:3', 2 / 3],
  ['16:9', 16 / 9],
  ['9:16', 9 / 16],
  ['5:4', 5 / 4],
  ['4:5', 4 / 5],
] as const;

/** Keeps the output framing as close as possible to the photo. */
export function closestAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  let best: (typeof ASPECTS)[number] = ASPECTS[0];
  for (const aspect of ASPECTS) {
    if (Math.abs(Math.log(aspect[1] / ratio)) < Math.abs(Math.log(best[1] / ratio))) best = aspect;
  }
  return best[0];
}

type InteractionResponse = {
  status?: string;
  steps?: { type?: string; content?: { type?: string; data?: string; mime_type?: string }[] }[];
  errors?: { code?: string; message?: string }[];
};

/**
 * Google Gemini image editing through the Interactions API
 * (https://ai.google.dev/gemini-api/docs/image-generation).
 */
export function createGeminiImageProvider(config: ServerConfig['image']['gemini']): ImageEditProvider {
  if (!config.apiKey) throw Errors.notConfigured('imagens (Google Gemini)');
  return {
    provider: 'gemini',
    model: config.model,
    async edit({ image, prompt, signal }) {
      const response = await providerFetch(NAME, ENDPOINT, {
        method: 'POST',
        headers: { 'x-goog-api-key': config.apiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          input: [
            { type: 'text', text: prompt },
            { type: 'image', mime_type: image.mimeType, data: image.base64 },
          ],
          response_format: {
            type: 'image',
            aspect_ratio: closestAspectRatio(image.width, image.height),
            image_size: config.size,
            mime_type: 'image/jpeg',
          },
          // Do not keep the user's photo stored on the provider side.
          store: false,
        }),
        signal,
      });
      if (!response.ok) {
        // Google reports an invalid key as 400 INVALID_ARGUMENT with reason API_KEY_INVALID.
        const detail = await response.text().catch(() => '');
        if (/API_KEY_INVALID|API key not valid/i.test(detail)) throw Errors.providerAuth(NAME);
        throw providerHttpError(NAME, response.status);
      }

      const json = (await readJson(response, NAME)) as InteractionResponse;
      if (json.status && json.status !== 'completed') throw Errors.providerRejected(NAME);
      for (const step of json.steps ?? []) {
        for (const block of step.content ?? []) {
          if (block.type === 'image' && block.data) {
            return { base64: block.data, mimeType: block.mime_type ?? 'image/jpeg', provider: 'gemini', model: config.model };
          }
        }
      }
      // A completed interaction without an image usually means the request was declined.
      throw Errors.providerRejected(NAME);
    },
  };
}
