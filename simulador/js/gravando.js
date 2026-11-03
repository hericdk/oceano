// O aviso de que um site está usando a câmera ou o microfone: sempre visível na barra e na aba. Clicar abre a aba que está gravando.
import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const frase = g => (g.camera && g.microfone ? 'câmera e microfone' : g.camera ? 'câmera' : 'microfone');

export function iniciarGravando(app, nativo, { renderizarAbas, ativarAba }) {
  const b = document.getElementById('btn-gravando');
  if (!b || !nativo?.aoGravacao) return { naAba: () => '' };
  let lista = [];
  const abaDe = g => app.abas.find(a => { try { return (a.wcId ?? a.wv?.getWebContentsId()) === g.wcId; } catch { return false; } });
  const pintar = () => {
    b.hidden = !lista.length;
    if (lista.length) {
      const camera = lista.some(g => g.camera), microfone = lista.some(g => g.microfone), g = lista[0];
      b.innerHTML = `${camera ? icone('camera') : ''}${microfone ? icone('microfone') : ''}${lista.length > 1 ? `<b>${lista.length}</b>` : ''}`;
      const texto = lista.length > 1 ? `${lista.length} sites estão gravando. Abrir a aba` : `${g.origem || 'Este site'} está usando ${frase(g)}. Abrir a aba`;
      b.title = texto; b.setAttribute('aria-label', texto);
    }
    renderizarAbas();
  };
  nativo.aoGravacao(novos => { lista = novos; pintar(); });
  nativo.gravacaoEstado().then(novos => { lista = novos; pintar(); });
  b.addEventListener('click', () => {
    const abas = lista.map(abaDe).filter(Boolean);
    if (!abas.length) return;
    ativarAba(abas[(abas.indexOf(app.abaAtiva) + 1) % abas.length]);
  });
  return {
    naAba(a) {
      const g = lista.find(x => abaDe(x) === a);
      return g ? `<span class="aba-gravando" title="${esc(`Usando ${frase(g)}`)}">${icone(g.camera ? 'camera' : 'microfone')}</span>` : '';
    },
  };
}
