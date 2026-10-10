import { applyMeasurements, footprint, normalizeRotation, normalizeScene, safeHex, type SceneItem, type SceneSpec } from './scene';

const item = (overrides: Partial<SceneItem> = {}): SceneItem => ({
  kind: 'sofa',
  label: 'Sofá',
  x: 0,
  z: 0,
  rotationDeg: 0,
  widthM: 2,
  depthM: 0.9,
  heightM: 0.85,
  elevationM: 0,
  color: '#AABBCC',
  material: 'tecido',
  status: 'novo',
  ...overrides,
});

const scene = (overrides: Partial<SceneSpec> = {}): SceneSpec => ({
  room: { widthM: 4, lengthM: 5, heightM: 2.6 },
  floor: { material: 'madeira', color: '#B08B66' },
  wallColor: '#EFE9E1',
  accentWall: null,
  ceilingColor: '#FFFFFF',
  openings: [],
  items: [item()],
  ...overrides,
});

describe('scene helpers', () => {
  it('sanitizes colors', () => {
    expect(safeHex('#abc', '#000000')).toBe('#AABBCC');
    expect(safeHex(' #a1b2c3 ', '#000000')).toBe('#A1B2C3');
    expect(safeHex('red', '#123456')).toBe('#123456');
    expect(safeHex(null, '#123456')).toBe('#123456');
  });

  it('normalizes rotations and footprints', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(Number.NaN)).toBe(0);
    const fp = footprint({ widthM: 2, depthM: 1, rotationDeg: 90 });
    expect(fp.x).toBeCloseTo(1);
    expect(fp.z).toBeCloseTo(2);
  });
});

describe('normalizeScene', () => {
  it('clamps the room to realistic limits', () => {
    const result = normalizeScene(scene({ room: { widthM: 0.5, lengthM: 99, heightM: 1 } }));
    expect(result.room).toEqual({ widthM: 1.5, lengthM: 15, heightM: 2.1 });
  });

  it('keeps items inside the walls, considering rotation', () => {
    const result = normalizeScene(scene({ items: [item({ x: 10, z: -10, rotationDeg: 90 })] }));
    const [sofa] = result.items;
    // Rotated 90°, the 2 m sofa occupies 0.9 m along x and 2 m along z.
    expect(sofa.x).toBeCloseTo(2 - 0.45);
    expect(sofa.z).toBeCloseTo(-(2.5 - 1));
  });

  it('fixes invalid values and fills defaults', () => {
    const result = normalizeScene(
      scene({
        items: [
          item({ kind: 'nao_existe' as SceneItem['kind'], label: '  ', color: 'azul', widthM: 0 }),
          item({ kind: 'pendente', heightM: 0.4, elevationM: 0 }),
        ],
      }),
    );
    expect(result.items[0]).toMatchObject({ kind: 'outro', label: 'Objeto', color: '#B9A792', widthM: 0.6 });
    // Pendants without a height hang 60 cm below the ceiling.
    expect(result.items[1].elevationM).toBeCloseTo(2.6 - 0.4 - 0.6);
  });

  it('caps the number of items and keeps openings on their wall', () => {
    const many = Array.from({ length: 60 }, () => item());
    const result = normalizeScene(
      scene({ items: many, openings: [{ type: 'janela', wall: 'fundo', offsetM: 9, widthM: 1.2, heightM: 1.2, sillM: 5 }] }),
    );
    expect(result.items).toHaveLength(40);
    expect(result.openings[0].offsetM).toBeCloseTo(2 - 0.6);
    expect(result.openings[0].sillM).toBeCloseTo(2.6 - 1.2);
  });
});

describe('applyMeasurements', () => {
  it('rescales the room and item positions', () => {
    const result = applyMeasurements(scene({ items: [item({ widthM: 1, depthM: 0.5, x: 1, z: 1 })] }), { widthM: 6, lengthM: 2.5 });
    expect(result.room).toEqual({ widthM: 6, lengthM: 2.5, heightM: 2.6 });
    expect(result.items[0].x).toBeCloseTo(1.5);
    expect(result.items[0].z).toBeCloseTo(0.5);
  });

  it('keeps the original size when no measurement is given', () => {
    expect(applyMeasurements(scene(), {}).room).toEqual({ widthM: 4, lengthM: 5, heightM: 2.6 });
  });
});
