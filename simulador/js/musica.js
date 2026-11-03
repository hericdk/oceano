// Música unificada: Trilha, CDs (winampFM), Stave e ½ sampler viram um sistema só.
//  - Quatro telas em fila (oceano://trilha, oceano://cds, oceano://stave, oceano://sampler), com abas no alto de cada
//    uma, atalhos (⌥⇧1…4, ⌥⇧M para a próxima) e uma transição em slide com linhas de movimento em pixel.
//  - O botão de nota na barra de cima mostra o que está tocando (CD ou Trilha), leva para as telas e guarda a
//    "caixa de sons": o que cada ferramenta grava chega aqui e pode virar CD, ir para um pad do sampler ou ser baixado.
//  - A Trilha e os CDs são a música de fundo: começar um pausa o outro. Os dois seguem tocando em qualquer página.

import { srcFerramenta, sandboxFerramenta, origemFerramenta } from './quadros.js';
import { icone } from './icones.js';

export const TELAS = [
  { id: 'trilha', url: 'oceano://trilha', nome: 'Trilha', icone: 'som', dica: 'a viagem sem fim, feita com os sons do sampler' },
  { id: 'cds', url: 'oceano://cds', nome: 'CDs', icone: 'disco', dica: 'uma música em formato de CD, em loop' },
  { id: 'stave', url: 'oceano://stave', nome: 'Stave', icone: 'stave', dica: 'música em código (Strudel)' },
  { id: 'sampler', url: 'oceano://sampler', nome: '½ sampler', icone: 'sampler', dica: 'pads, fatias, efeitos e faixas' },
];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tamanho = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function iniciarMusica(app) {
  const telaAtual = () => TELAS.find(t => t.id === rotaPagina())?.id || null;
  const rotaPagina = () => { const u = app.url(); return u.startsWith('oceano://') ? u.slice(9).split(/[/?#]/)[0] : ''; };

  // ---------- trocar de tela com a transição ----------
  let trocando = false;
  async function ir(id) {
    const destino = TELAS.find(t => t.id === id); if (!destino || trocando) return;
    const de = TELAS.findIndex(t => t.id === telaAtual()), para = TELAS.indexOf(destino);
    if (de === para) return;
    const lado = de < 0 ? 1 : Math.sign(para - de);
    fecharMenu();
    if (semMovimento()) return app.navegar(destino.url);
    trocando = true;
    try { await transicao(lado, () => app.navegar(destino.url)); } finally { trocando = false; }
  }
  const proxima = (passo = 1) => { const i = TELAS.findIndex(t => t.id === telaAtual()); ir(TELAS[(i + passo + TELAS.length) % TELAS.length].id); };

  // a página sai deslizando para o lado (expo-out: começo rápido e esticado, fim suave), riscada por linhas de pixel
  // que correm junto; a nova aparece por baixo das últimas linhas, que somem em degraus
  function transicao(lado, trocar) {
    const pag = document.getElementById('pagina'), r = pag.getBoundingClientRect();
    const cv = document.createElement('canvas'), px = 4;
    cv.className = 'mus-linhas'; cv.width = Math.ceil(r.width / px); cv.height = Math.ceil(r.height / px);
    Object.assign(cv.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.append(cv);
    const c = cv.getContext('2d'), st = getComputedStyle(document.documentElement);
    const cores = [st.getPropertyValue('--texto').trim() || '#fff', st.getPropertyValue('--acento').trim() || '#4da3ff', st.getPropertyValue('--sol').trim() || '#ffd34d'];
    const W = cv.width, H = cv.height;
    const linhas = Array.from({ length: Math.round(H * 0.45) }, () => ({ y: Math.random() * H | 0, x: Math.random() * W * 1.6 - W * 0.3, n: 3 + Math.random() * W * 0.35 | 0, v: 0.6 + Math.random() * 1.6, c: cores[Math.random() * 10 < 7 ? 0 : Math.random() < .6 ? 1 : 2] }));
    const SAI = 320, SOME = 260, t0 = performance.now();
    let trocou = false;
    pag.style.transition = `transform ${SAI}ms cubic-bezier(.16,1,.3,1)`;
    pag.style.transform = `translateX(${-lado * 100}%)`;
    return new Promise(ok => {
      const quadro = agora => {
        const t = agora - t0;
        if (!trocou && t >= SAI) {
          trocou = true; pag.style.transition = 'none'; pag.style.transform = '';
          trocar();
        }
        // depois da troca as linhas vão rareando em degraus (sem opacidade: menos linhas a cada passo)
        const resto = trocou ? Math.max(0, 1 - Math.floor((t - SAI) / SOME * 4) / 4) : 1;
        c.clearRect(0, 0, W, H);
        const k = Math.min(1, t / SAI);
        linhas.forEach((l, i) => {
          if (i / linhas.length > resto) return;
          const x = lado > 0 ? W - (l.x + t * l.v * W / 900) : l.x + t * l.v * W / 900 - l.n;
          const n = Math.max(1, l.n * (0.3 + k));
          c.fillStyle = l.c; c.fillRect(Math.round(x), l.y, Math.round(n), 1);
          if (i % 3 === 0) c.fillRect(Math.round(x + (lado > 0 ? n + 2 : -4)), l.y, 2, 1);   // ponta tracejada
        });
        if (trocou && resto <= 0) { cv.remove(); ok(); return; }
        requestAnimationFrame(quadro);
      };
      requestAnimationFrame(quadro);
    });
  }

  // ---------- abas no alto das telas de música ----------
  function abas(atual) {
    const i = TELAS.findIndex(t => t.id === atual), at = id => app.atalhos?.mostrar(id) || '';
    return `<nav class="mus-abas px" aria-label="Telas de música">
      <button class="mus-seta" data-mus-passo="-1" title="Tela anterior">${icone('voltar')}</button>
      ${TELAS.map((t, j) => `<button class="mus-aba${j === i ? ' atual' : ''}" data-mus-ir="${t.id}" ${j === i ? 'aria-current="page"' : ''} title="${esc(t.dica)}${at('musica-' + t.id) ? ' (' + esc(at('musica-' + t.id)) + ')' : ''}">${icone(t.icone)}<span>${esc(t.nome)}</span></button>`).join('')}
      <button class="mus-seta" data-mus-passo="1" title="Próxima tela${at('musica-proxima') ? ' (' + esc(at('musica-proxima')) + ')' : ''}">${icone('avancar')}</button>
      <span class="mus-tocando" data-mus-tocando></span>
    </nav>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-mus-ir],[data-mus-passo]'); if (!b) return;
    e.preventDefault();
    if (b.dataset.musIr) ir(b.dataset.musIr); else proxima(+b.dataset.musPasso);
  });

  // ---------- o que está tocando ----------
  function tocando() {
    const lista = [];
    const cd = app.cds?.estado?.();
    if (cd) lista.push({ id: 'cds', nome: `${cd.cd.artista ? cd.cd.artista + ' - ' : ''}${cd.cd.titulo}`, tocando: cd.tocando });
    if (app.trilha?.motor?.tocando) lista.push({ id: 'trilha', nome: 'Trilha', tocando: true });
    return lista;
  }
  // a Trilha e os CDs não tocam juntos: o último que começou fica
  app.on('musica-tocou', quem => {
    if (quem === 'cds' && app.trilha?.motor?.tocando) app.trilha.alternar(false);
    if (quem === 'trilha' && app.cds?.estado?.()?.tocando) app.cds.comando('pausar');
    atualizarBotao();
  });
  app.on('musica', () => atualizarBotao());
  setInterval(() => { atualizarBotao(); for (const el of document.querySelectorAll('[data-mus-tocando]')) el.textContent = tocando().map(t => (t.tocando ? '▶ ' : '❚❚ ') + t.nome).join('  ·  '); }, 1000);

  // ---------- caixa de sons ----------
  // o que a Trilha, o sampler ou o Stave gravam fica aqui (só enquanto o Oceano está aberto)
  const caixa = [];
  function receber({ blob, nome, de }) {
    if (!blob || !blob.size) return;
    caixa.unshift({ id: crypto.randomUUID().slice(0, 8), blob, nome: nome || 'som', de: de || 'Oceano', hora: Date.now() });
    caixa.splice(12);
    atualizarBotao(true);
    app.aviso(`Chegou na caixa de sons: “${nome}”. Toque na nota ♪ para virar CD ou ir para o sampler.`, de || 'Música');
    if (menu?.isConnected) desenharMenu();
  }

  // ---------- mandar para o ½ sampler ----------
  let pendente = null;
  function paraSampler(item) {
    pendente = item;
    if (telaAtual() === 'sampler' && entregar()) return;
    ir('sampler');
  }
  let samplerPronto = null;
  const quadroSampler = () => document.querySelector('.sampler-quadro')?.contentWindow || null;
  function entregar() {
    const w = quadroSampler(); if (!w || !pendente || samplerPronto !== w) return false;
    w.postMessage({ oceano: pendente.link ? 'link' : 'pad', ...pendente }, origemFerramenta(app, 'sampler'));
    pendente = null; return true;
  }
  addEventListener('message', e => {
    const w = quadroSampler(); if (!w || e.source !== w || e.origin !== origemFerramenta(app, 'sampler') || !e.data?.oceano) return;
    if (e.data.oceano === 'pronto') { samplerPronto = w; entregar(); }
    if (e.data.oceano === 'som' && e.data.blob instanceof Blob) receber({ blob: e.data.blob, nome: e.data.nome, de: '½ sampler' });
  });

  // ---------- o botão de nota e o menu ----------
  const btn = document.getElementById('btn-musica');
  let menu = null;
  function atualizarBotao(novo) {
    if (!btn) return;
    const t = tocando();
    btn.classList.toggle('tocando', t.some(x => x.tocando));
    if (novo) btn.classList.add('novo');
    btn.title = t.length ? 'Música: ' + t.map(x => x.nome).join(' · ') : 'Música: Trilha, CDs, Stave e ½ sampler';
  }
  function fecharMenu() { menu?.remove(); menu = null; btn?.setAttribute('aria-expanded', 'false'); }
  function abrirMenu() {
    if (menu) return fecharMenu();
    btn.classList.remove('novo');
    menu = document.createElement('div');
    menu.className = 'musica-menu px'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Música');
    document.body.append(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = r.bottom + 6 + 'px'; menu.style.right = Math.max(8, innerWidth - r.right) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    desenharMenu();
    menu.querySelector('button')?.focus();
  }
  function desenharMenu() {
    if (!menu) return;
    const t = tocando(), at = id => app.atalhos?.mostrar(id) || '';
    menu.innerHTML = `
      <p class="rotulo">tocando</p>
      ${t.length ? t.map(x => `<div class="mm-linha"><span class="mm-nome">${x.tocando ? '▶' : '❚❚'} ${esc(x.nome)}</span>
        ${x.id === 'cds' ? `<button class="jb" data-mm="cd-alternar" title="Tocar ou pausar">${x.tocando ? '⏸' : '▶'}</button><button class="jb" data-mm="cd-proximo" title="Próximo CD">⏭</button><button class="jb" data-mm="cd-parar" title="Parar">⏹</button>`
          : `<button class="jb" data-mm="trilha-alternar" title="Pausar a Trilha">⏸</button>`}</div>`).join('')
        : '<p class="nota">Nada tocando. Escolha uma tela abaixo.</p>'}
      <p class="rotulo">telas</p>
      <div class="mm-telas">${TELAS.map(x => `<button data-mus-ir="${x.id}" class="${telaAtual() === x.id ? 'atual' : ''}">${icone(x.icone)}<span>${esc(x.nome)}</span><kbd>${esc(at('musica-' + x.id))}</kbd></button>`).join('')}</div>
      <p class="rotulo">caixa de sons</p>
      ${caixa.length ? `<ul class="mm-caixa">${caixa.map(s => `<li><span><b>${esc(s.nome)}</b><small>${esc(s.de)} · ${tamanho(s.blob.size)}</small></span>
        <button class="jb jb-acao" data-mm-cd="${s.id}" title="Gravar como CD na pilha">virar CD</button>
        <button class="jb jb-acao" data-mm-pad="${s.id}" title="Pôr num pad do ½ sampler">→ sampler</button>
        <button class="jb" data-mm-baixar="${s.id}" title="Baixar">↓</button></li>`).join('')}</ul>`
        : '<p class="nota">O que a Trilha, o sampler e o Stave gravarem chega aqui, para virar CD ou ir para um pad.</p>'}`;
  }
  btn?.addEventListener('click', abrirMenu);
  document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target) && !btn.contains(e.target)) fecharMenu(); });
  document.addEventListener('keydown', e => { if (menu && e.key === 'Escape') { fecharMenu(); btn.focus(); } });
  document.addEventListener('click', async e => {
    if (!menu?.contains(e.target)) return;
    const b = e.target.closest('button'); if (!b) return;
    const s = caixa.find(x => x.id === (b.dataset.mmCd || b.dataset.mmPad || b.dataset.mmBaixar));
    if (b.dataset.mm === 'cd-alternar') app.cds?.comando('alternar');
    if (b.dataset.mm === 'cd-proximo') app.cds?.comando('proximo');
    if (b.dataset.mm === 'cd-parar') app.cds?.parar();
    if (b.dataset.mm === 'trilha-alternar') app.trilha?.alternar(false);
    if (b.dataset.mmCd && s) { await app.cds?.gravarSom(s.blob, s.nome.replace(/\.[^.]+$/, ''), s.de); caixa.splice(caixa.indexOf(s), 1); }
    if (b.dataset.mmPad && s) { fecharMenu(); return paraSampler({ blob: s.blob, nome: s.nome }); }
    if (b.dataset.mmBaixar && s) { const a = document.createElement('a'); a.href = URL.createObjectURL(s.blob); a.download = s.nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    setTimeout(desenharMenu, 50);
  });
  btn && (btn.innerHTML = icone('nota'));

  // lugar do mini player do YouTube quando nenhum player está na tela: canto de baixo, acima das barras das páginas
  const lugarMini = () => ({ left: innerWidth - 232, top: innerHeight - 186, width: 216, height: app.cds?.atual()?.tipo === 'youtube' ? 122 : 96 });

  app.musica = { ir, proxima, abas, receber, paraSampler, tocando, lugarMini, telaAtual };
  return app.musica;
}

// Interceptar o que uma ferramenta em iframe (mesma origem) baixa: se for áudio, uma cópia vai para a caixa de sons.
export function ouvirDownloads(janela, de, receber) {
  try {
    const A = janela.HTMLAnchorElement.prototype, original = A.click;
    if (A.__oceano) return;
    A.__oceano = true;
    A.click = function () {
      const nome = this.download, href = this.href || '';
      if (nome && /^blob:/.test(href) && /\.(wav|mp3|ogg|flac|m4a|aac|opus)$|audio/i.test(nome)) fetch(href).then(r => r.blob()).then(blob => receber({ blob, nome, de })).catch(() => {});
      return original.call(this);
    };
  } catch {}
}
