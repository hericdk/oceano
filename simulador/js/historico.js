// Histórico e favoritos: só neste computador, separados por perfil. Abas efêmeras não entram no histórico.
// Na tela, endereços e títulos aparecem atrás do cadeado (sensivel.js): dá para gravar a tela sem expor nada.
// Quem preferir liga "lista sempre visível": começa desligado, justamente por causa de gravações de tela.
// oceano://historico mostra as duas listas, com busca, apagar por período e a opção de não guardar histórico.

import { icone } from './icones.js';
import { sensivel } from './sensivel.js';
import { CATEGORIAS, TIPOS, TEMAS, filtrar, sugestoes } from './historico-filtros.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAX = 5000;
const ehSite = u => /^https?:\/\//i.test(u);
const diaDe = ms => new Date(ms).toLocaleDateString('sv');

export function iniciarHistorico(app, guardado) {
  const chaveH = () => 'historico:' + app.perfilAtual();
  const chaveF = () => 'favoritos:' + app.perfilAtual();
  const ler = () => guardado.ler(chaveH(), []);
  const favoritos = () => guardado.ler(chaveF(), []);
  const ligado = () => guardado.ler('historico-ligado', true);

  // cada navegação para um site entra no histórico (a mais recente primeiro); repetir em seguida não duplica
  function anotar(url, aba = app.abaAtiva) {
    if (!ligado() || !ehSite(url) || aba?.efemera) return;
    const lista = ler();
    const titulo = app.tituloDe(url, aba);
    if (lista[0]?.url === url) { lista[0].hora = Date.now(); lista[0].titulo = titulo; }
    else lista.unshift({ url, titulo, hora: Date.now() });
    if (lista.length > MAX) lista.length = MAX;
    guardado.gravar(chaveH(), lista);
  }
  app.on('navegar', url => anotar(url));
  // o título de um site real só chega depois de carregar: atualiza a entrada mais recente
  app.on('barra', aba => {
    const url = aba?.historico?.[aba.pos], lista = ligado() && ehSite(url) && !aba.efemera ? ler() : null;
    if (!lista?.length || lista[0].url !== url) return;
    const t = app.tituloDe(url, aba);
    if (t && t !== lista[0].titulo) { lista[0].titulo = t; guardado.gravar(chaveH(), lista); }
  });

  const ehFavorito = url => favoritos().some(f => f.url === url);
  function alternarFavorito(url = app.url(), aba = app.abaAtiva) {
    if (!url || url.startsWith('oceano://nova-aba')) return;
    let f = favoritos();
    const ja = f.some(x => x.url === url);
    f = ja ? f.filter(x => x.url !== url) : [{ url, titulo: app.tituloDe(url, aba), hora: Date.now() }, ...f];
    guardado.gravar(chaveF(), f);
    app.aviso(ja ? 'Tirado dos favoritos.' : 'Guardado nos favoritos.', 'Favoritos');
    app.emitir('favoritos');
    atualizarEstrela();
  }

  // estrela na barra de endereço
  const estrela = document.createElement('button');
  estrela.id = 'btn-favorito';
  estrela.type = 'button';
  estrela.className = 'ico';
  document.querySelector('#endereco')?.after(estrela);
  estrela.onclick = () => alternarFavorito();
  function atualizarEstrela() {
    const url = app.url?.(), pode = url && !url.startsWith('oceano://nova-aba');
    estrela.hidden = !pode;
    const sim = pode && ehFavorito(url);
    estrela.innerHTML = icone(sim ? 'estrela' : 'estrela-vazia');
    estrela.setAttribute('aria-pressed', !!sim);
    estrela.title = sim ? 'Tirar dos favoritos (⌘D)' : 'Guardar nos favoritos (⌘D)';
    estrela.setAttribute('aria-label', estrela.title);
  }
  app.on('barra', atualizarEstrela);
  app.on('favoritos', atualizarEstrela);

  function apagar(periodo) {
    if (periodo === 'tudo') return guardado.gravar(chaveH(), []);
    const limite = Date.now() - (periodo === 'hora' ? 3600e3 : 86400e3);
    guardado.gravar(chaveH(), ler().filter(h => h.hora < limite));
  }

  app.historico = { ler, favoritos, anotar, apagar, alternarFavorito, ehFavorito, ligado, definirLigado: v => guardado.gravar('historico-ligado', !!v), sempreVisivel: () => guardado.ler('historico-sempre-visivel', false), definirSempreVisivel: v => guardado.gravar('historico-sempre-visivel', !!v), tirarFavorito: url => { guardado.gravar(chaveF(), favoritos().filter(f => f.url !== url)); app.emitir('favoritos'); } };
}

// ---------- oceano://historico ----------

const ROTULO_DIA = ms => {
  const d = diaDe(ms), hoje = diaDe(Date.now()), ontem = diaDe(Date.now() - 86400e3);
  return d === hoje ? 'Hoje' : d === ontem ? 'Ontem' : new Date(ms).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const hhmm = ms => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const historico = {
  titulo: r => r.params.get('aba') === 'favoritos' ? 'Favoritos' : 'Histórico',
  icone: 'relogio',
  html: (r, app) => {
    const aba = r.params.get('aba') === 'favoritos' ? 'favoritos' : 'historico';
    return `
    <div class="folha hist">
      <header class="cab"><h1>${icone('relogio')}<span>Histórico e favoritos</span></h1>
        <p>Fica só neste computador, separado por perfil. Abas efêmeras não entram. Endereços e títulos aparecem atrás do cadeado: clique num deles para mostrar todos.</p></header>
      <div class="hist-abas" role="tablist">
        <button role="tab" class="chip" data-hist-aba="historico" aria-selected="${aba === 'historico'}">histórico</button>
        <button role="tab" class="chip" data-hist-aba="favoritos" aria-selected="${aba === 'favoritos'}">favoritos</button>
      </div>
      <form class="busca px" data-hist-busca>${icone('escudo')}<input name="q" autocomplete="off" placeholder="Procurar por nome, endereço, título, tema ou data" aria-label="Procurar"></form>
      <div class="hist-tags" data-hist-tags aria-label="Sugestões de filtro"></div>
      <details class="hist-avancado px">
        <summary>filtro avançado</summary>
        <form class="hist-campos" data-hist-avancado>
          <label>Categoria<select name="categoria"><option value="">todas</option>${CATEGORIAS.map(([id, nome]) => `<option value="${id}">${esc(nome)}</option>`).join('')}</select></label>
          <label>Tema<select name="tema"><option value="">todos</option>${TEMAS.map(([id, nome]) => `<option value="${id}">${esc(nome)}</option>`).join('')}</select></label>
          <label>Tipo de site<select name="tipo"><option value="">todos</option>${TIPOS.map(([id, nome]) => `<option value="${id}">${esc(nome)}</option>`).join('')}</select></label>
          <label>Site<input name="site" autocomplete="off" placeholder="ex.: youtube"></label>
          <label>Período<select name="periodo"><option value="">qualquer data</option><option value="hoje">últimas 24 h</option><option value="semana">últimos 7 dias</option><option value="mes">últimos 30 dias</option></select></label>
          <button type="button" class="btn mini secundario" data-limpar-filtros>limpar filtros</button>
        </form>
        <p class="nota">No campo de busca também valem <code>site:github</code>, <code>tema:música</code> e <code>tipo:loja</code>. Temas e tipos são estimados neste computador, pelo endereço e pelo título.</p>
      </details>
      ${aba === 'historico' ? `<div class="hist-acoes">
        <span>apagar:</span>
        <button class="btn mini secundario" data-apagar="hora">última hora</button>
        <button class="btn mini secundario" data-apagar="dia">últimas 24 h</button>
        <button class="btn mini secundario" data-apagar="tudo">tudo</button>
        <label class="cfg-chave"><input type="checkbox" data-hist-ligado ${app.historico?.ligado() ? 'checked' : ''}> guardar histórico</label>
        <label class="cfg-chave hist-visivel"><input type="checkbox" data-hist-visivel ${app.historico?.sempreVisivel() ? 'checked' : ''}> lista sempre visível</label>
      </div>` : ''}
      <p class="nota hist-conta" data-hist-conta role="status"></p>
      <div class="hist-lista" data-hist-lista></div>
    </div>`;
  },
  montar(el, r, app) {
    const aba = r.params.get('aba') === 'favoritos' ? 'favoritos' : 'historico';
    const lista = el.querySelector('[data-hist-lista]');
    const filtros = { q: '', host: '', categoria: '', tema: '', tipo: '', site: '', periodo: '' };
    const aberta = () => app.historico?.sempreVisivel() || app.sensivel?.visivel();
    const dado = (texto, rotulo) => (app.historico?.sempreVisivel() ? `<span class="hist-aberto">${esc(texto)}</span>` : sensivel(texto, rotulo));
    const temFiltro = () => Object.values(filtros).some(Boolean);
    // as sugestões dizem por onde a pessoa andou: ficam atrás do mesmo cadeado da lista
    const desenharTags = itens => {
      const caixa = el.querySelector('[data-hist-tags]');
      if (!aberta()) { caixa.innerHTML = itens.length ? `<span class="nota">Sugestões de filtro:</span> ${sensivel('sites e temas mais comuns', 'sugestões de filtro')}` : ''; return; }
      caixa.innerHTML = sugestoes(itens).map(s => `<button type="button" class="chip" data-tag-campo="${s.campo}" data-tag-id="${esc(s.id)}" aria-pressed="${filtros[s.campo] === s.id}">${esc(s.nome)} <small>${s.n}</small></button>`).join('');
    };
    const desenhar = () => {
      const h = app.historico;
      if (!h) { lista.innerHTML = '<p class="nota">Indisponível.</p>'; return; }
      const todos = aba === 'favoritos' ? h.favoritos() : h.ler();
      const itens = filtrar(todos, filtros);
      desenharTags(todos);
      el.querySelector('[data-hist-conta]').textContent = temFiltro() ? `${itens.length} de ${todos.length}` : '';
      if (!itens.length) {
        lista.innerHTML = `<p class="nota">${temFiltro() ? 'Nada encontrado com esses filtros.' : aba === 'favoritos' ? 'Nenhum favorito ainda. Use a estrela na barra de endereço (⌘D).' : h.ligado() ? 'Nenhum site visitado ainda neste perfil.' : 'O histórico está desligado.'}</p>`;
        return;
      }
      let dia = null, html = '';
      for (const x of itens.slice(0, 400)) {
        if (aba === 'historico' && diaDe(x.hora) !== dia) { dia = diaDe(x.hora); html += `<h2 class="hist-dia">${esc(ROTULO_DIA(x.hora))}</h2>`; }
        html += `<div class="hist-item px" data-url="${esc(x.url)}" data-hora="${x.hora}">
          <span class="hist-hora">${aba === 'historico' ? hhmm(x.hora) : icone('estrela')}</span>
          <span class="hist-texto"><b>${dado(x.titulo || x.url, 'título')}</b><small>${dado(x.url, 'endereço')}</small></span>
          <button class="jb jb-x" data-tirar title="${aba === 'favoritos' ? 'Tirar dos favoritos' : 'Apagar do histórico'}">${icone('fechar')}</button>
        </div>`;
      }
      lista.innerHTML = html;
    };
    desenhar();
    el.querySelector('[data-hist-busca]').oninput = e => { filtros.q = e.target.value; desenhar(); };
    const avancado = el.querySelector('[data-hist-avancado]');
    avancado.addEventListener('input', e => { if (e.target.name) { filtros[e.target.name] = e.target.value; desenhar(); } });
    avancado.addEventListener('submit', e => e.preventDefault());
    el.querySelector('[data-limpar-filtros]').onclick = () => {
      for (const k of Object.keys(filtros)) filtros[k] = '';
      avancado.reset(); el.querySelector('[data-hist-busca] input').value = '';
      desenhar();
    };
    el.querySelector('[data-hist-busca]').onsubmit = e => e.preventDefault();
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b?.dataset.tagCampo) {
        const { tagCampo: campo, tagId: id } = b.dataset;
        filtros[campo] = filtros[campo] === id ? '' : id;
        const seletor = avancado.elements[campo];
        if (seletor) seletor.value = filtros[campo];
        return desenhar();
      }
      if (b?.dataset.histAba) return app.navegar('oceano://historico' + (b.dataset.histAba === 'favoritos' ? '?aba=favoritos' : ''));
      if (b?.dataset.apagar) {
        const nome = { hora: 'a última hora', dia: 'as últimas 24 horas', tudo: 'todo o histórico deste perfil' }[b.dataset.apagar];
        if (!confirm(`Apagar ${nome}?`)) return;
        app.historico.apagar(b.dataset.apagar); desenhar(); return app.aviso('Histórico apagado.', 'Histórico');
      }
      const item = e.target.closest('.hist-item'); if (!item) return;
      if (b?.hasAttribute('data-tirar')) {
        if (aba === 'favoritos') app.historico.tirarFavorito(item.dataset.url);
        else app.guardado.gravar('historico:' + app.perfilAtual(), app.historico.ler().filter(h => !(h.url === item.dataset.url && String(h.hora) === item.dataset.hora)));
        return desenhar();
      }
      // escondido: o clique revela (sensivel.js cuida); visível: abre o site
      if (aberta()) app.navegar(item.dataset.url);
    });
    el.querySelector('[data-hist-ligado]')?.addEventListener('change', e => { app.historico.definirLigado(e.target.checked); desenhar(); });
    el.querySelector('[data-hist-visivel]')?.addEventListener('change', e => {
      if (e.target.checked && !confirm('A lista vai aparecer sem o cadeado, inclusive em gravações e transmissões da tela. Deixar sempre visível?')) { e.target.checked = false; return; }
      app.historico.definirSempreVisivel(e.target.checked);
      desenhar();
    });
    // o cadeado abriu ou fechou: as sugestões seguem junto
    const observar = new MutationObserver(desenhar);
    observar.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sv-estado'] });
    const tirar = app.on('favoritos', desenhar);
    return { desmontar: () => { tirar(); observar.disconnect(); } };
  },
};
