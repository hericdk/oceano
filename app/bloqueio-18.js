// Bloqueador 18+: sempre ligado, e tudo fica neste computador. A lista só é consultada aqui; nenhum endereço visitado é anotado.
// Só dá para pausar logo depois de abrir o navegador, uma vez, pelo tempo escolhido. Ao fechar, a pausa acaba.
const fs = require('fs');
const path = require('path');
const { CATEGORIAS, LISTA } = require('./bloqueio-18-lista');

const JANELA_MS = 5 * 60 * 1000, MIN = 1, MAX = 60, PADRAO = 5;
const inicio = Date.now();
let pausaAte = 0, jaPausou = false, dados = null, aoBarrar = () => {};

const arq = () => path.join(require('electron').app.getPath('userData'), 'bloqueador-18.json');
const CHAVES = new Set(CATEGORIAS.map(c => c.id));
function ler() {
  if (dados) return dados;
  dados = { minutos: PADRAO, extras: [] };
  try {
    const d = JSON.parse(fs.readFileSync(arq(), 'utf8'));
    if (Number.isInteger(d.minutos)) dados.minutos = Math.min(MAX, Math.max(MIN, d.minutos));
    if (Array.isArray(d.extras)) dados.extras = d.extras.map(e => ({ alvo: normalizar(e?.alvo), cat: CHAVES.has(e?.cat) ? e.cat : 'outro' })).filter(e => e.alvo);
  } catch {}
  return dados;
}
function gravar() {
  const t = arq() + '.tmp';
  fs.writeFileSync(t, JSON.stringify(dados), { mode: 0o600 });
  fs.renameSync(t, arq());
}

// aceita link inteiro ou só o nome do site: sobra servidor + caminho, sem www, sem protocolo e sem ?busca
function normalizar(texto) {
  let t = String(texto ?? '').trim().toLowerCase();
  if (!t || t.length > 300 || /\s/.test(t)) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(t)) t = 'https://' + t;
  try {
    const u = new URL(t), host = u.hostname.replace(/^www\./, ''), caminho = u.pathname.replace(/\/+$/, '');
    if (!/^[a-z0-9.:\[\]-]+$/.test(host) || !host) return '';
    return host + caminho;
  } catch { return ''; }
}

const pausado = () => Date.now() < pausaAte;
const casa = (host, caminho, alvo) => {
  const barra = alvo.indexOf('/'), h = barra < 0 ? alvo : alvo.slice(0, barra), p = barra < 0 ? '' : alvo.slice(barra);
  return (host === h || host.endsWith('.' + h)) && (!p || caminho === p || caminho.startsWith(p + '/'));
};
function naLista(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (!/^https?:$/.test(u.protocol)) return false;
  const host = u.hostname.toLowerCase().replace(/^www\./, ''), caminho = u.pathname.toLowerCase();
  return LISTA.some(l => casa(host, caminho, l.alvo)) || ler().extras.some(e => casa(host, caminho, e.alvo));
}
// o que o navegador pergunta a cada página e a cada quadro embutido
const barra = details => {
  if ((details.resourceType !== 'mainFrame' && details.resourceType !== 'subFrame') || pausado() || !naLista(details.url)) return false;
  if (details.resourceType === 'mainFrame') aoBarrar(details.url, details.webContentsId);
  return true;
};

const estado = () => {
  const d = ler(), agora = Date.now();
  return { categorias: CATEGORIAS, lista: LISTA, extras: d.extras, minutos: d.minutos, pausado: pausado(), restanteMs: Math.max(0, pausaAte - agora), podePausar: !pausado() && !jaPausou && agora - inicio < JANELA_MS, min: MIN, max: MAX };
};

function registrar(ipcMain, avisar) {
  if (avisar) aoBarrar = avisar;
  ipcMain.handle('bloqueio18:estado', estado);
  ipcMain.handle('bloqueio18:confere', (_e, url) => naLista(String(url || '')));
  ipcMain.handle('bloqueio18:minutos', (_e, n) => { const d = ler(); d.minutos = Math.min(MAX, Math.max(MIN, Math.round(Number(n)) || PADRAO)); gravar(); return estado(); });
  ipcMain.handle('bloqueio18:pausar', () => { if (estado().podePausar) { jaPausou = true; pausaAte = Date.now() + ler().minutos * 60000; } return estado(); });
  ipcMain.handle('bloqueio18:religar', () => { pausaAte = 0; return estado(); });
  ipcMain.handle('bloqueio18:adicionar', (_e, texto, cat) => {
    const alvo = normalizar(texto), d = ler();
    if (!alvo) return { ...estado(), erro: 'invalido' };
    if (LISTA.some(l => l.alvo === alvo) || d.extras.some(e => e.alvo === alvo)) return { ...estado(), erro: 'repetido' };
    d.extras.unshift({ alvo, cat: CHAVES.has(cat) ? cat : 'outro' }); gravar();
    return estado();
  });
  ipcMain.handle('bloqueio18:marcar', (_e, alvo, cat) => { const x = ler().extras.find(e => e.alvo === alvo); if (x && CHAVES.has(cat)) { x.cat = cat; gravar(); } return estado(); });
  ipcMain.handle('bloqueio18:remover', (_e, alvo) => { const d = ler(); d.extras = d.extras.filter(e => e.alvo !== alvo); gravar(); return estado(); });
}

module.exports = { barra, naLista, normalizar, registrar };
