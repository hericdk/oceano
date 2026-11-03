# Oceano · visão

Um navegador minimalista, aberto e em pixel art, para quem joga e para quem programa.
Baseado no Chromium (as mesmas DevTools do Chrome), com contagem anônima de uso só se a pessoa autorizar, com temas e mods
exclusivos escritos em Lua, a linguagem criada na PUC-Rio.

Visualização completa do plano: [`docs/plano.html`](plano.html)
(com o simulador rodando: http://localhost:5216/docs/plano.html).

## Premissa norteadora

O Oceano é feito para quem cria e para quem grava vídeo, principalmente para quem está começando
(um negócio próprio, uma ideia, um sonho, um vlog). Cada ferramenta deve ensinar alguma coisa e a comunidade
deve ajudar cada pessoa a crescer: não é só mais um navegador. Detalhes em [`MANIFESTO.md`](MANIFESTO.md).

## Princípios

1. **Não coletar é melhor que proteger.** Dado que não existe não vaza.
2. **Local primeiro.** Histórico, senhas, favoritos e configurações ficam no computador.
3. **Sem conta obrigatória.** O navegador funciona inteiro sem cadastro.
4. **Tudo verificável.** Código aberto; `oceano://rede` lista cada conexão do próprio navegador.
5. **Personalização segura.** Temas são só dados (JSON). Mods são Lua em sandbox, com permissões declaradas.

## Promessas públicas

- Zero telemetria por padrão. Relatório de falha só com prévia e consentimento.
- Atualizações sem identificador único (só versão e sistema).
- Sincronização opcional, cifrada de ponta a ponta.
- Nunca vender nem compartilhar dados de uso, porque eles não existem.
- Modelo de negócio declarado: loja de temas com divisão de receita, Oceano+ opcional, doações.

## Arquitetura

| Camada | Tecnologia | Origem |
|---|---|---|
| Motor (páginas, JavaScript, sandbox, DevTools) | Chromium: Blink + V8 | Google, código aberto (BSD) |
| Base sem serviços do Google | Helium / ungoogled-chromium | comunidade |
| Interface nativa pixel art (abas, barra) | patches em C++ | Oceano |
| Páginas internas (`oceano://`) | HTML + TypeScript (WebUI) | Oceano |
| Mods e cartuchos | Lua 5.4 embutida, em sandbox; tipos opcionais com Teal | PUC-Rio / Hisham Muhammad, Brasil |
| Temas | JSON `oceano-tema/1` (paleta de até 16 cores) | Oceano |
| Bloqueador | adblock-rust | Brave, código aberto |
| Serviços (atualização, sync, loja) | Rust | Oceano |

## Domínios

| Domínio | Uso |
|---|---|
| oceano.gg | site e download |
| oceano.zone | loja de temas, mods e cartuchos |
| oceano.engineer | documentação para devs e API Lua |
| oceano.support | ajuda e status |
| oceano.chat | comunidade |
| oceano.social | devlog |

## Roadmap

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Simulador: UI pixel art, temas com estilo de mar pixelizado, mods em Lua e Teal, editor de temas, barra lateral | em andamento |
| 0.5 | Oceano Lite: extensão de Chrome com a nova aba do Oceano (pasta `extensao/`) | pronta localmente, em espera |
| 0.8 | MVP com abas reais em Electron/Chromium 152 (pasta `app/`) | rodando localmente |
| 1 | Primeira build do Chromium com a marca Oceano | depende de máquina (32 GB+) |
| 2 | Interface nativa pixel art, `oceano://rede` real, bloqueador | — |
| 3 | Beta fechado: instalador, atualização, mods e temas | — |
| 4 | Beta público: loja oceano.zone e comunidade | — |
