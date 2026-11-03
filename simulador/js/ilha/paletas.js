// Ilha — paletas de consoles e computadores antigos para o modo Pixel (referência: PICO-8).
// O shader acha as duas cores mais próximas e alterna entre elas pelo Bayer 4×4 (pixelizar ordenado
// entre vizinhas, não só "a mais próxima"), por isso degradês viram tramas, como nos jogos da época.
// Máximo de 64 cores por paleta (tamanho do uniform).

const hex = s => s.trim().split(/[\s,]+/).filter(Boolean).map(h => parseInt(h, 16));

export const PALETAS = {
  pico8: {
    nome: 'PICO-8', fonte: 'paleta oficial do PICO-8 (Lexaloffle), 16 cores',
    cores: hex('000000 1D2B53 7E2553 008751 AB5236 5F574F C2C3C7 FFF1E8 FF004D FFA300 FFEC27 00E436 29ADFF 83769C FF77A8 FFCCAA'),
  },
  nes: {
    nome: 'NES', fonte: 'PPU 2C02 do Nintendo (tabela clássica de emuladores), 54 cores',
    cores: hex(`7C7C7C 0000FC 0000BC 4428BC 940084 A80020 A81000 881400 503000 007800 006800 005800 004058 000000
      BCBCBC 0078F8 0058F8 6844FC D800CC E40058 F83800 E45C10 AC7C00 00B800 00A800 00A844 008888
      F8F8F8 3CBCFC 6888FC 9878F8 F878F8 F85898 F87858 FCA044 F8B800 B8F818 58D854 58F898 00E8D8 787878
      FCFCFC A4E4FC B8B8F8 D8B8F8 F8B8F8 F8A4C0 F0D0B0 FCE0A8 F8D878 D8F878 B8F8B8 B8F8D8 00FCFC F8D8F8`),
  },
  atari: {
    nome: 'Atari 2600', fonte: 'TIA NTSC (tabela do Stella), 16 tons × 4 luminâncias = 64 cores',
    cores: hex(`404040 909090 C8C8C8 ECECEC 646410 A0A034 D0D050 FCFC68 844414 AC783C CCA05C ECC878 983418 C06848 E09470 FCBC94
      9C2020 C05858 E08888 FCB4B4 8C2074 B0589C D084C0 ECB0E0 602090 8C58B8 B484DC D4B0FC 302098 6858C0 9488E0 BCB4FC
      1C209C 505CC0 7C8CE0 A4B8FC 1C3890 5070BC 7C9CDC A4C8FC 1C4C78 5084AC 7CB4D4 A4E0FC 1C5C48 509C80 7CD0AC A4FCD4
      205C20 5C9C5C 8CD08C B8FCB8 345C1C 6C9850 9CCC7C C8FCA4 4C501C 848C4C B4C078 E0EC9C 644818 A08444 D0B46C FCE08C`),
  },
  c64: {
    nome: 'Commodore 64', fonte: 'paleta "Pepto" (VIC-II), 16 cores',
    cores: hex('000000 FFFFFF 68372B 70A4B2 6F3D86 588D43 352879 B8C76F 6F4F25 433900 9A6759 444444 6C6C6C 9AD284 6C5EB5 959595'),
  },
  cga: {
    nome: 'CGA', fonte: 'IBM CGA, modo 4 cores paleta 1 intensa (preto, ciano, magenta, branco)',
    cores: hex('000000 55FFFF FF55FF FFFFFF'),
  },
  gameboy: {
    nome: 'Green Boy', fonte: 'tela verde de 4 tons dos portáteis antigos',
    cores: hex('0F380F 306230 8BAC0F 9BBC0F'),
  },
};
export const ORDEM_PALETAS = ['pico8', 'nes', 'atari', 'c64', 'cga', 'gameboy'];
