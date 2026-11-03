// A contagem anônima de uso: um sinal por dia, só com a autorização da pessoa (quem confere a caixinha é js/contagem-uso.js).
// Vão a versão, o sistema, o idioma, o país do sistema e a faixa de tempo de ontem. O endereço é fixo. Tudo o que
// sobra (datas, minutos de hoje, recibos para pedir a remoção) fica neste computador.
const fs = require('fs');
const path = require('path');
const { app, ipcMain, powerMonitor, BrowserWindow } = require('electron');

// vazio até o endereço definitivo: sem ele, nada é enviado nem medido
const SERVIDOR = '';
const SISTEMAS = { darwin: 'mac', win32: 'windows', linux: 'linux' };
const DIAS_DO_RECIBO = 30, OCIOSO_SEGUNDOS = 300;
const hoje = () => new Date().toISOString().slice(0, 10);
const arq = () => path.join(app.getPath('userData'), 'contagem.json');
function ler() { try { return JSON.parse(fs.readFileSync(arq(), 'utf8')); } catch { return {}; } }
function gravar(d) { fs.writeFileSync(arq(), JSON.stringify(d), { mode: 0o600 }); }
const faixa = m => (m <= 15 ? 'ate15' : m <= 60 ? 'ate60' : m <= 180 ? 'ate180' : 'mais180');
const pedir = (rota, corpo) => fetch(`${SERVIDOR}/${rota}`, {
  method: 'POST', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(8000),
  headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
});

// o relógio só conta com a autorização ligada, com a janela em foco e a pessoa presente
let relogio = null;
function medir() {
  if (relogio) return;
  relogio = setInterval(() => {
    if (!BrowserWindow.getFocusedWindow() || powerMonitor.getSystemIdleTime() >= OCIOSO_SEGUNDOS) return;
    const d = ler(), dia = hoje();
    if (d.diaMinutos !== dia) { if (d.diaMinutos) d.tempoOntem = faixa(d.minutos || 0); d.diaMinutos = dia; d.minutos = 0; }
    d.minutos += 1; gravar(d);
  }, 60000);
  relogio.unref?.();
}
function parar() { clearInterval(relogio); relogio = null; }

async function sinal(idioma, registrar) {
  if (!SERVIDOR) return false;
  medir();
  const sistema = SISTEMAS[process.platform], d = ler(), dia = hoje();
  if (!sistema || d.dia === dia) return false;
  registrar(`${SERVIDOR}/sinal`, 'Contagem anônima de uso, que você autorizou', 'versão, sistema, idioma, país do sistema e faixa de tempo');
  const pais = /^[A-Z]{2}$/.test(app.getLocaleCountryCode()) ? app.getLocaleCountryCode() : '';
  if (d.diaMinutos && d.diaMinutos !== dia) d.tempoOntem = faixa(d.minutos || 0);
  try {
    const corpo = { versao: app.getVersion(), sistema, idioma: String(idioma).slice(0, 10), pais, tempo: d.tempoOntem || '', novo: !d.dia, mes: d.dia?.slice(0, 7) !== dia.slice(0, 7) };
    const r = await pedir('sinal', corpo);
    if (!r.ok) return false;
    const { recibo } = await r.json();
    const limite = new Date(Date.now() - DIAS_DO_RECIBO * 86400000).toISOString().slice(0, 10);
    // o dia medido já foi contado: não pode voltar no próximo sinal
    const hojeMedido = d.diaMinutos === dia ? { diaMinutos: dia, minutos: d.minutos } : { diaMinutos: dia, minutos: 0 };
    gravar({ ...d, ...hojeMedido, dia, tempoOntem: undefined, recibos: [...(d.recibos || []).filter(x => x.dia >= limite), { recibo, dia }] });
    return true;
  } catch { return false; }   // sem internet ou servidor fora: tenta de novo na próxima abertura
}

// o direito de remover: manda os recibos e apaga tudo daqui. Sem internet, fica marcado e tenta ao abrir de novo.
async function apagar(registrar) {
  parar();
  const d = ler(), recibos = (d.recibos || []).map(x => x.recibo);
  if (!recibos.length) { fs.rmSync(arq(), { force: true }); return { ok: true, removidos: 0 }; }
  gravar({ ...d, apagarPendente: true });
  registrar(`${SERVIDOR}/remover`, 'Remoção dos seus dados de uso, que você pediu', 'só os recibos');
  try {
    const r = await pedir('remover', { recibos });
    if (!r.ok) return { ok: false };
    const { removidos } = await r.json();
    fs.rmSync(arq(), { force: true });
    return { ok: true, removidos };
  } catch { return { ok: false }; }
}

function registrar(registrarPropria) {
  ipcMain.handle('contagem:sinal', (_e, idioma) => sinal(idioma, registrarPropria));
  ipcMain.handle('contagem:parar', () => { parar(); return true; });
  ipcMain.handle('contagem:apagar', () => apagar(registrarPropria));
  app.whenReady().then(() => { if (ler().apagarPendente) apagar(registrarPropria); });
}

module.exports = { registrar, SERVIDOR };
