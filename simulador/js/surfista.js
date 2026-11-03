// O Surfista é a tela de erro do Oceano: aparece só em erro 404 e sem internet, sempre ativo.
// Fica fora da lista de mods e não muda com tema: as cores ficam presas aqui e no CSS dele.
import { Cart } from './lua.js';

const CORES_FIXAS = {
  paleta: ['#070b1f', '#0e1a3d', '#16306b', '#1f4f9e', '#2f7fd1', '#5bb6f0', '#a6e3ff', '#f4fbff', '#f3d49b', '#c98f5a', '#ff6f59', '#ffd166', '#3a2b52', '#8a5c9e', '#2e8b74', '#7fd6a8'],
  ui: { fundo: 0, painel: 1, elevado: 2, borda: 3, texto: 7, suave: 6, acento: 5, destaque: 10, sol: 11 },
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const htmlSurfista = ({ titulo, texto, acoes = '' }) => `<div class="surfista-cartao">
    <h1>${esc(titulo)}</h1>
    <p>${texto}</p>
    <div class="surfista-jogo" data-surfista-jogo></div>
    <p class="surfista-dica">Enquanto isso: espaço ou toque para pular. Pegue as conchas e desvie das pedras.</p>
    <div class="surfista-acoes">${acoes}</div>
  </div>`;

let codigo = null;
export function montarSurfista(raiz, host, { focar = true } = {}) {
  let cart = null, parado = false;
  (async () => {
    codigo ??= await (await fetch('erro/surfista.lua')).text();
    if (parado) return;
    const mod = { id: 'surfista', nome: 'Surfista', tipo: 'cartucho', lugar: 'erro', permissoes: ['tela', 'controles', 'som'], ligado: true, codigo };
    // é tela do sistema: se o jogo falhar, a mensagem de erro fica sozinha, sem aviso de mod
    const semJogo = () => { for (const n of raiz.querySelectorAll('[data-surfista-jogo], .surfista-dica')) n.hidden = true; };
    cart = new Cart(mod, { ...host, tema: () => CORES_FIXAS, aoFalhar: semJogo, aoLogar: () => {} }, { limiteMs: 250 });
    await cart.iniciar(codigo);
    if (parado) { cart.parar(); return; }
    raiz.querySelector('[data-surfista-jogo]')?.append(cart.canvas);
    if (focar) { Cart.foco = cart; cart.canvas.focus({ preventScroll: true }); }
    // fora da lista de mods, o laço principal não o enxerga: anda com o próprio relógio, só enquanto esta tela existir
    let antes = performance.now();
    const quadro = agora => { if (parado) return; cart.passo(Math.min(0.1, (agora - antes) / 1000), false); antes = agora; requestAnimationFrame(quadro); };
    requestAnimationFrame(quadro);
  })().catch(() => {});   // sem o jogo, a mensagem de erro continua na tela
  return {
    get cart() { return cart; },
    parar() {
      parado = true;
      if (cart) { if (Cart.foco === cart) Cart.foco = null; cart.parar(); cart.canvas?.remove(); }
    },
  };
}
