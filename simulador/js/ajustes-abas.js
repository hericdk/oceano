// As abas no alto das telas que têm opções: leva a tudo o que se configura no Oceano, com o manifesto à direita.
import { icone } from './icones.js';
import { ligarBrilho, ligarNuvemNosBotoes } from './brilho-pixel.js';

const ITENS = [
  ['mods', 'Mods', 'cartucho', 'oceano://mods?aba=mods'],
  ['skills', 'Skills', 'livro', 'oceano://mods?aba=skills'],
  ['temas', 'Temas', 'temas', 'oceano://temas'],
  ['avatar', 'Avatar', 'avatar-cara', 'oceano://avatar'],
  ['ia', 'Inteligência', 'raio', 'oceano://ia'],
  ['atalhos', 'Atalhos', 'teclado', 'oceano://atalhos'],
  ['privacidade', 'Privacidade', 'escudo', 'oceano://privacidade'],
  ['rede', 'Rede', 'rede', 'oceano://rede'],
  ['configuracoes', 'Configurações', 'engrenagem', 'oceano://configuracoes'],
];

const abas = (atual, r) => {
  const naMods = atual === 'mods', ativo = naMods ? (r.params.get('aba') || 'mods') : atual;
  return `<nav class="mus-abas ajustes-abas px" aria-label="Tudo o que se configura">
    ${ITENS.map(([id, nome, ic, url]) => {
      const interna = naMods && (id === 'mods' || id === 'skills');
      return `<button class="mus-aba${id === ativo ? ' atual' : ''}" ${interna ? `data-aba-mods="${id}"` : `data-ir="${url}"`} ${id === ativo ? 'aria-current="page"' : ''}>${icone(ic)}<span>${nome}</span></button>`;
    }).join('')}
    <a href="#" class="brilho brilho-caixa ajustes-manifesto" data-ir="oceano://manifesto">Manifesto</a>
  </nav>`;
};

export function comAbasDeAjustes(id, pagina) {
  return {
    ...pagina,
    html: (r, app) => (app.lite ? '' : abas(id, r)) + pagina.html(r, app),
    montar(el, r, app) {
      const nav = el.querySelector('.ajustes-abas');
      if (nav) ligarBrilho(nav);
      const parar = ligarNuvemNosBotoes(el), m = pagina.montar?.(el, r, app);
      return { ...m, desmontar() { parar(); m?.desmontar?.(); } };
    },
  };
}
