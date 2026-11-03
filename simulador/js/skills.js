// Skills da Navegadora: textos com instruções e referências, instalados por um link do GitHub.
// Skill é só texto: nada do repositório é executado, e ela não libera nenhuma permissão.
// A versão fica presa ao commit que a pessoa viu antes de instalar; mudar de versão é sempre um pedido dela.
// O pedido vai sem login e sem cookies: o GitHub só fica sabendo qual repositório público foi aberto.

const API = 'https://api.github.com', BRUTO = 'https://raw.githubusercontent.com';
export const LIMITE_BYTES = 50000, MAX_SKILLS = 30;
const ACEITOS = /\.(md|markdown|txt)$/i;
// caracteres que não aparecem na tela e poderiam esconder instruções no texto
export const INVISIVEIS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f­​-‏‪-‮⁠-⁯﻿]|[\u{e0000}-\u{e007f}]/gu;

// primeira lista: projetos abertos que viram texto de consulta (o programa em si não é instalado nem executado)
export const SUGESTOES = [
  { id: 'bend', nome: 'Bend', autor: { nome: 'Victor Taelin', github: 'VictorTaelin' }, licenca: 'Apache-2.0', repo: 'bendlang/bend', link: 'https://github.com/bendlang/bend/blob/HEAD/README.md', descricao: 'Linguagem que usa provas para barrar erros de código escrito por IA. Só a documentação entra: a linguagem não é instalada.' },
  { id: 'ai-memory', nome: 'ai-memory', autor: { nome: 'Fabio Akita', github: 'akitaonrails' }, licenca: 'MIT', repo: 'akitaonrails/ai-memory', link: 'https://github.com/akitaonrails/ai-memory/blob/HEAD/README.md', descricao: 'Memória longa compartilhada entre agentes de código. Só a documentação entra: nenhuma memória é conectada.' },
  { id: 'open-notebook', nome: 'Open Notebook', autor: { nome: 'Luis Novo', github: 'lfnovo' }, licenca: 'MIT', repo: 'lfnovo/open-notebook', link: 'https://github.com/lfnovo/open-notebook/blob/HEAD/README.md', descricao: 'Alternativa aberta ao NotebookLM, instalada à parte. Só a documentação entra: o programa não vem junto.' },
];

const problema = msg => Object.assign(new Error(msg), { paraPessoa: true });
const caminhoUrl = c => c.split('/').map(encodeURIComponent).join('/');
const umaLinha = (s, max) => String(s || '').replace(INVISIVEIS, '').replace(/\s+/g, ' ').trim().slice(0, max);

export function lerLink(texto) {
  const bruto = String(texto || '').trim();
  let u; try { u = new URL(/^https?:\/\//i.test(bruto) ? bruto : 'https://' + bruto); } catch { throw problema('Cole um link do GitHub, como https://github.com/dono/repositorio.'); }
  if (!['github.com', 'www.github.com'].includes(u.hostname)) throw problema('Por enquanto só links do github.com.');
  const [dono, repoBruto, tipo, ref, ...resto] = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const repo = (repoBruto || '').replace(/\.git$/, '');
  if (!/^[\w.-]+$/.test(dono || '') || !/^[\w.-]+$/.test(repo)) throw problema('Esse link não aponta para um repositório do GitHub.');
  if (tipo && !['tree', 'blob'].includes(tipo)) throw problema('Use o link do repositório, de uma pasta ou de um arquivo.');
  return { dono, repo, ref: ref || '', caminho: resto.join('/'), arquivo: tipo === 'blob' };
}

// separa o cabeçalho (name, description) do resto; sem cabeçalho, usa o primeiro título e o primeiro parágrafo
export function lerTexto(texto, reserva) {
  const cab = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  const campo = k => {
    const m = cab?.[1].match(new RegExp(`^${k}:[ \\t]*(.*(?:\\r?\\n[ \\t]+.*)*)`, 'm'));
    return m ? m[1].replace(/^[>|][+-]?\s*/, '').replace(/\s+/g, ' ').trim().replace(/^(["'])(.*)\1$/, '$2') : '';
  };
  // título e parágrafo nunca vêm de um bloco de código
  const corpo = (cab ? texto.slice(cab[0].length) : texto).replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '');
  const titulo = corpo.match(/^#\s+(.+)$/m)?.[1];
  const paragrafo = corpo.split(/\r?\n\s*\r?\n/).map(p => p.trim()).find(p => p && !/^[#!<\[|`-]/.test(p));
  return { nome: umaLinha(campo('name') || titulo || reserva, 60), descricao: umaLinha(campo('description') || paragrafo, 240) };
}

export function criarSkills(guardado, { aoUsarRede = () => {}, buscar = (...a) => fetch(...a) } = {}) {
  let lista = guardado.ler('skills', []);
  if (!Array.isArray(lista)) lista = [];

  const pedir = async url => {
    let r;
    try { r = await buscar(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) }); }
    catch { throw problema('Não consegui falar com o GitHub. Confira a internet e tente de novo.'); }
    if (r.status === 404) throw problema('Não achei isso no GitHub. O repositório é público? O link está certo?');
    if (r.status === 403 || r.status === 429) throw problema('O GitHub limita as consultas sem conta (60 por hora). Tente de novo mais tarde.');
    if (!r.ok) throw problema(`O GitHub respondeu ${r.status}. Tente de novo mais tarde.`);
    return r;
  };
  const json = async caminho => (await pedir(API + caminho)).json();

  // resolve o link num commit e lista os textos que podem virar skill
  async function procurar(texto) {
    const l = lerLink(texto), base = `/repos/${l.dono}/${l.repo}`;
    aoUsarRede('api.github.com', 'Skills: procurar a skill que você pediu', 'o nome do repositório (sem login)');
    const ref = l.ref || (await json(base)).default_branch;
    const commit = (await json(`${base}/commits/${encodeURIComponent(ref)}`)).sha;
    if (!/^[0-9a-f]{40}$/.test(commit || '')) throw problema('O GitHub não informou a versão dessa skill.');
    const arvore = await json(`${base}/git/trees/${commit}?recursive=1`);
    const arquivos = (arvore.tree || []).filter(a => a.type === 'blob');
    const base_ = (c, nome) => c.split('/').pop().toLowerCase() === nome;
    let opcoes;
    if (l.arquivo) {
      if (!ACEITOS.test(l.caminho)) throw problema('Skill é só texto: use um arquivo .md ou .txt.');
      opcoes = [l.caminho];
    } else {
      const pasta = l.caminho ? l.caminho.replace(/\/$/, '') + '/' : '';
      const dentro = arquivos.filter(a => a.path.startsWith(pasta));
      opcoes = dentro.filter(a => base_(a.path, 'skill.md')).map(a => a.path);
      if (!opcoes.length) opcoes = dentro.filter(a => a.path.slice(pasta.length).toLowerCase() === 'readme.md').map(a => a.path);
      if (!opcoes.length && arvore.truncated && pasta) opcoes = [pasta + 'SKILL.md'];
    }
    if (!opcoes.length) throw problema(arvore.truncated ? 'Esse repositório é grande demais: cole o link da pasta da skill.' : 'Não achei SKILL.md nem README.md nesse link.');
    return { ...l, commit, arquivos, opcoes: opcoes.slice(0, 40) };
  }

  async function baixar(achado, caminho) {
    const { dono, repo, commit, arquivos } = achado;
    if (!achado.opcoes.includes(caminho)) throw problema('Essa opção não veio do link.');
    const item = arquivos.find(a => a.path === caminho);
    const grande = () => problema(`Esse texto passa de ${LIMITE_BYTES / 1000} KB. Skill precisa ser curta.`);
    if (item?.size > LIMITE_BYTES) throw grande();
    aoUsarRede('raw.githubusercontent.com', 'Skills: baixar o texto da skill que você pediu', 'nada (só download)');
    const cru = await (await pedir(`${BRUTO}/${dono}/${repo}/${commit}/${caminhoUrl(caminho)}`)).text();
    if (new Blob([cru]).size > LIMITE_BYTES) throw grande();
    const texto = cru.replace(INVISIVEIS, '');
    const pasta = caminho.includes('/') ? caminho.slice(0, caminho.lastIndexOf('/') + 1) : '';
    const reserva = pasta ? pasta.split('/').at(-2) : repo;
    return {
      id: `${dono}/${repo}/${caminho}`, ...lerTexto(texto, reserva), texto, dono, repo, commit, caminho,
      tamanho: new Blob([texto]).size, invisiveis: cru.length - texto.length,
      ignorados: pasta ? arquivos.filter(a => a.path.startsWith(pasta) && a.path !== caminho).length : 0,
      semSkillMd: !/skill\.md$/i.test(caminho),
      link: `https://github.com/${dono}/${repo}/blob/${commit}/${caminhoUrl(caminho)}`,
      pedido: `https://github.com/${dono}/${repo}/tree/${achado.ref || 'HEAD'}/${caminhoUrl(pasta.replace(/\/$/, ''))}`.replace(/\/$/, ''),
    };
  }

  const salvar = () => guardado.gravar('skills', lista);
  return {
    procurar, baixar,
    lista: () => lista,
    achar: id => lista.find(s => s.id === id) || null,
    instalar(s) {
      const nova = !lista.some(x => x.id === s.id);
      if (nova && lista.length >= MAX_SKILLS) throw problema(`O limite é de ${MAX_SKILLS} skills. Remova uma antes.`);
      const { invisiveis, ignorados, semSkillMd, ...guardar } = s;
      lista = nova ? [...lista, guardar] : lista.map(x => (x.id === s.id ? guardar : x));
      salvar();
    },
    remover(id) {
      const s = lista.find(x => x.id === id);
      lista = lista.filter(x => x.id !== id);
      salvar();
      if (s) guardado.gravar('skills-excluidas', [{ nome: s.nome, origem: `${s.dono}/${s.repo}`, quando: Date.now() }, ...guardado.ler('skills-excluidas', [])].slice(0, 5));
    },
    excluidas: () => guardado.ler('skills-excluidas', []),
    ativa: s => s.ativa !== false,
    definirAtiva(id, on) { lista = lista.map(s => (s.id === id ? { ...s, ativa: !!on } : s)); salvar(); },
    // só as ligadas chegam à Navegadora
    ligadas: () => lista.filter(s => s.ativa !== false),
    // a Navegadora pede pelo nome ou pelo id
    ler(alvo) {
      const a = String(alvo || '').trim().toLowerCase();
      return lista.find(s => s.ativa !== false && (s.id.toLowerCase() === a || s.nome.toLowerCase() === a)) || null;
    },
  };
}
