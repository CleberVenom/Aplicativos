/**
 * Option catalogs used by the questionnaire, the AI prompts and the demo generator.
 * Ids are stable (persisted in projects); labels are pt-BR copy shown to users.
 */
import type { IconName } from '@/components/icon';

export const ROOM_TYPES = [
  { id: 'sala_estar', label: 'Sala de estar', icon: 'sofa' },
  { id: 'sala_jantar', label: 'Sala de jantar', icon: 'dining' },
  { id: 'quarto', label: 'Quarto', icon: 'bed' },
  { id: 'cozinha', label: 'Cozinha', icon: 'kitchen' },
  { id: 'banheiro', label: 'Banheiro', icon: 'bath' },
  { id: 'escritorio', label: 'Escritório', icon: 'desk' },
  { id: 'varanda', label: 'Varanda', icon: 'balcony' },
  { id: 'area_gourmet', label: 'Área gourmet', icon: 'grill' },
  { id: 'outro', label: 'Outro ambiente', icon: 'grid' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type RoomTypeId = (typeof ROOM_TYPES)[number]['id'];
export const ROOM_TYPE_IDS = ROOM_TYPES.map((r) => r.id) as [RoomTypeId, ...RoomTypeId[]];

export const GOALS = [
  { id: 'decorar', label: 'Apenas decorar', description: 'Objetos, tecidos e acabamentos, sem obras.' },
  { id: 'modernizar', label: 'Modernizar', description: 'Atualizar o visual com uma linguagem atual.' },
  { id: 'organizar', label: 'Melhorar a organização', description: 'Mais armazenamento e menos bagunça visual.' },
  { id: 'espaco', label: 'Aproveitar melhor o espaço', description: 'Layout e circulação mais inteligentes.' },
  { id: 'aconchego', label: 'Deixar mais aconchegante', description: 'Iluminação, texturas e conforto.' },
  { id: 'completa', label: 'Transformação completa', description: 'Repensar o ambiente como um todo.' },
] as const;

export type GoalId = (typeof GOALS)[number]['id'];
export const GOAL_IDS = GOALS.map((g) => g.id) as [GoalId, ...GoalId[]];

/** Goals that may involve physical interventions — they unlock the property step. */
export const INTERVENTION_GOALS: readonly GoalId[] = ['modernizar', 'organizar', 'espaco', 'completa'];

export type StyleOption = {
  id: string;
  label: string;
  description: string;
  palette: readonly string[];
  materials: readonly string[];
  /** English keywords used when prompting image models. */
  promptKeywords: string;
};

export const STYLES = [
  {
    id: 'contemporaneo',
    label: 'Contemporâneo',
    description: 'Linhas limpas, neutros quentes e conforto atual.',
    palette: ['#EDE6DC', '#B9A792', '#5C5148', '#1F1B18'],
    materials: ['madeira clara', 'linho', 'metal escovado'],
    promptKeywords: 'contemporary interior, clean lines, warm neutral palette, refined comfort',
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    description: 'Poucos elementos, muito respiro e funcionalidade.',
    palette: ['#F5F3EF', '#DAD6CF', '#9A958D', '#2B2A28'],
    materials: ['laca fosca', 'madeira clara', 'vidro'],
    promptKeywords: 'minimalist interior, uncluttered, essential furniture, soft monochrome palette',
  },
  {
    id: 'industrial',
    label: 'Industrial',
    description: 'Metal preto, tijolo, cimento e madeira de demolição.',
    palette: ['#C9C3BA', '#8C5A3C', '#4A4744', '#1C1C1C'],
    materials: ['metal preto', 'cimento queimado', 'couro', 'tijolo aparente'],
    promptKeywords: 'industrial loft interior, black metal, exposed brick, concrete, reclaimed wood, leather',
  },
  {
    id: 'escandinavo',
    label: 'Escandinavo',
    description: 'Claro, acolhedor, madeira natural e tecidos macios.',
    palette: ['#FAF8F4', '#E6DDD0', '#C7A982', '#6F7F73'],
    materials: ['carvalho claro', 'lã', 'algodão'],
    promptKeywords: 'scandinavian interior, light oak, white walls, cozy textiles, hygge',
  },
  {
    id: 'classico',
    label: 'Clássico',
    description: 'Simetria, molduras, tecidos nobres e elegância atemporal.',
    palette: ['#F2EBDD', '#C9B48A', '#7A5C3E', '#2E3A4A'],
    materials: ['boiserie', 'veludo', 'latão', 'mármore'],
    promptKeywords: 'classic elegant interior, wall moldings, symmetry, velvet, brass accents, marble',
  },
  {
    id: 'japandi',
    label: 'Japandi',
    description: 'Fusão japonesa e escandinava: calma, baixa e natural.',
    palette: ['#EFE9E1', '#CDBFAE', '#8A7560', '#3B3A36'],
    materials: ['madeira natural', 'papel de arroz', 'cerâmica artesanal', 'linho'],
    promptKeywords: 'japandi interior, low wooden furniture, natural fibers, muted earthy tones, serene',
  },
  {
    id: 'rustico',
    label: 'Rústico',
    description: 'Madeira maciça, texturas naturais e clima de casa de campo.',
    palette: ['#EADCC8', '#B98B5E', '#6B4A33', '#3E3A2F'],
    materials: ['madeira maciça', 'pedra', 'fibras naturais'],
    promptKeywords: 'rustic interior, solid wood beams, natural stone, warm earthy textures',
  },
  {
    id: 'organico',
    label: 'Orgânico e natural',
    description: 'Formas curvas, plantas, fibras e tons de terra.',
    palette: ['#F1E9DD', '#D2B48C', '#8F9779', '#5B4636'],
    materials: ['rattan', 'linho', 'cerâmica', 'madeira'],
    promptKeywords: 'organic modern interior, curved furniture, rattan, linen, plants, earthy palette',
  },
  {
    id: 'luxuoso',
    label: 'Luxuoso',
    description: 'Materiais nobres, contraste e iluminação cênica.',
    palette: ['#F3EEE6', '#B08D57', '#4B3B35', '#141414'],
    materials: ['mármore', 'veludo', 'latão', 'laca brilhante'],
    promptKeywords: 'luxury interior, marble, velvet upholstery, brass details, layered dramatic lighting',
  },
  {
    id: 'outro',
    label: 'Outro estilo',
    description: 'Descreva o estilo ou a combinação que você imagina.',
    palette: ['#E9E3DA', '#BFB3A4', '#8E8173', '#4A423A'],
    materials: [],
    promptKeywords: '',
  },
] as const satisfies readonly StyleOption[];

export type StyleId = (typeof STYLES)[number]['id'];
export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];

export const BUDGETS = [
  { id: 'economico', label: 'Econômico', description: 'Aproveitar ao máximo o que já existe.' },
  { id: 'intermediario', label: 'Intermediário', description: 'Algumas substituições pontuais.' },
  { id: 'elevado', label: 'Elevado', description: 'Mais liberdade para investir.' },
  { id: 'indefinido', label: 'Ainda não sei', description: 'Mostre opções de diferentes níveis.' },
] as const;

export type BudgetId = (typeof BUDGETS)[number]['id'];
export const BUDGET_IDS = BUDGETS.map((b) => b.id) as [BudgetId, ...BudgetId[]];

export const FURNITURE_DECISIONS = [
  { id: 'manter', label: 'Manter' },
  { id: 'reposicionar', label: 'Mover' },
  { id: 'substituir', label: 'Trocar' },
  /** The item does not exist in the room today. */
  { id: 'nao_tenho', label: 'Não tenho' },
] as const;

export type FurnitureDecisionId = (typeof FURNITURE_DECISIONS)[number]['id'];
export const FURNITURE_DECISION_IDS = FURNITURE_DECISIONS.map((d) => d.id) as [
  FurnitureDecisionId,
  ...FurnitureDecisionId[],
];

export const FURNITURE_BY_ROOM: Record<RoomTypeId, readonly string[]> = {
  sala_estar: ['Sofá', 'Poltrona', 'Mesa de centro', 'Rack ou painel de TV', 'Estante', 'Tapete', 'Cortinas', 'Luminárias', 'Quadros e objetos', 'Plantas'],
  sala_jantar: ['Mesa de jantar', 'Cadeiras', 'Aparador ou buffet', 'Cristaleira', 'Lustre ou pendente', 'Tapete', 'Quadros e objetos'],
  quarto: ['Cama', 'Cabeceira', 'Criados-mudos', 'Guarda-roupa', 'Cômoda', 'Escrivaninha ou penteadeira', 'Tapete', 'Cortinas', 'Luminárias'],
  cozinha: ['Armários', 'Bancada', 'Ilha ou península', 'Mesa ou banquetas', 'Eletrodomésticos aparentes', 'Revestimento de parede', 'Iluminação', 'Prateleiras'],
  banheiro: ['Gabinete e bancada', 'Espelho', 'Box', 'Metais (torneiras e chuveiro)', 'Revestimentos', 'Nichos', 'Iluminação', 'Acessórios'],
  escritorio: ['Mesa de trabalho', 'Cadeira', 'Estante ou prateleiras', 'Armário ou gaveteiro', 'Iluminação', 'Tapete', 'Poltrona de leitura'],
  varanda: ['Mobiliário externo', 'Plantas ou jardim vertical', 'Rede ou balanço', 'Iluminação', 'Piso ou deck', 'Cortina ou toldo'],
  area_gourmet: ['Churrasqueira e coifa', 'Bancada', 'Mesa e cadeiras', 'Banquetas', 'Armários', 'Frigobar ou adega', 'Iluminação', 'Revestimentos'],
  outro: ['Móveis principais', 'Iluminação', 'Tapete', 'Cortinas', 'Decoração', 'Armazenamento'],
};

export const COLOR_OPTIONS = [
  { id: 'branco', label: 'Branco', hex: '#FFFFFF' },
  { id: 'off_white', label: 'Off-white', hex: '#F3EEE4' },
  { id: 'bege', label: 'Bege', hex: '#D9C7AE' },
  { id: 'terracota', label: 'Terracota', hex: '#B5603F' },
  { id: 'caramelo', label: 'Caramelo', hex: '#A8743F' },
  { id: 'amarelo_mostarda', label: 'Mostarda', hex: '#C9962E' },
  { id: 'verde_salvia', label: 'Verde-sálvia', hex: '#9CAF94' },
  { id: 'verde_oliva', label: 'Verde-oliva', hex: '#6B7045' },
  { id: 'verde_escuro', label: 'Verde-musgo', hex: '#3E5245' },
  { id: 'azul_claro', label: 'Azul-claro', hex: '#A9C1D3' },
  { id: 'azul_marinho', label: 'Azul-marinho', hex: '#26364F' },
  { id: 'rosa_antigo', label: 'Rosa-antigo', hex: '#C99A97' },
  { id: 'cinza', label: 'Cinza', hex: '#A3A19C' },
  { id: 'grafite', label: 'Grafite', hex: '#4A4A4A' },
  { id: 'preto', label: 'Preto', hex: '#1C1C1C' },
  { id: 'madeira', label: 'Madeira natural', hex: '#A57C52' },
] as const;

export type ColorOptionId = (typeof COLOR_OPTIONS)[number]['id'];

export const MATERIAL_OPTIONS = [
  { id: 'madeira', label: 'Madeira' },
  { id: 'linho', label: 'Linho e algodão' },
  { id: 'couro', label: 'Couro' },
  { id: 'metal_preto', label: 'Metal preto' },
  { id: 'latao', label: 'Latão e dourado' },
  { id: 'marmore', label: 'Mármore e pedras' },
  { id: 'cimento', label: 'Cimento queimado' },
  { id: 'palhinha', label: 'Palhinha e rattan' },
  { id: 'vidro', label: 'Vidro' },
  { id: 'ceramica', label: 'Cerâmica artesanal' },
  { id: 'veludo', label: 'Veludo' },
] as const;

export type MaterialOptionId = (typeof MATERIAL_OPTIONS)[number]['id'];

export const NEED_OPTIONS = [
  { id: 'home_office', label: 'Trabalhar em casa', rooms: ['sala_estar', 'quarto', 'escritorio', 'outro'] },
  { id: 'armazenamento', label: 'Mais armazenamento', rooms: 'all' },
  { id: 'pets', label: 'Tenho pets', rooms: 'all' },
  { id: 'criancas', label: 'Tenho crianças', rooms: 'all' },
  { id: 'receber', label: 'Receber visitas', rooms: ['sala_estar', 'sala_jantar', 'cozinha', 'varanda', 'area_gourmet', 'outro'] },
  { id: 'leitura', label: 'Cantinho de leitura', rooms: ['sala_estar', 'quarto', 'escritorio', 'varanda', 'outro'] },
  { id: 'acessibilidade', label: 'Acessibilidade', rooms: 'all' },
  { id: 'limpeza', label: 'Fácil de limpar', rooms: 'all' },
  { id: 'bancada', label: 'Mais área de bancada', rooms: ['cozinha', 'area_gourmet', 'banheiro'] },
  { id: 'luz_natural', label: 'Mais luz natural', rooms: 'all' },
  { id: 'sono', label: 'Dormir melhor', rooms: ['quarto'] },
] as const satisfies readonly { id: string; label: string; rooms: 'all' | readonly RoomTypeId[] }[];

export type NeedOptionId = (typeof NEED_OPTIONS)[number]['id'];

export function needsForRoom(roomType: RoomTypeId | undefined) {
  return NEED_OPTIONS.filter((n) => n.rooms === 'all' || !roomType || (n.rooms as readonly RoomTypeId[]).includes(roomType));
}

export const TENURES = [
  { id: 'proprio', label: 'Próprio' },
  { id: 'alugado', label: 'Alugado' },
  { id: 'nao_informar', label: 'Prefiro não informar' },
] as const;

export type TenureId = (typeof TENURES)[number]['id'];
export const TENURE_IDS = TENURES.map((t) => t.id) as [TenureId, ...TenureId[]];

export const RENOVATION_SCOPES = [
  { id: 'sem_obras', label: 'Sem obras', description: 'Só móveis, decoração e acabamentos removíveis.' },
  { id: 'pequenas_obras', label: 'Pequenas intervenções', description: 'Pintura, iluminação e marcenaria pontual.' },
  { id: 'reforma', label: 'Reforma completa', description: 'Pisos, revestimentos e instalações podem mudar.' },
] as const;

export type RenovationScopeId = (typeof RENOVATION_SCOPES)[number]['id'];
export const RENOVATION_SCOPE_IDS = RENOVATION_SCOPES.map((r) => r.id) as [RenovationScopeId, ...RenovationScopeId[]];

export const LIMITATIONS = [
  { id: 'nao_furar', label: 'Não posso furar paredes' },
  { id: 'nao_pintar', label: 'Não posso pintar' },
  { id: 'nao_trocar_piso', label: 'Não posso trocar o piso' },
  { id: 'nao_mexer_instalacoes', label: 'Não posso mexer em elétrica ou hidráulica' },
  { id: 'regras_condominio', label: 'Há regras de condomínio' },
] as const;

export type LimitationId = (typeof LIMITATIONS)[number]['id'];
export const LIMITATION_IDS = LIMITATIONS.map((l) => l.id) as [LimitationId, ...LimitationId[]];

export const INVESTMENT_LEVELS = [
  { id: 'economico', label: 'Econômico' },
  { id: 'intermediario', label: 'Intermediário' },
  { id: 'elevado', label: 'Elevado' },
] as const;

export type InvestmentLevelId = (typeof INVESTMENT_LEVELS)[number]['id'];

export function labelOf<T extends { id: string; label: string }>(list: readonly T[], id: string | undefined | null) {
  return list.find((item) => item.id === id)?.label ?? '';
}
