import { createEmptyAnswers, type Answers } from '@/domain/answers';
import type { ImagePayload } from '@/domain/api';
import { buildDemoStudy } from '@/domain/demo';
import { PROPOSAL_KEYS, type ProposalContent, type RoomAnalysis } from '@/domain/design';
import { firstVersion, type Project } from '@/domain/project';

/** Valid sample data shared by unit tests. */

export function sampleAnswers(overrides: Partial<Answers> = {}): Answers {
  return {
    ...createEmptyAnswers(),
    roomType: 'sala_estar',
    goals: ['modernizar'],
    styles: ['japandi'],
    budget: 'intermediario',
    ...overrides,
  };
}

/** Not a real JPEG: enough for schema validation and request building. */
export function samplePhoto(overrides: Partial<ImagePayload> = {}): ImagePayload {
  return { base64: 'QUJD'.repeat(50), mimeType: 'image/jpeg', width: 1600, height: 1200, ...overrides };
}

export function sampleProposal(answers: Answers = sampleAnswers()): ProposalContent {
  return buildDemoStudy(answers).proposals[0];
}

export function sampleAnalysis(answers: Answers = sampleAnswers()): RoomAnalysis {
  return {
    photo: { usable: true, showsInterior: true, issues: [], tips: [] },
    detectedRoomType: 'Sala de estar',
    matchesDeclaredRoom: true,
    summary: 'Sala retangular com boa luz natural e sofá encostado na parede do fundo.',
    observations: [
      { aspect: 'iluminacao', text: 'Janela ampla à direita.', basis: 'observado', confidence: 'alta' },
      { aspect: 'espaco', text: 'O pé-direito parece padrão.', basis: 'hipotese', confidence: 'media' },
    ],
    visibleItems: [{ name: 'Sofá', location: 'Parede do fundo', condition: null, suggestion: 'manter' }],
    currentPalette: [{ hex: '#EEEEEE', name: 'Branco gelo' }],
    lighting: { natural: 'Boa', artificial: 'Plafon central', assessment: 'Falta luz de tarefa.' },
    strengths: ['Boa luz natural'],
    opportunities: ['Criar um ponto focal'],
    constraints: [],
    dimensions: { widthM: 3.5, lengthM: 4.5, heightM: 2.6, source: 'estimativa', confidence: 'baixa', note: 'Estimado pela porta.' },
    measurementRequests: ['Largura da parede do fundo'],
    budgetNote: 'Compatível com trocas pontuais.',
    directions: buildDemoStudy(answers).directions,
  };
}

export function sampleProject(overrides: Partial<Project> = {}): Project {
  const answers = overrides.answers ?? sampleAnswers();
  const study = buildDemoStudy(answers);
  const now = '2026-10-10T12:00:00.000Z';
  return {
    schemaVersion: 1,
    id: 'p_test',
    name: 'Sala de estar · 10 de out.',
    createdAt: now,
    updatedAt: now,
    mode: 'demo',
    photo: { path: 'data:image/jpeg;base64,QUJD', width: 1600, height: 1200 },
    extraPhotos: [],
    photoCheck: null,
    answers,
    status: 'ready',
    error: null,
    analysis: null,
    directions: study.directions,
    proposals: PROPOSAL_KEYS.map((key, i) => ({ key, versions: [firstVersion(study.proposals[i], now)] })),
    proposalErrors: [],
    selectedKey: null,
    measurements: {},
    world: null,
    invite3dAnsweredFor: null,
    ...overrides,
  };
}
