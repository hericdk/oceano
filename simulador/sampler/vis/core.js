/* (the user) FM-½ visualizers: exact ports of the FM-1 firmwares' visual code, fed by the sampler's sound.
   The families (each in its own file, registered here):
     vis/winamp-win.js  winampFM ui_winamp.c     the window's / full-screen pictures (GV_NAME, 28)
     vis/nms-vz.js      No Man Sky FM ui_nms.c   the visuals behind a knob and the punch-ins (VZ_*, 22)

   The contract. A visual is { id, name, fam, w, h, init(S), draw(S, A) }:
     S  its own state, kept between frames. S.fb is a Uint16Array(w * h) RGB565 framebuffer (the firmware's LCD
        format, row by row, w = h = 240 unless a visual says otherwise); the visual draws into it like the firmware
        draws on the LCD (it is not cleared between frames unless the visual clears it).
     A  what the firmware would read, refreshed by the host before each draw:
        A.scope_buf, A.scope_bufr  Int16Array(512) ring buffers, the mix left / right at 22 050 Hz, Q15, MASTER
                                   as if all the way up (audio.c); A.scope_w the samples written so far (uint32):
                                   the newest sample is scope_buf[(scope_w - 1) & 511], as in the firmware
        A.trk_peak  Int16Array(4)  the 4 tracks' peaks this frame, Q15 0..32767 (the sampler's groups X Y A B)
        A.mst_peak                 the master's peak, Q15
        A.hits                     the notes that started since the last frame: [{ trk 0..3, note 0..127, vel 1..127 }]
        A.kick                     1 when a kick started since the last frame
        A.playing                  the transport (0 / 1); A.bpm; A.beat_q8 beats × 256 since PLAY (or a free clock)
        A.ms                       milliseconds (uint32, like millis()); A.frame the frame count (ui.frame)
        A.knob, A.knob2            0..1000: the sampler's X and Y knobs (a knob being turned, for the NMS visuals)
        A.col                      the accent colour, RGB565 (the sampler's orange, 0xFAC3)
   The host (index.html, the visualizer window) calls draw at the firmware's rate and shows S.fb scaled up sharp. */
(function (G) {
  'use strict';
  const V = G.FM1VIS = G.FM1VIS || { list: [] };
  V.add = (v) => { if (!V.list.some((q) => q.id === v.id)) V.list.push(v); };
  V.rgb565 = (r, g, b) => ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
  // RGB565 → the canvas (the firmware's own expansion: 5 and 6 bits scaled to 8)
  V.blit = (fb, img) => { const d = img.data, n = fb.length; for (let k = 0; k < n; k++) { const v = fb[k], o = k * 4; d[o] = ((v >> 11) & 31) * 255 / 31 | 0; d[o + 1] = ((v >> 5) & 63) * 255 / 63 | 0; d[o + 2] = (v & 31) * 255 / 31 | 0; d[o + 3] = 255; } };
  V.state = (v) => { const S = { fb: new Uint16Array((v.w || 240) * (v.h || 240)) }; if (v.init) v.init(S); return S; };
  // the audio side: a host fills A each frame from an AnalyserNode (any sample rate → 22 050 Hz into the ring)
  V.audio = () => ({ scope_buf: new Int16Array(512), scope_bufr: new Int16Array(512), scope_w: 0, trk_peak: new Int16Array(4), mst_peak: 0, hits: [], kick: 0, playing: 0, bpm: 120, beat_q8: 0, ms: 0, frame: 0, knob: 500, knob2: 500, col: 0xFAC3, _f: 0, _last: null });
  V.feed = (A, anL, anR, sr) => {   // anL / anR: AnalyserNodes (anR may be null: mono); the samples since the last call go in, resampled
    const N = anL.fftSize, L = A._bl || (A._bl = new Float32Array(N)), R = A._br || (A._br = new Float32Array(N)); anL.getFloatTimeDomainData(L); if (anR) anR.getFloatTimeDomainData(R); else R.set(L);
    const now = performance.now(), dt = A._t ? Math.min(0.1, (now - A._t) / 1000) : 1 / 50; A._t = now;
    const n = Math.min(512, Math.max(1, Math.round(dt * 22050))), step = sr / 22050;
    for (let k = n - 1; k >= 0; k--) { const i = Math.max(0, Math.round(N - 1 - k * step)); A.scope_bufr[A.scope_w & 511] = Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))); A.scope_buf[A.scope_w & 511] = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))); A.scope_w = (A.scope_w + 1) >>> 0; }
    let pk = 0; for (let k = 0; k < N; k++) pk = Math.max(pk, Math.abs(L[k]), Math.abs(R[k])); A.mst_peak = Math.min(32767, Math.round(pk * 32767));
    A.ms = (now | 0) >>> 0; A.frame = (A.frame + 1) >>> 0;
  };
})(typeof window !== 'undefined' ? window : globalThis);
