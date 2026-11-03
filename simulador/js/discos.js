// Widgets como MiniDiscs em pixel art: cada widget é um disquinho numa caixa de plástico transparente
// (trava de metal na lateral, parafusos, o disco com a arte de capa, etiqueta, adesivos), desenhado num canvas
// pequeno e reduzido às cores do tema pixelizado (Bayer 4×4). Os discos ficam numa pilha em 3D; clicar num
// faz ele subir da pilha e abre o widget ao lado. Cada disco é diferente: a arte vem do widget e o resto é
// sorteado com uma semente fixa (o mesmo widget sempre ganha o mesmo disco).

import { icone } from './icones.js';

const L = 64;                                   // lado do disco em pixels (ampliado por CSS, sem suavizar)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function semente(txt) { let h = 2166136261; for (const c of txt) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mistura = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const css = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;

// fonte de 3×5 para etiquetas (letras sem acento, números e um pouco de pontuação)
const FONTE = {
  A: '010101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111101101101', N: '110101101101101', O: '111101101101111', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101101111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  '-': '000000111000000', '.': '000000000000010', '!': '010010010000010', ' ': '000000000000000',
};
const semAcento = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
function texto(ctx, s, x, y, cor) {
  ctx.fillStyle = cor;
  for (const ch of semAcento(s)) { const g = FONTE[ch] || FONTE[' ']; for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(x + (i % 3), y + ((i / 3) | 0), 1, 1); x += 4; }
}

// a arte de capa de cada widget (o resto do disco é sorteado)
const ARTES = {
  ondas(ctx, c, r, cx, cy, R) {          // faixas de ondas e um sol baixo (Relógio de Maré)
    for (let y = cy - R; y < cy + R; y++) { const t = (y - cy + R) / (2 * R); ctx.fillStyle = css(mistura(c.ceu, c.mar, t)); ctx.fillRect(cx - R, y, 2 * R, 1); }
    ctx.fillStyle = css(c.luz); ctx.beginPath(); ctx.arc(cx + R * .35, cy - R * .15, R * .28, 0, 7); ctx.fill();
    for (let k = 0; k < 5; k++) { ctx.fillStyle = css(mistura(c.mar, c.luz, .35 - k * .06)); for (let x = cx - R; x < cx + R; x += 2) ctx.fillRect(x, cy + R * .15 + k * 5 + Math.round(Math.sin(x / 3 + k) * 1.2), 2, 1); }
  },
  bolhas(ctx, c, r, cx, cy, R) {         // fundo do mar com bolhas (Bolhas)
    const g = ctx.createRadialGradient(cx, cy - R * .3, 2, cx, cy, R); g.addColorStop(0, css(c.mar)); g.addColorStop(1, css(c.fundo)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.strokeStyle = css(c.luz); ctx.lineWidth = 1;
    for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(cx - R + r() * 2 * R, cy - R + r() * 2 * R, 1.5 + r() * 4, 0, 7); ctx.stroke(); }
  },
  raios(ctx, c, r, cx, cy, R) {          // disco dourado com raios e traços (como o disco da Voyager)
    const g = ctx.createRadialGradient(cx - R * .3, cy - R * .3, 2, cx, cy, R); g.addColorStop(0, css(c.luz)); g.addColorStop(1, css(c.ceu)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.strokeStyle = css(mistura(c.luz, [255, 255, 255], .4));
    const px = cx + R * .35, py = cy - R * .35;
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + r(); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * R * (.3 + r() * .5), py + Math.sin(a) * R * (.3 + r() * .5)); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R * .8, cy + R * .45); for (let x = 0; x < R * 1.2; x += 2) ctx.lineTo(cx - R * .8 + x, cy + R * .45 - (r() * 5 | 0)); ctx.stroke();
  },
  estrada(ctx, c, r, cx, cy, R) {        // céu de tempestade e uma estrada em perspectiva
    for (let y = cy - R; y < cy; y++) { ctx.fillStyle = css(mistura(c.ceu, c.luz, (y - cy + R) / R * .7)); ctx.fillRect(cx - R, y, 2 * R, 1); }
    ctx.fillStyle = css(c.fundo); ctx.fillRect(cx - R, cy, 2 * R, R);
    ctx.fillStyle = css(c.mar); ctx.beginPath(); ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx + R * .6, cy + R); ctx.lineTo(cx - R * .6, cy + R); ctx.fill();
    ctx.fillStyle = css(c.luz); for (let y = cy + 2; y < cy + R; y += 4) ctx.fillRect(cx, y, 1, 2);
  },
  listras(ctx, c, r, cx, cy, R) {        // listras diagonais coloridas, cara de capa de revista
    for (let k = -2 * R; k < 2 * R; k += 6) { ctx.fillStyle = css([c.ceu, c.mar, c.luz][((((k / 6) | 0) % 3) + 3) % 3]); ctx.beginPath(); ctx.moveTo(cx - R + k, cy - R); ctx.lineTo(cx - R + k + 6, cy - R); ctx.lineTo(cx - R + k + 6 + 2 * R, cy + R); ctx.lineTo(cx - R + k + 2 * R, cy + R); ctx.fill(); }
  },
  aneis(ctx, c, r, cx, cy, R) {          // anéis concêntricos, como a face gravada de um disco
    for (let k = R; k > 0; k -= 3) { ctx.fillStyle = css(mistura(c.ceu, c.mar, (k / R + r() * .2) % 1)); ctx.beginPath(); ctx.arc(cx, cy, k, 0, 7); ctx.fill(); }
  },
  pixel(ctx, c, r, cx, cy, R) {          // grade de quadradinhos, capa de jogo antigo
    for (let y = cy - R; y < cy + R; y += 4) for (let x = cx - R; x < cx + R; x += 4) { ctx.fillStyle = css([c.ceu, c.mar, c.luz, c.fundo][(r() * 4) | 0]); ctx.fillRect(x, y, 4, 4); }
  },
  montanha(ctx, c, r, cx, cy, R) {       // montanhas e uma lua grande
    ctx.fillStyle = css(c.ceu); ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.fillStyle = css(c.luz); ctx.beginPath(); ctx.arc(cx - R * .3, cy - R * .35, R * .3, 0, 7); ctx.fill();
    for (const [cor, alt] of [[c.mar, .1], [c.fundo, .45]]) { ctx.fillStyle = css(cor); ctx.beginPath(); ctx.moveTo(cx - R, cy + R); let x = cx - R; while (x <= cx + R) { ctx.lineTo(x, cy + R * alt - r() * R * .5); x += 5 + r() * 6; } ctx.lineTo(cx + R, cy + R); ctx.fill(); }
  },
};
const ARTE_DO_WIDGET = { 'relogio-mare': 'ondas', bolhas: 'bolhas' };

// Cada disco sorteia (com a semente do id) o casco, a trava, a etiqueta e os detalhes, a partir das referências de
// MiniDisc: casco transparente, colorido translúcido, sólido ou fosco; trava de metal escovado, com janela, pintada
// ou larga; etiqueta MD 74, título escrito, faixa lateral, preço, código de barras ou estrela; seta de inserção e
// trava de gravação. Um CD de música pode trazer a capa (miniatura do vídeo ou imagem escolhida).
const um = (r, lista) => lista[(r() * lista.length) | 0];
export function desenharDisco(canvas, item, paletaHex, capa = null) {
  canvas.width = canvas.height = L;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const r = semente(item.id), pal = paletaHex.map(rgb);
  const pega = () => pal[(r() * pal.length) | 0];
  const claro = pal.reduce((a, b) => (b[0] + b[1] + b[2] > a[0] + a[1] + a[2] ? b : a)), escuro = pal.reduce((a, b) => (b[0] + b[1] + b[2] < a[0] + a[1] + a[2] ? b : a));
  const c = { ceu: pega(), mar: pega(), luz: mistura(pega(), claro, .5), fundo: escuro };
  const v = {
    casco: um(r, ['transparente', 'transparente', 'colorido', 'solido', 'fosco']),
    trava: um(r, ['metal', 'metal', 'janela', 'pintada', 'larga']),
    etiqueta: item.titulo ? um(r, ['titulo', 'titulo', 'lateral']) : um(r, ['md', 'md', 'preco', 'codigo', 'estrela', 'lateral']),
    seta: r() < .7, gravar: r() < .6,
  };
  const corCasco = mistura(pega(), escuro, .2);
  ctx.clearRect(0, 0, L, L);

  // casco
  if (v.casco === 'solido') { ctx.fillStyle = css(corCasco); ctx.fillRect(2, 2, L - 4, L - 4); }
  else if (v.casco === 'colorido') { ctx.fillStyle = css(corCasco); ctx.globalAlpha = .6; ctx.fillRect(2, 2, L - 4, L - 4); ctx.globalAlpha = 1; }
  else if (v.casco === 'fosco') { for (let y = 2; y < L - 2; y++) for (let x = 2; x < L - 2; x++) { ctx.fillStyle = css(mistura(mistura(escuro, claro, .3), claro, r() * .25)); ctx.globalAlpha = .75; ctx.fillRect(x, y, 1, 1); } ctx.globalAlpha = 1; }
  else { ctx.fillStyle = css(mistura(escuro, claro, .12)); ctx.globalAlpha = .55; ctx.fillRect(2, 2, L - 4, L - 4); ctx.globalAlpha = 1; }
  ctx.strokeStyle = css(mistura(claro, escuro, .25)); ctx.strokeRect(2.5, 2.5, L - 5, L - 5);
  ctx.fillStyle = css(claro); ctx.globalAlpha = .5; ctx.fillRect(4, 4, L - 10, 1); ctx.fillRect(4, 4, 1, L - 14); ctx.globalAlpha = 1;
  ctx.fillStyle = css(mistura(claro, escuro, .45));
  for (const [x, y] of [[5, 5], [L - 7, 5], [5, L - 7], [L - 7, L - 7]]) if (r() < .8) ctx.fillRect(x, y, 2, 2);   // parafusos

  // o disco (no casco sólido, só uma janela redonda mostra o disco)
  const cx = L / 2 + 3, cy = L / 2, R = L * (v.casco === 'solido' ? .32 : .38);
  if (v.casco === 'solido') { ctx.fillStyle = css(escuro); ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, 7); ctx.fill(); }
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
  if (capa) {   // capa: preenche o círculo (corta as sobras)
    const k = Math.max(2 * R / capa.naturalWidth, 2 * R / capa.naturalHeight), w = capa.naturalWidth * k, h = capa.naturalHeight * k;
    ctx.drawImage(capa, cx - w / 2, cy - h / 2, w, h);
  } else {
    const nomes = Object.keys(ARTES), arte = ARTE_DO_WIDGET[item.id] || nomes[(r() * nomes.length) | 0];
    ARTES[arte](ctx, c, r, cx, cy, R);
  }
  const b = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); b.addColorStop(.35, 'rgba(255,255,255,0)'); b.addColorStop(.5, 'rgba(255,255,255,.28)'); b.addColorStop(.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = b; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.restore();
  ctx.strokeStyle = css(mistura(claro, escuro, .3)); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  ctx.fillStyle = css(mistura(claro, escuro, .35)); ctx.beginPath(); ctx.arc(cx, cy, R * .3, 0, 7); ctx.fill();
  ctx.fillStyle = css(escuro); ctx.beginPath(); ctx.arc(cx, cy, R * .18, 0, 7); ctx.fill();
  ctx.fillStyle = css(mistura(claro, escuro, .2)); ctx.fillRect(cx - 1, cy - 1, 2, 2);

  // trava na lateral esquerda
  const larga = v.trava === 'larga', tw = larga ? 20 : 15, th = (larga ? 30 : 18) + ((r() * 10) | 0), ty = L / 2 - th / 2 + ((r() * 8) | 0) - 4;
  const corTrava = v.trava === 'pintada' ? c.luz : null;
  for (let y = 0; y < th; y++) { ctx.fillStyle = css(corTrava ? mistura(corTrava, escuro, (y % 4 === 0) * .25) : mistura(claro, escuro, .2 + ((y * 7) % 5) * .05)); ctx.fillRect(4, ty + y, tw, 1); }
  ctx.fillStyle = css(escuro); ctx.fillRect(4, ty - 1, tw, 1);
  if (v.trava === 'janela') { ctx.clearRect(7, ty + 4, tw - 6, th - 8); ctx.strokeStyle = css(escuro); ctx.strokeRect(6.5, ty + 3.5, tw - 5, th - 7); }
  if (larga || v.trava === 'pintada') texto(ctx, 'MD', 6, ty + 3, css(escuro));

  // seta de inserção (canto de cima) e trava de gravação (canto de baixo)
  if (v.seta) { ctx.fillStyle = css(claro); for (let k = 0; k < 4; k++) ctx.fillRect(L - 14 + k, 4 + k, 7 - 2 * k, 1); }
  if (v.gravar) { ctx.fillStyle = css(escuro); ctx.fillRect(6, L - 10, 7, 4); ctx.fillStyle = css(claro); ctx.fillRect(r() < .5 ? 7 : 10, L - 9, 2, 2); }

  // etiqueta
  if (v.etiqueta === 'titulo') {
    const t = semAcento(item.titulo).replace(/[^A-Z0-9 .!-]/g, '').trim(), ex = 22, ey = L - 17, w = L - 26;
    ctx.fillStyle = css(mistura(claro, c.luz, .3)); ctx.fillRect(ex, ey, w, 13);
    texto(ctx, t.slice(0, 9), ex + 2, ey + 2, css(escuro));
    ctx.fillStyle = css(mistura(escuro, c.mar, .4)); for (let x = 0; x < w - 4; x++) if (r() < .7) ctx.fillRect(ex + 2 + x, ey + 9 + (Math.sin(x / 2) > .3 ? 1 : 0), 1, 1);   // assinatura à mão
  } else if (v.etiqueta === 'lateral') {
    ctx.fillStyle = css(c.luz); ctx.fillRect(L - 10, 8, 6, L - 16);
    ctx.fillStyle = css(escuro); for (let y = 11; y < L - 11; y += 3) ctx.fillRect(L - 9 + ((r() * 2) | 0), y, 3 + ((r() * 2) | 0), 1);
  } else if (v.etiqueta === 'md') {
    const ex = L - 26, ey = L / 2 + 2;
    ctx.fillStyle = css(mistura(c.ceu, claro, .25)); ctx.fillRect(ex, ey, 22, 13);
    texto(ctx, 'MD', ex + 2, ey + 2, css(claro)); texto(ctx, ['74', '80', '60'][(r() * 3) | 0], ex + 13, ey + 2, css(claro));
    ctx.fillStyle = css(claro); ctx.fillRect(ex + 2, ey + 9, 18, 1);
  } else if (v.etiqueta === 'preco') {
    ctx.fillStyle = css(c.luz); ctx.fillRect(L - 18, 12, 13, 7); texto(ctx, (r() < .5 ? '9' : '6') + '9', L - 16, 13, css(escuro));
  } else if (v.etiqueta === 'codigo') {
    ctx.fillStyle = css(claro); ctx.fillRect(L - 22, L - 14, 16, 8); ctx.fillStyle = css(escuro); for (let x = 0; x < 14; x++) if (r() < .6) ctx.fillRect(L - 21 + x, L - 13, 1, 6);
  } else {   // estrela
    const sx = L - 16, sy = L - 16, E = ['0001000', '0011100', '1111111', '0111110', '0110110', '1100011'];
    ctx.fillStyle = css(c.luz); E.forEach((l, y) => [...l].forEach((p, x) => { if (p === '1') ctx.fillRect(sx + x, sy + y, 1, 1); }));
  }

  // tudo reduzido às cores do tema, pixelizado
  let img;
  try { img = ctx.getImageData(0, 0, L, L); } catch { return desenharDisco(canvas, item, paletaHex, null); }   // capa de outro site sem permissão de leitura: fica a arte sorteada
  const d = img.data;
  for (let p = 0, i = 0; p < d.length; p += 4, i++) {
    if (d[p + 3] < 40) { d[p + 3] = 0; continue; }
    const ru = (BAYER[((i / L | 0) & 3) * 4 + (i % L & 3)] / 16 - .5) * 44;
    let m = 0, dist = Infinity;
    for (let k = 0; k < pal.length; k++) { const q = pal[k], dr = d[p] + ru - q[0], dg = d[p + 1] + ru - q[1], db = d[p + 2] + ru - q[2], v = dr * dr * .3 + dg * dg * .59 + db * db * .11; if (v < dist) { dist = v; m = k; } }
    d[p] = pal[m][0]; d[p + 1] = pal[m][1]; d[p + 2] = pal[m][2]; d[p + 3] = d[p + 3] < 160 ? 170 : 255;
  }
  ctx.putImageData(img, 0, 0);
}

// a pilha: um disco por widget e um por CD de música, e um disco em branco no topo para gravar um CD novo.
// Widget: clicar sobe o disco (e abre o widget), clicar de novo devolve. CD: clicar sobe o disco e toca no winampFM
// (um CD tocando por vez); clicar no que está tocando devolve e para.
export function criarPilha(app, onde, aoAlternar, aoCd) {
  const pilha = document.createElement('div');
  pilha.className = 'discos';
  pilha.setAttribute('aria-label', 'Widgets e CDs de música');
  onde.append(pilha);
  let ativos = new Set(app.guardado.ler('discos-ativos', [])), tocando = null, ultimo = [[], []];
  const capas = new Map();   // url → Image carregada

  function botao(id, i, titulo, attr) {
    const b = document.createElement('button');
    b.className = 'disco';
    b.style.setProperty('--i', i);
    b.setAttribute(attr, id);
    b.title = titulo;
    return b;
  }
  function desenhar(mods = ultimo[0], cds = ultimo[1]) {
    ultimo = [mods, cds];
    pilha.innerHTML = '';
    let i = 0;
    for (const m of mods) {
      const b = botao(m.id, i++, `${m.nome}: clique para ${ativos.has(m.id) ? 'guardar' : 'abrir'}`, 'data-disco');
      b.classList.toggle('fora', ativos.has(m.id)); b.setAttribute('aria-pressed', ativos.has(m.id));
      const cv = document.createElement('canvas'); desenharDisco(cv, m, app.tema.paleta); b.append(cv);
      const ic = document.createElement('span'); ic.className = 'disco-icone'; ic.innerHTML = icone(m.icone || 'cartucho'); b.append(ic);
      pilha.append(b);
    }
    for (const cd of cds.slice(0, 10)) {
      const b = botao(cd.id, i++, `${cd.titulo}${cd.artista ? ' · ' + cd.artista : ''}: clique para ${tocando === cd.id ? 'parar' : 'tocar no winampFM'}`, 'data-cd');
      b.classList.add('disco-cd'); b.classList.toggle('fora', tocando === cd.id); b.setAttribute('aria-pressed', tocando === cd.id);
      const cv = document.createElement('canvas'); desenharDisco(cv, cd, app.tema.paleta); b.append(cv);
      const url = cd.capa || (cd.tipo === 'youtube' && cd.ref ? `https://i.ytimg.com/vi/${cd.ref}/mqdefault.jpg` : null);
      if (url) {
        const pronta = capas.get(url);
        if (pronta) desenharDisco(cv, cd, app.tema.paleta, pronta);
        else { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { capas.set(url, im); if (cv.isConnected) desenharDisco(cv, cd, app.tema.paleta, im); }; im.src = url; }
      }
      const ic = document.createElement('span'); ic.className = 'disco-icone'; ic.innerHTML = icone('disco'); b.append(ic);
      pilha.append(b);
    }
    const novo = botao('novo', i++, 'Colocar uma música: um arquivo de áudio ou um link (YouTube, SoundCloud), em formato de CD', 'data-cd-novo');
    novo.classList.add('disco-novo');
    const cv = document.createElement('canvas'); desenharDisco(cv, { id: 'cd-virgem', titulo: 'GRAVAR' }, app.tema.paleta); novo.append(cv);
    const ic = document.createElement('span'); ic.className = 'disco-icone'; ic.innerHTML = icone('mais'); novo.append(ic);
    pilha.append(novo);
    pilha.style.setProperty('--n', i);
  }
  pilha.addEventListener('click', e => {
    const n = e.target.closest('[data-cd-novo]'); if (n) return aoCd?.(null, 'novo');
    const c = e.target.closest('[data-cd]');
    if (c) return aoCd?.(c.dataset.cd, tocando === c.dataset.cd ? 'parar' : 'tocar');
    const b = e.target.closest('[data-disco]'); if (!b) return;
    const id = b.dataset.disco;
    ativos.has(id) ? ativos.delete(id) : ativos.add(id);
    app.guardado.gravar('discos-ativos', [...ativos]);
    b.classList.toggle('fora', ativos.has(id));
    b.setAttribute('aria-pressed', ativos.has(id));
    aoAlternar(id, ativos.has(id));
  });
  // o player avisa qual CD está tocando (o disco dele fica fora da pilha)
  function marcarTocando(id) {
    tocando = id;
    for (const b of pilha.querySelectorAll('[data-cd]')) { const on = b.dataset.cd === id; b.classList.toggle('fora', on); b.setAttribute('aria-pressed', on); }
  }
  return { desenhar, ativo: id => ativos.has(id), raiz: pilha, marcarTocando };
}
