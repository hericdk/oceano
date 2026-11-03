// Gera o boneco.vrm (VRM 1.0, escrito à mão, sem dependências): node simulador/avatares/boneco-3d/gerar.mjs
// Peças rígidas presas nos ossos, mechas com molas e rosto com formas para boca, olhos e emoções.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), 'boneco.vrm');
const COR = { pele: [0.98, 0.78, 0.62], escuro: [0.07, 0.07, 0.13], cabelo: [0.05, 0.22, 0.75], roupa: [0.94, 0.94, 0.96], acento: [0.95, 0.06, 0.27], sapato: [0.1, 0.1, 0.16] };
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const box = (x, y, z, sx, sy, sz) => {
  const p = [], i = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) p.push(x + (a * sx) / 2, y + (b * sy) / 2, z + (c * sz) / 2);
  i.push(0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3);
  return { p, i };
};
const bola = (x, y, z, rx, ry, rz, lat = 6, lon = 8) => {
  const p = [], i = [];
  for (let a = 0; a <= lat; a++) for (let b = 0; b <= lon; b++) {
    const t = (a / lat) * Math.PI, f = (b / lon) * Math.PI * 2;
    p.push(x + rx * Math.sin(t) * Math.sin(f), y + ry * Math.cos(t), z + rz * Math.sin(t) * Math.cos(f));
  }
  for (let a = 0; a < lat; a++) for (let b = 0; b < lon; b++) {
    const q = a * (lon + 1) + b, w = q + lon + 1;
    if (a) i.push(q, w, q + 1);
    if (a < lat - 1) i.push(q + 1, w, w + 1);
  }
  return { p, i };
};
const junta = (...g) => { const p = [], i = []; for (const s of g) { const n = p.length / 3; p.push(...s.p); i.push(...s.i.map((v) => v + n)); } return { p, i }; };

// ---------- escrita do GLB ----------
const partes = []; let tamanho = 0; const views = [], accessors = [];
function acc(tipo, arr, comp, extra = {}) {
  const u = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength), pad = (4 - (u.length % 4)) % 4;
  views.push({ buffer: 0, byteOffset: tamanho, byteLength: u.length });
  partes.push(u); if (pad) partes.push(new Uint8Array(pad)); tamanho += u.length + pad;
  accessors.push({ bufferView: views.length - 1, componentType: comp, count: arr.length / (tipo === 'VEC3' ? 3 : 1), type: tipo, ...extra });
  return accessors.length - 1;
}
const posicoes = (p) => { const a = new Float32Array(p), mn = [9e9, 9e9, 9e9], mx = [-9e9, -9e9, -9e9]; a.forEach((v, i) => { mn[i % 3] = Math.min(mn[i % 3], v); mx[i % 3] = Math.max(mx[i % 3], v); }); return acc('VEC3', a, 5126, { min: mn, max: mx }); };

const materials = [], matIdx = {};
for (const [k, c] of Object.entries(COR)) { matIdx[k] = materials.length; materials.push({ name: k, pbrMetallicRoughness: { baseColorFactor: [...c.map(lin), 1], metallicFactor: 0, roughnessFactor: 1 } }); }
const meshes = [], nodes = [];
const malha = (nome, cor, g, alvos, nomesAlvos) => {
  const prim = { attributes: { POSITION: posicoes(g.p) }, indices: acc('SCALAR', new Uint16Array(g.i), 5123), material: matIdx[cor] };
  const m = { name: nome, primitives: [prim] };
  if (alvos) { prim.targets = alvos.map((d) => ({ POSITION: posicoes(d) })); m.extras = { targetNames: nomesAlvos }; m.weights = alvos.map(() => 0); }
  meshes.push(m);
  return meshes.length - 1;
};
const no = (name, translation, children = [], mesh) => { nodes.push({ name, translation, ...(children.length ? { children } : {}), ...(mesh !== undefined ? { mesh } : {}) }); return nodes.length - 1; };

// ---------- rosto, com formas ----------
// cada forma move vértices do rosto (posição relativa ao osso da cabeça: olhos em z positivo)
const Y = 0.2, Z = 0.2, olhoY = Y + 0.02, bocaY = Y - 0.085;
const olhoE = box(-0.085, olhoY, Z + 0.018, 0.035, 0.07, 0.012), olhoD = box(0.085, olhoY, Z + 0.018, 0.035, 0.07, 0.012);
const boca = box(0, bocaY, Z + 0.004, 0.06, 0.014, 0.012);
const sobE = box(-0.085, olhoY + 0.07, Z + 0.012, 0.06, 0.012, 0.012), sobD = box(0.085, olhoY + 0.07, Z + 0.012, 0.06, 0.012, 0.012);
const rosto = junta(olhoE, olhoD, boca, sobE, sobD);
const N = rosto.p.length, zero = () => new Array(N).fill(0);
const sel = { olhoE: [0, 8], olhoD: [8, 16], boca: [16, 24], sobE: [24, 32], sobD: [32, 40] };
const forma = (fn) => { const d = zero(); for (const [k, [a, b]] of Object.entries(sel)) for (let v = a; v < b; v++) { const [dx, dy, dz] = fn(k, rosto.p[3 * v], rosto.p[3 * v + 1], rosto.p[3 * v + 2]) || [0, 0, 0]; d[3 * v] = dx; d[3 * v + 1] = dy; d[3 * v + 2] = dz; } return d; };
const abreBoca = (w, h) => forma((k, x, y) => (k === 'boca' ? [Math.sign(x) * w, (y - bocaY > 0 ? 1 : -1) * h, 0] : null));
const fechaOlho = (qual) => forma((k, x, y) => (qual.includes(k) ? [0, olhoY - y + (y > olhoY ? -0.006 : 0.006), 0] : null));
const sobrancelha = (dy, inclina) => forma((k, x) => (k === 'sobE' || k === 'sobD' ? [0, dy + (k === 'sobE' ? x + 0.085 : -(x - 0.085)) * inclina, 0] : null));
const soma = (...ds) => ds[0].map((_, i) => ds.reduce((s, d) => s + d[i], 0));
const FORMAS = {
  aa: abreBoca(0.0, 0.03), ih: abreBoca(0.022, 0.006), ou: abreBoca(-0.018, 0.02), ee: abreBoca(0.015, 0.014), oh: abreBoca(-0.008, 0.026),
  blink: fechaOlho(['olhoE', 'olhoD']), blinkLeft: fechaOlho(['olhoE']), blinkRight: fechaOlho(['olhoD']),
  happy: soma(abreBoca(0.02, 0.012), sobrancelha(0.012, 0)), sad: soma(abreBoca(-0.01, 0), sobrancelha(-0.006, 0.45)), angry: soma(abreBoca(-0.012, 0.002), sobrancelha(-0.018, -0.5)),
  relaxed: soma(abreBoca(0.012, 0), fechaOlho(['olhoE', 'olhoD']).map((v) => v * 0.45)), surprised: soma(abreBoca(-0.012, 0.03), sobrancelha(0.028, 0)),
};
const nomesFormas = Object.keys(FORMAS);
const noRosto = no('Rosto', [0, 0, 0], [], malha('Rosto', 'escuro', rosto, Object.values(FORMAS), nomesFormas));

// ---------- corpo ----------
const peca = (nome, t, cor, g) => no(nome, t, [], malha(nome, cor, g));
const mechas = [], fazerMecha = (nome, x, y, z, seg, compr, larg) => {
  let filho = no(`${nome} fim`, [0, -compr, 0]);
  const ids = [filho];
  for (let s = seg - 1; s >= 0; s--) {
    const pecaM = peca(`${nome} ${s} peça`, [0, 0, 0], 'cabelo', box(0, -compr / 2, 0, larg * (1 - s * 0.16), compr * 1.06, larg * 0.7));
    filho = no(`${nome} ${s}`, s === 0 ? [x, y, z] : [0, -compr, 0], [pecaM, filho]);
    ids.unshift(filho);
  }
  mechas.push({ name: nome, ids });
  return filho;
};
const cabelos = [fazerMecha('Mecha A', -0.17, 0.3, -0.13, 3, 0.1, 0.1), fazerMecha('Mecha B', 0, 0.32, -0.21, 3, 0.11, 0.13), fazerMecha('Mecha C', 0.17, 0.3, -0.13, 3, 0.1, 0.1), fazerMecha('Franja E', -0.2, 0.26, 0.09, 2, 0.08, 0.06), fazerMecha('Franja D', 0.2, 0.26, 0.09, 2, 0.08, 0.06)];
const cabeca = no('head', [0, 0.06, 0], [noRosto, peca('Crânio', [0, 0, 0], 'pele', bola(0, Y, 0, 0.23, 0.22, 0.22)), peca('Cabelo', [0, 0, 0], 'cabelo', junta(bola(0, Y + 0.075, -0.03, 0.245, 0.185, 0.235), box(0, Y + 0.21, 0.13, 0.26, 0.05, 0.1))), ...cabelos]);
const pescoco = no('neck', [0, 0.14, 0], [cabeca, peca('Pescoço', [0, 0, 0], 'pele', box(0, 0.03, 0, 0.08, 0.08, 0.08))]);
const braco = (l, s) => {
  const mao = no(`${l}Hand`, [s * 0.19, 0, 0], [peca(`Mão ${l}`, [0, 0, 0], 'pele', bola(s * 0.03, 0, 0, 0.042, 0.042, 0.042, 4, 6))]);
  const ante = no(`${l}LowerArm`, [s * 0.19, 0, 0], [mao, peca(`Antebraço ${l}`, [0, 0, 0], 'pele', box((s * 0.19) / 2, 0, 0, 0.19, 0.05, 0.05))]);
  return no(`${l}UpperArm`, [s * 0.12, 0.1, 0], [ante, peca(`Braço ${l}`, [0, 0, 0], 'roupa', box((s * 0.19) / 2, 0, 0, 0.19, 0.07, 0.07))]);
};
const bE = braco('left', 1), bD = braco('right', -1); // o lado esquerdo do boneco fica em +X (ele olha para +Z)
const peito = no('chest', [0, 0.1, 0], [pescoco, bE, bD, peca('Peito', [0, 0, 0], 'roupa', box(0, 0.05, 0, 0.26, 0.21, 0.16)), peca('Lenço', [0, 0, 0], 'acento', box(0, 0.145, 0.015, 0.15, 0.035, 0.15))]);
const coluna = no('spine', [0, 0.07, 0], [peito, peca('Barriga', [0, 0, 0], 'roupa', box(0, 0.04, 0, 0.22, 0.1, 0.14))]);
const perna = (l, s) => {
  const pe = no(`${l}Foot`, [0, -0.2, 0], [peca(`Pé ${l}`, [0, 0, 0], 'sapato', box(0, -0.03, 0.03, 0.09, 0.06, 0.15))]);
  const baixo = no(`${l}LowerLeg`, [0, -0.2, 0], [pe, peca(`Canela ${l}`, [0, 0, 0], 'escuro', box(0, -0.1, 0, 0.07, 0.2, 0.07))]);
  return no(`${l}UpperLeg`, [s * 0.07, -0.02, 0], [baixo, peca(`Coxa ${l}`, [0, 0, 0], 'escuro', box(0, -0.1, 0, 0.09, 0.2, 0.09))]);
};
const pE = perna('left', 1), pD = perna('right', -1);
const quadril = no('hips', [0, 0.47, 0], [coluna, pE, pD, peca('Quadril', [0, 0, 0], 'escuro', box(0, 0, 0, 0.21, 0.09, 0.14))]);
const raiz = no('Boneco 3D', [0, 0, 0], [quadril]);

const humanBones = {};
for (const n of ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot']) humanBones[n] = { node: nodes.findIndex((x) => x.name === n) };
const preset = {};
for (const n of nomesFormas) preset[n] = { morphTargetBinds: [{ node: noRosto, index: nomesFormas.indexOf(n), weight: 1 }], isBinary: false, overrideBlink: 'none', overrideLookAt: 'none', overrideMouth: 'none' };

const json = {
  asset: { version: '2.0', generator: 'Oceano boneco-3d' }, scene: 0, scenes: [{ name: 'Boneco 3D', nodes: [raiz] }], nodes, meshes, materials,
  extensionsUsed: ['VRMC_vrm', 'VRMC_springBone'],
  extensions: {
    VRMC_vrm: {
      specVersion: '1.0',
      meta: { name: 'Boneco 3D', version: '1.0', authors: ['hericdk'], licenseUrl: 'https://vrm.dev/licenses/1.0/', otherLicenseUrl: 'https://www.gnu.org/licenses/gpl-3.0.html', avatarPermission: 'everyone', allowExcessivelyViolentUsage: false, allowExcessivelySexualUsage: false, commercialUsage: 'corporation', allowPoliticalOrReligiousUsage: false, allowAntisocialOrHateUsage: false, creditNotation: 'required', allowRedistribution: true, modification: 'allowModificationRedistribution' },
      humanoid: { humanBones },
      expressions: { preset },
    },
    VRMC_springBone: {
      specVersion: '1.0',
      springs: mechas.map((m) => ({ name: m.name, joints: m.ids.map((node) => ({ node, hitRadius: 0.02, stiffness: 1.1, gravityPower: 0.35, gravityDir: [0, -1, 0], dragForce: 0.32 })) })),
    },
  },
  accessors, bufferViews: views, buffers: [{ byteLength: tamanho }],
};
const js = Buffer.from(JSON.stringify(json)), jl = (js.length + 3) & ~3, glb = Buffer.alloc(12 + 8 + jl + 8 + tamanho, 0);
glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8); glb.writeUInt32LE(jl, 12); glb.writeUInt32LE(0x4e4f534a, 16);
glb.fill(0x20, 20, 20 + jl); js.copy(glb, 20);
glb.writeUInt32LE(tamanho, 20 + jl); glb.writeUInt32LE(0x004e4942, 24 + jl);
let at = 28 + jl; for (const p of partes) { Buffer.from(p.buffer, p.byteOffset, p.byteLength).copy(glb, at); at += p.length; }
writeFileSync(out, glb);
console.log('boneco.vrm', glb.length, 'bytes,', nodes.length, 'nós,', meshes.length, 'malhas');
