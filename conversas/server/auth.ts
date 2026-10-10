import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';
import { verifyPassword } from './passwords.ts';

export type User = { id: number; name: string; email: string; role: 'admin' | 'agent' };

const COOKIE = 'sid';

export function login(email: string, password: string): { user: User; token: string } | null {
  const row = db.prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ? AND active = 1')
    .get(email) as (User & { password_hash: string }) | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, row.id);
  const { password_hash: _, ...user } = row;
  return { user, token };
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 30 * 24 * 3600 * 1000 });
}

export function logout(req: Request, res: Response) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionToken(req));
  res.clearCookie(COOKIE);
}

function sessionToken(req: Request): string {
  const cookie = (req.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  return cookie?.slice(COOKIE.length + 1) ?? '';
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND u.active = 1`).get(sessionToken(req)) as User | undefined;
  if (!user) return res.status(401).json({ error: 'Faça login para continuar.' });
  res.locals.user = user;
  next();
}

export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (currentUser(res).role !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
  next();
}

export const currentUser = (res: Response) => res.locals.user as User;
