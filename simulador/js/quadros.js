// As ferramentas embutidas (Stave, ½ sampler, Ferramentas, robô, winampFM, MicromediaFlash e Retoque) têm, no app, origem própria:
// não enxergam a interface nem a ponte do navegador. O que elas podem pedir é só esta lista curta, por mensagens.

import { plataformaMmf } from './micromediaflash.js';
import { idiomaAtual } from './idioma.js';

export const FERRAMENTAS = ['stave', 'sampler', 'ferramentas', 'robo', 'winampfm', 'micromediaflash', 'retoque'];
export const srcFerramenta = (app, nome, resto = 'index.html') => (app.real ? `oceano-ui://${nome}/${nome}/${resto}` : `${nome}/${resto}`);
export const origemFerramenta = (app, nome) => (app.real ? `oceano-ui://${nome}` : location.origin);
export const sandboxFerramenta = app => (app.real ? 'sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-popups allow-modals allow-pointer-lock"' : '');

// o que cada uma guardava na origem antiga, para não perder ao separar
const GUARDADOS = {
  sampler: { locais: /^(fm1-sampler2|oceano-sampler)/, bancos: /^(fm1-sampler2|oceano-sampler)$/ },
  robo: { locais: /^robo(?!-tema)/, bancos: /^robo/ },
  winampfm: { locais: /^wfm\./, bancos: /^winampfm-sim$/ },
  micromediaflash: { locais: /^(mmf|micromediaflash)/, bancos: /^(micromediaflash|mmf-audio|mmf-modelos3d|mmf-pixels|mmf-videos)$/ },
  stave: { locais: /^(stave|strudel|@strudel|kabelsalat)/i, bancos: /strudel|stave|soundfont|samples/i },
  ferramentas: { locais: /^ferramentas/, bancos: /^$/ },
  retoque: { locais: /^$/, bancos: /^$/ },
};
const req = r => new Promise((ok, falha) => { r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); });
async function lerBanco(nome) {
  const db = await req(indexedDB.open(nome)), stores = [];
  for (const s of db.objectStoreNames) {
    const st = db.transaction(s).objectStore(s), itens = [];
    await new Promise((ok, falha) => { const c = st.openCursor(); c.onerror = () => falha(c.error); c.onsuccess = () => { const x = c.result; if (!x) return ok(); itens.push([x.key, x.value]); x.continue(); }; });
    stores.push({ nome: s, keyPath: st.keyPath, auto: st.autoIncrement, itens, indices: [...st.indexNames].map(i => { const ix = st.index(i); return { nome: i, keyPath: ix.keyPath, unique: ix.unique, multi: ix.multiEntry }; }) });
  }
  const b = { nome, versao: db.version, stores };
  db.close();
  return b;
}
async function guardadosDe(nome) {
  const g = GUARDADOS[nome];
  const locais = Object.keys(localStorage).filter(k => g.locais.test(k)).map(k => [k, localStorage.getItem(k)]);
  const nomes = (await indexedDB.databases()).map(d => d.name).filter(n => n && g.bancos.test(n));
  const bancos = [];
  for (const n of nomes) { try { bancos.push(await lerBanco(n)); } catch {} }
  return locais.length || bancos.length ? { locais, bancos } : null;
}

export function iniciarPonteFerramentas(app, guardado) {
  if (!app.real) return;
  const n = window.oceanoNativo;
  const temaUi = () => { try { return JSON.parse(localStorage.getItem('oceano:tema-ui')); } catch { return null; } };
  const motor = { sampler: () => n.samplerMotor(), ferramentas: () => n.ferramentasMotor() };
  let mmf = null;
  const ACOES = {
    tema: () => temaUi(),
    idioma: () => idiomaAtual(guardado),
    async migrar(nome) {
      if (guardado.ler('migrado:' + nome, false)) return null;
      const d = await guardadosDe(nome);
      if (!d) guardado.gravar('migrado:' + nome, true);
      return d;
    },
    migrado(nome) { guardado.gravar('migrado:' + nome, true); },
    motor: nome => motor[nome]?.(),
    async avatarPixel(nome, { arquivo, w, h }) {
      if (nome !== 'ferramentas' || !(arquivo instanceof File)) throw new Error('pedido inválido');
      const painel = await app.carregarPainel('assistente');
      return painel.importarPixel(arquivo, Number(w), Number(h));
    },
    async mmf(nome, { metodo, args = [] }) {
      if (nome !== 'micromediaflash') throw new Error('pedido inválido');
      mmf ??= plataformaMmf(app);
      if (metodo === 'saveFile') return mmf.saveFile(args[0], async add => add(args[1]));
      if (metodo === 'openUrl') { if (!/^https?:/.test(String(args[0]))) throw new Error('endereço inválido'); return mmf.openUrl(args[0]); }
      if (!['pickFile', 'download', 'readFile', 'plugins'].includes(metodo)) throw new Error('pedido inválido');
      return mmf[metodo](...args);
    },
  };
  const PERMITIDAS = { sampler: ['motor'], ferramentas: ['motor', 'avatarPixel'], micromediaflash: ['mmf'] };
  addEventListener('message', async e => {
    const m = e.data;
    if (m?.ponte !== 'pedido') return;
    const nome = /^oceano-ui:\/\/([a-z]+)$/.exec(e.origin)?.[1];
    if (!FERRAMENTAS.includes(nome) || !e.source) return;
    const responder = r => e.source.postMessage({ ponte: 'resposta', id: m.id, ...r }, e.origin);
    if (!['tema', 'idioma', 'migrar', 'migrado', ...(PERMITIDAS[nome] || [])].includes(m.acao)) return responder({ ok: false, erro: 'pedido não permitido' });
    try { responder({ ok: true, dados: await ACOES[m.acao](nome, m.args) }); }
    catch (er) { responder({ ok: false, erro: String(er.message || er) }); }
  });
  // tema trocado: avisa quem estiver aberto
  app.on?.('tema-ui', () => {
    for (const f of document.querySelectorAll('iframe')) { const nome = /^oceano-ui:\/\/([a-z]+)\//.exec(f.src)?.[1]; if (FERRAMENTAS.includes(nome)) f.contentWindow?.postMessage({ ponte: 'tema', ui: temaUi() }, `oceano-ui://${nome}`); }
  });
}
