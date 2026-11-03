// Primeiros passos: a etapa mais importante do Oceano. Toma a tela inteira, com o navegador aparecendo por trás em dither:
// o primeiro slide é sólido, com o farol e o mar; depois a cobertura cai de 90% até 50% no último.
// O cursor mostra onde clicar e abre cada área de verdade, sem esperar a pessoa. A partir do slide 3 dá para minimizar e voltar;
// ao concluir some de vez, e fica para rever na página Sobre a Navegadora.
// O site que cria a chave da IA é só um link para copiar: abrir no navegador que a pessoa já usa deixa a conta dela fora do Oceano.

import { icone } from './icones.js';
import { ia } from './ia-pagina.js';
import { montarVozSistema, montarVozNeural } from './voz-escolha.js';
import { escreverSaudacoes } from './ola-escrito.js';
import { farolDaNoite } from './farol-noite.js';
import { criarConversa } from './conversa-avatares.js';
import { criarAvatarSprite } from './avatar-sprite.js';
import { IDIOMAS, idiomaAtual } from './idioma.js';
import { listarGrupos, criarGrupo, apagarGrupoVazio, criarEspecialista, apagarEspecialista } from './especialistas.js';
import { contarUso } from './contagem-uso.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ESTADO = 'primeiros-passos-3';   // { pos, vistos, concluido, antes, revelou }
const ASSUNTOS = ['Música', 'Trabalho', 'Estudos', 'Jogos', 'Casa', 'Viagens', 'Robótica'];
const ESPECIALISTAS = [['Pesquisa', 'encontrar e comparar informações'], ['Escrita', 'escrever e revisar textos'], ['Ideias', 'sugerir caminhos para um projeto'], ['Código', 'explicar e revisar código']];
const GRUPO_ESPECIALISTAS = 'Especialistas';

// o tour: o cursor vai até o ícone da mesa, clica e a área abre por trás
const TOUR = [
  { id: 'ferramentas', emoji: '🧰', nome: 'Ferramentas', url: 'oceano://ferramentas', texto: 'Baixe, corte e converta vídeo, áudio e imagem. Tudo roda no seu computador.' },
  { id: 'retoque', emoji: '🎨', nome: 'RetoqueShop 1.0', url: 'oceano://retoque', texto: 'Edite imagens com camadas, máscaras e seleções.' },
  { id: 'animacao', emoji: '🎞️', nome: 'Animação', url: 'oceano://micromediaflash', texto: 'Anime como no Flash e exporte em GIF, vídeo ou HTML5.' },
  { id: 'stave', emoji: '🎼', nome: 'Stave', url: 'oceano://stave', texto: 'Programe música ao vivo, escrevendo código.' },
  { id: 'robo', emoji: '🤖', nome: 'Robôs', beta: true, url: 'oceano://robo', texto: 'Monte e teste robôs num simulador 3D, com física e motores.' },
  { id: 'pico8', emoji: '👾', nome: 'PICO-8', url: 'oceano://pico8', texto: 'Jogue e aprenda como os jogos em pixel são feitos.' },
  { id: 'mods', emoji: '🧩', nome: 'Mods', url: 'oceano://mods', texto: 'Mude o navegador com poucas linhas. Mods não tocam em arquivos nem senhas.' },
  { id: 'temas', emoji: '🖼️', nome: 'Temas', url: 'oceano://temas', texto: 'Troque cada cor e veja o resultado na hora.' },
];
const ORDEM_DOS_SLIDES = ['idioma', 'inicio', 'ia', 'agente', 'rede', 'ilha', 'voz', 'avatar', ...TOUR.map(t => t.id), 'pronto'];
const ETAPAS = [['Sua IA', ['ia', 'agente', 'rede']], ['Ilha', ['ilha']], ['Voz', ['voz']], ['Avatar', ['avatar']], ['Criar', ['ferramentas', 'retoque', 'animacao']], ['Música e jogos', ['stave', 'robo', 'pico8']], ['Do seu jeito', ['mods', 'temas']], ['Pronto', ['pronto']]];
const slidesDaEtapa = ETAPAS.map(([, nomes]) => ORDEM_DOS_SLIDES.flatMap((n, k) => (nomes.includes(n) ? [k] : [])));
const MINIMIZA_DESDE = 3;   // a partir da conexão com a IA
// a ordem é esta de propósito, para escolher rápido; cada idioma aparece no próprio nome
const LISTA_DE_IDIOMAS = [['pt', 'Português'], ['es', 'Español'], ['fr', 'Français'], ['it', 'Italiano'], ['de', 'Deutsch'], ['ja', '日本語'], ['ko', '한국어'], ['en', 'English'], ...Object.entries(IDIOMAS).filter(([id]) => !['pt', 'es', 'fr', 'it', 'de', 'ja', 'ko', 'en'].includes(id))];

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const expoOut = k => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
const espera = ms => new Promise(r => setTimeout(r, ms));

// ---------- a cobertura em dither ----------
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
const CACHE_COBERTURA = new Map();
function cobertura(opacidade, cor) {
  const chave = `${Math.round(opacidade * 64)}|${cor}`;
  if (!CACHE_COBERTURA.has(chave)) {
    const c = document.createElement('canvas'), lado = 3; c.width = c.height = 8 * lado;
    const g = c.getContext('2d'); g.fillStyle = cor;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((BAYER[y * 8 + x] + .5) / 64 < opacidade) g.fillRect(x * lado, y * lado, lado, lado);
    CACHE_COBERTURA.set(chave, `url(${c.toDataURL()})`);
  }
  return CACHE_COBERTURA.get(chave);
}

// ---------- bandeira em pixel ----------
function bandeira(c) {
  const W = 22, H = 15; c.width = W; c.height = H;
  const g = c.getContext('2d'), cx = (W - 1) / 2, cy = (H - 1) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx * .95, dy);
    let cor = '#009739';
    if (Math.abs(dx) / 10.5 + Math.abs(dy) / 6.6 <= 1) cor = '#fedd00';
    if (r <= 3.6) cor = Math.abs(dy - dx * .15) < .6 ? '#ffffff' : '#012169';
    g.fillStyle = cor; g.fillRect(x, y, 1, 1);
  }
}

// ---------- os pixels sumindo ----------
const CELULA = 8;
function ordemAleatoria(n) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// a cada chamada, a ordem é outra. "desfazer": de cheio até vazio; o contrário traz a tela de volta
function mascaraDePixels(el) {
  const w = Math.ceil(innerWidth), h = Math.ceil(innerHeight), col = Math.ceil(w / CELULA), lin = Math.ceil(h / CELULA), ordem = ordemAleatoria(col * lin);
  const c = document.createElement('canvas'); c.width = col; c.height = lin;
  const g = c.getContext('2d');
  return k => {   // k: parte da tela que ainda aparece
    g.clearRect(0, 0, col, lin); g.fillStyle = '#000';
    const n = Math.floor(ordem.length * k);
    for (let i = 0; i < n; i++) { const p = ordem[i]; g.fillRect(p % col, Math.floor(p / col), 1, 1); }
    const url = `url(${c.toDataURL()})`;
    el.style.webkitMaskImage = el.style.maskImage = url;
    el.style.webkitMaskSize = el.style.maskSize = '100% 100%';
  };
}
function limparMascara(el) { el.style.webkitMaskImage = el.style.maskImage = 'none'; el.style.transform = ''; el.style.transformOrigin = ''; }
function correr(dur, fn) { return new Promise(ok => { const t0 = performance.now(); const q = agora => { const t = Math.min(1, (agora - t0) / dur); fn(t); if (t < 1) requestAnimationFrame(q); else ok(); }; requestAnimationFrame(q); }); }

// ao concluir: rápido, pixels somem em ordem sempre aleatória
async function dissolver(el) {
  if (quieto()) return;
  const pinta = mascaraDePixels(el);
  await correr(620, t => pinta(1 - expoOut(t)));
}

// minimizar e retomar: a tela encolhe para baixo e os pixels deixam um rastro. Cada pixel tem tamanho, velocidade e rastro próprios
const CORES_RASTRO = ['#f6f4ea', '#ffd166', '#5bb6f0', '#c3c6d6'];
async function encolher(el, voltando) {
  if (quieto()) return;
  const W = innerWidth, H = innerHeight, tela = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
  tela.className = 'pp-rastro'; tela.width = W * dpr; tela.height = H * dpr; tela.setAttribute('aria-hidden', 'true');
  document.body.append(tela);
  const g = tela.getContext('2d'); g.scale(dpr, dpr);
  const alvoX = W - 120, alvoY = H - 30;
  const pixels = Array.from({ length: 260 }, () => {
    const lado = 2 + Math.floor(Math.random() ** 2 * 12);
    return { x: Math.random() * W, y: Math.random() * H, lado, atraso: Math.random() * .45, duracao: .3 + Math.random() * .55, cauda: 3 + Math.floor(Math.random() ** 1.5 * 26), passo: lado * (.6 + Math.random() * 1.2), cor: CORES_RASTRO[Math.floor(Math.random() * CORES_RASTRO.length)], forca: .35 + Math.random() * .65 };
  });
  const pinta = mascaraDePixels(el);
  el.style.transformOrigin = '50% 100%';
  await correr(voltando ? 420 : 380, t0 => {
    const t = voltando ? 1 - t0 : t0, k = expoOut(t);
    el.style.transform = `scale(${1 - k * .82}, ${1 - k * .94})`;
    pinta(1 - k);
    g.clearRect(0, 0, W, H);
    for (const p of pixels) {
      const v = Math.min(1, Math.max(0, (t - p.atraso) / p.duracao));
      if (v <= 0 || v >= 1) continue;
      const e = expoOut(v), x = p.x + (alvoX - p.x) * e, y = p.y + (alvoY - p.y) * e, ax = alvoX - p.x, ay = alvoY - p.y, d = Math.hypot(ax, ay) || 1;
      g.fillStyle = p.cor;
      for (let i = 0; i < p.cauda; i++) {
        g.globalAlpha = p.forca * (1 - i / p.cauda) * (1 - v);
        const s = Math.max(1, p.lado * (1 - i / p.cauda));
        g.fillRect(Math.round(x - ax / d * i * p.passo), Math.round(y - ay / d * i * p.passo), s, s);
      }
    }
    g.globalAlpha = 1;
  });
  tela.remove();
  if (voltando) limparMascara(el);
}

// ---------- o cursor ----------
const CURSOR = ['K.........', 'KK........', 'KWK.......', 'KWWK......', 'KWWWK.....', 'KWWWWK....', 'KWWWWWK...', 'KWWWWWWK..', 'KWWWWWWWK.', 'KWWWWKKKKK', 'KWWKWWK...', 'KWK.KWWK..', 'KK..KWWK..', 'K....KWWK.', '.....KWWK.', '......KK..'];
const cursorSvg = () => {
  let preto = '', branco = '';
  CURSOR.forEach((l, y) => [...l].forEach((c, x) => { if (c === 'K') branco += `M${x} ${y}h1v1h-1z`; if (c === 'W') preto += `M${x} ${y}h1v1h-1z`; }));
  // preto com borda branca, como pedido: o miolo é preto e o contorno, branco
  return `<svg viewBox="0 0 10 16" width="30" height="48" shape-rendering="crispEdges" aria-hidden="true"><path d="${branco}" fill="#fff"/><path d="${preto}" fill="#000"/></svg>`;
};

export function iniciarPrimeirosPassos(app, guardado) {
  let aberto = null;
  const estado = () => ({ pos: 0, vistos: [], concluido: false, ...guardado.ler(ESTADO, {}) });
  const salvarEstado = mudar => guardado.gravar(ESTADO, { ...estado(), ...mudar });
  const etapasFeitas = vistos => slidesDaEtapa.filter(lista => lista.every(k => vistos.includes(k))).length;

  // a pílula no canto: mostra quanto falta e traz os passos de volta
  const pilula = document.createElement('button');
  pilula.type = 'button'; pilula.className = 'pp-pilula'; pilula.hidden = true;
  document.body.append(pilula);
  pilula.onclick = () => abrir();
  function pintarPilula() {
    const st = estado(), total = ETAPAS.length, feitas = etapasFeitas(st.vistos);
    pilula.hidden = st.concluido || !!aberto;
    pilula.innerHTML = `<span class="pp-pilula-barra" aria-hidden="true"><i style="width:${Math.round(feitas / total * 100)}%"></i></span><span>Primeiros passos · ${feitas} de ${total}</span><b>continuar</b>`;
    pilula.setAttribute('aria-label', `Continuar os primeiros passos: ${feitas} de ${total} etapas feitas`);
  }

  async function abrir({ rever = false } = {}) {
    if (aberto) return;
    const voltando = !rever && estado().pos >= MINIMIZA_DESDE;
    pilula.hidden = true;
    const voltarFoco = document.activeElement;
    const el = document.createElement('div');
    el.className = 'pp';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Primeiros passos');
    aberto = el;
    // os passos começam sempre iguais para todos: tema padrão, céu limpo e o sol na hora de agora. Nada disso é salvo: ao sair, volta o que a pessoa escolheu
    app.aplicarTemaObj?.(app.temas.oceano);
    app.definirHoraCena?.({ modo: 'relogio' }, false);
    app.ceuLimpo = true; app.clima?.aplicar();
    app.mostrarLateral?.(false, false);   // atrás dos passos fica só o oceano
    if (app.url?.() !== 'oceano://nova-aba') app.navegar('oceano://nova-aba');
    const a = await app.carregarPainel?.('assistente');
    // começa com o gato e a Cara aparece no meio do caminho; ao minimizar, volta o avatar que a pessoa já tinha
    const salvo = estado();
    const antes = !rever && salvo.antes ? salvo.antes : a?.personagem?.() || 'cara';
    const nome = antes === 'gato' ? 'Cara' : a?.nome?.() || 'Cara';
    let revelou = !rever && !!salvo.revelou;
    if (!rever) salvarEstado({ antes });
    if (!revelou) a?.definirPersonagem?.('gato');
    el.innerHTML = `
      <button type="button" class="pp-pular" data-pp="minimizar">${rever ? 'fechar' : 'minimizar'}</button>
      <nav class="pp-etapas" aria-label="Etapas dos primeiros passos"></nav>
      <div class="pp-trilho">
        <section class="pp-s pp-ola" data-slide="idioma">
          <canvas class="pp-ola-fundo" aria-hidden="true"></canvas>
          <div class="pp-ola-palavra" role="img" aria-label="Olá"><canvas class="pp-ola-escrita" aria-hidden="true"></canvas></div>
          <div class="pp-ola-lista"><select class="pp-ola-select" data-pp-select-idioma aria-label="Escolha o idioma">${LISTA_DE_IDIOMAS.map(([id, n]) => `<option value="${id}" lang="${id}" ${idiomaAtual(guardado) === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><button type="button" class="btn" data-pp="prox">continuar ${icone('avancar')}</button></div>
        </section>
        <section class="pp-s pp-inicio" data-slide="inicio">
          <canvas class="pp-mar" aria-hidden="true"></canvas>
          <div class="pp-logo">${icone('logo')}<h1>oceano</h1></div>
          <div class="pp-abertura">
            <p>Vamos apresentar a vocês uma experiência moderna, atual, livre e inovadora.</p>
            <p class="pp-soberania">Pela liberdade e soberania nacional <canvas class="pp-bandeira" role="img" aria-label="Bandeira do Brasil"></canvas></p>
            <p class="pp-hora"><span>Horário no mundo real e no Oceano agora</span> • <b data-pp-hora></b></p>
          </div>
        </section>
        <section class="pp-s pp-lado" data-slide="ia">
          <canvas class="pp-avatar" width="240" height="240" aria-hidden="true"></canvas>
          <div class="pp-bloco">
            <div class="pp-texto pp-apresenta"><h2>Oi, eu sou a sua navegadora!</h2><p class="pp-nome">Pode me chamar de ${esc(nome)}!!!</p><p class="pp-aviso">Por enquanto não tenho nenhum agente pra responder por mim, mas adicione um e depois escolha minha voz.</p></div>
            <div class="pp-dois">
              <div class="pp-cartao destaque"><h3>🧠 Com uma IA</h3><p>Eu faço o mesmo que a sua IA já faz, e ainda coordeno várias IAs para você.</p><button type="button" class="btn" data-pp-ir-nome="agente">Conectar minha IA</button></div>
              <div class="pp-cartao"><h3>🌊 Sem IA</h3><p>Respondo clima, horas, contas e dúvidas sobre o navegador.</p><button type="button" class="btn secundario" data-pp-sem-ia>Seguir sem IA</button></div>
            </div>
          </div>
        </section>
        <section class="pp-s" data-slide="agente">
          <div class="pp-texto"><h2>Quem vai responder por mim?</h2><p>Escolha a IA e cole a chave. A chave fica só na memória e some ao fechar o Oceano. Cada IA cobra o uso na conta dela.</p></div>
          <div class="pp-agente">${app.real
            ? '<div data-iap-papeis hidden></div><div class="iap-provedores" data-iap-provedores></div><div data-iap-form></div>'
            : '<p class="nota">As conexões ficam no app Oceano. No simulador, sigo respondendo por regras simples.</p>'}</div>
        </section>
        <section class="pp-s" data-slide="rede">
          <div class="pp-texto"><h2>Eu faço o mesmo que a sua IA já faz.</h2><p>Eu viro a orquestradora:<br>várias IAs trabalhando juntas, cada uma no que faz de melhor.</p></div>
          <div class="pp-rede" aria-hidden="true"><b>Você</b><i></i><b class="eu">${esc(nome)}</b><i></i><b>Pesquisa</b><i></i><b>Escrita</b><i></i><b>Revisão</b><i></i><b class="eu">Resposta</b></div>
          <div class="pp-dois">
            <div class="pp-cartao"><h3>⛓️ Em cadeia</h3><p>Uma pesquisa, a outra escreve e a terceira revisa.</p></div>
            <div class="pp-cartao"><h3>🕸️ Em rede</h3><p>Cada especialista responde, e eu junto tudo numa resposta só.</p></div>
          </div>
        </section>
        <section class="pp-s" data-slide="ilha">
          <div class="pp-texto"><h2>🏝️ Cada assunto vira uma vila na sua ilha</h2><p>Toque nos que quiser. Pode começar em branco.</p></div>
          <div class="pp-chips" role="group" aria-label="Grupos para criar">${ASSUNTOS.map(n => `<button type="button" class="chip" data-pp-grupo="${esc(n)}" aria-pressed="false">${esc(n)}</button>`).join('')}</div>
          <div class="pp-texto"><p>E os especialistas que vão trabalhar para você:</p></div>
          <div class="pp-chips" role="group" aria-label="Especialistas para criar">${ESPECIALISTAS.map(([n]) => `<button type="button" class="chip" data-pp-esp="${esc(n)}" aria-pressed="false">${esc(n)}</button>`).join('')}</div>
        </section>
        <section class="pp-s" data-slide="voz">
          <div class="pp-texto"><h2>🔊 Escolha a minha voz</h2><p>Toque em ouvir para testar.</p></div>
          <div class="pp-dois pp-vozes"><div class="pp-cartao"><h3>Do seu sistema</h3><div data-pp-sistema></div><label class="pp-ligar"><input type="checkbox" data-pp-falar> Falar em voz alta</label></div><div class="pp-cartao"><div data-pp-neural></div></div></div>
        </section>
        <section class="pp-s pp-conversa" data-slide="avatar">
          <div class="pp-texto"><h2>O gato foi só para a gente se conhecer.</h2><p>Você pode personalizar ambos os avatares depois em Configurações.</p></div>
          <div class="pp-dupla">
            <figure class="pp-fala"><canvas class="pp-avatar" width="240" height="240" aria-hidden="true"></canvas><figcaption data-pp-legenda="cara" aria-live="polite"></figcaption><button type="button" class="btn" data-pp="revelar" aria-pressed="true">Quero a ${esc(nome)}</button></figure>
            <figure class="pp-fala"><canvas class="pp-gato" aria-hidden="true"></canvas><figcaption data-pp-legenda="gato" aria-live="polite"></figcaption><button type="button" class="btn" data-pp="gato" aria-pressed="false">Prefiro o gato</button></figure>
          </div>
        </section>
        ${TOUR.map(t => `<section class="pp-s pp-tour" data-slide="${t.id}">
          <div class="pp-texto"><span class="pp-grande" aria-hidden="true">${t.emoji}</span><h2>${esc(t.nome)}${t.beta ? ' <span class="chip vz-beta">beta</span>' : ''}</h2><p>${esc(t.texto)}</p><p class="pp-onde">Tudo de graça e livre de propaganda.</p>
            <button type="button" class="btn secundario mini" data-pp-rever-demo>mostrar de novo</button></div>
        </section>`).join('')}
        <section class="pp-s pp-lado" data-slide="pronto">
          
          <div class="pp-texto"><h2>Agora é com a gente!</h2><p>Estou na janelinha da página inicial. Para ver tudo de novo, vá em Sobre a Navegadora.</p>
            <p class="pp-falta" role="status"></p>
            <label class="pp-uso"><input type="checkbox" data-pp-uso> <b>Autorizo compartilhar dados de uso anonimizados</b></label>
            <p class="pp-uso-texto">É só para um monitoramento anônimo, com uma estimativa da ordem de grandeza de uso, para medirmos o sucesso deste projeto. Sem isso, a única forma de sabermos seria se as pessoas gravassem vídeos sobre o Oceano, o que, aliás, seria muito legal se fizessem!</p>
            <p class="pp-uso-texto">Se você autorizar, o Oceano envia um sinal por dia com a versão, o sistema, o idioma, o país do sistema e uma faixa de tempo de uso. Não vai nenhum identificador nem site visitado, e o IP não é guardado. Dá para desligar e pedir a remoção em Configurações, e cada envio aparece em oceano://rede.</p>
            <button type="button" class="btn" data-pp="concluir">Concluir</button></div>
        </section>
      </div>
      <footer class="pp-pe">
        <button type="button" class="btn secundario" data-pp="ant">${icone('voltar')} voltar</button>
        <div class="pp-pontos"></div>
        <button type="button" class="btn" data-pp="prox">próximo ${icone('avancar')}</button>
      </footer>
      <div class="pp-mao" hidden>${cursorSvg()}</div>
`;
    document.body.append(el);
    const usoAnonimo = el.querySelector('[data-pp-uso]');
    usoAnonimo.checked = guardado.ler('uso-anonimo', false) === true;
    usoAnonimo.addEventListener('change', () => { guardado.gravar('uso-anonimo', usoAnonimo.checked); contarUso(guardado); });

    const $ = s => el.querySelector(s);
    const trilho = $('.pp-trilho'), slides = [...el.querySelectorAll('.pp-s')], pontos = $('.pp-pontos'), barra = $('.pp-etapas'), mao = $('.pp-mao');
    bandeira($('.pp-bandeira'));
    let vistos = rever ? [] : [...salvo.vistos];
    const indice = nomeSlide => slides.findIndex(s => s.dataset.slide === nomeSlide);
    const etapaFeita = n => slidesDaEtapa[n].every(k => vistos.includes(k));
    const faltando = () => ETAPAS.map((_, n) => n).filter(n => ETAPAS[n][1][0] !== 'pronto' && !etapaFeita(n));
    let i = rever ? 0 : Math.min(salvo.pos || 0, slides.length - 1);

    function pintarEtapas() {
      const atual = slidesDaEtapa.findIndex(l => l.includes(i));
      barra.innerHTML = ETAPAS.map(([t], n) => `<button type="button" data-pp-etapa="${n}" class="${etapaFeita(n) ? 'feita' : ''}" ${n === atual ? 'aria-current="step"' : ''}>${etapaFeita(n) ? '✓ ' : ''}${esc(t)}</button>`).join('');
      const faltam = ETAPAS.length - ETAPAS.filter((_, n) => etapaFeita(n)).length;
      pontos.textContent = i < 2 ? '' : rever ? `${i} de ${slides.length - 1}` : faltam ? `faltam ${faltam} ${faltam === 1 ? 'etapa' : 'etapas'}` : 'tudo visto';
    }
    // a cobertura: sólida no primeiro, 90% no segundo, e vai caindo até 50% no último
    let opAtual = null, trocaDeFundo = 0;
    function pintarFundo() {
      const PRIMEIRO = 2, total = slides.length - 1, op = i < PRIMEIRO ? 1 : .9 - (i - PRIMEIRO) / Math.max(1, total - PRIMEIRO) * .4;
      const aplicar = v => { el.style.backgroundColor = v >= 1 ? 'var(--fundo)' : 'transparent'; el.style.backgroundImage = v >= 1 ? 'none' : cobertura(v, '#080b18'); };
      el.dataset.cobertura = op.toFixed(2);
      const de = opAtual ?? op, n = ++trocaDeFundo;
      opAtual = op;
      if (quieto() || de === op) return aplicar(op);
      correr(620, t => { if (n === trocaDeFundo) aplicar(de + (op - de) * expoOut(t)); });
    }

    // ---------- o cursor em ação ----------
    let demo = 0;
    const paradaDoCursor = () => { demo++; mao.hidden = true; mao.classList.remove('clicando'); };
    const moverPara = (x, y, imediato) => { mao.style.transition = imediato || quieto() ? 'none' : ''; mao.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; };
    async function irComOCursor(alvo, n) {
      const r = alvo.getBoundingClientRect();
      if (!r.width) return false;
      mao.hidden = false;
      moverPara(r.left + r.width / 2, r.top + r.height / 2);
      await espera(quieto() ? 50 : 850);
      return n === demo;
    }
    async function clicarCursor() { mao.classList.add('clicando'); await espera(220); mao.classList.remove('clicando'); }
    // o tour: volta para a mesa, leva o cursor até o ícone, clica e a área abre por trás
    async function rodarTour(t) {
      const n = ++demo;
      if (app.url() !== 'oceano://nova-aba') { app.navegar('oceano://nova-aba'); await espera(450); if (n !== demo) return; }
      mao.hidden = false; moverPara(innerWidth * .55, innerHeight * .75, true);
      await espera(120); if (n !== demo) return;
      const alvo = document.querySelector(`.mesa-icone[data-ir="${t.url}"]`) || document.querySelector('#endereco');
      if (!await irComOCursor(alvo, n)) { if (n === demo) app.navegar(t.url); return; }
      await clicarCursor(); if (n !== demo) return;
      app.navegar(t.url);
      await espera(500); if (n === demo) mao.hidden = true;
    }
    // aponta sem clicar: quem escolhe é a pessoa
    async function apontar(seletor) {
      const n = ++demo, alvo = $(seletor);
      if (!alvo) return;
      const r0 = alvo.getBoundingClientRect();
      mao.hidden = false; moverPara(r0.left + r0.width + 90, r0.top + r0.height + 90, true);
      await espera(100);
      if (await irComOCursor(alvo, n)) { await clicarCursor(); await espera(500); if (n === demo) mao.hidden = true; }
    }
    // o avatar: os dois em cena, discutindo. A Cara é a de verdade; o gato é a folha dele. A escolha só vale ao sair do slide
    const aCara = antes === 'gato' ? 'cara' : antes;
    let escolha = salvo.escolha === 'gato' ? 'gato' : 'cara', conversa = null, gatoEmCena = null, gatoRaf = 0, noAvatar = false;
    const pintarEscolha = () => { $('[data-pp="revelar"]').setAttribute('aria-pressed', escolha === 'cara'); $('[data-pp="gato"]').setAttribute('aria-pressed', escolha === 'gato'); };
    async function entrarNoAvatar() {
      noAvatar = true;
      revelou = true;
      if (!rever) salvarEstado({ revelou });
      a?.definirPersonagem?.(aCara);
      pintarEscolha();
      if (app.url() !== 'oceano://ferramentas') app.navegar('oceano://ferramentas');   // só aqui a aba aparece ao fundo
      if (!gatoEmCena) {
        const folha = await fetch('avatares/gato/sprite.json').then(r => r.json()).catch(() => null);
        if (!folha || !noAvatar) return;
        gatoEmCena = await criarAvatarSprite($('.pp-gato'), { src: 'avatares/gato/' + folha.folha, quadro: folha.quadro, fps: folha.fps, estados: folha.estados });
      }
      if (!noAvatar) return;
      let antesQuadro = performance.now();
      const passo = agora => { if (!noAvatar) return; gatoEmCena.advance((agora - antesQuadro) / 1000); antesQuadro = agora; gatoRaf = requestAnimationFrame(passo); };
      gatoRaf = requestAnimationFrame(passo);
      conversa ??= criarConversa({
        legendas: { cara: $('[data-pp-legenda="cara"]'), gato: $('[data-pp-legenda="gato"]') },
        comSom: () => a?.voz?.() !== false,
        lingua: () => app.idioma?.atual?.(),
        atores: {
          cara: { falar(texto, emocao) { a?.mexerBoca?.(texto); if (emocao) a?.testar?.(emocao); }, calar() { a?.calar?.(); } },
          gato: { falar() { gatoEmCena.setSpeaking(true); }, calar() { gatoEmCena.setSpeaking(false); } },
        },
      });
      conversa.comecar();
    }
    function sairDoAvatar() {
      if (!noAvatar) return;
      noAvatar = false;
      cancelAnimationFrame(gatoRaf);
      conversa?.parar();
      a?.definirPersonagem?.(escolha === 'gato' ? 'gato' : aCara);
    }

    let animarSaudacao = () => {};
    function ir(k, focar = true) {
      paradaDoCursor();
      sairDoAvatar();
      i = Math.max(0, Math.min(slides.length - 1, k));
      trilho.style.transform = `translateX(${-100 * i}%)`;
      slides.forEach((s, j) => { s.inert = j !== i; });
      if (!vistos.includes(i)) vistos.push(i);
      if (!rever) salvarEstado({ pos: i, vistos });
      el.classList.toggle('pp-solido', i < 2);
      el.classList.toggle('pp-na-saudacao', i === 0);
      animarSaudacao(i === 0);
      pintarFundo();
      pintarEtapas();
      $('[data-pp="ant"]').disabled = i === 0;
      $('[data-pp="ant"]').style.visibility = i === 0 ? 'hidden' : '';
      $('.pp-pe [data-pp="prox"]').hidden = i === slides.length - 1;
      $('.pp-pular').hidden = !rever && i < MINIMIZA_DESDE;
      slides[i].scrollTop = 0;
      const nomeAgora = slides[i].dataset.slide;
      app.mostrarLateral?.(nomeAgora === 'pronto', false);   // no fim, o avatar escolhido volta para a barra lateral
      if (['ia', 'rede', 'pronto'].includes(nomeAgora)) a?.testar?.('happy');
      if (focar) (slides[i].querySelector('button, select, input') || $('.pp-pe [data-pp="prox"]')).focus({ preventScroll: true });
      const t = TOUR.find(x => x.id === nomeAgora);
      if (t) rodarTour(t);
      else if (nomeAgora === 'avatar') entrarNoAvatar();
      else if (nomeAgora === 'agente') apontar('[data-iap-provedores] button, .pp-agente button');
      else if (nomeAgora === 'ilha') apontar('[data-pp-grupo]');
      else if (nomeAgora === 'voz') apontar('[data-vz-baixar]');
      // antes do avatar e no fim, atrás só o oceano
      if ((i < indice('avatar') || nomeAgora === 'pronto') && app.url() !== 'oceano://nova-aba') app.navegar('oceano://nova-aba');
    }
    const irPara = nomeSlide => ir(indice(nomeSlide));

    const tirar = [];
    // a saudação só roda enquanto está na tela
    let mostrarSaudacao = null, pararSaudacao = null;
    animarSaudacao = ligar => {
      if (ligar && !pararSaudacao) { const f = farolDaNoite($('.pp-ola-fundo')), e = escreverSaudacoes($('.pp-ola-escrita')); mostrarSaudacao = e.mostrar; pararSaudacao = () => { f(); e(); mostrarSaudacao = null; }; }
      else if (!ligar && pararSaudacao) { pararSaudacao(); pararSaudacao = null; }
    };
    animarSaudacao(i === 0);
    tirar.push(() => animarSaudacao(false));
    const pintarHora = () => { $('[data-pp-hora]').textContent = app.textoHora?.(app.mar?.hora?.() ?? 0) ?? ''; };
    pintarHora();
    const relogio = setInterval(pintarHora, 15000);
    tirar.push(() => clearInterval(relogio));
    if (a?.espelhar) for (const c of el.querySelectorAll('.pp-avatar')) tirar.push(a.espelhar(c));
    // o farol e o mar do primeiro slide são os mesmos da página: cada quadro é copiado para cá
    const telaMar = $('.pp-mar');
    if (app.mar?.espelhos) {
      const medir = () => { telaMar.width = app.mar.canvas.width; telaMar.height = app.mar.canvas.height; };
      medir(); app.mar.espelhos.add(telaMar); addEventListener('resize', medir);
      tirar.push(() => { app.mar.espelhos.delete(telaMar); removeEventListener('resize', medir); });
    }

    if (app.real) {
      ia.montar($('.pp-agente'), null, app, { linkParaCopiar: true });
      tirar.push(app.on('ia-mudou', () => irPara('rede')));
    }

    if (a?.opcoesDeVoz) {
      tirar.push(montarVozSistema($('[data-pp-sistema]'), a, app, { titulo: false }), montarVozNeural($('[data-pp-neural]'), a, app));
      $('[data-pp-falar]').checked = !!a.voz();
      $('[data-pp-falar]').onchange = e => a.definirVoz(e.target.checked);
    }

    // grupos e especialistas de verdade: um toque cria, outro toque tira
    function pintarIlha() {
      const grupos = listarGrupos(app), meus = grupos.find(g => g.nome === GRUPO_ESPECIALISTAS)?.agentes || [];
      for (const b of el.querySelectorAll('[data-pp-grupo]')) b.setAttribute('aria-pressed', grupos.some(g => g.nome === b.dataset.ppGrupo));
      for (const b of el.querySelectorAll('[data-pp-esp]')) b.setAttribute('aria-pressed', meus.some(x => x.nome === b.dataset.ppEsp));
    }
    function trocarEspecialista(n) {
      const g = listarGrupos(app).find(x => x.nome === GRUPO_ESPECIALISTAS), atual = g?.agentes?.find(x => x.nome === n);
      if (atual) { apagarEspecialista(app, g.id, atual.id); apagarGrupoVazio(app, GRUPO_ESPECIALISTAS); }
      else criarEspecialista(app, { grupo: GRUPO_ESPECIALISTAS, nome: n, foco: ESPECIALISTAS.find(([x]) => x === n)[1] });
    }
    pintarIlha();
    tirar.push(app.on('ilha-grupos', pintarIlha));

    let saindo = false;
    function sair() {
      paradaDoCursor();
      sairDoAvatar();
      if (!revelou) a?.definirPersonagem?.(antes);
      app.aplicarTemaObj?.(app.temas[guardado.ler('tema', 'oceano')] || app.temas.oceano);
      app.definirHoraCena?.(app.horaCena(), false);
      app.ceuLimpo = false; app.clima?.aplicar();
      app.mostrarLateral?.(guardado.ler('lateral', innerWidth > 640), false);
      tirar.forEach(f => f?.());
      el.removeEventListener('keydown', tecla);
      el.remove();
      aberto = null;
      voltarFoco?.focus?.();
    }
    const voltarParaMesa = () => { if (app.url() !== 'oceano://nova-aba') app.navegar('oceano://nova-aba'); };
    // minimizar guarda onde parou: a tela encolhe para baixo e fica a pílula no canto
    async function minimizar() {
      if (saindo || (!rever && i < MINIMIZA_DESDE)) return;
      saindo = true;
      paradaDoCursor();
      if (rever) { await dissolver(el); sair(); return; }
      await encolher(el, false);
      sair();
      pintarPilula();
    }
    async function concluir() {
      if (saindo) return;
      if (!rever) {
        const falta = faltando();
        if (falta.length) { $('.pp-falta').textContent = `Ainda falta: ${falta.map(n => ETAPAS[n][0]).join(', ')}.`; return; }
      }
      saindo = true;
      paradaDoCursor();
      voltarParaMesa();
      if (!rever) salvarEstado({ concluido: true, pos: 0 });
      await dissolver(el);
      sair();
      pilula.hidden = true;
      if (!rever) app.aviso?.('Concluído! Para ver estes passos de novo, vá em Sobre a Navegadora.', 'Primeiros passos');
    }

    // trocar o idioma: a palavra dele é riscada na hora, e o resto da tela já muda junto
    el.querySelector('[data-pp-select-idioma]').addEventListener('change', e => { app.idioma?.definir(e.target.value); mostrarSaudacao?.(e.target.value); });
    el.addEventListener('click', e => {
      const grupo = e.target.closest('[data-pp-grupo]')?.dataset.ppGrupo;
      if (grupo) {
        if (!listarGrupos(app).some(g => g.nome === grupo)) criarGrupo(app, grupo);
        else if (!apagarGrupoVazio(app, grupo)) app.aviso?.('Esse grupo já tem especialistas: tire pela ilha.', 'Ilha');
        return;
      }
      const esp = e.target.closest('[data-pp-esp]')?.dataset.ppEsp;
      if (esp) return trocarEspecialista(esp);
      // seguir sem IA: as telas da orquestração contam como vistas, e ela segue para o que funciona sem IA
      if (e.target.closest('[data-pp-sem-ia]')) { for (const nomeSlide of ['agente', 'rede']) { const k = indice(nomeSlide); if (!vistos.includes(k)) vistos.push(k); } return irPara('ilha'); }
      const nomeSlide = e.target.closest('[data-pp-ir-nome]')?.dataset.ppIrNome;
      if (nomeSlide) return irPara(nomeSlide);
      const etapa = e.target.closest('[data-pp-etapa]');
      if (etapa) return ir(slidesDaEtapa[+etapa.dataset.ppEtapa][0]);
      if (e.target.closest('[data-pp-rever-demo]')) { const t = TOUR.find(x => x.id === slides[i].dataset.slide); return t && rodarTour(t); }
      const acao = e.target.closest('[data-pp]')?.dataset.pp;
      if (acao === 'minimizar') minimizar();
      else if (acao === 'concluir') concluir();
      else if (acao === 'ant') ir(i - 1);
      else if (acao === 'prox') ir(i + 1);
      else if (acao === 'revelar' || acao === 'gato') {
        escolha = acao === 'gato' ? 'gato' : 'cara';
        if (!rever) salvarEstado({ escolha });
        pintarEscolha();
        conversa?.reagir(escolha);
      }
    });
    function tecla(e) {
      if (e.key === 'Escape') { e.stopPropagation(); return minimizar(); }
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'ArrowRight') ir(i + 1);
      else if (e.key === 'ArrowLeft') ir(i - 1);
    }
    el.addEventListener('keydown', tecla);
    const voltar = voltando;
    if (voltar) { trilho.style.transition = 'none'; }
    ir(i, !voltar);
    if (voltar) { requestAnimationFrame(() => { trilho.style.transition = ''; }); await encolher(el, true); }
  }

  app.primeirosPassos = abrir;
  // o botão da página Sobre a Navegadora: só para rever, não mexe no que já foi concluído
  document.addEventListener('click', e => { if (e.target.closest('[data-primeiros-passos]')) abrir({ rever: true }); });
  const st = estado();
  if (st.concluido) return;
  if (!guardado.ler(ESTADO, null)) setTimeout(abrir, 700);   // primeira vez de todas
  else pintarPilula();
}
