// O player pequeno da mesa: um CD girando, como num discman, e os botões num retângulo da cor do tema.
// Site nenhum abre este player sozinho: ele só aparece quando a pessoa pede, pelo menu do vídeo. O CD gira com a capa do vídeo (YouTube) ou o pôster da página; ao pausar,
// perde velocidade devagar e, ao tocar, retoma. Arrasta pelo CD (ou setas do teclado com ele em foco) e não sai da mesa.
import { icone } from './icones.js';

const LADO = 72;   // pixels do desenho do CD (mostrado em 2×: rodar em baixa resolução mantém o pixel art)
const GIRO = 1.6;  // voltas: radianos por segundo tocando
const BOTOES = [['anterior', 'anterior', 'Anterior'], ['tocar', 'play', 'Tocar'], ['pausar', 'pausa', 'Pausar'], ['proximo', 'proximo', 'Próxima'],
  ['reiniciar', 'recarregar', 'Do começo'], ['repetir', 'loop', 'Repetir'], ['dj', 'dj', 'DJ: abrir no ½ sampler'], ['ver', 'pip', 'Assistir na janelinha flutuante']];

export function criarPlayerCd(app, guardado, onde) {
  const el = document.createElement('section');
  el.className = 'player-cd'; el.hidden = true; el.setAttribute('aria-label', 'Música tocando');
  el.innerHTML = `<canvas class="pcd-disco" width="${LADO}" height="${LADO}" tabindex="0" role="img" aria-label="CD: arraste para mover"></canvas>
    <p class="pcd-titulo" aria-live="off"><span data-titulo></span></p>
    <div class="pcd-botoes" role="group" aria-label="Controles">${BOTOES.map(([c, i, n]) => `<button type="button" data-cmd="${c}" title="${n}" aria-label="${n}">${icone(i)}</button>`).join('')}<button type="button" class="pcd-fechar" data-cmd="fechar" title="Parar e fechar o player" aria-label="Parar e fechar o player">${icone('fechar')}</button></div>`;
  onde.append(el);
  const disco = el.querySelector('canvas'), ctx = disco.getContext('2d'), titulo = el.querySelector('[data-titulo]');
  const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- lugar: nunca para fora da mesa ----------
  const limitar = (x, y) => {
    const R = onde.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    return [Math.max(0, Math.min(x, R.width - w)), Math.max(0, Math.min(y, R.height - h))];
  };
  let pos = guardado.ler('player-cd-pos', null);
  const posicionar = () => {
    if (el.hidden) return;
    const R = onde.getBoundingClientRect();
    const [x, y] = limitar(pos ? pos[0] : R.width - el.offsetWidth - 24, pos ? pos[1] : R.height - el.offsetHeight - 64);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  };
  addEventListener('resize', posicionar);
  let arraste = null;
  disco.addEventListener('pointerdown', e => {
    if (e.button) return;
    disco.setPointerCapture(e.pointerId);
    arraste = { dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop };
  });
  disco.addEventListener('pointermove', e => {
    if (!arraste) return;
    const [x, y] = limitar(e.clientX - arraste.dx, e.clientY - arraste.dy);
    pos = [x, y]; el.style.left = x + 'px'; el.style.top = y + 'px';
  });
  const soltar = () => { if (arraste) { arraste = null; guardado.gravar('player-cd-pos', pos); } };
  disco.addEventListener('pointerup', soltar); disco.addEventListener('pointercancel', soltar);
  disco.addEventListener('keydown', e => {
    const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key]; if (!d) return;
    e.preventDefault();
    const [x, y] = limitar(el.offsetLeft + d[0], el.offsetTop + d[1]);
    pos = [x, y]; el.style.left = x + 'px'; el.style.top = y + 'px'; guardado.gravar('player-cd-pos', pos);
  });

  // ---------- botões ----------
  el.querySelector('.pcd-botoes').addEventListener('click', e => {
    const b = e.target.closest('[data-cmd]'); if (!b) return;
    if (b.dataset.cmd === 'fechar') app.midia.fechar(); else app.midia.comando(b.dataset.cmd);
  });

  // ---------- o desenho do CD ----------
  let imagem = null, imagemDe = null, angulo = 0, vel = 0, ultimo = performance.now(), raf = 0;
  const cor = n => getComputedStyle(el).getPropertyValue(n).trim();
  // a capa recortada em quadrado, uma vez só: o giro só roda esta imagem
  const base = document.createElement('canvas'); base.width = base.height = LADO;
  function montarBase() {
    const c = base.getContext('2d'); c.clearRect(0, 0, LADO, LADO); c.imageSmoothingEnabled = true;
    if (imagem) { const k = Math.max(LADO / imagem.width, LADO / imagem.height); c.drawImage(imagem, LADO / 2 - imagem.width * k / 2, LADO / 2 - imagem.height * k / 2, imagem.width * k, imagem.height * k); }
    else {  // sem capa: um disco de sulcos na cor do tema
      c.fillStyle = cor('--elevado') || '#16306b'; c.fillRect(0, 0, LADO, LADO);
      c.fillStyle = cor('--acento') || '#5bb6f0';
      for (let a = 0; a < 6; a++) { c.save(); c.translate(LADO / 2, LADO / 2); c.rotate(a * Math.PI / 3); c.fillRect(8, -1, LADO / 2 - 12, 2); c.restore(); }
    }
  }
  // máscara do disco, em pixels: borda, reflexo que não gira e furo do meio
  function desenhar() {
    ctx.clearRect(0, 0, LADO, LADO); ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.translate(LADO / 2, LADO / 2); ctx.rotate(angulo); ctx.drawImage(base, -LADO / 2, -LADO / 2); ctx.restore();
    const im = ctx.getImageData(0, 0, LADO, LADO), d = im.data, c = (LADO - 1) / 2, R = LADO / 2 - 0.5;
    const borda = [...(cor('--fundo') ? hex(cor('--fundo')) : [0, 0, 0])], miolo = hex(cor('--painel') || '#0e1a3d');
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
      const i = (y * LADO + x) * 4, dist = Math.hypot(x - c, y - c);
      if (dist > R) d[i + 3] = 0;
      else if (dist > R - 2) { d[i] = borda[0]; d[i + 1] = borda[1]; d[i + 2] = borda[2]; d[i + 3] = 255; }
      else if (dist < 5) d[i + 3] = 0;                                              // o furo
      else if (dist < 12) { d[i] = miolo[0]; d[i + 1] = miolo[1]; d[i + 2] = miolo[2]; d[i + 3] = 255; }   // o miolo
    }
    ctx.putImageData(im, 0, 0);
  }
  const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : [0, 0, 0]; };
  function quadro(agora) {
    raf = 0;
    if (el.hidden || !el.isConnected) return;
    const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
    const alvo = app.midia?.estado()?.tocando && !reduzido() ? GIRO : 0;
    // tocar: pega velocidade rápido; pausar: perde devagar, suave
    vel += (alvo - vel) * (1 - Math.exp(-dt * (alvo ? 4 : 1.6)));
    if (vel < 0.004 && !alvo) vel = 0;
    angulo = (angulo + vel * dt) % (Math.PI * 2);
    desenhar();
    if (vel > 0 || alvo) raf = requestAnimationFrame(quadro);
  }
  const animar = () => { if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); } };

  function pintar() {
    const m = app.midia, e = m?.estado();
    if (!m?.atual()?.cdPedido) { el.hidden = true; return; }
    const estava = el.hidden; el.hidden = false;
    if (estava) { montarBase(); desenhar(); posicionar(); }
    const t = [e?.artista, e?.titulo].filter(Boolean).join(' - ');
    if (titulo.textContent !== t) { titulo.textContent = t; titulo.title = t; }
    const fonte = m.capa();
    if (fonte !== imagemDe) {
      imagemDe = fonte;
      if (fonte) { const i = new Image(); if (/^https?:/.test(fonte)) i.crossOrigin = 'anonymous'; i.onload = () => { if (imagemDe === fonte) { imagem = i; montarBase(); desenhar(); } }; i.src = fonte; }
      else { imagem = null; montarBase(); desenhar(); }
    }
    const b = c => el.querySelector(`[data-cmd="${c}"]`);
    b('tocar').setAttribute('aria-pressed', !!e?.tocando); b('pausar').setAttribute('aria-pressed', !!e && !e.tocando);
    b('repetir').setAttribute('aria-pressed', !!e?.repetir);
    // só os botões que funcionam aqui: player de outro site embutido não obedece; página simples fica mínima
    const tem = !!e?.tem;
    for (const c of ['tocar', 'pausar', 'reiniciar', 'repetir']) b(c).hidden = !tem;
    b('anterior').hidden = !e?.temAnt; b('proximo').hidden = !e?.temProx;
    b('dj').hidden = !tem || !m.podeDj();
    b('ver').hidden = !tem || !e?.video;
    animar();
  }
  const tirar = app.on('midia', pintar);
  pintar();
  return { el, mostrar() { pintar(); posicionar(); }, descartar() { tirar?.(); el.remove(); }, posicionar };
}
