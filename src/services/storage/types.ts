import type { Answers } from '@/domain/answers';
import type { PhotoCheck, Project, ProjectSummary, StoredImage } from '@/domain/project';

export type AppSettings = {
  /** When the user accepted sending photos to the AI providers (ISO date). */
  consentAt: string | null;
  /** Force demo mode even when the AI server is available. */
  preferDemo: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = { consentAt: null, preferDemo: false };

/** In-progress flow (photo + answers), persisted so it survives the app being killed. */
export type Draft = {
  photo: StoredImage | null;
  photoCheck: PhotoCheck | null;
  extraPhotos: StoredImage[];
  answers: Answers;
  updatedAt: string;
};

/**
 * Local persistence. Everything stays on the device; the interface is intentionally
 * small so a cloud-synced implementation (accounts) can be added later.
 */
export interface LocalStore {
  listProjects(): Promise<ProjectSummary[]>;
  getProject(id: string): Promise<Project | null>;
  putProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  deleteAll(): Promise<void>;

  /** Saves base64 image data and returns its storage path. */
  saveImage(scope: string, name: string, base64: string, mimeType?: string): Promise<string>;
  /** Copies an image from a local URI (picker/manipulator output) and returns its storage path. */
  importImage(scope: string, name: string, sourceUri: string): Promise<string>;
  readImageBase64(path: string): Promise<string>;
  deleteImage(path: string): Promise<void>;
  deleteScope(scope: string): Promise<void>;
  /** Turns a storage path into something `<Image source={{ uri }}>` can display. */
  resolveUri(path: string): string;

  getSettings(): Promise<AppSettings>;
  setSettings(settings: AppSettings): Promise<void>;
  getDraft(): Promise<Draft | null>;
  setDraft(draft: Draft | null): Promise<void>;
}
