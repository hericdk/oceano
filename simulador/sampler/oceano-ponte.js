// 🤌 FM ½ sampler dentro do Oceano: o que o Oceano acrescenta por cima do original (que não muda).
//  - Fundo: uma imagem ou um vídeo seu atrás do sampler, em pixel pixelizado, com recorte (arrastar e zoom) e,
//    no vídeo, o trecho que fica em loop. Fica só neste computador (IndexedDB "oceano-sampler").
//  - Motor: no app, liga sozinho o motor local (YouTube e separação de instrumentos); no simulador, mostra como ligar.
// Script clássico: enxerga as globais do sampler (API, toast, T).
(() => {
  const $ = (q, el = document) => el.querySelector(q);
  const CHAVE = 'oceano-sampler-fundo';
  const PADRAO = { tipo: '', nome: '', x: 0.5, y: 0.5, z: 1, px: 4, cores: 'pb', malha: 0, a: 0, b: 0 };
  let F = { ...PADRAO };
  try { Object.assign(F, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch {}
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(F)); } catch {} };
  // no app, o motor é pedido ao navegador por mensagem (a ponte entra antes desta página)
  const nativo = window.oceanoPonte ? { samplerMotor: () => window.oceanoPonte.pedir('motor') } : null;
  const ORIGEM_PAI = window.oceanoPonte?.origemPai || location.origin;

  // ---------- banco do fundo ----------
  const banco = () => new Promise((ok, erro) => {
    const r = indexedDB.open('oceano-sampler', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fundo');
    r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
  });
  const guardar = async (blob) => { const db = await banco(); return new Promise(ok => { const t = db.transaction('fundo', 'readwrite'); blob ? t.objectStore('fundo').put(blob, 'midia') : t.objectStore('fundo').delete('midia'); t.oncomplete = () => ok(); }); };
  const ler = async () => { const db = await banco(); return new Promise(ok => { const r = db.transaction('fundo').objectStore('fundo').get('midia'); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); };

  // ---------- cores e pixelizar ----------
  const PALETAS = {
    pb: { nome: 'P&B', c: [[0, 0, 0], [255, 255, 255]] },
    cinza: { nome: '4 cinzas', c: [[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]] },
    azul: { nome: 'P&B + azul', c: [[0, 0, 0], [255, 255, 255], [0, 64, 255]] },
    sampler: { nome: 'do sampler', c: null },   // a paleta escolhida no sampler (PALRGB), ou 27 cores
    cores: { nome: '27 cores', c: null },
  };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const cubo = (() => { const c = []; for (const r of [0, 128, 255]) for (const g of [0, 128, 255]) for (const b of [0, 128, 255]) c.push([r, g, b]); return c; })();
  function paleta() {
    if (F.cores === 'sampler') { try { const P = typeof PALRGB !== 'undefined' && typeof BGS !== 'undefined' && PALRGB[BGS.pal]; if (P && P.length >= 2) return P; } catch {} return cubo; }
    return PALETAS[F.cores]?.c || cubo;
  }
  // pixelizar ordenado: soma o limiar da matriz de Bayer e procura a cor mais próxima da paleta
  function pontilhar(im, w, h) {
    const d = im.data, P = paleta(), forca = P.length <= 4 ? 110 : 64, malha = F.malha;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, t = BAYER[(y & 3) * 4 + (x & 3)];
      if (malha > 0 && t < malha) { d[i + 3] = 0; continue; }   // transparência = malha de pixel
      const off = (t - 0.5) * forca, r = d[i] + off, g = d[i + 1] + off, b = d[i + 2] + off;
      let m = 0, md = 1e9;
      for (let k = 0; k < P.length; k++) { const p = P[k], dd = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11; if (dd < md) { md = dd; m = k; } }
      d[i] = P[m][0]; d[i + 1] = P[m][1]; d[i + 2] = P[m][2]; d[i + 3] = 255;
    }
    return im;
  }

  // ---------- recorte: "cobrir" a tela, depois zoom em volta do ponto (x, y) ----------
  function recorte(mw, mh, W, H) {
    const esc = Math.max(W / mw, H / mh) * F.z, sw = W / esc, sh = H / esc;
    const sx = Math.min(Math.max(F.x * mw - sw / 2, 0), mw - sw), sy = Math.min(Math.max(F.y * mh - sh / 2, 0), mh - sh);
    return { sx, sy, sw, sh };
  }

  // ---------- camada do fundo ----------
  const tela = document.createElement('canvas'); tela.id = 'ocFundo'; tela.setAttribute('aria-hidden', 'true');
  document.body.prepend(tela);
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  let midia = null, url = null, quadro = 0, sujo = true;
  const dims = () => midia ? (midia.tagName === 'VIDEO' ? [midia.videoWidth, midia.videoHeight] : [midia.naturalWidth, midia.naturalHeight]) : [0, 0];
  function desenhar() {
    const [mw, mh] = dims(); if (!mw || !mh) return;
    const px = Math.max(1, F.px | 0), W = Math.max(1, Math.ceil(innerWidth / px)), H = Math.max(1, Math.ceil(innerHeight / px));
    if (tela.width !== W || tela.height !== H) { tela.width = W; tela.height = H; }
    const r = recorte(mw, mh, W, H);
    ctx.imageSmoothingEnabled = true; ctx.clearRect(0, 0, W, H);
    try { ctx.drawImage(midia, r.sx, r.sy, r.sw, r.sh, 0, 0, W, H); ctx.putImageData(pontilhar(ctx.getImageData(0, 0, W, H), W, H), 0, 0); } catch {}
  }
  function laco(t) {
    requestAnimationFrame(laco);
    if (!midia) return;
    const v = midia.tagName === 'VIDEO' ? midia : null;
    if (v) {
      if (F.b > F.a + 0.2 && (v.currentTime >= F.b || v.currentTime < F.a - 0.05)) v.currentTime = F.a;
      if (v.paused && !document.hidden) v.play().catch(() => {});
      if (t - quadro < 66) return;   // ~15 quadros por segundo bastam para o fundo
      quadro = t; desenhar(); desenharPrevia();
    } else if (sujo) { sujo = false; desenhar(); desenharPrevia(); }
  }
  requestAnimationFrame(laco);
  addEventListener('resize', () => { sujo = true; });

  function usar(blob, tipo) {
    if (url) URL.revokeObjectURL(url);
    if (midia?.tagName === 'VIDEO') midia.pause();
    midia = null; url = null;
    document.documentElement.classList.toggle('oc-fundo', !!blob);
    if (!blob) return montarPainel();
    url = URL.createObjectURL(blob);
    if (/^video/.test(tipo)) {
      const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.src = url;
      v.onloadedmetadata = () => { if (!(F.b > F.a) || F.b > v.duration) { F.a = 0; F.b = Math.round(v.duration * 10) / 10; salvar(); } midia = v; v.currentTime = F.a; v.play().catch(() => {}); montarPainel(); };
    } else {
      const im = new Image(); im.onload = () => { midia = im; sujo = true; montarPainel(); }; im.src = url;
    }
  }
  async function escolher(arq) {
    if (!arq) return;
    if (!/^(image|video)\//.test(arq.type)) return aviso('Esse arquivo não é imagem nem vídeo');
    if (arq.size > 300 * 1024 * 1024) return aviso('Vídeo grande demais (até 300 MB)');
    await guardar(arq);
    Object.assign(F, { tipo: arq.type, nome: arq.name, x: 0.5, y: 0.5, z: 1, a: 0, b: 0 }); salvar();
    usar(arq, arq.type);
  }
  async function tirar() { await guardar(null); Object.assign(F, { tipo: '', nome: '' }); salvar(); usar(null); }
  const aviso = (m) => { try { toast(m); } catch { console.log(m); } };

  // ---------- painel ----------
  const btn = document.createElement('button'); btn.id = 'ocBtn'; btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'ocPainel');
  btn.innerHTML = '<i class="oc-ponto" aria-hidden="true"></i><span>Oceano</span>';
  const painel = document.createElement('div'); painel.id = 'ocPainel'; painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', 'Oceano: fundo e motor');
  document.body.append(btn, painel);
  const abrir = (on) => { painel.classList.toggle('on', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) montarPainel(); };
  btn.onclick = () => abrir(!painel.classList.contains('on'));
  addEventListener('keydown', e => { if (e.key === 'Escape' && painel.classList.contains('on')) { abrir(false); btn.focus(); } });
  const entrada = document.createElement('input'); entrada.type = 'file'; entrada.accept = 'image/*,video/*'; entrada.hidden = true; document.body.append(entrada);
  entrada.onchange = () => { escolher(entrada.files[0]); entrada.value = ''; };

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let prev = null;
  function desenharPrevia() {
    if (!prev || !midia || !painel.classList.contains('on')) return;
    const [mw, mh] = dims(); if (!mw) return;
    const W = 320, H = Math.round(W * mh / mw); if (prev.width !== W || prev.height !== H) { prev.width = W; prev.height = H; }
    const c = prev.getContext('2d'); c.drawImage(midia, 0, 0, W, H);
    const r = recorte(mw, mh, innerWidth, innerHeight), k = W / mw;
    c.fillStyle = 'rgba(0,0,0,.55)';   // fora do recorte escurece (só na prévia)
    c.fillRect(0, 0, W, r.sy * k); c.fillRect(0, (r.sy + r.sh) * k, W, H); c.fillRect(0, r.sy * k, r.sx * k, r.sh * k); c.fillRect((r.sx + r.sw) * k, r.sy * k, W, r.sh * k);
    c.strokeStyle = '#0040ff'; c.lineWidth = 2; c.strokeRect(r.sx * k + 1, r.sy * k + 1, r.sw * k - 2, r.sh * k - 2);
  }
  const faixa = (id, rotulo, min, max, passo, valor, saida) =>
    `<label class="oc-r"><span>${rotulo}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${passo}" value="${valor}"><output>${saida}</output></label>`;

  function montarPainel() {
    if (!painel.classList.contains('on')) return;
    const video = midia?.tagName === 'VIDEO', dur = video ? midia.duration || 0 : 0;
    painel.innerHTML = `
      <h3><span>OCEANO · FUNDO</span><button type="button" data-oc="fechar" aria-label="Fechar">✕</button></h3>
      <div class="oc-linha">
        <button type="button" class="oc-b" data-oc="arquivo">${F.tipo ? 'trocar imagem ou vídeo' : 'escolher imagem ou vídeo'}</button>
        ${F.tipo ? '<button type="button" class="oc-b" data-oc="tirar">tirar</button>' : ''}
      </div>
      ${F.tipo ? `<p class="oc-dica" data-notr>${F.nome.replace(/[<>&]/g, '')}</p>
      <div class="oc-prev" data-oc="prev" title="Arraste para escolher o recorte; a roda do mouse aproxima"><canvas width="320" height="180"></canvas></div>
      ${faixa('ocZ', 'zoom', 1, 4, 0.05, F.z, F.z.toFixed(2) + '×')}
      ${faixa('ocPx', 'pixel', 1, 16, 1, F.px, F.px + ' px')}
      ${faixa('ocM', 'transparência', 0, 0.9, 0.05, F.malha, Math.round(F.malha * 100) + '%')}
      <div class="oc-linha" style="margin-top:8px">${Object.entries(PALETAS).map(([k, p]) => `<button type="button" class="oc-b${F.cores === k ? ' on' : ''}" data-cores="${k}">${p.nome}</button>`).join('')}</div>
      ${video ? `<section><b class="oc-rotulo">TRECHO EM LOOP</b>
        ${faixa('ocA', 'início', 0, dur, 0.1, F.a, fmt(F.a))}
        ${faixa('ocB', 'fim', 0, dur, 0.1, F.b, fmt(F.b))}
        <p class="oc-dica">O vídeo passa sem som, em loop, de ${fmt(F.a)} a ${fmt(F.b)}.</p></section>` : ''}`
      : '<p class="oc-dica">Uma imagem ou um vídeo seu atrás do sampler, em pixel. Fica só neste computador.</p>'}
      <section id="ocMotor"></section>`;
    prev = $('.oc-prev canvas', painel);
    desenharPrevia(); estadoMotor();
  }
  painel.addEventListener('click', e => {
    const b = e.target.closest('[data-oc],[data-cores]'); if (!b) return;
    const o = b.dataset.oc;
    if (o === 'fechar') { abrir(false); btn.focus(); }
    else if (o === 'arquivo') entrada.click();
    else if (o === 'tirar') tirar();
    else if (o === 'ligar') ligarMotor(b);
    else if (b.dataset.cores) { F.cores = b.dataset.cores; salvar(); sujo = true; montarPainel(); }
  });
  painel.addEventListener('input', e => {
    const id = e.target.id, v = +e.target.value, out = e.target.nextElementSibling;
    if (id === 'ocZ') { F.z = v; out.textContent = v.toFixed(2) + '×'; }
    else if (id === 'ocPx') { F.px = v; out.textContent = v + ' px'; }
    else if (id === 'ocM') { F.malha = v; out.textContent = Math.round(v * 100) + '%'; }
    else if (id === 'ocA') { F.a = Math.min(v, F.b - 0.2); out.textContent = fmt(F.a); if (midia) midia.currentTime = F.a; }
    else if (id === 'ocB') { F.b = Math.max(v, F.a + 0.2); out.textContent = fmt(F.b); if (midia) midia.currentTime = Math.max(F.a, F.b - 1.5); }
    else return;
    sujo = true; salvar();
  });
  // arrastar na prévia move o recorte; a roda aproxima
  let arraste = null;
  painel.addEventListener('pointerdown', e => {
    const p = e.target.closest('.oc-prev'); if (!p || !midia) return;
    p.setPointerCapture(e.pointerId); arraste = { x: e.clientX, y: e.clientY, fx: F.x, fy: F.y, w: p.clientWidth, h: p.clientHeight };
  });
  painel.addEventListener('pointermove', e => {
    if (!arraste) return;
    F.x = Math.min(1, Math.max(0, arraste.fx + (e.clientX - arraste.x) / arraste.w));
    F.y = Math.min(1, Math.max(0, arraste.fy + (e.clientY - arraste.y) / arraste.h));
    sujo = true;
  });
  painel.addEventListener('pointerup', () => { if (arraste) { arraste = null; salvar(); } });
  painel.addEventListener('wheel', e => {
    if (!e.target.closest('.oc-prev')) return; e.preventDefault();
    F.z = Math.min(4, Math.max(1, F.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08))); sujo = true; salvar();
    const z = $('#ocZ', painel); if (z) { z.value = F.z; z.nextElementSibling.textContent = F.z.toFixed(2) + '×'; }
  }, { passive: false });
  painel.addEventListener('keydown', e => {   // teclado: setas movem o recorte com a prévia em foco
    if (!e.target.closest('.oc-prev')) return;
    const d = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.02], ArrowDown: [0, 0.02] }[e.key]; if (!d) return;
    e.preventDefault(); F.x = Math.min(1, Math.max(0, F.x + d[0])); F.y = Math.min(1, Math.max(0, F.y + d[1])); sujo = true; salvar();
  });

  // ---------- motor (YouTube e separação de instrumentos) ----------
  let motor = { ligado: false, demucs: null };
  async function sondar() {
    try { const r = await fetch('http://localhost:5217/__stems', { signal: AbortSignal.timeout(2500) }); const j = await r.json(); if (j && 'ready' in j) return j; } catch {}
    return null;
  }
  function conectar(j) {
    motor = { ligado: true, demucs: !!j.ready };
    try { API = 'http://localhost:5217'; } catch {}
    document.body.classList.add('local-ok');
    $('#ocBtn .oc-ponto').classList.add('on'); estadoMotor();
  }
  async function ligarMotor(b) {
    if (!nativo?.samplerMotor) return;
    if (b) { b.disabled = true; b.textContent = 'ligando…'; }
    const r = await nativo.samplerMotor();
    if (r?.ok) { const j = await sondar(); if (j) { conectar(j); aviso('Motor ligado: YouTube e separação de instrumentos'); return; } }
    motor.erro = r?.erro || 'nao-abriu'; estadoMotor();
  }
  function estadoMotor() {
    const el = $('#ocMotor', painel); if (!el) return;
    const cmdDemucs = '/usr/bin/python3 -m venv ~/.local/share/fm1-stems\n~/.local/share/fm1-stems/bin/pip install demucs==4.0.1 torch==2.5.1 torchaudio==2.5.1 soundfile';
    el.innerHTML = `<b class="oc-rotulo">MOTOR</b>
      <p class="oc-estado"><i class="oc-ponto ${motor.ligado ? (motor.demucs ? 'on' : 'meio') : ''}" aria-hidden="true"></i>
        <span>${motor.ligado ? (motor.demucs ? 'Ligado: YouTube, Instagram e separação de instrumentos.' : 'Ligado, mas a separação precisa do Demucs.') : 'Desligado: o sampler toca, grava e corta; YouTube e separação ficam para quando ligar.'}</span></p>
      ${!motor.ligado && nativo?.samplerMotor ? '<button type="button" class="oc-b" data-oc="ligar">ligar o motor</button>' : ''}
      ${!motor.ligado && !nativo?.samplerMotor ? '<p class="oc-dica">No app do Oceano ele liga sozinho. Aqui no simulador, rode no Terminal (na pasta do Oceano):</p><code class="oc-cmd">python3 simulador/sampler/motor/serve.py</code>' : ''}
      ${motor.erro === 'sem-python' ? '<p class="oc-dica">Não achei o Python 3 neste computador. Instale em python.org e tente de novo.</p>' : ''}
      ${motor.erro === 'nao-abriu' ? '<p class="oc-dica">O motor não abriu. Outro programa pode estar usando a porta dele.</p>' : ''}
      ${motor.ligado && !motor.demucs ? `<p class="oc-dica">Para separar bateria, baixo, voz e o resto, instale o Demucs uma vez (cerca de 1 GB):</p><code class="oc-cmd">${cmdDemucs}</code>` : ''}`;
  }
  (async () => {
    const j = await sondar();
    if (j) conectar(j);
    else if (nativo?.samplerMotor) ligarMotor();   // no app: liga sozinho ao abrir o sampler
  })();


  // ---------- música unificada: conversa com o resto do Oceano ----------
  // o Oceano manda um som para um pad (o primeiro vazio do grupo à vista, senão o escolhido) ou um link para a gaveta
  // de vídeo; e tudo de áudio que o sampler baixa (sessão, pad, mixagem) também vai para a caixa de sons do Oceano.
  const pai = window.parent !== window ? window.parent : null;
  addEventListener('message', async e => {
    if (!pai || e.source !== pai || e.origin !== ORIGEM_PAI || !e.data?.oceano) return;
    const d = e.data;
    try {
      if (d.oceano === 'pad' && d.blob) {
        const g = S.grp, livre = [...Array(12).keys()].find(p => !pads[g * 12 + p]?.buf), pos = livre ?? S.sel;
        await loadFile(g * 12 + pos, new File([d.blob], d.nome || 'som', { type: d.blob.type }));
        select(pos); aviso(`“${d.nome || 'som'}” no pad ${pos + 1}`);
      }
      if (d.oceano === 'link' && d.link) { ytOpen(true); $('#ytUrl').value = d.link; ytFind(); }
    } catch (er) { aviso('Não deu: ' + er.message); }
  });
  if (pai) {
    try {
      const baixar = window.download;
      window.download = function (blob, nome) {
        if (blob && (/^audio\//.test(blob.type) || /\.wav$/i.test(nome || ''))) pai.postMessage({ oceano: 'som', blob, nome }, ORIGEM_PAI);
        return baixar.apply(this, arguments);
      };
    } catch {}
    pai.postMessage({ oceano: 'pronto' }, ORIGEM_PAI);
  }

  // ---------- começo ----------
  if (F.tipo) ler().then(b => b ? usar(b, F.tipo) : tirar());
  window.OCEANO_SAMPLER = { F, escolher, tirar, desenhar, motor: () => motor };
})();
