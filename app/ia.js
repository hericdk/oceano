// Busca com IA: em vez de uma página de resultados de um buscador, a IA responde numa linha
// e sugere os sites certos para a busca. Feito para gastar pouco:
//  - modelo econômico por padrão, sem raciocínio estendido, resposta curta em JSON;
//  - a mesma busca não vai duas vezes à API: fica guardada (200 últimas, 7 dias).
// A chave fica só neste computador (userData/ia.json, lido só pelo seu usuário) e nunca chega à página.

const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk').default;
const guardrails = require('./guardrails');

const MODELOS = {
  'claude-haiku-5-5': 'Claude Haiku 5.5 · econômico',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5 · mais cuidadoso',
};
const MODELO_PADRAO = 'claude-haiku-5-5';
const SEMANA = 7 * 24 * 3600 * 1000;

const arquivo = nome => path.join(app.getPath('userData'), nome);
const ler = (nome, padrao) => { try { return JSON.parse(fs.readFileSync(arquivo(nome), 'utf8')); } catch { return padrao; } };
const gravar = (nome, dados) => fs.writeFileSync(arquivo(nome), JSON.stringify(dados), { mode: 0o600 });

let conf = null, cache = null, cliente = null;
// a chave fica só na memória; em disco, só o modelo. Uma chave gravada por versão antiga é apagada ao abrir.
const config = () => {
  if (conf) return conf;
  const { chave, ...resto } = ler('ia.json', {});
  if (chave) gravar('ia.json', resto);
  return (conf = { modelo: MODELO_PADRAO, ...resto });
};
const guardadas = () => (cache ??= ler('ia-cache.json', {}));

const SISTEMA = `Você é a busca do navegador Oceano. Para a busca do usuário, responda em uma ou duas frases curtas, no idioma da busca, e sugira de 3 a 6 sites reais e conhecidos onde a pessoa encontra o que procura (página específica quando tiver certeza do endereço; senão, a página inicial do site). Não invente endereços. Se a busca for um nome de site, o primeiro item é ele.`;
const FORMATO = {
  type: 'json_schema',
  schema: {
    type: 'object', additionalProperties: false, required: ['resposta', 'sites'],
    properties: {
      resposta: { type: 'string' },
      sites: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['titulo', 'url', 'porque'],
        properties: { titulo: { type: 'string' }, url: { type: 'string' }, porque: { type: 'string' } } } },
    },
  },
};

const normalizar = q => q.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300);

async function buscar(consulta) {
  const c = config();
  if (!c.chave) { const s = require('./agentes').abrirCofre('anthropic'); if (s?.chave) c.chave = s.chave; }
  if (!c.chave) return { erro: 'sem-ia' };
  const chave = c.modelo + '|' + guardrails.temas().join(',') + '|' + normalizar(consulta), g = guardadas();
  if (g[chave] && Date.now() - g[chave].em < SEMANA) return { ...g[chave].r, guardada: true };
  cliente ??= new Anthropic({ apiKey: c.chave, maxRetries: 1, timeout: 20000 });
  try {
    const msg = await cliente.messages.create({
      model: c.modelo, max_tokens: 700,
      thinking: { type: 'disabled' }, output_config: { effort: 'low', format: FORMATO },
      system: `${SISTEMA}\n\n${guardrails.bloco()}`,
      messages: [{ role: 'user', content: consulta.slice(0, 300) }],
    });
    if (msg.stop_reason === 'refusal') return { erro: 'recusou' };
    const texto = msg.content.find(b => b.type === 'text')?.text || '{}';
    const dados = JSON.parse(texto);
    // só endereços http(s) de verdade passam para a página
    const sites = (dados.sites || []).filter(s => { try { return /^https?:$/.test(new URL(s.url).protocol); } catch { return false; } }).slice(0, 6);
    const r = { resposta: String(dados.resposta || ''), sites, tokens: msg.usage.input_tokens + msg.usage.output_tokens, modelo: c.modelo };
    g[chave] = { em: Date.now(), r };
    const chaves = Object.keys(g);
    if (chaves.length > 200) for (const k of chaves.sort((a, b) => g[a].em - g[b].em).slice(0, chaves.length - 200)) delete g[k];
    gravar('ia-cache.json', g);
    return r;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { erro: 'chave' };
    if (e instanceof Anthropic.RateLimitError) return { erro: 'limite' };
    if (e instanceof Anthropic.APIConnectionError) return { erro: 'rede' };
    return { erro: 'outro', detalhe: String(e.message || e).replace(/sk-[\w-]+|AIza[\w-]+|[A-Za-z0-9_-]{32,}/g, '[chave]').slice(0, 200) };
  }
}

ipcMain.handle('ia:estado', () => ({ configurada: !!config().chave || require('./agentes').temChave('anthropic'), modelo: config().modelo, modelos: MODELOS, guardadas: Object.keys(guardadas()).length }));
ipcMain.handle('ia:definir', (_, novo = {}) => {
  const c = config();
  if (typeof novo.chave === 'string') { const k = novo.chave.trim(); if (k) c.chave = k; else delete c.chave; cliente = null; }
  if (MODELOS[novo.modelo]) c.modelo = novo.modelo;
  gravar('ia.json', { modelo: c.modelo });
  return { configurada: !!c.chave, modelo: c.modelo };
});
ipcMain.handle('ia:buscar', (_, consulta) => buscar(String(consulta || '')));
ipcMain.handle('ia:esquecer', () => { cache = {}; gravar('ia-cache.json', cache); return true; });
