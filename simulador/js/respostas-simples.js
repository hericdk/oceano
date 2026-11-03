// O que a Kara responde sem nenhuma IA conectada: regras simples, com energia, e sempre honestas sobre o limite.
// Nada disso sai do computador. O clima é o único caso que consulta a internet, e fica nas ferramentas da Navegadora.

const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sorteia = lista => lista[Math.floor(Math.random() * lista.length)];
const numero = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
const lerNumero = s => parseFloat(s.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));

const SEM_IA = 'Sem IA eu já faço bastante coisa! Vejo o clima de uma cidade, digo as horas e a data, faço contas, abro sites, busco na internet, troco o tema, listo suas abas e tiro dúvidas sobre o navegador. Tenta aí: "clima em Recife" ou "quanto é 15% de 80".';
const COM_IA = 'Com uma IA conectada, eu converso de verdade e faço o mesmo que a sua IA já faz. E vou além: coordeno outras IAs em cadeia e em rede, com especialistas organizados em grupos na ilha. É só conectar uma em oceano://ia!';

function conta(t) {
  const pct = t.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por cento)\s*de\s*(\d+(?:[.,]\d+)?)/);
  if (pct) { const a = lerNumero(pct[1]), b = lerNumero(pct[2]); return `${pct[1]}% de ${pct[2]} dá ${numero(a * b / 100)}!`; }
  const m = t.match(/(-?\d+(?:[.,]\d+)?)\s*(\+|-|\*|x|×|\/|÷|mais|menos|vezes|dividido por)\s*(-?\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const a = lerNumero(m[1]), b = lerNumero(m[3]), op = m[2];
  if (/\/|÷|dividido/.test(op) && b === 0) return 'Dividir por zero ninguém consegue, nem eu!';
  const r = /\+|mais/.test(op) ? a + b : /\*|x|×|vezes/.test(op) ? a * b : /\/|÷|dividido/.test(op) ? a / b : a - b;
  return `Dá ${numero(r)}!`;
}

const DUVIDAS = [
  [/agenda|reuni|compromisso|e-?mails?|caixa de entrada/, 'Agenda e e-mail eu ainda não alcanço: não existe essa conexão aqui. Quando existir, vai ser você quem liga, uma por uma.', 'relaxed'],
  [/(sem|nao quero|nao preciso).*\b(ia|agente|inteligencia)\b|\b(o que|oque|que)\b.*(sabe|consegue|voce faz|pode fazer)|me ajuda|ajuda$/, SEM_IA + ' ' + COM_IA, 'happy'],
  [/(com|conectar|ligar|adicionar|colocar).*\b(ia|agente|inteligencia|chatgpt|claude|gemini)\b|potencial/, COM_IA, 'surprised'],
  [/especialista|orquestr|cadeia|em rede/, 'Essa é a minha parte favorita! Com um agente conectado, você cria especialistas e grupos na ilha, e eu passo o trabalho de um para o outro. Sem agente, os grupos ficam prontos e guardados, esperando.', 'surprised'],
  [/(como|onde|o que|oque|pra que|para que).*\bmods?\b/, 'Mods são programinhas em Lua que mudam o navegador! Eles ficam em oceano://mods e não tocam nos seus arquivos, senhas ou na internet. Dá até para escrever o seu.', 'happy'],
  [/(como|onde|o que|oque).*\b(tema|cores?)\b/, 'Em oceano://temas você troca as cores, ou edita e vê o resultado na hora. Ou é só me pedir: "troca o tema para Lagoa".', 'happy'],
  [/(como|onde|o que|oque|pra que|para que).*\b(ilha|vilas?|grupos?)\b/, 'Role a página inicial para cima que você chega na ilha! Cada grupo vira uma vila. Dá para criar grupos de assuntos e colocar especialistas neles.', 'happy'],
  [/senhas?|\bbau\b/, 'O Oceano não guarda senhas de sites. O baú fica desligado nesta versão, de propósito. E a sua chave de IA fica só na memória enquanto o navegador está aberto: ao fechar, ela some.', 'relaxed'],
  [/privacidade|rastre|telemetria|me (espiona|vigia)|meus dados/, 'Telemetria zero! Bloqueio rastreadores e mostro cada conexão em oceano://privacidade. O que é seu fica neste computador.', 'happy'],
  [/(como|onde).*\b(baix|download)/, 'Os arquivos que você baixa aparecem em oceano://downloads. E nada baixa sem um clique seu!', 'happy'],
  [/(como|onde|o que|oque).*\b(animac|animar|desenh|gif)/, 'Em oceano://micromediaflash tem um editor de animação inteiro, com ossos, malha e exportação para GIF e vídeo. Dá vontade de ficar horas!', 'surprised'],
  [/(como|onde|o que|oque).*\b(musica|som|sampler|trilha|\bcds?\b)/, 'Música é o que não falta! Tem Trilha para relaxar, CDs com os seus links, Stave para programar som e o ½ sampler para tocar. Está tudo no ícone da nota, lá em cima.', 'happy'],
  [/(como|onde|o que|oque).*\b(video|ferramentas?|editar)/, 'As 🧰 Ferramentas têm editor de vídeo e várias outras coisas, tudo rodando no seu computador. Abre em oceano://ferramentas!', 'happy'],
  [/(como|onde|o que|oque).*\b(ler|leitor|leitura|livro)/, 'Abra uma matéria e toque no ícone do livro: ela vira um livro limpo, sem pop-ups, com a letra que você quiser. Dá para guardar e ler depois.', 'happy'],
  [/(como|onde|o que|oque).*\bfarol\b/, 'A luz do farol mostra quanto os mods estão usando agora! Em oceano://mods eu explico a conta inteira.', 'happy'],
  [/(como|onde|o que|oque).*modo jogo/, 'O modo jogo congela as abas de fundo para o jogo rodar melhor. Fica em oceano://jogo, ou é só me pedir: "liga o modo jogo".', 'happy'],
  [/(como|onde).*(avatar|sua cara|seu visual|sua voz|mudar voce)/, 'Em oceano://avatar você troca o meu visual, o meu nome e a minha voz. Pode mexer, eu não ligo!', 'happy'],
];

// o que dá para responder na hora, mesmo no meio de uma frase
export function respostaDireta(texto) {
  const t = semAcento(texto).trim();
  const r = conta(t);
  if (r && /\d/.test(t)) return { texto: r, emocao: 'happy' };
  const agora = new Date();
  if (/que horas|horas sao|que hora e/.test(t)) return { texto: `Agora são ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}!`, emocao: 'happy' };
  if (/que dia|dia e hoje|data de hoje|qual a data/.test(t)) return { texto: `Hoje é ${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}!`, emocao: 'happy' };
  for (const [regra, resposta, emocao] of DUVIDAS) if (regra.test(t)) return { texto: resposta, emocao };
  return null;
}

// a conversa de quando nenhuma ferramenta entrou em cena
export function conversaSimples(texto, nome, saudacao) {
  const t = semAcento(texto).trim();
  if (/^(oi+|ola|e ai|eai|opa|bom dia|boa tarde|boa noite|hey|hello)\b/.test(t)) return { texto: saudacao, emocao: 'happy' };
  if (/quem e voce|seu nome|como (voce )?se chama|voce e /.test(t)) return { texto: `Eu sou ${nome}, a sua navegadora! Sem um agente, respondo por regras simples, então sou rápida e meio limitada. Com uma IA conectada, aí sim mostro tudo o que sei fazer!`, emocao: 'happy' };
  if (/tudo bem|como (voce )?(esta|vai)|beleza|tudo bom/.test(t)) return { texto: sorteia(['Tudo ótimo! Feliz de estar aqui com você. O que vamos fazer?', 'Tudo incrível por aqui! Bora criar alguma coisa?']), emocao: 'happy' };
  if (/obrigad|valeu|brigad/.test(t)) return { texto: sorteia(['De nada! É só chamar!', 'Imagina! Estou aqui.']), emocao: 'happy' };
  if (/(te amo|gosto de voce|voce e (legal|incrivel|linda))/.test(t)) return { texto: 'Ah, assim eu fico sem jeito! Obrigada!', emocao: 'surprised' };
  return { texto: 'Essa eu ainda não consigo sozinha! Sem um agente, respondo coisas simples, como clima, horas, contas e dúvidas sobre o navegador. Com uma IA conectada em oceano://ia, eu respondo isso e muito mais. Prefere seguir sem IA? Tudo certo, o simples continua comigo!', emocao: 'relaxed' };
}
