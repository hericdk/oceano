/* (the user) No Man Sky FM: the visuals behind a knob while it turns, and the punch-in effects' (VZ_*, 22).
   An exact port of nomanskyFM/firmware/firmware/src/ui_nms.c "the visualisers" (n_vz and what it calls: vz_s,
   vz_gain, vz_trace, vz_y, vz_tick / vz_hist / vz_h, vz_over, g_hash_ui, n_disc, n_ring, n_frame) and of gfx.c
   (cv_pset, cv_rect, cv_line: the canvas, clipped to it), with Felucca's SINE table (build/gen/felucca_tables.h)
   copied as is. The same integer math (C's truncating division, 32-bit wrap where the C relies on it), the same
   colours (NK black, NW white, NP the purple of the dotted middle), drawn on the whole 240 x 240.

   What the firmware reads from the track / the song and the sampler has no such thing for (fixed or from a knob):
     ENV     k = 1 (DEC is the knob): DEC = knob, SUS = knob2; ATK = knob3, REL = knob4 (Shift held; else 10 and 60, the firmware's defaults)
     LFO     RATE = knob (0..127), WAVE = knob2 (0..4: SIN TRI SAW SQR S&H)
     ECHO    k = 1 (FDBK is the knob: the repeats' fall)
     FILTER  k = 0 (a track's low-pass: the knob opens it)
     DUCK    k = 0 (the pump on each beat; the beat from A.beat_q8, the tempo A.bpm)
     STEPS   the step from A.beat_q8 (16ths), SWING = knob2 / 10 (0..100); LEN = knob3 (1..16), LEVEL = knob4 (Shift held; else 16 and 104)
     CRUSH   k = 0     GATE  k = 0 (8 slices)     LOOP  k = 2 (LOOP 4)     REV  k = 0 (backwards)
     KILL    k = knob * 3 / 1001 (the band crossed out: low, middle, high)
     FREEZE  the wave caught on the first frame and again at each bar (A.beat_q8 / 1024) or, stopped, every 180
             frames; the firmware catches it when the effect is pressed, at the band's height (32 there, 240 here)
     the rest k = 0 (unused). r = A.knob, c = A.col. */
(function (G) {
  'use strict';
  const V = G.FM1VIS;
  if (!V) return;
  const SINE = new Int16Array([
    0,201,402,603,804,1005,1206,1407,1608,1809,2009,2210,2410,2611,2811,3012,3212,3412,3612,3811,4011,4210,4410,4609,
    4808,5007,5205,5404,5602,5800,5998,6195,6393,6590,6786,6983,7179,7375,7571,7767,7962,8157,8351,8545,8739,8933,9126,9319,
    9512,9704,9896,10087,10278,10469,10659,10849,11039,11228,11417,11605,11793,11980,12167,12353,12539,12725,12910,13094,13279,13462,13645,13828,
    14010,14191,14372,14553,14732,14912,15090,15269,15446,15623,15800,15976,16151,16325,16499,16673,16846,17018,17189,17360,17530,17700,17869,18037,
    18204,18371,18537,18703,18868,19032,19195,19357,19519,19680,19841,20000,20159,20317,20475,20631,20787,20942,21096,21250,21403,21554,21705,21856,
    22005,22154,22301,22448,22594,22739,22884,23027,23170,23311,23452,23592,23731,23870,24007,24143,24279,24413,24547,24680,24811,24942,25072,25201,
    25329,25456,25582,25708,25832,25955,26077,26198,26319,26438,26556,26674,26790,26905,27019,27133,27245,27356,27466,27575,27683,27790,27896,28001,
    28105,28208,28310,28411,28510,28609,28706,28803,28898,28992,29085,29177,29268,29358,29447,29534,29621,29706,29791,29874,29956,30037,30117,30195,
    30273,30349,30424,30498,30571,30643,30714,30783,30852,30919,30985,31050,31113,31176,31237,31297,31356,31414,31470,31526,31580,31633,31685,31736,
    31785,31833,31880,31926,31971,32014,32057,32098,32137,32176,32213,32250,32285,32318,32351,32382,32412,32441,32469,32495,32521,32545,32567,32589,
    32609,32628,32646,32663,32678,32692,32705,32717,32728,32737,32745,32752,32757,32761,32765,32766,32767,32766,32765,32761,32757,32752,32745,32737,
    32728,32717,32705,32692,32678,32663,32646,32628,32609,32589,32567,32545,32521,32495,32469,32441,32412,32382,32351,32318,32285,32250,32213,32176,
    32137,32098,32057,32014,31971,31926,31880,31833,31785,31736,31685,31633,31580,31526,31470,31414,31356,31297,31237,31176,31113,31050,30985,30919,
    30852,30783,30714,30643,30571,30498,30424,30349,30273,30195,30117,30037,29956,29874,29791,29706,29621,29534,29447,29358,29268,29177,29085,28992,
    28898,28803,28706,28609,28510,28411,28310,28208,28105,28001,27896,27790,27683,27575,27466,27356,27245,27133,27019,26905,26790,26674,26556,26438,
    26319,26198,26077,25955,25832,25708,25582,25456,25329,25201,25072,24942,24811,24680,24547,24413,24279,24143,24007,23870,23731,23592,23452,23311,
    23170,23027,22884,22739,22594,22448,22301,22154,22005,21856,21705,21554,21403,21250,21096,20942,20787,20631,20475,20317,20159,20000,19841,19680,
    19519,19357,19195,19032,18868,18703,18537,18371,18204,18037,17869,17700,17530,17360,17189,17018,16846,16673,16499,16325,16151,15976,15800,15623,
    15446,15269,15090,14912,14732,14553,14372,14191,14010,13828,13645,13462,13279,13094,12910,12725,12539,12353,12167,11980,11793,11605,11417,11228,
    11039,10849,10659,10469,10278,10087,9896,9704,9512,9319,9126,8933,8739,8545,8351,8157,7962,7767,7571,7375,7179,6983,6786,6590,
    6393,6195,5998,5800,5602,5404,5205,5007,4808,4609,4410,4210,4011,3811,3612,3412,3212,3012,2811,2611,2410,2210,2009,1809,
    1608,1407,1206,1005,804,603,402,201,0,-201,-402,-603,-804,-1005,-1206,-1407,-1608,-1809,-2009,-2210,-2410,-2611,-2811,-3012,
    -3212,-3412,-3612,-3811,-4011,-4210,-4410,-4609,-4808,-5007,-5205,-5404,-5602,-5800,-5998,-6195,-6393,-6590,-6786,-6983,-7179,-7375,-7571,-7767,
    -7962,-8157,-8351,-8545,-8739,-8933,-9126,-9319,-9512,-9704,-9896,-10087,-10278,-10469,-10659,-10849,-11039,-11228,-11417,-11605,-11793,-11980,-12167,-12353,
    -12539,-12725,-12910,-13094,-13279,-13462,-13645,-13828,-14010,-14191,-14372,-14553,-14732,-14912,-15090,-15269,-15446,-15623,-15800,-15976,-16151,-16325,-16499,-16673,
    -16846,-17018,-17189,-17360,-17530,-17700,-17869,-18037,-18204,-18371,-18537,-18703,-18868,-19032,-19195,-19357,-19519,-19680,-19841,-20000,-20159,-20317,-20475,-20631,
    -20787,-20942,-21096,-21250,-21403,-21554,-21705,-21856,-22005,-22154,-22301,-22448,-22594,-22739,-22884,-23027,-23170,-23311,-23452,-23592,-23731,-23870,-24007,-24143,
    -24279,-24413,-24547,-24680,-24811,-24942,-25072,-25201,-25329,-25456,-25582,-25708,-25832,-25955,-26077,-26198,-26319,-26438,-26556,-26674,-26790,-26905,-27019,-27133,
    -27245,-27356,-27466,-27575,-27683,-27790,-27896,-28001,-28105,-28208,-28310,-28411,-28510,-28609,-28706,-28803,-28898,-28992,-29085,-29177,-29268,-29358,-29447,-29534,
    -29621,-29706,-29791,-29874,-29956,-30037,-30117,-30195,-30273,-30349,-30424,-30498,-30571,-30643,-30714,-30783,-30852,-30919,-30985,-31050,-31113,-31176,-31237,-31297,
    -31356,-31414,-31470,-31526,-31580,-31633,-31685,-31736,-31785,-31833,-31880,-31926,-31971,-32014,-32057,-32098,-32137,-32176,-32213,-32250,-32285,-32318,-32351,-32382,
    -32412,-32441,-32469,-32495,-32521,-32545,-32567,-32589,-32609,-32628,-32646,-32663,-32678,-32692,-32705,-32717,-32728,-32737,-32745,-32752,-32757,-32761,-32765,-32766,
    -32767,-32766,-32765,-32761,-32757,-32752,-32745,-32737,-32728,-32717,-32705,-32692,-32678,-32663,-32646,-32628,-32609,-32589,-32567,-32545,-32521,-32495,-32469,-32441,
    -32412,-32382,-32351,-32318,-32285,-32250,-32213,-32176,-32137,-32098,-32057,-32014,-31971,-31926,-31880,-31833,-31785,-31736,-31685,-31633,-31580,-31526,-31470,-31414,
    -31356,-31297,-31237,-31176,-31113,-31050,-30985,-30919,-30852,-30783,-30714,-30643,-30571,-30498,-30424,-30349,-30273,-30195,-30117,-30037,-29956,-29874,-29791,-29706,
    -29621,-29534,-29447,-29358,-29268,-29177,-29085,-28992,-28898,-28803,-28706,-28609,-28510,-28411,-28310,-28208,-28105,-28001,-27896,-27790,-27683,-27575,-27466,-27356,
    -27245,-27133,-27019,-26905,-26790,-26674,-26556,-26438,-26319,-26198,-26077,-25955,-25832,-25708,-25582,-25456,-25329,-25201,-25072,-24942,-24811,-24680,-24547,-24413,
    -24279,-24143,-24007,-23870,-23731,-23592,-23452,-23311,-23170,-23027,-22884,-22739,-22594,-22448,-22301,-22154,-22005,-21856,-21705,-21554,-21403,-21250,-21096,-20942,
    -20787,-20631,-20475,-20317,-20159,-20000,-19841,-19680,-19519,-19357,-19195,-19032,-18868,-18703,-18537,-18371,-18204,-18037,-17869,-17700,-17530,-17360,-17189,-17018,
    -16846,-16673,-16499,-16325,-16151,-15976,-15800,-15623,-15446,-15269,-15090,-14912,-14732,-14553,-14372,-14191,-14010,-13828,-13645,-13462,-13279,-13094,-12910,-12725,
    -12539,-12353,-12167,-11980,-11793,-11605,-11417,-11228,-11039,-10849,-10659,-10469,-10278,-10087,-9896,-9704,-9512,-9319,-9126,-8933,-8739,-8545,-8351,-8157,
    -7962,-7767,-7571,-7375,-7179,-6983,-6786,-6590,-6393,-6195,-5998,-5800,-5602,-5404,-5205,-5007,-4808,-4609,-4410,-4210,-4011,-3811,-3612,-3412,
    -3212,-3012,-2811,-2611,-2410,-2210,-2009,-1809,-1608,-1407,-1206,-1005,-804,-603,-402,-201]);
  const NK = 0x0000, NW = 0xFFFF, NP = (((0x53 >> 3) << 11) | ((0x26 >> 2) << 5) | (0x8D >> 3));   /* RGB(0x53,0x26,0x8D) */
  const VZ = { WAVE: 0, DRIVE: 1, FILTER: 2, ENV: 3, LFO: 4, ECHO: 5, SPACE: 6, CHORUS: 7, PAN: 8, DUST: 9, DUCK: 10, PITCH: 11,
    STEPS: 12, CRUSH: 13, GATE: 14, BARS: 15, LOOP: 16, REV: 17, STOP: 18, FREEZE: 19, KILL: 20, FADE: 21 };
  const D = (a, b) => (a / b) | 0;                        /* C's int32 division (towards zero) */
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const W = 240, H = 240;                                 /* the canvas (cv_w, cv_h) */

  /* the state of the drawing in progress (the firmware's globals) */
  let fb = null, A = null, S = null;
  const ys = new Int16Array(240), y2 = new Int16Array(240);   /* static int16_t ys[240], y2[240] */

  /* gfx.c */
  function cv_pset(x, y, c) { if ((x >>> 0) < W && (y >>> 0) < H) fb[y * W + x] = c; }
  function cv_rect(x, y, w, h, c) {
    let x1 = x + w, y1 = y + h;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x1 > W) x1 = W;
    if (y1 > H) y1 = H;
    for (; y < y1; y++) for (let i = x; i < x1; i++) fb[y * W + i] = c;
  }
  function cv_line(x0, y0, x1, y1, c) {
    const dx = x1 > x0 ? x1 - x0 : x0 - x1, sx = x0 < x1 ? 1 : -1;
    const dy = y1 > y0 ? y0 - y1 : y1 - y0, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, guard = 2000;
    while (guard--) {
      const e2 = 2 * err;
      cv_pset(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /* ui_nms.c's shapes */
  function n_frame(x, y, w, h, t, c) { cv_rect(x, y, w, t, c); cv_rect(x, y + h - t, w, t, c); cv_rect(x, y, t, h, c); cv_rect(x + w - t, y, t, h, c); }
  function n_disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) cv_pset(cx + x, cy + y, c); }
  function n_ring(cx, cy, r, t, c) {
    const ri = r - t;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r + r && d > ri * ri + ri) cv_pset(cx + x, cy + y, c); }
  }

  /* the visualisers */
  function g_hash_ui(h) { h >>>= 0; h = (h ^ 61) ^ (h >>> 16); h = Math.imul(h, 9); h ^= h >>> 4; h = Math.imul(h, 0x27d4eb2d); return (h ^ (h >>> 15)) >>> 0; }
  function vz_s(back) { return A.scope_buf[(A.scope_w - 1 - back) & 511]; }   /* SCOPE_N = 512 (audio.c) */
  function vz_gain() {
    let pk = 1;
    for (let i = 0; i < 256; i++) { let a = vz_s(i); if (a < 0) a = -a; if (a > pk) pk = a; }
    return pk < 900 ? 0 : D(115 * 32768, pk);
  }
  function vz_trace(x, y, w, h, ys, c) {
    let prev = ys[0];
    const m = D(h, 2);
    for (let i = 0; i < w; i++) {
      const a = clamp(ys[i], 0, h - 1);
      let lo = a < prev ? a : prev, hi = a < prev ? prev : a;
      lo = clamp(lo, 0, h - 2), hi = clamp(hi, 0, h - 2);
      cv_rect(x + i, y + lo, 1, hi - lo + 2, c);
      for (let j = a < m ? a + 3 : m; j < (a < m ? m : a - 2); j += 2)
        if (((i + j) & 1) === 0) cv_pset(x + i, y + j, c);
      prev = a;
    }
  }
  function vz_y(s, g, h) { return D(h, 2) - D(Math.imul(Math.imul(s, g) >> 8, h) >> 8, 128); }
  function vz_tick() {
    let pk = 0;
    for (let i = 0; i < 380; i++) { const a = vz_s(i), b = a < 0 ? -a : a; if (b > pk) pk = b; }
    S.hist[S.hi] = pk > 32767 ? 32767 : pk;
    S.hi = (S.hi + 1) & 255;
  }
  function vz_h(back) { return back < 0 || back > 255 ? 0 : S.hist[(S.hi - 1 - back) & 255]; }
  function vz_over(x, y, w, h, src, amp, c) {
    let mx = 1200;
    for (let i = 0; i < w; i++) if (src[i] >= 0 && vz_h(src[i]) > mx) mx = vz_h(src[i]);
    for (let i = 0; i < w; i++) {
      if (src[i] < 0) continue;
      let half = Math.imul(D(vz_h(src[i]) * (D(h, 2) - 2), mx), amp[i]) >> 8;
      if (half < 1) half = 1;
      cv_rect(x + i, y + D(h, 2) - half, 1, 2 * half, src[i] === 0 ? NW : c);
    }
  }

  /* the visual st in (x, y, w, h); r: the knob 0..1000; c its colour; k: a variant */
  function n_vz(st, x, y, w, h, r, c, k) {
    const g = vz_gain(), mid = D(h, 2), t = A.ms | 0;
    let step = D(240, w), i;
    if (w > 240) w = 240;
    r = clamp(r, 0, 1000);
    if (!step) step = 1;
    for (i = 0; i < w; i += 4) cv_pset(x + i, y + mid, NP);
    switch (st) {
      case VZ.DRIVE: {
        const lim = D(h * 42, 100), gain = 256 + D(r * 6 * 256, 1000);
        for (i = 0; i < w; i++) {
          const s = vz_s((w - 1 - i) * step);
          let v = D(D(D(D((s * g >> 8) * h, 256), 128) * gain, 256), 1);
          if (v > lim || v < -lim) {
            cv_rect(x + i, y + mid - (v > 0 ? lim : -lim) - 1, 1, 3, NW);
            v = v > 0 ? lim : -lim;
          }
          ys[i] = mid - v;
        }
        vz_trace(x, y, w, h, ys, c);
        break;
      }
      case VZ.FILTER: {
        const lp = k ? (r < 480 ? 480 - r : 0) : 1000 - r, hp = k && r > 520 ? r - 520 : 0;
        const n = 1 + D(lp, 25);
        for (i = 0; i < w; i++) {
          let acc = 0;
          const base = (w - 1 - i) * step;
          for (let j = 0; j < n; j++) acc += vz_s(base + j);
          acc = D(acc, n);
          if (hp) acc = Math.imul(vz_s(base) - acc, 1 + D(hp, 60));
          ys[i] = vz_y(acc, g, h);
        }
        vz_trace(x, y, w, h, ys, c);
        const cx = k ? (r < 480 ? D(r * w, 480) : r > 520 ? D((r - 520) * w, 480) : w) : D(r * w, 1000);
        for (i = 0; i < w; i++) {
          const d = hp ? cx - i : i - cx;
          let cy = d <= 0 ? D(h, 5) : D(h, 5) + D(d * d * h, D(w * w, 3) + 1);
          if (k && r >= 480 && r <= 520) cy = D(h, 5);
          if (cy < h - 1) cv_pset(x + i, y + cy, NW);
        }
        break;
      }
      case VZ.ENV: {
        const p = S.env;
        const a = 4 + D(p[0], 3), d = 4 + D(p[1], 3), s = p[2], rl = 4 + D(p[3], 3), hold = 18;
        const tot = a + d + hold + rl, px = [0, 0, 0, 0, 0], py = [0, 0, 0, 0, 0];
        px[0] = 0, py[0] = h - 2;
        px[1] = D(a * w, tot), py[1] = 2;
        px[2] = D((a + d) * w, tot), py[2] = h - 2 - D(s * (h - 4), 127);
        px[3] = D((a + d + hold) * w, tot), py[3] = py[2];
        px[4] = w - 1, py[4] = h - 2;
        for (let seg = 0; seg < 4; seg++) {
          const col = (seg === k || (k === 3 && seg === 3)) ? NW : c;
          for (let xx = px[seg]; xx <= px[seg + 1]; xx++) {
            const yy = px[seg + 1] === px[seg] ? py[seg] : py[seg] + D((py[seg + 1] - py[seg]) * (xx - px[seg]), px[seg + 1] - px[seg]);
            cv_rect(x + xx, y + yy, 1, 2, col);
            if (!(xx & 1)) cv_rect(x + xx, y + yy + 3, 1, h - yy - 4 > 0 ? D(h - yy - 4, 3) : 0, c);
          }
        }
        const ph = D(t, 8) % (w + 20);
        if (ph < w)
          for (let seg = 0; seg < 4; seg++)
            if (ph >= px[seg] && ph <= px[seg + 1]) {
              const yy = px[seg + 1] === px[seg] ? py[seg] : py[seg] + D((py[seg + 1] - py[seg]) * (ph - px[seg]), px[seg + 1] - px[seg]);
              n_disc(x + ph, y + yy, 3, NW);
            }
        break;
      }
      case VZ.LFO: {
        const wave = S.lwave, rate = 1 + S.lrate;
        const ph0 = D(Math.imul(t, rate), 60) >>> 0;
        for (i = 0; i < w; i++) {
          const ph = (ph0 + D(i * 2048, w)) & 1023;
          let v;
          switch (wave % 5) {
            case 0: v = SINE[ph] >> 7; break;
            case 1: v = ph < 512 ? ph - 256 : 767 - ph; break;
            case 2: v = 255 - (ph >> 1); break;
            case 3: v = ph < 512 ? 200 : -200; break;
            default: v = (g_hash_ui(ph >> 7) & 511) - 256; break;
          }
          ys[i] = mid - D(v * D(h * 42, 100), 256);
        }
        vz_trace(x, y, w, h, ys, c);
        break;
      }
      case VZ.ECHO: {
        let pk = 0;
        const fb_ = k === 1 ? r : D(60 * 1000, 120);    /* (song.g[G_DFDBK]: its default, 60) */
        for (i = 0; i < 24; i++) pk = vz_h(i) > pk ? vz_h(i) : pk;
        let hgt = D(pk * (h - 4), 32768) + D(h, 4);
        const sp = k === 2 ? 10 + D(r * D(w, 3), 1000) : D(w, 6);
        if (k === 0) hgt = D(hgt * r, 1000);
        for (let n = 0; n < 12 && hgt > 1; n++) {
          const xx = (n * sp + D(t, 20) % sp) % (w + sp) - 2;
          cv_rect(x + xx, y + mid - D(hgt, 2), 3, hgt, n ? c : NW);
          hgt = D(hgt * (200 + D(fb_ * 6, 10)), 1000);
        }
        break;
      }
      case VZ.SPACE: {
        let pk = 0;
        const spread = D(w * (300 + D(r * 7, 10)), 1000);
        for (i = 0; i < 64; i++) { const a = vz_s(i), b = a < 0 ? -a : a; if (b > pk) pk = b; }
        const n = 8 + D(r * 70, 1000) + (pk >> 10);
        for (i = 0; i < n; i++) {
          const hh = g_hash_ui((Math.imul(i, 977) + (D(t, 90) >>> 0)) >>> 0);
          const xx = D(w, 2) + (hh % (spread + 1)) - D(spread, 2);
          const yy = mid + ((hh >>> 10) % (D(h * spread, w) + 1)) - D(D(h * spread, w), 2);
          cv_rect(x + xx, y + yy, 2, 2, i < 4 ? NW : c);
        }
        n_ring(x + D(w, 2), y + mid, 3 + ((D(t, 30) >>> 0) % (D(spread, 2) + 1)), 1, c);
        break;
      }
      case VZ.CHORUS: {
        const dep = 2 + D(r * 24, 1000), off = (SINE[(D(t, 3) >>> 0) & 1023] * dep) >> 15;
        for (i = 0; i < w; i++) {
          ys[i] = vz_y(vz_s((w - 1 - i) * step), g, h);
          y2[i] = vz_y(vz_s(clamp((w - 1 - i) * step + dep + off, 0, 500)), g, h);
        }
        vz_trace(x, y, w, h, ys, c);
        for (i = 0; i < w; i += 2) cv_pset(x + i, y + clamp(y2[i], 0, h - 1), NW);
        break;
      }
      case VZ.PAN: {
        let pk = 0;
        for (i = 0; i < 128; i++) { const a = vz_s(i), b = a < 0 ? -a : a; if (b > pk) pk = b; }
        let rad = 3 + D(D((pk * g >> 8) * D(h, 3), 32768), 1);
        rad = clamp(rad, 3, D(h, 3));
        const bx = 6 + D(r * (w - 12), 1000), h3 = D(h, 3);
        n_disc(x + bx, y + mid, rad, c);
        n_disc(x + bx, y + mid, 2, NW);
        const lL = D(D((1000 - r) * (h - 4), 1000) * rad, h3), lR = D(D(r * (h - 4), 1000) * rad, h3);
        cv_rect(x + 1, y + h - 2 - lL, 3, lL + 1, c);
        cv_rect(x + w - 4, y + h - 2 - lR, 3, lR + 1, c);
        break;
      }
      case VZ.DUST: {
        const n = 4 + D(r * 90, 1000);
        for (i = 0; i < w; i += 2) cv_pset(x + i, y + clamp(vz_y(vz_s((w - 1 - i) * step), g, h), 0, h - 1), c);
        for (i = 0; i < n; i++) {
          const hh = g_hash_ui((Math.imul(i, 131) + Math.imul(A.frame >>> 0, 7919)) >>> 0);
          cv_rect(x + (hh % w), y + ((hh >>> 12) % h), 1 + ((hh >>> 24) & 1), 1, (hh >>> 20) & 3 ? c : NW);
        }
        break;
      }
      case VZ.DUCK: {
        const now_q8 = A.beat_q8 & 255;                 /* (int32_t)(clk_pos * 256u / BEAT_U): the beat's share, Q8 */
        const bpm = A.bpm | 0, bms = bpm > 0 ? D(60000, bpm) : 500;
        for (i = 0; i < w; i++) {
          const back = w - 1 - i;
          let ph = now_q8 - D(back * 17 * 256, bms);
          ph = ((ph % 256) + 256) % 256;
          const e = k ? 128 + (SINE[(ph * 16) & 1023] >> 8) : 256 - D(D((256 - ph) * (256 - ph), 256) * r, 1000);
          ys[i] = back, y2[i] = e;
          cv_pset(x + i, y + h - 2 - D(e * (h - 4), 256), NW);
        }
        vz_over(x, y, w, h, ys, y2, c);
        break;
      }
      case VZ.PITCH: {
        const cyc = 1 + D(r * 7, 1000), ph0 = D(t, 4) >>> 0;
        for (let j = 1; j < 6; j++) for (i = 0; i < w; i += 6) cv_pset(x + i, y + D(j * h, 6), NP);
        for (i = 0; i < w; i++) ys[i] = mid - ((SINE[(ph0 + D(i * cyc * 1024, w)) & 1023] * D(h * 40, 100)) >> 15);
        vz_trace(x, y, w, h, ys, c);
        break;
      }
      case VZ.STEPS: {
        const cw = D(w, 16), sw = 0 + S.swing, len = clamp(S.slen || 16, 1, 16);   /* P_SSWING 0 + G_SWING, P_SLEN (Shift + X on the sampler) */
        const seq = (A.beat_q8 >>> 6) % 16;             /* the track's step: 16ths since PLAY */
        for (i = 0; i < 16; i++) {
          const xx = i * cw + ((i & 1) ? D(cw * sw, 250) : 0), on = i < len && seq === i && A.playing;
          const hh = D((S.slevel ?? 104) * (h - 6), 127) + 2, lit = D(i * 1000, 16) < r;   /* trk_level: LEVEL (Shift + Y on the sampler) */
          if (on) cv_rect(x + xx, y + h - 2 - hh, cw - 1, hh, NW);
          else if (lit) cv_rect(x + xx, y + h - 2 - D(hh, 2), cw - 1, D(hh, 2), c);
          else cv_rect(x + xx, y + h - 3, cw - 1, 1, c);
        }
        break;
      }
      case VZ.CRUSH: {
        const lv = 2 + D((1000 - r) * 14, 1000), hold = 1 + D((k ? 6 : 2) * r, 300);
        let held = 0;
        for (i = 0; i < w; i++) {
          if (i % hold === 0) {
            const v = vz_y(vz_s((w - 1 - i) * step), g, h) - mid, q = D(h, lv) + 1;
            held = D(v, q) * q;
          }
          ys[i] = mid + held;
        }
        vz_trace(x, y, w, h, ys, c);
        break;
      }
      case VZ.GATE: {
        const sl = k ? k : 8, duty = 300 + D(r * 6, 10), per = D(w, sl) + 1;
        for (i = 0; i < w; i++) {
          const pos = D(((i + D(t, 15)) % per) * 1000, per);
          ys[i] = pos < duty ? w - 1 - i : -1;
          y2[i] = 256;
        }
        vz_over(x, y, w, h, ys, y2, c);
        for (i = 0; i < w; i++) if (ys[i] < 0) cv_pset(x + i, y + mid, NW);
        break;
      }
      case VZ.LOOP: {
        const seg = D(w, k > 0 ? k : 2);
        for (i = 0; i < w; i++) ys[i] = seg - 1 - i % seg, y2[i] = 256;
        vz_over(x, y, w, h, ys, y2, c);
        for (i = seg; i < w; i += seg) cv_rect(x + i, y + 1, 1, h - 2, NW);
        break;
      }
      case VZ.REV: {
        if (k) {
          for (let a = 0; a < 1024; a += 8) {
            const rr = 2 + D(a * (D(h, 2) - 3), 1024), aa = (a * 3 - t) & 1023;
            cv_rect(x + D(w, 2) + ((SINE[(aa + 256) & 1023] * rr) >> 15), y + mid + ((SINE[aa] * rr) >> 15), 2, 2, a > 900 ? NW : c);
          }
          break;
        }
        for (i = 0; i < w; i++) ys[i] = i, y2[i] = 256;
        vz_over(x, y, w, h, ys, y2, c);
        for (i = 0; i < 4; i++) {
          const ax = w - 1 - (((D(t, 10) + D(i * w, 4)) >>> 0) % w);
          cv_line(x + ax, y + 3, x + ax + 4, y + 1, NW), cv_line(x + ax, y + 3, x + ax + 4, y + 5, NW);
        }
        break;
      }
      case VZ.STOP: {
        let pos = 0;
        for (i = 0; i < w; i++) {
          ys[i] = w - 1 - D(pos, 256);
          y2[i] = D(256 * (w - i), w);
          pos += D(256 * (w - i), w);
        }
        vz_over(x, y, w, h, ys, y2, c);
        break;
      }
      case VZ.FREEZE: {
        for (i = 0; i < w; i++) ys[i] = S.frz[D(i * 120, w)];
        vz_trace(x, y, w, h, ys, c);
        for (i = 0; i < 10; i++) {
          const hh = g_hash_ui((Math.imul(i, 31) + D(A.frame >>> 0, 3)) >>> 0);
          cv_pset(x + (hh % w), y + ((hh >>> 10) % h), NW);
        }
        break;
      }
      case VZ.KILL: {
        const bw = D(w, 3);
        for (let b = 0; b < 3; b++) {
          let e = 0;
          const n = b === 0 ? 24 : b === 1 ? 6 : 1;
          for (i = 0; i < 96; i++) {
            let acc = 0;
            for (let j = 0; j < n; j++) acc += vz_s(i + j);
            acc = D(acc, n);
            if (b === 2) acc = vz_s(i) - vz_s(i + 1);
            e += acc < 0 ? -acc : acc;
          }
          const hh = clamp(D(Math.imul(D(e, 96) * g >> 8, h), 9000) + 3, 3, h - 6);
          if (b === k) {
            n_frame(x + b * bw + 3, y + h - 3 - hh, bw - 6, hh, 1, c);
            cv_line(x + b * bw + 3, y + h - 3 - hh, x + b * bw + bw - 4, y + h - 4, NW);
            cv_line(x + b * bw + bw - 4, y + h - 3 - hh, x + b * bw + 3, y + h - 4, NW);
          } else {
            cv_rect(x + b * bw + 3, y + h - 3 - hh, bw - 6, hh, c);
          }
        }
        break;
      }
      case VZ.FADE: {
        for (i = 0; i < w; i++) ys[i] = w - 1 - i, y2[i] = D(256 * (w - i), w);
        vz_over(x, y, w, h, ys, y2, c);
        break;
      }
      case VZ.BARS: {
        const n = 16, bw = D(w, n);
        for (i = 0; i < n; i++) {
          let e = 0;
          for (let j = 0; j < 16; j++) { const a = vz_s(i * 16 + j); e += a < 0 ? -a : a; }
          const hh = clamp(D(Math.imul(D(e, 16) * g >> 8, h), 9000) + 1, 1, h - 2);
          cv_rect(x + i * bw, y + h - 1 - hh, bw - 1, hh, D(i * 1000, n) < r ? c : NP);
        }
        break;
      }
      default:                                           /* VZ_WAVE */
        for (i = 0; i < w; i++) ys[i] = w - 1 - i, y2[i] = 26 + D(r * 230, 1000);
        vz_over(x, y, w, h, ys, y2, c);
        break;
    }
  }

  /* FREEZE: the wave of that moment (ui_nms.c n_blacks), at the height it is drawn at */
  function freeze(h) { const g = vz_gain(); for (let k = 0; k < 120; k++) S.frz[k] = vz_y(vz_s((119 - k) * 2), g, h); }

  const LIST = [
    ['wave', 'WAVE', VZ.WAVE, 0], ['drive', 'DRIVE', VZ.DRIVE, 0], ['filter', 'FILTER', VZ.FILTER, 0], ['env', 'ENV', VZ.ENV, 1],
    ['lfo', 'LFO', VZ.LFO, 0], ['echo', 'ECHO', VZ.ECHO, 1], ['space', 'SPACE', VZ.SPACE, 0], ['chorus', 'CHORUS', VZ.CHORUS, 0],
    ['pan', 'PAN', VZ.PAN, 0], ['dust', 'DUST', VZ.DUST, 0], ['duck', 'DUCK', VZ.DUCK, 0], ['pitch', 'PITCH', VZ.PITCH, 0],
    ['steps', 'STEPS', VZ.STEPS, 0], ['crush', 'CRUSH', VZ.CRUSH, 0], ['gate', 'GATE', VZ.GATE, 0], ['bars', 'BARS', VZ.BARS, 0],
    ['loop', 'LOOP', VZ.LOOP, 2], ['rev', 'REV', VZ.REV, 0], ['stop', 'STOP', VZ.STOP, 0], ['freeze', 'FREEZE', VZ.FREEZE, 0],
    ['kill', 'KILL', VZ.KILL, -1], ['fade', 'FADE', VZ.FADE, 0]];

  for (const [id, name, st, k0] of LIST)
    V.add({
      id: 'nms-' + id, name, fam: 'No Man Sky FM', w: 240, h: 240,
      init(s) { s.hist = new Int16Array(256); s.hi = 0; s.frz = new Int16Array(120); s.frz_bar = -1; s.frz_f = 0; s.env = [10, 70, 90, 60]; s.lwave = 0; s.lrate = 60; s.swing = 0; },
      draw(s, a) {
        S = s, A = a, fb = s.fb;
        fb.fill(NK);                                     /* cv_begin(..., NK) */
        vz_tick();                                       /* (ui_draw: every frame, before the screens) */
        const r = clamp(a.knob | 0, 0, 1000), r2 = clamp(a.knob2 | 0, 0, 1000);
        let k = k0;
        const r3 = a.knob3 == null ? -1 : clamp(a.knob3 | 0, 0, 1000), r4 = a.knob4 == null ? -1 : clamp(a.knob4 | 0, 0, 1000);   /* (the sampler: Shift turns X / Y into the 3rd and 4th knob) */
        if (st === VZ.ENV) { s.env[1] = D(r * 127, 1000), s.env[2] = D(r2 * 127, 1000); if (r3 >= 0) s.env[0] = D(r3 * 127, 1000); if (r4 >= 0) s.env[3] = D(r4 * 127, 1000); }
        if (st === VZ.LFO) s.lrate = D(r * 127, 1000), s.lwave = D(r2 * 5, 1001);
        if (st === VZ.STEPS) { s.swing = D(r2, 10); if (r3 >= 0) s.slen = 1 + D(r3 * 15, 1000); if (r4 >= 0) s.slevel = D(r4 * 127, 1000); }
        if (st === VZ.KILL) k = D(r * 3, 1001);
        if (st === VZ.FREEZE) {
          const bar = a.playing ? (a.beat_q8 >>> 10) : -2;
          if (s.frz_bar === -1 || (a.playing ? bar !== s.frz_bar : (a.frame - s.frz_f) >= 180)) { freeze(240); s.frz_bar = bar; s.frz_f = a.frame; }
        }
        n_vz(st, 0, 0, 240, 240, r, a.col & 0xFFFF, k);
        S = A = fb = null;
      },
    });
})(typeof window !== 'undefined' ? window : globalThis);
