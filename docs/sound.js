// Every sound in the town is made here. The tune, the birds and the pasar malam are synthesised; the one
// recording is the burger stall's "hus hus hus" (assets/hus.wav, by @thedrizzleshow, used with permission). Browsers only allow sound after a tap, so it starts on the first one.
let ctx = null, master = null, hiss = null, timer = 0, tune = null, step = 0, due = 0, playing = false, market = 0, grill = null, murmur = null, callAt = 0, birdAt = 0;
let muted = false;
try { muted = localStorage.getItem('taman-pip-mute') === '1'; } catch {}
const listeners = new Set();

function ready() {
  if (muted) return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
    hiss = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = hiss.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    grill = bed('highpass', 4800, .7); murmur = bed('lowpass', 420, .5);
    loadClip();
    if (!timer) timer = setInterval(tick, 90);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function bed(kind, frequency, q) {                // a looping wash of filtered noise, silent until asked for
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), level = ctx.createGain();
  source.buffer = hiss; source.loop = true; filter.type = kind; filter.frequency.value = frequency; filter.Q.value = q; level.gain.value = 0;
  source.connect(filter).connect(level).connect(master); source.start();
  return level;
}
function burst(at, length, kind, frequency, gain, q = .8, attack = .012) {
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), level = ctx.createGain();
  source.buffer = hiss; filter.type = kind; filter.frequency.value = frequency; filter.Q.value = q;
  level.gain.setValueAtTime(.0001, at); level.gain.linearRampToValueAtTime(gain, at + attack); level.gain.exponentialRampToValueAtTime(.0001, at + length);
  source.connect(filter).connect(level).connect(master); source.start(at, Math.random()); source.stop(at + length + .03);
}
function note(at, frequency, length, gain, kind = 'triangle') {
  const osc = ctx.createOscillator(), level = ctx.createGain();
  osc.type = kind; osc.frequency.value = frequency;
  level.gain.setValueAtTime(.0001, at); level.gain.linearRampToValueAtTime(gain, at + .008); level.gain.exponentialRampToValueAtTime(.0001, at + length);
  osc.connect(level).connect(master); osc.start(at); osc.stop(at + length + .03);
}
// The recording holds two rounds of three: where each hus starts and how long it lasts, in seconds.
const HUS = [[[.03, .24], [.265, .19], [.445, .24]], [[1.005, .24], [1.235, .19], [1.415, .24]]];
let clip = null, round = 0;
function loadClip() {
  fetch('./assets/hus.wav').then(r => r.arrayBuffer()).then(data => ctx.decodeAudioData(data)).then(buffer => { clip = buffer; }).catch(() => {});
}
function slice(at, start, length, gain) {
  const source = ctx.createBufferSource(), level = ctx.createGain();
  source.buffer = clip;
  level.gain.setValueAtTime(.0001, at); level.gain.linearRampToValueAtTime(gain, at + .012);
  level.gain.setValueAtTime(gain, at + length - .03); level.gain.linearRampToValueAtTime(.0001, at + length);
  source.connect(level).connect(master); source.start(at, start, length + .02);
}
// One hus: the recording when it has loaded, otherwise the synthesised stand-in below.
function husAt(at, gain = .5, nth = 0) {
  if (clip) { const [start, length] = HUS[round % 2][nth % 3]; slice(at, start, length, gain * 2.2); return; }
  synthHus(at, gain, 150 - nth * 6);
}
// The stand-in: a breath, a short "u" (a low buzz through two mouth-shaped filters) and an "s".
function synthHus(at, gain = .5, pitch = 150) {
  burst(at, .07, 'bandpass', 1300, gain * .35, .9, .01);
  const buzz = ctx.createOscillator(), level = ctx.createGain();
  buzz.type = 'sawtooth'; buzz.frequency.setValueAtTime(pitch * 1.06, at + .03); buzz.frequency.linearRampToValueAtTime(pitch * .94, at + .15);
  level.gain.setValueAtTime(.0001, at + .03); level.gain.linearRampToValueAtTime(gain * .9, at + .06); level.gain.exponentialRampToValueAtTime(.0001, at + .16);
  for (const [formant, q, amount] of [[330, 6, 1], [820, 8, .55]]) {
    const mouth = ctx.createBiquadFilter(), out = ctx.createGain();
    mouth.type = 'bandpass'; mouth.frequency.value = formant; mouth.Q.value = q; out.gain.value = amount;
    buzz.connect(mouth).connect(out).connect(level);
  }
  level.connect(master); buzz.start(at + .03); buzz.stop(at + .2);
  burst(at + .13, .15, 'highpass', 6200, gain * .6, .7, .02);
}
const hz = semitone => 261.63 * Math.pow(2, semitone / 12);   // semitones from middle C
// Two tunes on the same four chords (C, A minor, F, G): a slow one for the town, a quick one for the stalls.
const tunes = {
  town: { beat: .30, lead: [4, 7, 9, 7, 4, 2, 0, null, 2, 4, 7, 4, 2, 0, -3, null, 0, 2, 4, 7, 9, 12, 9, 7, 4, 2, 0, null, 0, null, null, null], bass: [-24, -27, -31, -29], gain: .07, shaker: 0 },
  game: { beat: .19, lead: [0, 4, 7, 4, 9, 7, 4, 7, 0, 4, 9, 4, 12, 9, 7, 4, 5, 9, 12, 9, 5, 9, 12, 14, 7, 11, 14, 11, 7, 2, 4, 7], bass: [-24, -27, -31, -29], gain: .075, shaker: .05 }
};
function tick() {
  if (!ctx || muted || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (tune && playing) {
    if (due < now) due = now + .05;
    while (due < now + .25) {
      const pitch = tune.lead[step % tune.lead.length], bar = Math.floor(step / 8) % 4;
      if (pitch !== null) { note(due, hz(pitch), tune.beat * 2.2, tune.gain); note(due, hz(pitch + 12), tune.beat, tune.gain * .25, 'sine'); }
      if (step % 4 === 0) note(due, hz(tune.bass[bar]), tune.beat * 3.4, tune.gain * 1.5, 'sine');
      if (tune.shaker && step % 2 === 1) burst(due, .05, 'highpass', 7000, tune.shaker);
      step++; due += tune.beat;
    }
  }
  if (market > .25 && now > callAt) {              // the burger stall calling across the market
    if (clip) { round++; const [first] = HUS[round % 2], last = HUS[round % 2][2]; slice(now + .05, first[0], last[0] + last[1] - first[0], .75 * market); }   // the whole call, as recorded
    else for (let i = 0; i < 3; i++) synthHus(now + .05 + i * .32, .34 * market, 150 - i * 6);
    callAt = now + 5 + Math.random() * 5;
  }
  if (tune === tunes.town && playing && market < .5 && now > birdAt) {   // a bird somewhere in the forest
    const base = 2600 + Math.random() * 1400, count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) note(now + .05 + i * .11, base + (i % 2) * 380, .09, .02, 'sine');
    birdAt = now + 4 + Math.random() * 7;
  }
}
let around = 0, atStall = false;
function hear() { market = atStall ? 1 : around; level(grill, .05 * market); level(murmur, .11 * market); }
function level(node, value) { if (ctx && node) node.gain.setTargetAtTime(value, ctx.currentTime, .4); }

export const sound = {
  get muted() { return muted; },
  onChange(fn) { listeners.add(fn); fn(muted); },
  setMuted(value) {
    muted = value;
    try { localStorage.setItem('taman-pip-mute', muted ? '1' : '0'); } catch {}
    if (muted) ctx?.suspend(); else if (ready()) { due = 0; }
    for (const fn of listeners) fn(muted);
  },
  unlock() { if (ready() && !playing) { playing = true; tune ||= tunes.town; due = 0; hear(); } },
  music(name) { const next = tunes[name] || null; if (next !== tune) { tune = next; step = 0; due = 0; } },
  // How much of the pasar malam can be heard, 0 to 1: sizzle, a murmur of people, and the stall calls.
  market(amount) { around = amount; hear(); },
  // While a stall game is open the market is right there, whatever the map is showing.
  stall(on) { atStall = on; hear(); },
  // One fold, one hus. `nth` (0, 1, 2) drops the pitch a little each time, as in the film: hus, hus, hus.
  hus(nth = 0) { if (ready()) { if (nth === 0) round++; husAt(ctx.currentTime, .6, nth); } },
  sizzle() { if (ready()) burst(ctx.currentTime, .32, 'highpass', 5200, .2); },
  thunk() { if (ready()) { note(ctx.currentTime, 105, .13, .5, 'sine'); burst(ctx.currentTime, .06, 'bandpass', 800, .35); } },
  good() { if (ready()) note(ctx.currentTime, 620, .1, .2); },
  great() { if (ready()) { note(ctx.currentTime, 660, .09, .2); note(ctx.currentTime + .08, 990, .14, .2); } },
  bad() { if (ready()) note(ctx.currentTime, 130, .28, .18, 'sawtooth'); },
  over() { if (ready()) { note(ctx.currentTime, 520, .14, .2); note(ctx.currentTime + .14, 390, .16, .2); note(ctx.currentTime + .3, 260, .3, .2); } },
  step() { if (ready()) burst(ctx.currentTime, .035, 'bandpass', 900 + Math.random() * 300, .05, 2); },
  // The roadster: a rising and falling hum with rushing air for the whole flight, then a hiss of vapour on landing.
  fly(seconds) {
    if (!ready()) return;
    const at = ctx.currentTime, hum = ctx.createOscillator(), level = ctx.createGain();
    hum.type = 'sawtooth'; hum.frequency.setValueAtTime(70, at); hum.frequency.linearRampToValueAtTime(190, at + seconds * .3); hum.frequency.linearRampToValueAtTime(150, at + seconds * .75); hum.frequency.linearRampToValueAtTime(60, at + seconds);
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 520;
    level.gain.setValueAtTime(.0001, at); level.gain.linearRampToValueAtTime(.09, at + .5); level.gain.setValueAtTime(.09, at + seconds - .6); level.gain.linearRampToValueAtTime(.0001, at + seconds);
    hum.connect(soft).connect(level).connect(master); hum.start(at); hum.stop(at + seconds + .05);
    burst(at, 1.1, 'bandpass', 900, .2, .6, .3); burst(at + seconds * .45, seconds * .5, 'bandpass', 1600, .07, .5, seconds * .2);
  },
  land() { if (ready()) { const at = ctx.currentTime; note(at, 82, .22, .45, 'sine'); burst(at, 1.3, 'highpass', 3200, .26, .6, .04); burst(at + .05, .7, 'bandpass', 700, .18, .7, .05); } },
  whoosh() { if (ready()) { burst(ctx.currentTime, .9, 'bandpass', 900, .22, .6, .3); burst(ctx.currentTime + .2, 1.1, 'bandpass', 2200, .12, .6, .5); } }
};
// Sound may only start from a tap or a key press.
for (const kind of ['pointerdown', 'keydown']) addEventListener(kind, () => sound.unlock(), { passive: true });
addEventListener('visibilitychange', () => { if (!ctx || muted) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
