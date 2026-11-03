(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,67385,56082,64235,e=>{"use strict";var t=e.i(20394);let o=`// Stave p5 viz — Pitchwheel
const ROOT_FREQ = 440 * pow(2, (36 - 69) / 12)
function setup() {
  createCanvas(300, 200)
  pixelDensity(window.devicePixelRatio || 1)
}
function freq2angle(f) { return 0.5 - (log(f / ROOT_FREQ) / log(2) % 1) }
function circPos(cx, cy, r, a) {
  const rad = a * TWO_PI
  return [sin(rad) * r + cx, cos(rad) * r + cy]
}
// Hz from a hap: a written freq, else the pitch the engine read from the note
// (h.midi, Strudel's own note grammar — a sketch cannot import a parser, #1929).
function hapFreq(h) {
  if (typeof h.freq === 'number') return h.freq
  if (typeof h.midi === 'number') return 440 * pow(2, (h.midi - 69) / 12)
  return null
}
function draw() {
  clear()
  if (!stave.scheduler) return
  const now = stave.scheduler.now()
  let haps = stave.scheduler.query(now - 0.01, now + 0.01)
  haps = haps.filter(h => h.begin <= now && h.end > now)
  const sz = min(width, height), r = sz / 2 - 12
  const cx = width / 2, cy = height / 2
  noStroke(); fill(117, 186, 255, 64)
  for (let i = 0; i < 12; i++) {
    const a = freq2angle(ROOT_FREQ * pow(2, i / 12))
    const [x, y] = circPos(cx, cy, r, a)
    circle(x, y, 7)
  }
  noFill(); stroke(117, 186, 255, 48); strokeWeight(1)
  circle(cx, cy, r * 2)
  for (const h of haps) {
    const freq = hapFreq(h)
    if (freq == null) continue
    const a = freq2angle(freq)
    const [x, y] = circPos(cx, cy, r, a)
    const c = h.color ?? '#75baff'
    stroke(c); strokeWeight(2)
    line(cx, cy, x, y)
    fill(c); noStroke()
    circle(x, y, 12)
  }
}`,s=`// Stave p5 viz — Spiral
function setup() {
  createCanvas(300, 200)
  pixelDensity(window.devicePixelRatio || 1)
  noFill()
}
function xySpiral(rot, margin, cx, cy, rotate) {
  const a = ((rot + rotate) * 360 - 90) * PI / 180
  return [cx + cos(a) * margin * rot, cy + sin(a) * margin * rot]
}
function draw() {
  clear()
  if (!stave.scheduler) return
  const now = stave.scheduler.now()
  const haps = stave.scheduler.query(now - 2, now + 1)
  const cx = width / 2, cy = height / 2
  const sz = min(width, height) * 0.38, mg = sz / 3
  for (const h of haps) {
    const active = h.begin <= now && h.end > now
    const from = h.begin - now + 3, to = h.end - now + 3 - 0.005
    const op = max(0, 1 - abs((h.begin - now) / 2))
    const c = color(h.color ?? (active ? '#75baff' : '#8a919966'))
    c.setAlpha(op * 255)
    stroke(c); strokeWeight(mg / 2); strokeCap(ROUND)
    beginShape()
    for (let a = from; a <= to; a += 1/60) {
      const [x, y] = xySpiral(a, mg, cx, cy, now)
      vertex(x, y)
    }
    endShape()
  }
  stroke(255); strokeWeight(mg / 2)
  beginShape()
  for (let a = 2.98; a <= 3; a += 1/60) {
    const [x, y] = xySpiral(a, mg, cx, cy, now)
    vertex(x, y)
  }
  endShape()
}`,a=`// Stave p5 viz — Pitchwheel
const ROOT_FREQ = 440 * pow(2, (36 - 69) / 12)
function setup() {
  createCanvas(300, 200)
  pixelDensity(window.devicePixelRatio || 1)
}
function freq2angle(f) { return 0.5 - (log(f / ROOT_FREQ) / log(2) % 1) }
function circPos(cx, cy, r, a) {
  const rad = a * TWO_PI
  return [sin(rad) * r + cx, cos(rad) * r + cy]
}
// Hz from a hap. Strudel leaves note as a NAME string and freq null until
// superdough renders, so parse the note name to MIDI ourselves (h.freq is null
// here — relying on it leaves every note stuck at the default pitch).
function hapFreq(h) {
  if (typeof h.freq === 'number') return h.freq
  let n = h.note
  if (typeof n === 'string') {
    const m = n.toLowerCase().match(/^([a-g])(b|#)?(-?\\d+)$/)
    if (!m) return null
    const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]]
    n = (parseInt(m[3]) + 1) * 12 + base + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0)
  }
  if (typeof n !== 'number') return null
  return 440 * pow(2, (n - 69) / 12)
}
function draw() {
  clear()
  if (!stave.scheduler) return
  const now = stave.scheduler.now()
  let haps = stave.scheduler.query(now - 0.01, now + 0.01)
  haps = haps.filter(h => h.begin <= now && h.end > now)
  const sz = min(width, height), r = sz / 2 - 12
  const cx = width / 2, cy = height / 2
  noStroke(); fill(117, 186, 255, 64)
  for (let i = 0; i < 12; i++) {
    const a = freq2angle(ROOT_FREQ * pow(2, i / 12))
    const [x, y] = circPos(cx, cy, r, a)
    circle(x, y, 7)
  }
  noFill(); stroke(117, 186, 255, 48); strokeWeight(1)
  circle(cx, cy, r * 2)
  for (const h of haps) {
    const freq = hapFreq(h)
    if (freq == null) continue
    const a = freq2angle(freq)
    const [x, y] = circPos(cx, cy, r, a)
    const c = h.color ?? '#75baff'
    stroke(c); strokeWeight(2)
    line(cx, cy, x, y)
    fill(c); noStroke()
    circle(x, y, 12)
  }
}`,r=`// Stave p5 viz — Pitchwheel
const ROOT_FREQ = 440 * pow(2, (36 - 69) / 12)
function setup() {
  createCanvas(300, 200)
  pixelDensity(window.devicePixelRatio || 1)
}
function freq2angle(f) { return 0.5 - (log(f / ROOT_FREQ) / log(2) % 1) }
function circPos(cx, cy, r, a) {
  const rad = a * TWO_PI
  return [sin(rad) * r + cx, cos(rad) * r + cy]
}
function draw() {
  background(9, 9, 18)
  if (!stave.scheduler) return
  const now = stave.scheduler.now()
  let haps = stave.scheduler.query(now - 0.01, now + 0.01)
  haps = haps.filter(h => h.begin <= now && h.end > now)
  const sz = min(width, height), r = sz / 2 - 12
  const cx = width / 2, cy = height / 2
  noStroke(); fill(117, 186, 255, 64)
  for (let i = 0; i < 12; i++) {
    const a = freq2angle(ROOT_FREQ * pow(2, i / 12))
    const [x, y] = circPos(cx, cy, r, a)
    circle(x, y, 7)
  }
  noFill(); stroke(117, 186, 255, 48); strokeWeight(1)
  circle(cx, cy, r * 2)
  for (const h of haps) {
    const note = typeof h.note === 'string' ? 60 : (h.note ?? 60)
    const freq = 440 * pow(2, (note - 69) / 12)
    const a = freq2angle(freq)
    const [x, y] = circPos(cx, cy, r, a)
    const c = h.color ?? '#75baff'
    stroke(c); strokeWeight(2)
    line(cx, cy, x, y)
    fill(c); noStroke()
    circle(x, y, 12)
  }
}`,n=`// Stave p5 viz — Spiral
function setup() {
  createCanvas(300, 200)
  pixelDensity(window.devicePixelRatio || 1)
  noFill()
}
function xySpiral(rot, margin, cx, cy, rotate) {
  const a = ((rot + rotate) * 360 - 90) * PI / 180
  return [cx + cos(a) * margin * rot, cy + sin(a) * margin * rot]
}
function draw() {
  background(9, 9, 18)
  if (!stave.scheduler) return
  const now = stave.scheduler.now()
  const haps = stave.scheduler.query(now - 2, now + 1)
  const cx = width / 2, cy = height / 2
  const sz = min(width, height) * 0.38, mg = sz / 3
  for (const h of haps) {
    const active = h.begin <= now && h.end > now
    const from = h.begin - now + 3, to = h.end - now + 3 - 0.005
    const op = max(0, 1 - abs((h.begin - now) / 2))
    const c = color(h.color ?? (active ? '#75baff' : '#8a919966'))
    c.setAlpha(op * 255)
    stroke(c); strokeWeight(mg / 2); strokeCap(ROUND)
    beginShape()
    for (let a = from; a <= to; a += 1/60) {
      const [x, y] = xySpiral(a, mg, cx, cy, now)
      vertex(x, y)
    }
    endShape()
  }
  stroke(255); strokeWeight(mg / 2)
  beginShape()
  for (let a = 2.98; a <= 3; a += 1/60) {
    const [x, y] = xySpiral(a, mg, cx, cy, now)
    vertex(x, y)
  }
  endShape()
}`,i=[{id:"prism",name:"Prism",renderer:"glsl",files:[{relPath:"Prism.glsl",content:`// "Prism" — after "Creation" by Danilo Guanabara, made audio-reactive for Stave.
// http://www.pouet.net/prod.php?which=57245
// If you intend to reuse this shader, please add credits to 'Danilo Guanabara'.
// iChannel0: row 0 (y=0.0) = FFT magnitude.
#define t iTime
#define r iResolution.xy

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    float bass   = texture(iChannel0, vec2(0.03, 0.0)).x;
    float mid    = texture(iChannel0, vec2(0.30, 0.0)).x;
    float treble = texture(iChannel0, vec2(0.65, 0.0)).x;
    vec3 c;
    float l, z = t;
    for (int i = 0; i < 3; i++) {
        vec2 uv, p = fragCoord.xy / r;
        uv = p;
        p -= .5;
        p.x *= r.x / r.y;
        z += .07 + bass * .08;                                  // bass drives the zoom
        l = length(p);
        uv += p / l * (sin(z) + 1.) * abs(sin(l * 9. - z - z))
            * (1. + treble * 1.4);                              // treble ripples the warp
        c[i] = .01 / length(mod(uv, 1.) - .5);
    }
    vec3 col = c / l;
    col = mix(col, col.gbr, mid * .6);                          // mids swirl the hue
    fragColor = vec4(col * (.6 + bass * 1.7), 1.0);             // bass brightens
}
`,language:"glsl"}],thumbnail:"data:image/png;base64,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"},{id:"pulse-grid",name:"Pulse Grid",renderer:"glsl",files:[{relPath:"Pulse Grid.glsl",content:`// "Pulse Grid" — pattern-event reactive cells. An original Stave shader.
// Reacts to PATTERN EVENTS (uKick/uSnare/uHat/uRms), not the raw spectrum.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 g  = uv * vec2(8.0, 5.0);
  vec2 cell = fract(g) - 0.5;
  vec2 id   = floor(g);

  // Per-cell random phase so the grid never pulses uniformly.
  float phase = fract(sin(dot(id, vec2(12.9, 78.2))) * 43758.5);
  float d   = max(abs(cell.x), abs(cell.y));
  float box = smoothstep(0.46, 0.40, d);

  vec3 col = vec3(0.02, 0.02, 0.05);
  col += vec3(1.0, 0.3, 0.2) * uKick  * box * (0.4 + 0.6 * step(id.x, 3.0)); // kick → left red
  col += vec3(0.3, 0.6, 1.0) * uSnare * box * step(2.0, id.y);               // snare → top blue
  col += vec3(1.0)           * uHat   * box * (0.3 + 0.7 * phase);           // hat  → scattered white
  col += box * uRms * 0.25 * (0.5 + 0.5 * sin(iTime * 3.0 + phase * 6.28));  // loudness → breathing
  fragColor = vec4(col, 1.0);
}
`,language:"glsl"}],thumbnail:"data:image/png;base64,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"},{id:"night-drive",name:"Night Drive",renderer:"glsl",files:[{relPath:"Night Drive.glsl",content:`// night_drive — a city at night from the side window of a moving car, through rain on the glass.
// Beyond the glass everything is flat light: a band of out-of-focus city lights drifting past, a wide bar
// of light that crosses on the kick, thin streaks that answer the hi-hats. The car is moving: everything
// slides towards the back of the car, the near lights much faster than the far ones, and now and then a
// street lamp close to the road washes across the whole glass. On the glass, real rain: every drop is a small lens with a
// bright rim, and the running ones leave a beaded track.
const float RAIN  = 0.6;     // how wet the glass is, 0 to 1
const float CITY  = 36.0;    // lights in the city band
const float SPEED = 1.0;     // how fast the city goes by
const float GLOW  = 1.0;     // how bright the whole picture is
const float WIND  = 0.75;    // how far the car's speed pushes the running drops back as they fall

// a city at night
const vec3 RED    = vec3(1.00, 0.20, 0.12);
const vec3 ORANGE = vec3(1.00, 0.48, 0.14);
const vec3 YELLOW = vec3(1.00, 0.86, 0.30);
const vec3 GREEN  = vec3(0.28, 0.92, 0.62);
const vec3 WHITE  = vec3(0.90, 0.93, 1.00);
const vec3 TEAL   = vec3(0.030, 0.095, 0.115);  // the sky, high on the glass
const vec3 EMBER  = vec3(0.060, 0.022, 0.020);  // the road's glow, low on the glass

float h1(float n) { return fract(sin(n * 91.345) * 47453.5453); }
float h2(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
vec3 lamp(float pick) { return pick < 0.30 ? RED : pick < 0.55 ? ORANGE : pick < 0.80 ? YELLOW : pick < 0.92 ? GREEN : WHITE; }

// one light, out of focus: a flat disc, a touch brighter at its rim
float disc(vec2 uv, vec2 at, float r) {
  float d = length(uv - at);
  return smoothstep(r, r * 0.84, d) * (0.70 + 0.30 * smoothstep(r * 0.5, r, d));
}

// everything beyond the glass. \`focus\` is 1 for the blurred world and small inside a drop, which is a lens
vec3 world(vec2 uv, float focus) {
  float t = iTime * SPEED;
  float loud = smoothstep(0.02, 0.30, uRms);
  vec3 col = mix(EMBER, TEAL, smoothstep(-0.45, 0.45, uv.y)) * (0.8 + 0.5 * uBass);
  // the city: a band of small lights high on the glass, sliding back past the window — the far ones barely
  // move, the near ones go by eight times as fast
  for (float i = 0.0; i < CITY; i++) {
    float depth = h1(i * 1.7);
    float x = (fract(h1(i) - t * (0.012 + 0.090 * depth * depth)) - 0.5) * 2.6;
    float y = 0.27 + (h1(i * 5.3) - 0.5) * (0.10 + 0.16 * depth) + 0.05 * sin(x * 2.0 + 1.0);
    float r = (0.010 + 0.034 * depth * depth) * focus + 0.002;
    float twinkle = 0.60 + 0.40 * sin(t * (1.0 + 2.0 * h1(i * 7.1)) + i);
    col += lamp(h1(i * 9.3)) * disc(uv, vec2(x, y), r) * twinkle * (0.20 + 0.34 * (1.0 - depth) + 0.30 * loud);
  }
  // a few big, faint ones close to the lens, top and bottom, that the kick swells
  for (float i = 0.0; i < 5.0; i++) {
    float x = (fract(h1(i + 40.0) - t * (0.11 + 0.06 * h1(i + 50.0))) - 0.5) * 2.8;
    float y = (i < 3.0 ? 0.36 : -0.34) + (h1(i + 60.0) - 0.5) * 0.14;
    col += lamp(h1(i + 70.0)) * disc(uv, vec2(x, y), (0.075 + 0.05 * h1(i + 80.0) + 0.018 * uKick) * (0.35 + 0.65 * focus)) * (0.07 + 0.10 * loud + 0.06 * uKick);
  }
  // long thin trails of light through the city, like a slow shutter
  for (float i = 0.0; i < 3.0; i++) {
    float y = 0.20 + 0.07 * i + 0.012 * sin(uv.x * 3.0 + t * 0.4 + i * 2.0);
    float along = fract(uv.x * 0.35 + t * (0.09 + 0.05 * i) + h1(i + 90.0));
    col += mix(RED, YELLOW, h1(i + 91.0)) * smoothstep(0.004 * focus + 0.0015, 0.0, abs(uv.y - y)) * smoothstep(0.0, 0.5, along) * smoothstep(1.0, 0.8, along) * 0.22;
  }
  // a street lamp close to the road: every few seconds one goes by, a big soft disc high on the glass that
  // throws a wash of amber across everything and is gone in half a second
  for (float i = 0.0; i < 2.0; i++) {
    float turn = fract(t / (3.7 + 2.3 * i) + 0.4 * i), pass = turn / 0.16;
    if (pass > 1.0) continue;
    float x = mix(1.9, -1.9, pass);
    col += ORANGE * 0.22 * disc(uv, vec2(x, 0.40), 0.05 + 0.15 * focus);
    col += mix(ORANGE, YELLOW, 0.3) * 0.085 * exp(-(uv.x - x) * (uv.x - x) / 0.30) * smoothstep(-0.7, 0.5, uv.y);
  }
  // one wide bar of light, leaning, that crosses the glass and flares on the kick
  vec2 lean = normalize(vec2(-0.26, 1.0));
  float across = dot(uv, lean) - (fract(t * 0.045) - 0.5) * 1.5;
  float bar = smoothstep(0.075, 0.068, abs(across));
  float kick = uKick * uKick * (3.0 - 2.0 * uKick);
  col += mix(vec3(0.35, 0.80, 0.85), mix(YELLOW, ORANGE, smoothstep(0.2, 1.1, uv.x)), smoothstep(-0.9, 0.3, uv.x)) * bar * (0.035 + 0.15 * kick);
  // thin teal streaks the other way, on the hi-hats
  vec2 steep = normalize(vec2(1.0, -0.34));
  for (float i = 0.0; i < 3.0; i++) {
    float off = dot(uv, steep) + (fract(h1(i + 20.0) + t * (0.05 + 0.03 * i)) - 0.5) * 2.4;
    float seg = smoothstep(0.42, 0.30, abs(uv.y - (h1(i + 30.0) - 0.5) * 0.4));
    col += vec3(0.25, 0.85, 0.90) * smoothstep(0.006, 0.002, abs(off)) * seg * (0.06 + 0.40 * max(uHat, uTreble));
  }
  return col * GLOW;
}

// the water on the glass: x = how thick it is there (0 on dry glass), y = where a running drop has wiped the mist
vec2 water(vec2 uv, float t) {
  float thick = 0.0, wiped = 0.0;
  // still drops in three sizes, none quite round; each sits a while, dries, and another lands elsewhere.
  // The treble brings out more of the small ones.
  for (float layer = 0.0; layer < 3.0; layer++) {
    float cells = 4.5 + 5.5 * layer;
    vec2 g = uv * cells + layer * 17.3, id = floor(g), f = fract(g) - 0.5;
    float seed = h2(id + layer * 31.0), pace = t * (0.025 + 0.045 * seed) + seed * 9.0;
    float age = fract(pace);
    float there = step(1.0 - RAIN * (0.34 + 0.12 * layer) - 0.12 * uTreble * layer, h2(id + 7.7 + floor(pace)));
    vec2 d = f - (vec2(h2(id + 1.3), h2(id + 2.9)) - 0.5) * 0.55;
    float lumpy = 1.0 + 0.07 * sin(atan(d.y, d.x) * 2.0 + seed * 40.0) + 0.04 * sin(atan(d.y, d.x) * 3.0 + seed * 70.0);
    float size = (0.07 + 0.19 * h2(id + 4.1) * h2(id + 4.1)) * lumpy * smoothstep(0.0, 0.04, age) * smoothstep(1.0, 0.75, age);
    float p = clamp(1.0 - dot(d, d) / max(size * size, 1e-5), 0.0, 1.0);
    thick = max(thick, there * pow(p, 0.65) * (0.55 + 0.45 * size / 0.32));
  }
  // running drops: a heavy head that sticks, lets go, and slides; behind it a track of beads that shrink and dry.
  // The wind of the car's speed pushes them towards the back as they fall, so their tracks lean across the glass.
  vec2 q = vec2(uv.x - WIND * uv.y, uv.y);
  for (float layer = 0.0; layer < 2.0; layer++) {
    float lanes = 6.0 + 5.0 * layer;
    float lane = floor(q.x * lanes), seed = h1(lane + layer * 53.0);
    if (seed > 0.10 + 0.40 * RAIN) continue;
    float fall = t * (0.10 + 0.16 * seed) + seed * 11.0;
    float headY = mix(0.60, -0.60, fract(fall + 0.22 * sin(fall * 6.2831)));
    float x = (fract(q.x * lanes) - 0.5) / lanes - 0.016 * sin(uv.y * 11.0 + seed * 40.0) - (h1(lane + 9.0) - 0.5) * 0.06;
    float up = uv.y - headY;                                             // how far above the head we are
    vec2 d = vec2(x, up * (up > 0.0 ? 0.62 : 1.0));                      // the head is longer above than below
    float size = 0.022 + 0.014 * seed;
    thick = max(thick, pow(clamp(1.0 - dot(d, d) / (size * size), 0.0, 1.0), 0.65));
    float behind = step(0.0, up) * smoothstep(0.50, 0.0, up);
    wiped = max(wiped, behind * smoothstep(size * 0.9, size * 0.4, abs(x)));
    vec2 b = vec2(x + 0.004 * sin(floor(uv.y * 38.0) * 9.0 + seed * 5.0), (fract(uv.y * 38.0) - 0.5) / 38.0);
    float bead = size * 0.36 * behind * step(0.45, h1(floor(uv.y * 38.0) + lane)) * (0.4 + 0.6 * h1(floor(uv.y * 38.0) + lane + 3.0));
    thick = max(thick, 0.7 * pow(clamp(1.0 - dot(b, b) / max(bead * bead, 1e-6), 0.0, 1.0), 0.65));
  }
  return vec2(thick, wiped);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  // the slope of the water bends the view: steep at a drop's edge, flat in its middle, so each drop holds
  // a small picture of the world turned over
  float e = 1.5 / iResolution.y;
  vec2 w = water(uv, iTime);
  vec2 slope = vec2(w.x - water(uv + vec2(e, 0.0), iTime).x, w.x - water(uv + vec2(0.0, e), iTime).x);
  slope = slope / max(1.0, length(slope) / 0.45);
  float wet = smoothstep(0.0, 0.10, w.x);
  // dry glass is misted: the world is out of focus. Water is clear, and a track where a drop has run is half clear.
  vec3 col = world(uv - slope * 0.55, mix(mix(1.0, 0.55, w.y), 0.14, wet));
  col += vec3(0.012, 0.016, 0.020) * (1.0 - wet) * (1.0 - 0.7 * w.y);            // the mist itself
  col *= 1.0 + 0.35 * wet;                                                       // water lets more light through
  col *= 1.0 - 0.30 * wet * smoothstep(0.25, 0.45, length(slope));               // a drop is a little darker where it turns away from us
  vec3 n = normalize(vec3(slope * 3.0, 1.0));
  col += wet * 0.55 * pow(max(0.0, dot(n, normalize(vec3(-0.35, 0.55, 0.75)))), 60.0) * (0.25 + 0.75 * smoothstep(0.0, 0.5, uv.y + 0.5)); // a glint near the top of each
  col += wet * vec3(0.045, 0.060, 0.070) * smoothstep(0.30, 0.45, length(slope)) * smoothstep(0.0, 1.0, -n.y + 0.2);                                          // and a thin bright lower rim
  col *= 1.0 - 0.30 * dot(uv * vec2(0.55, 1.0), uv * vec2(0.55, 1.0));           // the corners of the glass fall away
  fragColor = vec4(pow(col, vec3(0.92)), 1.0);
}
`,language:"glsl"}],thumbnail:"data:image/png;base64,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"},{id:"tunnel",name:"Tunnel",renderer:"glsl",files:[{relPath:"Tunnel.glsl",content:`// tunnel — a slow glide down a panelled tunnel.
// Every panel is a meter for its own band of the spectrum, and the kick lights a few outright.
// The small dashes grow and multiply with the treble. The camera nods on each kick like a head
// keeping time; the bass breathes the walls; the rings ride the spectrum.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

const float SECTORS = 26.0;   // panels around the tunnel
const float SPEED = 1.5;      // tunnel lengths per second
const float TAU = 6.2831853;

// palette: Stave's own violet in a dark tunnel
const vec3 WALL   = vec3(0.085, 0.045, 0.200);  // deep indigo
const vec3 BRUSH  = vec3(0.050, 0.028, 0.110);
const vec3 VIOLET = vec3(0.486, 0.486, 1.000);  // the studio's accent
const vec3 PINK   = vec3(1.000, 0.300, 0.620);
const vec3 LILAC  = vec3(0.800, 0.700, 1.000);  // rings and panel ends
const vec3 CREAM  = vec3(1.000, 0.910, 0.780);  // strips and dashes
const vec3 MINT   = vec3(0.350, 1.000, 0.760);  // the odd dash, and the wires
const vec3 AMBER  = vec3(1.000, 0.600, 0.280);  // a few of the strips

// one tile of the wall: its colour times how brightly it is lit (rgb), from the sector it sits in and the
// place along the tunnel. Lit by its own band of the spectrum; a few by the kick; a few always faintly on.
vec4 tile(float s, float z) {
  s = mod(s, SECTORS);
  float len = 0.5 + 2.2 * hash(vec2(s, 3.0));
  float cz = z / len + hash(vec2(s, 9.0)) * 7.0;
  float c = floor(cz);
  float id = hash(vec2(s, c));
  float band = texture(iChannel0, vec2(0.01 + 0.6 * hash(vec2(s, c + 40.0)), 0.0)).x;
  float e = 1.7 * band * band
          + step(1.0 - (0.05 + 0.14 * uKick), id) * (0.30 + 0.75 * uKick)
          + step(0.70, id) * 0.20;
  vec3 tint = mix(VIOLET, PINK, step(0.5, hash(vec2(c, s + 4.0))));
  return vec4(tint * e, fract(cz));
}

// a thin line at the start of each cell, the same width on screen at any depth
float line(float f, float w) { return 1.0 - smoothstep(w, w * 1.6 + 0.004, min(f, 1.0 - f)); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  float t = iTime;

  // camera: the vanishing point sits right of centre and above it, sways, and bobs like a head
  vec2 eye = vec2(0.78 + 0.09 * sin(t * 0.19), 0.22 + 0.05 * sin(t * 0.27));
  float nod = uKick * uKick * (3.0 - 2.0 * uKick);    // the kick, eased so the nod has weight
  eye.y -= 0.13 * nod;                                // head bob: down on the kick, back up as it fades
  eye.x += 0.035 * sin(t * 3.14159);             // and a sway from side to side, one way per beat
  vec2 p = uv - eye;
  p *= 1.0 - 0.035 * nod;                        // leaning in a little as it nods
  float roll = 0.08 * sin(t * 0.17) + 0.045 * sin(t * 3.14159) * (0.4 + 0.6 * nod);  // the head tilts with the sway
  p = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * p;

  float r = length(p);
  float a = atan(p.y, p.x) / TAU + 0.5;          // 0..1 around the tunnel
  float z = 0.55 / max(r, 0.001) + t * SPEED;    // position along the tunnel
  float near = clamp(r * 2.2, 0.0, 1.0);         // detail fades toward the vanishing point

  // panels: one per sector, each with its own length along the tunnel
  float sa = a * SECTORS;
  float sec = floor(sa), fa = fract(sa);
  float len = 0.5 + 2.2 * hash(vec2(sec, 3.0));
  float cz = z / len + hash(vec2(sec, 9.0)) * 7.0;
  float cell = floor(cz), fz = fract(cz);
  float id = hash(vec2(sec, cell));

  // dark steel-blue wall, brushed along the tunnel
  float streak = hash(vec2(floor(a * 1400.0), 1.0));
  float brush = hash(vec2(floor(a * 300.0), floor(z * 2.0)));
  vec3 wall = (WALL * (0.20 + 0.55 * streak) + BRUSH * brush * 0.7) * (0.75 + 0.6 * uBass);
  wall *= 0.75 + 0.5 * hash(vec2(sec, 17.0));
  vec3 col = wall;

  // every tile is a lamp: it glows with its own band of the spectrum, inset from its neighbours by a dark
  // seam, brightest down its middle, and its light spills over the seam onto the tiles beside it
  vec4 t0 = tile(sec, z);
  float inset = smoothstep(0.03, 0.10, fa) * smoothstep(0.03, 0.10, 1.0 - fa)
              * smoothstep(0.015, 0.06, fz) * smoothstep(0.015, 0.06, 1.0 - fz);
  float core = 0.50 + 0.50 * sin(3.14159 * fa);
  float heat = dot(t0.rgb, vec3(0.34));
  col += t0.rgb * inset * core * (0.60 + 0.40 * streak);
  col += vec3(1.0, 0.92, 1.0) * heat * heat * inset * core * core * 0.35;      // the hottest tiles whiten at the core
  vec3 spill = t0.rgb * (1.0 - inset) * 0.55
             + tile(sec - 1.0, z).rgb * exp(-fa * 4.5)
             + tile(sec + 1.0, z).rgb * exp(-(1.0 - fa) * 4.5);
  col += spill * 0.42 * near;

  // rings, close together: each rides a band of the spectrum
  float rz = z * 3.0;
  float ring = floor(rz);
  float band = texture(iChannel0, vec2(0.02 + 0.55 * hash(vec2(ring, 5.0)), 0.0)).x;
  float heavy = step(0.80, hash(vec2(ring, 7.0)));
  float rw = 0.025 + 0.045 * heavy + 0.14 * band * band;
  float gap = step(0.25, hash(vec2(ring, floor(a * 40.0))));          // rings are broken, not solid
  float rl = line(fract(rz), rw) * near * mix(1.0, gap, 0.7);
  col += LILAC * rl * (0.07 + 0.14 * heavy + 0.9 * band);
  col += LILAC * line(fz, 0.03) * 0.14 * near;         // panel end caps

  // greebles: dashes on the panels at two sizes; the treble switches more of them on
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    vec2 g = vec2(a * SECTORS * (5.0 + 9.0 * fk), z * (3.0 + 5.0 * fk));
    vec2 gi = floor(g), gf = fract(g);
    float along = step(0.5, hash(gi + 11.0));                          // lies along the tunnel, or across it
    // each dash listens to its own band: it stretches and brightens with it, and the treble adds more
    float gb = texture(iChannel0, vec2(0.25 + 0.7 * hash(gi + 5.0), 0.0)).x;
    float grow = 0.55 + 0.9 * max(gb, uTreble);
    vec2 half_ = (along > 0.5 ? vec2(0.10, 0.30) : vec2(0.28, 0.12)) * vec2(1.0, grow);
    half_ = min(half_, vec2(0.48));
    float box = step(abs(gf.x - 0.5), half_.x) * step(abs(gf.y - 0.5), half_.y);
    float on = step(1.0 - (0.08 + 0.05 * fk + 0.16 * uTreble), hash(gi));
    vec3 gcol = mix(CREAM, MINT, step(0.7, hash(gi + 23.0)));
    col += gcol * box * on * near * (0.30 + 1.1 * max(gb, uTreble) + 0.25 * uKick);
  }

  // radial ribs between panels: white strips on some seams, hairlines on the rest
  float rib = hash(vec2(sec, 21.0));
  float wide = step(0.60, rib);
  float ribW = mix(0.022, 0.06 + 0.11 * rib, wide);                    // as a share of the sector
  float ribs = (1.0 - smoothstep(ribW, ribW + 0.02 + 0.01 / (r + 0.05), min(fa, 1.0 - fa))) * near;
  float notch = step(0.12, fract(z * (1.5 + 3.0 * rib) + rib * 9.0));  // strips are segmented
  vec3 steel = mix(CREAM, AMBER, 0.7 * step(0.86, rib)) * (0.85 + 0.15 * streak) * (0.95 + 0.45 * uKick);
  col = mix(col, steel, ribs * mix(0.35, 0.92 * notch, wide));
  // a few mint wires
  float wire = step(0.84, hash(vec2(sec, 33.0)));
  float wl = (1.0 - smoothstep(0.012, 0.03 + 0.012 / (r + 0.05), abs(fa - 0.5))) * wire * near;
  col = mix(col, MINT, wl * (0.75 + 0.5 * uKick));

  col *= smoothstep(0.03, 0.75, r);               // the far end stays black
  col *= 1.0 - 0.6 * smoothstep(0.75, 2.1, length(uv));  // and the corners fall away into the dark
  col = col / (1.0 + 0.45 * col);                 // soft shoulder so nothing clips flat
  fragColor = vec4(col, 1.0);
}
`,language:"glsl"}],thumbnail:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAABACAYAAADS1n9/AAAQAElEQVR4AVT9B6ymWZrfh/3OeeOXvxu+m0OlW7m6u7qnu6d7ZnrSzs7ucrjcvJK44nIXMk1x4QRCIAwLhi3asAEBBASYgiDLtkjYK1oWVqRJU8udDZNnO053dVd1VVcOt26+98vhjf6/X68E6N4+9aYTnvP8/08451TN2AutS/ml1uX8heWX8pdWXslfWXs1/8Laa/nrG2/kr65/Mf/ixpv5a+uv519YfzV/beOLKq/nb576Uv6V02/lXz3zNV2/ouc3df/V/Lfe/Jv577z1+/nvfPX389/9+t/Jf+8b/37+P/3W/yL/uz//v8p//62/m//atV/Pv735rfybK1/Lv7Hy1fxry1/Jv7785fwby2/lX15+Pf93v/qr+R/82r+T/+Yb385/7tyb+TeX38h/Ye3L+XfWv5b/2qlv5b+8oevpb+X/1tnv5L+z9Sv5b5/9xfzf2frl/HfO/0r+m7r/t859J/+ts7+Q//2v/17+H/31/2X+W2d+If+NUz+f/723/mb+7TNfzf/gV38n/7b6+fry1zT2W/lbGvurkuGNxS/mX175av6tjb+Wf2X9m/nvffPv5/+7v/cf5//Hf/C/zf/JP/5P8l/9+j/Ir1/47fzquV/OX7v2+/mLF//t/OXLv5X/7m/83fy/+i/+Uf7y1W/nl7/wN/Ivvvgb+bmVt/L//X/w9/P/8h/+nfx/9p1v568tvZr/6ovfyX/+9F/L/4Nf+5X8P/0P/738//Qf/p/zv/O7/0X+B//wn+V/8O//Yf63/vY/zv/j/+h/nb/56t/Kr137rfyi5nf1F34jP7P5jXxj9Uv55tpb+WsvfSO/dO7n86++/nv5m6/8jp5/J79+9dfzqxe/nZ9e/2p+WrrZXPtK/vK1b+T/9q99J/+Nv/7X8vOa84WzP5e/eOXXVfc38xfe+NX84rd+Kb+89a38xUu/mL90+W/kdm1hg6XWBqVSFRxDlMekeTot2V9drXEJbIg1Ft8GpFlGUSfJE71zKHsVykEV3yuRmxzHOuRk+I5Dov6SNGIcjYmjmOGkjzGonaHklnCth7GWmttk+7NDPvnxQzZW1tm6vMn6tSUSPyfWOON0gjUunvEYRF3G6Uj9hxiNlGQRdb+m7xbX8Xn8ZIe7dx7SbNSplStsP35ONQu59Zf3Wb2gd82Kpvp5X7na+5KhUpEcfsqr17/KxvoGaS/ksxtjMvX9zW/PkmkOruY+mrRp1GZJM8PP/dwWqP3G2jz97QN2D3b1lPOnf3oLt75Ia9YjzzOOj3sYA65rcFxfbRMcx3LfuU2eZPhZn8EgJZp4eLUQI72RWXzX0ZwcPAeO22OSxEzH8L0ys405qpUSgV+nUqlrnFzvQq5cqqkevPvBAZPJQPrwSNIxk4URsTsh2NYYbqD3AUk0xI6iCdVamYsXzrO2eJqza5fZWN3CD0tTMkw08Vxgpio5TP8sSQDX+jjG08SswBjTnG3p2aHmNUSIKoFTIs5SfNcjlgCxBmsPDyiIA1aKgkHSwxNgwV8VzwkIRKLb7z7js3efknTghVe32HxpmcjJGCdjhvFQbUIRwaUrMIq+QqcsoFKVhIpbwbUuoVvmsHPE2ukV5svzGI1Y90scfNqhMgcLmw0cAV8U4xmiQcSbX3qL5twMNrUMOh3ufPI+/6//+w/4p//5D/A0Hz+sYIzh1KmGwF3iH/9nH+F5Ht/5xWsaM9D8PawN2Nntk7glVpfKemcxOJp3husYsIY4LhOENWpxQ/cTZpoRJycRk7jL+KBH+OUZJnc7NBpVLp0/xcpSRXMTMWQonnS/f7jLUWeXwKuy2FpmbXmTlcUZvvByU/05vP+zIxE2weIyGavPCxH+oYfZjZF9kiWxwB9Qq2XYXIo56XZ4ur1LIosvSm6gNbfCuY2rnNm4xOLSBm7gE8kaomxCmiVqlWOMwRpLzZcyHUf3ME6HRLJWx3GpBnUCW8LJPQbjPjYDY1NyE03rGbXNySlI0RPaoetTluIc4xB6Ffp7CR//+AG7Usba2SV5hEWoOvQKD5BM+NwbxXTGmnCuT16NcTKk7ISgfqtenYd3nzHJx7z+xevMhTPURYLRs5jxeDD1BoENSKOE61/4Co4p0+8d8Wz3ATc+/Alu7tDe65LbCf/e/+QFmo2Q0A+48ek9+sMx40lEtxcJqBKzs6XPia7xC6sfj2PCsAA+lyg5NnAotG+NqJi1QMo4HZ8HDDONmI9vDdBLPUFyV3MoeRwedjk+OWRnP6VRb4pA/vR7Kq/a7pxwcHLAaDSUkeVUK4vcuetw4+aYIKirrkcWpKSnNO7POkTDnuqFpMkIZJjnLwScPhNKDAO5hDLWkXVnZH9FgkQgp3K96JvnBawsnOLC6RfYWNmiObdA5uR/RYgYIx/lCHAryyus2BeQmdqmEnQkhWRJipf7Aqw8LbH6btaqrK7KFJ2EgjTWuJ8TUMIhSUI3FCCOLLpONjIc3e2xd79HpV7mzIubePM+fXmVRPV9J6QAvhd3/kqJVmBMcK2DNQ4OHh99cEu9Sg7J6BjN8zglH8Da5RpffPWbzM8tURC7c3TEp5+8wyjuqV2Op/Yz68s8fLjDX//FDfx6lVK9wda/+yU8p8L3vrdNppD41pcuYYyL71WlT/jszh69QYy1Rs85qQghG5m66nYnI7EJcb9LMmzLTiGZWHzfwb9SJTv+vF0g0lzYWqdZbxJFkt0VWaXXPBehNI/RcEAYdGSgfWrVWV5+4WXmZhbVTwXvdANbcUk/a5PGCVk8JpI3WF42XHsxUJ2c/d2B5LMCRlZn1SHGSlhDpt/cQA4UJChKLDBTkcMPStQVAwvvcPHcdRZaqxR1hwUY+p6QULTzJaxRf56UMpr0GIw68gxjKc2TlddIJy77Ox3Fp4QzZ1ap1VyMkxHnEal6iLNYY8f4jkdJ7twXIby0zHg35enNA7E84NT1VZxZh5FcWqpYa3DU30TjTAjVxuQWVyTwjIc6V98Z42zMjDxBzS8z3B+Qd6u8/NXzWJOzv/1cHuNTXMntYKhUAwLjMri7x3f/9Uca0/DqxVmSkzE779/Ck0wffbxLt5vwgvIVa12NPQTJcevmMz64m+EGLuWwyvz8Ir3RIruHLYpcyMsc8knO4kKkcUfMyKPNNDxsNGJpJmQ4SFhfnZEUVYbDCZ48Yib95iqO40/BObVR5ty5gJ29jOFowN7+UARoka5nhGMfp53hYLHSTbWSc/FiiVbL5eR4xGc32+w9GGATk8pFJlPlZBIdNXBsgKuSkpMZoz8NkmR6TUSEaSEVQBnNZotoEtM5OGFn+xntTpv2oMNgMgQ1Kq5JnOLpF/1Iz6ycaRKKndVKharX5ODpQK43IlNCtLYxTxCi3mPJFDMpiKAnq75CTdxVCd2qkq4xz24cU6lU2XhpAWfGJyJmksak8jB9hYlEbV2Bn0sBRVvPetNwVczTGMPq3BovvfAau7c6lJpj9g8eSrFWBPAxmm2/25uSoOqEVES+/+s//jNefW1B3iLg+IPHDMeHWMfh5qf7fHZvn7XVJrVqjdOnzrO5cZrXX1/nF3/uFb75rZ9nffMsrdkxCyspL169Rng+YHFmjnG3xujQUJdQ8/IkK89gtHsij1tnOIT3P3qM71clD/oxWM1BboRTGxWuXK7z6Z2UZ8/HZEXeYkfsz+2zHrVwIpfAr+ErRzm3NcOlq7M4ruH2x0c8u90j7wuTwpM0ZjyqDYtyL1SDVIqJ5GbGivc5hdodrKzQsSHW+qSgkks9OYVUEzF3IGVPitxAii6U1jk64WjvgCePH9Lun3A8OKIX9XFkIQWg2/ePiEcJ49GY1E649tppAglQC5u0lagMR7FYy9Sa4qQvUMfyKynDaebvUYBZ0uQCATPZsTz76Jg0ztm8vkxtrUY/HTCIR/IGIub4mHE6EbCGghCeZLCuxXUDrrz0Og1fiu53eO9P3iV3xqxIWZ4TYKUHRwpqt4/IpA+5LPzI8M//+Uf89m9fJtN8vSIxVPmL7z9ifnae3/ntr/Otr/0iszNNfvyXNzRexrD3Gf/NH/0/efud73F0vE9nkPLBJzf44PgDukpS18/uc2r5MucvXeHkekVZ+ZCG8XGUwY/aCUZZmjFGpI4wxpIr5G3K8q9dqSnZi7Q6gJISysP8gInygbXuMjMzy/JclnrV5Stf3WC+VWbnWZ+b7x6S93J8Y/AwlJX8y+Nk5GmC52aypoRSTaWaU6wK3VJO6uSyRKaWOJF7NtbFsYGKhBQh+r0eqRSV5KnqxWSixzARACqxLHHYHWETj5Jbx6h+QYC2st1YEwFH3iPlzvtP1UcsoEe0NLlqqU6ohG6utDxtU7jnkdrkIuUgHoBx5PaHlESaAqhAmX/ag0fvScF7Qy68vsXylRbHkzYSjeKPUTKgpNUC+rEq1669glcusXP4jO7uLvl4RNjz6e/0OPvKvLLrRc0l4zd/++flzY4kaYIfWB58+IgP3r/Hr/7KZayUeOb0Br/723+byaiCsR3++f/vj3j7g58o/g/oTCCrhuAJOA+iJKHd8YjiIedOLvDg0ad88rN9Pnrn+9zsf8b5D11WV0/TXBMpRyVygT9TbXJ+S3rQnBMR+fy5OteuNPjJ2xPiuEQpqDA+NcEOMw6fPqfXO9GKpsdic4H1dYenT9p8IuAPH/YJTY6ruVccH2tS0n5fISdyJHzAaOgy6OeMB2aakGRphmNjkSKjUk8o1XPCqpl6ikyxeiLNjvJYMTUC46gYcpDSDIipicAfp2MmyUgJ1ZCekqpEbar+DM1gESsSZWoXizhH0TGuCcgzw86jE5QgMxZgRXJYcjVJt8ZMaQHreFJ5QmciJssqB6oTS4ZUpazlUdVvaE1d4uG7+3SfTTh1dZPmuRo9JaJpKteqa2fcxrgezfllvMAoMLm0j49kAAGh3jtZRrQXE7ZyZhozfP+77/HLf+PnNI8xsZKukuq88xefMRkmfOWLX2RxrsW//ON/zT/7b/8NiXKRr311kzQbqST80b/4kP7eMZPpHkjEswPDcJSSlMEZppzbiqhID8USueONeLr7kEcHe9SbZ9i6eBFPRjBWeL3z2VMyzffqpYZCS0Xgj3HdJta3jJaGOPcmuIlFKT61SocgOBLnItq7JQ7uDfEUWl2hU7IunkgQa6WmmCESONhz506zsLhAqVRja+ssc3NzmoiRZXpEYuGo7yohkdBjMALIFfhhJaHWTESMHBOk1GZr5LKOcZ7JTUckGgyBC1ZATvRk5BdyJiJEX0QoPMlI92otK25QC1pEItxYk5x6iIkm4ZY0iYKpRu1G+j5G/KHsN5U31ClygUQJ3SBqE8sdj2UdqcZ3NK7vBMqwYf9Ol852xPzGDOX1kEhL0PnlOVY3z0mejINn+9z/9AYTZchF26EUU1Vmnx9nWGXqr3xpi8zEfPdf/ViK84iLMRRatrQ0nhzPK4R0+Mm7f6Zl2n2WWiu88/4OR0d9gSXPqbks2IidwwAAEABJREFUKZ/xQ4fcGHw/YGE2pdMda1NsQFfLOGtHPLq9zXAGSp/1iDTBidvn7uPHeFrKnT2zRap+YoXZSskoYaxojAhrKoxXhsSNMeWdEJsaHNPnhRd9qvWYQXeIqyRzPmzS3GxJdiPrtxj1hXSUq8QyvEw5kn30ZI/jkz5aqfHw0QEn2nEKwzpb585gHAGgTNeaGmnmMx4bRgOXSb/EqOcSaWmTSiHVSsDScoPT5+bZPNui0Wrg1UrEXsJYA/XkBTLZbm4s1noMZYkYq7AyoSMAx/qOdbDWJywADubpytX3VG8iT5KoD1ftcjIQdLEAt6rfCOcJvSolhQCUAPbVVyxvMBExQi+k6tcxkSdvkHDyZMji6RYjP+HCyxempDk62aewzlyKD51AuUWZURrJW3WZtCNM23D+wjrVVglX1uPbgLPnL7Fxap3bn77H/+0/+y5vfLFFfW2RR08f8/HN51y7usjG6grLS2t41JRctnjhlTdFwtO4fkXxucK5hTPUq4E2msb4RpKPBwwGfWZPz9IZOLSHfT669aGIk3H21FleuDJLudLgvQ9j6XkBlizu0xRvX42V75w9HfDq603iUcbNnx5w8rSNkeeYv7xKc2QV+myhfZHEIddvKuBDzceVsSjK5GJsIgKMSRRjc1VNlBM8fLwrjByMcbGOh+uV8YMGQdjEuj5IYVlW5+h4wtNnRzx+cMjTh11ODsd4bsKcsvLNzQUuXFvnyvUzzK3PkQUeIydWtp4xkDVlRhNxQmIxsid3XoSNQdzXDl/hAWr4AtZ1KlSCOfqy0gKcSGQoiOQZV95lOC1YSzWYIZCMuQiQKFlsj0801YxIZCjCQ92fYeezE1Zqlznpaoz8gFsP36ej5Wmu8YeKy8WSs+KWNV4NTZ6HN5/y+MM9vIlhdqXE+uZpTq1u8fbbf8qzp5/S067dRGFhMRjIsBIcU9dqpszrXzjNcf+YH779AQf9CT+88QEfP3rArecRT5+f8P7uuzx5+gnnljdYP3eW0AbEDty5/5yxciMr/Q6VWH9y5yMRKZMxLireewTVKs8rh0RPTghsiXIAb7xZoVxJuX3o8+hnx5S1eeVq3T8Zt+l/+oR6bYYUI3xjCosPjEPZKYPqZTlY3YEqGOviCFS3sHjrg95lUnaqxC+WQpMCMD3nBqzjY1WnNxgSBLOEpXkJsYjjVeiPYg4OEu3Hd7glBX7ys4c8+FTLpUxs3mpy/fpZrr9+kauvnmX+zDxDTbwrRo60fBsWBDQOhQKOoiPGChOFWz7WTp91Air+LNaWCdwGh5MTkaJP2a+SC8BU7dE1Nw71sDV9357mChFtLdcm8hqFd1heWkcpB4f3+iKIy/oXFjmKj6WglMGkrzEnCo8pF86eItIOYhi4+KmLlcdbOlXjez/4F3RPTjRUCurzB3/yifKmAS9fe4211SV5gUf8yfd+TK99KO8yoj8YEys3SCWbTY5ody3uMKdc3ecH3/suP9v9UBZaZmZjnfLMCo5fYjDuIC1z4VyJdk8WfXyac1fOMy618R8YPOvwxhsur79R5uP3Otx955jxu/eZ9UPtuibYPFYiOCDV8huTMS8S+I6LJkwibzeQ1zYaoTB064htrhtijSs3nyhD7RML8KwQuCCF9XFsIMW7OFPgPfWTyxkn9Ic9EllYKjddOGfXK1MQoihhqUVY/rwk6uO5svNbt454//3H3PjZfe5++lw7fJZLclNfeesKX/zKdc69eJqZMw0mgRFrfSVvY/oKA0btI5HkcLw/Bb0r6/DdqkCeJ84smWQ/nBwJsBRXykkLBUguR+0Cr04tbDDWcnJuYUGBIiFRNt7vtCmlVR6/d0KR/yxdXSCro7nHaILK0J9x6tyG5qxlk++zsrzJ04+2ac6HOG5OLEWOpadKGEjBpxV7n/PBR29zVzuGi60Z5ucreJ7Hfe1xVEouRplRJnAzhpSUeG8/OabHiLw74N7z29x79ITFxVU2Vtawivln5daHYyM5XN4x71KTDIvxgsAdCuQDbn18wp//m6ccHcjdk4lQAaZmNX+NJEONtQ+TJRGufquNeeGUU3jzYtle5EkjjRFbkSWVZX8OeKwKyPM5AtvRTU6hyFzasCKCtd70ORYgmZIJYxwNm6ueQ3ECmMgaYllhpsFTfU91TZR6p/IzVm6+XF6QohcISotS4CxpWuZI+caD+8d88vEej+5KIScjfFOSy9vk9bcu8/KXLrN+cYP6RpWkYslsSaQYMRC4sfrvC9SeDpTGaYzrSOEiRZRbIo0ZpQmuCJBJlkKuUN7p2uUvEojwx9099o+eMVD70CtRXz1FL2/il+aprDcxLcNgMlacv09fexUL8hpdufRcB2eDriGuBITNEKPQuHXhGrdvfcDbP/mZdu5KpApl28/HrK00mcRDnu3uCYIjRqM+Q+3sHI8P2D24x75CgTuv+egQ6kSnpD3tAH54823lNOhQZ5HD7T12FF7j8gj7YcTTB7e5di3n1IZHKmI8ebJPJBlTgRwJzEhy5tKnQ05g9Gdm2N3f5vhon9wYwqDMKBkT1HyaiymrZx0uXDJYxwlwpCgjkMEoTiSksrYp8EYdmYIIkRg0mr5HnRVtrHXIBMLneQNgLKnCxUQEmUgJY8VyCrfjWGXwIy0Fe8TqNxUgxgnBFWM1tuc38Lymvnl0pdzdvZ6S0X1u3djRduWuEk6olauckzW+8NoW197YYuHUEs6cR1a1xMadkqIvaxxo7L6Sx0kRR21Ibn1GBQmx2GaJ1pVTdEddBiddPI1trZFnGFAh5kRHxifdSLuBEQfdlHCjgtEGWaCj1vagTVtLxYHmt3xthT21P5Frn2nN8GzvJifdfbrHfSXIA2abTSXSetYuopWJRJGsjJhirNF4TP/wUH3tKqHu0nnwnM6kTVCexYpMqQjTG37C5NhSr80qiT4iOxpo9ZAwP9fh6WdjhruuEtQONopEqA6ZdBqlBT4Jc0tNXM8XVpBmGUWCW+RCmTNiZg3lYw6nz0QsLBjKYSLdWqy1Llau3XUCAVEl8OsqDZWaniv4cuuuAHOcgKKukdIyudhEA8eKbY71cdTeWEck0H/W4iqkeG6ZIowkss6ibponAnkihfdlXXLXAgzHLRyj3g2Y6DlWKMmNLy6FYIpSptOP2d4e8eDhEffuHk6JsfPsBNd6LK812HpplQuvbjK70WIcpmQly0jE7IiAnahL4aqHkiHtG376//1TDo8P6A66UpKAMc50/L2dAUNZUTdqT0POIM442s9Fhh5zWtWM3PH0e0fy3b73VPJ3CbRZtSNSPNrdnvY1OzvD9tMdgrArG8nYPRhTLhudgQzkRSJ5gI6IcczJ/m0tAZ+QihSR+hsnhnbvmNA3CjOWnQcn3Nq+TU0rhkXtGvqccHKwz/vfv8/ug0fM1Zt4JsOR5XvGw+SyJeuQ49A5GdLTmYDj57hapq9fcpmMJ1rOZzSqE/LYKDexbN8t8eyzkN2nDhY1zQVOorP2WJabJCNShYWpF5Aic8U6owEcgeyKBK5ToiBJKWyS5y6eX8ZxCxIEeALddUP1yNTqJ7LGTFbguIHqhFNiGOsKXA1rHdI8FkkSXZPP62sdPkq62sZtE8naEo2fKBeJRLYkNyJGBdefw3gzHHd8kSLj4xtSzruPePxoT0kPLK3McvmLa1z98gVmlGR2TUw3G5J60I46hTTstQ/IFU6srehdj4ngyESGFKZZ+GgqR4/cGK5eeJNHUvzEi/CaDvty6csLCyy2Vmn3e7TlCbx6wPbhDiPR6fGzoUKdR7c3wHFdEgE1kLXGstKe4n0iXcc63In1viuPZRyXXO3SdHdq+cNlF46HJHaPpfV52k+e0nvexlH7I+1aDkXeUytbGOUxgXbMPBlcyToikEtlJeWFVw0XXkzR4oJ6OWVOslW8CqdXvo1NN2hr3yBNc42ZYQoYrPVwnRBf2bTnlXEVE606lS4ETqqKKgLC6IXRQMYYvU80sQmTuMd40tG1T5KOSZTFqxrWuio+johR9OdJAFfEcLxgOk6g5aSjcTOBm4gEqfrP0QgCgWmxU0IMFd8nU88QE6vvocjRHR9RrPcnyjlyeR8ku+s3CcpL5O48T54b3nvviA/f3+O5PIXjWpqtWVYuzuvot4W/4COJ2dcK4TjucPrcOcJGWYSQvOorNxZH4UPDsazE7+ant4iSlHE/o6vTNs8kbK6uce/+DRlAgrEOgygjMimuDMBYw0RuP9cKotMZ6l2ujZ+ETHlLJI+ZKzeZ6kguuuL4jHRSOjtbw69t6nx/m5VxSHWtrEObB3R2MhYXdNoqoyzP1JBWRcZPaHf2de+yuTrLxdMer71muf7yhFZjyP5Dn8e3Ah5+HPDok1By50TKLx4/2OFgvytjK4B3SKY6t9hcN5lYmWrGuVzS9CrYjTFYTc7KzTgCq5ioXvH5T451HHyt08OgSUmABn4NT+QxIk8uO0vF2EyxOJcHKcZINUbhZQrSTOKuAB1TJI9GY2AccoyES0nVRrrRswN6lxXti6vJP/9mDMbxiEWcweRYm0kjJlL2WFY+VFI3EKhjKQynSmYbsq0G7b7Htohx7+6QB/cPqDRqVLVZVVosk4XQXKoRVjxyyW4FSjHvoZS2snqOo5NDjPFY3pwj0gHNeuusNpdCSo5RbhKwNL/MoNeRAWQyhjapSDtWsohmEMUTtTUCIBUBUmLNLVLC11WsLwdqW67RqJQxfpNCD+VmoNDxnPazASQuJyd71Kuz6iqjv3+IG1g2z7hsXcr4+s+FrLfG9HZznt7JuPdeiXsf+vQ6hlSrjFzJcCrdxcLXOu5UjnJYmSbBjrF40qFjLTYpLFcKK8CJ5LKLa6xwkBZhQHGx+J6KHNNngTq9l0sunjNds+JbEmmCCTJoHOPjypICEcIXQVwnwFoPRwMage25JRx9d6Vop3ivYq0LUlguYRP1l8n9p7LwTM+pgE6m73JQe6O6hWs2hfDalzeOI+V5+uRPv1N8d6xidoeRXOwwHSjaJkhC6rPzPDvYpd1zlAeUZXEOd+/3FEaeEU9SFhbqWr7VCasurdUZ3EbI471njBUibt/fxlpfyVhLSj6SC9ZwkWHYPcBX/M6li1R6G/VPRIKhCCF9iPRxHJMqB4mjAZnmk2mmLoZExvagv8fJsKM+9mhrZdDrpIwHCX4QksuITjrqO8zY2Aj44pt11hdd/BwGe2Xufljn0S31lBZWHpLovSsdr64v05xpYK3FsZaSjNI1qifdWc9XaE1VcjLjaAI+tgDJl4suSgFaoPuiuALKldt2BaBjPRxN/vOri6t7YyxGv5JUlhlTECcRkWKxO46GYv1Au1cDTT7SdUgmkljtPhksvgjg2ECtjUiTkU3dogHs532rf8cEOKrnyh27ulrJkGPUX4wuqupQXp5n4cuXqV1eoiBJKrJgHf3nYxwPqxB09twpWpstZlbr7B7tEsm9JEZjVs3Uc5y7vAKtGipNaHEAABAASURBVIf9kfbgD3i0fazlKRx2fLWv4ooM86fnoRxgSi5hrc7e+FBJq1zu7JK8wgQ/c9HWAJ4jpRooiFDoIdUKJBP4mchhpKhUHkATBlnm3vCEsQiTS2eHu48YtrvSQ4T1clw/YnbemW4E2UjV+zUef+xRCzY4fB4QBkusrZ3THF18L6Aa1HQtydvlSpgP6fUnBKWqPJrPUPPtypDj3FCp1ilVSgRKTsNKjlfWeJmEy8TGouQSsLDCvDDlLNfI/NWP7jUB1ImR9oviGBdjdGcsBSFcx8eVwj8vAa6I4xUkEnDTq1MSoB6fg+njGEcKC6fFF9F8p0ygdfy0L+NiDWRTy090jcklZ1EKhSIzEoYkBxEnP33K8M4JbtG/yGKw5PotrkayPXvWVuyecLw7QKFc8TwmlocZdXpFN9y885yJ9h+MZMANSNXxIDqm0qzKcxieKW4enmTyJkYrBIdM+w3NapnlU8t4tbKULjlNjpXAuU7dcoGboXeFtRd6lS6Ld8lUt4ioqVYpiWRJSWS2kyglVfvMpgoFSjSDXMe0GW7UYH/b6nBpn5W1S3h+SFfny1Z67fT6OGFZsngk1lW0cMB3wHcxAtdrxFRbPU5dGHL1pQnlqstE2HnVTxTKTlg7NWJtI2J9I5a2pCwkNBKU6b2kL67TkmmZken1XxGgUFlRV9/GOj+3xsMxLka/BXmEFEXJNfFcE07F/ijuyUp6jLU3/3k51v2REqWOygnF91iuOlXmnWYDCvefy3UWxUoUq74dWfWUGDbA90KsMRTvk2mbMUVdpHAjuQpZHMn1eQ2Lo99vfu06M/UGnhPiGpEPH1d95SJ5qsQMKSeTzF4pYGZlg1I4S5Z58lwZXtCQjC6OErzcOgy0rNre67O9P9Z+wYDcLSm8FMQIdO+SWTDGxRqHgogF+Jl0+/l9Nn2XFZ4BMKKPKcAHxqmlF3kc9CbEhSyBT6o5ZUyg3NYyd0B1ccDGxTFr5/eozX/CC18YU13OKS+NuHC9y9XrI7YujlhZj6g1UxJjOOr5dNIx7XiH5+1ZHu/XeLBb4cHzMp89ky41tv7LJUxxyacCoj+LYnQt3kzvBXzxXNzzV0Qono2aOZqwW3gAWyhWRe67ULRnA0K3Qdmvf168JuWi+LoWpbj39M1rUPJVXL1X/ZJbV+zSc/Heq6kPFaeMi8VkqOQgJZok478vuWJtHkegUJMpgcsUhjKFo2jS5bvf/TEn2hGLxm0yuV0jBSNyBn5AudSg2D7Old9EvY6WXM/0aUisPYR+/1geY0RuJyQKL0EQgqMxjGQwhliHLsZxZP2+XjikIpQjkqXyVkh3CPjPFcv/8JPrXT7VX0ouneaqW5TiXMGI0IUh9/Mu+8NdOtkx7bTN9smYk+Q0XXOendFVHrdfVLnOrZ0r9PN11TnFhw+2+PDheW49u8idnQvc3TnPo4Pz7HVPE6Uz5KZFpX6ehFXNZ5XMWcZ4a1oFSBmFtWbFNU/IFY+nRc/FO2mMTO+KkuudHtBMVS+mUGYR71LFsVSndcW1yANyuW5VUL14WnIpu+hz8cvn2PhrL7D5nZem5dRff5lTv/wKy18+jyMVuVKso+JaKO6LYqUshxSTp3pncXNwpEQ7LakmkEyLS44rbXsqLmov5bpZhiuieAUw8kiu5uFJ4aHJKTkZoUJB2Q6YraScWq5z5cVNvvXVK5xeqbGhFUJrxmdjtUWjFlKrVDDGMhollMolAiGVM8KxOVbFcSxWwucax2DINbbEmPJgev0f/jC6M5qVimRMJR+SL9O6PtHhzURLyO4wUchx0FYCg4lLe+iSeUuUVs/g1xdxKy3qc2eozW1QmVln9ewVXvzbv8nF73yLhbMXmV3YpLmwTrO1RnN+lfrsCtXGApmpUK7PU6rNUdLqolJvYd3CamW9nhPgGA9X99N3VvfFN73ziqueHeNijaNicayu6KrJWhWnKHKljkphnQU5MiUfmSwujQYk2i84uXOPw49uc3TjDu2bd3nyL37I9r/6CZ13b1Ov+swo656bLTM/V6I1X2ahVWFB1/m5UOfolmYjZ7aZMzeLsvWExaWMzc2Qs2fLbJ0vcelSjYuXGpw/X+XcVpWz52oqVTZPlVlbC3jx+gYbpyvML+TU6ilhNVP239c2bpujZ20ev3+fd/7sBkePjymnTZykRP8k4qQdkySeSi4yzJJlgcKCoVlbAoUTIx1RzFsUFD+lR702pvhD5X/8X/G2eGOMIdAqpuyF+PIiJWXort651ki3Fk+6DV0XtGlTK9coh1UqlDR+g4bArFTqNJuLKkukkcven9+id3MXG0siLTEFrAgJxgHXdXA8Fz8o4fk+nr4HYYUsj7B6j+9C4KkyCchCsmwsBk9UxhT3aaqEKe2TqeRaVmVZnzDIcGyXIBhTKU+o12NaLYflFU+glARCgyvX5rj6wiwvvrzA9VeW2VJmu1mN2FD9ZW/IqfMVJSQhi2setVZCeS4mbEzwqmOc0pDUaTPOjuiM9jk42eX57i57B20Odvvsa3v48GnE8wc9Hn66z+0bT/nkg3vc/vA+92485t7Nxzy89YTHnz3XOnmbk2d97KRKpP2A0fOU/NjBPXaZSZssewssaNm6GDRpuCWKDZqo36VWrsiRRZpjRToKBUJD72rSw0QeKWe21sAovpbdnERXcunQWJmCwVpnWoyxmGkxFL/Wcfj8m0uKfJu8QGB9WWaDmbBOXXI0gzquJz0uLnFx+TQrOhfwFNZGB3tE7T6e8paa75EpD8u01xCNejKwASbLhGNAJawRepK52NiT0TqOS+Dr2S9TLs9QUSlprFptEet4A6zbB6ePH461RBhTqiRyESq6hrVUwhnKjaJYXVExlOowv9KQG/IEmoMNYZQNOJHinu0dclcHHTc+ecL7HzzivXce8/67T/no/R0+/bDDHZWb7+/z6Xu7fPD2XT746W0+0Xn2TZVbssJP33+gOo948Mkzdu8dcqyj04Gy8aTfJ1DmPO+VmddkGp4vALT16njMBnO0SosshMssVdY4VVO4qZ1hvbzJQtDCSjmpTswibdQYMT+O20ziI1nyMVnalb3FWIXAsuszX5plcNLGaKxUdZunF9n4zlXi0RHj/hENWc2cvEd/9xk1Y3HGEaFkQD+OBSv5pl7BGIy+26JoBCtSFCTxVLdWncMWXtWvMtE1jsaEWroFTkBwZhEjq7zUPMU3r36NRZ1NbJLR8sckw3s03V16T28x3nlCSeE3TCVDsZoY9Im0PT3oHDLuHZFpQ6ocNJhvLlArleXtegx0cBWN+xShOlO+ZEfjnOHYMhwVxWE4VBnovq8ycJgMAiZ9lV5I1Csx6ZaIVPonDk91lLv9sMve4z6H2r062RnrtGtM3EvIhjFK//GyRHE7wmYjMil/PN5jMN5VAtXR+4R5JXpzQZNZv0FgA0q2TM2rMxu0mA8WmAnmBcgyiwJ1o7bFUnmNmurWVWpuhYos1jeQacsYbR4l8lL9yS473c/kOZ5zOHhEuZnTKBTd6dOqtWRldZYrG7z6u7/FXLiMcTzh4krFGZFyjf3xMZksJ/ZyTq+fJ93vYN95nxnHxY9HbLVOURr4JGORT0tHjMXB4DgGT7K7qpcrRzFYrPXwRVbHuhSlAL/wMkVONDe7gePqveNrvCq93DJWH/lhxBxV/FqdPIAn811afsCMsDpDk0uzl6krV5izY3rP7tA+vIWTbpP1HjDefaBrBzMaKV9NiIq/JaxS8SwVyeFZn1xnE7mS5smoK1y0bUhsxHaDTXVVzDFKSnIlJ7mSps+TuzGplmpJ0idVphoLSJToWVKK4htHbrNE1Ql1DRUJwSrR8o1LaEMa/gxNf5aasvv5cJFmMEfTnxMQMwRuWSDWqEhxi7LgZZXFUgsPcEwGyr6LMQtwh9ERJ+Pn7PUfsKvSnxxRyDGK21RluaEU71t3Ot5ydY059bVSPUWzPEvglMniVLt9GxjJlcj1fvKHf0pxHoAJ6Gi52pcLD16SrcmC/RWHE1nSq1+4TJIZtq5cp6zv48lQ88uZSA9G8/brsmDXkFRDPI1v5EUmk5GkN1jJ4slLhWED1/UwBc2sS1rMS6sOyFhaOE+1Kj0UdYIazfktwmCGzPHoykJ3n25zuT3Ds6BPWC/x/JwlPzmmLoLNac5Xmstclb6WoiqLSM8lF6J9JlpFjAb3yUZPSAf7jLSlnfTboNPCdNSXOkdTbGwuIDO5uUyKthLQMVaKt7i6uligADnXnSGwAcVfniz+TllxDaXUklPB1XujGp6uvlOiEcwyFy5NrbgAvywrrXs1Pc+pD5+ySOGr/1xxMxWxoqRHf3xAe7TL7uAxzwsmJ11iWXXxbRifkEjhnjWEYnAzmGGxvEzVr1EP5lirn6Mxs4gxLo1wVklVSCTPI7wo/n7A4yf7ZL7LhRdfoVxvchJ1OIk75NaSWGjbMYvfuETr6oqU26GqFUBv2GLvJJF3bBJ4DX74l/dJHJeDRw/IXUMwP4dpeOwcn5Abn7g9xC3kEylqkrESSC+atwYBkc2VrJ7ccWpc7UBCJlIRH2LlAVZXLmONIVf+lat9Js8Wl2aYyEg+He7woP8c7yCRZce8fjRP353w2XyfeKVEOmOYU64yWyrRCByW1PacjOxMaZ7FvEYlLRP6nsbr0m3fYzR8Is+1RzraY9zZxgZyP4ENsEiAPFVFDSTlIaEN4Fsfz7rTohog5hXvi3YzwSwNueK6V6XshtM6noB1NZnCerN8wkBW2hnvsz94yp7ccWeyx1AWOxboI5W+wC2+53lERe60LHl8jVdSf031XYSAxfIGzbBFya1RFpFCTbKqb2d/46uc/nvfJCiFtNtHstSURHIXf7/Ql2dpx30GIk5HYBeHIkPtC4wkkwlLmLJHUrUsC/QLr23R7Fd58eLLtHsVUrtKpN9dnfe3tRZrNmoCqkxbh06mVKE9aeM6VfaPB1jf4PslFuda2CjHkxt3vAA5UXy3RFWeIda5iiuLttbHGovvBpoLRCMj69ymc/ycNJkQhjUmImexEVQTofeHYw77cEiFJ+aEj48fs58M8MYu53ZDNvolwtjwvXMn2JdaBHMV6SkkcHPqAn02CDm3uMK19U3Wg3laToMZU5OchkQhwHhjhYAsA5VC6aETUpbQZSmv5KojPQfWJ3ACyl6Fitx0UTy9TzXDMQO55H2OZLntySEDATuMuwK4p/suY4WMKB0QJ0NcAyX141uXWKA4JmdOBGqFYmplnbnSMiWBW/abFFZdEtihnutBUzTMKA52AsmUyErakxO6Orh68N++zf3/9C9IJrmcKbKsmN3hLiORqdhIyTUGisGxrr/xe28RC4SqrOaVr1zCLZXwvA12nhp29yp8fP85f/KDj0HgGc2vXFuUZRseKMae3twk0Slea22VoUm48/QpNpSyBVKssUM3wU0MK7NruFgy16WssON7VrueGVZztsYlEFFCx+InGbVqiXk+9wL6AAAQAElEQVRtQp1TvVLe4dTqZQwBuXrI8gGj8ZDD3rHGmaF1ep3tdsbQNng66PKnT37CE4WnZyKok1neulMj/PgYbxTx3bU9PplvMyOvMFMqUy8FdI6OkZKYmW8yKxlO1WZEiAZLeRNbkjWVBG6oqyMhhSupCJGoFEycSOEjsXOkbHMopQ/FwEiuO5fKXdchV8wzug/U1tUUctWPBDAKHU25vFZ5iSLmV+RGq1NwZ5mC7TaIZa2uUxKxalOSZfJAnpRVk0eJFZp2Bs+mLtwRIBmWWDJVghmK55HkOdFxcE9L1MIiE7UtrNyVdU0kg6ulVCdLqa41ufDKaf7pH/4RYakmkp3m6HAGG5xW3D9iTMx4MKZ56pSwr4IRgCJMd7iH0iHaJwPKUmKpNOb+o212+mMy4wiQ51w5/wJfuHYVJ/NEgByZLy9de4UNxeRMy7N6rYLrlHFtiCvDcqwn6yxR0r038TnbnGOlvMoLa+skvUNCx6Xk1VleuEiatUklwEi6vnXnMV5tgcbqGj1bZTAo82gw4Hb6mL28Aw2fznBMT7J98+kCL53McpD1eBCe8P+pfEJVRCgVwJ70CWWJiQzEsWg8ix3KTY5koUWJpPRUgGZkYqImpD8NYAWsUSnilB4lXKovOWW3TF0CVwryaHJh8RzMMCt33QjmwLrkxhJ6FcoC1bM+vkrhBkMBVdH7YtziL0oWIDo2YCBgj7UNWxJhZhXnR5JppHcTXYu/+dtVsjaWUlKBlEmmWCFpoH2LyBgi4+LOVFg+v8Dm1TmWVlqQ1nl0L2d3v0pvbEjUrlSvC/aYUqUlS1yWjLmOWNtyhKm8U8RQ6+o8cbHycNVqn3c++DG//j//AxzH0YgGo7lm3TE7z2+wVNnkxa1X8DKo+j7e8ZCvb73Er1/5GjMKF4achqy9IEDg17EmJHRDZhqLeNrzcIBgWOHMjEPd9Tmzfo7MQTlPhdZ8QLG6SWUoxnUks8e+lnljZfPtHNonJW4+fs47zz7h5ui5jpZHHOt7FKU4w4wz2QJ/i1c59IZ8HD/hg4U2w0rOUrkpjMr4GsdqfFlxrokxLRQ/GrC4FGCFNlRFH6uvTgGm41P1yhTJWOCFmELpslBP763ujXFwrU8ggD0pqkgWPeMqJPQUGvoU/yooKUBTPD4cH+Gq/4o/g1WbibaMXfWVKAfZV1jpRm15gD4JmfxJhjFWrr+LJ+JEUmykZ7dSpVps3epY99SFFs1mk5MDl2dPAkaThkJHCEEoSx9z++EdrOMDHr7e6YHC00RpRKKt2CBwKM7vR8qSS6UeuZ/w6OkJT7Yf8b1/8ke8fPVVXOPQqIScWp2hvzvk+aObNET816+/xXprla25TeompNM/wTE+C7OrrK4sUa80mG0usbyyiZHMXXnVZ4ex5OqzNNNia/ESL1/06B/ukg1i6cWjN3AxxlDR8sM6lmd721p9JHjlCk5ljqHedWKPw2OPwvvtzQ15qHyrCA/DKCH3fM0HyscZp6I61/dqWPX3dnWXm+Uj2o1cNmo8LAbpE2MMJbGzLBcV2ECKysjkESBTHUSUjCIGpwIo17vZ2QUKq/aMR1HfMZaxvEmkpCcTiRK1Hcp6D5Th51JcIC+A8XAEtivXX8T8btzlUN8HyWAKbk/P1nrqPSOXPElxp+tYLn5SiOmXyGsOcxstLlxfZvPsvHbAPPa2c3zvDMOoBl4dRzF6qPAwyUfk1lIut6TQAYmStFW5XMdzNT8jrz0kVUx29XhwvEspGLKx7rCzN2D36b4sMMLk8Olnt3jtpatcPneZhUaF3k5fy9qAy1tneHLnJlH3iDcvvKG2pyiXqjRPlThR+Dh7ZoGVpRqOViFjgdLV7t3RMGb97CZDhYFwoSsvNMfZlSuUtOybCzrq10qfPr70UC4t4Ev2WMnyUMSMtAvY0xp/LB2n8hh5WIVamQPt2xw9ikS8EXvmiKeqP7Ap+akGx51jDrsdsswQ9DJe7y1xrlulIoVa7XVipApHSnawJLLCwipSxYlcIBbfPOMxBVou3TMumcCIxGDX96Ztx1qu9eSajycnpFKW75XJXQdX2Xa9Ni9XqEnI0ttRm54Abit2HytpPNEKwRPhCjJZgTTtzBrckktkYKLxrfrqKfGqzre48IVVrn1hnbW1GY52R2w/LNFobDFOm5z+m9+E06scdHeIlK1HygNqtWVct0xYajIRwcYKd893d7CupbU8PyX0eDIgluL7gwM212HvYMiNm48YKwxJBBCJHWtxJNx//V//v3nl2hYr9dPU3IAlufH7N58yq+y9Va1idE6/Wm1x5txVZhYXWdHK4N7tx8zP1kk1oSAo4To1SqUyk3GVK1deJygtcRJ9xu6Du5R6p7m0FdMMI3xySkpI52dmaZTmBGymdkOyDEbjHpFwKsgQCYthbJhbXWUgw5w4dYbDMl7QZF8rrrd/8jZtGUJbexO9yVBkzzkcddU+w1GYsJnccVGscXCti+e4n1+NKxFSuZZIoCa6z5go9o5k4RPtuMVSjFWdRBaa6uvK0mleOP86Vy98gc3T51nZPMXcwpIy8iEH2v07EuCu9bEaI8oiQgETae8hU9tE5Burv+uvXSNxLJ00wik12bi6wMXrS7ws0I0I+eh2zMO7Ls+2PVxlz05Y5t6jLv3kmOPHOzz76CYzjTO4fo1i8yXXnBChhuMOrlvSPODOs1sMZUHNUlOySHJtBFw670xJ8PHNY0YiMTm4ausIdtd4SGtK9FLOb83x7g/e5vIr13n95a/haau4AKrS9FlwBJRce/t4j7985y94ePMedpyJLEvc+LDHcmudFy6+rNPGX+LqxRd4/PwRH93+kPffPyQrHVPkaKcWV/F2L3Nt65A6GfO1JrO1GXYPnxMEFUbjCkE40rUv154qLObTOcUiwdOdHYWsMrHrYisVbHVOxjxLV4nfg8MHPEn2eNI95kiri7HCXZFgCnqsY6xYnhFL6YVlZ6JYJPcyUUmzlFSSxWJWUQrrRoopOVUldbVCT5w6c4EzZy5RqlYY67eXdBloO7YgVKBkxcpLVIrkxzoMtO73nIDUGJZPtfj6N99k4iY0F+ZJBNDD/R3WtlpceWmFFR0QHT6f8PShw53bSB0L4FUwyjsCbZLERMoPTuiKXLXyGifvb+PlZTKTUSz/hpM2ORmOxgMjpXXFBY9Jb8KDh7K20OPa5Rbl2oj3fnZAVy4yFrkLkuaab6LQ9cLVDS6cXSLE4cUrazy68Yxx+4Qbf/J9aprvy69+iXNr5zhTX2dldpH5epNRFFG5WtbKIuZYB1jFPxp5+QvzDGW1n92/y/d/+iOO20+J4ohE40xyw2AIeaUtrzBiJmhSN1u8+QXpNIdHAtb3q7iOi6cDnSSpcPXSOo57pPA1ZlR4MHkDo3Bg3VD5EjTmVmVAZYbCb6/XoT+UXsY+YztgNz/kYWePA3mBjgzRFkLkUlWSJ7LwSBafTNmYAa4NCASMMQ6IKK71AEtBhnEyUUI3lpuO9RyTyl2nYqK1Lo5xGSszN66lFFaJTExrcY7ljSWxPefc+bPcebzHux9/RmOxxsJalYtXGzhSRucw5c4nE461VEuY1YTUX1DGCSpkNlcyeUJntCNLaBIGTYKgAZLNSAEF+BMBpxe4bkkKGjIYnZAksdy9kSHHjMdDOt27kncPwwJJXJISTzDqA5E/U+jIZAye8Xny6Kk8zmPOiwSPdTBVsyENkTkfT7j34c+oOC6tlVmubl6lWi6T6dAm0Rb6/JkG7YMBb33jDZYWWji4iBdY62Cky3EE1UoNT+Etku63dzwqygVc6eqF176ouluctD/AVJ5LtwmBjKioaxWKjPF48LjH8uKmjshjJvFAZaIyEvn61BtN/DAgM4aDTodYY441xgSPKKkyGRhyGd1hdszz/gE2EUtyJUaeDTBGKQEGz/q41lMzyARsEW8KwCdSTCyiJAI61wBWkylceQF8LMV5ale491QtHbWPSbG+z7XrV3m6f8LOUY/cd0glwOUXF1hYqOCqj/u32/RPZhhP5llQKHFmamJwiCvQrR/Qj461hDsAx6FUmpfyFjWCwTo+xnE18S6pxs8lu+sETKIBo3GXLMtRo6mlRdGIIBixvhbzfP+Ad99/KFKkLLUWqFWaWGNVPxFJRpT9JhtrNeabIedOLbBzb5eGV6LkBliNXNbVldUdHjzhfP2M5rGouH+Rpc3T+NUanZ0Bmfzruz+6SUnEePLkCGsMga95OR7xxNdcE/XkgHXJnRnCxgrLL57jn/3ou/zrj9/jTneJK+s9VhZk1fLGkOG7pWk/jnRbrE6Gw4ByaaJ5TIjkUTL1OEkSrHTS157/Sa8NhY78sowwYyIZEickSqvEI1cGpbqu8aQ2C7mRsoyUlcp6J/IGMRMptQAd1TDG4quxNS6pSFGAXVxjk+p9mUSkGCoZRN8TfY9UjCcilasc9rpcemmZ0+eaWhI1Odxry8p7HO1XgBXOnr9AO9K4Iky0vihWBnQGexz3nyqrb2uSczTq61jrY6VAKwCMYzVmJEX2BeAijvV03yPxYta/9TKuZC2sI44n5JJrS4coad7j7v0J/V7Egyc3eK7j3K3TFwR0g1IQKNtPBX6DifbJd5/ucenCBnsPDmjItXrSk2ddyhrfIeHyxYvk/RGu5O6f7OFNINM37+I88c6sSLEsbF08J2A8zPH9UMWj2Wixqg2d1aVTtOYXWVxap9yc59HjnFvb/4QbnR5rl95k5dRbPOpd5eWVz0TomMKzFPNxNfdMeioFNaLIUiR85bKwijuas8fC/KzCeczuwR5plsmDaP7WESwlUFI5EU7KR5VrSa5IhPrcsicUO04TWXhhMwaLJ4/gGJfi2XE8rHEUwxWsMARuWe5/RGaKr5ZYnRYuJ8XVvYXQUJ3Pqc2lbG5WCLyc+58e8+izlOdPfb75zV9SnGope4/pm4TJygquU1GsOuTBj35KVwDUqktaN58lDOZIZU1oEp6YPNZqYzQpLD7DkXJ9vev29hkM25z6lVdpbqxy/797mxdfXJOlJawuJywtw0cfnyisWI2xK2VOcIzPnbsf85UvXeTKxReVoL1Ea2aRVCsFD8Nrr1/iR3/8PiWN64pcZSVXs0ETh4yK5m+rKVdXLjFTqbMi693de8qtD97FW5Vrff6Q5aWznD/3IrNzLSqlZVY2TvHi5Zf48mtf4qUrr0quVWY13s7hDh8+fcif3x+qnuGFa2/QnJmnVJJRuVs4NuBbV54xjvpYyVFcA+UEkVY1rizdD8p0e4GMoMpM05E3AEyf9uCIRDlGJu+eG0tSYKR5OfJCudpNlIDHgE31wWBxjYtRxQJoq/vClRcd+E4oRiVE6syx7rSjiVYBudoUnce5Oil5hHUjJifK/DNKYcS4lzPqBLSPypBuUm9uYnyfxMa8/WxPmeocYXOWjjY+Hvz4x5z0nlEuzVOrrUkR80x07p5JSN8viYSZQIuUSJ3guiXV43jyHgAAEABJREFUm52+Gw5PGCmZKZauueS4+9/8hHNVhzMbizzWBs2lSz6PnnZ58CBiEvUYavnpSqFWMOYiVX/Q53/zD/8PFO/mZpqcP7VFs+zxxhtX+fTtewTGUIQ4T0RPFSr7kwNqXoW55SbekUO9WiNzY2LlQ1kiK5/x5EVgd2eXTz75Sx7cv0OlmbKzs8/e9g537t9TEvg9fvCTn3D7wQ1u3rtBYvwpwWMtRd99vMRW/c9IdVCTynMFmvud3tcJFDJbjVyZ/wSk90ghLhAJpBUKEjQbc1RKcwqNLbo6Jn//xg15vVw6iykS4kK+VPPN1DqRTnMjzxQ05LFcrKOH4mMR560UUwwQqxLGUpRiNZAbkH4lKLJwCSIXRCD+hEOC6oBSJRLIKcnI6mTLZTRoirkLuH4TNyxjfUOgzZEgbFBaWGD/9j2FgfscH2mPW5ltGM6Kwcu8+eYVfukXrtNo1giCusY3cqMT/MBXTE2olOfF8Jxef59YWVUuwQq5EoWqtMhN4oSPbnwksfc56fb46OO2CJII+CO1SwWOmXq2XGQ2suRMsTXWUu2DD38wnfmKEtWf/+bXufvBE1wprOY1CK2jNj4V16ckY5ibnScsO5xpbVArhRTb4ZGSzJNBm6f2gFvff0xmYOP0Cr6Ssc1zcxpbnjTPKbaY0zQnVW6ysdbEdXwca1QyjZGwf+gQ2Akl01YuEuE5Lq6A/ujwWyxUEuZqfYxwyYVGqhykCAczjQZrS2usr55jOJ6wvdOVgUTEWoklqhNFY91PyBQOMs2pKKmMvsjZpFxsnCbTj8Y4ivlqWICP1FNUhgJqEg2YuSm5N8ErDwlUXGeirB0mQ8O4XxFr57C2heNVwTqkAkRI4HohleosbuAwSk7Yf/oZjhPgeRVq5VXWtIHx6ivn+blvXuXegyP+5X/3jpZJHZaWGtQbUoAyZeU12pHLxO59xuMexjh48gRxAaCsz7MVKSvizCmL60f87MYeJ8cuk0lHlt/FYCmsPNOyJ9ZSDzL1Fyvez+g6Ymf7Ibvbt1lcqJEPK7zywmusNNfxDDjGUlUOYKSPRlCnvh6wapYIA0/GEFPRPAaTMaNJzNkvr3LnnYcU3mt7e59KrcR8SyQqlahUSmAM1ooM8ij1coV6yef0SpOa5KloHnlnyJ68Zs18QDQZUYC11JKn1IbaQjPjhfU2MBShdMFQgD/TnCOQLFE85vnODuM4FenLIoHmmPfBWBIRNJGRTEuBt/DM9b4wfJuIDakml+iDpivg8ingxWFLahOccEQBuuuN8L1cQGcMe64SmypZ0sR15/H8StGURArOxHTr+gKiomlBf3zIJGnjK8nyg5BadRXPq2AdX8L2aC3M8v5HT/iTP/tES5+uJuPw0kub7O33ZekOh0d7spyulDrUlC3lcJZisP7oiFyWJCGYne2weSrg07t7bD9jWq+vPKKYvDWuQHSwOJK/QlqEL1lG4JZJlE9YufZqYCTvkA9+egPfGLoHR2ydV3yfacnqfcnfk2VaZluzuD0r4oYyHkMoFz2Wq7aZyyCMGAjASH1Pya/DpMNDkc8aETElGqcEIlJZhK5p7oODroC3/Ma3XqOh5WNN28SpQtpf3gh4tDun+iMB2aHdHqAu2I2/hK+bL5zaJxHxl+RJm/UZyiLHREfV9x/dpvjxnQDHcTm9cZ5GLWASHah+TCZdRSJJpkqZ8E4lp3E85QByDbFKpJcJKY4syC0NBfyAcinBkjEeZIz6UsSopOcFgnAOzy9PLSDS7mAkgUqlOr4yUyvw+6NDesNdkqk3QbFyScK0VJYYT9rinxTulQhV/52ffYTremxtNZDc+p7xyc0DBlr6dbrbZGkmoDOMEYjG56jzlLj4q+Zy96Wwz0sv1vns0S4ff9zHZBW6g2f6PoSCiAIdzSuVfFHSE5H2ZfVNPDdQCGljNe/QOrx4/QK3tSx8du8mH739Q5Ek5nB3V9uyL9JaWpha+VxlkZ5zyII/S70i8ksv6/VVBrLUQwGXLkVTAhTGVPXnpJuEQGCPR4lUnstDldRvgjUOnis524Z8MmTU61MNA3nHAbHynlgri7XZ+8x6H5BohZFpX6GkrWbHsWwPLmtbfcLFTUNJXmV1eY6BPOK9h7elU0usJN5KiUZE+fTutjzi+akMJeEZab9AKiGRp0kEfi6pCj1aJ0RxPMUvj6iUI7zCyqOcaOgy6LvEUQPfXSAMm2D1XAAuNxrLkly5d8+rqE2ZsayppzP0YqmCsYTBzPR9KZglUV3rQKVcpVFflqBjMgETpQPe+MIF1UMZ+Ymy2T6lsw1O/f4ruLVQIjoEfo2iv7Gy4LEydDKD4YQXX6whh8KP//KpAFpmHLWV4e/j2gCUGwQKRalktZKlaNHUaWGzvKbYOpIXG+DhUi85vPLaOW6+fZeyFFfz6jiprGIgixF5n2/fY765rMz8dZavzXLa3aCiuO+6DvVykyftZ3Qmfa2pM31f4MM/vqNkOWKY6J3yjErdZzKOJb8h168EY6I5ZPK61vGJFCb/8A//mKFCSEle1DeeLDLh3k6VpfqOvMCRSNthMpG8MpJY4x+Mz3KmsUMpGMvj3efRkyeIxyQC1XN9kSyaksxV/x998ggrjFzb1AoBIo2dytNP62fxVCJbKRmQsMk4p9dLGPR8GY1A92Zwvc+Vn+QRUToi028huOdV8FVisWms7DqWonO5mPEkwxPrSwI/E8DjSU8CpXhumSAoqT+L9MzF88sCLxMZ6vzs411OOifUry+w8WsvC6CEj/+TPyY9SabtBqNjIu3uSURZRJdTYn+r5fP+h9uKeTkmd6feJlMFax2Rw0oBhijqgqaYKiyVlmrMnzlNFLc11SGecZmfCblwcYMbP/0MX61KktG3Ppnm2ROoeW+s8RTbtX++srFBtdSiWL41qw2K5W9DxHRw8RKHp+kOP/zP3+F4rwPqO1Bfha7mV8oaM8UXCNYg2ZfJpZdU5DKSNXctjnVxVcbaqMoLUNIRu88iuiOX1eqnqLpIV6ZSrtGam2dh8xexTsBs+gOFyYci/phM8ywAz1XZsR6ZCFbM3XNDfDeg2ZyhFM5Tr1nJNyRXvVyhL0ki7NHhmF7XUuwxO7aBo0YYQ5JPppaKBMdYXAFbfEvVcCTQJ5E60sBdubC9gwMePn3GcaetCY9INBFjXLypIvLpcyoS+b5LGPrce3jIYJBw0u7oekjqJBRj3P2vfsTJ7R2s9QT6mOH4mIKtuVz+8mLK1StNdvbbfHZX4GZlJpJjoBNFIyFz+TfHeJpcojaF0qsi3wTHOMyeXuPBv/g+mfrxJVerGbC+vsjtDx4SWqM6hkzWmOVjEilnPpiRYvvEvQG1ch2nGfHquS/SWl1i7cJ5Flc2sY4j+UZ0hl38loOp6Fng5VgGxRpdnuiOQtk//S9/qr6RLBnb220KC8w1RpY7zLQqGi+lIJwERwJKfwpfccTjXZdGcMBco4rvO7RmGqwsrjFRvnC3/TKqzLWNnpqNVTIiEchIb/qg+L+kMRVuAke4egyHEYH2C1rz6yKCD6YjbCOQrNZx61PQp+tFuepI1laAPAVQcdo6AcZYDTCgcCGZ2BUpYdk/OuBRAboOR9o6C08UZ5OivbJQYxxNOJYSexgNE8WaVF6EgKYEqODYnEnh0hUD5ThI5Saf/Pn7EjolVcY6GJ9QJKWRzs4Dv8vVy3Uiubgfv/OIbsfDGCN3v6c6YxzjTJ8960sRqYoIlw6Joo4s3cd3QrZ/+AGFdRcJ3/Xf/Zp24ha5d+MJvrJxBEaoTaiS4xM4ZSqab0+kCtRfSfeJ2+f2995n2D+h2NatzczSEhCBktdgdgZfnmDmSo3qWgmD5q3+kGJdtW/MlJmfb8hMFADyomSgJzsFymF+tkkigyrqGmOmO7C1UoN6pYxxz0sfOeX8Lxj0uzzfe86OyrPnz4iyCkejFnWvy5mWjE7GWPQZaX9Aaubx033OnlohGg3UR0x/FLO7d8LhcYfT2usIgxDfmxApbNtIyUEkyygSiFwTcKQw64YUBBjLwiaqlEnIDKOsvM8TCXBwdExv0CMWsGN9zyU81mhuubzAnqaYC5xIJEimE3QcH88tESl3cF1DoBWBaquJq14NkSaAddUmpggrqdZ9aXzCSy/UWdNB0Y/euY+O8Qm9Or3RnhKfQ7X11BYcG5KKHJHmgZzhtEheB4s1DtGkPQW/cO1f/ge/Rfqzx+w9OhQ5UnzHY760TMX1cY2rYoGEmXBe36FenyVKe5yZWaP76Am797QtO5lQ/A8sUsq0hs7ZLY2ZWWkw3g9xyyXqJSXITjBNAi+9sMRbXz03lY9CK3mOtR4YjWMMpAbX83XJqc3McPXiq2xunhVB1zjZPWK7u4CJtnEdBN4O+we7Aq4ivY45Sl5gktZYbw5YnM2JFYZdYZcpFKZZzP3Hz3XaeZZEOs81bu5YJuOcx8+2eePV17CUFYJBOgpwXQkvgJDCxoVl6vw8lkU7mkgkd3R4sq94c0C726VQ9nB8JGYlqm7UNpi+S5QPGOvSFzFGiv1WE3WsX8xbAI8Z6FROOsCTsquKZ836IpmELcJFpg/qiVybJLFId+FcwNWrc/z4vdvc+KRLyZ+Tx+iKdDu46tMaF6M2niacF2Br3Fzgx5pspky4Xl7GWkf9jXEVFjKRY2OlTv+Pf8bZ5cWpZTS8plzsvJQ5FCCGOIsouYFkkudKOvo2S7iR04pbVJSlx0T0+x3GOsXs6/vzT59x1D3BWxsy7I6YnV/hytXX2LywxfnLV7l0+ToLKzOcHKWUteYvabkWBD5nBPDWmfOcO7tFrbLM1sWrbF14gfNnrjK/0JJXmMPXjmnhJR8+kRuXXPHw+4glMo4xsYwl9Mq40uODznny3OCkA4p9mcLAMrlUaz1yxc6bnz7k+rULwmeMyRxs4BJPXL77/Xd46YUr0mEdiy6JYldTmy65YqDruiRaeqXZSJ8iKSgReCNtdHT0fkxGiisB1IzCcxQCoJ9MAyZy34UHmUxSEnmVRKQYi1CZgC6+53lGuVRXqWC0x5DJ2lJlpWSWweCIpcVMgs3Lyxzx03efykIXRKBMFn8wDSeO4wugSJMNyPLPx5BmcAR2JsIWHr3kN5lM2pg8xymmJ8s4d2ZBbJ/lwY1H/Nm/+TEVW1Ubj2LeNa82VVaxzz9U2GiGsxT/HmFha57J/pDVmSXJCnOVGc0dIq372ze3ebr7iN5Jh3DRcOdHT0gkT0Xr8qWFNV774ss6DFplfrEsIroU4IdhSEmud6G1yOzsHPV6Xc+LzOjwpi5PE6v9/tG++v2M27d+xt7uE461V9AZu8zYZyJyLPDHkjkm0PK5mLcXNPn05DUG+Rny1JKlKZmsP5VHtMYlkw4+/vQJW6c39G2CVd6R6nvg13nvwzvUaiKAH2Tq0FeMOdbkIjAZ5bLLwVFbseQZB4cHGnSMI8YZ65Cr0yxLxaoEx/hi5QiDxXVLKgHFz9mDzOEAAAe+SURBVO7+Y5EjEnlSAShRVd8YwSGhitiPTSlJIaFfmmbajXrMS9dmSCTcex89pX1i8GxJewInjLSR8ZU3rtCs19RXpjEDjH4lCMZYJgpBYx0OBW6NUGBG2v1DhCviPSLh+a1FfL/C4zvbGBGurjqOZIlFjJJCwJe+fZ2VuSV9GRLKo2TFe7/B0XCH0+VTpCaSByjTkWdari0y0mbKkfKBwIR8uPcpbmDZfbLLT370x3zw7o+48+nHVJoZ7fYJUhlVWX9hCIXOEnmnRMYWxQOKc4j9w0OePHvIrds/06rmR9z+5D2QERb/W4CxvFkxhxuPSmQyLqKPJb+MU0ZVnIF4bqC6Kda6eIoRS42UC6sjYSnvaKwwi0HXVDp9sn3AxrrmqLYFTpnkcDXXHeUFdlT87QRVXFmal8JjJRr7PFKcGEcDsEZ9uFjrCcx4Cro1rgRKVDKKH9+roEqoJmOdwU8mfdVLtYN3IIyyqSDWeCLKZGrFqSYTeCV8z6Vedbh0sUaz6fLhzac8etLD5JVp38PJIctLVb7+5Vf4y3dvyUNEFP0UiUssBaKfXJNDXsW3Aa4UEWv9bRUarEiqxT5XrqxiCXWef6B+Y2peFUfge5pP2fG4eP0s7//wY77+yy/xS3/j64r7lmZpnvmXqtTGNarlksAv4ThWxdOIMNEZRJakOqpuU7tcItXqYfvhnggfs3f0nNuPPuYf/aP/Cx9+9I70Bp/de8Bx+4gD7Wju7j/lJ2//iB/+9LvcvH2Duw8/5bi7w77ajZTwRgLmgTZwMq2YCm+WyZK7CiGRMv/l+raMpUssD2QkiSOd+n5ZcrmS0XJ6/oRWucO1C02MTTS2Iz0mUk9OFE3YP+yxubYkbCZ4WpamCi2+cLBVLXOOT7rcffCE/rBDJldkjMVaj1zKTSVUrneOrL24Jsr0HX3zlDc4TqDOhxJqqBDRndafslUC9gYdMdTiWP9z4NUPuSVNIiVmPebnM05tNjjpRHx8aw+yKq4NVbfDcHKAK4BO2gP+/AcfyqBdCmUgeTynhDGGVJZUyBYog7fWIRH4RsDbKQFirr+8rnFcdnWen2ZDymrnS+6SW1U3UoKe73z4gFZznqW1Od7/wccEjkt1rsaDW3c4M3uawPMIvYCuPIwneY76xyKSYaDVy0jzuPjlTQ4fFzpDCVlMRd7FGitDiBEfSeX52idjrAWjAJJqhZWJtEYyGpPjyQiq1Qqp5M4Bp2ikb6oKepfKgxX/bPzh8azyH0cbZUdYXCbaMSy8QDFW0c/c/DL3jk+picHp3aA1G8jgRjjGU58FcY22lQdKIrsU/0+kseTwNK8sS7AHx/skcnuSEKtJGuNQfEg0uGPDQhx9j0kluOuWscbF1TUqVgBSTPG+AL0oxSSkIYETI1F4snOfsRJCpsCnuh/g+R1m5mKNYeVtpKi8RbO+QCKFDkeSRa7PEziR1rWDQYRjPdXV+IrxBSELZUba0ULJTiWco1DoeHxErpWDkXdRR7zyyiadds6hsv046Qn8kFAuD6w+SwYRdyTCbK2f4Rf/5hf4l//0+wxFtmp5lmxmwJnSGULPoXCtmUk134D12qpAgcP+kQ7BXJ4rNI21Dfz+v/qUwnKt9UhlKIF0U5TGXEmyFdaXSxdFyQRQQqKEDSGcFH9lzhhKOu3LReBYYOTASPMfS/dGZC9wsZrn/QcT3v20RhzF8oRHuo5RpxQE8GSIa6t1rly7TpyH03dz3jZGoTwWrkWfmfq21mU46mvzrKdwe55E4cAR4WU8HtbxyfJ8+jIXa41xAEvhbot71y3hSmm5FJzq+2B4qMnkKhmZ3mWauCMFxGJmrqy0eC4IEkeJyJDJEocY26XZGON6CPgh/Z5LvdKiLDfraCMo0kmhlRwGR30meBqTQgliay436+hbJNCG4xMcXErFZs3kRDIPcIyVtJlSi4SXXt7g6DDm+MkxRf2arLIAP5GMlhS36EfeqFVq8Y1ff5HeUcTB9h6hgKvqQKn3uMv5pS3JC9YxsuxIll3hUEnqJI6x2nlsS5HOBooyqQAZEMk40jyfgjcUOR15y1V5N70iTXKKn1RjJlJ6pqQ3EdlTETpVsl3oDydD2qSnhNkxDr50napPBwfkqo1CTqqkvGSPaHiPcI0vCx/Lqrs41uO+NtYa9Qbbw5eIU5fAjji3OJYeU2LpzxhH9wmO5t7u7vPw8SErWg0VY9hCgETCGWNxbECiuFMUq46t3Lcry8kFciRwI7Fz6ooLcTW7ggzGOHpC7SYY45KIvfqkATMKK8YMqFRHlMpm6u4P9lNsXgWM6kRYxat6tUaj1iIXSMZYrHVJJRMiQPFcvE/E5uI5kAsv+Q313SGXrJ5kdFAb1X3pldO0jxKOnraZJF2qXhVPfVlTKMWhLFKlsoaKV+YXfvt1JqOIf/7/+K4ALtNYbDLQoc65ubMMorbQzzFGUmp+8+U5hvJII8XSoaz+aNhm+fy85prT7fewxmqcAK/Qlay78ATNuRKTcUKsQ6tUcsYCP1H8nl5FgETL61Qg97rSTcXXWJqDZM2lvFjvM+kC3afSg5HRlWsuZ5d3aYRHjIplumTJyUj0fTzJeb57wKuvbLE3WsOxjvYy+qzMRuoiV8kAO706IldHG3djbb6trizy/wcAAP//4Hu0AQAAAAZJREFUAwBgRab0uZj+LAAAAABJRU5ErkJggg=="},{id:"robot-guitarist",name:"Robot Guitarist",renderer:"p5",files:[{relPath:"Robot Guitarist.p5",content:`// robot guitarist — a robot in a long black leather coat, black trousers,
// a silver belt. An original robot built from an amplifier. It reads the chord this track is
// playing and frets it; its face is the track's own waveform and its speaker chest pumps on the kick.
// It plays on a stage under a rig of sweeping, flickering lights and strobes, in front of a big screen
// showing it from a camera down in the pit, looking up, to a crowd that bobs on the kick.
// Major and minor triads are held as barre chords on the A string;
// a root and fifth alone is held as a power chord.
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
let chord = null, handAt = 3, ring = 0, bang = 0, lastKey = '', feed = null

function setup() {
  createCanvas(stave.width, stave.height)
  textFont('monospace')
}

// which triad is sounding in this cycle, and how to hold it
function readChord() {
  if (!stave.scheduler) return null
  const now = stave.scheduler.now()
  // the notes struck most recently (a chord keeps its shape through the rests between strums)
  const struck = stave.scheduler.query(now - 1, now + 0.01).filter(h => h.midi != null && h.begin <= now)
  if (!struck.length) return null
  const latest = Math.max(...struck.map(h => h.begin))
  const pcs = new Set(struck.filter(h => h.begin > latest - 0.001).map(h => h.midi % 12))
  for (let root = 0; root < 12; root++) {
    if (!pcs.has(root) || !pcs.has((root + 7) % 12)) continue
    const minor = pcs.has((root + 3) % 12), major = pcs.has((root + 4) % 12)
    const a = (root - 9 + 12) % 12, e = (root - 4 + 12) % 12 // fret of the root on the A and E strings
    // strings low E .. high e; -1 is a muted string
    if (!minor && !major) {
      if (pcs.size !== 2) continue
      const frets = e < a ? [e, e + 2, e + 2, -1, -1, -1] : [-1, a, a + 2, a + 2, -1, -1]
      return { name: NAMES[root] + '5', fret: min(a, e), frets, barre: false }
    }
    return { name: NAMES[root] + (minor ? 'm' : ''), fret: a, frets: [-1, a, a + 2, a + 2, a + (minor ? 1 : 2), a], barre: true }
  }
  return null
}

function draw() {
  // drawn for a 1024 x 512 canvas and scaled to fit, so a canvas of any size shows the whole stage
  if (!(width > 0 && height > 0)) return   // no room yet: a scale of 0 would make the stage endlessly wide
  const K = min(width / 1024, height / 512), W = width / K, H = height / K
  scale(K)
  const kick = sig.kick || 0, treble = sig.treble || 0
  let level = 0 // how loud this track is right now
  let wave = null
  if (stave.analyser) {
    const w = new Uint8Array(256); stave.analyser.getByteTimeDomainData(w)
    wave = w
    for (const v of w) level += (v - 128) * (v - 128)
    level = min(1, sqrt(level / 256) / 40)
  }
  const now = stave.scheduler ? stave.scheduler.now() : millis() / 2000
  const next = readChord()
  if (next) chord = next
  const key = chord ? chord.name : ''
  if (key !== lastKey) { ring = 1; lastKey = key }
  ring = max(ring * 0.9, level)
  bang = max(kick, bang * 0.85)
  if (chord) handAt = lerp(handAt, chord.fret, 0.25)

  // the stage: a big screen at the back, a rig of moving lights overhead, a raised deck
  const STAGE = H - 84
  const SCREEN = { x: 44, y: 22, w: 560, h: 236 }
  noStroke()
  // the deck and its front face, with a strip of lights along the lip
  const deck = () => {
    noStroke(); fill(34, 24, 58); rect(0, STAGE, W, 12)
    fill(18, 13, 34); rect(0, STAGE + 12, W, H - STAGE - 12)
    for (let x = 14; x < W; x += 34) { fill(124, 124, 255, 60 + 150 * (((x / 34 + floor(now * 8)) % 4) < 1 ? 1 : 0.15)); rect(x, STAGE + 15, 14, 3, 1) }
  }
  // the rig: six moving heads that sweep like the real thing, each on its own arc and speed, and each
  // flickering on its own; between them, small strobes that fire in bursts on the kick
  const HUES = [[255, 70, 160], [70, 220, 255], [124, 124, 255], [90, 255, 194], [255, 170, 60], [255, 70, 160]]
  // how far lamp i has swung, and how bright it is this frame; the rig and its picture on the screen both read this
  const lamp = i => {
    const sweep = sin(now * TWO_PI * (0.22 + 0.07 * (i % 3)) + i * 1.9) * (0.55 + 0.12 * (i % 2)) + sin(now * TWO_PI * 0.5 + i) * 0.10
    const waver = noise(i * 9.1, frameCount * 0.06), stutter = noise(i * 3.7 + 50, frameCount * 0.9)
    const out = noise(i * 5.3 + 90, frameCount * 0.11) < 0.20 ? 0.2 : 1
    return { sweep, power: (0.45 + 0.75 * waver) * (0.72 + 0.28 * stutter) * out }
  }
  const strobe = i => bang > 0.55 && noise(i * 7.7, floor(frameCount / 3) * 1.3) > 0.45
  const lights = () => {
    noStroke()
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 108, hue = HUES[i]
      const { sweep, power } = lamp(i)
      // the head hangs from a pivot on the rig and tilts by \`sweep\`; the beam leaves from its lens, along the
      // way the head points, so the two always agree
      const px = x, py = 9, lx = px + sin(sweep) * 14, ly = py + cos(sweep) * 14
      const tx = lx + tan(sweep) * (STAGE - ly), half = 58 + 30 * abs(sin(sweep))
      fill(hue[0], hue[1], hue[2], (20 + treble * 40 + bang * 30) * power); triangle(lx, ly, tx - half, STAGE, tx + half, STAGE)
      fill(hue[0], hue[1], hue[2], (22 + bang * 26) * power); triangle(lx, ly, tx - half * 0.3, STAGE, tx + half * 0.3, STAGE)   // the hot core
      fill(hue[0], hue[1], hue[2], 60 * power); ellipse(tx, STAGE + 6, half * 2.2, 18)                                        // its pool on the deck
      // p5 turns clockwise for a positive angle (y runs down), which swings a downward lamp to the LEFT;
      // the beam swings right for a positive sweep, so the head is turned by -sweep
      push(); translate(px, py); rotate(-sweep); fill(44, 38, 70); rect(-11, -7, 22, 20, 4); fill(hue[0], hue[1], hue[2], 110 + 145 * power); ellipse(0, 14, 18, 7); pop()
      fill(70, 62, 104); circle(px, py, 7)                                                                                    // the pivot
    }
    for (let i = 0; i < 5; i++) {                                                                                             // strobes
      const fire = strobe(i)
      fill(255, 250, 235, fire ? 255 : 26); rect(84 + i * 108, 3, 20, 6, 2)
      if (fire) { fill(255, 250, 235, 15); triangle(94 + i * 108, 8, 94 + i * 108 - 150, 150, 94 + i * 108 + 150, 150) }
    }
    fill(26, 22, 44); rect(0, 0, 640, 4)
  }

  // the player: a robot built from an amplifier — a screen for a face, a speaker for a chest, and an electric guitar plugged into it
  const swing = sin(now * 4 * TWO_PI)
  const sway = sin(now * TWO_PI) * 7
  const VIOLET = [124, 124, 255], MINT = [90, 255, 194], SHELL = [58, 50, 96], EDGE = [196, 188, 240]
  // drawn from the feet up, so it can be drawn twice: on the deck, and on the screen behind
  const robot = () => {
  const dip = bang * 10
  const LEATHER = [21, 19, 30], SHEEN = [118, 110, 156], SILVER = [204, 210, 224]
  const cxB = sway * 0.7, cyB = -222 + dip                     // where the chest will be
  const hemY = -46, flare = 10 + bang * 12, drift = -sway * 0.9  // the coat's hem swings against the sway and kicks out on the beat
  // the back of the coat, hanging behind the legs to the shins
  stroke(...SHEEN, 150); strokeWeight(2); fill(...LEATHER)
  beginShape(); vertex(cxB - 56, cyB - 70); vertex(cxB + 56, cyB - 70); vertex(74 + flare + drift, hemY); vertex(-74 - flare + drift, hemY); endShape(CLOSE)
  stroke(...SHEEN, 90); strokeWeight(2); line(cxB, cyB + 78, drift, hemY - 4)                 // the vent
  // legs: black trousers over the pistons, heavy boots; the knees give a little on the kick
  for (const side of [-1, 1]) {
    const hipX = side * 26 + sway * 0.3, footX = side * 58
    stroke(...LEATHER); strokeWeight(19); strokeCap(ROUND); line(hipX, -148 + dip, footX - side * 8, -74 + dip * 0.5)
    strokeWeight(15); line(footX - side * 8, -74 + dip * 0.5, footX, -20)
    stroke(...SHEEN, 120); strokeWeight(2); line(hipX + side * 6, -140 + dip, footX - side * 3, -78 + dip * 0.5) // a crease catching the light
    noStroke()
    fill(34, 28, 58); rect(footX - 30, -16, 60, 16, 7)                                        // foot
    fill(...VIOLET); for (let i = -2; i <= 2; i++) rect(footX + i * 11 - 3, -5, 6, 5, 2)      // tread
  }
  // chest: a speaker cabinet; the cone pumps with the kick
  const cx = sway * 0.7, cy = -222 + dip
  stroke(...EDGE); strokeWeight(5); fill(...SHELL); rect(cx - 52, cy - 74, 104, 150, 16)
  noStroke(); fill(22, 18, 40); circle(cx, cy - 22, 70 + bang * 10)
  fill(...VIOLET, 210); circle(cx, cy - 22, 44 + bang * 18)
  fill(22, 18, 40); circle(cx, cy - 22, 16 + bang * 8)
  for (let i = -1; i <= 1; i++) { fill(i === 0 ? MINT[0] : 255, i === 0 ? MINT[1] : 96, i === 0 ? MINT[2] : 150, 120 + treble * 135); circle(cx + i * 22, cy + 56, 9) } // three lamps, lit by the treble
  // the front of the coat: two panels hanging open over the speaker, lapels, a stand-up collar
  for (const side of [-1, 1]) {
    stroke(...SHEEN, 170); strokeWeight(2); fill(...LEATHER)
    beginShape()
    vertex(cx + side * 60, cy - 80); vertex(cx + side * 26, cy - 80); vertex(cx + side * 40, cy + 74)
    vertex(side * 30 + drift, hemY + 2); vertex(side * (76 + flare) + drift, hemY + 2); vertex(cx + side * 62, cy + 30)
    endShape(CLOSE)
    noStroke(); fill(40, 36, 56); beginShape(); vertex(cx + side * 26, cy - 80); vertex(cx + side * 52, cy - 74); vertex(cx + side * 34, cy - 4); endShape(CLOSE) // lapel
    stroke(...SHEEN, 150); strokeWeight(2); noFill(); line(cx + side * 40, cy + 74, side * 30 + drift, hemY)                                    // the coat's edge
    line(cx + side * 58, cy - 70, cx + side * 60, cy + 26)
    noStroke(); fill(...LEATHER); beginShape(); vertex(cx + side * 22, cy - 78); vertex(cx + side * 50, cy - 82); vertex(cx + side * 44, cy - 104); endShape(CLOSE) // collar
  }
  // the belt: silver, with a buckle that catches the light on the kick
  const beltY = cy + 26
  noStroke(); fill(...SILVER); rect(cx - 50, beltY, 100, 12, 3)
  fill(120, 126, 142); for (let i = -4; i <= 4; i++) if (abs(i) > 1) circle(cx + i * 10, beltY + 6, 3)
  fill(232 + bang * 23, 236 + bang * 19, 245); stroke(120, 126, 142); strokeWeight(2); rect(cx - 13, beltY - 5, 26, 22, 4)
  noStroke(); fill(...LEATHER); rect(cx - 6, beltY + 1, 12, 10, 2)
  // head: a little monitor on a spring neck; its face is this track's own waveform
  const hx = sway * 1.5, hy = -352 + dip - bang * 14
  stroke(120, 112, 170); strokeWeight(6); noFill()
  beginShape(); for (let i = 0; i <= 6; i++) vertex(lerp(cx, hx, i / 6) + (i % 2 ? 7 : -7), lerp(cy - 76, hy + 38, i / 6)); endShape()
  stroke(...EDGE); strokeWeight(5); fill(...SHELL); rect(hx - 50, hy - 38, 100, 76, 14)
  noStroke(); fill(12, 10, 26); rect(hx - 39, hy - 27, 78, 54, 8)
  fill(...MINT); circle(hx - 60, hy - 6, 13); fill(255, 96, 150); circle(hx + 60, hy - 6, 13)  // a knob on each side
  stroke(...MINT); strokeWeight(3); noFill()
  beginShape()
  for (let i = 0; i <= 24; i++) {
    const v = wave ? (wave[i * 10] - 128) / 128 : 0
    vertex(hx - 32 + i * (64 / 24), hy + 4 + v * 60 * sin((i / 24) * PI) - sin((i / 24) * PI) * (5 + bang * 9)) // rests as a smile
  }
  endShape()
  noStroke(); fill(...MINT); rect(hx - 22, hy - 17, 12, 5 + bang * 5, 2); rect(hx + 10, hy - 17, 12, 5 + bang * 5, 2) // eyes
  // an electric guitar, slung low at the thigh so the belt shows, and plugged into the robot's own chest
  const bx = -30 + sway * 0.4, by = -104 + dip
  const nut = { x: 262, y: -300 }, joint = { x: bx + 58, y: by - 30 }
  const ang = atan2(nut.y - joint.y, nut.x - joint.x)
  // the lead: out of the body's jack, drooping, up into the chest
  stroke(20, 16, 36); strokeWeight(5); noFill()
  bezier(bx - 58, by + 26, bx - 120, by + 120 + bang * 10, cx - 110, cy + 110, cx - 52, cy + 40)
  noStroke(); fill(...MINT); circle(cx - 52, cy + 40, 11)
  // neck: dark fingerboard, bright frets, a pointed headstock with six tuners
  stroke(34, 26, 52); strokeWeight(14); strokeCap(SQUARE); line(joint.x, joint.y, nut.x, nut.y)
  stroke(...EDGE); strokeWeight(2)
  for (let f = 1; f <= 12; f++) {
    const k = (1 - Math.pow(2, -f / 12)) * 1.9 // real fret spacing, squeezed onto the neck
    if (k <= 1) line(lerp(nut.x, joint.x, k) - 3, lerp(nut.y, joint.y, k) - 7, lerp(nut.x, joint.x, k) + 3, lerp(nut.y, joint.y, k) + 7)
  }
  push(); translate(nut.x, nut.y); rotate(ang)
  noStroke(); fill(26, 20, 44); beginShape(); vertex(-4, -9); vertex(52, -15); vertex(66, 2); vertex(40, 11); vertex(-4, 9); endShape(CLOSE)
  stroke(...MINT); strokeWeight(2); noFill(); beginShape(); vertex(-4, -9); vertex(52, -15); vertex(66, 2); vertex(40, 11); vertex(-4, 9); endShape(CLOSE)
  noStroke(); fill(...EDGE); for (let i = 0; i < 6; i++) circle(6 + i * 8, i % 2 ? 6 : -7, 5)
  pop()
  // body: an angular slab with two horns, an edge that lights on the kick
  push(); translate(bx, by); rotate(ang + 0.10); scale(1.3)
  const body = [[-78, -20], [-58, -50], [-6, -40], [34, -58], [70, -44], [52, -18], [78, 8], [58, 40], [8, 34], [-40, 52], [-80, 26]]
  noStroke(); fill(22, 16, 40); beginShape(); for (const [x, y] of body) vertex(x, y); endShape(CLOSE)
  stroke(255, 60 + bang * 120, 130 + bang * 80); strokeWeight(4 + bang * 3); noFill(); beginShape(); for (const [x, y] of body) vertex(x, y); endShape(CLOSE)
  noStroke(); fill(...VIOLET, 70 + bang * 110); beginShape(); vertex(-52, -30); vertex(-8, -24); vertex(20, -6); vertex(0, 22); vertex(-44, 30); vertex(-62, 6); endShape(CLOSE) // scratchplate
  fill(...EDGE); rect(-34, -13, 12, 30, 3); rect(-6, -13, 12, 30, 3)                           // two pickups
  fill(12, 10, 26); for (let i = 0; i < 6; i++) { circle(-28, -9 + i * 4.4, 2.5); circle(0, -9 + i * 4.4, 2.5) }
  fill(...EDGE); rect(-64, -12, 8, 28, 2)                                                      // bridge
  fill(...MINT); circle(-58, 34, 9); fill(255, 96, 150); circle(-42, 40, 9)                    // two knobs
  stroke(...EDGE); strokeWeight(3); noFill(); line(-62, 18, -92 + swing * 3, 30 + bang * 8)    // the bar, shoved on the kick
  pop()
  // strings: lit, shivering when a chord rings, and throwing sparks when it is struck
  for (let i = -2; i <= 3; i++) {
    stroke(MINT[0] + ring * 120, 255, MINT[2] + ring * 40, 150 + ring * 105); strokeWeight(1.2 + ring * 0.8)
    const o = (i - 0.5) * 2.2
    line(bx - 50, by + 12 + o + sin(frameCount * 1.7 + i) * ring * 3.5, nut.x, nut.y + o * 0.8)
  }
  if (ring > 0.35) {
    noStroke()
    for (let i = 0; i < 9; i++) {
      const q = (frameCount * 0.07 + i * 0.37) % 1, d = 18 + q * 64 * ring, th = i * 2.4 + frameCount * 0.03
      fill(i % 2 ? 255 : MINT[0], i % 2 ? 230 : 255, i % 2 ? 120 : MINT[2], 255 * (1 - q) * ring)
      rect(bx - 20 + cos(th) * d, by + sin(th) * d * 0.7, 4, 4)
    }
  }
  // arms: jointed tubes ending in a clamp. The fretting clamp slides to the chord's fret
  const arm = (x0, y0, mx, my, x1, y1) => {
    stroke(...LEATHER); strokeWeight(17); strokeCap(ROUND); noFill(); line(x0, y0, mx, my); line(mx, my, lerp(mx, x1, 0.82), lerp(my, y1, 0.82)) // the sleeve
    stroke(...SHEEN, 130); strokeWeight(2); line(x0 + 3, y0 - 5, mx + 3, my - 5)
    stroke(...SILVER); strokeWeight(5); const ux = lerp(mx, x1, 0.80), uy = lerp(my, y1, 0.80), ex = lerp(mx, x1, 0.86), ey = lerp(my, y1, 0.86); line(ux, uy, ex, ey) // a silver cuff
    stroke(...EDGE); strokeWeight(7); line(ex, ey, x1, y1)                                      // the wrist, bare metal
    noStroke()
    fill(...SHELL); stroke(...EDGE); strokeWeight(3); rect(x1 - 11, y1 - 9, 22, 18, 5)         // clamp
  }
  const kf = min(1, (1 - Math.pow(2, -handAt / 12)) * 1.9)
  const fx = lerp(nut.x, joint.x, kf), fy = lerp(nut.y, joint.y, kf)
  arm(cx + 50, cy - 50, (cx + 50 + fx) / 2 + 14, max(cy - 50, fy) + 46, fx, fy)
  const sx = bx + 6 + swing * 4, sy = by + swing * 26
  arm(cx - 50, cy - 50, cx - 96, cy + 12, sx, sy)
  }

  // the camera feed for the big screen. The robot is drawn once, flat, on a cleared corner of the canvas and
  // kept as a picture, so it can be laid on the screen in strips that narrow towards his head
  const SRC = { w: 500, h: 420, ox: 165, oy: 416, k: 1.2 }  // drawn a little large, so the close-up stays sharp
  const cv = drawingContext.canvas, dens = cv.width / W
  clear()
  push(); scale(SRC.k); translate(SRC.ox, SRC.oy); robot(); pop()
  const fw0 = ceil(SRC.w * SRC.k * dens), fh0 = ceil(SRC.h * SRC.k * dens)
  if (!feed || feed.width !== fw0 || feed.height !== fh0) { feed = new OffscreenCanvas(fw0, fh0); feed.pen = feed.getContext('2d') }
  feed.pen.clearRect(0, 0, feed.width, feed.height); feed.pen.drawImage(cv, 0, 0, feed.width, feed.height, 0, 0, feed.width, feed.height)
  background(10, 7, 20)

  // the big screen: a camera down in the pit, looking up at him on the stage
  noStroke(); fill(30, 26, 52); rect(SCREEN.x - 8, SCREEN.y - 8, SCREEN.w + 16, SCREEN.h + 16, 8)
  fill(14, 10, 30); rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h)
  drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h); drawingContext.clip()
  // a hand-held camera: it drifts, and pushes in on the kick, about the spot where he stands
  const camX = SCREEN.x + SCREEN.w * 0.33, floorY = SCREEN.y + SCREEN.h
  push(); translate(camX + sin(now * TWO_PI * 0.25) * 9, floorY); scale(1 + 0.02 * sin(now * TWO_PI * 0.5) + 0.04 * bang); translate(-camX, -floorY)
  // the rig, seen from underneath: its truss high in the picture, every lamp a glare, the beams fanning down past the lens
  const TRUSS = SCREEN.y + 20
  noStroke(); fill(40, 34, 66); rect(SCREEN.x - 40, TRUSS - 5, SCREEN.w + 80, 4); rect(SCREEN.x - 40, TRUSS + 3, SCREEN.w + 80, 2)
  for (let i = 0; i < 6; i++) {
    const { sweep, power } = lamp(i), hue = HUES[i]
    const lx = SCREEN.x + 46 + i * 94, facing = 1 - min(1, abs(sweep) * 1.4)                    // brightest when it swings across the lens
    const tx = lx + tan(sweep) * 330
    fill(hue[0], hue[1], hue[2], (26 + treble * 40 + bang * 34) * power); triangle(lx, TRUSS + 4, tx - 150, floorY + 60, tx + 150, floorY + 60)
    fill(hue[0], hue[1], hue[2], (24 + bang * 30) * power); triangle(lx, TRUSS + 4, tx - 44, floorY + 60, tx + 44, floorY + 60)
    fill(hue[0], hue[1], hue[2], 70 * power); circle(lx, TRUSS + 4, 30 + 46 * facing)           // the glare
    fill(255, 250, 240, (120 + 135 * facing) * power); circle(lx, TRUSS + 4, 7 + 9 * facing)    // the lamp itself
  }
  for (let i = 0; i < 5; i++) if (strobe(i)) { fill(255, 250, 235, 230); rect(SCREEN.x + 84 + i * 94, TRUSS - 4, 18, 5, 2); fill(255, 250, 235, 26); circle(SCREEN.x + 93 + i * 94, TRUSS, 90) }
  for (let r = 0; r < 4; r++) { fill(150, 140, 255, 15 + bang * 9); ellipse(camX + 10, floorY - 70, 470 - r * 90, 380 - r * 70) } // haze, lit from behind him, so the black coat has an edge
  // him, from the waist up: looking up from below, he is widest at the belt and narrows towards the head
  const RISE = 1.15, STRIPS = 105, cut = SRC.h / STRIPS, WAIST = 0.38       // the share of his height that falls below the picture
  const near = j => 1 / (1 + RISE * (j + 0.5) / STRIPS), rise = j => cut * Math.pow(near(j), 1.2)
  let above = 0, below = 0; for (let j = 0; j < STRIPS; j++) if (j < WAIST * STRIPS) below += rise(j); else above += rise(j)
  const zoom = (SCREEN.h - 8) / above
  const pen = drawingContext
  for (let j = 0, y = floorY + below * zoom; j < STRIPS; j++) {                                 // from the boots up; the legs fall outside the screen
    const dh = rise(j) * zoom
    y -= dh
    if (y > floorY + 12) continue
    pen.drawImage(feed, 0, (SRC.h - (j + 1) * cut) * SRC.k * dens, feed.width, cut * SRC.k * dens, camX - SRC.ox * zoom * near(j), y, SRC.w * zoom * near(j), dh + 0.7)
  }
  pop()
  noStroke(); for (let y = SCREEN.y; y < SCREEN.y + SCREEN.h; y += 4) { fill(0, 0, 0, 46); rect(SCREEN.x, y, SCREEN.w, 1.5) }  // the screen's own lines
  fill(255, 255, 255, 10 + 26 * noise(frameCount * 0.4)); rect(SCREEN.x, SCREEN.y + ((frameCount * 3) % SCREEN.h), SCREEN.w, 10) // a bar rolling down it
  fill(255, 60, 90, 150 + 105 * (floor(now * 2) % 2)); circle(SCREEN.x + 20, SCREEN.y + 18, 10); fill(255); textSize(14); textAlign(LEFT); text('LIVE', SCREEN.x + 32, SCREEN.y + 23)
  drawingContext.restore()
  // then the lights, the deck, and the robot himself, small against his own picture
  lights(); deck()
  push(); translate(330, STAGE); scale(0.52); robot(); pop()

  // the fretboard, close up: nut on the left, high e on top
  const X0 = 640, X1 = 990, Y0 = 150, GAP = 42
  const first = chord && chord.fret > 3 ? chord.fret - 1 : 1
  const fw = (X1 - X0) / 5
  noStroke(); fill(0); rect(X0, Y0 - 22, X1 - X0, GAP * 5 + 44, 6)
  stroke(210, 200, 180); strokeWeight(first === 1 ? 9 : 3); line(X0, Y0 - 22, X0, Y0 + GAP * 5 + 22)
  strokeWeight(3)
  for (let i = 1; i <= 5; i++) line(X0 + i * fw, Y0 - 22, X0 + i * fw, Y0 + GAP * 5 + 22)
  noStroke(); fill(170, 160, 190); textSize(15); textAlign(CENTER)
  for (let i = 0; i < 5; i++) text(first + i, X0 + (i + 0.5) * fw, Y0 + GAP * 5 + 46)
  for (let sN = 0; sN < 6; sN++) {                               // sN 0 = low E
    const y = Y0 + (5 - sN) * GAP
    const live = chord && chord.frets[sN] >= 0
    stroke(live ? 255 : 120, live ? 235 : 110, live ? 170 : 110); strokeWeight(3.2 - sN * 0.25)
    noFill(); beginShape()
    for (let x = X0; x <= X1; x += 8) vertex(x, y + (live ? sin((x - X0) * 0.05 + frameCount * 1.3 + sN) * ring * 5 * sin(((x - X0) / (X1 - X0)) * PI) : 0))
    endShape()
  }
  if (chord) {
    // the barre (if there is one), then the other fingers
    const bxr = X0 + (chord.fret - first + 0.5) * fw
    if (chord.barre && chord.fret >= first) { noStroke(); fill(70, 220, 255, 230); rect(bxr - 11, Y0 - 12, 22, GAP * 4 + 24, 11) }
    for (let sN = 0; sN < 6; sN++) {
      const y = Y0 + (5 - sN) * GAP, f = chord.frets[sN]
      if (f < 0) { fill(255, 90, 110); noStroke(); textSize(24); text('x', X0 - 20, y + 8); continue }
      if (chord.barre && f === chord.fret) continue
      noStroke(); fill(255, 60, 110); circle(X0 + (f - first + 0.5) * fw, y, 27 + ring * 6)
    }
    textAlign(LEFT); noStroke(); fill(255); textSize(70); text(chord.name, X0, 98)
    fill(170, 160, 190); textSize(20)
    text(chord.frets.map(f => (f < 0 ? 'x' : f)).join(' '), X0 + 150, 91)
  }
  // the audience, in front: two rows of heads bobbing to the kick, hands in the air, a few phones held up
  // now and then somebody takes a photo: every tenth of a second there is a small chance of one flash, from one of them
  const rnd = n => { const v = sin(n * 127.1) * 43758.5453; return v - floor(v) }
  const tick = millis() / 100, shot = floor(tick), snap = rnd(shot) < 0.10 ? { row: floor(rnd(shot + 0.3) * 2), i: floor(rnd(shot + 0.7) * 30) } : null
  let flash = null
  noStroke()
  for (let row = 0; row < 2; row++) {
    const baseY = H - 16 + row * 16, sizeK = 1 + row * 0.25
    for (let i = 0; i < 30; i++) {
      const seed = i * 12.9 + row * 78.2
      const x = (i + 0.5 + (noise(seed) - 0.5) * 0.9) * (W / 29) - 14 + row * 17
      const tall = noise(seed + 4) * 22
      const bob = bang * (7 + noise(seed + 8) * 9) + sin(now * TWO_PI * 2 + seed) * 2
      const y = baseY - tall - bob
      fill(row ? 5 : 9, row ? 3 : 6, row ? 12 : 18)
      ellipse(x, y, 30 * sizeK, 32 * sizeK); rect(x - 20 * sizeK, y + 10, 40 * sizeK, 80, 12)
      noFill(); stroke(150, 130, 230, row ? 50 : 95 + bang * 80); strokeWeight(2); arc(x, y, 30 * sizeK, 32 * sizeK, PI + 0.5, TWO_PI - 0.5); noStroke() // stage light catching the tops of heads
      if (snap && snap.row === row && snap.i === i) flash = { x: x + 12, y: y - 26 }
      const mood = noise(seed + 20)
      if (mood > (x > 610 ? 0.93 : 0.60)) {                                 // an arm up, pumping on the kick (few in front of the chord chart)
        const hand = y - 34 - bang * 20 - noise(seed + 30) * 14, dir = noise(seed + 40) > 0.5 ? 1 : -1
        stroke(row ? 5 : 9, row ? 3 : 6, row ? 12 : 18); strokeWeight(7 * sizeK); line(x + dir * 14, y + 8, x + dir * 20, hand); noStroke()
        if (mood > 0.86) { fill(190, 220, 255, 150 + 105 * noise(seed, frameCount * 0.05)); rect(x + dir * 20 - 5, hand - 12, 10, 15, 2) } // a phone, its screen glowing
        else { fill(row ? 5 : 9, row ? 3 : 6, row ? 12 : 18); circle(x + dir * 20, hand, 11 * sizeK) }
      }
    }
  }
  if (flash) {                                                        // the flash: a hard white point with a brief bloom, gone within a tenth of a second
    const life = 1 - (tick - shot), hot = life * life
    noStroke()
    fill(255, 255, 255, 26 * hot); circle(flash.x, flash.y, 150)
    fill(255, 255, 255, 70 * hot); circle(flash.x, flash.y, 56)
    fill(255, 255, 255, 255 * life); circle(flash.x, flash.y, 13)
    stroke(255, 255, 255, 230 * hot); strokeWeight(2); line(flash.x - 30, flash.y, flash.x + 30, flash.y); line(flash.x, flash.y - 22, flash.x, flash.y + 22)
    noStroke()
  }
}
`,language:"p5js"}],thumbnail:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAABACAYAAADS1n9/AAAQAElEQVR4AeR9CZhcR3XuX3X33runZ5VG0kiWLMsSthFeWIy3mARe2GIMhrCExUlI8gjEEJI8HoFHNgjg70s+SICYJIbYwIMABmy8gHdkW5YX2bJ2aTSSZl96er/dfe99f92eHs2Mp8cs/l6e9a76v1V1aj/n1KlTdSVbZlPrgxa6s5uDTQMXB2esfWnQw3iLrsK+7s3Bmr6zg9U9W+bLK7rC2r7twVlnXBYM9F+wKK8zvSGso+r1dJ65KK+va2vY14Y1Lw2y6TMC1U4LPdlN8/VatFY4sPr8YPOGS4N1DFu0Vqj6Uehd0ldv59mB6meg/8KgK7NpUV/vv/YDwUev+4sQrXZa4cDqC4LN6y/hWF68qE4rvyM5EESs7AsS8Wh3OG5ZruTRgoBAJtWLeCwLy4ygVnfnUSwWkJvNIV+Ynaep/HqjxvId6MysRizdA2Ha8/lurRrWUfXK5eI8XdWzrShSyS7Eohl0pFcvyitXSvP1VNkWGl4dkUgKnR2rEU9m0fAbi+qpfhRKS/oSQiAR60DUScL3vUV1brrpO/ja17+NL3/la4voqs8Iy2fSvbDN6Hxei1cqrFQLeKE/cuEECsUpFAvT+FzqQry74zykkj1EL9LJU2jRUqQpJBM9VKACZjUP2X/8ApIDm8M6qVRfM5wrp8ouRMPzUKGgX/bKv8MrL/8c0mH5lesk4t0olfMo2hWs+dLVUOlUOEY1zuWRZr5FAcYtF198h4stazvmx5Wmsq9efQb77sWqvg1UrH7G++bna0PgrVofBuw066j2e7kwogtZ9oKPL1KAIPDhlmfxJwe/h3888hPkcxPoqwNrGto8Mg2JWq2Oer0xj0q1gpn8FA7+zttQyxegr90Afd0Z0PrWsIxHnCq7sF6hVMaTT3wNjz78j0inzybOgqbF25ZXdUU2ikrEx56P/wfcaB253PiymJ0dR8aaDpEyxtEZncRND1fgOAHi0QCO7aMjY8O2fGSjOrYk03hxbw/Oy3ZhVUOgtw5ki2XcffIJNHKTYR+e18Dp9ixSADW5Ms3stBZgXboff9q/EeemunDVe65BR3YVLrz0Mrz/A7+Hvt61XH0di+BUGogKEx1btyOeyCKV6EKmaw26N56Lzs4BdHWufxZ6e7dwRUn09GxBMtGJZLITPd2bF7WbiJ/qJ9XZg0Q6C8s1kAw60HPmZmQHBpBkX0txzvouJGIZbk8Z9PaugbC7MVFJIhZJoaujAxdddAE+8qfX4rrr3ov12TWIRhLMSyKV7sBbrr0afX398C0HNdOCtKNIJ7qhSR2n2yOXm5Da22ZLUzACAdRLmJqaxq9fcwUmp8Zxz233YGZyBIXi9CIUSzlUqiU0ikV0rVmFqy69GJuy3Thrw0Zs2rgJGzduXIRNTJ/7orNRLucgRA6vf8PFcN0S/CCA2h6qbhnlSmFRH2WvgFJpBuv7s/RVLFRLJYi4hSLHWihOsuwClHIozOH8l5+HLeecidlijtYljyCoYM+eZ/C5z96Az3/+q5iipctzHAowPZyxdS3e+oE3oFCegecWw7DKuB/8f2ABlEJYtgk4Gh6kAgxGotj54C7c952fojIxg+mZaWi2hkjUChGLR7hqUshkMkgm47AbFaxfux533PUTHHryZzi4ewcGB595Fo6SdujgE3jday/nvp7DjocnEU8kYBh1RCIGEokYUqkkOjqypEcRjVmwObiIpePw0aPIe1VEDA2JriSyPX1Ismw0FmG5JgzHgR1p4t67for9T+yERVpPVwKmbcN2zHmYjoEW3JqLp+7fje9+9XuIZWJIx2JwYjZMzldKyRGcXr9lZ1QpVzCey2Gi5CJakagUqqjkK4hXdXjFGgr5Ep3FMmquCFEu1VEoVELMTo7B5nYww5b3Hn0Chyf3YTQ5g70HdmLvwUcxmprFviOPQaXHxsagCRuy4iM/m0M0ugmzbLvVVit0q0C9piM/XUQ+V0KhWEV+pogKZZGfLMC1NFRZplyqIT+bD7H3yAzHWAhRLuXhu7NIRwSE56JUKKFUPIWhmQlak2qIOuf8xF2PAZMuvFoD8AKIUoM+wCw8z2ePp8evNQuKqRU9FUrudZFIBnmavAp9giE3jxFuBcdrBRjMWxvt4irNQNctqLItRDZ049x7/wiRug/Z8OGs3RAy8Mw/fxMuuOk6DFz7Kmy87vUQ7EoIEZr7NYaBH2w5C/X8MdTrFSTiqxGL9Sxqt9W+46QhckD1ZA7VkVnUp0rQWD860AOrOwXLisM0YxBCQhAnp3zoXLXpqAVNNwHOp+hKRG0drTZV6EHApQOsSx12EYjpNhxpIqvHYJkmpmQNQkicjs+yszLNKAQnXPTrcOGjm0ytc28uejUkImlkIhn0WQmuXg2C5VpwB2ew+7IvwBAGgpkc0tvPROysM/HI1Z/Fzt++HoNfuRM7r/kc0udvRGRtFzzeIRyrubjmqZ2oIUCjXqTJ34hEYjUVoQ9iQdutuBKYYychocOveZCahKQyRQc6YaYiME2FKADBewKB4zRFJc/CSM7HxGSJ9xgVxBwJQxMQ4hTG2fexiXHIAIhoBpXAAnMx06hCGhoV3sHp+CyrAAGFHXBF1KgABZrMhDQQJ6Rho0BaVGpkP9ClO2GoLleCQAlDh8gHdOYqqJcLmN7xFOqlAHqmg7wjZylkENMP7Uf52DgFRAVzKzjCs73Hduu0MgF8JKkAJpUwEe9jPVoKXt74CxBwfBqPowIS7lQBfr0OaemwB7LQ6BTqugkhBAxD55HPRIWKUiU834cXM6B1RaBFNMSu2MJtqxhidGwCLi++DlYnMVidJqYwXJuFLiQM9qPrGmzbwun2yOUm5POGrcHV7jZc1BiCypDgylLhrFtAtV6GQyF4VI6UYpAIoGkmmwrgUZDF4gwCCsWRJhwlyN51SPQOIOqkFkGjIhUKM6jTcaxUc9zHZ7k3jwNSR4TbgGAYi3VRZzx4dPoWolGrcLUK7tM1VOmcNioVCLWye2IQFHIkmoBl6zB0H42Gh1qjgRoVoGxE0Rirw6OvMHrfM8jzhlNBcj4mBBrc8lzOuUoYTAvWSWsWfPLEMDQ4jgUhBOd6evzkctMQFKqkcBTyZERF05Ek47IGmSs0aNKARabEdAeWGcOqaA9MKoAUimUaNmw4E2t4w3Z27zZs6jkLZ217JbZtvxLnnv9qnLftsnls2vgiBGSmqgcKwKeQfb8Gw7B5QZOEY1OIbD+bPZO0KITQF0FyXLaVgFf2gEBCt21uAzHE13QhvbaHKzbOsUoIKSDoK3R85v2oDuZQyM9i4/r1uPgjbwzzpZCcn8O2WZZxXWhc+RoiVGAhBLJmHLZmARDQ2Y7j2DhdHrncRASZIMkEBc8wITQdGpkf1S0oJSjQ3BuagWw0iwT3Y4PCX2WnYTNfI/2Gf/sKntp/J0bGRlHUDe7vOtZuuwBnbn8lous2w+3uR8mOYbxWw03fuh5R+hUQAlJaUEpXr5XgRDJIpTdCOXW67qCr8yxEnAw0NZY5CN7YaZpJq5JBUObVXT1AvK8DsXgMViaOaG8XEokoNCrz2t+4DM/87r8pPUOmowddV27F0c/9O7qSBqSQiGk2NNEUfEsBLM5F5WnM3xLpRuvRdR2xWLSVfEGHcrnRCyEoDwmNDNANh7uyQF34iHFFOKRJSBhmDAYFnqRwlNAUeq0EErrNO/4JevQ1jE88SWewgBhXj0EFqpsmymScT4EE3E8H994Jr1GFkc3AdpKw7Tj7FfC4tWisI6WORHItNO7pKp7JDCAe62MZGSLgSUNKCQVRFLBNE1agIbK6A9I0IA0d0c4u6NEItFUdgGA9aSB64WpM3nU7NFodTQqc2ZGAErSCLrX5eFSNQdURAopuMA9zj5QSsViM4xBzlBdmIJcbtnKyAu77yhQHZFKDK75Ij12DgEF0mTHUEcAnHVSPhEavn+UDQo+4dOKi6F91JmzLwkVnDWDbpjO4V5eR7Mzg8vNejFe89KXoCHKIRxJY078FtekDbG0EGgUFtinI9Ep5CjqVT0odlpXkyvUIn954huhkPEBAx1D1qeDQ/MsqfQW3DmgcZ0cU0awD6VjY+K7fRHpVFutfsx3dr92M8gMP8+6hCk0D0lEBh5FEBAg4V0GGqFCBFI6L/ZDOCCRULgvM/S66cCsG1q1mO3KO8uxAiMV1nl3i56MohVup5HPlq7qapkGFC7HsyJVHL4QIGeLRKZrg+b/OvblAZ81UTOCcKvTYq1y9Ch79BEHnTynK8MQRzMyOIp+fhM6V+9B99+Ge730TTz96Px746Q9xy09+gHt//D3MVslYCnA2N4bc9DAaNPs+rUxD9+EFDVqQAi1BjU5ZDZpuQwidtAoa7FNZHptbj88vig06qrTI0KiI9YkiFc1FbbYIYUgk13bgrPe+ls6ijkf/9puYfvRR5G97mO2wfV7q2AYQFSbn6bH9BhXN48nEQz2oh1DzUQzyqZQKnPZC3uG973wd1qxJ8Kp4HGV3cll0dtHqtclr1Vk3kFq2bitfhX2roiuWybIfD/kVy5z/kvWLxq8San4qXAJBphtQK0ChwZXtcwnUyAiTZl/nCo3RlAZcGYopCnGuVsvkdsGytXqVpQUk9+p6ncMaG8bE+CCGj+7GTIHMQh0uJGQ8yXLg8atKb3wGgqMRtBpwdEAKpiVMM0rhCDjRLKRuAAIcmwnDiCBqd9J/iMLQtSZd6mgUqqoI+i88E71XnIOD9z6G8buegUnLpNo001FITVK5gIQl4bCOqVPZAdhs3iICtqCgQULNVTIMOFIpBF7IT7DM4OUyNJIEmWpDSm0eLoUdMK3R3Kc1BxoZF9NM6Ax10izewsVsEyVeu6p6QpBZgcDQ8FMYmzoCr1pHV9c5KI6dxDTP2lOFMZipDDwKz+WRrlIpYnp8H9s1QkGbyQyPbUXoVDiTpw+FaKQLGvvUpAGDViEWjSGZXg0pdaI51lgqjfPeeyVS3SkcvPlnqA5Pwo83oNkmy8gQZjIKPWIiRgulCQ1RS4MmZYiko4VC14SEIVSceYxLIioNnG6PXG5CpmlDcPIL4QkBXbNQ4UrQyHArZIZGJtowuRrr3ALuPXAbV2SCJtaFKmMaJmLxVXjt6/4dV7z8b3H2trfjikv/DhddeB1EPAXHiSPStQqKuS6//o0efwQnD92K/PQRSAraiCZgxlMwrRg0zUAkwhXPI6eKW1YULvf8CiGNLloRDe94/bW46pVvRd/+JO77xM0wbB1ah42aoB2LxPl1scoPT1VUqxVUeb53qAAps4Yqv334/OBQ5TcGr1xDTNR4kVVFreTydNFAtVRFhXk+vzUU8kVub4UQHrcgQECI9gAfIdrnCyFYAiu2IcTPUQbNRwjRtq1micXvZRVAUsCAABYgz31e0qQ3aAkEbUlSmGGuZLzUKOPewdspoDiKpVn43NvBJ5tdh8uv+Ax0I4Lpyf14aseXuN8GiARxbDvnXQicCPd7qJKbjgAAEABJREFUD2bPKpamgukGJieOYejgHciN7qTUPNS8EgxuFToFLoSERYfQJAABwbS6DtYjBja//aV45KGf4ZtfvhH3/e870LthFQK/CnBly6gJk16exqMhOGOPc3BgQBoanJQDTQpELAH1RKTFQCAdlSCZY2BS/ThP/lRsCQKorbAdVOF2eS3681JGNUK02lwuZPazfmTHs2gUoE80FqFBZ9DlbZha6epTrMe4xv1+pjqDI+OPIR5PQ0jVXECG+GhQYQrFMjw6j3Xesz9w3ycxuO/HuP/ev0SD3/0tI466MODrGkBO69lOZNLdWHv2q1jXw/69t+PEgR9hYvix8KZQ46dcXwa0Pz770RkKgFUzL+pA9+VZPPDpLyCe8bklOLBsDQN967nt1NCouvA5LF/1kbDhWyYtlA/L08MrYo8tOR0OApaR0ud4PdQ5twaV2LJ8ePxjCkkX0w8ZZXEbDCOnyYvTXm4mPoVI1gSn4DFepjA9euhhSMZoFPLQ7AHuoRGYvITJpntYLwhR474+NT0WCq/O04MT6UTA69hEpI8CdhHwcyxlgoD3AVyQEAZXKff9VKITZ7/8fYgm+5DLT+Dk0MM4cejHqJR5qqAZFyxv0DGM9WZw5h+8BHpfA/f+ry/CLZTwrW/dgEOjh3B08gSeeuZhnizq8GjGfXr8MHUqNMeWjCFqxujt+1QAPwwNLYAWs2FGdTSo1AoCAhABj7JB6BM03URAKjpOn0cuPxUBIRaD/hwaLCwEWSGABlfJcOEoMrzA0TyJy/ovwdTMKEs0fzr314r6WzReA1IauPjST+I1r/sqtg68iWkdpfwIZM2lMjSgZ7JhJT2ZRsmdgW5FseHFb8LGbW/i/h/H5NRhDB/7GfITuxEIH52XrMOG956Dif0H8NBnvxbWVa/smnORyA7AYN8RLwGvwhH7AYTnQ+gyFHKNE4llUhyDgGAlBfqD1A8Bhx+SrHgEknN0pMkQsDSJuC1h0VqxOGmLWabrOiKRSFtYPNWslK/yTNNsW1/lK1jPUcY2LURsp207qg01/qWQSwkqLWnKpdTJpAUQOnwhoZMxAhK7Jh/j6mCHgYX1nefBpGedVF/oWEYQBr10jxbi3p/+GSTNpslVF0KP8uudi8d2/TNq+RIAAcm9X5o2dIZThSHodgSG6UBLRLHxRVehf/1ldPjymJ46ieEj9+PErnuw96Z78PTX74QQEoJYtfEVSHasZRsm6xrQDYPbUjc0Jbi6D03T2K6FrJmASSti92SgSR2m3kTCYagZSCVMOOkkHMOEyXxdaoiwre6oDfUktGao4qcD5PKTUOTF4BqCFBpmeQF0YPJxGNS4Wr2B/uQGJDQLRyb2Q2e+TaYJISCgY13/djQaVdx6y3vxwD0fx0MP/h3uvvMj+Mm3fx8x3v8not0w+aVOCAEj3cHVLaC2DpO3c1IzIDUNRjSOWKYf23/nHdj0mksg2MfI0wcw8/QROHYammZiYOtr4CS6ICgshaQjoJROg4StJ2EaEWCuH4dX0SwI3TGhdyagVruCqQskLB2GJqGzXysRg2YYkBDQCNuU0KSAFAILnwa3tXK5jHZwXbdtXqtOjd9EWvF2ofscZaq0pmWebtrVV/SF427FZSuyOPSZDBYh4J7f4IouehV49AfUX9qsg2X4MzWBKvd8n/SsEYUiZztWkWEa1q0+Dx3pNfDpzdcq49Clj/7sJqyhUANu/mknhfBKl5XU3zWwrQhOHnscfsxinQbsNQZWv2EtEmel0BtfD9uIwzQTKJZnYdhJbNn+HqT6N0FIiYD7t8+tCRyHTyeuka8w6kN6FmRdQzTQEQiBMpXTZ9+wDTR4Vazikvu9Medk6roHn22JcG/Q4CMIt4CW6HXRhm3k2Avtt+xM6nUXHr3+hWgwXePqF1zhMSMRMnuUAh0rDqFczVE4WXiNOtK8iDl73RnoX7MWvZkoXtydwdsvfxn+/vd+G19421tw6zvfjW9f/UZc/4rzkc7G0NXdg04KQTG3WC1wK0mjWhhBZ9LBugt7sfa8JGL0Maa/ux+7vn8zJJmfTm3AmvWXh1uDacV5/duAneyE8uSDRhH1WnUetVIJCggMWDWdTmkdZU2gxpWrLFiBpr5GEXt0bmuhlagDog6X83U5n4Yh4Fka/cGAahBAPVFaPBWeDlhWATyudHC6CxFwxTR42eORBz2JddCEFmafKJ1EgY6bT/OjGTr+6E+uw1985H/gQ6++DJ+68HxcvWkA23UH408exOe+/22c//m/xCVf+Bs4NGlXve3X8eZ3vgkf+NB1eP0b3kjh1OCZOl6x5WI8fcvNePhLX8MdH/tn3P3pL+HAo/dh3doNeNVvvAUdq85FPDUAoRlUxAB6zQGtNJUgCzMeBVRiDgGvojlkoFCE0TChG9wO1Nxo7lkZahIatwJV3NID0JAwGkCTqpYC2I+EHrMhhFJTLHlESBdi+VAVFmL5PCGa9J+rjMCK/TAbQv2Za1MIppYAyzzLKoAQEsqESqmjBaHp0IXBDyugCZXYmD0XQki4NLXTxTFMVyZx2c0fw637d2DinoexZrCAK//5s3jzjV/E2//jy/jzH30bjx4fhGSdlB1DxHRw7y33444f3IObbvxX/OimG6HpBs5886U4a+Bs7D/yIAbufTcODD2E1GdeHqZzuVnsGaKTaNiQmgmLF0IanU1dsxBxOmFbCUQTGd4u9kA5gQqaL6Gz3YyIwOCeblMBnGgXdMuCTsfOYJ6m6XD6MrB0HTbjMW4NaZp/QxpoQofJ/pRDCD6moPIzVMpjsx31V+LbIZ5IoF1eix6nX9KKtwvjsfiK7cTjcaTSqRXLhENe8pJL0mFSCdbnVamUOubBSetMg3sjpAZbjyDjdKFB81mjufQrdQx+4luIPz6M3+rfhg9+9yakWUaw3lJs6OyFQ8EdfHQ/RoZm8PTup7Dq8nNwwQffCKSNcAzxzatw94uvg9WVxO4P3oDe154PIQQGDA2ggJSyGPQ3dN2ERphmFJrhIBWNwrbjiPKK2eBpQgnfqdJKUNDCDWAQQpiIxjLQHRu6TsVWME0kupMwGI8ZOgWvw2JfuqZBp1IoKOVVg7OkrgJCoMor5KmpKbRDIZ9vm9eqU+CdSCveLiwUCiu2k2f+zMzMimU44Gf9llUAVcqnM+VRsCqu0DSGjHErqNUrFHuA/tQZiNApK/i82OG9uHtoFB+/8LX4qzu/j0OTY7ClAQnBSot/W3v6UPcaSJK5RkziJX9yNbJb1+PYj+7HE9d/Nyxc2HcS7sQsP+ZMo3JiCiM/2KkMN/Zzo68FVUgKTAgJTdoszz58cFuyIISAwaMmI1AflIx4CjF+L2AhgHcC+48fx3Tg0qXVYTkpCIe3gGEmoEcc6ElHVWW7bE8TcznAqRjCRzyLEpL/n3s914Dk0gI+93kpBTRNwvMqizDKr3gKJ0sjOFY4gZHSKAwjhkCLwNBjENLBP9z3U9x79DAMHhNNYk28E6Zlw+Q5v4VHTg7ho7d9Bzl9GlOzgxi+5wAe+/wPMfbQILSKwNDMGK656kO4+o1/NI9rrvogNpxxBkb3/wwj++7B5PEnMc0vjbmxvRgf2onRfQ9j+uAuHH/mMA4+vhPH9xzA4FNPY3jfYRw4MYyh8Sncd/cOTO45iZE9Q3j64AgOHBvnraGLp4YqOHKyiGeGZ3CwVMRjY3kcni3gOL9sHphhPFfAYaJGJQeaSyGqmTgdHrl0ErP5MUzPDGEmx5XCcGLyMFo4xs+1Lew6QSYzPTY1yC9jExiZHUGxOI37D+yCzxvAfGEMCkWGjeIUZvLD87h//07c/MiPsfuxB7Dnjttx4Kf3Y5ZCz/Pqd2Z8EF+/7Qb84L5/x52DjyDJz72PH3kcP3zkFnzre9djZHQvho8+iuNHfoZRKsDY8B5MTwzixJFHcPwwFeDI0zi6/zEc3LMDR/buwoF9HKc7jJSegbUqDb9Xx7EDe7B3z9M4MnQ4xFBuHMeGj+PwyUEcHjmGI+4EDo4M4ujYIIZnjuHoeBNTM8PhPYXimSMNFbzgIZebQUAzH3CvXwnqnOzRTwjCsgFKngt/Lm4LPTT9rbw0TwGqo6BNmzVuF8FcXTWeJPfEFJ21KPfjfDWP/p71iGpAKpZERBYhDBOum0erjqZZEFKfT0ejPYzz9M7+zJiDy657F/bk9iM3NYz82ATzAnhuLQxbbXiaDNNSBEgIC9IywrSu8fg3NzZtidmv8yLsrA1b8IfveU9bvO7XX9M2r1Xvylde/pxlXn35r61Y5nWvejXe9/Z3rFjGNA3F3kVQcllE+EUSLs/OrfIt4bfSKQq9FVdhF7cKFS4H9ZEIFFYrr1ItQQoN2WIM+x7biemhMWT0HiAQ/J4/Cz2TBTS1RdVaVeA4mfm4EALJZD9e8aG34l3X/Tlu+/D1GN/9DGozxfkyKtIolFXQhG1DsE2V6HBM6FEL0tShSwEhFBU45f0DhtBgGDr2Hn4GX/jqV9vilttvbZvXqncnt81WvF1420/vWrGdW+64Df/y9a+tWKZWqzcnsuAtF8R/4Wg5vC84VW2ClzCtlGKWIbVWEiZXaEK359NLI+7EWJNUr0GTkkyXOHbiSXT0vgLp7pfxQ9MQ/ZFGSPeqs9D44ajOi6lmJUBKA5puhcnNl27HtrdfgiP/+TC+8sn/iUa9HtJ99Y89uZpVgsaL3yQ8FQ2hyFqkOT6dQldEg9ZDKUWMH4NUWh0RVaggW1qhEi9gyF9l7MrsL6yvrEBjwUrO8Bi4MD+pOxALCQviAS+GlCUwai5XeZ45Ar/5hhsRsL14fBUuevmHGfdQrZa5ko/x8mcGiEVY7tQvvXY1Lnn1lagcqGDfzQ+iwmaE0E8VYCzweFxg2OCJgAHbaloFtxFACVuZfjVGqV6ERkugaYywsFgyek38Suxji//1v19pBgHH7/K4yGD+V+EpopWQZJgylQvTvWaylXxWaJULiEbiIb2g/nkZO5ic2ItSaYyCr4aKIYRApHszioUpNPLH4Jtc3QLoOX8tgugs7v7RNzA4/DS/V5DIlhwnxfepX21WfYEE5vSA2wr3eCbUDacqpfFLoQqlbNYXugYzbsOxJJY+kmNZSnuhpZ89q19wBgsFrqoW6QxSbioaImtEw7D1MqQW7p+tdCvUNI1OpA8n1RWS3FoZOx74G2w7553o7NqG3U/ciEZ4LxHwI5EHp+tMCCeNwuRenPW+7Ti8406MPX4A8cQWqp0M21Av04xjoX8QNHy0rIDKV6jPKYUyCkIIGIkIYpZQWSGUEji2FsYXvwLodFQdx2Efy8PkUXilfJVn8oZShSvBNM22fah6lsq37fkyirYUp2Z0ahbyVPSXiy31A1QrS7cGS+qKPI8+K4mlq8eyLVQrVXrpQ2E524rBMSTuuv2/44G7/wzZVG9IV3t1fwedQKZe9L7/ht7tF+LBT38ZWiOFdHobJH0B21686i32x+LzP38ZZ0j5BywYZQMAABAASURBVFVuAxrVRxUUUtIXOcUyI+FA0yUWj1vApzOhfIx28Hjh1S6vRfdogVrxdqHHO4h2eYqu8uv8wKXi7aDmtRS/sgLU+el1aaNLrcLSE4Eq32HEVDCPSrkCyzJpkn2cc96L8bEPfwSfuvQVuObcc/GSrjT+5d1vwcc++VfQNAl/lYeBV22FvmsUOD6L6KrzEFu1FUJvHnN0HiHnG2ZECAHlRzAa/uqFahgufHkVN0yKOQXQYzb7EiGt9cp0RaALrZUMQ6UAivHt0BJMu3xF9/g9RYUr4bnaaSgFoQKs1MZCyxwOnq9fWQHYBnKNigrmoRzB2oIjoiRToxqFO18CPM8bWHiZEnBpuzybV90S3HO6cPZQEe+48R9ww/0/wT2H9mLfvmO4+Zvfwea3XYHydB7jP3gYz/C2b4YrHhRwwP60WCLsQQhJZUqG8dZL1y3MWwb25VVrqNJ9aOWrbaFaabSSYejETAT8Eyb4klS+SMph7PT5yedjKksdQdVmcckRMaZZirwIHfQPxAKK+ts1Ahq02/bgjf/6D/T6mzobjUTgnNON33jzq3D8u7sgTzTQSPLcn+pA66m4udAC6DweKpppxSGoCCregvIFxNwK9ij9ar15Imjl1yu1VjQMTUuHpBMYJuZeDr8SarwnmEu+4AP5fMxgOQVYSpMQSOr2ou40CihrxkKaEALrO3rw0V+7miuzgc7e5gp2sgmcce3l+IPPfBoP/tP38IO3/TFWsZl6rQhpOxBShvUDbkWeX4MwTLQsgTnXdlhg7pVIrA5jvlungoXR+VfQ8NCgZZgnMBJJsDOGrZ9tCBg8Fah+lXUw2V8ykUA7KOVtl9eiR5xI2/rzZfihqhVfLlT9JOLxFdsRYuFya86oyb1m/Jd+K0Z4PK8vbWBmydbgSHNpEW4FJt5z4eUY/9S/Ih3N4nN3/hBH+BVwzarN+N3f/Rg/0XZg1/W3oDJdwJO8r7/ki38bngYcu3m60BOp+Ta9OaujFANULtNKQFuy9UipwTTjUE89V1TBIpQK3qK0JgX0iLWI5hgCRjoKwT/1Rh3FUqktKtVq27xWverzUEb1UyqVV+zrWRrPWT0vCsB2MFYrqGARarwjaBrxJlkwWOoQvuG8l2LH0AkM/PWHMeHHcfa578WV7/trXPWxP0Ui3gX3ZIPjPtWKpGDZDLRyTgUQmsZjWzKM1+rFMFQvo6MzzLPsZp6itRClogm2E9D7btFaYTww+Z3glHNgaIBQ24BA+OisZ+kCQgpITYZjUw5aOygnsV1ei+5z8bTi7UKfZ9R2eYru8zSinEkVb4dTXMT887wpgAd/gbvUbF9RGv7iFWVLHWRfswDfNj3/E7MzuOBl12HLi67B+dduD+8J9n9/GBs2DKBeP+Wxa1LiAxdfGTLdLTUVgE1AmX2lCCru1nj9pyKETh9BMxzoBJMLfgLxeC/vE2i7lioBuaS2B3YyVz6AFIAxd+toQAvTtkGiENA1+glCgxASYhkAAmIZ+kIa+I1jYXrZOJ6jHbB/SIgV+pIcJ5Y8ckn6l0769Kx9avLSBqa98iISp4HYAofQNmzyOkCUexx5j8xQBNt7V+Hw0Qk8smsPhKhhFR27d19wMb7wlnfj60/+BI+eOMxP1qOsV5tv20hlIKgg9YXbjhBQ/kDL5GPBo3EMmh6bvwpuZXGhhVFffTcIY4DDFQ8BSFOHTgYrsrICn/jEVzB+soJsrA+OmVkW42PVZekLyw8OzjxnmePH8yuWGRstQyK2YpkdD+1TQ1+E500BVKtLz/+K5lMx6nTQVLyFmGZCo3BU2tY0WJaNa999BXTuzw/+7AA6s2l++Knjmzd/FhuTKfzxJVfgq7tux6ce/DEmis0Vro6NCZo9LHjCvR8BavVT25HkTZyZ7oTGPhcUDaORSJZyFc+6GeSQm9uAirDk3FCh2SYwl9DJOZcOY6lURbpTKZ+AejadsVkFbRGPxbFuzfq2+Spj08azeKMXUdG26Onu5VA4iDYlhBA4f/tFbXJPkdu3cKrMzx2bWvB1bmGl5RQjKq2wyDceuRc3XP07+P33vxG93fHwZu0b396BHffT2XNz2NTfj88+ei+6u9chkeiAzsueJkwMn3wmbKP10uhNKyVoeNUWKQylaSPa0R/GF78EveZ+BHVvETlf8cO0P0dXW0BI4Ev9gxIG4S8VabLPFBr0uEOawAUveRnD9r+1awYwOj7SvgBzjg0dxeZNWxhr/9u29TxEaDXblRBC4CSd5nb5LXpzBq3U8xA2ltkGSvTOlXlf2Ly6GNJoTnPlEu7Z8zgalTIefeRfsHPH9Tj2+Fd4F2/jrvd/BDfe90McnxrDMC+Inho5DHVXUOMJwI0lUaNgG/z2sLBdPRKlEi0WqMrXWd6yEyq6BAKoBiHNoCDDyNzL4wqfiyJqsBwTQtegWQZjgBQIoRI6rYO6Lv76N76qkm3x9DO7+WGr0jZfZbhuFY8/+aiKtsWdP7mVH8lKbfOVUzg8crJtfitDtiLNsMmIZvyXey81961WlvtmkNCaVuBOKsDH//Bj+Mh5F+ErH/1j/MfV78Dfv/YaXPD5j4Z/ebSRz4XNROtGuMdFfBtOQ4dfraBSmQ7z5l/UfCOZ4pfDsXlSMyIQ7dsISQvSTDffyspHI90QDQkdTXYoLig6+DTmLodkM4sU4MDQCIanmmPSNRHSIjziqgsiqWth+oXyklE7A4WIlaJTBcbTRJOm6L8ofD0CT3cWAUYUDXrivhGhIxWbh8k+LSJwUvj7f/oMPvzD7+Evbvgx3nrrnfjoj2+FbabCsUQYWrTqHdEB6MJBXwfNXxCB7VvQ1b0+z7+i6kLwKllB0oGzpAVJBZHlKrSKO49YvAcWx6dR2AoVV8Ct0Q9wo6hVbBTKGqqujrwKqwbqZQOFokSpaKDhmihVDHByiKd6UGxY9B90nlR06J4N24sgnuwOx/yL8u3/enmrKWcZd7JQiNppCCEY7ySaNEU3uEqjVmoRTdHbQbeSFLYS+Cm4ZPgMzeuQ38ARrxZinzuLQ0Re6ph2G3CFSQUUyM8cQyF3Aj4/bMSonK1+HM8K83jaxMToU/BqLmxaUn26hPrgEdQOH0Tt0IEmjh6GO8x2hg+gMLof+ZF983BnuP/y8kanAig06hKuK1GvWsjP+pgpahiflTg2IXBgNMDuky4eOjKNHUcmsGtwAk8PTWK6mMfMlI/p6QA5lq/VdIi6TQWgF+7Hfm5eteb2XxnKXGkUVa8KYUZBCUClFfRIBr5uYmL2KEZmDiAwbMCMzOd3978MG87+LcyWx0NavjIJVadcL4bp2fJEmPakFqZVm5J7sLRiYXoyf4yMPoL1W34rTKv8QnUmrFPlvq7SChqtg8srXhVX0Jw0tEh6vo5ge2oclUYlpFUa5bANVbYFNS7QArXSvmZA1Wulu/ovRF2TGJs5GLYxyzmpOpW5NlvpgPxQdXzebai5aE4yLK9odnJVyA8VVyhUp8Jx1HgCUmkFjXPhBfR8HdWG6kflKSh+q7m06pR4mlH5RTc3X0elF45d8Vfacaj6CsnOzeE4SrwPUWkFVafqu2Ebs+UxjiuNFj+k2quqVXYwc4RRQTR/kxPPcEUMQR2fLJr12dwgcmGZZv7+ff+JXY98kToz5zH7Dag6tVoxLBBw4ipdKJxyRKanDnDVHArz1cvUHTy284sqGsKj4FWdKhUhJPA1Nblv0T4/NbkXUxN7mdP8zUwfCsfh0pooiuvmw3GoeAuqzVzuaCuJfP44VL0W4cC+7yPP+Umph6SAjqyq02qzlZ6dbf5dBSEE1FymJveH5dVrdHhXOA4VV/C8ejiOMheCSitMcS6l0piKhlBtqH7CBF95tq942qpTr5XCNhqNKnObP1V+4dgVf6enDjYz+T42eE84jnq9zFTzp+pUKzNhIqBzM0n+5ThfRQgVQEVsrqTOjrWIx9KwTEeRQhi6DdNySIuG6aWvzo41iDgJbFj7kvksXTPn4ytHTincyuV++Vw1r43rL8QZ6y6YbyQey87HW5EGBaYJrZVELJqBXOD5dWT6sXXzZSEfhJhn23z5VkSnlbBoKVvppWFXdgDUH6xZtXU+S9JKxmMd0KiAkUiSNxkeMqm+MF+1tW3z5bCtaJj+VV7ZdD/Wrt6KZKJ7vhm5um8zB3M2GjSz41NHoeDWm8cL1akS7mxhDJZlU9BJpOn8cLyIxzNIJbroNE2izBW77/B94QTUwCu1HExewPR0bkA62YNMuheJeAe6OXnVs0lzLMmFTLoPflBn3y7LOwj/R5Ix+hssq/qpNUpY1XOmqgIlNGVVDLbboKXQaMZtK8Z6FttocGyJsIxlRRimiQ7UuB14QQ27996OvYfuYfvdUPOdmD4c1ovQhAsh0N93Fi2Zh0SiG0oY2Y7VmModQ5TC6MysgRLCydGnsfPJ78K2bWgU1Orezejt3oBsZjUFKsIxqvmVq9OYLY6Sp1uRYnsQAZLxTpZpKk0uf5L8yuHg4A7SgK6OdbC4wGZIX0PhTOeO0wkthP2r8VVpyh958j+h5mVzvqojx46jK7uWguwkXzvhcGvt6lxLPtTQ17OJ7UoYuhWO36NcVT2N/JqihTlwdAcmpg4DwoOm6ZD7Dt+PPQfv5qBmIfgHfKpuMWygVq8iXxgnBcgXJ+Byf5+aOY5SOYeZ2eHwPwA5MTWIYnkGGhtr+DR7dOIC3tCp8kMju1mnFCrV2ORhDI/tg2HY0A0dasVN09kr0TRVqrPI0zSqOmOTRzjAI1DlPa7KI8cfhRpskaZUahLTZFCF5r5En8MPGlB1dN3A2NQhKCYWiuNk3gkMj++Fy+1omn0oAQqu5uMjT0HN1yIjlVLnCsMQQlIYD/PmsYbZwih0XWcfJ6FJPRz3BOfToOMKPoqRI+MHqVhVnBjdA/UfwVRzUsLROP9jw0+ynQaVycf+Iw9ASgE1t9HJQ5y3yRYC9jEOISQVNgWPyj/KcZcrs6HQd++7g4KOQnKFKd4XypOcQzlMj04cpIxy0DnXeCzDvndjjO26boH8n8SJ4T3swwr7VUqoFG+SY69xK1AKXeOidnmXYtGSuKQVy1NQ8pQB9wSOjEeZCjXIU9FQc6a5T84WR0INU8RCaRK5/AiUwGLRDk6swCvXssoKJ1yp5inUSpivFEExy+UeNkbBq7yIk4JUzKUWTk4PhZNya836qpF63Q2Z49OXqDdc1LnvCSEYuiiUpkJBK2Grsgp1lpmZPUFzqZja3FcrVKQ6haUmrcq0UKkWON58mFTzVf+bOZVQK0fNUQnY4LbneQ0qz3GOYwxVjj3OraJQmoBSFCXgUiUHj+Pz2EeJQlNjUMycmD6KunKkhVTNhttHlI7qDPmlhK1WrFKugEcYnSvTZF8hL7lwSuVp8myaPFS3D+Dn3CkqUR1KCcpcHHXywafTaXLhlKu5UMkPD+1ElFuUamsyNxQqRp1WMZdv8kHNR/WnBiOFRqV4MCwtK7SIAAABdElEQVSjxlooTipyiApl1hxxmAQVoOnQtRpS5OncKSdOpRVy+VEVLIJPRVKWQxE9rtwCFUbFW1DCazHeo6VQZVp5zVAxQKGZ8jlpn45kQIesSVn+3aAiLMzxKSBAYOHjs52F6VZcCUHFA/ahVocKVVpBxZWVU3GFKlePoqm4gupn4RyUIBUtyy1D8WeW26aas+PEqcCTXBw1rtQpCtpDiYJXbbQQkHetuApVukorrOIKSqBlCivgOFVaITc7Mq/UKu2TXypsQSmqitfmFEjFl8MiBRBiUXK58iGNC5PhYiaDa5HEFX6nhLtCoUVZAiuPR7WoyabnjrmnOQeVM0doE/htlKJN8Z+bPDpxaFHZfGFiUdpdYPUWZSxMNBm8kML4Un6TtMJPiJ+v/CIO++HqeW7mBaHGNq3FCmP4lbOU5q/USMAV0dL0VjlFC8LxtSjLh/6SFbN8qV+M6j9PSuWHcljcdztxLi51KhWQBx4trRAr1/w/AAAA//9kPEEjAAAABklEQVQDAHLfha6GG5OVAAAAAElFTkSuQmCC"},{id:"sunset-drive",name:"Sunset Drive",renderer:"p5",files:[{relPath:"Sunset Drive.p5",content:`// sunset drive — a car heading for the sun. The kick lights the road,
// the bass swells the sun, the spectrum raises the hills.
const SPEED = 9
const CARS = 1
let road = 0, sunPulse = 0, glow = 0

function setup() {
  createCanvas(stave.width, stave.height, WEBGL)
  perspective(PI / 3, width / height, 10, 9000)
}

function draw() {
  const kick = sig.kick || 0, bass = sig.bass || 0, rms = sig.rms || 0
  const fft = sig.fft || []
  glow = max(kick, glow * 0.88)
  sunPulse = lerp(sunPulse, bass, 0.12)
  road += SPEED + rms * 40
  const t = millis() / 1000

  background(8, 2, 22)
  camera(sin(t * 0.5) * 40, -210, 760, 0, -150, -400, 0, 1, 0)

  // sky
  noStroke()
  beginShape()
  fill(10, 4, 40); vertex(-6000, -3600, -4200); vertex(6000, -3600, -4200)
  fill(255, 60, 150); vertex(6000, 0, -4200); vertex(-6000, 0, -4200)
  endShape(CLOSE)

  // stars
  stroke(255, 240, 255); strokeWeight(2)
  for (let i = 0; i < 70; i++) {
    const a = (i * 97.13) % 1, b = (i * 41.77) % 1
    if (sin(t * 2 + i) > -0.6) point(-3600 + a * 7200, -3300 + b * 2300, -4100)
  }

  // sun, in bands that slide down and thin out
  noStroke()
  const R = 1350 + sunPulse * 380, SUN_Y = -1050
  for (let i = 0; i < 46; i++) {
    const y0 = -R + (i / 46) * 2 * R, y1 = y0 + (2 * R) / 46
    const band = (y0 + R) / (2 * R)
    const gap = band > 0.5 && ((band * 9 + t * 0.35) % 1) < (band - 0.45) * 0.9
    if (gap) continue
    if (y0 + SUN_Y >= 0) continue                                  // the sun stops at the horizon; none of it is under the ground
    const ym = (y0 + y1) / 2, half = sqrt(max(0, R * R - ym * ym))
    fill(255, lerp(235, 60, band), lerp(90, 170, band))
    beginShape()
    vertex(-half, y0 + SUN_Y, -4000); vertex(half, y0 + SUN_Y, -4000)
    vertex(half, min(0, y1 + SUN_Y), -4000); vertex(-half, min(0, y1 + SUN_Y), -4000)
    endShape(CLOSE)
  }

  // the ground: one dark sheet out to the horizon, under the road and the hills, so nothing behind shows through
  noStroke(); fill(10, 3, 28)
  beginShape(); vertex(-6000, 2, 700); vertex(6000, 2, 700); vertex(6000, 2, -4190); vertex(-6000, 2, -4190); endShape(CLOSE)

  // hills on both sides, raised by the spectrum. Each row of the hills answers its own band, and the lift
  // belongs to the row's EDGE, not to the strip: two strips that share an edge use the same heights there,
  // so the hills stay one surface however the spectrum moves
  const step = 220, off = road % step
  const liftAt = r => 0.5 + (fft[(r * 3) % max(1, fft.length)] || 0) * 1.6
  for (const side of [-1, 1]) {
    for (let r = 0; r < 20; r++) {
      const zA = 500 - r * step + off, zB = zA - step
      const liftA = liftAt(r), liftB = liftAt(r + 1)
      stroke(60, 240, 255, 230 - r * 9); strokeWeight(1.5)
      fill(22, 6, 54)
      beginShape(TRIANGLE_STRIP)
      for (let c = 0; c <= 7; c++) {
        const x = side * (400 + c * 260)                             // the hills start at the road's edge
        const rowA = floor((road - off) / step) + r, rowB = rowA + 1
        const hA = c === 0 ? 0 : noise(c * 0.6 + side * 9, rowA * 0.35) * (90 + c * 110) * liftA
        const hB = c === 0 ? 0 : noise(c * 0.6 + side * 9, rowB * 0.35) * (90 + c * 110) * liftB
        vertex(x, -hA, zA); vertex(x, -hB, zB)
      }
      endShape()
    }
  }

  // road grid
  strokeWeight(2)
  for (let x = -400; x <= 400; x += 100) {
    stroke(255, 60, 220, 120 + glow * 135)
    line(x, 0, 600, x, 0, -4000)
  }
  for (let r = 0; r < 22; r++) {
    const z = 600 - r * step + off
    stroke(255, 60 + glow * 160, 220, 200 - r * 8)
    line(-400, 0, z, 400, 0, z)
  }
  // centre dashes
  stroke(255, 240, 120); strokeWeight(4)
  for (let r = 0; r < 22; r++) {
    const z = 600 - r * step + off
    line(0, -1, z, 0, -1, z - 90)
  }

  // the cars, from behind
  for (let n = 0; n < CARS; n++) {
  push()
  translate((n - (CARS - 1) / 2) * 250 + sin(t * 0.9 + n * 2) * (CARS > 1 ? 24 : 70), -glow * 6, 250 - (n % 2) * 260)
  rotateZ(sin(t * 0.9 + 1.2 + n) * 0.03)
  noStroke(); fill(255, 60, 160, 50 + glow * 120)                 // underglow
  push(); translate(0, -3, 0); rotateX(HALF_PI); plane(240 + glow * 50, 380); pop()
  fill(6, 4, 14)                                                  // wheels
  for (const [wx, wz] of [[-92, 110], [92, 110], [-92, -110], [92, -110]]) {
    push(); translate(wx, -20, wz); box(26, 40, 70); pop()
  }
  stroke(60, 240, 255); strokeWeight(1.5); fill(34, 10, 78)       // body
  push(); translate(0, -44, 0); box(184, 34, 330); pop()
  fill(22, 6, 52)                                                 // cabin, narrower at the roof
  beginShape(QUADS)
  const cb = [[-78, -61, 110], [78, -61, 110], [78, -61, -70], [-78, -61, -70]]
  const ct = [[-56, -100, 60], [56, -100, 60], [56, -100, -40], [-56, -100, -40]]
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    vertex(...cb[i]); vertex(...cb[j]); vertex(...ct[j]); vertex(...ct[i])
  }
  vertex(...ct[0]); vertex(...ct[1]); vertex(...ct[2]); vertex(...ct[3])
  endShape()
  noStroke(); fill(90, 200, 255, 150)                             // rear window
  beginShape(); vertex(-66, -66, 111); vertex(66, -66, 111); vertex(49, -95, 68); vertex(-49, -95, 68); endShape(CLOSE)
  fill(255, 40 + glow * 180, 90 + glow * 110)                     // tail lights flash on the kick
  push(); translate(-58, -48, 166); box(52, 10, 3); pop()
  push(); translate(58, -48, 166); box(52, 10, 3); pop()
  fill(255, 240, 120); push(); translate(0, -34, 166); box(40, 8, 3); pop()
  pop()
  }
}
`,language:"p5js"}],thumbnail:"data:image/png;base64,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"}],l="viz_lib";function c(e){return e.files.map(t=>({workspaceId:`vizlib_${e.id}_${t.relPath.replace(/[^a-zA-Z0-9]/g,"_")}`,path:`${l}/${e.name}/${t.relPath}`,content:t.content,language:t.language,isPrimary:t.relPath.split("/").pop().replace(/\.[^.]+$/,"")===e.name}))}function h(e){return`stave:perTabBackdrop:${e}`}function f(e){try{let t=window.localStorage.getItem(h(e));if(!t)return new Map;return new Map(Object.entries(JSON.parse(t)))}catch{return new Map}}function d(e,t){try{window.localStorage.setItem(h(e),JSON.stringify(Object.fromEntries(t)))}catch{}}function p(e,t,o){let s=f(e);s.has(t)||(s.set(t,o),d(e,s))}e.s(["o",0,i,"B",0,l,"P",0,c],56082),e.s(["O",0,f,"R",0,p,"P",0,d],64235);let g=`setcps(110/60/4) // 110 bpm

kick: s("bd*4").bank("LinnDrum").gain(0.5)

snare: s("~ sd ~ sd").bank("LinnDrum").gain(0.4).room(0.6).size(6)

hats: s("[~ hh]*4").bank("LinnDrum").gain(0.3)


lead: n("<[4 ~ 3 ~ 2 ~ ~ ~] [~ 0 ~ 2 3 ~ 2 ~]>").scale("A4:minor")
  .s("square").lpf(2500).gain(0.4).delay(0.4).delaytime(3/8)
  .viz("scope")
`,u=`// A Strudel sketch — Ctrl+Enter to play \xb7 Ctrl+. to stop

setcps(0.5)

drums: s("bd ~ sd ~, hh*8").gain(0.6)

bass: note("<c3 eb3 g3 f3>")
  .s("sawtooth").lpf(900).release(0.2)`,x=`# Sonic Pi — Imperative play/sleep/live_loop
# Ctrl+Enter to play \xb7 Ctrl+. to stop

use_bpm 120

live_loop :drums do
  viz :pianoroll
  sample :bd_haus
  sleep 0.5
  sample :sn_dub
  sleep 0.5
end

live_loop :bass do
  viz :scope
  use_synth :tb303
  play choose([36, 39, 43]), release: 0.3
  sleep 0.5
end

live_loop :melody do
  viz :pitchwheel
  use_synth :prophet
  play choose([60, 64, 67, 72]), release: 0.2
  sleep 0.25
end`,w=`// Hydra Piano Roll — shader-based frequency bands
s.osc(() => 10 + s.a.fft[0] * 50, -0.3, 0)
  .thresh(() => 0.3 + s.a.fft[0] * 0.5, 0.1)
  .color(0.46, 0.71, 1.0)
  .add(
    s.osc(() => 20 + s.a.fft[1] * 40, 0.2, 0)
      .rotate(Math.PI / 2)
      .thresh(() => 0.4 + s.a.fft[1] * 0.4, 0.08)
      .color(1.0, 0.79, 0.16),
    () => s.a.fft[1] * 0.8
  )
  .modulate(s.noise(2, () => s.a.fft[3] * 0.4), () => s.a.fft[0] * 0.015)
  .scrollX(() => s.a.fft[0] * 0.02)
  .out()`,y=`// Hydra Scope — audio-reactive oscilloscope
s.osc(() => 20 + s.a.fft[0] * 80, 0.1, 0)
  .color(0.2, 0.8, 1.0)
  .rotate(() => s.a.fft[1] * 0.5)
  .modulate(s.osc(3, 0, 0), () => s.a.fft[2] * 0.1)
  .diff(s.osc(2, 0.1, 0).rotate(0.5))
  .out()`,v=`// Hydra Kaleidoscope — mirrored fractal audio patterns
s.osc(6, 0.1, () => s.a.fft[0] * 3)
  .kaleid(() => 3 + Math.floor(s.a.fft[1] * 8))
  .color(
    () => 0.5 + s.a.fft[0] * 0.5,
    () => 0.3 + s.a.fft[1] * 0.7,
    () => 0.8 + s.a.fft[2] * 0.2
  )
  .rotate(() => s.a.fft[3] * 3.14)
  .modulate(s.noise(3), () => s.a.fft[0] * 0.05)
  .out()`,b=`// Hydra Signals (Bands) — the named musical-signal bus in hydra.
// Try it over a drum pattern, e.g.   $: s("bd*4 hh*8")
//
// IMPORTANT: hydra sketches receive two namespaces — \`s\` (the hydra synth) and
// \`stave\` (the live bus). Unlike p5, nothing is exposed bare here, so write
// \`s.osc(...)\` and \`stave.sig.bass(...)\`. And in hydra the bus SCALARS are
// () => number THUNKS (call them every frame), while \`fft\` / \`wave\` are arrays:
//
//   stave.sig.bass()       — master low-band magnitude, 0..1 (a THUNK — call it).
//                            stave.sig.rms() / sig.mid() / sig.treble() are siblings.
//   stave.sig('bd').rms()  — the 'bd' (kick) sound's loudness 0..1 (also a thunk).
//   stave.sig('bd').env()  — that sound's envelope, 0..1 (bumps on each hit).
//   stave.sig('bd').fft[i] — that sound's spectrum: an ARRAY, indexed natively.
//                            Wrap the WHOLE expression in () => … so hydra reads
//                            it fresh each frame:  () => stave.sig('bd').fft[2]
//
// (In p5 these same names are bare LIVE NUMBERS — see "Signals (Spectrum)".)

s.osc(() => 8 + stave.sig.bass() * 30, 0.1, 0)      // density rides the low band
  .color(
    () => 0.4 + stave.sig('bd').rms() * 0.6,        // red pulses with the kick
    0.5,
    () => 0.6 + stave.sig.treble() * 0.4            // blue follows the highs
  )
  .rotate(() => stave.sig('bd').fft[2] || 0)        // spin from a kick spectrum bin
  .modulate(s.noise(2), () => stave.sig.mid() * 0.15) // wobble with the mids
  .out(s.o0)`,m=`// A full song — 48 bars, 96 seconds. C minor, 120 BPM, one cycle = one bar.
// Piano chords in a pushed rhythm, an offbeat bass that follows them, a flute
// playing a short stabbed hook, and a sung line over the last eight bars.
// Ctrl+Enter to play \xb7 Ctrl+. to stop
//
// The voice line began as a sung recording. It was read a sixteenth at a time
// and written as notes: 8 bars, 16 sixteenths a bar. \`c4@11\` is a C held for
// eleven sixteenths, \`~@3\` is three of silence. The recording is not used.
//
// Each track at the bottom is laid out with arrange([bars, part], ...).
setcps(120/240)

// drums
const loop  = s("bd*2, hh*4").gain(0.4)
const four  = s("bd*4, hh*8").gain(0.4)
const fast  = s("bd*4, hh*16").gain(0.4)
const beat  = s("bd*4, hh*16, ~ clap ~ clap, [~ oh]*4").gain(0.4)
const thin  = s("sd*4 sd*8 sd*16 sd*16").gain("0.07 0.09 0.13 0.18")

// bass
const hollow = note("c2").s("sine").gain(0.35)
const sub    = note("<ab1 bb1 c2 g1>").struct("~ x ~ x ~ x ~ x").s("sawtooth").lpf(800)
const subUp  = note("<ab1 bb1 c2 a#1>").struct("~ x ~ x ~ x ~ x").s("sawtooth").lpf("<800 800 2500 2500>")
const subOn  = note("<ab1 bb1 c2 a#1>").struct("~ x ~ x ~ x ~ x").s("sawtooth").lpf(2500).room(0.4)

// chords, lead
const chords = note("<[ab3,c4,eb4,g4] [bb3,d4,f4] [c4,eb4,g4,bb4] [g3,bb3,eb4]>").struct("x ~ ~ x ~ ~ x ~").s("piano").room(0.6).gain(0.6)
const lead   = note("<[c5 c5 ~ eb5 ~ c5 g5 ~] [f5 f5 ~ eb5 ~ d5 bb4 ~]>").s("gm_flute").clip(0.5).delay(0.3).room(0.3).gain(1.2)

// voice
const melody = note("c4@11 ~@3 d4@2  eb4@2 d4@4 c4@2 bb3@5 ~@3  c4@9 ~@4 eb4@3  eb4@2 f4@4 eb4@2 d4@4 c4 bb3@3  c4@7 ~@4 d4@2 eb4@3  d4@3 c4@8 d4@3 eb4@12 f4@3 g4@7 ~@12").slow(8).s("gm_voice_oohs").room(0.4)

drums: arrange([10, loop], [2, silence], [5, loop], [3, four], [3, fast], [12, beat], [1, thin], [8, beat], [4, loop])
bass:  arrange([10, silence], [2, hollow], [12, sub], [4, subUp], [16, subOn], [4, silence])
keys:  arrange([28, silence], [8, chords], [12, chords])
lead:  arrange([30, silence], [5, lead], [1, silence], [8, lead], [4, silence])
voice: arrange([40, silence], [8, melody])

all(x => x.postgain(0.8))`;function k(){let e=(0,t.bundledPresetId)("Piano Roll","p5"),o=(0,t.bundledPresetId)("Piano Roll Hydra","hydra"),s=(e,o,s)=>{let a=(0,t.bundledPresetId)(e,"hydra"===o?"hydra":"glsl"===o?"glsl":"p5");return{id:(0,t.workspaceFileIdForPreset)(a),path:`preset/viz/${e}.${o}`,content:s,language:"hydra"===o?"hydra":"glsl"===o?"glsl":"p5js",meta:{presetId:a}}};return[{id:"pattern.strudel",path:"pattern.strudel",content:g,language:"strudel",backdrop:A()[0]?.id,zoneHeights:{bass:{px:160,vizId:"pianoroll"},lead:{px:160,vizId:"scope"}},openTab:!0},{id:(0,t.workspaceFileIdForPreset)(e),path:"preset/viz/Piano Roll.p5",content:t.PIANOROLL_P5_CODE,language:"p5js",meta:{presetId:e}},s("scope","p5",t.SCOPE_P5_CODE),s("fscope","p5",t.FSCOPE_P5_CODE),s("spectrum","p5",t.SPECTRUM_P5_CODE),s("spiral","p5",t.SPIRAL_P5_CODE),s("pitchwheel","p5",t.PITCHWHEEL_P5_CODE),s("wordfall","p5",t.WORDFALL_P5_CODE),s("Signals (Spectrum)","p5",t.SIGNALS_SPECTRUM_P5_CODE),s("Signals (Backdrop)","p5",t.SIGNALS_BACKDROP_P5_CODE),{id:(0,t.workspaceFileIdForPreset)(o),path:"preset/viz/Piano Roll (Hydra).hydra",content:w,language:"hydra",meta:{presetId:o}},s("scope","hydra",y),s("kaleidoscope","hydra",v),s("Signals (Bands)","hydra",b),...A().map(e=>({...e,openTab:!0}))]}function A(){let e=i.find(e=>"sunset-drive"===e.id);return e?c(e).map(e=>({id:e.workspaceId,path:e.path,content:e.content,language:e.language})):[]}function S(e){switch(e){case"starter":default:return k();case"strudel":return[{id:"pattern.strudel",path:"pattern.strudel",content:u,language:"strudel"}];case"song":return[{id:"song.strudel",path:"song.strudel",content:m,trackDisplays:{drums:"bars",bass:"bars",keys:"bars",lead:"bars",voice:"waveform"},language:"strudel"}];case"sonicpi":return[{id:"pattern.sonicpi",path:"pattern.sonicpi",content:x,language:"sonicpi"}];case"hydra":return[{id:"sketch.hydra",path:"sketch.hydra",content:w,language:"hydra"}];case"blank":return[]}}let E=new Map([[t.PITCHWHEEL_P5_CODE,[o,a,r]],[t.SPIRAL_P5_CODE,[s,n]]]);e.s(["FULL_SONG_CODE",0,m,"HYDRA_KALEIDOSCOPE_CODE",0,v,"HYDRA_SCOPE_CODE",0,y,"PIANOROLL_HYDRA_CODE",0,w,"SIGNALS_BANDS_HYDRA_CODE",0,b,"SONIC_PI_CODE",0,x,"STRUDEL_CODE",0,g,"STRUDEL_SKETCH_CODE",0,u,"TEMPLATES",0,[{id:"starter",name:"Starter",description:"An outrun groove: drums, bass, pads and lead, a knob, a piano roll, a scope, and Sunset Drive behind it. Best for exploring.",files:[]},{id:"strudel",name:"Strudel Sketch",description:"A short Strudel pattern to start writing on.",files:[]},{id:"song",name:"Full Song",description:"A finished 48-bar song: drums, bass, keys, a flute hook and a sung line written as notes.",files:[]},{id:"hydra",name:"Hydra Visual",description:"A Hydra sketch of its own. Audio-reactive visuals.",files:[]},{id:"blank",name:"Blank",description:"No files of your own yet. Add them from the sidebar.",files:[]}],"getTemplateFiles",0,S,"seedMissingPresetFiles",0,function(){for(let e of k())if((0,t.isVizLanguage)(e.language)&&e.path.startsWith("preset/")){let o=(0,t.seedWorkspaceFile)(e.id,e.path,e.content,e.language,e.meta);E.get(e.content)?.includes(o.content)&&(0,t.setContent)(e.id,e.content)}},"seedProjectFromTemplate",0,function(e,o){let s=S(e);for(let e of s){for(let[s,{px:a,vizId:r}]of((0,t.seedWorkspaceFile)(e.id,e.path,e.content,e.language,e.meta),e.backdrop&&p(o,e.id,e.backdrop),Object.entries(e.zoneHeights??{})))void 0===(0,t.getZoneHeightOverride)(e.id,s)&&(0,t.setZoneHeightOverride)(e.id,s,a,void 0,r);for(let[o,s]of Object.entries(e.trackDisplays??{}))void 0===(0,t.getTrackMeta)(e.id,o).display&&(0,t.setTrackMeta)(e.id,o,{display:s})}!function(e,o){let s=o.filter(e=>e.openTab).map(e=>e.id);if(0===s.length)return;let a=new Set((0,t.listWorkspaceFiles)().map(e=>e.id));if((0,t.loadShellState)(e,a))return;let r=(0,t.buildDefaultSnapshot)("g-main",s[0]),n=r.groups.get("g-main"),i=new Map(r.groups);i.set("g-main",{...n,tabs:[...n.tabs,...s.slice(1).map(e=>({kind:"editor",id:`tab-${e}`,fileId:e}))]}),(0,t.saveShellState)(e,{...r,groups:i})}(o,s);let a=s.filter(e=>!e.path.includes("/")).map(e=>`f:${e.id}`);a.length>0&&(0,t.setChildOrder)("",[...a,"d:preset"])},"templateLanguages",0,function(e){return[...new Set(S(e).map(e=>e.language))]}],67385)}]);