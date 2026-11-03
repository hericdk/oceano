// oceano://avatar — ver e ajustar o avatar da Navegadora: prévia grande, visual (pixel, pixel nas cores
// do tema, original), voz, teste de emoções e o caminho para criar ou editar um avatar no
// Mesh Avatar Studio (editor local que transforma uma ilustração num avatar animado).

import { icone } from './icones.js';
import { montarVozSistema, montarVozNeural } from './voz-escolha.js';
import { abrirImagem, folhaDoEstado, juntarFolhas } from './avatar-sprite.js';

// o gato: a folha traz só a animação torta, numa linha; as outras a pessoa desenha na parte de IA
const GATO_ANIMACAO = ['jogando', 'Jogando', [[0, 1], [1, 1]]];
import { pedir as pedirMmf } from './micromediaflash.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ESTUDIO = 'http://127.0.0.1:5224/';
const EMOCOES = [['happy', 'feliz'], ['relaxed', 'tranquila'], ['surprised', 'surpresa'], ['sad', 'triste'], ['angry', 'brava']];
const ROSTO = [['smile', 'sorriso'], ['wink', 'piscadela'], ['blush', 'corada'], ['halfLidded', 'sonolenta']];

async function baixarGato() {
  const img = await abrirImagem('avatares/gato/folha.png'), [id, , quadros] = GATO_ANIMACAO;
  const blob = await new Promise(ok => folhaDoEstado(img, [84, 64], quadros).toBlob(ok, 'image/png'));
  const url = URL.createObjectURL(blob), link = Object.assign(document.createElement('a'), { href: url, download: `gato-${id}.png` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const avatar = {
  titulo: () => 'Avatar',
  icone: 'perfil',
  html: () => `
    <div class="folha avatar-pag">
      <header class="cab"><h1>${icone('perfil')}<span>Avatar da Navegadora</span></h1>
        <p>Veja como ela fica, escolha o visual e a voz e teste as expressões. Ela também flutua numa janelinha na página inicial.</p></header>
      <div class="av-grade">
        <div class="av-palco px"><canvas class="as-espelho" width="120" height="120" aria-label="Prévia do avatar"></canvas><span class="av-nome chip" data-av-nome>carregando…</span></div>
        <div class="av-controles">
          <section class="px bloco"><h2>Personagem</h2>
            <div class="cfg-opcoes" data-av-quem role="group" aria-label="Personagem"></div>
            <label class="av-campo"><span>Nome dela</span><input data-av-nomecampo maxlength="24" autocomplete="off" placeholder="Cara"></label>
            <button class="btn mini secundario" data-av-padrao>voltar para a Cara</button>
            <div class="av-3d">
              <p class="av-rotulo">avatar 3D</p>
              <label class="btn mini secundario av-importar3d">importar .vrm ou .glb<input type="file" accept=".vrm,.glb" data-av-3d hidden></label>
              <button class="btn mini secundario" data-av-apagar3d hidden>apagar este avatar 3D</button>
              <p class="nota" data-av-3d-nota aria-live="polite">VRM traz ossos, molas e expressões, e pode ser feito no Blender com um complemento de VRM. Um .glb sem ossos, como os da Oficina 3D, ganha movimento pela própria malha. Fica só neste computador.</p>
            </div>
            <div data-av-so2d><p class="av-rotulo">malha dos pontos</p><div class="cfg-opcoes" data-av-malha role="group" aria-label="Malha"></div>
            <p class="nota">A mínima custa ~3 ms por quadro e fica igual no tamanho da Navegadora; a densa, ~16 ms.
              <a href="avatares/lab/caminhos.html" target="_blank" rel="noopener">comparar os caminhos</a></p></div></section>
          <section class="px bloco"><h2>Visual</h2><div class="cfg-opcoes" data-av-visual role="group" aria-label="Visual"></div>
            <p class="nota">"Pixel + tema" reduz o avatar às cores do tema pixelizado, como o mar. "Pixel desenhado" usa o pixel art feito à mão, nas cores dele. Uma folha de pixel art segue o Pixel + tema e, nos outros visuais, mantém as próprias cores.</p></section>
          <section class="px bloco"><h2>Voz</h2>
            <label class="cfg-chave"><input type="checkbox" data-av-voz> falar em voz alta</label>
            <div data-av-sistema></div>
            <div data-av-neural aria-live="polite"></div></section>
          <section class="px bloco"><h2>Testar</h2>
            <p class="av-rotulo">emoções</p><div class="cfg-opcoes">${EMOCOES.map(([v, n]) => `<button class="chip" data-av-testar="${v}">${n}</button>`).join('')}</div>
            <p class="av-rotulo">rosto</p><div class="cfg-opcoes">${ROSTO.map(([v, n]) => `<button class="chip" data-av-testar="${v}">${n}</button>`).join('')}</div></section>
        </div>
      </div>
      <section class="px bloco av-caminhos" aria-labelledby="av-caminhos-titulo">
        <h2 id="av-caminhos-titulo">Três jeitos de criar</h2>
        <p class="av-conversa"><b>A Cara é a nossa persona principal. Um dia, todos terão um avatar próprio, e ela é a precursora desse novo futuro!</b></p>
        <p class="av-conversa">Quero que você escolha como dar forma à sua Navegadora, e não só usar o que eu imaginei. Por isso são três caminhos. Nenhum é o certo: vai no que te der mais vontade. E dá para trocar quando quiser.</p>
        <div class="av-caminhos-grade">
          <article class="av-caminho">
            <p class="av-rotulo">malha 2D · o padrão</p>
            <h3>Um desenho que ganha vida</h3>
            <p>Foi assim que eu fiz a Cara, e é ela que aparece primeiro quando o Oceano abre. Você começa com um desenho, marca olhos, boca e cabelo, e ele passa a piscar, falar e reagir. É o caminho que eu recomendo para começar, porque dá um resultado bonito sem você precisar animar quadro por quadro.</p>
            <div class="av-caminho-acoes"><button class="btn mini" data-av-ir-malha>criar com malha</button></div>
          </article>
          <article class="av-caminho">
            <p class="av-rotulo">pixel art</p>
            <h3>O gato torto é a sua lição de casa</h3>
            <p>Deixei um gato de modelo, e ele está torto mesmo. Quando ele fica feliz, o desenho pula para o lado e a animação quebra. Eu podia ter arrumado, mas preferi deixar assim para você arrumar com a sua criatividade. Baixa a folha, abre no editor de pixel, ajeita os quadros e manda de volta. Quando ele estiver pronto, você já sabe fazer um personagem seu do zero.</p>
            <div class="av-caminho-acoes">
              <button class="btn mini" data-av-usar-gato>ver o gato</button>
              <button class="btn mini secundario" data-av-ir-pixel>abrir o editor de pixel</button>
            </div>
            <fieldset class="av-baixar-gato" data-av-gato-baixar>
              <legend>Baixar a folha do gato</legend>
              <span>${GATO_ANIMACAO[1]} <small>${GATO_ANIMACAO[2].length} quadros, uma linha só</small></span>
              <button class="btn mini secundario" type="button" data-av-gato-baixar-bt>baixar a folha</button>
              <button class="btn mini secundario" type="button" data-av-ir-ia>desenhar as outras na parte de IA</button>
              <p class="nota">Cada animação é uma linha só, sem descer para a de baixo. A folha traz uma animação; as outras você desenha na parte de IA.</p>
            </fieldset>
            <form class="av-pixel-form" data-av-pixel>
              <label class="av-campo av-campo-curto"><span>largura do quadro</span><input type="number" name="w" min="8" max="512" value="84"></label>
              <label class="av-campo av-campo-curto"><span>altura do quadro</span><input type="number" name="h" min="8" max="512" value="64"></label>
              <label class="btn mini secundario">enviar as minhas folhas (.png)<input type="file" accept="image/png" name="folha" multiple hidden></label>
              <button class="btn mini secundario" type="button" data-av-apagar-pixel hidden>apagar a minha folha</button>
            </form>
            <p class="nota" data-av-pixel-nota aria-live="polite">Envie uma folha para cada animação, em uma linha só, com digitando, jogando ou parado no nome do arquivo. Uma folha só também vale: cada linha é uma animação, nessa mesma ordem. Fica só neste computador.</p>
          </article>
          <article class="av-caminho">
            <p class="av-rotulo">3D · beta</p>
            <h3>Para quem pensa em volume</h3>
            <p>Esse aqui ainda é beta, então espera umas arestas. Mesmo assim fiz questão de deixar, porque acho justo: cada pessoa precisa de liberdade para criar com a própria imaginação, e isso inclui ter onde modelar em 3D. Você pode começar na Oficina 3D do editor de animação ou trazer um arquivo pronto do Blender.</p>
            <div class="av-caminho-acoes">
              <button class="btn mini" data-av-ir-3d>abrir o modelador 3D</button>
              <button class="btn mini secundario" data-av-ver-3d>importar .vrm ou .glb</button>
            </div>
          </article>
        </div>
        <p class="av-assinatura">@hericdk</p>
      </section>
      <section class="px bloco av-criar">
        <h2>Criar a partir das imagens</h2>
        <p class="nota">O jeito padrão de criar uma personagem: o rosto em close vira o avatar animado pelos pontos; a folha de
          ângulos (frente, lado e costas) dá as vistas e o 3D low-poly; o pixel art, se você tiver, vira o visual "Pixel desenhado".</p>
        <form class="av-criar-form" data-av-criar>
          <label class="av-campo"><span>Nome do projeto</span><input name="nome" required pattern="[a-z0-9][a-z0-9_\-]{0,39}" placeholder="cara-2" autocomplete="off"></label>
          <div class="av-entradas">
            ${[['rosto', 'Rosto em close', 'de frente, do peito para cima, olhos abertos, boca fechada, fundo liso', true], ['angulos', 'Folha de ângulos', 'frente, lado e costas lado a lado, fundo liso (opcional)', false], ['pixel', 'Pixel art', 'o mesmo close em pixel, desenhado à mão (opcional)', false]]
              .map(([n, t, d, obrig]) => `<label class="av-entrada"><b>${t}</b><small>${d}</small><img alt="" hidden data-av-prev="${n}"><input type="file" name="${n}" accept="image/png,image/jpeg,image/webp" ${obrig ? 'required' : ''}></label>`).join('')}
          </div>
          <div class="av-intro-botoes"><button class="btn" type="submit">guardar o pedido</button><span class="nota" data-av-criar-nota aria-live="polite"></span></div>
        </form>
        <p class="nota">Os pontos (olhos, boca, cabelo) ainda são postos por uma IA seguindo o guia do editor; depois você ajusta no editor abaixo.
          Tudo fica neste computador.</p>
      </section>
      <section class="px bloco av-editar">
        <h2>Editar o avatar</h2>
        <ol class="av-passos">
          <li><b>Ilustração.</b> De frente, do peito para cima, olhos abertos, boca fechada e fundo liso.</li>
          <li><b>Montar.</b> No editor abaixo, abra a ilustração: ele separa olhos, boca e cabelo.</li>
          <li><b>Ajustar.</b> Escolha uma parte à esquerda e arraste os pontos; a prévia mostra na hora.</li>
          <li><b>Usar.</b> Exporte o avatar pronto e ele aparece aqui.</li>
        </ol>
        <button class="btn mini" data-av-abrir-editor>abrir o editor</button>
        <div class="av-estudio janela" hidden data-dither="0" role="dialog" aria-label="Editor de avatar">
          <header class="jan-topo"><span class="jan-titulo">${icone('perfil')}<span>Editor de avatar</span></span>
            <span class="jan-botoes"><button class="jb jb-x" data-av-fechar-editor title="Fechar o editor">${icone('fechar')}</button></span></header>
          <div class="av-intro" data-av-intro>
            <h2>Antes de entrar</h2>
            <p>O editor de avatar roda aqui dentro, mas trabalha com um pequeno servidor no seu computador: é ele que abre e guarda os seus projetos. O Oceano liga esse servidor sozinho quando você entra e desliga quando você fecha o navegador. Ele só conversa com este computador; nada sai daqui.</p>
            <ul>
              <li><b>Ajustar um avatar:</b> escolha uma parte à esquerda (olhos, boca, cabelo…), arraste os pontos e veja a prévia ao lado.</li>
              <li><b>Avatar novo:</b> comece pela ilustração (de frente, olhos abertos, boca fechada, fundo liso). Ela é preparada uma vez e depois você ajusta aqui.</li>
              <li><b>O exemplo que vem junto é só para ver:</b> para mexer nele, use "Copy and keep editing", que cria uma cópia sua.</li>
              <li><b>O editor está em inglês</b> por enquanto (também tem japonês e chinês).</li>
            </ul>
            <div class="av-intro-botoes"><button class="btn" data-av-entrar>entrar no editor</button><span class="nota" data-av-estudio-nota aria-live="polite"></span></div>
          </div>
          <iframe title="Editor de avatar" data-av-quadro hidden></iframe>
        </div>
      </section>
    </div>`,
  montar(el, r, app) {
    let desligar = () => {}, tirarNeural = null;
    let vivo = true;
    app.carregarPainel?.('assistente').then(a => {
      if (!vivo) return;
      if (!a?.espelhar) { el.querySelector('[data-av-nome]').textContent = 'Navegadora indisponível'; return; }
      desligar = a.espelhar(el.querySelector('canvas'));
      el.querySelector('[data-av-nome]').textContent = a.nome();
      const vis = el.querySelector('[data-av-visual]');
      const desenharVisual = () => { vis.innerHTML = Object.entries(a.VISUAIS).map(([v, n]) => `<button class="chip" data-av-vis="${v}" aria-pressed="${a.visual() === v}">${esc(n)}</button>`).join(''); };
      desenharVisual();
      el.querySelector('[data-av-voz]').checked = a.voz();
      const quem = el.querySelector('[data-av-quem]'), malha = el.querySelector('[data-av-malha]'), campo = el.querySelector('[data-av-nomecampo]');
      const desenharPersonagem = () => {
        quem.innerHTML = Object.entries(a.PERSONAGENS).map(([v, p]) => `<button class="chip" data-av-quem-v="${v}" aria-pressed="${a.personagem() === v}">${esc(p.nome)}</button>`).join('');
        malha.innerHTML = Object.entries(a.MALHAS).map(([v, m]) => `<button class="chip" data-av-malha-v="${v}" aria-pressed="${a.malha() === v}">${esc(m.nome)}</button>`).join('');
        campo.value = a.nome(); campo.placeholder = a.PERSONAGENS[a.personagem()].nome;
        el.querySelector('[data-av-nome]').textContent = a.nome();
        el.querySelector('[data-av-apagar3d]').hidden = !a.PERSONAGENS[a.personagem()].local3d;
        el.querySelector('[data-av-so2d]').hidden = a.e3d() || !!(a.PERSONAGENS[a.personagem()].sprite || a.PERSONAGENS[a.personagem()].folhaPropria);
        el.querySelector('[data-av-apagar-pixel]').hidden = !a.PERSONAGENS['meu-pixel'];
      };
      desenharPersonagem();
      const nota3d = el.querySelector('[data-av-3d-nota]');
      const nota3dPadrao = nota3d.textContent;
      el.querySelector('[data-av-3d]').addEventListener('change', async e => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        nota3d.textContent = 'Abrindo o arquivo…';
        try {
          const i = await a.importar3d(f);
          desenharPersonagem();
          const como = i.temOssos ? `ossos${i.temMolas ? ', molas' : ''} e ${i.expressoes} expressões${i.temMolas ? '' : '; balanço pela malha'}` : `movimento pela malha${i.expressoes ? ` e ${i.expressoes} formas do arquivo` : ''}`;
          nota3d.textContent = `${i.formato}: ${i.triangulos.toLocaleString('pt-BR')} triângulos, ${como}.${i.triangulos > 100000 ? ' É pesado para o tamanho em que aparece: reduza no Blender se a página ficar lenta.' : ''}${i.licenca ? ' Confira a licença do autor antes de publicar: ' + i.licenca : ''}`;
        } catch (err) { nota3d.textContent = `Não deu: ${err.message || err}.`; }
      });
      campo.addEventListener('change', () => { a.definirNome(campo.value); desenharPersonagem(); });
      // pixel art: a folha da pessoa
      const formPixel = el.querySelector('[data-av-pixel]'), notaPixel = el.querySelector('[data-av-pixel-nota]');
      formPixel.addEventListener('change', async e => {
        if (e.target.name !== 'folha') return;
        const arquivos = [...e.target.files]; e.target.value = '';
        if (!arquivos.length) return;
        notaPixel.textContent = 'Abrindo a folha…';
        try {
          const w = Number(formPixel.w.value), h = Number(formPixel.h.value);
          const f = arquivos.length > 1 ? await juntarFolhas(arquivos, w, h) : arquivos[0];
          const i = await a.importarPixel(f, w, h);
          notaPixel.textContent = `${i.nome} já está em uso, com ${i.quadros} quadros. Olha lá em cima como ficou.`;
          desenharPersonagem();
          el.querySelector('.av-palco').scrollIntoView({ block: 'center' });
        } catch (err) { notaPixel.textContent = `Não deu: ${err.message || err}.`; }
      });
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-av-gato-baixar-bt')) baixarGato();
        if (b.hasAttribute('data-av-ir-ia')) app.navegar('oceano://ia');
        if (b.dataset.avVis) { a.definirVisual(b.dataset.avVis); desenharVisual(); }
        if (b.dataset.avQuemV) { a.definirPersonagem(b.dataset.avQuemV); desenharPersonagem(); }
        if (b.dataset.avMalhaV) { a.definirMalha(b.dataset.avMalhaV); desenharPersonagem(); }
        if (b.dataset.avQuemV || b.hasAttribute('data-av-apagar3d') || b.hasAttribute('data-av-padrao')) nota3d.textContent = nota3dPadrao;   // o resultado da importação era de outro avatar
        if (b.hasAttribute('data-av-apagar3d')) a.apagar3d(a.personagem()).then(desenharPersonagem);
        if (b.hasAttribute('data-av-padrao')) { a.voltarPadrao(); desenharPersonagem(); }
        if (b.dataset.avTestar) a.testar(b.dataset.avTestar);
        if (b.hasAttribute('data-av-usar-gato')) { a.definirPersonagem('gato'); desenharPersonagem(); el.querySelector('.av-palco').scrollIntoView({ block: 'center' }); }
        if (b.hasAttribute('data-av-apagar-pixel')) { a.apagarPixel(); desenharPersonagem(); }
      });
      const tirarSistema = montarVozSistema(el.querySelector('[data-av-sistema]'), a, app), tirarAltaVoz = montarVozNeural(el.querySelector('[data-av-neural]'), a, app);
      tirarNeural = () => { tirarSistema(); tirarAltaVoz(); };
      el.querySelector('[data-av-voz]').onchange = e => a.definirVoz(e.target.checked);
    });
    // os três caminhos; quem vem do atalho em Temas já cai neles
    if (r?.params?.get('area') === 'criar') el.querySelector('.av-caminhos').scrollIntoView({ block: 'start' });
    el.querySelector('[data-av-ir-malha]').onclick = () => { el.querySelector('.av-editar').scrollIntoView({ block: 'start' }); el.querySelector('[data-av-abrir-editor]').focus(); };
    el.querySelector('[data-av-ir-pixel]').onclick = () => app.navegar('oceano://micromediaflash');
    el.querySelector('[data-av-ir-3d]').onclick = () => { pedirMmf(app, 'modelo', { id: 'torre-3d' }).catch(err => app.aviso?.(`Não abri o exemplo em 3D: ${err.message}`, 'Avatar')); };
    el.querySelector('[data-av-ver-3d]').onclick = () => { el.querySelector('.av-3d').scrollIntoView({ block: 'center' }); el.querySelector('.av-importar3d').focus?.(); };
    // pedido de avatar novo: as imagens vão para um projeto do editor (no app pelo Oceano; no simulador pelo servidor dele)
    const form = el.querySelector('[data-av-criar]'), notaCriar = el.querySelector('[data-av-criar-nota]');
    const lerArquivo = f => new Promise(ok => { if (!f) return ok(null); const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
    form.addEventListener('change', e => {
      const i = e.target; if (i.type !== 'file') return;
      const img = form.querySelector(`[data-av-prev="${i.name}"]`), f = i.files[0];
      if (img.src) URL.revokeObjectURL(img.src);
      img.hidden = !f; if (f) img.src = URL.createObjectURL(f);
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const d = { nome: form.nome.value.trim().toLowerCase() };
      for (const n of ['rosto', 'angulos', 'pixel']) d[n] = await lerArquivo(form[n].files[0]);
      notaCriar.textContent = 'guardando…';
      try {
        const r = window.oceanoNativo?.avatarPedido ? await window.oceanoNativo.avatarPedido(d)
          : await (await fetch('/__avatar/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })).json();
        notaCriar.textContent = r.erro ? 'Não deu: ' + r.erro : `Pedido guardado (${r.arquivos.join(', ')}). Agora é pôr os pontos seguindo o guia do editor.`;
      } catch { notaCriar.textContent = 'Não deu para guardar: o servidor do simulador está desligado?'; }
    });
    // o editor roda num servidor local (ele lê e grava os projetos no disco); aparece aqui dentro, num quadro
    // abre o editor centralizado, por cima da página; o Oceano liga o servidor dele se ainda não estiver no ar
    const caixa = el.querySelector('.av-estudio'), nota = caixa.querySelector('[data-av-estudio-nota]');
    const noAr = () => fetch(ESTUDIO, { mode: 'no-cors' }).then(() => true, () => false);
    const ligar = () => window.oceanoNativo?.estudioLigar ? window.oceanoNativo.estudioLigar()
      : fetch('/__estudio/ligar').then(r => r.json()).then(j => j.estado, () => 'sem-servidor');
    const q = el.querySelector('[data-av-quadro]'), intro = el.querySelector('[data-av-intro]');
    // primeiro a explicação; o servidor só liga quando a pessoa decide entrar
    el.querySelector('[data-av-abrir-editor]').onclick = e => {
      document.body.append(caixa);   // fora da folha: assim fica centralizado na tela e por cima de tudo
      caixa.hidden = false;
      e.currentTarget.blur();
      (q.src ? q : caixa.querySelector('[data-av-entrar]')).focus();
    };
    caixa.querySelector('[data-av-entrar]').onclick = async e => {
      const botao = e.currentTarget;
      botao.disabled = true; nota.textContent = 'ligando o editor…';
      let ok = await noAr();
      if (!ok) {
        const estado = await ligar();
        if (estado === 'nao-instalado' || estado === 'sem-servidor') { nota.textContent = 'O editor ainda não está instalado neste computador.'; botao.disabled = false; return; }
        for (let i = 0; i < 40 && !ok && vivo; i++) { await new Promise(r => setTimeout(r, 500)); ok = await noAr(); }
      }
      if (!vivo) return;
      botao.disabled = false;
      if (!ok) { nota.textContent = 'O editor não respondeu. Tente de novo em alguns segundos.'; return; }
      nota.textContent = '';
      if (!q.src) q.src = ESTUDIO + '?lang=pt';   // o editor no idioma do Oceano
      intro.hidden = true; q.hidden = false;
    };
    el.querySelector('[data-av-fechar-editor]').onclick = () => { caixa.hidden = true; };
    return { desmontar: () => { vivo = false; desligar(); tirarNeural?.(); caixa.remove(); } };
  },
};
