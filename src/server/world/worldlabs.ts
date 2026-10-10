import { APP_NAME } from '@/constants';
import type { ImagePayload, WorldStatusResponse } from '@/domain/api';

import type { ServerConfig } from '../config';
import { Errors } from '../errors';
import { providerFetch, providerHttpError, readJson } from '../images/http';

const BASE = 'https://api.worldlabs.ai/marble/v1';
const NAME = '3D (World Labs)';

/** Generation/reconstruction of a navigable 3D world from an image. */
export interface WorldProvider {
  readonly provider: string;
  readonly model: string;
  start(input: { image: ImagePayload; prompt: string | null; signal?: AbortSignal }): Promise<{ operationId: string }>;
  status(operationId: string, signal?: AbortSignal): Promise<WorldStatusResponse>;
}

type WorldJson = {
  world_id?: string;
  id?: string;
  world_marble_url?: string;
  assets?: { thumbnail_url?: string | null } | null;
};

type OperationJson = {
  operation_id?: string;
  done?: boolean;
  error?: { code?: number | null; message?: string | null } | null;
  metadata?: { progress?: { status?: string; description?: string } | string | number; world_id?: string } | null;
  response?: WorldJson | null;
};

function progressText(metadata: OperationJson['metadata']): string | null {
  const p = metadata?.progress;
  if (p == null) return null;
  if (typeof p === 'object') return p.description ?? p.status ?? null;
  return String(p);
}

/**
 * World Labs "Marble" World API (https://docs.worldlabs.ai/api). Generation is
 * asynchronous (about 5 minutes for a standard world): start returns an operation
 * id that the app polls.
 */
export function createWorldLabsProvider(config: ServerConfig['worldlabs']): WorldProvider {
  if (!config.apiKey) throw Errors.notConfigured('3D imersivo (World Labs)');
  const headers = { 'WLT-Api-Key': config.apiKey, 'Content-Type': 'application/json' };

  async function getWorld(worldId: string, signal?: AbortSignal): Promise<WorldJson | null> {
    const response = await providerFetch(NAME, `${BASE}/worlds/${encodeURIComponent(worldId)}`, { headers, signal });
    if (!response.ok) return null;
    const json = (await readJson(response, NAME)) as { world?: WorldJson } & WorldJson;
    return json.world ?? json;
  }

  return {
    provider: 'worldlabs',
    model: config.model,

    async start({ image, prompt, signal }) {
      const extension = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
      const response = await providerFetch(NAME, `${BASE}/worlds:generate`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          display_name: `${APP_NAME} – proposta`,
          model: config.model,
          world_prompt: {
            type: 'image',
            image_prompt: { source: 'data_base64', data_base64: image.base64, extension },
            ...(prompt ? { text_prompt: prompt } : {}),
          },
          // Not listed publicly; when linkAccess is on, whoever has the link can view it.
          permission: { public: false, allow_id_access: config.linkAccess },
        }),
      });
      if (!response.ok) throw providerHttpError(NAME, response.status);
      const json = (await readJson(response, NAME)) as OperationJson;
      if (!json.operation_id) throw Errors.providerRejected(NAME);
      return { operationId: json.operation_id };
    },

    async status(operationId, signal) {
      const response = await providerFetch(NAME, `${BASE}/operations/${encodeURIComponent(operationId)}`, { headers, signal });
      if (!response.ok) throw providerHttpError(NAME, response.status);
      const op = (await readJson(response, NAME)) as OperationJson;

      if (!op.done) {
        return { operationId, status: 'running', progress: progressText(op.metadata), worldId: null, viewerUrl: null, thumbnailUrl: null, error: null };
      }
      if (op.error) {
        return {
          operationId,
          status: 'failed',
          progress: null,
          worldId: null,
          viewerUrl: null,
          thumbnailUrl: null,
          error: 'A geração do mundo 3D falhou no provedor. Tente novamente com outra imagem.',
        };
      }
      const worldId = op.response?.world_id ?? op.response?.id ?? op.metadata?.world_id ?? null;
      let world = op.response ?? null;
      if (worldId && (!world?.world_marble_url || !world.assets?.thumbnail_url)) {
        world = (await getWorld(worldId, signal)) ?? world;
      }
      return {
        operationId,
        status: 'succeeded',
        progress: null,
        worldId,
        viewerUrl: world?.world_marble_url ?? (worldId ? `https://marble.worldlabs.ai/world/${worldId}` : null),
        thumbnailUrl: world?.assets?.thumbnail_url ?? null,
        error: null,
      };
    },
  };
}
