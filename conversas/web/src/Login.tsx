import { useState, type FormEvent } from 'react';
import { api } from './api.ts';
import type { User } from './types.ts';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      onLogin(await api<User>('/login', { email, password }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="nav-logo">C</div>
        <h1>Conversas</h1>
        <p className="muted">Central de atendimento pelo WhatsApp</p>
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary">Entrar</button>
      </form>
    </div>
  );
}
