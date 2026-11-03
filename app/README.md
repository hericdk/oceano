# Oceano MVP (Electron)

A interface do simulador com **abas de verdade**: sites reais, DevTools (F12),
modo jogo que congela abas de fundo, consumo real por aba, log de rede real e
bloqueador de anúncios e rastreadores (listas da Ghostery, código aberto).

```bash
npm install
npm start
```

## Abrir pelo Finder e Spotlight

- `python3 criar-atalho.py` → `/Applications/Oceano.app` que aponta para esta pasta
  (para desenvolver: toda mudança no código já vale ao abrir).
- `python3 instalador/empacotar.py` → `dist/Oceano-<versão>.dmg`, o instalador com a
  janela pixel de arrastar para Aplicativos. Este app leva uma cópia do código e
  funciona em qualquer Mac. O fundo da janela é desenhado por `instalador/fundo.py`.
  Assinatura só local: em outro Mac o macOS pede "Abrir mesmo assim" em
  Ajustes > Privacidade e Segurança até termos uma conta Apple Developer (notarização).

## Privacidade e ferramentas de dev

- **oceano://privacidade** (⌘,): telemetria desligada (lista do que o Chromium faria e o Oceano corta),
  DNS cifrado (Quad9 padrão; Mullvad, Cloudflare, AdGuard; sempre/automático/desligado), bloqueador,
  perfis com proxy, permissões dos sites e verificação de versão (só quando você clica).
- **Perfis isolados**: Pessoal (partição antiga `persist:oceano`), Trabalho, Testes e os que você criar.
  Cada um com cookies, cache e proxy próprios (Burp, mitmproxy, Tor ou regra livre). A cor aparece na aba;
  o botão à esquerda do endereço troca o perfil ou abre aba em outro.
- **Aba efêmera** (⌘⇧N): sessão só na memória, apagada ao fechar a aba.
- **Teste rápido** (⌘E): HTML/CSS/JS ao vivo ou uma URL numa sessão efêmera, com console; vira tela cheia
  ou aba efêmera. O rascunho é servido por `teste://<chave>/` (só nas sessões efêmeras).
- **Painel Dev** (⌘⇧D, aba Dev da barra lateral): desempenho (TTFB, FCP, LCP, CLS, tarefas longas, memória,
  DOM), rede e cache (do cache, bloqueados, mais pesados e lentos, desligar cache), console com JS na página,
  checagem de HTML (título, idioma, alt, rótulos, IDs repetidos, h1…), segurança (cabeçalhos, cookies,
  certificado, conteúdo misto) e emulação por aba (tela de aparelho, user agent, rede 4G/3G/2G/offline).
- **Comandos** (⌘K): tudo acima pelo teclado.
- Permissões: nada é concedido em silêncio (exceto tela cheia, copiar e travar o mouse); a barra pergunta.

`seguranca.js` guarda ajustes em `userData/config.json`. `icone.js` é a animação do Dock.

## Como funciona

- `main.js` é a única parte específica do Electron: serve a interface (do `../simulador`
  e de `ui/`) pelo esquema `oceano-ui://`, isola cada site numa `<webview>` sem Node,
  mede processos (`app.getAppMetrics`), congela abas (Page Lifecycle "frozen") e
  registra a rede.
- `preload.js` expõe só o necessário para a interface (`window.oceanoNativo`).
- `ui/app.html` é o `index.html` do simulador com `data-modo="app"` e a área das abas reais.
- Sites usam a sessão `persist:oceano`, separada da interface.

Versões: Electron 44.10.0 (Chromium 152).

## Próximo passo

Este MVP valida a experiência. O navegador final é o fork do Chromium: o código da
interface continua o mesmo, e o papel do `main.js` vira C++ no fork.
