// Leitor em forma de livro e lista de leitura (oceano://leitura).
// O livro mostra a matéria como a página entregou: título, subtítulo, autor, data, imagens com legenda e crédito,
// o texto e o link para a original. Popups, avisos de "desligue o bloqueador" e banners por cima ficam de fora
// (como no modo leitura do Firefox e do Safari). Nada de truque para destravar conteúdo pago: sem fingir ser robô
// de busca, sem cache ou arquivo, sem desligar scripts. Se a página só entregou um trecho, o livro mostra o trecho e avisa.
// Para artigos acadêmicos com DOI, oferece procurar uma versão aberta e legal no Unpaywall (só quando você pede).
// A lista fica só neste computador, por perfil, como o histórico; títulos e endereços ficam atrás do cadeado.
// O texto principal sai do Readability da Mozilla (Apache-2.0, em vendor/readability).

import { icone } from './icones.js';
import { sensivel } from './sensivel.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ehSite = u => /^https?:\/\//i.test(u);
const ehImagem = u => /^data:image\/(png|jpeg|webp|gif|avif);base64,/i.test(u || '');
const CONTATO_UNPAYWALL = 'leitor@oceano.gg';   // a API do Unpaywall pede um e-mail de contato em cada consulta
const PREFS = { fonte: 'pixel', tamanho: 20, tema: 'claro' };
const FONTES = { pixel: 'pixel', serifa: 'serifa', simples: 'simples' };
const TAMANHOS = [14, 16, 18, 20, 22, 24, 28, 32];
const MAX_IMAGENS = 30;

// ---------- extrair (roda dentro da página) ----------
// Precisa ser uma função só, sem nada de fora: no app ela vai como texto para a aba do site.

function extrair(Readability, raiz) {
  const doc0 = raiz.ownerDocument, win = doc0.defaultView;
  const MARCA = 'data-oceano-fora', marcados = [], tocados = [];
  const fora = el => { el.setAttribute(MARCA, ''); marcados.push(el); };
  const vw = win.innerWidth, vh = win.innerHeight;
  const AVISO_NOME = /paywall|regwall|adblock|ad-block|subscri|assinat|assine|piano|tp-modal|tp-backdrop|modal|overlay|popup|cookie|consent|newsletter/i;
  const AVISO_TEXTO = /bloqueador|ad ?block|desative|desligue|assine|assinante|subscribe|cookies|newsletter|sign in|cadastre/i;
  const CONTINUA = /continu(e|ar) lendo|para (continuar|ler) (a matéria|o texto|lendo|a reportagem)|exclusiv[oa] para assinantes|conteúdo exclusivo|assine para|subscribe to (continue|read)|to continue reading|subscribers only|already a subscriber|já é assinante/i;
  const CREDITO = /credit|cr[eé]dito|copyright|photographer|fotografo|fotógrafo|foto-autor|photo-by|image-source|source/i;
  const abs = u => { try { const x = new URL(u, win.location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const estilo = new Map();
  const cs = el => { let s = estilo.get(el); if (!s) estilo.set(el, (s = win.getComputedStyle(el))); return s; };

  // dados estruturados schema.org (autor, data, imagem, se é pago)
  let fechado = false;
  const objetos = [];
  const ver = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(ver);
    objetos.push(o);
    if (String(o.isAccessibleForFree).toLowerCase() === 'false') fechado = true;
    for (const v of Object.values(o)) if (v && typeof v === 'object') ver(v);
  };
  for (const s of doc0.querySelectorAll('script[type="application/ld+json"]')) { try { ver(JSON.parse(s.textContent)); } catch {} }

  // 1. o escondido não entra; o que fica por cima do texto (popups, avisos, banners) também não
  let avisoNoTexto = false;
  for (const el of raiz.querySelectorAll('*')) {
    const s = cs(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || +s.opacity < 0.1
      || s.contentVisibility === 'hidden' || el.hidden) { fora(el); continue; }
    if (s.position === 'fixed') { fora(el); continue; }
    const nome = (typeof el.className === 'string' ? el.className : '') + ' ' + el.id;
    if (s.position === 'absolute') {
      const r = el.getBoundingClientRect();
      if (r.width * r.height > vw * vh * 0.2 && (AVISO_NOME.test(nome) || AVISO_TEXTO.test((el.innerText || '').slice(0, 1500)))) { fora(el); continue; }
    }
    if (el.tagName === 'IMG') { el.setAttribute('data-oceano-src', el.currentSrc || el.src || ''); tocados.push(el); }
    else if (CREDITO.test(nome) && el.closest('figure, [class*="image" i], [class*="foto" i], [class*="photo" i], [class*="media" i]')) { el.setAttribute('data-oceano-credito', ''); tocados.push(el); }
    // "assine para continuar lendo" no meio da página: a página entregou só um trecho
    if (!avisoNoTexto && el.childElementCount < 6 && /^(DIV|SECTION|ASIDE|P|FOOTER)$/.test(el.tagName)) {
      const t = el.textContent;
      if (t.length < 600 && CONTINUA.test(t)) avisoNoTexto = true;
    }
  }

  // 2. texto cortado por uma caixa com altura limitada (o "leia mais para assinantes") fica de fora e conta como trecho
  let cortados = 0;
  for (const el of raiz.querySelectorAll('p, h2, h3, h4, h5, h6, li, blockquote, pre, figure, table')) {
    if (el.closest('[' + MARCA + ']')) continue;
    const r = el.getBoundingClientRect();
    for (let a = el.parentElement, n = 0; a && a !== doc0.documentElement && n < 12; a = a.parentElement, n++) {
      const s = cs(a);
      if (!/hidden|clip|scroll|auto/.test(s.overflowY + s.overflowX)) continue;
      if (/scroll|auto/.test(s.overflowY) && a.scrollHeight > a.clientHeight) continue;   // caixa com rolagem: dá para ler
      if (a === doc0.body) continue;   // página travada por um popup: o texto continua lá
      const ra = a.getBoundingClientRect();
      if (r.top >= ra.bottom - 2 || r.bottom <= ra.top + 2 || r.left >= ra.right - 2) { fora(el); if (el.textContent.trim().length > 40) cortados++; break; }
    }
  }

  // 3. cópia inerte da página (sem scripts, sem carregar imagens), sem o que ficou de fora
  const doc = doc0.implementation.createHTMLDocument('');
  if (raiz === doc0.body) doc.documentElement.innerHTML = doc0.documentElement.innerHTML;
  else { doc.title = doc0.title; doc.body.innerHTML = raiz.innerHTML; }
  for (const el of marcados) el.removeAttribute(MARCA);
  for (const el of tocados) { el.removeAttribute('data-oceano-src'); el.removeAttribute('data-oceano-credito'); }
  for (const el of doc.querySelectorAll('[' + MARCA + '], script, style, noscript, template')) el.remove();
  const base = doc.createElement('base');
  base.href = win.location.href;
  doc.head.prepend(base);

  // metadados: título, subtítulo, autor, data, imagem principal
  const meta = n => doc0.querySelector(`meta[name="${n}" i], meta[property="${n}" i], meta[itemprop="${n}" i]`)?.content?.trim() || '';
  const tipo = o => [].concat(o['@type'] || []).join(' ');
  const artigoLd = objetos.find(o => /Article|BlogPosting|Report|Story/i.test(tipo(o))) || {};
  const nomes = a => [].concat(a || []).map(x => (typeof x === 'string' ? x : x?.name)).filter(x => x && !/^https?:/.test(x)).join(', ');
  const imagemLd = i => { const x = [].concat(i || [])[0]; return typeof x === 'string' ? x : x?.url || x?.contentUrl || ''; };
  const achar = t => (/\b10\.\d{4,9}\/[^\s"'<>?#]+/.exec(t || '') || [''])[0].replace(/[.,;)\]]+$/, '');
  const doi = ['citation_doi', 'dc.identifier', 'dc.identifier.doi', 'prism.doi', 'bepress_citation_doi', 'doi'].map(meta).map(achar).find(Boolean)
    || achar(doc0.querySelector('a[href*="doi.org/10."]')?.href) || achar(decodeURIComponent(win.location.pathname));

  const art = new Readability(doc, { charThreshold: 250, keepClasses: false }).parse();
  const autorMeta = [meta('author'), meta('article:author'), meta('citation_author'), meta('dc.creator')].find(x => x && !/^https?:/.test(x));
  return {
    trecho: cortados > 0 || avisoNoTexto, fechado, doi, url: win.location.href,
    titulo: String(artigoLd.headline || meta('og:title') || art?.title || doc0.title || '').trim(),
    subtitulo: String(artigoLd.alternativeHeadline || meta('og:description') || meta('description') || art?.excerpt || '').trim().slice(0, 400),
    autor: (nomes(artigoLd.author) || art?.byline || autorMeta || '').replace(/^(por|by|de)\s+/i, '').trim(),
    data: meta('article:published_time') || artigoLd.datePublished || meta('citation_publication_date') || meta('dc.date') || meta('date')
      || doc0.querySelector('time[datetime]')?.getAttribute('datetime') || '',
    imagem: abs(meta('og:image') || meta('twitter:image') || imagemLd(artigoLd.image)),
    site: art?.siteName || meta('og:site_name') || win.location.hostname,
    html: art?.content || '', tamanho: art?.length || 0, idioma: art?.lang || doc0.documentElement.lang || '',
  };
}

// ---------- limpar o HTML antes de mostrar na interface ----------
// A interface do Oceano tem acesso ao app: do texto do site só passam tags de leitura, sem atributos.
// Imagens viram <img data-img="endereço">: só ganham src depois de baixadas e refeitas aqui (carregarImagens).

const PERMITIDAS = new Set('P H1 H2 H3 H4 H5 H6 UL OL LI BLOCKQUOTE PRE CODE EM STRONG B I U S SUB SUP A BR HR FIGURE FIGCAPTION TABLE THEAD TBODY TFOOT TR TH TD DL DT DD Q SMALL MARK ABBR TIME CITE KBD VAR DEL INS CAPTION'.split(' '));
const DESCARTAR = new Set('SCRIPT STYLE IFRAME FRAME OBJECT EMBED FORM INPUT BUTTON SELECT TEXTAREA SVG MATH NOSCRIPT TEMPLATE VIDEO AUDIO CANVAS SOURCE TRACK LINK META BASE HEAD TITLE DIALOG'.split(' '));

export function limpar(html, base) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const saida = document.createElement('div');
  const endereco = u => { try { const x = new URL(u, base); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const copiar = (de, para) => {
    for (const n of de.childNodes) {
      if (n.nodeType === 3) { para.append(n.textContent); continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName;
      if (t === 'IMG') {
        const src = endereco(n.getAttribute('data-oceano-src') || n.getAttribute('src') || n.getAttribute('data-src') || '');
        const alt = (n.getAttribute('alt') || '').trim().slice(0, 300);
        if (src) { const i = document.createElement('img'); i.dataset.img = src; i.alt = alt; para.append(i); }
        continue;
      }
      if (DESCARTAR.has(t)) continue;
      if (n.hasAttribute('data-oceano-credito')) { const c = document.createElement('small'); c.className = 'livro-credito'; copiar(n, c); if (c.textContent.trim()) para.append(c); continue; }
      if (!PERMITIDAS.has(t)) { copiar(n, para); continue; }
      const e = document.createElement(t.toLowerCase());
      if (t === 'A') { const h = endereco(n.getAttribute('href') || ''); if (h) e.setAttribute('href', h); }
      if ((t === 'TD' || t === 'TH') && /^\d{1,2}$/.test(n.getAttribute('colspan') || '')) e.setAttribute('colspan', n.getAttribute('colspan'));
      copiar(n, e);
      para.append(e);
    }
  };
  copiar(doc.body, saida);
  // títulos dentro do texto descem um nível: o título do livro é o único h1
  for (const h of saida.querySelectorAll('h1')) { const h2 = document.createElement('h2'); h2.append(...h.childNodes); h.replaceWith(h2); }
  // imagem solta com legenda logo depois vira figura
  for (const i of saida.querySelectorAll('img')) {
    if (i.closest('figure')) continue;
    const f = document.createElement('figure');
    i.replaceWith(f);
    f.append(i);
  }
  return saida.innerHTML;
}

const contarPalavras = html => { const d = document.createElement('div'); d.innerHTML = html; d.querySelectorAll('figure').forEach(f => f.remove()); return (d.textContent.match(/\S+/g) || []).length; };

// ---------- imagens: baixadas uma vez, reduzidas e guardadas junto do texto ----------
// No app vêm pela mesma sessão (perfil) da aba; no simulador, por fetch. Ícones e pixels de rastreio somem.

async function reduzir(dados) {
  const img = new Image();
  img.src = dados;
  await img.decode();
  if (img.naturalWidth < 80 || img.naturalHeight < 60) return null;
  const k = Math.min(1, 1200 / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

async function baixarImagem(app, url) {
  if (ehImagem(url)) return reduzir(url);
  let dados = null;
  if (app.real && window.oceanoNativo?.leitorImagem) dados = await window.oceanoNativo.leitorImagem(app.abaAtiva?.particao || 'persist:oceano', url);
  else {
    const r = await fetch(url);
    const b = r.ok && /^image\//.test(r.headers.get('content-type') || '') ? await r.blob() : null;
    if (b) dados = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = () => ok(null); f.readAsDataURL(b); });
  }
  return ehImagem(dados) ? reduzir(dados) : null;
}

async function carregarImagens(app, html, capaUrl) {
  const d = document.createElement('div');
  d.innerHTML = html;
  const imgs = [...d.querySelectorAll('img[data-img]')];
  // a imagem principal já vai na capa: a primeira cópia dela sai do texto
  if (capaUrl) { const igual = imgs.find(i => i.dataset.img === capaUrl); if (igual) { (igual.closest('figure') || igual).remove(); imgs.splice(imgs.indexOf(igual), 1); } }
  const fila = imgs.slice(0, MAX_IMAGENS);
  for (const i of imgs.slice(MAX_IMAGENS)) (i.closest('figure') || i).remove();
  const tempo = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(() => ok(null), ms))]);
  const capa = capaUrl ? tempo(baixarImagem(app, capaUrl).catch(() => null), 10000) : Promise.resolve(null);
  for (let k = 0; k < fila.length; k += 4) {
    await Promise.all(fila.slice(k, k + 4).map(async i => {
      const dados = await tempo(baixarImagem(app, i.dataset.img).catch(() => null), 10000);
      if (dados) { i.src = dados; i.removeAttribute('data-img'); return; }
      // não veio: fica a descrição, se tiver
      const alvo = i.closest('figure') || i;
      if (i.alt.length > 2) { const s = document.createElement('span'); s.className = 'livro-img'; s.textContent = `[imagem: ${i.alt}]`; i.replaceWith(s); }
      else if (alvo === i || !alvo.querySelector('figcaption')) alvo.remove();
      else i.remove();
    }));
  }
  return { html: d.innerHTML, capa: await capa };
}

// ---------- pegar o texto da aba aberta ----------

let fonteReadability = null;
async function lerReadability() {
  return fonteReadability ??= fetch('vendor/readability/Readability.js').then(r => { if (!r.ok) throw new Error('Readability não encontrado'); return r.text(); });
}

async function extrairDaAba(app) {
  const aba = app.abaAtiva, url = app.url();
  if (app.real && ehSite(url)) {
    if (!aba.wv) throw new Error('a página ainda não abriu');
    const src = await lerReadability();
    return aba.wv.executeJavaScript(`(() => { ${src}\n;return (${extrair.toString()})(Readability, document.body); })()`);
  }
  // simulador: lê a página interna que está na tela
  const raiz = document.querySelector('#pagina');
  if (!window.Readability) {
    await new Promise((ok, erro) => { const s = document.createElement('script'); s.src = 'vendor/readability/Readability.js'; s.onload = ok; s.onerror = () => erro(new Error('Readability não encontrado')); document.head.append(s); });
  }
  const r = extrair(window.Readability, raiz);
  return { ...r, url, site: 'Oceano', titulo: app.tituloDe(url, aba), subtitulo: '', imagem: '', data: '', autor: '' };
}

// prepara a matéria para o livro: limpa, baixa as imagens e confere se tem texto
export async function prepararArtigo(app, r) {
  // "Título · Nome do site" vira só "Título" (o site já aparece na capa)
  if (r.site) r.titulo = r.titulo.replace(new RegExp(`\\s+[·|–—-]\\s+${r.site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
  const limpo = limpar(r.html, r.url);
  const palavras = contarPalavras(limpo);
  if (palavras < 40) return null;
  const { html, capa } = await carregarImagens(app, limpo, r.imagem);
  return { ...r, html, capa: ehImagem(capa) ? capa : '', palavras };
}

// ---------- Unpaywall: versão aberta pelo DOI ----------

async function versaoAberta(app, doi) {
  app.registrarRede('api.unpaywall.org', 'Leitor: procurar versão aberta do artigo (você pediu)', 'o DOI do artigo e o contato do Oceano');
  const r = await fetch(`https://api.unpaywall.org/v2/${doi.split('/').map(encodeURIComponent).join('/')}?email=${encodeURIComponent(CONTATO_UNPAYWALL)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('o Unpaywall respondeu ' + r.status);
  const j = await r.json(), m = j.best_oa_location;
  if (!j.is_oa || !m) return null;
  const url = m.url_for_landing_page || m.url_for_pdf || m.url;
  return /^https?:\/\//.test(url) ? { url, onde: m.host_type === 'repository' ? 'repositório' : 'editora', licenca: m.license || '', versao: m.version || '' } : null;
}

// ---------- textos guardados: o índice fica no localStorage, o texto com as imagens no IndexedDB ----------

let banco = null;
const abrirBanco = () => banco ??= new Promise((ok, erro) => {
  const r = indexedDB.open('oceano-leitura', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('textos');
  r.onsuccess = () => ok(r.result);
  r.onerror = () => erro(r.error);
});
async function textos(modo, fn) {
  const db = await abrirBanco();
  return new Promise((ok, erro) => {
    const t = db.transaction('textos', modo), req = fn(t.objectStore('textos'));
    t.oncomplete = () => ok(req?.result);
    t.onerror = t.onabort = () => erro(t.error);
  });
}

const dataBonita = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); };

// ---------- lista de leitura ----------

export function iniciarLeitor(app, guardado) {
  const chaveItens = () => 'leitura:' + app.perfilAtual();
  const itens = () => guardado.ler(chaveItens(), []);
  const prefs = () => ({ ...PREFS, ...guardado.ler('leitor-prefs', {}) });

  function gravarItens(lista) {
    guardado.gravar(chaveItens(), lista);
    // o armazenamento local tem limite: confere se gravou de verdade
    if (guardado.ler(chaveItens(), []).length !== lista.length) { app.aviso('Sem espaço para guardar mais textos. Apague alguns da lista de leitura.', 'Leitura', 'erro'); return false; }
    app.emitir('leitura');
    return true;
  }
  const achar = url => itens().find(i => i.url === url);
  const mudar = (id, fn) => { const l = itens(), i = l.find(x => x.id === id); if (!i) return null; fn(i); gravarItens(l); return i; };

  async function guardar(artigo) {
    const ja = achar(artigo.url);
    if (ja) return ja;
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      url: artigo.url, titulo: artigo.titulo, subtitulo: artigo.subtitulo || '', autor: artigo.autor, data: artigo.data || '', site: artigo.site,
      doi: artigo.doi || '', trecho: !!artigo.trecho, palavras: artigo.palavras, idioma: artigo.idioma || '',
      hora: Date.now(), favorito: false, listas: [], progresso: 0,
    };
    try { await textos('readwrite', t => t.put({ html: artigo.html, capa: artigo.capa || '' }, item.id)); }
    catch (e) { app.aviso('Não deu para guardar o texto: ' + (e.message || e), 'Leitura', 'erro'); return null; }
    return gravarItens([item, ...itens()]) ? item : null;
  }
  async function tirar(id) {
    gravarItens(itens().filter(i => i.id !== id));
    await textos('readwrite', t => t.delete(id)).catch(() => {});
  }


  async function lerPaginaAtual() {
    const url = app.url();
    if (!url || /^oceano:\/\/(nova-aba|leitura)/.test(url)) return app.aviso('Abra uma página com texto para ler como livro.', 'Leitura');
    let artigo;
    bt.classList.add('carregando');
    try { artigo = await prepararArtigo(app, await extrairDaAba(app)); }
    catch (e) { return app.aviso('Não deu para ler esta página: ' + (e.message || e), 'Leitura', 'erro'); }
    finally { bt.classList.remove('carregando'); }
    if (!artigo) return app.aviso('Não achei um texto principal nesta página.', 'Leitura');
    abrirLivro(artigo);
  }

  // ---------- o livro ----------

  let aberto = null;
  function abrirLivro(artigo, item = achar(artigo.url)) {
    aberto?.fechar();
    const p = prefs();
    const voltarFoco = document.activeElement;
    const el = document.createElement('section');
    el.className = 'livro';
    el.dataset.tema = p.tema; el.dataset.fonte = p.fonte;
    el.style.setProperty('--livro-tam', p.tamanho + 'px');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Leitor: ' + (artigo.titulo || 'texto'));
    if (artigo.idioma) el.lang = artigo.idioma;
    const topo = document.querySelector('.cromo')?.getBoundingClientRect().bottom || 0;
    el.style.top = Math.round(topo) + 'px';
    const minutos = Math.max(1, Math.round((artigo.palavras || 0) / 200));
    const original = ehSite(artigo.url) ? artigo.url : '';
    const quem = [artigo.autor, dataBonita(artigo.data)].filter(Boolean).join(' · ');
    const aviso = artigo.trecho ? `
      <div class="livro-aviso" role="note">
        <h2>O site mostrou só um trecho.</h2>
        <p>Este livro tem o que a página entregou${original ? `. Para ler tudo, abra a <a href="${esc(original)}">matéria original</a>` : ''}; se você assina, entre na sua conta e abra o leitor de novo.</p>
      </div>` : '';
    el.innerHTML = `
      <header class="livro-topo">
        <button type="button" class="livro-bt" data-l="fechar" title="Fechar o leitor e voltar (Esc)">${icone('fechar')}<span>fechar</span></button>
        <span class="livro-nome">${icone('livro')}<span>${esc(artigo.titulo || 'Leitor')}</span></span>
        <div class="livro-ajustes" role="toolbar" aria-label="Ajustes do leitor">
          <button type="button" class="livro-bt" data-l="fonte" title="Trocar a fonte">Aa <span data-fonte-nome></span></button>
          <button type="button" class="livro-bt" data-l="menor" aria-label="Letra menor" title="Letra menor (−)">A−</button>
          <button type="button" class="livro-bt" data-l="maior" aria-label="Letra maior" title="Letra maior (+)">A+</button>
          <button type="button" class="livro-bt" data-l="tema" title="Tema claro ou escuro (T)">${icone('sol')}<span data-tema-nome></span></button>
          <button type="button" class="livro-bt" data-l="guardar"></button>
          <button type="button" class="livro-bt" data-l="favorito"></button>
          ${original ? `<a class="livro-bt" href="${esc(original)}" title="Abrir a matéria original numa aba nova">${icone('mundo')}<span>original</span></a>` : ''}
          ${artigo.doi ? `<button type="button" class="livro-bt" data-l="aberta" title="Procura no Unpaywall uma versão aberta e legal deste artigo">${icone('mundo')}<span>versão aberta</span></button>` : ''}
        </div>
      </header>
      <div class="livro-mesa">
        <button type="button" class="livro-virar" data-l="ant" aria-label="Página anterior">${icone('voltar')}</button>
        <div class="livro-moldura"><div class="livro-folhas">
          <article class="livro-texto">
            <header class="livro-capa${ehImagem(artigo.capa) ? ' com-imagem' : ''}">
              ${ehImagem(artigo.capa) ? `<img class="livro-capa-img" src="${esc(artigo.capa)}" alt="">` : ''}
              <p class="livro-site">${esc(artigo.site || '')}</p>
              <h1>${esc(artigo.titulo || '')}</h1>
              ${artigo.subtitulo ? `<p class="livro-sub">${esc(artigo.subtitulo)}</p>` : ''}
              ${quem ? `<p class="livro-autor">${esc(quem)}</p>` : ''}
              <p class="livro-meta">${minutos} min de leitura${artigo.trecho ? ' · o site mostrou só um trecho' : ''}</p>
            </header>
            ${artigo.html}
            ${aviso}
            ${original ? `<p class="livro-fonte">Original: ${esc(artigo.site || '')} · <a href="${esc(original)}">${esc(original.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80))}</a></p>` : ''}
            ${original && !artigo.doi ? `<p class="livro-apoio">Se você valoriza o trabalho jornalístico, acesse o <a href="${esc(original)}">link original</a> e faça a assinatura do jornal.</p>` : ''}
            <p class="livro-fim">fim</p>
          </article>
        </div></div>
        <button type="button" class="livro-virar" data-l="prox" aria-label="Próxima página">${icone('avancar')}</button>
      </div>
      <footer class="livro-pe">
        <span class="livro-pag" aria-live="polite"></span>
        <div class="livro-barra" aria-hidden="true"><i></i></div>
        <span class="livro-dica">← → viram a página · Esc volta ${/^https?:/.test(app.url?.() || '') ? 'ao site original' : 'para onde você estava'}</span>
      </footer>`;
    document.body.append(el);

    const folhas = el.querySelector('.livro-folhas'), texto = el.querySelector('.livro-texto');
    const rotulo = el.querySelector('.livro-pag'), barra = el.querySelector('.livro-barra i');
    let pagina = 0, total = 1, passo = 1, salvar = 0;
    const lento = !matchMedia('(prefers-reduced-motion: reduce)').matches;

    function irPara(n, animar = true) {
      pagina = Math.max(0, Math.min(total - 1, n));
      texto.style.transition = animar && lento ? '' : 'none';
      texto.style.transform = `translateX(${-pagina * passo}px)`;
      const duas = el.classList.contains('duas');
      const a = duas ? pagina * 2 + 1 : pagina + 1;
      rotulo.textContent = `página ${duas ? `${a}–${a + 1}` : a} de ${duas ? total * 2 : total}`;
      barra.style.width = (total > 1 ? (pagina / (total - 1)) * 100 : 100) + '%';
      el.querySelector('[data-l="ant"]').disabled = pagina === 0;
      el.querySelector('[data-l="prox"]').disabled = pagina >= total - 1;
      // guarda onde parou (só para o que está na lista)
      clearTimeout(salvar);
      const it = item && achar(artigo.url);
      if (it) salvar = setTimeout(() => mudar(it.id, i => { i.progresso = total > 1 ? pagina / (total - 1) : 1; i.lido = Date.now(); }), 400);
    }
    function paginar(fracao = total > 1 ? pagina / (total - 1) : 0) {
      const larg = folhas.clientWidth, duas = larg >= 820;
      el.classList.toggle('duas', duas);
      const gap = duas ? 72 : 40;
      texto.style.columnGap = gap + 'px';
      texto.style.columnCount = duas ? 2 : 1;
      texto.style.width = larg + 'px';
      el.style.setProperty('--folha-h', folhas.clientHeight + 'px');
      passo = larg + gap;
      total = Math.max(1, Math.ceil((texto.scrollWidth + gap - 1) / passo));
      irPara(Math.round(fracao * (total - 1)), false);
    }
    function mostrarPrefs() {
      const q = prefs();
      el.dataset.tema = q.tema; el.dataset.fonte = q.fonte;
      el.style.setProperty('--livro-tam', q.tamanho + 'px');
      el.querySelector('[data-fonte-nome]').textContent = q.fonte;
      el.querySelector('[data-tema-nome]').textContent = q.tema;
      el.querySelector('[data-l="menor"]').disabled = q.tamanho <= TAMANHOS[0];
      el.querySelector('[data-l="maior"]').disabled = q.tamanho >= TAMANHOS.at(-1);
    }
    function mudarPrefs(fn) {
      const q = prefs(); fn(q); guardado.gravar('leitor-prefs', q);
      const fr = total > 1 ? pagina / (total - 1) : 0;
      mostrarPrefs();
      requestAnimationFrame(() => paginar(fr));
    }
    function mostrarGuardado() {
      const g = el.querySelector('[data-l="guardar"]'); if (!g) return;
      const it = achar(artigo.url);
      g.innerHTML = `${icone(it ? 'marcador-cheio' : 'marcador')}<span>${it ? 'guardado' : 'guardar para ler'}</span>`;
      g.setAttribute('aria-pressed', !!it);
      g.title = it ? 'Tirar da lista de leitura' : 'Guardar o texto para ler depois, mesmo sem internet';
      const f = el.querySelector('[data-l="favorito"]');
      f.innerHTML = `${icone(it?.favorito ? 'estrela' : 'estrela-vazia')}<span class="sr">favorito</span>`;
      f.setAttribute('aria-pressed', !!it?.favorito);
      f.title = f.ariaLabel = it?.favorito ? 'Tirar dos favoritos da leitura' : 'Favoritar (guarda na lista e marca com estrela)';
    }
    const garantir = async () => { const it = achar(artigo.url) || await guardar(artigo); item = it; return it; };

    async function procurarAberta(bt) {
      bt.disabled = true;
      bt.querySelector('span').textContent = 'procurando…';
      try {
        const v = await versaoAberta(app, artigo.doi);
        if (!v) { bt.querySelector('span').textContent = 'sem versão aberta'; app.aviso('O Unpaywall não conhece versão aberta deste artigo.', 'Leitura'); return; }
        const a = document.createElement('a');
        a.className = 'livro-bt livro-aberta';
        a.href = v.url;
        a.innerHTML = `${icone('mundo')}<span>versão aberta (${esc(v.onde)}${v.licenca ? ', ' + esc(v.licenca) : ''})</span>`;
        bt.replaceWith(a);
        a.focus();
      } catch (e) { bt.disabled = false; bt.querySelector('span').textContent = 'versão aberta'; app.aviso('Não deu para consultar o Unpaywall: ' + (e.message || e), 'Leitura', 'erro'); }
    }

    function fechar() {
      clearTimeout(salvar);
      ro.disconnect();
      document.removeEventListener('keydown', aoTeclar, true);
      el.remove();
      aberto = null;
      voltarFoco?.focus?.();
    }
    aberto = { fechar, el };

    el.addEventListener('click', async e => {
      const link = e.target.closest('a[href]');
      if (link) { e.preventDefault(); app.novaAba(link.href); return fechar(); }
      const b = e.target.closest('[data-l]');
      const l = b?.dataset.l;
      if (l === 'fechar') return fechar();
      if (l === 'ant') return irPara(pagina - 1);
      if (l === 'prox') return irPara(pagina + 1);
      if (l === 'menor' || l === 'maior') return mudarPrefs(q => { const i = TAMANHOS.indexOf(q.tamanho); q.tamanho = TAMANHOS[Math.max(0, Math.min(TAMANHOS.length - 1, (i < 0 ? 3 : i) + (l === 'maior' ? 1 : -1)))]; });
      if (l === 'fonte') return mudarPrefs(q => { const f = Object.keys(FONTES); q.fonte = f[(f.indexOf(q.fonte) + 1) % f.length]; });
      if (l === 'tema') return mudarPrefs(q => { q.tema = q.tema === 'claro' ? 'escuro' : 'claro'; });
      if (l === 'guardar') {
        const it = achar(artigo.url);
        if (it) { await tirar(it.id); item = null; app.aviso('Tirado da lista de leitura.', 'Leitura'); }
        else if (await garantir()) app.aviso('Guardado para ler depois. Fica neste computador e abre sem internet.', 'Leitura');
        return mostrarGuardado();
      }
      if (l === 'favorito') { const it = await garantir(); if (it) mudar(it.id, i => { i.favorito = !i.favorito; }); return mostrarGuardado(); }
      if (l === 'aberta') return procurarAberta(b);
      // clique na folha: metade da esquerda volta, metade da direita avança (se não estiver selecionando texto)
      if (e.target.closest('.livro-folhas') && !String(getSelection()).trim()) {
        const r = folhas.getBoundingClientRect();
        irPara(pagina + (e.clientX < r.left + r.width / 2 ? -1 : 1));
      }
    });
    // o leitor cobre a tela: as teclas valem onde quer que o foco esteja
    const aoTeclar = e => {
      const k = e.key;
      if (k === 'Escape') { e.preventDefault(); return fechar(); }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !e.target.closest('button'))) { e.preventDefault(); irPara(pagina + 1); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); irPara(pagina - 1); }
      else if (k === 'Home') { e.preventDefault(); irPara(0); }
      else if (k === 'End') { e.preventDefault(); irPara(total - 1); }
      else if (k === '+' || k === '=') el.querySelector('[data-l="maior"]').click();
      else if (k === '-') el.querySelector('[data-l="menor"]').click();
      else if (k === 't' || k === 'T') el.querySelector('[data-l="tema"]').click();
      else if (k === 'Tab') {
        // o foco fica dentro do leitor
        const f = [...el.querySelectorAll('button:not(:disabled), select, a[href]')].filter(x => x.offsetParent);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', aoTeclar, true);
    // links dentro da folha não recebem foco escondidos em outra página
    for (const a of texto.querySelectorAll('a')) a.tabIndex = -1;

    const ro = new ResizeObserver(() => paginar());
    mostrarPrefs();
    mostrarGuardado();
    // as imagens já vêm prontas (data:), mas precisam decodificar antes de contar as páginas
    Promise.all([document.fonts.ready, ...[...el.querySelectorAll('img')].map(i => i.decode().catch(() => {}))]).then(() => {
      paginar(item?.progresso || 0);
      ro.observe(folhas);
      el.querySelector('[data-l="prox"]:not(:disabled)')?.focus() || el.querySelector('[data-l="fechar"]').focus();
    });
  }

  async function abrir(id) {
    const it = itens().find(i => i.id === id);
    if (!it) return;
    const t = await textos('readonly', s => s.get(id)).catch(() => null);
    if (!t && !it.html) return app.aviso('O texto deste item não está mais neste computador.', 'Leitura', 'erro');
    abrirLivro({ ...it, html: t?.html ?? it.html, capa: t?.capa || '' }, it);
  }

  app.leitura = {
    itens, guardar, abrir, lerPaginaAtual, aberto: () => aberto, abrirArtigo: a => abrirLivro(a),
    tirar,
    alternarFavorito: id => mudar(id, i => { i.favorito = !i.favorito; }),
  };

  // botão do livro na barra de endereço
  const bt = document.createElement('button');
  bt.id = 'btn-leitor';
  bt.type = 'button';
  bt.className = 'ico';
  bt.innerHTML = icone('livro');
  (document.querySelector('#btn-favorito') || document.querySelector('#endereco'))?.after(bt);
  bt.onclick = () => lerPaginaAtual();
  const atualizar = () => {
    const url = app.url?.();
    bt.hidden = !url || /^oceano:\/\/(nova-aba|leitura)/.test(url);
    const ja = url && achar(url);
    bt.title = `Ler como livro${ja ? ' (já está na sua lista)' : ''} (${app.real ? '⌘⇧L' : '⌥⇧L'})`;
    bt.setAttribute('aria-label', bt.title);
    bt.classList.toggle('na-lista', !!ja);
  };
  app.on('barra', atualizar);
  app.on('leitura', atualizar);
}

// ---------- oceano://leitura ----------

const quando = ms => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

export const leitura = {
  titulo: () => 'Lista de leitura',
  icone: 'livro',
  html: () => {
    return `
    <div class="folha hist leit">
      <header class="cab"><h1>${icone('livro')}<span>Lista de leitura</span></h1>
        <p>Textos guardados pelo leitor (o livro na barra de endereço). Ficam só neste computador, separados por perfil, e abrem sem internet. Títulos e endereços aparecem atrás do cadeado.</p></header>
      <div class="hist-abas" role="tablist" data-leit-abas></div>
      <form class="busca px" data-leit-busca>${icone('livro')}<input name="q" autocomplete="off" placeholder="Procurar na lista" aria-label="Procurar na lista de leitura"></form>
      <div class="hist-lista" data-leit-lista></div>
    </div>`;
  },
  montar(el, r, app) {
    const L = app.leitura;
    const filtro = r.params.get('lista') === '*' ? '*' : '';   // '' = tudo, '*' = favoritos
    const lista = el.querySelector('[data-leit-lista]');
    let busca = '';
    const desenhar = () => {
      if (!L) { lista.innerHTML = '<p class="nota">Indisponível.</p>'; return; }
      const abas = [['', 'tudo'], ['*', 'favoritos']];
      el.querySelector('[data-leit-abas]').innerHTML = abas.map(([v, n]) =>
        `<button role="tab" class="chip" data-leit-aba="${esc(v)}" aria-selected="${v === filtro}">${esc(n)}</button>`).join('');
      const its = L.itens()
        .filter(i => !filtro || i.favorito)
        .filter(i => !busca || (i.titulo + ' ' + i.site + ' ' + i.url).toLowerCase().includes(busca));
      if (!its.length) {
        lista.innerHTML = `<p class="nota">${busca ? 'Nada encontrado.' : filtro ? 'Nada aqui ainda.' : 'Nada guardado ainda. Abra um texto, toque no livro da barra de endereço e use “guardar para ler”.'}</p>`;
        return;
      }
      lista.innerHTML = its.map(i => `
        <div class="hist-item leit-item px" data-id="${esc(i.id)}">
          <button class="jb leit-estrela" data-leit="favorito" aria-pressed="${!!i.favorito}" title="${i.favorito ? 'Tirar dos favoritos' : 'Favoritar'}" aria-label="${i.favorito ? 'Tirar dos favoritos' : 'Favoritar'}">${icone(i.favorito ? 'estrela' : 'estrela-vazia')}</button>
          <span class="hist-texto"><b>${sensivel(i.titulo || i.url, 'título')}</b><small>${sensivel(i.site || i.url, 'site')} · ${Math.max(1, Math.round(i.palavras / 200))} min · ${i.progresso >= 0.99 ? 'lido' : i.progresso > 0 ? Math.round(i.progresso * 100) + '% lido' : 'não lido'} · guardado em ${quando(i.hora)} ler</button>
          <button class="jb jb-x" data-leit="tirar" title="Apagar da lista" aria-label="Apagar da lista">${icone('fechar')}</button>
        </div>`).join('');
    };
    desenhar();
    el.querySelector('[data-leit-busca]').oninput = e => { busca = e.target.value.trim().toLowerCase(); desenhar(); };
    el.querySelector('[data-leit-busca]').onsubmit = e => e.preventDefault();
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.leitAba !== undefined) return app.navegar('oceano://leitura' + (b.dataset.leitAba ? '?lista=' + encodeURIComponent(b.dataset.leitAba) : ''));
      const id = b.closest('[data-id]')?.dataset.id;
      if (!id) return;
      if (b.dataset.leit === 'ler') return L.abrir(id);
      if (b.dataset.leit === 'favorito') return L.alternarFavorito(id);
      if (b.dataset.leit === 'tirar' && confirm('Apagar este texto da lista de leitura?')) return L.tirar(id);
    });
    const tirar = app.on('leitura', desenhar);
    return { desmontar: tirar };
  },
};
