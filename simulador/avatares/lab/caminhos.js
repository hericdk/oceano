// Lab: a Kara em vários caminhos, com o mesmo roteiro de movimento, medindo o custo de cada um.
//  - Pontos (malha 2D do Mesh Avatar Studio): a ilustração deformada por elipses e linhas (olhos, boca, cabeça,
//    mechas). Três densidades da mesma malha: densa (a padrão), leve e mínima.
//  - Pixel desenhado: o pixel art feito à mão, preso na grade de 6 px, com os mesmos pontos.
import { openAvatar, createMeshAvatar } from '../../vendor/mesh-avatar/mesh-avatar.js';

// ---------- contadores: triângulos enviados e tempo ----------
let tris = 0;
for (const P of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
  const de = P.drawElements, da = P.drawArrays;
  P.drawElements = function (modo, n, ...r) { tris += modo === 4 ? n / 3 : modo === 5 ? n - 2 : 0; return de.call(this, modo, n, ...r); };
  P.drawArrays = function (modo, p, n) { tris += modo === 4 ? n / 3 : modo === 5 ? n - 2 : 0; return da.call(this, modo, p, n); };
}
const pegar = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (tipo, o) { const c = pegar.call(this, tipo, o); if (/webgl/.test(tipo)) this._gl = c; return c; };

// ---------- o roteiro (igual para todos) ----------
function roteiro(t) {
  const ciclo = t % 12, giro = ciclo > 9 ? (ciclo - 9) / 3 * 360 : 0;   // nos últimos 3 s, uma volta inteira (só 3D e vistas)
  const piscar = (t % 3.2) < 0.13 ? 0 : 1;
  const fala = ciclo > 4 && ciclo < 8 ? Math.abs(Math.sin(t * 11)) * 0.8 : 0;
  return { yaw: Math.sin(t * 0.8) * 25, pitch: Math.sin(t * 0.5) * 6, roll: Math.sin(t * 0.6) * 4, piscar, fala, giro };
}

const LADO = 160;   // a tela onde cada caminho desenha (a Navegadora usa 120)
const grade = document.getElementById('grade');
const caminhos = [];

function cartao(nome, nota) {
  const el = document.createElement('section'); el.className = 'card';
  el.innerHTML = `<h2>${nome}</h2><canvas class="vista" width="${LADO}" height="${LADO}"></canvas>
    <dl><dt>ms por quadro</dt><dd data-ms>…</dd><dt>triângulos</dt><dd data-tri>…</dd><dt>baixado</dt><dd data-kb>…</dd><dt>vértices na malha</dt><dd data-vert>—</dd></dl><small>${nota}</small>`;
  grade.append(el);
  return el;
}
const kb = n => n > 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.round(n / 1024) + ' KB';
function baixado(prefixos) {
  return performance.getEntriesByType('resource').filter(r => prefixos.some(p => r.name.includes(p)))
    .reduce((s, r) => s + (r.encodedBodySize || r.transferSize || 0), 0);
}

// ---------- pontos (malha 2D) ----------
async function pontos(nome, pasta, escala, nota, lado = LADO, nitido = false) {
  const el = cartao(nome, nota), vis = el.querySelector('canvas');
  vis.width = vis.height = lado;
  const pkg = await openAvatar(pasta);
  const rig = structuredClone(pkg.rig), m = rig.mesh;
  m.baseCell = Math.round(m.baseCell * escala); m.fine = { ...m.fine, cell: Math.round(m.fine.cell * escala) };
  for (const k of ['handCell', 'tasselCell', 'eyeBallCell', 'eyeCell', 'spriteCell']) if (m[k]) m[k] = Math.max(2, Math.round(m[k] * Math.sqrt(escala)));
  const oculta = document.createElement('canvas'); oculta.className = 'oculta';
  const dpr = devicePixelRatio || 1; oculta.style.width = oculta.style.height = lado / dpr + 'px';
  document.body.append(oculta);
  const av = await createMeshAvatar(oculta, { rig, assets: pkg.assets, manual: true });
  av.setAutoIdle(false);
  const x = vis.getContext('2d');
  return {
    el, nome, prefixos: [pasta.replace('../', 'avatares/') + 'rig', pasta.replace('../', 'avatares/') + 'built', pasta.replace('../', 'avatares/') + 'avatar'],
    quadro(t) {
      const r = roteiro(t);
      av.setParameters({ angleX: r.yaw, angleY: r.pitch, angleZ: r.roll, eyeLOpen: r.piscar, eyeROpen: r.piscar, mouthOpen: r.fala, breath: (Math.sin(t * 1.6) + 1) / 2 }, 1);
      av.advance(1 / 30, 30);
      oculta._gl?.finish();
      x.imageSmoothingEnabled = !nitido; x.clearRect(0, 0, lado, lado); x.drawImage(oculta, 0, 0, lado, lado);
    },
    vertices: () => { const g = rig.mesh; const f = g.fine; return `~${Math.round(((f.x1 - f.x0) / f.cell) * ((f.y1 - f.y0) / f.cell) + (rig.image.width / g.baseCell) * (rig.image.height / g.baseCell))}`; },
  };
}


const montados = await Promise.all([
  pontos('PONTOS · MALHA DENSA', '../cara/', 1, 'A malha padrão do Mesh Avatar Studio (célula de 7 px no rosto).'),
  pontos('PONTOS · MALHA LEVE', '../cara/', 2, 'Mesma Kara e mesmos pontos, células 2× maiores no rosto e no corpo.'),
  pontos('PONTOS · MALHA MÍNIMA', '../cara/', 4, 'Células 4× maiores: o menor número de triângulos que ainda dobra olhos, boca e cabelo.'),
  pontos('PIXEL DESENHADO', '../cara-pixel/', 2, 'Seu pixel art (grade de 6 px, 40 cores dela), animado pelos mesmos pontos e mostrado na grade dele (180 px).', 180, true),
]);
caminhos.push(...montados);

let rodando = true;
document.getElementById('pausar').onclick = e => { rodando = !rodando; e.target.textContent = rodando ? 'pausar' : 'continuar'; };
const tempos = new Map(caminhos.map(c => [c, []])), triangulos = new Map();
const inicio = performance.now();
function laco() {
  requestAnimationFrame(laco);
  if (!rodando) return;
  const t = (performance.now() - inicio) / 1000;
  for (const c of caminhos) {
    const t0 = performance.now(); tris = 0;
    c.quadro(t);
    const ms = performance.now() - t0, lista = tempos.get(c);
    lista.push(ms); if (lista.length > 60) lista.shift();
    triangulos.set(c, tris);
  }
}
requestAnimationFrame(laco);
setInterval(() => {
  for (const c of caminhos) {
    const l = tempos.get(c); if (!l.length) continue;
    c.el.querySelector('[data-ms]').textContent = (l.reduce((a, b) => a + b, 0) / l.length).toFixed(2);
    c.el.querySelector('[data-tri]').textContent = Math.round(triangulos.get(c)).toLocaleString('pt-BR');
    c.el.querySelector('[data-kb]').textContent = kb(baixado(c.prefixos));
    c.el.querySelector('[data-vert]').textContent = c.vertices();
  }
}, 500);
// para os testes lerem os números
window.CAMINHOS = () => caminhos.map(c => { const l = tempos.get(c); return { nome: c.el.querySelector('h2').textContent, ms: +(l.reduce((a, b) => a + b, 0) / (l.length || 1)).toFixed(2), tri: Math.round(triangulos.get(c) || 0), kb: Math.round(baixado(c.prefixos) / 1024), vert: c.vertices() }; });
