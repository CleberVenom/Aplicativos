/** @jest-environment node */
import type { StreamEvent } from '@/domain/api';

import { getApiBaseUrl, postJson, postStream, setFetchImplementation } from './api-client';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

const encoder = new TextEncoder();

function streamResponse(chunks: string[], status = 200) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'application/x-ndjson' } });
}

async function collect(chunks: string[]) {
  setFetchImplementation(async () => streamResponse(chunks));
  const received: StreamEvent[] = [];
  await postStream('/api/analyze', {}, (e) => received.push(e));
  return received;
}

const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test/';
});

describe('api client', () => {
  it('uses the configured server without trailing slashes', () => {
    expect(getApiBaseUrl()).toBe('https://api.example.test');
    process.env.EXPO_PUBLIC_API_URL = '';
    expect(getApiBaseUrl()).toBeNull();
  });

  it('fails clearly when no server is configured', async () => {
    process.env.EXPO_PUBLIC_API_URL = '';
    await expect(postJson('/api/world', {})).rejects.toMatchObject({ code: 'no_server', retryable: false });
  });

  it('parses NDJSON split across chunks and hides heartbeats', async () => {
    const events = await collect(['{"type":"progress","stage":"analysis","message":"…"}\n{"type":"heart', 'beat"}\n{"type":"do', 'ne"}']);
    expect(events).toEqual([{ type: 'progress', stage: 'analysis', message: '…' }, { type: 'done' }]);
  });

  it('rejects with the server error carried by the stream', async () => {
    await expect(collect(['{"type":"progress","stage":"a","message":"m"}\n', '{"type":"error","error":{"code":"provider_auth","message":"Chave recusada.","retryable":false}}\n'])).rejects.toMatchObject({
      name: 'ApiError',
      code: 'provider_auth',
      message: 'Chave recusada.',
    });
  });

  it('turns HTTP errors into ApiErrors', async () => {
    setFetchImplementation(async () => Response.json({ error: { code: 'rate_limited', message: 'Aguarde.', retryable: true } }, { status: 429 }));
    await expect(postStream('/api/analyze', {}, () => {})).rejects.toMatchObject({ code: 'rate_limited', status: 429, retryable: true });

    setFetchImplementation(async () => new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(postJson('/api/world', {})).rejects.toMatchObject({ code: 'http_error', status: 502, retryable: true });
  });

  it('reports network failures', async () => {
    setFetchImplementation(async () => Promise.reject(new TypeError('Network request failed')));
    await expect(postStream('/api/analyze', {}, () => {})).rejects.toMatchObject({ code: 'network', retryable: true });
  });

  it('times out when the stream goes silent', async () => {
    setFetchImplementation(async (_url, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init.signal?.addEventListener('abort', () => controller.error(abortError()));
        },
      });
      return new Response(body);
    });
    await expect(postStream('/api/analyze', {}, () => {}, { idleTimeoutMs: 30 })).rejects.toMatchObject({ code: 'timeout' });
  });

  it('distinguishes a user cancellation', async () => {
    setFetchImplementation(
      (_url, init) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(abortError()))),
    );
    const controller = new AbortController();
    const pending = postStream('/api/analyze', {}, () => {}, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
  });
});
