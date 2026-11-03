// Avatares 3D importados pela pessoa: ficam neste computador (IndexedDB), fora do que é sincronizado ou publicado.
let db = null;
function base() {
  db ||= new Promise((ok, erro) => {
    const r = indexedDB.open('oceano-avatares3d', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('fichas', { keyPath: 'id' }); r.result.createObjectStore('dados'); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
  return db;
}
const tx = (lojas, modo, fn) => base().then((d) => new Promise((ok, erro) => {
  const t = d.transaction(lojas, modo), req = fn(...[].concat(lojas).map((l) => t.objectStore(l)));
  t.oncomplete = () => ok(req?.result);
  t.onerror = () => erro(t.error);
  t.onabort = () => erro(t.error);
}));
export const listarAvatares3d = () => tx('fichas', 'readonly', (f) => f.getAll()).catch(() => []);
export const lerAvatar3d = (id) => tx('dados', 'readonly', (d) => d.get(id));
export const gravarAvatar3d = (ficha, dados) => tx(['fichas', 'dados'], 'readwrite', (f, d) => { f.put(ficha); d.put(dados, ficha.id); });
export const apagarAvatar3d = (id) => tx(['fichas', 'dados'], 'readwrite', (f, d) => { f.delete(id); d.delete(id); });
