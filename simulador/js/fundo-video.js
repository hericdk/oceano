// Fundo da página inicial: o mar do tema (3D) ou um vídeo seu tocando em loop, pixelizado com a paleta do tema.
// Remover o vídeo apaga o arquivo daqui e o mar com o farol volta.
// O ícone fica na bandeja, ao lado da hora. Passando o mouse por cima dele, no modo vídeo, aparece
// em cima um ícone para subir o vídeo (antes do primeiro) ou para abrir o editor do trecho em loop.
// O vídeo fica só neste navegador (IndexedDB); nada vai para lugar nenhum.

import { icone } from './icones.js';
import { PALETAS, ORDEM_PALETAS } from './ilha/paletas.js';

const banco = () => new Promise(ok => { const r = indexedDB.open('oceano-fundo', 1); r.onupgradeneeded = () => r.result.createObjectStore('v'); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
async function guardarVideo(arquivo) { const db = await banco(); if (db) db.transaction('v', 'readwrite').objectStore('v').put(arquivo, 'video'); }
async function apagarVideo() { const db = await banco(); if (db) await new Promise(ok => { const t = db.transaction('v', 'readwrite'); t.objectStore('v').delete('video'); t.oncomplete = t.onerror = ok; }); }
async function lerVideo() { const db = await banco(); if (!db) return null; return new Promise(ok => { const r = db.transaction('v').objectStore('v').get('video'); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); }
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;

// O vídeo vira pixels grandes: nenhum sai da paleta do tema, e os tons do meio viram trama Bayer.
const VERTICE = 'attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }';
const FRAGMENTO = `precision mediump float; varying vec2 uv; uniform sampler2D v; uniform vec2 res; uniform vec3 pal[64]; uniform int n; uniform float efeito; uniform vec2 corte; uniform int tipo;
float bayer(vec2 p, int niveis){ float x = p.x, y = p.y, r = 0., m = 1.;
  for(int i = 0; i < 3; i++){ if(i >= niveis) break; float bx = mod(x, 2.), by = mod(y, 2.); float d = (bx == 0. && by == 0.) ? 0. : (bx == 1. && by == 1.) ? 1. : (bx == 1.) ? 2. : 3.; r = r * 4. + d; m *= 4.; x = floor(x / 2.); y = floor(y / 2.); }
  return (r + .5) / m; }
float limiar(vec2 p){ if(tipo == 1) return bayer(p, 1); if(tipo == 2) return bayer(p, 2); if(tipo == 3) return bayer(p, 3);
  if(tipo == 4) return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); if(tipo == 5) return mod(p.x + p.y, 2.) * .5 + .25; return .5; }
void main(){ vec3 c = texture2D(v, (uv - .5) * corte + .5).rgb; if(efeito < .5){ gl_FragColor = vec4(c, 1.); return; }
  c = clamp((c - .5) * 1.25 + .5 + (limiar(floor(uv * res)) - .5) * .28, 0., 1.);
  vec3 m = pal[0]; float d = 9.; for(int i = 0; i < 64; i++){ if(i >= n) break; vec3 e = c - pal[i]; float x = dot(e, e); if(x < d){ d = x; m = pal[i]; } }
  gl_FragColor = vec4(m, 1.); }`;
const TIPOS = { nenhum: 0, bayer2: 1, bayer4: 2, bayer8: 3, ruido: 4, xadrez: 5 };
const NOMES_TIPO = { bayer8: 'Bayer 8×8 · suave', bayer4: 'Bayer 4×4 · clássico', bayer2: 'Bayer 2×2 · grosso', ruido: 'Ruído · orgânico', xadrez: 'Xadrez', nenhum: 'Sem trama · faixas chapadas' };

function criarPixelizador(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (tipo, fonte) => { const s = gl.createShader(tipo); gl.shaderSource(s, fonte); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERTICE)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAGMENTO));
  gl.bindAttribLocation(pr, 0, 'p');
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const u = n => gl.getUniformLocation(pr, n);
  return {
    paleta(rgb) {   // lista de [r, g, b] de 0 a 255
      const f = new Float32Array(192);
      rgb.slice(0, 64).forEach((c, i) => { for (let k = 0; k < 3; k++) f[i * 3 + k] = c[k] / 255; });
      gl.uniform3fv(u('pal'), f); gl.uniform1i(u('n'), Math.min(64, rgb.length));
    },
    desenhar(video, efeito, tipo) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u('res'), canvas.width, canvas.height); gl.uniform1f(u('efeito'), efeito ? 1 : 0); gl.uniform1i(u('tipo'), TIPOS[tipo] ?? 3);
      // recorta como "cover": o vídeo preenche a mesa sem esticar
      const pv = video.videoWidth / video.videoHeight || 1, pc = canvas.width / canvas.height;
      gl.uniform2f(u('corte'), pc > pv ? 1 : pc / pv, pc > pv ? pv / pc : 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

const rgbDe = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const luz = ([r, g, b]) => r * .3 + g * .59 + b * .11;
// menos cores: pega de ponta a ponta do mais escuro ao mais claro, para manter o contraste
export function reduzirPaleta(rgb, qtd) {
  if (!qtd || qtd >= rgb.length) return rgb;
  const o = [...rgb].sort((a, b) => luz(a) - luz(b));
  return Array.from({ length: qtd }, (_, i) => o[Math.round(i * (o.length - 1) / (qtd - 1))]);
}

export function criarFundoVideo(app, guardado, raiz, { aoMudar = () => {} } = {}) {
  let conf = { inicio: 0, fim: 0, efeito: true, pixel: 4, tipo: 'bayer8', paleta: 'tema', qtd: 0, ...guardado.ler('fundo-mesa', {}) };
  let url = null, temVideo = false;
  const salvar = () => guardado.gravar('fundo-mesa', conf);

  // camada do vídeo, atrás de tudo na mesa
  const camada = document.createElement('div');
  camada.className = 'mesa-video';
  camada.innerHTML = '<video muted playsinline autoplay></video><canvas aria-hidden="true"></canvas>';
  raiz.prepend(camada);
  const video = camada.querySelector('video'), tela = camada.querySelector('canvas');
  const pixelizador = criarPixelizador(tela);
  camada.classList.toggle('com-pixel', !!pixelizador);

  // vídeos guardados antes deste formato saem uma vez: o botão de vídeo recomeça limpo
  const limpeza = guardado.ler('fundo-limpo-1', false) ? null : apagarVideo().then(() => guardado.gravar('fundo-limpo-1', true));

  const paletaAtual = () => reduzirPaleta(conf.paleta === 'tema' || !PALETAS[conf.paleta] ? app.tema.paleta.map(rgbDe) : PALETAS[conf.paleta].cores.map(n => [n >> 16, (n >> 8) & 255, n & 255]), conf.qtd);
  let paletaSuja = true;
  // desenha só com o vídeo visível e no máximo 30 vezes por segundo
  let temaDesenhado = null, ultimo = 0;
  function quadro(agora) {
    requestAnimationFrame(quadro);
    if (!pixelizador || camada.hidden || !camada.offsetWidth || agora - ultimo < 32 || video.readyState < 2) return;
    ultimo = agora;
    const inicio = performance.now(), { width: w, height: h } = camada.getBoundingClientRect();
    const largura = Math.max(16, Math.floor(w / conf.pixel)), altura = Math.max(16, Math.floor(h / conf.pixel));
    if (tela.width !== largura || tela.height !== altura) { tela.width = largura; tela.height = altura; }
    if (paletaSuja || temaDesenhado !== app.tema) { temaDesenhado = app.tema; paletaSuja = false; pixelizador.paleta(paletaAtual()); }
    pixelizador.desenhar(video, conf.efeito, conf.tipo);
    app.medidor?.somar('Vídeo de fundo', performance.now() - inicio);
  }
  requestAnimationFrame(quadro);

  // o loop fica dentro do trecho escolhido
  const prenderNoTrecho = v => {
    const fim = conf.fim > conf.inicio ? conf.fim : v.duration;
    if (v.currentTime < conf.inicio - 0.05 || v.currentTime >= fim - 0.04) v.currentTime = conf.inicio;
  };
  video.addEventListener('timeupdate', () => prenderNoTrecho(video));
  video.addEventListener('ended', () => { video.currentTime = conf.inicio; video.play().catch(() => {}); });

  async function carregar() {
    await limpeza;
    const f = await lerVideo();
    temVideo = !!f;
    if (url) URL.revokeObjectURL(url);
    url = f ? URL.createObjectURL(f) : null;
    if (url) video.src = url; else { video.removeAttribute('src'); video.load(); }
    aplicar();
  }

  async function remover() {
    await apagarVideo();
    conf = { ...conf, inicio: 0, fim: 0 }; salvar();
    document.querySelector('.fundo-editor')?.remove();
    await carregar();
    app.aviso('Vídeo removido. O mar com o farol voltou.', 'Fundo');
  }

  function aplicar() {
    const ativo = temVideo;
    camada.hidden = !ativo;
    app.fundoVideoAtivo = ativo;              // o mar 3D descansa enquanto o vídeo toca
    if (ativo && !raiz.classList.contains('ilha-aberta')) { video.currentTime = conf.inicio; video.play().catch(() => {}); } else video.pause();
    aoMudar();
  }
  // o vídeo é só da tela do farol: na ilha ele descansa
  app.on('home', qual => { if (!temVideo) return; if (qual === 'ilha') video.pause(); else video.play().catch(() => {}); });

  // play escolhe ou ajusta o vídeo; a lixeira só existe com um vídeo guardado
  const chip = () => `<button class="mesa-chip px" data-fundo-play title="${temVideo ? 'Ajustar o vídeo de fundo' : 'Colocar um vídeo de fundo'}" aria-label="${temVideo ? 'Ajustar o vídeo de fundo' : 'Colocar um vídeo de fundo'}">${icone('play')}</button>`
    + (temVideo ? `<button class="mesa-chip px" data-fundo-remover title="Apagar o vídeo" aria-label="Apagar o vídeo">${icone('lixo')}</button>` : '');

  const arquivo = document.createElement('input');
  arquivo.type = 'file'; arquivo.accept = 'video/*'; arquivo.hidden = true;
  raiz.append(arquivo);
  arquivo.onchange = async () => {
    const f = arquivo.files[0]; arquivo.value = '';
    if (!f) return;
    if (f.size > 500 * 1048576) return app.aviso('Vídeo grande demais (até 500 MB).', 'Fundo', 'erro');
    await guardarVideo(f);
    conf = { ...conf, inicio: 0, fim: 0 }; salvar();
    await carregar();
    editor();   // primeira vez: já escolhe o trecho
  };

  raiz.addEventListener('click', e => {
    if (e.target.closest('[data-fundo-play]')) { if (temVideo) editor(); else arquivo.click(); }
    if (e.target.closest('[data-fundo-remover]')) remover();
  });

  // ----- editor do trecho em loop -----
  function editor() {
    if (!temVideo) return arquivo.click();
    document.querySelector('.fundo-editor')?.remove();
    const el = document.createElement('section');
    el.className = 'janela fundo-editor';
    el.dataset.dither = '0';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Vídeo de fundo');
    el.innerHTML = `
      <header class="jan-topo"><span class="jan-titulo">${icone('filme')}<span>Vídeo de fundo</span></span>
        <span class="jan-botoes"><button class="jb jb-x" data-fe="fechar" title="Fechar">${icone('fechar')}</button></span></header>
      <div class="jan-corpo">
        <video class="fe-previa" muted playsinline autoplay src="${url}"></video>
        <div class="fe-linha"><div class="fe-trecho"></div><div class="fe-cabeca"></div>
          <input type="range" class="fe-ini" min="0" step="0.05" aria-label="Início do loop">
          <input type="range" class="fe-fim" min="0" step="0.05" aria-label="Fim do loop"></div>
        <p class="fe-tempos"><span data-fe-ini></span><b data-fe-dur></b><span data-fe-fim></span></p>
        <label class="fe-pixel"><input type="checkbox" data-fe-efeito ${conf.efeito ? 'checked' : ''}> efeito de pixel</label>
        <div class="fe-efeito" ${conf.efeito ? '' : 'hidden'}>
          <label class="fe-pixel">Tamanho do pixel <input type="range" data-fe-pixel min="2" max="12" step="1" value="${conf.pixel}"> <b data-fe-pixel-n>${conf.pixel}</b></label>
          <label class="fe-pixel">Estilo <select data-fe-tipo>${Object.entries(NOMES_TIPO).map(([v, n]) => `<option value="${v}" ${conf.tipo === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="fe-pixel">Cores <select data-fe-paleta><option value="tema">As do tema</option>${ORDEM_PALETAS.map(id => `<option value="${id}" ${conf.paleta === id ? 'selected' : ''}>${PALETAS[id].nome}</option>`).join('')}</select></label>
          <label class="fe-pixel">Quantidade <input type="range" data-fe-qtd min="2" max="16" step="1" value="${conf.qtd || 16}"> <b data-fe-qtd-n>${conf.qtd || 'todas'}</b></label>
        </div>
        <div class="fe-botoes">
          <button class="btn mini" data-fe="usar">usar este trecho</button>
          <button class="btn mini secundario" data-fe="trocar">trocar vídeo</button>
          <button class="btn mini perigo" data-fe="remover">remover vídeo</button>
        </div>
      </div>`;
    document.body.append(el);
    const v = el.querySelector('video'), ini = el.querySelector('.fe-ini'), fim = el.querySelector('.fe-fim');
    let rascunho = { inicio: conf.inicio, fim: conf.fim };
    const desenhar = () => {
      const d = v.duration || 1;
      el.querySelector('.fe-trecho').style.cssText = `left:${rascunho.inicio / d * 100}%;right:${100 - rascunho.fim / d * 100}%`;
      el.querySelector('[data-fe-ini]').textContent = mmss(rascunho.inicio);
      el.querySelector('[data-fe-fim]').textContent = mmss(rascunho.fim);
      el.querySelector('[data-fe-dur]').textContent = `loop de ${(rascunho.fim - rascunho.inicio).toFixed(1)} s`;
    };
    v.addEventListener('loadedmetadata', () => {
      const d = v.duration;
      ini.max = fim.max = d;
      if (!(rascunho.fim > rascunho.inicio)) rascunho = { inicio: 0, fim: Math.min(d, 12) };   // começa com até 12 s
      ini.value = rascunho.inicio; fim.value = rascunho.fim;
      v.currentTime = rascunho.inicio;
      desenhar();
    });
    // a prévia toca só o trecho, em loop
    const relogio = setInterval(() => {
      if (!v.duration) return;
      if (v.currentTime >= rascunho.fim - 0.04 || v.currentTime < rascunho.inicio - 0.1) v.currentTime = rascunho.inicio;
      el.querySelector('.fe-cabeca').style.left = v.currentTime / v.duration * 100 + '%';
    }, 40);
    ini.oninput = () => { rascunho.inicio = Math.min(+ini.value, rascunho.fim - 0.3); ini.value = rascunho.inicio; v.currentTime = rascunho.inicio; desenhar(); };
    fim.oninput = () => { rascunho.fim = Math.max(+fim.value, rascunho.inicio + 0.3); fim.value = rascunho.fim; v.currentTime = Math.max(rascunho.inicio, rascunho.fim - 1); desenhar(); };
    const q = n => el.querySelector(n);
    q('[data-fe-efeito]').onchange = e => { conf.efeito = e.target.checked; q('.fe-efeito').hidden = !conf.efeito; salvar(); };
    q('[data-fe-pixel]').oninput = e => { conf.pixel = +e.target.value; q('[data-fe-pixel-n]').textContent = conf.pixel; salvar(); };
    q('[data-fe-tipo]').onchange = e => { conf.tipo = e.target.value; salvar(); };
    q('[data-fe-paleta]').onchange = e => { conf.paleta = e.target.value; paletaSuja = true; salvar(); };
    q('[data-fe-qtd]').oninput = e => { const n = +e.target.value; conf.qtd = n >= 16 ? 0 : n; q('[data-fe-qtd-n]').textContent = conf.qtd || 'todas'; paletaSuja = true; salvar(); };
    const fechar = () => { clearInterval(relogio); el.remove(); };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-fe]'); if (!b) return;
      if (b.dataset.fe === 'fechar') fechar();
      if (b.dataset.fe === 'trocar') { fechar(); arquivo.click(); }
      if (b.dataset.fe === 'remover') { fechar(); remover(); }
      if (b.dataset.fe === 'usar') {
        conf = { ...conf, ...rascunho }; salvar(); fechar(); aplicar();
        app.aviso(`Fundo: trecho de ${(conf.fim - conf.inicio).toFixed(1)} s em loop.`, 'Fundo');
      }
    });
  }

  carregar();
  return { chip, editor, ativo: () => temVideo };
}
