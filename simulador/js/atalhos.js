// Atalhos do Oceano: uma tabela só, lida pelo menu do app, pelo simulador, pela paleta ⌘K e por oceano://atalhos.
// "app" vale no navegador de verdade (o menu nativo pega a tecla mesmo com o foco dentro de um site).
// "sim" vale no simulador: o navegador onde ele roda segura ⌘T, ⌘W, ⌘N, ⌘⇧T e ⌃Tab, então lá usamos ⌥.
// Mod = ⌘ no Mac, Ctrl no Windows e no Linux.

export const ACOES = [
  { id: 'nova-aba', grupo: 'Abas', nome: 'Nova aba', dica: 'já abre com o cursor no endereço', app: 'Mod+T', sim: 'Alt+T' },
  { id: 'fechar-aba', grupo: 'Abas', nome: 'Fechar aba', app: 'Mod+W', sim: 'Alt+W' },
  { id: 'reabrir-aba', grupo: 'Abas', nome: 'Reabrir aba fechada', dica: 'volta a última aba fechada, com o histórico dela; repita para ir mais longe', app: 'Mod+Shift+T', sim: 'Alt+Shift+T', novo: true },
  { id: 'nova-efemera', grupo: 'Abas', nome: 'Nova aba efêmera', dica: 'sem cookies, cache ou histórico; some ao fechar', app: 'Mod+Shift+N', real: true },
  { id: 'proxima-aba', grupo: 'Abas', nome: 'Próxima aba', app: 'Ctrl+Tab', sim: 'Alt+Shift+]' },
  { id: 'aba-anterior', grupo: 'Abas', nome: 'Aba anterior', app: 'Ctrl+Shift+Tab', sim: 'Alt+Shift+[', novo: true },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ id: 'ir-aba-' + n, grupo: 'Abas', nome: `Ir para a aba ${n}`, app: 'Mod+' + n, sim: 'Alt+' + n, novo: true, compacto: true })),
  { id: 'ultima-aba', grupo: 'Abas', nome: 'Ir para a última aba', app: 'Mod+9', sim: 'Alt+9', novo: true },

  { id: 'voltar', grupo: 'Navegação', nome: 'Voltar', app: 'Mod+[', sim: 'Alt+[' },
  { id: 'avancar', grupo: 'Navegação', nome: 'Avançar', app: 'Mod+]', sim: 'Alt+]' },
  { id: 'procurar', grupo: 'Navegação', nome: 'Procurar na página', app: 'Mod+F', sim: 'Alt+F', novo: true },
  { id: 'zoom-mais', grupo: 'Navegação', nome: 'Aumentar o zoom', app: 'Mod+=', real: true, novo: true },
  { id: 'zoom-menos', grupo: 'Navegação', nome: 'Diminuir o zoom', app: 'Mod+-', real: true, novo: true },
  { id: 'zoom-normal', grupo: 'Navegação', nome: 'Zoom normal', app: 'Mod+0', real: true, novo: true },
  { id: 'imprimir', grupo: 'Navegação', nome: 'Imprimir ou salvar em PDF', app: 'Mod+P', real: true, novo: true },
  { id: 'downloads', grupo: 'Navegação', nome: 'Downloads', app: 'Mod+Shift+J', real: true, novo: true },
  { id: 'recarregar', grupo: 'Navegação', nome: 'Recarregar', app: 'Mod+R', sim: 'Alt+R' },
  { id: 'recarregar-sem-cache', grupo: 'Navegação', nome: 'Recarregar sem cache', app: 'Mod+Shift+R', real: true },
  { id: 'endereco', grupo: 'Navegação', nome: 'Ir para o endereço', app: 'Mod+L', sim: 'Alt+L' },
  { id: 'inicio', grupo: 'Navegação', nome: 'Página inicial nesta aba', app: 'Mod+Shift+H', sim: 'Alt+Shift+H', novo: true },
  { id: 'mini-player', grupo: 'Navegação', nome: 'Mini player', dica: 'o vídeo da página flutua por cima de tudo, até fora do navegador', app: 'Mod+Shift+P', sim: 'Alt+P', novo: true },
  { id: 'historico', grupo: 'Navegação', nome: 'Histórico e favoritos', app: 'Mod+Y', sim: 'Alt+Y', novo: true },
  { id: 'favoritar', grupo: 'Navegação', nome: 'Guardar nos favoritos', dica: 'liga ou desliga a estrela da página aberta', app: 'Mod+D', sim: 'Alt+D', novo: true },
  { id: 'leitor', grupo: 'Navegação', nome: 'Ler como livro', dica: 'abre o texto da página em páginas de livro; só o que a página mostra para você', app: 'Mod+Shift+L', sim: 'Alt+Shift+L', novo: true },
  { id: 'leitura', grupo: 'Navegação', nome: 'Lista de leitura', dica: 'textos guardados para ler depois, sem internet', app: 'Mod+Shift+Y', sim: 'Alt+Shift+Y', novo: true },
  { id: 'copiar-link-limpo', grupo: 'Navegação', nome: 'Copiar link sem rastreadores', dica: 'tira utm_*, fbclid, gclid, si e afins antes de copiar', app: 'Mod+Shift+C', sim: 'Alt+Shift+C', novo: true },

  { id: 'modo-jogo', grupo: 'Oceano', nome: 'Modo jogo', dica: 'liga ou desliga; congela as abas de fundo', app: 'Mod+Shift+G', sim: 'Alt+G', novo: true },
  { id: 'barra-lateral', grupo: 'Oceano', nome: 'Barra lateral', app: 'Mod+Shift+B', sim: 'Alt+B', novo: true },
  { id: 'assistente', grupo: 'Oceano', nome: 'Navegadora', dica: 'abre a barra lateral já com o cursor na conversa', app: 'Mod+Shift+A', sim: 'Alt+A', novo: true },
  { id: 'trilha', grupo: 'Oceano', nome: 'Tocar ou pausar a trilha', app: 'Alt+M', sim: 'Alt+M' },
  { id: 'configuracoes', grupo: 'Oceano', nome: 'Configurações', dica: 'tudo num lugar só: aparência, pixelizar, mesa, sons, teclado', app: 'Mod+,', sim: 'Alt+,', novo: true },
  { id: 'privacidade', grupo: 'Oceano', nome: 'Privacidade e segurança', app: 'Mod+Alt+,', sim: 'Alt+Shift+,' },
  { id: 'atalhos', grupo: 'Oceano', nome: 'Ver e mudar os atalhos', app: 'Mod+Shift+/', sim: 'Alt+/', novo: true },

  { id: 'musica-trilha', grupo: 'Música', nome: 'Trilha', dica: 'as telas de música passam de uma para outra em slide', app: 'Mod+Alt+1', sim: 'Alt+Shift+1', novo: true },
  { id: 'musica-cds', grupo: 'Música', nome: 'CDs (winampFM)', app: 'Mod+Alt+2', sim: 'Alt+Shift+2', novo: true },
  { id: 'musica-stave', grupo: 'Música', nome: 'Stave', app: 'Mod+Alt+3', sim: 'Alt+Shift+3', novo: true },
  { id: 'musica-sampler', grupo: 'Música', nome: '½ sampler', app: 'Mod+Alt+4', sim: 'Alt+Shift+4', novo: true },
  { id: 'musica-proxima', grupo: 'Música', nome: 'Próxima tela de música', app: 'Mod+Alt+M', sim: 'Alt+Shift+M', novo: true },

  { id: 'comandos', grupo: 'Dev', nome: 'Comandos', dica: 'procurar qualquer ação pelo nome', app: 'Mod+K', real: true },
  { id: 'painel-dev', grupo: 'Dev', nome: 'Painel Dev', app: 'Mod+Shift+D', real: true },
  { id: 'devtools', grupo: 'Dev', nome: 'DevTools do site', app: 'F12', real: true },
];

export const MAC = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);

const CODIGOS = { BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=', Backquote: '`',
  Tab: 'Tab', Space: 'Space', ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down', Enter: 'Enter', Backspace: 'Backspace', Delete: 'Delete', Escape: 'Esc' };

// Pela tecla física (e.code): no Mac, ⌥T escreve "†" em e.key, mas o código continua KeyT.
export function deEvento(e) {
  const k = /^Key([A-Z])$/.exec(e.code)?.[1] || /^Digit(\d)$/.exec(e.code)?.[1] || /^F\d{1,2}$/.exec(e.code)?.[0] || CODIGOS[e.code]
    || (!e.code && /^[a-z0-9[\],./\\;'=`-]$/i.test(e.key) ? e.key.toUpperCase() : null);   // sem e.code (alguns teclados virtuais): pela letra
  if (!k) return null;
  const p = [];
  if (MAC ? e.metaKey : e.ctrlKey) p.push('Mod');
  if (MAC && e.ctrlKey) p.push('Ctrl');
  if (e.altKey) p.push('Alt');
  if (e.shiftKey) p.push('Shift');
  return [...p, k].join('+');
}

// no Windows e no Linux "Ctrl" e "Mod" são a mesma tecla
const normal = c => (c && !MAC ? c.replace(/\bCtrl\b/, 'Mod') : c || '');

const SIMBOLOS = { Mod: '⌘', Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Left: '←', Right: '→', Up: '↑', Down: '↓', Tab: '⇥', Space: 'Espaço', Enter: '↩', Backspace: '⌫', Esc: 'Esc' };
export function mostrar(c) {
  if (!c) return '';
  const p = c.split('+');
  if (MAC) {
    const ordem = ['Ctrl', 'Alt', 'Shift', 'Mod'];
    const mods = ordem.filter(m => p.includes(m)), tecla = p.find(x => !ordem.includes(x));
    return mods.map(m => SIMBOLOS[m]).join('') + (SIMBOLOS[tecla] || tecla);
  }
  return p.map(x => ({ Mod: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Left: '←', Right: '→', Up: '↑', Down: '↓', Space: 'Espaço' }[x] || x)).join('+');
}

export const paraAcelerador = c => c ? c.split('+').map(x => ({ Mod: 'CmdOrCtrl', Esc: 'Escape' }[x] || x)).join('+') : '';

// teclas que sozinhas (sem ⌘/Ctrl) atrapalhariam quem está digitando: ⌥C escreve "ç" no Mac
const soDigitando = c => !/\bMod\b|\bCtrl\b/.test(c) && !/^F\d/.test(c);

export function criarAtalhos({ real, guardado, aoMudar }) {
  const contexto = real ? 'app' : 'sim';
  const chave = 'atalhos-' + contexto;
  let meus = guardado.ler(chave, {});   // só o que a pessoa mudou: { id: combo | '' }
  const acoes = ACOES.filter(a => (real || !a.real) && (a[contexto] || real));
  const padrao = a => a[contexto] || '';
  const de = id => { const a = acoes.find(x => x.id === id); return !a ? '' : id in meus ? meus[id] : padrao(a); };
  const salvar = () => { guardado.gravar(chave, meus); aoMudar?.(); };

  return {
    contexto, acoes,
    de, mostrar: id => mostrar(de(id)),
    mudado: id => id in meus,
    acaoDe(c, digitando = false) {
      if (!c || (digitando && soDigitando(c))) return null;
      return acoes.find(a => normal(de(a.id)) === normal(c))?.id || null;
    },
    // devolve a ação que perdeu o atalho (se ele já era de outra)
    definir(id, c) {
      const dono = c ? acoes.find(a => a.id !== id && normal(de(a.id)) === normal(c)) : null;
      if (dono) meus[dono.id] = '';
      const a = acoes.find(x => x.id === id);
      if (normal(padrao(a)) === normal(c)) delete meus[id]; else meus[id] = c;
      salvar();
      return dono;
    },
    restaurar(id) { if (id) delete meus[id]; else meus = {}; salvar(); },
    // para o menu do app: { id: 'CmdOrCtrl+Shift+T' }
    aceleradores: () => Object.fromEntries(acoes.map(a => [a.id, paraAcelerador(de(a.id))])),
  };
}

// ---------- link sem rastreadores ----------

const RASTREADORES = /^(utm_\w+|fbclid|gclid|gclsrc|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|igshid|igsh|yclid|_hsenc|_hsmi|mkt_tok|vero_\w+|oly_\w+|rb_clickid|s_cid|twclid|ttclid|li_fat_id|ref_src|si|feature|pp)$/i;
export function linkLimpo(url) {
  try {
    const u = new URL(url), tirados = [];
    for (const k of [...u.searchParams.keys()]) if (RASTREADORES.test(k) && !(k === 'si' && !/youtu|spotify/.test(u.hostname)) && !(k === 'feature' && !/youtu/.test(u.hostname)) && !(k === 'pp' && !/youtu/.test(u.hostname))) { u.searchParams.delete(k); tirados.push(k); }
    return { url: u.toString(), tirados };
  } catch { return { url, tirados: [] }; }
}
