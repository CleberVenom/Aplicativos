import { sampleAnalysis, sampleProject } from '@/test-utils/fixtures';

import { getProposal, ProjectSchema, summarize } from './project';
import { sceneForProposal } from './viewer-scene';

describe('project records', () => {
  it('match the persisted schema and summarize for the projects list', () => {
    const project = sampleProject({ selectedKey: 'B' });
    expect(ProjectSchema.safeParse(project).success).toBe(true);
    expect(summarize(project)).toMatchObject({
      roomLabel: 'Sala de estar',
      proposalCount: 3,
      selectedName: getProposal(project, 'B')!.content.name,
      thumbnail: { path: project.photo.path },
    });
  });
});

describe('sceneForProposal', () => {
  it('labels demo dimensions as examples', () => {
    const project = sampleProject();
    const result = sceneForProposal(project, getProposal(project, 'A')!, 'A');
    expect(result.dimensionsNote).toMatch(/Dimensões de exemplo/);
  });

  it('applies the measurements typed by the user', () => {
    const project = sampleProject({ measurements: { widthM: 5.2, heightM: 2.9 } });
    const { scene, dimensionsNote } = sceneForProposal(project, getProposal(project, 'B')!, 'B');
    expect(scene.room.widthM).toBe(5.2);
    expect(scene.room.heightM).toBe(2.9);
    expect(dimensionsNote).toMatch(/medidas que você informou/);
  });

  it('uses the AI estimate, with its confidence, and a template when the AI sent no layout', () => {
    const base = sampleProject({ mode: 'ai', analysis: sampleAnalysis() });
    const version = getProposal(base, 'C')!;
    const empty = { ...version, content: { ...version.content, scene: { ...version.content.scene, items: [] } } };
    const result = sceneForProposal(base, empty, 'C');
    expect(result.usedTemplate).toBe(true);
    expect(result.scene.room).toEqual({ widthM: 3.5, lengthM: 4.5, heightM: 2.6 });
    expect(result.scene.items.length).toBeGreaterThan(0);
    expect(result.dimensionsNote).toMatch(/estimadas pela IA.*confiança baixa/);
  });
});
