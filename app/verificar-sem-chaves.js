// Guarda do projeto: o Oceano não usa as Chaves do Mac, não pede senha do computador, não guarda chave de IA em disco e a IA não muda arquivos.
// Rode com `npm run verificar` (também antes de cada instalador). Falha se algum destes pontos voltar.
const fs = require('fs');
const path = require('path');

const AQUI = __dirname, RAIZ = path.join(AQUI, '..');
// o baú é código desligado: nada do app carrega esse arquivo, e isso também é conferido abaixo
const DESLIGADOS = new Set(['bau.js', 'verificar-sem-chaves.js']);
const PROIBIDOS = [
  [/getPath\(['"](documents|desktop|downloads|music|pictures|videos)['"]\)/, 'lê uma pasta da pessoa, e o sistema pede permissão'],
  [/\bsafeStorage\b/, 'usa o safeStorage, que abre as Chaves do Mac'],
  [/\/usr\/bin\/security|find-generic-password|add-generic-password/, 'chama o comando de chaves do sistema'],
  [/promptTouchID|UserConsentVerifier/, 'pede digital ou senha do sistema'],
  [/\bkeytar\b/, 'usa uma biblioteca de chaveiro'],
  [/cofre\.json/, 'grava chaves em disco'],
  [/gravar\(['"]ia\.json['"],\s*(c|conf|config\(\))\s*\)/, 'grava a chave da busca em disco'],
];
const erros = [];
for (const nome of fs.readdirSync(AQUI)) {
  if (!nome.endsWith('.js') || DESLIGADOS.has(nome)) continue;
  const t = fs.readFileSync(path.join(AQUI, nome), 'utf8').split('\n').filter(l => !/esquecerGuardadas|for \(const n of \['cofre\.json'/.test(l)).join('\n');
  for (const [re, porque] of PROIBIDOS) if (re.test(t)) erros.push(`app/${nome} ${porque}`);
  if (/require\(['"]\.\/bau['"]\)/.test(t)) erros.push(`app/${nome} liga o baú de senhas`);
}
if (!/["']bau\.js["']/.test(fs.readFileSync(path.join(AQUI, 'instalador', 'empacotar.py'), 'utf8'))) erros.push('o instalador leva o baú desligado');
if (/\bbau[A-Z]\w*:/.test(fs.readFileSync(path.join(AQUI, 'preload.js'), 'utf8'))) erros.push('app/preload.js expõe canais do baú');
const main = fs.readFileSync(path.join(AQUI, 'main.js'), 'utf8');
if (!/appendSwitch\('use-mock-keychain'\)/.test(main)) erros.push('app/main.js não desliga as Chaves do Mac para o Chromium');
if (!/appendSwitch\('password-store', 'basic'\)/.test(main)) erros.push('app/main.js não desliga o chaveiro do Linux');
if (!/^const BAU_ATIVO = false;/m.test(fs.readFileSync(path.join(RAIZ, 'simulador/js/bau.js'), 'utf8'))) erros.push('o baú de senhas foi ligado em simulador/js/bau.js');
// as travas da IA: tirar a etiqueta da tela não muda nada, e apagar uma destas linhas não passa daqui
const lerApp = n => fs.readFileSync(path.join(AQUI, n), 'utf8');
const conversaJs = lerApp('conversa.js'), iaJs = lerApp('ia.js');
if (!/textoSistema = [^\n]*guardrails\.bloco\(\)/.test(conversaJs)) erros.push('app/conversa.js não coloca os limites no texto de sistema');
if (!/function pedirFerramenta[^\n]*\n\s*if \(!guardrails\.ferramentaPermitida/.test(conversaJs)) erros.push('app/conversa.js executa ferramenta sem conferir o limite');
if (!/\.filter\(f => guardrails\.ferramentaPermitida/.test(conversaJs)) erros.push('app/conversa.js manda à IA ferramenta sem conferir o limite');
if (!/system: [^\n]*guardrails\.bloco\(\)/.test(iaJs)) erros.push('app/ia.js não coloca os limites na busca');
const guardrails = require('./guardrails');
if (!Object.isFrozen(guardrails.FIXOS) || !guardrails.FIXOS.some(f => f.id === 'arquivos')) erros.push('app/guardrails.js perdeu o limite fixo de arquivos');
if (!/nunca cria, altera, move, renomeia nem apaga arquivos/.test(guardrails.bloco([]))) erros.push('o limite de arquivos saiu do texto da IA');
if (guardrails.ferramentaPermitida('escrever_arquivo') || guardrails.ferramentaPermitida('run_shell') || guardrails.ferramentaPermitida('guardrails_mudar')) erros.push('app/guardrails.js deixa passar ferramenta que muda arquivos');
if (/fixos|FIXOS/.test(lerApp('guardrails.js').split('function gravar')[1].split('\n}')[0])) erros.push('app/guardrails.js deixa gravar o limite fixo');
for (const n of ['preload.js', 'preload-notch.js']) if (/require\(['"](node:)?(fs|child_process)['"]\)/.test(lerApp(n))) erros.push(`app/${n} abre o disco ou comandos para a tela`);
for (const m of fs.readFileSync(path.join(RAIZ, 'simulador/js/assistente.js'), 'utf8').matchAll(/\bnome: '(\w+)',?\s*(?:descricao|$)/gm)) if (!guardrails.ferramentaPermitida(m[1])) erros.push(`a ferramenta ${m[1]} fere o limite de arquivos`);
for (const p of ['simulador/avatares/cara/fonte', 'simulador/imagens/ilha-exemplo.jpg']) if (fs.existsSync(path.join(RAIZ, p))) erros.push(`${p} é imagem de referência: fica em _referencias`);
if (!/gravacao\.marcar\(/.test(lerApp('seguranca.js'))) erros.push('app/seguranca.js parou de avisar quando um site grava');
if (erros.length) { console.error('Guarda das chaves falhou:\n- ' + erros.join('\n- ')); process.exit(1); }
console.log('Guarda das chaves e dos limites da IA: tudo certo.');
