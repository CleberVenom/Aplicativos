import { db, getSettings } from './db.ts';
import { broadcast } from './events.ts';
import {
  addSystemMessage, getMessage, insertMessage, publishConversation, sendOutgoing, type Conversation,
} from './conversations.ts';

// Formato do webhook da WhatsApp Cloud API (apenas os campos usados aqui).
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
type Media = { id: string; caption?: string; filename?: string };
type InboundMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  image?: Media; audio?: Media; video?: Media; document?: Media; sticker?: Media;
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
  button?: { text: string };
  location?: { latitude: number; longitude: number; name?: string };
};
type StatusUpdate = {
  id: string;
  status: string;
  errors?: { title?: string; error_data?: { details?: string } }[];
};
export type WebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: InboundMessage[];
        statuses?: StatusUpdate[];
      };
    }[];
  }[];
};

export async function handleWebhook(payload: WebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const { value } of entry.changes ?? []) {
      for (const status of value?.statuses ?? []) applyStatus(status);
      for (const message of value?.messages ?? []) {
        const profileName = value?.contacts?.find((c) => c.wa_id === message.from)?.profile?.name ?? '';
        await receiveMessage(message, profileName);
      }
    }
  }
}

function describe(m: InboundMessage): { body: string; media_id: string | null } {
  const media = m.image ?? m.audio ?? m.video ?? m.document ?? m.sticker;
  if (media) return { body: media.caption ?? media.filename ?? '', media_id: media.id };
  const body = m.text?.body
    ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title
    ?? m.button?.text
    ?? (m.location && `📍 ${m.location.name ?? 'Localização'}: https://maps.google.com/?q=${m.location.latitude},${m.location.longitude}`)
    ?? `[mensagem do tipo "${m.type}" não suportada]`;
  return { body, media_id: null };
}

async function receiveMessage(m: InboundMessage, profileName: string) {
  // A Meta pode reenviar o mesmo webhook; ignoramos mensagens já gravadas.
  if (db.prepare('SELECT 1 FROM messages WHERE wa_message_id = ?').get(m.id)) return;

  db.prepare('INSERT INTO contacts (wa_id, name) VALUES (?, ?) ON CONFLICT (wa_id) DO NOTHING').run(m.from, profileName);
  const contact = db.prepare('SELECT id FROM contacts WHERE wa_id = ?').get(m.from) as { id: number };

  let conversation = db.prepare("SELECT id, status FROM conversations WHERE contact_id = ? AND status <> 'closed'")
    .get(contact.id) as Pick<Conversation, 'id' | 'status'> | undefined;
  const isNew = !conversation;
  if (!conversation) {
    const status = botMenu() ? 'bot' : 'waiting';
    const { lastInsertRowid } = db.prepare('INSERT INTO conversations (contact_id, status) VALUES (?, ?)').run(contact.id, status);
    conversation = { id: Number(lastInsertRowid), status };
  }

  const { body, media_id } = describe(m);
  insertMessage(conversation.id, { direction: 'in', type: m.type, body, media_id, wa_message_id: m.id, status: 'received' });
  db.prepare(`UPDATE conversations SET unread_count = unread_count + 1,
    last_inbound_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).run(conversation.id);
  publishConversation(conversation.id);

  if (conversation.status === 'bot') await runBot(conversation.id, isNew, body);
}

/** Menu numerado com os setores, ou null se o chatbot estiver desligado ou não houver setores. */
function botMenu() {
  if (getSettings().bot_enabled !== '1') return null;
  const departments = db.prepare('SELECT id, name FROM departments ORDER BY id').all() as { id: number; name: string }[];
  if (!departments.length) return null;
  return { departments, text: departments.map((d, i) => `*${i + 1}* - ${d.name}`).join('\n') };
}

/** Chatbot de triagem: cumprimenta, mostra os setores e coloca o cliente na fila do setor escolhido. */
async function runBot(conversationId: number, isNew: boolean, answer: string) {
  const settings = getSettings();
  const menu = botMenu();
  if (!menu) {
    db.prepare("UPDATE conversations SET status = 'waiting' WHERE id = ?").run(conversationId);
    return publishConversation(conversationId);
  }
  if (isNew) {
    await sendOutgoing(conversationId, { text: `${settings.bot_greeting}\n\n${menu.text}` }, null);
    return;
  }

  const department = menu.departments[Number(answer.trim()) - 1];
  if (!department) {
    await sendOutgoing(conversationId, { text: `${settings.bot_invalid_option}\n\n${menu.text}` }, null);
    return;
  }

  db.prepare("UPDATE conversations SET status = 'waiting', department_id = ? WHERE id = ?").run(department.id, conversationId);
  addSystemMessage(conversationId, `Cliente escolheu o setor ${department.name} e entrou na fila`);
  publishConversation(conversationId);
  await sendOutgoing(conversationId, { text: settings.bot_queued.replaceAll('{setor}', department.name) }, null);
}

// Os status podem chegar fora de ordem; nunca voltamos de "lida" para "entregue".
const STATUS_RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 };

function applyStatus(s: StatusUpdate) {
  const message = db.prepare('SELECT id, status FROM messages WHERE wa_message_id = ?').get(s.id) as
    { id: number; status: string } | undefined;
  if (!message) return;
  if (s.status === 'failed') {
    const error = s.errors?.[0]?.error_data?.details ?? s.errors?.[0]?.title ?? 'Falha no envio';
    db.prepare("UPDATE messages SET status = 'failed', error = ? WHERE id = ?").run(error, message.id);
  } else if (STATUS_RANK[s.status] > STATUS_RANK[message.status]) {
    db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(s.status, message.id);
  } else {
    return;
  }
  broadcast('message', getMessage(message.id));
}
