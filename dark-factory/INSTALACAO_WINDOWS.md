# INSTALAÇÃO NO WINDOWS — Etapa 1 (Claude Code)

> Objetivo desta etapa: ter o **Claude Code** funcionando no seu PC. Depois disso, o próprio
> Claude Code instala o resto (Python, FFmpeg etc.) — você só aprova.
> Tempo estimado: 15 minutos. Custo: R$ 0 (já incluso no Claude Pro).
> Fonte das instruções: documentação oficial — https://code.claude.com/docs/en/setup (consultada em 16/11/2026)

**Termos rápidos**
- *Terminal / PowerShell*: janela onde se digitam comandos de texto.
- *Git*: programa que guarda versões de arquivos; o Claude Code usa para trabalhar melhor no Windows.

---

## Passo 1 — Instalar o Git for Windows (recomendado)

1. Abra o navegador e acesse **https://git-scm.com/downloads/win**
2. Clique em **"Click here to download"** (versão 64-bit).
3. Abra o arquivo baixado e clique em **Next** em todas as telas (as opções padrão servem) e por fim **Install** → **Finish**.

✅ **Resultado esperado:** "Git Bash" aparece no Menu Iniciar.

## Passo 2 — Abrir o PowerShell

1. Clique no **Menu Iniciar**, digite **PowerShell**.
2. Clique em **Windows PowerShell** (não precisa "Executar como administrador").

✅ A janela mostra algo como `PS C:\Users\SeuNome>` — o **PS** indica que é PowerShell.

## Passo 3 — Instalar o Claude Code

1. Copie o comando abaixo, cole no PowerShell (clique com botão direito para colar) e pressione **Enter**:

   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```
2. Aguarde: o instalador **não mostra progresso** enquanto baixa. Espere voltar o `PS C:\...>`.
3. **Feche** o PowerShell e **abra outro** (Passo 2 de novo).

## Passo 4 — Testar a instalação

Digite e pressione Enter:

```powershell
claude --version
```

✅ **Resultado esperado:** aparece um número de versão, ex.: `2.1.xxx (Claude Code)`.

## Passo 5 — Criar a pasta do projeto e entrar com sua conta

1. No PowerShell, digite (um por vez, Enter após cada):

   ```powershell
   mkdir C:\DarkFactory
   cd C:\DarkFactory
   claude
   ```
2. Na primeira vez, o Claude Code pede login: escolha a opção de **conta Claude (assinatura)**; o navegador abre → faça login com a conta do **Claude Pro** → **Autorizar**.
3. Volte ao PowerShell. Se perguntar se confia na pasta, responda **Yes**.

✅ **Resultado esperado:** aparece a tela do Claude Code esperando sua mensagem.

## Passo 6 — Teste de funcionamento

Digite na tela do Claude Code:

```
Diga qual sistema operacional estou usando e crie um arquivo teste.txt com a frase "Dark Factory OK".
```

✅ Ele pedirá permissão para criar o arquivo → aprove. Confira que `C:\DarkFactory\teste.txt` existe.

**Pare aqui e me avise o resultado** (um print ou o texto que apareceu). A Etapa 2 será colar
um único pedido no Claude Code para ele instalar Python, FFmpeg, faster-whisper e auto-editor.

---

## Erros comuns

| Mensagem | Causa | Correção |
|----------|-------|----------|
| `'irm' is not recognized` | Você está no CMD, não no PowerShell | Abra o **Windows PowerShell** (Passo 2) |
| `claude` não é reconhecido | Terminal antigo ainda aberto, ou PATH não atualizado | Feche e abra o PowerShell; se persistir, reinicie o PC |
| Erro 403 / falha no download | Rede/antivírus bloqueando | Tente outra rede ou pause o antivírus durante a instalação |
| Login diz que o plano não tem acesso | Conta errada | Saia (`/logout`) e entre com a conta do **Claude Pro** |

**Segurança:** nunca cole senhas ou chaves no chat. O login do Claude Code é feito pelo navegador.
