# Ambienta — design de interiores com IA (MVP)

> **Ambienta** é um nome provisório. Veja [Trocar o nome](#trocar-o-nome).

Aplicativo para iOS e Android (também roda na web) que transforma a foto de um ambiente em **três propostas de design de interiores**, com justificativa profissional, plano de transformação, investimento indicativo, imagem conceitual baseada na foto original e uma **maquete 3D navegável**.

Feito com Expo SDK 57, React Native 0.86, TypeScript e Expo Router. As chamadas aos serviços de IA passam por rotas de servidor do próprio projeto (`src/app/api`), então **nenhuma chave secreta vai para o celular**.

## Sumário

- [O que o app faz](#o-que-o-app-faz)
- [Estado atual: o que foi validado e o que não foi](#estado-atual-o-que-foi-validado-e-o-que-não-foi)
- [Como executar](#como-executar)
- [Ativar a IA](#ativar-a-ia)
- [Modo demonstração](#modo-demonstração)
- [Como a IA funciona](#como-a-ia-funciona)
- [Visualização 3D](#visualização-3d)
- [Privacidade e segurança](#privacidade-e-segurança)
- [Arquitetura](#arquitetura)
- [Testes](#testes)
- [Dependências adicionadas](#dependências-adicionadas)
- [Publicação nas lojas](#publicação-nas-lojas)
- [Trocar o nome](#trocar-o-nome)
- [Credenciais e pendências](#credenciais-e-pendências)
- [Limitações conhecidas](#limitações-conhecidas)

## O que o app faz

1. **Início** — proposta de valor, foto pela câmera ou galeria, acesso aos projetos salvos e uma demonstração visual "antes/depois" (ilustração, identificada como tal).
2. **Foto** — pré-visualização, trocar ou remover, até 2 fotos extras de outros ângulos. Validações no aparelho: formato (JPG, PNG, HEIC, WebP), tamanho (até 30 MB), resolução (mínimo 480 px no menor lado, alerta abaixo de 900 px), fotos panorâmicas, foto escura, estourada ou sem contraste. Dicas de enquadramento e aviso de privacidade antes de qualquer envio.
3. **Questionário adaptativo** (7 ou 8 etapas curtas, com progresso): tipo de ambiente; objetivos (até 3); estilo (até 2, ou descrição livre); orçamento; móveis a manter, reposicionar ou trocar (opcional); preferências — cores preferidas e a evitar, materiais, necessidades, observações (opcional); imóvel — próprio ou alugado, intervenções possíveis, limitações e medidas (aparece só quando os objetivos envolvem obras ou o orçamento é elevado); revisão com "Editar" em cada resposta. Voltar mantém as respostas, e o rascunho sobrevive ao fechamento do app.
4. **Geração** — com IA (depois de um consentimento explícito) ou no modo demonstração.
5. **Três propostas realmente diferentes** (A, B e C, com níveis de investimento distintos). Cada uma tem nome, estilo, objetivo, paleta com nomes de cores, justificativa, como atende a cada resposta, plano por área (layout, paredes, iluminação, materiais, decoração, organização), o que será mantido, reposicionado, adicionado, removido ou substituído, investimento (faixa em R$ apenas quando há base, sempre como estimativa), vantagens, limitações e uma imagem conceitual com comparação antes/depois e zoom.
6. **Análise do ambiente** — cada observação marcada como **Observado** (visível na foto) ou **Hipótese** (inferência), com nível de confiança; dimensões com origem e margem de erro; pedidos de medidas.
7. **Comparar** as propostas lado a lado, **escolher** uma e **pedir ajustes** ("mais barato", "troque o verde por azul") sem recomeçar: cada ajuste vira uma nova versão, e o histórico permite restaurar versões anteriores.
8. Depois da escolha: **"Gostou deste projeto? Quer visualizar como ele ficaria em 3D?"** com **"Sim, visualizar em 3D"** e **"Agora não"**.
9. **Visualização 3D** — maquete navegável e aproximada; opcionalmente, um 3D imersivo gerado por IA (World Labs).
10. **Projetos salvos** — abrir, renomear e excluir. Tudo fica no aparelho.
11. **Configurações** — status de cada serviço de IA, opção de usar sempre o modo demonstração, revogar o consentimento e excluir todos os dados.

## Estado atual: o que foi validado e o que não foi

Validado neste ambiente de desenvolvimento (Linux, sem celular e sem chaves reais):

- TypeScript, ESLint e `expo-doctor` (21 de 21 verificações) sem problemas.
- 133 testes unitários (Jest) passando: questionário adaptativo, gerador de demonstração, maquete 3D, validação de fotos, contraste de cores (WCAG AA), rotas do servidor, streaming, limite de requisições e os adaptadores Anthropic, Gemini, OpenAI e World Labs com respostas simuladas.
- Teste ponta a ponta na web (Playwright, tela de celular 390×844) do fluxo inteiro, em dois modos: demonstração e IA com um servidor simulado local (imagens, ajustes, 3D imersivo). Zero erros no console.
- Rotas reais do servidor + SDK oficial da Anthropic em streaming contra uma API simulada local, conferindo o formato exato da requisição enviada.
- Com chaves inválidas, Anthropic, Gemini, OpenAI e World Labs responderam erro de autenticação, e o app exibiu a mensagem correta.
- Bundles de produção Android e iOS gerados (`expo export`), sem chaves, cabeçalhos ou endereços de provedores dentro.

**Não validado:**

- **Nenhuma chamada com chave real.** A qualidade, o tempo e o custo reais das análises, propostas e imagens não foram verificados.
- **Nenhum teste em celular ou simulador** (apenas web). Câmera, permissões, a maquete 3D em WebView nativa e o armazenamento em arquivos foram verificados só por tipos e build.
- O app **não foi publicado** em nenhuma loja, nenhuma conta foi criada e nenhuma integração foi contratada.

## Como executar

Requisitos: Node.js 20 ou mais recente (testado com 22), npm e, no celular, o app **Expo Go** compatível com o SDK 57.

```bash
npm install
npx expo start
```

- **No celular:** abra o Expo Go e escaneie o QR code (computador e celular na mesma rede Wi-Fi). Se a rede bloquear a conexão, use `npm run start:tunnel`.
- **Na web:** tecle `w` no terminal ou rode `npm run web`.

Sem chaves configuradas, o app funciona no **modo demonstração**. O app usa apenas módulos que já vêm no Expo Go, então não é preciso gerar uma build nativa para testar.

Se uma alteração de código não aparecer no app, reinicie com `npx expo start --clear`.

## Ativar a IA

1. Copie o modelo de variáveis: `cp .env.example .env`
2. Preencha no `.env`:
   - `ANTHROPIC_API_KEY` — **obrigatória** para análise, propostas e ajustes (Claude).
   - `GEMINI_API_KEY` **ou** `OPENAI_API_KEY` — imagens das propostas. Sem nenhuma delas, as propostas aparecem sem imagem.
   - `WORLDLABS_API_KEY` — opcional, para o 3D imersivo.
3. Reinicie o `npx expo start`. A tela inicial passa a mostrar "IA disponível", e as Configurações mostram o status de cada serviço.

As chaves são criadas no painel de desenvolvedor de cada provedor. O `.env` está no `.gitignore` e só é lido pelo servidor. Todas as variáveis estão documentadas em [`.env.example`](.env.example).

**Como o celular chega ao servidor:** o `npx expo start` serve o app e as rotas `/api`. No Expo Go, o Expo Router aponta as chamadas automaticamente para esse servidor de desenvolvimento, e as chaves ficam apenas no computador. Em produção, veja [Publicação nas lojas](#publicação-nas-lojas).

**Custos:** cada geração completa faz 4 chamadas ao Claude (1 análise + 3 propostas) e 3 gerações de imagem. Cada ajuste faz 1 chamada ao Claude e 1 imagem. O 3D imersivo é cobrado à parte pela World Labs. Os valores dependem do plano de cada provedor.

## Modo demonstração

É usado quando não há servidor ou chaves, ou quando o usuário escolhe nas Configurações. Ele aparece identificado em todas as telas relevantes e **não finge** que houve IA:

- monta três propostas no aparelho a partir **apenas das respostas**, com regras fixas (estilos, paletas, cores preferidas e evitadas, restrições do imóvel);
- **não analisa a foto**, **não gera imagens** (mostra a paleta no lugar) e **não estima valores**;
- a maquete 3D usa um layout típico do tipo de ambiente, com dimensões de exemplo;
- os ajustes são predefinidos (mais econômico, luz mais quente, cor de destaque, manter um item).

## Como a IA funciona

1. **Análise** (1 chamada, com a foto e até 2 fotos extras): leitura profissional do ambiente; observações marcadas como "observado" ou "hipótese", com confiança; dimensões com origem (usuário, estimativa ou misto), confiança e nota sobre a margem de erro; compatibilidade com o orçamento; e três direções de projeto distintas.
2. **Propostas** (3 chamadas em paralelo): cada uma detalha uma direção conhecendo as outras duas, para garantir diferença real. Se uma falhar, as outras continuam e a que falhou pode ser refeita.
3. **Imagens** (uma por proposta): edição da foto original que preserva posição da câmera, perspectiva, geometria, janelas, portas e elementos estruturais, e mantém os itens marcados como "manter".
4. **Ajustes**: atualizam a proposta, resumem o que mudou e editam a imagem anterior, mantendo a continuidade.

Regras dadas à IA ([`src/server/ai/prompts.ts`](src/server/ai/prompts.ts)): separar fatos de hipóteses; não inventar fontes, marcas, lojas ou preços; usar valores em R$ apenas com base razoável e sempre como estimativa; respeitar as restrições (imóvel alugado, não furar, não pintar etc.); ser honesta sobre limitações.

As respostas usam **saída estruturada** e são validadas com os mesmos schemas Zod do app; o que vier fora do formato vira erro e não é exibido. Configuração padrão: modelo `claude-opus-5-5`, raciocínio adaptativo, esforço `medium` e streaming. Nesse modelo também é ativado o *fallback* do lado do servidor da Anthropic (beta `server-side-fallback-2026-07-01`).

Imagens: Google Gemini (`gemini-nano-banana-2.1`, pela Interactions API, com `store: false`) ou OpenAI (`gpt-image-2.5-sunburst`, endpoint de edição). A proporção da imagem gerada acompanha a da foto.

Erros tratados com mensagens em português e opção de tentar novamente quando faz sentido: sem conexão, servidor ausente, tempo esgotado, limite de uso (do app e do provedor), credencial recusada, conta sem crédito, pedido recusado e resposta incompleta ou fora do formato. Durante a geração, o servidor envia sinais de atividade a cada 10 s; o app considera a conexão perdida após 90 s sem dados.

## Visualização 3D

**Maquete paramétrica** (three.js, roda isolada dentro de uma WebView no celular ou de um iframe na web, sem acesso à rede):

- montada a partir da "cena" de cada proposta: dimensões do ambiente, portas, janelas e móveis com posição, tamanho, cor, material e status;
- com IA, o layout é estimado a partir da foto; no modo demonstração, é um layout típico do tipo de ambiente;
- sempre apresentada como **aproximação**, com aviso sobre a origem das dimensões. O usuário pode informar largura, comprimento e pé-direito reais, e a maquete é reescalada;
- interação: girar, aproximar com pinça, visões prontas (visão geral, como na foto, planta), tocar num móvel para ver nome e status, destacar por cor o que é mantido, reposicionado, novo ou substituído, e alternar entre as propostas.

Limitações: os móveis são formas simplificadas (não são modelos de produtos reais), as posições são estimativas e não há reconstrução fotogramétrica da foto.

**3D imersivo (opcional, World Labs Marble):** gera um ambiente 3D fotorrealista e navegável a partir da imagem da proposta. Pede confirmação antes (custo e envio da imagem), leva alguns minutos e abre no navegador. É uma interpretação gerada por IA, não uma reconstrução medida. Por padrão, o mundo gerado não é público, mas quem tiver o link pode abri-lo (`WORLDLABS_LINK_ACCESS`).

Depois de alterar o motor 3D em `src/features/viewer3d/engine`, rode `npm run build:viewer` para regenerar `viewer-html.generated.ts`, que é versionado para o app funcionar sem esse passo.

## Privacidade e segurança

- **Chaves apenas no servidor** (`.env` ou variáveis do provedor de hospedagem). Uma regra de lint impede que o app importe código do servidor, e os bundles gerados foram verificados.
- **Consentimento antes do primeiro envio:** a tela explica o que é enviado, para quais provedores e o que não é feito. Pode ser revogado nas Configurações.
- A foto é reduzida (até 1600 px) e recodificada em JPEG no aparelho, o que remove metadados como a localização (EXIF/GPS).
- O servidor não grava fotos. O Gemini recebe `store: false`; a World Labs recebe permissão não pública.
- Os logs do servidor têm apenas o código do erro e uma mensagem curta, nunca fotos, respostas ou chaves (verificado por teste automatizado).
- Projetos ficam no aparelho e podem ser excluídos um a um ou todos de uma vez.
- Limite de requisições por endereço IP (padrão: 60 análises por hora). Veja [Limitações conhecidas](#limitações-conhecidas).

## Arquitetura

```
src/
  app/                 rotas do Expo Router (somente telas e rotas /api)
    api/               analyze, proposal, refine, render, world, health
  screens/             conteúdo de cada tela
  components/          design system: botões, cartões, opções, avisos, comparador antes/depois…
  theme/               cores (claro/escuro), tipografia, espaçamentos
  domain/              regras e tipos compartilhados: questionário, catálogos, schemas (Zod),
                       projeto, cena 3D, gerador de demonstração
  services/            cliente HTTP (streaming), orquestração, fotos, armazenamento local
  stores/              estado (zustand): app, rascunho, projetos
  features/viewer3d/   motor 3D (three.js) e ponte WebView/iframe
  server/              código exclusivo do servidor: provedores, prompts, erros, limites
e2e/                   testes ponta a ponta (Playwright) e servidor de IA simulado
scripts/               build do visualizador 3D e geração de ícones
```

Interfaces substituíveis — para trocar um fornecedor, implemente a interface e selecione-a em [`src/server/providers.ts`](src/server/providers.ts):

| Capacidade | Interface | Implementação atual |
| --- | --- | --- |
| Análise, propostas e ajustes | `DesignAI` (`src/server/ai/claude.ts`) | Anthropic Claude |
| Edição de imagem | `ImageEditProvider` (`src/server/images/types.ts`) | Google Gemini ou OpenAI |
| 3D imersivo | `WorldProvider` (`src/server/world/worldlabs.ts`) | World Labs Marble |
| Persistência | `LocalStore` (`src/services/storage/types.ts`) | arquivos (celular) e IndexedDB (web) |
| Maquete 3D | protocolo de mensagens (`src/features/viewer3d/protocol.ts`) | three.js |

O contrato entre app e servidor está em [`src/domain/api.ts`](src/domain/api.ts) e é validado dos dois lados. Os projetos salvos têm `schemaVersion` e passam por uma interface de armazenamento pequena, o que prepara o terreno para contas e sincronização em nuvem.

## Testes

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # testes unitários (Jest)
npm run check       # os três
```

**Ponta a ponta na web** (usa o Chromium do Playwright; capturas de tela em `e2e/artifacts/`):

```bash
# modo demonstração
npx expo start --web             # terminal 1
MODE=demo npm run e2e:web        # terminal 2

# modo IA com servidor simulado (não chama nenhum serviço real)
npm run mock:ai                                            # terminal 1
EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo start --web   # terminal 2
MODE=ai npm run e2e:web                                    # terminal 3
```

**Rotas reais + SDK da Anthropic contra a API simulada:** com `npm run mock:ai` rodando, inicie o servidor com `ANTHROPIC_API_KEY=teste ANTHROPIC_BASE_URL=http://localhost:8787 IMAGE_PROVIDER=none npx expo start` e use o app. Cada requisição recebida é salva, sem imagens nem chaves, em `e2e/artifacts/mock-requests/`.

Resultados da última execução:

| Verificação | Resultado |
| --- | --- |
| `tsc --noEmit` | sem erros |
| `expo lint` | sem avisos |
| Jest | 18 suítes, 133 testes passando |
| E2E web — demonstração | 11 etapas, 0 erros no console |
| E2E web — IA (simulada) | 12 etapas, 0 erros no console; todas as requisições do app aceitas pelos schemas do servidor |
| Rotas reais + SDK Anthropic (API simulada) | análise, 3 propostas, proposta avulsa e ajuste em streaming; imagem e 3D sem chave retornam "não configurado" (503) |
| `expo export` Android e iOS | bundles gerados, sem segredos |
| `expo-doctor` | 21/21 |

## Dependências adicionadas

Além do modelo padrão do Expo SDK 57 (Expo Router, Reanimated, Gesture Handler, expo-image, expo-symbols etc.):

| Pacote | Uso |
| --- | --- |
| `@anthropic-ai/sdk` | chamadas ao Claude (somente no servidor) |
| `zod` | schemas compartilhados e validação |
| `zustand` | estado do app |
| `expo-image-picker`, `expo-image-manipulator` | câmera, galeria, redimensionamento e remoção de metadados |
| `expo-file-system` | projetos e imagens no aparelho |
| `react-native-webview` | maquete 3D no celular |
| `expo-haptics`, `expo-web-browser` | retorno tátil e abertura do 3D imersivo |
| `@expo-google-fonts/fraunces` | fonte dos títulos |
| `jpeg-js` | medir brilho e contraste da foto no aparelho |
| `idb-keyval` | armazenamento na web (IndexedDB) |
| `three` (dev) | motor da maquete, empacotado no visualizador |
| `esbuild` (dev) | build do visualizador e do servidor simulado |
| `playwright` (dev) | testes ponta a ponta |
| `jest`, `jest-expo`, `@types/jest`, `@types/three` (dev) | testes e tipos |

Pacotes instalados pelo registro oficial do npm (`npx expo install` para os do ecossistema Expo). O Playwright usa um Chromium já disponível, sem baixar navegadores.

## Publicação nas lojas

Já preparado: nome, ícones (incluindo o ícone adaptativo do Android), tela de abertura clara e escura, identificadores `com.ambienta.app` (provisórios), textos de permissão em português, microfone bloqueado, `usesNonExemptEncryption: false` e [`eas.json`](eas.json) com os perfis `preview` (APK para testes internos) e `production` (versão incrementada automaticamente).

Passos que dependem de você:

1. **Contas:** Apple Developer Program e Google Play Console (as duas são pagas) e uma conta Expo para o EAS.
2. **Nome e identificadores definitivos** — depois da primeira publicação, o identificador não pode mais mudar.
3. **Publicar o servidor** (obrigatório para usar IA no app publicado). Com o EAS Hosting:
   ```bash
   npx expo export -p web
   npx eas-cli@latest deploy --prod
   ```
   Cadastre as chaves como variáveis secretas do EAS (por exemplo, `npx eas-cli@latest env:create --name ANTHROPIC_API_KEY --value ... --environment production --visibility secret`) e aponte o app para a URL publicada com `EXPO_PUBLIC_API_URL` (ou com o campo `origin` do plugin `expo-router` no `app.json`) antes da build. Também é possível hospedar em um servidor Node próprio, seguindo o guia de API Routes do Expo Router. A geração mantém a conexão aberta por 1 a 3 minutos; confira os limites de duração de requisição da hospedagem escolhida.
4. **Builds e envio:**
   ```bash
   npx eas-cli@latest build --profile preview --platform android   # APK para testar
   npx eas-cli@latest build --profile production --platform all
   npx eas-cli@latest submit --platform ios
   npx eas-cli@latest submit --platform android
   ```
5. **Exigências das lojas:** política de privacidade publicada (URL) explicando o envio de fotos a provedores de IA, formulários de privacidade (App Store) e segurança de dados (Google Play), classificação etária, capturas de tela, descrição e contato de suporte. A Apple exige informar e obter permissão antes de compartilhar dados pessoais com serviços de IA de terceiros; a tela de consentimento cobre isso, mas revise as diretrizes vigentes.
6. **Antes de abrir ao público:** autenticação ou atestação do app e limite de uso por usuário (o limite atual fica em memória e vale por instância do servidor), acompanhamento de custos, termos de uso e revisão da adequação à LGPD.

## Trocar o nome

- `src/constants.ts` (`APP_NAME`, usado nas telas e no nome dos mundos 3D);
- `app.json`: `name`, textos de permissão e, antes da primeira publicação, `slug`, `scheme`, `ios.bundleIdentifier` e `android.package`;
- `package.json` (`name`), opcional.

Não altere a pasta interna de dados (`ambienta` em `src/services/storage`) depois de publicar, ou os projetos já salvos deixarão de aparecer.

## Credenciais e pendências

| Item | Para quê | Situação |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | análise, propostas e ajustes | pendente (obrigatória para o modo IA) |
| `GEMINI_API_KEY` ou `OPENAI_API_KEY` | imagens das propostas | pendente |
| `WORLDLABS_API_KEY` | 3D imersivo | opcional |
| Hospedagem do servidor (ex.: EAS Hosting) | IA no app publicado | pendente |
| Apple Developer, Google Play Console | publicação | pendente |
| Política de privacidade e termos de uso (URLs) | exigência das lojas | pendente |

## Limitações conhecidas

- Provedores reais e celulares físicos ainda não foram testados (veja [Estado atual](#estado-atual-o-que-foi-validado-e-o-que-não-foi)).
- Não há contas de usuário: qualquer pessoa com o endereço do servidor pode consumir créditos. O limite por IP é em memória; em produção, use autenticação e um armazenamento compartilhado.
- Valores em R$ são estimativas da IA, sem base de preços própria.
- A maquete 3D é aproximada, e o 3D imersivo é uma interpretação generativa.
- Na web, os projetos ficam no IndexedDB do navegador e somem se os dados do site forem apagados.
- Não há sincronização em nuvem nesta versão (a estrutura está preparada para isso).
