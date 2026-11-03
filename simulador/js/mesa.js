// A página inicial é uma mesa: o mar com o farol é o papel de parede e por cima ficam os ícones,
// a busca e janelas que você arrasta, recolhe e fecha (Trilha, grupos de abas, widgets).
// A mesa é montada uma vez só e mudada de lugar a cada visita: janelas, vídeo e música seguem do jeito que estavam.
// Cada perfil tem a mesa dele: os grupos de abas e onde cada janela fica (aberta, recolhida, fechada, pixelizar).

import { icone } from './icones.js';
import { desenharWidgetClima } from './clima-widget.js';
import { htmlHora, ligarHora } from './hora-cena.js';
import { criarFundoVideo } from './fundo-video.js';
import { htmlClima, ligarClima } from './clima.js';
import { sensivel } from './sensivel.js';
import { criarPilha } from './discos.js';
import { iniciarCds } from './cds.js';
import { criarPlayerCd } from './player-cd.js';
import { criarIlha } from './ilha/ilha.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// cada janela alterna só entre sólido e médio; sem pixelizar próprio ela segue o das Configurações
const NOME_DITHER = { 0: 'sólido', 50: 'médio', transparente: 'transparente' };
const TOPO = 24;                                              // altura da barra de título

export function criarMesa(app, guardado) {
  const raiz = document.createElement('div');
  raiz.className = 'mesa';
  raiz.innerHTML = `
    <nav class="mesa-icones" aria-label="Atalhos da mesa">
    </nav>
    <div class="mesa-centro">
      <h1 class="marca">${icone('logo', 'marca-icone')}<span>Oceano</span><span class="selo">beta</span></h1>
      <form class="busca px" data-busca>${icone('escudo')}<input name="q" autocomplete="off" placeholder="Pesquise ou digite um endereço" aria-label="Pesquisar ou digitar endereço"></form>
    </div>
    <div class="mesa-janelas"></div>
    <div class="mesa-bandeja" aria-label="Janelas fechadas"></div>`;
  const navIcones = raiz.querySelector('.mesa-icones');
  // mod desligado some da página inicial: volta quando for ligado na tela de mods
  const atalhoDeModDesligado = url => { if (url === 'oceano://gimp') return !app.guardado.ler('mod-gimp', false); const id = /mods\/editar\?id=([^&]+)/.exec(url)?.[1]; return !!id && app.mods?.find(m => m.id === id)?.ligado === false; };
  app.on?.('mods-mudaram', () => pintarIcones());
  const pintarIcones = () => {
    navIcones.innerHTML = app.iconesMesa.lista().filter(x => !x.oculto && !atalhoDeModDesligado(x.url)).map(x => `<a href="#" class="mesa-icone" data-ir="${esc(x.url)}">${icone(x.icone)}<span>${esc(x.nome)}</span></a>`).join('');
  };
  pintarIcones();
  app.iconesMesa.aoMudar(pintarIcones);
  const camada = raiz.querySelector('.mesa-janelas'), bandeja = raiz.querySelector('.mesa-bandeja');
  const fundo = criarFundoVideo(app, guardado, raiz, { aoMudar: () => desenharBandeja() });
  // rolar o mouse no fundo da mesa sobe a câmera do farol até a ilha
  const ilha = criarIlha(app, guardado, raiz);
  app.ilha = ilha;
  // o CD do site que está tocando (só aparece com música tocando)
  const playerCd = criarPlayerCd(app, guardado, raiz);
  // widgets: uma pilha de MiniDiscs no alto à direita; o disco que sobe abre a janela do widget ao lado
  const discos = criarPilha(app, raiz, (id, aberto) => {
    const j = janelas.get('widget:' + id); if (!j) return;
    if (aberto) guardar(j.def.id, { fechada: false, min: false });
    posicionar(j); if (aberto) frente(j);
  }, (id, acao) => {   // CDs de música: tocar no winampFM, parar, ou gravar um novo
    if (acao === 'novo') return cds.dialogo();
    if (acao === 'parar') return cds.parar();
    cds.tocar(id);
  });
  const cds = app.cds || iniciarCds(app, guardado);
  raiz.querySelector('[data-busca]').onsubmit = e => { e.preventDefault(); app.navegar(e.target.q.value); e.target.q.value = ''; };

  // o Pessoal usa a chave de antes dos perfis, assim quem já arrumou a mesa não perde nada
  const chave = p => p === 'pessoal' ? 'mesa' : 'mesa:' + p;
  let perfil = app.perfilAtual(), estado = guardado.ler(chave(perfil), { janelas: {} });
  const salvar = () => guardado.gravar(chave(perfil), estado);
  const janelas = new Map();   // id → { def, el, corpo }
  let z = 10;
  const tam = () => ({ W: camada.clientWidth || 1200, H: camada.clientHeight || 700 });
  const pequena = () => window.innerWidth <= 640;

  function registrar(def) {
    if (janelas.has(def.id)) { janelas.get(def.id).def = def; return janelas.get(def.id); }
    const el = document.createElement('section');
    el.className = 'janela' + (def.classe ? ' ' + def.classe : '');
    el.dataset.janela = def.id;
    el.innerHTML = `
      <header class="jan-topo"><span class="jan-titulo"></span><span class="jan-botoes"></span></header>
      <div class="jan-corpo"></div>
      ${def.auto ? '' : '<span class="jan-alca" aria-hidden="true"></span>'}`;
    const j = { def, el, corpo: el.querySelector('.jan-corpo') };
    if (!estado.janelas[def.id] && def.inicial) estado.janelas[def.id] = { ...def.inicial };
    janelas.set(def.id, j);
    camada.append(el);
    def.montar?.(j.corpo, j);
    desenharTopo(j);
    posicionar(j);
    return j;
  }

  function desenharTopo(j) {
    const { def, el } = j, s = estado.janelas[def.id] || {};
    el.querySelector('.jan-titulo').innerHTML = (def.titulo instanceof Function ? def.titulo() : `${def.icone ? icone(def.icone) : ''}<span>${esc(def.titulo)}</span>`);
    el.querySelector('.jan-botoes').innerHTML = (def.botoes?.() || '')
      + `<button class="jb jb-dither" data-j="dither" title="Pixelizar desta janela: ${NOME_DITHER[ditherDe(s, def)]}">${icone('malha')}</button>`
      + `<button class="jb jb-min" data-j="min" title="${s.min ? 'Abrir' : 'Recolher'}">${icone(s.min ? 'janela' : 'menos')}</button>`
      + (def.empilhavel && s.min ? `<button class="jb jb-min" data-j="empilhar" title="Juntar todos os grupos numa barra só">${icone('menos')}</button>` : '')
      + (def.fechar === false ? '' : `<button class="jb jb-x" data-j="fechar" title="${def.tituloFechar || 'Fechar'}">${icone('fechar')}</button>`);
    el.classList.toggle('recolhida', !!s.min);
    if (s.dither) el.dataset.dither = ditherDe(s, def); else delete el.dataset.dither;   // leve/forte antigos viram médio
  }

  function posicionar(j) {
    const { def, el } = j, s = estado.janelas[def.id] || {}, { W, H } = tam();
    el.hidden = !!s.fechada || (def.visivel && !def.visivel());
    if (pequena()) { el.style.cssText = ''; return; }
    const p = { ...def.posicao(W, H), ...(s.x != null ? { x: s.x, y: s.y } : {}), ...(s.w ? { w: s.w, h: s.h } : {}) };
    p.w = Math.min(p.w ?? 320, W - 8);
    p.x = Math.max(0, Math.min(p.x, W - Math.min(p.w, 120)));
    if (!s.min && p.h) p.y = Math.min(p.y, H - p.h);   // aberta, cabe inteira na tela
    p.y = Math.max(0, Math.min(p.y, H - TOPO));
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    if (!def.auto) { el.style.width = p.w + 'px'; el.style.height = s.min ? '' : (p.h ? p.h + 'px' : ''); }
    if (s.z) el.style.zIndex = s.z; else if (!el.style.zIndex) el.style.zIndex = ++z;   // sem lugar guardado: fica na ordem em que apareceu (não sobe a cada redesenho)
  }

  // transparente, sem fundo nem borda, é só para o que veio com o Oceano: mod de outra pessoa sempre tem fundo, por segurança
  const podeTransparente = def => !def?.deTerceiro?.();
  const ditherDe = (s, def) => (s.dither === 'transparente' && podeTransparente(def) ? 'transparente' : s.dither ? (s.dither === '0' ? '0' : '50') : document.documentElement.dataset.dither === '0' ? '0' : '50');
  function guardar(id, mudancas) { estado.janelas[id] = { ...estado.janelas[id], ...mudancas }; salvar(); }
  function frente(j) { const zz = ++z; j.el.style.zIndex = zz; guardar(j.def.id, { z: zz }); }

  const perfis = () => app.perfis?.length > 1 ? app.perfis : null;

  // ----- telas iniciais: o oceano com farol e a ilha trocam por ícones; o mais leva aos mods da página inicial -----
  const trocaDeHome = () => {
    const naIlha = !!app.ilha?.aberta();
    const b = (qual, ic, nome, on) => `<button class="mesa-chip px home-chip" data-home="${qual}" aria-pressed="${on}" title="${nome}" aria-label="${nome}">${icone(ic)}</button>`;
    return `<span class="home-troca" role="group" aria-label="Telas iniciais">${b('oceano', 'farol', 'Oceano com farol', !naIlha)}${b('ilha', 'ilha', 'Ilha', naIlha)}${fundo.chip()}<button class="mesa-chip px" data-home-mods title="Mods para a página inicial" aria-label="Mods para a página inicial">${icone('mais')}</button></span>`;
  };
  // Ao trocar: "grandes" não mexe nas janelas, "minimizadas" recolhe tudo na ilha, "areas" dá a cada tela as suas janelas
  function aoTrocarHome(qual) {
    const modo = guardado.ler('home-janelas', 'grandes');
    if (modo === 'minimizadas') {
      if (qual === 'ilha') {
        estado.minAntes = Object.fromEntries([...janelas.keys()].map(id => [id, !!estado.janelas[id]?.min]));
        for (const j of janelas.values()) estado.janelas[j.def.id] = { ...estado.janelas[j.def.id], min: true };
      } else if (estado.minAntes) {
        for (const [id, min] of Object.entries(estado.minAntes)) estado.janelas[id] = { ...estado.janelas[id], min };
        delete estado.minAntes;
      }
    } else if (modo === 'areas') {
      const outra = qual === 'ilha' ? 'oceano' : 'ilha';
      estado.areas = { ...estado.areas, [outra]: estado.janelas };
      // a área da ilha começa vazia: as janelas ficam na bandeja para abrir nela
      estado.janelas = estado.areas[qual] || Object.fromEntries([...janelas.keys()].map(id => [id, { ...estado.janelas[id], fechada: true }]));
    }
    salvar();
    for (const j of janelas.values()) { desenharTopo(j); posicionar(j); }
    desenharBandeja();
  }
  const tirarHome = app.on('home', aoTrocarHome);
  function desenharBandeja() {
    const ps = perfis(), p = ps?.find(x => x.id === perfil);
    const fechadas = [...janelas.values()].filter(j => estado.janelas[j.def.id]?.fechada && (!j.def.visivel || j.def.visivel()) && j.def.reabrir !== false);
    bandeja.innerHTML = (ps ? `<button class="mesa-chip px mesa-perfil" data-perfil-mesa style="--perfil: ${esc(p?.cor || 'var(--acento)')}" title="Mesa do perfil ${esc(p?.nome || perfil)} · clique para trocar">${icone('perfil')}${esc(p?.nome || perfil)}</button>` : '')
      + fechadas.map(j => `<button class="mesa-chip px" data-reabrir="${esc(j.def.id)}">${j.def.icone ? icone(j.def.icone) : ''}${esc(j.def.nomeCurto || j.def.titulo)}</button>`).join('')
      + trocaDeHome()
      + `<button class="mesa-chip px" data-hora-chip title="Hora da cena do mar">${icone('sol')}<span data-hora-txt>${app.textoHora(app.mar.hora())}</span></button>`
      + (app.agua ? `<button class="mesa-chip px agua-chip" data-agua title="Copos d'água hoje · clique para anotar">${icone('copo')}${app.agua.copos()}</button>` : '')
      + `<button class="mesa-chip px secundario" data-organizar title="Volta todas as janelas para o lugar de sempre">organizar</button>`;
  }

  // ----- arrastar e redimensionar -----
  let arrasto = null;
  camada.addEventListener('pointerdown', e => {
    const el = e.target.closest('.janela'); if (!el) return;
    const j = janelas.get(el.dataset.janela);
    frente(j);
    if (pequena()) return;
    const alca = e.target.closest('.jan-alca'), topo = e.target.closest('.jan-topo');
    if (!alca && (!topo || e.target.closest('button, input, [contenteditable]'))) return;
    e.preventDefault();
    const r = el.getBoundingClientRect(), base = camada.getBoundingClientRect();
    arrasto = { j, alca: !!alca, dx: e.clientX - r.left, dy: e.clientY - r.top, w0: r.width, h0: r.height, x0: e.clientX, y0: e.clientY, base };
    el.setPointerCapture(e.pointerId);
    el.classList.add(alca ? 'mudando' : 'arrastando');
  });
  camada.addEventListener('pointermove', e => {
    if (!arrasto) return;
    const { j, base } = arrasto, el = j.el, { W, H } = tam();
    if (arrasto.alca) {
      el.style.width = Math.max(140, Math.min(W - el.offsetLeft, arrasto.w0 + e.clientX - arrasto.x0)) + 'px';
      if (!el.classList.contains('recolhida')) el.style.height = Math.max(TOPO + 60, Math.min(H - el.offsetTop, arrasto.h0 + e.clientY - arrasto.y0)) + 'px';
    } else {
      el.style.left = Math.max(0, Math.min(W - 80, e.clientX - base.left - arrasto.dx)) + 'px';
      el.style.top = Math.max(0, Math.min(H - TOPO, e.clientY - base.top - arrasto.dy)) + 'px';
    }
  });
  const soltar = () => {
    if (!arrasto) return;
    const { j } = arrasto, el = j.el;
    el.classList.remove('arrastando', 'mudando');
    guardar(j.def.id, arrasto.alca ? (el.classList.contains('recolhida') ? { w: el.offsetWidth } : { w: el.offsetWidth, h: el.offsetHeight }) : { x: el.offsetLeft, y: el.offsetTop });
    arrasto = null;
  };
  camada.addEventListener('pointerup', soltar);
  camada.addEventListener('pointercancel', soltar);
  camada.addEventListener('dblclick', e => { const topo = e.target.closest('.jan-topo'); if (topo && !e.target.closest('button')) alternarMin(janelas.get(topo.parentElement.dataset.janela)); });

  // volta todas para o lugar padrão (o pixelizado e quem está fechada continuam)
  function organizar() {
    for (const [id, s] of Object.entries(estado.janelas)) estado.janelas[id] = { dither: s.dither, fechada: s.fechada };
    salvar(); for (const j of janelas.values()) { desenharTopo(j); posicionar(j); }
  }

  // ----- grupos: escada de barrinhas ↔ uma barra só -----
  // juntar: as barrinhas deslizam até a primeira e somem; abrir: saem dela e voltam para a escada
  const gruposNaTela = () => [...janelas.values()].filter(j => j.def.empilhavel && !j.el.hidden);
  function lugarDaPilha() { const p = janelas.get('grupos-pilha'); return p ? { x: p.el.offsetLeft, y: p.el.offsetTop } : null; }
  function empilhar() {
    const pilha = janelas.get('grupos-pilha'); if (!pilha) return;
    posicionarEscondida(pilha);
    const alvo = lugarDaPilha();
    for (const j of gruposNaTela()) { j.el.style.left = alvo.x + 'px'; j.el.style.top = alvo.y + 'px'; j.el.classList.add('indo'); }
    setTimeout(() => {
      estado.pilha = true; salvar();
      for (const j of janelas.values()) { j.el.classList.remove('indo'); desenharTopo(j); posicionar(j); }
    }, 320);
  }
  function desempilhar() {
    const alvo = lugarDaPilha();
    estado.pilha = false; salvar();
    for (const j of janelas.values()) {
      if (!j.def.empilhavel) continue;
      guardar(j.def.id, { min: true });
      if (alvo) { j.el.style.transition = 'none'; j.el.style.left = alvo.x + 'px'; j.el.style.top = alvo.y + 'px'; }
    }
    for (const j of janelas.values()) { desenharTopo(j); if (!j.def.empilhavel) posicionar(j); }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const j of janelas.values()) if (j.def.empilhavel) { j.el.style.transition = ''; posicionar(j); }
    }));
    // rAF não roda com a aba escondida: garante o lugar final mesmo assim
    setTimeout(() => { for (const j of janelas.values()) if (j.def.empilhavel) { j.el.style.transition = ''; posicionar(j); } }, 60);
  }
  // a barra única fica onde a primeira barrinha estaria; posiciona mesmo escondida para saber o lugar
  function posicionarEscondida(j) { const h = j.el.hidden; j.el.hidden = false; const { W, H } = tam(); const p = j.def.posicao(W, H); j.el.style.left = p.x + 'px'; j.el.style.top = p.y + 'px'; j.el.style.width = (estado.janelas[j.def.id]?.w || p.w) + 'px'; j.el.hidden = h; }

  function alternarMin(j) { const min = !estado.janelas[j.def.id]?.min; guardar(j.def.id, { min }); desenharTopo(j); if (j.def.empilhavel) { for (const k of janelas.values()) if (k.def.empilhavel) posicionar(k); } else posicionar(j); if (!min) frente(j); }   // aberta vem para a frente das barrinhas

  raiz.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const el = b.closest('.janela'), j = el && janelas.get(el.dataset.janela);
    if (b.dataset.j === 'min') alternarMin(j);
    if (b.dataset.j === 'empilhar') empilhar();
    if (b.dataset.pilha === 'abrir') desempilhar();
    if (b.dataset.j === 'fechar') { if (j.def.aoFechar) return j.def.aoFechar(b); guardar(j.def.id, { fechada: true }); posicionar(j); desenharBandeja(); }
    if (b.dataset.j === 'dither') {
      const ciclo = podeTransparente(j.def) ? ['0', '50', 'transparente'] : ['0', '50'];
      const prox = ciclo[(ciclo.indexOf(ditherDe(estado.janelas[j.def.id] || {}, j.def)) + 1) % ciclo.length];
      guardar(j.def.id, { dither: prox }); desenharTopo(j);
      app.aviso(`Pixelizar de “${j.def.nomeCurto || j.def.titulo}”: ${NOME_DITHER[prox]}.`, 'Mesa');
    }
    if (b.dataset.reabrir) { const r = janelas.get(b.dataset.reabrir); guardar(r.def.id, { fechada: false, min: false }); desenharTopo(r); posicionar(r); frente(r); desenharBandeja(); }
    if (b.dataset.home === 'ilha') app.ilha.abrir();
    if (b.dataset.home === 'oceano') app.ilha.voltar();
    if (b.hasAttribute('data-home-mods')) app.navegar('oceano://mods?lugar=nova-aba');
    if (b.hasAttribute('data-organizar')) organizar();
    if (b.hasAttribute('data-agua')) app.agua.mostrar();
    if (b.hasAttribute('data-perfil-mesa')) menuPerfis(b);
    if (b.hasAttribute('data-hora-chip')) menuHora(b);
  });

  // ----- as janelas da mesa -----

  // Trilha
  registrar({
    id: 'trilha', titulo: 'Trilha', icone: 'som', classe: 'jan-trilha',
    posicao: (W, H) => ({ x: 110, y: Math.max(200, H - 450), w: 430, h: 440 }),
    montar: corpo => app.trilhaNaTela(corpo),
  });

  // winampFM: o player dos CDs da pilha (aparece quando um CD está tocando)
  const jWfm = registrar({
    id: 'winampfm', titulo: 'winampFM', icone: 'disco', classe: 'jan-winampfm', auto: true, reabrir: false,
    visivel: () => !!cds.atual(),
    aoFechar: () => cds.parar(),
    posicao: W => ({ x: W - 560, y: 210, w: 340 }),
    montar: corpo => cds.montarPlayer(corpo),
  });
  cds.definirMesa((id, tocando) => {
    discos.marcarTocando(id);
    if (tocando) guardar('winampfm', { fechada: false, min: false });
    desenharTopo(jWfm); posicionar(jWfm); if (tocando) frente(jWfm);
  });

  // Clima: o mod que começa desligado; o botão troca o tamanho, o outro o fundo
  const jClima = registrar({
    id: 'clima', titulo: 'Clima', icone: 'sol', classe: 'jan-clima', auto: true, fechar: false, reabrir: false,
    visivel: () => app.guardado.ler('mod-clima', false) === true,
    posicao: W => ({ x: Math.max(8, W - 430), y: 70, w: 200 }),
    botoes: () => {
      const s = estado.janelas.clima || {};
      return `<button class="jb jb-acao" data-clima-tamanho aria-pressed="${!!s.medio}" title="${s.medio ? 'Tamanho pequeno' : 'Tamanho médio'}" aria-label="${s.medio ? 'Tamanho pequeno' : 'Tamanho médio'}">${icone(s.medio ? 'menos' : 'mais')}</button><button class="jb jb-acao" data-clima-fundo aria-pressed="${s.dither === 'transparente'}" title="Fundo transparente" aria-label="Fundo transparente">${icone('janela')}</button>`;
    },
    montar: (corpo, j) => {
      const pintar = () => desenharWidgetClima(corpo, app, !!estado.janelas.clima?.medio);
      j.pintarClima = pintar; pintar();
      app.on('clima', () => { pintar(); posicionar(j); });
    },
  });
  jClima.el.addEventListener('click', e => {
    if (e.target.closest('[data-clima-tamanho]')) { guardar('clima', { medio: !estado.janelas.clima?.medio }); jClima.pintarClima(); }
    else if (e.target.closest('[data-clima-fundo]')) guardar('clima', { dither: estado.janelas.clima?.dither === 'transparente' ? undefined : 'transparente' });
    else return;
    desenharTopo(jClima); posicionar(jClima);
  });

  // Navegadora: o avatar flutuando numa janelinha, com a última fala e um campo para pedir algo.
  // É o mesmo avatar da barra lateral (espelhado), então não carrega nada a mais.
  registrar({
    id: 'assistente', titulo: 'Navegadora', icone: 'perfil', classe: 'jan-assistente',
    posicao: (W, H) => ({ x: Math.min(566, W - 620), y: H - 320, w: 232, h: 300 }),   // entre a Trilha e os grupos
    botoes: () => `<button class="jb jb-acao" data-assistente-editar title="Ver e editar o avatar" aria-label="Ver e editar o avatar">${icone('perfil')}</button><button class="jb jb-acao" data-assistente-agente title="Adicionar agente" aria-label="Adicionar agente">${icone('mais')}</button>`,
    montar: corpo => {
      corpo.innerHTML = `<canvas class="as-espelho" width="120" height="120" aria-label="Avatar da Navegadora"></canvas>
        <p class="jas-fala" aria-live="polite">carregando…</p>
        <form class="jas-form"><input autocomplete="off" placeholder="Peça algo" aria-label="Mensagem para a Navegadora"></form>`;
      const tela = corpo.querySelector('canvas'), fala = corpo.querySelector('.jas-fala');
      app.carregarPainel?.('assistente').then(a => {
        if (!a?.espelhar) { fala.textContent = 'Navegadora indisponível'; return; }
        a.espelhar(tela);
        fala.textContent = a.ultimaFala();
      });
      app.on('assistente-fala', ({ quem, texto }) => { fala.textContent = quem === 'voce' ? '…' : texto; fala.classList.toggle('pensando', quem === 'voce'); });
      corpo.querySelector('form').onsubmit = e => { e.preventDefault(); const i = e.target.querySelector('input'); app.assistente?.enviar(i.value); i.value = ''; };
    },
  });
  raiz.addEventListener('click', e => { if (e.target.closest('[data-assistente-editar]')) app.navegar('oceano://avatar'); if (e.target.closest('[data-assistente-agente]')) app.navegar('oceano://ia'); });

  // Grupos de abas: uma janela por grupo, em cascata (descendo para a direita e para baixo)
  function janelasDeGrupos() {
    const lista = app.grupos.lista();
    for (const [id, j] of janelas) if (id.startsWith('grupo:') && !lista.some(g => 'grupo:' + g.id === id)) { j.el.remove(); janelas.delete(id); delete estado.janelas[id]; }
    if (!lista.length && estado.pilha) { estado.pilha = false; salvar(); }
    if (!lista.length) {
      registrar({
        id: 'grupos-vazio', titulo: 'Grupos de abas', icone: 'menu', nomeCurto: 'Grupos',
        visivel: () => !app.grupos.lista().length,
        posicao: (W) => ({ x: W - 292, y: 12 + (widgets() ? 196 : 0), w: 280, h: 170 }),
        montar: corpo => {
          corpo.innerHTML = `<p>Junte abas para voltar a elas depois, cada grupo numa janela.</p>
            <p class="nota-mesa">Clique com o botão direito numa aba → <b>Novo grupo</b>, ou:</p>
            <button class="btn mini" data-agrupar>Agrupar as abas abertas</button>`;
          corpo.querySelector('[data-agrupar]').onclick = () => {
            const abas = app.abas.filter(a => a.historico[a.pos] !== 'oceano://nova-aba');
            if (!abas.length) return app.aviso('Abra algumas abas primeiro: a página inicial não entra no grupo.', 'Grupos');
            app.grupos.criar(abas);
          };
        },
      });
    }
    if (lista.length) registrar({
      id: 'grupos-pilha', titulo: () => `${icone('menu')}<span>Grupos de abas</span><small>${app.grupos.lista().length}</small>`, nomeCurto: 'Grupos',
      classe: 'jan-pilha', reabrir: false, fechar: false, auto: true, inicial: { min: true },
      visivel: () => !!estado.pilha && app.grupos.lista().length > 0,
      botoes: () => `<button class="jb jb-acao" data-pilha="abrir" title="Mostrar os grupos">abrir</button>`,
      posicao: (W) => ({ x: W - 300 - (app.grupos.lista().length - 1) * 26, y: 12 + (widgets() ? 196 : 0), w: 280 }),
    });
    lista.forEach((g, i) => {
      const id = 'grupo:' + g.id;
      const j = registrar({
        id, nomeCurto: g.nome, classe: 'jan-grupo', titulo: () => {
          const abertas = app.grupos.vivas(g).length;
          return `<button class="jan-cor" style="--c: var(--${g.cor})" data-g="cor" title="Trocar a cor"></button>`
            + `<span class="jan-nome" data-g="nome" title="Clique para renomear">${esc(g.nome)}</span>`
            + `<small>${g.abas.length} aba${g.abas.length === 1 ? '' : 's'}${abertas ? ` · ${abertas} aberta${abertas === 1 ? '' : 's'}` : ' · guardado'}</small>`;
        },
        botoes: () => `<button class="jb jb-acao" data-g="abrir" title="Abrir as abas do grupo">abrir</button>`
          + (app.grupos.vivas(g).length ? `<button class="jb jb-acao" data-g="recolher" title="Fecha as abas e guarda o grupo">guardar</button>` : ''),
        tituloFechar: 'Desfazer o grupo (as abas continuam abertas)',
        aoFechar: b => {
          if (b.dataset.certeza) return app.grupos.desfazer(g.id);
          b.dataset.certeza = '1'; b.title = 'Toque de novo para desfazer o grupo';
          app.aviso(`Toque no × de novo para desfazer “${g.nome}”. As abas continuam abertas.`, 'Grupos');
          setTimeout(() => delete b.dataset.certeza, 3000);
        },
        reabrir: false, empilhavel: true, inicial: { min: true },
        visivel: () => !estado.pilha,
        // escada: cada barrinha 26 px para a direita e para baixo, como janelas antigas sobrepostas
        // um grupo aberto empurra as barrinhas de baixo, para não aparecerem através do vidro pixelizado
        posicao: (W) => {
          let y = 12 + (widgets() ? 196 : 0);
          for (const g2 of lista.slice(0, i)) { const s2 = estado.janelas['grupo:' + g2.id] || {}; y += s2.min ? 26 : (s2.h || 196) + 8; }
          return { x: W - 300 - (lista.length - 1) * 26 + i * 26, y, w: 280, h: 196 };
        },
        montar: corpo => corpo.addEventListener('click', e => {
          const linha = e.target.closest('[data-i]'); if (!linha) return;
          const i2 = +linha.dataset.i, aberta = app.grupos.vivas(g)[i2];
          if (e.target.closest('[data-tirar]')) return aberta ? app.grupos.tirar(aberta) : app.grupos.tirarGuardada(g.id, i2);
          app.grupos.abrir(g.id, i2);
        }),
      });
      j.def.grupo = g;
      const abertas = app.grupos.vivas(g);
      j.corpo.innerHTML = g.abas.length ? `<ol class="jan-lista">${g.abas.map((t, k) => `<li data-i="${k}" class="${abertas[k] === app.abaAtiva ? 'ativa' : ''}">
          ${icone(t.url.startsWith('oceano://') ? 'oceano' : 'mundo')}<span><b>${esc(t.titulo)}</b><small>${t.url.startsWith('oceano://') ? esc(t.url) : sensivel(t.url, 'endereço')}</small></span>
          <button class="jb jb-x" data-tirar title="Tirar do grupo">${icone('fechar')}</button></li>`).join('')}</ol>`
        : '<p class="nota-mesa">Grupo vazio.</p>';
      desenharTopo(j);
    });
    for (const j of janelas.values()) posicionar(j);
    desenharBandeja();
  }
  raiz.addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    const j = janelas.get(b.closest('.janela').dataset.janela), g = j?.def.grupo; if (!g) return;
    if (b.dataset.g === 'abrir') app.grupos.abrir(g.id);
    if (b.dataset.g === 'recolher') app.grupos.recolher(g.id);
    if (b.dataset.g === 'cor') app.grupos.trocarCor(g.id);
    if (b.dataset.g === 'nome') {
      b.contentEditable = 'true'; b.focus(); document.getSelection().selectAllChildren(b);
      const fim = ok => { b.contentEditable = 'false'; if (ok) app.grupos.renomear(g.id, b.textContent); else b.textContent = g.nome; };
      b.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); fim(true); } if (ev.key === 'Escape') fim(false); };
      b.onblur = () => fim(true);
    }
  });

  // widgets (mods da página inicial): cada um numa janelinha, no alto à direita
  const modsWidget = () => app.mods.filter(m => m.lugar === 'nova-aba' && m.cart?.temTela && m.ligado !== false);
  const widgets = () => modsWidget().length;
  function janelasDeWidgets() {
    discos.desenhar(modsWidget(), cds.lista());
    modsWidget().forEach((m, i) => registrar({
      id: 'widget:' + m.id, deTerceiro: () => !!m.extra, titulo: m.nome, icone: m.icone || 'cartucho', auto: true, reabrir: false,
      visivel: () => !!m.cart?.temTela && m.ligado !== false && discos.ativo(m.id),
      aoFechar: () => discos.raiz.querySelector(`[data-disco="${m.id}"]`)?.click(),   // fechar a janela devolve o disco à pilha
      posicao: (W) => ({ x: W - 480, y: 16 + i * 150 }),   // ao lado da pilha de discos, sem cobrir o disco que sobe
      montar: corpo => { corpo.innerHTML = `<div class="slot" data-slot="mesa:${esc(m.id)}"></div>`; },
    }));
  }

  // mini slider da hora da cena, em cima do chip de sol
  function menuHora(b) {
    if (raiz.querySelector('.mesa-hora')) return raiz.querySelector('.mesa-hora').fechar();
    const m = document.createElement('div');
    m.className = 'mesa-menu mesa-hora px';
    m.innerHTML = `<p class="rotulo">Hora da cena</p>${htmlHora(app)}<p class="rotulo">Céu e clima</p>${htmlClima(app)}`;
    raiz.append(m);
    const r = b.getBoundingClientRect(), base = raiz.getBoundingClientRect();
    m.style.left = Math.max(8, r.left - base.left - 80) + 'px'; m.style.bottom = base.bottom - r.top + 4 + 'px';
    const desligar = ligarHora(m, app);
    ligarClima(m, app);
    const fora = e => { if (!m.contains(e.target) && !e.target.closest('[data-hora-chip]')) m.fechar(); };
    m.fechar = () => { desligar(); m.remove(); document.removeEventListener('pointerdown', fora); };
    setTimeout(() => document.addEventListener('pointerdown', fora), 0);
  }

  // menu dos perfis, em cima do chip da bandeja
  function menuPerfis(b) {
    raiz.querySelector('.mesa-menu')?.remove();
    const m = document.createElement('div');
    m.className = 'mesa-menu px'; m.setAttribute('role', 'menu');
    m.innerHTML = `<p class="rotulo">Mesa do perfil</p>` + perfis().map(p => `<button role="menuitem" data-ir-perfil="${esc(p.id)}"${p.id === perfil ? ' aria-current="true"' : ''}><i style="background:${esc(p.cor)}"></i>${esc(p.nome)}<small>${app.grupos.lista(p.id).length || ''}</small></button>`).join('');
    raiz.append(m);
    const r = b.getBoundingClientRect(), base = raiz.getBoundingClientRect();
    m.style.left = r.left - base.left + 'px'; m.style.bottom = base.bottom - r.top + 4 + 'px';
    m.onclick = e => { const x = e.target.closest('[data-ir-perfil]'); m.remove(); if (x) app.mudarPerfil(x.dataset.irPerfil); };
    setTimeout(() => document.addEventListener('pointerdown', function fora(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', fora); } }), 0);
  }

  const perfisDaMesa = () => [...new Set(['pessoal', perfil, ...(app.perfis || []).map(p => p.id)])];

  // troca para a mesa de outro perfil: some com as janelas dos grupos de lá e põe cada janela onde ela fica neste
  function usarPerfil(p) {
    if (p === perfil) return;
    perfil = p; estado = guardado.ler(chave(p), { janelas: {} });
    for (const [id, j] of janelas) {
      if (id.startsWith('grupo:') || id === 'grupos-vazio') { j.el.remove(); janelas.delete(id); continue; }
      if (!estado.janelas[id] && j.def.inicial) estado.janelas[id] = { ...j.def.inicial };
      j.el.style.zIndex = '';
    }
    raiz.dataset.perfil = p;
  }

  app.on('hora-cena', () => { const t = bandeja.querySelector('[data-hora-txt]'); if (t) t.textContent = app.textoHora(app.mar.hora()); });
  setInterval(() => { const t = raiz.isConnected && bandeja.querySelector('[data-hora-txt]'); if (t) t.textContent = app.textoHora(app.mar.hora()); }, 30000);
  app.on('cds', () => { if (raiz.isConnected) discos.desenhar(undefined, cds.lista()); });
  app.on('agua', () => { if (raiz.isConnected) desenharBandeja(); });
  for (const ev of ['grupos', 'aba_aberta', 'aba_fechada', 'navegar']) app.on(ev, () => { if (raiz.isConnected) janelasDeGrupos(); });
  window.addEventListener('resize', () => { if (raiz.isConnected) for (const j of janelas.values()) posicionar(j); });

  return {
    raiz,
    // chamada a cada visita da página inicial
    mostrar(lugar) {
      usarPerfil(app.perfilAtual());
      lugar.append(raiz);
      janelasDeWidgets();
      janelasDeGrupos();   // (direto: o tamanho da mesa já existe logo depois de inserida, e rAF não roda em aba escondida)
      for (const j of janelas.values()) { desenharTopo(j); posicionar(j); }
      // a Trilha e o player dos CDs também têm página própria: a cada visita eles voltam para as janelas daqui
      const jt = janelas.get('trilha'); if (jt) app.trilhaNaTela(jt.corpo);
      cds.montarPlayer(jWfm.corpo);
      playerCd.mostrar();
    },
    janelas, organizar,
    // alguma janela (de qualquer perfil) tpixelizado próprio? então a opção global fica desativada
    ditherProprio() {
      return perfisDaMesa().some(p => Object.values((p === perfil ? estado : guardado.ler(chave(p), { janelas: {} })).janelas).some(s => s.dither));
    },
    // a opção global foi escolhida: vale para todas as janelas de todos os perfis
    limparDither() {
      for (const p of perfisDaMesa()) {
        const e = p === perfil ? estado : guardado.ler(chave(p), { janelas: {} });
        for (const s of Object.values(e.janelas)) delete s.dither;
        guardado.gravar(chave(p), e);
      }
      for (const j of janelas.values()) desenharTopo(j);
    },
    // os mods carregam depois da mesa: cada widget ganha a janela dele quando aparece
    atualizarWidgets() { if (!raiz.isConnected) return; janelasDeWidgets(); for (const j of janelas.values()) posicionar(j); },
  };
}
