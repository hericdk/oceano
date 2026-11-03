// Liga o motor local (só no app) e aplica o tema do navegador antes das ferramentas carregarem.
(() => {
  const CORES = { '--bg': 'fundo', '--surface': 'painel', '--surface-2': 'elevado', '--surface-3': 'elevado', '--line': 'borda', '--line-2': 'borda', '--text': 'texto', '--muted': 'suave', '--faint': 'suave', '--brand': 'acento' };
  const aplicar = () => {
    let ui = null;
    try { ui = JSON.parse(localStorage.getItem('oceano:tema-ui')); } catch {}
    if (!ui) return;
    for (const [v, k] of Object.entries(CORES)) if (ui[k]) document.documentElement.style.setProperty(v, ui[k]);
  };
  aplicar();
  addEventListener('storage', e => { if (e.key === 'oceano:tema-ui') aplicar(); });
  addEventListener('oceano-tema', aplicar);
  // sem o app, as ferramentas de vídeo e o Baixar avisam que precisam dele
  window.MOTOR = 'sem-motor?api=';
  const carregar = src => new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = erro; document.body.append(s); });
  (async () => {
    try {
      const m = await window.oceanoPonte?.pedir('motor');
      if (m?.base) window.MOTOR = m.base + '?api=';
    } catch {}
    await carregar('ferramentas-texto.js');
    await carregar('selecao.js');
    await carregar('vitrine.js');
    await carregar('ferramentas-midia.js');
    await carregar('ferramentas-oceano.js');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
  })();
})();
