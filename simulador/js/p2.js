// Controle de P2: a IA da pessoa editando junto com ela, ao vivo, dentro das ferramentas do Oceano.
// DESLIGADO nesta versão, e nada na interface usa este arquivo. Por enquanto a IA só age pelos comandos
// da ferramenta robo_modelo (assistente.js), como conta o docs/ROBO-MODELOS.md.
//
// Para ativar numa atualização: ligar P2_ATIVO, importar `p2` no assistente e criar a tela que mostra
// sessao(), pedidoOk e o botão de parar. As regras abaixo não mudam:
//   1. A pessoa abre a sessão, uma ferramenta por vez, e pode parar a qualquer momento.
//   2. Ler é livre dentro da sessão. Toda mudança passa pelo pedidoOk, a menos que a pessoa libere aquela sessão.
//   3. A ferramenta só atende ações que declarou. Originais continuam protegidos pela própria ferramenta.
//   4. Tudo fica no registro da sessão, e o registro some quando ela termina.

export const P2_ATIVO = false;
const MAX_REGISTRO = 500;

export function criarP2({ ativo = false, pedidoOk = async () => false } = {}) {
  const ferramentas = new Map();
  let atual = null;
  const anotar = (s, item) => { s.registro.push({ hora: Date.now(), ...item }); if (s.registro.length > MAX_REGISTRO) s.registro.shift(); };
  return {
    get ativo() { return ativo; },
    // cada ferramenta declara o que o P2 pode fazer nela: { nome: { muda: bool, fazer(args) } }
    registrar(id, acoes) { ferramentas.set(id, acoes); },
    disponiveis() { return ativo ? [...ferramentas.keys()] : []; },
    sessao() { return atual && { ferramenta: atual.ferramenta, liberada: atual.liberada, registro: [...atual.registro] }; },
    async abrir(id) {
      if (!ativo) return { erro: 'o controle de P2 ainda não está ativo' };
      if (!ferramentas.has(id)) return { erro: 'esta ferramenta não aceita o P2' };
      if (!await pedidoOk({ tipo: 'abrir', ferramenta: id })) return { erro: 'a pessoa não abriu a sessão' };
      atual = { ferramenta: id, liberada: false, registro: [] };
      return { ok: true };
    },
    liberarMudancas() { if (atual) atual.liberada = true; },
    parar() { atual = null; },
    async fazer(nome, args = {}) {
      if (!ativo) return { erro: 'o controle de P2 ainda não está ativo' };
      const s = atual;
      if (!s) return { erro: 'nenhuma sessão aberta' };
      const acoes = ferramentas.get(s.ferramenta), acao = Object.prototype.hasOwnProperty.call(acoes, nome) ? acoes[nome] : null;
      if (!acao) return { erro: 'ação desconhecida' };
      if (acao.muda && !s.liberada && !await pedidoOk({ tipo: 'mudar', ferramenta: s.ferramenta, acao: nome, args })) {
        anotar(s, { acao: nome, recusada: true });
        return { erro: 'a pessoa não aprovou esta mudança' };
      }
      if (atual !== s) return { erro: 'a sessão foi encerrada' };   // parou enquanto o pedido esperava resposta
      try {
        const valor = await acao.fazer(args);
        anotar(s, { acao: nome, muda: !!acao.muda });
        return { valor };
      } catch (e) {
        anotar(s, { acao: nome, erro: String(e?.message || e) });
        return { erro: String(e?.message || e) };
      }
    },
  };
}

// a primeira ferramenta pronta: o simulador de robôs, com os mesmos comandos que já existem na ponte dele
export const acoesDoRobo = pedir => {
  const comando = cmd => async args => { const r = await pedir(cmd, args); if (r.erro) throw new Error(r.erro); return r.valor; };
  return {
    listar: { muda: false, fazer: comando('modelos') },
    ler: { muda: false, fazer: comando('modeloLer') },
    duplicar: { muda: true, fazer: comando('modeloDuplicar') },
    montagem: { muda: true, fazer: comando('modeloMontagem') },
    trocar: { muda: true, fazer: comando('modeloTrocar') },
  };
};

export const p2 = criarP2({ ativo: P2_ATIVO });
