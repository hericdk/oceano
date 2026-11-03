// Dados sensíveis na tela (endereços locais, sites que você visitou, regras de proxy…) aparecem escondidos:
// um cadeado e um bloco pixelizado da cor do texto por cima. Assim, quem grava ou transmite a tela não expõe
// nada sem querer. Clicando num bloco, um aviso pede confirmação; confirmado, todos os blocos da sessão
// ficam sólidos e o dado aparece na cor oposta. Clicar de novo esconde tudo. Nada disso fica guardado:
// ao abrir o Oceano de novo, tudo começa escondido.

import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const raiz = document.documentElement;
const visivel = () => raiz.dataset.svEstado === 'visivel';

// HTML de um dado sensível (texto puro; ele é escapado aqui)
export function sensivel(texto, rotulo = 'informação local') {
  return `<span class="sensivel" data-sensivel role="button" tabindex="0" aria-label="${esc(rotulo)} escondida: ative para mostrar">`
    + `${icone('cadeado')}<span class="sv-dado" aria-hidden="${!visivel()}">${esc(texto)}</span></span>`;
}

function atualizarRotulos() {
  for (const el of document.querySelectorAll('[data-sensivel]')) {
    el.querySelector('.sv-dado')?.setAttribute('aria-hidden', String(!visivel()));
  }
}

function confirmar(app) {
  return new Promise(pronto => {
    document.querySelector('.sv-aviso')?.remove();
    const el = document.createElement('section');
    el.className = 'janela sv-aviso';
    el.dataset.dither = '0';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', 'Mostrar informação local');
    el.innerHTML = `
      <header class="jan-topo"><span class="jan-titulo">${icone('cadeado')}<span>Informação local</span></span></header>
      <div class="jan-corpo">
        <p>Isto é uma informação deste computador e faz parte dos seus dados de segurança.</p>
        <p class="nota-mesa">Se você estiver gravando ou transmitindo a tela, ela vai aparecer no vídeo.</p>
        <div class="sv-botoes"><button class="btn mini" data-sv="sim">mostrar</button><button class="btn mini secundario" data-sv="nao">manter escondido</button></div>
      </div>`;
    document.body.append(el);
    el.querySelector('[data-sv="nao"]').focus();
    const fim = v => { el.remove(); pronto(v); };
    el.addEventListener('click', e => { const b = e.target.closest('[data-sv]'); if (b) fim(b.dataset.sv === 'sim'); });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') fim(false); });
  });
}

export function iniciarSensivel(app) {
  raiz.dataset.svEstado = 'escondido';
  const alternar = async () => {
    if (visivel()) { raiz.dataset.svEstado = 'escondido'; atualizarRotulos(); app.aviso('Informações locais escondidas de novo.', 'Segurança'); return; }
    if (await confirmar(app)) { raiz.dataset.svEstado = 'visivel'; atualizarRotulos(); }
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-sensivel]')) { e.preventDefault(); alternar(); } });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('[data-sensivel]')) { e.preventDefault(); alternar(); } });
  app.sensivel = { html: sensivel, visivel, esconder: () => { raiz.dataset.svEstado = 'escondido'; atualizarRotulos(); } };
}
