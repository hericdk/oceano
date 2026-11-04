<p align="center"><img src="docs/imagens/cara.gif" width="320" alt="Kara, a navegadora do Oceano, piscando"></p>

> Oi! Eu sou a Kara, a sua navegadora. A primeira de um navegador com agentes de IA integrados desde o início. E adivinha só: o primeiro vibecodado também 😉

<p align="center"><b>Português</b> · <a href="docs/leia/README.en.md">English</a> · <a href="docs/leia/README.es.md">Español</a> · <a href="docs/leia/README.fr.md">Français</a> · <a href="docs/leia/README.it.md">Italiano</a> · <a href="docs/leia/README.de.md">Deutsch</a> · <a href="docs/leia/README.ja.md">日本語</a> · <a href="docs/leia/README.ko.md">한국어</a> · <a href="docs/leia/README.zh.md">中文</a> · <a href="docs/leia/README.hi.md">हिन्दी</a> · <a href="docs/leia/README.ar.md">العربية</a> · <a href="docs/leia/README.ru.md">Русский</a> · <a href="docs/leia/README.id.md">Bahasa Indonesia</a> · <a href="docs/leia/README.tr.md">Türkçe</a> · <a href="docs/leia/README.zh-Hant.md">繁體中文</a> · <a href="docs/leia/README.bn.md">বাংলা</a> · <a href="docs/leia/README.ur.md">اردو</a> · <a href="docs/leia/README.te.md">తెలుగు</a> · <a href="docs/leia/README.mr.md">मराठी</a> · <a href="docs/leia/README.ta.md">தமிழ்</a> · <a href="docs/leia/README.sw.md">Kiswahili</a> · <a href="docs/leia/README.ha.md">Hausa</a> · <a href="docs/leia/README.am.md">አማርኛ</a> · <a href="docs/leia/README.yo.md">Yorùbá</a> · <a href="docs/leia/README.zu.md">isiZulu</a> · <a href="docs/leia/README.so.md">Soomaali</a> · <a href="docs/leia/README.ne.md">नेपाली</a> · <a href="docs/leia/README.my.md">မြန်မာ</a> · <a href="docs/leia/README.km.md">ខ្មែរ</a> · <a href="docs/leia/README.lo.md">ລາວ</a> · <a href="docs/leia/README.fil.md">Filipino</a> · <a href="docs/leia/README.vi.md">Tiếng Việt</a> · <a href="docs/leia/README.ps.md">پښتو</a> · <a href="docs/leia/README.fa.md">فارسی</a> · <a href="docs/leia/README.ht.md">Kreyòl ayisyen</a> · <a href="docs/leia/README.mg.md">Malagasy</a></p>

# Oceano

Um navegador minimalista, aberto e em pixel art, para quem joga, cria e programa.
Baseado no Chromium, com contagem anônima de uso só se você autorizar, com temas e mods em Lua (a linguagem criada na PUC-Rio),
uma página inicial que é uma mesa de janelas sobre um mar pixelizado, e ferramentas de criação
dentro do próprio navegador.

> **Estado:** em desenvolvimento. → macOS (Apple Silicon) · Windows · Linux: [Releases](https://github.com/hericdk/oceano/releases/latest)

## Por que existe

> O Oceano não quer ser só mais um navegador. Ele quer ser um lugar onde as pessoas criam, aprendem e mostram o que sonham.

O Oceano é feito de pixels, não é o mar de verdade, mas quer dar a mesma sensação de olhar para ele: a
imensidão, a liberdade, o horizonte cheio de possibilidades. Para onde eu posso ir? Até onde eu posso crescer?
Aonde eu consigo chegar? Ele existe para ajudar as pessoas a responder isso, e por isso é de graça.

Ele é feito para quem cria e para quem grava vídeo, principalmente para quem está começando: apresentar um
negócio próprio, uma ideia, um sonho, fazer um vlog. Cada ferramenta deve ensinar alguma coisa, e a comunidade
(grupos de troca de conhecimento, no ritmo de um fórum) deve ajudar cada pessoa a crescer. Essa é a premissa
que orienta todo o projeto: leia o [manifesto](docs/MANIFESTO.md).

Navegadores ficaram parecidos entre si e cheios de coisas que ninguém pediu. O Oceano quer o
contrário: pequeno, bonito, verificável e feito para mexer. Não coletar é melhor que proteger;
tudo fica no seu computador; nenhuma conta é obrigatória.

Este é um projeto de médio e longo prazo. A ideia é me dedicar a ele por muitos anos, do jeito que
Sean Murray se dedicou a No Man's Sky: lançar cedo, ouvir quem usa e continuar melhorando, versão
depois de versão, até virar o navegador que ele promete ser. E fazer isso aberto, para que outras
pessoas possam estudar, se inspirar e levar as ideias adiante.

A visão completa está em [`docs/VISAO.md`](docs/VISAO.md).

### Quatro perguntas, respondidas por quem criou

**Isso ensina alguma coisa a quem usa?**

Eu achava que aprender música era difícil. Com um sintetizador, descobri que não. Quero dar acesso igualitário para que outras pessoas também possam aprender.

**Funciona para quem está começando e aparece bem num vídeo?**

Sim! E quanto mais pessoas fizerem vídeos mostrando o que dá para fazer aqui, mais gente vai começar a criar algo único e livre.

**Respeita a privacidade e a acessibilidade?**

É um princípio base desde o início. As duas coisas são importantes e necessárias, e conto com o apoio de todo mundo nos primeiros testes deste beta.

**Aproxima as pessoas umas das outras?**

No futuro, quem sabe? Um fórum de discussões no estilo do Reddit seria muito positivo. E já temos uma ferramenta gráfica de ambientação 3D que pesa pouquíssimo: a cena inteira do mar, com céu, farol e chuva, cabe em 29 KB de código. Isso abre um potencial enorme para aproximar pessoas 👀

> Temos um potencial incrível para criar algo novo, seguro, interconectado, livre e pensado para ajudar as pessoas que o usarem, como símbolo de gratidão, empatia e troca. E pretendo manter tudo isso livre de propagandas.

## O que já existe

| Pasta | O quê | Como rodar |
|---|---|---|
| [`simulador/`](simulador/) | A interface inteira rodando numa página: abas, mesa, temas, mods em Lua/Teal, trilha sonora, Strudel, PICO-8, lembrete de água | `python3 simulador/serve.py 5216` e abra http://localhost:5216 |
| [`app/`](app/) | MVP em Electron: a mesma interface com abas reais (Chromium), perfis isolados, bloqueador, mini player | `cd app && npm install && npm start` |
| [`extensao/`](extensao/) | Oceano Lite: a nova aba do Oceano como extensão do Chrome | veja `extensao/README.md` |
| [`docs/`](docs/) | Visão e plano | — |

Algumas coisas que dá para fazer hoje:

- **Página inicial como mesa:** janelas que você arrasta, recolhe e fecha sobre o mar com farol; cada perfil tem a sua mesa.
- **Temas** (`oceano-tema/1`, só JSON) que mudam as cores, o pixelizado e até a hora do dia do mar.
- **Mods em Lua 5.4 / Teal** num sandbox com permissões declaradas.
- **Grupos de abas** guardados na página inicial, fechados para não gastar memória.
- **Busca com IA** (opcional, com a sua chave) que responde numa linha e indica os sites certos.
- **Música:** trilha gerativa e live coding com Strudel pelo [Stave](https://stave.live) (timeline, grade, piano roll, mixer, visuais), com modo "ao vivo" e fundo transparente sobre o mar.
- **O básico de um navegador:** histórico, favoritos, procurar na página, zoom, clique direito, downloads, imprimir, abas que voltam e lista em voltar e avançar.
- **Duas telas iniciais:** o oceano com farol e a ilha, com ícones para trocar, céu que varia e clima da sua cidade (opcional).
- **Temas da comunidade:** veja [`docs/TEMAS.md`](docs/TEMAS.md). **Mods:** [`docs/MODS.md`](docs/MODS.md). **Segurança:** [`docs/SEGURANCA.md`](docs/SEGURANCA.md).
- **Privacidade verificável:** `oceano://rede` mostra cada conexão do próprio navegador.

## O gato

<p><img src="docs/imagens/gato.gif" width="240" alt="O gato do Oceano mexendo no computador"></p>

Se preferir, o seu avatar pode ser o gato. Você também pode criar o seu, em pixel, malha ou 3D.

## Gravar a tela com segurança

O Oceano foi pensado para aparecer em vídeos e lives. Informações locais (sites que você abriu, endereços,
regras de proxy) aparecem escondidas atrás de um bloco pixelizado com cadeado. Clicando, o Oceano avisa que
aquilo faz parte dos seus dados de segurança e só mostra se você confirmar; ao fechar o navegador, tudo volta
a ficar escondido. Partes que precisam de um servidor local, como o editor de avatar, são ligadas e
desligadas pelo próprio Oceano e só conversam com o seu computador.

## Acessibilidade

Acessibilidade vem antes do estilo. Todo tema deve ser fácil de ler: contraste mínimo de 4,5:1 para texto
(WCAG AA), estados que não dependem só da cor e contorno de foco visível. O editor de temas confere o
contraste ao vivo e avisa antes de salvar. Se você cria temas, leia o
[guia de acessibilidade](docs/ACESSIBILIDADE-TEMAS.md).

## Licença

O código do Oceano é **software livre**, sob a [GNU AGPL v3.0 ou posterior](LICENSE):
você pode usar, estudar, modificar e distribuir; quem distribuir uma versão modificada precisa
manter o código aberto, sob a mesma licença. O mesmo vale para quem oferecer uma versão modificada pela rede.

- **Mods e temas são seus.** Mods (scripts Lua/Teal que usam a API de mods) e temas (arquivos
  `oceano-tema`) não são considerados obras derivadas do Oceano e podem ter qualquer licença.
  Veja a permissão adicional em [`AVISOS.md`](AVISOS.md).
- **Partes de terceiros** mantêm as licenças delas (MIT, BSD, MPL-2.0, Apache-2.0, AGPL-3.0…).
  A lista completa, com o que cada uma pede, está em [`AVISOS.md`](AVISOS.md).

## Créditos

O Oceano é feito em cima do trabalho de muita gente. Em especial:

- **[Stave](https://stave.live)** de Mrityunjay Bhardwaj ([código no GitHub](https://github.com/MrityunjayBhardwaj/Stave), AGPL-3.0): o estúdio de música dentro do Oceano (`oceano://stave`), com timeline, grade, piano roll, mixer e visuais. No Oceano ele ganhou o modo "ao vivo", o fundo transparente e a gravação de vídeo com a música.
- **[Strudel](https://strudel.cc)** de Felix Roos, Alex McLean e comunidade ([código](https://codeberg.org/uzu/strudel), AGPL-3.0): a linguagem de música por código que move o Stave.
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)** de shinshin86 (MIT): o avatar animado da Navegadora e o editor de avatar.
- **Lua** (PUC-Rio), **Teal** (Hisham Muhammad), **three.js**, **Chromium** e **Electron**.
- **Modelo 3D do robô quadrúpede** (`simulador/robo/modelos/quadrupede.3mf`), licença BY-NC, conforme os dados do próprio arquivo: é usado **apenas no robô Quadrúpede**, e não nos outros robôs. Não está sob a AGPL do Oceano e não pode ter uso comercial.

- **[Whisper](https://github.com/openai/whisper)** da OpenAI (MIT), na conversão ONNX da [onnx-community](https://huggingface.co/onnx-community/whisper-base) (Apache-2.0): a transcrição de voz, que roda no computador e só é baixada se a pessoa pedir.
- **[Open-Meteo](https://open-meteo.com)**: o clima e a busca de cidades, sem chave e sem conta.

A lista completa, com as licenças, está em [`AVISOS.md`](AVISOS.md) e na página Sobre a Navegadora.

## Autor

Criado por **@hericdk** · Instagram [@hericdk](https://instagram.com/hericdk)

As contas oficiais do Oceano ainda vão nascer.
