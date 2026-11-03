// Processo separado da voz neural: recebe texto, devolve áudio.
const { criarNucleo } = require('./voz-nucleo');
let nucleo = null;
process.parentPort.on('message', async ({ data: m }) => {
  try {
    nucleo ??= await criarNucleo(m.modelo);
    const pcm = await nucleo.sintetizar(m.texto, m.vel, m.voz);
    process.parentPort.postMessage({ id: m.id, pcm });
  } catch (e) { process.parentPort.postMessage({ id: m.id, erro: String(e.message || e) }); }
});
