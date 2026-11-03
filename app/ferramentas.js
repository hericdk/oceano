// 🧰 Ferramentas de mídia: liga o motor (ferramentas-motor.js) quando a página pede, só em 127.0.0.1,
// com os temporários em userData/ferramentas, e desliga ao fechar o Oceano. O token é novo a cada execução.
// ffmpeg e yt-dlp são os da máquina: no app empacotado o PATH é mínimo, então também olha as pastas comuns.

const { app, ipcMain } = require('electron');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { criarMotor } = require('./ferramentas-motor');

const NO_WINDOWS = process.platform === 'win32';
const PASTAS = NO_WINDOWS ? [] : ['/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local', 'bin')];
const ORIGENS = new Set(['oceano-ui://app', 'http://localhost:5216']);
let ligando = null;
let motor = null;

function buscarBinario(nome) {
  for (const pasta of PASTAS) {
    const p = path.join(pasta, nome);
    try { fs.accessSync(p, fs.constants.X_OK); return p; } catch {}
  }
  try {
    const saida = execFileSync(NO_WINDOWS ? 'where' : 'which', [nome], { encoding: 'utf8', timeout: 4000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    const linhas = saida.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // sem shell, o Windows só abre executável de verdade (.cmd e .bat não servem)
    return (NO_WINDOWS ? linhas[0] : linhas.find((l) => /\.exe$/i.test(l))) || null;
  } catch { return null; }
}

// o endereço leva o token: só a interface do próprio app pode pedir
function pedidoDaInterface(ev) {
  try { const u = new URL(ev.senderFrame.url); return ORIGENS.has(`${u.protocol}//${u.host}`); } catch { return false; }
}

async function ligar() {
  if (!ligando) {
    ligando = criarMotor({ pasta: path.join(app.getPath('userData'), 'ferramentas'), token: crypto.randomBytes(32).toString('hex'), buscarBinario })
      .then((m) => { motor = m; return m; });
  }
  try {
    const m = await ligando;
    const info = await m.info();
    return { ok: true, base: m.base, ffmpeg: info.ffmpeg, ytdlp: info.ytdlp, plataforma: process.platform };
  } catch {
    ligando = null;
    return { ok: false, erro: 'nao-abriu', ffmpeg: false, ytdlp: false, plataforma: process.platform };
  }
}

function registrar() {
  ipcMain.handle('ferramentas:motor', (ev) => {
    if (!pedidoDaInterface(ev)) return { ok: false, erro: 'origem-recusada', ffmpeg: false, ytdlp: false, plataforma: process.platform };
    return ligar();
  });
  app.on('will-quit', () => {
    // parar() mata os processos e apaga os temporários na hora, antes de o app sair
    if (motor) motor.parar();
    else if (ligando) ligando.then((m) => m.parar()).catch(() => {});
    motor = ligando = null;
  });
}

module.exports = { registrar };
