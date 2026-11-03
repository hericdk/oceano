// oceano://manifesto — a premissa que orienta o projeto inteiro. O mesmo texto está em docs/MANIFESTO.md.

import { icone } from './icones.js';

export const manifesto = {
  titulo: () => 'Manifesto',
  icone: 'oceano',
  html: () => `
    <div class="folha manifesto">
      <header class="cab"><h1>${icone('oceano')}<span>Manifesto</span></h1>
        <p>Por que o Oceano existe e para quem ele é feito.</p></header>

      <section class="px bloco mf-abre">
        <p class="mf-grande">O Oceano não quer ser só mais um navegador. Ele quer ser um lugar onde as pessoas criam, aprendem e mostram o que sonham.</p>
      </section>

      <section class="px bloco mf-oceano">
        <h2>Por que um oceano</h2>
        <p>O Oceano é digital. É feito de pixels. Não é o mar de verdade, mas quer dar a mesma sensação de olhar para ele: a imensidão, a liberdade, o horizonte que não acaba, a sensação de que existe um destino e muitas possibilidades.</p>
        <p class="mf-perguntas"><b>Para onde eu posso ir? Até onde eu posso crescer? Aonde eu consigo chegar?</b></p>
        <p>O Oceano existe para ajudar as pessoas a responder essas perguntas. Por isso ele é oferecido de graça, para quem quiser navegar.</p>
      </section>

      <section class="px bloco">
        <h2>Para quem</h2>
        <p>Para quem faz vídeo. Não só para quem já é conhecido, mas principalmente para quem está começando: quem quer apresentar o próprio negócio, uma ideia, um sonho, fazer um vlog, ensinar alguma coisa ou simplesmente mostrar o que faz.</p>
        <p>Para quem programa, joga, desenha, faz música, e para quem ainda não sabe que consegue fazer nada disso.</p>
      </section>

      <section class="px bloco">
        <h2>O que a gente acredita</h2>
        <ol class="mf-lista">
          <li><b>Ferramenta boa ensina.</b> Cada parte do Oceano deve deixar quem usa um pouco melhor no que faz: uma dica, um exemplo, um passo a passo, um jeito novo de ver. Usar e aprender acontecem juntos.</li>
          <li><b>Criar vem de série.</b> Música, pixel art, jogos, avatar, vídeo: as ferramentas de criação moram dentro do navegador, prontas para usar, sem cadastro.</li>
          <li><b>Feito para aparecer em vídeo.</b> O Oceano é bonito na tela e seguro para gravar: nada sensível aparece sem você querer.</li>
          <li><b>Ninguém cresce sozinho.</b> Grupos para trocar conhecimento, mostrar trabalhos, pedir ajuda e ajudar. Um lugar de conversa de verdade, no ritmo de um fórum, não de uma rede que grita.</li>
          <li><b>Uma vida melhor, não só um dia mais produtivo.</b> Pausas, água, músicas calmas, menos distração. A ferramenta cuida de quem usa.</li>
          <li><b>Para todo mundo.</b> Acessibilidade vem antes do estilo. Leve o bastante para computadores simples. Em português primeiro, aberto para outras línguas.</li>
          <li><b>Seu, de verdade.</b> Sem coletar o que você faz. Código aberto, para estudar, copiar ideias e levar adiante.</li>
        </ol>
      </section>

      <section class="px bloco">
        <h2>Para onde vamos</h2>
        <ul class="mf-lista">
          <li><b>Aprender fazendo:</b> trilhas curtas dentro das ferramentas (o primeiro beat, o primeiro sprite, o primeiro vídeo, o primeiro mod).</li>
          <li><b>Comunidade:</b> grupos por interesse (música, vídeo, jogos, negócios, primeiros passos), com espaço para mostrar trabalhos e trocar conhecimento.</li>
          <li><b>Para quem grava:</b> recursos para roteiro, gravação de tela e organização de ideias, pensados para quem está começando.</li>
          <li><b>Feito junto:</b> temas, mods e tutoriais da comunidade, com crédito para quem fez.</li>
        </ul>
        <p class="nota">É um caminho longo, feito aos poucos. O que já existe é o começo dele.</p>
      </section>

      <section class="px bloco">
        <h2>Quatro perguntas, respondidas por quem criou</h2>
        <div class="mf-qas">
          <article class="mf-qa"><h3>Isso ensina alguma coisa a quem usa?</h3><p>Eu achava que aprender música era difícil. Com um sintetizador, descobri que não. Quero dar acesso igualitário para que outras pessoas também possam aprender.</p></article>
          <article class="mf-qa"><h3>Funciona para quem está começando e aparece bem num vídeo?</h3><p>Sim! E quanto mais pessoas fizerem vídeos mostrando o que dá para fazer aqui, mais gente vai começar a criar algo único e livre.</p></article>
          <article class="mf-qa"><h3>Respeita a privacidade e a acessibilidade?</h3><p>É um princípio base desde o início. As duas coisas são importantes e necessárias, e conto com o apoio de todo mundo nos primeiros testes deste beta.</p></article>
          <article class="mf-qa"><h3>Aproxima as pessoas umas das outras?</h3><p>No futuro, quem sabe? Um fórum de discussões no estilo do Reddit seria muito positivo. E já temos uma ferramenta gráfica de ambientação 3D que pesa pouquíssimo: a cena inteira do mar, com céu, farol e chuva, cabe em 29 KB de código. Isso abre um potencial enorme para aproximar pessoas 👀</p></article>
        </div>
      </section>

      <section class="px bloco mf-livre">
        <p>Temos um potencial incrível para criar algo novo, seguro, interconectado, livre e pensado para ajudar as pessoas que o usarem, como símbolo de gratidão, empatia e troca. E pretendo manter tudo isso livre de propagandas.</p>
      </section>

      <section class="px bloco mf-fecha">
        <p><b>A Kara é a nossa persona principal. Um dia, todos terão um avatar próprio, e ela é a precursora desse novo futuro!</b></p>
        <p>Se o Oceano ajudar uma pessoa a apertar o botão de gravar pela primeira vez, ele já valeu a pena.</p>
        <p class="nota">@hericdk · <a href="#" data-ir="oceano://sobre">sobre o Oceano</a></p>
      </section>
    </div>`,
};
