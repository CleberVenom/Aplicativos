# SETUP LOCAL — Etapa 2 (pedido para o Claude Code no seu Windows)

> Use quando houver uma sessão do Claude rodando **no seu PC** (Claude Desktop ou `claude` no PowerShell).
> Copie o bloco abaixo inteiro e cole na sessão. Ela pedirá aprovação antes de cada instalação.

```
Você é o técnico de instalação do projeto DARK FACTORY AI neste PC Windows.
Regras: explique cada passo em português simples, peça aprovação antes de instalar,
não altere nada fora do necessário, não peça senhas nem chaves.

1. Crie a estrutura de pastas:
   C:\Users\clebe\Desktop\DarkFactory\entrada        (arquivos de origem autorizados)
   C:\Users\clebe\Desktop\DarkFactory\trabalho       (arquivos temporários)
   C:\Users\clebe\Desktop\DarkFactory\saida          (vídeos prontos para revisão)
   C:\Users\clebe\Desktop\DarkFactory\autorizacoes   (comprovantes de autorização dos criadores)
   C:\Users\clebe\Desktop\DarkFactory\logs           (registro de execuções)
   C:\Users\clebe\Desktop\DarkFactory\docs           (documentação do projeto)
2. Verifique se já existem: winget, Python 3.11+ e FFmpeg.
3. Instale o que faltar via winget:
   winget install -e --id Python.Python.3.12
   winget install -e --id Gyan.FFmpeg
   (feche e reabra o terminal depois, para atualizar o PATH)
4. Crie um ambiente Python isolado em C:\Users\clebe\Desktop\DarkFactory\.venv e instale:
   faster-whisper  auto-editor
5. Teste: "python --version", "ffmpeg -version", "auto-editor --version",
   e um teste do faster-whisper com o modelo "small" em um áudio curto gerado pelo próprio FFmpeg.
6. Registre versões instaladas e resultado dos testes em C:\Users\clebe\Desktop\DarkFactory\logs\setup.md.
7. Mostre um resumo: o que foi instalado, o que falhou, e a correção sugerida.
```

✅ **Resultado esperado:** `logs\setup.md` com Python, FFmpeg, auto-editor e faster-whisper funcionando.
