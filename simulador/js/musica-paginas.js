// As duas telas de música que antes só existiam como janelas da mesa: oceano://trilha e oceano://cds.
// O painel da Trilha e o player dos CDs são os mesmos da mesa (um só de cada), só mudam de lugar;
// a música não para ao trocar de tela.

import { icone } from './icones.js';
import { desenharDisco } from './discos.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const trilhaPagina = {
  titulo: () => 'Trilha',
  icone: 'som',
  html: (r, app) => `${app.musica?.abas('trilha') || ''}<div class="mus-corpo mus-trilha"><div class="mus-trilha-lugar"></div></div>`,
  montar(el, r, app) { app.trilhaNaTela(el.querySelector('.mus-trilha-lugar')); },
};

export const cdsPagina = {
  titulo: () => 'CDs',
  icone: 'disco',
  html: (r, app) => `${app.musica?.abas('cds') || ''}<div class="mus-corpo mus-cds">
    <section class="mus-cds-pilha"><header><h1>${icone('disco')} CDs</h1><button class="btn mini" data-cd-novo>colocar uma música</button></header>
      <p class="nota">Aqui a gente não grava um CD: o disco é só uma representação. Você sobe uma música ou cola um link do YouTube, do SoundCloud ou de outra ferramenta de áudio, e o Oceano pega a imagem, coloca no formato de CD e deixa tocando de fundo em loop. No futuro vai ter playlist; por enquanto é uma música só. O arquivo fica só neste computador.</p>
      <ol class="mus-cds-lista" data-cds-lista></ol></section>
    <section class="mus-cds-player jan-winampfm" data-cds-player data-vazio="&lt;p class=&quot;nota&quot;&gt;Escolha um CD para tocar.&lt;/p&gt;"></section>
  </div>`,
  montar(el, r, app) {
    const lista = el.querySelector('[data-cds-lista]');
    const desenhar = () => {
      const cds = app.cds.lista(), atual = app.cds.atual()?.id;
      lista.innerHTML = cds.length ? cds.map((c, i) => `<li><button class="mus-cd${c.id === atual ? ' atual' : ''}" data-cd="${esc(c.id)}" ${c.id === atual ? 'aria-current="true"' : ''}>
          <canvas width="64" height="64" data-disco-cd="${i}"></canvas><span><b>${esc(c.titulo)}</b><small>${esc(c.artista || { youtube: 'YouTube', soundcloud: 'SoundCloud', arquivo: 'arquivo', link: 'link' }[c.tipo] || '')}</small></span></button></li>`).join('')
        : '<li class="nota">Nenhuma música ainda. Coloque a primeira.</li>';
      lista.querySelectorAll('[data-disco-cd]').forEach(cv => {
        const cd = cds[+cv.dataset.discoCd];
        if (cd.capa) { const im = new Image(); im.onload = () => desenharDisco(cv, cd, app.tema.paleta, im); im.src = cd.capa; }
        else desenharDisco(cv, cd, app.tema.paleta);
      });
    };
    desenhar();
    app.cds.montarPlayer(el.querySelector('[data-cds-player]'));
    el.onclick = e => {
      if (e.target.closest('[data-cd-novo]')) return app.cds.dialogo();
      const b = e.target.closest('[data-cd]'); if (b) app.cds.tocar(b.dataset.cd);
    };
    const tira = [app.on('cds', desenhar), app.on('musica', desenhar)];
    return { desmontar: () => tira.forEach(f => f?.()) };
  },
};
