// O farol: uma luz laranja que mostra quanto os mods ligados estão gastando agora.
// Pouco uso pisca devagar, muito uso pisca rápido e, no limite, fica acesa. O número é a parte de um processador usada.

import { icone } from './icones.js';

const NIVEIS = [[0.05, 0, 'parado'], [2, 2.4, 'uso baixo'], [8, 1, 'uso médio'], [25, 0.35, 'uso alto']];
export function nivelDoFarol(pct) {
  for (const [ate, ritmo, nome] of NIVEIS) if (pct < ate) return { ritmo, nome, aceso: ritmo > 0 };
  return { ritmo: 0, nome: 'uso muito alto', aceso: true, fixo: true };
}
const pintar = (el, pct) => {
  const n = nivelDoFarol(pct);
  el.classList.toggle('apagado', !n.aceso);
  el.classList.toggle('fixo', !!n.fixo);
  el.style.setProperty('--ritmo', n.ritmo ? n.ritmo + 's' : '0s');
  el.dataset.nivel = n.nome;
};
const texto = pct => (pct < 10 ? pct.toFixed(1) : Math.round(pct)) + '%';

export const htmlFarolMod = id => `<span class="farol-mod apagado" data-farol-mod="${id}" title="Uso agora"><i aria-hidden="true"></i><b>0%</b></span>`;
// o painel da página de mods: o mesmo número e a mesma luz da barra, com a conta feita na frente da pessoa
export const htmlLegendaFarol = () => `<section class="farol-painel px" aria-labelledby="farol-titulo">
  <div class="farol-topo">
    <span class="farol-mod apagado" data-farol-total>${icone('farol')}<i aria-hidden="true"></i><b>0%</b></span>
    <div><h2 id="farol-titulo">O farol dos mods</h2><p class="farol-maior"><span data-farol-frase>Medindo…</span> <button type="button" class="btn mini secundario" data-farol-desativar hidden>Desativar</button></p></div>
  </div>
  <h3>De onde vem esse número</h3>
  <ol>
    <li>A cada segundo, o Oceano cronometra quanto tempo o código de cada mod ligado ficou rodando.</li>
    <li>Ele soma esses tempos e divide por 1 segundo (1.000 ms). Agora: <b data-farol-conta>0 ms ÷ 1.000 ms = 0%</b>.</li>
    <li>O resultado é a parte de <b>um núcleo</b> do processador usada pelos mods. Com 14%, por exemplo, um núcleo passa 140 ms de cada segundo cuidando deles.</li>
  </ol>
  <p class="nota">Seu computador tem vários núcleos, então 100% aqui não quer dizer que ele está no limite, mas pode deixar as animações do navegador mais lentas. A conta inclui só os mods: sites, vídeos e o mar ficam no raio ao lado do farol.</p>
  <p class="nota"><b>A luz:</b> apagada quando os mods estão parados, piscando devagar abaixo de 2%, mais rápido até 8%, bem rápido até 25% e acesa direto acima disso.</p>
</section>`;

export function iniciarFarol(app) {
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-farol-desativar]');
    const m = b && app.mods?.find(x => x.id === b.dataset.mod);
    if (m) await app.alternarMod(m, false);
  });
  const botao = document.createElement('button');
  botao.className = 'ico farol-chip apagado'; botao.id = 'btn-farol';
  botao.innerHTML = `${icone('farol')}<i aria-hidden="true"></i><b>0%</b>`;
  botao.title = 'Farol: quanto os mods estão usando. Clique para ver os mods';
  botao.setAttribute('aria-label', 'Farol dos mods');
  botao.onclick = () => app.navegar('oceano://mods');
  const consumo = document.querySelector('#btn-consumo');
  if (consumo) consumo.before(botao); else return;
  setInterval(() => {
    const por = app.medidor?.porSegundo?.() || {};
    let total = 0;
    for (const m of app.mods || []) {
      const pct = (por['mod:' + m.id] || 0) / 10;   // ms por segundo → %
      if (m.ligado && m.cart) total += pct;
      for (const el of document.querySelectorAll(`[data-farol-mod="${m.id}"]`)) { pintar(el, pct); el.querySelector('b').textContent = texto(pct); }
    }
    pintar(botao, total);
    botao.querySelector('b').textContent = texto(total);
    for (const el of document.querySelectorAll('[data-farol-total]')) {
      pintar(el, total); el.querySelector('b').textContent = texto(total);
      const painel = el.closest('.farol-painel'), ms = Math.round(total * 10);
      const maior = (app.mods || []).filter(m => m.ligado && m.cart).map(m => [m.nome, m.id, por['mod:' + m.id] || 0]).sort((a, b) => b[2] - a[2])[0];
      painel.querySelector('[data-farol-conta]').textContent = `${ms.toLocaleString('pt-BR')} ms ÷ 1.000 ms = ${texto(total)}`;
      painel.querySelector('[data-farol-frase]').textContent = maior?.[2] ? `Quem mais usa: ${maior[0]}` : 'Nenhum mod usando agora.';
      const bt = painel.querySelector('[data-farol-desativar]');
      bt.hidden = !maior?.[2]; bt.dataset.mod = maior?.[1] || '';
    }
  }, 1500);
}
