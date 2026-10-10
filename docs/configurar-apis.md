# Como ligar a inteligência artificial do app

Guia passo a passo, sem termos técnicos. Conferido nas páginas oficiais de cada serviço em outubro de 2026. Os sites mudam com o tempo; se algum botão estiver com outro nome, procure algo parecido na mesma página.

## Antes de começar

O app usa dois serviços de inteligência artificial, de empresas diferentes:

| Serviço | O que faz no app | É obrigatório? |
| --- | --- | --- |
| **Claude** (empresa Anthropic) | Analisa a foto e escreve as três propostas e os ajustes | **Sim.** Sem ele o app continua no modo demonstração |
| **Nano Banana** (empresa Google) | Desenha a imagem de cada proposta a partir da sua foto | Recomendado. Sem ele as propostas aparecem sem imagem |
| **World Labs** | Cria o "3D imersivo" | Não, é opcional |

Cada serviço entrega uma **chave de acesso**: um código comprido que funciona como uma senha. O app precisa dessas chaves para usar os serviços em seu nome, e cada uso é cobrado na sua conta do serviço.

**Cuidados com as chaves (importante):**

- Trate a chave como uma senha. Não envie por mensagem (nem para o Claude), não tire print e não coloque em arquivos do projeto no GitHub.
- O único lugar onde você vai colar as chaves é o painel da Expo (passo 3), que as guarda com segurança.
- Se uma chave vazar, apague-a no site do serviço e crie outra.

## 1. Nano Banana (Google): imagens das propostas

**Custo:** o Nano Banana **não tem uso gratuito**. É preciso ativar a cobrança na conta Google. Cada imagem custa cerca de US$ 0,034 (no tamanho que o app usa). Um projeto gera 3 imagens, cerca de US$ 0,10, e cada ajuste gera mais uma.

1. Abra **aistudio.google.com/apikey** e entre com a sua conta Google.
2. Aceite os termos de uso. Na primeira vez, o Google já cria um projeto e uma chave para você. Se nenhuma chave aparecer, clique em **Create API key**.
3. **Ative a cobrança.** Na lista de chaves, na coluna **Billing Tier**, clique em **Set up billing**:
   - escolha o seu país e aceite os termos;
   - confirme seus dados e a forma de pagamento;
   - faça a recarga inicial (o mínimo é US$ 5). Se o site oferecer a opção de pagar depois do uso, ela também serve.
4. **Recomendado: limite de gastos.** Abra **aistudio.google.com/spend**, procure **Monthly spend cap**, clique em **Edit spend cap** e escolha o valor máximo por mês.
5. Volte para **aistudio.google.com/apikey** e copie a chave (ícone de copiar ao lado dela).

Bom saber:

- O crédito de boas-vindas de US$ 300 do Google Cloud não pode ser usado aqui (contas abertas depois de 2 de março de 2026).
- Créditos comprados valem por 12 meses e normalmente não são reembolsados.
- Para ver quanto já gastou: **aistudio.google.com/usage**.

Nome desta chave no app: **`GEMINI_API_KEY`**

## 2. Claude (Anthropic): análise e propostas

**Custo:** o Claude funciona com **créditos pré-pagos**: você compra um valor e ele vai sendo descontado. A cobrança depende do tamanho dos textos que ele lê e escreve. Pelos preços oficiais, estimamos de US$ 0,50 a US$ 1,00 por projeto e cerca de US$ 0,20 por ajuste. É uma estimativa, que ainda não foi medida em uso real; confira os primeiros gastos no painel.

1. Abra **platform.claude.com** e crie sua conta (ou entre, se já tiver).
2. **Compre créditos:** vá em **Settings** → **Billing**, clique em **Buy credits**, escolha o valor e confirme. Os créditos ficam disponíveis na hora.
   - Para nunca gastar além do que comprou, deixe desligada a recarga automática (**Auto-reload**).
   - Os créditos valem por 1 ano e não são reembolsados.
3. **Crie a chave:** vá em **Settings** → **API keys** (ou abra **platform.claude.com/settings/keys**) e clique em **Create key**. Dê um nome, por exemplo "Ambienta", e confirme.
4. **Copie a chave na hora.** Ela começa com `sk-ant-` e **só aparece uma vez**. Se perder, apague essa e crie outra.

Nome desta chave no app: **`ANTHROPIC_API_KEY`**

## 3. Colocar as chaves no app (painel da Expo)

As chaves não vão para dentro do aplicativo instalado no celular. Elas ficam no servidor do app, e você as cadastra pelo site da Expo:

1. Entre em **expo.dev** com a sua conta e abra o projeto **ambienta** (endereço direto: expo.dev/accounts/clebervenom/projects/ambienta).
2. Vá em **Project settings** → **Environment variables** e clique em **Add Variables**.
3. Preencha o formulário:
   - **Name:** `GEMINI_API_KEY`, exatamente assim, em letras maiúsculas.
   - **Value:** cole a chave do Google.
   - **Environments:** marque só `production`, que é o ambiente usado pelo servidor do app.
   - **Visibility:** escolha **Sensitive**. Não escolha "Secret": o servidor do app não consegue ler chaves desse tipo.
4. Salve o formulário.
5. Repita para a chave do Claude, com o nome `ANTHROPIC_API_KEY`.
6. Avise o Claude (ou quem cuida do app) que as chaves estão cadastradas. As chaves só passam a valer depois que o servidor é publicado de novo e um novo APK é gerado (veja o passo 5).

## 4. Opcional: 3D imersivo (World Labs)

Tem custo próprio por geração, cobrado em créditos da World Labs.

1. Abra **platform.worldlabs.ai** e entre (ou crie a conta).
2. Em **platform.worldlabs.ai/billing**, cadastre uma forma de pagamento e compre créditos.
3. Em **platform.worldlabs.ai/api-keys**, gere uma chave e copie.
4. Cadastre no painel da Expo como no passo 3, com o nome **`WORLDLABS_API_KEY`**.

## 5. O que acontece depois (parte técnica, feita pelo Claude)

Depois das chaves cadastradas, quem cuida do app:

1. Publica o servidor do app com as chaves:
   ```bash
   npx expo export -p web
   npx eas-cli@latest deploy --environment production --prod
   ```
2. Cadastra o endereço publicado na variável `EXPO_PUBLIC_API_URL`, do tipo **Plain text**, nos ambientes `preview` e `production`. Esse endereço não é segredo.
3. Gera um novo APK: `npx eas-cli@latest build -p android --profile preview`.

Sempre que uma chave for trocada, o servidor precisa ser publicado de novo (item 1).

## 6. Como saber se funcionou

- Na tela inicial do app aparece **IA conectada** (em vez de "Modo demonstração").
- Em **Configurações**, as linhas **Análise e propostas** e **Imagens das propostas** mostram o nome do serviço em vez de "Não configurado".

Se aparecer uma destas mensagens ao gerar propostas:

- **"A credencial do serviço … foi recusada"**: a chave foi copiada errada ou foi apagada. Copie de novo e atualize no painel da Expo.
- **"… está sem créditos ou com pagamento pendente"**: falta crédito ou a cobrança não foi ativada (passo 1.3 ou 2.2).

## Para desenvolvedores: testar no computador

Com o projeto no computador, copie `.env.example` para `.env`, preencha as mesmas chaves e rode `npx expo start`. O arquivo `.env` nunca vai para o GitHub (está no `.gitignore`). O app no Expo Go usa automaticamente o servidor do seu computador.

## Fontes oficiais consultadas

- Google: [chaves da Gemini API](https://ai.google.dev/gemini-api/docs/api-key), [preços](https://ai.google.dev/gemini-api/docs/pricing) e [cobrança](https://ai.google.dev/gemini-api/docs/billing)
- Anthropic: [criar chave](https://platform.claude.com/docs/en/get-api-key), [preços](https://platform.claude.com/docs/en/about-claude/pricing) e [pagamento por créditos](https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-api-usage)
- Expo: [variáveis de ambiente no painel](https://docs.expo.dev/eas/environment-variables/manage/) e [variáveis no EAS Hosting](https://docs.expo.dev/eas/hosting/environment-variables/)
- World Labs: [documentação da API](https://docs.worldlabs.ai/api)
