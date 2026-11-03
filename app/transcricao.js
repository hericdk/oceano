// Transcrição no próprio computador: o modelo Whisper (cerca de 79 MB) é baixado uma vez, a pedido da pessoa, conferido pelo SHA-256
// e guardado em userData/transcricao. Ele roda num processo próprio, que só existe enquanto é usado. A voz não sai daqui.
const { app, ipcMain, utilityProcess } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COMMIT = '27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c';
const BASE = `https://huggingface.co/onnx-community/whisper-base/resolve/${COMMIT}`;
const ARQUIVOS = [
  ['onnx/encoder_model_int8.onnx', 'encoder_model_int8.onnx', 23201297, 'ca6177401f86a2c6b4dc5f7fc02fbca680678906bd0c22f6d89f0b80f124253f'],
  ['onnx/decoder_model_int8.onnx', 'decoder_model_int8.onnx', 53310178, 'c859636f4463dd5a9ea752546c6c7badeb48ab3e22b340cafef08a15552fcb2e'],
  ['tokenizer.json', 'tokenizer.json', 2480466, '27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566'],
];
const PASTA = () => path.join(app.getPath('userData'), 'transcricao');
const pronta = () => ARQUIVOS.every(([, nome]) => fs.existsSync(path.join(PASTA(), nome)));

let motor = null, seq = 0, folga = 0;
const pedidos = new Map();
function ligar() {
  clearTimeout(folga);
  if (motor) return motor;
  motor = utilityProcess.fork(path.join(__dirname, 'transcricao-motor.js'), [], { serviceName: 'Oceano Transcrição' });
  motor.on('message', m => { const p = pedidos.get(m.id); if (!p) return; pedidos.delete(m.id); m.erro ? p.falha(new Error(m.erro)) : p.ok(m.texto); descansar(); });
  motor.on('exit', () => { motor = null; for (const p of pedidos.values()) p.falha(new Error('o motor da transcrição fechou')); pedidos.clear(); });
  return motor;
}
// sem pedido por um minuto, o processo sai e a memória volta
function descansar() { clearTimeout(folga); folga = setTimeout(() => { if (!pedidos.size) { motor?.kill(); motor = null; } }, 60000); }

function registrar(registrarPropria) {
  app.on('will-quit', () => motor?.kill());
  ipcMain.handle('transcricao:estado', () => (pronta() ? 'pronta' : 'ausente'));
  ipcMain.handle('transcricao:baixar', async e => {
    fs.mkdirSync(PASTA(), { recursive: true });
    const total = ARQUIVOS.reduce((s, a) => s + a[2], 0); let feito = 0;
    for (const [fonte, nome, tam, sha] of ARQUIVOS) {
      const destino = path.join(PASTA(), nome);
      if (fs.existsSync(destino)) { feito += tam; continue; }
      const url = `${BASE}/${fonte}`;
      registrarPropria?.(url, 'baixar a transcrição de voz que você pediu', 'nada');
      const r = await fetch(url);
      if (!r.ok) throw new Error('o download respondeu ' + r.status);
      const hash = crypto.createHash('sha256'), tmp = destino + '.baixando', f = fs.openSync(tmp, 'w');
      try {
        for await (const parte of r.body) { fs.writeSync(f, parte); hash.update(parte); feito += parte.length; if (!e.sender.isDestroyed()) e.sender.send('transcricao:progresso', Math.min(1, feito / total)); }
      } finally { fs.closeSync(f); }
      if (hash.digest('hex') !== sha) { fs.rmSync(tmp, { force: true }); throw new Error('o arquivo baixado não confere'); }
      fs.renameSync(tmp, destino);
    }
    return 'pronta';
  });
  ipcMain.handle('transcricao:transcrever', (_e, dados, lingua) => new Promise((ok, falha) => {
    if (!pronta()) return falha(new Error('sem o modelo'));
    if (!(dados instanceof ArrayBuffer) || dados.byteLength > 16000 * 4 * 600) return falha(new Error('áudio inválido'));
    const id = ++seq; pedidos.set(id, { ok, falha });
    ligar().postMessage({ id, pasta: PASTA(), dados: new Uint8Array(dados), lingua: String(lingua || '').slice(0, 8) });
  }));
}
module.exports = { registrar };
