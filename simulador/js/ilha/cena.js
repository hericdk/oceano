// Ilha — a cena do mundo: terreno, água, rios, caminhos, vilas, árvores, nuvens, moradores e mensageiros,
// clima (dia, hora azul, dourada, rosa) com sol, céu e névoa que mudam suave. Os mirantes vêm de mirantes.js.
import * as THREE from '../../vendor/three.module.min.js';
import { COR, TAM } from './mundo.js';
import { montarVilas, fitas } from './casas.js';
import { acender } from './kit.js';
// Oceano: sem as vilas vivas (modelos e moradores) por enquanto; as casas vêm de casas.js
const RAIO_DETALHE = 10;
const montarVilasVivas = () => ({ agentes: [], atualizar() {}, descartar() {} });
import { clima } from './clima.js';
import { montarVegetacao } from './vegetacao.js';

// paredes das casas (versão nova): blocos de pedra em tom claro desenhados no próprio material, com juntas e leve variação
function pedraClara(mat) {
  mat.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundo; varying float vParede;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMundo = position; vParede = 1.0 - step(0.5, abs(normal.y));');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundo; varying float vParede;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vParede > 0.5 && dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)) > 0.4) {   // só paredes: telhados são escuros
          float fila = floor(vMundo.y / 0.34), lado = (vMundo.x + vMundo.z) / 0.62 + mod(fila, 2.0) * 0.5, bloco = floor(lado);
          float junta = step(0.1, fract(vMundo.y / 0.34)) * step(0.08, fract(lado));
          float tom = fract(sin(bloco * 12.9898 + fila * 78.233) * 43758.5453);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.94, 0.88), 0.5) * (0.93 + tom * 0.1) * mix(0.8, 1.0, junta);
        }`);
  };
  return mat;
}

// ── climas: céu (topo, horizonte), sol (cor, força, direção no referencial do mirante), luz ambiente, névoa, luzes da cidade ──
export const CLIMAS = {
  dia:     { topo: 0x4f92e3, hor: 0xe3eff2, sol: 0xffe8c2, forca: 2.5, dir: [0.45, 1, 0.35], ceu: 0xb9d0ff, chao: 0x7f9a62, amb: 1.0, nevoa: 0xc4d9ec, luzes: 0, agua: 0x2f7fc1 },
  azul:    { topo: 0x14305a, hor: 0x5b8dbd, sol: 0x9db8e6, forca: 1.0, dir: [-0.3, 0.7, 0.6], ceu: 0x7fa2d4, chao: 0x3a4252, amb: 1.0, nevoa: 0x4a75a3, luzes: 1, agua: 0x2a6496 },
  dourada: { topo: 0x6c8cc0, hor: 0xffc68c, sol: 0xffa057, forca: 3.0, dir: [-1, 0.42, -0.25], ceu: 0xf5cfa6, chao: 0x7d6a5c, amb: 1.15, nevoa: 0xf2c49a, luzes: 0.25, agua: 0x3f8fa8 },
  rosa:    { topo: 0x8a84b8, hor: 0xf7b9ae, sol: 0xffb49a, forca: 1.6, dir: [0.7, 0.28, 0.9], ceu: 0xf6cfd0, chao: 0x9a8590, amb: 1.2, nevoa: 0xf4c2b8, luzes: 0.55, agua: 0x7d8fb0 },
  // noite: luar frio e o céu vira a nebulosa de pixel (a mesma do No Man Sky FM, vista da cabine)
  noite:   { topo: 0x060914, hor: 0x1a2244, sol: 0x9fb4ff, forca: 0.55, dir: [0.35, 0.75, -0.45], ceu: 0x2a3560, chao: 0x0e111c, amb: 0.5, nevoa: 0x141a33, luzes: 1, agua: 0x0f2440, noite: 1 },
};

// ── hora da cena (porte do Oceano): a hora vira uma mistura dos climas — noite, hora azul, rosa, dourada, dia ──
const HORAS = [[0, 'noite'], [4.8, 'noite'], [5.6, 'azul'], [6.4, 'rosa'], [7.4, 'dourada'], [9, 'dia'], [16, 'dia'], [17.4, 'dourada'], [18.3, 'rosa'], [19.1, 'azul'], [20, 'noite'], [24, 'noite']];
const NUMEROS = ['forca', 'amb', 'luzes', 'noite'];
export function climaDaHora(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i < HORAS.length - 2 && HORAS[i + 1][0] <= h) i++;
  const [h0, a] = HORAS[i], [h1, b] = HORAS[i + 1], u = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
  const A = CLIMAS[a], B = CLIMAS[b], c = {};
  for (const k of ['topo', 'hor', 'sol', 'ceu', 'chao', 'nevoa', 'agua']) c[k] = new THREE.Color(A[k]).lerp(new THREE.Color(B[k]), u).getHex();
  for (const k of NUMEROS) c[k] = (A[k] || 0) + ((B[k] || 0) - (A[k] || 0)) * u;
  c.dir = A.dir.map((v, j) => v + (B.dir[j] - v) * u);
  return c;
}

function texturaNebulosa() {
  const t = new THREE.TextureLoader().load('/img/ceu/nebulosa.png');
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.MirroredRepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;   // pixel nítido, sem borrão
  return t;
}

function texturaAgua() {
  const n = 128, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const c = cv.getContext('2d'), img = c.createImageData(n, n);
  const h = (x, y) => Math.sin(x * 0.29 + Math.sin(y * 0.17) * 2) * 0.5 + Math.sin(y * 0.41 + x * 0.07) * 0.35 + Math.sin((x + y) * 0.93) * 0.15;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
    const i = (y * n + x) * 4;
    img.data[i] = 128 + dx * 90; img.data[i + 1] = 128 + dy * 90; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(300, 300);
  return t;
}

// correnteza: riscos de espuma ao longo do rio (v corre rio abaixo; a textura desliza e mostra o sentido)
function texturaCorrente(fundo = '#5fb3d8', claro = 'rgba(225,244,250,0.9)', escuro = 'rgba(47,127,193,0.8)') {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = fundo; c.fillRect(0, 0, 32, 128);
  let a = 7;
  const acaso = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  for (let k = 0; k < 26; k++) {
    c.fillStyle = k % 4 === 0 ? escuro : claro;
    const x = 3 + acaso() * 26, y = acaso() * 128, l = 10 + acaso() * 26;
    c.fillRect(x, y, 1.5 + acaso() * 2, l);
    if (y + l > 128) c.fillRect(x, y - 128, 2, l);   // costura da repetição
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// rios como fita com coordenada de textura (largura e comprimento), suavizados (Chaikin) e mais largos rio abaixo
function geoRios(rios, altura) {
  const pos = [], uv = [], ind = [];
  for (const bruto of rios) {
    let pts = bruto.map(p => [p.x, p.z]);
    for (let it = 0; it < 2; it++) {
      const n = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; n.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); }
      n.push(pts[pts.length - 1]); pts = n;
    }
    let dist = 0; const base = pos.length / 3;
    pts.forEach(([x, z], i) => {
      const [px, pz] = pts[Math.max(0, i - 1)], [qx, qz] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = qx - px, dz = qz - pz, L = Math.hypot(dx, dz) || 1;
      if (i) dist += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
      const t = i / (pts.length - 1);
      const tg = (bruto.t0 ?? 0) + t * ((bruto.t1 ?? 1) - (bruto.t0 ?? 0));   // posição no rio inteiro (trechos e braços)
      const lw = bruto.veio ? 0.28 + t * 0.3 : bruto.noNivel ? 2.6 : bruto.grande ? (0.9 + tg * 1.5) * (bruto.fino ? 0.65 : 1) : 0.6 + t * 0.7;
      const nx = -dz / L * lw, nz = dx / L * lw;
      for (const s of [1, -1]) {
        const X = x + nx * s, Z = z + nz * s;
        pos.push(X, bruto.noNivel ? 0.06 : Math.max(altura(x, z), 0) + (bruto.veio ? 0.55 : 0.35), Z);   // na altura do leito (centro)
        uv.push(s > 0 ? 0 : 1, dist / 6);
      }
      if (i) { const k = base + i * 2; ind.push(k - 2, k, k - 1, k - 1, k, k + 1); }   // virado para cima
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind); g.computeVertexNormals();
  return g;
}

// nuvem de cúmulo pintada (Studio G): lobos macios, base reta, topo branco quente e barriga lavanda.
// Usada também pelas tempestades; a cor do material ainda escurece a nuvem quando ela chove.
export function texturaNuvem() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  for (const [x, y, r] of [[30, 80, 18], [46, 70, 24], [66, 58, 30], [88, 66, 24], [104, 80, 16], [52, 84, 22], [78, 84, 22], [64, 76, 26]]) {
    const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.72, 'rgba(255,255,255,0.97)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.clearRect(0, 96, 128, 32);                       // base reta, como cúmulo de verão
  c.globalCompositeOperation = 'source-atop';         // sombreia só onde já tem nuvem
  const s = c.createLinearGradient(0, 30, 0, 96);
  s.addColorStop(0, 'rgba(255,247,230,0.5)'); s.addColorStop(0.45, 'rgba(255,255,255,0)'); s.addColorStop(1, 'rgba(176,170,222,0.85)');
  c.fillStyle = s; c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.userData = { normal: cv, tinta: contornoNanquim(cv) };
  if (tinta) t.image = t.userData.tinta;
  texturasNuvem.add(t);
  t.addEventListener('dispose', () => texturasNuvem.delete(t));
  return t;
}

// Tinta: a nuvem vira silhueta firme com borda de nanquim. A nuvem é sprite sem profundidade, então o traço do
// pós-processamento não a enxerga; a borda vem da alfa da textura (máscara dilatada menos a máscara).
function contornoNanquim(origem) {
  const n = origem.width, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const c = cv.getContext('2d');
  c.drawImage(origem, 0, 0);
  const img = c.getImageData(0, 0, n, n), d = img.data;
  const dentro = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) dentro[i] = d[i * 4 + 3] > 90 ? 1 : 0;
  const R = 1.5;   // espessura do traço em pixels da textura (128 px): linha fina
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, o = i * 4;
    if (dentro[i]) { d[o + 3] = 255; continue; }
    let borda = false;
    for (let dy = -R; dy <= R && !borda; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx, yy = y + dy;
      if (dx * dx + dy * dy <= R * R && xx >= 0 && yy >= 0 && xx < n && yy < n && dentro[yy * n + xx]) { borda = true; break; }
    }
    if (borda) { d[o] = d[o + 1] = d[o + 2] = 20; d[o + 3] = 255; } else d[o + 3] = 0;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// troca as nuvens (céu e tempestades) entre a pintura e o nanquim do Tinta
const texturasNuvem = new Set();
let tinta = false;
export function nuvensTinta(sim) {
  tinta = sim;
  for (const t of texturasNuvem) { t.image = sim ? t.userData.tinta : t.userData.normal; t.needsUpdate = true; }
}

// boneco que anda pelo mundo com altura (morador ou mensageiro): chão sempre embaixo, vira suave
// Oceano: sem bonecos andarilhos (ficaram de fora desta ilha).
export function andarilho() { return null; }

export function montarCena(cena, mundo, { destaque = 0x0040ff, graficos = 'novo' } = {}) {
  const { altura, r } = mundo;
  const objs = [];
  const add = o => { cena.add(o); objs.push(o); return o; };

  // céu pintado: degradê do horizonte claro ao azul fundo e cúmulos macios na faixa baixa, com topo quente e
  // barriga lavanda (acompanha a câmera; não escreve profundidade)
  const ceuMat = new THREE.ShaderMaterial({
    uniforms: { topo: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, luz: { value: new THREE.Color() }, tempo: { value: 0 }, tinta: { value: 0 }, noite: { value: 0 }, neb: { value: texturaNebulosa() } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 topo; uniform vec3 hor; uniform vec3 luz; uniform float tempo; uniform float tinta; uniform float noite; uniform sampler2D neb; varying vec3 d;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rd(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hs(i), hs(i + vec2(1., 0.)), f.x), mix(hs(i + vec2(0., 1.)), hs(i + vec2(1., 1.)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * rd(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
      void main(){
        float h = d.y;
        vec3 c = mix(hor, topo, pow(smoothstep(-0.01, 0.35, h), 0.5));
        // noite: a nebulosa de pixel cobre o céu (espelhada 4× em volta, o miolo rosa perto do horizonte)
        if (noite > 0.001) {
          vec2 uv = vec2((atan(d.x, d.z) / 6.2831853 + 0.5) * 4.0, clamp(h / 0.85, 0.0, 1.0));
          vec3 nb = texture2D(neb, uv).rgb;
          c = mix(c, mix(hor, nb, smoothstep(0.0, 0.16, h)), noite);
        }
        // cúmulos: projeção no plano das nuvens; a faixa perto do horizonte concentra as nuvens
        vec2 q = d.xz / (max(h, 0.0) + 0.3) * vec2(1.3, 1.3) + vec2(tempo * 0.01, 0.0);
        float n = fbm(q) * 0.8 + 0.2 * fbm(q * 3.1);
        float faixa = smoothstep(0.01, 0.07, h) * (1.0 - smoothstep(0.35, 0.65, h));
        float corpo = smoothstep(0.52, 0.59, n) * faixa;
        // miolo denso e topo (mais longe do horizonte) brancos e quentes; borda fina e base lavanda
        float luzN = clamp(0.3 + smoothstep(0.55, 0.7, n) * 0.7, 0.0, 1.0);
        vec3 barriga = mix(hor, topo, 0.35) * vec3(0.9, 0.88, 1.0);
        vec3 nuvem = mix(barriga, mix(vec3(1.0), luz, 0.2), luzN) * mix(1.0, 0.3, noite);
        vec3 o = mix(c, nuvem, corpo * mix(0.95, 0.7, noite));
        // Tinta: céu e nuvem viram o mesmo papel; uma linha fina de nanquim marca a borda dos cúmulos
        float borda = 1.0 - smoothstep(0.0, fwidth(n) * 1.2, abs(n - 0.555));
        o = mix(o, vec3(0.06), tinta * borda * faixa);
        gl_FragColor = vec4(o, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const ceu = add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), ceuMat));
  ceu.renderOrder = -10;

  // luzes
  const hemi = add(new THREE.HemisphereLight(0xffffff, 0x888888, 1));
  const sol = add(new THREE.DirectionalLight(0xffffff, 2));
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.04;
  add(sol.target);
  cena.fog = new THREE.Fog(0xffffff, 200, 1200);

  // terreno, água, rios, caminhos
  const terreno = add(new THREE.Mesh(mundo.geoTerreno, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  terreno.receiveShadow = true; terreno.castShadow = true;
  // água meio transparente: o fundo (colorido pela profundidade no terreno) aparece no raso e some no fundo;
  // abaixo do terreno visível, um piso escuro faz o papel do mar profundo
  const aguaMat = new THREE.MeshPhongMaterial({ color: COR.agua, shininess: 45, specular: 0xffd9b0, normalMap: texturaAgua(), normalScale: new THREE.Vector2(0.55, 0.55), transparent: true, opacity: 0.62 });
  const agua = add(new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), aguaMat));
  agua.rotation.x = -Math.PI / 2; agua.receiveShadow = true;
  const fundoMat = new THREE.MeshBasicMaterial({ color: 0x1d4670 });
  const fundoMar = add(new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), fundoMat));
  fundoMar.rotation.x = -Math.PI / 2; fundoMar.position.y = -2.7;
  // rios com correnteza: a textura desliza rio abaixo; o trecho no nível do mar (saída do lago) é meio transparente
  const texRio = texturaCorrente();
  const rioMat = new THREE.MeshLambertMaterial({ map: texRio });
  const rioMatNivel = new THREE.MeshLambertMaterial({ map: texRio, transparent: true, opacity: 0.55, depthWrite: false });
  // veios na pedra: água branca de cascata, mais rápida
  const texVeio = texturaCorrente('#bfe1ee', 'rgba(255,255,255,0.95)', 'rgba(95,179,216,0.85)');
  const veioMat = new THREE.MeshLambertMaterial({ map: texVeio });
  const altos = mundo.rios.filter(p => !p.noNivel && !p.veio), nivel = mundo.rios.filter(p => p.noNivel), veios = mundo.rios.filter(p => p.veio);
  if (altos.length) add(new THREE.Mesh(geoRios(altos, altura), rioMat)).receiveShadow = true;
  if (veios.length) add(new THREE.Mesh(geoRios(veios, altura), veioMat)).receiveShadow = true;
  if (nivel.length) add(new THREE.Mesh(geoRios(nivel, altura), rioMatNivel));
  add(new THREE.Mesh(fitas(mundo.caminhos.map(c => c.pts), 0.55, COR.caminho, altura, 0.12), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))).receiveShadow = true;

  // vilas
  const vilasGeo = montarVilas(mundo, { destaque });
  const matCasas = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  if (graficos === 'novo') pedraClara(matCasas);
  const casas = add(new THREE.Mesh(vilasGeo.casas, matCasas));
  casas.castShadow = casas.receiveShadow = true;
  add(new THREE.Mesh(vilasGeo.ruas, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))).receiveShadow = true;

  // árvores: pinheiros (cone de 5 lados) e copas redondas (bola facetada), instanciadas
  // cones só longe das vilas: perto delas as árvores são modelos do MegaKit (vila.js)
  const longe = mundo.arvores.filter(a => !mundo.vilas.some(v => Math.hypot(a[0] - v.x, a[2] - v.z) < RAIO_DETALHE));
  const pinheiros = longe.filter(a => !a[3]), outono = longe.filter(a => a[3]);
  const copa = new THREE.ConeGeometry(0.9, 2.8, 5); copa.translate(0, 2.4, 0);
  const bola = new THREE.IcosahedronGeometry(1.1, 0); bola.translate(0, 1.9, 0);
  const tronco = new THREE.CylinderGeometry(0.12, 0.16, 1.2, 5); tronco.translate(0, 0.6, 0);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), cor = new THREE.Color();
  const arvores3d = [];
  const instanciar = (geo, lista, cores) => {
    const im = add(new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ flatShading: true }), lista.length));
    lista.forEach((a, k) => {
      const e = 0.7 + ((k * 7919) % 100) / 160;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), k * 2.4);
      m4.compose(p3.set(a[0], altura(a[0], a[2]) - 0.1, a[2]), q, s3.set(e, e * (0.9 + (k % 5) * 0.06), e));
      im.setMatrixAt(k, m4);
      if (cores) im.setColorAt(k, cor.setHex(cores[k % cores.length]));
    });
    im.castShadow = true; im.receiveShadow = true;
    arvores3d.push(im);
    return im;
  };
  // verdes variados, do azulado ao amarelado (as copas redondas são quase todas verdes, poucas de outono)
  if (pinheiros.length) instanciar(copa, pinheiros, [0x357a3a, 0x3f8a3b, 0x2c6a45, 0x4f9c40, 0x3a7d48, 0x5aa246]);
  if (outono.length) instanciar(bola, outono, [0x6fae3f, 0x8cc04a, 0xd9822b, 0x4f9a3c, 0x9ccc52, 0xe0a33a, 0x5ea544]);
  instanciar(tronco, longe, [0x5a4330]);
  // as plantas desenhadas: "pixel" mistura todas as árvores, "3d" usa só as isométricas. As árvores de malha ficam para os gráficos clássicos
  let veg = null, modoVeg = 'pixel', pedidaVeg = 0;
  const plantas = {};
  const definirVegetacao = modo => {
    modoVeg = modo === '3d' ? '3d' : 'pixel';
    if (graficos !== 'novo') return;
    const vez = ++pedidaVeg;
    (plantas[modoVeg] ??= montarVegetacao(add, mundo, { soIsometricas: modoVeg === '3d' })).then(v => {
      if (vez !== pedidaVeg) return;
      veg?.mostrar(false);
      veg = v; veg.mostrar(true);
      for (const im of arvores3d) im.visible = false;
    }).catch(e => console.warn('ilha: vegetação', e));
  };

  // nuvens: aparecem quando a câmera se afasta (e fazem sombra suave no chão pela névoa da distância)
  const texN = texturaNuvem();
  const nuvens = [];
  for (let k = 0; k < 60; k++) {
    const sp = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texN, transparent: true, depthWrite: false, opacity: 0, fog: false })));
    const e = 30 + r() * 50;
    sp.scale.set(e, e * 0.55, 1);
    sp.position.set(r.entre(-TAM * 0.5, TAM * 0.5), 70 + r() * 30, r.entre(-TAM * 0.5, TAM * 0.5));
    sp.userData.v = 1 + r() * 2;
    sp.userData.u = r();            // nuvens com u abaixo da fração de chuva viram nuvens de chuva
    nuvens.push(sp);
  }
  // chuva: cada nuvem de chuva solta riscos até o chão por onde passa. A fração de nuvens que chovem segue o clima
  // (antes: gasto de tokens de hoje × média de 7 dias): 25% num dia normal, até 75%.
  const GOTAS = 70, NCH = nuvens.length;
  const posChuva = new Float32Array(NCH * GOTAS * 6);
  const gotas = [];   // { n, dx, dz, y, v, chao }
  for (let i = 0; i < NCH; i++) for (let k = 0; k < GOTAS; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * nuvens[i].scale.x * 0.32;
    gotas.push({ n: i, dx: Math.cos(a) * d, dz: Math.sin(a) * d * 0.7, y: nuvens[i].position.y * r(), v: 38 + r() * 14 });
  }
  const geoChuva = new THREE.BufferGeometry();
  geoChuva.setAttribute('position', new THREE.BufferAttribute(posChuva, 3));
  const matChuva = new THREE.LineBasicMaterial({ color: 0xdfe9f7, transparent: true, opacity: 0.85, depthWrite: false });
  const chuvaLinhas = add(new THREE.LineSegments(geoChuva, matChuva));
  chuvaLinhas.frustumCulled = false;
  const CINZA = new THREE.Color(0xaab2bf), BRANCO = new THREE.Color(0xffffff);

  // moradores (passeiam pela vila) e mensageiros (levam informação de uma vila a outra pelos caminhos)
  const gente = [];
  for (const v of mundo.vilas) {
    const n = 3 + Math.min(5, v.agentes.length);
    const raio = (v.comp || 10) * 0.85;
    for (let k = 0; k < n; k++) {
      gente.push(andarilho(cena, {
        cor: v.cor || null, seed: k * 3.1 + v.x,
        chao: altura,
        proximo: () => {
          for (let t = 0; t < 12; t++) {
            const a = Math.random() * Math.PI * 2, d = Math.random() * raio;
            const x = v.x + Math.cos(a) * d, z = v.z + Math.sin(a) * d;
            if (altura(x, z) > 0.6) return { x, z, pausa: Math.random() < 0.4 ? 1 + Math.random() * 4 : 0 };
          }
          return { x: v.x, z: v.z };
        },
      }));
    }
  }
  for (const c of mundo.caminhos) {
    const pts = c.pts; let i = 0, dir = 1;
    const va = mundo.vilas[c.a];
    gente.push(andarilho(cena, {
      cor: va.cor || null, seed: c.a * 11 + c.b,
      chao: altura,
      proximo: () => {
        i += dir * 2;
        if (i >= pts.length - 1 || i <= 0) { dir = -dir; i = Math.max(0, Math.min(pts.length - 1, i)); return { x: pts[i].x, z: pts[i].z, pausa: 3 + Math.random() * 4 }; }
        return { x: pts[i].x, z: pts[i].z, correr: true };
      },
    }));
  }
  for (const g of gente.filter(Boolean)) objs.push(g.b.raiz);

  const mirantes = [];
  // vilas vivas: prédios de função, praça, natureza e os agentes indo ao prédio da ferramenta
  const vivas = montarVilasVivas(cena, mundo);

  // ── clima: interpola tudo para o alvo ──
  const atual = {}, alvo = {};
  const CORES = ['topo', 'hor', 'sol', 'ceu', 'chao', 'nevoa', 'agua'];
  function definirClima(nome, ang = 0, imediato = false, dirLocal = null) {
    const c = typeof nome === 'object' ? nome : CLIMAS[nome] || CLIMAS.dia;   // nome ou mistura de climaDaHora()
    for (const k of CORES) alvo[k] = new THREE.Color(c[k]);
    for (const k of NUMEROS) alvo[k] = c[k] || 0;
    const [dx, dy, dz] = dirLocal || c.dir, ca = Math.cos(ang), sa = Math.sin(ang);
    alvo.dir = new THREE.Vector3(dx * ca + dz * sa, dy, -dx * sa + dz * ca).normalize();
    if (imediato || !atual.dir) for (const k in alvo) atual[k] = alvo[k].clone ? alvo[k].clone() : alvo[k];
  }
  definirClima('dia', 0, true);
  // editor do mundo: muda o clima "dia" (sol, céu, névoa, luz ambiente) e reaplica
  function aplicarEstilo(e) {
    const d = CLIMAS.dia, rad = Math.PI / 180;
    if (e.solAz != null && e.solAlt != null) d.dir = [Math.cos(e.solAlt * rad) * Math.sin(e.solAz * rad), Math.sin(e.solAlt * rad), Math.cos(e.solAlt * rad) * Math.cos(e.solAz * rad)];
    for (const [k, c] of [['ceuTopo', 'topo'], ['ceuHor', 'hor'], ['nevoaCor', 'nevoa'], ['solCor', 'sol']]) if (e[k]) d[c] = parseInt(e[k].slice(1), 16);
    if (e.solForca != null) d.forca = e.solForca;
    if (e.amb != null) d.amb = e.amb;
    definirClima('dia', 0, true);
  }

  const tmp = new THREE.Vector3(), corNuvem = new THREE.Color();
  return {
    mirantes, vilas: mundo.vilas, definirClima, CLIMAS, vivas, aplicarEstilo, definirVegetacao,
    luzSol: sol,
    atualizar(t, dt, cam, foco, dist) {
      const k = 1 - Math.exp(-dt * 1.4);
      for (const c of CORES) atual[c].lerp(alvo[c], k);
      for (const c of NUMEROS) atual[c] += (alvo[c] - atual[c]) * k;
      atual.dir.lerp(alvo.dir, k).normalize();
      ceuMat.uniforms.topo.value.copy(atual.topo); ceuMat.uniforms.hor.value.copy(atual.hor); ceuMat.uniforms.luz.value.copy(atual.sol); ceuMat.uniforms.tempo.value = t; ceuMat.uniforms.tinta.value = tinta ? 1 : 0; ceuMat.uniforms.noite.value = atual.noite;
      ceu.position.copy(cam.position);
      hemi.color.copy(atual.ceu); hemi.groundColor.copy(atual.chao); hemi.intensity = atual.amb;
      sol.color.copy(atual.sol); sol.intensity = atual.forca;
      cena.fog.color.copy(atual.nevoa);
      cena.fog.near = 30 + dist * 0.7; cena.fog.far = 420 + dist * 2.6;
      aguaMat.color.copy(atual.agua);
      veg?.atualizar(t, atual.sol, atual.ceu, atual.amb, dist);
      aguaMat.normalMap.offset.set(t * 0.004, t * 0.0025);
      fundoMat.color.copy(atual.agua).multiplyScalar(0.45);
      texRio.offset.y = -t * 0.55;
      texVeio.offset.y = -t * 1.6;
      acender(atual.luzes);
      // sombra: o recorte do sol acompanha o foco da câmera (mais nítida de perto)
      const meia = Math.min(260, Math.max(30, dist * 0.9));
      const sc = sol.shadow.camera;
      if (sc.right !== meia) { sc.left = -meia; sc.right = meia; sc.top = meia; sc.bottom = -meia; sc.near = 1; sc.far = 900; sc.updateProjectionMatrix(); }
      sol.target.position.copy(foco);
      sol.position.copy(foco).addScaledVector(atual.dir, 400);
      // nuvens: só de longe
      const op = THREE.MathUtils.smoothstep(dist, 140, 320) * 0.95;
      const fracao = 0.25 + 0.5 * Math.min(1, clima.alvo || 0);
      for (const n of nuvens) {
        n.material.opacity = op; n.visible = op > 0.01;
        n.position.x += n.userData.v * dt; if (n.position.x > TAM * 0.55) n.position.x = -TAM * 0.55;
        n.userData.chove = n.userData.u < fracao;
        corNuvem.copy(n.userData.chove ? CINZA : BRANCO).multiplyScalar(1 - atual.noite * 0.75);   // de noite, nuvem de luar
        n.material.color.lerp(corNuvem, Math.min(1, dt * 0.8));   // escurece devagar antes de chover
      }
      // riscos de chuva: caem da nuvem até o chão sob ela; de perto continuam visíveis (a nuvem fica acima do quadro)
      const L = Math.max(0.8, Math.min(18, dist * 0.05));   // risco mais longo de longe para continuar legível
      let j = 0;
      for (const g of gotas) {
        const n = nuvens[g.n];
        if (!n.userData.chove) { posChuva.fill(0, j, j + 6); j += 6; continue; }
        const x = n.position.x + g.dx, z = n.position.z + g.dz;
        const chao = Math.max(0, altura(x, z));
        g.y -= g.v * dt;
        if (g.y < chao) g.y = n.position.y - 4 - Math.random() * 6;
        posChuva[j++] = x; posChuva[j++] = g.y; posChuva[j++] = z;
        posChuva[j++] = x - 0.15 * L; posChuva[j++] = g.y + L; posChuva[j++] = z;
      }
      geoChuva.attributes.position.needsUpdate = true;
      // gente: só de perto (e só quem está perto anda: economia)
      vivas.atualizar(t, dt, foco, dist);
      for (const g of gente) { if (!g) continue;
        const d = tmp.set(g.b.estado.x, 0, g.b.estado.z).distanceTo(tmp.copy(foco).setY(0));
        const ver = dist < 170 && d < 120;
        g.b.raiz.visible = ver;
        if (ver) g.passo(t, dt);
      }
    },
    descartar() {
      vivas.descartar();
      for (const o of objs) {
        cena.remove(o);
        o.traverse?.(n => { n.geometry?.dispose?.(); });
      }
      cena.fog = null;
    },
  };
}
