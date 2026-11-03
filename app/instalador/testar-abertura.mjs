// Abre o app empacotado de verdade, confere se a interface carregou e tira uma foto da tela.
// Uso: node instalador/testar-abertura.mjs <executável> <foto.png>
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [exe, foto] = process.argv.slice(2), PORTA = 9333;
const dados = mkdtempSync(join(tmpdir(), 'oceano-teste-'));
const filho = spawn(exe, [`--remote-debugging-port=${PORTA}`, `--user-data-dir=${dados}`, ...(process.platform === 'linux' ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])], { stdio: 'inherit' });
let saiu = null;
filho.on('exit', c => { saiu = c ?? -1; });
const espera = ms => new Promise(r => setTimeout(r, ms));
function fim(codigo, texto) {
  console.log(texto);
  if (process.platform === 'win32') spawn('taskkill', ['/PID', String(filho.pid), '/T', '/F']); else filho.kill('SIGKILL');
  setTimeout(() => process.exit(codigo), 1500);
}

let alvo = null;
for (let i = 0; i < 90 && !alvo; i++) {
  if (saiu !== null) { console.log('o app fechou sozinho, código', saiu); process.exit(1); }
  await espera(1000);
  try {
    const lista = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
    alvo = lista.find(t => t.type === 'page' && /^oceano-ui:/.test(t.url));
  } catch {}
}
if (!alvo) { fim(1, 'a interface do Oceano não apareceu'); await espera(3000); }

const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = erro; });
let seq = 0;
const pendentes = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); pendentes.get(m.id)?.(m); };
const cmd = (method, params = {}) => new Promise(ok => { const id = ++seq; pendentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
const avaliar = async c => (await cmd('Runtime.evaluate', { expression: c, returnByValue: true, awaitPromise: true })).result?.result?.value;

let pronto = false;
for (let i = 0; i < 30 && !pronto; i++) { await espera(1000); pronto = await avaliar('!!window.oceano && !!window.oceanoNativo'); }
await espera(4000);
const estado = await avaliar(`({ url: location.href, sistema: navigator.platform, versoes: window.oceanoNativo?.versoes, abas: document.querySelectorAll('.aba').length, texto: document.body.innerText.length })`);
console.log(JSON.stringify(estado));
// a primeira foto é a saudação; depois fecha os primeiros passos e abre uma página de verdade
const fotografar = async nome => { const i = await cmd('Page.captureScreenshot', { format: 'png' }); if (i.result?.data) writeFileSync(nome, Buffer.from(i.result.data, 'base64')); };
await fotografar(foto);
await avaliar(`document.querySelector('.pp')?.remove(); oceano.navegar?.('oceano://sobre'); 1`);
await espera(3000);
const sobre = await avaliar(`document.body.innerText.includes('Oceano MVP')`);
await fotografar(foto.replace(/\.png$/, '-sobre.png'));
fim(pronto && sobre && estado?.texto > 50 ? 0 : 1, `interface: ${pronto} | página Sobre: ${sobre}`);
