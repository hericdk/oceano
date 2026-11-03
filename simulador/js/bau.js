// oceano://bau — o baú de senhas. Fechado com a senha-mestra (só você abre: a cifra está em bau-cripto.js).
// Recomendado guardar no guarda-senhas do próprio sistema (Senhas do macOS, conta do Windows, chaveiro do Linux),
// fora do navegador; sem ele, num arquivo cifrado do Oceano. Importa o CSV exportado pelo Chrome, Safari,
// Firefox, Edge, Bitwarden ou 1Password. Na tela, sites, usuários e senhas ficam atrás do cadeado (dá para gravar
// a tela sem expor nada); copiar uma senha limpa a área de transferência depois de 30 s.
// O baú é desenhado em pixel art (caixa 3D em CSS, faces em canvas, nas cores do tema pixelizado).

import { icone } from './icones.js';
import { sensivel } from './sensivel.js';
import { criar, abrir, abrirComRecuperacao, abrirComChave, exportarChave, trocarSenha, novaRecuperacao, fechar, lerCsv, gerarSenha } from './bau-cripto.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TRANCAR_EM = 10 * 60 * 1000;   // tranca sozinho depois de 10 minutos parado

// ---------- o desenho: tábuas, cintas de metal, cravos e o cadeado; reduzido às cores do tema ----------
function face(cv, w, h, tipo, paleta) {
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const madeira = ['#7a4a26', '#9c6234', '#b97a40'], metal = ['#3b3f4a', '#8a909c', '#d9dde4'], ouro = '#e6b84a';
  const sombra = tipo === 'lado' ? 0.72 : tipo === 'topo' ? 1.12 : 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const tabua = tipo === 'topo' ? Math.floor(x / 6) : Math.floor(y / 5);
    let cor = madeira[(tabua + (((x * 7 + y * 3) >> 3) % 2)) % 3];
    if ((tipo === 'topo' ? x % 6 === 0 : y % 5 === 0)) cor = '#4a2c16';                       // vão entre tábuas
    const cinta = tipo === 'topo' ? (y < 2 || y >= h - 2 || Math.abs(y - h / 2) < 1) : (x < 3 || x >= w - 3 || Math.abs(x - w / 2) < 2);
    if (cinta) cor = metal[(x + y) % 4 === 0 ? 2 : 1];
    if (cinta && (x + y) % 9 === 0) cor = metal[0];                                            // cravos
    if (y === 0 || y === h - 1 || x === 0 || x === w - 1) cor = '#1d1410';                    // contorno
    c.fillStyle = cor; c.fillRect(x, y, 1, 1);
  }
  if (tipo === 'frente') {                                                                    // cadeado
    const cx = Math.floor(w / 2) - 3;
    c.fillStyle = '#1d1410'; c.fillRect(cx - 1, 1, 8, 9);
    c.fillStyle = ouro; c.fillRect(cx, 2, 6, 7);
    c.fillStyle = '#1d1410'; c.fillRect(cx + 2, 4, 2, 3);
  }
  // sombra da face + redução às cores do tema pixelizado
  const img = c.getImageData(0, 0, w, h), d = img.data, pal = paleta.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  for (let p = 0, i = 0; p < d.length; p += 4, i++) {
    const r = (BAYER[((i / w | 0) & 3) * 4 + (i % w & 3)] / 16 - 0.5) * 36;
    const v = [d[p] * sombra + r, d[p + 1] * sombra + r, d[p + 2] * sombra + r];
    let m = 0, dist = Infinity;
    for (let k = 0; k < pal.length; k++) { const q = pal[k], dd = (v[0] - q[0]) ** 2 * .3 + (v[1] - q[1]) ** 2 * .59 + (v[2] - q[2]) ** 2 * .11; if (dd < dist) { dist = dd; m = k; } }
    // o tema pode ter poucas cores quentes: mistura metade da cor original para a madeira continuar madeira
    d[p] = (pal[m][0] + v[0]) / 2; d[p + 1] = (pal[m][1] + v[1]) / 2; d[p + 2] = (pal[m][2] + v[2]) / 2;
  }
  c.putImageData(img, 0, 0);
}

function htmlBau() {
  return `<div class="bau-cena" aria-hidden="true"><div class="bau3d">
    <canvas class="bf bf-frente"></canvas><canvas class="bf bf-tras"></canvas><canvas class="bf bf-lado bf-esq"></canvas><canvas class="bf bf-lado bf-dir"></canvas><div class="bf bf-fundo"></div>
    <div class="bau-tampa"><canvas class="bt bt-frente"></canvas><canvas class="bt bt-topo"></canvas><canvas class="bt bt-lado bt-esq"></canvas><canvas class="bt bt-lado bt-dir"></canvas></div>
    <div class="bau-brilho"></div></div></div>`;
}
function pintarBau(el, paleta) {
  for (const cv of el.querySelectorAll('.bf-frente, .bf-tras')) face(cv, 48, 26, cv.classList.contains('bf-frente') ? 'frente' : 'tras', paleta);
  for (const cv of el.querySelectorAll('.bf-lado')) face(cv, 28, 26, 'lado', paleta);
  face(el.querySelector('.bt-frente'), 48, 10, 'tras', paleta);
  face(el.querySelector('.bt-topo'), 48, 28, 'topo', paleta);
  for (const cv of el.querySelectorAll('.bt-lado')) face(cv, 28, 10, 'lado', paleta);
}

// desligado no lançamento: a página não lê nem grava nada e não chama o guarda-senhas do sistema
const BAU_ATIVO = false;
const CAMINHOS = [
  ['Senha-mestra', 'Um baú fechado com uma senha que só você sabe, cifrado antes de ir para qualquer lugar (AES-256).'],
  ['Chave de recuperação', '24 letras e números para anotar no papel e guardar longe do computador, caso você esqueça a senha-mestra.'],
  ['Guarda-senhas do sistema', 'Guardar fora do navegador: Senhas do macOS, conta do Windows ou chaveiro do Linux.'],
  ['Destrancar pelo sistema', 'Touch ID no Mac e Windows Hello no Windows, para não digitar a senha-mestra toda hora.'],
  ['Trazer suas senhas', 'Importar o arquivo CSV exportado por outro navegador ou gerenciador de senhas.'],
  ['Dois fatores com o app do Oceano', 'Um segundo passo para abrir o baú: o app próprio do Oceano, no seu celular, confirma que é você. Só a senha não basta para entrar.'],
];
const htmlDesativado = () => `
    <div class="folha bau-pag">
      <header class="cab"><h1>${icone('cadeado')}<span>Baú de senhas</span></h1>
        <p>Desativado nesta versão: o Oceano não guarda senhas de sites.</p></header>
      <div class="bau-palco">${htmlBau()}<div class="bau-lado"><h2>Menu do baú</h2>
        <button class="btn" data-bau-senhas aria-expanded="false" aria-controls="bau-senhas">${icone('cadeado')} Senhas</button></div></div>
      <section class="bau-desativado px" id="bau-senhas" hidden aria-labelledby="bau-senhas-titulo">
        <h2 id="bau-senhas-titulo">O sistema de senhas está desativado para o lançamento</h2>
        <p>Podemos ativá-lo e trazer mais segurança, mas por enquanto, como é um teste, vamos acompanhar os primeiros passos e evitar qualquer tipo de risco de falha de segurança nas primeiras versões, já que isso é um <b class="bau-beta">MVP em versão BETA</b>.</p>
        <p>Existe um sistema de senhas, mas estou deixando ele desabilitado de propósito. Desde o início, quero focar em funcionalidade e em preparar um ambiente seguro, respeitável e de empatia. A segurança das senhas vai chegar como uma atualização muito maior, com algo novo e bem mais eficiente, para ninguém correr o risco de se preocupar com senhas ou informações perdidas. Em tempos de IA, segurança da informação é um assunto muito importante e merece a atenção certa.</p>
        <p>Você pode fazer login nas suas ferramentas e plataformas normalmente, colocando a senha no campo do site, como em qualquer navegador. A gente só não guarda nem armazena senhas de sites. Os sites podem manter você conectado, como em qualquer navegador, e as chaves de IA que você conectar ficam cifradas neste computador.</p>
        <p>Isso será ativo no futuro, a partir do ganho de experiência e das opiniões dos usuários. Mas os caminhos que já pensei em usar são estes:</p>
        <ul class="bau-caminhos">${CAMINHOS.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ul>
        <p>Não é para escolher, é só para referência, mas preciso de ajuda e respostas quanto a isso.</p>
      </section>
    </div>`;

export const bau = {
  titulo: () => 'Baú de senhas',
  icone: 'cadeado',
  html: () => BAU_ATIVO ? htmlAtivo() : htmlDesativado(),
  montar(el, r, app) {
    if (!BAU_ATIVO) {
      pintarBau(el, app.tema.paleta);
      const botao = el.querySelector('[data-bau-senhas]'), caixa = el.querySelector('#bau-senhas');
      botao.onclick = () => {
        caixa.hidden = !caixa.hidden;
        botao.setAttribute('aria-expanded', String(!caixa.hidden));
        if (!caixa.hidden) caixa.scrollIntoView({ block: 'nearest' });
      };
      return { desmontar: () => {} };
    }
    return montarAtivo(el, r, app);
  },
};

const htmlAtivo = () => `
    <div class="folha bau-pag">
      <header class="cab"><h1>${icone('cadeado')}<span>Baú de senhas</span></h1>
        <p>Suas senhas num baú fechado com uma senha-mestra que só você sabe. Nem o Oceano consegue abrir sem ela.</p></header>
      <div class="bau-palco">${htmlBau()}<div class="bau-lado" data-bau-lado></div></div>
      <div data-bau-conteudo></div>
      <section class="bau-explica px" aria-labelledby="bau-como">
        <h2 id="bau-como">Como o baú funciona</h2>
        <dl>
          <dt>Trancado aqui na tela</dt><dd>Suas senhas são cifradas antes de ir para qualquer lugar (AES-256, o mesmo padrão de bancos e gerenciadores de senha). O que fica guardado é só texto embaralhado.</dd>
          <dt>Duas chaves abrem</dt><dd>A <b>senha-mestra</b>, do dia a dia, e a <b>chave de recuperação</b>: 24 letras e números que aparecem uma vez quando você cria o baú, para anotar no papel e guardar longe do computador. O Oceano não guarda nenhuma das duas.</dd>
          <dt>Esqueceu a senha-mestra?</dt><dd>No baú trancado, clique em “esqueci a senha-mestra”, digite a chave de recuperação e escolha uma senha nova. Perdeu as duas? Aí ninguém abre, nem a gente: é o preço de só você ter acesso.</dd>
          <dt>Onde fica guardado</dt><dd>No app, no guarda-senhas do sistema, fora do navegador: Senhas do macOS (Keychain), a proteção da sua conta do Windows ou o chaveiro do Linux. Sem ele, num arquivo que só o seu usuário do computador lê.</dd>
          <dt>E o Google Authenticator?</dt><dd>Aqueles códigos de 6 números servem para um site conferir quem está entrando. O baú não tem site nem servidor: ele mora no seu computador, então um código não protegeria nada de verdade. Para não digitar a senha-mestra todo dia, o baú destranca pelo próprio sistema.</dd>
          <dt>Destrancar pelo sistema</dt><dd>É o padrão no app: no Mac com <b>Touch ID</b>, a digital; no Windows, o <b>Windows Hello</b> (rosto, digital ou PIN). Na primeira vez que você abre o baú com a senha-mestra, o sistema pede a confirmação e pronto: depois, é só ela. A chave do baú fica guardada pelo Oceano no cofre do sistema (Keychain no Mac, proteção da conta no Windows) e só sai depois dessa confirmação. A senha-mestra e a chave de recuperação continuam valendo, e dá para desligar quando quiser. No Linux não existe um padrão de digital entre as distribuições, então lá fica a senha-mestra.</dd>
          <dt>Na tela</dt><dd>Sites, usuários e senhas ficam atrás do cadeado (dá para gravar a tela ou fazer live). Copiar uma senha limpa a área de transferência depois de 30 s, e o baú tranca sozinho depois de 10 minutos parado.</dd>
        </dl>
      </section>
    </div>`;

function montarAtivo(el, r, app) {
    const n = window.oceanoNativo, real = !!(app.real && n?.bauLer);
    pintarBau(el, app.tema.paleta);
    const cena = el.querySelector('.bau-cena'), lado = el.querySelector('[data-bau-lado]'), conteudo = el.querySelector('[data-bau-conteudo]');
    const loja = real
      ? { ler: () => n.bauLer(), gravar: d => n.bauGravar(d), info: () => n.bauInfo(), lugar: l => n.bauLugar(l),
          touchLigar: c => n.bauTouchLigar?.(c), touchAbrir: () => n.bauTouchAbrir?.(), touchDesligar: () => n.bauTouchDesligar?.() }
      : { ler: async () => app.guardado.ler('bau-sim', null), gravar: async d => { app.guardado.gravar('bau-sim', d); return true; }, info: async () => ({ lugar: 'oceano', sistemaDisponivel: false, nomeSistema: '', simulador: true }), lugar: async () => false,
          touchLigar: async () => false, touchAbrir: async () => null, touchDesligar: async () => true };
    let info = {}, pediuSozinho = false, aberto = null, itens = [], filtro = '', vivo = true, relogio = null;
    const abrirTampa = on => cena.classList.toggle('aberto', on);
    const tocar = () => { clearTimeout(relogio); relogio = setTimeout(() => { if (aberto) trancar('O baú trancou sozinho depois de 10 minutos parado.'); }, TRANCAR_EM); };
    const salvar = async () => { await loja.gravar(await fechar(aberto, itens)); };

    async function inicio() {
      const [guardado, i] = await Promise.all([loja.ler(), loja.info()]); info = i;
      if (!vivo) return;
      const aviso = info.simulador ? '<p class="nota">Simulador: o baú fica guardado só neste navegador, cifrado. No app, ele vai para o guarda-senhas do sistema.</p>'
        : info.sistemaDisponivel ? `<p class="bau-aviso">${icone('escudo')} <span><b>Recomendado:</b> guardar nas <b>${esc(info.nomeSistema)}</b>, fora do navegador. ${info.lugar === 'sistema' ? 'É onde o seu baú está agora.' : 'Seu baú está num arquivo do Oceano.'}</span></p>`
        : '<p class="bau-aviso">Este computador não tem um guarda-senhas do sistema disponível: o baú fica num arquivo cifrado do Oceano, que só o seu usuário lê.</p>';
      if (!guardado) {
        lado.innerHTML = `<h2>Criar o baú</h2>${aviso}
          <form class="bau-form" data-criar>
            <label><span>Senha-mestra</span><input type="password" name="s1" autocomplete="new-password" minlength="10" required></label>
            <label><span>Repita</span><input type="password" name="s2" autocomplete="new-password" required></label>
            <p class="nota">Use uma frase longa (10 letras ou mais). Ela não é guardada em lugar nenhum: se esquecer, o baú não abre mais.</p>
            <button class="btn">criar o baú</button><span class="nota ruim" data-msg></span></form>`;
        lado.querySelector('[data-criar]').onsubmit = async e => {
          e.preventDefault();
          const { s1, s2 } = e.target;
          if (s1.value.length < 10) return (lado.querySelector('[data-msg]').textContent = 'Use pelo menos 10 caracteres.');
          if (s1.value !== s2.value) return (lado.querySelector('[data-msg]').textContent = 'As duas não são iguais.');
          const novo = await criar(s1.value); itens = [];
          s1.value = s2.value = '';
          aberto = { chave: novo.chave, travas: novo.travas };
          await salvar(); abrirTampa(true); mostrarRecuperacao(novo.recuperacao, true);
        };
        return;
      }
      lado.innerHTML = `<h2>Baú trancado</h2>${aviso}
        ${info.touchLigado && guardado.travas ? `<div class="bau-botoes"><button class="btn" data-touch>${icone('digital')} destrancar com ${esc(info.nomeTouch || 'Touch ID')}</button></div><p class="nota">ou com a senha-mestra:</p>` : ''}
        <form class="bau-form" data-abrir><label><span>Senha-mestra</span><input type="password" name="s" autocomplete="current-password" required></label>
        <button class="btn">abrir</button><span class="nota ruim" data-msg></span></form>
        ${guardado.travas?.recuperacao ? '<button class="link-btn bau-esqueci" data-esqueci>esqueci a senha-mestra</button>' : ''}
        ${real && info.sistemaDisponivel ? `<label class="cfg-chave bau-onde"><input type="checkbox" data-sistema ${info.lugar === 'sistema' ? 'checked' : ''}> guardar nas ${esc(info.nomeSistema)}</label>` : ''}`;
      lado.querySelector('[data-abrir] input').focus();
      lado.querySelector('[data-abrir]').onsubmit = async e => {
        e.preventDefault();
        const msg = lado.querySelector('[data-msg]'); msg.textContent = 'abrindo…';
        const res = await abrir(guardado, e.target.s.value);
        e.target.s.value = '';
        if (!res) { msg.textContent = 'Senha-mestra errada.'; cena.classList.remove('treme'); void cena.offsetWidth; cena.classList.add('treme'); return; }
        aberto = res; itens = res.itens; abrirTampa(true); listar(); tocar(); ligarTouch(false);
      };
      lado.querySelector('[data-esqueci]')?.addEventListener('click', () => recuperar(guardado));
      const botaoTouch = lado.querySelector('[data-touch]');
      if (botaoTouch && !pediuSozinho) { pediuSozinho = true; setTimeout(() => vivo && !aberto && botaoTouch.isConnected && botaoTouch.click(), 400); }
      botaoTouch?.addEventListener('click', async () => {
        const msg = lado.querySelector('[data-msg]'); msg.textContent = `esperando o ${info.nomeTouch}…`;
        const chave = await loja.touchAbrir();
        if (!chave) { msg.textContent = `${info.nomeTouch} cancelado. Use a senha-mestra.`; return; }
        const res = await abrirComChave(guardado, chave);
        if (!res) {   // o baú foi refeito depois de ligar o Touch ID: a chave guardada não serve mais
          await loja.touchDesligar(); info.touchLigado = false;
          msg.textContent = `O ${info.nomeTouch} estava ligado a um baú antigo e foi desligado. Use a senha-mestra.`; return;
        }
        msg.textContent = ''; aberto = res; itens = res.itens; abrirTampa(true); listar(); tocar();
      });
      lado.querySelector('[data-sistema]')?.addEventListener('change', async e => {
        const ok = await loja.lugar(e.target.checked ? 'sistema' : 'oceano');
        app.aviso(ok ? (e.target.checked ? `Baú movido para as ${info.nomeSistema}.` : 'Baú movido para o arquivo do Oceano.') : 'Não deu para mudar o lugar do baú.', 'Baú', ok ? 'info' : 'erro');
      });
    }

    // a chave de recuperação aparece uma vez (atrás do cadeado, para não vazar em gravação de tela)
    function mostrarRecuperacao(codigo, nova) {
      tocar();
      lado.innerHTML = `<h2>${nova ? 'Baú criado' : 'Nova chave de recuperação'}</h2>
        <p class="nota">Anote esta <b>chave de recuperação</b> no papel e guarde longe do computador. Ela abre o baú se você esquecer a senha-mestra, e só aparece agora.</p>
        <p class="bau-codigo">${sensivel(codigo, 'chave de recuperação')}</p>
        <div class="bau-botoes"><button class="btn mini secundario" data-copiar-rec>copiar</button></div>
        <label class="cfg-chave"><input type="checkbox" data-anotei> anotei e guardei a chave</label>
        <div class="bau-botoes"><button class="btn" data-seguir disabled>abrir o baú</button></div>`;
      lado.querySelector('[data-copiar-rec]').onclick = async () => {
        await navigator.clipboard.writeText(codigo); app.aviso('Chave copiada. A área de transferência é limpa em 30 s.', 'Baú');
        setTimeout(async () => { try { if ((await navigator.clipboard.readText()) === codigo) await navigator.clipboard.writeText(''); } catch {} }, 30000);
      };
      lado.querySelector('[data-anotei]').onchange = e => { lado.querySelector('[data-seguir]').disabled = !e.target.checked; };
      lado.querySelector('[data-seguir]').onclick = () => { listar(); app.aviso(nova ? 'Baú criado e aberto.' : 'A chave antiga não abre mais o baú.', 'Baú'); if (nova) ligarTouch(false); };
    }

    // esqueci a senha-mestra: abre com a chave de recuperação e escolhe uma senha nova
    function recuperar(guardado) {
      lado.innerHTML = `<h2>Recuperar o baú</h2>
        <form class="bau-form" data-rec><label><span>Chave de recuperação</span><input name="c" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" required></label>
        <button class="btn">conferir</button><span class="nota ruim" data-msg></span></form>
        <button class="link-btn bau-esqueci" data-voltar>voltar para a senha-mestra</button>`;
      lado.querySelector('[data-voltar]').onclick = () => inicio();
      lado.querySelector('[data-rec] input').focus();
      lado.querySelector('[data-rec]').onsubmit = async e => {
        e.preventDefault();
        const msg = lado.querySelector('[data-msg]'); msg.textContent = 'conferindo…';
        const res = await abrirComRecuperacao(guardado, e.target.c.value);
        e.target.c.value = '';
        if (!res) { msg.textContent = 'Essa chave não abre o baú.'; cena.classList.remove('treme'); void cena.offsetWidth; cena.classList.add('treme'); return; }
        aberto = res; itens = res.itens; abrirTampa(true);
        formSenha('Chave certa. Agora escolha uma senha-mestra nova.', async () => app.aviso('Senha-mestra nova guardada.', 'Baú'));
      };
    }

    // escolher senha-mestra nova (depois da recuperação ou em "trocar senha-mestra")
    function formSenha(texto, depois) {
      tocar();
      lado.innerHTML = `<h2>Senha-mestra nova</h2><p class="nota">${texto}</p>
        <form class="bau-form" data-nova><label><span>Senha-mestra nova</span><input type="password" name="s1" autocomplete="new-password" minlength="10" required></label>
        <label><span>Repita</span><input type="password" name="s2" autocomplete="new-password" required></label>
        <button class="btn">guardar</button><span class="nota ruim" data-msg></span></form>`;
      lado.querySelector('[data-nova] input').focus();
      lado.querySelector('[data-nova]').onsubmit = async e => {
        e.preventDefault();
        const { s1, s2 } = e.target, msg = lado.querySelector('[data-msg]');
        if (s1.value.length < 10) return (msg.textContent = 'Use pelo menos 10 caracteres.');
        if (s1.value !== s2.value) return (msg.textContent = 'As duas não são iguais.');
        await trocarSenha(aberto, s1.value); s1.value = s2.value = '';
        await salvar(); listar(); await depois?.();
      };
    }

    // destrancar pelo sistema é o padrão: liga sozinho na primeira vez que o baú abre com a senha
    async function ligarTouch(pedido) {
      if (!aberto || !info.touchDisponivel || info.touchLigado) return;
      if (!pedido && app.guardado.ler('bau-touch-recusado', false)) return;
      const ok = await loja.touchLigar(await exportarChave(aberto));
      if (ok) { info.touchLigado = true; app.guardado.gravar('bau-touch-recusado', false); }
      else if (!pedido) app.guardado.gravar('bau-touch-recusado', true);
      app.aviso(ok ? `${info.nomeTouch} ligado: da próxima vez, o baú abre sem a senha-mestra.` : `${info.nomeTouch} não foi ligado. Dá para ligar depois em “Senha-mestra, recuperação e destrancar”.`, 'Baú', ok ? 'info' : 'erro');
      if (aberto) listar();
    }

    function trancar(motivo) {
      aberto = null; itens = []; clearTimeout(relogio);
      abrirTampa(false); conteudo.innerHTML = '';
      if (motivo) app.aviso(motivo, 'Baú');
      inicio();
    }

    function listar() {
      tocar();
      lado.innerHTML = `<h2>Baú aberto</h2>
        <p class="nota">${itens.length} senha${itens.length === 1 ? '' : 's'}. Os dados aparecem atrás do cadeado: clique num deles para mostrar.</p>
        <div class="bau-botoes"><button class="btn mini" data-novo>adicionar</button>
          <label class="btn mini secundario">importar CSV<input type="file" accept=".csv,text/csv" hidden data-csv></label>
          <button class="btn mini secundario" data-trancar>${icone('cadeado')} trancar</button></div>
        ${aberto.travas.recuperacao ? '' : `<p class="bau-aviso">${icone('escudo')} <span>Este baú ainda não tem chave de recuperação: se esquecer a senha-mestra, ele não abre. <button class="link-btn" data-rec-nova>criar agora</button></span></p>`}
        ${info.touchDisponivel && !info.touchLigado ? `<p class="bau-aviso">${icone('digital')} <span>Destrancar com o ${esc(info.nomeTouch || 'Touch ID')} neste computador, sem digitar a senha-mestra? <button class="link-btn" data-touch-ligar>ligar</button></span></p>` : ''}
        <details class="bau-ajuda"><summary>Senha-mestra, recuperação e destrancar</summary>
          <div class="bau-botoes"><button class="btn mini secundario" data-trocar>trocar a senha-mestra</button>
          ${info.touchDisponivel ? `<button class="btn mini secundario" ${info.touchLigado ? `data-touch-desligar>desligar o ${esc(info.nomeTouch)}` : `data-touch-ligar>ligar o ${esc(info.nomeTouch)}`}</button>` : ''}
          <button class="btn mini secundario" data-rec-nova>gerar outra chave de recuperação</button></div></details>
        <details class="bau-ajuda"><summary>Como exportar do Chrome, Safari, Firefox…</summary><ul>
          <li><b>Chrome / Edge:</b> Gerenciador de senhas → Configurações → Exportar senhas.</li>
          <li><b>Safari / Senhas do macOS:</b> app Senhas → Arquivo → Exportar todas as senhas.</li>
          <li><b>Firefox:</b> about:logins → ⋯ → Exportar senhas.</li>
          <li><b>Bitwarden / 1Password:</b> exportar como CSV.</li>
          <li>Depois de importar, apague o CSV: ele tem as senhas sem cifra.</li></ul></details>`;
      const vis = itens.filter(x => !filtro || (x.site + ' ' + x.nome + ' ' + x.usuario).toLowerCase().includes(filtro));
      conteudo.innerHTML = `<form class="busca px" data-bau-busca>${icone('escudo')}<input name="q" value="${esc(filtro)}" autocomplete="off" placeholder="Procurar no baú" aria-label="Procurar no baú"></form>
        <div class="bau-lista">${vis.map(x => `<div class="bau-item px" data-id="${esc(x.id)}">
          <span class="bau-texto"><b>${sensivel(x.nome || x.site || 'sem nome', 'site')}</b><small>${sensivel(x.usuario || '—', 'usuário')}</small></span>
          <span class="bau-senha">${sensivel(x.senha, 'senha')}</span>
          <span class="bau-acoes"><button class="btn mini" data-copiar title="Copiar a senha (limpa em 30 s)">copiar</button><button class="jb jb-x" data-apagar title="Apagar">${icone('fechar')}</button></span>
        </div>`).join('') || '<p class="nota">Nada aqui ainda.</p>'}</div>`;
      conteudo.querySelector('[data-bau-busca]').onsubmit = e => e.preventDefault();
      conteudo.querySelector('[data-bau-busca] input').oninput = e => { filtro = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; listar(); const i = conteudo.querySelector('[data-bau-busca] input'); i.focus(); i.setSelectionRange(pos, pos); };
      lado.querySelector('[data-trancar]').onclick = () => trancar();
      lado.querySelector('[data-novo]').onclick = novo;
      lado.querySelector('[data-trocar]').onclick = () => formSenha('A senha antiga deixa de abrir o baú. A chave de recuperação continua valendo.', () => app.aviso('Senha-mestra trocada.', 'Baú'));
      for (const b of lado.querySelectorAll('[data-touch-ligar]')) b.onclick = () => ligarTouch(true);
      lado.querySelector('[data-touch-desligar]')?.addEventListener('click', async () => {
        await loja.touchDesligar(); info.touchLigado = false; app.guardado.gravar('bau-touch-recusado', true); app.aviso(`${info.nomeTouch} desligado. Só a senha-mestra abre o baú.`, 'Baú'); listar();
      });
      for (const b of lado.querySelectorAll('[data-rec-nova]')) b.onclick = async () => { const c = await novaRecuperacao(aberto); await salvar(); mostrarRecuperacao(c, false); };
      lado.querySelector('[data-csv]').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        const novos = lerCsv(await f.text()); e.target.value = '';
        if (!novos.length) return app.aviso('Não achei senhas nesse arquivo. Ele precisa ser um CSV exportado com a coluna de senha.', 'Baú', 'erro');
        const ja = new Set(itens.map(x => x.site + '|' + x.usuario + '|' + x.senha));
        const add = novos.filter(x => !ja.has(x.site + '|' + x.usuario + '|' + x.senha));
        itens.push(...add); await salvar(); listar();
        app.aviso(`${add.length} senha${add.length === 1 ? '' : 's'} guardada${add.length === 1 ? '' : 's'} no baú${novos.length > add.length ? ` (${novos.length - add.length} repetida${novos.length - add.length === 1 ? '' : 's'})` : ''}. Agora apague o CSV.`, 'Baú');
      };
    }

    function novo() {
      tocar();
      conteudo.insertAdjacentHTML('afterbegin', `<form class="bau-form bau-novo px" data-form-novo>
        <label><span>Site</span><input name="site" placeholder="exemplo.com" autocomplete="off" required></label>
        <label><span>Usuário ou e-mail</span><input name="usuario" autocomplete="off"></label>
        <label><span>Senha</span><span class="bau-linha"><input name="senha" type="password" autocomplete="new-password" required><button type="button" class="btn mini secundario" data-gerar>gerar</button></span></label>
        <button class="btn mini">guardar</button></form>`);
      const f = conteudo.querySelector('[data-form-novo]');
      f.site.focus();
      f.querySelector('[data-gerar]').onclick = () => { f.senha.value = gerarSenha(); f.senha.type = 'password'; app.aviso('Senha forte gerada (20 caracteres).', 'Baú'); };
      f.onsubmit = async e => {
        e.preventDefault();
        itens.unshift({ id: crypto.randomUUID(), site: f.site.value.trim(), nome: f.site.value.trim(), usuario: f.usuario.value.trim(), senha: f.senha.value, criado: Date.now() });
        await salvar(); listar(); app.aviso('Guardado no baú.', 'Baú');
      };
    }

    conteudo.addEventListener('click', async e => {
      const item = e.target.closest('.bau-item'); if (!item || !aberto) return;
      tocar();
      const x = itens.find(i => i.id === item.dataset.id); if (!x) return;
      if (e.target.closest('[data-copiar]')) {
        await navigator.clipboard.writeText(x.senha);
        app.aviso('Senha copiada. A área de transferência é limpa em 30 s.', 'Baú');
        setTimeout(async () => { try { if ((await navigator.clipboard.readText()) === x.senha) await navigator.clipboard.writeText(''); } catch {} }, 30000);
      }
      if (e.target.closest('[data-apagar]') && confirm(`Apagar a senha de “${x.nome || x.site}”?`)) { itens = itens.filter(i => i !== x); await salvar(); listar(); }
    });

    inicio();
    return { desmontar: () => { vivo = false; clearTimeout(relogio); aberto = null; itens = []; } };
}
