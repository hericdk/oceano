// A lista inicial do bloqueador 18+, na ordem de exibição: apostas primeiro, sites adultos por último.
// Cada item vale para o site e os subdomínios dele. A pessoa acrescenta o que quiser em Sobre.
const CATEGORIAS = [
  { id: 'bets', nome: 'Bets', cor: 'destaque' },
  { id: 'azar', nome: 'Jogos de azar', cor: 'sol' },
  { id: 'venda', nome: 'Venda de conteúdo adulto', cor: 'acento' },
  { id: 'adulto', nome: 'Adultos', cor: 'suave' },
  { id: 'outro', nome: 'Outro', cor: 'texto' },
];
const GRUPOS = {
  bets: ['bet.br', 'bet365.com', 'betano.com', 'betano.bet.br', 'sportingbet.com', 'superbet.com', 'blaze.com', 'blaze.bet', 'stake.com', 'stake.bet', 'pixbet.com', 'estrelabet.com', 'esportesdasorte.com', 'novibet.com', 'betnacional.com', 'kto.com', 'vaidebet.com', 'f12.bet', 'galera.bet', 'betfair.com', '1xbet.com', 'betway.com', 'parimatch.com', 'rivalo.com', 'bwin.com', 'williamhill.com', 'draftkings.com', 'fanduel.com', 'betmgm.com', 'caesars.com/sportsbook-and-casino', 'mcgames.bet'],
  azar: ['pokerstars.com', 'ggpoker.com', '888poker.com', '888casino.com', 'casino.com', 'leovegas.com', 'roobet.com', 'bc.game', 'rollbit.com', 'jackpotcity.com', 'partypoker.com', 'unibet.com', 'spinpalace.com', 'betsson.com', 'playojo.com'],
  venda: ['onlyfans.com', 'fansly.com', 'privacy.com.br', 'manyvids.com', 'justfor.fans', 'fancentro.com', 'loyalfans.com', 'fanvue.com', 'clips4sale.com', 'iwantclips.com', 'chaturbate.com', 'stripchat.com', 'bongacams.com', 'camsoda.com', 'livejasmin.com', 'myfreecams.com', 'cam4.com'],
  adulto: ['xxx', 'porn', 'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com', 'youporn.com', 'tube8.com', 'spankbang.com', 'eporner.com', 'beeg.com', 'tnaflix.com', 'hclips.com', 'txxx.com', 'porntrex.com', 'drtuber.com', 'sunporno.com', 'motherless.com', 'thumbzilla.com', 'brazzers.com', 'bangbros.com', 'realitykings.com', 'naughtyamerica.com', 'rule34.xxx', 'nhentai.net', 'hentaihaven.xxx', 'e-hentai.org'],
};
const LISTA = Object.freeze(Object.entries(GRUPOS).flatMap(([cat, sites]) => sites.map(alvo => Object.freeze({ alvo, cat }))));
module.exports = { CATEGORIAS, LISTA };
