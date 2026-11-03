// A caixinha de uso anônimo manda aqui: desmarcada, ou nunca respondida, nada é enviado nem medido.
import { idiomaAtual } from './idioma.js';

export function contarUso(guardado) {
  if (guardado.ler('uso-anonimo', false) !== true) { window.oceanoNativo?.contagemParar?.(); return; }
  window.oceanoNativo?.contagemSinal?.(idiomaAtual(guardado));
}
