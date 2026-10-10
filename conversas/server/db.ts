import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { config } from './config.ts';
import { hashPassword } from './passwords.ts';

if (config.databasePath !== ':memory:') mkdirSync(dirname(config.databasePath), { recursive: true });

export const db = new DatabaseSync(config.databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY,
    wa_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- status: bot (no menu do chatbot) | waiting (na fila) | open (em atendimento) | closed (finalizada)
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES contacts(id),
    status TEXT NOT NULL CHECK (status IN ('bot', 'waiting', 'open', 'closed')),
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    assigned_user_id INTEGER REFERENCES users(id),
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    last_inbound_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    closed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS conversations_status ON conversations(status, last_message_at);
  -- Cada contato tem no máximo uma conversa em andamento.
  CREATE UNIQUE INDEX IF NOT EXISTS conversations_one_active ON conversations(contact_id) WHERE status <> 'closed';

  -- direction: in (cliente) | out (atendente ou bot) | system (eventos da conversa)
  -- status: received | pending | sent | delivered | read | failed
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'system')),
    type TEXT NOT NULL DEFAULT 'text',
    body TEXT NOT NULL DEFAULT '',
    media_id TEXT,
    wa_message_id TEXT UNIQUE,
    status TEXT NOT NULL,
    error TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, id);

  CREATE TABLE IF NOT EXISTS quick_replies (
    id INTEGER PRIMARY KEY,
    shortcut TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export const defaultSettings = {
  bot_enabled: '1',
  bot_greeting: 'Olá! 👋 Bem-vindo(a) ao nosso atendimento. Com qual setor você deseja falar? Responda com o número da opção:',
  bot_invalid_option: 'Desculpe, não entendi. Responda apenas com o número de uma das opções:',
  bot_queued: 'Obrigado! Você está na fila do setor *{setor}*. Em instantes um de nossos atendentes vai falar com você.',
  closing_message: 'Seu atendimento foi finalizado. Obrigado pelo contato! 😊',
};
export type Settings = typeof defaultSettings;

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) insertSetting.run(key, value);

export function getSettings(): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  return { ...defaultSettings, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

/** Primeira execução: cria o administrador e dois setores de exemplo. */
export function seed() {
  if (db.prepare('SELECT 1 FROM users').get()) return;
  const password = config.adminPassword || randomBytes(6).toString('hex');
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Administrador', ?, ?, 'admin')")
    .run(config.adminEmail, hashPassword(password));
  db.exec("INSERT INTO departments (name) VALUES ('Comercial'), ('Suporte')");
  console.log(`Administrador criado: ${config.adminEmail}` + (config.adminPassword ? '' : ` / senha: ${password}`));
}
