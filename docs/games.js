// Pasar malam stall games: four short tap games played in a dialog over the town.
// Everything is drawn on one canvas; the sounds come from sound.js, so there is nothing to download.
const W = 360, H = 400;
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t, 0, 1)));
const rgb = c => 'rgb(' + c.join(',') + ')';

import { sound } from './sound.js?v=202611211600';
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

// ---- 2. Burger Special: the pasar malam way, one order at a time -------------
// Patty on, flip it, crack the egg and spread it thin, cheese if the order wants it (the egg tucks itself
// round the patty), the sauces on the ticket, into the bun, and last of all the paper: hus, hus, hus.
function special(api) {
  const cx = W / 2, cy = 166, pops = [], sides = ['top', 'right', 'bottom', 'left'], vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
  const tray = [
    { id: 'patty', name: 'Patty', x: 15, y: 278, w: 78, h: 48 }, { id: 'egg', name: 'Egg', x: 99, y: 278, w: 78, h: 48 },
    { id: 'cheese', name: 'Cheese', x: 183, y: 278, w: 78, h: 48 }, { id: 'bun', name: 'Bun', x: 267, y: 278, w: 78, h: 48 },
    { id: 'chili', name: 'Chili', x: 15, y: 332, w: 106, h: 48 }, { id: 'mayo', name: 'Mayo', x: 127, y: 332, w: 106, h: 48 },
    { id: 'pepper', name: 'Black pepper', x: 239, y: 332, w: 106, h: 48 }
  ];
  const raw = [222, 140, 126], done = [124, 76, 42], burnt = [34, 28, 26];
  let order, stage, t, ready, burn, spin, egg, cheese, folds, foldOrder, sauced, leave, tuck, bunOn, shake = 0, pulse = 0, press = null;
  function next() {
    const sauces = ['chili', 'mayo', 'pepper'].filter(() => Math.random() < .6);
    order = { cheese: Math.random() < .6, sauces: sauces.length ? sauces : ['chili'] };
    stage = 'patty'; t = 0; spin = 0; egg = 0; cheese = false; folds = { top: 0, right: 0, bottom: 0, left: 0 }; foldOrder = []; sauced = []; leave = 0; tuck = 0; bunOn = false;
  }
  next();
  const wrong = text => { shake = .3; api.penalty(1); sfx.bad(); pops.push({ text: text || '-1s', x: cx, y: 96, t: 0, color: '#ffb4a2', size: 16 }); };
  const hint = () => ({ patty: 'Put a patty on', cook: t < ready ? 'Wait for the green ring…' : 'Flip it now', egg: 'Crack an egg', cheese: 'Add the cheese',
    wrap: 'Wrap it: hus, hus, hus', sauce: 'Sauce: ' + order.sauces.filter(o => !sauced.includes(o)).join(', '), bun: 'Into the bun' }[stage]);
  function useTray(id) {
    press = { id, t: .18 };
    if (stage === 'patty' && id === 'patty') { stage = 'cook'; t = 0; ready = rand(1.3, 1.9); burn = ready + 1.7; sfx.sizzle(); }
    else if (stage === 'egg' && id === 'egg') { egg = .01; sfx.sizzle(); stage = order.cheese ? 'cheese' : 'sauce'; if (stage === 'sauce') tuck = .01; }
    else if (stage === 'cheese' && id === 'cheese') { cheese = true; sfx.good(); stage = 'sauce'; tuck = .01; }
    else if (stage === 'sauce' && order.sauces.includes(id) && !sauced.includes(id)) { sauced.push(id); sfx.good(); if (sauced.length === order.sauces.length) stage = 'bun'; }
    else if (stage === 'bun' && id === 'bun') { bunOn = true; sfx.good(); stage = 'wrap'; foldOrder = [...sides].sort(() => Math.random() - .5).slice(0, 3); }
    else wrong(stage === 'sauce' && ['chili', 'mayo', 'pepper'].includes(id) ? 'not on the order' : '-1s');
  }
  function useGriddle(x, y) {
    if (stage === 'cook') {
      if (Math.hypot(x - cx, y - cy) > 60) return;
      if (t < ready) { pops.push({ text: 'not yet', x: cx, y: cy - 56, t: 0, size: 15 }); return; }
      spin = 1; sfx.sizzle(); stage = 'egg';
    } else if (stage === 'wrap') {
      const dx = x - cx, dy = y - cy, side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top');
      const want = foldOrder.find(o => !folds[o]);
      if (side === want) { sfx.hus(foldOrder.indexOf(side)); folds[side] = .01; pops.push({ text: 'hus', x: cx + vectors[side][0] * 70, y: cy + vectors[side][1] * 70, t: 0 }); if (foldOrder.every(o => folds[o])) { api.score(1); sfx.great(); leave = .001; pops.push({ text: 'Siap! +1', x: cx, y: 96, t: 0 }); } }
      else wrong();
    }
  }
  return {
    time: 60, unit: 'burger specials served',
    tap(x, y) {
      if (leave) return;
      const button = tray.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
      if (button) useTray(button.id); else if (y < 272) useGriddle(x, y);
    },
    update(dt) {
      pulse += dt; shake = Math.max(0, shake - dt); spin = Math.max(0, spin - dt * 4);
      if (press) { press.t -= dt; if (press.t <= 0) press = null; }
      if (egg) egg = Math.min(1, egg + dt * 4);
      if (tuck) tuck = Math.min(1, tuck + dt * 5);
      for (const o of sides) if (folds[o]) folds[o] = Math.min(1, folds[o] + dt * 9);
      if (stage === 'cook') { t += dt; if (t >= burn) { sfx.bad(); api.penalty(2); pops.push({ text: 'burnt! -2s', x: cx, y: 96, t: 0, color: '#ffb4a2', size: 16 }); stage = 'patty'; } }
      if (leave) { leave += dt; if (leave > .55) next(); }
    },
    draw(g, dt) {
      g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, W, H);
      // the order ticket
      g.fillStyle = '#fffdf4'; g.beginPath(); g.roundRect(14, 8, W - 28, 44, 10); g.fill();
      g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#58695f'; g.font = '700 11px "DM Sans",Arial,sans-serif'; g.fillText('ORDER', 26, 21);
      g.fillStyle = '#213f31'; g.font = '700 15px "DM Sans",Arial,sans-serif';
      g.fillText('Special' + (order.cheese ? ' + cheese' : ', no cheese') + ' · ' + order.sauces.map(o => o === 'pepper' ? 'black pepper' : o).join(', '), 26, 38);
      // griddle
      g.fillStyle = '#2f3537'; g.beginPath(); g.roundRect(14, 58, W - 28, 212, 20); g.fill();
      g.fillStyle = '#3d4447'; g.beginPath(); g.roundRect(22, 66, W - 44, 196, 14); g.fill();
      const ox = cx + (shake ? Math.sin(shake * 60) * 5 : 0) + (leave ? leave * leave * 1300 : 0);
      if (bunOn) wrapPaper(g, ox, cy, 84);
      if (egg && !bunOn) {                           // the egg spread thin
        const half = 30 + egg * 44;
        g.fillStyle = '#f6dc8a'; g.beginPath(); g.roundRect(ox - half, cy - half, half * 2, half * 2, 22); g.fill();
        g.fillStyle = '#fbefc4'; g.beginPath(); g.roundRect(ox - half + 8, cy - half + 8, half * 2 - 16, half * 2 - 16, 16); g.fill();
      }
      if (stage !== 'patty' && !bunOn) {             // the patty, split open and seasoned
        const colour = stage === 'cook' ? (t < ready ? mix(raw, done, t / ready) : mix(done, burnt, (t - ready) / (burn - ready) * .9)) : done;
        g.save(); g.translate(ox, cy - Math.sin(spin * Math.PI) * 24); g.scale(1, 1 - Math.sin(spin * Math.PI) * .85);
        g.fillStyle = rgb(mix(colour, [0, 0, 0], .28)); g.beginPath(); g.arc(0, 4, 37, 0, 7); g.fill();
        g.fillStyle = rgb(colour); g.beginPath(); g.arc(0, 0, 36, 0, 7); g.fill();
        g.strokeStyle = rgb(mix(colour, [0, 0, 0], .35)); g.lineWidth = 3;
        for (const off of [-12, 0, 12]) { g.beginPath(); g.moveTo(-21, off); g.lineTo(21, off + 5); g.stroke(); }
        g.restore();
        if (stage === 'cook' && t >= ready) {
          const left = 1 - (t - ready) / (burn - ready);
          g.strokeStyle = left > .4 ? '#a8e08a' : '#ffb35c'; g.lineWidth = 6; g.lineCap = 'round';
          g.beginPath(); g.arc(ox, cy, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke(); g.lineCap = 'butt';
        }
      }
      if (cheese && !bunOn) { g.save(); g.translate(ox, cy); g.rotate(.5); g.fillStyle = '#f2b632'; g.beginPath(); g.roundRect(-25, -25, 50, 50, 5); g.fill(); g.fillStyle = '#f7cf62'; g.beginPath(); g.roundRect(-20, -20, 40, 40, 4); g.fill(); g.restore(); }
      if (tuck && !bunOn) for (const o of sides) {   // the egg tucks itself round the patty
        const [vx, vy] = vectors[o], half = 74, reach = tuck * 44;
        g.fillStyle = '#f3d77c'; g.beginPath();
        if (vx) g.roundRect(vx > 0 ? ox + half - 32 - reach : ox - half, cy - half + 6, 32 + reach, half * 2 - 12, 14);
        else g.roundRect(ox - half + 6, vy > 0 ? cy + half - 32 - reach : cy - half, half * 2 - 12, 32 + reach, 14);
        g.fill(); g.strokeStyle = '#d9b655'; g.lineWidth = 2; g.stroke();
      }
      const squiggle = (colour, shift) => { g.strokeStyle = colour; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i <= 8; i++) { const x = ox - 48 + i * 12, y = cy + shift + (i % 2 ? 9 : -9); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.lineCap = 'butt'; };
      if (!bunOn && sauced.includes('chili')) squiggle('#c8321f', -22);
      if (!bunOn && sauced.includes('mayo')) squiggle('#fff7df', 4);
      if (!bunOn && sauced.includes('pepper')) { g.fillStyle = '#2b2622'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(ox - 46 + (i * 37 % 92), cy + 22 + (i * 13 % 24), 2.4, 0, 7); g.fill(); } }
      if (bunOn) { burgerBun(g, ox, cy, .86); for (const o of sides) if (folds[o]) paperFlap(g, ox, cy, 84, vectors[o], folds[o]); }   // in the bun, then the paper
      if (stage === 'wrap' && !leave) {              // arrow on the side of the paper to fold next
        const want = foldOrder.find(o => !folds[o]), [vx, vy] = vectors[want], bob = Math.sin(pulse * 9) * 5, ax = ox + vx * (104 - bob), ay = cy + vy * (98 - bob);
        g.save(); g.translate(ax, ay); g.rotate(Math.atan2(-vy, -vx));
        g.fillStyle = '#fbf3e2'; g.strokeStyle = '#2c533d'; g.lineWidth = 4; g.beginPath();
        g.moveTo(15, 0); g.lineTo(-8, -14); g.lineTo(-8, -6); g.lineTo(-19, -6); g.lineTo(-19, 6); g.lineTo(-8, 6); g.lineTo(-8, 14); g.closePath(); g.stroke(); g.fill(); g.restore();
      }
      if (!leave) label(g, hint(), cx, 250, 14);
      // the tray
      const wanted = { patty: stage === 'patty', egg: stage === 'egg', cheese: stage === 'cheese', bun: stage === 'bun', chili: stage === 'sauce' && order.sauces.includes('chili') && !sauced.includes('chili'), mayo: stage === 'sauce' && order.sauces.includes('mayo') && !sauced.includes('mayo'), pepper: stage === 'sauce' && order.sauces.includes('pepper') && !sauced.includes('pepper') };
      const swatch = { patty: '#7a4a2a', egg: '#f6dc8a', cheese: '#f2b632', bun: '#c98a3e', chili: '#c8321f', mayo: '#fff7df', pepper: '#2b2622' };
      for (const o of tray) {
        const down = press?.id === o.id ? 2 : 0;
        g.fillStyle = '#00000022'; g.beginPath(); g.roundRect(o.x, o.y + 3, o.w, o.h, 11); g.fill();
        g.fillStyle = wanted[o.id] ? '#fffdf4' : '#f1ead8'; g.beginPath(); g.roundRect(o.x, o.y + down, o.w, o.h, 11); g.fill();
        if (wanted[o.id]) { g.strokeStyle = '#2c533d'; g.lineWidth = 2.5; g.stroke(); }
        g.fillStyle = swatch[o.id]; g.strokeStyle = '#00000030'; g.lineWidth = 1; g.beginPath(); g.arc(o.x + 17, o.y + o.h / 2 + down, 8, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#213f31'; g.font = '700 ' + (o.name.length > 8 ? 11 : 13.5) + 'px "DM Sans",Arial,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(o.name, o.x + 30, o.y + o.h / 2 + 1 + down);
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
  { id: 'special', name: 'Burger Special', stall: 'Burger stall', tone: '#7a4a2a', make: special,
    how: 'Make each order the pasar malam way: patty on, flip it on the green ring, crack the egg, cheese if they asked, the sauces on the ticket, the bun, then wrap it in paper: hus, hus, hus. Mistakes cost a second.' },
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
  const game = games.find(o => o.id === ({ flip: 'special', huss: 'hus' }[id] || id));   // earlier names still open the same games
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
