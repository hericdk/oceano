// A música dos sites: acha o áudio ou vídeo que está tocando numa aba e controla por fora (tocar, pausar, faixas,
// repetir). O player do CD na mesa (player-cd.js) é a cara disto. Só no app: cada site é uma <webview>.
// Fechar a aba para o som. Só com a opção ligada em Configurações o site segue vivo, escondido, até o player parar.

// roda dentro do site: escolhe a mídia e obedece ao comando. Devolve o estado, nunca dados da página além disso.
export const JS_MIDIA = cmd => `(() => {
  const ms = [...document.querySelectorAll('video, audio')].filter(m => m.readyState > 0 || m.currentSrc);
  const m = ms.find(x => !x.paused) || ms.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
  const clicar = (...qs) => { for (const q of qs) { const b = document.querySelector(q); if (b && !b.disabled && b.offsetParent !== null) { b.click(); return true; } } return false; };
  const cmd = ${JSON.stringify(cmd)};
  const PROX = ['.ytp-next-button', '[aria-label*="next" i]', '[aria-label*="próxim" i]'], ANT = ['.ytp-prev-button', '[aria-label*="previous" i]', '[aria-label*="anterior" i]'];
  const existe = l => l.some(q => { const b = document.querySelector(q); return b && !b.disabled && b.offsetParent !== null; });
  if (m) {
    if (cmd === 'tocar') m.play().catch(() => {});
    if (cmd === 'pausar') m.pause();
    if (cmd === 'reiniciar') { m.currentTime = 0; }
    if (cmd === 'repetir') m.loop = !m.loop;
    if (cmd === 'proximo') clicar(...PROX);
    if (cmd === 'anterior') clicar(...ANT);
  }
  const info = navigator.mediaSession && navigator.mediaSession.metadata;
  const arte = info && info.artwork && info.artwork.length ? info.artwork[info.artwork.length - 1].src : '';
  const og = document.querySelector('meta[property="og:image"]');
  return { temProx: !!m && existe(PROX), temAnt: !!m && existe(ANT), tem: !!m, tocando: !!m && !m.paused && !m.ended, video: !!m && m.tagName === 'VIDEO', repetir: !!m && m.loop, acabou: !!m && m.ended,
    titulo: (info && info.title) || document.title || '', artista: (info && info.artist) || '',
    capa: (m && m.poster) || arte || (og && og.content) || '' };
})()`;

// clique direito em cima de um vídeo: muitos sites (o YouTube, por exemplo) trocam o menu do navegador pelo deles.
// Aqui o vídeo fica com o menu do Oceano; com Shift apertado, passa o do site.
export const JS_MENU_VIDEO = `(() => {
  if (window.__oceanoMenuVideo) return; window.__oceanoMenuVideo = true;
  addEventListener('contextmenu', e => {
    if (e.shiftKey) return;
    if (!document.elementsFromPoint(e.clientX, e.clientY).some(el => el.tagName === 'VIDEO')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    console.debug('oceano:menu-video:' + Math.round(e.clientX) + ',' + Math.round(e.clientY));
  }, true);
})()`;

const idYoutube = url => { try { const u = new URL(url), h = u.hostname.replace(/^(www|m|music)\./, ''); if (h === 'youtu.be') return u.pathname.slice(1, 12); if (h === 'youtube.com') return u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/) || [])[1] || ''; } catch {} return ''; };

export function iniciarMidia(app, guardado) {
  let atual = null, estado = null, capaDe = '', capa = null, relogio = null;
  const fantasmas = new Set();   // abas fechadas que seguem tocando
  const emitir = () => app.emitir?.('midia');
  const rodar = (aba, cmd) => aba?.wv ? aba.wv.executeJavaScript(JS_MIDIA(cmd), true).catch(() => null) : Promise.resolve(null);
  const urlDe = aba => aba.wvUrl || aba.historico?.[aba.pos] || '';

  async function atualizarCapa(aba, e) {
    const yt = idYoutube(urlDe(aba));
    const fonte = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : e?.capa || '';
    if (fonte === capaDe) return;
    capaDe = fonte; capa = null; emitir();
    if (!fonte) return;
    // a imagem vem pela sessão do perfil da aba (a página do app só aceita imagens próprias)
    const dados = /^https?:/.test(fonte) && window.oceanoNativo?.leitorImagem ? await window.oceanoNativo.leitorImagem(aba.particao || 'persist:oceano', fonte).catch(() => null) : fonte;
    if (capaDe === fonte) { capa = dados; emitir(); }
  }
  async function ler() {
    if (!atual) return;
    const aba = atual, e = await rodar(aba, 'estado');
    if (aba !== atual) return;
    estado = e || { tem: false, tocando: !!aba.tocandoMidia, titulo: aba.titulo || '', capa: '' };
    if (!estado.titulo) estado.titulo = aba.titulo || '';
    atualizarCapa(aba, estado);
    // aba fechada que terminou a música: agora pode fechar de verdade
    if (fantasmas.has(aba) && estado.acabou && !estado.repetir) return soltar(aba);
    // a página mudou e não tem mais mídia: o player some
    if (!estado.tem && !aba.tocandoMidia) return soltar(aba);
    emitir();
  }
  const vigiar = () => { clearInterval(relogio); relogio = atual ? setInterval(ler, 1000) : null; };
  function soltar(aba) {
    if (fantasmas.has(aba)) { fantasmas.delete(aba); aba.wv?.remove(); }
    if (aba === atual) { atual = null; estado = null; capa = null; capaDe = ''; vigiar(); }
    emitir();
  }

  app.midia = {
    // eventos da <webview>
    comecou(aba) { if (atual !== aba) { atual = aba; estado = null; capa = null; capaDe = ''; vigiar(); } app.emitir?.('musica-tocou', 'site'); ler(); },
    pausou(aba) { if (aba === atual) ler(); },
    podeDj: () => !!atual && (!!idYoutube(urlDe(atual)) || /instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\//.test(urlDe(atual))),
    atual: () => atual, estado: () => estado, capa: () => capa, url: () => atual ? urlDe(atual) : '',
    async comando(cmd) {
      if (!atual) return;
      if (cmd === 'ver') return app.miniPlayer(atual);
      if (cmd === 'dj') return app.midia.dj();
      await rodar(atual, cmd);
      setTimeout(ler, cmd === 'proximo' || cmd === 'anterior' ? 900 : 60);
    },
    // DJ: o que está tocando vai para o ½ sampler (o link abre na gaveta de vídeo dele, para cortar e tocar por cima)
    dj() {
      const url = urlDe(atual);
      rodar(atual, 'pausar'); app.musica?.paraSampler({ link: url });
    },
    // fechar o player: para a música e some (a aba continua aberta, se ainda existir)
    async fechar() { const a = atual; if (!a) return; await rodar(a, 'pausar'); soltar(a); },
    // fechar a aba: devolve true se ela seguiu tocando escondida
    guardarAoFechar(aba) {
      if (!aba.wv || !aba.tocandoMidia || aba.efemera || !guardado.ler('musica-fechar-aba', false)) { if (aba === atual) soltar(aba); return false; }
      fantasmas.add(aba); aba.wv.classList.add('oculto');
      if (atual !== aba) { atual = aba; vigiar(); ler(); }
      return true;
    },
    // abriu de novo a aba fechada: a cópia escondida para, senão tocam as duas
    pararFantasmas() { for (const a of [...fantasmas]) soltar(a); },
    aoGravarOpcao(v) { if (!v) app.midia.pararFantasmas(); },
  };
  return app.midia;
}
