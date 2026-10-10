import { sampleAnswers } from '@/test-utils/fixtures';

import { COLOR_OPTIONS } from './catalog';
import { buildDemoStudy } from './demo';
import { ProposalContentSchema } from './design';

const hexOf = (id: string) => COLOR_OPTIONS.find((c) => c.id === id)!.hex;

function distance(a: string, b: string) {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

describe('demo study', () => {
  const answers = sampleAnswers({
    styles: ['japandi', 'escandinavo'],
    favoriteColors: ['verde_salvia'],
    avoidColors: ['preto'],
    furniture: { Sofá: 'manter', Tapete: 'substituir' },
    limitations: ['nao_pintar'],
  });
  const { directions, proposals } = buildDemoStudy(answers);

  it('produces three valid, distinct proposals', () => {
    expect(directions).toHaveLength(3);
    expect(proposals).toHaveLength(3);
    for (const p of proposals) expect(ProposalContentSchema.safeParse(p).success).toBe(true);
    expect(new Set(proposals.map((p) => p.name)).size).toBe(3);
    expect(new Set(proposals.map((p) => p.palette.map((c) => c.hex).join())).size).toBe(3);
    expect(new Set(proposals.map((p) => p.investment.level)).size).toBeGreaterThan(1);
  });

  it('is honest about being a demonstration', () => {
    for (const p of proposals) {
      expect(p.investment.estimateBRL).toBeNull();
      expect(p.rationale).toMatch(/demonstração/);
    }
  });

  it('honors favorite and avoided colors', () => {
    expect(proposals[0].palette.map((c) => c.hex)).toContain(hexOf('verde_salvia'));
    for (const p of proposals) {
      for (const c of p.palette) expect(distance(c.hex, hexOf('preto'))).toBeGreaterThanOrEqual(60);
    }
  });

  it('finds replacements even when several dark tones are avoided', () => {
    const avoid = ['preto', 'grafite', 'cinza'];
    for (const styles of [['industrial'], ['luxuoso'], ['japandi']] as const) {
      const study = buildDemoStudy(sampleAnswers({ styles: [...styles], avoidColors: avoid }));
      for (const p of study.proposals) {
        for (const c of p.palette) {
          for (const id of avoid) expect(distance(c.hex, hexOf(id))).toBeGreaterThanOrEqual(60);
        }
      }
    }
  });

  it('never repeats a color name within a palette', () => {
    for (const p of proposals) {
      const names = p.palette.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('respects restrictions and furniture decisions', () => {
    const actions = proposals.flatMap((p) => p.plan.flatMap((a) => a.actions)).join(' ');
    expect(actions).not.toMatch(/\bPintar\b/);
    expect(proposals.every((p) => p.scene.accentWall === null)).toBe(true);
    for (const p of proposals) expect(p.changes.keep).toContain('Sofá');
  });

  it('keeps 3D items inside the room', () => {
    for (const { scene } of proposals) {
      for (const item of scene.items) {
        expect(Math.abs(item.x)).toBeLessThanOrEqual(scene.room.widthM / 2);
        expect(Math.abs(item.z)).toBeLessThanOrEqual(scene.room.lengthM / 2);
      }
    }
  });

  it('works for every room type with minimal answers', () => {
    for (const roomType of ['sala_estar', 'sala_jantar', 'quarto', 'cozinha', 'banheiro', 'escritorio', 'varanda', 'area_gourmet', 'outro'] as const) {
      const study = buildDemoStudy(sampleAnswers({ roomType, styles: [], budget: undefined, goals: [] }));
      for (const p of study.proposals) expect(ProposalContentSchema.safeParse(p).success).toBe(true);
    }
  });
});
