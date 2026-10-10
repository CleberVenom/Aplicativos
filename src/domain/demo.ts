import { styleLabels, type Answers } from './answers';
import {
  BUDGETS,
  COLOR_OPTIONS,
  GOALS,
  labelOf,
  LIMITATIONS,
  MATERIAL_OPTIONS,
  NEED_OPTIONS,
  STYLES,
  type RoomTypeId,
  type StyleId,
} from './catalog';
import type { Direction, InvestmentLevel, PlanArea, ProposalContent } from './design';
import { buildTemplateScene } from './scene-templates';

/**
 * Demo mode: builds three example proposals ON THE DEVICE, using only the
 * questionnaire answers. It never claims to have looked at the photo and it
 * never produces images. The UI labels these results as examples.
 */
export const DEMO_NOTICE =
  'Modo demonstração: estas propostas são exemplos montados no aparelho a partir das suas respostas. A foto não foi analisada e nenhuma imagem foi gerada por IA.';

type Variant = 'A' | 'B' | 'C';

const COMPLEMENT: Record<StyleId, StyleId> = {
  contemporaneo: 'organico',
  minimalista: 'japandi',
  industrial: 'contemporaneo',
  escandinavo: 'japandi',
  classico: 'contemporaneo',
  japandi: 'organico',
  rustico: 'organico',
  organico: 'japandi',
  luxuoso: 'classico',
  outro: 'contemporaneo',
};

const NAMES: Record<StyleId, [string, string, string]> = {
  contemporaneo: ['Contemporâneo Leve', 'Linhas do Agora', 'Contemporâneo Assinado'],
  minimalista: ['Respiro Essencial', 'Menos, Melhor', 'Minimal Escultural'],
  industrial: ['Loft Possível', 'Industrial Acolhedor', 'Fábrica Urbana'],
  escandinavo: ['Hygge Simples', 'Nórdico Equilibrado', 'Nórdico Autoral'],
  classico: ['Clássico Renovado', 'Elegância Atual', 'Clássico Grandioso'],
  japandi: ['Calma Essencial', 'Japandi Sereno', 'Zen Autoral'],
  rustico: ['Campo na Cidade', 'Rústico Refinado', 'Refúgio de Madeira'],
  organico: ['Natureza Leve', 'Curvas Naturais', 'Orgânico Escultural'],
  luxuoso: ['Luxo Discreto', 'Sofisticação Atual', 'Grand Luxe'],
  outro: ['Essencial Personalizado', 'Equilíbrio Personalizado', 'Assinatura Personalizada'],
};

const STATEMENT_PIECE: Record<RoomTypeId, string> = {
  sala_estar: 'um sofá de linhas marcantes ou uma poltrona escultural',
  sala_jantar: 'um pendente escultural sobre a mesa',
  quarto: 'uma cabeceira estofada alta, de parede a parede',
  cozinha: 'uma ilha ou bancada em pedra com veios marcantes',
  banheiro: 'um revestimento texturizado na parede principal',
  escritorio: 'uma estante sob medida com iluminação integrada',
  varanda: 'um jardim vertical com iluminação rasante',
  area_gourmet: 'uma parede de pedra natural atrás da churrasqueira',
  outro: 'uma peça de destaque que concentre o olhar',
};

const STORAGE_IDEA: Record<RoomTypeId, string> = {
  sala_estar: 'estante ou nichos fechados para esconder o que não precisa ficar à vista',
  sala_jantar: 'aparador com portas para louças e toalhas',
  quarto: 'organizadores internos no guarda-roupa e baú aos pés da cama',
  cozinha: 'armários até o teto e organizadores de gaveta',
  banheiro: 'nichos embutidos e gabinete com gavetas',
  escritorio: 'gaveteiro e caixas padronizadas na estante',
  varanda: 'banco-baú para almofadas e acessórios',
  area_gourmet: 'armários fechados para utensílios do churrasco',
  outro: 'móveis com portas e caixas organizadoras',
};

const ROOM_EN: Record<RoomTypeId, string> = {
  sala_estar: 'living room',
  sala_jantar: 'dining room',
  quarto: 'bedroom',
  cozinha: 'kitchen',
  banheiro: 'bathroom',
  escritorio: 'home office',
  varanda: 'balcony',
  area_gourmet: 'outdoor gourmet kitchen area',
  outro: 'room',
};

const NEED_ACTION: Record<string, string> = {
  home_office: 'Criar um canto de trabalho com mesa compacta e luminária de tarefa.',
  armazenamento: '', // filled per room
  pets: 'Preferir tecidos resistentes e laváveis e tapetes de fibra sintética.',
  criancas: 'Escolher móveis com cantos arredondados e acabamentos laváveis.',
  receber: 'Prever assentos extras, como pufes, e manter a circulação livre.',
  leitura: 'Montar um cantinho de leitura com poltrona confortável e luz focal.',
  acessibilidade: 'Manter passagens de pelo menos 90 cm e evitar tapetes soltos.',
  limpeza: 'Priorizar superfícies laváveis e reduzir objetos expostos.',
  bancada: 'Liberar a bancada levando utensílios para prateleiras e suportes de parede.',
  luz_natural: 'Usar cortinas leves e um espelho para refletir a luz natural.',
  sono: 'Usar cortina blecaute e luz quente indireta perto da cama.',
};

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function colorDistance(a: string, b: string) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Names for labeling demo palettes: the questionnaire colors plus common decor tones. */
const PALETTE_NAMES: readonly { name: string; hex: string }[] = [
  ...COLOR_OPTIONS.map((c) => ({ name: c.label, hex: c.hex })),
  { name: 'Pérola', hex: '#F5F3EF' },
  { name: 'Linho', hex: '#EDE6DC' },
  { name: 'Gelo', hex: '#E2DFD9' },
  { name: 'Areia', hex: '#D8C8B0' },
  { name: 'Fendi', hex: '#C9C3BA' },
  { name: 'Greige', hex: '#B9AFA2' },
  { name: 'Latão', hex: '#B08D57' },
  { name: 'Conhaque', hex: '#8C5A3C' },
  { name: 'Taupe', hex: '#8B7D6B' },
  { name: 'Marrom', hex: '#6B4A33' },
  { name: 'Chumbo', hex: '#5A5753' },
  { name: 'Café', hex: '#4B3B35' },
  { name: 'Carvão', hex: '#2E2B28' },
];

/** Nearest name for each color, never repeating a name within the same palette. */
function namePalette(hexes: string[]): string[] {
  const used = new Set<string>();
  return hexes.map((hex) => {
    const ranked = [...PALETTE_NAMES].sort((a, b) => colorDistance(a.hex, hex) - colorDistance(b.hex, hex));
    const pick = ranked.find((c) => !used.has(c.name)) ?? ranked[0];
    used.add(pick.name);
    return pick.name;
  });
}

function hexOf(colorId: string): string | undefined {
  return COLOR_OPTIONS.find((c) => c.id === colorId)?.hex;
}

/** Returns 4 colors [base, secondary, accent, deep], honoring favorite and avoided colors. */
function composePalette(styleId: StyleId, secondaryId: StyleId, variant: Variant, answers: Answers): string[] {
  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0];
  const second = STYLES.find((s) => s.id === secondaryId) ?? style;
  const favorites = answers.favoriteColors.map(hexOf).filter((h): h is string => !!h);
  const avoided = answers.avoidColors.map(hexOf).filter((h): h is string => !!h);

  let palette: string[];
  if (variant === 'A') palette = [...style.palette];
  else if (variant === 'B') palette = [style.palette[0], second.palette[1], style.palette[2], second.palette[3]];
  else palette = [second.palette[0], style.palette[1], favorites[0] ?? style.palette[2], style.palette[3]];

  if (favorites.length && variant !== 'C') palette[2] = favorites[variant === 'A' ? 0 : favorites.length > 1 ? 1 : 0];

  // Replacements per slot, checked against the avoided colors as well.
  const neutrals = [
    ['#EFE9E1', '#F5F3EF', '#E6DDD0'],
    ['#CFC5B8', '#BFB3A4', '#D8C8B0'],
    ['#8E8173', '#A57C52', '#6F7F73'],
    ['#3F3933', '#5C5148', '#4F5D45', '#8C5A3C', '#8E8173'],
  ];
  const isAvoided = (hex: string) => avoided.some((a) => colorDistance(a, hex) < 60);
  return palette.map((hex, i) => (isAvoided(hex) ? (neutrals[i].find((n) => !isAvoided(n)) ?? neutrals.flat().find((n) => !isAvoided(n)) ?? hex) : hex));
}

function investmentLevels(budget: Answers['budget']): [InvestmentLevel, InvestmentLevel, InvestmentLevel] {
  switch (budget) {
    case 'economico':
      return ['economico', 'economico', 'intermediario'];
    case 'elevado':
      return ['intermediario', 'elevado', 'elevado'];
    default:
      return ['economico', 'intermediario', 'elevado'];
  }
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function buildDemoStudy(answers: Answers): { directions: Direction[]; proposals: ProposalContent[] } {
  const roomType: RoomTypeId = answers.roomType ?? 'outro';
  const primaryId: StyleId = answers.styles[0] ?? 'contemporaneo';
  const secondaryId: StyleId = answers.styles[1] ?? COMPLEMENT[primaryId];
  const primary = STYLES.find((s) => s.id === primaryId) ?? STYLES[0];
  const secondary = STYLES.find((s) => s.id === secondaryId) ?? STYLES[0];
  const styleNames = styleLabels(answers);
  const primaryName = styleNames[0] ?? primary.label;
  const levels = investmentLevels(answers.budget);
  const names = NAMES[primaryId];

  const cannotPaint = answers.limitations.includes('nao_pintar');
  const cannotDrill = answers.limitations.includes('nao_furar');
  const cannotWire = answers.limitations.includes('nao_mexer_instalacoes');
  const isRented = answers.tenure === 'alugado';
  const noWorks = answers.renovationScope === 'sem_obras' || isRented;

  const decisions = answers.furniture;
  const byDecision = (d: string) => Object.entries(decisions).filter(([, v]) => v === d).map(([k]) => k);
  const keep = byDecision('manter');
  const reposition = byDecision('reposicionar');
  const replaceable = byDecision('substituir');

  const goalsText = joinList(answers.goals.map((g) => labelOf(GOALS, g).toLowerCase())) || 'renovar o ambiente';
  const budgetText = answers.budget ? `orçamento ${labelOf(BUDGETS, answers.budget).toLowerCase()}` : 'orçamento ainda indefinido';
  const materials = answers.materials.map((m) => MATERIAL_OPTIONS.find((o) => o.id === m)?.label.toLowerCase() ?? m);

  const directions: Direction[] = [
    {
      title: names[0],
      concept: 'Renovar com o que já existe: reorganização, cor, tecidos e luz.',
      investmentLevel: levels[0],
      differentiator: 'Mantém os móveis principais e concentra o investimento em itens de baixo custo e alto impacto.',
    },
    {
      title: names[1],
      concept: `Trocas pontuais nas peças que mais pesam no visual, combinando ${primary.label.toLowerCase()} e ${secondary.label.toLowerCase()}.`,
      investmentLevel: levels[1],
      differentiator: 'Equilibra preservação e novidade, com plano de iluminação em camadas.',
    },
    {
      title: names[2],
      concept: `Uma linguagem marcante, com ${STATEMENT_PIECE[roomType]} como protagonista.`,
      investmentLevel: levels[2],
      differentiator: 'Assume uma identidade forte, com mais contraste e materiais de destaque.',
    },
  ];

  const variants: Variant[] = ['A', 'B', 'C'];
  const proposals = variants.map((variant, index): ProposalContent => {
    const palette = composePalette(primaryId, secondaryId, variant, answers);
    const roles = ['base', 'secundaria', 'destaque', 'neutra'] as const;
    const colorNames = namePalette(palette);
    const paletteNamed = palette.map((hex, i) => ({ hex, name: colorNames[i], role: roles[i] }));
    const accentName = paletteNamed[2].name.toLowerCase();
    const baseName = paletteNamed[0].name.toLowerCase();

    const plan: { area: PlanArea; actions: string[] }[] = [];
    const layout: string[] = [];
    if (variant === 'A') {
      layout.push('Reorganizar os móveis existentes para liberar passagens de pelo menos 80 cm.');
      if (reposition.length) layout.push(`Reposicionar ${joinList(reposition.map((r) => r.toLowerCase()))} para equilibrar o espaço.`);
    } else if (variant === 'B') {
      layout.push(
        replaceable.length
          ? `Substituir ${joinList(replaceable.slice(0, 2).map((r) => r.toLowerCase()))} por peças de linhas ${primary.label.toLowerCase()}.`
          : 'Trocar uma ou duas peças que mais destoam do conjunto por versões mais atuais.',
      );
      layout.push('Definir um ponto focal e organizar os móveis em torno dele.');
    } else {
      layout.push(`Introduzir ${STATEMENT_PIECE[roomType]} como peça principal do ambiente.`);
      layout.push('Redesenhar o layout priorizando conforto e circulação fluida.');
    }
    plan.push({ area: 'mobiliario_layout', actions: layout });

    const walls: string[] = [];
    if (cannotPaint) {
      walls.push('Como a pintura não é possível, trazer cor com quadros, tecidos e objetos.');
    } else if (variant === 'A') {
      walls.push(`Pintar as paredes em ${baseName}, um tom que amplia e ilumina o ambiente.`);
    } else if (variant === 'B') {
      walls.push(`Paredes em ${baseName} com detalhes em ${paletteNamed[1].name.toLowerCase()}.`);
    } else {
      walls.push(`Criar uma parede de destaque em ${accentName}.`);
      if (!noWorks) walls.push(`Aplicar revestimento com textura de ${primary.materials[0] ?? 'material natural'} em uma das paredes.`);
    }
    if (cannotDrill) walls.push('Usar fitas e ganchos adesivos ou apoiar quadros em prateleiras, sem furar paredes.');
    plan.push({ area: 'paredes_revestimentos', actions: walls });

    const light: string[] = [];
    if (variant === 'A') light.push('Trocar lâmpadas frias por luz quente (2700 K) e incluir uma luminária de piso.');
    else if (variant === 'B') light.push('Montar iluminação em camadas: geral, de tarefa e de destaque.');
    else light.push(cannotWire || noWorks ? 'Usar pendentes e luminárias de tomada para criar efeito cênico sem obra.' : 'Criar iluminação cênica com sanca de LED e pendente escultural.');
    plan.push({ area: 'iluminacao', actions: light });

    const textures = materials.length ? materials : [...primary.materials];
    plan.push({
      area: 'materiais_texturas',
      actions: [`Valorizar ${joinList(textures.slice(0, 3))} para reforçar o estilo ${(variant === 'B' ? `${primary.label} com ${secondary.label}` : primaryName).toLowerCase()}.`],
    });

    const decor: string[] = [];
    if (roomType !== 'banheiro' && roomType !== 'cozinha') decor.push(`Incluir tapete e almofadas em ${accentName} para dar personalidade ao ambiente.`);
    decor.push(variant === 'C' ? 'Selecionar poucas peças de arte de grande formato.' : 'Editar os objetos decorativos, mantendo só os que contam uma história.');
    plan.push({ area: 'tecidos_decoracao', actions: decor });

    const org = answers.needs
      .map((need) => (need === 'armazenamento' ? `Incluir ${STORAGE_IDEA[roomType]}.` : NEED_ACTION[need]))
      .filter(Boolean);
    if (org.length) plan.push({ area: 'organizacao_circulacao', actions: org });

    const add =
      variant === 'A'
        ? ['Almofadas e mantas', 'Luminária de piso', 'Plantas']
        : variant === 'B'
          ? ['Tapete em proporção correta', 'Iluminação em camadas', 'Uma peça nova de destaque']
          : [STATEMENT_PIECE[roomType].replace(/^um[a]? /, ''), 'Arte de grande formato', 'Iluminação cênica'];

    const changes = {
      keep: keep.length ? keep : variant === 'A' ? ['Móveis principais em bom estado'] : [],
      reposition,
      add,
      remove: ['Objetos que poluem visualmente'],
      replace: variant === 'A' ? [] : replaceable.length ? replaceable : ['Peças que destoam do conjunto'],
    };

    const userFit = [
      `Responde ao objetivo de ${goalsText}.`,
      `Calibrada para ${budgetText}.`,
      answers.favoriteColors.length ? `Usa cores que você prefere: ${joinList(answers.favoriteColors.map((c) => COLOR_OPTIONS.find((o) => o.id === c)?.label.toLowerCase() ?? c))}.` : '',
      answers.avoidColors.length ? `Evita ${joinList(answers.avoidColors.map((c) => COLOR_OPTIONS.find((o) => o.id === c)?.label.toLowerCase() ?? c))}.` : '',
      answers.needs.length ? `Considera: ${joinList(answers.needs.map((n) => NEED_OPTIONS.find((o) => o.id === n)?.label.toLowerCase() ?? n))}.` : '',
      answers.limitations.length ? `Respeita: ${joinList(answers.limitations.map((l) => labelOf(LIMITATIONS, l).toLowerCase()))}.` : '',
      keep.length ? `Preserva ${joinList(keep.map((k) => k.toLowerCase()))}, como você pediu.` : '',
    ].filter(Boolean);

    const strategy =
      variant === 'A'
        ? 'aproveita ao máximo o que você já tem e muda a percepção do espaço com cor, luz e tecidos'
        : variant === 'B'
          ? 'troca apenas as peças de maior impacto e organiza a iluminação em camadas'
          : 'assume uma identidade marcante, com uma peça protagonista e mais contraste';

    const scene = buildTemplateScene({
      roomType,
      variant,
      palette,
      wallColor: palette[0],
      accentWallColor: variant === 'C' && !cannotPaint ? palette[2] : null,
      dims: answers.dimensions,
      decisions,
    });

    return {
      name: names[index],
      style: variant === 'B' ? `${primary.label} com toques ${secondary.label.toLowerCase()}` : primaryName,
      objective: directions[index].concept,
      tagline: directions[index].differentiator,
      palette: paletteNamed,
      rationale: `Como você quer ${goalsText} com ${budgetText}, esta proposta ${strategy}. O estilo ${primaryName.toLowerCase()} traz ${primary.description.charAt(0).toLowerCase()}${primary.description.slice(1)} Este é um exemplo de demonstração e não considera a foto que você enviou.`,
      userFit,
      plan,
      changes,
      investment: {
        level: levels[index],
        estimateBRL: null,
        basis: 'Modo demonstração: sem a análise da foto não há base para estimar valores.',
      },
      advantages:
        variant === 'A'
          ? ['Baixo custo e execução rápida', 'Pode ser feita aos poucos', 'Aproveita móveis existentes']
          : variant === 'B'
            ? ['Bom equilíbrio entre custo e impacto', 'Resultado mais atual e coeso']
            : ['Maior impacto visual', 'Identidade forte e memorável'],
      limitations:
        variant === 'A'
          ? ['Mudança menos perceptível em móveis muito desgastados']
          : variant === 'B'
            ? ['Exige escolher bem as peças substituídas']
            : ['Investimento maior', noWorks ? 'Algumas ideias precisam de versão sem obra' : 'Pode exigir pequenas obras'],
      imagePrompt: `Redesign this ${ROOM_EN[roomType]} as "${names[index]}": ${primary.promptKeywords || 'contemporary interior'}; color palette ${palette.join(', ')}; keep the same camera angle, walls, windows and doors.`,
      scene,
    };
  });

  return { directions, proposals };
}
