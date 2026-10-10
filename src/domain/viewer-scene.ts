import type { Project, ProposalVersion } from './project';
import { applyMeasurements, normalizeScene, type SceneSpec } from './scene';
import { buildTemplateScene } from './scene-templates';

export type ViewerScene = {
  scene: SceneSpec;
  /** Plain-language note about how reliable the dimensions are. */
  dimensionsNote: string;
  /** True when the layout is a generic template (not derived from the photo). */
  usedTemplate: boolean;
};

const CONFIDENCE = { alta: 'alta', media: 'média', baixa: 'baixa' } as const;

/**
 * Scene to render for a proposal: the AI layout when present (or a generic template
 * otherwise), resized to the measurements the user typed, when any.
 */
export function sceneForProposal(project: Project, version: ProposalVersion, key: 'A' | 'B' | 'C'): ViewerScene {
  const content = version.content;
  const userDims = project.measurements;
  const hasUserDims = !!(userDims.widthM || userDims.lengthM || userDims.heightM);
  const usedTemplate = !content.scene || content.scene.items.length === 0;

  let scene: SceneSpec = usedTemplate
    ? buildTemplateScene({
        roomType: project.answers.roomType ?? 'outro',
        variant: key,
        palette: content.palette.map((p) => p.hex),
        wallColor: content.palette[0]?.hex ?? '#EFE9E1',
        accentWallColor: null,
        dims: project.analysis
          ? { widthM: project.analysis.dimensions.widthM, lengthM: project.analysis.dimensions.lengthM, heightM: project.analysis.dimensions.heightM }
          : undefined,
      })
    : normalizeScene(content.scene);

  if (hasUserDims) scene = applyMeasurements(scene, userDims);

  let dimensionsNote: string;
  if (hasUserDims) {
    dimensionsNote = 'Dimensões ajustadas às medidas que você informou. A posição dos móveis continua aproximada.';
  } else if (project.analysis) {
    const d = project.analysis.dimensions;
    dimensionsNote =
      d.source === 'usuario'
        ? 'Dimensões baseadas nas medidas que você informou no questionário.'
        : `Dimensões estimadas pela IA a partir da foto (confiança ${CONFIDENCE[d.confidence]}). Informe as medidas reais para maior fidelidade.`;
  } else {
    dimensionsNote = 'Dimensões de exemplo (modo demonstração). Informe as medidas reais para ajustar a maquete.';
  }

  return { scene, dimensionsNote, usedTemplate };
}
