// A caixa do bloqueador 18+, no fim da página Sobre. A tela só mostra e pede: quem barra é o processo principal (app/bloqueio-18.js).
import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tempo = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const LEGENDAS = {
  bets: 'Bets: apostas esportivas e cassinos on-line.',
  azar: 'Jogos de azar: pôquer, cassino e outros jogos em que se aposta dinheiro.',
  venda: 'Venda de conteúdo adulto: sites que vendem fotos e vídeos sexuais, para maiores de 18 anos. Clique em um endereço para ler.',
  adulto: 'Adultos: pornografia e outros conteúdos sexuais explícitos, para maiores de 18 anos. Clique em um endereço para ler.',
  outro: 'Outro: endereços que você acrescentou.',
};
const ESCONDIDAS = new Set(['venda', 'adulto']);

export const htmlBloqueio18 = app => (app.real ? `
  <section class="b18" data-b18>
    <div class="b18-linha">
      <b>Bloqueador 18+</b><span class="b18-estado" data-b18-estado role="status"></span>
      <span class="b18-tempo"><button type="button" class="b18-botao" data-b18-menos aria-label="Menos tempo">${icone('menos')}</button><span data-b18-minutos></span><button type="button" class="b18-botao" data-b18-mais aria-label="Mais tempo">${icone('mais')}</button></span>
      <button type="button" class="b18-pausar" data-b18-pausar></button>
      <button type="button" class="b18-botao b18-seta" data-b18-abrir aria-expanded="false" aria-label="Ver os sites bloqueados">${icone('descer')}</button>
    </div>
    <div class="b18-janela" data-b18-janela hidden>
      <div class="b18-filtros" data-b18-filtros role="group" aria-label="Filtrar por categoria"></div>
      <div class="b18-novo"><input type="text" data-b18-novo placeholder="escreva ou cole um link para bloquear" aria-label="Novo endereço" autocomplete="off" spellcheck="false"><span class="b18-tags" data-b18-novo-tags hidden></span></div>
      <p class="b18-aviso" data-b18-aviso role="status" hidden></p>
      <ol class="b18-lista" data-b18-lista></ol>
    </div>
  </section>` : '');

export function ligarBloqueio18(el) {
  const raiz = el.querySelector('[data-b18]'), nativo = window.oceanoNativo;
  if (!raiz || !nativo?.bloqueio18Estado) return {};
  const $ = s => raiz.querySelector(s);
  let e = null, filtro = '', relogio = 0;
  const abertos = new Set();   // o que já foi lido nesta visita à página; ao sair, tudo volta a ficar escondido

  const corDe = id => e.categorias.find(c => c.id === id)?.cor || 'texto';
  const tags = (atual, attr) => e.categorias.map(c => `<button type="button" class="b18-tag${c.id === atual ? ' marcada' : ''}" style="--cor: var(--${c.cor})" ${attr}="${c.id}">${esc(c.nome)}</button>`).join('');
  const pintarTopo = () => {
    $('[data-b18-estado]').textContent = e.pausado ? `pausado por ${tempo(e.restanteMs)}` : 'sempre ativo';
    $('[data-b18-minutos]').textContent = `${e.minutos} min`;
    const p = $('[data-b18-pausar]');
    p.textContent = e.pausado ? 'religar' : e.podePausar ? 'pausar' : 'só ao abrir o navegador';
    p.disabled = !e.pausado && !e.podePausar;
    $('[data-b18-menos]').disabled = e.pausado || e.minutos <= e.min;
    $('[data-b18-mais]').disabled = e.pausado || e.minutos >= e.max;
  };
  const pintarLista = () => {
    const ordem = e.categorias.map(c => c.id);
    const linhas = [...e.extras.map(x => ({ ...x, minha: true })), ...e.lista]
      .filter(x => !filtro || x.cat === filtro)
      .sort((a, b) => ordem.indexOf(a.cat) - ordem.indexOf(b.cat));
    $('[data-b18-filtros]').innerHTML = `<button type="button" class="b18-tag${filtro ? '' : ' marcada'}" style="--cor: var(--texto)" data-b18-filtro="">Todos</button>${tags(filtro, 'data-b18-filtro')}`;
    const endereco = x => (ESCONDIDAS.has(x.cat)
      ? `<button type="button" class="sensivel b18-ver${abertos.has(x.alvo) ? ' aberto' : ''}" data-b18-ver="${esc(x.alvo)}" aria-pressed="${abertos.has(x.alvo)}" aria-label="${abertos.has(x.alvo) ? esc(x.alvo) : 'endereço escondido: ative para ler'}">${icone('cadeado')}<span class="sv-dado" aria-hidden="${!abertos.has(x.alvo)}">${esc(x.alvo)}</span></button>`
      : `<code>"${esc(x.alvo)}",</code>`);
    $('[data-b18-lista]').innerHTML = linhas.map((x, i) => `${x.cat !== linhas[i - 1]?.cat ? `<li class="b18-legenda" style="--cor: var(--${corDe(x.cat)})">${esc(LEGENDAS[x.cat] || x.cat)}</li>` : ''}<li style="--cor: var(--${corDe(x.cat)})">${endereco(x)}${x.minha ? `<span class="b18-tags" data-b18-alvo="${esc(x.alvo)}">${tags(x.cat, 'data-b18-marcar')}<button type="button" class="b18-botao" data-b18-tirar aria-label="apagar ${esc(x.alvo)}">${icone('fechar')}</button></span>` : ''}</li>`).join('');
  };
  const aplicar = d => { e = d; pintarTopo(); if (!$('[data-b18-janela]').hidden) pintarLista(); };
  const atualizar = () => nativo.bloqueio18Estado().then(aplicar);
  atualizar();
  relogio = setInterval(() => { if (document.contains(raiz)) atualizar(); }, 1000);

  const campo = $('[data-b18-novo]'), novasTags = $('[data-b18-novo-tags]'), aviso = $('[data-b18-aviso]');
  const salvar = cat => nativo.bloqueio18Adicionar(campo.value, cat).then(d => {
    aviso.hidden = !d.erro;
    aviso.textContent = d.erro === 'repetido' ? 'Esse endereço já está na lista.' : d.erro ? 'Isso não parece um endereço.' : '';
    if (!d.erro) { campo.value = ''; novasTags.hidden = true; }
    aplicar(d);
  });
  campo.addEventListener('input', () => { novasTags.hidden = !campo.value.trim(); aviso.hidden = true; if (!novasTags.hidden && !novasTags.children.length) novasTags.innerHTML = tags('', 'data-b18-salvar'); });
  campo.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.isComposing && campo.value.trim()) { ev.preventDefault(); salvar('outro'); } });

  raiz.addEventListener('click', ev => {
    const t = ev.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.b18Ver) { const a = t.dataset.b18Ver; abertos.has(a) ? abertos.delete(a) : abertos.add(a); pintarLista(); return; }
    if (t.matches('[data-b18-abrir]')) {
      const j = $('[data-b18-janela]'); j.hidden = !j.hidden;
      t.setAttribute('aria-expanded', String(!j.hidden)); t.classList.toggle('aberta', !j.hidden);
      if (!j.hidden) { j.classList.remove('entra'); void j.offsetWidth; j.classList.add('entra'); pintarLista(); }
    } else if (t.matches('[data-b18-menos]')) nativo.bloqueio18Minutos(e.minutos - 1).then(aplicar);
    else if (t.matches('[data-b18-mais]')) nativo.bloqueio18Minutos(e.minutos + 1).then(aplicar);
    else if (t.matches('[data-b18-pausar]')) (e.pausado ? nativo.bloqueio18Religar() : nativo.bloqueio18Pausar()).then(aplicar);
    else if (t.dataset.b18Filtro !== undefined) { filtro = t.dataset.b18Filtro; pintarLista(); }
    else if (t.dataset.b18Salvar) salvar(t.dataset.b18Salvar);
    else if (t.dataset.b18Marcar) nativo.bloqueio18Marcar(t.closest('[data-b18-alvo]').dataset.b18Alvo, t.dataset.b18Marcar).then(aplicar);
    else if (t.matches('[data-b18-tirar]')) nativo.bloqueio18Remover(t.closest('[data-b18-alvo]').dataset.b18Alvo).then(aplicar);
  });
  return { desmontar: () => clearInterval(relogio) };
}
