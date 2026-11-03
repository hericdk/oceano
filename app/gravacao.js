// Mostra quando um site está usando a câmera ou o microfone. O começo vem da permissão concedida no processo principal,
// que o site não consegue esconder. O fim vem das faixas da própria página: sem essa resposta, o aviso fica ligado até a página sair.
const ativos = new Map();
let enviar = () => {};

const MARCA = "Symbol.for('oceano.gravacao')";
const OLHAR = `(()=>{const S=${MARCA};if(window[S]||!navigator.mediaDevices)return 1;const T=new Set;Object.defineProperty(window,S,{value:T});const m=navigator.mediaDevices;for(const n of ['getUserMedia','getDisplayMedia']){if(!m[n])continue;const o=m[n].bind(m);m[n]=async(...a)=>{const s=await o(...a);for(const t of s.getTracks())T.add(t);return s}}return 1})()`;
const CONTAR = `(()=>{const T=window[${MARCA}];if(!T)return null;const v=[...T].filter(t=>t.readyState==='live');return {visto:T.size,camera:v.some(t=>t.kind==='video'),microfone:v.some(t=>t.kind==='audio'),vivo:v.length}})()`;

const noQuadro = async (wc, codigo) => {
  const quadros = wc.isDestroyed() ? [] : wc.mainFrame.framesInSubtree;
  return Promise.all(quadros.map(f => f.executeJavaScript(codigo).catch(() => null)));
};
const estado = () => [...ativos].map(([wcId, a]) => ({ wcId, camera: a.camera, microfone: a.microfone, origem: a.origem }));
const avisar = () => enviar('gravacao:estado', estado());

function limpar(id) {
  const a = ativos.get(id);
  if (!a) return;
  clearInterval(a.relogio);
  ativos.delete(id);
  avisar();
}

async function conferir(wc) {
  const a = ativos.get(wc.id);
  if (!a) return;
  if (wc.isDestroyed()) return limpar(wc.id);
  const r = (await noQuadro(wc, CONTAR)).filter(Boolean), visto = r.reduce((s, x) => s + x.visto, 0), vivo = r.reduce((s, x) => s + x.vivo, 0);
  if (!visto) return;   // a página ainda não respondeu: na dúvida, o aviso fica
  if (!vivo) { a.parado = (a.parado || 0) + 1; if (a.parado >= 2) limpar(wc.id); return; }
  a.parado = 0;
  const camera = r.some(x => x.camera), microfone = r.some(x => x.microfone);
  if (camera !== a.camera || microfone !== a.microfone) { a.camera = camera; a.microfone = microfone; avisar(); }
}

function marcar(wc, tipos, origem) {
  if (!wc || wc.isDestroyed()) return;
  noQuadro(wc, OLHAR);
  const a = ativos.get(wc.id) || { camera: false, microfone: false };
  a.origem = origem; a.parado = 0;
  const lista = tipos?.length ? tipos : ['audio', 'video'];
  if (lista.includes('video')) a.camera = true;
  if (lista.includes('audio')) a.microfone = true;
  if (!a.relogio) { a.relogio = setInterval(() => conferir(wc), 2000); wc.once('destroyed', () => limpar(wc.id)); }
  ativos.set(wc.id, a);
  avisar();
}

function registrar(ipcMain, enviarParaTela, app) {
  enviar = enviarParaTela;
  ipcMain.handle('gravacao:estado', estado);
  app.on('web-contents-created', (_, wc) => {
    if (wc.getType() !== 'webview') return;
    wc.on('dom-ready', () => noQuadro(wc, OLHAR));
    wc.on('did-frame-finish-load', () => noQuadro(wc, OLHAR));
    wc.on('did-navigate', () => limpar(wc.id));
  });
}

module.exports = { marcar, registrar };
