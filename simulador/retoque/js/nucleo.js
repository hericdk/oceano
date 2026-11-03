// O documento do Retoque: camadas com limites próprios, máscaras, seleção como canal, composição e histórico.
// Canvas de camada mudam de duas formas: pixels no lugar (registrados como remendos) ou trocados por um novo (o antigo fica no histórico).

export const MISTURAS = [
  ['source-over', 'Normal'], ['multiply', 'Multiplicar'], ['screen', 'Tela'], ['overlay', 'Sobrepor'],
  ['darken', 'Escurecer'], ['lighten', 'Clarear'], ['color-dodge', 'Subexpor cor'], ['color-burn', 'Superexpor cor'],
  ['hard-light', 'Luz dura'], ['soft-light', 'Luz suave'], ['difference', 'Diferença'], ['exclusion', 'Exclusão'],
  ['lighter', 'Somar'], ['hue', 'Matiz'], ['saturation', 'Saturação'], ['color', 'Cor'], ['luminosity', 'Luminosidade'],
];
export const LADO_MAX = 16384, AREA_MAX = 100e6;
const LIMITE_HISTORICO = 800 * 1024 * 1024;

export const ctx2d = c => c.getContext('2d', { willReadFrequently: true });
export const novoCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
export const clonar = c => { const n = novoCanvas(c.width, c.height); ctx2d(n).drawImage(c, 0, 0); return n; };
export const bytesDe = c => c.width * c.height * 4;
export const inter = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y; return w > 0 && h > 0 ? { x, y, w, h } : null; };
export const uniao = (a, b) => { if (!a) return b; if (!b) return a; const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; };
export const inteiro = r => { const x = Math.floor(r.x), y = Math.floor(r.y); return { x, y, w: Math.ceil(r.x + r.w) - x, h: Math.ceil(r.y + r.h) - y }; };
export const tamanhoValido = (w, h) => w >= 1 && h >= 1 && w <= LADO_MAX && h <= LADO_MAX && w * h <= AREA_MAX;

export function selParaCanvas(sel, w, h) {
  const c = novoCanvas(w, h), id = new ImageData(w, h), d = id.data;
  for (let i = 0, n = sel.length; i < n; i++) d[i * 4 + 3] = sel[i];
  ctx2d(c).putImageData(id, 0, 0);
  return c;
}

let proximoId = 1;
export function novaCamada(canvas, nome, x = 0, y = 0, extra = {}) {
  return { id: proximoId++, nome, canvas, x, y, visivel: true, opacidade: 1, mistura: 'source-over', travada: false, mascara: null, mascaraLigada: true, texto: null, ...extra };
}
export const usarIdsAPartirDe = n => { proximoId = Math.max(proximoId, n + 1); };

export function renderTexto(t) {
  const fonte = `${t.italico ? 'italic ' : ''}${t.negrito ? 'bold ' : ''}${t.tam}px ${t.fonte}`;
  const linhas = String(t.texto || ' ').split('\n'), med = ctx2d(novoCanvas(1, 1));
  med.font = fonte;
  const alt = Math.ceil(t.tam * 1.25), larg = Math.ceil(Math.max(1, ...linhas.map(l => med.measureText(l).width))) + Math.ceil(t.tam * 0.4);
  const c = novoCanvas(larg, alt * linhas.length + Math.ceil(t.tam * 0.2)), g = ctx2d(c);
  g.font = fonte; g.fillStyle = t.cor; g.textBaseline = 'alphabetic'; g.textAlign = t.alinhar || 'left';
  const xa = t.alinhar === 'center' ? larg / 2 : t.alinhar === 'right' ? larg : 0;
  linhas.forEach((l, i) => g.fillText(l, xa, alt * i + t.tam));
  return c;
}

// matriz aplicada à camada (e à máscara) devolvendo o novo canvas e a nova posição
export function transformar(canvas, x, y, m, suave = true) {
  const cant = [[x, y], [x + canvas.width, y], [x, y + canvas.height], [x + canvas.width, y + canvas.height]].map(([a, b]) => new DOMPoint(a, b).matrixTransform(m));
  const nx = Math.floor(Math.min(...cant.map(p => p.x))), ny = Math.floor(Math.min(...cant.map(p => p.y)));
  const fx = Math.ceil(Math.max(...cant.map(p => p.x))), fy = Math.ceil(Math.max(...cant.map(p => p.y)));
  const c = novoCanvas(fx - nx, fy - ny), g = ctx2d(c);
  g.imageSmoothingEnabled = suave; g.imageSmoothingQuality = 'high';
  g.setTransform(new DOMMatrix().translate(-nx, -ny).multiply(m).translate(x, y));
  g.drawImage(canvas, 0, 0);
  return { canvas: c, x: nx, y: ny };
}

export class Documento extends EventTarget {
  constructor(w, h, nome = 'sem-titulo') {
    super();
    Object.assign(this, { w, h, nome, camadas: [], ativaId: null, alvo: 'camada', sel: null, pilha: [], pos: 0, sujo: false, versao: 0, pendente: null, _selC: null, _selDe: null });
    this.comp = novoCanvas(w, h);
  }
  get ativa() { return this.camadas.find(c => c.id === this.ativaId) || null; }
  get alvoCanvas() { const c = this.ativa; return !c ? null : this.alvo === 'mascara' && c.mascara ? c.mascara : c.canvas; }
  get selCanvas() { if (!this.sel) return null; if (this._selDe !== this.sel) { this._selC = selParaCanvas(this.sel, this.w, this.h); this._selDe = this.sel; } return this._selC; }

  // ── histórico ──
  estrutura() { return { w: this.w, h: this.h, ativaId: this.ativaId, alvo: this.alvo, sel: this.sel, camadas: this.camadas.map(c => ({ ...c })) }; }
  _restaurar(e) {
    const mudouTam = e.w !== this.w || e.h !== this.h;
    Object.assign(this, { w: e.w, h: e.h, ativaId: e.ativaId, alvo: e.alvo, sel: e.sel, camadas: e.camadas.map(c => ({ ...c })) });
    if (mudouTam) this.comp = novoCanvas(this.w, this.h);
    this.invalidar();
  }
  registrar(nome, antes, { remendos = [], bytes = 0, unir = null } = {}) {
    const ult = this.pilha[this.pos - 1];
    this.pilha.length = this.pos;
    if (unir && ult?.unir === unir) { ult.depois = this.estrutura(); ult.bytes += bytes; }
    else { this.pilha.push({ nome, antes, depois: this.estrutura(), remendos, bytes: bytes + remendos.reduce((s, r) => s + r.antes.data.length * 2, 0), unir }); this.pos = this.pilha.length; }
    let total = this.pilha.reduce((s, e) => s + e.bytes, 0);
    while (total > LIMITE_HISTORICO && this.pilha.length > 1) { total -= this.pilha.shift().bytes; this.pos--; }
    this.sujo = true; this.versao++;
    this.dispatchEvent(new Event('historico'));
  }
  acao(nome, fn, opcoes) {
    const antes = this.estrutura(), r = fn();
    this.registrar(nome, antes, opcoes);
    this.invalidar();
    return r;
  }
  // muda pixels no lugar dentro de um retângulo do próprio canvas
  pixels(nome, canvas, rect, fn, antes = this.estrutura()) {
    const r = inter(inteiro(rect), { x: 0, y: 0, w: canvas.width, h: canvas.height }), g = ctx2d(canvas);
    if (!r) return;
    const a = g.getImageData(r.x, r.y, r.w, r.h);
    fn(g);
    this.registrar(nome, antes, { remendos: [{ canvas, x: r.x, y: r.y, antes: a, depois: g.getImageData(r.x, r.y, r.w, r.h) }] });
    this.invalidar();
  }
  desfazer() {
    if (!this.pos) return false;
    const e = this.pilha[--this.pos];
    for (const r of [...e.remendos].reverse()) ctx2d(r.canvas).putImageData(r.antes, r.x, r.y);
    this._restaurar(e.antes); this.versao++; this.sujo = true;
    this.dispatchEvent(new Event('historico'));
    return true;
  }
  refazer() {
    if (this.pos >= this.pilha.length) return false;
    const e = this.pilha[this.pos++];
    for (const r of e.remendos) ctx2d(r.canvas).putImageData(r.depois, r.x, r.y);
    this._restaurar(e.depois); this.versao++; this.sujo = true;
    this.dispatchEvent(new Event('historico'));
    return true;
  }
  irPara(pos) { while (this.pos > pos && this.desfazer()); while (this.pos < pos && this.refazer()); }

  // ── composição ──
  invalidar(rect) {
    this.pendente = rect ? (this.pendente?.tudo ? this.pendente : uniao(this.pendente, rect)) : { tudo: true };
    this.dispatchEvent(new Event('mudou'));
  }
  atualizarComp() {
    const p = this.pendente;
    if (!p) return null;
    this.pendente = null;
    const r = p.tudo ? { x: 0, y: 0, w: this.w, h: this.h } : inter(inteiro(p), { x: 0, y: 0, w: this.w, h: this.h });
    if (!r) return null;
    this.comporEm(ctx2d(this.comp), r);
    return r;
  }
  comporEm(g, r) {
    g.save();
    g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
    g.clearRect(r.x, r.y, r.w, r.h);
    let tmp = null;
    for (const c of this.camadas) {
      if (!c.visivel || c.opacidade <= 0) continue;
      g.globalAlpha = c.opacidade; g.globalCompositeOperation = c.mistura;
      const m = c.previa;
      if (c.mascara && c.mascaraLigada) {
        tmp ??= novoCanvas(r.w, r.h);
        const t = ctx2d(tmp);
        t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, r.w, r.h);
        t.translate(-r.x, -r.y); if (m) t.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        t.drawImage(c.canvas, c.x, c.y);
        t.globalCompositeOperation = 'destination-in';
        t.drawImage(c.mascara, c.x, c.y);
        g.drawImage(tmp, r.x, r.y);
      } else if (m) {
        g.save(); g.transform(m.a, m.b, m.c, m.d, m.e, m.f); g.imageSmoothingQuality = 'high'; g.drawImage(c.canvas, c.x, c.y); g.restore();
      } else g.drawImage(c.canvas, c.x, c.y);
    }
    g.restore();
  }
  achatadoCanvas(fundo = null) {
    const c = novoCanvas(this.w, this.h), g = ctx2d(c);
    this.comporEm(g, { x: 0, y: 0, w: this.w, h: this.h });
    if (fundo) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = fundo; g.fillRect(0, 0, this.w, this.h); }
    return c;
  }

  // ── camadas ──
  novaVazia(nome) { return novaCamada(novoCanvas(this.w, this.h), nome); }
  adicionar(c, acima = this.ativaId) {
    const i = this.camadas.findIndex(k => k.id === acima);
    this.camadas.splice(i < 0 ? this.camadas.length : i + 1, 0, c);
    this.ativaId = c.id; this.alvo = 'camada';
    return c;
  }
  ativar(id, alvo = 'camada') { this.ativaId = id; this.alvo = alvo; this.dispatchEvent(new Event('camadas')); }
  excluir(id) {
    if (this.camadas.length < 2) return false;
    const i = this.camadas.findIndex(c => c.id === id);
    this.camadas.splice(i, 1);
    if (this.ativaId === id) { this.ativaId = this.camadas[Math.max(0, i - 1)].id; this.alvo = 'camada'; }
    return true;
  }
  mover(id, passo) {
    const i = this.camadas.findIndex(c => c.id === id), j = i + passo;
    if (i < 0 || j < 0 || j >= this.camadas.length) return false;
    const [c] = this.camadas.splice(i, 1); this.camadas.splice(j, 0, c);
    return true;
  }
  moverPara(id, j) { const i = this.camadas.findIndex(c => c.id === id); const [c] = this.camadas.splice(i, 1); this.camadas.splice(j, 0, c); }
  duplicar(id, nomeCopia) {
    const c = this.camadas.find(k => k.id === id);
    return this.adicionar(novaCamada(clonar(c.canvas), nomeCopia(c.nome), c.x, c.y, { opacidade: c.opacidade, mistura: c.mistura, mascara: c.mascara && clonar(c.mascara), mascaraLigada: c.mascaraLigada, texto: c.texto }), id);
  }
  // desenha a camada com máscara, para mesclar
  _desenhar(g, c, ox, oy) {
    g.globalAlpha = c.opacidade; g.globalCompositeOperation = c.mistura;
    if (c.mascara && c.mascaraLigada) { const t = clonar(c.canvas), k = ctx2d(t); k.globalCompositeOperation = 'destination-in'; k.drawImage(c.mascara, 0, 0); g.drawImage(t, c.x - ox, c.y - oy); }
    else g.drawImage(c.canvas, c.x - ox, c.y - oy);
  }
  mesclarAbaixo(id) {
    const i = this.camadas.findIndex(c => c.id === id);
    if (i < 1) return false;
    const a = this.camadas[i], b = this.camadas[i - 1];
    const r = uniao({ x: a.x, y: a.y, w: a.canvas.width, h: a.canvas.height }, { x: b.x, y: b.y, w: b.canvas.width, h: b.canvas.height });
    const n = novoCanvas(r.w, r.h), g = ctx2d(n);
    this._desenhar(g, { ...b, mistura: 'source-over' }, r.x, r.y);
    this._desenhar(g, a, r.x, r.y);
    const nova = { ...b, canvas: n, x: r.x, y: r.y, opacidade: 1, mascara: null, texto: null };
    this.camadas.splice(i - 1, 2, nova);
    this.ativaId = nova.id; this.alvo = 'camada';
    return true;
  }
  achatar(nome, fundo = '#ffffff') {
    const c = novaCamada(this.achatadoCanvas(fundo), nome);
    this.camadas = [c]; this.ativaId = c.id; this.alvo = 'camada';
  }
  adicionarMascara(id, tipo) {
    const c = this.camadas.find(k => k.id === id);
    const m = novoCanvas(c.canvas.width, c.canvas.height), g = ctx2d(m);
    if (tipo === 'alfa') g.drawImage(c.canvas, 0, 0);
    else if (tipo === 'selecao' && this.sel) g.drawImage(this.selCanvas, -c.x, -c.y);
    else if (tipo !== 'preta') { g.fillStyle = '#fff'; g.fillRect(0, 0, m.width, m.height); }
    c.mascara = m; c.mascaraLigada = true; this.ativaId = id; this.alvo = 'mascara';
  }
  aplicarMascara(id) {
    const c = this.camadas.find(k => k.id === id);
    if (!c?.mascara) return;
    const n = clonar(c.canvas), g = ctx2d(n);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(c.mascara, 0, 0);
    c.canvas = n; c.mascara = null; c.texto = null; this.alvo = 'camada';
  }
  excluirMascara(id) { const c = this.camadas.find(k => k.id === id); if (c) { c.mascara = null; this.alvo = 'camada'; } }
  camadaParaImagem(id) {
    const c = this.camadas.find(k => k.id === id), n = novoCanvas(this.w, this.h);
    ctx2d(n).drawImage(c.canvas, c.x, c.y);
    if (c.mascara) { const m = novoCanvas(this.w, this.h), g = ctx2d(m); g.fillStyle = '#fff'; g.fillRect(0, 0, this.w, this.h); g.clearRect(c.x, c.y, c.canvas.width, c.canvas.height); g.drawImage(c.mascara, c.x, c.y); c.mascara = m; }
    c.canvas = n; c.x = 0; c.y = 0; c.texto = null;
  }
  transformarCamada(id, m, suave = true) {
    const c = this.camadas.find(k => k.id === id), t = transformar(c.canvas, c.x, c.y, m, suave);
    if (c.mascara) c.mascara = transformar(c.mascara, c.x, c.y, m, suave).canvas;
    c.canvas = t.canvas; c.x = t.x; c.y = t.y; c.texto = null; c.previa = null;
  }

  // ── imagem inteira ──
  _trocarTam(w, h) { this.w = w; this.h = h; this.comp = novoCanvas(w, h); }
  tela(w, h, ox, oy) {
    for (const c of this.camadas) { c.x += ox; c.y += oy; }
    this.sel = null; this._trocarTam(w, h);
  }
  escalar(w, h) {
    const sx = w / this.w, sy = h / this.h, m = new DOMMatrix().scale(sx, sy);
    for (const c of this.camadas) this.transformarCamada(c.id, m);
    if (this.sel) this.sel = reamostrar(this.sel, this.w, this.h, w, h);
    this._trocarTam(w, h);
  }
  girarImagem(horario) {
    const { w, h } = this, m = horario ? new DOMMatrix([0, 1, -1, 0, h, 0]) : new DOMMatrix([0, -1, 1, 0, 0, w]);
    for (const c of this.camadas) this.transformarCamada(c.id, m, false);
    if (this.sel) { const n = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const nx = horario ? h - 1 - y : y, ny = horario ? x : w - 1 - x; n[ny * h + nx] = this.sel[y * w + x]; } this.sel = n; }
    this._trocarTam(h, w);
  }
  espelharImagem(horizontal) {
    const { w, h } = this, m = horizontal ? new DOMMatrix([-1, 0, 0, 1, w, 0]) : new DOMMatrix([1, 0, 0, -1, 0, h]);
    for (const c of this.camadas) this.transformarCamada(c.id, m, false);
    if (this.sel) { const n = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) n[(horizontal ? y : h - 1 - y) * w + (horizontal ? w - 1 - x : x)] = this.sel[y * w + x]; this.sel = n; }
  }
}

function reamostrar(s, w, h, w2, h2) {
  const n = new Uint8Array(w2 * h2);
  for (let y = 0; y < h2; y++) { const oy = Math.min(h - 1, Math.floor(y * h / h2)) * w; for (let x = 0; x < w2; x++) n[y * w2 + x] = s[oy + Math.min(w - 1, Math.floor(x * w / w2))]; }
  return n;
}
