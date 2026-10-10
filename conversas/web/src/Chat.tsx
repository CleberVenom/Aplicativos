import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, formatPhone, formatTime, STATUS_LABEL } from './api.ts';
import type { Conversation, Department, Message, QuickReply, User } from './types.ts';

type Props = {
  me: User;
  conversation: Conversation;
  messages: Message[];
  users: User[];
  departments: Department[];
  quickReplies: QuickReply[];
  onChange: (conversation: Conversation) => void;
};

export function Chat({ me, conversation, messages, users, departments, quickReplies, onChange }: Props) {
  const [error, setError] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMine = conversation.status === 'open' && conversation.assigned_user_id === me.id;
  const active = conversation.status !== 'closed';

  useEffect(() => bottomRef.current?.scrollIntoView(), [messages.length, conversation.id]);
  useEffect(() => {
    setError('');
    setTransferOpen(false);
  }, [conversation.id]);

  async function post(action: string, body: object = {}) {
    setError('');
    try {
      onChange(await api<Conversation>(`/conversations/${conversation.id}/${action}`, body));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="chat">
      <header className="chat-header">
        <div className="chat-title">
          <strong>{conversation.contact_name || formatPhone(conversation.wa_id)}</strong>
          <small>
            {formatPhone(conversation.wa_id)} · Protocolo #{conversation.id} · {STATUS_LABEL[conversation.status]}
            {conversation.status === 'open' && conversation.assigned_user_name && ` com ${conversation.assigned_user_name}`}
          </small>
        </div>
        {active && (
          <div className="actions">
            {!isMine && <button className="primary" onClick={() => post('assign')}>Assumir</button>}
            <button onClick={() => setTransferOpen((open) => !open)}>Transferir</button>
            <button onClick={() => confirm('Finalizar este atendimento?') && post('close')}>Finalizar</button>
          </div>
        )}
      </header>

      {transferOpen && (
        <TransferForm
          me={me}
          users={users}
          departments={departments}
          onTransfer={(body) => {
            setTransferOpen(false);
            post('transfer', body);
          }}
        />
      )}
      {error && <div className="error banner">{error}</div>}

      <div className="messages">
        {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        <div ref={bottomRef} />
      </div>

      {!active ? (
        <div className="composer-note">Este atendimento foi finalizado.</div>
      ) : !isMine ? (
        <div className="composer-note">
          Assuma o atendimento para responder ao cliente.
          <button className="primary" onClick={() => post('assign')}>Assumir atendimento</button>
        </div>
      ) : (
        <Composer key={conversation.id} conversation={conversation} quickReplies={quickReplies} onError={setError} />
      )}
    </section>
  );
}

function TransferForm({ me, users, departments, onTransfer }: {
  me: User;
  users: User[];
  departments: Department[];
  onTransfer: (body: { user_id: number } | { department_id: number }) => void;
}) {
  const [target, setTarget] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const [kind, id] = target.split(':');
    onTransfer(kind === 'user' ? { user_id: Number(id) } : { department_id: Number(id) });
  }

  return (
    <form className="transfer" onSubmit={submit}>
      <select value={target} onChange={(e) => setTarget(e.target.value)} required>
        <option value="">Transferir para...</option>
        <optgroup label="Fila do setor">
          {departments.map((d) => <option key={d.id} value={`department:${d.id}`}>{d.name}</option>)}
        </optgroup>
        <optgroup label="Atendente">
          {users.filter((u) => u.active && u.id !== me.id).map((u) => <option key={u.id} value={`user:${u.id}`}>{u.name}</option>)}
        </optgroup>
      </select>
      <button className="primary">Transferir</button>
    </form>
  );
}

const STATUS_ICON: Record<Message['status'], string> = {
  received: '', pending: '🕓', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '⚠',
};

function MessageBubble({ message: m }: { message: Message }) {
  if (m.direction === 'system') return <div className="system">{m.body} · {formatTime(m.created_at)}</div>;
  return (
    <div className={`bubble ${m.direction}`}>
      {m.direction === 'out' && <div className="author">{m.user_name ?? 'Chatbot'}</div>}
      {m.media_id && <Media type={m.type} id={m.media_id} />}
      {m.body && <div className="body">{m.body}</div>}
      <div className="meta">
        {formatTime(m.created_at)}
        {m.direction === 'out' && <span className={`tick ${m.status}`} title={m.status}>{STATUS_ICON[m.status]}</span>}
      </div>
      {m.status === 'failed' && <div className="failed">Não enviada: {m.error}</div>}
    </div>
  );
}

function Media({ type, id }: { type: string; id: string }) {
  const src = `/api/media/${encodeURIComponent(id)}`;
  if (type === 'image' || type === 'sticker') return <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="Imagem enviada pelo cliente" /></a>;
  if (type === 'audio') return <audio controls src={src} />;
  if (type === 'video') return <video controls src={src} />;
  return <a className="file" href={src} target="_blank" rel="noreferrer">📎 Abrir arquivo</a>;
}

function Composer({ conversation, quickReplies, onError }: {
  conversation: Conversation;
  quickReplies: QuickReply[];
  onError: (message: string) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const windowOpen = conversation.last_inbound_at !== null
    && Date.now() - Date.parse(conversation.last_inbound_at) < 24 * 3600 * 1000;
  const suggestions = text.startsWith('/')
    ? quickReplies.filter((q) => q.shortcut.toLowerCase().startsWith(text.slice(1).toLowerCase()))
    : [];

  async function send(body: object) {
    setSending(true);
    onError('');
    try {
      await api(`/conversations/${conversation.id}/messages`, body);
      return true;
    } catch (err) {
      onError((err as Error).message);
      return false;
    } finally {
      setSending(false);
    }
  }

  async function sendText() {
    if (text.trim() && await send({ text })) setText('');
  }

  if (!windowOpen) return <TemplateForm sending={sending} onSend={(template) => send({ template })} />;

  return (
    <div className="composer">
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((q) => (
            <li key={q.id} onClick={() => setText(q.content)}><b>/{q.shortcut}</b> {q.content}</li>
          ))}
        </ul>
      )}
      <textarea
        rows={2}
        value={text}
        placeholder="Digite sua mensagem (Enter envia, Shift+Enter quebra linha, / abre respostas rápidas)"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return;
          e.preventDefault();
          if (suggestions.length) setText(suggestions[0].content);
          else sendText();
        }}
      />
      <button className="primary" disabled={sending || !text.trim()} onClick={sendText}>Enviar</button>
    </div>
  );
}

function TemplateForm({ sending, onSend }: {
  sending: boolean;
  onSend: (template: { name: string; language: string; params: string[] }) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('pt_BR');
  const [params, setParams] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const values = params.split(';').map((p) => p.trim()).filter(Boolean);
    if (await onSend({ name: name.trim(), language: language.trim(), params: values })) setParams('');
  }

  return (
    <form className="composer template" onSubmit={submit}>
      <p>
        Já se passaram 24h desde a última mensagem do cliente. Pelas regras do WhatsApp, agora só é possível enviar
        um <b>modelo de mensagem aprovado</b> no WhatsApp Manager.
      </p>
      <div className="row">
        <input placeholder="Nome do modelo" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="small" placeholder="Idioma" value={language} onChange={(e) => setLanguage(e.target.value)} />
        <input placeholder="Variáveis {{1}}; {{2}}... separadas por ;" value={params} onChange={(e) => setParams(e.target.value)} />
        <button className="primary" disabled={sending}>Enviar modelo</button>
      </div>
    </form>
  );
}
