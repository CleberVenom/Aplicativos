import { useState, type FormEvent } from 'react';
import { api, formatPhone, formatTime, initials } from './api.ts';
import type { Contact, Conversation } from './types.ts';

export function ContactPanel({ contact, conversation, onSaved }: {
  contact: Contact;
  conversation: Conversation;
  onSaved: (contact: Contact) => void;
}) {
  const [form, setForm] = useState({ name: contact.name, email: contact.email, notes: contact.notes, tags: contact.tags.join(', ') });
  const [status, setStatus] = useState('');
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
  });

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      onSaved(await api<Contact>(`/contacts/${contact.id}`, { ...form, tags: form.tags.split(',') }, 'PATCH'));
      setStatus('Salvo!');
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <aside className="contact">
      <div className="contact-head">
        <div className="avatar big">{initials(contact.name || contact.wa_id)}</div>
        <strong>{contact.name || 'Sem nome'}</strong>
        <span className="muted">{formatPhone(contact.wa_id)}</span>
        {contact.tags.length > 0 && <div className="tags">{contact.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
      </div>

      <dl className="details">
        <dt>Setor</dt><dd>{conversation.department_name ?? '—'}</dd>
        <dt>Atendente</dt><dd>{conversation.assigned_user_name ?? '—'}</dd>
        <dt>Início</dt><dd>{formatTime(conversation.created_at)}</dd>
        {conversation.closed_at && <><dt>Finalizada</dt><dd>{formatTime(conversation.closed_at)}</dd></>}
      </dl>

      <form onSubmit={save}>
        <label>Nome<input {...field('name')} /></label>
        <label>E-mail<input type="email" {...field('email')} /></label>
        <label>Etiquetas<input placeholder="ex.: cliente, orçamento" {...field('tags')} /></label>
        <label>Anotações<textarea rows={5} {...field('notes')} /></label>
        <button className="primary">Salvar contato</button>
        {status && <span className="muted">{status}</span>}
      </form>
    </aside>
  );
}
