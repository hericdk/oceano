// Acompanha os downloads dos sites. A janela de salvar continua a do sistema: a pessoa escolhe a pasta.
// A lista fica só na memória; nada é gravado sobre o que foi baixado.

const { ipcMain, shell } = require('electron');

const itens = new Map();
let proximo = 1, enviar = () => {};
const resumo = ({ id, nome, estado, recebido, total, arriscado }) => ({ id, nome, estado, recebido, total, arriscado });
// tipos que rodam programas: o arquivo baixa, mas o Oceano avisa e nunca abre sozinho
const ARRISCADOS = /\.(exe|msi|bat|cmd|com|scr|ps1|vbs|jar|dmg|pkg|app|command|sh|deb|rpm|appimage|terminal|scpt|applescript|workflow|mpkg|hta|lnk|reg|desktop|wsf|msp|cpl|tool)$/i;

function acompanhar(item) {
  const d = { id: proximo++, item, nome: item.getFilename(), estado: 'baixando', recebido: 0, total: item.getTotalBytes(), caminho: '', arriscado: ARRISCADOS.test(item.getFilename()) };
  itens.set(d.id, d);
  enviar('download', { ...resumo(d), novo: true });
  item.on('updated', (_e, estado) => {
    d.estado = estado === 'progressing' ? (item.isPaused() ? 'pausado' : 'baixando') : estado;
    d.recebido = item.getReceivedBytes(); d.total = item.getTotalBytes(); d.nome = item.getFilename(); d.caminho = item.getSavePath();
    enviar('download', resumo(d));
  });
  item.once('done', (_e, estado) => {
    d.estado = estado; d.recebido = item.getReceivedBytes(); d.caminho = item.getSavePath(); d.item = null;
    enviar('download', { ...resumo(d), fim: true });
  });
}

function registrar(enviarParaTela) {
  enviar = enviarParaTela;
  ipcMain.handle('downloads:lista', () => [...itens.values()].reverse().map(resumo));
  ipcMain.handle('downloads:cancelar', (_e, id) => { itens.get(id)?.item?.cancel(); return true; });
  ipcMain.handle('downloads:mostrar', (_e, id) => { const d = itens.get(id); if (d?.caminho) shell.showItemInFolder(d.caminho); return true; });
}

module.exports = { registrar, acompanhar };
