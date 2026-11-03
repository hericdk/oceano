# Segurança do Oceano

Versão inicial. O código é aberto para qualquer pessoa conferir, e correções são bem-vindas.

## O que o navegador faz com os seus arquivos

- Sites não acessam os seus arquivos. Um download sempre passa pela janela de salvar do sistema, e o Oceano nunca abre o arquivo sozinho. Tipos que rodam programas recebem um aviso.
- Mods não têm acesso a arquivos, internet, senhas, páginas nem a outros mods. O limite é do motor: `io`, `load`, `require` e `debug` nem existem para eles.
- Temas são só cores, conferidos antes de instalar.
- A Navegadora não muda arquivos. Quando algo precisa mudar, ela monta um pedido, a pessoa copia e aprova cada mudança no outro agente.

Só o que a própria pessoa pede grava no computador: salvar um download; o editor de animação salva na pasta `Documentos/Oceano`; as Ferramentas exportam pelo motor local; aplicar o PhotoGIMP muda a configuração do GIMP, com botão de desfazer.

## Confira você mesmo

Em `oceano://privacidade` há um texto de scan de segurança para colar numa IA com acesso aos arquivos, fora do navegador. Os blocos são sempre os mesmos e só a ordem é sorteada.

## Senhas e chaves

- O Oceano não guarda senhas de sites. O baú está desativado nesta versão.
- As chaves de IA são digitadas pela pessoa e ficam só na memória enquanto o app está aberto. Nada é gravado em disco e a tela nunca recebe a chave de volta.
- O Oceano não usa as Chaves do Mac nem o chaveiro do sistema e nunca pede a senha do computador. `npm run verificar`, em `app/`, falha se isso mudar.
- Por isso os cookies dos sites não são cifrados com uma chave do sistema: ficam na pasta do Oceano, protegidos pela sua conta do computador.
- Os sites podem manter você conectado por cookies, como em qualquer navegador. Use a aba efêmera quando não quiser isso.

## Rede

A contagem anônima de uso só existe com autorização, nos primeiros passos ou em Configurações, sem identificador e sem guardar IP. As conexões do próprio navegador aparecem em `oceano://rede`. Clima, temas da comunidade e skills só vão à internet depois de a pessoa ligar ou pedir.

## Câmera e microfone

Toda vez que um site recebe acesso à câmera ou ao microfone, um aviso vermelho aparece na barra e na aba, e clicar nele abre a aba que está gravando. O aviso não tem opção de desligar. O início vem da permissão, no processo principal. O fim vem das faixas da página, então um site mal-intencionado pode tentar apagar o aviso antes da hora; o sistema operacional continua mostrando o indicador dele.

## O que ainda não existe

Assinatura do app e atualização automática. Até lá, confira de onde você baixou o Oceano.

Encontrou uma falha? Abra um aviso no repositório, sem publicar detalhes de como explorar.

## Limites conhecidos desta versão

- Cada ferramenta embutida tem origem própria e não alcança o navegador: só pede o que está numa lista curta, por mensagens. O Stave roda código de fora (padrões colados e sons baixados), então tem também as permissões mais curtas.
- Só o que vem com o Oceano pode ter janela sem fundo. Mod de outra pessoa sempre tem fundo.
- Mods rodam na mesma linha da interface: o limite de tempo interrompe laços, mas ainda não é um isolamento em processo separado.

## Mensagens para uma IA local

A Navegadora não fala sozinha com o Claude ou outro agente deste computador. Ela só prepara um cartão com a
mensagem, a origem, a intenção e a recomendação dela. Nada sai dali sem um clique da pessoa, e a mensagem vai
apenas para a área de transferência, nunca num endereço. O texto copiado pede que a IA local explique a mensagem,
dê a recomendação dela e espere a autorização antes de agir. Esse limite é fixo em `app/guardrails.js`, e
`npm run verificar` confere a trava antes de cada instalador.
