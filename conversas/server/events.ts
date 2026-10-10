import type { Request, Response } from 'express';

// Server-Sent Events: avisa os atendentes conectados sobre conversas e mensagens novas.
const clients = new Set<Response>();

export function subscribe(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': conectado\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

export function broadcast(event: 'conversation' | 'message', data: unknown) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(chunk);
}

// Mantém a conexão viva atrás de proxies que derrubam conexões ociosas.
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n');
}, 25_000).unref();
