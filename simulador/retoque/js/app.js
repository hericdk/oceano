// A tela do Retoque: menus, caixa de ferramentas, barra de opções, palco com zoom, painéis e arquivos.
import { Documento, MISTURAS, novaCamada, novoCanvas, ctx2d, clonar, tamanhoValido, LADO_MAX, bytesDe } from './nucleo.js';
import * as S from './selecao.js';
import { preencherTudo, limpar, copiarRegiao } from './pintura.js';
import { exportarBlob, projetoBlob, lerProjeto, eProjeto, gravarRascunho, lerRascunho, apagarRascunho } from './arquivo.js';
import { FERRAMENTAS } from './ferramentas.js';
import { t, definirIdioma, IDIOMAS } from './i18n.js';

const $ = id => document.getElementById(id);
const MAC = /Mac/.test(navigator.platform);
const el = (tag, props = {}, ...filhos) => { const n = Object.assign(document.createElement(tag), props); n.append(...filhos); return n; };
const tela = $('tela'), g = tela.getContext('2d');

const ICONES = {
  mover: ['....#....', '...###...', '....#....', '.#..#..#.', '#########', '.#..#..#.', '....#....', '...###...', '....#....'],
  selRet: ['##.##.##.', '#.......#', '.......#.', '#.......#', '#.......#', '.#.......', '#.......#', '#.......#', '.##.##.##'],
  selElipse: ['...###...', '.#.....#.', '.........', '#.......#', '#.......#', '#.......#', '.........', '.#.....#.', '...###...'],
  laco: ['..#####..', '.#.....#.', '#.......#', '#.......#', '.#.....#.', '..#####..', '.#.......', '.#.......', '..##.....'],
  varinha: ['#.#......', '.#.....#.', '#.#...#..', '.....#...', '....#....', '...#.....', '..#......', '.#.......', '#........'],
  cortar: ['..#......', '..#......', '#########', '..#.....#', '..#.....#', '..#.....#', '..#.....#', '..#######', '........#'],
  transformar: ['##.....##', '##.###.##', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '##.###.##', '##.....##'],
  pincel: ['.......##', '......###', '.....###.', '....###..', '...###...', '..###....', '.##......', '###......', '##.......'],
  borracha: ['....####.', '...#...##', '..#...#.#', '.#...#..#', '#####..#.', '#...#.#..', '#...##...', '#####....', '.........'],
  balde: ['...#.....', '..#.#....', '.#...#...', '#.....#..', '#########', '.#######.', '..#####.#', '...###..#', '....#...#'],
  contaGotas: ['......##.', '.....####', '....#####', '...#####.', '..#.###..', '.#...#...', '#...#....', '#..#.....', '.##......'],
  texto: ['#########', '#...#...#', '....#....', '....#....', '....#....', '....#....', '....#....', '....#....', '..#####..'],
  zoom: ['..####...', '.#....#..', '#..##..#.', '#.####.#.', '#..##..#.', '.#....#..', '..####.#.', '.......##', '........#'],
  mao: ['...#.....', '...#.#...', '.#.#.#.#.', '.#.#.#.#.', '.#######.', '#.#####.#', '#.#####..', '.#####...', '..###....'],
  trocar: ['.........', '.#######.', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '.#######.', '.........'],
  somar: ['#####....', '#...#....', '#...###..', '#.......#', '###.....#', '..#.....#', '..#.....#', '..#######', '.........'],
  subtrair: ['#####....', '#...#....', '#...#....', '#...#####', '#####...#', '..#.....#', '..#.....#', '..#.....#', '..#######'],
  intersectar: ['####.....', '#..#.....', '#.#####..', '#.####.#.', '###.##.#.', '..#####..', '..#...#..', '..#...#..', '..#####..'],
  olho: ['.........', '..#####..', '.#.....#.', '#..###..#', '#..###..#', '#..###..#', '.#.....#.', '..#####..', '.........'],
  nova: ['.#####...', '.#...##..', '.#....##.', '.#.....#.', '.#..#..#.', '.#.###.#.', '.#..#..#.', '.#.....#.', '.#######.'],
  duplicar: ['#####....', '#...#....', '#.#######', '#.#.....#', '###.....#', '..#.....#', '..#.....#', '..#.....#', '..#######'],
  subir: ['....#....', '...###...', '..#####..', '.#######.', '....#....', '....#....', '....#....', '....#....', '....#....'],
  descer: ['....#....', '....#....', '....#....', '....#....', '....#....', '.#######.', '..#####..', '...###...', '....#....'],
  mascara: ['#########', '#.......#', '#..###..#', '#.#####.#', '#.#####.#', '#.#####.#', '#..###..#', '#.......#', '#########'],
  lixo: ['...###...', '#########', '.........', '.#.#.#.#.', '.#.#.#.#.', '.#.#.#.#.', '.#.#.#.#.', '.#.#.#.#.', '.#######.'],
};
const ICONES_EXTRAS = {
  inicio: ['....#....', '...###...', '..#####..', '.#######.', '#########', '.##...##.', '.##...##.', '.##...##.', '.#######.'],
  colar: ['...###...', '.#######.', '.#.....#.', '.#.###.#.', '.#.....#.', '.#.###.#.', '.#.....#.', '.#.###.#.', '.#######.'],
  ajuste: ['..#......', '#########', '..#......', '......#..', '#########', '......#..', '...#.....', '#########', '...#.....'],
  trava: ['...###...', '..#...#..', '..#...#..', '.#######.', '.#######.', '.###.###.', '.###.###.', '.#######.', '.#######.'],
  girar: ['...####..', '..#....#.', '.#......#', '.#.......', '.#.......', '###......', '.#.....#.', '.......#.', '...####..'],
  espelhar: ['....#....', '#...#...#', '##..#..##', '#.#.#.#.#', '#..##...#', '#.#.#.#.#', '##..#..##', '#...#...#', '....#....'],
};
// o ícone de cada passo do histórico; a chave é o nome em português, comparado já traduzido
const ICONES_DO_HISTORICO = {
  mover: ['Mover camada', 'Mover seleção'], selRet: ['Seleção retangular', 'Nada selecionado', 'Inverter seleção', 'Crescer seleção', 'Encolher seleção', 'Suavizar seleção', 'Selecionar tudo', 'Seleção da camada'],
  selElipse: ['Seleção elíptica'], laco: ['Laço'], varinha: ['Varinha'], cortar: ['Cortar', 'Recortar'], transformar: ['Transformar', 'Flutuar seleção', 'Tamanho da imagem', 'Tamanho da tela', 'Camada do tamanho da imagem'],
  pincel: ['Pincel'], borracha: ['Borracha', 'Limpar'], balde: ['Balde', 'Preencher'], texto: ['Texto', 'Editar texto', 'Renomear camada'],
  colar: ['Colar'], nova: ['Nova camada'], duplicar: ['Duplicar camada'], subir: ['Subir camada', 'Mover camada na lista'], descer: ['Descer camada', 'Mesclar para baixo', 'Achatar imagem'], lixo: ['Excluir camada'],
  mascara: ['Adicionar máscara', 'Aplicar máscara', 'Excluir máscara', 'Ligar ou desligar máscara'], olho: ['Mostrar ou esconder'], ajuste: ['Opacidade da camada', 'Modo da camada'], trava: ['Travar camada'],
  girar: ['Girar imagem'], espelhar: ['Espelhar imagem'],
};
let iconePorPasso = null;
const iconeDoPasso = nome => {
  iconePorPasso ??= new Map(Object.entries(ICONES_DO_HISTORICO).flatMap(([ic, nomes]) => nomes.map(n => [t(n), ic])));
  return iconePorPasso.get(nome) || 'ajuste';
};
Object.assign(ICONES, ICONES_EXTRAS);

function icone(nome) {
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'), m = ICONES[nome] || [];
  s.setAttribute('viewBox', '0 0 9 9'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
  m.forEach((l, y) => [...l].forEach((c, x) => { if (c !== '#') return; const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 1); r.setAttribute('height', 1); s.append(r); }));
  return s;
}

// ── o que as ferramentas enxergam ──
const a = {
  doc: null, t, zoom: 1, panX: 0, panY: 0, ponteiro: null,
  cores: { frente: '#000000', fundo: '#ffffff' },
  status(m) { $('r-msg').textContent = m; },
  paraTela: (x, y) => ({ x: a.panX + x * a.zoom, y: a.panY + y * a.zoom }),
  pedirTela, ajustar, mostrarOpcoes,
  reativarFerramenta() { if (!trocando) ferramenta.ativar?.(a); pedirTela(); },
  focarOpcao(k, selecionar) { const c = $('opcoes').querySelector(`[data-opcao="${k}"]`); c?.focus(); if (selecionar) c?.select?.(); },
  corEm(p, tudo) {
    const d = a.doc, c = d?.ativa;
    if (!c) return null;
    let dado;
    if (tudo) { d.atualizarComp(); dado = ctx2d(d.comp).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data; }
    else dado = ctx2d(c.canvas).getImageData(Math.floor(p.x - c.x), Math.floor(p.y - c.y), 1, 1).data;
    return dado[3] ? '#' + [dado[0], dado[1], dado[2]].map(v => v.toString(16).padStart(2, '0')).join('') : null;
  },
  definirCor(q, cor) { a.cores[q] = cor; const i = $('caixa').querySelector('.' + q); if (i) i.value = cor; if (q === 'frente') ferramenta.corMudou?.(a); },
  zoomEm(p, f) {
    const z = Math.min(64, Math.max(1 / 64, a.zoom * f)), x = (p.x - a.panX) / a.zoom, y = (p.y - a.panY) / a.zoom;
    a.zoom = z; a.panX = p.x - x * z; a.panY = p.y - y * z;
    rodape(); pedirTela();
  },
  definirZoom(z) { const r = $('palco').getBoundingClientRect(); a.zoomEm({ x: r.width / 2, y: r.height / 2 }, z / a.zoom); },
};
let ferramenta = FERRAMENTAS.find(f => f.id === 'pincel'), trocando = false;

// ── tela ──
let pedido = false, dpr = 1, xadrez = null, listras = null, corFundo = '#17181c', formigas = 0, contornoDe = null, contornoPath = null;
function pedirTela() { if (!pedido) { pedido = true; requestAnimationFrame(desenhar); } }
function medir() {
  const r = $('palco').getBoundingClientRect(); dpr = devicePixelRatio || 1;
  tela.width = Math.max(1, Math.round(r.width * dpr)); tela.height = Math.max(1, Math.round(r.height * dpr));
  xadrez = null; pedirTela();
}
function padrao() {
  if (xadrez) return xadrez;
  const c = novoCanvas(16, 16), k = c.getContext('2d');
  k.fillStyle = '#b4b4b4'; k.fillRect(0, 0, 16, 16); k.fillStyle = '#d8d8d8'; k.fillRect(0, 0, 8, 8); k.fillRect(8, 8, 8, 8);
  return (xadrez = g.createPattern(c, 'repeat'));
}
function padraoListras() {
  const c = novoCanvas(8, 8), k = c.getContext('2d'), d = k.createImageData(8, 8);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = (x + y) % 8 < 4 ? 0 : 255, i = (y * 8 + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  k.putImageData(d, 0, 0);
  return g.createPattern(c, 'repeat');
}
function desenhar() {
  pedido = false;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = corFundo; g.fillRect(0, 0, tela.width / dpr, tela.height / dpr);
  const d = a.doc;
  if (!d) return;
  d.atualizarComp();
  const x = a.panX, y = a.panY, w = d.w * a.zoom, h = d.h * a.zoom;
  g.save(); g.translate(Math.round(x), Math.round(y)); g.fillStyle = padrao(); g.fillRect(0, 0, Math.round(w), Math.round(h)); g.restore();
  g.imageSmoothingEnabled = a.zoom < 1; g.imageSmoothingQuality = 'high';
  g.drawImage(d.comp, x, y, w, h);
  g.strokeStyle = '#000'; g.lineWidth = 1; g.setLineDash([]); g.strokeRect(Math.round(x) - .5, Math.round(y) - .5, Math.round(w) + 1, Math.round(h) + 1);
  const c = d.ativa;
  if (c && !c.previa && (c.x || c.y || c.canvas.width !== d.w || c.canvas.height !== d.h)) {
    const t0 = a.paraTela(c.x, c.y);
    g.save(); g.strokeStyle = '#ffd400'; g.setLineDash([4, 4]); g.strokeRect(Math.round(t0.x) + .5, Math.round(t0.y) + .5, Math.round(c.canvas.width * a.zoom), Math.round(c.canvas.height * a.zoom)); g.restore();
  }
  if (d.sel) {
    if (contornoDe !== d.sel) { contornoPath = S.contorno(d.sel, d.w, d.h); contornoDe = d.sel; }
    g.save();
    g.translate(x + (ferramenta.dx || 0) * a.zoom, y + (ferramenta.dy || 0) * a.zoom); g.scale(a.zoom, a.zoom);
    g.lineWidth = 1 / a.zoom;
    // o contorno são muitos trechos curtos, e tracejado recomeçaria em cada um: as listras andam na tela, em qualquer forma
    listras ??= padraoListras();
    listras.setTransform(new DOMMatrix().scale(1 / a.zoom).translate(formigas - (x + (ferramenta.dx || 0) * a.zoom), -(y + (ferramenta.dy || 0) * a.zoom)));
    g.strokeStyle = listras; g.stroke(contornoPath);
    g.restore();
  }
  ferramenta.desenhar?.(a, g);
}
setInterval(() => { if (a.doc?.sel && !document.hidden) { formigas = (formigas + 1) % 8; pedirTela(); } }, 120);
function ajustar() {
  const d = a.doc;
  if (!d) return;
  const r = $('palco').getBoundingClientRect(), z = Math.min(1, (r.width - 40) / d.w, (r.height - 40) / d.h);
  a.zoom = Math.max(1 / 64, z); a.panX = Math.round((r.width - d.w * a.zoom) / 2); a.panY = Math.round((r.height - d.h * a.zoom) / 2);
  rodape(); pedirTela();
}

// ── documento ──
let timerRascunho = null, gravando = false, arrastando = false;
function definirDoc(d) {
  a.doc = d; contornoDe = null;
  $('boas-vindas').hidden = !!d;
  if (d) {
    d.addEventListener('mudou', pedirTela);
    d.addEventListener('historico', () => { agendarPaineis(); agendarRascunho(); });
    d.addEventListener('camadas', () => { agendarPaineis(); if (ferramenta.id === 'texto') ferramenta._ler?.(a); });
    d.invalidar();
    ajustar();
  }
  pintarPaineis(); rodape();
  ferramenta.ativar?.(a);
}
function agendarRascunho() {
  clearTimeout(timerRascunho);
  timerRascunho = setTimeout(async () => {
    const d = a.doc;
    if (!d) return;
    if (gravando || arrastando) return agendarRascunho();
    gravando = true;
    try { await gravarRascunho(await projetoBlob(d)); } catch { a.status(t('Não deu para guardar o rascunho')); }
    gravando = false;
  }, 6000);
}
const semExtensao = n => String(n || '').replace(/\.[^.]+$/, '').slice(0, 120) || t('sem-titulo');

async function arquivoParaCanvas(blob) {
  let fonte, fechar = () => {};
  try { fonte = await createImageBitmap(blob); fechar = () => fonte.close(); }
  catch {
    const url = URL.createObjectURL(blob), img = new Image();
    img.src = url;
    try { await img.decode(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    fonte = img;
  }
  const w = fonte.width || fonte.naturalWidth, h = fonte.height || fonte.naturalHeight;
  if (!tamanhoValido(w, h)) { fechar(); throw new Error(t('Imagem grande demais')); }
  const c = novoCanvas(w, h); ctx2d(c).drawImage(fonte, 0, 0); fechar();
  return c;
}
function docDeCanvas(c, nome) {
  const d = new Documento(c.width, c.height, nome), k = novaCamada(c, nome);
  d.camadas.push(k); d.ativaId = k.id;
  return d;
}
async function abrirArquivo(f) {
  try {
    if (await eProjeto(f)) { definirDoc(await lerProjeto(f)); a.status(t('Projeto aberto')); return; }
    const nome = semExtensao(f.name);
    definirDoc(docDeCanvas(await arquivoParaCanvas(f), nome));
    agendarRascunho();
    a.status(t('Imagem aberta'));
  } catch (e) { a.status(t('Não deu para abrir este arquivo') + ': ' + (e.message || e)); }
}
function colarCanvas(c, x, y, nome) {
  const d = a.doc;
  if (!d) { definirDoc(docDeCanvas(c, nome)); agendarRascunho(); return; }
  d.acao(t('Colar'), () => d.adicionar(novaCamada(c, nome, x ?? Math.round((d.w - c.width) / 2), y ?? Math.round((d.h - c.height) / 2))), { bytes: bytesDe(c) });
}
async function importarArquivos(lista) {
  for (const f of lista) {
    try {
      if (!a.doc && await eProjeto(f)) { await abrirArquivo(f); continue; }
      colarCanvas(await arquivoParaCanvas(f), undefined, undefined, semExtensao(f.name));
    } catch (e) { a.status(t('Não deu para abrir este arquivo') + ': ' + (e.message || e)); }
  }
}
function baixar(blob, nome) {
  const url = URL.createObjectURL(blob), l = el('a', { href: url, download: nome.replace(/[\\/:*?"<>|]+/g, '-') });
  document.body.append(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ── diálogos ──
function formulario(titulo, campos, { ok = 'OK', aoMudar, largura } = {}) {
  return new Promise(resolver => {
    const dl = $('dialogo'), form = el('form', { method: 'dialog' }), ctrl = {};
    if (largura) dl.style.minWidth = largura;
    for (const c of campos) {
      if (c.tipo === 'nota') { form.append(el('p', { textContent: t(c.texto) })); continue; }
      let i;
      if (c.tipo === 'lista') { i = el('select'); for (const [v, r] of c.valores) i.append(el('option', { value: v, textContent: t(r) })); i.value = c.valor; }
      else if (c.tipo === 'sim') i = el('input', { type: 'checkbox', checked: !!c.valor });
      else if (c.tipo === 'faixa') i = el('input', { type: 'range', min: c.min, max: c.max, value: c.valor });
      else if (c.tipo === 'texto') i = el('input', { type: 'text', value: c.valor ?? '', maxLength: 120 });
      else i = el('input', { type: 'number', min: c.min ?? 1, max: c.max ?? LADO_MAX, step: c.passo ?? 1, value: c.valor, required: true });
      ctrl[c.k] = i;
      i.addEventListener('input', () => aoMudar?.(ctrl, c.k));
      form.append(c.tipo === 'sim' ? el('label', { className: 'sim' }, i, t(c.rotulo)) : el('label', {}, t(c.rotulo), i));
    }
    const fim = v => { dl.close(); dl.style.minWidth = ''; resolver(v); };
    const cancelar = el('button', { type: 'button', className: 'botao', textContent: t('Cancelar'), onclick: () => fim(null) });
    form.append(el('div', { className: 'acoes' }, cancelar, el('button', { type: 'submit', className: 'botao primario', textContent: t(ok) })));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = {};
      for (const [k, i] of Object.entries(ctrl)) v[k] = i.type === 'checkbox' ? i.checked : i.type === 'number' || i.type === 'range' ? Number(i.value) : i.value;
      fim(v);
    });
    dl.oncancel = e => { e.preventDefault(); fim(null); };
    dl.replaceChildren(el('h2', { textContent: t(titulo) }), form);
    dl.showModal();
    form.querySelector('input,select')?.focus();
  });
}
const confirmar = texto => formulario('Tem certeza?', [{ tipo: 'nota', texto }], { ok: 'Continuar' });

// ── comandos ──
const temDoc = () => !!a.doc, temCamada = () => !!a.doc?.ativa, temSel = () => !!a.doc?.sel, temMascara = () => !!a.doc?.ativa?.mascara;
let clip = null;
const naoSalvo = async () => !a.doc?.sujo || await confirmar('A imagem aberta tem mudanças que não foram salvas. Deseja substituir?');
function travada() { const c = a.doc?.ativa; if (c?.travada && a.doc.alvo !== 'mascara') { a.status(t('Esta camada está travada')); return true; } return false; }
const trocarSel = (nome, fn) => { const d = a.doc; d.acao(t(nome), () => { const s = fn(); d.sel = S.vazia(s) ? null : s; }); };
const mudarCamada = (nome, fn, bytes = 0) => { const d = a.doc, c = d.ativa; return d.acao(t(nome), () => fn(c, d), { bytes }); };

function centroDe(c) { return { x: c.x + c.canvas.width / 2, y: c.y + c.canvas.height / 2 }; }
function matrizCamada(c, m) { const p = centroDe(c); return new DOMMatrix().translate(p.x, p.y).multiply(m).translate(-p.x, -p.y); }
const transformarAtiva = (nome, m) => mudarCamada(nome, (c, d) => d.transformarCamada(c.id, matrizCamada(c, m), false), bytesDe(a.doc.ativa.canvas));
const bytesTudo = () => a.doc.camadas.reduce((s, c) => s + bytesDe(c.canvas), 0);

async function copiar() {
  const r = copiarRegiao(a.doc);
  if (!r) return a.status(t('A seleção não alcança esta camada'));
  clip = r;
  a.status(t('Copiado'));
  try { const b = await new Promise(ok => r.canvas.toBlob(ok, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); } catch {}
}
function colarClip(canvasDeFora) {
  if (canvasDeFora && !(clip && clip.canvas.width === canvasDeFora.width && clip.canvas.height === canvasDeFora.height)) return colarCanvas(canvasDeFora, undefined, undefined, t('Colado'));
  if (clip) colarCanvas(clonar(clip.canvas), clip.x, clip.y, t('Colado'));
  else a.status(t('Nada para colar'));
}

const COMANDOS = {
  novo: { rotulo: 'Nova imagem…', tecla: 'Ctrl+N', async fn() {
    if (!await naoSalvo()) return;
    const PRE = [['1920x1080', '1920 × 1080'], ['1280x720', '1280 × 720'], ['1080x1080', '1080 × 1080'], ['1080x1920', '1080 × 1920'], ['2480x3508', 'A4 (300 dpi)']];
    const v = await formulario('Nova imagem', [
      { k: 'pre', tipo: 'lista', rotulo: 'Modelo', valor: '1920x1080', valores: PRE },
      { k: 'w', rotulo: 'Largura', valor: 1920 }, { k: 'h', rotulo: 'Altura', valor: 1080 },
      { k: 'fundo', tipo: 'lista', rotulo: 'Fundo', valor: 'branco', valores: [['branco', 'Branco'], ['transparente', 'Transparente'], ['frente', 'Cor de frente'], ['verso', 'Cor de fundo']] },
    ], { ok: 'Criar', aoMudar(c, k) { if (k === 'pre') { const [w, h] = c.pre.value.split('x'); c.w.value = w; c.h.value = h; } } });
    if (!v) return;
    if (!tamanhoValido(v.w, v.h)) return a.status(t('Imagem grande demais'));
    const c = novoCanvas(v.w, v.h), cor = { branco: '#ffffff', frente: a.cores.frente, verso: a.cores.fundo }[v.fundo];
    if (cor) { const k = ctx2d(c); k.fillStyle = cor; k.fillRect(0, 0, v.w, v.h); }
    definirDoc(docDeCanvas(c, t('sem-titulo')));
    a.doc.camadas[0].nome = t('Fundo');
    agendarRascunho(); pintarPaineis();
  } },
  abrir: { rotulo: 'Abrir…', tecla: 'Ctrl+O', async fn() { if (await naoSalvo()) $('abrir-arquivo').click(); } },
  importar: { rotulo: 'Abrir como camadas…', tecla: 'Ctrl+Alt+O', fn() { $('importar-arquivo').click(); } },
  salvar: { rotulo: 'Salvar projeto', tecla: 'Ctrl+S', ok: temDoc, async fn() {
    a.status(t('Salvando…'));
    try { baixar(await projetoBlob(a.doc), a.doc.nome + '.retoque'); a.doc.sujo = false; a.status(t('Projeto salvo')); }
    catch (e) { a.status(String(e.message || e)); }
  } },
  exportar: { rotulo: 'Exportar imagem…', tecla: 'Ctrl+E', ok: temDoc, async fn() {
    const v = await formulario('Exportar imagem', [
      { k: 'nome', tipo: 'texto', rotulo: 'Nome', valor: a.doc.nome },
      { k: 'tipo', tipo: 'lista', rotulo: 'Formato', valor: 'image/png', valores: [['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WebP']] },
      { k: 'q', tipo: 'faixa', rotulo: 'Qualidade', min: 1, max: 100, valor: 90 },
      { tipo: 'nota', texto: 'A qualidade vale para JPG e WebP. JPG não tem transparência: ela vira branco.' },
    ], { ok: 'Exportar' });
    if (!v) return;
    try {
      const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[v.tipo];
      baixar(await exportarBlob(a.doc, v.tipo, v.q / 100), (v.nome || a.doc.nome) + ext);
      a.doc.sujo = false; a.status(t('Imagem exportada'));
    } catch (e) { a.status(String(e.message || e)); }
  } },
  sobre: { rotulo: 'Sobre o RetoqueShop 1.0', fn() { mostrarAbertura(); } },
  fechar: { rotulo: 'Fechar imagem', ok: temDoc, async fn() {
    if (!await naoSalvo()) return;
    clearTimeout(timerRascunho); definirDoc(null);
    try { await apagarRascunho(); } catch {}
  } },
  desfazer: { rotulo: 'Desfazer', tecla: 'Ctrl+Z', ok: () => a.doc?.pos > 0, fn() { a.doc.desfazer(); } },
  refazer: { rotulo: 'Refazer', tecla: 'Ctrl+Y', ok: () => a.doc && a.doc.pos < a.doc.pilha.length, fn() { a.doc.refazer(); } },
  recortar: { rotulo: 'Recortar', tecla: 'Ctrl+X', ok: temCamada, async fn() { if (travada()) return; await copiar(); limpar(a.doc, t('Recortar')); } },
  copiar: { rotulo: 'Copiar', tecla: 'Ctrl+C', ok: temCamada, fn: copiar },
  colar: { rotulo: 'Colar', async fn() {
    try {
      for (const item of await navigator.clipboard.read()) {
        const tipo = item.types.find(x => x.startsWith('image/'));
        if (tipo) return colarClip(await arquivoParaCanvas(await item.getType(tipo)));
      }
    } catch {}
    colarClip();
  } },
  preencherFrente: { rotulo: 'Preencher com a cor de frente', tecla: 'Ctrl+,', ok: temCamada, fn() { if (!travada()) preencherTudo(a.doc, a.cores.frente, t('Preencher')); } },
  preencherFundo: { rotulo: 'Preencher com a cor de fundo', tecla: 'Ctrl+.', ok: temCamada, fn() { if (!travada()) preencherTudo(a.doc, a.cores.fundo, t('Preencher')); } },
  limpar: { rotulo: 'Limpar', tecla: 'Delete', ok: temCamada, fn() { if (!travada()) limpar(a.doc, t('Limpar')); } },

  selTudo: { rotulo: 'Tudo', tecla: 'Ctrl+A', ok: temDoc, fn() { trocarSel('Selecionar tudo', () => new Uint8Array(a.doc.w * a.doc.h).fill(255)); } },
  selNada: { rotulo: 'Nada', tecla: 'Ctrl+Shift+A', ok: temSel, fn() { trocarSel('Nada selecionado', () => null); } },
  selInverter: { rotulo: 'Inverter', tecla: 'Ctrl+I', ok: temDoc, fn() { trocarSel('Inverter seleção', () => S.inverter(a.doc.sel, a.doc.w * a.doc.h)); } },
  selCamada: { rotulo: 'Da transparência da camada', ok: temCamada, fn() {
    const d = a.doc, c = d.ativa, w = c.canvas.width, h = c.canvas.height, dd = ctx2d(c.canvas).getImageData(0, 0, w, h).data;
    trocarSel('Seleção da camada', () => {
      const s = new Uint8Array(d.w * d.h);
      for (let y = Math.max(0, c.y); y < Math.min(d.h, c.y + h); y++) for (let x = Math.max(0, c.x); x < Math.min(d.w, c.x + w); x++) s[y * d.w + x] = dd[((y - c.y) * w + x - c.x) * 4 + 3];
      return s;
    });
  } },
  selSuavizar: { rotulo: 'Suavizar…', ok: temSel, async fn() { const v = await formulario('Suavizar seleção', [{ k: 'r', rotulo: 'Raio (px)', valor: 5, min: 1, max: 500 }]); if (v) trocarSel('Suavizar seleção', () => S.suavizar(a.doc.sel, a.doc.w, a.doc.h, v.r)); } },
  selCrescer: { rotulo: 'Crescer…', ok: temSel, async fn() { const v = await formulario('Crescer seleção', [{ k: 'r', rotulo: 'Raio (px)', valor: 5, min: 1, max: 2000 }]); if (v) trocarSel('Crescer seleção', () => S.crescer(a.doc.sel, a.doc.w, a.doc.h, v.r)); } },
  selEncolher: { rotulo: 'Encolher…', ok: temSel, async fn() { const v = await formulario('Encolher seleção', [{ k: 'r', rotulo: 'Raio (px)', valor: 5, min: 1, max: 2000 }]); if (v) trocarSel('Encolher seleção', () => S.encolher(a.doc.sel, a.doc.w, a.doc.h, v.r)); } },

  imgEscalar: { rotulo: 'Tamanho da imagem…', ok: temDoc, async fn() {
    const d = a.doc, razao = d.w / d.h;
    const v = await formulario('Tamanho da imagem', [{ k: 'w', rotulo: 'Largura', valor: d.w }, { k: 'h', rotulo: 'Altura', valor: d.h }, { k: 'prop', tipo: 'sim', rotulo: 'Manter proporção', valor: true }], {
      aoMudar(c, k) { if (!c.prop.checked) return; if (k === 'w') c.h.value = Math.max(1, Math.round(c.w.value / razao)); if (k === 'h') c.w.value = Math.max(1, Math.round(c.h.value * razao)); },
    });
    if (!v) return;
    if (!tamanhoValido(v.w, v.h)) return a.status(t('Imagem grande demais'));
    d.acao(t('Tamanho da imagem'), () => d.escalar(v.w, v.h), { bytes: bytesTudo() }); ajustar();
  } },
  imgTela: { rotulo: 'Tamanho da tela…', ok: temDoc, async fn() {
    const d = a.doc;
    const v = await formulario('Tamanho da tela', [{ k: 'w', rotulo: 'Largura', valor: d.w }, { k: 'h', rotulo: 'Altura', valor: d.h }, { k: 'centro', tipo: 'sim', rotulo: 'Centralizar o conteúdo', valor: true }]);
    if (!v) return;
    if (!tamanhoValido(v.w, v.h)) return a.status(t('Imagem grande demais'));
    d.acao(t('Tamanho da tela'), () => d.tela(v.w, v.h, v.centro ? Math.round((v.w - d.w) / 2) : 0, v.centro ? Math.round((v.h - d.h) / 2) : 0)); ajustar();
  } },
  imgCortarSel: { rotulo: 'Cortar para a seleção', ok: temSel, fn() {
    const d = a.doc, b = S.caixa(d.sel, d.w, d.h);
    if (b) { d.acao(t('Cortar'), () => d.tela(b.w, b.h, -b.x, -b.y)); ajustar(); }
  } },
  imgGirarH: { rotulo: 'Girar 90° à direita', ok: temDoc, fn() { a.doc.acao(t('Girar imagem'), () => a.doc.girarImagem(true), { bytes: bytesTudo() }); ajustar(); } },
  imgGirarA: { rotulo: 'Girar 90° à esquerda', ok: temDoc, fn() { a.doc.acao(t('Girar imagem'), () => a.doc.girarImagem(false), { bytes: bytesTudo() }); ajustar(); } },
  imgGirar180: { rotulo: 'Girar 180°', ok: temDoc, fn() { a.doc.acao(t('Girar imagem'), () => { a.doc.girarImagem(true); a.doc.girarImagem(true); }, { bytes: bytesTudo() }); } },
  imgEspelharH: { rotulo: 'Espelhar na horizontal', ok: temDoc, fn() { a.doc.acao(t('Espelhar imagem'), () => a.doc.espelharImagem(true), { bytes: bytesTudo() }); } },
  imgEspelharV: { rotulo: 'Espelhar na vertical', ok: temDoc, fn() { a.doc.acao(t('Espelhar imagem'), () => a.doc.espelharImagem(false), { bytes: bytesTudo() }); } },
  imgAchatar: { rotulo: 'Achatar imagem', ok: temDoc, fn() { a.doc.acao(t('Achatar imagem'), () => a.doc.achatar(t('Fundo'), a.cores.fundo), { bytes: bytesDe(a.doc.comp) }); } },

  camNova: { rotulo: 'Nova camada', tecla: 'Ctrl+Shift+N', ok: temDoc, fn() { const d = a.doc; d.acao(t('Nova camada'), () => d.adicionar(d.novaVazia(t('Camada') + ' ' + (d.camadas.length + 1))), { bytes: bytesDe(d.comp) }); } },
  camDuplicar: { rotulo: 'Duplicar camada', tecla: 'Ctrl+Shift+D', ok: temCamada, fn() { mudarCamada('Duplicar camada', (c, d) => d.duplicar(c.id, n => n + ' ' + t('cópia')), bytesDe(a.doc.ativa.canvas)); } },
  camExcluir: { rotulo: 'Excluir camada', ok: () => a.doc?.camadas.length > 1, fn() { mudarCamada('Excluir camada', (c, d) => d.excluir(c.id)); } },
  camMesclar: { rotulo: 'Mesclar para baixo', ok: () => a.doc?.ativa && a.doc.camadas[0] !== a.doc.ativa, fn() { mudarCamada('Mesclar para baixo', (c, d) => d.mesclarAbaixo(c.id), bytesDe(a.doc.comp)); } },
  camSubir: { rotulo: 'Subir camada', ok: temCamada, fn() { mudarCamada('Subir camada', (c, d) => d.mover(c.id, 1)); } },
  camDescer: { rotulo: 'Descer camada', ok: temCamada, fn() { mudarCamada('Descer camada', (c, d) => d.mover(c.id, -1)); } },
  camImagem: { rotulo: 'Camada do tamanho da imagem', ok: temCamada, fn() { mudarCamada('Camada do tamanho da imagem', (c, d) => d.camadaParaImagem(c.id), bytesDe(a.doc.comp)); } },
  camGirar: { rotulo: 'Girar camada 90°', ok: temCamada, fn() { if (!travada()) transformarAtiva('Girar camada', new DOMMatrix([0, 1, -1, 0, 0, 0])); } },
  camEspelharH: { rotulo: 'Espelhar camada na horizontal', ok: temCamada, fn() { if (!travada()) transformarAtiva('Espelhar camada', new DOMMatrix([-1, 0, 0, 1, 0, 0])); } },
  camEspelharV: { rotulo: 'Espelhar camada na vertical', ok: temCamada, fn() { if (!travada()) transformarAtiva('Espelhar camada', new DOMMatrix([1, 0, 0, -1, 0, 0])); } },
  masBranca: { rotulo: 'Máscara: revela tudo', ok: () => a.doc?.ativa && !a.doc.ativa.mascara, fn() { mudarCamada('Adicionar máscara', (c, d) => d.adicionarMascara(c.id, 'branca'), bytesDe(a.doc.ativa.canvas)); } },
  masPreta: { rotulo: 'Máscara: esconde tudo', ok: () => a.doc?.ativa && !a.doc.ativa.mascara, fn() { mudarCamada('Adicionar máscara', (c, d) => d.adicionarMascara(c.id, 'preta'), bytesDe(a.doc.ativa.canvas)); } },
  masSel: { rotulo: 'Máscara: da seleção', ok: () => a.doc?.sel && a.doc.ativa && !a.doc.ativa.mascara, fn() { mudarCamada('Adicionar máscara', (c, d) => d.adicionarMascara(c.id, 'selecao'), bytesDe(a.doc.ativa.canvas)); } },
  masAlfa: { rotulo: 'Máscara: da transparência', ok: () => a.doc?.ativa && !a.doc.ativa.mascara, fn() { mudarCamada('Adicionar máscara', (c, d) => d.adicionarMascara(c.id, 'alfa'), bytesDe(a.doc.ativa.canvas)); } },
  masAplicar: { rotulo: 'Aplicar máscara', ok: temMascara, fn() { mudarCamada('Aplicar máscara', (c, d) => d.aplicarMascara(c.id), bytesDe(a.doc.ativa.canvas)); } },
  masExcluir: { rotulo: 'Excluir máscara', ok: temMascara, fn() { mudarCamada('Excluir máscara', (c, d) => d.excluirMascara(c.id)); } },
  masLigar: { rotulo: 'Ligar ou desligar máscara', ok: temMascara, fn() { mudarCamada('Ligar ou desligar máscara', c => { c.mascaraLigada = !c.mascaraLigada; }); } },

  verMais: { rotulo: 'Aproximar', tecla: '+', ok: temDoc, fn() { a.definirZoom(a.zoom * 1.5); } },
  verMenos: { rotulo: 'Afastar', tecla: '-', ok: temDoc, fn() { a.definirZoom(a.zoom / 1.5); } },
  ver100: { rotulo: '100%', tecla: '1', ok: temDoc, fn() { a.definirZoom(1); } },
  verAjustar: { rotulo: 'Ajustar à janela', tecla: 'Ctrl+Shift+J', ok: temDoc, fn: ajustar },
  verCheia: { rotulo: 'Tela cheia', tecla: 'F11', fn() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); } },
};
const MENUS = [
  ['Arquivo', ['novo', 'abrir', 'importar', '-', 'salvar', 'exportar', '-', 'fechar']],
  ['Editar', ['desfazer', 'refazer', '-', 'recortar', 'copiar', 'colar', '-', 'preencherFrente', 'preencherFundo', 'limpar']],
  ['Selecionar', ['selTudo', 'selNada', 'selInverter', 'selCamada', '-', 'selSuavizar', 'selCrescer', 'selEncolher']],
  ['Imagem', ['imgEscalar', 'imgTela', 'imgCortarSel', '-', 'imgGirarH', 'imgGirarA', 'imgGirar180', 'imgEspelharH', 'imgEspelharV', '-', 'imgAchatar']],
  ['Camada', ['camNova', 'camDuplicar', 'camExcluir', 'camMesclar', '-', 'camSubir', 'camDescer', 'camImagem', '-', 'camGirar', 'camEspelharH', 'camEspelharV', '-', 'masBranca', 'masPreta', 'masSel', 'masAlfa', 'masAplicar', 'masExcluir', 'masLigar']],
  ['Exibir', ['verMais', 'verMenos', 'ver100', 'verAjustar', 'verCheia', '-', 'sobre']],
];
// o transformar em andamento é aplicado antes de qualquer comando, e a caixa volta depois sobre o resultado
async function executar(id) {
  const c = COMANDOS[id];
  if (!c || (c.ok && !c.ok())) return;
  const transf = ferramenta.id === 'transformar' && ferramenta.b;
  if (transf) { if (id === 'desfazer') { ferramenta.cancelar(a); pedirTela(); return; } trocando = true; ferramenta.enter(a); trocando = false; }
  ferramenta.cancelar && ferramenta.id === 'cortar' && (id === 'desfazer' || id === 'refazer') && ferramenta.cancelar(a);
  await c.fn();
  if (ferramenta.id === 'transformar' && a.doc && !a.doc.sel) ferramenta.ativar(a);
  pedirTela();
}
const teclaBonita = s => (MAC ? s.replace('Ctrl+Shift+', '⇧⌘').replace('Ctrl+Alt+', '⌥⌘').replace('Ctrl+', '⌘') : s);
function montarMenus() {
  const barra = $('menus');
  barra.replaceChildren(el('span', { className: 'marca', textContent: 'RetoqueShop 1.0' }));
  const fechar = () => barra.querySelectorAll('.aberto').forEach(m => m.classList.remove('aberto'));
  for (const [nome, itens] of MENUS) {
    const lista = el('div', { className: 'lista-menu', role: 'menu' }), m = el('div', { className: 'menu' });
    const preencher = () => {
      lista.replaceChildren(...itens.map(id => {
        if (id === '-') return el('hr');
        const c = COMANDOS[id], b = el('button', { type: 'button', role: 'menuitem', disabled: !!(c.ok && !c.ok()) }, el('span', { textContent: t(c.rotulo) }));
        if (c.tecla) b.append(el('kbd', { textContent: teclaBonita(c.tecla) }));
        b.onclick = () => { fechar(); executar(id); };
        return b;
      }));
    };
    const botao = el('button', { type: 'button', textContent: t(nome), 'ariaHasPopup': 'menu' });
    botao.onclick = () => { const ia = m.classList.contains('aberto'); fechar(); if (!ia) { preencher(); m.classList.add('aberto'); } };
    botao.onpointerenter = () => { if (barra.querySelector('.aberto') && !m.classList.contains('aberto')) { fechar(); preencher(); m.classList.add('aberto'); } };
    m.append(botao, lista); barra.append(m);
  }
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.menu')) fechar(); });
  a.fecharMenus = fechar;
}

// ── caixa de ferramentas e opções ──
const rotuloAtalho = k => (k === k.toUpperCase() ? 'Shift+' + k : k.toUpperCase());
function montarCaixa() {
  const c = $('caixa');
  c.replaceChildren(...FERRAMENTAS.map(f => {
    const b = el('button', { type: 'button', title: `${t(f.nome)} (${rotuloAtalho(f.atalho)})`, onclick: () => selecionar(f.id) }, icone(f.icone));
    b.dataset.ferramenta = f.id; b.setAttribute('aria-label', t(f.nome));
    return b;
  }));
  const frente = el('input', { type: 'color', className: 'frente', value: a.cores.frente, title: t('Cor de frente') });
  const fundo = el('input', { type: 'color', className: 'fundo', value: a.cores.fundo, title: t('Cor de fundo') });
  frente.addEventListener('input', () => a.definirCor('frente', frente.value));
  fundo.addEventListener('input', () => a.definirCor('fundo', fundo.value));
  c.append(el('div', { className: 'cores' }, frente, fundo));
  c.append(el('button', { type: 'button', className: 'trocar-cores', textContent: '⇄', title: t('Trocar cores') + ' (X)', onclick: trocarCores }));
  c.append(el('button', { type: 'button', className: 'trocar-cores', textContent: '◧', title: t('Cores padrão') + ' (D)', onclick: coresPadrao }));
}
function trocarCores() { const { frente, fundo } = a.cores; a.definirCor('frente', fundo); a.definirCor('fundo', frente); }
function coresPadrao() { a.definirCor('frente', '#000000'); a.definirCor('fundo', '#ffffff'); }
function selecionar(id) {
  const f = FERRAMENTAS.find(x => x.id === id);
  if (!f) return;
  trocando = true; ferramenta.desativar?.(a); trocando = false;
  ferramenta = f;
  $('caixa').querySelectorAll('[data-ferramenta]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ferramenta === id)));
  tela.style.cursor = f.cursor || 'default';
  mostrarOpcoes();
  f.ativar?.(a);
  pedirTela();
}
function mostrarOpcoes() {
  const f = ferramenta, o = f.o, barra = $('opcoes');
  const mudou = k => { f.mudou?.(a, k); pedirTela(); };
  const nos = [el('span', { className: 'nome-ferramenta', textContent: t(f.nome) })];
  for (const op of f.opcoes || []) {
    if (op.tipo === 'dica') nos.push(el('span', { className: 'dica', textContent: t(op.texto) }));
    else if (op.tipo === 'botao') nos.push(el('button', { type: 'button', className: 'botao primario', textContent: t(op.rotulo), onclick: () => { f[op.acao]?.(a); pedirTela(); } }));
    else if (op.tipo === 'modo') {
      const grupo = el('span', { className: 'modos', role: 'group' });
      for (const [v, r, ic] of op.valores) {
        const b = el('button', { type: 'button', title: t(r) }, icone(ic));
        b.setAttribute('aria-label', t(r)); b.setAttribute('aria-pressed', String(o[op.k] === v));
        b.onclick = () => { o[op.k] = v; mostrarOpcoes(); };
        grupo.append(b);
      }
      nos.push(grupo);
    } else if (op.tipo === 'sim') {
      const i = el('input', { type: 'checkbox', checked: !!o[op.k] });
      i.dataset.opcao = op.k; i.onchange = () => { o[op.k] = i.checked; mudou(op.k); };
      nos.push(el('label', {}, i, t(op.rotulo)));
    } else if (op.tipo === 'lista') {
      const i = el('select');
      for (const [v, r] of op.valores) i.append(el('option', { value: v, textContent: t(r) }));
      i.value = o[op.k]; i.dataset.opcao = op.k; i.onchange = () => { o[op.k] = i.value; mudou(op.k); };
      nos.push(el('label', {}, t(op.rotulo), i));
    } else if (op.tipo === 'area') {
      const i = el('textarea', { value: o[op.k] ?? '', placeholder: t(op.dica || '') });
      i.dataset.opcao = op.k; i.oninput = () => { o[op.k] = i.value; mudou(op.k); };
      nos.push(el('label', {}, t(op.rotulo), i));
    } else {
      const num = el('input', { type: 'number', min: op.min, max: op.max, value: o[op.k] });
      num.dataset.opcao = op.k;
      const ler = v => { const n = Math.min(op.max, Math.max(op.min, Number(v) || op.min)); o[op.k] = n; return n; };
      if (op.tipo === 'faixa') {
        const paraBarra = v => (op.curva ? Math.round(100 * Math.log(v / op.min) / Math.log(op.max / op.min)) : v), deBarra = v => (op.curva ? Math.round(op.min * (op.max / op.min) ** (v / 100)) : Number(v));
        const r = op.curva ? el('input', { type: 'range', min: 0, max: 100, value: paraBarra(o[op.k]) }) : el('input', { type: 'range', min: op.min, max: op.max, value: o[op.k] });
        r.setAttribute('aria-label', t(op.rotulo));
        r.oninput = () => { num.value = ler(deBarra(r.value)); mudou(op.k); };
        num.onchange = () => { num.value = ler(num.value); r.value = paraBarra(o[op.k]); mudou(op.k); };
        nos.push(el('label', {}, t(op.rotulo), r, num, op.un || ''));
      } else {
        num.onchange = () => { num.value = ler(num.value); mudou(op.k); };
        nos.push(el('label', {}, t(op.rotulo), num, op.un || ''));
      }
    }
  }
  barra.replaceChildren(...nos);
}

// ── painéis ──
let pedidoPaineis = false;
function agendarPaineis() { if (!pedidoPaineis) { pedidoPaineis = true; requestAnimationFrame(() => { pedidoPaineis = false; pintarPaineis(); rodape(); }); } }
function miniatura(fonte, mascara) {
  const c = novoCanvas(68, 68), k = c.getContext('2d'), z = Math.min(68 / fonte.width, 68 / fonte.height), w = Math.max(1, fonte.width * z), h = Math.max(1, fonte.height * z);
  k.imageSmoothingQuality = 'high';
  if (mascara) { k.fillStyle = '#000'; k.fillRect(0, 0, 68, 68); const t0 = novoCanvas(68, 68), q = t0.getContext('2d'); q.drawImage(fonte, (68 - w) / 2, (68 - h) / 2, w, h); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#fff'; q.fillRect(0, 0, 68, 68); k.drawImage(t0, 0, 0); }
  else k.drawImage(fonte, (68 - w) / 2, (68 - h) / 2, w, h);
  return c;
}
// mudança vinda do painel: o transformar em andamento é aplicado antes, como nos comandos
function doPainel(fn) {
  if (ferramenta.id === 'transformar' && ferramenta.b) { trocando = true; ferramenta.enter(a); trocando = false; }
  fn();
  if (ferramenta.id === 'transformar' && a.doc && !a.doc.sel) ferramenta.ativar(a);
  pedirTela();
}
let controles = null;
function montarPainelCamadas() {
  const p = $('painel-camadas');
  const mistura = el('select'); for (const [v, r] of MISTURAS) mistura.append(el('option', { value: v, textContent: t(r) }));
  const op = el('input', { type: 'range', min: 0, max: 100, value: 100 });
  mistura.onchange = () => doPainel(() => { const c = a.doc?.ativa; if (c) a.doc.acao(t('Modo da camada'), () => { c.mistura = mistura.value; }); });
  op.oninput = () => { const c = a.doc?.ativa; if (c) a.doc.acao(t('Opacidade da camada'), () => { c.opacidade = op.value / 100; }, { unir: 'op' + c.id }); };
  const lista = el('ul', { className: 'camadas' });
  const barra = el('div', { className: 'barra-camadas' });
  const botoes = [['nova', 'camNova', 'Nova camada'], ['duplicar', 'camDuplicar', 'Duplicar camada'], ['subir', 'camSubir', 'Subir camada'], ['descer', 'camDescer', 'Descer camada'], ['mascara', 'masBranca', 'Adicionar máscara'], ['lixo', 'camExcluir', 'Excluir camada']].map(([ic, id, r]) => {
    const b = el('button', { type: 'button', title: t(r), onclick: () => executar(id) }, icone(ic));
    b.setAttribute('aria-label', t(r)); b.dataset.cmd = id;
    barra.append(b);
    return b;
  });
  p.append(el('h2', { textContent: t('Camadas') }), el('div', { className: 'ajustes' }, el('span', { textContent: t('Modo') }), mistura, el('span', { textContent: t('Opacidade') }), op), lista, barra);
  controles = { mistura, op, lista, botoes };
  $('painel-historico').append(el('h2', { textContent: t('Histórico') }), el('ol', { className: 'historico' }));
}
function pintarPaineis() {
  const d = a.doc, k = controles, c = d?.ativa;
  for (const i of [k.mistura, k.op]) i.disabled = !c;
  if (c) { k.mistura.value = c.mistura; k.op.value = Math.round(c.opacidade * 100); }
  for (const b of k.botoes) { const co = COMANDOS[b.dataset.cmd]; b.disabled = !!(co.ok && !co.ok()); }
  k.lista.replaceChildren(...(d ? [...d.camadas].reverse().map(linhaDeCamada) : []));
  const h = $('painel-historico').querySelector('.historico');
  if (!d) return h.replaceChildren();
  const passo = (nome, ic, classe, ir) => {
    const b = el('button', { type: 'button', className: classe, title: nome, onclick: () => doPainel(ir) }, icone(ic), el('span', { textContent: nome }));
    return el('li', {}, b);
  };
  const inicial = passo(t('Início'), 'inicio', d.pos === 0 ? 'atual' : '', () => d.irPara(0));
  // o mais novo fica em cima, e o Início, embaixo
  h.replaceChildren(...d.pilha.map((e, i) => passo(e.nome, iconeDoPasso(e.nome), i + 1 === d.pos ? 'atual' : i >= d.pos ? 'futuro' : '', () => d.irPara(i + 1))).reverse(), inicial);
  h.querySelector('.atual')?.scrollIntoView({ block: 'nearest' });
}
function linhaDeCamada(c) {
  const d = a.doc, li = el('li', { className: c.id === d.ativaId ? 'ativa' : '', draggable: true });
  li.dataset.id = c.id;
  const olho = el('button', { type: 'button', className: 'olho', title: t('Mostrar ou esconder'), onclick: e => { e.stopPropagation(); d.acao(t('Mostrar ou esconder'), () => { const k = d.camadas.find(x => x.id === c.id); k.visivel = !k.visivel; }); } }, icone('olho'));
  olho.setAttribute('aria-pressed', String(c.visivel)); olho.setAttribute('aria-label', t('Mostrar ou esconder'));
  const cadeado = el('button', { type: 'button', className: 'cadeado', title: t('Travar camada'), onclick: e => { e.stopPropagation(); d.acao(t('Travar camada'), () => { const k = d.camadas.find(x => x.id === c.id); k.travada = !k.travada; }); } }, icone('trava'));
  cadeado.setAttribute('aria-pressed', String(!!c.travada)); cadeado.setAttribute('aria-label', t('Travar camada'));
  const mini = el('button', { type: 'button', className: 'mini' + (c.id === d.ativaId && d.alvo === 'camada' && c.mascara ? ' alvo' : ''), title: t('Editar a camada') }, miniatura(c.canvas));
  mini.setAttribute('aria-label', t('Editar a camada'));
  mini.onclick = e => { e.stopPropagation(); doPainel(() => d.ativar(c.id, 'camada')); };
  li.append(olho, cadeado, mini);
  if (c.mascara) {
    const mm = el('button', { type: 'button', className: 'mini' + (c.id === d.ativaId && d.alvo === 'mascara' ? ' alvo' : ''), title: t('Editar a máscara') }, miniatura(c.mascara, true));
    mm.setAttribute('aria-label', t('Editar a máscara'));
    mm.onclick = e => { e.stopPropagation(); doPainel(() => d.ativar(c.id, 'mascara')); };
    li.append(mm);
  }
  const rot = el('span', { className: 'rotulo', textContent: c.nome, title: t('Duplo clique para renomear') });
  rot.ondblclick = e => {
    e.stopPropagation();
    const i = el('input', { type: 'text', value: c.nome, maxLength: 120 });
    const fim = ok => { const v = i.value.trim(); i.onblur = null; if (ok && v && v !== c.nome) d.acao(t('Renomear camada'), () => { d.camadas.find(x => x.id === c.id).nome = v; }); else pintarPaineis(); };
    i.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') fim(true); if (ev.key === 'Escape') fim(false); };
    i.onblur = () => fim(true);
    rot.replaceWith(i); li.draggable = false; i.focus(); i.select();
  };
  li.append(rot);
  li.onclick = () => doPainel(() => d.ativar(c.id, d.ativaId === c.id ? d.alvo : 'camada'));
  li.ondragstart = e => { e.dataTransfer.setData('text/x-retoque-camada', String(c.id)); e.dataTransfer.effectAllowed = 'move'; };
  const limparMarca = () => li.classList.remove('solta-acima', 'solta-abaixo');
  const acima = e => e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2;
  li.ondragover = e => { if (!e.dataTransfer.types.includes('text/x-retoque-camada')) return; e.preventDefault(); limparMarca(); li.classList.add(acima(e) ? 'solta-acima' : 'solta-abaixo'); };
  li.ondragleave = limparMarca;
  li.ondrop = e => {
    limparMarca();
    const id = Number(e.dataTransfer.getData('text/x-retoque-camada'));
    if (!id || id === c.id) return;
    e.preventDefault(); e.stopPropagation();
    const em = acima(e);
    doPainel(() => d.acao(t('Mover camada na lista'), () => {
      const resto = d.camadas.filter(x => x.id !== id), i = resto.findIndex(x => x.id === c.id);
      d.moverPara(id, em ? i + 1 : i);
    }));
  };
  return li;
}
function rodape() {
  const d = a.doc;
  $('r-tam').textContent = d ? `${d.w} × ${d.h} px · ${d.camadas.length} ${t(d.camadas.length === 1 ? 'camada' : 'camadas')}` : '';
  $('r-pos').textContent = d && a.ponteiro ? `${Math.floor(a.ponteiro.x)}, ${Math.floor(a.ponteiro.y)}` : '';
  const z = $('r-zoom'), pct = Math.round(a.zoom * 100);
  let s = z.querySelector('select');
  if (!s) { s = el('select'); s.setAttribute('aria-label', t('Zoom')); s.onchange = () => { a.definirZoom(Number(s.value) / 100); s.blur(); }; z.append(s); }
  s.disabled = !d;
  const op = [...new Set([12, 25, 50, 100, 200, 400, 800, pct])].sort((x, y) => x - y);
  s.replaceChildren(...op.map(v => el('option', { value: v, textContent: v + '%' })));
  s.value = pct;
}

// ── ponteiro ──
const posTela = e => { const r = tela.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const paraDoc = p => ({ x: (p.x - a.panX) / a.zoom, y: (p.y - a.panY) / a.zoom });
const evento = e => ({ shiftKey: e.shiftKey, altKey: e.altKey, ctrl: e.ctrlKey || e.metaKey, pressao: e.pointerType === 'pen' && e.pressure ? Math.max(0.1, e.pressure * 1.5) : 1 });
let espaco = false, pan = null;
// o clique na tela não leva o foco: a ferramenta de texto põe o foco no campo dela
tela.addEventListener('mousedown', e => e.preventDefault());
tela.addEventListener('pointerdown', e => {
  a.fecharMenus?.();
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (!a.doc) return;
  tela.setPointerCapture(e.pointerId);
  const p = posTela(e);
  if (e.button === 1 || espaco || ferramenta.pan) { pan = { x: p.x - a.panX, y: p.y - a.panY }; tela.style.cursor = 'grabbing'; e.preventDefault(); return; }
  if (e.button !== 0) return;
  arrastando = true;
  ferramenta.down?.(a, paraDoc(p), evento(e), p);
  pedirTela();
});
tela.addEventListener('pointermove', e => {
  const p = posTela(e);
  if (pan) { a.panX = p.x - pan.x; a.panY = p.y - pan.y; pedirTela(); return; }
  if (!a.doc) return;
  a.ponteiro = paraDoc(p); $('r-pos').textContent = `${Math.floor(a.ponteiro.x)}, ${Math.floor(a.ponteiro.y)}`;
  if (arrastando && ferramenta.move) {
    const lista = ferramenta.pinta && e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of lista.length ? lista : [e]) ferramenta.move(a, paraDoc(posTela(ev)), evento(ev));
  }
  if (ferramenta.pinta || arrastando) pedirTela();
});
const soltar = e => {
  if (pan) { pan = null; tela.style.cursor = espaco ? 'grab' : ferramenta.cursor || 'default'; return; }
  if (!arrastando) return;
  arrastando = false;
  if (a.doc) ferramenta.up?.(a, paraDoc(posTela(e)), evento(e));
  agendarPaineis(); pedirTela();
};
tela.addEventListener('pointerup', soltar);
tela.addEventListener('pointercancel', soltar);
tela.addEventListener('pointerleave', () => { if (!arrastando) { a.ponteiro = null; pedirTela(); } });
tela.addEventListener('wheel', e => {
  e.preventDefault();
  if (!a.doc) return;
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
  if (e.ctrlKey || e.metaKey) a.zoomEm(posTela(e), Math.exp(-dy * 0.005));
  else { a.panX -= e.shiftKey ? dy : dx; a.panY -= e.shiftKey ? 0 : dy; pedirTela(); }
}, { passive: false });

// ── teclado ──
const digitando = e => e.target.closest?.('input:not([type=range]):not([type=checkbox]):not([type=color]), textarea, select, dialog');
const teclaDe = e => {
  let k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (k === 'Backspace') k = 'Delete';
  if (k === '=') k = '+';
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey && e.key.length > 1 ? 'Shift+' : ''}${e.shiftKey && e.key.length === 1 && /[A-Z]/i.test(e.key) ? 'Shift+' : ''}${k}`;
};
const POR_TECLA = Object.fromEntries(Object.entries(COMANDOS).filter(([, c]) => c.tecla).map(([id, c]) => [c.tecla, id]));
POR_TECLA['Ctrl+Shift+Z'] = 'refazer';
// a abertura, como no MicromediaFlash: aparece ao abrir e some ao clicar em fechar, com os pixels saindo em ordem aleatória
const aberturaAberta = () => !$('abertura').hidden;
function mostrarAbertura() { const ab = $('abertura'); ab.style.webkitMaskImage = ab.style.maskImage = 'none'; ab.hidden = false; $('abertura-fechar').focus(); }
function fecharAbertura() {
  const ab = $('abertura');
  if (ab.hidden || ab.dataset.saindo) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { ab.hidden = true; return; }
  ab.dataset.saindo = '1';
  const col = Math.ceil(innerWidth / 10), lin = Math.ceil(innerHeight / 10), ordem = Array.from({ length: col * lin }, (_, i) => i);
  for (let i = ordem.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; }
  const c = document.createElement('canvas'); c.width = col; c.height = lin;
  const g = c.getContext('2d'), inicio = performance.now();
  const quadro = agora => {
    const t = Math.min(1, (agora - inicio) / 380), resta = t >= 1 ? 0 : 2 ** (-10 * t), n = Math.floor(ordem.length * resta);
    g.clearRect(0, 0, col, lin); g.fillStyle = '#000';
    for (let i = 0; i < n; i++) g.fillRect(ordem[i] % col, Math.floor(ordem[i] / col), 1, 1);
    const url = `url(${c.toDataURL()})`;
    ab.style.webkitMaskImage = ab.style.maskImage = url; ab.style.webkitMaskSize = ab.style.maskSize = '100% 100%';
    if (t < 1) requestAnimationFrame(quadro); else { ab.hidden = true; delete ab.dataset.saindo; }
  };
  requestAnimationFrame(quadro);
}
addEventListener('keydown', e => {
  if (aberturaAberta()) { if (e.key === 'Escape') { e.preventDefault(); fecharAbertura(); } e.stopPropagation(); return; }
  if (e.key === 'Escape' && a.fecharMenus && document.querySelector('.menu.aberto')) { a.fecharMenus(); return; }
  if (digitando(e)) return;
  const k = teclaDe(e);
  // Ctrl+V fica com o evento de colar, que traz a imagem de fora
  if (k === 'Ctrl+V') return;
  if (POR_TECLA[k]) { e.preventDefault(); executar(POR_TECLA[k]); return; }
  if (e.key === ' ' && !e.repeat) { espaco = true; if (!arrastando) tela.style.cursor = 'grab'; e.preventDefault(); return; }
  if (e.key === 'Enter') { ferramenta.enter?.(a); pedirTela(); return; }
  if (e.key === 'Escape') { ferramenta.cancelar?.(a); pedirTela(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (ferramenta.tecla?.(a, e)) { e.preventDefault(); return; }
  if (e.key === '[' || e.key === ']') { const o = ferramenta.o; if (o && 'tam' in o && ferramenta.pinta) { o.tam = Math.min(1000, Math.max(1, Math.round(o.tam * (e.key === ']' ? 1.2 : 1 / 1.2)) + (e.key === ']' ? 1 : 0))); mostrarOpcoes(); pedirTela(); } return; }
  if (e.key.length !== 1) return;
  const f = FERRAMENTAS.find(x => x.atalho === e.key);
  if (f) { selecionar(f.id); e.preventDefault(); return; }
  if (e.key.toLowerCase() === 'x' && !e.shiftKey) return trocarCores();
  if (e.key.toLowerCase() === 'd' && !e.shiftKey) return coresPadrao();
});
addEventListener('keyup', e => { if (e.key === ' ') { espaco = false; if (!pan) tela.style.cursor = ferramenta.cursor || 'default'; } });
addEventListener('blur', () => { espaco = false; });

// ── arquivos de fora ──
$('abrir-arquivo').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) abrirArquivo(f); };
$('importar-arquivo').onchange = e => { const l = [...e.target.files]; e.target.value = ''; importarArquivos(l); };
const palco = $('palco');
palco.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); palco.classList.add('soltando'); } });
palco.addEventListener('dragleave', e => { if (e.target === palco || e.target === tela) palco.classList.remove('soltando'); });
palco.addEventListener('drop', e => { palco.classList.remove('soltando'); if (!e.dataTransfer.files.length) return; e.preventDefault(); importarArquivos([...e.dataTransfer.files]); });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => e.preventDefault());
addEventListener('copy', e => { if (!digitando(e) && a.doc?.ativa && e.target.closest?.('body')) e.preventDefault(); });
addEventListener('paste', async e => {
  if (digitando(e)) return;
  const f = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'))?.getAsFile();
  e.preventDefault();
  if (ferramenta.id === 'transformar' && ferramenta.b) { trocando = true; ferramenta.enter(a); trocando = false; }
  try { colarClip(f ? await arquivoParaCanvas(f) : undefined); } catch (er) { a.status(String(er.message || er)); }
});

// ── tema e idioma ──
function aplicarTema() {
  let ui = null;
  try { ui = JSON.parse(localStorage.getItem('oceano:tema-ui')); } catch {}
  if (ui) {
    const raiz = document.documentElement.style;
    for (const k of ['fundo', 'painel', 'elevado', 'borda', 'texto', 'suave', 'acento']) if (ui[k]) raiz.setProperty('--' + k, ui[k]);
    if (/^#[0-9a-f]{6}$/i.test(ui.acento || '')) { const n = parseInt(ui.acento.slice(1), 16); raiz.setProperty('--sobre-acento', (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) > 150 ? '#000' : '#fff'); }
  }
  corFundo = getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim() || corFundo;
  pedirTela();
}
addEventListener('oceano-tema', aplicarTema);
addEventListener('storage', e => { if (e.key === 'oceano:tema-ui') aplicarTema(); });

async function iniciar() {
  let idioma = null;
  try { idioma = await Promise.race([window.oceanoPonte?.pedir('idioma'), new Promise(ok => setTimeout(ok, 1200))]); } catch {}
  idioma = idioma || navigator.language || 'pt';
  definirIdioma(IDIOMAS.includes(String(idioma).slice(0, 2)) ? String(idioma).slice(0, 2) : 'en');
  aplicarTema();
  montarMenus(); montarCaixa(); montarPainelCamadas();
  $('abertura-fechar').onclick = fecharAbertura;
  $('abertura-fechar').focus();
  const bv = $('boas-vindas');
  bv.append(el('h1', { textContent: 'RetoqueShop 1.0' }), el('p', { textContent: t('Abra uma foto, crie uma imagem nova ou arraste um arquivo para cá. Também dá para colar uma imagem.') }),
    el('div', { className: 'acoes' }, el('button', { type: 'button', className: 'botao primario', textContent: t('Abrir imagem'), onclick: () => $('abrir-arquivo').click() }), el('button', { type: 'button', className: 'botao', textContent: t('Nova imagem'), onclick: () => executar('novo') })));
  new ResizeObserver(medir).observe(palco);
  medir();
  selecionar('pincel');
  definirDoc(null);
  try {
    const r = await lerRascunho();
    if (r && await eProjeto(r)) { definirDoc(await lerProjeto(r)); a.doc.sujo = true; a.status(t('Trabalho recuperado')); }
  } catch { try { await apagarRascunho(); } catch {} }
}
// para testar e para a ponte futura
window.retoque = { a, executar, selecionar, COMANDOS, abrirArquivo, definirDoc, docDeCanvas, ferramenta: () => ferramenta };
iniciar();

// faixas: a parte preenchida acompanha o valor, inclusive nas que surgem depois nos painéis e diálogos
const pintarFaixa = i => { const min = +i.min || 0, max = i.max === '' ? 100 : +i.max; i.style.setProperty('--p', `${max > min ? ((+i.value - min) / (max - min)) * 100 : 0}%`); };
const pintarFaixas = () => document.querySelectorAll('input[type=range]').forEach(pintarFaixa);
document.addEventListener('input', e => { if (e.target.matches?.('input[type=range]')) pintarFaixa(e.target); });
new MutationObserver(pintarFaixas).observe(document.body, { childList: true, subtree: true });
pintarFaixas();
