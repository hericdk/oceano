// Baú de senhas: onde o baú cifrado fica guardado (a cifra é feita na tela, com a senha-mestra; aqui só passa
// texto cifrado). Dois lugares, à escolha da pessoa:
//  - "oceano": um arquivo em userData/bau.json que só o seu usuário do computador lê;
//  - "sistema" (recomendado): no guarda-senhas do próprio sistema, fora do navegador —
//      macOS: Senhas do macOS (Keychain), item "Oceano · Baú de senhas" (protegido pela senha do Mac / Touch ID);
//      Windows: cifrado com a proteção de dados da sua conta do Windows (DPAPI);
//      Linux: chaveiro do sistema (Secret Service: GNOME Keyring, KWallet) pelo secret-tool.

const { app, ipcMain, safeStorage, systemPreferences } = require('electron');
const { execFile, spawn } = require('child_process');
const { avisarChaves } = require('./chaves-aviso');
const fs = require('fs');
const path = require('path');

const ARQ = () => path.join(app.getPath('userData'), 'bau.json');
const PREFS = () => path.join(app.getPath('userData'), 'bau-prefs.json');
const SERVICO = 'Oceano · Baú de senhas', CONTA = 'bau';
// sem preferência ainda: o padrão é o guarda-senhas do sistema, quando existe
const lerPrefs = () => { try { return JSON.parse(fs.readFileSync(PREFS(), 'utf8')); } catch { return { lugar: sistemaExiste() ? 'sistema' : 'oceano' }; } };
let temSecretTool = null;
function sistemaExiste() {
  if (process.platform === 'darwin') return true;
  if (process.platform === 'win32') return safeStorage.isEncryptionAvailable();
  if (process.platform === 'linux') { if (temSecretTool === null) { try { require('child_process').execFileSync('which', ['secret-tool']); temSecretTool = true; } catch { temSecretTool = false; } } return temSecretTool; }
  return false;
}
const NOME_SISTEMA = { darwin: 'Senhas do macOS (Keychain)', win32: 'proteção da sua conta do Windows', linux: 'chaveiro do sistema (Secret Service)' }[process.platform] || 'guarda-senhas do sistema';
const ARQ_WIN = () => path.join(app.getPath('userData'), 'bau-windows.bin');

// Destrancar com o sistema (padrão quando existe): a chave do baú fica cifrada pelo safeStorage do Oceano e só volta
// para a tela depois que o sistema confirma que é você. A senha-mestra e a chave de recuperação continuam valendo.
//  - macOS: Touch ID (safeStorage = chave no Keychain que só o app Oceano lê sem perguntar);
//  - Windows: Windows Hello (rosto, digital ou PIN), pelo UserConsentVerifier do Windows; safeStorage = DPAPI da conta;
//  - Linux: não há um padrão de biometria entre as distribuições; fica só a senha-mestra.
const ARQ_TOUCH = () => path.join(app.getPath('userData'), 'bau-touchid.bin');
const NOME_TOUCH = { darwin: 'Touch ID', win32: 'Windows Hello' }[process.platform] || '';
let helloPronto = false;   // Windows: conferido uma vez ao abrir o app (o PowerShell demora um pouco)
const touchExiste = () => {
  try {
    // no Mac só vê se há Touch ID: perguntar pelo safeStorage já tocaria nas Chaves, e isto roda ao abrir a página
    if (process.platform === 'darwin') return systemPreferences.canPromptTouchID();
    if (!safeStorage.isEncryptionAvailable()) return false;
    if (process.platform === 'win32') return helloPronto;
  } catch {}
  return false;
};
// Windows Hello pelo PowerShell (WinRT), sem módulo nativo. Sai "Available" na checagem e "Verified" quando confirmou.
const PS_HELLO = `$null=[Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$m=([System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'})[0]
function Esperar($op,$t){$k=$m.MakeGenericMethod($t).Invoke($null,@($op));$k.Wait(-1)|Out-Null;$k.Result}
$V=[Windows.Security.Credentials.UI.UserConsentVerifier]
if($env:OCEANO_HELLO -eq 'checar'){Esperar ($V::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability]);exit}
Esperar ($V::RequestVerificationAsync($env:OCEANO_MOTIVO)) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])`;
function hello(modo, motivo = '') {
  return new Promise(ok => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'], { env: { ...process.env, OCEANO_HELLO: modo, OCEANO_MOTIVO: motivo }, windowsHide: true });
    let saida = ''; p.stdout.on('data', d => { saida += d; });
    p.on('close', () => ok(saida.trim())); p.on('error', () => ok(''));
    p.stdin.end(PS_HELLO);
  });
}
async function pedirDigital(motivo) {
  if (process.platform === 'darwin') { try { await systemPreferences.promptTouchID(motivo); return true; } catch { return false; } }
  if (process.platform === 'win32') return (await hello('pedir', 'Oceano: ' + motivo)) === 'Verified';
  return false;
}

function sistemaLer() {
  if (process.platform === 'win32') { try { return Promise.resolve(JSON.parse(safeStorage.decryptString(fs.readFileSync(ARQ_WIN())))); } catch { return Promise.resolve(null); } }
  if (process.platform === 'linux') return new Promise(ok => execFile('secret-tool', ['lookup', 'service', 'oceano-bau', 'account', CONTA], (e, saida) => { if (e) return ok(null); try { ok(JSON.parse(Buffer.from(saida.trim(), 'base64').toString())); } catch { ok(null); } }));
  return new Promise(ok => execFile('/usr/bin/security', ['find-generic-password', '-s', SERVICO, '-a', CONTA, '-w'], (e, saida) => {
    if (e) return ok(null);
    try { ok(JSON.parse(Buffer.from(saida.trim(), 'base64').toString())); } catch { ok(null); }
  }));
}
// o conteúdo vai pela entrada do "security -i" (não aparece na lista de processos)
function sistemaGravar(dado) {
  if (process.platform === 'win32') { try { fs.writeFileSync(ARQ_WIN(), safeStorage.encryptString(JSON.stringify(dado))); return Promise.resolve(true); } catch { return Promise.resolve(false); } }
  if (process.platform === 'linux') return new Promise(ok => { const p = spawn('secret-tool', ['store', `--label=${SERVICO}`, 'service', 'oceano-bau', 'account', CONTA]); p.on('close', c => ok(c === 0)); p.on('error', () => ok(false)); p.stdin.end(Buffer.from(JSON.stringify(dado)).toString('base64')); });
  return new Promise(ok => {
    const p = spawn('/usr/bin/security', ['-i']);
    const b = Buffer.from(JSON.stringify(dado)).toString('base64');
    p.on('close', c => ok(c === 0));
    p.stdin.end(`add-generic-password -U -s "${SERVICO}" -a "${CONTA}" -l "${SERVICO}" -w "${b}"\n`);
  });
}
function sistemaApagar() {
  if (process.platform === 'win32') { fs.rmSync(ARQ_WIN(), { force: true }); return Promise.resolve(true); }
  if (process.platform === 'linux') return new Promise(ok => execFile('secret-tool', ['clear', 'service', 'oceano-bau', 'account', CONTA], () => ok(true)));
  return new Promise(ok => execFile('/usr/bin/security', ['delete-generic-password', '-s', SERVICO, '-a', CONTA], () => ok(true)));
}

function registrar() {
  if (process.platform === 'win32') app.whenReady().then(() => hello('checar')).then(r => { helloPronto = r === 'Available'; });
  ipcMain.handle('bau:info', () => ({ lugar: lerPrefs().lugar, sistemaDisponivel: sistemaExiste(), nomeSistema: NOME_SISTEMA, plataforma: process.platform,
    touchDisponivel: touchExiste(), touchLigado: touchExiste() && fs.existsSync(ARQ_TOUCH()), nomeTouch: NOME_TOUCH }));
  // ligar pede a digital antes de guardar, para confirmar que é a pessoa dona do Mac
  ipcMain.handle('bau:touch-ligar', async (_e, chave) => {
    if (!touchExiste() || typeof chave !== 'string' || !/^[A-Za-z0-9+/=]{40,64}$/.test(chave)) return false;
    if (!(await pedirDigital('destrancar o baú de senhas com ' + NOME_TOUCH))) return false;
    avisarChaves();
    try { fs.writeFileSync(ARQ_TOUCH(), safeStorage.encryptString(chave), { mode: 0o600 }); } catch { return false; }
    return true;
  });
  ipcMain.handle('bau:touch-abrir', async () => {
    if (!touchExiste() || !fs.existsSync(ARQ_TOUCH())) return null;
    if (!(await pedirDigital('abrir o baú de senhas'))) return null;
    avisarChaves();
    try { return safeStorage.decryptString(fs.readFileSync(ARQ_TOUCH())); } catch { return null; }
  });
  ipcMain.handle('bau:touch-desligar', () => { fs.rmSync(ARQ_TOUCH(), { force: true }); return true; });
  ipcMain.handle('bau:ler', async () => {
    const { lugar } = lerPrefs();
    if (lugar === 'sistema') return sistemaLer();
    try { return JSON.parse(fs.readFileSync(ARQ(), 'utf8')); } catch { return null; }
  });
  ipcMain.handle('bau:gravar', async (_e, dado) => {
    if (!dado || !['oceano-bau/1', 'oceano-bau/2'].includes(dado.formato) || typeof dado.dados !== 'string') return false;   // só aceita baú cifrado
    const { lugar } = lerPrefs();
    if (lugar === 'sistema') return sistemaGravar(dado);
    const t = ARQ() + '.tmp'; fs.writeFileSync(t, JSON.stringify(dado), { mode: 0o600 }); fs.renameSync(t, ARQ());
    return true;
  });
  // trocar de lugar leva o baú cifrado junto e apaga do lugar antigo
  ipcMain.handle('bau:lugar', async (_e, novo) => {
    if (!['oceano', 'sistema'].includes(novo) || (novo === 'sistema' && !sistemaExiste())) return false;
    const antigo = lerPrefs().lugar;
    if (antigo === novo) return true;
    const dado = antigo === 'sistema' ? await sistemaLer() : (() => { try { return JSON.parse(fs.readFileSync(ARQ(), 'utf8')); } catch { return null; } })();
    if (dado) {
      if (novo === 'sistema') { if (!(await sistemaGravar(dado))) return false; fs.rmSync(ARQ(), { force: true }); }
      else { fs.writeFileSync(ARQ(), JSON.stringify(dado), { mode: 0o600 }); await sistemaApagar(); }
    }
    fs.writeFileSync(PREFS(), JSON.stringify({ lugar: novo }));
    return true;
  });
}

module.exports = { registrar };
