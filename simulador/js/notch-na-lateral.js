// A barra lateral mostra a mesma janela do notch, o próprio notch.html. Aqui fica a ponte: o que no notch vai pela janela dele,
// aqui passa pelo painel da Navegadora, que continua montado por baixo e cuida das ferramentas, das permissões e das respostas sem IA.
export function montarNotchNaLateral(app, nativo) {
  const lateral = document.querySelector('#lateral');
  const aoAbrir = [];
  const reabrir = () => aoAbrir.forEach(fn => fn(true));
  window.notchNaLateral = {
    semIa: true,
    temDev: !!lateral.querySelector('[data-lateral="dev"]'),
    abrirDev: () => app.abaLateral('dev'),
    aoConfig() {},
    aoAbrir(fn) { aoAbrir.push(fn); setTimeout(() => fn(true)); },
    aoSolto() {},
    aoTema(fn) { setTimeout(() => fn(null)); },
    abrirOceano(url) { if (url === 'oceano://ia') app.iaConectarAgora = true; app.navegar(url); },
    fechar: () => app.mostrarLateral(false),
    agentesListar: () => nativo.agentesListar(),
    conversaTranscrever: (dados, tipo) => nativo.conversaTranscrever(dados, tipo),
    transcricaoEstado: () => nativo.transcricaoEstado(),
    transcricaoBaixar: () => nativo.transcricaoBaixar(),
    transcricaoTranscrever: (dados, lingua) => nativo.transcricaoTranscrever(dados, lingua),
    aoTranscricaoProgresso: fn => nativo.aoTranscricaoProgresso(fn),
    conversaModo: () => nativo.conversaModo(),
    conversaLista: () => nativo.conversaLista(),
    conversaEnviar: async (id, texto, nome, imagens) => (await app.carregarPainel('assistente')).enviarDaLateral(id, texto, nome, imagens),
    aoPedaco: fn => nativo.aoConversaPedaco(fn),
  };
  app.on('ia-mudou', reabrir);
  nativo.aoAgentesMudou?.(reabrir);
  const quadro = document.createElement('iframe');
  quadro.className = 'lateral-notch';
  quadro.title = 'Navegadora';
  quadro.src = 'notch.html?lateral';
  quadro.allow = 'microphone';
  quadro.addEventListener('load', () => app.idioma?.vigiar?.(quadro.contentDocument));
  lateral.append(quadro);
  lateral.classList.add('com-notch');
  app.assistente?.silenciar?.();
  return quadro;
}
