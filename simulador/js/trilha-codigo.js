// O código de uma trilha, em 6 cores da web: elas guardam a viagem, as barras, as faixas e as notas.
// Qualquer mudança mexe em todas as cores, para a escala reagir na hora. O volume fica de fora: é de quem ouve, não da música.

const VERSAO = 2;   // versão do formato
const hex = n => n.toString(16).toUpperCase().padStart(2, '0');
// cada byte se mistura com o vizinho, numa ida e numa volta: mudar um só muda todos, e o caminho inverso devolve o original
const passo = (v, i) => (Math.imul(v ^ 0x5B, 167) + i * 29 + 13) & 255;
const misturar = bytes => {
  const b = [...bytes];
  for (let v = 0; v < 2; v++) {
    for (let i = 1; i < b.length; i++) b[i] ^= passo(b[i - 1], i);
    for (let i = b.length - 2; i >= 0; i--) b[i] ^= passo(b[i + 1], i);
  }
  return b;
};
const desmisturar = bytes => {
  const b = [...bytes];
  for (let v = 0; v < 2; v++) {
    for (let i = 0; i <= b.length - 2; i++) b[i] ^= passo(b[i + 1], i);
    for (let i = b.length - 1; i >= 1; i--) b[i] ^= passo(b[i - 1], i);
  }
  return b;
};
const pct = v => Math.max(0, Math.min(100, Math.round(v * 100)));

export function codigoDaTrilha({ semente, aj, minhas, linhas }) {
  const s = semente & 0xFFFFFF;
  const primeira = [s >> 16, (s >> 8) & 255, s & 255];
  const bytes = [...primeira];
  bytes.push((VERSAO << 6) | (Math.max(70, Math.min(110, Math.round(aj.tempo))) - 70));
  for (const k of ['energia', 'brilho', 'espaco', 'fita']) bytes.push(pct(aj[k]));
  bytes.push(linhas.reduce((m, l, i) => (aj.mudos.includes(l.id) ? m | (1 << i) : m), 0));
  for (let i = 0; i < 16; i += 2) bytes.push(((minhas[i] == null ? 0 : minhas[i] + 1) << 4) | (minhas[i + 1] == null ? 0 : minhas[i + 1] + 1));
  bytes.push(bytes.reduce((a, b) => (a + b) & 255, 0));
  const saida = misturar(bytes);
  const cores = [];
  for (let i = 0; i < saida.length; i += 3) cores.push('#' + saida.slice(i, i + 3).map(hex).join(''));
  return cores;
}

// aceita o código colado de qualquer jeito (com espaços, vírgulas, numa frase); devolve null se não for de uma trilha
export function lerCodigo(texto, linhas) {
  const cores = String(texto ?? '').match(/#[0-9a-f]{6}(?![0-9a-f])/gi);
  if (!cores || cores.length !== 6) return null;
  const bytes = desmisturar(cores.flatMap(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))));
  const semente = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
  const soma = bytes.slice(0, -1).reduce((a, b) => (a + b) & 255, 0);
  if (soma !== bytes[17] || bytes[3] >> 6 !== VERSAO) return null;
  const tempo = 70 + (bytes[3] & 63);
  if (tempo > 110 || bytes.slice(4, 8).some(v => v > 100)) return null;
  const minhas = [];
  for (let i = 0; i < 8; i++) for (const n of [bytes[9 + i] >> 4, bytes[9 + i] & 15]) { if (n > linhas.length) return null; minhas.push(n ? n - 1 : null); }
  return {
    semente, tempo, energia: bytes[4] / 100, brilho: bytes[5] / 100, espaco: bytes[6] / 100, fita: bytes[7] / 100,
    mudos: linhas.filter((_, i) => bytes[8] & (1 << i)).map(l => l.id), minhas,
  };
}
