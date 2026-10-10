import { z } from 'zod';

import {
  BUDGET_IDS,
  BUDGETS,
  COLOR_OPTIONS,
  FURNITURE_DECISION_IDS,
  GOAL_IDS,
  GOALS,
  LIMITATION_IDS,
  LIMITATIONS,
  labelOf,
  MATERIAL_OPTIONS,
  NEED_OPTIONS,
  RENOVATION_SCOPE_IDS,
  RENOVATION_SCOPES,
  ROOM_TYPE_IDS,
  ROOM_TYPES,
  STYLE_IDS,
  STYLES,
  TENURE_IDS,
  TENURES,
} from './catalog';

const dimension = z.number().positive().max(50);

/** Questionnaire answers. Everything is optional so partially filled drafts stay valid. */
export const AnswersSchema = z.object({
  roomType: z.enum(ROOM_TYPE_IDS).optional(),
  roomTypeOther: z.string().max(60).optional(),
  goals: z.array(z.enum(GOAL_IDS)).max(3),
  styles: z.array(z.enum(STYLE_IDS)).max(2),
  styleOther: z.string().max(160).optional(),
  budget: z.enum(BUDGET_IDS).optional(),
  furniture: z.record(z.string().max(60), z.enum(FURNITURE_DECISION_IDS)),
  keepNotes: z.string().max(400).optional(),
  favoriteColors: z.array(z.string().max(40)).max(6),
  avoidColors: z.array(z.string().max(40)).max(6),
  materials: z.array(z.string().max(40)).max(6),
  needs: z.array(z.string().max(40)).max(8),
  notes: z.string().max(600).optional(),
  tenure: z.enum(TENURE_IDS).optional(),
  renovationScope: z.enum(RENOVATION_SCOPE_IDS).optional(),
  limitations: z.array(z.enum(LIMITATION_IDS)).max(LIMITATION_IDS.length),
  dimensions: z.object({
    widthM: dimension.optional(),
    lengthM: dimension.optional(),
    heightM: dimension.optional(),
  }),
});

export type Answers = z.infer<typeof AnswersSchema>;

export function createEmptyAnswers(): Answers {
  return {
    goals: [],
    styles: [],
    furniture: {},
    favoriteColors: [],
    avoidColors: [],
    materials: [],
    needs: [],
    limitations: [],
    dimensions: {},
  };
}

export function roomTypeLabel(answers: Pick<Answers, 'roomType' | 'roomTypeOther'>) {
  if (answers.roomType === 'outro') return answers.roomTypeOther?.trim() || 'Outro ambiente';
  return labelOf(ROOM_TYPES, answers.roomType) || 'Ambiente';
}

export function styleLabels(answers: Pick<Answers, 'styles' | 'styleOther'>) {
  return answers.styles.map((id) =>
    id === 'outro' ? answers.styleOther?.trim() || 'Estilo personalizado' : labelOf(STYLES, id),
  );
}

const colorLabel = (id: string) => COLOR_OPTIONS.find((c) => c.id === id)?.label ?? id;
const materialLabel = (id: string) => MATERIAL_OPTIONS.find((m) => m.id === id)?.label ?? id;
const needLabel = (id: string) => NEED_OPTIONS.find((n) => n.id === id)?.label ?? id;

/**
 * Human-readable (pt-BR) summary of the answers. Used by the review screen and as
 * the user-context block sent to the AI — so the model sees exactly what the user saw.
 */
export function describeAnswers(answers: Answers): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | undefined) => {
    if (value && value.trim()) rows.push({ label, value: value.trim() });
  };

  push('Ambiente', answers.roomType ? roomTypeLabel(answers) : undefined);
  push('Objetivos', answers.goals.map((g) => labelOf(GOALS, g)).join(', '));
  push('Estilo', styleLabels(answers).join(' + '));
  push('Orçamento', labelOf(BUDGETS, answers.budget));

  const furniture = Object.entries(answers.furniture);
  const byDecision = (decision: string) =>
    furniture.filter(([, d]) => d === decision).map(([item]) => item).join(', ');
  push('Manter', byDecision('manter'));
  push('Mover', byDecision('reposicionar'));
  push('Trocar', byDecision('substituir'));
  push('Não tenho', byDecision('nao_tenho'));
  push('Observações sobre o que manter', answers.keepNotes);

  push('Cores preferidas', answers.favoriteColors.map(colorLabel).join(', '));
  push('Cores a evitar', answers.avoidColors.map(colorLabel).join(', '));
  push('Materiais preferidos', answers.materials.map(materialLabel).join(', '));
  push('Necessidades', answers.needs.map(needLabel).join(', '));
  push('Outras observações', answers.notes);

  push('Imóvel', labelOf(TENURES, answers.tenure));
  push('Intervenções possíveis', labelOf(RENOVATION_SCOPES, answers.renovationScope));
  push('Limitações', answers.limitations.map((l) => labelOf(LIMITATIONS, l)).join(', '));

  const { widthM, lengthM, heightM } = answers.dimensions;
  if (widthM || lengthM || heightM) {
    const fmt = (v?: number) => (v ? `${v.toLocaleString('pt-BR')} m` : '?');
    push('Medidas informadas', `largura ${fmt(widthM)} × comprimento ${fmt(lengthM)} × pé-direito ${fmt(heightM)}`);
  }
  return rows;
}
