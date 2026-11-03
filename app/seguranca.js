// Privacidade e segurança do Oceano MVP: ajustes, DNS cifrado, perfis isolados,
// abas efêmeras, permissões dos sites, certificados e proxy.
// Tudo aqui é configuração do Chromium por sessão; nada sai do computador.

const { app, session, ipcMain, webContents } = require('electron');
const path = require('path');
const fs = require('fs');

// ---------- ajustes (userData/config.json) ----------

const PERFIS_PADRAO = [
  { id: 'pessoal', nome: 'Pessoal', cor: '#5bb6f0' },
  { id: 'trabalho', nome: 'Trabalho', cor: '#ffd166' },
  { id: 'estudos', nome: 'Estudos', cor: '#7fd6a8' },
  { id: 'robotica', nome: 'Robótica', cor: '#ff6f59' },
];
const PADRAO = { dns: { modo: 'seguro', provedor: 'quad9' }, bloqueador: true, liberados: [], perfis: PERFIS_PADRAO };

const DNS = {
  quad9: { nome: 'Quad9', onde: 'Suíça, sem fins lucrativos, não guarda IP', url: 'https://dns.quad9.net/dns-query' },
  mullvad: { nome: 'Mullvad', onde: 'Suécia, sem registros', url: 'https://dns.mullvad.net/dns-query' },
  cloudflare: { nome: 'Cloudflare', onde: 'EUA, apaga registros em 24 h', url: 'https://cloudflare-dns.com/dns-query' },
  adguard: { nome: 'AdGuard', onde: 'Chipre, já bloqueia rastreadores no DNS', url: 'https://dns.adguard-dns.com/dns-query' },
};

// Proxies prontos. Burp e mitmproxy escutam em 8080 por padrão; Tor em 9050 (Tor Browser: 9150).
const PROXIES = {
  nenhum: { nome: 'Sem proxy', regra: '' },
  burp: { nome: 'Burp Suite', regra: 'http=127.0.0.1:8080;https=127.0.0.1:8080' },
  mitm: { nome: 'mitmproxy', regra: 'http=127.0.0.1:8080;https=127.0.0.1:8080' },
  tor: { nome: 'Tor (serviço)', regra: 'socks5://127.0.0.1:9050' },
  'tor-browser': { nome: 'Tor (Tor Browser aberto)', regra: 'socks5://127.0.0.1:9150' },
  outro: { nome: 'Outro', regra: '' },
};

const arquivoConfig = () => path.join(app.getPath('userData'), 'config.json');
let config = structuredClone(PADRAO);

function lerConfig() {
  try {
    const lido = JSON.parse(fs.readFileSync(arquivoConfig(), 'utf8'));
    config = { ...structuredClone(PADRAO), ...lido, dns: { ...PADRAO.dns, ...lido.dns } };
    if (!Array.isArray(config.perfis) || !config.perfis.some(p => p.id === 'pessoal')) config.perfis = structuredClone(PERFIS_PADRAO);
    if (!Array.isArray(config.liberados)) config.liberados = [];
  } catch { config = structuredClone(PADRAO); }
}
const gravarConfig = () => fs.writeFileSync(arquivoConfig(), JSON.stringify(config, null, 2));

// ---------- partições ----------
// "Pessoal" mantém a partição antiga (persist:oceano) para não perder logins.
// Efêmeras ficam só na memória (sem "persist:") e são apagadas ao fechar a aba.

const particaoDoPerfil = id => (id === 'pessoal' ? 'persist:oceano' : 'persist:oceano-' + id);
const EFEMERA = /^oceano-efemera-\d+$/;
const ehEfemera = p => EFEMERA.test(p);
const particaoValida = p => ehEfemera(p) || config.perfis.some(x => particaoDoPerfil(x.id) === p);
const perfilDaParticao = p => config.perfis.find(x => particaoDoPerfil(x.id) === p);

// ---------- ganchos que o main.js preenche ----------

let ganchos = { registrarPropria() {}, enviar() {}, aoPreparar() {} };

// ---------- bloqueador (um só motor de filtros para todas as sessões) ----------

const CANAIS_GHOSTERY = ['@ghostery/adblocker/inject-cosmetic-filters', '@ghostery/adblocker/is-mutation-observer-enabled'];
let bloqueador = null;
const bloqueio18 = require('./bloqueio-18');
const gravacao = require('./gravacao');
const preparadas = new Map();   // partição → sessão
// cada sessão só tem um ouvinte de pedidos: sem o bloqueador de anúncios, este garante o 18+
const so18 = ses => ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => cb(bloqueio18.barra(d) ? { cancel: true } : {}));

function bloquearEm(ses) {
  // o Ghostery registra os mesmos canais de IPC a cada sessão; eles são do motor, não da sessão
  for (const c of CANAIS_GHOSTERY) ipcMain.removeHandler(c);
  bloqueador.enableBlockingInSession(ses);
}

function aplicarBloqueador() {
  if (!bloqueador) return;
  for (const ses of preparadas.values()) { try { bloqueador.disableBlockingInSession(ses); } catch {} }
  for (const ses of preparadas.values()) if (config.bloqueador) bloquearEm(ses); else so18(ses);
}

// Sites liberados: nas páginas deles nada é bloqueado (nem pedido, nem filtro de aparência).
// Vale o site e os subdomínios dele; quem decide é a página aberta na aba, não quem serve o anúncio.
const hostDe = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const liberado = host => !!host && config.liberados.some(l => host === l || host.endsWith('.' + l));
const paginaDe = details => {
  const wc = details.webContents || (details.webContentsId && webContents.fromId(details.webContentsId));
  try { return hostDe(wc?.getURL?.() || ''); } catch { return ''; }
};

function definirBloqueador(b) {
  bloqueador = b;
  // o motor chama estes métodos a cada pedido: embrulhamos para respeitar os sites liberados
  const pedido = b.onBeforeRequest, aparencia = b.onInjectCosmeticFilters;
  b.onBeforeRequest = (details, cb) => (bloqueio18.barra(details) ? cb({ cancel: true }) : liberado(paginaDe(details)) ? cb({}) : pedido(details, cb));
  b.onInjectCosmeticFilters = async (ev, url, msg) => (liberado(hostDe(url)) ? undefined : aparencia(ev, url, msg));
  aplicarBloqueador();
}

ipcMain.handle('bloqueador:liberar', (_, url, liberar) => {
  const host = hostDe(url);
  if (!host) return config.liberados;
  config.liberados = config.liberados.filter(l => l !== host);
  if (liberar) config.liberados.push(host);
  gravarConfig();
  return config.liberados;
});

// ---------- DNS cifrado (DNS over HTTPS) ----------

function aplicarDns() {
  const p = DNS[config.dns.provedor] || DNS.quad9;
  if (config.dns.modo === 'desligado') {
    app.configureHostResolver({ secureDnsMode: 'off' });
    return;
  }
  app.configureHostResolver({ secureDnsMode: config.dns.modo === 'seguro' ? 'secure' : 'automatic', secureDnsServers: [p.url] });
  ganchos.registrarPropria(p.url, `DNS cifrado (${p.nome}): descobrir o endereço dos sites que você abre`, 'nomes dos sites, cifrados por HTTPS');
}

// ---------- user agent sem "Electron" (menos impressão digital, menos site quebrado) ----------

const uaLimpo = ua => ua.replace(/ (Electron|oceano-app)\/\S+/g, '');

// ---------- permissões dos sites ----------
// Por padrão nada é concedido em silêncio: a interface pergunta. A resposta vale
// até fechar o Oceano (ou até você esquecer em oceano://privacidade).

const SEMPRE = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);
const NOMES_PERMISSAO = {
  media: 'câmera ou microfone', geolocation: 'sua localização', notifications: 'mandar notificações',
  midi: 'dispositivos MIDI', midiSysex: 'dispositivos MIDI (acesso total)', 'clipboard-read': 'ler a área de transferência',
  'display-capture': 'gravar sua tela', openExternal: 'abrir outro programa', hid: 'dispositivos HID', serial: 'portas seriais',
  usb: 'dispositivos USB', 'idle-detection': 'saber se você está ausente', 'window-management': 'mexer nas janelas',
  'storage-access': 'cookies dentro de outro site', 'top-level-storage-access': 'cookies dentro de outro site',
  keyboardLock: 'prender o teclado', fileSystem: 'arquivos do computador', 'speaker-selection': 'escolher a saída de som',
};
const decisoes = new Map();   // "partição|origem|permissão" → true/false
const pendentes = new Map();  // id → { callback, chave }
let proximoPedido = 1;

// esquemas próprios têm origem "null" no URL do JS: usa esquema + host
function origemDe(url) { try { const u = new URL(url); return u.origin !== 'null' ? u.origin : `${u.protocol}//${u.host}`; } catch { return url || '?'; } }

function pedirPermissao(particao, wc, permissao, responder, detalhes) {
  // câmera e microfone: toda concessão acende o aviso na barra e na aba
  const callback = ok => { if (ok && permissao === 'media') gravacao.marcar(wc, detalhes?.mediaTypes, origemDe(detalhes?.requestingUrl || wc?.getURL())); responder(ok); };
  if (SEMPRE.has(permissao)) return callback(true);
  const origem = origemDe(detalhes?.requestingUrl || wc?.getURL());
  const tipo = permissao === 'media' && detalhes?.mediaTypes?.length
    ? detalhes.mediaTypes.map(t => (t === 'video' ? 'câmera' : 'microfone')).join(' e ') : NOMES_PERMISSAO[permissao] || permissao;
  const chave = `${particao}|${origem}|${permissao}`;
  if (decisoes.has(chave)) return callback(decisoes.get(chave));
  const id = proximoPedido++;
  pendentes.set(id, { callback, chave });
  ganchos.enviar('permissao:pedido', { id, wcId: wc?.id, origem, permissao, tipo });
}

ipcMain.handle('permissao:responder', (_, id, permitir) => {
  const p = pendentes.get(id);
  if (!p) return false;
  pendentes.delete(id);
  decisoes.set(p.chave, !!permitir);
  p.callback(!!permitir);
  return true;
});

ipcMain.handle('permissao:lista', () => [...decisoes].map(([chave, permitida]) => {
  const [particao, origem, permissao] = chave.split('|');
  return { chave, origem, permissao, tipo: NOMES_PERMISSAO[permissao] || permissao, permitida, perfil: perfilDaParticao(particao)?.nome || 'efêmera' };
}));

ipcMain.handle('permissao:esquecer', (_, chave) => (chave ? decisoes.delete(chave) : decisoes.clear(), true));

// ---------- certificados (para o "cadeado" mostrar quem emitiu e quando vence) ----------

const certificados = new Map();   // host → resumo

function guardarCertificado(req) {
  const c = req.certificate;
  if (!c) return;
  certificados.set(req.hostname, {
    host: req.hostname, valido: req.errorCode === 0, erro: req.verificationResult,
    emissor: c.issuerName, assunto: c.subjectName, de: c.validStart * 1000, ate: c.validExpiry * 1000,
    impressao: c.fingerprint, cadeia: (() => { const n = []; for (let x = c.issuerCert; x && n.length < 4; x = x.issuerCert) n.push(x.subjectName); return n; })(),
  });
}

ipcMain.handle('certificado', (_, host) => certificados.get(host) || null);

// ---------- proxy por perfil ----------

function regraProxy(perfil) {
  const px = perfil?.proxy;
  if (!px || px.tipo === 'nenhum') return '';
  return px.tipo === 'outro' ? String(px.regra || '').trim() : PROXIES[px.tipo]?.regra || '';
}

async function aplicarProxy(particao) {
  const ses = preparadas.get(particao);
  if (!ses) return;
  const regra = regraProxy(perfilDaParticao(particao));
  await ses.setProxy(regra ? { proxyRules: regra, proxyBypassRules: '<-loopback>' } : { mode: 'direct' });
  await ses.closeAllConnections();
}

// ---------- preparar uma sessão antes da primeira <webview> usá-la ----------

function prepararSessao(particao) {
  if (preparadas.has(particao)) return preparadas.get(particao);
  const ses = session.fromPartition(particao);
  preparadas.set(particao, ses);
  so18(ses);
  ses.setUserAgent(uaLimpo(ses.getUserAgent()));
  // no macOS o corretor é o do sistema; nos outros o Chromium baixaria dicionários de um servidor do Google
  if (process.platform !== 'darwin') ses.setSpellCheckerEnabled(false);
  ses.setPermissionRequestHandler((wc, permissao, cb, det) => pedirPermissao(particao, wc, permissao, cb, det));
  ses.setPermissionCheckHandler((wc, permissao, origem) => {
    if (SEMPRE.has(permissao)) return true;
    return decisoes.get(`${particao}|${origemDe(origem)}|${permissao}`) === true;
  });
  ses.setCertificateVerifyProc((req, cb) => {
    guardarCertificado(req);
    const perfil = perfilDaParticao(particao);
    // só com proxy de interceptação ligado e a opção marcada neste perfil (Burp/mitmproxy assinam tudo com a própria CA)
    if (req.errorCode !== 0 && perfil?.proxy?.aceitarCert && regraProxy(perfil)) return cb(0);
    cb(-3);   // -3 = usar a verificação normal do Chromium
  });
  ses.on('will-download', (_e, item) => require('./downloads').acompanhar(item));
  ganchos.aoPreparar(ses, particao);
  if (bloqueador && config.bloqueador) bloquearEm(ses);
  aplicarProxy(particao);
  return ses;
}

// toda <webview>: só partições conhecidas e só páginas da web
function webviewPermitida(particao, src) {
  return particaoValida(particao) && /^(https?:|about:blank)/.test(src || 'about:blank');
}

// leitor: imagens da matéria pela mesma sessão (perfil) da aba, para o livro e para ler sem internet
ipcMain.handle('leitor:imagem', async (_, particao, url) => {
  if (!particaoValida(particao) || !/^https?:\/\//.test(String(url))) return null;
  try {
    const r = await session.fromPartition(particao).fetch(url, { headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/*' } });
    const tipo = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!r.ok || !/^image\/(png|jpeg|webp|gif|avif)$/.test(tipo)) return null;
    const dados = Buffer.from(await r.arrayBuffer());
    return dados.length > 8e6 ? null : `data:${tipo};base64,${dados.toString('base64')}`;
  } catch { return null; }
});

ipcMain.handle('efemera:apagar', async (_, particao) => {
  if (!ehEfemera(particao)) return false;
  const ses = preparadas.get(particao) || session.fromPartition(particao);
  await ses.clearStorageData();
  await ses.clearCache();
  try { bloqueador?.disableBlockingInSession(ses); } catch {}
  preparadas.delete(particao);
  return true;
});

// ---------- ajustes vistos pela interface ----------

ipcMain.handle('config:ler', () => ({
  config, dns: DNS, proxies: Object.fromEntries(Object.entries(PROXIES).map(([k, v]) => [k, v.nome])),
  particoes: Object.fromEntries(config.perfis.map(p => [p.id, particaoDoPerfil(p.id)])),
}));

ipcMain.handle('config:gravar', async (_, novo) => {
  const antes = JSON.stringify(config.perfis);
  if (novo.dns) config.dns = { modo: ['seguro', 'automatico', 'desligado'].includes(novo.dns.modo) ? novo.dns.modo : 'seguro', provedor: DNS[novo.dns.provedor] ? novo.dns.provedor : 'quad9' };
  if (typeof novo.bloqueador === 'boolean') config.bloqueador = novo.bloqueador;
  if (Array.isArray(novo.liberados)) config.liberados = [...new Set(novo.liberados.map(h => String(h).toLowerCase().replace(/[^a-z0-9.-]/g, '')).filter(Boolean))];
  if (Array.isArray(novo.perfis)) {
    const vistos = new Set();
    config.perfis = novo.perfis.map(p => ({
      id: String(p.id).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'perfil',
      nome: String(p.nome || 'Perfil').slice(0, 24),
      cor: /^#[0-9a-f]{6}$/i.test(p.cor) ? p.cor : '#5bb6f0',
      proxy: p.proxy && PROXIES[p.proxy.tipo] ? { tipo: p.proxy.tipo, regra: String(p.proxy.regra || '').slice(0, 200), aceitarCert: !!p.proxy.aceitarCert } : undefined,
    })).filter(p => !vistos.has(p.id) && vistos.add(p.id));
    if (!config.perfis.some(p => p.id === 'pessoal')) config.perfis.unshift(structuredClone(PERFIS_PADRAO[0]));
  }
  gravarConfig();
  if (novo.dns) aplicarDns();
  if (typeof novo.bloqueador === 'boolean') aplicarBloqueador();
  if (JSON.stringify(config.perfis) !== antes) for (const p of preparadas.keys()) await aplicarProxy(p);
  return true;
});

ipcMain.handle('perfil:apagar-dados', async (_, id) => {
  const ses = session.fromPartition(particaoDoPerfil(id));
  await ses.clearStorageData();
  await ses.clearCache();
  return true;
});

ipcMain.handle('cache:limpar', async (_, particao) => {
  if (!particaoValida(particao)) return false;
  await session.fromPartition(particao).clearCache();
  return true;
});

// ---------- o que o Chromium deixaria ligado e o Oceano desliga ----------

function desligarTelemetria() {
  // Electron não traz os serviços do Google (sync, métricas, Safe Browsing remoto), mas o
  // Chromium ainda tem estes caminhos: desligamos todos por linha de comando.
  app.commandLine.appendSwitch('no-pings');                          // <a ping>: avisar terceiros a cada clique
  app.commandLine.appendSwitch('disable-domain-reliability');        // relatórios de falha de rede para o Google
  app.commandLine.appendSwitch('disable-breakpad');                  // relatórios de travamento
  app.commandLine.appendSwitch('disable-component-update');          // baixar componentes por conta própria
  app.commandLine.appendSwitch('disable-sync');
  app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication,MediaRouter,OptimizationHints,InterestFeedContentSuggestions,PrivacySandboxSettings4,BrowsingTopics,FedCm');
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');   // WebRTC não vaza o IP da rede local
}

const TELEMETRIA = [
  ['Métricas de uso (UMA) e relatórios de travamento', 'não existem no Oceano'],
  ['Contagem anônima de uso do Oceano', 'só com a sua autorização: um sinal por dia, sem identificador'],
  ['Sincronização com conta Google', 'não existe'],
  ['Safe Browsing remoto (manda endereços ao Google)', 'não existe'],
  ['Pings de auditoria de links (<a ping>)', 'bloqueados'],
  ['Relatórios de confiabilidade de rede (Domain Reliability)', 'desligados'],
  ['Atualização automática de componentes', 'desligada'],
  ['Comunicação do preenchimento automático com servidores', 'desligada'],
  ['Topics, Privacy Sandbox e FedCM (anúncios por interesse)', 'desligados'],
  ['WebRTC revelando o IP da sua rede local', 'bloqueado'],
  ['"Electron" no user agent (impressão digital)', 'removido'],
  ['Dicionário do corretor baixado do Google', process.platform === 'darwin' ? 'não usado (macOS usa o do sistema)' : 'desligado'],
];
ipcMain.handle('telemetria', () => TELEMETRIA);

module.exports = {
  lerConfig, aplicarDns, prepararSessao, webviewPermitida, definirBloqueador, desligarTelemetria,
  particaoDoPerfil, ehEfemera, preparadas, certificados,
  definirGanchos: g => { ganchos = { ...ganchos, ...g }; },
  config: () => config,
};
