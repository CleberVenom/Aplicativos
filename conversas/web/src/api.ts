export async function api<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && path !== '/login') window.dispatchEvent(new Event('unauthorized'));
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
  return data as T;
}

export const STATUS_LABEL = { bot: 'No chatbot', waiting: 'Na fila', open: 'Em atendimento', closed: 'Finalizada' };

export function formatPhone(waId: string) {
  const br = waId.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return br ? `+55 (${br[1]}) ${br[2]}-${br[3]}` : `+${waId}`;
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return date.toDateString() === new Date().toDateString()
    ? time
    : `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';
}
