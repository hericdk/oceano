// Ferramentas de dev do Oceano (só no app): perfil por aba, aba efêmera, pedidos de
// permissão, painel Dev, emulação de tela/user agent/rede e a paleta ⌘K.
// Nada aqui faz conexão própria: tudo roda dentro das abas ou no processo principal.

import { SCRIPT_TECNOLOGIAS, detectar, htmlTecnologias } from './tecnologias.js';
import { icone } from './icones.js';

const nativo = window.oceanoNativo;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kb = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : (n || 0) + ' B');
const ms = n => (n == null || isNaN(n) ? '–' : n >= 1000 ? (n / 1000).toFixed(2) + ' s' : Math.round(n) + ' ms');
let app;

const temSite = aba => !!aba?.wv && /^https?:/.test(aba.historico[aba.pos]);

// ---------- emulação por aba ----------

export const TELAS = {
  auto: { nome: 'Tamanho da janela' },
  iphone: { nome: 'iPhone 15', w: 393, h: 852, movel: true },
  android: { nome: 'Android (Pixel 8)', w: 412, h: 915, movel: true },
  ipad: { nome: 'iPad', w: 820, h: 1180, movel: true },
  notebook: { nome: 'Notebook 1366', w: 1366, h: 768 },
  fullhd: { nome: 'Desktop Full HD', w: 1920, h: 1080 },
};
export const UAS = {
  padrao: { nome: 'Padrão do Oceano' },
  'chrome-android': { nome: 'Chrome no Android', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36' },
  'safari-iphone': { nome: 'Safari no iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  firefox: { nome: 'Firefox no Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0' },
  googlebot: { nome: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
};
export const REDES = { normal: 'Sem limite', '4g': '4G (9 Mb/s)', '3g': '3G (1,6 Mb/s, 300 ms)', '2g': '2G (280 kb/s, 800 ms)', offline: 'Sem internet' };

const emu = aba => (aba.emu ??= { tela: 'auto', ua: 'padrao', rede: 'normal', semCache: false });

// Tela: a <webview> ganha o tamanho do aparelho; se não couber, o zoom encolhe a página
// mantendo a largura em CSS (o site "vê" 1920 px mesmo numa janela menor).
function aplicarTela(aba) {
  const wv = aba?.wv;
  if (!wv) return;
  const t = TELAS[emu(aba).tela];
  if (!t?.w) {
    wv.classList.remove('emulada');
    wv.style.removeProperty('width'); wv.style.removeProperty('height'); wv.style.removeProperty('margin-left');
    try { wv.setZoomFactor(1); } catch {}
  } else {
    const area = $('#sites').getBoundingClientRect();
    const z = Math.min(1, (area.width - 32) / t.w, (area.height - 48) / t.h);
    wv.classList.add('emulada');
    wv.style.width = Math.round(t.w * z) + 'px';
    wv.style.height = Math.round(t.h * z) + 'px';
    wv.style.marginLeft = -Math.round((t.w * z) / 2) + 'px';
    try { wv.setZoomFactor(z); } catch {}
  }
  marcarFundo();
}

function marcarFundo() {
  const a = app.abaAtiva;
  const t = a && temSite(a) && TELAS[emu(a).tela];
  $('#sites').classList.toggle('emulando', !!t?.w);
  $('#sites').dataset.tela = t?.w ? `${t.nome} · ${t.w}×${t.h}${a.wv.getZoomFactor?.() < 0.999 ? ` · ${Math.round(a.wv.getZoomFactor() * 100)}%` : ''}` : '';
}

async function definirEmulacao(aba, campo, valor) {
  if (!temSite(aba)) return app.aviso('Abra um site nesta aba primeiro.', 'Dev');
  const e = emu(aba);
  e[campo] = valor;
  if (campo === 'tela') {
    aplicarTela(aba);
    const movel = !!TELAS[valor]?.movel;
    await nativo.toque(aba.wcId, movel).catch(() => {});
    // aparelho móvel sem user agent escolhido: usa o do aparelho
    if (movel && e.ua === 'padrao') return definirEmulacao(aba, 'ua', valor === 'iphone' || valor === 'ipad' ? 'safari-iphone' : 'chrome-android');
    if (!movel && /android|iphone/.test(e.ua) ) return definirEmulacao(aba, 'ua', 'padrao');
  } else if (campo === 'ua') {
    aba.ua = UAS[valor]?.ua || '';
    aba.wv.setUserAgent(aba.ua || navigator.userAgent.replace(/ (Electron|oceano-app)\/\S+/g, ''));
    aba.wv.reload();
  } else if (campo === 'rede') {
    await nativo.redeLenta(aba.wcId, valor).catch(err => app.aviso(String(err.message || err), 'Dev', 'erro'));
  } else if (campo === 'semCache') {
    await nativo.semCache(aba.wcId, valor).catch(() => {});
  }
  painel?.desenhar();
}

// ---------- perfil por aba ----------

function botaoPerfil() {
  const a = app.abaAtiva;
  const b = $('#btn-perfil');
  if (!b || !a) return;
  const p = app.perfis.find(x => x.id === a.perfil);
  b.innerHTML = a.efemera ? `${icone('efemera')}<span>efêmera</span>` : `<i style="background:${esc(p?.cor || '#5bb6f0')}"></i><span>${esc(p?.nome || 'Pessoal')}</span>`;
  b.classList.toggle('efemera', !!a.efemera);
}

function menuPerfil() {
  const m = $('#menu-perfil');
  if (!m.hidden) return (m.hidden = true);
  const a = app.abaAtiva;
  const podeTrocar = !a.wv;   // aba ainda sem site: troca o perfil dela mesma
  m.innerHTML = `
    <p class="rotulo">${podeTrocar ? 'Usar nesta aba' : 'Nova aba no perfil'}</p>
    ${app.perfis.map(p => `<button role="menuitem" data-perfil="${esc(p.id)}"${p.id === a.perfil ? ' aria-current="true"' : ''}><i style="background:${esc(p.cor)}"></i>${esc(p.nome)}${p.proxy?.tipo && p.proxy.tipo !== 'nenhum' ? ' <span class="chip">proxy</span>' : ''}</button>`).join('')}
    <button role="menuitem" data-efemera>${icone('efemera')}Nova aba efêmera <kbd>⌘⇧N</kbd></button>
    <button role="menuitem" data-ir-priv>${icone('perfil')}Gerenciar perfis…</button>`;
  const r = $('#btn-perfil').getBoundingClientRect();
  m.style.left = r.left + 'px';
  m.style.top = r.bottom + 6 + 'px';
  m.hidden = false;
  m.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    m.hidden = true;
    if (b.dataset.perfil) {
      if (podeTrocar) { a.perfil = b.dataset.perfil; a.particao = app.particaoDe(a.perfil); delete a.efemera; app.renderizar(); }
      else app.novaAba(undefined, true, { perfil: b.dataset.perfil });
    } else if ('efemera' in b.dataset) app.novaAba(undefined, true, { efemera: true });
    else app.navegar('oceano://privacidade');
  };
}

// ---------- pedidos de permissão ----------

function mostrarPermissao(p) {
  const aba = app.abas.find(a => a.wcId === p.wcId);
  const div = document.createElement('div');
  div.className = 'permissao px';
  div.innerHTML = `${icone('cadeado')}<p><b>${esc(p.origem.replace(/^[a-z]+:\/\//, ''))}</b> quer <b>${esc(p.tipo)}</b>${aba && aba !== app.abaAtiva ? ` <span class="chip">outra aba</span>` : ''}</p>
    <button class="btn mini" data-sim>Permitir</button><button class="btn mini secundario" data-nao>Bloquear</button>`;
  div.onclick = e => {
    const sim = e.target.closest('[data-sim]'), nao = e.target.closest('[data-nao]');
    if (!sim && !nao) return;
    nativo.permissaoResponder(p.id, !!sim);
    div.remove();
  };
  $('#permissoes').appendChild(div);
}


// ---------- painel Dev (aba "Dev" da barra lateral) ----------

const SCRIPT_DESEMPENHO = `(async () => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const obs = tipo => new Promise(res => { const l = []; try { const o = new PerformanceObserver(x => l.push(...x.getEntries())); o.observe({ type: tipo, buffered: true }); setTimeout(() => { o.disconnect(); res(l); }, 80); } catch { res(l); } });
  const [lcp, cls, longas, pint] = await Promise.all([obs('largest-contentful-paint'), obs('layout-shift'), obs('longtask'), obs('paint')]);
  const rec = performance.getEntriesByType('resource');
  const porTipo = {};
  for (const r of rec) { const t = porTipo[r.initiatorType] ??= { n: 0, bytes: 0, cache: 0 }; t.n++; t.bytes += r.transferSize; if (r.transferSize === 0 && r.decodedBodySize > 0) t.cache++; }
  const curto = u => { try { const x = new URL(u); return x.host + x.pathname.slice(0, 48); } catch { return String(u).slice(0, 60); } };
  let prof = 0; const fundo = (n, d) => { if (d > prof) prof = d; for (const f of n.children) fundo(f, d + 1); }; fundo(document.documentElement, 1);
  return {
    ttfb: nav.responseStart - nav.requestStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd,
    fcp: pint.find(p => p.name === 'first-contentful-paint')?.startTime, lcp: lcp.at(-1)?.startTime,
    cls: cls.filter(s => !s.hadRecentInput).reduce((t, s) => t + s.value, 0), longas: longas.length, longasMs: longas.reduce((t, l) => t + l.duration, 0),
    heap: performance.memory?.usedJSHeapSize, nos: document.getElementsByTagName('*').length, profundidade: prof,
    pedidos: rec.length, porTipo,
    pesados: [...rec].sort((a, b) => b.transferSize - a.transferSize).slice(0, 6).map(r => ({ nome: curto(r.name), bytes: r.transferSize, tipo: r.initiatorType })),
    lentos: [...rec].sort((a, b) => b.duration - a.duration).slice(0, 6).map(r => ({ nome: curto(r.name), ms: r.duration, tipo: r.initiatorType })),
    mistos: location.protocol === 'https:' ? rec.filter(r => r.name.startsWith('http:')).map(r => curto(r.name)).slice(0, 10) : [],
    navTipo: nav.type, protocolo: nav.nextHopProtocol,
  };
})()`;

const SCRIPT_HTML = `(() => {
  const m = n => document.querySelector('meta[name="' + n + '"]')?.content ?? null;
  const ids = {}; for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1;
  const rotulado = i => i.labels?.length || i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.title;
  const campos = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')];
  return {
    titulo: document.title, lingua: document.documentElement.lang, descricao: m('description'), viewport: m('viewport'), robots: m('robots'),
    canonico: document.querySelector('link[rel=canonical]')?.href ?? null, og: !!document.querySelector('meta[property="og:title"]'),
    h1: document.querySelectorAll('h1').length,
    titulos: [...document.querySelectorAll('h1, h2, h3')].slice(0, 14).map(h => ({ n: +h.tagName[1], t: h.textContent.trim().replace(/\\s+/g, ' ').slice(0, 70) })),
    semAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length, imagens: document.images.length,
    camposSemRotulo: campos.filter(i => !rotulado(i)).length, campos: campos.length,
    linksVazios: [...document.links].filter(a => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]')).length,
    idsRepetidos: Object.entries(ids).filter(([, n]) => n > 1).map(([id]) => id).slice(0, 8),
    scripts: document.scripts.length, scriptsInline: [...document.scripts].filter(s => !s.src).length,
    estilos: document.styleSheets.length, iframes: document.querySelectorAll('iframe').length,
    botoesSemTexto: [...document.querySelectorAll('button')].filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
  };
})()`;

const SECOES = [['tecnologias', 'Tecnologias'], ['desempenho', 'Desempenho'], ['rede', 'Rede e cache'], ['console', 'Console e JS'], ['html', 'HTML'], ['seguranca', 'Segurança'], ['emulacao', 'Tela, user agent e rede']];
let painel = null;

export function montarPainelDev(_app, slot) {
  const g = app.guardado;
  const abertas = g.ler('dev-secoes', ['tecnologias', 'desempenho', 'console']);
  let dados = {}, filtro = 'todos', medindo = false;
  slot.innerHTML = `
    <div class="dev">
      <div class="dev-topo"><b data-host>–</b>
        <button class="btn mini" data-medir>Medir</button><button class="btn mini secundario" data-limpar-site title="Apaga cookies, cache e dados salvos só deste site e recarrega, para testar a página como se fosse a primeira visita">limpar este site</button><button class="btn mini secundario" data-f12>F12</button></div>
      ${SECOES.map(([id, nome]) => `<details data-secao="${id}"${abertas.includes(id) ? ' open' : ''}><summary>${nome}<span data-resumo="${id}"></span></summary><div data-corpo="${id}"></div></details>`).join('')}
    </div>`;
  const corpo = id => slot.querySelector(`[data-corpo="${id}"]`);
  const resumo = (id, t) => (slot.querySelector(`[data-resumo="${id}"]`).innerHTML = t);
  slot.addEventListener('toggle', () => g.gravar('dev-secoes', [...slot.querySelectorAll('details[open]')].map(d => d.dataset.secao)), true);
  slot.querySelector('[data-f12]').onclick = () => app.abaAtiva.wv?.openDevTools();
  slot.querySelector('[data-medir]').onclick = () => medir();
  slot.querySelector('[data-limpar-site]').onclick = async () => {
    const aba = app.abaAtiva;
    if (!temSite(aba)) return app.aviso('Abra um site nesta aba para limpar.', 'Dev');
    let host = '';
    try { host = new URL(aba.historico[aba.pos]).host; } catch {}
    if (!confirm(`Apagar cookies, cache e dados salvos de ${host}?\n\nVocê sai da sua conta neste site. Os outros sites não mudam.`)) return;
    const r = await nativo.devLimparSite(aba.wcId).catch(() => null);
    app.aviso(r?.ok ? `${host} está limpo, como numa primeira visita.` : 'Não consegui limpar este site.', 'Dev', r?.ok ? undefined : 'erro');
  };

  const linha = (rot, val, classe = '') => `<div class="dl ${classe}"><span>${rot}</span><b>${val}</b></div>`;
  const nota = (v, bom, ruim) => (v == null || isNaN(v) ? '' : v <= bom ? 'bom' : v <= ruim ? 'medio' : 'ruim');

  async function medir() {
    const aba = app.abaAtiva;
    if (!temSite(aba) || medindo) return desenhar();
    medindo = true;
    try {
      const [desempenho, html, seg, sinais] = await Promise.all([
        aba.wv.executeJavaScript(SCRIPT_DESEMPENHO).catch(e => ({ erro: e.message })),
        aba.wv.executeJavaScript(SCRIPT_HTML).catch(e => ({ erro: e.message })),
        nativo.cabecalhos(aba.wcId),
        aba.wv.executeJavaScript(SCRIPT_TECNOLOGIAS).catch(() => null),
      ]);
      dados = { aba, desempenho, html, seg, sinais, hora: Date.now() };
    } finally { medindo = false; }
    desenhar();
  }

  function desenhar() {
    const aba = app.abaAtiva;
    const site = temSite(aba);
    let host = '–';
    try { host = site ? new URL(aba.historico[aba.pos]).host : 'página interna'; } catch {}
    slot.querySelector('[data-host]').textContent = aba?.efemera ? `${host} · efêmera` : host;
    if (!site) {
      for (const [id] of SECOES) { corpo(id).innerHTML = '<p class="nota">Abra um site nesta aba. O painel mede a aba ativa.</p>'; resumo(id, ''); }
      return;
    }
    const atual = dados.aba === aba;
    const d = atual ? dados.desempenho || {} : {};
    const h = atual ? dados.html || {} : {};
    const s = atual ? dados.seg || {} : {};
    const vazio = '<p class="nota">Clique em Medir (ou recarregue a página).</p>';

    // tecnologias: o que o site usa, pelas pistas que a página já entregou
    const tecs = atual ? detectar(dados.sinais, dados.seg?.cabecalhos) : [];
    corpo('tecnologias').innerHTML = atual ? htmlTecnologias(tecs) : '<p class="nota">Analise um site para ver as tecnologias dele.</p>';
    corpo('tecnologias').onclick = e => { const a = e.target.closest('[data-tec-link]'); if (a) { e.preventDefault(); app.novaAba(a.dataset.tecLink); } };
    resumo('tecnologias', tecs.length || '');
    // desempenho
    corpo('desempenho').innerHTML = atual && !d.erro ? `
      ${linha('Primeiro byte (TTFB)', ms(d.ttfb), nota(d.ttfb, 200, 600))}
      ${linha('Primeira pintura (FCP)', ms(d.fcp), nota(d.fcp, 1800, 3000))}
      ${linha('Maior pintura (LCP)', ms(d.lcp), nota(d.lcp, 2500, 4000))}
      ${linha('Mudança de layout (CLS)', d.cls?.toFixed(3) ?? '–', nota(d.cls, 0.1, 0.25))}
      ${linha('DOM pronto', ms(d.dcl))}${linha('Carregou tudo', ms(d.load))}
      ${linha('Tarefas longas (> 50 ms)', `${d.longas} · ${ms(d.longasMs)}`, d.longas > 5 ? 'ruim' : '')}
      ${linha('Memória do JS', d.heap ? kb(d.heap) : '–')}
      ${linha('Elementos no DOM', `${d.nos} · ${d.profundidade} níveis`, nota(d.nos, 1500, 3000))}
      ${linha('Protocolo', esc(d.protocolo || '–'))}
      <p class="nota">Medido às ${new Date(dados.hora).toLocaleTimeString('pt-BR')}. Verde e vermelho seguem os limites do Google (Core Web Vitals).</p>` : d.erro ? `<p class="nota">${esc(d.erro)}</p>` : vazio;
    resumo('desempenho', atual && d.lcp ? ms(d.lcp) : '');

    // rede e cache
    const r = app.redeSites?.[aba.wcId] || {};
    const e = emu(aba);
    const tipos = Object.entries(d.porTipo || {}).sort((a, b) => b[1].bytes - a[1].bytes);
    const cacheTot = tipos.reduce((t, [, x]) => t + x.cache, 0);
    corpo('rede').innerHTML = `
      ${linha('Pedidos', r.pedidos ?? '–')}${linha('Vindos do cache', `${r.cache ?? 0}${r.pedidos ? ` · ${Math.round((r.cache / r.pedidos) * 100)}%` : ''}`)}
      ${linha('Bloqueados (anúncio/rastreador)', r.bloqueados ?? 0)}${linha('Falharam', r.erros ?? 0, r.erros ? 'ruim' : '')}
      ${linha('Baixado', kb(r.bytes))}${linha('Domínios de terceiros', r.totalTerceiros ?? 0)}
      ${tipos.length ? `<table class="mini-tabela"><tr><th>Tipo</th><th>n</th><th>baixado</th><th>cache</th></tr>${tipos.map(([t, x]) => `<tr><td>${esc(t)}</td><td>${x.n}</td><td>${kb(x.bytes)}</td><td>${x.cache}</td></tr>`).join('')}</table>
        <p class="rotulo">Mais pesados</p><ol class="dev-lista">${(d.pesados || []).map(x => `<li><span>${esc(x.nome)}</span><b>${kb(x.bytes)}</b></li>`).join('')}</ol>
        <p class="rotulo">Mais lentos</p><ol class="dev-lista">${(d.lentos || []).map(x => `<li><span>${esc(x.nome)}</span><b>${ms(x.ms)}</b></li>`).join('')}</ol>` : ''}
      <div class="dev-botoes">
        <button class="btn mini" data-sem-cache-1>Recarregar sem cache</button>
        <button class="btn mini secundario" data-limpar-cache>Limpar cache do perfil</button>
        <label class="vivo"><input type="checkbox" data-desligar-cache${e.semCache ? ' checked' : ''}> cache desligado nesta aba</label>
      </div>`;
    resumo('rede', r.pedidos ? `${r.pedidos} · ${cacheTot || r.cache || 0} cache` : '');
    corpo('rede').querySelector('[data-sem-cache-1]').onclick = () => app.recarregar(true);
    corpo('rede').querySelector('[data-limpar-cache]').onclick = async () => { await nativo.limparCache(aba.particao); app.aviso('Cache do perfil apagado.', 'Dev'); };
    corpo('rede').querySelector('[data-desligar-cache]').onchange = ev => definirEmulacao(aba, 'semCache', ev.target.checked);

    // console
    desenharConsole();

    // html
    const ok = (cond, txt) => `<li class="${cond ? 'bom' : 'ruim'}">${cond ? '✓' : '✗'} ${txt}</li>`;
    corpo('html').innerHTML = atual && !h.erro ? `
      <ul class="dev-checagem">
        ${ok(h.titulo, `Título: ${esc(h.titulo || 'sem título')}`)}
        ${ok(h.lingua, `Idioma: ${esc(h.lingua || 'sem lang')}`)}
        ${ok(h.descricao, h.descricao ? `Descrição: ${esc(h.descricao.slice(0, 90))}` : 'Sem meta description')}
        ${ok(h.viewport, h.viewport ? 'Viewport para celular' : 'Sem meta viewport')}
        ${ok(h.h1 === 1, `${h.h1} h1 na página${h.h1 === 1 ? '' : ' (o ideal é 1)'}`)}
        ${ok(!h.semAlt, `${h.semAlt} de ${h.imagens} imagens sem alt`)}
        ${ok(!h.camposSemRotulo, `${h.camposSemRotulo} de ${h.campos} campos sem rótulo`)}
        ${ok(!h.linksVazios, `${h.linksVazios} links sem texto`)}
        ${ok(!h.botoesSemTexto, `${h.botoesSemTexto} botões sem texto`)}
        ${ok(!h.idsRepetidos?.length, h.idsRepetidos?.length ? `IDs repetidos: ${h.idsRepetidos.map(esc).join(', ')}` : 'Nenhum ID repetido')}
        ${ok(!/noindex/i.test(h.robots || ''), h.robots ? `robots: ${esc(h.robots)}` : 'Sem meta robots (indexável)')}
        ${ok(h.canonico, h.canonico ? 'Link canônico' : 'Sem link canônico')}
        ${ok(h.og, h.og ? 'Open Graph (prévia ao compartilhar)' : 'Sem Open Graph')}
      </ul>
      ${linha('Scripts', `${h.scripts} · ${h.scriptsInline} inline`)}${linha('Folhas de estilo', h.estilos)}${linha('Iframes', h.iframes)}
      ${h.titulos?.length ? `<p class="rotulo">Estrutura de títulos</p><ol class="dev-titulos">${h.titulos.map(t => `<li style="--n:${t.n}"><i>h${t.n}</i>${esc(t.t)}</li>`).join('')}</ol>` : ''}` : vazio;
    const falhasHtml = atual && !h.erro ? corpo('html').querySelectorAll('.ruim').length : 0;
    resumo('html', atual && !h.erro ? (falhasHtml ? `${falhasHtml} ✗` : '✓') : '');

    // segurança
    const c = s.cabecalhos || {};
    const https = aba.historico[aba.pos].startsWith('https:');
    const csp = c['content-security-policy'] || '';
    const checks = [
      [https, 'HTTPS'],
      [!!c['strict-transport-security'], 'HSTS (só HTTPS, sempre)'],
      [!!csp, 'Content-Security-Policy'],
      [!!c['x-frame-options'] || /frame-ancestors/.test(csp), 'Proteção contra iframe (clickjacking)'],
      [/nosniff/i.test(c['x-content-type-options'] || ''), 'X-Content-Type-Options: nosniff'],
      [!!c['referrer-policy'], 'Referrer-Policy'],
      [!!c['permissions-policy'], 'Permissions-Policy'],
      [!!c['cross-origin-opener-policy'], 'Cross-Origin-Opener-Policy'],
    ];
    const cert = s.certificado;
    const dias = cert ? Math.floor((cert.ate - Date.now()) / 864e5) : null;
    corpo('seguranca').innerHTML = atual ? `
      <ul class="dev-checagem">${checks.map(([v, t]) => ok(v, t)).join('')}</ul>
      ${d.mistos?.length ? `<p class="rotulo ruim">Conteúdo misto (HTTP numa página HTTPS)</p><ol class="dev-lista">${d.mistos.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>` : ''}
      ${s.cookies?.length ? `<p class="rotulo">Cookies desta resposta</p><ul class="dev-checagem">${s.cookies.map(k => ok(k.secure && k.httpOnly && k.sameSite, `${esc(k.nome)} · ${[k.secure ? 'Secure' : 'sem Secure', k.httpOnly ? 'HttpOnly' : 'sem HttpOnly', k.sameSite ? 'SameSite=' + esc(k.sameSite) : 'sem SameSite'].join(' · ')}`)).join('')}</ul>` : ''}
      ${cert ? `<p class="rotulo">Certificado</p>
        ${linha('Para', esc(cert.assunto))}${linha('Emitido por', esc(cert.emissor))}
        ${linha('Vence em', `${new Date(cert.ate).toLocaleDateString('pt-BR')} · ${dias} dias`, dias < 15 ? 'ruim' : dias < 30 ? 'medio' : 'bom')}
        ${linha('Válido', cert.valido ? 'sim' : esc(cert.erro || 'não'), cert.valido ? 'bom' : 'ruim')}
        ${cert.cadeia?.length ? `<p class="nota">Cadeia: ${cert.cadeia.map(esc).join(' → ')}</p>` : ''}` : https ? '<p class="nota">Certificado: recarregue a página para ver (o Chromium reaproveita conexões já verificadas).</p>' : ''}
      ${linha('Status HTTP', s.status || '–')}
      ${Object.keys(c).length ? `<details class="dev-crus"><summary>Cabeçalhos</summary>${Object.entries(c).map(([k, v]) => `<p><code>${esc(k)}</code> ${esc(v.slice(0, 300))}</p>`).join('')}</details>` : ''}` : vazio;
    resumo('seguranca', atual ? `${checks.filter(x => x[0]).length}/${checks.length}` : '');

    // emulação
    const sel = (campo, opcoes) => `<select data-emu="${campo}">${Object.entries(opcoes).map(([k, v]) => `<option value="${k}"${e[campo] === k ? ' selected' : ''}>${esc(typeof v === 'string' ? v : v.nome)}${v.w ? ` · ${v.w}×${v.h}` : ''}</option>`).join('')}</select>`;
    corpo('emulacao').innerHTML = `
      <label class="dev-campo"><span>Tela</span>${sel('tela', TELAS)}</label>
      <label class="dev-campo"><span>User agent</span>${sel('ua', UAS)}</label>
      <label class="dev-campo"><span>Rede</span>${sel('rede', REDES)}</label>
      <p class="nota">Vale só para esta aba. Tela de celular liga o toque e o user agent do aparelho.</p>`;
    resumo('emulacao', [e.tela !== 'auto' && TELAS[e.tela].nome, e.rede !== 'normal' && e.rede.toUpperCase(), e.ua !== 'padrao' && 'UA'].filter(Boolean).join(' · '));
    for (const s2 of corpo('emulacao').querySelectorAll('[data-emu]')) s2.onchange = () => definirEmulacao(aba, s2.dataset.emu, s2.value);
  }

  function desenharConsole() {
    const aba = app.abaAtiva;
    if (!temSite(aba)) return;
    const lista = aba.console || [];
    const erros = lista.filter(x => x.nivel === 'error').length, avisos = lista.filter(x => x.nivel === 'warning').length;
    const vis = lista.filter(x => filtro === 'todos' || x.nivel === filtro).slice(-60);
    const el = corpo('console');
    const repl = el.querySelector('[data-repl]')?.value || '';
    el.innerHTML = `
      <div class="seg filtro">${[['todos', `Tudo ${lista.length}`], ['error', `Erros ${erros}`], ['warning', `Avisos ${avisos}`]].map(([k, t]) => `<button data-filtro="${k}" aria-selected="${filtro === k}">${t}</button>`).join('')}
        <button class="btn mini secundario" data-limpar-console>Limpar</button></div>
      <ol class="dev-console">${vis.map(x => `<li class="c-${x.nivel}"><span>${esc(x.texto)}</span>${x.fonte ? `<small>${esc(String(x.fonte).split('/').pop().slice(0, 40))}${x.linha ? ':' + x.linha : ''}</small>` : ''}</li>`).join('') || '<li class="nota">Nada no console.</li>'}</ol>
      <form data-form-repl class="dev-repl"><input data-repl spellcheck="false" placeholder="Rodar JS na página (ex.: document.title)" aria-label="Rodar JavaScript na página"><button class="btn mini">▶</button></form>
      <pre class="dev-saida" data-saida hidden></pre>`;
    el.querySelector('[data-repl]').value = repl;
    resumo('console', erros ? `<span class="ruim">${erros} erro${erros > 1 ? 's' : ''}</span>` : avisos ? `${avisos} aviso${avisos > 1 ? 's' : ''}` : '');
    for (const b of el.querySelectorAll('[data-filtro]')) b.onclick = () => { filtro = b.dataset.filtro; desenharConsole(); };
    el.querySelector('[data-limpar-console]').onclick = () => { aba.console = []; desenharConsole(); };
    el.querySelector('.dev-console').scrollTop = 1e9;
    el.querySelector('[data-form-repl]').onsubmit = async ev => {
      ev.preventDefault();
      const codigo = el.querySelector('[data-repl]').value;
      const saida = el.querySelector('[data-saida]');
      saida.hidden = false;
      try {
        const r = await aba.wv.executeJavaScript(`(async () => { const r = await (0, eval)(${JSON.stringify(codigo)}); try { return JSON.stringify(r, null, 2) ?? String(r); } catch { return String(r); } })()`, true);
        saida.className = 'dev-saida';
        saida.textContent = r;
      } catch (err) { saida.className = 'dev-saida ruim'; saida.textContent = String(err.message || err); }
    };
  }

  let consoleTimer = 0;
  const visivel = () => !slot.hidden && !$('#lateral').hidden;
  const desligar = [
    // trocar de aba mede a nova (se o painel estiver à vista); o resto só redesenha
    app.on('barra', () => (visivel() && dados.aba !== app.abaAtiva && temSite(app.abaAtiva) ? medir() : desenhar())),
    app.on('site_carregou', aba => { if (aba === app.abaAtiva && visivel()) setTimeout(medir, 400); }),
    app.on('console', aba => { if (aba === app.abaAtiva && !consoleTimer) consoleTimer = setTimeout(() => { consoleTimer = 0; if (visivel()) desenharConsole(); }, 300); }),
  ];
  painel = { desenhar, medir, desmontar: () => desligar.forEach(f => f()) };
  desenhar();
  medir();
  return painel;
}

function abrirPainelDev() {
  const lateral = $('#lateral');
  const aberto = !lateral.hidden && lateral.querySelector('[data-lateral="dev"]').getAttribute('aria-selected') === 'true';
  if (aberto) return app.mostrarLateral(false);
  app.mostrarLateral(true);
  app.abaLateral('dev');
  painel?.medir();
}

// ---------- paleta de comandos (⌘K) ----------

function comandos() {
  const a = app.abaAtiva, k = id => app.atalhos.mostrar(id);
  const lista = [
    { nome: 'Reabrir aba fechada', atalho: k('reabrir-aba'), fazer: () => app.reabrirAba() },
    { nome: 'Copiar link sem rastreadores', atalho: k('copiar-link-limpo'), dica: 'tira utm_*, fbclid, gclid…', fazer: () => app.executarAtalho('copiar-link-limpo') },
    { nome: 'Atalhos', atalho: k('atalhos'), dica: 'ver e mudar', fazer: () => app.navegar('oceano://atalhos') },
    { nome: 'Barra lateral', atalho: k('barra-lateral'), fazer: () => app.executarAtalho('barra-lateral') },
    { nome: 'Nova aba', atalho: k('nova-aba'), fazer: () => app.novaAba() },
    { nome: 'Nova aba efêmera', atalho: k('nova-efemera'), dica: 'sem cookies, cache ou histórico; some ao fechar', fazer: () => app.novaAba(undefined, true, { efemera: true }) },
    { nome: 'Painel Dev', atalho: k('painel-dev'), fazer: abrirPainelDev },
    { nome: 'Abrir DevTools', atalho: k('devtools'), fazer: () => a.wv?.openDevTools() },
    { nome: 'Recarregar sem cache', atalho: k('recarregar-sem-cache'), fazer: () => app.recarregar(true) },
    { nome: 'Limpar cache do perfil', fazer: async () => { await nativo.limparCache(a.particao); app.aviso('Cache do perfil apagado.', 'Dev'); } },
    { nome: 'Copiar endereço', fazer: () => navigator.clipboard.writeText(app.url()) },
    ...app.perfis.map(p => ({ nome: `Nova aba no perfil ${p.nome}`, fazer: () => app.novaAba(undefined, true, { perfil: p.id }) })),
    ...Object.entries(TELAS).map(([k, t]) => ({ nome: `Tela: ${t.nome}`, dica: t.w ? `${t.w}×${t.h}` : '', fazer: () => definirEmulacao(a, 'tela', k) })),
    ...Object.entries(UAS).map(([k, u]) => ({ nome: `User agent: ${u.nome}`, fazer: () => definirEmulacao(a, 'ua', k) })),
    ...Object.entries(REDES).map(([k, n]) => ({ nome: `Rede: ${n}`, fazer: () => definirEmulacao(a, 'rede', k) })),
    { nome: 'Privacidade e segurança', atalho: k('privacidade'), dica: 'DNS cifrado, perfis, proxy, permissões', fazer: () => app.navegar('oceano://privacidade') },
    { nome: 'Rede do navegador', fazer: () => app.navegar('oceano://rede') },
    { nome: 'Modo jogo', atalho: k('modo-jogo'), fazer: () => app.definirModoJogo(!app.modoJogo) },
    { nome: 'Temas', fazer: () => app.navegar('oceano://temas') },
    { nome: 'Mods em Lua', fazer: () => app.navegar('oceano://mods') },
    { nome: 'Sobre a Navegadora', fazer: () => app.navegar('oceano://sobre') },
  ];
  return lista;
}

function abrirComandos() {
  const el = $('#comandos');
  if (!el.hidden) return (el.hidden = true);
  const todos = comandos();
  let sel = 0, vis = todos;
  el.innerHTML = `<div class="comandos-caixa px"><input placeholder="O que você quer fazer?" spellcheck="false" aria-label="Comando"><ol role="listbox"></ol></div>`;
  const input = el.querySelector('input'), ol = el.querySelector('ol');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const desenhar = () => {
    const q = norm(input.value).split(/\s+/).filter(Boolean);
    vis = todos.filter(c => q.every(p => norm(c.nome + ' ' + (c.dica || '')).includes(p)));
    sel = Math.min(sel, Math.max(0, vis.length - 1));
    ol.innerHTML = vis.map((c, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}"><span>${esc(c.nome)}${c.dica ? `<small>${esc(c.dica)}</small>` : ''}</span>${c.atalho ? `<kbd>${c.atalho}</kbd>` : ''}</li>`).join('') || '<li class="nota">Nada encontrado.</li>';
    ol.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };
  const executar = i => { const c = vis[i]; el.hidden = true; c?.fazer(); };
  input.oninput = () => { sel = 0; desenhar(); };
  input.onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(vis.length - 1, sel + 1); desenhar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); desenhar(); }
    else if (e.key === 'Enter') { e.preventDefault(); executar(sel); }
    else if (e.key === 'Escape') el.hidden = true;
  };
  ol.onclick = e => { const li = e.target.closest('[data-i]'); if (li) executar(+li.dataset.i); };
  el.onclick = e => { if (e.target === el) el.hidden = true; };
  el.hidden = false;
  desenhar();
  input.focus();
}

// ---------- início ----------

export function iniciarDev(a) {
  app = a;
  $('#btn-dev').innerHTML = icone('dev');
  $('#btn-dev').onclick = abrirPainelDev;
  $('#btn-perfil').onclick = menuPerfil;
  document.addEventListener('click', e => { if (!e.target.closest('#menu-perfil, #btn-perfil')) $('#menu-perfil').hidden = true; });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#comandos').hidden) $('#comandos').hidden = true;
  });
  window.addEventListener('resize', () => { for (const x of app.abas) if (x.emu?.tela && x.emu.tela !== 'auto') aplicarTela(x); });
  nativo.aoPermissao(mostrarPermissao);
  app.on('atalho_dev', nome => (nome === 'comandos' ? abrirComandos() : abrirPainelDev()));
  app.on('barra', () => { botaoPerfil(); marcarFundo(); });
  botaoPerfil();
}
