// Oceano MVP: a interface do simulador rodando com abas reais (Electron).
// Este arquivo é a única parte específica do Electron; no navegador final
// (fork do Chromium) o mesmo papel vira código C++.
// Privacidade, perfis, permissões e proxy ficam em seguranca.js.

const { app, BrowserWindow, protocol, ipcMain, Menu, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const seg = require('./seguranca');
const { animarIcone } = require('./icone');
require('./ia');
// IA: conexões (cofre de chaves), conversa da Navegadora e edição de imagem
require('./agentes').registrar(ipcMain, () => { enviar('agentes:mudou'); require('./notch').agentesMudaram(); });
require('./conversa').registrar(ipcMain);
require('./guardrails').registrar(ipcMain);
require('./gravacao').registrar(ipcMain, (...a) => enviar(...a), app);
require('./bloqueio-18').registrar(ipcMain, (url, wcId) => enviar('bloqueio18:barrou', url, wcId));
require('./imagem').registrar(ipcMain);
const notch = require('./notch');
require('./transcricao').registrar((...a) => registrarPropria(...a));   // transcrição da voz, no computador
require('./voz').registrar((...a) => registrarPropria(...a));   // voz neural da Navegadora
require('./atualizacoes').registrar((...a) => enviar(...a), (...a) => registrarPropria(...a));   // versão nova, só com clique da pessoa
require('./contagem').registrar((...a) => registrarPropria(...a));   // contagem anônima, só com autorização
require('./gimp').registrar(registrarPropria);   // abrir o GIMP e aplicar o PhotoGIMP
require('./downloads').registrar((...a) => enviar(...a));   // lista de downloads, só na memória
require('./abrir-claude').registrar();   // cartão de pedido: abrir o app do Claude, sem levar o pedido no endereço
require('./ferramentas').registrar();   // motor das 🧰 Ferramentas: baixar e exportar vídeo
require('./sampler').registrar();   // motor do ½ sampler (YouTube e separação de instrumentos)
const { explicarPedido } = require('./rede-motivos');
const mmf = require('./micromediaflash');   // editor de animação MicromediaFlash (arquivos na pasta do próprio Oceano)
mmf.registrar();

const UI = path.join(__dirname, 'ui');                       // arquivos só do app
const SIM = path.join(__dirname, '..', 'simulador');         // o resto vem do simulador
const DOCS = path.join(__dirname, '..', 'docs');

seg.desligarTelemetria();   // precisa vir antes do app ficar pronto

// Guarda: o Oceano nunca pede senha do computador. O Chromium usaria as Chaves do Mac para cifrar cookies, e isso abre
// uma janela do sistema. Com estes interruptores ele não toca nelas (nem no chaveiro do Linux). Só o guarda pode mudar isto:
// verificar-sem-chaves.js falha se algum arquivo voltar a usar as Chaves.
app.commandLine.appendSwitch('use-mock-keychain');
app.commandLine.appendSwitch('password-store', 'basic');

protocol.registerSchemesAsPrivileged([
  { scheme: 'oceano-ui', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.bin': 'application/octet-stream', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.vrm': 'model/gltf-binary', '.glb': 'model/gltf-binary', '.mjs': 'text/javascript', '.webmanifest': 'application/manifest+json', '.woff': 'font/woff', '.gif': 'image/gif', '.webp': 'image/webp', '.lua': 'text/plain; charset=utf-8', '.tl': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.png': 'image/png', '.svg': 'image/svg+xml',
};

// as ferramentas embutidas: cada uma com origem própria, sem alcançar a interface (ver simulador/js/quadros.js)
const PERMISSOES_FERRAMENTA = {
  stave: ['midi', 'midiSysex', 'clipboard-sanitized-write', 'fullscreen'],
  sampler: ['media', 'midi', 'midiSysex', 'clipboard-sanitized-write', 'fullscreen'],
  ferramentas: ['clipboard-sanitized-write', 'fullscreen'],
  robo: ['display-capture', 'clipboard-sanitized-write', 'fullscreen'],
  winampfm: ['midi', 'midiSysex', 'fullscreen'],
  micromediaflash: ['media', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'],
  retoque: ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen'],
};
const FERRAMENTAS_ORIGEM = ['stave', 'sampler', 'ferramentas', 'robo', 'winampfm', 'micromediaflash', 'retoque'];
const POLITICA_FERRAMENTA = "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com; media-src 'self' blob: data: http://127.0.0.1:* http://localhost:*; font-src 'self' data:; connect-src 'self' blob: data: http://127.0.0.1:* http://localhost:*; worker-src 'self' blob:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors oceano-ui://app";
function servirInterface(req) {
  const endereco = new URL(req.url);
  let rel = decodeURIComponent(endereco.pathname).replace(/^\/+/, '') || 'app.html';
  // o Stave roda código de fora: ele tem origem própria e só enxerga a pasta dele, sem alcançar a ponte do navegador
  const ferramenta = FERRAMENTAS_ORIGEM.includes(endereco.hostname) ? endereco.hostname : null;
  if (ferramenta ? !rel.startsWith(ferramenta + '/') && rel !== 'js/ponte-ferramenta.js' && !(ferramenta === 'stave' && rel === 'js/traducao-stave.js') : endereco.hostname !== 'app') return new Response('não encontrado', { status: 404 });
  // e a interface não abre essas páginas na origem dela: o HEAD só confere se o editor está instalado
  if (!ferramenta && req.method === 'GET' && FERRAMENTAS_ORIGEM.some(n => rel.startsWith(n + '/')) && /(\.html|\/)$/.test(rel)) return new Response('não encontrado', { status: 404 });
  if (rel.endsWith('/')) rel += 'index.html';   // pastas abrem a página delas (ex.: stave/)
  if (rel.startsWith('notch-temas-seus/')) return require('./notch').servirTemaSeu(rel.slice(17)) || new Response('não encontrado', { status: 404 });
  const bases = rel.startsWith('docs/') ? [[DOCS, rel.slice(5)]]
    : rel.startsWith('micromediaflash/') && mmf.CODIGO ? [[mmf.CODIGO, rel.slice(16) || 'index.html']]
    : [[UI, rel], [SIM, rel]];
  for (const [base, r] of bases) {
    const arq = path.normalize(path.join(base, r));
    if (arq.startsWith(base + path.sep) && fs.existsSync(arq) && fs.statSync(arq).isFile()) {
      const headers = { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' };
      // o editor roda com a mesma política do resto da interface (nada remoto além do Gist opcional)
      if (base === mmf.CODIGO) headers['content-security-policy'] = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'self'";
      if (ferramenta && arq.endsWith('.html')) {
        if (ferramenta === 'stave') headers['content-security-policy'] = "frame-ancestors oceano-ui://app";
        else if (base !== mmf.CODIGO && ferramenta !== 'robo') headers['content-security-policy'] = POLITICA_FERRAMENTA;
        else headers['content-security-policy'] = (headers['content-security-policy'] ? headers['content-security-policy'] + '; ' : '') + "frame-ancestors oceano-ui://app";
        return new Response(fs.readFileSync(arq, 'utf8').replace(/<head[^>]*>/i, m => `${m}${ferramenta === 'stave' ? '<script src="/js/traducao-stave.js"></script>' : ''}<script src="/js/ponte-ferramenta.js"></script>`), { headers });
      }
      return new Response(fs.readFileSync(arq), { headers });
    }
  }
  return new Response('não encontrado', { status: 404 });
}

let janela = null;
const enviar = (canal, ...dados) => { if (janela && !janela.isDestroyed()) janela.webContents.send(canal, ...dados); };

// ---------- log de rede ----------
// "próprias": conexões que o navegador faz por conta própria (fora dos sites).
// "sites": resumo, por aba, do que cada página contata.

const proprias = [];
function registrarPropria(url, motivo, envia) {
  const item = { hora: Date.now(), destino: new URL(url).host, motivo, envia };
  proprias.push(item);
  enviar('rede:propria', item);
}

const porAba = new Map();   // webContentsId → resumo da página atual
const raiz = host => host.split('.').slice(-2).join('.');
const CABECALHOS = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options',
  'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-embedder-policy', 'cache-control', 'server',
  'x-powered-by', 'x-generator', 'via', 'cf-ray', 'x-vercel-id', 'x-nf-request-id', 'x-amz-cf-id', 'x-fastly-request-id', 'x-served-by', 'x-shopify-stage', 'x-runtime'];

function contarPedido(details, bloqueado) {
  const id = details.webContentsId;
  if (!id) return;
  const wc = webContents.fromId(id);
  if (!wc || wc.getType() !== 'webview') return;
  let r = porAba.get(id);
  if (!r) porAba.set(id, (r = { pedidos: 0, bloqueados: 0, cache: 0, erros: 0, bytes: 0, terceiros: new Map(), pagina: '', cabecalhos: null, cookies: [], status: 0 }));
  let host = '', topo = '';
  // a página nova termina de chegar antes de wc.getURL() mudar: nela, o topo é o próprio endereço pedido
  try { host = new URL(details.url).host; topo = details.resourceType === 'mainFrame' ? host : new URL(wc.getURL()).host; } catch { return; }
  if (details.resourceType === 'mainFrame' || r.pagina !== topo) {
    Object.assign(r, { pagina: topo, pedidos: 0, bloqueados: 0, cache: 0, erros: 0, bytes: 0, cabecalhos: null, cookies: [], status: 0 });
    r.terceiros.clear();
  }
  r.pedidos++;
  const falhou = details.error && details.error !== 'net::OK';   // o Electron manda net::OK nos pedidos que deram certo
  if (bloqueado) r.bloqueados++;
  else if (falhou) r.erros++;
  if (details.fromCache) r.cache++;
  const h = details.responseHeaders || {};
  const tamanho = +(Object.entries(h).find(([k]) => k.toLowerCase() === 'content-length')?.[1]?.[0] || 0);
  if (!details.fromCache) r.bytes += tamanho;
  if (details.resourceType === 'mainFrame' && !falhou) {
    r.status = details.statusCode;
    r.cabecalhos = {};
    for (const [k, v] of Object.entries(h)) {
      const n = k.toLowerCase();
      if (CABECALHOS.includes(n)) r.cabecalhos[n] = v.join(', ');
      if (n === 'set-cookie') r.cookies = v.map(c => ({ nome: c.split('=')[0], secure: /;\s*secure/i.test(c), httpOnly: /;\s*httponly/i.test(c), sameSite: (/;\s*samesite=(\w+)/i.exec(c) || [])[1] || '' }));
    }
  }
  if (raiz(host) !== raiz(topo)) r.terceiros.set(host, (r.terceiros.get(host) || 0) + 1);
}

setInterval(() => {
  const resumo = {};
  for (const [id, r] of porAba) {
    if (!webContents.fromId(id)) { porAba.delete(id); continue; }
    resumo[id] = {
      pagina: r.pagina, pedidos: r.pedidos, bloqueados: r.bloqueados, cache: r.cache, erros: r.erros, bytes: r.bytes,
      terceiros: [...r.terceiros].sort((a, b) => b[1] - a[1]).slice(0, 12), totalTerceiros: r.terceiros.size,
    };
  }
  enviar('rede:sites', resumo);
}, 1000);

ipcMain.handle('dev:cabecalhos', (_, id) => {
  const r = porAba.get(id);
  if (!r) return null;
  return { status: r.status, cabecalhos: r.cabecalhos, cookies: r.cookies, certificado: seg.certificados.get(r.pagina) || null };
});

// painel Dev: deixa só este site como numa primeira visita (cookies, cache e dados salvos); os outros não mudam
ipcMain.handle('dev:limpar-site', async (_, id) => {
  const wc = abaDe(id);
  if (!wc) return { ok: false };
  let origem;
  try { origem = new URL(wc.getURL()).origin; } catch { return { ok: false }; }
  if (!/^https?:/.test(origem)) return { ok: false };
  await wc.executeJavaScript('try { sessionStorage.clear() } catch {}').catch(() => {});
  await wc.session.clearData({ origins: [origem], dataTypes: ['cache', 'cookies', 'localStorage', 'indexedDB', 'serviceWorkers', 'fileSystems', 'webSQL', 'backgroundFetch'] });
  wc.reloadIgnoringCache();
  return { ok: true };
});

// ---------- bloqueador (listas da Ghostery, código aberto) ----------

async function carregarBloqueador() {
  const cache = path.join(app.getPath('userData'), 'listas-bloqueio.bin');
  const buscar = (url, ...resto) => {
    registrarPropria(url, 'Baixar as listas do bloqueador de anúncios e rastreadores', 'nada (só download)');
    return fetch(url, ...resto);
  };
  try {
    const bloqueador = await ElectronBlocker.fromPrebuiltAdsAndTracking(buscar, {
      path: cache, read: fs.promises.readFile, write: fs.promises.writeFile,
    });
    seg.definirBloqueador(bloqueador);
    enviar('bloqueador', { ligado: seg.config().bloqueador, cache: fs.existsSync(cache) });
  } catch (e) {
    enviar('bloqueador', { ligado: false, erro: String(e.message || e) });
  }
}

// ---------- segurança das abas ----------

seg.definirGanchos({
  registrarPropria, enviar,
  aoPreparar(ses) {
    ses.webRequest.onCompleted(d => contarPedido(d, false));
    ses.webRequest.onErrorOccurred(d => contarPedido(d, d.error === 'net::ERR_BLOCKED_BY_CLIENT'));
  },
});

app.on('web-contents-created', (_, contents) => {
  // toda <webview> roda isolada, sem Node e sem preload, numa partição conhecida
  contents.on('will-attach-webview', (ev, prefs, params) => {
    delete prefs.preload;
    prefs.nodeIntegration = false;
    prefs.contextIsolation = true;
    prefs.sandbox = true;
    if (!seg.webviewPermitida(params.partition, params.src)) return ev.preventDefault();
    seg.prepararSessao(params.partition);
  });
  // links que abririam janela nova viram aba nova, venham de um site ou da própria interface; nunca uma janela solta
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) enviar('aba:nova', url, contents.id);
    return { action: 'deny' };
  });
});

// ---------- ponte com a interface ----------

// lista em voltar e avançar: as páginas da aba, direto do Chromium
const abaDe = id => { const wc = webContents.fromId(id); return wc && wc.getType() === 'webview' ? wc : null; };
ipcMain.handle('nav:entradas', (_, id) => {
  const h = abaDe(id)?.navigationHistory;
  return h ? { entradas: h.getAllEntries().map(({ url, title }) => ({ url, titulo: title })), atual: h.getActiveIndex() } : null;
});
ipcMain.handle('nav:ir', (_, id, i) => { abaDe(id)?.navigationHistory.goToIndex(i); return true; });

ipcMain.handle('metricas', () => ({
  processos: app.getAppMetrics().map(m => ({ pid: m.pid, tipo: m.type, ram: m.memory.workingSetSize, cpu: m.cpu.percentCPUUsage })),
  conteudos: webContents.getAllWebContents().map(w => ({ id: w.id, pid: w.getOSProcessId(), tipo: w.getType() })),
}));

// Chrome DevTools Protocol numa aba (congelar, rede lenta, toque). O DevTools (F12) pode ficar aberto junto.
async function cdp(id, metodo, params) {
  const wc = webContents.fromId(id);
  if (!wc || wc.getType() !== 'webview') throw new Error('aba não encontrada');
  if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
  return wc.debugger.sendCommand(metodo, params);
}

// Congela de verdade: a aba para de rodar JavaScript e timers (Page Lifecycle "frozen").
ipcMain.handle('congelar', async (_, id, congelar) => {
  const wc = webContents.fromId(id);
  if (!wc || wc.getType() !== 'webview') return false;
  wc.setAudioMuted(congelar);
  try { await cdp(id, 'Page.setWebLifecycleState', { state: congelar ? 'frozen' : 'active' }); return true; } catch { return false; }
});

// Rede lenta por aba. Valores em bytes/s; -1 = sem limite.
const REDES = {
  normal: null,
  '4g': { latency: 40, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 },
  '3g': { latency: 300, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 },
  '2g': { latency: 800, downloadThroughput: 280e3 / 8, uploadThroughput: 256e3 / 8 },
  offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
};
ipcMain.handle('dev:rede', async (_, id, perfil) => {
  const r = REDES[perfil];
  await cdp(id, 'Network.enable', {});
  await cdp(id, 'Network.emulateNetworkConditions', r ? { offline: false, ...r } : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  return true;
});

ipcMain.handle('dev:toque', async (_, id, ligar) => {
  await cdp(id, 'Emulation.setTouchEmulationEnabled', { enabled: !!ligar, maxTouchPoints: ligar ? 5 : 1 });
  await cdp(id, 'Emulation.setEmitTouchEventsForMouse', { enabled: !!ligar, configuration: 'mobile' });
  return true;
});

ipcMain.handle('dev:sem-cache', async (_, id, ligar) => {
  await cdp(id, 'Network.enable', {});
  await cdp(id, 'Network.setCacheDisabled', { cacheDisabled: !!ligar });
  return true;
});

ipcMain.handle('rede:proprias', () => proprias);

// ---------- menu e atalhos (funcionam mesmo com o foco dentro de um site) ----------

// Mini player, plano B: quando o site não deixa o vídeo sair da página (picture in picture),
// abre a página numa janela pequena, sempre por cima de tudo e em todas as mesas (Spaces).
// YouTube vira o player "embed", que cabe inteiro na janelinha e continua do mesmo segundo.
let miniJanela = null;
// o player embutido do YouTube recusa quem não diz de onde vem (erro 153), e a interface do app não tem um endereço web
const REFERENCIA_EMBED = 'https://oceano.gg/';
ipcMain.handle('mini:abrir', (_, { url, tempo, particao } = {}) => {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return { erro: 'endereço inválido' };
  let alvo = url;
  try {
    const u = new URL(url), id = u.hostname.endsWith('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v');
    if (/(^|\.)youtube\.com$|youtu\.be$/.test(u.hostname) && id) alvo = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&start=${Math.max(0, tempo | 0)}`;
  } catch {}
  if (!miniJanela || miniJanela.isDestroyed()) {
    miniJanela = new BrowserWindow({
      width: 480, height: 270, minWidth: 240, minHeight: 135, alwaysOnTop: true, fullscreenable: false, title: 'Mini player · Oceano',
      backgroundColor: '#000000', webPreferences: { partition: typeof particao === 'string' ? particao : 'persist:oceano', sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    miniJanela.setAlwaysOnTop(true, 'floating');
    miniJanela.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    miniJanela.setAspectRatio(16 / 9);
  }
  miniJanela.loadURL(alvo, { httpReferrer: REFERENCIA_EMBED });
  miniJanela.showInactive();
  return { ok: true };
});

ipcMain.handle('mini:fechar', () => { if (miniJanela && !miniJanela.isDestroyed()) miniJanela.close(); miniJanela = null; return true; });

// a interface manda os atalhos escolhidos em oceano://atalhos ({ id: 'CmdOrCtrl+T' | '' }); até lá valem os padrões
let atalhosEscolhidos = null;
// Editor de avatar (oceano://avatar): servidor próprio em 127.0.0.1:5224, ligado na primeira vez que alguém abre o editor
let estudio = null;
ipcMain.handle('estudio:ligar', async () => {
  const noAr = () => fetch('http://127.0.0.1:5224/').then(() => true, () => false);
  if (await noAr()) return 'ligado';
  const pasta = path.join(__dirname, '..', 'terceiros', 'mesh-avatar-studio');
  if (!fs.existsSync(path.join(pasta, 'node_modules'))) return 'nao-instalado';
  if (!estudio || estudio.exitCode !== null) {
    estudio = require('child_process').spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5224', '--strictPort'], { cwd: pasta, stdio: 'ignore', shell: process.platform === 'win32' });
    app.on('will-quit', () => estudio?.kill());
  }
  return 'ligando';
});
// pedido de avatar novo: rosto em close, folha de ângulos e pixel art opcional vão para um projeto do editor
ipcMain.handle('avatar:pedido', (_, d) => {
  const nome = String(d?.nome || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(nome)) return { erro: 'nome inválido (use letras, números, - e _)' };
  if (!d?.rosto) return { erro: 'falta o rosto em close' };
  const pasta = path.join(__dirname, '..', 'terceiros', 'mesh-avatar-studio', 'projects', nome, 'entrada');
  fs.mkdirSync(pasta, { recursive: true });
  const arquivos = [];
  for (const campo of ['rosto', 'angulos', 'pixel']) {
    const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/s.exec(d[campo] || '');
    if (!m) continue;
    const nomeArq = `${campo}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    fs.writeFileSync(path.join(pasta, nomeArq), Buffer.from(m[2], 'base64'));
    arquivos.push(nomeArq);
  }
  fs.writeFileSync(path.join(pasta, 'PEDIDO.md'), `# Pedido de avatar: ${nome}\n\nArquivos: ${arquivos.join(', ')}.\nPróximo passo: seguir docs/agent-guide.md com entrada/rosto como source.png.\n`);
  return { pasta: `projects/${nome}/entrada`, arquivos };
});
ipcMain.handle('atalhos:definir', (_, mapa) => { atalhosEscolhidos = mapa && typeof mapa === 'object' ? mapa : null; menu(); return true; });

function menu() {
  const atalho = nome => () => enviar('atalho', nome);
  const tecla = (id, padrao) => {
    const a = atalhosEscolhidos && id in atalhosEscolhidos ? atalhosEscolhidos[id] : padrao;
    return typeof a === 'string' && a ? a : undefined;
  };
  const item = (id, label, padrao) => ({ label, accelerator: tecla(id, padrao), click: atalho(id) });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Oceano', submenu: [
      { role: 'about', label: 'Sobre a Navegadora' },
      item('configuracoes', 'Configurações…', 'CmdOrCtrl+,'),
      item('privacidade', 'Privacidade e segurança…', 'CmdOrCtrl+Alt+,'),
      item('atalhos', 'Atalhos…', 'CmdOrCtrl+Shift+/'),
      { type: 'separator' }, { role: 'hide' }, { role: 'quit', label: 'Sair do Oceano' },
    ] },
    { label: 'Arquivo', submenu: [
      item('nova-aba', 'Nova aba', 'CmdOrCtrl+T'),
      item('nova-efemera', 'Nova aba efêmera', 'CmdOrCtrl+Shift+N'),
      item('reabrir-aba', 'Reabrir aba fechada', 'CmdOrCtrl+Shift+T'),
      item('fechar-aba', 'Fechar aba', 'CmdOrCtrl+W'),
      item('endereco', 'Ir para o endereço', 'CmdOrCtrl+L'),
      item('copiar-link-limpo', 'Copiar link sem rastreadores', 'CmdOrCtrl+Shift+C'),
      item('comandos', 'Comandos…', 'CmdOrCtrl+K'),
    ] },
    { role: 'editMenu', label: 'Editar' },
    { label: 'Ver', submenu: [
      item('recarregar', 'Recarregar', 'CmdOrCtrl+R'),
      item('recarregar-sem-cache', 'Recarregar sem cache', 'CmdOrCtrl+Shift+R'),
      item('procurar', 'Procurar na página', 'CmdOrCtrl+F'),
      item('zoom-mais', 'Aumentar o zoom', 'CmdOrCtrl+='),
      item('zoom-menos', 'Diminuir o zoom', 'CmdOrCtrl+-'),
      item('zoom-normal', 'Zoom normal', 'CmdOrCtrl+0'),
      item('imprimir', 'Imprimir ou salvar em PDF', 'CmdOrCtrl+P'),
      item('downloads', 'Downloads', 'CmdOrCtrl+Shift+J'),
      { type: 'separator' },
      item('voltar', 'Voltar', 'CmdOrCtrl+['),
      item('avancar', 'Avançar', 'CmdOrCtrl+]'),
      item('inicio', 'Página inicial', 'CmdOrCtrl+Shift+H'),
      item('mini-player', 'Mini player', 'CmdOrCtrl+Shift+P'),
      item('historico', 'Histórico e favoritos', 'CmdOrCtrl+Y'),
      item('favoritar', 'Guardar nos favoritos', 'CmdOrCtrl+D'),
      item('leitor', 'Ler como livro', 'CmdOrCtrl+Shift+L'),
      item('leitura', 'Lista de leitura', 'CmdOrCtrl+Shift+Y'),
      { type: 'separator' },
      item('modo-jogo', 'Modo jogo', 'CmdOrCtrl+Shift+G'),
      item('barra-lateral', 'Barra lateral', 'CmdOrCtrl+Shift+B'),
      item('assistente', 'Navegadora', 'CmdOrCtrl+Shift+A'),
      item('trilha', 'Tocar ou pausar a trilha', 'Alt+M'),
      { type: 'separator' },
      item('painel-dev', 'Painel Dev', 'CmdOrCtrl+Shift+D'),
      item('devtools', 'Ferramentas do desenvolvedor', 'F12'),
      { label: 'DevTools da interface do Oceano', accelerator: 'CmdOrCtrl+Alt+Shift+I', click: () => janela?.webContents.openDevTools({ mode: 'detach' }) },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Tela cheia' },
    ] },
    { label: 'Abas', submenu: [
      item('proxima-aba', 'Próxima aba', 'Ctrl+Tab'),
      item('aba-anterior', 'Aba anterior', 'Ctrl+Shift+Tab'),
      { type: 'separator' },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => item('ir-aba-' + n, `Aba ${n}`, 'CmdOrCtrl+' + n)),
      item('ultima-aba', 'Última aba', 'CmdOrCtrl+9'),
    ] },
  ]));
}

// abre o navegador, ou traz para a frente se já estiver aberto (a Navegadora pode estar sozinha no notch)
let abrindo = null;
function abrirNavegador() {
  if (janela) {
    if (janela.isMinimized()) janela.restore();
    janela.show(); janela.focus();
    return Promise.resolve();
  }
  return abrindo ??= (async () => {
    const w = janela = new BrowserWindow({
      width: 1280, height: 820, minWidth: 640, minHeight: 480,
      title: 'Oceano', backgroundColor: '#070b1f',
      // sem barra de título nativa: os 3 botões do macOS ficam na mesma linha das abas (como Chrome/Arc)
      titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 14, y: 19 },
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, webviewTag: true },
    });
    // em tela cheia os 3 botões somem: a linha das abas volta a começar no canto
    const telaCheia = on => w.webContents.executeJavaScript(`document.documentElement.classList.toggle('tela-cheia', ${on})`).catch(() => {});
    w.on('enter-full-screen', () => telaCheia(true));
    w.on('leave-full-screen', () => telaCheia(false));
    w.on('closed', () => { janela = null; segundoPlano.aoFecharNavegador(); });
    // a interface nunca navega para fora dela mesma
    w.webContents.on('will-navigate', (ev, url) => { if (!url.startsWith('oceano-ui://')) ev.preventDefault(); });
    segundoPlano.aoAbrirNavegador();
    await w.loadURL('oceano-ui://app/app.html');
  })().finally(() => { abrindo = null; });
}
const segundoPlano = require('./segundo-plano').criarSegundoPlano({ app, Tray: require('electron').Tray, Menu: require('electron').Menu, nativeImage: require('electron').nativeImage, ativo: () => notch.ficaLigada(), abrir: abrirNavegador });

// só uma cópia do Oceano por vez: abrir de novo traz a janela existente para a frente
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { abrirNavegador(); });
app.on('activate', () => { if (app.isReady()) abrirNavegador(); });   // clique no Dock

app.whenReady().then(async () => {
  const { session } = require('electron');
  require('./agentes').esquecerGuardadas();
  // a sessão da interface: o que está fora dela (vídeos embutidos) quase não pede nada; o Stave roda código de fora, então só MIDI e copiar
  const permitido = (origem, permissao) => {
    const ferramenta = /^oceano-ui:\/\/([a-z]+)/.exec(origem)?.[1];
    if (ferramenta && ferramenta !== 'app') return (PERMISSOES_FERRAMENTA[ferramenta] || []).includes(permissao);
    if (ferramenta === 'app') return true;
    return ['fullscreen', 'mediaKeySystem'].includes(permissao);
  };
  session.defaultSession.setPermissionRequestHandler((wc, permissao, responder, det) => responder(permitido(det?.requestingUrl || wc?.getURL() || '', permissao)));
  session.defaultSession.setPermissionCheckHandler((wc, permissao, origem) => permitido(origem || wc?.getURL() || '', permissao));
  // gravar a tela (Stave → "gravar vídeo"): entrega a própria janela do Oceano, com o som do sistema
  require('electron').session.defaultSession.setDisplayMediaRequestHandler(async (_, responder) => {
    const fontes = await require('electron').desktopCapturer.getSources({ types: ['window'] });
    const minha = fontes.find(f => janela && f.id === janela.getMediaSourceId());
    if (!minha) return responder({});   // nunca grava outra janela
    responder({ video: minha, audio: 'loopback' });   // som do sistema junto (no macOS precisa do 13 ou mais novo)
  });
  seg.lerConfig();
  seg.aplicarDns();
  protocol.handle('oceano-ui', servirInterface);
  // pedidos http(s) feitos pela própria interface também entram no log
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['https://www.youtube-nocookie.com/embed/*', 'https://www.youtube.com/embed/*'] }, (d, responder) => {
    responder({ requestHeaders: { ...d.requestHeaders, Referer: REFERENCIA_EMBED } });
  });
  const levaCookies = new Set();
  session.defaultSession.webRequest.onSendHeaders(d => { if (d.requestHeaders.Cookie) levaCookies.add(d.id); });
  session.defaultSession.webRequest.onCompleted(d => {
    const comCookies = levaCookies.delete(d.id);
    if (!/^https?:/.test(d.url)) return;
    let quem = d.referrer;
    try { quem ||= d.frame?.url; } catch {}
    const { motivo, envia } = explicarPedido(d.url, quem, comCookies);
    registrarPropria(d.url, motivo, envia);
  });

  menu();
  animarIcone();
  await abrirNavegador();
  notch.registrar({
    // pode vir com um endereço (ex.: Ferramentas): com o navegador recém-aberto, espera a interface ficar pronta
    // a mensagem à IA local nasce no notch, mas a autorização é sempre na janela do Oceano
    aoPedido: async d => { const nova = !janela; await abrirNavegador(); setTimeout(() => enviar('notch:pedido', d), nova ? 1500 : 0); },
    abrirPrincipal: async url => { const nova = !janela; await abrirNavegador(); if (url) setTimeout(() => enviar('aba:nova', url), nova ? 1500 : 0); },
 aoMudar: () => segundoPlano.atualizar(),
  });   // o avatar no notch do Mac (preferências em Configurações → Notch)
  segundoPlano.atualizar();
  carregarBloqueador();
});

app.on('window-all-closed', () => app.quit());
