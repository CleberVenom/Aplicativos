import type { z } from 'zod';

import {
  AnalyzeRequestSchema,
  ProposalRequestSchema,
  RefineRequestSchema,
  RenderRequestSchema,
  WorldStartRequestSchema,
} from '@/domain/api';
import { PROPOSAL_KEYS } from '@/domain/design';

import { getConfig } from './config';
import { AppError, Errors, jsonError, logServerError, toAppError } from './errors';
import { buildRenderPrompt } from './images/prompt';
import { ndjsonResponse } from './ndjson';
import { createProviders, type Providers } from './providers';
import { clientKey, RateLimiter } from './rate-limit';

const MAX_BODY_BYTES = 30 * 1024 * 1024;
const HOUR = 60 * 60 * 1000;

export type Deps = {
  providers: Providers;
  limiters: Record<'analyze' | 'refine' | 'render' | 'world', RateLimiter>;
};

let defaultDeps: Deps | null = null;

/** Lazily built so env changes in development are picked up on the next cold start. */
export function getDefaultDeps(): Deps {
  if (!defaultDeps) {
    const config = getConfig();
    const perHour = config.rateLimitPerHour;
    defaultDeps = {
      providers: createProviders(config),
      limiters: {
        analyze: new RateLimiter(perHour, HOUR),
        refine: new RateLimiter(perHour, HOUR),
        render: new RateLimiter(perHour * 2, HOUR),
        world: new RateLimiter(Math.max(3, Math.round(perHour / 5)), HOUR),
      },
    };
  }
  return defaultDeps;
}

async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) throw Errors.badRequest('A imagem enviada é grande demais.');
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw Errors.badRequest('Corpo da requisição inválido.');
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw Errors.badRequest('Dados da requisição inválidos.');
  return parsed.data;
}

function limit(deps: Deps, bucket: keyof Deps['limiters'], request: Request) {
  if (!deps.limiters[bucket].take(clientKey(request))) throw Errors.rateLimited();
}

/** Runs the pre-stream part (validation, limits, provider lookup) and maps errors to JSON. */
async function guarded(context: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    const appError = toAppError(error);
    if (!(error instanceof AppError) || appError.status >= 500) logServerError(context, error);
    return jsonError(appError);
  }
}

export function handleHealth(deps: Deps = getDefaultDeps()): Response {
  return Response.json(deps.providers.health(), { headers: { 'Cache-Control': 'no-store' } });
}

export function handleAnalyze(request: Request, deps: Deps = getDefaultDeps()): Promise<Response> {
  return guarded('analyze', async () => {
    const body = await parseBody(request, AnalyzeRequestSchema);
    const design = deps.providers.design();
    limit(deps, 'analyze', request);

    return ndjsonResponse('analyze', async (send, signal) => {
      send({ type: 'progress', stage: 'analysis', message: 'Analisando a foto e as suas respostas…' });
      const analysis = await design.analyzeRoom({ photo: body.photo, extraPhotos: body.extraPhotos, answers: body.answers, signal });
      send({ type: 'analysis', analysis });

      const directions = analysis.directions.slice(0, 3);
      send({ type: 'progress', stage: 'proposals', message: 'Criando as três propostas…' });
      await Promise.all(
        PROPOSAL_KEYS.map(async (key, index) => {
          if (!directions[index]) {
            send({ type: 'proposal_error', index, key, error: Errors.incomplete().toBody() });
            return;
          }
          try {
            const proposal = await design.elaborateProposal({ photo: body.photo, answers: body.answers, analysis, index, signal });
            send({ type: 'proposal', index, key, proposal });
          } catch (error) {
            logServerError(`proposal-${key}`, error);
            send({ type: 'proposal_error', index, key, error: toAppError(error).toBody() });
          }
        }),
      );
      send({ type: 'done' });
    });
  });
}

export function handleProposal(request: Request, deps: Deps = getDefaultDeps()): Promise<Response> {
  return guarded('proposal', async () => {
    const body = await parseBody(request, ProposalRequestSchema);
    if (!body.analysis.directions[body.index]) throw Errors.badRequest('Direção de proposta inexistente.');
    const design = deps.providers.design();
    limit(deps, 'analyze', request);

    return ndjsonResponse('proposal', async (send, signal) => {
      send({ type: 'progress', stage: 'proposals', message: 'Recriando a proposta…' });
      const proposal = await design.elaborateProposal({ ...body, signal });
      send({ type: 'proposal', index: body.index, key: PROPOSAL_KEYS[body.index], proposal });
      send({ type: 'done' });
    });
  });
}

export function handleRefine(request: Request, deps: Deps = getDefaultDeps()): Promise<Response> {
  return guarded('refine', async () => {
    const body = await parseBody(request, RefineRequestSchema);
    const design = deps.providers.design();
    limit(deps, 'refine', request);

    return ndjsonResponse('refine', async (send, signal) => {
      send({ type: 'progress', stage: 'refine', message: 'Ajustando a proposta…' });
      const refinement = await design.refineProposal({ ...body, signal });
      send({ type: 'refinement', refinement });
      send({ type: 'done' });
    });
  });
}

export function handleRender(request: Request, deps: Deps = getDefaultDeps()): Promise<Response> {
  return guarded('render', async () => {
    const body = await parseBody(request, RenderRequestSchema);
    const images = deps.providers.image();
    limit(deps, 'render', request);

    return ndjsonResponse('render', async (send, signal) => {
      send({ type: 'progress', stage: 'render', message: 'Gerando a imagem da proposta…' });
      const image = await images.edit({ image: body.image, prompt: buildRenderPrompt(body), signal });
      send({ type: 'image', image });
      send({ type: 'done' });
    });
  });
}

export function handleWorldStart(request: Request, deps: Deps = getDefaultDeps()): Promise<Response> {
  return guarded('world-start', async () => {
    const body = await parseBody(request, WorldStartRequestSchema);
    const world = deps.providers.world();
    limit(deps, 'world', request);
    const { operationId } = await world.start({ image: body.image, prompt: body.prompt, signal: request.signal });
    return Response.json({ operationId, provider: world.provider, model: world.model });
  });
}

export function handleWorldStatus(request: Request, deps: Deps = getDefaultDeps()): Promise<Response> {
  return guarded('world-status', async () => {
    const operationId = new URL(request.url).searchParams.get('operationId') ?? '';
    if (!/^[A-Za-z0-9_-]{4,128}$/.test(operationId)) throw Errors.badRequest('Operação inválida.');
    const status = await deps.providers.world().status(operationId, request.signal);
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  });
}
