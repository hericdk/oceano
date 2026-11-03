// oceano://gimp — atalho para o GIMP, o editor de imagens livre, com a opção do PhotoGIMP (Diolinux).
// O GIMP é um programa à parte, de outro projeto: abre em janela própria e o Oceano só ajuda a instalar e abrir.

import { icone } from './icones.js';

const LINKS = { gimp: 'https://www.gimp.org', codigo: 'https://gitlab.gnome.org/GNOME/gimp', sugestoes: 'https://gitlab.gnome.org/GNOME/gimp/-/issues', photogimp: 'https://github.com/Diolinux/PhotoGIMP' };
export const AVISO_GIMP = 'O RetoqueShop 1.0, o editor de imagens do Oceano, é feito com base nas ideias do GIMP, com código próprio. Considere usar o GIMP e sugerir mudanças e melhorias ao projeto dele.';
export const gimpLigado = app => app.guardado.ler('mod-gimp', false);
const ext = (url, texto) => `<a href="${url}" target="_blank" rel="noopener">${texto}</a>`;
const nativo = () => window.oceanoNativo;
// o aviso de progresso é ligado uma vez só; cada abertura da página troca quem recebe
let aoProgresso = null, progressoLigado = false;

export const gimp = {
  titulo: () => 'GIMP',
  icone: 'gimp',
  html: (r, app) => !gimpLigado(app) ? `<div class="folha gimp-pagina">
      <header class="cab"><h1>${icone('gimp')}<span>GIMP</span></h1><p>Este mod é opcional e está desligado.</p></header>
      <p>${AVISO_GIMP}</p>
      <div class="gimp-acoes"><button class="btn px" data-gimp-ligar>Ativar o mod do GIMP</button><a class="btn px secundario" href="#" data-gimp-retoque>Abrir o RetoqueShop 1.0</a></div>
    </div>` : `<div class="folha gimp-pagina">
      <header class="cab"><h1>${icone('gimp')}<span>GIMP</span></h1><p>O editor de imagens livre e gratuito: retoque, composição, pintura e muito mais. Abre em uma janela própria, fora do Oceano.</p><p>${AVISO_GIMP}</p></header>
      <div class="caixa-sandbox px">${icone('cadeado')}<div><b>Este é o GIMP de verdade, não um editor do Oceano.</b> O GIMP é feito pelo time do GIMP e o PhotoGIMP pelo Diolinux, ambos sob GPL-3.0. O Oceano só ajuda a instalar e abrir, e o download vem das fontes oficiais, conferido antes de usar.</div></div>
      <div class="gimp-acoes" data-gimp-acoes></div>
      <p class="nota" role="status" data-gimp-status></p>
      <section class="mod px gimp-photo" data-gimp-photo hidden>
        <h2>PhotoGIMP</h2>
        <p>Deixa o GIMP com os atalhos e a organização do Photoshop. Antes de aplicar, guardamos uma cópia da sua configuração, e dá para desfazer.</p>
        <div class="mod-acoes" data-gimp-photo-acoes></div>
      </section>
      <p class="nota gimp-links">${ext(LINKS.gimp, 'gimp.org')} · ${ext(LINKS.codigo, 'código do GIMP')} · ${ext(LINKS.sugestoes, 'sugerir melhorias ao GIMP')} · ${ext(LINKS.photogimp, 'PhotoGIMP no GitHub')}</p>
    </div>`,
  montar(el, r, app) {
    if (!gimpLigado(app)) {
      el.querySelector('[data-gimp-ligar]').onclick = () => { app.guardado.gravar('mod-gimp', true); app.emitir('mods-mudaram'); app.navegar('oceano://nova-aba'); app.navegar('oceano://gimp'); };
      el.querySelector('[data-gimp-retoque]').onclick = e => { e.preventDefault(); app.navegar('oceano://retoque'); };
      return;
    }
    const acoes = el.querySelector('[data-gimp-acoes]'), status = el.querySelector('[data-gimp-status]');
    const foto = el.querySelector('[data-gimp-photo]'), fotoAcoes = el.querySelector('[data-gimp-photo-acoes]');
    const n = nativo();
    const avisar = (t, ruim) => { status.textContent = t; status.classList.toggle('ruim', !!ruim); };
    if (!n?.gimpEstado) {
      acoes.innerHTML = `<a class="btn px" href="${LINKS.gimp}/downloads/" target="_blank" rel="noopener">Baixar no gimp.org</a>`;
      avisar('Aqui no simulador não dá para abrir programas. No app do Oceano, este botão abre o GIMP.');
      return { desmontar: () => {} };
    }
    let ocupado = false;
    const pintar = async () => {
      if (ocupado) return;
      const e = await n.gimpEstado();
      acoes.innerHTML = e.instalado
        ? `<button class="btn px" data-gimp="abrir">${icone('gimp')} Abrir o GIMP${e.versao ? ' ' + e.versao.replace(/[^\w.-]/g, '') : ''}</button>`
        : e.plataforma === 'linux'
          ? `<a class="btn px" href="https://flathub.org/apps/org.gimp.GIMP" target="_blank" rel="noopener">Instalar pelo Flathub</a>`
          : `<button class="btn px" data-gimp="baixar">Baixar o instalador oficial</button><span class="nota">Quando abrir, ${e.plataforma === 'darwin' ? 'arraste o GIMP para Aplicativos' : 'siga o instalador'}.</span>`;
      foto.hidden = !e.instalado;
      if (!e.instalado) return;
      if (!e.podePhotoGimp) fotoAcoes.innerHTML = ext(LINKS.photogimp, 'Ver como instalar neste sistema');
      else if (!e.photogimp.pronto) fotoAcoes.innerHTML = '<span class="nota">Abra e feche o GIMP uma vez: ele precisa criar a própria configuração.</span>';
      else fotoAcoes.innerHTML = `<button class="btn px${e.photogimp.aplicado ? ' secundario' : ''}" data-gimp="photogimp">${e.photogimp.aplicado ? 'Aplicar de novo' : 'Aplicar PhotoGIMP'} ${e.versaoPhotoGimp}</button>${e.photogimp.copia ? '<button class="btn px perigo" data-gimp="desfazer">Desfazer</button>' : ''}`;
    };
    const fazer = async (botao, inicio, fn, fim) => {
      if (ocupado) return;
      ocupado = true; botao.disabled = true; avisar(inicio);
      let r; try { r = await fn(); } catch (err) { r = { ok: false, erro: err.message }; }
      ocupado = false;
      if (r.ok) avisar(typeof fim === 'function' ? fim(r) : fim); else avisar(r.erro || 'Não deu certo.', true);
      await pintar();
    };
    aoProgresso = ({ feito, total }) => {
      if (ocupado) avisar(`Baixando o GIMP: ${total ? Math.round(feito / total * 100) + '%' : Math.round(feito / 1e6) + ' MB'}`);
    };
    if (!progressoLigado) { progressoLigado = true; n.aoGimpProgresso?.(p => aoProgresso?.(p)); }
    el.querySelector('.folha').addEventListener('click', e => {
      const b = e.target.closest('[data-gimp]');
      if (!b) return;
      const qual = b.dataset.gimp;
      if (qual === 'abrir') fazer(b, 'Abrindo o GIMP…', n.gimpAbrir, 'O GIMP abre em uma janela própria.');
      else if (qual === 'baixar') fazer(b, 'Baixando o GIMP…', n.gimpBaixar, r => `GIMP ${r.versao} baixado e conferido. Termine a instalação na janela que abriu e volte aqui.`);
      else if (qual === 'photogimp') fazer(b, 'Aplicando o PhotoGIMP…', n.gimpPhotoGimp, 'PhotoGIMP aplicado. Abra o GIMP para ver.');
      else if (qual === 'desfazer') fazer(b, 'Voltando a sua configuração…', n.gimpDesfazer, 'Sua configuração anterior voltou.');
    });
    // a pessoa instala em outra janela: ao voltar para o Oceano, o botão já aparece certo
    addEventListener('focus', pintar);
    pintar().catch(err => avisar(err.message, true));
    return { desmontar: () => { removeEventListener('focus', pintar); aoProgresso = null; } };
  },
};
