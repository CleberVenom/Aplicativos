import { create } from 'zustand';

import { createEmptyAnswers, type Answers } from '@/domain/answers';
import type { PhotoCheck, StoredImage } from '@/domain/project';
import { localStore } from '@/services/storage/local-store';
import type { Draft } from '@/services/storage/types';

/**
 * The photo + questionnaire in progress. Kept in memory for instant navigation
 * between steps and mirrored to local storage, so answers survive going back,
 * leaving the app or Android killing it while the camera is open.
 */
type DraftState = Draft & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPhoto: (photo: StoredImage, check: PhotoCheck) => Promise<void>;
  clearPhoto: () => Promise<void>;
  addExtraPhoto: (photo: StoredImage) => void;
  removeExtraPhoto: (index: number) => void;
  updateAnswers: (patch: Partial<Answers>) => void;
  reset: () => Promise<void>;
};

const emptyDraft = (): Draft => ({
  photo: null,
  photoCheck: null,
  extraPhotos: [],
  answers: createEmptyAnswers(),
  updatedAt: new Date().toISOString(),
});

let persistTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePersist(get: () => DraftState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const { photo, photoCheck, extraPhotos, answers, updatedAt } = get();
    const draft: Draft | null = photo || answers.roomType ? { photo, photoCheck, extraPhotos, answers, updatedAt } : null;
    localStore.setDraft(draft).catch(() => {});
  }, 250);
}

export const useDraftStore = create<DraftState>((set, get) => ({
  ...emptyDraft(),
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    const draft = await localStore.getDraft().catch(() => null);
    set({ ...(draft ? { ...emptyDraft(), ...draft, answers: { ...createEmptyAnswers(), ...draft.answers } } : {}), hydrated: true });
  },

  async setPhoto(photo, check) {
    const previous = get().photo;
    set({ photo, photoCheck: check, updatedAt: new Date().toISOString() });
    schedulePersist(get);
    if (previous && previous.path !== photo.path) await localStore.deleteImage(previous.path).catch(() => {});
  },

  async clearPhoto() {
    const previous = get().photo;
    set({ photo: null, photoCheck: null, updatedAt: new Date().toISOString() });
    schedulePersist(get);
    if (previous) await localStore.deleteImage(previous.path).catch(() => {});
  },

  addExtraPhoto(photo) {
    set({ extraPhotos: [...get().extraPhotos, photo].slice(0, 2), updatedAt: new Date().toISOString() });
    schedulePersist(get);
  },

  removeExtraPhoto(index) {
    const removed = get().extraPhotos[index];
    set({ extraPhotos: get().extraPhotos.filter((_, i) => i !== index), updatedAt: new Date().toISOString() });
    schedulePersist(get);
    if (removed) localStore.deleteImage(removed.path).catch(() => {});
  },

  updateAnswers(patch) {
    set({ answers: { ...get().answers, ...patch }, updatedAt: new Date().toISOString() });
    schedulePersist(get);
  },

  async reset() {
    if (persistTimer) clearTimeout(persistTimer);
    set({ ...emptyDraft() });
    await localStore.setDraft(null).catch(() => {});
    await localStore.deleteScope('draft').catch(() => {});
  },
}));
