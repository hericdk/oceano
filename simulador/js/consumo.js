// Consumo: um medidor de memória na barra do topo e, ao clicar, o que está gastando processamento agora
// (o mar 3D, o avatar da Navegadora, cada mod, a trilha), do mais pesado para o mais leve, com um botão
// para desligar cada um. "Modo leve" desliga tudo o que é só enfeite de uma vez.
//
// Cada parte avisa quanto tempo gastou (app.medidor.somar); a conta fecha a cada 1,5 s em ms por segundo.
// No app a memória vem dos processos do Chromium; no simulador, da memória do JavaScript da página.

import { icone } from './icones.js';
import { pedirRobo } from './robo.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MB = bytes => Math.round(bytes / 1048576);

export function iniciarConsumo(app, guardado) {
  // ----- medidor -----
  let soma = {}, inicio = performance.now(), ultimo = {};
  app.medidor = {
    somar(nome, ms) { soma[nome] = (soma[nome] || 0) + ms; },
    medir(nome, fn) { const a = performance.now(); try { return fn(); } finally { this.somar(nome, performance.now() - a); } },
    porSegundo: () => ultimo,
  };
  setInterval(() => {
    const agora = performance.now(), s = (agora - inicio) / 1000;
    ultimo = Object.fromEntries(Object.entries(soma).map(([k, v]) => [k, v / s]));
    soma = {}; inicio = agora;
    atualizarChip();
    if (!painel.hidden) { desenharPainel(); desenharRobo(); }
  }, 1500);

  // ----- o que dá para desligar (fica guardado) -----
  app.leve = { marParado: false, avatarParado: false, ...guardado.ler('leve', {}) };
  const gravarLeve = () => guardado.gravar('leve', app.leve);
  // o que foi desligado por aqui vira uma tag no painel, para voltar com um clique (uma por uma ou tudo)
  let desligados = guardado.ler('consumo-desligados', []);
  const marcar = (id, fora) => { desligados = desligados.filter(x => x !== id); if (fora) desligados.push(id); guardado.gravar('consumo-desligados', desligados); };
  const NOMES = { mar: 'Mar 3D', avatar: 'Avatar da Navegadora' };
  const nomeDe = id => NOMES[id] || app.mods.find(m => 'mod:' + m.id === id)?.nome || id;
  async function religar(id) {
    if (id === 'mar') app.leve.marParado = false;
    else if (id === 'avatar') app.leve.avatarParado = false;
    else { const m = app.mods.find(x => 'mod:' + x.id === id); if (m && m.ligado === false) await app.alternarMod(m, true); }
    gravarLeve(); marcar(id, false);
  }

  // ----- chip na barra -----
  const chip = document.createElement('button');
  chip.id = 'btn-consumo';
  chip.className = 'consumo-chip';
  chip.setAttribute('aria-haspopup', 'dialog');
  chip.title = 'Memória e processamento do navegador: clique para ver o que consome mais';
  document.querySelector('.barra .selo')?.before(chip) ?? document.querySelector('#btn-som')?.after(chip);

  function memoria() {
    if (app.real && app.metricas) {
      const ps = app.metricas.processos;
      return { total: ps.reduce((s, p) => s + p.ram, 0) * 1024, cpu: ps.reduce((s, p) => s + p.cpu, 0), processos: ps };
    }
    const m = performance.memory;
    return { total: m ? m.usedJSHeapSize : 0, limite: m?.jsHeapSizeLimit, cpu: null };
  }
  const cpuPagina = () => Object.values(ultimo).reduce((s, v) => s + v, 0) / 10;   // ms por segundo → % de um núcleo

  function atualizarChip() {
    const m = memoria(), cpu = m.cpu ?? cpuPagina();
    const alto = cpu > 35 || MB(m.total) > (app.real ? 1500 : 300);
    chip.innerHTML = `${icone('raio')}<span>${MB(m.total) ? MB(m.total) + ' MB' : '—'}</span>`;
    chip.classList.toggle('alto', alto);
  }

  // ----- painel -----
  const painel = document.createElement('section');
  painel.className = 'consumo-painel px';
  painel.hidden = true;
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-label', 'Consumo do navegador');
  document.body.append(painel);

  // ----- segundo painel, igual ao primeiro, com os números do robô em laranja (só com o simulador aberto) -----
  const painelRobo = document.createElement('section');
  painelRobo.className = 'consumo-painel consumo-robo px';
  painelRobo.hidden = true;
  painelRobo.setAttribute('role', 'dialog');
  painelRobo.setAttribute('aria-label', 'Consumo do simulador de robôs');
  document.body.append(painelRobo);
  const OTIMIZACOES = [['leve', 'Leve', 256, true], ['normal', 'Normal', 512, false], ['alto', 'Alto', 2048, false]];
  async function desenharRobo() {
    const r = app.url() === 'oceano://robo' ? await pedirRobo('consumo') : null;
    painelRobo.hidden = painel.hidden || !r;
    if (painelRobo.hidden) return;
    const atual = OTIMIZACOES.find(([, , lim, leve]) => lim === r.limite && leve === r.leve)?.[0];
    const maior = Math.max(1, ...r.membros.map(m => m.grausPorS));
    painelRobo.innerHTML = `
      <header class="cp-topo"><b>🤖 Robô</b></header>
      <div class="cp-resumo">
        <div><small>memória</small><b>${r.mb} MB</b><small>de ${r.limite} MB</small></div>
        <div><small>quadros</small><b>${r.fps}</b><small>por segundo</small></div>
        <div><small>física</small><b>${r.fisicaHz}</b><small>passos por segundo</small></div>
      </div>
      <p class="cp-rotulo">otimização desta aba</p>
      <div class="cp-botoes" role="group" aria-label="Otimização">${OTIMIZACOES.map(([id, nome]) => `<button class="btn mini${id === atual ? '' : ' secundario'}" data-robo-otim="${id}" aria-pressed="${id === atual}">${nome}</button>`).join('')}</div>
      ${r.corte ? `<p class="cp-rotulo">economizando agora: ${esc(r.corte)}</p>` : ''}
      <p class="cp-rotulo">movimento por membro · graus por segundo</p>
      <ul class="cp-lista">${r.membros.map(m => `<li>
          <span class="cp-nome">${esc(m.nome)}<small>${m.juntas} ${m.juntas === 1 ? 'motor' : 'motores'}</small></span>
          <span class="cp-barra" aria-hidden="true"><i style="width:${Math.max(2, m.grausPorS / maior * 100)}%"></i></span>
          <span class="cp-num">${m.grausPorS}</span><span></span>
        </li>`).join('')}</ul>
      <small class="cp-nota">O simulador calcula o robô inteiro de uma vez, por isso cada membro mostra o movimento e não o processador.</small>`;
    const w = painel.getBoundingClientRect();
    if (innerWidth > 720) { painelRobo.style.top = w.top + 'px'; painelRobo.style.right = innerWidth - w.left + 8 + 'px'; }
    else { painelRobo.style.top = Math.min(w.bottom + 8, innerHeight - 120) + 'px'; painelRobo.style.right = '8px'; }
  }
  painelRobo.addEventListener('click', async e => {
    const b = e.target.closest('[data-robo-otim]'); if (!b) return;
    const [, , limite, leve] = OTIMIZACOES.find(([id]) => id === b.dataset.roboOtim);
    await pedirRobo('regulador', { limite, leve });
    desenharRobo();
  });

  // as partes medidas, com nome amigável e como desligar
  function partes() {
    const ms = ultimo, lista = [];
    lista.push({ id: 'mar', nome: 'Mar 3D', obs: app.leve.marParado ? 'parado' : 'animado', ms: ms.mar || 0,
      acao: app.leve.marParado ? ['animar', () => religar('mar')] : ['parar', () => { app.leve.marParado = true; gravarLeve(); marcar('mar', true); }] });
    lista.push({ id: 'avatar', nome: 'Avatar da Navegadora', obs: app.leve.avatarParado ? 'só anima falando' : 'animado', ms: ms.avatar || 0,
      acao: app.leve.avatarParado ? ['animar', () => religar('avatar')] : ['parar', () => { app.leve.avatarParado = true; gravarLeve(); marcar('avatar', true); }] });
    for (const m of app.mods.filter(m => m.cart || m.ligado !== false)) {
      if (!m.cart && m.ligado === false) continue;
      lista.push({ id: 'mod:' + m.id, nome: m.nome, obs: m.cart ? 'mod' : 'mod (sem tela)', ms: ms['mod:' + m.id] || 0,
        acao: m.ligado !== false ? ['desligar', async () => { await app.alternarMod(m, false); marcar('mod:' + m.id, true); }] : ['ligar', () => religar('mod:' + m.id)] });
    }
    if (ms.trilha || app.trilha?.motor?.tocando) lista.push({ id: 'trilha', nome: 'Trilha', obs: app.trilha?.motor?.tocando ? 'tocando' : 'parada', ms: ms.trilha || 0,
      acao: app.trilha?.motor?.tocando ? ['pausar', () => app.trilha.alternar()] : null });
    return lista.sort((a, b) => b.ms - a.ms);
  }

  function desenharPainel() {
    const m = memoria(), lista = partes(), maior = Math.max(1, ...lista.map(p => p.ms));
    const abas = app.abas.length, congeladas = app.abas.filter(a => a.congelada).length;
    const porTipo = {};
    if (m.processos) for (const p of m.processos) porTipo[p.tipo] = (porTipo[p.tipo] || 0) + p.ram * 1024;
    painel.innerHTML = `
      <header class="cp-topo"><b>Consumo</b><button class="jb jb-x" data-cp="fechar" title="Fechar">${icone('fechar')}</button></header>
      <div class="cp-resumo">
        <div><small>memória</small><b>${MB(m.total)} MB</b>${m.limite ? `<small>de ${MB(m.limite)} MB</small>` : ''}</div>
        <div><small>processador</small><b>${Math.round(m.cpu ?? cpuPagina())}%</b><small>${m.cpu != null ? 'do navegador' : 'desta página'}</small></div>
        <div><small>abas</small><b>${abas}</b><small>${congeladas ? `${congeladas} congelada(s)` : 'nenhuma congelada'}</small></div>
      </div>
      ${Object.keys(porTipo).length ? `<p class="cp-rotulo">memória por tipo de processo</p><ul class="cp-lista">${Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([t, v]) => `<li><span>${esc(t)}</span><span class="cp-num">${MB(v)} MB</span></li>`).join('')}</ul>` : ''}
      <p class="cp-rotulo">processamento agora · do mais pesado ao mais leve</p>
      <ul class="cp-lista">${lista.map((p, i) => `<li>
          <span class="cp-nome">${esc(p.nome)}<small>${esc(p.obs)}</small></span>
          <span class="cp-barra" aria-hidden="true"><i style="width:${Math.max(2, p.ms / maior * 100)}%"></i></span>
          <span class="cp-num">${p.ms < 0.5 ? '~0' : Math.round(p.ms)} ms/s</span>
          ${p.acao ? `<button class="btn mini secundario" data-cp-acao="${i}">${p.acao[0]}</button>` : '<span></span>'}
        </li>`).join('')}</ul>
      ${desligados.length ? `<p class="cp-rotulo">desligados por aqui · clique para voltar</p>
      <div class="cp-tags">${desligados.map(id => `<button class="chip cp-tag" data-religar="${esc(id)}" title="Voltar: ${esc(nomeDe(id))}">${esc(nomeDe(id))} <span aria-hidden="true">↺</span></button>`).join('')}
        ${desligados.length > 1 ? '<button class="chip cp-tag cp-tudo" data-religar-tudo>voltar tudo</button>' : ''}</div>` : ''}
      <div class="cp-botoes">
        <button class="btn mini" data-cp="leve">${app.leve.marParado && app.leve.avatarParado ? 'sair do modo leve' : 'modo leve'}</button>
        <small>parar o mar e o avatar (eles voltam quando você quiser). ms/s = milissegundos de processador por segundo.</small>
      </div>`;
    painel._acoes = lista.map(p => p.acao?.[1]);
  }

  painel.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cp === 'fechar') { painel.hidden = true; painelRobo.hidden = true; return; }
    if (b.dataset.cp === 'leve') {
      const ligar = !(app.leve.marParado && app.leve.avatarParado);
      app.leve.marParado = app.leve.avatarParado = ligar; gravarLeve();
      marcar('mar', ligar); marcar('avatar', ligar);
      app.aviso(ligar ? 'Modo leve: o mar e o avatar ficaram parados.' : 'Mar e avatar animados de novo.', 'Consumo');
    }
    if (b.dataset.cpAcao) await painel._acoes[+b.dataset.cpAcao]?.();
    if (b.dataset.religar) { await religar(b.dataset.religar); app.aviso(`${nomeDe(b.dataset.religar)} voltou.`, 'Consumo'); }
    if (b.hasAttribute('data-religar-tudo')) { for (const id of [...desligados]) await religar(id); app.aviso('Tudo voltou.', 'Consumo'); }
    desenharPainel();
  });
  chip.onclick = () => {
    painel.hidden = !painel.hidden;
    if (painel.hidden) { painelRobo.hidden = true; return; }
    const r = chip.getBoundingClientRect();
    painel.style.top = r.bottom + 6 + 'px';
    painel.style.right = Math.max(8, innerWidth - r.right) + 'px';
    desenharPainel(); desenharRobo();
  };
  document.addEventListener('pointerdown', e => { if (!painel.hidden && !painel.contains(e.target) && !painelRobo.contains(e.target) && e.target !== chip && !chip.contains(e.target)) { painel.hidden = true; painelRobo.hidden = true; } });

  app.consumo = { abrir: () => chip.click(), partes };
  atualizarChip();
}
