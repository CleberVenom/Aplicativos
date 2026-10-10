/** @jest-environment node */
import { samplePhoto } from '@/test-utils/fixtures';

import { buildRenderPrompt } from './prompt';

const proposal = {
  name: 'Calma Essencial',
  style: 'Japandi',
  imagePrompt: 'Replace the sofa with a low linen sofa.',
  palette: [
    { hex: '#EFE9E1', name: 'Linho' },
    { hex: '#9CAF94', name: 'Verde-sálvia' },
  ],
  keep: ['Estante de madeira'],
};

describe('buildRenderPrompt', () => {
  it('asks to preserve the architecture and the kept items', () => {
    const prompt = buildRenderPrompt({ image: samplePhoto(), mode: 'proposal', proposal, instruction: null });
    expect(prompt).toMatch(/Preserve exactly: the camera position/);
    expect(prompt).toMatch(/every window and door/);
    expect(prompt).toContain('Estante de madeira');
    expect(prompt).toContain('Replace the sofa with a low linen sofa.');
    expect(prompt).toContain('Verde-sálvia (#9CAF94)');
  });

  it('applies only the requested changes when refining', () => {
    const prompt = buildRenderPrompt({ image: samplePhoto(), mode: 'refine', proposal, instruction: 'Make the rug terracotta.' });
    expect(prompt).toMatch(/Apply only these changes: Make the rug terracotta\./);
    expect(prompt).toMatch(/Keep everything else identical/);
    expect(prompt).not.toContain('Redesign the interior');
  });
});
