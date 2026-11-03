// 🤌 FM ½ sampler: o motor local (serve.py do sampler, copiado em simulador/sampler/motor/). Ele dá YouTube/Instagram
// (yt-dlp) e a separação de instrumentos (Demucs). O app liga quando a página do sampler pede, só em 127.0.0.1:5217,
// com os dados (cortes, separações) em userData/sampler; e desliga ao fechar o Oceano.
// Se já houver um motor rodando nessa porta (o do projeto original, por exemplo), usa esse.

const { app, ipcMain } = require('electron');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORTA = 5217;
const ORIGEM = path.join(__dirname, '..', 'simulador', 'sampler', 'motor', 'serve.py');
const DEMUCS = path.join(os.homedir(), '.local', 'share', 'fm1-stems', 'bin', 'python');
let motor = null;

async function responde() {
  try { const r = await fetch(`http://127.0.0.1:${PORTA}/__stems`, { signal: AbortSignal.timeout(1500) }); return await r.json(); } catch { return null; }
}
function acharPython() {
  const nomes = process.platform === 'win32' ? ['py', 'python'] : ['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3', 'python3'];
  for (const n of nomes) { try { execFileSync(n, ['--version'], { stdio: 'ignore', timeout: 4000 }); return n; } catch {} }
  return null;
}
const temYtDlp = () => { try { execFileSync(process.platform === 'win32' ? 'where' : 'which', ['yt-dlp'], { stdio: 'ignore' }); return true; } catch { return false; } };

async function ligar() {
  let j = await responde();
  if (j) return { ok: true, proprio: !!motor, demucs: !!j.ready, ytdlp: temYtDlp() };
  const py = acharPython();
  if (!py) return { ok: false, erro: 'sem-python' };
  // o app empacotado não deixa o Python ler de dentro dele: o motor vai para userData antes de rodar
  const pasta = path.join(app.getPath('userData'), 'sampler');
  fs.mkdirSync(pasta, { recursive: true });
  const serve = path.join(pasta, 'serve.py');
  fs.writeFileSync(serve, fs.readFileSync(ORIGEM));
  motor = spawn(py, [serve, String(PORTA)], { env: { ...process.env, OCEANO_SAMPLER_DADOS: pasta, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` }, stdio: 'ignore', windowsHide: true });
  motor.on('exit', () => { motor = null; });
  for (let i = 0; i < 20 && !j; i++) { await new Promise(r => setTimeout(r, 300)); j = await responde(); }
  if (!j) { motor?.kill(); return { ok: false, erro: 'nao-abriu' }; }
  return { ok: true, proprio: true, demucs: !!j.ready, ytdlp: temYtDlp() };
}

function registrar() {
  ipcMain.handle('sampler:motor', () => ligar());
  ipcMain.handle('sampler:info', async () => ({ ligado: !!(await responde()), demucs: fs.existsSync(DEMUCS), ytdlp: temYtDlp(), plataforma: process.platform }));
  app.on('will-quit', () => motor?.kill());
}

module.exports = { registrar };
