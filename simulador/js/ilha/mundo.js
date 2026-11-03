// Ilha — gerador do mundo por semente: terreno em níveis, rios, campos, florestas, vilas (uma por grupo) e caminhos.
// Padrões em biblioteca/skills/mundo-3d/SKILL.md. Técnicas do No Man Sky FM: cor por triângulo (low poly sem custo),
// curva de altura (planície baixa, pico íngreme), árvores em InstancedMesh.
import * as THREE from '../../vendor/three.module.min.js';
import { rng, simplex2, fbm } from './ruido.js';

export const TAM = 600;            // lado do mundo (continente que ocupa a tela, mar só nas bordas, baías e lagos)
export const N = 220;              // células por lado (~2,7 unidades cada)
const CEL = TAM / N;

// cores-base (a paleta final de cada estética é aplicada no pós-processamento)
export const COR = {
  agua: 0x2f7fc1, aguaRasa: 0x5fb3d8, areia: 0xe8d9a6, fundos: [0xa9d8c4, 0x6fbcbf, 0x3f8fae, 0x2a6390], grama: 0x7cbf4e, gramaEscura: 0x4f9a3c,
  floresta: 0x2f6e35, rocha: 0x8a8f86, neve: 0xf4f6f2, terra: 0x9b7a4c,
  campos: [0xe6c84a, 0xd6dc6a, 0x9fcf5a, 0xb08a52, 0xc9b24c],
  parede: 0xf1e9d6, paredeSombra: 0xd8ccb0, janela: 0x3b3f4a, porta: 0x6b4a2e,
  telhados: [0xc0563a, 0xa8482f, 0x8c5a3c, 0x6d7382, 0xb86a3e], caminho: 0xd9c79a, trilho: 0x5a4e44,
};

export function gerarMundo({ semente, grupos, central = [], graficos = 'novo' }) {
  const novo = graficos === 'novo';
  const r = rng(semente), ruido = simplex2(r), ruido2 = simplex2(r), ruido3 = simplex2(r);

  // ── altura: fbm + máscara de continente + níveis (desníveis) + curva do NMS (pico íngreme) ──
  const H = new Float32Array((N + 1) * (N + 1));
  const idx = (i, j) => j * (N + 1) + i;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = i * CEL - TAM / 2, z = j * CEL - TAM / 2;
    const d = Math.hypot(x, z) / (TAM / 2);
    // continente: terra na maior parte; o mar entra pelas bordas (máscara só depois de 70% do raio) e por baías e lagos do ruído
    let e = fbm(ruido, x * 0.0042, z * 0.0042, 5) * 0.9 + 0.3 - Math.max(0, d - 0.7) ** 2 * 6;
    // terraços: platôs com bordas de penhasco (a parte fracionária vira uma rampa curta e íngreme)
    const n7 = e * 7, base = Math.floor(n7), frac = n7 - base;
    const degrau = (base + Math.min(1, Math.max(0, (frac - 0.78) / 0.22))) / 7;
    e = e * 0.25 + degrau * 0.75;
    H[idx(i, j)] = e < 0 ? e * 22 : e * 40 + Math.max(0, e - 0.45) ** 2 * 120;
    // relevo fino: colinas e ondulações para o chão não ficar reto (só na versão nova; a água e a costa ficam como estão)
    if (novo && H[idx(i, j)] > 1.2) H[idx(i, j)] += (fbm(ruido, x * 0.022 + 40, z * 0.022, 3) * 4.5 + fbm(ruido, x * 0.07, z * 0.07 + 40, 2) * 0.55) * Math.min(1, (H[idx(i, j)] - 1.2) / 3);
  }
  const altura = (x, z) => {
    const fi = (x + TAM / 2) / CEL, fj = (z + TAM / 2) / CEL;
    const i = Math.max(0, Math.min(N - 1, Math.floor(fi))), j = Math.max(0, Math.min(N - 1, Math.floor(fj)));
    const u = fi - i, v = fj - j;
    return (H[idx(i, j)] * (1 - u) + H[idx(i + 1, j)] * u) * (1 - v) + (H[idx(i, j + 1)] * (1 - u) + H[idx(i + 1, j + 1)] * u) * v;
  };

  // ── rios: descem pela encosta mais íngreme até o mar, cavando o leito ──
  const rios = [];
  const leito = new Uint8Array((N + 1) * (N + 1));   // células de rio e margem: sem árvore
  for (let k = 0, tentativas = 0; k < 4 && tentativas < 200; tentativas++) {
    const i0 = r.int(10, N - 10), j0 = r.int(10, N - 10);
    if (H[idx(i0, j0)] < 18 || H[idx(i0, j0)] > 40) continue;   // nasce abaixo da neve
    const pts = []; let i = i0, j = j0;
    for (let passo = 0; passo < 400; passo++) {
      pts.push([i, j]);
      if (H[idx(i, j)] < -0.5) break;
      let mi = i, mj = j, mh = Infinity;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 1 || nj < 1 || ni >= N || nj >= N) continue;
        const hh = H[idx(ni, nj)] + r() * 0.35;
        if (hh < mh) { mh = hh; mi = ni; mj = nj; }
      }
      if (mh >= H[idx(i, j)]) H[idx(mi, mj)] = H[idx(i, j)] - 0.15;   // poço: cava para seguir descendo
      i = mi; j = mj;
    }
    if (pts.length < 25) continue;
    for (const [pi, pj] of pts) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const q = idx(Math.min(N, Math.max(0, pi + di)), Math.min(N, Math.max(0, pj + dj)));
      H[q] -= di || dj ? 0.6 : 1.4;                                   // leito
      leito[q] = 1;
    }
    rios.push(pts.map(([pi, pj]) => new THREE.Vector3(pi * CEL - TAM / 2, 0, pj * CEL - TAM / 2)));
    k++;
  }

  // ── rio grande: nascente na montanha → lago → mar, ao menos um por mapa (com 3 lagos ou mais, 1 ou 2) ──
  // Sorteio próprio, para não mexer no resto do mapa da semente.
  const rr = rng(semente + ':rios');
  const W = N + 1, nC = W * W;
  const vizinhos = q => { const i = q % W, j = (q - i) / W, v = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && i + di >= 0 && j + dj >= 0 && i + di <= N && j + dj <= N) v.push(q + di + dj * W); return v; };
  // água em pedaços ligados: o que encosta na borda é mar, o resto é lago
  const pedacos = () => {
    const rot = new Int32Array(nC).fill(-1), lagos = []; let mar = -1;
    for (let q0 = 0; q0 < nC; q0++) {
      if (rot[q0] !== -1 || H[q0] >= 0) continue;
      const id = lagos.length + 1, fila = [q0], cel = []; rot[q0] = id; let borda = false;
      while (fila.length) {
        const q = fila.pop(); cel.push(q);
        const i = q % W, j = (q - i) / W;
        if (i === 0 || j === 0 || i === N || j === N) borda = true;
        for (const v of vizinhos(q)) if (rot[v] === -1 && H[v] < 0) { rot[v] = id; fila.push(v); }
      }
      lagos.push({ id, cel, borda });
    }
    return { rot, mar: lagos.filter(l => l.borda), lagos: lagos.filter(l => !l.borda && l.cel.length >= 12) };
  };
  // distância (em passos) até um conjunto de células; `soTerra` não deixa o caminho atravessar outra água
  const distancia = (alvo, soTerra = false) => {
    const d = new Int32Array(nC).fill(1e9), fila = [...alvo]; for (const q of alvo) d[q] = 0;
    for (let k = 0; k < fila.length; k++) for (const v of vizinhos(fila[k])) if (d[v] > d[fila[k]] + 1 && (!soTerra || H[v] >= 0)) { d[v] = d[fila[k]] + 1; fila.push(v); }
    return d;
  };
  // desce pelo gradiente da distância, escolhendo o vizinho mais baixo (com um pouco de meandro)
  const descer = (q, d) => {
    const cam = [q];
    for (let passo = 0; passo < 600 && d[q] > 0; passo++) {
      let m = -1, mh = Infinity;
      for (const v of vizinhos(q)) if (d[v] < d[q]) { const hh = H[v] + rr() * 2.5; if (hh < mh) { mh = hh; m = v; } }
      if (m < 0) break;
      q = m; cam.push(q);
    }
    return cam;
  };
  // cava o leito sempre descendo (corta as cristas no caminho, como um vale) e abaixa as margens
  const cavar = cam => {
    let h = H[cam[0]];
    for (const q of cam) {
      h = Math.max(-1.2, Math.min(h - 0.04, H[q] - 0.8));
      H[q] = h;
      const i = q % W, j = (q - i) / W;
      for (const v of vizinhos(q)) leito[v] = 1;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
        if ((!di && !dj) || i + di < 0 || j + dj < 0 || i + di > N || j + dj > N) continue;
        const v = q + di + dj * W;
        H[v] = Math.min(H[v], h + (Math.max(Math.abs(di), Math.abs(dj)) === 1 ? 0.5 : 2.2));
      }
    }
  };
  const paraV = pts => pts.map(([i, j]) => new THREE.Vector3(i * CEL - TAM / 2, 0, j * CEL - TAM / 2));
  // células por onde passa uma linha (amostrada a cada meia célula), em ordem, sem repetir
  const celulasDe = pts => {
    const cel = [];
    for (const [i, j] of pts) {
      const q = idx(Math.max(0, Math.min(N, Math.round(i))), Math.max(0, Math.min(N, Math.round(j))));
      if (cel[cel.length - 1] !== q) cel.push(q);
    }
    return cel;
  };
  // serpenteia: tira o zigue-zague da grade, reamostra e desloca de lado numa onda (meandros que somem nas pontas).
  // Com `dividir`, um trecho do meio abre em 2 ou 3 braços que se juntam de novo (ilhas entre eles).
  const serpentear = (cam, dividir, amp) => {
    let pts = cam.map(q => [q % W, Math.floor(q / W)]);
    pts = pts.map((_, k) => {   // média móvel
      if (k < 2 || k > pts.length - 3) return pts[k];
      let x = 0, z = 0, c = 0;
      for (let m = Math.max(0, k - 4); m <= Math.min(pts.length - 1, k + 4); m++) { x += pts[m][0]; z += pts[m][1]; c++; }
      return [x / c, z / c];
    });
    const re = [pts[0]];   // reamostra a cada meia célula
    for (let k = 1; k < pts.length; k++) {
      const [ax, az] = pts[k - 1], [bx, bz] = pts[k], L = Math.hypot(bx - ax, bz - az);
      for (let u = 0.5; u <= L; u += 0.5) re.push([ax + (bx - ax) * u / L, az + (bz - az) * u / L]);
    }
    re.push(pts[pts.length - 1]);
    const n = re.length;
    const fase = rr() * 6.28, onda = 20 + rr() * 12, fase2 = rr() * 6.28;
    const desloca = (k, extra = 0) => {
      const a = re[Math.max(0, k - 3)], b = re[Math.min(n - 1, k + 3)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      const t = k / (n - 1), s = k * 0.5, env = Math.pow(Math.sin(Math.PI * t), 0.6);
      const o = amp * env * (Math.sin(s * 6.283 / onda + fase) + 0.35 * Math.sin(s * 6.283 / (onda * 0.43) + fase2)) + extra;
      return [re[k][0] - dz / L * o, re[k][1] + dx / L * o];
    };
    const linha = re.map((_, k) => desloca(k));
    const trecho = (pts, t0, t1, fino = false) => ({ pts, cel: celulasDe(pts), t0, t1, fino });
    if (!dividir || n < 90) return [trecho(linha, 0, 1)];
    const k1 = Math.floor(n * (0.3 + rr() * 0.15)), k2 = Math.min(n - 10, k1 + Math.floor((26 + rr() * 18) * 2));
    const nb = rr() < 0.4 ? 3 : 2, B = nb === 2 ? 7 : 5;
    const out = [trecho(linha.slice(0, k1 + 1), 0, k1 / (n - 1))];
    for (let b = 0; b < nb; b++) {
      const lado = (b - (nb - 1) / 2) * B, br = [];
      for (let k = k1; k <= k2; k++) { const u = (k - k1) / (k2 - k1); br.push(desloca(k, lado * Math.pow(Math.sin(Math.PI * u), 0.7))); }
      out.push(trecho(br, k1 / (n - 1), k2 / (n - 1), true));
    }
    out.push(trecho(linha.slice(k2), k2 / (n - 1), 1));
    return out;
  };
  {
    let { mar, lagos } = pedacos();
    if (mar.length) {
      const celMar = mar.flatMap(l => l.cel);
      let dMar = distancia(celMar);
      if (!lagos.length) {
        // sem lago: abre uma bacia na planície, longe do mar
        let melhor = -1, mv = -1;
        for (let t = 0; t < 400; t++) { const q = rr.int(0, nC - 1); if (H[q] > 1.5 && H[q] < 12 && dMar[q] > 18 && dMar[q] < 60 && dMar[q] > mv) { mv = dMar[q]; melhor = q; } }
        if (melhor >= 0) {
          const ci = melhor % W, cj = (melhor - ci) / W, ra = rr.int(5, 8);
          for (let j = cj - ra - 2; j <= cj + ra + 2; j++) for (let i = ci - ra - 2; i <= ci + ra + 2; i++) {
            if (i < 1 || j < 1 || i >= N || j >= N) continue;
            const dd = Math.hypot(i - ci, (j - cj) * 1.25) + ruido(i * 0.3, j * 0.3) * 1.5;
            if (dd < ra) H[idx(i, j)] = Math.min(H[idx(i, j)], -0.6 - (ra - dd) * 0.45);
            else if (dd < ra + 2) H[idx(i, j)] = Math.min(H[idx(i, j)], 0.4 + (dd - ra) * 0.6);
          }
          ({ lagos } = pedacos());
        }
      }
      const quantos = lagos.length >= 3 ? rr.int(1, 2) : Math.min(1, lagos.length);
      const escolhidos = [...lagos].sort((a, b) => b.cel.length - a.cel.length).slice(0, quantos);
      for (const lago of escolhidos) {
        const dLago = distancia(lago.cel, true);
        // nascente: célula alta (montanha), mas abaixo da neve (> 44 é branco), a uma distância boa do lago
        let fonte = -1, fv = -Infinity;
        for (let t = 0; t < 600; t++) {
          const q = rr.int(0, nC - 1), dl = dLago[q];
          if (H[q] < 20 || H[q] > 38 || dl < 25 || dl > 95) continue;
          const nota = H[q] * 0.5 - Math.abs(dl - 55) * 0.4 + rr() * 4;
          if (nota > fv) { fv = nota; fonte = q; }
        }
        if (fonte < 0) continue;
        for (const tr of serpentear(descer(fonte, dLago), true, 5)) {
          cavar(tr.cel);
          rios.push(Object.assign(paraV(tr.pts), { grande: true, t0: tr.t0, t1: tr.t1, fino: tr.fino }));
        }
        // veios: filetes que caem da pedra acima da nascente e se espalham até o rio (cascatas, sem neve)
        const fi = fonte % W, fj = Math.floor(fonte / W), hf = H[fonte];
        for (let v = 0, t = 0; v < 5 && t < 400; t++) {
          const i = fi + rr.int(-34, 34), j = fj + rr.int(-34, 34);
          if (i < 2 || j < 2 || i > N - 2 || j > N - 2) continue;
          const q0 = idx(i, j);
          if (H[q0] < hf + 2 || H[q0] > 43 || leito[q0]) continue;
          // desce rumo ao lago (não trava nos platôs) e para ao encontrar o rio
          const todo = descer(q0, dLago), k = todo.findIndex(q => leito[q]);
          if (k < 8) continue;   // só os que caem no rio
          const cam = todo.slice(0, k + 1);
          const [tr] = serpentear(cam, false, 1.2);
          if (tr.cel.some(q => H[q] > 42)) continue;   // nada de água na neve (nem nas curvas)
          for (const c of tr.cel) { H[c] -= 0.35; leito[c] = 1; }
          rios.push(Object.assign(paraV(tr.pts), { veio: true }));
          v++;
        }
        // saída: da margem do lago mais perto do mar até o mar, num canal no nível da água
        const boca = lago.cel.reduce((m, q) => dMar[q] < dMar[m] ? q : m, lago.cel[0]);
        const [sai] = serpentear(descer(boca, dMar), false, 3);
        for (const q of sai.cel) { H[q] = Math.min(H[q], -1.2); for (const v of vizinhos(q)) { H[v] = Math.min(H[v], 0.2); leito[v] = 1; } }
        rios.push(Object.assign(paraV(sai.pts), { grande: true, noNivel: true }));
        dMar = distancia(celMar);
      }
    }
  }

  const mirantes = [];   // as cenas prontas (porto, telhado…) saíram em 2026-10-31: a vida agora acontece nas vilas

  // ── grade hexagonal escondida: a lógica do mapa (bioma por célula + regras de vizinhança).
  // Nunca aparece como forma: o terreno lê a célula com a coordenada torta pelo ruído. ──
  const S = 9, R3 = Math.sqrt(3);
  const chave = (q, rr) => (q + 4096) * 8192 + (rr + 4096);   // chave numérica (bem mais rápida que texto)
  const centro = (q, rr) => [S * R3 * (q + rr / 2), S * 1.5 * rr];
  const celulaDe = (x, z) => {
    let q = (R3 / 3 * x - z / 3) / S, rr = (2 / 3 * z) / S, s3 = -q - rr;
    let rq = Math.round(q), rr2 = Math.round(rr); const rs = Math.round(s3);
    const dq = Math.abs(rq - q), dr = Math.abs(rr2 - rr), ds = Math.abs(rs - s3);
    if (dq > dr && dq > ds) rq = -rr2 - rs; else if (dr > ds) rr2 = -rq - rs;
    return celulas.get(chave(rq, rr2));
  };
  const VIZ = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const celulas = new Map();
  const lim = Math.ceil(TAM / S);
  for (let rr = -lim; rr <= lim; rr++) for (let q = -lim; q <= lim; q++) {
    const [x, z] = centro(q, rr);
    if (Math.abs(x) > TAM / 2 + S || Math.abs(z) > TAM / 2 + S) continue;
    const h = altura(x, z), f = ruido2(x * 0.012, z * 0.012), u = ruido3(x * 0.009, z * 0.009);
    const bioma = h < 0.5 ? 'agua' : h > 44 ? 'neve' : h > 30 ? 'pedra' : f > 0.1 ? 'floresta' : u > 0.05 && h < 16 ? 'campo' : 'prado';
    celulas.set(chave(q, rr), { q, r: rr, x, z, h, bioma, giro: r() * Math.PI });
  }
  const vizinhas = c => VIZ.map(([a, b]) => celulas.get(chave(c.q + a, c.r + b))).filter(Boolean);
  // regras: manchas se agrupam (maioria dos vizinhos vence), praia encosta na água,
  // campo não encosta direto na floresta (entre eles nasce prado), pedra cerca a neve
  for (let passo = 0; passo < 2; passo++) {
    const novo = new Map();
    for (const c of celulas.values()) {
      if (c.bioma === 'agua' || c.bioma === 'neve' || c.bioma === 'pedra') continue;
      const conta = {};
      for (const v of vizinhas(c)) conta[v.bioma] = (conta[v.bioma] || 0) + 1;
      const [top, n] = Object.entries(conta).sort((a, b) => b[1] - a[1])[0] || [];
      if (n >= 4 && top !== 'agua' && top !== c.bioma && top !== 'neve' && top !== 'pedra') novo.set(c, top);
    }
    for (const [c, b] of novo) c.bioma = b;
  }
  for (const c of celulas.values()) {
    const viz = vizinhas(c).map(v => v.bioma);
    if (c.bioma !== 'agua' && c.h < 3 && viz.includes('agua')) c.bioma = 'praia';
    else if (c.bioma === 'campo' && viz.includes('floresta')) c.bioma = 'prado';
  }

  // ── vilas: lugares planos, secos e afastados; tamanho pelo número de conversas ──
  const plano = (x, z) => { const h = altura(x, z); let m = 0; for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) m = Math.max(m, Math.abs(altura(x + dx, z + dz) - h)); return { h, m }; };
  const vilas = [];
  let castelo = null;
  const lista = [{ id: 'central', nome: 'Oceano', agentes: central, central: true }, ...grupos];
  for (const g of lista) {
    let melhor = null;
    // O Castelo da Cara: sempre no ponto mais alto da ilha. Regra fixa: mod ou editor de mapa pode mudar o que quiser,
    // mas o castelo é colocado por último neste ponto, com o terreno em volta aplainado e o jardim dele.
    if (g.central && novo) {
      let topo = null, mais = -Infinity;
      for (const c of celulas.values()) { if (Math.abs(c.x) > TAM * 0.4 || Math.abs(c.z) > TAM * 0.4) continue; const h = altura(c.x, c.z); if (h > mais) { mais = h; topo = c; } }
      if (topo) {
        const R = 16, nivel = mais + 2;
        for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
          const x = i * CEL - TAM / 2, z = j * CEL - TAM / 2, d = Math.hypot(x - topo.x, z - topo.z);
          if (d > R + 16) continue;
          const t = d < R ? 0 : (d - R) / 16, s = t * t * (3 - 2 * t);
          H[idx(i, j)] = nivel * (1 - s) + H[idx(i, j)] * s; leito[idx(i, j)] = 0;
        }
        topo.vila = g.id; topo.bioma = 'vila';
        castelo = Object.freeze({ x: topo.x, z: topo.z, h: nivel, raio: R });
        vilas.push({ ...g, x: topo.x, z: topo.z, h: nivel, casas: [], castelo });
        continue;
      }
    }
    for (const cel of celulas.values()) {
      if (mirantes.some(m => Math.hypot(cel.x - m.x, cel.z - m.z) < 50)) continue;
      if (cel.vila || !(cel.bioma === 'prado' || cel.bioma === 'campo') || Math.abs(cel.x) > TAM * 0.38 || Math.abs(cel.z) > TAM * 0.38) continue;
      const x = cel.x + r.entre(-3, 3), z = cel.z + r.entre(-3, 3);
      const { h, m } = plano(x, z);
      if (h < 1.5 || h > 26 || m > 2.2) continue;
      const longe = Math.min(...vilas.map(v => Math.hypot(v.x - x, v.z - z)), 999);
      if (longe < 40) continue;
      const nota = -m * 3 - Math.abs(h - 8) * 0.3 + Math.min(longe, 120) * 0.02;
      if (!melhor || nota > melhor.nota) melhor = { x, z, h, nota, cel };
    }
    if (!melhor) continue;
    melhor.cel.vila = g.id; melhor.cel.bioma = 'vila';
    for (const v of vizinhas(melhor.cel)) if (v.bioma === 'prado' || v.bioma === 'floresta') v.bioma = 'campo';   // roças em volta da vila
    vilas.push({ ...g, x: melhor.x, z: melhor.z, h: melhor.h, casas: [] });
  }

  // ── caminhos: árvore mínima entre as vilas + um atalho; A* na grade, evitando água e ladeira ──
  const ligacoes = [];
  const dentro = new Set([0]);
  while (dentro.size < vilas.length) {
    let par = null, d = Infinity;
    for (const a of dentro) for (let b = 0; b < vilas.length; b++) {
      if (dentro.has(b)) continue;
      const dd = Math.hypot(vilas[a].x - vilas[b].x, vilas[a].z - vilas[b].z);
      if (dd < d) { d = dd; par = [a, b]; }
    }
    ligacoes.push(par); dentro.add(par[1]);
  }
  if (vilas.length > 3) ligacoes.push([1, vilas.length - 1]);
  const paraCel = v => [Math.round((v.x + TAM / 2) / CEL), Math.round((v.z + TAM / 2) / CEL)];
  const caminhos = ligacoes.map(([a, b]) => ({ a, b, pts: estrela(H, idx, paraCel(vilas[a]), paraCel(vilas[b])).map(([i, j]) => new THREE.Vector3(i * CEL - TAM / 2, H[idx(i, j)] + 0.12, j * CEL - TAM / 2)) }));

  // ── malha do terreno: triângulos soltos, cor por triângulo (bioma, campos em retalho, floresta) ──
  // buffers pré-alocados (o mundo grande tem ~100 mil triângulos: listas que crescem travavam a geração)
  const MAXV = N * N * 6;
  const pos = new Float32Array(MAXV * 3), cor = new Float32Array(MAXV * 3), c = new THREE.Color();
  let nv = 0;
  const arvores = [];
  const tri = (ax, ay, az, bx, by, bz, dx, dy, dz) => {
    const hm = (ay + by + dy) / 3;
    const cx = (ax + bx + dx) / 3, cz = (az + bz + dz) / 3;
    const incl = Math.max(Math.abs(ay - by), Math.abs(ay - dy), Math.abs(by - dy)) / CEL;
    let hex;
    // fundo sob a água (transparente): do raso turquesa ao fundo azul, para ler a profundidade de lagos e rios
    if (castelo && Math.hypot(cx - castelo.x, cz - castelo.z) < castelo.raio + 12) hex = COR.grama;   // o jardim do castelo é sempre verde, até na neve
    else if (hm < -0.25) hex = COR.fundos[Math.min(3, Math.floor(-hm * 1.4))];
    else if (hm < 0.3) hex = COR.areia;
    else if (hm < 1.4) hex = COR.areia;
    else if (incl > (novo ? 1.9 : 1.15)) hex = COR.rocha;
    else if (hm > 44) hex = COR.neve;
    else if (hm > 30) hex = COR.rocha;
    else {
      const cel = celulaDe(cx + ruido(cx * 0.035, cz * 0.035) * 7, cz + ruido(cz * 0.035 + 9, cx * 0.035) * 7);
      const b = cel ? cel.bioma : 'prado';
      if (b === 'floresta' && hm < 28) { hex = COR.floresta; if (r() < 0.3) arvores.push([cx, hm, cz, r() < 0.12 ? 1 : 0]); }
      else if ((b === 'campo' || b === 'vila') && incl < 0.5 && hm < 22) {
        // retalho de campos: lotes retangulares, cada célula com seu próprio giro
        const ca = Math.cos(cel.giro), sa = Math.sin(cel.giro);
        const u = Math.floor((cx * ca - cz * sa) / 11), v = Math.floor((cx * sa + cz * ca) / 7);
        hex = b === 'vila' && Math.hypot(cx - cel.x, cz - cel.z) < 12 ? COR.grama : COR.campos[Math.abs((u * 73856093) ^ (v * 19349663)) % COR.campos.length];
      } else if (b === 'praia' && hm < 4) hex = COR.areia;
      else {
        hex = hm > 20 ? COR.gramaEscura : COR.grama;
        if (r() < (b === 'prado' ? 0.03 : 0.008)) arvores.push([cx, hm, cz, r() < 0.25 ? 1 : 0]);   // árvores soltas no prado
      }
    }
    c.setHex(hex);
    if (hex === COR.grama || hex === COR.gramaEscura || hex === COR.floresta) {
      // verdes variados como nos cenários do Ghibli: manchas grandes do amarelado ao azulado e um toque por triângulo
      // (ruído e hash da posição, sem gastar o sorteio da semente)
      const reg = ruido3(cx * 0.018, cz * 0.018), toque = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453 % 1;
      c.offsetHSL(-reg * 0.03, 0.06 + reg * 0.05, toque * 0.035);
    }
    const o = nv * 3;
    pos[o] = ax; pos[o + 1] = ay; pos[o + 2] = az; pos[o + 3] = bx; pos[o + 4] = by; pos[o + 5] = bz; pos[o + 6] = dx; pos[o + 7] = dy; pos[o + 8] = dz;
    for (let k = 0; k < 9; k += 3) { cor[o + k] = c.r; cor[o + k + 1] = c.g; cor[o + k + 2] = c.b; }
    nv += 3;
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x0 = i * CEL - TAM / 2, x1 = x0 + CEL, z0 = j * CEL - TAM / 2, z1 = z0 + CEL;
    const h00 = H[idx(i, j)], h10 = H[idx(i + 1, j)], h01 = H[idx(i, j + 1)], h11 = H[idx(i + 1, j + 1)];
    if (Math.max(h00, h10, h01, h11) < -2.5) continue;   // fundo do mar não aparece
    if ((i + j) % 2) { tri(x0, h00, z0, x0, h01, z1, x1, h10, z0); tri(x1, h10, z0, x0, h01, z1, x1, h11, z1); }
    else { tri(x0, h00, z0, x0, h01, z1, x1, h11, z1); tri(x0, h00, z0, x1, h11, z1, x1, h10, z0); }
  }
  const geoTerreno = new THREE.BufferGeometry();
  geoTerreno.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, nv * 3), 3));
  geoTerreno.setAttribute('color', new THREE.BufferAttribute(cor.subarray(0, nv * 3), 3));
  geoTerreno.computeVertexNormals();

  const fora = a => !leito[idx(Math.round((a[0] + TAM / 2) / CEL), Math.round((a[2] + TAM / 2) / CEL))];   // nada de árvore no leito
  return { castelo, N, CEL, semente, H, altura, rios, vilas, caminhos, geoTerreno, arvores: arvores.filter(fora), celulas, celulaDe, mirantes, r };
}

// A* simples na grade (heurística com peso 2,2: quase o mesmo caminho, bem mais rápido) (custo: distância + ladeira; água custa caro; pontes saem naturalmente onde o rio é estreito)
function estrela(H, idx, [si, sj], [ei, ej]) {
  const W = N + 1, key = (i, j) => j * W + i;
  const g = new Float64Array(W * W).fill(Infinity), de = new Int32Array(W * W).fill(-1);
  const aberto = [[0, si, sj]]; g[key(si, sj)] = 0;
  const empurrar = it => { aberto.push(it); let k = aberto.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (aberto[p][0] <= aberto[k][0]) break; [aberto[p], aberto[k]] = [aberto[k], aberto[p]]; k = p; } };
  const tirar = () => { const top = aberto[0], ult = aberto.pop(); if (aberto.length) { aberto[0] = ult; let k = 0; for (;;) { const l = 2 * k + 1, rr = l + 1; let m = k; if (l < aberto.length && aberto[l][0] < aberto[m][0]) m = l; if (rr < aberto.length && aberto[rr][0] < aberto[m][0]) m = rr; if (m === k) break; [aberto[m], aberto[k]] = [aberto[k], aberto[m]]; k = m; } } return top; };
  while (aberto.length) {
    const [, i, j] = tirar();
    if (i === ei && j === ej) break;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
      const h0 = H[idx(i, j)], h1 = H[idx(ni, nj)];
      const custo = Math.hypot(di, dj) * (1 + Math.abs(h1 - h0) * 2.2 + (h1 < 0.4 ? 14 : 0) + (h1 > 30 ? 6 : 0));
      const ng = g[key(i, j)] + custo;
      if (ng < g[key(ni, nj)]) { g[key(ni, nj)] = ng; de[key(ni, nj)] = key(i, j); empurrar([ng + Math.hypot(ei - ni, ej - nj) * 2.2, ni, nj]); }
    }
  }
  const pts = []; let k = key(ei, ej);
  while (k !== -1) { pts.push([k % W, Math.floor(k / W)]); k = de[k]; }
  return pts.reverse();
}
