// Links e caixas que se preenchem em nuvem de pixels: a nuvem nasce onde o mouse entrou e se espalha em manchas.
// Caixa: uma capa igual ao elemento fica por cima, e a máscara decide quais pixels dela aparecem. Texto solto: a mesma nuvem vira uma barrinha embaixo.

const CELULA_CAIXA = 4, CELULA_LINHA = 3, SOBE = 420, DESCE = 280;   // px da célula, ms para preencher e desfazer
const expoOut = k => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const estados = new WeakMap();
const ehLinha = el => el.matches('.brilho-texto, .brilho-item');

function capaDe(el) {
  let capa = el.querySelector(':scope > .brilho-capa');
  if (!capa) {
    capa = document.createElement('span'); capa.className = 'brilho-capa'; capa.setAttribute('aria-hidden', 'true');
    if (!ehLinha(el)) capa.innerHTML = el.innerHTML;
    el.append(capa);
  }
  return capa;
}

// manchas grandes com um pouco de grão: é isso que faz parecer nuvem, e não uma onda
function ruido(cols, lins) {
  const passo = Math.max(3, Math.max(cols, lins) / 3), W = Math.ceil(cols / passo) + 2, H = Math.ceil(lins / passo) + 2;
  const nos = Array.from({ length: W * H }, () => Math.random()), suave = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / passo, fy = y / passo, x0 = Math.floor(fx), y0 = Math.floor(fy), a = suave(fx - x0), b = suave(fy - y0), no = (i, j) => nos[j * W + i];
    return (no(x0, y0) * (1 - a) + no(x0 + 1, y0) * a) * (1 - b) + (no(x0, y0 + 1) * (1 - a) + no(x0 + 1, y0 + 1) * a) * b;
  };
}

// a ordem em que cada célula acende: 55% a distância da entrada do mouse, 45% a nuvem
function prepararNuvem(el, x, y) {
  const linha = ehLinha(el), celula = linha ? CELULA_LINHA : CELULA_CAIXA, r = el.getBoundingClientRect();
  let w = Math.ceil(r.width), h = Math.ceil(r.height);
  if (linha) {
    const faixa = document.createRange(); faixa.selectNodeContents(el);
    const texto = [...faixa.getClientRects()].filter(q => q.width > .5);
    w = Math.ceil(Math.max(...texto.map(q => q.right), r.left) - r.left) || w; h = 2;
    capaDe(el).style.width = `${w}px`;
  }
  const cols = Math.max(1, Math.ceil(w / celula)), lins = linha ? 1 : Math.max(1, Math.ceil(h / celula)), mancha = ruido(cols, lins);
  const ordem = new Float32Array(cols * lins), longe = Math.hypot(Math.max(x, w - x), linha ? 0 : Math.max(y, h - y)) || 1;
  for (let j = 0; j < lins; j++) for (let i = 0; i < cols; i++) {
    const nuvem = mancha(i, j) * .85 + Math.random() * .15, dist = Math.hypot((i + .5) * celula - x, linha ? 0 : (j + .5) * celula - y) / longe;
    ordem[j * cols + i] = dist * .55 + nuvem * .45;
  }
  let mn = Infinity, mx = -Infinity;
  for (const v of ordem) { if (v < mn) mn = v; if (v > mx) mx = v; }
  for (let i = 0; i < ordem.length; i++) ordem[i] = (ordem[i] - mn) / (mx - mn || 1);
  return { ordem, cols, lins, w, h, celula };
}

// k vai de 0 (apagado) a 1 (cheio)
export function pintarBrilho(el, x, y, k) {
  const capa = capaDe(el), e = estados.get(el) || {};
  estados.set(el, e);
  if (k <= 0) { capa.style.visibility = 'hidden'; e.nuvem = null; return; }
  capa.style.visibility = 'visible';
  if (k >= 1) { capa.style.webkitMaskImage = capa.style.maskImage = 'none'; return; }
  e.nuvem ||= prepararNuvem(el, x, y);
  const { ordem, cols, lins, w, h, celula } = e.nuvem, dpr = Math.min(2, devicePixelRatio || 1);
  const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d'), lado = Math.ceil(celula * dpr);
  g.fillStyle = '#000';
  for (let j = 0; j < lins; j++) for (let i = 0; i < cols; i++) if (ordem[j * cols + i] <= k) g.fillRect(Math.floor(i * celula * dpr), Math.floor(j * celula * dpr), lado, lado);
  const url = `url(${c.toDataURL()})`;
  capa.style.webkitMaskImage = capa.style.maskImage = url;
  capa.style.webkitMaskSize = capa.style.maskSize = '100% 100%';
}

function animar(el, ponto, acender) {
  const e = estados.get(el) || {};
  estados.set(el, e);
  cancelAnimationFrame(e.raf);
  const de = e.k ?? 0, para = acender ? 1 : 0, DURACAO = acender ? SOBE : DESCE;
  if (acender && de <= 0) e.nuvem = null;   // uma nuvem nova a cada passagem do mouse
  if (quieto()) { e.k = para; pintarBrilho(el, ponto.x, ponto.y, para); return; }
  const inicio = performance.now();
  const quadro = agora => {
    const t = Math.min(1, (agora - inicio) / DURACAO);
    e.k = de + (para - de) * expoOut(t);
    pintarBrilho(el, ponto.x, ponto.y, t >= 1 ? para : e.k);
    if (t < 1) e.raf = requestAnimationFrame(quadro);
  };
  e.raf = requestAnimationFrame(quadro);
}

const pontoDe = (el, ev) => { const r = el.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
const centro = el => { const r = el.getBoundingClientRect(); return { x: r.width / 2, y: r.height / 2 }; };

export function ligarBrilho(raiz) {
  raiz.addEventListener('pointerover', ev => { const el = ev.target.closest?.('.brilho'); if (el && !el.contains(ev.relatedTarget)) animar(el, pontoDe(el, ev), true); });
  raiz.addEventListener('pointerout', ev => { const el = ev.target.closest?.('.brilho'); if (el && !el.contains(ev.relatedTarget)) animar(el, pontoDe(el, ev), false); });
  raiz.addEventListener('focusin', ev => { const el = ev.target.closest?.('.brilho'); if (el?.matches(':focus-visible')) animar(el, centro(el), true); });
  raiz.addEventListener('focusout', ev => { const el = ev.target.closest?.('.brilho'); if (el) animar(el, centro(el), false); });
}

// ---------- botões: a cor de hover de cada um entra em nuvem de pixels, e a menor ganha pixels menores ----------
const CELULA_PEQUENA = 2, ALTURA_GRANDE = 36, SELETOR_BOTAO = 'button, .btn, .chip, .mus-aba';
const botoesAnimados = new WeakMap();
const corVazia = c => !c || c === 'transparent' || /rgba\(.*, 0\)$/.test(c);

function prepararBotao(el, x, y) {
  const r = el.getBoundingClientRect(), celula = r.height >= ALTURA_GRANDE ? CELULA_CAIXA : CELULA_PEQUENA;
  const cols = Math.max(1, Math.ceil(r.width / celula)), lins = Math.max(1, Math.ceil(r.height / celula)), mancha = ruido(cols, lins);
  const ordem = new Float32Array(cols * lins), longe = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) || 1;
  let mn = Infinity, mx = -Infinity;
  for (let j = 0; j < lins; j++) for (let i = 0; i < cols; i++) {
    const v = Math.hypot((i + .5) * celula - x, (j + .5) * celula - y) / longe * .55 + (mancha(i, j) * .85 + Math.random() * .15) * .45;
    ordem[j * cols + i] = v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  for (let i = 0; i < ordem.length; i++) ordem[i] = (ordem[i] - mn) / (mx - mn || 1);
  return { ordem, cols, lins };
}

function pintarBotao(el, e, k) {
  if (k <= 0) { el.style.backgroundImage = ''; el.style.backgroundColor = ''; el.style.color = ''; el.style.borderColor = ''; return; }
  const { ordem, cols, lins } = e.nuvem;
  const c = document.createElement('canvas'); c.width = cols; c.height = lins;
  const g = c.getContext('2d'); g.fillStyle = e.cor;
  for (let j = 0; j < lins; j++) for (let i = 0; i < cols; i++) if (ordem[j * cols + i] <= k) g.fillRect(i, j, 1, 1);
  el.style.backgroundColor = e.base;
  el.style.backgroundImage = `url(${c.toDataURL()})`;
  el.style.backgroundSize = '100% 100%';
  el.style.imageRendering = 'pixelated';
  el.style.color = k > .5 ? e.texto : e.textoBase;
}

function animarBotao(el, ponto, acender) {
  let e = botoesAnimados.get(el);
  if (!e) return;
  cancelAnimationFrame(e.raf);
  const de = e.k ?? 0, para = acender ? 1 : 0, duracao = acender ? SOBE : DESCE, inicio = performance.now();
  if (acender && de <= 0) e.nuvem = prepararBotao(el, ponto.x, ponto.y);
  const quadro = agora => {
    const t = Math.min(1, (agora - inicio) / duracao);
    e.k = de + (para - de) * expoOut(t);
    pintarBotao(el, e, t >= 1 ? para : e.k);
    if (t < 1) e.raf = requestAnimationFrame(quadro);
  };
  e.raf = requestAnimationFrame(quadro);
}

export function ligarNuvemNosBotoes(raiz) {
  const guardarBase = el => {
    if (botoesAnimados.has(el) || el.matches('.brilho, :disabled')) return;
    botoesAnimados.set(el, { k: 0 });
    el.classList.add('nuvem-botao');
  };
  const varrer = () => raiz.querySelectorAll(SELETOR_BOTAO).forEach(guardarBase);
  varrer();
  const vigia = new MutationObserver(varrer);
  vigia.observe(raiz, { childList: true, subtree: true });
  raiz.addEventListener('pointerover', ev => {
    if (quieto()) return;
    const el = ev.target.closest?.(SELETOR_BOTAO);
    if (!el || el.contains(ev.relatedTarget) || el.disabled) return;
    if (!botoesAnimados.has(el)) guardarBase(el);
    const e = botoesAnimados.get(el); if (!e) return;
    // o estado (selecionado, ligado) pode ter mudado: a cor de repouso vem de uma cópia sem hover, a de hover do próprio botão
    if ((e.k ?? 0) <= 0) {
      const copia = el.cloneNode(false);
      copia.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
      el.after(copia);
      const r = getComputedStyle(copia); e.base = r.backgroundColor; e.textoBase = r.color;
      copia.remove();
      const h = getComputedStyle(el);
      e.cor = h.backgroundColor; e.texto = h.color;
      if (corVazia(e.cor) || e.cor === e.base) { const css = getComputedStyle(document.documentElement); e.cor = css.getPropertyValue('--acento').trim(); e.texto = css.getPropertyValue('--fundo').trim(); }
    }
    animarBotao(el, pontoDe(el, ev), true);
  });
  raiz.addEventListener('pointerout', ev => {
    const el = ev.target.closest?.(SELETOR_BOTAO);
    if (el && !el.contains(ev.relatedTarget) && botoesAnimados.has(el)) animarBotao(el, pontoDe(el, ev), false);
  });
  return () => vigia.disconnect();
}
