// Gera o instalador do Oceano para Windows ou Linux, no próprio sistema: node instalador/empacotar-outros.mjs
// Mesma organização do empacotar.py do Mac: resources/app, simulador, docs e o editor de animação ao lado.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url)), APP = dirname(AQUI), RAIZ = dirname(APP);
const OUTROS = join(APP, '.outros'), MMF = join(dirname(RAIZ), 'micromediaflash');
const NO_WINDOWS = process.platform === 'win32';
if (!NO_WINDOWS && process.platform !== 'linux') throw new Error('rode no Windows ou no Linux');

execFileSync(process.execPath, [join(APP, 'verificar-sem-chaves.js')], { stdio: 'inherit' });   // o guarda: sem ele, não há instalador
rmSync(OUTROS, { recursive: true, force: true });
mkdirSync(OUTROS, { recursive: true });

const FORA = new Set(['node_modules', 'package.json', 'package-lock.json', '.DS_Store', '__pycache__']);
cpSync(join(RAIZ, 'simulador'), join(OUTROS, 'simulador'), {
  recursive: true,
  filter: o => {
    const n = basename(o), pasta = dirname(resolve(o));
    if (FORA.has(n)) return false;
    if (pasta === join(RAIZ, 'simulador') && n === 'serve.py') return false;
    if (pasta === join(RAIZ, 'simulador', 'sampler') && n === 'atualizar.py') return false;
    if (pasta === join(RAIZ, 'simulador', 'fundos') && n.endsWith('.mp4')) return false;
    return true;
  },
});
const recursos = [{ from: '.outros/simulador', to: 'simulador' }, { from: '../docs', to: 'docs' }];
if (existsSync(join(MMF, 'index.html'))) {
  const FORA_MMF = new Set(['referencias', 'tools', 'video', '.git', 'node_modules', '.DS_Store']);
  cpSync(MMF, join(OUTROS, 'micromediaflash'), {
    recursive: true,
    filter: o => {
      const n = basename(o);
      if (FORA_MMF.has(n) || n.endsWith('.py')) return false;
      return !(dirname(resolve(o)) === MMF && n.startsWith('_'));
    },
  });
  recursos.push({ from: '.outros/micromediaflash', to: 'micromediaflash' });
}

const binarios = 'node_modules/onnxruntime-node/bin/napi-v6';
const outras = NO_WINDOWS ? ['darwin', 'linux', 'win32/arm64'] : ['darwin', 'win32', 'linux/arm64'];
const config = {
  appId: 'gg.oceano.mvp', productName: 'Oceano', asar: false, publish: { provider: 'github', owner: 'hericdk', repo: 'oceano' },
  directories: { app: APP, output: 'dist-outros' },
  files: ['*.js', '!bau.js', '!verificar-sem-chaves.js', 'ui/**/*', 'package.json', 'node_modules/**/*', ...outras.map(p => `!${binarios}/${p}/**`)],
  extraResources: recursos,
  win: { target: 'nsis', icon: 'instalador/icone-512.png', artifactName: 'Oceano-${version}-Windows-x64.exe' },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true, shortcutName: 'Oceano' },
  linux: { target: 'AppImage', executableName: 'oceano', icon: 'instalador/icone-512.png', category: 'Network', artifactName: 'Oceano-${version}-Linux-x64.AppImage' },
};
const arquivo = join(OUTROS, 'builder.json');
writeFileSync(arquivo, JSON.stringify(config));
execFileSync('npx', ['--yes', 'electron-builder@26', NO_WINDOWS ? '--win' : '--linux', '--x64', '--publish', 'never', '--config', arquivo, '--project', APP], { stdio: 'inherit', cwd: APP, shell: NO_WINDOWS, env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' } });
console.log(readdirSync(join(APP, 'dist-outros')).join(' '));
