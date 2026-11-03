// Grupos e agentes especialistas: cada grupo é uma vila da ilha, com os especialistas dentro. Ficam só neste computador.
// A pessoa pode montar tudo sozinha, ou deixar a agente principal organizar pelas ferramentas da Navegadora.

export const CORES_GRUPO = ['#6cb4ff', '#ffd166', '#ff6b6b', '#7bd389', '#c792ea', '#ff9f43'];
export const PAPEIS_ESPECIALISTA = { executor: 'Executor', rapido: 'Rápido', redator: 'Redator' };
const MAX_GRUPOS = 24, MAX_POR_GRUPO = 12;
const CHAVE = 'ilha-grupos';
const limpar = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const igual = (a, b) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');

export const listarGrupos = app => app.guardado.ler(CHAVE, []);
function gravar(app, grupos) { app.guardado.gravar(CHAVE, grupos); app.emitir?.('ilha-grupos'); }

export function criarGrupo(app, nome) {
  const n = limpar(nome, 28), grupos = listarGrupos(app);
  if (!n) return { erro: 'o grupo precisa de um nome' };
  const existe = grupos.find(g => igual(g.nome, n));
  if (existe) return { grupo: existe.nome, jaExistia: true };
  if (grupos.length >= MAX_GRUPOS) return { erro: `o limite é de ${MAX_GRUPOS} grupos` };
  grupos.push({ id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nome: n, cor: CORES_GRUPO[grupos.length % CORES_GRUPO.length], agentes: [] });
  gravar(app, grupos);
  return { grupo: n };
}

export function apagarGrupoVazio(app, nome) {
  const grupos = listarGrupos(app), g = grupos.find(x => igual(x.nome, nome));
  if (!g || g.agentes?.length) return false;
  gravar(app, grupos.filter(x => x !== g));
  return true;
}

export function criarEspecialista(app, { grupo, nome, foco, papel } = {}) {
  const n = limpar(nome, 28), f = limpar(foco, 300), gn = limpar(grupo, 28);
  if (!n || !f) return { erro: 'o especialista precisa de um nome e de um foco' };
  if (!listarGrupos(app).some(g => igual(g.nome, gn))) { const r = criarGrupo(app, gn); if (r.erro) return r; }
  const grupos = listarGrupos(app), g = grupos.find(x => igual(x.nome, gn));
  g.agentes ??= [];
  if (g.agentes.some(a => igual(a.nome, n))) return { especialista: n, grupo: g.nome, jaExistia: true };
  if (g.agentes.length >= MAX_POR_GRUPO) return { erro: `cada grupo tem no máximo ${MAX_POR_GRUPO} especialistas` };
  g.agentes.push({ id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nome: n, foco: f, papel: PAPEIS_ESPECIALISTA[papel] ? papel : 'executor' });
  gravar(app, grupos);
  return { especialista: n, grupo: g.nome };
}

export function apagarEspecialista(app, grupoId, id) {
  const grupos = listarGrupos(app), g = grupos.find(x => x.id === grupoId);
  if (!g?.agentes) return;
  g.agentes = g.agentes.filter(a => a.id !== id);
  gravar(app, grupos);
}

export function acharEspecialista(app, nome) {
  for (const g of listarGrupos(app)) for (const a of g.agentes || []) if (igual(a.nome, limpar(nome, 28))) return { ...a, grupo: g.nome };
  return null;
}

// as ferramentas que a agente principal recebe; o que é dela organizar não pede permissão a cada passo, e aparece na ilha na hora
export const ferramentasEspecialistas = app => [
  { nome: 'grupos_ver', descricao: 'Lista os grupos da ilha e os agentes especialistas de cada um', parametros: {}, tipo: 'local',
    executar: () => listarGrupos(app).map(g => ({ grupo: g.nome, especialistas: (g.agentes || []).map(a => ({ nome: a.nome, foco: a.foco })) })) },
  { nome: 'grupo_criar', descricao: 'Cria um grupo de assunto, que vira uma vila na ilha', parametros: { nome: 'nome curto do grupo' }, tipo: 'local',
    executar: ({ nome }) => { const r = criarGrupo(app, nome); if (r.grupo && !r.jaExistia) app.aviso?.(`Vila “${r.grupo}” criada na ilha.`, 'Ilha'); return r; } },
  { nome: 'especialista_criar', descricao: 'Cria um agente especialista dentro de um grupo (o grupo é criado se não existir)', parametros: { grupo: 'nome do grupo', nome: 'nome curto do especialista', foco: 'do que ele entende e como deve responder', papel: 'quem responde por ele: executor, rapido ou redator' }, tipo: 'local',
    executar: args => { const r = criarEspecialista(app, args); if (r.especialista && !r.jaExistia) app.aviso?.(`${r.especialista} entrou no grupo ${r.grupo}.`, 'Ilha'); return r; } },
  { nome: 'especialista_consultar', descricao: 'Pede algo a um especialista e devolve a resposta dele. Para trabalhar em cadeia, passe o resultado de um no pedido do próximo. Cada consulta gasta crédito da conta da pessoa', parametros: { especialista: 'nome do especialista', pedido: 'o que ele deve fazer, com todo o contexto necessário' }, tipo: 'local',
    executar: async ({ especialista, pedido }) => {
      const e = acharEspecialista(app, especialista);
      if (!e) return { erro: 'não achei esse especialista; veja a lista com grupos_ver' };
      const n = window.oceanoNativo;
      if (!n?.conversaEspecialista) return { erro: 'especialistas só respondem no app Oceano, com uma IA conectada' };
      return n.conversaEspecialista({ nome: e.nome, foco: e.foco, papel: e.papel, pedido: limpar(pedido, 20000) });
    } },
];
