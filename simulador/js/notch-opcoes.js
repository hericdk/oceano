// As opções do notch numa janelinha de navegador, por cima da página de mods.
import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function abrirOpcoesNotch(app, aoMudar) {
  document.querySelector('.notch-opcoes')?.remove();
  const nativo = window.oceanoNativo, el = document.createElement('div');
  el.className = 'notch-opcoes';
  el.innerHTML = `<div class="no-janela px" role="dialog" aria-modal="true" aria-label="Opções do notch" tabindex="-1">
    <div class="no-topo"><span>${icone('janela')} Notch</span><button type="button" class="ico" data-no-fechar aria-label="Fechar">${icone('fechar')}</button></div>
    <div class="no-endereco"><span>${icone('oceano')}</span><code>oceano://notch</code></div>
    <div class="no-corpo">
      <label class="no-linha"><span><b>Mostrar o notch</b><small>A Navegadora mora lá em cima: encoste o mouse para ela descer.</small></span><input type="checkbox" data-no="ligado"></label>
      <fieldset class="no-grupo" data-no-depende><legend>Onde ele aparece</legend>
        <label class="no-linha"><span><b>Em todos os apps e mesas</b><small>Continua lá, minimizado, em qualquer app ou mesa do macOS, até em tela cheia.</small></span><input type="radio" name="no-onde" value="sempre"></label>
        <label class="no-linha"><span><b>Só com o navegador na frente</b><small>Some quando outro app está na frente e volta com o Oceano.</small></span><input type="radio" name="no-onde" value="navegador"></label>
      </fieldset>
      <label class="no-linha" data-no-depende><span><b>Continuar ligado ao fechar o navegador</b><small>Fica no notch e na barra do Mac, só para conversar com as IAs conectadas.</small></span><input type="checkbox" data-no="ficar"></label>
      <div class="no-grupo" data-no-depende><b>Tema</b><div class="no-temas" data-no-temas role="group" aria-label="Tema do notch"></div></div>
      <button type="button" class="btn mini secundario" data-no-mais>todas as opções em Configurações</button>
    </div>
  </div>`;
  document.body.append(el);
  const janela = el.querySelector('.no-janela');
  const fechar = () => { document.removeEventListener('keydown', teclas); el.remove(); aoMudar?.(); };
  const teclas = e => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', teclas);
  el.addEventListener('pointerdown', e => { if (e.target === el) fechar(); });
  el.querySelector('[data-no-fechar]').onclick = fechar;
  el.querySelector('[data-no-mais]').onclick = () => { fechar(); app.navegar('oceano://configuracoes'); };
  janela.focus();

  // arrastar pela barra de título, como uma janela
  const topo = el.querySelector('.no-topo');
  topo.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const r = janela.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    janela.style.position = 'fixed'; janela.style.left = `${r.left}px`; janela.style.top = `${r.top}px`; janela.style.margin = '0';
    const mover = ev => { janela.style.left = `${Math.max(0, Math.min(innerWidth - r.width, ev.clientX - dx))}px`; janela.style.top = `${Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy))}px`; };
    const soltar = () => { removeEventListener('pointermove', mover); removeEventListener('pointerup', soltar); };
    addEventListener('pointermove', mover); addEventListener('pointerup', soltar);
  });

  const definir = novo => { Object.assign(app.notchPrefs, novo); nativo.notchDefinir(novo); pintar(); };
  const pintar = () => {
    const p = app.notchPrefs;
    el.querySelector('[data-no="ligado"]').checked = p.ligado;
    el.querySelector('[data-no="ficar"]').checked = p.ficar;
    el.querySelector(`[name="no-onde"][value="${p.sempre ? 'sempre' : 'navegador'}"]`).checked = true;
    el.querySelectorAll('[data-no-depende]').forEach(n => n.classList.toggle('apagado', !p.ligado));
    el.querySelectorAll('[data-no-depende] input, [data-no-depende] button').forEach(i => { i.disabled = !p.ligado; });
    el.querySelectorAll('[data-no-tema]').forEach(b => b.setAttribute('aria-pressed', b.dataset.noTema === p.tema));
  };
  el.addEventListener('change', e => {
    if (e.target.dataset.no) definir({ [e.target.dataset.no]: e.target.checked });
    if (e.target.name === 'no-onde') definir({ sempre: e.target.value === 'sempre' });
  });
  el.querySelector('[data-no-temas]').addEventListener('click', e => { const b = e.target.closest('[data-no-tema]'); if (b) definir({ tema: b.dataset.noTema, fundo: '' }); });
  nativo.notchTemas().then(temas => { el.querySelector('[data-no-temas]').innerHTML = temas.map(t => `<button type="button" class="chip" data-no-tema="${esc(t.id)}">${esc(t.nome)}</button>`).join(''); pintar(); });
  pintar();
}
