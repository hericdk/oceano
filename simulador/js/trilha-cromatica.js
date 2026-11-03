// A escala cromática da música: 6 cores que são a própria música. Passar o mouse enche a caixa, segurar faz as cores correrem
// e soltar copia: elas freiam até o lugar de sempre, e o texto avisa, com o colorido ainda em volta.
const expoOut = t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const VOLTAS_POR_SEGUNDO = 2.6, FREIO = 1100, AVISO = 1600;

export function ligarCromatica(botao, { texto }) {
  const fila = botao.querySelector('.tr-tiras-fila'), rotulo = botao.querySelector('.tr-cro-texto span');
  const ORIGINAL = rotulo.textContent;
  let pos = 0, raf = 0, ultimo = 0, soltarAviso = 0, segurando = false;

  const pintar = cores => { fila.innerHTML = [...cores, ...cores].map(c => `<i style="background:${c}"></i>`).join(''); botao.title = cores.join(' '); botao.setAttribute('aria-label', `${ORIGINAL}: ${cores.join(' ')}`); };
  const mover = () => { fila.style.transform = `translateX(${-(pos % 1) * 50}%)`; };

  const correr = agora => {
    pos += VOLTAS_POR_SEGUNDO * (agora - ultimo) / 1000; ultimo = agora; mover();
    raf = requestAnimationFrame(correr);
  };
  const frear = () => {
    cancelAnimationFrame(raf);
    // a distância que combina com a velocidade de agora, sempre terminando numa volta inteira: as cores param onde começaram
    const de = pos, para = Math.ceil(de + VOLTAS_POR_SEGUNDO * FREIO / 1000 / 7), t0 = performance.now();
    const passo = agora => {
      const t = Math.min(1, (agora - t0) / FREIO);
      pos = de + (para - de) * expoOut(t); mover();
      if (t < 1) raf = requestAnimationFrame(passo); else { pos = 0; mover(); }
    };
    raf = requestAnimationFrame(passo);
    botao.classList.remove('girando');
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto()); }
    catch { const a = document.createElement('textarea'); a.value = texto(); document.body.append(a); a.select(); document.execCommand('copy'); a.remove(); }
    rotulo.textContent = 'copiado';
    botao.classList.add('copiado');
    clearTimeout(soltarAviso);
    soltarAviso = setTimeout(() => { botao.classList.remove('copiado'); rotulo.textContent = ORIGINAL; }, AVISO);
  };
  botao.addEventListener('pointerdown', e => {
    if (e.button) return;
    segurando = true; botao.setPointerCapture?.(e.pointerId);
    if (quieto()) return;
    cancelAnimationFrame(raf); botao.classList.add('girando');
    ultimo = performance.now(); raf = requestAnimationFrame(correr);
  });
  const soltar = copia => { if (!segurando) return; segurando = false; if (!quieto()) frear(); if (copia) copiar(); };
  botao.addEventListener('pointerup', () => soltar(true));
  botao.addEventListener('pointercancel', () => soltar(false));
  // Enter e espaço chegam como clique sem ponteiro
  botao.addEventListener('click', e => { if (e.detail === 0) copiar(); });
  return { pintar };
}
