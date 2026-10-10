/** @jest-environment node */
import { Errors } from './errors';
import { ndjsonResponse } from './ndjson';

const lines = async (response: Response) => (await response.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l));

let errorLog: jest.SpyInstance;
beforeEach(() => {
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

describe('ndjsonResponse', () => {
  it('sends heartbeats while work is in progress', async () => {
    const response = ndjsonResponse(
      'test',
      async (send) => {
        await new Promise((resolve) => setTimeout(resolve, 60));
        send({ type: 'done' });
      },
      { heartbeatMs: 10 },
    );
    const events = await lines(response);
    expect(events.filter((e) => e.type === 'heartbeat').length).toBeGreaterThan(0);
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('maps failures to a safe error event', async () => {
    const appError = await lines(ndjsonResponse('test', async () => Promise.reject(Errors.providerAuth('X'))));
    expect(appError).toEqual([{ type: 'error', error: expect.objectContaining({ code: 'provider_auth' }) }]);

    const unexpected = await lines(ndjsonResponse('test', async () => Promise.reject(new Error('secret detail sk-123'))));
    expect(unexpected[0].error).toMatchObject({ code: 'internal' });
    expect(JSON.stringify(unexpected)).not.toContain('sk-123');

    const aborted = await lines(ndjsonResponse('test', async () => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    expect(aborted[0].error).toMatchObject({ code: 'timeout' });
  });

  it('aborts the work when the client disconnects', async () => {
    let signal: AbortSignal | undefined;
    const response = ndjsonResponse('test', (_send, s) => {
      signal = s;
      return new Promise((_resolve, reject) => s.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    });
    await response.body!.cancel();
    expect(signal?.aborted).toBe(true);
  });
});
