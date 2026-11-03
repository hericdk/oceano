// O filtro "Pixel + tema" do avatar: pixelizar ordenado para as cores do tema. O painel da Navegadora e o notch usam este
// mesmo filtro, para o avatar ter a mesma cara em qualquer lugar.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const lim = v => v < 0 ? 0 : v > 255 ? 255 : v;

export function criarPixelizador() {
  let paleta = [], tabela = null, tabelaDe = null;
  // cor mais próxima da paleta numa tabela de 32×32×32 (refeita quando o tema muda): o pixelizado vira uma consulta
  function prepararTabela() {
    tabela = new Uint8Array(32768); tabelaDe = paleta;
    for (let i = 0; i < 32768; i++) {
      const r = ((i >> 10) << 3) + 4, g = (((i >> 5) & 31) << 3) + 4, b = ((i & 31) << 3) + 4;
      let melhor = 0, dist = Infinity;
      for (let k = 0; k < paleta.length; k++) {
        const c = paleta[k], dr = r - c[0], dg = g - c[1], db = b - c[2];
        const q = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (q < dist) { dist = q; melhor = k; }
      }
      tabela[i] = melhor;
    }
  }
  return {
    definirPaleta(cores) { paleta = cores.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))); },
    aplicar(ctx, w, h) {
      if (!paleta.length) return;
      if (tabelaDe !== paleta) prepararTabela();
      const img = ctx.getImageData(0, 0, w, h), d = img.data;
      for (let p = 0, i = 0; p < d.length; p += 4, i++) {
        if (d[p + 3] < 128) { d[p + 3] = 0; continue; }
        const x = i % w, y = (i / w) | 0;
        const ruido = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 48;
        const c = paleta[tabela[(lim(d[p] + ruido) >> 3) << 10 | (lim(d[p + 1] + ruido) >> 3) << 5 | (lim(d[p + 2] + ruido) >> 3)]];
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },
  };
}
