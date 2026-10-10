import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.ts';
import { db, defaultSettings, getSettings } from './db.ts';
import { hashPassword } from './passwords.ts';
import { currentUser, login, logout, requireAdmin, requireAuth, setSessionCookie } from './auth.ts';
import { subscribe } from './events.ts';
import {
  addSystemMessage, conversationQuery, getConversation, isWindowOpen, listMessages, publishConversation, sendOutgoing,
} from './conversations.ts';
import { handleWebhook } from './inbound.ts';
import * as whatsapp from './whatsapp.ts';

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });
const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function findConversation(id: string) {
  const conversation = getConversation(Number(id));
  if (!conversation) throw httpError(404, 'Conversa não encontrada.');
  return conversation;
}

function findActiveConversation(id: string) {
  const conversation = findConversation(id);
  if (conversation.status === 'closed') throw httpError(409, 'Esta conversa já foi finalizada.');
  return conversation;
}

type Contact = { id: number; wa_id: string; name: string; email: string; notes: string; tags: string[]; created_at: string };

function findContact(id: number): Contact {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as (Contact & { tags: string }) | undefined;
  if (!row) throw httpError(404, 'Contato não encontrado.');
  return { ...row, tags: JSON.parse(row.tags) };
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  // ---- Webhook do WhatsApp (configurado no painel de desenvolvedores da Meta) ----

  app.get('/webhook', (req, res) => {
    const verified = req.query['hub.mode'] === 'subscribe'
      && config.whatsapp.verifyToken !== ''
      && req.query['hub.verify_token'] === config.whatsapp.verifyToken;
    if (!verified) return res.sendStatus(403);
    res.type('text/plain').send(String(req.query['hub.challenge']));
  });

  app.post('/webhook', express.raw({ type: '*/*', limit: '5mb' }), async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!whatsapp.verifySignature(raw, req.get('x-hub-signature-256'))) return res.sendStatus(401);
    try {
      await handleWebhook(JSON.parse(raw.toString('utf8')));
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
    }
    res.sendStatus(200);
  });

  // ---- API usada pelo painel dos atendentes ----

  const api = express.Router();
  api.use(express.json());

  api.post('/login', (req, res) => {
    const session = login(str(req.body.email), String(req.body.password ?? ''));
    if (!session) throw httpError(401, 'E-mail ou senha inválidos.');
    setSessionCookie(req, res, session.token);
    res.json(session.user);
  });

  api.use(requireAuth);

  api.post('/logout', (req, res) => {
    logout(req, res);
    res.sendStatus(204);
  });

  api.get('/me', (_req, res) => res.json(currentUser(res)));
  api.get('/events', subscribe);

  // Conversas

  api.get('/conversations', (req, res) => {
    const me = currentUser(res);
    const where: string[] = [];
    const params: (string | number)[] = [];
    switch (req.query.tab) {
      case 'mine': where.push("c.status = 'open' AND c.assigned_user_id = ?"); params.push(me.id); break;
      case 'waiting': where.push("c.status = 'waiting'"); break;
      case 'closed': where.push("c.status = 'closed'"); break;
      default: where.push("c.status <> 'closed'");
    }
    if (req.query.department_id) {
      where.push('c.department_id = ?');
      params.push(Number(req.query.department_id));
    }
    const q = str(req.query.q);
    if (q) {
      where.push('(ct.name LIKE ? OR ct.wa_id LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const conversations = db.prepare(
      `${conversationQuery} WHERE ${where.join(' AND ')} ORDER BY c.last_message_at DESC LIMIT 200`,
    ).all(...params);
    const counts = db.prepare(`
      SELECT COALESCE(SUM(status = 'open' AND assigned_user_id = ?), 0) AS mine,
        COALESCE(SUM(status = 'waiting'), 0) AS waiting,
        COALESCE(SUM(status <> 'closed'), 0) AS active
      FROM conversations`).get(me.id);
    res.json({ conversations, counts });
  });

  api.get('/conversations/:id', (req, res) => {
    let conversation = findConversation(req.params.id);
    if (conversation.unread_count && conversation.assigned_user_id === currentUser(res).id) {
      db.prepare('UPDATE conversations SET unread_count = 0 WHERE id = ?').run(conversation.id);
      publishConversation(conversation.id);
      conversation = findConversation(req.params.id);
    }
    res.json({ conversation, contact: findContact(conversation.contact_id), messages: listMessages(conversation.id) });
  });

  api.post('/conversations/:id/assign', (req, res) => {
    const me = currentUser(res);
    const conversation = findActiveConversation(req.params.id);
    db.prepare("UPDATE conversations SET status = 'open', assigned_user_id = ?, unread_count = 0 WHERE id = ?")
      .run(me.id, conversation.id);
    addSystemMessage(conversation.id, `${me.name} assumiu o atendimento`);
    publishConversation(conversation.id);
    res.json(getConversation(conversation.id));
  });

  api.post('/conversations/:id/transfer', (req, res) => {
    const me = currentUser(res);
    const conversation = findActiveConversation(req.params.id);
    if (req.body.user_id) {
      const user = db.prepare('SELECT id, name FROM users WHERE id = ? AND active = 1').get(Number(req.body.user_id)) as
        { id: number; name: string } | undefined;
      if (!user) throw httpError(404, 'Atendente não encontrado.');
      db.prepare("UPDATE conversations SET status = 'open', assigned_user_id = ? WHERE id = ?").run(user.id, conversation.id);
      addSystemMessage(conversation.id, `${me.name} transferiu o atendimento para ${user.name}`);
    } else if (req.body.department_id) {
      const department = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(Number(req.body.department_id)) as
        { id: number; name: string } | undefined;
      if (!department) throw httpError(404, 'Setor não encontrado.');
      db.prepare("UPDATE conversations SET status = 'waiting', assigned_user_id = NULL, department_id = ? WHERE id = ?")
        .run(department.id, conversation.id);
      addSystemMessage(conversation.id, `${me.name} transferiu o atendimento para a fila do setor ${department.name}`);
    } else {
      throw httpError(400, 'Informe o atendente ou o setor de destino.');
    }
    publishConversation(conversation.id);
    res.json(getConversation(conversation.id));
  });

  api.post('/conversations/:id/close', async (req, res) => {
    const me = currentUser(res);
    const conversation = findActiveConversation(req.params.id);
    db.prepare("UPDATE conversations SET status = 'closed', closed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
      .run(conversation.id);
    addSystemMessage(conversation.id, `${me.name} finalizou o atendimento`);
    publishConversation(conversation.id);
    const { closing_message } = getSettings();
    if (closing_message.trim() && isWindowOpen(conversation)) {
      await sendOutgoing(conversation.id, { text: closing_message }, null);
    }
    res.json(getConversation(conversation.id));
  });

  api.post('/conversations/:id/messages', async (req, res) => {
    const me = currentUser(res);
    const conversation = findActiveConversation(req.params.id);
    if (conversation.status !== 'open' || conversation.assigned_user_id !== me.id) {
      throw httpError(409, 'Assuma o atendimento antes de responder.');
    }
    let content: whatsapp.OutgoingContent;
    if (req.body.template) {
      const name = str(req.body.template.name);
      if (!name) throw httpError(400, 'Informe o nome do modelo.');
      const params = Array.isArray(req.body.template.params) ? req.body.template.params.map(String) : [];
      content = { template: { name, language: str(req.body.template.language) || 'pt_BR', params } };
    } else {
      const text = str(req.body.text);
      if (!text) throw httpError(400, 'A mensagem está vazia.');
      if (!isWindowOpen(conversation)) {
        throw httpError(409, 'Passaram-se mais de 24h desde a última mensagem do cliente. Envie um modelo aprovado.');
      }
      content = { text };
    }
    res.status(201).json(await sendOutgoing(conversation.id, content, me.id));
  });

  // Contatos

  api.patch('/contacts/:id', (req, res) => {
    const contact = findContact(Number(req.params.id));
    const { name, email, notes, tags } = req.body;
    db.prepare('UPDATE contacts SET name = ?, email = ?, notes = ?, tags = ? WHERE id = ?').run(
      str(name ?? contact.name),
      str(email ?? contact.email),
      str(notes ?? contact.notes),
      JSON.stringify(Array.isArray(tags) ? [...new Set(tags.map(str).filter(Boolean))] : contact.tags),
      contact.id,
    );
    const active = db.prepare("SELECT id FROM conversations WHERE contact_id = ? AND status <> 'closed'")
      .get(contact.id) as { id: number } | undefined;
    if (active) publishConversation(active.id);
    res.json(findContact(contact.id));
  });

  api.get('/media/:id', async (req, res) => {
    const media = await whatsapp.downloadMedia(req.params.id);
    res.set('Cache-Control', 'private, max-age=86400').type(media.contentType).send(media.data);
  });

  // Atendentes

  api.get('/users', (_req, res) => {
    res.json(db.prepare('SELECT id, name, email, role, active FROM users ORDER BY name').all());
  });

  api.post('/users', requireAdmin, (req, res) => {
    const name = str(req.body.name);
    const email = str(req.body.email);
    const password = String(req.body.password ?? '');
    const role = req.body.role === 'admin' ? 'admin' : 'agent';
    if (!name || !email || password.length < 6) throw httpError(400, 'Informe nome, e-mail e uma senha com 6+ caracteres.');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw httpError(409, 'Este e-mail já está em uso.');
    const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, email, hashPassword(password), role);
    res.status(201).json({ id: Number(lastInsertRowid), name, email, role, active: 1 });
  });

  /** Desativa o atendente e devolve os atendimentos dele para a fila. */
  api.delete('/users/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (id === currentUser(res).id) throw httpError(400, 'Você não pode desativar a si mesmo.');
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    const open = db.prepare("SELECT id FROM conversations WHERE status = 'open' AND assigned_user_id = ?").all(id) as { id: number }[];
    for (const { id: conversationId } of open) {
      db.prepare("UPDATE conversations SET status = 'waiting', assigned_user_id = NULL WHERE id = ?").run(conversationId);
      addSystemMessage(conversationId, 'Atendente desativado; conversa devolvida para a fila');
      publishConversation(conversationId);
    }
    res.sendStatus(204);
  });

  // Setores

  api.get('/departments', (_req, res) => {
    res.json(db.prepare('SELECT id, name FROM departments ORDER BY id').all());
  });

  api.post('/departments', requireAdmin, (req, res) => {
    const name = str(req.body.name);
    if (!name) throw httpError(400, 'Informe o nome do setor.');
    const { lastInsertRowid } = db.prepare('INSERT INTO departments (name) VALUES (?)').run(name);
    res.status(201).json({ id: Number(lastInsertRowid), name });
  });

  api.delete('/departments/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM departments WHERE id = ?').run(Number(req.params.id));
    res.sendStatus(204);
  });

  // Respostas rápidas

  api.get('/quick-replies', (_req, res) => {
    res.json(db.prepare('SELECT id, shortcut, content FROM quick_replies ORDER BY shortcut').all());
  });

  api.post('/quick-replies', requireAdmin, (req, res) => {
    const shortcut = str(req.body.shortcut).replace(/^\//, '');
    const content = str(req.body.content);
    if (!shortcut || !content) throw httpError(400, 'Informe o atalho e o texto.');
    if (db.prepare('SELECT 1 FROM quick_replies WHERE shortcut = ?').get(shortcut)) throw httpError(409, 'Este atalho já existe.');
    const { lastInsertRowid } = db.prepare('INSERT INTO quick_replies (shortcut, content) VALUES (?, ?)').run(shortcut, content);
    res.status(201).json({ id: Number(lastInsertRowid), shortcut, content });
  });

  api.delete('/quick-replies/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM quick_replies WHERE id = ?').run(Number(req.params.id));
    res.sendStatus(204);
  });

  // Configurações do chatbot

  api.get('/settings', requireAdmin, (_req, res) => {
    res.json({ settings: getSettings(), whatsapp: { configured: whatsapp.isConfigured() } });
  });

  api.put('/settings', requireAdmin, (req, res) => {
    const save = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value');
    for (const key of Object.keys(defaultSettings)) {
      if (typeof req.body[key] === 'string') save.run(key, req.body[key]);
    }
    res.json({ settings: getSettings(), whatsapp: { configured: whatsapp.isConfigured() } });
  });

  api.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  app.use('/api', api);

  app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = error.status ?? 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? 'Erro interno no servidor.' : error.message });
  });

  return app;
}
