import { useEffect, useState } from 'react';

import { useAppStore } from '@/stores/app-store';
import { useProjectsStore } from '@/stores/projects-store';

/** Loads a project into memory (from local storage) and subscribes to its changes. */
export function useProject(id: string | undefined) {
  const project = useProjectsStore((s) => (id ? s.projects[id] : undefined));
  const [loaded, setLoaded] = useState(!!project);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    useProjectsStore
      .getState()
      .loadProject(id)
      .finally(() => alive && setLoaded(true));
    const app = useAppStore.getState();
    app.loadSettings();
    if (app.healthStatus === 'idle') app.checkHealth();
    return () => {
      alive = false;
    };
  }, [id]);

  return { project: project ?? null, loaded: loaded || !!project };
}
