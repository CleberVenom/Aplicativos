/** @jest-environment node */
import type { StreamEvent } from '@/domain/api';
import type { ProposalContent, RoomAnalysis } from '@/domain/design';
import { sampleAnalysis, sampleAnswers, samplePhoto, sampleProposal } from '@/test-utils/fixtures';

import type { DesignAI } from './ai/claude';
import { Errors } from './errors';
import { handleAnalyze, handleHealth, handleRender, handleWorldStatus, type Deps } from './handlers';
import type { ImageEditProvider } from './images/types';
import type { Providers } from './providers';
import { RateLimiter } from './rate-limit';

const notConfigured = (what: string) => () => {
  throw Errors.notConfigured(what);
};

function makeDeps(providers: Partial<Providers> = {}, perWindow = 100): Deps {
  const limiter = () => new RateLimiter(perWindow, 60_000);
  return {
    providers: {
      design: notConfigured('análise por IA'),
      image: notConfigured('geração de imagens'),
      world: notConfigured('3D'),
      health: () => ({
        ok: true,
        version: 'test',
        analysis: { available: false, provider: null, model: null },
        image: { available: false, provider: null, model: null },
        world: { available: false, provider: null, model: null },
      }),
      ...providers,
    },
    limiters: { analyze: limiter(), refine: limiter(), render: limiter(), world: limiter() },
  };
}

function fakeDesign(overrides: Partial<DesignAI> = {}): DesignAI {
  return {
    provider: 'test',
    model: 'test-model',
    analyzeRoom: jest.fn(async (): Promise<RoomAnalysis> => sampleAnalysis()),
    elaborateProposal: jest.fn(async (): Promise<ProposalContent> => sampleProposal()),
    refineProposal: jest.fn(),
    ...overrides,
  };
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  });
}

async function events(response: Response): Promise<StreamEvent[]> {
  const text = await response.text();
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamEvent);
}

const analyzeBody = () => ({ photo: samplePhoto(), extraPhotos: [], answers: sampleAnswers() });

let errorLog: jest.SpyInstance;
beforeEach(() => {
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

describe('health', () => {
  it('reports provider availability without caching', async () => {
    const response = handleHealth(makeDeps());
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ ok: true, analysis: { available: false } });
  });
});

describe('analyze', () => {
  it('rejects invalid bodies before touching any provider', async () => {
    const design = jest.fn();
    const response = await handleAnalyze(post('/api/analyze', { photo: 'x' }), makeDeps({ design }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.objectContaining({ code: 'bad_request' }) });
    expect(design).not.toHaveBeenCalled();
  });

  it('rejects oversized uploads using content-length', async () => {
    const response = await handleAnalyze(post('/api/analyze', analyzeBody(), { 'content-length': String(40 * 1024 * 1024) }), makeDeps());
    expect(response.status).toBe(400);
  });

  it('explains when the AI is not configured', async () => {
    const response = await handleAnalyze(post('/api/analyze', analyzeBody()), makeDeps());
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('not_configured');
  });

  it('streams the analysis and three proposals', async () => {
    const design = fakeDesign();
    const response = await handleAnalyze(post('/api/analyze', analyzeBody()), makeDeps({ design: () => design }));
    expect(response.headers.get('Content-Type')).toMatch(/application\/x-ndjson/);
    const list = await events(response);
    const types = list.map((e) => e.type);
    expect(types[0]).toBe('progress');
    expect(types).toContain('analysis');
    expect(list.filter((e) => e.type === 'proposal').map((e) => (e.type === 'proposal' ? e.key : null)).sort()).toEqual(['A', 'B', 'C']);
    expect(types[types.length - 1]).toBe('done');
    expect(design.elaborateProposal).toHaveBeenCalledTimes(3);
  });

  it('reports a failed proposal without losing the others or logging the photo', async () => {
    const photo = samplePhoto();
    const design = fakeDesign({
      elaborateProposal: jest.fn(async ({ index }: { index: number }) => {
        if (index === 1) throw Errors.providerRateLimited('de IA');
        return sampleProposal();
      }) as DesignAI['elaborateProposal'],
    });
    const list = await events(await handleAnalyze(post('/api/analyze', { ...analyzeBody(), photo }), makeDeps({ design: () => design })));
    const failed = list.find((e) => e.type === 'proposal_error');
    expect(failed).toMatchObject({ key: 'B', error: { code: 'provider_rate_limited', retryable: true } });
    expect(list.filter((e) => e.type === 'proposal')).toHaveLength(2);
    expect(list[list.length - 1].type).toBe('done');
    const logged = errorLog.mock.calls.flat().join(' ');
    expect(logged).toContain('provider_rate_limited');
    expect(logged).not.toContain(photo.base64);
  });

  it('turns a failed analysis into an error event', async () => {
    const design = fakeDesign({ analyzeRoom: jest.fn(async () => Promise.reject(Errors.refused())) });
    const list = await events(await handleAnalyze(post('/api/analyze', analyzeBody()), makeDeps({ design: () => design })));
    expect(list[list.length - 1]).toEqual({ type: 'error', error: expect.objectContaining({ code: 'refused' }) });
    expect(list.some((e) => e.type === 'done')).toBe(false);
  });

  it('rate limits per client', async () => {
    const deps = makeDeps({ design: () => fakeDesign() }, 1);
    expect((await handleAnalyze(post('/api/analyze', analyzeBody()), deps)).status).toBe(200);
    const limited = await handleAnalyze(post('/api/analyze', analyzeBody()), deps);
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toMatchObject({ code: 'rate_limited', retryable: true });
    const other = await handleAnalyze(post('/api/analyze', analyzeBody(), { 'x-forwarded-for': '198.51.100.1' }), deps);
    expect(other.status).toBe(200);
  });
});

describe('render', () => {
  it('builds the edit prompt and returns the image', async () => {
    const edit = jest.fn(async () => ({ base64: 'aW1n', mimeType: 'image/jpeg', provider: 'fake', model: 'fake-1' }));
    const image: ImageEditProvider = { provider: 'fake', model: 'fake-1', edit };
    const body = {
      image: samplePhoto(),
      mode: 'proposal',
      proposal: { name: 'Calma', style: 'Japandi', imagePrompt: 'Add a linen sofa.', palette: [{ hex: '#EEE5DA', name: 'Linho' }], keep: ['Sofá'] },
      instruction: null,
    };
    const list = await events(await handleRender(post('/api/render', body), makeDeps({ image: () => image })));
    expect(list.find((e) => e.type === 'image')).toMatchObject({ image: { base64: 'aW1n' } });
    const prompt = (edit.mock.calls[0] as unknown as [{ prompt: string }])[0].prompt;
    expect(prompt).toMatch(/Preserve exactly/);
    expect(prompt).toMatch(/Sofá/);
  });
});

describe('world status', () => {
  it('validates the operation id', async () => {
    const response = await handleWorldStatus(new Request('http://localhost/api/world?operationId=../../etc'), makeDeps());
    expect(response.status).toBe(400);
  });
});
