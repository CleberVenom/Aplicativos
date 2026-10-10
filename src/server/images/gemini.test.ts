/** @jest-environment node */
import { samplePhoto } from '@/test-utils/fixtures';

import { closestAspectRatio, createGeminiImageProvider } from './gemini';

const config = { apiKey: 'test-gemini-key', model: 'gemini-test-image', size: '1K' as const };
const realFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const edit = () => createGeminiImageProvider(config).edit({ image: samplePhoto(), prompt: 'Redesign' });

describe('closestAspectRatio', () => {
  it('matches the photo framing', () => {
    expect(closestAspectRatio(4032, 3024)).toBe('4:3');
    expect(closestAspectRatio(1080, 1920)).toBe('9:16');
    expect(closestAspectRatio(1000, 1000)).toBe('1:1');
    expect(closestAspectRatio(3000, 2000)).toBe('3:2');
  });
});

describe('Gemini image provider', () => {
  it('requires an API key', () => {
    expect(() => createGeminiImageProvider({ ...config, apiKey: null })).toThrow(expect.objectContaining({ code: 'not_configured' }));
  });

  it('sends the photo and returns the generated image', async () => {
    fetchMock.mockResolvedValue(json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'image', data: 'R0VO', mime_type: 'image/png' }] }] }));
    const result = await edit();
    expect(result).toEqual({ base64: 'R0VO', mimeType: 'image/png', provider: 'gemini', model: 'gemini-test-image' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(init.headers['x-goog-api-key']).toBe('test-gemini-key');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: 'gemini-test-image', store: false, response_format: { type: 'image', aspect_ratio: '4:3', image_size: '1K' } });
    expect(body.input).toEqual([
      { type: 'text', text: 'Redesign' },
      { type: 'image', mime_type: 'image/jpeg', data: samplePhoto().base64 },
    ]);
  });

  it('maps provider errors to safe codes', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { details: [{ reason: 'API_KEY_INVALID' }] } }, 400));
    await expect(edit()).rejects.toMatchObject({ code: 'provider_auth' });
    fetchMock.mockResolvedValueOnce(json({}, 429));
    await expect(edit()).rejects.toMatchObject({ code: 'provider_rate_limited', retryable: true });
    fetchMock.mockResolvedValueOnce(json({}, 503));
    await expect(edit()).rejects.toMatchObject({ code: 'provider_unavailable' });
    fetchMock.mockResolvedValueOnce(json({}, 400));
    await expect(edit()).rejects.toMatchObject({ code: 'provider_rejected' });
  });

  it('treats a response without an image as declined', async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 'completed', steps: [{ content: [{ type: 'text', text: 'Não posso.' }] }] }));
    await expect(edit()).rejects.toMatchObject({ code: 'provider_rejected' });
    fetchMock.mockResolvedValueOnce(json({ status: 'failed' }));
    await expect(edit()).rejects.toMatchObject({ code: 'provider_rejected' });
  });

  it('maps network failures and timeouts', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(edit()).rejects.toMatchObject({ code: 'provider_unavailable' });
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(edit()).rejects.toMatchObject({ code: 'timeout' });
  });
});
