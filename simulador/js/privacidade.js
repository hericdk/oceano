// oceano://privacidade — telemetria, DNS cifrado, bloqueador, perfis com proxy,
// permissões dos sites e versão do Chromium. Os controles só existem no app.

import { icone } from './icones.js';
import { sensivel } from './sensivel.js';
import { htmlScan, ligarScan } from './scan-seguranca.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cabecalho = (ic, titulo, texto) =>
  `<header class="cab"><h1>${icone(ic)}<span>${titulo}</span></h1>${texto ? `<p>${texto}</p>` : ''}</header>`;

export const privacidade = {
  titulo: () => 'Privacidade e segurança',
  icone: 'escudo',
  html: (r, app) => `
    <div class="folha privacidade">
      ${cabecalho('escudo', 'Privacidade e segurança', 'O que o Oceano não manda para ninguém, como ele resolve endereços, perfis separados, proxy e o que cada site pode usar.')}
      ${app.real ? '<div data-priv><p class="nota">Carregando…</p></div>' : '<section class="px bloco"><p>Estes controles existem no app do Oceano (abas reais). O simulador não acessa a internet.</p></section>'}
      ${htmlScan()}
    </div>`,
  montar(el, r, app) {
    ligarScan(el);
    if (!app.real) return null;
    const nativo = window.oceanoNativo;
    const raiz = el.querySelector('[data-priv]');
    let c, telemetria, permissoes, atualizacao = null;

    async function carregar() {
      [c, telemetria, permissoes] = await Promise.all([nativo.configLer(), nativo.telemetria(), nativo.permissoes()]);
      desenhar();
    }
    async function gravar(parcial, msg) {
      await nativo.configGravar(parcial);
      if (parcial.perfis) await app.recarregarPerfis();
      if (msg) app.aviso(msg, 'Privacidade');
      await carregar();
    }

    function desenhar() {
      const cfg = c.config;
      const opcoesProxy = Object.entries(c.proxies);
      raiz.innerHTML = `
      <div class="numeros">
        <div class="numero px"><b>${app.guardado.ler('uso-anonimo', false) === true ? '1 sinal por dia' : '0 bytes'}</b><span>de telemetria</span></div>
        <div class="numero px"><b>${cfg.dns.modo === 'desligado' ? 'não' : 'sim'}</b><span>DNS cifrado</span></div>
        <div class="numero px"><b>${cfg.perfis.length}</b><span>perfis isolados</span></div>
      </div>

      <section class="px bloco">
        <h2>Telemetria: o que está desligado</h2>
        <p class="nota">Sua contagem de uso: veja, desligue ou peça a remoção em <a href="#" data-ir="oceano://configuracoes">oceano://configuracoes</a></p>
        <table class="tabela"><tbody>${telemetria.map(([o, s]) => `<tr><td>${esc(o)}</td><td>${esc(s)}</td></tr>`).join('')}</tbody></table>
        <p class="nota">Conexões que o próprio Oceano faz (listas do bloqueador, DNS, verificar versão quando você pede) aparecem em <a href="#" data-ir="oceano://rede">oceano://rede</a>, com o motivo.</p>
      </section>

      <section class="px bloco">
        <h2>DNS cifrado</h2>
        <p>Sem isso, sua operadora (e quem estiver no mesmo Wi-Fi) vê o nome de cada site que você abre.</p>
        <div class="linha" role="radiogroup">
          ${[['seguro', 'Sempre cifrado', 'se o servidor cair, nada abre'], ['automatico', 'Cifrado quando der', 'cai para o DNS comum'], ['desligado', 'Desligado', 'DNS da rede']].map(([k, t, d]) =>
            `<label class="opcao"><input type="radio" name="dns-modo" value="${k}"${cfg.dns.modo === k ? ' checked' : ''}><b>${t}</b><small>${d}</small></label>`).join('')}
        </div>
        <label class="dev-campo"><span>Servidor</span><select data-dns-provedor${cfg.dns.modo === 'desligado' ? ' disabled' : ''}>
          ${Object.entries(c.dns).map(([k, p]) => `<option value="${k}"${cfg.dns.provedor === k ? ' selected' : ''}>${esc(p.nome)} · ${esc(p.onde)}</option>`).join('')}
        </select></label>
      </section>

      <section class="px bloco">
        <h2>Bloqueador de anúncios e rastreadores</h2>
        <label class="vivo"><input type="checkbox" data-bloqueador${cfg.bloqueador ? ' checked' : ''}> Bloquear em todas as abas (listas da Ghostery, código aberto)</label>
        <p class="nota">${app.bloqueador?.ligado === false && app.bloqueador.erro ? 'As listas não carregaram: ' + esc(app.bloqueador.erro) : 'O escudo na barra de endereço mostra quantos foram bloqueados na aba. Clique nele para liberar um site. Se você acredita e apoia o trabalho jornalístico daquele site, deixamos uma opção fácil para desativar isso pelo próprio ícone.'}</p>
        ${(cfg.liberados || []).length ? `<h3>Sites liberados (nada bloqueado neles)</h3><ul class="priv-liberados">${cfg.liberados.map(h => `<li>${sensivel(h, 'site liberado')} <button class="btn mini secundario" data-rebloquear="${esc(h)}">voltar a bloquear</button></li>`).join('')}</ul>` : ''}
      </section>

      <section class="px bloco" id="perfis">
        <h2>Perfis</h2>
        <p>Cada perfil tem cookies, logins, cache e armazenamento próprios. Um site aberto no Trabalho não sabe nada do Pessoal. A cor aparece na aba.</p>
        <div class="perfis">
          ${cfg.perfis.map((p, i) => `
          <article class="perfil px" data-i="${i}">
            <div class="linha">
              <input type="color" value="${esc(p.cor)}" data-cor aria-label="Cor">
              <input data-nome value="${esc(p.nome)}" maxlength="24" aria-label="Nome do perfil">
              <span class="espaco"></span>
              <button class="btn mini secundario" data-nova-aba>Nova aba</button>
              <button class="btn mini secundario" data-apagar-dados title="Cookies, logins, cache e armazenamento deste perfil">Apagar dados</button>
              ${p.id === 'pessoal' ? '' : '<button class="btn mini perigo" data-remover>Remover</button>'}
            </div>
            <div class="linha">
              <label class="dev-campo"><span>Proxy</span><select data-proxy>${opcoesProxy.map(([k, n]) => `<option value="${k}"${(p.proxy?.tipo || 'nenhum') === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
              ${p.proxy?.tipo === 'outro' ? `<input data-regra class="sv-campo" autocomplete="off" spellcheck="false" value="${esc(p.proxy.regra || '')}" placeholder="socks5://127.0.0.1:1080 ou http=host:porta" aria-label="Regra do proxy">` : ''}
              ${['burp', 'mitm', 'outro'].includes(p.proxy?.tipo) ? `<label class="vivo aviso-perigo"><input type="checkbox" data-aceitar${p.proxy.aceitarCert ? ' checked' : ''}> aceitar o certificado do proxy neste perfil</label>` : ''}
            </div>
            ${['burp', 'mitm', 'outro'].includes(p.proxy?.tipo) && p.proxy.aceitarCert ? '<p class="nota ruim">Atenção: com essa opção, este perfil aceita qualquer certificado enquanto o proxy estiver ligado. Use só para testes, nunca para banco ou e-mail.</p>' : ''}
            ${/^tor/.test(p.proxy?.tipo || '') ? '<p class="nota">Tor esconde seu IP, mas o Oceano não é o Tor Browser: a impressão digital do navegador continua a mesma. O Tor precisa estar rodando.</p>' : ''}
          </article>`).join('')}
        </div>
        <button class="btn mini" data-novo-perfil>Novo perfil</button>
        <p class="nota">Aba efêmera (⌘⇧N): uma sessão nova só na memória, apagada ao fechar a aba.</p>
      </section>

      <section class="px bloco">
        <h2>Permissões dos sites</h2>
        <p>Câmera, microfone, localização, notificações e o resto: o Oceano sempre pergunta. A resposta vale até fechar o Oceano.</p>
        ${permissoes.length ? `<table class="tabela"><thead><tr><th>Site</th><th>Pediu</th><th>Perfil</th><th>Resposta</th><th></th></tr></thead><tbody>
          ${permissoes.map(p => `<tr><td><code>${esc(p.origem)}</code></td><td>${esc(p.tipo)}</td><td>${esc(p.perfil)}</td><td>${p.permitida ? 'permitido' : 'bloqueado'}</td><td><button class="btn mini secundario" data-esquecer="${esc(p.chave)}">Esquecer</button></td></tr>`).join('')}
        </tbody></table><button class="btn mini secundario" data-esquecer-tudo>Esquecer todas</button>` : '<p class="nota">Nenhum site pediu nada ainda.</p>'}
      </section>

      <section class="px bloco">
        <h2>Versão e atualização</h2>
        <p>Chromium <b>${esc(nativo.versoes.chromium)}</b> · Electron ${esc(nativo.versoes.electron)}. Correções de segurança do Chromium saem a cada 4 semanas.</p>
        <p data-atualizacao>${atualizacao ? (atualizacao.erro ? esc(atualizacao.erro)
          : atualizacao.ultima === atualizacao.atual ? '✓ Você está na versão mais nova.'
          : `Existe o Electron <b>${esc(atualizacao.ultima)}</b>. Para atualizar este MVP: <code>npm install electron@latest</code> na pasta app.`) : ''}</p>
        <button class="btn mini" data-verificar>Verificar agora</button>
        <p class="nota">O Oceano só procura versão nova quando você clica. No navegador final, a atualização será automática, com aviso na tela.</p>
      </section>`;
    }

    raiz.addEventListener('change', e => {
      const t = e.target;
      const cfg = c.config;
      if (t.name === 'dns-modo') return gravar({ dns: { ...cfg.dns, modo: t.value } }, 'DNS atualizado.');
      if (t.matches('[data-dns-provedor]')) return gravar({ dns: { ...cfg.dns, provedor: t.value } }, 'Servidor de DNS trocado.');
      if (t.matches('[data-bloqueador]')) return gravar({ bloqueador: t.checked }, t.checked ? 'Bloqueador ligado.' : 'Bloqueador desligado.');
      const card = t.closest('[data-i]');
      if (!card) return;
      const perfis = structuredClone(cfg.perfis);
      const p = perfis[+card.dataset.i];
      if (t.matches('[data-cor]')) p.cor = t.value;
      else if (t.matches('[data-nome]')) p.nome = t.value.trim() || p.nome;
      else if (t.matches('[data-proxy]')) p.proxy = { tipo: t.value, regra: p.proxy?.regra || '', aceitarCert: false };
      else if (t.matches('[data-regra]')) p.proxy = { ...p.proxy, regra: t.value };
      else if (t.matches('[data-aceitar]')) p.proxy = { ...p.proxy, aceitarCert: t.checked };
      gravar({ perfis }, t.matches('[data-proxy]') ? `Proxy do perfil ${p.nome}: ${c.proxies[t.value]}.` : null);
    });

    raiz.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.rebloquear) { app.liberados = await nativo.bloqueadorLiberar('https://' + b.dataset.rebloquear + '/', false); app.desenharEscudo?.(); app.aviso('Bloqueio de volta neste site.', 'Bloqueador'); return carregar(); }
      const card = b.closest('[data-i]');
      const perfis = structuredClone(c.config.perfis);
      if (b.matches('[data-novo-perfil]')) {
        const n = perfis.length + 1;
        perfis.push({ id: 'perfil' + Date.now().toString(36), nome: 'Perfil ' + n, cor: ['#a6e3ff', '#7bd389', '#c792ea', '#ff9f43'][n % 4] });
        return gravar({ perfis }, 'Perfil criado.');
      }
      if (card && b.matches('[data-remover]')) {
        const p = perfis[+card.dataset.i];
        if (app.abas.some(a => a.perfil === p.id)) return app.aviso('Feche as abas deste perfil antes de remover.', 'Perfis', 'erro');
        await nativo.perfilApagarDados(p.id);
        perfis.splice(+card.dataset.i, 1);
        return gravar({ perfis }, `Perfil ${p.nome} removido e dados apagados.`);
      }
      if (card && b.matches('[data-apagar-dados]')) {
        await nativo.perfilApagarDados(perfis[+card.dataset.i].id);
        return app.aviso(`Dados do perfil ${perfis[+card.dataset.i].nome} apagados.`, 'Perfis');
      }
      if (card && b.matches('[data-nova-aba]')) return app.novaAba(undefined, true, { perfil: perfis[+card.dataset.i].id });
      if (b.dataset.esquecer) { await nativo.permissaoEsquecer(b.dataset.esquecer); return carregar(); }
      if (b.matches('[data-esquecer-tudo]')) { await nativo.permissaoEsquecer(null); return carregar(); }
      if (b.matches('[data-verificar]')) {
        b.disabled = true;
        try { atualizacao = await nativo.verificarAtualizacao(); } catch (err) { atualizacao = { erro: 'Não consegui verificar: ' + (err.message || err) }; }
        desenhar();
      }
    });

    carregar();
    return {};
  },
};
