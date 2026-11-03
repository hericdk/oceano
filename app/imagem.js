// Oceano — edição de imagem com a IA que a pessoa escolher (papel "imagem" em oceano://ia):
// ChatGPT (gpt-image-1), Gemini (imagem) ou Higgsfield. No Higgsfield o custo vem antes e só gera com o "ok".
// A imagem chega e volta em base64; a chave nunca sai deste processo.

const agentes = require('./agentes');

const semChave = t => String(t || '').replace(/sk-[\w-]+|AIza[\w-]+/g, '[chave]').slice(0, 200);

async function openai(ag, s, png, pedido) {
  const f = new FormData();
  f.append('model', ag.modelo || 'gpt-image-1');
  f.append('prompt', pedido);
  f.append('image', new Blob([png], { type: 'image/png' }), 'imagem.png');
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${s.chave}` }, body: f, signal: AbortSignal.timeout(180000) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `OpenAI respondeu ${r.status}`);
  return { imagem: d.data?.[0]?.b64_json };
}

async function gemini(ag, s, png, pedido) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ag.modelo || 'gemini-2.5-flash-image')}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': s.chave, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(180000),
    body: JSON.stringify({ contents: [{ parts: [{ text: pedido }, { inlineData: { mimeType: 'image/png', data: Buffer.from(png).toString('base64') } }] }] }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `Gemini respondeu ${r.status}`);
  const parte = (d.candidates?.[0]?.content?.parts || []).find(p => p.inlineData);
  if (!parte) throw new Error('O Gemini respondeu sem imagem. Tente descrever o pedido de outro jeito.');
  return { imagem: parte.inlineData.data };
}

// Higgsfield: sobe a imagem, pede a estimativa; com confirmado, gera e acompanha até ficar pronta
const API_H = 'https://api.higgsfield.ai';
async function chamarH(caminho, chave, { metodo = 'GET', corpo } = {}) {
  const r = await fetch(caminho.startsWith('http') ? caminho : API_H + caminho, { method: metodo, signal: AbortSignal.timeout(60000),
    headers: { Authorization: chave, ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error(`Higgsfield ${r.status}: ${semChave((j && (j.detail || j.error || j.message)) || t)}`);
  return j;
}
async function higgsfield(ag, s, png, pedido, confirmado) {
  const chave = `Key ${s.chave}:${s.segredo}`, modelo = ag.modelo || 'bytedance/seedream/v4/edit';
  const u = await chamarH('/files/generate-upload-url', chave, { metodo: 'POST', corpo: { content_type: 'image/png' } });
  const up = await fetch(u.upload_url, { method: 'PUT', headers: u.upload_headers || { 'Content-Type': 'image/png' }, body: png, signal: AbortSignal.timeout(120000) });
  if (!up.ok) throw new Error(`o envio da imagem falhou (${up.status})`);
  const corpo = { prompt: pedido.slice(0, 4000), image_urls: [u.public_url] };
  if (!confirmado) {
    let custo = null; try { custo = await chamarH(`/estimate/${modelo}`, chave, { metodo: 'POST', corpo }); } catch (e) { custo = { indisponivel: true, erro: e.message }; }
    return { custo };
  }
  const pedidoH = await chamarH(`/${modelo}`, chave, { metodo: 'POST', corpo });
  const id = pedidoH.request_id || pedidoH.id;
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const st = await chamarH(`/requests/${id}/status`, chave);
    if (st.status === 'completed') {
      const url = st.images?.[0]?.url || st.output?.[0]?.url || st.result?.url;
      const img = await fetch(url, { signal: AbortSignal.timeout(60000) });
      return { imagem: Buffer.from(await img.arrayBuffer()).toString('base64') };
    }
    if (['failed', 'canceled', 'nsfw'].includes(st.status)) throw new Error(`O Higgsfield não gerou (${st.status}).`);
  }
  throw new Error('O Higgsfield demorou demais. Tente de novo.');
}

function registrar(ipcMain) {
  ipcMain.handle('imagem:editar', async (_e, b64, pedido, confirmado) => {
    const ag = agentes.listar().find(a => a.papel === 'imagem');
    if (!ag) return { erro: 'Escolha a IA de edição de imagem em oceano://ia.' };
    const s = agentes.abrirCofre(ag.provedor);
    if (!s?.chave) return { erro: 'A IA de imagem está sem chave. Conecte de novo em oceano://ia.' };
    const png = Buffer.from(String(b64 || ''), 'base64');
    if (!png.length || png.length > 20 * 1048576) return { erro: 'Imagem vazia ou grande demais (até 20 MB).' };
    pedido = String(pedido || '').trim();
    if (!pedido) return { erro: 'Escreva o que mudar na imagem.' };
    try {
      if (ag.provedor === 'openai') return await openai(ag, s, png, pedido);
      if (ag.provedor === 'gemini') return await gemini(ag, s, png, pedido);
      if (ag.provedor === 'higgsfield') return await higgsfield(ag, s, png, pedido, !!confirmado);
      return { erro: 'Esse provedor não edita imagem.' };
    } catch (e) { return { erro: semChave(e.message || e) }; }
  });
}

module.exports = { registrar };
