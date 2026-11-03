// O símbolo de cada área do Oceano, para escrever e conversar sem o nome inteiro. Cada área tem o seu, e eles não mudam.
// Mods podem ter o emoji que a pessoa escolher, desde que não seja o de uma área nem o de outro mod.

export const AREAS = Object.freeze([
  ['🌊', 'Oceano', 'oceano://nova-aba'], ['🧰', 'Ferramentas', 'oceano://ferramentas'], ['🤌', '½ sampler', 'oceano://sampler'],
  ['🎀', 'Navegadora', null], ['🪞', 'Avatar', 'oceano://avatar'], ['🧠', 'Inteligência', 'oceano://ia'],
  ['🧩', 'Mods', 'oceano://mods'], ['🎨', 'Temas', 'oceano://temas'], ['🏝️', 'Ilha', 'oceano://nova-aba'],
  ['🎮', 'Modo jogo', 'oceano://jogo'], ['👾', 'PICO-8', 'oceano://pico8'], ['🎼', 'Stave', 'oceano://stave'],
  ['🎧', 'Trilha', 'oceano://trilha'], ['💿', 'CDs', 'oceano://cds'], ['🎞️', 'Animação', 'oceano://micromediaflash'],
  ['🎨', 'RetoqueShop 1.0', 'oceano://retoque'], ['🖌️', 'GIMP', 'oceano://gimp'], ['🤖', 'Robôs [beta]', 'oceano://robo'], ['📖', 'Leitura', 'oceano://leitura'], ['📥', 'Downloads', 'oceano://downloads'], ['🔐', 'Baú de senhas', 'oceano://bau'],
  ['📜', 'Manifesto', 'oceano://manifesto'],
].map(([emoji, nome, url]) => Object.freeze({ emoji, nome, url })));

// o seletor de variação (U+FE0F) não muda o símbolo: ❤ e ❤️ contam como o mesmo
const base = e => String(e || '').replace(/️/g, '');
export const areaDoEmoji = e => AREAS.find(a => base(a.emoji) === base(e)) || null;

// a referência de cada mod do Oceano
export const REFERENCIAS_MODS = Object.freeze({
  'relogio-mare': '🕰️', bolhas: '🫧', pescadores: '🎣', surfistas: '🏖️', 'peixes-na-barra': '🐟',
  'sons-do-mar': '🐚', 'modo-jogo-auto': '🕹️', cronometro: '⏱️', notas: '📝', radio: '📻',
});
const LIVRES = ['🦀', '🐙', '🦑', '🐢', '🐬', '🐳', '🦈', '🪸', '⚓', '🧭', '🛟', '⛵', '🌀', '🌙', '⭐', '🌈', '🍉', '🍋', '🧃', '🪁'];
const normal = t => base(String(t)).trim().toLowerCase();

// todo mod nasce com uma referência livre; a pessoa troca quando quiser
export function referenciaLivre(mods = []) {
  const usadas = new Set(mods.map(m => normal(m.emoji)));
  return LIVRES.find(e => !usadas.has(normal(e))) || `mod-${mods.length + 1}`;
}

// A referência é obrigatória: um emoji, um grupo de até 5 emojis ou um código escrito pela pessoa (letras, números, - e _).
// Devolve { emoji } para usar ou { erro } para mostrar.
export function validarEmojiMod(texto, mods = [], idDoMod = null) {
  const t = String(texto || '').trim();
  if (!t) return { erro: 'Todo mod precisa de uma referência: um emoji ou um código seu.' };
  const partes = [...new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(t)].map(p => p.segment);
  const soEmojis = partes.length <= 5 && partes.every(p => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(p));
  if (!soEmojis && !/^[\p{L}\p{N}_-]{2,24}$/u.test(t)) return { erro: 'Use até 5 emojis ou um código de 2 a 24 letras e números, sem espaços.' };
  const area = soEmojis ? partes.map(areaDoEmoji).find(Boolean) : null;
  if (area) return { erro: `${area.emoji} já é o símbolo de ${area.nome}. Escolha outro.` };
  const outro = mods.find(m => m.id !== idDoMod && m.emoji && normal(m.emoji) === normal(t));
  if (outro) return { erro: `${t} já está no mod ${outro.nome}. Escolha outro.` };
  return { emoji: t };
}
