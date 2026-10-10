import { z } from 'zod';

import { AnswersSchema, roomTypeLabel, type Answers } from './answers';
import {
  DirectionSchema,
  ProposalContentSchema,
  RoomAnalysisSchema,
  type ProposalContent,
  type ProposalKey,
} from './design';

export const PROJECT_SCHEMA_VERSION = 1;

/** Image stored by the app. `path` is storage-relative on native, a data URL on web. */
export const StoredImageSchema = z.object({
  path: z.string(),
  width: z.number(),
  height: z.number(),
});
export type StoredImage = z.infer<typeof StoredImageSchema>;

export const PhotoCheckSchema = z.object({
  brightness: z.number(),
  contrast: z.number(),
  warnings: z.array(z.string()),
});
export type PhotoCheck = z.infer<typeof PhotoCheckSchema>;

export const GeneratedImageSchema = StoredImageSchema.extend({
  provider: z.string(),
  model: z.string(),
  createdAt: z.string(),
});
export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const ProposalVersionSchema = z.object({
  version: z.number(),
  createdAt: z.string(),
  /** Adjustment requested by the user that produced this version (null for v1). */
  request: z.string().nullable(),
  changeSummary: z.string().nullable(),
  /** English edit instruction for the image model (refinements only). */
  imageInstruction: z.string().nullable(),
  content: ProposalContentSchema,
  image: GeneratedImageSchema.nullable(),
  imageError: z.string().nullable(),
});
export type ProposalVersion = z.infer<typeof ProposalVersionSchema>;

export const ProposalRecordSchema = z.object({
  key: z.enum(['A', 'B', 'C']),
  versions: z.array(ProposalVersionSchema),
});
export type ProposalRecord = z.infer<typeof ProposalRecordSchema>;

export const WorldJobSchema = z.object({
  provider: z.literal('worldlabs'),
  operationId: z.string(),
  proposalKey: z.enum(['A', 'B', 'C']),
  proposalVersion: z.number(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed']),
  progress: z.string().nullable(),
  worldId: z.string().nullable(),
  viewerUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorldJob = z.infer<typeof WorldJobSchema>;

export const ProjectSchema = z.object({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** "ai" = real providers; "demo" = local examples built only from the answers. */
  mode: z.enum(['ai', 'demo']),
  photo: StoredImageSchema,
  extraPhotos: z.array(StoredImageSchema),
  photoCheck: PhotoCheckSchema.nullable(),
  answers: AnswersSchema,
  status: z.enum(['generating', 'ready', 'error']),
  error: z.string().nullable(),
  analysis: RoomAnalysisSchema.nullable(),
  directions: z.array(DirectionSchema),
  proposals: z.array(ProposalRecordSchema),
  /** Failed proposal slots (A/B/C) with the error shown to the user. */
  proposalErrors: z.array(z.object({ key: z.enum(['A', 'B', 'C']), message: z.string() })),
  selectedKey: z.enum(['A', 'B', 'C']).nullable(),
  measurements: z.object({
    widthM: z.number().optional(),
    lengthM: z.number().optional(),
    heightM: z.number().optional(),
  }),
  world: WorldJobSchema.nullable(),
  /** Set once the user answered the "see it in 3D?" invite for the selected proposal. */
  invite3dAnsweredFor: z.string().nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  mode: Project['mode'];
  status: Project['status'];
  roomLabel: string;
  thumbnail: StoredImage;
  selectedName: string | null;
  proposalCount: number;
};

export function summarize(project: Project): ProjectSummary {
  const selected = project.selectedKey ? getProposal(project, project.selectedKey) : null;
  const thumb = selected?.image ?? project.photo;
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
    mode: project.mode,
    status: project.status,
    roomLabel: roomTypeLabel(project.answers),
    thumbnail: { path: thumb.path, width: thumb.width, height: thumb.height },
    selectedName: selected?.content.name ?? null,
    proposalCount: project.proposals.length,
  };
}

export function currentVersion(record: ProposalRecord): ProposalVersion {
  return record.versions[record.versions.length - 1];
}

export function getProposal(project: Project, key: ProposalKey): ProposalVersion | null {
  const record = project.proposals.find((p) => p.key === key);
  return record ? currentVersion(record) : null;
}

export function defaultProjectName(answers: Answers, date = new Date()): string {
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${roomTypeLabel(answers)} · ${day}`;
}

export function createId(prefix = ''): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${random}`;
}

export function firstVersion(content: ProposalContent, now = new Date().toISOString()): ProposalVersion {
  return {
    version: 1,
    createdAt: now,
    request: null,
    changeSummary: null,
    imageInstruction: null,
    content,
    image: null,
    imageError: null,
  };
}
