// O fundo da saudação: um farol à noite, em pixel. O facho gira devagar e o tom intermediário é sempre trama, nunca cor nova.
const COR = {
  ceu: [6, 8, 18], ceu2: [12, 16, 34], estrela: [120, 130, 160],
  mar: [8, 12, 28], mar2: [14, 20, 44], brilho: [52, 62, 92],
  pedra: [3, 4, 9], claro: [74, 82, 108], escuro: [24, 28, 46], luz: [255, 209, 102],
  facho: [28, 34, 60], facho2: [52, 58, 84],
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const trama = (x, y) => (BAYER[(y % 4) * 4 + (x % 4)] + .5) / 16;
const acaso = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function farolDaNoite(c) {
  const g = c.getContext('2d');
  let vivo = true, W = 0, H = 0, base = null, img = null, lx = 0, ly = 0, horizonte = 0, ultimo = 0;

  const montar = () => {
    W = 320;
    const r = c.getBoundingClientRect();
    H = Math.max(150, Math.min(420, Math.round(W * (r.height || 720) / (r.width || 1280))));
    c.width = W; c.height = H;
    img = g.createImageData(W, H); base = new Uint8ClampedArray(W * H * 4);
    horizonte = Math.round(H * .8);
    const u = Math.min(W, H) / 180;
    const fx = Math.round(W * (W / H < 1 ? .74 : .9));
    const alto = Math.round(68 * u), baseL = Math.round(11 * u), topoL = Math.round(7 * u);
    const pedraY = horizonte - Math.round(7 * u);
    const topo = pedraY - alto;
    lx = fx; ly = topo - Math.round(5 * u);
    const por = (x, y, cor) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const p = (y * W + x) * 4; base[p] = cor[0]; base[p + 1] = cor[1]; base[p + 2] = cor[2]; base[p + 3] = 255; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (y < horizonte) {
        por(x, y, y / horizonte > trama(x, y) * .9 + .1 ? COR.ceu2 : COR.ceu);
        if (acaso(x, y) > .9972 && y < horizonte * .8) por(x, y, COR.estrela);
      } else por(x, y, (y - horizonte) / (H - horizonte) > trama(x, y) ? COR.mar2 : COR.mar);
    }
    // a pedra
    for (let x = -Math.round(32 * u); x <= Math.round(36 * u); x++) {
      const borda = Math.abs(x) / (36 * u), alt = (1 - borda * borda) * 9 * u + Math.sin(x * .7) * u;
      for (let y = Math.round(horizonte - alt); y <= horizonte + 1; y++) por(fx + x, y, COR.pedra);
    }
    // a torre listrada, mais fina em cima; a luz da lua vem da esquerda
    for (let y = topo; y <= pedraY; y++) {
      const k = (y - topo) / alto, meia = Math.round(topoL / 2 + (baseL - topoL) / 2 * k);
      const faixa = Math.floor(k * 5) % 2 === 0;
      for (let x = -meia; x <= meia; x++) {
        const lado = (x + meia) / (meia * 2 || 1);
        let cor = faixa ? COR.claro : COR.escuro;
        if (lado > .55 && lado > trama(fx + x, y) * .5 + .5) cor = faixa ? COR.escuro : COR.pedra;
        por(fx + x, y, cor);
      }
    }
    // a varanda e a lanterna
    const meiaTopo = Math.round(topoL / 2);
    for (let x = -meiaTopo - 2; x <= meiaTopo + 2; x++) por(fx + x, topo - 1, COR.pedra);
    for (let y = ly - Math.round(3 * u); y < topo - 1; y++) for (let x = -meiaTopo; x <= meiaTopo; x++) por(fx + x, y, COR.luz);
    const copa = Math.round(3 * u);
    for (let y = 0; y < copa; y++) for (let x = -(meiaTopo - y); x <= meiaTopo - y; x++) por(fx + x, ly - Math.round(3 * u) - y - 1, COR.pedra);
  };

  const pintar = t => {
    const d = img.data;
    d.set(base);
    const giro = t / 5200, dirX = Math.cos(giro), frente = Math.abs(Math.sin(giro));
    const alcance = Math.abs(dirX) * W * 1.05, abre = .13 + frente * .07;
    const claro = (p, cor) => { d[p] = cor[0]; d[p + 1] = cor[1]; d[p + 2] = cor[2]; };
    // o facho vai dos dois lados da lanterna; o mar e a torre ficam na frente dele
    for (let y = 0; y < horizonte; y++) for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      if (d[p] === COR.pedra[0] && d[p + 1] === COR.pedra[1]) continue;
      if (d[p] > COR.estrela[0] - 1 || (d[p] === COR.claro[0] && d[p + 1] === COR.claro[1])) continue;
      if (d[p] === COR.escuro[0] && d[p + 1] === COR.escuro[1]) continue;
      const dx = x - lx, dy = y - ly, longe = Math.abs(dx);
      const i = alcance > 1 ? Math.max(0, 1 - longe / alcance) : 0;
      const meia = 1.5 + longe * abre, v = Math.abs(dy) / meia;
      const atras = dx * dirX < 0 ? .55 : 1;
      const forca = v < 1 ? (1 - v) * Math.sqrt(i) * atras * .95 : 0;
      const halo = Math.max(0, 1 - Math.hypot(dx, dy) / (10 + frente * 16)) * (.35 + frente * .55);
      const f = Math.max(forca, halo), lim = trama(x, y);
      if (f > lim + .45) claro(p, COR.facho2);
      else if (f > lim * .7) claro(p, COR.facho);
    }
    // o reflexo da lanterna e os brilhos do mar
    const tempo = Math.floor(t / 420);
    for (let y = horizonte; y < H; y++) {
      const fundo = (y - horizonte) / (H - horizonte);
      for (let x = 0; x < W; x++) {
        const passo = Math.floor(x / (3 + fundo * 8));
        const perto = Math.max(0, 1 - Math.abs(x - lx) / (5 + fundo * 26));
        if (acaso(passo + tempo * ((y % 3) - 1), y) > .985 - perto * .5) claro((y * W + x) * 4, perto > .05 ? COR.luz : COR.brilho);
      }
    }
    g.putImageData(img, 0, 0);
  };

  const quadro = agora => {
    if (!vivo) return;
    requestAnimationFrame(quadro);
    if (agora - ultimo < 80) return;
    ultimo = agora;
    pintar(quieto() ? 9000 : agora);
  };
  const medir = () => montar();
  montar();
  addEventListener('resize', medir);
  requestAnimationFrame(quadro);
  return () => { vivo = false; removeEventListener('resize', medir); };
}
