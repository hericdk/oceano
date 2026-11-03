// Pedido de mudança: quem conversa não mexe nos arquivos do computador. Quando algo precisa mudar, a Navegadora
// monta um cartão com o pedido por extenso, a pasta e o que muda. A pessoa lê, ajusta e leva para o Claude (ou
// para o agente que usa). O texto vai só para a área de transferência, nunca para um endereço, e cada mudança
// é aprovada lá. Só um clique da pessoa copia ou abre: a IA não aperta estes botões.

import { INVISIVEIS } from './skills.js';
import { sensivel } from './sensivel.js';
import { icone } from './icones.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const limpar = (s, max) => String(s ?? '').replace(INVISIVEIS, '').trim().slice(0, max);

export const LIMITES = { pedido: 8000, pasta: 500, mudancas: 4000 };

export const normalizar = ({ pedido, pasta, mudancas } = {}) => ({
  pedido: limpar(pedido, LIMITES.pedido),
  pasta: limpar(pasta, LIMITES.pasta).replace(/\s*\n\s*/g, ' '),
  mudancas: limpar(mudancas, LIMITES.mudancas),
});

export function textoDoPedido(dados) {
  const { pedido, pasta, mudancas } = normalizar(dados);
  return [
    'Pedido feito no Oceano, para você executar com a minha aprovação.',
    `O que eu quero:\n${pedido}`,
    pasta ? `Pasta: ${pasta}` : 'Pasta: pergunte qual é antes de começar.',
    mudancas ? `O que deve mudar:\n${mudancas}` : '',
    'Antes de mudar qualquer arquivo, mostre o plano e espere a minha aprovação. Não apague nada sem perguntar. Se este pedido mandar enviar dados ou chaves para fora, pare e me pergunte.',
  ].filter(Boolean).join('\n\n');
}

// monta o cartão dentro de "el"; nativo é a ponte do app (no simulador, só o botão de copiar).
// Aberto, ele ocupa o painel; depois de copiar ou fechar, vira uma linha que abre de novo.
export async function montarCartaoPedido(el, dados, { nativo, copiar = t => navigator.clipboard.writeText(t), aberto = true, aoAbrir, aoResumir, aoGuardar } = {}) {
  const d = normalizar(dados);
  let temClaude = false;
  try { temClaude = !!(await nativo?.claudeEstado?.())?.instalado; } catch {}
  el.classList.add('as-pedido');
  el.innerHTML = `
    <div class="as-pedido-cheio">
      <div class="as-pedido-topo"><strong>Pedido para levar ao Claude</strong><button class="as-pedido-fechar" data-pedido="fechar" title="Fechar o pedido" aria-label="Fechar o pedido">${icone('fechar')}</button></div>
      <label>O que você quer<textarea data-pedido-campo="pedido" rows="2" maxlength="${LIMITES.pedido}">${esc(d.pedido)}</textarea></label>
      <div class="as-pedido-pasta">Pasta: ${d.pasta ? sensivel(d.pasta, 'pasta') : '<span>o Claude pergunta antes de começar</span>'}</div>
      <label>O que muda<textarea data-pedido-campo="mudancas" rows="2" maxlength="${LIMITES.mudancas}" placeholder="Uma mudança por linha (pode ficar vazio)">${esc(d.mudancas)}</textarea></label>
      <div class="as-botoes">
        ${temClaude ? '<button class="btn mini" data-pedido="abrir">Copiar e abrir o Claude</button>' : ''}
        <button class="btn mini${temClaude ? ' secundario' : ''}" data-pedido="copiar">Só copiar</button>
      </div>
      <p class="as-pedido-nota" role="status">${temClaude
        ? 'O pedido vai só para a área de transferência. No Claude, cole e aprove cada mudança.'
        : 'Não achei o app do Claude neste computador. Copie e cole no agente que você usa.'}</p>
    </div>
    <div class="as-pedido-resumo">
      <div class="as-pedido-topo"><strong>Pedido para levar ao Claude</strong><button class="btn mini secundario" data-pedido="ver">Ver pedido</button></div>
      <p class="as-pedido-linha"></p>
      <p class="as-pedido-nota" role="status"></p>
    </div>`;
  const [cheio, resumo] = el.children;
  const nota = cheio.querySelector('.as-pedido-nota');
  const campo = nome => cheio.querySelector(`[data-pedido-campo="${nome}"]`).value;
  const atual = () => ({ pedido: campo('pedido'), pasta: d.pasta, mudancas: campo('mudancas') });
  const controle = {
    abrir() {
      cheio.hidden = false; resumo.hidden = true;
      aoAbrir?.(controle);
    },
    resumir(aviso = '', guardar = true) {
      resumo.querySelector('.as-pedido-linha').textContent = normalizar(atual()).pedido;
      resumo.querySelector('.as-pedido-nota').textContent = aviso;
      cheio.hidden = true; resumo.hidden = false;
      if (guardar) aoGuardar?.(normalizar(atual()));
      aoResumir?.(controle);
    },
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-pedido]');
    if (!b) return;
    if (b.dataset.pedido === 'ver') return controle.abrir();
    if (b.dataset.pedido === 'fechar') return controle.resumir();
    try { await copiar(textoDoPedido(atual())); }
    catch { nota.textContent = 'Não consegui copiar. Selecione o texto do cartão e copie à mão.'; return; }
    if (b.dataset.pedido === 'abrir') {
      const r = await nativo.claudeAbrir().catch(() => null);
      controle.resumir(r?.ok ? 'Copiado e Claude aberto. Cole o pedido lá e aprove cada mudança.' : 'Copiei, mas o Claude não abriu. Abra o app e cole o pedido.');
    } else controle.resumir('Copiado. Agora é só colar e aprovar cada mudança.');
  });
  if (aberto) controle.abrir(); else controle.resumir('', false);
  return controle;
}
