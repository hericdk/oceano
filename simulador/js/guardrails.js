// O campo Guardrail das Configurações. A tela só mostra e pede: quem aplica os limites é o processo principal (app/guardrails.js).
import { icone } from './icones.js';

const FIXOS_SIMULADOR = ['modificar arquivos', 'esconder gravação de câmera ou microfone'];
const PADRAO = ['política'];
const PIXEL = 4;
const ESC = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const expoOut = t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const htmlGuardrails = () => `
  <section class="px bloco" id="guardrail">
    <h2>Guardrail</h2>
    <div class="cfg-linha cfg-guardrail"><span><b>Limites da IA</b><small>assuntos e ações que a IA não pode fazer nem comentar. Escreva e aperte Enter</small></span>
      <div class="gr-campo">
        <ul class="gr-tags" data-gr-tags></ul>
        <input type="text" data-gr-novo maxlength="60" placeholder="escreva um assunto ou ação" aria-label="Limites da IA" autocomplete="off">
      </div></div>
  </section>`;

// a etiqueta vira pixels da cor que está na tela: os do meio levam a cor do texto, para o nome se desfazer junto
function explodir(tag) {
  const r = tag.getBoundingClientRect(), css = getComputedStyle(tag);
  const folga = 150, c = document.createElement('canvas');
  c.className = 'gr-explosao';
  c.width = r.width + folga * 2; c.height = r.height + folga * 2;
  c.style.left = `${r.left - folga}px`; c.style.top = `${r.top - folga}px`;
  document.body.append(c);
  const g = c.getContext('2d'), cx = r.width / 2, cy = r.height / 2, pixels = [];
  for (let y = 0; y < r.height; y += PIXEL) for (let x = 0; x < r.width; x += PIXEL) {
    const ang = Math.atan2(y - cy, x - cx) + (Math.random() - .5) * .9, forca = 40 + Math.random() * 110;
    pixels.push({ x, y, dx: Math.cos(ang) * forca, dy: Math.sin(ang) * forca * .8, vida: .45 + Math.random() * .55, cor: Math.random() < .2 ? css.color : css.backgroundColor });
  }
  const inicio = performance.now(), TOTAL = 720;
  const quadro = agora => {
    const t = Math.min(1, (agora - inicio) / TOTAL), k = expoOut(t);
    g.clearRect(0, 0, c.width, c.height);
    for (const p of pixels) {
      if (t > p.vida) continue;
      g.fillStyle = p.cor;
      g.fillRect(Math.round((folga + p.x + p.dx * k) / PIXEL) * PIXEL, Math.round((folga + p.y + p.dy * k + 70 * t * t) / PIXEL) * PIXEL, PIXEL, PIXEL);
    }
    if (t < 1) requestAnimationFrame(quadro); else c.remove();
  };
  requestAnimationFrame(quadro);
}

export function ligarGuardrails(el, app) {
  const lista = el.querySelector('[data-gr-tags]'), campo = el.querySelector('[data-gr-novo]');
  if (!lista || !campo) return;
  const nativo = app.real ? window.oceanoNativo : null;
  let fixos = FIXOS_SIMULADOR, temas = app.guardado.ler('guardrails', PADRAO);
  const guardar = () => { if (nativo) nativo.guardrailsGravar(temas); else app.guardado.gravar('guardrails', temas); };
  const pintar = () => {
    lista.innerHTML = fixos.map(t => `<li class="gr-tag fixa" title="Regra fixa: não pode ser retirada"><span>${ESC(t)}</span><i class="gr-trava">${icone('cadeado')}</i></li>`).join('')
      + temas.map(t => `<li class="gr-tag" data-gr-tema="${ESC(t)}"><span>${ESC(t)}</span><button type="button" class="gr-x" aria-label="apagar ${ESC(t)}">${icone('fechar')}</button></li>`).join('');
  };
  pintar();
  nativo?.guardrailsLer().then(d => { fixos = d.fixos; temas = d.temas; pintar(); });

  const piscar = tag => { tag.classList.remove('repetida'); void tag.offsetWidth; tag.classList.add('repetida'); };
  campo.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    const t = campo.value.replace(/[\u0000-\u001f\u007f<>`]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return;
    const igual = s => s.toLowerCase() === t.toLowerCase();
    const repetida = [...lista.children].find(li => igual(li.dataset.grTema ?? li.textContent.trim()));
    campo.value = '';
    if (repetida || fixos.some(igual)) { if (repetida) piscar(repetida); return; }
    temas = [...temas, t];
    guardar(); pintar();
    lista.lastElementChild.classList.add('nova');
  });
  lista.addEventListener('click', e => {
    const tag = e.target.closest('.gr-x')?.closest('.gr-tag');
    if (!tag || tag.classList.contains('saindo')) return;
    temas = temas.filter(t => t !== tag.dataset.grTema);
    guardar();
    if (quieto()) return tag.remove();
    explodir(tag);
    // o lugar dela fecha com expo-out
    tag.style.width = `${tag.offsetWidth}px`;
    tag.classList.add('saindo');
    void tag.offsetWidth;
    tag.style.width = '0';
    setTimeout(() => tag.remove(), 340);
  });
}
