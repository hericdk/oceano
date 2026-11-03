// As ferramentas. Cada uma declara as opções da barra e reage ao ponteiro; a tela (app.js) só entrega os eventos.
// Atalhos seguem o GIMP: ficam só aqui, para o modo Photoshop da próxima fase trocar uma tabela.
import { novaCamada, ctx2d, clonar, renderTexto, inteiro } from './nucleo.js';
import * as S from './selecao.js';
import { Traco, balde, copiarRegiao } from './pintura.js';

const MODOS_SEL = { k: 'modo', tipo: 'modo', valores: [['trocar', 'Trocar', 'trocar'], ['somar', 'Somar', 'somar'], ['subtrair', 'Subtrair', 'subtrair'], ['intersectar', 'Intersectar', 'intersectar']] };
const SUAVE = { k: 'suave', tipo: 'faixa', rotulo: 'Suavizar', min: 0, max: 200, un: 'px' };
const modoDe = (o, e) => (e.shiftKey && e.ctrl ? 'intersectar' : e.shiftKey ? 'somar' : e.ctrl ? 'subtrair' : o.modo);

function aplicarSel(a, nova, nome, e, o) {
  const d = a.doc, modo = e ? modoDe(o, e) : o.modo;
  const base = o.suave ? S.suavizar(nova, d.w, d.h, o.suave) : nova;
  const r = S.combinar(d.sel, base, modo);
  d.acao(a.t(nome), () => { d.sel = S.vazia(r) ? null : r; });
}
const podeEditar = (a, pixels = true) => {
  const c = a.doc?.ativa;
  if (!c) return false;
  if (pixels && c.travada && a.doc.alvo !== 'mascara') { a.status(a.t('Esta camada está travada')); return false; }
  return true;
};
const retTela = (a, p, q) => { const u = a.paraTela(p.x, p.y), v = a.paraTela(q.x, q.y); return [Math.min(u.x, v.x), Math.min(u.y, v.y), Math.abs(u.x - v.x), Math.abs(u.y - v.y)]; };
function linhaDupla(g, desenhar) {
  g.save(); g.lineWidth = 1;
  g.strokeStyle = '#000'; g.setLineDash([]); desenhar(); g.stroke();
  g.strokeStyle = '#fff'; g.setLineDash([4, 4]); desenhar(); g.stroke();
  g.restore();
}

const selArrasto = (id, nome, icone, atalho, formar, nomeAcao) => ({
  id, nome, icone, atalho, cursor: 'crosshair', o: { modo: 'trocar', suave: 0 }, opcoes: [MODOS_SEL, SUAVE],
  down(a, p, e) { this.ini = p; this.fim = p; this.ev = { shiftKey: e.shiftKey, ctrl: e.ctrl }; },
  move(a, p) { this.fim = p; },
  up(a) {
    const { ini, fim } = this; this.ini = null;
    const d = a.doc;
    if (Math.abs(fim.x - ini.x) < 1 && Math.abs(fim.y - ini.y) < 1) { if (d.sel && modoDe(this.o, this.ev) === 'trocar') d.acao(a.t('Nada selecionado'), () => { d.sel = null; }); return; }
    aplicarSel(a, formar(d.w, d.h, ini.x, ini.y, fim.x, fim.y), nomeAcao, this.ev, this.o);
  },
  desenhar(a, g) {
    if (!this.ini) return;
    const [x, y, w, h] = retTela(a, this.ini, this.fim);
    linhaDupla(g, () => { g.beginPath(); id === 'selElipse' ? g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7) : g.rect(x + .5, y + .5, w, h); });
  },
});

// a caixa do transformar: centro, tamanho e ângulo; a matriz leva a caixa original até ela
function matrizDe(b) { return new DOMMatrix().translate(b.cx, b.cy).rotate(b.ang).scale(b.w / b.w0, b.h / b.h0).translate(-b.cx0, -b.cy0); }
const local = (b, p) => { const r = -b.ang * Math.PI / 180, dx = p.x - b.cx, dy = p.y - b.cy; return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) }; };
const mundo = (b, x, y) => { const r = b.ang * Math.PI / 180; return { x: b.cx + x * Math.cos(r) - y * Math.sin(r), y: b.cy + x * Math.sin(r) + y * Math.cos(r) }; };
const ALCAS = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

export const FERRAMENTAS = [
  {
    id: 'mover', nome: 'Mover', icone: 'mover', atalho: 'm', cursor: 'move', o: {}, opcoes: [{ tipo: 'dica', texto: 'Arraste a camada. Com Alt, move só a seleção. Setas movem 1 px.' }],
    down(a, p, e) {
      if (!a.doc.ativa) return;
      this.ini = p; this.soSel = e.altKey && !!a.doc.sel; this.antes = a.doc.estrutura();
      const c = a.doc.ativa; this.x0 = c.x; this.y0 = c.y;
      if (!this.soSel && c.travada) { this.ini = null; a.status(a.t('Esta camada está travada')); }
    },
    move(a, p) {
      if (!this.ini) return;
      const dx = Math.round(p.x - this.ini.x), dy = Math.round(p.y - this.ini.y);
      if (this.soSel) { this.dx = dx; this.dy = dy; a.pedirTela(); return; }
      const c = a.doc.ativa; c.x = this.x0 + dx; c.y = this.y0 + dy; a.doc.invalidar();
    },
    up(a, p) {
      if (!this.ini) return;
      const d = a.doc, dx = Math.round(p.x - this.ini.x), dy = Math.round(p.y - this.ini.y); this.ini = null;
      if (!dx && !dy) return;
      if (this.soSel) { this.dx = this.dy = 0; const s = S.deslocar(d.sel, d.w, d.h, dx, dy); d.acao(a.t('Mover seleção'), () => { d.sel = S.vazia(s) ? null : s; }); }
      else d.registrar(a.t('Mover camada'), this.antes);
    },
    tecla(a, e) {
      const seta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key], c = a.doc?.ativa;
      if (!seta || !c || c.travada) return false;
      const n = e.shiftKey ? 10 : 1;
      a.doc.acao(a.t('Mover camada'), () => { c.x += seta[0] * n; c.y += seta[1] * n; }, { unir: 'setas' + c.id });
      return true;
    },
  },
  selArrasto('selRet', 'Seleção retangular', 'selRet', 'r', S.retangulo, 'Seleção retangular'),
  selArrasto('selElipse', 'Seleção elíptica', 'selElipse', 'e', S.elipse, 'Seleção elíptica'),
  {
    id: 'laco', nome: 'Laço', icone: 'laco', atalho: 'f', cursor: 'crosshair', o: { modo: 'trocar', suave: 0 }, opcoes: [MODOS_SEL, SUAVE],
    down(a, p, e) { this.pts = [p]; this.ev = { shiftKey: e.shiftKey, ctrl: e.ctrl }; },
    move(a, p) { this.pts?.push(p); },
    up(a) { const pts = this.pts; this.pts = null; if (pts?.length > 2) aplicarSel(a, S.laco(a.doc.w, a.doc.h, pts), 'Laço', this.ev, this.o); },
    desenhar(a, g) { if (this.pts) linhaDupla(g, () => { g.beginPath(); this.pts.forEach((p, i) => { const t = a.paraTela(p.x, p.y); i ? g.lineTo(t.x, t.y) : g.moveTo(t.x, t.y); }); }); },
  },
  {
    id: 'varinha', nome: 'Varinha', icone: 'varinha', atalho: 'u', cursor: 'crosshair', o: { modo: 'trocar', suave: 0, tol: 15, contiguo: true, tudo: false },
    opcoes: [MODOS_SEL, { k: 'tol', tipo: 'faixa', rotulo: 'Tolerância', min: 0, max: 255 }, { k: 'contiguo', tipo: 'sim', rotulo: 'Só o que está ligado' }, { k: 'tudo', tipo: 'sim', rotulo: 'Olhar todas as camadas' }, SUAVE],
    down(a, p, e) {
      const d = a.doc, c = d.ativa, o = this.o;
      if (!c) return;
      let dados, w, h, x = Math.floor(p.x), y = Math.floor(p.y), ox = 0, oy = 0;
      if (o.tudo) { d.atualizarComp(); ({ width: w, height: h } = d.comp); dados = ctx2d(d.comp).getImageData(0, 0, w, h).data; }
      else { w = c.canvas.width; h = c.canvas.height; ox = c.x; oy = c.y; x -= ox; y -= oy; dados = ctx2d(c.canvas).getImageData(0, 0, w, h).data; }
      const s0 = S.regiaoSimilar(dados, w, h, x, y, o.tol, o.contiguo);
      let s = s0;
      if (!o.tudo) { s = new Uint8Array(d.w * d.h); for (let yy = Math.max(0, oy); yy < Math.min(d.h, oy + h); yy++) for (let xx = Math.max(0, ox); xx < Math.min(d.w, ox + w); xx++) s[yy * d.w + xx] = s0[(yy - oy) * w + xx - ox]; }
      aplicarSel(a, s, 'Varinha', { shiftKey: e.shiftKey, ctrl: e.ctrl }, o);
    },
  },
  {
    id: 'cortar', nome: 'Cortar', icone: 'cortar', atalho: 'C', cursor: 'crosshair', o: {}, opcoes: [{ tipo: 'dica', texto: 'Arraste a área. Enter corta e Esc desiste.' }, { tipo: 'botao', rotulo: 'Cortar', acao: 'enter' }],
    down(a, p) { this.ini = p; this.fim = p; this.pronto = false; },
    move(a, p) { if (this.ini && !this.pronto) this.fim = p; },
    up(a, p) { if (this.ini) { this.fim = p; this.pronto = Math.abs(p.x - this.ini.x) >= 1 && Math.abs(p.y - this.ini.y) >= 1; if (!this.pronto) this.ini = null; } },
    enter(a) {
      if (!this.pronto) return;
      const d = a.doc, r = inteiro({ x: Math.min(this.ini.x, this.fim.x), y: Math.min(this.ini.y, this.fim.y), w: Math.abs(this.fim.x - this.ini.x), h: Math.abs(this.fim.y - this.ini.y) });
      this.ini = null; this.pronto = false;
      const x = Math.max(0, r.x), y = Math.max(0, r.y), w = Math.min(d.w, r.x + r.w) - x, h = Math.min(d.h, r.y + r.h) - y;
      if (w > 0 && h > 0) { d.acao(a.t('Cortar'), () => d.tela(w, h, -x, -y)); a.ajustar(); }
    },
    cancelar() { this.ini = null; this.pronto = false; },
    desativar() { this.cancelar(); },
    desenhar(a, g) {
      if (!this.ini) return;
      const [x, y, w, h] = retTela(a, this.ini, this.fim), W = g.canvas.width, H = g.canvas.height;
      g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.rect(0, 0, W, H); g.rect(x, y, w, h); g.fill('evenodd'); g.restore();
      linhaDupla(g, () => { g.beginPath(); g.rect(x + .5, y + .5, w, h); });
    },
  },
  {
    id: 'transformar', nome: 'Transformar', icone: 'transformar', atalho: 'T', cursor: 'default', o: { prop: true },
    opcoes: [{ k: 'prop', tipo: 'sim', rotulo: 'Manter proporção' }, { tipo: 'dica', texto: 'Cantos mudam o tamanho e fora da caixa gira. Enter aplica e Esc desiste.' }, { tipo: 'botao', rotulo: 'Aplicar', acao: 'enter' }],
    ativar(a) {
      const d = a.doc, c = d?.ativa;
      this.b = null; this.flutuou = false;
      if (!podeEditar(a)) return;
      if (d.sel) {
        const pedaco = copiarRegiao(d);
        if (!pedaco) return;
        d.acao(a.t('Flutuar seleção'), () => {
          const nova = clonar(c.canvas), k = ctx2d(nova);
          k.globalCompositeOperation = 'destination-out'; k.drawImage(d.selCanvas, -c.x, -c.y);
          c.canvas = nova; c.texto = null;
          d.adicionar(novaCamada(pedaco.canvas, a.t('Seleção flutuante'), pedaco.x, pedaco.y));
          d.sel = null;
        }, { bytes: c.canvas.width * c.canvas.height * 4 });
        this.flutuou = true;
      }
      const k = d.ativa, w = k.canvas.width, h = k.canvas.height;
      this.b = { w0: w, h0: h, w, h, ang: 0, cx0: k.x + w / 2, cy0: k.y + h / 2, cx: k.x + w / 2, cy: k.y + h / 2 };
      a.pedirTela();
    },
    _aplicarPrevia(a) { const c = a.doc.ativa; if (c && this.b) { c.previa = matrizDe(this.b); a.doc.invalidar(); } },
    _alca(a, tela) {
      const b = this.b;
      for (let i = 0; i < 8; i++) { const [sx, sy] = ALCAS[i], m = mundo(b, sx * b.w / 2, sy * b.h / 2), t = a.paraTela(m.x, m.y); if (Math.hypot(t.x - tela.x, t.y - tela.y) < 9) return i; }
      return -1;
    },
    down(a, p, e, tela) {
      if (!this.b) return;
      const i = this._alca(a, tela), l = local(this.b, p), dentro = Math.abs(l.x) <= this.b.w / 2 && Math.abs(l.y) <= this.b.h / 2;
      this.arr = i >= 0 ? { tipo: 'alca', i } : dentro ? { tipo: 'mover', x: p.x, y: p.y, cx: this.b.cx, cy: this.b.cy } : { tipo: 'girar', ini: Math.atan2(p.y - this.b.cy, p.x - this.b.cx), ang: this.b.ang };
    },
    move(a, p, e) {
      const b = this.b, r = this.arr;
      if (!b || !r) return;
      if (r.tipo === 'mover') { b.cx = r.cx + p.x - r.x; b.cy = r.cy + p.y - r.y; }
      else if (r.tipo === 'girar') { let g = r.ang + (Math.atan2(p.y - b.cy, p.x - b.cx) - r.ini) * 180 / Math.PI; if (e.shiftKey) g = Math.round(g / 15) * 15; b.ang = g; }
      else {
        const [sx, sy] = ALCAS[r.i], fixo = mundo(b, -sx * b.w / 2, -sy * b.h / 2), an = b.ang * Math.PI / 180;
        const dx = p.x - fixo.x, dy = p.y - fixo.y;
        let lx = (dx * Math.cos(-an) - dy * Math.sin(-an)) * (sx || 0), ly = (dx * Math.sin(-an) + dy * Math.cos(-an)) * (sy || 0);
        let w = sx ? Math.max(1, lx) : b.w, h = sy ? Math.max(1, ly) : b.h;
        if ((this.o.prop !== e.shiftKey) && sx && sy) { const f = Math.max(w / b.w0, h / b.h0); w = b.w0 * f; h = b.h0 * f; }
        const cx = (sx || 0) * w / 2, cy = (sy || 0) * h / 2;
        b.w = w; b.h = h;
        b.cx = fixo.x + cx * Math.cos(an) - cy * Math.sin(an); b.cy = fixo.y + cx * Math.sin(an) + cy * Math.cos(an);
      }
      this._aplicarPrevia(a);
    },
    up() { this.arr = null; },
    enter(a) {
      const b = this.b, c = a.doc?.ativa;
      if (!b || !c) return;
      this.b = null; c.previa = null;
      if (!(b.w === b.w0 && b.h === b.h0 && !b.ang && b.cx === b.cx0 && b.cy === b.cy0)) a.doc.acao(a.t('Transformar'), () => a.doc.transformarCamada(c.id, matrizDe(b)), { bytes: c.canvas.width * c.canvas.height * 4 });
      else a.doc.invalidar();
      this.flutuou = false;
      a.reativarFerramenta();
    },
    cancelar(a) {
      const c = a.doc?.ativa;
      if (c) c.previa = null;
      this.b = null;
      if (this.flutuou) { this.flutuou = false; a.doc.desfazer(); a.doc.pilha.length = a.doc.pos; a.doc.dispatchEvent(new Event('historico')); }
      a.doc?.invalidar();
    },
    desativar(a) { if (this.b) this.enter(a); },
    desenhar(a, g) {
      const b = this.b;
      if (!b) return;
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => { const m = mundo(b, x * b.w / 2, y * b.h / 2); return a.paraTela(m.x, m.y); });
      linhaDupla(g, () => { g.beginPath(); pts.forEach((t, i) => (i ? g.lineTo(t.x, t.y) : g.moveTo(t.x, t.y))); g.closePath(); });
      g.save(); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1;
      for (const [sx, sy] of ALCAS) { const m = mundo(b, sx * b.w / 2, sy * b.h / 2), t = a.paraTela(m.x, m.y); g.fillRect(Math.round(t.x) - 4, Math.round(t.y) - 4, 8, 8); g.strokeRect(Math.round(t.x) - 3.5, Math.round(t.y) - 3.5, 7, 7); }
      g.restore();
    },
  },
  pincel('pincel', 'Pincel', 'pincel', 'p', false),
  pincel('borracha', 'Borracha', 'borracha', 'E', true),
  {
    id: 'balde', nome: 'Balde', icone: 'balde', atalho: 'B', cursor: 'crosshair', o: { tol: 15, contiguo: true, tudo: false, alfa: 100 },
    opcoes: [{ k: 'tol', tipo: 'faixa', rotulo: 'Tolerância', min: 0, max: 255 }, { k: 'alfa', tipo: 'faixa', rotulo: 'Opacidade', min: 1, max: 100, un: '%' }, { k: 'contiguo', tipo: 'sim', rotulo: 'Só o que está ligado' }, { k: 'tudo', tipo: 'sim', rotulo: 'Olhar todas as camadas' }],
    down(a, p, e) { if (podeEditar(a)) balde(a.doc, p.x, p.y, e.ctrl ? a.cores.fundo : a.cores.frente, { ...this.o, alfa: this.o.alfa / 100 }, a.t('Balde')); },
  },
  {
    id: 'contaGotas', nome: 'Conta-gotas', icone: 'contaGotas', atalho: 'o', cursor: 'crosshair', o: { tudo: true }, opcoes: [{ k: 'tudo', tipo: 'sim', rotulo: 'Olhar todas as camadas' }, { tipo: 'dica', texto: 'Com Ctrl, escolhe a cor de fundo.' }],
    down(a, p, e) { this._pegar(a, p, e); }, move(a, p, e) { this._pegar(a, p, e); },
    _pegar(a, p, e) { const cor = a.corEm(p, this.o.tudo); if (cor) a.definirCor(e.ctrl ? 'fundo' : 'frente', cor); },
  },
  {
    id: 'texto', nome: 'Texto', icone: 'texto', atalho: 't', cursor: 'text', o: { texto: '', fonte: 'system-ui, sans-serif', tam: 64, negrito: false, italico: false, alinhar: 'left' },
    opcoes: [
      { k: 'texto', tipo: 'area', rotulo: 'Texto', dica: 'Clique na imagem e escreva' },
      { k: 'fonte', tipo: 'lista', rotulo: 'Fonte', valores: [['system-ui, sans-serif', 'Sistema'], ['Helvetica, Arial, sans-serif', 'Helvetica'], ['Georgia, serif', 'Georgia'], ['"Times New Roman", serif', 'Times'], ['Menlo, Consolas, monospace', 'Monoespaçada'], ['Impact, sans-serif', 'Impact'], ['Pixelify', 'Pixelify']] },
      { k: 'tam', tipo: 'numero', rotulo: 'Tamanho', min: 4, max: 2000, un: 'px' },
      { k: 'negrito', tipo: 'sim', rotulo: 'Negrito' }, { k: 'italico', tipo: 'sim', rotulo: 'Itálico' },
      { k: 'alinhar', tipo: 'lista', rotulo: 'Alinhar', valores: [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']] },
    ],
    ativar(a) { this._ler(a); },
    _ler(a) { const t = a.doc?.ativa?.texto; if (t) { const { texto, fonte, tam, negrito, italico, alinhar } = t; Object.assign(this.o, { texto, fonte, tam, negrito, italico, alinhar }); a.mostrarOpcoes(); } },
    down(a, p) {
      const d = a.doc;
      const sob = [...d.camadas].reverse().find(c => c.texto && c.visivel && p.x >= c.x && p.y >= c.y && p.x < c.x + c.canvas.width && p.y < c.y + c.canvas.height);
      if (sob) { d.ativar(sob.id); this._ler(a); a.focarOpcao('texto'); return; }
      const dados = { ...this.o, texto: a.t('Texto'), cor: a.cores.frente };
      this.o.texto = dados.texto;
      d.acao(a.t('Texto'), () => d.adicionar(novaCamada(renderTexto(dados), dados.texto, Math.round(p.x), Math.round(p.y - dados.tam * 0.2), { texto: dados })));
      a.mostrarOpcoes(); a.focarOpcao('texto', true);
    },
    mudou(a) {
      const d = a.doc, c = d?.ativa;
      if (!c?.texto) return;
      const dados = { ...c.texto, ...this.o };
      const novo = renderTexto(dados);
      d.acao(a.t('Editar texto'), () => { c.canvas = novo; c.texto = dados; c.nome = (dados.texto.split('\n')[0] || a.t('Texto')).slice(0, 40); }, { unir: 'texto' + c.id, bytes: novo.width * novo.height * 4 });
    },
    corMudou(a) { const c = a.doc?.ativa; if (c?.texto) { const dados = { ...c.texto, cor: a.cores.frente }; const novo = renderTexto(dados); a.doc.acao(a.t('Editar texto'), () => { c.canvas = novo; c.texto = dados; }, { unir: 'texto' + c.id }); } },
  },
  { id: 'zoom', nome: 'Zoom', icone: 'zoom', atalho: 'z', cursor: 'zoom-in', o: {}, opcoes: [{ tipo: 'dica', texto: 'Clique para aproximar e com Alt para afastar.' }], down(a, p, e, tela) { a.zoomEm(tela, e.altKey ? 1 / 1.5 : 1.5); } },
  { id: 'mao', nome: 'Mão', icone: 'mao', atalho: 'h', cursor: 'grab', o: {}, opcoes: [{ tipo: 'dica', texto: 'Arraste para navegar. Espaço faz o mesmo em qualquer ferramenta.' }], pan: true },
];

function pincel(id, nome, icone, atalho, borracha) {
  return {
    id, nome, icone, atalho, cursor: 'none', pinta: true, o: { tam: borracha ? 40 : 20, dureza: borracha ? 100 : 80, opacidade: 100 },
    opcoes: [{ k: 'tam', tipo: 'faixa', rotulo: 'Tamanho', min: 1, max: 1000, un: 'px', curva: true }, { k: 'dureza', tipo: 'faixa', rotulo: 'Dureza', min: 0, max: 100, un: '%' }, { k: 'opacidade', tipo: 'faixa', rotulo: 'Opacidade', min: 1, max: 100, un: '%' }],
    down(a, p, e) {
      if (!podeEditar(a)) return;
      const o = this.o, naMascara = a.doc.alvo === 'mascara';
      this.traco = new Traco(a.doc, { tam: o.tam, dureza: o.dureza / 100, opacidade: o.opacidade / 100, cor: borracha && naMascara ? a.cores.fundo : a.cores.frente, borracha: borracha && !naMascara, nome: a.t(nome) });
      if (e.shiftKey && this.ult) this.traco.ponto(this.ult.x, this.ult.y);
      this.traco.ponto(p.x, p.y, e.pressao);
      this.ult = p;
    },
    move(a, p, e) { if (this.traco) { this.traco.ponto(p.x, p.y, e.pressao); this.ult = p; } },
    up() { this.traco?.fim(); this.traco = null; },
    desenhar(a, g) {
      if (!a.ponteiro) return;
      const t = a.paraTela(a.ponteiro.x, a.ponteiro.y), r = Math.max(1, this.o.tam * a.zoom / 2);
      g.save(); g.lineWidth = 1; g.strokeStyle = '#000'; g.beginPath(); g.arc(t.x, t.y, r, 0, 7); g.stroke(); g.strokeStyle = '#fff'; g.beginPath(); g.arc(t.x, t.y, r + 1, 0, 7); g.stroke(); g.restore();
    },
  };
}
