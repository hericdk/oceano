// Voz neural, parte nativa: texto → sons (espeak-ng em WebAssembly) → áudio (Kokoro no ONNX Runtime nativo).
// Sem Electron aqui dentro: roda em processo próprio (voz-motor.js), para a fala nunca travar a janela.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ort = require('onnxruntime-node');

const VENDOR = path.join(__dirname, '..', 'simulador', 'vendor', 'voz');

const VOZES = ['brilho', 'mari', 'alex', 'noel'];

async function criarNucleo(arquivoModelo) {
  const vocab = JSON.parse(fs.readFileSync(path.join(VENDOR, 'vocab.json'), 'utf8'));
  const guardados = {};
  const estilosDe = voz => {
    const id = VOZES.includes(voz) ? voz : 'brilho';
    if (!guardados[id]) { const b = fs.readFileSync(path.join(VENDOR, `voz-${id}.bin`)); guardados[id] = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
    return guardados[id];
  };
  const sessao = await ort.InferenceSession.create(arquivoModelo, { executionProviders: ['cpu'] });
  const { default: iniciarEspeak } = await import(pathToFileURL(path.join(VENDOR, 'espeak-ng.mjs')).href);
  const m = await iniciarEspeak({ locateFile: f => path.join(VENDOR, f) });
  const espeak = new m.eSpeakNGWorker(); espeak.set_voice('pt-br');
  // o mesmo caminho do voz-worker.js: a pontuação do fim volta porque ela muda a entonação
  const pronuncia = texto => espeak.synthesize_ipa(texto).ipa.replace(/_/g, '').replace(/\s+/g, ' ').replace(/r/g, 'ɾ').replace(/æ/g, 'ɐ').trim() + (/[.!?,;:…]$/.test(texto) ? texto.at(-1) : '');
  return {
    async sintetizar(texto, vel, voz) {
      const tk = [...pronuncia(texto)].map(c => vocab[c]).filter(v => v !== undefined).slice(0, 510);
      if (!tk.length) return new Float32Array(0);
      const saida = await sessao.run({
        [sessao.inputNames[0]]: new ort.Tensor('int64', BigInt64Array.from([0, ...tk, 0].map(BigInt)), [1, tk.length + 2]),
        style: new ort.Tensor('float32', estilosDe(voz).slice(tk.length * 256, (tk.length + 1) * 256), [1, 256]),
        speed: new ort.Tensor('float32', new Float32Array([vel]), [1]),
      });
      return Float32Array.from(saida[sessao.outputNames[0]].data);
    },
  };
}
module.exports = { criarNucleo };
