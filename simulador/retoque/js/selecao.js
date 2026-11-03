// A seleção é um canal: um byte por pixel da imagem. Desenhar, varinha, suavizar e crescer só mudam esse canal.
import { novoCanvas, ctx2d, selParaCanvas } from './nucleo.js';

export function deCaminho(w, h, desenhar) {
  const g = ctx2d(novoCanvas(w, h));
  g.fillStyle = '#000'; g.beginPath(); desenhar(g); g.fill();
  const d = g.getImageData(0, 0, w, h).data, s = new Uint8Array(w * h);
  for (let i = 0; i < s.length; i++) s[i] = d[i * 4 + 3];
  return s;
}
export function retangulo(w, h, x0, y0, x1, y1) {
  const s = new Uint8Array(w * h), ax = Math.max(0, Math.round(Math.min(x0, x1))), bx = Math.min(w, Math.round(Math.max(x0, x1))), ay = Math.max(0, Math.round(Math.min(y0, y1))), by = Math.min(h, Math.round(Math.max(y0, y1)));
  for (let y = ay; y < by; y++) s.fill(255, y * w + ax, y * w + bx);
  return s;
}
export const elipse = (w, h, x0, y0, x1, y1) => deCaminho(w, h, g => g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2));
export const laco = (w, h, pts) => deCaminho(w, h, g => { pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); });

export function combinar(a, b, modo) {
  if (modo === 'trocar' || !a) return modo === 'subtrair' ? null : b;
  const n = new Uint8Array(a.length);
  for (let i = 0; i < n.length; i++) n[i] = modo === 'somar' ? Math.max(a[i], b[i]) : modo === 'subtrair' ? Math.min(a[i], 255 - b[i]) : Math.min(a[i], b[i]);
  return n;
}
export const vazia = s => !s || !s.some(v => v);
export function inverter(s, n) { const r = new Uint8Array(n); if (!s) return r.fill(255); for (let i = 0; i < n; i++) r[i] = 255 - s[i]; return r; }
export function caixa(s, w, h) {
  let ax = w, ay = h, bx = -1, by = -1;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) if (s[i]) { if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; }
  return bx < 0 ? null : { x: ax, y: ay, w: bx - ax + 1, h: by - ay + 1 };
}
export function deslocar(s, w, h, dx, dy) {
  const n = new Uint8Array(w * h);
  for (let y = Math.max(0, -dy); y < Math.min(h, h - dy); y++) for (let x = Math.max(0, -dx); x < Math.min(w, w - dx); x++) n[(y + dy) * w + x + dx] = s[y * w + x];
  return n;
}
export function suavizar(s, w, h, raio) {
  const c = novoCanvas(w, h), g = ctx2d(c);
  g.filter = `blur(${raio}px)`; g.drawImage(selParaCanvas(s, w, h), 0, 0); g.filter = 'none';
  const d = g.getImageData(0, 0, w, h).data, n = new Uint8Array(w * h);
  for (let i = 0; i < n.length; i++) n[i] = d[i * 4 + 3];
  return n;
}
// distância até a borda, em duas passadas (aproximação 3-4 da distância real)
function distancia(dentro, w, h) {
  const D = new Float32Array(w * h), F = 1e9;
  for (let i = 0; i < D.length; i++) D[i] = dentro[i] ? 0 : F;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) { if (!D[i]) continue; let v = D[i]; if (x) v = Math.min(v, D[i - 1] + 1); if (y) { v = Math.min(v, D[i - w] + 1); if (x) v = Math.min(v, D[i - w - 1] + 1.4142); if (x < w - 1) v = Math.min(v, D[i - w + 1] + 1.4142); } D[i] = v; }
  for (let y = h - 1, i = D.length - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--, i--) { if (!D[i]) continue; let v = D[i]; if (x < w - 1) v = Math.min(v, D[i + 1] + 1); if (y < h - 1) { v = Math.min(v, D[i + w] + 1); if (x < w - 1) v = Math.min(v, D[i + w + 1] + 1.4142); if (x) v = Math.min(v, D[i + w - 1] + 1.4142); } D[i] = v; }
  return D;
}
export function crescer(s, w, h, raio) {
  const dentro = new Uint8Array(w * h);
  for (let i = 0; i < dentro.length; i++) dentro[i] = s[i] >= 128;
  const D = distancia(dentro, w, h), n = new Uint8Array(w * h);
  for (let i = 0; i < n.length; i++) n[i] = D[i] <= raio ? 255 : 0;
  return n;
}
export const encolher = (s, w, h, raio) => inverter(crescer(inverter(s, w * h), w, h, raio), w * h);

// varinha e balde: região parecida com a cor do ponto, ligada a ele ou na imagem toda
export function regiaoSimilar(d, w, h, x, y, tol, contiguo) {
  const s = new Uint8Array(w * h);
  if (x < 0 || y < 0 || x >= w || y >= h) return s;
  const i0 = (y * w + x) * 4, r = d[i0], g = d[i0 + 1], b = d[i0 + 2], a = d[i0 + 3];
  const parece = p => { const i = p * 4; return Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol && Math.abs(d[i + 3] - a) <= tol; };
  if (!contiguo) { for (let p = 0; p < s.length; p++) if (parece(p)) s[p] = 255; return s; }
  const pilha = [y * w + x];
  s[pilha[0]] = 255;
  while (pilha.length) {
    const p = pilha.pop(), px = p % w;
    if (px > 0 && !s[p - 1] && parece(p - 1)) { s[p - 1] = 255; pilha.push(p - 1); }
    if (px < w - 1 && !s[p + 1] && parece(p + 1)) { s[p + 1] = 255; pilha.push(p + 1); }
    if (p >= w && !s[p - w] && parece(p - w)) { s[p - w] = 255; pilha.push(p - w); }
    if (p < s.length - w && !s[p + w] && parece(p + w)) { s[p + w] = 255; pilha.push(p + w); }
  }
  return s;
}
// o contorno das formigas: segmentos na fronteira do canal, unidos em trechos retos
export function contorno(s, w, h) {
  const p = new Path2D(), dentro = i => s[i] >= 128;
  for (let y = 0; y <= h; y++) {
    let ini = -1;
    for (let x = 0; x <= w; x++) {
      const borda = x < w && (y < h && dentro(y * w + x)) !== (y > 0 && dentro((y - 1) * w + x));
      if (borda && ini < 0) ini = x;
      if (!borda && ini >= 0) { p.moveTo(ini, y); p.lineTo(x, y); ini = -1; }
    }
  }
  for (let x = 0; x <= w; x++) {
    let ini = -1;
    for (let y = 0; y <= h; y++) {
      const borda = y < h && (x < w && dentro(y * w + x)) !== (x > 0 && dentro(y * w + x - 1));
      if (borda && ini < 0) ini = y;
      if (!borda && ini >= 0) { p.moveTo(x, ini); p.lineTo(x, y); ini = -1; }
    }
  }
  return p;
}
