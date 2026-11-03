// A vitrine das 🧰 Ferramentas: os cartões viram uma faixa em WebGL que ondula com o movimento. A onda deforma tudo.
// Onda alta mostra só a imagem em pixel; ao baixar, surge o ícone; baixando mais, surgem o texto e o botão.
// Os botões de verdade continuam no HTML, transparentes, para clique, teclado e leitor de tela.
(() => {
  const ICONES = {
    baixar: ['....#....', '....#....', '....#....', '..#####..', '...###...', '....#....', '.........', '#.......#', '#########'],
    editor: ['#########', '#.#...#.#', '#########', '#.#...#.#', '#.#...#.#', '#.#...#.#', '#########', '#.#...#.#', '#########'],
    images: ['#########', '#.......#', '#.##....#', '#.##....#', '#.....#.#', '#....###.', '#.#.#####', '#.#######', '#########'],
    audio: ['....#....', '....#....', '..#.#....', '..#.#.#..', '#.#.#.#.#', '..#.#.#..', '..#.#....', '....#....', '....#....'],
    dither: ['#.#.#.#.#', '.#.#.#.#.', '#.#.#.#.#', '.#.#.#.#.', '#.#.#.#.#', '.#.#.#.#.', '#.#.#.#.#', '.#.#.#.#.', '#.#.#.#.#'],
    'case-converter': ['.........', '..#......', '.#.#.....', '#...#....', '#####.##.', '#...##..#', '#...##..#', '#...##..#', '#...#.###'],
    lorem: ['#########', '.........', '#######..', '.........', '#########', '.........', '######...', '.........', '####.....'],
  };
  const sel = document.getElementById('selecao'), trilho = document.getElementById('sel-cartoes'), raiz = document.documentElement;
  const tela = document.createElement('canvas');
  const gl = tela.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;                            // sem WebGL ficam os cartões simples
  tela.id = 'vitrine'; tela.setAttribute('aria-hidden', 'true');
  sel.prepend(tela); sel.classList.add('vitrine-ok');

  const VS = `#version 300 es
  in vec2 a; out vec2 vUv;
  uniform vec4 uRect; uniform vec2 uRes; uniform float uAmp, uFase, uOnda;
  void main() {
    vUv = a;
    float x = uRect.x + a.x * uRect.z;
    float y = uRect.y + a.y * uRect.w + uAmp * sin(6.28318 * x / uOnda + uFase);
    gl_Position = vec4(x / uRes.x * 2. - 1., 1. - y / uRes.y * 2., 0., 1.);
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 cor;
  uniform sampler2D uImg, uIcone, uTexto;
  uniform vec2 uGrade; uniform vec4 uCapa; uniform vec3 uEscuro, uClaro; uniform float uVerIcone, uVerTexto;
  float bayer8(vec2 p) {
    ivec2 q = ivec2(mod(p, 8.)); int r = 0;
    for (int i = 0; i < 3; i++) {
      int bx = q.x & 1, by = q.y & 1;
      int d = (bx == 0 && by == 0) ? 0 : (bx == 1 && by == 1) ? 1 : (bx == 1) ? 2 : 3;
      r = r * 4 + d; q >>= 1;
    }
    return (float(r) + .5) / 64.;
  }
  void main() {
    vec2 px = floor(vUv * uGrade);
    vec3 fonte = texture(uImg, uCapa.xy + (px + .5) / uGrade * uCapa.zw).rgb;
    float luz = dot(fonte, vec3(.2126, .7152, .0722));
    luz = clamp((luz - .5) * 1.5 + .52, 0., 1.);
    float limiar = bayer8(px);
    vec3 c = mix(uEscuro, uClaro, step(limiar, luz));
    vec2 grosso = floor(vUv * uGrade / 2.);
    float dissolve = bayer8(grosso);
    vec4 ic = texture(uIcone, vUv);
    c = mix(c, ic.rgb, ic.a * step(dissolve, uVerIcone));
    vec4 tx = texture(uTexto, vUv);
    c = mix(c, tx.rgb, tx.a * step(dissolve, uVerTexto));
    cor = vec4(c, 1.);
  }`;
  const shader = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  const U = {};
  for (const n of ['uRect', 'uRes', 'uAmp', 'uFase', 'uOnda', 'uImg', 'uIcone', 'uTexto', 'uGrade', 'uCapa', 'uEscuro', 'uClaro', 'uVerIcone', 'uVerTexto']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uIcone, 1); gl.uniform1i(U.uTexto, 2);
  // uma fita de colunas: a onda só precisa dobrar na horizontal
  const COLUNAS = 48, vert = [];
  for (let i = 0; i <= COLUNAS; i++) vert.push(i / COLUNAS, 0, i / COLUNAS, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vert), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(gl.getAttribLocation(prog, 'a')); gl.vertexAttribPointer(gl.getAttribLocation(prog, 'a'), 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

  const textura = (fonte, filtro) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const css = n => getComputedStyle(raiz).getPropertyValue(n).trim();
  const rgb = v => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = v; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255]; };

  // cada ferramenta tem uma cena gerada aqui, sorteada pelo nome: sempre a mesma para a mesma ferramenta, nada vem de fora
  function cena(id, ordem) {
    let s = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const W = 640, H = 800, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const cinza = (v, a = 1) => `rgba(${v},${v},${v},${a})`;
    const ceu = g.createLinearGradient(0, 0, 0, H), de = 20 + r() * 60, ate = 150 + r() * 90;
    ceu.addColorStop(0, cinza(de | 0)); ceu.addColorStop(1, cinza(ate | 0));
    g.fillStyle = ceu; g.fillRect(0, 0, W, H);
    const astro = (x, y, R, v) => { const m = g.createRadialGradient(x - R * .3, y - R * .3, R * .1, x, y, R); m.addColorStop(0, cinza(255)); m.addColorStop(1, cinza(v)); g.fillStyle = m; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); };
    const CENAS = [
      () => { // serras
        astro(W * (.2 + r() * .6), H * (.14 + r() * .14), 50 + r() * 60, 170);
        for (let k = 0; k < 6; k++) {
          const base = H * (.3 + k * .12), f = .004 + r() * .012, p = r() * 9, v = 200 - k * 36;
          const m = g.createLinearGradient(0, base - 90, 0, base + 170); m.addColorStop(0, cinza(v)); m.addColorStop(1, cinza(Math.max(0, v - 70)));
          g.fillStyle = m; g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W; x += 6) g.lineTo(x, base + Math.sin(x * f + p) * 60 + Math.sin(x * f * 3.3 + p) * 18);
          g.lineTo(W, H); g.fill();
        }
      },
      () => { // esferas
        for (let k = 0; k < 9; k++) astro(r() * W, r() * H, 40 + r() * 130, 20 + r() * 70);
      },
      () => { // mar
        astro(W * (.25 + r() * .5), H * .32, 80 + r() * 50, 200);
        for (let y = H * .46; y < H; y += 10 + (y - H * .46) * .05) {
          const v = 40 + r() * 170; g.strokeStyle = cinza(v | 0, .8); g.lineWidth = 3 + (y / H) * 12; g.beginPath();
          const f = .01 + r() * .02, p = r() * 9;
          for (let x = 0; x <= W; x += 8) g[x ? 'lineTo' : 'moveTo'](x, y + Math.sin(x * f + p) * (4 + y * .012));
          g.stroke();
        }
      },
      () => { // nuvens
        for (let k = 0; k < 34; k++) {
          const x = r() * W, y = r() * H, R = 50 + r() * 190, v = r() < .6 ? 255 : 10, m = g.createRadialGradient(x, y, 0, x, y, R);
          m.addColorStop(0, cinza(v, .25 + r() * .5)); m.addColorStop(1, cinza(v, 0)); g.fillStyle = m; g.fillRect(0, 0, W, H);
        }
      },
      () => { // anéis
        const x = W * (.2 + r() * .6), y = H * (.2 + r() * .6), passo = 26 + r() * 40;
        for (let R = 900; R > 0; R -= passo) { const v = (128 + 120 * Math.sin(R * .02 + r())) | 0; g.fillStyle = cinza(v); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); }
      },
      () => { // blocos
        for (let k = 0; k < 16; k++) {
          const x = r() * W, y = r() * H, w = 70 + r() * 300, h = 70 + r() * 340, m = g.createLinearGradient(x, y, x + w, y + h);
          m.addColorStop(0, cinza((r() * 255) | 0)); m.addColorStop(1, cinza((r() * 255) | 0)); g.fillStyle = m; g.fillRect(x - w / 2, y - h / 2, w, h);
        }
      },
    ];
    CENAS[ordem % CENAS.length]();
    return c;
  }

  const cartoes = [...trilho.querySelectorAll('.sel-cartao')].map((el, i) => {
    const id = el.dataset.abrir, item = window.FERRAMENTAS.find(f => f[0] === id), img = cena(id, i);
    return { el, id, nome: item[2], texto: item[3], img: textura(img, gl.LINEAR), iw: img.width, ih: img.height, icone: null, tex: null };
  });

  function quebrar(g, texto, larg) {
    const linhas = []; let l = '';
    for (const p of texto.split(/\s+/)) { const n = l ? l + ' ' + p : p; if (g.measureText(n).width > larg && l) { linhas.push(l); l = p; } else l = n; }
    if (l) linhas.push(l);
    return linhas;
  }
  function pintarCamadas(c, w, h, dpr) {
    const fundo = css('--bg'), texto = css('--text'), suave = css('--muted'), acento = '#0040ff';
    const novo = () => { const k = document.createElement('canvas'); k.width = Math.round(w * dpr); k.height = Math.round(h * dpr); const g = k.getContext('2d'); g.scale(dpr, dpr); return [k, g]; };
    const [ki, gi] = novo();
    const M = 20, TAM = 72, u = 7, x0 = M, y0 = M;
    gi.fillStyle = fundo; gi.fillRect(x0, y0, TAM, TAM);
    gi.fillStyle = texto;
    (ICONES[c.id] || []).forEach((l, y) => [...l].forEach((v, x) => { if (v === '#') gi.fillRect(x0 + 4.5 + x * u, y0 + 4.5 + y * u, u, u); }));
    const [kt, gt] = novo();
    const F = "'Pixelify', system-ui, sans-serif";
    gt.font = `15px ${F}`;
    const linhas = quebrar(gt, c.texto, w - M * 2), alturaL = 20, altBotao = 36;
    const alto = M + 30 + linhas.length * alturaL + 14 + altBotao + M, topo = h - alto;
    gt.fillStyle = fundo; gt.fillRect(0, topo, w + 2, alto + 2);
    gt.fillStyle = texto; gt.font = `600 26px ${F}`; gt.textBaseline = 'top'; gt.fillText(c.nome, M, topo + M - 4);
    gt.fillStyle = suave; gt.font = `15px ${F}`;
    linhas.forEach((l, i) => gt.fillText(l, M, topo + M + 30 + i * alturaL));
    const by = topo + M + 30 + linhas.length * alturaL + 14;
    gt.fillStyle = acento; gt.fillRect(M, by, 96, altBotao);
    gt.fillStyle = '#fff'; gt.font = `600 16px ${F}`; gt.textAlign = 'center'; gt.textBaseline = 'middle'; gt.fillText(new URLSearchParams(location.search).get('lang') === 'en' ? 'Open' : 'Abrir', M + 48, by + altBotao / 2 + 1);
    if (c.icone) gl.deleteTexture(c.icone);
    if (c.tex) gl.deleteTexture(c.tex);
    c.icone = textura(ki, gl.LINEAR); c.tex = textura(kt, gl.LINEAR);
  }

  let dpr = 1, W = 0, H = 0, escuro, claro, ultimoTam = '';
  function medir(forcar) {
    const r = sel.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
    tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
    gl.viewport(0, 0, tela.width, tela.height);
    const a = cartoes[0].el.getBoundingClientRect(), chave = `${a.width}x${a.height}@${dpr}`;
    if (forcar || chave !== ultimoTam) { ultimoTam = chave; for (const c of cartoes) pintarCamadas(c, a.width, a.height, dpr); }
    escuro = rgb(css('--bg')); claro = rgb(css('--text'));
  }

  // a onda: sobe rápido com o movimento e desce devagar, em expo-out
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let onda = quieto ? 0 : 1, fase = 0, rolagem = trilho.scrollLeft, ultimo = 0, rodando = false;
  const faixa = (v, de, ate) => { const t = Math.min(1, Math.max(0, (v - de) / (ate - de))); return t * t * (3 - 2 * t); };
  let fixa = null;
  window.__vitrine = { get onda() { return onda; }, fixar(v) { fixa = v; acordar(); } };

  function quadro(agora) {
    rodando = false;
    if (raiz.dataset.tela !== 'selecao') return;
    const dt = Math.min(0.05, ultimo ? (agora - ultimo) / 1000 : 1 / 60); ultimo = agora;
    const alvo = trilho.scrollLeft, antes = rolagem;
    rolagem += (alvo - rolagem) * (1 - Math.exp(-dt * 11));
    if (Math.abs(alvo - rolagem) < 0.1) rolagem = alvo;
    const vel = Math.abs(rolagem - antes) / Math.max(dt, 0.001);
    if (!quieto) {
      const pedido = Math.min(1, vel / 900);
      onda = pedido > onda ? onda + (pedido - onda) * (1 - Math.exp(-dt * 16)) : onda * Math.exp(-dt * 1.7);
      if (onda < 0.002) onda = 0;
      fase += dt * (0.7 + onda * 2.2);
    }
    if (fixa !== null) onda = fixa;
    const r0 = sel.getBoundingClientRect(), base = cartoes[0].el.getBoundingClientRect();
    const desloc = trilho.scrollLeft - rolagem;
    const verIcone = 1 - faixa(onda, 0.26, 0.5), verTexto = 1 - faixa(onda, 0.05, 0.2);
    gl.clearColor(escuro[0], escuro[1], escuro[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uAmp, onda * Math.min(H * 0.13, 110)); gl.uniform1f(U.uFase, fase); gl.uniform1f(U.uOnda, Math.max(620, W * 0.85));
    gl.uniform3fv(U.uEscuro, escuro); gl.uniform3fv(U.uClaro, claro); gl.uniform1f(U.uVerIcone, verIcone); gl.uniform1f(U.uVerTexto, verTexto);
    for (const c of cartoes) {
      const r = c.el.getBoundingClientRect(), x = r.left - r0.left + desloc, y = base.top - r0.top;
      if (x > W + 20 || x + r.width < -20 || !c.tex) continue;
      gl.uniform4f(U.uRect, x, y, r.width, r.height);
      gl.uniform2f(U.uGrade, Math.round(r.width / 3), Math.round(r.height / 3));
      const ac = r.width / r.height, ai = c.iw / c.ih, sx = ai > ac ? ac / ai : 1, sy = ai > ac ? 1 : ai / ac;
      gl.uniform4f(U.uCapa, (1 - sx) / 2, (1 - sy) / 2, sx, sy);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.img);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, c.icone);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, c.tex);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, (COLUNAS + 1) * 2);
    }
    sel.classList.toggle('vitrine-andando', onda > 0.2);
    if (onda > 0 || rolagem !== alvo) acordar(); else ultimo = 0;
  }
  function acordar() { if (!rodando && raiz.dataset.tela === 'selecao') { rodando = true; requestAnimationFrame(quadro); } }

  trilho.addEventListener('scroll', acordar, { passive: true });
  addEventListener('resize', () => { medir(); acordar(); });
  addEventListener('oceano-tema', () => { medir(true); acordar(); });
  // voltar para a vitrine reencena a chegada: a onda desce e tudo aparece de novo
  new MutationObserver(() => { if (raiz.dataset.tela === 'selecao') { medir(); if (!quieto) onda = 1; acordar(); } }).observe(raiz, { attributes: true, attributeFilter: ['data-tela'] });

  // arrastar com o mouse também anda
  let arr = null, arrastou = false;
  trilho.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) { arr = { x: e.clientX, s: trilho.scrollLeft }; arrastou = false; } });
  addEventListener('pointermove', e => {
    if (!arr) return;
    const d = e.clientX - arr.x;
    if (Math.abs(d) > 5) arrastou = true;
    if (arrastou) trilho.scrollLeft = arr.s - d;
  });
  addEventListener('pointerup', () => { arr = null; });
  trilho.addEventListener('click', e => { if (arrastou) { e.stopPropagation(); e.preventDefault(); arrastou = false; } }, true);
  trilho.addEventListener('focusin', e => { const c = e.target.closest?.('.sel-cartao'); if (c && e.target.matches(':focus-visible')) onda = Math.max(onda, 0.25), acordar(); });

  document.fonts.load("600 26px 'Pixelify'").catch(() => {}).then(() => document.fonts.ready).then(() => { medir(true); acordar(); });
  medir(true); acordar();
})();
