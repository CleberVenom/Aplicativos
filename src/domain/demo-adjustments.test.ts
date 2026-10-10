import { sampleAnswers, sampleProposal } from '@/test-utils/fixtures';

import { COLOR_OPTIONS } from './catalog';
import { applyDemoAdjustment, describeDemoAdjustment } from './demo-adjustments';
import { buildDemoStudy } from './demo';
import { ProposalContentSchema } from './design';

const base = () => buildDemoStudy(sampleAnswers({ budget: 'elevado', furniture: { Sofá: 'substituir', Tapete: 'substituir' } })).proposals[1];

describe('demo adjustments', () => {
  it('makes a proposal cheaper without touching the original', () => {
    const original = base();
    const snapshot = JSON.stringify(original);
    const { content } = applyDemoAdjustment(original, { type: 'cheaper' });
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(content.investment.level).toBe('intermediario');
    expect(content.changes.replace).toEqual([]);
    expect(content.changes.keep.some((k) => k.startsWith('Sofá'))).toBe(true);
    expect(content.scene.items.some((i) => i.status === 'substituido')).toBe(false);
    expect(ProposalContentSchema.safeParse(content).success).toBe(true);
  });

  it('changes the accent color in the palette and the 3D scene', () => {
    const original = sampleProposal();
    const accentBefore = original.palette.find((p) => p.role === 'destaque')!;
    const terracota = COLOR_OPTIONS.find((c) => c.id === 'terracota')!;
    const { content, summary } = applyDemoAdjustment(original, { type: 'accent', colorId: 'terracota' });
    const accent = content.palette.find((p) => p.role === 'destaque')!;
    expect(accent).toMatchObject({ hex: terracota.hex, name: terracota.label });
    expect(content.scene.items.some((i) => i.color.toUpperCase() === accentBefore.hex.toUpperCase())).toBe(false);
    expect(summary).toMatch(/terracota/);
  });

  it('keeps an item the user wants to preserve', () => {
    const { content } = applyDemoAdjustment(base(), { type: 'keep', item: 'Sofá' });
    expect(content.changes.keep).toContain('Sofá');
    expect(content.changes.replace).not.toContain('Sofá');
    expect(content.scene.items.filter((i) => i.kind === 'sofa').every((i) => i.status === 'mantido')).toBe(true);
  });

  it('adds warm lighting actions', () => {
    const { content } = applyDemoAdjustment(sampleProposal(), { type: 'warmer_light' });
    const lighting = content.plan.find((p) => p.area === 'iluminacao')!;
    expect(lighting.actions.join(' ')).toMatch(/2700 K/);
  });

  it('describes each adjustment in Portuguese', () => {
    expect(describeDemoAdjustment({ type: 'cheaper' })).toMatch(/econômica/);
    expect(describeDemoAdjustment({ type: 'accent', colorId: 'verde_salvia' })).toMatch(/verde-sálvia/);
  });
});
