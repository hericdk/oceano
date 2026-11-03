// O básico de um navegador: clique direito nos sites, procurar na página, zoom, lista em voltar e avançar,
// abas que voltam ao abrir de novo e aviso quando um site não abre ou trava.

import { htmlSurfista, montarSurfista } from './surfista.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ZOOMS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const nomeCurto = url => { try { const u = new URL(url); return u.protocol === 'oceano:' ? url.slice(9) : u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname); } catch { return url; } };

// sem internet ou endereço que não existe; os outros erros seguem com o aviso simples
const ERROS_DO_SURFISTA = new Set([-106, -105, -137, -109, -21]);

export function erroDoSite(codigo) {
  if (codigo === -106) return ['Sem internet', 'Confira a sua conexão e tente de novo.'];
  if (codigo === -105 || codigo === -137) return ['Não achei este endereço', 'Confira se ele foi escrito certo. O site também pode ter saído do ar.'];
  if (codigo === -102 || codigo === -109 || codigo === -118) return ['O site não respondeu', 'Ele pode estar fora do ar. Tente de novo daqui a pouco.'];
  if (codigo === -20) return ['Página bloqueada', 'O bloqueador do Oceano impediu esta página. Dá para liberar o site no escudo da barra.'];
  if (codigo <= -200 && codigo >= -299) return ['Conexão não confiável', 'O certificado de segurança deste site falhou, então o Oceano não abriu a página. Não coloque senhas aqui.'];
  return ['Esta página não abriu', 'Tente de novo. Se continuar, o problema pode ser do site.'];
}

export function iniciarNavegacao(app, guardado, { menuContexto, ehSite, renderizar, nativo }) {
  const $ = s => document.querySelector(s);
  const aba = () => app.abaAtiva;
  const siteAtivo = () => { const a = aba(); return a?.wv && ehSite(a.historico[a.pos]) ? a : null; };

  // ----- clique direito nos sites -----
  function menuDoSite(a, p) {
    const r = a.wv.getBoundingClientRect(), itens = [];
    const copiar = t => navigator.clipboard.writeText(t).catch(() => {});
    if (p.linkURL) itens.push(['link-aba', 'Abrir link em nova aba'], ['link-copiar', 'Copiar link'], ['link-baixar', 'Baixar link']);
    if (p.mediaType === 'image') itens.push(['img-aba', 'Abrir imagem em nova aba'], ['img-copiar', 'Copiar imagem'], ['img-baixar', 'Salvar imagem']);
    if (p.isEditable) itens.push(['cortar', 'Cortar'], ['copiar', 'Copiar'], ['colar', 'Colar'], ['tudo', 'Selecionar tudo']);
    else if (p.selectionText) itens.push(['copiar', 'Copiar'], ['pesquisar', `Pesquisar “${p.selectionText.trim().slice(0, 24)}”`]);
    if (!itens.length) itens.push(['voltar', 'Voltar'], ['avancar', 'Avançar'], ['recarregar', 'Recarregar'], ['procurar', 'Procurar na página'], ['imprimir', 'Imprimir ou salvar em PDF'], ['tudo', 'Selecionar tudo']);
    itens.push(['inspecionar', 'Inspecionar']);
    menuContexto(r.left + p.x, r.top + p.y, itens, v => {
      const f = {
        'link-aba': () => app.novaAba(p.linkURL, true, a.efemera ? { efemera: true } : { perfil: a.perfil }),
        'link-copiar': () => copiar(p.linkURL), 'link-baixar': () => a.wv.downloadURL(p.linkURL),
        'img-aba': () => app.novaAba(p.srcURL, true, a.efemera ? { efemera: true } : { perfil: a.perfil }),
        'img-copiar': () => a.wv.copyImageAt?.(p.x, p.y) ?? copiar(p.srcURL), 'img-baixar': () => a.wv.downloadURL(p.srcURL),
        cortar: () => a.wv.cut(), copiar: () => a.wv.copy(), colar: () => a.wv.paste(), tudo: () => a.wv.selectAll(),
        pesquisar: () => app.navegar(p.selectionText.trim().slice(0, 300)),
        voltar: () => a.wv.goBack(), avancar: () => a.wv.goForward(), recarregar: () => a.wv.reload(),
        procurar: () => abrirProcurar(), imprimir: () => imprimir(), inspecionar: () => a.wv.inspectElement(p.x, p.y),
      }[v];
      f?.();
    });
  }

  // ----- procurar na página -----
  const barra = document.createElement('form');
  barra.className = 'procurar px'; barra.hidden = true; barra.setAttribute('role', 'search');
  barra.innerHTML = `<input aria-label="Procurar na página" placeholder="Procurar na página" autocomplete="off" spellcheck="false">
    <span class="procurar-conta" role="status"></span>
    <button type="button" class="btn mini secundario" data-p="-1" aria-label="Resultado anterior">↑</button>
    <button type="button" class="btn mini secundario" data-p="1" aria-label="Próximo resultado">↓</button>
    <button type="button" class="btn mini secundario" data-p="0" aria-label="Fechar a busca">×</button>`;
  document.body.append(barra);
  const campo = barra.querySelector('input'), conta = barra.querySelector('.procurar-conta');
  let procurando = null;
  function procurar(para = 1, nova = true) {
    const t = campo.value, a = siteAtivo();
    if (!t) { conta.textContent = ''; a?.wv.stopFindInPage('clearSelection'); return; }
    if (a) { procurando = a; a.wv.findInPage(t, { forward: para > 0, findNext: nova }); return; }
    // páginas do próprio Oceano
    conta.textContent = window.find(t, false, para < 0, true) ? '' : 'nada encontrado';
    campo.focus();
  }
  function abrirProcurar() { barra.hidden = false; campo.focus(); campo.select(); if (campo.value) procurar(1, true); }
  function fecharProcurar() {
    barra.hidden = true; conta.textContent = '';
    try { procurando?.wv?.stopFindInPage('clearSelection'); } catch {}
    procurando = null;
  }
  barra.addEventListener('submit', e => { e.preventDefault(); procurar(1, false); });
  campo.addEventListener('input', () => procurar(1, true));
  campo.addEventListener('keydown', e => { if (e.key === 'Escape') fecharProcurar(); else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); procurar(-1, false); } });
  barra.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; const p = +b.dataset.p; if (p) procurar(p, false); else fecharProcurar(); });

  // ----- zoom -----
  function zoom(passo) {
    const a = siteAtivo();
    if (!a) return app.aviso('O zoom vale para sites. As páginas do Oceano acompanham o tamanho da janela.', 'Zoom');
    const atual = a.zoom || 1, i = ZOOMS.findIndex(z => z >= atual - 0.001);
    a.zoom = passo === 0 ? 1 : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 5 : i) + passo))];
    a.wv.setZoomFactor(a.zoom);
    app.aviso(`Zoom em ${Math.round(a.zoom * 100)}%`, 'Zoom');
  }

  // ----- imprimir -----
  function imprimir() {
    const a = siteAtivo();
    if (a) return a.wv.print().catch(() => app.aviso('Não consegui abrir a impressão.', 'Imprimir', 'erro'));
    window.print();
  }

  // ----- lista em voltar e avançar: páginas desta aba e, no voltar, as abas fechadas -----
  const lista = document.createElement('div');
  lista.className = 'nav-lista px'; lista.hidden = true;
  document.body.append(lista);
  let timer = 0, fecharTimer = 0;
  async function entradas() {
    const a = aba();
    if (a?.wcId && nativo?.navEntradas) {
      const n = await nativo.navEntradas(a.wcId).catch(() => null);
      if (n?.entradas?.length) return { ...n, ir: i => nativo.navIr(a.wcId, i) };
    }
    return { entradas: a.historico.map(url => ({ url, titulo: '' })), atual: a.pos, ir: i => { a.pos = i; renderizar(); } };
  }
  async function abrirLista(botao, lado) {
    const { entradas: l, atual, ir } = await entradas();
    const faixa = (lado < 0 ? l.slice(0, atual).map((e, i) => [e, i]).reverse() : l.slice(atual + 1).map((e, i) => [e, atual + 1 + i])).slice(0, 12);
    const fechadas = lado < 0 ? (app.fechadas || []).slice(-6).reverse() : [];
    if (!faixa.length && !fechadas.length) return;
    lista.innerHTML = (faixa.length ? `<h3>${lado < 0 ? 'Voltar para' : 'Avançar para'}</h3>` : '')
      + faixa.map(([e, i]) => `<button data-ir="${i}" title="${esc(e.url)}">${esc(e.titulo || nomeCurto(e.url))}</button>`).join('')
      + (fechadas.length ? '<h3>Fechadas há pouco</h3>' : '')
      + fechadas.map((f, i) => `<button data-fechada="${i}" title="${esc(f.historico[f.pos])}">${esc(f.titulo || nomeCurto(f.historico[f.pos]))}</button>`).join('');
    lista.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      lista.hidden = true;
      if (b.dataset.ir) ir(+b.dataset.ir);
      else app.reabrirAba(fechadas[+b.dataset.fechada]);
    };
    const r = botao.getBoundingClientRect();
    lista.hidden = false;
    lista.style.left = Math.max(8, Math.min(r.left, innerWidth - lista.offsetWidth - 8)) + 'px';
    lista.style.top = r.bottom + 4 + 'px';
  }
  const fecharLista = () => { clearTimeout(timer); fecharTimer = setTimeout(() => { lista.hidden = true; }, 250); };
  lista.addEventListener('pointerenter', () => clearTimeout(fecharTimer));
  lista.addEventListener('pointerleave', fecharLista);
  for (const [sel, lado] of [['#voltar', -1], ['#avancar', 1]]) {
    const b = $(sel);
    b.addEventListener('pointerenter', () => { clearTimeout(fecharTimer); clearTimeout(timer); timer = setTimeout(() => abrirLista(b, lado), 350); });
    b.addEventListener('pointerleave', fecharLista);
    b.addEventListener('pointerdown', () => { clearTimeout(timer); lista.hidden = true; });
    b.addEventListener('contextmenu', e => { e.preventDefault(); abrirLista(b, lado); });
  }

  // ----- abas que voltam ao abrir de novo (as efêmeras nunca) -----
  let salvarTimer = 0;
  const salvarSessao = () => {
    clearTimeout(salvarTimer);
    salvarTimer = setTimeout(() => {
      if (guardado.ler('restaurar-abas', true) === false || guardado.ler('historico-ligado', true) === false) return guardado.gravar('sessao-abas', null);
      const abas = app.abas.filter(a => !a.efemera);
      guardado.gravar('sessao-abas', { ativa: abas.indexOf(app.abaAtiva), abas: abas.map(a => ({ pos: Math.min(a.pos, 19), historico: a.historico.slice(Math.max(0, a.pos - 19), a.pos + 20), perfil: a.perfil, titulo: a.titulo })) });
    }, 400);
  };
  function restaurarSessao() {
    const s = guardado.ler('restaurar-abas', true) === false || guardado.ler('historico-ligado', true) === false ? null : guardado.ler('sessao-abas', null);
    const validas = (s?.abas || []).filter(a => Array.isArray(a.historico) && a.historico.length && typeof a.historico[0] === 'string');
    if (!validas.length || (validas.length === 1 && validas[0].historico[validas[0].pos] === 'oceano://nova-aba')) return false;
    let ativa = null;
    validas.forEach((x, i) => {
      const n = app.novaAba(x.historico[Math.min(x.pos, x.historico.length - 1)], true, { perfil: x.perfil, semFoco: true });
      n.historico = x.historico; n.pos = Math.min(x.pos, x.historico.length - 1); n.titulo = x.titulo;
      if (i === s.ativa) ativa = n;
    });
    app.abaAtiva = ativa || app.abas[0];
    renderizar();
    return true;
  }

  // ----- aviso quando o site não abre ou trava -----
  const aviso = document.createElement('section');
  aviso.className = 'site-erro'; aviso.hidden = true; aviso.setAttribute('role', 'alert');
  $('#sites')?.append(aviso);
  let jogo = null, erroDoJogo = null;
  const pararJogo = () => { jogo?.parar(); jogo = null; erroDoJogo = null; };
  function tentarDeNovo(a) { const url = a.erro.url; a.erro = null; desenharErro(); if (url) a.wv.loadURL(url).catch(() => {}); else a.wv.reload(); }
  function desenharErro() {
    const a = siteAtivo(), e = a?.erro;
    aviso.hidden = !e;
    aviso.classList.toggle('surfista-tela', !!e?.surfista);
    if (!e?.surfista) pararJogo();
    if (!e) return;
    if (e.surfista) {
      if (e === erroDoJogo) return;
      pararJogo();
      erroDoJogo = e;
      const verSite = e.codigo === 404 ? '<button class="surfista-botao" data-ver-site>Ver a página do site</button>' : '';
      aviso.innerHTML = htmlSurfista({ titulo: e.titulo, texto: `${esc(e.texto)}<br><small>${esc(nomeCurto(e.url))}</small>`, acoes: `<button class="surfista-botao principal" data-tentar>Tentar de novo</button>${verSite}` });
      aviso.querySelector('[data-tentar]').onclick = () => tentarDeNovo(a);
      const ver = aviso.querySelector('[data-ver-site]');
      if (ver) ver.onclick = () => { a.erro = null; desenharErro(); };
      jogo = montarSurfista(aviso, app.hostDosMods);
      return;
    }
    aviso.innerHTML = `<div class="px bloco"><h2>${esc(e.titulo)}</h2><p>${esc(e.texto)}</p><p class="nota">${esc(nomeCurto(e.url))}</p><button class="btn px" data-tentar>Tentar de novo</button></div>`;
    aviso.querySelector('[data-tentar]').onclick = () => tentarDeNovo(a);
  }
  function ligarWebview(a) {
    const wv = a.wv;
    wv.addEventListener('context-menu', e => { if (e.params.mediaType !== 'video') menuDoSite(a, e.params); });
    wv.addEventListener('found-in-page', e => { if (a === procurando) conta.textContent = e.result.matches ? `${e.result.activeMatchOrdinal} de ${e.result.matches}` : 'nada encontrado'; });
    wv.addEventListener('did-start-navigation', e => { if (e.isMainFrame && a.erro) { a.erro = null; desenharErro(); } });
    wv.addEventListener('did-fail-load', e => {
      if (!e.isMainFrame || e.errorCode === -3 || a.erro?.bloqueio18) return;
      const [titulo, texto] = erroDoSite(e.errorCode);
      a.erro = { titulo, texto, url: e.validatedURL, surfista: ERROS_DO_SURFISTA.has(e.errorCode), codigo: e.errorCode };
      desenharErro();
    });
    // o site respondeu 404: a página dele continua carregada atrás e dá para ver pelo botão
    wv.addEventListener('did-navigate', e => {
      if (e.httpResponseCode !== 404) return;
      a.erro = { titulo: 'Página não encontrada', texto: 'Este endereço não existe mais ou foi escrito errado (erro 404).', url: e.url, surfista: true, codigo: 404 };
      desenharErro();
    });
    wv.addEventListener('render-process-gone', e => {
      if (e.details?.reason === 'clean-exit' || e.reason === 'clean-exit') return;
      a.erro = { titulo: 'Esta aba travou', texto: 'As outras abas continuam bem. Dá para abrir esta de novo.', url: a.wvUrl };
      desenharErro();
    });
  }

  // a internet voltou: tenta sozinho a página que tinha caído
  addEventListener('online', () => { const a = siteAtivo(); if (a?.erro?.surfista && a.erro.codigo !== 404) tentarDeNovo(a); });

  // o processo principal barrou a página: o aviso entra depois do começo da navegação, que limpa o erro anterior
  nativo?.aoBloqueio18?.((url, wcId) => setTimeout(() => {
    const a = app.abas.find(x => { try { return x.wv?.getWebContentsId() === wcId; } catch { return false; } });
    if (!a) return;
    a.erro = { titulo: 'Site bloqueado', texto: 'Este endereço está no Bloqueador 18+, no fim da página Sobre.', url, surfista: false, codigo: -20, bloqueio18: true };
    desenharErro();
  }, 150));

  return { abrirProcurar, fecharProcurar, zoom, imprimir, salvarSessao, restaurarSessao, desenharErro, ligarWebview, abrirLista };
}
