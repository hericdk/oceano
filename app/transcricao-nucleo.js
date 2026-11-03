// Transcrição no próprio computador: Whisper, com o motor que o Oceano já leva para a voz neural. Recebe áudio mono a 16 kHz e devolve texto.
const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');

const SR = 16000, N_FFT = 400, HOP = 160, N_MELS = 80, QUADROS = 3000, BLOCO = SR * 30, MAX_TOKENS = 200;

function fft(re, im) {
  const n = re.length;
  if (n === 1) return;
  if (n % 2) {   // pedaço ímpar: a conta direta
    const r = new Float64Array(n), i = new Float64Array(n);
    for (let k = 0; k < n; k++) for (let t = 0; t < n; t++) { const a = -2 * Math.PI * k * t / n, c = Math.cos(a), s = Math.sin(a); r[k] += re[t] * c - im[t] * s; i[k] += re[t] * s + im[t] * c; }
    re.set(r); im.set(i); return;
  }
  const m = n / 2, ar = new Float64Array(m), ai = new Float64Array(m), br = new Float64Array(m), bi = new Float64Array(m);
  for (let k = 0; k < m; k++) { ar[k] = re[2 * k]; ai[k] = im[2 * k]; br[k] = re[2 * k + 1]; bi[k] = im[2 * k + 1]; }
  fft(ar, ai); fft(br, bi);
  for (let k = 0; k < m; k++) {
    const a = -2 * Math.PI * k / n, c = Math.cos(a), s = Math.sin(a), tr = br[k] * c - bi[k] * s, ti = br[k] * s + bi[k] * c;
    re[k] = ar[k] + tr; im[k] = ai[k] + ti; re[k + m] = ar[k] - tr; im[k + m] = ai[k] - ti;
  }
}

// o banco de filtros mel que o Whisper espera (escala Slaney)
const paraMel = f => (f < 1000 ? 3 * f / 200 : 15 + 27 * Math.log(f / 1000) / Math.log(6.4));
const deMel = m => (m < 15 ? 200 * m / 3 : 1000 * 6.4 ** ((m - 15) / 27));
const FILTROS = (() => {
  const bins = N_FFT / 2 + 1, topo = paraMel(SR / 2), pts = Array.from({ length: N_MELS + 2 }, (_, i) => deMel(topo * i / (N_MELS + 1)));
  return Array.from({ length: N_MELS }, (_, m) => {
    const f = new Float64Array(bins), norm = 2 / (pts[m + 2] - pts[m]);
    for (let k = 0; k < bins; k++) {
      const hz = k * SR / N_FFT, sobe = (hz - pts[m]) / (pts[m + 1] - pts[m]), desce = (pts[m + 2] - hz) / (pts[m + 2] - pts[m + 1]);
      f[k] = Math.max(0, Math.min(sobe, desce)) * norm;
    }
    return f;
  });
})();
const JANELA = Float64Array.from({ length: N_FFT }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N_FFT));

function espectro(pcm) {
  const metade = N_FFT / 2, som = new Float64Array(BLOCO + N_FFT);
  for (let i = 0; i < Math.min(pcm.length, BLOCO); i++) som[i + metade] = pcm[i];
  const saida = new Float32Array(N_MELS * QUADROS), re = new Float64Array(N_FFT), im = new Float64Array(N_FFT);
  let maior = -Infinity;
  for (let q = 0; q < QUADROS; q++) {
    for (let i = 0; i < N_FFT; i++) { re[i] = som[q * HOP + i] * JANELA[i]; im[i] = 0; }
    fft(re, im);
    for (let m = 0; m < N_MELS; m++) {
      let v = 0; const f = FILTROS[m];
      for (let k = 0; k <= metade; k++) if (f[k]) v += f[k] * (re[k] * re[k] + im[k] * im[k]);
      const l = Math.log10(Math.max(v, 1e-10));
      saida[m * QUADROS + q] = l; if (l > maior) maior = l;
    }
  }
  for (let i = 0; i < saida.length; i++) saida[i] = (Math.max(saida[i], maior - 8) + 4) / 4;
  return saida;
}

async function criarNucleo(pasta) {
  const opcoes = { executionProviders: ['cpu'], graphOptimizationLevel: 'all' };
  const codificador = await ort.InferenceSession.create(path.join(pasta, 'encoder_model_int8.onnx'), opcoes);
  const decodificador = await ort.InferenceSession.create(path.join(pasta, 'decoder_model_int8.onnx'), opcoes);
  const tok = JSON.parse(fs.readFileSync(path.join(pasta, 'tokenizer.json'), 'utf8'));
  const especiais = new Map(tok.added_tokens.map(t => [t.content, t.id]));
  const texto = new Map(Object.entries(tok.model.vocab).map(([k, v]) => [v, k]));
  // o vocabulário guarda bytes disfarçados de letras: é preciso desfazer para os acentos voltarem
  const paraByte = new Map();
  { let n = 0; for (let b = 0; b < 256; b++) { const visivel = (b >= 33 && b <= 126) || (b >= 161 && b <= 172) || (b >= 174 && b <= 255); paraByte.set(String.fromCodePoint(visivel ? b : 256 + n++), b); } }
  const FIM = especiais.get('<|endoftext|>'), INICIO = especiais.get('<|startoftranscript|>'), TRANS = especiais.get('<|transcribe|>'), SEM_TEMPO = especiais.get('<|notimestamps|>');
  const decodificar = ids => { const bytes = []; for (const id of ids) for (const c of texto.get(id) || '') { const b = paraByte.get(c); if (b != null) bytes.push(b); } return Buffer.from(bytes).toString('utf8'); };

  async function bloco(pcm, lingua) {
    const { last_hidden_state: estado } = await codificador.run({ input_features: new ort.Tensor('float32', espectro(pcm), [1, N_MELS, QUADROS]) });
    const prefixo = [INICIO, ...(especiais.has(`<|${lingua}|>`) ? [especiais.get(`<|${lingua}|>`)] : []), TRANS, SEM_TEMPO], ids = [...prefixo];
    for (let n = 0; n < MAX_TOKENS; n++) {
      const r = await decodificador.run({ input_ids: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]), encoder_hidden_states: estado });
      const { data, dims } = r.logits, V = dims[2], base = (dims[1] - 1) * V;
      let melhor = 0, valor = -Infinity;
      for (let t = 0; t < V; t++) { if (t > FIM && t < V) continue; if (t === FIM && n === 0) continue; if (data[base + t] > valor) { valor = data[base + t]; melhor = t; } }
      if (melhor === FIM) break;
      ids.push(melhor);
    }
    return decodificar(ids.slice(prefixo.length)).trim();
  }
  return {
    async transcrever(pcm, lingua) {
      const partes = [];
      for (let i = 0; i < pcm.length; i += BLOCO) {
        const pedaco = pcm.subarray(i, i + BLOCO);
        let energia = 0; for (let k = 0; k < pedaco.length; k++) energia += pedaco[k] * pedaco[k];
        if (energia / pedaco.length < 1e-6) continue;   // silêncio: nada a dizer
        partes.push(await bloco(pedaco, lingua));
      }
      return partes.filter(Boolean).join(' ').trim();
    },
  };
}
module.exports = { criarNucleo };
