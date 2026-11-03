// Simulador do Oceano: abas, rotas internas (oceano://), mods em Lua,
// modo jogo e log de rede. Tudo roda local; nada sai deste computador.

import { iniciarCds } from './cds.js';
import { iniciarMusica } from './musica.js';
import { iniciarMidia, JS_MENU_VIDEO } from './midia.js';
import { Mar } from './mar.js';
import { Cart } from './lua.js';
import { tocar, ligarSom, somLigado } from './sfx.js';
import { icone } from './icones.js';
import { ligarBrilho } from './brilho-pixel.js';
import { iniciarGravando } from './gravando.js';
import { PAGINAS, rotaDe } from './paginas.js';
import { validarTema, normalizarMar, slug } from './temas.js';
import { criarAtalhos, deEvento, linkLimpo } from './atalhos.js';
import { iniciarGrupos } from './grupos.js';
import { criarMesa } from './mesa.js';
import { iniciarAgua } from './agua.js';
import { iniciarConsumo } from './consumo.js';
import { iniciarSensivel, sensivel } from './sensivel.js';
import { iniciarHistorico } from './historico.js';
import { iniciarLeitor } from './leitor.js';
import { iniciarPrimeirosPassos } from './primeiros-passos.js';
import { iniciarTraducao } from './traducao-interface.js';
import { iniciarPonteFerramentas } from './quadros.js';
import { criarSkills } from './skills.js';
import { criarConexoes } from './conexoes.js';
import { criarIconesMesa } from './mesa-icones.js';
import { validarEmojiMod, REFERENCIAS_MODS, referenciaLivre } from './emojis.js';
import { iniciarNavegacao } from './navegacao.js';
import { criarClima } from './clima.js';
import { iniciarFarol } from './farol-mods.js';
import { MAX_MOD_BYTES } from './mod-analise.js';
import { normalizar as normalizarPedido, pedidoCompleto } from './pedido-claude.js';

// ---------- armazenamento (opcional: o simulador funciona sem ele) ----------

const guardado = {
  ler(chave, padrao) {
    try { const v = localStorage.getItem('oceano:' + chave); return v == null ? padrao : JSON.parse(v); }
    catch { return padrao; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem('oceano:' + chave, JSON.stringify(valor)); } catch {}
  },
};

// ---------- eventos do navegador (os mods ouvem estes) ----------

const ouvintes = new Map();
function on(nome, fn) {
  if (!ouvintes.has(nome)) ouvintes.set(nome, new Set());
  ouvintes.get(nome).add(fn);
  return () => ouvintes.get(nome)?.delete(fn);
}
function emitir(nome, ...args) {
  const lista = ouvintes.get(nome);
  if (lista) for (const fn of [...lista]) fn(...args);
  return lista?.size || 0;
}

// ---------- estado ----------

const app = {
  guardado, on, emitir, icone,
  temas: {},
  ordemTemas: [],
  tema: null,
  abas: [],
  abaAtiva: null,
  mods: [],
  modoJogo: false,
  congeladas: false,
  limites: guardado.ler('limites', { ram: 2048, cpu: 60, rede: 50, ligado: false }),
  rede: [],
  eventosJogo: [],
  mar: null,
};
window.oceano = app;   // para inspecionar no console do navegador

// a mensagem à IA local preparada no notch aparece aqui, na conversa da lateral, para a pessoa ler e autorizar
window.oceanoNativo?.aoPedidoDoNotch?.(async d => {
  const pedido = normalizarPedido(d);
  if (!pedidoCompleto(pedido)) return;
  app.mostrarLateral(true); app.abaLateral('assistente');
  await app.carregarPainel('assistente');
  app.emitir('pedido-mudanca', pedido);
});

let proximoId = 1;

// Oceano Lite (extensão de Chrome): sem abas falsas; buscas e sites abrem de verdade
// e as páginas internas viram endereços com # (o botão voltar do Chrome funciona).
app.lite = document.documentElement.dataset.modo === 'lite';
// Oceano MVP (app em Electron): abas reais com <webview>; o resto é igual ao simulador.
app.real = document.documentElement.dataset.modo === 'app';
// a tabela de atalhos (oceano://atalhos muda; no app o menu nativo é refeito com a escolha)
app.atalhos = criarAtalhos({ real: app.real, guardado, aoMudar: () => { if (app.real) window.oceanoNativo?.atalhosDefinir?.(app.atalhos.aceleradores()); emitir('atalhos'); } });
const nativo = window.oceanoNativo;
const ehSite = url => app.real && /^https?:/i.test(url);
const rotaDoHash = () => 'oceano://' + (decodeURIComponent(location.hash.slice(1)) || 'nova-aba');

// ---------- temas ----------

async function carregarTemas() {
  app.ordemTemas = await (await fetch('temas/index.json')).json();
  for (const id of app.ordemTemas) app.temas[id] = await (await fetch(`temas/${id}.json`)).json();
  // temas criados ou instalados pelo usuário passam pela mesma validação
  for (const bruto of guardado.ler('temas-extras', [])) {
    const { tema } = validarTema(bruto);
    if (tema && !app.temas[tema.id]) { tema.extra = true; app.temas[tema.id] = tema; app.ordemTemas.push(tema.id); }
  }
}

function salvarTemasExtras() {
  guardado.gravar('temas-extras', app.ordemTemas.map(id => app.temas[id]).filter(t => t.extra).map(({ extra, ...t }) => t));
}

// Guarda um tema do usuário (novo ou editado). Devolve o id final.
app.salvarTema = function (tema, idAnterior) {
  // editar um tema do usuário substitui o anterior; temas embutidos nunca são sobrescritos
  let pos = app.ordemTemas.length;
  if (idAnterior && app.temas[idAnterior]?.extra) {
    pos = app.ordemTemas.indexOf(idAnterior);
    delete app.temas[idAnterior];
    app.ordemTemas.splice(pos, 1);
  }
  let id = tema.id, n = 2;
  while (app.temas[id]) id = `${tema.id}-${n++}`;
  app.temas[id] = { ...tema, id, extra: true };
  app.ordemTemas.splice(pos, 0, id);
  salvarTemasExtras();
  return id;
};

app.removerTema = function (id) {
  if (!app.temas[id]?.extra) return;
  delete app.temas[id];
  app.ordemTemas = app.ordemTemas.filter(x => x !== id);
  salvarTemasExtras();
  if (app.tema.id === id) app.aplicarTema('oceano');
};

app.aplicarTema = function (id) {
  const tema = app.temas[id] || app.temas.oceano;
  guardado.gravar('tema', tema.id);
  app.aplicarTemaObj(tema);
};

// Aplica sem salvar a escolha (o editor usa isso para a prévia ao vivo).
app.aplicarTemaObj = function (tema) {
  app.tema = tema;
  const raiz = document.documentElement.style;
  for (const [token, indice] of Object.entries(tema.ui)) raiz.setProperty('--' + token, tema.paleta[indice]);
  // o notch do Mac (outra janela, mesma origem) lê as cores daqui para as janelinhas dele
  try { localStorage.setItem('oceano:tema-ui', JSON.stringify(Object.fromEntries(Object.entries(tema.ui).map(([k, i]) => [k, tema.paleta[i]])))); } catch {}
  emitir('tema-ui');
  try { localStorage.setItem('oceano:tema-paleta', JSON.stringify(tema.paleta)); } catch {}   // o notch pinta o avatar com as mesmas cores
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema.paleta[tema.ui.painel]);
  app.mar?.definirEstilo(normalizarMar(tema.mar, tema.paleta.length), tema.paleta);
  for (const m of app.mods) m.cart?.atualizarCores();
  app.assistente?.atualizarCores();
  app.trilha?.atualizarCores();
};

// ---------- mods ----------

const hostDosMods = {
  tema: () => app.tema,
  sfx: def => tocar(def),
  on,
  modoJogo: (v, cart) => app.definirModoJogo(v, cart.mod.nome),
  congelarAbas: () => app.congelarAbas(true),
  notificar: (msg, cart) => app.aviso(msg, cart.mod.nome),
  ler: (cart, chave) => guardado.ler('mod-dados:' + cart.mod.id, {})[chave],
  guardar: (cart, chave, valor) => {
    const dados = guardado.ler('mod-dados:' + cart.mod.id, {});
    if (valor == null) delete dados[chave]; else dados[chave] = valor;
    if (JSON.stringify(dados).length > 8192) throw new Error('memória do mod cheia (limite de 8 KB)');
    guardado.gravar('mod-dados:' + cart.mod.id, dados);
  },
  aoLogar: cart => app.paginaAtual?.aoLogar?.(cart),
  aoFalhar: cart => {
    app.aviso(`${cart.mod.nome} foi pausado: ${cart.erro}`, 'sandbox', 'erro');
    app.paginaAtual?.aoLogar?.(cart);
  },
};

app.hostDosMods = hostDosMods;

async function carregarMods() {
  const manifesto = await (await fetch('mods/index.json')).json();
  const extras = guardado.ler('mods-extras', []);
  const prefs = guardado.ler('mods', {});
  for (const m of [...manifesto, ...extras]) {
    if (app.lite && m.soNavegador) continue;   // ex.: modo jogo, que só existe no navegador completo
    const original = m.codigo ?? await (await fetch(`mods/${m.id}.${m.linguagem === 'teal' ? 'tl' : 'lua'}`)).text();
    const p = prefs[m.id] || {};
    app.mods.push({
      ...m,
      linguagem: m.linguagem || 'lua',
      original,
      codigo: m.construcao ? original : p.codigo ?? original,
      ligado: m.construcao ? false : p.ligado ?? m.ligado,   // em construção: desligado, mesmo que já tenha sido ligado antes
      permissoes: m.construcao ? m.permissoes : p.permissoes ?? m.permissoes,
      emoji: p.emoji || m.emoji || REFERENCIAS_MODS[m.id] || referenciaLivre(app.mods),
      extra: extras.includes(m),
      cart: null,
    });
  }
  await Promise.all(app.mods.filter(m => m.ligado).map(m => app.iniciarMod(m)));
}

// A faixa viva embaixo das abas (pescadores, surfistas, peixes): um botão no canto troca qual delas aparece.
// Só uma fica ligada por vez, e a escolha fica guardada como qualquer mod.
function montarTrocaBarra() {
  const slot = document.querySelector('.slot-barra');
  if (!slot || app.lite) return;
  const casa = document.createElement('div');
  casa.className = 'barra-viva';
  slot.before(casa); casa.append(slot);
  const b = document.createElement('button');
  b.className = 'barra-trocar ico';
  b.innerHTML = icone('onda');
  casa.append(b);
  const opcoes = () => app.mods.filter(m => m.lugar === 'barra');
  const titulo = () => { const atual = opcoes().find(m => m.ligado); const prox = opcoes()[(opcoes().indexOf(atual) + 1) % opcoes().length]; b.title = `Faixa: ${atual?.nome || 'nenhuma'} · clique para ${prox?.nome || 'trocar'}`; b.setAttribute('aria-label', b.title); };
  titulo();
  b.onclick = async () => {
    const lista = opcoes(), atual = lista.find(m => m.ligado), prox = lista[(lista.indexOf(atual) + 1) % lista.length];
    for (const m of lista) if (m.ligado && m !== prox) await app.alternarMod(m, false);
    if (prox && !prox.ligado) await app.alternarMod(prox, true);
    titulo();
    app.aviso(`Faixa de cima: ${prox?.nome}.`, 'Mods');
  };
}

function salvarMods() {
  const prefs = {};
  for (const m of app.mods) prefs[m.id] = { ligado: m.ligado, permissoes: m.permissoes, emoji: m.emoji || undefined, codigo: m.codigo !== m.original ? m.codigo : undefined };
  guardado.gravar('mods', prefs);
  guardado.gravar('mods-extras', app.mods.filter(m => m.extra).map(({ id, nome, tipo, lugar, descricao, linguagem, permissoes, original }) =>
    ({ id, nome, tipo, lugar, descricao, linguagem, permissoes, ligado: true, codigo: original })));
}

app.iniciarMod = async function (mod) {
  mod.cart?.parar();
  mod.cart?.canvas?.remove();
  const cart = new Cart(mod, hostDosMods);
  mod.cart = cart;
  await cart.iniciar(mod.codigo);
  app.montarSlots();
  return cart;
};

app.alternarMod = async function (mod, ligado) {
  if (mod.construcao) return;
  queueMicrotask(() => emitir('mods-mudaram'));
  mod.ligado = ligado;
  salvarMods();
  if (ligado) await app.iniciarMod(mod);
  else { mod.cart?.parar(); mod.cart?.canvas?.remove(); mod.cart = null; }
};

app.salvarCodigo = async function (mod, codigo) {
  if (new Blob([codigo]).size > MAX_MOD_BYTES) { app.aviso('Este mod passou de 32 KB, o tamanho de um cartucho do PICO-8. É o limite criativo desta versão.', 'Mods', 'erro'); return; }
  mod.codigo = codigo;
  mod.ligado = true;
  salvarMods();
  await app.iniciarMod(mod);
};

app.definirPermissoes = async function (mod, permissoes) {
  mod.permissoes = permissoes;
  salvarMods();
  if (mod.ligado) await app.iniciarMod(mod);
};

const MODELOS = {
  lua: n => `-- Meu mod ${n} · um widget para a nova aba
-- Edite e aperte Rodar (ou Ctrl/Cmd + Enter).

largura, altura = 64, 40
local x, y, vx, vy = 10, 10, 1.1, 0.8

function _update()
  x, y = x + vx, y + vy
  if x < 2 or x > W - 3 then vx = -vx; sfx("clique") end
  if y < 2 or y > H - 3 then vy = -vy; sfx("clique") end
end

function _draw()
  cls(cor.painel)
  rect(0, 0, W - 1, H - 1, cor.borda)
  circfill(x, y, 2, cor.destaque)
  print("OLA!", 4, 4, cor.texto)
end
`,
  teal: n => `-- Meu mod ${n} · widget em Teal (Lua com tipos)
-- Os tipos são conferidos antes de rodar. Tente: bola.x = "oi"

largura, altura = 64, 40

local record Bola
  x: number
  y: number
  vx: number
  vy: number
end

local bola: Bola = { x = 10, y = 10, vx = 1.1, vy = 0.8 }

function _update()
  bola.x = bola.x + bola.vx
  bola.y = bola.y + bola.vy
  if bola.x < 2 or bola.x > W - 3 then bola.vx = -bola.vx; sfx("clique") end
  if bola.y < 2 or bola.y > H - 3 then bola.vy = -bola.vy; sfx("clique") end
end

function _draw()
  cls(cor.painel)
  rect(0, 0, W - 1, H - 1, cor.borda)
  circfill(bola.x, bola.y, 2, cor.destaque)
  print("OLA!", 4, 4, cor.texto)
end
`,
};

// mod vindo de um arquivo: recebe só as permissões que o código pede, e a pessoa vê tudo antes
app.importarMod = function ({ nome, linguagem, codigo, permissoes, emoji }) {
  const base = slug(nome).slice(0, 24) || 'mod';
  let id = base, n = 2;
  while (app.mods.some(m => m.id === id)) id = `${base}-${n++}`;
  const mod = { id, nome: String(nome).slice(0, 40), tipo: 'widget', lugar: 'nova-aba', linguagem, descricao: 'Importado de um arquivo.', permissoes, emoji: emoji || referenciaLivre(app.mods), ligado: true, original: codigo, codigo, extra: true, cart: null };
  app.mods.push(mod);
  salvarMods();
  app.iniciarMod(mod);
  return mod;
};

app.novoMod = function (linguagem = 'lua') {
  let n = 1;
  while (app.mods.some(m => m.id === `meu-mod-${n}`)) n++;
  const codigo = MODELOS[linguagem](n);
  const mod = {
    id: `meu-mod-${n}`, nome: `Meu mod ${n}`, tipo: 'widget', lugar: 'nova-aba', linguagem,
    descricao: `Criado por você no simulador, em ${linguagem === 'teal' ? 'Teal' : 'Lua'}.`, permissoes: ['tela', 'controles', 'som'], emoji: referenciaLivre(app.mods),
    ligado: true, original: codigo, codigo, extra: true, cart: null,
  };
  app.mods.push(mod);
  salvarMods();
  app.iniciarMod(mod);
  return mod;
};

app.definirEmojiMod = function (mod, texto) {
  const r = validarEmojiMod(texto, app.mods, mod.id);
  if (!r.erro) { mod.emoji = r.emoji; salvarMods(); }
  return r;
};

app.removerMod = function (mod) {
  mod.cart?.parar(); mod.cart?.canvas?.remove();
  app.mods = app.mods.filter(m => m !== mod);
  app.iconesMesa.remover(`oceano://mods/editar?id=${mod.id}`);
  salvarMods();
};

// Leva cada quadro de mod até o lugar dele na página atual (ou ao editor).
app.montarSlots = function () {
  mesa?.atualizarWidgets();
  for (const m of app.mods) {
    const cv = m.cart?.canvas;
    if (!cv || !m.cart.temTela) continue;
    const alvo = document.querySelector(`[data-slot="editor:${m.id}"]`) || document.querySelector(`[data-slot="mesa:${m.id}"]`) || document.querySelector(`[data-slot="${m.lugar}"]`);
    if (alvo) { if (cv.parentElement !== alvo) alvo.appendChild(cv); }
    else cv.remove();
  }
};

// ---------- modo jogo ----------

app.definirModoJogo = function (v, origem = 'você') {
  if (app.modoJogo === v) return;
  app.modoJogo = v;
  app.mar.fpsMax = v ? 12 : 60;
  if (!v) app.congelarAbas(false);
  document.documentElement.classList.toggle('modo-jogo', v);
  app.registrarJogo(`modo jogo ${v ? 'ligado' : 'desligado'} por ${origem}`);
  emitir('modo_jogo', v);
  renderizarBarra();
  app.paginaAtual?.atualizar?.();
};

app.congelarAbas = function (v) {
  app.congeladas = v;
  if (v) app.registrarJogo(`${app.abas.length - 1} aba(s) em segundo plano congelada(s)${app.real ? ' de verdade' : ''}`);
  sincronizarCongelamento();
  renderizarAbas();
};

app.registrarJogo = function (msg) {
  app.eventosJogo.unshift({ hora: new Date(), msg });
  app.eventosJogo.length = Math.min(app.eventosJogo.length, 30);
  app.paginaAtual?.atualizar?.();
};

// ---------- log de rede: o que o PRÓPRIO navegador acessa ----------

app.skills = criarSkills(guardado, { aoUsarRede: (...a) => app.registrarRede(...a) });
app.iconesMesa = criarIconesMesa(guardado);
// cor de fundo do avatar: uma para o navegador, outra para o notch (que lê a dele quando ela muda). Vazio = a do tema.
app.fundoAvatar = {
  ler: onde => guardado.ler(onde === 'notch' ? 'notch-avatar-fundo' : 'avatar-fundo', ''),
  definir(onde, cor) {
    guardado.gravar(onde === 'notch' ? 'notch-avatar-fundo' : 'avatar-fundo', cor);
    if (onde !== 'notch') document.documentElement.style[cor ? 'setProperty' : 'removeProperty']('--avatar-fundo', cor);
  },
};
app.fundoAvatar.definir('navegador', app.fundoAvatar.ler('navegador'));
app.conexoes = criarConexoes(guardado, { aoUsarRede: (...a) => app.registrarRede(...a) });

app.registrarRede = function (destino, motivo, envia) {
  // conexões iguais em sequência viram uma linha só, com a contagem
  const ultima = app.rede[0];
  if (ultima && ultima.destino === destino && ultima.motivo === motivo && Date.now() - ultima.hora < 60000) {
    ultima.vezes = (ultima.vezes || 1) + 1;
    ultima.hora = new Date();
    app.paginaAtual?.atualizar?.();
    return;
  }
  app.rede.unshift({ hora: new Date(), destino, motivo, envia });
  app.paginaAtual?.atualizar?.();
};

// ---------- abas e navegação ----------

app.tituloDe = (...a) => tituloDe(...a);
function tituloDe(url, aba) {
  if (ehSite(url)) { try { return aba?.titulo || new URL(url).hostname; } catch { return url; } }
  const r = rotaDe(url);
  return PAGINAS[r.pagina]?.titulo?.(r, app) ?? url;
}

// opcoes.perfil: id do perfil (padrão: o da aba ativa); opcoes.efemera: sessão só na memória, apagada ao fechar
app.novaAba = function (url = 'oceano://nova-aba', ativar = true, opcoes = {}) {
  const aba = { id: proximoId++, historico: [url], pos: 0, console: [] };
  if (app.real) {
    if (opcoes.efemera) { aba.efemera = true; aba.particao = `oceano-efemera-${aba.id}`; }
    else {
      aba.perfil = app.perfis?.some(p => p.id === opcoes.perfil) ? opcoes.perfil : app.abaAtiva?.perfil || 'pessoal';
      aba.particao = app.particaoDe(aba.perfil);
    }
  } else if (app.perfis) aba.perfil = app.perfis.some(p => p.id === opcoes.perfil) ? opcoes.perfil : app.abaAtiva?.perfil;
  app.abas.push(aba);
  if (ativar) app.abaAtiva = aba;
  emitir('aba_aberta', url);
  renderizar();
  // aba nova em branco: o cursor já vai para o endereço (o rAF passa na frente do foco que a webview tentar pegar)
  if (ativar && url === 'oceano://nova-aba' && !opcoes.semFoco) requestAnimationFrame(() => { const e = $('#endereco'); e.focus(); e.select(); });
  return aba;
};

// as últimas abas fechadas, para ⌘⇧T (as efêmeras não voltam: o que era delas já foi apagado)
const fechadas = [];
app.fechadas = fechadas;
// sem escolha, volta a última; a lista do botão voltar escolhe qual
app.reabrirAba = function (escolhida) {
  const f = escolhida ? fechadas.splice(fechadas.indexOf(escolhida), 1)[0] : fechadas.pop();
  if (!f) return app.aviso('Nenhuma aba fechada para reabrir.', 'Abas');
  app.midia?.pararFantasmas();
  const aba = app.novaAba(f.historico[f.pos], true, { perfil: f.perfil, semFoco: true });
  aba.historico = f.historico; aba.pos = f.pos;
  app.abas.splice(app.abas.indexOf(aba), 1);
  app.abas.splice(Math.min(f.i, app.abas.length), 0, aba);
  renderizar();
};

app.fecharAba = function (aba) {
  const i = app.abas.indexOf(aba);
  if (i < 0) return;
  app.abas.splice(i, 1);
  if (!aba.efemera) { fechadas.push({ historico: [...aba.historico], pos: aba.pos, perfil: aba.perfil, titulo: aba.titulo, i }); if (fechadas.length > 25) fechadas.shift(); }
  // com música tocando, o site pode seguir vivo e escondido (o player da mesa controla); opção em Configurações
  if (!app.midia?.guardarAoFechar(aba)) aba.wv?.remove();
  if (aba.janelaMini) window.oceanoNativo?.miniFechar();   // fechou a aba: a janelinha dela não fica tocando
  if (aba.efemera) nativo.efemeraApagar(aba.particao);   // cookies, cache e armazenamento somem junto com a aba
  emitir('aba_fechada');
  if (!app.abas.length) { app.novaAba(); return; }
  if (app.abaAtiva === aba) app.abaAtiva = app.abas[Math.max(0, i - 1)];
  renderizar();
};

app.url = () => app.abaAtiva.historico[app.abaAtiva.pos];

// Buscador padrão: a IA (oceano://busca, responde e sugere sites), o DuckDuckGo ou o Google.
// No simulador, DuckDuckGo e Google caem na página "sem conexão" (ele não abre sites de verdade).
const BUSCADORES = {
  ia: { nome: 'IA do Oceano' },
  duckduckgo: { nome: 'DuckDuckGo', url: q => 'https://duckduckgo.com/?q=' + encodeURIComponent(q) },
  google: { nome: 'Google', url: q => 'https://www.google.com/search?q=' + encodeURIComponent(q) },
};
app.buscadores = BUSCADORES;
app.buscador = () => BUSCADORES[guardado.ler('buscador', 'ia')] ? guardado.ler('buscador', 'ia') : 'ia';
app.definirBuscador = id => { if (BUSCADORES[id]) guardado.gravar('buscador', id); };
app.urlDeBusca = (q, qual = app.buscador()) => qual === 'ia' ? `oceano://busca?q=${encodeURIComponent(q)}`
  : app.real ? BUSCADORES[qual].url(q) : `oceano://offline?q=${encodeURIComponent(q)}`;
// a IA só existe no app (a chave fica no processo principal); no simulador ela aparece como não configurada
app.ia = app.real && nativo?.iaEstado
  ? { estado: () => nativo.iaEstado(), definir: c => nativo.iaDefinir(c), buscar: q => nativo.iaBuscar(q), esquecer: () => nativo.iaEsquecer() }
  : { estado: async () => ({ configurada: false, simulador: true }), definir: async () => ({}), buscar: async () => ({ erro: 'sem-ia' }), esquecer: async () => true };

app.navegar = function (entrada) {
  let url = String(entrada).trim();
  if (!url) return;
  if (!/^[a-z]+:\/\//i.test(url)) {
    if (app.lite && !/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(url)) return buscar(url);
    url = /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(url) ? 'https://' + url : app.urlDeBusca(url);
  }
  if (app.lite) {
    if (!url.startsWith('oceano://')) { location.href = url; return; }
    const destino = '#' + url.slice('oceano://'.length);
    if (location.hash !== destino) location.hash = destino;   // o hashchange renderiza
    else renderizar();
    return;
  }
  const aba = app.abaAtiva;
  aba.historico = aba.historico.slice(0, aba.pos + 1);
  aba.historico.push(url);
  aba.pos++;
  emitir('navegar', url);
  renderizar();
};

// No Lite, a busca usa o buscador padrão do Chrome (permissão "search").
function buscar(texto) {
  emitir('navegar', texto);
  if (globalThis.chrome?.search?.query) chrome.search.query({ text: texto, disposition: 'CURRENT_TAB' });
  else location.href = 'https://duckduckgo.com/?q=' + encodeURIComponent(texto);
}

// ---------- sites de verdade (só no app) ----------
// Cada aba com site tem sua própria <webview>, que continua viva quando a aba fica
// em segundo plano. O histórico interno do site fica com a webview.

function siteNavegou(aba, url) {
  aba.wvUrl = url;
  aba.historico[aba.pos] = url;
  emitir('navegar', url);
  renderizarAbas();
  if (aba === app.abaAtiva) { renderizarBarra(); document.title = `${tituloDe(url, aba)} · Oceano`; }
}

// o botão do mini player só aparece em página que tem vídeo
function verVideo(aba) {
  aba.wv?.executeJavaScript("!!document.querySelector('video')").then(tem => {
    if (aba.temVideo === tem) return;
    aba.temVideo = tem;
    if (aba === app.abaAtiva) renderizarBarra();
  }).catch(() => {});
}

function criarWebview(aba, url) {
  const wv = document.createElement('webview');
  wv.setAttribute('partition', aba.particao || 'persist:oceano');
  wv.setAttribute('src', url);
  if (aba.ua) wv.setAttribute('useragent', aba.ua);
  aba.wv = wv;
  aba.wvUrl = url;
  app.navegacao?.ligarWebview(aba);
  wv.addEventListener('dom-ready', () => { aba.wcId = wv.getWebContentsId(); sincronizarCongelamento(); wv.executeJavaScript(JS_MENU_VIDEO).catch(() => {}); });
  wv.addEventListener('did-navigate', e => siteNavegou(aba, e.url));
  wv.addEventListener('did-navigate-in-page', e => { if (e.isMainFrame) { siteNavegou(aba, e.url); setTimeout(() => verVideo(aba), 900); } });
  wv.addEventListener('page-title-updated', e => { aba.titulo = e.title; siteNavegou(aba, aba.wvUrl); });
  wv.addEventListener('did-start-loading', () => { aba.carregando = true; renderizarAbas(); });
  // vídeo/áudio tocando: liga o botão do mini player e permite abrir sozinho ao trocar de aba
  wv.addEventListener('media-started-playing', () => { aba.tocandoMidia = true; app.midia?.comecou(aba); if (aba === app.abaAtiva) renderizarBarra(); });
  wv.addEventListener('media-paused', () => { aba.tocandoMidia = false; app.midia?.pausou(aba); if (aba === app.abaAtiva) renderizarBarra(); });
  wv.addEventListener('did-stop-loading', () => { aba.carregando = false; verVideo(aba); renderizarAbas(); if (aba === app.abaAtiva) renderizarBarra(); emitir('site_carregou', aba); });
  // console do site guardado por aba (o painel Dev mostra erros e avisos sem abrir o DevTools)
  wv.addEventListener('console-message', e => {
    const menu = /^oceano:menu-video:(\d+),(\d+)$/.exec(e.message || '');
    if (menu) return menuDoVideo(aba, +menu[1], +menu[2]);
    const nivel = typeof e.level === 'string' ? e.level : ['debug', 'info', 'warning', 'error'][e.level] || 'info';
    aba.console.push({ hora: Date.now(), nivel, texto: e.message, fonte: e.sourceId, linha: e.line ?? e.lineNumber });
    if (aba.console.length > 300) aba.console.splice(0, aba.console.length - 300);
    emitir('console', aba);
  });
  wv.addEventListener('did-fail-load', e => {
    if (e.isMainFrame && e.errorCode !== -3) { aba.console.push({ hora: Date.now(), nivel: 'error', texto: `Falha ao carregar (${e.errorCode} ${e.errorDescription})`, fonte: e.validatedURL }); emitir('console', aba); }
  });
  $('#sites').appendChild(wv);
}

function mostrarSite(visivel) {
  for (const a of app.abas) a.wv?.classList.toggle('oculto', a !== visivel);
  if (!visivel) { app.navegacao?.desenharErro(); return; }
  const url = visivel.historico[visivel.pos];
  if (!visivel.wv) criarWebview(visivel, url);
  else if (visivel.wvUrl !== url) { visivel.wvUrl = url; visivel.wv.loadURL(url).catch(() => {}); }
  app.navegacao?.desenharErro();
}

const podeSite = (aba, metodo) => { try { return !!aba.wv && ehSite(aba.historico[aba.pos]) && aba.wv[metodo](); } catch { return false; } };

// Modo jogo de verdade: abas em segundo plano ficam congeladas (sem JavaScript, sem timers, sem som).
function sincronizarCongelamento() {
  if (!app.real) return;
  for (const a of app.abas) {
    const deve = app.congeladas && a !== app.abaAtiva && !a.pip;   // a aba no mini player continua tocando
    if (a.wcId && !!a.congelada !== deve) { a.congelada = deve; nativo.congelar(a.wcId, deve); }
  }
}

// ---------- mini player (picture in picture) ----------
// O vídeo da página vai para uma janelinha do próprio Chromium que flutua por cima de tudo, até fora do navegador.
// Se o site não deixar, o app abre uma janela pequena dele, sempre por cima (plano B).
const JS_PIP = `(async () => {
  if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return 'saiu'; }
  const vs = [...document.querySelectorAll('video')].filter(v => v.readyState > 0);
  const v = vs.find(v => !v.paused) || vs.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
  if (!v) return 'sem-video';
  if (v.disablePictureInPicture) return 'bloqueado';
  try { await v.requestPictureInPicture(); v.addEventListener('leavepictureinpicture', () => console.debug('oceano:pip-saiu'), { once: true }); return 'entrou'; }
  catch (e) { return 'erro:' + e.message; }
})()`;
const JS_PIP_SAIR = `document.pictureInPictureElement ? document.exitPictureInPicture().then(() => 'saiu') : 'nada'`;
const JS_PIP_TEMPO = `(() => { const v = [...document.querySelectorAll('video')].find(v => !v.paused) || document.querySelector('video'); return v ? Math.floor(v.currentTime) : 0; })()`;

app.miniPlayer = async function (aba = app.abaAtiva, { auto = false } = {}) {
  const url = aba?.historico[aba.pos];
  const rodar = codigo => app.real ? aba.wv.executeJavaScript(codigo, true) : (0, eval)(codigo);   // simulador: vídeos da própria página
  if (app.real && (!aba?.wv || !ehSite(url))) { if (!auto) app.aviso('Abra um site com vídeo para usar o mini player.', 'Mini player'); return; }
  // o mesmo botão desliga a janelinha própria
  if (aba.janelaMini) { aba.janelaMini = false; await window.oceanoNativo.miniFechar(); if (aba === app.abaAtiva) renderizarBarra(); return; }
  const r = await Promise.resolve(rodar(JS_PIP)).catch(e => 'erro:' + e.message);
  if (r === 'entrou') { aba.pip = true; aba.pipAuto = auto; }
  else if (r === 'saiu') { aba.pip = false; aba.pipAuto = false; }
  else if (r === 'sem-video') { if (!auto) app.aviso('Esta página não tem vídeo para o mini player.', 'Mini player'); }
  else if (app.real && window.oceanoNativo?.miniJanela) {
    // plano B: o site bloqueou o picture in picture (ou ele falhou): janela própria, sempre por cima
    const t = await aba.wv.executeJavaScript(JS_PIP_TEMPO).catch(() => 0);
    await window.oceanoNativo.miniJanela({ url, tempo: t, particao: aba.particao || 'persist:oceano' });
    aba.janelaMini = true;
    aba.wv.executeJavaScript(`document.querySelectorAll('video').forEach(v => v.pause())`).catch(() => {});
  } else if (!auto) app.aviso(r === 'bloqueado' ? 'Este site não deixa o vídeo sair da página.' : `O mini player não abriu (${String(r).slice(5) || r}).`, 'Mini player', 'erro');
  sincronizarCongelamento();
  if (aba === app.abaAtiva) renderizarBarra();
};

// clique direito em cima de um vídeo: o menu do Oceano, com a janelinha flutuante primeiro
function menuDoVideo(aba, x, y) {
  const r = aba.wv.getBoundingClientRect();
  aba.cdPedido = true;   // a pessoa abriu o menu do vídeo: só agora o player pode aparecer
  app.midia?.comecou(aba);
  menuContexto(r.left + x, r.top + y, [['ver', aba.pip ? 'Voltar o vídeo para a página' : 'Assistir na janelinha flutuante'], ['alternar', aba.tocandoMidia ? 'Pausar' : 'Tocar'], ['repetir', 'Repetir']], v => {
    if (v === 'ver') app.miniPlayer(aba);
    if (v === 'alternar') app.midia?.comando(aba.tocandoMidia ? 'pausar' : 'tocar');
    if (v === 'repetir') app.midia?.comando('repetir');
  });
}

// trocar de aba com vídeo tocando abre o mini player sozinho; voltar para ela fecha
let ultimaAtiva = null;
function trocouDeAba() {
  const antes = ultimaAtiva, agora = app.abaAtiva;
  ultimaAtiva = agora;
  if (!app.real || antes === agora) return;
  if (agora?.pipAuto && agora.wv) { agora.wv.executeJavaScript(JS_PIP_SAIR, true).catch(() => {}); agora.pip = agora.pipAuto = false; }
  if (antes && app.abas.includes(antes) && antes.tocandoMidia && !antes.pip && guardado.ler('pip-auto', false)) app.miniPlayer(antes, { auto: true });
}

function recarregar(semCache) {
  if (ehSite(app.url())) semCache ? app.abaAtiva.wv?.reloadIgnoringCache() : app.abaAtiva.wv?.reload();
  else renderizarPagina();
}
app.recarregar = recarregar;

app.executarAtalho = (...a) => executarAtalho(...a);
function executarAtalho(nome) {
  const aba = app.abaAtiva;
  if (nome === 'nova-aba') app.novaAba();
  else if (nome === 'fechar-aba') app.fecharAba(aba);
  else if (nome === 'endereco') { $('#endereco').focus(); $('#endereco').select(); }
  else if (nome === 'recarregar') recarregar();
  else if (nome === 'recarregar-sem-cache') recarregar(true);
  else if (nome === 'nova-efemera') app.novaAba(undefined, true, { efemera: true });
  else if (nome === 'privacidade') app.navegar('oceano://privacidade');
  else if (['comandos', 'painel-dev'].includes(nome)) emitir('atalho_dev', nome);
  else if (nome === 'voltar') mover(-1);
  else if (nome === 'avancar') mover(1);
  else if (nome === 'proxima-aba') irAba(app.abas.indexOf(aba) + 1);
  else if (nome === 'aba-anterior') irAba(app.abas.indexOf(aba) - 1);
  else if (nome.startsWith('ir-aba-')) { const n = Number(nome.slice(7)) - 1; if (n < app.abas.length) irAba(n); }
  else if (nome === 'ultima-aba') irAba(app.abas.length - 1);
  else if (nome === 'reabrir-aba') app.reabrirAba();
  else if (nome === 'procurar') app.navegacao.abrirProcurar();
  else if (nome === 'zoom-mais') app.navegacao.zoom(1);
  else if (nome === 'zoom-menos') app.navegacao.zoom(-1);
  else if (nome === 'zoom-normal') app.navegacao.zoom(0);
  else if (nome === 'imprimir') app.navegacao.imprimir();
  else if (nome === 'downloads') app.novaAba('oceano://downloads');
  else if (nome === 'inicio') app.navegar('oceano://nova-aba');
  else if (nome === 'atalhos') app.navegar('oceano://atalhos');
  else if (nome === 'configuracoes') app.navegar('oceano://configuracoes');
  else if (nome === 'mini-player') app.miniPlayer();
  else if (nome === 'historico') app.novaAba('oceano://historico');
  else if (nome === 'favoritar') app.historico?.alternarFavorito();
  else if (nome === 'leitor') app.leitura?.lerPaginaAtual();
  else if (nome === 'leitura') app.novaAba('oceano://leitura');
  else if (nome === 'modo-jogo') app.definirModoJogo(!app.modoJogo);
  else if (nome === 'barra-lateral') app.mostrarLateral($('#lateral').hidden);
  else if (nome === 'assistente') {
    app.mostrarLateral(true); app.abaLateral('assistente');
    app.carregarPainel('assistente').then(() => document.querySelector('.as-entrada')?.focus());
  }
  else if (nome === 'trilha') app.carregarTrilha().then(t => t?.alternar());
  else if (nome === 'musica-proxima') app.musica?.proxima();
  else if (nome.startsWith('musica-')) app.musica?.ir(nome.slice(7));
  else if (nome === 'copiar-link-limpo') {
    const { url, tirados } = linkLimpo(app.url());
    navigator.clipboard.writeText(url).then(
      () => app.aviso(tirados.length ? `Link copiado sem ${tirados.join(', ')}.` : 'Link copiado (não tinha rastreador).', 'Abas'),
      () => app.aviso('Não deu para copiar o link.', 'Abas', 'erro'));
  }
  else if (nome === 'devtools') {
    if (ehSite(app.url()) && aba.wv) aba.wv.openDevTools();
    else app.aviso('Páginas internas: use ⌥⇧⌘I para o DevTools da interface do Oceano.', 'DevTools');
  }
}

function menuContexto(x, y, itens, escolher) {
  document.querySelector('.menu-ctx')?.remove();
  const m = document.createElement('div');
  m.className = 'menu-ctx px';
  m.innerHTML = itens.map(([v, t]) => `<button data-v="${v}">${t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</button>`).join('');
  document.body.append(m);
  m.style.left = Math.min(x, innerWidth - m.offsetWidth - 8) + 'px';
  m.style.top = Math.min(y, innerHeight - m.offsetHeight - 8) + 'px';
  const fechar = () => { m.remove(); removeEventListener('pointerdown', fora, true); };
  const fora = e => { if (!m.contains(e.target)) fechar(); };
  addEventListener('pointerdown', fora, true);
  m.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { fechar(); escolher(b.dataset.v); } };
}

function irAba(i) {
  app.abaAtiva = app.abas[(i + app.abas.length) % app.abas.length];
  renderizar();
}

function mover(passo) {
  const aba = app.abaAtiva;
  if (passo < 0 && podeSite(aba, 'canGoBack')) return aba.wv.goBack();
  if (passo > 0 && podeSite(aba, 'canGoForward')) return aba.wv.goForward();
  const nova = aba.pos + passo;
  if (nova < 0 || nova >= aba.historico.length) return;
  aba.pos = nova;
  renderizar();
}

// ---------- interface ----------

const $ = s => document.querySelector(s);

function renderizarAbas() {
  app.navegacao?.salvarSessao();
  if (!$('#abas')) return;
  let grupoAnterior = null;
  $('#abas').innerHTML = app.abas.map(a => {
    const url = a.historico[a.pos];
    const g = a.grupo && app.grupos?.achar(a.grupo);
    const rotuloGrupo = g && g.id !== grupoAnterior ? `<button class="aba-grupo" style="--grupo: var(--${g.cor})" data-acao="grupo" data-grupo="${g.id}" title="Grupo ${g.nome.replace(/"/g, '&quot;')} · clique para ver na página inicial">${g.nome.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</button>` : '';
    grupoAnterior = g ? g.id : null;
    const r = rotaDe(url);
    const congelada = app.congeladas && a !== app.abaAtiva;
    const perfil = app.perfis?.find(p => p.id === a.perfil);
    const marca = a.efemera ? ' style="--perfil: var(--suave)"' : perfil && app.perfis.length > 1 ? ` style="--perfil: ${perfil.cor}"` : '';
    const titulo = tituloDe(url, a).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dica = a.efemera ? `${titulo} · aba efêmera: tudo some ao fechar` : perfil ? `${titulo} · perfil ${perfil.nome}` : titulo;
    return `${rotuloGrupo}<div class="aba${g ? ' com-grupo' : ''}${a === app.abaAtiva ? ' ativa' : ''}${congelada ? ' congelada' : ''}${a.carregando ? ' carregando' : ''}${a.efemera ? ' efemera' : ''}${marca ? ' com-perfil' : ''}" data-aba="${a.id}" title="${dica}"${marca}>
      ${icone(ehSite(url) ? 'mundo' : PAGINAS[r.pagina]?.icone || 'mundo', 'aba-icone')}
      ${app.gravando?.naAba(a) || ''}
      <span class="aba-titulo">${a.efemera ? '<i class="tag-efemera">efêmera</i> ' : ''}${titulo}</span>
      ${congelada ? '<span class="zz" title="Congelada pelo modo jogo">zZ</span>' : ''}
      <button class="aba-fechar" data-acao="fechar-aba" data-aba="${a.id}" aria-label="Fechar aba">${icone('fechar')}</button>
    </div>`.replace('class="aba', g ? `style="--grupo: var(--${g.cor})" class="aba` : 'class="aba');
  }).join('') + `<button class="aba-nova" data-acao="nova-aba" aria-label="Nova aba">${icone('mais')}</button>`;
}

function renderizarBarra() {
  $('#btn-som').innerHTML = icone(somLigado() ? 'som' : 'mudo');
  $('#btn-som').setAttribute('aria-pressed', somLigado());
  if (app.lite) {
    const pagina = rotaDe(app.url()).pagina;
    document.querySelectorAll('.lite-nav [data-ir]').forEach(a => a.setAttribute('aria-current', rotaDe(a.dataset.ir).pagina === pagina ? 'page' : 'false'));
    return;
  }
  const aba = app.abaAtiva;
  const url = app.url();
  const interno = url.startsWith('oceano://');
  $('#voltar').disabled = aba.pos === 0 && !podeSite(aba, 'canGoBack');
  $('#avancar').disabled = aba.pos >= aba.historico.length - 1 && !podeSite(aba, 'canGoForward');
  // só não mexe no endereço enquanto você está digitando nele
  if (!$('#endereco').dataset.editando) $('#endereco').value = url === 'oceano://nova-aba' ? '' : url;
  desenharEscudo();
  const pip = $('#btn-pip');
  if (pip) { pip.hidden = !(aba.temVideo || aba.tocandoMidia || aba.pip || aba.janelaMini); pip.setAttribute('aria-pressed', !!(aba.pip || aba.janelaMini)); }
  emitir('barra', aba);
}

// Escudo da barra: contagem de anúncios e rastreadores bloqueados nesta aba; clicando, libera ou volta a bloquear o site.
const hostDoSite = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const siteLiberado = host => !!host && (app.liberados || []).some(l => host === l || host.endsWith('.' + l));
function desenharEscudo() {
  const el = $('#seguranca'), aba = app.abaAtiva, url = app.url();
  if (!el || !aba) return;
  const interno = url.startsWith('oceano://'), site = app.real && ehSite(url);
  const liberado = site && siteLiberado(hostDoSite(url));
  const n = app.redeSites?.[aba.wcId]?.bloqueados ?? 0;
  const ligado = app.bloqueador?.ligado !== false;
  el.innerHTML = icone(interno ? 'oceano' : 'escudo') + (site && ligado && !liberado && n ? `<b class="selo-conta" aria-hidden="true">${n > 999 ? '999+' : n}</b>` : '');
  el.classList.toggle('liberado', !!liberado);
  el.title = interno ? 'Página interna do Oceano'
    : !app.real ? 'Rastreadores bloqueados nesta página'
    : !ligado ? 'Bloqueador desligado' : liberado ? 'Bloqueio liberado neste site: clique para voltar a bloquear'
    : `${n} rastreador(es) e anúncio(s) bloqueado(s) nesta aba: clique para liberar este site`;
  el.setAttribute('aria-label', el.title);
  if (site) { el.setAttribute('role', 'button'); el.tabIndex = 0; } else { el.removeAttribute('role'); el.removeAttribute('tabindex'); }
}
app.desenharEscudo = desenharEscudo;
function menuEscudo() {
  const url = app.url(), host = hostDoSite(url);
  if (!app.real || !ehSite(url) || !host) return;
  const liberado = siteLiberado(host), n = app.redeSites?.[app.abaAtiva.wcId]?.bloqueados ?? 0;
  const r = $('#seguranca').getBoundingClientRect();
  menuContexto(r.left, r.bottom + 6, [
    ['info', liberado ? `Nada bloqueado em ${host}` : `${n} anúncio(s) e rastreador(es) bloqueado(s) nesta aba`],
    [liberado ? 'bloquear' : 'liberar', liberado ? `Voltar a bloquear em ${host}` : `Liberar ${host} (recarrega a página)`],
    ['privacidade', 'Ajustes do bloqueador…'],
  ], async v => {
    if (v === 'privacidade') return app.navegar('oceano://privacidade');
    if (v !== 'liberar' && v !== 'bloquear') return;
    app.liberados = await nativo.bloqueadorLiberar(url, v === 'liberar');
    app.aviso(v === 'liberar' ? `Anúncios e rastreadores liberados em ${host}.` : `Bloqueio de volta em ${host}.`, 'Bloqueador');
    desenharEscudo();
    app.abaAtiva.wv?.reload();
  });
}

function renderizarPagina() {
  const url = app.url();
  if (app.real) {
    mostrarSite(ehSite(url) ? app.abaAtiva : null);
    $('#pagina').hidden = ehSite(url);
    if (ehSite(url)) {
      app.paginaAtual?.desmontar?.();
      app.paginaAtual = null;
      document.title = `${tituloDe(url, app.abaAtiva)} · Oceano`;
      Cart.foco = null;
      return;
    }
  }
  const r = rotaDe(url);
  const pagina = PAGINAS[r.pagina] || PAGINAS.offline;
  app.paginaAtual?.desmontar?.();
  const el = $('#pagina');
  el.className = 'pagina pagina-' + r.pagina;
  el.innerHTML = pagina.html(r, app);
  el.scrollTop = 0;
  app.paginaAtual = pagina.montar?.(el, r, app) || null;
  document.title = app.lite && r.pagina === 'nova-aba' ? 'Nova guia' : `${tituloDe(url)} · Oceano`;
  app.montarSlots();
  // o cartucho da página recebe as teclas
  const cart = app.mods.find(m => m.lugar === r.pagina && m.cart?.canvas?.isConnected)?.cart;
  if (r.pagina !== 'offline') Cart.foco = cart || null;   // a tela de erro cuida do foco do jogo dela
}

function renderizar() {
  trocouDeAba();
  sincronizarCongelamento();
  app.grupos?.sincronizar();
  renderizarAbas();
  renderizarBarra();
  renderizarPagina();
}
app.renderizar = renderizar;

let avisoId = 0;
app.aviso = function (msg, origem = 'Oceano', tipo = 'info') {
  const id = ++avisoId;
  const div = document.createElement('div');
  div.className = 'aviso px ' + tipo;
  div.innerHTML = `<b>${origem}</b><span></span>`;
  div.querySelector('span').textContent = msg;
  $('#avisos').appendChild(div);
  setTimeout(() => div.classList.add('saindo'), 3200);
  setTimeout(() => div.remove(), 3600);
  return id;
};

function ligarEventos() {
  for (const [id, ic] of [['voltar', 'voltar'], ['avancar', 'avancar'], ['recarregar', 'recarregar'], ['inicio', 'inicio'], ['btn-menu', 'temas'], ['fechar-lateral', 'fechar']]) {
    const el = $('#' + id);
    if (el) el.innerHTML = icone(ic);
  }
  if ($('#lite-logo')) $('#lite-logo').innerHTML = icone('logo');

  // X da aba: três cliques rápidos no mesmo lugar fecham o grupo inteiro (e ele fica guardado com todas as abas).
  // A barra é redesenhada a cada clique, então a contagem é feita aqui e não pelo e.detail.
  let trio = null;
  function fecharPeloX(aba, e) {
    if (!aba) return;
    const seguido = trio && e.timeStamp - trio.t < 500 && Math.hypot(e.clientX - trio.x, e.clientY - trio.y) < 8;
    if (!seguido) trio = { n: 0, grupo: aba.grupo, abas: aba.grupo ? app.grupos.fotos(aba.grupo) : [] };
    Object.assign(trio, { n: trio.n + 1, t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (trio.n > 1 && trio.grupo && aba.grupo !== trio.grupo) return;   // a aba que escorregou para baixo do cursor é de fora do grupo
    if (trio.n >= 3 && trio.grupo) { app.grupos.recolher(trio.grupo, trio.abas); trio = null; app.renderizar(); return; }
    app.fecharAba(aba);
  }

  document.addEventListener('click', e => {
    const botao = e.target.closest('button, .aba, a[data-ir]');
    if (botao && !botao.disabled) emitir('clique');
    const acao = e.target.closest('[data-acao]');
    const aba = e.target.closest('.aba');
    if (acao) {
      const a = acao.dataset.acao;
      if (a === 'nova-aba') app.novaAba();
      else if (a === 'grupo') app.navegar('oceano://nova-aba');
      else if (a === 'fechar-aba') { e.stopPropagation(); fecharPeloX(app.abas.find(x => x.id === +acao.dataset.aba), e); }
      return;
    }
    if (aba) { app.abaAtiva = app.abas.find(x => x.id === +aba.dataset.aba); renderizar(); return; }
    const ir = e.target.closest('[data-ir]');
    if (ir) { e.preventDefault(); app.navegar(ir.dataset.ir); }
  });

  $('#btn-som').onclick = () => { ligarSom(!somLigado()); guardado.gravar('som', somLigado()); renderizarBarra(); tocar('bolha'); };
  $('#fechar-lateral').onclick = () => app.mostrarLateral(false);
  $('#btn-menu').onclick = () => app.navegar('oceano://temas');


  if (app.lite) {
    window.addEventListener('hashchange', () => {
      app.abaAtiva.historico = [rotaDoHash()];
      app.abaAtiva.pos = 0;
      renderizar();
    });
    return;
  }

  // botão direito numa aba: grupos e fechar
  $('#abas').addEventListener('contextmenu', e => {
    const el = e.target.closest('.aba'); if (!el) return;
    e.preventDefault();
    const aba = app.abas.find(x => x.id === +el.dataset.aba);
    const outros = app.grupos.lista().filter(g => g.id !== aba.grupo);
    const itens = [
      ['novo', 'Novo grupo com esta aba'],
      ...outros.map(g => ['add:' + g.id, `Adicionar ao grupo “${g.nome}”`]),
      ...(aba.grupo ? [['tirar', 'Tirar do grupo']] : []),
      ['reabrir', 'Reabrir aba fechada'], ['fechar', 'Fechar aba'],
    ];
    menuContexto(e.clientX, e.clientY, itens, v => {
      if (v === 'novo') app.grupos.criar([aba]);
      else if (v.startsWith('add:')) app.grupos.adicionar(aba, v.slice(4));
      else if (v === 'tirar') app.grupos.tirar(aba);
      else if (v === 'reabrir') app.reabrirAba();
      else if (v === 'fechar') app.fecharAba(aba);
    });
  });

  // só no simulador: abas, barra de endereço e modo jogo
  $('#abas').addEventListener('auxclick', e => {
    const aba = e.target.closest('.aba');
    if (e.button === 1 && aba) app.fecharAba(app.abas.find(x => x.id === +aba.dataset.aba));
  });
  $('#voltar').onclick = () => mover(-1);
  $('#avancar').onclick = () => mover(1);
  $('#recarregar').onclick = () => recarregar();
  $('#inicio').onclick = () => app.navegar('oceano://nova-aba');
  $('#endereco').oninput = e => { e.target.dataset.editando = '1'; };
  $('#endereco').onblur = e => { delete e.target.dataset.editando; renderizarBarra(); };
  $('#form-endereco').onsubmit = e => { e.preventDefault(); delete $('#endereco').dataset.editando; app.navegar($('#endereco').value); $('#endereco').blur(); };
  $('#endereco').onfocus = e => e.target.select();
  $('#seguranca').onclick = () => menuEscudo();
  $('#seguranca').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); menuEscudo(); } };
  // no app quem pega as teclas é o menu nativo (funciona até com o foco dentro de um site); aqui é o simulador
  window.addEventListener('keydown', e => {
    if (app.real || app.lite || e.defaultPrevented || app.gravandoAtalho) return;
    // na barra de endereço os atalhos de ⌥ valem (nenhum usa as teclas de acento: ⌥E ⌥N ⌥I ⌥U ⌥C); nos outros campos, não
    const alvo = e.target, digitando = alvo.id !== 'endereco' && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName));
    const nome = app.atalhos.acaoDe(deEvento(e), digitando);
    if (!nome) return;
    e.preventDefault();
    executarAtalho(nome);
  });
}

let notchNaLateral = null;
app.mostrarLateral = function (v, gravar = true) {
  $('#lateral').hidden = !v;
  // no app, a lateral é a mesma janela do notch; só é criada quando aparece
  if (v && app.real && !app.lite && !notchNaLateral) notchNaLateral = import('./notch-na-lateral.js').then(m => m.montarNotchNaLateral(app, nativo));
  if (gravar) guardado.gravar('lateral', v);
  pintarBotaoNavegadora();
};

// ao lado da casa: abre e fecha a Navegadora, com o desenho do avatar em uso
const ICONE_DO_AVATAR = { cara: 'avatar-cara', gato: 'avatar-gato' };
const botaoNavegadora = document.createElement('button');
botaoNavegadora.id = 'btn-navegadora';
botaoNavegadora.type = 'button';
botaoNavegadora.className = 'ico some-estreito';
$('#inicio')?.after(botaoNavegadora);
// o gato usa o mesmo rosto do notch fechado: o quadro parado da folha, recortado em "rosto"
let rostoDoGato = null;
(async () => {
  const s = await (await fetch('avatares/gato/sprite.json')).json(), img = new Image();
  img.src = 'avatares/gato/' + s.folha;
  await img.decode();
  const [w, h] = s.quadro, [cx, cy] = s.estados.parado[0], [rx, ry, rw, rh] = s.rosto, c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d'), alto = 96 * rh / rw;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, cx * w + rx, cy * h + ry, rw, rh, 0, (96 - alto) / 2, 96, alto);
  c.setAttribute('aria-hidden', 'true');
  rostoDoGato = c;
  pintarBotaoNavegadora();
})().catch(() => {});   // sem a folha, fica o ícone desenhado
const navegadoraAberta = () => !$('#lateral').hidden && guardado.ler('lateral-aba', 'assistente') === 'assistente';
function pintarBotaoNavegadora() {
  const quem = guardado.ler('avatar-personagem', 'cara'), nome = guardado.ler('avatar-nome', '') || { cara: 'Cara', gato: 'Gato', boneco3d: 'Boneco 3D' }[quem] || 'avatar próprio';
  if (quem === 'gato' && rostoDoGato) botaoNavegadora.replaceChildren(rostoDoGato);
  else botaoNavegadora.innerHTML = icone(ICONE_DO_AVATAR[quem] || 'perfil');
  botaoNavegadora.setAttribute('aria-pressed', String(navegadoraAberta()));
  botaoNavegadora.title = `${navegadoraAberta() ? 'Esconder' : 'Mostrar'} a Navegadora (${nome})`;
  botaoNavegadora.setAttribute('aria-label', botaoNavegadora.title);
}
botaoNavegadora.onclick = () => {
  if (navegadoraAberta()) return app.mostrarLateral(false);
  app.mostrarLateral(true);
  app.abaLateral('assistente');
  pintarBotaoNavegadora();
};
on('avatar-personagem', pintarBotaoNavegadora);
on('avatar-nome', pintarBotaoNavegadora);
pintarBotaoNavegadora();

// Abas da barra lateral: a Navegadora (e o Dev, no app); só carregam quando abertas.
// Os widgets (mods com lugar "lateral") saíram daqui por enquanto: continuam no sistema, sem lugar na tela.
const PAINEIS_LATERAIS = {
  assistente: () => import('./assistente.js').then(m => m.montarAssistente),
  dev: () => import('./dev.js').then(m => m.montarPainelDev),
};
const carregandoPainel = {};
app.carregarPainel = function (qual) {
  const slot = $('#lateral .slot-' + qual);
  return carregandoPainel[qual] ??= PAINEIS_LATERAIS[qual]()
    .then(montar => montar(app, slot, guardado))
    .then(p => (app[qual] = p))
    .catch(e => { console.error(e); slot.innerHTML = `<p class="lateral-vazia" style="display:block">Indisponível: ${e.message}</p>`; });
};
// trocar de tela na barra lateral: a nova entra deslizando, com linhas de movimento por cima
function deslizarLateral(lateral, slot, lado) {
  if (!slot || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  lateral.querySelector(':scope > .linhas-movimento')?.remove();
  const linhas = document.createElement('div');
  linhas.className = 'linhas-movimento';
  linhas.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const l = document.createElement('i');
    l.style.cssText = `top:${(4 + Math.random() * 92).toFixed(1)}%;width:${(18 + Math.random() * 42).toFixed(0)}%;animation-delay:${(Math.random() * 90).toFixed(0)}ms;--lado:${lado}`;
    linhas.append(l);
  }
  lateral.append(linhas);
  slot.style.setProperty('--lado', lado);
  slot.classList.remove('entrando');
  void slot.offsetWidth;
  slot.classList.add('entrando');
  setTimeout(() => { slot.classList.remove('entrando'); linhas.remove(); }, 520);
}

app.abaLateral = function (qual) {
  if (app.lite) return;
  if (!(qual in PAINEIS_LATERAIS) || !$('#lateral .slot-' + qual)) qual = 'assistente';   // painel sem lugar nesta página (ex.: Dev só existe no app)
  const lateral = $('#lateral');
  lateral.classList.add('larga');
  const abas = [...lateral.querySelectorAll('[data-lateral]')], antes = abas.find(b => b.getAttribute('aria-selected') === 'true')?.dataset.lateral;
  for (const b of abas) { b.setAttribute('aria-selected', b.dataset.lateral === qual); b.classList.add('brilho', 'brilho-aba'); }
  if (abas[0] && !abas[0].parentElement.dataset.brilho) { abas[0].parentElement.dataset.brilho = '1'; ligarBrilho(abas[0].parentElement); }
  for (const nome in PAINEIS_LATERAIS) { const slot = lateral.querySelector('.slot-' + nome); if (slot) slot.hidden = qual !== nome; }
  lateral.toggleAttribute('data-aba-dev', qual === 'dev');
  if (antes && antes !== qual && !lateral.hidden) deslizarLateral(lateral, lateral.querySelector('.slot-' + qual), abas.findIndex(b => b.dataset.lateral === qual) > abas.findIndex(b => b.dataset.lateral === antes) ? 1 : -1);
  guardado.gravar('lateral-aba', qual);
  pintarBotaoNavegadora();
  app.carregarPainel(qual);
};

// A trilha mora na tela inicial. O painel é montado uma vez só e mudado de lugar a cada visita,
// então a música segue tocando enquanto você navega (⌥M toca ou pausa de qualquer página).
const caixaTrilha = document.createElement('div');
caixaTrilha.className = 'slot-trilha tr-casa px';
let carregandoTrilha = null;
app.carregarTrilha = function () {
  if (app.lite) return Promise.resolve(null);
  return carregandoTrilha ??= import('./trilha.js')
    .then(m => m.montarTrilha(app, caixaTrilha, guardado))
    .then(t => (app.trilha = t))
    .catch(e => { console.error(e); caixaTrilha.innerHTML = `<p class="nota">Trilha indisponível: ${e.message}</p>`; });
};
// O perfil de uma aba (as efêmeras e as do simulador contam como Pessoal). A mesa mostra as janelas do perfil da aba ativa.
app.perfilDe = aba => (!aba?.efemera && aba?.perfil) || 'pessoal';
app.perfilAtual = () => app.perfilDe(app.abaAtiva);
// troca o perfil da página inicial: aba ainda sem site muda de perfil; com site, abre uma aba nova no outro perfil
app.mudarPerfil = function (id) {
  const a = app.abaAtiva;
  if (!a || app.perfilDe(a) === id) return;
  if (!a.wv) { a.perfil = id; delete a.efemera; if (app.particaoDe) a.particao = app.particaoDe(id); renderizar(); }
  else app.novaAba(undefined, true, { perfil: id });
};
// A mesa da página inicial (criada na primeira visita e reaproveitada).
let mesa = null;
app.mesaNaTela = function (lugar) {
  if (!lugar) return;
  mesa ??= criarMesa(app, guardado);
  mesa.mostrar(lugar);
};

// Hora da cena do mar: 'tema' (a do tema; sem hora no tema, o relógio), 'relogio' (sempre o relógio) ou 'fixa' (a escolhida).
app.horaCena = () => guardado.ler('hora-cena', { modo: 'tema' });
app.definirHoraCena = function ({ modo = 'tema', hora } = {}, gravar = true) {
  if (!['tema', 'relogio', 'fixa'].includes(modo)) modo = 'tema';
  if (modo === 'fixa') hora = Math.min(24, Math.max(0, Number.isFinite(+hora) ? +hora : app.mar.hora()));
  app.mar.horaFixa = modo === 'fixa' ? hora : null;
  app.mar.soRelogio = modo === 'relogio';
  if (gravar) { guardado.gravar('hora-cena', modo === 'fixa' ? { modo, hora } : { modo }); emitir('hora-cena', app.horaCena()); }
};
app.textoHora = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
// O pixelizar das janelas (e de onde mais o tema pedir): '0' sólido, '75' leve, '50' médio, '25' forte.
app.organizarMesa = () => mesa?.organizar();
app.somLigado = () => somLigado();
app.definirSom = v => { ligarSom(v); guardado.gravar('som', v); renderizarBarra(); };
// escolher o global apaga o pixelizado próprio de cada janela: passa a valer para todas
app.definirDither = function (v) {
  document.documentElement.dataset.dither = v;
  guardado.gravar('dither', v);
  mesa?.limparDither();
};
app.ditherGlobalAtivo = () => !mesa?.ditherProprio();

app.trilhaNaTela = function (lugar) {
  if (!lugar || app.lite) return;
  lugar.append(caixaTrilha);
  app.carregarTrilha().then(() => app.trilha?.desenhar());
};

function laco() {
  let ultimo = performance.now(), acumMods = 0;
  const quadro = agora => {
    const dt = Math.min(0.1, (agora - ultimo) / 1000);
    ultimo = agora;
    if (!document.hidden) {
      const pagina = rotaDe(app.url()).pagina;
      // pixel art não precisa de 60 fps: 30 onde o mar aparece, quase parado onde ele fica coberto
      app.mar.fpsMax = app.leve?.marParado && !app.mar.animandoHora ? 0.25 : app.modoJogo ? 10 : pagina === 'nova-aba' && app.fundoVideoAtivo && !app.mar.animandoHora ? 2 : pagina === 'nova-aba' || pagina === 'editor-tema' || pagina === 'strudel' || pagina === 'stave' || app.mar.animandoHora ? 30 : 2;
      const med = app.medidor;
      med ? med.medir('mar', () => app.mar.passo(agora)) : app.mar.passo(agora);
      // os cartuchos são pixel art: 30 quadros por segundo bastam (antes: um passo por quadro da tela)
      acumMods += dt;
      if (acumMods >= 1 / 30) {
        for (const m of app.mods) {
          if (!m.cart) continue;
          const emFoco = m.cart.canvas?.parentElement?.closest('#pagina');
          const a = performance.now();
          m.cart.passo(acumMods, app.modoJogo && !emFoco);
          med?.somar('mod:' + m.id, performance.now() - a);
        }
        acumMods = 0;
      }
    }
    requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
}

async function iniciar() {
  await carregarTemas();
  iniciarGrupos(app, guardado);
  if (!app.lite) iniciarAgua(app, guardado);
  if (!app.lite) iniciarConsumo(app, guardado);
  iniciarSensivel(app);
  if (!app.lite) { iniciarHistorico(app, guardado); iniciarLeitor(app, guardado); }
  // as janelas da página inicial só têm sólido ou médio (o leve e o forte saíram); o que estava guardado vira médio
  document.documentElement.dataset.dither = guardado.ler('dither', '50') === '0' ? '0' : '50';
  app.mar = new Mar($('#mar'));
  app.definirHoraCena(guardado.ler('hora-cena', { modo: 'tema' }), false);
  app.aplicarTema(guardado.ler('tema', 'oceano'));
  if (guardado.ler('som', false)) {
    // o navegador só libera áudio depois de um gesto do usuário
    window.addEventListener('pointerdown', () => { ligarSom(true); renderizarBarra(); }, { once: true });
  }
  ligarEventos();
  // no celular a barra lateral começa fechada (ela cobre a página)
  app.mostrarLateral(guardado.ler('lateral', window.innerWidth > 640));
  if (app.lite) { $('#lateral').hidden = true; }   // a extensão não tem barra lateral (a Navegadora fica fora dela)
  $('#btn-trilha').innerHTML = icone('som');
  if ($('#btn-pip')) { $('#btn-pip').innerHTML = icone('pip'); $('#btn-pip').onclick = () => app.miniPlayer(); }
  $('#btn-trilha').onclick = () => app.trilha?.alternar();
  // música unificada: os CDs tocam em qualquer página (o motor é um só), e o botão de nota liga tudo
  if (!app.lite) { app.cds = iniciarCds(app, guardado); iniciarMusica(app); iniciarMidia(app, guardado); } else $('#btn-musica')?.remove();
  if (app.real) {
    // perfis isolados e as ferramentas de dev (aba efêmera, teste rápido, painel Dev, comandos)
    const c = await nativo.configLer();
    app.perfis = c.config.perfis;
    app.liberados = c.config.liberados || [];
    app.particaoDe = id => c.particoes[id] || 'persist:oceano';
    app.recarregarPerfis = async () => { const n = await nativo.configLer(); app.perfis = n.config.perfis; Object.assign(c.particoes, n.particoes); renderizarAbas(); };
    await import('./dev.js').then(m => m.iniciarDev(app));
  } else document.querySelector('[data-lateral="dev"]')?.remove();
  $('#lateral').addEventListener('click', e => { const b = e.target.closest('[data-lateral]'); if (b) app.abaLateral(b.dataset.lateral); });
  app.navegacao = iniciarNavegacao(app, guardado, { menuContexto, ehSite, renderizar, nativo: app.real ? nativo : null });
  if (app.real) app.gravando = iniciarGravando(app, nativo, { renderizarAbas, ativarAba: aba => { app.abaAtiva = aba; renderizar(); } });
  // as abas guardadas nunca impedem o navegador de abrir: se algo der errado, começa com uma aba nova
  let voltaram = false;
  if (!app.lite) try { voltaram = app.navegacao.restaurarSessao(); } catch (e) { console.warn('abas guardadas', e); guardado.gravar('sessao-abas', null); app.abas.length = 0; app.abaAtiva = null; }
  if (!app.lite) iniciarPonteFerramentas(app, guardado);
  if (!app.lite) { iniciarTraducao(app, guardado); iniciarPrimeirosPassos(app, guardado); }
  if (!voltaram) app.novaAba(app.lite ? rotaDoHash() : undefined);
  if (app.real) {
    nativo.aoDownload(d => {
      emitir('download', d);
      if (d.novo) app.aviso(d.arriscado ? 'Cuidado: este arquivo pode rodar programas no seu computador. Só abra se confiar em quem enviou.' : 'Baixando um arquivo. Veja em oceano://downloads.', 'Downloads', d.arriscado ? 'erro' : undefined);
      if (d.fim) app.aviso(d.estado === 'completed' ? 'Download pronto.' : 'O download não terminou.', 'Downloads', d.estado === 'completed' || d.estado === 'cancelled' ? undefined : 'erro');
    });
    // conexões reais: as do próprio navegador e, por aba, o que cada site contata
    for (const c of await nativo.redeProprias()) app.registrarRede(c.destino, c.motivo, c.envia);
    nativo.aoRedePropria(c => app.registrarRede(c.destino, c.motivo, c.envia));
    nativo.aoRedeSites(dados => { app.redeSites = dados; app.paginaAtual?.atualizar?.(); desenharEscudo(); });
    nativo.aoNovaAba((url, deId) => {
      const de = app.abas.find(a => a.wcId === deId);
      app.novaAba(url, true, de?.efemera ? { efemera: true } : { perfil: de?.perfil });
    });
    nativo.aoAtalho(executarAtalho);
    nativo.atalhosDefinir?.(app.atalhos.aceleradores());
    nativo.aoBloqueador(b => { app.bloqueador = b; if (!b.ligado) app.aviso(`Bloqueador desligado: ${b.erro}`, 'Rede', 'erro'); });
    const medir = async () => { app.metricas = await nativo.metricas(); };
    medir();
    setInterval(medir, 1500);
  } else if (!app.lite) {
    app.registrarRede('atualizacao.oceano.gg', 'Verificar se existe versão nova', 'versão (0.1-beta) e sistema (macOS) · sem identificador');
    app.registrarRede('listas.oceano.gg', 'Baixar a lista de bloqueio de rastreadores', 'nada (só download)');
  }
  app.clima = criarClima(app, guardado);
  iniciarFarol(app);
  await carregarMods();
  montarTrocaBarra();
  app.montarSlots();
  app.abaLateral(guardado.ler('lateral-aba', 'assistente'));
  laco();
  document.documentElement.classList.add('pronto');
}

iniciar().catch(e => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="falha">Falha ao iniciar o simulador: ${e.message}</pre>`);
});
