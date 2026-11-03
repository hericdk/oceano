// O mar da nova aba: Three.js renderizado em baixa resolução e depois
// reduzido a poucas cores da paleta do tema com pixelização.
//
// Água: soma de ondas "exp-sine" (cristas agudas, vales largos) com dispersão
// de águas profundas, normais e curvatura analíticas, espuma nas cristas mais
// convexas e luz atravessando as cristas finas. Técnicas de Mark Finch,
// "Effective Water Simulation from Physical Models" (GPU Gems, cap. 1), como
// organizadas no repositório shader-skills (MIT). Código reescrito aqui.

import * as THREE from '../vendor/three.module.min.js';

THREE.ColorManagement.enabled = false;

const glslOndas = `
uniform float uTempo, uAltura, uVelocidade, uPeriodo;
const float NITIDEZ = 2.4;            // 1 = ondulação suave, 3 = cristas pontudas
// devolve (altura, dh/dx, dh/dz, crista) — crista vai a 1 onde as ondas grandes se encontram
vec4 ondas(vec2 p, int n) {
  float h = 0.0, crista = 0.0, cristaMax = 0.0;
  vec2 d = vec2(0.0);
  float comprimento = 22.0, amp = 0.5 * uAltura;
  for (int i = 0; i < 6; i++) {
    if (i >= n) break;
    float fi = float(i);
    float ang = 0.35 + sin(fi * 1.7) * 0.85;          // direções espalhadas em volta do vento
    vec2 dir = vec2(sin(ang), -cos(ang));
    float k = 6.28318 / comprimento;
    float w = sqrt(9.81 * k) * uVelocidade;           // dispersão em águas profundas
    // modo loop: cada onda dá um número inteiro de voltas no período, então o último quadro encaixa no primeiro
    if (uPeriodo > 0.0) w = max(1.0, floor(w * 0.6 * uPeriodo / 6.28318 + 0.5)) * 6.28318 / (0.6 * uPeriodo);
    float fase = k * dot(dir, p) - w * uTempo * 0.6 + fi * 1.3;
    float s = sin(fase), c = cos(fase);
    float e = exp(NITIDEZ * (s - 1.0));
    h += amp * (e - 0.3);
    d += amp * NITIDEZ * c * e * k * dir;
    if (i < 4) {
      // curvatura da onda: no topo da crista vale NITIDEZ
      crista += amp * k * k * NITIDEZ * e * (s - NITIDEZ * c * c);
      cristaMax += amp * k * k * NITIDEZ;
    }
    comprimento *= 0.71;
    amp *= 0.66;
  }
  return vec4(h, d, crista / max(cristaMax, 1e-4));
}`;

function materialAgua() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTempo: { value: 0 },
      uPeriodo: { value: 0 },
      uAltura: { value: 1 },
      uVelocidade: { value: 1 },
      uEspumaQtd: { value: 1 },
      uChuva: { value: 0 },
      uBrilhoSol: { value: 1 },
      uSol: { value: new THREE.Vector3(0, 1, -1) },
      uCorSol: { value: new THREE.Color() },
      uFundo: { value: new THREE.Color() },
      uRaso: { value: new THREE.Color() },
      uEspuma: { value: new THREE.Color() },
      uHorizonte: { value: new THREE.Color() },
      uCeu: { value: new THREE.Color() },
      uCamera: { value: new THREE.Vector3() },
    },
    vertexShader: `
      varying vec3 vPos;
      ${glslOndas}
      void main() {
        vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
        p.y += ondas(p.xz, 4).x;
        vPos = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uSol, uCorSol, uFundo, uRaso, uEspuma, uHorizonte, uCeu, uCamera;
      uniform float uEspumaQtd, uChuva, uBrilhoSol;
      varying vec3 vPos;
      ${glslOndas}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec4 w = ondas(vPos.xz, 6);
        vec3 n = normalize(vec3(-w.y, 1.0, -w.z));
        vec3 v = normalize(uCamera - vPos);
        vec3 l = normalize(uSol);
        float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);   // Schlick, água
        vec3 r = reflect(-v, n);
        vec3 ceu = mix(uHorizonte, uCeu, pow(clamp(r.y * 1.6, 0.0, 1.0), 0.6));
        float difusa = max(dot(n, l), 0.0) * 0.5 + 0.5;
        vec3 corpo = mix(uFundo, uRaso, clamp(w.x * 0.9 + 0.35, 0.0, 1.0)) * difusa;
        // luz do sol atravessando as cristas finas quando se olha contra o sol
        float contraLuz = pow(clamp(dot(-v, l) * 0.5 + 0.5, 0.0, 1.0), 3.0);
        corpo += uRaso * contraLuz * smoothstep(0.15, 0.6, w.x) * 0.9;
        vec3 cor = mix(corpo, ceu, fresnel);
        float brilho = pow(max(dot(r, l), 0.0), 140.0) * step(0.0, uSol.y + 0.05) * uBrilhoSol;
        cor += uCorSol * brilho * 2.0;
        // espuma: a convexidade da crista decide quanto de uma "renda" de ruído aparece
        float renda = ruido(vPos.xz * 1.6 + (uPeriodo > 0.0 ? vec2(cos(6.28318 * uTempo / uPeriodo), sin(6.28318 * uTempo / uPeriodo)) * 0.2 * uPeriodo / 6.28318 : vec2(uTempo * 0.2, 0.0))) * 0.6 + ruido(vPos.xz * 4.1) * 0.4;
        float cobre = 0.75 * smoothstep(0.1, 0.45, w.w) * uEspumaQtd;
        float espuma = cobre * smoothstep(1.0 - cobre, 1.12 - cobre, renda);
        cor = mix(cor, uEspuma, clamp(espuma, 0.0, 1.0));
        float dist = length(vPos.xz - uCamera.xz);
        if (uChuva > 0.0) {
          // respingos: cada célula do mar recebe uma gota por ciclo e abre um anel
          vec2 g = vPos.xz / 1.4, id = floor(g);
          float ph = hash(id);
          float taxa = 0.8 + ph * 0.7;                       // gotas por segundo nesta célula
          float voltas = floor(taxa * uPeriodo + 0.5);
          if (uPeriodo > 0.0) taxa = max(1.0, voltas) / uPeriodo;
          float ciclo = uTempo * taxa + ph, k = floor(ciclo), idade = fract(ciclo);
          if (uPeriodo > 0.0) k = mod(k, max(1.0, voltas));
          vec2 centro = vec2(hash(id + k * 0.37 + 1.3), hash(id + k * 0.71 + 7.7)) * 0.6 + 0.2;
          float existe = step(hash(id + k * 1.31 + 3.3), uChuva * 0.85);
          float raio = length(fract(g) - centro) * 1.4;
          float anel = 1.0 - smoothstep(0.0, 0.05 + dist * 0.004, abs(raio - idade * 0.6));
          float pingo = (1.0 - smoothstep(0.0, 0.12, idade)) * (1.0 - smoothstep(0.0, 0.1, raio));
          float resp = max(anel * (1.0 - idade), pingo) * existe * (1.0 - smoothstep(14.0, 40.0, dist));
          cor = mix(cor, uEspuma, clamp(resp * 0.9, 0.0, 1.0));
        }
        cor = mix(cor, uHorizonte, smoothstep(45.0, 150.0, dist));
        gl_FragColor = vec4(cor, 1.0);
      }`,
  });
}

function texturaNebulosa() {
  const t = new THREE.TextureLoader().load(new URL('../fundos/ceu/nebulosa.png', import.meta.url).href);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.MirroredRepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;   // pixel nítido
  return t;
}

function materialCeu() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSol: { value: new THREE.Vector3() },
      uCorSol: { value: new THREE.Color() },
      uCeu: { value: new THREE.Color() },
      uHorizonte: { value: new THREE.Color() },
      uNoite: { value: 0 },
      uNublado: { value: 0 },
      uNuvemEscura: { value: new THREE.Color() },
      uNuvemClara: { value: new THREE.Color() },
      uDeriva: { value: new THREE.Vector2() },
      tNebulosa: { value: texturaNebulosa() },
    },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uSol, uCorSol, uCeu, uHorizonte, uNuvemEscura, uNuvemClara; uniform float uNoite, uNublado;
      uniform vec2 uDeriva; uniform sampler2D tNebulosa;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * ruido(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
      void main() {
        vec3 d = normalize(vDir);
        vec3 cor = mix(uHorizonte, uCeu, pow(clamp(d.y * 1.6, 0.0, 1.0), 0.6));
        vec3 s = normalize(uSol);
        float astro = dot(d, s);
        float limpo = 1.0 - uNublado;
        cor = mix(cor, uCorSol, smoothstep(0.9975, 0.9985, astro) * limpo);
        cor += uCorSol * pow(max(astro, 0.0), 240.0) * 0.45 * limpo;
        float estrela = step(0.9985, hash(floor(d * 220.0))) * uNoite * step(0.05, d.y) * limpo;
        cor = mix(cor, vec3(1.0), estrela);
        // noite: a nebulosa de pixel do No Man Sky FM (vista da cabine) cobre o céu, espelhada 4× em volta;
        // perto do horizonte ela se funde no tom do tema. A lua continua por cima.
        if (uNoite > 0.001) {
          vec2 uv = vec2((atan(d.x, d.z) / 6.2831853 + 0.5) * 4.0 + 0.55, clamp(d.y / 0.42, 0.0, 1.0));   // a vista do mar mostra pouco céu: a imagem inteira cabe até ~25°
          vec3 nb = texture2D(tNebulosa, uv).rgb;
          float lua = smoothstep(0.9975, 0.9985, astro) + pow(max(astro, 0.0), 240.0) * 0.45;
          cor = mix(cor, mix(uHorizonte, nb, smoothstep(0.0, 0.18, d.y)), uNoite * limpo * (1.0 - clamp(lua, 0.0, 1.0)));
        }
        if (uNublado > 0.0) {
          // céu fechado: camada de nuvens projetada num teto plano, mais densa perto do horizonte
          vec2 pc = d.xz / (max(d.y, 0.0) + 0.12) * 0.9 + uDeriva;
          float n = fbm(pc);
          float cobre = clamp(uNublado * (0.45 + n * 0.9), 0.0, 1.0) * smoothstep(-0.03, 0.06, d.y);
          vec3 nuvem = mix(uNuvemEscura, uNuvemClara, smoothstep(0.35, 0.75, n + d.y * 0.25));
          cor = mix(cor, nuvem, cobre);
        }
        gl_FragColor = vec4(cor, 1.0);
      }`,
  });
}

export const MODOS_DITHER = ['bayer2', 'bayer4', 'bayer8', 'ruido', 'meio-tom', 'linhas', 'xadrez', 'nenhum'];

// Reduz a imagem às cores escolhidas: acha as duas mais próximas e alterna
// entre elas segundo o padrão de pixelizar escolhido.
function materialPaleta(textura) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tImagem: { value: textura },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uPaleta: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) },
      uN: { value: 1 },
      uModo: { value: 1 },
      uEscala: { value: 1 },
      uForca: { value: 1 },
      uContraste: { value: 1 },
      uBrilho: { value: 0 },
      uContorno: { value: 0 },
      uEscuro: { value: new THREE.Vector3() },
      uQuadro: { value: 0 },
      uChuva: { value: 0 },
      uTempo: { value: 0 },
      uPeriodo: { value: 0 },
      uCorChuva: { value: new THREE.Vector3(1, 1, 1) },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tImagem; uniform vec2 uTexel;
      uniform vec3 uPaleta[16]; uniform int uN; uniform int uModo;
      uniform float uEscala, uForca, uContraste, uBrilho, uContorno, uQuadro;
      uniform vec3 uEscuro;
      uniform float uChuva, uTempo, uPeriodo; uniform vec3 uCorChuva;
      varying vec2 vUv;

      // gotas de chuva em pixel: riscos inclinados de 1 px, em células que descem pela tela
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float camadaChuva(vec2 q, vec2 cel, float vel, float comp, float semente) {
        float linhas = floor(vel * uPeriodo / cel.y + 0.5);
        if (uPeriodo > 0.0) vel = max(1.0, linhas) * cel.y / uPeriodo;   // modo loop: desce um número inteiro de células
        float desl = uTempo * vel;
        vec2 p = vec2(q.x + q.y * 0.22, q.y + desl);   // inclinação fixa: a gota anda pela diagonal sem depender do tempo em x
        vec2 id = floor(p / cel);
        vec2 f = p - id * cel;
        if (uPeriodo > 0.0) id.y = mod(id.y, max(1.0, linhas));   // as linhas de gotas se repetem a cada volta
        float h = h21(id + semente);
        if (h21(id + semente + 17.0) > uChuva * 0.9) return 0.0;
        float x0 = floor(h * (cel.x - 1.0)), y0 = floor(fract(h * 7.13) * (cel.y - comp));
        return step(abs(floor(f.x) - x0), 0.5) * step(y0, f.y) * step(f.y, y0 + comp);
      }

      float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

      // limiar entre 0 e 1 para cada célula do padrão
      float limiar(vec2 p) {
        vec2 q = floor(p / uEscala);
        if (uModo == 0) return bayer2(q) + 0.125;
        if (uModo == 1) return bayer4(q) + 0.03125;
        if (uModo == 2) return bayer8(q) + 0.0078;
        if (uModo == 3) {   // ruído de gradiente intercalado (Jimenez, 2014)
          q += uQuadro * vec2(5.588238, 5.588238);
          return fract(52.9829189 * fract(dot(q, vec2(0.06711056, 0.00583715))));
        }
        if (uModo == 4) {   // meio-tom: grade girada 45° com pontos que crescem
          vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * q / 4.0;
          return clamp(length(fract(g) - 0.5) * 1.41, 0.0, 1.0);
        }
        if (uModo == 5) return (mod(q.y, 3.0) + 0.5) / 3.0;
        if (uModo == 6) return mod(q.x + q.y, 2.0) * 0.5 + 0.25;
        return 1.0;         // sem pixelizar: sempre a cor mais próxima
      }

      vec3 ajustar(vec3 c) { return clamp((c - 0.5) * uContraste + 0.5 + uBrilho, 0.0, 1.0); }
      float luz(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

      void main() {
        vec3 c = ajustar(texture2D(tImagem, vUv).rgb);
        if (uChuva > 0.0) {
          vec2 q = floor(gl_FragCoord.xy);
          float g = camadaChuva(q, vec2(9.0, 52.0), 250.0, 7.0, 1.0) * 0.85;
          g = max(g, camadaChuva(q, vec2(7.0, 38.0), 180.0, 5.0, 31.0) * 0.6);
          g = max(g, camadaChuva(q, vec2(5.0, 27.0), 120.0, 3.0, 67.0) * 0.4);
          c = mix(c, uCorChuva, g);
        }
        if (uContorno > 0.5) {
          float a = luz(c);
          float dx = abs(a - luz(ajustar(texture2D(tImagem, vUv - vec2(uTexel.x, 0.0)).rgb)));
          float dy = abs(a - luz(ajustar(texture2D(tImagem, vUv - vec2(0.0, uTexel.y)).rgb)));
          if (max(dx, dy) > 0.16) { gl_FragColor = vec4(uEscuro, 1.0); return; }
        }
        float d1 = 1e9, d2 = 1e9; vec3 c1 = vec3(0.0), c2 = vec3(0.0);
        for (int i = 0; i < 16; i++) {
          if (i >= uN) break;
          vec3 diff = (c - uPaleta[i]) * vec3(0.9, 1.2, 0.8);
          float d = dot(diff, diff);
          if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = uPaleta[i]; }
          else if (d < d2) { d2 = d; c2 = uPaleta[i]; }
        }
        float r = sqrt(d1) / (sqrt(d1) + sqrt(d2) + 1e-5);
        gl_FragColor = vec4(limiar(gl_FragCoord.xy) < r * uForca ? c2 : c1, 1.0);
      }`,
  });
}

function ilha(cena) {
  const grupo = new THREE.Group();
  const lambert = cor => new THREE.MeshLambertMaterial({ color: cor, flatShading: true });

  const areia = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5, 1.4, 9), lambert(0xe9c98f));
  areia.position.y = 0.1;
  grupo.add(areia);
  const pedra = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), lambert(0x5a5a6e));
  pedra.position.set(2.4, 0.6, 1.2);
  grupo.add(pedra);

  // farol listrado: as cores vêm por vértice
  const torreGeo = new THREE.CylinderGeometry(0.45, 0.7, 4.2, 10, 6);
  const cores = [];
  const pos = torreGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const faixa = Math.floor((pos.getY(i) + 2.1) / 0.84) % 2;
    cores.push(...(faixa ? [0.95, 0.95, 0.95] : [0.85, 0.2, 0.18]));
  }
  torreGeo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  const torre = new THREE.Mesh(torreGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  torre.position.y = 2.9;
  grupo.add(torre);

  const lampada = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
  lampada.position.y = 5.3;
  grupo.add(lampada);
  const teto = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.7, 8), lambert(0x2a2a3a));
  teto.position.y = 5.95;
  grupo.add(teto);

  // facho de luz que gira à noite
  const fachoGeo = new THREE.ConeGeometry(1.6, 26, 12, 1, true);
  fachoGeo.translate(0, -13, 0);
  fachoGeo.rotateZ(Math.PI / 2);
  const facho = new THREE.Mesh(fachoGeo, new THREE.ShaderMaterial({
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uForca: { value: 0 }, uCor: { value: new THREE.Color(0xfff1a8) } },
    vertexShader: `
      varying float vT;   // 0 na lâmpada, 1 na boca do cone
      void main() { vT = clamp(position.x / 26.0, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uForca; uniform vec3 uCor; varying float vT;
      float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      void main() {
        // transparência por "porta de tela": cada pixel aparece ou some pelo padrão de Bayer
        float cobertura = (1.0 - smoothstep(0.2, 1.0, vT)) * uForca;
        if (bayer4(gl_FragCoord.xy) + 0.03 > cobertura) discard;
        gl_FragColor = vec4(uCor * (0.75 + 0.25 * (1.0 - vT)), 1.0);
      }`,
  }));
  facho.position.y = 5.3;
  grupo.add(facho);

  grupo.position.set(24, 0, -42);
  grupo.rotation.y = -0.5;
  cena.add(grupo);
  return { grupo, facho, lampada };
}

function nuvens(cena) {
  // nuvens não recebem sombra: a cor segue a luz do céu (definida em iluminar)
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const grupo = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const n = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + Math.random() * 2, 0), mat);
      b.position.set(j * 2.6 - 4, Math.random(), Math.random() * 1.5);
      b.scale.y = 0.55;
      n.add(b);
    }
    n.position.set(-90 + i * 30 + Math.random() * 10, 16 + Math.random() * 10, -110 - Math.random() * 40);
    n.userData.v = 0.4 + Math.random() * 0.6;
    n.userData.x0 = n.position.x;
    grupo.add(n);
  }
  grupo.userData.material = mat;
  cena.add(grupo);
  return grupo;
}

const c = h => new THREE.Color(h);
const PALETAS_LUZ = {
  dia:   { ceu: c(0x3d8be0), horizonte: c(0xb4e2ff), sol: c(0xfff3c4), fundo: c(0x0b3f7a), raso: c(0x2c8fd6), espuma: c(0xf4fbff) },
  tarde: { ceu: c(0x5a4b9a), horizonte: c(0xff9a6a), sol: c(0xffc070), fundo: c(0x26305e), raso: c(0x9a5a7a), espuma: c(0xffe2c4) },
  noite: { ceu: c(0x060a24), horizonte: c(0x1c2556), sol: c(0xdfe8ff), fundo: c(0x050b20), raso: c(0x13285a), espuma: c(0x8fa6d8) },
  // céu fechado de chuva, de dia e de noite
  chuva:      { ceu: c(0x48545f), horizonte: c(0x7c8a95), sol: c(0xd6dde2), fundo: c(0x1d2a33), raso: c(0x4d6371), espuma: c(0xc9d3da) },
  chuvaNoite: { ceu: c(0x10161c), horizonte: c(0x222c35), sol: c(0x9aa7b4), fundo: c(0x080d12), raso: c(0x1a2630), espuma: c(0x6c7c8a) },
};

// Linhas de vento: fios finos que serpenteiam pelo céu e somem. A cor vem da luz da cena e o pós-processamento põe na paleta.
function vento(cena) {
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const grupo = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
    const l = new THREE.Line(g, mat);
    l.frustumCulled = false; l.visible = false;
    l.userData.espera = Math.random() * 12;
    grupo.add(l);
  }
  grupo.userData.material = mat;
  cena.add(grupo);
  return grupo;
}

function misturar(a, b, t) {
  const r = {};
  for (const k in a) r[k] = a[k].clone().lerp(b[k], t);
  return r;
}

const hexParaVec = (h, v) => {
  const n = parseInt(h.slice(1), 16);
  return v.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export class Mar {
  constructor(canvas) {
    this.canvas = canvas;
    this.pixel = 3;
    this.fpsMax = 60;
    this.horaFixa = null;          // hora escolhida à mão (página de temas); vence a do tema
    this.horaTema = null;          // hora fixa do tema; null = segue o relógio
    this.chuva = 0;
    this.relampago = false;
    this.chuvaTema = 0;
    this.relampagoTema = false;
    this.clima = { cobertura: 0.7, vento: 0.2, chuva: 0, raios: 0 };   // o céu de agora (ver clima.js); os valores andam devagar até ele
    this.climaAtual = { ...this.clima };
    this.brilhoBase = 0;
    this.tempo = 0;
    this.ultimo = 0;
    this.fps = 0;
    this.quadro = 0;
    this.animarRuido = false;
    this.espelhos = new Set();     // canvases 2D que copiam o mar (prévia do editor)
    this.periodo = 0;              // > 0: modo loop (fundo de tela), tudo fecha um ciclo exato nesse número de segundos

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(1);

    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this.camera.position.set(0, 2.8, 8);
    this.camera.lookAt(0, 1.4, -30);

    this.agua = new THREE.Mesh(new THREE.PlaneGeometry(320, 240, 120, 90).rotateX(-Math.PI / 2), materialAgua());
    this.agua.position.z = -80;
    this.cena.add(this.agua);

    this.ceu = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), materialCeu());
    this.cena.add(this.ceu);

    this.luz = new THREE.DirectionalLight(0xffffff, 1.2);
    this.ambiente = new THREE.AmbientLight(0xffffff, 0.5);
    this.cena.add(this.luz, this.ambiente);

    this.farol = ilha(this.cena);
    this.nuvens = nuvens(this.cena);
    this.vento = vento(this.cena);
    for (const n of this.nuvens.children) { n.userData.ordem = Math.random(); n.userData.f = 0; }

    this.alvo = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.posCena = new THREE.Scene();
    this.posCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.paleta = materialPaleta(this.alvo.texture);
    this.posCena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.paleta));

    this.redimensionar();
    window.addEventListener('resize', () => this.redimensionar());
  }

  // Aplica o estilo do mar de um tema (ver normalizarMar em temas.js).
  definirEstilo(estilo, paleta) {
    const u = this.paleta.uniforms;
    const indices = estilo.cores || paleta.map((_, i) => i);
    const cores = indices.slice(0, 16).map(i => paleta[i]);
    cores.forEach((h, i) => hexParaVec(h, u.uPaleta.value[i]));
    u.uN.value = cores.length;
    // cor do contorno: a mais escura entre as escolhidas
    const lum = h => { const v = hexParaVec(h, new THREE.Vector3()); return v.x * 0.299 + v.y * 0.587 + v.z * 0.114; };
    hexParaVec(cores.reduce((a, b) => (lum(b) < lum(a) ? b : a)), u.uEscuro.value);
    u.uModo.value = Math.max(0, MODOS_DITHER.indexOf(estilo.dither));
    u.uEscala.value = estilo.escala;
    u.uForca.value = estilo.forca;
    u.uContraste.value = estilo.contraste;
    u.uBrilho.value = this.brilhoBase = estilo.brilho;
    u.uContorno.value = estilo.contorno ? 1 : 0;
    this.animarRuido = estilo.animar;
    const ua = this.agua.material.uniforms;
    ua.uAltura.value = estilo.ondas;
    ua.uVelocidade.value = estilo.velocidade;
    ua.uEspumaQtd.value = estilo.espuma;
    this.nuvens.visible = estilo.nuvens;
    this.farol.grupo.visible = estilo.farol;
    this.horaTema = typeof estilo.hora === 'number' ? estilo.hora : null;
    this.chuvaTema = estilo.chuva || 0;
    this.relampagoTema = !!estilo.relampago;
    if (this.pixel !== estilo.pixel) { this.pixel = estilo.pixel; this.redimensionar(); }
  }

  // novo céu: as nuvens trocam de lugar na fila e os valores deslizam até ele
  definirClima(c) {
    this.clima = c;
    for (const n of this.nuvens.children) n.userData.ordem = Math.random();
  }

  redimensionar() {
    const w = Math.max(1, Math.ceil(window.innerWidth / this.pixel));
    const h = Math.max(1, Math.ceil(window.innerHeight / this.pixel));
    this.renderer.setSize(w, h, false);
    this.alvo.setSize(w, h);
    this.paleta.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.camera.aspect = w / h;
    // em telas estreitas, recua a câmera para o farol continuar visível
    this.camera.fov = w / h < 1 ? 75 : 55;
    this.farol.grupo.position.x = w / h < 1 ? 7 : 24;
    this.camera.updateProjectionMatrix();
  }

  hora() {
    if (this.horaFixa != null) return this.horaFixa;
    if (this.horaTema != null && !this.soRelogio) return this.horaTema;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  // a hora que a cena mostra desliza até a hora pedida (sol e lua andam suaves, sem pulos);
  // no modo loop e nas gravações, vale a hora exata
  horaVisivel(dt) {
    const alvo = this.hora();
    if (this.periodo || !dt || this.horaSuave == null) { this.horaSuave = alvo; this.animandoHora = false; return alvo; }
    const dif = ((alvo - this.horaSuave + 36) % 24) - 12;   // pelo caminho mais curto (23h → 1h passa pela meia-noite)
    if (Math.abs(dif) < 0.002) { this.horaSuave = alvo; this.animandoHora = false; return alvo; }
    this.horaSuave = (this.horaSuave + dif * (1 - Math.exp(-dt * 5)) + 24) % 24;   // easing exponencial: rápido no começo, macio no fim
    this.animandoHora = true;
    return this.horaSuave;
  }

  iluminar(dt = 0) {
    const h = this.horaVisivel(dt);
    const ang = ((h - 6) / 12) * Math.PI;           // nasce às 6h, se põe às 18h
    const elev = Math.sin(ang);
    const dia = THREE.MathUtils.smoothstep(elev, -0.15, 0.25);
    const tarde = 1 - THREE.MathUtils.smoothstep(Math.abs(elev), 0.05, 0.35);
    let luz = misturar(PALETAS_LUZ.noite, PALETAS_LUZ.dia, dia);
    luz = misturar(luz, PALETAS_LUZ.tarde, tarde * 0.85);
    const nublado = Math.min(1, this.chuva * 1.4);
    if (nublado) luz = misturar(luz, misturar(PALETAS_LUZ.chuvaNoite, PALETAS_LUZ.chuva, dia), nublado * 0.9);
    const flash = this.clarao();

    // à noite o "astro" é a lua, do lado oposto; o sol anda perto do centro da vista
    // para o pôr do sol (e o reflexo na água) caber na tela
    const sol = elev > -0.1
      ? new THREE.Vector3(Math.cos(ang) * 0.5, 0.02 + Math.max(elev, 0) * 0.27, -1)   // o arco cabe na vista: ao meio-dia o sol ainda aparece
      : new THREE.Vector3(-Math.cos(ang) * 0.6, 0.35, -1);

    const ua = this.agua.material.uniforms, uc = this.ceu.material.uniforms;
    ua.uSol.value.copy(sol); uc.uSol.value.copy(sol);
    ua.uCorSol.value.copy(luz.sol); uc.uCorSol.value.copy(luz.sol);
    ua.uFundo.value.copy(luz.fundo); ua.uRaso.value.copy(luz.raso); ua.uEspuma.value.copy(luz.espuma);
    ua.uHorizonte.value.copy(luz.horizonte); uc.uHorizonte.value.copy(luz.horizonte);
    ua.uCeu.value.copy(luz.ceu); uc.uCeu.value.copy(luz.ceu);
    uc.uNoite.value = 1 - dia;
    ua.uCamera.value.copy(this.camera.position);
    ua.uChuva.value = this.chuva;
    ua.uBrilhoSol.value = 1 - nublado * 0.9;
    uc.uNublado.value = nublado;
    uc.uNuvemEscura.value.copy(luz.fundo).lerp(luz.ceu, 0.55);
    uc.uNuvemClara.value.copy(luz.horizonte).lerp(luz.espuma, 0.12).lerp(new THREE.Color(1, 1, 1), flash * 0.7);
    if (flash) { uc.uHorizonte.value.lerp(new THREE.Color(1, 1, 1), flash * 0.35); ua.uHorizonte.value.copy(uc.uHorizonte.value); }
    const P = this.periodo;
    uc.uDeriva.value.set(P ? Math.cos(2 * Math.PI * this.tempo / P) * 0.15 * P / (2 * Math.PI) : this.tempo * 0.02, P ? Math.sin(2 * Math.PI * this.tempo / P) * 0.05 * P / (2 * Math.PI) : 0);
    const up = this.paleta.uniforms;
    up.uChuva.value = this.chuva;
    up.uTempo.value = this.tempo;
    up.uPeriodo.value = P;
    up.uCorChuva.value.set(luz.espuma.r, luz.espuma.g, luz.espuma.b).lerp(new THREE.Vector3(1, 1, 1), 0.15 + flash * 0.5);
    up.uBrilho.value = this.brilhoBase + flash * 0.12;

    this.luz.position.copy(sol).multiplyScalar(50);
    this.luz.color.copy(luz.sol);
    this.luz.intensity = 0.3 + dia * 1.0;
    this.ambiente.color.copy(luz.horizonte);
    this.ambiente.intensity = 0.6 + dia * 0.3;
    this.nuvens.userData.material.color.copy(luz.espuma).lerp(luz.horizonte, 0.25).lerp(uc.uNuvemEscura.value, nublado * 0.7);
    for (const n of this.nuvens.children) { n.scale.setScalar((1 + nublado * 1.3) * (n.userData.f ?? 1)); n.visible = (n.userData.f ?? 1) > 0.02; }
    this.vento.userData.material.color.copy(luz.espuma).lerp(luz.horizonte, 0.2);
    this.farol.facho.material.uniforms.uForca.value = (1 - dia) * 0.9;
    this.farol.lampada.material.color.setRGB(1, 0.95, 0.66).multiplyScalar(0.6 + (1 - dia) * 0.4);
  }

  // Relâmpago: raro, curto e com duas piscadas. Determinístico pelo tempo, então
  // fecha o ciclo no modo loop (lá cai sempre um clarão por janela).
  clarao() {
    if (!this.relampago || !this.chuva) return 0;
    const P = this.periodo;
    const forte = !P && this.climaAtual.raios > 0.5;   // tempestade: muitos raios
    const janela = P ? P / Math.max(1, Math.round(P / 11)) : forte ? 3.5 : 11;
    const t = P ? ((this.tempo % P) + P) % P : this.tempo;
    const k = Math.floor(t / janela);
    const h = Math.abs(Math.sin(k * 91.7 + 3.1) * 43758.5453) % 1;
    if (!P && h > (forte ? 0.85 : 0.35)) return 0;
    const dt = t - k * janela - (0.2 + 0.6 * ((h * 7.31) % 1)) * janela;
    if (dt < 0 || dt > 0.6) return 0;
    return Math.min(1, Math.exp(-dt * 16) + (dt > 0.14 ? 0.6 * Math.exp(-(dt - 0.14) * 9) : 0)) * 0.8;
  }

  // Chamado pelo laço principal; respeita o limite de fps (modo jogo).
  passo(agora) {
    if (agora - this.ultimo < 1000 / this.fpsMax - 1) return;
    const dt = Math.min(0.1, (agora - this.ultimo) / 1000);
    this.fps = this.fps * 0.9 + (1 / Math.max(dt, 1e-3)) * 0.1;
    this.ultimo = agora;
    this.tempo += dt;
    this.desenhar(dt);
  }

  // cada fio nasce num ponto do céu, atravessa ondulando e some; quanto mais vento, mais fios e mais rápidos
  moverVento(dt) {
    const v = this.climaAtual.vento;
    this.vento.visible = !this.periodo && v > 0.03;
    if (!this.vento.visible) return;
    const quantos = Math.ceil(2 + v * 8);
    this.vento.children.forEach((l, i) => {
      const d = l.userData;
      if (!l.visible) {
        d.espera -= dt;
        if (d.espera > 0 || i >= quantos) return;
        d.x = -95 - Math.random() * 30; d.y = 5 + Math.random() * 24; d.z = -55 - Math.random() * 70;
        d.vel = 26 + Math.random() * 18; d.onda = 0.12 + Math.random() * 0.12; d.alt = 0.8 + Math.random() * 1.6; d.fase = Math.random() * 6.28; d.passo = 1.5 + Math.random();
        l.visible = true;
      }
      d.x += d.vel * (1 + v * 1.6) * dt;
      const p = l.geometry.attributes.position.array;
      for (let k = 0; k < 30; k++) {
        const x = d.x - k * d.passo;
        p[k * 3] = x;
        p[k * 3 + 1] = d.y + Math.sin(x * d.onda + d.fase + this.tempo * 1.4) * d.alt * Math.min(1, k / 8 + 0.2);
        p[k * 3 + 2] = d.z;
      }
      l.geometry.attributes.position.needsUpdate = true;
      if (d.x - 30 * d.passo > 110) { l.visible = false; d.espera = (1 + Math.random() * 7) * (1.4 - v); }
    });
  }

  // Liga o modo loop (segundos) ou desliga (0).
  loop(periodo) {
    this.periodo = periodo > 0 ? periodo : 0;
    this.agua.material.uniforms.uPeriodo.value = this.periodo;
    if (!this.periodo) for (const n of this.nuvens.children) n.position.x = n.userData.x0;
  }

  // Desenha exatamente o instante t (para gravar quadro a quadro, sem depender da velocidade da máquina).
  desenharEm(t) {
    this.tempo = t;
    this.desenhar(0);
  }

  desenhar(dt) {
    const P = this.periodo, volta = v => P ? Math.max(1, Math.round(v * P / (2 * Math.PI))) * 2 * Math.PI / P : v;   // velocidade que fecha voltas inteiras
    if (this.animarRuido) this.paleta.uniforms.uQuadro.value = P ? Math.floor(64 * this.tempo / P) % 64 : ++this.quadro % 64;

    this.agua.material.uniforms.uTempo.value = this.tempo;
    this.farol.facho.rotation.y = this.tempo * volta(0.8);
    // o céu desliza até o clima pedido; no modo loop e nas gravações fica só o que o tema manda
    const ca = this.climaAtual, suave = 1 - Math.exp(-dt * 0.5);
    for (const k of ['cobertura', 'vento', 'chuva', 'raios']) ca[k] += (this.clima[k] - ca[k]) * (dt ? suave : 1);
    this.chuva = P ? this.chuvaTema : Math.max(this.chuvaTema, ca.chuva);
    this.relampago = this.relampagoTema || (!P && ca.raios > 0.5);
    this.moverVento(dt);
    for (const n of this.nuvens.children) {
      const quer = P || n.userData.ordem < ca.cobertura ? 1 : 0;
      n.userData.f += (quer - n.userData.f) * (dt ? 1 - Math.exp(-dt * 0.4) : 1);
      if (P) n.position.x = n.userData.x0 + Math.sin(2 * Math.PI * this.tempo / P + n.userData.x0) * n.userData.v * P / (2 * Math.PI);   // vai e volta devagar
      else {
        n.position.x += n.userData.v * (1 + ca.vento * 4) * dt;
        if (n.position.x > 110) n.position.x = -110;
      }
    }
    this.camera.position.y = 2.8 + Math.sin(this.tempo * volta(0.6)) * 0.08;   // balanço leve
    this.iluminar(dt);

    this.renderer.setRenderTarget(this.alvo);
    this.renderer.render(this.cena, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.posCena, this.posCamera);

    // a cópia precisa acontecer logo depois de desenhar, antes do navegador limpar o quadro
    for (const cv of this.espelhos) {
      if (!cv.isConnected) { this.espelhos.delete(cv); continue; }
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.canvas, 0, 0, cv.width, cv.height);
    }
  }
}
