import * as THREE from 'three';

import type { SceneItem } from '@/domain/scene';

/**
 * Low-poly procedural furniture. Every model is built in local space with its origin
 * at the bottom center, width along x, depth along z and its FRONT facing +z.
 */

const ROUGHNESS: Record<string, { roughness: number; metalness: number; opacity?: number }> = {
  tecido: { roughness: 0.95, metalness: 0 },
  madeira: { roughness: 0.65, metalness: 0 },
  metal: { roughness: 0.35, metalness: 0.75 },
  couro: { roughness: 0.55, metalness: 0 },
  vidro: { roughness: 0.05, metalness: 0.1, opacity: 0.3 },
  pedra: { roughness: 0.45, metalness: 0 },
  laca: { roughness: 0.3, metalness: 0 },
  fibra: { roughness: 0.9, metalness: 0 },
  ceramica: { roughness: 0.2, metalness: 0 },
  vegetal: { roughness: 0.85, metalness: 0 },
};

export function material(color: string, kind: string = 'tecido') {
  const m = ROUGHNESS[kind] ?? ROUGHNESS.tecido;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: m.roughness,
    metalness: m.metalness,
    transparent: m.opacity !== undefined,
    opacity: m.opacity ?? 1,
  });
}

function shade(color: string, amount: number) {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.005), Math.max(h, 0.005), Math.max(d, 0.005)), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(rTop: number, rBottom: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, segments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(r: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function legs(g: THREE.Group, w: number, d: number, h: number, mat: THREE.Material, size = 0.04, inset = 0.06) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(size, h, size, mat, sx * (w / 2 - inset), 0, sz * (d / 2 - inset)));
}

const DARK_WOOD = '#6B4A33';
const BLACK = '#232120';
const WHITE = '#F4F2EE';

function table(g: THREE.Group, w: number, d: number, h: number, color: string, mat: string) {
  const top = material(color, mat);
  g.add(box(w, 0.04, d, top, 0, h - 0.04, 0));
  legs(g, w, d, h - 0.04, material(mat === 'metal' ? color : shade(color, -0.1), mat));
}

function cabinet(g: THREE.Group, w: number, d: number, h: number, color: string, mat: string, drawers: number) {
  const body = material(color, mat);
  const lineMat = material(shade(color, -0.25), mat);
  const lift = h > 0.6 ? 0.08 : 0.04;
  g.add(box(w, h - lift, d, body, 0, lift, 0));
  legs(g, w, d, lift, material(BLACK, 'metal'), 0.03, 0.05);
  for (let i = 1; i < drawers; i++) g.add(box(w * 0.96, 0.008, 0.01, lineMat, 0, lift + ((h - lift) * i) / drawers, d / 2 + 0.002));
}

function seat(g: THREE.Group, w: number, d: number, h: number, color: string, mat: string, arms: boolean) {
  const fabric = material(color, mat);
  const cushion = material(shade(color, 0.08), mat);
  const seatH = Math.min(0.45, h * 0.5);
  const base = seatH - 0.12;
  legs(g, w, d, 0.08, material(DARK_WOOD, 'madeira'), 0.04, 0.08);
  g.add(box(w, base - 0.08, d, fabric, 0, 0.08, 0));
  const armW = arms ? Math.min(0.2, w * 0.12) : 0;
  const innerW = w - armW * 2;
  const n = Math.max(1, Math.round(innerW / 0.75));
  for (let i = 0; i < n; i++) {
    const cw = innerW / n;
    g.add(box(cw - 0.02, 0.12, d - 0.22, cushion, -innerW / 2 + cw * (i + 0.5), base, 0.08));
  }
  g.add(box(w, h - base, 0.2, fabric, 0, base, -d / 2 + 0.1));
  if (arms) {
    g.add(box(armW, seatH + 0.15 - 0.08, d, fabric, -w / 2 + armW / 2, 0.08, 0));
    g.add(box(armW, seatH + 0.15 - 0.08, d, fabric, w / 2 - armW / 2, 0.08, 0));
  }
}

export type BuiltItem = { group: THREE.Group; lights: THREE.PointLight[] };

export function buildItem(item: SceneItem, ceilingHeight: number): BuiltItem {
  const g = new THREE.Group();
  const lights: THREE.PointLight[] = [];
  const { widthM: w, depthM: d, heightM: h, color } = item;
  const mat = item.material;

  switch (item.kind) {
    case 'sofa':
      seat(g, w, d, h, color, mat, true);
      break;
    case 'poltrona':
      seat(g, w, d, h, color, mat, true);
      break;
    case 'cadeira': {
      const m = material(color, mat);
      g.add(box(w, 0.04, d, m, 0, 0.44, 0));
      legs(g, w, d, 0.44, material(shade(color, -0.15), mat), 0.03, 0.04);
      g.add(box(w, h - 0.48, 0.03, m, 0, 0.48, -d / 2 + 0.03));
      break;
    }
    case 'banqueta': {
      const m = material(color, mat);
      g.add(cylinder(w / 2, w / 2, 0.04, m, 0, h - 0.04, 0));
      legs(g, w * 0.8, d * 0.8, h - 0.04, material(BLACK, 'metal'), 0.025, 0.03);
      break;
    }
    case 'pufe':
      g.add(cylinder(w / 2, w / 2, h, material(color, mat)));
      break;
    case 'banco': {
      const m = material(color, mat);
      g.add(box(w, 0.05, d, m, 0, h - 0.05, 0));
      legs(g, w, d, h - 0.05, m, 0.05, 0.08);
      break;
    }
    case 'mesa_centro':
    case 'mesa_lateral':
    case 'mesa_jantar':
    case 'escrivaninha':
      table(g, w, d, h, color, mat);
      break;
    case 'rack_tv': {
      cabinet(g, w, d, h, color, mat, 2);
      const tvW = Math.min(w * 0.8, 1.6);
      const tvH = tvW * 0.56;
      g.add(box(tvW, tvH, 0.04, material(BLACK, 'vidro'), 0, h + 0.12, -d / 4));
      g.add(box(0.25, 0.12, 0.1, material(BLACK, 'metal'), 0, h, -d / 4));
      break;
    }
    case 'aparador':
    case 'comoda':
    case 'criado_mudo':
    case 'gabinete_banheiro':
      cabinet(g, w, d, h, color, mat, item.kind === 'comoda' ? 4 : 2);
      if (item.kind === 'gabinete_banheiro') {
        g.add(box(w + 0.02, 0.03, d + 0.02, material(WHITE, 'pedra'), 0, h, 0));
        g.add(box(w * 0.5, 0.05, d * 0.5, material('#DCDCDC', 'ceramica'), 0, h + 0.03, 0));
      }
      break;
    case 'guarda_roupa':
    case 'armario':
    case 'armario_aereo': {
      const body = material(color, mat);
      g.add(box(w, h, d, body));
      const doors = Math.max(2, Math.round(w / 0.5));
      const line = material(shade(color, -0.2), mat);
      for (let i = 1; i < doors; i++) g.add(box(0.006, h * 0.96, 0.01, line, -w / 2 + (w * i) / doors, h * 0.02, d / 2 + 0.002));
      const handle = material('#B8B2A8', 'metal');
      for (let i = 0; i < doors; i++) {
        const x = -w / 2 + (w * (i + 0.5)) / doors + (i % 2 === 0 ? w / doors / 2 - 0.05 : -w / doors / 2 + 0.05);
        g.add(box(0.015, Math.min(0.25, h * 0.3), 0.02, handle, x, h * 0.45, d / 2 + 0.01));
      }
      break;
    }
    case 'estante': {
      const m = material(color, mat);
      g.add(box(0.03, h, d, m, -w / 2 + 0.015, 0, 0));
      g.add(box(0.03, h, d, m, w / 2 - 0.015, 0, 0));
      g.add(box(w, h, 0.015, material(shade(color, -0.1), mat), 0, 0, -d / 2 + 0.0075));
      const shelves = Math.max(3, Math.round(h / 0.38));
      for (let i = 0; i <= shelves; i++) g.add(box(w, 0.025, d, m, 0, Math.min(h - 0.025, (h * i) / shelves), 0));
      const book = ['#9A4527', '#4F5D45', '#C9B48A', '#2F5A7A', '#EFE9E1'];
      for (let i = 0; i < shelves; i++) {
        const y = (h * i) / shelves + 0.025;
        const count = 3 + (i % 3);
        for (let b = 0; b < count; b++) {
          g.add(box(0.04, 0.2 + (b % 3) * 0.03, d * 0.7, material(book[(b + i) % book.length], 'madeira'), -w / 2 + 0.12 + b * 0.05, y, 0));
        }
      }
      break;
    }
    case 'tapete':
      g.add(box(w, Math.max(0.012, h), d, material(color, 'tecido')));
      break;
    case 'luminaria_piso': {
      const metal = material(BLACK, 'metal');
      g.add(cylinder(w * 0.35, w * 0.4, 0.03, metal));
      g.add(cylinder(0.012, 0.012, h - 0.3, metal, 0, 0.03, 0, 8));
      const shadeMat = new THREE.MeshStandardMaterial({ color: '#F3E3C8', emissive: '#FFD9A0', emissiveIntensity: 0.6, roughness: 0.9, side: THREE.DoubleSide });
      g.add(cylinder(w * 0.32, w * 0.45, 0.3, shadeMat, 0, h - 0.3, 0));
      const light = new THREE.PointLight('#FFD39B', 1.4, 5, 2);
      light.position.set(0, h - 0.2, 0);
      lights.push(light);
      g.add(light);
      break;
    }
    case 'pendente': {
      const cord = ceilingHeight - (item.elevationM + h);
      if (cord > 0.02) g.add(cylinder(0.006, 0.006, cord, material(BLACK, 'metal'), 0, h, 0, 6));
      const shadeMat = new THREE.MeshStandardMaterial({ color: color, emissive: '#FFD9A0', emissiveIntensity: 0.5, roughness: 0.6, side: THREE.DoubleSide });
      g.add(cylinder(w * 0.15, w / 2, h, shadeMat));
      const light = new THREE.PointLight('#FFD39B', 1.6, 6, 2);
      light.position.set(0, -0.05, 0);
      lights.push(light);
      g.add(light);
      break;
    }
    case 'planta': {
      const potH = Math.min(0.45, h * 0.32);
      g.add(cylinder(w * 0.3, w * 0.24, potH, material('#C8A27A', 'ceramica')));
      const leaf = material(item.color && item.color !== '#B9A792' ? item.color : '#5E7A4F', 'vegetal');
      const leaf2 = material('#6E8C5C', 'vegetal');
      const r = w * 0.42;
      g.add(sphere(r, leaf, 0, potH + (h - potH) * 0.55, 0));
      g.add(sphere(r * 0.75, leaf2, -r * 0.45, potH + (h - potH) * 0.75, r * 0.2));
      g.add(sphere(r * 0.7, leaf, r * 0.5, potH + (h - potH) * 0.7, -r * 0.2));
      break;
    }
    case 'quadro': {
      const depth = Math.max(d, 0.025);
      g.add(box(w, h, depth, material(DARK_WOOD, 'madeira')));
      g.add(box(w * 0.9, h * 0.86, 0.01, material('#F1E9DC', 'tecido'), 0, h * 0.07, depth / 2));
      // Abstract artwork in the item's color.
      const art = new THREE.Mesh(new THREE.CircleGeometry(Math.min(w, h) * 0.28, 32), material(color, 'tecido'));
      art.position.set(-w * 0.12, h * 0.5, depth / 2 + 0.012);
      g.add(art);
      g.add(box(w * 0.32, h * 0.08, 0.004, material(shade(color, -0.2), 'tecido'), w * 0.18, h * 0.3, depth / 2 + 0.01));
      break;
    }
    case 'espelho': {
      g.add(box(w, h, Math.max(d, 0.02), material('#B8B2A8', 'metal')));
      g.add(box(w * 0.92, h * 0.94, 0.005, new THREE.MeshStandardMaterial({ color: '#DDE6EA', metalness: 0.9, roughness: 0.05 }), 0, h * 0.03, Math.max(d, 0.02) / 2));
      break;
    }
    case 'cortina': {
      const m = material(color, 'tecido');
      const pleats = Math.max(4, Math.round(w / 0.18));
      for (let i = 0; i < pleats; i++) {
        const x = -w / 2 + (w * (i + 0.5)) / pleats;
        g.add(box(w / pleats + 0.01, h, d * (i % 2 === 0 ? 1 : 0.5), m, x, 0, 0));
      }
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 0.2, 8), material(BLACK, 'metal'));
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, h + 0.02, 0);
      g.add(rod);
      break;
    }
    case 'cama': {
      const frame = material(shade(color, -0.25), 'madeira');
      g.add(box(w, 0.3, d, frame));
      g.add(box(w - 0.04, 0.22, d - 0.06, material(WHITE, 'tecido'), 0, 0.3, 0.02));
      g.add(box(w - 0.02, 0.06, d * 0.65, material(color, 'tecido'), 0, 0.5, d * 0.17));
      g.add(box(w + 0.04, 1.05, 0.08, material(shade(color, -0.12), 'tecido'), 0, 0, -d / 2 + 0.04));
      for (const sx of [-1, 1]) g.add(box(w * 0.38, 0.12, 0.35, material('#FFFFFF', 'tecido'), sx * w * 0.22, 0.52, -d / 2 + 0.3));
      break;
    }
    case 'bancada':
    case 'pia':
    case 'ilha': {
      const body = material(color, mat === 'pedra' ? 'laca' : mat);
      g.add(box(w, h - 0.04, d, body, 0, 0, 0));
      g.add(box(w + 0.02, 0.04, d + (item.kind === 'ilha' ? 0.25 : 0.02), material(item.kind === 'ilha' ? shade(color, 0.25) : '#EDEAE4', 'pedra'), 0, h - 0.04, item.kind === 'ilha' ? 0.11 : 0));
      if (item.kind === 'pia') {
        g.add(box(w * 0.55, 0.012, d * 0.55, material('#9EA3A6', 'metal'), 0, h, 0));
        g.add(cylinder(0.015, 0.015, 0.28, material('#C9CED1', 'metal'), 0, h, -d / 2 + 0.08, 8));
      }
      const line = material(shade(color, -0.2), 'laca');
      const doors = Math.max(1, Math.round(w / 0.45));
      for (let i = 1; i < doors; i++) g.add(box(0.006, h - 0.1, 0.01, line, -w / 2 + (w * i) / doors, 0.04, d / 2 + 0.002));
      break;
    }
    case 'fogao': {
      g.add(box(w, h - 0.02, d, material('#D9DADB', 'metal')));
      g.add(box(w, 0.02, d, material(BLACK, 'vidro'), 0, h - 0.02, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cylinder(0.07, 0.07, 0.012, material('#3A3A3A', 'metal'), sx * w * 0.24, h, sz * d * 0.22, 16));
      g.add(box(w * 0.85, 0.35, 0.01, material(BLACK, 'vidro'), 0, h * 0.25, d / 2 + 0.002));
      break;
    }
    case 'geladeira': {
      const m = material(color === '#B9A792' ? '#CFD3D6' : color, 'metal');
      g.add(box(w, h, d, m));
      g.add(box(w * 0.98, 0.008, 0.01, material('#8C9194', 'metal'), 0, h * 0.62, d / 2 + 0.002));
      g.add(box(0.02, 0.4, 0.03, material('#8C9194', 'metal'), w / 2 - 0.08, h * 0.68, d / 2 + 0.015));
      g.add(box(0.02, 0.3, 0.03, material('#8C9194', 'metal'), w / 2 - 0.08, h * 0.25, d / 2 + 0.015));
      break;
    }
    case 'vaso_sanitario': {
      const porcelain = material(WHITE, 'ceramica');
      g.add(cylinder(w * 0.32, w * 0.26, 0.4, porcelain, 0, 0, d * 0.1));
      g.add(box(w, 0.04, d * 0.62, porcelain, 0, 0.4, d * 0.1));
      g.add(box(w * 0.95, h - 0.42, 0.18, porcelain, 0, 0.42, -d / 2 + 0.09));
      break;
    }
    case 'box_chuveiro': {
      const glass = material('#CFE3EA', 'vidro');
      g.add(box(w, 0.05, d, material('#E9E7E3', 'pedra')));
      g.add(box(w, h - 0.05, 0.01, glass, 0, 0.05, d / 2));
      g.add(box(0.01, h - 0.05, d, glass, -w / 2, 0.05, 0));
      g.add(cylinder(0.1, 0.1, 0.02, material('#C9CED1', 'metal'), 0, h - 0.1, -d / 2 + 0.15, 16));
      break;
    }
    case 'banheira': {
      g.add(box(w, h, d, material(WHITE, 'ceramica')));
      g.add(box(w - 0.12, 0.02, d - 0.12, material('#DCE7EC', 'ceramica'), 0, h - 0.01, 0));
      break;
    }
    case 'prateleira': {
      const m = material(color, mat);
      g.add(box(w, Math.max(0.025, h), d, m));
      for (let i = 0; i < 3; i++) g.add(box(0.06, 0.1 + i * 0.03, 0.06, material(['#9A4527', '#4F5D45', '#EFE9E1'][i], 'ceramica'), -w / 2 + 0.15 + i * (w / 3.5), Math.max(0.025, h), 0));
      break;
    }
    case 'churrasqueira': {
      const brick = material(color, 'pedra');
      g.add(box(w, h * 0.45, d, brick));
      g.add(box(w * 0.8, h * 0.22, 0.02, material(BLACK, 'metal'), 0, h * 0.18, d / 2 + 0.002));
      g.add(box(w * 0.9, h * 0.25, d * 0.7, brick, 0, h * 0.45, -d * 0.15));
      g.add(box(w * 0.5, h * 0.3, d * 0.4, material(shade(color, -0.15), 'pedra'), 0, h * 0.7, -d * 0.2));
      break;
    }
    case 'rede': {
      const rope = material('#8C6E50', 'fibra');
      g.add(box(w * 0.7, 0.04, d, material(color, 'tecido'), 0, h * 0.45, 0));
      for (const sx of [-1, 1]) g.add(cylinder(0.01, 0.01, h * 0.55, rope, sx * w * 0.42, h * 0.45, 0, 6));
      break;
    }
    default: {
      g.add(box(w, h, d, material(color, mat)));
    }
  }
  return { group: g, lights };
}
