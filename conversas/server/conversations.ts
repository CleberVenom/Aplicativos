import { db } from './db.ts';
import { broadcast } from './events.ts';
import * as whatsapp from './whatsapp.ts';
import type { OutgoingContent } from './whatsapp.ts';

export type Conversation = {
  id: number;
  contact_id: number;
  status: 'bot' | 'waiting' | 'open' | 'closed';
  department_id: number | null;
  assigned_user_id: number | null;
  unread_count: number;
  last_message_at: string;
  last_inbound_at: string | null;
  created_at: string;
  closed_at: string | null;
  wa_id: string;
  contact_name: string;
  department_name: string | null;
  assigned_user_name: string | null;
  last_message: string | null;
};

export type Message = {
  id: number;
  conversation_id: number;
  direction: 'in' | 'out' | 'system';
  type: string;
  body: string;
  media_id: string | null;
  status: string;
  error: string | null;
  user_id: number | null;
  user_name: string | null;
  created_at: string;
};

export const conversationQuery = `
  SELECT c.*, ct.wa_id, ct.name AS contact_name, d.name AS department_name, u.name AS assigned_user_name,
    (SELECT m.body FROM messages m WHERE m.conversation_id = c.id AND m.direction <> 'system'
      ORDER BY m.id DESC LIMIT 1) AS last_message
  FROM conversations c
  JOIN contacts ct ON ct.id = c.contact_id
  LEFT JOIN departments d ON d.id = c.department_id
  LEFT JOIN users u ON u.id = c.assigned_user_id`;

export function getConversation(id: number) {
  return db.prepare(`${conversationQuery} WHERE c.id = ?`).get(id) as Conversation | undefined;
}

export function getMessage(id: number) {
  return db.prepare(`
    SELECT m.*, u.name AS user_name FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ?`).get(id) as Message;
}

export function listMessages(conversationId: number) {
  return db.prepare(`
    SELECT m.*, u.name AS user_name FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.conversation_id = ? ORDER BY m.id`).all(conversationId) as Message[];
}

/** Notifica os atendentes conectados de que a conversa mudou. */
export function publishConversation(id: number) {
  broadcast('conversation', getConversation(id));
}

type NewMessage = {
  direction: Message['direction'];
  type?: string;
  body: string;
  media_id?: string | null;
  wa_message_id?: string | null;
  status: string;
  user_id?: number | null;
};

export function insertMessage(conversationId: number, m: NewMessage): Message {
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO messages (conversation_id, direction, type, body, media_id, wa_message_id, status, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    conversationId, m.direction, m.type ?? 'text', m.body, m.media_id ?? null, m.wa_message_id ?? null, m.status, m.user_id ?? null,
  );
  if (m.direction !== 'system') {
    db.prepare("UPDATE conversations SET last_message_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(conversationId);
  }
  const message = getMessage(Number(lastInsertRowid));
  broadcast('message', message);
  return message;
}

/** Registra um evento na linha do tempo da conversa (ex.: transferências). */
export function addSystemMessage(conversationId: number, body: string) {
  insertMessage(conversationId, { direction: 'system', body, status: 'received' });
}

/**
 * O WhatsApp só permite mensagens livres até 24h depois da última mensagem do cliente.
 * Fora dessa janela é preciso enviar um modelo (template) aprovado pela Meta.
 */
export function isWindowOpen(conversation: Pick<Conversation, 'last_inbound_at'>) {
  return conversation.last_inbound_at !== null && Date.now() - Date.parse(conversation.last_inbound_at) < 24 * 3600 * 1000;
}

/** Grava a mensagem como pendente, envia pelo WhatsApp e atualiza o status com o resultado. */
export async function sendOutgoing(conversationId: number, content: OutgoingContent, userId: number | null): Promise<Message> {
  const { wa_id } = db.prepare(
    'SELECT ct.wa_id FROM conversations c JOIN contacts ct ON ct.id = c.contact_id WHERE c.id = ?',
  ).get(conversationId) as { wa_id: string };
  const message = 'text' in content
    ? insertMessage(conversationId, { direction: 'out', body: content.text, status: 'pending', user_id: userId })
    : insertMessage(conversationId, {
        direction: 'out',
        type: 'template',
        body: [`Modelo: ${content.template.name}`, ...content.template.params].join('\n'),
        status: 'pending',
        user_id: userId,
      });
  publishConversation(conversationId);
  try {
    const waMessageId = await whatsapp.sendMessage(wa_id, content);
    db.prepare("UPDATE messages SET status = 'sent', wa_message_id = ? WHERE id = ?").run(waMessageId, message.id);
  } catch (error) {
    db.prepare("UPDATE messages SET status = 'failed', error = ? WHERE id = ?").run((error as Error).message, message.id);
  }
  const updated = getMessage(message.id);
  broadcast('message', updated);
  return updated;
}
