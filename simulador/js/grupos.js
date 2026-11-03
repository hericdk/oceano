// Grupos de abas: um nome, uma cor e as abas dele. As abas abertas de um grupo ficam juntas na barra;
// fechar todas guarda o grupo (ele continua na mesa e reabre com um clique).

export const CORES = ['acento', 'sol', 'destaque', 'suave', 'texto'];

export function iniciarGrupos(app, guardado) {
  let grupos = guardado.ler('grupos', []);   // [{ id, nome, cor, perfil, abas: [{ url, titulo }] }]
  // cada perfil tem os grupos dele (os antigos, de antes dos perfis, ficam no Pessoal)
  const doPerfil = (g, p = app.perfilAtual()) => (g.perfil || 'pessoal') === p;
  const salvar = () => { guardado.gravar('grupos', grupos); app.emitir('grupos'); };
  const achar = id => grupos.find(g => g.id === id);
  const vivas = g => app.abas.filter(a => a.grupo === g.id);
  const foto = a => ({ url: a.historico[a.pos], titulo: app.tituloDe(a.historico[a.pos], a) });

  // as abas de um grupo ficam lado a lado na barra, na posição da primeira delas
  function juntar() {
    const ordem = [], vistos = new Set();
    for (const a of app.abas) {
      if (vistos.has(a)) continue;
      const doGrupo = a.grupo && achar(a.grupo) ? app.abas.filter(x => x.grupo === a.grupo) : [a];
      for (const x of doGrupo) { ordem.push(x); vistos.add(x); }
    }
    app.abas.splice(0, app.abas.length, ...ordem);
  }

  // a lista guardada acompanha as abas abertas; sem nenhuma aberta, fica a última lista
  function sincronizar() {
    let mudou = false;
    for (const g of grupos) {
      const v = vivas(g);
      if (!v.length || g.recolhendo) continue;
      const nova = v.map(foto);
      if (JSON.stringify(nova) !== JSON.stringify(g.abas)) { g.abas = nova; mudou = true; }
    }
    if (mudou) salvar();
  }

  app.grupos = {
    lista: (perfil = app.perfilAtual()) => grupos.filter(g => doPerfil(g, perfil)), todos: () => grupos, achar, vivas, sincronizar,
    criar(abas = [], nome) {
      const perfil = abas[0] ? app.perfilDe(abas[0]) : app.perfilAtual(), n = grupos.filter(g => doPerfil(g, perfil)).length;
      const g = { id: 'g' + Date.now().toString(36), nome: nome || `Grupo ${n + 1}`, cor: CORES[n % CORES.length], perfil, abas: [] };
      grupos.push(g);
      for (const a of abas) a.grupo = g.id;
      g.abas = abas.map(foto);
      juntar(); salvar();
      // agrupar = guardar: as abas fecham (a memória volta) e o grupo fica na página inicial, pronto para reabrir
      this.recolher(g.id);
      app.renderizar();
      return g;
    },
    // num grupo guardado, a aba entra fechada; num grupo aberto, ela fica aberta junto das outras
    adicionar(aba, id) {
      const g = achar(id); if (!g) return;
      const aberto = vivas(g).length > 0;
      aba.grupo = id;
      if (aberto) { juntar(); sincronizar(); salvar(); app.renderizar(); return; }
      g.abas.push(foto(aba));
      g.recolhendo = true; app.fecharAba(aba); delete g.recolhendo;
      salvar(); app.renderizar();
    },
    tirar(aba) {
      const g = achar(aba.grupo); delete aba.grupo;
      if (g) g.abas = vivas(g).map(foto);
      salvar(); app.renderizar();
    },
    // tira da lista guardada (quando a aba já está fechada)
    tirarGuardada(id, i) { const g = achar(id); if (!g) return; g.abas.splice(i, 1); salvar(); },
    abrir(id, qual) {
      const g = achar(id); if (!g) return;
      let abertas = vivas(g);
      if (!abertas.length) {
        for (const t of g.abas) { const a = app.novaAba(t.url, false, { semFoco: true }); a.grupo = g.id; }
        juntar();
        abertas = vivas(g);
      }
      app.abaAtiva = abertas[Math.min(qual ?? 0, abertas.length - 1)] || app.abaAtiva;
      app.renderizar();
    },
    // as abas abertas do grupo como ficam guardadas
    fotos: id => { const g = achar(id); return g ? vivas(g).map(foto) : []; },
    // fecha as abas e guarda o grupo (guardadas: a lista de antes, quando algumas já foram fechadas)
    recolher(id, guardadas) {
      const g = achar(id); if (!g) return;
      const v = vivas(g);
      if (guardadas?.length) g.abas = guardadas;
      else if (v.length) g.abas = v.map(foto);
      g.recolhendo = true;   // enquanto fecha, a lista guardada não encolhe
      for (const a of v) app.fecharAba(a);
      delete g.recolhendo;
      salvar();
    },
    // o grupo some; as abas continuam abertas
    desfazer(id) {
      const g = achar(id); if (!g) return;
      for (const a of vivas(g)) delete a.grupo;
      grupos = grupos.filter(x => x !== g);
      salvar(); app.renderizar();
    },
    renomear(id, nome) { const g = achar(id); if (g && nome.trim()) { g.nome = nome.trim().slice(0, 40); salvar(); app.renderizar(); } },
    trocarCor(id) { const g = achar(id); if (g) { g.cor = CORES[(CORES.indexOf(g.cor) + 1) % CORES.length]; salvar(); app.renderizar(); } },
  };
}
