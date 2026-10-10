import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.ts';

// Cliente mínimo da WhatsApp Cloud API (API oficial da Meta).
// https://developers.facebook.com/docs/whatsapp/cloud-api

export type Template = { name: string; language: string; params: string[] };
export type OutgoingContent = { text: string } | { template: Template };

export const isConfigured = () => Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId);

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://graph.facebook.com/${config.whatsapp.apiVersion}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.whatsapp.token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `WhatsApp respondeu HTTP ${res.status}`);
  return data;
}

/** Envia uma mensagem e devolve o id (wamid) atribuído pelo WhatsApp. */
export async function sendMessage(to: string, content: OutgoingContent): Promise<string> {
  if (!isConfigured()) throw new Error('WhatsApp não configurado: defina WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID.');
  const message = 'text' in content
    ? { type: 'text', text: { body: content.text } }
    : {
        type: 'template',
        template: {
          name: content.template.name,
          language: { code: content.template.language },
          components: content.template.params.length
            ? [{ type: 'body', parameters: content.template.params.map((text) => ({ type: 'text', text })) }]
            : undefined,
        },
      };
  const data = await graph<{ messages: { id: string }[] }>(`${config.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...message }),
  });
  return data.messages[0].id;
}

/** Baixa uma mídia recebida (imagem, áudio, documento...). */
export async function downloadMedia(mediaId: string): Promise<{ contentType: string; data: Buffer }> {
  const media = await graph<{ url: string; mime_type: string }>(encodeURIComponent(mediaId));
  const res = await fetch(media.url, { headers: { Authorization: `Bearer ${config.whatsapp.token}` } });
  if (!res.ok) throw new Error(`Falha ao baixar mídia: HTTP ${res.status}`);
  return { contentType: media.mime_type, data: Buffer.from(await res.arrayBuffer()) };
}

/** Confere o cabeçalho X-Hub-Signature-256 enviado pela Meta em cada webhook. */
export function verifySignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!config.whatsapp.appSecret) return true;
  const expected = Buffer.from(`sha256=${createHmac('sha256', config.whatsapp.appSecret).update(rawBody).digest('hex')}`);
  const received = Buffer.from(header ?? '');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
