// Processo separado da transcrição: recebe áudio, devolve texto.
const { criarNucleo } = require('./transcricao-nucleo');
let nucleo = null;
process.parentPort.on('message', async ({ data: m }) => {
  try {
    nucleo ??= await criarNucleo(m.pasta);
    const b = m.dados, pcm = new Float32Array(b.buffer, b.byteOffset, b.byteLength >> 2);
    process.parentPort.postMessage({ id: m.id, texto: await nucleo.transcrever(pcm, m.lingua) });
  } catch (e) { process.parentPort.postMessage({ id: m.id, erro: String(e.message || e) }); }
});
