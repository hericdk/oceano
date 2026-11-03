// A contagem anônima do Oceano. Cada dimensão é somada à parte, por dia: não existe coluna para IP, identificador ou hora,
// e os números não se cruzam entre si. Este código não lê o IP nem escreve em log. O recibo permite a quem enviou pedir
// a remoção e some em 30 dias, quando sobra só a soma. Não há rota de leitura: as somas só saem pelo login da conta.
const SISTEMAS = ['mac', 'windows', 'linux'];
const TEMPOS = ['ate15', 'ate60', 'ate180', 'mais180'];
const IDIOMAS = ['pt', 'en', 'es', 'fr', 'it', 'de', 'ja', 'ko', 'zh', 'hi', 'ar', 'ru', 'id', 'tr', 'zh-Hant', 'bn', 'ur', 'te', 'mr', 'ta', 'sw', 'ha', 'am', 'yo', 'zu', 'so', 'ne', 'my', 'km', 'lo', 'fil', 'vi', 'ps', 'fa', 'ht', 'mg'];
const DIAS_DO_RECIBO = 30, MAX_CORPO = 40000, MAX_RECIBOS = 400;
const ROTAS = { '/v1/sinal': 'sinal', '/v1/visita': 'visita', '/v1/remover': 'remover' };

// só o site oficial chama pelo navegador; o app não manda Origin
const cabecalhos = req => (req.headers.get('origin') === 'https://oceano.gg'
  ? { 'access-control-allow-origin': 'https://oceano.gg', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST' }
  : {});
const dia = (recuo = 0) => new Date(Date.now() - recuo * 86400000).toISOString().slice(0, 10);
async function resumo(texto) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// devolve as dimensões de um envio válido, ou null
function dimensoes(fonte, d) {
  const { idioma, pais = '', novo = false, mes = false } = d;
  if (!IDIOMAS.includes(idioma) || typeof novo !== 'boolean' || typeof mes !== 'boolean') return null;
  if (pais !== '' && !(typeof pais === 'string' && /^[A-Z]{2}$/.test(pais))) return null;
  const saida = [['total', fonte], ['idioma', idioma], ['pais', pais || '??']];
  if (novo) saida.push(['novos', '1']);
  if (mes) saida.push(['mes', '1']);
  if (fonte === 'app') {
    const { versao, sistema, tempo = '' } = d;
    if (typeof versao !== 'string' || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(versao) || !SISTEMAS.includes(sistema)) return null;
    if (tempo !== '' && !TEMPOS.includes(tempo)) return null;
    saida.push(['versao', versao], ['sistema', sistema]);
    if (tempo !== '') saida.push(['tempo', tempo]);
  }
  return saida;
}

async function contar(db, fonte, dims) {
  const hoje = dia(), bytes = crypto.getRandomValues(new Uint8Array(16));
  const recibo = [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
  const somar = db.prepare('INSERT INTO contagens VALUES (?, ?, ?, ?, 1) ON CONFLICT DO UPDATE SET total = total + 1');
  await db.batch([
    ...dims.map(([d, v]) => somar.bind(hoje, fonte, d, v)),
    db.prepare('INSERT INTO recibos VALUES (?, ?, ?, ?)').bind(await resumo(recibo), hoje, fonte, JSON.stringify(dims)),
    db.prepare('DELETE FROM recibos WHERE dia < ?').bind(dia(DIAS_DO_RECIBO)),
  ]);
  return recibo;
}

async function remover(db, recibos) {
  let removidos = 0;
  const lista = [];
  for (const r of recibos) {
    if (typeof r !== 'string' || !/^[0-9a-f]{32}$/.test(r)) continue;
    const hash = await resumo(r);
    const l = await db.prepare('SELECT dia, fonte, dados FROM recibos WHERE hash = ?').bind(hash).first();
    if (!l) continue;
    const tirar = db.prepare('UPDATE contagens SET total = MAX(total - 1, 0) WHERE dia = ? AND fonte = ? AND dimensao = ? AND valor = ?');
    for (const [d, v] of JSON.parse(l.dados)) lista.push(tirar.bind(l.dia, l.fonte, d, v));
    lista.push(db.prepare('DELETE FROM recibos WHERE hash = ?').bind(hash));
    removidos++;
  }
  if (lista.length) await db.batch([...lista, db.prepare('DELETE FROM contagens WHERE total = 0')]);
  return removidos;
}

export default {
  async fetch(req, env) {
    const extras = cabecalhos(req);
    const fim = (status, json) => new Response(json ? JSON.stringify(json) : null, { status, headers: { ...extras, ...(json ? { 'content-type': 'application/json' } : {}), 'cache-control': 'no-store' } });
    const rota = ROTAS[new URL(req.url).pathname];
    if (!rota) return fim(404);
    if (req.method === 'OPTIONS') return fim(204);
    if (req.method !== 'POST') return fim(405);
    const corpo = await req.text();
    if (corpo.length > MAX_CORPO) return fim(413);
    let d;
    try { d = JSON.parse(corpo); } catch { return fim(400); }
    if (!d || typeof d !== 'object' || Array.isArray(d)) return fim(400);
    try {
      if (rota === 'remover') {
        if (!Array.isArray(d.recibos) || d.recibos.length > MAX_RECIBOS) return fim(400);
        return fim(200, { removidos: await remover(env.DB, d.recibos) });
      }
      const fonte = rota === 'sinal' ? 'app' : 'site', dims = dimensoes(fonte, d);
      if (!dims) return fim(400);
      return fim(200, { recibo: await contar(env.DB, fonte, dims) });
    } catch { return fim(503); }
  },
};
