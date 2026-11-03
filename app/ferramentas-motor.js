// 🧰 Motor das ferramentas de mídia: recortar, otimizar, GIF, montar vídeos (ffmpeg) e baixar por link (yt-dlp).
// Só Node puro, sem Electron: sobe um servidor em 127.0.0.1 com token no caminho; a ação vem por ?api=acao.
// Cada id tem uma subpasta em pasta/temporarios; os dados dos jobs ficam só na memória e tudo morre com o motor.

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { pipeline } = require('stream');

const MAX_MB = 2048;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const BLOCO = 16 * 1024 * 1024;           // tamanho do pedaço de envio informado em ?api=status
const MAX_CORPO = BLOCO + 1024 * 1024;    // um pedaço + o envelope do formulário
const TTL = 3 * 3600 * 1000;              // sem uso por 3 h: apaga
const PARADO = 180 * 1000;                // 3 min sem avançar: dá erro e mata o processo
const CONVERSAO_MAX = 900 * 1000;
const MAX_PROCESSOS = 3;                  // ffmpeg/yt-dlp rodando ao mesmo tempo; o resto espera na fila
const MAX_FILA = 32;
const MAX_LEITURAS = 4;                   // "ffmpeg -i" rápidos, para ler as informações do arquivo
const LIMITE_NUM = 1e7;                   // nenhum tempo ou tamanho vindo do cliente passa disso

const ORIGENS = new Set(['oceano-ui://app', 'oceano-ui://ferramentas', 'http://localhost:5216']);
const EXT_ENVIO = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'ogv', '3gp', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'opus']);
const MIME_SAIDA = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo', ogv: 'video/ogg', '3gp': 'video/3gpp', gif: 'image/gif' };
const MIME_ARQUIVO = { mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime', gif: 'image/gif', webp: 'image/webp', apng: 'image/apng' };

// o arquivo vem de fora: nada de playlist (HLS, concat...) que faria o ffmpeg abrir outros arquivos ou a rede
const GUARDA = ['-protocol_whitelist', 'file', '-format_whitelist', 'mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,ogg,mp3,wav,aac,flac,gif,apng,webp_pipe'];

const HOSTS = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com|instagram\.com|pinterest\.(?:com|ca|co\.uk|uk|fr|de|ch|at|it|es|pt|nl|be|dk|ie|ru|jp|cl|co|nz|kr|co\.kr|com\.au|com\.mx|mx|ph|th|vn|com\.vn|in|co\.in|pe|com\.pe|ec|com\.ec|hu|id|tw|co\.at|co\.nz|info|com\.uy|com\.py|com\.bo)|pin\.it|vimeo\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|fb\.watch)$/;

const SEM_FFMPEG = 'ffmpeg indisponível — instale o ffmpeg pelo gerenciador de pacotes do seu sistema (brew, winget ou apt) e tente de novo';
const SEM_YTDLP = 'yt-dlp não encontrado — instale o yt-dlp pelo gerenciador de pacotes do seu sistema (brew, winget ou pip) e tente de novo';

class Falha extends Error {
  constructor(mensagem, status = 400) { super(mensagem); this.status = status; }
}

// ---------- números e campos vindos do cliente ----------
const de = (mapa, chave, padrao) => (Object.hasOwn(mapa, chave) ? mapa[chave] : padrao);
function num(v, padrao = 0) {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : typeof v === 'boolean' ? +v : NaN;
  return Number.isFinite(n) ? Math.max(-LIMITE_NUM, Math.min(LIMITE_NUM, n)) : padrao;
}
const inteiro = (v, padrao = 0) => Math.trunc(num(v, padrao));
const f3 = (n) => n.toFixed(3);
const hex = (n) => crypto.randomBytes(n).toString('hex');
const objeto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
function lerJson(texto) { try { return JSON.parse(texto); } catch { return null; } }

function exigirId(v) {
  const id = String(v ?? '');
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Falha('Identificador inválido');
  return id;
}

// Trechos [início, fim] do original, na ordem final ("segments" em JSON, ou start/end)
function lerTrechos(c) {
  let cru = lerJson(c.get('segments') ?? '');
  if (!Array.isArray(cru) || !cru.length) cru = [[c.get('start') ?? 0, c.get('end') ?? 0]];
  const trechos = [];
  for (const t of cru.slice(0, 200)) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const s = Math.max(0, num(t[0]));
    const e = num(t[1]);
    if (e - s >= 0.02) trechos.push([s, e]);
  }
  if (!trechos.length) throw new Falha('Recorte inválido');
  return trechos;
}
const somaTrechos = (trechos) => trechos.reduce((soma, [s, e]) => soma + (e - s), 0);

// Parte [t0, t0+dur] do tempo final, convertida em trechos do original
function fatiaDaSequencia(trechos, t0, dur) {
  const saida = [];
  let o = 0;
  for (const [s, e] of trechos) {
    const d = e - s;
    const a = Math.max(t0, o);
    const b = Math.min(t0 + dur, o + d);
    if (b - a > 0.01) saida.push([s + (a - o), s + (b - o)]);
    o += d;
  }
  return saida;
}

function lerOpcoesGif(c) {
  let largura = inteiro(c.get('gw'), 480);
  if (![0, 960, 800, 640, 480, 360, 320, 240, 160].includes(largura)) largura = 480;
  let cores = inteiro(c.get('gcolors'), 128);
  if (![256, 128, 64, 32, 16, 8].includes(cores)) cores = 128;
  let dither = String(c.get('gdither') ?? 'bayer');
  if (!['bayer', 'floyd', 'none'].includes(dither)) dither = 'bayer';
  return { largura, fps: Math.max(2, Math.min(30, inteiro(c.get('gfps'), 12))), cores, dither };
}

// GIF com paleta própria (palettegen + paletteuse): bem melhor e menor que a conversão direta
function argsGif(src, trechos, g, saida, extra = []) {
  const args = ['-hide_banner', '-nostdin', '-y'];
  let cadeia = '';
  trechos.forEach(([s, e], k) => {
    args.push('-ss', f3(s), '-t', f3(e - s), ...GUARDA, '-i', src);
    cadeia += `[${k}:v:0]`;
  });
  const n = trechos.length;
  const pre = n > 1 ? `${cadeia}concat=n=${n}:v=1:a=0[cv];[cv]` : '[0:v:0]';
  const escala = g.largura ? `scale='min(${g.largura},iw)':-1:flags=lanczos,` : '';
  const dither = { bayer: 'bayer:bayer_scale=3', floyd: 'floyd_steinberg', none: 'none' }[g.dither];
  const grafo = `${pre}fps=${g.fps},${escala}split[g0][g1];[g0]palettegen=max_colors=${g.cores}:stats_mode=diff[pal];`
    + `[g1][pal]paletteuse=dither=${dither}:diff_mode=rectangle[v]`;
  return [...args, '-filter_complex', grafo, '-map', '[v]', '-an', '-loop', '0', ...extra, saida];
}

// Bitrates e áudio saem do texto do "ffmpeg -i" (não depende de ffprobe)
function lerInfoDoFfmpeg(texto) {
  const info = { audio: /Stream #\S+.*: Audio:/.test(texto), vkbps: 0, akbps: 0, kbps: 0 };
  info.mono = /Stream #\S+.*: Audio:[^\n]*, mono,/.test(texto);
  let m;
  if ((m = texto.match(/Stream #\S+.*: Video: (\w+)[^,\n]*, (\w+)/))) { info.vcodec = m[1]; info.pix = m[2]; }
  if ((m = texto.match(/Stream #\S+.*: Audio: (\w+)/))) info.acodec = m[1];
  if ((m = texto.match(/Stream #\S+.*: Video:.*?(\d+) kb\/s/))) info.vkbps = +m[1];
  if ((m = texto.match(/Stream #\S+.*: Audio:.*?(\d+) kb\/s/))) info.akbps = +m[1];
  if ((m = texto.match(/bitrate: (\d+) kb\/s/))) info.kbps = +m[1];
  if ((m = texto.match(/, ([\d.]+) fps/))) info.fps = parseFloat(m[1]);
  if ((m = texto.match(/Duration: (\d+):(\d+):([\d.]+)/))) info.duration = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  if ((m = texto.match(/Stream #\S+.*: Video:.*?, (\d{2,5})x(\d{2,5})/))) { info.width = +m[1]; info.height = +m[2]; }
  return info;
}

// Mono vira estéreo copiando o canal nos dois lados (o aformat sozinho baixaria 3 dB)
const estereo = (info) => (info.mono ? 'pan=stereo|c0=c0|c1=c0,' : '');

// ---------- corpo do pedido ----------
function lerCorpo(req) {
  return new Promise((resolver, rejeitar) => {
    const pedacos = [];
    let total = 0;
    let estourou = +req.headers['content-length'] > MAX_CORPO;
    if (estourou) { req.resume(); rejeitar(new Falha('Bloco maior que o limite', 413)); return; }
    req.on('data', (d) => {
      if (estourou) return;
      total += d.length;
      if (total > MAX_CORPO) { estourou = true; pedacos.length = 0; rejeitar(new Falha('Bloco maior que o limite', 413)); return; }
      pedacos.push(d);
    });
    req.on('end', () => { if (!estourou) resolver(Buffer.concat(pedacos)); });
    req.on('error', rejeitar);
    req.on('close', () => { if (!req.complete) rejeitar(new Falha('Envio interrompido')); });
  });
}

function lerFormulario(buf, tipo) {
  const campos = new Map();
  const arquivos = new Map();
  if (/^application\/x-www-form-urlencoded/i.test(tipo)) {
    for (const [k, v] of new URLSearchParams(buf.toString('utf8'))) campos.set(k, v);
    return { campos, arquivos };
  }
  const b = /^multipart\/form-data/i.test(tipo) && tipo.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  if (!b) return { campos, arquivos };
  const marca = `--${b[1] || b[2]}`;
  let p = buf.indexOf(marca);
  for (let partes = 0; p >= 0 && partes < 64; partes++) {
    p += marca.length;
    if (buf[p] === 45 && buf[p + 1] === 45) break; // "--": fim do formulário
    const fimCab = buf.indexOf('\r\n\r\n', p);
    if (fimCab < 0) break;
    const cab = buf.toString('utf8', p, fimCab);
    const ini = fimCab + 4;
    const fim = buf.indexOf(`\r\n${marca}`, ini);
    if (fim < 0) break;
    const disp = (cab.match(/content-disposition:[^\r\n]*/i) || [''])[0];
    const nome = disp.match(/(?:^|[;\s])name="([^"]*)"/i);
    if (nome) {
      if (/(?:^|[;\s])filename\*?=/i.test(disp)) arquivos.set(nome[1], buf.subarray(ini, fim));
      else campos.set(nome[1], buf.toString('utf8', ini, fim));
    }
    p = fim + 2;
  }
  return { campos, arquivos };
}

// ---------- fila de vagas ----------
function criarVagas(max) {
  const espera = [];
  let ocupadas = 0;
  return {
    pedir() {
      if (ocupadas < max) { ocupadas++; return Promise.resolve(); }
      return new Promise((r) => espera.push(r));
    },
    soltar() { const r = espera.shift(); if (r) r(); else ocupadas--; },
    get ocupadas() { return ocupadas; },
    get fila() { return espera.length; },
  };
}

function matarArvore(filho, sinal) {
  if (!filho || !filho.pid || filho.exitCode !== null || filho.signalCode !== null) return;
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/pid', String(filho.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }).on('error', () => {}); } catch {}
  } else {
    try { process.kill(-filho.pid, sinal); } catch {} // grupo próprio: leva junto o ffmpeg que o yt-dlp abre
  }
}

// ---------- entrega de arquivos, com Range para o <video> navegar ----------
function nomeParaCabecalho(nome, modo) {
  const ascii = nome.replace(/[^A-Za-z0-9\-_. ]+/g, '_');
  const codificado = encodeURIComponent(nome).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${modo}; filename="${ascii}"; filename*=UTF-8''${codificado}`;
}

function entregar(req, res, arquivo, tipo, disposicao) {
  const tamanho = fs.statSync(arquivo).size;
  res.setHeader('Content-Type', tipo);
  res.setHeader('Accept-Ranges', 'bytes');
  if (disposicao) res.setHeader('Content-Disposition', disposicao);
  let inicio = 0;
  let fim = tamanho - 1;
  let parcial = false;
  // mais de um intervalo (ou sintaxe estranha) cai na entrega inteira, como a norma permite
  const r = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? '').trim());
  if (r && (r[1] !== '' || r[2] !== '')) {
    if (r[1] === '') {
      const n = Number(r[2]);
      inicio = Math.max(0, tamanho - n);
      if (n === 0) inicio = tamanho;
    } else {
      inicio = Number(r[1]);
      if (r[2] !== '') fim = Math.min(fim, Number(r[2]));
    }
    if (inicio >= tamanho || inicio > fim) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${tamanho}`);
      res.setHeader('Content-Length', 0);
      res.end();
      return;
    }
    parcial = true;
  }
  res.statusCode = parcial ? 206 : 200;
  if (parcial) res.setHeader('Content-Range', `bytes ${inicio}-${fim}/${tamanho}`);
  const quantos = tamanho ? fim - inicio + 1 : 0;
  res.setHeader('Content-Length', quantos);
  if (req.method === 'HEAD' || !quantos) { res.end(); return; }
  pipeline(fs.createReadStream(arquivo, { start: inicio, end: fim }), res, () => {});
}

// ---------- o motor ----------
async function criarMotor({ pasta, token, porta = 0, buscarBinario } = {}) {
  if (!pasta || !path.isAbsolute(pasta)) throw new Error('pasta precisa ser um caminho absoluto');
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{16,}$/.test(token)) throw new Error('token inválido');
  const acharNoSistema = buscarBinario || ((nome) => nome);
  const hashToken = crypto.createHash('sha256').update(token).digest();

  // os dados dos jobs só existem na memória: o que sobrou de uma execução anterior (cópia de cookies inclusive) é lixo
  const TEMP = path.join(pasta, 'temporarios');
  fs.mkdirSync(pasta, { recursive: true });
  fs.rmSync(TEMP, { recursive: true, force: true, maxRetries: 3 });
  fs.mkdirSync(TEMP, { recursive: true, mode: 0o700 });

  const registros = new Map();
  const vivos = new Set();
  const vagas = criarVagas(MAX_PROCESSOS);
  const leituras = criarVagas(MAX_LEITURAS);
  const binarios = new Map();
  let parando = false;
  let portaReal = 0;
  let ultimaVarredura = Date.now();

  const arq = (id, nome) => path.join(TEMP, id, nome);
  const existe = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

  function novoRegistro(id, dados) {
    fs.mkdirSync(path.join(TEMP, id), { mode: 0o700 });
    const m = { id, nome: 'video.mp4', ext: 'mp4', proximo: 0, bytes: 0, job: null, fetch: null, amostra: null, tocado: Date.now(), ...dados };
    registros.set(id, m);
    return m;
  }
  function pegar(id) {
    const m = registros.get(id);
    if (!m) throw new Falha('Arquivo não encontrado no servidor (expirou?)', 404);
    m.tocado = Date.now();
    return m;
  }

  // mensagens de erro não mostram caminhos da máquina
  function limpar(texto) {
    return String(texto)
      .split(TEMP + path.sep).join('')
      .replace(/\b[a-f0-9]{24}[\\/]/g, '')
      .split(pasta).join('')
      .split(os.homedir()).join('~');
  }

  // ---------- binários ----------
  const ARGS_VERSAO = { ffmpeg: ['-hide_banner', '-version'], ffprobe: ['-hide_banner', '-version'], 'yt-dlp': ['--version'] };
  function ambiente() {
    // só o necessário: os programas não recebem as chaves que estiverem no ambiente do app
    const env = {};
    for (const k of ['HOME', 'USER', 'LANG', 'LC_ALL', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'SYSTEMROOT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PATHEXT', 'ComSpec']) {
      if (process.env[k] !== undefined) env[k] = process.env[k];
    }
    const dirs = [...binarios.values()].filter((b) => b.bin && path.isAbsolute(b.bin)).map((b) => path.dirname(b.bin));
    env.PATH = [...new Set(dirs), process.env.PATH || ''].filter(Boolean).join(path.delimiter);
    env.PYTHONUTF8 = '1';
    return env;
  }
  function versao(bin, nome) {
    return new Promise((r) => {
      const env = ambiente();
      if (path.isAbsolute(bin)) env.PATH = [path.dirname(bin), env.PATH].filter(Boolean).join(path.delimiter);
      execFile(bin, ARGS_VERSAO[nome], { timeout: 20000, windowsHide: true, maxBuffer: 1024 * 1024, env }, (erro, saida) => {
        if (erro) return r(null);
        const texto = String(saida);
        if (nome === 'yt-dlp') return r(texto.trim() ? texto.trim().split('\n')[0] : null);
        const m = texto.match(new RegExp(`${nome} version (\\S+)`));
        r(texto ? (m ? m[1] : '?') : null);
      });
    });
  }
  // o que achou fica guardado; o que não achou é procurado de novo (a pessoa pode instalar com o app aberto)
  async function achar(nome) {
    const c = binarios.get(nome);
    if (c && c.bin) return c;
    if (c && c.pendente) return c.pendente;
    if (c && Date.now() - c.quando < 15000) return null;
    const pendente = (async () => {
      let bin = null;
      try { bin = await acharNoSistema(nome); } catch {}
      const v = bin ? await versao(bin, nome) : null;
      const achado = v ? { bin, versao: v } : { quando: Date.now() };
      binarios.set(nome, achado);
      return v ? achado : null;
    })();
    binarios.set(nome, { pendente });
    return pendente;
  }

  // ---------- processos ----------
  function rodar(bin, args, { cwd, aoSaida, aoErro } = {}) {
    const p = {
      filho: null, cancelado: false, naFila: true, comecou: 0, ultimo: 0, cauda: '', acabou: false, timer: null,
      matar(sinal = 'SIGTERM') {
        p.cancelado = true;
        matarArvore(p.filho, sinal);
        if (sinal !== 'SIGKILL' && p.filho) {
          p.timer = setTimeout(() => matarArvore(p.filho, 'SIGKILL'), 3000);
          p.timer.unref();
        }
      },
    };
    p.fim = (async () => {
      await vagas.pedir();
      try {
        if (p.cancelado || parando) return { codigo: null };
        p.naFila = false;
        p.comecou = p.ultimo = Date.now();
        vivos.add(p);
        return await new Promise((resolver) => {
          let filho;
          try {
            filho = spawn(bin, args, { cwd, env: ambiente(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
          } catch (e) { resolver({ codigo: -1, erro: e.message }); return; }
          p.filho = filho;
          filho.stdout.on('data', (d) => { p.ultimo = Date.now(); if (aoSaida) aoSaida(String(d)); });
          filho.stderr.on('data', (d) => {
            p.ultimo = Date.now();
            const t = String(d);
            p.cauda = (p.cauda + t).slice(-4096);
            if (aoErro) aoErro(t);
          });
          filho.on('error', (e) => resolver({ codigo: -1, erro: e.message }));
          filho.on('close', (codigo) => resolver({ codigo }));
        });
      } finally {
        vivos.delete(p);
        clearTimeout(p.timer);
        vagas.soltar();
        p.acabou = true;
      }
    })();
    return p;
  }
  function conferirFila() {
    if (vagas.fila >= MAX_FILA) throw new Falha('Muitos processos na fila — espere um terminar', 429);
  }

  async function lerInfo(ff, src) {
    await leituras.pedir();
    try {
      return await new Promise((r) => {
        execFile(ff.bin, ['-hide_banner', '-nostdin', ...GUARDA, '-i', src], { timeout: 30000, windowsHide: true, maxBuffer: 4 * 1024 * 1024, env: ambiente() },
          (_erro, _saida, texto) => r(lerInfoDoFfmpeg(String(texto || ''))));
      });
    } finally { leituras.soltar(); }
  }

  // ---------- jobs do ffmpeg ----------
  function mensagemDoJob(job) {
    const fim = job.resultado;
    if (job.erroFixo) return job.erroFixo;
    if (fim.erro) return limpar(`ffmpeg falhou: ${fim.erro}`);
    if (fim.codigo === null || fim.codigo >= 128) return 'O ffmpeg foi interrompido antes de terminar.';
    const linhas = job.proc.cauda.slice(-600).split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = linhas.length - 1; i >= 0; i--) {
      if (/error|invalid|no such|not found|unknown|failed|denied/i.test(linhas[i])) return limpar(linhas[i]);
    }
    return linhas.length ? limpar(linhas[linhas.length - 1]) : 'ffmpeg falhou';
  }

  function lancarJob(m, jobId, ff, args, info) {
    const job = { id: jobId, comecou: Date.now(), resultado: null, progresso: 0, erroFixo: '', fontes: [m.id], ...info };
    let resto = '';
    job.proc = rodar(ff.bin, args, {
      aoSaida(t) {
        resto = (resto + t).slice(-2048);
        const achados = [...resto.matchAll(/out_time_(?:us|ms)=(\d+)/g)];
        if (achados.length) job.progresso = Math.min(0.99, Number(achados[achados.length - 1][1]) / 1e6 / Math.max(0.001, job.duracao));
      },
    });
    job.proc.fim.then((r) => { job.resultado = r; m.tocado = Date.now(); });
    m.job = job;
    return job;
  }

  function descartarJob(m) {
    const job = m.job;
    if (!job) return;
    m.job = null;
    if (!job.resultado) job.proc.matar();
    fs.rmSync(arq(m.id, `${job.id}.out.${job.ext}`), { force: true });
  }

  function conferirParado(job) {
    if (job.resultado || job.erroFixo || job.proc.naFila) return;
    if (Date.now() - job.proc.ultimo > PARADO) {
      job.erroFixo = 'O ffmpeg ficou 3 minutos sem avançar — tente de novo ou use o modo Navegador.';
      job.proc.matar();
    }
  }

  // ---------- ações ----------
  async function acaoStatus(_q, _c, _a, res) {
    const ff = await achar('ffmpeg');
    const yt = ff ? await achar('yt-dlp') : null;
    responderJson(res, { ffmpeg: !!ff, version: ff ? ff.versao : null, ytdlp: yt ? yt.versao : null, chunk: BLOCO, maxBytes: MAX_BYTES });
  }

  // Recebe em pedaços; do teste até a gravação tudo acontece sem pausa, então dois pedidos não se atropelam
  async function acaoUpload(_q, c, a, res) {
    if (!(await achar('ffmpeg'))) throw new Falha(SEM_FFMPEG, 503);
    const indice = /^\d{1,9}$/.test(c.get('index') ?? '') ? Number(c.get('index')) : -1;
    const pedaco = a.get('chunk');
    if (!pedaco) throw new Falha('Falha no envio do bloco');
    let m;
    if (indice === 0) {
      const nome = String(c.get('name') ?? 'video.mp4').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').slice(-255);
      const ext = nome.includes('.') ? nome.split('.').pop().toLowerCase() : '';
      if (!EXT_ENVIO.has(ext)) throw new Falha('Formato não aceito');
      m = novoRegistro(hex(12), { nome, ext });
    } else {
      m = pegar(exigirId(c.get('id')));
    }
    if (indice !== m.proximo) throw new Falha('Bloco fora de ordem');
    if (m.bytes + pedaco.length > MAX_BYTES) throw new Falha(`Arquivo maior que o limite (${MAX_MB} MB)`, 413);
    if (indice === 0) fs.writeFileSync(arq(m.id, 'src'), pedaco);
    else fs.appendFileSync(arq(m.id, 'src'), pedaco);
    m.proximo = indice + 1;
    m.bytes += pedaco.length;
    responderJson(res, { id: m.id, bytes: m.bytes });
  }

  // "segments" é a lista de trechos do original na ordem final; vários são unidos com concat (corte exato no frame)
  async function acaoProcess(_q, c, _a, res) {
    const ff = await achar('ffmpeg');
    if (!ff) throw new Falha(SEM_FFMPEG, 503);
    const id = exigirId(c.get('id'));
    const m = pegar(id);
    const src = arq(id, 'src');
    if (!existe(src)) throw new Falha('Arquivo não encontrado no servidor (expirou?)', 404);

    const trechos = lerTrechos(c);
    const total = trechos.length;
    const duracao = somaTrechos(trechos);
    const modoCru = c.get('mode') ?? '';
    const modo = modoCru === 'copy' ? 'copy' : 'optimize';
    if (modo === 'copy' && total > 1) throw new Falha('Corte rápido só funciona com um trecho — para juntar trechos o vídeo precisa ser recodificado');
    const qualidade = String(c.get('quality') ?? 'balanced');
    const crf = de({ original: 17, high: 23, balanced: 27, small: 31 }, qualidade, 27);
    let largura = qualidade === 'original' ? 0 : inteiro(c.get('width'), 0);
    if (![0, 1920, 1280, 854, 640, 480].includes(largura)) largura = 0;
    conferirFila();
    const info = await lerInfo(ff, src);
    const audio = (c.get('audio') ?? '1') === '1' && info.audio;
    const ext = modo === 'copy' ? m.ext : 'mp4';

    descartarJob(m);
    const jobId = hex(4);
    const f = (sufixo) => arq(id, `${jobId}.${sufixo}`);
    const progresso = ['-progress', 'pipe:1', '-nostats'];

    if (modoCru === 'gif') {
      const args = argsGif(src, trechos, lerOpcoesGif(c), f('out.gif'), progresso);
      lancarJob(m, jobId, ff, args, { duracao, ext: 'gif', modo: 'gif', tag: '-gif' });
      responderJson(res, { ok: true });
      return;
    }

    const escala = largura ? `scale='trunc(min(${largura},iw)/2)*2':-2` : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
    const args = ['-hide_banner', '-nostdin', '-y'];
    if (total === 1) {
      const [s, e] = trechos[0];
      args.push('-ss', f3(s), ...GUARDA, '-i', src, '-t', f3(e - s), '-map', '0:v:0');
      if (audio) args.push('-map', '0:a:0');
      else args.push('-an');
      if (modo !== 'copy') args.push('-vf', escala);
    } else {
      // Um input por trecho (busca exata) + concat; micro-fade de 4 ms no áudio só onde há emenda
      const filtros = [];
      let cadeia = '';
      trechos.forEach(([s, e], k) => {
        args.push('-ss', f3(s), '-t', f3(e - s), ...GUARDA, '-i', src);
        cadeia += `[${k}:v:0]`;
        if (!audio) return;
        const fades = [];
        if (k > 0 && Math.abs(trechos[k - 1][1] - s) > 0.001) fades.push('afade=t=in:st=0:d=0.004');
        if (k < total - 1 && Math.abs(trechos[k + 1][0] - e) > 0.001) fades.push(`afade=t=out:st=${f3(Math.max(0, e - s - 0.004))}:d=0.004`);
        filtros.push(`[${k}:a:0]${fades.length ? fades.join(',') : 'anull'}[a${k}]`);
        cadeia += `[a${k}]`;
      });
      filtros.push(`${cadeia}concat=n=${total}:v=1:a=${audio ? 1 : 0}[cv]${audio ? '[ca]' : ''}`);
      filtros.push(`[cv]${escala}[v]`);
      args.push('-filter_complex', filtros.join(';'), '-map', '[v]');
      if (audio) args.push('-map', '[ca]');
      else args.push('-an');
    }

    if (modo === 'copy') {
      args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p');
      if (qualidade === 'original') {
        // "Original": sem perda visível, com teto perto do bitrate do arquivo para não inchar
        const kbps = info.vkbps || info.kbps;
        if (kbps > 0) args.push('-maxrate', `${Math.round(1.25 * kbps)}k`, '-bufsize', `${Math.round(2.5 * kbps)}k`);
      }
      if (audio) {
        const akbps = qualidade === 'original' ? Math.min(320, Math.max(192, info.akbps)) : 128;
        args.push('-c:a', 'aac', '-b:a', `${akbps}k`);
      }
    }
    if (['mp4', 'm4v', 'mov'].includes(ext)) args.push('-movflags', '+faststart');
    args.push(...progresso, f(`out.${ext}`));

    const tag = modo === 'copy' ? '-recorte' : qualidade === 'original' ? '-editado' : '-otimizado';
    lancarJob(m, jobId, ff, args, { duracao, ext, modo, tag });
    responderJson(res, { ok: true });
  }

  function acaoJob(q, _c, _a, res) {
    const m = pegar(exigirId(q.get('id')));
    const job = m.job;
    if (!job) throw new Falha('Nenhum processamento iniciado', 404);
    conferirParado(job);
    if (job.erroFixo) { responderJson(res, { state: 'error', log: job.erroFixo }); return; }
    if (job.resultado) {
      const saida = arq(m.id, `${job.id}.out.${job.ext}`);
      if (job.resultado.codigo === 0 && existe(saida)) responderJson(res, { state: 'done', progress: 1, size: fs.statSync(saida).size });
      else responderJson(res, { state: 'error', log: mensagemDoJob(job) });
      return;
    }
    responderJson(res, { state: 'running', progress: job.progresso, elapsed: Math.floor((Date.now() - job.comecou) / 1000) });
  }

  function acaoCancel(q, _c, _a, res) {
    const m = pegar(exigirId(q.get('id')));
    descartarJob(m);
    if (m.amostra) m.amostra.matar();
    if (m.fetch && !m.fetch.terminou) { m.fetch.cancelado = true; if (m.fetch.proc) m.fetch.proc.matar(); }
    responderJson(res, { ok: true });
  }

  function acaoDownload(q, _c, _a, res, req) {
    const m = pegar(exigirId(q.get('id')));
    const job = m.job;
    if (!job) throw new Falha('Nenhum arquivo processado', 404);
    const saida = arq(m.id, `${job.id}.out.${job.ext}`);
    if (!job.resultado || job.resultado.codigo !== 0 || !existe(saida)) throw new Falha('Arquivo final não encontrado', 404);
    const base = `${m.nome.replace(/\.[^.]*$/, '')}${job.tag}.${job.ext}`;
    entregar(req, res, saida, de(MIME_SAIDA, job.ext, 'application/octet-stream'), nomeParaCabecalho(base, 'attachment'));
  }

  // GIF: gera um curto (até 3 fatias de 1 s espalhadas pela sequência) com as mesmas opções e extrapola o tamanho.
  // Sequências de até 4,5 s são geradas inteiras (tamanho exato).
  async function acaoGifest(_q, c, _a, res) {
    const ff = await achar('ffmpeg');
    if (!ff) throw new Falha(SEM_FFMPEG, 503);
    const id = exigirId(c.get('id'));
    const m = pegar(id);
    const src = arq(id, 'src');
    if (!existe(src)) throw new Falha('Arquivo não encontrado no servidor (expirou?)', 404);
    const trechos = lerTrechos(c);
    const g = lerOpcoesGif(c);
    const total = somaTrechos(trechos);
    const exato = total <= 4.5;
    let amostra = trechos;
    if (!exato) {
      amostra = [];
      for (const p of [0.08, 0.48, 0.85]) amostra.push(...fatiaDaSequencia(trechos, p * total, 1));
      if (!amostra.length) throw new Falha('Recorte inválido');
    }
    const durAmostra = somaTrechos(amostra);
    conferirFila();
    if (m.amostra) m.amostra.matar(); // a pessoa mudou as opções: a prévia antiga não interessa mais
    const provisorio = arq(id, `sample.${hex(4)}.gif`);
    const proc = rodar(ff.bin, argsGif(src, amostra, g, provisorio));
    m.amostra = proc;
    const limite = setInterval(() => {
      if (!proc.naFila && Date.now() - proc.ultimo > PARADO) proc.matar();
    }, 5000);
    limite.unref();
    const fim = await proc.fim;
    clearInterval(limite);
    if (m.amostra === proc) m.amostra = null;
    if (!registros.has(id)) throw new Falha('Arquivo não encontrado no servidor (expirou?)', 404);
    m.tocado = Date.now();
    if (fim.codigo !== 0 || !existe(provisorio)) {
      fs.rmSync(provisorio, { force: true });
      const linhas = proc.cauda.split('\n').map((l) => l.trim()).filter(Boolean);
      throw new Falha(`Não foi possível gerar a prévia: ${limpar(fim.erro || linhas[linhas.length - 1] || '')}`, 500);
    }
    const saida = arq(id, 'sample.gif');
    fs.renameSync(provisorio, saida);
    const tamanho = fs.statSync(saida).size;
    const cab = Buffer.alloc(4);
    const fd = fs.openSync(saida, 'r');
    const lidos = fs.readSync(fd, cab, 0, 4, 6);
    fs.closeSync(fd);
    responderJson(res, {
      estimate: exato ? tamanho : Math.round(tamanho * total / Math.max(0.1, durAmostra)),
      exact: exato,
      width: lidos === 4 ? cab.readUInt16LE(0) : 0,
      height: lidos === 4 ? cab.readUInt16LE(2) : 0,
      frames: Math.round(total * g.fps),
      duration: total,
    });
  }

  function acaoSample(q, _c, _a, res, req) {
    const id = exigirId(q.get('id'));
    if (registros.has(id)) registros.get(id).tocado = Date.now();
    const arquivo = arq(id, 'sample.gif');
    if (!existe(arquivo)) throw new Falha('Prévia não encontrada', 404);
    entregar(req, res, arquivo, 'image/gif');
  }

  // ---------- baixar por link (yt-dlp) ----------
  async function acaoFetch(_q, c, _a, res) {
    const ff = await achar('ffmpeg');
    const yt = ff ? await achar('yt-dlp') : null;
    if (!yt) throw new Falha(SEM_YTDLP, 503);
    const url = String(c.get('url') ?? '').trim();
    let u = null;
    try { u = url.length <= 2048 ? new URL(url) : null; } catch {}
    if (!u || !['http:', 'https:'].includes(u.protocol) || !u.hostname) throw new Falha('Cole um link completo (https://…)');
    // o yt-dlp recebe o link já normalizado por este parser: os dois leem o mesmo host
    if (u.username || u.password || u.port || !HOSTS.test(u.hostname.toLowerCase())) {
      throw new Falha('Link não suportado — use YouTube, Instagram, Pinterest, Vimeo, TikTok, X ou Facebook');
    }
    let altura = inteiro(c.get('quality'), 1080);
    if (![2160, 1080, 720, 480].includes(altura)) altura = 1080;
    conferirFila();

    const id = hex(12);
    const jobId = hex(4);
    const m = novoRegistro(id, { url: u.href });
    // H.264 + AAC primeiro (toca em qualquer navegador e no editor); se não houver, o melhor disponível
    const formato = `bv*[height<=${altura}][vcodec^=avc1]+ba[ext=m4a]/bv*[height<=${altura}]+ba/b[height<=${altura}]/b`;
    const args = ['--ignore-config', '--no-playlist', '--no-cache-dir', '--newline', '--progress', '--no-colors', '--socket-timeout', '30',
      '--max-filesize', `${MAX_MB}M`, '-f', formato, '--merge-output-format', 'mp4',
      '--print-to-file', 'after_move:%(title)s', `${jobId}.title`, '-o', `${jobId}.dl.%(ext)s`];
    if (path.isAbsolute(ff.bin)) args.push('--ffmpeg-location', ff.bin);
    // cópia por download: o yt-dlp regrava o arquivo de cookies no fim, e o original fica intacto
    const copiaCookies = arq(id, `${jobId}.cookies`);
    let temCookies = false;
    try {
      fs.writeFileSync(copiaCookies, fs.readFileSync(path.join(pasta, 'cookies.txt')), { mode: 0o600, flag: 'wx' });
      temCookies = true;
      args.push('--cookies', `${jobId}.cookies`);
    } catch {}
    args.push('--', u.href);

    m.fetch = { id: jobId, temCookies, progresso: 0, etapa: 'Lendo o link…', comecou: Date.now(), terminou: false, resultado: null, erro: '', cancelado: false, proc: null };
    baixar(m, ff, yt, args, copiaCookies).catch((e) => {
      m.fetch.erro = m.fetch.cancelado ? 'Download cancelado' : limpar(e.message || 'o yt-dlp falhou');
    }).finally(() => {
      m.fetch.terminou = true;
      m.tocado = Date.now();
      fs.rmSync(copiaCookies, { force: true });
      // deu errado: não fica download pela metade guardado
      if (m.fetch.erro && registros.has(id)) fs.rmSync(path.join(TEMP, id), { recursive: true, force: true });
    });
    responderJson(res, { id });
  }

  async function baixar(m, ff, yt, args, copiaCookies) {
    const fj = m.fetch;
    const id = m.id;
    const f = (sufixo) => arq(id, `${fj.id}.${sufixo}`);
    // Andamento: o yt-dlp baixa vídeo e áudio separados e depois junta. Nada do texto dele é gravado em disco.
    let formatos = 1;
    let fase = 0;
    let pct = 0;
    let juntando = false;
    let ultimoErro = '';
    const lerLinha = (linha) => {
      let r;
      if ((r = linha.match(/Downloading 1 format\(s\): (\S+)/))) formatos = (r[1].match(/\+/g) || []).length + 1;
      if (linha.includes('[download] Destination:')) fase++;
      if ((r = linha.match(/^\[download\]\s+([\d.]+)%/))) pct = parseFloat(r[1]) / 100;
      if (linha.includes('[Merger]') || linha.includes('[VideoConvertor]')) juntando = true;
      if ((r = linha.match(/^ERROR:\s*(.+)$/))) ultimoErro = r[1];
      const f1 = Math.max(1, fase);
      fj.progresso = juntando ? 0.99 : Math.min(0.98, ((f1 - 1) + pct) / formatos);
      fj.etapa = juntando ? 'Juntando vídeo e áudio…' : (f1 > 1 && formatos > 1 ? 'Baixando o áudio…' : (pct > 0 ? 'Baixando o vídeo…' : 'Lendo o link…'));
    };
    const porLinhas = () => {
      let resto = '';
      return (t) => {
        const partes = (resto + t).split('\n');
        resto = partes.pop().slice(-4096);
        partes.forEach((l) => lerLinha(l.trim()));
      };
    };
    fj.proc = rodar(yt.bin, args, { cwd: path.join(TEMP, id), aoSaida: porLinhas(), aoErro: porLinhas() });
    const r = await fj.proc.fim;
    fs.rmSync(copiaCookies, { force: true }); // a cópia dos cookies não fica guardada depois do download
    fj.proc = null;
    if (fj.cancelado) throw new Error('Download cancelado');
    if (fj.erroFixo) throw new Error(fj.erroFixo);
    if (r.codigo === null || r.codigo >= 128) throw new Error('O download foi interrompido antes de terminar.');
    if (r.codigo !== 0) {
      let msg = limpar(ultimoErro || r.erro || 'o yt-dlp falhou');
      const ondeCookies = 'cookies.txt, na pasta de dados das ferramentas';
      if (/not a bot/i.test(msg) && fj.temCookies) {
        msg = `O YouTube recusou os cookies de ${ondeCookies} (expiraram ou a conta saiu da sessão). Exporte de novo numa janela anônima, feche a janela sem sair da conta e substitua o arquivo.`;
      } else if (/not a bot/i.test(msg)) {
        msg = `O YouTube bloqueou o download (pede login para confirmar que não é robô). Coloque os cookies de uma conta Google em ${ondeCookies}.`;
      } else if (/login|cookies/i.test(msg)) {
        msg += ` — este conteúdo pede login: coloque os cookies da conta em ${ondeCookies}.`;
      }
      throw new Error(msg);
    }

    // o arquivo final é procurado na pasta do id; nenhum caminho vem da saída do programa
    const prefixo = `${fj.id}.dl.`;
    const candidatos = fs.readdirSync(path.join(TEMP, id))
      .filter((n) => n.startsWith(prefixo) && !/\.(part|ytdl|temp)(\.|$)/.test(n) && existe(arq(id, n)));
    const limpos = candidatos.filter((n) => !/\.f\d+\./.test(n));
    const escolhido = limpos[0] || candidatos[0];
    if (!escolhido) throw new Error('O download terminou, mas o arquivo não foi encontrado');
    let caminho = arq(id, escolhido);
    if (fs.statSync(caminho).size > MAX_BYTES) throw new Error(`Arquivo maior que o limite (${MAX_MB} MB)`);
    let ext = path.extname(escolhido).slice(1).toLowerCase() || 'mp4';
    const ANIMADOS = ['gif', 'webp', 'apng'];

    // Às vezes vem VP9/AV1 (ou áudio Opus): o navegador toca, mas outros players mostram em branco.
    // Converte para H.264 + AAC, que abre em qualquer lugar.
    const converter = async (argsConv, etapa, mensagem) => {
      fj.etapa = etapa;
      fj.progresso = 0.99;
      fj.convertendo = true;
      const proc = rodar(ff.bin, argsConv);
      fj.proc = proc;
      const limite = setTimeout(() => proc.matar(), CONVERSAO_MAX);
      limite.unref();
      const fim = await proc.fim;
      clearTimeout(limite);
      fj.proc = null;
      fj.convertendo = false;
      if (fj.cancelado) throw new Error('Download cancelado');
      if (fim.codigo === null) throw new Error('A conversão para H.264 parou antes de terminar — tente de novo.');
      if (fim.codigo !== 0) {
        const linhas = proc.cauda.split('\n').map((l) => l.trim()).filter(Boolean);
        throw new Error(`${mensagem}: ${limpar(linhas[linhas.length - 1] || '')}`);
      }
    };
    if (!ANIMADOS.includes(ext)) {
      const pi = await lerInfo(ff, caminho);
      const vOk = (pi.vcodec ?? 'h264') === 'h264' && ['yuv420p', 'yuvj420p'].includes(pi.pix ?? 'yuv420p');
      const aOk = !pi.audio || ['aac', 'mp3'].includes(pi.acodec ?? 'aac');
      if (!vOk || !aOk || ext !== 'mp4') {
        const saida = f('h264.mp4');
        const conv = ['-hide_banner', '-nostdin', '-y', ...GUARDA, '-i', caminho, '-map', '0:v:0', '-map', '0:a:0?'];
        if (vOk) conv.push('-c:v', 'copy');
        else conv.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p');
        if (aOk) conv.push('-c:a', 'copy'); else conv.push('-c:a', 'aac', '-b:a', '192k');
        conv.push('-movflags', '+faststart', saida);
        await converter(conv, vOk ? 'Ajustando o áudio para AAC…' : 'Convertendo para H.264 (abre em qualquer player)…', 'Baixou, mas a conversão para H.264 falhou');
        fs.rmSync(caminho, { force: true });
        caminho = saida;
        ext = 'mp4';
      }
    }
    let original = null;
    const src = arq(id, 'src');
    if (ANIMADOS.includes(ext)) {
      // O player de vídeo (prévia e editor) não abre GIF: gera um MP4 fiel e guarda o original para salvar
      original = ext;
      const copia = arq(id, `orig.${ext}`);
      fs.renameSync(caminho, copia);
      await converter(['-hide_banner', '-nostdin', '-y', ...GUARDA, '-i', copia, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-f', 'mp4', src],
      'Convertendo para H.264 (abre em qualquer player)…', 'Baixou um GIF, mas não foi possível convertê-lo para edição');
      ext = 'mp4';
    } else {
      fs.renameSync(caminho, src);
    }
    let titulos = [];
    try { titulos = fs.readFileSync(f('title'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean); } catch {}
    const titulo = titulos.length ? titulos[titulos.length - 1] : 'video';
    const seguro = Array.from(titulo.replace(/[/\\:*?"<>|\u0000-\u001f]+/g, ' ').trim() || 'video').slice(0, 80).join('');
    const info = await lerInfo(ff, src);
    const tamanho = fs.statSync(src).size;
    fj.resultado = {
      title: titulo, name: `${seguro}.${ext}`, size: tamanho, original,
      originalName: original ? `${seguro}.${original}` : null, originalSize: original ? fs.statSync(arq(id, `orig.${original}`)).size : null,
      duration: Math.round((info.duration ?? 0) * 100) / 100, width: info.width ?? 0, height: info.height ?? 0,
    };
    for (const n of fs.readdirSync(path.join(TEMP, id))) {
      if (n !== 'src' && !n.startsWith('orig.')) fs.rmSync(arq(id, n), { recursive: true, force: true });
    }
    m.nome = fj.resultado.name;
    m.ext = ext;
    m.bytes = tamanho;
    m.proximo = 1;
  }

  function acaoFetchjob(q, _c, _a, res) {
    const m = pegar(exigirId(q.get('id')));
    const fj = m.fetch;
    if (!fj) throw new Falha('Nenhum download iniciado', 404);
    if (fj.resultado && fj.terminou) { responderJson(res, { state: 'done', ...fj.resultado }); return; }
    if (fj.erro && fj.terminou) { responderJson(res, { state: 'error', error: fj.erro }); return; }
    conferirDownloadParado(fj);
    responderJson(res, { state: 'running', progress: fj.progresso, stage: fj.etapa });
  }
  function conferirDownloadParado(fj) {
    const p = fj.proc;
    if (!p || p.naFila || fj.terminou || fj.erroFixo || fj.convertendo) return; // a conversão tem limite próprio
    if (Date.now() - p.ultimo > PARADO) {
      fj.erroFixo = 'O download ficou 3 minutos parado — tente de novo.';
      p.matar();
    }
  }

  // Entrega o vídeo baixado (para salvar ou para abrir no editor)
  function acaoFile(q, _c, _a, res, req) {
    const m = pegar(exigirId(q.get('id')));
    const resultado = m.fetch && m.fetch.terminou ? m.fetch.resultado : null;
    if (!resultado) throw new Falha('Arquivo não encontrado (expirou?)', 404);
    const orig = q.has('orig') && !!resultado.original;
    const arquivo = orig ? arq(m.id, `orig.${resultado.original}`) : arq(m.id, 'src');
    if (!existe(arquivo)) throw new Falha('Arquivo não encontrado (expirou?)', 404);
    const nome = orig ? resultado.originalName : m.nome;
    const ext = orig ? resultado.original : m.ext;
    entregar(req, res, arquivo, de(MIME_ARQUIVO, ext, 'application/octet-stream'), nomeParaCabecalho(nome, q.has('dl') ? 'attachment' : 'inline'));
  }

  // ---------- editor: vários vídeos em sequência + faixas de áudio ----------
  // project = { width, height, quality, video: [{id, in, out, mute, vol, speed}], audio: [{id, in, out, start, vol, fi, fo}] }
  // Cada vídeo é encaixado em width×height (sem esticar, com barras), no fps do primeiro clipe.
  // O som dos vídeos vira uma trilha contínua (silêncio onde não há som) e é mixado com as faixas de áudio.
  async function acaoRender(_q, c, _a, res) {
    const ff = await achar('ffmpeg');
    if (!ff) throw new Falha(SEM_FFMPEG, 503);
    const p = lerJson(c.get('project') ?? '');
    if (!p || typeof p !== 'object' || !Array.isArray(p.video) || !p.video.length) throw new Falha('Coloque pelo menos um vídeo na faixa V1');
    const lidos = new Map();
    const fonte = async (idCru) => {
      const id = exigirId(idCru);
      const src = arq(id, 'src');
      if (!existe(src)) throw new Falha('Um dos arquivos não está mais no servidor (expirou?)', 404);
      if (registros.has(id)) registros.get(id).tocado = Date.now();
      if (!lidos.has(id)) lidos.set(id, await lerInfo(ff, src));
      return { src, info: lidos.get(id) };
    };
    const W = Math.max(16, Math.min(4096, inteiro(p.width, 1280))) & ~1;
    const H = Math.max(16, Math.min(4096, inteiro(p.height, 720))) & ~1;
    const crf = de({ original: 17, high: 21, balanced: 26, small: 30 }, String(p.quality ?? 'original'), 21);
    conferirFila();

    const rid = hex(12);
    const jobId = hex(4);
    const args = ['-hide_banner', '-nostdin', '-y'];
    const filtros = [];
    let cadeia = '';
    let k = 0;
    let n = 0;
    let total = 0;
    let fps = 0;
    for (const bruto of p.video.slice(0, 200)) {
      const clipe = objeto(bruto);
      const { src, info } = await fonte(clipe.id);
      const s = Math.max(0, num(clipe.in));
      let dur = num(clipe.out) - s;
      if (dur < 0.04) continue;
      if (!fps) fps = Math.max(1, Math.min(60, num(info.fps, 30) || 30));
      args.push('-ss', f3(s), '-t', f3(dur), ...GUARDA, '-i', src);
      const vel = Math.max(0.1, Math.min(16, num(clipe.speed, 1) || 1));
      const mudou = Math.abs(vel - 1) > 0.001;
      if (mudou) dur /= vel;
      filtros.push(`[${k}:v:0]${mudou ? `setpts=(PTS-STARTPTS)/${vel.toFixed(5)},` : ''}scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${f3(fps)},format=yuv420p[v${n}]`);
      const vol = Math.max(0, Math.min(2, num(clipe.vol, 1)));
      if (info.audio && !clipe.mute && vol > 0 && !mudou) { // com velocidade, o som vem separado em A1/A2
        filtros.push(`[${k}:a:0]${estereo(info)}aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${f3(vol)},apad,atrim=duration=${f3(dur)},afade=t=in:d=0.004,afade=t=out:st=${f3(Math.max(0, dur - 0.004))}:d=0.004[a${n}]`);
      } else {
        filtros.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${f3(dur)}[a${n}]`);
      }
      cadeia += `[v${n}][a${n}]`;
      k++;
      n++;
      total += dur;
    }
    if (!n) throw new Falha('Os clipes de vídeo estão vazios');
    filtros.push(`${cadeia}concat=n=${n}:v=1:a=1[vout][aseq]`);

    const mix = ['[aseq]'];
    const faixas = Array.isArray(p.audio) ? p.audio.slice(0, 200) : [];
    for (let i = 0; i < faixas.length; i++) {
      const a = objeto(faixas[i]);
      const { src, info } = await fonte(a.id);
      if (!info.audio) continue;
      const s = Math.max(0, num(a.in));
      const dur = num(a.out) - s;
      const inicio = Math.max(0, num(a.start));
      if (dur < 0.04 || inicio >= total) continue;
      const vol = Math.max(0, Math.min(4, num(a.vol, 1)));
      const fi = Math.max(0, Math.min(dur, num(a.fi)));
      const fo = Math.max(0, Math.min(dur - fi, num(a.fo)));
      args.push('-ss', f3(s), '-t', f3(dur), ...GUARDA, '-i', src);
      let af = `[${k}:a:0]${estereo(info)}aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${f3(vol)}`;
      if (fi > 0) af += `,afade=t=in:st=0:d=${f3(fi)}`;
      if (fo > 0) af += `,afade=t=out:st=${f3(dur - fo)}:d=${f3(fo)}`;
      const ms = Math.round(inicio * 1000);
      if (ms > 0) af += `,adelay=${ms}|${ms}`;
      filtros.push(`${af}[x${i}]`);
      mix.push(`[x${i}]`);
      k++;
    }
    let rotulo = '[aseq]';
    if (mix.length > 1) {
      filtros.push(`${mix.join('')}amix=inputs=${mix.length}:duration=first:dropout_transition=0:normalize=0[aout]`);
      rotulo = '[aout]';
    }
    const m = novoRegistro(rid, { nome: 'montagem.mp4', ext: 'mp4' });
    args.push('-filter_complex', filtros.join(';'), '-map', '[vout]', '-map', rotulo,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', arq(rid, `${jobId}.out.mp4`));
    lancarJob(m, jobId, ff, args, { duracao: total, ext: 'mp4', modo: 'render', tag: '', fontes: [rid, ...lidos.keys()] });
    responderJson(res, { id: rid, duration: total, width: W, height: H, fps });
  }

  // ---------- validade: 3 h sem uso, nunca com processo rodando ----------
  function varrer() {
    const agora = Date.now();
    ultimaVarredura = agora;
    const emUso = new Set();
    for (const m of registros.values()) {
      if (m.job) {
        conferirParado(m.job);
        if (!m.job.resultado) m.job.fontes.forEach((id) => emUso.add(id));
      }
      if (m.fetch && !m.fetch.terminou) { conferirDownloadParado(m.fetch); emUso.add(m.id); }
      if (m.amostra) emUso.add(m.id);
    }
    for (const [id, m] of registros) {
      if (emUso.has(id) || agora - m.tocado <= TTL) continue;
      fs.rmSync(path.join(TEMP, id), { recursive: true, force: true });
      registros.delete(id);
    }
  }
  const relogio = setInterval(() => { try { varrer(); } catch {} }, 10 * 60 * 1000);
  relogio.unref();

  // ---------- servidor ----------
  const ACOES = new Map([
    ['status', acaoStatus], ['upload', acaoUpload], ['process', acaoProcess], ['job', acaoJob], ['download', acaoDownload],
    ['cancel', acaoCancel], ['gifest', acaoGifest], ['sample', acaoSample], ['fetch', acaoFetch], ['fetchjob', acaoFetchjob],
    ['file', acaoFile], ['render', acaoRender],
  ]);
  const SO_ARQUIVO = new Set(['download', 'sample', 'file']);

  function responderJson(res, dados, status = 200) {
    if (res.headersSent) { res.destroy(); return; }
    const corpo = Buffer.from(JSON.stringify(dados));
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', corpo.length);
    res.end(corpo);
  }

  function tokenConfere(trecho) {
    // compara o hash: tempo constante e sem revelar o tamanho do token
    return crypto.timingSafeEqual(crypto.createHash('sha256').update(trecho).digest(), hashToken);
  }

  async function atender(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // contra DNS rebinding: só aceita quem chamou exatamente este endereço
    if (req.headers.host !== `127.0.0.1:${portaReal}`) { req.resume(); responderJson(res, { error: 'Host não permitido' }, 403); return; }
    const [caminho, ...resto] = String(req.url).split('?');
    const partes = caminho.split('/');
    if (partes.length !== 3 || partes[0] !== '' || partes[2] !== '' || !tokenConfere(partes[1])) {
      req.resume();
      responderJson(res, { error: 'Não encontrado' }, 404);
      return;
    }
    const origem = req.headers.origin;
    if (origem !== undefined) {
      if (!ORIGENS.has(origem)) { req.resume(); responderJson(res, { error: 'Origem não permitida' }, 403); return; }
      res.setHeader('Access-Control-Allow-Origin', origem);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Disposition');
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      if (origem !== undefined) {
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Access-Control-Max-Age', '600');
        if (req.headers['access-control-request-private-network'] === 'true') res.setHeader('Access-Control-Allow-Private-Network', 'true');
      }
      res.end();
      return;
    }
    const q = new URLSearchParams(resto.join('?'));
    const nome = q.get('api') ?? '';
    const acao = ACOES.get(nome);
    if (!acao) { req.resume(); throw new Falha('Ação desconhecida', 404); }
    if (!['GET', 'POST'].includes(req.method) && !(req.method === 'HEAD' && SO_ARQUIVO.has(nome))) {
      req.resume();
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      throw new Falha('Método não permitido', 405);
    }
    if (Date.now() - ultimaVarredura > 60000) varrer();
    let form = { campos: new Map(), arquivos: new Map() };
    if (req.method === 'POST') form = lerFormulario(await lerCorpo(req), String(req.headers['content-type'] ?? ''));
    await acao(q, form.campos, form.arquivos, res, req);
  }

  const servidor = http.createServer((req, res) => {
    atender(req, res).catch((e) => {
      if (e instanceof Falha) {
        if (!req.complete) res.setHeader('Connection', 'close');
        responderJson(res, { error: e.message }, e.status);
      } else {
        responderJson(res, { error: limpar(e.message || 'Erro interno') }, 500);
      }
    });
  });
  servidor.maxConnections = 128;

  await new Promise((resolver, rejeitar) => {
    servidor.once('error', rejeitar);
    servidor.listen(porta, '127.0.0.1', () => { servidor.off('error', rejeitar); resolver(); });
  });
  portaReal = servidor.address().port;

  return {
    porta: portaReal,
    base: `http://127.0.0.1:${portaReal}/${token}/`,
    // a parte que importa (matar processos e apagar temporários) acontece antes de retornar: serve no will-quit
    parar() {
      if (parando) return Promise.resolve();
      parando = true;
      clearInterval(relogio);
      for (const p of vivos) p.matar('SIGKILL');
      try { fs.rmSync(TEMP, { recursive: true, force: true, maxRetries: 3 }); } catch {}
      registros.clear();
      return new Promise((r) => { servidor.close(() => r()); servidor.closeAllConnections(); });
    },
    async info() {
      const [ff, probe, yt] = await Promise.all([achar('ffmpeg'), achar('ffprobe'), achar('yt-dlp')]);
      return {
        ffmpeg: !!ff, ffprobe: !!probe, ytdlp: !!yt,
        versaoFfmpeg: ff ? ff.versao : null, versaoYtdlp: yt ? yt.versao : null,
        plataforma: process.platform, processos: vagas.ocupadas, naFila: vagas.fila,
      };
    },
  };
}

module.exports = { criarMotor };
