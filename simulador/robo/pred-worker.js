// previsão curta fora da tela: recebe uma cópia da física, simula o próximo meio segundo e devolve o que vai acontecer.
// fica num Worker para a simulação nunca travar a tela nem os controles. mesma conta do roRun em index.html
import RAPIER from './vendor/libs/rapier.es.js';
const pronto = RAPIER.init();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), D2R = Math.PI / 180, R2D = 180 / Math.PI;
// quaternions em [x,y,z,w], sem criar objeto dentro do laço
const mul = (a, b, o) => { const [ax, ay, az, aw] = a, bx = b[0], by = b[1], bz = b[2], bw = b[3]; o[0] = aw * bx + ax * bw + ay * bz - az * by; o[1] = aw * by - ax * bz + ay * bw + az * bx; o[2] = aw * bz + ax * by - ay * bx + az * bw; o[3] = aw * bw - ax * bx - ay * by - az * bz; return o; };
const giro = (q, v, o) => { const [x, y, z, w] = q, [a, b, c] = v, tx = 2 * (y * c - z * b), ty = 2 * (z * a - x * c), tz = 2 * (x * b - y * a); o[0] = a + w * tx + y * tz - z * ty; o[1] = b + w * ty + z * tx - x * tz; o[2] = c + w * tz + x * ty - y * tx; return o; };
const qa = [0, 0, 0, 1], qb = [0, 0, 0, 1], qr = [0, 0, 0, 1], qt = [0, 0, 0, 1], ax = [0, 0, 0], up = [0, 0, 0];
const ler = (r, q) => { const t = r.rotation(); q[0] = t.x; q[1] = t.y; q[2] = t.z; q[3] = t.w; return q; };
function angulo(l) {
  ler(l.prb, qa); qa[0] = -qa[0]; qa[1] = -qa[1]; qa[2] = -qa[2]; ler(l.rb, qb);
  mul(l.qi, qa, qt); mul(qt, qb, qr);
  let th = 2 * Math.atan2(qr[0] * l.axis[0] + qr[1] * l.axis[1] + qr[2] * l.axis[2], qr[3]);
  if (th > Math.PI) th -= 2 * Math.PI; if (th < -Math.PI) th += 2 * Math.PI; return th;
}
function prever(d) {
  const t0 = performance.now(), w = RAPIER.World.restoreSnapshot(d.snap), h = 1 / d.hz, n = Math.round(d.hor * d.hz); w.timestep = h; w.numSolverIterations = 6;
  const L = d.links.map(l => ({ ...l, rb: w.getRigidBody(l.rb), prb: w.getRigidBody(l.prb), pk: 0, sat: 0 })), body = w.getRigidBody(d.body), P = d.phys, nj = d.nj, Hn = d.hist.length / nj | 0;
  let tilt0 = 0, tiltMax = 0, tiltEnd = 0, fell = false;
  for (let i = 0; i <= n; i++) {
    const t = i * h;
    if (i % 10 === 0 || i === n) { giro(ler(body, qt), [0, 1, 0], up); const a = Math.acos(clamp(up[1], -1, 1)) * R2D; if (i === 0) tilt0 = a; tiltMax = Math.max(tiltMax, a); tiltEnd = a; if (up[1] < .5) fell = true; }
    if (i === n) break;
    // repete o último ciclo da marcha; parado, segura o último comando
    let base = -1; if (d.per && Hn) { const idx = Hn - 1 - Math.round(Math.max(d.per - t, 0) * 60); if (idx >= 0) base = idx * nj; }
    for (const l of L) {
      const th = angulo(l); giro(ler(l.rb, qb), l.axis, ax); const wc = l.rb.angvel(), wp = l.prb.angvel(), om = (wc.x - wp.x) * ax[0] + (wc.y - wp.y) * ax[1] + (wc.z - wp.z) * ax[2];
      const tg = base >= 0 ? d.hist[base + l.n] : d.act[l.n], er = tg * D2R - th; l.ie = clamp(l.ie + er * h, -.3, .3);
      const raw = l.g * (P.kp * er - P.kd * om) + (P.ki || 0) * l.ie, lim = raw * om > 0 ? l.lim0 * Math.max(0, 1 - Math.abs(om) / (l.speed * D2R)) : l.lim0, tq = clamp(raw, -lim, lim), tau = tq * h;
      if (Math.abs(raw) >= lim) l.sat += h; l.pk = Math.max(l.pk, Math.abs(tq) / l.lim0);
      l.rb.applyTorqueImpulse({ x: ax[0] * tau, y: ax[1] * tau, z: ax[2] * tau }, true); l.prb.applyTorqueImpulse({ x: -ax[0] * tau, y: -ax[1] * tau, z: -ax[2] * tau }, true);
    }
    w.step();
  }
  let pior = null; for (const l of L) if (!pior || l.sat > pior.sat) pior = l;
  w.free();
  return { id: d.id, risk: fell ? 1 : clamp((tiltMax - Math.max(25, tilt0 + 8)) / 25, 0, .95), fell, tilt0, tiltMax, tiltEnd, sat: pior ? pior.sat / d.hor : 0, n: pior ? pior.n : -1, ms: performance.now() - t0 };
}
self.onmessage = async (e) => { await pronto; try { postMessage(prever(e.data)); } catch (err) { postMessage({ id: e.data.id, erro: String(err) }); } };
postMessage({ ola: 1 });
