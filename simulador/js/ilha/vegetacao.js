// Ilha — vegetação e pedras em pixel: 44 peças num atlas só (vegetacao.png; recortes em vegetacao.json).
// Árvores, arbustos e grama têm 6 quadros de vento; pedras e construções, um só. Cada peça é um cartão que vira para
// a câmera (de lado gira em pé; de cima inclina um pouco, para não achatar), com o pé fincado no chão. As sombras são
// cartões deitados no terreno, em malha de pixel. Duas InstancedMesh (peças e sombras): duas chamadas de desenho.
// A luz do sol e do céu tinge as cores (a noite escurece) e a névoa da distância vale igual ao resto da cena.
// Os desenhos foram gerados neste computador com geradores de pixel art para o Aseprite (de yvzar); só as imagens
// prontas fazem parte do Oceano, o código dos geradores não.
import * as THREE from '../../vendor/three.module.min.js';
import { TAM } from './mundo.js';

const ATLAS = new URL('./vegetacao.png', import.meta.url).href;
const DADOS = new URL('./vegetacao.json', import.meta.url).href;
// tamanho de um pixel do desenho no mundo
const PX = { arvore: 0.034, arbusto: 0.04, grama: 0.034, pedra: 0.036, pedreiro: 0.06 };
// grama curta: um retalho de folhas que acompanha a câmera (densa perto, sem custo longe)
const GRAMA_QTD = 26000, GRAMA_LADO = 90, GRAMA_PX = 0.13;
const FPS = 5;
// até onde cada peça é desenhada (longe, a grama some no terreno e não vale o custo); sombras, ainda menos
const CORTE = { grama: 130, arbusto: 220, arvore: 1e6, pedra: 1e6, pedreiro: 1e6 };
const CORTE_SOMBRA = 90;
// a sombra foi desenhada numa câmera a ~30°: deitada no chão, a altura dela estica
const ESTICA_SOMBRA = 1.9;

// qual árvore combina com o lugar
const OUTONO = /golden_autumn|outono|rosa/;
const NO_ALTO = /spruce|pine|cypress/;
const FRIO = /winter|dead/;
const PRAIA = /palm/;
const COMUM = /verde|escuro|mata|spring|olive|acacia/;
// "plantas 3D": só as árvores do gerador isométrico, as que têm volume; "plantas em pixel" mistura todas
const ISOMETRICAS = { OUTONO: /outono|rosa/, NO_ALTO: /escuro|mata/, FRIO: /mata/, PRAIA: /verde/, COMUM: /verde|escuro|mata/, CASTELO: /rosa|outono/ };
const TODAS = { OUTONO, NO_ALTO, FRIO, PRAIA, COMUM, CASTELO: /rosa|golden_autumn|spring/ };

export async function montarVegetacao(add, mundo, { raioVila = 12, soIsometricas = false } = {}) {
  const especies = soIsometricas ? ISOMETRICAS : TODAS;
  const [dados, tex] = await Promise.all([
    fetch(DADOS).then(r => r.json()),
    new THREE.TextureLoader().loadAsync(ATLAS),
  ]);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  const porTipo = {}; for (const it of dados.itens) (porTipo[it.tipo] ||= []).push(it);
  const pega = (tipo, k, re) => { const l = re ? porTipo[tipo].filter(i => re.test(i.id)) : porTipo[tipo]; return l[Math.abs(k) % l.length]; };
  const { altura, r, vilas } = mundo;
  const distVila = (x, z) => vilas.reduce((m, v) => Math.min(m, Math.hypot(x - v.x, z - v.z)), Infinity);
  const lista = [];   // [x, y, z, item, escala]

  // árvores: os mesmos lugares de antes, com a espécie pelo lugar (praia, alto, frio) e as "de outono" do mundo
  mundo.arvores.forEach((a, k) => {
    if (distVila(a[0], a[2]) < raioVila) return;
    const h = altura(a[0], a[2]), n = k * 7 + 3;
    const it = a[3] ? pega('arvore', n, especies.OUTONO)
      : h > 26 ? pega('arvore', n, (k % 5 === 0) ? especies.FRIO : especies.NO_ALTO)
      : h > 17 && k % 3 === 0 ? pega('arvore', n, especies.NO_ALTO)
      : h < 2.2 && k % 2 === 0 ? pega('arvore', n, especies.PRAIA)
      : pega('arvore', n, especies.COMUM);
    lista.push([a[0], h - 0.05, a[2], it, 0.8 + ((k * 7919) % 100) / 220]);
  });
  // arbustos, grama, pedras e construções espalhados conforme o terreno (com a semente do mundo: a mesma ilha, as mesmas peças)
  const sortear = (n, tipo, aceita, re) => {
    for (let k = 0, tent = 0; k < n && tent < n * 14; tent++) {
      const x = (r() - 0.5) * TAM * 0.96, z = (r() - 0.5) * TAM * 0.96, h = altura(x, z);
      const c = mundo.celulaDe(x, z);
      if (!c || h < 0.8 || !aceita(c.bioma, h, distVila(x, z))) continue;
      lista.push([x, h - 0.03, z, pega(tipo, Math.floor(r() * 64), re), 0.75 + r() * 0.5]); k++;
    }
  };
  const longe = d => d > raioVila;
  // o jardim do castelo: o ambiente mais exagerado da ilha, com as árvores mais bonitas em volta da muralha
  const K = mundo.castelo;
  if (K) for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = K.raio + 3 + r() * 13, x = K.x + Math.cos(a) * d, z = K.z + Math.sin(a) * d;
    lista.push([x, altura(x, z) - 0.05, z, i % 3 === 2 ? pega('arbusto', i, /arbusto-(1|5|6)$/) : pega('arvore', i, especies.CASTELO), 1 + r() * 0.5]);
  }
  sortear(900, 'arbusto', (b, h, d) => (b === 'floresta' || b === 'prado') && longe(d));
  sortear(1800, 'grama', (b, h, d) => (b === 'prado' || b === 'campo' || b === 'floresta') && h < 26 && longe(d));
  sortear(500, 'pedra', (b, h, d) => (b === 'pedra' || (b === 'prado' && h > 18) || b === 'neve') && longe(d));
  // construções de pedra: muretas e torres em volta das vilas; ruínas e pilhas soltas pelo campo
  for (const v of vilas) for (let i = 0; i < 9; i++) {
    const ang = (i + r() * 0.6) / 9 * Math.PI * 2, d = raioVila + 1 + r() * 7, x = v.x + Math.cos(ang) * d, z = v.z + Math.sin(ang) * d, h = altura(x, z);
    if (h < 0.8 || h > 26) continue;
    lista.push([x, h - 0.03, z, pega('pedreiro', i, i % 4 === 3 ? /torre/ : /mureta/), 0.85 + r() * 0.3]);
  }
  sortear(60, 'pedreiro', (b, h, d) => (b === 'prado' || b === 'pedra') && d > raioVila + 12, /ruina|pilha/);

  // nada de planta dentro da muralha do castelo, nem pedra solta no jardim
  if (K) for (let i = lista.length - 1; i >= 0; i--) { const d = Math.hypot(lista[i][0] - K.x, lista[i][2] - K.z); if (d < K.raio + 1 || (d < K.raio + 18 && lista[i][3].tipo === 'pedra')) lista.splice(i, 1); }
  const n = lista.length, L = dados.largura, A = dados.altura;
  const uvx = x => x / L, uvy = (y, h) => 1 - (y + h) / A;

  // ── as peças: um quadrado (0..1) e, por instância, lugar, tamanho, recorte, pé e quadros ──
  const quad = () => { const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
  const geo = quad();
  const pos = new Float32Array(n * 3), tam = new Float32Array(n * 2), rec = new Float32Array(n * 4), pe = new Float32Array(n * 2), mov = new Float32Array(n * 2), corte = new Float32Array(n);
  lista.forEach(([x, y, z, it, e], i) => {
    const k = PX[it.tipo] * e;
    pos.set([x, y, z], i * 3);
    tam.set([it.w * k, it.h * k], i * 2);
    rec.set([uvx(it.x), uvy(it.y, it.h), it.w / L, it.h / A], i * 4);
    pe.set([it.pe[0] / it.w, 1 - it.pe[1] / it.h], i * 2);   // o pé, com y de baixo para cima
    mov.set([it.quadros, ((x * 0.37 + z * 0.61) % 6.28 + 6.28)], i * 2);
    corte[i] = CORTE[it.tipo];
  });
  for (const [nome, dadosA, t] of [['aPos', pos, 3], ['aTam', tam, 2], ['aRec', rec, 4], ['aPe', pe, 2], ['aMov', mov, 2], ['aCorte', corte, 1]]) geo.setAttribute(nome, new THREE.InstancedBufferAttribute(dadosA, t));
  geo.instanceCount = n;

  const uniformes = () => THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tempo: { value: 0 }, luz: { value: new THREE.Color(1, 1, 1) } }]);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...uniformes(), atlas: { value: tex } }, fog: true,
    vertexShader: `
      attribute vec3 aPos; attribute vec2 aTam; attribute vec4 aRec; attribute vec2 aPe; attribute vec2 aMov; attribute float aCorte;
      uniform float tempo; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        // longe demais: fora da tela, sem custo nenhum
        if (distance(cameraPosition, aPos) > aCorte) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        // o "direito" do cartão é o da câmera, achatado no chão
        vec3 dir = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]) + vec3(1e-5, 0.0, 0.0));
        // "cima": entre o eixo vertical e o da câmera (de cima, o cartão inclina e não fica achatado)
        vec3 cima = normalize(mix(vec3(0.0, 1.0, 0.0), vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]), 0.6));
        vec3 p = aPos + dir * (position.x - aPe.x) * aTam.x + cima * (position.y - aPe.y) * aTam.y;
        // quadro do vento: cada planta na sua fase
        float q = mod(floor(tempo * ${FPS.toFixed(1)} + aMov.y * 3.0), aMov.x);
        vUv = vec2(aRec.x + (q + position.x) * aRec.z, aRec.y + position.y * aRec.w);
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D atlas; uniform vec3 luz; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        vec4 c = texture2D(atlas, vUv);
        if (c.a < 0.5) discard;
        gl_FragColor = vec4(c.rgb * luz, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const malha = add(new THREE.Mesh(geo, mat));
  malha.frustumCulled = false;
  malha.name = 'vegetacao-pixel';

  // ── as sombras: cartões deitados no chão, em malha de pixel (transparência é sempre malha) ──
  const comSombra = lista.filter(([, , , it]) => it.sombra);
  const m = comSombra.length;
  const geoS = quad();
  const sPos = new Float32Array(m * 3), sTam = new Float32Array(m * 2), sRec = new Float32Array(m * 4);
  comSombra.forEach(([x, y, z, it, e], i) => {
    const s = it.sombra, k = PX[it.tipo] * e;
    // o canto da sombra em relação ao pé: x do desenho vira x do mundo; y do desenho vira z, esticado
    sPos.set([x + s.dx * k, y + 0.06, z + s.dy * k * ESTICA_SOMBRA], i * 3);
    sTam.set([s.w * k, s.h * k * ESTICA_SOMBRA], i * 2);
    sRec.set([uvx(s.x), uvy(s.y, s.h), s.w / L, s.h / A], i * 4);
  });
  for (const [nome, dadosA, t] of [['aPos', sPos, 3], ['aTam', sTam, 2], ['aRec', sRec, 4]]) geoS.setAttribute(nome, new THREE.InstancedBufferAttribute(dadosA, t));
  geoS.instanceCount = m;
  const matS = new THREE.ShaderMaterial({
    uniforms: { ...uniformes(), atlas: { value: tex } }, fog: true,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: `
      attribute vec3 aPos; attribute vec2 aTam; attribute vec4 aRec; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        if (distance(cameraPosition, aPos) > ${CORTE_SOMBRA.toFixed(1)}) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        vec3 p = aPos + vec3(position.x * aTam.x, 0.0, (1.0 - position.y) * aTam.y);
        vUv = vec2(aRec.x + position.x * aRec.z, aRec.y + position.y * aRec.w);
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D atlas; uniform vec3 luz; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        if (texture2D(atlas, vUv).a < 0.3) discard;
        // malha de pixel: um sim, um não
        if (mod(floor(gl_FragCoord.x / 2.0) + floor(gl_FragCoord.y / 2.0), 2.0) < 1.0) discard;
        gl_FragColor = vec4(vec3(0.03, 0.05, 0.10) * luz, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const sombras = add(new THREE.Mesh(geoS, matS));
  sombras.frustumCulled = false;
  sombras.name = 'vegetacao-sombras';

  // ── a grama curta: as folhas ficam num retalho que dá a volta na câmera; a altura e onde pode nascer vêm de uma textura ──
  const { N, CEL } = mundo, largT = N + 1, mapa = new Float32Array(largT * largT * 4);
  const pontosCaminho = new Set(); for (const c of mundo.caminhos) for (const p of c.pts) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) pontosCaminho.add(Math.round(p.x / 2 + a) * 10000 + Math.round(p.z / 2 + b));
  for (let j = 0; j < largT; j++) for (let i = 0; i < largT; i++) {
    const x = i * CEL - TAM / 2, z = j * CEL - TAM / 2, h = altura(x, z), c = mundo.celulaDe(x, z), o = (j * largT + i) * 4;
    const naVila = vilas.some(v => !v.castelo && Math.hypot(x - v.x, z - v.z) < 9) || (K && Math.hypot(x - K.x, z - K.z) < K.raio);
    const verde = c && (['prado', 'campo', 'floresta', 'vila'].includes(c.bioma) || (K && Math.hypot(x - K.x, z - K.z) < K.raio + 12));
    mapa[o] = h; mapa[o + 1] = verde && h > 1.6 && !naVila && !pontosCaminho.has(Math.round(x / 2) * 10000 + Math.round(z / 2)) ? 1 : 0; mapa[o + 3] = 1;
  }
  const texMapa = new THREE.DataTexture(mapa, largT, largT, THREE.RGBAFormat, THREE.FloatType); texMapa.needsUpdate = true;
  const curtas = porTipo.gramacurta || [], geoG = quad(), gOff = new Float32Array(GRAMA_QTD * 2), gRec = new Float32Array(GRAMA_QTD * 4), gMov = new Float32Array(GRAMA_QTD);
  for (let i = 0; i < GRAMA_QTD; i++) {
    const it = curtas[i % curtas.length];
    gOff.set([r(), r()], i * 2); gRec.set([uvx(it.x), uvy(it.y, it.h), it.w / L, it.h / A], i * 4); gMov[i] = r() * 6.28;
  }
  for (const [nome, dadosA, t] of [['aOff', gOff, 2], ['aRec', gRec, 4], ['aFase', gMov, 1]]) geoG.setAttribute(nome, new THREE.InstancedBufferAttribute(dadosA, t));
  geoG.instanceCount = GRAMA_QTD;
  const larg = curtas[0] ? curtas[0].w * GRAMA_PX : 1, alto = curtas[0] ? curtas[0].h * GRAMA_PX : 1;
  const matG = new THREE.ShaderMaterial({
    uniforms: { ...uniformes(), atlas: { value: tex }, mapa: { value: texMapa } }, fog: true,
    vertexShader: `
      attribute vec2 aOff; attribute vec4 aRec; attribute float aFase;
      uniform float tempo; uniform sampler2D mapa; varying vec2 vUv;
      #include <fog_pars_vertex>
      vec4 ler(vec2 p) {   // altura e máscara, misturando os 4 vizinhos da grade
        vec2 g = p / ${CEL.toFixed(4)} + ${(N / 2 * 1).toFixed(1)}, f = fract(g), b = floor(g);
        float T = ${largT.toFixed(1)};
        vec4 a0 = texture2D(mapa, (b + vec2(.5, .5)) / T), a1 = texture2D(mapa, (b + vec2(1.5, .5)) / T), a2 = texture2D(mapa, (b + vec2(.5, 1.5)) / T), a3 = texture2D(mapa, (b + vec2(1.5, 1.5)) / T);
        return mix(mix(a0, a1, f.x), mix(a2, a3, f.x), f.y);
      }
      void main() {
        float P = ${GRAMA_LADO.toFixed(1)};
        vec2 c = aOff * P, xz = cameraPosition.xz + mod(c - cameraPosition.xz, P) - P * 0.5;
        vec4 m = ler(xz);
        float d = length(xz - cameraPosition.xz) / (P * 0.5);
        // máscara parcial (borda de caminho, vila) e borda do retalho: a folha encolhe em vez de sumir de repente
        float e = smoothstep(0.55, 0.85, m.g) * (1.0 - smoothstep(0.75, 1.0, d));
        if (e < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        vec3 dir = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]) + vec3(1e-5, 0.0, 0.0));
        vec3 cima = normalize(mix(vec3(0.0, 1.0, 0.0), vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]), 0.5));
        vec3 p = vec3(xz.x, m.r - 0.02, xz.y) + dir * (position.x - 0.5) * ${larg.toFixed(3)} * e + cima * position.y * ${alto.toFixed(3)} * e;
        float q = mod(floor(tempo * ${FPS.toFixed(1)} + aFase + xz.x * 0.25 + xz.y * 0.15), 4.0);
        vUv = vec2(aRec.x + (q + position.x) * aRec.z, aRec.y + position.y * aRec.w);
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: mat.fragmentShader,
  });
  const gramaCurta = add(new THREE.Mesh(geoG, matG));
  gramaCurta.frustumCulled = false;
  gramaCurta.name = 'vegetacao-grama-curta';

  const luz = new THREE.Color();
  return {
    malha, sombras, total: n,
    mostrar(v) { malha.visible = sombras.visible = gramaCurta.visible = v; },
    // a luz da cena tinge o desenho: sol e céu juntos, sem estourar o branco
    atualizar(t, sol, ceu, amb, dist = 0) {
      // de muito longe a grama curta não se vê: nem desenha
      if (malha.visible) gramaCurta.visible = dist < 170;
      luz.copy(sol).multiplyScalar(0.35).add(new THREE.Color(ceu).multiplyScalar(0.25 * amb)).addScalar(0.45);
      const max = Math.max(luz.r, luz.g, luz.b); if (max > 1) luz.multiplyScalar(1 / max);
      for (const u of [mat.uniforms, matS.uniforms, matG.uniforms]) { u.tempo.value = t; u.luz.value.copy(luz); }
    },
  };
}
