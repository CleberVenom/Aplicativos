# Instruções para o Claude neste projeto

As instruções técnicas do projeto (Expo, comandos, rotas, EAS) estão em `AGENTS.md`.

## Sempre que indicar o uso de uma API ou serviço externo

Toda vez que eu orientar o uso de uma API ou serviço externo (chave de acesso, conta, cobrança), devo:

1. **Consultar o caminho oficial atual antes de responder.** Ver na documentação do próprio serviço onde criar a conta e a chave, os nomes dos botões, se exige cobrança ou crédito, se há uso gratuito e quanto custa. Nunca responder de memória.
2. **Instruir de forma simples e sem jargões**, em português, com o passo a passo completo:
   - criar a conta e gerar a chave;
   - ativar a cobrança, quando necessário;
   - onde colar a chave para o app usar (painel da Expo ou `.env`);
   - como saber se funcionou;
   - quanto pode custar.
   Quando um termo técnico for inevitável, explicar o que ele significa.
3. **Avisar onde a chave nunca deve ficar:** dentro do app, em mensagens, em prints ou no GitHub.
4. **Manter o guia `docs/configurar-apis.md` atualizado** com esse passo a passo.
