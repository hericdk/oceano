// O mini editor da gravação da Trilha: recorte e fades em mini knobs, antes de baixar. Tudo aqui mesmo, sem enviar nada.

import { icone } from './icones.js';

export const AVISO_DIREITOS = 'Feita por código e IA, livre: use nos seus vídeos e, por favor, cite os créditos 😉';

const tempo = s => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };

export function juntarPedacos(pedacos) {
  const n = pedacos.reduce((s, p) => s + p[0].length, 0), l = new Float32Array(n), r = new Float32Array(n);
  let o = 0;
  for (const [a, b] of pedacos) { l.set(a, o); r.set(b, o); o += a.length; }
  return { l, r };
}

// o trecho escolhido, com os fades, em .wav de 16 bits
export function cortarWav({ l, r, sr }, { ini, fim, fadeIn, fadeOut }) {
  const a = Math.max(0, Math.round(ini * sr)), b = Math.min(l.length, Math.round(fim * sr)), n = Math.max(0, b - a);
  const buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf), txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); txt(8, 'WAVE'); txt(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); txt(36, 'data'); v.setUint32(40, n * 4, true);
  const fi = fadeIn * sr, fo = fadeOut * sr;
  for (let i = 0, o = 44; i < n; i++, o += 4) {
    const g = Math.min(1, fi > 0 ? i / fi : 1, fo > 0 ? (n - 1 - i) / fo : 1);
    v.setInt16(o, Math.max(-1, Math.min(1, l[a + i] * g)) * 32767, true);
    v.setInt16(o + 2, Math.max(-1, Math.min(1, r[a + i] * g)) * 32767, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export function abrirEditorCorte(caixa, audio, { aoBaixar, aoFechar }) {
  const dur = audio.l.length / audio.sr;
  const v = { ini: 0, fim: dur, fadeIn: Math.min(1, dur / 8), fadeOut: Math.min(2, dur / 6) };
  const KNOBS = [
    ['ini', 'início', () => 0, () => Math.max(0, v.fim - 0.1)],
    ['fim', 'fim', () => Math.min(dur, v.ini + 0.1), () => dur],
    ['fadeIn', 'fade entra', () => 0, () => Math.min(10, v.fim - v.ini)],
    ['fadeOut', 'fade sai', () => 0, () => Math.min(10, v.fim - v.ini)],
  ];
  caixa.hidden = false;
  caixa.innerHTML = `<div class="tre-topo"><b>Ajuste antes de baixar</b><button type="button" class="jb" data-tre="fechar" title="Descartar a gravação" aria-label="Descartar a gravação">${icone('fechar')}</button></div>
    <canvas class="tre-onda" width="320" height="56" aria-hidden="true"></canvas>
    <div class="tre-knobs">${KNOBS.map(([k, nome]) => `<div class="tre-knob-caixa"><div class="tre-knob" role="slider" tabindex="0" data-k="${k}" aria-label="${nome}"><i></i></div><span>${nome}</span><b data-v="${k}"></b></div>`).join('')}</div>
    <div class="tre-acoes"><button type="button" class="btn mini secundario" data-tre="ouvir">${icone('play')} ouvir</button><button type="button" class="btn mini" data-tre="baixar">Baixar .wav</button><span class="nota" data-tre-dur></span></div>`;
  const $ = s => caixa.querySelector(s);
  const onda = $('.tre-onda'), g = onda.getContext('2d');
  const picos = Array.from({ length: onda.width }, (_, x) => {
    const a = Math.floor(x / onda.width * audio.l.length), b = Math.floor((x + 1) / onda.width * audio.l.length), passo = Math.max(1, Math.floor((b - a) / 40));
    let m = 0; for (let i = a; i < b; i += passo) m = Math.max(m, Math.abs(audio.l[i]));
    return m;
  });
  const cor = n => getComputedStyle(caixa).getPropertyValue(n).trim() || '#fff';
  function pintar() {
    const W = onda.width, H = onda.height, xa = v.ini / dur * W, xb = v.fim / dur * W, xi = (v.ini + v.fadeIn) / dur * W, xo = (v.fim - v.fadeOut) / dur * W;
    g.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      const dentro = x >= xa && x <= xb, f = !dentro ? 1 : Math.min(1, xi > xa ? (x - xa) / (xi - xa) : 1, xb > xo ? (xb - x) / (xb - xo) : 1), h = Math.max(1, picos[x] * f * (H - 4));
      g.fillStyle = dentro ? cor('--acento') : cor('--borda');
      g.fillRect(x, (H - h) / 2, 1, h);
    }
    g.fillStyle = cor('--sol'); g.fillRect(xa, 0, 1, H); g.fillRect(Math.min(W - 1, xb), 0, 1, H);
    for (const [k, , mn, mx] of KNOBS) {
      const el = $(`[data-k="${k}"]`), a = mn(), b = mx(), p = b > a ? (v[k] - a) / (b - a) : 0;
      el.style.setProperty('--giro', `${-135 + p * 270}deg`);
      el.setAttribute('aria-valuemin', a.toFixed(1)); el.setAttribute('aria-valuemax', b.toFixed(1)); el.setAttribute('aria-valuenow', v[k].toFixed(1)); el.setAttribute('aria-valuetext', `${v[k].toFixed(1)} segundos`);
      $(`[data-v="${k}"]`).textContent = k === 'ini' || k === 'fim' ? tempo(v[k]) : `${v[k].toFixed(1)} s`;
    }
    $('[data-tre-dur]').textContent = `fica com ${tempo(v.fim - v.ini)}`;
  }
  function ajustar(k, valor) {
    const [, , mn, mx] = KNOBS.find(x => x[0] === k);
    v[k] = Math.max(mn(), Math.min(mx(), valor));
    const max = v.fim - v.ini;
    v.fadeIn = Math.min(v.fadeIn, max); v.fadeOut = Math.min(v.fadeOut, max);
    parar(); pintar();
  }
  // o knob gira arrastando para cima e para baixo, com a roda do mouse ou com as setas
  caixa.addEventListener('pointerdown', e => {
    const el = e.target.closest('.tre-knob'); if (!el) return;
    e.preventDefault(); el.focus(); el.setPointerCapture(e.pointerId);
    const k = el.dataset.k, [, , mn, mx] = KNOBS.find(x => x[0] === k), y0 = e.clientY, v0 = v[k], faixa = Math.max(0.5, mx() - mn());
    const mover = ev => ajustar(k, v0 + (y0 - ev.clientY) / 120 * faixa);
    const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar); };
    el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  });
  caixa.addEventListener('wheel', e => { const el = e.target.closest('.tre-knob'); if (!el) return; e.preventDefault(); ajustar(el.dataset.k, v[el.dataset.k] - Math.sign(e.deltaY) * 0.1); }, { passive: false });
  caixa.addEventListener('keydown', e => {
    const el = e.target.closest('.tre-knob'); if (!el) return;
    const d = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1, PageUp: 1, PageDown: -1 }[e.key];
    if (d) { e.preventDefault(); ajustar(el.dataset.k, v[el.dataset.k] + d); }
  });
  // ouvir: toca o trecho do jeito que vai sair
  let ctx = null, fonte = null;
  function parar() { try { fonte?.stop(); } catch {} fonte = null; const b = $('[data-tre="ouvir"]'); if (b) b.innerHTML = `${icone('play')} ouvir`; }
  async function ouvir() {
    if (fonte) return parar();
    ctx ??= new AudioContext({ sampleRate: audio.sr }); await ctx.resume();
    const n = Math.max(1, Math.round((v.fim - v.ini) * audio.sr)), a = Math.round(v.ini * audio.sr), b = ctx.createBuffer(2, n, audio.sr);
    b.copyToChannel(audio.l.subarray(a, a + n), 0); b.copyToChannel(audio.r.subarray(a, a + n), 1);
    const s = ctx.createBufferSource(), ganho = ctx.createGain(), t = ctx.currentTime + 0.02, d = v.fim - v.ini;
    s.buffer = b; s.connect(ganho); ganho.connect(ctx.destination);
    ganho.gain.setValueAtTime(v.fadeIn > 0 ? 0 : 1, t); if (v.fadeIn > 0) ganho.gain.linearRampToValueAtTime(1, t + v.fadeIn);
    if (v.fadeOut > 0) { ganho.gain.setValueAtTime(1, t + Math.max(v.fadeIn, d - v.fadeOut)); ganho.gain.linearRampToValueAtTime(0, t + d); }
    s.onended = () => { if (fonte === s) parar(); };
    s.start(t); fonte = s; $('[data-tre="ouvir"]').innerHTML = `${icone('pausa')} parar`;
  }
  const fechar = () => { parar(); ctx?.close(); ctx = null; caixa.hidden = true; caixa.innerHTML = ''; aoFechar?.(); };
  caixa.onclick = e => {
    const a = e.target.closest('[data-tre]')?.dataset.tre;
    if (a === 'ouvir') ouvir();
    if (a === 'fechar') fechar();
    if (a === 'baixar') { aoBaixar(cortarWav(audio, v)); fechar(); }
  };
  pintar();
  return { valores: v, ajustar, fechar };
}
