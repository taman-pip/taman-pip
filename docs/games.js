// Pasar malam stall games: four short tap games, each opened at its own stall, played in a dialog over the town.
// Everything is drawn on one canvas; the sounds come from sound.js, so there is nothing to download.
const W = 360, H = 400;
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t, 0, 1)));
const rgb = c => 'rgb(' + c.join(',') + ')';

import { sound } from './sound.js?v=202611211636';
const sfx = sound;

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

function wrapPaper(g, cx, cy, half) {            // a sheet of greaseproof paper
  g.fillStyle = '#00000022'; g.beginPath(); g.roundRect(cx - half + 3, cy - half + 5, half * 2, half * 2, 10); g.fill();
  g.fillStyle = '#fbf8ef'; g.beginPath(); g.roundRect(cx - half, cy - half, half * 2, half * 2, 10); g.fill();
  g.strokeStyle = '#e3dccb'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = '#c8402d2e'; g.lineWidth = 3;
  for (let i = -half + 18; i < half; i += 26) { g.beginPath(); g.moveTo(cx + i, cy - half + 8); g.lineTo(cx + i, cy + half - 8); g.stroke(); }
}
function burgerBun(g, cx, cy, scale) {            // the finished burger, seen from above
  const r = 58 * scale;
  g.fillStyle = '#f3d77c'; g.beginPath(); g.ellipse(cx, cy + 5 * scale, r * 1.06, r * .98, 0, 0, 7); g.fill();     // egg peeking out
  g.fillStyle = '#9c5f25'; g.beginPath(); g.ellipse(cx, cy + 4 * scale, r, r * .92, 0, 0, 7); g.fill();
  g.fillStyle = '#c98a3e'; g.beginPath(); g.ellipse(cx, cy, r * .97, r * .88, 0, 0, 7); g.fill();
  g.fillStyle = '#f6e7c3';
  for (const [x, y] of [[-26, -16], [-5, -27], [19, -18], [-16, 7], [9, 2], [29, 9], [-2, 23]]) { g.beginPath(); g.ellipse(cx + x * scale, cy + y * scale, 4 * scale, 2.4 * scale, x, 0, 7); g.fill(); }
}
function paperFlap(g, cx, cy, half, [vx, vy], amount) {   // one side of the paper folded over the burger
  const reach = amount * half * .62, start = half * .40;
  g.fillStyle = '#f6f1e4'; g.beginPath();
  if (vx) g.roundRect(vx > 0 ? cx + half - start - reach : cx - half, cy - half + 5, start + reach, half * 2 - 10, 9);
  else g.roundRect(cx - half + 5, vy > 0 ? cy + half - start - reach : cy - half, half * 2 - 10, start + reach, 9);
  g.fill(); g.strokeStyle = '#d6cdb8'; g.lineWidth = 2; g.stroke();
}

// ---- 1. Hus Hus Hus: wrap the finished burger in paper, three folds, one hus each ----
function huss(api) {
  const sides = ['top', 'right', 'bottom', 'left'], vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
  let order, step, fold, shake, leave, pops = [], pulse = 0;
  const next = () => { order = [...sides].sort(() => Math.random() - .5).slice(0, 3); step = 0; fold = { top: 0, right: 0, bottom: 0, left: 0 }; leave = 0; };
  next();
  function choose(side) {
    if (leave) return;
    if (side === order[step]) {
      sfx.hus(step); step++; pops.push({ text: 'hus', x: W / 2 + vectors[side][0] * 86, y: 200 + vectors[side][1] * 86, t: 0 });
      if (step === 3) { api.score(1); leave = .001; }
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
      g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, W, H);                 // the stall counter
      g.fillStyle = '#8c5a3d'; g.beginPath(); g.roundRect(14, 26, W - 28, H - 52, 22); g.fill();
      g.fillStyle = '#9b6646'; g.beginPath(); g.roundRect(22, 34, W - 44, H - 68, 16); g.fill();
      const cx = W / 2 + (shake ? Math.sin(shake * 60) * 5 : 0) + (leave ? leave * leave * 1500 : 0), cy = 200, half = 104;
      wrapPaper(g, cx, cy, half); burgerBun(g, cx, cy, 1);
      for (const s of sides) if (fold[s]) paperFlap(g, cx, cy, half, vectors[s], fold[s]);
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

// ---- 2. Air Balang: a neighbour asks for a drink, mix it from the jars ----------
function balang(api) {
  const jars = [
    { id: 'sirap', name: 'Sirap', c: [213, 48, 62] }, { id: 'susu', name: 'Susu', c: [250, 244, 230] }, { id: 'limau', name: 'Limau', c: [150, 200, 62] },
    { id: 'teh', name: 'Teh', c: [146, 84, 40] }, { id: 'jagung', name: 'Jagung', c: [242, 196, 52] }];
  const jar = id => jars.find(o => o.id === id), slot = i => ({ x: 12 + i * 68, y: 306, w: 64, h: 78 });
  const menu = [['Sirap ais', 'sirap', 'sirap'], ['Bandung', 'sirap', 'susu'], ['Teh ais', 'teh', 'susu'], ['Teh O ais', 'teh', 'teh'], ['Limau ais', 'limau', 'limau'],
    ['Sirap limau', 'sirap', 'limau'], ['Teh O limau', 'teh', 'limau'], ['Jagung susu', 'jagung', 'susu'], ['Air jagung', 'jagung', 'jagung']];
  const shells = ['#e9c9a0', '#d7a877', '#f0d9b5', '#c99262'], coats = ['#c16047', '#3d7772', '#c59049', '#737698', '#8b4649'];
  const blend = ids => ids.reduce((sum, id) => sum.map((v, k) => v + jar(id).c[k] / ids.length), [0, 0, 0]).map(Math.round);
  let order, cup = [], served = 0, mood = 0, shake = 0, leave = 0, last = -1, who = 0, pops = [], pulse = 0;
  const next = () => { let n; do n = Math.floor(Math.random() * Math.min(menu.length, 4 + served)); while (n === last); last = n; order = menu[n]; cup = []; leave = 0; mood = 0; who++; };
  next();
  function pour(id) {
    if (leave || cup.length > 1) return;
    cup.push(id); sfx.good();
    if (cup.length < 2) return;
    if ([...cup].sort().join() === order.slice(1).sort().join()) { served++; api.score(1); sfx.great(); mood = 1; leave = .001; pops.push({ text: 'Sedap!', x: 250, y: 190, t: 0 }); }
    else { api.penalty(2); sfx.bad(); mood = -1; shake = .35; pops.push({ text: '-2s', x: 250, y: 190, t: 0, color: '#ffb4a2' }); }
  }
  function glass(g, x, y, w, h, colours) {            // a tall glass, filled a half for each ladle
    g.fillStyle = '#ffffff55'; g.beginPath(); g.moveTo(x - w / 2, y - h); g.lineTo(x + w / 2, y - h); g.lineTo(x + w * .4, y); g.lineTo(x - w * .4, y); g.closePath(); g.fill();
    if (colours.length) {
      const level = colours.length / 2, top = y - h * .92 * level, half = w * (.4 + .1 * .92 * level);
      g.fillStyle = rgb(blend(colours)); g.beginPath(); g.moveTo(x - half, top); g.lineTo(x + half, top); g.lineTo(x + w * .4, y); g.lineTo(x - w * .4, y); g.closePath(); g.fill();
      g.fillStyle = '#ffffff66'; for (const [dx, dy] of [[-.14, .1], [.12, .22], [-.02, .34]]) if (y - h * dy * 2 * level > top) g.fillRect(x + w * dx - 5, y - h * dy * 2 * level - 5, 10, 10);   // ice
    }
    g.strokeStyle = '#ffffffcc'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - w / 2, y - h); g.lineTo(x - w * .4, y); g.lineTo(x + w * .4, y); g.lineTo(x + w / 2, y - h); g.stroke();
  }
  return {
    time: 40, unit: 'drinks served',
    tap(x, y) { jars.forEach((o, i) => { const b = slot(i); if (x >= b.x && x <= b.x + b.w && y >= b.y - 6 && y <= b.y + b.h + 6) pour(o.id); }); },
    key(k) { const n = '12345'.indexOf(k); if (n >= 0) pour(jars[n].id); return n >= 0; },
    update(dt) {
      pulse += dt; shake = Math.max(0, shake - dt);
      if (mood < 0 && !shake) { mood = 0; cup = []; }
      if (leave) { leave += dt; if (leave > .6) next(); }
    },
    draw(g, dt) {
      g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2f5d57'; g.fillRect(0, 0, W, 34); g.fillStyle = '#27504a'; for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 34); g.lineTo(x + 20, 48); g.lineTo(x + 40, 34); g.fill(); }   // the tent valance
      // The neighbour at the counter.
      const slide = leave ? leave * leave * 500 : 0, ex = 82 - slide, ey = 196 + Math.sin(pulse * 3) * 2 + (mood > 0 ? -Math.abs(Math.sin(pulse * 14)) * 8 : 0) + (shake ? Math.sin(shake * 60) * 3 : 0);
      g.fillStyle = coats[who % coats.length]; g.beginPath(); g.ellipse(ex, ey + 30, 44, 34, 0, 0, 7); g.fill();
      g.fillStyle = shells[who % shells.length]; g.beginPath(); g.ellipse(ex, ey - 14, 40, 50, 0, 0, 7); g.fill();
      g.fillStyle = '#2b2622'; g.beginPath(); g.arc(ex - 13, ey - 20, 4, 0, 7); g.arc(ex + 13, ey - 20, 4, 0, 7); g.fill();
      g.strokeStyle = '#2b2622'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
      if (mood < 0) g.arc(ex, ey + 6, 9, Math.PI * 1.15, Math.PI * 1.85); else g.arc(ex, ey - 6, mood > 0 ? 12 : 8, Math.PI * .15, Math.PI * .85);
      g.stroke();
      // What they asked for.
      if (!leave) {
        g.fillStyle = '#fffdf4'; g.beginPath(); g.roundRect(128, 62, 220, 86, 16); g.fill(); g.beginPath(); g.moveTo(140, 140); g.lineTo(118, 166); g.lineTo(166, 146); g.fill();
        g.fillStyle = '#213f31'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '600 13px "DM Sans",Arial,sans-serif'; g.fillText('One, please:', 144, 82);
        g.font = '700 22px "DM Sans",Arial,sans-serif'; g.fillText(order[0], 144, 106);
        g.fillStyle = rgb(blend(order.slice(1))); g.strokeStyle = '#213f3155'; g.lineWidth = 2; g.beginPath(); g.roundRect(304, 76, 30, 44, 6); g.fill(); g.stroke();
        if (served < 3) {                              // the first few orders show the recipe
          order.slice(1).forEach((id, i) => { g.fillStyle = rgb(jar(id).c); g.strokeStyle = '#213f3155'; g.beginPath(); g.arc(152 + i * 22, 130, 8, 0, 7); g.fill(); g.stroke(); });
          g.fillStyle = '#213f31aa'; g.font = '600 12px "DM Sans",Arial,sans-serif'; g.fillText(order.slice(1).map(id => jar(id).name).join(' + '), 196, 131);
        }
      }
      // The counter, the glass being filled, and the jars.
      g.fillStyle = '#f4efe2'; g.fillRect(0, 262, W, 16); g.fillStyle = '#7a5230'; g.fillRect(0, 278, W, H - 278);
      glass(g, 250 + (shake ? Math.sin(shake * 60) * 5 : 0) - slide * .6, 262, 62, 92, cup);
      jars.forEach((o, i) => {
        const b = slot(i), lit = !leave && cup.length < 2 && order.slice(1).includes(o.id) && served < 3;
        g.fillStyle = '#ffffff40'; g.beginPath(); g.roundRect(b.x + 6, b.y, b.w - 12, b.h - 20, 10); g.fill();
        g.fillStyle = rgb(o.c); g.beginPath(); g.roundRect(b.x + 6, b.y + 10, b.w - 12, b.h - 30, [4, 4, 10, 10]); g.fill();
        g.fillStyle = '#b9b9bd'; g.beginPath(); g.roundRect(b.x + 3, b.y - 6, b.w - 6, 9, 4); g.fill();
        g.strokeStyle = lit ? '#fbf3e2' : '#00000022'; g.lineWidth = lit ? 3 + Math.sin(pulse * 8) : 2; g.beginPath(); g.roundRect(b.x + 6, b.y, b.w - 12, b.h - 20, 10); g.stroke();
        g.fillStyle = '#fbf3e2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 13px "DM Sans",Arial,sans-serif'; g.fillText(o.name, b.x + b.w / 2, b.y + b.h - 8);
      });
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
    if (gap < 9) { streak++; api.score(2); sfx.great(); pops.push({ text: 'wok hei! +2', x: cx, y: 96, t: 0, color: '#ffd97a' }); toss = 1; }
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
  { id: 'hus', name: 'Hus Hus Hus', stall: 'Burger stall', tone: '#b0503f', make: huss,
    how: 'Wrap each burger in paper: three folds, hus, hus, hus. Tap the side the arrow points at. A wrong fold costs a second.' },
  { id: 'balang', name: 'Air Balang', stall: 'Air Balang', tone: '#336761', make: balang,
    how: 'A neighbour asks for a drink. Mix it with two ladles from the jars: Bandung is sirap and susu, Teh ais is teh and susu. The first few orders show the recipe; after that, go by the name and the colour. A wrong mix costs two seconds.' },
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
  $('arcade-back').hidden = true;                  // each game is played at its own stall, there is no menu to go back to
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
  cancelAnimationFrame(loop); loop = 0; sfx.over(); sound.music('town');
  try { if (score > best(current.id)) localStorage.setItem('taman-pip-best-' + current.id, score); } catch {}
  panel('over');
  dispatchEvent(new CustomEvent('taman-game', { detail: { id: current.id, score } }));
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
  sound.unlock(); sound.music('game'); sound.stall(true);
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
  const game = games.find(o => o.id === ({ flip: 'hus', special: 'hus', huss: 'hus' }[id] || id));   // earlier names still open the same games
  if (!box.open) box.showModal();
  sound.stall(true);
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
box.addEventListener('close', () => { cancelAnimationFrame(loop); loop = 0; sound.music('town'); sound.stall(false); });
box.addEventListener('click', event => { if (event.target === box && state !== 'play') box.close(); });
sound.onChange(muted => $('arcade-sound').setAttribute('aria-pressed', String(!muted)));
$('arcade-sound').onclick = () => sound.setMuted(!sound.muted);
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
