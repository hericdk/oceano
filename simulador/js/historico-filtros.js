// Filtros do histórico: tipo de site, categoria e tema saem do endereço e do título, sempre aqui neste computador.
// Nada é enviado nem guardado à parte: tudo é recalculado da própria lista.

const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const CATEGORIAS = [
  ['entretenimento', 'Entretenimento'], ['informacao', 'Informação'], ['social', 'Social'], ['compras', 'Compras'],
  ['trabalho', 'Trabalho'], ['aprender', 'Aprendizado'], ['dinheiro', 'Dinheiro'], ['servicos', 'Serviços'], ['outros', 'Outros'],
];
// tipo de site: [id, nome, categoria, domínios]
export const TIPOS = [
  ['video', 'Vídeo', 'entretenimento', ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv', 'netflix.com', 'primevideo.com', 'disneyplus.com', 'globoplay.globo.com', 'max.com']],
  ['musica', 'Música', 'entretenimento', ['spotify.com', 'soundcloud.com', 'bandcamp.com', 'deezer.com', 'music.apple.com', 'tidal.com', 'last.fm']],
  ['jogo', 'Jogos', 'entretenimento', ['steampowered.com', 'itch.io', 'lexaloffle.com', 'epicgames.com', 'gog.com', 'chess.com', 'roblox.com']],
  ['noticia', 'Notícias', 'informacao', ['g1.globo.com', 'uol.com.br', 'folha.uol.com.br', 'estadao.com.br', 'oglobo.globo.com', 'cnnbrasil.com.br', 'bbc.com', 'bbc.co.uk', 'nytimes.com', 'theguardian.com', 'reuters.com', 'apnews.com', 'elpais.com', 'techcrunch.com', 'theverge.com', 'arstechnica.com']],
  ['busca', 'Buscadores', 'informacao', ['google.com', 'google.com.br', 'bing.com', 'duckduckgo.com', 'brave.com', 'kagi.com', 'ecosia.org']],
  ['wiki', 'Enciclopédias', 'aprender', ['wikipedia.org', 'wikimedia.org', 'wiktionary.org', 'britannica.com']],
  ['social', 'Redes sociais', 'social', ['instagram.com', 'facebook.com', 'x.com', 'twitter.com', 'threads.net', 'bsky.app', 'linkedin.com', 'tiktok.com', 'reddit.com', 'pinterest.com', 'tumblr.com', 'discord.com', 'mastodon.social']],
  ['conversa', 'Mensagens e e-mail', 'social', ['web.whatsapp.com', 'whatsapp.com', 'telegram.org', 'mail.google.com', 'outlook.com', 'outlook.live.com', 'proton.me', 'slack.com']],
  ['loja', 'Lojas', 'compras', ['amazon.com', 'amazon.com.br', 'mercadolivre.com.br', 'shopee.com.br', 'magazineluiza.com.br', 'magalu.com', 'aliexpress.com', 'ebay.com', 'etsy.com', 'americanas.com.br', 'shein.com']],
  ['codigo', 'Código', 'trabalho', ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'npmjs.com', 'pypi.org', 'developer.mozilla.org', 'codepen.io', 'vercel.com', 'netlify.com']],
  ['ia', 'Inteligência artificial', 'trabalho', ['claude.ai', 'anthropic.com', 'chatgpt.com', 'openai.com', 'gemini.google.com', 'perplexity.ai', 'huggingface.co', 'midjourney.com']],
  ['ferramenta', 'Ferramentas de trabalho', 'trabalho', ['docs.google.com', 'drive.google.com', 'calendar.google.com', 'notion.so', 'figma.com', 'trello.com', 'canva.com', 'miro.com', 'airtable.com', 'dropbox.com']],
  ['curso', 'Cursos e estudo', 'aprender', ['coursera.org', 'udemy.com', 'khanacademy.org', 'alura.com.br', 'edx.org', 'duolingo.com', 'arxiv.org', 'scholar.google.com']],
  ['banco', 'Bancos e finanças', 'dinheiro', ['nubank.com.br', 'itau.com.br', 'bradesco.com.br', 'bb.com.br', 'caixa.gov.br', 'santander.com.br', 'inter.co', 'paypal.com', 'wise.com', 'xpi.com.br']],
  ['governo', 'Governo', 'servicos', ['gov.br', 'gov', 'jus.br', 'leg.br']],
  ['educacao', 'Escolas e universidades', 'aprender', ['edu', 'edu.br']],
  ['blog', 'Blogs e artigos', 'informacao', ['medium.com', 'substack.com', 'wordpress.com', 'blogspot.com', 'dev.to']],
  ['outro', 'Outros sites', 'outros', []],
];
const POR_TIPO = new Map(TIPOS.map(t => [t[0], t]));

// tema: as palavras precisam aparecer inteiras no título ou no endereço
export const TEMAS = [
  ['musica', 'Música', ['musica', 'music', 'album', 'banda', 'song', 'playlist', 'cancao', 'sintetizador', 'sampler']],
  ['filmes', 'Filmes e séries', ['filme', 'filmes', 'serie', 'series', 'movie', 'movies', 'cinema', 'trailer']],
  ['jogos', 'Jogos', ['jogo', 'jogos', 'game', 'games', 'gaming', 'pico-8', 'pico8']],
  ['programacao', 'Programação', ['javascript', 'python', 'css', 'html', 'typescript', 'api', 'codigo', 'programacao', 'code', 'github', 'rust', 'webgl']],
  ['tecnologia', 'Tecnologia', ['tecnologia', 'technology', 'tech', 'software', 'hardware', 'iphone', 'android', 'chip', 'computador']],
  ['ia', 'Inteligência artificial', ['ia', 'ai', 'chatgpt', 'claude', 'gemini', 'llm', 'gpt', 'inteligencia']],
  ['design', 'Design', ['design', 'figma', 'tipografia', 'typography', 'logo', 'ilustracao', 'pixel', 'dither']],
  ['noticias', 'Notícias', ['noticia', 'noticias', 'news', 'jornal', 'manchete']],
  ['politica', 'Política', ['politica', 'eleicao', 'eleicoes', 'congresso', 'presidente', 'senado', 'governo']],
  ['economia', 'Economia e dinheiro', ['economia', 'dolar', 'bolsa', 'investimento', 'investimentos', 'financas', 'imposto', 'banco']],
  ['ciencia', 'Ciência', ['ciencia', 'science', 'pesquisa', 'estudo', 'research', 'nasa', 'fisica', 'biologia']],
  ['saude', 'Saúde', ['saude', 'health', 'medico', 'doenca', 'exercicio', 'treino', 'dieta']],
  ['esporte', 'Esportes', ['esporte', 'esportes', 'futebol', 'sports', 'surf', 'basquete', 'volei', 'corrida']],
  ['comida', 'Comida', ['receita', 'receitas', 'recipe', 'comida', 'culinaria', 'restaurante', 'cafe']],
  ['viagem', 'Viagem', ['viagem', 'viagens', 'travel', 'hotel', 'passagem', 'turismo', 'praia', 'mapa']],
  ['educacao', 'Educação', ['curso', 'cursos', 'aula', 'aulas', 'tutorial', 'escola', 'universidade', 'aprender']],
  ['trabalho', 'Trabalho', ['trabalho', 'vaga', 'vagas', 'emprego', 'job', 'jobs', 'curriculo', 'reuniao']],
  ['compras', 'Compras', ['comprar', 'preco', 'oferta', 'promocao', 'carrinho', 'produto', 'shop', 'store']],
  ['mar', 'Mar e navegação', ['mar', 'oceano', 'ocean', 'farol', 'navegacao', 'barco', 'veleiro', 'ondas', 'mare']],
];
const TEMA_POR_PALAVRA = new Map(TEMAS.flatMap(([id, , palavras]) => palavras.map(p => [p, id])));
const palavrasDe = s => semAcento(s).split(/[^a-z0-9-]+/).filter(Boolean);

const casa = (host, dominio) => host === dominio || host.endsWith('.' + dominio);
const NOMES_PROPRIOS = { 'youtube.com': 'YouTube', 'github.com': 'GitHub', 'x.com': 'X', 'wikipedia.org': 'Wikipédia' };
function hostDe(url) { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } }

export function tipoDoSite(host, url = '') {
  // o domínio mais específico vence (docs.google.com antes de google.com)
  let melhor = null, tamanho = 0;
  for (const t of TIPOS) for (const d of t[3]) if (casa(host, d) && d.length > tamanho) { melhor = t; tamanho = d.length; }
  if (melhor) return melhor[0];
  if (/(^|\.)blog\.|\/blog(\/|$)/.test(host + url.replace(/^[a-z]+:\/\/[^/]+/i, ''))) return 'blog';
  return 'outro';
}

const cache = new Map();
export function analisar(item) {
  const chave = item.url + '\n' + (item.titulo || '');
  let a = cache.get(chave);
  if (!a) {
    const host = hostDe(item.url);
    const tipo = tipoDoSite(host, item.url);
    let enderecoLegivel = item.url;
    try { enderecoLegivel = decodeURIComponent(item.url); } catch {}
    const palavras = palavrasDe(`${item.titulo} ${enderecoLegivel}`);
    const temas = [...new Set(palavras.map(p => TEMA_POR_PALAVRA.get(p)).filter(Boolean))];
    const [, nomeTipo, categoria] = POR_TIPO.get(tipo);
    const nomeCategoria = CATEGORIAS.find(c => c[0] === categoria)[1];
    const nomesTemas = TEMAS.filter(t => temas.includes(t[0])).map(t => t[1]);
    a = { host, tipo, categoria, temas, indice: semAcento([item.titulo, enderecoLegivel, host, nomeTipo, nomeCategoria, ...nomesTemas].join(' ')) };
    if (cache.size > 12000) cache.clear();
    cache.set(chave, a);
  }
  return a;
}

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), FORMATO_CURTO = new Intl.DateTimeFormat('pt-BR');
const datasDoDia = new Map();
const numeroDoDia = ms => Math.floor((ms - new Date(ms).getTimezoneOffset() * 60000) / 86400e3);
const dataTexto = (hora, agora) => {
  const dia = numeroDoDia(hora), distancia = numeroDoDia(agora) - dia;
  let texto = datasDoDia.get(dia);
  if (!texto) { texto = semAcento(`${FORMATO_DATA.format(hora)} ${FORMATO_CURTO.format(hora)}`); datasDoDia.set(dia, texto); }
  return `${distancia === 0 ? 'hoje ' : distancia === 1 ? 'ontem ' : ''}${texto}`;
};
const DIAS_PERIODO = { hoje: 1, semana: 7, mes: 30 };

// aceita palavras soltas (todas precisam aparecer) e site:, tipo: e tema: no próprio campo de busca
export function filtrar(itens, f = {}, agora = Date.now()) {
  const termos = [], porCampo = { site: [], tipo: [], tema: [] };
  for (const t of semAcento(f.q).split(/\s+/).filter(Boolean)) {
    const m = /^(site|tipo|tema):(.+)$/.exec(t);
    if (m) porCampo[m[1]].push(m[2]); else termos.push(t);
  }
  const site = semAcento(f.site).trim();
  const limite = DIAS_PERIODO[f.periodo] ? agora - DIAS_PERIODO[f.periodo] * 86400e3 : 0;
  const nomeTipo = id => semAcento(POR_TIPO.get(id)[1]), nomeTema = id => semAcento(TEMAS.find(t => t[0] === id)[1]);
  return itens.filter(x => {
    const a = analisar(x);
    if (f.tipo && a.tipo !== f.tipo) return false;
    if (f.categoria && a.categoria !== f.categoria) return false;
    if (f.tema && !a.temas.includes(f.tema)) return false;
    if (f.host && a.host !== f.host) return false;
    if (site && !a.host.includes(site)) return false;
    if (limite && x.hora < limite) return false;
    if (porCampo.site.some(s => !a.host.includes(s))) return false;
    if (porCampo.tipo.some(s => !(a.tipo.includes(s) || nomeTipo(a.tipo).includes(s)))) return false;
    if (porCampo.tema.some(s => !a.temas.some(id => id.includes(s) || nomeTema(id).includes(s)))) return false;
    if (termos.length) { const faltam = termos.filter(t => !a.indice.includes(t)); if (faltam.length) { const data = dataTexto(x.hora, agora); if (!faltam.every(t => data.includes(t))) return false; } }
    return true;
  });
}

// sugestões: os sites, temas e tipos que mais aparecem, sem "Outros sites" (não ajuda a filtrar)
export function sugestoes(itens, { sites = 6, temas = 6, tipos = 4 } = {}) {
  const conta = (lista, chave) => { const m = new Map(); for (const v of lista) m.set(v, (m.get(v) || 0) + 1); return [...m].map(([id, n]) => ({ campo: chave, id, n })).sort((a, b) => b.n - a.n || String(a.id).localeCompare(b.id)); };
  const an = itens.map(analisar);
  const nome = h => { const d = Object.keys(NOMES_PROPRIOS).find(k => casa(h, k)); return d ? NOMES_PROPRIOS[d] : h; };
  return [
    ...conta(an.map(a => a.host).filter(Boolean), 'host').slice(0, sites).map(s => ({ ...s, nome: nome(s.id) })),
    ...conta(an.flatMap(a => a.temas), 'tema').slice(0, temas).map(s => ({ ...s, nome: TEMAS.find(t => t[0] === s.id)[1] })),
    ...conta(an.map(a => a.tipo).filter(t => t !== 'outro'), 'tipo').slice(0, tipos).map(s => ({ ...s, nome: POR_TIPO.get(s.id)[1] })),
  ];
}
