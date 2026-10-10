import { useEffect, useState, type FormEvent } from 'react';
import { api } from './api.ts';
import type { BotSettings, Department, QuickReply, User } from './types.ts';

export function Settings({ me }: { me: User }) {
  return (
    <div className="settings">
      <h1>Ajustes</h1>
      <WhatsAppAndBot />
      <Users me={me} />
      <Departments />
      <QuickReplies />
    </div>
  );
}

function useList<T>(path: string): [T[], () => void] {
  const [items, setItems] = useState<T[]>([]);
  const reload = () => { api<T[]>(path).then(setItems); };
  useEffect(reload, [path]);
  return [items, reload];
}

/** Executa uma ação e mostra o erro (se houver) na própria seção. */
function useAction(): [string, (action: () => Promise<unknown>) => Promise<boolean>] {
  const [error, setError] = useState('');
  async function run(action: () => Promise<unknown>) {
    setError('');
    try {
      await action();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }
  return [error, run];
}

function WhatsAppAndBot() {
  const [data, setData] = useState<{ settings: BotSettings; whatsapp: { configured: boolean } }>();
  const [error, run] = useAction();
  const [saved, setSaved] = useState(false);
  useEffect(() => { api<typeof data>('/settings').then(setData); }, []);
  if (!data) return null;

  const settings = data.settings;
  const field = (key: keyof BotSettings) => ({
    value: settings[key],
    onChange: (e: { target: { value: string } }) => {
      setSaved(false);
      setData({ ...data, settings: { ...settings, [key]: e.target.value } });
    },
  });

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaved(await run(async () => setData(await api<typeof data>('/settings', settings, 'PUT'))));
  }

  return (
    <>
      <section className="card">
        <h2>WhatsApp</h2>
        {data.whatsapp.configured
          ? <p className="ok">Conectado à WhatsApp Cloud API.</p>
          : <p className="warning">Não configurado: preencha WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID no arquivo .env e reinicie o servidor. Até lá as mensagens recebidas aparecem, mas as respostas não são enviadas.</p>}
        <p>URL de retorno do webhook (cadastre na Meta): <code>{window.location.origin}/webhook</code></p>
      </section>

      <section className="card">
        <h2>Chatbot de triagem</h2>
        <form className="stack" onSubmit={save}>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.bot_enabled === '1'}
              onChange={(e) => field('bot_enabled').onChange({ target: { value: e.target.checked ? '1' : '0' } })}
            />
            Ativar chatbot: cumprimenta o cliente, pergunta o setor e o coloca na fila certa
          </label>
          <label>Saudação (o menu com os setores é adicionado automaticamente)<textarea rows={3} {...field('bot_greeting')} /></label>
          <label>Resposta para opção inválida<textarea rows={2} {...field('bot_invalid_option')} /></label>
          <label>Confirmação de entrada na fila — use {'{setor}'} para o nome do setor<textarea rows={2} {...field('bot_queued')} /></label>
          <label>Mensagem ao finalizar o atendimento (deixe vazio para não enviar)<textarea rows={2} {...field('closing_message')} /></label>
          <div className="row">
            <button className="primary">Salvar</button>
            {saved && <span className="ok">Salvo!</span>}
            {error && <span className="error">{error}</span>}
          </div>
        </form>
      </section>
    </>
  );
}

function Users({ me }: { me: User }) {
  const [users, reload] = useList<User>('/users');
  const empty = { name: '', email: '', password: '', role: 'agent' };
  const [form, setForm] = useState(empty);
  const [error, run] = useAction();

  async function add(event: FormEvent) {
    event.preventDefault();
    if (await run(() => api('/users', form))) {
      setForm(empty);
      reload();
    }
  }

  async function deactivate(user: User) {
    if (confirm(`Desativar ${user.name}? Os atendimentos abertos voltam para a fila.`)) {
      await run(() => api(`/users/${user.id}`, undefined, 'DELETE'));
      reload();
    }
  }

  return (
    <section className="card">
      <h2>Atendentes</h2>
      <table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.active ? '' : 'inactive'}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role === 'admin' ? 'Administrador' : 'Atendente'}</td>
              <td>{u.active ? (u.id !== me.id && <button onClick={() => deactivate(u)}>Desativar</button>) : 'Desativado'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="row" onSubmit={add}>
        <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Senha (6+ caracteres)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="agent">Atendente</option>
          <option value="admin">Administrador</option>
        </select>
        <button className="primary">Adicionar</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function Departments() {
  const [departments, reload] = useList<Department>('/departments');
  const [name, setName] = useState('');
  const [error, run] = useAction();

  async function add(event: FormEvent) {
    event.preventDefault();
    if (await run(() => api('/departments', { name }))) {
      setName('');
      reload();
    }
  }

  async function remove(department: Department) {
    if (confirm(`Excluir o setor ${department.name}?`)) {
      await run(() => api(`/departments/${department.id}`, undefined, 'DELETE'));
      reload();
    }
  }

  return (
    <section className="card">
      <h2>Setores</h2>
      <p className="muted">Aparecem no menu do chatbot nesta ordem e servem de filas de atendimento.</p>
      <ol className="items">
        {departments.map((d) => <li key={d.id}>{d.name}<button onClick={() => remove(d)}>Excluir</button></li>)}
      </ol>
      <form className="row" onSubmit={add}>
        <input placeholder="Nome do setor" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="primary">Adicionar</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function QuickReplies() {
  const [replies, reload] = useList<QuickReply>('/quick-replies');
  const [form, setForm] = useState({ shortcut: '', content: '' });
  const [error, run] = useAction();

  async function add(event: FormEvent) {
    event.preventDefault();
    if (await run(() => api('/quick-replies', form))) {
      setForm({ shortcut: '', content: '' });
      reload();
    }
  }

  async function remove(reply: QuickReply) {
    await run(() => api(`/quick-replies/${reply.id}`, undefined, 'DELETE'));
    reload();
  }

  return (
    <section className="card">
      <h2>Respostas rápidas</h2>
      <p className="muted">No chat, digite / e o atalho para inserir o texto.</p>
      <ul className="items">
        {replies.map((r) => <li key={r.id}><span><b>/{r.shortcut}</b> {r.content}</span><button onClick={() => remove(r)}>Excluir</button></li>)}
      </ul>
      <form className="row" onSubmit={add}>
        <input className="small" placeholder="Atalho" value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} required />
        <input placeholder="Texto da resposta" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
        <button className="primary">Adicionar</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
