/** @jest-environment node */
import { samplePhoto } from '@/test-utils/fixtures';

import { createOpenAiImageProvider, openAiSize } from './openai';

const config = { apiKey: 'test-openai-key', model: 'gpt-image-test', quality: 'medium' as const };
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

describe('openAiSize', () => {
  it('keeps the aspect ratio within the API constraints', () => {
    expect(openAiSize(4000, 3000)).toBe('1536x1152');
    expect(openAiSize(3000, 4000)).toBe('1152x1536');
    for (const [w, h, long] of [[4000, 1000, 1536], [1000, 5000, 1536], [1000, 1000, 512], [1600, 1200, 1024]]) {
      const [sw, sh] = openAiSize(w, h, long).split('x').map(Number);
      expect(sw % 16).toBe(0);
      expect(sh % 16).toBe(0);
      expect(sw * sh).toBeGreaterThanOrEqual(655_360);
      expect(Math.max(sw / sh, sh / sw)).toBeLessThanOrEqual(3);
    }
  });
});

describe('OpenAI image provider', () => {
  it('requires an API key', () => {
    expect(() => createOpenAiImageProvider({ ...config, apiKey: null })).toThrow(expect.objectContaining({ code: 'not_configured' }));
  });

  it('sends a multipart edit request and returns the image', async () => {
    fetchMock.mockResolvedValue(json({ data: [{ b64_json: 'T1VU' }] }));
    const result = await createOpenAiImageProvider(config).edit({ image: samplePhoto(), prompt: 'Redesign' });
    expect(result).toEqual({ base64: 'T1VU', mimeType: 'image/jpeg', provider: 'openai', model: 'gpt-image-test' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/images/edits');
    expect(init.headers.Authorization).toBe('Bearer test-openai-key');
    const form = init.body as FormData;
    expect(form.get('model')).toBe('gpt-image-test');
    expect(form.get('prompt')).toBe('Redesign');
    expect(form.get('size')).toBe('1536x1152');
    expect(form.get('quality')).toBe('medium');
    expect(form.get('output_format')).toBe('jpeg');
    expect(form.get('input_fidelity')).toBeNull();
    const image = form.get('image') as File;
    expect(image.type).toBe('image/jpeg');
    expect(image.name).toBe('room.jpg');
  });

  it('uses the fixed sizes and high input fidelity of gpt-image-1.x', async () => {
    fetchMock.mockResolvedValue(json({ data: [{ b64_json: 'T1VU' }] }));
    await createOpenAiImageProvider({ ...config, model: 'gpt-image-1.5' }).edit({ image: samplePhoto(), prompt: 'Redesign' });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('size')).toBe('1536x1024');
    expect(form.get('input_fidelity')).toBe('high');
  });

  it('omits input fidelity on gpt-image-1-mini', async () => {
    fetchMock.mockResolvedValue(json({ data: [{ b64_json: 'T1VU' }] }));
    await createOpenAiImageProvider({ ...config, model: 'gpt-image-1-mini' }).edit({ image: samplePhoto(), prompt: 'Redesign' });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('size')).toBe('1536x1024');
    expect(form.get('input_fidelity')).toBeNull();
  });

  it('maps provider errors', async () => {
    const provider = createOpenAiImageProvider(config);
    const run = () => provider.edit({ image: samplePhoto(), prompt: 'Redesign' });
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Incorrect API key' } }, 401));
    await expect(run()).rejects.toMatchObject({ code: 'provider_auth' });
    fetchMock.mockResolvedValueOnce(json({}, 402));
    await expect(run()).rejects.toMatchObject({ code: 'provider_billing' });
    fetchMock.mockResolvedValueOnce(json({ data: [] }));
    await expect(run()).rejects.toMatchObject({ code: 'provider_rejected' });
  });
});
