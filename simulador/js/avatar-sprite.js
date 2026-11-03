// Avatar em pixel art: uma folha de sprites com a mesma interface dos avatares de malha e 3D.
// Cada estado é uma lista de quadros [coluna, linha]. Na folha do Oceano: falando, feliz e parado.

export const ESTADOS_PADRAO = { falando: 0, feliz: 1, parado: 2 };

// lê uma folha nova: as colunas vêm do tamanho da imagem, e cada linha é um estado
export function estadosDaFolha(larguraImagem, alturaImagem, w, h) {
  const colunas = Math.floor(larguraImagem / w), linhas = Math.floor(alturaImagem / h);
  if (colunas < 1 || linhas < 1 || larguraImagem % w || alturaImagem % h) return null;
  const linha = n => Array.from({ length: colunas }, (_, c) => [c, Math.min(n, linhas - 1)]);
  const falando = linha(ESTADOS_PADRAO.falando);
  return { parado: [[0, Math.min(ESTADOS_PADRAO.parado, linhas - 1)]], pensando: falando, falando, feliz: linha(ESTADOS_PADRAO.feliz) };
}

export function abrirImagem(src) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img); img.onerror = () => erro(new Error('não consegui abrir a imagem'));
    img.src = src;
  });
}

export async function criarAvatarSprite(tela, { src, quadro: [w, h], fps = 6, estados }) {
  const img = await abrirImagem(src);
  const lado = Math.max(w, h) * 2, ctx = tela.getContext('2d');
  tela.width = tela.height = lado;
  let falando = false, pensando = false, felizAte = 0, relogio = 0;
  const desenhar = () => {
    const nome = felizAte > performance.now() && estados.feliz ? 'feliz' : falando ? 'falando' : pensando ? 'pensando' : 'parado';
    const lista = estados[nome] || estados.parado, [c, l] = lista[Math.floor(relogio * fps) % lista.length];
    ctx.clearRect(0, 0, lado, lado);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, c * w, l * h, w, h, (lado - w * 2) / 2, (lado - h * 2) / 2, w * 2, h * 2);
  };
  const reagir = e => {
    pensando = e === 'halfLidded';
    if (['happy', 'smile', 'wink', 'surprised', 'blush'].includes(e)) felizAte = performance.now() + 2500;
    desenhar();
  };
  desenhar();
  return {
    tipo: 'sprite',
    advance(dt) { relogio += dt || 0; desenhar(); },
    setAutoIdle() {},
    setSpeaking(v) { falando = !!v; desenhar(); },
    setVoiceLevel() {},
    setExpression: reagir,
    setEmotion: reagir,
    speakKana() {},
    stopLipSync() {},
    destroy() {},
  };
}

// ---------- uma folha por estado ----------
const celulaVazia = (ctx, x, y, w, h) => { const d = ctx.getImageData(x, y, w, h).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; };

// recorta a animação de um estado e monta uma folha só dela: sempre uma linha, nunca desce para a de baixo
export function folhaDoEstado(img, [w, h], quadros) {
  const c = document.createElement('canvas'); c.width = quadros.length * w; c.height = h;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  quadros.forEach(([x, y], i) => ctx.drawImage(img, x * w, y * h, w, h, i * w, 0, w, h));
  return c;
}

// o caminho de volta: várias folhas, uma por estado, viram a folha única que o avatar lê (uma linha por estado).
// O nome do arquivo diz o estado; sem isso, vale a ordem digitando, jogando, parado.
const ORDEM_ESTADOS = [/digit|fal/i, /jog|feliz/i, /parad/i];
export async function juntarFolhas(arquivos, w, h) {
  const lista = [...arquivos], linhas = [null, null, null];
  for (const f of lista) { const i = ORDEM_ESTADOS.findIndex(r => r.test(f.name)); if (i >= 0 && !linhas[i]) linhas[i] = f; }
  for (const f of lista) if (!linhas.includes(f)) { const i = linhas.indexOf(null); if (i >= 0) linhas[i] = f; }
  const estados = [];
  for (const f of linhas) {
    if (!f) { estados.push(null); continue; }
    const url = URL.createObjectURL(f);
    try {
      const img = await abrirImagem(url);
      if (img.width % w || img.height !== h) throw new Error(`${f.name} precisa ser uma linha só, em quadros de ${w}×${h}`);
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const quadros = [];
      for (let y = 0; y < img.height; y += h) for (let x = 0; x < img.width; x += w) if (!celulaVazia(ctx, x, y, w, h)) quadros.push([x, y]);
      estados.push(quadros.length ? { c, quadros } : null);
    } finally { URL.revokeObjectURL(url); }
  }
  if (!estados.some(Boolean)) throw new Error('as folhas estão vazias');
  const reserva = estados.find(Boolean), cols = Math.max(...estados.map(e => e?.quadros.length || 0));
  const saida = document.createElement('canvas'); saida.width = cols * w; saida.height = 3 * h;
  const ctx = saida.getContext('2d'); ctx.imageSmoothingEnabled = false;
  estados.forEach((e, y) => { const { c, quadros } = e || reserva; for (let x = 0; x < cols; x++) { const [qx, qy] = quadros[x % quadros.length]; ctx.drawImage(c, qx, qy, w, h, x * w, y * h, w, h); } });   // estado com menos quadros repete, para a animação não piscar vazia
  const blob = await new Promise(ok => saida.toBlob(ok, 'image/png'));
  return new File([blob], 'minha-folha.png', { type: 'image/png' });
}
