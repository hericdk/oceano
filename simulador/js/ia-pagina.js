// oceano://ia — conectar as IAs (Claude, ChatGPT, Gemini, OpenRouter com um clique, Higgsfield), escolher qual
// faz cada papel (a Navegadora, tarefas rápidas, texto).
// As chaves ficam na memória do processo principal do app, só enquanto ele está aberto; a página nunca recebe uma de volta.

import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// um ícone por papel; quem responde pela Navegadora aparece com o rosto do avatar
const ICONE_DO_PAPEL = { executor: 'ferramentas', rapido: 'raio', redator: 'editar', midia: 'filme' };

export const ia = {
  titulo: () => 'Inteligência',
  icone: 'raio',
  html: (r, app) => `
    <div class="folha iap">
      <header class="cab"><h1>${icone('raio')}<span>Inteligência</span></h1>
        <p>Conecte as IAs que você já usa e escolha qual faz cada coisa. Cada IA cobra pelo uso direto na conta dela; a chave fica só na memória enquanto o Oceano está aberto: não é gravada em lugar nenhum e nunca aparece na tela. Ao fechar, ela some.</p></header>
      ${app.real ? `
      <section class="px bloco"><h2>Conectar uma IA</h2><div class="iap-provedores" data-iap-provedores></div><div data-iap-form></div></section>
      <section class="px bloco"><h2>Quem faz o quê</h2><div data-iap-papeis><p class="nota">carregando…</p></div></section>` : `
      <section class="px bloco"><h2>No app Oceano</h2><p>As conexões com as IAs ficam no app (o processo dele guarda as chaves com segurança). No simulador, a Navegadora continua respondendo por regras simples.</p></section>`}
    </div>`,
  montar(el, r, app, { linkParaCopiar = false } = {}) {
    const n = window.oceanoNativo;
    if (!app.real || !n?.agentesCatalogo) return;
    let cat = null, agentes = [], escolhido = null, modelos = [];
    const $ = s => el.querySelector(s);

    async function carregar() {
      cat ??= await n.agentesCatalogo();
      agentes = await n.agentesListar();
      desenharPapeis();
      $('[data-iap-provedores]').innerHTML = Object.entries(cat.provedores).map(([id, p]) => {
        const con = agentes.some(a => a.provedor === id && a.conectado);
        return `<button class="iap-prov px${con ? ' ok' : ''}" data-prov="${id}"><b>${esc(p.nome)}</b><small>${esc(p.empresa)}</small>${con ? '<span class="chip">conectado</span>' : ''}</button>`;
      }).join('');
      if (app.iaConectarAgora) {
        app.iaConectarAgora = false;
        const principal = agentes.find(a => a.papel === 'orquestrador');
        if (principal && cat.provedores[principal.provedor]) formulario(principal.provedor);   // já escolhida antes: só falta a chave
        $('[data-iap-provedores]').scrollIntoView({ block: 'center' });
        $('[data-prov]')?.focus({ preventScroll: true });
      }
    }
    function desenharPapeis() {
      $('[data-iap-papeis]').innerHTML = `<div class="iap-papeis">${Object.entries(cat.papeis).filter(([k]) => k !== 'executor' && k !== 'imagem').map(([k, p]) => {
        // sem chave nesta sessão ela não está de pé: a escolha guardada volta quando a chave for colada
        const a = agentes.find(x => x.papel === k && x.conectado);
        return `<div class="iap-papel px"><b>${esc(k === 'orquestrador' ? (app.assistente?.nome?.() || 'Navegadora') : p.nome)}</b><small>${esc(p.desc)}</small>
          ${a ? `<span>${esc(cat.provedores[a.provedor]?.nome || a.provedor)} · <code>${esc(a.modelo)}</code></span><button class="jb jb-x" data-remover="${esc(a.id)}" title="Tirar">${icone('fechar')}</button>` : '<span class="nota">nenhuma</span>'}</div>`;
      }).join('')}</div>`;
    }
    function formulario(id) {
      escolhido = id; modelos = [];
      const p = cat.provedores[id];
      const opcoes = ['orquestrador', 'rapido', 'redator', 'midia'].filter(k => p.papeis.includes(k));   // a mesma ordem em todas as IAs
      // a primeira IA só pode ser o orquestrador; as seguintes podem criar as outras funções, começando no executor rápido
      const primeira = !agentes.some(a => a.papel === 'orquestrador' && a.conectado);
      const padrao = primeira ? 'orquestrador' : opcoes.includes('rapido') ? 'rapido' : opcoes[0];
      $('[data-iap-form]').innerHTML = `<div class="iap-aviso" data-msg aria-live="polite" hidden></div><div class="iap-form px">
        <h3>${esc(p.nome)}</h3>
        ${p.umClique ? '<button class="btn" data-um-clique>conectar com um clique</button><p class="nota">ou cole a chave:</p>' : ''}
        <div class="iap-linha">${p.campos.map(c => `<label class="iap-campo"><span>${esc(c.rotulo)}${c.opcional ? ' (opcional)' : ''}</span><input type="password" autocomplete="off" spellcheck="false" data-campo="${esc(c.id)}" placeholder="${esc(c.dica)}"></label>`).join('')}
        <button class="btn mini" data-testar>testar a conexão</button></div>
        <div class="iap-linha" data-escolha hidden>
          <fieldset class="iap-papel-radio"><legend>Papel</legend>${opcoes.map(k => `<label title="${esc(cat.papeis[k].desc)}"><input type="radio" name="iap-papel" value="${k}" data-papel ${k === padrao ? 'checked' : ''} ${primeira && k !== 'orquestrador' ? 'disabled' : ''}>${icone(k === 'orquestrador' ? (app.assistente?.personagem?.() === 'gato' ? 'avatar-gato' : 'avatar-cara') : ICONE_DO_PAPEL[k] || 'raio')}<span>${esc(k === 'orquestrador' ? (app.assistente?.nome?.() || 'Navegadora') : cat.papeis[k].nome)}</span></label>`).join('')}</fieldset>
          <label class="iap-campo"><span>Modelo</span><input list="iap-modelos" data-modelo autocomplete="off"><datalist id="iap-modelos"></datalist></label>
          <button class="btn mini" data-salvar>salvar</button>
        </div>
        <div class="iap-instrucoes">
          <ol>${p.passos.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
          ${p.umClique || linkParaCopiar ? '' : `<p class="iap-acoes"><a href="#" data-site="${esc(p.site)}">abrir pelo link</a><button type="button" class="btn mini" data-copiar-site="${esc(p.site)}">copiar link</button></p><p class="nota">Copie o link e abra no navegador que você já usa, onde já está logado: assim sua conta fica fora do Oceano, e aqui você só cola a chave de API. Se preferir, também pode abrir aqui.</p>`}
          ${linkParaCopiar ? `<div class="iap-link"><code>${esc(p.site)}</code><button type="button" class="btn mini" data-copiar-site="${esc(p.site)}">Copiar</button></div><p class="nota">Por segurança, abra este link no navegador que você já usa, onde já está logado. Sua conta fica fora do Oceano, e aqui você só cola a chave de API.</p>` : ''}
        </div></div>`;
      // quem não pode ser orquestrador espera a primeira IA
      if (primeira && !opcoes.includes('orquestrador')) {
        avisar('ruim', 'Primeiro a IA principal', `${p.nome} só entra depois: conecte antes uma IA que responda por mim.`);
        el.querySelectorAll('[data-campo], [data-testar]').forEach(c => { c.disabled = true; });
      }
    }
    const papelEscolhido = () => $('[data-papel]:checked')?.value;
    const sugerir = () => { const p = cat.provedores[escolhido]; $('[data-modelo]').value = p.recomendado[papelEscolhido()] || modelos[0]?.id || ''; };
    // tipo: 'ok', 'ruim' ou vazio (só andamento). O rótulo fica colorido e o texto em branco, sempre com letra preta
    function avisar(tipo, rotulo, texto) {
      const msg = $('[data-msg]');
      msg.hidden = false;
      msg.innerHTML = `${rotulo ? `<b class="${tipo}">${esc(rotulo)}</b>` : ''}${texto ? `<span>${esc(texto)}</span>` : ''}`;
    }
    function pronto(res) {
      if (!res.ok) return avisar('ruim', 'Não deu', res.erro);
      avisar('ok', `Conectado ${res.final}`, res.reconectado ? 'Pronto, já está funcionando. Se quiser, mude o papel ou o modelo.' : 'Agora escolha o papel e o modelo.');
      modelos = res.modelos;
      $('#iap-modelos').innerHTML = modelos.slice(0, 400).map(m => `<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join('');
      $('[data-escolha]').hidden = false; sugerir();
      el.querySelectorAll('[data-papel]').forEach(r => { r.onchange = sugerir; });
      el.querySelectorAll('[data-campo]').forEach(i => { i.value = ''; });   // a chave sai da tela logo depois do teste
      if (res.reconectado) { app.emitir('ia-mudou'); n.agentesListar().then(l => { agentes = l; desenharPapeis(); }); }
    }

    el.addEventListener('click', async e => {
      const b = e.target.closest('button, a'); if (!b) return;
      if (b.dataset.prov) return formulario(b.dataset.prov);
      if (b.dataset.copiarSite) { await navigator.clipboard.writeText(b.dataset.copiarSite).catch(() => {}); b.textContent = 'copiado'; return; }
      if (b.dataset.site) { e.preventDefault(); return app.novaAba(b.dataset.site); }
      if (b.hasAttribute('data-um-clique')) { avisar('', '', 'Abrindo o OpenRouter no navegador do sistema…'); return pronto(await n.agentesOpenrouter()); }
      if (b.hasAttribute('data-testar')) {
        const segredos = Object.fromEntries([...el.querySelectorAll('[data-campo]')].map(i => [i.dataset.campo, i.value]));
        avisar('', '', 'Testando…');
        return pronto(await n.agentesTestar(escolhido, segredos));
      }
      if (b.hasAttribute('data-salvar')) {
        const res = await n.agentesSalvar({ provedor: escolhido, papel: papelEscolhido(), modelo: $('[data-modelo]').value.trim() });
        if (!res.ok) return avisar('ruim', 'Não deu', res.erro);
        app.aviso(`${res.agente.nome} pronto.`, 'IA'); $('[data-iap-form]').innerHTML = ''; app.emitir('ia-mudou'); return carregar();
      }
      if (b.dataset.remover) { await n.agentesRemover(b.dataset.remover); app.emitir('ia-mudou'); return carregar(); }
    });

    carregar();
  },
};
