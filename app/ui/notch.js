// notch do Oceano: a Navegadora numa janela com ela no fundo, a conversa, o que está em andamento e o campo de mensagem.
// Presa ao notch desce quando o mouse encosta; solta, flutua e fica onde você deixar.
// Temas com folha de sprites (ex.: o gato): o personagem fica no fundo, com o fundo do tema ou o escolhido nas Configurações.
// O avatar segue o estilo escolhido na Navegadora (Pixel + tema, Pixel, Pixel desenhado ou Original), com o mesmo filtro.
// Fechado, só o rosto aparece e quase não gasta nada (um quadro a cada 2 s); aberto, anima a 15 quadros.
import { openAvatar, createMeshAvatar } from './vendor/mesh-avatar/mesh-avatar.js';
import { criarPixelizador } from './js/avatar-pixel.js';
import { sortearSugestoes } from './js/sugestoes.js';

// dentro da barra lateral é esta mesma janela, sem a parte de prender no notch
const naLateral = new URLSearchParams(location.search).has('lateral');
if (naLateral) { window.oceanoNativo = parent.oceanoNativo; document.documentElement.classList.add('na-lateral'); }
const n = naLateral ? parent.notchNaLateral : window.notch, raiz = document.querySelector('.notch');
const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
const nomeAtual = () => { try { return localStorage.getItem('oceano:avatar-nome') || 'Cara'; } catch { return 'Cara'; } };
const $ = s => document.querySelector(s), esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const avatarTela = $('.avatar'), rosto = $('.rosto'), janelaEl = $('.janela');
const pintarNome = () => { $('.nome').textContent = nomeAtual(); $('.campo textarea').placeholder = `Mensagem para a ${nomeAtual()}…`; };
// ícones em pixel: cada letra # é um ponto
const GRADES = {
  agente: ['...##...', '..####..', '..####..', '...##...', '.######.', '########', '########', '########'],
  soltar: ['.....###', '.....###', '....#.##', '...#....', '..#.....', '.#......', '#.......', '........'],
  prender: ['###.....', '###.....', '##.#....', '....#...', '.....#..', '......#.', '.......#', '........'],
  nova: ['.....##.', '....####', '...####.', '..####..', '.####...', '.###....', '.##.....', '#.......'],
  menos: ['........', '........', '........', '########', '########', '........', '........', '........'],
  fechar: ['#......#', '##....##', '.##..##.', '..####..', '..####..', '.##..##.', '##....##', '#......#'],
  linhas: ['........', '#######.', '........', '#####...', '........', '#######.', '........', '###.....'],
  linhas3: ['........', '########', '........', '########', '........', '########', '........', '........'],
  bussola: ['..####..', '.#....#.', '#....#.#', '#..##..#', '#..##..#', '#.#....#', '.#....#.', '..####..'],
  som: ['...#....', '..##..#.', '####.#.#', '####.#.#', '####.#.#', '####.#.#', '..##..#.', '...#....'],
  mudo: ['...#....', '..##....', '####.#.#', '####..#.', '####..#.', '####.#.#', '..##....', '...#....'],
  'chave-inglesa': ['.....##.', '....##..', '....##.#', '....####', '...###..', '..###...', '.###....', '###.....'],
  clipe: ['...####.', '..#....#', '.#..##.#', '.#.#.#.#', '.#.#.#.#', '.#.###.#', '.#.....#', '..#####.'],
  'agente-mais': ['..##....', '.####.#.', '.#######', '..##..#.', '#####...', '#######.', '#######.', '........'],
  mic: ['...##...', '..####..', '..####..', '..####..', '#.####.#', '#......#', '.######.', '...##...'],
  seta: ['...##...', '..####..', '.######.', '##.##.##', '...##...', '...##...', '...##...', '...##...'],
};
const iconeSvg = (nome, px = 12) => {
  const g = GRADES[nome]; let d = '';
  g.forEach((l, y) => [...l].forEach((c, x) => { if (c === '#') d += `M${x} ${y}h1v1h-1z`; }));
  return `<svg viewBox="0 0 8 8" width="${px}" height="${px}" aria-hidden="true"><path d="${d}"/></svg>`;
};
document.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = iconeSvg(el.dataset.ic, el.classList.contains('ic') ? (el.dataset.ic === 'agente' ? 16 : 13) : el.classList.contains('enviar') ? 14 : 12); });
pintarNome();

// cores do tema do navegador (a janela principal grava no localStorage a cada troca de tema)
function coresDoNavegador() {
  const ui = ler('oceano:tema-ui', null); if (!ui) return;
  for (const [k, v] of Object.entries(ui)) document.documentElement.style.setProperty('--' + k, v);
}
coresDoNavegador();
addEventListener('storage', e => {
  if (e.key === 'oceano:tema-ui') coresDoNavegador();
  if (e.key === 'oceano:avatar-nome') pintarNome();
  if (e.key === 'oceano:avatar' && tema?.personagem === 'avatar') carregarAvatar();
  if (e.key === 'oceano:assistente-visual') aplicarVisual();
  if (e.key === 'oceano:notch-avatar-fundo') aplicarFundo();
  if (e.key === 'oceano:tema-paleta' || e.key === 'oceano:tema-ui') { lerPaleta(); desenhar(); }
});

n.aoConfig(c => document.documentElement.style.setProperty('--barra', (c.temNotch ? c.barra : 6) + 'px'));
let aberto = false, estado = 'parado';
n.aoAbrir(on => { aberto = on; raiz.dataset.estado = on ? 'aberto' : 'fechado'; desenhar(); });
n.aoSolto?.(({ solto, minimizada }) => {
  raiz.toggleAttribute('data-solto', solto); raiz.toggleAttribute('data-minimizada', !!minimizada);
  aberto = solto || aberto; if (solto) raiz.dataset.estado = 'aberto';
  const b = $('[data-acao="soltar"]');
  b.innerHTML = iconeSvg(solto ? 'prender' : 'soltar');
  b.title = b.ariaLabel = solto ? 'Prender na barra' : 'Soltar da barra';
  desenhar();
});

// ---------- personagem: avatar (malha) ou folha de sprites ----------
let tema = null, avatar = null, folha = null, quadro = 0;
const oculta = document.createElement('canvas');
oculta.style.cssText = 'position:fixed;left:-9999px;width:120px;height:120px';
document.body.append(oculta);

// a mesma imagem do painel da Navegadora: mesma resolução por estilo e mesmo filtro
const RESOLUCAO = { paleta: 120, pixel: 120, desenhado: 180, original: 360 };
const tela = document.createElement('canvas'), ctxTela = tela.getContext('2d', { willReadFrequently: true });
const pixelizador = criarPixelizador();
let visual = 'paleta';
function lerPaleta() {
  const cores = ler('oceano:tema-paleta', null) || Object.values(ler('oceano:tema-ui', {}));
  pixelizador.definirPaleta(cores.filter(c => /^#[0-9a-f]{6}$/i.test(c)));
}
function aplicarVisual() {
  const v = ler('oceano:assistente-visual', 'paleta');
  visual = RESOLUCAO[v] ? v : 'paleta';
  const n = RESOLUCAO[visual], dpr = Math.min(window.devicePixelRatio || 1, 2);
  tela.width = tela.height = n;
  oculta.style.width = oculta.style.height = n / dpr + 'px';
  for (const c of [avatarTela, rosto]) c.classList.toggle('suave', visual === 'original');
  desenhar();
}
function aplicarFundo() {
  const cor = ler('oceano:notch-avatar-fundo', '');
  document.documentElement.style[/^#[0-9a-f]{6}$/i.test(cor) ? 'setProperty' : 'removeProperty']('--avatar-fundo', cor);
}
function pintarTela() {
  if (!oculta.width || !oculta.height) return;   // a lateral escondida não tem tamanho
  ctxTela.clearRect(0, 0, tela.width, tela.height);
  ctxTela.imageSmoothingEnabled = visual !== 'desenhado';
  ctxTela.drawImage(oculta, 0, 0, tela.width, tela.height);
  if (visual === 'paleta') pixelizador.aplicar(ctxTela, tela.width, tela.height);
}

async function carregarAvatar() {
  const { pasta = 'avatares/cara/', escala = 4, sprite } = ler('oceano:avatar', {});
  if (sprite) { avatar = null; carregarFolha({ folha: sprite.src, quadro: sprite.quadro, fps: sprite.fps, estados: sprite.estados, rosto: sprite.rosto, doAvatar: true }); return; }
  folha = null;
  try {
    const pkg = await openAvatar(pasta), rig = structuredClone(pkg.rig), m = rig.mesh;
    if (m && escala !== 1) { m.baseCell = Math.round(m.baseCell * escala); if (m.fine) m.fine = { ...m.fine, cell: Math.round(m.fine.cell * escala) }; }
    const novo = await createMeshAvatar(oculta, { rig, assets: pkg.assets, manual: true });
    try { avatar?.destroy?.(); } catch {}
    avatar = novo; avatar.setAutoIdle(true); desenhar();
  } catch {}
}
function carregarFolha(p) {
  const img = new Image();
  img.onload = () => { folha = { img, ...p }; desenhar(); };
  img.src = p.folha;
}

function aplicarTema(t) {
  tema = t || { estilo: 'janela', personagem: 'avatar', cores: {} };
  raiz.dataset.estilo = tema.estilo;
  for (const k of ['fundo', 'texto', 'destaque']) {
    if (tema.cores?.[k]) raiz.style.setProperty('--l-' + k, tema.cores[k]); else raiz.style.removeProperty('--l-' + k);
  }
  // fundo escolhido perto da cor de destaque: o destaque vira a cor do texto (senão o botão some)
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const { fundo, destaque, texto } = tema.cores || {};
  if (fundo && destaque && rgb(fundo).reduce((s, v, i) => s + Math.abs(v - rgb(destaque)[i]), 0) < 120) raiz.style.setProperty('--l-destaque', texto || '#ffffff');
  folha = null;
  if (tema.personagem === 'avatar') { if (!avatar) carregarAvatar(); }
  else carregarFolha(tema.personagem);
  desenhar();
}
lerPaleta();
aplicarVisual();
aplicarFundo();
n.aoTema(aplicarTema);
setTimeout(() => { if (!tema) aplicarTema(null); }, 1500);   // sem resposta do app: a janelinha padrão

function desenhar() {
  const c = avatarTela.getContext('2d'), r = rosto.getContext('2d');
  c.imageSmoothingEnabled = r.imageSmoothingEnabled = false;
  if (folha) {
    const [w, h] = folha.quadro, lista = folha.estados[estado] || folha.estados.parado, [cx, cy] = lista[quadro % lista.length];
    if (avatarTela.width !== w) { avatarTela.width = w; avatarTela.height = h; avatarTela.style.height = folha.doAvatar ? `${Math.round(400 * h / w)}px` : ''; }
    c.clearRect(0, 0, w, h); c.drawImage(folha.img, cx * w, cy * h, w, h, 0, 0, w, h);
    // a folha escolhida como avatar segue o estilo, como no navegador; a de um tema do notch fica nas cores dela
    if (folha.doAvatar && visual === 'paleta') pixelizador.aplicar(c, w, h);
    const [rx, ry, rw, rh] = folha.rosto || [0, 0, w, h];
    r.clearRect(0, 0, 96, 96); r.drawImage(avatarTela, rx, ry, rw, rh, 0, 0, 96, 96 * rh / rw);
    return;
  }
  if (!avatar) return;
  pintarTela();
  if (avatarTela.width !== tela.width) { avatarTela.width = avatarTela.height = tela.width; avatarTela.style.height = ''; }
  c.imageSmoothingEnabled = r.imageSmoothingEnabled = visual === 'original';
  c.clearRect(0, 0, tela.width, tela.height); c.drawImage(tela, 0, 0);
  r.clearRect(0, 0, 96, 96); r.drawImage(tela, tela.width * 0.3, tela.height * 0.12, tela.width * 0.4, tela.height * 0.4, 0, 0, 96, 96);
}

let ultimo = performance.now(), acum = 0;
(function laco(agora) {
  requestAnimationFrame(laco);
  const dt = (agora - ultimo) / 1000; ultimo = agora; acum += dt;
  const fps = folha ? (aberto || estado !== 'parado' ? folha.fps : 0.5) : (aberto ? 15 : 0.5);
  if (acum < 1 / fps) return;
  acum = 0; quadro++;
  if (!folha) avatar?.advance(1 / 30, 30);
  desenhar();
})(0);

// ---------- conversa ----------
const VOZ_CHAVE = 'oceano:assistente-voz';
const lista = $('.mensagens'), formulario = $('.compositor'), campo = formulario.t, menu = $('.menu'), arquivo = $('.arquivo');
const atividades = $('.atividades'), botaoMenu = $('[data-acao="menu"]'), mic = $('[data-acao="mic"]');
const semAsteriscos = t => String(t).replace(/\*\*/g, '');   // a IA às vezes marca negrito; aqui o texto é simples
let conversa = null, respondendo = false, bolhaViva = null, anexos = [], agentes = [], iaConectada = false, voz = null;
const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function novaMensagem(quem, texto, erro) {
  const el = document.createElement('article');
  el.className = `msg ${quem}${erro ? ' erro' : ''}`;
  el.innerHTML = quem === 'voce'
    ? `<span class="de">Você · ${hora()}</span><div class="balao"></div>`
    : `<span class="de"><b>${esc(nomeAtual())}</b> ${hora()}</span><div class="balao"></div>`;
  el.querySelector('.balao').textContent = texto;
  lista.append(el); lista.scrollTop = lista.scrollHeight;
  return el.querySelector('.balao');
}

// o que está em andamento: só o que é verdade agora
const situacaoCara = () => (estado === 'pensando' ? 'Pensando na resposta' : estado === 'falando' ? 'Respondendo' : 'Esperando sua mensagem');
const NOMES_IA = { anthropic: 'Claude', openai: 'ChatGPT', gemini: 'Gemini', openrouter: 'OpenRouter', higgsfield: 'Higgsfield' };
const nomeAgente = a => a.nome || `${NOMES_IA[a.provedor] || a.provedor}${a.modelo ? ' · ' + a.modelo : ''}`;
function pintarAtividades() {
  const conectados = agentes.filter(a => a.conectado);
  const conta = `${anexos.length} ${anexos.length === 1 ? 'referência' : 'referências'} · ${conectados.length} ${conectados.length === 1 ? 'agente' : 'agentes'}`;
  document.querySelectorAll('.contagem').forEach(c => { c.textContent = conta; });
  const linhas = [
    ...anexos.map(a => `<li class="pendente">${esc(a.nome)} · aguardando envio</li>`),
    `<li>${esc(nomeAtual())} · ${situacaoCara()}</li>`,
    ...conectados.map(a => `<li>${esc(nomeAgente(a))} · conectado</li>`),
  ];
  $('.previa-lista').innerHTML = linhas.slice(0, 3).join('');
  $('.atividades-corpo').innerHTML = [
    ...anexos.map((a, i) => `<div class="cartao pendente"><div class="cab"><span class="pend">PENDENTE DE ENVIO</span><button class="tirar" type="button" data-tirar="${i}">tirar</button></div>${esc(a.nome)}</div>`),
    `<div class="cartao"><div class="cab"><b>${esc(nomeAtual())}</b><span class="situacao">${respondendo ? 'Em andamento' : 'Pronta'}</span></div>${situacaoCara()}.</div>`,
    ...conectados.map(a => `<div class="cartao"><div class="cab"><b>${esc(nomeAgente(a))}</b><span class="situacao">Conectado</span></div>${esc(a.papel ? `Papel: ${a.papel}.` : 'Disponível para conversar.')}</div>`),
    !conectados.length ? '<div class="cartao">Nenhum agente conectado ainda. Use "Adicionar agente" no menu.</div>' : '',
  ].join('');
  const vivo = $('.ao-vivo');
  vivo.classList.toggle('parado', !iaConectada);
  vivo.querySelector('span').textContent = iaConectada ? 'Conversando ao vivo' : 'Sem IA conectada';
  vivo.dataset.acao = iaConectada ? 'foco' : 'agente';
}
async function atualizarAgentes() {
  try { agentes = (await n.agentesListar?.()) || []; iaConectada = !!(await n.conversaModo()).real; } catch {}
  pintarAtividades();
}
n.aoAgentesMudou?.(atualizarAgentes);

// ---------- voz: a mesma escolha do navegador ----------
const vozLigada = () => ler(VOZ_CHAVE, true);
function pintarVoz() {
  const b = $('[data-acao="voz"]'), on = vozLigada();
  b.setAttribute('aria-checked', String(on));
  b.querySelector('.voz-texto').textContent = on ? 'Voz ligada' : 'Voz desligada';
  b.querySelector('.ic').innerHTML = iconeSvg(on ? 'som' : 'mudo', 13);
}
async function falar(texto) {
  if (!vozLigada() || !texto) return;
  try {
    voz ??= (await import('./js/voz-neural.js')).criarVozNeural();
    voz.iniciar();
    await new Promise(r => setTimeout(r, 50));
    voz.definirVoz(ler('oceano:assistente-voz-neural', 'brilho'));
    const motor = ler('oceano:assistente-voz-motor', null);
    if (motor !== 'sistema' && voz.pronta()) { await voz.falar(texto.slice(0, 1500), {}); return; }
  } catch {}
  // sem a voz neural baixada: a voz do sistema
  const fala = new SpeechSynthesisUtterance(texto.slice(0, 1500));
  const vozes = speechSynthesis.getVoices().filter(v => /^pt[-_]BR/i.test(v.lang)), nomeVoz = ler('oceano:assistente-voz-nome', '');
  fala.lang = 'pt-BR'; fala.voice = vozes.find(v => v.name === nomeVoz) || vozes.find(v => /grandpa/i.test(v.name)) || vozes[0] || null;
  speechSynthesis.speak(fala);
}

// ---------- anexos: ficam esperando até você enviar ----------
const TEXTO_OK = /\.(txt|md|markdown|csv|tsv|json|html?|xml|log|ya?ml|toml|ini|js|mjs|ts|tsx|jsx|css|py|lua|c|h|cpp|java|rb|go|rs|php|sh|sql|svg)$/i, MAX_TEXTO = 30000;
const MAX_ANEXO = 50 * 1024 * 1024, MAX_IMAGENS = 4, LADO_IMAGEM = 1568;
const eImagem = f => /^image\/(png|jpeg|webp|gif|bmp)$/.test(f.type);
// o mesmo caminho para escolher, colar e arrastar: tudo espera você apertar enviar
function anexar(arquivos) {
  for (const f of arquivos) {
    if (f.size > MAX_ANEXO) { novaMensagem('ela', `${f.name || 'Esse arquivo'} é grande demais para anexar aqui.`, true); continue; }
    anexos.push({ nome: f.name || 'imagem colada.png', arquivo: f });
  }
  pintarAtividades(); campo.focus();
}
// a imagem vai reduzida: cabe no limite das IAs e gasta menos
async function imagemParaEnviar(f) {
  const bmp = await createImageBitmap(f), k = Math.min(1, LADO_IMAGEM / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  const url = c.toDataURL('image/jpeg', 0.88);
  return { tipo: 'image/jpeg', dados: url.slice(url.indexOf(',') + 1) };
}
async function mensagemComAnexos(texto) {
  const partes = [texto], imagens = [];
  for (const a of anexos) {
    if (eImagem(a.arquivo) && imagens.length < MAX_IMAGENS) {
      try { imagens.push(await imagemParaEnviar(a.arquivo)); partes.push(`[Imagem anexada: ${a.nome}]`); continue; } catch {}
    }
    if (TEXTO_OK.test(a.nome) && a.arquivo.size <= MAX_TEXTO * 4) partes.push(`[Referência: ${a.nome}]\n${(await a.arquivo.text()).slice(0, MAX_TEXTO)}`);
    else partes.push(`[Referência anexada: ${a.nome}, ${a.arquivo.type || 'arquivo'}, ${Math.round(a.arquivo.size / 1024)} KB. O conteúdo deste formato ainda não chega até você: avise a pessoa.]`);
  }
  return { corpo: partes.filter(Boolean).join('\n\n'), imagens };
}

// ---------- enviar ----------
async function enviar(texto, mostrar = texto) {
  const temAnexo = anexos.length > 0;
  if ((!texto && !temAnexo) || respondendo) return;
  const modo = await n.conversaModo();
  iaConectada = !!modo.real;
  fecharMenu();
  janelaEl.removeAttribute('data-foco');
  if (!modo.real && !n.semIa) { novaMensagem('ela', 'Conecte uma IA em Adicionar agente para conversarmos daqui.', true); pintarAtividades(); return; }
  esconderSugestoes();
  const { corpo, imagens } = await mensagemComAnexos(texto);
  novaMensagem('voce', [mostrar, ...anexos.map(a => `📎 ${a.nome}`)].filter(Boolean).join('\n'));
  anexos = []; campo.value = ''; ajustarCampo();
  respondendo = true; estado = 'pensando'; pintarAtividades();
  avatar?.setExpression('halfLidded');
  bolhaViva = novaMensagem('ela', '…');
  conversa ??= (await n.conversaLista())[0]?.id || '';
  const r = await n.conversaEnviar(conversa, corpo, nomeAtual(), imagens);
  avatar?.setExpression('neutral');
  if (r.id) conversa = r.id;
  bolhaViva.textContent = semAsteriscos(r.erro || r.texto);
  if (r.erro) bolhaViva.closest('.msg').classList.add('erro');
  bolhaViva = null; respondendo = false; estado = 'falando'; pintarAtividades();
  lista.scrollTop = lista.scrollHeight;
  if (!r.erro) await falar(r.texto).catch(() => {});
  setTimeout(() => { estado = 'parado'; pintarAtividades(); }, 4000);
}
n.aoPedaco(({ id, texto }) => { if (id === conversa && bolhaViva) { bolhaViva.textContent = semAsteriscos(texto); estado = 'falando'; lista.scrollTop = lista.scrollHeight; pintarAtividades(); } });
formulario.onsubmit = e => { e.preventDefault(); enviar(campo.value.trim()); };

// ---------- sugestões: variam a cada conversa, somem depois da primeira mensagem e podem ser desligadas em Configurações ----------
const caixaSugestoes = $('.sugestoes');
function pintarSugestoes() {
  const mostrar = naLateral && ler('oceano:assistente-sugestoes', true) && !lista.querySelector('.msg.voce');
  caixaSugestoes.hidden = !mostrar;
  janelaEl.toggleAttribute('data-sugestoes', mostrar);
  if (mostrar) caixaSugestoes.innerHTML = sortearSugestoes(3).map(t => `<button type="button" class="sugestao">${esc(t)}</button>`).join('');
}
function esconderSugestoes() { caixaSugestoes.hidden = true; janelaEl.removeAttribute('data-sugestoes'); }
caixaSugestoes.addEventListener('click', e => { const b = e.target.closest('.sugestao'); if (b) enviar(b.textContent); });
addEventListener('storage', e => { if (e.key === 'oceano:assistente-sugestoes') pintarSugestoes(); });
pintarSugestoes();

// ---------- microfone: a voz vira texto no campo, linha por linha; quem envia é você ----------
let gravador = null, pedacos = [], descartar = false;
const onda = $('.mic-onda'), campoCaixa = $('.campo'), oferta = $('.mic-oferta');
function ajustarCampo() {
  campo.style.height = 'auto';
  campo.style.height = Math.min(64, campo.scrollHeight) + 'px';
}
campo.addEventListener('input', ajustarCampo);
campo.addEventListener('keydown', e => {
  if (e.key === 'Escape' && gravador) { descartar = true; gravador.stop(); return; }
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
  e.preventDefault();
  if (gravador) gravador.stop(); else formulario.requestSubmit();
});
const linguaDaFala = () => {
  let l = '';
  try { l = JSON.parse(localStorage.getItem('oceano:idioma') || 'null') || ''; } catch {}
  l = l || navigator.language || 'pt';
  return l === 'fil' ? 'tl' : l.toLowerCase().split('-')[0];
};
// o gráfico da voz, em barras retas: anda enquanto grava
function mostrarOnda(fluxo) {
  const ctx = new AudioContext(), analise = ctx.createAnalyser();
  analise.fftSize = 256; analise.smoothingTimeConstant = .6;
  ctx.createMediaStreamSource(fluxo).connect(analise);
  const g = onda.getContext('2d'), dados = new Uint8Array(analise.frequencyBinCount), cor = getComputedStyle(campo).color;
  let vivo = true;
  onda.width = Math.max(60, onda.clientWidth || 200);
  const quadro = () => {
    if (!vivo) return;
    requestAnimationFrame(quadro);
    analise.getByteFrequencyData(dados);
    g.clearRect(0, 0, onda.width, onda.height); g.fillStyle = cor;
    const n = Math.floor(onda.width / 5);
    for (let i = 0; i < n; i++) {
      const a = Math.max(2, Math.round(dados[Math.floor(i * dados.length * .6 / n)] / 255 * onda.height));
      g.fillRect(i * 5, Math.round((onda.height - a) / 2), 3, a);
    }
  };
  quadro();
  return () => { vivo = false; ctx.close(); };
}
// o áudio gravado vira mono a 16 kHz, o que o modelo entende
async function paraPcm(blob) {
  const ctx = new OfflineAudioContext(1, 16000, 16000), som = await ctx.decodeAudioData(await blob.arrayBuffer());
  const off = new OfflineAudioContext(1, Math.ceil(som.duration * 16000), 16000), f = off.createBufferSource();
  f.buffer = som; f.connect(off.destination); f.start();
  return (await off.startRendering()).getChannelData(0);
}
async function transcrever(blob, tipo) {
  if (await n.transcricaoEstado() === 'pronta') {
    const pcm = await paraPcm(blob);
    return { texto: await n.transcricaoTranscrever(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength), linguaDaFala()) };
  }
  return n.conversaTranscrever(await blob.arrayBuffer(), tipo);
}
function oferecerModelo() {
  oferta.hidden = false;
  oferta.querySelector('p').textContent = 'Para transcrever sua voz aqui no computador, sem enviar para ninguém, preciso baixar um modelo de 79 MB, uma vez só.';
  const baixar = oferta.querySelector('.mic-baixar');
  baixar.hidden = false; baixar.disabled = false;
  baixar.onclick = async () => {
    baixar.disabled = true;
    try { await n.transcricaoBaixar(); oferta.hidden = true; alternarMic(); }
    catch { oferta.querySelector('p').textContent = 'Não consegui baixar agora. Confira a internet e tente de novo.'; baixar.disabled = false; }
  };
  oferta.querySelector('.mic-depois').onclick = () => { oferta.hidden = true; };
}
n.aoTranscricaoProgresso?.(p => { if (!oferta.hidden) oferta.querySelector('p').textContent = `Baixando o modelo: ${Math.round(p * 100)}%`; });
async function alternarMic() {
  if (gravador) { gravador.stop(); return; }
  if (mic.classList.contains('ocupado')) return;
  if (await n.transcricaoEstado?.() === 'ausente') {
    const nuvem = (await n.agentesListar().catch(() => [])).some(a => a.conectado && ['openai', 'gemini'].includes(a.provedor));
    if (!nuvem) return oferecerModelo();
  }
  let fluxo;
  try { fluxo = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { novaMensagem('ela', 'Não consegui usar o microfone. Confira a permissão nos Ajustes do sistema.', true); return; }
  pedacos = []; descartar = false;
  gravador = new MediaRecorder(fluxo);
  const pararOnda = mostrarOnda(fluxo);
  gravador.ondataavailable = e => { if (e.data.size) pedacos.push(e.data); };
  gravador.onstop = async () => {
    pararOnda();
    fluxo.getTracks().forEach(t => t.stop());
    const tipo = gravador.mimeType; gravador = null;
    campoCaixa.removeAttribute('data-gravando'); onda.hidden = true;
    mic.setAttribute('aria-pressed', 'false');
    campo.focus();
    if (descartar) return;
    mic.classList.add('ocupado');
    const antes = campo.placeholder; campo.placeholder = 'Transcrevendo…';
    try {
      const r = await transcrever(new Blob(pedacos, { type: tipo }), tipo);
      if (r.erro) novaMensagem('ela', r.erro, true);
      else if (r.texto) { campo.value = [campo.value, r.texto].filter(Boolean).join('\n'); ajustarCampo(); campo.scrollTop = campo.scrollHeight; campo.focus(); }
      else novaMensagem('ela', 'Não ouvi nada. Tente de novo.', true);
    } catch { novaMensagem('ela', 'Não consegui transcrever esse áudio.', true); }
    mic.classList.remove('ocupado'); campo.placeholder = antes; pintarNome();
  };
  gravador.start();
  mic.setAttribute('aria-pressed', 'true');
  campoCaixa.setAttribute('data-gravando', ''); onda.hidden = false;
  campo.focus();
}

// ---------- menu e ações ----------
function fecharMenu() { menu.hidden = true; botaoMenu.setAttribute('aria-expanded', 'false'); }
const ACOES = {
  menu: () => { const abrir = menu.hidden; menu.hidden = !abrir; botaoMenu.setAttribute('aria-expanded', String(abrir)); if (abrir) menu.querySelector('button').focus(); },
  foco: () => { atividades.hidden = true; fecharMenu(); janelaEl.toggleAttribute('data-foco'); },
  ver: () => { pintarAtividades(); atividades.hidden = false; },
  'fechar-atividades': () => { atividades.hidden = true; },
  resumir: () => enviar('Resuma em poucas linhas o que conversamos e em que ponto estamos.', 'Resumir'),
  explorar: () => enviar('Sugira três caminhos para explorarmos a partir do que estamos fazendo.', 'Explorar'),
  voz: () => { try { localStorage.setItem(VOZ_CHAVE, JSON.stringify(!vozLigada())); } catch {} if (!vozLigada()) { speechSynthesis.cancel(); voz?.parar?.(); } pintarVoz(); },
  ferramentas: () => { fecharMenu(); n.abrirOceano('oceano://ferramentas'); },
  agente: () => { fecharMenu(); n.abrirOceano('oceano://ia'); },
  anexar: () => { fecharMenu(); arquivo.click(); },
  mic: alternarMic,
  soltar: () => n.soltar?.(),
  menor: () => n.tamanho?.(-1),
  maior: () => n.tamanho?.(1),
  minimizar: () => { fecharMenu(); n.minimizar?.(); },
  fechar: () => { fecharMenu(); n.fechar?.(); },
  dev: () => { fecharMenu(); n.abrirDev?.(); },
  nova: () => { conversa = ''; lista.innerHTML = ''; anexos = []; atividades.hidden = true; janelaEl.removeAttribute('data-foco'); fecharMenu(); pintarAtividades(); pintarSugestoes(); campo.focus(); },
};
$('.janela').addEventListener('click', e => {
  const tirar = e.target.closest('[data-tirar]');
  if (tirar) { anexos.splice(Number(tirar.dataset.tirar), 1); pintarAtividades(); return; }
  const b = e.target.closest('[data-acao]');
  if (!b) { if (!menu.hidden && !e.target.closest('.menu')) fecharMenu(); return; }
  if (b.dataset.acao !== 'menu' && !b.closest('.menu') && !menu.hidden) { fecharMenu(); if (b.dataset.acao === 'foco') return; }
  ACOES[b.dataset.acao]?.();
});
arquivo.onchange = () => { const fs = [...arquivo.files]; arquivo.value = ''; anexar(fs); };
// colar (⌘V ou Ctrl+V) e arrastar do computador
addEventListener('paste', e => {
  const fs = [...(e.clipboardData?.files || [])];
  if (!fs.length) return;   // texto segue o caminho normal
  e.preventDefault(); anexar(fs);
});
addEventListener('dragover', e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; raiz.toggleAttribute('data-soltando', true); });
addEventListener('dragleave', e => { if (!e.relatedTarget) raiz.removeAttribute('data-soltando'); });
addEventListener('drop', e => { e.preventDefault(); raiz.removeAttribute('data-soltando'); const fs = [...(e.dataTransfer?.files || [])]; if (fs.length) anexar(fs); });
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!menu.hidden) { fecharMenu(); botaoMenu.focus(); } else if (!atividades.hidden) atividades.hidden = true;
});
addEventListener('storage', e => { if (e.key === VOZ_CHAVE) pintarVoz(); if (e.key === 'oceano:avatar-nome') pintarAtividades(); });
n.aoAbrir(on => { if (on) atualizarAgentes(); });
if (naLateral) {
  for (const b of document.querySelectorAll('[data-acao="soltar"], [data-acao="minimizar"]')) b.hidden = true;
  $('[data-acao="dev"]').hidden = !n.temDev;
}
pintarVoz(); atualizarAgentes();

// ---------- nova conversa: o texto entra letra a letra (roxo, laranja, branco) e sai subindo e se desfazendo ----------
{
  const b = $('.nova-conversa'), caixa = b.querySelector('.nc-texto');
  caixa.innerHTML = [...'nova conversa'].map((c, i, tudo) => `<span style="--i:${i};--r:${tudo.length - 1 - i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  const entra = () => { b.classList.remove('saindo'); b.classList.add('mostrando'); };
  const sai = () => { if (b.classList.contains('mostrando')) { b.classList.remove('mostrando'); b.classList.add('saindo'); } };
  b.addEventListener('pointerenter', entra); b.addEventListener('focus', entra);
  b.addEventListener('pointerleave', sai); b.addEventListener('blur', sai);
  caixa.lastElementChild.addEventListener('animationend', e => { if (e.animationName === 'nc-sai') b.classList.remove('saindo'); });
}
