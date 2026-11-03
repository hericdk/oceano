// Roda dentro de cada ferramenta embutida, no app. Cada uma tem origem própria e não alcança o navegador: só conversa
// por mensagens, e o navegador atende apenas uma lista curta de pedidos (js/quadros.js).
(() => {
  if (window.parent === window) return;
  const PAI = 'oceano-ui://app', nome = location.hostname, esperando = new Map();
  let seq = 0;
  const aplicarTema = ui => { try { localStorage.setItem('oceano:tema-ui', JSON.stringify(ui)); dispatchEvent(new Event('oceano-tema')); } catch {} };
  addEventListener('message', e => {
    if (e.source !== parent || e.origin !== PAI || !e.data?.ponte) return;
    const m = e.data;
    if (m.ponte === 'resposta' && esperando.has(m.id)) { const p = esperando.get(m.id); esperando.delete(m.id); m.ok ? p.ok(m.dados) : p.falha(new Error(m.erro)); }
    if (m.ponte === 'tema') aplicarTema(m.ui);
  });
  const pedir = (acao, args) => new Promise((ok, falha) => { const id = ++seq; esperando.set(id, { ok, falha }); parent.postMessage({ ponte: 'pedido', id, acao, args }, PAI); });
  window.oceanoPonte = { pedir, origemPai: PAI };
  pedir('tema').then(ui => ui && aplicarTema(ui)).catch(() => {});

  // o que esta ferramenta já tinha na origem antiga vem uma vez só; depois a página recarrega para ler
  const gravarBanco = b => new Promise((ok, falha) => {
    const r = indexedDB.open(b.nome, b.versao);
    r.onupgradeneeded = () => { for (const s of b.stores) { const st = r.result.createObjectStore(s.nome, { keyPath: s.keyPath ?? undefined, autoIncrement: s.auto }); for (const i of s.indices) st.createIndex(i.nome, i.keyPath, { unique: i.unique, multiEntry: i.multi }); } };
    r.onerror = () => falha(r.error);
    r.onsuccess = () => {
      const db = r.result, nomes = b.stores.map(s => s.nome);
      if (!nomes.length) { db.close(); return ok(); }
      const t = db.transaction(nomes, 'readwrite');
      for (const s of b.stores) s.itens.forEach(([k, v]) => { s.keyPath != null ? t.objectStore(s.nome).put(v) : t.objectStore(s.nome).put(v, k); });
      t.oncomplete = () => { db.close(); ok(); }; t.onerror = () => falha(t.error);
    };
  });
  pedir('migrar').then(async d => {
    if (!d) return;
    try { for (const [k, v] of d.locais) localStorage.setItem(k, v); for (const b of d.bancos) await gravarBanco(b); } catch {}
    await pedir('migrado');
    location.reload();
  }).catch(() => {});

  if (nome === 'stave') {
    // traduz a interface, nunca o código: só o texto exato de botões, menus e dicas
    pedir('idioma').then(idioma => {
      const coluna = ['pt', 'en', 'es', 'fr', 'de', 'ja', 'ko'].indexOf(idioma) + 1;
      if (coluna < 1) return;
      const mapa = new Map();
      for (const l of window.TRADUCAO_STAVE || []) if (l[coluna] && l[coluna] !== l[0]) mapa.set(l[0], l[coluna]);
      const fora = el => el?.closest?.('.monaco-editor, canvas, textarea, input');
      const texto = n => { const t = n.nodeValue.trim().replace(/^[^\p{L}]+/u, ''), novo = t && mapa.get(t); if (novo && !fora(n.parentElement)) n.nodeValue = n.nodeValue.replace(t, novo); };
      const atributos = el => { if (fora(el)) return; for (const a of ['title', 'aria-label', 'placeholder']) { const novo = mapa.get(el.getAttribute?.(a)); if (novo) el.setAttribute(a, novo); } };
      const varrer = raiz => {
        if (raiz.nodeType === 3) return texto(raiz);
        if (raiz.nodeType !== 1 || fora(raiz)) return;
        atributos(raiz);
        const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        while (w.nextNode()) w.currentNode.nodeType === 3 ? texto(w.currentNode) : atributos(w.currentNode);
      };
      const comecar = () => {
        varrer(document.body);
        new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') texto(m.target); else if (m.type === 'attributes') atributos(m.target); else m.addedNodes.forEach(varrer); } })
          .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
      };
      document.body ? comecar() : addEventListener('DOMContentLoaded', comecar);
    }).catch(() => {});
    // o áudio que o Stave baixa também vai para a caixa de sons
    const A = HTMLAnchorElement.prototype, original = A.click;
    A.click = function () {
      const n = this.download, href = this.href || '';
      if (n && /^blob:/.test(href) && /\.(wav|mp3|ogg|flac|m4a|aac|opus)$|audio/i.test(n)) fetch(href).then(r => r.blob()).then(blob => parent.postMessage({ strudel: 'download', blob, nome: n }, PAI)).catch(() => {});
      return original.call(this);
    };
  }

  if (nome === 'winampfm') {
    addEventListener('message', async e => {
      if (e.source !== parent || e.origin !== PAI || e.data?.wfm !== 'midi') return;
      try { const W = window.FM1W; if (!W.on) await W.start?.(); parent.postMessage({ wfm: 'midi-ok', n: await W.midiOn() }, PAI); }
      catch (er) { parent.postMessage({ wfm: 'midi-erro', erro: String(er.message || er) }, PAI); }
    });
  }

  if (nome === 'micromediaflash') {
    // o editor procura a plataforma aqui: projetos e exportações continuam na pasta do Oceano, pelo navegador
    const chamar = (metodo, ...args) => pedir('mmf', { metodo, args });
    window.oceano = { micromediaflash: {
      pickFile: (accept, opcoes) => chamar('pickFile', accept, opcoes),
      async saveFile(o, produce) {
        const partes = [];
        await produce(c => partes.push(c instanceof Uint8Array ? c : new Uint8Array(c)));
        return chamar('saveFile', { suggestedName: o.suggestedName, ext: o.ext, handle: o.handle }, await new Blob(partes).arrayBuffer());
      },
      download: (blob, name) => chamar('download', blob, name),
      readFile: n => chamar('readFile', n),
      plugins: () => chamar('plugins'),
      setTitle: () => {},
      openUrl: u => chamar('openUrl', u),
    } };
  }
})();
