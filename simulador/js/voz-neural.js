// A voz da Navegadora: Kokoro (voz-worker.js / app/voz-nucleo.js) e, aqui na tela, o jeito de falar.
// Frases em arco: o tom sobe e desce devagar dentro da frase, como melodia, e o tom é a pista mais forte da entonação no
// português do Brasil; descer no fim também alonga o final da frase, como a fala daqui faz.
// Pausas dinâmicas: curtas na animação, maiores depois de "olha...", "hmm". Humor: assunto delicado fala mais calmo e baixo.
// Som: pouca saturação, calor nos graves, presença e agudos macios. A fala começa na primeira frase pronta.
const SUBIR = 1.06, DRIVE = 1.2;
const FELIZ = { vels: [1.06, 1.03, 1.08, 1.05], tons: [40, 10, 30, 60], arco: 170 * 1.2, esc: 1.2, pausa: 1 };
const CALMA = { vels: [0.94, 0.92, 0.93, 0.90], tons: [-30, -40, -30, -40], arco: 65, esc: 1, pausa: 1.5 };
const FIM = { '?': 200, '!': 110, ',': 60, '.': -90, ';': 20, ':': 30, '…': -40 };
const PAUSAS = { '?': 0.26, '!': 0.28, ',': 0.12, '.': 0.32, ';': 0.2, ':': 0.2, '…': 0.42 };
const DELICADO = /\b(morte|morreu|morrer|faleceu|falecimento|luto|doen[çc]a|c[âa]ncer|trist[ea]|sinto muito|lamento|desculp\w*|dif[íi]cil|ansiedade|depress\w*|perd[ai]\w*|choro|chorar|medo|sozinh\w*|acidente|hospital|grave|cuidado|erro|falhou|n[ãa]o deu)\b/i;
const PENSA = /^(hmm+|hum+|olha|ent[ãa]o|bom|deixa eu ver|vamos ver|ah|ai)\b/i;

// tira o que não se lê (markdown, links, emoji)
const limpar = t => String(t).replace(/```[\s\S]*?```/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/[*_#`>|~\[\]()]/g, ' ')
  .replace(/\p{Extended_Pictographic}/gu, ' ').replace(/\.{2,}/g, '…').replace(/\s+/g, ' ');
// separa em frases completas; o resto (ainda sem pontuação) fica esperando o texto continuar
export function cortar(texto, acabou) {
  const lista = []; let usado = 0;
  for (const m of limpar(texto).matchAll(/([^.!?,;:…]+)([.!?,;:…]+)/g)) {
    const parte = m[1].trim() + m[2][0]; usado = m.index + m[0].length;
    if (!m[1].trim()) continue;
    // uma ou duas palavras com vírgula grudam na seguinte, senão soa picado
    if (lista.length && /,$/.test(lista.at(-1)) && lista.at(-1).split(' ').length <= 2) lista[lista.length - 1] += ' ' + parte;
    else lista.push(parte);
  }
  // no fluxo, frase curta com vírgula espera a seguinte (ela pode grudar nela)
  if (!acabou && lista.length && /,$/.test(lista.at(-1)) && lista.at(-1).split(' ').length <= 2) lista.pop();
  const resto = limpar(texto).slice(usado).trim();
  if (acabou && resto) lista.push(resto);
  return { lista, usado: acabou ? Infinity : usado };
}
export const frases = texto => cortar(texto, true).lista;
export const humorDe = texto => (DELICADO.test(texto) ? 'calma' : 'feliz');
export function gingado(f, i, humor = 'feliz') {
  const H = humor === 'calma' ? CALMA : FELIZ, p = f.at(-1), pensa = PENSA.test(f) && f.split(' ').length <= 2;
  // a variação da pausa vem do próprio texto: a mesma frase sempre igual, frases diferentes com tempos diferentes
  let semente = 0; for (const c of f) semente = (semente * 31 + c.charCodeAt(0)) % 997;
  return { vel: pensa ? 0.98 : H.vels[i % H.vels.length], tom: H.tons[i % H.tons.length] * H.esc, arco: pensa ? 70 : H.arco * (0.8 + semente % 5 * 0.1), fim: (FIM[p] || 0) * H.esc, fase: i * 0.37,
    pausa: (pensa ? 0.42 : (PAUSAS[p] ?? 0.1)) * H.pausa * (0.75 + semente % 6 * 0.1), volume: humor === 'calma' ? 0.72 : 1 };
}
function aparar(pcm) {
  let a = 0, b = pcm.length - 1, max = 0;
  while (a < b && Math.abs(pcm[a]) < 0.008) a++;
  while (b > a && Math.abs(pcm[b]) < 0.008) b--;
  const r = pcm.slice(Math.max(0, a - 200), b + 800);
  for (const v of r) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < r.length; i++) r[i] /= max;
  return r;
}
function cadeia(ctx, destino) {
  const sat = ctx.createWaveShaper(), curva = new Float32Array(2049);
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh((i / 1024 - 1) * DRIVE) / Math.tanh(DRIVE);
  sat.curve = curva; sat.oversample = '2x';
  const graves = ctx.createBiquadFilter(); graves.type = 'lowshelf'; graves.frequency.value = 220; graves.gain.value = 1.5;
  const presenca = ctx.createBiquadFilter(); presenca.type = 'peaking'; presenca.frequency.value = 2400; presenca.Q.value = 1.2; presenca.gain.value = 1.5;
  const macio = ctx.createBiquadFilter(); macio.type = 'highshelf'; macio.frequency.value = 7500; macio.gain.value = -2.5;   // agudos sem "sss"
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 2.2; comp.attack.value = 0.008; comp.release.value = 0.09;
  const eco = ctx.createDelay(0.1); eco.delayTime.value = 0.028; const ecoG = ctx.createGain(); ecoG.gain.value = 0.08;   // um fio de ambiente: dá seda à voz
  const vol = ctx.createGain(); vol.gain.value = 0.8;
  sat.connect(graves); graves.connect(presenca); presenca.connect(macio); macio.connect(comp); comp.connect(vol); macio.connect(eco); eco.connect(ecoG); ecoG.connect(comp); vol.connect(destino);
  return sat;
}
// agenda uma frase; devolve quando ela termina
function tocarFrase(ctx, entrada, pcm, sr, g, quando) {
  const b = ctx.createBuffer(1, pcm.length, sr); b.copyToChannel(pcm, 0);
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = SUBIR;
  const v = ctx.createGain(); v.gain.value = g.volume; s.connect(v); v.connect(entrada);
  const dur = b.duration / SUBIR, N = 48, curva = new Float32Array(N);
  for (let i = 0; i < N; i++) { const t = i / (N - 1); curva[i] = g.tom + g.arco * Math.sin(Math.PI * Math.min(1, t * 1.15)) + g.fim * t ** 3 + 18 * Math.sin(2 * Math.PI * (t + g.fase)); }
  s.detune.setValueCurveAtTime(curva, quando, dur);
  s.start(quando);
  return { fonte: s, fim: quando + dur };
}

// as vozes do Kokoro em português, a voz italiana lendo português (Mari, misturada) e a mistura feita para a Cara; cada amostra toca antes de baixar o modelo
export const VOZES_NEURAIS = {
  brilho: { nome: 'Brilho', desc: 'alegre e viva, a voz da Cara' },
  mari: { nome: 'Mari', desc: 'feminina, mais aguda e leve' },
  alex: { nome: 'Alex', desc: 'masculina, tranquila' },
  noel: { nome: 'Seu Noel', desc: 'masculina, mais grave' },
};
// as amostras ficam gravadas nos idiomas do primeiro slide; nos outros, em inglês
export const LINGUAS_GRAVADAS = ['pt', 'es', 'fr', 'it', 'de', 'ja', 'ko', 'en'];
export const linguaGravada = l => (LINGUAS_GRAVADAS.includes(l) ? l : 'en');
export const amostraNeural = (id, lingua = 'pt') => new URL(`../vendor/voz/amostras/${linguaGravada(lingua)}/${id}.ogg`, import.meta.url).href;

export function criarVozNeural() {
  let vozAtual = 'brilho';
  let worker = null, estado = 'ausente', progresso = 0, erro = '', seq = 0;
  const ouvintes = new Set(), pedidos = new Map();
  const avisar = () => { for (const f of ouvintes) f(); };
  // no app, o motor é nativo (bem mais rápido que a fala); no simulador, WebAssembly (mais lento: gera tudo antes de tocar)
  const nativo = window.oceanoNativo?.vozSintetizar ? window.oceanoNativo : null;
  function ligar() {
    if (worker || nativo) return;
    worker = new Worker(new URL('./voz-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data: m }) => {
      if (m.tipo === 'estado') { estado = m.estado; erro = m.erro || ''; avisar(); }
      if (m.tipo === 'progresso') { progresso = m.fracao; avisar(); }
      if (m.tipo === 'pcm') { pedidos.get(m.id)?.(m); pedidos.delete(m.id); }
    };
    worker.onerror = e => { estado = 'erro'; erro = e.message || 'não abriu'; avisar(); };
  }
  const sintetizar = (texto, vel) => nativo ? nativo.vozSintetizar(texto, vel, vozAtual).then(pcm => ({ pcm: new Float32Array(pcm), sr: 24000 })) : new Promise((ok, falha) => {
    const id = ++seq; pedidos.set(id, m => m.erro ? falha(new Error(m.erro)) : ok(m));
    worker.postMessage({ tipo: 'falar', id, texto, vel, voz: vozAtual });
  });
  let ctx = null, entrada = null, analise = null, fala = null;
  function parar() {
    if (!fala) return;
    fala.parado = true; for (const s of fala.fontes) { try { s.stop(); } catch {} }
    cancelAnimationFrame(fala.raf); fala.ok?.(); fala = null;
  }
  // abre uma fala em fluxo: mais(textoInteiroAtéAgora) e fim(). Cada frase completa já vai sendo gerada e tocada.
  function abrir({ aoNivel, aoComecar } = {}) {
    parar();
    const eu = fala = { fontes: [], parado: false, raf: 0, ok: null };
    let lidas = 0, acabou = false, ultimo = '', humor = 'feliz', acordar = null, quando = 0, tocando = false, indice = 0, ouvidas = 0;
    const fila = [];   // [{ texto, g, pcm: Promise }]
    const pronto = new Promise((ok, falha) => { eu.ok = ok; eu.falha = falha; });
    const desperta = () => { acordar?.(); acordar = null; };
    function receber() {
      const { lista } = cortar(ultimo, acabou);
      for (; lidas < lista.length; lidas++) {
        const f = lista[lidas]; if (DELICADO.test(f)) humor = 'calma';
        const g = gingado(f, indice++, humor);
        fila.push({ texto: f, g, pcm: nativo ? sintetizar(f, g.vel) : null });   // no app, já começa a gerar
      }
      desperta();
    }
    const medir = onda => { eu.raf = requestAnimationFrame(() => medir(onda)); analise.getFloatTimeDomainData(onda); let q = 0; for (const v of onda) q += v * v; aoNivel?.(Math.min(1, Math.sqrt(q / onda.length) * 4)); };
    (async () => {
      ctx ??= new AudioContext();
      if (!entrada) { analise = ctx.createAnalyser(); analise.fftSize = 512; analise.connect(ctx.destination); entrada = cadeia(ctx, analise); }
      await ctx.resume();
      for (;;) {
        if (eu.parado) return;
        if (!nativo && !acabou) { await new Promise(r => { acordar = r; }); continue; }   // WebAssembly: espera o texto inteiro
        if (ouvidas >= fila.length) { if (acabou) break; await new Promise(r => { acordar = r; }); continue; }
        if (!nativo) await Promise.all(fila.map(i => (i.pcm ??= sintetizar(i.texto, i.g.vel))));
        const item = fila[ouvidas++], m = await item.pcm;
        if (eu.parado) return;
        const pcm = aparar(m.pcm); if (!pcm.length) continue;
        const t = tocarFrase(ctx, entrada, pcm, m.sr, item.g, Math.max(ctx.currentTime + 0.02, quando));
        eu.fontes.push(t.fonte); quando = t.fim + item.g.pausa;
        if (!tocando) { tocando = true; aoComecar?.(); medir(new Float32Array(analise.fftSize)); }
      }
      await new Promise(r => setTimeout(r, Math.max(0, (quando - ctx.currentTime) * 1000)));
      if (fala === eu) { cancelAnimationFrame(eu.raf); aoNivel?.(0); fala = null; eu.ok(); }
    })().catch(e => { if (fala === eu) { cancelAnimationFrame(eu.raf); fala = null; } eu.falha(e); });
    return { mais(t) { ultimo = t; receber(); }, fim(t) { if (t !== undefined) ultimo = t; acabou = true; receber(); }, pronto };
  }
  function falar(texto, op) { const f = abrir(op); f.fim(texto); return f.pronto; }
  // a mesma cadeia, sem tocar: para testes e amostras (devolve um AudioBuffer)
  async function renderizar(texto) {
    const partes = []; let total = 0.3, humor = 'feliz'; const lista = frases(texto);
    for (let i = 0; i < lista.length; i++) { if (DELICADO.test(lista[i])) humor = 'calma'; const g = gingado(lista[i], i, humor), m = await sintetizar(lista[i], g.vel), pcm = aparar(m.pcm); partes.push([pcm, m.sr, g]); total += pcm.length / m.sr / SUBIR + g.pausa; }
    const off = new OfflineAudioContext(1, Math.ceil(total * 44100), 44100), e = cadeia(off, off.destination); let q = 0.05;
    for (const [pcm, sr, g] of partes) q = tocarFrase(off, e, pcm, sr, g, q).fim + g.pausa;
    return off.startRendering();
  }
  return {
    iniciar() {
      if (nativo) { nativo.vozEstado().then(e => { estado = e; avisar(); }); nativo.aoVozProgresso(f => { progresso = f; avisar(); }); return; }
      ligar(); worker.postMessage({ tipo: 'iniciar' });
    },
    baixar() {
      estado = 'baixando'; progresso = 0; erro = ''; avisar();
      if (nativo) { nativo.vozBaixar().then(e => { estado = e; avisar(); }, e => { estado = 'erro'; erro = String(e.message || e); avisar(); }); return; }
      ligar(); worker.postMessage({ tipo: 'baixar' });
    },
    apagar() {
      parar();
      if (nativo) { nativo.vozApagar().then(e => { estado = e; avisar(); }); return; }
      ligar(); worker.postMessage({ tipo: 'apagar' });
    },
    estado: () => estado, progresso: () => progresso, erro: () => erro, pronta: () => estado === 'pronta',
    aoMudar: f => { ouvintes.add(f); return () => ouvintes.delete(f); },
    abrir, falar, parar, renderizar, definirVoz: id => { if (VOZES_NEURAIS[id]) vozAtual = id; }, voz: () => vozAtual,
  };
}
