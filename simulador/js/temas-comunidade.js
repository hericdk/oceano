// Temas de outras pessoas: um link do GitHub ou a procura por repositórios com o tópico "oceano-tema".
// Só texto JSON entra, sem login nem cookies, e passa pela conferência rígida antes de aparecer.

import { conferirTema, MAX_TEMA_BYTES } from './temas.js';

export const ARQUIVO = 'tema.oceano.json', TOPICO = 'oceano-tema';
const CRU = 'https://raw.githubusercontent.com/';
const NOME = /^[\w.-]{1,100}$/;

// devolve o endereço do texto puro; qualquer outro site é recusado
export function enderecoDoTema(link) {
  let u;
  try { u = new URL(String(link).trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const p = u.pathname.split('/').filter(Boolean);
  if (u.hostname === 'raw.githubusercontent.com') return p.length >= 4 && p.every(x => x !== '..') ? CRU + p.join('/') : null;
  if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null;
  if (!NOME.test(p[0] || '') || !NOME.test(p[1] || '')) return null;
  const repo = p[1].replace(/\.git$/, '');
  if (p.length === 2) return `${CRU}${p[0]}/${repo}/HEAD/${ARQUIVO}`;
  if (p[2] === 'blob' && p.length >= 5 && !p.includes('..')) return `${CRU}${p[0]}/${repo}/${p.slice(3).join('/')}`;
  return null;
}

export async function baixarTema(url, buscar = fetch) {
  const r = await buscar(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache' });
  if (!r.ok) return { erros: [r.status === 404 ? `Não achei ${ARQUIVO} neste endereço.` : `O GitHub respondeu ${r.status}.`] };
  if (Number(r.headers.get('content-length')) > MAX_TEMA_BYTES) return { erros: ['Arquivo grande demais para um tema (máx. 64 KB).'] };
  return conferirTema(await r.text());
}

export async function procurarTemas(buscar = fetch) {
  const r = await buscar(`https://api.github.com/search/repositories?q=topic:${TOPICO}&sort=updated&per_page=12`, { credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(r.status === 403 ? 'O GitHub pediu para esperar um pouco. Tente daqui a alguns minutos.' : `O GitHub respondeu ${r.status}.`);
  const { items = [] } = await r.json();
  const achados = await Promise.all(items.filter(i => NOME.test(i.owner?.login || '') && NOME.test(i.name || '')).map(async i => {
    const res = await baixarTema(`${CRU}${i.owner.login}/${i.name}/HEAD/${ARQUIVO}`, buscar).catch(() => ({ erros: ['falhou'] }));
    return res.tema ? { tema: res.tema, repo: `${i.owner.login}/${i.name}` } : { bloqueado: true };
  }));
  return { temas: achados.filter(a => a.tema), bloqueados: achados.filter(a => a.bloqueado).length };
}
