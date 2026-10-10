import { existsSync } from 'node:fs';

// Variáveis já definidas no ambiente têm prioridade sobre o arquivo .env.
if (existsSync('.env')) process.loadEnvFile('.env');

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 3000),
  databasePath: env.DATABASE_PATH ?? 'data/conversas.db',
  adminEmail: env.ADMIN_EMAIL ?? 'admin@exemplo.com',
  adminPassword: env.ADMIN_PASSWORD ?? '',
  whatsapp: {
    token: env.WHATSAPP_TOKEN ?? '',
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    verifyToken: env.WHATSAPP_VERIFY_TOKEN ?? '',
    appSecret: env.WHATSAPP_APP_SECRET ?? '',
    apiVersion: env.WHATSAPP_API_VERSION ?? 'v23.0',
  },
};
