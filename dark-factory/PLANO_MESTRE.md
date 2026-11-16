# DARK FACTORY AI — Plano Mestre (v0.1)

> Data de referência: 16/11/2026 · Autor: Claude (papel: arquiteto principal)
> Status: **RASCUNHO — aguardando respostas do proprietário antes de implantar.**
> Legenda: ✅ verificado nesta sessão · ⚠️ verificar antes de usar · 💡 proposta (não testada)

---

## 1. Resumo executivo

Faltam **3 dias** para o lançamento de GTA VI. Nesse prazo **não é viável** construir 17 agentes,
3 ambientes e uma fábrica completa. É viável — e é o que este plano propõe — **provar um pipeline
mínimo de ponta a ponta**:

```
tendência → roteiro (PT) → tradução (EN/ES) → locução → vídeo vertical → revisão humana
→ upload privado de teste → publicação aprovada → métricas no dia seguinte
```

A automação pesada vem **depois** que esse ciclo funcionar com vídeos reais.

---

## 2. Revisão crítica do prompt mestre

### 2.1 Lacunas e riscos principais

| # | Ponto | Risco | Recomendação |
|---|-------|-------|--------------|
| R1 | Prazo de 72h | Complexidade mata o lançamento | MVP com ~5 etapas em 1 workflow n8n; o resto depois |
| R2 | Nomes com "Vice City" | "Vice City" e "GTA" são marcas da Take-Two/Rockstar → risco de denúncia por marca/personificação e de parecer canal oficial | Preferir nomes neutros (ex.: tema "radar/pulso/alerta" + termo próprio). Decisão do proprietário |
| R3 | Monetização no lançamento | Canal novo **não monetiza em 72h**: YPP exige limites de inscritos e visualizações/horas ⚠️ (conferir valores atuais na página oficial) | Tratar o lançamento como **aquisição de audiência**, não receita |
| R4 | Conteúdo "dark" com IA | YouTube: política de **conteúdo inautêntico** (renomeada em 15/07/2025) e **conteúdo reutilizado** ✅ — produção em massa e repetitiva perde monetização, potencialmente no canal inteiro | Cada vídeo com roteiro original, ângulo próprio, variação real de formato; volume moderado |
| R5 | Trechos de trailers/imagens oficiais | Take-Two é conhecida por pedidos de remoção; 3 strikes = canal encerrado | MVP **sem material de terceiros**: tipografia animada, arte própria, estoque licenciado. Uso de material oficial só após o AG07 avaliar caso a caso ⚠️ (ler a política da Rockstar sobre vídeos) |
| R6 | Gameplay próprio | Exige comprar jogo + console + forma de captura; jogo sai só para PS5/Xbox Series ✅ (sem data de PC) | Decidir se haverá gameplay próprio; se não, formato "notícia/análise narrada" |
| R7 | Upload automático no YouTube | Projetos de API **não auditados** têm uploads restritos a privado ⚠️; cota padrão 10.000 unidades/dia e upload custa muitas unidades ⚠️ | Fase 0: API envia **privado**; publicação final pelo YouTube Studio (manual, 1 clique). Solicitar auditoria em paralelo |
| R8 | Publicação automática no TikTok | API de postagem para apps **não auditados** só publica como privado ⚠️ | Fase 0: upload **manual** no TikTok (rápido e sem risco) |
| R9 | X API | Planos pagos caros para busca ⚠️ | Fora da Fase 0. Monitoramento manual ou via Google/YouTube |
| R10 | Google Trends / TikTok Creative Center | Sem API pública estável para automação ⚠️ | Consulta manual de 5 min/dia registrada na planilha |
| R11 | n8n Cloud | Não roda FFmpeg/Remotion pesado | Worker de renderização separado (ver §3) |
| R12 | Modelos "GPT-6 Astra" e "GPT-6.1 Sol" | Não consegui verificar esses nomes nesta sessão | Confirmar na conta OpenAI antes de configurar |
| R13 | Servidor MCP do n8n nesta sessão | **Falhou ao conectar (erro 404)** ✅ | Reconectar depois de criar a conta/instância n8n |
| R14 | Voz sintética | Licença comercial e regras de divulgação de conteúdo sintético ⚠️ | Usar provedor com uso comercial explícito (OpenAI TTS ou ElevenLabs pago) |
| R15 | Remotion | Licença gratuita só para indivíduos e empresas pequenas ⚠️ | Confirmar enquadramento; alternativa: FFmpeg puro |
| R16 | Spoilers e vazamentos | Pós-lançamento haverá enxurrada de spoilers; vazamentos pré-lançamento são proibidos (diretriz 8) | Aviso de spoiler no título/início; nada de material vazado |

### 2.2 Oportunidades de reutilização (evitar código novo)

- **n8n** já tem nós prontos para OpenAI, Anthropic, Google Sheets, Google Drive, YouTube e Telegram → orquestração quase toda sem código.
- **Remotion** (templates em React) ou **FFmpeg** para montagem; **faster-whisper** só se precisarmos transcrever áudio de terceiros — no MVP as legendas saem do próprio roteiro + tempos da locução.
- **GitHub Actions** como worker de renderização gratuito/barato 💡 (n8n dispara, Action renderiza e devolve o MP4 ao Drive).
- auto-editor, PySceneDetect, OpenClipper/AutoClip: úteis **só** quando houver gameplay próprio/autorizado → Fase 1.
- AGNT, Shortube, youtube-auto-dub: avaliar na matriz de ferramentas (Fase 1) — não instalar antes de auditar código e permissões.

### 2.3 Simplificação dos 17 agentes

Os 17 papéis continuam como **especificação**, mas na Fase 0 viram **5 etapas** de um único workflow:

| Etapa MVP | Agentes cobertos |
|-----------|-----------------|
| 1. Pauta | AG02, AG03, AG04, AG05 (+ conferência humana) |
| 2. Roteiro e localização | AG06, AG10, AG07 (checklist de direitos) |
| 3. Produção | AG08, AG09, AG11, AG12, AG13 (template fixo) |
| 4. Revisão e publicação | AG14 + aprovação humana |
| 5. Métricas | AG15, AG16, AG17 (custos na planilha) |

AG01 (orquestrador) = o próprio workflow n8n.

---

## 3. Arquitetura mínima (Fase 0)

```
 ┌───────────────┐   ┌───────────────────── n8n Cloud ─────────────────────┐
 │ Proprietário  │   │ 1 Pauta: YouTube Data API (busca) + entrada manual  │
 │ (aprovação)   │◄──┤ 2 Roteiro: Claude → revisão GPT → tradução EN/ES    │
 │ Telegram/     │   │ 3 Locução: TTS → MP3 no Google Drive                │
 │ e-mail        │   │ 4 Dispara render ───────────┐                       │
 └──────┬────────┘   │ 5 Upload PRIVADO YouTube    │                       │
        │ aprova     │ 6 Métricas D+1 → Sheets     │                       │
        ▼            └───────▲─────────────────────┼───────────────────────┘
 YouTube Studio:             │                     ▼
 tornar público /     Google Sheets         Worker de render (GitHub Actions)
 agendar              (banco operacional)   Remotion/FFmpeg → MP4 1080×1920
 TikTok: upload manual                       + legendas SRT → Google Drive
```

**Identificadores:** `OPP-AAAAMMDD-NNN` (oportunidade), `ROT-…`, `VID-…-PT|EN|ES`, `PUB-…-YT|TT`.
A chave de idempotência da publicação é `VID-id + plataforma + canal`.

**Ambientes:** na Fase 0 só **Desenvolvimento** (canais de teste/privado) e **Produção**
(canais reais). Homologação entra na Fase 1.

---

## 4. Ordem de implantação para o lançamento

| Quando | Etapa | Critério de aceite |
|--------|-------|-------------------|
| 16/11 (hoje) | Respostas às 5 perguntas; decidir nomes | Decisões registradas em STATUS_DO_PROJETO.md |
| 16–17/11 | Contas Google/YouTube (3 canais), TikTok (3 perfis), n8n Cloud, chaves de API guardadas **no n8n** (nunca no chat) | Login em cada conta; credenciais testadas no n8n |
| 17/11 | Planilha operacional + workflow etapas 1–2 | 1 roteiro PT + EN + ES gerado e salvo na planilha |
| 17/11 | Locução + render | 3 MP4 verticais, sem silêncio inicial, legendas legíveis |
| 18/11 | Revisão + upload privado de teste | 3 vídeos privados no YouTube com status "processado" |
| 18/11 | Aprovação → publicação | 1º vídeo público em cada idioma (YouTube) + TikTok manual |
| 19–21/11 | Plano de 72h (abaixo) | Cadência cumprida; métricas registradas D+1 |
| 22/11+ | Fase 1 | Só depois do ciclo completo validado |

### 4.1 Rascunho do plano editorial de 72h (por idioma)

| Janela | Conteúdo (sem material de terceiros não autorizado) |
|--------|----------------------------------------------------|
| D-1 (18/11) | "Tudo que é oficial sobre GTA VI antes do lançamento" (fatos verificados com fontes) |
| D0 manhã | Horário de liberação por região (só se a Rockstar/lojas confirmarem) ⚠️ |
| D0 tarde | "Primeiras reações" — comentário original sobre o que a imprensa publicou, citando fontes |
| D+1 | Dicas iniciais / dúvidas mais buscadas (com aviso de spoiler) |
| D+2 | Curiosidades de Leonida descobertas pela comunidade (atribuídas, sem copiar vídeos) |

**Contingências:** (a) data muda → trocar pauta para "o que se sabe sobre o adiamento";
(b) sem acesso ao jogo → manter formato notícia/análise narrada; (c) remoção/strike →
pausar publicação, acionar procedimento de retirada (SEGURANCA.md, Fase 1).

---

## 5. Custos estimados (Fase 0) — estimativas, não cotações

| Item | Estimativa mensal | Observação |
|------|------------------|------------|
| n8n Cloud (plano inicial) | ~US$ 20–30 ⚠️ | Conferir preço atual; alternativa self-host |
| APIs de LLM (Claude + OpenAI) | ~US$ 5–30 | Depende do volume; poucos centavos por roteiro |
| TTS | ~US$ 5–25 ⚠️ | OpenAI TTS mais barato; ElevenLabs para voz premium |
| GitHub Actions (render) | US$ 0–10 | Cota gratuita costuma bastar no MVP ⚠️ |
| Google (Sheets/Drive/YouTube API) | US$ 0 | Dentro de cotas gratuitas |
| **Total estimado** | **~US$ 30–95/mês** | Sem gameplay próprio (console/jogo/captura à parte) |

---

## 6. Documentos

Criados agora: `PLANO_MESTRE.md`, `STATUS_DO_PROJETO.md`.
Serão criados **na etapa em que forem necessários** (para não documentar o que ainda não foi decidido):
ARQUITETURA.md, AGENTES.md, INTEGRACOES.md, BRANDING.md, PRODUCAO.md, PUBLICACAO.md,
MONETIZACAO.md, SEGURANCA.md.

## Fontes consultadas nesta sessão
- Data de GTA VI (19/11/2026, PS5/Xbox Series): [TechRadar](https://www.techradar.com/gaming/grand-theft-auto-6-delayed-again-but-itll-still-ship-in-2026), [PCWorld](https://www.pcworld.com/article/3052217/gta-6s-release-date-confirmed-for-real-this-time-seriously.html), [Mobalytics](https://mobalytics.gg/gamebase/guides/gta-6-release-date) — fontes secundárias; reconfirmar no Newswire da Rockstar.
- Políticas de monetização do YouTube: [YouTube Help – YPP policies](https://support.google.com/youtube/answer/1311392).
