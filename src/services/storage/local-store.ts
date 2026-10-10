import { createStore, del, get, keys, set } from 'idb-keyval';

import { ProjectSchema, summarize, type ProjectSummary } from '@/domain/project';
import { toDataUrl } from '@/utils/base64';

import { DEFAULT_SETTINGS, type AppSettings, type Draft, type LocalStore } from './types';

/**
 * Web storage (IndexedDB). Images are stored inline as data URLs, so a stored
 * "path" is directly displayable. Used by the web build and the browser tests.
 */
function createWebStore(): LocalStore {
  const db = typeof indexedDB !== 'undefined' ? createStore('ambienta', 'kv') : undefined;
  const memory = new Map<string, unknown>();

  const read = async <T,>(key: string): Promise<T | undefined> => (db ? get<T>(key, db) : (memory.get(key) as T | undefined));
  const write = async (key: string, value: unknown) => (db ? set(key, value, db) : void memory.set(key, value));
  const remove = async (key: string) => (db ? del(key, db) : void memory.delete(key));

  return {
    async listProjects() {
      const list = (await read<ProjectSummary[]>('index')) ?? [];
      return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getProject(id) {
      const parsed = ProjectSchema.safeParse(await read(`project:${id}`));
      return parsed.success ? parsed.data : null;
    },
    async putProject(project) {
      await write(`project:${project.id}`, project);
      const index = ((await read<ProjectSummary[]>('index')) ?? []).filter((p) => p.id !== project.id);
      index.push(summarize(project));
      await write('index', index);
    },
    async deleteProject(id) {
      await remove(`project:${id}`);
      await write('index', ((await read<ProjectSummary[]>('index')) ?? []).filter((p) => p.id !== id));
    },
    async deleteAll() {
      if (db) {
        for (const key of await keys(db)) await del(key, db);
      } else memory.clear();
    },
    async saveImage(_scope, _name, base64, mimeType = 'image/jpeg') {
      return toDataUrl(base64, mimeType);
    },
    async importImage(_scope, _name, sourceUri) {
      if (sourceUri.startsWith('data:')) return sourceUri;
      const blob = await (await fetch(sourceUri)).blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    },
    async readImageBase64(path) {
      const comma = path.indexOf(',');
      return path.startsWith('data:') && comma > 0 ? path.slice(comma + 1) : path;
    },
    async deleteImage() {
      // Images are data URLs stored inside the records on web.
    },
    async deleteScope() {
      // Images live inside the project records on web; nothing else to delete.
    },
    resolveUri(path) {
      return path;
    },
    async getSettings(): Promise<AppSettings> {
      return { ...DEFAULT_SETTINGS, ...((await read<Partial<AppSettings>>('settings')) ?? {}) };
    },
    async setSettings(settings) {
      await write('settings', settings);
    },
    async getDraft() {
      return (await read<Draft>('draft')) ?? null;
    },
    async setDraft(draft) {
      if (draft) await write('draft', draft);
      else await remove('draft');
    },
  };
}

export const localStore: LocalStore = createWebStore();
