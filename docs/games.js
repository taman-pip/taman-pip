// Pasar malam stall games: four short tap games played in a dialog over the town.
// Everything is drawn on one canvas and the sounds are synthesised, so there is nothing to download.
const W = 360, H = 400;
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t, 0, 1)));
const rgb = c => 'rgb(' + c.join(',') + ')';

// ---- sound ---------------------------------------------------------------
let audio = null, muted = false;
try { muted = localStorage.getItem('taman-pip-mute') === '1'; } catch {}
function voice() {
  if (muted) return null;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { return null; }
  return audio;
}
function noise(length, frequency, gain, kind = 'bandpass', q = .8) {
  const a = voice(); if (!a) return;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * length), a.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / data.length);
  const source = a.createBufferSource(), filter = a.createBiquadFilter(), level = a.createGain();
  source.buffer = buffer; filter.type = kind; filter.frequency.value = frequency; filter.Q.value = q; level.gain.value = gain;
  source.connect(filter).connect(level).connect(a.destination); source.start();
}
function tone(frequency, length, gain = .2, kind = 'triangle', delay = 0) {
  const a = voice(); if (!a) return;
  const osc = a.createOscillator(), level = a.createGain(), t = a.currentTime + delay;
  osc.type = kind; osc.frequency.value = frequency;
  level.gain.setValueAtTime(gain, t); level.gain.exponentialRampToValueAtTime(.001, t + length);
  osc.connect(level).connect(a.destination); osc.start(t); osc.stop(t + length + .02);
}
const sfx = {
  huss: () => noise(.17, 2400 + Math.random() * 600, .55),
  sizzle: () => noise(.3, 5200, .22, 'highpass'),
  thunk: () => { tone(105, .13, .5, 'sine'); noise(.06, 800, .35); },
  good: () => tone(620, .1, .22),
  great: () => { tone(660, .09, .22); tone(990, .14, .22, 'triangle', .08); },
  bad: () => tone(130, .28, .2, 'sawtooth'),
  over: () => { tone(520, .14, .2); tone(390, .16, .2, 'triangle', .14); tone(260, .3, .2, 'triangle', .3); }
};

// ---- drawing helpers -------------------------------------------------------
function griddle(g) {
  g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2f3537'; g.beginPath(); g.roundRect(14, 26, W - 28, H - 52, 22); g.fill();
  g.fillStyle = '#3d4447'; g.beginPath(); g.roundRect(22, 34, W - 44, H - 68, 16); g.fill();
  g.strokeStyle = '#ffffff0d'; g.lineWidth = 2;
  for (let y = 60; y < H - 40; y += 26) { g.beginPath(); g.moveTo(34, y); g.lineTo(W - 34, y); g.stroke(); }
}
function label(g, text, x, y, size = 20, color = '#fbf3e2') {
  g.font = '700 ' + size + 'px "DM Sans",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 5; g.strokeStyle = '#1f2a23aa'; g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
}
function floaters(list, g, dt) {
  for (const f of list) {
    f.t += dt; g.globalAlpha = clamp(1 - f.t / .7, 0, 1); label(g, f.text, f.x, f.y - f.t * 46, f.size || 20, f.color); g.globalAlpha = 1;
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].t > .7) list.splice(i, 1);
}

// ---- 1. Huss Huss Huss: fold the egg round the patty -----------------------
function huss(api) {
  const sides = ['top', 'right', 'bottom', 'left'], vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
  let order, step, fold, shake, leave, pops = [], pulse = 0;
  const next = () => { order = [...sides].sort(() => Math.random() - .5); step = 0; fold = { top: 0, right: 0, bottom: 0, left: 0 }; leave = 0; };
  next();
  function choose(side) {
    if (leave) return;
    if (side === order[step]) {
      step++; sfx.huss(); pops.push({ text: 'huss', x: W / 2 + vectors[side][0] * 86, y: 200 + vectors[side][1] * 86, t: 0 });
      if (step === 4) { api.score(1); leave = .001; sfx.great(); }
    } else { shake = .3; api.penalty(1); sfx.bad(); pops.push({ text: '-1s', x: W / 2, y: 110, t: 0, color: '#ffb4a2' }); }
  }
  return {
    time: 30, unit: 'burgers wrapped',
    tap(x, y) { const dx = x - W / 2, dy = y - 200; choose(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top')); },
    key(k) { const side = { ArrowUp: 'top', ArrowRight: 'right', ArrowDown: 'bottom', ArrowLeft: 'left' }[k]; if (side) choose(side); return !!side; },
    update(dt) {
      pulse += dt; shake = Math.max(0, (shake || 0) - dt);
      order.forEach((s, i) => { if (i < step) fold[s] = Math.min(1, fold[s] + dt * 9); });
      if (leave) { leave += dt; if (leave > .42) next(); }
    },
    draw(g, dt) {
      griddle(g);
      const cx = W / 2 + (shake ? Math.sin(shake * 60) * 5 : 0) + (leave ? leave * leave * 1500 : 0), cy = 200, half = 104;
      g.fillStyle = '#f6dc8a'; g.beginPath(); g.roundRect(cx - half, cy - half, half * 2, half * 2, 26); g.fill();
      g.fillStyle = '#fbefc4'; g.beginPath(); g.roundRect(cx - half + 10, cy - half + 10, half * 2 - 20, half * 2 - 20, 20); g.fill();
      g.fillStyle = '#5f3a22'; g.beginPath(); g.arc(cx, cy, 50, 0, 7); g.fill();
      g.fillStyle = '#7a4a2a'; g.beginPath(); g.arc(cx, cy - 3, 47, 0, 7); g.fill();
      g.fillStyle = '#b5382a'; g.beginPath(); g.ellipse(cx - 8, cy - 6, 22, 9, .4, 0, 7); g.fill();
      g.fillStyle = '#e9c545'; g.beginPath(); g.ellipse(cx + 12, cy + 8, 16, 6, -.5, 0, 7); g.fill();
      for (const s of sides) {                       // folded flaps cover the patty from their own edge
        if (!fold[s]) continue;
        const [vx, vy] = vectors[s], reach = fold[s] * 62;
        g.fillStyle = '#f3d77c'; g.beginPath();
        if (vx) g.roundRect(vx > 0 ? cx + half - 44 - reach : cx - half, cy - half + 8, 44 + reach, half * 2 - 16, 18);
        else g.roundRect(cx - half + 8, vy > 0 ? cy + half - 44 - reach : cy - half, half * 2 - 16, 44 + reach, 18);
        g.fill(); g.strokeStyle = '#d9b655'; g.lineWidth = 2; g.stroke();
      }
      if (!leave) {                                  // arrow on the flap to fold next
        const [vx, vy] = vectors[order[step]], bob = Math.sin(pulse * 9) * 6, ax = cx + vx * (half + 26 - bob), ay = cy + vy * (half + 26 - bob);
        g.save(); g.translate(ax, ay); g.rotate(Math.atan2(-vy, -vx));
        g.fillStyle = '#fbf3e2'; g.strokeStyle = '#2c533d'; g.lineWidth = 4; g.beginPath();
        g.moveTo(18, 0); g.lineTo(-10, -17); g.lineTo(-10, -7); g.lineTo(-24, -7); g.lineTo(-24, 7); g.lineTo(-10, 7); g.lineTo(-10, 17); g.closePath(); g.stroke(); g.fill(); g.restore();
      }
      floaters(pops, g, dt);
    }
  };
}

// ---- 2. Flip It: turn each patty when it is brown, serve after the second side ----
function flip(api) {
  const raw = [222, 140, 126], done = [124, 76, 42], burnt = [34, 28, 26], pops = [];
  const slots = Array.from({ length: 6 }, (_, i) => ({ x: 78 + i % 3 * 102, y: 138 + Math.floor(i / 3) * 132, state: 'empty', wait: .2 + i * .35, t: 0, side: 0, spin: 0 }));
  let elapsed = 0;
  const lay = s => { const pace = Math.max(.55, 1 - elapsed / 80); s.state = 'cook'; s.t = 0; s.side = 0; s.ready = rand(2.0, 3.2) * pace; s.burn = s.ready + 1.7 * pace; };
  return {
    time: 45, lives: 3, unit: 'burgers served',
    tap(x, y) {
      const s = slots.find(o => Math.hypot(o.x - x, o.y - y) < 50); if (!s || s.state !== 'cook') return;
      if (s.t < s.ready) { s.nudge = .25; pops.push({ text: 'not yet', x: s.x, y: s.y - 40, t: 0, size: 15 }); return; }
      if (s.side === 0) { s.side = 1; s.t = 0; s.spin = 1; sfx.sizzle(); const pace = Math.max(.55, 1 - elapsed / 80); s.ready = rand(1.6, 2.4) * pace; s.burn = s.ready + 1.6 * pace; }
      else { api.score(1); sfx.good(); pops.push({ text: '+1', x: s.x, y: s.y - 40, t: 0 }); s.state = 'empty'; s.wait = rand(.4, 1.1); }
    },
    update(dt) {
      elapsed += dt;
      for (const s of slots) {
        s.spin = Math.max(0, s.spin - dt * 4); s.nudge = Math.max(0, (s.nudge || 0) - dt);
        if (s.state === 'empty') { s.wait -= dt; if (s.wait <= 0) lay(s); }
        else if (s.state === 'cook') { s.t += dt; if (s.t >= s.burn) { s.state = 'burnt'; s.wait = .9; api.miss(); sfx.bad(); pops.push({ text: 'burnt!', x: s.x, y: s.y - 40, t: 0, color: '#ffb4a2' }); } }
        else { s.wait -= dt; if (s.wait <= 0) { s.state = 'empty'; s.wait = rand(.3, .8); } }
      }
    },
    draw(g, dt) {
      griddle(g);
      for (const s of slots) {
        g.fillStyle = '#00000022'; g.beginPath(); g.ellipse(s.x, s.y + 6, 44, 40, 0, 0, 7); g.fill();
        if (s.state === 'empty') { g.strokeStyle = '#ffffff18'; g.lineWidth = 2; g.setLineDash([6, 7]); g.beginPath(); g.arc(s.x, s.y, 40, 0, 7); g.stroke(); g.setLineDash([]); continue; }
        const cooked = s.state === 'burnt' ? burnt : s.t < s.ready ? mix(raw, done, s.t / s.ready) : mix(done, burnt, (s.t - s.ready) / (s.burn - s.ready) * .9);
        const squash = 1 - Math.sin(s.spin * Math.PI) * .85, wobble = s.nudge ? Math.sin(s.nudge * 70) * 4 : 0;
        g.save(); g.translate(s.x + wobble, s.y - Math.sin(s.spin * Math.PI) * 26); g.scale(1, squash);
        g.fillStyle = rgb(mix(cooked, [0, 0, 0], .28)); g.beginPath(); g.arc(0, 4, 41, 0, 7); g.fill();
        g.fillStyle = rgb(cooked); g.beginPath(); g.arc(0, 0, 40, 0, 7); g.fill();
        g.strokeStyle = rgb(mix(cooked, [0, 0, 0], .35)); g.lineWidth = 3;
        for (const off of [-14, 0, 14]) { g.beginPath(); g.moveTo(-24, off); g.lineTo(24, off + 6); g.stroke(); }
        g.restore();
        if (s.state === 'cook' && s.t >= s.ready) {  // the ring empties as the patty heads for burnt
          const left = 1 - (s.t - s.ready) / (s.burn - s.ready);
          g.strokeStyle = left > .4 ? '#a8e08a' : '#ffb35c'; g.lineWidth = 6; g.lineCap = 'round';
          g.beginPath(); g.arc(s.x, s.y, 49, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke(); g.lineCap = 'butt';
          label(g, s.side ? 'serve' : 'flip', s.x, s.y + 62, 15);
        }
        if (s.state === 'burnt') { g.fillStyle = '#9aa0a055'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(s.x - 14 + i * 14, s.y - 34 - (1 - s.wait) * 22 - i * 6, 9 + i * 2, 0, 7); g.fill(); } }
      }
      floaters(pops, g, dt);
    }
  };
}

// ---- 3. Wok Hei: toss the nasi goreng as the ring meets the rim -------------
function wok(api) {
  const rim = 96, cx = W / 2, cy = 214, pops = [];
  const grains = Array.from({ length: 70 }, () => { const a = rand(0, 7), r = Math.sqrt(Math.random()) * 70; return { x: Math.cos(a) * r, y: Math.sin(a) * r * .92, c: Math.random(), s: rand(0, 7) }; });
  let ring = 190, speed = 110, rest = .4, toss = 0, streak = 0, flame = 0;
  const fresh = () => { ring = 190; rest = .22; speed = Math.min(250, speed + 7); };
  function hit() {
    if (rest > 0) return;
    const gap = Math.abs(ring - rim);
    if (gap < 9) { streak++; api.score(2); sfx.great(); sfx.huss(); pops.push({ text: 'wok hei! +2', x: cx, y: 96, t: 0, color: '#ffd97a' }); toss = 1; }
    else if (gap < 24) { streak++; api.score(1); sfx.good(); pops.push({ text: '+1', x: cx, y: 96, t: 0 }); toss = .7; }
    else { streak = 0; api.miss(); sfx.bad(); pops.push({ text: ring > rim ? 'too early' : 'too late', x: cx, y: 96, t: 0, color: '#ffb4a2' }); }
    fresh();
  }
  return {
    lives: 3, unit: 'points of wok hei',
    tap: hit, key(k) { if (k === ' ' || k === 'Enter') { hit(); return true; } },
    update(dt) {
      flame += dt; toss = Math.max(0, toss - dt * 1.7);
      if (rest > 0) { rest -= dt; return; }
      ring -= speed * dt;
      if (ring < rim - 30) { streak = 0; api.miss(); sfx.bad(); pops.push({ text: 'too late', x: cx, y: 96, t: 0, color: '#ffb4a2' }); fresh(); }
    },
    draw(g, dt) {
      g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2f3537'; g.beginPath(); g.roundRect(14, 26, W - 28, H - 52, 22); g.fill();
      for (let i = 0; i < 14; i++) {                 // burner flames round the wok
        const a = i / 14 * Math.PI * 2, lick = 12 + Math.sin(flame * 11 + i * 2.1) * 7 + streak * 1.5;
        g.fillStyle = i % 2 ? '#ff9d3c' : '#ffd15c'; g.beginPath(); g.ellipse(cx + Math.cos(a) * (rim + 16), cy + Math.sin(a) * (rim + 16), lick, 8, a, 0, 7); g.fill();
      }
      g.fillStyle = '#15181a'; g.beginPath(); g.arc(cx, cy, rim + 8, 0, 7); g.fill();
      g.fillStyle = '#3a4043'; g.beginPath(); g.arc(cx, cy, rim, 0, 7); g.fill();
      g.fillStyle = '#2a2f31'; g.beginPath(); g.arc(cx, cy, rim - 14, 0, 7); g.fill();
      g.fillStyle = '#15181a'; g.beginPath(); g.roundRect(cx - 14, cy + rim, 28, 74, 10); g.fill();
      const lift = Math.sin(toss * Math.PI) * 62, spread = 1 + Math.sin(toss * Math.PI) * .25;
      for (const r of grains) {
        const hop = lift * (.5 + r.c * .8);
        g.fillStyle = r.c < .68 ? '#f1ddb0' : r.c < .8 ? '#e9a13c' : r.c < .9 ? '#5d8a48' : '#c8402d';
        g.beginPath(); g.ellipse(cx + r.x * spread, cy + r.y * spread - hop, 5.5, 3, r.s + toss * 6, 0, 7); g.fill();
      }
      g.strokeStyle = '#fbf3e255'; g.lineWidth = 3; g.setLineDash([5, 7]); g.beginPath(); g.arc(cx, cy, rim, 0, 7); g.stroke(); g.setLineDash([]);
      if (rest <= 0) { const near = Math.abs(ring - rim) < 24; g.strokeStyle = near ? '#a8e08a' : '#fbf3e2'; g.lineWidth = near ? 8 : 5; g.beginPath(); g.arc(cx, cy, Math.max(4, ring), 0, 7); g.stroke(); }
      if (streak > 2) label(g, streak + ' in a row', cx, 54, 16, '#ffd97a');
      floaters(pops, g, dt);
    }
  };
}

// ---- 4. Gepuk!: smash the chicken, leave the cat alone ----------------------
function gepuk(api) {
  const pops = [], boards = Array.from({ length: 6 }, (_, i) => ({ x: 78 + i % 3 * 102, y: 142 + Math.floor(i / 3) * 132, what: null, t: 0, life: 0, hit: 0 }));
  let wait = .5, elapsed = 0, pestle = null;
  return {
    time: 30, lives: 3, unit: 'pieces of ayam gepuk',
    tap(x, y) {
      const b = boards.find(o => Math.hypot(o.x - x, o.y - y) < 50); if (!b) return;
      pestle = { x: b.x, y: b.y, t: 0 }; sfx.thunk();
      if (b.what === 'chicken') { b.what = 'smashed'; b.t = 0; b.life = .45; api.score(1); pops.push({ text: 'gepuk!', x: b.x, y: b.y - 44, t: 0 }); }
      else if (b.what === 'cat') { b.what = null; api.miss(); sfx.bad(); pops.push({ text: 'not the cat!', x: b.x, y: b.y - 44, t: 0, size: 15, color: '#ffb4a2' }); }
    },
    update(dt) {
      elapsed += dt; wait -= dt; if (pestle) { pestle.t += dt; if (pestle.t > .22) pestle = null; }
      for (const b of boards) if (b.what) { b.t += dt; if (b.t > b.life) b.what = null; }
      if (wait <= 0) {
        const free = boards.filter(b => !b.what);
        if (free.length) { const b = free[Math.floor(Math.random() * free.length)]; b.what = Math.random() < .22 ? 'cat' : 'chicken'; b.t = 0; b.life = Math.max(.62, 1.25 - elapsed / 45); }
        wait = Math.max(.3, .75 - elapsed / 70);
      }
    },
    draw(g, dt) {
      g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#7a4c33'; g.beginPath(); g.roundRect(14, 26, W - 28, H - 52, 22); g.fill();
      g.fillStyle = '#8c5a3d'; g.beginPath(); g.roundRect(22, 34, W - 44, H - 68, 16); g.fill();
      for (const b of boards) {
        g.fillStyle = '#00000026'; g.beginPath(); g.arc(b.x, b.y + 5, 46, 0, 7); g.fill();
        g.fillStyle = '#6f7577'; g.beginPath(); g.arc(b.x, b.y, 45, 0, 7); g.fill();
        g.fillStyle = '#868d8f'; g.beginPath(); g.arc(b.x, b.y - 2, 39, 0, 7); g.fill();
        if (!b.what) continue;
        const pop = Math.min(1, b.t * 9) * Math.min(1, (b.life - b.t) * 9);
        g.save(); g.translate(b.x, b.y - 2); g.scale(pop, pop);
        if (b.what === 'chicken') {
          g.fillStyle = '#a8661f'; g.beginPath(); g.ellipse(0, 3, 30, 22, -.3, 0, 7); g.fill();
          g.fillStyle = '#d2923a'; g.beginPath(); g.ellipse(-2, -1, 28, 20, -.3, 0, 7); g.fill();
          g.fillStyle = '#e8b45c'; for (const [x, y] of [[-12, -6], [4, -9], [10, 4], [-6, 7], [16, -4]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
          g.fillStyle = '#f3ead8'; g.beginPath(); g.roundRect(22, -16, 16, 7, 3); g.fill();
        } else if (b.what === 'smashed') {
          g.fillStyle = '#b5382a'; g.beginPath(); g.ellipse(0, 2, 36, 27, .2, 0, 7); g.fill();
          g.fillStyle = '#d2923a'; g.beginPath(); g.ellipse(0, 0, 33, 14, -.2, 0, 7); g.fill();
          g.fillStyle = '#7fae5a'; g.beginPath(); g.ellipse(20, 14, 9, 4, .6, 0, 7); g.fill();
        } else {                                     // the market cat's paw reaching for a snack
          g.fillStyle = '#d9d2c6'; g.beginPath(); g.roundRect(-13, -2, 26, 46, 12); g.fill();
          g.beginPath(); g.arc(0, -6, 19, 0, 7); g.fill();
          g.fillStyle = '#e9a7a0'; g.beginPath(); g.ellipse(0, -2, 8, 6, 0, 0, 7); g.fill();
          for (const x of [-11, 0, 11]) { g.beginPath(); g.arc(x, -15 + Math.abs(x) * .25, 4.2, 0, 7); g.fill(); }
        }
        g.restore();
      }
      if (pestle) {                                  // the stone pestle coming down
        const drop = Math.min(1, pestle.t / .08);
        g.save(); g.translate(pestle.x + 22 - drop * 12, pestle.y - 78 + drop * 44); g.rotate(.5);
        g.fillStyle = '#4b5052'; g.beginPath(); g.roundRect(-11, -34, 22, 68, 11); g.fill();
        g.fillStyle = '#5f6668'; g.beginPath(); g.roundRect(-7, -30, 9, 60, 5); g.fill(); g.restore();
      }
      floaters(pops, g, dt);
    }
  };
}

export const games = [
  { id: 'huss', name: 'Huss Huss Huss', stall: 'Burger stall', tone: '#b0503f', make: huss,
    how: 'Fold the egg round the patty. Tap the side the arrow points at, four folds a burger. A wrong fold costs a second.' },
  { id: 'flip', name: 'Flip It', stall: 'Burger stall', tone: '#7a4a2a', make: flip,
    how: 'Tap a patty when its ring turns green to flip it, then again to serve. Three burnt patties and the grill closes.' },
  { id: 'wok', name: 'Wok Hei', stall: 'Fried rice stall', tone: '#c58a2b', make: wok,
    how: 'Tap anywhere as the ring meets the rim of the wok to toss the nasi goreng. Dead on scores double. Three misses and the rice is on the floor.' },
  { id: 'gepuk', name: 'Gepuk!', stall: 'Ayam Gepuk Pipchun', tone: '#b5382a', make: gepuk,
    how: 'Smash every piece of fried chicken before it is taken away. Leave the market cat alone: three smacked paws and you are out.' }
];

// ---- the arcade dialog ------------------------------------------------------
const box = $('arcade'), canvas = $('arcade-canvas'), g = canvas.getContext('2d');
let current = null, play = null, state = 'menu', score = 0, lives = 0, left = 0, last = 0, loop = 0, player = '';
const best = id => { try { return +localStorage.getItem('taman-pip-best-' + id) || 0; } catch { return 0; } };
function size() {
  const ratio = Math.min(devicePixelRatio || 1, 2.5);
  canvas.width = W * ratio; canvas.height = H * ratio; g.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function hud() {
  $('arcade-score').textContent = score;
  $('arcade-lives').textContent = play?.lives ? '●'.repeat(Math.max(0, lives)) + '○'.repeat(Math.max(0, play.lives - lives)) : '';
  $('arcade-time').hidden = !play?.time;
  if (play?.time) $('arcade-time').firstElementChild.style.width = clamp(left / play.time * 100, 0, 100) + '%';
}
function panel(mode) {
  state = mode;
  box.dataset.state = mode;
  $('arcade-panel').hidden = mode === 'play';
  $('arcade-menu').hidden = mode !== 'menu';
  $('arcade-brief').hidden = mode === 'menu';
  $('arcade-hud').hidden = mode === 'menu';
  $('arcade-back').hidden = mode === 'menu' || mode === 'play';
  if (mode === 'menu') { $('arcade-stall').textContent = 'Pasar malam'; $('arcade-title').textContent = 'Stall games'; return; }
  $('arcade-stall').textContent = current.stall; $('arcade-title').textContent = current.name;
  const record = best(current.id);
  if (mode === 'ready') {
    $('arcade-result').textContent = ''; $('arcade-how').textContent = current.how;
    $('arcade-best').textContent = record ? 'Your best: ' + record : '';
    $('arcade-go').textContent = 'Start'; $('arcade-share').hidden = true;
  } else if (mode === 'over') {
    $('arcade-result').textContent = score + ' ' + play.unit;
    $('arcade-how').textContent = score >= record && score > 0 ? 'A new best' + (player ? ' for @' + player : '') + '.' : 'Your best is ' + record + '.';
    $('arcade-best').textContent = '';
    $('arcade-go').textContent = 'Play again'; $('arcade-share').hidden = !score; $('arcade-share').textContent = 'Share score';
  }
}
function finish() {
  cancelAnimationFrame(loop); loop = 0; sfx.over();
  try { if (score > best(current.id)) localStorage.setItem('taman-pip-best-' + current.id, score); } catch {}
  panel('over');
}
const api = {
  score(n) { score += n; hud(); },
  miss() { if (play.lives) { lives--; hud(); if (lives <= 0) left = -1; } },
  penalty(seconds) { left -= seconds; }
};
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  play.update(dt);
  if (play.time) left -= dt;
  play.draw(g, dt); hud();
  if ((play.time && left <= 0) || left < 0) return finish();
  loop = requestAnimationFrame(frame);
}
function begin() {
  voice();
  play = current.make(api); score = 0; lives = play.lives || 0; left = play.time || 0;
  panel('play'); hud(); last = performance.now(); cancelAnimationFrame(loop); loop = requestAnimationFrame(frame);
}
function pick(game) {
  cancelAnimationFrame(loop); loop = 0;
  current = game; play = game.make(api); score = 0; lives = play.lives || 0; left = play.time || 0;
  size(); play.draw(g, 0); hud(); panel('ready');
}
export function openGames(id, as = '') {
  player = as;
  const game = games.find(o => o.id === id);
  if (!box.open) box.showModal();
  if (game) pick(game); else { cancelAnimationFrame(loop); loop = 0; current = null; play = null; panel('menu'); }
}
for (const game of games) {
  const b = document.createElement('button'); b.className = 'arcade-pick'; b.style.setProperty('--tone', game.tone);
  const badge = document.createElement('span'); badge.className = 'lot'; badge.textContent = 'Play';
  const words = document.createElement('span'), title = document.createElement('strong'), sub = document.createElement('small');
  title.textContent = game.name; sub.textContent = game.stall; words.append(title, sub);
  b.append(badge, words); b.onclick = () => pick(game); $('arcade-menu').append(b);
}
$('arcade-go').onclick = begin;
$('arcade-back').onclick = () => openGames(null, player);
$('arcade-close').onclick = () => box.close();
box.addEventListener('close', () => { cancelAnimationFrame(loop); loop = 0; });
box.addEventListener('click', event => { if (event.target === box && state !== 'play') box.close(); });
$('arcade-sound').setAttribute('aria-pressed', String(!muted));
$('arcade-sound').onclick = () => {
  muted = !muted; $('arcade-sound').setAttribute('aria-pressed', String(!muted));
  try { localStorage.setItem('taman-pip-mute', muted ? '1' : '0'); } catch {}
};
$('arcade-share').onclick = async () => {
  const url = location.origin + location.pathname + '?game=' + current.id;
  const text = (player ? '@' + player + ' scored ' : 'I scored ') + score + ' in ' + current.name + ' at the Taman Pip pasar malam. Beat that:';
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({ title: 'Taman Pip', text, url });
    else { await navigator.clipboard.writeText(text + ' ' + url); $('arcade-share').textContent = 'Copied'; }
  } catch (error) { if (error.name !== 'AbortError') prompt('Copy this', text + ' ' + url); }
};
canvas.addEventListener('pointerdown', event => {
  if (state !== 'play') return;
  event.preventDefault();
  const r = canvas.getBoundingClientRect();
  play.tap((event.clientX - r.left) / r.width * W, (event.clientY - r.top) / r.height * H);
});
addEventListener('keydown', event => {
  if (!box.open || state !== 'play') return;
  if (play.key?.(event.key)) event.preventDefault();
});
addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') { left = -1; } });
