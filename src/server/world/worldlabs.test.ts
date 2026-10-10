/** @jest-environment node */
import { samplePhoto } from '@/test-utils/fixtures';

import { createWorldLabsProvider } from './worldlabs';

const config = { apiKey: 'test-wl-key', model: 'marble-test', linkAccess: true };
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

describe('World Labs provider', () => {
  it('requires an API key', () => {
    expect(() => createWorldLabsProvider({ ...config, apiKey: null })).toThrow(expect.objectContaining({ code: 'not_configured' }));
  });

  it('starts a private generation from the image', async () => {
    fetchMock.mockResolvedValue(json({ operation_id: 'op_123', done: false }));
    const { operationId } = await createWorldLabsProvider(config).start({ image: samplePhoto(), prompt: 'Cozy japandi living room' });
    expect(operationId).toBe('op_123');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.worldlabs.ai/marble/v1/worlds:generate');
    expect(init.headers['WLT-Api-Key']).toBe('test-wl-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('marble-test');
    expect(body.permission).toEqual({ public: false, allow_id_access: true });
    expect(body.world_prompt).toEqual({
      type: 'image',
      image_prompt: { source: 'data_base64', data_base64: samplePhoto().base64, extension: 'jpg' },
      text_prompt: 'Cozy japandi living room',
    });
  });

  it('rejects a start response without an operation id', async () => {
    fetchMock.mockResolvedValue(json({}));
    await expect(createWorldLabsProvider(config).start({ image: samplePhoto(), prompt: null })).rejects.toMatchObject({ code: 'provider_rejected' });
  });

  it('reports progress, failure and success', async () => {
    const provider = createWorldLabsProvider(config);

    fetchMock.mockResolvedValueOnce(json({ operation_id: 'op_1', done: false, metadata: { progress: { status: 'IN_PROGRESS', description: 'Gerando' } } }));
    expect(await provider.status('op_1')).toMatchObject({ status: 'running', progress: 'Gerando' });

    fetchMock.mockResolvedValueOnce(json({ operation_id: 'op_1', done: true, error: { code: 500, message: 'internal' } }));
    expect(await provider.status('op_1')).toMatchObject({ status: 'failed', viewerUrl: null });

    fetchMock
      .mockResolvedValueOnce(json({ operation_id: 'op_1', done: true, response: { world_id: 'w_9' } }))
      .mockResolvedValueOnce(json({ world: { world_id: 'w_9', world_marble_url: 'https://marble.worldlabs.ai/world/w_9', assets: { thumbnail_url: 'https://cdn.example/t.jpg' } } }));
    expect(await provider.status('op_1')).toMatchObject({
      status: 'succeeded',
      worldId: 'w_9',
      viewerUrl: 'https://marble.worldlabs.ai/world/w_9',
      thumbnailUrl: 'https://cdn.example/t.jpg',
    });
    expect(fetchMock.mock.calls[3][0]).toBe('https://api.worldlabs.ai/marble/v1/worlds/w_9');
  });

  it('falls back to the public viewer link when the world details are unavailable', async () => {
    fetchMock.mockResolvedValueOnce(json({ operation_id: 'op_2', done: true, response: { world_id: 'w_10' } })).mockResolvedValueOnce(json({}, 404));
    expect(await createWorldLabsProvider(config).status('op_2')).toMatchObject({ viewerUrl: 'https://marble.worldlabs.ai/world/w_10', thumbnailUrl: null });
  });

  it('maps HTTP errors', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401));
    await expect(createWorldLabsProvider(config).status('op_3')).rejects.toMatchObject({ code: 'provider_auth' });
  });
});
