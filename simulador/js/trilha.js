// Trilha: uma viagem musical sem fim, "vibe trip", tocada enquanto você navega.
// Os sons são os 16 do ½ sampler (desenhados por síntese offline, nenhum arquivo de áudio),
// mais quatro no mesmo estilo: piano elétrico, pad longo, ondas do mar e chiado de vinil.
// Um compositor com semente monta seções de 8 compassos (acordes, batida, baixo, arpejo, voz),
// e o próprio navegador toca junto: cada página, aba aberta ou fechada vira uma nota do acorde.
import { abrirEditorCorte, juntarPedacos, AVISO_DIREITOS } from './trilha-editor.js';
import { codigoDaTrilha, lerCodigo } from './trilha-codigo.js';
import { ligarCromatica } from './trilha-cromatica.js';
import { icone } from './icones.js';

// ---------- sons (do ½ sampler + extras) ----------

const NOMES = ['kick', 'snare', 'hat', 'hat aberto', 'clap', 'tom', 'rim', 'cowbell', 'baixo', 'acorde', 'pluck', 'pad', 'zap', 'subida', 'vox ah', 'blip',
  'piano', 'pad nota', 'ondas', 'chiado'];
const S = Object.fromEntries(NOMES.map((n, i) => [n, i]));
// nota MIDI em que cada som afinado foi desenhado (o resto toca sem transpor)
const BASE = { [S.tom]: 57, [S.baixo]: 36, [S.pluck]: 72, [S['vox ah']]: 50, [S.blip]: 84, [S.piano]: 60, [S['pad nota']]: 55 };

// 0–15: idênticos ao makeSound do ½ sampler
function renderizar(i, sr) {
  if (i === S.chiado) return Promise.resolve(chiado(sr));
  const len = [0.5, 0.35, 0.08, 0.4, 0.35, 0.5, 0.08, 0.3, 0.8, 1.0, 0.6, 2.0, 0.4, 1.6, 0.9, 0.12, 2.6, 5.0, 6.5][i];
  const oc = new OfflineAudioContext(1, Math.ceil(len * sr), sr), t = 0, out = oc.createGain(); out.connect(oc.destination);
  const noise = () => { const b = oc.createBuffer(1, oc.length, sr), d = b.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; const s = oc.createBufferSource(); s.buffer = b; return s; };
  const env = (g, a, peak, dec, sus = 0.0001) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(sus, t + a + dec); };
  const osc = (type, f) => { const o = oc.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const chain = (src, ...nodes) => { let a = src; for (const n of nodes) { a.connect(n); a = n; } a.connect(out); src.start(t); };
  if (i === 0) { const o = osc('sine', 150), g = oc.createGain(); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, 0.002, 1, 0.45); chain(o, g); }
  if (i === 1) { const n = noise(), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'highpass'; f.frequency.value = 900; env(g, 0.001, 0.8, 0.25); chain(n, f, g); const o = osc('triangle', 190), g2 = oc.createGain(); env(g2, 0.001, 0.6, 0.12); chain(o, g2); }
  if (i === 2 || i === 3) { const n = noise(), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'highpass'; f.frequency.value = 7000; env(g, 0.001, 0.5, i === 2 ? 0.06 : 0.38); chain(n, f, g); }
  if (i === 4) { const n = noise(), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.2; g.gain.setValueAtTime(0.0001, t); for (const d of [0, 0.012, 0.024]) { g.gain.setValueAtTime(0.9, t + d); g.gain.exponentialRampToValueAtTime(0.1, t + d + 0.01); } g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); chain(n, f, g); }
  if (i === 5) { const o = osc('sine', 220), g = oc.createGain(); o.frequency.exponentialRampToValueAtTime(90, t + 0.3); env(g, 0.002, 0.9, 0.45); chain(o, g); }
  if (i === 6) { const o = osc('square', 1700), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'bandpass'; f.frequency.value = 2000; env(g, 0.001, 0.5, 0.05); chain(o, f, g); }
  if (i === 7) { for (const fq of [540, 800]) { const o = osc('square', fq), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'bandpass'; f.frequency.value = fq; env(g, 0.001, 0.3, 0.25); chain(o, f, g); } }
  if (i === 8) { const o = osc('sawtooth', 65.4), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(140, t + 0.4); f.Q.value = 6; env(g, 0.004, 0.7, 0.7); chain(o, f, g); }
  if (i === 9) { for (const fq of [261.6, 311.1, 392, 466.2]) { const o = osc('sawtooth', fq), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.6); env(g, 0.005, 0.18, 0.9); chain(o, f, g); } }
  if (i === 10) { const o = osc('square', 523.3), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.3); env(g, 0.002, 0.4, 0.55); chain(o, f, g); }
  if (i === 11) { for (const [fq, dt] of [[130.8, 0], [196, 4], [261.6, -6], [329.6, 7]]) { const o = osc('sawtooth', fq), f = oc.createBiquadFilter(), g = oc.createGain(); o.detune.value = dt; f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.6); g.gain.setValueAtTime(0.12, t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2); chain(o, f, g); } }
  if (i === 12) { const o = osc('sawtooth', 1800), g = oc.createGain(); o.frequency.exponentialRampToValueAtTime(60, t + 0.35); env(g, 0.001, 0.4, 0.38); chain(o, g); }
  if (i === 13) { const n = noise(), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(8000, t + 1.5); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 1.5); g.gain.linearRampToValueAtTime(0, t + 1.6); chain(n, f, g); }
  if (i === 14) { const o = osc('sawtooth', 146.8); o.frequency.linearRampToValueAtTime(140, t + 0.9); const g = oc.createGain(); env(g, 0.05, 0.5, 0.8); const sum = oc.createGain(); o.connect(sum); o.start(t);
    for (const [fq, q, gn] of [[750, 8, 1], [1150, 9, 0.6], [2600, 10, 0.25]]) { const f = oc.createBiquadFilter(), fg = oc.createGain(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; fg.gain.value = gn; sum.connect(f); f.connect(fg); fg.connect(g); } g.connect(out); }
  if (i === 15) { const o = osc('square', 1046.5), g = oc.createGain(); o.frequency.setValueAtTime(1568, t + 0.04); env(g, 0.001, 0.3, 0.1); chain(o, g); }
  // piano elétrico: FM simples, o brilho do ataque some rápido
  if (i === 16) { const f0 = 261.63, o = osc('sine', f0), m = osc('sine', f0), mi = oc.createGain(), g = oc.createGain(), lp = oc.createBiquadFilter();
    mi.gain.setValueAtTime(320, t); mi.gain.exponentialRampToValueAtTime(18, t + 0.5); m.connect(mi); mi.connect(o.frequency); m.start(t);
    lp.type = 'lowpass'; lp.frequency.value = 4200; env(g, 0.004, 0.5, 2.5); chain(o, g, lp);
    const s = osc('sine', f0 * 2), g2 = oc.createGain(); env(g2, 0.002, 0.07, 0.8); chain(s, g2); }
  // pad longo: duas serras desafinadas e um sub, entra devagar
  if (i === 17) { const f0 = 196, lp = oc.createBiquadFilter(), g = oc.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.6); g.gain.setValueAtTime(0.22, t + 3.8); g.gain.linearRampToValueAtTime(0, t + 5);
    lp.connect(g); g.connect(out);
    for (const [tipo, fq, dt, v] of [['sawtooth', f0, -7, 1], ['sawtooth', f0, 7, 1], ['sine', f0 / 2, 0, 1.4]]) { const o = osc(tipo, fq), og = oc.createGain(); o.detune.value = dt; og.gain.value = v; o.connect(og); og.connect(lp); o.start(t); } }
  // ondas: ruído grave que sobe e desce; o laço vai de 0,5 s a 6,5 s (dois ciclos de 3 s, sem emenda)
  if (i === 18) { const n = noise(), f = oc.createBiquadFilter(), g = oc.createGain(); f.type = 'lowpass'; f.frequency.value = 420;
    const curva = new Float32Array(256); for (let k = 0; k < 256; k++) curva[k] = 0.6 * (0.12 + 0.88 * Math.sin(Math.PI * (k / 255 * 6.5) / 3) ** 2);
    g.gain.setValueCurveAtTime(curva, t, 6.5); chain(n, f, g); }
  return oc.startRendering();
}

// chiado de vinil: chiado bem baixo e estalos espalhados (4 s em laço)
function chiado(sr) {
  const n = sr * 4, b = new AudioBuffer({ length: n, sampleRate: sr }), d = b.getChannelData(0);
  let lp = 0, estalo = 0;
  for (let k = 0; k < n; k++) {
    lp += 0.08 * ((Math.random() * 2 - 1) - lp);
    if (Math.random() < 7 / sr) estalo = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.6);
    estalo *= 0.72;
    d[k] = lp * 0.12 + estalo;
  }
  return b;
}

// ---------- música ----------

const NOTA = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const INTERVALOS = { m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], 9: [0, 4, 7, 10, 14], add9: [0, 4, 7, 14], sus: [0, 5, 7, 10] };
const ROTULO = { m7: 'm7', m9: 'm9', maj7: 'maj7', maj9: 'maj9', 9: '9', add9: 'add9', sus: '7sus4' };
// graus em semitons a partir da tônica (menor)
const PROGRESSOES = [
  [[0, 'm9'], [8, 'maj7'], [3, 'maj9'], [10, 'add9']],
  [[0, 'm9'], [5, 'm7'], [10, '9'], [3, 'maj7']],
  [[0, 'm9'], [10, 'maj9'], [8, 'maj7'], [7, 'm7']],
  [[0, 'm9'], [5, '9'], [0, 'm9'], [5, '9']],
  [[0, 'm7'], [3, 'maj7'], [5, 'm9'], [8, 'maj7']],
  [[8, 'maj9'], [7, 'm7'], [0, 'm9'], [10, 'sus']],
];
const BUMBOS = [[0, 10], [0, 7, 10], [0, 3, 10], [0, 10, 11], [0, 6, 10]];
const BAIXOS = [   // [passo, intervalo, força]
  [[0, 0, 1], [7, 0, 0.6], [10, 0, 0.85], [14, 12, 0.5]],
  [[0, 0, 1], [3, 0, 0.5], [6, 7, 0.7], [10, 0, 0.85]],
  [[0, 0, 1], [8, 0, 0.7], [11, 7, 0.6], [14, 12, 0.55]],
  [[0, 0, 1], [10, 0, 0.9], [13, 12, 0.5]],
];
const STABS = [[6], [11], [3, 10], [7, 14]];
const ARPEJOS = [[0, 1, 2, 3], [3, 2, 1, 0], [0, 1, 2, 3, 2, 1], [0, 2, 1, 3]];
const PENTA = [0, 3, 5, 7, 10];
const TRANSPOR = [0, 5, -2, 3];   // a cada volta a viagem muda de tom

// cada seção dura 8 compassos; uma volta = 6 seções
const SECOES = [
  { nome: 'Cais', texto: 'o barco sai devagar', acordes: 'pad', ondas: 1, luz: 0.62 },
  { nome: 'Maré', texto: 'a batida entra', bumbo: 1, caixa: 1, chimbal: 1, baixo: 1, acordes: 'piano', ondas: 0.35, luz: 0.85 },
  { nome: 'Correnteza', texto: 'o arpejo puxa', bumbo: 1, caixa: 1, chimbal: 1, baixo: 1, acordes: 'piano', arpejo: 1, subida: 1, luz: 1 },
  { nome: 'Neblina', texto: 'tudo flutua', chimbal: 0.5, baixo: 1, acordes: 'pad', voz: 1, ondas: 1, luz: 0.7 },
  { nome: 'Alto-mar', texto: 'tudo junto', bumbo: 1, caixa: 1, palmas: 1, chimbal: 1, baixo: 1, acordes: 'piano', arpejo: 1, voz: 1, subida: 1, luz: 1 },
  { nome: 'Farol', texto: 'a luz chama de volta', bumbo: 1, chimbal: 1, baixo: 1, acordes: 'pad', arpejo: 0.5, ondas: 0.6, luz: 0.8 },
];
const BARRAS_VOLTA = SECOES.length * 8;

export const LINHAS = [
  { id: 'bumbo', nome: 'bumbo', vol: 0.9, eco: 0, sala: 0.04 },
  { id: 'caixa', nome: 'caixa', vol: 0.5, eco: 0.06, sala: 0.3 },
  { id: 'chimbal', nome: 'chimbal', vol: 0.32, eco: 0.05, sala: 0.12 },
  { id: 'baixo', nome: 'baixo', vol: 0.62, eco: 0, sala: 0 },
  { id: 'acordes', nome: 'acordes', vol: 0.42, eco: 0.12, sala: 0.5, abafa: true },
  { id: 'arpejo', nome: 'arpejo', vol: 0.2, eco: 0.5, sala: 0.35 },
  { id: 'voz', nome: 'voz', vol: 0.3, eco: 0.25, sala: 0.85, abafa: true },
  { id: 'navegador', nome: 'navegador', vol: 0.3, eco: 0.5, sala: 0.45 },
];
const L = Object.fromEntries(LINHAS.map((l, i) => [l.id, i]));

const ADIANTE = 1.5;    // segundos agendados à frente (aguenta o timer de 1 s das abas em segundo plano)
const BALANCO = 0.16;   // swing: as semicolcheias pares atrasam um pouco

function sorteio(semente) {   // mulberry32
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// as notas do acorde entre baixo e alto, a mais aguda descendo uma oitava quando passa
function voicing(pc, tipo, baixo, alto, max = 5) {
  const raiz = baixo + (((pc - baixo) % 12) + 12) % 12;
  const notas = INTERVALOS[tipo].slice(0, max).map(i => raiz + i);
  for (let k = 0; k < notas.length; k++) while (notas[k] > alto) notas[k] -= 12;
  return [...new Set(notas)].sort((a, b) => a - b);
}

function curvaDrive(k) {
  const c = new Float32Array(1024), n = Math.tanh(k);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / n; }
  return c;
}

export const PADRAO = { volume: 0.7, tempo: 88, energia: 0.5, brilho: 0.7, espaco: 0.55, fita: 0.4, ouvir: true, mudos: [] };

class Motor {
  constructor(ajustes, semente) {
    this.aj = { ...PADRAO, ...ajustes };
    this.semente = semente;
    this.voltas = new Map();
    this.grade = new Map();     // passo → linhas que tocam nele (para a tela)
    this.minhas = Array(16).fill(null);   // as notas que a pessoa clicou: uma linha por passo do compasso, ou nada
    this.fontes = new Set();
    this.tocando = false;
    this.afundado = false;
    this.notasNavegador = 0;
  }

  async preparar() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new AC({ latencyHint: 'playback' });
    this.sons = await Promise.all(NOMES.map((_, i) => renderizar(i, ctx.sampleRate)));

    // mistura → filtro → drive → fita (wow) → compressor → volume → saída
    this.mix = ctx.createGain();
    this.filtro = ctx.createBiquadFilter(); this.filtro.type = 'lowpass'; this.filtro.Q.value = 0.8;
    this.drive = ctx.createWaveShaper(); this.drive.oversample = '2x';
    this.fita = ctx.createDelay(0.1); this.fita.delayTime.value = 0.02;
    this.wow = ctx.createOscillator(); this.wow.frequency.value = 0.55; this.wowG = ctx.createGain(); this.wow.connect(this.wowG); this.wowG.connect(this.fita.delayTime); this.wow.start();
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.analisador = ctx.createAnalyser(); this.analisador.fftSize = 256;
    this.agua = ctx.createBiquadFilter(); this.agua.type = 'lowpass'; this.agua.frequency.value = 20000;   // o modo jogo afunda a música aqui
    this.mix.connect(this.filtro); this.filtro.connect(this.agua); this.agua.connect(this.drive); this.drive.connect(this.fita); this.fita.connect(this.comp); this.comp.connect(this.master);
    this.master.connect(this.analisador); this.analisador.connect(ctx.destination);

    // eco pontuado (3/16) com o retorno escurecendo, e sala (reverb de ruído, igual ao do sampler)
    this.eco = ctx.createDelay(2); this.ecoFb = ctx.createGain(); this.ecoLp = ctx.createBiquadFilter(); this.ecoLp.type = 'lowpass'; this.ecoLp.frequency.value = 2400;
    this.ecoVolta = ctx.createGain();
    this.eco.connect(this.ecoLp); this.ecoLp.connect(this.ecoFb); this.ecoFb.connect(this.eco); this.ecoLp.connect(this.ecoVolta); this.ecoVolta.connect(this.mix);
    this.sala = ctx.createConvolver(); this.sala.buffer = this.impulso(3.4); this.salaVolta = ctx.createGain();
    this.sala.connect(this.salaVolta); this.salaVolta.connect(this.mix);

    // o que é "abafa" baixa um pouco a cada bumbo (o pad respira com a batida)
    this.respira = ctx.createGain(); this.respira.connect(this.mix);
    this.bus = LINHAS.map(l => {
      const g = ctx.createGain(); g.connect(l.abafa ? this.respira : this.mix);
      if (l.eco) { const s = ctx.createGain(); s.gain.value = l.eco; g.connect(s); s.connect(this.eco); }
      if (l.sala) { const s = ctx.createGain(); s.gain.value = l.sala; g.connect(s); s.connect(this.sala); }
      return g;
    });
    this.clima = ctx.createGain(); this.clima.connect(this.mix);
    const sCl = ctx.createGain(); sCl.gain.value = 0.5; this.clima.connect(sCl); sCl.connect(this.sala);

    this.ondasG = ctx.createGain(); this.ondasG.gain.value = 0; this.ondasG.connect(this.clima);
    this.chiadoG = ctx.createGain(); this.chiadoG.connect(this.mix);
    const laco = (som, saida, de = 0, ate = 0) => { const f = ctx.createBufferSource(); f.buffer = this.sons[som]; f.loop = true; if (ate) { f.loopStart = de; f.loopEnd = ate; } f.connect(saida); f.start(); };
    laco(S.ondas, this.ondasG, 0.5, 6.5);
    laco(S.chiado, this.chiadoG);

    this.aplicar();
    await ctx.suspend();
    this.zerar();
    setInterval(() => this.agendar(), 200);
  }

  impulso(seg) {
    const sr = this.ctx.sampleRate, n = Math.ceil(sr * seg), b = this.ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 3); }
    return b;
  }

  get d16() { return 60 / this.aj.tempo / 4; }

  // os ajustes valem na hora (os padrões mudam no que ainda não foi agendado)
  aplicar() {
    if (!this.ctx) return;
    const a = this.aj, t = this.ctx.currentTime, liso = (p, v, k = 0.08) => p.setTargetAtTime(v, t, k);
    liso(this.master.gain, this.afundado ? a.volume ** 2 * 0.55 : a.volume ** 2);
    this.corte(t);
    this.drive.curve = curvaDrive(1 + a.fita * 2.5);
    liso(this.wowG.gain, 0.0004 + a.fita * 0.0032);
    liso(this.chiadoG.gain, a.fita * 0.22);
    liso(this.ecoVolta.gain, 0.15 + a.espaco * 0.85);
    liso(this.salaVolta.gain, 0.2 + a.espaco * 1.1);
    liso(this.ecoFb.gain, 0.25 + a.espaco * 0.35);
    liso(this.eco.delayTime, this.d16 * 3, 0.3);
    LINHAS.forEach((l, i) => liso(this.bus[i].gain, a.mudos.includes(l.id) ? 0 : l.vol, 0.03));
  }

  corte(t, luz = this.luz ?? 1) {
    this.luz = luz;
    this.filtro.frequency.setTargetAtTime(300 * 2 ** (5.7 * this.aj.brilho * luz), t, 0.25);
  }

  afundar(v) {
    this.afundado = v;
    if (this.ctx) this.agua.frequency.setTargetAtTime(v ? 420 : 20000, this.ctx.currentTime, v ? 0.5 : 0.8);
    this.aplicar();
  }

  zerar() {
    for (const f of this.fontes) { try { f.stop(); } catch (e) {} }
    this.fontes.clear(); this.grade.clear(); this.voltas.clear();
    this.respira.gain.cancelScheduledValues(0); this.respira.gain.value = 1;
    this.proxPasso = 0; this.proxT = this.ctx.currentTime + 0.1;
  }

  async alternar(v = !this.tocando) {
    this.tocando = v;
    if (v) { await this.ctx.resume(); this.agendar(); } else await this.ctx.suspend();
  }

  novaViagem(semente) { this.semente = semente; this.zerar(); this.agendar(); }

  agendar() {
    if (!this.tocando || this.ctx.state !== 'running') return;
    const ate = this.ctx.currentTime + ADIANTE;
    if (this.proxT < this.ctx.currentTime) this.proxT = this.ctx.currentTime + 0.05;   // voltou de uma pausa longa do timer
    while (this.proxT < ate) {
      const n = this.proxPasso, t = this.proxT + (n & 1 ? this.d16 * BALANCO : 0);
      try { this.passo(n, t); } catch (e) { console.warn('trilha: passo', n, e); }   // um passo com erro não para a música
      this.proxT += this.d16; this.proxPasso++;
    }
    for (const k of this.grade.keys()) if (k < this.proxPasso - 64) this.grade.delete(k);
  }

  volta(v) {
    if (!this.voltas.has(v)) {
      if (this.voltas.size > 3) this.voltas.delete(this.voltas.keys().next().value);
      const r = sorteio(this.semente * 7919 + v * 104729), um = a => a[Math.floor(r() * a.length)];
      const tom = (this.semente % 12 + TRANSPOR[v % 4] + 12) % 12;
      // a voz: frase de 2 compassos, 3 ou 4 notas da pentatônica
      const passos = [0, 3, 6, 10, 14, 16, 19, 22, 26].filter(() => r() < 0.45).slice(0, 4);
      const melodia = new Map(passos.map(p => [p, 45 + ((tom + um(PENTA) - 45) % 12 + 12) % 12]));
      this.voltas.set(v, { tom, prog: um(PROGRESSOES), bumbo: um(BUMBOS), baixo: um(BAIXOS), stab: um(STABS), arp: um(ARPEJOS), melodia, lento: r() < 0.35 });
    }
    return this.voltas.get(v);
  }

  plano(barra) {
    const v = Math.floor(barra / BARRAS_VOLTA), dentro = barra % BARRAS_VOLTA, si = Math.floor(dentro / 8), bs = dentro % 8;
    const V = this.volta(v), [grau, tipo] = V.prog[(V.lento ? Math.floor(bs / 2) : bs) % 4], pc = (V.tom + grau) % 12;
    return { v, si, bs, S: SECOES[si], prox: SECOES[(si + 1) % SECOES.length], V, ultimo: bs === 7, acorde: { pc, tipo, nome: NOTA[pc] + ROTULO[tipo] } };
  }

  toca(som, t, linha, o = {}) {
    const ctx = this.ctx, f = ctx.createBufferSource(), g = ctx.createGain();
    f.buffer = this.sons[som];
    if (o.nota != null && som in BASE) f.playbackRate.value = 2 ** ((o.nota - BASE[som]) / 12);
    const vel = (o.vel ?? 0.8) * (0.9 + Math.random() * 0.2);
    g.gain.value = vel;
    f.connect(g);
    let saida = g;
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); saida = p; }
    saida.connect(linha == null ? this.clima : this.bus[linha]);
    t = Math.max(t + (o.solto ? 0 : (Math.random() - 0.5) * 0.008), ctx.currentTime);
    f.start(t);
    if (o.dur) { g.gain.setValueAtTime(vel, t + o.dur); g.gain.linearRampToValueAtTime(0, t + o.dur + 0.5); f.stop(t + o.dur + 0.55); }
    this.fontes.add(f); f.onended = () => this.fontes.delete(f);
    if (linha != null && o.passo != null) this.grade.set(o.passo, (this.grade.get(o.passo) || 0) | (1 << linha));
  }

  // a nota clicada toca o som da linha dela, dentro do acorde de agora
  tocarLinha(linha, t, n, acorde) {
    const notas = voicing(acorde.pc, acorde.tipo, 62, 79, 4), o = x => ({ passo: n, ...x }), id = LINHAS[linha]?.id;
    if (id === 'bumbo') this.toca(S.kick, t, linha, o({ vel: 0.9 }));
    else if (id === 'caixa') this.toca(S.snare, t, linha, o({ vel: 0.7 }));
    else if (id === 'chimbal') this.toca(S.hat, t, linha, o({ vel: 0.7 }));
    else if (id === 'baixo') this.toca(S.baixo, t, linha, o({ vel: 0.8, nota: 33 + (((acorde.pc - 33) % 12) + 12) % 12, dur: this.d16 * 2.5 }));
    else if (id === 'acordes') this.toca(S.piano, t, linha, o({ vel: 0.5, nota: notas[0], dur: this.d16 * 3 }));
    else if (id === 'voz') this.toca(S['vox ah'], t, linha, o({ vel: 0.6, nota: notas[0] - 12 }));
    else this.toca(S.pluck, t, linha, o({ vel: 0.55, nota: notas[linha % notas.length] }));
  }

  passo(n, t) {
    const b = n >> 4, s = n & 15, p = this.plano(b), { S: sec, V, acorde } = p, E = this.aj.energia, d16 = this.d16, r = Math.random;
    const bar = d16 * 16, o = (x = {}) => ({ passo: n, ...x });
    if (s === 0) {
      this.corte(t, sec.luz);
      this.ondasG.gain.setTargetAtTime((sec.ondas || 0) * 0.9, t, 1.5);
      if (p.bs === 0 && sec.nome === 'Neblina') this.toca(S.zap, t, null, { vel: 0.18 });
    }
    // uma nota por vez: onde a pessoa clicou, toca só a dela
    if (this.minhas[s] != null) { this.tocarLinha(this.minhas[s], t, n, acorde); this.grade.set(n, 1 << this.minhas[s]); return; }
    // bumbo (e o pad respira junto)
    const bumbo = sec.bumbo && (V.bumbo.includes(s) || (s === 14 && b & 1 && r() < E - 0.4));
    if (bumbo) {
      this.toca(S.kick, t, L.bumbo, o({ vel: s === 0 ? 1 : 0.8 }));
      const g = this.respira.gain; g.setTargetAtTime(0.5, t, 0.006); g.setTargetAtTime(1, t + 0.07, 0.14);
    }
    // caixa, palmas e as notas fantasma
    if (sec.caixa) {
      if (s === 4 || s === 12) { this.toca(S.snare, t, L.caixa, o({ vel: 0.8 })); if (sec.palmas) this.toca(S.clap, t + 0.004, L.caixa, o({ vel: 0.45 })); }
      else if ((s === 7 || s === 9 || s === 15) && r() < E * 0.4) this.toca(S.snare, t, L.caixa, o({ vel: 0.14 }));
      // virada no último compasso antes de outra seção com batida
      if (p.ultimo && p.prox.caixa && s >= 12) {
        const vel = 0.25 + (s - 12) * 0.12;
        if (E > 0.5 && s % 2 === 0) this.toca(S.tom, t, L.caixa, o({ vel, nota: 57 - (s - 12) * 2 }));
        else this.toca(S.snare, t, L.caixa, o({ vel }));
      }
    }
    if (sec.bumbo && s === 10 && b % 4 === 3) this.toca(S.rim, t, L.caixa, o({ vel: 0.35 }));
    // chimbal
    if (sec.chimbal === 1) {
      if (s % 4 === 2) this.toca(S.hat, t, L.chimbal, o({ vel: 0.7, pan: 0.15 }));   // poucos pontos: a sugestão deixa espaço
      if (s === 14 && b % 2 === 1) this.toca(S['hat aberto'], t, L.chimbal, o({ vel: 0.4, pan: -0.1 }));
    } else if (sec.chimbal && s % 4 === 2) this.toca(S.hat, t, L.chimbal, o({ vel: 0.3, pan: 0.2 }));
    // baixo
    if (sec.baixo) for (const [ps, iv, f] of V.baixo.slice(0, 2)) if (ps === s) {
      let nota = 33 + (((acorde.pc - 33) % 12) + 12) % 12 + iv;
      if (nota > 50) nota -= 12;   // o salto de oitava numa raiz alta não sai do grave
      this.toca(S.baixo, t, L.baixo, o({ vel: 0.85 * f, nota, dur: ps === 0 ? d16 * 5 : d16 * 2.5 }));
    }
    // acordes: pad longo ou piano com respostas fora do tempo
    if (sec.acordes === 'pad' && s === 0) {
      voicing(acorde.pc, acorde.tipo, 50, 69, 4).forEach((nt, k) => this.toca(S['pad nota'], t, L.acordes, o({ vel: 0.55, nota: nt, dur: bar + 0.1, pan: (k - 1.5) * 0.25, solto: true })));
    }
    if (sec.acordes === 'piano' && (s === 0 || (E > 0.3 && V.stab.includes(s)))) {
      voicing(acorde.pc, acorde.tipo, 52, 72).forEach((nt, k) => this.toca(S.piano, t + k * 0.012, L.acordes, o({ vel: s === 0 ? 0.5 : 0.3, nota: nt, dur: s === 0 ? bar * 0.9 : d16 * 3 })));
    }
    // arpejo
    if (sec.arpejo) {
      const div = sec.arpejo === 1 && E > 0.6 ? 2 : 4;
      if (s % div === 0) {
        const notas = voicing(acorde.pc, acorde.tipo, 62, 79, 4), k = V.arp[(s / div) % V.arp.length];
        this.toca(S.pluck, t, L.arpejo, o({ vel: s % 4 === 0 ? 0.6 : 0.4, nota: notas[k % notas.length], pan: (s / div) % 2 ? 0.35 : -0.35 }));
      }
    }
    // voz
    if (sec.voz) { const nt = V.melodia.get((b % 2) * 16 + s); if (nt) this.toca(S['vox ah'], t, L.voz, o({ vel: 0.6, nota: nt, pan: -0.15 })); }
    // subida antes das seções que crescem
    if (p.ultimo && p.prox.subida && s === Math.max(0, 16 - Math.round(1.6 / d16))) this.toca(S.subida, t, null, { vel: 0.3, solto: true });
  }

  // o navegador toca: a nota cai na próxima colcheia, dentro do acorde daquele compasso
  reagir(tipo) {
    if (!this.tocando || !this.aj.ouvir || this.ctx.state !== 'running') return;
    const d16 = this.d16, agora = this.ctx.currentTime + 0.04;
    let n = this.proxPasso + Math.ceil((agora - this.proxT) / d16);
    if (n & 1) n++;
    const t = this.proxT + (n - this.proxPasso) * d16, { acorde } = this.plano(Math.max(0, n) >> 4);
    const notas = voicing(acorde.pc, acorde.tipo, 74, 90, 4), um = a => a[Math.floor(Math.random() * a.length)];
    if (tipo === 'navegar') this.toca(S.pluck, t, L.navegador, { passo: n, vel: 0.55, nota: um(notas), pan: 0.3 });
    if (tipo === 'aba_aberta') this.toca(S.blip, t, L.navegador, { passo: n, vel: 0.4, nota: 84 + ((acorde.pc - 84) % 12 + 12) % 12 });
    if (tipo === 'aba_fechada') this.toca(S.tom, t, L.navegador, { passo: n, vel: 0.5, nota: 45 + ((acorde.pc - 45) % 12 + 12) % 12 });
    this.notasNavegador++;
  }

  // agora (o que se ouve, descontando a latência da saída)
  agora() {
    const t = this.ctx.currentTime - (this.ctx.outputLatency || this.ctx.baseLatency || 0);
    const n = this.proxPasso - Math.ceil((this.proxT - t) / this.d16);
    return Math.max(0, n);
  }

  async gravar() {
    const ctx = this.ctx;
    if (this.gravacao) {
      const { no, pedacos } = this.gravacao; this.gravacao = null;
      no.port.onmessage = null; this.master.disconnect(no); no.disconnect();
      return { ...juntarPedacos(pedacos), sr: ctx.sampleRate };
    }
    if (!this.gravadorPronto) { await ctx.audioWorklet.addModule(new URL('./trilha-gravador.js', import.meta.url)); this.gravadorPronto = true; }
    const no = new AudioWorkletNode(ctx, 'oceano-gravador', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    const mudo = ctx.createGain(); mudo.gain.value = 0; no.connect(mudo); mudo.connect(ctx.destination);
    const pedacos = [], limite = ctx.sampleRate * 600 / 128;   // até 10 minutos
    no.port.onmessage = e => { if (pedacos.length < limite) pedacos.push(e.data); };
    this.master.connect(no);
    this.gravacao = { no, pedacos, inicio: performance.now() };
    return null;
  }
}


// ---------- painel ----------

const BOTOES = [
  ['volume', 'volume', 0, 1, 0.01],
  ['tempo', 'tempo', 70, 110, 1],
  ['energia', 'energia', 0, 1, 0.01],
  ['brilho', 'brilho', 0, 1, 0.01],
  ['espaco', 'espaço', 0, 1, 0.01],
  ['fita', 'fita', 0, 1, 0.01],
];
const nomeViagem = s => '#' + (s >>> 0).toString(16).toUpperCase().padStart(6, '0').slice(-6);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function montarTrilha(app, raiz, guardado) {
  const salvo = guardado.ler('trilha', {});
  let semente = (salvo.semente ?? Math.random() * 2 ** 24) & 0xFFFFFF;   // a viagem cabe na primeira cor
  const motor = new Motor(salvo, semente);
  const aj = motor.aj;
  let aoMudar = () => {};
  const guardar = () => { guardado.gravar('trilha', { ...aj, semente }); aoMudar(); };

  raiz.innerHTML = `
    <div class="tr-col">
    <div class="tr-topo">
      <h2 class="tr-titulo">Trilha</h2>
      <span class="tr-dica"><button type="button" class="tr-ajuda" aria-describedby="tr-ajuda-texto" aria-label="O que é a Trilha">?</button><span class="tr-balao" id="tr-ajuda-texto" role="tooltip">Quem cria a música é ${esc(app.assistente?.nome?.() || 'a Cara')}. Clique na grade para pôr as suas notas.<span class="tr-paragrafo">${esc(AVISO_DIREITOS)}</span></span></span>
    </div>
    <div class="tr-botoes">
      <button class="btn tr-tocar" data-tr="tocar">Tocar</button>
      <button class="btn secundario" data-tr="nova">Nova viagem</button>
      <button type="button" class="btn secundario tr-gravar" data-tr="gravar" title="Gravar para baixar" aria-label="Gravar para baixar">${icone('baixar')}<span data-tr-tempo></span></button>
    </div>
    <div class="tr-editor px" data-tr-editor hidden></div>
    <div class="tr-info"><span class="chip tr-secao">pronta</span><span class="tr-texto-secao"></span><b class="tr-acorde"></b></div>
    <div class="tr-palco px"><canvas class="tr-tela" width="96" height="70" aria-label="O que está tocando. Clique para colocar uma nota"></canvas></div>
    <button class="btn mini secundario tr-limpar" data-tr-limpar hidden>limpar as minhas notas</button>
    <div class="tr-linhas">${LINHAS.map(l => `<button class="chip tr-linha${l.id === 'navegador' ? ' nav' : ''}" data-linha="${l.id}" aria-pressed="${!aj.mudos.includes(l.id)}" title="ligar ou calar">${l.nome}</button>`).join('')}</div>
    <label class="tr-opcao"><input type="checkbox" data-tr="ouvir" ${aj.ouvir ? 'checked' : ''}> o navegador toca junto <small>(páginas, abas; no modo jogo a música afunda)</small></label>
    </div>
    <div class="tr-col">
    <div class="tr-ajustes">${BOTOES.map(([k, nome, min, max, passo]) => `
      <label class="tr-ajuste"><span>${nome}<b data-valor="${k}"></b></span><input type="range" min="${min}" max="${max}" step="${passo}" value="${aj[k]}" data-aj="${k}"></label>`).join('')}
    </div>
    <button type="button" class="tr-cromatica" data-tr-cromatica><span class="tr-tiras"><span class="tr-tiras-fila"></span><span class="tr-cro-linhas"><i></i><i></i><i></i></span></span><span class="tr-cro-texto"><span>copiar escala cromática da música</span></span></button>
    <form class="tr-colar" data-tr-colar><input name="escala" autocomplete="off" spellcheck="false" placeholder="cole a escala de outra pessoa" aria-label="cole a escala de outra pessoa"><button class="btn mini secundario">abrir</button></form>
    <p class="tr-colar-aviso" data-tr-aviso role="status"></p>
    <p class="tr-escala"><code class="tr-semente" data-sensivel></code></p>
    <p class="as-nota">· sons do ½ sampler, gerados neste computador, sem arquivos. ${esc(app.atalhos?.mostrar('trilha') || '⌥M')} toca ou pausa de qualquer página.</p>
    </div>`;

  const $ = s => raiz.querySelector(s);
  const tela = $('.tr-tela'), ctx = tela.getContext('2d');
  const btTocar = $('[data-tr="tocar"]'), btGravar = $('[data-tr="gravar"]');
  const indicador = () => document.querySelector('#btn-trilha');   // na barra de cima, só enquanto toca

  const mostrarValores = () => {
    for (const [k] of BOTOES) $(`[data-valor="${k}"]`).textContent = k === 'tempo' ? aj.tempo + ' bpm' : Math.round(aj[k] * 100);
  };
  mostrarValores();

  btTocar.disabled = true; btTocar.textContent = 'preparando…';
  await motor.preparar();
  btTocar.disabled = false;
  let relogio = 0;
  const iniciarRelogio = () => { const t0 = performance.now(), el = $('[data-tr-tempo]'); const passo = () => { const s = Math.floor((performance.now() - t0) / 1000); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }; passo(); relogio = setInterval(passo, 500); };
  const pararRelogio = () => { clearInterval(relogio); $('[data-tr-tempo]').textContent = ''; };
  const estado = async v => {
    await motor.alternar(v);
    if (motor.tocando) app.emitir?.('musica-tocou', 'trilha');
    btTocar.innerHTML = `${icone(motor.tocando ? 'pausa' : 'play')}<span>${motor.tocando ? 'Pausar' : 'Tocar'}</span>`;
    btTocar.setAttribute('aria-pressed', motor.tocando);
    if (indicador()) indicador().hidden = !motor.tocando;
  };
  estado(false);

  raiz.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tr === 'tocar') estado();
    if (b.dataset.tr === 'nova') {
      semente = (Math.random() * 2 ** 24) >>> 0; motor.novaViagem(semente); guardar();
      if (!motor.tocando) estado(true);
    }
    if (b.dataset.tr === 'gravar') {
      if (!motor.tocando) await estado(true);
      const gravacao = await motor.gravar();
      if (!gravacao) { btGravar.classList.add('perigo'); btGravar.setAttribute('aria-pressed', 'true'); btGravar.setAttribute('aria-label', 'Parar a gravação'); iniciarRelogio(); return; }
      pararRelogio();
      btGravar.classList.remove('perigo'); btGravar.setAttribute('aria-pressed', 'false'); btGravar.setAttribute('aria-label', 'Gravar para baixar');
      if (!gravacao.l.length) return app.aviso('A gravação ficou vazia.', 'Trilha');
      abrirEditorCorte($('[data-tr-editor]'), gravacao, { aoBaixar: arquivo => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(arquivo); a.download = `oceano-viagem-${nomeViagem(semente).slice(1)}.wav`;
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        app.aviso(`Viagem gravada: ${(arquivo.size / 1048576).toFixed(1)} MB em .wav`, 'Trilha');
        app.musica?.receber({ blob: arquivo, nome: a.download, de: 'Trilha' });
      } });
    }
    if (b.dataset.linha) {
      const id = b.dataset.linha, i = aj.mudos.indexOf(id);
      if (i >= 0) aj.mudos.splice(i, 1); else aj.mudos.push(id);
      b.setAttribute('aria-pressed', i >= 0); motor.aplicar(); guardar();
    }
  });
  raiz.addEventListener('input', e => {
    const k = e.target.dataset.aj;
    if (k) { aj[k] = Number(e.target.value); motor.aplicar(); mostrarValores(); guardar(); }
    if (e.target.dataset.tr === 'ouvir') { aj.ouvir = e.target.checked; guardar(); }
  });

  // o navegador toca junto
  for (const ev of ['navegar', 'aba_aberta', 'aba_fechada']) app.on(ev, () => motor.reagir(ev));
  app.on('modo_jogo', v => motor.afundar(v));
  if (app.modoJogo) motor.afundar(true);

  // ----- tela: a onda em cima e o compasso atual embaixo (as notas já agendadas aparecem antes) -----
  let cores = {};
  function lerCores() {
    const css = getComputedStyle(document.documentElement);
    for (const k of ['fundo', 'painel', 'elevado', 'borda', 'acento', 'sol', 'destaque', 'suave']) cores[k] = css.getPropertyValue('--' + k).trim();
  }
  lerCores();
  const onda = new Uint8Array(128);
  let rotulo = '';
  function desenhar() {
    ctx.fillStyle = cores.fundo; ctx.fillRect(0, 0, 96, 70);
    motor.analisador.getByteTimeDomainData(onda);
    ctx.fillStyle = cores.acento;
    for (let x = 0; x < 96; x++) { const y = Math.round(7 + Math.max(-7, Math.min(6, (onda[Math.floor(x * 4 / 3)] - 128) / 128 * 22))); ctx.fillRect(x, y, 1, 1); }
    const agora = motor.agora(), inicio = agora & ~15;
    for (let s = 0; s < 16; s++) {
      const minha = motor.minhas[s], m = minha != null ? 1 << minha : motor.grade.get(inicio + s) || 0, atual = motor.tocando && inicio + s === agora;
      LINHAS.forEach((l, r) => {
        const toca = m & (1 << r), mudo = aj.mudos.includes(l.id);
        if (minha === r) { ctx.fillStyle = atual ? cores.sol : cores.destaque; ctx.fillRect(s * 6, 16 + r * 6, 5, 5); return; }
        ctx.fillStyle = !toca ? (atual ? cores.elevado : cores.painel)
          : mudo ? cores.elevado : atual ? cores.sol : inicio + s > agora ? cores.borda : l.id === 'navegador' ? cores.destaque : cores.acento;
        ctx.fillRect(s * 6, 16 + r * 6, 5, 5);
      });
    }
    const p = motor.plano(agora >> 4), novo = `${p.S.nome}|${p.S.texto}|${p.acorde.nome}|${p.bs + 1}`;
    if (novo !== rotulo) {
      rotulo = novo;
      $('.tr-secao').textContent = motor.tocando || agora ? p.S.nome : 'pronta';
      $('.tr-texto-secao').textContent = motor.tocando || agora ? `${p.S.texto} · ${p.bs + 1}/8` : '';
      $('.tr-acorde').textContent = motor.tocando || agora ? esc(p.acorde.nome) : '';
    }
  }
  // clicar na grade: uma nota por coluna; clicar na mesma tira. As notas ficam guardadas neste navegador
  // a escala cromática: copiar guarda a música inteira em 6 cores, e colar abre a de outra pessoa
  const coresAgora = () => codigoDaTrilha({ semente, aj, minhas: motor.minhas, linhas: LINHAS });
  const cromatica = ligarCromatica(raiz.querySelector('[data-tr-cromatica]'), { texto: () => coresAgora().join(' ') });
  aoMudar = () => { const c = coresAgora(); cromatica.pintar(c); raiz.querySelector('.tr-semente').textContent = c.join(' '); };
  aoMudar();
  raiz.querySelector('[data-tr-colar]').addEventListener('submit', e => {
    e.preventDefault();
    const aviso = raiz.querySelector('[data-tr-aviso]'), d = lerCodigo(e.target.elements.escala.value, LINHAS);
    if (!d) { aviso.textContent = 'Essa escala não é de uma trilha.'; return; }
    semente = d.semente;
    for (const k of ['tempo', 'energia', 'brilho', 'espaco', 'fita']) { aj[k] = d[k]; const i = raiz.querySelector(`[data-aj="${k}"]`); if (i) i.value = d[k]; }
    aj.mudos = d.mudos;
    raiz.querySelectorAll('[data-linha]').forEach(b => b.setAttribute('aria-pressed', !aj.mudos.includes(b.dataset.linha)));
    motor.minhas = d.minhas; guardado.gravar('trilha-minhas', motor.minhas);
    motor.novaViagem(semente); motor.aplicar(); mostrarValores(); marcarLimpar(); desenhar(); guardar();
    e.target.reset(); aviso.textContent = 'Música aberta.';
    if (!motor.tocando) estado(true);
  });
  const grade = raiz.querySelector('.tr-tela'), btLimpar = raiz.querySelector('[data-tr-limpar]');
  const lidas = guardado.ler('trilha-minhas', null);
  if (Array.isArray(lidas) && lidas.length === 16) motor.minhas = lidas.map(v => (Number.isInteger(v) && v >= 0 && v < LINHAS.length ? v : null));
  const marcarLimpar = () => { btLimpar.hidden = !motor.minhas.some(v => v != null); };
  marcarLimpar();
  grade.addEventListener('click', e => {
    const c = grade.getBoundingClientRect(), x = (e.clientX - c.left) * 96 / c.width, y = (e.clientY - c.top) * 70 / c.height;
    const s = Math.floor(x / 6), r = Math.floor((y - 16) / 6);
    if (s < 0 || s > 15 || r < 0 || r >= LINHAS.length) return;
    motor.minhas[s] = motor.minhas[s] === r ? null : r;
    guardado.gravar('trilha-minhas', motor.minhas);
    marcarLimpar(); desenhar(); aoMudar();
    if (motor.tocando && motor.minhas[s] != null) motor.tocarLinha(r, motor.ctx.currentTime, null, motor.plano(motor.agora() >> 4).acorde);
  });
  btLimpar.onclick = () => { motor.minhas.fill(null); guardado.gravar('trilha-minhas', motor.minhas); marcarLimpar(); desenhar(); aoMudar(); };
  let ultimo = 0;
  (function quadro(agora) {
    requestAnimationFrame(quadro);
    if (document.hidden || !raiz.offsetParent || agora - ultimo < 1000 / 24) return;   // só desenha com o painel à vista
    ultimo = agora;
    const a = performance.now(); desenhar(); app.medidor?.somar('trilha', performance.now() - a);
  })(0);
  desenhar();

  return { atualizarCores: () => { lerCores(); desenhar(); }, alternar: estado, motor, desenhar };
}
