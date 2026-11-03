// Sons chiptune gerados na hora (WebAudio). Nenhum arquivo de áudio.
// Um som é uma tabela: { onda, de, ate, dur, vol, notas? }.

const ONDAS = { quadrada: 'square', triangulo: 'triangle', serra: 'sawtooth', seno: 'sine' };

export const PRESETS = {
  clique:   { onda: 'quadrada', de: 900, ate: 700, dur: 0.03, vol: 0.12 },
  bolha:    { onda: 'seno', de: 300, ate: 900, dur: 0.09, vol: 0.3 },
  fechar:   { onda: 'triangulo', de: 600, ate: 200, dur: 0.08, vol: 0.3 },
  pulo:     { onda: 'quadrada', de: 260, ate: 620, dur: 0.12, vol: 0.18 },
  moeda:    { onda: 'quadrada', notas: [988, 1319], dur: 0.14, vol: 0.16 },
  erro:     { onda: 'serra', de: 220, ate: 60, dur: 0.3, vol: 0.2 },
  powerup:  { onda: 'quadrada', notas: [523, 659, 784, 1047], dur: 0.32, vol: 0.15 },
  desligar: { onda: 'quadrada', notas: [784, 523, 392], dur: 0.24, vol: 0.15 },
  ruido:    { onda: 'ruido', dur: 0.15, vol: 0.2 },
};

let ctx = null;
let ligado = false;

export function somLigado() { return ligado; }

export function ligarSom(v) {
  ligado = v;
  if (v && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (v && ctx && ctx.state === 'suspended') ctx.resume();
}

function num(v, padrao, min, max) {
  const n = typeof v === 'number' && isFinite(v) ? v : padrao;
  return Math.min(max, Math.max(min, n));
}

// Normaliza qualquer coisa vinda do Lua; valores fora da faixa são limitados.
export function normalizar(def) {
  if (typeof def === 'string') def = PRESETS[def];
  if (!def || typeof def !== 'object') return null;
  const notas = Array.isArray(def.notas) ? def.notas.slice(0, 16).map(n => num(n, 440, 30, 8000)) : null;
  return {
    onda: def.onda in ONDAS || def.onda === 'ruido' ? def.onda : 'quadrada',
    de: num(def.de, 440, 30, 8000),
    ate: num(def.ate, def.de ?? 440, 30, 8000),
    dur: num(def.dur, 0.1, 0.01, 1.5),
    vol: num(def.vol, 0.2, 0, 0.5),
    notas,
  };
}

export function tocar(def) {
  if (!ligado || !ctx) return;
  const s = normalizar(def);
  if (!s) return;
  const t0 = ctx.currentTime;
  const ganho = ctx.createGain();
  ganho.gain.setValueAtTime(s.vol, t0);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + s.dur);
  ganho.connect(ctx.destination);

  let fonte;
  if (s.onda === 'ruido') {
    const n = Math.ceil(ctx.sampleRate * s.dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // ruído "8-bit": amostra segurada por alguns frames
    let v = 0;
    for (let i = 0; i < n; i++) { if (i % 8 === 0) v = Math.random() * 2 - 1; d[i] = v; }
    fonte = ctx.createBufferSource();
    fonte.buffer = buf;
  } else {
    fonte = ctx.createOscillator();
    fonte.type = ONDAS[s.onda];
    if (s.notas) {
      const passo = s.dur / s.notas.length;
      s.notas.forEach((f, i) => fonte.frequency.setValueAtTime(f, t0 + i * passo));
    } else {
      fonte.frequency.setValueAtTime(s.de, t0);
      fonte.frequency.exponentialRampToValueAtTime(s.ate, t0 + s.dur);
    }
  }
  fonte.connect(ganho);
  fonte.start(t0);
  fonte.stop(t0 + s.dur + 0.02);
}
