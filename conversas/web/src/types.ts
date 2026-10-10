export type User = { id: number; name: string; email: string; role: 'admin' | 'agent'; active?: number };
export type Department = { id: number; name: string };
export type QuickReply = { id: number; shortcut: string; content: string };
export type Counts = { mine: number; waiting: number; active: number };

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
  status: 'received' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error: string | null;
  user_name: string | null;
  created_at: string;
};

export type Contact = { id: number; wa_id: string; name: string; email: string; notes: string; tags: string[]; created_at: string };

export type BotSettings = {
  bot_enabled: string;
  bot_greeting: string;
  bot_invalid_option: string;
  bot_queued: string;
  closing_message: string;
};
