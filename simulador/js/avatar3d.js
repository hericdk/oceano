// Avatar 3D da Navegadora: mesma interface do runtime 2D (advance, setEmotion, setExpression, setSpeaking, speakKana…),
// então voz, conversa, visual pixel e espelhos funcionam sem saber qual dos dois está ativo.
// Dois caminhos, com o mesmo movimento por cima (respiração, cabeça, piscar, reação às emoções):
//   .vrm: ossos, molas e expressões do próprio arquivo (three-vrm, MIT). Sem molas no arquivo, entra a malha abaixo.
//   .glb sem rig (Oficina 3D, Blender): a malha é deformada no vertex shader, como o 2D faz com a ilustração:
//   faixa da cabeça gira em volta do pescoço, faixa do peito respira, o resto balança numa mola. Formas do Blender
//   (shape keys) com nomes como "aa", "blink" ou "smile" também são usadas.

import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/three-vrm/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '../vendor/three-vrm/three-vrm.module.min.js';

const VOGAL = {};
for (const [v, s] of Object.entries({ aa: 'あかさたなはまやらわがざだばぱ', ih: 'いきしちにひみりぎじぢびぴ', ou: 'うくすつぬふむゆるぐずづぶぷ', ee: 'えけせてねへめれげぜでべぺ', oh: 'おこそとのほもよろをごぞどぼぽ' })) for (const c of s) VOGAL[c] = v;
const VISEMAS = ['aa', 'ih', 'ou', 'ee', 'oh'];
// pose de cada emoção: giro e inclinação da cabeça (rad), altura da respiração, velocidade do balanço
const POSES = {
  happy: { pitch: -0.06, roll: 0.08, salto: 1 },
  sad: { pitch: 0.2, roll: -0.04, salto: 0 },
  angry: { pitch: 0.1, roll: 0, salto: 0, treme: 1 },
  surprised: { pitch: -0.14, roll: 0, salto: 0.6 },
  relaxed: { pitch: 0.02, roll: 0.13, salto: 0 },
};
// nomes de formas do Blender (shape keys) para o que a Navegadora precisa
const FORMAS = [['aa', /^(aa|a|ah|mouth.?open|open.?mouth|jaw.?open|boca)$/i], ['ih', /^(ih|i)$/i], ['ou', /^(ou|u)$/i], ['ee', /^(ee|e)$/i], ['oh', /^(oh|o)$/i],
  ['blink', /^(blink|eyes?.?closed?|piscar)$/i], ['happy', /^(happy|smile|joy|sorriso)$/i], ['sad', /^(sad|sorrow|triste)$/i], ['angry', /^(angry|brava)$/i], ['surprised', /^(surprised?|surpresa)$/i], ['relaxed', /^(relaxed|fun)$/i]];

const CHUNK = /* glsl */`
  { vec3 mmP = (modelMatrix * vec4(transformed, 1.0)).xyz;
    float mmAlt = clamp((mmP.y - mmFaixa.x) / max(mmFaixa.y - mmFaixa.x, 0.001), 0.0, 1.0);
    float mmCab = smoothstep(mmCabeca.x, mmCabeca.y, mmP.y);
    float mmPeito = smoothstep(mmPeitoF.x, mmPeitoF.y, mmP.y) * (1.0 - mmCab);
    mmP.xz = mix(mmP.xz, mmCentro.xz + (mmP.xz - mmCentro.xz) * (1.0 + mmRespira), mmPeito);
    vec3 mmQ = mmP - mmPivo;
    mmQ.y *= 1.0 + mmFala * mmCab;
    mmP = mix(mmP, mmPivo + mmGiro * mmQ, mmCab);
    float mmK = mmAlt * mmAlt;
    mmP += mmMola * mmK + vec3(sin(mmP.y * 9.0 + mmTempo * 2.1), 0.0, cos(mmP.y * 7.0 + mmTempo * 1.7)) * mmOnda * mmK;
    transformed = (inverse(modelMatrix) * vec4(mmP, 1.0)).xyz; }
`;

export async function criarAvatar3d(canvas, dados, { nome = '' } = {}) {
  const loader = new GLTFLoader();
  loader.register((p) => new VRMLoaderPlugin(p));
  const gltf = await loader.parseAsync(dados instanceof ArrayBuffer ? dados : dados.buffer, '');
  const vrm = gltf.userData.vrm || null;
  if (vrm && vrm.meta?.metaVersion === '0') VRMUtils.rotateVRM0(vrm);
  const modelo = vrm ? vrm.scene : gltf.scene;
  modelo.traverse((o) => { o.frustumCulled = false; });
  modelo.updateMatrixWorld(true);

  const caixa = new THREE.Box3().setFromObject(modelo);
  if (caixa.isEmpty()) throw new Error('o arquivo não tem malha');
  const alto = caixa.max.y - caixa.min.y;
  const ossos = vrm?.humanoid;
  const osso = (n) => ossos?.getNormalizedBoneNode(n) || null;
  const noMundo = (o) => o.getWorldPosition(new THREE.Vector3());
  const yPescoco = osso('neck') ? noMundo(osso('neck')).y : osso('head') ? noMundo(osso('head')).y : caixa.min.y + alto * 0.68;
  const centro = caixa.getCenter(new THREE.Vector3());
  const molasArquivo = !!vrm?.springBoneManager?.joints?.size;

  // deformação de malha: nos modelos sem ossos ela faz tudo; num VRM sem molas, só o balanço
  const U = {
    mmFaixa: { value: new THREE.Vector2(caixa.min.y, caixa.max.y) }, mmCabeca: { value: new THREE.Vector2(yPescoco - alto * 0.03, yPescoco + alto * 0.04) },
    mmPeitoF: { value: new THREE.Vector2(yPescoco - alto * 0.28, yPescoco - alto * 0.12) }, mmCentro: { value: centro }, mmPivo: { value: new THREE.Vector3(centro.x, yPescoco, centro.z) },
    mmGiro: { value: new THREE.Matrix3() }, mmRespira: { value: 0 }, mmFala: { value: 0 }, mmMola: { value: new THREE.Vector3() }, mmOnda: { value: 0 }, mmTempo: { value: 0 },
  };
  const usaMalha = !vrm || !molasArquivo;
  let triangulos = 0;
  const formas = new Map(); // nome nosso → [{ malha, índice }] (só fora do VRM, que tem as expressões próprias)
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    triangulos += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    if (!vrm && o.morphTargetDictionary) for (const [n, i] of Object.entries(o.morphTargetDictionary)) {
      const f = FORMAS.find(([, re]) => re.test(n));
      if (f) { if (!formas.has(f[0])) formas.set(f[0], []); formas.get(f[0]).push({ o, i }); }
    }
    if (!usaMalha) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, U);
        s.vertexShader = `uniform vec2 mmFaixa, mmCabeca, mmPeitoF; uniform vec3 mmCentro, mmPivo, mmMola; uniform mat3 mmGiro; uniform float mmRespira, mmFala, mmOnda, mmTempo;\n${s.vertexShader.replace('#include <project_vertex>', CHUNK + '\n#include <project_vertex>')}`;
      };
      m.customProgramCacheKey = () => 'oceano-malha';
      m.needsUpdate = true;
    }
  });

  // ----- cena -----
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xffffff, 0x8088a0, 2.1));
  const sol = new THREE.DirectionalLight(0xffffff, 1.9);
  sol.position.set(0.6, 1.4, 1.6);
  cena.add(sol);
  cena.add(modelo);
  // enquadramento: VRM do peito para cima, como a ilustração; peça sem ossos inteira, porque não se sabe o que ela é
  const baseQuadro = osso('upperChest') || osso('chest') || osso('spine');
  const y0 = vrm && baseQuadro ? noMundo(baseQuadro).y : caixa.min.y;
  const altoQuadro = Math.max((caixa.max.y - y0) * 1.14, vrm ? 0 : Math.max(caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z) * 1.14);
  const camera = new THREE.PerspectiveCamera(22, 1, 0.01, Math.max(100, alto * 40));
  const dist = (altoQuadro / 2) / Math.tan((22 * Math.PI) / 360);
  const alvo = new THREE.Vector3(centro.x, (y0 + caixa.max.y) / 2, centro.z);
  camera.position.set(alvo.x, alvo.y + altoQuadro * 0.03, alvo.z + dist + (caixa.max.z - centro.z));
  camera.lookAt(alvo);

  // braços do T-pose para baixo
  if (osso('leftUpperArm')) osso('leftUpperArm').rotation.z = -1.2;
  if (osso('rightUpperArm')) osso('rightUpperArm').rotation.z = 1.2;

  // ----- estado -----
  let t = 0, idle = true, falando = false, nivel = 0, fila = [], filaT = 0, filaVel = 8;
  let emocao = null, pesoEmo = 0, emoAntiga = null, expressao = null, proxPiscar = 2, piscar = 0;
  let saltoT = 9;
  const boca = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 }, atual = { yaw: 0, pitch: 0, roll: 0 };
  const mola = { x: 0, z: 0, vx: 0, vz: 0, ax: 0, az: 0 };
  const macio = (a, b, v, dt) => a + (b - a) * (1 - Math.exp(-v * dt));
  const giro = new THREE.Matrix4(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const EXPRESSOES = { smile: ['happy', 0.75], wink: ['blinkLeft', 1], blush: ['relaxed', 0.5], halfLidded: ['blink', 0.5], surprise: ['surprised', 0.8] };

  function setForma(nomeF, v) {
    if (vrm) { vrm.expressionManager?.setValue(nomeF, v); return; }
    for (const { o, i } of formas.get(nomeF) || []) o.morphTargetInfluences[i] = v;
  }

  function passo(dt) {
    t += dt;
    // boca: fila de sílabas ou nível da voz
    let viz = null, aberta = 0;
    if (fila.length) {
      filaT += dt * filaVel;
      if (filaT >= fila.length) { fila = []; filaT = 0; } else { viz = fila[filaT | 0]; aberta = viz ? 0.85 : 0; }
    }
    if (nivel > 0.02) { viz ||= 'aa'; aberta = Math.max(aberta, Math.min(1, nivel)); }
    for (const v of VISEMAS) { boca[v] = macio(boca[v], v === viz ? aberta : 0, 22, dt); setForma(v, boca[v]); }
    const abertura = Math.max(...VISEMAS.map((v) => boca[v]));

    // piscar
    proxPiscar -= dt;
    if (proxPiscar <= 0) { piscar = 0.13; proxPiscar = 1.8 + Math.random() * 3.5; }
    piscar = Math.max(0, piscar - dt);
    const fechar = piscar > 0 ? Math.sin((piscar / 0.13) * Math.PI) : 0;

    // emoção entrando e saindo
    pesoEmo = macio(pesoEmo, emocao ? 1 : 0, 7, dt);
    for (const e of Object.keys(POSES)) setForma(e, e === (emocao || emoAntiga) ? pesoEmo : 0);
    const ex = expressao && EXPRESSOES[expressao];
    if (ex) setForma(ex[0], ex[1]);
    setForma('blink', Math.max(fechar, ex?.[0] === 'blink' ? ex[1] : 0));

    // cabeça: parada, fala e emoção somadas
    const P = POSES[emocao || emoAntiga] || {}, k = pesoEmo;
    const quieta = idle ? 1 : 0;
    const yaw = quieta * (Math.sin(t * 0.43) * 0.09 + Math.sin(t * 0.17) * 0.05) + (falando ? Math.sin(t * 2.3) * 0.035 : 0) + (P.treme ? Math.sin(t * 19) * 0.018 * k : 0);
    const pitch = quieta * Math.sin(t * 0.61) * 0.03 + (P.pitch || 0) * k - abertura * 0.025 + (falando ? Math.sin(t * 3.1) * 0.016 : 0);
    const roll = quieta * Math.sin(t * 0.37) * 0.04 + (P.roll || 0) * k;
    const yaw0 = atual.yaw, roll0 = atual.roll;
    atual.yaw = macio(atual.yaw, yaw, 9, dt); atual.pitch = macio(atual.pitch, pitch, 9, dt); atual.roll = macio(atual.roll, roll, 9, dt);
    const respira = quieta * (Math.sin(t * 1.5) * 0.5 + 0.5);
    saltoT += dt;
    const salto = saltoT < 0.5 ? Math.sin((saltoT / 0.5) * Math.PI) * (P.salto || 0) : 0;

    if (ossos) {
      const cab = osso('head'), pes = osso('neck'), pei = osso('chest') || osso('spine');
      if (cab) cab.rotation.set(atual.pitch * 0.7, atual.yaw * 0.7, atual.roll * 0.7);
      if (pes) pes.rotation.set(atual.pitch * 0.3, atual.yaw * 0.3, atual.roll * 0.3);
      if (pei) pei.rotation.x = -respira * 0.012;
      const bac = osso('hips');
      if (bac) bac.position.y = (bac.userData.y0 ??= bac.position.y) + salto * alto * 0.018 + respira * alto * 0.0015;
    } else {
      euler.set(atual.pitch, atual.yaw, atual.roll);
      giro.makeRotationFromEuler(euler);
      U.mmGiro.value.setFromMatrix4(giro);
      U.mmRespira.value = respira * 0.012;
      U.mmFala.value = abertura * 0.05;
      modelo.position.y = salto * alto * 0.018;
    }
    if (usaMalha) {
      // mola: atrasa em relação ao movimento da cabeça, como as mechas do 2D
      const dtS = Math.max(dt, 1 / 240);
      const fx = -((atual.yaw - yaw0) + (atual.roll - roll0)) / dtS * alto * 0.012, fz = (atual.pitch - pitch) * alto * 0.3;
      mola.vx += (fx - mola.x * 42 - mola.vx * 7) * dt; mola.vz += (fz - mola.z * 42 - mola.vz * 7) * dt;
      mola.x += mola.vx * dt; mola.z += mola.vz * dt;
      U.mmMola.value.set(mola.x * 0.3, 0, mola.z * 0.3);
      U.mmOnda.value = alto * 0.0035;
      U.mmTempo.value = t;
    }
    vrm?.update(dt);
  }

  function ajustarTamanho() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const n = Math.max(16, Math.round((parseFloat(canvas.style.width) || 120) * dpr));
    if (canvas.width !== n || canvas.height !== n) renderer.setSize(n, n, false);
  }

  return {
    tipo: '3d',
    info: {
      formato: vrm ? `VRM ${vrm.meta?.metaVersion === '0' ? '0.x' : '1.0'}` : 'GLB',
      nome: vrm?.meta?.name || vrm?.meta?.title || nome,
      autores: vrm?.meta?.authors?.join(', ') || vrm?.meta?.author || '',
      licenca: vrm?.meta?.otherLicenseUrl || vrm?.meta?.licenseUrl || vrm?.meta?.licenseName || '',
      triangulos: Math.round(triangulos), temOssos: !!vrm, temMolas: molasArquivo, usaMalha,
      expressoes: vrm ? Object.keys(vrm.expressionManager?.expressionMap || {}).length : formas.size,
    },
    // como no runtime 2D: avança o tempo e desenha na tela
    advance(dt) {
      ajustarTamanho();
      if (dt) passo(dt); else vrm?.update(0);
      renderer.render(cena, camera);
    },
    setAutoIdle(v) { idle = !!v; },
    setSpeaking(v) { falando = !!v; },
    setVoiceLevel(n) { nivel = n || 0; },
    speakKana(kana, { speed = 8 } = {}) { fila = [...String(kana)].map((c) => VOGAL[c] || null); filaT = 0; filaVel = speed; },
    stopLipSync() { fila = []; filaT = 0; nivel = 0; },
    setEmotion(e, { playMotion = false } = {}) {
      if (e && !POSES[e]) e = null;
      if (e) { emoAntiga = e; if (playMotion) saltoT = 0; }
      emocao = e;
    },
    setExpression(e) {
      if (expressao && EXPRESSOES[expressao]) setForma(EXPRESSOES[expressao][0], 0);
      expressao = e === 'neutral' ? null : e;
    },
    destroy() {
      try { VRMUtils.deepDispose(modelo); } catch {}
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
