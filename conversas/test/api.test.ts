import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

Object.assign(process.env, {
  DATABASE_PATH: ':memory:',
  ADMIN_EMAIL: 'admin@teste.com',
  ADMIN_PASSWORD: 'senha-admin',
  WHATSAPP_TOKEN: 'token-teste',
  WHATSAPP_PHONE_NUMBER_ID: '1000',
  WHATSAPP_VERIFY_TOKEN: 'verifica',
  WHATSAPP_APP_SECRET: 'segredo',
});

// Substitui a Graph API da Meta: registra o que seria enviado ao WhatsApp.
const sent: { to: string; type: string; text?: { body: string }; template?: { name: string } }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (!String(input).startsWith('https://graph.facebook.com/')) return realFetch(input, init);
  sent.push(JSON.parse(String(init?.body)));
  return Response.json({ messages: [{ id: `wamid.out.${sent.length}` }] });
};

const { createApp } = await import('../server/routes.ts');
const { db, seed } = await import('../server/db.ts');

let server: Server;
let base: string;
let adminCookie: string;

before(async () => {
  seed(); // admin + setores "Comercial" e "Suporte"
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  adminCookie = await login('admin@teste.com', 'senha-admin');
});

after(() => server.close());

async function call(path: string, cookie: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<{ status: number; data: any }> {
  const res = await fetch(base + path, {
    method,
    headers: { cookie, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

async function login(email: string, password: string) {
  const res = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200);
  return res.headers.get('set-cookie')!.split(';')[0];
}

async function postWebhook(value: object, signature?: string) {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value }] }] });
  return fetch(`${base}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signature ?? `sha256=${createHmac('sha256', 'segredo').update(body).digest('hex')}`,
    },
    body,
  });
}

let messageCounter = 0;
function customerSays(from: string, text: string, name = 'Cliente') {
  return postWebhook({
    contacts: [{ wa_id: from, profile: { name } }],
    messages: [{ id: `wamid.in.${++messageCounter}`, from, type: 'text', text: { body: text } }],
  });
}

function activeConversation(waId: string) {
  return db.prepare(`SELECT c.* FROM conversations c JOIN contacts ct ON ct.id = c.contact_id
    WHERE ct.wa_id = ? AND c.status <> 'closed'`).get(waId) as { id: number; status: string; department_id: number | null };
}

const lastSent = () => sent.at(-1)!;

test('verificação do webhook pela Meta', async () => {
  const ok = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=123`);
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), '123');
  const wrong = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123`);
  assert.equal(wrong.status, 403);
});

test('rejeita webhook com assinatura inválida', async () => {
  const res = await postWebhook({
    messages: [{ id: 'wamid.falso', from: '5500000000000', type: 'text', text: { body: 'oi' } }],
  }, 'sha256=invalida');
  assert.equal(res.status, 401);
  assert.equal(db.prepare("SELECT 1 FROM messages WHERE wa_message_id = 'wamid.falso'").get(), undefined);
});

test('chatbot faz a triagem e coloca o cliente na fila do setor', async () => {
  const phone = '5511911110001';
  await customerSays(phone, 'Olá, preciso de ajuda', 'Maria Souza');

  const contact = db.prepare('SELECT name FROM contacts WHERE wa_id = ?').get(phone) as { name: string };
  assert.equal(contact.name, 'Maria Souza');
  assert.equal(activeConversation(phone).status, 'bot');
  assert.equal(lastSent().to, phone);
  assert.match(lastSent().text!.body, /\*1\* - Comercial\n\*2\* - Suporte/);

  await customerSays(phone, '7');
  assert.equal(activeConversation(phone).status, 'bot');
  assert.match(lastSent().text!.body, /não entendi/);

  await customerSays(phone, ' 2 ');
  const conversation = activeConversation(phone);
  assert.equal(conversation.status, 'waiting');
  assert.equal((db.prepare('SELECT name FROM departments WHERE id = ?').get(conversation.department_id!) as { name: string }).name, 'Suporte');
  assert.match(lastSent().text!.body, /fila do setor \*Suporte\*/);
});

test('ignora webhooks repetidos da mesma mensagem', async () => {
  const phone = '5511911110002';
  const value = {
    contacts: [{ wa_id: phone, profile: { name: 'Repetido' } }],
    messages: [{ id: 'wamid.repetida', from: phone, type: 'text', text: { body: 'oi' } }],
  };
  await postWebhook(value);
  await postWebhook(value);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE wa_message_id = 'wamid.repetida'").get() as { n: number };
  assert.equal(n, 1);
});

test('atendente assume, responde e acompanha o status da entrega', async () => {
  const phone = '5511911110003';
  await customerSays(phone, 'Oi');
  await customerSays(phone, '1');
  const { id } = activeConversation(phone);

  const blocked = await call(`/api/conversations/${id}/messages`, adminCookie, { text: 'Olá!' });
  assert.equal(blocked.status, 409, 'precisa assumir antes de responder');

  const assigned = await call(`/api/conversations/${id}/assign`, adminCookie, {});
  assert.equal(assigned.data.status, 'open');
  assert.equal(assigned.data.assigned_user_name, 'Administrador');

  const reply = await call(`/api/conversations/${id}/messages`, adminCookie, { text: 'Olá! Em que posso ajudar?' });
  assert.equal(reply.status, 201);
  assert.equal(reply.data.status, 'sent');
  assert.deepEqual(lastSent(), {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { body: 'Olá! Em que posso ajudar?' },
  });

  const waMessageId = (db.prepare('SELECT wa_message_id FROM messages WHERE id = ?').get(reply.data.id) as { wa_message_id: string }).wa_message_id;
  // "read" chega antes de "delivered": o status não pode regredir.
  await postWebhook({ statuses: [{ id: waMessageId, status: 'read' }] });
  await postWebhook({ statuses: [{ id: waMessageId, status: 'delivered' }] });
  const { data } = await call(`/api/conversations/${id}`, adminCookie);
  assert.equal(data.messages.at(-1).status, 'read');
  assert.ok(data.messages.some((m: { direction: string; body: string }) => m.direction === 'system' && /assumiu/.test(m.body)));
});

test('fora da janela de 24h só é possível enviar modelo aprovado', async () => {
  const phone = '5511911110004';
  await customerSays(phone, 'Oi');
  const { id } = activeConversation(phone);
  await call(`/api/conversations/${id}/assign`, adminCookie, {});
  db.prepare("UPDATE conversations SET last_inbound_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(id);

  const text = await call(`/api/conversations/${id}/messages`, adminCookie, { text: 'Ainda precisa de ajuda?' });
  assert.equal(text.status, 409);

  const template = await call(`/api/conversations/${id}/messages`, adminCookie, {
    template: { name: 'retomar_contato', language: 'pt_BR', params: ['Maria'] },
  });
  assert.equal(template.status, 201);
  assert.deepEqual(lastSent().template, {
    name: 'retomar_contato',
    language: { code: 'pt_BR' },
    components: [{ type: 'body', parameters: [{ type: 'text', text: 'Maria' }] }],
  });
});

test('transferência entre setores e atendentes', async () => {
  const agentEmail = 'joao@teste.com';
  const created = await call('/api/users', adminCookie, { name: 'João', email: agentEmail, password: 'senha123', role: 'agent' });
  assert.equal(created.status, 201);
  const agentCookie = await login(agentEmail, 'senha123');

  const phone = '5511911110005';
  await customerSays(phone, 'Oi');
  const { id } = activeConversation(phone);
  await call(`/api/conversations/${id}/assign`, adminCookie, {});

  const toAgent = await call(`/api/conversations/${id}/transfer`, adminCookie, { user_id: created.data.id });
  assert.equal(toAgent.data.assigned_user_name, 'João');
  const mine = await call('/api/conversations?tab=mine', agentCookie);
  assert.deepEqual(mine.data.conversations.map((c: { id: number }) => c.id), [id]);

  const toDepartment = await call(`/api/conversations/${id}/transfer`, agentCookie, { department_id: 1 });
  assert.equal(toDepartment.data.status, 'waiting');
  assert.equal(toDepartment.data.assigned_user_id, null);
  assert.equal(toDepartment.data.department_name, 'Comercial');

  const forbidden = await call('/api/departments', agentCookie, { name: 'Financeiro' });
  assert.equal(forbidden.status, 403, 'atendente comum não gerencia setores');
});

test('finalizar envia a mensagem de encerramento e a próxima mensagem abre nova conversa', async () => {
  const phone = '5511911110006';
  await customerSays(phone, 'Oi');
  const { id } = activeConversation(phone);
  await call(`/api/conversations/${id}/assign`, adminCookie, {});

  const closed = await call(`/api/conversations/${id}/close`, adminCookie, {});
  assert.equal(closed.data.status, 'closed');
  assert.match(lastSent().text!.body, /atendimento foi finalizado/);

  await customerSays(phone, 'Oi de novo');
  const next = activeConversation(phone);
  assert.notEqual(next.id, id);
  assert.equal(next.status, 'bot');
});

test('login inválido e rotas protegidas', async () => {
  const res = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@teste.com', password: 'errada' }),
  });
  assert.equal(res.status, 401);
  assert.equal((await call('/api/conversations', '')).status, 401);
});
