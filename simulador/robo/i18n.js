// Traduções: a tela é escrita em português e cada linha de i18n-textos.js é [pt, en, es].
// Frases longas primeiro e palavras inteiras, para a frase ganhar da palavra. Em português nada é observado, então não custa nada.
import { LINHAS } from './i18n-textos.js';
export const LANGS = ['pt', 'en', 'es'];
const CHAVE = 'robo-idioma';
const inicial = () => {
  const q = new URLSearchParams(location.search).get('idioma'); if (LANGS.includes(q)) return q;
  try { const s = localStorage.getItem(CHAVE); if (LANGS.includes(s)) return s; } catch (e) {}
  const n = (navigator.language || 'pt').slice(0, 2); return LANGS.includes(n) ? n : 'en';
};
let LANG = inicial(), TAB = null, cache = new Map();
const LETRA = '\\p{L}\\p{N}';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function tabela() {
  if (TAB) return TAB;
  const i = LANGS.indexOf(LANG), mapa = new Map();
  for (const l of LINHAS) if (l[i] != null) mapa.set(l[0], l[i]);
  const chaves = [...mapa.keys()].sort((a, b) => b.length - a.length);
  // uma única expressão com todas as frases: casa a maior primeiro, sem traduzir de novo o que já foi trocado
  TAB = { mapa, rx: new RegExp(`(?<![${LETRA}])(?:${chaves.map(esc).join('|')})(?![${LETRA}])`, 'gu'), minus: new Map([...mapa].map(([a, b]) => [a.toLowerCase(), b])) };
  return TAB;
}
export const idioma = () => LANG;
export function T(s) {
  if (LANG === 'pt' || !s) return s;
  const c = cache.get(s); if (c !== undefined) return c;
  const { mapa, rx } = tabela();
  const r = mapa.get(s) ?? s.replace(rx, m => mapa.get(m));
  if (cache.size > 4000) cache.clear();
  cache.set(s, r); return r;
}
const ORIG = new WeakMap(), ATR = ['title', 'placeholder', 'aria-label'];
const pular = n => { const p = n.parentElement; return !p || p.closest('script,style,textarea,#busT,[data-sem-traducao]'); };
// guarda o texto original de cada nó: trocar de idioma sempre parte do português
function noTexto(n) {
  if (pular(n)) return; const v = n.nodeValue; if (!v || !/\p{L}/u.test(v)) return;
  const o = ORIG.get(n), base = o && o.saida === v ? o.pt : v, saida = T(base);
  ORIG.set(n, { pt: base, saida }); if (saida !== v) n.nodeValue = saida;
}
function noAtr(el) { for (const a of ATR) { const v = el.getAttribute?.(a); if (!v) continue; const k = '_pt_' + a; const base = el[k] && el[k + 's'] === v ? el[k] : v, saida = T(base); el[k] = base; el[k + 's'] = saida; if (saida !== v) el.setAttribute(a, saida); } }
function varre(r) {
  if (r.nodeType === 3) { noTexto(r); return; } if (r.nodeType !== 1) return; noAtr(r);
  const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) { if (n.nodeType === 3) noTexto(n); else noAtr(n); }
}
let obs = null;
const fila = new Set(); let agendado = false;
const escoa = () => { agendado = false; if (obs) obs.takeRecords(); fila.forEach(varre); fila.clear(); if (obs) obs.takeRecords(); };
function observa() {
  if (obs) { obs.disconnect(); obs = null; }
  if (LANG === 'pt') return;
  obs = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(n => fila.add(n)); else if (m.type === 'characterData') fila.add(m.target); else fila.add(m.target); } if (!agendado) { agendado = true; queueMicrotask(escoa); } });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATR });
}
export function i18nAgora() { if (LANG === 'pt') return; varre(document.body); if (obs) obs.takeRecords(); }
export function mudaIdioma(l) {
  if (!LANGS.includes(l)) return; LANG = l; TAB = null; cache = new Map(); document.documentElement.lang = l === 'pt' ? 'pt-BR' : l;
  try { localStorage.setItem(CHAVE, l); } catch (e) {}
  if (obs) obs.disconnect(); obs = null;
  varre(document.body); observa();
}
export function iniciarI18n() { document.documentElement.lang = LANG === 'pt' ? 'pt-BR' : LANG; if (LANG !== 'pt') { varre(document.body); observa(); } }
