// Pincel, borracha, balde e as operações de pixels sobre o alvo (camada ou máscara), sempre recortadas pela seleção.
import { novoCanvas, ctx2d, clonar, inter, uniao, inteiro } from './nucleo.js';
import { caixa, regiaoSimilar } from './selecao.js';

export function luminancia(cor) {
  const n = parseInt(cor.slice(1), 16);
  return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
}
// na máscara, o canal alfa é o valor: branco revela e preto esconde, com força proporcional à distância do cinza médio
export const modoNaMascara = cor => { const l = luminancia(cor); return l >= 0.5 ? { gco: 'source-over', forca: l, cor: '#ffffff' } : { gco: 'destination-out', forca: 1 - l, cor: '#000000' }; };

function carimbo(d, dureza, cor) {
  const c = novoCanvas(d, d), g = ctx2d(c), r = d / 2;
  if (d <= 2) { g.fillStyle = cor; g.fillRect(0, 0, d, d); return c; }
  const gr = g.createRadialGradient(r, r, r * Math.min(0.999, dureza), r, r, r), n = parseInt(cor.slice(1), 16), rgb = `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`;
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.fill();
  return c;
}

export class Traco {
  constructor(doc, { tam, dureza, opacidade, cor, borracha = false, nome }) {
    const c = doc.ativa;
    this.doc = doc; this.c = c; this.nome = nome; this.tam = tam; this.ultimo = null; this.resto = 0; this.sujo = null;
    this.antesEstr = doc.estrutura();
    if (doc.alvo !== 'mascara') c.texto = null;
    this.alvo = doc.alvoCanvas; this.g = ctx2d(this.alvo);
    this.antes = clonar(this.alvo);
    this.buf = novoCanvas(this.alvo.width, this.alvo.height); this.bg = ctx2d(this.buf);
    this.tmp = null;
    let gco = borracha ? 'destination-out' : 'source-over', corFinal = cor, forca = 1;
    if (doc.alvo === 'mascara') ({ gco, forca, cor: corFinal } = modoNaMascara(cor));
    this.gco = gco; this.opacidade = opacidade * forca;
    this.carimbo = carimbo(Math.max(1, Math.round(tam)), dureza, corFinal);
    this.passo = Math.max(1, tam * 0.1);
  }
  _estampar(x, y, escala) {
    const d = Math.max(1, this.carimbo.width * escala);
    this.bg.drawImage(this.carimbo, x - d / 2, y - d / 2, d, d);
    return { x: x - d / 2 - 1, y: y - d / 2 - 1, w: d + 2, h: d + 2 };
  }
  ponto(xDoc, yDoc, pressao = 1) {
    const x = xDoc - this.c.x, y = yDoc - this.c.y;
    let r = null;
    if (!this.ultimo) r = this._estampar(x, y, pressao);
    else {
      const dx = x - this.ultimo.x, dy = y - this.ultimo.y, dist = Math.hypot(dx, dy);
      let t = this.passo - this.resto;
      while (t <= dist) { const f = t / dist; r = uniao(r, this._estampar(this.ultimo.x + dx * f, this.ultimo.y + dy * f, pressao)); t += this.passo; }
      this.resto = dist - (t - this.passo);
    }
    this.ultimo = { x, y };
    if (r) this._atualizar(r);
  }
  _atualizar(r0) {
    const r = inter(inteiro(r0), { x: 0, y: 0, w: this.alvo.width, h: this.alvo.height });
    if (!r) return;
    this.sujo = uniao(this.sujo, r);
    const g = this.g, { doc, c } = this;
    g.save();
    g.globalCompositeOperation = 'copy'; g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
    g.drawImage(this.antes, 0, 0);
    g.globalCompositeOperation = this.gco; g.globalAlpha = this.opacidade;
    if (doc.sel) {
      this.tmp ??= novoCanvas(this.alvo.width, this.alvo.height);
      const t = ctx2d(this.tmp);
      t.globalCompositeOperation = 'copy'; t.save(); t.beginPath(); t.rect(r.x, r.y, r.w, r.h); t.clip(); t.drawImage(this.buf, 0, 0);
      t.globalCompositeOperation = 'destination-in'; t.drawImage(doc.selCanvas, -c.x, -c.y); t.restore();
      g.drawImage(this.tmp, 0, 0);
    } else g.drawImage(this.buf, 0, 0);
    g.restore();
    doc.invalidar({ x: r.x + c.x, y: r.y + c.y, w: r.w, h: r.h });
  }
  fim() {
    if (!this.sujo) return;
    const r = this.sujo, a = ctx2d(this.antes).getImageData(r.x, r.y, r.w, r.h), d = this.g.getImageData(r.x, r.y, r.w, r.h);
    this.doc.registrar(this.nome, this.antesEstr, { remendos: [{ canvas: this.alvo, x: r.x, y: r.y, antes: a, depois: d }] });
  }
}

// preenche, no alvo, a região dada (canvas com alfa) com uma cor
function pintarRegiao(doc, canvasAlvo, regiao, rx, ry, cor, alfa = 1) {
  const c = doc.ativa, g = ctx2d(canvasAlvo);
  let gco = 'source-over', corFinal = cor, forca = 1;
  if (doc.alvo === 'mascara') ({ gco, forca, cor: corFinal } = modoNaMascara(cor));
  const t = clonar(regiao), k = ctx2d(t);
  k.globalCompositeOperation = 'source-in'; k.fillStyle = corFinal; k.fillRect(0, 0, t.width, t.height);
  if (doc.sel) { k.globalCompositeOperation = 'destination-in'; k.drawImage(doc.selCanvas, -c.x - rx, -c.y - ry); }
  g.save(); g.globalCompositeOperation = gco; g.globalAlpha = alfa * forca; g.drawImage(t, rx, ry); g.restore();
}
export function preencherTudo(doc, cor, nome) {
  const alvo = doc.alvoCanvas, c = doc.ativa, antes = doc.estrutura();
  if (doc.alvo !== 'mascara') c.texto = null;
  const reg = novoCanvas(alvo.width, alvo.height), g = ctx2d(reg);
  g.fillRect(0, 0, reg.width, reg.height);
  doc.pixels(nome, alvo, { x: 0, y: 0, w: alvo.width, h: alvo.height }, () => pintarRegiao(doc, alvo, reg, 0, 0, cor), antes);
}
export function balde(doc, xDoc, yDoc, cor, { tol, contiguo, tudo, alfa }, nome) {
  const c = doc.ativa, alvo = doc.alvoCanvas, antes = doc.estrutura();
  const x = Math.floor(xDoc - c.x), y = Math.floor(yDoc - c.y);
  if (x < 0 || y < 0 || x >= alvo.width || y >= alvo.height) return false;
  let d;
  if (tudo) { const f = novoCanvas(alvo.width, alvo.height); ctx2d(f).drawImage(doc.achatadoCanvas(), -c.x, -c.y); d = ctx2d(f).getImageData(0, 0, f.width, f.height).data; }
  else d = ctx2d(alvo).getImageData(0, 0, alvo.width, alvo.height).data;
  const s = regiaoSimilar(d, alvo.width, alvo.height, x, y, tol, contiguo), b = caixa(s, alvo.width, alvo.height);
  if (!b) return false;
  const reg = novoCanvas(alvo.width, alvo.height), id = new ImageData(alvo.width, alvo.height);
  for (let i = 0; i < s.length; i++) id.data[i * 4 + 3] = s[i];
  ctx2d(reg).putImageData(id, 0, 0);
  if (doc.alvo !== 'mascara') c.texto = null;
  doc.pixels(nome, alvo, b, () => pintarRegiao(doc, alvo, reg, 0, 0, cor, alfa), antes);
  return true;
}
export function limpar(doc, nome) {
  const c = doc.ativa, alvo = doc.alvoCanvas, antes = doc.estrutura();
  if (doc.alvo !== 'mascara') c.texto = null;
  doc.pixels(nome, alvo, { x: 0, y: 0, w: alvo.width, h: alvo.height }, g => {
    g.save(); g.globalCompositeOperation = 'destination-out';
    if (doc.sel) g.drawImage(doc.selCanvas, -c.x, -c.y); else g.fillRect(0, 0, alvo.width, alvo.height);
    g.restore();
  }, antes);
}
// o pedaço da camada ativa dentro da seleção (ou ela toda), com a posição dele na imagem
export function copiarRegiao(doc) {
  const c = doc.ativa;
  if (!doc.sel) return { canvas: clonar(c.canvas), x: c.x, y: c.y };
  const b = caixa(doc.sel, doc.w, doc.h), r = b && inter(b, { x: c.x, y: c.y, w: c.canvas.width, h: c.canvas.height });
  if (!r) return null;
  const t = novoCanvas(r.w, r.h), k = ctx2d(t);
  k.drawImage(c.canvas, c.x - r.x, c.y - r.y);
  k.globalCompositeOperation = 'destination-in'; k.drawImage(doc.selCanvas, -r.x, -r.y);
  return { canvas: t, x: r.x, y: r.y };
}
