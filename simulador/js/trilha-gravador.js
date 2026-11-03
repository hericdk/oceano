// Grava a saída da trilha em PCM para virar um .wav (fica num arquivo próprio por causa da CSP do app).
class Gravador extends AudioWorkletProcessor {
  process(entradas) {
    const a = entradas[0];
    if (a && a.length) this.port.postMessage([a[0].slice(), (a[1] || a[0]).slice()]);
    return true;
  }
}
registerProcessor('oceano-gravador', Gravador);
