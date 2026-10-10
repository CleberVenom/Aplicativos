import type { SceneSpec } from '@/domain/scene';

/** Messages between the app (host) and the 3D viewer page running in a WebView/iframe. */

export type CameraPreset = 'overview' | 'photo' | 'top';

export type HostToViewer =
  | { type: 'scene'; scene: SceneSpec; highlight: boolean; camera?: CameraPreset }
  | { type: 'camera'; preset: CameraPreset }
  | { type: 'highlight'; enabled: boolean }
  | { type: 'focus'; index: number | null };

export type SelectedItem = {
  index: number;
  label: string;
  kind: string;
  status: string;
  widthM: number;
  depthM: number;
  heightM: number;
};

export type ViewerToHost =
  | { type: 'ready' }
  | { type: 'rendered'; items: number }
  | { type: 'select'; item: SelectedItem | null }
  | { type: 'error'; message: string };

export const STATUS_COLORS: Record<string, string> = {
  mantido: '#8E8173',
  reposicionado: '#2F6FB0',
  novo: '#2E8B57',
  substituido: '#D9822B',
};

export const STATUS_LABELS: Record<string, string> = {
  mantido: 'Mantido',
  reposicionado: 'Reposicionado',
  novo: 'Novo',
  substituido: 'Substituído',
};
