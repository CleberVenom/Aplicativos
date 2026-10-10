/** @jest-environment node */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { ProposalContentSchema, RefinementSchema, RoomAnalysisSchema } from '@/domain/design';
import { sampleAnalysis, sampleAnswers, samplePhoto } from '@/test-utils/fixtures';

import { createClaudeDesignAI, mapAnthropicError } from './claude';

const config = { apiKey: 'test-key', model: 'claude-opus-5-5', effort: 'medium' as const };

function fakeClient(result: { stop_reason?: string; text?: string } | Error) {
  const stream = jest.fn(() => ({
    finalMessage: async () => {
      if (result instanceof Error) throw result;
      return {
        stop_reason: result.stop_reason ?? 'end_turn',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'text', text: result.text ?? '' },
        ],
      };
    },
  }));
  return { client: { beta: { messages: { stream } } } as unknown as Anthropic, stream };
}

const analyze = (client: Anthropic, model = config.model) =>
  createClaudeDesignAI({ ...config, model }, client).analyzeRoom({ photo: samplePhoto(), extraPhotos: [], answers: sampleAnswers() });

describe('Claude design AI', () => {
  it('requires an API key', () => {
    expect(() => createClaudeDesignAI({ ...config, apiKey: null })).toThrow(expect.objectContaining({ code: 'not_configured' }));
  });

  it('converts every response schema to a structured-output format', () => {
    for (const schema of [RoomAnalysisSchema, ProposalContentSchema, RefinementSchema]) {
      expect(betaZodOutputFormat(schema).schema).toMatchObject({ type: 'object' });
    }
  });

  it('sends the photo with a structured-output request and validates the answer', async () => {
    const analysis = sampleAnalysis();
    const { client, stream } = fakeClient({ text: JSON.stringify(analysis) });
    await expect(analyze(client)).resolves.toEqual(analysis);

    const [params] = stream.mock.calls[0] as unknown as [Record<string, any>];
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema' } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    const content = params.messages[0].content;
    expect(content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: samplePhoto().base64 } });
    expect(content[content.length - 1].type).toBe('text');
  });

  it('omits the server-side fallback on models without it', async () => {
    const { client, stream } = fakeClient({ text: JSON.stringify(sampleAnalysis()) });
    await analyze(client, 'claude-sonnet-4-6');
    const [params] = stream.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(params).not.toHaveProperty('betas');
    expect(params).not.toHaveProperty('fallbacks');
  });

  it('maps refusals, truncation and malformed output', async () => {
    await expect(analyze(fakeClient({ stop_reason: 'refusal' }).client)).rejects.toMatchObject({ code: 'refused' });
    await expect(analyze(fakeClient({ stop_reason: 'max_tokens', text: '{"photo":' }).client)).rejects.toMatchObject({ code: 'incomplete' });
    await expect(analyze(fakeClient({ text: 'not json' }).client)).rejects.toMatchObject({ code: 'invalid_output' });
    await expect(analyze(fakeClient({ text: '{"summary":"only this"}' }).client)).rejects.toMatchObject({ code: 'invalid_output' });
  });

  it('maps SDK errors to safe messages', async () => {
    const auth = Anthropic.APIError.generate(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 'invalid x-api-key', new Headers());
    await expect(analyze(fakeClient(auth).client)).rejects.toMatchObject({ code: 'provider_auth' });

    const limited = Anthropic.APIError.generate(429, { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, 'slow down', new Headers());
    expect(mapAnthropicError(limited)).toMatchObject({ code: 'provider_rate_limited', retryable: true });

    const overloaded = Anthropic.APIError.generate(529, { type: 'error', error: { type: 'overloaded_error', message: 'busy' } }, 'busy', new Headers());
    expect(mapAnthropicError(overloaded)).toMatchObject({ code: 'provider_unavailable' });

    expect(mapAnthropicError(new Anthropic.APIConnectionError({ message: 'offline' }))).toMatchObject({ code: 'provider_unavailable' });
    expect(mapAnthropicError(new Anthropic.APIUserAbortError())).toMatchObject({ code: 'timeout' });
    expect(mapAnthropicError(new Error('boom'))).toMatchObject({ code: 'internal' });
  });
});
