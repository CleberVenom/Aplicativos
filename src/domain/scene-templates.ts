import type { FurnitureDecisionId, RoomTypeId } from './catalog';
import type { ItemStatus, SceneItem, SceneItemKind, SceneOpening, SceneSpec } from './scene';
import { normalizeScene, SCENE_ITEM_KINDS } from './scene';

/**
 * Template layouts per room type. They are used by the demo mode and as a fallback
 * when an AI response comes without a usable scene. They are generic furniture
 * arrangements — NOT a reconstruction of the user's photo.
 */

type TemplateItem = {
  kind: SceneItemKind;
  /** Position as a fraction of half-width/half-length (-1..1), so it scales with the room. */
  fx: number;
  fz: number;
  rot?: number;
  size?: [number, number, number];
  elevation?: number;
  /** Which palette slot colors this item (0 = base … 3 = accent). */
  tone: 0 | 1 | 2 | 3 | 'wood' | 'metal' | 'steel' | 'plant' | 'white';
  material: SceneItem['material'];
  /** Only included for these variants (default: all). */
  variants?: ('A' | 'B' | 'C')[];
  /** Furniture catalog label this item corresponds to (for keep/replace decisions). */
  ref?: string;
};

type Template = {
  dims: { widthM: number; lengthM: number; heightM: number };
  floor: SceneSpec['floor'];
  openings: SceneOpening[];
  items: TemplateItem[];
};

const T: Record<RoomTypeId, Template> = {
  sala_estar: {
    dims: { widthM: 4, lengthM: 5, heightM: 2.7 },
    floor: { material: 'madeira', color: '#B08B66' },
    openings: [
      { type: 'janela', wall: 'direita', offsetM: -0.6, widthM: 1.6, heightM: 1.3, sillM: 0.9 },
      { type: 'porta', wall: 'frente', offsetM: -1.3, widthM: 0.8, heightM: 2.1, sillM: 0 },
    ],
    items: [
      { kind: 'sofa', fx: 0, fz: -0.8, rot: 0, tone: 1, material: 'tecido', ref: 'Sofá' },
      { kind: 'tapete', fx: 0, fz: -0.28, rot: 0, tone: 0, material: 'tecido', ref: 'Tapete' },
      { kind: 'mesa_centro', fx: 0, fz: -0.3, rot: 0, tone: 'wood', material: 'madeira', ref: 'Mesa de centro' },
      { kind: 'poltrona', fx: 0.62, fz: 0.05, rot: 270, tone: 2, material: 'tecido', ref: 'Poltrona' },
      { kind: 'rack_tv', fx: 0, fz: 0.88, rot: 180, tone: 'wood', material: 'madeira', ref: 'Rack ou painel de TV' },
      { kind: 'estante', fx: -0.88, fz: 0.15, rot: 90, tone: 'wood', material: 'madeira', ref: 'Estante' },
      { kind: 'luminaria_piso', fx: -0.7, fz: -0.85, tone: 'metal', material: 'metal', ref: 'Luminárias' },
      { kind: 'planta', fx: 0.75, fz: -0.84, tone: 'plant', material: 'vegetal', ref: 'Plantas' },
      { kind: 'quadro', fx: 0, fz: -0.99, rot: 0, size: [1.2, 0.04, 0.7], elevation: 1.35, tone: 3, material: 'madeira', ref: 'Quadros e objetos' },
      { kind: 'cortina', fx: 0.97, fz: -0.24, rot: 270, size: [2.2, 0.12, 2.45], tone: 0, material: 'tecido', ref: 'Cortinas' },
      { kind: 'mesa_lateral', fx: 0.6, fz: -0.82, tone: 'wood', material: 'madeira', variants: ['B', 'C'] },
      { kind: 'pendente', fx: 0, fz: -0.3, tone: 'metal', material: 'metal', variants: ['C'] },
      { kind: 'pufe', fx: -0.35, fz: 0.1, tone: 2, material: 'tecido', variants: ['C'] },
    ],
  },
  sala_jantar: {
    dims: { widthM: 3.4, lengthM: 4, heightM: 2.7 },
    floor: { material: 'madeira', color: '#A98563' },
    openings: [
      { type: 'janela', wall: 'esquerda', offsetM: -0.4, widthM: 1.5, heightM: 1.3, sillM: 0.9 },
      { type: 'passagem', wall: 'direita', offsetM: 0.9, widthM: 1.0, heightM: 2.1, sillM: 0 },
    ],
    items: [
      { kind: 'tapete', fx: 0, fz: -0.05, size: [2.6, 2.0, 0.02], tone: 0, material: 'tecido', ref: 'Tapete' },
      { kind: 'mesa_jantar', fx: 0, fz: -0.05, tone: 'wood', material: 'madeira', ref: 'Mesa de jantar' },
      { kind: 'cadeira', fx: -0.28, fz: -0.36, rot: 0, tone: 1, material: 'tecido', ref: 'Cadeiras' },
      { kind: 'cadeira', fx: 0.28, fz: -0.36, rot: 0, tone: 1, material: 'tecido', ref: 'Cadeiras' },
      { kind: 'cadeira', fx: -0.28, fz: 0.26, rot: 180, tone: 1, material: 'tecido', ref: 'Cadeiras' },
      { kind: 'cadeira', fx: 0.28, fz: 0.26, rot: 180, tone: 1, material: 'tecido', ref: 'Cadeiras' },
      { kind: 'aparador', fx: 0, fz: -0.89, rot: 0, tone: 'wood', material: 'madeira', ref: 'Aparador ou buffet' },
      { kind: 'pendente', fx: 0, fz: -0.05, tone: 'metal', material: 'metal', ref: 'Lustre ou pendente' },
      { kind: 'quadro', fx: 0, fz: -0.99, size: [1.0, 0.04, 0.7], elevation: 1.45, tone: 3, material: 'madeira', ref: 'Quadros e objetos' },
      { kind: 'planta', fx: 0.8, fz: -0.85, tone: 'plant', material: 'vegetal' },
      { kind: 'estante', fx: 0.88, fz: 0.0, rot: 270, tone: 'wood', material: 'madeira', ref: 'Cristaleira', variants: ['B', 'C'] },
    ],
  },
  quarto: {
    dims: { widthM: 3.2, lengthM: 3.8, heightM: 2.6 },
    floor: { material: 'madeira', color: '#B4916E' },
    openings: [
      { type: 'janela', wall: 'direita', offsetM: -0.5, widthM: 1.4, heightM: 1.2, sillM: 1.0 },
      { type: 'porta', wall: 'frente', offsetM: 1.0, widthM: 0.8, heightM: 2.1, sillM: 0 },
    ],
    items: [
      { kind: 'cama', fx: 0, fz: -0.45, rot: 0, tone: 0, material: 'tecido', ref: 'Cama' },
      { kind: 'criado_mudo', fx: -0.66, fz: -0.88, rot: 0, tone: 'wood', material: 'madeira', ref: 'Criados-mudos' },
      { kind: 'criado_mudo', fx: 0.66, fz: -0.88, rot: 0, tone: 'wood', material: 'madeira', ref: 'Criados-mudos' },
      { kind: 'guarda_roupa', fx: -0.81, fz: 0.42, rot: 90, tone: 'white', material: 'laca', ref: 'Guarda-roupa' },
      { kind: 'tapete', fx: 0.08, fz: 0.12, size: [2.0, 1.4, 0.02], tone: 2, material: 'tecido', ref: 'Tapete' },
      { kind: 'comoda', fx: 0.45, fz: 0.86, rot: 180, tone: 'wood', material: 'madeira', ref: 'Cômoda' },
      { kind: 'quadro', fx: 0, fz: -0.99, size: [1.1, 0.04, 0.6], elevation: 1.3, tone: 3, material: 'madeira', ref: 'Cabeceira' },
      { kind: 'cortina', fx: 0.96, fz: -0.26, rot: 270, size: [2.0, 0.12, 2.35], tone: 1, material: 'tecido', ref: 'Cortinas' },
      { kind: 'pendente', fx: -0.66, fz: -0.88, tone: 'metal', material: 'metal', variants: ['B', 'C'], ref: 'Luminárias' },
      { kind: 'pendente', fx: 0.66, fz: -0.88, tone: 'metal', material: 'metal', variants: ['B', 'C'], ref: 'Luminárias' },
      { kind: 'planta', fx: 0.82, fz: 0.45, tone: 'plant', material: 'vegetal', variants: ['A', 'C'] },
      { kind: 'poltrona', fx: 0.68, fz: 0.35, rot: 225, tone: 2, material: 'tecido', variants: ['C'] },
    ],
  },
  cozinha: {
    dims: { widthM: 3.0, lengthM: 3.6, heightM: 2.6 },
    floor: { material: 'porcelanato', color: '#CFC6BA' },
    openings: [
      { type: 'janela', wall: 'direita', offsetM: -0.6, widthM: 1.2, heightM: 1.0, sillM: 1.1 },
      { type: 'passagem', wall: 'frente', offsetM: -0.8, widthM: 0.9, heightM: 2.1, sillM: 0 },
    ],
    items: [
      { kind: 'geladeira', fx: -0.72, fz: -0.81, rot: 0, tone: 'steel', material: 'metal', ref: 'Eletrodomésticos aparentes' },
      { kind: 'pia', fx: -0.2, fz: -0.86, rot: 0, tone: 'white', material: 'pedra', ref: 'Bancada' },
      { kind: 'bancada', fx: 0.32, fz: -0.86, rot: 0, size: [0.75, 0.6, 0.9], tone: 0, material: 'laca', ref: 'Armários' },
      { kind: 'fogao', fx: 0.78, fz: -0.86, rot: 0, tone: 'steel', material: 'metal', ref: 'Eletrodomésticos aparentes' },
      { kind: 'armario_aereo', fx: 0.2, fz: -0.92, rot: 0, size: [2.0, 0.35, 0.7], tone: 0, material: 'laca', ref: 'Armários' },
      { kind: 'mesa_jantar', fx: 0, fz: 0.25, size: [1.2, 0.8, 0.76], tone: 'wood', material: 'madeira', ref: 'Mesa ou banquetas', variants: ['A', 'B'] },
      { kind: 'cadeira', fx: -0.2, fz: 0.05, rot: 0, tone: 1, material: 'madeira', variants: ['A', 'B'] },
      { kind: 'cadeira', fx: 0.2, fz: 0.5, rot: 180, tone: 1, material: 'madeira', variants: ['A', 'B'] },
      { kind: 'ilha', fx: 0, fz: 0.15, size: [1.6, 0.85, 0.92], tone: 2, material: 'pedra', ref: 'Ilha ou península', variants: ['C'] },
      { kind: 'banqueta', fx: -0.25, fz: 0.5, tone: 'wood', material: 'madeira', variants: ['C'] },
      { kind: 'banqueta', fx: 0.25, fz: 0.5, tone: 'wood', material: 'madeira', variants: ['C'] },
      { kind: 'pendente', fx: 0, fz: 0.2, tone: 'metal', material: 'metal', ref: 'Iluminação' },
      { kind: 'prateleira', fx: -0.98, fz: 0.2, rot: 90, size: [1.0, 0.25, 0.04], elevation: 1.5, tone: 'wood', material: 'madeira', ref: 'Prateleiras' },
      { kind: 'planta', fx: 0.8, fz: 0.85, tone: 'plant', material: 'vegetal', variants: ['B', 'C'] },
    ],
  },
  banheiro: {
    dims: { widthM: 2.0, lengthM: 2.6, heightM: 2.5 },
    floor: { material: 'porcelanato', color: '#D8D2C8' },
    openings: [
      { type: 'janela', wall: 'esquerda', offsetM: 0.3, widthM: 0.6, heightM: 0.5, sillM: 1.6 },
      { type: 'porta', wall: 'frente', offsetM: -0.4, widthM: 0.7, heightM: 2.1, sillM: 0 },
    ],
    items: [
      { kind: 'gabinete_banheiro', fx: -0.4, fz: -0.81, rot: 0, tone: 'wood', material: 'madeira', ref: 'Gabinete e bancada' },
      { kind: 'espelho', fx: -0.4, fz: -0.99, size: [0.7, 0.03, 0.9], elevation: 1.0, tone: 'white', material: 'vidro', ref: 'Espelho' },
      { kind: 'vaso_sanitario', fx: 0.52, fz: -0.76, rot: 0, tone: 'white', material: 'ceramica' },
      { kind: 'box_chuveiro', fx: 0.5, fz: 0.55, rot: 0, tone: 'white', material: 'vidro', ref: 'Box' },
      { kind: 'prateleira', fx: -0.97, fz: 0.0, rot: 90, size: [0.6, 0.2, 0.04], elevation: 1.3, tone: 'wood', material: 'madeira', ref: 'Nichos' },
      { kind: 'tapete', fx: -0.3, fz: -0.35, size: [0.8, 0.5, 0.02], tone: 1, material: 'tecido', ref: 'Acessórios' },
      { kind: 'planta', fx: -0.8, fz: 0.75, size: [0.3, 0.3, 0.6], tone: 'plant', material: 'vegetal', variants: ['B', 'C'] },
      { kind: 'pendente', fx: -0.4, fz: -0.6, size: [0.25, 0.25, 0.3], tone: 'metal', material: 'metal', variants: ['C'], ref: 'Iluminação' },
    ],
  },
  escritorio: {
    dims: { widthM: 3.0, lengthM: 3.2, heightM: 2.6 },
    floor: { material: 'madeira', color: '#A98563' },
    openings: [
      { type: 'janela', wall: 'esquerda', offsetM: -0.5, widthM: 1.4, heightM: 1.2, sillM: 0.95 },
      { type: 'porta', wall: 'frente', offsetM: 0.9, widthM: 0.8, heightM: 2.1, sillM: 0 },
    ],
    items: [
      { kind: 'escrivaninha', fx: 0, fz: -0.8, rot: 0, size: [1.4, 0.65, 0.75], tone: 'wood', material: 'madeira', ref: 'Mesa de trabalho' },
      { kind: 'cadeira', fx: 0, fz: -0.42, rot: 180, tone: 2, material: 'tecido', ref: 'Cadeira' },
      { kind: 'estante', fx: 0.88, fz: -0.1, rot: 270, tone: 'wood', material: 'madeira', ref: 'Estante ou prateleiras' },
      { kind: 'tapete', fx: 0, fz: -0.25, size: [1.8, 1.3, 0.02], tone: 0, material: 'tecido', ref: 'Tapete' },
      { kind: 'luminaria_piso', fx: -0.75, fz: -0.8, tone: 'metal', material: 'metal', ref: 'Iluminação' },
      { kind: 'planta', fx: 0.75, fz: 0.8, tone: 'plant', material: 'vegetal' },
      { kind: 'poltrona', fx: -0.6, fz: 0.55, rot: 45, tone: 1, material: 'tecido', ref: 'Poltrona de leitura', variants: ['B', 'C'] },
      { kind: 'prateleira', fx: 0, fz: -0.99, size: [1.2, 0.25, 0.04], elevation: 1.5, tone: 'wood', material: 'madeira', variants: ['A', 'B'] },
      { kind: 'quadro', fx: 0, fz: -0.99, size: [1.0, 0.04, 0.6], elevation: 1.5, tone: 3, material: 'madeira', variants: ['C'] },
    ],
  },
  varanda: {
    dims: { widthM: 2.6, lengthM: 4.2, heightM: 2.6 },
    floor: { material: 'madeira', color: '#8E6B4C' },
    openings: [{ type: 'porta_vidro', wall: 'frente', offsetM: 0, widthM: 2.0, heightM: 2.2, sillM: 0 }],
    items: [
      { kind: 'poltrona', fx: -0.45, fz: -0.55, rot: 45, tone: 1, material: 'fibra', ref: 'Mobiliário externo' },
      { kind: 'poltrona', fx: 0.45, fz: -0.55, rot: 315, tone: 1, material: 'fibra', ref: 'Mobiliário externo' },
      { kind: 'mesa_lateral', fx: 0, fz: -0.62, tone: 'wood', material: 'madeira', ref: 'Mobiliário externo' },
      { kind: 'planta', fx: -0.8, fz: -0.88, size: [0.5, 0.5, 1.4], tone: 'plant', material: 'vegetal', ref: 'Plantas ou jardim vertical' },
      { kind: 'planta', fx: 0.8, fz: -0.88, tone: 'plant', material: 'vegetal', ref: 'Plantas ou jardim vertical' },
      { kind: 'planta', fx: 0.8, fz: 0.2, size: [0.4, 0.4, 0.8], tone: 'plant', material: 'vegetal', variants: ['B', 'C'] },
      { kind: 'tapete', fx: 0, fz: -0.45, size: [1.8, 1.2, 0.02], tone: 0, material: 'fibra' },
      { kind: 'rede', fx: 0, fz: 0.3, rot: 90, size: [2.2, 0.8, 1.2], tone: 2, material: 'tecido', ref: 'Rede ou balanço', variants: ['C'] },
      { kind: 'banco', fx: -0.82, fz: 0.25, rot: 90, tone: 'wood', material: 'madeira', variants: ['A', 'B'] },
      { kind: 'pendente', fx: 0, fz: -0.45, tone: 'metal', material: 'fibra', ref: 'Iluminação', variants: ['B', 'C'] },
    ],
  },
  area_gourmet: {
    dims: { widthM: 3.6, lengthM: 4.5, heightM: 2.7 },
    floor: { material: 'porcelanato', color: '#BDB2A4' },
    openings: [{ type: 'porta_vidro', wall: 'direita', offsetM: 0.2, widthM: 1.8, heightM: 2.2, sillM: 0 }],
    items: [
      { kind: 'churrasqueira', fx: -0.7, fz: -0.87, rot: 0, tone: 3, material: 'pedra', ref: 'Churrasqueira e coifa' },
      { kind: 'bancada', fx: 0.3, fz: -0.87, rot: 0, size: [2.0, 0.6, 0.9], tone: 0, material: 'pedra', ref: 'Bancada' },
      { kind: 'armario_aereo', fx: 0.3, fz: -0.92, size: [2.0, 0.35, 0.7], tone: 'wood', material: 'madeira', ref: 'Armários' },
      { kind: 'mesa_jantar', fx: 0, fz: 0.25, size: [1.8, 0.9, 0.76], tone: 'wood', material: 'madeira', ref: 'Mesa e cadeiras' },
      { kind: 'cadeira', fx: -0.25, fz: 0.07, rot: 0, tone: 1, material: 'fibra', ref: 'Mesa e cadeiras' },
      { kind: 'cadeira', fx: 0.25, fz: 0.07, rot: 0, tone: 1, material: 'fibra', ref: 'Mesa e cadeiras' },
      { kind: 'cadeira', fx: -0.25, fz: 0.43, rot: 180, tone: 1, material: 'fibra', ref: 'Mesa e cadeiras' },
      { kind: 'cadeira', fx: 0.25, fz: 0.43, rot: 180, tone: 1, material: 'fibra', ref: 'Mesa e cadeiras' },
      { kind: 'pendente', fx: -0.15, fz: 0.25, tone: 'metal', material: 'metal', ref: 'Iluminação' },
      { kind: 'pendente', fx: 0.15, fz: 0.25, tone: 'metal', material: 'metal', ref: 'Iluminação', variants: ['B', 'C'] },
      { kind: 'planta', fx: -0.85, fz: 0.85, tone: 'plant', material: 'vegetal' },
      { kind: 'banqueta', fx: 0.2, fz: -0.55, rot: 180, tone: 'wood', material: 'madeira', ref: 'Banquetas', variants: ['C'] },
      { kind: 'banqueta', fx: 0.55, fz: -0.55, rot: 180, tone: 'wood', material: 'madeira', ref: 'Banquetas', variants: ['C'] },
    ],
  },
  outro: {
    dims: { widthM: 3.5, lengthM: 4.0, heightM: 2.7 },
    floor: { material: 'madeira', color: '#AD8A68' },
    openings: [
      { type: 'janela', wall: 'esquerda', offsetM: -0.4, widthM: 1.5, heightM: 1.3, sillM: 0.9 },
      { type: 'porta', wall: 'frente', offsetM: 1.0, widthM: 0.8, heightM: 2.1, sillM: 0 },
    ],
    items: [
      { kind: 'aparador', fx: 0, fz: -0.89, rot: 0, tone: 'wood', material: 'madeira', ref: 'Móveis principais' },
      { kind: 'quadro', fx: 0, fz: -0.99, size: [1.0, 0.04, 0.7], elevation: 1.4, tone: 3, material: 'madeira', ref: 'Decoração' },
      { kind: 'poltrona', fx: -0.45, fz: -0.1, rot: 30, tone: 1, material: 'tecido', ref: 'Móveis principais' },
      { kind: 'poltrona', fx: 0.45, fz: -0.1, rot: 330, tone: 1, material: 'tecido', variants: ['B', 'C'] },
      { kind: 'tapete', fx: 0, fz: -0.1, size: [2.0, 1.5, 0.02], tone: 0, material: 'tecido', ref: 'Tapete' },
      { kind: 'estante', fx: 0.88, fz: 0.2, rot: 270, tone: 'wood', material: 'madeira', ref: 'Armazenamento' },
      { kind: 'luminaria_piso', fx: -0.8, fz: -0.85, tone: 'metal', material: 'metal', ref: 'Iluminação' },
      { kind: 'planta', fx: 0.8, fz: -0.85, tone: 'plant', material: 'vegetal' },
      { kind: 'cortina', fx: -0.97, fz: -0.2, rot: 90, size: [2.0, 0.12, 2.45], tone: 0, material: 'tecido', ref: 'Cortinas' },
    ],
  },
};

const TONE_FALLBACK = { wood: '#9C7350', metal: '#2E2B28', steel: '#C9CDD0', plant: '#5E7A4F', white: '#F2EFEA' } as const;

export function templateDimensions(roomType: RoomTypeId) {
  return T[roomType].dims;
}

export type TemplateOptions = {
  roomType: RoomTypeId;
  variant: 'A' | 'B' | 'C';
  /** Palette hex colors: [base, secondary, accent, deep]. */
  palette: readonly string[];
  wallColor: string;
  accentWallColor: string | null;
  floorColor?: string;
  dims?: { widthM?: number; lengthM?: number; heightM?: number };
  /** Furniture decisions keyed by catalog label (from the questionnaire). */
  decisions?: Record<string, FurnitureDecisionId>;
};

/** Catalog items (by label) that the template shows for a room and variant. */
export function templateRefs(roomType: RoomTypeId, variant: 'A' | 'B' | 'C'): string[] {
  return T[roomType].items.filter((i) => i.ref && (!i.variants || i.variants.includes(variant))).map((i) => i.ref!);
}

function statusFor(item: TemplateItem, variant: 'A' | 'B' | 'C', decisions: TemplateOptions['decisions']): ItemStatus {
  const decision = item.ref ? decisions?.[item.ref] : undefined;
  if (decision === 'nao_tenho') return 'novo';
  if (decision === 'manter') return 'mantido';
  if (decision === 'reposicionar') return 'reposicionado';
  const onlyInBold = item.variants && !item.variants.includes('A');
  if (onlyInBold) return 'novo';
  if (variant === 'A') return decision === 'substituir' ? 'substituido' : 'mantido';
  if (decision === 'substituir') return 'substituido';
  return variant === 'B' ? (item.tone === 1 || item.tone === 2 ? 'substituido' : 'mantido') : 'substituido';
}

export function buildTemplateScene(options: TemplateOptions): SceneSpec {
  const template = T[options.roomType];
  const dims = {
    widthM: options.dims?.widthM ?? template.dims.widthM,
    lengthM: options.dims?.lengthM ?? template.dims.lengthM,
    heightM: options.dims?.heightM ?? template.dims.heightM,
  };
  const pal = options.palette;
  const color = (tone: TemplateItem['tone']) =>
    typeof tone === 'number' ? (pal[tone] ?? pal[pal.length - 1] ?? '#B9A792') : TONE_FALLBACK[tone];

  const items: SceneItem[] = template.items
    .filter((item) => !item.variants || item.variants.includes(options.variant))
    .map((item) => {
      const [w, d, h] = item.size ?? SCENE_ITEM_KINDS[item.kind].size;
      return {
        kind: item.kind,
        label: SCENE_ITEM_KINDS[item.kind].label,
        x: (item.fx * dims.widthM) / 2,
        z: (item.fz * dims.lengthM) / 2,
        rotationDeg: item.rot ?? 0,
        widthM: w,
        depthM: d,
        heightM: h,
        elevationM: item.elevation ?? 0,
        color: color(item.tone),
        material: item.material,
        status: statusFor(item, options.variant, options.decisions),
      };
    });

  return normalizeScene({
    room: dims,
    floor: { material: template.floor.material, color: options.floorColor ?? template.floor.color },
    wallColor: options.wallColor,
    accentWall: options.accentWallColor ? { wall: 'fundo', color: options.accentWallColor } : null,
    ceilingColor: '#F7F5F2',
    openings: template.openings,
    items,
  });
}
