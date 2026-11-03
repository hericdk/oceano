// Oceano — conexões com as IAs e cofre de chaves (processo principal; a tela nunca recebe uma chave de volta).
// Provedores: Anthropic, Gemini, OpenAI, OpenRouter (conectar com um clique) e Higgsfield.
// As chaves ficam só na memória, enquanto o app está aberto: nada é gravado e o sistema nunca é chamado (nem Chaves do Mac, nem pedido de senha).
// Os agentes (provedor + papel + modelo, sem chave) ficam em userData/agentes.json.
// Testes de conexão não gastam crédito: listar modelos (Claude, Gemini) e consultar um pedido inexistente (Higgsfield).
const { app, shell } = require('electron');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const AnthropicClient = Anthropic.default || Anthropic;

const arq = nome => path.join(app.getPath('userData'), nome);
const ler = (nome, padrao) => { try { return JSON.parse(fs.readFileSync(arq(nome), 'utf8')); } catch { return padrao; } };
const gravar = (nome, dado) => { const tmp = arq(nome) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(dado, null, 2), { mode: 0o600 }); fs.renameSync(tmp, arq(nome)); };

const PROVEDORES = {
  anthropic: {
    nome: 'Claude', empresa: 'Anthropic', site: 'https://console.anthropic.com/settings/keys',
    passos: ['Entre no Console da Anthropic (crie a conta se não tiver).', 'Em Billing, coloque um crédito (a API é cobrada à parte do seu plano).', 'Em API Keys, clique em Create Key, dê o nome “Oceano” e copie a chave.'],
    campos: [{ id: 'chave', rotulo: 'Chave da API', dica: 'começa com sk-ant-' },
      { id: 'workspace', rotulo: 'ID do workspace', dica: 'opcional · começa com wrkspc_ · só se a chave pedir', tipo: 'text', opcional: true }],
    papeis: ['orquestrador', 'executor', 'rapido', 'redator'],
    recomendado: { orquestrador: 'claude-opus-5-5', executor: 'claude-sonnet-5-5', rapido: 'claude-haiku-5-5', redator: 'claude-sonnet-5-5' },
  },
  gemini: {
    nome: 'Gemini', empresa: 'Google', site: 'https://aistudio.google.com/apikey',
    passos: ['Entre no Google AI Studio com sua conta Google.', 'Clique em Create API key (escolha ou crie um projeto).', 'Copie a chave.'],
    campos: [{ id: 'chave', rotulo: 'Chave da API', dica: 'começa com AIza' }],
    papeis: ['orquestrador', 'redator', 'executor', 'rapido', 'imagem'],
    recomendado: { orquestrador: 'gemini-2.5-pro', rapido: 'gemini-2.5-flash', imagem: 'gemini-2.5-flash-image' },
  },
  openai: {
    nome: 'ChatGPT', empresa: 'OpenAI', site: 'https://platform.openai.com/api-keys',
    passos: ['Entre na plataforma da OpenAI (crie a conta se não tiver).', 'Em Billing, coloque um crédito (a API é cobrada à parte do ChatGPT Plus).', 'Em API keys, clique em Create new secret key, dê o nome “Oceano” e copie a chave.'],
    campos: [{ id: 'chave', rotulo: 'Chave da API', dica: 'começa com sk-' }],
    papeis: ['orquestrador', 'redator', 'executor', 'rapido', 'imagem'],
    recomendado: { orquestrador: 'gpt-5', rapido: 'gpt-5-mini', imagem: 'gpt-image-1' },
  },
  openrouter: {
    nome: 'OpenRouter', empresa: 'vários modelos com uma conta', site: 'https://openrouter.ai/keys', umClique: true,
    passos: ['Clique em “conectar com um clique”: o site do OpenRouter abre no seu navegador.', 'Entre (ou crie a conta) e autorize o Oceano.', 'Pronto: a chave volta sozinha para cá. Dá para usar Claude, GPT, Gemini, Llama e outros com o mesmo saldo.'],
    campos: [{ id: 'chave', rotulo: 'Chave da API', dica: 'começa com sk-or- (ou use o botão de um clique)' }],
    papeis: ['orquestrador', 'redator', 'executor', 'rapido'],
    recomendado: { orquestrador: 'anthropic/claude-sonnet-4.5', rapido: 'google/gemini-2.5-flash' },
  },
  higgsfield: {
    nome: 'Higgsfield', empresa: 'imagem e vídeo', site: 'https://console.higgsfield.ai',
    passos: ['Entre no console do Higgsfield.', 'Crie uma chave de API: ela tem um ID e um segredo (o segredo só aparece uma vez).', 'Atenção: o plano Unlimited vale só no site; a API usa saldo à parte.'],
    campos: [{ id: 'chave', rotulo: 'Credencial ou ID da chave', dica: 'pode colar inteira no formato id:segredo' },
      { id: 'segredo', rotulo: 'Segredo da chave', dica: 'só se você colou o ID sozinho acima', opcional: true }],
    papeis: ['midia', 'imagem'],
    recomendado: { imagem: 'bytedance/seedream/v4/edit' },
  },
};
const PAPEIS = {
  orquestrador: { nome: 'Orquestrador', desc: 'a Navegadora: conversa, planeja e usa as ferramentas do Oceano' },
  executor: { nome: 'Executor', desc: 'a maioria das tarefas do dia a dia' },
  rapido: { nome: 'Executor rápido', desc: 'tarefas simples, barato e rápido' },
  redator: { nome: 'Redator', desc: 'gerar e revisar textos' },
  midia: { nome: 'Mídia', desc: 'gerar imagem e vídeo' },
  imagem: { nome: 'Edição de imagem', desc: 'editar uma imagem a partir de um pedido em texto' },
};

// ── chaves ──
// só na memória: ao fechar o Oceano, elas somem. Veja o guarda em verificar-sem-chaves.js.
const naMemoria = new Map();
function cofreDisponivel() { return false; }
const temChave = provedor => naMemoria.has(provedor);
function guardar(provedor, segredos) { naMemoria.set(provedor, segredos); }
const abrirCofre = provedor => naMemoria.get(provedor) || null;
// o que versões antigas gravaram não é mais lido; apagar evita qualquer pedido do sistema e não deixa nada para trás
function esquecerGuardadas() { for (const n of ['cofre.json', 'chaves-aviso.json']) { try { fs.rmSync(arq(n), { force: true }); } catch {} } }

// registro de erros (nunca grava chave): data, provedor, código e mensagem do provedor
function registrarErro(provedor, onde, e) {
  try {
    const msg = e?.error?.error?.message || e?.message || String(e);
    fs.appendFileSync(arq('agentes.log'), `${new Date().toISOString()} ${provedor} ${onde} ${e?.status || ''} ${e?.constructor?.name || ''} ${msg}\n`.replace(/sk-[\w-]+|AIza[\w-]+|[A-Za-z0-9_-]{32,}/g, '[chave]'), { mode: 0o600 });
  } catch {}
}
const detalhe = e => { const m = e?.error?.error?.message || e?.message; return m ? ` (${String(m).replace(/sk-[\w-]+|AIza[\w-]+|[A-Za-z0-9_-]{32,}/g, '[chave]').slice(0, 160)})` : ''; };
const final4 = s => (s && s.length > 8 ? `••••${s.slice(-4)}` : '••••');

// ── testes sem custo ──
async function testar(provedor, s) {
  const limpo = Object.fromEntries(Object.entries(s || {}).map(([k, v]) => [k, String(v || '').trim()]));
  if (!limpo.chave) return { ok: false, erro: 'Cole a chave primeiro.' };
  try {
    if (provedor === 'anthropic') {
      if (limpo.workspace && !/^wrkspc_[\w-]+$/.test(limpo.workspace)) return { ok: false, erro: 'O ID do workspace começa com wrkspc_. Confira no Console → Settings → Workspaces.' };
      const cliente = new AnthropicClient({ apiKey: limpo.chave, maxRetries: 1, timeout: 15000,
        ...(limpo.workspace ? { defaultHeaders: { 'anthropic-workspace-id': limpo.workspace } } : {}) });
      const modelos = [];
      for await (const m of cliente.models.list()) modelos.push({ id: m.id, nome: m.display_name || m.id });
      return { ok: true, modelos, segredos: limpo };
    }
    if (provedor === 'gemini') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': limpo.chave }, signal: AbortSignal.timeout(15000) });
      if (r.status === 400 || r.status === 401 || r.status === 403) return { ok: false, erro: 'O Google recusou a chave. Confira se copiou inteira.' };
      if (!r.ok) { registrarErro(provedor, 'teste', { status: r.status, message: await r.text().catch(() => '') }); return { ok: false, erro: `O Google respondeu ${r.status}. Tente de novo em instantes.` }; }
      const d = await r.json();
      const modelos = (d.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => ({ id: m.name.replace(/^models\//, ''), nome: m.displayName || m.name }));
      return { ok: true, modelos, segredos: limpo };
    }
    if (provedor === 'openai' || provedor === 'openrouter') {
      const base = provedor === 'openai' ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1';
      const r = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${limpo.chave}` }, signal: AbortSignal.timeout(15000) });
      if (r.status === 401 || r.status === 403) return { ok: false, erro: `${PROVEDORES[provedor].nome} recusou a chave. Confira se copiou inteira.` };
      if (!r.ok) { registrarErro(provedor, 'teste', { status: r.status, message: await r.text().catch(() => '') }); return { ok: false, erro: `${PROVEDORES[provedor].nome} respondeu ${r.status}. Tente de novo em instantes.` }; }
      // o OpenRouter lista modelos sem pedir chave: confere a chave de verdade em /key
      if (provedor === 'openrouter') { const k = await fetch(`${base}/key`, { headers: { Authorization: `Bearer ${limpo.chave}` }, signal: AbortSignal.timeout(15000) }); if (!k.ok) return { ok: false, erro: 'O OpenRouter recusou a chave.' }; }
      const d = await r.json();
      const modelos = (d.data || []).map(m => ({ id: m.id, nome: m.name || m.id })).sort((a, b) => a.id.localeCompare(b.id));
      return { ok: true, modelos, segredos: limpo };
    }
    if (provedor === 'higgsfield') {
      // o console do Higgsfield entrega a credencial junta (id:segredo); aceita junta ou separada
      // tira o que costuma vir junto na cópia: "Key ", "HF_KEY=", aspas e espaços
      const tirar = v => String(v || '').replace(/^(authorization:\s*)?(key\s+)?(hf_key|hf_credentials)?\s*=?\s*/i, '').replace(/["'\s]/g, '');
      limpo.chave = tirar(limpo.chave); limpo.segredo = tirar(limpo.segredo);
      // credencial inteira no primeiro campo vale sozinha, mesmo com o segundo preenchido (antes virava id:segredo:segredo)
      if (limpo.chave.includes(':')) { const i = limpo.chave.indexOf(':'); limpo.segredo = limpo.chave.slice(i + 1); limpo.chave = limpo.chave.slice(0, i); }
      else if (limpo.segredo.includes(':')) { const i = limpo.segredo.indexOf(':'); limpo.segredo = limpo.segredo.slice(i + 1); }
      if (!limpo.segredo) return { ok: false, erro: 'Falta o segredo. Cole a credencial inteira (id:segredo) ou preencha o segredo no segundo campo.' };
      // pedido inexistente: 404 = credenciais válidas (o pedido é que não existe); 401 = credenciais erradas
      const r = await fetch('https://api.higgsfield.ai/requests/00000000-0000-0000-0000-000000000000/status',
        { headers: { Authorization: `Key ${limpo.chave}:${limpo.segredo}` }, signal: AbortSignal.timeout(15000) });
      if (r.status === 401) { registrarErro(provedor, 'teste', { status: 401, message: 'credenciais recusadas' }); return { ok: false, erro: 'O Higgsfield recusou o ID ou o segredo. Confira se copiou a credencial inteira.' }; }
      if (r.status === 404 || r.ok) return { ok: true, modelos: [{ id: 'seedream', nome: 'Seedream (pelo catálogo do Higgsfield)' }], segredos: limpo };
      registrarErro(provedor, 'teste', { status: r.status, message: await r.text().catch(() => '') });
      return { ok: false, erro: `O Higgsfield respondeu ${r.status}. Tente de novo em instantes.` };
    }
    return { ok: false, erro: 'Provedor desconhecido.' };
  } catch (e) {
    registrarErro(provedor, 'teste', e);
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, erro: 'A Anthropic recusou a chave. Confira se copiou inteira.' };
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, erro: `A chave existe, mas não tem permissão. Confira o crédito (Billing) e o workspace no Console.${detalhe(e)}` };
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, erro: `Sem conexão com a Anthropic. Confira a internet.${detalhe(e)}` };
    if (e instanceof Anthropic.APIError && /anthropic-workspace-id/.test(detalhe(e)))
      return { ok: false, workspace: true, erro: 'Essa chave foi criada fora de um workspace. No Console, abra Settings → Workspaces, copie o ID do workspace (começa com wrkspc_) e cole no campo “ID do workspace” abaixo. Depois teste de novo.' };
    if (e instanceof Anthropic.APIError && /credit balance/i.test(detalhe(e)))
      return { ok: false, erro: 'A conta está sem crédito. Coloque um valor em Billing no Console e teste de novo (pode levar 1 ou 2 minutos para valer).' };
    if (e instanceof Anthropic.APIError) return { ok: false, erro: `A Anthropic respondeu ${e.status}.${detalhe(e)}` };
    return { ok: false, erro: `Não deu para falar com o provedor.${detalhe(e)}` };
  }
}

// ── agentes ──
let pendente = null;   // segredos do último teste bem-sucedido, só em memória, até o “salvar”
function listar() {
  return ler('agentes.json', []).map(a => ({ ...a, conectado: temChave(a.provedor) }));
}

// OpenRouter com um clique: abre o site no navegador do sistema; depois de autorizar, ele volta para um endereço
// local temporário (127.0.0.1, porta aleatória, só durante 5 minutos) com um código que vira a chave.
function conectarOpenRouter() {
  return new Promise(resolver => {
    const verificador = crypto.randomBytes(32).toString('base64url');
    const desafio = crypto.createHash('sha256').update(verificador).digest('base64url');
    const srv = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/oceano') { res.writeHead(404).end(); return; }
      const codigo = u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end('<meta charset="utf-8"><body style="font:16px system-ui;background:#0a1630;color:#e8f0ff;display:grid;place-items:center;height:100vh"><p>Pronto! Pode voltar ao Oceano.</p></body>');
      srv.close(); clearTimeout(limite);
      if (!codigo) return resolver({ ok: false, erro: 'O OpenRouter não devolveu o código. Tente de novo.' });
      try {
        const r = await fetch('https://openrouter.ai/api/v1/auth/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: codigo, code_verifier: verificador, code_challenge_method: 'S256' }), signal: AbortSignal.timeout(20000) });
        const d = await r.json();
        if (!r.ok || !d.key) return resolver({ ok: false, erro: 'O OpenRouter não entregou a chave. Tente de novo.' });
        const t = await testar('openrouter', { chave: d.key });
        if (t.ok) pendente = { provedor: 'openrouter', segredos: t.segredos };
        resolver({ ok: t.ok, erro: t.erro, modelos: t.modelos || [], final: t.ok ? final4(d.key) : null });
      } catch (e) { registrarErro('openrouter', 'oauth', e); resolver({ ok: false, erro: 'Não deu para falar com o OpenRouter.' }); }
    });
    const limite = setTimeout(() => { srv.close(); resolver({ ok: false, erro: 'Tempo esgotado (5 minutos). Clique de novo para conectar.' }); }, 5 * 60 * 1000);
    srv.listen(0, '127.0.0.1', () => {
      const volta = `http://127.0.0.1:${srv.address().port}/oceano`;
      shell.openExternal(`https://openrouter.ai/auth?callback_url=${encodeURIComponent(volta)}&code_challenge=${desafio}&code_challenge_method=S256`);
    });
  });
}

function registrar(ipcMain, aoMudar) {
  ipcMain.handle('agentes:openrouter', () => conectarOpenRouter());
  ipcMain.handle('agentes:catalogo', () => ({ provedores: PROVEDORES, papeis: PAPEIS, cofre: cofreDisponivel() }));
  ipcMain.handle('agentes:listar', () => listar());
  ipcMain.handle('agentes:conectado', (_e, provedor) => {
    return { conectado: temChave(String(provedor)) };
  });
  ipcMain.handle('agentes:testar', async (_e, provedor, segredos) => {
    provedor = String(provedor);
    if (!PROVEDORES[provedor]) return { ok: false, erro: 'Provedor desconhecido.' };
    // sem segredos novos: testa a chave que já está no cofre
    const usar = segredos && segredos.chave ? segredos : abrirCofre(provedor);
    const r = await testar(provedor, usar || {});
    if (r.ok) pendente = { provedor, segredos: r.segredos };
    // a chave some ao fechar o Oceano, mas a escolha fica: quem já estava salvo volta a funcionar logo depois do teste
    const reconectado = !!r.ok && ler('agentes.json', []).some(a => a.provedor === provedor);
    if (reconectado) { guardar(provedor, r.segredos); aoMudar?.(); }
    return { ok: r.ok, erro: r.erro, modelos: r.modelos || [], final: r.ok ? final4(r.segredos.chave) : null, reconectado };
  });
  ipcMain.handle('agentes:salvar', (_e, dados) => {
    const provedor = String(dados?.provedor || ''), papel = String(dados?.papel || ''), modelo = String(dados?.modelo || '');
    const p = PROVEDORES[provedor];
    if (!p || !p.papeis.includes(papel) || !modelo) return { ok: false, erro: 'Escolha um papel e um modelo.' };
    if (!pendente || pendente.provedor !== provedor) return { ok: false, erro: 'Teste a conexão antes de salvar.' };
    try { guardar(provedor, pendente.segredos); }
    catch (e) {
      registrarErro(provedor, 'cofre', e);
      return { ok: false, erro: 'Não consegui usar essa chave.' };
    }
    pendente = null;
    const lista = ler('agentes.json', []).filter(a => a.papel !== papel);   // um agente por papel
    const novo = { id: `${papel}-${Date.now().toString(36)}`, papel, provedor, modelo, nome: `${PAPEIS[papel].nome} · ${p.nome}`, criado: Date.now() };
    gravar('agentes.json', [...lista, novo]);
    aoMudar?.();
    return { ok: true, agente: novo };
  });
  ipcMain.handle('agentes:remover', (_e, id) => {
    gravar('agentes.json', ler('agentes.json', []).filter(a => a.id !== String(id)));
    aoMudar?.();
    return { ok: true };
  });
}

module.exports = { registrar, listar, abrirCofre, temChave, esquecerGuardadas, PAPEIS, PROVEDORES };
