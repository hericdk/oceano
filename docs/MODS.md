# Mods do Oceano

Um mod é um arquivo Lua ou Teal de até 32 KB, o tamanho de um cartucho do PICO-8. Esse é o limite criativo desta versão.

## Criar e importar

Em `oceano://mods`, use **Novo mod** ou **Importar arquivo** (`.lua` ou `.tl`). Antes de instalar, o navegador lê o código e mostra o que ele faz, quando roda e o que ele tentou usar sem poder. Um mod importado recebe só as permissões que o código pede.

## A referência

Todo mod precisa de uma referência: um emoji, um grupo de até 5 emojis ou um código seu (2 a 24 letras, números, `-` ou `_`). Ela é única. Os símbolos das áreas do Oceano ficam reservados.

Escreva a referência na conversa com a Navegadora: ela encontra o mod, conta o que ele faz, lido do próprio código, e pode ligar ou desligar, pedindo a sua permissão.

## O que um mod não consegue

Internet, arquivos, senhas, páginas, outros mods. `io`, `load`, `require`, `dofile`, `loadfile`, `debug` e `string.dump` não existem para ele. Sem a permissão declarada, a função também não existe. Um mod que passa de 40 ms por chamada várias vezes é pausado.

## O farol

A luz laranja mostra o uso de cada mod ligado: devagar com pouco uso, rápido com muito e acesa no limite. O número é a parte de um processador que o mod usa.

## Sprites e plugins do Aseprite

São do editor de animação (MicromediaFlash), que também usa Lua, com a API do Aseprite: arquivos `.aseprite` entram pelo importador e `.aseprite-extension`, `.zip` ou `.lua` em Comandos → Gerenciar plugins. Os mods do navegador usam funções próprias. Um não roda no lugar do outro.
