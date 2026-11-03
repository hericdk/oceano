// Fechar o navegador sem desligar a Navegadora (só no Mac, onde existe o notch): o navegador fecha de verdade e libera
// a memória; a Navegadora continua no notch e na barra de menus, só para conversar com as IAs conectadas.
// Sair do Oceano (⌘Q ou o ícone da barra) encerra tudo. As dependências entram por parâmetro para dar para testar.

const zlib = require('zlib');

const GRADE = ['..###..', '.#...#.', '#.....#', '#.##..#', '##..###', '.#####.', '..###..'];   // o mesmo desenho do ícone do app

// PNG preto com fundo transparente: o macOS pinta na cor da barra (imagem "template")
function pngBandeja(lado = 32) {
  const escala = Math.floor(lado / 8), margem = Math.floor((lado - 7 * escala) / 2), linhas = [];
  for (let y = 0; y < lado; y++) {
    const linha = Buffer.alloc(1 + lado * 4);
    for (let x = 0; x < lado; x++) {
      const gx = Math.floor((x - margem) / escala), gy = Math.floor((y - margem) / escala);
      const tinta = x >= margem && y >= margem && gx < 7 && gy < 7 && GRADE[gy][gx] === '#';
      linha.writeUInt8(tinta ? 255 : 0, 4 + x * 4);
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
  ihdr.writeUInt32BE(lado, 0); ihdr.writeUInt32BE(lado, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0))]);
}

function criarSegundoPlano({ app, Tray, Menu, nativeImage, plataforma = process.platform, ativo, abrir }) {
  let bandeja = null, saindo = false;
  app.on('before-quit', () => { saindo = true; });

  // o ícone da barra existe enquanto a opção estiver ligada
  function atualizar() {
    if (plataforma !== 'darwin') return;
    if (!ativo()) { bandeja?.destroy(); bandeja = null; return; }
    if (bandeja) return;
    const img = nativeImage.createFromBuffer(pngBandeja(), { scaleFactor: 2 });
    img.setTemplateImage(true);
    bandeja = new Tray(img);
    bandeja.setToolTip('Oceano');
    bandeja.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir o Oceano', click: () => abrir() },
      { type: 'separator' },
      { label: 'Sair do Oceano', click: () => app.quit() },
    ]));
  }

  return {
    atualizar,
    aoAbrirNavegador() { if (plataforma === 'darwin') app.dock?.show(); atualizar(); },
    // sem a opção, fechar o navegador encerra o Oceano, como em qualquer app
    aoFecharNavegador() {
      if (saindo) return;
      if (plataforma !== 'darwin' || !ativo()) { app.quit(); return; }
      app.dock?.hide();
      atualizar();
    },
  };
}

module.exports = { criarSegundoPlano, pngBandeja };
