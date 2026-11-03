// Oficina: galpões em ASCII colorido com rolagem horizontal, um por robô. Os robôs são pixel art tirada do 3D:
// brancos, com contorno preto. Clique abre; segurar move; segurar e soltar mostra o X que guarda o robô no galpão.
const COLS = 46, ROWS = 25, CW = 7, CH = 13, PITCH = COLS * CW + 54, LH = 470, CHAO = LH - 96, TOPO = CHAO - ROWS * CH, SP = 72, ZOOM = 3, ZOOM_DENTRO = 2;
const PORTA = { c0: 8, c1: 37, r0: 12, r1: 24 }, PX = PORTA.c0 * CW, PY = PORTA.r0 * CH, PW = (PORTA.c1 - PORTA.c0 + 1) * CW, PH = (PORTA.r1 - PORTA.r0 + 1) * CH;
const COR = { telhado: ['#b5502a', '#8f3d20', '#d0683a'], fundoTelhado: '#2c140c', parede: '#4a525c', fundoParede: '#14181d', metal: '#aab0b8', fundoPorta: '#2a2f36', amarelo: '#ffd21f', azul: '#0040FF', branco: '#ffffff', luz: '#ffb84a', dentro: '#07090c', dentroLinha: '#2b323b', chao: '#3a3f46', ceu: '#0a0d18', estrela: '#8c96b8', longe: '#1a2030' };
const textoSeguro = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hash = (a, b) => { let t = Math.imul(a * 31 + b, 2654435761); t ^= t >>> 15; return (t >>> 0) / 4294967296; };

// ---------- dados ----------
const CHAVE = 'robo-oficina';
export function dadosOficina(PRESETS) {
  const bases = { hexapode: 'Hexápode', quadrupede: 'Quadrúpede', gato: 'Gato', bipede: 'Microduck' };
  let d = null; try { d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) {}
  if (!d || !d.robots) d = { robots: Object.keys(bases).map(k => ({ id: k, base: k, nome: bases[k], prot: true, off: false, x: 0, y: 0 })), slots: Object.keys(bases), prox: 5 };
  const O = { ...d, salvar() { try { localStorage.setItem(CHAVE, JSON.stringify({ robots: O.robots, slots: O.slots, prox: O.prox })); } catch (e) {} } };
  const registra = r => { if (!r.prot) PRESETS[r.id] = () => { const b = PRESETS[r.base](); b.name = `${r.nome} · ${b.name.split(' · ')[1] || ''}`; return b; }; };
  O.robots.forEach(registra); O.registra = registra; O.bases = bases;
  return O;
}

// ---------- ASCII ----------
// cada célula: letra, cor, fundo e o quadro da obra em que aparece (de/até)
function celulas(numero) {
  const g = [], put = (r, c, ch, cor, bg, de = 0, ate = 99) => g.push({ r, c, ch, cor, bg, de, ate });
  // estrutura e paredes
  for (let r = 8; r < ROWS; r++) for (let c = 1; c <= 44; c++) {
    const borda = c === 1 || c === 44, d = hash(r, c);
    put(r, c, borda ? '|' : c % 4 === 0 ? ':' : d > .92 ? '.' : ' ', borda ? COR.metal : COR.parede, COR.fundoParede, borda ? 1 : d < .5 ? 3 : 4);
  }
  // telhado de duas águas, ondulado
  for (let r = 0; r <= 6; r++) {
    const m = 3 + Math.round(r * 3.3), L = 23 - m, D = 23 + m;
    for (let c = L; c <= D; c++) {
      const borda = c === L || c === D, cor = borda ? COR.metal : COR.telhado[(c + r) % 3];
      put(r, c, c === L ? '/' : c === D ? '\\' : (c % 2 ? '|' : ':'), cor, COR.fundoTelhado, borda ? 2 : hash(r, c) < .5 ? 3 : 4);
    }
  }
  for (let c = 0; c <= 45; c++) put(7, c, c % 6 === 0 ? '#' : '=', COR.metal, COR.fundoParede, 2);
  [...'[==]'].forEach((x, i) => put(0, 21 + i, x, COR.amarelo, COR.fundoTelhado, 5));
  // andaime, só durante a obra
  for (let r = 3; r < ROWS; r++) { put(r, 0, r % 3 ? 'H' : '#', COR.amarelo, null, 1, 5); put(r, 45, r % 3 ? 'H' : '#', COR.amarelo, null, 1, 5); }
  // letreiro e moldura da porta
  const txt = `OFICINA ${String(numero).padStart(2, '0')}`, w = 22, c0 = 23 - w / 2;
  for (let c = c0; c < c0 + w; c++) { put(8, c, c === c0 || c === c0 + w - 1 ? '+' : '-', COR.branco, COR.azul, 5); put(10, c, c === c0 || c === c0 + w - 1 ? '+' : '-', COR.branco, COR.azul, 5); put(9, c, ' ', COR.branco, COR.azul, 5); }
  [...txt].forEach((x, i) => put(9, 23 - (txt.length >> 1) + i, x, COR.branco, COR.azul, 5));
  for (let c = PORTA.c0 - 1; c <= PORTA.c1 + 1; c++) put(11, c, '=', COR.metal, COR.fundoParede, 5);
  for (let r = PORTA.r0; r <= PORTA.r1; r++) { const k = r % 2 === 0; put(r, PORTA.c0 - 1, k ? '/' : ' ', COR.amarelo, '#000', 5); put(r, PORTA.c1 + 1, k ? '\\' : ' ', COR.amarelo, '#000', 5); }
  // janelas, tambor e caixote
  for (const [c, r] of [[3, 13], [40, 13], [3, 17], [40, 17]]) { [...'[#]'].forEach((x, i) => put(r, c + i, x, COR.luz, '#3a2408', 6)); [...'[#]'].forEach((x, i) => put(r + 1, c + i, x, COR.luz, '#3a2408', 6)); }
  [...'(O)'].forEach((x, i) => { put(23, 3 + i, x, COR.telhado[2], null, 6); put(24, 3 + i, x === 'O' ? '=' : x, COR.telhado[0], null, 6); });
  [...'[X]'].forEach((x, i) => { put(23, 40 + i, x, COR.luz, null, 6); put(24, 40 + i, x, COR.luz, null, 6); });
  // as células do vão da porta ficam de fora: lá atrás vem o interior e na frente a própria porta
  const vao = x => x.r >= PORTA.r0 && x.r <= PORTA.r1 && x.c >= PORTA.c0 && x.c <= PORTA.c1;
  const cel = g.filter(x => !vao(x) || x.de === 1);
  return cel;
}
function celulasPorta() {
  const g = [], L = PORTA.c1 - PORTA.c0 + 1, A = PORTA.r1 - PORTA.r0 + 1;
  for (let r = 0; r < A; r++) for (let c = 0; c < L; c++) {
    const haz = r >= A - 2, jan = r === 3 && c >= 6 && c < L - 6 && c % 6 < 4, pega = r === A - 4 && c >= (L >> 1) - 2 && c < (L >> 1) + 2;
    g.push({ r, c, ch: haz ? '/' : jan ? '#' : pega ? '_' : r % 2 ? '-' : '=', cor: haz ? COR.amarelo : jan ? COR.luz : pega ? COR.branco : COR.metal, bg: haz ? '#000' : jan ? '#3a2408' : COR.fundoPorta });
  }
  return g;
}
function celulasDentro() {
  const g = [], L = PORTA.c1 - PORTA.c0 + 1, A = PORTA.r1 - PORTA.r0 + 1;
  for (let r = 0; r < A; r++) for (let c = 0; c < L; c++) {
    let ch = ' ', cor = COR.dentroLinha;
    if (r === 1 && c % 7 === 3) { ch = 'o'; cor = '#5c4a20'; }
    else if (r === 3 || r === 7) ch = '=';
    else if (r === 4 && c % 3 === 0) ch = 'T';
    else if (r === 8 && c % 4 === 1) ch = '#';
    else if (r >= A - 2) ch = c % 2 ? '_' : '.';
    g.push({ r, c, ch, cor, bg: COR.dentro });
  }
  return g;
}
// desenha as células num canvas; a letra passa por um limiar para virar pixel de verdade, sem borda suavizada
function pinta(cels, cols, rows, filtro) {
  const cv = document.createElement('canvas'); cv.width = cols * CW; cv.height = rows * CH;
  const x = cv.getContext('2d', { willReadFrequently: true }), t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height;
  const y = t.getContext('2d', { willReadFrequently: true }); y.font = '700 15px Handjet, monospace'; y.textBaseline = 'top'; y.textAlign = 'center';
  for (const c of cels) { if (filtro && !filtro(c)) continue; if (c.bg) { x.fillStyle = c.bg; x.fillRect(c.c * CW, c.r * CH, CW, CH); } if (c.ch !== ' ') { y.fillStyle = c.cor; y.fillText(c.ch, c.c * CW + CW / 2, c.r * CH - 1); } }
  const im = y.getImageData(0, 0, t.width, t.height), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 96 ? 255 : 0;
  y.putImageData(im, 0, 0); x.drawImage(t, 0, 0);
  return cv;
}
function amostras(cv, n = 140) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, o = [];
  for (let k = 0; k < n * 4 && o.length < n; k++) {
    const px = Math.random() * cv.width | 0, py = Math.random() * cv.height | 0, i = (py * cv.width + px) * 4;
    if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] > 120) o.push({ x: px, y: py, c: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})` });
  }
  return o;
}

// ---------- pixel art a partir do 3D ----------
function montaRobo(THREE, desc) {
  const raiz = new THREE.Group(), partes = []; const D2R = Math.PI / 180, AX = { x: 'x', y: 'y', z: 'z' };
  const peca = (geo, pai, p) => { const m = new THREE.Mesh(geo); if (p) m.position.set(...p); pai.add(m); partes.push(m); return m; };
  const esc = Math.max(desc.height || 10, 8) / 12, R = Math.max(.7, .85 * esc);
  const corpo = new THREE.Group(); raiz.add(corpo);
  if (desc.body.type === 'box') peca(new THREE.BoxGeometry(...desc.body.size), corpo);
  else peca(new THREE.CylinderGeometry(9, 9, 3, 6), corpo);
  const elo = (pai, de, para) => {
    const a = new THREE.Vector3(...de), b = new THREE.Vector3(...para), l = a.distanceTo(b); if (l < .3) return;
    const m = peca(new THREE.BoxGeometry(R * 1.6, l, R * 1.1), pai); m.position.copy(a).lerp(b, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  };
  let menor = Infinity; const pes = [];
  desc.chains.forEach(c => {
    let pai = new THREE.Group(); pai.position.set(...c.mount); pai.rotation.y = (c.yaw || 0) * D2R; corpo.add(pai);
    c.joints.forEach((j, k) => {
      const g = new THREE.Group(); g.position.set(...j.off); if (k > 0) elo(pai, [0, 0, 0], j.off);
      g.rotation[AX[j.ax]] = (j.rest || 0) * D2R; pai.add(g); peca(new THREE.BoxGeometry(R * 2.2, R * 2.2, R * 2.2), g); pai = g;
    });
    elo(pai, [0, 0, 0], c.tip);
    const ponta = new THREE.Group(); ponta.position.set(...c.tip); pai.add(ponta); peca(new THREE.SphereGeometry(R * 1.1, 8, 6), ponta); pes.push(ponta);
    if (c.box) peca(new THREE.BoxGeometry(...c.box.size), ponta, c.box.off);
  });
  raiz.updateMatrixWorld(true); const v = new THREE.Vector3(); pes.forEach(p => { p.getWorldPosition(v); menor = Math.min(menor, v.y); });
  corpo.position.y = -menor; raiz.updateMatrixWorld(true);
  return { raiz, partes };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// 8 giros do robô; cada giro vira um sprite branco com contorno e outro na sombra do galpão
function fazSprites(THREE, renderer, desc) {
  const { raiz, partes } = montaRobo(THREE, desc), cena = new THREE.Scene(); cena.add(raiz);
  cena.add(new THREE.HemisphereLight(0xffffff, 0x000000, 1.2)); const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2, 4, 3); cena.add(sol);
  const box = new THREE.Box3().setFromObject(raiz), raio = box.getSize(new THREE.Vector3()).length() / 2 * 1.02, meio = box.getCenter(new THREE.Vector3());
  const cam = new THREE.OrthographicCamera(-raio, raio, raio, -raio, .1, raio * 8); cam.position.set(meio.x + raio * 2, meio.y + raio * 1.7, meio.z + raio * 2.6); cam.lookAt(meio);
  const rt = new THREE.WebGLRenderTarget(SP, SP, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  const luz = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), ids = partes.map((_, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB((i % 30 + 1) / 32, 0, 0) }));
  const antes = { rt: renderer.getRenderTarget(), cor: renderer.getClearColor(new THREE.Color()), alfa: renderer.getClearAlpha() }; renderer.setClearColor(0, 0);
  const qs = [], lerPix = () => { const a = new Uint8Array(SP * SP * 4); renderer.readRenderTargetPixels(rt, 0, 0, SP, SP, a); return a; };
  for (let f = 0; f < 8; f++) {
    raiz.rotation.y = (-38 + f * 76 / 7) * Math.PI / 180;
    partes.forEach((m, i) => m.material = ids[i]); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(cena, cam); const idp = lerPix();
    partes.forEach(m => m.material = luz); renderer.clear(); renderer.render(cena, cam); const sh = lerPix();
    const ID = (x, y) => x < 0 || y < 0 || x >= SP || y >= SP ? 0 : idp[((SP - 1 - y) * SP + x) * 4 + 3] ? Math.round(idp[((SP - 1 - y) * SP + x) * 4] / 255 * 32) : 0;
    const claro = document.createElement('canvas'), escuro = document.createElement('canvas'); claro.width = claro.height = escuro.width = escuro.height = SP;
    const c1 = claro.getContext('2d'), c2 = escuro.getContext('2d'), im1 = c1.createImageData(SP, SP), im2 = c2.createImageData(SP, SP); let y0 = 0, x0 = SP, x1 = 0, ytop = SP;
    for (let y = 0; y < SP; y++) for (let x = 0; x < SP; x++) {
      const id = ID(x, y), i = (y * SP + x) * 4; let v = -1;  // -1 vazio · 0 preto · 1 branco
      if (id) {
        const lu = sh[((SP - 1 - y) * SP + x) * 4] / 255, t = (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16;
        v = ((ID(x + 1, y) && ID(x + 1, y) !== id) || (ID(x, y + 1) && ID(x, y + 1) !== id)) ? 0 : lu < .34 + t * .22 ? 0 : 1;
      } else if (ID(x - 1, y) || ID(x + 1, y) || ID(x, y - 1) || ID(x, y + 1)) v = 0;
      if (v < 0) continue;
      y0 = Math.max(y0, y); ytop = Math.min(ytop, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      const b = v ? 255 : 0; im1.data[i] = im1.data[i + 1] = im1.data[i + 2] = b; im1.data[i + 3] = 255;
      // sombra: só duas cores escuras e malha de pixel; nada de alfa
      const s = v ? ((x + y) & 1 ? 0x2c : 0x12) : 0x05; im2.data[i] = im2.data[i + 1] = s; im2.data[i + 2] = s + 4; im2.data[i + 3] = 255;
    }
    c1.putImageData(im1, 0, 0); c2.putImageData(im2, 0, 0); qs.push({ claro, escuro, pe: y0, x0, x1, topo: ytop });
  }
  renderer.setRenderTarget(antes.rt); renderer.setClearColor(antes.cor, antes.alfa); rt.dispose(); luz.dispose(); ids.forEach(m => m.dispose()); partes.forEach(m => m.geometry.dispose());
  return qs;
}

// ---------- som ----------
let AC = null;
function bip(f, d = .05, tipo = 'square', v = .05) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const o = AC.createOscillator(), g = AC.createGain(); o.type = tipo; o.frequency.value = f; g.gain.setValueAtTime(v, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} }

const CSS = `#ofi{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:12px;background:repeating-conic-gradient(#000 0 25%,transparent 0 50%) 0 0/4px 4px;font-family:Handjet,monospace}
#ofiBox{position:relative;width:min(1080px,100%);height:min(620px,100%);background:#000;border:2px solid #fff;display:flex;flex-direction:column;animation:ofiIn .28s steps(5)}@keyframes ofiIn{from{clip-path:inset(50% 0)}to{clip-path:inset(0)}}
#ofiTop{display:flex;align-items:center;gap:12px;padding:6px 10px;border-bottom:2px solid #fff;color:#fff;font-size:20px;font-weight:700;letter-spacing:.1em;white-space:nowrap;overflow:hidden}#ofiTop span{color:#7f9fff;font-size:14px;font-weight:500;letter-spacing:.04em;flex:1;overflow:hidden;text-overflow:ellipsis}
#ofiFecha{flex:0 0 auto;background:#000;color:#fff;border:1px solid #fff;font:inherit;font-size:16px;width:30px;height:28px;cursor:pointer}#ofiFecha:hover{background:#0040FF;border-color:#0040FF}
#ofiPal{position:relative;flex:1;min-height:0;overflow:hidden}#ofiPal canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;cursor:grab;touch-action:none}#ofiPal canvas.pega{cursor:grabbing}
.ofB{position:absolute;transform:translate(-50%,-100%);background:#000;color:#fff;border:1px solid #fff;font:inherit;font-size:15px;font-weight:600;padding:4px 9px;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:.04em}.ofB:hover{background:#0040FF;border-color:#0040FF}.ofB.x{width:30px;height:30px;padding:0;font-size:20px;line-height:1}.ofB.mais{width:42px;height:42px;padding:0;font-size:30px;line-height:1;background:#0040FF;border-color:#fff}.ofB.mais:hover{background:#fff;color:#000}
.ofGrupo{position:absolute;transform:translate(-50%,-100%);display:flex;gap:4px;flex-wrap:nowrap}.ofGrupo .ofB{position:static;transform:none}.ofGrupo{flex-wrap:wrap;justify-content:center;width:max-content;max-width:90vw}.ofGrupo .ofEnvia{background:#0040FF;border-color:#0040FF}.ofAviso{flex:1 0 100%;text-align:center;font-size:14px;color:#fff;background:#000;padding:2px 6px}
#ofiMsg{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:#0040FF;color:#fff;padding:5px 10px;font-size:15px;white-space:nowrap}#ofiMsg:empty{display:none}
#ofiConf{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#000 0 25%,transparent 0 50%) 0 0/4px 4px;z-index:3}#ofiConf[hidden]{display:none}#ofiConf>div{background:#000;border:2px solid #fff;padding:16px 18px;width:min(380px,92%);color:#fff;font-size:18px;line-height:1.2}#ofiConf p{margin:0 0 14px}#ofiConf .a{display:flex;gap:8px;justify-content:flex-end}#ofiConf button{font:inherit;font-weight:600;padding:7px 14px;cursor:pointer;text-transform:uppercase}#ofiSim{background:#0040FF;color:#fff;border:1px solid #0040FF}#ofiSim:hover{background:#fff;color:#000;border-color:#fff}#ofiNao{background:#000;color:#fff;border:1px solid #fff}#ofiNao:hover{border-color:#0040FF;color:#7f9fff}`;

// ---------- a oficina aberta ----------
export async function abrirOficina(h) {
  const { OF, PRESETS, THREE, renderer, T } = h;
  if (document.querySelector('#ofi')) return window._oficina;
  await document.fonts.load('700 15px Handjet').catch(() => {});
  if (!document.querySelector('#ofiCss')) { const s = document.createElement('style'); s.id = 'ofiCss'; s.textContent = CSS; document.head.appendChild(s); }
  const raiz = document.createElement('div'); raiz.id = 'ofi';
  raiz.innerHTML = `<div id="ofiBox" role="dialog" aria-modal="true" aria-label="oficina de robôs"><div id="ofiTop">[ OFICINA DE ROBÔS ]<span>arraste para andar · clique abre o robô · segure para mover · segure e solte para guardar</span><button id="ofiFecha" aria-label="fechar">×</button></div><div id="ofiPal"><canvas></canvas><div id="ofiMsg"></div><div id="ofiConf" hidden><div><p></p><div class="a"><button id="ofiNao">cancelar</button><button id="ofiSim">apagar</button></div></div></div></div></div>`;
  document.body.appendChild(raiz);
  const $ = q => raiz.querySelector(q), pal = $('#ofiPal'), cv = pal.querySelector('canvas'), x = cv.getContext('2d');
  let W = 800, esc = 1;
  const medir = () => { const r = pal.getBoundingClientRect(); esc = r.height / LH; W = Math.max(320, Math.round(r.width / esc)); cv.width = W; cv.height = LH; x.imageSmoothingEnabled = false; };
  medir();

  // arte pronta, uma vez por abertura
  const artePorta = pinta(celulasPorta(), PORTA.c1 - PORTA.c0 + 1, PORTA.r1 - PORTA.r0 + 1), arteDentro = pinta(celulasDentro(), PORTA.c1 - PORTA.c0 + 1, PORTA.r1 - PORTA.r0 + 1);
  const sprites = {}, spr = base => sprites[base] || (sprites[base] = fazSprites(THREE, renderer, PRESETS[base]()));
  const arteG = {}, galpao = n => arteG[n] || (arteG[n] = (() => { const cel = celulas(n), fim = pinta(cel, COLS, ROWS, c => c.ate > 6); return { fim, cel, amo: amostras(fim) }; })());
  const quadroObra = (n, f) => { const G = galpao(n); G.q = G.q || {}; return G.q[f] || (G.q[f] = pinta(G.cel, COLS, ROWS, c => c.de <= f && f <= c.ate)); };
  // céu e chão repetem; os prédios ao longe andam mais devagar
  const ceu = (() => { const c = document.createElement('canvas'); c.width = 640; c.height = TOPO + 240; const g = c.getContext('2d'); g.fillStyle = COR.ceu; g.fillRect(0, 0, c.width, c.height); g.fillStyle = COR.estrela; for (let i = 0; i < 70; i++) { const f = n => { const v = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return v - Math.floor(v); }; g.fillRect(f(1) * 640 | 0, f(2) * (TOPO + 150) | 0, 1, 1); } return c; })();
  const longe = (() => { const cel = []; let c = 0; while (c < 92) { const a = 3 + (hash(c, 9) * 7 | 0), w = 5 + (hash(c, 8) * 8 | 0); for (let i = 0; i < w && c + i < 92; i++) for (let r = 12 - a; r < 12; r++) cel.push({ r, c: c + i, ch: (r + i) % 3 ? ' ' : '.', cor: '#2a3448', bg: COR.longe }); c += w + (hash(c, 7) * 3 | 0); } return pinta(cel, 92, 12); })();
  const chao = (() => { const cel = [], cols = Math.ceil(PITCH / CW), rows = Math.ceil((LH - CHAO) / CH) + 1; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cel.push({ r, c, ch: r === 0 ? '_' : r === 3 && c % 6 < 3 ? '=' : hash(r, c) > .8 ? ',' : hash(c, r) > .85 ? '.' : ' ', cor: r === 3 ? '#7a6512' : COR.chao, bg: '#0e1013' }); return pinta(cel, cols, rows); })();

  // estado de cada galpão
  const porId = id => OF.robots.find(r => r.id === id);
  const salas = OF.slots.map((id, i) => { const r = id ? porId(id) : null; return { n: i + 1, r, est: !r ? 'vazio' : r.off ? 'dentro' : 'fora', porta: !r || r.off ? 1 : 0, an: null, obra: -1, cena: null, ui: null }; });
  const cx = i => i * PITCH;
  const O = { cam: 0, alvo: 0, v: 0, ant: 0, t: 0, x: null, drag: null, rodando: true };
  const atualIdx = salas.findIndex(s => s.r && s.r.id === h.atual()); O.cam = O.alvo = cx(Math.max(0, atualIdx));
  const maxCam = () => cx(salas.length);
  const aviso = m => { $('#ofiMsg').textContent = T(m); clearTimeout(O.av); O.av = setTimeout(() => { const e = $('#ofiMsg'); if (e) e.textContent = ''; }, 2600); };
  const salvaSalas = () => { OF.slots = salas.map(s => s.r ? s.r.id : null); OF.salvar(); };

  // botões por cima do desenho
  const uis = new Map(); const gui = (k, html) => { let e = uis.get(k); if (!e) { const t = document.createElement('template'); t.innerHTML = html; e = t.content.firstElementChild; pal.appendChild(e); uis.set(k, e); e._vis = true; } e._vis = true; return e; };
  const coloca = (e, wx, wy) => { e.style.left = (wx - O.cam + W / 2) * esc + 'px'; e.style.top = wy * esc + 'px'; };

  // ---------- ações ----------
  const pePos = (s, i) => ({ x: cx(i) + (s.r?.x || 0), y: CHAO + 40 + (s.r?.y || 0) });
  const portaAn = (s, de, para, dur, tipo, fim) => { s.an = { de, para, t: 0, dur, tipo, fim }; };
  function guardar(s, i) {
    const ativos = OF.robots.filter(r => !r.off).length; if (ativos <= 1) { aviso('pelo menos um robô precisa ficar ativo'); return; }
    s.ui = null; s.est = 'entrando'; bip(180, .12, 'sawtooth');
    portaAn(s, s.porta, 1, .5, 'sobe', () => { bip(320); s.cena = { t: 0, dur: .75, ida: true }; });
  }
  function reativar(s) { s.ui = null; s.est = 'saindo'; s.cena = { t: 0, dur: .7, ida: false }; s.r.off = false; h.mudou(); salvaSalas(); bip(420); }
  function apagar(s, i) {
    const r = s.r; s.ui = null; s.est = 'fechando';
    portaAn(s, 1, 0, 1.1, 'balanco', () => {
      OF.robots.splice(OF.robots.indexOf(r), 1); delete PRESETS[r.id]; s.r = null; salvaSalas(); h.mudou(); bip(120, .18, 'sawtooth');
      portaAn(s, 0, 1, .6, 'sobe', () => { s.est = 'vazio'; });
    });
  }
  function confirmaApagar(s, i) { const c = $('#ofiConf'); c.querySelector('p').textContent = `${T('Apagar')} ${s.r.nome} ${T('em definitivo? Isso não pode ser desfeito.')}`; c.hidden = false; $('#ofiSim').onclick = () => { const id = s.r.id; c.hidden = true; apagar(s, i); h.apagouRobo?.(id); }; $('#ofiNao').onclick = () => { c.hidden = true; }; $('#ofiNao').focus(); }
  function construir() {
    const i = salas.length, s = { n: i + 1, r: null, est: 'obra', porta: 1, an: null, obra: 0, obraT: 0, cena: null, ui: null }; salas.push(s); O.alvo = cx(i); salvaSalas(); bip(200);
  }
  function criar(s, i, base) {
    const num = OF.prox++, r = { id: 'u' + num, base, nome: `${T('Robô')} ${num}`, prot: false, off: false, x: 0, y: 0 }; OF.robots.push(r); OF.registra(r); s.r = r; s.ui = null; s.est = 'chegando'; s.cena = { t: 0, dur: .55 }; salvaSalas(); h.mudou(); bip(520);
  }
  // o modelo só é aceito depois de lido: arquivo ruim não deixa robô pela metade. Pronto, abre direto na montagem
  async function criarComModelo(s, i, base) {
    if (s.gravando) return;
    s.gravando = true;
    try { await h.guardarModelo('u' + OF.prox, s.arquivo); }
    catch (er) { s.erroModelo = String(er?.message || er).slice(0, 80); s.arquivo = null; s.gravando = false; bip(120, .1); return; }
    const nomeModelo = s.arquivo.name;
    s.arquivo = null; s.gravando = false; s.erroModelo = '';
    criar(s, i, base);
    const r = s.r;
    OF.salvar();
    setTimeout(() => { if (O.rodando) fechar(() => { h.abrir(r.id); h.verMontagem?.(nomeModelo); }); }, 900);
  }
  const fechar = (depois) => { O.rodando = false; cancelAnimationFrame(O.raf); removeEventListener('keydown', tecla); removeEventListener('resize', medir); OF.salvar(); raiz.remove(); window._oficina = null; h.fechou(); depois && depois(); };
  const tecla = e => { if (e.key === 'Escape') { if (!$('#ofiConf').hidden) $('#ofiConf').hidden = true; else fechar(); } else if (e.key === 'ArrowRight') O.alvo = Math.min(maxCam(), O.alvo + PITCH); else if (e.key === 'ArrowLeft') O.alvo = Math.max(0, O.alvo - PITCH); };
  addEventListener('keydown', tecla); addEventListener('resize', medir); $('#ofiFecha').onclick = () => fechar();

  // ---------- gestos ----------
  const ponto = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / esc, y: (e.clientY - r.top) / esc }; };
  const toca = p => { const wx = p.x + O.cam - W / 2; for (let i = 0; i < salas.length; i++) { const s = salas[i]; if (s.est !== 'fora' || !s.r) continue; const q = spr(s.r.base)[0], pp = pePos(s, i), l = (pp.x - SP * ZOOM / 2) + q.x0 * ZOOM, rr = (pp.x - SP * ZOOM / 2) + q.x1 * ZOOM, t = pp.y - (q.pe - q.topo) * ZOOM; if (wx >= l - 6 && wx <= rr + 6 && p.y >= t - 6 && p.y <= pp.y + 6) return i; } return -1; };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const p = ponto(e), i = toca(p);
    O.drag = { id: e.pointerId, x0: p.x, y0: p.y, cam0: O.cam, lx: p.x, t: performance.now(), v: 0, i, modo: i >= 0 ? 'talvez' : 'rola', mov: 0, r0: i >= 0 ? { x: salas[i].r.x, y: salas[i].r.y } : null };
    if (i >= 0) O.drag.tm = setTimeout(() => { if (O.drag && O.drag.modo === 'talvez') { O.drag.modo = 'segura'; salas[i].erguido = 1; bip(660, .03); cv.classList.add('pega'); } }, 240);
    else { cv.classList.add('pega'); salas.forEach(s => { if (s.ui === 'x') s.ui = null; }); }
  });
  cv.addEventListener('pointermove', e => {
    const d = O.drag; if (!d || d.id !== e.pointerId) return; const p = ponto(e), dx = p.x - d.x0, dy = p.y - d.y0; d.mov = Math.max(d.mov, Math.hypot(dx, dy));
    if (d.modo === 'talvez' && d.mov > 5) { clearTimeout(d.tm); d.modo = 'rola'; cv.classList.add('pega'); }
    if (d.modo === 'rola') { const now = performance.now(), dt = Math.max(1, now - d.t); d.v = (d.lx - p.x) / dt * 1000 * .6 + d.v * .4; d.lx = p.x; d.t = now; O.cam = O.alvo = Math.max(-80, Math.min(maxCam() + 80, d.cam0 - dx)); }
    if (d.modo === 'segura') { const r = salas[d.i].r; r.x = Math.round(d.r0.x + dx); r.y = Math.round(Math.max(-30, Math.min(LH - CHAO - 44, d.r0.y + dy))); if (p.x < 40) O.alvo = O.cam = Math.max(0, O.cam - 6); if (p.x > W - 40) O.alvo = O.cam = Math.min(maxCam(), O.cam + 6); }
  });
  const solta = e => {
    const d = O.drag; if (!d || d.id !== e.pointerId) return; O.drag = null; clearTimeout(d.tm); cv.classList.remove('pega');
    if (d.modo === 'rola') { const proj = O.cam + (performance.now() - d.t < 90 ? d.v * .28 : 0), idx = Math.round(proj / PITCH); O.alvo = Math.max(0, Math.min(maxCam(), idx * PITCH)); return; }
    if (d.modo === 'talvez') { const s = salas[d.i]; bip(760, .04); fechar(() => h.abrir(s.r.id)); return; }
    const s = salas[d.i]; s.erguido = 0; bip(300, .04);
    if (d.mov < 6) s.ui = s.ui === 'x' ? null : 'x'; else { s.ui = null; OF.salvar(); }
  };
  cv.addEventListener('pointerup', solta); cv.addEventListener('pointercancel', solta);
  cv.addEventListener('wheel', e => { e.preventDefault(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; O.acum = (O.acum || 0) + d; if (Math.abs(O.acum) > 60) { O.alvo = Math.max(0, Math.min(maxCam(), Math.round(O.alvo / PITCH + Math.sign(O.acum)) * PITCH)); O.acum = 0; } }, { passive: false });

  // ---------- quadro ----------
  const facil = { sobe: t => 1 - Math.pow(2, -10 * t), balanco: t => 1 - Math.abs(Math.exp(-4.2 * t) * Math.cos(9.5 * t)) };
  function desenhaSala(s, i) {
    const gx = cx(i) - O.cam + W / 2 - COLS * CW / 2 | 0; if (gx > W || gx + COLS * CW < 0) return;
    if (s.est === 'obra') { const G = quadroObra(s.n, Math.min(6, s.obra)); x.drawImage(G, gx, TOPO); return; }
    const G = galpao(s.n);
    x.drawImage(arteDentro, gx + PX, TOPO + PY);
    // robô guardado: lá atrás, menor, na sombra
    if (s.r && (s.est === 'dentro' || s.est === 'fechando')) { const q = spr(s.r.base)[(O.t * 2 + i) % 8 < 4 ? 3 : 4]; x.drawImage(q.escuro, gx + COLS * CW / 2 - SP * ZOOM_DENTRO / 2 | 0, TOPO + PY + PH - 6 - q.pe * ZOOM_DENTRO, SP * ZOOM_DENTRO, SP * ZOOM_DENTRO); }
    // a porta sobe para dentro da máscara do vão
    const sobe = Math.round(s.porta * PH / 2) * 2;
    if (sobe < PH) { x.save(); x.beginPath(); x.rect(gx + PX, TOPO + PY, PW, PH); x.clip(); x.drawImage(artePorta, gx + PX, TOPO + PY - sobe); x.restore(); }
    x.drawImage(G.fim, gx, TOPO);
  }
  function desenhaRobo(s, i) {
    if (!s.r || !['fora', 'entrando', 'saindo', 'chegando'].includes(s.est)) return;
    const qs = spr(s.r.base), ping = Math.floor(O.t * 5 + i * 3) % 14, f = ping < 8 ? ping : 14 - ping, q = qs[Math.max(0, Math.min(7, f))], pp = pePos(s, i);
    let wx = pp.x, py = pp.y - (s.erguido ? 8 : 0), z = ZOOM, sombra = false;
    if (s.cena && (s.est === 'entrando' || s.est === 'saindo')) {
      let t = Math.min(1, s.cena.t / s.cena.dur); t = Math.round(t * 12) / 12; if (!s.cena.ida) t = 1 - t;
      const fx = cx(i), fy = TOPO + PY + PH - 6; wx = pp.x + (fx - pp.x) * t; py = pp.y + (fy - pp.y) * t; z = ZOOM + (ZOOM_DENTRO - ZOOM) * t; sombra = t > .6;
    }
    let cai = 0; if (s.est === 'chegando') { const t = Math.min(1, s.cena.t / s.cena.dur); cai = (1 - facil.balanco(t)) * -220; }
    const sx = wx - O.cam + W / 2 - SP * z / 2 | 0, sy = py + cai - q.pe * z | 0;
    if (sx > W || sx + SP * z < 0) return;
    // sombra no chão em malha de pixel
    if (!sombra) { const lar = (q.x1 - q.x0) * z, ix = (wx - O.cam + W / 2 - lar / 2) | 0, iy = pp.y + 2 | 0; x.fillStyle = '#000'; for (let yy = 0; yy < 8; yy += 2) for (let xx = 0; xx < lar; xx += 2) if ((xx + yy) % 4 === 0) x.fillRect(ix + xx, iy + yy, 2, 2); }
    x.drawImage(sombra ? q.escuro : q.claro, sx, sy, SP * z, SP * z);
    if (!sombra && s.est === 'fora') { const nome = T(s.r.nome), sel = s.r.id === h.atual(); x.font = '700 15px Handjet, monospace'; x.textAlign = 'center'; x.textBaseline = 'top'; const tw = x.measureText(nome).width + 12, nx = wx - O.cam + W / 2 | 0, ny = pp.y + 12 | 0; x.fillStyle = sel ? COR.azul : '#000'; x.fillRect(nx - tw / 2 | 0, ny, tw | 0, 17); x.fillStyle = '#fff'; x.fillText(nome, nx, ny + 1); }
  }
  function linhas() {
    const v = Math.abs(O.v); if (v < 90) return; const dir = Math.sign(O.v), n = Math.min(110, v / 18 | 0), lar = Math.min(150, 6 + v * .08);
    for (let k = 0; k < n; k++) {
      const i = Math.round((O.cam + (Math.random() - .5) * W) / PITCH); if (i < 0 || i >= salas.length) continue; const a = galpao(salas[i].n).amo; if (!a.length) continue; const p = a[Math.random() * a.length | 0];
      const sx = cx(i) - O.cam + W / 2 - COLS * CW / 2 + p.x | 0, sy = TOPO + p.y; x.fillStyle = p.c; x.fillRect(dir > 0 ? sx : sx - lar | 0, sy, lar * (.4 + Math.random() * .6) | 0, 1);
    }
    for (let k = 0; k < n / 3; k++) { x.fillStyle = '#fff'; x.fillRect(Math.random() * W | 0, Math.random() * LH | 0, lar * .5 * Math.random() | 0, 1); }
  }
  function atualizaUI() {
    uis.forEach(e => e._vis = false);
    salas.forEach((s, i) => {
      if (Math.abs(cx(i) - O.cam) > W / 2 + PITCH) return;
      if (s.est === 'fora' && s.ui === 'x') { const q = spr(s.r.base)[0], pp = pePos(s, i), e = gui('x' + i, `<button class="ofB x" aria-label="guardar no galpão" title="guardar no galpão">×</button>`); e.onclick = () => guardar(s, i); coloca(e, pp.x, pp.y - (q.pe - q.topo) * ZOOM - 10); }
      if (s.est === 'dentro') { const e = gui('o' + i, `<div class="ofGrupo"><button class="ofB" data-a="r">reativar</button>${s.r.prot ? '' : '<button class="ofB" data-a="d">apagar em definitivo</button>'}</div>`); e.onclick = ev => { const a = ev.target.dataset.a; if (a === 'r') reativar(s); else if (a === 'd') confirmaApagar(s, i); }; coloca(e, cx(i), TOPO - 6); }
      if (s.est === 'vazio') {
        if (s.ui === 'base') {
          const nome = s.arquivo?.name, aviso = s.erroModelo ? `não abri o modelo: ${s.erroModelo}` : nome ? `modelo: ${nome} · agora escolha a base` : '';
          const e = gui(`b${i}|${nome || ''}|${s.erroModelo || ''}`, `<div class="ofGrupo">${Object.keys(OF.bases).map(k => `<button class="ofB" data-k="${k}">${OF.bases[k]}</button>`).join('')}<button class="ofB ofEnvia" data-env="1" data-tip="STL ou 3MF, com as peças separadas para as pernas dobrarem">${nome ? 'trocar modelo' : 'enviar modelo'}</button>${aviso ? `<span class="ofAviso">${textoSeguro(aviso)}</span>` : ''}</div>`);
          e.onclick = ev => { const k = ev.target.dataset.k; if (k) { if (s.arquivo) criarComModelo(s, i, k); else criar(s, i, k); } else if (ev.target.dataset.env) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.stl,.3mf'; inp.onchange = () => { if (inp.files[0]) { s.arquivo = inp.files[0]; s.erroModelo = ''; bip(500, .03); } }; inp.click(); } };
          coloca(e, cx(i), TOPO - 6);
        }
        else { const e = gui('m' + i, `<button class="ofB mais" aria-label="novo robô" title="novo robô neste galpão">+</button>`); e.onclick = () => { s.ui = 'base'; bip(500, .03); }; coloca(e, cx(i), TOPO - 4); }
      }
    });
    const e = gui('novo', `<button class="ofB mais" aria-label="construir galpão" title="construir galpão">+</button>`); e.onclick = construir; coloca(e, cx(salas.length), CHAO - 150);
    uis.forEach((e, k) => { if (!e._vis) { e.remove(); uis.delete(k); } });
  }
  function terreno(i) { const gx = cx(i) - O.cam + W / 2 - COLS * CW / 2 | 0; if (gx > W || gx + COLS * CW < 0) return; x.font = '700 15px Handjet, monospace'; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillStyle = '#5a636e'; for (let c = 0; c < COLS; c += 2) { x.fillText('-', gx + c * CW, CHAO - 13); x.fillText('-', gx + c * CW, CHAO - 90); } for (let r = 0; r < 7; r += 1) { x.fillText('|', gx, CHAO - 90 + r * 11); x.fillText('|', gx + COLS * CW - CW, CHAO - 90 + r * 11); } }
  function passo(dt) {
    O.t += dt;
    // expo-out: começa rápido e termina suave
    if (!O.drag || O.drag.modo !== 'rola') O.cam += (O.alvo - O.cam) * (1 - Math.exp(-dt * 7));
    const vi = (O.cam - O.ant) / Math.max(dt, .001); O.v += (vi - O.v) * .5; O.ant = O.cam;
    salas.forEach((s, i) => {
      if (s.an) { const a = s.an; a.t += dt; const k = Math.min(1, a.t / a.dur), f = facil[a.tipo](k); s.porta = a.de + (a.para - a.de) * f; if (a.tipo === 'balanco' && Math.abs(Math.exp(-4.2 * k) * Math.cos(9.5 * k)) < .02 && a.t % .2 < dt) bip(90, .05, 'square', .03); if (k >= 1) { s.porta = a.para; s.an = null; a.fim && a.fim(); } }
      if (s.est === 'obra') { s.obraT += dt; const f = Math.floor(s.obraT / .24); if (f !== s.obra) { s.obra = f; bip(240 + f * 60, .04); if (f >= 7) { s.est = 'vazio'; s.ui = 'base'; s.obra = -1; bip(880, .1, 'triangle'); } } }
      if (s.cena) {
        s.cena.t += dt;
        if (s.cena.t >= s.cena.dur) {
          const c = s.cena; s.cena = null;
          if (s.est === 'entrando') { s.est = 'dentro'; s.r.off = true; salvaSalas(); h.mudou(); bip(240, .06); }
          else if (s.est === 'saindo') { s.est = 'fora'; portaAn(s, 1, 0, .9, 'balanco'); }
          else if (s.est === 'chegando') { s.est = 'fora'; portaAn(s, 1, 0, .9, 'balanco'); bip(160, .1); }
        }
      }
    });
    const cam = O.cam; x.fillStyle = COR.ceu; x.fillRect(0, 0, W, LH);
    const sx = -((cam * .1 % 640) + 640) % 640; for (let u = sx; u < W; u += 640) x.drawImage(ceu, u | 0, 0);
    const lw = longe.width, lx = -((cam * .35 % lw) + lw) % lw; for (let u = lx; u < W; u += lw) x.drawImage(longe, u | 0, CHAO - longe.height);
    const cw = chao.width, cx0 = -((cam % cw) + cw) % cw; for (let u = cx0 - cw; u < W; u += cw) x.drawImage(chao, u | 0, CHAO);
    salas.forEach(desenhaSala); terreno(salas.length);
    salas.forEach(desenhaRobo); linhas(); atualizaUI();
  }
  let ult = performance.now();
  const laco = now => { if (!O.rodando) return; const dt = Math.min(.05, Math.max(0, (now - ult) / 1000)); ult = now; passo(dt); O.raf = requestAnimationFrame(laco); };
  passo(0); O.raf = requestAnimationFrame(laco);
  // usados nos testes automáticos, porque o painel escondido não anima sozinho
  const api = { O, salas, passo, fechar, construir, guardar: i => guardar(salas[i], i), reativar: i => reativar(salas[i]), confirmaApagar: i => confirmaApagar(salas[i], i), criar: (i, b) => criar(salas[i], i, b), escolherModelo: (i, f) => { salas[i].arquivo = f; salas[i].erroModelo = ''; }, criarComModelo: (i, b) => criarComModelo(salas[i], i, b), cv };
  window._oficina = api; return api;
}
