// MicromediaFlash dentro do Oceano (v2.0 do MicromediaFlash): onde ficam os arquivos dele e de onde vem o app.
// Pasta: dentro da pasta do próprio Oceano, para o sistema nunca pedir acesso a Documentos (projetos .mmf, com Exportações/ e Plugins/ dentro).
// O app é servido em oceano-ui://app/micromediaflash/ (ver servirInterface em main.js).

const { app, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// o código do app: ao lado do Oceano no instalador (Resources/micromediaflash) ou na pasta irmã no desenvolvimento
const CANDIDATOS = [path.join(__dirname, '..', 'micromediaflash'), path.join(__dirname, '..', '..', 'micromediaflash')];
const CODIGO = CANDIDATOS.find((p) => fs.existsSync(path.join(p, 'index.html'))) || null;

// OCEANO_MMF_PASTA troca a pasta (testes automáticos não mexem nos documentos de verdade)
const pasta = () => process.env.OCEANO_MMF_PASTA || path.join(app.getPath('userData'), 'MicromediaFlash');
const sub = (nome) => { const p = nome ? path.join(pasta(), nome) : pasta(); fs.mkdirSync(p, { recursive: true }); return p; };

// nome de arquivo seguro, sempre dentro da pasta
function caminho(dir, nome, extPadrao) {
  let n = path.basename(String(nome || '')).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  if (!n || n === '.' || n === '..') n = 'sem-titulo';
  if (extPadrao && !path.extname(n)) n += extPadrao;
  const alvo = path.join(dir, n);
  if (!alvo.startsWith(dir + path.sep)) throw new Error('nome inválido');
  return alvo;
}
const bytes = (dados) => Buffer.from(dados instanceof ArrayBuffer ? new Uint8Array(dados) : dados);

function registrar() {
  ipcMain.handle('mmf:pasta', () => ({ pasta: sub(), exportacoes: sub('Exportações'), plugins: sub('Plugins') }));
  ipcMain.handle('mmf:listar', () => fs.readdirSync(sub(), { withFileTypes: true })
    .filter((d) => d.isFile() && /\.mmf$/i.test(d.name))
    .map((d) => { const st = fs.statSync(path.join(sub(), d.name)); return { nome: d.name, tamanho: st.size, alterado: st.mtimeMs }; })
    .sort((a, b) => b.alterado - a.alterado));
  ipcMain.handle('mmf:ler', (_, nome) => {
    const arq = caminho(sub(), nome);
    return fs.existsSync(arq) ? fs.readFileSync(arq) : null;
  });
  ipcMain.handle('mmf:gravar', (_, nome, dados) => {
    const arq = caminho(sub(), nome, '.mmf');
    fs.writeFileSync(arq, bytes(dados));
    return path.basename(arq);
  });
  ipcMain.handle('mmf:exportar', (_, nome, dados) => {
    const arq = caminho(sub('Exportações'), nome);
    fs.writeFileSync(arq, bytes(dados));
    return path.basename(arq);
  });
  // plugins compartilhados: .lua soltos na pasta Plugins (o MicromediaFlash instala ao abrir)
  ipcMain.handle('mmf:plugins', () => fs.readdirSync(sub('Plugins'), { withFileTypes: true })
    .filter((d) => d.isFile() && /\.lua$/i.test(d.name))
    .map((d) => ({ name: d.name.replace(/\.lua$/i, ''), file: d.name, text: fs.readFileSync(path.join(sub('Plugins'), d.name), 'utf8') })));
  ipcMain.handle('mmf:mostrar', (_, qual) => shell.openPath(qual === 'exportacoes' ? sub('Exportações') : qual === 'plugins' ? sub('Plugins') : sub()));
}

module.exports = { registrar, CODIGO };
