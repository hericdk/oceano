// oceano://retoque — editor de imagem em camadas, feito em HTML5. Roda num quadro próprio, em origem própria; o código fica em simulador/retoque.
import { srcFerramenta, sandboxFerramenta } from './quadros.js';

export const retoque = {
  titulo: () => 'RetoqueShop 1.0',
  icone: 'retoque',
  html: (r, app) => `<iframe class="sampler-quadro" src="${srcFerramenta(app, 'retoque')}" title="RetoqueShop 1.0" allow="clipboard-read; clipboard-write; fullscreen" ${sandboxFerramenta(app)}></iframe>`,
};
