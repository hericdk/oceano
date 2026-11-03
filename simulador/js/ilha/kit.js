// Ilha — kit de peças low poly para os mirantes: prédios com janelas que acendem, postes, semáforos,
// veículos (carro, bonde, ônibus, trem, balsa, veleiro) e um seguidor de trajeto com paradas (sinal fechado).
// Escala: boneco em escala 0.75 ≈ 0.85 de altura → 1 unidade ≈ 2 m. Um andar = 1.6.
import * as THREE from '../../vendor/three.module.min.js';

// ── materiais ──
const cache = new Map();
export function mat(hex) {
  if (!cache.has(hex)) cache.set(hex, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  return cache.get(hex);
}
// luzes (janelas, postes, faróis): acendem com o clima; `luzes` vai de 0 (dia) a 1 (noite)
export const LUZES = [];
export function luz(hex, base = 1) {
  const m = new THREE.MeshBasicMaterial({ color: hex });
  m.userData = { cor: new THREE.Color(hex), base };
  LUZES.push(m);
  return m;
}
const APAGADA = new THREE.Color(0x3a3c40);
export const ESTADO = { luzes: 0 };
export function acender(nivel) {
  ESTADO.luzes = nivel;
  for (const m of LUZES) m.color.copy(APAGADA).lerp(m.userData.cor, Math.min(1, nivel * m.userData.base + (m.userData.base > 1 ? 0.4 : 0)));
  for (const m of FACHADAS) m.emissiveIntensity = nivel * 0.85;
}

// ── fachada com janelas (textura de 8×8 vãos; acesas no emissiveMap) ──
const FACHADAS = [];
let texFachada = null;
function texturas() {
  if (texFachada) return texFachada;
  const C = 16, n = 8;
  const base = document.createElement('canvas'), acesa = document.createElement('canvas');
  base.width = base.height = acesa.width = acesa.height = C * n;
  const b = base.getContext('2d'), a = acesa.getContext('2d');
  b.fillStyle = '#ffffff'; b.fillRect(0, 0, C * n, C * n);
  a.fillStyle = '#000000'; a.fillRect(0, 0, C * n, C * n);
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * C + 4, y = j * C + 4, w = C - 8, h = C - 6;
    b.fillStyle = '#9aa0a8'; b.fillRect(x - 1, y - 1, w + 2, h + 2);            // moldura
    b.fillStyle = '#2b3038'; b.fillRect(x, y, w, h);                             // vidro
    b.fillStyle = '#ffffff'; b.fillRect(x - 1, y + h + 1, w + 2, 1);            // peitoril
    if (rnd() < 0.34) { a.fillStyle = rnd() < 0.7 ? '#ffc56a' : '#fff0c8'; a.fillRect(x, y, w, h); }
  }
  const t1 = new THREE.CanvasTexture(base), t2 = new THREE.CanvasTexture(acesa);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; }
  return (texFachada = { base: t1, acesa: t2 });
}
const matFachada = new Map();
function materialFachada(hex) {
  if (!matFachada.has(hex)) {
    const t = texturas();
    const m = new THREE.MeshLambertMaterial({ color: hex, map: t.base, emissive: 0xffffff, emissiveMap: t.acesa, emissiveIntensity: 0 });
    FACHADAS.push(m); matFachada.set(hex, m);
  }
  return matFachada.get(hex);
}

// prédio: caixa com janelas nas 4 faces e laje no topo; base em y0, sobe h
export function predio(grupo, { x, z, w, d, y0 = 0, h, cor = 0xe9e1d0, semente = 0, vao = 1.3, andar = 1.6, telhado = 0x8e8a82 }) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  const ou = (semente * 3) % 8 / 8, ov = (semente * 5) % 8 / 8;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    if (ny > 0.5) { uv.setXY(i, 0.001, 0.001); continue; }
    const larg = nx > 0.5 ? d : w;
    uv.setXY(i, uv.getX(i) * larg / (8 * vao) + ou, uv.getY(i) * h / (8 * andar) + ov);
  }
  const m = new THREE.Mesh(g, materialFachada(cor));
  m.position.set(x, y0 + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  grupo.add(m);
  // platibanda e casinha da caixa d'água no topo
  const lage = caixa(grupo, x, y0 + h + 0.12, z, w + 0.15, 0.24, d + 0.15, telhado);
  lage.castShadow = true;
  return m;
}

export function caixa(grupo, x, y, z, w, h, d, hex, material = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material || mat(hex));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  grupo.add(m);
  return m;
}

// quadrilátero no chão (faixa, linha, calçada) — y por canto
export function piso(grupo, pts, hex, material = null) {
  const g = new THREE.BufferGeometry();
  const [a, b, c, d] = pts;
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material || mat(hex));
  m.receiveShadow = true;
  grupo.add(m);
  return m;
}

// poste com luminária (acende à noite)
export function poste(grupo, x, y, z, { h = 2.6, braco = 0.6, dir = 1, cor = 0xffd58a } = {}) {
  caixa(grupo, x, y + h / 2, z, 0.08, h, 0.08, 0x30343a);
  caixa(grupo, x + braco * dir / 2, y + h, z, braco, 0.06, 0.06, 0x30343a);
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.16), luz(cor, 1.4));
  l.position.set(x + braco * dir, y + h - 0.06, z);
  grupo.add(l);
}

// semáforo: três luzes; devolve set(estado) com 'verde' | 'amarelo' | 'vermelho'
export function semaforo(grupo, x, y, z, ang = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ang; grupo.add(g);
  caixa(g, 0, 1.1, 0, 0.07, 2.2, 0.07, 0x30343a);
  caixa(g, 0, 2.15, 0, 0.22, 0.6, 0.16, 0x1d2024);
  const cores = { vermelho: 0xff3b2f, amarelo: 0xffb020, verde: 0x2fe07a };
  const lamp = {};
  ['vermelho', 'amarelo', 'verde'].forEach((k, i) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), m);
    l.position.set(0, 2.33 - i * 0.18, 0.09); g.add(l); lamp[k] = m;
  });
  return { set(estado) { for (const k in lamp) lamp[k].color.setHex(k === estado ? cores[k] : 0x222222); } };
}

// ── veículos (frente = +x local) ──
export function carro(cor = 0xc9ccd2) {
  const g = new THREE.Group();
  caixa(g, 0, 0.32, 0, 2.2, 0.42, 0.95, cor);
  caixa(g, -0.1, 0.72, 0, 1.25, 0.4, 0.86, cor);
  caixa(g, -0.1, 0.72, 0, 1.28, 0.26, 0.88, 0x2a2e36);                 // vidros
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.18), luz(0xfff4d6, 1.6)); f.position.set(1.1, 0.36, s * 0.33); g.add(f);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.2), luz(0xff2a1a, 1.6)); t.position.set(-1.1, 0.38, s * 0.33); g.add(t);
    for (const fx of [-0.7, 0.7]) caixa(g, fx, 0.13, s * 0.42, 0.42, 0.26, 0.1, 0x16181b);
  }
  return { g, comp: 2.4 };
}

// bonde/ônibus de dois andares: corpo em duas cores, faixa de janelas que acende
export function doisAndares({ comp = 6, cor = 0x2f7d5b, cor2 = 0xf1ead7, alt = 2.4, bonde = true } = {}) {
  const g = new THREE.Group();
  caixa(g, 0, 0.62, 0, comp, 0.9, 1.25, cor);
  caixa(g, 0, 1.55, 0, comp, 0.95, 1.25, cor2);
  caixa(g, 0, alt - 0.1, 0, comp - 0.2, 0.2, 1.15, bonde ? 0x6f7470 : cor);
  for (const y of [1.0, 1.75]) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(comp - 0.5, 0.42, 1.27), luz(0xfff0c2, 0.9));
    j.position.set(0, y, 0); g.add(j);
  }
  if (bonde) { caixa(g, 0, alt + 0.25, 0, 0.05, 0.5, 0.05, 0x222222); caixa(g, 0, alt + 0.5, 0, 0.9, 0.04, 0.05, 0x222222); }
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.2), luz(0xfff4d6, 1.6)); f.position.set(comp / 2, 0.45, s * 0.42); g.add(f);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.2), luz(0xff2a1a, 1.6)); t.position.set(-comp / 2, 0.45, s * 0.42); g.add(t);
  }
  return { g, comp: comp + 0.4 };
}

// trem de praia (dois vagões verde e creme, pantógrafo)
export function trem() {
  const g = new THREE.Group();
  for (const k of [-1, 1]) {
    const x = k * 3.7;
    caixa(g, x, 0.75, 0, 7.2, 0.8, 1.35, 0x2f6e4e);
    caixa(g, x, 1.45, 0, 7.2, 0.6, 1.35, 0xe9dcb8);
    caixa(g, x, 1.85, 0, 7.0, 0.2, 1.25, 0x5d6e66);
    const j = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.42, 1.37), luz(0xfff0c2, 0.8)); j.position.set(x, 1.42, 0); g.add(j);
    caixa(g, x, 0.25, 0, 6.6, 0.25, 1.0, 0x1d1f22);
  }
  caixa(g, 0.8, 2.2, 0, 0.05, 0.5, 0.05, 0x222222); caixa(g, 0.8, 2.45, 0, 1.0, 0.04, 0.05, 0x222222);
  return { g, comp: 15 };
}

export function balsa() {
  const g = new THREE.Group();
  caixa(g, 0, 0.3, 0, 7, 0.7, 2.4, 0x23314a);
  caixa(g, 0.3, 1.05, 0, 5, 0.8, 2.0, 0xf3f1ea);
  caixa(g, 0.6, 1.7, 0, 2.5, 0.5, 1.6, 0xf3f1ea);
  const j = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 2.04), luz(0xfff0c2, 1)); j.position.set(0.3, 1.1, 0); g.add(j);
  return { g, comp: 7 };
}

export function veleiro() {
  const g = new THREE.Group();
  caixa(g, 0, 0.18, 0, 2.4, 0.36, 0.8, 0xf4f1ea);
  caixa(g, 0.2, 2.0, 0, 0.06, 3.6, 0.06, 0x3a3a3a);
  const vela = new THREE.BufferGeometry();
  vela.setAttribute('position', new THREE.Float32BufferAttribute([0.2, 0.5, 0, 0.2, 3.7, 0, -1.1, 0.55, 0, 0.3, 0.5, 0, 1.3, 0.5, 0, 0.3, 3.3, 0], 3));
  vela.computeVertexNormals();
  const m = new THREE.Mesh(vela, new THREE.MeshLambertMaterial({ color: 0xfff6e8, side: THREE.DoubleSide }));
  m.castShadow = true; g.add(m);
  return { g, comp: 3 };
}

// ── trajeto com paradas: veículos andam por uma polilinha, param no sinal e não encostam no da frente ──
export class Via {
  constructor(pts, { y = () => 0, laco = false } = {}) {
    this.pts = pts.map(([x, z]) => new THREE.Vector2(x, z));
    this.y = y; this.laco = laco;
    this.acum = [0];
    for (let i = 1; i < this.pts.length; i++) this.acum.push(this.acum[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.L = this.acum[this.acum.length - 1];
    this.paradas = [];   // { s, aberta: () => bool }
    this.carros = [];
  }
  ponto(s) {
    s = Math.max(0, Math.min(this.L, s));
    let i = 1; while (i < this.acum.length - 1 && this.acum[i] < s) i++;
    const a = this.pts[i - 1], b = this.pts[i], u = (s - this.acum[i - 1]) / ((this.acum[i] - this.acum[i - 1]) || 1);
    const x = a.x + (b.x - a.x) * u, z = a.y + (b.y - a.y) * u;
    return { x, z, ang: Math.atan2(-(b.y - a.y), b.x - a.x) };
  }
  // v: velocidade de cruzeiro; espera: segundos fora de cena antes de voltar
  por(veic, { v = 4, s = 0, espera = [1, 6] } = {}) {
    const c = { ...veic, s, v, vel: v, espera, fora: 0 };
    this.carros.push(c); veic.g.visible = true;
    return c;
  }
  passo(dt) {
    const ord = [...this.carros].sort((a, b) => b.s - a.s);
    ord.forEach((c, k) => {
      if (c.fora > 0) { c.fora -= dt; c.g.visible = false; if (c.fora <= 0) { c.s = 0; c.g.visible = true; } return; }
      let alvo = c.v;
      const frente = ord.slice(0, k).find(o => o.fora <= 0 && o.s > c.s);
      if (frente) { const gap = frente.s - frente.comp / 2 - (c.s + c.comp / 2); if (gap < 3) alvo = Math.min(alvo, Math.max(0, gap - 0.8) * 1.5); }
      for (const p of this.paradas) {
        const d = p.s - (c.s + c.comp / 2);
        if (d > -0.2 && d < 8 && !p.aberta()) alvo = Math.min(alvo, Math.max(0, d - 0.3) * 1.2);
      }
      c.vel += (alvo - c.vel) * Math.min(1, dt * (alvo < c.vel ? 4 : 1.2));
      c.s += c.vel * dt;
      if (c.s > this.L) { if (this.laco) c.s -= this.L; else { c.fora = c.espera[0] + Math.random() * (c.espera[1] - c.espera[0]); return; } }
      const p = this.ponto(c.s);
      c.g.position.set(p.x, this.y(p.x, p.z), p.z);
      c.g.rotation.y = p.ang;
    });
  }
}
