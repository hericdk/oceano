// A saudação sendo riscada em pixels grandes e retos: a linha cresce casa por casa, e some em trama.
// Começa em Olá, com mais tempo; escolher um idioma faz a palavra dele ser riscada na hora, e a fila segue dali.
import { SAUDACOES } from './ola-pixels.js';

const COLUNAS = 74, LINHAS = 20, RISCA = 2500, SOME = 200, TOTAL_OLA = 5000, TOTAL = 3000;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const suave = t => (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);   // a caneta acelera e freia
const expoOut = t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function escreverSaudacoes(canvas, aoTrocar) {
  canvas.width = COLUNAS; canvas.height = LINHAS;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff';
  let vivo = true, i = 0, inicio = performance.now(), raf = 0;

  // k: quanto da palavra já foi riscado; some: quanto dela já se desfez
  const pintar = (s, k, some = 0) => {
    const dx = Math.floor((COLUNAS - s.w) / 2), dy = Math.floor((LINHAS - s.h) / 2);
    const n = Math.round(k * s.p.length / 2);
    g.clearRect(0, 0, COLUNAS, LINHAS);
    for (let j = 0; j < n; j++) {
      const x = s.p[j * 2] + dx, y = s.p[j * 2 + 1] + dy;
      if ((BAYER[(y % 4) * 4 + (x % 4)] + .5) / 16 >= some) g.fillRect(x, y, 1, 1);
    }
  };
  const irPara = (n, agora = performance.now()) => { i = n; inicio = agora; g.clearRect(0, 0, COLUNAS, LINHAS); aoTrocar?.(SAUDACOES[i].id); };

  const quadro = agora => {
    if (!vivo) return;
    raf = requestAnimationFrame(quadro);
    const s = SAUDACOES[i], t = agora - inicio, total = s.id === 'pt' ? TOTAL_OLA : TOTAL;
    if (quieto()) {
      pintar(s, 1);
      if (t > total) irPara((i + 1) % SAUDACOES.length, agora);
    } else if (t < RISCA) pintar(s, suave(Math.max(0, t) / RISCA));
    else if (t < total - SOME) pintar(s, 1);
    else if (t < total) pintar(s, 1, expoOut((t - total + SOME) / SOME));
    else irPara((i + 1) % SAUDACOES.length, agora);
  };
  raf = requestAnimationFrame(quadro);
  const parar = () => { vivo = false; cancelAnimationFrame(raf); };
  parar.mostrar = id => { const n = SAUDACOES.findIndex(s => s.id === id); if (n >= 0) irPara(n); };
  return parar;
}
