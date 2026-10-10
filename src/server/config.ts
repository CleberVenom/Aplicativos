/**
 * Server configuration, read from environment variables at call time (never bundled
 * into the app). See `.env.example` for documentation of every variable.
 */
export type ImageProviderId = 'gemini' | 'openai';

export type ServerConfig = {
  anthropic: { apiKey: string | null; model: string; effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max' };
  image: {
    provider: ImageProviderId | null;
    gemini: { apiKey: string | null; model: string; size: '1K' | '2K' | '4K' };
    openai: { apiKey: string | null; model: string; quality: 'low' | 'medium' | 'high' };
  };
  worldlabs: { apiKey: string | null; model: string; linkAccess: boolean };
  rateLimitPerHour: number;
};

const read = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : null;
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function getConfig(): ServerConfig {
  const geminiKey = read('GEMINI_API_KEY');
  const openaiKey = read('OPENAI_API_KEY');
  const explicit = read('IMAGE_PROVIDER');

  let provider: ImageProviderId | null = null;
  if (explicit === 'gemini' || explicit === 'openai') provider = explicit;
  else if (explicit !== 'none') provider = geminiKey ? 'gemini' : openaiKey ? 'openai' : null;
  if (provider === 'gemini' && !geminiKey) provider = null;
  if (provider === 'openai' && !openaiKey) provider = null;

  const limit = Number(read('RATE_LIMIT_PER_HOUR') ?? 60);

  return {
    anthropic: {
      apiKey: read('ANTHROPIC_API_KEY'),
      model: read('ANTHROPIC_MODEL') ?? 'claude-opus-5-5',
      effort: oneOf(read('ANTHROPIC_EFFORT'), ['low', 'medium', 'high', 'xhigh', 'max'] as const, 'medium'),
    },
    image: {
      provider,
      gemini: {
        apiKey: geminiKey,
        model: read('GEMINI_IMAGE_MODEL') ?? 'gemini-nano-banana-2.1',
        size: oneOf(read('GEMINI_IMAGE_SIZE'), ['1K', '2K', '4K'] as const, '1K'),
      },
      openai: {
        apiKey: openaiKey,
        model: read('OPENAI_IMAGE_MODEL') ?? 'gpt-image-2.5-sunburst',
        quality: oneOf(read('OPENAI_IMAGE_QUALITY'), ['low', 'medium', 'high'] as const, 'medium'),
      },
    },
    worldlabs: {
      apiKey: read('WORLDLABS_API_KEY'),
      model: read('WORLDLABS_MODEL') ?? 'marble-1.1',
      linkAccess: read('WORLDLABS_LINK_ACCESS') !== 'false',
    },
    rateLimitPerHour: Number.isFinite(limit) && limit > 0 ? limit : 60,
  };
}
