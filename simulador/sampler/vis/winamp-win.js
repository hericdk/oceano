/* FM-½ visualizers: winampFM, ui_winamp.c, the visualizer on the whole screen (GV_NAME, 28 pictures), ported pixel for pixel.
 *
 * The firmware's code is followed function by function (wvf_step, wvf_paint, wv_draw and every scene they call, wf_spectrum, the 5 px and
 * 5 x 7 faces of wfm_font.h, cv_rect / cv_pset / cv_line of gfx.c, wt_make / wt_quad for TAPE), with the same integer maths: C's int
 * division is (a / b | 0), unsigned maths is done in doubles and brought back with >>> 0, products that wrap use Math.imul, the C arrays
 * of uint8_t / int16_t / int8_t are typed arrays so they wrap as they did. Every picture is 240 x 240 (the firmware draws all 28 on the
 * whole screen: wvf_paint). The window's chrome (the names at the foot for 4 s after SELECT: wvf_foot) is not drawn.
 *
 * As the firmware: the screen is painted in two strips (rows 0..122 then 123..239) of a 240 x 123 canvas (cv_begin, cv_oy = -y0), each
 * strip cleared to black first: several scenes move their things while they paint (SYNTH, CHORDS, SMOKE, FLOAT, BOXER, DOOMSCROLL...)
 * and DRIVE's mirror reads the canvas back, so painting twice a frame is part of the picture. The spectrum is computed every 40 ms of
 * A.ms and the picture steps and paints every 50 ms (20 fps), as wfm_draw_ does; a draw() call between two steps leaves S.fb as it was.
 *
 * What the firmware reads, and where it comes from here (A = the host's audio, see core.js):
 *   scope_buf, scope_bufr, scope_w   A.scope_buf, A.scope_bufr, A.scope_w (the same ring: 512, 22 050 Hz, Q15)
 *   wf_spec[19], wf_peak[19]         computed from A.scope_buf exactly as wf_spectrum (19 Goertzel filters over the last 256 samples)
 *   fm1_ms                           A.ms;  song.playing  A.playing;  song.g[G_BPM]  A.bpm (rounded, 40..240 where the firmware clamps)
 *   nk_mask, nk_on (the 27 keys      the notes of A.hits, folded by octaves onto the keys F3 (53) .. G5 (79) (kb_map with no scale); a
 *     sounding, the ones just on)    note is held 4 steps (200 ms, the voice's gate: the hits only say when notes start), the ones that
 *                                    started since the last step are nk_on; A.keys (optional, a 27-bit mask) adds keys held as they are
 *   nk_hand, nk_hon (keys under      A.hand (optional, a 27-bit mask of the keys pressed by hand); 0 when absent (the sampler's pads are
 *     the fingers only)              played by its sequencer: DOOMSCROLL then scrolls for 2 s after PLAY, LOFI STUDY's look-up is not cut)
 *   dr_hits (drum lanes hit)         every hit's note through drums.c lane_of_note (GM: 39 = lane 3, the CLAP DANCE claps on), A.kick = lane 0
 *   ev_lvl, ev_rate                  computed as nk_step does (from wf_spec and nk_on)
 *   trk_level(k), trk[k].p[P_MUTE]   the firmware's defaults (LEVEL 104, the drum track's 100; not muted); A.mute[k] (optional) mutes
 *   the effect sends (CURVES, PATCH) wf_grp 0 = SEND: DIST, CHORUS, DELAY, REVERB of the selected track, their defaults (0); A.fx (optional,
 *                                    4 values 0..127) sets them
 *   song.g[G_FILT] (HOUND's FREQ)    its default (0, the middle of -64..63); A.filt (optional) sets it
 *   punch.cur, thr_req               none (-1, 0): the sampler has no performance effects here (FLOW's extra block, PATCH's FX stay off)
 *   the selected track's sound name  A.name (optional; default "SAMPLER"): RACER-less DRIVE radio, DOOMSCROLL's player, TAPE's label
 *   preset_pos (TAPE's model)        A.preset (optional, default 0): which of the 42 tape models (WT_ORDER) the tape is
 *   wvf_rnd's seed, the statics      each S starts as the firmware after boot entering that picture (wvf_step's first call clears wv_mem,
 *                                    lays the stars, vp_on = 0xFF) */
(function (G) {
  'use strict';
  const V = G.FM1VIS = G.FM1VIS || { list: [] };
  const imul = Math.imul;
  const RGB = (r, g, b) => ((((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)) & 0xFFFF);
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const C_BLACK = 0;
  const WC_WHT = RGB(0xff, 0xff, 0xff), WC_GRN = RGB(0x1c, 0xe6, 0x1c), WC_AMB = RGB(0xf0, 0xa8, 0x20), WC_BTN = RGB(0xc6, 0xd0, 0xdc);
  const WC_FR2 = RGB(0x2a, 0x2c, 0x45), WC_LAB = RGB(0xb4, 0xb6, 0xca);
  /* wfm_font.h (tools/gen_wfm_font.py): the 5 px face (WFS) and the 5 x 7 face (WFM); rows: bit 7 = leftmost pixel */
  const WFS_H = 5, WFM_H = 7;
  const WFS_W = [2,1,3,3,3,3,3,1,2,2,3,3,1,3,1,3,3,3,3,3,3,3,3,3,3,3,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,5,4,3,3,3,3,3,3,3,3,5,3,3,3,3,3,3,3,3];
  const WFM_W = [3,1,5,5,5,5,5,1,3,3,5,5,2,4,2,5,5,3,5,5,5,5,5,5,5,5,2,5,4,5,4,5,5,5,5,5,5,5,5,5,5,3,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5];
  const WFS_ROWS = [0,0,0,0,0,128,128,128,0,128,192,32,64,0,64,160,224,160,224,160,192,32,64,0,64,160,32,64,128,160,64,160,64,160,96,128,128,0,0,0,64,128,128,128,64,128,64,64,64,128,0,64,224,64,0,0,64,224,64,0,0,0,0,128,128,0,0,224,0,0,0,0,0,0,128,32,32,64,128,128,224,160,160,160,224,64,192,64,64,224,192,32,64,128,224,192,32,64,32,192,160,160,224,32,32,224,128,192,32,192,96,128,224,160,224,224,32,64,64,64,224,160,224,160,224,224,160,224,32,192,0,128,0,128,0,192,32,64,0,64,32,64,128,64,32,0,224,0,224,0,128,64,32,64,128,192,32,64,0,64,192,32,64,0,64,64,160,224,160,160,192,160,192,160,192,96,128,128,128,96,192,160,160,160,192,224,128,192,128,224,224,128,192,128,128,96,128,160,160,96,160,160,224,160,160,224,64,64,64,224,32,32,32,160,64,160,160,192,160,160,128,128,128,128,224,136,216,168,136,136,144,208,176,144,144,64,160,160,160,64,192,160,192,128,128,64,160,160,192,96,192,160,192,160,160,96,128,64,32,192,224,64,64,64,64,160,160,160,160,224,160,160,160,160,64,136,136,168,216,136,160,160,64,160,160,160,160,64,64,64,224,32,64,128,224,192,32,64,0,64,192,32,64,0,64,192,32,64,0,64,192,32,64,0,64,0,0,0,0,224];   /* [c - 32][r] = WFS_ROWS[(c - 32) * 5 + r] */
  const WFM_ROWS = [0,0,0,0,0,0,0,128,128,128,128,128,0,128,112,136,8,16,32,0,32,80,80,248,80,248,80,80,112,136,8,16,32,0,32,192,200,16,32,64,152,24,96,144,160,64,168,144,104,128,128,0,0,0,0,0,32,64,128,128,128,64,32,128,64,32,32,32,64,128,0,32,168,112,168,32,0,0,32,32,248,32,32,0,0,0,0,0,192,64,128,0,0,0,240,0,0,0,0,0,0,0,0,192,192,0,8,16,32,64,128,0,112,136,152,168,200,136,112,64,192,64,64,64,64,224,112,136,8,16,32,64,248,248,16,32,16,8,136,112,16,48,80,144,248,16,16,248,128,240,8,8,136,112,48,64,128,240,136,136,112,248,8,16,32,64,64,64,112,136,136,112,136,136,112,112,136,136,120,8,16,96,0,192,192,0,192,192,0,112,136,8,16,32,0,32,16,32,64,128,64,32,16,0,0,248,0,248,0,0,128,64,32,16,32,64,128,112,136,8,16,32,0,32,112,136,8,16,32,0,32,112,136,136,248,136,136,136,240,136,136,240,136,136,240,112,136,128,128,128,136,112,224,144,136,136,136,144,224,248,128,128,240,128,128,248,248,128,128,240,128,128,128,112,136,128,184,136,136,120,136,136,136,248,136,136,136,224,64,64,64,64,64,224,56,16,16,16,16,144,96,136,144,160,192,160,144,136,128,128,128,128,128,128,248,136,216,168,168,136,136,136,136,136,200,168,152,136,136,112,136,136,136,136,136,112,240,136,136,240,128,128,128,112,136,136,136,168,144,104,240,136,136,240,160,144,136,120,128,128,112,8,8,240,248,32,32,32,32,32,32,136,136,136,136,136,136,112,136,136,136,136,136,80,32,136,136,136,168,168,168,80,136,136,80,32,80,136,136,136,136,136,80,32,32,32,248,8,16,32,64,128,248,112,136,8,16,32,0,32,112,136,8,16,32,0,32,112,136,8,16,32,0,32,112,136,8,16,32,0,32,0,0,0,0,0,0,248];   /* [c - 32][r] = WFM_ROWS[(c - 32) * 7 + r] */
  const WV_SIN = [0, 12, 25, 37, 49, 60, 71, 81, 90, 98, 106, 112, 117, 122, 125, 126, 127, 126, 125, 122, 117, 112, 106,
    98, 90, 81, 71, 60, 49, 37, 25, 12, 0, -12, -25, -37, -49, -60, -71, -81, -90, -98, -106, -112, -117, -122, -125, -126, -127, -126,
    -125, -122, -117, -112, -106, -98, -90, -81, -71, -60, -49, -37, -25, -12];
  const WF_GC = [32763, 32760, 32753, 32742, 32721, 32686, 32623, 32512, 32317, 31973, 31369, 30311, 28473, 25314, 20003, 11424, -1415, -17786, -31380];
  const WV_PAL = [
    [RGB(0x06, 0x30, 0x06), RGB(0x10, 0x78, 0x10), RGB(0x1c, 0xc8, 0x1c), RGB(0xb0, 0xff, 0xa0)],
    [RGB(0x30, 0x24, 0x08), RGB(0x80, 0x68, 0x18), RGB(0xe0, 0xc0, 0x30), RGB(0xff, 0xf0, 0xb0)],
    [RGB(0x08, 0x20, 0x40), RGB(0x18, 0x60, 0xa8), RGB(0x40, 0xb0, 0xf0), RGB(0xd8, 0xf0, 0xff)],
    [RGB(0x38, 0x10, 0x08), RGB(0x98, 0x30, 0x18), RGB(0xf0, 0x70, 0x20), RGB(0xff, 0xd8, 0x90)],
    [RGB(0x20, 0x08, 0x38), RGB(0x60, 0x18, 0xa0), RGB(0xc0, 0x40, 0xf0), RGB(0xf8, 0xc8, 0xff)],
    [RGB(0x08, 0x28, 0x30), RGB(0x10, 0x80, 0x90), RGB(0x30, 0xe0, 0xd0), RGB(0xd0, 0xff, 0xf8)]];
  const NE_PUR = RGB(0xb0, 0x70, 0xe8), NE_GRN = RGB(0x30, 0xe0, 0x80), NE_BLU = RGB(0x60, 0x90, 0xff), NE_RED = RGB(0xff, 0x40, 0x60), NE_PNK = RGB(0xff, 0x98, 0xa8);
  const NE_WHT = RGB(0xe8, 0xe8, 0xf8), NE_DIM = RGB(0x40, 0x30, 0x60), NE_BRN = RGB(0xc8, 0x84, 0x5c), NE_ORG = RGB(0xff, 0x90, 0x30);
  const SEG7 = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];
  const BLK = [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0];        /* from F: which keys are black */
  const BY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const LANE_OF_GM = [1, 0, 7, 2, 3, 8, 9, 4, 9, 6, 9, 5, 10, 10, 11, 10, 12, 11, 12, 13, 11, 15, 11, 13, 12, 14, 14, 14, 14, 14,
    14, 14, 15, 15, 13, 13, 15, 15, 13, 13, 7, 7, 7, 14, 14, 15, 15];
  const lane_of_note = (n) => n < 35 ? 0 : n > 81 ? 13 : LANE_OF_GM[n - 35];
  const pc_h = (a) => { a >>>= 0; a = (a ^ (a >>> 7)) >>> 0; a = imul(a, 2654435761 | 0) >>> 0; return (a ^ (a >>> 13)) >>> 0; };
  const wf_dim = (c, k) => { const r = ((c >> 11) * k / 256) >>> 0, g = (((c >> 5) & 63) * k / 256) >>> 0, b = ((c & 31) * k / 256) >>> 0; return ((r << 11) | (g << 5) | b) & 0xFFFF; };
  const GV_NAME = ['SCOPE', 'BARS', 'MILK', 'RAYS', 'SHIP', 'RACER', 'DRIVE', 'SYNTH', 'WATERFALL', 'CURVES', 'FLOW', 'TARGET',
    'HOUND', 'BOXER', 'CHORDS', 'ORB', 'DANCE', 'BLUEPRINT', 'PATCH', 'TAPE', 'NEO', 'SMOKE', 'DOOMSCROLL', 'ROOM', 'FLOAT', 'DUEL', 'LOFI STUDY', 'RACCOON'];
  const GV_SHIP = 4, GV_RACER = 5, GV_DRIVE = 6, GV_SYNTH = 7, GV_WATER = 8, GV_CURVES = 9, GV_FLOW = 10, GV_TARGET = 11, GV_HOUND = 12, GV_BOXER = 13,
    GV_CHORDS = 14, GV_ORB = 15, GV_DANCE = 16, GV_BLUEPRINT = 17, GV_PATCH = 18, GV_TAPE = 19, GV_NEO = 20, GV_SMOKE = 21, GV_DOOM = 22, GV_ROOM = 23,
    GV_FLOAT = 24, GV_DUEL = 25, GV_STUDY = 26, GV_RACCOON = 27;
  const WVF_N = 80, SCOPE_M = 511;

  /* the videos (vis/winamp-vid.js): base64 to bytes, once */
  let VP_CLIPS = null;
  const vp_clips = () => {
    if (VP_CLIPS) return VP_CLIPS;
    const src = V.winampVid || [];
    const dec = (s) => { if (typeof atob === 'function') { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; } return new Uint8Array(Buffer.from(s, 'base64')); };
    VP_CLIPS = src.map((c) => ({ name: c.name, w: c.w, h: c.h, nf: c.nf, fps: c.fps, pal: c.pal, off: c.off, data: dec(c.data) }));
    return VP_CLIPS;
  };
  const WM_CLASSIC = 0, WM_ART = 1, WM_COMPUTER = 2, WM_AUDITION = 3, WM_SONYB = 4, WM_FUTURE = 5, WM_TOLAKU = 6, WM_DOODLE = 7, WM_PINK = 8, WM_STAR = 9, WM_FISHER = 10, WM_POLIMER = 11, WM_AGFASC = 12, WM_TEAC = 13, WM_AGFAFC = 14, WM_AGFALNS = 15, WM_BASFR = 16, WM_BASFO = 17, WM_HAPPY = 18, WM_BARBIE = 19, WM_HOLO = 20, WM_FEB = 21, WM_BRITPOP = 22, WM_EMO = 23, WM_HORTEN = 24, WM_EXCL = 25, WM_SKC = 26, WM_OIL = 27, WM_FLORAL = 28, WM_AGFAY = 29, WM_CLASSICBR = 30, WM_SCOTCH = 31, WM_SEIKO = 32, WM_TDKD = 33, WM_KITTYP = 34, WM_KITTYB = 35, WM_SPANKP = 36, WM_SPANKG = 37, WM_AGFAC90 = 38, WM_APPLEPIE = 39, WM_3M = 40, WM_DEMAG = 41, WM_N = 42;
  const SH_INV = [ ["..X.....X..", "...X...X...", "..XXXXXXX..", ".XX.X.X.XX.", ".XXXXXXXXX.", "..X.XXX.X..", ".X.......X.", "X.........X"], ["...XXXXX...", ".XXXXXXXXX.", "XX..XXX..XX", "XXXXXXXXXXX", "..XX...XX..", ".XX.XXX.XX.", "XX.......XX", "..........."], [".....X.....", "...XXXXX...", ".XXX...XXX.", "XXX..X..XXX", ".XXX...XXX.", "...XXXXX...", "..X.X.X.X..", ".X.......X."], ["....XXXXX....", "..XXXXXXXXX..", "XXX.XX.XX.XXX", "..XXXXXXXXX..", "...X..X..X...", ".............", ".............", "............."]];
  const SH_ME = ["BB............", "DBBB..........", ".DBBBBB.......", ".DDBBBGGBB....", "..DBBBGGGBBBO.", ".DDBBBGGBB....", ".DBBBBB.......", "DBBB..........", "BB............"];
  const RC_CAR = ["....111111111111....", "...12222222222221...", "..1222222222222221..", ".111111111111111111.", "11333311111111333311", "13444431111113444431", "13444431111113444431", "11333311111111333311", "11111111111111111111", ".55.............55..", ".55.............55..", "...................."];
  const CH_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const DN_POSE = [["\\O ", " I\\", "< \\"], [" O)", "(I ", " ))"], [" O ", "/I\\", "< >"], [" O/", "<X ", "/ \\"], ["  O", "///", "// "], ["-O-", " / ", " 77"], [" O/", "/I ", "/ >"], ["(O ", " I)", "(( "], [" O ", " V ", " X "], ["\\O ", " X>", "/ \\"], ["\\O/", " I ", "/ \\"], [" O ", ">*<", "/ \\"], [" O ", "< >", "/ \\"]];
  const BP_HALF = [120, 20, 132, 24, 138, 40, 132, 56, 120, 60, -1, -1, 120, 62, 150, 66, 160, 80, 156, 110, 140, 124, 120, 128, -1, -1, 164, 50, 192, 52, 198, 62, 196, 86, 186, 92, 166, 90, 160, 80, 160, 58, 164, 50, -1, -1, 186, 92, 198, 130, 206, 160, 196, 168, 184, 150, 172, 110, -1, -1, 128, 128, 140, 140, 136, 156, 120, 160, -1, -1, 140, 150, 170, 170, 190, 220, 176, 238, 150, 238, 142, 200, 130, 170, 140, 150, -1, -1, 120, 40, 130, 38, 132, 46, 120, 48, -1, -1, 126, 80, 146, 80, 146, 96, 126, 96, 126, 80];
  const BP_BAND = [17, 2, 6, 10, 0, 13, 18, 3, 1];
  const BX_G = ["..........HHHH..........", ".........HHHHHH.........", ".........HSSSSS.........", ".........SSSSSS.........", ".........SSSSSSs........", "..........SSSSs.........", "..........ssss..........", "........SSSSSSSS........", ".......SSSSSSSSSSGGG....", "......SSSSSSSSSSGGGGG...", "......SSSSSSSSSSGGGGG...", ".....sSSSSSSSSGGGGGG....", ".....sSSSSSSSSSGGGG.....", ".....sSSSSSSSSSSs.......", "....GGGsSSSSSSSs........", "...GGGGGsSSSSSs.........", "...GGGGGsSSSSS..........", "....GGG.sSSSSS..........", "........BBBBBBB.........", "........BwBBBBB.........", "........BBBBBBBB........", "........BBBBBBBB........", "........SSS..SSS........", ".......SSS....SSS.......", ".......SSS....SSS.......", "......SSS......SSS......", "......sSS......SSs......", "......sS........Ss......", "......NNN.......NNN.....", ".....NNNN.......NNNN...."];
  const BX_J = ["..........HHHH............", ".........HHHHHH...........", ".........HSSSSS...........", ".........SSSSSS...........", ".........SSSSSSs..........", "..........SSSSs...........", "..........ssss............", "........SSSSSSSSSSSSSGGGG.", ".......SSSSSSSSSSSSSGGGGGG", "......SSSSSSSSSS....GGGGGG", "......SSSSSSSSSS.....GGGG.", ".....sSSSSSSSSs...........", ".....sSSSSSSSSs...........", ".....sSSSSSSSSSs..........", "....GGGsSSSSSSSs..........", "...GGGGGsSSSSSs...........", "...GGGGGsSSSSS............", "....GGG.sSSSSS............", "........BBBBBBB...........", "........BwBBBBB...........", "........BBBBBBBB..........", ".......BBBBBBBBB..........", ".......SSS...SSS..........", "......SSS.....SSS.........", "......SSS......SSS........", ".....SSS.......SSS........", ".....sSS........SSs.......", ".....sS.........SSs.......", ".....NNN.........NNN......", "....NNNN.........NNNN....."];
  const WT_ORDER = [   WM_TEAC, WM_3M, WM_COMPUTER, WM_AGFAY, WM_TDKD, WM_EXCL, WM_TOLAKU, WM_BASFR, WM_BASFO, WM_BARBIE, WM_HOLO, WM_POLIMER, WM_CLASSIC, WM_SEIKO, WM_SKC, WM_SPANKP, WM_AGFAC90, WM_KITTYB, WM_FISHER, WM_DOODLE, WM_SCOTCH, WM_HAPPY, WM_CLASSICBR, WM_BRITPOP, WM_ART, WM_FUTURE, WM_STAR, WM_EMO, WM_KITTYP, WM_OIL, WM_AGFASC, WM_AUDITION, WM_SPANKG, WM_DEMAG, WM_FLORAL, WM_FEB, WM_HORTEN, WM_APPLEPIE, WM_PINK, WM_AGFAFC, WM_SONYB, WM_AGFALNS];
  const WT_M = [ /* shell, label, label2, ink, name, a[6] */
    [59127,63421,16937,25356,61277,26056,65030,62469,57863,37400,13210],
    [52891,65503,4226,13584,9228,17051,65305,4226,57183,62611,9228],
    [63389,63389,8452,8452,8452,26056,65094,62469,57863,37396,13338],
    [6371,63389,55620,12678,65503,8724,53638,46486,0,0,0],
    [50778,63355,9354,12678,6339,9354,12678,0,0,0,0],
    [47298,63389,47298,8452,8452,14224,53638,60040,0,0,0],
    [55556,63422,17885,8452,55558,9372,65503,55558,0,0,0],
    [10598,65096,38493,12678,57926,65503,37785,62342,57926,0,0],
    [63001,65503,26071,8452,6339,57604,65503,58645,0,0,0],
    [12678,51398,51398,63046,65158,8594,4298,63046,17178,0,0],
    [65220,63322,57736,12678,12612,13208,17738,62598,65503,0,0],
    [62403,13722,13722,65503,4228,65158,62470,57868,37528,0,0],
    [13338,22107,22107,4366,4366,4366,57734,63256,65503,0,0],
    [48798,48798,18691,12680,65503,18691,41880,0,0,0,0],
    [57669,63389,57669,8452,8452,4366,57734,65503,4226,0,0],
    [64388,64388,64388,8452,8452,4366,57734,65503,0,0,0],
    [8452,61956,4226,4226,65503,61956,65503,0,0,0,0],
    [8452,65502,64774,8452,4226,57734,65503,46487,0,0,0],
    [62083,17882,17882,4228,65503,29076,65503,0,0,0,0],
    [61974,59272,62352,4228,57618,8594,62352,42135,0,0,0],
    [46173,57118,57118,8452,4226,62874,42782,65428,50590,0,0],
    [62936,65243,51398,65243,51398,55560,62742,0,0,0,0],
    [38298,63389,30043,8452,53768,53768,8452,30043,0,0,0],
    [8452,63356,53768,8452,8452,53768,63356,8452,0,0,0],
    [52856,62098,62098,8452,65503,4226,12690,0,0,0,0],
    [59716,65470,59716,8452,65220,65220,49542,0,0,0,0],
    [55004,55004,8453,8454,65503,61838,65030,13590,8453,17170,0],
    [57052,62872,62872,12678,65503,62732,42654,50331,65426,25230,0],
    [57052,8516,8516,65503,65503,58252,62868,17416,65502,0,0],
    [65028,65028,65028,8452,8452,4366,57734,65503,0,0,0],
    [61204,65502,4870,4870,65220,5256,5256,65220,65220,8854,8854],
    [34270,44699,29254,4228,4228,29254,63252,0,0,0,0],
    [52824,63422,13660,8452,65503,13660,4228,0,0,0,0],
    [21083,21083,4226,65503,61138,4226,29854,56844,65503,0,0],
    [65114,65244,12484,57742,57742,57742,12484,65503,0,0,0],
    [44638,48831,8584,12952,12952,12952,8584,65503,0,0,0],
    [64920,64920,8388,57998,57998,26262,62224,25882,8388,0,0],
    [26508,26508,8388,57874,57874,26262,62098,25884,8388,0,0],
    [64900,64900,64900,8452,65503,4366,57734,65503,0,0,0],
    [8452,64962,64962,8452,8452,8452,42260,65503,0,0,0],
    [64132,57669,65437,65437,65437,65437,0,0,0,0,0],
    [55004,61243,12613,12613,8452,46024,12678,37912,49928,50440,57864]];
  const CH_TPL = [   /* mask, n, r[4], name */
    [0x489, 4, [10, 12, 15, 18], 'MINOR 7'], [0x891, 4, [8, 10, 12, 15], 'MAJOR 7'], [0x491, 4, [4, 5, 6, 7], '7'],
    [0x89, 3, [10, 12, 15], 'MINOR'], [0x91, 3, [4, 5, 6], 'MAJOR'], [0x49, 3, [5, 6, 7], 'DIM'], [0x111, 3, [16, 20, 25], 'AUG'],
    [0xA1, 3, [6, 8, 9], 'SUS4'], [0x85, 3, [8, 9, 12], 'SUS2'],
    [0x81, 2, [2, 3], 'FIFTH'], [0x21, 2, [3, 4], 'FOURTH'], [0x11, 2, [4, 5], 'THIRD'], [0x09, 2, [5, 6], 'MINOR 3RD'], [0x201, 2, [3, 5], 'SIXTH'],
    [0x101, 2, [5, 8], 'MINOR 6TH'], [0x05, 2, [8, 9], 'SECOND'], [0x401, 2, [9, 16], 'MINOR 7TH'], [0x801, 2, [8, 15], 'SEVENTH'], [0x41, 2, [5, 7], 'TRITONE'],
    [0x03, 2, [15, 16], 'HALF STEP'], [0x01, 2, [1, 2], 'OCTAVE']];
  /* rd_pal_t: road, dash, edge, side, post, glow */
  const RD_VEGAS = [RGB(0x04, 0x04, 0x04), RGB(0xf8, 0xa0, 0x20), RGB(0xf8, 0xa0, 0x20), 0, RGB(0x30, 0xb0, 0xc0), RGB(0xa0, 0xf0, 0xff)];
  const RD_SYNTH = [RGB(0x18, 0x0c, 0x30), RGB(0xff, 0x60, 0xd0), RGB(0x60, 0xe0, 0xff), 0, RGB(0x60, 0x40, 0xb0), RGB(0xff, 0xc0, 0xf0)];
  /* nc_pal_t: sky0, sky1, beam, far, farw0, farw1, near, nearl, win, wind */
  const NC_NEO = { sky0: RGB(0x06, 0x18, 0x26), sky1: RGB(0x14, 0x40, 0x56), beam: RGB(0x58, 0x70, 0x48), far: RGB(0x10, 0x2c, 0x44), farw0: RGB(0xff, 0x60, 0xd0), farw1: RGB(0x60, 0xf0, 0xff),
    near: RGB(0x06, 0x12, 0x1e), nearl: RGB(0x10, 0x24, 0x34), win: RGB(0xff, 0xd8, 0x70), wind: RGB(0x14, 0x1c, 0x24) };
  const NC_BLUE = { sky0: RGB(0x02, 0x02, 0x10), sky1: RGB(0x08, 0x10, 0x60), beam: RGB(0x30, 0x40, 0x90), far: RGB(0x20, 0x3c, 0x60), farw0: RGB(0xff, 0xf0, 0xa0), farw1: RGB(0xc0, 0xd8, 0xff),
    near: RGB(0x24, 0x48, 0x60), nearl: RGB(0x40, 0x70, 0x88), win: RGB(0xff, 0xe0, 0x40), wind: RGB(0x10, 0x20, 0x30) };
  const SM_BODY = ['......XXXXX.......', '.....XXXXXXX......', '....XXXXXXXXX.....', '....XXXXXXXXX.....', '....XXXXXXXXX.....',
    '.....XXXXXXX......', '......XXXXX.......', '.......XXX........', '....XXXXXXXXXX....', '..XXXXXXXXXXXXXX..', '.XXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXXX'];
  const WF_SL_SHRT = ['DIST', 'CHORS', 'DELAY', 'VERB'];      /* WF_SL[0..3].shrt (the group SEND: what PATCH names its modules) */

  /* one firmware: its statics, its functions (each visual has its own, kept in S.e) */
  function mk(gv) {
    const VP = vp_clips();
    /* ---- gfx.c: the canvas (cv_px holds the colours as they are; the firmware keeps them byte-swapped for the panel) */
    const cv_px = new Uint16Array(240 * 124);
    let cv_w = 240, cv_h = 123, cv_ox = 0, cv_oy = 0;
    let cv_cx0 = -32768, cv_cy0 = -32768, cv_cx1 = 32767, cv_cy1 = 32767;
    let wf_rx = 0, wf_ry = 0, wf_rw = 240, wf_rh = 240;
    let wf_clx0 = 0, wf_clx1 = 240;
    const wf_cly0 = -1000, wf_cly1 = 1000;
    const cv_begin = (w, h, bg) => { if (w * h > 240 * 124) h = (240 * 124 / w) >>> 0; cv_w = w, cv_h = h; cv_px.fill(bg, 0, w * h); };
    const cv_pset = (x, y, c) => {
      if (x < cv_cx0 || x >= cv_cx1 || y < cv_cy0 || y >= cv_cy1) return;
      y += cv_oy, x += cv_ox;
      if ((x >>> 0) < cv_w && (y >>> 0) < cv_h) cv_px[y * cv_w + x] = c;
    };
    const WFR = (x, y, w, h, c) => {   /* cv_rect */
      let x1, y1, i;
      if (x < cv_cx0) w -= cv_cx0 - x, x = cv_cx0;
      if (y < cv_cy0) h -= cv_cy0 - y, y = cv_cy0;
      if (x + w > cv_cx1) w = cv_cx1 - x;
      if (y + h > cv_cy1) h = cv_cy1 - y;
      if (w <= 0 || h <= 0) return;
      x1 = x + w + cv_ox, y1 = y + h + cv_oy;
      y += cv_oy, x += cv_ox;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x1 > cv_w) x1 = cv_w;
      if (y1 > cv_h) y1 = cv_h;
      for (; y < y1; y++) for (i = x; i < x1; i++) cv_px[y * cv_w + i] = c;
    };
    const cv_line = (x0, y0, x1, y1, c) => {
      const dx = x1 > x0 ? x1 - x0 : x0 - x1, sx = x0 < x1 ? 1 : -1, dy = y1 > y0 ? y0 - y1 : y1 - y0, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, guard = 2000;
      while (guard--) {
        const e2 = 2 * err;
        cv_pset(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    /* ---- text: big = the 5 x 7 face, else the 5 px one */
    const chr = (s, i) => { let c = s.charCodeAt(i) & 255; if (c >= 97 && c <= 122) c -= 32; if (c < 32 || c > 95) c = 63; return c; };
    const wf_tw = (big, s) => { let w = 0; for (let i = 0; i < s.length; i++) { const c = chr(s, i); w += (big ? WFM_W[c - 32] : WFS_W[c - 32]) + 1; } return w ? w - 1 : 0; };
    const wf_text = (x, y, big, s, col) => {
      const h = big ? WFM_H : WFS_H;
      if (y >= wf_ry + wf_rh || y + h <= wf_ry) return x + wf_tw(big, s) + 1;
      for (let i = 0; i < s.length; i++) {
        const c = chr(s, i), w = big ? WFM_W[c - 32] : WFS_W[c - 32], R = big ? WFM_ROWS : WFS_ROWS, o = (c - 32) * h;
        if (x + w > wf_clx0 && x < wf_clx1)
          for (let r = 0; r < h; r++)
            for (let b = 0; b < w; b++)
              if (((R[o + r] >> (7 - b)) & 1) && x + b >= wf_clx0 && x + b < wf_clx1 && y + r >= wf_cly0 && y + r < wf_cly1) cv_pset(x + b, y + r, col);
        x += w + 1;
      }
      return x;
    };
    const wf_textc = (cx, y, big, s, col) => { wf_text(cx - (wf_tw(big, s) / 2 | 0), y, big, s, col); };
    const wf_textr = (rx, y, big, s, col) => { wf_text(rx - wf_tw(big, s), y, big, s, col); };
    const fmt_int = (v) => String(v | 0);
    const wf_isqrt = (v) => { v >>>= 0; let r = 0, b = 1 << 30; while (b > v) b >>>= 2; while (b) { if (v >= r + b) { v -= r + b; r = (r >>> 1) + b; } else r >>>= 1; b >>>= 2; } return r; };

    /* ---- what the firmware reads (see the head of this file) */
    let A = null, fm1_ms = 0, playing = 0, BPM = 120, scope_buf = new Int16Array(512), scope_bufr = new Int16Array(512), scope_w = 0, sel_name = 'SAMPLER', preset = 0;
    let g_filt = 0, first = 1, wf_t0 = 0, wf_was_play = 0, wf_t_lcd = 0, wf_t_vz = 0;
    const p_send = [0, 0, 0, 0], p_mute = [0, 0, 0, 0];
    const trk_level = (c) => c === 3 ? 100 : 104;            /* LEVEL (the drum track: GLO > DRUMS LEVEL), their defaults */
    const wf_secs = () => playing ? ((((fm1_ms - wf_t0) >>> 0) / 1000) >>> 0) : 0;
    const wf_frac = (min, max, v) => { const r = max - min; return r > 0 ? clamp(((v - min) * 1024 / r) | 0, 0, 1024) : 0; };
    let pend_keys = 0, pend_dr = 0;
    let nk_mask = 0, nk_prev = 0, nk_on = 0, nk_hand = 0, nk_hprev = 0, nk_hon = 0, dr_hits = 0, ev_lvl = 0, ev_rate = 0;
    const hold = new Uint8Array(27);
    const key_of_note = (n) => { let k = n - 53; while (k < 0) k += 12; while (k > 26) k -= 12; return k; };

    /* ---- wf_spectrum: 19 Goertzel filters, 60 Hz .. 10 kHz (log), over the last 256 samples of the output */
    const wf_spec = new Uint8Array(19), wf_peak = new Uint8Array(19), wf_pkt = new Uint8Array(19), sp_s = new Uint8Array(19);
    const wf_spectrum = () => {
      const w = scope_w >>> 0;
      for (let b = 0; b < 19; b++) {
        let s1 = 0, s2 = 0, re, im, m, lg = 0, h;
        const c = WF_GC[b];
        for (let n = 0; n < 256; n++) {
          const x = scope_buf[(w - 256 + n) & SCOPE_M] >> 7, s0 = (x + (imul(c, s1) >> 14) - s2) | 0;
          s2 = s1, s1 = s0;
        }
        re = (s1 - (imul(c, s2) >> 15)) | 0;
        im = imul(wf_isqrt(16384 * 16384 - imul(c / 2 | 0, c / 2 | 0)), s2 < 0 ? -s2 : s2) >> 14;
        re = re < 0 ? -re : re;
        m = (re > im ? re + (im / 2 | 0) : im + (re / 2 | 0)) | 0;
        while ((m >> lg) > 1) lg++;
        h = m < 2 ? 0 : clamp(((lg * 8 + (((m << 3) >> lg) & 7) - 40) * 24 / 72) | 0, 0, 24);
        wf_spec[b] = h > wf_spec[b] ? h : wf_spec[b] > 1 ? wf_spec[b] - 2 : 0;
        if (wf_spec[b] >= wf_peak[b]) wf_peak[b] = wf_spec[b], wf_pkt[b] = 10;
        else if (wf_pkt[b]) wf_pkt[b]--;
        else if (wf_peak[b]) wf_peak[b]--;
      }
    };

    /* ---- the cells (wv_mem: the whole screen's 80 x 80, the videos' 4-bit frames, ORB's water as int8, the histories) */
    const wv_mem = new Uint8Array(7200), wv_i8 = new Int8Array(wv_mem.buffer);
    let wv_w = WVF_N, wv_h = WVF_N, wvf_on = 0, wv_ph = 0, wv_force = 0, last_mode = 0xFF;
    const wv_sin4 = (a) => { const i = (a >>> 2) & 63, f = a & 3; return ((WV_SIN[i] * (4 - f) + WV_SIN[(i + 1) & 63] * f) / 4) | 0; };
    const wv_put = (x, y, v) => { if ((x >>> 0) < wv_w && (y >>> 0) < wv_h && (wv_force || (wv_mem[y * wv_w + x] & 15) < (v & 15))) wv_mem[y * wv_w + x] = v; };
    const wv_line = (x0, y0, x1, y1, v) => {
      const dx = x1 > x0 ? x1 - x0 : x0 - x1, dy = -(y1 > y0 ? y1 - y0 : y0 - y1), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy, n = 0;
      for (;;) {
        wv_put(x0, y0, v);
        const e2 = 2 * e;
        if ((x0 === x1 && y0 === y1) || ++n > 400) break;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    };
    const wv_fade = (d) => { const N = wv_w * wv_h; for (let n = 0; n < N; n++) { const v = wv_mem[n]; wv_mem[n] = (v & 15) > d ? v - d : 0; } };
    const wv_bass = () => ((wf_spec[0] + wf_spec[1] + wf_spec[2] + wf_spec[3]) / 4) | 0;
    const wv_all = () => { let a = 0; for (let i = 0; i < 19; i++) a += wf_spec[i]; return a; };
    let wvf_seed = 0x2545F491;
    const wvf_rnd = () => { wvf_seed = (imul(wvf_seed, 1664525) + 1013904223) >>> 0; return wvf_seed >>> 9; };
    const wvf_st = new Int16Array(56 * 3);
    const wvf_new = (i, far) => {
      wvf_st[i * 3] = (wvf_rnd() % 241) - 120, wvf_st[i * 3 + 1] = (wvf_rnd() % 241) - 120;
      wvf_st[i * 3 + 2] = far ? 256 : 24 + (wvf_rnd() % 232);
    };

    /* SHIP of the window (in MILK's turn: its streaks only) */
    const wsh_s = new Uint8Array(24 * 3);
    let ws_x = 0, ws_y = 0, ws_fl = 0;
    const wv_ship_step = (W, H) => {
      let i, hi = 0, lo = 0;
      const all = wv_all(), wide = W > H, L = wide ? W : H, X = wide ? H : W, sp = 1 + (all / 40 | 0);
      wv_fade(5);
      for (i = 0; i < 9; i++) lo += wf_spec[i];
      for (i = 10; i < 19; i++) hi += wf_spec[i];
      for (i = 0; i < 24; i++) {
        const o = i * 3;
        if (!wsh_s[o + 2]) { wsh_s[o] = wvf_rnd() % L, wsh_s[o + 1] = wvf_rnd() % X, wsh_s[o + 2] = 2 + wvf_rnd() % 9; }
        wsh_s[o] = wsh_s[o] + ((sp * wsh_s[o + 2] / 4 | 0) + 1);
        if (wsh_s[o] >= L + wsh_s[o + 2]) { wsh_s[o] = 0, wsh_s[o + 1] = wvf_rnd() % X, wsh_s[o + 2] = 2 + wvf_rnd() % 9; }
        if (wide) wv_line(W - wsh_s[o], wsh_s[o + 1], W - wsh_s[o] + wsh_s[o + 2], wsh_s[o + 1], 4 + wsh_s[o + 2]);
        else wv_line(wsh_s[o + 1], wsh_s[o] - wsh_s[o + 2], wsh_s[o + 1], wsh_s[o], 4 + wsh_s[o + 2]);
      }
      i = (WV_SIN[(wv_ph * 2) & 63] * 3 / 127 | 0) + clamp((hi - lo) / 12 | 0, -8, 8);
      if (wide) ws_x = (W / 4 | 0) + (WV_SIN[(wv_ph + 16) & 63] * 2 / 127 | 0), ws_y = (H / 2 | 0) + i;
      else ws_x = (W / 2 | 0) + i, ws_y = (H * 2 / 3 | 0) + (WV_SIN[(wv_ph + 16) & 63] * 2 / 127 | 0);
      ws_fl = 2 + (wv_bass() / 4 | 0) + (wv_ph & 1);
    };
    /* wv_draw: the window's first pictures on the cells in use (here the whole screen's 80 x 80) */
    const MILK_SEQ = [2, 4, 3, 2, 1];
    const wv_draw = (mode) => {
      let x, y, i;
      const W = wv_w, H = wv_h, cx = W / 2 | 0, cy = H / 2 | 0, ax = W >= 2 * H ? 2 : 1, w = scope_w >>> 0;
      let dm = mode;
      const bass = wv_bass(), all = wv_all();
      if (mode === 2) dm = MILK_SEQ[((wv_ph / 200) >>> 0) % 5];
      if (mode === 2) {
        for (let q = 0; q < 4; q++) {
          const sx = q & 1 ? 1 : -1, sy = q & 2 ? 1 : -1;
          for (let dy = cy; dy >= 0; dy--)
            for (let dx = cx; dx >= 0; dx--) {
              const tx = cx + sx * dx, ty = cy + sy * dy, fx = cx + sx * (dx * 7 / 8 | 0), fy = cy + sy * (dy * 7 / 8 | 0);
              if ((tx >>> 0) >= W || (ty >>> 0) >= H) continue;
              const v = wv_mem[fy * wv_w + fx] & 15;
              wv_mem[ty * wv_w + tx] = v > 1 ? v - 1 : 0;
            }
        }
      } else wv_fade(3);
      wv_ph = (wv_ph + 1) >>> 0;
      if (dm === 0) {
        let py = cy;
        for (x = 0; x < W; x++) {
          const s = scope_buf[(w - 2 * W + 2 * x) & SCOPE_M];
          y = clamp(cy - (s * cy / 12000 | 0), 0, H - 1);
          if (x) wv_line(x - 1, py, x, y, 15);
          py = y;
        }
      } else if (dm === 1) {
        for (i = 0; i < 19; i++) {
          const bx = 3 + (i * (W - 8) / 18 | 0), h = wf_spec[i] * (cy - 1) / 24 | 0;
          wv_line(bx, cy - h, bx, cy + h, 15);
          wv_line(bx + 1, cy - h, bx + 1, cy + h, 11);
          if (W > 100) wv_put(bx, cy - 1 - (wf_peak[i] * (cy - 1) / 24 | 0), 15);
          else wv_line(bx + 2, cy - h, bx + 2, cy + h, 7);
        }
      } else if (dm === 2) {
        const sc = ((wv_ph / 160) >>> 0) % 3;
        let py = cy, a, px = 0;
        if (sc === 0) {
          for (x = W / 7 | 0; x < W - (W / 7 | 0); x++) {
            const sm = scope_buf[(w - 2 * W + 2 * x) & SCOPE_M];
            y = clamp(cy - (sm * H / 62400 | 0), 0, H - 1);
            if (x > (W / 7 | 0)) wv_line(x - 1, py, x, y, 15);
            py = y;
          }
        } else if (sc === 1) {
          const r = (3 + (bass / 4 | 0)) * H / 52 | 0;
          for (a = 0; a <= 32; a++) {
            const qx = cx + (r * ax * WV_SIN[(a * 2 + 16) & 63] / 127 | 0), qy = cy + (r * WV_SIN[(a * 2) & 63] / 127 | 0);
            if (a) wv_line(px, py, qx, qy, bass > 6 ? 15 : 9);
            px = qx, py = qy;
          }
        } else {
          const an = wv_ph * 2;
          for (a = -1 - (all / 80 | 0); a <= 1 + (all / 80 | 0); a++) {
            const q = (an + (a + 64)) & 63;
            wv_line(cx, cy, cx + ((cx + 2) * WV_SIN[(q + 16) & 63] / 127 | 0), cy + ((cy + 4) * WV_SIN[q] / 127 | 0), 15);
            wv_line(cx, cy, cx - ((cx + 2) * WV_SIN[(q + 16) & 63] / 127 | 0), cy - ((cy + 4) * WV_SIN[q] / 127 | 0), 11);
          }
        }
      } else if (dm === 3) {
        for (i = 0; i < 19; i++) {
          const a = (((wv_ph / 2) >>> 0) + ((i * 64 / 19) >>> 0)) & 63, l = (4 + wf_spec[i] * 2 + (all / 40 | 0)) * H / 52 | 0;
          wv_line(cx, cy, cx + (l * WV_SIN[(a + 16) & 63] / 127 | 0), cy + (l * WV_SIN[a] / (127 * ax) | 0), 15);
        }
      } else wv_ship_step(W, H);
    };
    const wv_pal_of = (mode) => mode === 2 ? ((wv_ph / 40) >>> 0) % 6 : mode === 4 ? 5 : mode;
    const wvf_col = (v) => WV_PAL[wv_pal_of(gv)][((v & 15) - 1) >> 2];
    const wvf_cells = (y0, hh) => {
      for (let y = y0 / 3 | 0; y < WVF_N && y * 3 < y0 + hh; y++)
        for (let x = 0; x < WVF_N; x++) { const v = wv_mem[y * WVF_N + x]; if (v & 15) WFR(x * 3, y * 3, 3, 3, wvf_col(v)); }
    };
    let wvf_lastb = 0, wvf_hit_n = 0;
    const wvf_hits = () => { const b = wv_bass(); if (b > wvf_lastb + 4 && b > 8) wvf_hit_n = 5; else if (wvf_hit_n) wvf_hit_n--; wvf_lastb = b; };
    const wvf_disk = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) { let hw = 0; while ((hw + 1) * (hw + 1) + y * y <= r * r) hw++; WFR(cx - hw, cy + y, 2 * hw + 1, 1, col); } };
    const wvf_pline = (x0, y0, x1, y1, col) => {
      const dx = x1 > x0 ? x1 - x0 : x0 - x1, dy = -(y1 > y0 ? y1 - y0 : y0 - y1), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy, n = 0;
      for (;;) {
        cv_pset(x0, y0, col);
        if ((x0 === x1 && y0 === y1) || ++n > 500) break;
        const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
      }
    };

    /* ---- the neon ones' strokes */
    const ne_line = (x0, y0, x1, y1, c) => {
      const dx = x1 > x0 ? x1 - x0 : x0 - x1, dy = y1 > y0 ? y1 - y0 : y0 - y1;
      wvf_pline(x0, y0, x1, y1, c);
      if (dx > dy) wvf_pline(x0, y0 + 1, x1, y1 + 1, c); else wvf_pline(x0 + 1, y0, x1 + 1, y1, c);
    };
    const ne_line3 = (x0, y0, x1, y1, c) => {
      const dx = x1 > x0 ? x1 - x0 : x0 - x1, dy = y1 > y0 ? y1 - y0 : y0 - y1;
      ne_line(x0, y0, x1, y1, c);
      if (dx > dy) wvf_pline(x0, y0 - 1, x1, y1 - 1, c); else wvf_pline(x0 - 1, y0, x1 - 1, y1, c);
    };
    const fg_man = (x, y, s, dir, p, c) => {
      const a = s < 0 ? -s : s, sh = y - (48 * s / 8 | 0), hp = y - (27 * s / 8 | 0), r = 6 * a / 8 | 0;
      wvf_disk(x, y - (58 * s / 8 | 0), r < 2 ? 2 : r, c);
      WFR(x - r, s < 0 ? y + (27 * a / 8 | 0) : y - (51 * a / 8 | 0), 2 * r, 24 * a / 8 | 0, c);
      for (let k = 0; k < 4; k++) {
        const bx = x + (k & 1 ? 1 : -1) * (k < 2 ? r - 1 : r / 2 | 0), by = k < 2 ? sh : hp, ex = x + (dir * p[k * 2] * a / 8 | 0), ey = by + (p[k * 2 + 1] * s / 8 | 0);
        if (a > 8) ne_line3(bx, by, ex, ey, c); else ne_line(bx, by, ex, ey, c);
      }
    };
    const ne_ring = (cx, cy, r, c) => {
      let px = cx + r, py = cy;
      for (let i = 1; i <= 32; i++) { const x = cx + (r * WV_SIN[(i * 2 + 16) & 63] / 127 | 0), y = cy + (r * WV_SIN[(i * 2) & 63] / 127 | 0); ne_line(px, py, x, y, c); px = x, py = y; }
    };
    const ne_num = (x, y, h, v, c) => {
      const b = fmt_int(clamp(v, 0, 999)), w = h / 2 | 0, m = h / 2 | 0;
      for (let i = 0; i < b.length; i++, x += w + (h / 4 | 0)) {
        const s = SEG7[(b.charCodeAt(i) - 48) % 10];
        if (s & 1) ne_line(x, y, x + w, y, c);
        if (s & 2) ne_line(x + w, y, x + w, y + m, c);
        if (s & 4) ne_line(x + w, y + m, x + w, y + h, c);
        if (s & 8) ne_line(x, y + h, x + w, y + h, c);
        if (s & 16) ne_line(x, y + m, x, y + h, c);
        if (s & 32) ne_line(x, y, x, y + m, c);
        if (s & 64) ne_line(x, y + m, x + w, y + m, c);
      }
    };
    const ne_gauge = (cx, cy, f, c) => {
      const a = 160 + ((f * 64 / 1024) >>> 0);
      for (let t = 0; t <= 4; t++) { const at = 160 + t * 16; ne_line(cx + (11 * wv_sin4(at + 64) / 127 | 0), cy + (11 * wv_sin4(at) / 127 | 0), cx + (14 * wv_sin4(at + 64) / 127 | 0), cy + (14 * wv_sin4(at) / 127 | 0), NE_DIM); }
      ne_line(cx, cy, cx + (12 * wv_sin4(a + 64) / 127 | 0), cy + (12 * wv_sin4(a) / 127 | 0), c);
      WFR(cx - 1, cy - 1, 3, 3, c);
    };
    const ne_frac = (v, lo, hi) => hi > lo ? clamp(((v - lo) * 1024 / (hi - lo)) | 0, 0, 1024) : 0;
    const ne_hist = (rows, cols) => {
      for (let r = rows - 1; r > 0; r--) for (let i = 0; i < cols; i++) wv_mem[r * cols + i] = wv_mem[(r - 1) * cols + i];
      for (let i = 0; i < cols; i++) wv_mem[i] = sp_s[(i * 19 / cols) >>> 0];
    };
    const ne_box = (x, y, w, h, t, c) => {
      ne_line(x, y, x + w, y, c), ne_line(x + w, y, x + w, y + h, c), ne_line(x + w, y + h, x, y + h, c), ne_line(x, y + h, x, y, c);
      if (t) wf_textc(x + (w / 2 | 0) + 1, y + (h / 2 | 0) - 3, 1, t, c);
    };
    const ne_warn = (x, y, on) => {
      const c = on ? NE_RED : NE_DIM;
      ne_line(x, y + 12, x + 7, y, c), ne_line(x + 7, y, x + 14, y + 12, c), ne_line(x + 14, y + 12, x, y + 12, c);
      WFR(x + 7, y + 4, 1, 4, c), WFR(x + 7, y + 9, 1, 1, c);
    };
    const pc_sky = (top, bot, h) => {
      for (let y = 0; y < h; y += 2) {
        const t = y * 255 / h | 0, r = (((top >> 11) & 31) * (255 - t) + ((bot >> 11) & 31) * t) / 255 | 0, g = (((top >> 5) & 63) * (255 - t) + ((bot >> 5) & 63) * t) / 255 | 0, b = ((top & 31) * (255 - t) + (bot & 31) * t) / 255 | 0;
        const c = (r << 11 | g << 5 | b) & 0xFFFF;
        WFR(0, y, 240, 2, c);
        if (((y / 2 | 0) % 6) === 5 && y < (h / 3 | 0)) for (let x = (y / 2 | 0) & 2; x < 240; x += 4) WFR(x, y, 2, 2, (c + 0x0841) & 0xFFFF);
      }
    };

    /* ---- the keys (nk_step) */
    const nk_step = () => {
      let m = 0, n = 0;
      for (let k = 0; k < 27; k++) { if ((pend_keys >>> k) & 1) hold[k] = 4; if (hold[k]) m |= 1 << k, hold[k]--; }
      pend_keys = 0;
      const hand = ((A && A.hand) >>> 0) & 0x7FFFFFF, keys = ((A && A.keys) >>> 0) & 0x7FFFFFF;
      m = (m | hand | keys) >>> 0;
      nk_on = (m & ~nk_prev) >>> 0, nk_prev = m, nk_mask = m;
      nk_hand = hand, nk_hon = (nk_hand & ~nk_hprev) >>> 0, nk_hprev = nk_hand;
      dr_hits = pend_dr, pend_dr = 0;
      for (let d = nk_on; d; d >>>= 1) n += d & 1;
      ev_rate += (n * 20 * 16 - ev_rate) / 24 | 0;
      ev_lvl += (wv_all() - ev_lvl) / 4 | 0;
    };
    const nk_low = (m) => (m & 0x1FFF) !== 0;        /* a key on the left half (F3..) */
    const nk_high = (m) => (m & 0x7FFE000) !== 0;    /* on the right half */
    const nk_top = (m) => { let k = -1; m >>>= 0; while (m) { k++; m >>>= 1; } return k; };
    const nc_spec = () => { for (let i = 0; i < 19; i++) sp_s[i] = sp_s[i] + ((wf_spec[i] - sp_s[i]) / 3 | 0); };
    const popcnt = (m) => { let n = 0; for (m >>>= 0; m; m >>>= 1) n += m & 1; return n; };

    /* ---- SHIP: our ship on the left, invaders, saucers and asteroids on the right; a shot per note */
    const sh_e = []; for (let i = 0; i < 6; i++) sh_e.push({ x: 0, y: 0, vx: 0, vy: 0, kind: 0, boom: 0, wait: 0, tx: 0 });
    const sh_b = new Int16Array(8 * 5);
    let sh_y = 512, sh_warp = 0;
    const s16 = (v) => (v << 16) >> 16;
    const sh_spawn = (e, idx) => {
      const h = pc_h(imul(wv_ph, 7) + idx * 31);
      e.kind = h % 6, e.x = 1100, e.y = s16(120 + ((h >>> 3) % 760)), e.vx = s16(-(4 + ((h >>> 9) % 5))), e.vy = 0;
      e.boom = 0, e.wait = 0, e.tx = (120 + ((h >>> 13) % 100)) & 255;
    };
    const sh_step = () => {
      let i, k, best = -1, bd = 99999;
      for (i = 0; i < 6; i++) {
        const e = sh_e[i];
        if (e.boom) { e.boom = (e.boom - 1) & 255; if (e.boom === 0) e.wait = (10 + i * 3) & 255; continue; }
        if (e.wait) { e.wait = (e.wait - 1) & 255; if (e.wait === 0) sh_spawn(e, i); continue; }
        if (!e.x) { sh_spawn(e, i); continue; }
        if (e.kind === 5) { e.x = s16(e.x + e.vx); if (e.x < -60) sh_spawn(e, i); }
        else if (e.x > e.tx * 4) e.x = s16(e.x + e.vx);
        else {
          if (!(wv_ph % 12)) { const h = pc_h(wv_ph + i * 77); e.vx = s16((h % 9) - 4); e.vy = s16(((h >>> 4) % 13) - 6); }
          e.x = s16(clamp(e.x + e.vx, 480, 980)), e.y = s16(clamp(e.y + e.vy, 80, 920));
        }
        { let d = e.y - sh_y; d = d < 0 ? -d : d; d += (e.x - 200) / 3 | 0; if (e.x < 1000 && d < bd) bd = d, best = i; }
      }
      sh_warp += nk_on ? 6 : 0, sh_warp = clamp(sh_warp, 0, 40), sh_warp -= sh_warp > 0 ? 1 : 0;
      if (best >= 0) sh_y += (sh_e[best].y - sh_y) / (ev_rate > 40 ? 2 : 4) | 0;
      for (k = 0; k < 27; k++) if (((nk_on >>> k) & 1) && best >= 0) {
        for (i = 0; i < 8; i++) if (!sh_b[i * 5 + 2]) {
          const dx = sh_e[best].x - 150, dy = sh_e[best].y - sh_y, n = ((dx < 0 ? -dx : dx) / (130 + sh_warp * 4) | 0) + 1;
          sh_b[i * 5] = 150, sh_b[i * 5 + 1] = sh_y, sh_b[i * 5 + 2] = (dx / n | 0) ? (dx / n | 0) : 1, sh_b[i * 5 + 3] = dy / n | 0, sh_b[i * 5 + 4] = k;
          break;
        }
      }
      for (i = 0; i < 8; i++) if (sh_b[i * 5 + 2]) {
        sh_b[i * 5] = sh_b[i * 5] + sh_b[i * 5 + 2], sh_b[i * 5 + 1] = sh_b[i * 5 + 1] + sh_b[i * 5 + 3];
        for (k = 0; k < 6; k++) {
          const e = sh_e[k], dx = e.x - sh_b[i * 5], dy = e.y - sh_b[i * 5 + 1];
          if (!e.boom && !e.wait && e.x < 1024 && dx < 60 && dx > -60 && dy < 70 && dy > -70) { e.boom = 10; sh_b[i * 5 + 2] = 0; break; }
        }
        if (sh_b[i * 5] > 1100 || sh_b[i * 5] < -50) sh_b[i * 5 + 2] = 0;
      }
    };
    const SH_NC = [RGB(0xff, 0x50, 0x40), RGB(0xff, 0xa0, 0x30), RGB(0xf0, 0xf0, 0x60), RGB(0x60, 0xf0, 0x90), RGB(0x60, 0xc0, 0xff), RGB(0xd0, 0x80, 0xff)];
    const sh_note_col = (k) => SH_NC[(k * 6) / 27 | 0];
    const sh_draw = (rx, ry, rw, rh, z, big) => {
      let i, r, c;
      const en = RGB(0xe0, 0xe8, 0xd0), star = RGB(0xc8, 0xd8, 0xc0);
      const SX = (v) => rx + (v * rw / 1024 | 0), SY = (v) => ry + (v * rh / 1024 | 0);
      WFR(rx, ry, rw, rh, RGB(0x10, 0x0c, 0x1e));
      for (i = 0; i < (big ? 70 : 34); i++) {
        const sp = 1 + (i % 3) + ((sh_warp / 3) >>> 0);
        const x = rx + ((pc_h(i * 13) % rw + rw * 64 - ((imul(wv_ph, sp) >>> 0) % (rw * 64))) % rw), y = ry + pc_h(i * 29) % rh, l = sh_warp * (1 + i % 3) / 3 | 0;
        WFR(x, y, 1 + l, 1, l > 6 ? (i & 1 ? RGB(0x80, 0xc0, 0xff) : WC_WHT) : star);
        if (i % 11 === 0 && !l) WFR(x - 1, y, 3, 1, star), WFR(x, y - 1, 1, 3, star);
      }
      for (i = 0; i < 6; i++) {
        const e = sh_e[i], x = SX(e.x), y = SY(e.y);
        if (e.wait || !e.x) continue;
        if (e.boom) {
          const rr = (10 - e.boom) * z;
          for (r = 0; r < 8; r++) { const an = r * 32; WFR(x + (rr * wv_sin4(an + 64) / 127 | 0), y + (rr * wv_sin4(an) / 127 | 0), z, z, e.boom & 1 ? WC_WHT : RGB(0xff, 0xa0, 0x30)); }
          continue;
        }
        if (e.kind === 5) {
          wvf_disk(x, y, 4 * z, RGB(0x8a, 0x84, 0x90)), WFR(x - z, y - 2 * z, 2 * z, z, RGB(0x60, 0x5a, 0x68)), WFR(x + z, y + z, z, z, RGB(0x60, 0x5a, 0x68));
          continue;
        }
        {
          const sp = SH_INV[e.kind < 4 ? e.kind : 3], w = sp[0].length, fl = (((wv_ph / 6) >>> 0) + i) & 1;
          for (r = 0; r < 8; r++) for (c = 0; c < w; c++) if (sp[r][c] === 'X' && !(fl && r === 7)) WFR(x - (w * z / 2 | 0) + c * z, y - 4 * z + r * z, z, z, en);
        }
      }
      {
        const x = SX(90), y = SY(sh_y);
        for (r = 0; r < 9; r++) for (c = 0; c < 14; c++) {
          const ch = SH_ME[r][c];
          if (ch !== '.') WFR(x + c * z, y - (9 * z / 2 | 0) + r * z, z, z, ch === 'B' ? WC_BTN : ch === 'D' ? WC_FR2 : ch === 'G' ? WC_GRN : WC_AMB);
        }
        for (i = 0; i < 2 + (wv_ph & 1) + (wv_bass() / 6 | 0); i++) WFR(x - (i + 1) * z, y - (z / 2 | 0), z, z, i < 1 ? WC_WHT : RGB(0xff, 0x80, 0x30));
      }
      for (i = 0; i < 8; i++) if (sh_b[i * 5 + 2]) { const x = SX(sh_b[i * 5]), y = SY(sh_b[i * 5 + 1]); WFR(x - 3 * z, y, 4 * z, z, sh_note_col(sh_b[i * 5 + 4])); }
    };

    /* ---- the road (RACER, DRIVE) */
    let rd_pos = 0, rd_spd = 40, rd_cur = 0, rd_curt = 0, rd_px = 0, rd_lane = 1, rd_kmh = 90 * 16, rd_ovt = 0;
    const rd_car = [[900, 1, 0], [1600, 0, 1], [2300, 2, 2], [3200, 1, 3]];
    const rd_step = () => {
      let i, tgt = 90 + clamp(((clamp(BPM, 40, 240) - 70) / 2 | 0) + (ev_rate / 5 | 0) + (ev_lvl / 3 | 0), 0, 120);
      if (!playing && ev_lvl < 10) tgt = 90;
      if (rd_ovt) rd_ovt--, tgt = tgt + 30 > 210 ? 210 : tgt + 30;
      tgt *= 16, rd_kmh += (tgt - rd_kmh) / (tgt > rd_kmh ? 40 : 16) | 0;
      rd_spd = ((rd_kmh / 16 | 0) - 30) * 2 / 3 | 0;
      rd_pos += rd_spd;
      if (!(wv_ph % 40)) rd_curt = (pc_h(wv_ph) % 200) - 100;
      rd_cur += ((rd_curt * clamp(rd_spd - 30, 0, 160) / 160 | 0) - rd_cur) / 20 | 0;
      for (i = 0; i < 4; i++) {
        const c = rd_car[i];
        c[0] -= rd_spd - 34;
        if (c[0] < -120) c[0] = 2400 + (pc_h(i + wv_ph) % 1200), c[1] = pc_h(imul(wv_ph, 3) + i) % 3;
        if (c[0] > 0 && c[0] < 520 && c[1] === rd_lane) {
          let a = rd_lane === 0 ? 1 : rd_lane === 2 ? 1 : (pc_h(wv_ph) & 1) ? 0 : 2, j, ok = 1;
          for (j = 0; j < 4; j++) if (rd_car[j][1] === a && rd_car[j][0] > -60 && rd_car[j][0] < 700) ok = 0;
          if (ok) rd_lane = a, rd_ovt = 90;
          else for (j = 0; j < 3; j++) { let k2, ok2 = j !== rd_lane; for (k2 = 0; k2 < 4; k2++) if (rd_car[k2][1] === j && rd_car[k2][0] > -60 && rd_car[k2][0] < 700) ok2 = false; if (ok2) { rd_lane = j, rd_ovt = 90; break; } }
        }
      }
      rd_px += ((rd_lane - 1) * 170 - rd_px) / 5 | 0;
    };
    const rd_cx = (y, yh, yb) => { const d = y - yh, w = d * 2 + 4, f = yb - y; return 120 - (rd_px * w / 256 | 0) + (rd_cur * f * f / 900 | 0); };
    const rd_w = (y, yh) => (y - yh) * 2 + 4;
    const RD_CC = [RGB(0xe0, 0xe0, 0xe8), RGB(0x40, 0xc0, 0x60), RGB(0x40, 0x80, 0xe0), RGB(0xf0, 0xc0, 0x30)];
    const rd_draw = (yh, yb, p) => {
      let y, i;
      for (y = yh; y < yb; y++) {
        const d = y - yh + 1, z = 6000 / d | 0, w = rd_w(y, yh), cx = rd_cx(y, yh, yb), on = ((z + (rd_pos / 8 | 0)) / 40 | 0) & 1, dw = 1 + (d / 16 | 0);
        WFR(cx - w, y, 2 * w, 1, p[0]);
        WFR(cx - w - 1 - (d / 20 | 0), y, 1 + (d / 20 | 0), 1, p[2]), WFR(cx + w, y, 1 + (d / 20 | 0), 1, p[2]);
        if (on) { WFR(cx - (w / 3 | 0) - (dw / 2 | 0), y, dw, 1, p[1]), WFR(cx + (w / 3 | 0) - (dw / 2 | 0), y, dw, 1, p[1]); }
        if (((z + (rd_pos / 8 | 0)) % 260) < 3 && d > 4) {
          const ph = (d / 2 | 0) + 4;
          for (let l = -1; l <= 1; l += 2) {
            const px = cx + l * (w + 8 + (d / 3 | 0));
            WFR(px, y - ph, 1 + (d / 30 | 0), ph, p[4]), WFR(l < 0 ? px : px - 2 - (d / 12 | 0), y - ph, 3 + (d / 12 | 0), 1 + (d / 40 | 0), p[4]);
            wvf_disk(l < 0 ? px + 2 + (d / 12 | 0) : px - 2 - (d / 12 | 0), y - ph + 1, 1 + (d / 30 | 0), p[5]);
          }
        }
      }
      for (i = 3; i >= 0; i--) {
        const dz = rd_car[i][0];
        if (dz <= 20 || dz > 2600) continue;
        const yy = yh + ((6000 * 8 / ((dz * 40 / 40 | 0) + 60) | 0) / 8 | 0);
        if (yy >= yb || yy <= yh) continue;
        const w = rd_w(yy, yh), s = 2 + (w / 9 | 0), lx = rd_cx(yy, yh, yb) + ((rd_car[i][1] - 1) * w * 2 / 3 | 0), CC = RD_CC[rd_car[i][2]];
        WFR(lx - s, yy - (s * 2 / 3 | 0), s * 2, s * 2 / 3 | 0, CC), WFR(lx - s + (s / 4 | 0), yy - s, s * 3 / 2 | 0, (s / 3 | 0) + 1, CC);
        WFR(lx - s, yy - (s / 3 | 0), (s / 3 | 0) + 1, (s / 4 | 0) + 1, RGB(0xff, 0x30, 0x30)), WFR(lx + s - (s / 3 | 0) - 1, yy - (s / 3 | 0), (s / 3 | 0) + 1, (s / 4 | 0) + 1, RGB(0xff, 0x30, 0x30));
        WFR(lx - s, yy, s / 2 | 0, 1 + (s / 6 | 0), C_BLACK), WFR(lx + (s / 2 | 0), yy, s / 2 | 0, 1 + (s / 6 | 0), C_BLACK);
      }
    };
    const rd_city = (base, scroll, a, b, c) => {
      let k, x, y;
      for (k = -1; k < 15; k++) {
        const h = pc_h((k + 40 + (scroll / 20 | 0)) * 7);
        const bx = k * 20 - (((scroll % 20) + 20) % 20), bw = 10 + (h % 8), bh = 14 + ((h >>> 5) % 34), t = base - bh, kind = (h >>> 9) % 6;
        for (y = t; y < base; y += 2) WFR(bx, y, 1, 1, a), WFR(bx + bw, y, 1, 1, a);
        for (x = bx; x <= bx + bw; x += 2) WFR(x, t, 1, 1, a);
        for (y = t + 3; y < base - 2; y += 4) for (x = bx + 2; x < bx + bw - 1; x += 3) if (((x * 5 + y * 3 + h) >>> 0) % 4 === 0 || wf_spec[((x + y) >>> 0) % 19] > 11) WFR(x, y, 1, 1, b);
        if (kind === 0) for (y = 0; y < 14; y += 2) WFR(bx + (bw / 2 | 0), t - 2 - y, 1, 1, a);
        else if (kind === 1) {
          const cxw = bx + (bw / 2 | 0), cyw = t - 12, r = 10;
          let q;
          for (q = 0; q < 16; q++) { const an = q * 16 + wv_ph * 2; WFR(cxw + (r * wv_sin4(an + 64) / 127 | 0), cyw + (r * wv_sin4(an) / 127 | 0), 1, 1, (q & 1) ? b : a); }
          for (q = 0; q < 4; q++) { const an = q * 64 + wv_ph * 2; wvf_pline(cxw, cyw, cxw + (r * wv_sin4(an + 64) / 127 | 0), cyw + (r * wv_sin4(an) / 127 | 0), a); }
        } else if (kind === 2) {
          for (x = 0; x < 26; x += 2) WFR(bx + x, t - 12, 1, 1, (((x / 2) >>> 0) + ((wv_ph / 3) >>> 0)) & 1 ? b : a), WFR(bx + x, t - 3, 1, 1, (((x / 2) >>> 0) + ((wv_ph / 3) >>> 0)) & 1 ? a : b);
          wf_text(bx + 4, t - 10, 0, (h >>> 12) & 1 ? 'WFM' : 'BAR', a);
        }
        if ((h >>> 3) % 3 === 0) wvf_disk(bx + (bw / 2 | 0), base - 3, 2 + ((h >>> 14) % 3), c);
      }
    };
    const rd_player = (x0, y0, brake) => {
      for (let r = 0; r < 12; r++) for (let c = 0; c < 20; c++) {
        const ch = RC_CAR[r][c];
        const col = ch === '1' ? RGB(0xd8, 0x20, 0x20) : ch === '2' ? RGB(0x20, 0x08, 0x08) : ch === '3' ? RGB(0x60, 0x08, 0x08) : ch === '4' ? (brake ? RGB(0xff, 0xff, 0xc0) : RGB(0xff, 0x60, 0x40)) : ch === '5' ? RGB(0x18, 0x18, 0x18) : 0;
        if (ch !== '.') WFR(x0 + c * 2, y0 + r * 2, 2, 2, col);
      }
    };
    const v2_racer = () => {
      let i;
      const kmh = rd_kmh / 16 | 0;
      rd_city(110, (rd_cur / 2 | 0) + (rd_pos / 400 | 0), RGB(0xf8, 0xa0, 0x20), RGB(0xff, 0xe0, 0x90), RGB(0xff, 0xb0, 0x40));
      for (i = 0; i < 3; i++) WFR((pc_h(i * 9) % 200) + 20, 50 + i * 9, 1, 30 - i * 8, RGB(0xf8, 0xa0, 0x20));
      WFR(0, 110, 240, 2, RGB(0x60, 0x30, 0x08));
      rd_draw(112, 192, RD_VEGAS);
      rd_player(100 + (rd_cur / 10 | 0), 160 + (((wv_ph / 2) >>> 0) & 1), wvf_hit_n > 2);
      for (i = 0; i < 52; i++) { const x = 4 + i * 4 + (i / 13 | 0) * 2, top = 192 + ((i - 26) * (i - 26) / 120 | 0); WFR(x, top, 4, 240 - top, RGB(0x1a, 0x1a, 0x22)); }
      for (i = 0; i < 240; i += 2) { const top = 192 + (((i / 4 | 0) - 26) * ((i / 4 | 0) - 26) / 120 | 0); WFR(i, top, 2, 1, RGB(0x50, 0x50, 0x68)); }
      for (i = 0; i < 2; i++) {
        const gx = i ? 196 : 44, gy = 222, f = i ? clamp(ev_lvl * 4, 0, 1024) : clamp(kmh * 1024 / 240 | 0, 0, 1024), a = 96 + ((f * 192 / 1024) >>> 0);
        wvf_disk(gx, gy, 17, RGB(0x30, 0x30, 0x40)), wvf_disk(gx, gy, 15, RGB(0x06, 0x06, 0x0a));
        for (let t = 0; t <= 8; t++) { const at = 96 + t * 24; WFR(gx + (12 * wv_sin4(at + 64) / 127 | 0), gy + (12 * wv_sin4(at) / 127 | 0), 1, 1, t >= 6 ? RGB(0xff, 0x40, 0x30) : RGB(0xf8, 0xa0, 0x20)); }
        ne_line(gx, gy, gx + (11 * wv_sin4(a + 64) / 127 | 0), gy + (11 * wv_sin4(a) / 127 | 0), RGB(0xff, 0x40, 0x30));
      }
      WFR(80, 206, 80, 30, RGB(0x06, 0x0c, 0x08)), WFR(80, 206, 80, 1, RGB(0x40, 0xc0, 0x80));
      wf_textr(140, 210, 1, fmt_int(kmh), RGB(0x60, 0xf0, 0x90)), wf_text(144, 210, 0, 'KM/H', RGB(0x60, 0xf0, 0x90));
      for (i = 0; i < 14; i++) WFR(84 + i * 5, 222, 4, 4, i < clamp(ev_lvl / 12 | 0, 0, 14) ? (i < 10 ? RGB(0x60, 0xf0, 0x90) : RGB(0xff, 0x50, 0x40)) : RGB(0x14, 0x30, 0x20));
      wf_text(86, 229, 0, fmt_int((wf_secs() / 60) >>> 0) + "'" + fmt_int(wf_secs() % 60), RGB(0x60, 0xf0, 0x90));
    };
    const v2_drive = () => {
      let i, y, x;
      const gl = clamp(ev_lvl / 3 | 0, 0, 60), tilt = -rd_cur / 8 | 0;
      const frame = RGB(0x2a, 0x1c, 0x4c), dash = RGB(0x50 + (gl / 2 | 0), 0x38, 0x98 + gl), rim = RGB(0x90 + gl, 0x70, 0xe0);
      pc_sky(RGB(0x10, 0x08, 0x38), RGB(0x90, 0x30, 0x90), 96);
      for (i = 0; i < 26; i++) WFR(pc_h(i) % 240, pc_h(i * 5) % 60, 1, 1, wf_spec[i % 19] > 10 ? WC_WHT : RGB(0xc0, 0xa0, 0xf0));
      rd_city(96, (rd_cur / 2 | 0) + (rd_pos / 400 | 0), RGB(0xff, 0x70, 0xd0), RGB(0x80, 0xf0, 0xff), RGB(0xff, 0xa0, 0xe0));
      rd_draw(96, 150, RD_SYNTH);
      WFR(0, 0, 240, 22, frame);
      WFR(0, 22, 240, 1, rim);
      WFR(80, 24, 80, 26, RGB(0x10, 0x08, 0x20));
      if (wf_ry === 0 && cv_oy === 0 && cv_w === 240) {
        for (let my = 0; my < 22; my++) { const src = (52 + my * 2) * 240, dst = (26 + my) * 240; for (let mx = 0; mx < 76; mx++) cv_px[dst + 82 + mx] = cv_px[src + 196 - mx * 2]; }
      }
      WFR(80, 24, 80, 2, rim), WFR(80, 48, 80, 2, rim), WFR(80, 24, 2, 26, rim), WFR(158, 24, 2, 26, rim);
      { const sw = WV_SIN[(wv_ph * 4) & 63] * (3 + (wv_bass() / 3 | 0)) / 127 | 0; wvf_pline(120, 50, 120 + sw, 60, RGB(0x80, 0x70, 0xa0)); wvf_disk(120 + sw, 63, 3, RGB(0xff, 0x80, 0xc0)); }
      for (y = 150; y < 240; y++) WFR(0, y, 240, 1, y < 153 ? rim : y < 176 ? dash : RGB(0x30, 0x20, 0x60));
      for (x = 0; x < 240; x += 4) WFR(x, 153, 2, 1, (wf_spec[((x / 13) >>> 0) % 19] > 8) ? RGB(0xff, 0xb0, 0xff) : dash);
      WFR(124, 160, 80, 44, RGB(0x14, 0x0c, 0x28)), WFR(124, 160, 80, 1, rim);
      WFR(128, 164, 72, 12, RGB(0x06, 0x10, 0x10));
      const nm = sel_name.slice(0, 13);
      wf_clx0 = 129, wf_clx1 = 199;
      wf_text(200 - (((wv_ph * 2) >>> 0) % ((wf_tw(1, nm) + 72) >>> 0)), 166, 1, nm, RGB(0x60, 0xff, 0xd0));
      wf_clx0 = 0, wf_clx1 = 240;
      for (i = 0; i < 19; i++) { const h = clamp(wf_spec[i], 0, 18); WFR(129 + i * 4 - (i / 5 | 0), 198 - h, 3, h, i < 6 ? RGB(0x40, 0xe0, 0xff) : i < 13 ? RGB(0xff, 0x70, 0xd0) : RGB(0xff, 0xe0, 0x60)); }
      wvf_disk(212, 172, 5, RGB(0x30, 0x24, 0x50)), wvf_disk(212, 190, 5, RGB(0x30, 0x24, 0x50));
      for (i = 0; i < 2; i++) { const an = 96 + clamp(i ? ev_lvl * 2 : BPM, 0, 192); wvf_pline(212, 172 + i * 18, 212 + (4 * wv_sin4(an + 64) / 127 | 0), 172 + i * 18 + (4 * wv_sin4(an) / 127 | 0), RGB(0xff, 0xb0, 0xff)); }
      {
        let g, t;
        WFR(26, 160, 86, 50, RGB(0x10, 0x0a, 0x1c));
        for (t = 0; t < 40; t++) { const an = 128 + ((t * 128 / 40) >>> 0); WFR(68 + (42 * wv_sin4(an + 64) / 127 | 0), 204 + (42 * wv_sin4(an) / 127 | 0), 2, 2, RGB(0xb0, 0x60, 0x10)); }
        for (g = 0; g < 2; g++) {
          const gx = g ? 86 : 50, gy = 184, f = g ? clamp((rd_kmh / 16 | 0) * 1024 / 240 | 0, 0, 1024) : clamp(ev_lvl * 3, 0, 1024), a = 96 + ((f * 192 / 1024) >>> 0);
          for (t = 0; t < 10; t++) { const at = 96 + t * 21; WFR(gx + (12 * wv_sin4(at + 64) / 127 | 0), gy + (12 * wv_sin4(at) / 127 | 0), 1, 1, RGB(0xd0, 0x70, 0x20)); }
          ne_line(gx, gy, gx + (10 * wv_sin4(a + 64) / 127 | 0), gy + (10 * wv_sin4(a) / 127 | 0), RGB(0xff, 0x90, 0x30));
        }
        ne_ring(36, 196, 4, RGB(0x60, 0x30, 0x10)), ne_ring(100, 196, 4, RGB(0x60, 0x30, 0x10));
        for (t = 0; t < 4; t++) WFR(54 + t * 8, 202, 5, 2, trk_level(t) && sp_s[t * 4] > 6 ? (t === 1 ? RGB(0x40, 0xe0, 0x40) : t === 3 ? RGB(0xe0, 0xc0, 0x20) : RGB(0xe0, 0x30, 0x30)) : RGB(0x30, 0x10, 0x10));
      }
      {
        const cx = 68, cy = 196, R = 44;
        let q;
        for (q = 0; q < 64; q++) { const an = q * 4; WFR(cx + (R * wv_sin4(an + 64) / 127 | 0) - 2, cy + (R * wv_sin4(an) / 127 | 0) - 2, 5, 5, RGB(0x34, 0x22, 0x66)); }
        for (q = 0; q < 3; q++) { const an = (64 + q * 85 + tilt * 4) >>> 0; ne_line3(cx, cy, cx + ((R - 2) * wv_sin4(an + 64) / 127 | 0), cy + ((R - 2) * wv_sin4(an) / 127 | 0), RGB(0x20, 0x14, 0x40)); }
        wvf_disk(cx, cy, 10, RGB(0x24, 0x18, 0x44)), wvf_disk(cx, cy, 3, RGB(0xff, 0x80, 0xc0));
      }
    };

    /* ---- SYNTH */
    const sy_path = new Int32Array(24), sy_col = new Uint8Array(24);
    let sy_x = 0;
    const v2_synth = () => {
      let i, y, x;
      const hy = 128, sp = imul(wv_ph, 2 + (clamp(BPM, 40, 240) / 40 | 0)) >>> 0;
      pc_sky(RGB(0x08, 0x04, 0x20), RGB(0x40, 0x10, 0x60), hy);
      for (i = 0; i < 30; i++) WFR(pc_h(i * 3) % 240, pc_h(i * 11) % 90, 1 + (i % 7 === 0 ? 1 : 0), 1 + (i % 7 === 0 ? 1 : 0), RGB(0x60, 0xf0, 0xff));
      {
        const R = 46 + (wv_bass() / 6 | 0), cy = 92;
        for (y = cy - R; y < hy; y++) {
          const dy = y - cy, t = (y - (cy - R)) * 255 / (R * 2) | 0, gap = dy > -6 ? ((dy + 6) / 6 | 0) + (wv_bass() / 8 | 0) : 0;
          let hw = 0;
          while ((hw + 1) * (hw + 1) + dy * dy <= R * R) hw++;
          if (gap && ((y - ((wv_ph / 2) >>> 0)) >>> 0) % 9 < gap) continue;
          WFR(120 - hw, y, 2 * hw, 1, RGB(0xff, 0xe8 - (t * 3 / 4 | 0) > 0x20 ? 0xe8 - (t * 3 / 4 | 0) : 0x20, 0x20 + (t * 3 / 4 | 0) > 0xff ? 0xff : 0x20 + (t * 3 / 4 | 0)));
        }
      }
      for (i = 0; i < 13; i++) {
        const h = pc_h(i * 13 + 5), bx = 64 + i * 9, bw = 7 + (h % 5), bh = 18 + ((h >>> 4) % 36) + (wf_spec[(i * 19 / 13) >>> 0] > 12 ? 3 : 0), t = hy - 8 - bh;
        WFR(bx, t, bw, bh, RGB(0x14, 0x06, 0x30));
        WFR(bx, t, 1, bh, RGB(0x40, 0xe0, 0xff)), WFR(bx + bw, t, 1, bh, RGB(0x40, 0xe0, 0xff)), WFR(bx, t, bw, 1, RGB(0x40, 0xe0, 0xff));
        if (h & 1) WFR(bx + (bw / 2 | 0), t - 6, 1, 6, RGB(0x40, 0xe0, 0xff));
        for (y = t + 4; y < hy - 10; y += 5) {
          const lit = (hy - 10 - y) < sp_s[(i * 19 / 13) >>> 0] * 4, nt = (nk_mask >>> (i * 2)) & 3;
          const wc = nt ? WC_WHT : lit ? RGB(0xff, 0x70, 0xe0) : RGB(0x30, 0x60, 0x90);   /* (punch.cur < 0) */
          if (((y + h) >>> 0) % 3 !== 1) WFR(bx + 2, y, bw - 3, 1, wc);
        }
      }
      for (x = 0; x < 240; x++) {
        const m = 10 - ((((x * 3) % 40) < 20 ? (x * 3) % 40 : 40 - (x * 3) % 40) / 2 | 0) - (x > 90 && x < 150 ? 0 : 4);
        WFR(x, hy - m, 1, m, RGB(0x10, 0x04, 0x20)), WFR(x, hy - m, 1, 1, RGB(0xff, 0x40, 0xd0));
      }
      WFR(0, hy, 240, 240 - hy, RGB(0x08, 0x02, 0x14)), WFR(0, hy, 240, 2, RGB(0xff, 0x60, 0xe0));
      for (i = 0; i < 12; i++) {
        const z = 255 - (((i * 22 + sp) >>> 0) % 256), yy = hy + 2 + (2600 / (z + 24) | 0) - 10;
        if (yy > hy && yy < 240) WFR(0, yy, 240, 1, wvf_hit_n > 2 ? RGB(0xff, 0x90, 0xff) : RGB(0xd0, 0x20, 0xc0));
      }
      for (i = -12; i <= 12; i++) wvf_pline(120 + i * 4, hy + 2, 120 + i * 40, 240, RGB(0xa0, 0x10, 0xa0));
      {
        const k = nk_top(nk_mask), cy = 166;
        const tx = k >= 0 ? clamp((k - 13) * 7, -80, 80) : (sy_x * 7 / 8 | 0);
        sy_x += (tx - sy_x) / 4 | 0;
        for (i = 23; i > 0; i--) sy_path[i] = sy_path[i - 1], sy_col[i] = sy_col[i - 1];
        sy_path[0] = sy_x, sy_col[0] = k < 0 ? sy_col[1] : k < 13 ? 0 : 1;
        for (i = 1; i < 24; i++) {
          const y0 = cy + 6 + (i - 1) * 3, y1 = cy + 6 + i * 3, s0 = 240 + (i - 1) * 14, s1 = 240 + i * 14, w0 = 7 + ((i - 1) / 2 | 0), w1 = 7 + (i / 2 | 0);
          const c = sy_col[i] ? RGB(0x40, 0xa0, 0xff) : RGB(0xff, 0x30, 0x50), c2 = sy_col[i] ? RGB(0xb0, 0xe8, 0xff) : RGB(0xff, 0xb0, 0xb8);
          for (let l = -1; l <= 1; l += 2) {
            wvf_pline(120 + (sy_path[i - 1] * s0 / 240 | 0) + l * w0, y0, 120 + (sy_path[i] * s1 / 240 | 0) + l * w1, y1, c2);
            wvf_pline(121 + (sy_path[i - 1] * s0 / 240 | 0) + l * w0, y0, 121 + (sy_path[i] * s1 / 240 | 0) + l * w1, y1, c);
          }
        }
        x = 120 + sy_x;
        WFR(x - 10, cy - 4, 21, 10, RGB(0x10, 0x10, 0x30)), WFR(x - 10, cy - 4, 21, 1, RGB(0x60, 0xf0, 0xff)), WFR(x - 10, cy - 4, 1, 10, RGB(0x60, 0xf0, 0xff)), WFR(x + 10, cy - 4, 1, 10, RGB(0x60, 0xf0, 0xff));
        WFR(x - 7, cy - 10, 15, 6, RGB(0x60, 0xf0, 0xff)), WFR(x - 5, cy - 9, 11, 4, RGB(0x10, 0x10, 0x30));
        WFR(x - 9, cy + 3, 4, 3, sy_col[0] ? RGB(0x60, 0xc0, 0xff) : RGB(0xff, 0x40, 0x50)), WFR(x + 6, cy + 3, 4, 3, sy_col[0] ? RGB(0x60, 0xc0, 0xff) : RGB(0xff, 0x40, 0x50));
      }
    };

    /* ---- the lit city (NEO, SMOKE) */
    const nc_tower = (x, t, w, base, p, h, band) => {
      const rows = (base - t - 6) / 6 | 0, lit = clamp((sp_s[band % 19] * rows / 18 | 0) + (h % 3), 0, rows);
      WFR(x, t, w, base - t, p.near), WFR(x, t, w / 3 | 0, base - t, p.nearl);
      WFR(x - 1, t, w + 2, 2, p.nearl);
      if (h & 1) WFR(x + (w / 2 | 0), t - 10, 1, 10, p.nearl), WFR(x + (w / 2 | 0) - 1, t - 11, 3, 1, ((((wv_ph / 8) >>> 0) + h) & 1) ? RGB(0xff, 0x40, 0x40) : p.near);
      if (h & 2) WFR(x + w - 9, t - 6, 6, 6, p.nearl), WFR(x + w - 8, t - 8, 4, 2, p.nearl);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < ((w - 4) / 5 | 0); c++) {
          const on = rows - 1 - r < lit && ((r * 3 + c + h) >>> 0) % 5 !== 0;
          WFR(x + 3 + c * 5, t + 5 + r * 6, 3, 3, on ? (c === 0 ? RGB(0xff, 0xf4, 0xc0) : p.win) : p.wind);
        }
    };
    const nc_city = (base, scroll, p, beams) => {
      let i, r, c;
      for (i = 0; i < (base / 4 | 0) + 1; i++) {
        const t = i * 4 * 255 / base | 0;
        WFR(0, i * 4, 240, 4, RGB(((((p.sky0 >> 11) & 31) * (255 - t) + ((p.sky1 >> 11) & 31) * t) / 255 | 0) << 3, ((((p.sky0 >> 5) & 63) * (255 - t) + ((p.sky1 >> 5) & 63) * t) / 255 | 0) << 2,
          (((p.sky0 & 31) * (255 - t) + (p.sky1 & 31) * t) / 255 | 0) << 3));
      }
      for (i = 0; i < 20; i++) cv_pset(pc_h(i * 17) % 240, pc_h(i * 29) % ((base / 2) >>> 0), RGB(0xd0, 0xd8, 0xf0));
      if (beams) for (i = 0; i < 3; i++) {
        const bx = 50 + i * 70, sw = WV_SIN[((imul(wv_ph, 1 + (ev_rate > 40 ? 1 : 0)) >>> 0) + i * 20) & 63] * 70 / 127 | 0;
        wvf_pline(bx, base, bx + sw, 0, p.beam), wvf_pline(bx + 1, base, bx + sw + 3, 0, p.beam);
      }
      for (i = -1; i < 13; i++) {
        const h = pc_h((i + (scroll / 21 | 0) + 100) * 7);
        const x = i * 21 - (((scroll % 21) + 21) % 21), hh = (base / 2 | 0) + (h % ((base / 2) >>> 0)), t = base - 12 - (hh / 2 | 0) - 30;
        WFR(x, t, 19, base - t, p.far);
        if (h % 5 === 0) WFR(x + 9, t - 14, 1, 14, p.far);
        for (r = 0; r < ((base - t) / 6 | 0) - 1; r++) for (c = 0; c < 4; c++)
          if (sp_s[((i + r + c + 19) >>> 0) % 19] > 6 && ((r * 3 + c + h) >>> 0) % 5 < 3) WFR(x + 2 + c * 4, t + 4 + r * 6, 2, 3, ((h + r) >>> 0) % 3 === 0 ? p.farw0 : p.farw1);
      }
      for (i = -1; i < 7; i++) {
        const h = pc_h((i + (scroll / 44 | 0) + 300) * 13);
        const x = i * 44 - 10 - (((scroll % 44) + 44) % 44) + 44, hh = (base / 4 | 0) + (h % ((base / 4) >>> 0));
        nc_tower(x, base - hh, 36, base, p, h, i * 3 + 19);
      }
    };
    const v2_neo = () => {
      nc_city(182, 0, NC_NEO, 1);
      WFR(0, 182, 240, 58, RGB(0x08, 0x0a, 0x10));
      for (let i = 0; i < 8; i++) { wvf_disk(14 + i * 30, 178, 5, RGB(0x14, 0x40, 0x28)); wvf_disk(14 + i * 30, 178, 2, sp_s[i * 2] > 9 ? WC_WHT : RGB(0x80, 0xff, 0xa0)); }
      for (let i = 0; i < 8; i++) WFR(10 + i * 30, 188 + (i & 1) * 18, 20, 2, RGB(0x30, 0x40, 0x30));
    };
    const sm_p = new Int16Array(24 * 3);
    const v2_smoke = () => {
      const cyc = wv_ph % 120, hx = 136, hy = 118, K = RGB(0x02, 0x02, 0x06);
      const up = cyc < 20 ? cyc : cyc < 50 ? 20 : cyc < 70 ? 70 - cyc : 0;
      let i, r, c, tipx, tipy;
      nc_city(196, 0, NC_BLUE, 1);
      WFR(0, 196, 240, 44, RGB(0x04, 0x06, 0x10));
      for (i = 0; i < 12; i++) WFR(i * 20 + 4, 200 + (i & 1) * 6, 12, 1, RGB(0x60, 0x58, 0x30));
      for (r = 0; r < 18; r++) for (c = 0; c < 18; c++) if (SM_BODY[r][c] === 'X') WFR(hx + c * 6, hy + r * 6 + (((wv_ph / 30) >>> 0) & 1), 6, 6, K);
      {
        const hxr = hx + 4, hyr = hy + 110, hxm = hx + 22, hym = hy + 34, ex = hx + 2 - (up / 2 | 0), ey = hy + 96 - up;
        tipx = hxr + ((hxm - hxr) * up / 20 | 0), tipy = hyr + ((hym - hyr) * up / 20 | 0);
        for (i = 0; i < 5; i++) ne_line3(hx + 24 + i, hy + 66, ex + i, ey, K);
        for (i = 0; i < 4; i++) ne_line3(ex + i, ey, tipx + 4 + i, tipy + 2, K);
        wvf_disk(tipx + 6, tipy + 2, 6, K);
        tipx -= 2;
      }
      WFR(tipx - 4, tipy, 8, 2, RGB(0xe0, 0xe0, 0xe0)), WFR(tipx - 6, tipy, 2, 2, cyc >= 20 && cyc < 50 ? RGB(0xff, 0xa0, 0x30) : RGB(0xd0, 0x40, 0x20));
      for (i = 0; i < 24; i++) {
        const q = i * 3;
        if (!sm_p[q + 2]) {
          if (((wv_ph + i) >>> 0) % 6 === 0 || (wvf_hit_n === 5 && i % 3 === 0)) { sm_p[q] = (tipx - 6) * 4, sm_p[q + 1] = tipy * 4, sm_p[q + 2] = 1; }
          else if (cyc >= 52 && cyc < 64 && i % 2 === 0) { sm_p[q] = (hx + 14 - (cyc - 52) * 2) * 4, sm_p[q + 1] = (hy + 36) * 4, sm_p[q + 2] = 8; }
          continue;
        }
        sm_p[q + 2]++, sm_p[q + 1] = sm_p[q + 1] - 3 - s16(ev_lvl / 60 | 0), sm_p[q] = sm_p[q] + (WV_SIN[(sm_p[q + 2] * 4 + i * 9 + wv_ph) & 63] * (2 + (wv_bass() / 4 | 0)) / 127 | 0) - 1;
        if (sm_p[q + 2] > 60 || sm_p[q + 1] < 0) { sm_p[q + 2] = 0; continue; }
        {
          const rr = 1 + (sm_p[q + 2] / 12 | 0), x = sm_p[q] / 4 | 0, y = sm_p[q + 1] / 4 | 0;
          for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) if (xx * xx + yy * yy <= rr * rr && ((x + xx + y + yy) & 1)) cv_pset(x + xx, y + yy, sm_p[q + 2] < 30 ? RGB(0xb0, 0xb8, 0xc8) : RGB(0x70, 0x78, 0x90));
        }
      }
    };

    /* ---- WATERFALL, CURVES, FLOW */
    const WF_RC = [RGB(0x40, 0x70, 0xff), RGB(0x30, 0x90, 0xff), RGB(0x20, 0xb0, 0xe0), RGB(0x20, 0xc8, 0xa0), RGB(0x30, 0xe0, 0x80), RGB(0x60, 0xe8, 0x80),
      RGB(0xa0, 0xa8, 0xb8), RGB(0xc0, 0xc4, 0xd0), RGB(0xff, 0xff, 0xff), RGB(0xe0, 0xe0, 0xe8), RGB(0xff, 0x50, 0x60), RGB(0xff, 0x40, 0x58), RGB(0xf0, 0x38, 0x60),
      RGB(0xc0, 0x40, 0x90), RGB(0x90, 0x40, 0xb0), RGB(0x70, 0x40, 0xa0)];
    const ne_waterfall = () => {
      let k, i;
      const lv = clamp(wv_all() / 14 | 0, 0, 16);
      for (i = 0; i <= 6; i++) ne_line(40 + i * 24, 196 - i * 0, 100 + i * 24, 166, NE_DIM);
      for (i = 0; i <= 3; i++) ne_line(40 + i * 20, 196 - i * 10, 184 + i * 20, 196 - i * 10, NE_DIM);
      for (k = 15; k >= 0; k--) {
        let px = 0, py = 0;
        for (i = 0; i < 19; i++) {
          const x = 52 + i * 6 + k * 6, y = 192 - k * 3 - clamp(wv_mem[k * 19 + i], 0, 20) * 4;
          if (i) wvf_pline(px, py, x, y, WF_RC[15 - k]);
          px = x, py = y;
        }
      }
      wf_text(8, 40, 1, 'MAX', NE_BLU), wf_text(8, 186, 1, 'MIN', NE_BLU);
      for (i = 0; i < 16; i++) WFR(30, 186 - i * 9, i < 4 ? 10 : 7, 2, i < lv ? NE_GRN : NE_DIM);
      ne_num(168, 20, 34, BPM, NE_WHT);
      for (i = 0; i < 6; i++) WFR(10 + i * 14 + (((wv_ph + i * 3) >>> 0) % 4), 214 + (i & 1) * 3, 10, 2, NE_BLU);
    };
    const CV_CC = [RGB(0x40, 0xc8, 0xf0), RGB(0x50, 0x90, 0xf0), RGB(0x80, 0x50, 0x90), RGB(0xff, 0x90, 0x98), RGB(0xa0, 0x60, 0xe0), RGB(0xff, 0x40, 0x60)];
    const CV_KC4 = [RGB(0x60, 0x90, 0xff), RGB(0x30, 0xe0, 0x80), RGB(0xe0, 0xe0, 0xf8), RGB(0xff, 0x40, 0x60)];
    const ne_curves = () => {
      let c, x, k;
      for (k = 0; k < 4; k++) {
        const cx = 36 + k * 56, cy = 64, f = wf_frac(0, 127, p_send[k]), a = 96 + ((f * 192 / 1024) >>> 0);   /* (wf_grp 0: the SEND group) */
        WFR(cx - 20, cy, 6, 2, NE_DIM), WFR(cx + 14, cy, 6, 2, NE_DIM), WFR(cx, cy - 22, 2, 6, NE_DIM), WFR(cx, cy + 16, 2, 6, NE_DIM);
        ne_line(cx, cy, cx + (16 * wv_sin4(a + 64) / 127 | 0), cy + (16 * wv_sin4(a) / 127 | 0), CV_KC4[k]);
        wvf_disk(cx + 1, cy + 1, 4, CV_KC4[k]);
      }
      for (c = 0; c < 6; c++) {
        let px = 0, py = 0;
        for (x = 0; x < 40; x++) {
          const v = (wv_mem[x * 6 + c] * 2 + wv_mem[(x ? x - 1 : 0) * 6 + c] + wv_mem[(x < 39 ? x + 1 : 39) * 6 + c]) / 4 | 0;
          const sx = 226 - x * 5, sy = 132 + c * 10 + 26 - v * 3;
          if (x) wvf_pline(px, py, sx, sy, CV_CC[c]);
          px = sx, py = sy;
        }
      }
    };
    const ne_flow = () => {
      let i, k;
      const all = wv_all(), loud = all > 150, blink = ((wv_ph / 4) >>> 0) & 1, sp = wv_ph * 2;
      ne_box(60, 44, 34, 16, 'LFO', NE_GRN);
      ne_line(64, 60, 64, 70, NE_DIM), ne_line(64, 52, 44, 52, NE_DIM), ne_line(44, 52, 44, 74, NE_DIM), ne_line(86, 60, 86, 70, NE_DIM);
      for (i = 0; i < 24; i++) cv_pset(26 + i, 82 + (WV_SIN[(i * 8 + sp) & 63] * 6 / 127 | 0), NE_BLU), cv_pset(26 + i, 83 + (WV_SIN[(i * 8 + sp) & 63] * 6 / 127 | 0), NE_BLU);
      ne_box(66, 72, 34, 18, 'FX', NE_WHT);
      ne_line(104, 81, 120, 81, NE_WHT), ne_line(116, 77, 120, 81, NE_WHT), ne_line(116, 85, 120, 81, NE_WHT);
      ne_box(124, 72, 18, 18, 'I', NE_RED);
      ne_warn(148, 74, loud && blink);
      for (k = 0; k < 2; k++) {
        const cx = 36 + k * 30, cy = 122;
        ne_ring(cx, cy, 11, NE_WHT);
        for (i = 0; i < 3; i++) { const a = i * 85 + (playing ? wv_ph * 8 : 0); ne_line(cx, cy, cx + (8 * wv_sin4(a + 64) / 127 | 0), cy + (8 * wv_sin4(a) / 127 | 0), NE_WHT); }
      }
      ne_line(84, 112, 84, 132, NE_RED);
      ne_line(92, 122, 116, 122, NE_WHT), ne_line(112, 118, 116, 122, NE_WHT), ne_line(112, 126, 116, 122, NE_WHT);
      ne_box(120, 113, 32, 18, 'EQ', NE_BLU);
      ne_warn(160, 115, all > 110 && blink);
      for (k = 0; k < 4; k++) {
        const cx = 140 + k * 20, cy = 52, f = trk_level(k) * 1024 / 127 | 0, a = 160 + ((f * 64 / 1024) >>> 0);
        ne_line(cx, 20 + (((wv_ph + k * 2) >>> 0) % 8), cx, 34, NE_WHT);
        ne_line(cx - 7, cy, cx - 5, cy - 5, NE_DIM), ne_line(cx + 7, cy, cx + 5, cy - 5, NE_DIM);
        ne_line(cx, cy, cx + (8 * wv_sin4(a + 64) / 127 | 0), cy + (8 * wv_sin4(a) / 127 | 0), wf_spec[k * 5] > 6 ? NE_WHT : NE_DIM);
        ne_line(cx, cy + 4, cx, 66, NE_DIM);
      }
      ne_line(140, 66, 200, 66, NE_DIM), ne_line(170, 66, 170, 100, NE_DIM), ne_line(170, 100, 136, 100, NE_DIM), ne_line(136, 100, 136, 112, NE_DIM);
      ne_warn(214, 44, wf_spec[18] > 10 && blink);
      ne_line(136, 132, 136, 140, NE_DIM);
      ne_box(120, 140, 32, 18, 'FX', NE_GRN);
      ne_box(158, 140, 46, 18, 'DRIVE', NE_RED);
      ne_line(153, 149, 157, 149, NE_WHT);
      ne_warn(172, 166, wvf_hit_n > 0);
      ne_line(204, 149, 214, 149, NE_WHT), ne_line(214, 149, 214, 110, NE_WHT), ne_line(217, 149, 217, 113, NE_WHT);
      {
        const b = wv_bass() / 4 | 0;
        ne_box(208, 96, 8, 16, 0, NE_RED);
        ne_line(216, 96, 228 + b, 86, NE_RED), ne_line(216, 112, 228 + b, 122, NE_RED), ne_line(228 + b, 86, 228 + b, 122, NE_RED);
      }
      ne_box(28, 160, 34, 18, 0, NE_PUR);
      WFR(36, 166, 4, 4, NE_PUR), WFR(46, 166, 3, 3, NE_PUR), WFR(52, 166, 3, 3, NE_PUR);
      {
        let wx = 0;
        ne_box(70, 156, 52, 26, 0, NE_PUR);
        for (k = 0; k < 27; k++) if (!BLK[k % 12]) { WFR(73 + wx * 3, 159, 2, 20, (nk_mask >>> k) & 1 ? RGB(0xff, 0xe0, 0x60) : NE_WHT); wx++; }
        for (k = 0, wx = 0; k < 27; k++) { if (!BLK[k % 12]) { wx++; continue; } WFR(72 + wx * 3, 159, 2, 12, (nk_mask >>> k) & 1 ? RGB(0xff, 0x60, 0xc0) : RGB(0x20, 0x10, 0x30)); }
      }
      ne_line(78, 169, 66, 169, NE_WHT), ne_line(45, 158, 45, 136, NE_WHT);
      for (i = 0; i < 4; i++) ne_ring(186 + i * 12, 22, 3, p_mute[i] ? NE_DIM : NE_RED);
    };
    const v3_flow = () => { ne_flow(); /* fl_fx: only while a performance effect or a throw is on (punch.cur >= 0 || thr_req): never here */ };

    /* ---- TARGET (the tesseract) */
    let ts_a = 0, ts_b = 0;
    const v4_tesseract = () => {
      const px = new Int32Array(16), py = new Int32Array(16);
      let i, j, b;
      ts_a += 1 + (clamp(BPM, 40, 240) / 60 | 0), ts_b += 1 + (ev_rate / 64 | 0);
      WFR(0, 0, 240, 240, RGB(0x1c, 0x10, 0x18));
      for (i = 0; i < 16; i++) {
        const x = (i & 1) ? 100 : -100, y = (i & 2) ? 100 : -100, z = (i & 4) ? 100 : -100, w = (i & 8) ? 100 : -100;
        const ca = wv_sin4(ts_a + 64), sa = wv_sin4(ts_a), cb = wv_sin4(ts_b + 64), sb = wv_sin4(ts_b);
        const x2 = (x * ca - w * sa) / 127 | 0, w2 = (x * sa + w * ca) / 127 | 0, y2 = (y * cb - z * sb) / 127 | 0, z2 = (y * sb + z * cb) / 127 | 0;
        const k4 = 300 * 127 / (300 - w2) | 0, x3 = x2 * k4 / 127 | 0, y3 = y2 * k4 / 127 | 0, z3 = z2 * k4 / 127 | 0, s = 60 + wv_bass();
        const x4 = (x3 * 120 - z3 * 40) / 127 | 0, z4 = (x3 * 40 + z3 * 120) / 127 | 0;
        px[i] = 120 + (x4 * s / (200 + (z4 / 2 | 0)) | 0), py[i] = 124 + (y3 * s / (200 + (z4 / 2 | 0)) | 0);
      }
      for (i = 0; i < 16; i++) for (b = 0; b < 4; b++) {
        j = i ^ (1 << b);
        if (j < i) continue;
        const e = i * 4 + b, lit = (nk_mask >>> (e % 27)) & 1;
        ne_line(px[i], py[i], px[j], py[j], lit ? WC_WHT : b === 3 ? RGB(0xff, 0x30, 0x20) : (i & 8) ? RGB(0x40, 0x60, 0xf0) : RGB(0xe0, 0x40, 0xd0));
      }
      for (b = 0; b < 38; b++) {
        const an = ((b * 256 / 38) >>> 0) + ((ts_a / 2) >>> 0);
        const band = b % 19, k0 = band * 27 / 19 | 0, k1 = (band + 1) * 27 / 19 | 0, lit = ((nk_mask >>> k0) & ((1 << (k1 - k0 + 1)) - 1)) !== 0, l = 92 + (sp_s[band] * 2 / 3 | 0);
        ne_line(120 + (92 * wv_sin4(an + 64) / 127 | 0), 124 + (92 * wv_sin4(an) / 127 | 0), 120 + (l * wv_sin4(an + 64) / 127 | 0), 124 + (l * wv_sin4(an) / 127 | 0), lit ? WC_WHT : RGB(0xf0, 0xc8, 0x30));
      }
      wf_textc(120, 8, 1, 'I GLOBAL TARGET I', RGB(0xf0, 0xc8, 0x30));
      wf_text(70, 226, 1, 'X ' + fmt_int(BPM) + '.20272', RGB(0xf0, 0xc8, 0x30));
    };

    /* ---- HOUND */
    let hd2_head = 0, hd2_food = 8, hd_gearv = 0, hd_say = 0, hd_lb = 0;
    const hd_fl = new Int32Array(5);
    const hd_gear = (cx, cy, r, a, c) => {
      ne_ring(cx, cy, r, c), ne_ring(cx, cy, r / 3 | 0, c);
      for (let q = 0; q < 8; q++) { const an = a + q * 32; ne_line(cx + (r * wv_sin4(an + 64) / 127 | 0), cy + (r * wv_sin4(an) / 127 | 0), cx + ((r + 4) * wv_sin4(an + 64) / 127 | 0), cy + ((r + 4) * wv_sin4(an) / 127 | 0), c); }
    };
    const HD_LX = [76, 102, 168, 194];
    const v3_hound = () => {
      let i;
      const quiet = !nk_mask && ev_lvl < 12, nod = quiet ? 0 : (((imul(wv_ph, clamp(BPM, 40, 240)) >>> 0) / 600 >>> 0) & 1) * 5;
      const tail = WV_SIN[(imul(wv_ph, quiet ? 2 : 9)) & 63] * (quiet ? 5 : 14) / 127 | 0, chew = ((wv_ph / 3) >>> 0) & 1;
      hd_gearv = (hd_gearv + 2 + ((clamp(BPM, 40, 240) / 30) >>> 0) + wv_bass()) >>> 0;
      const gear = hd_gearv;
      hd2_head += quiet ? (hd2_head < 40 ? 3 : 0) : (hd2_head > 0 ? -5 : 0);
      if (hd2_head < 0) hd2_head = 0;
      if (quiet && hd2_head >= 40 && !(wv_ph % 14) && hd2_food > 0) hd2_food--;
      if (!quiet && hd2_food < 8 && !(wv_ph % 30)) hd2_food++;
      const hx = 64 - (hd2_head / 3 | 0), hy = 62 + hd2_head * 2 + nod;
      ne_line(72, 80, 196, 80, NE_BRN), ne_line(196, 80, 210, 94, NE_BRN), ne_line(210, 94, 210, 150, NE_BRN), ne_line(210, 150, 196, 164, NE_BRN);
      ne_line(196, 164, 72, 164, NE_BRN), ne_line(72, 164, 60, 150, NE_BRN), ne_line(60, 150, 60, 94, NE_BRN), ne_line(60, 94, 72, 80, NE_BRN);
      for (i = 0; i < 4; i++) { const st = !quiet && ((((wv_ph / 4) >>> 0) + i) & 1) ? 3 : 0; ne_line(HD_LX[i], 164, HD_LX[i] + st, 206, NE_BRN), ne_line(HD_LX[i] + st, 206, HD_LX[i] + st - 8, 206, NE_BRN); }
      ne_line(206, 86, 224 + tail, 58 - ((tail < 0 ? -tail : tail) / 2 | 0), NE_BRN);
      ne_line(70, 86, hx + 6, hy + 24, NE_BRN), ne_line(66, 104, hx + 8, hy + 32, NE_BRN);
      ne_line(hx, hy, hx - 30, hy + 5, NE_BRN), ne_line(hx - 30, hy + 5, hx - 40, hy + 18, NE_BRN), ne_line(hx - 40, hy + 18, hx - 30, hy + 26 + (quiet ? chew * 4 : 0), NE_BRN);
      ne_line(hx - 30, hy + 26 + (quiet ? chew * 4 : 0), hx + 3, hy + 30, NE_BRN), ne_line(hx + 3, hy + 30, hx + 10, hy + 12, NE_BRN), ne_line(hx + 10, hy + 12, hx, hy, NE_BRN);
      ne_line(hx - 2, hy + 2, hx + 5, hy + 28 + (nod / 2 | 0), NE_PNK), ne_line(hx + 5, hy + 28 + (nod / 2 | 0), hx + 13, hy + 22, NE_PNK);
      WFR(hx - 18, hy + 10, 4, 4, quiet ? NE_DIM : NE_BLU), WFR(hx - 42, hy + 15, 4, 4, NE_RED);
      ne_line(10, 212, 58, 212, NE_GRN), ne_line(10, 212, 16, 222, NE_GRN), ne_line(58, 212, 52, 222, NE_GRN), ne_line(16, 222, 52, 222, NE_GRN);
      for (i = 0; i < hd2_food; i++) WFR(16 + i * 5, 207 - (i & 1) * 3, 4, 4, NE_ORG);
      if (quiet && hd2_head >= 40 && chew) for (i = 0; i < 3; i++) WFR(hx - 36 + i * 6, hy + 34 - i * 3, 2, 2, NE_ORG);
      ne_line(0, 224, 240, 224, NE_GRN);
      if (!quiet) for (i = 0; i < 8; i++) { const x = 2 + ((imul(wv_ph, 3) + i * 9) % 60); if (x < hx - 42) WFR(x, hy + 18 + (WV_SIN[(x * 4) & 63] / 40 | 0), 3, 2, NE_BLU); }
      if (!quiet) for (i = 0; i < 5; i++) { const d = ((wv_ph * 2 + i * 13) >>> 0) % 50, x = 222 + (d / 2 | 0), y = 54 - d + (WV_SIN[(d * 6 + i * 11) & 63] / 30 | 0); WFR(x, y, 3, 3, i & 1 ? NE_PNK : NE_GRN), WFR(x + 2, y - 6, 1, 6, i & 1 ? NE_PNK : NE_GRN); }
      {
        let k;
        const bt = (imul(wv_ph, clamp(BPM, 40, 240)) >>> 0) / 600 >>> 0;
        for (k = 0; k < 5; k++) if (hd_fl[k]) hd_fl[k]--;
        if (nk_on & 0x1FF) hd_fl[0] = 4;
        if (nk_on & 0x3FE00) hd_fl[1] = 4;
        if (nk_on & 0x7FC0000) hd_fl[2] = 4;
        if (playing && bt !== hd_lb) hd_fl[3] = 3;
        hd_lb = bt;
        const c1 = hd_fl[0] ? WC_WHT : NE_ORG, c2 = hd_fl[2] ? WC_WHT : NE_PNK, c3 = hd_fl[1] ? WC_WHT : NE_BLU, c4 = hd_fl[3] ? WC_WHT : NE_PUR, c5 = hd_fl[4] ? WC_WHT : NE_GRN;
        hd_gear(84, 102, 11, gear, c1), hd_gear(102, 118, 7, ((imul(-(gear | 0), 3) / 2) | 0) >>> 0, c2);
        for (k = 0; k < 3; k++) ne_ring(82, 144, 3 + (sp_s[k * 6] / 2 | 0) + k * 2, k === 0 ? c3 : k === 1 ? c4 : c5);
        for (k = 0; k < 4; k++) { const h = clamp(((trk_level(k) * 24 / 127 | 0) * (p_mute[k] ? 0 : 1) * (sp_s[k * 4] + 4)) / 20 | 0, 1, 24); ne_box(116 + k * 8, 156 - h, 5, h, 0, k === 3 ? NE_RED : c4); }
        for (k = 0; k < 8; k++) { const h = clamp(sp_s[k * 2 + 1], 1, 24); WFR(156 + k * 4, 156 - h, 2, h, k & 1 ? NE_RED : NE_GRN); }
        { let px = 118, py = 100; for (let x = 0; x < 34; x++) { const y = 100 + (scope_buf[(scope_w - 68 + 2 * x) & SCOPE_M] * 8 / 12000 | 0); if (x) wvf_pline(px, py, 118 + x, y, c3); px = 118 + x, py = y; } }
        for (k = 0; k < 3; k++) { const xs = 160 + k * 9, hh = 3 + wv_bass(); ne_line(xs, 112, xs, 112 - hh, NE_ORG), ne_line(xs, 112 - hh, xs + 4, 112 - hh, NE_ORG), ne_line(xs + 4, 112 - hh, xs + 4, 112, NE_ORG); }
        hd_gear(192, 104, 6, imul(gear, 2) >>> 0, c5), hd_gear(194, 140, 5, imul(-(gear | 0), 2) >>> 0, c5);
        for (k = 0; k < 5; k++) WFR(146 + k * 6, 92, 4, 4, (nk_mask >>> (k * 5)) & 1 ? WC_WHT : (k & 1 ? NE_PNK : NE_BLU));
        { const an = gear >>> 1; ne_line(138, 132, 138 + (6 * wv_sin4(an + 64) / 127 | 0), 132 + (6 * wv_sin4(an) / 127 | 0), c2), ne_ring(138, 132, 7, c2); }
        if (nk_on & 0x7E00000) hd_say = 30;
        if (hd_say) { hd_say--; ne_box(16, 40, 112, 16, 0, NE_PNK); wf_text(20, 44, 1, "WHO'S A GOOD BOY?", WC_WHT); }
      }
      wf_text(10, 6, 1, 'FREQ', NE_BLU), ne_gauge(24, 34, ne_frac(g_filt, -64, 63), NE_BLU);
      wf_text(200, 6, 1, 'BPM', NE_PUR), ne_num(190, 18, 20, BPM, NE_GRN);
    };

    /* ---- BOXER (outlines) */
    const BX_C = [RGB(0x80, 0x50, 0x30), RGB(0xe8, 0xa8, 0x7c), RGB(0xc0, 0x84, 0x60), RGB(0xf0, 0xf0, 0xf0), RGB(0xff, 0x40, 0x40), RGB(0x50, 0x80, 0xff), RGB(0xf8, 0xf8, 0xf8), RGB(0x90, 0x90, 0xa8)];
    let bx_t = 0, bx_bag = 0, bx_pw = 0;
    const spr_outline = (rows, nr, x, y, z, keys, cols) => {
      for (let r = 0; r < nr; r++)
        for (let c = 0; c < rows[r].length; c++) {
          const ch = rows[r][c], i = keys.indexOf(ch), X = x + c * z, Y = y + r * z;
          if (i < 0) continue;
          if (r === 0 || rows[r - 1][c] !== ch) WFR(X, Y, z, 2, cols[i]);
          if (r === nr - 1 || rows[r + 1][c] !== ch) WFR(X, Y + z - 2, z, 2, cols[i]);
          if (c === 0 || rows[r][c - 1] !== ch) WFR(X, Y, 2, z, cols[i]);
          if (c + 1 >= rows[r].length || rows[r][c + 1] !== ch) WFR(X + z - 2, Y, 2, z, cols[i]);
        }
    };
    const v3_boxer = () => {
      let i;
      const bob = (((imul(wv_ph, clamp(BPM, 40, 240)) >>> 0) / 600 >>> 0) & 1) * 3;
      WFR(0, 0, 240, 240, RGB(0x0c, 0x0a, 0x12));
      for (i = 0; i < 60; i++) { const x = pc_h(i * 7) % 240, y = 10 + (pc_h(i * 13) % 70); ne_ring(x, y, 4, sp_s[i % 19] > 12 && (pc_h(i + ((wv_ph / 2) >>> 0)) & 7) === 0 ? WC_WHT : RGB(0x40, 0x3c, 0x50)); }
      ne_line(0, 150, 240, 150, RGB(0xa0, 0xa0, 0xb0));
      for (i = 0; i < 3; i++) wvf_pline(0, 96 + i * 18, 240, 96 + i * 18, i === 0 ? RGB(0xff, 0x40, 0x40) : i === 1 ? RGB(0xf0, 0xf0, 0xf0) : RGB(0x50, 0x80, 0xff));
      ne_box(10, 90, 8, 64, 0, RGB(0xff, 0x40, 0x40)), ne_box(222, 90, 8, 64, 0, RGB(0x50, 0x80, 0xff));
      for (i = 0; i < 6; i++) wvf_pline(0, 170 + i * 12, 240, 170 + i * 12, RGB(0x30, 0x30, 0x40));
      if (nk_low(nk_on)) bx_t = 1; else if (nk_high(nk_on)) bx_t = 101; else if (wvf_hit_n === 5 && !bx_t) bx_t = 1;
      if (bx_t === 4 || bx_t === 104) bx_bag = 14;
      const sw = bx_bag * WV_SIN[(wv_ph * 6) & 63] / 127 | 0;
      if (bx_bag) bx_bag--;
      wvf_pline(182, 0, 182 + (sw / 3 | 0), 70, RGB(0x80, 0x80, 0x80));
      ne_box(168 + sw, 70, 28, 64, 0, RGB(0xd0, 0x40, 0x30)), ne_line(168 + sw, 84, 196 + sw, 84, RGB(0xd0, 0x40, 0x30));
      {
        const hit = (bx_t > 0 && bx_t < 8) || (bx_t > 100 && bx_t < 108);
        spr_outline(hit ? BX_J : BX_G, 30, 54 + (hit ? 10 : 0), 84 + bob, 4, 'HSsKGBwN', BX_C);
        if (bx_t) { bx_t++; if (bx_t === 9 || bx_t === 109) bx_t = 0; }
        if (hit && (bx_t === 3 || bx_t === 103)) for (i = 0; i < 6; i++) { const an = i * 43; ne_line(166 + sw, 98, 166 + sw + (10 * wv_sin4(an + 64) / 127 | 0), 98 + (10 * wv_sin4(an) / 127 | 0), RGB(0xff, 0xe0, 0x60)); }
      }
      wf_text(10, 218, 1, 'ROUND', RGB(0xf0, 0xc0, 0x30)), wf_text(52, 218, 1, fmt_int((((wf_secs() / 30) >>> 0) % 12) + 1), WC_WHT);
      {
        const n = popcnt(nk_mask);
        bx_pw += (clamp(n * 34, 0, 100) - bx_pw) / (n * 34 > bx_pw ? 2 : 6) | 0;
        wf_text(150, 218, 1, 'POWER', RGB(0xf0, 0xc0, 0x30));
        for (i = 0; i < 10; i++) if (i * 10 < bx_pw) WFR(192 + i * 4, 226 - i, 3, 4 + i, i < 4 ? RGB(0x60, 0xf0, 0x60) : i < 7 ? RGB(0xff, 0xd0, 0x40) : RGB(0xff, 0x40, 0x30)); else ne_line(192 + i * 4, 230, 194 + i * 4, 230, RGB(0x50, 0x40, 0x40));
      }
    };

    /* ---- CHORDS */
    const CH_VC = [RGB(0xc8, 0x98, 0xff), RGB(0xf0, 0xc0, 0x60), RGB(0x70, 0xe0, 0xff), RGB(0xff, 0x80, 0xc0)];
    let ch_tpl = 3, ch_root = 9, ch_ph = 0;
    const ch_rings = new Int32Array(40), ch_seg = new Float64Array(4);
    const ch_find = (keys) => {
      let pcs = 0, best = 0, bt = -1, br = 0;
      for (let k = 0; k < 27; k++) if ((keys >>> k) & 1) pcs |= 1 << ((k + 5) % 12);
      if (!pcs) return;
      for (let root = 0; root < 12; root++) {
        if (!((pcs >>> root) & 1)) continue;
        const rel = ((pcs >>> root) | (pcs << (12 - root))) & 0xFFF;
        for (let t = 0; t < CH_TPL.length; t++) {
          const m = CH_TPL[t][0], sc = (rel & m) === m ? (m === rel ? 100 : 10) + CH_TPL[t][1] : 0;
          if (sc > best) best = sc, bt = t, br = root;
        }
      }
      if (bt >= 0) ch_tpl = bt, ch_root = br;
    };
    const v5_chords = () => {
      let i, v;
      const lit = nk_mask !== 0, cx = 120, cy = 112;
      if (lit) ch_find(nk_mask);
      const t = CH_TPL[ch_tpl], tn = t[1], minor = t[0] === 0x89 || t[0] === 0x489 || t[0] === 0x49;
      ch_ph = (ch_ph + (playing || lit ? clamp(BPM, 40, 240) * 14 : 260)) >>> 0;
      WFR(0, 0, 240, 240, C_BLACK);
      wvf_disk(cx, cy, 104, minor ? RGB(0x0c, 0x06, 0x1c) : RGB(0x1c, 0x0e, 0x06)), wvf_disk(cx, cy, 70, minor ? RGB(0x14, 0x0a, 0x2c) : RGB(0x2a, 0x16, 0x08));
      ne_ring(cx, 204, 3, RGB(0x20, 0x20, 0x30));
      for (i = 0; i < 48; i++) { const an = (i * 16 / 3) >>> 0; WFR(cx + (96 * wv_sin4(an + 64) / 127 | 0), 204 + (12 * wv_sin4(an) / 127 | 0), 1, 1, RGB(0x40, 0x40, 0x58)); }
      for (v = 0; v < tn; v++) {
        const n = t[2][v], R = 40 + v * (tn === 4 ? 20 : tn === 3 ? 26 : 34);
        let k, px = 0, py = 0, x0 = 0, y0 = 0;
        const f = (ch_ph & 0xFFFF) * n, seg = Math.floor(f / 65536), fr = f % 65536;
        const c = lit ? CH_VC[v] : RGB(0x60, 0x58, 0x78);
        if (n <= 1) { ne_ring(cx, cy, R, c); x0 = cx, y0 = cy - R; }
        else for (k = 0; k <= n; k++) {
          const an = 192 + (((k % n) * 256 / n) >>> 0), x = cx + (R * wv_sin4(an + 64) / 127 | 0), y = cy + (R * wv_sin4(an) / 127 | 0);
          if (k) wvf_pline(px, py, x, y, c);
          if (k < n) WFR(x - 1, y - 1, 2, 2, lit ? WC_WHT : c);
          px = x, py = y;
        }
        if (n > 1) {
          const a0 = 192 + ((seg * 256 / n) >>> 0), a1 = 192 + (((seg + 1) * 256 / n) >>> 0);
          const xa = cx + (R * wv_sin4(a0 + 64) / 127 | 0), ya = cy + (R * wv_sin4(a0) / 127 | 0), xb = cx + (R * wv_sin4(a1 + 64) / 127 | 0), yb = cy + (R * wv_sin4(a1) / 127 | 0);
          x0 = xa + ((xb - xa) * (fr >>> 8) / 256 | 0), y0 = ya + ((yb - ya) * (fr >>> 8) / 256 | 0);
          if (seg !== ch_seg[v]) {
            for (k = 0; k < 10; k++) if (!ch_rings[k * 4 + 2]) { ch_rings[k * 4] = xa, ch_rings[k * 4 + 1] = ya, ch_rings[k * 4 + 2] = 8, ch_rings[k * 4 + 3] = v; break; }
            ch_seg[v] = seg;
          }
        }
        wvf_disk(x0, y0, lit ? 4 : 2, c), wvf_disk(x0, y0, lit ? 2 : 1, WC_WHT);
        WFR(x0 - 1, 204 + ((204 - y0) / 8 | 0), 3, 2, c);
      }
      for (i = 0; i < 10; i++) if (ch_rings[i * 4 + 2]) { ne_ring(ch_rings[i * 4], ch_rings[i * 4 + 1], 3 + (8 - ch_rings[i * 4 + 2]) * 2, lit ? CH_VC[ch_rings[i * 4 + 3] & 3] : RGB(0x50, 0x48, 0x68)); ch_rings[i * 4 + 2]--; }
      wf_textc(120, 8, 1, (CH_NOTE[ch_root] + ' ' + t[3]).slice(0, 23), lit ? (minor ? RGB(0xd0, 0xb0, 0xff) : RGB(0xff, 0xd0, 0x90)) : RGB(0x70, 0x68, 0x88));
      wf_textc(120, 24, 0, t[2].slice(0, tn).join(' : ').slice(0, 23), RGB(0xa0, 0x98, 0xb8));
    };

    /* ---- ORB: water in a ring (60 x 60 cells of 4 px, two heights in wv_mem as int8) */
    const OB_G = 60, OB_R = 22;
    let ob_fill = OB_R * 16, ob_flip = 0, ob_lb = 0;
    const ob_d2 = (x, y) => (x - 30) * (x - 30) + (y - 30) * (y - 30);
    const ob_drop = (x, y, v) => {
      const A0 = ob_flip ? OB_G * OB_G : 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++)
        if (x + i > 0 && y + j > 0 && x + i < OB_G - 1 && y + j < OB_G - 1) { const o = A0 + (y + j) * OB_G + x + i, n = wv_i8[o] + (i || j ? (v / 2 | 0) : v); wv_i8[o] = clamp(n, -127, 127); }
    };
    const orb_step = () => {
      let x, y, k;
      const play = playing || ev_lvl > 12 || nk_mask, bt = (imul(wv_ph, clamp(BPM, 40, 240)) >>> 0) / 600 >>> 0;
      ob_fill += play ? -3 : 2;
      ob_fill = clamp(ob_fill, 0, OB_R * 16);
      const r0 = ob_fill / 16 | 0;
      for (k = 0; k < 27; k++) if ((nk_on >>> k) & 1) {
        const an = ((k * 256 / 27) >>> 0) + 192;
        ob_drop(30 + ((OB_R - 2) * wv_sin4(an + 64) / 127 | 0), 30 + ((OB_R - 2) * wv_sin4(an) / 127 | 0), 110);
      }
      if (wvf_hit_n === 5) for (x = 30 - OB_R; x <= 30 + OB_R; x += 2) ob_drop(x, 30, (x & 2) ? 70 : -70);
      if (playing && bt !== ob_lb) for (k = 0; k < 32; k++) { const an = k * 8; ob_drop(30 + ((OB_R - 1) * wv_sin4(an + 64) / 127 | 0), 30 + ((OB_R - 1) * wv_sin4(an) / 127 | 0), 36); }
      ob_lb = bt;
      if (play && !(wv_ph % 11)) ob_drop(30 - OB_R + (pc_h(wv_ph) % (OB_R * 2)), 30 - OB_R + (pc_h(imul(wv_ph, 7)) % (OB_R * 2)), 40);
      for (let it = 0; it < 2; it++) {
        const A0 = ob_flip ? OB_G * OB_G : 0, B0 = ob_flip ? 0 : OB_G * OB_G;
        for (y = 1; y < OB_G - 1; y++) for (x = 1; x < OB_G - 1; x++) {
          const i = y * OB_G + x, d2 = ob_d2(x, y);
          if (d2 > OB_R * OB_R || d2 < r0 * r0) { wv_i8[B0 + i] = 0; continue; }
          let n = ((wv_i8[A0 + i - 1] + wv_i8[A0 + i + 1] + wv_i8[A0 + i - OB_G] + wv_i8[A0 + i + OB_G]) >> 1) - wv_i8[B0 + i];
          n -= n >> 5;
          wv_i8[B0 + i] = clamp(n, -127, 127);
        }
        ob_flip ^= 1;
      }
    };
    const orb_paint = () => {
      const A0 = ob_flip ? OB_G * OB_G : 0, r0 = ob_fill / 16 | 0, lv = clamp(ev_lvl / 4 | 0, 0, 40), tw = (WV_SIN[((wv_ph / 2) >>> 0) & 63] / 3 | 0) + ((((wv_ph * 2) >>> 0) % 256) / 8 | 0);
      let x, y;
      for (y = 30 - OB_R; y <= 30 + OB_R; y++) for (x = 30 - OB_R; x <= 30 + OB_R; x++) {
        const d2 = ob_d2(x, y), dx = x - 30, dy = y - 30;
        let rr = 0, c;
        if (d2 > OB_R * OB_R || d2 < r0 * r0) continue;
        while ((rr + 1) * (rr + 1) <= d2) rr++;
        const an = (tw * (OB_R - rr) / OB_R | 0) >>> 0;
        let sx = 30 + ((dx * wv_sin4(an + 64) - dy * wv_sin4(an)) / 127 | 0), sy = 30 + ((dx * wv_sin4(an) + dy * wv_sin4(an + 64)) / 127 | 0);
        sx = clamp(sx, 1, OB_G - 2), sy = clamp(sy, 1, OB_G - 2);
        const i = A0 + sy * OB_G + sx;
        const v = ((wv_i8[i] * 2 + wv_i8[i - 1] + wv_i8[i + 1]) / 4 | 0) + ((wv_i8[i] - wv_i8[i - OB_G - 1]) / 2 | 0);
        c = v < -8 ? RGB(0x06, 0x08, 0x34) : v < 12 ? RGB(0x14, 0x1c, 0x84) : v < 30 ? RGB(0x28, 0x40, 0xd0) : v < 50 ? RGB(0x70, 0x90, 0xff) : v < 72 ? RGB(0xff, 0xb0, 0x70) : WC_WHT;
        if (r0 && d2 < (r0 + 1) * (r0 + 1)) c = (wv_i8[i] & 4) ? RGB(0xff, 0xb0, 0x70) : RGB(0x90, 0xb0, 0xff);
        WFR(x * 4, y * 4, 4, 4, c);
      }
      for (let q = 0; q < 160; q++) { const an = (q * 256 / 160) >>> 0; WFR(120 + (89 * wv_sin4(an + 64) / 127 | 0), 120 + (89 * wv_sin4(an) / 127 | 0), 2, 2, RGB(0x40 + lv * 2, 0x60 + lv * 2, 0xff)); }
      for (x = 0; x < 240; x += 2) {
        const sv = scope_buf[(scope_w - 240 + x) & SCOPE_M], y1 = 120 + (sv * (6 + (lv / 4 | 0)) / 12000 | 0);
        WFR(x, y1 - 1, 2, 1, RGB(0x30, 0x40, 0xa0)), WFR(x, y1, 2, 1, RGB(0xa0, 0xb8, 0xff)), WFR(x, y1 + 1, 2, 1, RGB(0x30, 0x40, 0xa0));
      }
    };

    /* ---- DANCE */
    const DN_C = [RGB(0xf0, 0xa0, 0x80), RGB(0xf8, 0xb0, 0x50), RGB(0xd8, 0xb8, 0x90), RGB(0xb8, 0x80, 0x40), RGB(0xe0, 0x98, 0x60), RGB(0xf0, 0x90, 0x78)];
    const dn_pose = new Uint8Array(12), dn_last = new Uint8Array(12);
    let dn_lastbeat = 0, dn_clap = 0;
    const dn_char = (x, y, z, ch, col) => {
      const DQ = (v) => v * z / 4 | 0;
      switch (ch) {
      case 'O': wvf_disk(x + DQ(4), y + DQ(6), DQ(5), col); wvf_disk(x + DQ(4), y + DQ(6), DQ(5) - 3, C_BLACK); break;
      case '/': ne_line3(x + DQ(7), y, x, y + DQ(12), col); break;
      case '\\': ne_line3(x, y, x + DQ(7), y + DQ(12), col); break;
      case 'I': ne_line3(x + DQ(4), y, x + DQ(4), y + DQ(12), col); break;
      case '(': ne_line3(x + DQ(6), y, x + DQ(2), y + DQ(6), col), ne_line3(x + DQ(2), y + DQ(6), x + DQ(6), y + DQ(12), col); break;
      case ')': ne_line3(x + DQ(2), y, x + DQ(6), y + DQ(6), col), ne_line3(x + DQ(6), y + DQ(6), x + DQ(2), y + DQ(12), col); break;
      case '<': ne_line3(x + DQ(7), y + DQ(2), x + DQ(1), y + DQ(6), col), ne_line3(x + DQ(1), y + DQ(6), x + DQ(7), y + DQ(10), col); break;
      case '>': ne_line3(x + DQ(1), y + DQ(2), x + DQ(7), y + DQ(6), col), ne_line3(x + DQ(7), y + DQ(6), x + DQ(1), y + DQ(10), col); break;
      case '-': ne_line3(x, y + DQ(6), x + DQ(8), y + DQ(6), col); break;
      case 'V': ne_line3(x, y, x + DQ(4), y + DQ(12), col), ne_line3(x + DQ(4), y + DQ(12), x + DQ(8), y, col); break;
      case 'X': ne_line3(x, y, x + DQ(8), y + DQ(12), col), ne_line3(x + DQ(8), y, x, y + DQ(12), col); break;
      case '7': ne_line3(x, y, x + DQ(7), y, col), ne_line3(x + DQ(7), y, x + DQ(3), y + DQ(12), col); break;
      case '*': ne_line3(x + DQ(4), y + DQ(1), x + DQ(4), y + DQ(11), col), ne_line3(x, y + DQ(6), x + DQ(8), y + DQ(6), col),
        ne_line(x + DQ(1), y + DQ(3), x + DQ(7), y + DQ(9), col), ne_line(x + DQ(7), y + DQ(3), x + DQ(1), y + DQ(9), col); break;
      default: break;
      }
    };
    const ne_dance = () => {
      const beat = (imul(wv_ph, clamp(BPM, 40, 240)) >>> 0) / 600 >>> 0, up = wvf_hit_n > 2;
      let i, r;
      if (dr_hits & (1 << 3)) dn_clap = 6;
      else if (dn_clap) dn_clap--;
      for (i = 0; i < 12; i++) {
        const lv = wf_spec[(i * 19 / 12) >>> 0];
        if ((lv > 8 && dn_last[i] <= 8) || (beat !== dn_lastbeat && lv > 5)) dn_pose[i] = (dn_pose[i] + 1 + i % 3) % 10;
        dn_last[i] = lv;
      }
      dn_lastbeat = beat;
      for (i = 0; i < 12; i++) {
        const lv = wf_spec[(i * 19 / 12) >>> 0], x = 12 + (i % 4) * 58, y = 14 + (i / 4 | 0) * 74 - (lv / 2 | 0);
        let c = DN_C[(i * 7) % 6];
        if (lv > 12) c = RGB(0xff, 0xf0, 0xd0);
        for (r = 0; r < 3; r++) {
          const p2 = DN_POSE[dn_clap > 2 ? 11 : dn_clap ? 12 : up ? 10 : dn_pose[i]][r];
          for (let c2 = 0; c2 < p2.length; c2++) dn_char(x + c2 * 14, y + r * 19, 5, p2[c2], c);
        }
        WFR(x + 6, 14 + (i / 4 | 0) * 74 + 60, 30, 2, RGB(0x30, 0x20, 0x18)), WFR(x + 6, 14 + (i / 4 | 0) * 74 + 60, lv * 30 / 24 | 0, 2, c);
      }
    };

    /* ---- BLUEPRINT (as a fight) */
    const bp_dmg = new Uint8Array(9), bp_fl = new Uint8Array(9), bp_quiet = new Uint8Array(9), bp_num = new Int16Array(24);
    let bp_sx = 56, bp_sy = 72;
    const v3_blueprint = () => {
      let i, part = 0, k;
      const cx = new Int32Array(9), cy = new Int32Array(9), cn = new Int32Array(9), pulse = wvf_hit_n > 2 ? 4 : 0;
      for (k = 0; k < 27; k++) if ((nk_on >>> k) & 1) {
        const p = k * 9 / 27 | 0;
        if (bp_dmg[p] < 9) bp_dmg[p]++;
        bp_fl[p] = 4, bp_quiet[p] = 0;
        for (i = 0; i < 6; i++) if (!bp_num[i * 4 + 2]) { bp_num[i * 4 + 2] = 16, bp_num[i * 4 + 3] = k, bp_num[i * 4] = p; break; }
      }
      for (i = 0; i < 9; i++) { if (bp_fl[i]) bp_fl[i]--; bp_quiet[i]++; if (bp_quiet[i] > 20 && bp_dmg[i] && !(wv_ph % 2)) bp_dmg[i]--; if (bp_quiet[i] > 200) bp_quiet[i] = 200; }
      WFR(0, 0, 240, 240, RGB(0x04, 0x08, 0x10));
      for (i = 0; i < 12; i++) WFR(i * 20, 0, 1, 240, RGB(0x18, 0x34, 0x48)), WFR(0, i * 20, 240, 1, RGB(0x18, 0x34, 0x48));
      WFR(0, ((wv_ph * 4) >>> 0) % 240, 240, 1, RGB(0x30, 0x90, 0xb0));
      for (i = 0; i + 1 < BP_HALF.length; i += 2) { if (BP_HALF[i] < 0) { part++; continue; } cx[part % 9] += BP_HALF[i] - 120, cy[part % 9] += BP_HALF[i + 1], cn[part % 9]++; }
      for (i = 0; i < 9; i++) if (cn[i]) cx[i] = cx[i] / cn[i] | 0, cy[i] = cy[i] / cn[i] | 0;
      part = 0;
      for (i = 0; i + 3 < BP_HALF.length; i += 2) {
        if (BP_HALF[i] < 0) { part++; continue; }
        if (BP_HALF[i + 2] < 0) continue;
        const p = part % 9, d = bp_dmg[p], sc = 100 + pulse + (sp_s[BP_BAND[p]] / 3 | 0);
        const c = bp_fl[p] ? WC_WHT : d >= 6 ? RGB(0xff, 0x30, 0x30) : d >= 3 ? RGB(0xff, 0x90, 0x20) : RGB(0x40, 0xe0, 0x20);
        const BX = (v) => 120 + cx[p] + ((v - 120 - cx[p]) * sc / 100 | 0), BY2 = (v) => cy[p] + ((v - cy[p]) * sc / 100 | 0);
        ne_line(BX(BP_HALF[i]), BY2(BP_HALF[i + 1]), BX(BP_HALF[i + 2]), BY2(BP_HALF[i + 3]), c);
        ne_line(240 - BX(BP_HALF[i]), BY2(BP_HALF[i + 1]), 240 - BX(BP_HALF[i + 2]), BY2(BP_HALF[i + 3]), c);
      }
      bp_sx += (56 - bp_sx) / 6 | 0, bp_sy += (72 - bp_sy) / 6 | 0;   /* (no effect on: the sight rests) */
      ne_ring(bp_sx, bp_sy, 20, RGB(0x30, 0xc0, 0xf0)), ne_ring(bp_sx, bp_sy, 10 + (wv_bass() / 2 | 0), RGB(0x30, 0xc0, 0xf0));
      wvf_pline(bp_sx - 28, bp_sy, bp_sx + 28, bp_sy, RGB(0x30, 0xc0, 0xf0)), wvf_pline(bp_sx, bp_sy - 28, bp_sx, bp_sy + 28, RGB(0x30, 0xc0, 0xf0));
      for (i = 0; i < 6; i++) if (bp_num[i * 4 + 2]) {
        const p = bp_num[i * 4], kk = bp_num[i * 4 + 3];
        wf_textc(120 + cx[p] + (kk & 1 ? 14 : -14), cy[p] - (16 - bp_num[i * 4 + 2]) * 2, 1, fmt_int(3 + kk % 7 + bp_dmg[p] * 2), sh_note_col(kk));
        bp_num[i * 4 + 2]--;
      }
      { let hp = 0; for (i = 0; i < 9; i++) hp += 9 - bp_dmg[i]; WFR(8, 226, 82, 8, RGB(0x10, 0x20, 0x10)), WFR(9, 227, hp, 6, hp > 50 ? RGB(0x40, 0xe0, 0x20) : hp > 25 ? RGB(0xff, 0x90, 0x20) : RGB(0xff, 0x30, 0x30)); wf_text(94, 226, 0, 'HP', WC_LAB); }
      for (i = 0; i < 9; i++) if (bp_dmg[i] >= 6) { if (((wv_ph / 4) >>> 0) & 1) WFR(176, 6, 58, 14, RGB(0xff, 0x30, 0x30)), wf_textc(205, 9, 1, 'ALERT', WC_WHT); break; }
    };

    /* ---- PATCH */
    const PT_MC = [RGB(0x60, 0xd0, 0xff), RGB(0xff, 0xc8, 0x40), RGB(0xb0, 0x80, 0xff), RGB(0xff, 0x50, 0x50), RGB(0x60, 0xff, 0x90)];
    const pt_cable = (x0, y0, x1, y1, sag, sway, c) => {
      let px = x0, py = y0;
      for (let i = 1; i <= 16; i++) {
        const t = i * 64 / 16 | 0, x = x0 + ((x1 - x0) * i / 16 | 0) + (sway * WV_SIN[t & 63] / 127 | 0), y = y0 + ((y1 - y0) * i / 16 | 0) + (sag * WV_SIN[(i * 2) & 63] / 127 | 0);
        ne_line(px, py, x, y, c); px = x, py = y;
      }
      ne_ring(x0, y0, 3, c), ne_ring(x1, y1, 3, c);
    };
    const v4_patch = () => {
      const v = [0, 0, 0, 0, 0], shake = nk_on ? 5 : ev_rate > 30 ? 2 : 0, t = wv_ph;
      let i, k;
      WFR(0, 0, 240, 240, RGB(0x10, 0x0c, 0x14));
      for (i = 0; i < 5; i++) {
        const mx = 4 + i * 47, my = 6, hot = 0;
        let nm = 'FX';
        if (i < 4) v[i] = wf_frac(0, 127, p_send[i]), nm = WF_SL_SHRT[i];   /* (wf_hot: none) */
        else v[i] = 0, nm = 'FX';
        const on = v[i] > 40 || hot, a = 96 + ((v[i] * 192 / 1024) >>> 0);
        ne_box(mx, my, 43, 66, 0, hot ? WC_WHT : on ? PT_MC[i] : RGB(0x50, 0x40, 0x48));
        wf_clx0 = mx + 1, wf_clx1 = mx + 42;
        wf_textc(mx + 21, my + 3, 0, nm, hot ? WC_WHT : on ? PT_MC[i] : RGB(0x70, 0x60, 0x68));
        wf_clx0 = 0, wf_clx1 = 240;
        ne_ring(mx + 21, my + 25, 11, hot ? WC_WHT : PT_MC[i]), ne_line3(mx + 21, my + 25, mx + 21 + (10 * wv_sin4(a + 64) / 127 | 0), my + 25 + (10 * wv_sin4(a) / 127 | 0), WC_WHT);
        for (let k2 = 0; k2 < 3; k2++) WFR(mx + 10 + k2 * 9, my + 42, 4, 3, on && ((((t / (2 + i)) >>> 0) + k2) % 3 === 0) ? PT_MC[i] : RGB(0x30, 0x24, 0x2c));
        ne_ring(mx + 12, my + 56, 3, RGB(0xc0, 0xb0, 0x90)), ne_ring(mx + 30, my + 56, 3, RGB(0xc0, 0xb0, 0x90));
      }
      for (i = 0; i < 8; i++) {
        const mx = 6 + i * 29, my = 84, f = sp_s[(i * 19 / 8) >>> 0] * 40, a = 96 + ((clamp(f, 0, 1024) * 192 / 1024) >>> 0);
        ne_box(mx, my, 26, 52, 0, RGB(0x40, 0xc0, 0xc0));
        ne_ring(mx + 13, my + 14, 7, RGB(0xff, 0x80, 0x90)), ne_line(mx + 13, my + 14, mx + 13 + (6 * wv_sin4(a + 64) / 127 | 0), my + 14 + (6 * wv_sin4(a) / 127 | 0), WC_WHT);
        WFR(mx + 5, my + 30, 16, 3, sp_s[i * 2] > 9 ? RGB(0xff, 0xe0, 0x60) : RGB(0x30, 0x40, 0x40));
        ne_ring(mx + 7, my + 43, 3, RGB(0xc0, 0xb0, 0x90)), ne_ring(mx + 19, my + 43, 3, RGB(0xc0, 0xb0, 0x90));
      }
      for (i = 0; i < 12; i++) {
        const s0 = i % 5, x0 = 16 + s0 * 47 + (i >= 5 ? 18 : 0), x1 = 13 + ((i * 5 + 3) % 8) * 29 + (i & 1) * 12, amt = v[s0], sag = 8 + (amt / 40 | 0) + (i % 3) * 4;
        const sway = (amt > 40 ? ((WV_SIN[imul(t, 2 + s0) & 63] * amt / 1024 | 0) / 6 | 0) : 0) + (shake ? (pc_h(t + i) % (shake * 2 + 1)) - shake : 0);
        let c = amt > 40 ? PT_MC[s0] : i & 1 ? RGB(0xc8, 0xa0, 0x30) : RGB(0x50, 0x70, 0x70);
        if (s0 === 4 && v[4] && (((t / 2) >>> 0) & 1)) c = WC_WHT;
        pt_cable(x0, 62, x1, 127, sag, sway, c);
      }
      for (k = 0; k < 2; k++) {
        const kx = 6 + k * 118, ky = 150;
        let wx = 0, n;
        ne_box(kx, ky, 110, 52, 0, RGB(0xff, 0x60, 0x40));
        for (n = k * 13; n < (k ? 27 : 13); n++) {
          const on = (nk_mask >>> n) & 1;
          if (BLK[n % 12]) continue;
          ne_box(kx + 4 + wx * 13, ky + 6 + (on ? 3 : 0), 11, 40, 0, on ? RGB(0xff, 0xe0, 0x60) : RGB(0xe0, 0xe0, 0xe8)), wx++;
        }
        for (n = k * 13, wx = 0; n < (k ? 27 : 13); n++) { const on = (nk_mask >>> n) & 1; if (!BLK[n % 12]) { wx++; continue; } WFR(kx + 4 + wx * 13 - 4, ky + 6 + (on ? 3 : 0), 7, 22, on ? RGB(0xff, 0x60, 0xc0) : RGB(0x60, 0x50, 0x70)); }
      }
      ne_ring(24, 222, 9, RGB(0x60, 0x60, 0x70)), ne_ring(216, 222, 9, RGB(0x60, 0x60, 0x70)), ne_ring(24, 222, 3 + (wv_bass() / 3 | 0), WC_WHT), ne_ring(216, 222, 3 + (wv_bass() / 3 | 0), WC_WHT);
    };

    /* ---- TAPE: the tape (wt_make: the texture of model n, wt_quad: the turning quad) floating in the TAPES room */
    const TT_W = 80, TT_H = 50;
    const wt_tex = new Uint8Array(TT_W * TT_H), wt_pal = new Uint16Array(21);
    const wt_ghost = 0;
    const wt_tpx = (x, y, c) => { if ((x >>> 0) < TT_W && (y >>> 0) < TT_H) wt_tex[y * TT_W + x] = c; };
    const wt_trect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) wt_tpx(i, j, c); };
    const wt_ttextf = (x, y, s, c, xmax, big) => {
      for (let n = 0; n < s.length && x < xmax; n++) {
        const ch = chr(s, n), h = big ? WFM_H : WFS_H, w = big ? WFM_W[ch - 32] : WFS_W[ch - 32], R = big ? WFM_ROWS : WFS_ROWS, o = (ch - 32) * h;
        for (let r = 0; r < h; r++) for (let b = 0; b < w; b++) if (((R[o + r] >> (7 - b)) & 1) && x + b < xmax) wt_tpx(x + b, y + r, c);
        x += w + 1;
      }
      return x;
    };
    const wt_ttext = (x, y, s, c, xmax) => { wt_ttextf(x, y, s, c, xmax, 0); };
    const wt_clear = (md) => md === WM_FUTURE || md === WM_TEAC || md === WM_BRITPOP || md === WM_SKC || md === WM_OIL || md === WM_FLORAL || md === WM_SCOTCH ||
      md === WM_TDKD || md === WM_KITTYP || md === WM_KITTYB || md === WM_SPANKP || md === WM_SPANKG || md === WM_3M || md === WM_DEMAG || md === WM_SONYB || md === WM_ART;
    const wt_tcirc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + (r / 2 | 0)) wt_tpx(cx + x, cy + y, c); };
    const wt_tring = (cx, cy, r, t, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r + (r / 2 | 0) && d >= (r - t) * (r - t)) wt_tpx(cx + x, cy + y, c); } };
    const wt_screw = (x, y) => { wt_tcirc(x, y, 1, 17); wt_tpx(x, y, 1); };
    const WT_D = [[0, -3], [2, -3], [3, -2], [3, 0], [3, 2], [2, 3], [0, 3], [-2, 3], [-3, 2], [-3, 0], [-3, -2], [-2, -3]];
    const wt_reel = (cx, cy, spin) => {
      wt_tcirc(cx, cy, 5, 8);
      wt_tcirc(cx, cy, 3, 9);
      for (let k = 0; k < 6; k++) { const d = ((spin + k * 2) >>> 0) % 12; wt_tpx(cx + WT_D[d][0], cy + WT_D[d][1], 8); wt_tpx(cx + (WT_D[d][0] * 2 / 3 | 0), cy + (WT_D[d][1] * 2 / 3 | 0), 8); }
      wt_tpx(cx, cy, 8);
    };
    const wt_tw = (s, big) => { let w = 0; for (let i = 0; i < s.length; i++) { const c = chr(s, i); w += (big ? WFM_W[c - 32] : WFS_W[c - 32]) + 1; } return w ? w - 1 : 0; };
    const wt_tc = (cx, y, s, c, big) => { wt_ttextf(cx - (wt_tw(s, big) / 2 | 0), y, s, c, TT_W - 2, big); };
    const wt_agfa = (x, y) => {
      let i, j;
      wt_trect(x, y, 11, 11, 11);
      for (j = 0; j < 4; j++) for (i = -j; i <= j; i++) wt_tpx(x + 7 + i, y + 1 + j, 12), wt_tpx(x + 7 + i, y + 7 - j, 12);
      for (j = 2; j <= 8; j += 3) for (i = 0; i <= j; i++) wt_tpx(x + i, y + 10 - wf_isqrt(j * j - i * i), 18);
    };
    const wt_basf = (x, y) => { wt_trect(x, y, 7, 7, 18); wt_tring(x + 3, y + 3, 3, 1, 11); wt_tpx(x + 3, y + 3, 11); };
    const wt_lines = (x0, x1, y, n, gap, c) => { for (let k = 0; k < n; k++) wt_trect(x0, y + k * gap, x1 - x0, 1, c); };
    const wt_make = (n, back, spin) => {
      let md = WT_ORDER[n % WM_N], i, x, y, clear = 0;
      const nm = sel_name.slice(0, 15), M = WT_M[md];
      wt_pal[0] = M[0], wt_pal[1] = wf_dim(M[0], 150), wt_pal[2] = wf_dim(M[0], 255);
      wt_pal[3] = M[1], wt_pal[4] = M[3], wt_pal[5] = M[4], wt_pal[6] = M[2];
      wt_pal[7] = wf_dim(M[0], 200), wt_pal[8] = RGB(0xf8, 0xf8, 0xf4), wt_pal[9] = RGB(0x58, 0x50, 0x48), wt_pal[10] = RGB(0x40, 0x24, 0x18);
      for (i = 0; i < 6; i++) wt_pal[11 + i] = M[5 + i];
      wt_pal[17] = RGB(0x90, 0x98, 0xa0), wt_pal[18] = RGB(0xf8, 0xf8, 0xf8), wt_pal[19] = RGB(0x10, 0x10, 0x10), wt_pal[20] = M[0];
      if (M[0] < RGB(0x40, 0x40, 0x40)) wt_pal[2] = RGB(0x58, 0x58, 0x60), wt_pal[1] = RGB(0x0c, 0x0c, 0x0e);
      wt_tex.fill(wt_clear(md) ? 20 : 0);
      wt_trect(0, 0, TT_W, 1, 2), wt_trect(0, 0, 1, TT_H, 2), wt_trect(0, TT_H - 1, TT_W, 1, 1), wt_trect(TT_W - 1, 0, 1, TT_H, 1);
      wt_tpx(0, 0, 1), wt_tpx(TT_W - 1, 0, 1), wt_tpx(0, TT_H - 1, 1), wt_tpx(TT_W - 1, TT_H - 1, 1);
      for (y = 2; y < TT_H - 2; y += 3) wt_trect(1, y, 2, 1, 1), wt_trect(TT_W - 3, y, 2, 1, 1);
    if (back) { wt_trect(6, 4, TT_W - 12, 30, 3); wt_ttext(9, 6, "B SIDE", 4, TT_W - 8); md = WM_N; }
    switch (md) {
    case WM_CLASSIC: case WM_CLASSICBR:
        wt_trect(6, 4, TT_W - 12, 30, 3);
        wt_ttext(8, 6, "A SIDE", 4, 30);
        wt_ttext(36, 5, "TO MY LOVE", 6, TT_W - 7), wt_trect(34, 11, TT_W - 41, 1, 7);
        for (i = 0; i < 6; i++) wt_trect(6, 14 + i * 2, TT_W - 12, 2, (11 + i));
        wt_trect(6, 26, TT_W - 12, 8, 6);
        wt_tc(40, 27, nm, 5, 1);
        break;
    case WM_ART:
        wt_trect(5, 3, TT_W - 10, 7, 6);
        wt_ttext(7, 4, "HF-S120", 4, 40), wt_ttext(TT_W - 26, 4, "SONY", 18, TT_W - 6);
        wt_trect(5, 10, TT_W - 10, 18, 12);
        for (x = 5; x < TT_W - 5; x++) for (y = 10; y < 15 + ((x * 7) % 5); y++) wt_tpx(x, y, 11);
        wt_tring(29, 21, 8, 2, 13), wt_tring(50, 21, 8, 2, 13), wt_trect(37, 20, 6, 1, 13), wt_tcirc(40, 26, 1, 15);
        wt_trect(5, 29, TT_W - 10, 6, 3);
        wt_ttext(7, 30, "SONY", 19, 26);
        wt_ttextf(27, 29, nm, 5, TT_W - 6, 1);
        break;
    case WM_COMPUTER: {
        let k;
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (k = 0; k < 6; k++) { let yy = 9 + k * 3, w = k < 1 ? 7 : k < 5 ? 10 : 8; wt_trect(7 + ((10 - w) / 2 | 0), yy, w, 3, (11 + k)); }
        wt_tpx(12, 7, 11), wt_tpx(13, 6, 11), wt_tpx(13, 7, 11);
        wt_ttext(22, 4, "LEMONADE", 4, 60), wt_ttext(22, 9, "(C) 1979", 4, 60);
        wt_ttext(61, 17, "LOAD", 4, TT_W - 3), wt_ttext(62, 23, "16K", 4, TT_W - 3);
        wt_ttext(7, 29, "600-2026", 4, 30);
        wt_ttextf(33, 28, nm, 5, TT_W - 5, 1);
        break;
    }
    case WM_AUDITION:
        wt_trect(5, 3, TT_W - 10, 12, 3);
        wt_lines(5, TT_W - 5, 8, 2, 5, 13);
        wt_ttext(7, 4, "INDEX", 4, 30), wt_ttext(32, 4, "M*A*S*H", 11, TT_W - 6);
        wt_trect(5, 15, TT_W - 10, 20, 6);
        wt_trect(7, 18, 11, 9, 3), wt_ttext(8, 19, "SIDE", 4, 18), wt_ttext(11, 24, "1", 4, 18);
        wt_ttextf(61, 20, "40", 18, TT_W - 4, 1), wt_ttext(61, 16, "MIN", 18, TT_W - 4);
        wt_ttextf(7, 28, nm, 5, 52, 1), wt_ttext(52, 29, "KOREA", 18, TT_W - 5);
        break;
    case WM_SONYB:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_trect(5, 3, 2, 32, 11), wt_trect(TT_W - 7, 3, 2, 32, 11), wt_trect(5, 33, TT_W - 10, 2, 11);
        wt_trect(8, 4, 8, 8, 11), wt_ttext(10, 6, "B", 3, 16);
        wt_ttextf(19, 5, "'80S ROCK", 19, TT_W - 8, 1), wt_trect(8, 13, TT_W - 16, 1, 11);
        wt_ttextf(8, 27, nm, 5, 50, 1);
        wt_ttext(52, 27, "LOW-", 4, TT_W - 8), wt_ttext(52, 32 - 3, "", 4, TT_W - 8), wt_ttext(TT_W - 20, 30, "C90", 11, TT_W - 8);
        break;
    case WM_FUTURE:
        wt_trect(7, 4, TT_W - 14, 9, 3);
        wt_ttextf(9, 5, nm, 5, TT_W - 9, 1);
        wt_trect(7, 28, TT_W - 14, 6, 3);
        wt_ttext(9, 29, "99", 4, 20), wt_ttext(34, 29, "SOUNDBITE REC", 4, TT_W - 9);
        wt_trect(60, 21, 13, 6, 11), wt_ttext(61, 22, "$9", 19, 73);
        for (y = 14; y < 27; y += 2) for (x = 6 + (y & 2); x < TT_W - 6; x += 7) wt_tpx(x, y, 2);
        clear = 1;
        break;
    case WM_TOLAKU:
        wt_trect(5, 3, TT_W - 10, 13, 3);
        wt_ttextf(7, 4, nm, 5, 48, 1);
        wt_ttext(7, 11, "WISH YOU WERE HERE", 19, 48);
        for (x = 50; x < TT_W - 6; x += 6) wt_trect(x, 4, 5, 2, 11), wt_trect(x + 2, 4, 1, 10, 11), wt_trect(x, 9, 5, 1, 11), wt_trect(x, 13, 5, 1, 11);
        wt_trect(5, 16, TT_W - 10, 15, 6);
        wt_trect(7, 18, 5, 5, 13), wt_trect(12, 18, 5, 5, 11);
        wt_ttext(61, 17, "SIDE", 18, TT_W - 4), wt_ttextf(63, 23, "2", 18, TT_W - 4, 1);
        wt_trect(5, 31, TT_W - 10, 4, 3), wt_ttext(8, 31, "SUPERFERRO", 4, 50), wt_ttext(52, 31, "STEREO", 4, TT_W - 6);
        break;
    case WM_DOODLE:
        wt_trect(5, 3, TT_W - 10, 15, 3);
        wt_trect(5, 18, TT_W - 10, 17, 6);
        wt_ttext(7, 5, "INDEX", 4, 30);
        wt_ttextf(26, 4, nm, 5, TT_W - 7, 1), wt_trect(26, 12, TT_W - 33, 1, 14);
        wt_ttext(8, 29, "DREAM", 18, 34), wt_ttext(52, 29, "2018", 14, TT_W - 6);
        wt_tpx(68, 5, 11), wt_tpx(70, 7, 11), wt_tpx(69, 6, 11), wt_tpx(68, 7, 11), wt_tpx(70, 5, 11);
        wt_trect(8, 17, 1, 9, 4), wt_trect(9, 17, 6, 4, 12);
        wt_tcirc(66, 30, 3, 13);
        wt_ttext(62, 19, "A", 14, TT_W - 4);
        break;
    case WM_PINK: {
        let k;
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (k = 0; k < 6; k++) { x = 8 + k * 6; wt_trect(x, 5, 4, 1, 19), wt_trect(x + 1 + (k & 1), 5, 1, 6, 19), wt_trect(x, 9 - (k & 1), 4, 1, 19); }
        wt_ttextf(46, 5, nm, 5, TT_W - 6, 0);
        wt_ttextf(8, 12, nm, 5, TT_W - 8, 1);
        wt_trect(5, 20, TT_W - 10, 2, 6);
        wt_trect(5, 28, TT_W - 10, 7, 6);
        wt_ttext(61, 15, "SIDE", 4, TT_W - 4), wt_ttextf(64, 21, "A", 11, TT_W - 4, 1);
        wt_ttext(7, 29, "PONY CANYON MONO", 18, TT_W - 6);
        break;
    }
    case WM_STAR:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_tc(40, 4, nm, 5, 1);
        wt_tc(40, 12, "SIDE B", 4, 0);
        wt_lines(7, 20, 5, 4, 2, 13), wt_lines(60, 73, 5, 4, 2, 13);
        wt_ttext(7, 20, "XO", 13, 20);
        for (y = 16; y < 35; y++) for (x = 62; x < TT_W - 5; x++) if ((x - 67) * (x - 67) + (y - 22) * (y - 22) < 22 || (y > 27 && x > 60 + ((34 - y) / 2 | 0))) wt_tpx(x, y, 11);
        wt_lines(20, 58, 30, 3, 2, 13);
        break;
    case WM_FISHER:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_tc(40, 4, nm, 5, 1);
        wt_ttext(16, 12, "(C)1987 FISHER-PRICE", 4, TT_W - 8);
        wt_trect(5, 17, TT_W - 10, 2, 11), wt_trect(5, 19, TT_W - 10, 2, 12), wt_trect(5, 21, TT_W - 10, 2, 13);
        wt_trect(5, 27, TT_W - 10, 8, 6);
        wt_ttext(8, 28, "SIDE", 19, 26), wt_tc(46, 28, "FISHER-PRICE", 18, 0);
        break;
    case WM_POLIMER:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (i = 0; i < 4; i++) wt_tring(14, 15, 9 - i * 2, 2, (11 + i));
        wt_trect(5, 15, 20, 10, 3);
        wt_ttextf(26, 4, nm, 5, TT_W - 5, 1);
        wt_trect(7, 17, 9, 9, 4), wt_ttext(8, 19, "2X48", 4, 17);
        wt_ttext(62, 17, "90+6", 4, TT_W - 3);
        wt_ttext(8, 29, "POLIMER", 4, 34), wt_ttext(34, 29, "LH-HIFI", 18, TT_W - 5);
        break;
    case WM_AGFASC:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_agfa(7, 4);
        wt_lines(22, TT_W - 7, 7, 2, 5, 4);
        wt_tcirc(66, 21, 5, 13);
        wt_ttextf(7, 28, nm, 5, 52, 1);
        wt_ttext(52, 27, "HIGH", 4, 70), wt_ttext(52, 32 - 1, "DYN", 4, 70), wt_ttextf(64, 27, "60", 13, TT_W - 3, 1);
        break;
    case WM_TEAC:
        wt_tcirc(30, 21, 17, 11);
        wt_tc(40, 4, nm, 18, 1);
        wt_ttext(6, 21, "TYPE I", 4, 20), wt_ttextf(38, 28, "A", 18, 50, 1), wt_ttext(60, 21, "MDX1", 19, TT_W - 3);
        wt_ttext(8, 31, "SUPERFERRO", 18, 50), wt_ttext(56, 31, "100MIN", 4, TT_W - 4);
        clear = 1;
        break;
    case WM_AGFAFC:
        wt_trect(16, 4, TT_W - 22, 10, 3), wt_tring(10, 9, 5, 1, 19), wt_lines(17, TT_W - 7, 8, 2, 4, 11);
        wt_agfa(7, 16);
        wt_trect(62, 16, 11, 10, 18), wt_ttextf(63, 18, "60", 19, TT_W - 4, 1);
        wt_tc(40, 27, nm, 19, 1);
        wt_ttext(10, 35, "HIGH DYNAMIC", 19, TT_W - 8);
        break;
    case WM_AGFALNS:
        wt_agfa(6, 4);
        wt_ttextf(20, 4, nm, 19, TT_W - 5, 1), wt_lines(20, TT_W - 7, 12, 1, 4, 18);
        wt_tcirc(66, 21, 5, 18);
        wt_ttext(7, 29, "60 2X30MIN", 19, 48), wt_ttext(48, 29, "LOW-NOISE", 19, TT_W - 4);
        wt_ttext(48, 34, "SPECIAL", 19, TT_W - 4);
        break;
    case WM_BASFR:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_lines(5, TT_W - 5, 7, 2, 4, 6), wt_ttext(7, 4, "1", 19, 12);
        wt_ttext(6, 16, "STEREO", 19, 22), wt_ttext(6, 21, "MONO", 19, 22), wt_ttext(6, 26 - 1, "DOLBY", 19, 22);
        wt_trect(5, 28, TT_W - 10, 7, 6);
        wt_basf(7, 28), wt_ttextf(16, 28, nm, 5, 60, 1), wt_ttextf(62, 28, "90", 11, TT_W - 4, 1);
        break;
    case WM_BASFO:
        wt_trect(5, 3, TT_W - 10, 12, 3);
        wt_ttext(7, 4, "SIDE 2  STEREO  NO.", 4, TT_W - 6), wt_lines(7, TT_W - 7, 10, 2, 2, 13);
        wt_trect(5, 15, TT_W - 10, 20, 6);
        wt_ttext(7, 20, "60", 19, 16), wt_trect(61, 17, 11, 9, 19), wt_ttext(62, 18, "SM", 6, 72);
        wt_basf(7, 28), wt_ttextf(16, 28, nm, 19, 60, 1), wt_ttext(62, 29, "LH SM", 19, TT_W - 3);
        break;
    case WM_HAPPY:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (x = 56; x < TT_W - 6; x++) for (y = 4; y < 34; y++) if (((x * 3 + y * 5) / 4 | 0) % 6 === 0) wt_tpx(x, y, 11);
        wt_tcirc(10, 7, 3, 11), wt_tpx(10, 7, 18);
        wt_ttext(16, 4, "MADE IN GERMANY", 18, 56);
        wt_ttextf(16, 9, nm, 5, 60, 1);
        wt_ttextf(7, 17, "C90", 18, 22, 0);
        wt_ttext(7, 29, "2X45 MIN LOW-NOISE", 18, 56);
        wt_tcirc(66, 21, 4, 18);
        break;
    case WM_BARBIE: {
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (y = 3; y < 35; y++) for (x = 30 + y; x < 44 + y && x < TT_W - 5; x++) wt_tpx(x, y, 6);
        wt_ttext(16, 4, "THE BEAT", 19, 50), wt_ttext(55, 4, "SHINE", 19, TT_W - 6);
        wt_tcirc(9, 7, 2, 11), wt_trect(7, 19, 5, 5, 12), wt_trect(8, 27, 5, 4, 13);
        wt_ttext(62, 18, "SIDE", 13, TT_W - 4), wt_ttextf(64, 23, "A", 13, TT_W - 4, 1);
        wt_tc(40, 28, nm, 5, 1);
        break;
    }
    case WM_HOLO:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (x = 5; x < TT_W - 5; x++) for (y = 3; y < 35; y++) wt_tpx(x, y, (11 + ((x + y * 2 + ((x * y) / 40 | 0)) / 9 | 0) % 4));
        wt_ttext(7, 4, "7/13", 19, 24);
        wt_ttextf(14, 5, nm, 19, TT_W - 6, 1), wt_trect(14, 12, TT_W - 22, 1, 19);
        wt_ttextf(62, 27, "14", 19, TT_W - 3, 1);
        wt_ttext(7, 29, "MADE IN YORK", 4, 50);
        break;
    case WM_FEB: {
        const HT = [0x6c, 0xfe, 0x7c, 0x38, 0x10];
        let k;
        wt_trect(5, 3, TT_W - 10, 12, 3);
        for (k = 0; k < 5; k++) for (i = 0; i < 7; i++) if ((HT[k] >> (7 - i)) & 1) wt_tpx(7 + i, 5 + k, 11), wt_tpx(TT_W - 14 + i, 5 + k, 11);
        wt_tc(40, 5, nm, 5, 1);
        wt_trect(5, 15, TT_W - 10, 20, 6);
        wt_ttextf(7, 28, "V-21", 4, 30, 1), wt_tc(40, 30, "MELOMANE", 4, 0), wt_ttextf(64, 26, "B", 4, TT_W - 3, 1), wt_ttext(61, 33 - 1, "SIDE", 4, TT_W - 3);
        break;
    }
    case WM_BRITPOP:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_trect(7, 5, 30, 7, 12), wt_ttext(9, 6, "NOSTALGIA", 18, 36);
        wt_ttextf(39, 5, nm, 5, TT_W - 6, 1);
        wt_ttextf(10, 18, "A", 13, 18, 1);
        wt_trect(5, 27, TT_W - 10, 3, 13), wt_trect(5, 31, TT_W - 30, 3, 11);
        wt_ttext(8, 22, "", 4, 20), wt_ttext(9, 33 - 1, "", 4, 20), wt_ttext(46, 31, "MADE IN GB", 4, TT_W - 6);
        clear = 1;
        break;
    case WM_EMO:
        wt_trect(5, 3, TT_W - 10, 12, 3);
        wt_trect(7, 5, 30, 7, 13), wt_ttext(9, 6, "NOSTALGIA", 12, 36);
        wt_ttextf(39, 5, nm, 5, TT_W - 14, 1);
        wt_ttext(TT_W - 13, 4, "IN", 4, TT_W - 5), wt_ttext(TT_W - 13, 9, "OUT", 4, TT_W - 3);
        wt_trect(5, 15, TT_W - 10, 20, 6);
        for (y = 27; y < 35; y++) for (x = 5; x < TT_W - 5; x++) if (((x / 3 | 0) + (y / 3 | 0)) & 1) wt_tpx(x, y, 12);
        break;
    case WM_HORTEN:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_ttext(9, 4, "HORTEN", 11, 36), wt_ttext(40, 4, "SHEILA-LOCOMOTION", 12, TT_W - 6);
        wt_tc(40, 9, nm, 5, 1);
        wt_ttext(6, 18, "LOW", 11, 20), wt_ttext(6, 23, "NOISE", 11, 22);
        wt_ttext(7, 29, "HI FI", 11, 26), wt_trect(28, 28, 26, 7, 11), wt_trect(29, 29, 24, 5, 3), wt_ttext(30, 29, "COMPACT", 11, 54), wt_ttextf(58, 28, "C60", 11, TT_W - 4, 1);
        break;
    case WM_EXCL:
        wt_ttextf(7, 4, nm, 5, 36, 1);
        wt_trect(38, 4, TT_W - 44, 10, 18), wt_trect(40, 9, TT_W - 48, 1, 12);
        wt_ttext(6, 17, "MADE IN", 18, 22), wt_ttext(6, 22, "W.GERMANY", 18, 22);
        wt_tcirc(66, 21, 5, 18);
        wt_trect(5, 28, TT_W - 10, 7, 18);
        wt_ttextf(7, 28, "C60", 19, 26, 1), wt_ttext(28, 29, "HIFI LOW NOISE", 12, TT_W - 6);
        break;
    case WM_SKC:
        wt_tcirc(52, 21, 16, 14);
        for (y = 3; y < 13; y++) wt_trect(44 + (y - 3), y, 20 - 2 * (y - 3), 1, 12);
        wt_tcirc(36, 13, 3, 13), wt_tcirc(70, 26, 3, 13), wt_tcirc(10, 22, 4, 12), wt_ttext(9, 20, "A", 19, 14);
        wt_trect(5, 28, 36, 6, 11), wt_ttextf(7, 28, nm, 18, 41, 1);
        wt_ttext(50, 29, "LX60", 18, TT_W - 6);
        clear = 1;
        break;
    case WM_OIL:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (x = 5; x < TT_W - 5; x++) for (y = 3; y < 35; y++) { let s2 = (x * 2 + ((WV_SIN[(y * 3 + x) & 63] + 128) / 16 | 0) + y); wt_tpx(x, y, (11 + (s2 / 5 | 0) % 5)); }
        wt_trect(5, 28, TT_W - 10, 7, 15), wt_tc(40, 28, nm, 5, 1);
        clear = 1;
        break;
    case WM_FLORAL: {
        let k;
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (k = 0; k < 14; k++) { let fx = 8 + (k * 37) % 64, fy = 5 + (k * 23) % 28; wt_tcirc(fx, fy, 2 + k % 2, (k % 3 === 0 ? 13 : k % 3 === 1 ? 11 : 12)); wt_tpx(fx, fy, 14); }
        wt_trect(5, 28, TT_W - 10, 7, 6), wt_tc(40, 28, nm, 5, 1);
        clear = 1;
        break;
    }
    case WM_AGFAY:
        wt_tcirc(11, 8, 5, 18), wt_lines(18, TT_W - 7, 6, 2, 5, 12);
        wt_agfa(6, 16);
        wt_trect(62, 16, 11, 10, 18), wt_ttextf(63, 18, "60", 11, TT_W - 4, 1);
        wt_tc(40, 28, nm, 19, 1);
        break;

    case WM_SCOTCH:
        wt_tcirc(28, 21, 15, 11), wt_tcirc(52, 21, 15, 11);
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_ttextf(7, 4, "1", 4, 14, 1), wt_lines(14, TT_W - 8, 6, 2, 5, 4);
        wt_ttextf(7, 17, "60", 4, 20, 1), wt_ttext(7, 24, "MIN.", 4, 20), wt_ttext(61, 17, "2X30", 4, TT_W - 3), wt_ttext(62, 23, "MIN.", 4, TT_W - 3);
        wt_ttext(7, 29, "SCOTCH", 12, 30), wt_ttextf(31, 28, nm, 5, 64, 1), wt_ttext(65, 29, "3M", 4, TT_W - 4);
        break;
    case WM_SEIKO:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_lines(6, 22, 9, 6, 4, 4), wt_lines(58, TT_W - 6, 9, 6, 4, 4);
        wt_ttext(7, 4, "INDEX", 4, 22), wt_ttextf(64, 3, "A", 11, TT_W - 4, 1);
        wt_trect(22, 3, 36, 32, 6);
        wt_tc(40, 4, nm, 5, 1), wt_ttext(25, 11, "COMPACT", 18, 56);
        wt_tc(40, 28, "C-60", 12, 1);
        break;
    case WM_TDKD:
        wt_tcirc(28, 22, 17, 11);
        wt_ttext(8, 5, "TDK", 14, 22), wt_ttextf(26, 4, nm, 5, 66, 1), wt_ttextf(64, 9, "120", 13, TT_W - 2, 0);
        wt_tcirc(64, 5, 3, 14);
        wt_trect(5, 13, TT_W - 10, 1, 12);
        wt_tcirc(10, 30, 2, 13), wt_ttext(16, 29, "LOW NOISE SUPERIOR", 14, TT_W - 6);
        wt_trect(5, 34, TT_W - 10, 3, 12);
        break;
    case WM_KITTYP: case WM_KITTYB: {
        let fx = 18;
        wt_ttext(6, 4, "AXIA", 4, 24);
        wt_tring(fx, 9, 5, 1, 4), wt_tpx(fx - 6, 4, 4), wt_tpx(fx - 5, 5, 4), wt_tpx(fx + 6, 4, 4), wt_tpx(fx + 5, 5, 4);
        wt_tpx(fx - 2, 9, 12), wt_tpx(fx + 2, 9, 12), wt_tpx(fx, 11, 13);
        wt_tcirc(fx + 4, 5, 1, 4);
        wt_ttext(27, 4, "HELLO KITTY", 4, TT_W - 6), wt_ttext(30, 10, "(C)76,99 SANRIO", 4, TT_W - 6);
        wt_trect(14, 14, 52, 15, 6);
        wt_ttext(16, 19, "A", 18, 22), wt_ttext(58, 19, md === WM_KITTYP ? "46" : "74", 18, 66);
        wt_tc(40, 30, nm, 5, 1);
        break;
    }
    case WM_SPANKP: case WM_SPANKG: {
        let k;
        wt_tcirc(29, 21, 13, 14), wt_tcirc(51, 21, 13, 14);
        for (k = 0; k < 8; k++) { let cx = 8 + (k * 29) % 66, cy = 5 + (k * 17) % 30; wt_tring(cx, cy, 2, 1, (k & 1 ? 13 : 11)); }
        for (k = 0; k < 3; k++) { let gx = 10 + k * 26; wt_trect(gx, 30, 5, 1, 11), wt_trect(gx + 2, 26, 1, 4, 11), wt_trect(gx, 24, 5, 2, 12); }
        wt_ttextf(6, 3, nm, 5, TT_W - 6, 1);
        wt_ttext(44, 30, "TYPE I", 18, TT_W - 4);
        break;
    }
    case WM_AGFAC90:
        wt_agfa(7, 4);
        wt_ttextf(20, 4, nm, 18, 60, 1), wt_lines(20, TT_W - 7, 12, 1, 3, 11);
        wt_ttextf(64, 17, "1", 18, TT_W - 4, 1);
        wt_ttext(7, 30, "COMPACT C90 1 LOW-NOISE", 19, TT_W - 5);
        break;
    case WM_APPLEPIE: {
        let k;
        wt_trect(5, 3, TT_W - 10, 32, 3);
        wt_trect(7, 4, 9, 6, 19), wt_ttext(9, 5, "MM", 3, 16), wt_ttext(18, 5, "1", 4, 22);
        for (k = 0; k < 4; k++) wt_trect(7 + k * 2, 17 - k, 2, 1 + k, (k & 1 ? 12 : 11));
        wt_trect(25, 4, 9, 9, 18), wt_ttext(26, 6, "C8", 19, 34);
        wt_ttext(46, 4, "MIDI MATILDA", 4, TT_W - 5), wt_lines(36, TT_W - 7, 10, 2, 3, 4);
        wt_tcirc(66, 21, 4, 19);
        wt_ttextf(7, 28, nm, 5, 52, 1);
        for (k = 0; k < 8; k++) wt_trect(53 + k * 2, 28, 1, 6, 19);
        break;
    }
    case WM_3M:
        wt_trect(5, 3, TT_W - 10, 32, 3);
        for (y = 14; y < 35; y++) for (x = 5; x < TT_W - 5; x++) if (((x + y) / 7 | 0) % 2 === 0) wt_tpx(x, y, 6);
        wt_tc(40, 4, nm, 5, 1), wt_lines(7, TT_W - 7, 11, 1, 3, 6);
        wt_ttext(36, 30, "3M", 6, 50);
        wt_ttext(52, 30, "60/A", 18, TT_W - 6);
        break;
    case WM_DEMAG: {
        let k;
        wt_trect(16, 4, TT_W - 24, 24, 11);
        for (k = 0; k < 6; k++) wt_trect(20 + k * 9, 6 + (k & 1) * 5, 5, 4, 12);
        wt_tcirc(58, 8, 3, 14), wt_tcirc(66, 9, 3, 14), wt_trect(46, 5, 3, 6, 13), wt_trect(68, 4, 5, 6, 15);
        for (k = 0; k < 10; k++) wt_trect(18 + k * 6, 25, 3, 1, 16);
        wt_tring(10, 9, 4, 1, 17), wt_tcirc(10, 9, 2, 17);
        wt_trect(5, 28, TT_W - 10, 7, 3);
        wt_ttext(7, 29, "TDK", 19, 18), wt_ttextf(20, 28, nm, 5, TT_W - 6, 1);
        break;
    }
    default:
        break;
    }
      if (wt_clear(md)) clear = 1;
      wt_trect(21, 15, 38, 13, clear ? 20 : 7);
      if (clear) wt_trect(21, 15, 38, 1, 2), wt_trect(21, 27, 38, 1, 2);
      wt_trect(33, 17, 14, 8, 10);
      wt_trect(35, 18, 10, 6, 1);
      wt_trect(37, 19, 6, 4, 10);
      wt_reel(29, 21, spin), wt_reel(50, 21, spin);
      for (y = 37; y < TT_H - 1; y++) {
        const inn = (y - 37) / 3 | 0;
        wt_trect(14 + inn, y, TT_W - 28 - 2 * inn, 1, clear ? ((y & 1) ? 20 : 2) : (y & 1) ? 7 : 2);
      }
      wt_tcirc(22, 45, 2, 9), wt_tcirc(57, 45, 2, 9);
      wt_trect(31, 43, 3, 3, 9), wt_trect(46, 43, 3, 3, 9);
      wt_screw(3, 3), wt_screw(TT_W - 4, 3), wt_screw(3, TT_H - 4), wt_screw(TT_W - 4, TT_H - 4), wt_screw(40, 40);
    };
    const wt_quad = (cx, cy, w0, h0, a, shade, bs) => {
      const c = WV_SIN[(a + 16) & 63], sn = WV_SIN[a & 63];
      let hw = w0 * c / 254 | 0, zl = -w0 * sn / 254 | 0, zr = -zl, hl, hr, x0, x1, sx;
      const flip = hw < 0, T = w0 * 15 / 100 | 0;
      let sw = T * (sn < 0 ? -sn : sn) / 127 | 0;
      if (flip) hw = -hw, zl = -zl, zr = -zr;
      hl = h0 * 220 / (220 + zl) | 0, hr = h0 * 220 / (220 + zr) | 0;
      {
        const near_l = zl < 0;
        let hn = near_l ? hl : hr, ex = near_l ? cx - hw - sw : cx + hw;
        if (hw < 2) ex = cx - (T / 2 | 0), sw = T, hn = h0;
        for (let i = 0; i < sw; i += bs) {
          const hh = hn - ((near_l ? sw - i : i) * hn / (sw * 14 + 1) | 0), top = cy - (hh / 2 | 0);
          WFR(ex + i, top, bs, hh, wt_pal[1]);
          WFR(ex + i, top, bs, 1, wt_pal[2]);
          WFR(ex + i, cy - 1, bs, 2, wf_dim(wt_pal[1], 120));
          WFR(ex + i, top + (hh * 3 / 4 | 0), bs, 1, wf_dim(wt_pal[1], 140));
        }
      }
      if (hw < 2) return;
      x0 = bs > 1 ? (cx - hw) & ~1 : cx - hw, x1 = bs > 1 ? (cx + hw) & ~1 : cx + hw;
      for (sx = x0; sx < x1; sx += bs) {
        const u = (sx - x0) * 1024 / (x1 - x0) | 0, h = hl + ((hr - hl) * u / 1024 | 0), top = bs > 1 ? (cy - (h / 2 | 0)) & ~1 : cy - (h / 2 | 0);
        const dark = shade + (flip ? 2 : 0) + (u < 512 ? (zl > 0 ? zl / 18 | 0 : 0) : (zr > 0 ? zr / 18 | 0 : 0));
        if (sx + bs <= wf_rx || sx >= wf_rx + wf_rw) continue;
        const tu = (flip ? 1023 - u : u) * TT_W / 1024 | 0;
        for (let sy = top; sy < top + h; sy += bs) {
          const v = (sy - top) * TT_H / (h ? h : 1) | 0, ti = wt_tex[clamp(v, 0, TT_H - 1) * TT_W + clamp(tu, 0, TT_W - 1)];
          let col = wt_pal[ti];
          if (ti === 20) {
            if (((sx / bs | 0) + (sy / bs | 0)) & 1) continue;
            col = wf_dim(col, 235);
          } else if (wt_ghost && dark > 0 && BY4[((sy >> 1) & 3) * 4 + ((sx >> 1) & 3)] < clamp(dark, 0, 15)) col = wf_dim(col, 150);
          WFR(sx, sy, bs, bs, col);
        }
      }
    };
    let tp_ang = 0, tp_tgt = 0, tp_bob = 0;
    const TP_G = [RGB(0x7a, 0x70, 0x90), RGB(0x5c, 0x48, 0x82), RGB(0x40, 0x28, 0x6c), RGB(0x2a, 0x14, 0x4c), RGB(0x16, 0x08, 0x2a)];
    const v2_tape_step = () => {
      if (nk_on) tp_tgt = 14;
      else if (tp_tgt) tp_tgt--;
      tp_ang++;
      tp_bob += (wv_bass() * 2 - tp_bob) / 6 | 0;
      const a = tp_ang & 63;
      wt_make(preset, ((a + 16) & 63) >= 32, playing ? ((fm1_ms / 55) >>> 0) : 0);
    };
    const v2_tape = () => {
      let x, y, i;
      for (y = wf_ry & ~1; y < wf_ry + wf_rh; y += 2) {
        const f = y * 4 * 16 / 240 | 0, band = f / 16 | 0, fr = f % 16;
        for (x = 0; x < 240; x += 2) WFR(x, y, 2, 2, TP_G[clamp(band + (BY4[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] < fr ? 1 : 0), 0, 4)]);
      }
      for (i = 0; i < 8; i++) WFR(0, 180 + i * i, 240, 1, RGB(0x60, 0x40, 0x98));
      for (i = -8; i <= 8; i++) cv_line(120 + i * 12, 180, 120 + i * 40, 240, RGB(0x60, 0x40, 0x98));
      wt_quad(120, 104 - (tp_bob / 2 | 0) + (WV_SIN[(wv_ph * 2) & 63] / 40 | 0), 180 + tp_tgt * 2, 113 + tp_tgt, tp_ang & 63, 0, 2);
      wf_textc(120, 214, 1, sel_name.slice(0, 13), WC_WHT);
    };

    /* ---- DOOMSCROLL */
    const dm_b = new Int16Array(30), dm_c = new Int16Array(24), dm_tap = new Float64Array(27);
    let dm_col = 0, dm_feed = 0, dm_v = 0, dm_hand = 100, dm_loop = 0, dm_heart = 0, dm_hpost = -1, dm_cpost = 0, dm_was = 0;
    const dm_liked = [-1, -1, -1, -1, -1, -1];
    const DM_PF = [[0, 0, 9], [10, -4, 10], [20, 0, 8], [-9, 2, 7], [28, 3, 6], [6, 4, 9]];
    const dm_cloud = (cx, cy, s) => {
      let i;
      for (i = 0; i < 6; i++) wvf_disk(cx + (DM_PF[i][0] * s / 8 | 0), cy + (DM_PF[i][1] * s / 8 | 0) + 2, DM_PF[i][2] * s / 8 | 0, RGB(0xd0, 0x98, 0xc0));
      for (i = 0; i < 6; i++) wvf_disk(cx + (DM_PF[i][0] * s / 8 | 0) - 1, cy + (DM_PF[i][1] * s / 8 | 0), (DM_PF[i][2] * s / 8 | 0) - 1, RGB(0xf8, 0xc8, 0xd8));
      for (i = 0; i < 6; i++) wvf_disk(cx + (DM_PF[i][0] * s / 8 | 0) - 3, cy + (DM_PF[i][1] * s / 8 | 0) - 3, (DM_PF[i][2] * s / 8 | 0) / 2 | 0, RGB(0xff, 0xe8, 0xf0));
    };
    const DM_SK = [RGB(0xff, 0x90, 0x60), RGB(0x70, 0xb0, 0xf0), RGB(0xe0, 0x80, 0xc0), RGB(0x60, 0xd0, 0xc0)];
    const dm_photo = (x, y, h) => {
      const a = DM_SK[h % 4], d = RGB(0x24, 0x20, 0x38), kind = (h >>> 3) % 7;
      let i;
      switch (kind) {
      case 0: WFR(x, y, 80, 12, RGB(0xff, 0xc0, 0x60)), WFR(x, y + 12, 80, 10, a), wvf_disk(x + 40, y + 22, 8, RGB(0xff, 0xf0, 0xa0)), WFR(x, y + 22, 80, 12, RGB(0x30, 0x40, 0x80));
        for (i = 0; i < 4; i++) WFR(x + 32 + (i & 1) * 4, y + 24 + i * 3, 16 - i * 3, 1, RGB(0xff, 0xe0, 0x90)); break;
      case 1: WFR(x, y, 80, 34, a);
        for (i = 0; i < 24; i++) WFR(x + 26 - i, y + 10 + i, i * 2 + 1, 1, i < 6 ? WC_WHT : d), WFR(x + 58 - (i / 2 | 0), y + 16 + (i * 3 / 4 | 0), i + 1, 1, RGB(0x40, 0x50, 0x70)); break;
      case 2: WFR(x, y, 80, 34, a), wvf_disk(x + 40, y + 14, 8, RGB(0xf0, 0xc0, 0xa0)), WFR(x + 32, y + 5, 16, 5, d), WFR(x + 28, y + 24, 24, 10, d),
        WFR(x + 37, y + 13, 2, 2, d), WFR(x + 42, y + 13, 2, 2, d), WFR(x + 38, y + 18, 5, 1, RGB(0xc0, 0x50, 0x50)); break;
      case 3: WFR(x, y, 80, 34, d), WFR(x + 6, y + 4, 3, 4, a), WFR(x + 11, y + 4, 3, 4, a);
        for (i = 0; i < 3; i++) WFR(x + 14 + (i === 2 ? 10 : 0), y + 12 + i * 6, i === 2 ? 32 : 52, 2, WC_WHT); break;
      case 4: WFR(x, y, 80, 34, RGB(0xf0, 0xd8, 0xb0)), wvf_disk(x + 40, y + 20, 10, d);
        for (i = 0; i < 6; i++) WFR(x + 31 + (i / 2 | 0), y + 6 + i, 3, 1, d), WFR(x + 46 - (i / 2 | 0), y + 6 + i, 3, 1, d);
        WFR(x + 35, y + 18, 3, 3, RGB(0xc0, 0xf0, 0x60)), WFR(x + 43, y + 18, 3, 3, RGB(0xc0, 0xf0, 0x60)); break;
      case 5: WFR(x, y, 80, 34, RGB(0x10, 0x10, 0x28));
        for (i = 0; i < 8; i++) { const bh = 10 + (pc_h(h + i) % 20); WFR(x + i * 10, y + 34 - bh, 9, bh, RGB(0x30, 0x30, 0x58)); for (let k = 0; k < bh - 3; k += 4) WFR(x + i * 10 + 2 + (k & 4), y + 36 - bh + k, 2, 2, (pc_h(h + (i * 9 + k)) & 1) ? RGB(0xff, 0xd0, 0x60) : RGB(0x30, 0x30, 0x58)); }
        break;
      default: WFR(x, y, 80, 34, RGB(0xc8, 0x90, 0x60)), wvf_disk(x + 40, y + 18, 11, WC_WHT), wvf_disk(x + 40, y + 18, 8, RGB(0x70, 0x40, 0x20)),
        wvf_disk(x + 40, y + 18, 3, RGB(0xf0, 0xd0, 0xa0)), WFR(x + 51, y + 15, 5, 2, WC_WHT); break;
      }
    };
    const DM_HT = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    const dm_feedscr = (fx, fy, fw, fh) => {
      const PH = 58;
      WFR(fx, fy, fw, fh, RGB(0xf4, 0xf4, 0xf6));
      for (let q = -1; q < 3; q++) {
        const pidx = ((dm_feed / 3 | 0) / PH | 0) + q, y0 = fy + 10 + q * PH - ((dm_feed / 3 | 0) % PH);
        const h = ((pc_h(imul(pidx, 2654435761 | 0)) & ~(7 << 3)) | (((((pidx * 3) % 7) + 7) % 7) << 3)) >>> 0;
        let k, liked;
        if (y0 <= fy + (fh / 2 | 0) && fy + (fh / 2 | 0) < y0 + PH) dm_cpost = pidx;
        for (k = 0, liked = 0; k < 6; k++) if (dm_liked[k] === pidx) liked = 1;
        wvf_disk(fx + 6, y0 + 4, 3, (h & 2) ? RGB(0xe0, 0x50, 0x90) : RGB(0x60, 0x90, 0xf0)), WFR(fx + 12, y0 + 3, 18 + (h % 14), 2, RGB(0x40, 0x40, 0x48));
        WFR(fx + 74, y0 + 4, 1, 1, RGB(0x40, 0x40, 0x48)), WFR(fx + 76, y0 + 4, 1, 1, RGB(0x40, 0x40, 0x48)), WFR(fx + 78, y0 + 4, 1, 1, RGB(0x40, 0x40, 0x48));
        dm_photo(fx + 2, y0 + 9, h);
        if (((pidx % 3) + 3) % 3 === 2) {
          WFR(fx + 2 + 80 - 4 - 15, y0 + 9 + 34 - 4 - 10, 15, 10, WC_WHT);
          wf_text(fx + 2 + 80 - 4 - 13, y0 + 9 + 34 - 4 - 9, 0, 'AD', RGB(0x20, 0x20, 0x28));
        }
        if (pidx === dm_hpost && dm_heart) {
          const z = dm_heart > 10 ? 2 + ((14 - dm_heart) / 2 | 0) : 4, hx = fx + 42 - (z * 7 / 2 | 0), hy = y0 + 26 - z * 3;
          for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) if (DM_HT[r][c] === 'X') WFR(hx + c * z, hy + r * z, z, z, (dm_heart & 2) && dm_heart < 6 ? RGB(0xff, 0x90, 0xa0) : RGB(0xf0, 0x30, 0x50));
        }
        {
          const hc = liked ? RGB(0xf0, 0x30, 0x50) : RGB(0x40, 0x40, 0x48), hx = fx + 4, hy = y0 + 46;
          WFR(hx, hy, 2, 2, hc), WFR(hx + 3, hy, 2, 2, hc), WFR(hx, hy + 1, 5, 2, hc), WFR(hx + 1, hy + 3, 3, 1, hc), WFR(hx + 2, hy + 4, 1, 1, hc);
          ne_ring(fx + 13, hy + 2, 2, RGB(0x40, 0x40, 0x48)), wvf_pline(fx + 19, hy + 4, fx + 23, hy, RGB(0x40, 0x40, 0x48)), wvf_pline(fx + 19, hy, fx + 23, hy, RGB(0x40, 0x40, 0x48));
          WFR(fx + 76, hy, 4, 5, RGB(0x40, 0x40, 0x48)), WFR(fx + 77, hy + 1, 2, 3, RGB(0xf4, 0xf4, 0xf6));
        }
        WFR(fx + 4, y0 + 53, 20 + ((h >>> 5) % 20), 2, RGB(0x60, 0x60, 0x68));
      }
      WFR(fx, fy, fw, 9, WC_WHT), WFR(fx, fy + 9, fw, 1, RGB(0xd0, 0xd0, 0xd8));
      wf_text(fx + 3, fy + 1, 0, 'feed', RGB(0x20, 0x20, 0x28));
      WFR(fx + 66, fy + 3, 2, 2, RGB(0xf0, 0x30, 0x50)), WFR(fx + 69, fy + 3, 2, 2, RGB(0xf0, 0x30, 0x50)), WFR(fx + 66, fy + 4, 5, 2, RGB(0xf0, 0x30, 0x50)), WFR(fx + 67, fy + 6, 3, 1, RGB(0xf0, 0x30, 0x50));
      wvf_pline(fx + 74, fy + 6, fx + 80, fy + 2, RGB(0x20, 0x20, 0x28)), wvf_pline(fx + 74, fy + 2, fx + 80, fy + 2, RGB(0x20, 0x20, 0x28));
    };
    const dm_player = (fx, fy, fw, fh) => {
      let i;
      const sec = wf_secs();
      WFR(fx, fy, fw, fh, RGB(0x20, 0x24, 0x30));
      for (i = 0; i < 4; i++) WFR(fx + 2, fy + 2 + i * 2, fw - 4, 1, RGB(0xc0, 0xa0, 0x30));
      WFR(fx + 22, fy + 1, 40, 9, RGB(0x20, 0x24, 0x30)), wf_textc(fx + (fw / 2 | 0), fy + 2, 0, 'WINAMPFM', RGB(0xf0, 0xe0, 0x90));
      WFR(fx + 4, fy + 14, fw - 8, 40, C_BLACK), WFR(fx + 4, fy + 14, fw - 8, 1, RGB(0x60, 0x68, 0x80));
      wf_text(fx + 8, fy + 17, 1, fmt_int((sec / 60) >>> 0) + ':' + (sec % 60 < 10 ? '0' : '') + fmt_int(sec % 60), RGB(0x40, 0xf0, 0x60));
      wf_text(fx + 8, fy + 30, 0, playing ? '>' : 'II', RGB(0x40, 0xf0, 0x60));
      for (i = 0; i < 12; i++) {
        const real = playing || ev_lvl > 10, hh = clamp(real ? sp_s[(i * 19 / 12) >>> 0] : 8 + ((WV_SIN[((imul(wv_ph, 3 + i % 4) >>> 0) + i * 11) & 63] + WV_SIN[((imul(wv_ph, 5) >>> 0) + i * 23) & 63]) / 32 | 0), 0, 18);
        WFR(fx + 44 + i * 3, fy + 50 - hh, 2, hh, hh > 13 ? RGB(0xf0, 0x40, 0x30) : hh > 8 ? RGB(0xf0, 0xd0, 0x40) : RGB(0x40, 0xf0, 0x60));
      }
      const b = sel_name.slice(0, 13);
      wf_clx0 = fx + 5, wf_clx1 = fx + fw - 5;
      wf_text(fx + fw - ((wv_ph >>> 0) % ((wf_tw(0, b) + fw) >>> 0)), fy + 58, 0, b, RGB(0x40, 0xf0, 0x60));
      wf_clx0 = 0, wf_clx1 = 240;
      WFR(fx + 4, fy + 70, fw - 8, 3, RGB(0x40, 0x44, 0x58)), WFR(fx + 4 + ((sec % 60) * (fw - 14) / 60 | 0), fy + 69, 6, 5, RGB(0xc0, 0xa0, 0x30));
      for (i = 0; i < 5; i++) {
        const c = (i === 1 && playing) || (i === 2 && !playing) ? RGB(0x40, 0xf0, 0x60) : RGB(0xa0, 0xa8, 0xb8);
        WFR(fx + 5 + i * 15, fy + 80, 13, 10, RGB(0x50, 0x54, 0x68)), WFR(fx + 9 + i * 15, fy + 83, 5, 4, c);
      }
      for (i = 0; i < 10; i++) WFR(fx + 5 + i * 7, fy + 100, 5, 4, i < clamp(ev_lvl / 20 | 0, 0, 10) ? RGB(0x40, 0xf0, 0x60) : RGB(0x30, 0x34, 0x44));
    };
    const dm_word = (x, y) => {
      const s = 'DOOMSCROLL';
      for (let ci = 0; ci < s.length; ci++) {
        const c = s.charCodeAt(ci), w = WFM_W[c - 32];
        for (let r = 0; r < WFM_H; r++)
          for (let b = 0; b < w; b++)
            if ((WFM_ROWS[(c - 32) * 7 + r] >> (7 - b)) & 1) {
              const band = (ci * 2 + (b / 3 | 0)) % 19, lv = sp_s[band], on = lv > (WFM_H - r) * 2 || ((nk_mask >>> (ci * 2 + 1)) & 1);
              const col = !on ? RGB(0x50, 0x50, 0x80) : r < 2 ? RGB(0xff, 0xf0, 0x90) : r < 4 ? RGB(0xff, 0x70, 0xd0) : RGB(0x60, 0xe8, 0xff);
              WFR(x + b * 3, y + r * 3, 2, 2, col);
            }
        x += (w + 1) * 3;
      }
    };
    const DM_PS = [-4, 18, 2, 20, -4, 27, 4, 27], DM_PC = [RGB(0xff, 0x90, 0x60), RGB(0x70, 0xb0, 0xf0), RGB(0xe0, 0x80, 0xc0), RGB(0x60, 0xd0, 0xc0)];
    const v2_doom = () => {
      let i, y, k;
      for (y = 0; y < 180; y += 3) { const t = y * 255 / 180 | 0; WFR(0, y, 240, 3, RGB(0x70 + ((0xf0 - 0x70) * t / 255 | 0), 0x88 + ((0xb0 - 0x88) * t / 255 | 0), 0xe8 - ((0xe8 - 0xd0) * t / 255 | 0))); }
      for (i = 0; i < 22; i++) WFR(pc_h(i * 37) % 240, pc_h(i * 23) % 90, 2, 2, (nk_mask >>> (i % 27)) & 1 ? WC_WHT : RGB(0xc8, 0xc8, 0xff));
      wvf_disk(212, 44, 10, RGB(0xff, 0xf4, 0xc0)), wvf_disk(217, 40, 9, RGB(0x86, 0x9c, 0xe8));
      dm_cloud(40 + (((wv_ph / 3) >>> 0) % 300) - 60, 132, 10), dm_cloud(190 - (((wv_ph / 4) >>> 0) % 300) + 60, 120, 8);
      for (k = 0; k < 27; k++) if ((nk_on >>> k) & 1) {
        for (i = 0; i < 10; i++) if (!dm_b[i * 3 + 2]) { dm_b[i * 3 + 2] = k < 13 ? 1 : -1; dm_b[i * 3] = k < 13 ? -10 : 250; dm_b[i * 3 + 1] = 150 - k * 4; break; }
        dm_col = (dm_col + 1) % 6;
        if ((pc_h(wv_ph + k) & 3) === 0) for (i = 0; i < 8; i++) if (!dm_c[i * 3 + 2]) { dm_c[i * 3] = k < 13 ? -40 : 280; dm_c[i * 3 + 1] = 40 + (pc_h(k + wv_ph) % 80); dm_c[i * 3 + 2] = k < 13 ? 1 : -1; break; }
      }
      for (i = 0; i < 8; i++) if (dm_c[i * 3 + 2]) {
        dm_c[i * 3] = dm_c[i * 3] + dm_c[i * 3 + 2];
        if (dm_c[i * 3] < -60 || dm_c[i * 3] > 300) { dm_c[i * 3 + 2] = 0; continue; }
        dm_cloud(dm_c[i * 3], dm_c[i * 3 + 1], 6);
      }
      for (i = 0; i < 10; i++) if (dm_b[i * 3 + 2]) {
        const x = dm_b[i * 3], yy = dm_b[i * 3 + 1], f = (((wv_ph / 2) >>> 0) + i) & 1;
        dm_b[i * 3] = x + dm_b[i * 3 + 2] * 4;
        if (x < -20 || x > 260) { dm_b[i * 3 + 2] = 0; continue; }
        wvf_pline(x - 4, yy - 2 + f * 4, x, yy, RGB(0x30, 0x28, 0x50)), wvf_pline(x, yy, x + 4, yy - 2 + f * 4, RGB(0x30, 0x28, 0x50));
      }
      if (wvf_hit_n) { const sx = 200 - wvf_hit_n * 12; wvf_pline(sx, 30 + (5 - wvf_hit_n) * 5, sx + 10, 24 + (5 - wvf_hit_n) * 5, WC_WHT); }
      dm_word(32, 8);
      WFR(0, 180, 240, 60, RGB(0x2c, 0x2a, 0x48));
      WFR(0, 166, 240, 2, RGB(0x58, 0x58, 0x80));
      for (i = 4; i < 240; i += 22) WFR(i, 166, 2, 14, RGB(0x58, 0x58, 0x80));
      {
        const px = 168, py = 116, k2 = RGB(0x1c, 0x1a, 0x30);
        let swipe;
        if (nk_hand || nk_hon) dm_hand = 0; else if (dm_hand < 1000) dm_hand++;
        if (playing && !dm_was) dm_loop = 40;
        dm_was = playing;
        if (dm_loop) dm_loop--;
        const scroll = dm_hand < 16 || dm_loop > 0;
        if (nk_hon) dm_v = 9;
        if (scroll) dm_feed += 3 + dm_v; else dm_v = 0;
        if (dm_v > 0) dm_v--;
        for (k = 0; k < 27; k++) if ((nk_hon >>> k) & 1) {
          if (dm_tap[k] && ((fm1_ms - dm_tap[k]) >>> 0) < 320 && ((fm1_ms - dm_tap[k]) >>> 0) > 60) {
            dm_heart = 14, dm_hpost = dm_cpost, dm_tap[k] = 0;
            for (swipe = 5; swipe > 0; swipe--) dm_liked[swipe] = dm_liked[swipe - 1];
            dm_liked[0] = dm_cpost;
          } else dm_tap[k] = fm1_ms;
        }
        if (dm_heart) dm_heart--;
        const sc = scroll ? RGB(0xf0, 0xf0, 0xf4) : RGB(0x40, 0xe0, 0x60);
        fg_man(px, py + 58, 8, 1, DM_PS, k2);
        swipe = scroll ? ((dm_feed / 6 | 0) >>> 0) % 10 : 4;
        ne_line(164, 144, 151, 129, k2);
        {
          const fx = 22, fy = 40, fw = 84, fh = 112, sx = 146, sy = 121, o0 = cv_cx0, o1 = cv_cy0, o2 = cv_cx1, o3 = cv_cy1;
          WFR(sx - 1, sy - 1, 8, 12, k2);
          if (scroll) for (let q = 0; q < 4; q++) {
            const yy = sy + q * 4 - ((dm_feed / 3 | 0) % 4);
            WFR(sx, yy < sy ? sy : yy, 6, yy < sy ? 4 - (sy - yy) : (yy + 4 > sy + 10 ? sy + 10 - yy : 4), (q + (dm_feed / 12 | 0)) & 1 ? RGB(0xf4, 0xf4, 0xf6) : DM_PC[((q + (dm_feed / 12 | 0)) >>> 0) % 4]);
          } else { WFR(sx, sy, 6, 10, RGB(0x20, 0x24, 0x30)); for (let q = 0; q < 3; q++) WFR(sx + 1 + q * 2, sy + 9 - (sp_s[q * 6] / 4 | 0) - 1, 1, 1 + (sp_s[q * 6] / 4 | 0), RGB(0x40, 0xe0, 0x60)); }
          ne_line(170, 146, 152, 134 - swipe, k2);
          wvf_pline(sx, sy - 1, fx + fw, fy, WC_WHT), wvf_pline(sx, sy + 10, fx + fw, fy + fh, WC_WHT);
          WFR(fx - 3, fy - 3, fw + 6, fh + 6, k2);
          cv_cx0 = fx, cv_cy0 = fy, cv_cx1 = fx + fw, cv_cy1 = fy + fh;
          if (scroll) dm_feedscr(fx, fy, fw, fh); else dm_player(fx, fy, fw, fh);
          cv_cx0 = o0, cv_cy0 = o1, cv_cx1 = o2, cv_cy1 = o3;
        }
        wvf_disk(px - 4, py, 3, sc);
        WFR(px + 18, py + 52, 12, 8, k2), WFR(px + 18, py + 48, 4, 4, k2), WFR(px + 26, py + 48, 2, 3, k2), WFR(px + 29, py + 56, 6, 2, k2);
      }
    };

    /* ---- ROOM, FLOAT */
    const ne_room = () => {
      let r, k;
      for (r = 0; r < 34; r++) {
        const y = 30 + r * 3, band = r % 19, n = 2 + (wf_spec[band] / 3 | 0), sp = 1 + (r * 7) % 5, col = wf_spec[band] > 10 ? WC_WHT : RGB(0x90, 0x90, 0x98);
        for (k = 0; k < n; k++) {
          const len = 2 + (((r * 31 + k * 17) >>> 0) % 24), x = (((r * 53 + k * 89) + (imul(wv_ph, sp) >>> 0)) >>> 0) % 260 - 10;
          WFR(x, y, len, 1 + (k & 1), col);
        }
      }
      for (r = 0; r < 26; r++) {
        const y = 134 + (r * r / 6 | 0) + r, band = (33 - r) % 19, n = 1 + (wf_spec[band] / 4 | 0);
        for (k = 0; k < n; k++) {
          const len = (2 + (((r * 29 + k * 13) >>> 0) % 30)) * (r + 4) / 10 | 0, x = (((r * 61 + k * 97) + (imul(wv_ph, 2 + (r / 4 | 0)) >>> 0)) >>> 0) % 280 - 20;
          WFR(x, y, len, 1 + (r / 9 | 0), wf_spec[band] > 10 ? RGB(0xc0, 0xc0, 0xc8) : RGB(0x50, 0x50, 0x58));
        }
      }
      WFR(0, 133, 240, 1, RGB(0x30, 0x30, 0x34));
      {
        const w2 = 16 + (sp_s[3] / 2 | 0) + (WV_SIN[(wv_ph * 2) & 63] / 40 | 0);
        for (r = 0; r < 6; r++) { const l = 0x50 - r * 10 + sp_s[r * 3] * 2; WFR(120 - w2 + r * 2 + (WV_SIN[(wv_ph * 3 + r * 9) & 63] / 50 | 0), 140 + r, 2 * (w2 - r * 2), 1, RGB(l, l, l + 8)); }
      }
      const F = RGB(0x46, 0x46, 0x52), B = RGB(0x06, 0x06, 0x08);
      wvf_disk(120, 98, 6, F), WFR(112, 103, 16, 24, F), WFR(114, 125, 12, 18, F);
      WFR(110, 105, 20, 18, F);
      wvf_disk(120, 98, 5, B);
      WFR(113, 104, 14, 22, B), WFR(115, 126, 4, 16, B), WFR(121, 126, 4, 16, B);
      WFR(111, 106, 3, 16, B), WFR(126, 106, 3, 16, B);
      WFR(112, 142, 18, 8, RGB(0x10, 0x10, 0x14));
    };
    let fl_ph = 0, fl_rot = 0;
    const ne_float = () => {
      let i, k;
      fl_ph += 2 + clamp(ev_lvl / 50 | 0, 0, 5), fl_rot += 1;
      WFR(0, 0, 240, 240, RGB(0x08, 0x10, 0x30));
      wvf_disk(120, 120, 90, RGB(0x10, 0x20, 0x58)), wvf_disk(120, 120, 56, RGB(0x20, 0x38, 0x90)), wvf_disk(120, 120, 28, RGB(0x50, 0x70, 0xd0));
      for (i = 0; i < 90; i++) {
        const an = (i * 97 + ((fl_rot / 3 | 0) >>> 0)) >>> 0, d0 = ((i * 53 + (fl_ph >>> 0)) >>> 0) % 130, d1 = d0 + 4 + (d0 / 8 | 0);
        const col = i % 3 === 0 ? WC_WHT : i % 3 === 1 ? RGB(0x90, 0xb0, 0xff) : RGB(0x40, 0x70, 0xf0);
        wvf_pline(120 + (d0 * wv_sin4(an + 64) / 127 | 0), 120 + (d0 * wv_sin4(an) / 127 | 0), 120 + (d1 * wv_sin4(an + 64) / 127 | 0), 120 + (d1 * wv_sin4(an) / 127 | 0), col);
      }
      for (k = 0; k < 2; k++) {
        const sw = 20 + clamp(ev_lvl / 12 | 0, 0, 14), x = 120 + ((k ? sw : -sw) * WV_SIN[(((fl_rot >>> 0) / 2 >>> 0) + 16) & 63] / 127 | 0);
        const y = 110 + (WV_SIN[(wv_ph + k * 20) & 63] * 6 / 127 | 0) + ((k ? -1 : 1) * WV_SIN[((wv_ph / 2) >>> 0) & 63] / 20 | 0);
        const c = RGB(0x08, 0x0c, 0x24);
        wvf_disk(x, y - 28, 6, c);
        WFR(x - 6, y - 21, 12, 24, c);
        ne_line(x - 3, y + 3, x - 6 + k * 2, y + 30, c), ne_line(x + 3, y + 3, x + 6 + k * 2, y + 28, c);
        ne_line(k ? x - 6 : x + 6, y - 18, 120, y - 6, c);
        ne_line(k ? x + 6 : x - 6, y - 18, k ? x + 16 : x - 16, y - 2, c);
        if (!k) WFR(x - 8, y - 4, 16, 10, c);
      }
    };

    /* ---- DUEL */
    const du_x = [64, 176];
    let du_att = -1, du_t = 0, du_who = 0, du_clash = 0, du_var = 0, du_lt = 99, du_rt = 99;
    const DU_DP = [[-6, 18, 12, 6, -8, 27, 8, 27], [-12, 4, 20, 2, -12, 24, 16, 24], [-10, 10, 22, 0, -10, 26, 10, 26], [-10, -4, 6, -10, -6, 27, 6, 27]];
    const DU_SW = [[22, -40], [32, -8], [44, -4], [10, -30]];
    const du_man = (x, fy, dir, pose, hair, refl) => {
      const s = refl ? -9 : 9, hx = x + (dir * DU_DP[pose][2] * 9 / 8 | 0), hy = fy - (48 * s / 8 | 0) + (DU_DP[pose][3] * s / 8 | 0);
      const body = refl ? RGB(0x60, 0x60, 0x68) : RGB(0x14, 0x18, 0x24), sw = refl ? RGB(0x90, 0x90, 0x98) : WC_WHT;
      fg_man(x, refl ? fy + 1 : fy, s, dir, DU_DP[pose], body);
      if (!refl) WFR(x - 7, fy - 62, 14, 3, hair);
      ne_line3(hx, hy, hx + dir * DU_SW[pose][0], hy + (DU_SW[pose][1] * s / 9 | 0), sw);
    };
    const ne_duel = () => {
      let i, k;
      const fy = 170, bob = ((imul(wv_ph, clamp(BPM, 40, 240)) >>> 0) / 600 >>> 0) & 1;
      WFR(0, 0, 240, fy, RGB(0x7c, 0x7c, 0x80)), WFR(0, fy, 240, 90, RGB(0x4c, 0x4c, 0x50));
      for (i = 0; i < 5; i++) WFR(30 + i * 48, 0, 1, fy, RGB(0x68, 0x68, 0x6c));
      WFR(0, fy, 240, 1, RGB(0x40, 0xa0, 0x90));
      {
        const lf = du_x[0] < du_x[1] ? 0 : 1;
        du_lt = nk_low(nk_on) ? 0 : du_lt + 1, du_rt = nk_high(nk_on) ? 0 : du_rt + 1;
        if (!du_clash && du_att < 0) {
          if (du_lt < 4 && du_rt < 4) du_clash = 1, du_lt = du_rt = 99;
          else if (du_lt === 0) du_att = lf, du_t = 0, du_var = pc_h(wv_ph) % 4;
          else if (du_rt === 0) du_att = lf ^ 1, du_t = 0, du_var = pc_h(imul(wv_ph, 3)) % 4;
          else if (wvf_hit_n === 5) { du_att = du_who; du_who ^= 1; du_t = 0; }
        }
      }
      if (du_clash) {
        const lf = du_x[0] < du_x[1] ? 0 : 1, c = du_clash++;
        if (c < 4) du_x[lf] += (96 - du_x[lf]) / 2 | 0, du_x[lf ^ 1] += (144 - du_x[lf ^ 1]) / 2 | 0;
        else if (c < 10) {
          const cy = fy - 60, r = 6 + (c - 4) * 6;
          for (k = 0; k < 10; k++) { const an = k * 26 + c * 7; ne_line(120, cy, 120 + (r * wv_sin4(an + 64) / 127 | 0), cy + (r * wv_sin4(an) / 127 | 0), k & 1 ? RGB(0xff, 0xe0, 0x80) : WC_WHT); }
          ne_ring(120, cy, (r / 2 | 0) + 4, WC_WHT);
        } else du_x[lf] += (64 - du_x[lf]) / 2 | 0, du_x[lf ^ 1] += (176 - du_x[lf ^ 1]) / 2 | 0;
        if (c > 14) du_clash = 0, du_x[lf] = 64, du_x[lf ^ 1] = 176;
      }
      if (du_att >= 0) {
        const a = du_att, o = a ^ 1, dir = du_x[o] > du_x[a] ? 1 : -1;
        du_t++;
        if (du_t < 4) du_x[a] += dir * (du_var === 1 ? 26 : du_var === 3 ? 40 : 34);
        if (du_t === 3) du_x[o] += dir * 14;
        if (du_t >= 2 && du_t < 7) {
          const cx = (du_x[a] + du_x[o]) / 2 | 0, cy = fy - (du_var === 2 ? 14 : du_var === 3 ? 70 : 44), r = 24 + du_t * 5;
          const base = du_var === 1 ? 140 : du_var === 2 ? (dir > 0 ? 200 : 40) : (dir > 0 ? 180 : 0);
          for (k = 0; k < 12; k++) { const an = base + k * 6; ne_line(cx + (r * wv_sin4(an + 64) / 127 | 0), cy + ((du_var === 1 ? r : r / 2 | 0) * wv_sin4(an) / 127 | 0), cx + (r * wv_sin4(an + 70) / 127 | 0), cy + ((du_var === 1 ? r : r / 2 | 0) * wv_sin4(an + 6) / 127 | 0), du_var === 3 ? RGB(0xff, 0xe0, 0x90) : WC_WHT); }
          for (k = 0; k < 6; k++) { const an = k * 43 + du_t * 9; wvf_pline(cx, cy, cx + ((8 + du_t * 3) * wv_sin4(an + 64) / 127 | 0), cy + ((8 + du_t * 3) * wv_sin4(an) / 127 | 0), WC_WHT); }
          for (k = 0; k < 4; k++) wvf_disk(du_x[a] - dir * (6 + k * 7), fy - 2 - k, 3 - (k / 2 | 0), RGB(0xe8, 0xe8, 0xe8));
        }
        if (du_t > 10) du_att = -1;
        du_x[0] = clamp(du_x[0], 30, 210), du_x[1] = clamp(du_x[1], 30, 210);
        if (du_t > 10 && (du_x[1] - du_x[0] < 60 && du_x[0] - du_x[1] < 60)) { du_x[0] = du_x[0] < du_x[1] ? 64 : 176; du_x[1] = du_x[0] === 64 ? 176 : 64; }
      }
      for (k = 0; k < 2; k++) {
        const dir = du_x[k ^ 1] > du_x[k] ? 1 : -1;
        let pose = du_clash ? (du_clash < 10 ? 1 : 3) : du_att === k ? (du_t < 4 ? 1 : 2) : du_att === (k ^ 1) && du_t >= 3 && du_t < 7 ? 3 : 0;
        const lift = du_att === k && du_var === 3 && du_t < 6 ? 30 - (du_t - 3) * (du_t - 3) * 3 : du_att === k && du_var === 2 ? -10 : 0;
        if (du_att === k && du_var === 1 && pose === 2) pose = 1;
        du_man(du_x[k], fy - (pose === 0 ? bob : 0) - (lift > 0 ? lift : 0) + (lift < 0 ? 4 : 0), dir, pose, k ? RGB(0xe8, 0xe8, 0xf0) : RGB(0xf0, 0x50, 0x90), 0);
        du_man(du_x[k], fy, dir, pose, 0, 1);
      }
    };

    /* ---- the videos as pixel art: a whole frame, then each one's changes, decoded into wv_mem (4 bits a pixel) */
    let vp_on = 0xFF, vp_t = 0;
    const VP_AT = (n) => (wv_mem[n >> 1] >> ((n & 1) << 2)) & 15;
    const vp_decode = (c, f) => {
      let d = c.off[f], n = 0;
      const N = c.w * c.h, D = c.data;
      while (n < N) {
        const b = D[d++], idx = b >> 4;
        let run = (b & 15) + 1;
        if (run === 16) run = 16 + D[d++];
        if (n + run > N) run = N - n;
        if (idx !== 15) for (let k = n; k < n + run; k++) wv_mem[k >> 1] = k & 1 ? (wv_mem[k >> 1] & 0x0F) | idx << 4 : (wv_mem[k >> 1] & 0xF0) | idx;
        n += run;
      }
    };
    const vp_paint = (clip, y0, hh) => {
      if (clip >= VP.length) return;
      const c = VP[clip], z = 240 / c.w | 0;
      for (let y = y0 / z | 0; y < c.h && y * z < y0 + hh; y++)
        for (let x = 0; x < c.w;) {
          const v = VP_AT(y * c.w + x);
          let x1 = x + 1;
          while (x1 < c.w && VP_AT(y * c.w + x1) === v) x1++;
          WFR(x * z, y * z, (x1 - x) * z, z, c.pal[v]);
          x = x1;
        }
    };
    /* LOFI STUDY */
    let lf_cur = -1, lf_hold = 0, lf_quiet = 0, lf_lp = 0, lf_look = 0, lf_once = 0;
    const lf_goto = (c, f) => { if (f === lf_cur) return; if (f === lf_cur + 1) vp_decode(c, f); else for (let i = 0; i <= f; i++) vp_decode(c, i); lf_cur = f; };
    const lf_step = () => {
      const c = VP[0];
      if (!c) return;
      const play = nk_mask || playing, per = (1000 * 120 / (6 * (playing ? clamp(BPM, 40, 240) : 120))) >>> 0;
      if (vp_on !== 0) vp_on = 0, lf_cur = -1, lf_goto(c, 0), vp_t = fm1_ms, lf_look = 0;
      lf_quiet = play ? 0 : lf_quiet + 1;
      if (play) lf_once = 0;
      lf_lp = playing && !nk_hand && !lf_look ? lf_lp + 1 : 0;
      if (!lf_look && ((lf_lp >= 80) || (lf_quiet >= 20 && !lf_once))) lf_look = 1, lf_hold = 0, lf_once = play ? 0 : 1, lf_lp = 0;
      if (lf_look && nk_hand) lf_look = 0;
      if (lf_look) {
        if (lf_cur < 8) { lf_goto(c, 8); vp_t = fm1_ms; return; }
        if (lf_cur < 10) { if (((fm1_ms - vp_t) >>> 0) >= 160) { vp_t = fm1_ms; lf_goto(c, lf_cur + 1); } return; }
        if (++lf_hold === (play ? 20 : 40)) lf_goto(c, 11);
        else if (lf_hold > (play ? 24 : 44)) lf_look = 0, lf_goto(c, 0), vp_t = fm1_ms;
        return;
      }
      if (!play) return;
      if (lf_cur >= 8) lf_goto(c, 0);
      if (((fm1_ms - vp_t) >>> 0) >= per) { vp_t = fm1_ms; lf_goto(c, (lf_cur + 1) % 8); }
    };
    /* RACCOON: in its round frame, turned */
    let rc2_cur = -1, rc2_ang = 0;
    const rc2_goto = (c, f) => { if (f === rc2_cur) return; if (f === rc2_cur + 1) vp_decode(c, f); else for (let i = 0; i <= f; i++) vp_decode(c, i); rc2_cur = f; };
    const rc2_paint = (y0, hh) => {
      const c = VP[1];
      if (!c) return;
      const R = 119, C = wv_sin4(rc2_ang + 64), S = wv_sin4(rc2_ang), half = c.w / 2 | 0;
      for (let y = y0; y < y0 + hh; y++) {
        const dy = y - 120, row = (y - y0) * 240;
        let hw = 0;
        while ((hw + 1) * (hw + 1) + dy * dy <= R * R) hw++;
        if (!hw) continue;
        let u = ((half << 16) + ((-hw) * C + dy * S) * 172) | 0, v = ((half << 16) + (hw * S + dy * C) * 172) | 0;
        const du = C * 172, dv = -S * 172;
        for (let x = 120 - hw; x <= 120 + hw; x++, u = (u + du) | 0, v = (v + dv) | 0) {
          const uu = (u >> 16) >>> 0, vv = (v >> 16) >>> 0;
          if (uu < c.w && vv < c.h) cv_px[row + x] = c.pal[VP_AT(vv * c.w + uu)];
        }
      }
    };
    const rc2_step = () => {
      const c = VP[1];
      if (!c) return;
      const play = nk_mask || ev_lvl > 12 || playing, per = (1000 * 120 / (c.fps * (playing ? clamp(BPM, 40, 240) : 120))) >>> 0;
      if (vp_on !== 1) vp_on = 1, rc2_cur = -1, rc2_goto(c, 0), vp_t = fm1_ms;
      rc2_ang -= play ? 4 + (wv_bass() / 6 | 0) : 2;
      if (!play) { rc2_goto(c, 0); return; }
      if (((fm1_ms - vp_t) >>> 0) >= per) { vp_t = fm1_ms; rc2_goto(c, rc2_cur >= 8 || rc2_cur < 1 ? 1 : rc2_cur + 1); }
    };

    /* ---- wvf_step / wvf_paint: the whole screen's picture, 20 fps */
    const wvf_step = () => {
      wv_w = WVF_N, wv_h = WVF_N;
      if (!wvf_on || last_mode !== gv) {
        wvf_on = 1, last_mode = gv, vp_on = 0xFF;
        wv_mem.fill(0);
        for (let i = 0; i < 56; i++) wvf_new(i, 0);
      }
      nk_step(), nc_spec();
      if (gv < 4) { wv_draw(gv); return; }
      wv_ph = (wv_ph + 1) >>> 0;
      wvf_hits();
      switch (gv) {
      case GV_RACER: case GV_DRIVE: rd_step(); break;
      case GV_SHIP: sh_step(); break;
      case GV_WATER: ne_hist(16, 19); break;
      case GV_STUDY: lf_step(); break;
      case GV_RACCOON: rc2_step(); break;
      case GV_ORB: orb_step(); break;
      case GV_TAPE: v2_tape_step(); break;
      case GV_CURVES: {
        for (let x = 39; x > 0; x--) for (let c = 0; c < 6; c++) wv_mem[x * 6 + c] = wv_mem[(x - 1) * 6 + c];
        for (let c = 0; c < 6; c++) wv_mem[c] = ((wf_spec[c * 3] + wf_spec[c * 3 + 1] + wf_spec[c * 3 + 2]) / 3) >>> 0;
        break;
      }
      default: break;
      }
    };
    const wvf_paint = (fb) => {
      let y0 = 0;
      while (y0 < 240) {
        const hh = 240 - y0 < 123 ? 240 - y0 : 123;
        cv_begin(240, hh, C_BLACK);
        cv_ox = 0, cv_oy = -y0;
        wf_rx = 0, wf_ry = y0, wf_rw = 240, wf_rh = hh;
        if (gv < GV_SHIP) wvf_cells(y0, hh);
        else switch (gv) {
        case GV_SHIP: sh_draw(0, 0, 240, 240, 3, 1); break;
        case GV_RACER: v2_racer(); break;
        case GV_DRIVE: v2_drive(); break;
        case GV_SYNTH: v2_synth(); break;
        case GV_WATER: ne_waterfall(); break;
        case GV_CURVES: ne_curves(); break;
        case GV_FLOW: v3_flow(); break;
        case GV_PATCH: v4_patch(); break;
        case GV_TARGET: v4_tesseract(); break;
        case GV_BLUEPRINT: v3_blueprint(); break;
        case GV_NEO: v2_neo(); break;
        case GV_SMOKE: v2_smoke(); break;
        case GV_DOOM: v2_doom(); break;
        case GV_ROOM: ne_room(); break;
        case GV_FLOAT: ne_float(); break;
        case GV_HOUND: v3_hound(); break;
        case GV_BOXER: v3_boxer(); break;
        case GV_CHORDS: v5_chords(); break;
        case GV_DANCE: ne_dance(); break;
        case GV_DUEL: ne_duel(); break;
        case GV_STUDY: vp_paint(0, y0, hh); break;
        case GV_RACCOON: rc2_paint(y0, hh); break;
        case GV_ORB: orb_paint(); break;
        case GV_TAPE: v2_tape(); break;
        default: break;
        }
        cv_ox = 0, cv_oy = 0;
        fb.set(cv_px.subarray(0, 240 * hh), y0 * 240);
        y0 += hh;
      }
    };

    /* ---- one call of the host: wfm_draw_'s whole-screen branch */
    const frame = (Ain, fb) => {
      A = Ain;
      scope_buf = A.scope_buf || scope_buf, scope_bufr = A.scope_bufr || scope_bufr, scope_w = (A.scope_w >>> 0);
      fm1_ms = (A.ms >>> 0), playing = A.playing ? 1 : 0, BPM = clamp(Math.round(+A.bpm || 120), 40, 240);
      sel_name = typeof A.name === 'string' && A.name ? A.name.toUpperCase() : 'SAMPLER';
      preset = (A.preset >>> 0) || 0;
      g_filt = A.filt !== undefined ? clamp(A.filt | 0, -64, 63) : 0;
      for (let k = 0; k < 4; k++) { p_send[k] = A.fx ? clamp(A.fx[k] | 0, 0, 127) : 0; p_mute[k] = A.mute ? (A.mute[k] ? 1 : 0) : 0; }
      if (A.hits) for (const h of A.hits) { pend_keys |= 1 << key_of_note(h.note | 0); pend_dr |= 1 << lane_of_note(h.note | 0); }
      if (A.kick) pend_dr |= 1;
      const now = fm1_ms;
      if (playing && !wf_was_play) wf_t0 = now;
      if (first || ((now - wf_t_lcd) >>> 0) >= 40) { wf_t_lcd = now; wf_spectrum(); }
      if (first || ((now - wf_t_vz) >>> 0) >= 50) { wf_t_vz = now; wvf_step(); wvf_paint(fb); }
      first = 0;
      wf_was_play = playing;
    };
    return { frame };
  }

  for (let m = 0; m < 28; m++) {
    const name = GV_NAME[m];
    V.add({
      id: 'wfm-win-' + name.toLowerCase().replace(/ /g, '-'), name, fam: 'winampFM janela', w: 240, h: 240,
      init(S) { S.e = mk(m); },
      draw(S, A) { if (!S.e) S.e = mk(m); S.e.frame(A, S.fb); }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
