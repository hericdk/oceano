// Grava o mar da página inicial como fundo de tela em loop (sem emenda).
// Abre simulador/fundo-mar.html num Chrome headless, desenha cada quadro no instante exato
// (o modo loop do mar fecha um ciclo em `periodo` segundos) e monta MP4 H.264 com o ffmpeg.
//
//   CHROME=/caminho/chrome-headless-shell node gravar-fundo-mar.mjs [periodo=12] [fps=30] [tema=oceano]
//
// Precisa do simulador servido em http://localhost:5216 (python3 simulador/serve.py 5216).
// Saída: simulador/fundos/mar-{dia,tarde,noite}.mp4 (1280×720: cada pixel do mar vira 2×2,
// assim o 4:2:0 do H.264 não borra a cor) + mar-dia.jpg de capa.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, '../../simulador/fundos');
const CHROME = process.env.CHROME;
if (!CHROME) { console.error('defina CHROME= (Chrome for Testing headless-shell)'); process.exit(2); }
const [periodo = 12, fps = 30, tema = 'oceano'] = process.argv.slice(2);
const P = Number(periodo), FPS = Number(fps), N = Math.round(P * FPS);
const HORAS = { dia: 10, tarde: 17.55, noite: 22 };
mkdirSync(SAIDA, { recursive: true });

const perfil = mkdtempSync(join(tmpdir(), 'fundo-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--window-size=1920,1080',
  '--force-device-scale-factor=1', '--hide-scrollbars', '--mute-audio', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const fim = c => { try { chrome.kill('SIGKILL'); } catch {} rmSync(perfil, { recursive: true, force: true }); process.exit(c); };
const wsUrl = await new Promise((ok, falha) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); }); chrome.on('exit', () => falha(new Error(b.slice(-300)))); });
const ws = new WebSocket(wsUrl); await new Promise(ok => ws.addEventListener('open', ok));
let id = 0; const pend = new Map(), ouv = [];
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const { ok, falha } = pend.get(m.id); pend.delete(m.id); m.error ? falha(new Error(m.error.message)) : ok(m.result); } else if (m.method) ouv.forEach(f => f(m)); });
const cdp = (method, params = {}, sessionId) => new Promise((ok, falha) => { const n = ++id; pend.set(n, { ok, falha }); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });
const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
const { sessionId: s } = await cdp('Target.attachToTarget', { targetId, flatten: true });
const P_ = (m, p) => cdp(m, p, s);
const js = async expr => { const r = await P_('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
await P_('Page.enable');
await P_('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

for (const [nome, hora] of Object.entries(HORAS)) {
  const carregou = new Promise(ok => ouv.push(m => { if (m.method === 'Page.loadEventFired' && m.sessionId === s) ok(); }));
  await P_('Page.navigate', { url: `http://localhost:5216/fundo-mar.html?tema=${tema}&hora=${hora}&periodo=${P}&pixel=3` });
  await carregou;
  await js(`(async () => { while (!window.fundo?.pronto) await new Promise(r => setTimeout(r, 50)); })()`);
  const { w, h } = await js('fundo.resolucao()');
  const pasta = mkdtempSync(join(tmpdir(), 'fundo-q-'));
  const quadro = t => js(`(() => { fundo.quadro(${t}); return document.getElementById('mar').toDataURL('image/png').split(',')[1]; })()`);
  for (let i = 0; i < N; i++) writeFileSync(join(pasta, `${String(i).padStart(5, '0')}.png`), Buffer.from(await quadro(i / FPS), 'base64'));
  // o loop fecha? o instante P tem que ser igual ao instante 0
  const igual = (await quadro(0)) === (await quadro(P));
  const mp4 = join(SAIDA, `mar-${nome}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(pasta, '%05d.png'),
    '-vf', `scale=${w * 2}:${h * 2}:flags=neighbor,setsar=1`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
  const cod = await new Promise(ok => ff.on('exit', ok));
  if (nome === 'dia') spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(pasta, '00000.png'), '-vf', `scale=${w * 2}:${h * 2}:flags=neighbor`, '-q:v', '3', join(SAIDA, 'mar-dia.jpg')]);
  rmSync(pasta, { recursive: true, force: true });
  if (cod) { console.error('ffmpeg falhou'); fim(1); }
  console.log(`${nome}: ${w}×${h} → ${w * 2}×${h * 2}, ${N} quadros, loop ${igual ? 'fecha certinho' : 'NÃO fecha'} → ${mp4} (${Math.round(statSync(mp4).size / 1024)} KB)`);
}
fim(0);
