import { fetch as expoFetch } from 'expo/fetch';

import type { ApiErrorBody, HealthResponse, StreamEvent } from '@/domain/api';

/**
 * HTTP client for the app's own server (Expo Router API routes).
 * - Development: the dev server that serves the app also serves /api (works in Expo Go).
 * - Production: set EXPO_PUBLIC_API_URL (or the expo-router `origin`) to the deployed server.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(body: Partial<ApiErrorBody> | null | undefined, status?: number) {
    return new ApiError(
      body?.code ?? 'http_error',
      body?.message ?? 'O servidor respondeu com um erro inesperado.',
      body?.retryable ?? (status ? status >= 500 || status === 429 : true),
      status,
    );
  }
}

export const NetworkErrors = {
  offline: () =>
    new ApiError('network', 'Não foi possível falar com o servidor. Verifique sua conexão e se o servidor está ativo.', true),
  timeout: () => new ApiError('timeout', 'O servidor demorou demais para responder. Tente novamente.', true),
  noServer: () => new ApiError('no_server', 'Nenhum servidor de IA está configurado para este app.', false),
};

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

let fetchImpl: FetchLike = expoFetch as unknown as FetchLike;

/** Test hook. */
export function setFetchImplementation(fn: FetchLike) {
  fetchImpl = fn;
}

export function getApiBaseUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  // On native, Expo Router points window.location at the dev server (or the configured origin).
  const origin = typeof window !== 'undefined' ? window.location?.origin : undefined;
  return origin && origin !== 'null' ? origin.replace(/\/+$/, '') : null;
}

function url(path: string) {
  const base = getApiBaseUrl();
  if (!base) throw NetworkErrors.noServer();
  return `${base}${path}`;
}

function linkSignal(outer: AbortSignal | undefined, controller: AbortController) {
  if (!outer) return;
  if (outer.aborted) controller.abort();
  else outer.addEventListener('abort', () => controller.abort(), { once: true });
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  const json = (await response.json().catch(() => null)) as { error?: ApiErrorBody } | null;
  return ApiError.from(json?.error, response.status);
}

function wrapNetworkError(error: unknown, timedOut: boolean, outer?: AbortSignal): never {
  if (error instanceof ApiError) throw error;
  if (timedOut) throw NetworkErrors.timeout();
  if (outer?.aborted) throw new ApiError('cancelled', 'Operação cancelada.', false);
  throw NetworkErrors.offline();
}

export async function getJson<T>(path: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  linkSignal(options.signal, controller);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 15_000);
  try {
    const response = await fetchImpl(url(path), { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw await errorFromResponse(response);
    return (await response.json()) as T;
  } catch (error) {
    wrapNetworkError(error, timedOut, options.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function postJson<T>(path: string, body: unknown, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  linkSignal(options.signal, controller);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 60_000);
  try {
    const response = await fetchImpl(url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw await errorFromResponse(response);
    return (await response.json()) as T;
  } catch (error) {
    wrapNetworkError(error, timedOut, options.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POSTs JSON and consumes a newline-delimited JSON stream of events. The server sends
 * heartbeats every ~10 s, so silence for `idleTimeoutMs` means the connection is dead.
 * An `error` event rejects the promise with an ApiError.
 */
export async function postStream(
  path: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  options: { signal?: AbortSignal; idleTimeoutMs?: number } = {},
): Promise<void> {
  const controller = new AbortController();
  linkSignal(options.signal, controller);
  const idleMs = options.idleTimeoutMs ?? 90_000;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const armIdle = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, idleMs);
  };

  const handleLine = (line: string) => {
    let event: StreamEvent;
    try {
      event = JSON.parse(line) as StreamEvent;
    } catch {
      return; // ignore partial/garbage lines
    }
    if (event.type === 'error') throw ApiError.from(event.error);
    if (event.type !== 'heartbeat') onEvent(event);
  };

  armIdle();
  try {
    const response = await fetchImpl(url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw await errorFromResponse(response);

    const decoder = new TextDecoder();
    let buffer = '';
    const flush = (final: boolean) => {
      let index: number;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (line) handleLine(line);
      }
      if (final && buffer.trim()) {
        handleLine(buffer.trim());
        buffer = '';
      }
    };

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        armIdle();
        buffer += decoder.decode(value, { stream: true });
        flush(false);
      }
      buffer += decoder.decode();
    } else {
      buffer = await response.text();
    }
    flush(true);
  } catch (error) {
    wrapNetworkError(error, timedOut, options.signal);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function fetchHealth(signal?: AbortSignal) {
  return getJson<HealthResponse>('/api/health', { signal, timeoutMs: 8_000 });
}
