// Ilha — vilas low poly: ruas em Y a partir de uma praça, casas dos dois lados viradas para a rua,
// telhados variados (duas águas, quatro águas, pirâmide, em L — o catálogo de telhados das referências),
// janelas e porta na fachada. Casa de agente trabalhando = cor de destaque (padrões em skills/mundo-3d).
import * as THREE from '../../vendor/three.module.min.js';
import { COR } from './mundo.js';

const TIPOS = ['duasAguas', 'quatroAguas', 'piramide', 'emL', 'duasAguas', 'quatroAguas'];

// acumulador de triângulos com cor (flat shading: normais por face)
function malha() {
  const pos = [], cor = [], c = new THREE.Color();
  return {
    pos, cor,
    tri(a, b, d, hex) { c.setHex(hex); for (const p of [a, b, d]) { pos.push(p.x, p.y, p.z); cor.push(c.r, c.g, c.b); } },
    quad(a, b, d, e, hex) { this.tri(a, b, d, hex); this.tri(a, d, e, hex); },
    geometria() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
      g.computeVertexNormals();
      return g;
    },
  };
}

// uma casa: paredes, janelas, porta e telhado, no espaço local (frente = +z) e depois girada/posicionada
function casa(m, { x, y, z, ang, w, d, h, tipo, telhado, parede, janela = COR.janela }) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx, ly, lz) => new THREE.Vector3(x + lx * ca + lz * sa, y + ly, z - lx * sa + lz * ca);
  const hw = w / 2, hd = d / 2;
  const v = [P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, 0, hd), P(-hw, 0, hd), P(-hw, h, -hd), P(hw, h, -hd), P(hw, h, hd), P(-hw, h, hd)];
  m.quad(v[3], v[2], v[6], v[7], parede);            // frente
  m.quad(v[1], v[0], v[4], v[5], COR.paredeSombra);  // fundo
  m.quad(v[2], v[1], v[5], v[6], parede);            // lado
  m.quad(v[0], v[3], v[7], v[4], COR.paredeSombra);  // lado
  // fachada: porta e janelas (quadros um tico à frente da parede)
  const f = 0.02;
  m.quad(P(-0.22, 0, hd + f), P(0.22, 0, hd + f), P(0.22, 0.95, hd + f), P(-0.22, 0.95, hd + f), COR.porta);
  for (const jx of w > 2.4 ? [-hw * 0.6, hw * 0.6] : [hw * 0.55]) {
    m.quad(P(jx - 0.18, h * 0.5, hd + f), P(jx + 0.18, h * 0.5, hd + f), P(jx + 0.18, h * 0.5 + 0.38, hd + f), P(jx - 0.18, h * 0.5 + 0.38, hd + f), janela);
  }
  for (const jz of [-hd * 0.4, hd * 0.4]) {
    m.quad(P(hw + f, h * 0.5, jz + 0.18), P(hw + f, h * 0.5, jz - 0.18), P(hw + f, h * 0.5 + 0.36, jz - 0.18), P(hw + f, h * 0.5 + 0.36, jz + 0.18), janela);
  }
  // telhado (um pouco maior que a casa: beiral)
  const b = 0.18, rh = Math.min(w, d) * 0.55, tw = hw + b, td = hd + b;
  const T = (lx, ly, lz) => P(lx, h + ly, lz);
  if (tipo === 'piramide') {
    const topo = T(0, rh * 1.1, 0);
    m.tri(T(-tw, 0, td), T(tw, 0, td), topo, telhado);
    m.tri(T(tw, 0, td), T(tw, 0, -td), topo, telhado);
    m.tri(T(tw, 0, -td), T(-tw, 0, -td), topo, telhado);
    m.tri(T(-tw, 0, -td), T(-tw, 0, td), topo, telhado);
  } else if (tipo === 'quatroAguas') {
    const k = Math.max(0, tw - td) ;
    const a1 = T(-k, rh, 0), a2 = T(k, rh, 0);
    m.quad(T(-tw, 0, td), T(tw, 0, td), a2, a1, telhado);
    m.quad(T(tw, 0, -td), T(-tw, 0, -td), a1, a2, telhado);
    m.tri(T(tw, 0, td), T(tw, 0, -td), a2, telhado);
    m.tri(T(-tw, 0, -td), T(-tw, 0, td), a1, telhado);
  } else {
    // duas águas (cumeeira no comprimento) — também a base do "em L"
    const a1 = T(-tw, rh, 0), a2 = T(tw, rh, 0);
    m.quad(T(-tw, 0, td), T(tw, 0, td), a2, a1, telhado);
    m.quad(T(tw, 0, -td), T(-tw, 0, -td), a1, a2, telhado);
    m.tri(P(-hw, h, hd), P(-hw, h + rh, 0), P(-hw, h, -hd), parede);   // oitão
    m.tri(P(hw, h, -hd), P(hw, h + rh, 0), P(hw, h, hd), parede);
    if (tipo === 'emL') casa(m, { x: x + (-hw + d * 0.35) * ca + (hd + w * 0.3) * sa, y, z: z - (-hw + d * 0.35) * sa + (hd + w * 0.3) * ca, ang: ang + Math.PI / 2, w: w * 0.6, d: d * 0.75, h: h * 0.9, tipo: 'duasAguas', telhado, parede, janela });
  }
}

function torre(m, x, y, z, telhado) {
  const lados = 8, R = 1.6, h = 9;
  const ponto = (k, raio, yy) => new THREE.Vector3(x + Math.cos(k / lados * Math.PI * 2) * raio, y + yy, z + Math.sin(k / lados * Math.PI * 2) * raio);
  for (let k = 0; k < lados; k++) {
    m.quad(ponto(k, R, 0), ponto(k + 1, R, 0), ponto(k + 1, R, h), ponto(k, R, h), k % 2 ? COR.parede : COR.paredeSombra);
    m.tri(ponto(k, R + 0.3, h), ponto(k + 1, R + 0.3, h), new THREE.Vector3(x, y + h + 4.5, z), telhado);
    if (k % 2 === 0) m.quad(ponto(k + 0.4, R + 0.02, h * 0.6), ponto(k + 0.6, R + 0.02, h * 0.6), ponto(k + 0.6, R + 0.02, h * 0.6 + 0.8), ponto(k + 0.4, R + 0.02, h * 0.6 + 0.8), COR.janela);
  }
}

// O Castelo da Kara, nas cores dela: muralha clara, telhados azul-marinho, pontas douradas e bandeiras coral.
// É sempre a construção mais alta e mais exagerada da ilha.
function castelo(m, x, y, z) {
  const PAREDE = 0xf2e7d2, SOMBRA = 0xd8c9ad, AZUL = 0x1f3f8f, OURO = 0xffc93c, CORAL = 0xf0705a, V = (a, b, c) => new THREE.Vector3(a, b, c);
  const anel = (cx, cz, R, y0, h, lados, cor1 = PAREDE, cor2 = SOMBRA) => {
    const p = (k, yy, r = R) => V(cx + Math.cos(k / lados * Math.PI * 2) * r, yy, cz + Math.sin(k / lados * Math.PI * 2) * r);
    for (let k = 0; k < lados; k++) m.quad(p(k + 1, y0), p(k, y0), p(k, y0 + h), p(k + 1, y0 + h), k % 2 ? cor1 : cor2);
  };
  const ameias = (cx, cz, R, yy, n) => { for (let k = 0; k < n; k += 2) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2, p = (t, h) => V(cx + Math.cos(t) * R, yy + h, cz + Math.sin(t) * R); m.quad(p(b, 0), p(a, 0), p(a, 0.8), p(b, 0.8), PAREDE); } };
  const ponta = (cx, cz, R, yy, alt, cor = AZUL) => {
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, b = (k + 1) / 8 * Math.PI * 2; m.tri(V(cx + Math.cos(b) * R, yy, cz + Math.sin(b) * R), V(cx + Math.cos(a) * R, yy, cz + Math.sin(a) * R), V(cx, yy + alt, cz), cor); }
    const t = yy + alt, s = R * 0.09;
    m.tri(V(cx - s, t - 0.5, cz), V(cx + s, t - 0.5, cz), V(cx, t + 1, cz), OURO);
    m.quad(V(cx, t + 0.2, cz), V(cx + R * 0.55, t + 0.35, cz), V(cx + R * 0.55, t + 0.85, cz), V(cx, t + 1, cz), CORAL);   // bandeira
  };
  const torreC = (cx, cz, R, h, alt) => { anel(cx, cz, R, y - 0.5, h, 8); anel(cx, cz, R + 0.35, y + h - 0.6, 1, 8, OURO, OURO); ponta(cx, cz, R + 0.5, y + h + 0.3, alt); };
  // muralha com ameias e torres nos cantos
  anel(x, z, 12, y - 0.5, 5, 8); ameias(x, z, 12, y + 4.5, 32);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; torreC(x + Math.cos(a) * 12, z + Math.sin(a) * 12, 1.9, 9 + (k % 2) * 3, 6); }
  // corpo, torres médias e a torre mais alta, a da Kara
  anel(x, z, 6.5, y - 0.5, 14); anel(x, z, 6.9, y + 13, 1, 8, OURO, OURO); ameias(x, z, 6.9, y + 14, 24);
  for (let k = 0; k < 4; k++) { const a = (k + 0.5) / 4 * Math.PI * 2; torreC(x + Math.cos(a) * 6.5, z + Math.sin(a) * 6.5, 1.5, 20, 7); }
  torreC(x, z, 3, 32, 15);
}

// monta todas as vilas; devolve a malha de casas, a de ruas e, por vila, as casas (para destaque e bonecos)
export function montarVilas(mundo, { destaque = 0x0040ff } = {}) {
  const { vilas, altura, r } = mundo;
  const m = malha(), ruas = malha();
  for (const v of vilas) {
    if (v.castelo) { castelo(m, v.x, v.h, v.z); v.praca = v.castelo.raio; continue; }
    const nCasas = v.central ? 10 : Math.min(28, 5 + v.agentes.length * 2);
    const telhado = r.escolher(COR.telhados);
    const ruasAng = Array.from({ length: v.central ? 4 : (nCasas > 14 ? 3 : 2) }, (_, k) => k / (v.central ? 4 : (nCasas > 14 ? 3 : 2)) * Math.PI * 2 + r.entre(-0.4, 0.4));
    const comp = 13 + Math.sqrt(nCasas) * 3.2;   // a praça (raio ~9) fica livre para os prédios de função
    // ruas de terra batida saindo da praça
    for (const a of ruasAng) {
      const passos = 10;
      for (let s = 0; s < passos; s++) {
        const t0 = s / passos * comp, t1 = (s + 1) / passos * comp, lw = 0.9;
        const p = t => new THREE.Vector3(v.x + Math.cos(a) * t, 0, v.z + Math.sin(a) * t);
        const n = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(lw);
        const A = p(t0).add(n), B = p(t1).add(n), C = p(t1).sub(n), D = p(t0).sub(n);
        for (const q of [A, B, C, D]) q.y = altura(q.x, q.z) + 0.1;
        ruas.quad(A, B, C, D, COR.caminho);
      }
    }
    if (v.central) torre(m, v.x, altura(v.x, v.z) - 0.2, v.z, COR.telhados[0]);
    v.praca = 9;
    // casas: dos dois lados de cada rua, viradas para ela
    let k = 0;
    for (let s = 0; k < nCasas && s < 40; s++) {
      const a = ruasAng[s % ruasAng.length], lado = (Math.floor(s / ruasAng.length) % 2) ? 1 : -1;
      const t = 10.5 + Math.floor(s / (ruasAng.length * 2)) * 3.6 + r.entre(-0.3, 0.3);
      if (t > comp) continue;
      const off = lado * r.entre(2.4, 3.2);
      const x = v.x + Math.cos(a) * t - Math.sin(a) * off, z = v.z + Math.sin(a) * t + Math.cos(a) * off;
      const y = altura(x, z) - 0.15;
      const agente = v.agentes[k] || null;
      const trabalhando = agente && agente.atividade && Date.now() - agente.atividade < 10 * 60 * 1000;
      // casa com conversa: janelas acesas (mais quentes se falou nas últimas 24 h); trabalhando agora = cor de destaque
      const recente = agente && agente.atividade && Date.now() - agente.atividade < 24 * 3600 * 1000;
      const janela = !agente ? COR.janela : recente ? 0xffc24a : 0xf3e3b0;
      const dims = { w: r.entre(2.0, 3.4), d: r.entre(1.8, 2.6), h: r.entre(1.5, 2.3) };
      casa(m, { x, y, z, ang: -a + (lado > 0 ? 0 : Math.PI), ...dims, tipo: r.escolher(TIPOS), telhado: trabalhando ? destaque : telhado, parede: trabalhando ? destaque : COR.parede, janela });
      v.casas.push({ x, y, z, agente, trabalhando, recente });
      k++;
    }
    v.ruasAng = ruasAng; v.comp = comp;
  }
  return { casas: m.geometria(), ruas: ruas.geometria() };
}

// caminhos entre vilas e rios: fitas sobre o terreno
export function fitas(pontosLista, largura, hex, altura, elevar = 0.12) {
  const m = malha();
  for (const pts of pontosLista) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
      const lw = typeof largura === 'function' ? largura(i / pts.length) : largura;
      const nx = -dz / L * lw, nz = dx / L * lw;
      const P = (x, z) => new THREE.Vector3(x, altura(x, z) + elevar, z);
      m.quad(P(a.x + nx, a.z + nz), P(b.x + nx, b.z + nz), P(b.x - nx, b.z - nz), P(a.x - nx, a.z - nz), hex);
    }
  }
  return m.geometria();
}
