// Runtime dos mods em Lua: cada mod roda num motor Lua isolado (wasmoon),
// sem rede, arquivos ou acesso às páginas. Só recebe as funções que as
// permissões dele liberam, e cada chamada tem limite de tempo.

const LIMITE_MS = 40;      // tempo máximo por chamada (_update, _draw, evento)
const QUADRO = 1 / 30;     // cartuchos rodam a 30 quadros por segundo

// o que um evento entrega ao mod: só texto, número e sim/não. Uma aba vira endereço e título, nunca o objeto com a <webview>.
export function paraMod(v) {
  if (v == null || ['string', 'number', 'boolean'].includes(typeof v)) return typeof v === 'string' ? v.slice(0, 2000) : v;
  if (typeof v !== 'object') return undefined;
  const r = {};
  if (Array.isArray(v.historico)) r.url = String(v.historico[v.pos] ?? '').slice(0, 2000);
  for (const k of ['id', 'titulo', 'url', 'carregando', 'nome']) if (['string', 'number', 'boolean'].includes(typeof v[k])) r[k] = typeof v[k] === 'string' ? v[k].slice(0, 2000) : v[k];
  return r;
}

let fabrica = null;
function obterFabrica() {
  if (!fabrica) fabrica = new window.wasmoon.LuaFactory('vendor/glue.wasm');
  return fabrica;
}

// ---------- Teal (Lua com tipos) ----------
// O compilador do Teal (tl.lua, de Hisham Muhammad) roda num motor Lua só dele.
// O código do mod recebe antes as declarações da API (oceano.d.tl); como o Teal
// preserva a numeração de linhas, basta descontar essas linhas no resultado.

let compilador = null;
let declaracoes = null;

async function obterCompilador() {
  if (!compilador) {
    compilador = (async () => {
      const [fonte, decl] = await Promise.all([
        fetch('vendor/tl.lua').then(r => r.text()),
        fetch('mods/oceano.d.tl').then(r => r.text()),
      ]);
      declaracoes = decl.endsWith('\n') ? decl : decl + '\n';
      const lua = await obterFabrica().createEngine();
      lua.global.set('__tl', fonte);
      await lua.doString(`
        local tl = load(__tl, "=tl")()
        __tl = nil
        function __compilar(src)
          local env = tl.new_env({ defaults = { gen_target = "5.4", gen_compat = "off" } })
          local codigo, res = tl.gen(src, env)
          local erros = {}
          for _, e in ipairs(res.syntax_errors or {}) do erros[#erros + 1] = { e.y, e.x, e.msg } end
          for _, e in ipairs(res.type_errors or {}) do erros[#erros + 1] = { e.y, e.x, e.msg } end
          return { codigo = codigo or "", erros = erros }
        end`);
      return lua;
    })();
  }
  return compilador;
}

export async function compilarTeal(codigo) {
  const lua = await obterCompilador();
  const prefixo = declaracoes.split('\n').length - 1;
  // funções chamadas do JS devolvem um só valor, por isso o resultado vem numa tabela
  const { codigo: gerado, erros: brutos } = lua.global.get('__compilar')(declaracoes + codigo);
  const erros = (Array.isArray(brutos) ? brutos : Object.values(brutos || {}))
    .map(([y, x, msg]) => ({ linha: y - prefixo, coluna: x, msg }))
    .sort((a, b) => a.linha - b.linha);
  return { lua: gerado.split('\n').slice(prefixo).join('\n'), erros };
}

// Fonte 3×5: cada glifo são 5 linhas de 3 bits.
const FONTE = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101010010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  ':': '000010000010000', '.': '000000000000010', ',': '000000000010100', '-': '000000111000000',
  '!': '010010010000010', '?': '110001010000010', '/': '001001010100100', '+': '000010111010000',
  "'": '010010000000000', '(': '001010010010001', ')': '100010010010100', '>': '100010001010100',
  '<': '001010100010001', '=': '000111000111000', '%': '101001010100101', '#': '101111101111101',
  '*': '000101010101000', '_': '000000000000111',
};

function semAcento(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export const PERMISSOES = {
  tela:      'Desenhar no próprio quadro',
  controles: 'Ler as teclas enquanto está em foco',
  som:       'Tocar sons sintetizados',
  eventos:   'Ouvir eventos do navegador (cliques, abas)',
  modo_jogo: 'Ligar e desligar o modo jogo',
  abas:      'Congelar abas em segundo plano',
  avisos:    'Mostrar avisos na tela',
  mouse:     'Ver onde o mouse está sobre o próprio quadro',
  teclado:   'Receber o que você digita enquanto ele está em foco',
  memoria:   'Guardar até 8 KB neste computador',
};

// O que nenhum mod consegue, independente de permissão.
export const NUNCA = ['internet', 'conteúdo das páginas', 'senhas e histórico', 'arquivos do computador'];

// Teclado compartilhado por todos os cartuchos (só o que está em foco lê).
const teclas = new Set();
// toques rápidos (aperta e solta entre dois quadros) ficam guardados até o próximo quadro
const apertadas = new Set();
const mapa = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, ' ': 4, z: 4, Z: 4, x: 5, X: 5 };
window.addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea')) return;
  // digitação vai só para o quadro em foco, e só se ele tiver a permissão "teclado"
  const alvo = Cart.foco;
  if (alvo?.pode('teclado') && document.activeElement === alvo.canvas && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const k = e.key.length === 1 ? e.key : { Backspace: '\b', Enter: '\n' }[e.key];
    if (k) { alvo.digitado.push(k); if (alvo.digitado.length > 32) alvo.digitado.shift(); e.preventDefault(); }
  }
  if (e.key in mapa) { teclas.add(mapa[e.key]); apertadas.add(mapa[e.key]); if (Cart.foco) e.preventDefault(); }
});
window.addEventListener('keyup', e => { if (e.key in mapa) teclas.delete(mapa[e.key]); });
window.addEventListener('blur', () => teclas.clear());

function hexParaRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Cart {
  static foco = null;

  // limiteMs só vem do código do próprio Oceano (tela de erro); mods sempre usam o limite padrão
  constructor(mod, host, { limiteMs = LIMITE_MS } = {}) {
    this.limiteMs = limiteMs;
    this.mod = mod;
    this.host = host;     // { tema(), emitirLog(), sfx(), on(), modoJogo(), congelarAbas(), notificar() }
    this.logs = [];
    this.erro = null;
    this.lua = null;
    this.canvas = null;
    this.acumulado = 0;
    this.inicio = performance.now();
    this.msPorQuadro = 0;
    this.handlers = [];
    this.toque = false;
    this.anteriores = new Set();
    this.mouse = { x: -1, y: -1, dentro: false };
    this.digitado = [];
  }

  log(msg, tipo = 'info') {
    this.logs.push({ msg: String(msg), tipo, hora: new Date() });
    if (this.logs.length > 200) this.logs.shift();
    this.host.aoLogar?.(this);
  }

  falhar(e) {
    const msg = String(e?.message || e).replace(/^Error: /, '');
    this.erro = msg;
    this.log(msg, 'erro');
    this.host.aoFalhar?.(this);
  }

  pode(p) { return this.mod.permissoes.includes(p); }

  async iniciar(codigo) {
    this.parar();
    this.erro = null;
    this.logs = [];
    this.errosTipo = [];
    this.inicio = performance.now();
    try {
      if (this.mod.linguagem === 'teal') {
        const t0 = performance.now();
        const r = await compilarTeal(codigo);
        if (r.erros.length) {
          this.errosTipo = r.erros;
          for (const e of r.erros) this.log(`linha ${e.linha}:${e.coluna} · ${e.msg}`, 'erro');
          this.falhar(`${r.erros.length} erro(s) de tipo: o mod não rodou`);
          return;
        }
        this.log(`Teal verificado e convertido para Lua em ${(performance.now() - t0).toFixed(0)} ms`, 'evento');
        codigo = r.lua;
      }
      this.lua = await obterFabrica().createEngine({ functionTimeout: this.limiteMs, enableProxy: false });   // sem proxy: objetos do navegador nunca chegam ao mod
      this.registrarApi();
      this.lua.global.set('oceano_idioma', () => document.documentElement.lang || 'pt');
      await this.lua.doString(PRELUDIO);
      this.atualizarCores();
      // o código do mod também roda com limite de tempo
      const rodar = this.lua.global.get('__rodar');
      this.lua.doStringSync('__rodar = nil');
      this.chamarFn(rodar, codigo);
      if (this.erro) return;
      this.prepararTela();
      this.chamar('_init');
      if (!this.erro) this.log('mod iniciado');
    } catch (e) {
      this.falhar(e);
    }
  }

  parar() {
    for (const off of this.handlers) off();
    this.handlers = [];
    if (this.lua) { try { this.lua.global.close(); } catch {} }
    this.lua = null;
  }

  // ---------- API exposta ao Lua ----------

  registrarApi() {
    const g = this.lua.global;
    const negar = (perm, nome) => () => { throw new Error(`permissão "${perm}" não concedida (${nome})`); };
    this.uso = {};   // o que o mod chamou de verdade (a página de mods mostra)
    const com = (perm, nome, fn) => g.set(nome, this.pode(perm) ? (...a) => { this.uso[nome] = (this.uso[nome] || 0) + 1; return fn(...a); } : negar(perm, nome));

    g.set('log', (...a) => this.log(a.map(v => (typeof v === 'object' ? JSON.stringify(v) : v)).join(' ')));
    g.set('t', () => (performance.now() - this.inicio) / 1000);
    g.set('rnd', (n = 1) => Math.random() * n);
    g.set('flr', n => Math.floor(n));

    // desenho
    const fb = () => this.fb;
    const pset = (x, y, c) => {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      fb()[y * this.w + x] = ((Math.floor(c) % this.nCores) + this.nCores) % this.nCores;
    };
    const rectfill = (x0, y0, x1, y1, c) => {
      const xa = Math.max(0, Math.floor(Math.min(x0, x1))), xb = Math.min(this.w - 1, Math.floor(Math.max(x0, x1)));
      const ya = Math.max(0, Math.floor(Math.min(y0, y1))), yb = Math.min(this.h - 1, Math.floor(Math.max(y0, y1)));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) pset(x, y, c);
    };
    const line = (x0, y0, x1, y1, c) => {
      x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, n = 0;
      while (n++ < 2000) {
        pset(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    com('tela', 'cls', (c = 0) => fb()?.fill(((Math.floor(c) % this.nCores) + this.nCores) % this.nCores));
    com('tela', 'pset', pset);
    com('tela', 'line', line);
    com('tela', 'rectfill', rectfill);
    com('tela', 'rect', (x0, y0, x1, y1, c) => {
      line(x0, y0, x1, y0, c); line(x1, y0, x1, y1, c); line(x1, y1, x0, y1, c); line(x0, y1, x0, y0, c);
    });
    const circ = (cx, cy, r, c, cheio) => {
      r = Math.max(0, Math.floor(r));
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (cheio ? d <= r * r + r : d <= r * r + r && d >= r * r - r) pset(cx + x, cy + y, c);
      }
    };
    com('tela', 'circ', (x, y, r, c) => circ(x, y, r, c, false));
    com('tela', 'circfill', (x, y, r, c) => circ(x, y, r, c, true));
    com('tela', 'print', (txt, x = 0, y = 0, c = 7, escala = 1) => {
      const s = semAcento(txt);
      escala = Math.max(1, Math.min(4, Math.floor(escala)));
      let cx = Math.floor(x);
      for (const ch of s) {
        const g = FONTE[ch];
        if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') {
          const px = cx + (i % 3) * escala, py = Math.floor(y) + Math.floor(i / 3) * escala;
          rectfill(px, py, px + escala - 1, py + escala - 1, c);
        }
        cx += 4 * escala;
      }
    });

    // controles
    const ativo = () => Cart.foco === this;
    const segurando = i => teclas.has(i) || (i === 4 && this.toque);
    const novo = i => apertadas.has(i) || (i === 4 && this.toquePendente);
    com('controles', 'btn', i => ativo() && (segurando(i) || novo(i)));
    com('controles', 'btnp', i => ativo() && (novo(i) || (segurando(i) && !this.anteriores.has(i))));

    // som
    com('som', 'sfx', def => this.host.sfx(def));
    com('mouse', '__mouse', () => [this.mouse.x, this.mouse.y, this.mouse.dentro, this.toque]);
    // o wasmoon converte undefined em nil (null quebraria a chamada)
    com('teclado', 'tecla', () => this.digitado.shift());   // a fila só recebe teclas enquanto o quadro está em foco

    // memória: só textos, números e booleanos; até 8 KB por mod
    com('memoria', 'guardar', (chave, valor) => {
      chave = String(chave).slice(0, 40);
      if (valor != null && !['string', 'number', 'boolean'].includes(typeof valor)) throw new Error('guardar() aceita só texto, número ou booleano');
      this.host.guardar(this, chave, valor ?? null);
    });
    com('memoria', 'ler', chave => this.host.ler(this, String(chave).slice(0, 40)) ?? undefined);

    // navegador
    com('eventos', '__on', (nome, fn) => {
      if (typeof fn !== 'function') throw new Error('oceano.on precisa de uma função');
      this.handlers.push(this.host.on(String(nome), (...args) => this.chamarFn(fn, ...args.map(paraMod))));
    });
    com('modo_jogo', '__modo_jogo', v => this.host.modoJogo(!!v, this));
    com('abas', '__congelar', () => this.host.congelarAbas(this));
    com('avisos', '__notificar', msg => this.host.notificar(String(msg).slice(0, 120), this));
  }

  atualizarCores() {
    if (!this.lua) return;
    const tema = this.host.tema();
    this.nCores = tema.paleta.length;
    this.rgb = tema.paleta.map(hexParaRgb);
    const campos = Object.entries(tema.ui).map(([k, v]) => `${k}=${v}`).join(',');
    try { this.lua.doStringSync(`cor = {${campos}} N_CORES = ${this.nCores}`); } catch (e) { this.falhar(e); }
  }

  prepararTela() {
    const largura = this.lua.global.get('largura');
    // um mod pode pedir menos quadros por segundo (fps = 20): faixas calmas não precisam de 30
    const fps = Number(this.lua.global.get('fps'));
    this.quadro = fps >= 5 && fps <= 30 ? 1 / fps : QUADRO;
    const altura = this.lua.global.get('altura');
    this.temTela = this.pode('tela') && altura != null;
    if (!this.temTela) return;
    this.auto = largura === 'auto';
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'cartucho';
      this.canvas.tabIndex = 0;
      const posicionar = e => {
        const r = this.canvas.getBoundingClientRect();
        this.mouse.x = Math.floor(((e.clientX - r.left) / r.width) * this.w);
        this.mouse.y = Math.floor(((e.clientY - r.top) / r.height) * this.h);
        this.mouse.dentro = true;
      };
      this.canvas.addEventListener('pointermove', posicionar);
      this.canvas.addEventListener('pointerdown', e => { posicionar(e); Cart.foco = this; this.toque = true; this.toquePendente = true; this.canvas.focus(); });
      this.canvas.addEventListener('pointerup', () => { this.toque = false; });
      this.canvas.addEventListener('pointerleave', () => { this.toque = false; this.mouse.dentro = false; });
      this.canvas.addEventListener('focus', () => { Cart.foco = this; });
    }
    this.h = Math.max(1, Math.min(256, Math.floor(altura)));
    this.w = this.auto ? this.larguraAuto() : Math.max(1, Math.min(320, Math.floor(largura)));
    this.redimensionar();
  }

  larguraAuto() {
    const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 3;
    const base = this.canvas?.parentElement?.clientWidth || window.innerWidth;
    return Math.max(16, Math.min(1024, Math.ceil(base / u)));
  }

  redimensionar() {
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.setProperty('--w', this.w);
    this.canvas.style.setProperty('--h', this.h);
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(this.w, this.h);
    this.fb = new Uint8Array(this.w * this.h);
    try { this.lua.doStringSync(`W, H = ${this.w}, ${this.h}`); } catch {}
  }

  chamar(nome, ...args) {
    if (!this.lua || this.erro) return;
    const fn = this.lua.global.get(nome);
    if (typeof fn === 'function') this.chamarFn(fn, ...args);
  }

  chamarFn(fn, ...args) {
    if (!this.lua || this.erro) return;
    try { return fn(...args); }
    catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('timeout')) {
        // um estouro solto (o navegador parou um instante, coleta de memória) só pula o quadro;
        // o mod só é pausado se estourar 3 vezes em 10 s — antes ele sumia por causa de um único soluço
        const agora = performance.now();
        this.estouros = (this.estouros || []).filter(t => agora - t < 10000);
        this.estouros.push(agora);
        if (this.estouros.length < 3) return;
        return this.falhar(`o mod passou do limite de ${LIMITE_MS} ms por quadro várias vezes e foi pausado`);
      }
      this.falhar(msg);
    }
  }

  // Chamado pelo laço principal. Só roda se o quadro estiver visível na página.
  passo(dt, pausado) {
    if (!this.lua || this.erro || !this.temTela || !this.canvas.isConnected || !this.canvas.offsetParent || pausado) return;
    if (this.auto) {
      const w = this.larguraAuto();
      if (w !== this.w) { this.w = w; this.redimensionar(); }
    }
    this.acumulado += dt;
    const q = this.quadro || QUADRO;
    if (this.acumulado < q) return;
    this.acumulado = Math.min(this.acumulado - q, q);
    const t0 = performance.now();
    this.chamar('_update');
    this.chamar('_draw');
    this.anteriores = new Set([...teclas, ...apertadas]);
    if (this.toque || this.toquePendente) this.anteriores.add(4);
    this.toquePendente = false;
    if (Cart.foco === this) apertadas.clear();
    this.msPorQuadro = this.msPorQuadro * 0.9 + (performance.now() - t0) * 0.1;
    this.desenhar();
  }

  desenhar() {
    const d = this.img.data, fb = this.fb, rgb = this.rgb;
    for (let i = 0; i < fb.length; i++) {
      const c = rgb[fb[i]] || rgb[0], j = i * 4;
      d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}

// Roda antes do código do mod: tira tudo que dá acesso ao mundo de fora.
const PRELUDIO = `
__rodar = (function(carregar)
  return function(src)
    local f, e = carregar(src, "=mod", "t")
    if not f then error(e, 0) end
    return f()
  end
end)(load)
io, package, require, dofile, loadfile, load, debug, collectgarbage = nil
string.dump = nil
-- o limite de tempo não pode ser engolido: pcall, xpcall e corrotinas devolvem o erro de tempo para cima
do
  local p0, x0, erro, texto, achar, res0 = pcall, xpcall, error, tostring, string.find, coroutine.resume
  local function estourou(e) return achar(texto(e), "thread timeout", 1, true) ~= nil end
  local function conferir(ok, e, ...) if not ok and estourou(e) then erro(e, 0) end return ok, e, ... end
  pcall = function(...) return conferir(p0(...)) end
  xpcall = function(f, h, ...) return conferir(x0(f, function(e) if estourou(e) then return e end return h(e) end, ...)) end
  coroutine.resume = function(...) return conferir(res0(...)) end
  coroutine.close = nil
end
do
  local data, tempo, relogio = os.date, os.time, os.clock
  os = { date = data, time = tempo, clock = relogio }
end
oceano = {
  on = __on,
  modo_jogo = __modo_jogo,
  congelar_abas = __congelar,
  notificar = __notificar,
  mouse = function()
    local m = __mouse()
    return m[1], m[2], m[3], m[4]
  end,
  hora = function()
    local d = os.date("*t")
    return { hora = d.hour, min = d.min, seg = d.sec }
  end,
}
mouse = oceano.mouse
oceano.mouse = nil
__on, __modo_jogo, __congelar, __notificar = nil
W, H = 0, 0
`;
