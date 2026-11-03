// Lembrete de água. De tempos em tempos aparece uma janelinha pedindo um copo d'água:
//  - persistente: some depois de 2 ou 5 cliques (sorteado) e, a cada clique, pula até 10 px para um lado;
//  - discreta: fica num canto e some com um clique.
// "Bebi um copo" soma no contador do dia, sobe um copinho com +1 e a janela fica um tempo (30 s por padrão)
// com um copo de pixel enchendo e uma frase gentil; no fim ela some num pixelizar, pixel a pixel.

import { icone } from './icones.js';

const hoje = () => new Date().toLocaleDateString('sv');   // AAAA-MM-DD no fuso do computador
const PRIMEIRA = 'Esse é o seu tempo de ir beber água, aproveite e relaxe.';
const FRASES = [
  'Uma pausa pequena faz um dia inteiro melhor. Respira fundo.',
  'Enquanto o copo enche, solta os ombros.',
  'Água agora, o resto pode esperar um minutinho.',
  'Seu corpo agradece. Vai com calma.',
  'Bom momento para olhar para longe da tela.',
  'Um gole de cada vez. Você está indo bem.',
  'Aproveita e estica as costas, sem pressa.',
  'Pausa curta, cabeça mais leve.',
  'Esse tempo é seu. Aproveite.',
  'Bebe com calma, a tela continua aqui.',
  'Que tal piscar devagar enquanto isso?',
  'Mais um copo para a conta de hoje. Boa!',
];
const AVISOS = ['Hora de um copo d\'água.', 'Que tal um copo d\'água agora?', 'Passando para lembrar da água.', 'Um copo d\'água cai bem agora.'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const um = (lista, evitar) => { const l = lista.filter(x => x !== evitar); return l[Math.floor(Math.random() * l.length)]; };

export const PADRAO_AGUA = { intervalo: 45, estilo: 'persistente', encher: 30 };

export function iniciarAgua(app, guardado) {
  const conf = { ...PADRAO_AGUA, ...guardado.ler('agua', {}) };
  let el = null, timer = null;

  const copos = () => guardado.ler('agua-copos', {})[hoje()] || 0;
  function beber() {
    const c = guardado.ler('agua-copos', {}), d = hoje();
    c[d] = (c[d] || 0) + 1;
    for (const k of Object.keys(c).sort().slice(0, -60)) delete c[k];   // guarda só os últimos 60 dias
    guardado.gravar('agua-copos', c);
    app.emitir('agua', c[d]);
  }
  // a primeira frase do dia é sempre a mesma; depois, uma diferente da última
  function frase() {
    const f = guardado.ler('agua-frase', {});
    const texto = f.dia !== hoje() ? PRIMEIRA : um(FRASES, f.ultima);
    guardado.gravar('agua-frase', { dia: hoje(), ultima: texto });
    return texto;
  }

  function agendar(min = conf.intervalo) {
    clearTimeout(timer);
    if (min > 0) timer = setTimeout(mostrar, min * 60000);
  }

  function mostrar() {
    if (el) return;
    if (app.modoJogo) return agendar(5);   // não interrompe o jogo: tenta de novo em 5 min
    const persistente = conf.estilo === 'persistente';
    const faltam = persistente ? (Math.random() < 0.5 ? 2 : 5) : 1;
    let cliques = 0, enchendo = false;
    el = document.createElement('section');
    el.className = 'janela agua' + (persistente ? '' : ' discreta');
    el.dataset.dither = '0';   // aviso: corpo sólido, para a frase não misturar com o que estiver atrás
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', 'Lembrete de água');
    el.innerHTML = `
      <header class="jan-topo"><span class="jan-titulo">${icone('copo')}<span>Água</span></span>
        <span class="jan-botoes"><button class="jb jb-x" data-a="fechar" title="Fechar">${icone('fechar')}</button></span></header>
      <div class="jan-corpo">
        <p class="ag-msg" aria-live="polite">${um(AVISOS)}</p>
        <canvas class="ag-copo" width="20" height="24" hidden aria-hidden="true"></canvas>
        <p class="ag-copos"></p>
        <div class="ag-botoes"><button class="btn mini" data-a="bebi">bebi um copo</button><button class="btn mini secundario" data-a="depois">agora não</button></div>
        <p class="ag-faltam"></p>
      </div>`;
    document.body.append(el);

    // persistente: última posição guardada (ou o canto de baixo à direita); discreta: sempre o canto
    const ultima = persistente ? guardado.ler('agua-pos', null) : null;
    let x = ultima?.x ?? innerWidth - el.offsetWidth - 24, y = ultima?.y ?? innerHeight - el.offsetHeight - 72;
    const por = () => {
      x = Math.max(4, Math.min(innerWidth - el.offsetWidth - 4, x));
      y = Math.max(4, Math.min(innerHeight - el.offsetHeight - 4, y));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      if (persistente) guardado.gravar('agua-pos', { x, y });
    };
    const desenhar = () => {
      const n = copos(), resto = faltam - cliques;
      el.querySelector('.ag-copos').innerHTML = `${Array.from({ length: Math.min(n, 12) }, (_, i) => `<i class="${enchendo && i === Math.min(n, 12) - 1 ? 'novo' : ''}">${icone('copo')}</i>`).join('')}${n > 12 ? `<b>+${n - 12}</b>` : ''}<span>hoje: ${n} copo${n === 1 ? '' : 's'}</span>`;
      el.querySelector('.ag-faltam').textContent = enchendo ? '' : !persistente ? '' : resto > 1 ? `some depois de mais ${resto} cliques` : 'some no próximo clique';
    };
    el.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (enchendo) { if (b.dataset.a === 'fechar') sumir(); return; }
      if (b.dataset.a === 'bebi') return encher(b);
      if (++cliques >= faltam) return sumir();
      const ang = Math.random() * Math.PI * 2, d = 3 + Math.random() * 7;   // até 10 px, para um lado qualquer
      x += Math.cos(ang) * d; y += Math.sin(ang) * d;
      por(); desenhar();
    };

    // bebeu: o copo enche durante `conf.encher` segundos e a janela some sozinha
    function encher(botao) {
      enchendo = true;
      beber(); maisUm(botao);
      el.classList.add('enchendo');
      el.querySelector('.ag-msg').textContent = frase();
      el.querySelector('.ag-botoes').hidden = true;
      const cv = el.querySelector('.ag-copo'); cv.hidden = false;
      desenhar(); por();
      // por relógio (não por quadro de animação): continua certo mesmo com o Oceano atrás de outra janela
      const total = Math.max(3, conf.encher) * 1000, t0 = performance.now();
      const id = setInterval(() => {
        const t = Math.min(1, (performance.now() - t0) / total);
        copo(cv, t, performance.now() / 1000);
        if (t >= 1) { clearInterval(id); setTimeout(sumir, 600); }
      }, 80);
    }

    // some num pixelizar: os pixels vão saindo na ordem da matriz de Bayer 4×4
    function sumir() {
      if (!el || el.classList.contains('sumindo')) return;
      const alvo = el; alvo.classList.add('sumindo');
      let k = 0;
      const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 3;
      const id = setInterval(() => {
        k++;
        const cheios = BAYER.map((b, i) => b >= k ? i : -1).filter(i => i >= 0)
          .map(i => `<rect x='${i % 4}' y='${(i / 4) | 0}' width='1' height='1'/>`).join('');
        const svg = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'>${cheios}</svg>`)}")`;
        alvo.style.webkitMaskImage = alvo.style.maskImage = svg;
        alvo.style.webkitMaskSize = alvo.style.maskSize = `${u * 4}px ${u * 4}px`;
        if (k >= 16) { clearInterval(id); alvo.remove(); }
      }, 45);
      el = null;
      agendar();
    }

    desenhar(); por();
  }

  // copo de pixel: vidro, água subindo com uma onda e bolhinhas
  function copo(cv, t, s) {
    const c = cv.getContext('2d'), w = cv.width, h = cv.height, css = getComputedStyle(document.documentElement);
    const cor = k => css.getPropertyValue('--' + k).trim();
    c.clearRect(0, 0, w, h);
    const topo = 3, fundo = h - 2, esq = y => 3 + Math.round((y - topo) / (fundo - topo) * 2), dir = y => w - 4 - Math.round((y - topo) / (fundo - topo) * 2);
    const nivel = fundo - Math.round(t * (fundo - topo - 3));
    for (let y = topo; y <= fundo; y++) {
      const a = esq(y), b = dir(y);
      if (y >= nivel) {
        for (let x = a + 1; x < b; x++) {
          const onda = y === nivel && Math.sin(x * 1.3 + s * 6) > 0.3;
          c.fillStyle = onda ? cor('texto') : (x + y) % 5 === 0 && t < 1 && Math.sin(s * 5 + x) > 0.7 ? cor('suave') : cor('acento');
          c.fillRect(x, y, 1, 1);
        }
      }
      c.fillStyle = cor('texto'); c.fillRect(a, y, 1, 1); c.fillRect(b, y, 1, 1);
    }
    c.fillStyle = cor('texto'); c.fillRect(esq(fundo), fundo, dir(fundo) - esq(fundo) + 1, 1);
  }

  // o copinho com +1 que sobe do botão
  function maisUm(botao) {
    const r = botao.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'ag-mais';
    s.innerHTML = `${icone('copo')}+1`;
    s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + 'px';
    document.body.append(s);
    setTimeout(() => s.remove(), 1100);
  }

  app.agua = {
    copos, beber, mostrar, conf: () => ({ ...conf }),
    intervalo: () => conf.intervalo,
    definir(mudancas) { Object.assign(conf, mudancas); guardado.gravar('agua', conf); agendar(); },
    definirIntervalo(min) { this.definir({ intervalo: min }); },
  };
  agendar();
}
