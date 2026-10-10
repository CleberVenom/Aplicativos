import type { Answers } from './answers';
import { INTERVENTION_GOALS } from './catalog';

export const STEP_IDS = ['room', 'goals', 'style', 'budget', 'furniture', 'preferences', 'property', 'review'] as const;
export type StepId = (typeof STEP_IDS)[number];

export const STEP_META: Record<StepId, { title: string; subtitle: string; optional: boolean }> = {
  room: { title: 'Que ambiente é este?', subtitle: 'Isso orienta a análise e as sugestões.', optional: false },
  goals: { title: 'O que você quer transformar?', subtitle: 'Escolha até 3 objetivos.', optional: false },
  style: { title: 'Qual estilo combina com você?', subtitle: 'Escolha até 2 para combinar.', optional: false },
  budget: { title: 'Quanto pretende investir?', subtitle: 'Usamos isso para calibrar as propostas.', optional: false },
  furniture: {
    title: 'O que fica e o que pode mudar?',
    subtitle: 'Marque só o que importa, inclusive o que você não tem. Itens sem marcação ficam a critério das propostas.',
    optional: true,
  },
  preferences: { title: 'Suas preferências', subtitle: 'Cores, materiais e necessidades do dia a dia.', optional: true },
  property: { title: 'Sobre o imóvel', subtitle: 'Ajuda a evitar sugestões inviáveis.', optional: true },
  review: { title: 'Revise suas respostas', subtitle: 'Confira antes de gerar as propostas.', optional: false },
};

/**
 * The property step only matters when the user is open to physical interventions
 * (or has budget for them). Pure decoration projects skip it.
 */
export function needsPropertyStep(answers: Answers): boolean {
  return answers.goals.some((g) => INTERVENTION_GOALS.includes(g)) || answers.budget === 'elevado';
}

export function getActiveSteps(answers: Answers): StepId[] {
  return STEP_IDS.filter((step) => step !== 'property' || needsPropertyStep(answers));
}

export function isStepComplete(step: StepId, answers: Answers): boolean {
  switch (step) {
    case 'room':
      return !!answers.roomType && (answers.roomType !== 'outro' || !!answers.roomTypeOther?.trim());
    case 'goals':
      return answers.goals.length > 0;
    case 'style':
      return answers.styles.length > 0 && (!answers.styles.includes('outro') || !!answers.styleOther?.trim());
    case 'budget':
      return !!answers.budget;
    default:
      return true;
  }
}

export function getStepPosition(step: StepId, answers: Answers) {
  const steps = getActiveSteps(answers);
  const index = Math.max(0, steps.indexOf(step));
  return { index, total: steps.length, steps };
}

export function nextStep(step: StepId, answers: Answers): StepId | null {
  const steps = getActiveSteps(answers);
  const i = steps.indexOf(step);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
}

export function prevStep(step: StepId, answers: Answers): StepId | null {
  const steps = getActiveSteps(answers);
  const i = steps.indexOf(step);
  return i > 0 ? steps[i - 1] : null;
}

export function firstIncompleteStep(answers: Answers): StepId | null {
  return getActiveSteps(answers).find((s) => !isStepComplete(s, answers)) ?? null;
}

export function isReadyToGenerate(answers: Answers): boolean {
  return firstIncompleteStep(answers) === null;
}

export function isStepId(value: unknown): value is StepId {
  return typeof value === 'string' && (STEP_IDS as readonly string[]).includes(value);
}
