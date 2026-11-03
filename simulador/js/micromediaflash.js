// oceano://micromediaflash — o editor de animação MicromediaFlash (projeto irmão, AGPL-3.0) dentro do Oceano.
// Roda num quadro da própria interface (servido em micromediaflash/) e usa a plataforma que deixamos pronta em
// uma plataforma por mensagens (js/quadros.js): projetos e exportações ficam na pasta do próprio Oceano (no app de verdade).
// No simulador e no Lite não há arquivos nativos: o editor usa os do navegador.
// A Navegadora conversa com o editor pela ponte de comandos (postMessage, ver micromediaflash/js/ponte.js).

const nativo = () => window.oceanoNativo;
let quadroAtual = null, pronto = null, seq = 0, origemQuadro = location.origin;
const esperando = new Map();

// ---------- plataforma (o editor chama estas funções) ----------
function seletor(arquivos, aceitaComputador) {
  return new Promise((resolve) => {
    const fundo = document.createElement('div');
    fundo.className = 'mmf-seletor-fundo';
    fundo.innerHTML = `<div class="mmf-seletor px" role="dialog" aria-label="Abrir projeto">
      <h3>Projetos do MicromediaFlash</h3>
      <p class="mmf-seletor-pasta">Pasta do Oceano</p>
      <div class="mmf-seletor-lista">${arquivos.length ? arquivos.map((a, i) => `<button class="btn mini" data-i="${i}">${a.nome.replace(/[<>&]/g, '')}<span>${new Date(a.alterado).toLocaleString()}</span></button>`).join('') : '<p>Nenhum projeto salvo ainda.</p>'}</div>
      <div class="mmf-seletor-acoes">${aceitaComputador ? '<button class="btn mini secundario" data-pc>Do computador…</button>' : ''}<button class="btn mini secundario" data-pasta>Mostrar a pasta</button><button class="btn mini" data-fechar>Cancelar</button></div>
    </div>`;
    const fim = (v) => { fundo.remove(); resolve(v); };
    fundo.addEventListener('click', (e) => {
      if (e.target === fundo) return fim(null);
      const b = e.target.closest('button');
      if (!b) return;
      if ('fechar' in b.dataset) return fim(null);
      if ('pc' in b.dataset) return fim('pc');
      if ('pasta' in b.dataset) { nativo().mmfMostrar('projetos'); return; }
      if (b.dataset.i !== undefined) fim(arquivos[+b.dataset.i]);
    });
    document.body.appendChild(fundo);
  });
}
function escolherDoComputador(accept, multiple) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept; input.multiple = multiple;
    input.onchange = () => resolve(multiple ? [...input.files] : input.files[0] || null);
    input.click();
  });
}
async function lerComoArquivo(nome) {
  const dados = await nativo().mmfLer(nome);
  return dados ? new File([dados], nome, { type: 'application/octet-stream' }) : null;
}

export function plataformaMmf(app) {
  return {
    async pickFile(accept = '', { multiple = false } = {}) {
      if (!/\.mmf/.test(accept) || multiple) return escolherDoComputador(accept, multiple);
      const escolha = await seletor(await nativo().mmfListar(), true);
      if (escolha === 'pc') return escolherDoComputador(accept, false);
      return escolha ? lerComoArquivo(escolha.nome) : null;
    },
    async saveFile({ suggestedName, ext, handle }, produce) {
      const partes = [];
      await produce((c) => partes.push(c instanceof Uint8Array ? c : new Uint8Array(c)));
      const dados = await new Blob(partes).arrayBuffer();
      if (ext === '.mmf') {
        // projeto novo nunca escreve por cima de outro: ganha um número
        let alvo = handle;
        if (!alvo) {
          const usados = new Set((await nativo().mmfListar()).map((a) => a.nome.toLowerCase()));
          const base = String(suggestedName || 'sem-titulo.mmf').replace(/\.mmf$/i, '');
          alvo = base + '.mmf';
          for (let i = 2; usados.has(alvo.toLowerCase()); i++) alvo = `${base} (${i}).mmf`;
        }
        const nome = await nativo().mmfGravar(alvo, dados);
        app.aviso(`Salvo em Oceano/MicromediaFlash/${nome}`, 'MicromediaFlash');
        return { name: nome, handle: nome };
      }
      const nome = await nativo().mmfExportar(suggestedName, dados);
      app.aviso(`Exportado para Oceano/MicromediaFlash/Exportações/${nome}`, 'MicromediaFlash');
      return { name: nome };
    },
    async download(blob, name) {
      const nome = await nativo().mmfExportar(name, await blob.arrayBuffer());
      app.aviso(`Exportado para Oceano/MicromediaFlash/Exportações/${nome}`, 'MicromediaFlash');
    },
    readFile: (nome) => lerComoArquivo(nome),
    plugins: () => nativo().mmfPlugins(),
    setTitle: () => {}, // a aba já se chama MicromediaFlash
    openUrl: (url) => app.novaAba(url),
  };
}

// ---------- ponte de comandos (Navegadora → editor) ----------
window.addEventListener('message', (e) => {
  if (!quadroAtual || e.source !== quadroAtual.contentWindow || e.origin !== origemQuadro) return;
  const m = e.data;
  if (m?.mmf === 'pronto') pronto?.resolve?.(m.versao);
  if (m?.mmf === 'resposta' && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id); }
});
// abre a página (se preciso), espera o editor ficar pronto e manda o pedido
export async function pedir(app, comando, args = {}) {
  if (!quadroAtual || !document.contains(quadroAtual)) {
    app.navegar('oceano://micromediaflash');
    for (let i = 0; i < 50 && !quadroAtual; i++) await new Promise((r) => setTimeout(r, 100));
  }
  if (!quadroAtual) throw new Error('o MicromediaFlash não abriu');
  await pronto?.promessa;
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { esperando.delete(id); reject(new Error('o editor não respondeu')); }, 60000);
    esperando.set(id, (m) => { clearTimeout(t); m.ok ? resolve(m.dados) : reject(new Error(m.erro)); });
    quadroAtual.contentWindow.postMessage({ mmf: 'pedido', id, comando, args }, origemQuadro);
  });
}

export const micromediaflash = {
  titulo: () => 'MicromediaFlash',
  icone: 'cartucho',
  html: (r, app) => `<iframe class="mmf-quadro" src="${app.real ? 'oceano-ui://micromediaflash/micromediaflash/index.html' : 'micromediaflash/index.html'}" title="MicromediaFlash" allow="clipboard-read; clipboard-write; fullscreen; autoplay" ${app.real ? 'sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-popups allow-modals allow-pointer-lock"' : ''}></iframe>`,
  montar(el, r, app) {
    origemQuadro = app.real ? 'oceano-ui://micromediaflash' : location.origin;
    quadroAtual = el.querySelector('iframe');
    // baixado só o Oceano, sem a pasta do editor: explica em vez de mostrar uma página de erro
    fetch('micromediaflash/index.html', { method: 'HEAD' }).then(r => { if (!r.ok) throw 0; }).catch(() => {
      el.innerHTML = `<div class="folha"><section class="px bloco"><h2>O editor de animação não está nesta instalação</h2>
        <p>Ele é um projeto à parte. Baixe <a href="https://github.com/hericdk/micromediaflash" target="_blank" rel="noopener">hericdk/micromediaflash</a> numa pasta ao lado do Oceano e abra de novo.</p></section></div>`;
    });
    let ok;
    pronto = { promessa: new Promise((res) => { ok = res; }), resolve: (v) => ok(v) };
    return { desmontar: () => { quadroAtual = null; pronto = null; } };
  },
};
