// Voz neural: o modelo (Kokoro, Apache-2.0) e a pronúncia (espeak-ng em WebAssembly) rodam aqui, fora da tela.
// O modelo é baixado uma vez, conferido pelo SHA-256 e guardado neste computador. Nada do que ela fala sai daqui.
import * as ort from '../vendor/voz/ort.wasm.min.mjs';
import iniciarEspeak from '../vendor/voz/espeak-ng.mjs';

const COMMIT = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const URL_MODELO = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${COMMIT}/onnx/model_q8f16.onnx`;
const SHA = '04c658aec1b6008857c2ad10f8c589d4180d0ec427e7e6118ceb487e215c3cd0';
const SR = 24000;
ort.env.wasm.wasmPaths = new URL('../vendor/voz/', import.meta.url).href;
ort.env.wasm.numThreads = 1;

const banco = () => new Promise((ok, erro) => { const r = indexedDB.open('oceano-voz', 1); r.onupgradeneeded = () => r.result.createObjectStore('modelo'); r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
const lerModelo = async () => { const db = await banco(); return new Promise(ok => { const r = db.transaction('modelo').objectStore('modelo').get('kokoro'); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); };
const gravarModelo = async dados => { const db = await banco(); return new Promise((ok, erro) => { const t = db.transaction('modelo', 'readwrite'); t.objectStore('modelo').put(dados, 'kokoro'); t.oncomplete = ok; t.onerror = () => erro(t.error); }); };
const apagarModelo = async () => { const db = await banco(); return new Promise(ok => { const t = db.transaction('modelo', 'readwrite'); t.objectStore('modelo').delete('kokoro'); t.oncomplete = ok; }); };

let sessao = null, vocab = null, espeak = null;
const VOZES = ['brilho', 'mari', 'alex', 'noel'], guardados = {};
const estilosDe = async voz => { const id = VOZES.includes(voz) ? voz : 'brilho'; return (guardados[id] ??= new Float32Array(await (await fetch(new URL(`../vendor/voz/voz-${id}.bin`, import.meta.url))).arrayBuffer())); };
// texto → sons em IPA, em português do Brasil (a pontuação do fim volta porque ela muda a entonação)
async function pronuncia(texto) {
  if (!espeak) {
    const m = await iniciarEspeak({ locateFile: f => new URL('../vendor/voz/' + f, import.meta.url).href });
    espeak = new m.eSpeakNGWorker(); espeak.set_voice('pt-br');
  }
  const ipa = espeak.synthesize_ipa(texto).ipa.replace(/_/g, '').replace(/\s+/g, ' ').replace(/r/g, 'ɾ').replace(/æ/g, 'ɐ').trim();
  return ipa + (/[.!?,;:…]$/.test(texto) ? texto.at(-1) : '');
}
async function abrir(dados) {
  vocab ??= await (await fetch(new URL('../vendor/voz/vocab.json', import.meta.url))).json();
  sessao = await ort.InferenceSession.create(new Uint8Array(dados), { executionProviders: ['wasm'] });
}
async function baixar() {
  const r = await fetch(URL_MODELO);
  if (!r.ok) throw new Error('o download respondeu ' + r.status);
  const total = +r.headers.get('content-length') || 86033585, partes = []; let n = 0;
  for (const leitor = r.body.getReader();;) {
    const { done, value } = await leitor.read(); if (done) break;
    partes.push(value); n += value.length; postMessage({ tipo: 'progresso', fracao: Math.min(1, n / total) });
  }
  const dados = await new Blob(partes).arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', dados))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== SHA) throw new Error('o arquivo baixado não confere');
  await gravarModelo(dados);
  await abrir(dados);
}
async function sintetizar(texto, vel, voz) {
  const fon = await pronuncia(texto);
  const tk = [...fon].map(c => vocab[c]).filter(v => v !== undefined).slice(0, 510);
  if (!tk.length) return new Float32Array(0);
  const ids = new ort.Tensor('int64', BigInt64Array.from([0, ...tk, 0].map(BigInt)), [1, tk.length + 2]);
  const estilo = new ort.Tensor('float32', (await estilosDe(voz)).slice(tk.length * 256, (tk.length + 1) * 256), [1, 256]);
  const veloc = new ort.Tensor('float32', new Float32Array([vel]), [1]);
  const nomes = sessao.inputNames;
  const saida = await sessao.run({ [nomes[0]]: ids, style: estilo, speed: veloc });
  return saida[sessao.outputNames[0]].data;
}
onmessage = async ({ data: m }) => {
  try {
    if (m.tipo === 'iniciar') { const d = await lerModelo(); if (d) await abrir(d); postMessage({ tipo: 'estado', estado: d ? 'pronta' : 'ausente' }); }
    if (m.tipo === 'baixar') { await baixar(); postMessage({ tipo: 'estado', estado: 'pronta' }); }
    if (m.tipo === 'apagar') { await apagarModelo(); sessao = null; postMessage({ tipo: 'estado', estado: 'ausente' }); }
    if (m.tipo === 'falar') { const pcm = await sintetizar(m.texto, m.vel, m.voz); const c = new Float32Array(pcm); postMessage({ tipo: 'pcm', id: m.id, pcm: c, sr: SR }, [c.buffer]); }
  } catch (e) {
    if (m.tipo === 'falar') postMessage({ tipo: 'pcm', id: m.id, erro: String(e.message || e) });
    else postMessage({ tipo: 'estado', estado: 'erro', erro: String(e.message || e) });
  }
};
