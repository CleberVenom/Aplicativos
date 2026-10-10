/** Parses "3,5" or "3.5" (meters). Returns undefined when empty or out of range. */
export function parseMeters(text: string): number | undefined {
  const value = Number(text.replace(',', '.').trim());
  return text.trim() && Number.isFinite(value) && value > 0 && value <= 50 ? Math.round(value * 100) / 100 : undefined;
}

export function formatMeters(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m`;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
