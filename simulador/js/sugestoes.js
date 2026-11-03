// As sugestões da conversa: variam a cada conversa e todas funcionam mesmo sem IA.
const SUGESTOES = ['Busca receitas de bolo', 'Busca filmes de surf', 'Pesquisa trilhas em Noronha', 'Clima em Recife', 'Clima em Lisboa', 'Clima em Tóquio', 'Que horas são?', 'Que dia é hoje?', 'Quanto é 15% de 80?', 'Quanto é 12 vezes 8?', 'Troca o tema para Lagoa', 'Troca o tema para Nanquim', 'Lista minhas abas'];
export function sortearSugestoes(n, sorte = Math.random) {
  const resto = [...SUGESTOES];
  return ['O que você sabe fazer?', ...Array.from({ length: n }, () => resto.splice(Math.floor(sorte() * resto.length), 1)[0])];
}
