// A interface do navegador em outros idiomas: o texto é escrito em português no código e trocado aqui, na tela.
// O que ainda não está na tabela continua em português. Conversas, histórico e sites nunca passam por aqui.
import { TEXTOS } from './traducao-textos.js';
import { idiomaAtual } from './idioma.js';

const LINGUAS = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'it', 'zh', 'hi', 'ar', 'ru', 'id', 'tr'];
const FORA = 'script, style, canvas, svg, webview, iframe, input, textarea, [contenteditable], .as-conversa, .mensagens, .hist-lista, [data-sensivel], .pp-ola-lista, code';
const exatos = new Map(), moldes = [];
for (const [pt, ...resto] of TEXTOS) {
  if (pt.includes('{n}')) moldes.push([new RegExp('^' + pt.replace(/[.*+?^${}()|[\]\\!]/g, '\\$&').replace('\\{n\\}', '(.+?)') + '$'), resto]);
  else exatos.set(pt, resto);
}
// os idiomas que não estão completos na tabela vêm de um arquivo próprio, carregado só quando escolhidos; o que faltar sai em inglês
const COMPLETAS = new Set(['pt', 'en']);
let arquivo = { lingua: '', exatos: new Map(), moldes: [] };
export async function carregarLingua(lingua) {
  if (COMPLETAS.has(lingua) || arquivo.lingua === lingua) return;
  try {
    const dados = await (await fetch(new URL(`./traducoes/${lingua}.json`, import.meta.url))).json();
    const novos = { lingua, exatos: new Map(), moldes: [] };
    for (const [pt, texto] of Object.entries(dados)) {
      if (pt.includes('{n}')) novos.moldes.push([new RegExp('^' + pt.replace(/[.*+?^${}()|[\]\\!]/g, '\\$&').replace('\\{n\\}', '(.+?)') + '$'), texto]);
      else novos.exatos.set(pt, texto);
    }
    arquivo = novos;
  } catch {}
}
export function traduzirTexto(texto, lingua) {
  if (lingua === 'pt') return texto;
  const limpo = texto.trim();
  if (!limpo) return texto;
  const k = LINGUAS.indexOf(lingua);
  const certo = exatos.get(limpo);
  if (k >= 0 && certo?.[k]) return texto.replace(limpo, certo[k]);
  if (arquivo.lingua === lingua) {
    const a = arquivo.exatos.get(limpo);
    if (a) return texto.replace(limpo, a);
    for (const [re, t] of arquivo.moldes) { const m = re.exec(limpo); if (m) return texto.replace(limpo, t.replace('{n}', m[1])); }
  }
  for (const [re, linhas] of moldes) { const m = re.exec(limpo); if (m && linhas[k]) return texto.replace(limpo, linhas[k].replace('{n}', m[1])); }
  if (certo?.[0]) return texto.replace(limpo, certo[0]);
  for (const [re, linhas] of moldes) { const m = re.exec(limpo); if (m && linhas[0]) return texto.replace(limpo, linhas[0].replace('{n}', m[1])); }
  return texto;
}

export function iniciarTraducao(app, guardado) {
  const originais = new WeakMap();
  let lingua = idiomaAtual(guardado), observador = null;
  const trocarNo = n => {
    if (n.parentElement?.closest(FORA)) return;
    const original = originais.get(n) ?? n.nodeValue, novo = traduzirTexto(original, lingua);
    if (!originais.has(n)) { if (novo === original) return; originais.set(n, original); }
    if (n.nodeValue !== novo) n.nodeValue = novo;
  };
  const ATRIBUTOS = ['title', 'placeholder', 'aria-label'];
  const trocarAtributos = el => {
    if (el.closest(FORA) && !el.matches('input, textarea')) return;
    for (const a of ATRIBUTOS) {
      const v = el.getAttribute(a); if (!v) continue;
      const chave = 'pt' + a.replace('-', '');
      const original = el.dataset[chave] ?? v, novo = traduzirTexto(original, lingua);
      if (novo === original && !el.dataset[chave]) continue;
      el.dataset[chave] = original;
      if (v !== novo) el.setAttribute(a, novo);
    }
  };
  const varrer = raiz => {
    if (raiz.nodeType === 3) return trocarNo(raiz);
    if (raiz.nodeType !== 1) return;
    trocarAtributos(raiz);
    const w = raiz.ownerDocument.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) trocarNo(w.currentNode);
    for (const el of raiz.querySelectorAll('[title], [placeholder], [aria-label]')) trocarAtributos(el);
  };
  function aplicar() {
    document.documentElement.lang = lingua;
    observador?.disconnect(); observador = null;
    varrer(document.body);
    if (lingua === 'pt') return;
    observador = new MutationObserver(lista => {
      observador.disconnect();
      for (const m of lista) {
        if (m.type === 'characterData') { originais.delete(m.target); trocarNo(m.target); }
        else if (m.type === 'attributes') { delete m.target.dataset['pt' + m.attributeName.replace('-', '')]; trocarAtributos(m.target); }
        else m.addedNodes.forEach(varrer);
      }
      observador.observe(document.body, COM_ATRIBUTOS);
    });
    observador.observe(document.body, COM_ATRIBUTOS);
  }
  const CONFIG = { childList: true, subtree: true, characterData: true };
  const COM_ATRIBUTOS = { ...CONFIG, attributes: true, attributeFilter: ATRIBUTOS };
  app.idioma = {
    atual: () => lingua,
    // vazio: volta a seguir o idioma do computador
    definir(v) { if (v) guardado.gravar('idioma', v); else guardado.gravar('idioma', null); lingua = idiomaAtual(guardado); carregarLingua(lingua).then(aplicar); app.emitir?.('idioma-mudou', lingua); },
    escolhido: () => guardado.ler('idioma', null),
    // a lateral é outro documento: traduz e continua olhando o que muda lá dentro
    vigiar(doc) {
      varrer(doc.body);
      const o = new MutationObserver(lista => {
        o.disconnect();
        for (const m of lista) {
          if (m.type === 'characterData') { originais.delete(m.target); trocarNo(m.target); }
          else if (m.type === 'attributes') { delete m.target.dataset['pt' + m.attributeName.replace('-', '')]; trocarAtributos(m.target); }
          else m.addedNodes.forEach(varrer);
        }
        o.observe(doc.body, COM_ATRIBUTOS);
      });
      o.observe(doc.body, COM_ATRIBUTOS);
    },
  };
  carregarLingua(lingua).then(aplicar);
}
