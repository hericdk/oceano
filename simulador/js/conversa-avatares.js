// A conversinha do slide de avatar: a Cara e o gato discutindo enquanto a pessoa escolhe. As falas já vêm gravadas,
// então funciona sem IA e sem baixar nada. Cada um fala com a legenda embaixo; termina e recomeça.
import { linguaGravada } from './voz-neural.js';

const gravacao = (id, lingua) => new URL(`../avatares/conversa/${linguaGravada(lingua)}/${id}.ogg`, import.meta.url).href;
const FALAS = [
  { id: 'c1', quem: 'cara', texto: 'Olha só, você tentando decidir entre mim e um gato!', emocao: 'happy', ms: 3507 },
  { id: 'g1', quem: 'gato', texto: 'Mim sou eu. Ela é só um avatar.', ms: 2140 },
  { id: 'c2', quem: 'cara', texto: 'Avatar, não! Eu sou uma navegadora!', emocao: 'angry', ms: 2302 },
  { id: 'g2', quem: 'gato', texto: 'Navegador, então.', ms: 1562 },
  { id: 'c3', quem: 'cara', texto: 'NavegadorA! Com A! AAA!', emocao: 'angry', ms: 1916 },
];
const REACAO = {
  cara: { id: 'rc', quem: 'cara', texto: 'Agora sim, escolha certa!', emocao: 'happy', ms: 1988 },
  gato: { id: 'rg', quem: 'gato', texto: 'Viu? Mim sou eu.', ms: 1295 },
};
const ENTRE_FALAS = 450, ENTRE_VOLTAS = 3200;
const espera = ms => new Promise(r => setTimeout(r, ms));

// legendas: { cara, gato } com os elementos; atores: { cara, gato } com falar(texto, emocao) e calar()
export function criarConversa({ legendas, atores, comSom, lingua }) {
  let vez = 0, audio = null;
  const limpar = () => { legendas.cara.textContent = ''; legendas.gato.textContent = ''; atores.cara.calar(); atores.gato.calar(); };
  async function dizer(f, v) {
    limpar();
    legendas[f.quem].textContent = f.texto;
    atores[f.quem].falar(f.texto, f.emocao);
    if (comSom()) {
      audio = new Audio(gravacao(f.id, lingua()));
      const fim = new Promise(r => { audio.onended = r; audio.onerror = r; });
      // cada idioma tem a sua duração. O som bloqueado pelo navegador não trava a conversa: a legenda segue no tempo da fala
      await audio.play().then(() => Promise.race([fim, espera(15000)]), () => espera(f.ms + 300));
    } else await espera(f.ms + 300);
    if (v !== vez) return;
    atores[f.quem].calar();
    await espera(ENTRE_FALAS);
  }
  async function falarLista(lista, v) { for (const f of lista) { if (v !== vez) return; await dizer(f, v); } }
  async function emLoop(v) {
    while (v === vez) {
      await falarLista(FALAS, v);
      if (v !== vez) return;
      limpar();
      await espera(ENTRE_VOLTAS);
    }
  }
  const parar = () => { vez++; audio?.pause(); audio = null; limpar(); };
  return {
    comecar() { parar(); emLoop(vez); },
    // trocar a escolha: quem foi escolhido comenta, e depois a conversa volta do começo
    reagir(quem) { parar(); const v = vez; falarLista([REACAO[quem]], v).then(() => espera(1200)).then(() => emLoop(v)); },
    parar,
  };
}
