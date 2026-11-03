# Compartilhar um tema

Um tema do Oceano é só um arquivo JSON com cores. Não existe código em um tema.

1. Crie o tema em `oceano://temas` e clique em **Baixar**.
2. Num repositório público do GitHub, salve o arquivo na raiz com o nome `tema.oceano.json`.
3. Coloque o tópico `oceano-tema` no repositório.

Ele aparece em **Temas → Procurar temas**. Também dá para colar o link do repositório ou do arquivo em **Ver tema**.

## O que é bloqueado

O Oceano confere o arquivo inteiro antes de mostrar. Ele recusa tudo se houver:

- campo fora do formato `oceano-tema/1` (`formato`, `id`, `nome`, `autor`, `descricao`, `paleta`, `ui`, `mar`);
- cor fora de `#rrggbb` ou parte da tela sem cor;
- texto com `<`, `>`, `{`, `}`, endereço da internet ou caracteres de controle;
- arquivo acima de 64 KB ou que não seja JSON.

A comparação de contraste continua valendo: o tema instala, mas o Oceano avisa quando fica difícil de ler.
