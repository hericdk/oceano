// oceano://pico8 — player de PICO-8. Os cartuchos vêm da BBS da Lexaloffle e rodam no player oficial
// dela (widget.php), que não pede licença. "Instalar" guarda o jogo na estante (precisa de internet para jogar).
// Jogos exportados por você no PICO-8 (EXPORT JOGO.HTML → .html + .js) ficam neste navegador e rodam offline.
//
// A BBS não libera CORS: listas e busca vêm pelo servidor do simulador (/pico8/bbs, ver pico8/bbs.py) e as
// capas ficam guardadas em pico8/capas/. Sem o servidor, tudo sai do catálogo guardado em pico8/catalogo.json.

import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WIDGET = post => `https://www.lexaloffle.com/bbs/widget.php?pid=${encodeURIComponent(post)}`;
const POST = post => `https://www.lexaloffle.com/bbs/?pid=${encodeURIComponent(post)}`;
const ABAS = { sugestoes: 'Sugestões', estante: 'Estante', destaques: 'Destaques', novos: 'Novos', seus: 'Seus jogos' };
const ESTILOS = { plataforma: 'Plataforma', puzzle: 'Puzzle', acao: 'Ação', aventura: 'Aventura', corrida: 'Corrida', arcade: 'Arcade',
  roguelike: 'Roguelike', multiplayer: 'Multiplayer', estrategia: 'Estratégia', curtinhos: 'Curtinhos' };
const POR_VEZ = 30;
// capa guardada na pasta do projeto (as antigas da estante guardavam a URL inteira da BBS)
const srcCapa = j => `pico8/capas/${encodeURIComponent(String(j.capa || '').split('/').pop())}`;

// ---------- seus jogos exportados (IndexedDB, nada sai do navegador) ----------
const banco = () => new Promise(ok => { const r = indexedDB.open('oceano-pico8', 1); r.onupgradeneeded = () => r.result.createObjectStore('jogos', { keyPath: 'nome' }); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
async function meusJogos() { const db = await banco(); if (!db) return []; return new Promise(ok => { const r = db.transaction('jogos').objectStore('jogos').getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]); }); }
async function gravarJogo(j) { const db = await banco(); if (db) db.transaction('jogos', 'readwrite').objectStore('jogos').put(j); }
async function apagarJogo(nome) { const db = await banco(); if (db) db.transaction('jogos', 'readwrite').objectStore('jogos').delete(nome); }

// o export do PICO-8 é um .html que carrega um .js do lado: junta os dois num documento só
function documentoDoExport(jogo) {
  return jogo.html.replace(/<script([^>]*)\ssrc=["']([^"']+\.js)["']([^>]*)>\s*<\/script>/gi, (tudo, a, nome, b) => {
    const js = jogo.js[nome.split('/').pop()];
    return js == null ? tudo : `<script${a}${b}>${js.replace(/<\/script/gi, '<\\/script')}</script>`;
  });
}

let catalogo = null;
async function lerCatalogo() {
  catalogo ??= fetch('pico8/catalogo.json').then(r => r.json()).catch(() => ({ jogos: [] }));
  return catalogo;
}

// sugestões: os mais estrelados da BBS, com o Celeste sempre na frente; filtradas pelos estilos escolhidos
async function sugestoes(escolhidos) {
  const { jogos = [], celeste } = await lerCatalogo();
  return jogos.filter(j => !j.naoJogo && (!escolhidos.length || j.estilos?.some(e => escolhidos.includes(e))))
    .sort((a, b) => (b.post === celeste) - (a.post === celeste) || (b.estrelas || 0) - (a.estrelas || 0));
}

// uma página de Destaques/Novos ou de busca, direto da BBS; sem servidor, do catálogo guardado
async function listar(ordem, busca, pagina) {
  try {
    const r = await fetch(`pico8/bbs?${new URLSearchParams({ ordem, busca, pagina })}`);
    if (r.ok) { const d = await r.json(); if (d.jogos) return { jogos: d.jogos, aoVivo: true }; }
  } catch {}
  let { jogos = [], celeste } = await lerCatalogo();
  jogos = jogos.filter(j => !j.naoJogo);
  if (busca) { const b = busca.toLowerCase(); jogos = jogos.filter(j => `${j.titulo} ${j.autor} ${(j.tags || []).join(' ')}`.toLowerCase().includes(b)); }
  if (ordem === 'novos') jogos = [...jogos].sort((a, b) => b.data.localeCompare(a.data));
  return { jogos: jogos.slice((pagina - 1) * POR_VEZ, pagina * POR_VEZ), aoVivo: false, celeste };
}

const ESTILO = `<style>
  .p8 { max-width: 1040px; margin: 0 auto; padding: 32px 40px 72px; box-sizing: border-box; }
  .p8 [hidden] { display: none !important; }
  .p8 .p8-cab { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 22px; }
  .p8 .p8-cab h1 { display: flex; align-items: center; gap: 10px; margin: 0; }
  .p8 .p8-cab h1 svg { color: var(--acento); }
  .p8 .p8-cab p { margin: 0; color: var(--suave); font-size: 14px; }
  .p8 .p8-tela { margin-bottom: 28px; }
  .p8 .p8-tela-topo { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; font-size: 14px; }
  .p8 .p8-tela-topo b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .p8 .p8-tela iframe { display: block; width: 100%; max-width: 640px; height: 560px; margin: 0 auto; border: 0; background: #000; }
  .p8 .p8-busca { display: flex; margin-bottom: 14px; }
  .p8 .p8-busca input { flex: 1; min-width: 0; height: 38px; padding: 0 12px; }
  .p8 .p8-abas { display: flex; flex-wrap: wrap; gap: 4px 22px; margin-bottom: 18px; border-bottom: 1px solid var(--borda); }
  .p8 .p8-aba { border: 0; background: none; color: var(--suave); font: inherit; font-size: 14px; padding: 8px 0; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .p8 .p8-aba:hover { color: var(--texto); }
  .p8 .p8-aba[aria-pressed="true"] { color: var(--texto); border-bottom-color: var(--sol); }
  .p8 .p8-aba small { color: var(--suave); }
  .p8 .p8-filtros { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .p8 .p8-filtros .chip { border: 0; cursor: pointer; }
  .p8 .p8-filtros .chip[aria-pressed="true"] { background: var(--sol); color: var(--fundo); }
  .p8 .p8-estado { margin: 0 0 14px; font-size: 13px; color: var(--suave); }
  .p8 .p8-estado:empty { display: none; }
  .p8 .p8-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 22px 18px; }
  .p8 .p8-cart { position: relative; min-width: 0; }
  .p8 .p8-capa { position: relative; display: block; width: 100%; padding: 0; border: 0; cursor: pointer; background: var(--painel); aspect-ratio: 3 / 2; overflow: hidden; color: var(--suave); }
  .p8 .p8-capa img { width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; display: block; }
  .p8 .p8-capa > svg { position: absolute; inset: 0; margin: auto; width: 28px; height: auto; }
  .p8 .p8-capa img + svg { display: none; }
  .p8 .p8-capa::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 2px var(--acento); opacity: 0; }
  .p8 .p8-capa:hover::after, .p8 .p8-capa:focus-visible::after { opacity: 1; }
  .p8 .p8-nome { display: block; margin-top: 8px; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .p8 .p8-autor { display: block; font-size: 12px; color: var(--suave); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .p8 .p8-guardar { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; padding: 0; border: 0; display: grid; place-items: center; cursor: pointer;
    background: var(--fundo); color: var(--texto); opacity: 0; font-size: 14px; }
  .p8 .p8-cart:hover .p8-guardar, .p8 .p8-guardar:focus-visible, .p8 .p8-guardar[aria-pressed="true"] { opacity: 1; }
  .p8 .p8-guardar[aria-pressed="true"] { background: var(--sol); color: var(--fundo); }
  .p8 .p8-guardar svg { width: 10px; height: auto; }
  .p8 .p8-rodape { display: flex; justify-content: center; margin: 28px 0 0; }
  .p8 .p8-seus { margin-bottom: 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--suave); }
  @media (max-width: 640px) { .p8 { padding: 20px 16px 48px; } .p8 .p8-grade { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px 12px; } .p8 .p8-guardar { opacity: 1; } }
</style>`;

export const pico8 = {
  titulo: () => 'PICO-8',
  icone: 'console',
  html: () => `${ESTILO}
    <div class="p8">
      <header class="p8-cab"><h1>${icone('console')}<span>PICO-8</span></h1><p>Jogos da BBS da Lexaloffle no player oficial.</p></header>
      <section class="p8-tela" data-tela hidden>
        <div class="p8-tela-topo"><b data-tocando></b><a href="#" class="nota" data-post target="_blank" rel="noopener">ver na BBS</a><button class="btn px secundario" data-parar>fechar</button></div>
        <iframe data-player title="Player de PICO-8" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>
      </section>
      <form class="p8-busca" data-busca><input class="px" name="q" type="search" autocomplete="off" placeholder="Buscar jogos: nome, autor ou estilo" aria-label="Buscar jogos de PICO-8"></form>
      <nav class="p8-abas" aria-label="Listas">${Object.entries(ABAS).map(([k, n]) => `<button class="p8-aba" data-aba="${k}">${n}${k === 'estante' ? ' <small data-n-estante></small>' : ''}</button>`).join('')}</nav>
      <div class="p8-filtros" data-filtros role="group" aria-label="Estilos" hidden>
        <button class="chip" data-estilo="">Todos</button>${Object.entries(ESTILOS).map(([k, n]) => `<button class="chip" data-estilo="${k}">${n}</button>`).join('')}
      </div>
      <div class="p8-seus" data-seus hidden>
        <span>Exporte no PICO-8 com <b>EXPORT JOGO.HTML</b> e escolha o .html e o .js. Fica neste navegador e roda sem internet.</span>
        <label class="btn px">Escolher arquivos<input type="file" accept=".html,.htm,.js" multiple data-arquivos hidden></label>
      </div>
      <p class="p8-estado" data-estado></p>
      <div class="p8-grade" data-grade></div>
      <div class="p8-rodape"><button class="btn px secundario" data-mais hidden>mostrar mais</button></div>
    </div>`,

  montar(el, r, app) {
    const $ = s => el.querySelector(s);
    const estante = () => app.guardado.ler('pico8-estante', []);
    const instalado = post => estante().some(j => j.post === post);
    let aba = 'sugestoes', busca = '', pagina = 1, vistos = [], fila = [], pedido = 0;
    let escolhidos = app.guardado.ler('pico8-estilos', []).filter(e => e in ESTILOS);

    // capa que não veio: fica o ícone do console no lugar
    el.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);

    function cartao(j) {
      const tem = instalado(j.post);
      return `<article class="p8-cart">
        <button class="p8-capa" data-jogar="${esc(j.post)}" title="Jogar ${esc(j.titulo)}"><img loading="lazy" src="${srcCapa(j)}" alt="">${icone('console')}</button>
        <button class="p8-guardar" data-instalar="${esc(j.post)}" aria-pressed="${tem}" title="${tem ? 'Tirar da estante' : 'Instalar na estante'}">${icone(tem ? 'cartucho' : 'mais')}</button>
        <span class="p8-nome" title="${esc(j.titulo)}">${esc(j.titulo)}</span><span class="p8-autor">${esc(j.autor)}</span>
      </article>`;
    }
    function cartaoMeu(j) {
      return `<article class="p8-cart">
        <button class="p8-capa" data-jogar-meu="${esc(j.nome)}" title="Jogar ${esc(j.nome)}">${icone('console')}</button>
        <button class="p8-guardar" data-apagar-meu="${esc(j.nome)}" title="Apagar" style="opacity:1">${icone('fechar')}</button>
        <span class="p8-nome">${esc(j.nome)}</span><span class="p8-autor">seu · ${esc(j.data)}</span>
      </article>`;
    }

    const contarEstante = () => { const n = estante().length; $('[data-n-estante]').textContent = n ? n : ''; };
    function marcar() {
      el.querySelectorAll('[data-aba]').forEach(b => b.setAttribute('aria-pressed', b.dataset.aba === aba && !busca));
      el.querySelectorAll('[data-estilo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.estilo ? escolhidos.includes(b.dataset.estilo) : !escolhidos.length));
      $('[data-filtros]').hidden = aba !== 'sugestoes' || !!busca;
      $('[data-seus]').hidden = aba !== 'seus' || !!busca;
      contarEstante();
    }
    // mostra mais um pedaço de uma lista que já está toda na memória (sugestões, estante)
    function mostrarFila(mais) {
      const grade = $('[data-grade]');
      if (!mais) { pagina = 1; vistos = []; grade.innerHTML = ''; }
      const pedaco = fila.slice(vistos.length, vistos.length + POR_VEZ);
      vistos.push(...pedaco);
      grade.insertAdjacentHTML('beforeend', pedaco.map(cartao).join(''));
      $('[data-mais]').hidden = vistos.length >= fila.length;
    }

    async function desenhar(mais = false) {
      marcar();
      const grade = $('[data-grade]'), estado = $('[data-estado]');
      $('[data-mais]').hidden = true;
      const n = ++pedido;
      if (!busca && aba === 'sugestoes') {
        if (!mais) fila = await sugestoes(escolhidos);
        if (n !== pedido) return;
        estado.textContent = fila.length ? '' : 'Nenhum jogo com esses estilos ainda.';
        return mostrarFila(mais);
      }
      if (!busca && aba === 'estante') {
        fila = estante();
        estado.textContent = fila.length ? '' : 'A estante está vazia. Toque no + de um jogo para guardar aqui.';
        return mostrarFila(mais);
      }
      if (!busca && aba === 'seus') {
        const meus = await meusJogos();
        if (n !== pedido) return;
        estado.textContent = '';
        grade.innerHTML = meus.map(cartaoMeu).join('');
        return;
      }
      if (!mais) { pagina = 1; vistos = []; grade.innerHTML = ''; }
      estado.textContent = busca ? `Buscando “${busca}”…` : '';
      const { jogos, aoVivo, celeste } = await listar(busca ? 'destaques' : aba, busca, pagina);
      if (n !== pedido || !el.isConnected) return;
      // nos Destaques, o Celeste abre a lista
      if (!busca && aba === 'destaques' && pagina === 1) {
        const id = celeste || (await lerCatalogo()).celeste, c = (await lerCatalogo()).jogos?.find(j => j.post === id);
        if (c && !jogos.some(j => j.post === id)) jogos.unshift(c); else jogos.sort((a, b) => (b.post === id) - (a.post === id));
      }
      const novos = jogos.filter(j => !vistos.some(v => v.post === j.post));
      vistos.push(...novos);
      grade.insertAdjacentHTML('beforeend', novos.map(cartao).join(''));
      estado.textContent = busca && !vistos.length ? `Nada encontrado para “${busca}”.` : busca ? `${vistos.length} resultado(s) para “${busca}”` : '';
      if (!aoVivo) estado.textContent += (estado.textContent ? ' · ' : '') + 'sem conexão com a BBS: mostrando o catálogo guardado';
      $('[data-mais]').hidden = jogos.length < POR_VEZ;
    }

    function jogar(j) {
      $('[data-tocando]').textContent = `${j.titulo} · ${j.autor}`;
      const post = $('[data-post]');
      post.hidden = !j.post; if (j.post) post.href = POST(j.post);
      const ifr = $('[data-player]');
      ifr.removeAttribute('srcdoc'); ifr.removeAttribute('sandbox');
      if (j.doc) { ifr.setAttribute('sandbox', 'allow-scripts allow-pointer-lock'); ifr.srcdoc = j.doc; } else ifr.src = WIDGET(j.post);
      $('[data-tela]').hidden = false;
      $('[data-tela]').scrollIntoView({ block: 'start', behavior: 'smooth' });
      ifr.focus();
    }
    const parar = () => { const ifr = $('[data-player]'); ifr.removeAttribute('srcdoc'); ifr.src = 'about:blank'; $('[data-tela]').hidden = true; };
    const achar = post => vistos.find(x => x.post === post) || fila.find(x => x.post === post) || estante().find(x => x.post === post);

    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.aba) { aba = b.dataset.aba; busca = ''; $('[data-busca]').q.value = ''; desenhar(); }
      else if (b.dataset.estilo != null) {
        const k = b.dataset.estilo;
        escolhidos = !k ? [] : escolhidos.includes(k) ? escolhidos.filter(x => x !== k) : [...escolhidos, k];
        app.guardado.gravar('pico8-estilos', escolhidos);
        desenhar();
      }
      else if (b.dataset.jogar) { const j = achar(b.dataset.jogar); if (j) jogar(j); }
      else if (b.dataset.instalar) {
        const post = b.dataset.instalar, lista = estante();
        if (lista.some(j => j.post === post)) {
          app.guardado.gravar('pico8-estante', lista.filter(j => j.post !== post));
          app.aviso('Tirado da estante.', 'PICO-8');
          if (aba === 'estante' && !busca) return desenhar();
        } else {
          const j = achar(post); if (!j) return;
          app.guardado.gravar('pico8-estante', [{ ...j, instalado: new Date().toISOString().slice(0, 10) }, ...lista]);
          app.aviso(`“${j.titulo}” na estante.`, 'PICO-8');
        }
        const tem = instalado(post);
        el.querySelectorAll(`[data-instalar="${CSS.escape(post)}"]`).forEach(x => {
          x.setAttribute('aria-pressed', tem); x.title = tem ? 'Tirar da estante' : 'Instalar na estante'; x.innerHTML = icone(tem ? 'cartucho' : 'mais');
        });
        contarEstante();
      }
      else if (b.dataset.jogarMeu) { const j = (await meusJogos()).find(x => x.nome === b.dataset.jogarMeu); if (j) jogar({ titulo: j.nome, autor: 'você', doc: documentoDoExport(j) }); }
      else if (b.dataset.apagarMeu) { await apagarJogo(b.dataset.apagarMeu); desenhar(); }
      else if (b.hasAttribute('data-parar')) parar();
      else if (b.hasAttribute('data-mais')) { if (fila.length && (aba === 'sugestoes' || aba === 'estante') && !busca) mostrarFila(true); else { pagina++; desenhar(true); } }
    });
    $('[data-busca]').onsubmit = e => { e.preventDefault(); busca = e.target.q.value.trim(); desenhar(); };
    $('[data-busca]').q.addEventListener('search', e => { if (!e.target.value && busca) { busca = ''; desenhar(); } });
    $('[data-arquivos]').onchange = async e => {
      const arqs = [...e.target.files]; e.target.value = '';
      const html = arqs.find(f => /\.html?$/i.test(f.name));
      if (!html) return app.aviso('Escolha o .html exportado (e o .js que vem junto).', 'PICO-8', 'erro');
      if (arqs.reduce((s, f) => s + f.size, 0) > 20 * 1048576) return app.aviso('Arquivos grandes demais para um export de PICO-8.', 'PICO-8', 'erro');
      const js = {};
      for (const f of arqs) if (/\.js$/i.test(f.name)) js[f.name] = await f.text();
      const texto = await html.text();
      const falta = [...texto.matchAll(/<script[^>]*\ssrc=["']([^"']+\.js)["']/gi)].map(m => m[1].split('/').pop()).filter(n => !(n in js) && !/^https?:/.test(n));
      const nome = html.name.replace(/\.html?$/i, '');
      await gravarJogo({ nome, html: texto, js, data: new Date().toISOString().slice(0, 10) });
      app.aviso(falta.length ? `“${nome}” guardado, mas falta ${falta.join(', ')}: escolha os dois arquivos juntos.` : `“${nome}” guardado.`, 'PICO-8', falta.length ? 'erro' : undefined);
      desenhar();
    };

    desenhar();
    return { desmontar: parar };
  },
};
