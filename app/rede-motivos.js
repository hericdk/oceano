// Explica, em palavras simples, cada pedido feito pelas telas do Oceano na página de Rede.
const LOCAIS = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const POR_SITE = [
  [/(^|\.)lexaloffle\.com$/, 'PICO-8: lista, capas e jogos'],
  [/(^|\.)(youtube|youtube-nocookie|ytimg|googlevideo)\.com$/, 'YouTube: vídeo ou capa que você abriu'],
  [/(^|\.)soundcloud\.com$|(^|\.)sndcdn\.com$/, 'SoundCloud: música que você abriu'],
  [/(^|\.)open-meteo\.com$/, 'Clima da cidade que você escolheu'],
  [/(^|\.)cdninstagram\.com$/, 'Instagram: prévia de um link'],
  [/(^|\.)(huggingface\.co|hf\.co)$/, 'Voz neural: baixar o modelo'],
  [/(^|\.)unpaywall\.org$/, 'Leitura: procurar a versão aberta do artigo'],
  [/(^|\.)brasilapi\.com\.br$/, 'BrasilAPI: consulta que você pediu'],
];
const POR_FERRAMENTA = {
  stave: 'Stave: baixar sons e amostras da música', sampler: '½ sampler: baixar o que a ferramenta precisa', ferramentas: 'Ferramentas: arquivo que você pediu',
  robo: 'Robôs: baixar peças e modelos', winampfm: 'winampFM: baixar o que a ferramenta precisa', micromediaflash: 'Animação: arquivo que você pediu', retoque: 'RetoqueShop 1.0: arquivo que você pediu',
};
const NORMAL = 'Endereço pedido, idioma e versão do navegador e o seu IP';

function explicarPedido(url, quemPediu, comCookies) {
  const host = new URL(url).host;
  if (LOCAIS.test(host)) return { motivo: 'Programa neste computador', envia: 'Nada sai deste computador' };
  const ferramenta = /^oceano-ui:\/\/([a-z]+)/.exec(quemPediu || '')?.[1];
  const site = POR_SITE.find(([padrao]) => padrao.test(new URL(url).hostname));
  return {
    motivo: site?.[1] || POR_FERRAMENTA[ferramenta] || 'Arquivo pedido por uma tela do Oceano',
    envia: comCookies ? `${NORMAL}, mais cookies deste site` : NORMAL,
  };
}
module.exports = { explicarPedido };
