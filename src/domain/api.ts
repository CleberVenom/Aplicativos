import { z } from 'zod';

import { AnswersSchema } from './answers';
import {
  DirectionSchema,
  ProposalContentSchema,
  RefinementSchema,
  RoomAnalysisSchema,
  type ProposalKey,
} from './design';

/**
 * Contract between the app and the server API routes. Shared by both sides so the
 * client builds requests that the server validates with the very same schemas.
 */

/** ~6 MB of binary data. The app sends photos already resized to <= 1600 px. */
export const MAX_IMAGE_BASE64_CHARS = 8_000_000;

export const ImagePayloadSchema = z.object({
  base64: z.string().min(100).max(MAX_IMAGE_BASE64_CHARS),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  width: z.number().int().positive().max(8000),
  height: z.number().int().positive().max(8000),
});
export type ImagePayload = z.infer<typeof ImagePayloadSchema>;

export const AnalyzeRequestSchema = z.object({
  photo: ImagePayloadSchema,
  extraPhotos: z.array(ImagePayloadSchema).max(2),
  answers: AnswersSchema,
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const ProposalRequestSchema = z.object({
  photo: ImagePayloadSchema,
  answers: AnswersSchema,
  analysis: RoomAnalysisSchema,
  index: z.number().int().min(0).max(2),
});
export type ProposalRequest = z.infer<typeof ProposalRequestSchema>;

export const RefineRequestSchema = z.object({
  photo: ImagePayloadSchema,
  answers: AnswersSchema,
  analysis: RoomAnalysisSchema.nullable(),
  proposal: ProposalContentSchema,
  request: z.string().trim().min(3).max(600),
  previousRequests: z.array(z.string().max(600)).max(10),
});
export type RefineRequest = z.infer<typeof RefineRequestSchema>;

export const RenderRequestSchema = z.object({
  /** The original photo (mode "proposal") or the current render (mode "refine"). */
  image: ImagePayloadSchema,
  mode: z.enum(['proposal', 'refine']),
  proposal: z.object({
    name: z.string().max(200),
    style: z.string().max(200),
    imagePrompt: z.string().max(4000),
    palette: z.array(z.object({ hex: z.string().max(9), name: z.string().max(60) })).max(8),
    keep: z.array(z.string().max(120)).max(20),
  }),
  /** English edit instruction (mode "refine"). */
  instruction: z.string().max(2000).nullable(),
});
export type RenderRequest = z.infer<typeof RenderRequestSchema>;

export const WorldStartRequestSchema = z.object({
  image: ImagePayloadSchema,
  prompt: z.string().max(1500).nullable(),
});
export type WorldStartRequest = z.infer<typeof WorldStartRequestSchema>;

export type ApiErrorBody = {
  code: string;
  message: string;
  retryable: boolean;
};

export type GeneratedImagePayload = {
  base64: string;
  mimeType: string;
  provider: string;
  model: string;
};

export type StreamEvent =
  | { type: 'progress'; stage: string; message: string }
  | { type: 'heartbeat' }
  | { type: 'analysis'; analysis: z.infer<typeof RoomAnalysisSchema> }
  | { type: 'directions'; directions: z.infer<typeof DirectionSchema>[] }
  | { type: 'proposal'; index: number; key: ProposalKey; proposal: z.infer<typeof ProposalContentSchema> }
  | { type: 'proposal_error'; index: number; key: ProposalKey; error: ApiErrorBody }
  | { type: 'refinement'; refinement: z.infer<typeof RefinementSchema> }
  | { type: 'image'; image: GeneratedImagePayload }
  | { type: 'error'; error: ApiErrorBody }
  | { type: 'done' };

export type ProviderStatus = {
  available: boolean;
  provider: string | null;
  model: string | null;
};

export type HealthResponse = {
  ok: true;
  version: string;
  analysis: ProviderStatus;
  image: ProviderStatus;
  world: ProviderStatus;
};

export type WorldStatusResponse = {
  operationId: string;
  status: 'running' | 'succeeded' | 'failed';
  progress: string | null;
  worldId: string | null;
  viewerUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
};
