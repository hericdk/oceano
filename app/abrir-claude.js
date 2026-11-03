// Abre o app do Claude quando a pessoa clica no cartão de pedido. O endereço é fixo: o pedido nunca vai nele,
// fica só na área de transferência. Sem o app instalado, a tela mostra só o botão de copiar.

const { app, ipcMain, shell } = require('electron');

const ENDERECO = 'claude://';

function registrar() {
  ipcMain.handle('claude:estado', () => ({ instalado: !!app.getApplicationNameForProtocol(ENDERECO) }));
  ipcMain.handle('claude:abrir', async () => {
    try { await shell.openExternal(ENDERECO); return { ok: true }; }
    catch { return { ok: false }; }
  });
}

module.exports = { registrar };
