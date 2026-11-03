// Ícone animado no Dock ao abrir (só macOS).
const { app } = require('electron');
// O macOS só aceita ícone parado no Finder/Spotlight; com o app aberto o Dock
// aceita trocar a imagem, então a onda do ícone sobe e rola por ~2,5 s e para.

const zlib = require('zlib');
const { nativeImage } = require('electron');

const FUNDO = [0x0e, 0x1a, 0x3d], TINTA = [0x5b, 0xb6, 0xf0];
const ARO = ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'];
const PARADO = ['..###..', '.#...#.', '#.....#', '#.##..#', '##..###', '.#####.', '..###..']; // = ícone do app

function pngDe(grade, tamanho = 256) {
  const escala = Math.floor(tamanho / 9), margem = Math.floor((tamanho - 7 * escala) / 2);
  const canto = Math.max(1, Math.floor(tamanho / 16));
  const linhas = [];
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 4);
    for (let x = 0; x < tamanho; x++) {
      const fora = (x < canto || x >= tamanho - canto) && (y < canto || y >= tamanho - canto);
      const gx = Math.floor((x - margem) / escala), gy = Math.floor((y - margem) / escala);
      const tinta = x >= margem && y >= margem && gx < 7 && gy < 7 && grade[gy][gx] === '#';
      linha.set([...(tinta ? TINTA : FUNDO), fora ? 0 : 255], 1 + x * 4);
    }
    linhas.push(linha);
  }
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo), tam = Buffer.alloc(4), crc = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, dados])));
    return Buffer.concat([tam, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0); ihdr.writeUInt32BE(tamanho, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0))]);
}

// quadro n: a água sobe do fundo e depois a crista da onda rola da esquerda para a direita
function quadro(n) {
  const nivel = Math.max(3, 5 - Math.floor(n / 2));          // linha da superfície (5 → 3)
  return ARO.map((linha, y) => [...linha].map((c, x) => {
    if (c === '#') return '#';
    const dentro = y > 0 && y < 6 && x > 0 && x < 6;
    if (!dentro) return '.';
    const crista = nivel + (Math.sin((x - n * 0.7) * 1.4) > 0 ? 0 : 1);
    return y === crista || y === 5 ? '#' : '.';
  }).join(''));
}

function animarIcone() {
  if (!app.dock) return;
  const quadros = Array.from({ length: 24 }, (_, n) => nativeImage.createFromBuffer(pngDe(quadro(n))));
  quadros.push(nativeImage.createFromBuffer(pngDe(PARADO)));
  let n = 0;
  const t = setInterval(() => {
    app.dock.setIcon(quadros[n++]);
    if (n >= quadros.length) clearInterval(t);
  }, 100);
}

module.exports = { animarIcone };
