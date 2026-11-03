/*! fflate
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const ne = (n, e, t) => {
  (typeof n != "number" || !Number.isFinite(n)) && t.push(`${e}: expected a finite number`);
}, Le = (n, e, t) => {
  ne(n, e, t), typeof n == "number" && n <= 0 && t.push(`${e}: must be positive`);
}, we = (n, e, t) => {
  Le(n, e, t), typeof n == "number" && !Number.isInteger(n) && t.push(`${e}: expected an integer`);
}, Ie = (n, e, t) => {
  ne(n, e, t), typeof n == "number" && !Number.isInteger(n) && t.push(`${e}: expected an integer`);
}, jt = (n, e, t) => {
  (typeof n != "string" || !n.trim()) && t.push(`${e}: expected a non-empty string`);
}, ge = (n, e = 0, t = 1 / 0) => (r, a, s) => {
  if (!Array.isArray(r)) {
    s.push(`${a}: expected an array`);
    return;
  }
  (r.length < e || r.length > t) && s.push(`${a}: expected ${e}..${t} items`), r.forEach((l, f) => n(l, `${a}[${f}]`, s));
}, ye = ge(ne, 2, 2), ue = (n, e, t) => {
  ye(n, e, t), Array.isArray(n) && n.length === 2 && n[0] >= n[1] && t.push(`${e}: start must be less than end`);
}, oe = (n, e = []) => (t, r, a) => {
  if (!t || typeof t != "object" || Array.isArray(t)) {
    a.push(`${r}: expected an object`);
    return;
  }
  const s = t;
  for (const [l, f] of Object.entries(n))
    s[l] === void 0 && e.includes(l) || f(s[l], `${r}.${l}`, a);
}, Ce = { cx: ne, cy: ne, rx: Le, ry: Le }, ve = oe(Ce), We = ge(ye, 3), It = ge(ye, 2), nt = (n, e, t) => {
  ne(n, e, t), typeof n == "number" && (n < 0 || n > 1) && t.push(`${e}: must be between 0 and 1`);
}, bn = (n) => oe({
  version: (e, t, r) => {
    e !== 1 && r.push(`${t}: only version 1 is supported`);
  },
  image: oe({ width: we, height: we }),
  head: oe({
    ...Ce,
    shiftX: ne,
    shiftY: ne,
    pivotX: ne,
    pivotY: ne,
    maxRoll: ne,
    weightBand: ue,
    turnBand: ue
  }),
  body: oe({
    pivotX: ne,
    pivotY: ne,
    maxRoll: ne,
    breathBand: ue,
    rollBand: ue,
    chest: ve,
    shoulders: ge(ve)
  }),
  face: oe({
    nose: ve,
    mouth: ve,
    eyeA: ve,
    eyeB: ve,
    earL: ve,
    earR: ve,
    brow: oe({ ...Ce, band: ue }),
    jaw: oe({ ...Ce, band: ue })
  }),
  buns: oe({ bunL: ve, bunR: ve }, ["bunL", "bunR"]),
  eyes: ge(oe({
    opening: We,
    roi: We,
    x0: ne,
    x1: ne,
    top: ge(ne, 24, 24),
    bot: ge(ne, 24, 24)
  }, n ? ["x0", "x1", "top", "bot"] : []), 2, 2),
  mouth: oe({
    cx: ne,
    cy: ne,
    angle: ne,
    halfLen: Le,
    bow: ne,
    area: oe({ ...Ce, angle: ne })
  }),
  cheeks: ge(ye, 2, 2),
  strands: ge(oe({ name: jt, nodes: It, sigma: Le, k: Le, max: Le })),
  accessories: ge(oe({
    name: jt,
    pivot: ye,
    tip: ye,
    split: nt,
    box: ge(Ie, 4, 4),
    color: oe({ redness: nt, minRed: ne })
  })),
  hand: oe({
    outline: We,
    jaw: It,
    jawRange: ue,
    background: We,
    elbow: ye,
    wrist: ye,
    knuckle: ye,
    contact: ye,
    forearmShare: nt,
    armBand: ue,
    wristBand: ue,
    handBand: ue,
    fingerXBand: ue,
    fingerYBand: ue,
    pinBand: ue
  }),
  mesh: oe({
    baseCell: we,
    fine: oe({
      x0: Ie,
      x1: Ie,
      y0: Ie,
      y1: Ie,
      cell: we
    }),
    handCell: we,
    tasselCell: we,
    eyeBallCell: we,
    eyeCell: we,
    spriteCell: we
  }),
  view: oe({ padTop: ne, padSide: ne, gazeCenter: ye }, ["gazeCenter"])
}, ["buns", "strands", "accessories", "hand"]);
function en(n, e = {}) {
  const t = [];
  if (bn(e.draft ?? !1)(n, "rig", t), t.length) return t;
  const r = n;
  r.eyes.forEach((a, s) => {
    const l = ["x0", "x1", "top", "bot"];
    if (!(e.draft && l.every((f) => a[f] === void 0))) {
      if (l.some((f) => a[f] === void 0)) {
        t.push(`rig.eyes[${s}]: supply all x0/x1/top/bot fields or omit all in a draft`);
        return;
      }
      a.x0 >= a.x1 && t.push(`rig.eyes[${s}].x1: must exceed x0`), a.top.some((f, y) => f > a.bot[y]) && t.push(`rig.eyes[${s}].top: must not exceed bottom curve`);
    }
  }), (r.mesh.fine.x0 >= r.mesh.fine.x1 || r.mesh.fine.y0 >= r.mesh.fine.y1) && t.push("rig.mesh.fine: rectangle must have positive area"), (r.view.padTop <= -1 || r.view.padTop >= 1 || r.view.padSide <= -0.5) && t.push("rig.view: margins must leave a positive viewport");
  for (const [a, s] of (r.strands ?? []).entries())
    s.nodes.some((l, f) => f > 0 && l[0] === s.nodes[f - 1][0] && l[1] === s.nodes[f - 1][1]) && t.push(`rig.strands[${a}].nodes: consecutive nodes must differ`);
  for (const [a, s] of (r.accessories ?? []).entries())
    (s.box[0] < 0 || s.box[1] < 0 || s.box[2] > r.image.width || s.box[3] > r.image.height) && t.push(`rig.accessories[${a}].box: rectangle must stay inside the image`), (s.split <= 0 || s.split >= 1) && t.push(`rig.accessories[${a}].split: must be strictly between 0 and 1`), s.pivot.every((l, f) => l === s.tip[f]) && t.push(`rig.accessories[${a}].tip: must differ from pivot`), (s.box[0] >= s.box[2] || s.box[1] >= s.box[3]) && t.push(`rig.accessories[${a}].box: rectangle must have positive area`);
  return t;
}
function Et(n) {
  const e = en(n);
  if (e.length) throw new Error(`Invalid rig:
${e.join(`
`)}`);
  return structuredClone(n);
}
const Ge = [
  { id: "angleX", label: "Face angle X", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleY", label: "Face angle Y", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleZ", label: "Face roll", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "bodyAngleX", label: "Body angle X", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "bodyAngleZ", label: "Body roll", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "breath", label: "Breath", min: 0, max: 1, def: 0, group: "Head and body" },
  { id: "eyeLOpen", label: "Left eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeROpen", label: "Right eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeSmile", label: "Eye smile", min: 0, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeX", label: "Gaze X", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeY", label: "Gaze Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browY", label: "Brow Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browAngle", label: "Brow angle", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "mouthOpen", label: "Mouth open", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "mouthForm", label: "Mouth form (i to o)", min: -1, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "blush", label: "Blush", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "armAngle", label: "Arm angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "handAngle", label: "Wrist angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "fingerTap", label: "Finger tap", min: 0, max: 1, def: 0, group: "Hand" }
];
function xn(n) {
  const e = { w: n.image.width, h: n.image.height }, t = (x, M, T) => T ? Math.exp(-(((x - T.cx) / T.rx) ** 2 + ((M - T.cy) / T.ry) ** 2)) : 0, r = 24, a = n.eyes;
  function s(x, M) {
    const T = Math.min(1, Math.max(0, M)) * (r - 1), _ = Math.min(Math.floor(T), r - 2), Y = T - _;
    return x[_] + (x[_ + 1] - x[_]) * Y;
  }
  function l(x, M, T, _) {
    M = Math.min(1, Math.max(0, M));
    const Y = s(x.top, M), X = s(x.bot, M), F = 1 - T, C = 4 * M * (1 - M), Z = s(x.bot, 0.5) - s(x.top, 0.5), E = x.top[0] + (x.top[r - 1] - x.top[0]) * M - 0.3 * Z * C, R = Math.max(Y, X + 1 + (E - X - 1) * _);
    return [(R - Y) * Math.max(F, -0.07), F > 0 ? (R - X) * F * _ : 0];
  }
  const f = [[-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1]], y = 5;
  function d(x, M, T, _) {
    let Y = 0, X = 0;
    for (const [E, R] of f) {
      const [J, te] = l(x, (M + E * y - x.x0) / (x.x1 - x.x0), T, _);
      Y += J * R / 9, X += te * R / 9;
    }
    const F = Math.min(1, Math.max(0, (M - x.x0) / (x.x1 - x.x0))), C = s(x.top, F), Z = s(x.bot, F);
    return { top: C, bot: Z, b: 1 - T, lid: C + Y, bc: Z + X };
  }
  function m(x, M, T, _, Y, X) {
    const F = d(x, T, Y, X);
    return M === "lash" ? F.lid - (F.top - _) * (1 - 0.3 * Math.min(1, Math.max(0, F.b))) : M === "low" ? _ + (F.bc - F.bot) : M === "crease" ? _ + (F.lid - F.top) * 0.22 : _;
  }
  function c(x, M, T) {
    const _ = Math.min(1, Math.max(0, 1 - M));
    return x === "low" ? 1 - Math.min(1, _ * T * 1.2) : x === "crease" ? 1 - 0.45 * _ : 1;
  }
  const p = n.mouth, b = n.cheeks, v = n.head, h = n.body, u = (x, M, T) => {
    const _ = Math.min(1, Math.max(0, (T - x) / (M - x)));
    return _ * _ * (3 - 2 * _);
  };
  function w(x, M) {
    return 1 - u(...v.weightBand, M);
  }
  function o(x, M) {
    return 1 - u(...v.turnBand, M);
  }
  const i = n.strands ?? [];
  function S(x, M, T) {
    let _ = 1 / 0, Y = 0;
    const X = T.length - 1;
    for (let F = 0; F < X; F++) {
      const [C, Z] = T[F], [E, R] = T[F + 1], J = E - C, te = R - Z, ee = Math.min(1, Math.max(0, ((x - C) * J + (M - Z) * te) / (J * J + te * te))), se = Math.hypot(x - C - J * ee, M - Z - te * ee);
      se < _ && (_ = se, Y = (F + ee) / X);
    }
    return [_, Y];
  }
  function g(x, M, T) {
    if (T < 0.02) return [];
    const _ = [];
    let Y = 0;
    i.forEach((F, C) => {
      const [Z, E] = S(x, M, F.nodes), R = Math.exp(-((Z / F.sigma) ** 2));
      R < 0.02 || (_.push([C, R, E]), Y += R);
    });
    const X = Math.max(1, Y);
    return _.map(([F, C, Z]) => [F, T * C / X * u(0.04, 0.55, Z), Z]);
  }
  function A(x, M, T = 1) {
    return {
      head: w(x, M),
      turn: o(x, M),
      strands: g(x, M, T),
      bunL: t(x, M, n.buns?.bunL),
      bunR: t(x, M, n.buns?.bunR),
      brow: t(x, M, n.face.brow) * (1 - u(...n.face.brow.band, M)),
      // chin below the mouth line drops a little when the mouth opens
      jaw: t(x, M, n.face.jaw) * u(...n.face.jaw.band, M),
      // per-feature depth for head turns (nose sticks out most, ears sit at the back)
      nose: t(x, M, n.face.nose),
      mouth: t(x, M, n.face.mouth),
      eyeA: t(x, M, n.face.eyeA),
      eyeB: t(x, M, n.face.eyeB),
      earR: t(x, M, n.face.earR),
      earL: t(x, M, n.face.earL),
      chest: t(x, M, h.chest),
      breath: 1 - u(...h.breathBand, M),
      shoulder: h.shoulders.reduce((_, Y) => _ + t(x, M, Y), 0)
    };
  }
  function L(x, M, T, _) {
    const Y = (x - v.cx) / v.rx, X = (M - v.cy) / v.ry, F = 1 - Y * Y - X * X;
    if (F <= 0) return [0, 0];
    const C = u(0, 0.84, F);
    return [T * v.shiftX * C, -_ * v.shiftY * C];
  }
  function B(x, M, T, _) {
    const Y = Math.cos(_), X = Math.sin(_), F = x[0] - M, C = x[1] - T;
    x[0] = M + F * Y - C * X, x[1] = T + F * X + C * Y;
  }
  function j(x, M, T, _ = M) {
    const Y = L(x[0], x[1], T.angleX / 30, T.angleY / 30);
    x[0] += Y[0] * _, x[1] += Y[1] * _, !(M <= 0) && B(x, v.pivotX, v.pivotY, -T.angleZ / 30 * v.maxRoll * M);
  }
  function k(x, M, T, _ = 0, Y = 1, X = 0) {
    const F = T.breath;
    x[1] -= F * (5 * Y + 4 * X), x[0] += (x[0] - h.chest.cx) * 0.012 * F * _, x[0] += T.bodyAngleX / 10 * (7 + 9 * _), B(x, h.pivotX, h.pivotY, -T.bodyAngleZ / 10 * h.maxRoll * (1 - u(...h.rollBand, M)));
  }
  function U(x, M, T, _, Y, X) {
    const F = X;
    F[0] = x, F[1] = M;
    const C = Y.gain;
    for (const [R, J, te] of T.strands) {
      const ee = Y.strands?.[R];
      if (!ee) continue;
      const se = te * 3, le = Math.min(2, Math.floor(se)), ce = se - le;
      F[0] += (ee[le][0] + (ee[le + 1][0] - ee[le][0]) * ce) * J * C, F[1] += (ee[le][1] + (ee[le + 1][1] - ee[le][1]) * ce) * J * C;
    }
    if (F[0] += (Y.bunL[0] * T.bunL + Y.bunR[0] * T.bunR) * C, F[1] += (Y.bunL[1] * T.bunL + Y.bunR[1] * T.bunR) * C, F[1] -= _.browY * 7 * T.brow, T.brow > 0.01) {
      const R = _.browAngle * 0.12 * T.brow;
      F[1] += (x - n.face.brow.cx) * Math.sin(R);
    }
    F[1] += _.mouthOpen * 3.5 * T.jaw;
    const Z = _.angleX / 30, E = _.angleY / 30;
    return F[0] += Z * (8 * T.nose + 5 * T.mouth) + (x - n.face.eyeA.cx) * 0.12 * Z * T.eyeA - (x - n.face.eyeB.cx) * 0.12 * Z * T.eyeB - Z * 9 * T.earR + Z * 4 * T.earL - Z * 10 * (T.bunL + T.bunR), F[1] -= E * (6 * T.nose + 3 * T.mouth), F[1] += (M - n.face.eyeA.cy) * -0.06 * Math.abs(E) * T.eyeA + (M - n.face.eyeB.cy) * -0.06 * Math.abs(E) * T.eyeB, j(F, T.head, _, T.turn), k(F, M, _, T.chest, T.breath, T.shoulder), F;
  }
  const O = n.hand, $ = O?.elbow ?? [0, 0], D = O?.wrist ?? [0, 0], q = O?.knuckle ?? [0, 0], N = O?.contact ?? [0, 0], P = O?.forearmShare ?? 0;
  function H(x, M) {
    return O ? {
      arm: 1 - u(...O.armBand, M),
      wrist: 1 - u(...O.wristBand, M),
      hand: 1 - u(...O.handBand, M),
      finger: u(...O.fingerXBand, x) * (1 - u(...O.fingerYBand, M)),
      pinBottom: u(...O.pinBand, M)
    } : { arm: 0, wrist: 0, hand: 0, finger: 0, pinBottom: 0 };
  }
  const G = (x, M, T, _) => {
    const Y = x[0] - M[0], X = x[1] - M[1];
    return [M[0] + Y * T - X * _, M[1] + Y * _ + X * T];
  }, z = (x) => Math.atan2(x[1], x[0]);
  function W(x) {
    const M = [...N];
    j(M, w(...N), x, o(...N)), k(M, N[1], x, 0, 1, 0);
    const T = [...$];
    k(T, $[1], x, 0, 0, 0);
    const Y = (z([M[0] - T[0], M[1] - T[1]]) - z([N[0] - $[0], N[1] - $[1]])) * P, X = Math.cos(Y), F = Math.sin(Y), C = (te) => {
      const ee = G(te, $, X, F);
      return [ee[0] + T[0] - $[0], ee[1] + T[1] - $[1]];
    }, Z = C(D), E = C(N), R = z([M[0] - Z[0], M[1] - Z[1]]) - z([E[0] - Z[0], E[1] - Z[1]]), J = Math.min(1.03, Math.max(0.97, Math.hypot(M[0] - Z[0], M[1] - Z[1]) / Math.hypot(E[0] - Z[0], E[1] - Z[1])));
    return { tr: C, w: Z, b: R, k: J };
  }
  function I(x, M, T, _, Y, X) {
    let F = [x, M];
    F = G(F, q, Math.cos(_.fingerTap * 0.07 * T.finger), Math.sin(_.fingerTap * 0.07 * T.finger));
    const C = -_.handAngle / 10 * 0.045 * T.wrist, Z = -_.armAngle / 10 * 0.015 * T.arm;
    F = G(F, D, Math.cos(C), Math.sin(C)), F = G(F, $, Math.cos(Z), Math.sin(Z)), F = Y.tr(F);
    const E = Y.b * T.hand, R = 1 + (Y.k - 1) * T.hand;
    return F = G(F, Y.w, Math.cos(E) * R, Math.sin(E) * R), F[1] += (M - F[1]) * T.pinBottom, X[0] = F[0], X[1] = F[1], X;
  }
  const V = n.accessories ?? [];
  function K(x, M, T, _) {
    const Y = A(x.pivot[0], x.pivot[1]);
    return U(x.pivot[0], x.pivot[1], Y, M, T, _);
  }
  return { IMG: e, EYES: a, MOUTH: p, CHEEKS: b, STRANDS: i, TASSELS: V, headWeight: w, turnWeight: o, baseWeights: A, deformBase: U, applyHead: j, applyBody: k, handWeights: H, handFrame: W, deformHand: I, eyePartY: m, eyePartAlpha: c, tasselAnchor: K };
}
function wn(n, e, t, r = !1) {
  const a = r ? Math.max(e, t) * 2 : 1, s = new Float32Array(n.length), l = Math.SQRT2;
  for (let f = 0; f < t; f++) for (let y = 0; y < e; y++) {
    const d = f * e + y;
    n[d] <= 3 || (s[d] = Math.min(
      y ? s[d - 1] + 1 : a,
      f ? s[d - e] + 1 : a,
      y && f ? s[d - e - 1] + l : a,
      f && y + 1 < e ? s[d - e + 1] + l : a
    ));
  }
  for (let f = t - 1; f >= 0; f--) for (let y = e - 1; y >= 0; y--) {
    const d = f * e + y;
    !n[d] || n[d] <= 3 || (s[d] = Math.min(
      s[d],
      y + 1 < e ? s[d + 1] + 1 : a,
      f + 1 < t ? s[d + e] + 1 : a,
      y && f + 1 < t ? s[d + e - 1] + l : a,
      y + 1 < e && f + 1 < t ? s[d + e + 1] + l : a
    ));
  }
  return s;
}
function rt(n, e, t) {
  return Math.exp(-(((n - t.cx) / t.rx) ** 2 + ((e - t.cy) / t.ry) ** 2));
}
function An(n, e, t) {
  const r = ((n - t.head.cx) / t.head.rx) ** 2 + ((e - t.head.cy) / t.head.ry) ** 2;
  let a = t.head.rx * 0.8 * Math.sqrt(Math.max(0, 1 - r)) + t.body.chest.rx * 0.23 * rt(n, e, t.body.chest);
  a += t.face.nose.rx * 0.2 * rt(n, e, t.face.nose);
  for (const [s, l] of t.cheeks) a += t.head.rx * 0.012 * rt(n, e, { cx: s, cy: l, rx: t.head.rx * 0.3, ry: t.head.ry * 0.16 });
  return a;
}
function Ke(n, e, t, r) {
  const a = new Float32Array(n.length), s = new Float32Array(n.length), l = (f, y, d, m, c, p) => {
    for (let b = 0; b < m; b++) {
      const v = b * p;
      let h = 0, u = 0;
      for (let w = 0; w < Math.min(r, d - 1) + 1; w++)
        h += f[v + w * c], u++;
      for (let w = 0; w < d; w++) {
        y[v + w * c] = h / u;
        const o = w + r + 1, i = w - r;
        o < d && (h += f[v + o * c], u++), i >= 0 && (h -= f[v + i * c], u--);
      }
    }
  };
  return l(n, a, e, t, 1, e), l(a, s, t, e, e, 1), s;
}
function Mn(n, e, t, r) {
  const a = Ke(n, t, r, 1), s = Ke(n, t, r, 6), l = new Float32Array(n.length);
  for (let d = 0; d < l.length; d++) l[d] = e[d] > 128 ? a[d] - s[d] : 0;
  const f = new Float32Array(n.length * 2), y = (d, m) => l[Math.max(0, Math.min(r - 1, m)) * t + Math.max(0, Math.min(t - 1, d))];
  for (let d = 0; d < r; d++) for (let m = 0; m < t; m++) {
    const c = d * t + m;
    e[c] <= 128 || (f[2 * c] = Math.max(-1, Math.min(1, -(y(m + 1, d) - y(m - 1, d)) * 4)), f[2 * c + 1] = Math.max(-1, Math.min(1, -(y(m, d + 1) - y(m, d - 1)) * 4)));
  }
  return f;
}
function En(n, e, t, r, a, s = !0, l) {
  const f = !!a && r[0] === 0 && r[1] === 0 && r[2] === a.image.width && r[3] === a.image.height, y = wn(n, e, t, f), d = new Float32Array(n.length), m = r[2] / e, c = r[3] / t, p = Math.min(m, c), b = Math.min(r[2], r[3]) * 0.08;
  for (let o = 0; o < t; o++) for (let i = 0; i < e; i++) {
    const S = o * e + i;
    d[S] = (s ? Math.sqrt(y[S] * p * b) * 0.55 : 0) + (a ? An(r[0] + (i + 0.5) * m, r[1] + (o + 0.5) * c, a) : 0);
  }
  const v = Math.max(1, Math.round(Math.min(e, t) * 0.02));
  d.set(Ke(Ke(d, e, t, v), e, t, v));
  const h = l ? Mn(l, n, e, t) : null, u = new Uint8Array(e * t * 4), w = (o, i) => d[Math.max(0, Math.min(t - 1, i)) * e + Math.max(0, Math.min(e - 1, o))];
  for (let o = 0; o < t; o++) for (let i = 0; i < e; i++) {
    const S = -(w(i + 2, o) - w(i - 2, o)) / (4 * m), g = -(w(i, o + 2) - w(i, o - 2)) / (4 * c), A = Math.hypot(S, g, 1), L = (o * e + i) * 4, B = o * e + i;
    u[L] = Math.round((S / A * 0.5 + 0.5) * 255), u[L + 1] = Math.round((g / A * 0.5 + 0.5) * 255), u[L + 2] = Math.round(((h?.[2 * B] ?? 0) * 0.5 + 0.5) * 255), u[L + 3] = Math.round(((h?.[2 * B + 1] ?? 0) * 0.5 + 0.5) * 255);
  }
  return u;
}
const Nt = /* @__PURE__ */ new WeakMap();
function Sn(n, e, t, r) {
  const a = JSON.stringify([e, t.head, t.body.chest, t.face.nose, t.cheeks, r]), s = Nt.get(n);
  if (s?.key === a) return { ...s, computed: !1, ms: 0 };
  const l = performance.now(), f = Math.min(1, 512 / Math.max(n.width, n.height)), y = Math.max(1, Math.round(n.width * f)), d = Math.max(1, Math.round(n.height * f)), m = document.createElement("canvas");
  m.width = y, m.height = d;
  const c = m.getContext("2d", { willReadFrequently: !0 });
  c.drawImage(n, 0, 0, y, d);
  const p = c.getImageData(0, 0, y, d).data, b = new Uint8Array(y * d), v = new Float32Array(y * d);
  for (let u = 0; u < b.length; u++)
    b[u] = p[4 * u + 3], v[u] = (0.2126 * p[4 * u] + 0.7152 * p[4 * u + 1] + 0.0722 * p[4 * u + 2]) / 255;
  const h = { key: a, data: En(b, y, d, e, t, r, r ? v : void 0), width: y, height: d };
  return Nt.set(n, h), { ...h, computed: !0, ms: performance.now() - l };
}
const Ue = Object.freeze({
  enabled: !1,
  x: 0.2,
  y: 0.2,
  z: 0.45,
  color: 16777215,
  strength: 0.8,
  intensity: 0.8,
  ambient: 0.4,
  mode: "soft",
  shadow: !1,
  reach: 1.2,
  ambientColor: 15659256,
  softness: 0.45,
  specular: 0.12,
  rim: 0.3,
  detail: 0.4
}), Xt = {
  x: [0, 1],
  y: [0, 1],
  z: [0.1, 2],
  color: [0, 16777215],
  strength: [0, 1],
  intensity: [0, 2],
  ambient: [0, 1],
  reach: [0.2, 3],
  ambientColor: [0, 16777215],
  softness: [0, 1],
  specular: [0, 1],
  rim: [0, 1],
  detail: [0, 1]
}, Tn = /* @__PURE__ */ new Set(["color", "ambientColor"]);
function On(n) {
  if (!n || typeof n != "object" || Array.isArray(n)) return null;
  const e = n;
  if (Object.keys(e).length !== Object.keys(Ue).length || Object.keys(e).some((r) => !(r in Ue)) || ![!0, !1].includes(e.enabled) || ![!0, !1].includes(e.shadow) || !["soft", "cel"].includes(e.mode)) return null;
  const t = { ...Ue, enabled: e.enabled, shadow: e.shadow, mode: e.mode };
  for (const r of Object.keys(Xt)) {
    const a = e[r], [s, l] = Xt[r];
    if (typeof a != "number" || !Number.isFinite(a) || Tn.has(r) && !Number.isInteger(a)) return null;
    t[r] = Math.max(s, Math.min(l, a));
  }
  return t;
}
function Ur(n) {
  return `#${n.toString(16).padStart(6, "0")}`;
}
const Ve = -0.1, Rn = 0.9, Ln = 1, _n = 1.06;
function kn(n, e) {
  return [(0.5 - n) * 0.12, (0.5 - e) * 0.12];
}
function Fn(n, e, t, r) {
  const a = n * Math.PI / 180, s = e * Math.PI / 180, l = -t / 30 * r, f = Math.cos(a), y = Math.sin(a), d = Math.cos(s), m = Math.sin(s), c = Math.cos(l), p = Math.sin(l);
  return [
    c * f,
    p * f,
    -y,
    c * y * m - p * d,
    p * y * m + c * d,
    f * m,
    c * y * d + p * m,
    p * y * d - c * m,
    f * d
  ];
}
class Bn {
  constructor(e, t) {
    this.gl = e, this.program = t(e, `#version 300 es
      out vec2 vUv;
      void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0, 1); }`, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o;
      uniform sampler2D uTex; uniform vec2 uStep; uniform vec2 uShift; uniform int uPass;
      float alphaAt(vec2 p) { if (any(lessThan(p, vec2(0))) || any(greaterThan(p, vec2(1)))) return 0.0; return texture(uTex, p).a; }
      void main() {
        if (uPass == 2) { o = texture(uTex, vUv); return; }
        vec2 p = vUv - uShift;
        float a = alphaAt(p) * 0.227027;
        a += (alphaAt(p + uStep * 1.384615) + alphaAt(p - uStep * 1.384615)) * 0.316216;
        a += (alphaAt(p + uStep * 3.230769) + alphaAt(p - uStep * 3.230769)) * 0.070270;
        o = uPass == 0 ? vec4(0, 0, 0, a) : vec4(vec3(0.035, 0.045, 0.065) * a * 0.28, a * 0.28);
      }`), this.vao = e.createVertexArray(), this.targets = [];
  }
  target(e, t) {
    const r = this.gl, a = r.createTexture(), s = r.createFramebuffer();
    if (r.bindTexture(r.TEXTURE_2D, a), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, e, t, 0, r.RGBA, r.UNSIGNED_BYTE, null), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MIN_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MAG_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_S, r.CLAMP_TO_EDGE), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_T, r.CLAMP_TO_EDGE), r.bindFramebuffer(r.FRAMEBUFFER, s), r.framebufferTexture2D(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0, r.TEXTURE_2D, a, 0), r.checkFramebufferStatus(r.FRAMEBUFFER) !== r.FRAMEBUFFER_COMPLETE) throw new Error("Shadow framebuffer unavailable");
    return { texture: a, framebuffer: s };
  }
  begin(e, t) {
    const r = this.gl;
    (this.width !== e || this.height !== t) && (this.clearTargets(), this.width = e, this.height = t, this.targets = [this.target(e, t), this.target(Math.ceil(e / 2), Math.ceil(t / 2))]), r.bindFramebuffer(r.FRAMEBUFFER, this.targets[0].framebuffer), r.viewport(0, 0, e, t), r.clearColor(0, 0, 0, 0), r.clear(r.COLOR_BUFFER_BIT);
  }
  composite(e) {
    const t = this.gl, { prog: r, u: a } = this.program, s = this.width, l = this.height;
    t.useProgram(r), t.bindVertexArray(this.vao), t.activeTexture(t.TEXTURE0), t.uniform1i(a.uTex, 0), t.disable(t.BLEND), t.bindFramebuffer(t.FRAMEBUFFER, this.targets[1].framebuffer), t.viewport(0, 0, Math.ceil(s / 2), Math.ceil(l / 2)), t.bindTexture(t.TEXTURE_2D, this.targets[0].texture), t.uniform1i(a.uPass, 0), t.uniform2f(a.uShift, 0, 0), t.uniform2f(a.uStep, 3 / s, 0), t.drawArrays(t.TRIANGLES, 0, 3), t.bindFramebuffer(t.FRAMEBUFFER, null), t.viewport(0, 0, s, l), t.clearColor(0, 0, 0, 0), t.clear(t.COLOR_BUFFER_BIT), t.enable(t.BLEND), t.bindTexture(t.TEXTURE_2D, this.targets[1].texture);
    const f = kn(e.x, e.y);
    t.uniform1i(a.uPass, 1), t.uniform2f(a.uShift, f[0], -f[1]), t.uniform2f(a.uStep, 0, 3 / l), t.drawArrays(t.TRIANGLES, 0, 3), t.bindTexture(t.TEXTURE_2D, this.targets[0].texture), t.uniform1i(a.uPass, 2), t.drawArrays(t.TRIANGLES, 0, 3), t.bindVertexArray(null);
  }
  clearTargets() {
    for (const e of this.targets)
      this.gl.deleteTexture(e.texture), this.gl.deleteFramebuffer(e.framebuffer);
    this.targets = [];
  }
  destroy() {
    this.clearTargets(), this.gl.deleteProgram(this.program.prog), this.gl.deleteVertexArray(this.vao);
  }
}
function Un(n, e) {
  const { IMG: t, EYES: r, MOUTH: a, CHEEKS: s } = n, l = `#version 300 es
  in vec2 aPos; in vec2 aUv;
  uniform vec2 uScale; uniform vec2 uOffset;
  out vec2 vUv;
  void main() { vUv = aUv; gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); }`, f = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 outColor;
  uniform sampler2D uTex;
  uniform vec4 uRect;        // layer rect in source px
  uniform int uFace;
  uniform float uAlpha;
  uniform vec4 uEyeBox[2];   // x0, x1, -, -
  uniform float uEyeTop[48]; // 2 eyes x EYE_N samples
  uniform float uEyeBot[48];
  uniform vec4 uEyeState[2]; // open, smile, ballX(px), ballY(px)
  uniform vec4 uMouth;       // cx, cy, angle, halfLen
  uniform vec4 uMouthState;  // open, form, bow, -
  uniform vec4 uCheeks;      // x0, y0, x1, y1
  uniform float uCheek;

  const int EYE_N = 24;
  float crv(int e, bool top, float u) {
    float f = clamp(u, 0.0, 1.0) * float(EYE_N - 1);
    int i = min(int(floor(f)), EYE_N - 2);
    float t = f - float(i);
    int k = e * EYE_N + i;
    return top ? mix(uEyeTop[k], uEyeTop[k + 1], t) : mix(uEyeBot[k], uEyeBot[k + 1], t);
  }

  // Upper lid line and lower lid line of eye e at column u, for the current open/smile state.
  // Must match eyeLids() in rig.js, which moves the lash meshes to the same lines.
  // Must match eyeLidsRaw() / eyeLids() in rig.js.
  vec2 eyeLidsRaw(int e, float u) {
    u = clamp(u, 0.0, 1.0);
    vec4 st = uEyeState[e];
    float top = crv(e, true, u), bot = crv(e, false, u);
    float b = 1.0 - st.x, smile = st.y, hump = 4.0 * u * (1.0 - u);
    float H = crv(e, false, 0.5) - crv(e, true, 0.5);
    float arc = mix(uEyeTop[e * EYE_N], uEyeTop[e * EYE_N + EYE_N - 1], u) - 0.3 * H * hump;
    float closed = max(top, bot + 1.0 + (arc - bot - 1.0) * smile);
    return vec2((closed - top) * max(b, -0.07), b > 0.0 ? (closed - bot) * b * smile : 0.0);
  }

  vec2 eyeLids(int e, float u, float top, float bot) {
    vec4 box = uEyeBox[e];
    float du = 5.0 / (box.y - box.x);
    vec2 raw = eyeLidsRaw(e, u);
    vec2 d = (eyeLidsRaw(e, u - 2.0 * du) + 2.0 * eyeLidsRaw(e, u - du) + 3.0 * raw
            + 2.0 * eyeLidsRaw(e, u + du) + eyeLidsRaw(e, u + 2.0 * du)) / 9.0;
    // for hiding the ball take whichever closes more: the smoothed lash can sit a little
    // above the raw lid near the corners, and the gap must show lid skin, not eye white
    return vec2(top + max(d.x, raw.x), bot + min(d.y, raw.y));
  }

  vec4 texAt(vec2 p) { return texture(uTex, (p - uRect.xy) / uRect.zw); }

  // Eye white + iris layer: shown only between the lids (the lids cover it, it never squashes);
  // the iris slides inside the opening for the gaze.
  vec4 eyeBall(int e, vec2 p) {
    vec4 box = uEyeBox[e]; vec4 st = uEyeState[e];
    float u = clamp((p.x - box.x) / (box.y - box.x), 0.0, 1.0);
    float top = crv(e, true, u), bot = crv(e, false, u);
    vec2 lids = eyeLids(e, u, top, bot);
    float v = clamp((p.y - top) / max(bot - top, 1.0), 0.0, 1.0);
    float w = sqrt(4.0 * u * (1.0 - u)) * sqrt(4.0 * v * (1.0 - v));
    vec4 c = texAt(p - vec2(st.z, st.w) * w);
      // the lash covers ~2px of the ball's upper edge, so the cut can sit under it (no seam)
    return c * smoothstep(lids.x - 1.0, lids.x + 0.5, p.y) * (1.0 - smoothstep(lids.y - 0.9, lids.y + 0.6, p.y));
  }

  vec4 mouth(vec2 p, vec4 base) {
    float open = uMouthState.x;
    if (open < 0.01) return base;
    vec2 d = vec2(cos(uMouth.z), sin(uMouth.z)), n = vec2(-d.y, d.x);
    vec2 r = p - uMouth.xy;
    float s = dot(r, d) / uMouth.w, t = dot(r, n);
    float form = uMouthState.y;                       // -1 wide "i" .. +1 round "o"
    float wf = mix(0.78, 0.46, clamp(form * 0.5 + 0.5, 0.0, 1.0));
    float k = 1.0 - (s / wf) * (s / wf);
    if (k <= 0.0) return base;
    float line = uMouthState.z * (1.0 - s * s);
    float hk = pow(k, mix(0.55, 0.85, clamp(form, 0.0, 1.0)));
    float H = mix(20.0, 26.0, clamp(form, 0.0, 1.0));
    float up = line - 0.6 - open * 2.5 * hk;
    float lo = line + open * H * hk;
    float cov = smoothstep(-0.7, 0.7, t - up) * smoothstep(-0.7, 0.7, lo - t);
    if (cov <= 0.0) return base;
    float tv = clamp((t - up) / max(lo - up, 1.0), 0.0, 1.0);
    vec3 col = mix(vec3(0.24, 0.05, 0.08), vec3(0.48, 0.15, 0.19), tv);
    float tongue = smoothstep(0.5, 0.78, tv) * (1.0 - smoothstep(0.45, 0.8, abs(s) / wf));
    col = mix(col, vec3(0.86, 0.44, 0.47), tongue * 0.9);
    float teeth = (1.0 - smoothstep(0.12, 0.22, tv)) * smoothstep(0.25, 0.45, open) * (1.0 - smoothstep(0.55, 0.85, abs(s) / wf));
    col = mix(col, vec3(0.99, 0.96, 0.94), teeth);
    float rim = 1.0 - smoothstep(0.6, 1.8, lo - t);
    col = mix(col, vec3(0.36, 0.09, 0.11), rim * 0.85);
    return vec4(mix(base.rgb, col, cov), 1.0);
  }

  void main() {
    vec2 p = uRect.xy + vUv * uRect.zw;
    vec4 c;
    if (uFace == 1) {
      c = mouth(p, texAt(p));
      float blush = exp(-dot((p - uCheeks.xy) / vec2(48.0, 22.0), (p - uCheeks.xy) / vec2(48.0, 22.0)))
                  + exp(-dot((p - uCheeks.zw) / vec2(40.0, 20.0), (p - uCheeks.zw) / vec2(40.0, 20.0)));
      c.rgb = mix(c.rgb, c.rgb * vec3(1.0, 0.62, 0.64) , clamp(blush * uCheek * 0.55, 0.0, 1.0) * c.a);
    } else if (uFace >= 2) {
      c = eyeBall(uFace - 2, p);
    } else {
      c = texAt(p);
    }
    outColor = c * uAlpha;
  }`, y = l.replace("out vec2 vUv;", "in float aHeadWeight; out float vHeadWeight; out vec2 vScreen; out vec2 vUv;").replace("vUv = aUv;", "vHeadWeight = aHeadWeight; vScreen = vec2((aPos.x * uScale.x + uOffset.x + 1.0) * 0.5, (1.0 - aPos.y * uScale.y - uOffset.y) * 0.5); vUv = aUv;"), d = f.replace("uniform sampler2D uTex;", `uniform sampler2D uTex;
    uniform sampler2D uNormal; in float vHeadWeight; in vec2 vScreen;
    uniform mat3 uHeadRotation; uniform vec3 uLight; uniform vec3 uLightColor; uniform vec3 uAmbientColor;
    uniform vec4 uLighting; uniform vec4 uSurface; uniform float uAspect; uniform int uCel;`).replace("outColor = c * uAlpha;", `
      // RG hold the smooth surface normal, BA the painting's relief (see lighting/normals.ts).
      vec4 encoded = texture(uNormal, vUv);
      vec2 base = encoded.rg * 2.0 - 1.0;
      vec3 n = vec3(base, sqrt(max(0.0, 1.0 - dot(base, base))));
      n = normalize(n + vec3((encoded.ba * 2.0 - 1.0) * uSurface.w * ${Rn.toFixed(3)}, 0.0));
      n = normalize(mix(n, uHeadRotation * n, vHeadWeight));
      vec2 toLight = (uLight.xy - vScreen) * vec2(uAspect, 1.0);
      vec3 light = normalize(vec3(toLight, uLight.z));
      float ndl = dot(n, light);
      float diffuse;
      if (uCel == 1) {
        float w = 0.01 + uSurface.x * 0.08;
        diffuse = 0.2 + 0.45 * smoothstep(${Ve.toFixed(3)} - w, ${Ve.toFixed(3)} + w, ndl) + 0.35 * smoothstep(0.55 - w, 0.55 + w, ndl);
      } else {
        float s = 0.05 + uSurface.x * 0.5;
        diffuse = smoothstep(${Ve.toFixed(3)} - s, ${Ve.toFixed(3)} + s, ndl) * (0.35 + 0.65 * max(0.0, ndl));
      }
      float reach = dot(toLight, toLight) / (uLighting.w * uLighting.w);
      float attenuation = 1.0 / (1.0 + reach);
      vec3 radiance = uLightColor * uLighting.y * attenuation;
      // A light close to the surface may brighten a little, but must not bleach painted colours.
      vec3 irradiance = min(uAmbientColor * uLighting.z + radiance * diffuse, vec3(${_n.toFixed(3)}));
      // Painted shadows are deeper versions of the base colour, not grey: multiply by the colour
      // itself as the surface turns away from the light.
      vec3 albedo = c.rgb / max(c.a, 1e-4);
      float dark = 1.0 - clamp(dot(irradiance, vec3(0.3333)), 0.0, 1.0);
      vec3 shaded = c.rgb * mix(vec3(1.0), albedo, dark * ${Ln.toFixed(3)}) * irradiance;
      float specular = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * uSurface.y;
      if (uCel == 1) specular = smoothstep(0.3, 0.35, specular) * uSurface.y;
      vec2 side = length(n.xy) > 0.001 ? normalize(n.xy) : vec2(0.0);
      float rim = pow(1.0 - max(n.z, 0.0), 4.0) * smoothstep(-0.2, 0.7, dot(side, normalize(toLight + vec2(1e-4)))) * uSurface.z;
      shaded += radiance * (specular * max(0.0, ndl) + rim) * c.a;
      // Strength blends between the original painting and the relit result; alpha is unchanged.
      c.rgb = clamp(mix(c.rgb, shaded, uLighting.x), vec3(0.0), vec3(c.a));
      outColor = c * uAlpha;`), m = `#version 300 es
  in vec2 aPos; uniform vec2 uScale; uniform vec2 uOffset;
  void main() { gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); gl_PointSize = 7.0; }`, c = `#version 300 es
  precision mediump float; uniform vec4 uColor; out vec4 o; void main() { o = uColor; }`;
  function p(u, w, o) {
    const i = u.createProgram();
    for (const [A, L] of [[u.VERTEX_SHADER, w], [u.FRAGMENT_SHADER, o]]) {
      const B = u.createShader(A);
      if (u.shaderSource(B, L), u.compileShader(B), !u.getShaderParameter(B, u.COMPILE_STATUS)) throw new Error(u.getShaderInfoLog(B));
      u.attachShader(i, B), u.deleteShader(B);
    }
    if (u.bindAttribLocation(i, 0, "aPos"), u.bindAttribLocation(i, 1, "aUv"), u.bindAttribLocation(i, 2, "aHeadWeight"), u.linkProgram(i), !u.getProgramParameter(i, u.LINK_STATUS)) throw new Error(u.getProgramInfoLog(i));
    const S = {}, g = u.getProgramParameter(i, u.ACTIVE_UNIFORMS);
    for (let A = 0; A < g; A++) {
      const L = u.getActiveUniform(i, A).name.replace("[0]", "");
      S[L] = u.getUniformLocation(i, L);
    }
    return { prog: i, u: S };
  }
  function b(u, w, o, i) {
    const S = [u];
    let g = u;
    for (; g < u + w - 0.5; ) {
      const A = i && g >= i.from && g < i.to ? i.cell : o;
      g = Math.min(u + w, g + A), S.push(g);
    }
    return S;
  }
  function v(u, w, o, i, S = null) {
    const [g, A, L, B] = u, j = b(g, L, w, S && { from: S.x0, to: S.x1, cell: S.cell }), k = b(A, B, w, S && { from: S.y0, to: S.y1, cell: S.cell }), U = j.length - 1, O = k.length - 1, $ = (U + 1) * (O + 1), D = new Float32Array($ * 2), q = new Float32Array($ * 2);
    for (let z = 0; z <= O; z++) for (let W = 0; W <= U; W++) {
      const I = z * (U + 1) + W;
      D[I * 2] = j[W], D[I * 2 + 1] = k[z], q[I * 2] = (j[W] - g) / L, q[I * 2 + 1] = (k[z] - A) / B;
    }
    const N = [], P = [], H = o.length / i, G = i === 1 ? 0 : 1;
    for (let z = 0; z < O; z++) for (let W = 0; W < U; W++) {
      const I = Math.floor(j[W] - g) * G - 2, V = Math.ceil(j[W + 1] - g) * G + 2, K = Math.floor(k[z] - A) * G - 2, x = Math.ceil(k[z + 1] - A) * G + 2;
      let M = !1;
      for (let F = Math.max(0, K); F < Math.min(H, x) && !M; F += 1)
        for (let C = Math.max(0, I); C < Math.min(i, V); C += 1)
          if (o[F * i + C] > 3) {
            M = !0;
            break;
          }
      if (!M) continue;
      const T = z * (U + 1) + W, _ = T + 1, Y = T + U + 1, X = Y + 1;
      N.push(T, _, Y, _, X, Y), P.push(T, _, T, Y, _, Y), W === U - 1 && P.push(_, X), z === O - 1 && P.push(Y, X);
    }
    return { rect: u, cols: U, rows: O, rest: D, uv: q, pos: new Float32Array(D), tris: new Uint32Array(N), lines: new Uint32Array(P) };
  }
  class h {
    // padTop / padSide: margin around the image, as a share of its height / width. A negative
    // padTop pushes the top of the image above the canvas (hides a cut-off top edge).
    constructor(w, { padTop: o = 0, padSide: i = 0, fit: S = "contain" } = {}) {
      this.pad = { top: o, side: i }, this.fit = S;
      const g = w.getContext("webgl2", { premultipliedAlpha: !0, antialias: !0, alpha: !0, preserveDrawingBuffer: !0 });
      if (!g) throw new Error("WebGL2 is not available");
      this.gl = g, this.canvas = w, this.main = p(g, l, f), this.line = p(g, m, c), this.layers = [], this.lighting = Ue, this.lightingStats = { normalMs: 0, computedLayers: 0, cachedLayers: 0 }, g.enable(g.BLEND), g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    }
    texture(w) {
      const o = this.gl, i = o.createTexture();
      return o.bindTexture(o.TEXTURE_2D, i), o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0), o.texImage2D(o.TEXTURE_2D, 0, o.RGBA, o.RGBA, o.UNSIGNED_BYTE, w), o.generateMipmap(o.TEXTURE_2D), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MIN_FILTER, o.LINEAR_MIPMAP_LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MAG_FILTER, o.LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_S, o.CLAMP_TO_EDGE), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_T, o.CLAMP_TO_EDGE), i;
    }
    addLayer(w, o, i, S = {}) {
      const g = this.gl, A = g.createVertexArray();
      g.bindVertexArray(A);
      const L = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, L), g.bufferData(g.ARRAY_BUFFER, i.pos, g.DYNAMIC_DRAW);
      for (const $ of [this.main, this.line]) {
        const D = g.getAttribLocation($.prog, "aPos");
        g.enableVertexAttribArray(D), g.vertexAttribPointer(D, 2, g.FLOAT, !1, 0, 0);
      }
      const B = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, B), g.bufferData(g.ARRAY_BUFFER, i.uv, g.STATIC_DRAW);
      const j = g.getAttribLocation(this.main.prog, "aUv");
      g.enableVertexAttribArray(j), g.vertexAttribPointer(j, 2, g.FLOAT, !1, 0, 0);
      const k = g.createBuffer();
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, k), g.bufferData(g.ELEMENT_ARRAY_BUFFER, i.tris, g.STATIC_DRAW), g.bindVertexArray(null);
      const U = g.createBuffer();
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, U), g.bufferData(g.ELEMENT_ARRAY_BUFFER, i.lines, g.STATIC_DRAW);
      const O = { name: w, image: o, mesh: i, tex: this.texture(o), vao: A, posBuf: L, uvBuf: B, triBuf: k, lineBuf: U, visible: !0, face: !!S.face, eyeBall: S.eyeBall, color: S.color || [1, 1, 1, 1] };
      return this.layers.push(O), O;
    }
    destroy() {
      const w = this.gl;
      for (const o of this.layers) {
        w.deleteTexture(o.tex), o.normal && w.deleteTexture(o.normal), o.headBuf && w.deleteBuffer(o.headBuf), w.deleteVertexArray(o.vao);
        for (const i of [o.posBuf, o.uvBuf, o.triBuf, o.lineBuf]) w.deleteBuffer(i);
      }
      w.deleteProgram(this.main.prog), w.deleteProgram(this.line.prog), this.lit && w.deleteProgram(this.lit.prog), this.shadow?.destroy(), this.layers.length = 0;
    }
    setLighting(w) {
      if (this.lighting = On({ ...Ue, ...w }) ?? Ue, !this.lighting.enabled) return;
      const o = this.gl;
      this.lit || (this.lit = p(o, y, d));
      for (const i of this.layers) {
        if (i.normal || i.overlay) continue;
        const S = Sn(i.image, i.mesh.rect, e, !/^(eye|mouth)/.test(i.name));
        this.lightingStats.normalMs += S.ms, this.lightingStats[S.computed ? "computedLayers" : "cachedLayers"]++, i.normal = o.createTexture(), o.activeTexture(o.TEXTURE0), o.bindTexture(o.TEXTURE_2D, i.normal), o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), o.texImage2D(o.TEXTURE_2D, 0, o.RGBA, S.width, S.height, 0, o.RGBA, o.UNSIGNED_BYTE, S.data), o.generateMipmap(o.TEXTURE_2D), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MIN_FILTER, o.LINEAR_MIPMAP_LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MAG_FILTER, o.LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_S, o.CLAMP_TO_EDGE), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_T, o.CLAMP_TO_EDGE);
        const g = new Float32Array(i.mesh.rest.length / 2);
        for (let A = 0; A < g.length; A++) g[A] = n.headWeight(i.mesh.rest[A * 2], i.mesh.rest[A * 2 + 1]);
        i.headBuf = o.createBuffer(), o.bindVertexArray(i.vao), o.bindBuffer(o.ARRAY_BUFFER, i.headBuf), o.bufferData(o.ARRAY_BUFFER, g, o.STATIC_DRAW), o.enableVertexAttribArray(2), o.vertexAttribPointer(2, 1, o.FLOAT, !1, 0, 0);
      }
      o.bindVertexArray(null), this.lighting.shadow && !this.shadow && (this.shadow = new Bn(o, p));
    }
    resize() {
      const w = this.canvas, o = Math.min(window.devicePixelRatio || 1, 2), i = Math.round(w.clientWidth * o), S = Math.round(w.clientHeight * o);
      (w.width !== i || w.height !== S) && (w.width = i, w.height = S);
      const g = (this.fit === "cover" ? Math.max : Math.min)(i / (t.w * (1 + 2 * this.pad.side)), S / (t.h * (1 + this.pad.top))), A = (i - t.w * g) / 2, L = (S - t.h * g) / (this.fit === "cover" ? 2 : 1);
      this.scale = [2 * g / i, -2 * g / S], this.offset = [-1 + 2 * A / i, 1 - 2 * L / S], this.pxScale = g, this.pxOff = [A, L];
    }
    draw(w) {
      const o = this.gl;
      this.resize(), o.viewport(0, 0, this.canvas.width, this.canvas.height), o.clearColor(0, 0, 0, 0), o.clear(o.COLOR_BUFFER_BIT);
      const i = this.lighting.enabled, S = i && this.lighting.shadow;
      S && this.shadow.begin(this.canvas.width, this.canvas.height);
      const g = i ? this.lit : this.main;
      if (this.current = g, o.useProgram(g.prog), i) {
        const A = this.lighting;
        o.uniform1i(g.u.uNormal, 1), o.uniform3f(g.u.uLight, A.x, A.y, A.z), o.uniform3f(g.u.uLightColor, (A.color >> 16 & 255) / 255, (A.color >> 8 & 255) / 255, (A.color & 255) / 255), o.uniform3f(g.u.uAmbientColor, (A.ambientColor >> 16 & 255) / 255, (A.ambientColor >> 8 & 255) / 255, (A.ambientColor & 255) / 255), o.uniform4f(g.u.uLighting, A.strength, A.intensity, A.ambient, A.reach), o.uniform4f(g.u.uSurface, A.softness, A.specular, A.rim, A.detail), o.uniform1f(g.u.uAspect, this.canvas.width / this.canvas.height), o.uniform1i(g.u.uCel, A.mode === "cel" ? 1 : 0), o.uniformMatrix3fv(g.u.uHeadRotation, !1, Fn(w.angleX ?? 0, w.angleY ?? 0, w.angleZ ?? 0, e.head.maxRoll));
      }
      o.uniform2fv(g.u.uScale, this.scale), o.uniform2fv(g.u.uOffset, this.offset), o.uniform1i(g.u.uTex, 0), o.uniform4fv(g.u.uEyeBox, r.flatMap((A) => [A.x0, A.x1, 0, 0])), o.uniform1fv(g.u.uEyeTop, r.flatMap((A) => A.top)), o.uniform1fv(g.u.uEyeBot, r.flatMap((A) => A.bot)), o.uniform4fv(g.u.uEyeState, w.eyes), o.uniform4f(g.u.uMouth, a.cx, a.cy, a.angle, a.halfLen), o.uniform4f(g.u.uMouthState, w.mouthOpen, w.mouthForm, a.bow, 0), o.uniform4f(g.u.uCheeks, s[0][0], s[0][1], s[1][0], s[1][1]), o.uniform1f(g.u.uCheek, w.cheek), o.activeTexture(o.TEXTURE0);
      for (const A of this.layers)
        !A.visible || A.overlay || this.drawLayer(A, A.alpha ?? 1);
      if (this.original && w.originalAlpha > 0 && this.drawLayer(this.original, w.originalAlpha), S && this.shadow.composite(this.lighting), w.showMesh) {
        const A = this.line;
        o.useProgram(A.prog), o.uniform2fv(A.u.uScale, this.scale), o.uniform2fv(A.u.uOffset, this.offset);
        for (const L of this.layers)
          !L.visible || L.overlay || (o.bindVertexArray(L.vao), o.bindBuffer(o.ELEMENT_ARRAY_BUFFER, L.lineBuf), o.uniform4fv(A.u.uColor, L.color), o.drawElements(o.LINES, L.mesh.lines.length, o.UNSIGNED_INT, 0), o.bindBuffer(o.ELEMENT_ARRAY_BUFFER, L.triBuf));
        w.joints?.length && this.drawPoints(w.joints), o.bindVertexArray(null);
      }
    }
    drawLayer(w, o) {
      const i = this.gl, S = this.current;
      i.useProgram(S.prog), i.bindVertexArray(w.vao), i.bindBuffer(i.ARRAY_BUFFER, w.posBuf), i.bufferSubData(i.ARRAY_BUFFER, 0, w.mesh.pos), this.lighting.enabled && (i.activeTexture(i.TEXTURE1), i.bindTexture(i.TEXTURE_2D, w.normal), i.activeTexture(i.TEXTURE0)), i.bindTexture(i.TEXTURE_2D, w.tex), i.uniform4fv(S.u.uRect, w.mesh.rect), i.uniform1i(S.u.uFace, w.eyeBall !== void 0 ? 2 + w.eyeBall : w.face ? 1 : 0), i.uniform1f(S.u.uAlpha, o), i.drawElements(i.TRIANGLES, w.mesh.tris.length, i.UNSIGNED_INT, 0);
    }
    drawPoints(w) {
      const o = this.gl, i = this.line;
      if (!this.pointBuf) {
        this.pointBuf = o.createBuffer(), this.pointVao = o.createVertexArray(), o.bindVertexArray(this.pointVao), o.bindBuffer(o.ARRAY_BUFFER, this.pointBuf);
        const S = o.getAttribLocation(i.prog, "aPos");
        o.enableVertexAttribArray(S), o.vertexAttribPointer(S, 2, o.FLOAT, !1, 0, 0);
      }
      o.bindVertexArray(this.pointVao), o.bindBuffer(o.ARRAY_BUFFER, this.pointBuf), o.bufferData(o.ARRAY_BUFFER, new Float32Array(w.flat()), o.DYNAMIC_DRAW), o.uniform4f(i.u.uColor, 1, 0.85, 0.2, 1), o.drawArrays(o.POINTS, 0, w.length);
    }
    // canvas CSS px -> source image px
    toImage(w, o) {
      if (!this.pxOff) return null;
      const i = this.canvas.width / this.canvas.clientWidth;
      return [(w * i - this.pxOff[0]) / this.pxScale, (o * i - this.pxOff[1]) / this.pxScale];
    }
  }
  return { Renderer: h, buildGrid: v };
}
function Yn(n, e) {
  const { applyHead: t, applyBody: r, TASSELS: a, tasselAnchor: s } = n, l = (e.strands ?? []).map((o) => {
    if (o.nodes.length === 4) return o;
    const i = Array.from({ length: 4 }, (S, g) => {
      const A = g / 3 * (o.nodes.length - 1), L = Math.min(o.nodes.length - 2, Math.floor(A)), B = A - L;
      return [0, 1].map((j) => o.nodes[L][j] + (o.nodes[L + 1][j] - o.nodes[L][j]) * B);
    });
    return { ...o, nodes: i };
  }), f = [0, 300, 200, 140], y = 0.9, d = 7, m = { stiff: 1.7, damp: 1.6, couple: 0.85, reach: 0.9, bind: 4 }, c = Math.min(6, l.filter((o) => o.name.startsWith("bang")).length), p = { freq: 0.7, zeta: 0.22, hang: 0.85, inertia: 0.32, wind: 0.03, max: 0.55, smooth: 6 }, b = (o, i) => [o[0] * Math.cos(i) - o[1] * Math.sin(i), o[0] * Math.sin(i) + o[1] * Math.cos(i)], v = (o, i) => {
    const S = Math.hypot(o[0], o[1]);
    if (S < 1e-6) return o;
    const g = i * Math.tanh(S / i) / S;
    return [o[0] * g, o[1] * g];
  }, h = Object.fromEntries(Object.entries(e.buns ?? {}).map(([o, i]) => [o, { at: [i.cx, i.cy], k: 260, c: 11, hang: 3, max: 4 }])), u = (o, i) => {
    const S = Math.hypot(o[0], o[1]);
    S > i && (o[0] *= i / S, o[1] *= i / S);
  };
  class w {
    constructor() {
      this.gain = 1, this.out = { gain: 1, bunL: [0, 0], bunR: [0, 0] }, this.hair = {};
      for (const i of Object.keys(h))
        this.hair[i] = { p: null, v: [0, 0] }, this.out[i] = [0, 0];
      this.strands = l.map(() => ({ p: null, v: [[0, 0], [0, 0], [0, 0], [0, 0]] })), this.out.strands = l.map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]), this.chains = a.map((i) => {
        const S = i.tip[0] - i.pivot[0], g = i.tip[1] - i.pivot[1], A = Math.hypot(S, g), L = [S / A, g / A];
        return { t: i, dir: L, L1: A * i.split, L2: A * (1 - i.split), pts: null, prev: null, phi: [0, 0], anchor: [0, 0] };
      }), this.time = 0;
    }
    hairAnchor(i, S) {
      const g = [i[0], i[1]];
      return t(g, 1, S), r(g, i[1], S), g;
    }
    step(i, S) {
      const g = Math.max(1, Math.ceil(S / 0.004166666666666667)), A = Math.min(S, 0.05) / g, L = -i.angleZ / 30 * e.head.maxRoll - i.bodyAngleZ / 10 * e.body.maxRoll, B = this.gain;
      l.forEach((k, U) => {
        const O = this.strands[U], $ = this.out.strands[U], D = k.nodes.map((N) => this.hairAnchor(N, i));
        O.p || (O.p = D.map((N) => [...N]));
        const q = U * 1.7;
        for (let N = 0; N < g; N++) {
          const P = this.time + N * A;
          for (let H = 1; H < 4; H++) {
            const G = Math.hypot(k.nodes[H][0] - k.nodes[0][0], k.nodes[H][1] - k.nodes[0][1]), z = (Math.sin(P * 1.3) * 0.5 + Math.sin(P * 3.1) * 0.3 + Math.sin(P * 4.7 + q) * 0.2) * k.max * 0.1 * H / 3, W = [O.p[H - 1][0] - D[H - 1][0], O.p[H - 1][1] - D[H - 1][1]], I = D[H][0] + W[0] * y * m.couple - Math.sin(L) * G * 0.12 + z, V = D[H][1] + W[1] * y * m.couple, K = f[H] * k.k * m.stiff / Math.max(0.35, B), x = d * m.damp * Math.sqrt(m.stiff) / Math.max(0.5, Math.sqrt(B)), M = O.v[H], T = O.p[H];
            M[0] += (K * (I - T[0]) - x * M[0]) * A, M[1] += (K * (V - T[1]) - x * M[1]) * A, T[0] += M[0] * A, T[1] += M[1] * A;
          }
          O.p[0] = [...D[0]];
        }
        for (let N = 0; N < 4; N++) {
          const P = [O.p[N][0] - D[N][0], O.p[N][1] - D[N][1]];
          $[N] = v(P, Math.max(0.5, k.max * m.reach * Math.max(1, B) * N / 3));
        }
      });
      for (const [k, U] of Object.entries(h)) {
        const O = this.hair[k], $ = this.hairAnchor(U.at, i), D = Math.sin(this.time * 1.3 + U.at[0] * 0.01) * 0.6 + Math.sin(this.time * 2.9 + U.at[1] * 0.02) * 0.4, q = $[0] - Math.sin(L) * U.hang + D * U.max * 0.12, N = $[1];
        O.p || (O.p = [q, N]);
        const P = U.k / Math.max(0.35, B), H = U.c / Math.max(0.5, Math.sqrt(B));
        for (let z = 0; z < g; z++)
          O.v[0] += (P * (q - O.p[0]) - H * O.v[0]) * A, O.v[1] += (P * (N - O.p[1]) - H * O.v[1]) * A, O.p[0] += O.v[0] * A, O.p[1] += O.v[1] * A;
        const G = [O.p[0] - $[0], O.p[1] - $[1]];
        u(G, U.max * Math.max(1, B)), this.out[k] = G;
      }
      this.out.gain = 1;
      const j = this.out.strands;
      for (let k = 0; k < m.bind; k++) for (let U = 1; U < 4; U++) {
        const O = j.slice(0, c).map(($) => [...$[U]]);
        for (let $ = 0; $ < c; $++) {
          const D = O[Math.max(0, $ - 1)], q = O[Math.min(c - 1, $ + 1)];
          for (const N of [0, 1]) j[$][U][N] = O[$][N] * 0.5 + (D[N] + q[N]) * 0.25;
        }
      }
      for (const k of this.chains) {
        const U = s(k.t, i, this.out, [0, 0]);
        k.st || (k.st = { th: [0, 0], w: [0, 0], pos: [...U], vel: [0, 0], acc: [0, 0] });
        const O = k.st, $ = p, D = [(U[0] - O.pos[0]) / Math.max(S, 1e-3), (U[1] - O.pos[1]) / Math.max(S, 1e-3)], q = 1 - Math.exp(-S * $.smooth), N = [(D[0] - O.vel[0]) / Math.max(S, 1e-3), (D[1] - O.vel[1]) / Math.max(S, 1e-3)];
        O.acc = [O.acc[0] + (N[0] - O.acc[0]) * q, O.acc[1] + (N[1] - O.acc[1]) * q], O.vel = [O.vel[0] + (D[0] - O.vel[0]) * q, O.vel[1] + (D[1] - O.vel[1]) * q], O.pos = [...U];
        const P = [-k.dir[1], k.dir[0]], H = -(O.acc[0] * P[0] + O.acc[1] * P[1]) / (k.L1 + k.L2) * $.inertia, G = (Math.sin(this.time * 0.9 + k.t.pivot[0]) * 0.6 + Math.sin(this.time * 0.37 + k.t.pivot[1]) * 0.4) * $.wind, z = -L * $.hang + G, W = 2 * Math.PI * $.freq / Math.sqrt(Math.max(0.4, B)), I = W * 1.35;
        for (let M = 0; M < g; M++) {
          const T = -W * W * (O.th[0] - z) - 2 * $.zeta * W * O.w[0] + H;
          O.w[0] += T * A, O.th[0] += O.w[0] * A;
          const _ = -I * I * (O.th[1] - O.th[0]) - 2 * $.zeta * I * O.w[1] + H * 0.4 + T * 0.5;
          O.w[1] += _ * A, O.th[1] += O.w[1] * A;
        }
        O.th[0] = Math.max(-0.55, Math.min($.max, O.th[0])), O.th[1] = Math.max(-0.55 * 1.4, Math.min($.max * 1.4, O.th[1])), k.phi = [O.th[0], O.th[1]];
        const V = b(k.dir, O.th[0]), K = b(k.dir, O.th[1]), x = [U[0] + V[0] * k.L1, U[1] + V[1] * k.L1];
        k.pts = [[...U], x, [x[0] + K[0] * k.L2, x[1] + K[1] * k.L2]], k.anchor = U;
      }
      return this.time += S, this.out;
    }
  }
  return { Physics: w };
}
function jn(n, e) {
  const { baseWeights: t, deformBase: r, MOUTH: a } = n, s = (g, A, L) => {
    const B = Math.min(1, Math.max(0, (L - g) / (A - g)));
    return B * B * (3 - 2 * B);
  }, l = e.mouth.area, f = {
    a: { sprite: "mouth_a", ref: 0.9, width: 1 },
    aHalf: { sprite: "mouth_a_half", ref: 0.55, width: 1 },
    i: { sprite: "mouth_i", ref: 0.55, width: 1 },
    e: { sprite: "mouth_a_half", ref: 0.65, width: 1.06 },
    o: { sprite: "mouth_o", ref: 0.75, width: 1 },
    u: { sprite: "mouth_o", ref: 0.75, width: 0.78 }
  }, y = 0.16, d = ["angry", "sad"];
  function m(g, A) {
    const B = (U, O, $) => U >= O - (A ? 0.07 : 0) && U < $ + (A ? 0.07 : 0), j = [["i", -9, -0.55], ["e", -0.55, -0.2], ["a", -0.2, 0.35], ["o", 0.35, 0.75], ["u", 0.75, 9]], k = A && j.find((U) => U[0] === A || A === "aHalf" && U[0] === "a");
    return k && B(g, k[1], k[2]) ? k[0] : j.find((U) => g >= U[1] && g < U[2])[0];
  }
  const c = 0.75, p = 0.3, b = 0.06, v = ["sad", "surprise"];
  function h(g, A, L = null) {
    return L && g >= p ? L : g >= c ? null : g < p ? A >= 0.5 ? "eyes_smile" : "eyes_closed" : "eyes_half";
  }
  function u(g, A, L = null) {
    if (g < y) return null;
    const B = m(A, L);
    return B === "a" ? g >= 0.6 ? "a" : "aHalf" : B;
  }
  function w(g) {
    return a.cy + (g - a.cx) * Math.tan(a.angle);
  }
  function o() {
    return l.cx;
  }
  function i(g, A) {
    const L = Math.cos(-l.angle), B = Math.sin(-l.angle), j = g - l.cx, k = A - l.cy, U = (j * L - k * B) / l.rx, O = (j * B + k * L) / l.ry;
    return 1 - s(0.55, 0.95, Math.hypot(U, O));
  }
  function S(g, A, L, B, j) {
    const k = {}, U = (I) => I.startsWith("eyes_closed") || I.startsWith("eyes_smile"), O = (I) => d.some((V) => I === `mouth_${V}`), $ = (I) => U(I) ? 1 : I.startsWith("eyes_") ? 0 : O(I) ? 2 : 3, D = Object.entries(A.layers).sort((I, V) => $(I[0]) - $(V[0]));
    for (const [I, V] of D) {
      const K = B(V, e.mesh.spriteCell, j(L[I]), L[I].width), x = [], M = [];
      for (let _ = 0; _ < K.rest.length / 2; _++) {
        const Y = K.rest[_ * 2], X = K.rest[_ * 2 + 1];
        x.push(t(Y, X, 0)), M.push(I.startsWith("mouth") ? i(Y, X) : 0);
      }
      const T = g.addLayer(I, L[I], K, { color: [0.4, 1, 0.8, 0.6] });
      T.visible = !1, k[I] = { mesh: K, W: x, inner: M, layer: T };
    }
    const q = [0, 1].map((I) => !!(k[`eyes_closed_${I}`] && k[`eyes_half_${I}`])), N = Object.values(f).some((I) => k[I.sprite]), P = (I, V) => (I === "eyes_smile" && !k[`eyes_smile_${V}`] && (I = "eyes_closed"), I === "open" || k[`${I}_${V}`] ? I : "open"), H = [0, 0];
    let G = null;
    const z = [0, 1].map(() => ({ cur: "open", prev: "open", t: 1 }));
    function W(I, V, K, x, M = 1) {
      const T = I.mesh.rest, _ = I.mesh.pos;
      for (let Y = 0; Y < I.W.length; Y++) {
        let X = T[Y * 2], F = T[Y * 2 + 1];
        const C = I.inner[Y];
        if (C > 0) {
          const Z = w(X);
          F = Z + (F - Z) * (1 + (x - 1) * C), X = o() + (X - o()) * (1 + (M - 1) * C);
        }
        r(X, F, I.W[Y], V, K, H), _[Y * 2] = H[0], _[Y * 2 + 1] = H[1];
      }
    }
    return {
      /**
       * Show / hide and deform the sprites for this frame.
       * Returns which eyes are covered by a sprite, so the layered eye parts can be hidden, and
       * whether a drawing shows the mouth, so the shader mouth can be left out.
       * `mood` (angry / sad / surprise) picks drawn expression eyes (sad, surprise) and closed
       * mouths (angry, sad) when the avatar has them.
       */
      update(I, V, K = 1 / 60, x = null) {
        for (const C of Object.values(k)) C.layer.visible = !1;
        const M = [!1, !1];
        [
          [I.eyeROpen, I.eyeSmile],
          [I.eyeLOpen, I.eyeSmileL ?? I.eyeSmile]
        ].forEach(([C, Z], E) => {
          const R = z[E], J = v.includes(x) && k[`eyes_${x}_${E}`] ? `eyes_${x}` : null, te = P(h(C, Z, J) ?? "open", E);
          te !== R.cur && (R.prev = R.cur, R.cur = te, R.t = 0), R.t = K > 0 ? Math.min(1, R.t + K / b) : 1;
          const ee = s(0, 1, R.t), se = (ce, je) => {
            if (ce === "open" || je <= 1e-3) return;
            const _e = k[`${ce}_${E}`];
            _e && (_e.layer.visible = !0, _e.layer.alpha = je, W(_e, I, V, 1));
          }, le = (ce) => ce === "open" ? -1 : U(ce) ? 1 : 0;
          R.t >= 1 ? se(R.cur, 1) : le(R.cur) > le(R.prev) ? (se(R.prev, 1), se(R.cur, ee)) : (se(R.cur, 1), se(R.prev, 1 - ee)), M[E] = R.cur !== "open" && ee >= 0.999;
        });
        const _ = u(I.mouthOpen, I.mouthForm, G);
        G = _;
        const Y = _ && f[_], X = Y && k[Y.sprite], F = d.includes(x) && k[`mouth_${x}`];
        if (F && (!X || I.mouthOpen < y + 0.04) && (F.layer.visible = !0, F.layer.alpha = 1, W(F, I, V, 1)), X) {
          X.layer.visible = !0, X.layer.alpha = s(y, y + 0.04, I.mouthOpen);
          const C = Math.min(1.1, Math.max(0.5, I.mouthOpen / Y.ref));
          W(X, I, V, C, Y.width);
        }
        return { eyes: M, mouth: _, mouthDrawn: N && (!Y || !!X) };
      },
      /** Whether each eye has the closed and half-closed drawings, so the layered eye stays open. */
      eyesDrawn: q
    };
  }
  return { createSprites: S, mouthShape: u, eyeSprite: h };
}
const $t = { angry: "angry", angryTalk: "angry", sad: "sad", sadTalk: "sad", surprise: "surprise", surprisedTalk: "surprise" };
function In(n, e) {
  return n && n !== "neutral" ? $t[n] ?? null : (e && $t[e]) ?? null;
}
function Nn(n, e, t, r = 6) {
  let a = e, s = t, l = -1, f = -1;
  for (let m = 0; m < t; m++) {
    const c = m * e;
    for (let p = 0; p < e; p++)
      n[c + p] > 3 && (p < a && (a = p), p > l && (l = p), m < s && (s = m), m > f && (f = m));
  }
  if (l < 0) return null;
  const y = Math.max(0, a - r), d = Math.max(0, s - r);
  return [y, d, Math.min(e, l + 1 + r) - y, Math.min(t, f + 1 + r) - d];
}
function Xn(n, e, t, r, a, s, l = 16, f, y, d) {
  const m = /* @__PURE__ */ new Map();
  for (const c of e.overlays) {
    const p = t[c.name];
    if (f !== void 0 && p.width !== f || y !== void 0 && p.height !== y)
      throw new Error(`overlay ${c.name}: image size does not match base.png`);
    const b = a(p), v = Nn(b, p.width, p.height);
    if (!v) continue;
    const [h, u, w, o] = v, i = new Uint8Array(w * o);
    for (let L = 0; L < o; L++) i.set(b.subarray((u + L) * p.width + h, (u + L) * p.width + h + w), L * w);
    const S = r(v, l, i, w), g = [];
    for (let L = 0; L < S.rest.length; L += 2) {
      const B = s(S.rest[L], S.rest[L + 1], 0);
      g.push({ ...B, brow: 0, jaw: 0 });
    }
    const A = n.addLayer(`overlay_${c.name}`, d(p, v), S);
    A.visible = !1, m.set(c.name, { mesh: S, weights: g, layer: A });
  }
  return {
    /** Shows the named overlays and hides the rest. Unknown names are ignored. */
    set(c) {
      const p = new Set(c);
      for (const [b, v] of m) v.layer.visible = p.has(b);
    },
    update(c, p, b, v) {
      for (const { mesh: h, weights: u, layer: w } of m.values())
        if (w.visible)
          for (let o = 0; o < u.length; o++)
            b(h.rest[o * 2], h.rest[o * 2 + 1], u[o], c, p, v), h.pos[o * 2] = v[0], h.pos[o * 2 + 1] = v[1];
    }
  };
}
function St(n) {
  if (!n || typeof n != "object" || Array.isArray(n)) throw new TypeError("lipSync: expected an object");
  const e = n, t = {};
  for (const r of ["granularity", "openness", "closeSpeed"]) {
    const a = e[r];
    if (a !== void 0) {
      if (typeof a != "number" || !Number.isFinite(a) || a < 0 || a > 1)
        throw new RangeError(`lipSync.${r}: expected 0–1`);
      t[r] = a;
    }
  }
  if (e.preset !== void 0) {
    if (!["calm", "default", "lively", "subtle", "big", "custom"].includes(e.preset))
      throw new RangeError("lipSync.preset: expected calm, default, lively, subtle, big or custom");
    t.preset = e.preset;
  }
  return t;
}
function zt(n = {}, e = {
  granularity: 0.5,
  openness: 0.5,
  closeSpeed: 0.5
}) {
  const t = St(n);
  return {
    granularity: t.granularity ?? e.granularity,
    openness: t.openness ?? e.openness,
    closeSpeed: t.closeSpeed ?? e.closeSpeed
  };
}
const Ee = (n, e, t, r) => n === 0.5 ? t : n < 0.5 ? e + (t - e) * n * 2 : t + (r - t) * (n - 0.5) * 2;
function Ct(n) {
  return {
    arm: Ee(n.granularity, 0.2, 0.6, 0.9),
    trigger: Ee(n.granularity, 0.65, 0.8, 0.95),
    relax: Ee(n.granularity, 1.5, 5, 12),
    range: Ee(n.granularity, 0.7, 0.3, 0.05),
    risePower: Ee(n.granularity, 0.05, 0.3, 0.8),
    openness: Ee(n.openness, 0.55, 1, 1.25),
    audioRelease: Ee(n.closeSpeed, 6, 32, 45),
    kanaRelease: Ee(n.closeSpeed, 6, 22, 45)
  };
}
const $n = /* @__PURE__ */ new Set([
  "angleX",
  "angleY",
  "angleZ",
  "bodyAngleX",
  "bodyAngleZ",
  "armAngle",
  "handAngle",
  "gazeX",
  "gazeY"
]), Tt = {
  nod: {
    label: "Nod",
    dur: 1.7,
    tracks: {
      angleY: [[0, 0], [0.32, -13], [0.62, 2], [0.95, -9], [1.3, 1], [1.7, 0]],
      angleZ: [[0, 0], [0.4, -2], [1, -1], [1.7, 0]],
      bodyAngleX: [[0, 0], [0.5, -1.5], [1.7, 0]],
      eyeSmile: [[0, 0], [0.3, 0.45], [1.3, 0.45], [1.7, 0]],
      eyeOpen: [[0, 1], [0.3, 0.72], [1.3, 0.72], [1.7, 1]],
      mouthOpen: [[0, 0], [0.3, 0.12], [1.3, 0.12], [1.7, 0]],
      mouthForm: [[0, 0], [0.3, -0.6], [1.7, -0.3]]
    }
  },
  tilt: {
    label: "Head tilt",
    dur: 2.6,
    tracks: {
      angleZ: [[0, 0], [0.55, 17], [2, 15], [2.6, 0]],
      angleX: [[0, 0], [0.6, 8], [2, 7], [2.6, 0]],
      angleY: [[0, 0], [0.6, 4], [2.6, 0]],
      bodyAngleZ: [[0, 0], [0.8, 3], [2, 3], [2.6, 0]],
      gazeX: [[0, 0], [0.4, 0.5], [2.1, 0.4], [2.6, 0]],
      gazeY: [[0, 0], [0.4, 0.35], [2.1, 0.3], [2.6, 0]],
      browAngle: [[0, 0], [0.5, -0.7], [2.1, -0.6], [2.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [2.1, 0.3], [2.6, 0]]
      // closed mouth: a barely open round mouth read as a squashed blob
    }
  },
  think: {
    label: "Thinking",
    dur: 3.6,
    tracks: {
      angleX: [[0, 0], [0.7, -11], [3, -9], [3.6, 0]],
      angleY: [[0, 0], [0.7, 9], [3, 8], [3.6, 0]],
      angleZ: [[0, 0], [0.8, 6], [3, 5], [3.6, 0]],
      gazeX: [[0, 0], [0.35, -0.8], [3.1, -0.7], [3.6, 0]],
      gazeY: [[0, 0], [0.35, 0.7], [3.1, 0.6], [3.6, 0]],
      handAngle: [[0, 0], [0.6, 3], [3, 3], [3.6, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.3, 0],
        [2.45, 1],
        [2.6, 0],
        [3.6, 0]
      ],
      browY: [[0, 0], [0.6, 0.25], [3, 0.2], [3.6, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3, -0.3], [3.6, 0]],
      mouthForm: [[0, 0], [0.6, 0.4], [3.6, 0]]
    }
  },
  giggle: {
    label: "Chuckle",
    dur: 2.2,
    tracks: {
      eyeOpen: [[0, 1], [0.2, 0], [1.8, 0], [2.2, 1]],
      eyeSmile: [[0, 0], [0.2, 1], [1.8, 1], [2.2, 0]],
      mouthOpen: [[0, 0], [0.2, 0.5], [0.45, 0.32], [0.7, 0.55], [0.95, 0.34], [1.2, 0.5], [1.8, 0.3], [2.1, 0]],
      mouthForm: [[0, 0], [0.2, -0.8], [2.2, -0.2]],
      blush: [[0, 0], [0.3, 0.7], [1.8, 0.7], [2.2, 0.1]],
      angleY: [[0, 0], [0.2, -5], [0.45, -1], [0.7, -6], [0.95, -2], [1.2, -5], [1.6, -2], [2.2, 0]],
      angleZ: [[0, 0], [0.3, -6], [1.8, -5], [2.2, 0]],
      bodyAngleZ: [[0, 0], [0.25, 2], [0.5, -1], [0.75, 2], [1, -1], [1.3, 1.5], [2.2, 0]],
      browY: [[0, 0], [0.3, 0.3], [1.8, 0.3], [2.2, 0]]
    }
  },
  surprise: {
    label: "Surprise",
    dur: 2,
    tracks: {
      angleY: [[0, 0], [0.12, 10], [0.5, 6], [1.5, 5], [2, 0]],
      angleX: [[0, 0], [0.12, -4], [2, 0]],
      bodyAngleX: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]],
      eyeOpen: [[0, 1], [0.1, 1.25], [1.5, 1.2], [2, 1]],
      browY: [[0, 0], [0.1, 1], [1.5, 0.9], [2, 0]],
      mouthOpen: [[0, 0], [0.12, 0.6], [1.4, 0.45], [2, 0]],
      mouthForm: [[0, 0], [0.12, 0.6], [1.5, 0.55], [2, 0]],
      // o
      armAngle: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]]
    }
  },
  shy: {
    label: "Shy",
    dur: 3.2,
    tracks: {
      angleX: [[0, 0], [0.6, 14], [2.6, 12], [3.2, 0]],
      angleY: [[0, 0], [0.6, -9], [2.6, -8], [3.2, 0]],
      angleZ: [[0, 0], [0.7, -8], [2.6, -7], [3.2, 0]],
      gazeX: [[0, 0], [0.3, 0.8], [1.6, 0.8], [1.9, -0.3], [2.2, 0.8], [2.8, 0.6], [3.2, 0]],
      gazeY: [[0, 0], [0.3, -0.5], [2.8, -0.4], [3.2, 0]],
      eyeOpen: [[0, 1], [0.5, 0.75], [2.7, 0.75], [3.2, 1]],
      eyeSmile: [[0, 0], [0.5, 0.5], [2.7, 0.5], [3.2, 0]],
      blush: [[0, 0], [0.8, 1], [2.7, 1], [3.2, 0]],
      browAngle: [[0, 0], [0.5, -0.6], [2.7, -0.5], [3.2, 0]],
      mouthForm: [[0, 0], [0.5, -0.4], [3.2, 0]],
      handAngle: [[0, 0], [0.8, 4], [2.6, 4], [3.2, 0]]
    }
  },
  no: {
    label: "Shake head",
    dur: 1.9,
    tracks: {
      angleX: [[0, 0], [0.2, 13], [0.45, -13], [0.7, 12], [0.95, -10], [1.2, 5], [1.5, 0]],
      angleY: [[0, 0], [0.2, -3], [1.3, -3], [1.9, 0]],
      bodyAngleX: [[0, 0], [0.3, 1.5], [0.6, -1.5], [0.9, 1], [1.3, 0]],
      eyeOpen: [[0, 1], [0.15, 0], [1.4, 0], [1.9, 1]],
      eyeSmile: [[0, 0], [0.15, 1], [1.4, 1], [1.9, 0]],
      // closed mouth while shaking the head
      browAngle: [[0, 0], [0.2, -0.5], [1.4, -0.5], [1.9, 0]]
    }
  },
  wink: {
    label: "Wink",
    dur: 2,
    tracks: {
      angleZ: [[0, 0], [0.35, -13], [1.5, -12], [2, 0]],
      angleX: [[0, 0], [0.35, 9], [1.5, 8], [2, 0]],
      bodyAngleZ: [[0, 0], [0.5, -2], [1.5, -2], [2, 0]],
      eyeOpenL: [[0, 1], [0.25, 1], [0.4, 0], [1.4, 0], [1.6, 1]],
      eyeSmileL: [[0, 0], [0.3, 1], [1.5, 1], [1.7, 0]],
      mouthOpen: [[0, 0], [2, 0]],
      // wink with a closed smile
      mouthForm: [[0, 0], [0.35, -0.8], [2, 0]],
      blush: [[0, 0], [0.4, 0.5], [1.6, 0.5], [2, 0]]
    }
  },
  greet: {
    label: "Greeting",
    dur: 2.6,
    tracks: {
      angleY: [[0, 0], [0.7, -18], [1.2, -17], [1.9, 2], [2.6, 0]],
      bodyAngleX: [[0, 0], [0.8, 2], [1.8, 0]],
      bodyAngleZ: [[0, 0], [0.8, 1.5], [2, 0]],
      armAngle: [[0, 0], [0.8, 3], [2, 0]],
      eyeOpen: [[0, 1], [0.5, 0], [1.4, 0], [1.8, 1]],
      eyeSmile: [[0, 0], [0.5, 1], [1.6, 1], [2.3, 0.4], [2.6, 0]],
      mouthOpen: [[0, 0], [1.6, 0], [1.8, 0.3], [2.3, 0.2], [2.6, 0]],
      mouthForm: [[0, 0], [1.6, -0.8], [2.6, -0.3]],
      blush: [[0, 0], [1.6, 0.3], [2.6, 0]]
    }
  }
}, Ot = {
  lookAround: {
    label: "Look around",
    dur: 5.2,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.25, -0.85], [1.5, -0.8], [1.8, 0.1], [2.1, 0.85], [3.4, 0.8], [3.7, 0], [5.2, 0]],
      gazeY: [[0, 0], [0.25, 0.15], [1.8, 0.25], [2.1, 0.1], [3.7, 0], [5.2, 0]],
      angleX: [[0, 0], [0.7, -20], [1.6, -18], [2.5, 19], [3.5, 17], [4.4, 0], [5.2, 0]],
      angleY: [[0, 0], [0.7, 3], [1.8, 5], [2.5, 3], [4.4, 0]],
      angleZ: [[0, 0], [0.8, 4], [1.8, 0], [2.6, -4], [4.4, 0]],
      bodyAngleX: [[0, 0], [1, -4], [2.8, 4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [1, 1.5], [2.8, -1.5], [4.6, 0]],
      handAngle: [[0, 0], [1, -2], [2.8, 2], [4.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [3.6, 0.3], [4.4, 0]],
      // curious: a quick inhale, held while looking, let out at the end
      breath: [[0, 0.2], [0.6, 0.85], [3.6, 0.7], [4.6, 0], [5.2, 0.1]]
    }
  },
  glance: {
    label: "Side glance",
    dur: 4.6,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.18, 0.9], [2.6, 0.85], [2.9, 0.15], [3.2, 0], [4.6, 0]],
      gazeY: [[0, 0], [0.18, 0.4], [2.6, 0.35], [3.2, 0]],
      angleX: [[0, 0], [0.6, 13], [2.6, 11], [3.6, 0]],
      angleY: [[0, 0], [0.6, 6], [2.6, 5], [3.6, 0]],
      angleZ: [[0, 0], [0.7, -5], [2.6, -4], [3.6, 0]],
      bodyAngleX: [[0, 0], [1, 2.5], [2.8, 2], [4, 0]],
      eyeOpen: [[0, 1], [0.3, 1.06], [2.5, 1.05], [2.8, 0.85], [3.4, 1]],
      browY: [[0, 0], [0.4, 0.4], [2.5, 0.35], [3.4, 0]],
      browAngle: [[0, 0], [0.4, -0.2], [2.5, -0.2], [3.4, 0]],
      breath: [[0, 0], [0.5, 0.6], [2.6, 0.55], [3.8, 0], [4.6, 0.3]]
    }
  },
  sway: {
    label: "Sway",
    dur: 7,
    idle: !0,
    tracks: {
      bodyAngleZ: [[0, 0], [1.6, 6], [3.4, -6], [5.2, 5], [7, 0]],
      bodyAngleX: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2.5], [7, 0]],
      angleZ: [[0, 0], [1.8, -10], [3.6, 10], [5.4, -8], [7, 0]],
      angleX: [[0, 0], [1.8, 6], [3.6, -6], [5.4, 5], [7, 0]],
      angleY: [[0, 0], [0.9, 3], [1.8, 0], [2.7, 3], [3.6, 0], [4.5, 3], [5.4, 0], [7, 0]],
      armAngle: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2], [7, 0]],
      handAngle: [[0, 0], [1.8, -4], [3.6, 4], [5.4, -3], [7, 0]],
      gazeX: [[0, 0], [1.8, -0.3], [3.6, 0.3], [5.4, -0.2], [7, 0]],
      eyeOpen: [[0, 1], [0.8, 0.82], [6.2, 0.82], [7, 1]],
      eyeSmile: [[0, 0], [0.8, 0.35], [6.2, 0.35], [7, 0]],
      // slow, even breaths in time with the sway
      breath: [[0, 0], [0.9, 1], [1.8, 0], [2.7, 1], [3.6, 0], [4.5, 1], [5.4, 0], [6.3, 0.8], [7, 0]]
    }
  },
  sigh: {
    label: "Sigh",
    dur: 5.6,
    idle: !0,
    tracks: {
      breath: [[0, 0], [1.3, 1.25], [1.9, 1.25], [3.6, 0], [5.6, 0]],
      angleY: [[0, 0], [1.3, 9], [1.9, 9], [3.3, -9], [4.6, -6], [5.6, 0]],
      angleZ: [[0, 0], [1.3, -3], [3.3, 5], [5.6, 0]],
      bodyAngleX: [[0, 0], [1.3, -2.5], [3.3, 2.5], [5.6, 0]],
      bodyAngleZ: [[0, 0], [1.9, 1], [3.3, -1.5], [5.6, 0]],
      armAngle: [[0, 0], [1.3, -2.5], [3.3, 2], [5.6, 0]],
      gazeY: [[0, 0], [1.2, 0.4], [2, 0.3], [3.2, -0.4], [4.8, -0.2], [5.6, 0]],
      eyeOpen: [[0, 1], [1, 0.95], [1.9, 0.6], [3.4, 0.6], [4.6, 0.78], [5.6, 1]],
      browY: [[0, 0], [1.3, 0.35], [3.2, -0.2], [5.6, 0]],
      browAngle: [[0, 0], [1.9, -0.4], [4.6, -0.35], [5.6, 0]]
    }
  },
  doze: {
    label: "Drowsy",
    dur: 7.2,
    idle: !0,
    tracks: {
      eyeOpen: [[0, 1], [1.8, 0.78], [3.2, 0.62], [4.5, 0.55], [4.75, 1.1], [5.6, 1.05], [7.2, 1]],
      angleY: [[0, 0], [1.8, -6], [3.2, -9], [4.5, -17], [4.75, 5], [5.6, 2], [7.2, 0]],
      angleZ: [[0, 0], [2, 4], [4.5, 10], [4.75, -2], [7.2, 0]],
      angleX: [[0, 0], [4.5, -4], [4.75, 3], [5.4, -6], [6.2, 5], [7.2, 0]],
      bodyAngleZ: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      bodyAngleX: [[0, 0], [4.5, 2], [4.8, -1.5], [7.2, 0]],
      armAngle: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      handAngle: [[0, 0], [4.5, 5], [4.8, -1], [7.2, 0]],
      gazeY: [[0, 0], [4.5, -0.4], [4.75, 0.2], [7.2, 0]],
      gazeX: [[0, 0], [4.8, 0], [5.3, -0.6], [6.1, 0.6], [6.8, 0]],
      browY: [[0, 0], [4.5, -0.35], [4.75, 0.8], [5.8, 0.3], [7.2, 0]],
      // long, slow, deepening breaths; a sharp inhale on waking
      breath: [[0, 0], [1.1, 0.7], [2.6, 0], [3.8, 0.6], [4.5, 0.2], [4.8, 1.1], [6, 0.2], [7.2, 0]]
    }
  },
  stretch: {
    label: "Stretch",
    dur: 6.2,
    idle: !0,
    tracks: {
      angleZ: [[0, 0], [1.3, -22], [2.3, -21], [3.8, 20], [4.8, 19], [6.2, 0]],
      angleY: [[0, 0], [1.3, 5], [2.3, 7], [3.1, -3], [3.8, 5], [4.8, 6], [6.2, 0]],
      angleX: [[0, 0], [1.3, -5], [3.8, 5], [6.2, 0]],
      bodyAngleZ: [[0, 0], [1.3, 4], [3.8, -4], [6.2, 0]],
      bodyAngleX: [[0, 0], [1.3, -2], [3.8, 2], [6.2, 0]],
      armAngle: [[0, 0], [1.3, 2], [3.8, -2], [6.2, 0]],
      eyeOpen: [[0, 1], [0.8, 0.62], [4.9, 0.62], [5.6, 1]],
      browAngle: [[0, 0], [1, -0.3], [4.9, -0.3], [5.8, 0]],
      breath: [[0, 0], [1.3, 1.1], [2.3, 0.9], [3.1, 0.2], [3.8, 1.1], [4.8, 0.9], [6.2, 0]]
    }
  },
  lean: {
    label: "Peek",
    dur: 4.8,
    idle: !0,
    tracks: {
      bodyAngleX: [[0, 0], [0.9, 6], [3.4, 6], [4.4, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      angleX: [[0, 0], [0.9, 9], [2, 7], [2.6, 10], [3.4, 8], [4.4, 0]],
      angleY: [[0, 0], [0.9, -6], [3.4, -5], [4.4, 0]],
      angleZ: [[0, 0], [0.9, 10], [2.2, 12], [3.4, 9], [4.4, 0]],
      armAngle: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      handAngle: [[0, 0], [0.9, 3], [3.4, 3], [4.4, 0]],
      gazeY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      gazeX: [[0, 0], [1.5, 0], [1.8, -0.3], [2.3, 0.2], [2.8, 0], [4.2, 0]],
      eyeOpen: [[0, 1], [0.6, 1.1], [3.4, 1.08], [4.2, 1]],
      browY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3.4, -0.3], [4.2, 0]],
      blush: [[0, 0], [1.2, 0.25], [3.4, 0.25], [4.4, 0]],
      breath: [[0, 0], [0.8, 0.8], [3.4, 0.6], [4.4, 0], [4.8, 0.2]]
    }
  },
  hum: {
    label: "Listen",
    dur: 5.6,
    idle: !0,
    tracks: {
      angleY: [[0, 0], [0.45, -5], [0.9, 2], [1.35, -5], [1.8, 2], [2.25, -5], [2.7, 2], [3.15, -5], [3.6, 2], [4.05, -4], [4.8, 0]],
      angleZ: [[0, 0], [0.9, 8], [1.8, -8], [2.7, 8], [3.6, -8], [4.6, 0]],
      angleX: [[0, 0], [0.9, 4], [1.8, -4], [2.7, 4], [3.6, -4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [1.8, 3], [2.7, -3], [3.6, 3], [4.6, 0]],
      bodyAngleX: [[0, 0], [1.8, 2], [3.6, -2], [4.8, 0]],
      handAngle: [[0, 0], [0.9, 3], [1.8, -3], [2.7, 3], [3.6, -3], [4.6, 0]],
      fingerTap: [[0, 0], [0.45, 1], [0.9, 0], [1.35, 1], [1.8, 0], [2.25, 1], [2.7, 0], [3.15, 1], [3.6, 0], [5.6, 0]],
      gazeX: [[0, 0], [0.9, 0.3], [1.8, -0.3], [2.7, 0.3], [3.6, -0.3], [4.6, 0]],
      eyeOpen: [[0, 1], [0.4, 0.72], [4.6, 0.72], [5.3, 1]],
      eyeSmile: [[0, 0], [0.4, 0.55], [4.6, 0.55], [5.3, 0]],
      blush: [[0, 0], [0.8, 0.3], [4.6, 0.3], [5.6, 0]],
      browY: [[0, 0], [0.5, 0.25], [4.6, 0.25], [5.4, 0]],
      breath: [[0, 0], [0.9, 0.9], [1.8, 0.2], [2.7, 0.9], [3.6, 0.2], [4.6, 0.8], [5.6, 0]]
    }
  },
  tap: {
    label: "Tap",
    dur: 5,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.3, -0.6], [2.2, -0.5], [2.5, -0.1], [2.8, -0.6], [4.2, -0.5], [4.7, 0]],
      gazeY: [[0, 0], [0.3, 0.55], [4.2, 0.5], [4.7, 0]],
      angleX: [[0, 0], [0.8, -11], [2.4, -9], [3, -12], [4.2, -10], [5, 0]],
      angleY: [[0, 0], [0.8, 8], [4.2, 7], [5, 0]],
      angleZ: [[0, 0], [0.8, 6], [2.4, 4], [3, 7], [4.2, 5], [5, 0]],
      bodyAngleX: [[0, 0], [1, -2], [4.2, -2], [5, 0]],
      handAngle: [[0, 0], [0.8, 3], [4.2, 3], [5, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.6, 0],
        [2.75, 1],
        [2.9, 0],
        [3.1, 1],
        [3.25, 0],
        [5, 0]
      ],
      browY: [[0, 0], [0.6, 0.3], [4.2, 0.25], [5, 0]],
      browAngle: [[0, 0], [0.6, -0.35], [4.2, -0.3], [5, 0]],
      eyeOpen: [[0, 1], [0.6, 0.9], [4.2, 0.9], [5, 1]],
      breath: [[0, 0], [0.8, 0.7], [2.2, 0.4], [3.2, 0.8], [4.4, 0], [5, 0.2]]
    }
  },
  readNote: {
    label: "Read script",
    dur: 2.6,
    idle: !0,
    tracks: {
      // a quick look down at the notes on the desk and back to the camera
      gazeY: [[0, 0], [0.2, -0.85], [1.5, -0.8], [1.75, 0], [2.6, 0]],
      gazeX: [[0, 0], [0.2, -0.15], [1.5, -0.1], [1.75, 0]],
      angleY: [[0, 0], [0.45, -9], [1.5, -8], [2, 1], [2.6, 0]],
      angleZ: [[0, 0], [0.5, 2], [1.6, 2], [2.6, 0]],
      eyeOpen: [[0, 1], [0.3, 0.78], [1.5, 0.78], [1.75, 1]],
      breath: [[0, 0.3], [0.8, 0.5], [1.8, 0.2], [2.6, 0.4]]
    }
  },
  waiting: {
    label: "Fidget",
    dur: 6.4,
    idle: !0,
    tracks: {
      // shifts her weight, checks the viewer, looks away, shifts back
      bodyAngleZ: [[0, 0], [0.9, 5], [2.4, 4], [3.3, -5], [5.2, -4], [6.4, 0]],
      bodyAngleX: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      angleZ: [[0, 0], [1, -6], [2.4, -4], [3.4, 6], [5.2, 5], [6.4, 0]],
      angleX: [[0, 0], [1.2, -8], [2.2, 2], [3.6, 12], [5, 10], [6.2, 0]],
      angleY: [[0, 0], [1.2, -3], [2.2, 2], [3.6, -2], [6.2, 0]],
      armAngle: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      handAngle: [[0, 0], [1.2, 3], [3.4, -3], [6.4, 0]],
      fingerTap: [[0, 0], [4.2, 0], [4.35, 1], [4.5, 0], [4.7, 1], [4.85, 0], [6.4, 0]],
      gazeX: [[0, 0], [0.9, -0.7], [1.9, -0.6], [2.1, 0], [2.7, 0], [2.9, 0.8], [5, 0.7], [5.4, 0], [6.4, 0]],
      gazeY: [[0, 0], [0.9, -0.2], [2.1, 0], [2.9, 0.3], [5.4, 0]],
      eyeOpen: [[0, 1], [2, 1], [2.2, 1.06], [2.8, 1.05], [3.1, 0.85], [5.4, 0.85], [6.2, 1]],
      browAngle: [[0, 0], [0.9, -0.35], [2, -0.35], [2.3, 0], [3.1, -0.4], [5.4, -0.35], [6.4, 0]],
      browY: [[0, 0], [2.2, 0.4], [2.8, 0.35], [3.2, 0], [6.4, 0]],
      breath: [[0, 0.3], [0.9, 0.8], [2, 0.3], [2.6, 0.9], [3.4, 0.2], [4.4, 0.8], [5.6, 0], [6.4, 0.2]]
    }
  },
  spaceOut: {
    label: "Daydream",
    dur: 7.4,
    idle: !0,
    tracks: {
      // gaze drifts up and away, breaths get slow and long, one slow blink
      gazeX: [[0, 0], [1.4, -0.55], [4.8, -0.6], [5.6, 0.1], [7, 0]],
      gazeY: [[0, 0], [1.4, 0.6], [4.8, 0.55], [5.6, 0], [7, 0]],
      angleX: [[0, 0], [2, -9], [4.8, -10], [6, 2], [7.4, 0]],
      angleY: [[0, 0], [2, 7], [4.8, 8], [6, -2], [7.4, 0]],
      angleZ: [[0, 0], [2, 9], [4.8, 11], [6, 2], [7.4, 0]],
      bodyAngleZ: [[0, 0], [2.2, 3], [4.8, 3.5], [6.4, 0]],
      bodyAngleX: [[0, 0], [2.2, -2], [4.8, -2], [6.4, 0]],
      handAngle: [[0, 0], [2.2, 4], [4.8, 5], [6.4, 0]],
      armAngle: [[0, 0], [2.2, 2], [4.8, 2], [6.4, 0]],
      eyeOpen: [[0, 1], [1.4, 0.8], [3, 0.8], [3.35, 0.56], [3.8, 0.8], [4.8, 0.8], [5.6, 1.04], [6.4, 1]],
      browY: [[0, 0], [1.6, 0.15], [4.8, 0.15], [5.6, 0.35], [6.6, 0]],
      breath: [[0, 0], [1.6, 0.9], [3.4, 0], [5, 0.9], [6.2, 0.1], [7.4, 0]]
    }
  }
};
function zn(n, e) {
  if (e <= n[0][0]) return n[0][1];
  const t = n.length - 1;
  if (e >= n[t][0]) return n[t][1];
  let r = 0;
  for (; e > n[r + 1][0]; ) r++;
  const [a, s] = n[r], [l, f] = n[r + 1], y = (h) => h <= 0 || h >= t ? 0 : (n[h + 1][1] - n[h - 1][1]) / (n[h + 1][0] - n[h - 1][0]), d = l - a, m = (e - a) / d, c = y(r) * d, p = y(r + 1) * d, b = m * m, v = b * m;
  return (2 * v - 3 * b + 1) * s + (v - 2 * b + m) * c + (-2 * v + 3 * b) * f + (v - b) * p;
}
const Pe = {
  a: { open: 0.9, form: 0, label: "あ" },
  i: { open: 0.5, form: -0.85, label: "い" },
  u: { open: 0.4, form: 0.9, label: "う" },
  e: { open: 0.62, form: -0.4, label: "え" },
  o: { open: 0.75, form: 0.6, label: "お" },
  n: { open: 0, form: null, label: "ん" }
  // closes with the previous shape
}, Cn = {
  a: "あかさたなはまやらわがざだばぱぁ",
  i: "いきしちにひみりぎじぢびぴぃ",
  u: "うくすつぬふむゆるぐずづぶぷぅゔ",
  e: "えけせてねへめれげぜでべぺぇ",
  o: "おこそとのほもよろをごぞどぼぽぉ"
}, tn = {};
for (const [n, e] of Object.entries(Cn)) for (const t of e) tn[t] = n;
const Pn = /* @__PURE__ */ new Set([..."まみむめもばびぶべぼぱぴぷぺぽ"]), Dn = /* @__PURE__ */ new Set([..."あいうえおぁぃぅぇぉ"]), Pt = { ゃ: "a", ゅ: "u", ょ: "o" }, Hn = /* @__PURE__ */ new Set([..."、。，．,.！？!? 　…"]), Zn = (n) => n.replace(/[ァ-ヶ]/g, (e) => String.fromCharCode(e.charCodeAt(0) - 96));
function Wn(n, e = 0.14) {
  const t = [];
  for (const r of Zn(n)) {
    const a = t[t.length - 1];
    if (Pt[r] && a) {
      a.vowel = Pt[r];
      continue;
    }
    if (r === "ー" && a) {
      a.dur += e;
      continue;
    }
    if (r === "っ") {
      t.push({ vowel: "n", dur: e * 0.8, onset: null });
      continue;
    }
    if (r === "ん") {
      t.push({ vowel: "n", dur: e, onset: null });
      continue;
    }
    if (Hn.has(r)) {
      t.push({ vowel: "n", dur: e * 2.2, onset: null });
      continue;
    }
    const s = tn[r];
    s && t.push({ vowel: s, dur: e, onset: Pn.has(r) ? "lips" : Dn.has(r) ? null : "consonant" });
  }
  return t;
}
function Gn(n, e, t = 0.5) {
  if (t !== 0.5) return Vn(n, e, t);
  let r = 0;
  for (const a of n) {
    if (e < r + a.dur) {
      const s = (e - r) / a.dur, l = Pe[a.vowel], f = a.onset === "lips" ? 0.05 : a.onset === "consonant" ? 0.45 : 1, y = s < 0.35 ? f + (1 - f) * (s / 0.35) : 1;
      return { open: l.open * y, form: l.form, vowel: a.vowel };
    }
    r += a.dur;
  }
  return null;
}
function Vn(n, e, t) {
  const r = t < 0.5 ? (0.5 - t) * 0.72 : 0;
  let a = 0, s = 0, l = null;
  for (const f of n) {
    let y = f.vowel;
    if (f.vowel === "n" ? r && f.dur <= 0.2 && l ? y = l : (s = 0, l = null) : ((!l || s >= r) && (l = f.vowel, s = 0), s += f.dur, r && (y = l)), e < a + f.dur) {
      const d = Pe[y], m = f.onset === "lips" ? 0.05 : f.onset === "consonant" ? 0.45 : 1, c = t < 0.5 ? 1 - (1 - m) * t * 2 : m * (2 - t * 2), p = Math.min(f.dur * 0.35, 0.05), b = (e - a) / p;
      return { open: d.open * (b < 1 ? c + (1 - c) * b : 1), form: d.form, vowel: y };
    }
    a += f.dur;
  }
  return null;
}
const at = { ...Tt, ...Ot }, Dt = { amp: 1, stiff: 1.8 }, qn = /^(angle|bodyAngle|armAngle|handAngle)/, Jn = /* @__PURE__ */ new Set([
  "eyeOpen",
  "eyeOpenL",
  "eyeSmileL",
  "eyeSmile",
  "mouthOpen",
  "mouthForm",
  "blush",
  "browY",
  "browAngle"
]), qe = (n, e, t) => {
  const r = Math.min(1, Math.max(0, (t - n) / (e - n)));
  return r * r * (3 - 2 * r);
};
function Ht(n, e) {
  const t = Math.floor(n), r = n - t, a = (l) => {
    const f = Math.sin((l + e * 57.3) * 127.1) * 43758.5453;
    return f - Math.floor(f);
  }, s = r * r * (3 - 2 * r);
  return (a(t) * (1 - s) + a(t + 1) * s) * 2 - 1;
}
const Ae = (n, e) => Ht(n, e) * 0.7 + Ht(n * 2.3, e + 9) * 0.3, pe = (n, e, t) => Math.max(e, Math.min(t, n)), nn = {
  normal: { label: "Neutral", p: {} },
  smile: { label: "Smile", p: { eyeOpen: 0, eyeSmile: 1, blush: 0.35, browY: 0.2 } },
  shy: { label: "Blush", p: { eyeOpen: 0.78, eyeSmile: 0.5, blush: 1, browAngle: -0.5, browY: -0.1, glance: [0.7, 0.35] } },
  jito: { label: "Half-lidded", p: { eyeOpen: 0.5, browY: -0.5, browAngle: 0.6 } },
  surprise: { label: "Surprise", p: { eyeOpen: 1.22, browY: 1, mouthOpen: 0.6, mouthForm: 0.6 } },
  wink: { label: "Wink", p: { eyeOpenL: 0, eyeSmileL: 1, blush: 0.3 } },
  // talking faces for AITuber OnAir emotion tags: eyes stay mostly open (closed / ^^ eyes are
  // what a single image fakes worst, and they would stay shut for a whole sentence)
  happyTalk: { label: "happy", p: { eyeOpen: 0.8, eyeSmile: 0.45, blush: 0.35, browY: 0.25, mouthForm: -0.5 } },
  sadTalk: { label: "sad", p: { eyeOpen: 0.78, browAngle: -0.8, browY: -0.2, mouthForm: 0.3, glance: [0, -0.35] } },
  angryTalk: { label: "angry", p: { eyeOpen: 0.72, browAngle: 0.85, browY: -0.55, mouthForm: 0.2 } },
  surprisedTalk: { label: "surprised", p: { eyeOpen: 1.18, browY: 0.9, mouthForm: 0.9 } },
  relaxedTalk: { label: "relaxed", p: { eyeOpen: 0.82, eyeSmile: 0.35, blush: 0.15, browY: 0.1 } }
}, Zt = {
  happy: ["happyTalk", "nod"],
  sad: ["sadTalk", "sigh"],
  angry: ["angryTalk", "no"],
  surprised: ["surprisedTalk", "surprise"],
  relaxed: ["relaxedTalk", "sway"],
  neutral: ["normal", null]
}, Kn = {
  gazeX: [260, 0.9],
  gazeY: [260, 0.9],
  angleX: [55, 0.72],
  angleY: [55, 0.72],
  angleZ: [45, 0.75],
  bodyAngleX: [14, 0.9],
  bodyAngleZ: [12, 0.9],
  armAngle: [20, 0.85],
  handAngle: [30, 0.8]
};
class Qn {
  /** @param {number[]} gazeCenter */
  constructor(e) {
    this.mode = "auto", this.P = Object.fromEntries(Ge.map((t) => [t.id, t.def])), this.manual = { ...this.P }, this.cur = { ...this.P }, this.vel = Object.fromEntries(Ge.map((t) => [t.id, 0])), this.expr = "normal", this.exprMix = {}, this.t = 0, this.blink = { t: 0, start: 1.5, double: !1 }, this.gaze = { x: 0, y: 0, next: 0 }, this.tap = { next: 4, until: -1 }, this.pointer = null, this.faceCenter = [...e], this.lipOpen = null, this.lipForm = 0, this.speaking = !1, this.voice = 0, this.mouth = 0, this.vowel = "a", this.vowelForm = 0, this.lipSync = zt(), this.lipMotion = Ct(this.lipSync), this.syllableArmed = !0, this.voicePeak = 0, this.voiceTrough = 0, this.kana = null, this.lipHold = null, this.emotionUntil = 0, this.talkGain = 1, this.play = null, this.autoMotion = !0, this.nextAuto = 14, this.autoIdle = !0, this.nextIdle = 3, this.lastAuto = null, this.onMotion = null;
  }
  setExpression(e) {
    this.expr = e;
  }
  hasMotion(e) {
    return e in at;
  }
  // ---- speech (driven from outside, e.g. by the TTS audio analyser) ----
  setVoiceLevel(e) {
    this.voice = Math.min(1, Math.max(0, Number(e) || 0));
  }
  setLipSync(e) {
    this.lipSync = zt(e, this.lipSync), this.lipMotion = Ct(this.lipSync);
  }
  setSpeaking(e) {
    e !== this.speaking && (this.speaking = !!e, e || (this.emotionUntil = this.t + 1.2, this.voice = 0));
  }
  /** `playMotion: false` changes only the face (a caller that picks motions itself). */
  setEmotion(e, { playMotion: t = !0 } = {}) {
    const r = Zt[e] ?? Zt.neutral;
    this.expr = r[0], this.emotionUntil = 1 / 0, r[1] && t && this.playMotion(r[1]);
  }
  /** Mouth shapes from kana text, without audio (preview / tuning). */
  /** @param {string} text @param {{ speed?: number, loop?: boolean }} [options] */
  speakKana(e, { speed: t, loop: r = !1 } = {}) {
    this.lipHold = null;
    const a = Wn(e, t === void 0 ? 0.14 : 1 / pe(Number(t) || 7, 4, 12));
    this.kana = a.length ? { moras: a, t: 0, loop: r, duration: a.reduce((s, l) => s + l.dur, 0) } : null;
  }
  holdMouth(e) {
    this.kana = null, this.lipHold = Object.hasOwn(Pe, e) ? e : null;
  }
  stopLipSync() {
    this.kana = null, this.lipHold = null, this.lipOpen = null, this.mouth = 0;
  }
  getLipSyncState() {
    return { active: this.kana !== null || this.lipHold !== null, open: this.P.mouthOpen, form: this.P.mouthForm };
  }
  // Mouth from the TTS loudness. A volume signal has no vowel information, so each syllable
  // (the voice dipping and rising again) gets one vowel at random, weighted towards a, and
  // keeps it until the next syllable: the drawn mouths must not change shape mid-syllable.
  // Syllables are found relative to the recent peak (not an absolute level), and the mouth
  // is scaled by where the voice sits between the recent trough and peak, so it closes in
  // the dip before each mora even when a loud voice never gets quiet.
  speechMouth(e) {
    if (this.kana || this.lipHold) {
      let p;
      if (this.lipHold ? p = Pe[this.lipHold] : (this.kana.t += e, this.kana.loop && (this.kana.t %= this.kana.duration), p = Gn(this.kana.moras, this.kana.t, this.lipSync.granularity)), !p)
        return this.kana = null, this.mouth > 0.01 ? [this.mouth *= this.lipSync.closeSpeed === 0.5 ? 0.6 : Math.exp(-e * this.lipMotion.kanaRelease), this.vowelForm] : null;
      const b = this.lipMotion.openness === 1 ? p.open : Math.min(1, p.open * this.lipMotion.openness), v = b > this.mouth ? 1 - Math.exp(-e * 30) : 1 - Math.exp(-e * this.lipMotion.kanaRelease);
      return this.mouth += (b - this.mouth) * v, p.form !== null && (this.vowelForm = p.form), [this.mouth, this.vowelForm];
    }
    const t = this.speaking ? this.voice : 0, r = 1 - Math.exp(-e * this.lipMotion.relax);
    this.voicePeak = t > this.voicePeak ? t : this.voicePeak + (t - this.voicePeak) * r, this.voiceTrough = t < this.voiceTrough ? t : this.voiceTrough + (t - this.voiceTrough) * r;
    const a = Math.max(this.voicePeak, 0.05);
    if (t < a * this.lipMotion.arm) this.syllableArmed = !0;
    else if (this.syllableArmed && t > a * this.lipMotion.trigger && t > 0.1) {
      this.syllableArmed = !1;
      const p = Math.random();
      this.vowel = p < 0.4 ? "a" : p < 0.58 ? "o" : p < 0.74 ? "e" : p < 0.88 ? "i" : "u";
    }
    const s = this.voicePeak - this.voiceTrough, l = s < a * this.lipMotion.range ? 1 : Math.max(0, (t - this.voiceTrough) / s), f = Pe[this.vowel ?? "a"], y = Math.min(1, Math.pow(t, 0.7) * 1.15) * Math.pow(l, this.lipMotion.risePower), d = this.speaking ? Math.min(0.95, y) * (0.45 + 0.55 * f.open / 0.9) : 0, m = this.lipMotion.openness === 1 ? d : Math.min(1, d * this.lipMotion.openness), c = m > this.mouth ? 1 - Math.exp(-e * 40) : 1 - Math.exp(-e * this.lipMotion.audioRelease);
    return this.mouth += (m - this.mouth) * c, this.speaking && (this.vowelForm = f.form), this.speaking || this.mouth > 0.01 ? [this.mouth, this.vowelForm] : null;
  }
  // Breathing: inhale ~40% of the cycle, a slower exhale, a short pause at the bottom,
  // and a period that drifts between ~3.2 and 4.6 s so it never looks metronomic.
  breathValue(e) {
    this.breathPhase = (this.breathPhase ?? 0) + e / (this.breathPeriod ?? 3.8), this.breathPhase >= 1 && (this.breathPhase -= 1, this.breathPeriod = 3.2 + Math.random() * 1.4);
    const t = this.breathPhase;
    return t < 0.4 ? qe(0, 0.4, t) : t < 0.88 ? 1 - qe(0.4, 0.88, t) : 0;
  }
  // pick one at random, never the one that just played
  playRandom(e) {
    const t = e.filter((r) => r !== this.lastAuto);
    this.playMotion(t[Math.floor(Math.random() * t.length)]);
  }
  playMotion(e) {
    this.lastAuto = e, this.play = { id: e, t: 0 }, this.onMotion?.(e);
  }
  blinkValue(e) {
    const t = this.blink;
    if (t.t += e, t.t < t.start) return 1;
    const r = (t.t - t.start) / 0.17;
    return r >= 1 ? (t.double ? (t.double = !1, t.start = t.t + 0.07) : (t.start = t.t + 1.8 + Math.random() * 4.2, t.double = Math.random() < 0.18), 1) : r < 0.45 ? 1 - r / 0.45 : (r - 0.45) / 0.55;
  }
  update(e) {
    this.t += e;
    const t = this.t, r = {};
    for (const v of Ge) r[v.id] = v.def;
    if (this.mode === "manual")
      Object.assign(r, this.manual);
    else if (this.mode === "auto") {
      if (r.angleX = Ae(t * 0.18, 1) * 10 + this.gaze.x * 11, r.angleY = Ae(t * 0.15, 2) * 6 - 1 + this.gaze.y * 7, r.angleZ = Ae(t * 0.12, 3) * 10, r.bodyAngleX = Ae(t * 0.1, 4) * 5, r.bodyAngleZ = Ae(t * 0.09, 5) * 4, r.armAngle = Ae(t * 0.14, 6) * 5, r.handAngle = Ae(t * 0.21, 7) * 5, t > this.gaze.next) {
        const v = Math.random();
        this.gaze.x = v < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.8, this.gaze.y = v < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.5, this.gaze.next = t + 0.8 + Math.random() * 2.5;
      }
      if (r.gazeX = this.gaze.x + r.angleX / 60, r.gazeY = this.gaze.y + r.angleY / 60, t > this.tap.next && (this.tap.until = t + 1.1, this.tap.next = t + 5 + Math.random() * 6), this.speaking) {
        this.nextIdle = Math.max(this.nextIdle, t + 2.5), this.nextAuto = Math.max(this.nextAuto, t + 6);
        const v = this.talkGain;
        this.talkNod = (this.talkNod ?? 0) + (this.voice * 7 * v - (this.talkNod ?? 0)) * Math.min(1, e * 6), r.angleY -= this.talkNod, r.angleX += Ae(t * 0.6, 11) * 5 * v, r.angleZ += Ae(t * 0.5, 12) * 4 * v;
      }
      !this.speaking && t > this.emotionUntil && (this.expr = "normal", this.emotionUntil = 1 / 0), this.speaking || (!this.play && this.autoMotion && t > this.nextAuto ? (this.playRandom(Object.keys(Tt).filter((v) => v !== "surprise")), this.nextAuto = t + 15 + Math.random() * 10, this.nextIdle = Math.max(this.nextIdle, t + 5)) : !this.play && this.autoIdle && t > this.nextIdle && (this.playRandom(Object.keys(Ot)), this.nextIdle = t + 5 + Math.random() * 5));
    } else if (this.mode === "mouse" && this.pointer) {
      const v = (this.pointer[0] - this.faceCenter[0]) / 500, h = (this.pointer[1] - this.faceCenter[1]) / 500;
      r.angleX = pe(v * 30, -30, 30), r.angleY = pe(-h * 30, -30, 30), r.angleZ = pe(-v * h * 25, -12, 12), r.bodyAngleX = pe(v * 10, -10, 10) * 0.6, r.gazeX = pe(v * 1.4, -1, 1), r.gazeY = pe(-h * 1.4, -1, 1), r.handAngle = pe(v * 4, -5, 5);
    }
    this.mode !== "manual" && (r.breath = this.breathValue(e), t < this.tap.until && (r.fingerTap = Math.max(0, Math.sin((this.tap.until - t) * Math.PI * 3.6)) ** 2));
    let a = null, s = 0;
    if (this.play) {
      const v = at[this.play.id];
      if (this.play.t += e, this.play.t >= v.dur)
        this.play = null, this.onMotion?.(null);
      else {
        a = {};
        for (const [h, u] of Object.entries(v.tracks))
          a[h] = zn(u, this.play.t) * (v.idle && qn.test(h) ? Dt.amp : 1);
        s = qe(0, 0.15, this.play.t) * (1 - qe(v.dur - 0.25, v.dur, this.play.t));
        for (const [h, u] of Object.entries(a))
          $n.has(h) ? r[h] += u : h === "breath" ? r[h] += (u - r[h]) * s : Jn.has(h) || (r[h] = Math.max(r[h], Math.max(0, u)));
      }
    }
    this.mode !== "manual" && (r.angleY += r.breath * 1.6);
    const l = nn[this.expr].p, f = ["eyeOpen", "eyeOpenL", "eyeSmileL", "eyeSmile", "mouthOpen", "mouthForm", "blush", "browY", "browAngle", "gx", "gy"], y = {
      eyeOpen: l.eyeOpen ?? 1,
      eyeOpenL: l.eyeOpenL ?? l.eyeOpen ?? 1,
      eyeSmileL: l.eyeSmileL ?? l.eyeSmile ?? 0,
      eyeSmile: l.eyeSmile ?? 0,
      mouthOpen: l.mouthOpen ?? 0,
      mouthForm: l.mouthForm ?? 0,
      blush: l.blush ?? 0,
      browY: l.browY ?? 0,
      browAngle: l.browAngle ?? 0,
      gx: l.glance?.[0] ?? 0,
      gy: l.glance?.[1] ?? 0
    }, d = 1 - Math.exp(-e * 9);
    for (const v of f)
      this.exprMix[v] === void 0 && (this.exprMix[v] = y[v]), this.exprMix[v] += (y[v] - this.exprMix[v]) * d;
    const m = this.exprMix, c = {};
    for (const v of Ge) {
      const h = v.id;
      if (this.mode === "manual" && !a) {
        c[h] = r[h], this.cur[h] = r[h], this.vel[h] = 0;
        continue;
      }
      let [u, w] = Kn[h] ?? [120, 0.95];
      a && /^angle|^body/.test(h) && (at[this.play?.id ?? ""]?.idle ? (u *= Dt.stiff, w = 0.8) : /^angle/.test(h) && (u *= 4.5, w = 0.75));
      const o = 2 * Math.sqrt(u) * w;
      this.vel[h] += (u * (r[h] - this.cur[h]) - o * this.vel[h]) * e, this.cur[h] += this.vel[h] * e, c[h] = this.cur[h];
    }
    let p = 1;
    if (this.mode !== "manual" ? (p = this.blinkValue(e), c.eyeROpen = m.eyeOpen * p, c.eyeLOpen = m.eyeOpenL * p, c.eyeSmile = m.eyeSmile, c.eyeSmileL = m.eyeSmileL, c.mouthOpen = m.mouthOpen, c.mouthForm = m.mouthForm, c.blush = m.blush, c.browY = m.browY + (c.angleY > 0 ? c.angleY / 60 : 0) - (1 - p) * 0.18, c.browAngle = m.browAngle, c.gazeX = pe(c.gazeX + m.gx, -1, 1), c.gazeY = pe(c.gazeY + m.gy, -1, 1)) : c.eyeSmileL = c.eyeSmile, a) {
      const v = (u, w) => {
        c[u] += (w - c[u]) * s;
      }, h = (u) => Math.min(1.3, Math.max(0, u));
      "eyeOpen" in a && (v("eyeROpen", h(a.eyeOpen) * p), "eyeOpenL" in a || v("eyeLOpen", h(a.eyeOpen) * p)), "eyeOpenL" in a && v("eyeLOpen", h(a.eyeOpenL) * p), "eyeSmile" in a && (v("eyeSmile", a.eyeSmile), "eyeSmileL" in a || v("eyeSmileL", a.eyeSmile)), "eyeSmileL" in a && v("eyeSmileL", a.eyeSmileL);
      for (const u of ["mouthOpen", "mouthForm", "blush", "browY", "browAngle"])
        u in a && v(u, u === "mouthOpen" || u === "blush" ? Math.max(0, a[u]) : a[u]);
    }
    const b = this.speechMouth(e);
    return b ? (this.lipOpen = b[0], this.lipForm = b[1]) : this.lipOpen !== null && !this.speaking && !this.kana && (this.lipOpen = null), this.lipOpen !== null && (c.mouthOpen = Math.max(c.mouthOpen * 0.3, this.lipOpen), c.mouthForm = pe(this.lipForm, -1, 1)), this.P = c, c;
  }
}
const Rt = {
  neutral: "normal",
  smile: "smile",
  shy: "shy",
  surprise: "surprise",
  halfLidded: "jito",
  angry: "angryTalk",
  sad: "sadTalk",
  wink: "wink"
}, er = { sad: { pitch: -6, gy: -0.45 } }, Ne = (n, e, t) => Math.max(e, Math.min(t, n)), Xe = Object.freeze({ eyeOpen: 1, eyeOpenL: 1, eyeSmile: 0, eyeSmileL: 0, blush: 0, browY: 0, browAngle: 0, mouthOpen: 0, gx: 0, gy: 0, pitch: 0 });
function tr(n) {
  const e = nn[Rt[n]]?.p ?? {}, t = er[n] ?? {};
  return {
    eyeOpen: e.eyeOpen ?? 1,
    eyeOpenL: e.eyeOpenL ?? e.eyeOpen ?? 1,
    eyeSmile: e.eyeSmile ?? 0,
    eyeSmileL: e.eyeSmileL ?? e.eyeSmile ?? 0,
    blush: e.blush ?? 0,
    browY: e.browY ?? 0,
    browAngle: e.browAngle ?? 0,
    mouthOpen: e.mouthOpen ?? 0,
    gx: e.glance?.[0] ?? 0,
    gy: t.gy ?? e.glance?.[1] ?? 0,
    pitch: t.pitch ?? 0
  };
}
function nr(n, e) {
  const t = { ...n };
  return t.eyeROpen = (n.eyeROpen ?? 1) * e.eyeOpen, t.eyeLOpen = (n.eyeLOpen ?? 1) * e.eyeOpenL, t.eyeSmile = Math.max(n.eyeSmile ?? 0, e.eyeSmile), t.eyeSmileL = Math.max(n.eyeSmileL ?? n.eyeSmile ?? 0, e.eyeSmileL), t.blush = Math.max(n.blush ?? 0, e.blush), t.browY = Ne((n.browY ?? 0) + e.browY, -1, 1), t.browAngle = Ne((n.browAngle ?? 0) + e.browAngle, -1, 1), t.mouthOpen = Math.max(n.mouthOpen ?? 0, e.mouthOpen), t.gazeX = Ne((n.gazeX ?? 0) + e.gx, -1, 1), t.gazeY = Ne((n.gazeY ?? 0) + e.gy, -1, 1), t.angleY = Ne((n.angleY ?? 0) + e.pitch, -30, 30), t;
}
class rr {
  /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
  name = "neutral";
  mix = { ...Xe };
  /** @param {string} name */
  set(e) {
    this.name = Object.hasOwn(Rt, e) ? (
      /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
      e
    ) : "neutral";
  }
  /** True while an expression is shown or still fading out. */
  get active() {
    return this.name !== "neutral" || Object.keys(Xe).some((e) => Math.abs(this.mix[e] - Xe[e]) > 1e-3);
  }
  apply(e, t) {
    if (!this.active)
      return this.mix = { ...Xe }, e;
    const r = tr(this.name), a = 1 - Math.exp(-Math.max(0, t) * 12);
    for (const s of Object.keys(Xe)) this.mix[s] += (r[s] - this.mix[s]) * a;
    return nr(e, this.mix);
  }
}
const Wt = ["ball", "low", "crease", "lash"], ot = /* @__PURE__ */ new Map(), st = /* @__PURE__ */ new Map();
async function it(n) {
  return st.has(n) || st.set(n, fetch(n).then((e) => {
    if (!e.ok) throw new Error(`failed to load ${n}`);
    return e.json();
  })), st.get(n);
}
function lt(n) {
  if (ot.has(n)) return ot.get(n);
  const e = new Promise((t, r) => {
    const a = new Image();
    a.onload = () => t(a), a.onerror = () => r(new Error(`failed to load ${n}`)), a.src = n;
  });
  return ot.set(n, e), e;
}
function rn(n, e) {
  const t = document.createElement("canvas");
  t.width = n.width, t.height = n.height;
  const r = t.getContext("2d");
  r.drawImage(n, 0, 0);
  const a = r.getImageData(0, 0, t.width, t.height).data, s = new Uint8Array(t.width * t.height);
  for (let l = 0; l < s.length; l++) s[l] = a[l * 4 + e];
  return s;
}
const Fe = (n) => rn(n, 3);
function ar(n, [e, t, r, a]) {
  const s = document.createElement("canvas");
  return s.width = r, s.height = a, s.getContext("2d").drawImage(n, e, t, r, a, 0, 0, r, a), s;
}
function or(n, e) {
  const [t, r] = n.t.pivot, a = n.dir, s = n.pts, l = (b, v, h) => {
    const u = Math.min(1, Math.max(0, (h - b) / (v - b)));
    return u * u * (3 - 2 * u);
  }, f = Math.cos(n.phi[0]), y = Math.sin(n.phi[0]), d = Math.cos(n.phi[1]), m = Math.sin(n.phi[1]), c = e.rest, p = e.pos;
  for (let b = 0; b < c.length; b += 2) {
    const v = c[b] - t, h = c[b + 1] - r, u = v * a[0] + h * a[1], w = s[0][0] + v * f - h * y, o = s[0][1] + v * y + h * f, i = v - a[0] * n.L1, S = h - a[1] * n.L1, g = s[1][0] + i * d - S * m, A = s[1][1] + i * m + S * d, L = l(n.L1 * 0.55, n.L1 * 1.35, u);
    p[b] = w + (g - w) * L, p[b + 1] = o + (A - o) * L;
  }
}
async function sr(n, e) {
  if (!e.assets && e.assetsBase === void 0)
    throw new Error("createMeshAvatar requires assets or assetsBase.");
  const t = e.rig, r = xn(t), {
    IMG: a,
    EYES: s,
    baseWeights: l,
    deformBase: f,
    eyePartY: y,
    eyePartAlpha: d,
    handWeights: m,
    handFrame: c,
    deformHand: p,
    TASSELS: b
  } = r, { Renderer: v, buildGrid: h } = Un(r, t), { Physics: u } = Yn(r, t), { createSprites: w } = jn(r, t), o = (e.assetsBase ?? "").replace(/\/?$/, "/"), i = (E, R) => {
    if (e.assets) {
      if (!e.assets[E]) throw new Error(`Missing project asset: ${E}`);
      return e.assets[E];
    }
    return `${o}${E}${R === void 0 ? "" : `?b=${R}`}`;
  }, S = await it(i("layers.json")), g = ["base", ...t.hand ? ["hand"] : [], ...b.map((E) => E.name), ...[0, 1].flatMap((E) => Wt.map((R) => `eye${E}_${R}`)), "hairmask"], A = Object.fromEntries(await Promise.all(g.map(async (E) => [E, await lt(i(`${E}.png`, S.build))]))), L = rn(A.hairmask, 0), B = (E, R) => L[Math.min(a.h - 1, Math.max(0, Math.round(R))) * a.w + Math.min(a.w - 1, Math.max(0, Math.round(E)))] / 255, j = new v(n, { padTop: e.padTop ?? t.view.padTop, padSide: e.padSide ?? t.view.padSide, fit: e.fit }), k = { base: [0, 0, a.w, a.h], ...S.layers }, U = h(k.base, t.mesh.baseCell, Fe(A.base), A.base.width, t.mesh.fine), O = [];
  for (let E = 0; E < U.rest.length / 2; E++) {
    const R = U.rest[E * 2], J = U.rest[E * 2 + 1];
    O.push(l(R, J, B(R, J)));
  }
  j.addLayer("base", A.base, U, { face: !0 });
  const $ = [];
  s.forEach((E, R) => {
    for (const J of Wt) {
      const te = `eye${R}_${J}`, ee = h(k[te], J === "ball" ? t.mesh.eyeBallCell : t.mesh.eyeCell, Fe(A[te]), A[te].width), se = [];
      for (let ce = 0; ce < ee.rest.length / 2; ce++) se.push(l(ee.rest[ce * 2], ee.rest[ce * 2 + 1], 0));
      const le = j.addLayer(te, A[te], ee, { eyeBall: J === "ball" ? R : void 0 });
      $.push({ e: E, eye: R, part: J, mesh: ee, W: se, layer: le });
    }
  });
  let D = null;
  try {
    {
      const E = await it(i("sprites/sprites.json")), R = Object.fromEntries(await Promise.all(Object.keys(E.layers).map(async (J) => [J, await lt(i(`sprites/${J}.png`, E.build))])));
      D = w(j, E, R, h, Fe);
    }
  } catch (E) {
    console.warn("eye / mouth sprites not loaded:", E);
  }
  let q = null;
  try {
    const E = await it(i("overlays/overlays.json")), R = Object.fromEntries(await Promise.all(E.overlays.map(async (J) => [J.name, await lt(i(`overlays/${J.file}`))])));
    q = Xn(j, E, R, h, Fe, l, t.mesh.spriteCell, a.w, a.h, ar);
  } catch (E) {
    e.assets?.["overlays/overlays.json"] && console.warn("overlay layers not loaded:", E);
  }
  const N = b.map((E) => {
    const R = h(k[E.name], t.mesh.tasselCell, Fe(A[E.name]), A[E.name].width);
    return j.addLayer(E.name, A[E.name], R);
  }), P = t.hand ? h(k.hand, t.mesh.handCell, Fe(A.hand), A.hand.width) : { rest: [], pos: [] }, H = [];
  for (let E = 0; E < P.rest.length / 2; E++) H.push(m(P.rest[E * 2], P.rest[E * 2 + 1]));
  t.hand && j.addLayer("hand", A.hand, P);
  const G = new u(), z = new Qn(t.view.gazeCenter ?? [t.head.cx, t.head.cy]);
  e.lipSync !== void 0 && z.setLipSync(e.lipSync);
  const W = /* @__PURE__ */ new Set();
  z.onMotion = (E) => {
    for (const R of W) R(E);
  };
  let I = {}, V = 1, K = {};
  const x = new rr(), M = [0, 0];
  function T(E) {
    const R = { ...z.update(E) };
    for (const [te, ee] of Object.entries(I)) R[te] = V === 1 ? ee : (R[te] ?? 0) + (ee - (R[te] ?? 0)) * V;
    z.lipOpen !== null && (R.mouthOpen = z.P.mouthOpen, (!e.preserveMouthForm || I.mouthForm === void 0) && (R.mouthForm = z.P.mouthForm));
    const J = x.apply(R, E);
    return K = J, J;
  }
  function _(E) {
    const R = T(E), J = G.step(R, E), te = U.pos, ee = U.rest;
    for (let Q = 0; Q < O.length; Q++)
      f(ee[Q * 2], ee[Q * 2 + 1], O[Q], R, J, M), te[Q * 2] = M[0], te[Q * 2 + 1] = M[1];
    const se = (Q, ke) => D?.eyesDrawn[ke] ? 1 : Q;
    for (const Q of $) {
      const ke = se(Q.eye === 0 ? R.eyeROpen : R.eyeLOpen, Q.eye), Ft = Q.eye === 0 ? R.eyeSmile : R.eyeSmileL ?? R.eyeSmile;
      Q.layer.alpha = d(Q.part, ke, Ft);
      const Bt = Q.mesh.rest, Ut = Q.mesh.pos;
      for (let Oe = 0; Oe < Q.W.length; Oe++) {
        const Yt = Bt[Oe * 2], vn = Bt[Oe * 2 + 1];
        f(Yt, y(Q.e, Q.part, Yt, vn, ke, Ft), Q.W[Oe], R, J, M), Ut[Oe * 2] = M[0], Ut[Oe * 2 + 1] = M[1];
      }
    }
    const le = D?.update(R, J, E, In(x.name, z.mode === "manual" ? null : z.expr));
    if (le) for (const Q of $) le.eyes[Q.eye] && (Q.layer.alpha = 0);
    q?.update(R, J, f, M);
    const ce = P.pos, je = P.rest, _e = c(R);
    for (let Q = 0; Q < H.length; Q++)
      p(je[Q * 2], je[Q * 2 + 1], H[Q], R, _e, M), ce[Q * 2] = M[0], ce[Q * 2 + 1] = M[1];
    G.chains.forEach((Q, ke) => or(Q, N[ke].mesh));
    const Ze = 7;
    j.draw({
      angleX: R.angleX,
      angleY: R.angleY,
      angleZ: R.angleZ,
      eyes: [
        se(R.eyeROpen, 0),
        R.eyeSmile,
        R.gazeX * Ze,
        -R.gazeY * Ze * 0.6,
        se(R.eyeLOpen, 1),
        R.eyeSmileL ?? R.eyeSmile,
        R.gazeX * Ze * 0.85,
        -R.gazeY * Ze * 0.6
      ],
      // with sprites the drawn mouths replace the shader-painted one
      mouthOpen: le?.mouthDrawn ? 0 : R.mouthOpen,
      mouthForm: R.mouthForm,
      cheek: R.blush,
      showMesh: !1,
      originalAlpha: 0,
      joints: []
    });
  }
  let Y = 0, X = performance.now(), F = !1;
  const C = (E) => {
    const R = Math.min(0.05, (E - X) / 1e3);
    X = E, _(R), Y = requestAnimationFrame(C);
  };
  return e.manual || (Y = requestAnimationFrame(C)), {
    motions: [
      ...Object.entries(Tt).map(([E, R]) => ({ id: E, label: R.label, idle: !1 })),
      ...Object.entries(Ot).map(([E, R]) => ({ id: E, label: R.label, idle: !0 }))
    ],
    setParameters(E, R = 1) {
      I = { ...E }, V = Math.min(1, Math.max(0, Number(R) || 0));
    },
    getParameters() {
      return { ...K };
    },
    /** 0..1 loudness of the voice being played (e.g. normalised RMS). */
    setVoiceLevel(E) {
      z.setVoiceLevel(E);
    },
    /** Partial mouth-movement settings; omitted fields retain their current values. */
    setLipSync(E) {
      z.setLipSync(E);
    },
    /** true while TTS audio is playing: idle motions pause and the head nods along. */
    setSpeaking(E) {
      z.setSpeaking(E);
    },
    /** AITuber OnAir emotion tag: happy / sad / angry / surprised / relaxed / neutral (or null). */
    setEmotion(E, R) {
      z.setEmotion(E, R);
    },
    /** Live expression layered over tracking (see OVERLAY_EXPRESSIONS); 'neutral' clears it. */
    setExpression(E) {
      x.set(E);
    },
    /** Show the named overlay layers (built/overlays/overlays.json) and hide the others. */
    setOverlays(E) {
      q?.set(E);
    },
    getExpression() {
      return { name: x.name, active: x.active };
    },
    /** How much the head moves with the voice while speaking (1 = default, calmer below). */
    setTalkGain(E) {
      z.talkGain = Math.max(0, Number(E) || 0);
    },
    /** Play a motion or idle motion by id (see `motions`). */
    play(E) {
      z.hasMotion(E) && z.playMotion(E);
    },
    /** Move the mouth through the vowels of kana text (no audio; for previews). */
    speakKana(E, R) {
      z.speakKana(String(E ?? ""), R);
    },
    holdMouth(E) {
      z.holdMouth(E);
    },
    stopLipSync() {
      z.stopLipSync();
    },
    getLipSyncState() {
      return z.getLipSyncState();
    },
    setAutoIdle(E) {
      z.autoIdle = !!E;
    },
    setLighting(E) {
      j.setLighting(E);
    },
    getLightingStats() {
      return { ...j.lightingStats };
    },
    setAutoMotion(E) {
      z.autoMotion = !!E;
    },
    /** Hair / tassel sway multiplier (1 = default). */
    setSwayGain(E) {
      G.gain = E;
    },
    /** Called with the motion id when a motion starts and with null when it ends. */
    onMotion(E) {
      return W.add(E), () => W.delete(E);
    },
    /** Advance the simulation by `sec` and draw (for tests / hidden tabs). */
    advance(E, R = 60) {
      if (!F)
        if (E === 0) _(0);
        else for (let J = 0; J < Math.round(E * R); J++) _(1 / R);
    },
    /** Update motion and lip sync without drawing a hidden preview. */
    advanceParameters(E) {
      F || T(E);
    },
    destroy() {
      F || (F = !0, cancelAnimationFrame(Y), W.clear(), j.destroy());
    }
  };
}
const Yr = Object.keys(Rt);
async function ir(n, e) {
  return sr(n, { ...e, rig: Et(e.rig) });
}
function Ye(n) {
  if (!n || typeof n != "object" || Array.isArray(n))
    throw new Error("avatar.json: expected an object");
  const e = n, t = [];
  e.format !== "mesh-avatar" && t.push('avatar.json.format: expected "mesh-avatar"'), e.version !== 1 && t.push(`avatar.json.version: unsupported version ${JSON.stringify(e.version) ?? "missing"} (expected 1)`), (typeof e.name != "string" || !e.name.trim()) && t.push("avatar.json.name: expected a non-empty string");
  const r = { format: "mesh-avatar", version: 1, name: e.name };
  for (const a of ["author", "license", "thumbnail", "source"])
    e[a] !== void 0 && (typeof e[a] != "string" ? t.push(`avatar.json.${a}: expected a string`) : r[a] = e[a]);
  if (e.studio !== void 0) {
    const a = e.studio;
    !a || typeof a != "object" || Array.isArray(a) || !("version" in a) || typeof a.version != "string" || !a.version.trim() ? t.push("avatar.json.studio.version: expected a non-empty string") : r.studio = { version: a.version };
  }
  if (e.lipSync !== void 0)
    try {
      r.lipSync = St(e.lipSync);
    } catch (a) {
      t.push(`avatar.json.lipSync: ${a instanceof Error ? a.message : String(a)}`);
    }
  if (t.length) throw new Error(t.join(`
`));
  return r;
}
function an(n) {
  return Ye({ format: "mesh-avatar", version: 1, name: n });
}
const Je = (n) => !!n && typeof n == "object" && !Array.isArray(n), Re = (n, e) => Array.isArray(n) && n.length === e && n.every((t) => typeof t == "number" && Number.isFinite(t)), ct = (n, e) => Object.hasOwn(n, e);
function on(n) {
  const e = [];
  function t(b, v = !0) {
    if (!ct(n, b)) {
      v && e.push(`${b}: missing file`);
      return;
    }
    const h = n[b];
    if (!(h instanceof Uint8Array)) {
      e.push(`${b}: JSON bytes are required`);
      return;
    }
    let u;
    try {
      u = JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(h));
    } catch {
      e.push(`${b}: invalid UTF-8 JSON`);
      return;
    }
    if (!Je(u)) {
      e.push(`${b}: expected an object`);
      return;
    }
    return u;
  }
  function r(b, v, h = !0) {
    return b.version === 1 || h && b.version === void 0 ? !0 : (e.push(`${v}.version: unsupported version ${JSON.stringify(b.version) ?? "missing"} (expected 1)`), !1);
  }
  function a(b) {
    if (!ct(n, b)) {
      e.push(`${b}: missing file`);
      return;
    }
    const v = n[b], h = v instanceof Uint8Array ? v.byteLength : v?.size;
    (!Number.isSafeInteger(h) || h <= 0) && e.push(`${b}: expected a non-empty file`);
  }
  function s(b, v, h, u) {
    if (!Je(b)) {
      e.push(`${v}.layers: expected a layer rectangle map`);
      return;
    }
    for (const [w, o] of Object.entries(b)) {
      const i = `${v}.layers.${w}`;
      if (!/^[A-Za-z0-9_-]+$/.test(w)) {
        e.push(`${i}: expected a safe layer name (letters, digits, hyphens or underscores)`);
        continue;
      }
      !Re(o, 4) || !o.every(Number.isInteger) || o[0] < 0 || o[1] < 0 || o[2] <= 0 || o[3] <= 0 ? e.push(`${i}: expected [x, y, width, height] with non-negative integer origins and positive integer dimensions`) : u && (o[0] + o[2] > u[0] || o[1] + o[3] > u[1]) && e.push(`${i}: rectangle must stay inside the image`), a(`${h}/${w}.png`);
    }
    return b;
  }
  function l(b, v) {
    (typeof b.build != "string" || !b.build.trim()) && e.push(`${v}.build: expected a non-empty string`);
  }
  const f = t("avatar.json", !1);
  if (f)
    try {
      Ye(f);
    } catch (b) {
      e.push(b.message);
    }
  const y = t("rig.json");
  let d;
  if (y && r(y, "rig.json", !1)) {
    const b = en(y);
    e.push(...b.map((v) => `rig.json: ${v}`)), b.length || (d = y);
  }
  a("built/base.png"), a("built/hairmask.png");
  const m = t("built/layers.json");
  if (m && r(m, "built/layers.json")) {
    l(m, "built/layers.json");
    let b;
    !Re(m.size, 2) || !m.size.every((h) => Number.isInteger(h) && h > 0) ? e.push("built/layers.json.size: expected [width, height] with positive integer dimensions") : (b = m.size, d && (b[0] !== d.image.width || b[1] !== d.image.height) && e.push("built/layers.json.size: must match rig.json.image"));
    const v = s(m.layers, "built/layers.json", "built", b);
    if (d && v) {
      const h = [
        ...d.eyes.flatMap((u, w) => ["ball", "low", "crease", "lash"].map((o) => `eye${w}_${o}`)),
        ...d.hand ? ["hand"] : [],
        ...(d.accessories ?? []).map((u) => u.name)
      ];
      for (const u of h) ct(v, u) || e.push(`built/layers.json.layers.${u}: missing required layer`);
    }
    !Array.isArray(m.eyes) || m.eyes.length !== 2 ? e.push("built/layers.json.eyes: expected two eye curves") : m.eyes.forEach((h, u) => {
      const w = `built/layers.json.eyes[${u}]`;
      if (!Je(h)) {
        e.push(`${w}: expected an object`);
        return;
      }
      Re([h.x0, h.x1], 2) && h.x0 < h.x1 || e.push(`${w}: expected finite x0 < x1`);
      for (const i of ["top", "bot"])
        Re(h[i], 24) || e.push(`${w}.${i}: expected 24 finite numbers`);
      if (Re(h.top, 24) && Re(h.bot, 24) && h.top.some((i, S) => i > h.bot[S]) && e.push(`${w}.top: must not exceed bottom curve`), d) for (const i of ["x0", "x1", "top", "bot"]) {
        const S = h[i], g = d.eyes[u][i];
        (Array.isArray(g) ? Re(S, g.length) && S.every((L, B) => L === g[B]) : S === g) || e.push(`${w}.${i}: must match rig.json.eyes[${u}].${i}`);
      }
    });
  }
  const c = t("built/sprites/sprites.json", !1);
  c && r(c, "built/sprites/sprites.json") && (l(c, "built/sprites/sprites.json"), s(c.layers, "built/sprites/sprites.json", "built/sprites", d ? [d.image.width, d.image.height] : void 0));
  const p = t("built/overlays/overlays.json", !1);
  if (p && r(p, "built/overlays/overlays.json"))
    if (!Array.isArray(p.overlays)) e.push("built/overlays/overlays.json.overlays: expected an array");
    else {
      const b = /* @__PURE__ */ new Set();
      for (const [v, h] of p.overlays.entries()) {
        const u = `built/overlays/overlays.json.overlays[${v}]`;
        if (!Je(h) || typeof h.name != "string" || !/^[A-Za-z0-9_-]+$/.test(h.name) || typeof h.file != "string" || !/^[A-Za-z0-9_-]+\.png$/.test(h.file)) {
          e.push(`${u}: expected { name, file } with safe names`);
          continue;
        }
        b.has(h.name) && e.push(`${u}.name: duplicate overlay name`), b.add(h.name), a(`built/overlays/${h.file}`);
      }
    }
  return e;
}
var ae = Uint8Array, fe = Uint16Array, Lt = Int32Array, et = new ae([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), tt = new ae([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), dt = new ae([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), sn = function(n, e) {
  for (var t = new fe(31), r = 0; r < 31; ++r)
    t[r] = e += 1 << n[r - 1];
  for (var a = new Lt(t[30]), r = 1; r < 30; ++r)
    for (var s = t[r]; s < t[r + 1]; ++s)
      a[s] = s - t[r] << 5 | r;
  return { b: t, r: a };
}, ln = sn(et, 2), cn = ln.b, gt = ln.r;
cn[28] = 258, gt[258] = 28;
var hn = sn(tt, 0), lr = hn.b, Gt = hn.r, yt = new fe(32768);
for (var re = 0; re < 32768; ++re) {
  var Se = (re & 43690) >> 1 | (re & 21845) << 1;
  Se = (Se & 52428) >> 2 | (Se & 13107) << 2, Se = (Se & 61680) >> 4 | (Se & 3855) << 4, yt[re] = ((Se & 65280) >> 8 | (Se & 255) << 8) >> 1;
}
var xe = (function(n, e, t) {
  for (var r = n.length, a = 0, s = new fe(e); a < r; ++a)
    n[a] && ++s[n[a] - 1];
  var l = new fe(e);
  for (a = 1; a < e; ++a)
    l[a] = l[a - 1] + s[a - 1] << 1;
  var f;
  if (t) {
    f = new fe(1 << e);
    var y = 15 - e;
    for (a = 0; a < r; ++a)
      if (n[a])
        for (var d = a << 4 | n[a], m = e - n[a], c = l[n[a] - 1]++ << m, p = c | (1 << m) - 1; c <= p; ++c)
          f[yt[c] >> y] = d;
  } else
    for (f = new fe(r), a = 0; a < r; ++a)
      n[a] && (f[a] = yt[l[n[a] - 1]++] >> 15 - n[a]);
  return f;
}), Te = new ae(288);
for (var re = 0; re < 144; ++re)
  Te[re] = 8;
for (var re = 144; re < 256; ++re)
  Te[re] = 9;
for (var re = 256; re < 280; ++re)
  Te[re] = 7;
for (var re = 280; re < 288; ++re)
  Te[re] = 8;
var De = new ae(32);
for (var re = 0; re < 32; ++re)
  De[re] = 5;
var cr = /* @__PURE__ */ xe(Te, 9, 0), hr = /* @__PURE__ */ xe(Te, 9, 1), ur = /* @__PURE__ */ xe(De, 5, 0), fr = /* @__PURE__ */ xe(De, 5, 1), ht = function(n) {
  for (var e = n[0], t = 1; t < n.length; ++t)
    n[t] > e && (e = n[t]);
  return e;
}, de = function(n, e, t) {
  var r = e / 8 | 0;
  return (n[r] | n[r + 1] << 8) >> (e & 7) & t;
}, ut = function(n, e) {
  var t = e / 8 | 0;
  return (n[t] | n[t + 1] << 8 | n[t + 2] << 16) >> (e & 7);
}, _t = function(n) {
  return (n + 7) / 8 | 0;
}, He = function(n, e, t) {
  return (e == null || e < 0) && (e = 0), (t == null || t > n.length) && (t = n.length), new ae(n.subarray(e, t));
}, mr = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], he = function(n, e, t) {
  var r = new Error(e || mr[n]);
  if (r.code = n, Error.captureStackTrace && Error.captureStackTrace(r, he), !t)
    throw r;
  return r;
}, pr = function(n, e, t, r) {
  var a = n.length, s = r ? r.length : 0;
  if (!a || e.f && !e.l)
    return t || new ae(0);
  var l = !t, f = l || e.i != 2, y = e.i;
  l && (t = new ae(a * 3));
  var d = function(F) {
    var C = t.length;
    if (F > C) {
      var Z = new ae(Math.max(C * 2, F));
      Z.set(t), t = Z;
    }
  }, m = e.f || 0, c = e.p || 0, p = e.b || 0, b = e.l, v = e.d, h = e.m, u = e.n, w = a * 8;
  do {
    if (!b) {
      m = de(n, c, 1);
      var o = de(n, c + 1, 3);
      if (c += 3, o)
        if (o == 1)
          b = hr, v = fr, h = 9, u = 5;
        else if (o == 2) {
          var A = de(n, c, 31) + 257, L = de(n, c + 10, 15) + 4, B = A + de(n, c + 5, 31) + 1;
          c += 14;
          for (var j = new ae(B), k = new ae(19), U = 0; U < L; ++U)
            k[dt[U]] = de(n, c + U * 3, 7);
          c += L * 3;
          for (var O = ht(k), $ = (1 << O) - 1, D = xe(k, O, 1), U = 0; U < B; ) {
            var q = D[de(n, c, $)];
            c += q & 15;
            var i = q >> 4;
            if (i < 16)
              j[U++] = i;
            else {
              var N = 0, P = 0;
              for (i == 16 ? (P = 3 + de(n, c, 3), c += 2, N = j[U - 1]) : i == 17 ? (P = 3 + de(n, c, 7), c += 3) : i == 18 && (P = 11 + de(n, c, 127), c += 7); P--; )
                j[U++] = N;
            }
          }
          var H = j.subarray(0, A), G = j.subarray(A);
          h = ht(H), u = ht(G), b = xe(H, h, 1), v = xe(G, u, 1);
        } else
          he(1);
      else {
        var i = _t(c) + 4, S = n[i - 4] | n[i - 3] << 8, g = i + S;
        if (g > a) {
          y && he(0);
          break;
        }
        f && d(p + S), t.set(n.subarray(i, g), p), e.b = p += S, e.p = c = g * 8, e.f = m;
        continue;
      }
      if (c > w) {
        y && he(0);
        break;
      }
    }
    f && d(p + 131072);
    for (var z = (1 << h) - 1, W = (1 << u) - 1, I = c; ; I = c) {
      var N = b[ut(n, c) & z], V = N >> 4;
      if (c += N & 15, c > w) {
        y && he(0);
        break;
      }
      if (N || he(2), V < 256)
        t[p++] = V;
      else if (V == 256) {
        I = c, b = null;
        break;
      } else {
        var K = V - 254;
        if (V > 264) {
          var U = V - 257, x = et[U];
          K = de(n, c, (1 << x) - 1) + cn[U], c += x;
        }
        var M = v[ut(n, c) & W], T = M >> 4;
        M || he(3), c += M & 15;
        var G = lr[T];
        if (T > 3) {
          var x = tt[T];
          G += ut(n, c) & (1 << x) - 1, c += x;
        }
        if (c > w) {
          y && he(0);
          break;
        }
        f && d(p + 131072);
        var _ = p + K;
        if (p < G) {
          var Y = s - G, X = Math.min(G, _);
          for (Y + p < 0 && he(3); p < X; ++p)
            t[p] = r[Y + p];
        }
        for (; p < _; ++p)
          t[p] = t[p - G];
      }
    }
    e.l = b, e.p = I, e.b = p, e.f = m, b && (m = 1, e.m = h, e.d = v, e.n = u);
  } while (!m);
  return p != t.length && l ? He(t, 0, p) : t.subarray(0, p);
}, Me = function(n, e, t) {
  t <<= e & 7;
  var r = e / 8 | 0;
  n[r] |= t, n[r + 1] |= t >> 8;
}, $e = function(n, e, t) {
  t <<= e & 7;
  var r = e / 8 | 0;
  n[r] |= t, n[r + 1] |= t >> 8, n[r + 2] |= t >> 16;
}, ft = function(n, e) {
  for (var t = [], r = 0; r < n.length; ++r)
    n[r] && t.push({ s: r, f: n[r] });
  var a = t.length, s = t.slice();
  if (!a)
    return { t: fn, l: 0 };
  if (a == 1) {
    var l = new ae(t[0].s + 1);
    return l[t[0].s] = 1, { t: l, l: 1 };
  }
  t.sort(function(g, A) {
    return g.f - A.f;
  }), t.push({ s: -1, f: 25001 });
  var f = t[0], y = t[1], d = 0, m = 1, c = 2;
  for (t[0] = { s: -1, f: f.f + y.f, l: f, r: y }; m != a - 1; )
    f = t[t[d].f < t[c].f ? d++ : c++], y = t[d != m && t[d].f < t[c].f ? d++ : c++], t[m++] = { s: -1, f: f.f + y.f, l: f, r: y };
  for (var p = s[0].s, r = 1; r < a; ++r)
    s[r].s > p && (p = s[r].s);
  var b = new fe(p + 1), v = vt(t[m - 1], b, 0);
  if (v > e) {
    var r = 0, h = 0, u = v - e, w = 1 << u;
    for (s.sort(function(A, L) {
      return b[L.s] - b[A.s] || A.f - L.f;
    }); r < a; ++r) {
      var o = s[r].s;
      if (b[o] > e)
        h += w - (1 << v - b[o]), b[o] = e;
      else
        break;
    }
    for (h >>= u; h > 0; ) {
      var i = s[r].s;
      b[i] < e ? h -= 1 << e - b[i]++ - 1 : ++r;
    }
    for (; r >= 0 && h; --r) {
      var S = s[r].s;
      b[S] == e && (--b[S], ++h);
    }
    v = e;
  }
  return { t: new ae(b), l: v };
}, vt = function(n, e, t) {
  return n.s == -1 ? Math.max(vt(n.l, e, t + 1), vt(n.r, e, t + 1)) : e[n.s] = t;
}, Vt = function(n) {
  for (var e = n.length; e && !n[--e]; )
    ;
  for (var t = new fe(++e), r = 0, a = n[0], s = 1, l = function(y) {
    t[r++] = y;
  }, f = 1; f <= e; ++f)
    if (n[f] == a && f != e)
      ++s;
    else {
      if (!a && s > 2) {
        for (; s > 138; s -= 138)
          l(32754);
        s > 2 && (l(s > 10 ? s - 11 << 5 | 28690 : s - 3 << 5 | 12305), s = 0);
      } else if (s > 3) {
        for (l(a), --s; s > 6; s -= 6)
          l(8304);
        s > 2 && (l(s - 3 << 5 | 8208), s = 0);
      }
      for (; s--; )
        l(a);
      s = 1, a = n[f];
    }
  return { c: t.subarray(0, r), n: e };
}, ze = function(n, e) {
  for (var t = 0, r = 0; r < e.length; ++r)
    t += n[r] * e[r];
  return t;
}, un = function(n, e, t) {
  var r = t.length, a = _t(e + 2);
  n[a] = r & 255, n[a + 1] = r >> 8, n[a + 2] = n[a] ^ 255, n[a + 3] = n[a + 1] ^ 255;
  for (var s = 0; s < r; ++s)
    n[a + s + 4] = t[s];
  return (a + 4 + r) * 8;
}, qt = function(n, e, t, r, a, s, l, f, y, d, m) {
  Me(e, m++, t), ++a[256];
  for (var c = ft(a, 15), p = c.t, b = c.l, v = ft(s, 15), h = v.t, u = v.l, w = Vt(p), o = w.c, i = w.n, S = Vt(h), g = S.c, A = S.n, L = new fe(19), B = 0; B < o.length; ++B)
    ++L[o[B] & 31];
  for (var B = 0; B < g.length; ++B)
    ++L[g[B] & 31];
  for (var j = ft(L, 7), k = j.t, U = j.l, O = 19; O > 4 && !k[dt[O - 1]]; --O)
    ;
  var $ = d + 5 << 3, D = ze(a, Te) + ze(s, De) + l, q = ze(a, p) + ze(s, h) + l + 14 + 3 * O + ze(L, k) + 2 * L[16] + 3 * L[17] + 7 * L[18];
  if (y >= 0 && $ <= D && $ <= q)
    return un(e, m, n.subarray(y, y + d));
  var N, P, H, G;
  if (Me(e, m, 1 + (q < D)), m += 2, q < D) {
    N = xe(p, b, 0), P = p, H = xe(h, u, 0), G = h;
    var z = xe(k, U, 0);
    Me(e, m, i - 257), Me(e, m + 5, A - 1), Me(e, m + 10, O - 4), m += 14;
    for (var B = 0; B < O; ++B)
      Me(e, m + 3 * B, k[dt[B]]);
    m += 3 * O;
    for (var W = [o, g], I = 0; I < 2; ++I)
      for (var V = W[I], B = 0; B < V.length; ++B) {
        var K = V[B] & 31;
        Me(e, m, z[K]), m += k[K], K > 15 && (Me(e, m, V[B] >> 5 & 127), m += V[B] >> 12);
      }
  } else
    N = cr, P = Te, H = ur, G = De;
  for (var B = 0; B < f; ++B) {
    var x = r[B];
    if (x > 255) {
      var K = x >> 18 & 31;
      $e(e, m, N[K + 257]), m += P[K + 257], K > 7 && (Me(e, m, x >> 23 & 31), m += et[K]);
      var M = x & 31;
      $e(e, m, H[M]), m += G[M], M > 3 && ($e(e, m, x >> 5 & 8191), m += tt[M]);
    } else
      $e(e, m, N[x]), m += P[x];
  }
  return $e(e, m, N[256]), m + P[256];
}, dr = /* @__PURE__ */ new Lt([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]), fn = /* @__PURE__ */ new ae(0), gr = function(n, e, t, r, a, s) {
  var l = s.z || n.length, f = new ae(r + l + 5 * (1 + Math.ceil(l / 7e3)) + a), y = f.subarray(r, f.length - a), d = s.l, m = (s.r || 0) & 7;
  if (e) {
    m && (y[0] = s.r >> 3);
    for (var c = dr[e - 1], p = c >> 13, b = c & 8191, v = (1 << t) - 1, h = s.p || new fe(32768), u = s.h || new fe(v + 1), w = Math.ceil(t / 3), o = 2 * w, i = function(E) {
      return (n[E] ^ n[E + 1] << w ^ n[E + 2] << o) & v;
    }, S = new Lt(25e3), g = new fe(288), A = new fe(32), L = 0, B = 0, j = s.i || 0, k = 0, U = s.w || 0, O = 0; j + 2 < l; ++j) {
      var $ = i(j), D = j & 32767, q = u[$];
      if (h[D] = q, u[$] = D, U <= j) {
        var N = l - j;
        if ((L > 7e3 || k > 24576) && (N > 423 || !d)) {
          m = qt(n, y, 0, S, g, A, B, k, O, j - O, m), k = L = B = 0, O = j;
          for (var P = 0; P < 286; ++P)
            g[P] = 0;
          for (var P = 0; P < 30; ++P)
            A[P] = 0;
        }
        var H = 2, G = 0, z = b, W = D - q & 32767;
        if (N > 2 && $ == i(j - W))
          for (var I = Math.min(p, N) - 1, V = Math.min(32767, j), K = Math.min(258, N); W <= V && --z && D != q; ) {
            if (n[j + H] == n[j + H - W]) {
              for (var x = 0; x < K && n[j + x] == n[j + x - W]; ++x)
                ;
              if (x > H) {
                if (H = x, G = W, x > I)
                  break;
                for (var M = Math.min(W, x - 2), T = 0, P = 0; P < M; ++P) {
                  var _ = j - W + P & 32767, Y = h[_], X = _ - Y & 32767;
                  X > T && (T = X, q = _);
                }
              }
            }
            D = q, q = h[D], W += D - q & 32767;
          }
        if (G) {
          S[k++] = 268435456 | gt[H] << 18 | Gt[G];
          var F = gt[H] & 31, C = Gt[G] & 31;
          B += et[F] + tt[C], ++g[257 + F], ++A[C], U = j + H, ++L;
        } else
          S[k++] = n[j], ++g[n[j]];
      }
    }
    for (j = Math.max(j, U); j < l; ++j)
      S[k++] = n[j], ++g[n[j]];
    m = qt(n, y, d, S, g, A, B, k, O, j - O, m), d || (s.r = m & 7 | y[m / 8 | 0] << 3, m -= 7, s.h = u, s.p = h, s.i = j, s.w = U);
  } else {
    for (var j = s.w || 0; j < l + d; j += 65535) {
      var Z = j + 65535;
      Z >= l && (y[m / 8 | 0] = d, Z = l), m = un(y, m + 1, n.subarray(j, Z));
    }
    s.i = l;
  }
  return He(f, 0, r + _t(m) + a);
}, yr = /* @__PURE__ */ (function() {
  for (var n = new Int32Array(256), e = 0; e < 256; ++e) {
    for (var t = e, r = 9; --r; )
      t = (t & 1 && -306674912) ^ t >>> 1;
    n[e] = t;
  }
  return n;
})(), vr = function() {
  var n = -1;
  return {
    p: function(e) {
      for (var t = n, r = 0; r < e.length; ++r)
        t = yr[t & 255 ^ e[r]] ^ t >>> 8;
      n = t;
    },
    d: function() {
      return ~n;
    }
  };
}, br = function(n, e, t, r, a) {
  if (!a && (a = { l: 1 }, e.dictionary)) {
    var s = e.dictionary.subarray(-32768), l = new ae(s.length + n.length);
    l.set(s), l.set(n, s.length), n = l, a.w = s.length;
  }
  return gr(n, e.level == null ? 6 : e.level, e.mem == null ? a.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(n.length))) * 1.5) : 20 : 12 + e.mem, t, r, a);
}, mn = function(n, e) {
  var t = {};
  for (var r in n)
    t[r] = n[r];
  for (var r in e)
    t[r] = e[r];
  return t;
}, be = function(n, e) {
  return n[e] | n[e + 1] << 8;
}, me = function(n, e) {
  return (n[e] | n[e + 1] << 8 | n[e + 2] << 16 | n[e + 3] << 24) >>> 0;
}, mt = function(n, e) {
  return me(n, e) + me(n, e + 4) * 4294967296;
}, ie = function(n, e, t) {
  for (; t; ++e)
    n[e] = t, t >>>= 8;
};
function xr(n, e) {
  return br(n, e || {}, 0, 0);
}
function wr(n, e) {
  return pr(n, { i: 2 }, e && e.out, e && e.dictionary);
}
var pn = function(n, e, t, r) {
  for (var a in n) {
    var s = n[a], l = e + a, f = r;
    Array.isArray(s) && (f = mn(r, s[1]), s = s[0]), ArrayBuffer.isView(s) ? t[l] = [s, f] : (t[l += "/"] = [new ae(0), f], pn(s, l, t, r));
  }
}, Jt = typeof TextEncoder < "u" && /* @__PURE__ */ new TextEncoder(), bt = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), Ar = 0;
try {
  bt.decode(fn, { stream: !0 }), Ar = 1;
} catch {
}
var Mr = function(n) {
  for (var e = "", t = 0; ; ) {
    var r = n[t++], a = (r > 127) + (r > 223) + (r > 239);
    if (t + a > n.length)
      return { s: e, r: He(n, t - 1) };
    a ? a == 3 ? (r = ((r & 15) << 18 | (n[t++] & 63) << 12 | (n[t++] & 63) << 6 | n[t++] & 63) - 65536, e += String.fromCharCode(55296 | r >> 10, 56320 | r & 1023)) : a & 1 ? e += String.fromCharCode((r & 31) << 6 | n[t++] & 63) : e += String.fromCharCode((r & 15) << 12 | (n[t++] & 63) << 6 | n[t++] & 63) : e += String.fromCharCode(r);
  }
};
function Kt(n, e) {
  var t;
  if (Jt)
    return Jt.encode(n);
  for (var r = n.length, a = new ae(n.length + (n.length >> 1)), s = 0, l = function(d) {
    a[s++] = d;
  }, t = 0; t < r; ++t) {
    if (s + 5 > a.length) {
      var f = new ae(s + 8 + (r - t << 1));
      f.set(a), a = f;
    }
    var y = n.charCodeAt(t);
    y < 128 || e ? l(y) : y < 2048 ? (l(192 | y >> 6), l(128 | y & 63)) : y > 55295 && y < 57344 ? (y = 65536 + (y & 1047552) | n.charCodeAt(++t) & 1023, l(240 | y >> 18), l(128 | y >> 12 & 63), l(128 | y >> 6 & 63), l(128 | y & 63)) : (l(224 | y >> 12), l(128 | y >> 6 & 63), l(128 | y & 63));
  }
  return He(a, 0, s);
}
function Er(n, e) {
  if (e) {
    for (var t = "", r = 0; r < n.length; r += 16384)
      t += String.fromCharCode.apply(null, n.subarray(r, r + 16384));
    return t;
  } else {
    if (bt)
      return bt.decode(n);
    var a = Mr(n), s = a.s, t = a.r;
    return t.length && he(8), s;
  }
}
var Sr = function(n, e) {
  return e + 30 + be(n, e + 26) + be(n, e + 28);
}, Tr = function(n, e, t) {
  var r = be(n, e + 28), a = be(n, e + 30), s = Er(n.subarray(e + 46, e + 46 + r), !(be(n, e + 8) & 2048)), l = e + 46 + r, f = Or(n, l, a, t, me(n, e + 20), me(n, e + 24), me(n, e + 42)), y = f[0], d = f[1], m = f[2];
  return [be(n, e + 10), y, d, s, l + a + be(n, e + 32), m];
}, Or = function(n, e, t, r, a, s, l) {
  var f = a == 4294967295, y = s == 4294967295, d = l == 4294967295, m = e + t, c = f + y + d;
  if (r && c) {
    for (; e + 4 < m; e += 4 + be(n, e + 2))
      if (be(n, e) == 1)
        return [
          f ? mt(n, e + 4 + 8 * y) : a,
          y ? mt(n, e + 4) : s,
          d ? mt(n, e + 4 + 8 * (y + f)) : l,
          1
        ];
    r < 2 && he(13);
  }
  return [a, s, l, 0];
}, xt = function(n) {
  var e = 0;
  if (n)
    for (var t in n) {
      var r = n[t].length;
      r > 65535 && he(9), e += r + 4;
    }
  return e;
}, Qt = function(n, e, t, r, a, s, l, f) {
  var y = r.length, d = t.extra, m = f && f.length, c = xt(d);
  ie(n, e, l != null ? 33639248 : 67324752), e += 4, l != null && (n[e++] = 20, n[e++] = t.os), n[e] = 20, e += 2, n[e++] = t.flag << 1 | (s < 0 && 8), n[e++] = a && 8, n[e++] = t.compression & 255, n[e++] = t.compression >> 8;
  var p = new Date(t.mtime == null ? Date.now() : t.mtime), b = p.getFullYear() - 1980;
  if ((b < 0 || b > 119) && he(10), ie(n, e, b << 25 | p.getMonth() + 1 << 21 | p.getDate() << 16 | p.getHours() << 11 | p.getMinutes() << 5 | p.getSeconds() >> 1), e += 4, s != -1 && (ie(n, e, t.crc), ie(n, e + 4, s < 0 ? -s - 2 : s), ie(n, e + 8, t.size)), ie(n, e + 12, y), ie(n, e + 14, c), e += 16, l != null && (ie(n, e, m), ie(n, e + 6, t.attrs), ie(n, e + 10, l), e += 14), n.set(r, e), e += y, c)
    for (var v in d) {
      var h = d[v], u = h.length;
      ie(n, e, +v), ie(n, e + 2, u), n.set(h, e + 4), e += 4 + u;
    }
  return m && (n.set(f, e), e += m), e;
}, Rr = function(n, e, t, r, a) {
  ie(n, e, 101010256), ie(n, e + 8, t), ie(n, e + 10, t), ie(n, e + 12, r), ie(n, e + 16, a);
};
function Lr(n, e) {
  e || (e = {});
  var t = {}, r = [];
  pn(n, "", t, e);
  var a = 0, s = 0;
  for (var l in t) {
    var f = t[l], y = f[0], d = f[1], m = d.level == 0 ? 0 : 8, c = Kt(l), p = c.length, b = d.comment, v = b && Kt(b), h = v && v.length, u = xt(d.extra);
    p > 65535 && he(11);
    var w = m ? xr(y, d) : y, o = w.length, i = vr();
    i.p(y), r.push(mn(d, {
      size: y.length,
      crc: i.d(),
      c: w,
      f: c,
      m: v,
      u: p != l.length || v && b.length != h,
      o: a,
      compression: m
    })), a += 30 + p + u + o, s += 76 + 2 * (p + u) + (h || 0) + o;
  }
  for (var S = new ae(s + 22), g = a, A = s - a, L = 0; L < r.length; ++L) {
    var c = r[L];
    Qt(S, c.o, c, c.f, c.u, c.c.length);
    var B = 30 + c.f.length + xt(c.extra);
    S.set(c.c, c.o + B), Qt(S, a, c, c.f, c.u, c.c.length, c.o, c.m), a += 16 + B + (c.m ? c.m.length : 0);
  }
  return Rr(S, a, r.length, A, g), S;
}
function _r(n, e) {
  for (var t = {}, r = n.length - 22; me(n, r) != 101010256; --r)
    (!r || n.length - r > 65558) && he(13);
  var a = be(n, r + 8);
  if (!a)
    return {};
  var s = me(n, r + 16), l = me(n, r - 20) == 117853008;
  if (l) {
    var f = me(n, r - 12);
    l = me(n, f) == 101075792, l && (a = me(n, f + 32), s = me(n, f + 48));
  }
  for (var y = e && e.filter, d = 0; d < a; ++d) {
    var m = Tr(n, s, l), c = m[0], p = m[1], b = m[2], v = m[3], h = m[4], u = m[5], w = Sr(n, u);
    s = h, (!y || y({
      name: v,
      size: p,
      originalSize: b,
      compression: c
    })) && (c ? c == 8 ? t[v] = wr(n.subarray(w, w + p), { out: new ae(b) }) : he(14, "unknown compression type " + c) : t[v] = He(n, w, w + p));
  }
  return t;
}
const Qe = 200, wt = 64 * 1024 * 1024, At = new TextDecoder("utf-8", { fatal: !0 });
function kt(n) {
  if (!n || n.startsWith("/") || /^[A-Za-z]:/.test(n) || n.includes("\\") || n.includes("\0") || n.split("/").includes(".."))
    throw new Error(`ZIP entry ${JSON.stringify(n)}: path must be relative, without .. or backslashes`);
}
function Mt(n) {
  const e = new DataView(n.buffer, n.byteOffset, n.byteLength), t = (p = "(archive)") => {
    throw new Error(`ZIP entry ${JSON.stringify(p)}: invalid or truncated ZIP`);
  }, r = (p) => p >= 0 && p + 2 <= n.length ? e.getUint16(p, !0) : t(), a = (p) => p >= 0 && p + 4 <= n.length ? e.getUint32(p, !0) : t();
  let s = n.length - 22;
  for (; s >= Math.max(0, n.length - 65557) && !(a(s) === 101010256 && s + 22 + r(s + 20) === n.length); s--)
    ;
  (s < 0 || s < n.length - 65557) && t(), (r(s + 4) || r(s + 6) || r(s + 8) !== r(s + 10)) && t();
  const l = r(s + 10), f = a(s + 16), y = f + a(s + 12);
  y !== s && t();
  const d = [], m = /* @__PURE__ */ new Set();
  let c = f;
  for (let p = 0; p < l; p++) {
    (c + 46 > y || a(c) !== 33639248) && t();
    const b = r(c + 28), v = c + 46 + b + r(c + 30) + r(c + 32);
    v > y && t();
    let h;
    try {
      h = At.decode(n.subarray(c + 46, c + 46 + b));
    } catch {
      throw new Error("ZIP entry (invalid UTF-8 name): invalid filename");
    }
    if (kt(h), p >= Qe) throw new Error(`ZIP entry ${JSON.stringify(h)}: more than ${Qe} entries`);
    if (m.has(h)) throw new Error(`ZIP entry ${JSON.stringify(h)}: duplicate entry`);
    m.add(h);
    const u = a(c + 24), w = a(c + 20), o = a(c + 42);
    if (u > wt || w > wt) throw new Error(`ZIP entry ${JSON.stringify(h)}: exceeds 64 MB`);
    if (r(c + 10) !== 0) throw new Error(`ZIP entry ${JSON.stringify(h)}: expected stored compression (method 0)`);
    if (r(c + 8) & 1) throw new Error(`ZIP entry ${JSON.stringify(h)}: encrypted entries are not supported`);
    (w !== u || o + 30 > f || a(o) !== 67324752) && t(h);
    const i = o + 30 + r(o + 26) + r(o + 28);
    (i + u > f || r(o + 8) !== 0 || r(o + 6) !== r(c + 8)) && t(h);
    let S;
    try {
      S = At.decode(n.subarray(o + 30, o + 30 + r(o + 26)));
    } catch {
      t(h);
    }
    S !== h && t(h), d.push({ name: h, offset: o, start: i, size: u, central: c }), c = v;
  }
  return c !== y && t(), { files: d };
}
function kr(n) {
  const e = n instanceof Uint8Array ? n : new Uint8Array(n), t = Mt(e), r = _r(e, { filter: (s) => s.name !== "__proto__" }), a = /* @__PURE__ */ Object.create(null);
  for (const s of t.files) {
    const l = s.name === "__proto__" ? e.slice(s.start, s.start + s.size) : r[s.name];
    if (!(l instanceof Uint8Array) || l.length !== s.size) throw new Error(`ZIP entry ${JSON.stringify(s.name)}: invalid size`);
    a[s.name] = l;
  }
  return a;
}
function jr(n, e = {}) {
  const t = Object.hasOwn(n, "avatar.json") ? n["avatar.json"] : void 0, r = t ? Ye(JSON.parse(At.decode(t))) : an("Avatar"), a = t && !e.manifest ? t : new TextEncoder().encode(JSON.stringify(Ye({ ...r, ...e.manifest }), null, 2) + `
`), s = /* @__PURE__ */ Object.create(null);
  s["avatar.json"] = a;
  for (const [p, b] of Object.entries(n)) p !== "avatar.json" && (s[p] = b);
  for (const [p, [b, v]] of Object.entries(s).entries()) {
    if (kt(b), p >= Qe) throw new Error(`ZIP entry ${JSON.stringify(b)}: more than ${Qe} entries`);
    if (v.byteLength > wt) throw new Error(`ZIP entry ${JSON.stringify(b)}: exceeds 64 MB`);
  }
  const l = on(s);
  if (l.length) throw new Error(l.join(`
`));
  let f = "proto0000";
  for (let p = 0; Object.hasOwn(s, f); p++) f = `proto${String(p + 1).padStart(4, "0")}`;
  const y = Object.fromEntries(Object.entries(s).map(([p, b]) => [p === "__proto__" ? f : p, b])), d = Lr(y, { level: 0 });
  if (Object.hasOwn(s, "__proto__")) {
    const p = Mt(d).files.find((v) => v.name === f), b = new TextEncoder().encode("__proto__");
    d.set(b, p.offset + 30), d.set(b, p.central + 46);
  }
  const m = Mt(d), c = m.files.find((p) => p.name === "avatar.json");
  if (c.offset !== 0) {
    const p = c.start + c.size - c.offset, b = new Uint8Array(d.length);
    b.set(d.subarray(c.offset, c.offset + p)), b.set(d.subarray(0, c.offset), p), b.set(d.subarray(c.offset + p), c.offset + p);
    const v = new DataView(b.buffer);
    for (const h of m.files) v.setUint32(h.central + 42, h === c ? 0 : h.offset < c.offset ? h.offset + p : h.offset, !0);
    return b;
  }
  return d;
}
const Fr = (n) => JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(n));
function Be(n, e) {
  try {
    return Fr(n);
  } catch {
    throw new Error(`${e}: invalid UTF-8 JSON`);
  }
}
function dn(n, e, t) {
  return [
    "layers.json",
    "base.png",
    "hairmask.png",
    ...Object.keys(n?.layers ?? {}).map((r) => `${r}.png`),
    ...e ? ["sprites/sprites.json", ...Object.keys(e.layers ?? {}).map((r) => `sprites/${r}.png`)] : [],
    // malformed entries are left to validateAvatarFiles, which reports them
    ...t ? ["overlays/overlays.json", ...(Array.isArray(t.overlays) ? t.overlays : []).flatMap((r) => typeof r?.file == "string" ? [`overlays/${r.file}`] : [])] : []
  ];
}
function gn(n) {
  const e = on(n);
  if (e.length) throw new Error(e.join(`
`));
}
function yn(n) {
  return !!n && typeof n == "object" && "manifest" in n && "rig" in n && "assets" in n && "release" in n;
}
function pt(n) {
  const e = kr(n);
  if (!Object.hasOwn(e, "avatar.json")) throw new Error("avatar.json: missing file in .mavatar archive");
  gn(e);
  const t = Ye(Be(e["avatar.json"], "avatar.json")), r = Et(Be(e["rig.json"], "rig.json")), a = e["built/overlays/overlays.json"] ? Be(e["built/overlays/overlays.json"], "built/overlays/overlays.json") : void 0, s = dn(
    Be(e["built/layers.json"], "built/layers.json"),
    e["built/sprites/sprites.json"] ? Be(e["built/sprites/sprites.json"], "built/sprites/sprites.json") : void 0,
    a
  ), l = {}, f = [], y = () => {
    f.splice(0).forEach((d) => URL.revokeObjectURL(d));
  };
  try {
    for (const d of new Set(s)) {
      const m = URL.createObjectURL(new Blob([new Uint8Array(e[`built/${d}`])], { type: d.endsWith(".json") ? "application/json" : "image/png" }));
      f.push(m), l[d] = m;
    }
  } catch (d) {
    throw y(), d;
  }
  return { manifest: t, rig: r, assets: l, release: y };
}
async function Br(n, e = {}) {
  if (yn(n)) return n;
  if (n instanceof Blob) return pt(await n.arrayBuffer());
  if (n instanceof ArrayBuffer || n instanceof Uint8Array) return pt(n);
  const t = new URL(n, typeof location > "u" ? void 0 : location.href);
  if (/\.mavatar$/i.test(t.pathname)) {
    const u = await fetch(t);
    if (!u.ok) throw new Error(`.mavatar: could not load (${u.status})`);
    return pt(await u.arrayBuffer());
  }
  t.pathname.endsWith("/") || (t.pathname += "/");
  const r = (u) => {
    const w = new URL(t);
    return w.pathname += u.split("/").map(encodeURIComponent).join("/"), e.version !== void 0 && w.searchParams.set("v", String(e.version)), w.href;
  }, a = {};
  async function s(u, w = !1) {
    const o = await fetch(r(u));
    if (w && (o.status === 404 || o.ok && o.headers.get("content-type")?.includes("text/html"))) return;
    if (!o.ok) throw new Error(`${u}: could not load (${o.status})`);
    const i = new Uint8Array(await o.arrayBuffer());
    return a[u] = i, Be(i, u);
  }
  const l = e.rigFile ?? "rig.json";
  kt(l);
  const [f, y, d, m, c] = await Promise.all([
    s(l),
    s("built/layers.json"),
    s("avatar.json", !0),
    s("built/sprites/sprites.json", !0),
    s("built/overlays/overlays.json", !0)
  ]);
  Array.isArray(f?.eyes) && Array.isArray(y?.eyes) && (f.eyes = f.eyes.map((u, w) => {
    if (!u || typeof u != "object") return u;
    const o = { ...u };
    for (const i of ["x0", "x1", "top", "bot"]) o[i] === void 0 && (o[i] = y.eyes[w]?.[i]);
    return o;
  })), a["rig.json"] = new TextEncoder().encode(JSON.stringify(f));
  const p = dn(y, m, c);
  for (const u of p) u.endsWith(".png") && (a[`built/${u}`] = { size: 1 });
  gn(a);
  const b = Et(f), v = Object.fromEntries(p.map((u) => [u, r(`built/${u}`)])), h = decodeURIComponent(t.pathname.split("/").filter(Boolean).at(-1) ?? "Avatar");
  return { manifest: d === void 0 ? an(h) : Ye(d), rig: b, assets: v, release() {
  } };
}
async function Ir(n, e, t = {}) {
  const r = !yn(e), a = await Br(e);
  try {
    const s = t.lipSync === void 0 ? a.manifest.lipSync : { ...a.manifest.lipSync, ...St(t.lipSync) }, l = await ir(n, { ...t, ...s === void 0 ? {} : { lipSync: s }, rig: a.rig, assets: a.assets }), f = l.destroy.bind(l);
    let y = !1;
    return Object.assign(l, { package: a, destroy() {
      if (!y) {
        y = !0;
        try {
          f();
        } finally {
          r && a.release();
        }
      }
    } });
  } catch (s) {
    throw r && a.release(), s;
  }
}
export {
  Ue as DEFAULT_LIGHTING,
  Yr as LIVE_EXPRESSIONS,
  Ge as PARAMS,
  Ur as colorHex,
  ir as createMeshAvatar,
  Ir as loadMeshAvatar,
  Br as openAvatar,
  jr as packAvatar,
  On as parseLighting,
  Ye as parseManifest,
  Et as parseRig,
  kr as unpackAvatar,
  on as validateAvatarFiles,
  en as validateRig
};
