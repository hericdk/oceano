// Ilha — pós-processamento: a cena é desenhada pequena (pixel) num alvo com profundidade e
// um quadro de tela inteira aplica a estética (skill dither-chuva; estudo em skills/mundo-3d §6).
//   0 Studio G — o padrão (nome interno 'ghibli'): pintura de cenário dos filmes do Ghibli. Kuwahara generalizado
//              (manchas que respeitam bordas), verdes que vão de amarelo na luz a azul-petróleo na sombra, sombra
//              lavanda que nunca chega ao preto e luz quente (Gooch 1998), aquarela (pigmento em manchas e grão de
//              papel), contorno suave tingido, brilho suave nas luzes (bloom) e perspectiva aérea em tom de céu
//   1 Pixel    — paleta de console (PICO-8, NES, Atari, C64, CGA, Green Boy) pixelizado ordenado
//              entre as duas cores mais próximas (Bayer 4×4)
//   2 Tinta    — hachura por luminância, papel creme, azul no destaque
// Traço em três camadas: silhueta (salto de profundidade), vinco (mudança de inclinação, pela 2ª derivada
// de 1/profundidade, que é zero em superfície plana) e troca de cor. Vinco e cor saem com falhas, como à mão.
import * as THREE from '../../vendor/three.module.min.js';
import { PALETAS } from './paletas.js';

export const MODOS = ['ghibli', 'pixel', 'tinta'];

const frag = `
precision highp float;
uniform sampler2D tCor; uniform sampler2D tProf;
uniform vec2 res; uniform float near; uniform float far; uniform int modo;
uniform vec3 nevoa; uniform float nevoaForca; uniform vec3 papel;
uniform vec3 pal[64]; uniform int npal; uniform vec3 escuro;
uniform float saturacao; uniform float quente; uniform float faixas; uniform float kuwa; uniform float contorno;   // editor do mundo
uniform float bloom; uniform float aquarela;
varying vec2 vUv;
float prof(vec2 uv){ float z = texture2D(tProf, uv).x; float n = z * 2.0 - 1.0; return (2.0 * near * far) / (far + near - n * (far - near)); }
vec3 corEm(vec2 uv){ return pow(max(texture2D(tCor, uv).rgb, 0.0), vec3(1.0 / 2.2)); }   // o alvo guarda cor linear
float bayer(vec2 p){
  vec2 q = mod(floor(p), 4.0);
  int i = int(q.x + q.y * 4.0);
  float m[16];
  m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) if (k == i) return (m[k] + 0.5) / 16.0;
  return 0.5;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p){   // ruído de valor suave (manchas de pigmento)
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
bool acento(vec3 c){ return c.b > 0.45 && c.b - max(c.r, c.g) > 0.38 && c.r < 0.25; }
float dist2(vec3 a, vec3 b){ vec3 d = a - b; float r = (a.r + b.r) * 0.5; return (2.0 + r) * d.r * d.r + 4.0 * d.g * d.g + (3.0 - r) * d.b * d.b; }

// Kuwahara generalizado de 4 quadrantes: cada pixel recebe a média do quadrante menos variado
vec3 kuwahara(vec2 uv, vec2 px){
  vec3 m[4]; vec3 s[4];
  for (int q = 0; q < 4; q++) { m[q] = vec3(0.0); s[q] = vec3(0.0); }
  for (int j = 0; j <= 3; j++) for (int i = 0; i <= 3; i++) {
    vec3 a = corEm(uv + vec2(-i, -j) * px), b = corEm(uv + vec2(i, -j) * px), c = corEm(uv + vec2(-i, j) * px), d = corEm(uv + vec2(i, j) * px);
    m[0] += a; s[0] += a * a; m[1] += b; s[1] += b * b; m[2] += c; s[2] += c * c; m[3] += d; s[3] += d * d;
  }
  vec3 melhor = vec3(0.0); float mv = 1e9;
  for (int q = 0; q < 4; q++) {
    vec3 mu = m[q] / 16.0, va = abs(s[q] / 16.0 - mu * mu);
    float v = va.r + va.g + va.b;
    if (v < mv) { mv = v; melhor = mu; }
  }
  return melhor;
}

void main(){
  vec2 px = 1.0 / res;
  vec3 c = corEm(vUv);
  vec3 nev = pow(nevoa, vec3(1.0 / 2.2));
  bool fundo = texture2D(tProf, vUv).x >= 0.99999;
  float d0 = prof(vUv);
  vec2 p = floor(vUv * res);
  float b = bayer(p);
  float L = lum(c);
  // céu: a mesma névoa do horizonte (não 100%): as nuvens sobre o céu não gravam profundidade e sumiriam
  float neb = fundo ? clamp(nevoaForca, 0.0, 1.0) : clamp(smoothstep(near * 6.0, far * 0.75, d0) * nevoaForca, 0.0, 1.0);

  // ── traço ──
  float dl = prof(vUv - vec2(px.x, 0.)), dr = prof(vUv + vec2(px.x, 0.)), dd = prof(vUv - vec2(0., px.y)), du = prof(vUv + vec2(0., px.y));
  float sil = max(max(dl, dr), max(dd, du));
  float traco = smoothstep(0.035, 0.06, (sil - d0) / d0);
  float w0 = 1.0 / d0;
  float vx = abs(1.0 / dl + 1.0 / dr - 2.0 * w0) / w0, vy = abs(1.0 / dd + 1.0 / du - 2.0 * w0) / w0;
  float vinco = smoothstep(0.006, 0.016, max(vx, vy));
  vec3 cr = corEm(vUv + vec2(px.x, 0.)), cu = corEm(vUv + vec2(0., px.y));
  float borda = smoothstep(0.035, 0.07, max(dist2(c, cr), dist2(c, cu)) / 9.0);
  // falhas do traço à mão: blocos de ~5 px ligam e desligam (o peso respira por bloco, como na Rain)
  float falha = step(0.28, hash(floor(p / 5.0) + floor(d0 * 0.1)));
  float detalhe = max(vinco, borda) * falha * (1.0 - neb);

  vec3 o;
  if (modo == 0) {
    vec3 k = fundo || kuwa < 0.5 ? c : kuwahara(vUv, px);
    float Lk = lum(k);
    // verdes do Ghibli: na luz puxam para o verde-amarelo, na sombra para o verde-azulado
    // (pela proporção do verde, para pegar também as copas escuras)
    float verde = smoothstep(0.04, 0.18, (k.g - max(k.r, k.b)) / max(k.g, 0.04)) * (fundo ? 0.0 : 1.0);
    k = mix(k, mix(k * vec3(0.86, 0.98, 0.97), k * vec3(1.1, 1.06, 0.8), smoothstep(0.22, 0.58, Lk)), verde * 0.85);
    k = mix(vec3(lum(k)), k, saturacao);                                              // saturação nas cores médias
    // sombra lavanda que não chega ao preto, luz quente
    float som = 1.0 - smoothstep(0.12, 0.62, Lk);
    vec3 kSom = k * mix(vec3(0.86, 0.87, 1.0), vec3(0.9, 0.97, 0.94), verde) + mix(vec3(0.05, 0.045, 0.085), vec3(0.012, 0.035, 0.025), verde);   // na mata o fundo da sombra é verde-petróleo
    k = mix(k, mix(k * vec3(1.07, 1.02, 0.9), kSom, som), quente * (fundo ? 0.25 : 1.0));
    float faixa = (floor(Lk * 5.0 + 0.5)) / 5.0;
    k *= mix(1.0, faixa / max(Lk, 0.02), faixas);                                     // faixas suaves de luz (rampa)
    // aquarela: o pigmento assenta em manchas (duas escalas) e o papel tem grão
    float mancha = ruido(p * 0.045) * 0.6 + ruido(p * 0.13 + 7.0) * 0.4;
    k *= 1.0 + (mancha - 0.5) * 0.13 * aquarela;
    k += vec3(0.02, -0.005, -0.02) * (ruido(p * 0.02 + 3.0) - 0.5) * aquarela;        // leve troca de matiz entre manchas
    k += (hash(p) - 0.5) * 0.03 * aquarela;
    // contorno suave: tom mais escuro e frio da própria cor, nunca preto. As nuvens não gravam profundidade:
    // onde a cor é clara e quase sem matiz (nuvem por cima), o traço do chão atrás não atravessa
    float nuvem = smoothstep(0.62, 0.8, L) * (1.0 - smoothstep(0.08, 0.2, max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b))));
    float semTraco = (1.0 - neb) * (1.0 - nuvem);
    k = mix(k, k * vec3(0.5, 0.5, 0.66), traco * contorno * 0.85 * semTraco);
    k = mix(k, k * 0.86, vinco * falha * 0.45 * semTraco);
    // brilho suave: o que passa de 0.72 de luz vaza para os vizinhos (12 amostras em dois anéis)
    if (bloom > 0.01 && !fundo) {   // no céu não: ele já é a luz
      vec3 bl = vec3(0.0);
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 0.5236 + (i < 6 ? 0.0 : 0.26), rr = i < 6 ? 3.0 : 7.0;
        vec3 s = corEm(vUv + vec2(cos(a), sin(a)) * rr * px);
        bl += s * max(lum(s) - 0.72, 0.0);
      }
      k += bl / 12.0 * 2.2 * bloom * vec3(1.0, 0.97, 0.9);
    }
    // perspectiva aérea: o longe esfria e desbota para o tom do céu; o céu pintado aparece quase sem névoa
    k = mix(k, mix(vec3(lum(k)), k, 0.7) * vec3(0.9, 0.96, 1.08), neb * 0.7);
    o = mix(k, nev, fundo ? neb * 0.35 : neb);
  } else if (modo == 1) {
    vec3 cc = mix(vec3(L), c, 1.45);                                   // consoles antigos: cor forte antes de escolher na paleta
    cc = mix(cc, nev, step(0.55, neb) * 0.7);
    // as duas cores da paleta mais próximas; o Bayer decide entre elas pela posição de cc no segmento
    vec3 c1 = pal[0], c2 = pal[0]; float e1 = 1e9, e2 = 1e9;
    for (int i = 0; i < 64; i++) {
      if (i >= npal) break;
      float e = dist2(cc, pal[i]);
      if (e < e1) { e2 = e1; c2 = c1; e1 = e; c1 = pal[i]; }
      else if (e < e2) { e2 = e; c2 = pal[i]; }
    }
    vec3 seg = c2 - c1;
    float t = clamp(dot(cc - c1, seg) / max(dot(seg, seg), 1e-5), 0.0, 1.0);
    o = b < t ? c2 : c1;
    o = mix(o, escuro, step(0.5, traco) * (1.0 - step(0.6, neb)));
  } else {
    vec3 creme = papel * vec3(1.0, 0.97, 0.9);
    // borda de nanquim das nuvens (preto neutro da textura): só aparece contra o céu, que é papel como a nuvem;
    // sobre o chão a hachura já separa e a nuvem fica só branca
    float nanquim = step(L, 0.1) * step(max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)), 0.04);
    if (fundo) o = L < 0.25 ? vec3(0.08) : creme;
    else if (nanquim > 0.5) o = creme;
    else if (acento(c)) o = vec3(0.0, 0.25, 1.0);
    else {
      float s1 = mod(p.x + p.y, 4.0) < 1.0 ? 1.0 : 0.0;
      float s2 = mod(p.x - p.y, 4.0) < 1.0 ? 1.0 : 0.0;
      float tinta = (L < 0.62 ? s1 : 0.0) + (L < 0.38 ? s2 : 0.0) + (L < 0.18 ? 1.0 : 0.0);
      o = mix(creme, vec3(0.08), clamp(tinta, 0.0, 1.0));
    }
    o = mix(o, vec3(0.05), max(traco * (1.0 - neb * 0.7), detalhe * 0.9));
    o = mix(o, creme, fundo ? 0.0 : neb * 0.85);
  }
  gl_FragColor = vec4(o, 1.0);
}`;

export function criarPos(renderer) {
  const alvo = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  alvo.depthTexture = new THREE.DepthTexture(4, 4);
  alvo.depthTexture.type = THREE.UnsignedIntType;
  alvo.texture.colorSpace = THREE.SRGBColorSpace;
  const pal = Array.from({ length: 64 }, () => new THREE.Vector3());
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tCor: { value: alvo.texture }, tProf: { value: alvo.depthTexture }, res: { value: new THREE.Vector2(4, 4) },
      near: { value: 0.5 }, far: { value: 2000 }, modo: { value: 0 },
      nevoa: { value: new THREE.Color(0xbcd3e6) }, nevoaForca: { value: 0.7 }, papel: { value: new THREE.Color(0xffffff) },
      pal: { value: pal }, npal: { value: 1 }, escuro: { value: new THREE.Vector3() },
      saturacao: { value: 1.2 }, quente: { value: 1 }, faixas: { value: 0.15 }, kuwa: { value: 1 }, contorno: { value: 0.55 },
      bloom: { value: 0.8 }, aquarela: { value: 1 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: frag,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const cenaPos = new THREE.Scene(); cenaPos.add(quad);
  const camPos = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const api = {
    material,
    // paleta do modo Pixel (cores em sRGB 0..1); o traço usa a cor mais escura dela
    paleta(id) {
      const cores = (PALETAS[id] || PALETAS.pico8).cores.slice(0, 64);
      let esc = null, le = 9;
      cores.forEach((h, i) => {
        const v = pal[i].set((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255);
        const l = v.x * 0.299 + v.y * 0.587 + v.z * 0.114;
        if (l < le) { le = l; esc = v; }
      });
      material.uniforms.npal.value = cores.length;
      material.uniforms.escuro.value.copy(esc);
    },
    // Oceano: paleta vinda do tema (lista de cores 0xRRGGBB)
    paletaCores(cores) {
      cores = cores.slice(0, 64);
      let esc = null, le = 9;
      cores.forEach((h, i) => {
        const v = pal[i].set((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255);
        const l = v.x * 0.299 + v.y * 0.587 + v.z * 0.114;
        if (l < le) { le = l; esc = v; }
      });
      material.uniforms.npal.value = cores.length;
      material.uniforms.escuro.value.copy(esc);
    },
    tamanho(w, h, pixel) {
      const W = Math.max(2, Math.floor(w / pixel)), H = Math.max(2, Math.floor(h / pixel));
      alvo.setSize(W, H);
      material.uniforms.res.value.set(W, H);
    },
    desenhar(cena, cam) {
      material.uniforms.near.value = cam.near; material.uniforms.far.value = cam.far;
      renderer.setRenderTarget(alvo);
      renderer.render(cena, cam);
      renderer.setRenderTarget(null);
      renderer.render(cenaPos, camPos);
    },
  };
  api.paleta('pico8');
  return api;
}
