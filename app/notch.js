// Oceano no notch do Mac: o personagem do tema do notch (o avatar da Navegadora ou um tema com folha de sprites).
// Uma janela transparente presa ao notch: fechada, mostra só o rostinho do avatar embaixo do notch; com o mouse
// encostando lá, desce um painel com o avatar, a última fala e um campo para conversar.
// Preferência "sempre" (padrão ligada): continua visível, minimizado, quando você troca de app ou de mesa;
// desligada, o notch fica só na mesa (Space) do Oceano e some quando outro app está na frente.

const { BrowserWindow, screen, ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');

const LARG = 320, ALT = 600, LARG_SOLTA = 300, ALT_SOLTA = 552, ALT_MINIMIZADA = 34, ZONA = 110, ESPERA_FECHAR = 600;
const ESCALAS = [0.8, 1, 1.25, 1.5];   // tamanhos da janela solta: tudo cresce junto, sem quebrar o desenho
const ARQ = () => path.join(app.getPath('userData'), 'notch.json');
let prefs = { ligado: true, sempre: true, ficar: true, tema: 'janela', fundo: '', solto: false, x: null, y: null, escala: 1 };
try { prefs = { ...prefs, ...JSON.parse(fs.readFileSync(ARQ(), 'utf8')) }; } catch {}
const salvar = () => { try { fs.writeFileSync(ARQ(), JSON.stringify(prefs)); } catch {} };

let minimizada = false, seguraFechada = 0;
let janela = null, aberto = false, foraDesde = 0, relogio = null, abrirPrincipal = () => {}, aoMudar = () => {};
const vivo = w => w && !w.isDestroyed();

function geometria() {
  const d = screen.getPrimaryDisplay(), B = d.bounds, barra = d.workArea.y - B.y;
  return { x: Math.round(B.x + (B.width - LARG) / 2) | 0, y: B.y, barra, temNotch: barra >= 32, B };
}

function criar() {
  if (vivo(janela) || !prefs.ligado || process.platform !== 'darwin') return;
  const g = geometria();
  janela = new BrowserWindow({
    x: g.x, y: g.y, width: LARG, height: ALT, type: 'panel', frame: false, transparent: true, hasShadow: false,
    resizable: false, movable: false, fullscreenable: false, skipTaskbar: true, focusable: true, show: false, roundedCorners: false,
    webPreferences: { preload: path.join(__dirname, 'preload-notch.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  janela.setAlwaysOnTop(true, 'screen-saver');                  // acima da barra de menus
  aplicarSempre();
  janela.setIgnoreMouseEvents(true, { forward: true });         // fechado: o clique passa para o que está embaixo
  janela.on('moved', () => { if (prefs.solto && vivo(janela)) { const b = janela.getBounds(); prefs.x = b.x; prefs.y = b.y; salvar(); } });
  janela.loadURL('oceano-ui://app/notch.html');
  janela.once('ready-to-show', () => { janela.showInactive(); janela.webContents.send('notch:config', { temNotch: g.temNotch, barra: g.barra }); enviarTema(); aplicarSolto(); });
  relogio = setInterval(vigiar, 80);
}
function destruir() { clearInterval(relogio); relogio = null; if (vivo(janela)) janela.destroy(); janela = null; aberto = false; }

function aplicarSempre() {
  if (!vivo(janela)) return;
  // sempre: em todas as mesas, até em tela cheia; senão: só na mesa do Oceano
  janela.setVisibleOnAllWorkspaces(!!prefs.sempre, { visibleOnFullScreen: !!prefs.sempre });
}

function abrir(on) {
  if (on === aberto || !vivo(janela)) return;
  aberto = on;
  janela.setIgnoreMouseEvents(!on, { forward: true });
  janela.webContents.send('notch:abrir', on);
}

// solta: janela comum que recebe o mouse e vai para onde você levar; presa: volta para o notch e obedece ao cursor
function aplicarSolto() {
  if (!vivo(janela)) return;
  const g = geometria();
  if (prefs.solto) {
    const area = screen.getDisplayNearestPoint({ x: prefs.x ?? g.x, y: prefs.y ?? 80 }).workArea;
    const e = ESCALAS.includes(prefs.escala) ? prefs.escala : 1;
    const larg = Math.round(LARG_SOLTA * e), alt = Math.round(ALT_SOLTA * e), altMin = Math.round(ALT_MINIMIZADA * e);
    const x = Math.max(area.x, Math.min(prefs.x ?? area.x + area.width - larg - 24, area.x + area.width - larg));
    const y = Math.max(area.y, Math.min(prefs.y ?? area.y + 24, area.y + area.height - (minimizada ? altMin : Math.min(alt, area.height))));
    janela.webContents.setZoomFactor(e);
    janela.setMovable(true);
    janela.setBounds({ x, y, width: larg, height: minimizada ? altMin : alt });
    janela.setIgnoreMouseEvents(false);
    aberto = true;
    if (!janela.isVisible()) janela.showInactive();
  } else {
    minimizada = false;
    janela.webContents.setZoomFactor(1);
    janela.setMovable(false);
    janela.setBounds({ x: g.x, y: g.y, width: LARG, height: ALT });
    aberto = false;
    janela.setIgnoreMouseEvents(true, { forward: true });
    janela.webContents.send('notch:abrir', false);
  }
  janela.webContents.send('notch:solto', { solto: !!prefs.solto, minimizada });
}

// o mouse encostou no notch? (só a posição do cursor, sem permissão especial)
function vigiar() {
  if (!vivo(janela)) return;
  // desligada a preferência "sempre", o notch só aparece com o Oceano na frente; vale também para a janela solta
  if (!prefs.sempre) {
    const naFrente = !!BrowserWindow.getFocusedWindow();   // alguma janela do Oceano está na frente
    if (!naFrente && janela.isVisible() && (prefs.solto || !aberto)) janela.hide();
    else if (naFrente && !janela.isVisible()) janela.showInactive();
  }
  if (prefs.solto) return;
  if (Date.now() < seguraFechada) return;   // acabou de minimizar: não abre de novo com o mouse ainda ali
  const p = screen.getCursorScreenPoint(), g = geometria(), B = g.B;
  const noNotch = p.y <= B.y + Math.max(g.barra, 8) && Math.abs(p.x - (B.x + B.width / 2)) < ZONA;
  const b = janela.getBounds(), naJanela = aberto && p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + g.barra + 552;
  if (noNotch || naJanela) { foraDesde = 0; abrir(true); }
  else if (aberto) { foraDesde ||= Date.now(); if (Date.now() - foraDesde > ESPERA_FECHAR) { foraDesde = 0; abrir(false); } }
}

// ---------- temas do notch ----------
// Um tema é uma pasta com tema.json e, se quiser, uma folha de sprites PNG (veja ui/notch-temas/LEIA.md).
// Sem código: o main valida o JSON e a tela só recebe números, cores e o endereço da imagem.
const TEMAS_FABRICA = path.join(__dirname, 'ui', 'notch-temas');
const TEMAS_USUARIO = () => path.join(app.getPath('userData'), 'notch-temas');
const ID_OK = /^[a-z0-9][a-z0-9-]{0,39}$/, COR_OK = /^#[0-9a-f]{6}$/i, ARQ_OK = /^[a-z0-9_-]{1,40}\.png$/i;
const quadros = l => Array.isArray(l) ? l.slice(0, 32).filter(q => Array.isArray(q) && q.length === 2 && q.every(n => Number.isInteger(n) && n >= 0 && n < 64)) : [];
function validarTema(bruto, id, base) {
  if (!bruto || bruto.formato !== 'oceano-notch/1' || bruto.id !== id || !ID_OK.test(id)) return null;
  const t = { id, nome: String(bruto.nome || id).slice(0, 40), autor: String(bruto.autor || '').slice(0, 60),
    estilo: bruto.estilo === 'janela' ? 'janela' : 'livre', fundoEditavel: !!bruto.fundoEditavel, cores: {} };
  for (const k of ['fundo', 'texto', 'destaque']) if (COR_OK.test(bruto.cores?.[k] || '')) t.cores[k] = bruto.cores[k];
  const pg = bruto.personagem;
  if (pg === 'avatar' || !pg) t.personagem = 'avatar';
  else {
    const [w, h] = Array.isArray(pg.quadro) ? pg.quadro : [];
    if (!ARQ_OK.test(pg.folha || '') || !(w > 0 && w <= 512 && h > 0 && h <= 512)) return null;
    const est = {}; for (const k of ['parado', 'pensando', 'falando']) { const q = quadros(pg.estados?.[k]); if (q.length) est[k] = q; }
    if (!est.parado) return null;
    t.personagem = { folha: `${base}/${id}/${pg.folha}`, quadro: [w, h], fps: Math.min(30, Math.max(1, +pg.fps || 6)), estados: est };
    if (Array.isArray(pg.boca) && pg.boca.every(n => Number.isFinite(n))) t.personagem.boca = pg.boca.slice(0, 2).map(Math.round);
    if (Array.isArray(pg.rosto) && pg.rosto.length === 4 && pg.rosto.every(n => Number.isFinite(n))) t.personagem.rosto = pg.rosto.map(Math.round);
  }
  return t;
}
function listarTemas() {
  const lista = [];
  for (const [pasta, base, proprio] of [[TEMAS_FABRICA, 'notch-temas', false], [TEMAS_USUARIO(), 'notch-temas-seus', true]]) {
    let nomes = []; try { nomes = fs.readdirSync(pasta); } catch {}
    for (const id of nomes) {
      if (!ID_OK.test(id) || lista.some(t => t.id === id)) continue;
      try { const t = validarTema(JSON.parse(fs.readFileSync(path.join(pasta, id, 'tema.json'), 'utf8')), id, base); if (t) lista.push({ ...t, seu: proprio }); } catch {}
    }
  }
  return lista;
}
// imagens dos temas da pessoa (oceano-ui://app/notch-temas-seus/<id>/<folha>.png): só PNG, só dentro da pasta
function servirTemaSeu(rel) {
  const [id, arq] = rel.split('/');
  if (!ID_OK.test(id || '') || !ARQ_OK.test(arq || '')) return null;
  const f = path.join(TEMAS_USUARIO(), id, arq);
  try { return new Response(fs.readFileSync(f), { headers: { 'content-type': 'image/png' } }); } catch { return null; }
}
const temaAtual = () => { const l = listarTemas(); return l.find(t => t.id === prefs.tema) || l.find(t => t.id === 'janela') || null; };
function enviarTema() {
  if (!vivo(janela)) return;
  const t = temaAtual();
  janela.webContents.send('notch:tema', t && { ...t, cores: { ...t.cores, ...(t.fundoEditavel && COR_OK.test(prefs.fundo) ? { fundo: prefs.fundo } : {}) } });
}

let registrado = false;
function registrar(opcoes = {}) {
  if (registrado) return criar();   // navegador reaberto: o notch continua o mesmo
  registrado = true;
  abrirPrincipal = opcoes.abrirPrincipal || abrirPrincipal;
  aoMudar = opcoes.aoMudar || aoMudar;
  ipcMain.handle('notch:prefs', () => ({ ...prefs, disponivel: process.platform === 'darwin' }));
  ipcMain.handle('notch:definir', (_e, novo = {}) => {
    if (typeof novo.ligado === 'boolean') prefs.ligado = novo.ligado;
    if (typeof novo.sempre === 'boolean') prefs.sempre = novo.sempre;
    if (typeof novo.ficar === 'boolean') prefs.ficar = novo.ficar;
    if (typeof novo.tema === 'string' && ID_OK.test(novo.tema)) prefs.tema = novo.tema;
    if (typeof novo.fundo === 'string' && (novo.fundo === '' || COR_OK.test(novo.fundo))) prefs.fundo = novo.fundo;
    enviarTema();
    salvar();
    if (prefs.ligado) { criar(); aplicarSempre(); } else destruir();
    aoMudar();
    return prefs;
  });
  ipcMain.handle('notch:temas', () => listarTemas());
  ipcMain.handle('notch:pasta-temas', () => { fs.mkdirSync(TEMAS_USUARIO(), { recursive: true }); return require('electron').shell.openPath(TEMAS_USUARIO()); });
  ipcMain.on('notch:abrir-oceano', (_e, url) => abrirPrincipal(typeof url === 'string' && url.startsWith('oceano://') ? url : undefined));
  ipcMain.on('notch:soltar', () => { prefs.solto = !prefs.solto; minimizada = false; salvar(); aplicarSolto(); });
  ipcMain.on('notch:tamanho', (_e, passo) => {
    if (!prefs.solto) return;
    const i = ESCALAS.indexOf(ESCALAS.includes(prefs.escala) ? prefs.escala : 1);
    prefs.escala = ESCALAS[Math.max(0, Math.min(ESCALAS.length - 1, i + (passo > 0 ? 1 : -1)))];
    salvar(); aplicarSolto();
  });
  ipcMain.on('notch:minimizar', () => {
    if (prefs.solto) { minimizada = !minimizada; aplicarSolto(); return; }
    seguraFechada = Date.now() + 1200; foraDesde = 0; abrir(false);
  });
  // fechar: a janela solta volta para o notch; presa, só recolhe
  ipcMain.on('notch:fechar', () => {
    seguraFechada = Date.now() + 1200;
    if (prefs.solto) { prefs.solto = false; minimizada = false; salvar(); aplicarSolto(); return; }
    foraDesde = 0; abrir(false);
  });
  criar();
}

// a Navegadora continua ligada com o navegador fechado?
const ficaLigada = () => process.platform === 'darwin' && !!prefs.ligado && !!prefs.ficar;

module.exports = { registrar, destruir, servirTemaSeu, ficaLigada };
