import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';

import type { ImagePayload } from '@/domain/api';
import type { Answers } from '@/domain/answers';
import {
  ProposalContentSchema,
  RefinementSchema,
  RoomAnalysisSchema,
  type ProposalContent,
  type Refinement,
  type RoomAnalysis,
} from '@/domain/design';

import type { ServerConfig } from '../config';
import { AppError, Errors } from '../errors';
import { analysisUserText, ANALYSIS_SYSTEM, PROPOSAL_SYSTEM, proposalUserText, REFINE_SYSTEM, refineUserText } from './prompts';

/** The analysis/design capability, independent of which AI vendor implements it. */
export interface DesignAI {
  readonly provider: string;
  readonly model: string;
  analyzeRoom(input: { photo: ImagePayload; extraPhotos: ImagePayload[]; answers: Answers; signal?: AbortSignal }): Promise<RoomAnalysis>;
  elaborateProposal(input: {
    photo: ImagePayload;
    answers: Answers;
    analysis: RoomAnalysis;
    index: number;
    signal?: AbortSignal;
  }): Promise<ProposalContent>;
  refineProposal(input: {
    photo: ImagePayload;
    answers: Answers;
    analysis: RoomAnalysis | null;
    proposal: ProposalContent;
    request: string;
    previousRequests: string[];
    signal?: AbortSignal;
  }): Promise<Refinement>;
}

const PROVIDER_NAME = 'de IA (Anthropic)';

function imageBlock(image: ImagePayload): Anthropic.Beta.BetaImageBlockParam {
  return { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } };
}

/** Server-side refusal fallback is available on the current Claude generation. */
function supportsServerFallback(model: string) {
  return /^claude-(opus-5|fable-5|sonnet-5-5)/.test(model);
}

export function mapAnthropicError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Anthropic.APIUserAbortError) return Errors.timeout();
  if (error instanceof Anthropic.APIConnectionTimeoutError) return Errors.timeout();
  if (error instanceof Anthropic.APIConnectionError) return Errors.providerUnavailable(PROVIDER_NAME);
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return Errors.providerAuth('Anthropic');
  }
  if (error instanceof Anthropic.RateLimitError) return Errors.providerRateLimited(PROVIDER_NAME);
  if (error instanceof Anthropic.APIError) {
    if (error.status === 402) return Errors.providerBilling('Anthropic');
    if (typeof error.status === 'number' && error.status >= 500) return Errors.providerUnavailable(PROVIDER_NAME);
    return Errors.providerRejected(PROVIDER_NAME);
  }
  return Errors.internal();
}

export function createClaudeDesignAI(config: ServerConfig['anthropic'], client?: Anthropic): DesignAI {
  if (!config.apiKey && !client) throw Errors.notConfigured('análise por IA (Anthropic)');
  const anthropic = client ?? new Anthropic({ apiKey: config.apiKey!, maxRetries: 2, timeout: 6 * 60 * 1000 });

  /**
   * One structured-output call. Streaming keeps long generations under HTTP timeouts;
   * the JSON is validated against the same Zod schema the app uses.
   */
  async function generate<T extends z.ZodType>(
    schema: T,
    system: string,
    content: Anthropic.Beta.BetaContentBlockParam[],
    signal: AbortSignal | undefined,
  ): Promise<z.infer<T>> {
    const { schema: jsonSchema } = betaZodOutputFormat(schema);
    let message: Anthropic.Beta.BetaMessage;
    try {
      const stream = anthropic.beta.messages.stream(
        {
          model: config.model,
          max_tokens: 32_000,
          ...(supportsServerFallback(config.model)
            ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
            : {}),
          thinking: { type: 'adaptive' },
          output_config: { effort: config.effort, format: { type: 'json_schema', schema: jsonSchema } },
          system,
          messages: [{ role: 'user', content }],
        },
        { signal },
      );
      message = await stream.finalMessage();
    } catch (error) {
      throw mapAnthropicError(error);
    }

    if (message.stop_reason === 'refusal') throw Errors.refused();
    if (message.stop_reason === 'max_tokens') throw Errors.incomplete();

    const text = message.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw Errors.invalidOutput();
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw Errors.invalidOutput();
    return parsed.data;
  }

  return {
    provider: 'anthropic',
    model: config.model,

    analyzeRoom({ photo, extraPhotos, answers, signal }) {
      return generate(
        RoomAnalysisSchema,
        ANALYSIS_SYSTEM,
        [imageBlock(photo), ...extraPhotos.map(imageBlock), { type: 'text', text: analysisUserText(answers, extraPhotos.length) }],
        signal,
      );
    },

    elaborateProposal({ photo, answers, analysis, index, signal }) {
      return generate(
        ProposalContentSchema,
        PROPOSAL_SYSTEM,
        [imageBlock(photo), { type: 'text', text: proposalUserText(answers, analysis, index) }],
        signal,
      );
    },

    refineProposal({ photo, signal, ...input }) {
      return generate(RefinementSchema, REFINE_SYSTEM, [imageBlock(photo), { type: 'text', text: refineUserText(input) }], signal);
    },
  };
}
