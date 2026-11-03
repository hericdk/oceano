// Controle da hora da cena do mar: seguir o tema, seguir o relógio ou escolher no slider.
// O mesmo controle aparece no chip de sol da página inicial, em Configurações e na página de temas.

const MODOS = [['tema', 'do tema'], ['relogio', 'relógio'], ['fixa', 'escolher']];

const horaReal = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };

export function htmlHora(app) {
  const c = app.horaCena(), h = app.mar.hora();
  return `<div class="hora-cena" data-hora-cena>
    <span class="cfg-opcoes" role="group" aria-label="Hora da cena">${MODOS.map(([v, n]) => `<button class="chip" data-hc-modo="${v}" aria-pressed="${c.modo === v}">${n}</button>`).join('')}</span>
    <label class="hc-slider"><input type="range" min="0" max="24" step="0.25" value="${h}" data-hc-hora aria-label="Hora da cena"><output data-hc-txt>${app.textoHora(h)}</output></label>
    <p class="nota hc-agora"><span>Mundo real</span> <b data-hc-real>${app.textoHora(horaReal())}</b> · <span>no Oceano</span> <b data-hc-oceano>${app.textoHora(h)}</b></p>
  </div>`;
}

// liga os controles dentro de `el`; devolve a função que desliga
export function ligarHora(el, app) {
  const caixa = el.querySelector('[data-hora-cena]');
  if (!caixa) return () => {};
  const slider = caixa.querySelector('[data-hc-hora]'), txt = caixa.querySelector('[data-hc-txt]');
  const atualizar = () => {
    const c = app.horaCena(), h = app.mar.hora();
    caixa.querySelectorAll('[data-hc-modo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.hcModo === c.modo));
    if (document.activeElement !== slider) slider.value = h;
    txt.textContent = app.textoHora(h);
    caixa.querySelector('[data-hc-real]').textContent = app.textoHora(horaReal());
    caixa.querySelector('[data-hc-oceano]').textContent = app.textoHora(h);
  };
  caixa.addEventListener('click', e => {
    const b = e.target.closest('[data-hc-modo]'); if (!b) return;
    app.definirHoraCena({ modo: b.dataset.hcModo, hora: +slider.value });
  });
  // mexer no slider já passa para "escolher"
  slider.addEventListener('input', () => app.definirHoraCena({ modo: 'fixa', hora: +slider.value }));
  const tirar = app.on('hora-cena', atualizar);
  const timer = setInterval(atualizar, 30000);   // no modo relógio, o ponteiro anda
  return () => { tirar?.(); clearInterval(timer); };
}
