# Conversas

Central de atendimento multiatendente pelo WhatsApp, no estilo do RD Station Conversas: o cliente fala com o
número da empresa e a equipe atende pelo navegador, com chatbot de triagem, filas por setor e transferências.

Usa a **API oficial do WhatsApp (WhatsApp Cloud API, da Meta)** — sem risco de banimento do número.

## Funcionalidades

- **Caixa de entrada compartilhada** com abas *Meus*, *Fila*, *Todos* e *Finalizados*, busca e filtro por setor.
- **Chatbot de triagem**: cumprimenta o cliente, mostra o menu de setores e o coloca na fila escolhida.
- **Fluxo de atendimento**: assumir, responder, transferir (para um atendente ou para a fila de outro setor) e finalizar
  com mensagem de encerramento. Cada novo contato após a finalização abre um novo protocolo.
- **Tempo real**: mensagens e mudanças aparecem na hora para toda a equipe (Server-Sent Events).
- **Status de entrega**: enviada ✓, entregue ✓✓ e lida (azul), além do motivo quando o WhatsApp recusa.
- **Mídias recebidas**: imagens, áudios, vídeos e documentos aparecem no chat.
- **Janela de 24h**: fora dela o painel troca o campo de texto pelo envio de modelo (template) aprovado.
- **Respostas rápidas**: digite `/atalho` no chat.
- **Contatos** com nome, e-mail, etiquetas e anotações.
- **Administração**: atendentes (perfis administrador/atendente), setores, respostas rápidas e textos do chatbot.

## Rodando localmente

Requisitos: **Node.js 22.18 ou superior** (o servidor roda TypeScript e SQLite nativos do Node, sem compilação).

```bash
cd conversas
npm install
cp .env.example .env     # defina ADMIN_EMAIL e ADMIN_PASSWORD
npm run dev              # http://localhost:3000
```

No primeiro start o banco (`data/conversas.db`) é criado com o administrador do `.env` e os setores
*Comercial* e *Suporte*.

### Testando sem WhatsApp

Com o servidor rodando, simule mensagens de clientes chegando pelo webhook:

```bash
npm run simulate -- 5511999990000 "Maria Souza" "Olá, quero um orçamento"
npm run simulate -- 5511999990000 "Maria Souza" "1"
```

Enquanto o WhatsApp não estiver configurado, as respostas aparecem no painel marcadas como *não enviadas*.

## Conectando ao WhatsApp

1. Em [developers.facebook.com](https://developers.facebook.com/apps) crie um app do tipo **Empresa** e adicione o
   produto **WhatsApp**.
2. Em **WhatsApp > Configuração da API**, copie o *Identificador do número de telefone* para
   `WHATSAPP_PHONE_NUMBER_ID` e o token de acesso para `WHATSAPP_TOKEN`.
   O token temporário expira em 24h; para produção gere um **token permanente** com um *usuário do sistema* no
   Gerenciador de Negócios, com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`.
3. Em **Configurações do app > Básico**, copie a *Chave secreta do app* para `WHATSAPP_APP_SECRET`
   (o servidor usa para conferir que os webhooks vieram mesmo da Meta).
4. Invente um texto qualquer para `WHATSAPP_VERIFY_TOKEN` e reinicie o servidor.
5. O webhook precisa de uma URL pública com HTTPS. Em produção use o seu domínio; para testes, um túnel:
   `cloudflared tunnel --url http://localhost:3000` ou `ngrok http 3000`.
6. Em **WhatsApp > Configuração > Webhook**, informe a URL de callback `https://SEU-ENDERECO/webhook` e o mesmo
   `WHATSAPP_VERIFY_TOKEN`. Depois, em *Campos do webhook*, assine **messages**.
7. Envie uma mensagem para o número da empresa. Com o número de teste da Meta, cadastre antes o seu celular na
   lista de destinatários permitidos.

### Regras do WhatsApp que o painel respeita

- Mensagens livres só podem ser enviadas até **24h após a última mensagem do cliente**. Depois disso, apenas
  **modelos aprovados** (criados no WhatsApp Manager). Variáveis `{{1}}`, `{{2}}`... são preenchidas no painel,
  separadas por `;`.
- A Meta pode reenviar o mesmo webhook; mensagens repetidas são ignoradas.

## Produção

```bash
npm run build   # gera o painel em dist/
npm start       # serve painel + API + webhook na porta PORT
```

Os dados ficam no arquivo SQLite indicado em `DATABASE_PATH` — inclua-o no seu backup. Coloque o servidor atrás
de um proxy com HTTPS (o cookie de sessão é marcado como seguro automaticamente).

## Desenvolvimento

```bash
npm test            # testes de integração (Graph API da Meta simulada)
npm run typecheck   # TypeScript do servidor e do painel
```

```
server/
  index.ts          inicialização (Vite em dev, arquivos de dist/ em produção)
  routes.ts         webhook do WhatsApp e API REST do painel
  inbound.ts        processamento dos webhooks e chatbot de triagem
  conversations.ts  conversas, mensagens, envio e janela de 24h
  whatsapp.ts       cliente da WhatsApp Cloud API e verificação de assinatura
  auth.ts           login e sessões
  db.ts             esquema SQLite e configurações padrão
  events.ts         tempo real (Server-Sent Events)
web/src/            painel React (caixa de entrada, chat, contato e ajustes)
scripts/simulate.ts simulador de mensagens recebidas
test/               testes
```

## Ainda não implementado

- Envio de arquivos e áudios pelo atendente (hoje só texto e modelos).
- Iniciar conversa ativa com um contato novo (disparo de modelo a partir da lista de contatos).
- Histórico de protocolos anteriores do mesmo contato na tela do chat.
- Relatórios/dashboard e integração com CRM.
- Mais de um número de WhatsApp na mesma instalação.
- Limite de tentativas de login (recomendado antes de expor o painel na internet).
