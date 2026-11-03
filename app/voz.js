// Voz neural no app: o modelo (86 MB) é baixado uma vez, a pedido da pessoa, conferido pelo SHA-256 e guardado em
// userData/voz. A síntese roda num processo próprio, em código nativo, bem mais rápido que a fala. Nada sai daqui.
const { app, ipcMain, utilityProcess } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COMMIT = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const URL_MODELO = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${COMMIT}/onnx/model_q8f16.onnx`;
const SHA = '04c658aec1b6008857c2ad10f8c589d4180d0ec427e7e6118ceb487e215c3cd0';
const ARQ = () => path.join(app.getPath('userData'), 'voz', 'kokoro.onnx');

let motor = null, seq = 0;
const pedidos = new Map();
function ligar() {
  if (motor) return motor;
  motor = utilityProcess.fork(path.join(__dirname, 'voz-motor.js'), [], { serviceName: 'Oceano Voz' });
  motor.on('message', m => { const p = pedidos.get(m.id); if (!p) return; pedidos.delete(m.id); m.erro ? p.falha(new Error(m.erro)) : p.ok(m.pcm); });
  motor.on('exit', () => { motor = null; for (const p of pedidos.values()) p.falha(new Error('o motor da voz fechou')); pedidos.clear(); });
  return motor;
}
function registrar(registrarPropria) {
  app.on('will-quit', () => motor?.kill());
  ipcMain.handle('voz:estado', () => (fs.existsSync(ARQ()) ? 'pronta' : 'ausente'));
  ipcMain.handle('voz:baixar', async e => {
    registrarPropria?.(URL_MODELO, 'baixar a voz neural que você pediu', 'nada');
    const r = await fetch(URL_MODELO);
    if (!r.ok) throw new Error('o download respondeu ' + r.status);
    const total = +r.headers.get('content-length') || 86033585, hash = crypto.createHash('sha256');
    fs.mkdirSync(path.dirname(ARQ()), { recursive: true });
    const tmp = ARQ() + '.baixando', f = fs.openSync(tmp, 'w'); let n = 0;
    try {
      for await (const parte of r.body) { fs.writeSync(f, parte); hash.update(parte); n += parte.length; if (!e.sender.isDestroyed()) e.sender.send('voz:progresso', Math.min(1, n / total)); }
    } finally { fs.closeSync(f); }
    if (hash.digest('hex') !== SHA) { fs.rmSync(tmp, { force: true }); throw new Error('o arquivo baixado não confere'); }
    fs.renameSync(tmp, ARQ());
    return 'pronta';
  });
  ipcMain.handle('voz:apagar', () => { motor?.kill(); motor = null; fs.rmSync(ARQ(), { force: true }); return 'ausente'; });
  ipcMain.handle('voz:sintetizar', (_e, texto, vel, voz) => new Promise((ok, falha) => {
    if (!fs.existsSync(ARQ())) return falha(new Error('sem a voz neural'));
    const id = ++seq; pedidos.set(id, { ok, falha });
    ligar().postMessage({ id, modelo: ARQ(), texto: String(texto).slice(0, 2000), vel: Math.min(2, Math.max(0.5, +vel || 1)), voz: String(voz || '') });
  }));
}
module.exports = { registrar };
