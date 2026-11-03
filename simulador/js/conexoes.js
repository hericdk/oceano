// Conexões da Navegadora: serviços públicos que ela pode consultar. Cada uma só aceita o próprio endereço, só lê
// (GET, sem login, sem cookies) e fica desligada até a pessoa ligar. Ir à internet pede permissão; o que já está na
// memória local abre sem perguntar. Só texto público entra na memória: CEP e CNPJ nunca ficam guardados.

const MAX_RESPOSTA = 3000000, MAX_TEXTO = 20000, TRECHOS = 8, RAIO = 400, MAX_MEMORIA = 100e6;
// medido em teste, até haver medidas neste computador
export const TEMPO_REFERENCIA = { rede: 170, local: 2 };

export const CONEXOES = {
  brasilapi: {
    nome: 'BrasilAPI', autor: { nome: 'comunidade BrasilAPI', github: 'BrasilAPI' }, licenca: 'MIT', repo: 'https://github.com/BrasilAPI/BrasilAPI',
    descricao: 'CEP, CNPJ, bancos, feriados e DDD. Pública, gratuita e mantida pela comunidade.',
    base: 'https://brasilapi.com.br/api/',
    envia: 'o CEP, CNPJ ou número consultado',
    guia: 'cep/v2/{cep} · cnpj/v1/{cnpj} · banks/v1 · banks/v1/{codigo} · feriados/v1/{ano} · ddd/v1/{ddd}',
    aviso: 'Dados de um serviço da comunidade: confira o que for importante.',
  },
  leis: {
    nome: 'Leis do Brasil', autor: { nome: 'C3B', github: 'ctresb' }, licenca: 'textos oficiais + MIT', repo: 'https://github.com/ctresb/leis',
    descricao: 'Constituição e normas federais, estaduais e municipais em texto simples, com link para a fonte oficial.',
    base: 'https://raw.githubusercontent.com/ctresb/leis/main/',
    pastas: 'https://api.github.com/repos/ctresb/leis/contents/',
    envia: 'o endereço da norma consultada',
    guarda: true,
    pacote: ['constituicao.md', '', 'federal/', 'federal/leis-ordinarias/', 'federal/leis-complementares/'],
    guia: 'Texto já consultado abre da memória local; use atualizar para buscar a versão nova ou complementos. constituicao.md (use buscar para achar um artigo) · federal/leis-ordinarias/AAAA/ · federal/leis-complementares/AAAA/ · federal/decretos-lei/ · estaduais/UF/ · reguladores/ · jurisprudencia/ · tratados/ · municipais/UF/. Caminho terminado em / lista a pasta.',
    aviso: 'Conversão automática: não substitui o Diário Oficial. Cite a fonte indicada no cabeçalho e confira antes de usar.',
  },
};

const problema = msg => Object.assign(new Error(msg), { paraPessoa: true });
// mesma quantidade de letras: as posições da busca continuam valendo no texto original
const dobrar = s => s.replace(/[À-ÿ]/g, c => c.normalize('NFD')[0]).toLowerCase();

export function trechos(texto, busca) {
  const t = dobrar(texto), b = dobrar(busca), achados = [];
  let i = t.indexOf(b), fim = -1;
  while (i >= 0 && achados.length < TRECHOS) {
    if (i >= fim) { fim = i + RAIO; achados.push({ posicao: i, trecho: texto.slice(Math.max(0, i - 80), fim) }); }
    i = t.indexOf(b, i + 1);
  }
  return achados;
}

// a memória local fica no IndexedDB: o texto de um lado, o resumo do outro (contar não precisa abrir os textos)
export function criarMemoria() {
  let banco = null;
  const abrir = () => banco ??= new Promise((ok, erro) => {
    const r = indexedDB.open('oceano-conexoes', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('textos'); r.result.createObjectStore('resumo'); };
    r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
  });
  const fazer = async (modo, fn) => {
    const b = await abrir();
    return new Promise((ok, erro) => {
      const t = b.transaction(['textos', 'resumo'], modo), pedido = fn(t.objectStore('textos'), t.objectStore('resumo'));
      t.oncomplete = () => ok(pedido?.result); t.onerror = t.onabort = () => erro(t.error);
    });
  };
  const resumos = () => fazer('readonly', (_, r) => r.getAll());
  return {
    async ler(url) {
      const texto = await fazer('readonly', t => t.get(url));
      if (texto == null) return null;
      const [info] = (await resumos()).filter(x => x.url === url);
      await fazer('readwrite', (_, r) => r.put({ ...info, usado: Date.now() }, url));
      return { texto, quando: info?.quando };
    },
    async gravar(url, api, texto) {
      const bytes = texto.length;
      await fazer('readwrite', (t, r) => { t.put(texto, url); r.put({ url, api, bytes, quando: Date.now(), usado: Date.now() }, url); });
      // cheia: sai o que foi usado há mais tempo
      const todos = (await resumos()).sort((a, b) => a.usado - b.usado);
      let total = todos.reduce((s, x) => s + x.bytes, 0);
      for (const x of todos) {
        if (total <= MAX_MEMORIA || x.url === url) continue;
        await fazer('readwrite', (t, r) => { t.delete(x.url); r.delete(x.url); });
        total -= x.bytes;
      }
    },
    async tem(url) { return (await fazer('readonly', (_, r) => r.getKey(url))) !== undefined; },
    async resumo(api) { const l = (await resumos()).filter(x => x.api === api); return { textos: l.length, bytes: l.reduce((s, x) => s + x.bytes, 0) }; },
    async apagar(api) {
      for (const x of (await resumos()).filter(y => y.api === api)) await fazer('readwrite', (t, r) => { t.delete(x.url); r.delete(x.url); });
    },
  };
}

export function criarConexoes(guardado, { aoUsarRede = () => {}, buscar = (...a) => fetch(...a), memoria = criarMemoria() } = {}) {
  let ligadas = guardado.ler('conexoes', ['brasilapi', 'leis']);   // as duas primeiras já vêm ligadas; ir à internet continua pedindo permissão
  if (!Array.isArray(ligadas)) ligadas = [];
  ligadas = ligadas.filter(id => CONEXOES[id]);

  const pedir = async (url, cache = 'default') => {
    let r;
    try { r = await buscar(url, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache, signal: AbortSignal.timeout(20000) }); }
    catch { throw problema('Não consegui falar com esse serviço agora.'); }
    if (r.status === 404) throw problema('Não achei nada nesse caminho.');
    if (r.status === 403 || r.status === 429) throw problema('O serviço limitou as consultas. Tente de novo mais tarde.');
    if (!r.ok) throw problema(`O serviço respondeu ${r.status}.`);
    return r;
  };

  let sempre = guardado.ler('conexoes-sempre', []);
  if (!Array.isArray(sempre)) sempre = [];
  const tempos = guardado.ler('conexoes-tempos', {});
  const medir = (api, onde, ms) => {
    const t = (tempos[api] ??= {}), m = (t[onde] ??= { ms: 0, n: 0 });
    m.ms = (m.ms * m.n + ms) / (m.n + 1); m.n = Math.min(m.n + 1, 200);
    guardado.gravar('conexoes-tempos', tempos);
  };
  const sim = v => v === true || /^(sim|true)$/i.test(String(v ?? '').trim());

  // valida o pedido e diz exatamente qual endereço ele usa
  function rotaDe(api, caminho) {
    const c = CONEXOES[api];
    if (!c) throw problema('Essa conexão não existe.');
    if (!ligadas.includes(api)) throw problema(`A conexão ${c.nome} está desligada. A pessoa liga em Mods.`);
    const rota = String(caminho || '').trim().replace(/^\/+/, '');
    if (!/^[\w\-./%]*$/.test(rota) || rota.split('/').includes('..') || rota.includes('//')) throw problema('Caminho inválido.');
    const listar = !!c.pastas && (rota === '' || rota.endsWith('/'));
    if (!rota && !c.pastas) throw problema('Falta o caminho da consulta.');
    return { c, listar, url: (listar ? c.pastas : c.base) + rota.replace(/\/$/, '') };
  }

  // da internet: a pasta vira uma lista curta de nomes, o bastante para guardar e para a Navegadora escolher
  async function daRede(api, c, url, listar, medirTempo) {
    aoUsarRede(new URL(url).host, `Conexão ${c.nome}: consulta aprovada por você`, c.envia);
    // o que tem memória própria não aceita a cópia antiga do navegador: atualizar precisa perguntar ao servidor
    const a = performance.now(), r = await pedir(url, c.guarda ? 'no-cache' : 'default');
    const bruto = listar ? JSON.stringify((await r.json()).slice(0, 1000).map(i => (i.type === 'dir' ? i.name + '/' : i.name))) : await r.text();
    if (bruto.length > MAX_RESPOSTA) throw problema('Essa resposta é grande demais.');
    if (medirTempo) medir(api, 'rede', performance.now() - a);
    if (c.guarda) await memoria.gravar(url, api, bruto).catch(() => {});
    return bruto;
  }

  async function consultar({ api, caminho, buscar: busca, inicio, atualizar } = {}) {
    const { c, listar, url } = rotaDe(api, caminho);
    let bruto = null, quando = null, nota = null;
    if (c.guarda && !sim(atualizar)) {
      const a = performance.now(), m = await memoria.ler(url).catch(() => null);
      if (m) { bruto = m.texto; quando = m.quando; medir(api, 'local', performance.now() - a); }
    }
    if (bruto == null) {
      // só o primeiro download entra na conta: conferir uma cópia que não mudou quase não baixa nada
      try { bruto = await daRede(api, c, url, listar, !sim(atualizar)); } catch (e) {
        const m = c.guarda ? await memoria.ler(url).catch(() => null) : null;
        if (!m) throw e;
        bruto = m.texto; quando = m.quando; nota = 'Sem resposta da internet: esta é a cópia guardada.';
      }
    }
    const origem = quando ? { origem: 'memória local', guardado_em: new Date(quando).toISOString().slice(0, 10) } : { origem: 'internet' };
    const base = { api, ...origem, ...(nota ? { nota } : {}), aviso: c.aviso };
    if (listar) return { ...base, itens: JSON.parse(bruto) };
    if (busca) return { ...base, fonte: url, achados: trechos(bruto, String(busca).slice(0, 200)) };
    const de = Math.max(0, Number(inicio) || 0), proximo = de + MAX_TEXTO;
    return { ...base, fonte: url, total: bruto.length, texto: bruto.slice(de, proximo), ...(proximo < bruto.length ? { proximo } : {}) };
  }

  // pergunta só quando a consulta vai mesmo à internet; pedido inválido não pergunta, ele já volta com erro
  async function pedePermissao({ api, caminho, atualizar } = {}) {
    let r; try { r = rotaDe(api, caminho); } catch { return false; }
    if (!r.c.guarda) return true;
    if (sempre.includes(api)) return false;
    return sim(atualizar) || !(await memoria.tem(r.url).catch(() => false));
  }

  return {
    consultar, pedePermissao,
    memoria: api => memoria.resumo(api),
    apagarMemoria: api => memoria.apagar(api),
    tempos: api => tempos[api] || {},
    sempreAtivo: api => sempre.includes(api),
    // guarda o pacote inicial antes da primeira pergunta e para de perguntar nesta conexão (só texto, nada é executado)
    async definirSempre(api, on) {
      const c = CONEXOES[api];
      if (!c?.pacote) return;
      sempre = on ? [...new Set([...sempre, api])] : sempre.filter(x => x !== api);
      guardado.gravar('conexoes-sempre', sempre);
      if (!on) return;
      if (!ligadas.includes(api)) { ligadas = [...ligadas, api]; guardado.gravar('conexoes', ligadas); }
      for (const caminho of c.pacote) await consultar({ api, caminho });
    },
    ligadas: () => ligadas,
    ligada: id => ligadas.includes(id),
    definir(id, on) {
      if (!CONEXOES[id]) return;
      ligadas = on ? [...new Set([...ligadas, id])] : ligadas.filter(x => x !== id);
      guardado.gravar('conexoes', ligadas);
      if (!on && sempre.includes(id)) { sempre = sempre.filter(x => x !== id); guardado.gravar('conexoes-sempre', sempre); }
    },
  };
}
