// Site de lançamento do Oceano. Limpo como uma apresentação de produto: GSAP cuida do scroll e o three.js do mar em pixel e da borda em trama entre as telas.
import { IDIOMAS, MAIS_TEXTOS } from './textos.js';
import * as THREE from './vendor/three.module.min.js';
import { openAvatar, createMeshAvatar } from './vendor/mesh-avatar/mesh-avatar.js';
import { criarPixelizador } from './vendor/avatar-pixel.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
const REPO = 'hericdk/oceano';
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const PALETA = ['#070b1f', '#0e1a3d', '#16306b', '#1f4f9e', '#2f7fd1', '#5bb6f0', '#a6e3ff', '#f4fbff', '#f3d49b', '#c98f5a', '#ff6f59', '#ffd166', '#3a2b52', '#8a5c9e', '#2e8b74', '#7fd6a8'];

// ---------- textos ----------
const T = {
  pt: {
    c_ola: "Oi! Eu sou a Cara, a sua navegadora. A primeira de um navegador com agentes de IA integrados desde o início. E adivinha só: o primeiro vibecodado também 😉", c_baixar: "Baixar o GIF",
    baseado: 'Baseado em:',
    titulo: 'Oceano · o navegador feito para quem cria', pular: 'Ir para o conteúdo', idioma: 'Idioma', pausar: 'Pausar o movimento', continuar: 'Continuar o movimento',
    menu: 'Menu', baixar: 'Baixar', m_ia: 'A Navegadora', m_baixar: 'Baixar o Oceano', gato: 'Gato',
    h_titulo: 'O primeiro navegador em vibecode.',
    h_sub: 'E um canivete de ferramentas gratuitas, completo para animadores, músicos, influencers, devs, gamers, ou só para quem quer um navegador novo e bem otimizado.',
    ee: 'vem com um orquestrador de agentes de IA direto no navegador!!!',
    b_titulo: 'De graça. Pode baixar.', mac: 'macOS', mac_s: 'Apple Silicon (M1 ou mais novo)', b_codigo: 'Todo o código',
    g_criar: 'Para criar', g_musica: 'Para fazer música', g_jogar: 'Para jogar', g_ia: 'Sua IA, de verdade', g_jeito: 'Do seu jeito', g_calma: 'Sem distração, sem segredo',
    f_ferr_t: 'Ferramentas', f_ferr: 'Baixe, corte e converta vídeo, áudio e imagem. Tudo roda no seu computador.',
    f_ret_t: 'RetoqueShop 1.0', f_ret: 'Edite imagens com camadas, máscaras e seleções.',
    f_ani_t: 'Animação', f_ani: 'Anime como no Flash e exporte em GIF, vídeo ou HTML5.',
    f_tri_t: 'Trilha', f_tri: 'Uma viagem musical sem fim, feita por IA, para inspirar você a criar suas músicas enquanto navega, ou só relaxar.',
    f_cds_t: 'CDs', f_cds: 'Sua música em formato de CD, em loop, em qualquer página.',
    f_sta_t: 'Stave', f_sta: 'Programe música ao vivo, escrevendo código.',
    f_sam_t: '½ sampler', f_sam: 'Pads, fatias, efeitos e faixas para tocar com o que você tiver.',
    f_pic_t: 'PICO-8', f_pic: 'Jogue e aprenda como os jogos em pixel são feitos.',
    f_jog_t: 'Modo jogo', f_jog: 'Na hora de jogar, o navegador abre espaço e mostra o que está gastando.',
    f_sur_t: 'Sem internet?', f_sur: 'Na página de erro, tem surfe.',
    f_robo_t: 'Robôs', f_robo: 'Monte e teste robôs num simulador 3D, com física e motores.',
    f_nav_t: 'A Navegadora', f_nav: 'Conecte a sua IA. Ela conversa, planeja e usa as ferramentas com você.',
    f_ilh_t: 'A ilha', f_ilh: 'Cada assunto vira uma vila, com os especialistas que trabalham para você.',
    f_ava_t: 'O seu avatar', f_ava: 'Comece pela Cara ou pelo gato, e crie o seu em pixel, malha ou 3D.',
    f_tem_t: 'Temas', f_tem: 'Troque cada cor e veja o resultado na hora.',
    f_mod_t: 'Mods', f_mod: 'Mude o navegador com poucas linhas. Mods não tocam em arquivos nem senhas.',
    f_mes_t: 'A mesa', f_mes: 'Sua página inicial é uma mesa de janelas sobre o mar, no horário de agora.',
    f_lei_t: 'Leitura', f_lei: 'Guarde textos para ler depois, sem nada em volta.',
    f_red_t: 'Rede', f_red: 'Veja cada conexão que o navegador faz. A contagem anônima de uso só acontece se você autorizar.',
    f_titulo: 'Oceano.', f_sub: 'Feito para quem cria. E de graça.',
  },
  en: {
    c_ola: "Hi! I'm Cara, your navigator. The first one in a browser with AI agents built in from the very start. And guess what: the first vibe-coded one, too 😉", c_baixar: "Download the GIF",
    baseado: 'Based on:',
    titulo: 'Oceano · the browser made for people who create', pular: 'Skip to content', idioma: 'Language', pausar: 'Pause motion', continuar: 'Resume motion',
    menu: 'Menu', baixar: 'Download', m_ia: 'The Navigator', m_baixar: 'Download Oceano', gato: 'Cat',
    h_titulo: 'The first browser built with vibe coding.',
    h_sub: 'And a free Swiss Army knife of tools for animators, musicians, influencers, devs, gamers, or anyone who just wants a new, well-optimized browser.',
    ee: 'it comes with an AI agent orchestrator right in the browser!!!',
    b_titulo: 'It’s free. Go get it.', mac: 'macOS', mac_s: 'Apple Silicon (M1 or newer)', b_codigo: 'All the code',
    g_criar: 'To create', g_musica: 'To make music', g_jogar: 'To play', g_ia: 'Your AI, for real', g_jeito: 'Your way', g_calma: 'No noise, no secrets',
    f_ferr_t: 'Tools', f_ferr: 'Download, cut and convert video, audio and images. It all runs on your computer.',
    f_ret_t: 'RetoqueShop 1.0', f_ret: 'Edit images with layers, masks and selections.',
    f_ani_t: 'Animation', f_ani: 'Animate like in Flash and export as GIF, video or HTML5.',
    f_tri_t: 'Trilha', f_tri: 'An endless musical voyage made by AI, to inspire you to make your own music while you browse, or just relax.',
    f_cds_t: 'CDs', f_cds: 'Your music as a CD, on a loop, on any page.',
    f_sta_t: 'Stave', f_sta: 'Program live music by writing code.',
    f_sam_t: '½ sampler', f_sam: 'Pads, slices, effects and tracks to play with whatever you have.',
    f_pic_t: 'PICO-8', f_pic: 'Play and learn how pixel games are made.',
    f_jog_t: 'Game mode', f_jog: 'When it’s time to play, the browser makes room and shows what it’s using.',
    f_sur_t: 'No internet?', f_sur: 'The error page has surfing.',
    f_robo_t: 'Robots', f_robo: 'Build and test robots in a 3D simulator, with physics and motors.',
    f_nav_t: 'The Navigator', f_nav: 'Connect your AI. She talks, plans and uses the tools with you.',
    f_ilh_t: 'The island', f_ilh: 'Each topic becomes a village, with the specialists who work for you.',
    f_ava_t: 'Your avatar', f_ava: 'Start with Cara or the cat, then make your own in pixel, mesh or 3D.',
    f_tem_t: 'Themes', f_tem: 'Change each color and see the result right away.',
    f_mod_t: 'Mods', f_mod: 'Change the browser with a few lines. Mods never touch files or passwords.',
    f_mes_t: 'The desk', f_mes: 'Your home page is a desk of windows over the sea, at the time it is right now.',
    f_lei_t: 'Reading', f_lei: 'Save texts for later and read them with nothing around.',
    f_red_t: 'Network', f_red: 'See every connection the browser makes. Anonymous usage counting only happens if you allow it.',
    f_titulo: 'Oceano.', f_sub: 'Made for people who create. And free.',
  },
};
Object.assign(T, MAIS_TEXTOS);
const salva = (() => { try { return localStorage.getItem('oceano-site-lingua'); } catch { return null; } })();
let lingua = new URLSearchParams(location.search).get('lang') || salva || navigator.language.slice(0, 2);
if (!T[lingua]) lingua = 'en';

// ---------- as funcionalidades: quem é parecido fica no mesmo carrossel, e o carrossel enche a tela ----------
const GRUPOS = [
  { id: 'criar', nome: 'g_criar', cor: 'preta', itens: [['ferramentas', 'f_ferr'], ['retoque', 'f_ret', 'GIMP'], ['animacao', 'f_ani']] },
  { id: 'musica', nome: 'g_musica', cor: 'branca', itens: [['trilha', 'f_tri'], ['cds', 'f_cds'], ['stave', 'f_sta', 'Mrityunjay Bhardwaj'], ['sampler', 'f_sam']] },
  { id: 'jogar', nome: 'g_jogar', cor: 'preta', itens: [['pico8', 'f_pic', 'Lexaloffle'], ['jogo', 'f_jog'], ['surfista', 'f_sur']] },
  { id: 'robos', nome: null, cor: 'branca', itens: [['robo', 'f_robo']] },
  { id: 'ia', nome: 'g_ia', cor: 'preta', itens: [['navegadora', 'f_nav'], ['ilha', 'f_ilh'], ['avatar', 'f_ava']] },
  { id: 'jeito', nome: 'g_jeito', cor: 'branca', itens: [['temas', 'f_tem'], ['mods', 'f_mod'], ['mesa', 'f_mes']] },
  { id: 'calma', nome: 'g_calma', cor: 'preta', itens: [['leitura', 'f_lei'], ['rede', 'f_red']] },
];
const painel = (g, [video, k, base]) => `<article class="painel ${g.cor}">
    ${g.nome ? `<span class="rotulo" data-t="${g.nome}"></span>` : ''}
    <h3 data-t="${k}_t"></h3>
    <p data-t="${k}"></p>
    ${base ? `<p class="base"><span data-t="baseado"></span> ${base}</p>` : ''}
    <div class="quadro"><video data-clipe="${video}" aria-hidden="true" muted loop playsinline preload="none"></video></div>
  </article>`;
$('#funcoes').innerHTML = GRUPOS.map(g => g.itens.length > 1
  ? `<section class="grupo carrossel ${g.cor}" id="${g.id}" data-fundo="${g.cor === 'branca' ? '#ffffff' : '#000000'}"><div class="trilho">${g.itens.map(i => painel(g, i)).join('')}</div><div class="pontos" aria-hidden="true">${g.itens.map(() => '<i></i>').join('')}</div></section>`
  : `<section class="grupo unico ${g.cor}" id="${g.id}" data-fundo="${g.cor === 'branca' ? '#ffffff' : '#000000'}">${painel(g, g.itens[0])}</section>`).join('');

// cada idioma tem as gravações do navegador nesse idioma
const pastaDosClipes = () => (lingua === 'pt' ? 'media' : `media/${lingua}`);
function pintarTextos() {
  document.documentElement.lang = lingua === 'pt' ? 'pt-BR' : lingua;
  document.title = T[lingua].titulo;
  for (const el of $$('[data-t]')) el.textContent = T[lingua][el.dataset.t] ?? T.en[el.dataset.t] ?? '';
  for (const el of $$('[data-t-label]')) el.setAttribute('aria-label', T[lingua][el.dataset.tLabel] ?? T.en[el.dataset.tLabel]);
  for (const b of $$('[data-lingua]')) b.setAttribute('aria-pressed', b.dataset.lingua === lingua);
  for (const v of $$('video[data-clipe]')) {
    const novo = `${pastaDosClipes()}/${v.dataset.clipe}`;
    if (v.dataset.fonte === novo) continue;
    const tocando = !v.paused; v.dataset.fonte = novo; v.poster = novo + '.jpg'; v.src = novo + '.mp4';
    if (tocando) v.play().catch(() => {});
  }
}
const linguas = $('#linguas');
linguas.innerHTML = IDIOMAS.map(([id, nome]) => `<button type="button" lang="${id}" data-lingua="${id}" aria-label="${nome}" title="${nome}">${id.toUpperCase()}</button>`).join('');
pintarTextos();
linguas.addEventListener('click', e => { const b = e.target.closest('[data-lingua]'); if (!b) return; lingua = b.dataset.lingua; try { localStorage.setItem('oceano-site-lingua', lingua); } catch {} pintarTextos(); ScrollTrigger.refresh(); });
// ao rolar para baixo fica só o idioma ativo; ao abrir a página e ao rolar para cima, todos
let ultimoScroll = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  if (y < 8) linguas.classList.remove('so-ativo');
  else if (Math.abs(y - ultimoScroll) > 6) linguas.classList.toggle('so-ativo', y > ultimoScroll);
  if (Math.abs(y - ultimoScroll) > 6 || y < 8) ultimoScroll = y;
}, { passive: true });

// ---------- GitHub: estrelas e os arquivos de download (sem release, leva para a página de versões) ----------
const VERSOES = `https://github.com/${REPO}/releases/latest`;
for (const a of $$('[data-baixar]')) { a.href = VERSOES; a.target = '_blank'; a.rel = 'noopener'; }
fetch(`https://api.github.com/repos/${REPO}`).then(r => r.ok ? r.json() : null).then(j => { if (typeof j?.stargazers_count === 'number') { $('#num-estrelas').textContent = j.stargazers_count; $('#estrelas').hidden = false; } }).catch(() => {});
fetch(`https://api.github.com/repos/${REPO}/releases/latest`).then(r => r.ok ? r.json() : null).then(j => {
  const achar = re => j?.assets?.find(x => re.test(x.name))?.browser_download_url;
  const links = { mac: achar(/(arm64|apple|silicon).*\.dmg$|\.dmg$/i), win: achar(/\.(exe|msi)$/i), linux: achar(/\.(appimage|deb)$/i) };
  for (const a of $$('[data-baixar]')) if (links[a.dataset.baixar]) { a.href = links[a.dataset.baixar]; a.removeAttribute('target'); }
}).catch(() => {});

// ---------- menu e pílula: clicar fora fecha ----------
const menu = $('#menu'), abrirMenu = $('#abrir-menu'), lista = $('#pilula-lista'), pil = $('#pilula-btn');
const mostrarMenu = v => { menu.hidden = !v; abrirMenu.setAttribute('aria-expanded', v); document.body.classList.toggle('com-menu', v); };
const mostrarLista = v => { lista.hidden = !v; pil.setAttribute('aria-expanded', v); };
abrirMenu.onclick = e => { e.stopPropagation(); mostrarMenu(menu.hidden); if (!menu.hidden) menu.querySelector('a').focus(); };
pil.onclick = e => { e.stopPropagation(); mostrarLista(lista.hidden); };
addEventListener('click', e => { if (!e.target.closest('#menu')) mostrarMenu(false); if (!e.target.closest('#pilula')) mostrarLista(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!menu.hidden) abrirMenu.focus(); mostrarMenu(false); mostrarLista(false); } });
for (const a of $$('#menu a')) a.addEventListener('click', () => mostrarMenu(false));

// ---------- quem prefere sem movimento: nada toca sozinho, e o botão vale para todo mundo ----------
let parado = quieto;
try { const g = localStorage.getItem('oceano-site-parado'); if (g !== null) parado = g === '1'; } catch {}
const botaoPausa = $('#pausar');
function pintarPausa() {
  botaoPausa.setAttribute('aria-pressed', parado);
  botaoPausa.dataset.tLabel = parado ? 'continuar' : 'pausar';
  botaoPausa.setAttribute('aria-label', T[lingua][botaoPausa.dataset.tLabel]); botaoPausa.title = T[lingua][botaoPausa.dataset.tLabel];
  for (const v of $$('video')) { if (parado) v.pause(); else if (v.dataset.visivel) v.play().catch(() => {}); }
  document.body.classList.toggle('parado', parado);
  $('#cara-gif').src = parado ? 'marca/cara-parada.png' : 'marca/cara.gif';
  if (gsap?.globalTimeline) gsap.globalTimeline.timeScale(parado ? 1000 : 1);
}
botaoPausa.onclick = () => { parado = !parado; try { localStorage.setItem('oceano-site-parado', parado ? '1' : '0'); } catch {} pintarPausa(); };

// ---------- os vídeos só tocam na tela ----------
const olho = new IntersectionObserver(es => { for (const e of es) { if (e.isIntersecting) { e.target.dataset.visivel = '1'; if (e.target.preload === 'none') e.target.preload = 'auto'; if (!parado) e.target.play().catch(() => {}); } else { delete e.target.dataset.visivel; e.target.pause(); } } }, { threshold: 0.25 });
for (const v of $$('video')) olho.observe(v);
pintarPausa();

// ---------- o mar em pixel, atrás da abertura ----------
const COR = h => new THREE.Color(h);
function iniciarMar() {
  const r = new THREE.WebGLRenderer({ canvas: $('#mar'), antialias: false, powerPreference: 'low-power' });
  r.setPixelRatio(1);
  const cena = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const u = { t: { value: 0 }, res: { value: new THREE.Vector2() }, p: { value: 0 }, c0: { value: COR('#070b1f') }, c1: { value: COR('#16306b') }, c2: { value: COR('#2f7fd1') }, c3: { value: COR('#a6e3ff') }, sol: { value: COR('#ffd166') } };
  cena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: u, depthTest: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform float t, p; uniform vec2 res; uniform vec3 c0, c1, c2, c3, sol;
      float bayer(vec2 v){ vec2 q = floor(mod(v, 4.)); int x = int(q.x), y = int(q.y); int m[16]; m[0]=0;m[1]=8;m[2]=2;m[3]=10;m[4]=12;m[5]=4;m[6]=14;m[7]=6;m[8]=3;m[9]=11;m[10]=1;m[11]=9;m[12]=15;m[13]=7;m[14]=13;m[15]=5; return (float(m[y*4+x]) + .5) / 16.; }
      float onda(vec2 c){ return sin(c.x*.9 + t*.7 + sin(c.y*1.7 + t*.3)*2.) * .5 + sin(c.x*2.3 - t*.5 + c.y*3.1)*.3 + sin(c.x*5.1 + c.y*7.3 + t*.9)*.2; }
      void main(){
        vec2 px = gl_FragCoord.xy, uv = px / res; float asp = res.x / res.y;
        float hz = .46 + p * .3;      // ao rolar, o horizonte sobe
        float l;
        if (uv.y > hz) {
          float y = (uv.y - hz) / (1. - hz);
          l = mix(.34, .04, pow(y, .55));
          vec2 s = vec2(.74 * asp, hz + .2); float d = length(vec2(uv.x * asp, uv.y) - s);
          l += smoothstep(.34, .0, d) * .34;
          if (d < .062) { gl_FragColor = vec4(sol, 1.); return; }
        } else {
          float z = (hz - uv.y) / hz; float prof = .6 / (z + .06);
          vec2 c = vec2((uv.x - .5) * asp * prof * 2.4, prof * 2.2);
          float o = onda(c);
          l = mix(.3, .1, smoothstep(0., .9, z)) + o * mix(.09, .23, z);
          float reflexo = smoothstep(.17, .0, abs(uv.x - .74) * asp * (1. + z)) * smoothstep(.0, .5, o + .3);
          l += reflexo * .55;
        }
        l += (bayer(px) - .5) * .17;
        vec3 cor = l < .16 ? c0 : l < .34 ? c1 : l < .58 ? c2 : c3;
        if (l > .82) cor = sol;
        gl_FragColor = vec4(cor, 1.);
      }` })));
  const PIXEL = 4;
  const medir = () => { const w = Math.ceil(innerWidth / PIXEL), h = Math.ceil(innerHeight / PIXEL); r.setSize(w, h, false); u.res.value.set(w, h); };
  medir(); addEventListener('resize', medir);
  return { u, desenhar: t => { u.t.value = t; r.render(cena, cam); } };
}

// ---------- a borda em trama: a tela seguinte chega desfazendo a beirada em pixels ----------
function iniciarBorda() {
  const r = new THREE.WebGLRenderer({ canvas: $('#borda'), alpha: true, antialias: false, premultipliedAlpha: false });
  r.setPixelRatio(1); r.setClearColor(0, 0);
  const cena = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const u = { res: { value: new THREE.Vector2() }, y: { value: -1 }, faixa: { value: 120 }, cor: { value: COR('#000') } };
  cena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthTest: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform vec2 res; uniform float y, faixa; uniform vec3 cor;
      float bayer(vec2 v){ vec2 q = floor(mod(v, 4.)); int x = int(q.x), yy = int(q.y); int m[16]; m[0]=0;m[1]=8;m[2]=2;m[3]=10;m[4]=12;m[5]=4;m[6]=14;m[7]=6;m[8]=3;m[9]=11;m[10]=1;m[11]=9;m[12]=15;m[13]=7;m[14]=13;m[15]=5; return (float(m[yy*4+x]) + .5) / 16.; }
      void main(){
        float acima = gl_FragCoord.y - y;   // y sobe para cima; y é a beirada da tela que chega
        float k = 1. - clamp(acima / faixa, 0., 1.);
        if (acima < 0. || bayer(gl_FragCoord.xy) >= k * k) discard;
        gl_FragColor = vec4(cor, 1.);
      }` })));
  const PIXEL = 6;
  const medir = () => { const w = Math.ceil(innerWidth / PIXEL), h = Math.ceil(innerHeight / PIXEL); r.setSize(w, h, false); u.res.value.set(w, h); u.faixa.value = h * 0.22; };
  medir(); addEventListener('resize', medir);
  const secoes = $$('[data-fundo]');
  const fazer = () => {
    const alvo = secoes.find(s => { const t = s.getBoundingClientRect().top; return t > 0 && t < innerHeight && s.dataset.fundo !== 'transparente'; });
    if (!alvo) { r.clear(); return; }
    u.cor.value.set(alvo.dataset.fundo);
    u.y.value = (innerHeight - alvo.getBoundingClientRect().top) / PIXEL;
    r.render(cena, cam);
  };
  return fazer;
}

// ---------- Cara e gato, cada um com a sua animação ----------
async function iniciarRostos() {
  const pix = criarPixelizador(); pix.definirPaleta(PALETA);
  const cara = $('#cara'), gato = $('#gato'), ctxC = cara.getContext('2d', { willReadFrequently: true }), ctxG = gato.getContext('2d', { willReadFrequently: true });
  const oculta = document.createElement('canvas'); oculta.setAttribute('aria-hidden', 'true'); oculta.style.cssText = 'position:fixed;left:-9999px;width:120px;height:120px'; document.body.append(oculta);
  const pkg = await openAvatar('avatares/cara/'), rig = structuredClone(pkg.rig);
  if (rig.mesh) { rig.mesh.baseCell = Math.round(rig.mesh.baseCell * 4); if (rig.mesh.fine) rig.mesh.fine = { ...rig.mesh.fine, cell: Math.round(rig.mesh.fine.cell * 4) }; }
  const av = await createMeshAvatar(oculta, { rig, assets: pkg.assets, manual: true });
  av.setAutoIdle(true);
  const sprite = await (await fetch('avatares/gato/sprite.json')).json(), img = new Image(); img.src = 'avatares/gato/' + sprite.folha; await img.decode();
  const [w, h] = sprite.quadro; const lado = Math.max(w, h); gato.width = gato.height = lado;
  let visivel = false; new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(cara);
  let q = 0, ult = 0, gest = 0;
  const EMO = ['happy', 'smile', 'wink', 'surprised'];
  const quadro = agora => {
    requestAnimationFrame(quadro);
    if (!visivel || parado || agora - ult < 66) return;
    ult = agora; q++;
    av.advance(1 / 15, 30);
    ctxC.imageSmoothingEnabled = false; ctxC.clearRect(0, 0, 120, 120); ctxC.drawImage(oculta, 0, 0, 120, 120); pix.aplicar(ctxC, 120, 120);
    const estado = Math.floor(agora / 3500) % 2 ? sprite.estados.falando : sprite.estados.feliz, [cx, cy] = estado[Math.floor(q / 2.5) % estado.length];
    ctxG.imageSmoothingEnabled = false; ctxG.clearRect(0, 0, lado, lado); ctxG.drawImage(img, cx * w, cy * h, w, h, (lado - w) / 2, (lado - h) / 2, w, h); pix.aplicar(ctxG, lado, lado);
    if (agora - gest > 3800) { gest = agora; av.setEmotion?.(EMO[Math.floor(agora / 3800) % EMO.length], { playMotion: true }); }
  };
  requestAnimationFrame(quadro);
}
iniciarRostos().catch(e => console.warn('rostos', e));

// ---------- o scroll ----------
let mar = null, borda = null;
try { mar = iniciarMar(); borda = iniciarBorda(); } catch (e) { console.warn('WebGL', e); $('#mar').style.background = '#16306b'; }
const heroi = $('#inicio');
if (mar) {
  const p = { v: 0 };
  ScrollTrigger.create({ trigger: heroi, start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => { p.v = s.progress; } });
  gsap.ticker.add(t => { mar.u.p.value = p.v; const vis = heroi.getBoundingClientRect().bottom > 0 || $('#volta').getBoundingClientRect().top < innerHeight; if ((vis && !parado) || !quieto && t < 1) mar.desenhar(quieto ? 3 : t); borda?.(); });
}
if (!quieto) {
  gsap.from('#inicio h1', { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out' });
  gsap.from('#inicio p', { y: 40, opacity: 0, duration: 1.4, delay: .15, ease: 'expo.out' });
  gsap.to('#inicio .heroi-texto', { y: -160, ease: 'none', scrollTrigger: { trigger: heroi, start: 'top top', end: 'bottom top', scrub: true } });

  // a tela sólida: as palavras sobem conforme o scroll
  gsap.from('.solida .gigante', { yPercent: 40, opacity: 0, stagger: .25, ease: 'expo.out', scrollTrigger: { trigger: '.solida', start: 'top 80%', end: 'top 10%', scrub: 1 } });
  gsap.from('.rostos figure:first-child', { xPercent: -30, opacity: 0, ease: 'expo.out', scrollTrigger: { trigger: '.dupla', start: 'top 70%', end: 'top 5%', scrub: 1 } });
  gsap.from('.rostos figure:last-child', { xPercent: 30, opacity: 0, ease: 'expo.out', scrollTrigger: { trigger: '.dupla', start: 'top 70%', end: 'top 5%', scrub: 1 } });
  gsap.from('.baixar h2, .botao', { y: 50, opacity: 0, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.baixar', start: 'top 70%', end: 'top 15%', scrub: 1 } });
  gsap.from('.fecho h2', { scale: .7, opacity: 0, ease: 'expo.out', scrollTrigger: { trigger: '.fecho', start: 'top 80%', end: 'top 20%', scrub: 1 } });

  // uma tela só: o vídeo cresce até o tamanho certo
  for (const s of $$('.unico')) {
    gsap.from(s.querySelector('.quadro'), { scale: .7, y: 80, ease: 'none', scrollTrigger: { trigger: s, start: 'top 85%', end: 'top 5%', scrub: 1 } });
    gsap.from(s.querySelectorAll('.rotulo, h3, p'), { y: 40, opacity: 0, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 75%', end: 'top 25%', scrub: 1 } });
  }
}
// carrossel: fica preso na tela e anda para o lado com o scroll, parando em cada item
for (const s of $$('.carrossel')) {
  const trilho = s.querySelector('.trilho'), paineis = [...trilho.children], pontos = [...s.querySelectorAll('.pontos i')];
  const n = paineis.length;
  pontos[0]?.classList.add('on');
  const marca = i => pontos.forEach((p, k) => p.classList.toggle('on', k === i));
  if (quieto) { s.style.overflowX = 'auto'; continue; }
  gsap.to(trilho, { x: () => -(n - 1) * innerWidth, ease: 'none', scrollTrigger: {
    trigger: s, pin: true, start: 'top top', end: () => '+=' + (n - 1) * innerHeight * 1.1, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
    snap: { snapTo: v => Math.round(v * (n - 1)) / (n - 1), inertia: false, duration: { min: .25, max: .6 }, ease: 'expo.out', delay: .08 },
    onUpdate: st => marca(Math.round(st.progress * (n - 1))),
  } });
  gsap.from(paineis[0].querySelector('.quadro'), { scale: .78, ease: 'none', scrollTrigger: { trigger: s, start: 'top 90%', end: 'top top', scrub: 1 } });
}

// ---------- ao chegar no fim, a página recomeça sem emenda ----------
const volta = $('#volta');
let voltaTopo = 0;
const medirVolta = () => { voltaTopo = volta.getBoundingClientRect().top + scrollY; };
ScrollTrigger.addEventListener('refresh', medirVolta); medirVolta();
addEventListener('scroll', () => {
  if (scrollY >= voltaTopo - 1 && voltaTopo > innerHeight) { scrollTo({ top: Math.max(0, scrollY - voltaTopo), behavior: 'instant' }); ScrollTrigger.update(); }
}, { passive: true });
addEventListener('load', () => ScrollTrigger.refresh());
window.oceanoSite = { voltaTopo: () => voltaTopo };
