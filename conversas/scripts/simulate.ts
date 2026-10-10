// Simula uma mensagem de cliente chegando pelo webhook, sem precisar de um celular.
// Uso: npm run simulate -- <telefone> "<nome>" "<mensagem>"
import { createHmac } from 'node:crypto';

const [phone = '5511999990000', name = 'Cliente de Teste', text = 'Olá!'] = process.argv.slice(2);
const url = process.env.SIMULATE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/webhook`;

const body = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{
    changes: [{
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: phone, profile: { name } }],
        messages: [{ id: `wamid.simulado.${Date.now()}`, from: phone, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }],
      },
    }],
  }],
});

const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (process.env.WHATSAPP_APP_SECRET) {
  headers['X-Hub-Signature-256'] = `sha256=${createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(body).digest('hex')}`;
}

const res = await fetch(url, { method: 'POST', headers, body });
console.log(`${res.status} ${res.statusText} — mensagem de ${name} (${phone}): "${text}"`);
