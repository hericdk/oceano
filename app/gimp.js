// oceano://gimp no app: abre o GIMP (programa à parte, em janela própria), baixa o instalador oficial quando a pessoa
// pede e aplica ou desfaz o PhotoGIMP. O instalador abre para a pessoa terminar: o Oceano não instala nada sozinho.

const { app, ipcMain, shell } = require('electron');
const { execFileSync, spawn } = require('child_process');
const os = require('os');
const path = require('path');
const n = require('./gimp-nucleo');

const opcoes = () => ({
  home: os.homedir(),
  noPath: nome => { try { return execFileSync('which', [nome], { encoding: 'utf8', timeout: 3000 }).trim() || null; } catch { return null; } },
});
const gimpAberto = () => {
  try {
    if (process.platform === 'win32') return /gimp-3/i.test(execFileSync('tasklist', ['/FI', 'IMAGENAME eq gimp-3*'], { encoding: 'utf8', timeout: 4000 }));
    execFileSync('pgrep', ['-ix', 'gimp(-3.*)?'], { stdio: 'ignore', timeout: 3000 });
    return true;
  } catch { return false; }
};

function estado() {
  const g = n.acharGimp(opcoes()), config = n.pastaConfig(opcoes());
  return { plataforma: process.platform, instalado: !!g, versao: g?.versao || null, aberto: !!g && gimpAberto(), podePhotoGimp: !!config, photogimp: n.estadoPhotoGimp(config), versaoPhotoGimp: n.PHOTOGIMP.versao };
}

function registrar(registrarPropria) {
  let baixando = false;
  ipcMain.handle('gimp:estado', () => estado());
  ipcMain.handle('gimp:abrir', async () => {
    const g = n.acharGimp(opcoes());
    if (!g) return { ok: false, erro: 'O GIMP não está instalado.' };
    if (g.flatpak) { spawn('flatpak', ['run', g.flatpak], { detached: true, stdio: 'ignore' }).unref(); return { ok: true }; }
    if (process.platform === 'linux') { spawn(g.app, [], { detached: true, stdio: 'ignore' }).unref(); return { ok: true }; }
    const erro = await shell.openPath(g.app);
    return erro ? { ok: false, erro } : { ok: true };
  });
  ipcMain.handle('gimp:baixar', async e => {
    if (baixando) return { ok: false, erro: 'O download já está em andamento.' };
    baixando = true;
    try {
      registrarPropria(n.VERSOES, 'GIMP: ver a versão atual (você pediu)', 'nada (só download)');
      const r = await fetch(n.VERSOES, { signal: AbortSignal.timeout(20000) });
      const inst = n.escolherInstalador(await r.json());
      if (!inst) return { ok: false, erro: 'Não achei um instalador oficial para este computador.' };
      registrarPropria(inst.url, 'GIMP: baixar o instalador oficial (você pediu)', 'nada (só download)');
      const destino = await n.baixarConferido(inst, path.join(app.getPath('userData'), 'gimp', inst.arquivo), (feito, total) => { if (!e.sender.isDestroyed()) e.sender.send('gimp:progresso', { feito, total }); });
      const erro = await shell.openPath(destino);
      return erro ? { ok: false, erro } : { ok: true, versao: inst.versao };
    } catch (err) { return { ok: false, erro: err.message }; } finally { baixando = false; }
  });
  ipcMain.handle('gimp:photogimp', async () => {
    if (gimpAberto()) return { ok: false, erro: 'Feche o GIMP antes: ele regrava a configuração ao sair.' };
    const config = n.pastaConfig(opcoes());
    if (!config) return { ok: false, erro: 'Neste sistema o PhotoGIMP tem instalador próprio.' };
    try {
      registrarPropria(n.PHOTOGIMP.url, 'PhotoGIMP: baixar o pacote (você pediu)', 'nada (só download)');
      const r = await fetch(n.PHOTOGIMP.url, { signal: AbortSignal.timeout(60000) });
      if (!r.ok) return { ok: false, erro: `O GitHub respondeu ${r.status}.` };
      n.aplicarPhotoGimp(config, Buffer.from(await r.arrayBuffer()));
      return { ok: true };
    } catch (err) { return { ok: false, erro: err.message }; }
  });
  ipcMain.handle('gimp:desfazer', () => {
    if (gimpAberto()) return { ok: false, erro: 'Feche o GIMP antes: ele regrava a configuração ao sair.' };
    try { n.desfazerPhotoGimp(n.pastaConfig(opcoes())); return { ok: true }; } catch (err) { return { ok: false, erro: err.message }; }
  });
}

module.exports = { registrar };
