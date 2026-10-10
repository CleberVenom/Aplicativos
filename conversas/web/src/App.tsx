import { useEffect, useState } from 'react';
import { api, initials } from './api.ts';
import type { User } from './types.ts';
import { Login } from './Login.tsx';
import { Inbox } from './Inbox.tsx';
import { Settings } from './Settings.tsx';

export function App() {
  const [user, setUser] = useState<User | null>();
  const [page, setPage] = useState<'inbox' | 'settings'>('inbox');

  useEffect(() => {
    api<User>('/me').then(setUser, () => setUser(null));
    const onUnauthorized = () => setUser(null);
    window.addEventListener('unauthorized', onUnauthorized);
    return () => window.removeEventListener('unauthorized', onUnauthorized);
  }, []);

  if (user === undefined) return null;
  if (user === null) return <Login onLogin={setUser} />;

  async function logout() {
    await api('/logout', {});
    setUser(null);
    setPage('inbox');
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-logo">C</div>
        <button className={page === 'inbox' ? 'active' : ''} onClick={() => setPage('inbox')}>
          <svg viewBox="0 0 24 24"><path d="M4 4h16v12H7l-3 3z" /></svg>
          Conversas
        </button>
        {user.role === 'admin' && (
          <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></svg>
            Ajustes
          </button>
        )}
        <div className="nav-spacer" />
        <div className="nav-user" title={`${user.name} (${user.email})`}>{initials(user.name)}</div>
        <button onClick={logout}>
          <svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
          Sair
        </button>
      </nav>
      {page === 'inbox' ? <Inbox me={user} /> : <Settings me={user} />}
    </div>
  );
}
