import { COLOR_OPTIONS, type ColorOptionId } from './catalog';
import type { InvestmentLevel, ProposalContent } from './design';
import type { SceneItemKind } from './scene';

/**
 * Adjustments available in demo mode. Free-text requests need the AI; these are
 * deterministic edits applied on the device, and they are labeled as such.
 */
export type DemoAdjustment =
  | { type: 'cheaper' }
  | { type: 'accent'; colorId: ColorOptionId }
  | { type: 'keep'; item: string }
  | { type: 'warmer_light' };

export const FURNITURE_TO_KIND: Record<string, SceneItemKind[]> = {
  'Sofá': ['sofa'],
  'Poltrona': ['poltrona'],
  'Mesa de centro': ['mesa_centro'],
  'Rack ou painel de TV': ['rack_tv'],
  'Estante': ['estante'],
  'Tapete': ['tapete'],
  'Cortinas': ['cortina'],
  'Luminárias': ['luminaria_piso', 'pendente'],
  'Quadros e objetos': ['quadro'],
  'Plantas': ['planta'],
  'Mesa de jantar': ['mesa_jantar'],
  'Cadeiras': ['cadeira'],
  'Aparador ou buffet': ['aparador'],
  'Cristaleira': ['estante'],
  'Lustre ou pendente': ['pendente'],
  'Cama': ['cama'],
  'Cabeceira': ['cama'],
  'Criados-mudos': ['criado_mudo'],
  'Guarda-roupa': ['guarda_roupa'],
  'Cômoda': ['comoda'],
  'Escrivaninha ou penteadeira': ['escrivaninha'],
  'Armários': ['armario', 'armario_aereo'],
  'Bancada': ['bancada', 'pia'],
  'Ilha ou península': ['ilha'],
  'Mesa ou banquetas': ['mesa_jantar', 'banqueta'],
  'Eletrodomésticos aparentes': ['geladeira', 'fogao'],
  'Prateleiras': ['prateleira'],
  'Gabinete e bancada': ['gabinete_banheiro'],
  'Espelho': ['espelho'],
  'Box': ['box_chuveiro'],
  'Nichos': ['prateleira'],
  'Mesa de trabalho': ['escrivaninha'],
  'Cadeira': ['cadeira'],
  'Estante ou prateleiras': ['estante', 'prateleira'],
  'Armário ou gaveteiro': ['armario'],
  'Poltrona de leitura': ['poltrona'],
  'Mobiliário externo': ['poltrona', 'mesa_lateral'],
  'Plantas ou jardim vertical': ['planta'],
  'Rede ou balanço': ['rede'],
  'Churrasqueira e coifa': ['churrasqueira'],
  'Mesa e cadeiras': ['mesa_jantar', 'cadeira'],
  'Banquetas': ['banqueta'],
  'Frigobar ou adega': ['geladeira'],
  'Móveis principais': ['aparador', 'poltrona'],
  'Armazenamento': ['estante'],
};

const LOWER: Record<InvestmentLevel, InvestmentLevel> = {
  elevado: 'intermediario',
  intermediario: 'economico',
  economico: 'economico',
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function describeDemoAdjustment(adjustment: DemoAdjustment): string {
  switch (adjustment.type) {
    case 'cheaper':
      return 'Deixar a proposta mais econômica';
    case 'accent':
      return `Usar ${COLOR_OPTIONS.find((c) => c.id === adjustment.colorId)?.label.toLowerCase() ?? 'outra cor'} como cor de destaque`;
    case 'keep':
      return `Manter: ${adjustment.item.toLowerCase()}`;
    case 'warmer_light':
      return 'Iluminação mais quente e aconchegante';
  }
}

export function applyDemoAdjustment(content: ProposalContent, adjustment: DemoAdjustment): { content: ProposalContent; summary: string } {
  const next: ProposalContent = structuredClone(content);

  switch (adjustment.type) {
    case 'cheaper': {
      const replaced = next.changes.replace;
      next.investment.level = LOWER[next.investment.level];
      next.changes.keep = [...next.changes.keep, ...replaced.map((r) => `${r} (renovado com capa, pintura ou tecido)`)];
      next.changes.replace = [];
      next.plan = next.plan.map((p) =>
        p.area === 'materiais_texturas'
          ? { ...p, actions: [...p.actions, 'Priorizar intervenções de baixo custo: capas, pintura de móveis e troca de tecidos.'] }
          : p,
      );
      next.scene.items = next.scene.items.map((i) => (i.status === 'substituido' ? { ...i, status: 'mantido' } : i));
      next.advantages = [...new Set([...next.advantages, 'Investimento menor que a versão anterior'])];
      return { content: next, summary: 'Peças que seriam substituídas agora são renovadas, e o nível de investimento foi reduzido.' };
    }
    case 'accent': {
      const color = COLOR_OPTIONS.find((c) => c.id === adjustment.colorId);
      if (!color) return { content, summary: 'Cor não encontrada; nada foi alterado.' };
      const accent = next.palette.find((p) => p.role === 'destaque') ?? next.palette[2];
      const oldHex = accent?.hex.toUpperCase();
      if (accent) {
        accent.hex = color.hex;
        accent.name = color.label;
      }
      next.scene.items = next.scene.items.map((i) => (oldHex && i.color.toUpperCase() === oldHex ? { ...i, color: color.hex } : i));
      if (next.scene.accentWall) next.scene.accentWall = { ...next.scene.accentWall, color: color.hex };
      next.plan = next.plan.map((p) =>
        p.area === 'tecidos_decoracao'
          ? { ...p, actions: [`Usar ${color.label.toLowerCase()} como cor de destaque em almofadas, mantas e objetos.`, ...p.actions.slice(1)] }
          : p,
      );
      return { content: next, summary: `A cor de destaque passou a ser ${color.label.toLowerCase()}.` };
    }
    case 'keep': {
      const item = adjustment.item;
      next.changes.keep = [...next.changes.keep.filter((k) => !same(k, item)), item];
      next.changes.replace = next.changes.replace.filter((k) => !same(k, item));
      next.changes.remove = next.changes.remove.filter((k) => !same(k, item));
      next.changes.reposition = next.changes.reposition.filter((k) => !same(k, item));
      const kinds = FURNITURE_TO_KIND[item] ?? [];
      next.scene.items = next.scene.items.map((i) => (kinds.includes(i.kind) ? { ...i, status: 'mantido' } : i));
      return { content: next, summary: `${item} será mantido(a) como está.` };
    }
    case 'warmer_light': {
      const action = 'Usar lâmpadas de 2700 K, dimerizáveis, e pontos de luz indireta em abajures e luminárias de piso.';
      const hasLighting = next.plan.some((p) => p.area === 'iluminacao');
      next.plan = hasLighting
        ? next.plan.map((p) => (p.area === 'iluminacao' ? { ...p, actions: [...p.actions, action] } : p))
        : [...next.plan, { area: 'iluminacao', actions: [action] }];
      return { content: next, summary: 'A iluminação ficou mais quente, com luz indireta e dimerizável.' };
    }
  }
}
