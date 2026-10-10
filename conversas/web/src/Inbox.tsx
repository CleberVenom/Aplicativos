import { useEffect, useRef, useState } from 'react';
import { api, formatPhone, formatTime, initials, STATUS_LABEL } from './api.ts';
import type { Contact, Conversation, Counts, Department, Message, QuickReply, User } from './types.ts';
import { Chat } from './Chat.tsx';
import { ContactPanel } from './ContactPanel.tsx';

type Tab = 'mine' | 'waiting' | 'active' | 'closed';
type Detail = { conversation: Conversation; contact: Contact; messages: Message[] };

const TABS: { id: Tab; label: string; count?: keyof Counts }[] = [
  { id: 'mine', label: 'Meus', count: 'mine' },
  { id: 'waiting', label: 'Fila', count: 'waiting' },
  { id: 'active', label: 'Todos', count: 'active' },
  { id: 'closed', label: 'Finalizados' },
];

export function Inbox({ me }: { me: User }) {
  const [tab, setTab] = useState<Tab>('mine');
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<{ conversations: Conversation[]; counts: Counts }>();
  const [listVersion, setListVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  useEffect(() => {
    api<User[]>('/users').then(setUsers);
    api<Department[]>('/departments').then(setDepartments);
    api<QuickReply[]>('/quick-replies').then(setQuickReplies);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ tab });
    if (departmentId) params.set('department_id', departmentId);
    if (search.trim()) params.set('q', search.trim());
    let ignore = false;
    api<typeof list>(`/conversations?${params}`).then((data) => !ignore && setList(data));
    return () => { ignore = true; };
  }, [tab, departmentId, search, listVersion]);

  function loadDetail(id: number) {
    api<Detail>(`/conversations/${id}`).then((data) => selectedRef.current === id && setDetail(data));
  }

  useEffect(() => {
    setDetail(null);
    if (selectedId !== null) loadDetail(selectedId);
  }, [selectedId]);

  // Atualizações em tempo real enviadas pelo servidor.
  useEffect(() => {
    const events = new EventSource('/api/events');
    events.addEventListener('conversation', (event) => {
      const conversation: Conversation = JSON.parse(event.data);
      setListVersion((v) => v + 1);
      if (conversation.id === selectedRef.current) setDetail((d) => d && { ...d, conversation });
    });
    events.addEventListener('message', (event) => {
      const message: Message = JSON.parse(event.data);
      if (message.conversation_id !== selectedRef.current) return;
      // Mensagem do cliente na conversa aberta: recarrega para zerar o contador de não lidas.
      if (message.direction === 'in') return loadDetail(message.conversation_id);
      setDetail((d) => d && {
        ...d,
        messages: d.messages.some((m) => m.id === message.id)
          ? d.messages.map((m) => (m.id === message.id ? message : m))
          : [...d.messages, message],
      });
    });
    return () => events.close();
  }, []);

  return (
    <div className="inbox">
      <aside className="list">
        <div className="list-filters">
          <input type="search" placeholder="Buscar por nome ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Todos os setores</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
              {t.count && list ? <span className="count">{list.counts[t.count]}</span> : null}
            </button>
          ))}
        </div>
        <ul className="conversations">
          {list?.conversations.map((c) => (
            <li key={c.id} className={c.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(c.id)}>
              <div className="avatar">{initials(c.contact_name || c.wa_id)}</div>
              <div className="conversation-main">
                <div className="conversation-top">
                  <strong>{c.contact_name || formatPhone(c.wa_id)}</strong>
                  <time>{formatTime(c.last_message_at)}</time>
                </div>
                <div className="conversation-preview">{c.last_message}</div>
                <div className="conversation-meta">
                  <span className={`status ${c.status}`}>{STATUS_LABEL[c.status]}</span>
                  {c.department_name && <span className="chip">{c.department_name}</span>}
                  {c.assigned_user_name && c.status === 'open' && <span className="chip">{c.assigned_user_name}</span>}
                </div>
              </div>
              {c.unread_count > 0 && <span className="unread">{c.unread_count}</span>}
            </li>
          ))}
          {list?.conversations.length === 0 && <li className="empty">Nenhuma conversa por aqui.</li>}
        </ul>
      </aside>

      {detail ? (
        <>
          <Chat
            me={me}
            conversation={detail.conversation}
            messages={detail.messages}
            users={users}
            departments={departments}
            quickReplies={quickReplies}
            onChange={(conversation) => setDetail((d) => d && { ...d, conversation })}
          />
          <ContactPanel
            key={detail.contact.id}
            contact={detail.contact}
            conversation={detail.conversation}
            onSaved={(contact) => setDetail((d) => d && { ...d, contact })}
          />
        </>
      ) : (
        <div className="placeholder">Selecione uma conversa para começar o atendimento.</div>
      )}
    </div>
  );
}
