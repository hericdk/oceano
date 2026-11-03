// A ilha do Oceano: rolando o mouse na página inicial, a câmera sai da altura do farol
// e sobe até mostrar a ilha inteira, gerada por semente. Cada grupo de assuntos vira uma vila; a vila do meio é
// a do orquestrador (o avatar). As nuvens são o processamento da IA: nuvens comuns e algumas de chuva o tempo todo,
// e uma tempestade em cima da vila enquanto a IA trabalha naquele assunto.

import { CORES_GRUPO, PAPEIS_ESPECIALISTA, criarEspecialista, apagarEspecialista } from '../especialistas.js';
import * as THREE from '../../vendor/three.module.min.js';
import { gerarMundo, TAM } from './mundo.js';
import { montarCena, climaDaHora } from './cena.js';
import { criarPos } from './pos.js';
import { PALETAS, ORDEM_PALETAS } from './paletas.js';
import { nuvensTinta } from './cena.js';
import { criarTempestades } from './tempestade.js';
import { clima } from './clima.js';
import { icone } from '../icones.js';

const expoOut = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A versão dos gráficos com que o Oceano abre. Os clássicos seguem como opção no painel da ilha.
export const GRAFICOS_PADRAO = 'novo';

export function criarIlha(app, guardado, raiz) {
  let graficos = guardado.ler('ilha-graficos', GRAFICOS_PADRAO);
  // ----- estado guardado: semente e grupos (começam vazios: a pessoa organiza da primeira vez) -----
  let semente = guardado.ler('ilha-semente', null) || Math.random().toString(36).slice(2, 7);
  guardado.gravar('ilha-semente', semente);
  let grupos = guardado.ler('ilha-grupos', []);
  const salvarGrupos = () => guardado.gravar('ilha-grupos', grupos);

  // ----- DOM: tela 3D, rótulos das vilas e o painel de grupos -----
  const casa = document.createElement('div');
  casa.className = 'ilha';
  casa.innerHTML = `
    <canvas class="ilha-tela"></canvas>
    <div class="ilha-rotulos"></div>
    <aside class="ilha-painel px" hidden>
      <header><b>Ilha</b><span class="ilha-acoes">
        <button class="jb jb-acao" data-ilha="lista" title="Ver os grupos em lista">lista</button>
        <button class="jb" data-ilha="min" title="Recolher" aria-label="Recolher as opções da ilha">${icone('menos')}</button></span></header>
      <div class="ilha-opcoes"><div class="ilha-opcoes-lista">
      <div class="ilha-estilo" role="group" aria-label="Estilo da ilha">
        ${[['ghibli', 'Studio G.'], ['pixel', 'Pixel'], ['tinta', 'Tinta']].map(([v, n]) => `<button class="chip" data-estilo="${v}">${n}</button>`).join('')}
        <select data-paleta aria-label="Paleta do Pixel">${ORDEM_PALETAS.map(id => `<option value="${id}">${esc(PALETAS[id].nome)}</option>`).join('')}</select>
      </div>
      <div class="ilha-estilo" role="radiogroup" aria-label="Gráficos e plantas">
        ${[['novo:pixel', 'plantas em pixel'], ['novo:3d', 'plantas 3D'], ['classico:3d', 'gráficos clássicos']].map(([v, n]) => `<button class="chip" role="radio" data-visual="${v}">${n}</button>`).join('')}
      </div>
      </div><button class="ilha-trocar" data-ilha="nova" title="Gerar uma nova ilha">${icone('recarregar')}<span>trocar ilha</span></button></div>
      <label class="ilha-tema"><input type="checkbox" data-seguir-tema> usar as cores do tema do navegador</label>
      <p class="ilha-sobre">Seu mundo: um pseudo sistema operacional que organiza seus assuntos como vilas numa ilha. As nuvens são a IA trabalhando.</p>
      <div class="ilha-lista" hidden></div>
      <form class="ilha-novo"><input name="nome" maxlength="28" placeholder="novo grupo (ex.: música, trabalho)" aria-label="Nome do novo grupo" autocomplete="off"><button class="btn mini">criar</button></form>
    </aside>`;
  raiz.prepend(casa);
  const tela = casa.querySelector('canvas'), rotulos = casa.querySelector('.ilha-rotulos'), painel = casa.querySelector('.ilha-painel'), lista = casa.querySelector('.ilha-lista');

  // ----- 3D: montado só na primeira vez que a pessoa rola (gerar a ilha custa alguns décimos de segundo) -----
  let renderer = null, cena, cam, pos, mundo, vivo, tempestades, pronto = false;
  function montar() {
    renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: false });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    cam = new THREE.PerspectiveCamera(35, 1, 0.5, 2400);
    cam.userData.alvo = new THREE.Vector3();
    pos = criarPos(renderer);
    construir();
    aplicarEstilo();
    pronto = true;
  }
  // estilo da ilha: Studio G (pintura, padrão), Pixel (com paletas de consoles) ou Tinta. Não segue o tema do
  // navegador, a não ser que a pessoa ligue "usar as cores do tema" (aí vira Pixel nas cores do tema).
  const MODOS_I = ['ghibli', 'pixel', 'tinta'];
  let estilo = { modo: 'ghibli', paleta: 'pico8', tema: false, ...guardado.ler('ilha-estilo', {}) };
  const ESTUDIO_G = { saturacao: 1.2, quente: 1, faixas: 0.15, kuwa: 1, contorno: 0.55, bloom: 0.8, aquarela: 1 };
  function aplicarEstilo() {
    guardado.gravar('ilha-estilo', estilo);
    for (const b of casa.querySelectorAll('[data-estilo]')) b.setAttribute('aria-pressed', b.dataset.estilo === estilo.modo && !estilo.tema);
    casa.querySelector('[data-paleta]').value = estilo.paleta;
    casa.querySelector('[data-paleta]').hidden = estilo.modo !== 'pixel' || estilo.tema;
    casa.querySelector('[data-seguir-tema]').checked = estilo.tema;
    if (!pos) return;
    const modo = estilo.tema ? 'pixel' : estilo.modo;
    const u = pos.material.uniforms;
    u.modo.value = MODOS_I.indexOf(modo);
    for (const [k, v] of Object.entries(ESTUDIO_G)) if (u[k]) u[k].value = v;
    if (estilo.tema) paletaDoTema(); else pos.paleta(estilo.paleta);
    nuvensTinta(modo === 'tinta');
    redimensionar();
  }
  function paletaDoTema() { pos.paletaCores(app.tema.paleta.map(h => parseInt(h.slice(1), 16))); }
  function construir() {
    vivo?.descartar(); tempestades?.descartar?.();
    cena = new THREE.Scene();
    cena.fog = new THREE.Fog(0xbcd3e6, 200, 900);
    mundo = gerarMundo({ semente, grupos: grupos.map(g => ({ id: g.id, nome: g.nome, agentes: g.agentes || [], cor: parseInt(g.cor.slice(1), 16) })), central: [], graficos });
    const central = mundo.vilas.find(v => v.central);
    if (central) central.nome = central.castelo ? `Castelo de ${app.assistente?.nome?.() || 'Cara'}` : app.assistente?.nome?.() || 'Orquestrador';
    vivo = montarCena(cena, mundo, { destaque: 0x0040ff, graficos });
    vivo.definirVegetacao?.(graficos === 'novo' ? guardado.ler('ilha-vegetacao', 'pixel') : '3d');
    tempestades = criarTempestades(cena, mundo.vilas);
    // a ilha usa a paleta de 16 cores do PICO-8 (natureza colorida); o mar da página inicial segue o tema
    criarRotulos();
    redimensionar();
  }

  // a câmera: p = 0 é a altura do farol, na costa, olhando para a ilha; p = 1 é a vista do alto
  const costa = () => { for (let a = 0; a < Math.PI * 2; a += 0.1) { const x = Math.sin(a) * TAM * 0.42, z = Math.cos(a) * TAM * 0.42; if (mundo.altura(x, z) < 0.5) return { x, z, a }; } return { x: 0, z: TAM * 0.42, a: 0 }; };
  // Depois da subida (p = 1), a câmera fica livre: órbita em volta de um alvo no chão.
  // Arrastar gira; botão direito (ou shift) move; a roda aproxima no ponto do mouse.
  let p = 0, pAlvo = 0, foco = null;
  const orbita = { alvo: new THREE.Vector3(), yaw: 0, pitch: 0.82, dist: 330 }, orbAlvo = { alvo: new THREE.Vector3(), yaw: 0, pitch: 0.82, dist: 330 };
  let iniciouOrbita = false;
  const poseOrbita = o => {
    const posO = new THREE.Vector3(o.alvo.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, o.alvo.y + Math.sin(o.pitch) * o.dist, o.alvo.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist);
    const chao = Math.max(0, mundo.altura(posO.x, posO.z)) + 4;   // nunca entra na montanha
    if (posO.y < chao) posO.y = chao;
    // nem deixa uma montanha entre ela e o foco: se o terreno passa da linha de visão, a câmera sobe
    for (let k = 1; k < 10; k++) {
      const t = k / 10, x = o.alvo.x + (posO.x - o.alvo.x) * t, z = o.alvo.z + (posO.z - o.alvo.z) * t;
      const linha = o.alvo.y + (posO.y - o.alvo.y) * t, terreno = mundo.altura(x, z) + 3;
      if (terreno > linha) posO.y += (terreno - linha) / t;
    }
    return posO;
  };
  function pose(dt) {
    const k = 1 - Math.exp(-dt * 4);           // easing exponencial: rápido no começo, macio no fim
    p += (pAlvo - p) * k;
    const c = costa();
    if (!iniciouOrbita) { orbAlvo.yaw = orbita.yaw = c.a; iniciouOrbita = true; }
    // a órbita persegue o alvo pedido (arrastar, roda, clique numa vila) com o mesmo easing
    orbita.alvo.lerp(orbAlvo.alvo, k); orbita.dist += (orbAlvo.dist - orbita.dist) * k;
    orbita.yaw += (orbAlvo.yaw - orbita.yaw) * Math.min(1, k * 2); orbita.pitch += (orbAlvo.pitch - orbita.pitch) * k;
    const altoPos = poseOrbita(orbita), e = expoOut(Math.min(1, p * 1.05));
    // subida: da altura do farol (na costa, olhando a ilha) até a órbita
    const baixo = new THREE.Vector3(c.x, 6, c.z);
    cam.position.copy(baixo.lerp(altoPos, e));
    cam.userData.alvo.copy(new THREE.Vector3(0, 4, 0).lerp(orbita.alvo, e));
    cam.lookAt(cam.userData.alvo);
    cam.updateMatrixWorld();
    return 30 + e * orbita.dist;
  }
  function irParaVila(v) {
    foco = v;
    orbAlvo.alvo.set(v.x, Math.max(0, mundo.altura(v.x, v.z)), v.z);
    orbAlvo.dist = 70; orbAlvo.pitch = 0.5;
  }
  // ponto do chão sob o mouse (plano na altura da água): a roda aproxima na direção dele
  const raio = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function chaoSob(e) {
    const r = tela.getBoundingClientRect();
    raio.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    const pt = new THREE.Vector3();
    return raio.ray.intersectPlane(plano, pt) ? pt : null;
  }

  function criarRotulos() {
    rotulos.innerHTML = mundo.vilas.map(v => `<button class="ilha-rotulo" data-vila="${esc(v.id)}" style="--c:${v.central ? 'var(--sol)' : esc(grupos.find(g => g.id === v.id)?.cor || '#fff')}">${esc(v.nome)}</button>`).join('');
  }
  const tmp = new THREE.Vector3();
  function moverRotulos() {
    const w = tela.clientWidth, h = tela.clientHeight;
    for (const el of rotulos.children) {
      const v = mundo.vilas.find(x => x.id === el.dataset.vila); if (!v) continue;
      tmp.set(v.x, (v.h || 0) + 12, v.z).project(cam);
      const ver = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && p > 0.45;
      el.hidden = !ver;
      if (ver) el.style.transform = `translate(${(tmp.x + 1) / 2 * w}px, ${(1 - tmp.y) / 2 * h}px) translate(-50%, -100%)`;
    }
  }

  function redimensionar() {
    if (!renderer) return;
    const w = casa.clientWidth || innerWidth, h = casa.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    pos.tamanho(w, h, (estilo.tema ? 'pixel' : estilo.modo) === 'pixel' ? 3 : 2);
  }
  addEventListener('resize', redimensionar);

  // ----- IA: nuvens e tempestades acompanham o processamento -----
  let processando = null;
  app.on('assistente-fala', ({ quem }) => {
    processando = quem === 'voce' ? (grupos.find(g => g.id === foco?.id)?.id || 'central') : null;
    tempestades?.definir(processando ? [{ grupo: processando, estado: 'trabalhando' }] : []);
    clima.auto = processando ? 0.55 : 0.12;
  });

  // o menos recolhe as opções, igual às janelas da mesa; os ícones da bandeja trocam de tela
  function marcarRecolhido() {
    const min = guardado.ler('ilha-painel-min', false), b = painel.querySelector('[data-ilha="min"]');
    painel.classList.toggle('recolhido', min);
    b.innerHTML = icone(min ? 'janela' : 'menos');
    b.title = min ? 'Abrir' : 'Recolher';
    b.setAttribute('aria-label', min ? 'Abrir as opções da ilha' : 'Recolher as opções da ilha');
  }
  marcarRecolhido();

  // ----- rolar: sobe e desce a câmera (só no fundo da mesa, não dentro das janelas) -----
  raiz.addEventListener('wheel', e => {
    if (e.target.closest('.janela, .discos, .mesa-bandeja, .ilha-painel, .busca, .mesa-menu')) return;
    e.preventDefault();
    if (!pronto) montar();
    if (pAlvo < 1) {   // ainda subindo do farol (para voltar: botão ou Esc)
      pAlvo = Math.max(0, Math.min(1, pAlvo + e.deltaY * 0.0016));
      return;
    }
    // no alto: a roda aproxima e afasta no ponto do mouse
    const fator = Math.exp(e.deltaY * 0.0015), alvoMouse = chaoSob(e);
    const novo = Math.max(36, Math.min(420, orbAlvo.dist * fator));
    if (alvoMouse && fator < 1) orbAlvo.alvo.lerp(new THREE.Vector3(alvoMouse.x, Math.max(0, mundo.altura(alvoMouse.x, alvoMouse.z)), alvoMouse.z), 1 - novo / orbAlvo.dist);
    orbAlvo.dist = novo;
    foco = null;
  }, { passive: false });
  // arrastar gira (esquerdo) ou move (direito ou shift)
  let arrasto = null;
  casa.addEventListener('contextmenu', e => { if (p > 0.6) e.preventDefault(); });
  casa.addEventListener('pointerdown', e => {
    if (p < 0.6 || e.target.closest('button, input, select, label, .ilha-painel')) return;
    arrasto = { x: e.clientX, y: e.clientY, mover: e.button === 2 || e.shiftKey, yaw: orbAlvo.yaw, pitch: orbAlvo.pitch, alvo: orbAlvo.alvo.clone() };
    casa.setPointerCapture(e.pointerId); casa.classList.add('arrastando');
  });
  casa.addEventListener('pointermove', e => {
    if (!arrasto) return;
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    if (arrasto.mover) {
      const esc = orbAlvo.dist / 700, s = Math.sin(orbAlvo.yaw), c = Math.cos(orbAlvo.yaw);
      orbAlvo.alvo.set(arrasto.alvo.x - (dx * c + dy * s) * esc, arrasto.alvo.y, arrasto.alvo.z - (-dx * s + dy * c) * esc);
      orbAlvo.alvo.x = Math.max(-TAM / 2, Math.min(TAM / 2, orbAlvo.alvo.x)); orbAlvo.alvo.z = Math.max(-TAM / 2, Math.min(TAM / 2, orbAlvo.alvo.z));
    } else {
      orbAlvo.yaw = arrasto.yaw - dx * 0.006;
      orbAlvo.pitch = Math.max(0.12, Math.min(1.45, arrasto.pitch + dy * 0.004));
    }
    foco = null;
  });
  const soltar = () => { arrasto = null; casa.classList.remove('arrastando'); };
  casa.addEventListener('pointerup', soltar); casa.addEventListener('pointercancel', soltar);
  addEventListener('keydown', e => { if (e.key === 'Escape' && p > 0.05 && raiz.isConnected && !e.target.closest?.('input, textarea')) { foco = null; pAlvo = 0; } });

  // ----- painel: lista, criar, renomear, cor, apagar, nova ilha -----
  function desenharLista() {
    lista.innerHTML = grupos.length ? grupos.map(g => `<div class="ilha-item" data-g="${esc(g.id)}">
        <button class="jan-cor" style="--c:${esc(g.cor)}" data-acao="cor" title="Trocar a cor"></button>
        <span class="ilha-nome" data-acao="nome" title="Clique para renomear">${esc(g.nome)}</span>
        <button class="jb jb-acao" data-acao="ir" title="Ir até a vila">ir</button>
        <button class="jb jb-x" data-acao="apagar" title="Apagar o grupo">${icone('fechar')}</button>
        <div class="ilha-esp">
          ${(g.agentes || []).map(a => `<span class="chip" title="${esc(a.foco)}">${esc(a.nome)}<button class="ilha-esp-x" data-acao="esp-apagar" data-esp="${esc(a.id)}" aria-label="Tirar ${esc(a.nome)}">${icone('fechar')}</button></span>`).join('')}
          <details class="ilha-esp-novo"><summary>+ especialista</summary>
            <form class="ilha-esp-form">
              <input name="nome" maxlength="28" placeholder="nome (ex.: Pesquisa)" aria-label="Nome do especialista" autocomplete="off" required>
              <input name="foco" maxlength="300" placeholder="do que entende" aria-label="Do que o especialista entende" autocomplete="off" required>
              <select name="papel" aria-label="Quem responde por ele">${Object.entries(PAPEIS_ESPECIALISTA).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>
              <button class="btn mini">criar</button>
            </form>
          </details>
        </div></div>`).join('')
      : '<p class="nota-mesa">Nenhum grupo ainda. Crie o primeiro: cada grupo vira uma vila.</p>';
  }
  casa.addEventListener('click', e => {
    // só um visual por vez: nos gráficos clássicos as plantas em pixel não existem, por isso é tudo uma escolha só
    const vis = e.target.closest('[data-visual]');
    if (vis) {
      const [g, v] = vis.dataset.visual.split(':');
      guardado.gravar('ilha-vegetacao', v);
      if (g !== graficos) { guardado.gravar('ilha-graficos', g); graficos = g; construir(); }
      else vivo?.definirVegetacao?.(v);
      marcarVegetacao();
      return;
    }
    const est = e.target.closest('[data-estilo]');
    if (est) { estilo.modo = est.dataset.estilo; estilo.tema = false; return aplicarEstilo(); }
    const b = e.target.closest('[data-ilha], [data-vila], [data-acao]'); if (!b) return;
    if (b.dataset.ilha === 'min') { guardado.gravar('ilha-painel-min', !guardado.ler('ilha-painel-min', false)); marcarRecolhido(); }
    if (b.dataset.ilha === 'nova') { semente = Math.random().toString(36).slice(2, 7); guardado.gravar('ilha-semente', semente); foco = null; construir(); app.aviso('Uma ilha nova foi gerada.', 'Ilha'); }
    if (b.dataset.ilha === 'lista') { lista.hidden = !lista.hidden; desenharLista(); }
    if (b.dataset.vila) { const v = mundo.vilas.find(x => x.id === b.dataset.vila); if (v) irParaVila(v); }
    const item = b.closest('.ilha-item'); if (!item) return;
    const g = grupos.find(x => x.id === item.dataset.g); if (!g) return;
    if (b.dataset.acao === 'esp-apagar') return apagarEspecialista(app, g.id, b.dataset.esp);
    if (b.dataset.acao === 'ir') { const v = mundo.vilas.find(x => x.id === g.id); if (v) irParaVila(v); }
    if (b.dataset.acao === 'cor') { g.cor = CORES_GRUPO[(CORES_GRUPO.indexOf(g.cor) + 1) % CORES_GRUPO.length]; salvarGrupos(); criarRotulos(); desenharLista(); }
    if (b.dataset.acao === 'apagar' && confirm(`Apagar o grupo “${g.nome}”? A vila some da ilha.`)) { grupos = grupos.filter(x => x !== g); salvarGrupos(); construir(); desenharLista(); }
    if (b.dataset.acao === 'nome') {
      b.contentEditable = 'true'; b.focus(); document.getSelection().selectAllChildren(b);
      const fim = ok => { b.contentEditable = 'false'; if (ok && b.textContent.trim()) { g.nome = b.textContent.trim().slice(0, 28); salvarGrupos(); construir(); desenharLista(); } else b.textContent = g.nome; };
      b.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); fim(true); } if (ev.key === 'Escape') fim(false); };
      b.onblur = () => fim(true);
    }
  });
  casa.querySelector('[data-paleta]').onchange = e => { estilo.paleta = e.target.value; aplicarEstilo(); };
  casa.querySelector('[data-seguir-tema]').onchange = e => { estilo.tema = e.target.checked; aplicarEstilo(); };
  aplicarEstilo();   // marca os botões do estilo guardado (o 3D ainda nem existe)
  function marcarVegetacao() { const atual = graficos === 'novo' ? `novo:${guardado.ler('ilha-vegetacao', 'pixel')}` : 'classico:3d'; for (const b of casa.querySelectorAll('[data-visual]')) { b.setAttribute('aria-pressed', b.dataset.visual === atual); b.setAttribute('aria-checked', b.dataset.visual === atual); } }
  marcarVegetacao();
  casa.addEventListener('submit', e => {
    const form = e.target.closest('.ilha-esp-form'); if (!form) return;
    e.preventDefault();
    const g = grupos.find(x => x.id === form.closest('.ilha-item').dataset.g); if (!g) return;
    const r = criarEspecialista(app, { grupo: g.nome, nome: form.nome.value, foco: form.foco.value, papel: form.papel.value });
    if (r.erro) app.aviso(r.erro, 'Ilha', 'erro');
  });
  // grupos e especialistas também mudam pela Navegadora e pelos primeiros passos
  app.on?.('ilha-grupos', () => { grupos = guardado.ler('ilha-grupos', []); if (pronto) construir(); desenharLista(); });
  casa.querySelector('.ilha-novo').onsubmit = e => {
    e.preventDefault();
    const nome = e.target.nome.value.trim(); if (!nome) return;
    grupos.push({ id: 'g' + Date.now().toString(36), nome: nome.slice(0, 28), cor: CORES_GRUPO[grupos.length % CORES_GRUPO.length], agentes: [] });
    salvarGrupos(); e.target.nome.value = '';
    construir(); lista.hidden = false; desenharLista();
    app.aviso(`Vila “${nome}” criada na ilha.`, 'Ilha');
  };

  // ----- laço: só desenha com a ilha à vista -----
  let ultimo = performance.now(), t = 0, acum = 0;
  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
    if (!pronto || document.hidden || !raiz.isConnected) return;
    acum += dt;
    if (acum < 1 / 30) return;                  // 30 quadros por segundo bastam
    const passo = acum; acum = 0; t += passo;
    const dist = pose(passo);
    const vis = Math.min(1, p / 0.22);          // a ilha aparece por cima do mar nos primeiros movimentos
    casa.style.setProperty('--ilha', vis.toFixed(3));
    const nova = p > 0.35;
    if (nova !== raiz.classList.contains('ilha-aberta')) { raiz.classList.toggle('ilha-aberta', nova); app.emitir('home', nova ? 'ilha' : 'oceano'); }
    painel.hidden = p < 0.6;
    if (vis < 0.01) { rotulos.hidden = true; return; }
    rotulos.hidden = false;
    vivo.definirClima(climaDaHora(app.mar.hora()));
    const a = performance.now();
    vivo.atualizar(t, passo, cam, orbita.alvo, dist);
    tempestades.atualizar(t, passo, dist);
    pos.material.uniforms.nevoa.value.copy(cena.fog.color);
    pos.desenhar(cena, cam);
    moverRotulos();
    app.medidor?.somar('ilha', performance.now() - a);
  }
  requestAnimationFrame(quadro);

  // olhar um ponto da ilha de perto (a Navegadora e os testes usam): sobe se ainda estiver no farol
  const olhar = (x, z, dist = 18, pitch = 0.35) => { pAlvo = 1; foco = null; orbAlvo.alvo.set(x, Math.max(0, mundo?.altura(x, z) || 0), z); orbAlvo.dist = dist; orbAlvo.pitch = pitch; };
  return { aberta: () => pAlvo > 0.5, abrir: () => { if (!pronto) montar(); foco = null; pAlvo = 1; }, voltar: () => { foco = null; pAlvo = 0; orbAlvo.dist = 330; orbAlvo.alvo.set(0, 0, 0); orbAlvo.pitch = 0.82; }, grupos: () => grupos, olhar, arvores: () => mundo?.arvores || [], celulas: () => mundo?.celulas, castelo: () => mundo?.castelo, vilas: () => mundo?.vilas };
}
