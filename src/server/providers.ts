import type { HealthResponse } from '@/domain/api';

import { createClaudeDesignAI, type DesignAI } from './ai/claude';
import { getConfig, type ServerConfig } from './config';
import { Errors } from './errors';
import { createGeminiImageProvider } from './images/gemini';
import { createOpenAiImageProvider } from './images/openai';
import type { ImageEditProvider } from './images/types';
import { createWorldLabsProvider, type WorldProvider } from './world/worldlabs';

/**
 * Single place that decides which vendor implements each capability. Swapping a
 * provider means adding an adapter that satisfies the interface and selecting it here.
 */
export type Providers = {
  design: () => DesignAI;
  image: () => ImageEditProvider;
  world: () => WorldProvider;
  health: () => HealthResponse;
};

export const APP_VERSION = '1.0.0';

export function createProviders(config: ServerConfig = getConfig()): Providers {
  return {
    design: () => createClaudeDesignAI(config.anthropic),
    image: () => {
      if (config.image.provider === 'gemini') return createGeminiImageProvider(config.image.gemini);
      if (config.image.provider === 'openai') return createOpenAiImageProvider(config.image.openai);
      throw Errors.notConfigured('geração de imagens');
    },
    world: () => createWorldLabsProvider(config.worldlabs),
    health: () => ({
      ok: true,
      version: APP_VERSION,
      analysis: {
        available: !!config.anthropic.apiKey,
        provider: config.anthropic.apiKey ? 'anthropic' : null,
        model: config.anthropic.apiKey ? config.anthropic.model : null,
      },
      image: {
        available: !!config.image.provider,
        provider: config.image.provider,
        model: config.image.provider ? config.image[config.image.provider].model : null,
      },
      world: {
        available: !!config.worldlabs.apiKey,
        provider: config.worldlabs.apiKey ? 'worldlabs' : null,
        model: config.worldlabs.apiKey ? config.worldlabs.model : null,
      },
    }),
  };
}
