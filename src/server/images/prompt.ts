import type { RenderRequest } from '@/domain/api';

const PRESERVE =
  'Preserve exactly: the camera position, lens and perspective; the room geometry and proportions; wall, ceiling and floor boundaries; every window and door (same size and position); and structural elements such as columns and beams.';

const QUALITY =
  'Photorealistic interior design visualization, realistic materials and textures, natural lighting consistent with the existing light sources, professional interior photography. No text, no watermarks, no people.';

/** Builds the instruction sent to the image model for a render request. */
export function buildRenderPrompt(request: RenderRequest): string {
  const { proposal } = request;
  if (request.mode === 'refine') {
    return [
      'Edit this interior design visualization.',
      `Apply only these changes: ${request.instruction ?? proposal.imagePrompt}`,
      'Keep everything else identical: camera angle, room structure, windows, doors, and all furniture, colors and lighting that were not mentioned.',
      QUALITY,
    ].join('\n');
  }

  const palette = proposal.palette.map((c) => `${c.name} (${c.hex})`).join(', ');
  const keep = proposal.keep.length ? `Keep these existing items recognizable, in the same place unless the concept moves them: ${proposal.keep.join('; ')}.` : '';
  return [
    'Redesign the interior shown in this photo according to the design concept below.',
    PRESERVE,
    keep,
    `Design concept: "${proposal.name}" — ${proposal.style}.`,
    proposal.imagePrompt,
    palette ? `Color palette: ${palette}.` : '',
    QUALITY,
  ]
    .filter(Boolean)
    .join('\n');
}
