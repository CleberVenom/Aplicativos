import { Directory, File, Paths } from 'expo-file-system';

import { ProjectSchema, summarize, type Project, type ProjectSummary } from '@/domain/project';

import { DEFAULT_SETTINGS, type AppSettings, type Draft, type LocalStore } from './types';

/**
 * Native storage in the app's private documents folder:
 *   ambienta/index.json                 project summaries
 *   ambienta/projects/<id>/project.json project data
 *   ambienta/projects/<id>/*.jpg        photo and generated images
 * Paths are stored relative to the documents folder, because the absolute container
 * path can change after an app update on iOS.
 */
const ROOT = 'ambienta';

function file(...parts: string[]) {
  return new File(Paths.document, ...parts);
}

function dir(...parts: string[]) {
  return new Directory(Paths.document, ...parts);
}

function ensureDir(...parts: string[]) {
  const d = dir(...parts);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

async function readJson<T>(f: File): Promise<T | null> {
  if (!f.exists) return null;
  try {
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

function writeJson(f: File, value: unknown) {
  if (!f.exists) f.create({ intermediates: true, overwrite: true });
  f.write(JSON.stringify(value));
}

function scopeParts(scope: string) {
  return scope.split('/').filter(Boolean);
}

function createNativeStore(): LocalStore {
  const indexFile = () => file(ROOT, 'index.json');

  async function readIndex(): Promise<ProjectSummary[]> {
    return (await readJson<ProjectSummary[]>(indexFile())) ?? [];
  }

  return {
    async listProjects() {
      const list = await readIndex();
      return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getProject(id) {
      const raw = await readJson<unknown>(file(ROOT, 'projects', id, 'project.json'));
      const parsed = ProjectSchema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    },

    async putProject(project: Project) {
      ensureDir(ROOT, 'projects', project.id);
      writeJson(file(ROOT, 'projects', project.id, 'project.json'), project);
      const index = (await readIndex()).filter((p) => p.id !== project.id);
      index.push(summarize(project));
      writeJson(indexFile(), index);
    },

    async deleteProject(id) {
      const d = dir(ROOT, 'projects', id);
      if (d.exists) d.delete();
      writeJson(indexFile(), (await readIndex()).filter((p) => p.id !== id));
    },

    async deleteAll() {
      const d = dir(ROOT);
      if (d.exists) d.delete();
    },

    async saveImage(scope, name, base64) {
      ensureDir(ROOT, ...scopeParts(scope));
      const f = file(ROOT, ...scopeParts(scope), name);
      if (!f.exists) f.create({ overwrite: true });
      f.write(base64, { encoding: 'base64' });
      return [ROOT, ...scopeParts(scope), name].join('/');
    },

    async importImage(scope, name, sourceUri) {
      ensureDir(ROOT, ...scopeParts(scope));
      const target = file(ROOT, ...scopeParts(scope), name);
      if (target.exists) target.delete();
      new File(sourceUri).copy(target);
      return [ROOT, ...scopeParts(scope), name].join('/');
    },

    async readImageBase64(path) {
      return file(path).base64();
    },

    async deleteImage(path) {
      if (/^(data:|https?:|blob:)/.test(path)) return;
      const f = file(path);
      if (f.exists) f.delete();
    },

    async deleteScope(scope) {
      const d = dir(ROOT, ...scopeParts(scope));
      if (d.exists) d.delete();
    },

    resolveUri(path) {
      if (/^(data:|https?:|file:|blob:)/.test(path)) return path;
      return file(path).uri;
    },

    async getSettings(): Promise<AppSettings> {
      return { ...DEFAULT_SETTINGS, ...((await readJson<Partial<AppSettings>>(file(ROOT, 'settings.json'))) ?? {}) };
    },

    async setSettings(settings) {
      ensureDir(ROOT);
      writeJson(file(ROOT, 'settings.json'), settings);
    },

    async getDraft() {
      return readJson<Draft>(file(ROOT, 'draft.json'));
    },

    async setDraft(draft) {
      const f = file(ROOT, 'draft.json');
      if (!draft) {
        if (f.exists) f.delete();
        return;
      }
      ensureDir(ROOT);
      writeJson(f, draft);
    },
  };
}

export const localStore: LocalStore = createNativeStore();
