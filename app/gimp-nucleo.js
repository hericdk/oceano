// GIMP no Oceano: acha o programa, baixa o instalador oficial conferindo o SHA-256 e aplica o PhotoGIMP com cópia de
// segurança. Sem nada do Electron, para dar para testar. O GIMP e o PhotoGIMP são projetos independentes do Oceano.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const VERSOES = 'https://www.gimp.org/gimp_versions.json';
const PHOTOGIMP = {
  versao: '3.1',
  url: 'https://github.com/Diolinux/PhotoGIMP/releases/download/3.1/PhotoGIMP.zip',
  sha256: 'de6a17ffb70000051372d84141b7e69fc2e60a0af3bd3b3100c9afd5e0ff3ae6',
};
const MARCA = '.oceano-photogimp', SUFIXO = '-antes-do-photogimp';
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const existe = p => { try { fs.accessSync(p); return true; } catch { return false; } };
const pastasDe = p => { try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; } };

function acharGimp({ plataforma = process.platform, home, env = process.env, noPath = () => null } = {}) {
  if (plataforma === 'darwin') {
    for (const dir of ['/Applications', path.join(home, 'Applications')]) {
      const a = pastasDe(dir).find(d => /^GIMP.*\.app$/i.test(d.name));
      if (!a) continue;
      const app = path.join(dir, a.name);
      let versao = null;
      try { versao = fs.readFileSync(path.join(app, 'Contents', 'Info.plist'), 'utf8').match(/CFBundleShortVersionString<\/key>\s*<string>([^<]+)/)?.[1] || null; } catch {}
      return { app, versao };
    }
    return null;
  }
  if (plataforma === 'win32') {
    for (const raiz of [env.ProgramFiles, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs')].filter(Boolean)) {
      const bin = path.join(raiz, 'GIMP 3', 'bin');
      const exe = pastasDe(bin).find(d => /^gimp-3[\d.]*\.exe$/i.test(d.name));
      if (exe) return { app: path.join(bin, exe.name), versao: null };
    }
    return null;
  }
  const c = noPath('gimp');
  if (c) return { app: c, versao: null };
  return existe('/var/lib/flatpak/app/org.gimp.GIMP') ? { flatpak: 'org.gimp.GIMP', versao: null } : null;
}

function pastaConfig({ plataforma = process.platform, home, env = process.env } = {}) {
  if (plataforma === 'darwin') return path.join(home, 'Library', 'Application Support', 'GIMP');
  if (plataforma === 'win32') return env.APPDATA ? path.join(env.APPDATA, 'GIMP') : null;
  return null;   // no Linux o PhotoGIMP tem instalador próprio
}

// a pasta da versão mais nova do GIMP 3; ela só existe depois de abrir o GIMP uma vez
function pastaVersao(config) {
  const nomes = pastasDe(config).filter(d => d.isDirectory() && /^\d+\.\d+$/.test(d.name) && Number(d.name.split('.')[0]) >= 3).map(d => d.name);
  nomes.sort((a, b) => { const [x, y] = [a, b].map(n => n.split('.').map(Number)); return y[0] - x[0] || y[1] - x[1]; });
  return nomes[0] ? path.join(config, nomes[0]) : null;
}

function estadoPhotoGimp(config) {
  const pasta = config && pastaVersao(config);
  return {
    pronto: !!pasta,
    aplicado: !!pasta && existe(path.join(pasta, MARCA)),
    copia: !!pasta && existe(pasta + SUFIXO),
  };
}

// lê um .zip da memória, sem abrir nada fora da pasta "3.0/" do pacote
function lerPacote(buf) {
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  if (fim < 0) throw new Error('pacote inválido');
  const total = buf.readUInt16LE(fim + 10), arquivos = [];
  let p = buf.readUInt32LE(fim + 16);
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('pacote inválido');
    const metodo = buf.readUInt16LE(p + 10), comprimido = buf.readUInt32LE(p + 20), lN = buf.readUInt16LE(p + 28), lE = buf.readUInt16LE(p + 30), lC = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + lN);
    p += 46 + lN + lE + lC;
    if (nome.endsWith('/') || nome.startsWith('__MACOSX/')) continue;
    if (!nome.startsWith('3.0/') || nome.includes('\\') || nome.split('/').includes('..')) throw new Error('pacote com caminho inesperado');
    const ini = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28), dados = buf.subarray(ini, ini + comprimido);
    if (metodo !== 0 && metodo !== 8) throw new Error('pacote com formato inesperado');
    arquivos.push({ nome: nome.slice(4), dados: metodo === 8 ? zlib.inflateRawSync(dados) : dados });
  }
  if (!arquivos.length) throw new Error('pacote vazio');
  return arquivos;
}

// guarda a configuração atual uma única vez: a cópia é sempre a de antes do primeiro PhotoGIMP
function aplicarPhotoGimp(config, zip) {
  if (sha256(zip) !== PHOTOGIMP.sha256) throw new Error('o PhotoGIMP baixado não confere');
  const pasta = pastaVersao(config);
  if (!pasta) throw new Error('abra e feche o GIMP uma vez antes');
  const arquivos = lerPacote(zip);
  if (!existe(pasta + SUFIXO)) fs.cpSync(pasta, pasta + SUFIXO, { recursive: true });
  for (const { nome, dados } of arquivos) {
    const alvo = path.join(pasta, nome);
    fs.mkdirSync(path.dirname(alvo), { recursive: true });
    fs.writeFileSync(alvo, dados);
  }
  fs.writeFileSync(path.join(pasta, MARCA), PHOTOGIMP.versao);
}

function desfazerPhotoGimp(config) {
  const pasta = pastaVersao(config);
  if (!pasta || !existe(pasta + SUFIXO)) throw new Error('não achei a cópia de segurança');
  fs.rmSync(pasta, { recursive: true, force: true });
  fs.renameSync(pasta + SUFIXO, pasta);
}

// escolhe o instalador oficial para este computador a partir da lista publicada pelo gimp.org
function escolherInstalador(lista, { plataforma = process.platform, arch = process.arch } = {}) {
  const s = lista?.STABLE?.[0];
  if (!s || !/^\d+\.\d+\.\d+$/.test(s.version)) return null;
  const pasta = plataforma === 'darwin' ? 'macos' : plataforma === 'win32' ? 'windows' : null;
  if (!pasta) return null;
  const opcoes = s[pasta] || [];
  const item = plataforma === 'darwin' ? opcoes.find(o => o.filename?.includes(arch === 'x64' ? 'x86_64' : 'arm64')) : opcoes.find(o => /setup.*\.exe$/.test(o.filename || ''));
  if (!item || !/^gimp-[\w.-]+\.(dmg|exe)$/.test(item.filename) || !/^[0-9a-f]{64}$/.test(item.sha256 || '')) return null;
  const [a, b] = s.version.split('.');
  return { versao: s.version, arquivo: item.filename, sha256: item.sha256, url: `https://download.gimp.org/gimp/v${a}.${b}/${pasta}/${item.filename}` };
}

// baixa aos poucos, confere e só então dá o nome final; um arquivo já baixado e certo não baixa de novo
async function baixarConferido({ url, sha256: esperado }, destino, aoProgresso = () => {}, buscar = fetch) {
  if (existe(destino) && sha256(fs.readFileSync(destino)) === esperado) return destino;
  const r = await buscar(url);
  if (!r.ok || !r.body) throw new Error(`o servidor respondeu ${r.status}`);
  const total = Number(r.headers.get('content-length')) || 0, parcial = destino + '.parcial', hash = crypto.createHash('sha256');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const saida = fs.createWriteStream(parcial);
  let feito = 0;
  try {
    for await (const pedaco of r.body) {
      hash.update(pedaco); feito += pedaco.length;
      if (!saida.write(pedaco)) await new Promise(ok => saida.once('drain', ok));
      aoProgresso(feito, total);
    }
    await new Promise((ok, erro) => saida.end(e => (e ? erro(e) : ok())));
    if (hash.digest('hex') !== esperado) throw new Error('o arquivo baixado não confere com o publicado pelo gimp.org');
    fs.renameSync(parcial, destino);
    return destino;
  } catch (e) { saida.destroy(); fs.rmSync(parcial, { force: true }); throw e; }
}

module.exports = { VERSOES, PHOTOGIMP, sha256, acharGimp, pastaConfig, pastaVersao, estadoPhotoGimp, lerPacote, aplicarPhotoGimp, desfazerPhotoGimp, escolherInstalador, baixarConferido };
