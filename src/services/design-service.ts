import type { ImagePayload } from '@/domain/api';
import { buildDemoStudy } from '@/domain/demo';
import { applyDemoAdjustment, describeDemoAdjustment, type DemoAdjustment } from '@/domain/demo-adjustments';
import { PROPOSAL_KEYS, type ProposalKey, type Refinement } from '@/domain/design';
import {
  createId,
  currentVersion,
  defaultProjectName,
  firstVersion,
  PROJECT_SCHEMA_VERSION,
  type Project,
  type ProposalRecord,
  type ProposalVersion,
  type StoredImage,
} from '@/domain/project';
import { isReadyToGenerate } from '@/domain/questionnaire';
import { useAppStore } from '@/stores/app-store';
import { useDraftStore } from '@/stores/draft-store';
import { useProjectsStore } from '@/stores/projects-store';
import { imageSizeFromBase64, imageTypeFromBase64 } from '@/utils/image-size';

import { ApiError, getJson, postJson, postStream } from './api-client';
import { localStore } from './storage/local-store';

/**
 * Orchestrates the design flow on the device. AI work happens on the server; this
 * module sends requests, stores results as they arrive and keeps every step
 * resumable (a killed app can continue where it stopped).
 */

const projects = () => useProjectsStore.getState();

async function toPayload(image: StoredImage): Promise<ImagePayload> {
  const base64 = await localStore.readImageBase64(image.path);
  return { base64, mimeType: imageTypeFromBase64(base64), width: Math.round(image.width), height: Math.round(image.height) };
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'Algo deu errado. Tente novamente.';
}

function upsertProposal(project: Project, key: ProposalKey, version: ProposalVersion): Project {
  const exists = project.proposals.some((p) => p.key === key);
  const proposals: ProposalRecord[] = exists
    ? project.proposals.map((p) => (p.key === key ? { ...p, versions: [version] } : p))
    : [...project.proposals, { key, versions: [version] }].sort((a, b) => a.key.localeCompare(b.key));
  return { ...project, proposals, proposalErrors: project.proposalErrors.filter((e) => e.key !== key) };
}

function updateCurrentVersion(project: Project, key: ProposalKey, fn: (v: ProposalVersion) => ProposalVersion): Project {
  return {
    ...project,
    proposals: project.proposals.map((p) =>
      p.key === key ? { ...p, versions: [...p.versions.slice(0, -1), fn(currentVersion(p))] } : p,
    ),
  };
}

/** Creates a project from the current draft and starts generating it. */
export async function createProjectFromDraft(mode: Project['mode']): Promise<string> {
  const draft = useDraftStore.getState();
  if (!draft.photo) throw new Error('Selecione uma foto antes de continuar.');
  if (!isReadyToGenerate(draft.answers)) throw new Error('Responda às perguntas obrigatórias antes de continuar.');

  const id = createId('p');
  const scope = `projects/${id}`;
  const photoPath = await localStore.importImage(scope, 'photo.jpg', localStore.resolveUri(draft.photo.path));
  const extraPhotos: StoredImage[] = [];
  for (const [index, extra] of draft.extraPhotos.entries()) {
    const path = await localStore.importImage(scope, `extra-${index + 1}.jpg`, localStore.resolveUri(extra.path));
    extraPhotos.push({ ...extra, path });
  }

  const now = new Date().toISOString();
  const project: Project = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id,
    name: defaultProjectName(draft.answers),
    createdAt: now,
    updatedAt: now,
    mode,
    photo: { ...draft.photo, path: photoPath },
    extraPhotos,
    photoCheck: draft.photoCheck,
    answers: draft.answers,
    status: 'generating',
    error: null,
    analysis: null,
    directions: [],
    proposals: [],
    proposalErrors: [],
    selectedKey: null,
    measurements: { ...draft.answers.dimensions },
    world: null,
    invite3dAnsweredFor: null,
  };
  await projects().addProject(project);
  await useDraftStore.getState().reset();
  void runGeneration(id);
  return id;
}

function imageGenerationAvailable() {
  const { health } = useAppStore.getState();
  return !!health?.image.available;
}

/**
 * Generates (or resumes) the design study: analysis, three proposals and their images.
 * Safe to call again after a failure or an app restart — it only does what is missing.
 */
export async function runGeneration(projectId: string): Promise<void> {
  const store = projects();
  if (store.jobs[projectId]) return; // already running
  const project = await store.loadProject(projectId);
  if (!project) return;

  if (project.mode === 'demo') {
    const { directions, proposals } = buildDemoStudy(project.answers);
    store.mutate(projectId, (p) => ({
      ...p,
      status: 'ready',
      error: null,
      directions,
      proposals: proposals.map((content, i) => ({ key: PROPOSAL_KEYS[i], versions: [firstVersion(content)] })),
      proposalErrors: [],
    }));
    await store.flush(projectId);
    return;
  }

  store.setJob(projectId, { stage: 'analysis', message: 'Preparando a foto…', startedAt: Date.now() });
  store.mutate(projectId, (p) => ({ ...p, status: 'generating', error: null }));
  if (!useAppStore.getState().health) await useAppStore.getState().checkHealth();

  try {
    const photo = await toPayload(project.photo);
    if (!project.analysis) {
      const extraPhotos = await Promise.all(project.extraPhotos.map(toPayload));
      await postStream('/api/analyze', { photo, extraPhotos, answers: project.answers }, (event) => {
        if (event.type === 'progress') {
          store.setJob(projectId, { stage: event.stage === 'proposals' ? 'proposals' : 'analysis', message: event.message, startedAt: Date.now() });
        } else if (event.type === 'analysis') {
          store.mutate(projectId, (p) => ({ ...p, analysis: event.analysis, directions: event.analysis.directions.slice(0, 3) }));
        } else if (event.type === 'proposal') {
          store.mutate(projectId, (p) => upsertProposal(p, event.key, firstVersion(event.proposal)));
          if (imageGenerationAvailable()) void renderProposal(projectId, event.key);
        } else if (event.type === 'proposal_error') {
          store.mutate(projectId, (p) => ({
            ...p,
            proposalErrors: [...p.proposalErrors.filter((e) => e.key !== event.key), { key: event.key, message: event.error.message }],
          }));
        }
      });
    } else {
      // Resume: create the proposals that are missing, then the missing images.
      const latest = projects().projects[projectId] ?? project;
      const missing = PROPOSAL_KEYS.filter((key, index) => latest.directions[index] && !latest.proposals.some((p) => p.key === key));
      store.setJob(projectId, { stage: 'proposals', message: 'Concluindo as propostas…', startedAt: Date.now() });
      await Promise.all(missing.map((key) => retryProposal(projectId, key, { skipJob: true })));
      if (imageGenerationAvailable()) {
        const current = projects().projects[projectId];
        for (const record of current?.proposals ?? []) {
          const v = currentVersion(record);
          if (!v.image) void renderProposal(projectId, record.key);
        }
      }
    }
    store.mutate(projectId, (p) => ({
      ...p,
      status: p.proposals.length ? 'ready' : 'error',
      error: p.proposals.length ? null : 'Não foi possível criar as propostas. Tente novamente.',
    }));
  } catch (error) {
    store.mutate(projectId, (p) => ({ ...p, status: p.proposals.length ? 'ready' : 'error', error: errorMessage(error) }));
  } finally {
    store.setJob(projectId, undefined);
    await store.flush(projectId);
  }
}

/** Re-creates one proposal (after a failure). */
export async function retryProposal(projectId: string, key: ProposalKey, options: { skipJob?: boolean } = {}) {
  const store = projects();
  const project = await store.loadProject(projectId);
  if (!project?.analysis) return runGeneration(projectId);
  const index = PROPOSAL_KEYS.indexOf(key);
  if (!options.skipJob) store.setBusy(projectId, key, 'refine');
  try {
    const photo = await toPayload(project.photo);
    await postStream('/api/proposal', { photo, answers: project.answers, analysis: project.analysis, index }, (event) => {
      if (event.type === 'proposal') {
        store.mutate(projectId, (p) => upsertProposal(p, key, firstVersion(event.proposal)));
        if (imageGenerationAvailable()) void renderProposal(projectId, key);
      }
    });
  } catch (error) {
    store.mutate(projectId, (p) => ({
      ...p,
      proposalErrors: [...p.proposalErrors.filter((e) => e.key !== key), { key, message: errorMessage(error) }],
    }));
  } finally {
    if (!options.skipJob) store.setBusy(projectId, key, undefined);
    store.mutate(projectId, (p) => (p.proposals.length && p.status === 'error' ? { ...p, status: 'ready', error: null } : p));
  }
}

/**
 * Generates the visualization of the current version of a proposal. Refinements edit
 * the previous render (keeps continuity); first versions edit the original photo.
 */
export async function renderProposal(projectId: string, key: ProposalKey): Promise<void> {
  const store = projects();
  const project = await store.loadProject(projectId);
  const record = project?.proposals.find((p) => p.key === key);
  if (!project || !record) return;
  if (store.busy[`${projectId}:${key}`] === 'render') return;

  const version = currentVersion(record);
  const previous = record.versions.length > 1 ? record.versions[record.versions.length - 2] : null;
  const refineFrom = version.imageInstruction && previous?.image ? previous.image : null;

  store.setBusy(projectId, key, 'render');
  store.mutate(projectId, (p) => updateCurrentVersion(p, key, (v) => ({ ...v, imageError: null })));
  try {
    const image = await toPayload(refineFrom ?? project.photo);
    let result: { base64: string; mimeType: string; provider: string; model: string } | null = null;
    await postStream(
      '/api/render',
      {
        image,
        mode: refineFrom ? 'refine' : 'proposal',
        instruction: refineFrom ? version.imageInstruction : null,
        proposal: {
          name: version.content.name,
          style: version.content.style,
          imagePrompt: version.content.imagePrompt,
          palette: version.content.palette.map(({ hex, name }) => ({ hex, name })),
          keep: version.content.changes.keep.slice(0, 20),
        },
      },
      (event) => {
        if (event.type === 'image') result = event.image;
      },
    );
    const generated = result as { base64: string; mimeType: string; provider: string; model: string } | null;
    if (!generated) throw new ApiError('no_image', 'O serviço de imagens não retornou uma imagem.', true);

    const size = imageSizeFromBase64(generated.base64) ?? { width: project.photo.width, height: project.photo.height };
    const type = imageTypeFromBase64(generated.base64);
    const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const path = await localStore.saveImage(`projects/${projectId}`, `proposal-${key}-v${version.version}.${extension}`, generated.base64, generated.mimeType);
    store.mutate(projectId, (p) =>
      updateCurrentVersion(p, key, (v) =>
        v.version === version.version
          ? { ...v, image: { path, ...size, provider: generated.provider, model: generated.model, createdAt: new Date().toISOString() }, imageError: null }
          : v,
      ),
    );
  } catch (error) {
    store.mutate(projectId, (p) => updateCurrentVersion(p, key, (v) => (v.version === version.version ? { ...v, imageError: errorMessage(error) } : v)));
  } finally {
    store.setBusy(projectId, key, undefined);
    await store.flush(projectId);
  }
}

/** Applies a free-text adjustment through the AI and renders the new version. */
export async function requestAdjustment(projectId: string, key: ProposalKey, request: string): Promise<void> {
  const store = projects();
  const project = await store.loadProject(projectId);
  const record = project?.proposals.find((p) => p.key === key);
  if (!project || !record) throw new Error('Proposta não encontrada.');

  store.setBusy(projectId, key, 'refine');
  try {
    const current = currentVersion(record);
    const photo = await toPayload(project.photo);
    let refinement = null as Refinement | null;
    await postStream(
      '/api/refine',
      {
        photo,
        answers: project.answers,
        analysis: project.analysis,
        proposal: current.content,
        request,
        previousRequests: record.versions.map((v) => v.request).filter((r): r is string => !!r).slice(-10),
      },
      (event) => {
        if (event.type === 'refinement') refinement = event.refinement;
      },
    );
    const result = refinement as Refinement | null;
    if (!result) throw new ApiError('no_result', 'A IA não retornou o ajuste. Tente novamente.', true);
    store.mutate(projectId, (p) => ({
      ...p,
      proposals: p.proposals.map((r) =>
        r.key === key
          ? {
              ...r,
              versions: [
                ...r.versions,
                {
                  version: currentVersion(r).version + 1,
                  createdAt: new Date().toISOString(),
                  request,
                  changeSummary: result.changeSummary,
                  imageInstruction: result.imageEditInstruction,
                  content: result.proposal,
                  image: null,
                  imageError: null,
                },
              ],
            }
          : r,
      ),
    }));
  } finally {
    store.setBusy(projectId, key, undefined);
  }
  if (imageGenerationAvailable()) void renderProposal(projectId, key);
}

/** Demo mode: deterministic, on-device adjustment (no AI involved). */
export async function applyDemoAdjustmentToProject(projectId: string, key: ProposalKey, adjustment: DemoAdjustment) {
  const store = projects();
  await store.loadProject(projectId);
  store.mutate(projectId, (p) => ({
    ...p,
    proposals: p.proposals.map((r) => {
      if (r.key !== key) return r;
      const current = currentVersion(r);
      const { content, summary } = applyDemoAdjustment(current.content, adjustment);
      return {
        ...r,
        versions: [
          ...r.versions,
          {
            version: current.version + 1,
            createdAt: new Date().toISOString(),
            request: describeDemoAdjustment(adjustment),
            changeSummary: `${summary} (ajuste automático do modo demonstração)`,
            imageInstruction: null,
            content,
            image: null,
            imageError: null,
          },
        ],
      };
    }),
  }));
  await store.flush(projectId);
}

/** Makes an earlier version the current one again (kept as a new version in history). */
export async function restoreVersion(projectId: string, key: ProposalKey, versionNumber: number) {
  const store = projects();
  await store.loadProject(projectId);
  store.mutate(projectId, (p) => ({
    ...p,
    proposals: p.proposals.map((r) => {
      if (r.key !== key) return r;
      const source = r.versions.find((v) => v.version === versionNumber);
      if (!source) return r;
      return {
        ...r,
        versions: [
          ...r.versions,
          {
            ...source,
            version: currentVersion(r).version + 1,
            createdAt: new Date().toISOString(),
            request: `Voltar para a versão ${versionNumber}`,
            changeSummary: `Versão ${versionNumber} restaurada.`,
            imageInstruction: null,
          },
        ],
      };
    }),
  }));
  await store.flush(projectId);
}

export function selectProposal(projectId: string, key: ProposalKey) {
  projects().mutate(projectId, (p) => ({ ...p, selectedKey: key }));
}

export function answerInvite3d(projectId: string, key: ProposalKey) {
  projects().mutate(projectId, (p) => ({ ...p, invite3dAnsweredFor: key }));
}

export function updateMeasurements(projectId: string, measurements: Project['measurements']) {
  projects().mutate(projectId, (p) => ({ ...p, measurements }));
}

/** Starts an immersive 3D world (World Labs) from a proposal's current image. */
export async function startWorld(projectId: string, key: ProposalKey): Promise<void> {
  const store = projects();
  const project = await store.loadProject(projectId);
  const record = project?.proposals.find((p) => p.key === key);
  if (!project || !record) throw new Error('Proposta não encontrada.');
  const version = currentVersion(record);
  if (!version.image) throw new Error('Esta proposta ainda não tem imagem gerada.');

  const image = await toPayload(version.image);
  const prompt = `${version.content.name}: ${version.content.tagline}`.slice(0, 1500);
  const { operationId } = await postJson<{ operationId: string }>('/api/world', { image, prompt }, { timeoutMs: 120_000 });
  const now = new Date().toISOString();
  store.mutate(projectId, (p) => ({
    ...p,
    world: {
      provider: 'worldlabs',
      operationId,
      proposalKey: key,
      proposalVersion: version.version,
      status: 'running',
      progress: null,
      worldId: null,
      viewerUrl: null,
      thumbnailUrl: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    },
  }));
  await store.flush(projectId);
}

export async function refreshWorld(projectId: string): Promise<void> {
  const store = projects();
  const project = await store.loadProject(projectId);
  const world = project?.world;
  if (!world || world.status === 'succeeded' || world.status === 'failed') return;
  const status = await getJson<{
    status: 'running' | 'succeeded' | 'failed';
    progress: string | null;
    worldId: string | null;
    viewerUrl: string | null;
    thumbnailUrl: string | null;
    error: string | null;
  }>(`/api/world?operationId=${encodeURIComponent(world.operationId)}`);
  store.mutate(projectId, (p) =>
    p.world
      ? {
          ...p,
          world: {
            ...p.world,
            status: status.status,
            progress: status.progress,
            worldId: status.worldId,
            viewerUrl: status.viewerUrl,
            thumbnailUrl: status.thumbnailUrl,
            error: status.error,
            updatedAt: new Date().toISOString(),
          },
        }
      : p,
  );
}
