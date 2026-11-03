// oceano://ferramentas — 🧰 ferramentas de edição. Roda num quadro próprio, com o menu e a troca de telas lá dentro.
// Baixar e exportar vídeo usam um motor neste computador (só no app); o resto roda aqui mesmo.

import { srcFerramenta, sandboxFerramenta, origemFerramenta } from './quadros.js';
export const caixaFerramentas = {
  titulo: () => '🧰 Ferramentas',
  icone: 'ferramentas',
  html: (r, app) => `<iframe class="sampler-quadro" src="${srcFerramenta(app, 'ferramentas', app.idioma?.atual?.() === 'en' ? 'index.html?lang=en' : 'index.html')}" title="Ferramentas" allow="clipboard-write; fullscreen" ${sandboxFerramenta(app)}></iframe>`,
  montar: () => ({ desmontar: () => {} }),
};
