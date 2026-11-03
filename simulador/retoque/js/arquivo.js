// Projeto (.retoque) com camadas, exportar imagem e rascunho automático. O projeto é só JSON e PNGs: nada nele é executado.
import { Documento, novaCamada, novoCanvas, ctx2d, MISTURAS, tamanhoValido, usarIdsAPartirDe } from './nucleo.js';

const MAGICO = 'RETOQUE1';
const pngDe = c => new Promise((ok, falha) => c.toBlob(b => (b ? ok(b) : falha(new Error('sem memória para gravar'))), 'image/png'));

export function exportarBlob(doc, tipo, qualidade) {
  const c = doc.achatadoCanvas(tipo === 'image/jpeg' ? '#ffffff' : null);
  return new Promise((ok, falha) => c.toBlob(b => (b ? ok(b) : falha(new Error('sem memória para exportar'))), tipo, qualidade));
}
export async function projetoBlob(doc) {
  const partes = [], tabela = [];
  const guardar = async c => { const b = await pngDe(c); partes.push(b); return b.size; };
  for (const c of doc.camadas) {
    tabela.push({ nome: c.nome, x: c.x, y: c.y, visivel: c.visivel, opacidade: c.opacidade, mistura: c.mistura, travada: c.travada, mascaraLigada: c.mascaraLigada, texto: c.texto, ativa: c.id === doc.ativaId, tamImg: await guardar(c.canvas), tamMasc: c.mascara ? await guardar(c.mascara) : 0 });
  }
  const cab = new TextEncoder().encode(JSON.stringify({ w: doc.w, h: doc.h, nome: doc.nome, camadas: tabela }));
  const tam = new Uint8Array(4); new DataView(tam.buffer).setUint32(0, cab.length);
  return new Blob([MAGICO, tam, cab, ...partes], { type: 'application/octet-stream' });
}
const paraCanvas = async blob => {
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const c = novoCanvas(bmp.width, bmp.height); ctx2d(c).drawImage(bmp, 0, 0); bmp.close();
  return c;
};
export const eProjeto = async blob => new TextDecoder().decode(await blob.slice(0, 8).arrayBuffer()) === MAGICO;
export async function lerProjeto(blob) {
  const tam = new DataView(await blob.slice(8, 12).arrayBuffer()).getUint32(0);
  if (tam > 16e6) throw new Error('projeto inválido');
  const j = JSON.parse(new TextDecoder().decode(await blob.slice(12, 12 + tam).arrayBuffer()));
  if (!tamanhoValido(j.w, j.h) || !Array.isArray(j.camadas) || !j.camadas.length) throw new Error('projeto inválido');
  const doc = new Documento(j.w, j.h, String(j.nome || 'sem-titulo').slice(0, 120));
  const pos0 = 12 + tam; let pos = pos0, ativa = null;
  const num = (v, p = 0) => (Number.isFinite(v) ? v : p);
  for (const k of j.camadas) {
    const canvas = await paraCanvas(blob.slice(pos, pos + k.tamImg)); pos += k.tamImg;
    let mascara = null;
    if (k.tamMasc) { mascara = await paraCanvas(blob.slice(pos, pos + k.tamMasc)); pos += k.tamMasc; }
    const texto = k.texto && typeof k.texto.texto === 'string' ? { texto: k.texto.texto, fonte: String(k.texto.fonte).replace(/[^\w\s,'"-]/g, ''), tam: num(k.texto.tam, 48), cor: /^#[0-9a-f]{6}$/i.test(k.texto.cor) ? k.texto.cor : '#000000', negrito: !!k.texto.negrito, italico: !!k.texto.italico, alinhar: ['left', 'center', 'right'].includes(k.texto.alinhar) ? k.texto.alinhar : 'left' } : null;
    const c = novaCamada(canvas, String(k.nome || '').slice(0, 120), Math.round(num(k.x)), Math.round(num(k.y)), { visivel: k.visivel !== false, opacidade: Math.min(1, Math.max(0, num(k.opacidade, 1))), mistura: MISTURAS.some(([m]) => m === k.mistura) ? k.mistura : 'source-over', travada: !!k.travada, mascara, mascaraLigada: k.mascaraLigada !== false, texto });
    doc.camadas.push(c); if (k.ativa) ativa = c.id;
    usarIdsAPartirDe(c.id);
  }
  doc.ativaId = ativa ?? doc.camadas.at(-1).id;
  doc.invalidar();
  return doc;
}

// rascunho automático: uma cópia só, no navegador desta ferramenta
const BANCO = 'retoque', LOJA = 'rascunho';
const abrir = () => new Promise((ok, falha) => { const r = indexedDB.open(BANCO, 1); r.onupgradeneeded = () => r.result.createObjectStore(LOJA); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); });
const transacao = async (modo, fn) => { const db = await abrir(); return new Promise((ok, falha) => { const t = db.transaction(LOJA, modo), r = fn(t.objectStore(LOJA)); t.oncomplete = () => { db.close(); ok(r.result); }; t.onerror = () => { db.close(); falha(t.error); }; }); };
export const gravarRascunho = blob => transacao('readwrite', s => s.put(blob, 'atual'));
export const lerRascunho = () => transacao('readonly', s => s.get('atual'));
export const apagarRascunho = () => transacao('readwrite', s => s.delete('atual'));
