import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { SceneSpec, Wall } from '@/domain/scene';

import { STATUS_COLORS, STATUS_LABELS, type CameraPreset, type HostToViewer, type ViewerToHost } from '../protocol';
import { buildItem } from './models';

/**
 * Parametric 3D room viewer. Runs inside a WebView (native) or an iframe (web) and
 * talks to the app through JSON messages (see ../protocol.ts).
 */

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
    __AMBIENTA_VIEWER__?: { receive: (message: HostToViewer) => void };
    __AMBIENTA_INITIAL__?: HostToViewer;
  }
}

function post(message: ViewerToHost) {
  const data = JSON.stringify(message);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
  else if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'ambienta-viewer', payload: data }, '*');
}

const WALL_THICKNESS = 0.1;
const container = document.getElementById('app') as HTMLDivElement;
const label = document.getElementById('label') as HTMLDivElement;

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch {
  container.innerHTML = '<p class="error">Este aparelho não conseguiu iniciar o 3D (WebGL indisponível).</p>';
  post({ type: 'error', message: 'WebGL indisponível neste aparelho.' });
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#EDE7DF');
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.screenSpacePanning = true;

const hemi = new THREE.HemisphereLight('#FFF7EC', '#B8A58E', 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#FFF2DE', 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.bias = -0.0005;
scene.add(sun);
scene.add(sun.target);

let roomGroup = new THREE.Group();
scene.add(roomGroup);
let current: SceneSpec | null = null;
let highlight = false;
let selectedIndex: number | null = null;
const walls: { mesh: THREE.Object3D; side: Wall | 'ceiling' }[] = [];
const itemGroups: THREE.Group[] = [];
let needsRender = true;
let anim: { from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; start: number } | null = null;

function disposeGroup(group: THREE.Object3D) {
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
  });
}

function floorTexture(material: string, color: string) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  if (material === 'madeira' || material === 'vinilico') {
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * size) / 8);
      ctx.lineTo(size, (i * size) / 8);
      ctx.stroke();
      const offset = (i % 2) * (size / 2);
      ctx.beginPath();
      ctx.moveTo(offset + size / 4, (i * size) / 8);
      ctx.lineTo(offset + size / 4, ((i + 1) * size) / 8);
      ctx.stroke();
    }
  } else if (material === 'porcelanato' || material === 'ceramica' || material === 'pedra') {
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * size) / 4, 0);
      ctx.lineTo((i * size) / 4, size);
      ctx.moveTo(0, (i * size) / 4);
      ctx.lineTo(size, (i * size) / 4);
      ctx.stroke();
    }
  } else {
    return null;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A wall as an extruded shape with rectangular holes for doors and windows. */
function buildWall(spec: SceneSpec, side: Wall, color: string) {
  const { widthM: W, lengthM: L, heightM: H } = spec.room;
  const length = side === 'fundo' || side === 'frente' ? W : L;
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0);
  shape.lineTo(length / 2, 0);
  shape.lineTo(length / 2, H);
  shape.lineTo(-length / 2, H);
  shape.lineTo(-length / 2, 0);

  const group = new THREE.Group();
  const openings = spec.openings.filter((o) => o.wall === side);
  for (const o of openings) {
    // Local x runs left→right as seen from inside the room, facing the wall.
    const sign = side === 'frente' || side === 'esquerda' ? -1 : 1;
    const cx = sign * o.offsetM;
    const hole = new THREE.Path();
    const x0 = cx - o.widthM / 2;
    const x1 = cx + o.widthM / 2;
    const y0 = o.sillM;
    const y1 = Math.min(H - 0.02, o.sillM + o.heightM);
    hole.moveTo(x0, y0);
    hole.lineTo(x1, y0);
    hole.lineTo(x1, y1);
    hole.lineTo(x0, y1);
    hole.lineTo(x0, y0);
    shape.holes.push(hole);

    const frameMat = new THREE.MeshStandardMaterial({ color: '#F5F2EC', roughness: 0.5 });
    const midZ = -WALL_THICKNESS / 2;
    const frameDepth = WALL_THICKNESS + 0.03;
    const t = 0.05;
    const ow = o.widthM;
    const oh = y1 - y0;
    const frame = [
      [cx, y1 + t / 2, ow + 2 * t, t],
      [cx - ow / 2 - t / 2, (y0 + y1) / 2, t, oh],
      [cx + ow / 2 + t / 2, (y0 + y1) / 2, t, oh],
    ];
    if (y0 > 0.01) frame.push([cx, y0 - t / 2, ow + 2 * t, t]);
    for (const [fx, fy, fw, fh] of frame) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, frameDepth), frameMat);
      piece.position.set(fx, fy, midZ);
      group.add(piece);
    }
    if (o.type === 'janela' || o.type === 'porta_vidro') {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(ow, oh),
        new THREE.MeshStandardMaterial({ color: '#CFE6F2', emissive: '#BFE0F5', emissiveIntensity: 0.55, transparent: true, opacity: 0.5, roughness: 0.05, side: THREE.DoubleSide }),
      );
      glass.position.set(cx, (y0 + y1) / 2, midZ);
      group.add(glass);
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.03, oh, 0.04), frameMat);
      mullion.position.set(cx, (y0 + y1) / 2, midZ);
      group.add(mullion);
    } else if (o.type === 'porta') {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(ow - 0.02, oh - 0.01, 0.04), new THREE.MeshStandardMaterial({ color: '#E9E1D5', roughness: 0.6 }));
      leaf.position.set(cx, (y0 + y1) / 2, midZ - 0.02);
      group.add(leaf);
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: WALL_THICKNESS, bevelEnabled: false });
  geometry.translate(0, 0, -WALL_THICKNESS);
  const wall = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.92 }));
  wall.receiveShadow = true;
  group.add(wall);

  // Place the wall so its inner face is on the room boundary, facing the room center.
  switch (side) {
    case 'fundo':
      group.position.set(0, 0, -L / 2);
      break;
    case 'frente':
      group.position.set(0, 0, L / 2);
      group.rotation.y = Math.PI;
      break;
    case 'esquerda':
      group.position.set(-W / 2, 0, 0);
      group.rotation.y = Math.PI / 2;
      break;
    case 'direita':
      group.position.set(W / 2, 0, 0);
      group.rotation.y = -Math.PI / 2;
      break;
  }
  return group;
}

function applyHighlight() {
  itemGroups.forEach((group, index) => {
    const status = current?.items[index]?.status ?? 'mantido';
    const tint = new THREE.Color(STATUS_COLORS[status] ?? '#999999');
    const isSelected = index === selectedIndex;
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mat || !('emissive' in mat) || mat.userData.keepEmissive) return;
      if (isSelected) {
        mat.emissive.set('#FFB36B');
        mat.emissiveIntensity = 0.45;
      } else if (highlight && status !== 'mantido') {
        mat.emissive.copy(tint);
        mat.emissiveIntensity = 0.55;
      } else {
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    });
  });
  needsRender = true;
}

function build(spec: SceneSpec) {
  disposeGroup(roomGroup);
  scene.remove(roomGroup);
  roomGroup = new THREE.Group();
  scene.add(roomGroup);
  walls.length = 0;
  itemGroups.length = 0;
  selectedIndex = null;
  current = spec;

  const { widthM: W, lengthM: L, heightM: H } = spec.room;
  const floorMat = new THREE.MeshStandardMaterial({ color: spec.floor.color, roughness: spec.floor.material === 'porcelanato' ? 0.35 : 0.75 });
  const texture = floorTexture(spec.floor.material, spec.floor.color);
  if (texture) {
    texture.repeat.set(W / 1.6, L / 1.6);
    floorMat.map = texture;
    floorMat.color.set('#FFFFFF');
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: spec.ceilingColor, roughness: 0.95, side: THREE.BackSide }));
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.y = H;
  roomGroup.add(ceiling);
  walls.push({ mesh: ceiling, side: 'ceiling' });

  for (const side of ['fundo', 'frente', 'esquerda', 'direita'] as Wall[]) {
    const color = spec.accentWall?.wall === side ? spec.accentWall.color : spec.wallColor;
    const wall = buildWall(spec, side, color);
    roomGroup.add(wall);
    walls.push({ mesh: wall, side });
  }

  // A soft "outside" ground so the dollhouse view does not float in the void.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(Math.max(W, L) * 2.2, 48), new THREE.MeshStandardMaterial({ color: '#E3DBD0', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  roomGroup.add(ground);

  let lightCount = 0;
  spec.items.forEach((item, index) => {
    const { group, lights } = buildItem(item, H);
    // Keep only a few point lights for mobile GPUs.
    for (const light of lights) {
      if (lightCount >= 4) light.intensity = 0;
      lightCount++;
    }
    group.position.set(item.x, item.elevationM, item.z);
    group.rotation.y = (item.rotationDeg * Math.PI) / 180;
    group.userData.index = index;
    group.traverse((o) => {
      o.userData.index = index;
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      // Lamps glow on purpose: keep their emissive color when highlighting.
      if (mat && 'emissive' in mat && mat.emissive.getHex() !== 0) mat.userData.keepEmissive = true;
    });
    roomGroup.add(group);
    itemGroups.push(group);
  });

  const span = Math.max(W, L);
  sun.position.set(W * 0.8, H * 3, L * 0.6);
  sun.target.position.set(0, 0, 0);
  const cam = sun.shadow.camera as THREE.OrthographicCamera;
  cam.left = -span;
  cam.right = span;
  cam.top = span;
  cam.bottom = -span;
  cam.near = 0.5;
  cam.far = H * 6 + span * 2;
  cam.updateProjectionMatrix();

  controls.maxDistance = span * 4;
  controls.minDistance = 0.4;
  applyHighlight();
  post({ type: 'rendered', items: spec.items.length });
}

function presetPose(preset: CameraPreset) {
  if (!current) return null;
  const { widthM: W, lengthM: L, heightM: H } = current.room;
  const span = Math.max(W, L);
  switch (preset) {
    case 'photo':
      // Roughly where the photo was taken: behind the room center, at eye height.
      return { position: new THREE.Vector3(0, 1.55, L / 2 - 0.25), target: new THREE.Vector3(0, 1.2, -L / 2) };
    case 'top':
      return { position: new THREE.Vector3(0, span * 1.9, 0.01), target: new THREE.Vector3(0, 0, 0) };
    case 'overview':
    default:
      return { position: new THREE.Vector3(W * 0.55, H + span * 1.15, L / 2 + span * 0.95), target: new THREE.Vector3(0, H * 0.3, 0) };
  }
}

function moveCamera(preset: CameraPreset, instant = false) {
  const pose = presetPose(preset);
  if (!pose) return;
  if (instant) {
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    controls.update();
    needsRender = true;
    return;
  }
  anim = { from: camera.position.clone(), to: pose.position, fromT: controls.target.clone(), toT: pose.target, start: performance.now() };
}

/** Hides walls between the camera and the room (dollhouse cut-away). */
function updateWallVisibility() {
  if (!current) return;
  const { widthM: W, lengthM: L, heightM: H } = current.room;
  const p = camera.position;
  for (const { mesh, side } of walls) {
    let visible = true;
    if (side === 'ceiling') visible = p.y < H;
    if (side === 'frente') visible = p.z < L / 2;
    if (side === 'fundo') visible = p.z > -L / 2;
    if (side === 'esquerda') visible = p.x > -W / 2;
    if (side === 'direita') visible = p.x < W / 2;
    mesh.visible = visible;
  }
}

function resize() {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  renderer.domElement.style.width = `${width}px`;
  renderer.domElement.style.height = `${height}px`;
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  needsRender = true;
}
window.addEventListener('resize', resize);
resize();

controls.addEventListener('change', () => {
  needsRender = true;
});

function tick(now: number) {
  requestAnimationFrame(tick);
  if (anim) {
    const t = Math.min(1, (now - anim.start) / 650);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(anim.from, anim.to, e);
    controls.target.lerpVectors(anim.fromT, anim.toT, e);
    if (t >= 1) anim = null;
    needsRender = true;
  }
  const changed = controls.update();
  if (changed || needsRender) {
    updateWallVisibility();
    renderer.render(scene, camera);
    needsRender = false;
  }
}
requestAnimationFrame(tick);

// Tap to select an item (ignores drags).
const raycaster = new THREE.Raycaster();
let down: { x: number; y: number; time: number } | null = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, time: performance.now() };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.time > 500) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(itemGroups, true).filter((h) => h.object.visible);
  const index = hits.length ? (hits[0].object.userData.index as number) : null;
  select(index ?? null);
});

function select(index: number | null) {
  selectedIndex = index;
  applyHighlight();
  const item = index !== null && current ? current.items[index] : null;
  if (item) {
    label.textContent = `${item.label} · ${STATUS_LABELS[item.status] ?? item.status}`;
    label.style.display = 'block';
    post({
      type: 'select',
      item: { index: index!, label: item.label, kind: item.kind, status: item.status, widthM: item.widthM, depthM: item.depthM, heightM: item.heightM },
    });
  } else {
    label.style.display = 'none';
    post({ type: 'select', item: null });
  }
}

function focus(index: number | null) {
  select(index);
  if (index === null || !current) return;
  const item = current.items[index];
  const target = new THREE.Vector3(item.x, item.elevationM + item.heightM / 2, item.z);
  const distance = Math.max(1.2, Math.max(item.widthM, item.depthM, item.heightM) * 2.2);
  const angle = (item.rotationDeg * Math.PI) / 180;
  const position = new THREE.Vector3(item.x + Math.sin(angle) * distance, Math.max(0.9, item.elevationM + item.heightM + distance * 0.45), item.z + Math.cos(angle) * distance);
  anim = { from: camera.position.clone(), to: position, fromT: controls.target.clone(), toT: target, start: performance.now() };
}

function receive(message: HostToViewer) {
  try {
    if (message.type === 'scene') {
      highlight = message.highlight;
      const first = !current;
      build(message.scene);
      moveCamera(message.camera ?? 'overview', first);
    } else if (message.type === 'camera') {
      moveCamera(message.preset);
    } else if (message.type === 'highlight') {
      highlight = message.enabled;
      applyHighlight();
    } else if (message.type === 'focus') {
      focus(message.index);
    }
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : 'Erro no visualizador 3D.' });
  }
}

window.__AMBIENTA_VIEWER__ = { receive };
window.addEventListener('message', (event: MessageEvent) => {
  const data = typeof event.data === 'string' ? safeParse(event.data) : event.data;
  if (data && typeof data === 'object' && 'type' in data) receive(data as HostToViewer);
});

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

if (window.__AMBIENTA_INITIAL__) receive(window.__AMBIENTA_INITIAL__);
post({ type: 'ready' });
