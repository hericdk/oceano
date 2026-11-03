// oceano://downloads — o que foi baixado desde que o Oceano abriu. A lista fica só na memória:
// fechou o navegador, ela some. Os nomes ficam atrás do cadeado, para quem grava a tela.

import { icone } from './icones.js';
import { sensivel } from './sensivel.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tamanho = b => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const ESTADO = { baixando: 'baixando', pausado: 'pausado', completed: 'pronto', cancelled: 'cancelado', interrupted: 'interrompido' };

export const downloads = {
  titulo: () => 'Downloads',
  icone: 'descer',
  html: () => `
    <div class="folha">
      <header class="cab"><h1>${icone('descer')}<span>Downloads</span></h1>
        <p>O que você baixou desde que abriu o Oceano. Esta lista não fica guardada; os arquivos ficam na pasta que você escolheu.</p></header>
      <section class="px bloco"><ul class="downloads" data-lista></ul></section>
    </div>`,
  montar(el, r, app) {
    const lista = el.querySelector('[data-lista]'), nativo = window.oceanoNativo;
    const desenhar = async () => {
      const itens = nativo?.downloadsLista ? await nativo.downloadsLista() : [];
      lista.innerHTML = itens.length ? itens.map(d => `<li>
        <span class="dl-nome">${sensivel(d.nome, 'nome do arquivo')}</span>
        ${d.arriscado ? '<span class="nota mod-alerta">pode rodar programas: só abra se confiar</span>' : ''}
        <span class="nota">${ESTADO[d.estado] || esc(d.estado)}${d.total ? ` · ${tamanho(d.recebido)} de ${tamanho(d.total)}` : d.recebido ? ` · ${tamanho(d.recebido)}` : ''}</span>
        ${d.estado === 'baixando' && d.total ? `<progress max="${d.total}" value="${d.recebido}" aria-label="Progresso"></progress>` : ''}
        <span class="dl-acoes">
          ${d.estado === 'baixando' ? `<button class="btn mini secundario" data-cancelar="${d.id}">Cancelar</button>` : ''}
          ${d.estado === 'completed' ? `<button class="btn mini secundario" data-mostrar="${d.id}">Mostrar na pasta</button>` : ''}
        </span></li>`).join('') : '<li class="nota">Nada baixado ainda.</li>';
    };
    lista.addEventListener('click', e => {
      const c = e.target.closest('[data-cancelar]'), m = e.target.closest('[data-mostrar]');
      if (c) nativo.downloadsCancelar(+c.dataset.cancelar);
      if (m) nativo.downloadsMostrar(+m.dataset.mostrar);
    });
    const tirar = app.on('download', desenhar);
    desenhar();
    return { desmontar: () => tirar?.() };
  },
};
