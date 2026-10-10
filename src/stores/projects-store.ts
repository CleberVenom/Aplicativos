import { create } from 'zustand';

import type { ProposalKey } from '@/domain/design';
import type { Project, ProjectSummary } from '@/domain/project';
import { localStore } from '@/services/storage/local-store';

export type JobState = {
  stage: 'analysis' | 'proposals' | 'render' | 'refine' | 'world';
  message: string;
  startedAt: number;
};

type ProjectsState = {
  summaries: ProjectSummary[];
  summariesLoaded: boolean;
  /** Projects loaded in memory (the source of truth while the app runs). */
  projects: Record<string, Project>;
  /** Long-running work per project (not persisted: a restart shows "interrupted"). */
  jobs: Record<string, JobState | undefined>;
  /** Image renders / refinements in flight, keyed by `${projectId}:${key}`. */
  busy: Record<string, 'render' | 'refine' | undefined>;

  refreshList: () => Promise<void>;
  loadProject: (id: string) => Promise<Project | null>;
  /** Applies a synchronous change in memory and schedules a serialized save. */
  mutate: (id: string, fn: (project: Project) => Project) => Project | null;
  addProject: (project: Project) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
  setJob: (id: string, job: JobState | undefined) => void;
  setBusy: (id: string, key: ProposalKey, value: 'render' | 'refine' | undefined) => void;
  flush: (id: string) => Promise<void>;
};

const saveChains = new Map<string, Promise<void>>();

export const useProjectsStore = create<ProjectsState>((set, get) => {
  function persist(id: string) {
    const previous = saveChains.get(id) ?? Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(async () => {
        const latest = get().projects[id];
        if (!latest) return;
        await localStore.putProject(latest);
        const summaries = await localStore.listProjects();
        set({ summaries, summariesLoaded: true });
      });
    saveChains.set(id, next);
    return next;
  }

  return {
    summaries: [],
    summariesLoaded: false,
    projects: {},
    jobs: {},
    busy: {},

    async refreshList() {
      const summaries = await localStore.listProjects().catch(() => []);
      set({ summaries, summariesLoaded: true });
    },

    async loadProject(id) {
      const cached = get().projects[id];
      if (cached) return cached;
      const project = await localStore.getProject(id);
      if (project) set({ projects: { ...get().projects, [id]: project } });
      return project;
    },

    mutate(id, fn) {
      const current = get().projects[id];
      if (!current) return null;
      const updated = { ...fn(current), updatedAt: new Date().toISOString() };
      set({ projects: { ...get().projects, [id]: updated } });
      persist(id).catch(() => {});
      return updated;
    },

    async addProject(project) {
      set({ projects: { ...get().projects, [project.id]: project } });
      await persist(project.id);
    },

    async renameProject(id, name) {
      await get().loadProject(id);
      get().mutate(id, (p) => ({ ...p, name: name.trim().slice(0, 80) || p.name }));
      await get().flush(id);
    },

    async deleteProject(id) {
      await saveChains.get(id)?.catch(() => {});
      saveChains.delete(id);
      const { [id]: _removed, ...rest } = get().projects;
      set({ projects: rest, jobs: { ...get().jobs, [id]: undefined } });
      await localStore.deleteProject(id);
      await get().refreshList();
    },

    async deleteAll() {
      await Promise.all([...saveChains.values()].map((p) => p.catch(() => {})));
      saveChains.clear();
      set({ projects: {}, jobs: {}, busy: {} });
      await localStore.deleteAll();
      await get().refreshList();
    },

    setJob(id, job) {
      set({ jobs: { ...get().jobs, [id]: job } });
    },

    setBusy(id, key, value) {
      set({ busy: { ...get().busy, [`${id}:${key}`]: value } });
    },

    async flush(id) {
      await saveChains.get(id)?.catch(() => {});
    },
  };
});
