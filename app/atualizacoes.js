// Versão nova do Oceano: procura só no release público deste projeto e nada é baixado ou instalado sem um clique da pessoa.
// Windows e Linux atualizam pelo próprio programa. No Mac, sem a assinatura da Apple, abre a página de download.
const fs = require('fs');
const path = require('path');
const { app, ipcMain, shell } = require('electron');

const API = 'https://api.github.com/repos/hericdk/oceano/releases/latest';
const PAGINA = 'https://github.com/hericdk/oceano/releases/latest';
const SEIS_HORAS = 6 * 3600000, ESPERA_AO_ABRIR = 15000;
const arq = () => path.join(app.getPath('userData'), 'atualizacoes.json');
function ler() { try { return { auto: true, ...JSON.parse(fs.readFileSync(arq(), 'utf8')) }; } catch { return { auto: true }; } }
function gravar(d) { fs.writeFileSync(arq(), JSON.stringify(d), { mode: 0o600 }); }

const numeros = v => String(v).replace(/^v/, '').split('.').map(Number);
function maisNova(a, b) {
  const x = numeros(a), y = numeros(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

// no Mac e no app sem instalar não há como trocar o programa: a saída é a página
const pelaPagina = () => !app.isPackaged || process.platform === 'darwin' || (process.platform === 'linux' && !process.env.APPIMAGE);
let estado = { fase: 'parada', atual: app.getVersion(), nova: null, modo: pelaPagina() ? 'pagina' : 'programa', progresso: 0 };
let avisar = () => {}, registrarPropria = () => {}, atualizador = null;
const mudar = novo => { estado = { ...estado, ...novo }; avisar(estado); return estado; };

async function procurar() {
  mudar({ fase: 'procurando' });
  registrarPropria(API, 'Procurar versão nova do Oceano', 'nada (só download)');
  try {
    const r = await fetch(API, { redirect: 'error', headers: { accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(String(r.status));
    const { tag_name: tag } = await r.json();
    if (!/^v?\d+\.\d+\.\d+$/.test(tag)) throw new Error('versão estranha');
    gravar({ ...ler(), ultimaVez: Date.now() });
    return mudar(maisNova(tag, app.getVersion()) ? { fase: 'disponivel', nova: tag.replace(/^v/, '') } : { fase: 'atualizada', nova: null });
  } catch { return mudar({ fase: 'erro' }); }
}

function ligarAtualizador() {
  if (atualizador) return atualizador;
  ({ autoUpdater: atualizador } = require('electron-updater'));
  atualizador.autoDownload = false;
  atualizador.autoInstallOnAppQuit = false;
  atualizador.on('download-progress', p => mudar({ fase: 'baixando', progresso: Math.round(p.percent) }));
  atualizador.on('update-downloaded', () => mudar({ fase: 'pronta', progresso: 100 }));
  // se o programa não conseguir se atualizar, a pessoa ainda tem a página
  atualizador.on('error', () => mudar({ fase: 'disponivel', modo: 'pagina' }));
  return atualizador;
}

async function atualizar() {
  if (estado.fase !== 'disponivel') return estado;
  if (estado.modo === 'pagina') { await shell.openExternal(PAGINA); return estado; }
  mudar({ fase: 'baixando', progresso: 0 });
  registrarPropria(PAGINA, 'Baixar a versão nova do Oceano, que você pediu', 'nada (só download)');
  try {
    const u = ligarAtualizador();
    await u.checkForUpdates();
    await u.downloadUpdate();
  } catch { mudar({ fase: 'disponivel', modo: 'pagina' }); }
  return estado;
}

function registrar(enviar, registrarDaRede) {
  avisar = e => enviar('atualizacao:estado', e);
  registrarPropria = registrarDaRede;
  ipcMain.handle('atualizacao:estado', () => estado);
  ipcMain.handle('atualizacao:prefs', () => ({ auto: ler().auto }));
  ipcMain.handle('atualizacao:definir-auto', (_e, ligado) => { gravar({ ...ler(), auto: !!ligado }); return { auto: !!ligado }; });
  ipcMain.handle('atualizacao:verificar', () => procurar());
  ipcMain.handle('atualizacao:atualizar', () => atualizar());
  ipcMain.handle('atualizacao:instalar', () => { if (estado.fase === 'pronta') atualizador.quitAndInstall(); return true; });
  app.whenReady().then(() => setTimeout(() => {
    const p = ler();
    if (p.auto && Date.now() - (p.ultimaVez || 0) >= SEIS_HORAS) procurar();
  }, ESPERA_AO_ABRIR));
}

module.exports = { registrar, maisNova };
