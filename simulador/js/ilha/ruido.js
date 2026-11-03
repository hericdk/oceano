// Ilha — acaso com semente e ruído (sem bibliotecas): o mesmo número gera sempre o mesmo mundo.

// gerador pseudoaleatório com semente (mulberry32)
export function rng(semente) {
  let a = (typeof semente === 'string' ? [...semente].reduce((s, c) => Math.imul(s ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703) : semente) >>> 0;
  const f = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.entre = (x, y) => x + f() * (y - x);
  f.int = (x, y) => Math.floor(x + f() * (y - x + 1));
  f.escolher = lista => lista[Math.floor(f() * lista.length)];
  return f;
}

// ruído simplex 2D (Stefan Gustavson, domínio público), com permutação gerada pela semente
export function simplex2(aleatorio) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(aleatorio() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const GX = new Float64Array([1, -1, 1, -1, 1, -1, 0, 0]), GY = new Float64Array([1, 1, -1, -1, 0, 0, 1, -1]);
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  // canto do simplex: contribuição sem criar arrays (esta função roda centenas de milhares de vezes)
  const canto = (x, y, gi) => { let t = 0.5 - x * x - y * y; if (t <= 0) return 0; t *= t; gi &= 7; return t * t * (GX[gi] * x + GY[gi] * y); };
  return (xin, yin) => {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    return 70 * (canto(x0, y0, perm[ii + perm[jj]]) + canto(x1, y1, perm[ii + i1 + perm[jj + j1]]) + canto(x2, y2, perm[ii + 1 + perm[jj + 1]]));   // ~ -1..1
  };
}

// fbm: várias oitavas somadas (detalhe fino por cima da forma grande)
export function fbm(ruido, x, y, oitavas = 5, ganho = 0.5, lac = 2.0) {
  let soma = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < oitavas; o++) { soma += amp * ruido(x * freq, y * freq); norm += amp; amp *= ganho; freq *= lac; }
  return soma / norm;
}
