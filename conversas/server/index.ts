import express from 'express';
import { join } from 'node:path';
import { config } from './config.ts';
import { seed } from './db.ts';
import { createApp } from './routes.ts';
import { isConfigured } from './whatsapp.ts';

seed();
const app = createApp();

if (process.argv.includes('--dev')) {
  // Em desenvolvimento o Vite serve o painel com recarregamento automático.
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const dist = join(import.meta.dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(config.port, () => {
  console.log(`Painel: http://localhost:${config.port}`);
  console.log(`Webhook do WhatsApp: http://localhost:${config.port}/webhook`);
  if (!isConfigured()) console.warn('Aviso: WhatsApp não configurado — respostas não serão enviadas (veja o README).');
  if (!config.whatsapp.appSecret) console.warn('Aviso: WHATSAPP_APP_SECRET vazio — a assinatura dos webhooks não será verificada.');
});
