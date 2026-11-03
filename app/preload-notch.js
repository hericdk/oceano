// Ponte mínima do notch: conversar com a Navegadora, ver os agentes e abrir o Oceano. Nada de chaves nem de Node.
const { contextBridge, ipcRenderer } = require('electron');
const ouvir = canal => fn => ipcRenderer.on(canal, (_, ...d) => fn(...d));
contextBridge.exposeInMainWorld('notch', {
  aoConfig: ouvir('notch:config'),
  aoAbrir: ouvir('notch:abrir'),
  aoTema: ouvir('notch:tema'),
  aoSolto: ouvir('notch:solto'),
  abrirOceano: url => ipcRenderer.send('notch:abrir-oceano', url),
  soltar: () => ipcRenderer.send('notch:soltar'),
  tamanho: passo => ipcRenderer.send('notch:tamanho', passo),
  minimizar: () => ipcRenderer.send('notch:minimizar'),
  fechar: () => ipcRenderer.send('notch:fechar'),
  agentesListar: () => ipcRenderer.invoke('agentes:listar'),
  aoAgentesMudou: ouvir('agentes:mudou'),
  conversaTranscrever: (dados, tipo) => ipcRenderer.invoke('conversa:transcrever', dados, tipo),
  transcricaoEstado: () => ipcRenderer.invoke('transcricao:estado'),
  transcricaoBaixar: () => ipcRenderer.invoke('transcricao:baixar'),
  transcricaoTranscrever: (dados, lingua) => ipcRenderer.invoke('transcricao:transcrever', dados, lingua),
  aoTranscricaoProgresso: ouvir('transcricao:progresso'),
  conversaModo: () => ipcRenderer.invoke('conversa:modo'),
  conversaLista: () => ipcRenderer.invoke('conversa:lista'),
  conversaEnviar: (id, texto, nome, imagens) => ipcRenderer.invoke('conversa:enviar', id, texto, [], nome, imagens),
  aoPedaco: ouvir('conversa:pedaco'),
});
// a mesma voz neural do navegador, gerada neste computador
contextBridge.exposeInMainWorld('oceanoNativo', {
  vozEstado: () => ipcRenderer.invoke('voz:estado'),
  vozBaixar: () => ipcRenderer.invoke('voz:baixar'),
  vozApagar: () => ipcRenderer.invoke('voz:apagar'),
  vozSintetizar: (...a) => ipcRenderer.invoke('voz:sintetizar', ...a),
  aoVozProgresso: ouvir('voz:progresso'),
});
