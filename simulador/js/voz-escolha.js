// A escolha da voz, igual na página do avatar e nos primeiros passos: a voz do sistema de um lado, a neural do outro.
// As amostras da neural tocam antes de baixar qualquer coisa.

import { icone } from './icones.js';
import { VOZES_NEURAIS, amostraNeural } from './voz-neural.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function montarVozSistema(el, a, app, { titulo = true } = {}) {
  el.classList.add('vz-bloco');
  const pintar = () => {
    const usando = a.motorVoz() === 'sistema';
    el.innerHTML = `${titulo ? `<p class="vz-sistema-tit"><b>Voz do sistema</b>${usando ? '<span class="chip vz-uso">em uso</span>' : ''}</p>` : ''}
      <div class="vz-chips" role="group" aria-label="Jeito de falar">${Object.entries(a.perfisVoz).map(([v, p]) => `<button type="button" class="chip" data-vz-perfil="${esc(v)}" aria-pressed="${a.perfilVoz() === v}">${esc(p.nome)}</button>`).join('')}</div>
      <label class="iap-campo"><span>Voz</span><select data-vz-nome>${a.opcoesDeVoz()}</select></label>
      <span class="vz-botoes"><button type="button" class="btn mini secundario" data-vz-ouvir>${icone('som')} ouvir</button><button type="button" class="btn mini" data-vz-usar-sistema aria-pressed="${usando}">${usando ? 'em uso' : 'usar'}</button></span>`;
  };
  // ouvir só testa, como nas vozes neurais; quem troca a voz em uso é o botão usar
  const ouvir = () => a.ouvirSistema();
  el.addEventListener('click', e => {
    const p = e.target.closest('[data-vz-perfil]');
    if (p) { a.definirPerfilVoz(p.dataset.vzPerfil); ouvir(); pintar(); }
    if (e.target.closest('[data-vz-ouvir]')) ouvir();
    if (e.target.closest('[data-vz-usar-sistema]')) { a.definirVoz(true); a.definirMotorVoz('sistema'); a.ouvirSistema(); }
  });
  el.addEventListener('change', e => { if (e.target.matches('[data-vz-nome]')) { a.definirVozNome(e.target.value); ouvir(); } });
  pintar();
  speechSynthesis.addEventListener?.('voiceschanged', pintar);
  const tirar = app.on('voz-neural', pintar), tirarIdioma = app.on('idioma-mudou', pintar);   // a lista mostra as vozes do idioma escolhido
  return () => { tirar?.(); tirarIdioma?.(); speechSynthesis.removeEventListener?.('voiceschanged', pintar); };
}

// as vozes usam o mesmo arquivo de 86 MB: a primeira baixa, as outras entram na hora. Remover a última libera o espaço
const CHAVE_BAIXADAS = 'vozes-neurais-baixadas';
export function montarVozNeural(el, a, app) {
  el.classList.add('vz-bloco', 'vz-neural');
  let tocando = null, pedida = null;
  const baixadas = () => {
    if (a.neural.estado() !== 'pronta') return [];
    return app.guardado.ler(CHAVE_BAIXADAS, null) ?? Object.keys(VOZES_NEURAIS);   // já tinha o arquivo antes desta tela
  };
  const pintar = () => {
    const n = a.neural, e = n.estado(), lista = baixadas(), usando = e === 'pronta' && a.motorVoz() === 'neural', pct = Math.round(n.progresso() * 100);
    el.innerHTML = `<h3>Voz neural<span class="chip vz-beta">beta</span>${usando ? '<span class="chip vz-uso">em uso</span>' : ''}</h3>
      <p>Uma voz bem mais viva, gerada aqui mesmo no seu computador, sem mandar nada para fora.</p>
      <div class="vz-lista">${Object.entries(VOZES_NEURAIS).map(([id, v]) => {
        const tem = lista.includes(id), ativa = usando && tem && a.vozNeural() === id, baixando = e === 'baixando' && pedida === id;
        return `<div class="vz-voz${ativa ? ' ativa' : ''}">
          <button type="button" class="btn mini secundario" data-vz-amostra="${esc(id)}" aria-label="Ouvir uma amostra de ${esc(v.nome)}">${icone('som')} ouvir</button>
          <div><b>${esc(v.nome)}</b><small>${esc(v.desc)}</small></div>
          <span class="vz-acoes">${tem
            ? `<button type="button" class="btn mini" data-vz-usar="${esc(id)}" aria-pressed="${ativa}">${ativa ? 'em uso' : 'usar'}</button><button type="button" class="vz-ico" data-vz-remover="${esc(id)}" title="Remover ${esc(v.nome)}" aria-label="Remover ${esc(v.nome)}">${icone('lixo')}</button>`
            : baixando ? `<span class="vz-pct">${pct}%</span>`
            : `<button type="button" class="vz-ico vz-ico-baixar" data-vz-baixar="${esc(id)}" ${e === 'baixando' ? 'disabled' : ''} title="Baixar ${esc(v.nome)}" aria-label="Baixar ${esc(v.nome)}">${icone('baixar')}</button>`}</span>
        </div>`;
      }).join('')}</div>
      ${e === 'baixando' ? `<div class="vz-barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Baixando a voz neural"><i style="width:${pct}%"></i></div>` : ''}
      ${e === 'erro' ? `<p class="nota">Não deu: ${esc(n.erro())}</p>` : ''}
      <p class="nota">${lista.length ? 'Toque na lixeira para remover. Ao remover a última voz, os 86 MB são liberados.' : 'A primeira voz baixa 86 MB, só uma vez. As outras entram na hora.'}</p>`;
  };
  const tocarAmostra = id => { tocando?.pause(); tocando = new Audio(amostraNeural(id, app.idioma?.atual?.())); tocando.play().catch(() => {}); };
  el.addEventListener('click', e => {
    const am = e.target.closest('[data-vz-amostra]');
    if (am) return tocarAmostra(am.dataset.vzAmostra);
    const usar = e.target.closest('[data-vz-usar]');
    if (usar) { tocando?.pause(); a.definirVoz(true); a.definirVozNeural(usar.dataset.vzUsar); a.definirMotorVoz('neural'); tocarAmostra(usar.dataset.vzUsar); return; }
    const baixar = e.target.closest('[data-vz-baixar]');
    if (baixar && !baixar.disabled) {
      const id = baixar.dataset.vzBaixar;
      app.guardado.gravar(CHAVE_BAIXADAS, [...baixadas(), id]);
      a.definirVozNeural(id);
      if (a.neural.estado() === 'pronta') pintar();
      else { pedida = id; a.neural.baixar(); }
      return;
    }
    const remover = e.target.closest('[data-vz-remover]');
    if (remover) {
      const id = remover.dataset.vzRemover, resta = baixadas().filter(x => x !== id), nome = VOZES_NEURAIS[id].nome;
      if (!confirm(resta.length ? `Remover a voz ${nome}?` : `Remover a voz ${nome}? Era a última: os 86 MB serão liberados deste computador.`)) return;
      app.guardado.gravar(CHAVE_BAIXADAS, resta);
      if (!resta.length) { a.neural.apagar(); a.definirMotorVoz('sistema'); }
      else if (a.vozNeural() === id) a.definirVozNeural(resta[0]);
      pintar();
    }
  });
  pintar();
  const tirar = app.on('voz-neural', pintar);
  return () => { tirar?.(); tocando?.pause(); };
}
