/**
 * Local stand-in for the AI services, used ONLY by automated tests. It never contacts
 * a real provider; every answer is fixed example content marked as simulated.
 *
 * It plays two roles:
 *  1. The app's own API (/api/*), so the web e2e can exercise the AI-mode screens
 *     (images, adjustments, immersive 3D). Requests are validated with the same Zod
 *     schemas the real server uses.
 *       EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo start --web
 *  2. The Anthropic Messages API (POST /v1/messages, streaming), so the app's real
 *     server routes and the official SDK run end to end:
 *       ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://localhost:8787 npx expo start
 *     Each request received is saved, without image data or keys, to
 *     e2e/artifacts/mock-requests/.
 *
 *   node e2e/mock-ai-server.mjs [port]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8787);
const requestsDir = join(root, 'e2e/artifacts/mock-requests');
mkdirSync(requestsDir, { recursive: true });

// Reuse the app's domain code: the demo generator builds schema-valid proposals and
// the API schemas validate what the app sends.
const bundle = await build({
  stdin: {
    contents: [
      "export { buildDemoStudy } from '@/domain/demo';",
      "export { createEmptyAnswers } from '@/domain/answers';",
      "export { AnalyzeRequestSchema, ProposalRequestSchema, RefineRequestSchema, RenderRequestSchema, WorldStartRequestSchema } from '@/domain/api';",
      "export { RoomAnalysisSchema, ProposalContentSchema, RefinementSchema } from '@/domain/design';",
      "export { imageTypeFromBase64 } from '@/utils/image-size';",
    ].join('\n'),
    resolveDir: root,
    loader: 'ts',
  },
  tsconfig: join(root, 'tsconfig.json'),
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'silent',
});
const domain = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const AFTER_PNG = readFileSync(join(root, 'assets/demo/after.png'));
const SIMULATED = '(Conteúdo simulado para testes.)';
const ESTIMATES = [
  { min: 1800, max: 4500 },
  { min: 6000, max: 14000 },
  { min: 18000, max: 35000 },
];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function defaultAnswers() {
  return { ...domain.createEmptyAnswers(), roomType: 'sala_estar', goals: ['modernizar'], styles: ['japandi'], budget: 'intermediario' };
}

function analysisFor(answers) {
  const dims = answers.dimensions ?? {};
  const informed = !!(dims.widthM && dims.lengthM);
  return {
    photo: { usable: true, showsInterior: true, issues: [], tips: [] },
    detectedRoomType: 'Sala de estar',
    matchesDeclaredRoom: true,
    summary: `${SIMULATED} Sala retangular com boa luz natural pela lateral, piso de madeira clara e paredes neutras. O sofá fica na parede do fundo e a circulação principal está livre.`,
    observations: [
      { aspect: 'iluminacao', text: 'Janela ampla na parede da direita, com boa luz natural.', basis: 'observado', confidence: 'alta' },
      { aspect: 'mobiliario', text: 'Sofá de três lugares em tecido cinza, aparentemente em bom estado.', basis: 'observado', confidence: 'media' },
      { aspect: 'espaco', text: 'O pé-direito parece ter cerca de 2,6 m.', basis: 'hipotese', confidence: 'baixa' },
      { aspect: 'iluminacao', text: 'À noite a luz deve ser insuficiente: só há um ponto de luz central visível.', basis: 'hipotese', confidence: 'media' },
    ],
    visibleItems: [
      { name: 'Sofá', location: 'Encostado na parede do fundo', condition: 'Bom estado aparente', suggestion: 'manter' },
      { name: 'Mesa de centro', location: 'À frente do sofá', condition: null, suggestion: 'substituir' },
      { name: 'Rack', location: 'Parede da frente', condition: null, suggestion: 'reposicionar' },
    ],
    currentPalette: [
      { hex: '#E8E2D8', name: 'Off-white' },
      { hex: '#9C9A94', name: 'Cinza' },
      { hex: '#B08B66', name: 'Madeira clara' },
    ],
    lighting: { natural: 'Boa, pela janela lateral.', artificial: 'Plafon central único.', assessment: 'Falta luz indireta e de leitura.' },
    strengths: ['Boa luz natural', 'Piso de madeira em bom estado'],
    opportunities: ['Criar camadas de iluminação', 'Definir um ponto focal'],
    constraints: answers.tenure === 'alugado' ? ['Imóvel alugado: evitar obras'] : [],
    dimensions: informed
      ? { widthM: dims.widthM, lengthM: dims.lengthM, heightM: dims.heightM ?? 2.6, source: 'usuario', confidence: 'alta', note: 'Medidas informadas por você.' }
      : { widthM: 3.6, lengthM: 4.8, heightM: 2.6, source: 'estimativa', confidence: 'baixa', note: 'Estimativa pela altura da porta e do sofá; margem de erro de cerca de 20%.' },
    measurementRequests: informed ? [] : ['Largura da parede do fundo', 'Distância da parede do fundo até a janela'],
    budgetNote: 'O orçamento intermediário permite trocar duas ou três peças e investir em iluminação.',
    directions: domain.buildDemoStudy(answers).directions,
  };
}

function proposalFor(answers, index) {
  const base = domain.buildDemoStudy(answers).proposals[index];
  return {
    ...base,
    rationale: `${base.rationale.replace(/ Este é um exemplo de demonstração.*$/, '')} ${SIMULATED}`,
    investment: { level: base.investment.level, estimateBRL: ESTIMATES[index], basis: `Valores de referência ${SIMULATED.toLowerCase()}` },
  };
}

function refinementFor(proposal, request) {
  const palette = proposal.palette.map((c) => (c.role === 'destaque' ? { ...c, hex: '#26364F', name: 'Azul-marinho' } : c));
  return {
    proposal: { ...proposal, palette },
    changeSummary: `Atendendo ao pedido "${request.slice(0, 120)}": a cor de destaque passou a ser azul-marinho. ${SIMULATED}`,
    imageEditInstruction: 'Change the accent color of pillows and throws to navy blue. Keep everything else.',
  };
}

// ---------------------------------------------------------------------------
// HTTP plumbing

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

/** Same validation as the real server, plus: the declared image type must match the bytes. */
function invalid(res, schema, body) {
  const parsed = schema.safeParse(body);
  const images = [body.photo, body.image, ...(body.extraPhotos ?? [])].filter(Boolean);
  const mismatch = images.find((img) => typeof img.base64 === 'string' && domain.imageTypeFromBase64(img.base64) !== img.mimeType);
  if (parsed.success && !mismatch) return false;
  console.error('[mock] invalid request:', mismatch ? `mimeType ${mismatch.mimeType} does not match the image data` : JSON.stringify(parsed.error.issues.slice(0, 3)));
  json(res, { error: { code: 'bad_request', message: 'Dados da requisição inválidos.', retryable: false } }, 400);
  return true;
}

function ndjson(res) {
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
  return (event) => res.write(`${JSON.stringify(event)}\n`);
}

/** Removes image data and credentials before saving a request for inspection. */
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, (k === 'data' || k === 'base64') && typeof v === 'string' ? `<${v.length} chars>` : redact(v)]),
    );
  }
  return value;
}

let saved = 0;
function record(kind, req, body) {
  saved += 1;
  const headers = { ...req.headers };
  if (headers['x-api-key']) headers['x-api-key'] = '<redacted>';
  if (headers.authorization) headers.authorization = '<redacted>';
  writeFileSync(join(requestsDir, `${String(saved).padStart(2, '0')}-${kind}.json`), JSON.stringify({ url: req.url, headers, body: redact(body) }, null, 2));
}

// ---------------------------------------------------------------------------
// Role 1: the app's API

const worlds = new Map();

const appRoutes = {
  'GET /api/health': (_req, res) =>
    json(res, {
      ok: true,
      version: 'mock',
      analysis: { available: true, provider: 'anthropic', model: 'mock-analysis' },
      image: { available: true, provider: 'gemini', model: 'mock-image' },
      world: { available: true, provider: 'worldlabs', model: 'mock-world' },
    }),

  async 'POST /api/analyze'(_req, res, body) {
    if (invalid(res, domain.AnalyzeRequestSchema, body)) return;
    const send = ndjson(res);
    send({ type: 'progress', stage: 'analysis', message: 'Analisando a foto e as suas respostas…' });
    await wait(700);
    send({ type: 'heartbeat' });
    send({ type: 'analysis', analysis: analysisFor(body.answers) });
    send({ type: 'progress', stage: 'proposals', message: 'Criando as três propostas…' });
    for (const [index, key] of ['A', 'B', 'C'].entries()) {
      await wait(400);
      send({ type: 'proposal', index, key, proposal: proposalFor(body.answers, index) });
    }
    send({ type: 'done' });
    res.end();
  },

  async 'POST /api/proposal'(_req, res, body) {
    if (invalid(res, domain.ProposalRequestSchema, body)) return;
    const send = ndjson(res);
    await wait(400);
    send({ type: 'proposal', index: body.index, key: ['A', 'B', 'C'][body.index], proposal: proposalFor(body.answers, body.index) });
    send({ type: 'done' });
    res.end();
  },

  async 'POST /api/refine'(_req, res, body) {
    if (invalid(res, domain.RefineRequestSchema, body)) return;
    const send = ndjson(res);
    send({ type: 'progress', stage: 'refine', message: 'Ajustando a proposta…' });
    await wait(600);
    send({ type: 'refinement', refinement: refinementFor(body.proposal, body.request) });
    send({ type: 'done' });
    res.end();
  },

  async 'POST /api/render'(_req, res, body) {
    if (invalid(res, domain.RenderRequestSchema, body)) return;
    const send = ndjson(res);
    send({ type: 'progress', stage: 'render', message: 'Gerando a imagem da proposta…' });
    await wait(800);
    send({ type: 'image', image: { base64: AFTER_PNG.toString('base64'), mimeType: 'image/png', provider: 'mock', model: 'mock-image' } });
    send({ type: 'done' });
    res.end();
  },

  'POST /api/world'(_req, res, body) {
    if (invalid(res, domain.WorldStartRequestSchema, body)) return;
    const operationId = `op_mock_${worlds.size + 1}`;
    worlds.set(operationId, 0);
    json(res, { operationId, provider: 'worldlabs', model: 'mock-world' });
  },

  'GET /api/world'(_req, res, _body, url) {
    const operationId = url.searchParams.get('operationId') ?? '';
    if (!worlds.has(operationId)) return json(res, { error: { code: 'bad_request', message: 'Operação inválida.', retryable: false } }, 400);
    const polls = worlds.get(operationId) + 1;
    worlds.set(operationId, polls);
    const base = { operationId, progress: null, worldId: null, viewerUrl: null, thumbnailUrl: null, error: null };
    if (polls < 2) return json(res, { ...base, status: 'running', progress: 'Gerando o mundo 3D (simulado)…' });
    json(res, {
      ...base,
      status: 'succeeded',
      worldId: 'mock-world',
      viewerUrl: `http://localhost:${PORT}/world-viewer`,
      thumbnailUrl: `http://localhost:${PORT}/thumb.png`,
    });
  },

  'GET /thumb.png'(_req, res) {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(AFTER_PNG);
  },

  'GET /world-viewer'(_req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>Mock</title><p>Visualizador 3D simulado para testes.</p>');
  },
};

// ---------------------------------------------------------------------------
// Role 2: the Anthropic Messages API (streaming only, structured outputs)

/** What the app's server must send; mirrors the request built in src/server/ai/claude.ts. */
function anthropicRequestProblems(req, body) {
  const problems = [];
  if (!req.headers['x-api-key']) problems.push('missing x-api-key');
  if (!req.headers['anthropic-version']) problems.push('missing anthropic-version');
  if (!body.stream) problems.push('expected stream: true');
  if (!body.model || !body.max_tokens) problems.push('missing model or max_tokens');
  if (body.thinking?.type !== 'adaptive') problems.push('expected adaptive thinking');
  if (body.output_config?.format?.type !== 'json_schema' || !body.output_config.format.schema) problems.push('expected json_schema output format');
  if (body.fallbacks && !String(req.headers['anthropic-beta'] ?? '').includes('server-side-fallback-2026-07-01')) {
    problems.push('fallbacks without the server-side-fallback beta header');
  }
  const content = body.messages?.[0]?.content ?? [];
  if (content[0]?.type !== 'image' || content[0]?.source?.type !== 'base64') problems.push('expected the photo as the first content block');
  return problems;
}

async function anthropicMessages(req, res, body) {
  const kind = body.output_config?.format?.schema?.properties?.directions
    ? 'analysis'
    : body.output_config?.format?.schema?.properties?.changeSummary
      ? 'refine'
      : 'proposal';
  record(`anthropic-${kind}`, req, body);

  const problems = anthropicRequestProblems(req, body);
  if (problems.length) {
    console.error('[mock] invalid Anthropic request:', problems.join('; '));
    return json(res, { type: 'error', error: { type: 'invalid_request_error', message: problems.join('; ') } }, 400);
  }

  const text = body.messages[0].content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  let payload;
  if (kind === 'analysis') {
    payload = analysisFor(defaultAnswers());
  } else if (kind === 'refine') {
    const current = JSON.parse(/Proposta atual \(JSON\):\n(.*)\n/.exec(text)?.[1] ?? 'null') ?? proposalFor(defaultAnswers(), 0);
    payload = refinementFor(current, /Novo pedido do usuário:\n"""([\s\S]*?)"""/.exec(text)?.[1] ?? '');
  } else {
    const title = /- Título: (.*)/.exec(text)?.[1];
    const index = Math.max(0, domain.buildDemoStudy(defaultAnswers()).directions.findIndex((d) => d.title === title));
    payload = proposalFor(defaultAnswers(), index);
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'request-id': `req_mock_${saved}` });
  const sse = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  sse('message_start', {
    message: { id: `msg_mock_${saved}`, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1500, output_tokens: 1 } },
  });
  sse('content_block_start', { index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } });
  sse('content_block_delta', { index: 0, delta: { type: 'signature_delta', signature: 'mock-signature' } });
  sse('content_block_stop', { index: 0 });
  sse('content_block_start', { index: 1, content_block: { type: 'text', text: '' } });
  const output = JSON.stringify(payload);
  for (let i = 0; i < output.length; i += 512) {
    sse('content_block_delta', { index: 1, delta: { type: 'text_delta', text: output.slice(i, i + 512) } });
    await wait(5);
  }
  sse('content_block_stop', { index: 1 });
  sse('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: Math.ceil(output.length / 4) } });
  sse('message_stop', {});
  res.end();
}

// ---------------------------------------------------------------------------

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  try {
    const body = req.method === 'POST' ? await readBody(req) : {};
    if (req.method === 'POST' && url.pathname === '/v1/messages') return await anthropicMessages(req, res, body);
    const handler = appRoutes[`${req.method} ${url.pathname}`];
    if (!handler) return json(res, { error: { code: 'not_found', message: 'Rota inexistente no mock.', retryable: false } }, 404);
    await handler(req, res, body, url);
  } catch (error) {
    console.error('[mock] error:', error instanceof Error ? error.message : error);
    if (!res.headersSent) json(res, { error: { code: 'internal', message: 'Erro no mock.', retryable: true } }, 500);
    else res.end();
  }
});

server.listen(PORT, () => console.log(`Mock AI server on http://localhost:${PORT} (test content only)`));
