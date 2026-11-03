// O widget de clima da página inicial: pequeno (o essencial) ou médio (o dia inteiro), com fundo normal ou transparente.
import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const graus = n => (Number.isFinite(n) ? `${Math.round(n)}°` : '—');

export function desenharWidgetClima(corpo, app, grande) {
  const c = app.clima?.config?.(), a = app.clima?.agora?.();
  corpo.classList.toggle('clima-medio', grande);
  if (!c?.real || !c.cidade) {
    corpo.innerHTML = `<div class="jcl-vazio"><p>Escolha a sua cidade para ver o clima.</p><a href="#" class="btn mini" data-ir="oceano://configuracoes">Configurações</a></div>`;
    return;
  }
  if (!a) { corpo.innerHTML = `<p class="jcl-vazio" data-sensivel>${esc(c.cidade)}</p>`; return; }
  const topo = `<div class="jcl-topo">${icone(a.icone, 'jcl-icone')}<b>${graus(a.temperatura)}</b></div><p class="jcl-cidade" data-sensivel>${esc(c.cidade)}</p>`;
  corpo.innerHTML = grande
    ? `${topo}<p class="jcl-ceu">${esc(a.ceu)}</p>
       <dl class="jcl-dados">
         <div><dt>Sensação</dt><dd>${graus(a.sensacao)}</dd></div>
         <div><dt>Máx. / mín.</dt><dd>${graus(a.maxima)} / ${graus(a.minima)}</dd></div>
         <div><dt>Umidade</dt><dd>${Number.isFinite(a.umidade) ? Math.round(a.umidade) + '%' : '—'}</dd></div>
         <div><dt>Vento</dt><dd>${Number.isFinite(a.vento) ? Math.round(a.vento) + ' km/h' : '—'}</dd></div>
         <div><dt>Chuva hoje</dt><dd>${Number.isFinite(a.chanceChuva) ? Math.round(a.chanceChuva) + '%' : '—'}</dd></div>
       </dl>`
    : topo;
}
