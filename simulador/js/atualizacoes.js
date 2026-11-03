// O botão de versão nova na barra: aparece só quando há o que atualizar, e cada passo depende de um clique.
export function ligarAtualizacoes(app) {
  const nativo = window.oceanoNativo, botao = document.querySelector('[data-atualizar]');
  if (!nativo?.atualizacaoEstado || !botao) return;
  let avisado = null;
  const pintar = e => {
    const fases = {
      disponivel: `Atualizar para ${e.nova}`,
      baixando: `Baixando ${e.progresso}%`,
      pronta: 'Reiniciar e atualizar',
    };
    botao.hidden = !fases[e.fase];
    botao.textContent = fases[e.fase] || '';
    botao.disabled = e.fase === 'baixando';
    if (e.fase === 'disponivel' && avisado !== e.nova) { avisado = e.nova; app.aviso?.(`Saiu a versão ${e.nova} do Oceano.`, 'Atualização'); }
  };
  nativo.atualizacaoEstado().then(pintar);
  nativo.aoAtualizacaoEstado(pintar);
  botao.addEventListener('click', async () => {
    const e = await nativo.atualizacaoEstado();
    if (e.fase === 'pronta') nativo.atualizacaoInstalar(); else nativo.atualizacaoAtualizar();
  });
}
