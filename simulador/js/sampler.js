// oceano://sampler — o 🤌 FM ½ sampler (www/half-sampler, half.social), copiado em /sampler por sampler/atualizar.py
// com a pele em pixel do Oceano (sampler/oceano-pixel.css) e a ponte (sampler/oceano-ponte.js: fundo com imagem ou
// vídeo recortado, motor local para YouTube e separação de instrumentos). Roda num iframe; ao sair, o som para junto.

import { srcFerramenta, sandboxFerramenta, origemFerramenta } from './quadros.js';
export const sampler = {
  titulo: () => '🤌 FM ½ sampler',
  icone: 'sampler',
  html: (r, app) => `${app.musica?.abas('sampler') || ''}<iframe class="sampler-quadro" src="${srcFerramenta(app, 'sampler')}" ${sandboxFerramenta(app)} title="FM ½ sampler"
    allow="autoplay; midi; microphone; camera; clipboard-write; display-capture; gamepad; fullscreen"></iframe>`,
  montar(el) {
    // o foco vai para o sampler, para as teclas tocarem os pads logo de cara
    const quadro = el.querySelector('iframe');
    quadro.addEventListener('load', () => quadro.contentWindow?.focus(), { once: true });
    return { desmontar: () => {} };
  },
};
