// A tela de seleção das 🧰 Ferramentas: caixas lado a lado com um slider fixo, que anda com o scroll vertical ou horizontal.
// Ao abrir uma ferramenta, o menu sobe e vira a barra de opções; dali em diante, a troca é direta, de lado.
(() => {
  const LISTA = [
    ['baixar', 'fa-cloud-arrow-down', 'Baixar', 'Baixe vídeos de sites em alta qualidade, com integração com o Editor de vídeo.'],
    ['editor', 'fa-film', 'Editor de vídeo', 'Focado em tarefas de otimização, recorte e ajustes simples, com faixas de edição para diferentes cenas e áudio, acelerar o vídeo e fazer recortes e junções úteis e completas.'],
    ['images', 'fa-images', 'Imagens', 'Otimize imagens reduzindo o tamanho e a densidade de pixels para deixá-las mais leves, ou só converta para um novo formato.'],
    ['audio', 'fa-wave-square', 'Áudio', 'Suba e edite áudios.'],
    ['dither', 'fa-chess-board', 'Pixelizar', 'Em inglês se chama dither, mas aqui no Brasil é pixelizar. Edite fotos e vídeos aplicando filtro de pixel, exporte em GIFs ou vídeos e use onde quiser, até mesmo como avatar.'],
    ['case-converter', 'fa-font', 'Conversor de frase', 'Aqui é um conversor de caixa alta e baixa. Ajuste textos ou frases escrevendo no formato de frase mais compreensível.'],
    ['lorem', 'fa-align-left', 'Lorem', 'É um gerador simples de lorem ipsum que também converte texto.'],
  ];
  // a tela de seleção em inglês; o resto de cada ferramenta segue em português
  const EN = new URLSearchParams(location.search).get('lang') === 'en' && {
    baixar: ['Download', 'Download videos from websites in high quality, connected to the Video editor.'], editor: ['Video editor', 'Focused on optimizing, trimming and simple adjustments, with edit tracks for different scenes and audio, speeding up video and making cuts and joins.'],
    images: ['Images', 'Optimize images by reducing size and pixel density to make them lighter, or just convert them to a new format.'], audio: ['Audio', 'Upload and edit audio.'],
    dither: ['Pixelate', 'Also known as dither. Edit photos and videos with a pixel filter, export as GIFs or videos and use them wherever you want.'], 'case-converter': ['Sentence converter', 'An upper and lower case converter. Fix texts or sentences by writing them in the clearest sentence format.'], lorem: ['Lorem', 'A simple lorem ipsum generator that also converts text.'],
  };
  if (EN) { LISTA.forEach(l => { [l[2], l[3]] = EN[l[0]] || [l[2], l[3]]; }); document.querySelector('.sel-cabeca')?.replaceChildren(Object.assign(document.createElement('h1'), { textContent: '🧰 Tools' }), Object.assign(document.createElement('p'), { textContent: 'Useful editing tools, all in one place. Scroll to see them all and click to open.' })); document.documentElement.lang = 'en'; }
  window.FERRAMENTAS = LISTA;
  const raiz = document.documentElement, sel = document.getElementById('selecao'), trilho = document.getElementById('sel-cartoes'), regua = document.getElementById('sel-regua');
  const links = document.getElementById('top-links');
  const quando = id => { const a = document.getElementById(id); return !!a?.classList.contains('tab-content'); };

  trilho.innerHTML = LISTA.map(([id, ic, nome, texto]) => `<button class="sel-cartao" data-abrir="${id}">
      <i class="fas ${ic}" aria-hidden="true"></i><b>${nome}</b><span>${texto}</span></button>`).join('');
  links.insertAdjacentHTML('beforeend', LISTA.map(([id, ic, nome]) => `<a href="#${id}" class="nav-link top-link" title="${nome}"><i class="fas ${ic}"></i><span>${nome}</span></a>`).join(''));

  const maximo = () => Math.max(0, trilho.scrollWidth - trilho.clientWidth);
  const pintarRegua = () => { regua.value = String(maximo() ? Math.round(trilho.scrollLeft / maximo() * 1000) : 0); regua.hidden = !maximo(); };
  trilho.addEventListener('scroll', pintarRegua, { passive: true });
  regua.addEventListener('input', () => { trilho.scrollLeft = Number(regua.value) / 1000 * maximo(); });
  addEventListener('resize', pintarRegua);
  // o scroll vertical também anda para o lado
  sel.addEventListener('wheel', e => {
    if (raiz.dataset.tela !== 'selecao') return;
    trilho.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    e.preventDefault();
  }, { passive: false });

  const mostrar = tela => { raiz.dataset.tela = tela; };
  function abrir(id) {
    mostrar('ferramenta');
    location.hash = id;
    gsap.fromTo(document.getElementById('topbar'), { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform,opacity' });
    gsap.fromTo(document.getElementById('main'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform,opacity' });
  }
  trilho.addEventListener('click', e => { const b = e.target.closest('[data-abrir]'); if (b) abrir(b.dataset.abrir); });
  document.getElementById('sel-voltar').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    mostrar('selecao');
    pintarRegua();
    trilho.querySelector('.sel-cartao')?.focus({ preventScroll: true });
  });
  addEventListener('hashchange', () => { if (quando(location.hash.slice(1))) mostrar('ferramenta'); });
  mostrar(quando(location.hash.slice(1)) ? 'ferramenta' : 'selecao');
  requestAnimationFrame(pintarRegua);
})();
