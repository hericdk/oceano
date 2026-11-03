// oceano://robo — 🤖 simulador de robótica. Roda num quadro próprio; o código vem de simulador/robo (gerado por robo-sim/empacotar.py).
// O design dele é o padrão. As cores do tema só entram se a pessoa ligar em Configurações → Aparência ("robo-tema").
// A Navegadora pode conversar com ele pela ponte (postMessage, ver robo/ponte-oceano.js).

import { srcFerramenta, sandboxFerramenta, origemFerramenta } from './quadros.js';
const TOKENS = ['fundo', 'painel', 'elevado', 'borda', 'texto', 'suave', 'acento', 'destaque'];

// pedido ao simulador aberto; sem ele aberto, responde null
const esperando = new Map();
let seq = 0;
addEventListener('message', e => { if (e.data?.robo === 'resposta' && esperando.has(e.data.id)) { esperando.get(e.data.id)(e.data); esperando.delete(e.data.id); } });
export function pedirRobo(cmd, args) {
  const quadro = document.querySelector('iframe[data-robo]');
  if (!quadro?.contentWindow) return Promise.resolve(null);
  const id = 'c' + ++seq;
  return new Promise(ok => {
    esperando.set(id, r => ok(r.ok ? r.valor : null));
    quadro.contentWindow.postMessage({ robo: 'pedido', id, cmd, args }, new URL(quadro.src, location.href).origin);
    setTimeout(() => { if (esperando.delete(id)) ok(null); }, 1500);
  });
}

// igual a pedirRobo, mas devolve o motivo quando o simulador recusa, e dá mais tempo: ler um modelo grande demora
export function pedirRoboComErro(cmd, args, tempo = 15000) {
  const quadro = document.querySelector('iframe[data-robo]');
  if (!quadro?.contentWindow) return Promise.resolve({ erro: 'abra o simulador em oceano://robo primeiro' });
  const id = 'c' + ++seq;
  return new Promise(ok => {
    esperando.set(id, r => ok(r.ok ? { valor: r.valor } : { erro: r.erro || 'recusado' }));
    quadro.contentWindow.postMessage({ robo: 'pedido', id, cmd, args }, new URL(quadro.src, location.href).origin);
    setTimeout(() => { if (esperando.delete(id)) ok({ erro: 'o simulador não respondeu' }); }, tempo);
  });
}

export const roboSim = {
  titulo: () => '🤖 Robôs [beta]',
  icone: 'robo',
  html: (r, app) => `<iframe class="sampler-quadro" data-robo src="${srcFerramenta(app, 'robo')}" title="Simulador de robótica" allow="fullscreen; display-capture" ${sandboxFerramenta(app)}></iframe>`,
  montar(el, r, app) {
    const quadro = el.querySelector('iframe');
    const enviar = () => {
      const css = getComputedStyle(document.documentElement), cores = {};
      for (const t of TOKENS) cores[t] = css.getPropertyValue('--' + t).trim();
      quadro?.contentWindow?.postMessage({ robo: 'tema', ligado: !!app.guardado.ler('robo-tema', false), cores }, origemFerramenta(app, 'robo'));
    };
    const aoMensagem = (e) => { if (e.source === quadro?.contentWindow && e.data?.robo === 'pronto') enviar(); };
    addEventListener('message', aoMensagem);
    // trocar de tema com o simulador aberto
    const obs = new MutationObserver(enviar);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-tema'] });
    return { desmontar: () => { removeEventListener('message', aoMensagem); obs.disconnect(); } };
  },
};
