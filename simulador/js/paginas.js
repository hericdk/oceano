// Páginas internas do Oceano (oceano://...). Cada página tem título, ícone,
// HTML e um montar() opcional que devolve { desmontar, atualizar, aoLogar }.

import { IDIOMAS, idiomaAtual, textoDoMod } from './idioma.js';
import { icone } from './icones.js';
import { PERMISSOES, NUNCA } from './lua.js';
import { FORMATO, MAX_CORES, TOKENS, CHECAGENS, DITHERS, AJUSTES_MAR, slug, validarTema, lerPaleta, tokensAutomaticos, contraste, normalizarMar } from './temas.js';
import { privacidade } from './privacidade.js';
import { htmlHora, ligarHora } from './hora-cena.js';
import { deEvento, mostrar as mostrarCombo } from './atalhos.js';
import { pico8 } from './pico8.js';
import { sampler } from './sampler.js';
import { gimp, AVISO_GIMP, gimpLigado } from './gimp.js';
import { retoque } from './retoque.js';
import { caixaFerramentas } from './caixa-ferramentas.js';
import { roboSim } from './robo.js';
import { comAbasDeAjustes } from './ajustes-abas.js';
import { abrirOpcoesNotch } from './notch-opcoes.js';
import { htmlBloqueio18, ligarBloqueio18 } from './bloqueio-18.js';
import { htmlGuardrails, ligarGuardrails } from './guardrails.js';
import { htmlSurfista, montarSurfista } from './surfista.js';
import { AREAS } from './emojis.js';
import { SUGESTOES } from './skills.js';
import { CONEXOES, TEMPO_REFERENCIA } from './conexoes.js';
import { trilhaPagina, cdsPagina } from './musica-paginas.js';
import { strudel } from './strudel.js';
import { micromediaflash } from './micromediaflash.js';
import { avatar } from './avatar.js';
import { manifesto } from './manifesto.js';
import { historico } from './historico.js';
import { leitura } from './leitor.js';
import { ia } from './ia-pagina.js';
import { bau } from './bau.js';
import { sensivel } from './sensivel.js';
import { downloads } from './downloads.js';
import { validarEmojiMod, referenciaLivre } from './emojis.js';
import { analisarMod, htmlAnalise, MAX_MOD_BYTES } from './mod-analise.js';
import { htmlFarolMod, htmlLegendaFarol } from './farol-mods.js';
import { htmlClima, ligarClima } from './clima.js';
import { enderecoDoTema, baixarTema as baixarTemaDoLink, procurarTemas, ARQUIVO as ARQUIVO_TEMA, TOPICO as TOPICO_TEMA } from './temas-comunidade.js';
import { contarUso } from './contagem-uso.js';

// o selo "última versão" do Sobre só aparece com este Electron: conferir em cada instalador com `npm view electron version`
const ELECTRON_MAIS_RECENTE = '45.2.1';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = d => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function rotaDe(url) {
  const m = /^oceano:\/\/([^?#]*)(?:\?([^#]*))?/.exec(url);
  if (!m) return { pagina: 'offline', url, externo: true, params: new URLSearchParams() };
  const caminho = m[1].replace(/\/$/, '') || 'nova-aba';
  const pagina = { 'mods/editar': 'editar', 'temas/editar': 'editor-tema' }[caminho] || caminho;
  return { pagina: PAGINAS[pagina] ? pagina : 'offline', url, params: new URLSearchParams(m[2] || ''), desconhecida: !PAGINAS[pagina] };
}

const cabecalho = (ic, titulo, texto) =>
  `<header class="cab"><h1>${icone(ic)}<span>${titulo}</span></h1>${texto ? `<p>${texto}</p>` : ''}</header>`;

// ---------- nova aba ----------

const nova = {
  titulo: () => 'Nova aba',
  icone: 'oceano',
  html: (r, app) => !app.lite ? '<section class="nova-aba com-mesa" data-mesa></section>' : `
    <section class="nova-aba">
      <h1 class="marca">${icone('logo', 'marca-icone')}<span>Oceano</span><span class="selo">${app.lite ? 'lite' : 'beta'}</span></h1>
      <form class="busca px" data-busca>
        ${icone('escudo')}
        <input name="q" autocomplete="off" placeholder="Pesquise ou digite um endereço" aria-label="Pesquisar ou digitar endereço">
      </form>
      <div class="slot slot-widgets" data-slot="nova-aba"></div>
      <nav class="atalhos">
        ${[['oceano://mods', 'cartucho', 'Mods'], ['oceano://temas', 'temas', 'Temas'], ['oceano://jogo', 'jogo', 'Modo jogo'], ['oceano://pico8', 'console', 'PICO-8'],
           ['oceano://rede', 'rede', 'Rede'], ['oceano://sobre', 'info', 'Sobre a Navegadora']]
          // modo jogo e rede dependem do navegador próprio: não existem na extensão
          .filter(([u]) => !app.lite || !/jogo|rede/.test(u))
          .map(([u, i, n]) => `<a href="#" class="atalho px" data-ir="${u}">${icone(i)}<span>${n}</span></a>`).join('')}
      </nav>
      <p class="rodape-nova">${app.lite ? 'Oceano Lite · sem telemetria · nenhuma conexão de rede'
        : app.real ? `Oceano MVP · Chromium ${window.oceanoNativo?.versoes.chromium.split('.')[0]} · contagem de uso só se você autorizar`
        : 'Simulador · nada sai deste computador'}</p>
    </section>`,
  montar(el, r, app) {
    if (!app.lite) return app.mesaNaTela(el.querySelector('[data-mesa]'));
    el.querySelector('[data-busca]').onsubmit = e => { e.preventDefault(); app.navegar(e.target.q.value); };
  },
};

// ---------- mods ----------

function statusDoMod(m) {
  if (!m.ligado) return ['desligado', 'off'];
  if (!m.cart) return ['iniciando…', 'off'];
  if (m.cart.erro) return ['pausado por erro', 'erro'];
  if (!m.cart.temTela) return ['ouvindo eventos', 'ok'];
  if (!m.cart.canvas?.isConnected) return ['em espera (fora da tela)', 'ok'];
  return [`rodando · ${m.cart.msPorQuadro.toFixed(2)} ms/quadro`, 'ok'];
}

let catalogoVisto = false;
let abaMods = 'mods';

const nomeAvatar = app => app.assistente?.nome?.() || 'Kara';
// o que dá para desligar no navegador, além dos mods: tudo fica junto, na tela de mods
const desativaveis = app => [
  { id: 'clima', nome: 'Clima', desc: 'Mostra o clima da sua cidade na página inicial, em tamanho pequeno ou médio e com fundo normal ou transparente. Começa desligado.', ligado: () => app.guardado.ler('mod-clima', false) === true, alternar() { app.guardado.gravar('mod-clima', app.guardado.ler('mod-clima', false) !== true); app.emitir?.('clima'); } },
  ...(app.notchPrefs?.disponivel ? [{ id: 'notch', nome: 'Notch', desc: 'A Navegadora no notch do Mac. Nas opções, você escolhe se ele aparece em todos os apps ou só com o navegador na frente.', opcoes: true, ligado: () => app.notchPrefs.ligado, alternar() { app.notchPrefs.ligado = !app.notchPrefs.ligado; window.oceanoNativo.notchDefinir({ ligado: app.notchPrefs.ligado }); } }] : []),
  { id: 'mar', nome: 'Mar animado', desc: 'O mar e o céu da página inicial se movendo. Desligado, a imagem fica parada e sobra processador.', ligado: () => !app.leve?.marParado, alternar() { app.leve.marParado = !app.leve.marParado; app.guardado.gravar('leve', app.leve); } },
  { id: 'avatar', nome: 'Avatar animado', desc: 'A Navegadora se mexendo o tempo todo. Desligado, ela só anima enquanto fala.', ligado: () => !app.leve?.avatarParado, alternar() { app.leve.avatarParado = !app.leve.avatarParado; app.guardado.gravar('leve', app.leve); } },
  { id: 'voz', nome: 'Voz da Navegadora', desc: 'Falar as respostas em voz alta.', ligado: () => app.guardado.ler('assistente-voz', true), alternar() { const v = !app.guardado.ler('assistente-voz', true); if (app.assistente?.definirVoz) app.assistente.definirVoz(v); else app.guardado.gravar('assistente-voz', v); } },
  { id: 'gimp', nome: 'GIMP', desc: `Instalar e abrir o GIMP de verdade, com a opção do PhotoGIMP. Começa desligado. ${AVISO_GIMP}`, ligado: () => gimpLigado(app), alternar() { app.guardado.gravar('mod-gimp', !gimpLigado(app)); app.emitir('mods-mudaram'); } },
  { id: 'agua', nome: 'Lembrete de água', desc: 'Avisa de tempos em tempos para você beber água.', ligado: () => !!app.agua?.intervalo?.(), alternar() { app.agua?.definirIntervalo(app.agua.intervalo() ? 0 : 45); } },
];
const linhaAutor = a => `<p class="skill-autor">por <a href="https://github.com/${esc(a.github)}" target="_blank" rel="noopener">${esc(a.nome)}</a></p>`;
const tamanhoKb = b => `${Math.max(1, Math.round(b / 1000))} KB`;

const mods = {
  titulo: () => 'Mods',
  icone: 'cartucho',
  html: (r, app) => `
    <div class="folha">
      ${cabecalho('cartucho', 'Mods', 'Mods do Oceano são pequenos programas em Lua, a linguagem criada no Brasil, na PUC-Rio: widgets, cartuchos, temas vivos e automações. Edite qualquer um e veja o resultado na hora.')}
      ${app.lite ? '' : `<details class="atalhos-mesa px" data-atalhos>
        <summary>${icone('janela')} Atalhos da mesa</summary>
        <p class="nota">Oculte o que não usa e mude a ordem. Isso vale para os ícones da página inicial.</p>
        <ul class="atalhos-lista" data-atalhos-lista></ul>
        <button class="btn mini secundario" data-atalho-restaurar>Voltar ao padrão</button>
      </details>`}
      <div data-painel="mods">
        <div class="caixa-sandbox px">${icone('cadeado')}<div><b>Nenhum mod consegue acessar:</b> ${NUNCA.join(' · ')}. Cada mod roda isolado, só recebe as permissões que declara e é pausado se passar de 40 ms por quadro.</div></div>
        <div class="barra-acoes">
          <button class="btn px" data-novo="lua">${icone('mais')} Novo mod em Lua</button>
          <button class="btn px secundario" data-novo="teal">${icone('mais')} Novo mod em Teal</button>
          <label class="btn px secundario">${icone('subir')} Importar arquivo<input type="file" accept=".lua,.tl,text/plain" data-importar-mod hidden></label>
          <span class="nota">Teal é Lua com tipos, criado pelo brasileiro Hisham Muhammad.</span>
        </div>
        <div data-mod-importado></div>
        ${htmlLegendaFarol()}
        <details class="farol-legenda px"><summary>${icone('cartucho')} Sprites e plugins do Aseprite</summary>
          <p class="nota">Arquivos <code>.aseprite</code> e scripts do Aseprite são do editor de animação: lá dentro, Arquivo importa o desenho e Comandos → Gerenciar plugins instala <code>.aseprite-extension</code>, <code>.zip</code> ou <code>.lua</code>. Os mods desta página também usam Lua, mas com funções próprias do navegador. Um não roda no lugar do outro.</p>
          <button class="btn mini secundario" data-ir="oceano://micromediaflash">Abrir o editor de animação</button>
        </details>
        ${r.params.get('lugar') === 'nova-aba' ? '<h2 class="skill-titulo">Mods para a página inicial</h2>' : ''}
        <div class="grade-mods" data-lista></div>
      </div>
      <div data-painel="skills" hidden>
        <p class="caixa-beta px"><span class="chip beta">BETA</span> As conexões e os links estão em teste. A consulta é separada e só usa o que você adicionou aqui.</p>
        <div class="caixa-sandbox px">${icone('cadeado')}<div><b>Skill é só texto.</b> ${esc(nomeAvatar(app))} consulta quando precisa. Nada do repositório é executado, a skill não libera nenhuma permissão e a versão fica presa à que você viu antes de instalar.</div></div>
        <form class="skill-form" data-skill-form>
          <label class="campo">Link do GitHub<input name="link" autocomplete="off" spellcheck="false" placeholder="https://github.com/dono/repositorio" required></label>
          <button class="btn px">Procurar</button>
        </form>
        <p class="nota skill-status" role="status" data-skill-status></p>
        <div data-skill-previa></div>
        <h2 class="skill-titulo">Seus links</h2>
        <ul class="links-lista" data-skills></ul>
        <p class="nota" data-skills-excluidas></p>
        <h2 class="skill-titulo">Primeira lista</h2>
        <p class="nota skill-texto">Conexões pedem sua permissão para ir à internet; o que já está na memória local abre sem perguntar. Referências viram texto para ${esc(nomeAvatar(app))} ler; o programa não é instalado.</p>
        <div data-sempre-aviso hidden></div>
        <div class="grade-mods" data-sugestoes></div>
      </div>
    </div>`,
  montar(el, r, app) {
    if (!catalogoVisto && !app.lite) {
      catalogoVisto = true;
    }
    const lista = el.querySelector('[data-lista]');
    const iconesMesa = app.iconesMesa;
    const botaoAtalho = (url, ic, nome) => {
      const on = iconesMesa.tem(url);
      return `<button class="btn px secundario" data-atalho-url="${esc(url)}" data-atalho-icone="${esc(ic)}" data-atalho-nome="${esc(nome)}" aria-pressed="${on}" title="${on ? 'Tirar o atalho da mesa' : 'Pôr um atalho na mesa'}">${icone(on ? 'fechar' : 'mais')} Mesa</button>`;
    };
    const listaAtalhos = el.querySelector('[data-atalhos-lista]');
    const desenharAtalhos = () => {
      if (!listaAtalhos) return;
      const itens = iconesMesa.lista();
      listaAtalhos.innerHTML = itens.map((x, i) => `<li class="${x.oculto ? 'oculto' : ''}">
          ${icone(x.icone)}<span class="atalho-nome">${esc(x.nome)}</span>
          <button class="jb" data-atalho-mover="-1" data-url="${esc(x.url)}" aria-label="Subir ${esc(x.nome)}" ${i === 0 ? 'disabled' : ''}>${icone('subir')}</button>
          <button class="jb" data-atalho-mover="1" data-url="${esc(x.url)}" aria-label="Descer ${esc(x.nome)}" ${i === itens.length - 1 ? 'disabled' : ''}>${icone('descer')}</button>
          <button class="btn mini secundario" data-atalho-ocultar data-url="${esc(x.url)}" aria-pressed="${x.oculto}">${x.oculto ? 'Mostrar' : 'Ocultar'}</button>
          ${x.extra ? `<button class="btn mini perigo" data-atalho-tirar data-url="${esc(x.url)}">Tirar</button>` : ''}
        </li>`).join('');
    };
    const desenhar = () => {
      const soLugar = r.params.get('lugar');
      lista.innerHTML = (soLugar ? '' : desativaveis(app).map(d => `<article class="mod px${d.ligado() ? '' : ' desligado'}">
          <div class="mod-topo"><span><span class="chip">navegador</span></span><span class="status">${d.ligado() ? 'ligado' : 'desligado'}</span></div>
          <h2>${esc(d.nome)}</h2><p>${esc(d.desc)}</p>
          <div class="mod-acoes"><button class="btn px" data-desativavel="${d.id}" aria-pressed="${d.ligado()}">${d.ligado() ? 'Desligar' : 'Ligar'}</button>${d.opcoes ? '<button class="btn px secundario" data-notch-opcoes>Opções</button>' : ''}</div>
        </article>`).join('')) + app.mods.filter(m => !soLugar || (m.lugar === soLugar && m.ligado !== false)).map(m => {
        const [st, cls] = statusDoMod(m);
        return `<article class="mod px${m.ligado ? '' : ' desligado'}">
          <div class="mod-topo"><span><span class="chip">${esc(m.tipo)}</span> <span class="chip lingua">${m.linguagem === 'teal' ? 'Teal' : 'Lua'}</span></span><span class="status ${cls}" data-status="${m.id}">${st}</span></div>
          <h2>${m.emoji ? `<span aria-hidden="true">${esc(m.emoji)}</span> ` : ''}${esc(textoDoMod(m, app.guardado).nome)}</h2>
          <p>${esc(textoDoMod(m, app.guardado).descricao)}</p>
          ${m.ligado ? htmlFarolMod(m.id) : ''}
          <details class="mod-leitura"><summary>O que este código faz</summary><div data-mod-leitura="${m.id}"></div></details>
          <ul class="perms">${m.permissoes.map(p => `<li title="${esc(PERMISSOES[p] || p)}">${p}</li>`).join('')}</ul>
          <div class="mod-acoes">
            ${m.construcao ? '<button class="btn px" disabled>Em construção</button>' : `<button class="btn px" data-alternar="${m.id}" aria-pressed="${m.ligado}">${m.ligado ? 'Desligar' : 'Ligar'}</button>
            <button class="btn px secundario" data-ir="oceano://mods/editar?id=${m.id}">${icone('editar')} Código</button>
            ${app.lite ? '' : botaoAtalho(`oceano://mods/editar?id=${m.id}`, 'cartucho', m.nome)}`}
            ${m.extra ? `<button class="btn px perigo" data-remover="${m.id}">Remover</button>` : ''}
          </div>
        </article>`;
      }).join('');
    };
    desenhar();

    // ---------- skills ----------
    const statusSkill = el.querySelector('[data-skill-status]'), previa = el.querySelector('[data-skill-previa]'), gradeSkills = el.querySelector('[data-skills]');
    const formSkill = el.querySelector('[data-skill-form]');
    let achado = null, candidata = null, pedidoAtual = 0;
    const avisar = (t, ruim) => { statusSkill.textContent = t; statusSkill.classList.toggle('ruim', !!ruim); };
    const mostrarAba = aba => {
      abaMods = aba;
      el.querySelectorAll('[data-painel]').forEach(p => { p.hidden = p.dataset.painel !== aba; });
      el.querySelectorAll('[data-aba-mods]').forEach(b => { const on = b.dataset.abaMods === aba; if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); b.classList.toggle('atual', on); });
    };
    const desenharSkills = () => {
      const l = app.skills.lista();
      gradeSkills.innerHTML = l.length ? l.map(s => {
        const on = app.skills.ativa(s);
        return `<li class="link-linha${on ? '' : ' desligado'}">
          <span class="link-nome"><b>${esc(s.nome)}</b><small>${esc(s.dono)}/${esc(s.repo)} · ${tamanhoKb(s.tamanho)}</small></span>
          <span class="link-acoes">
            <button class="btn mini${on ? ' secundario' : ''}" data-skill-ativa="${esc(s.id)}" aria-pressed="${on}">${on ? 'Desativar' : 'Ativar'}</button>
            <button class="btn mini secundario" data-skill-atualizar="${esc(s.id)}">Ver versão nova</button>
            ${app.lite ? '' : botaoAtalho(`https://github.com/${s.dono}/${s.repo}`, 'cartucho', s.nome).replace('btn px secundario', 'btn mini secundario')}
            <button class="btn mini perigo" data-skill-remover="${esc(s.id)}">Excluir</button>
          </span></li>`;
      }).join('') : `<li class="nota">Nenhum link ainda. Cole um acima e ${esc(nomeAvatar(app))} passa a poder consultar esse texto.</li>`;
      const fora = app.skills.excluidas();
      el.querySelector('[data-skills-excluidas]').textContent = fora.length ? 'Últimas exclusões: ' + fora.map(x => `${x.nome} (${x.origem}), ${new Date(x.quando).toLocaleDateString('pt-BR')}`).join(' · ') : '';
    };
    // a leitura do código só roda quando a pessoa abre
    lista.addEventListener('toggle', e => {
      const caixa = e.target.querySelector?.('[data-mod-leitura]');
      if (!caixa || !e.target.open) return;
      const m = app.mods.find(x => x.id === caixa.dataset.modLeitura);
      caixa.innerHTML = htmlAnalise(analisarMod(m.codigo ?? m.original ?? ''), m.permissoes, m.cart?.uso);
    }, true);
    // importar: mostra a leitura do código antes; acima de 32 KB, nem lê
    const areaImport = el.querySelector('[data-mod-importado]');
    el.querySelector('[data-importar-mod]').onchange = async e => {
      const arq = e.target.files[0];
      e.target.value = '';
      if (!arq) return;
      if (!/\.(lua|tl)$/i.test(arq.name)) { areaImport.innerHTML = '<p class="nota">Use um arquivo .lua ou .tl.</p>'; return; }
      if (arq.size > MAX_MOD_BYTES) { areaImport.innerHTML = '<p class="nota">Este mod passa de 32 KB, o tamanho de um cartucho do PICO-8. É o limite criativo desta versão.</p>'; return; }
      const codigo = await arq.text(), a = analisarMod(codigo), nome = arq.name.replace(/\.\w+$/, '');
      areaImport.innerHTML = `<article class="mod px"><h2>${esc(nome)}</h2>${htmlAnalise(a)}
        <label class="mod-emoji">referenciar este mod com um emoji<input data-ref-importado value="${esc(referenciaLivre(app.mods))}" maxlength="40" autocomplete="off" aria-label="Referência do mod: emoji ou código"></label>
        <p class="nota mod-alerta" data-ref-erro role="status"></p>
        <div class="mod-acoes"><button class="btn px" data-instalar-mod>Instalar</button><button class="btn px secundario" data-cancelar-mod>Cancelar</button></div></article>`;
      areaImport.querySelector('[data-cancelar-mod]').onclick = () => { areaImport.innerHTML = ''; };
      areaImport.querySelector('[data-instalar-mod]').onclick = () => {
        const ref = validarEmojiMod(areaImport.querySelector('[data-ref-importado]').value, app.mods);
        if (ref.erro) { areaImport.querySelector('[data-ref-erro]').textContent = ref.erro; return; }
        app.importarMod({ nome, linguagem: /\.tl$/i.test(arq.name) ? 'teal' : 'lua', codigo, permissoes: a.permissoes, emoji: ref.emoji });
        areaImport.innerHTML = ''; desenhar();
      };
    };
    const gradeSugestoes = el.querySelector('[data-sugestoes]');
    const skillDoRepo = repo => app.skills.lista().find(s => `${s.dono}/${s.repo}` === repo);
    const desenharSugestoes = () => {
      const conexoes = Object.entries(CONEXOES).map(([id, c]) => {
        const on = app.conexoes.ligada(id);
        return `<article class="mod px">
          <div class="mod-topo"><span class="chip">conexão</span>${on ? '<span class="status ok">ligada</span>' : ''}</div>
          <h2>${esc(c.nome)}</h2>${linhaAutor(c.autor)}<p>${esc(c.descricao)}</p>
          <ul class="perms"><li>${esc(new URL(c.base).host)}</li><li>${esc(c.licenca)}</li></ul>
          ${c.guarda ? `<p class="nota skill-memoria" data-memoria="${id}"></p>` : ''}
          <div class="mod-acoes">
            <button class="btn px${on ? ' secundario' : ''}" data-conexao="${id}" aria-pressed="${on}">${on ? 'Desligar' : 'Ligar'}</button>
            ${c.pacote ? `<button class="btn px secundario" data-sempre="${id}" aria-pressed="${app.conexoes.sempreAtivo(id)}">${app.conexoes.sempreAtivo(id) ? 'Sempre ativo: ligado' : 'Sempre ativo'}</button>` : ''}
            <button class="btn px secundario" data-ir="${esc(c.repo)}">Ver no GitHub</button>
            ${app.lite ? '' : botaoAtalho(c.repo, 'rede', c.nome)}
          </div>
        </article>`;
      });
      const referencias = SUGESTOES.filter(s => !skillDoRepo(s.repo)).map(s => `<article class="mod px">
          <div class="mod-topo"><span class="chip">referência</span></div>
          <h2>${esc(s.nome)}</h2>${linhaAutor(s.autor)}<p>${esc(s.descricao)}</p>
          <ul class="perms"><li>${esc(s.repo)}</li><li>${esc(s.licenca)}</li></ul>
          <div class="mod-acoes">
            <button class="btn px" data-sugestao="${esc(s.link)}">Adicionar</button>
            <button class="btn px secundario" data-ir="https://github.com/${esc(s.repo)}">Ver no GitHub</button>
          </div>
        </article>`);
      gradeSugestoes.innerHTML = [...conexoes, ...referencias].join('');
      gradeSugestoes.querySelectorAll('[data-memoria]').forEach(async m => {
        const id = m.dataset.memoria, r = await app.conexoes.memoria(id).catch(() => ({ textos: 0, bytes: 0 }));
        m.innerHTML = r.textos
          ? `Memória local: ${r.textos} ${r.textos === 1 ? 'texto' : 'textos'}, ${tamanhoKb(r.bytes)}. O que já está aqui abre sem perguntar. <button class="btn mini secundario" data-memoria-apagar="${id}">Apagar</button>`
          : 'Memória local vazia: cada texto consultado fica guardado aqui.';
      });
    };
    const avisoSempre = el.querySelector('[data-sempre-aviso]');
    const seg = ms => (ms < 1 ? 'menos de 0,001 s' : `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: ms < 100 ? 3 : 2 })} s`);
    const mostrarAvisoSempre = id => {
      const t = app.conexoes.tempos(id), medido = t.rede?.n && t.local?.n;
      const rede = medido ? t.rede.ms : TEMPO_REFERENCIA.rede, local = medido ? t.local.ms : TEMPO_REFERENCIA.local;
      avisoSempre.hidden = false;
      avisoSempre.innerHTML = `<div class="caixa-sandbox px sempre-aviso" role="group" aria-label="Aviso antes de ativar">${icone('cadeado')}<div>
        <p><b>Quase nunca compensa.</b> Ferramentas leves como esta não precisam disso. Só faz diferença para um mod pesado, que demora a carregar a cada uso.</p>
        <p><b>Ganho real:</b> ${medido ? `neste computador, ${t.rede.n} ${t.rede.n === 1 ? 'consulta pela internet levou' : 'consultas pela internet levaram em média'}` : 'em teste, uma consulta pela internet levou cerca de'} ${seg(rede)}, e pela memória, ${seg(local)}. São ${seg(Math.max(0, rede - local))} a menos em cada texto novo, além de menos perguntas.</p>
        <p><b>Segurança:</b> os arquivos de terceiros ficam guardados no seu computador e ${esc(CONEXOES[id].nome)} deixa de perguntar antes de baixar. Aqui só entra texto e nada é executado. Um programa instalado por um mod teria muito mais acesso que um mod isolado: só aceite de quem você confia.</p>
        <div class="mod-acoes"><button class="btn px secundario" data-sempre-cancelar>Cancelar</button><button class="btn px perigo" data-sempre-ativar="${id}">Ativar mesmo assim</button></div>
      </div></div>`;
      avisoSempre.querySelector('[data-sempre-cancelar]').focus();
      avisoSempre.scrollIntoView({ block: 'center' });
    };
    const desenharPrevia = s => {
      // da primeira lista: o README nem sempre começa com o nome do projeto
      const sugerida = s.semSkillMd && SUGESTOES.find(x => x.repo === `${s.dono}/${s.repo}`);
      if (sugerida) { s.nome = sugerida.nome; s.descricao = sugerida.descricao; }
      candidata = s;
      const antiga = app.skills.achar(s.id);
      const igual = antiga?.commit === s.commit;
      const notas = [
        s.semSkillMd && 'Sem SKILL.md: este é o texto do arquivo escolhido.',
        s.ignorados && `${s.ignorados} ${s.ignorados === 1 ? 'outro arquivo da pasta foi ignorado' : 'outros arquivos da pasta foram ignorados'}: só este texto entra.`,
        s.invisiveis && `${s.invisiveis} caracteres invisíveis foram removidos do texto.`,
        antiga && !igual && `Troca a versão ${antiga.commit.slice(0, 7)} instalada por esta.`,
        igual && 'Você já tem esta versão instalada.',
      ].filter(Boolean);
      previa.innerHTML = `<article class="mod px skill-previa">
          <div class="mod-topo"><span class="chip">antes de instalar</span></div>
          <h2>${esc(s.nome)}</h2>
          <p>${esc(s.descricao)}</p>
          <ul class="perms"><li>${esc(s.dono)}/${esc(s.repo)}</li><li>${esc(s.caminho)}</li><li>${esc(s.commit.slice(0, 7))}</li><li>${tamanhoKb(s.tamanho)}</li></ul>
          ${notas.map(n => `<p class="nota">${esc(n)}</p>`).join('')}
          <details><summary>Ler o texto inteiro</summary><pre>${esc(s.texto)}</pre></details>
          <div class="mod-acoes">
            ${igual ? '' : `<button class="btn px" data-skill-instalar>${antiga ? 'Trocar versão' : 'Instalar'}</button>`}
            <button class="btn px secundario" data-ir="${esc(s.link)}">Ver no GitHub</button>
            <button class="btn px secundario" data-skill-cancelar>${igual ? 'Fechar' : 'Cancelar'}</button>
          </div>
        </article>`;
    };
    const abrirOpcao = async (caminho, n) => {
      avisar('Baixando o texto…');
      const s = await app.skills.baixar(achado, caminho);
      if (n !== pedidoAtual) return;
      avisar('');
      desenharPrevia(s);
    };
    const procurarSkill = async (link, caminhoPreferido) => {
      const n = ++pedidoAtual;
      candidata = null; previa.innerHTML = ''; avisar('Procurando no GitHub…');
      try {
        const a = await app.skills.procurar(link);
        if (n !== pedidoAtual) return;
        achado = a;
        const unica = a.opcoes.includes(caminhoPreferido) ? caminhoPreferido : a.opcoes.length === 1 ? a.opcoes[0] : null;
        if (unica) return await abrirOpcao(unica, n);
        avisar(`Achei ${a.opcoes.length} textos nesse repositório. Escolha um:`);
        previa.innerHTML = `<div class="skill-opcoes">${a.opcoes.map(c => `<button class="btn px secundario" data-skill-opcao="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
      } catch (err) {
        if (n === pedidoAtual) avisar(err.paraPessoa ? err.message : 'Não consegui ler essa skill.', true);
      }
    };
    formSkill.addEventListener('submit', e => { e.preventDefault(); procurarSkill(formSkill.link.value); });
    desenharSkills();
    desenharSugestoes();
    desenharAtalhos();
    if (app.real && !app.lite) window.oceanoNativo?.notchPrefs?.().then(p => { app.notchPrefs = p; desenhar(); });
    mostrarAba(r.params.get('aba') || abaMods);
    el.querySelector('.ajustes-abas')?.addEventListener('click', e => { const b = e.target.closest('[data-aba-mods]'); if (b) mostrarAba(b.dataset.abaMods); });

    const tirarMudou = app.on?.('mods-mudaram', () => { if (lista.isConnected) desenhar(); else tirarMudou?.(); });
    el.querySelector('.folha').addEventListener('click', async e => {
      if (e.target.closest('[data-notch-opcoes]')) return abrirOpcoesNotch(app, desenhar);
      const des = e.target.closest('[data-desativavel]');
      if (des) { desativaveis(app).find(d => d.id === des.dataset.desativavel)?.alternar(); return desenhar(); }
      const alt = e.target.closest('[data-alternar]');
      const rem = e.target.closest('[data-remover]');
      const novo = e.target.closest('[data-novo]');
      const abaB = e.target.closest('[data-aba-mods]');
      const opcao = e.target.closest('[data-skill-opcao]');
      const atualizar = e.target.closest('[data-skill-atualizar]');
      const ativaSkill = e.target.closest('[data-skill-ativa]');
      if (ativaSkill) { const id = ativaSkill.dataset.skillAtiva; app.skills.definirAtiva(id, ativaSkill.getAttribute('aria-pressed') !== 'true'); desenharSkills(); return; }
      const remSkill = e.target.closest('[data-skill-remover]');
      const sugestao = e.target.closest('[data-sugestao]');
      const conexao = e.target.closest('[data-conexao]');
      const atalho = e.target.closest('[data-atalho-url]');
      const moverAt = e.target.closest('[data-atalho-mover]');
      const ocultarAt = e.target.closest('[data-atalho-ocultar]');
      const tirarAt = e.target.closest('[data-atalho-tirar]');
      if (atalho) {
        const { atalhoUrl: url, atalhoIcone, atalhoNome } = atalho.dataset;
        if (iconesMesa.tem(url)) iconesMesa.remover(url); else iconesMesa.adicionar({ url, icone: atalhoIcone, nome: atalhoNome });
        desenhar(); desenharSkills(); desenharSugestoes(); desenharAtalhos();
        return;
      }
      if (moverAt || ocultarAt || tirarAt || e.target.closest('[data-atalho-restaurar]')) {
        const url = (moverAt || ocultarAt || tirarAt)?.dataset.url;
        if (moverAt) iconesMesa.mover(url, Number(moverAt.dataset.atalhoMover));
        else if (ocultarAt) iconesMesa.ocultar(url, ocultarAt.getAttribute('aria-pressed') !== 'true');
        else if (tirarAt) { iconesMesa.remover(url); desenhar(); desenharSkills(); desenharSugestoes(); }
        else iconesMesa.restaurar();
        desenharAtalhos();
        // o foco continua no mesmo botão depois de redesenhar a lista
        if (moverAt) listaAtalhos.querySelector(`[data-url="${CSS.escape(url)}"][data-atalho-mover="${moverAt.dataset.atalhoMover}"]:not([disabled])`)?.focus();
        return;
      }
      const sempreB = e.target.closest('[data-sempre]'), sempreOk = e.target.closest('[data-sempre-ativar]');
      const apagarMem = e.target.closest('[data-memoria-apagar]');
      if (e.target.closest('[data-sempre-cancelar]')) { avisoSempre.hidden = true; avisoSempre.innerHTML = ''; }
      else if (sempreB) {
        if (app.conexoes.sempreAtivo(sempreB.dataset.sempre)) { await app.conexoes.definirSempre(sempreB.dataset.sempre, false); avisar('Sempre ativo desligado. A memória local continua guardada.'); desenharSugestoes(); }
        else mostrarAvisoSempre(sempreB.dataset.sempre);
      } else if (sempreOk) {
        const id = sempreOk.dataset.sempreAtivar;
        avisoSempre.hidden = true; avisoSempre.innerHTML = ''; avisar('Guardando os textos principais…');
        try { await app.conexoes.definirSempre(id, true); avisar(`${CONEXOES[id].nome}: sempre ativo.`); }
        catch (err) { await app.conexoes.definirSempre(id, false); avisar(err.paraPessoa ? err.message : 'Não consegui guardar os textos.', true); }
        desenharSugestoes();
      } else if (apagarMem) {
        await app.conexoes.apagarMemoria(apagarMem.dataset.memoriaApagar).catch(() => {});
        avisar('Memória local apagada.'); desenharSugestoes();
      }
      else if (abaB) mostrarAba(abaB.dataset.abaMods);
      else if (sugestao) { procurarSkill(sugestao.dataset.sugestao); statusSkill.scrollIntoView({ block: 'center' }); }
      else if (conexao) {
        const id = conexao.dataset.conexao, on = !app.conexoes.ligada(id);
        app.conexoes.definir(id, on);
        avisar(`${CONEXOES[id].nome} ${on ? 'ligada' : 'desligada'}.`);
        desenharSugestoes();
      }
      else if (opcao) {
        const n = ++pedidoAtual; previa.innerHTML = '';
        abrirOpcao(opcao.dataset.skillOpcao, n).catch(err => { if (n === pedidoAtual) avisar(err.paraPessoa ? err.message : 'Não consegui ler essa skill.', true); });
      } else if (e.target.closest('[data-skill-instalar]') && candidata) {
        try {
          app.skills.instalar(candidata);
          avisar(`${candidata.nome} instalada. ${nomeAvatar(app)} já pode consultar.`);
          candidata = null; previa.innerHTML = ''; formSkill.link.value = '';
          desenharSkills(); desenharSugestoes();
        } catch (err) { avisar(err.message, true); }
      } else if (e.target.closest('[data-skill-cancelar]')) {
        pedidoAtual++; candidata = null; previa.innerHTML = ''; avisar('');
      } else if (atualizar) {
        const s = app.skills.achar(atualizar.dataset.skillAtualizar);
        if (s) procurarSkill(s.pedido, s.caminho);
      } else if (remSkill) {
        const s = app.skills.achar(remSkill.dataset.skillRemover);
        if (s) { app.skills.remover(s.id); iconesMesa.remover(`https://github.com/${s.dono}/${s.repo}`); desenharAtalhos(); avisar(`${s.nome} removida.`); desenharSkills(); desenharSugestoes(); }
      } else if (novo) {
        const mod = app.novoMod(novo.dataset.novo);
        app.navegar(`oceano://mods/editar?id=${mod.id}`);
      } else if (alt) {
        const m = app.mods.find(x => x.id === alt.dataset.alternar);
        await app.alternarMod(m, !m.ligado);
        desenhar();
      } else if (rem) {
        app.removerMod(app.mods.find(x => x.id === rem.dataset.remover));
        desenhar();
      }
    });
    const timer = setInterval(() => {
      for (const m of app.mods) {
        const s = el.querySelector(`[data-status="${m.id}"]`);
        if (s) { const [st, cls] = statusDoMod(m); s.textContent = st; s.className = 'status ' + cls; }
      }
    }, 700);
    return { desmontar: () => clearInterval(timer), aoLogar: () => {} };
  },
};

// ---------- editor ----------

const API = `-- tamanho do quadro (omita para automações)
largura, altura = 72, 36     -- largura = "auto" acompanha a janela
W, H                          -- tamanho atual

function _init() end          -- uma vez, ao iniciar
function _update() end        -- 30× por segundo
function _draw() end          -- 30× por segundo

-- desenho                      (permissão: tela)
cls(c)  pset(x,y,c)  line(x0,y0,x1,y1,c)
rect(x0,y0,x1,y1,c)  rectfill(...)
circ(x,y,r,c)  circfill(x,y,r,c)
print(texto,x,y,c,escala)

-- cores do tema atual
cor.fundo  cor.painel  cor.elevado  cor.borda
cor.texto  cor.suave  cor.acento  cor.destaque  cor.sol
N_CORES                       -- tamanho da paleta

-- controles                    (permissão: controles)
btn(i)  btnp(i)   -- 0 ← 1 → 2 ↑ 3 ↓ 4 espaço/z/toque 5 x

-- mouse                        (permissão: mouse)
local x, y, dentro, apertado = mouse()

-- digitação                    (permissão: teclado)
local k = tecla()   -- um caractere, "\b" (apagar), "\n" ou nil

-- memória, até 8 KB por mod    (permissão: memoria)
guardar("chave", valor)   -- texto, número ou booleano
local v = ler("chave")

-- som                          (permissão: som)
sfx("clique"|"bolha"|"fechar"|"pulo"|"moeda"|"erro"|"powerup"|"desligar"|"ruido")
sfx({onda="quadrada", de=440, ate=880, dur=0.1, vol=0.2})
sfx({onda="triangulo", notas={523,659,784}, dur=0.3})

-- navegador
oceano.on(evento, fn)         -- eventos: clique, aba_aberta,
                              -- aba_fechada, navegar, modo_jogo,
                              -- jogo_aberto, jogo_fechado
oceano.modo_jogo(true)        -- permissão: modo_jogo
oceano.congelar_abas()        -- permissão: abas
oceano.notificar("texto")     -- permissão: avisos
oceano.hora()                 -- {hora, min, seg}

-- utilidades
t()  rnd(n)  flr(n)  log(...)`;

const editar = {
  titulo: (r, app) => 'Código · ' + (app.mods.find(m => m.id === r.params.get('id'))?.nome || 'mod'),
  icone: 'editar',
  html: (r, app) => {
    const m = app.mods.find(x => x.id === r.params.get('id'));
    if (!m) return `<div class="folha">${cabecalho('editar', 'Mod não encontrado')}<p><a href="#" data-ir="oceano://mods">Voltar para os mods</a></p></div>`;
    return `
    <div class="folha larga">
      <a href="#" class="link-voltar" data-ir="oceano://mods">${icone('voltar')} Mods</a>
      ${cabecalho('editar', esc(m.nome), esc(m.descricao))}
      <div class="editor">
        <div class="editor-codigo px">
          <div class="editor-barra"><span>${esc(m.id)}.${m.linguagem === 'teal' ? 'tl' : 'lua'} <span class="chip lingua">${m.linguagem === 'teal' ? 'Teal · Lua com tipos' : 'Lua 5.4'}</span></span><span class="atalho-teclas">Ctrl/Cmd + Enter roda</span></div>
          <textarea spellcheck="false" autocapitalize="off" autocomplete="off" data-codigo aria-label="Código do mod"></textarea>
          <div class="editor-botoes">
            <button class="btn px" data-rodar>${icone('play')} Rodar</button>
            <button class="btn px secundario" data-restaurar>Restaurar original</button>
          </div>
        </div>
        <aside class="editor-lado">
          <div class="px painel">
            <div class="rotulo">Prévia</div>
            <div class="slot slot-previa" data-slot="editor:${m.id}"></div>
            <div class="disparos">
              <span>Disparar evento:</span>
              <button class="btn mini px" data-evento="clique">clique</button>
              <button class="btn mini px" data-evento="aba_aberta">aba_aberta</button>
              <button class="btn mini px" data-evento="jogo_aberto" data-arg="Steam">jogo_aberto("Steam")</button>
              <button class="btn mini px" data-evento="jogo_aberto" data-arg="Figma">jogo_aberto("Figma")</button>
              <button class="btn mini px" data-evento="jogo_fechado" data-arg="Steam">jogo_fechado</button>
            </div>
          </div>
          <div class="px painel">
            <div class="rotulo">Permissões</div>
            <div class="lista-perms">
              ${Object.entries(PERMISSOES).map(([p, d]) => `<label><input type="checkbox" data-perm="${p}"${m.permissoes.includes(p) ? ' checked' : ''}><b>${p}</b><span>${d}</span></label>`).join('')}
            </div>
            <p class="nota">Desmarque uma permissão e rode: a chamada correspondente passa a ser bloqueada.</p>
          </div>
          <div class="px painel">
            <div class="rotulo">Console</div>
            <ol class="console" data-console></ol>
          </div>
          <details class="px painel api"><summary class="rotulo">Referência da API</summary><pre>${esc(API)}</pre></details>
          ${m.linguagem === 'teal' ? `<details class="px painel api"><summary class="rotulo">Tipos da API (oceano.d.tl)</summary><pre data-tipos>carregando…</pre></details>` : ''}
        </aside>
      </div>
    </div>`;
  },
  montar(el, r, app) {
    const m = app.mods.find(x => x.id === r.params.get('id'));
    if (!m) return null;
    const ta = el.querySelector('[data-codigo]');
    const cons = el.querySelector('[data-console]');
    ta.value = m.codigo;

    const desenharConsole = () => {
      const logs = m.cart?.logs || [];
      cons.innerHTML = logs.length
        ? logs.slice(-60).map(l => {
            const pos = /^linha (\d+):(\d+)/.exec(l.msg);
            return `<li class="${l.tipo}${pos ? ' pula' : ''}"${pos ? ` data-linha="${pos[1]}" title="Ir para a linha ${pos[1]}"` : ''}><time>${hhmm(l.hora)}</time>${esc(l.msg)}</li>`;
          }).join('')
        : `<li class="vazio">${m.ligado ? 'Sem mensagens. Use log("...") no código.' : 'Mod desligado. Aperte Rodar para ligar.'}</li>`;
      cons.scrollTop = cons.scrollHeight;
    };
    const rodar = async () => { await app.salvarCodigo(m, ta.value); desenharConsole(); };

    // clicar num erro de tipo seleciona a linha no código
    cons.addEventListener('click', e => {
      const li = e.target.closest('[data-linha]');
      if (!li) return;
      const n = +li.dataset.linha;
      const linhas = ta.value.split('\n');
      const ini = linhas.slice(0, n - 1).reduce((s, l) => s + l.length + 1, 0);
      ta.focus();
      ta.setSelectionRange(ini, ini + (linhas[n - 1] || '').length);
      ta.scrollTop = Math.max(0, (n - 4) * parseFloat(getComputedStyle(ta).lineHeight));
    });
    const tipos = el.querySelector('[data-tipos]');
    if (tipos) fetch('mods/oceano.d.tl').then(r => r.text()).then(t => { tipos.textContent = t; });

    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); rodar(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: a, selectionEnd: b } = ta;
        ta.setRangeText('  ', a, b, 'end');
      }
    });
    el.querySelector('[data-rodar]').onclick = rodar;
    el.querySelector('[data-restaurar]').onclick = async () => { ta.value = m.original; await rodar(); };
    el.querySelectorAll('[data-perm]').forEach(cb => cb.onchange = async () => {
      const perms = [...el.querySelectorAll('[data-perm]:checked')].map(x => x.dataset.perm);
      await app.definirPermissoes(m, perms);
      desenharConsole();
    });
    el.querySelectorAll('[data-evento]').forEach(b => b.onclick = () => {
      const n = app.emitir(b.dataset.evento, ...(b.dataset.arg ? [b.dataset.arg] : []));
      m.cart?.log(`evento "${b.dataset.evento}" enviado (${n} ouvinte${n === 1 ? '' : 's'})`, 'evento');
    });
    desenharConsole();
    return { aoLogar: cart => { if (cart === m.cart) desenharConsole(); } };
  },
};

// ---------- temas ----------

// os pares de cores do tema que ficam abaixo do contraste mínimo (WCAG AA)
function problemasContraste(t) {
  const c = k => t.paleta[t.ui[k]];
  return CHECAGENS.filter(([a, b, min]) => contraste(c(a), c(b)) < min).map(([a, b, min, nome]) => `${nome}: ${contraste(c(a), c(b)).toFixed(1)}:1 (pede ${min}:1)`);
}

function cartaoTema(t, ativo) {
  const c = k => t.paleta[t.ui[k]];
  const ruins = problemasContraste(t);
  const acoes = t.extra
    ? `<a href="#" data-ir="oceano://temas/editar?id=${t.id}">Editar</a><a href="#" data-exportar="${t.id}">Baixar</a><a href="#" class="perigo" data-remover-tema="${t.id}">Remover</a>`
    : `<a href="#" data-ir="oceano://temas/editar?base=${t.id}">Copiar e editar</a>`;
  return `<div class="tema-item">
    <button class="tema px${ativo ? ' ativo' : ''}" data-tema="${t.id}" aria-pressed="${ativo}"
      style="--t-fundo:${c('fundo')};--t-painel:${c('painel')};--t-texto:${c('texto')};--t-acento:${c('acento')};--t-destaque:${c('destaque')};--t-borda:${c('borda')}">
      <span class="tema-mini">
        <span class="tm-abas"><i></i><i></i></span>
        <span class="tm-corpo"><b>Aa</b><em></em></span>
      </span>
      <span class="tema-paleta">${t.paleta.map(h => `<i style="background:${h}"></i>`).join('')}</span>
      <span class="tema-nome">${esc(t.nome)}${t.extra ? ' <span class="chip">seu</span>' : ''}${ruins.length ? ` <span class="chip aviso-contraste" title="${esc(ruins.join(' · '))}">contraste baixo</span>` : ''}${ativo ? ' · em uso' : ''}</span>
      <span class="tema-desc">${esc(t.descricao)} ${t.paleta.length} cores.</span>
    </button>
    <div class="tema-acoes">${acoes}</div>
  </div>`;
}

function baixarTema(t) {
  const { extra, ...limpo } = t;
  const blob = new Blob([JSON.stringify(limpo, null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${t.id}.oceano.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const temas = {
  titulo: () => 'Temas',
  icone: 'temas',
  html: (r, app) => `
    <div class="folha">
      ${cabecalho('temas', 'Temas', 'Todo tema do Oceano é uma paleta limitada de até 16 cores. A interface, o mar e os mods usam só essas cores, então tudo combina.')}
      <div class="barra-acoes">
        <button class="btn px" data-ir="oceano://temas/editar">${icone('mais')} Criar tema</button>
        <label class="btn px secundario">${icone('cartucho')} Instalar arquivo .oceano<input type="file" accept=".json,.oceano,application/json" data-instalar hidden></label>
        <button class="btn px secundario" data-ir="oceano://avatar?area=criar">${icone('perfil')} Editar avatar</button>
        <span class="nota" data-instalar-msg></span>
      </div>
      <div class="grade-temas" data-temas></div>
      <section class="px bloco">
        <h2>Temas da comunidade</h2>
        <p>Qualquer pessoa pode criar um tema e compartilhar. Baixe o seu, suba num repositório público do GitHub com o nome <code>${ARQUIVO_TEMA}</code> e coloque o tópico <code>${TOPICO_TEMA}</code>. Ele aparece aqui para todo mundo.</p>
        <div class="barra-acoes tema-link">
          <input data-tema-link aria-label="Link do tema no GitHub" placeholder="https://github.com/pessoa/meu-tema" autocomplete="off" spellcheck="false">
          <button class="btn px" data-tema-ver>Ver tema</button>
          <button class="btn px secundario" data-tema-procurar>Procurar temas</button>
        </div>
        <p class="nota" data-tema-com-msg role="status"></p>
        <div class="grade-temas" data-tema-achados></div>
        <p class="nota">Só entram cores. O Oceano confere cada arquivo antes de mostrar: com qualquer campo a mais, código ou valor errado, ele bloqueia o arquivo inteiro. Nada é instalado sem o seu clique.</p>
      </section>
      <details class="px bloco tema-mmf" data-tema-mmf>
        <summary>Tema do MicromediaFlash</summary>
        <p class="nota">O editor de animação tem visual próprio, que não muda com o tema do navegador. Só troque se quiser. Vale ao abrir o editor de novo.</p>
        <label class="campo">Visual do editor<select data-mmf-tema></select></label>
      </details>
      <section class="px bloco">
        <h2>O mar</h2>
        <div class="controles">
          ${htmlHora(app)}
          <p class="nota">Cada tema pode fixar a hora (o Pôr do Sol fica no fim da tarde) ou seguir o relógio. Pixelizar, cores, tamanho do pixel, ondas e chuva fazem parte de cada tema: ajuste em <a href="#" data-ir="oceano://temas/editar?${app.tema.extra ? 'id' : 'base'}=${app.tema.id}">Estilo do mar</a>.</p>
        </div>
      </section>
      <section class="px bloco">
        <h2>Formato .oceano</h2>
        <p>Um tema é só um arquivo JSON: nenhuma linha de código, por isso é seguro instalar temas da comunidade. Antes de instalar, o Oceano confere o formato e bloqueia o arquivo se houver qualquer campo desconhecido. Este é o tema em uso:</p>
        <pre class="json" data-json></pre>
      </section>
    </div>`,
  montar(el, r, app) {
    const grade = el.querySelector('[data-temas]');
    const desenhar = () => {
      grade.innerHTML = app.ordemTemas.map(id => cartaoTema(app.temas[id], app.tema.id === id)).join('');
      const { extra, ...limpo } = app.tema;
      el.querySelector('[data-json]').textContent = JSON.stringify(limpo, null, 2);
    };
    desenhar();
    const tirarHora = ligarHora(el, app);
    ligarClima(el, app);
    grade.onclick = e => {
      const b = e.target.closest('[data-tema]');
      const exp = e.target.closest('[data-exportar]');
      const rem = e.target.closest('[data-remover-tema]');
      if (b) {
        app.aplicarTema(b.dataset.tema);
        // escolher um tema mostra a hora dele (se você tinha fixado uma hora, volta a seguir o tema)
        if (app.horaCena().modo === 'fixa') app.definirHoraCena({ modo: 'tema' });
      } else if (exp) { e.preventDefault(); baixarTema(app.temas[exp.dataset.exportar]); return; }
      else if (rem) { e.preventDefault(); app.removerTema(rem.dataset.removerTema); }
      else return;
      desenhar();
    };
    el.querySelector('[data-instalar]').onchange = async e => {
      const arq = e.target.files[0];
      e.target.value = '';
      const msg = el.querySelector('[data-instalar-msg]');
      if (!arq) return;
      if (arq.size > 64 * 1024) { msg.textContent = 'Arquivo grande demais para um tema (máx. 64 KB).'; return; }
      const res = lerPaleta(await arq.text());
      if (!res.tema) { msg.textContent = (res.erros || ['Este arquivo não é um tema .oceano.']).join(' '); return; }
      const id = app.salvarTema(res.tema);
      app.aplicarTema(id);
      msg.textContent = `Tema "${res.tema.nome}" instalado.`;
      desenhar();
    };
    // temas da comunidade: nada sai daqui sem o clique da pessoa, e nada entra sem passar pela conferência
    const achados = el.querySelector('[data-tema-achados]'), msgCom = el.querySelector('[data-tema-com-msg]');
    let candidatos = [];
    const mostrar = () => {
      achados.innerHTML = candidatos.map((c, i) => `<div class="tema-item">${cartaoTema({ ...c.tema, extra: false }, false).replace(/<div class="tema-acoes">[\s\S]*$/, '').replace(/<div class="tema-item">/, '').replace('data-tema="', 'data-candidato="')}
        <div class="tema-acoes"><a href="#" data-instalar-candidato="${i}">Instalar</a>${c.repo ? `<a href="#" data-ir="https://github.com/${esc(c.repo)}">Ver no GitHub</a>` : ''}</div></div>`).join('');
    };
    const verLink = async () => {
      const url = enderecoDoTema(el.querySelector('[data-tema-link]').value);
      if (!url) { msgCom.textContent = 'Use um link do GitHub: o repositório ou o arquivo do tema.'; return; }
      msgCom.textContent = 'Conferindo…';
      app.registrarRede('raw.githubusercontent.com', 'Baixar um tema (você pediu)', 'o endereço do tema');
      const r = await baixarTemaDoLink(url).catch(() => ({ erros: ['Não consegui falar com o GitHub.'] }));
      if (!r.tema) { candidatos = []; mostrar(); msgCom.textContent = r.erros.join(' '); return; }
      candidatos = [{ tema: r.tema }]; mostrar(); msgCom.textContent = 'Tema conferido: só tem cores.';
    };
    el.querySelector('[data-tema-ver]').onclick = verLink;
    el.querySelector('[data-tema-procurar]').onclick = async () => {
      msgCom.textContent = 'Procurando…';
      app.registrarRede('api.github.com', 'Procurar temas da comunidade (você pediu)', 'nada além da busca');
      try {
        const r = await procurarTemas();
        candidatos = r.temas; mostrar();
        msgCom.textContent = r.temas.length ? `${r.temas.length} ${r.temas.length === 1 ? 'tema conferido' : 'temas conferidos'}${r.bloqueados ? `, ${r.bloqueados} ${r.bloqueados === 1 ? 'bloqueado' : 'bloqueados'}` : ''}.` : `Ainda não há temas com o tópico ${TOPICO_TEMA}${r.bloqueados ? ` válidos (${r.bloqueados} bloqueados)` : ''}.`;
      } catch (e) { msgCom.textContent = e.message; }
    };
    achados.addEventListener('click', e => {
      const b = e.target.closest('[data-instalar-candidato]');
      if (!b) return;
      e.preventDefault();
      const { tema } = candidatos[+b.dataset.instalarCandidato];
      const id = app.salvarTema(tema);
      app.aplicarTema(id);
      msgCom.textContent = `Tema "${tema.nome}" instalado.`;
      desenhar();
    });
    // o visual do editor de animação fica guardado, só abre aqui se a pessoa clicar
    el.querySelector('[data-tema-mmf]').addEventListener('toggle', async e => {
      const sel = el.querySelector('[data-mmf-tema]');
      if (!e.target.open || sel.options.length) return;
      try {
        const { THEMES, DEFAULT_THEME } = await import('../micromediaflash/js/themes.js');
        let atual = DEFAULT_THEME;
        try { atual = JSON.parse(localStorage.getItem('mmf.theme')) || DEFAULT_THEME; } catch {}
        sel.innerHTML = THEMES.map(t => `<option value="${esc(t.id)}" ${t.id === atual ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
        sel.onchange = () => { localStorage.setItem('mmf.theme', JSON.stringify(sel.value)); app.aviso('Visual do editor trocado.', 'Temas'); };
      } catch { sel.closest('label').textContent = 'O editor de animação não está nesta instalação.'; }
    });
    return { desmontar: tirarHora };
  },
};

// ---------- editor de temas ----------

const ROTULOS_MAR = {
  pixel: ['Tamanho do pixel', v => `${v}px`],
  escala: ['Tamanho do padrão', v => `${v}×`],
  forca: ['Força do pixelizado', v => `${Math.round(v * 100)}%`],
  contraste: ['Contraste', v => v.toFixed(2)],
  brilho: ['Brilho', v => (v > 0 ? '+' : '') + v.toFixed(2)],
  ondas: ['Altura das ondas', v => `${Math.round(v * 100)}%`],
  velocidade: ['Velocidade', v => `${Math.round(v * 100)}%`],
  espuma: ['Espuma', v => `${Math.round(v * 100)}%`],
  chuva: ['Chuva', v => (v ? `${Math.round(v * 100)}%` : 'sem chuva')],
};
const OPCOES_MAR = { contorno: 'Contorno escuro', animar: 'Animar o ruído', nuvens: 'Nuvens', farol: 'Farol', relampago: 'Relâmpago (com chuva)' };
const textoHora = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

const editorTema = {
  titulo: r => (r.params.get('id') ? 'Editar tema' : 'Novo tema'),
  icone: 'temas',
  html: r => `
    <div class="folha larga">
      <a href="#" class="link-voltar" data-ir="oceano://temas">${icone('voltar')} Temas</a>
      ${cabecalho('temas', r.params.get('id') ? 'Editar tema' : 'Novo tema', 'Mude as cores e veja o navegador inteiro mudar na hora: abas, páginas, o mar e os mods. Nada é salvo até você apertar Salvar.')}
      <div class="editor-tema">
        <section class="px bloco et-simples">
          <h2>Cores</h2>
          <p class="nota">Escolha uma cor e veja na hora. Passe o mouse ou o foco numa linha: a miniatura mostra onde ela aparece.</p>
          <div class="et-simples-grade">
            <div class="et-lista" data-cores-simples></div>
            <div class="et-mini" data-mini aria-hidden="true">
              <div data-area="painel" class="mi-abas"><i data-area="destaque"></i><i></i></div>
              <div data-area="elevado" class="mi-barra"><b data-area="acento"></b><span data-area="borda"></span></div>
              <div data-area="fundo" class="mi-pagina">
                <h4 data-area="texto">Título da página</h4><p data-area="suave">Texto secundário</p>
                <u data-area="acento">um link</u> <mark data-area="sol">seleção</mark>
              </div>
            </div>
          </div>
        </section>
        <div class="et-col">
          <section class="px bloco">
            <h2>Nome</h2>
            <label class="campo">Nome<input data-nome maxlength="40" autocomplete="off"></label>
            <label class="campo">Descrição<input data-desc maxlength="160" autocomplete="off"></label>
          </section>
          <section class="px bloco">
            <h2>Paleta · <span data-n></span>/${MAX_CORES}</h2>
            <div class="et-paleta" data-paleta></div>
            <p class="nota">Clique numa cor para trocar. Menos cores deixam o visual mais forte: a Lagoa tem só 6.</p>
          </section>
          <section class="px bloco">
            <h2>Importar paleta</h2>
            <p class="nota">Cole cores (#rrggbb), um arquivo .hex do Lospec, .gpl do GIMP/Aseprite ou um tema .oceano.</p>
            <textarea class="et-importar" data-importar rows="4" spellcheck="false" placeholder="#1a1c2c&#10;#5d275d&#10;#b13e53&#10;..."></textarea>
            <div class="barra-acoes">
              <button class="btn px" data-usar-import>Usar estas cores</button>
              <label class="btn px secundario">Abrir arquivo<input type="file" accept=".hex,.gpl,.txt,.json" data-arquivo hidden></label>
            </div>
            <p class="nota" data-import-msg></p>
          </section>
        </div>
        <div class="et-col">
          <section class="px bloco">
            <h2>Onde cada cor entra</h2>
            <div class="et-tokens" data-tokens></div>
            <button class="btn px secundario" data-auto>Distribuir automaticamente</button>
          </section>
          <section class="px bloco">
            <h2>Legibilidade</h2>
            <p class="nota">Acessibilidade vem antes do estilo: um tema bonito que ninguém lê não funciona. Mantenha todas as linhas "ok" (contraste WCAG AA). <a href="/docs/ACESSIBILIDADE-TEMAS.md" target="_blank" rel="noopener">Guia de boas práticas</a></p>
            <ul class="et-contraste" data-contraste></ul>
          </section>
          <section class="px bloco">
            <h2>Prévia de um mod</h2>
            <div class="slot slot-previa" data-slot="editor:relogio-mare"></div>
          </section>
        </div>
      </div>
      <section class="px bloco et-mar">
        <h2>Estilo do mar</h2>
        <div class="et-mar-grade">
          <div>
            <canvas class="et-mar-previa" data-mar-previa aria-label="Prévia do mar"></canvas>
            <div class="rotulo">Cores do mar</div>
            <div class="et-escolha et-mar-cores" data-mar-cores></div>
            <p class="nota">Escolha quais cores da paleta o mar usa. Menos cores, mais pixel art (mínimo 2).</p>
          </div>
          <div>
            <div class="rotulo">Pixelizar</div>
            <div class="et-dithers" data-dithers role="radiogroup" aria-label="Tipo de pixelizado"></div>
            <div class="et-ajustes" data-ajustes></div>
            <div class="et-opcoes" data-opcoes></div>
            <button class="btn px secundario" data-mar-padrao>Restaurar o mar padrão</button>
          </div>
        </div>
      </section>
      <div class="et-rodape px">
        <button class="btn px" data-salvar>Salvar e usar</button>
        <button class="btn px secundario" data-baixar>Baixar .oceano</button>
        <button class="btn px secundario" data-ir="oceano://temas">Descartar</button>
        <span class="nota" data-msg></span>
      </div>
      <section class="px bloco">
        <h2>Arquivo .oceano</h2>
        <pre class="json" data-json></pre>
      </section>
    </div>`,
  montar(el, r, app) {
    const temaSalvo = app.tema.id;
    const idEditado = app.temas[r.params.get('id')]?.extra ? r.params.get('id') : null;
    const base = app.temas[idEditado || r.params.get('base')] || app.tema;
    const rascunho = {
      nome: idEditado ? base.nome : `${base.nome} (meu)`,
      descricao: idEditado ? base.descricao : '',
      paleta: [...base.paleta],
      ui: { ...base.ui },
      mar: normalizarMar(base.mar, base.paleta.length),
    };
    let salvo = false;
    const $ = s => el.querySelector(s);
    $('[data-nome]').value = rascunho.nome;
    $('[data-desc]').value = rascunho.descricao;

    const montarTema = () => ({ formato: FORMATO, id: slug(rascunho.nome), nome: rascunho.nome, autor: 'você', descricao: rascunho.descricao, paleta: rascunho.paleta, ui: rascunho.ui, mar: rascunho.mar });

    // prévia: o mar copia cada quadro para este canvas
    const previa = $('[data-mar-previa]');
    const medirPrevia = () => { previa.width = app.mar.canvas.width; previa.height = app.mar.canvas.height; };
    medirPrevia();
    app.mar.espelhos.add(previa);
    window.addEventListener('resize', medirPrevia);

    const desenharMar = () => {
      const m = rascunho.mar;
      const usadas = m.cores || rascunho.paleta.map((_, i) => i);
      $('[data-mar-cores]').innerHTML = rascunho.paleta.map((c, i) =>
        `<button role="checkbox" aria-checked="${usadas.includes(i)}" data-mar-cor="${i}" style="background:${c}" title="${c}"></button>`).join('');
      $('[data-dithers]').innerHTML = Object.entries(DITHERS).map(([k, nome]) =>
        `<button class="et-dither px" role="radio" aria-checked="${m.dither === k}" data-dither="${k}">${nome}</button>`).join('');
      const relogio = m.hora === 'relogio';
      $('[data-ajustes]').innerHTML = `
        <div class="et-opcoes" style="margin:4px 0"><label><input type="checkbox" data-mar-relogio${relogio ? ' checked' : ''}> Hora: seguir o relógio</label></div>
        <label class="linha"><span>Hora do dia</span><input type="range" min="0" max="24" step="0.25" value="${relogio ? 12 : m.hora}" data-mar-hora${relogio ? ' disabled' : ''}><output>${relogio ? 'relógio' : textoHora(m.hora)}</output></label>`
        + Object.entries(AJUSTES_MAR).map(([k, [min, max]]) => {
        const [nome, fmt] = ROTULOS_MAR[k];
        const passo = k === 'pixel' || k === 'escala' ? 1 : 0.05;
        return `<label class="linha"><span>${nome}</span><input type="range" min="${min}" max="${max}" step="${passo}" value="${m[k]}" data-ajuste="${k}"><output>${fmt(m[k])}</output></label>`;
      }).join('');
      $('[data-opcoes]').innerHTML = Object.entries(OPCOES_MAR).map(([k, nome]) =>
        `<label><input type="checkbox" data-opcao="${k}"${m[k] ? ' checked' : ''}${k === 'animar' && m.dither !== 'ruido' ? ' disabled' : ''}> ${nome}</label>`).join('');
    };

    const desenharPaleta = () => {
      $('[data-n]').textContent = rascunho.paleta.length;
      $('[data-paleta]').innerHTML = rascunho.paleta.map((c, i) => `
        <div class="et-cor">
          <label style="background:${c}" title="${c}"><input type="color" value="${c}" data-cor="${i}" aria-label="Cor ${i + 1}"></label>
          <span>${i}</span>
          ${rascunho.paleta.length > 2 ? `<button data-tirar="${i}" aria-label="Remover cor ${i}">${icone('fechar')}</button>` : ''}
        </div>`).join('')
        + (rascunho.paleta.length < MAX_CORES ? `<button class="et-mais" data-mais aria-label="Adicionar cor">${icone('mais')}</button>` : '');
    };

    const desenharTokens = () => {
      $('[data-tokens]').innerHTML = Object.entries(TOKENS).map(([t, desc]) => `
        <div class="et-token">
          <div><b>${t}</b><span>${desc}</span></div>
          <div class="et-escolha" role="radiogroup" aria-label="${t}">
            ${rascunho.paleta.map((c, i) => `<button role="radio" aria-checked="${rascunho.ui[t] === i}" data-token="${t}" data-i="${i}" style="background:${c}" title="${c}"></button>`).join('')}
          </div>
        </div>`).join('');
    };

    const desenharContraste = () => {
      const cor = k => rascunho.paleta[rascunho.ui[k]];
      $('[data-contraste]').innerHTML = CHECAGENS.map(([a, b, min, nome]) => {
        const v = contraste(cor(a), cor(b));
        const ok = v >= min;
        return `<li class="${ok ? 'ok' : 'ruim'}"><span class="amostra" style="color:${cor(a)};background:${cor(b)}">Aa</span>
          <span>${nome}</span><b>${v.toFixed(1)}:1</b><em>${ok ? 'ok' : `pede ${min}:1`}</em></li>`;
      }).join('');
    };

    const aplicar = () => {
      rascunho.mar = normalizarMar(rascunho.mar, rascunho.paleta.length);
      const t = montarTema();
      app.aplicarTemaObj(t);
      $('[data-json]').textContent = JSON.stringify(t, null, 2);
      desenharContraste();
    };

    // cor por parte da tela: se a cor era dividida com outra parte, esta ganha uma cor só dela
    const desenharMini = () => {
      const m = $('[data-mini]');
      for (const t of Object.keys(TOKENS)) m.style.setProperty('--m-' + t, rascunho.paleta[rascunho.ui[t]]);
    };
    const desenharSimples = () => {
      $('[data-cores-simples]').innerHTML = Object.entries(TOKENS).map(([t, desc]) => `
        <label class="et-linha" data-linha="${t}"><input type="color" value="${rascunho.paleta[rascunho.ui[t]]}" data-cor-token="${t}" aria-label="${desc}"><span>${desc}</span></label>`).join('');
      desenharMini();
    };
    const destacar = t => { for (const a of $('[data-mini]').querySelectorAll('[data-area]')) a.classList.toggle('aceso', a.dataset.area === t); };
    $('[data-cores-simples]').addEventListener('input', e => {
      const t = e.target.dataset.corToken;
      if (!t) return;
      const i = rascunho.ui[t], dividida = Object.keys(TOKENS).some(k => k !== t && rascunho.ui[k] === i);
      if (dividida && rascunho.paleta.length < MAX_CORES) { rascunho.paleta.push(e.target.value); rascunho.ui[t] = rascunho.paleta.length - 1; }
      else rascunho.paleta[i] = e.target.value;
      desenharMini(); desenharPaleta(); desenharTokens(); aplicar();
    });
    for (const ev of ['pointerover', 'focusin']) $('[data-cores-simples]').addEventListener(ev, e => destacar(e.target.closest('[data-linha]')?.dataset.linha));
    $('[data-cores-simples]').addEventListener('pointerleave', () => destacar(null));
    $('[data-cores-simples]').addEventListener('focusout', () => destacar(null));

    const tudo = () => { desenharPaleta(); desenharTokens(); desenharSimples(); aplicar(); desenharMar(); };
    tudo();

    $('[data-nome]').oninput = e => { rascunho.nome = e.target.value; aplicar(); };
    $('[data-desc]').oninput = e => { rascunho.descricao = e.target.value; aplicar(); };

    $('[data-paleta]').addEventListener('input', e => {
      const i = e.target.dataset.cor;
      if (i == null) return;
      rascunho.paleta[+i] = e.target.value;
      e.target.parentElement.style.background = e.target.value;
      desenharTokens(); desenharSimples(); aplicar();
    });
    $('[data-paleta]').addEventListener('click', e => {
      const tirar = e.target.closest('[data-tirar]');
      if (tirar) {
        const i = +tirar.dataset.tirar;
        rascunho.paleta.splice(i, 1);
        // tokens que apontavam para depois da cor removida descem uma posição
        for (const t in rascunho.ui) if (rascunho.ui[t] > i || rascunho.ui[t] === rascunho.paleta.length) rascunho.ui[t] = Math.max(0, rascunho.ui[t] - 1);
        if (rascunho.mar.cores) rascunho.mar.cores = rascunho.mar.cores.filter(x => x !== i).map(x => (x > i ? x - 1 : x));
        tudo();
      } else if (e.target.closest('[data-mais]')) {
        rascunho.paleta.push(rascunho.paleta[rascunho.paleta.length - 1]);
        tudo();
      }
    });
    $('[data-tokens]').addEventListener('click', e => {
      const b = e.target.closest('[data-token]');
      if (!b) return;
      rascunho.ui[b.dataset.token] = +b.dataset.i;
      desenharTokens(); desenharSimples(); aplicar();
    });
    $('[data-auto]').onclick = () => { rascunho.ui = tokensAutomaticos(rascunho.paleta); tudo(); };

    const blocoMar = $('.et-mar');
    blocoMar.addEventListener('click', e => {
      const cor = e.target.closest('[data-mar-cor]');
      const dither = e.target.closest('[data-dither]');
      const m = rascunho.mar;
      if (cor) {
        const i = +cor.dataset.marCor;
        const usadas = new Set(m.cores || rascunho.paleta.map((_, j) => j));
        if (usadas.has(i)) { if (usadas.size > 2) usadas.delete(i); } else usadas.add(i);
        m.cores = usadas.size === rascunho.paleta.length ? null : [...usadas];
      } else if (dither) {
        m.dither = dither.dataset.dither;
      } else if (e.target.closest('[data-mar-padrao]')) {
        rascunho.mar = normalizarMar({}, rascunho.paleta.length);
      } else return;
      aplicar(); desenharMar();
    });
    blocoMar.addEventListener('input', e => {
      if (e.target.matches('[data-mar-hora]')) {
        rascunho.mar.hora = +e.target.value;
        e.target.nextElementSibling.textContent = textoHora(rascunho.mar.hora);
        aplicar();
        return;
      }
      const k = e.target.dataset.ajuste;
      if (!k) return;
      rascunho.mar[k] = +e.target.value;
      e.target.nextElementSibling.textContent = ROTULOS_MAR[k][1](rascunho.mar[k]);
      aplicar();
    });
    blocoMar.addEventListener('change', e => {
      if (e.target.matches('[data-mar-relogio]')) {
        rascunho.mar.hora = e.target.checked ? 'relogio' : Math.round(app.mar.hora() * 4) / 4;
        aplicar(); desenharMar();
        return;
      }
      const k = e.target.dataset.opcao;
      if (!k) return;
      rascunho.mar[k] = e.target.checked;
      aplicar();
    });

    const importar = texto => {
      const msg = $('[data-import-msg]');
      const res = lerPaleta(texto);
      if (res.erros) { msg.textContent = res.erros.join(' '); return; }
      if (res.tema) {
        Object.assign(rascunho, { nome: res.tema.nome, descricao: res.tema.descricao, paleta: res.tema.paleta, ui: res.tema.ui, mar: res.tema.mar });
        $('[data-nome]').value = rascunho.nome;
        $('[data-desc]').value = rascunho.descricao;
        msg.textContent = 'Tema importado.';
      } else {
        rascunho.paleta = res.paleta;
        rascunho.ui = tokensAutomaticos(res.paleta);
        rascunho.mar.cores = null;
        msg.textContent = `${res.paleta.length} cores importadas e distribuídas automaticamente${res.cortadas ? ` (${res.cortadas} ficaram de fora: o limite é ${MAX_CORES})` : ''}.`;
      }
      tudo();
    };
    $('[data-usar-import]').onclick = () => importar($('[data-importar]').value);
    $('[data-arquivo]').onchange = async e => {
      const arq = e.target.files[0];
      e.target.value = '';
      if (arq && arq.size <= 64 * 1024) importar(await arq.text());
      else if (arq) $('[data-import-msg]').textContent = 'Arquivo grande demais (máx. 64 KB).';
    };

    $('[data-baixar]').onclick = () => {
      const { tema, erros } = validarTema(montarTema());
      if (tema) baixarTema(tema); else $('[data-msg]').textContent = erros.join(' ');
    };
    $('[data-salvar]').onclick = () => {
      const { tema, erros } = validarTema(montarTema());
      if (!tema) { $('[data-msg]').textContent = erros.join(' '); return; }
      // contraste abaixo do mínimo: avisa e pede confirmação antes de salvar
      const ruins = problemasContraste(tema);
      if (ruins.length && !confirm(`Este tema fica difícil de ler em ${ruins.length} ponto(s):\n\n${ruins.join('\n')}\n\nAcessibilidade é prioridade no Oceano. Salvar mesmo assim?`)) return;
      const id = app.salvarTema(tema, idEditado);
      salvo = true;
      app.aplicarTema(id);
      app.aviso(`Tema "${tema.nome}" salvo e em uso`, 'Temas');
      app.navegar('oceano://temas');
    };

    // saiu sem salvar: volta ao tema que estava em uso
    return {
      desmontar: () => {
        app.mar.espelhos.delete(previa);
        window.removeEventListener('resize', medirPrevia);
        if (!salvo) app.aplicarTema(temaSalvo);
      },
    };
  },
};

// ---------- modo jogo ----------

const PESO_PAGINA = { 'nova-aba': 38, mods: 26, editar: 44, temas: 24, jogo: 30, rede: 22, sobre: 18, offline: 52 };

// No app, os números vêm do próprio Chromium (app.getAppMetrics): RAM e CPU de cada processo.
function processosReais(app) {
  const { processos: ps, conteudos } = app.metricas;
  const porPid = new Map(ps.map(p => [p.pid, p]));
  const usados = new Set();
  const linhas = [];
  const adicionar = (nome, tipo, pid) => {
    const p = porPid.get(pid);
    if (!p || usados.has(pid)) return;
    usados.add(pid);
    linhas.push({ nome, tipo, ram: p.ram / 1024, cpu: p.cpu, real: true });
  };
  adicionar('Oceano (processo principal)', 'navegador', ps.find(p => p.tipo === 'Browser')?.pid);
  adicionar(`Interface + mar (${Math.round(app.mar.fps)} fps) + mods Lua`, 'interface', conteudos.find(c => c.tipo === 'window')?.pid);
  adicionar('GPU (desenha o mar e as páginas)', 'gpu', ps.find(p => p.tipo === 'GPU')?.pid);
  for (const a of app.abas) {
    if (!a.wcId) continue;
    const pid = conteudos.find(c => c.id === a.wcId)?.pid;
    const titulo = (a.titulo || a.historico[a.pos]).slice(0, 40);
    adicionar(`Aba: ${titulo}`, a.congelada ? 'congelada' : a === app.abaAtiva ? 'aba ativa' : 'aba', pid);
  }
  const resto = ps.filter(p => !usados.has(p.pid));
  if (resto.length) linhas.push({
    nome: `Outros (${resto.length}: rede, áudio, armazenamento…)`, tipo: 'serviços', real: true,
    ram: resto.reduce((t, p) => t + p.ram, 0) / 1024, cpu: resto.reduce((t, p) => t + p.cpu, 0),
  });
  for (const m of app.mods) if (m.cart && !m.cart.erro && m.cart.temTela) {
    linhas.push({ nome: `Mod: ${m.nome} · ${m.cart.msPorQuadro.toFixed(2)} ms`, tipo: 'mod lua', ram: null, cpu: m.cart.msPorQuadro * 3, real: true });
  }
  return linhas;
}

function processos(app) {
  if (app.real && app.metricas) return processosReais(app);
  const ruido = (s, a) => a * (0.5 + 0.5 * Math.sin(performance.now() / 900 + s * 7.3));
  const linhas = [
    { nome: 'Oceano (interface)', tipo: 'navegador', ram: 92 + ruido(1, 6), cpu: 1 + ruido(2, 2) },
    { nome: `Mar (WebGL) · ${Math.round(app.mar.fps)} fps`, tipo: 'tema', ram: 34, cpu: app.mar.fps * 0.12, real: true },
  ];
  app.abas.forEach((a, i) => {
    const pag = rotaDe(a.historico[a.pos]).pagina;
    const ativa = a === app.abaAtiva;
    const cong = app.congeladas && !ativa;
    linhas.push({
      nome: `Aba: ${pag}`, tipo: cong ? 'congelada' : ativa ? 'aba ativa' : 'aba',
      ram: (PESO_PAGINA[pag] || 30) * (cong ? 0.35 : 1) + ruido(i + 3, 4),
      cpu: cong ? 0 : ativa ? 2 + ruido(i, 4) : 0.4 + ruido(i, 1.2),
    });
  });
  for (const m of app.mods) if (m.cart && !m.cart.erro) {
    linhas.push({ nome: `Mod: ${m.nome} · ${m.cart.msPorQuadro.toFixed(2)} ms`, tipo: 'mod lua', ram: 0.6, cpu: m.cart.msPorQuadro * 3, real: true });
  }
  return linhas;
}

const jogo = {
  titulo: () => 'Modo jogo',
  icone: 'jogo',
  html: (r, app) => `
    <div class="folha">
      ${cabecalho('jogo', 'Modo jogo', 'Quando um jogo abre, o Oceano sai da frente: congela abas em segundo plano, pausa animações e limita RAM, CPU e rede.')}
      <div class="px bloco jogo-topo">
        <button class="interruptor" data-modo aria-pressed="${app.modoJogo}"><span></span></button>
        <div><b data-modo-txt></b><p data-modo-desc></p></div>
      </div>
      <section class="px bloco">
        <h2>Limites</h2>
        <label class="linha"><input type="checkbox" data-lim="ligado"${app.limites.ligado ? ' checked' : ''}> Aplicar limites</label>
        <label class="linha">RAM <input type="range" min="256" max="8192" step="256" data-lim="ram" value="${app.limites.ram}"><output data-out="ram"></output></label>
        <label class="linha">CPU <input type="range" min="10" max="100" step="5" data-lim="cpu" value="${app.limites.cpu}"><output data-out="cpu"></output></label>
        <label class="linha">Rede <input type="range" min="1" max="100" step="1" data-lim="rede" value="${app.limites.rede}"><output data-out="rede"></output></label>
      </section>
      <section class="px bloco">
        <h2>Consumo agora</h2>
        <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Processo</th><th>Tipo</th><th>RAM</th><th>CPU</th></tr></thead><tbody data-proc></tbody></table></div>
        <p class="nota">${app.real ? 'Tudo medido de verdade pelo Chromium. Os mods rodam dentro do processo da interface; a coluna CPU deles é estimada pelo tempo de cada quadro.' : 'RAM e CPU das abas são simulados. O fps do mar e os milissegundos dos mods são medidos de verdade.'}</p>
      </section>
    </div>`,
  montar(el, r, app) {
    const fmt = { ram: v => (v >= 1024 ? (v / 1024).toFixed(1) + ' GB' : v + ' MB'), cpu: v => v + '%', rede: v => v + ' Mbps' };
    const atualizar = () => {
      el.querySelector('[data-modo]').setAttribute('aria-pressed', app.modoJogo);
      el.querySelector('[data-modo-txt]').textContent = app.modoJogo ? 'Modo jogo ligado' : 'Modo jogo desligado';
      el.querySelector('[data-modo-desc]').textContent = app.modoJogo
        ? `Mar a 12 fps · mods fora da tela pausados${app.congeladas ? ' · abas de fundo congeladas' : ''}`
        : 'Tudo em velocidade normal.';
      for (const k of ['ram', 'cpu', 'rede']) el.querySelector(`[data-out="${k}"]`).textContent = fmt[k](app.limites[k]);
      const linhas = processos(app);
      const total = linhas.reduce((s, l) => s + (l.ram || 0), 0);
      const estourou = app.limites.ligado && total > app.limites.ram;
      el.querySelector('[data-proc]').innerHTML = linhas.map(l => `<tr class="${l.tipo === 'congelada' ? 'fria' : ''}">
          <td>${esc(l.nome)}${l.real ? ' <span class="real" title="medido de verdade">●</span>' : ''}</td><td>${l.tipo}</td>
          <td>${l.ram == null ? '—' : l.ram.toFixed(1) + ' MB'}</td><td>${l.cpu.toFixed(1)}%</td></tr>`).join('')
        + `<tr class="total${estourou ? ' alerta' : ''}"><td>Total</td><td></td><td>${total.toFixed(0)} MB${app.limites.ligado ? ` / ${fmt.ram(app.limites.ram)}` : ''}</td><td></td></tr>`;
      if (estourou && !app.congeladas) app.congelarAbas(true);
      const eventos = el.querySelector('[data-eventos]');
      if (eventos) eventos.innerHTML = app.eventosJogo.length
        ? app.eventosJogo.map(e => `<li><time>${hhmm(e.hora)}</time>${esc(e.msg)}</li>`).join('')
        : '<li class="vazio">Nenhum evento ainda.</li>';
    };
    el.querySelector('[data-modo]').onclick = () => app.definirModoJogo(!app.modoJogo);
    el.querySelectorAll('[data-lim]').forEach(inp => inp.oninput = () => {
      const k = inp.dataset.lim;
      app.limites[k] = k === 'ligado' ? inp.checked : +inp.value;
      app.guardado.gravar('limites', app.limites);
      atualizar();
    });
    atualizar();
    const timer = setInterval(atualizar, 800);
    return { desmontar: () => clearInterval(timer), atualizar };
  },
};

// ---------- rede ----------

const rede = {
  titulo: () => 'Rede',
  icone: 'rede',
  html: (r, app) => `
    <div class="folha">
      ${cabecalho('rede', 'Rede do navegador', app.real
        ? 'Conexões reais. Primeiro, o que o próprio Oceano acessa por conta própria; depois, o que cada site aberto está contatando agora.'
        : 'Toda conexão que o próprio Oceano faz aparece aqui, com o motivo e o que é enviado. O tráfego dos sites que você visita não entra nesta lista: ele fica no DevTools (F12), como no Chrome.')}
      <div class="numeros">
        <div class="numero px"><b data-n></b><span>conexões do navegador hoje</span></div>
        ${app.real ? '<div class="numero px"><b data-bloq>0</b><span>anúncios e rastreadores bloqueados nas abas abertas</span></div>' : '<div class="numero px"><b>0 bytes</b><span>de telemetria</span></div>'}
        <div class="numero px"><b>0</b><span>contas necessárias</span></div>
      </div>
      <div class="px bloco tabela-rolagem">
        <table class="tabela"><thead><tr><th>Hora</th><th>Destino</th><th>Motivo</th><th>O que é enviado</th></tr></thead><tbody data-linhas></tbody></table>
      </div>
      <section class="px bloco">
        <h2>O que o Oceano sabe sobre você</h2>
        <p><b>Nada.</b> Sem conta, não existe perfil. Histórico e favoritos ficam neste computador. O Oceano não guarda senhas de sites. Se um dia você ligar a sincronização, ela é cifrada de ponta a ponta: o servidor guarda blocos que não consegue ler.</p>
      </section>
      ${app.real ? `<section class="px bloco">
        <h2>O que cada site está contatando</h2>
        <div class="sites-rede" data-sites></div>
        <p class="nota">Contagem desde que a página abriu. "Terceiros" são domínios diferentes do site que você abriu: anúncios, métricas, fontes, vídeos.</p>
      </section>` : '<p class="nota">Simulador: as conexões acima são exemplos. Nenhuma delas é feita de verdade.</p>'}
    </div>`,
  montar(el, r, app) {
    const atualizar = () => {
      el.querySelector('[data-n]').textContent = app.rede.reduce((t, c) => t + (c.vezes || 1), 0);
      if (app.real) {
        const dados = app.redeSites || {};
        const abas = app.abas.filter(a => a.wcId && dados[a.wcId]);
        el.querySelector('[data-bloq]').textContent = abas.reduce((t, a) => t + dados[a.wcId].bloqueados, 0);
        el.querySelector('[data-sites]').innerHTML = abas.length ? abas.map(a => {
          const d = dados[a.wcId];
          return `<article class="site-rede">
            <div><b>${sensivel(d.pagina, 'site aberto')}</b><span>${d.pedidos} pedidos · ${d.bloqueados} bloqueados · ${d.totalTerceiros} domínios de terceiros</span></div>
            <ul class="perms">${d.terceiros.map(([h, n]) => `<li title="${n} pedido(s)">${sensivel(h, 'domínio contatado')}</li>`).join('')}</ul>
          </article>`;
        }).join('') : '<p class="nota">Nenhum site aberto. Abra uma aba com um site e volte aqui.</p>';
      }
      el.querySelector('[data-linhas]').innerHTML = app.rede.map(c =>
        `<tr><td>${hhmm(c.hora)}</td><td><code>${esc(c.destino)}</code>${c.vezes > 1 ? ` <span class="chip">×${c.vezes}</span>` : ''}</td><td>${esc(c.motivo)}</td><td>${esc(c.envia)}</td></tr>`).join('');
    };
    atualizar();
    return { atualizar };
  },
};

// ---------- sobre ----------

const sobre = {
  titulo: () => 'Sobre a Navegadora',
  icone: 'info',
  html: (r, app) => `
    <div class="folha">
      ${cabecalho('info', 'Sobre a Navegadora', 'Um navegador minimalista, aberto e em pixel art, para quem joga e para quem programa.')}
      ${app.real ? `<section class="px bloco">
        <h2>Oceano MVP</h2>
        <p>Esta é a interface do Oceano com abas de verdade, rodando sobre o <span class="versao-motor">Chromium ${esc(window.oceanoNativo?.versoes.chromium || '')} (Electron ${esc(window.oceanoNativo?.versoes.electron || '')}).</span> ${window.oceanoNativo?.versoes.electron === ELECTRON_MAIS_RECENTE ? '<span class="versao-ultima">Esta é a última versão</span> ' : ''}Serve para testar a experiência completa antes do fork definitivo do Chromium.</p>
        <p><b>De verdade aqui:</b> sites, abas, DevTools (F12), modo jogo congelando abas, consumo por aba, log de rede e bloqueador de anúncios e rastreadores.</p>
        <p><b>Atalhos:</b> todos em <a href="#" data-ir="oceano://atalhos">oceano://atalhos</a>, onde dá para ver e mudar (⌘⇧/ abre a página).</p>
        <p><a href="#" data-ir="oceano://privacidade">Privacidade e segurança</a>: DNS cifrado, perfis, proxy, permissões e versão.</p>
      </section>` : app.lite ? `<section class="px bloco">
        <h2>Oceano Lite</h2>
        <p>Esta é a nova aba do Oceano dentro do seu Chrome, enquanto o navegador completo não fica pronto. Temas, mar pixelizado, editor de temas, mods em Lua e Teal e a barra lateral funcionam aqui.</p>
        <p><b>Privacidade:</b> a extensão não faz nenhuma conexão de rede e não coleta nada. Ela pede uma única permissão, <code>search</code>, para que a busca use o buscador padrão que você já escolheu no Chrome. Temas, mods e notas ficam só neste computador.</p>
        <p>O que fica de fora: abas, barra de endereço, modo jogo e o log de rede, que só existem no navegador completo.</p>
      </section>` : `<section class="px bloco">
        <h2>Isto é um simulador</h2>
        <p>Esta página imita o Oceano para testar a estética, os temas e os mods em Lua antes da versão compilada em cima do Chromium. Sites de verdade não carregam aqui, e nada sai deste computador.</p>
        <p><a href="/docs/plano.html" target="_blank" rel="noopener">Abrir o plano técnico completo</a>: arquitetura, o que dá e o que não dá, tecnologias e a história da Lua.</p>
      </section>`}
      <section class="px bloco sobre-missao">
        <h2>Por que isto existe</h2>
        <p>Isto aqui é um projeto de código aberto, que traz tecnologias criadas pela comunidade. Sempre que deu, a preferência foi por código feito por brasileiros.</p>
        <p>É um acervo de ferramentas para você ter o direito e a liberdade de usar tudo num lugar que foca na sua criatividade: ferramentas gratuitas, acessíveis e fáceis de usar para gerar conteúdo, engajamento, vídeo, jogo, o que você quiser. Que isso traga crescimento pessoal, seja aprendendo, seja vendendo um curso ou alguma coisa feita aqui.</p>
        <p><b>O objetivo principal não é vender nada para ninguém.</b> É oferecer o máximo de conhecimento para você conquistar isso por conta própria, por mérito próprio e com a sua criatividade, porque ela é original e ninguém pode tirar isso de você.</p>
      </section>
      <section class="px bloco">
        <h2>Manifesto</h2>
        <p>O Oceano é feito para quem cria e para quem grava vídeo, principalmente para quem está começando: apresentar um negócio, uma ideia, um sonho, fazer um vlog. Cada ferramenta deve ensinar alguma coisa, e a comunidade deve ajudar cada pessoa a crescer. <a href="#" data-ir="oceano://manifesto">Ler o manifesto</a></p>
      </section>
      <section class="px bloco">
        <h2>Autor e licença</h2>
        <p>Criado por <b>@hericdk</b> · <a href="https://instagram.com/hericdk" target="_blank" rel="noopener">@hericdk</a>. As contas oficiais do Oceano ainda vão nascer.</p>
        <p>Um projeto de médio e longo prazo, feito com a mesma teimosia com que Sean Murray seguiu melhorando No Man's Sky: lançar cedo, ouvir quem usa e continuar, versão depois de versão. Aberto para que outras pessoas estudem, se inspirem e levem as ideias adiante.</p>
        <p>Software livre sob a <b>GNU GPL v3.0 ou posterior</b>. Mods, temas e o que você cria nele são seus e podem ter qualquer licença.</p>
      </section>
      <section class="px bloco">
        <h2>Aviso legal</h2>
        <p>O Oceano é oferecido como está, sem garantia de nenhum tipo, nos termos da GNU GPL. É uma versão inicial: use com bom senso e guarde cópia do que for importante.</p>
        <p>As ferramentas e bibliotecas incluídas pertencem aos autores delas e seguem as licenças listadas abaixo e no arquivo AVISOS.md. Nomes e marcas citados são dos respectivos donos, e o Oceano não é afiliado a eles.</p>
        <p>O que você faz, baixa, publica ou vende com o Oceano é responsabilidade sua. Respeite os direitos autorais e as regras de cada site, principalmente ao baixar ou remixar conteúdo de outras pessoas.</p>
        <p>Ligando o clima da sua cidade, os dados vêm do <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0).</p>
      </section>
      <section class="px bloco">
        <h2>Feito com</h2>
        <ul class="creditos">
          <li><b>Chromium</b> e <b>Electron</b> (BSD, MIT): o motor das abas no app.</li>
          <li><b>Lua 5.4</b> (PUC-Rio) via wasmoon e <b>Teal</b> (Hisham Muhammad), MIT: os mods.</li>
          <li><b>three.js</b> (MIT): o mar com o farol.</li>
          <li><a href="https://strudel.cc" target="_blank" rel="noopener"><b>Strudel</b></a> (Felix Roos, Alex McLean e comunidade, AGPL-3.0): live coding de música, dentro do Stave em <a href="#" data-ir="oceano://stave">oceano://stave</a>. <a href="https://codeberg.org/uzu/strudel" target="_blank" rel="noopener">código-fonte</a>.</li>
          <li>A ilha, a conversa com as IAs e o notch são de @hericdk, sob a GPL.</li>
          <li>Voz neural da Navegadora: <a href="https://huggingface.co/hexgrad/Kokoro-82M" target="_blank" rel="noopener"><b>Kokoro-82M</b></a> (hexgrad, Apache-2.0), <a href="https://github.com/espeak-ng/espeak-ng" target="_blank" rel="noopener"><b>eSpeak NG</b></a> (GPL-3.0) e <a href="https://onnxruntime.ai" target="_blank" rel="noopener"><b>ONNX Runtime</b></a> (MIT). O modelo é baixado uma vez, a seu pedido, e a fala é gerada neste computador.</li>
          <li><b>🧰 Ferramentas</b> usa <b>gifenc</b> (MIT), <b>imagetracerjs</b> (Unlicense), <b>pako</b> (MIT e Zlib), <b>UPNG.js</b> (MIT) e <b>lamejs</b> (LGPL-3.0). Baixar e exportar vídeo usam o <b>yt-dlp</b> e o <b>ffmpeg</b> do seu computador.</li>
          <li><a href="https://www.gimp.org" target="_blank" rel="noopener"><b>GIMP</b></a> (time do GIMP, GPL-3.0) e <a href="https://github.com/Diolinux/PhotoGIMP" target="_blank" rel="noopener"><b>PhotoGIMP</b></a> (Diolinux, GPL-3.0): programas à parte, que o Oceano ajuda a instalar e abrir em <a href="#" data-ir="oceano://gimp">oceano://gimp</a>.</li>
          <li><a href="https://sampler.half.social" target="_blank" rel="noopener"><b>🤌 FM ½ sampler</b></a> (@hericdk, half.social): o sampler do FM-1, em pixel, dentro do Oceano em <a href="#" data-ir="oceano://sampler">oceano://sampler</a>; a separação de instrumentos usa o <a href="https://github.com/facebookresearch/demucs" target="_blank" rel="noopener">Demucs</a> (MIT).</li>
          <li><a href="https://stave.live" target="_blank" rel="noopener"><b>Stave</b></a> (Mrityunjay Bhardwaj, AGPL-3.0): o estúdio em volta do Strudel, com timeline, grade, piano roll, mixer e visuais. <a href="https://github.com/MrityunjayBhardwaj/Stave" target="_blank" rel="noopener">código-fonte</a>.</li>
          <li><b>hydra</b> (Olivia Jack, AGPL-3.0): visuais ao vivo. <a href="https://github.com/hydra-synth/hydra-synth" target="_blank" rel="noopener">código-fonte</a>.</li>
          <li><b>PICO-8</b> (Lexaloffle): o player oficial dos cartuchos da BBS.</li>
          <li>Fontes <b>Pixelify Sans</b> e <b>Silkscreen</b> (SIL OFL) e bloqueador da <b>Ghostery</b> (MPL-2.0). Leitor com o <b>Readability</b> da Mozilla (Apache-2.0).</li>
          <li><a href="https://github.com/shinshin86/mesh-avatar-studio" target="_blank" rel="noopener"><b>Mesh Avatar Studio</b></a> (shinshin86, MIT): o avatar animado da Navegadora e o editor de avatar em <a href="#" data-ir="oceano://avatar">oceano://avatar</a>.</li>
          <li><a href="https://github.com/pixiv/three-vrm" target="_blank" rel="noopener"><b>three-vrm</b></a> (pixiv, MIT): os avatares 3D em VRM.</li>
          <li><b>Kara</b>, a personagem do Oceano (@hericdk, GPL-3.0-or-later), animada pelo runtime do Mesh Avatar Studio.</li>
        </ul>
      </section>
      <section class="px bloco">
        <h2>Caminho até o beta</h2>
        <ol class="etapas">
          <li class="feito"><b>Fase 0 · Simulador</b> UI pixel art, temas .oceano, editor de temas e mods em Lua (a linguagem criada na PUC-Rio)</li>
          <li><b>Fase 1 · Primeira build</b> fork do Helium/ungoogled-chromium com a marca Oceano</li>
          <li><b>Fase 2 · Identidade nativa</b> tema pixel art na interface do navegador, oceano://rede, bloqueador</li>
          <li><b>Fase 3 · Beta fechado</b> instalador, atualização automática, mods e temas</li>
          <li><b>Fase 4 · Beta público</b> loja da comunidade e Discord</li>
        </ol>
      </section>
      <section class="px bloco">
        <h2>Símbolos</h2>
        <p>Cada área do Oceano tem o seu emoji, para escrever e conversar sem o nome inteiro. Eles não mudam; um mod pode ter o emoji que você escolher, desde que seja outro.</p>
        <ul class="simbolos">${AREAS.map(a => `<li><span aria-hidden="true">${a.emoji}</span> ${esc(a.nome)}</li>`).join('')}</ul>
      </section>
      <section class="px bloco">
        <h2>Atalhos</h2>
        <dl class="atalhos-teclas">
          ${app.lite ? '' : `<dt>${esc(app.atalhos.mostrar('nova-aba'))}</dt><dd>Nova aba</dd><dt>${esc(app.atalhos.mostrar('reabrir-aba'))}</dt><dd>Reabrir aba fechada</dd><dt>${esc(app.atalhos.mostrar('atalhos'))}</dt><dd><a href="#" data-ir="oceano://atalhos">Todos os atalhos (e mudar)</a></dd>`}
          <dt>← → ↑ espaço</dt><dd>Controles dos cartuchos</dd>
        </dl>
      </section>
      <section class="px bloco">
        <h2>Endereços</h2>
        <dl class="atalhos-teclas">
          <dt>oceano.gg</dt><dd>site e download</dd>
          <dt>oceano.zone</dt><dd>loja de temas, mods e cartuchos</dd>
          <dt>oceano.engineer</dt><dd>documentação para devs e API Lua</dd>
          <dt>oceano.support</dt><dd>ajuda e status</dd>
          <dt>oceano.chat</dt><dd>comunidade</dd>
          <dt>oceano.social</dt><dd>devlog</dd>
        </dl>
      </section>
      <section class="px bloco">
        <h2>Primeiros passos</h2>
        <p>A apresentação com o agente, a voz, o avatar e a ilha. Quem já concluiu pode rever aqui quando quiser.</p>
        <p><button class="btn mini secundario" data-primeiros-passos>ver de novo</button></p>
      </section>
      <p class="sobre-final">Uma IA usada com criatividade e para o bem,<br>é uma IA a menos se acontecer uma revolução das máquinas. 🤖</p>
      ${htmlBloqueio18(app)}
    </div>`,
  montar: el => ligarBloqueio18(el),
};

// ---------- sem conexão ----------

const offline = {
  titulo: r => {
    if (r.externo) { try { return new URL(r.url).hostname; } catch { return r.url; } }
    return r.desconhecida ? 'Página não encontrada' : r.params.get('q') || 'Sem conexão';
  },
  icone: 'mundo',
  html: (r, app) => {
    const q = r.params.get('q');
    const motivo = r.externo
      ? `O simulador não abre sites de verdade (<code>${esc(r.url)}</code>).`
      : r.desconhecida ? `A página <code>${esc(r.url)}</code> não existe.`
      : q ? `Você buscou “${esc(q)}”, mas o simulador não acessa a internet.`
      : 'O simulador não tem internet.';
    return `<div class="surfista-tela">${htmlSurfista({ titulo: r.desconhecida ? 'Página não encontrada' : 'Sem conexão por aqui', texto: r.desconhecida ? `${motivo} (erro 404)` : motivo })}</div>`;
  },
  montar(el, r, app) { const jogo = montarSurfista(el, app.hostDosMods); return { desmontar: () => jogo.parar() }; },
};

// ---------- atalhos ----------

const RESERVADOS = {
  sim: ['Mod+T', 'Mod+W', 'Mod+N', 'Mod+Shift+T', 'Mod+Shift+N', 'Mod+Q', 'Mod+Tab', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Mod+L'],
  app: ['Mod+Q', 'Mod+H', 'Mod+Tab', 'Mod+Space', 'Mod+Shift+3', 'Mod+Shift+4', 'Mod+Shift+5', 'Mod+`', 'Mod+C', 'Mod+V', 'Mod+X', 'Mod+Z', 'Mod+A'],
};

const atalhos = {
  titulo: () => 'Atalhos',
  icone: 'teclado',
  html: (r, app) => `
    <div class="folha atalhos-pagina">
      ${cabecalho('teclado', 'Atalhos', 'Toque num atalho e aperte a combinação nova. Esc cancela, ⌫ deixa a ação sem atalho. Os marcados como <b>novo</b> chegaram agora.')}
      ${app.real ? '' : `<section class="px bloco nota">No simulador, o navegador onde ele roda segura ⌘T, ⌘W, ⌘N, ⌘⇧T e ⌃Tab. Por isso aqui os atalhos usam ⌥. No app do Oceano valem os de verdade (⌘T, ⌘⇧T…), cada um com a sua lista.</section>`}
      <p class="at-aviso" aria-live="polite"></p>
      <div data-atalhos></div>
      <p><button class="btn px secundario" data-restaurar-todos>Voltar tudo ao padrão</button></p>
    </div>`,
  montar(el, r, app) {
    const A = app.atalhos, caixa = el.querySelector('[data-atalhos]'), aviso = el.querySelector('.at-aviso');
    const nativo = window.oceanoNativo;
    let gravando = null;
    const tecla = (a, compacto) => `<button class="at-tecla px${A.mudado(a.id) ? ' mudado' : ''}" data-id="${a.id}" title="${compacto ? esc(a.nome) + ' · ' : ''}toque para mudar">${A.de(a.id) ? `<kbd>${esc(A.mostrar(a.id))}</kbd>` : '<span class="at-sem">sem atalho</span>'}</button>`;
    function desenhar() {
      const grupos = [...new Set(A.acoes.map(a => a.grupo))];
      caixa.innerHTML = grupos.map(g => {
        const lista = A.acoes.filter(a => a.grupo === g), compactos = lista.filter(a => a.compacto);
        return `<section class="px bloco at-grupo"><h2>${esc(g)}</h2>
          ${lista.filter(a => !a.compacto).map(a => `<div class="at-linha"><span class="at-nome">${esc(a.nome)}${a.novo ? ' <span class="chip novo">novo</span>' : ''}${a.dica ? `<small>${esc(a.dica)}</small>` : ''}</span>
            ${tecla(a)}<button class="at-voltar" data-restaurar="${a.id}" title="voltar ao padrão" ${A.mudado(a.id) ? '' : 'hidden'}>↺</button></div>`).join('')}
          ${compactos.length ? `<div class="at-linha"><span class="at-nome">Ir para a aba 1 a 8 <span class="chip novo">novo</span><small>a 9 vai sempre para a última</small></span><span class="at-compactos">${compactos.map(a => tecla(a, true)).join('')}</span></div>` : ''}
        </section>`;
      }).join('');
    }
    const dizer = (txt, tipo = '') => { aviso.textContent = txt; aviso.className = 'at-aviso ' + tipo; };
    function parar() {
      if (!gravando) return;
      window.removeEventListener('keydown', ouvir, true);
      gravando = null; app.gravandoAtalho = false;
      if (app.real) nativo?.atalhosDefinir?.(A.aceleradores());   // o menu volta a pegar as teclas
      desenhar();
    }
    function ouvir(e) {
      e.preventDefault(); e.stopPropagation();
      const id = gravando, a = A.acoes.find(x => x.id === id);
      if (e.key === 'Escape') { dizer(''); return parar(); }
      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey && !e.altKey) { A.definir(id, ''); dizer(`${a.nome} ficou sem atalho.`); return parar(); }
      const c = deEvento(e);
      if (!c) return;   // só um modificador apertado: esperando o resto
      if (!/\b(Mod|Ctrl|Alt)\b/.test(c) && !/^F\d/.test(c)) return dizer('Use junto com ⌘, ⌃ ou ⌥ (ou uma tecla F), para não atrapalhar quem digita.', 'erro');
      const dono = A.definir(id, c);
      const reservado = RESERVADOS[A.contexto].includes(c);
      dizer(`${mostrarCombo(c)} agora é ${a.nome}.` + (dono ? ` ${dono.nome} ficou sem atalho.` : '')
        + (reservado ? (app.real ? ' Atenção: o sistema ou a edição de texto costuma usar essa antes.' : ' Atenção: o navegador do simulador pode pegar essa antes.') : ''), reservado ? 'erro' : 'ok');
      parar();
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.id) {
        parar();
        gravando = b.dataset.id; app.gravandoAtalho = true;
        if (app.real) nativo?.atalhosDefinir?.(Object.fromEntries(A.acoes.map(a => [a.id, ''])));   // o menu solta as teclas enquanto grava
        b.innerHTML = '<span class="at-gravando">aperte o atalho…</span>';
        window.addEventListener('keydown', ouvir, true);
      }
      if (b.dataset.restaurar) { A.restaurar(b.dataset.restaurar); dizer('Voltou ao padrão.'); desenhar(); }
      if (b.hasAttribute('data-restaurar-todos')) { parar(); A.restaurar(); dizer('Todos os atalhos voltaram ao padrão.', 'ok'); desenhar(); }
    });
    const tirar = app.on('atalhos', () => { if (!gravando) desenhar(); });
    desenhar();
    return { desmontar: () => { parar(); tirar(); } };
  },
};

// ---------- configurações ----------

const DITHER_OPCOES = [['0', 'Sólido'], ['50', 'Médio']];

// ---------- busca (a IA responde e sugere sites) ----------

const busca = {
  titulo: r => r.params.get('q') || 'Busca',
  icone: 'oceano',
  html: (r, app) => {
    const q = r.params.get('q') || '';
    return `
    <div class="folha busca-ia">
      <form class="busca px" data-busca>${icone('escudo')}<input name="q" value="${esc(q)}" autocomplete="off" aria-label="Buscar de novo"></form>
      <section class="bi-resultado" aria-live="polite"><p class="bi-pensando px">procurando os sites certos…</p></section>
    </div>`;
  },
  montar(el, r, app) {
    const q = r.params.get('q') || '';
    const caixa = el.querySelector('.bi-resultado');
    el.querySelector('[data-busca]').onsubmit = e => { e.preventDefault(); app.navegar(e.target.q.value); };
    const outros = (titulo, texto) => `
      <div class="bi-aviso px">
        <h2>${titulo}</h2><p>${texto}</p>
        <div class="bi-botoes">
          <button class="btn mini" data-ir-cfg>Configurar a IA</button>
          <button class="btn mini secundario" data-outro="duckduckgo">Buscar no DuckDuckGo</button>
          <button class="btn mini secundario" data-outro="google">Buscar no Google</button>
        </div>
        <label class="bi-sempre"><input type="checkbox" data-sempre> usar o buscador que eu escolher daqui em diante</label>
      </div>`;
    el.addEventListener('click', e => {
      const b = e.target.closest('button, a[data-site]'); if (!b) return;
      e.preventDefault();
      if (b.dataset.site) return app.navegar(b.dataset.site);
      if (b.hasAttribute('data-ir-cfg')) return app.navegar('oceano://configuracoes#busca');
      if (b.dataset.outro) {
        if (el.querySelector('[data-sempre]')?.checked) { app.definirBuscador(b.dataset.outro); app.aviso(`Buscador padrão: ${app.buscadores[b.dataset.outro].nome}.`, 'Busca'); }
        app.navegar(app.urlDeBusca(q, b.dataset.outro));
      }
    });
    if (!q) { caixa.innerHTML = '<p class="nota">Digite o que procura.</p>'; return; }
    let vivo = true;
    (async () => {
      const est = await app.ia.estado();
      if (!vivo) return;
      if (!est.configurada) {
        caixa.innerHTML = est.simulador
          ? outros('A IA responde no app', 'No simulador não existe IA de verdade. No app Oceano, coloque uma chave em Configurações → Busca, ou escolha outro buscador.')
          : outros('Falta configurar a IA', 'Para a IA responder sua busca, coloque uma chave em Configurações → Busca. Ou escolha um dos outros buscadores.');
        return;
      }
      const r2 = await app.ia.buscar(q);
      if (!vivo) return;
      if (r2.erro) {
        const MOTIVO = { chave: 'A chave da IA não foi aceita. Confira em Configurações → Busca.', limite: 'A IA está recebendo pedidos demais agora. Tente de novo em instantes.',
          rede: 'Sem conexão com a IA agora.', recusou: 'A IA não quis responder essa busca.', 'sem-ia': 'Falta configurar a IA.' };
        caixa.innerHTML = outros('Não deu certo desta vez', esc(MOTIVO[r2.erro] || `Algo deu errado: ${r2.detalhe || r2.erro}`));
        return;
      }
      const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
      caixa.innerHTML = `
        <p class="bi-resposta">${esc(r2.resposta)}</p>
        <ol class="bi-sites">${r2.sites.map(s => `<li><a href="#" class="bi-site px" data-site="${esc(s.url)}">
          <b>${esc(s.titulo)}</b><small>${esc(host(s.url))}</small><span>${esc(s.porque)}</span></a></li>`).join('')}</ol>
        <p class="bi-rodape">${r2.guardada ? 'resposta guardada · sem gasto' : `~${r2.tokens} tokens`} ·
          também no <a href="#" data-site="${esc(app.buscadores.duckduckgo.url(q))}">DuckDuckGo</a> ou no <a href="#" data-site="${esc(app.buscadores.google.url(q))}">Google</a></p>`;
    })();
    return { desmontar: () => { vivo = false; } };
  },
};

const configuracoes = {
  titulo: () => 'Configurações',
  icone: 'engrenagem',
  html: (r, app) => `
    <div class="folha config">
      ${cabecalho('engrenagem', 'Configurações', 'Tudo do Oceano num lugar só.')}
      <section class="px bloco">
        <h2>Aparência</h2>
        <div class="cfg-linha"><span><b>Tema</b><small>as cores da interface e do mar</small></span>
          <span class="cfg-ctrl"><select data-cfg="tema">${app.ordemTemas.map(id => `<option value="${esc(id)}" ${app.tema.id === id ? 'selected' : ''}>${esc(app.temas[id].nome || id)}</option>`).join('')}</select>
          <a href="#" data-ir="oceano://temas">editar temas</a></span></div>
        <div class="cfg-linha"><span><b>Céu e clima</b><small>o céu da tela do farol</small></span>
          <span class="cfg-ctrl">${htmlClima(app)}</span></div>
        <div class="cfg-linha"><span><b>Janelas ao trocar de tela inicial</b><small>o que acontece com as janelas entre o oceano com farol e a ilha</small></span>
          <span class="cfg-ctrl"><select data-cfg="home-janelas">${[['grandes', 'ficam como estão'], ['minimizadas', 'recolhem na ilha'], ['areas', 'cada tela tem as suas']].map(([v, n]) => `<option value="${v}" ${app.guardado.ler('home-janelas', 'grandes') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></span></div>
        <div class="cfg-linha"><span><b>Reabrir as abas</b><small>ao abrir o Oceano, voltam as abas da última vez. As efêmeras nunca voltam</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-cfg="restaurar-abas" ${app.guardado.ler('restaurar-abas', true) ? 'checked' : ''}> reabrir</label></span></div>
        <div class="cfg-linha"><span><b>🤖 Robôs com as cores do tema</b><small>o simulador de robótica tem um visual próprio. Ligado, ele usa as cores do tema escolhido</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-cfg="robo-tema" ${app.guardado.ler('robo-tema', false) ? 'checked' : ''}> usar as cores do tema</label></span></div>
        <div class="cfg-linha"><span><b>Pixelizar das janelas</b><small>o "vidro" das janelas da página inicial é feito de pixels. Mudar o pixelizado de uma janela (botão ${icone('malha')} da barra dela) desativa esta opção; escolher aqui vale de novo para todas.</small></span>
          <span class="cfg-ctrl cfg-opcoes" role="group" aria-label="Pixelizar das janelas">${DITHER_OPCOES.map(([v, n]) => `<button class="chip" data-dither="${v}" aria-pressed="${app.ditherGlobalAtivo() && document.documentElement.dataset.dither === v}">${n}</button>`).join('')}</span></div>
        <div class="cfg-linha"><span><b>Hora da cena</b><small>o sol e a lua do mar: a hora que o tema pede (o Pôr do sol fica no fim da tarde), sempre a hora do relógio, ou uma hora que você escolhe. Também no chip ${icone('sol')} do rodapé da página inicial.</small></span>
          <span class="cfg-ctrl">${htmlHora(app)}</span></div>
        <div class="cfg-amostra" aria-hidden="true">${DITHER_OPCOES.map(([v, n]) => `<div class="cfg-vidro" data-dither="${v}"><span>${n}</span></div>`).join('')}</div>
      </section>
      <section class="px bloco" id="busca">
        <h2>Busca</h2>
        <div class="cfg-linha"><span><b>Buscador padrão</b><small><b>IA</b>: nada de página de buscador; a IA responde numa linha e mostra os sites certos. Resposta curta e guardada, então a mesma busca não gasta duas vezes.</small></span>
          <span class="cfg-ctrl cfg-opcoes" role="group" aria-label="Buscador padrão">${Object.entries(app.buscadores).map(([id, b]) => `<button class="chip" data-buscador="${id}" aria-pressed="${app.buscador() === id}">${b.nome}</button>`).join('')}</span></div>
        <div class="cfg-linha"><span><b>Inteligência</b><small>conecte Claude, ChatGPT, Gemini, OpenRouter (com um clique) ou Higgsfield, e escolha qual IA é a Navegadora, qual faz tarefas rápidas e qual edita imagem</small></span>
          <span class="cfg-ctrl"><a href="#" data-ir="oceano://ia">abrir</a></span></div>
        <div class="cfg-linha" data-ia-linha><span><b>IA da busca</b><small data-ia-estado>${app.real ? 'verificando…' : 'No simulador não existe IA de verdade: a chave se coloca no app Oceano.'}</small></span>
          ${app.real ? `<span class="cfg-ctrl cfg-ia">
            <input type="password" data-ia-chave placeholder="chave da API da Anthropic" autocomplete="off" spellcheck="false" aria-label="Chave da API">
            <select data-ia-modelo aria-label="Modelo"></select>
            <button class="btn mini" data-ia-salvar>salvar</button>
            <button class="btn mini secundario" data-ia-remover hidden>remover chave</button></span>` : ''}</div>
      </section>
      ${htmlGuardrails()}
      ${app.real ? `<section class="px bloco">
        <h2>Uso anônimo</h2>
        <div class="cfg-linha"><span><b>Autorizo compartilhar dados de uso anonimizados</b><small>É só para um monitoramento anônimo, com uma estimativa da ordem de grandeza de uso, para medirmos o sucesso deste projeto. Sem isso, a única forma de sabermos seria se as pessoas gravassem vídeos sobre o Oceano, o que, aliás, seria muito legal se fizessem!</small><small>Se você autorizar, o Oceano envia um sinal por dia com a versão, o sistema, o idioma, o país do sistema e uma faixa de tempo de uso. Não vai nenhum identificador nem site visitado, e o IP não é guardado. Dá para desligar e pedir a remoção em Configurações, e cada envio aparece em oceano://rede.</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-cfg="uso-anonimo" ${app.guardado.ler('uso-anonimo', false) === true ? 'checked' : ''}> autorizo</label></span></div>
        <div class="cfg-linha"><span><b>Apagar meus dados de uso</b><small>Também desliga a contagem. Os envios dos últimos 30 dias saem das somas do servidor. Depois disso, só restam totais sem ligação com ninguém.</small><small data-apagar-uso-nota role="status"></small></span>
          <span class="cfg-ctrl"><button class="btn mini secundario" data-apagar-uso>Apagar</button></span></div>
      </section>` : ''}
      <section class="px bloco">
        <h2>Página inicial</h2>
        <div class="cfg-linha"><span><b>Janelas da mesa</b><small>arraste pela barra de título, redimensione pelo canto e recolha com dois cliques na barra</small></span>
          <span class="cfg-ctrl"><button class="btn mini secundario" data-organizar>organizar janelas</button></span></div>
      </section>
      <section class="px bloco">
        <h2>Vídeo</h2>
        <div class="cfg-linha"><span><b>Mini player</b><small>o vídeo da página vai para uma janelinha que flutua por cima de tudo, até fora do navegador. ${esc(app.atalhos.mostrar('mini-player'))} ou o botão na barra de endereço. ${app.real ? '' : 'Sites de verdade só no app.'}</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-cfg="pip-auto" ${app.guardado.ler('pip-auto', false) ? 'checked' : ''}> abrir sozinho ao trocar de aba com vídeo tocando</label></span></div>
        <div class="cfg-linha"><span><b>Janelinha pelo clique direito</b><small>clique direito em cima de um vídeo abre o menu com a janelinha flutuante; com Shift, aparece o menu do site</small></span></div>
        <div class="cfg-linha"><span><b>Música ao fechar a aba</b><small>a aba fechada segue tocando escondida e o player do CD na página inicial controla; ele para quando você fecha o player. Abas efêmeras nunca seguem.</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-cfg="musica-fechar-aba" ${app.guardado.ler('musica-fechar-aba', false) ? 'checked' : ''}> continuar tocando</label></span></div>
      </section>
      <section class="px bloco">
        <h2>Bem-estar</h2>
        <div class="cfg-linha"><span><b>Lembrete de água</b><small>uma janelinha pede um copo d'água de tempos em tempos. Não aparece no modo jogo. Hoje: <b data-copos>${app.agua?.copos() ?? 0}</b> copo(s).</small></span>
          <span class="cfg-ctrl"><select data-cfg="agua" aria-label="Intervalo">${[[0, 'desligado'], [30, 'a cada 30 min'], [45, 'a cada 45 min'], [60, 'a cada 1 h'], [90, 'a cada 1 h 30']].map(([v, n]) => `<option value="${v}" ${app.agua?.intervalo() === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <button class="btn mini secundario" data-agua-agora>mostrar agora</button></span></div>
        <div class="cfg-linha"><span><b>Jeito do aviso</b><small><b>persistente</b>: some depois de 2 ou 5 cliques (sorteado) e muda um pouco de lugar a cada clique. <b>discreto</b>: fica num canto e some com um clique.</small></span>
          <span class="cfg-ctrl cfg-opcoes" role="group" aria-label="Jeito do aviso">${[['persistente', 'persistente'], ['discreto', 'discreto']].map(([v, n]) => `<button class="chip" data-agua-estilo="${v}" aria-pressed="${app.agua?.conf().estilo === v}">${n}</button>`).join('')}</span></div>
        <div class="cfg-linha"><span><b>Tempo do copo enchendo</b><small>depois de "bebi um copo", a janela fica esse tempo na tela com o copo enchendo e some sozinha</small></span>
          <span class="cfg-ctrl"><select data-cfg="agua-encher" aria-label="Tempo do copo enchendo">${[10, 20, 30, 45, 60].map(v => `<option value="${v}" ${app.agua?.conf().encher === v ? 'selected' : ''}>${v} s</option>`).join('')}</select></span></div>
      </section>
      <section class="px bloco">
        <h2>Som e música</h2>
        <div class="cfg-linha"><span><b>Sons da interface</b><small>cliques e avisos em chiptune</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-cfg="som" ${app.somLigado() ? 'checked' : ''}> ligados</label></span></div>
        <div class="cfg-linha"><span><b>Trilha</b><small>a música da página inicial; ${esc(app.atalhos.mostrar('trilha'))} toca ou pausa de qualquer página</small></span>
          <span class="cfg-ctrl"><a href="#" data-ir="oceano://nova-aba">abrir</a></span></div>
      </section>
      ${app.lite ? '' : `<section class="px bloco" id="assistente">
        <h2>Navegadora</h2>
        <div class="cfg-linha"><span><b>Idioma</b><small>vale para o navegador, as ferramentas e os mods. Sem escolha, segue o do computador</small></span>
          <span class="cfg-ctrl"><select data-cfg-idioma aria-label="Idioma"><option value="" ${app.idioma?.escolhido() ? '' : 'selected'}>do computador</option>${Object.entries(IDIOMAS).map(([k, n]) => `<option value="${k}" ${app.idioma?.escolhido() === k ? 'selected' : ''}>${n}</option>`).join('')}</select></span></div>
        <div class="cfg-linha"><span><b>Sugestões da conversa</b><small>ideias do que pedir, que mudam a cada conversa e somem depois da primeira mensagem</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-cfg-sugestoes ${app.guardado.ler('assistente-sugestoes', true) ? 'checked' : ''}> mostrar</label></span></div>
        <div class="cfg-linha"><span><b>Estilo de ${esc(app.assistente?.nome?.() || 'Kara')}</b><small>vale para o painel do navegador e para o notch</small></span>
          <span class="cfg-ctrl cfg-opcoes" data-cfg-estilo role="group" aria-label="Estilo do avatar"></span></div>
        <div class="cfg-linha"><span><b>Cor de fundo no navegador</b><small>atrás de ${esc(app.assistente?.nome?.() || 'Kara')} no painel e nas janelas do navegador; "padrão" volta à do tema</small></span>
          <span class="cfg-ctrl"><input type="color" data-fundo-avatar="navegador" aria-label="Cor de fundo do avatar no navegador"> <button class="btn mini secundario" data-fundo-padrao="navegador">padrão</button></span></div>
      </section>`}
      ${app.real ? `<section class="px bloco" id="notch">
        <h2>Notch do Mac</h2>
        <div class="cfg-linha"><span><b>Avatar no notch</b><small>a Navegadora mora no notch: encoste o mouse lá em cima para ela descer e conversar com você</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-notch="ligado"> mostrar</label></span></div>
        <div class="cfg-linha"><span><b>Visível ao trocar de app</b><small>ligado: continua no notch, minimizado, em qualquer app ou mesa. Desligado: fica só na mesa do Oceano e some quando outro app está na frente.</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-notch="sempre"> sempre visível</label></span></div>
        <div class="cfg-linha"><span><b>Continuar ligada ao fechar o navegador</b><small>${esc(app.assistente?.nome?.() || 'Kara')} fica no notch e na barra do Mac, só para conversar com as IAs conectadas. Abas e sites fecham. Para encerrar tudo, use Sair do Oceano (⌘Q ou o ícone da barra).</small></span>
          <span class="cfg-ctrl"><label class="cfg-chave"><input type="checkbox" data-notch="ficar"> continuar ligada</label></span></div>
        <div class="cfg-linha"><span><b>Cor de fundo de ${esc(app.assistente?.nome?.() || 'Kara')} no notch</b><small>separada da cor do navegador; "padrão" volta à do tema</small></span>
          <span class="cfg-ctrl"><input type="color" data-fundo-avatar="notch" aria-label="Cor de fundo do avatar no notch"> <button class="btn mini secundario" data-fundo-padrao="notch">padrão</button></span></div>
        <div class="cfg-linha"><span><b>Tema do notch</b><small>"Janela do Oceano" segue as janelinhas e as cores do tema do navegador; outros temas trazem um personagem próprio</small></span>
          <span class="cfg-ctrl cfg-opcoes" data-notch-temas role="group" aria-label="Tema do notch"></span></div>
        <div class="cfg-linha" data-notch-fundo-linha hidden><span><b>Cor do fundo</b><small>a cor do painel neste tema; "padrão" volta à do tema</small></span>
          <span class="cfg-ctrl"><input type="color" data-notch-fundo aria-label="Cor do fundo do notch"> <button class="btn mini secundario" data-notch-fundo-padrao>padrão</button></span></div>
        <div class="cfg-linha"><span><b>Seus temas</b><small>um tema é uma pasta com tema.json e uma folha de sprites PNG, sem código; o formato está no LEIA.md dos temas</small></span>
          <span class="cfg-ctrl"><button class="btn mini secundario" data-notch-pasta>abrir a pasta dos temas</button></span></div>
      </section>` : ''}
      <section class="px bloco">
        <h2>Gravar a tela com segurança</h2>
        <div class="cfg-linha"><span><b>Informações locais escondidas</b><small>Sites que você abriu, endereços e regras de proxy aparecem atrás de um bloco com cadeado, como este: ${sensivel('exemplo de informação', 'exemplo')}. Assim dá para gravar ou transmitir o Oceano sem expor nada sem querer. Clicando num bloco, o Oceano pergunta antes de mostrar; confirmando, todos aparecem até você esconder de novo ou fechar o navegador.</small></span>
          <span class="cfg-ctrl"><button class="btn mini secundario" data-esconder-sensivel>esconder tudo agora</button></span></div>
        <div class="cfg-linha"><span><b>Baú de senhas</b><small>desativado nesta versão: o Oceano não guarda senhas de sites</small></span>
          <span class="cfg-ctrl"><a href="#" data-ir="oceano://bau">abrir</a></span></div>
        <div class="cfg-linha"><span><b>Editor de avatar</b><small>Ele trabalha com um pequeno servidor no seu computador, que o Oceano liga quando você entra e desliga ao fechar. Ele só conversa com este computador; nada sai daqui.</small></span>
          <span class="cfg-ctrl"><a href="#" data-ir="oceano://avatar">abrir</a></span></div>
      </section>
      <section class="px bloco">
        <h2>Acessibilidade</h2>
        <div class="cfg-linha"><span><b>Temas legíveis em primeiro lugar</b><small>Todo tema deve ser fácil de ler: contraste mínimo de 4,5:1 para texto (WCAG AA), estados que não dependem só da cor e contorno de foco visível. O editor de temas confere isso ao vivo e avisa antes de salvar; temas com problema aparecem com o selo "contraste baixo".</small></span>
          <span class="cfg-ctrl"><a href="/docs/ACESSIBILIDADE-TEMAS.md" target="_blank" rel="noopener">guia de boas práticas</a></span></div>
      </section>
      <section class="px bloco">
        <h2>Mais</h2>
        <div class="cfg-linha"><span><b>Consumo</b><small>a memória fica na barra do topo, ao lado dos ícones; clicando, você vê o que gasta mais processamento e pode parar o mar, o avatar ou um mod</small></span>
          <span class="cfg-ctrl"><button class="btn mini secundario" data-consumo-abrir>ver o consumo</button></span></div>
        <div class="cfg-linha"><span><b>Atalhos de teclado</b><small>ver e mudar</small></span><span class="cfg-ctrl"><a href="#" data-ir="oceano://atalhos">abrir</a></span></div>
        <div class="cfg-linha"><span><b>Privacidade e segurança</b><small>DNS cifrado, perfis, proxy, permissões e scan de segurança</small></span><span class="cfg-ctrl"><a href="#" data-ir="oceano://privacidade">abrir</a></span></div>
        <div class="cfg-linha"><span><b>Mods em Lua</b><small>widgets, cartuchos e automações</small></span><span class="cfg-ctrl"><a href="#" data-ir="oceano://mods">abrir</a></span></div>
        <div class="cfg-linha"><span><b>Sobre a Navegadora</b></span><span class="cfg-ctrl"><a href="#" data-ir="oceano://sobre">abrir</a></span></div>
      </section>
    </div>`,
  montar(el, r, app) {
    el.querySelector('[data-cfg-sugestoes]')?.addEventListener('change', e => { app.guardado.gravar('assistente-sugestoes', e.target.checked); app.emitir('sugestoes-mudou'); });
    el.querySelector('[data-cfg-idioma]')?.addEventListener('change', e => { app.idioma?.definir(e.target.value); app.aviso('Idioma trocado. Ferramentas abertas mudam ao reabrir.', 'Idioma'); });
    // Navegadora: estilo e cor de fundo em cada lugar
    // a Navegadora termina de montar depois da página: as opções aparecem assim que ela estiver pronta
    const caixaEstilo = el.querySelector('[data-cfg-estilo]');
    const montarEstilo = (tentativas = 40) => {
      const a = app.assistente;
      if (!caixaEstilo) return;
      if (!a?.VISUAIS) { if (tentativas) setTimeout(() => montarEstilo(tentativas - 1), 250); return; }
      const pintarEstilo = () => { caixaEstilo.innerHTML = Object.entries(a.VISUAIS).map(([v, n]) => `<button class="chip" data-cfg-visual="${v}" aria-pressed="${a.visual() === v}">${esc(n)}</button>`).join(''); };
      pintarEstilo();
      caixaEstilo.onclick = e => { const b = e.target.closest('[data-cfg-visual]'); if (b) { a.definirVisual(b.dataset.cfgVisual); pintarEstilo(); } };
    };
    montarEstilo();
    const corPadrao = () => getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim() || '#000000';
    for (const i of el.querySelectorAll('[data-fundo-avatar]')) {
      const onde = i.dataset.fundoAvatar;
      i.value = app.fundoAvatar.ler(onde) || corPadrao();
      i.oninput = () => app.fundoAvatar.definir(onde, i.value);
      el.querySelector(`[data-fundo-padrao="${onde}"]`).onclick = () => { app.fundoAvatar.definir(onde, ''); i.value = corPadrao(); };
    }
    // notch do Mac (só no app)
    if (app.real && window.oceanoNativo?.notchPrefs) {
      window.oceanoNativo.notchPrefs().then(pr => {
        if (!pr.disponivel) { el.querySelector('#notch')?.remove(); return; }
        for (const i of el.querySelectorAll('[data-notch]')) { i.checked = !!pr[i.dataset.notch]; i.onchange = () => window.oceanoNativo.notchDefinir({ [i.dataset.notch]: i.checked }); }
        // temas do notch: os que vêm com o Oceano e os seus
        const caixa = el.querySelector('[data-notch-temas]'), linhaFundo = el.querySelector('[data-notch-fundo-linha]'), cor = el.querySelector('[data-notch-fundo]');
        let atual = pr.tema || 'janela', fundo = pr.fundo || '';
        const pintar = temas => {
          caixa.innerHTML = temas.map(t => `<button class="chip" data-notch-tema="${esc(t.id)}" aria-pressed="${t.id === atual}" title="${esc(t.autor ? 'de ' + t.autor : '')}">${esc(t.nome)}${t.seu ? ' ·seu' : ''}</button>`).join('');
          const t = temas.find(x => x.id === atual);
          linhaFundo.hidden = !t?.fundoEditavel;
          cor.value = fundo || t?.cores?.fundo || '#000000';
        };
        window.oceanoNativo.notchTemas().then(temas => {
          pintar(temas);
          caixa.onclick = e => { const b = e.target.closest('[data-notch-tema]'); if (!b) return; atual = b.dataset.notchTema; fundo = ''; window.oceanoNativo.notchDefinir({ tema: atual, fundo: '' }); pintar(temas); };
          cor.oninput = () => { fundo = cor.value; window.oceanoNativo.notchDefinir({ fundo }); };
          el.querySelector('[data-notch-fundo-padrao]').onclick = () => { fundo = ''; window.oceanoNativo.notchDefinir({ fundo: '' }); pintar(temas); };
        });
        el.querySelector('[data-notch-pasta]').onclick = () => window.oceanoNativo.notchPastaTemas();
      });
    }

    ligarGuardrails(el, app);
    el.addEventListener('change', e => {
      if (e.target.dataset.cfg === 'tema') app.aplicarTema(e.target.value);
      if (e.target.dataset.cfg === 'som') app.definirSom(e.target.checked);
      if (e.target.dataset.cfg === 'pip-auto') app.guardado.gravar('pip-auto', e.target.checked);
      if (e.target.dataset.cfg === 'home-janelas') app.guardado.gravar('home-janelas', e.target.value);
      if (e.target.dataset.cfg === 'robo-tema') app.guardado.gravar('robo-tema', e.target.checked);
      if (e.target.dataset.cfg === 'uso-anonimo') { app.guardado.gravar('uso-anonimo', e.target.checked); contarUso(app.guardado); }
      if (e.target.dataset.cfg === 'restaurar-abas') { app.guardado.gravar('restaurar-abas', e.target.checked); app.navegacao?.salvarSessao(); }
      if (e.target.dataset.cfg === 'musica-fechar-aba') { app.guardado.gravar('musica-fechar-aba', e.target.checked); app.midia?.aoGravarOpcao(e.target.checked); }
      if (e.target.dataset.cfg === 'agua') app.agua.definirIntervalo(Number(e.target.value));
      if (e.target.dataset.cfg === 'agua-encher') app.agua.definir({ encher: Number(e.target.value) });
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.matches('[data-apagar-uso]')) {
        app.guardado.gravar('uso-anonimo', false);
        const caixa = el.querySelector('[data-cfg="uso-anonimo"]'); if (caixa) caixa.checked = false;
        window.oceanoNativo?.contagemApagar?.().then(r => { el.querySelector('[data-apagar-uso-nota]').textContent = r?.ok ? 'Pronto: seus dados de uso foram apagados.' : 'Sem conexão agora. A remoção fica guardada e o Oceano tenta de novo ao abrir.'; });
        return;
      }
      if (b.dataset.dither) { app.definirDither(b.dataset.dither); el.querySelectorAll('.cfg-opcoes [data-dither]').forEach(x => x.setAttribute('aria-pressed', x === b)); }
      if (b.hasAttribute('data-esconder-sensivel')) { app.sensivel?.esconder(); app.aviso('Informações locais escondidas.', 'Segurança'); }
      if (b.hasAttribute('data-consumo-abrir')) { e.stopPropagation(); app.consumo?.abrir(); }
      if (b.hasAttribute('data-organizar')) { app.organizarMesa(); app.aviso('Janelas de volta ao lugar.', 'Mesa'); }
      if (b.hasAttribute('data-agua-agora')) app.agua.mostrar();
      if (b.dataset.buscador) { app.definirBuscador(b.dataset.buscador); el.querySelectorAll('[data-buscador]').forEach(x => x.setAttribute('aria-pressed', x === b)); }
      if (b.hasAttribute('data-ia-salvar')) {
        const chave = el.querySelector('[data-ia-chave]').value.trim();
        app.ia.definir({ modelo: el.querySelector('[data-ia-modelo]').value, ...(chave ? { chave } : {}) }).then(() => { el.querySelector('[data-ia-chave]').value = ''; estadoIA(); app.aviso('IA da busca salva.', 'Busca'); });
      }
      if (b.hasAttribute('data-ia-remover')) app.ia.definir({ chave: '' }).then(() => { estadoIA(); app.aviso('Chave removida da memória.', 'Busca'); });
      if (b.dataset.aguaEstilo) { app.agua.definir({ estilo: b.dataset.aguaEstilo }); el.querySelectorAll('[data-agua-estilo]').forEach(x => x.setAttribute('aria-pressed', x === b)); }
    });
    // estado da IA: só "tem chave" e o modelo; a chave em si nunca volta para a página
    async function estadoIA() {
      if (!app.real) return;
      const e = await app.ia.estado();
      el.querySelector('[data-ia-estado]').innerHTML = e.configurada
        ? `Configurada. A chave fica só neste computador, nunca na página. ${e.guardadas ? `${e.guardadas} busca(s) guardada(s).` : ''}`
        : 'Sem chave. Crie uma em console.anthropic.com e cole aqui; ela fica só neste computador. Sem IA, as buscas mostram as outras opções.';
      el.querySelector('[data-ia-modelo]').innerHTML = Object.entries(e.modelos || {}).map(([id, n]) => `<option value="${id}" ${id === e.modelo ? 'selected' : ''}>${esc(n)}</option>`).join('');
      el.querySelector('[data-ia-remover]').hidden = !e.configurada;
    }
    estadoIA();
    if (location.hash === '#busca' || r.url.endsWith('#busca')) el.querySelector('#busca')?.scrollIntoView();
    const tirar = app.on('agua', n => { const c = el.querySelector('[data-copos]'); if (c) c.textContent = n; });
    const tirarHora = ligarHora(el, app);
    ligarClima(el, app);
    return { desmontar: () => { tirar?.(); tirarHora(); } };
  },
};

export const PAGINAS = { downloads, 'nova-aba': nova, mods: comAbasDeAjustes('mods', mods), editar, temas: comAbasDeAjustes('temas', temas), 'editor-tema': editorTema, jogo, rede: comAbasDeAjustes('rede', rede), sobre, offline, privacidade: comAbasDeAjustes('privacidade', privacidade), atalhos: comAbasDeAjustes('atalhos', atalhos), configuracoes: comAbasDeAjustes('configuracoes', configuracoes), busca, pico8, strudel, stave: strudel, avatar: comAbasDeAjustes('avatar', avatar), manifesto, historico, leitura, ia: comAbasDeAjustes('ia', ia), bau, sampler, gimp, retoque, ferramentas: caixaFerramentas, trilha: trilhaPagina, cds: cdsPagina, micromediaflash, robo: roboSim };
