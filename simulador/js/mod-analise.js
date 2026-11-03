// O que um mod faz, lido do próprio código pelo navegador: não é o texto que o autor escreveu.
// A leitura mostra o que o código pede. Quem garante o limite é o motor: sem a permissão, a função nem existe,
// e o que aparece em "bloqueado" não roda em nenhum mod.

export const MAX_MOD_BYTES = 32 * 1024;   // o mesmo tamanho de um cartucho do PICO-8

const API = {
  tela: { nomes: ['cls', 'pset', 'line', 'rectfill', 'rect', 'circ', 'circfill', 'print', 'spr', 'pal'], faz: 'desenha no próprio quadro' },
  controles: { nomes: ['btn', 'btnp'], faz: 'lê as teclas de jogo quando está em foco' },
  som: { nomes: ['sfx'], faz: 'toca sons sintetizados' },
  mouse: { nomes: ['mouse'], faz: 'vê o mouse sobre o próprio quadro' },
  teclado: { nomes: ['tecla'], faz: 'recebe o que você digita quando ele está em foco' },
  memoria: { nomes: ['guardar', 'ler'], faz: 'guarda até 8 KB neste computador' },
  eventos: { nomes: ['oceano.on'], faz: 'ouve eventos do navegador' },
  modo_jogo: { nomes: ['oceano.modo_jogo'], faz: 'liga ou desliga o modo jogo' },
  abas: { nomes: ['oceano.congelar_abas'], faz: 'congela abas em segundo plano' },
  avisos: { nomes: ['oceano.notificar'], faz: 'mostra avisos na tela' },
};
const BLOQUEADOS = [
  [/\bload(string|file)?\s*\(/, 'rodar código escondido em texto'], [/\brequire\s*\(/, 'carregar outro arquivo'], [/\bdofile\s*\(/, 'carregar outro arquivo'],
  [/\bio\s*\./, 'abrir arquivos'], [/\bos\s*\.\s*(execute|remove|rename|getenv|exit|tmpname)/, 'mexer no sistema'], [/\bdebug\s*\./, 'mexer nas entranhas do motor'],
  [/\bstring\s*\.\s*dump\b/, 'gerar código'], [/\b_G\b|\b_ENV\b/, 'procurar funções escondidas'], [/\bpackage\s*\./, 'carregar pacotes'], [/\brawget\b|\brawset\b/, 'contornar regras do Lua'],
];

// tira comentários e textos para um nome dentro de uma frase não contar como uso
function soCodigo(fonte) {
  const nomesEventos = [];
  const limpo = String(fonte)
    .replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/oceano\s*\.\s*on\s*\(\s*["']([\w-]+)["']/g, (_, n) => { nomesEventos.push(n); return 'oceano.on('; })
    .replace(/\[(=*)\[[\s\S]*?\]\1\]/g, '""')
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
  return { limpo, nomesEventos };
}

export function analisarMod(fonte) {
  const { limpo, nomesEventos } = soCodigo(fonte);
  const usa = (nome) => new RegExp((nome.includes('.') ? '\\b' + nome.replace('.', '\\s*\\.\\s*') : '(^|[^.\\w])' + nome) + '\\s*[({"\']', 'm').test(limpo);
  const pede = Object.entries(API).filter(([, a]) => a.nomes.some(usa)).map(([perm, a]) => ({ perm, faz: a.faz, funcoes: a.nomes.filter(usa) }));
  const quando = [];
  if (/function\s+_init\b/.test(limpo)) quando.push('uma vez, ao ligar');
  if (/function\s+_update\b/.test(limpo)) quando.push('30 vezes por segundo, enquanto estiver ligado');
  if (/function\s+_draw\b/.test(limpo)) quando.push('a cada quadro, para desenhar');
  if (nomesEventos.length) quando.push(`quando acontece: ${[...new Set(nomesEventos)].join(', ')}`);
  const bloqueado = [...new Set(BLOQUEADOS.filter(([re]) => re.test(limpo)).map(([, t]) => t))];
  return { pede, quando, bloqueado, bytes: new Blob([String(fonte)]).size, permissoes: pede.map(p => p.perm) };
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function htmlAnalise(a, permissoesDadas, usoReal) {
  const sobra = permissoesDadas ? permissoesDadas.filter(p => !a.permissoes.includes(p)) : [];
  const falta = permissoesDadas ? a.permissoes.filter(p => !permissoesDadas.includes(p)) : [];
  const rodou = usoReal ? Object.keys(usoReal).filter(n => !n.startsWith('__')) : [];
  return `<div class="mod-analise">
    <p><b>O que ele faz</b> ${a.pede.length ? a.pede.map(p => esc(p.faz)).join(' · ') : 'não chama nenhuma função do Oceano'}.</p>
    <p><b>Quando</b> ${a.quando.length ? esc(a.quando.join(' · ')) : 'só ao carregar'}.</p>
    <p><b>O que não consegue</b> internet, arquivos, senhas, páginas e outros mods.</p>
    ${a.bloqueado.length ? `<p class="mod-alerta"><b>Tentou e o Oceano bloqueia</b> ${esc(a.bloqueado.join(' · '))}.</p>` : ''}
    ${falta.length ? `<p class="mod-alerta"><b>Precisa de permissão</b> ${esc(falta.join(', '))}. Sem ela, essa parte falha.</p>` : ''}
    ${sobra.length ? `<p class="nota">Permissão que o código não usa: ${esc(sobra.join(', '))}.</p>` : ''}
    ${rodou.length ? `<p class="nota">Visto rodando agora: ${esc(rodou.join(', '))}.</p>` : ''}
    <p class="nota">Lido do código pelo navegador, ${Math.ceil(a.bytes / 1024)} de 32 KB.</p>
  </div>`;
}
