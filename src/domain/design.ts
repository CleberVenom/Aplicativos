import { z } from 'zod';

import { SceneSpecSchema } from './scene';

/**
 * Schemas for the AI design study. They double as:
 * - structured-output schemas sent to the model (descriptions guide the model), and
 * - runtime validation for API responses and persisted projects.
 * Only constructs supported by structured outputs are used (no records, no defaults;
 * optional values are expressed as nullable).
 */

const LEVEL = ['alta', 'media', 'baixa'] as const;
export const INVESTMENT_LEVEL_IDS = ['economico', 'intermediario', 'elevado'] as const;

export const PhotoAssessmentSchema = z.object({
  usable: z.boolean().describe('A foto permite uma análise útil do ambiente?'),
  showsInterior: z.boolean().describe('A foto mostra um ambiente interno ou varanda/área gourmet?'),
  issues: z.array(z.string()).describe('Problemas da foto (escura, parcial, desfocada, muito fechada). Lista vazia se não houver.'),
  tips: z.array(z.string()).describe('Orientações objetivas para uma foto melhor, quando necessário.'),
});

export const ObservationSchema = z.object({
  aspect: z.enum(['layout', 'mobiliario', 'cores', 'materiais', 'iluminacao', 'espaco', 'arquitetura', 'conservacao']),
  text: z.string(),
  basis: z
    .enum(['observado', 'hipotese'])
    .describe('"observado" = visível na foto; "hipotese" = inferência que a foto não permite confirmar.'),
  confidence: z.enum(LEVEL),
});

export const VisibleItemSchema = z.object({
  name: z.string(),
  location: z.string().describe('Onde está na foto, ex.: "encostado na parede do fundo, à esquerda".'),
  condition: z.string().nullable().describe('Estado aparente, se for possível avaliar; caso contrário null.'),
  suggestion: z.enum(['manter', 'reposicionar', 'substituir', 'remover', 'avaliar']),
});

export const ColorSwatchSchema = z.object({
  hex: z.string().describe('#RRGGBB'),
  name: z.string().describe('Nome da cor em português.'),
});

export const DirectionSchema = z.object({
  title: z.string().describe('Nome provisório da direção.'),
  concept: z.string().describe('Ideia central em uma ou duas frases.'),
  investmentLevel: z.enum(INVESTMENT_LEVEL_IDS),
  differentiator: z.string().describe('O que torna esta direção claramente diferente das outras duas.'),
});

export const RoomAnalysisSchema = z.object({
  photo: PhotoAssessmentSchema,
  detectedRoomType: z.string().describe('Tipo de ambiente identificado na foto.'),
  matchesDeclaredRoom: z.boolean().describe('O ambiente da foto corresponde ao tipo informado pelo usuário?'),
  summary: z.string().describe('Resumo profissional da leitura do ambiente (3 a 5 frases).'),
  observations: z.array(ObservationSchema),
  visibleItems: z.array(VisibleItemSchema),
  currentPalette: z.array(ColorSwatchSchema).describe('Cores predominantes atuais (3 a 6).'),
  lighting: z.object({
    natural: z.string(),
    artificial: z.string(),
    assessment: z.string(),
  }),
  strengths: z.array(z.string()).describe('Pontos fortes que merecem ser preservados.'),
  opportunities: z.array(z.string()).describe('Oportunidades de melhoria.'),
  constraints: z.array(z.string()).describe('Restrições informadas pelo usuário ou observadas.'),
  dimensions: z.object({
    widthM: z.number(),
    lengthM: z.number(),
    heightM: z.number(),
    source: z.enum(['usuario', 'estimativa', 'misto']),
    confidence: z.enum(LEVEL),
    note: z.string().describe('Como a medida foi obtida ou estimada e qual a margem de erro.'),
  }),
  measurementRequests: z.array(z.string()).describe('Medidas que melhorariam as recomendações. Vazio se não houver.'),
  budgetNote: z.string().describe('Compatibilidade entre as ambições do usuário e o orçamento informado.'),
  directions: z.array(DirectionSchema).describe('Exatamente 3 direções de projeto realmente distintas entre si.'),
});

export const PLAN_AREAS = [
  'mobiliario_layout',
  'paredes_revestimentos',
  'iluminacao',
  'materiais_texturas',
  'tecidos_decoracao',
  'organizacao_circulacao',
] as const;

export const PLAN_AREA_LABELS: Record<(typeof PLAN_AREAS)[number], string> = {
  mobiliario_layout: 'Mobiliário e layout',
  paredes_revestimentos: 'Paredes, pintura e revestimentos',
  iluminacao: 'Iluminação',
  materiais_texturas: 'Materiais e texturas',
  tecidos_decoracao: 'Cortinas, tapetes e decoração',
  organizacao_circulacao: 'Organização e circulação',
};

export const PALETTE_ROLES = ['base', 'secundaria', 'destaque', 'madeira', 'metal', 'neutra'] as const;

export const ProposalContentSchema = z.object({
  name: z.string().describe('Nome criativo e descritivo do conceito.'),
  style: z.string().describe('Estilo predominante.'),
  objective: z.string().describe('Objetivo principal da proposta.'),
  tagline: z.string().describe('Frase curta que resume a proposta.'),
  palette: z
    .array(ColorSwatchSchema.extend({ role: z.enum(PALETTE_ROLES) }))
    .describe('Paleta sugerida, 4 a 6 cores.'),
  rationale: z.string().describe('Justificativa profissional: por que funciona neste ambiente e para este usuário.'),
  userFit: z.array(z.string()).describe('Como a proposta atende a cada ponto que o usuário informou.'),
  plan: z
    .array(z.object({ area: z.enum(PLAN_AREAS), actions: z.array(z.string()) }))
    .describe('Plano de transformação. Inclua apenas as áreas relevantes para o ambiente.'),
  changes: z.object({
    keep: z.array(z.string()).describe('O que será mantido.'),
    reposition: z.array(z.string()).describe('O que será reposicionado.'),
    add: z.array(z.string()).describe('O que será adicionado.'),
    remove: z.array(z.string()).describe('O que poderá ser removido.'),
    replace: z.array(z.string()).describe('O que poderá ser substituído.'),
  }),
  investment: z.object({
    level: z.enum(INVESTMENT_LEVEL_IDS),
    estimateBRL: z
      .object({ min: z.number(), max: z.number() })
      .nullable()
      .describe('Faixa estimada em reais. Use null se não houver base razoável para estimar.'),
    basis: z.string().describe('Base da estimativa ou motivo de não estimar valores.'),
  }),
  advantages: z.array(z.string()),
  limitations: z.array(z.string()).describe('Limitações, riscos ou pontos de atenção honestos.'),
  imagePrompt: z
    .string()
    .describe('Instrução em INGLÊS para um modelo de edição de imagem transformar a foto original nesta proposta, citando móveis, cores, materiais e iluminação.'),
  scene: SceneSpecSchema.describe('Maquete 3D aproximada do ambiente APÓS a transformação.'),
});

export const RefinementSchema = z.object({
  proposal: ProposalContentSchema,
  changeSummary: z.string().describe('Resumo em português do que mudou em relação à versão anterior.'),
  imageEditInstruction: z
    .string()
    .describe('Instrução em INGLÊS descrevendo apenas as alterações a aplicar na imagem atual da proposta.'),
});

export type PhotoAssessment = z.infer<typeof PhotoAssessmentSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type RoomAnalysis = z.infer<typeof RoomAnalysisSchema>;
export type Direction = z.infer<typeof DirectionSchema>;
export type ProposalContent = z.infer<typeof ProposalContentSchema>;
export type Refinement = z.infer<typeof RefinementSchema>;
export type PlanArea = (typeof PLAN_AREAS)[number];
export type InvestmentLevel = (typeof INVESTMENT_LEVEL_IDS)[number];

export const PROPOSAL_KEYS = ['A', 'B', 'C'] as const;
export type ProposalKey = (typeof PROPOSAL_KEYS)[number];
