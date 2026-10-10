import { z } from 'zod';

/**
 * Parametric 3D scene ("maquete") used by the 3D viewer.
 *
 * Coordinate convention (also explained to the AI in the schema descriptions):
 * - Origin at the center of the floor. Units are meters.
 * - x grows to the right and z grows toward the camera, as seen in the photo.
 * - Walls: "fundo" (back, faces the camera, z = -length/2), "frente" (behind the
 *   photographer, z = +length/2), "esquerda" (x = -width/2), "direita" (x = +width/2).
 * - rotationDeg is where the FRONT of the item points: 0 = toward the camera,
 *   90 = toward the right wall, 180 = toward the back wall, 270 = toward the left wall.
 */

export const SCENE_ITEM_KINDS = {
  sofa: { label: 'Sofá', size: [2.1, 0.9, 0.85] },
  poltrona: { label: 'Poltrona', size: [0.85, 0.85, 0.85] },
  mesa_centro: { label: 'Mesa de centro', size: [1.0, 0.6, 0.4] },
  mesa_lateral: { label: 'Mesa lateral', size: [0.45, 0.45, 0.55] },
  rack_tv: { label: 'Rack com TV', size: [1.8, 0.45, 0.55] },
  estante: { label: 'Estante', size: [1.2, 0.35, 1.9] },
  tapete: { label: 'Tapete', size: [2.4, 1.7, 0.02] },
  luminaria_piso: { label: 'Luminária de piso', size: [0.4, 0.4, 1.6] },
  pendente: { label: 'Pendente', size: [0.5, 0.5, 0.4] },
  planta: { label: 'Planta', size: [0.5, 0.5, 1.2] },
  quadro: { label: 'Quadro', size: [0.9, 0.04, 0.6] },
  espelho: { label: 'Espelho', size: [0.7, 0.04, 1.0] },
  cortina: { label: 'Cortina', size: [2.2, 0.12, 2.5] },
  cama: { label: 'Cama', size: [1.6, 2.05, 0.55] },
  criado_mudo: { label: 'Criado-mudo', size: [0.5, 0.4, 0.55] },
  guarda_roupa: { label: 'Guarda-roupa', size: [2.0, 0.6, 2.3] },
  comoda: { label: 'Cômoda', size: [1.2, 0.5, 0.85] },
  escrivaninha: { label: 'Escrivaninha', size: [1.2, 0.6, 0.75] },
  cadeira: { label: 'Cadeira', size: [0.5, 0.52, 0.85] },
  mesa_jantar: { label: 'Mesa de jantar', size: [1.6, 0.9, 0.76] },
  aparador: { label: 'Aparador', size: [1.4, 0.4, 0.8] },
  armario: { label: 'Armário', size: [1.2, 0.6, 2.1] },
  armario_aereo: { label: 'Armário aéreo', size: [1.8, 0.35, 0.7] },
  bancada: { label: 'Bancada', size: [2.4, 0.6, 0.9] },
  ilha: { label: 'Ilha', size: [1.8, 0.9, 0.92] },
  banqueta: { label: 'Banqueta', size: [0.4, 0.4, 0.75] },
  geladeira: { label: 'Geladeira', size: [0.75, 0.7, 1.85] },
  fogao: { label: 'Fogão', size: [0.6, 0.6, 0.9] },
  pia: { label: 'Pia', size: [0.8, 0.5, 0.9] },
  vaso_sanitario: { label: 'Vaso sanitário', size: [0.4, 0.65, 0.75] },
  box_chuveiro: { label: 'Box', size: [0.9, 0.9, 2.0] },
  banheira: { label: 'Banheira', size: [1.6, 0.75, 0.55] },
  gabinete_banheiro: { label: 'Gabinete', size: [0.8, 0.48, 0.85] },
  prateleira: { label: 'Prateleira', size: [1.0, 0.25, 0.04] },
  pufe: { label: 'Pufe', size: [0.5, 0.5, 0.42] },
  banco: { label: 'Banco', size: [1.2, 0.4, 0.45] },
  churrasqueira: { label: 'Churrasqueira', size: [0.9, 0.6, 2.2] },
  rede: { label: 'Rede', size: [2.5, 0.8, 1.2] },
  outro: { label: 'Objeto', size: [0.6, 0.6, 0.6] },
} as const satisfies Record<string, { label: string; size: readonly [number, number, number] }>;

export type SceneItemKind = keyof typeof SCENE_ITEM_KINDS;
export const SCENE_ITEM_KIND_IDS = Object.keys(SCENE_ITEM_KINDS) as [SceneItemKind, ...SceneItemKind[]];

/** Items that hang on a wall or ceiling by default (bottom edge height in meters). */
export const DEFAULT_ELEVATION: Partial<Record<SceneItemKind, number>> = {
  quadro: 1.35,
  espelho: 0.9,
  prateleira: 1.5,
  armario_aereo: 1.55,
  cortina: 0.05,
};

export const WALLS = ['fundo', 'frente', 'esquerda', 'direita'] as const;
export type Wall = (typeof WALLS)[number];

export const SCENE_MATERIALS = ['tecido', 'madeira', 'metal', 'couro', 'vidro', 'pedra', 'laca', 'fibra', 'ceramica', 'vegetal'] as const;
export const FLOOR_MATERIALS = ['madeira', 'porcelanato', 'cimento', 'carpete', 'ceramica', 'pedra', 'vinilico'] as const;
export const ITEM_STATUSES = ['mantido', 'reposicionado', 'novo', 'substituido'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

const hex = z.string().describe('Cor em hexadecimal no formato #RRGGBB.');

export const SceneItemSchema = z.object({
  kind: z.enum(SCENE_ITEM_KIND_IDS).describe('Tipo do item. Use "outro" se nenhum tipo servir.'),
  label: z.string().describe('Nome curto em português, ex.: "Sofá de linho 3 lugares".'),
  x: z.number().describe('Centro do item no eixo x (m). Negativo = esquerda, positivo = direita.'),
  z: z.number().describe('Centro do item no eixo z (m). Negativo = perto da parede do fundo, positivo = perto da câmera.'),
  rotationDeg: z.number().describe('Para onde a FRENTE do item aponta: 0 câmera, 90 parede direita, 180 parede do fundo, 270 parede esquerda.'),
  widthM: z.number().describe('Largura do item (m), medida de lado a lado olhando a frente dele.'),
  depthM: z.number().describe('Profundidade do item (m).'),
  heightM: z.number().describe('Altura do item (m).'),
  elevationM: z.number().describe('Altura da base do item em relação ao piso (m). 0 para itens apoiados no chão; ex.: quadro 1.35.'),
  color: hex,
  material: z.enum(SCENE_MATERIALS),
  status: z.enum(ITEM_STATUSES).describe('mantido, reposicionado, novo ou substituido em relação à foto original.'),
});

export const SceneOpeningSchema = z.object({
  type: z.enum(['janela', 'porta', 'porta_vidro', 'passagem']),
  wall: z.enum(WALLS),
  offsetM: z
    .number()
    .describe('Deslocamento do centro da abertura a partir do meio da parede (m). Paredes fundo/frente: positivo = direita. Paredes esquerda/direita: positivo = em direção à câmera.'),
  widthM: z.number(),
  heightM: z.number(),
  sillM: z.number().describe('Altura do peitoril (m). 0 para portas.'),
});

export const SceneSpecSchema = z.object({
  room: z.object({
    widthM: z.number().describe('Largura do ambiente, de parede esquerda a parede direita (m).'),
    lengthM: z.number().describe('Comprimento do ambiente, da parede do fundo até a posição da câmera (m).'),
    heightM: z.number().describe('Pé-direito (m).'),
  }),
  floor: z.object({ material: z.enum(FLOOR_MATERIALS), color: hex }),
  wallColor: hex,
  accentWall: z.object({ wall: z.enum(WALLS), color: hex }).nullable(),
  ceilingColor: hex,
  openings: z.array(SceneOpeningSchema),
  items: z.array(SceneItemSchema),
});

export type SceneItem = z.infer<typeof SceneItemSchema>;
export type SceneOpening = z.infer<typeof SceneOpeningSchema>;
export type SceneSpec = z.infer<typeof SceneSpecSchema>;

export const ROOM_LIMITS = {
  width: [1.5, 15],
  length: [1.5, 15],
  height: [2.1, 6],
} as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function safeHex(value: string | undefined | null, fallback: string): string {
  if (!value) return fallback;
  const v = value.trim();
  if (HEX_RE.test(v)) return v.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toUpperCase();
  }
  return fallback;
}

const clamp = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Normalizes rotation to [0, 360). */
export function normalizeRotation(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Footprint along x/z after rotation (approximate for non-right angles). */
export function footprint(item: Pick<SceneItem, 'widthM' | 'depthM' | 'rotationDeg'>) {
  const rad = (normalizeRotation(item.rotationDeg) * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { x: item.widthM * c + item.depthM * s, z: item.widthM * s + item.depthM * c };
}

/**
 * Makes any scene (from the AI, the demo generator or user-edited measurements)
 * safe to render: clamps room size, item sizes and positions to stay inside the
 * walls, fixes colors and caps the number of items.
 */
export function normalizeScene(scene: SceneSpec): SceneSpec {
  const widthM = round2(clamp(scene.room.widthM, ROOM_LIMITS.width[0], ROOM_LIMITS.width[1]));
  const lengthM = round2(clamp(scene.room.lengthM, ROOM_LIMITS.length[0], ROOM_LIMITS.length[1]));
  const heightM = round2(clamp(scene.room.heightM, ROOM_LIMITS.height[0], ROOM_LIMITS.height[1]));

  const items = scene.items.slice(0, 40).map((item) => {
    const kind = SCENE_ITEM_KINDS[item.kind] ? item.kind : 'outro';
    const [dw, dd, dh] = SCENE_ITEM_KINDS[kind].size;
    const w = round2(clamp(item.widthM || dw, 0.05, Math.max(widthM, lengthM)));
    const d = round2(clamp(item.depthM || dd, 0.01, Math.max(widthM, lengthM)));
    const h = round2(clamp(item.heightM || dh, 0.01, heightM));
    const rotationDeg = normalizeRotation(item.rotationDeg);
    const fp = footprint({ widthM: w, depthM: d, rotationDeg });
    const halfX = Math.max(0, widthM / 2 - fp.x / 2);
    const halfZ = Math.max(0, lengthM / 2 - fp.z / 2);
    const elevation = clamp(item.elevationM ?? DEFAULT_ELEVATION[kind] ?? 0, 0, Math.max(0, heightM - h));
    return {
      ...item,
      kind,
      label: item.label?.trim() || SCENE_ITEM_KINDS[kind].label,
      widthM: w,
      depthM: d,
      heightM: h,
      x: round2(clamp(item.x, -halfX, halfX)),
      z: round2(clamp(item.z, -halfZ, halfZ)),
      rotationDeg: round2(rotationDeg),
      // A pendant with no explicit height hangs ~60 cm below the ceiling.
      elevationM: round2(kind === 'pendente' && elevation === 0 ? Math.max(0, heightM - h - 0.6) : elevation),
      color: safeHex(item.color, '#B9A792'),
    } satisfies SceneItem;
  });

  const openings = scene.openings.slice(0, 12).map((o) => {
    const wallLength = o.wall === 'fundo' || o.wall === 'frente' ? widthM : lengthM;
    const w = round2(clamp(o.widthM, 0.4, wallLength));
    const h = round2(clamp(o.heightM, 0.3, heightM));
    const sill = round2(clamp(o.sillM, 0, Math.max(0, heightM - h)));
    const half = Math.max(0, wallLength / 2 - w / 2);
    return { ...o, widthM: w, heightM: h, sillM: sill, offsetM: round2(clamp(o.offsetM, -half, half)) };
  });

  return {
    room: { widthM, lengthM, heightM },
    floor: { material: scene.floor.material, color: safeHex(scene.floor.color, '#B08B66') },
    wallColor: safeHex(scene.wallColor, '#EFE9E1'),
    accentWall: scene.accentWall
      ? { wall: scene.accentWall.wall, color: safeHex(scene.accentWall.color, '#C9B8A3') }
      : null,
    ceilingColor: safeHex(scene.ceilingColor, '#F7F5F2'),
    openings,
    items,
  };
}

/** Applies user-provided measurements (meters) on top of a scene, rescaling positions. */
export function applyMeasurements(
  scene: SceneSpec,
  dims: { widthM?: number; lengthM?: number; heightM?: number },
): SceneSpec {
  const sx = dims.widthM ? dims.widthM / scene.room.widthM : 1;
  const sz = dims.lengthM ? dims.lengthM / scene.room.lengthM : 1;
  return normalizeScene({
    ...scene,
    room: {
      widthM: dims.widthM ?? scene.room.widthM,
      lengthM: dims.lengthM ?? scene.room.lengthM,
      heightM: dims.heightM ?? scene.room.heightM,
    },
    items: scene.items.map((i) => ({ ...i, x: i.x * sx, z: i.z * sz })),
    openings: scene.openings.map((o) => ({
      ...o,
      offsetM: o.wall === 'fundo' || o.wall === 'frente' ? o.offsetM * sx : o.offsetM * sz,
    })),
  });
}
