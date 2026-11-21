// Every sound in the town is synthesised here: the tune, the birds, the pasar malam and the stall calls.
// Nothing is recorded or downloaded. Browsers only allow sound after a tap, so it starts on the first one.
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
// "huss": a breathy "hu" and a long "sss", the sound of the spatula folding the egg
function hussAt(at, gain = .5) {
  burst(at, .1, 'bandpass', 620, gain * .8, 1.4);
  burst(at + .05, .1, 'bandpass', 1500, gain * .35, 1.2);
  burst(at + .08, .24, 'highpass', 5600, gain * .7, .7, .03);
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
    for (let i = 0; i < 3; i++) hussAt(now + .05 + i * .3, .34 * market);
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
  huss() { if (ready()) hussAt(ctx.currentTime, .55); },
  hussHussHuss() { if (ready()) for (let i = 0; i < 3; i++) hussAt(ctx.currentTime + i * .26, .5); },
  sizzle() { if (ready()) burst(ctx.currentTime, .32, 'highpass', 5200, .2); },
  thunk() { if (ready()) { note(ctx.currentTime, 105, .13, .5, 'sine'); burst(ctx.currentTime, .06, 'bandpass', 800, .35); } },
  good() { if (ready()) note(ctx.currentTime, 620, .1, .2); },
  great() { if (ready()) { note(ctx.currentTime, 660, .09, .2); note(ctx.currentTime + .08, 990, .14, .2); } },
  bad() { if (ready()) note(ctx.currentTime, 130, .28, .18, 'sawtooth'); },
  over() { if (ready()) { note(ctx.currentTime, 520, .14, .2); note(ctx.currentTime + .14, 390, .16, .2); note(ctx.currentTime + .3, 260, .3, .2); } },
  step() { if (ready()) burst(ctx.currentTime, .035, 'bandpass', 900 + Math.random() * 300, .05, 2); },
  whoosh() { if (ready()) { burst(ctx.currentTime, .9, 'bandpass', 900, .22, .6, .3); burst(ctx.currentTime + .2, 1.1, 'bandpass', 2200, .12, .6, .5); } }
};
// Sound may only start from a tap or a key press.
for (const kind of ['pointerdown', 'keydown']) addEventListener(kind, () => sound.unlock(), { passive: true });
addEventListener('visibilitychange', () => { if (!ctx || muted) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
