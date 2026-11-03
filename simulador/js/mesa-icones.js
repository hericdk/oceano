// Os atalhos da mesa: a ordem, quais estão ocultos e os atalhos que a pessoa criou nos cards de Mods.
// Atalho novo do Oceano aparece no fim da lista de quem já tinha arrumado a sua.

const PADRAO = [['oceano://mods', 'cartucho', 'Mods'], ['oceano://temas', 'temas', 'Temas'], ['oceano://jogo', 'jogo', 'Modo jogo'], ['oceano://pico8', 'console', 'PICO-8'], ['oceano://stave', 'stave', 'Stave'], ['oceano://trilha', 'som', 'Trilha'], ['oceano://sampler', 'sampler', '½ sampler'], ['oceano://retoque', 'retoque', 'RetoqueShop 1.0'], ['oceano://gimp', 'gimp', 'GIMP'], ['oceano://ferramentas', 'ferramentas', 'Ferramentas'], ['oceano://robo', 'robo', 'Robôs [beta]'], ['oceano://micromediaflash', 'cartucho', 'Animação'],
    ['oceano://rede', 'rede', 'Rede'], ['oceano://configuracoes', 'engrenagem', 'Configurações'],
    ['oceano://historico', 'relogio', 'Histórico'], ['oceano://bau', 'cadeado', 'Baú de senhas'], ['oceano://atalhos', 'teclado', 'Atalhos'], ['oceano://sobre', 'info', 'Sobre a Navegadora']].map(([url, icone, nome]) => ({ url, icone, nome }));

export function criarIconesMesa(guardado) {
  const salvo = guardado.ler('mesa-icones', {});
  let ordem = Array.isArray(salvo.ordem) ? salvo.ordem : [];
  let ocultos = Array.isArray(salvo.ocultos) ? salvo.ocultos : [];
  let extras = Array.isArray(salvo.extras) ? salvo.extras : [];
  const ouvintes = new Set();
  const salvar = () => { guardado.gravar('mesa-icones', { ordem, ocultos, extras }); ouvintes.forEach(f => f()); };

  function lista() {
    const todos = [...PADRAO, ...extras.map(x => ({ ...x, extra: true }))];
    const pos = u => { const i = ordem.indexOf(u); return i < 0 ? Infinity : i; };
    return todos.map((x, i) => ({ ...x, i })).sort((a, b) => pos(a.url) - pos(b.url) || a.i - b.i)
      .map(({ i, ...x }) => ({ ...x, oculto: ocultos.includes(x.url) }));
  }

  return {
    lista,
    aoMudar(f) { ouvintes.add(f); return () => ouvintes.delete(f); },
    ocultar(url, sim) { ocultos = sim ? [...new Set([...ocultos, url])] : ocultos.filter(u => u !== url); salvar(); },
    mover(url, passo) {
      const urls = lista().map(x => x.url), de = urls.indexOf(url), para = de + passo;
      if (de < 0 || para < 0 || para >= urls.length) return;
      urls.splice(para, 0, urls.splice(de, 1)[0]);
      ordem = urls; salvar();
    },
    tem: url => extras.some(x => x.url === url),
    adicionar({ url, icone, nome }) {
      if (extras.some(x => x.url === url)) return;
      extras = [...extras, { url, icone, nome: String(nome).slice(0, 40) }]; salvar();
    },
    remover(url) {
      if (!extras.some(x => x.url === url)) return;
      extras = extras.filter(x => x.url !== url);
      ordem = ordem.filter(u => u !== url); ocultos = ocultos.filter(u => u !== url); salvar();
    },
    restaurar() { ordem = []; ocultos = []; salvar(); },
  };
}
