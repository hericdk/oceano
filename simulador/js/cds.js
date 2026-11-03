// CDs de música na pilha de discos da mesa, tocando num player com a cara do winampFM.
// Um CD é uma música (ou playlist) de outra pessoa: um link do YouTube ou do SoundCloud, ou um arquivo de áudio
// guardado só neste computador. Escolher um CD abre o winampFM tocando: letreiro, tempo, visualizador, botões e a
// lista com os outros CDs. Os vídeos ficam visíveis numa janelinha do player (é a regra do YouTube) e saem pelo
// youtube-nocookie.
//
// Remixar (desligado por padrão): abre ao lado o winampFM de verdade, o firmware do FM-1 rodando em WebAssembly
// (winampfm/), para tocar por cima com o teclado do computador, um teclado MIDI ou um FM-1 no USB.

import { srcFerramenta, sandboxFerramenta, origemFerramenta } from './quadros.js';
import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mmss = s => (s = Math.max(0, s | 0), `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);

// ---------- o que é cada link ----------
export function lerLink(texto) {
  let u; try { u = new URL(texto.trim()); } catch { return null; }
  const h = u.hostname.replace(/^(www|m|music)\./, '');
  if (h === 'youtu.be') return { tipo: 'youtube', ref: u.pathname.slice(1, 12), lista: u.searchParams.get('list') || '' };
  if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/) || [])[1] || '';
    const lista = u.searchParams.get('list') || '';
    if (v || lista) return { tipo: 'youtube', ref: v, lista };
  }
  if (h === 'soundcloud.com' || h === 'on.soundcloud.com') return { tipo: 'soundcloud', ref: u.href };
  if (/^https?:$/.test(u.protocol)) return { tipo: 'link', ref: u.href };
  return null;
}
const urlEmbed = cd => cd.tipo === 'youtube'
  ? `https://www.youtube-nocookie.com/embed/${cd.ref || 'videoseries'}?enablejsapi=1&playsinline=1&rel=0&autoplay=1${cd.lista ? '&list=' + encodeURIComponent(cd.lista) : ''}${/^https?:/.test(location.origin) ? '&origin=' + encodeURIComponent(location.origin) : ''}`
  : `https://w.soundcloud.com/player/?url=${encodeURIComponent(cd.ref)}&auto_play=true&visual=false&show_comments=false&show_teaser=false&color=%230040ff`;

// ---------- arquivos de áudio: guardados no IndexedDB deste navegador ----------
const BANCO = 'oceano-cds';
const banco = () => new Promise((ok, erro) => { const r = indexedDB.open(BANCO, 1); r.onupgradeneeded = () => r.result.createObjectStore('audio'); r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
async function idb(modo, fn) { const db = await banco(); return new Promise((ok, erro) => { const t = db.transaction('audio', modo), req = fn(t.objectStore('audio')); t.oncomplete = () => ok(req?.result); t.onerror = () => erro(t.error); }); }
const guardarAudio = (id, arquivo) => idb('readwrite', s => s.put(arquivo, id));
const lerAudio = id => idb('readonly', s => s.get(id));
const apagarAudio = id => idb('readwrite', s => s.delete(id));

// capa escolhida: reduzida a 96 px (o disco tem 64), guardada junto do CD
function reduzirImagem(arquivo) {
  return new Promise(ok => {
    const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 96; const k = Math.max(96 / im.width, 96 / im.height); cv.getContext('2d').drawImage(im, 48 - im.width * k / 2, 48 - im.height * k / 2, im.width * k, im.height * k); URL.revokeObjectURL(im.src); ok(cv.toDataURL('image/jpeg', .85)); };
    im.onerror = () => ok(null); im.src = URL.createObjectURL(arquivo);
  });
}

export function iniciarCds(app, guardado) {
  let cds = guardado.ler('cds', []);
  const gravar = () => { guardado.gravar('cds', cds); app.emitir?.('cds'); };
  let atual = null, avisarMesa = () => {};

  // ---------- gravar um CD ----------
  function dialogo() {
    document.querySelector('.cd-dialogo')?.remove();
    const d = document.createElement('dialog');
    d.className = 'cd-dialogo px';
    d.innerHTML = `<form method="dialog" class="cd-form">
      <header><b>${icone('disco')} Colocar uma música</b><button class="jb jb-x" value="cancelar" title="Fechar">${icone('fechar')}</button></header>
      <p class="nota">A gente não grava um CD de verdade: o disco é só uma representação. Suba uma música ou cole um link do YouTube, do SoundCloud ou de outra ferramenta de áudio. O Oceano pega a imagem, coloca no formato de CD e deixa tocando de fundo em loop. No futuro vai ter playlist; por enquanto é uma música só.</p>
      <label><span>Link do YouTube, do SoundCloud ou de outra ferramenta de áudio</span><input name="link" type="url" placeholder="https://youtube.com/watch?v=… ou https://soundcloud.com/…" autocomplete="off"></label>
      <p class="cd-ou">ou</p>
      <label class="cd-arquivo"><span>Um arquivo de áudio (mp3, wav, ogg…), guardado só neste computador</span><input name="audio" type="file" accept="audio/*"></label>
      <label><span>Nome da música</span><input name="titulo" maxlength="80" autocomplete="off"></label>
      <label><span>Artista (opcional)</span><input name="artista" maxlength="60" autocomplete="off"></label>
      <label class="cd-arquivo"><span>Capa (opcional; no YouTube vem a miniatura do vídeo)</span><input name="capa" type="file" accept="image/*"></label>
      <p class="nota ruim" data-msg></p>
      <div class="cd-botoes"><button class="btn" value="gravar">colocar para tocar</button></div></form>`;
    document.body.append(d);
    const f = d.querySelector('form'), msg = d.querySelector('[data-msg]');
    // o nome vem sozinho do link (oEmbed do YouTube / SoundCloud), quando der
    f.link.addEventListener('change', async () => {
      const l = lerLink(f.link.value); if (!l || f.titulo.value) return;
      const api = l.tipo === 'youtube' && l.ref ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + l.ref)}`
        : l.tipo === 'soundcloud' ? `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(l.ref)}` : null;
      if (!api) return;
      try { const j = await (await fetch(api)).json(); if (!f.titulo.value) f.titulo.value = j.title || ''; if (!f.artista.value) f.artista.value = j.author_name || ''; } catch {}
    });
    f.audio.addEventListener('change', () => { const a = f.audio.files[0]; if (a && !f.titulo.value) f.titulo.value = a.name.replace(/\.[^.]+$/, ''); });
    f.addEventListener('submit', async e => {
      if (e.submitter?.value !== 'gravar') return;
      e.preventDefault();
      const audio = f.audio.files[0], l = f.link.value.trim() ? lerLink(f.link.value) : null;
      if (!audio && !l) { msg.textContent = 'Cole um link ou escolha um arquivo de áudio.'; return; }
      if (f.link.value.trim() && !l) { msg.textContent = 'Esse link não parece um endereço de site.'; return; }
      const cd = { id: 'cd-' + crypto.randomUUID().slice(0, 8), titulo: f.titulo.value.trim() || (audio ? audio.name : 'Sem nome'), artista: f.artista.value.trim(), criado: Date.now() };
      if (audio) { cd.tipo = 'arquivo'; await guardarAudio(cd.id, audio); } else Object.assign(cd, l);
      if (f.capa.files[0]) cd.capa = await reduzirImagem(f.capa.files[0]);
      cds.unshift(cd); gravar(); d.close(); d.remove();
      app.aviso(`“${cd.titulo}” está tocando em loop.`, 'CDs');
      tocar(cd.id);
    });
    d.addEventListener('close', () => d.remove());
    d.showModal();
  }

  async function apagar(id) {
    const cd = cds.find(c => c.id === id); if (!cd) return;
    if (!confirm(`Tirar o CD “${cd.titulo}” da pilha?`)) return;
    if (atual?.id === id) parar();
    cds = cds.filter(c => c !== cd); gravar();
    if (cd.tipo === 'arquivo') apagarAudio(id).catch(() => {});
  }

  // ---------- o motor (um só, fora da mesa: a música segue tocando em qualquer página) ----------
  // Os vídeos do YouTube e o SoundCloud moram num "palco" preso ao corpo da página, que nunca sai do lugar no DOM
  // (um iframe que muda de lugar recarrega). O palco se encaixa por cima da janelinha do player que estiver na tela;
  // sem player à vista, vira um mini player no canto (o vídeo precisa ficar visível: regra do YouTube).
  let motor = null, remix = guardado.ler('cds-remix', false);
  const vistas = new Set();
  const palco = document.createElement('div');
  palco.className = 'cd-palco px'; palco.hidden = true;
  document.body.append(palco);
  const avisarTodos = () => { for (const v of vistas) v.redesenhar(); app.emitir?.('musica'); };
  function tocar(id) {
    const cd = cds.find(c => c.id === id); if (!cd) return;
    if (cd.tipo === 'link') { app.navegar(cd.ref); return; }   // outros sites (Spotify, Bandcamp…) abrem numa aba
    motor?.parar(); atual = cd;
    // por enquanto cada CD é uma música só, tocando de fundo em loop
    const emLoop = () => { motor?.parar(true); motor?.tocar(); };
    motor = cd.tipo === 'arquivo' ? motorArquivo(cd, emLoop) : motorEmbed(cd, palco, emLoop);
    motor.volume(guardado.ler('cds-volume', 80));
    app.emitir?.('musica-tocou', 'cds');
    avisarMesa(id, true); avisarTodos(); encaixar();
  }
  function parar() { motor?.parar(); motor = null; atual = null; palco.hidden = true; avisarMesa(null, false); avisarTodos(); }
  const vizinho = passo => { if (!atual) return; const i = cds.findIndex(c => c.id === atual.id), prox = cds[(i + passo + cds.length) % cds.length]; if (prox) tocar(prox.id); };
  const comando = a => {
    if (a === 'tocar') { motor?.tocar(); app.emitir?.('musica-tocou', 'cds'); } if (a === 'pausar') motor?.pausar(); if (a === 'parar') motor?.parar(true);
    if (a === 'anterior') vizinho(-1); if (a === 'proximo') vizinho(1);
    if (a === 'alternar') { if (!motor) return; motor.estado().tocando ? motor.pausar() : (motor.tocar(), app.emitir?.('musica-tocou', 'cds')); }
  };

  // o palco segue a janelinha visível (mesa ou página CDs) a cada quadro; sem nenhuma, vai para o canto
  (function encaixe() {
    requestAnimationFrame(encaixe);
    if (!motor?.embed) { if (!palco.hidden) palco.hidden = true; return; }
    encaixar();
  })();
  function encaixar() {
    if (!motor?.embed) return;
    let r = null;
    for (const v of vistas) {
      if (!v.el.isConnected) { vistas.delete(v); continue; }
      const q = v.el.querySelector('[data-fonte]')?.getBoundingClientRect();
      if (q && q.width > 20 && q.height > 20 && !v.el.closest('[hidden], .min')) { r = q; break; }
    }
    const mini = !r, lugar = r || app.musica?.lugarMini?.() || { left: innerWidth - 232, top: innerHeight - 150, width: 216, height: atual?.tipo === 'youtube' ? 122 : 96 };
    palco.hidden = false;
    palco.classList.toggle('mini', mini);
    Object.assign(palco.style, { left: lugar.left + 'px', top: lugar.top + 'px', width: lugar.width + 'px', height: lugar.height + 'px' });
  }

  // ---------- a cara do player (na janela da mesa e na página oceano://cds; as duas mostram o mesmo motor) ----------
  function montarPlayer(el) {
    for (const v of vistas) if (v.el === el) vistas.delete(v);
    const vista = { el, redesenhar: () => desenharPlayer(el, vista) };
    vistas.add(vista); vista.redesenhar();
  }
  function desenharPlayer(el, vista) {
    cancelAnimationFrame(vista.raf);
    if (!atual) { el.innerHTML = el.dataset.vazio || ''; return; }
    const cd = atual, fonte = { youtube: 'YOUTUBE', soundcloud: 'SOUNDCLOUD', arquivo: 'ARQUIVO' }[cd.tipo];
    el.innerHTML = `<div class="wfm">
      <div class="wfm-principal">
        <div class="wfm-lcd">
          <div class="wfm-esq"><span class="wfm-estado" data-estado>▶</span><b class="wfm-tempo" data-tempo>00:00</b><canvas class="wfm-vis" width="76" height="18" data-vis></canvas></div>
          <div class="wfm-dir"><div class="wfm-letreiro"><span data-letreiro>${esc(`${cds.indexOf(cd) + 1}. ${cd.artista ? cd.artista + ' - ' : ''}${cd.titulo}`)} *** </span></div>
            <small class="wfm-info"><span>${fonte}</span><span data-dur>--:--</span><span class="wfm-st">ESTÉREO</span></small></div>
        </div>
        <input class="wfm-posicao" type="range" min="0" max="1000" value="0" aria-label="Posição na música" data-pos>
        <div class="wfm-controles">
          <button class="wfm-b" data-acao="anterior" title="Anterior">⏮</button><button class="wfm-b" data-acao="tocar" title="Tocar">▶</button><button class="wfm-b" data-acao="pausar" title="Pausar">⏸</button><button class="wfm-b" data-acao="parar" title="Parar">⏹</button><button class="wfm-b" data-acao="proximo" title="Próxima">⏭</button>
          <input class="wfm-volume" type="range" min="0" max="100" value="${guardado.ler('cds-volume', 80)}" aria-label="Volume" data-vol>
          <button class="wfm-b wfm-remix ${remix ? 'ligado' : ''}" data-acao="remix" title="Remixar por cima com o FM-1, um teclado MIDI ou o teclado do computador" aria-pressed="${remix}">REMIX</button>
        </div>
        <div class="wfm-ligar"><button class="wfm-b" data-acao="sampler" title="${cd.tipo === 'arquivo' ? 'Põe esta música num pad do ½ sampler' : 'Abre o vídeo na gaveta de YouTube do ½ sampler (precisa do motor)'}">→ ½ SAMPLER</button></div>
      </div>
      <div class="wfm-fonte ${cd.tipo === 'arquivo' ? 'vazia' : cd.tipo === 'youtube' ? 'yt' : 'sc'}" data-fonte></div>
      <ol class="wfm-lista">${cds.map((c, i) => `<li class="${c.id === cd.id ? 'atual' : ''}"><button data-tocar="${esc(c.id)}"><span>${i + 1}. ${esc(c.titulo)}</span><small>${esc(c.artista || '')}</small></button><button class="wfm-tirar" data-tirar="${esc(c.id)}" title="Tirar da pilha">${icone('fechar')}</button></li>`).join('')}</ol>
      <div class="wfm-remixar" data-remixar ${remix ? '' : 'hidden'}></div>
    </div>`;
    const $ = s => el.querySelector(s);
    const tempo = $('[data-tempo]'), dur = $('[data-dur]'), pos = $('[data-pos]'), estado = $('[data-estado]'), vol = $('[data-vol]'), vis = $('[data-vis]');
    let arrastando = false;
    pos.addEventListener('pointerdown', () => { arrastando = true; });
    pos.addEventListener('change', () => { arrastando = false; motor?.ir(pos.value / 1000); });
    vol.addEventListener('input', () => { motor?.volume(+vol.value); guardado.gravar('cds-volume', +vol.value); });
    const passo = agora => {
      if (!el.isConnected) { vistas.delete(vista); return; }
      vista.raf = requestAnimationFrame(passo);
      if (!motor) return;
      const { t, d, tocando } = motor.estado();
      tempo.textContent = mmss(t); dur.textContent = d ? mmss(d) : '--:--';
      if (!arrastando && d) pos.value = Math.round(t / d * 1000);
      estado.textContent = tocando ? '▶' : '❚❚';
      desenharVis(vis, i => motor.nivel(i, agora));
    };
    vista.raf = requestAnimationFrame(passo);
    el.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tocar) return tocar(b.dataset.tocar);
      if (b.dataset.tirar) return apagar(b.dataset.tirar);
      const a = b.dataset.acao;
      if (a === 'remix') { remix = !remix; guardado.gravar('cds-remix', remix); b.classList.toggle('ligado', remix); b.setAttribute('aria-pressed', remix); montarRemix(el); return; }
      if (a === 'sampler') return paraSampler(cd);
      comando(a);
    };
    montarRemix(el);
  }

  // um CD vai para o ½ sampler: o arquivo vira um pad; o link do YouTube abre na gaveta de vídeo dele
  async function paraSampler(cd) {
    if (!app.musica) return;
    if (cd.tipo === 'arquivo') { const blob = await lerAudio(cd.id); if (blob) app.musica.paraSampler({ blob, nome: cd.titulo }); }
    else if (cd.tipo === 'youtube' && cd.ref) { motor?.pausar(); app.musica.paraSampler({ link: 'https://www.youtube.com/watch?v=' + cd.ref }); }
    else app.aviso('Do SoundCloud não dá para tirar o som. Use um arquivo ou um link do YouTube.', 'CDs');
  }
  // um som pronto (gravação da Trilha, do sampler, do Stave) vira CD
  async function gravarSom(blob, titulo, artista = '') {
    const cd = { id: 'cd-' + crypto.randomUUID().slice(0, 8), tipo: 'arquivo', titulo: titulo || 'Sem nome', artista, criado: Date.now() };
    await guardarAudio(cd.id, blob);
    cds.unshift(cd); gravar();
    app.aviso(`“${cd.titulo}” entrou na pilha de CDs.`, 'CDs');
    return cd;
  }

  // ---------- remixar com o winampFM de verdade (firmware do FM-1) ----------
  function montarRemix(el) {
    const caixa = el?.querySelector('[data-remixar]'); if (!caixa) return;
    caixa.hidden = !remix;
    if (!remix) { caixa.innerHTML = ''; return; }
    if (caixa.firstChild) return;
    caixa.innerHTML = `<p class="wfm-dica">Toque por cima: clique no FM-1 para ligar o som, depois use as teclas <kbd>1</kbd>…<kbd>0</kbd> do computador, ou ligue um teclado MIDI ou um FM-1 no USB.</p>
      <div class="wfm-entradas"><button class="btn mini secundario" data-midi>${icone('teclado')} usar teclado MIDI / FM-1</button><span class="nota" data-midi-msg></span></div>
      <iframe class="wfm-fm1" src="${srcFerramenta(app, 'winampfm', 'index.html?remix')}" title="winampFM no FM-1 (simulador)" allow="midi; autoplay" ${sandboxFerramenta(app)}></iframe>`;
    const fr = caixa.querySelector('iframe');
    caixa.querySelector('[data-midi]').onclick = async () => {
      const m = caixa.querySelector('[data-midi-msg]');
      const fala = n => { m.textContent = n ? `${n} entrada${n > 1 ? 's' : ''} MIDI ligada${n > 1 ? 's' : ''}.` : 'Nenhum teclado MIDI encontrado. Ligue um e clique de novo.'; };
      if (app.real) {   // o winampFM tem origem própria: o pedido vai por mensagem
        const volta = e => { if (e.source !== fr.contentWindow || e.origin !== 'oceano-ui://winampfm') return; removeEventListener('message', volta); if (e.data?.wfm === 'midi-ok') fala(e.data.n); else m.textContent = 'MIDI não funcionou aqui: ' + e.data?.erro; };
        addEventListener('message', volta);
        fr.contentWindow.postMessage({ wfm: 'midi' }, 'oceano-ui://winampfm');
        return;
      }
      try { const W = fr.contentWindow.FM1W; if (!W.on) await W.start?.(); const n = await W.midiOn(); m.textContent = n ? `${n} entrada${n > 1 ? 's' : ''} MIDI ligada${n > 1 ? 's' : ''}.` : 'Nenhum teclado MIDI encontrado. Ligue um e clique de novo.'; }
      catch (e) { m.textContent = 'MIDI não funcionou aqui: ' + (e.message || e); }
    };
  }

  function definirMesa(fn) { avisarMesa = fn; }
  app.cds = { lista: () => cds, tocar, parar, dialogo, montarPlayer, definirMesa, atual: () => atual, apagar, comando, gravarSom, paraSampler,
    estado: () => motor ? { ...motor.estado(), cd: atual } : null };
  return app.cds;
}

// ---------- motores: arquivo (áudio do navegador, visualizador de verdade) ----------
function motorArquivo(cd, fim) {
  const audio = new Audio(); audio.preload = 'auto';
  let ctx = null, an = null, url = null;
  lerAudio(cd.id).then(blob => { if (!blob) return; url = URL.createObjectURL(blob); audio.src = url; audio.play().catch(() => {}); });
  const ligarVis = () => {
    if (ctx) return;
    try { ctx = new AudioContext(); const src = ctx.createMediaElementSource(audio); an = ctx.createAnalyser(); an.fftSize = 128; src.connect(an); an.connect(ctx.destination); } catch {}
  };
  audio.addEventListener('play', () => { ligarVis(); ctx?.resume(); });
  audio.addEventListener('ended', fim);
  const buf = new Uint8Array(64); let lido = -1;
  return {
    embed: false,
    estado: () => ({ t: audio.currentTime, d: audio.duration || 0, tocando: !audio.paused }),
    nivel(i, agora) { if (!an) return 0; if (agora !== lido) { an.getByteFrequencyData(buf); lido = agora; } return buf[2 + i * 1.5 | 0] / 255; },
    tocar: () => audio.play().catch(() => {}), pausar: () => audio.pause(),
    parar(soPara) { audio.pause(); audio.currentTime = 0; if (!soPara) { audio.src = ''; if (url) URL.revokeObjectURL(url); ctx?.close(); } },
    ir: f => { if (audio.duration) audio.currentTime = f * audio.duration; },
    volume: v => { audio.volume = v / 100; },
  };
}

// ---------- motores: YouTube e SoundCloud (janelinha do próprio site no palco, comandos por postMessage) ----------
function motorEmbed(cd, palco, fim) {
  const yt = cd.tipo === 'youtube';
  palco.innerHTML = `<iframe class="wfm-embed" src="${esc(urlEmbed(cd))}" title="${esc(cd.titulo)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  palco.classList.toggle('sc', !yt);
  const fr = palco.querySelector('iframe'), alvo = yt ? 'https://www.youtube-nocookie.com' : 'https://w.soundcloud.com';
  let t = 0, d = 0, tocando = false, ultimo = performance.now(), vivo = true;
  const enviar = msg => fr.contentWindow?.postMessage(JSON.stringify(msg), alvo);
  const cmd = (func, args = []) => yt ? enviar({ event: 'command', func, args }) : enviar({ method: func, value: args[0] });
  fr.addEventListener('load', () => {
    if (yt) enviar({ event: 'listening', id: 1, channel: 'widget' });
    else for (const ev of ['playProgress', 'play', 'pause', 'finish', 'ready']) enviar({ method: 'addEventListener', value: ev });
  });
  const ouvir = e => {
    if (e.source !== fr.contentWindow) return;
    let m; try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (yt && m?.info) {
      if (m.info.currentTime != null) t = m.info.currentTime;
      if (m.info.duration) d = m.info.duration;
      if (m.info.playerState != null) { tocando = m.info.playerState === 1; if (m.info.playerState === 0) fim(); }
    }
    if (!yt && m?.method) {
      if (m.method === 'playProgress' && m.value) { t = m.value.currentPosition / 1000; if (m.value.relativePosition > 0) d = t / m.value.relativePosition; tocando = true; }
      if (m.method === 'play') tocando = true; if (m.method === 'pause') tocando = false; if (m.method === 'finish') { tocando = false; fim(); }
      if (m.method === 'ready') for (const ev of ['playProgress', 'play', 'pause', 'finish']) enviar({ method: 'addEventListener', value: ev });
    }
  };
  addEventListener('message', ouvir);
  // o relógio anda sozinho entre um aviso e outro do player
  (function relogio(agora) { if (!vivo) return; if (tocando) t += (agora - ultimo) / 1000; ultimo = agora; requestAnimationFrame(relogio); })(performance.now());
  return {
    embed: true,
    estado: () => ({ t, d, tocando }),
    // o som de um site não pode ser lido daqui: o visualizador dança no ritmo do tempo, só enquanto toca
    nivel: (i, agora) => tocando ? (Math.sin(agora / 140 + i * 1.7) * .3 + Math.sin(agora / 63 + i * .6) * .2 + .45) * (1 - i / 40) : 0,
    tocar: () => cmd(yt ? 'playVideo' : 'play'), pausar: () => cmd(yt ? 'pauseVideo' : 'pause'),
    parar(soPara) {
      if (soPara) { cmd(yt ? 'stopVideo' : 'pause'); if (!yt) cmd('seekTo', [0]); t = 0; tocando = false; return; }
      vivo = false; removeEventListener('message', ouvir); fr.remove();
    },
    ir: f => { if (d) cmd('seekTo', yt ? [f * d, true] : [f * d * 1000]); },
    volume: v => cmd('setVolume', [v]),
  };
}

// barras do visualizador em pixels, nas cores do tema
function desenharVis(cv, nivel) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, st = getComputedStyle(cv);
  c.clearRect(0, 0, W, H);
  const a = st.getPropertyValue('--sol').trim() || '#ffd34d', b = st.getPropertyValue('--acento').trim() || '#4da3ff';
  for (let i = 0; i < 19; i++) {
    const h = Math.max(0, Math.min(1, nivel(i))) * H | 0;
    for (let y = 0; y < h; y += 2) { c.fillStyle = y > H * .6 ? a : b; c.fillRect(i * 4, H - 1 - y, 3, 1); }
  }
}
