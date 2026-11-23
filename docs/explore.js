import { games, openGames } from './games.js?v=202611212331';
import { sound } from './sound.js?v=202611212331';
const places = [
  { id: 'market', name: 'Pasar Malam', type: 'Night market', tone: '#bb6845', point: [6.58, .14, 3.14], distance: 4.5, angle: .35, tilt: .91 },
  { id: 'gate', name: 'Town entrance', type: 'Welcome arch', tone: '#658052', point: [0, .15, 5.75], distance: 1.95, angle: .20, tilt: 1.22 },
  { id: 'terraces', name: 'Terrace Lane', type: 'Terrace houses', tone: '#aa744b', point: [-4.84, .22, 1.4], distance: 3.8, angle: -.48, tilt: 1.08 },
  { id: 'shops', name: 'The shophouses', type: 'Shops & clinic', tone: '#b25b50', point: [4.25, .22, 4.35], distance: 3.4, angle: .15, tilt: 1.17 },
  { id: 'apartments', name: 'The apartments', type: 'Apartment blocks', tone: '#77869c', point: [3.0, .53, 1.43], distance: 5.6, angle: .57, tilt: 1.08 },
  { id: 'mansions', name: 'Mansion Row', type: 'Hillside homes', tone: '#5d897b', point: [-1.64, .25, -4.24], distance: 3.7, angle: .43, tilt: 1.10 }
];
// The same catalogue places the Episode 3 Blender stalls and their map destinations.
try {
  const response = await fetch('./assets/episode3-places.json?v=move-in-4');
  if (!response.ok) throw new Error('Market catalogue ' + response.status);
  for (const shop of await response.json()) {
    places.push({detail: true, type: 'Pasar Malam', tone: '#ad6652', distance: .74,
      tilt: 1.26, angle: (shop.reverse ? Math.PI : 0) + .11, ...shop});
  }
} catch (error) { console.error(error); }
const $ = id => document.getElementById(id);
const stage = document.querySelector('.map-area');
const mobile = matchMedia('(max-width:760px), (max-height:500px)');
const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
const view = $('viewport');
const kinds = {
  mansion: {label: 'Mansion', where: 'Mansion Row', tone: '#5d897b', near: 1.5, group: 'Mansion Row'},
  semi: {label: 'Semi-D', where: 'Semi-D Lane', tone: '#8a7a4f', near: .55, group: 'Semi-D Lane'},
  terrace: {label: 'Terrace house', where: 'Terrace Lane', tone: '#aa744b', near: .45, group: 'Terrace Lane'},
  apartment: {label: 'Apartment', where: 'The apartments', tone: '#77869c', near: .4, group: 'The apartments'},
  stall: {label: 'Fried rice stall', where: 'Pasar Malam', tone: '#bb6845', near: 0, group: 'Pasar Malam'},
  pip: {label: 'Chairman\u2019s house', where: 'Town entrance', tone: '#7a2e35', near: 0, group: 'Chairman'}
};
// Easter eggs from the earlier films. Finds are kept on this device (localStorage) with the day they were
// found, and listed in the Easter eggs album with a link to the reel each one comes from.
// `reel` is the reel's own link where the project has it; the rest open the profile until their links are added.
const PROFILE = 'https://www.instagram.com/retiredpip/';
const TAMAN_1 = 'https://www.instagram.com/reel/Df4OHTXhe72/';      // plain reel links only, no tracking parameters
const REEL = {1: 'https://www.instagram.com/reel/Dfm3nabT8e9/', 2: 'https://www.instagram.com/reel/DfoHvA8T-Gz/', 3: 'https://www.instagram.com/reel/DfqkWWFzACo/',
  costco: 'https://www.instagram.com/reel/DftJnkDzPE7/', disneyland: 'https://www.instagram.com/reel/Dfvx5SHzSM4/', moon: 'https://www.instagram.com/reel/DfypGdpzjBQ/', roadster: 'https://www.instagram.com/reel/Df0-WewzDH1/',
  taman2: 'https://www.instagram.com/reel/Df86bHYBMBs/', taman3: 'https://www.instagram.com/reel/Df_NYePMCaq/'};   // from the user
const eggs = {
  water: {from: 'Episode 1 \u00b7 Retired Pip', line: '\u201cIntroducing\u2026 WATER!\u201d', note: 'Now one hundred percent wetter.', hint: 'Walk down to the pond.', reel: REEL[1]},
  moon: {from: 'The Town That Never Looked at the Moon', line: '“And the moon looked back.”', note: 'Quick. Use a mirror.', hint: 'Look low in the northern sky.', reel: REEL.moon},
  roadster: {from: 'Pip’s Flying Roadster', line: '“Pip… can it go Genting?”', note: 'Toll not paid.', hint: 'Something red is parked near the entrance. Something red also flies.', reel: REEL.roadster},
  gate: {from: 'Taman Pip · Episode 1', line: 'Please don’t park at this gate.', note: 'Not even for “5 MINIT”.', hint: 'Walk up to the chairman’s gate.', reel: TAMAN_1},
  guard: {from: 'Taman Pip · Episode 1', line: '“Why their house bigger than mine?”', note: 'The mansions have their own guardhouse. It has one plastic chair.', hint: 'Walk up to where the mansions begin.', reel: TAMAN_1},
  pipchun: {from: 'Taman Pip · Episode 2', line: '“Eh, Ayam Gepuk Pipchun!”', note: 'The first stall in the pasar malam.', hint: 'Play a round of Gepuk! at the Ayam Gepuk Pipchun stall.', reel: REEL.taman2},
  huss: {from: 'Taman Pip · Episode 3', line: 'Hus hus hus.', note: 'A very suspicious sound from behind the counter.', hint: 'Wrap a burger at the burger stall.', reel: REEL.taman3},
  seat: {from: 'Episode 3 · The Queue That Never Ended', line: 'Reserved.', note: 'A tissue packet is holding this seat.', hint: 'Walk to where the bus stops.', reel: REEL[3]}
};
let eggsFound = {};   // id -> time found
try {
  const saved = JSON.parse(localStorage.getItem('taman-pip-eggs') || '{}');
  if (Array.isArray(saved)) for (const id of saved) eggsFound[id] = Date.now();      // the first version kept a plain list
  else for (const id in saved) eggsFound[id] = saved[id];
  for (const id in eggsFound) if (!eggs[id]) delete eggsFound[id];
} catch {}
let eggTimer = 0;
const eggTotal = Object.keys(eggs).length, eggTally = () => Object.keys(eggsFound).length;
const saveEggs = () => { try { localStorage.setItem('taman-pip-eggs', JSON.stringify(eggsFound)); } catch {} };
function eggCount() {
  const text = eggTally() + ' of ' + eggTotal + ' found';
  $('egg-count').textContent = text; $('album-count').textContent = text; $('album-open-count').textContent = eggTally() + ' of ' + eggTotal;
}
function album() {
  $('album-list').replaceChildren();
  for (const id in eggs) {
    const egg = eggs[id], when = eggsFound[id], row = document.createElement('li');
    row.className = when ? 'got' : 'missing';
    const from = document.createElement('small'), line = document.createElement('strong'), note = document.createElement('span');
    if (when) {
      from.textContent = egg.from; line.textContent = egg.line; note.textContent = egg.note;
      const foot = document.createElement('div'), day = document.createElement('time');
      day.textContent = 'Found ' + new Date(when).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
      foot.append(day);
      if (egg.reel || !egg.other) {
        const link = document.createElement('a'); link.href = egg.reel || PROFILE; link.target = '_blank'; link.rel = 'noopener';
        link.textContent = egg.reel ? 'Watch the reel' : 'Find it on @retiredpip';
        foot.append(link);
      }
      row.append(from, line, note, foot);
    } else { from.textContent = 'Not found yet'; line.textContent = '? ? ?'; note.textContent = egg.hint; row.append(from, line, note); }
    $('album-list').append(row);
  }
  $('album-reset').hidden = !eggTally();
  eggCount();
}
function found(id) {
  if (!eggs[id] || eggsFound[id]) return;                        // each egg is announced once; after that it lives in the album
  const egg = eggs[id], fresh = true;
  eggsFound[id] = Date.now(); saveEggs();
  $('egg-from').textContent = egg.from; $('egg-line').textContent = egg.line; $('egg-note').textContent = egg.note;
  $('egg-tally').textContent = (fresh ? 'Easter egg found · ' : 'Found before · ') + eggTally() + ' of ' + eggTotal + ' · tap to see them all';
  const all = eggTally() === eggTotal;
  if (all) $('egg-tally').textContent = 'All ' + eggTotal + ' easter eggs found! · tap to see them all';
  $('egg').hidden = false; eggCount(); sound.great();
  if (all) { confetti(); setTimeout(() => sound.fanfare(), 350); }
  clearTimeout(eggTimer); eggTimer = setTimeout(() => { $('egg').hidden = true; }, all ? 11000 : 7000);
}
// The whole album collected: paper confetti over the town for a few seconds.
function confetti() {
  if (reducedMotion.matches || document.querySelector('.confetti')) return;
  const sheet = document.createElement('canvas'), g = sheet.getContext('2d'), ratio = Math.min(devicePixelRatio || 1, 2);
  sheet.className = 'confetti'; document.body.append(sheet);
  const w = innerWidth, h = innerHeight; sheet.width = w * ratio; sheet.height = h * ratio; g.scale(ratio, ratio);
  const tones = ['#f4ce70', '#bb6845', '#2a523c', '#7a2e35', '#77869c', '#fbf3e2', '#5d897b'];
  const bits = Array.from({length: Math.min(220, Math.round(w / 4) + 90)}, (_, i) => ({
    x: Math.random() * w, y: -20 - Math.random() * h * .9, vx: (Math.random() - .5) * 90, vy: 130 + Math.random() * 190,
    size: 6 + Math.random() * 7, turn: Math.random() * 7, rate: (Math.random() - .5) * 9, sway: Math.random() * 7, tone: tones[i % tones.length], round: i % 5 === 0 }));
  const began = performance.now(); let last = began;
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000), age = (now - began) / 1000; last = now;
    g.clearRect(0, 0, w, h); g.globalAlpha = Math.max(0, Math.min(1, 7 - age));
    for (const o of bits) {
      o.x += (o.vx + Math.sin(age * 2 + o.sway) * 40) * dt; o.y += o.vy * dt; o.turn += o.rate * dt;
      if (o.y > h + 20 && age < 4.5) { o.y = -20; o.x = Math.random() * w; }
      g.save(); g.translate(o.x, o.y); g.rotate(o.turn); g.scale(1, Math.cos(o.turn * 1.7)); g.fillStyle = o.tone;
      if (o.round) { g.beginPath(); g.arc(0, 0, o.size * .45, 0, 7); g.fill(); } else g.fillRect(-o.size / 2, -o.size * .3, o.size, o.size * .6);
      g.restore();
    }
    if (age < 7) requestAnimationFrame(frame); else sheet.remove();
  };
  requestAnimationFrame(frame);
}
function openAlbum() { album(); if ($('guide').open) $('guide').close(); if (!$('album').open) $('album').showModal(); }
$('egg').onclick = () => { $('egg').hidden = true; openAlbum(); };
$('album-open').onclick = $('guide-album').onclick = openAlbum;
$('album-close').onclick = () => $('album').close();
$('album').onclick = event => { if (event.target === $('album')) $('album').close(); };
$('album-reset').onclick = () => { if (confirm('Forget every easter egg found on this device?')) { eggsFound = {}; saveEggs(); album(); } };
sound.onChange(muted => $('sound').setAttribute('aria-pressed', String(!muted)));
$('sound').onclick = () => { sound.setMuted(!sound.muted); if (!sound.muted) sound.unlock(); };
// Finishing a stall game can earn an egg; it is shown once the game is closed, so it is not hidden behind it.
let owed = [];
addEventListener('taman-game', event => {
  const {id, score} = event.detail, egg = id === 'gepuk' ? 'pipchun' : id === 'hus' && score > 0 ? 'huss' : null;
  if (egg && !eggsFound[egg] && !owed.includes(egg)) owed.push(egg);
});
$('arcade').addEventListener('close', () => { const egg = owed.shift(); if (egg) found(egg); owed = []; });
eggCount();
const params = new URLSearchParams(location.search);
let people = [];
let person = null;      // the house being visited
let me = null;          // the neighbour the visitor explores as
let street = false;
let tab = 'people';
let active = null;
let showPerson;
let walking = false;
let atMarket = false;   // the walker is standing among the stalls
let startWalk, refreshHome;
let todo = [];        // things to do around the taman, filled in once the town is built
let stopWalk;
let navigate;
let resetCamera;
let wake;
let fallback = false;

function drawer(open, restoreFocus = true) {
  document.body.classList.toggle('directory-open', open);
  $('scrim').hidden = !open;
  $('open-places').setAttribute('aria-expanded', String(open));
  $('directory').inert = mobile.matches && !open;
  stage.inert = open;
  document.querySelector('header').inert = open;
  if (open) $('close-places').focus();
  else if (mobile.matches && restoreFocus) $('open-places').focus();
}
$('open-places').onclick = () => drawer(true);
$('close-places').onclick = $('scrim').onclick = () => drawer(false);
mobile.addEventListener('change', () => drawer(false, false));
drawer(false, false);
setTimeout(() => { $('gesture-hint').hidden = true; }, 7000);   // the hint is only for the first look

$('help').onclick = () => $('guide').showModal();
$('close-help').onclick = () => $('guide').close();
$('guide').onclick = event => { if (event.target === $('guide')) $('guide').close(); };
document.addEventListener('keydown', event => {
  if (!document.body.classList.contains('directory-open')) return;
  if (event.key === 'Escape') drawer(false);
  if (event.key === 'Tab') {
    const links = [...$('directory').querySelectorAll('button:not([hidden]),input')].filter(e => e.offsetHeight);
    if (event.shiftKey && document.activeElement === links[0]) {event.preventDefault();links.at(-1).focus();}
    else if (!event.shiftKey && document.activeElement === links.at(-1)) {event.preventDefault();links[0].focus();}
  }
});
function showFallback() {
  stage.classList.add('flat');
  const file = active ? active.id : 'town-map';
  view.style.setProperty('--fallback', 'url("./assets/' + file + '.webp' + (file==='ramly'?'?v=move-in-4':'') + '")');
  $('map-status').textContent = '3D is unavailable here. Explore the town photos in Places.';
  $('map-status').hidden = false;
  $('pins').hidden = true;
  fallback = true;
}
function remember() {
  const query = active ? '?place=' + active.id : me ? '?as=' + me.u : person ? '?u=' + person.u : '';
  try { history.replaceState(null, '', location.pathname + query); } catch {}
  try { me ? localStorage.setItem('taman-pip-me', me.u) : localStorage.removeItem('taman-pip-me'); } catch {}
}
function marks() {
  for (const button of $('places').querySelectorAll('button')) {
    button.setAttribute('aria-current', String(button.dataset.id === (active?.id ?? (person && '@' + person.u))));
  }
}
// Each game belongs to one stall and can only be played there: with the stall open, or standing in front of it.
const stallGame = {ramly: 'hus', 'fried-rice': 'wok', 'gepuk-pipchun': 'gepuk', 'air-balang': 'balang'};
const gamePlace = id => places.find(p => stallGame[p.id] === id);
let nearStall = null;   // the game stall the walker is standing at
function gameHere() {
  const id = walking ? nearStall && stallGame[nearStall.id] : active ? stallGame[active.id] : person?.kind === 'stall' ? 'wok' : null;
  return games.find(o => o.id === id);
}
const hlrMenu=['Ramly burger','Drink','Roti John','Roti canai','Nasi lemak'];
const partyStarts=Date.parse('2026-11-23T15:40:00+08:00');
const partyOpen=()=>Date.now()>=partyStarts && Date.now()<partyStarts+48*60*60*1000;
function counterLabel(place) {
  if(place?.id==='gerai-hlr')return 'Food & SPX counter';
  if(place?.id==='fried-rice' && partyOpen())return 'Free welcome meal';
  return '';
}
function openCounter(place) {
  if(!counterLabel(place))return;
  const hlr=place.id==='gerai-hlr',camry=me?.u==='camry_6681';
  $('counter-title').textContent=hlr?place.name:'Fried rice welcome party';
  $('counter-info').textContent=hlr?'Order from @hlracing19 or collect your in-game SPX parcel.':
    '@i.am.blue.balls is treating new neighbours to fried rice until 3:40 pm on 25 November, Malaysian time.';
  const key='taman-pip-counter/'+place.id+'/'+(me?.u || 'visitor');
  let collected=false;
  try{collected=localStorage.getItem(key)==='yes';}catch{}
  $('counter-order').textContent='';
  const menu=hlr?[...hlrMenu,'Collect SPX parcel']:[camry?'Collect my two plates':'Collect a free plate'];
  $('counter-options').replaceChildren(...menu.map(label=>{
    const b=document.createElement('button'),pickup=!hlr || label==='Collect SPX parcel';
    b.textContent=label;
    const receipt=hlr?'SPX parcel collected':camry?'Two plates collected':'Welcome plate collected';
    if(pickup && collected){b.disabled=true;b.textContent=receipt;}
    b.onclick=()=>{
      if(!hlr && !partyOpen()){b.disabled=true;$('counter-order').textContent='The welcome party has ended.';return;}
      if(pickup){try{localStorage.setItem(key,'yes');}catch{} b.disabled=true;b.textContent=receipt;}
      $('counter-order').textContent=hlr?(pickup?'@hlracing19 handed you your parcel.':label+' served by @hlracing19.'):
        camry?'Two plates of fried rice for @camry_6681. Enjoy!':'Fresh from the wok. Welcome to Taman Pip!';
      sound.good();
    };
    return b;
  }));
  $('counter').showModal();
}
$('counter-close').onclick=()=>$('counter').close();
$('counter-open').onclick=()=>openCounter(active);
function playButton() {
  const label=walking?'':counterLabel(active);
  $('counter-open').hidden=!label;$('counter-open').textContent=label;
  stage.classList.toggle('at-counter',!!label);
  const game = gameHere();
  $('play').hidden = !game;
  $('todo').classList.toggle('away', !walking && !!game);
  if (game) $('play-name').textContent = 'Play ' + game.name;
}
$('play').onclick = () => { const game = gameHere(); if (game) openGames(game.id, me?.u); };
function card() {
  playButton();
  $('card').hidden = !person;
  document.body.classList.toggle('has-card', !!person);
  if (!person) return;
  const k = kinds[person.kind], mine = person === me;
  $('card-lot').textContent = person.kind === 'stall' ? 'Stall' : person.kind === 'pip' ? 'No. 1' : person.lot;
  $('card-lot').style.setProperty('--tone', k.tone);
  $('card-eyebrow').textContent = mine ? 'You live here' : person.kind === 'pip' ? 'The chairman' : 'Neighbour since Episode ' + person.since;
  $('card-name').textContent = '@' + person.u;
  $('card-where').textContent = person.floor ? 'Apartment \u00b7 Block A, floor ' + person.floor : k.label + ' \u00b7 ' + k.where;
  $('card-note').textContent=person.note || '';$('card-note').hidden=!person.note;
  const business = places.find(p => p.owner === person.u || p.namesake===person.u);
  const businessButton = $('card-business');
  businessButton.hidden = !business;
  if (business) {
    businessButton.textContent = 'Visit ' + business.name;
    businessButton.onclick = () => choose(business);
  }
  const features = {S14: 'Plunge pool', S04: 'Oversized windows', M04: 'Poolside confetti popper'};
  if (features[person.lot]) $('card-where').textContent += ' · ' + features[person.lot];
  const next = people.filter(o => o !== person && o.kind === person.kind && Math.hypot(o.p[0]-person.p[0], o.p[1]-person.p[1], o.p[2]-person.p[2]) < k.near)
    .sort((a, b) => a.lot.localeCompare(b.lot)).slice(0, 3);
  $('card-next').replaceChildren();
  $('card-next').hidden = !next.length;
  if (next.length) {
    $('card-next').append('Next door ');
    for (const o of next) {
      const b = document.createElement('button'); b.textContent = '@' + o.u; b.onclick = () => visit(o);
      $('card-next').append(b);
    }
  }
  $('card-as').querySelector('span').textContent = mine ? 'Walk from my gate' : 'Explore as @' + person.u;
  $('card-as').hidden = fallback;
  $('card-leave').hidden = !mine;
  $('card-street').querySelector('span').textContent = street ? 'Aerial view' : person.kind === 'apartment' ? 'Balcony view' : 'Street view';
  $('card-street').hidden = fallback;
  $('card-share').querySelector('span').textContent = 'Share';
}
function identity() {
  refreshHome?.();
  $('me').hidden = !me;
  document.body.classList.toggle('has-me', !!me);
  if (me) $('me-name').textContent = '@' + me.u;
}
function visit(who, keepDrawer = false) {
  stopWalk?.();
  person = who; active = null; street = false;
  $('gesture-hint').hidden = true;
  $('view-name').textContent = '@' + who.u + (who.lot && who.kind !== 'pip' ? ' \u00b7 ' + who.lot : '');
  marks(); card(); remember();
  if (mobile.matches && !keepDrawer) drawer(false, false);
  if (!fallback) showPerson?.();
}
$('card-close').onclick = () => { const low = street; person = null; street = false; card(); remember(); $('view-name').textContent = 'Town overview'; marks(); if (low) resetCamera?.(); else wake?.(); };
$('card-as').onclick = () => { me = person; identity(); directory(); startWalk?.(); };
$('card-leave').onclick = () => { me = null; identity(); directory(); card(); remember(); wake?.(); };
$('walk').onclick = () => walking ? stopWalk() : startWalk?.();
$('card-street').onclick = () => { street = !street; card(); showPerson?.(); if (street && person.kind === 'pip') found('gate'); };
$('card-share').onclick = async () => {
  const url = location.origin + location.pathname + '?u=' + person.u;
  const label = $('card-share').querySelector('span');
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({title: 'Taman Pip', text: '@' + person.u + ' lives here in Taman Pip', url});
    else { await navigator.clipboard.writeText(url); label.textContent = 'Link copied'; }
  } catch (error) { if (error.name !== 'AbortError') { prompt('Copy this link', url); } }
};
$('me').onclick = () => me && (walking ? startWalk() : visit(me));
function choose(place, initial = false) {
  stopWalk?.();
  active = place; person = null; street = false; card(); if (!initial) remember();
  $('gesture-hint').hidden = true;
  $('view-name').textContent = place ? place.name : 'Town overview';
  marks();
  for (const pin of $('pins').children) pin.classList.toggle('current', pin.dataset.id === place?.id);
  if (mobile.matches) drawer(false);
  if (fallback) showFallback();
  else if (place) navigate?.(place);
  else resetCamera?.();
}
function heading(text) {
  const h = document.createElement('h3'); h.className = 'group'; h.textContent = text; $('places').append(h);
}
function gameRow(game) {
  const b = document.createElement('button');
  b.className = 'place person';
  const lot = document.createElement('span'); lot.className = 'lot'; lot.style.setProperty('--tone', game.tone); lot.textContent = 'Go';
  const words = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = game.name;
  const type = document.createElement('small'); type.textContent = game.stall;
  words.append(title, type); b.append(lot, words);
  b.onclick = () => { if (mobile.matches) drawer(false, false); choose(gamePlace(game.id)); };   // to the stall; the game is played there
  $('places').append(b);
}
function doRow(item) {
  const b = document.createElement('button');
  b.className = 'place person';
  const lot = document.createElement('span'); lot.className = 'lot'; lot.style.setProperty('--tone', item.tone); lot.textContent = 'Go';
  const words = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = item.name;
  const type = document.createElement('small'); type.textContent = item.note;
  words.append(title, type); b.append(lot, words);
  b.onclick = () => { if (mobile.matches) drawer(false, false); item.go(); };
  $('places').append(b);
}
function placeRow(p) {
  const b = document.createElement('button');
  b.className = 'place'; b.dataset.id = p.id;
  const img = new Image(); img.src = './assets/' + p.id + '.webp' + (p.id==='ramly'?'?v=move-in-4':''); img.alt = ''; img.width = 63; img.height = 50; img.loading = 'lazy';
  const words = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = p.name;
  const type = document.createElement('small'); type.textContent = p.owner ? p.type + ' · @' + p.owner : p.type;
  words.append(title, type); b.append(img, words); b.onclick = () => choose(p);
  $('places').append(b);
}
function personRow(o) {
  const k = kinds[o.kind];
  const b = document.createElement('button');
  b.className = 'place person'; b.dataset.id = '@' + o.u;
  const lot = document.createElement('span'); lot.className = 'lot'; lot.style.setProperty('--tone', k.tone);
  lot.textContent = o.kind === 'stall' ? 'Stall' : o.kind === 'pip' ? 'No. 1' : o.lot;
  const words = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = '@' + o.u;
  const type = document.createElement('small'); type.textContent = (o === me ? 'You \u00b7 ' : '') + k.label + (o.floor ? ', floor ' + o.floor : '');
  words.append(title, type); b.append(lot, words); b.onclick = () => visit(o);
  $('places').append(b);
}
function directory() {
  const query = $('search').value.trim().toLowerCase().replace(/^@/, '');
  const foundPlaces = places.filter(p => [p.name, p.type, p.owner, p.keywords].join(' ').toLowerCase().includes(query));
  const foundPeople = people.filter(o => (o.u + ' ' + o.lot + ' ' + kinds[o.kind].label + ' ' + kinds[o.kind].where + ' ' + (o.note || '')).toLowerCase().includes(query));
  $('count-people').textContent = people.filter(o => o.kind !== 'pip').length || '';
  $('count-places').textContent = places.length;
  $('count-games').textContent = games.length + todo.length;
  $('tab-games').setAttribute('aria-selected', String(tab === 'games'));
  const foundGames = games.filter(o => (o.name + ' ' + o.stall + ' game games').toLowerCase().includes(query));
  const foundDo = todo.filter(o => (o.name + ' ' + o.note).toLowerCase().includes(query));
  $('tab-people').setAttribute('aria-selected', String(tab === 'people'));
  $('tab-places').setAttribute('aria-selected', String(tab === 'places'));
  document.querySelector('.tabs').hidden = !!query;
  $('places').replaceChildren(); $('places').scrollTop = 0;
  if (query) {
    if (foundPeople.length) { heading('Neighbours'); foundPeople.forEach(personRow); }
    if (foundPlaces.length) { heading('Places'); foundPlaces.forEach(placeRow); }
    if (foundGames.length) { heading('Games'); foundGames.forEach(gameRow); }
    if (foundDo.length) { heading('Things to do'); foundDo.forEach(doRow); }
    if (!foundPeople.length && !foundPlaces.length && !foundGames.length && !foundDo.length) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = 'Nobody and nowhere by that name yet. Usernames are spelled as on Instagram.';
      $('places').append(empty);
    }
  } else if (tab === 'places') {
    for (const [label, group] of [['Town landmarks', places.filter(p => !p.detail)], ['Pasar Malam', places.filter(p => p.detail && !p.type.startsWith('Shophouse'))], ['Shophouses', places.filter(p => p.type.startsWith('Shophouse'))]]) {
      if (group.length) { heading(label); group.forEach(placeRow); }
    }
  }
  else if (tab === 'games') { heading('Pasar malam games'); games.forEach(gameRow); if (todo.length) { heading('Around the taman'); todo.forEach(doRow); } }
  else if (!people.length) {
    const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Loading the neighbours\u2026'; $('places').append(empty);
  } else {
    let group = '';
    for (const o of people) {
      if (kinds[o.kind].group !== group) { group = kinds[o.kind].group; heading(group); }
      personRow(o);
    }
  }
  marks();
}
$('tab-people').onclick = () => { tab = 'people'; directory(); };
$('tab-places').onclick = () => { tab = 'places'; directory(); };
$('tab-games').onclick = () => { tab = 'games'; directory(); };
$('todo').onclick = () => { tab = 'games'; $('search').value = ''; directory(); drawer(true); };
$('search').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); $('places').querySelector('button')?.click(); } };
$('search').oninput = directory;
directory();

const order = ['pip', 'mansion', 'semi', 'terrace', 'apartment', 'stall'];
const linkedGame = {flip: 'hus', special: 'hus', huss: 'hus'}[params.get('game')] || params.get('game');   // a shared score opens the stall its game is played at
const linkedPlace = places.find(p => p.id === params.get('place')) || places.find(p => linkedGame && stallGame[p.id] === linkedGame);
if (linkedPlace) choose(linkedPlace, true);
const roster = fetch('./assets/residents.json?v=move-in-4').then(r => r.json()).then(data => {
  people = data.residents.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.lot.localeCompare(b.lot));
  const count = people.filter(o => o.kind !== 'pip').length;
  const flats = data.apartments - people.filter(o => o.kind === 'apartment').length;
  $('milestone-text').textContent = flats + ' apartments to go';
  const find = name => name && people.find(o => o.u.toLowerCase() === name.toLowerCase().replace(/^@/, ''));
  let saved = null; try { saved = localStorage.getItem('taman-pip-me'); } catch {}
  me = find(params.get('as')) || (!params.get('u') && find(saved)) || null;
  identity(); directory();
  const first = find(params.get('u')) || me;
  if (first && !linkedPlace) visit(first, true);
  return people;
}).catch(error => { console.error('Residents:', error); return []; });

async function start() {
  const T = await import('./assets/engine.js?v=porch-light');
  const renderer = new T.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile.matches ? 1.5 : 1.8));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  view.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, .025, 125);
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .16;
  controls.screenSpacePanning = false; controls.rotateSpeed = .65; controls.zoomSpeed = .82;
  controls.minDistance = .48; controls.maxDistance = 72;
  controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI * .48;
  controls.touches.ONE = T.TOUCH.ROTATE; controls.touches.TWO = T.TOUCH.DOLLY_PAN;
  const point = new T.Vector3(), shift = new T.Vector3(), pivot = new T.Vector3();
  const sky = new T.HemisphereLight(0xfff8dc, 0xb5d1b7, 1.68);
  const sun = new T.DirectionalLight(0xffefd8, 2.45);
  sun.position.set(-8,15,8); sun.castShadow = true;
  Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.1,far:44});
  sun.shadow.mapSize.set(mobile.matches ? 1024 : 2048, mobile.matches ? 1024 : 2048);
  sun.shadow.bias=-.00015; sun.shadow.normalBias=.008;
  scene.add(sky,sun);
  const soft = document.createElement('canvas'); soft.width=soft.height=128;
  const ctx = soft.getContext('2d'), grad = ctx.createRadialGradient(64,64,20,64,64,63);
  grad.addColorStop(0,'rgba(51,76,53,.43)'); grad.addColorStop(.62,'rgba(66,92,65,.30)'); grad.addColorStop(1,'rgba(66,92,65,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const shadow = new T.Mesh(new T.PlaneGeometry(33,33),new T.MeshBasicMaterial({map:new T.CanvasTexture(soft),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(.6,-.73,-.3);scene.add(shadow);
  const hitPlane = new T.PlaneGeometry(19,19);
  const ground = new T.Mesh(hitPlane,new T.MeshBasicMaterial());ground.rotation.x=-Math.PI/2;ground.updateMatrixWorld();
  const ray=new T.Raycaster();
  const pins = places.map(p => {
    const el = document.createElement('button'); el.className='pin'; el.dataset.id=p.id; el.style.setProperty('--tone',p.tone);
    el.textContent=p.name;el.setAttribute('aria-label','Visit '+p.name); el.onclick=()=>choose(p); el.hidden=true;
    $('pins').append(el);
    return {p,el,anchor:new T.Vector3(...p.point).add(new T.Vector3(0,p.detail ? .18 : p.id==='apartments' ? .7 : .49,0))};
  });
  // Two pins follow people: the house being visited and the visitor's own.
  const homePins = ['visiting','mine'].map(kind => {
    const el = document.createElement('button'); el.className='pin home '+kind; el.hidden=true;
    el.onclick=()=>{const who=kind==='mine'?me:person; if(who)visit(who);};
    $('pins').append(el);
    return {kind,el,anchor:new T.Vector3()};
  });
  const tags = [];
  // In the sky: the moon from episode 5 sits low in the north; the roadster from episode 6 flies over now and then.
  function picture(w,h,paint) {
    const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'));
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
  }
  // The moon is the film's own moon map and iris (assets/moon.webp, moon-iris.webp). As in episode 5 the
  // whole moon is the eyeball: a seam runs across it, the lids part, and a pale iris with a small pupil looks out.
  const moonArt=document.createElement('canvas');moonArt.width=moonArt.height=384;
  const moonPen=moonArt.getContext('2d'),moonSkin=new T.CanvasTexture(moonArt);moonSkin.colorSpace=T.SRGBColorSpace;
  const moonDisc=new Image(),moonIris=new Image();moonDisc.src='./assets/moon.webp';moonIris.src='./assets/moon-iris.webp';
  function paintMoon(open) {
    const g=moonPen,c=192,R=184;
    g.clearRect(0,0,384,384);g.drawImage(moonDisc,0,0,384,384);
    const gap=open*R*.985;                       // fully open, the lids are gone and the whole moon is the eye
    if(gap>1) {
      g.save();g.beginPath();g.ellipse(c,c,R,gap,0,0,Math.PI*2);g.clip();
      if(moonIris.complete)g.drawImage(moonIris,c-R*.44,c-R*.44,R*.88,R*.88);
      g.fillStyle='#06080c';g.beginPath();g.arc(c,c,R*.07,0,7);g.fill();    // a small pupil, as in the film
      g.restore();
      // the lids are the same moon, a shade darker, closing over it from above and below
      g.save();g.beginPath();g.arc(c,c,R,0,Math.PI*2);g.ellipse(c,c,R,gap,0,0,Math.PI*2);g.clip('evenodd');
      g.fillStyle='rgba(96,88,66,.2)';g.fillRect(0,0,384,384);g.restore();
      if(open<.98){g.strokeStyle='#8f8a78';g.lineWidth=2.5;g.beginPath();g.ellipse(c,c,R,gap,0,0,Math.PI*2);g.stroke();}
    } else { g.strokeStyle='#8f8a7899';g.lineWidth=2;g.beginPath();g.moveTo(c-R,c);g.lineTo(c+R,c);g.stroke(); }   // the closed seam
    moonSkin.needsUpdate=true;
  }
  const moon=new T.Mesh(new T.PlaneGeometry(2.4,2.4),new T.MeshBasicMaterial({map:moonSkin,transparent:true}));
  moon.position.set(-3,2.3,-15);moon.visible=false;scene.add(moon);
  moonDisc.onload=()=>{paintMoon(0);moon.visible=true;wake();};
  let moonLook=null;                               // {start}: lids open, hold, close
  const car=new T.Mesh(new T.PlaneGeometry(2.2,.88),new T.MeshBasicMaterial({transparent:true,map:picture(400,160,g=>{
    g.fillStyle='#ffffffb0';for(let i=0;i<7;i++){g.beginPath();g.arc(20+i*22,96-(i%2)*8,10+i*2.4,0,7);g.fill();}   // vapour
    g.fillStyle='#b3261e';g.beginPath();g.moveTo(170,104);g.quadraticCurveTo(176,78,214,74);g.lineTo(250,52);g.lineTo(304,52);g.quadraticCurveTo(330,72,372,82);g.quadraticCurveTo(392,88,388,108);g.lineTo(170,108);g.closePath();g.fill();
    g.fillStyle='#22303a';g.beginPath();g.moveTo(256,58);g.lineTo(300,58);g.quadraticCurveTo(318,70,330,76);g.lineTo(236,76);g.closePath();g.fill();
    g.fillStyle='#f1e2c6';g.beginPath();g.ellipse(276,60,11,14,0,0,7);g.fill();                                        // an egg at the wheel
    g.fillStyle='#1c1c1e';for(const x of [214,340]){g.beginPath();g.ellipse(x,112,24,9,0,0,7);g.fill();}           // wheels folded flat
    g.fillStyle='#ffd97a';g.beginPath();g.ellipse(384,94,5,7,0,0,7);g.fill();
  })}));
  car.visible=false;scene.add(car);
  let trip=null;
  const from=new T.Vector3(),to=new T.Vector3();
  function fly_over() {
    if(document.hidden || trip)return;
    const side=Math.random()<.5?1:-1;
    from.set(-13*side,3.4,rand(-2,5));to.set(13*side,4.6,rand(-7,0));
    trip={start:performance.now(),length:9000};car.visible=true;wake();
  }
  const rand=(a,b)=>a+Math.random()*(b-a);
  setTimeout(fly_over,14000);setInterval(fly_over,55000);
  function skyTap(px,py,rect) {
    for(const [mesh,id,wide,press] of [[moon,'moon',2.4],[car,'roadster',2.2],...tappable]) {
      if(!mesh.visible)continue;
      point.copy(mesh.position).project(camera);
      if(point.z>1||point.z<-1)continue;
      const reach=wide*rect.height/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.distanceTo(mesh.position))/2;
      if(Math.hypot((point.x+1)*rect.width/2-px,(1-point.y)*rect.height/2-py)>Math.max(26,reach))continue;
      press?.();
      if(id==='moon'){moonLook={start:performance.now()};wake();}
      found(id);return true;
    }
    return false;
  }
  let props=null, busy=false, tappable=[], heard=0, lazy=false, drawn=0, stirred=0, folkBusy=false;
  let framed='', grid=null, hero=null, atlas=null, moving=false, asset=null;
  let frame=0, flight=null, loaded=false, atHome=true, dragStart=null;
  const homeTarget = new T.Vector3(0,.13,-.15);
  function homeDistance() {return Math.max(19.7, Math.min(60, (camera.aspect<.85?23.6:26.1)/camera.aspect));}
  function homeTilt() {return camera.aspect<.85?.60:.78;}
  function positionFor(target,distance,theta,phi) {
    return new T.Vector3().setFromSpherical(new T.Spherical(distance,phi,theta)).add(target);
  }
  function locate(immediate=false) {
    flight=null; controls.target.copy(homeTarget);
    camera.position.copy(positionFor(homeTarget,homeDistance(),.43,homeTilt()));
    camera.lookAt(homeTarget);controls.update();atHome=true;if(!immediate)wake();
  }
  function fly(target,distance,angle,tilt,fov=flight?.fov??camera.fov) {
    const a=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const turn=Math.atan2(Math.sin(angle-a.theta), Math.cos(angle-a.theta));
    flight={start:performance.now(),from:controls.target.clone(),to:target.clone(),a,
            dist:distance,turn,tilt,fov,fov0:camera.fov,duration:reducedMotion.matches?0:650};
    wake();
  }
  function render(now) {
    frame=0;
    // With only the townsfolk moving, half the frame rate is plenty and kinder to a phone's battery.
    if(lazy && now-drawn<30 && now-stirred>300){frame=requestAnimationFrame(render);return;}
    drawn=now;
    if(flight) {
      const f=flight,t=f.duration?Math.min(1,(now-f.start)/f.duration):1,k=t*t*(3-2*t);
      controls.target.lerpVectors(f.from,f.to,k);
      const distance=Math.exp(Math.log(f.a.radius)*(1-k)+Math.log(f.dist)*k);
      camera.position.copy(positionFor(controls.target,distance,f.a.theta+k*f.turn,f.a.phi+(f.tilt-f.a.phi)*k));
      if(f.fov!==f.fov0){camera.fov=f.fov0+(f.fov-f.fov0)*k;camera.updateProjectionMatrix();}
      if(t===1) flight=null;
    }
    if(walking)stride(now);
    props?.(now);
    const hear=T.MathUtils.clamp(1.25-Math.hypot(controls.target.x-5.45,controls.target.z-2.7)/3.2,0,1)*T.MathUtils.clamp(1.6-controls.getDistance()/9,0,1);
    if(Math.abs(hear-heard)>.04 || (hear===0)!==(heard===0)){heard=hear;sound.market(hear);}
    shift.copy(controls.target);controls.target.x=T.MathUtils.clamp(shift.x,-9.15,9.15);controls.target.z=T.MathUtils.clamp(shift.z,-9.15,9.15);
    controls.target.y=T.MathUtils.clamp(shift.y,0,1.7);
    camera.position.sub(shift.sub(controls.target));
    const w=view.clientWidth,h=view.clientHeight;
    // On phones the house card covers the lower part of the map, so lift the picture above it.
    // In landscape it covers the left side, so move the picture right instead.
    const lift=person && mobile.matches && w<h ? Math.round(h*.17) : 0;
    const aside=person && mobile.matches && w>=h ? -Math.round(w*.2) : 0, frameKey=w+'x'+h+':'+lift+':'+aside;
    if(frameKey!==framed) {
      framed=frameKey;
      if(lift||aside)camera.setViewOffset(w,h,aside,lift,w,h);else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
    controls.update();camera.updateMatrixWorld();
    $('needle').style.transform='rotate('+controls.getAzimuthalAngle()+'rad)';
    // Give the closest/selected destinations first choice of label space.
    const used=[]; const dist=controls.getDistance();
    const order=[...pins].sort((a,b)=>(+(b.p===active)- +(a.p===active)) || (mobile.matches && dist>9 ? 0 : a.anchor.distanceTo(camera.position)-b.anchor.distanceTo(camera.position)));
    if(walking && hero) {
      hero.tag.quaternion.copy(camera.quaternion);
      const s=T.MathUtils.clamp(camera.position.distanceTo(hero.root.position)*.13,.14,.34);
      hero.tag.scale.set(s,s,1);hero.tag.position.copy(hero.root.position);hero.tag.position.y+=.135+s*.15;
    }
    moon.quaternion.copy(camera.quaternion);
    if(moonLook) {
      const t=(now-moonLook.start)/1000,lids=t<.5?t/.5:t<4?1:Math.max(0,1-(t-4)/.45);
      paintMoon(lids*lids*(3-2*lids));
      if(t>4.45)moonLook=null;
    }
    if(trip) {
      const t=(now-trip.start)/trip.length;
      if(t>=1){trip=null;car.visible=false;}
      else {
        car.position.lerpVectors(from,to,t);car.position.y+=Math.sin(t*Math.PI*6)*.08;
        car.quaternion.copy(camera.quaternion);
        // The picture drives to the right: mirror it when the flight runs right to left on screen.
        const a=point.copy(from).project(camera).x,b=shift.copy(to).project(camera).x;
        car.scale.x=b>=a?1:-1;
      }
    }
    // Rooftop name tags face the camera and grow a little with distance so they stay findable.
    for (const tag of tags) {
      const s=T.MathUtils.clamp(camera.position.distanceTo(tag.at)*.052,.30,.50);
      tag.mesh.scale.set(s,s,1);tag.mesh.position.copy(tag.at);tag.mesh.position.y+=s*.15+.015;
      tag.mesh.quaternion.copy(camera.quaternion);
      if(tag.shop)tag.mesh.visible=tag.shop.type.startsWith('Shophouse') || camera.position.distanceTo(tag.at)>1.7;   // up close the plate on the counter says it
    }
    renderer.render(scene,camera);
    for (const pin of homePins) {
      const who=pin.kind==='mine'?me:person;
      const away=who?camera.position.distanceTo(point.set(...who.p)):0;
      // Up close the rooftop tag already names the house being visited.
      const show=who && loaded && tags.length && !walking && (pin.kind==='mine' || (person!==me && away>7));
      if(show) {
        const s=T.MathUtils.clamp(away*.052,.30,.50);
        point.y+=s*.3+.02;point.project(camera);
      }
      const x=(point.x+1)*w/2,y=(1-point.y)*h/2;
      const visible=show && point.z<1 && point.z>-1 && x>40 && x<w-40 && y>70 && y<h-20;
      pin.el.hidden=!visible;
      if(visible) {
        const text=pin.kind==='mine'?(away>7?'You \u00b7 @'+who.u:'You'):'@'+who.u;
        if(pin.el.textContent!==text)pin.el.textContent=text;
        pin.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,calc(-100% - 9px))';
        const width=text.length*6.8+31;used.push({l:x-width/2,r:x+width/2,t:y-45,b:y});
      }
    }
    for (const pin of order) {
      // A shop's pin stands on top of its owner's name tag when that is showing, never across it.
      const over=pin.tag||(pin.tag=tags.find(t=>t.shop===pin.p));
      if(over && over.mesh.visible)point.set(0,over.mesh.scale.x*.15,0).applyQuaternion(camera.quaternion).add(over.mesh.position).project(camera);
      else point.copy(pin.anchor).project(camera);
      const x=(point.x+1)*w/2,y=(1-point.y)*h/2+(over && over.mesh.visible?6:0);
      const width=pin.p.name.length*6.8+31;
      const sampled=pin.p===active || ((!pin.p.detail || dist<3) && ((dist>9 && !person) || pin.anchor.distanceTo(controls.target)<dist*.7));
      const r={l:x-width/2,r:x+width/2,t:y-45,b:y};
      const blocked=used.some(b=>r.l<b.r+4 && r.r>b.l-4 && r.t<b.b && r.b>b.t);
      const visible=loaded && sampled && !blocked && point.z<1 && point.z>-1 && r.l>2 && r.r<w-2 && y>84 && y<h-58;
      pin.el.hidden=!visible;
      if(visible) {
        pin.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,calc(-100% - 9px))';
        used.push(r);
      }
    }
    lazy=false;
    if(flight || trip || busy || moonLook || (walking && moving))wake();
    else if(folkBusy){lazy=true;wake();}
  }
  wake=()=>{if(!frame)frame=requestAnimationFrame(render);};
  controls.addEventListener('change',()=>{stirred=performance.now();wake();});
  controls.addEventListener('start',()=>{flight=null; $('gesture-hint').hidden=true;});
  renderer.domElement.addEventListener('pointerdown',e=>{dragStart=[e.clientX,e.clientY,performance.now(),e.isPrimary];});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragStart && Math.hypot(e.clientX-dragStart[0],e.clientY-dragStart[1])>3)atHome=false;});
  renderer.domElement.addEventListener('pointerup',e=>{
    const d=dragStart;dragStart=null;
    // A tap (not a drag) on or near a rooftop tag opens that house.
    if(!d || !d[3] || performance.now()-d[2]>450 || Math.hypot(e.clientX-d[0],e.clientY-d[1])>6)return;
    const rect=view.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
    if(skyTap(px,py,rect) || walking || !tags.length)return;
    let best=null,reach=1e9;
    for (const tag of tags) {
      if(!tag.mesh.visible)continue;
      point.copy(tag.mesh.position).project(camera);
      if(point.z>1||point.z<-1)continue;
      const half=tag.mesh.scale.x*rect.height/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.distanceTo(tag.mesh.position))/2;
      const dx=Math.abs((point.x+1)*rect.width/2-px),dy=Math.abs((1-point.y)*rect.height/2-py);
      const miss=Math.hypot(Math.max(0,dx-half),dy);
      if(miss<Math.max(16,half*.5) && miss+dx*.01<reach){reach=miss+dx*.01;best=tag;}
    }
    if(best){if(best.shop)choose(best.shop);else visit(best.who);}
  });renderer.domElement.addEventListener('pointercancel',()=>{dragStart=null;});
  renderer.domElement.addEventListener('wheel',()=>{atHome=false;},{passive:true});
  renderer.domElement.addEventListener('dblclick',e=>{
    const rect=view.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
    const hit=ray.intersectObject(ground)[0];if(!hit)return;
    atHome=false;fly(hit.point,Math.max(.9,controls.getDistance()*.5),controls.getAzimuthalAngle(),controls.getPolarAngle());
  });
  function zoom(factor) {
    atHome=false;fly(controls.target,T.MathUtils.clamp(controls.getDistance()*factor,controls.minDistance,controls.maxDistance),controls.getAzimuthalAngle(),controls.getPolarAngle());
  }
  $('zoom-in').onclick=()=>zoom(.67);$('zoom-out').onclick=()=>zoom(1.48);
  $('reset').onclick=()=>choose(null);
  $('compass').onclick=()=>{atHome=false;fly(controls.target,controls.getDistance(),0,controls.getPolarAngle());};
  for(const mode of ['pan','orbit']) $(mode).onclick=()=>{
    const pan=mode==='pan'; controls.mouseButtons.LEFT=pan?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.touches.ONE=pan?T.TOUCH.PAN:T.TOUCH.ROTATE;
    $('pan').setAttribute('aria-pressed',String(pan));$('orbit').setAttribute('aria-pressed',String(!pan));
  };
  view.addEventListener('keydown',e=>{
    const key=e.key;if(!['+','=','-','Home','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))return;
    if(walking && key.startsWith('Arrow'))return;
    e.preventDefault();
    if(key==='Home')return choose(null);
    if(['+','=','-'].includes(key))return zoom(key==='-'?1.35:.74);
    const angle=controls.getAzimuthalAngle(),delta=controls.getDistance()*.07;
    const along=key==='ArrowUp'?-1:key==='ArrowDown'?1:0, across=key==='ArrowLeft'?-1:key==='ArrowRight'?1:0;
    pivot.copy(controls.target);pivot.x+=(Math.sin(angle)*along+Math.cos(angle)*across)*delta;
    pivot.z+=(Math.cos(angle)*along-Math.sin(angle)*across)*delta;
    atHome=false;fly(pivot,controls.getDistance(),angle,controls.getPolarAngle());
  });
  showPerson=()=>{
    if(!person)return;
    const o=person,tall=Math.max(1,.78/camera.aspect);
    const far={mansion:3.3,semi:2.9,terrace:2.6,apartment:2.4,stall:2.3,pip:2.2}[o.kind];
    const near={mansion:1.5,semi:1.2,terrace:.80,apartment:.8,stall:.9,pip:.8}[o.kind];
    atHome=false;
    if(street) fly(new T.Vector3(o.p[0],Math.max(.12,o.p[1]-(o.kind==='mansion'?.42:.30)),o.p[2]),near*(camera.aspect<1?1.2:1),o.face,o.kind==='apartment'?1.36:1.45,camera.aspect<1?74:60);
    else fly(new T.Vector3(o.p[0],Math.max(.1,o.p[1]-.25),o.p[2]),far*tall,o.face+(o.kind==='apartment'?.35:.6),o.kind==='apartment'?1.18:.98,38);
  };
  navigate=p=>{
    atHome=false;
    // Widen the lens in portrait so the camera stays in the aisle across from the counter.
    const fov=p.fov || 38;
    const portraitFov=2*Math.atan(Math.tan(fov*Math.PI/360)*1.12/camera.aspect)*180/Math.PI;
    const reach=p.detail ? p.distance : p.distance*Math.max(1,.78/camera.aspect);
    fly(new T.Vector3(...p.point),reach,p.angle,p.tilt,p.detail ? Math.max(fov,portraitFov) : fov);
  };
  resetCamera=()=>{atHome=true;fly(homeTarget,homeDistance(),.43,homeTilt(),38);};
  function resize() {
    const w=view.clientWidth,h=view.clientHeight;
    if(!w||!h)return;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    if(atHome)locate(true);
    wake();
  }
  new ResizeObserver(resize).observe(view);resize();
  const loader=new T.GLTFLoader().setMeshoptDecoder(T.MeshoptDecoder);
  asset=await loader.loadAsync('./assets/town.glb?v=move-in-4',e=>{
    if(e.lengthComputable && e.total)$('map-status').textContent='Loading the town\u2026 '+Math.round(e.loaded/e.total*100)+'%';
  });
  await roster;
  asset.scene.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    // Lambert retains the Blender palette without metallic shader overhead.
    const m=o.material;
    o.material=new T.MeshLambertMaterial({color:m.color,vertexColors:m.vertexColors,map:m.map,side:m.side,alphaTest:m.alphaTest});
    m.dispose();
  });
  // The town arrives as one merged mesh, which draws every triangle whatever the camera sees. Cut it into
  // ground tiles that share the same vertex buffers, so the tiles behind a walker are skipped.
  {
    const big=[],v=new T.Vector3(),TILES=10,probe=new T.PlaneGeometry(1,1);probe.computeBoundingSphere();
    const Shape=Object.getPrototypeOf(T.PlaneGeometry),Sphere=probe.boundingSphere.constructor;
    asset.scene.updateMatrixWorld(true);
    asset.scene.traverse(o=>{if(o.isMesh && o.geometry.index && o.geometry.index.count>30000)big.push(o);});
    for(const o of big) {
      const g=o.geometry,p=g.attributes.position,ix=g.index.array,n=p.count,w=new Float32Array(n*3),bins=new Map();
      for(let i=0;i<n;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);w[i*3]=v.x;w[i*3+1]=v.y;w[i*3+2]=v.z;}
      for(let i=0;i<ix.length;i+=3) {
        const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3,cx=(w[a]+w[b]+w[c])/3,cy=(w[a+1]+w[b+1]+w[c+1])/3,cz=(w[a+2]+w[b+2]+w[c+2])/3;
        if(cx>2.07 && cx<2.23 && cy>.035 && cy<.163 && cz>2.325 && cz<2.375)continue;   // the swing seats: rebuilt below so they can swing
        const tx=Math.min(TILES-1,Math.max(0,Math.floor((cx+9.3)/18.6*TILES))),tz=Math.min(TILES-1,Math.max(0,Math.floor((cz+9.3)/18.6*TILES))),key=tz*TILES+tx;
        let bin=bins.get(key);if(!bin)bins.set(key,bin={list:[],lo:[1e9,1e9,1e9],hi:[-1e9,-1e9,-1e9]});
        bin.list.push(ix[i],ix[i+1],ix[i+2]);
        for(const q of [a,b,c])for(let k=0;k<3;k++){if(w[q+k]<bin.lo[k])bin.lo[k]=w[q+k];if(w[q+k]>bin.hi[k])bin.hi[k]=w[q+k];}
      }
      const inverse=o.matrixWorld.clone().invert(),grow=1/o.matrixWorld.getMaxScaleOnAxis();
      for(const bin of bins.values()) {
        const tile=new Shape();
        for(const name in g.attributes)tile.setAttribute(name,g.attributes[name]);
        tile.setIndex(bin.list);
        const centre=new T.Vector3((bin.lo[0]+bin.hi[0])/2,(bin.lo[1]+bin.hi[1])/2,(bin.lo[2]+bin.hi[2])/2);
        const radius=Math.hypot(bin.hi[0]-bin.lo[0],bin.hi[1]-bin.lo[1],bin.hi[2]-bin.lo[2])/2;
        tile.boundingSphere=new Sphere(centre.applyMatrix4(inverse),radius*grow*1.02);
        const part=new T.Mesh(tile,o.material);part.castShadow=part.receiveShadow=true;
        part.position.copy(o.position);part.quaternion.copy(o.quaternion);part.scale.copy(o.scale);o.parent.add(part);
      }
      o.parent.remove(o);
    }
  }
  scene.add(asset.scene);renderer.shadowMap.needsUpdate=true;loaded=true;
  $('map-status').hidden=true;document.body.dataset.scene='ready';
  if(active)navigate(active);
  renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());

  // ---- Walking: a small egg neighbour, a joystick, and a camera that follows.
  // The bundled engine exports only what the map needed, so the base classes come from the ones it has.
  const Geometry=Object.getPrototypeOf(T.PlaneGeometry), Group=Object.getPrototypeOf(T.Mesh), Attribute=hitPlane.attributes.position.constructor;
  const groundAt=(x,z)=>{                       // the mansion plateau and the ramp up to it (from the town kit)
    const y=-z;
    if(Math.abs(x)<=.321) return y<=2.9?0:y>=3.25?.08:.08*(y-2.9)/.35;
    return y>=2.949?.08:0;
  };
  const CELL=.04, HALF=9.32, SIDE=Math.ceil(HALF*2/CELL);
  const stallAt = (x,z) => {
    let best=null,reach=.46;
    for(const p of places){ if(!stallGame[p.id])continue; const d=Math.hypot(x-p.point[0],z-p.point[2]); if(d<reach){reach=d;best=p;} }
    return best;
  };
  const inMarket = (x,z) => Math.hypot(x-5.45,z-2.75)<1.25 || (x>6.28 && x<9 && z>3.03 && z<4.62);
  function buildGrid() {
    // Mark every map cell that has something solid between ankle and shoulder height.
    grid=new Uint8Array(SIDE*SIDE);
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    for(let z=5.21;z<=5.47;z+=CELL/2)for(let x=-.30;x<=-.19;x+=CELL/2)grid[Math.floor((z+HALF)/CELL)*SIDE+Math.floor((x+HALF)/CELL)]=1;   // Pip's roadster
    asset.scene.updateMatrixWorld(true);
    asset.scene.traverse(o=>{
      if(!o.isMesh)return;
      const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:p.count;
      for(let i=0;i<n;i+=3) {
        a.fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(o.matrixWorld);
        b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1).applyMatrix4(o.matrixWorld);
        c.fromBufferAttribute(p,ix?ix.getX(i+2):i+2).applyMatrix4(o.matrixWorld);
        const ra=a.y-groundAt(a.x,a.z),rb=b.y-groundAt(b.x,b.z),rc=c.y-groundAt(c.x,c.z);
        if(Math.max(ra,rb,rc)<.03 || Math.min(ra,rb,rc)>.10)continue;
        const x0=Math.max(0,Math.floor((Math.min(a.x,b.x,c.x)+HALF)/CELL)),x1=Math.min(SIDE-1,Math.floor((Math.max(a.x,b.x,c.x)+HALF)/CELL));
        const z0=Math.max(0,Math.floor((Math.min(a.z,b.z,c.z)+HALF)/CELL)),z1=Math.min(SIDE-1,Math.floor((Math.max(a.z,b.z,c.z)+HALF)/CELL));
        for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)grid[z*SIDE+x]=1;
      }
    });
  }
  const solid=(x,z)=>Math.abs(x)>9.1 || Math.abs(z)>9.1 || grid[Math.floor((z+HALF)/CELL)*SIDE+Math.floor((x+HALF)/CELL)]===1;
  const blocked=(x,z)=>solid(x,z)||solid(x+.028,z)||solid(x-.028,z)||solid(x,z+.028)||solid(x,z-.028);
  function lathe(profile,segments=18) {         // rings of [radius, height, colour] spun round the upright axis
    const pos=[],col=[],idx=[],tint=new T.Color();
    for(const [r,y,hex] of profile) {
      tint.set(hex);
      for(let k=0;k<=segments;k++){const t=k/segments*Math.PI*2+Math.PI;pos.push(Math.sin(t)*r,y,Math.cos(t)*r);col.push(tint.r,tint.g,tint.b);}
    }
    for(let i=0;i<profile.length-1;i++)for(let k=0;k<segments;k++){const q=i*(segments+1)+k,u=q+segments+1;idx.push(q,q+1,u,u,q+1,u+1);}
    const shape=new Geometry();
    shape.setAttribute('position',new Attribute(pos,3));shape.setAttribute('color',new Attribute(col,3));
    shape.setIndex(idx);shape.computeVertexNormals();return shape;
  }
  const ball=(r,hex,rings=7)=>lathe(Array.from({length:rings+1},(_,i)=>[Math.sin(i/rings*Math.PI)*r,r-Math.cos(i/rings*Math.PI)*r,hex]),12);
  const eggRadius=t=>.041*Math.sin(t)*(1+.2*Math.cos(t));      // wider below the middle
  const outfits=['#b0503f','#3f6f8f','#c58a2b','#5b7d4a','#7a4c7e','#2f7f78','#b5617f','#56609c'];
  function eggRings(suit,shell) {
    const rings=[];
    for(let i=0;i<=14;i++) {
      const t=i/14*Math.PI,y=.054*(1-Math.cos(t));
      if(rings.length && rings.at(-1)[1]<.047 && y>=.047){rings.push([eggRadius(Math.acos(1-.047/.054)),.047,suit],[eggRadius(Math.acos(1-.047/.054)),.047,shell]);}
      rings.push([eggRadius(t),y,y<.047?suit:shell]);
    }
    return rings;
  }
  function buildHero() {
    const paint=new T.MeshLambertMaterial({vertexColors:true});
    const root=new Group(),body=new Group();
    hero={root,body,x:0,z:0,y:0,heading:0,phase:0,suit:null,feet:[],tag:null};
    root.add(body);
    const eyeAt=.072,eyeR=eggRadius(Math.acos(1-2*eyeAt/.108))+.0005;
    for(const side of [-1,1]) {
      const eye=new T.Mesh(ball(.0058,'#2a2320'),paint);eye.scale.set(1,1.25,.6);
      eye.position.set(Math.sin(side*.36)*eyeR,eyeAt+.008-.0058,Math.cos(.36)*eyeR-.002);body.add(eye);
      const foot=new T.Mesh(ball(.013,'#5b3a26'),paint);foot.scale.set(1,.55,1.5);foot.position.set(side*.019,0,.006);
      root.add(foot);hero.feet.push(foot);
    }
    const blob=new T.Mesh(new T.PlaneGeometry(.17,.17),shadow.material);blob.rotation.x=-Math.PI/2;blob.position.y=.004;blob.renderOrder=1;root.add(blob);
    hero.tag=new T.Mesh(new T.PlaneGeometry(1,.3),atlas.material);
    scene.add(root,hero.tag);
  }
  function lookOf(who) {
    let h=7;for(const ch of who?who.u:'visitor')h=(h*31+ch.charCodeAt(0))>>>0;
    return {suit:who?.kind==='pip'?'#7a2e35':outfits[h%outfits.length],shell:who?.kind==='pip'?'#f3ead8':['#f1e2c6','#ecd3b0','#e2c39c','#f4e8d2'][h%4]};
  }
  function dress(who) {                          // shell on top, an outfit colour picked from the username below
    const {suit,shell}=lookOf(who),rings=eggRings(suit,shell);
    if(hero.suit){hero.body.remove(hero.suit);hero.suit.geometry.dispose();}
    hero.suit=new T.Mesh(lathe(rings,20),hero.body.children[0].material);hero.suit.position.y=.008;hero.body.add(hero.suit);
    atlas.cellUV(hero.tag.geometry,atlas.index(who));
  }
  const pipGate=people.find(o=>o.kind==='pip')?.g||[-.28,5.05];
  const spots=[{id:'gate',x:pipGate[0],z:pipGate[1],r:.2},{id:'guard',x:.62,z:-3.1,r:.5},{id:'seat',x:.45,z:3.5,r:.3},{id:'water',x:7.3,z:2.2,r:1.35}];

  // ---- Townsfolk: neighbours out and about, one for every four residents, so the taman fills as it grows.
  // They find their own way over a coarse copy of the walking grid, keeping to the roads and stall aisles
  // where they can, and go between homes, stalls, shops and the playground.
  const STEP=.08, WIDE=Math.ceil(HALF*2/STEP), folk=[], haunts={home:[],stall:[],hang:[],play:[]};
  const lanes=[[-.3,-2.95,.3,6.3],[-6.2,4.15,6.2,4.7],[-6.2,-2.9,6.2,-2.45],[-5.05,-2.45,-4.65,4.15],[-2.3,-2.45,-1.9,4.15],[.3,3.1,4.5,3.35],
    [-6.2,-3.65,6.2,-3.25],[-.3,-3.25,.3,-2.9],[6,3.6,9,4.15],[4.6,2.79,5.9,2.97],[5.8,3.4,6.2,4.2]];   // x0, z0, x1, z1
  let fare=null, reach=null, came=null, seen=null, pass=0;
  function buildFare() {                         // 0 = no way through, 1 = road, 5 = grass
    if(!grid)buildGrid();
    fare=new Uint8Array(WIDE*WIDE);reach=new Float32Array(WIDE*WIDE);came=new Int32Array(WIDE*WIDE);seen=new Uint32Array(WIDE*WIDE);
    for(let j=0;j<WIDE;j++)for(let i=0;i<WIDE;i++) {
      const x=(i+.5)*STEP-HALF,z=(j+.5)*STEP-HALF;
      if(x<-6.3 || x>9 || z<-5.9 || z>6.4)continue;
      if(blocked(x,z) || blocked(x+.04,z+.04) || blocked(x-.04,z+.04) || blocked(x+.04,z-.04) || blocked(x-.04,z-.04))continue;
      if(((x-7.3)/.98)**2+((z-2.2)/.68)**2<1)continue;                     // the pond
      fare[j*WIDE+i]=lanes.some(r=>x>=r[0] && x<=r[2] && z>=r[1] && z<=r[3])?1:5;
    }
  }
  const cellAt=(x,z)=>Math.floor((z+HALF)/STEP)*WIDE+Math.floor((x+HALF)/STEP);
  const spotOf=cell=>[(cell%WIDE+.5)*STEP-HALF,(Math.floor(cell/WIDE)+.5)*STEP-HALF];
  function nearestClear(x,z) {
    const c=cellAt(x,z),ci=c%WIDE,cj=Math.floor(c/WIDE);
    for(let r=0;r<14;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++) {
      if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
      const i=ci+di,j=cj+dj;
      if(i>=0 && j>=0 && i<WIDE && j<WIDE && fare[j*WIDE+i])return j*WIDE+i;
    }
    return -1;
  }
  function route(from,to,seed) {                 // A* between two cells; each neighbour prefers slightly different ground
    if(from<0 || to<0)return null;
    pass++;
    const heap=[],ti=to%WIDE,tj=Math.floor(to/WIDE);
    const push=(f,c)=>{let n=heap.length;heap.push([f,c]);while(n){const up=(n-1)>>1;if(heap[up][0]<=f)break;[heap[up],heap[n]]=[heap[n],heap[up]];n=up;}};
    const pop=()=>{
      const top=heap[0],last=heap.pop();
      if(heap.length){heap[0]=last;let n=0;for(;;){let m=n;const l=2*n+1,r=l+1;if(l<heap.length && heap[l][0]<heap[m][0])m=l;if(r<heap.length && heap[r][0]<heap[m][0])m=r;if(m===n)break;[heap[m],heap[n]]=[heap[n],heap[m]];n=m;}}
      return top;
    };
    seen[from]=pass;reach[from]=0;came[from]=-1;push(0,from);
    while(heap.length) {
      const [,c]=pop();
      if(c===to)break;
      const i=c%WIDE,j=Math.floor(c/WIDE);
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++) {
        if(!di && !dj)continue;
        const ni=i+di,nj=j+dj;if(ni<0 || nj<0 || ni>=WIDE || nj>=WIDE)continue;
        const n=nj*WIDE+ni;if(!fare[n])continue;
        if(di && dj && (!fare[j*WIDE+ni] || !fare[nj*WIDE+i]))continue;      // no squeezing past corners
        const patch=(((ni>>2)*73856093^(nj>>2)*19349663^seed*83492791)>>>0)%1000/1000;
        const g=reach[c]+fare[n]*(1+patch*.5)*(di && dj?1.414:1);
        if(seen[n]===pass && reach[n]<=g)continue;
        seen[n]=pass;reach[n]=g;came[n]=c;
        const ax=Math.abs(ni-ti),az=Math.abs(nj-tj);
        push(g+Math.max(ax,az)+.414*Math.min(ax,az),n);
      }
    }
    if(seen[to]!==pass)return null;
    const path=[];for(let c=to;c!==-1;c=came[c])path.push(spotOf(c));
    return path.reverse();
  }
  const folkPaint=new T.MeshLambertMaterial({vertexColors:true}), suits={};
  function makeFolk(i,kid,look) {
    const suit=look?look.suit:outfits[(i*5+3)%outfits.length],shell=look?look.shell:['#f1e2c6','#ecd3b0','#e2c39c','#f4e8d2'][(i*7+1)%4],key=suit+shell;
    const root=new Group(),body=new Group(),feet=[];root.add(body);
    const dressed=new T.Mesh(suits[key]||(suits[key]=lathe(eggRings(suit,shell),14)),folkPaint);dressed.position.y=.008;body.add(dressed);
    const eyeR=eggRadius(Math.acos(1-2*.072/.108))+.0005;
    for(const side of [-1,1]) {
      const eye=new T.Mesh(suits.eye||(suits.eye=ball(.0058,'#2a2320')),folkPaint);eye.scale.set(1,1.25,.6);
      eye.position.set(Math.sin(side*.36)*eyeR,.0742,Math.cos(.36)*eyeR-.002);body.add(eye);
      const foot=new T.Mesh(suits.foot||(suits.foot=ball(.013,'#5b3a26')),folkPaint);foot.scale.set(1,.55,1.5);foot.position.set(side*.019,0,.006);
      root.add(foot);feet.push(foot);
    }
    if(!look && i%4===1){const cap=new T.Mesh(suits['cap'+suit]||(suits['cap'+suit]=ball(.026,suit)),folkPaint);cap.scale.set(1,.5,1);cap.position.y=.104;body.add(cap);}
    const blob=new T.Mesh(new T.PlaneGeometry(.17,.17),shadow.material);blob.rotation.x=-Math.PI/2;blob.position.y=.004;blob.renderOrder=1;root.add(blob);
    scene.add(root);
    return {root,body,feet,kid,size:kid?.66:.9+(i*37%10)/50,speed:kid?.46:.27+(i*53%10)/70,seed:i+1,x:0,z:0,y:0,heading:0,phase:Math.random()*6,
      state:'stay',t:0,path:null,k:0,spot:null,show:1,fresh:false,hello:0,next:0};
  }
  function pickSpot(n) {
    const roll=Math.random(),kind=n.kid?(roll<.8?'play':'hang'):n.fresh?(roll<.6?'stall':'hang'):roll<.3?'home':roll<.72?'stall':'hang';
    const free=haunts[kind].filter(s=>!s.taken && s!==n.spot);
    return free.length?free[Math.floor(Math.random()*free.length)]:null;
  }
  function sendOff(n) {
    const goal=pickSpot(n),path=goal && route(nearestClear(n.x,n.z),goal.cell,n.seed);
    if(!path){n.state='stay';n.t=1+Math.random()*2;return;}
    if(n.spot)n.spot.taken=false;
    goal.taken=true;n.spot=goal;n.fresh=false;
    path.push([goal.x,goal.z]);n.path=path;n.k=Math.min(1,path.length-1);n.state='walk';
  }
  function buildTown() {
    if(folk.length || !people.length)return;
    buildFare();
    const add=(kind,x,z,face,stay)=>{
      const cell=nearestClear(x,z);if(cell<0)return;
      if(blocked(x,z) || !fare[cellAt(x,z)])[x,z]=spotOf(cell);
      haunts[kind].push({kind,x,z,face,stay,cell,taken:false});
    };
    for(const o of people)if(o.kind!=='stall')add('home',o.g[0],o.g[1],o.face,[1,1.6]);
    for(const p of places)if(p.detail)for(const side of [-.08,.08])add('stall',p.point[0]+side,p.point[2]+(p.reverse?-.25:.25),p.reverse?0:Math.PI,[5,12]);
    for(const x of [1.075,1.775,3.1,3.6,4.05,5.0,5.5])add('hang',x,4.13,Math.PI,[4,10]);                 // the shop fronts
    for(const [x,z,face] of [[.24,3.62,Math.PI/2],[3.85,3.05,Math.PI],[.18,6,Math.PI],[3,-2.38,0],[6.22,2.3,Math.PI/2],[.5,5.68,Math.PI/2],[-.2,-3.45,0],[2.2,3.02,Math.PI]])add('hang',x,z,face,[6,14]);
    for(let i=0;i<9;i++)add('play',1.1+(i%3)*.55+Math.random()*.2,2.0+Math.floor(i/3)*.34+Math.random()*.12,Math.random()*6,[2,5]);
    const count=clamp(Math.round(people.length/4),4,40);
    for(let i=0;i<count;i++) {
      const n=makeFolk(i,i%5===2);folk.push(n);
      // Begin part-way along a first errand, so nobody is caught standing in a row at the start.
      const first=pickSpot(n);if(!first)continue;
      n.x=first.x;n.z=first.z;sendOff(n);
      if(n.path){const at=Math.floor(Math.random()*(n.path.length-1));[n.x,n.z]=n.path[at];n.k=Math.min(at+1,n.path.length-1);}
      else{n.spot=first;first.taken=true;}
      n.heading=first.face;
      if(reducedMotion.matches && n.spot){n.x=n.spot.x;n.z=n.spot.z;n.heading=n.spot.face;n.state='stay';}
      n.y=groundAt(n.x,n.z);pose(n,0,0);
    }
    wake();
  }
  function pose(n,swing,now) {
    n.root.position.set(n.x,n.y,n.z);n.root.rotation.y=n.heading;n.root.scale.setScalar(n.size*n.show);
    const walk=n.state==='walk' && n.hello<=0;
    n.body.position.y=walk?Math.abs(Math.cos(n.phase))*.006:n.hello>.45?Math.sin((n.hello-.45)/.45*Math.PI)*.022:0;
    n.body.rotation.z=walk?swing*.09:Math.sin(now/800+n.seed)*.025;
    n.feet[0].position.z=.006+swing*.016;n.feet[1].position.z=.006-swing*.016;
    n.feet[0].position.y=Math.max(0,swing)*.008;n.feet[1].position.y=Math.max(0,-swing)*.008;
  }
  const turnTo=(n,want,dt,rate=8)=>{n.heading+=Math.atan2(Math.sin(want-n.heading),Math.cos(want-n.heading))*Math.min(1,dt*rate);};
  function townStep(dt,now) {
    if(!folk.length || reducedMotion.matches || document.querySelector('dialog[open]'))return false;
    const close=!walking && active?.detail ? active : null;       // a stall seen close up keeps its counter clear
    for(const n of folk) {
      const goal=n.state==='in'?0:1;
      if(n.show!==goal)n.show=clamp(n.show+(goal?dt:-dt)*5,0,1);
      n.root.visible=n.show>0 && !(close && Math.hypot(n.x-close.point[0],n.z-close.point[2])<.6);
      if(walking && hero && n.state!=='in' && now>n.next && Math.hypot(n.x-hero.x,n.z-hero.z)<.17){n.hello=.9;n.next=now+9000;}
      if(n.hello>0) {                            // a neighbour stops, turns and gives a little hop when you walk up
        n.hello-=dt;if(walking && hero)turnTo(n,Math.atan2(hero.x-n.x,hero.z-n.z),dt,12);
        pose(n,0,now);continue;
      }
      let swing=0;
      if(n.state==='walk') {
        const last=n.path.length-1;let [tx,tz]=n.path[n.k],far=Math.hypot(tx-n.x,tz-n.z);
        while(n.k<last && far<.09){n.k++;[tx,tz]=n.path[n.k];far=Math.hypot(tx-n.x,tz-n.z);}
        const step=Math.min(far,n.speed*dt);
        if(far>1e-4){n.x+=(tx-n.x)/far*step;n.z+=(tz-n.z)/far*step;turnTo(n,Math.atan2(tx-n.x,tz-n.z),dt,7);}
        n.y=groundAt(n.x,n.z);n.phase+=dt*(n.kid?19:13);swing=Math.sin(n.phase);
        if(n.k===last && far<.02){n.state='stay';n.t=n.spot.stay[0]+Math.random()*(n.spot.stay[1]-n.spot.stay[0]);}
      }
      else if(n.state==='stay') {
        if(n.spot)turnTo(n,n.spot.face+(n.spot.kind==='home' && !n.fresh?Math.PI:0),dt,6);
        n.t-=dt;
        if(n.t<=0) {
          if(n.spot?.kind==='home' && !n.fresh){n.state='in';n.t=3+Math.random()*7;}   // home: in through the gate
          else sendOff(n);
        }
      }
      else {                                     // indoors for a while, then out of somebody's gate
        n.t-=dt;
        if(n.t<=0 && n.show===0) {
          const door=haunts.home.filter(s=>!s.taken);
          if(door.length) {
            const out=door[Math.floor(Math.random()*door.length)];
            if(n.spot)n.spot.taken=false;
            out.taken=true;n.spot=out;n.x=out.x;n.z=out.z;n.y=groundAt(n.x,n.z);n.heading=out.face;n.fresh=true;n.state='stay';n.t=.9;
          }
          else n.t=2;
        }
      }
      pose(n,swing,now);
    }
    return true;
  }
  setTimeout(buildTown,600);
  for(const box of document.querySelectorAll('dialog'))box.addEventListener('close',()=>wake());
  if(params.has('debug'))window.__town={go:(x,z,f)=>startWalk({x,z,face:f}),move:(x,z)=>{moveHero(x,z);wake();},hero:()=>hero&&[hero.x,hero.y,hero.z,!!hero.wet,!!ride,hero.root.visible,hero.root.position.toArray(),controls.target.toArray(),camera.position.toArray(),!!flight],info:()=>({...renderer.info.render,geo:renderer.info.memory.geometries,tex:renderer.info.memory.textures,pr:renderer.getPixelRatio()}),folk:()=>folk.map(n=>[+n.x.toFixed(2),+n.z.toFixed(2),n.state,n.spot?.kind]),haunts,fare:()=>({fare,WIDE,STEP,HALF})};
  // ---- Things that move: the boom gates, the guard, and Pip's roadster.
  const tint=new T.Color(), flat=new T.MeshLambertMaterial({vertexColors:true,side:2});
  function prism(out,profile,x0,x1,hex) {        // a [forward, up] outline pushed across x0..x1
    tint.set(hex);
    const at=(x,i)=>[x,profile[i][1],profile[i][0]];
    const tri=(...corners)=>{for(const v of corners){out.pos.push(...v);out.col.push(tint.r,tint.g,tint.b);}};
    for(let i=1;i<profile.length-1;i++){tri(at(x1,0),at(x1,i),at(x1,i+1));tri(at(x0,0),at(x0,i+1),at(x0,i));}
    for(let i=0;i<profile.length;i++){const j=(i+1)%profile.length;tri(at(x0,i),at(x0,j),at(x1,j));tri(at(x0,i),at(x1,j),at(x1,i));}
  }
  const block=(out,x,y,z,w,h,d,hex)=>prism(out,[[z-d/2,y-h/2],[z+d/2,y-h/2],[z+d/2,y+h/2],[z-d/2,y+h/2]],x-w/2,x+w/2,hex);
  function solidMesh(out) {
    const shape=new Geometry();
    shape.setAttribute('position',new Attribute(out.pos,3));shape.setAttribute('color',new Attribute(out.col,3));
    shape.computeVertexNormals();return new T.Mesh(shape,flat);
  }
  const fresh=()=>({pos:[],col:[]});
  // Boom gates: the arms were left out of the town model so they can swing. The main gate has a guard;
  // the mansion gate keeps its empty plastic chair and opens on its own.
  const gates=[{at:[.56,.066,5.39],guard:[.70,5.56]},{at:[.56,.146,-2.96]}].map(spec=>{
    const out=fresh();
    for(let j=0;j<11;j++)block(out,-(.03+j*.05),0,0,.05,.012,.012,j%2?'#c8392e':'#f3efe6');
    const arm=solidMesh(out);arm.position.set(...spec.at);scene.add(arm);
    let guard=null;
    if(spec.guard) {
      guard=new Group();
      const rings=[];
      for(let i=0;i<=14;i++){const t=i/14*Math.PI,y=.054*(1-Math.cos(t));rings.push([eggRadius(t),y,y<.05?'#2f4e6e':'#f1e2c6']);}
      const body=new T.Mesh(lathe(rings,18),new T.MeshLambertMaterial({vertexColors:true}));body.position.y=.008;guard.add(body);
      const cap=new T.Mesh(ball(.026,'#22384f'),body.material);cap.scale.set(1,.5,1);cap.position.y=.104;guard.add(cap);
      const brim=new T.Mesh(ball(.016,'#22384f'),body.material);brim.scale.set(1.3,.22,1);brim.position.set(0,.106,.024);guard.add(brim);
      for(const side of [-1,1]) {
        const eye=new T.Mesh(ball(.0058,'#2a2320'),body.material);eye.scale.set(1,1.25,.6);
        const r=eggRadius(Math.acos(1-2*.072/.108));eye.position.set(Math.sin(side*.36)*r,.074,Math.cos(.36)*r-.002);guard.add(eye);
        const foot=new T.Mesh(ball(.013,'#3b2a20'),body.material);foot.scale.set(1,.55,1.5);foot.position.set(side*.019,0,.006);guard.add(foot);
      }
      guard.position.set(spec.guard[0],0,spec.guard[1]);guard.rotation.y=Math.PI;scene.add(guard);
    }
    return {arm,guard,open:0,x:spec.at[0]-.28,z:spec.at[2],hop:0};
  });
  // Pip's roadster from episode 6, parked at the kerb outside his gate. The same outline as the film car.
  const W_=.17, home=new T.Vector3(-.245,.002,5.34);
  const roadster=new Group(), shell=fresh();
  prism(shell,[[.040,.018],[.188,.018],[.200,.026],[.201,.040],[.190,.050],[.120,.060],[.040,.070]],-W_/2,W_/2,'#b3201f');
  prism(shell,[[-.198,.020],[-.085,.020],[-.085,.073],[-.120,.075],[-.180,.068],[-.199,.052]],-W_/2,W_/2,'#b3201f');
  for(const side of [-1,1])prism(shell,[[-.085,.020],[.040,.020],[.040,.070],[-.085,.073]],side*W_/2,side*(W_/2-.008),'#b3201f');
  block(shell,0,.023,-.022,W_-.004,.010,.13,'#1e1c1b');
  for(const side of [-1,1]){block(shell,side*.037,.035,-.035,.05,.010,.046,'#3a3430');block(shell,side*.037,.066,-.065,.05,.06,.010,'#3a3430');}
  prism(shell,[[.042,.070],[.018,.104],[.014,.104],[.038,.070]],-W_/2+.014,W_/2-.014,'#3d5560');
  for(const side of [-1,1])block(shell,side*.052,.045,.196,.034,.006,.010,'#f7f1e2');
  block(shell,0,.056,-.199,W_-.03,.005,.004,'#e0282a');
  roadster.add(solidMesh(shell));
  const round=(r,n=14)=>Array.from({length:n},(_,i)=>[Math.cos(i/n*Math.PI*2)*r,Math.sin(i/n*Math.PI*2)*r]);
  const wheels=[];
  for(const side of [-1,1])for(const z of [-.128,.128]) {
    const out=fresh();prism(out,round(.027),-.012,.012,'#1c1c1e');prism(out,round(.016,10),side*.011,side*.014,'#c9cccf');
    const wheel=solidMesh(out);wheel.position.set(side*(W_/2-.004),.027,z);wheel.userData.side=side;roadster.add(wheel);wheels.push(wheel);
  }
  roadster.scale.setScalar(.6);roadster.position.copy(home);roadster.rotation.y=Math.PI;scene.add(roadster);
  // Vapour: soft white puffs under the roadster as it lifts off and, mostly, as it sets down (as in the film).
  const mist=picture(64,64,g=>{const fog=g.createRadialGradient(32,32,2,32,32,31);fog.addColorStop(0,'rgba(255,255,255,.95)');fog.addColorStop(.6,'rgba(255,255,255,.5)');fog.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=fog;g.fillRect(0,0,64,64);});
  const puffs=Array.from({length:22},()=>{
    const mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:mist,transparent:true,depthWrite:false,opacity:0}));
    mesh.visible=false;mesh.renderOrder=2;scene.add(mesh);return {mesh,age:1,life:1,vx:0,vy:0,vz:0,size:.1};
  });
  function puff(x,y,z,spread,size,life) {
    const p=puffs.find(o=>!o.mesh.visible);if(!p)return;
    const a=Math.random()*Math.PI*2,out=spread*(.4+Math.random()*.6);
    p.mesh.position.set(x,y,z);p.vx=Math.cos(a)*out;p.vz=Math.sin(a)*out;p.vy=.05+Math.random()*.08;
    p.age=0;p.life=life*(.7+Math.random()*.6);p.size=size*(.7+Math.random()*.6);p.mesh.visible=true;
  }
  let hop=null, propClock=0, puffDue=0;
  tappable.push([roadster,'roadster',.3,()=>{if(!hop){hop={start:performance.now(),length:6200,last:home.clone()};sound.fly(6.2);for(let i=0;i<6;i++)puff(home.x,home.y+.02,home.z,.25,.16,.9);wake();}}]);
  props=now=>{
    const dt=Math.min(.05,(now-propClock)/1000||0);propClock=now;busy=false;
    for(const gate of gates) {
      const near=walking && hero && Math.hypot(hero.x-gate.x,hero.z-gate.z)<.8;
      const goal=near || folk.some(n=>n.root.visible && Math.hypot(n.x-gate.x,n.z-gate.z)<.5)?1:0;   // it lifts for the neighbours too
      if(near && !gate.met){gate.hop=.45;sound.good();}
      gate.met=near;
      if(gate.open!==goal){gate.open=clamp(gate.open+(goal?dt:-dt)*2.2,0,1);busy=true;}
      const ease=gate.open*gate.open*(3-2*gate.open);
      gate.arm.rotation.z=-ease*1.4;
      if(gate.guard) {
        if(gate.hop>0){gate.hop=Math.max(0,gate.hop-dt);busy=true;}
        gate.guard.position.y=Math.sin((1-gate.hop/.45)*Math.PI)*.03*(gate.hop>0?1:0);
        if(near)gate.guard.rotation.y=Math.atan2(hero.x-gate.guard.position.x,hero.z-gate.guard.position.z);
      }
    }
    for(const p of puffs) {
      if(!p.mesh.visible)continue;
      p.age+=dt/p.life;busy=true;
      if(p.age>=1){p.mesh.visible=false;continue;}
      p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.vx*=.96;p.vz*=.96;
      const s=p.size*(.5+p.age*1.6);p.mesh.scale.set(s,s,1);p.mesh.material.opacity=.75*(1-p.age)*(1-p.age);p.mesh.quaternion.copy(camera.quaternion);
    }
    if(hop) {                                    // up, once round above the house, and down on the same spot
      const t=(now-hop.start)/hop.length;busy=true;
      if(t>=1){
        hop=null;roadster.position.copy(home);roadster.rotation.set(0,Math.PI,0);for(const w of wheels)w.rotation.z=0;
        sound.land();for(let i=0;i<12;i++)puff(home.x,home.y+.02,home.z,.42,.2,1.3);   // touchdown: a ring of vapour
      }
      else {
        const k=t*t*(3-2*t),turn=k*Math.PI*2,wide=Math.sin(Math.PI*t)*.75,lift=Math.pow(Math.sin(Math.PI*t),.6)*1.05;
        point.set(home.x+Math.sin(turn)*wide,home.y+lift,home.z-(1-Math.cos(turn))*wide*.8);
        const dx=point.x-hop.last.x,dz=point.z-hop.last.z,level=clamp((Math.min(t,1-t)-.04)/.12,0,1);
        if(Math.hypot(dx,dz)>1e-4) {
          const want=Math.atan2(dx,dz),gap=Math.atan2(Math.sin(want-Math.PI),Math.cos(want-Math.PI));
          roadster.rotation.y=Math.PI+gap*level;roadster.rotation.z=-Math.sin(turn)*.35*level;
        }
        roadster.position.copy(point);hop.last.copy(point);
        if(t>.8 && now>puffDue){puffDue=now+70;puff(point.x,Math.max(home.y+.02,point.y-.04),point.z,.12,.13,.8);}   // jets on the way down
        for(const w of wheels)w.rotation.z=w.userData.side*level*Math.PI/2;   // wheels fold flat in the air
      }
    }
    folkBusy=townStep(dt,now);
    if(doStep(dt,now))busy=true;
  };

  // ---- Things to do: the mansion pools, the playground, doorbells and your own house. A gold star stands
  // over each one, and walking up to it brings up a button for what can be done there.
  let ride=null, actKey='', caller=null;
  const star=picture(64,64,g=>{
    g.translate(32,32);g.beginPath();
    for(let i=0;i<8;i++){const r=i%2?10:28,a=i*Math.PI/4;g.lineTo(Math.sin(a)*r,-Math.cos(a)*r);}
    g.closePath();g.fillStyle='#f6cf62';g.fill();g.lineWidth=4;g.strokeStyle='#8a6414';g.stroke();
    g.beginPath();g.arc(0,0,5,0,7);g.fillStyle='#fffbe6';g.fill();
  });
  const beacons=[];
  function beacon(x,y,z,press) {
    const mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:star,transparent:true,depthWrite:false}));
    mesh.position.set(x,y,z);mesh.renderOrder=3;scene.add(mesh);beacons.push({mesh,y,k:beacons.length});
    tappable.push([mesh,'do',.3,press]);
  }
  // World-space edges of the exported water and coping. M04 has an extended pool.
  const pools=people.filter(o=>o.kind==='mansion').map(o=>{
    const large=o.lot==='M04';
    return {o,gate:o.p[0],cx:large?-1.969:o.g[0]-Math.sign(o.p[0]-o.g[0])*.33,
      front:large?-3.974:-4.08,back:large?-5.206:-4.60,half:large?.164:.11,
      rim:large?.037:.04,endRim:large?.054:.05,deckY:large?.111:.097,waterY:large?.1145:.10};
  });
  const poolAt=(x,z)=>pools.find(q=>z<q.front && z>q.back && Math.abs(x-q.cx)<q.half);
  const deckAt=(x,z)=>pools.find(q=>z<q.front+q.endRim && z>q.back-q.endRim && Math.abs(x-q.cx)<q.half+q.rim);
  const walkHeight=(x,z)=>poolAt(x,z)?.waterY ?? deckAt(x,z)?.deckY ?? groundAt(x,z);
  const SWING=[2.15,2.35], SLIDE=[1.35,2.411], boarding={x:1.49,z:2.41,face:-Math.PI/2};
  for(const q of pools)beacon(q.cx,.30,(q.front+q.back)/2,()=>startWalk({x:q.gate,z:-3.62,face:Math.PI}));
  beacon(SWING[0],.27,SWING[1],()=>startWalk({x:SWING[0],z:2.52,face:Math.PI}));
  beacon(boarding.x,.30,boarding.z,()=>startWalk(boarding));
  for(const p of places)if(stallGame[p.id])beacon(p.point[0],(p.roof||.345)+.22,p.point[2],()=>choose(p));
  const swings=[2.105,2.195].map(x=>{
    const out=fresh();block(out,0,-.1205,0,.04,.005,.02,'#c8392e');
    for(const side of [-1,1])block(out,side*.012,-.06,0,.002,.12,.002,'#6b6f73');
    const seat=solidMesh(out);seat.position.set(x,.17,SWING[1]);scene.add(seat);return seat;
  });
  function moveHero(x,z,y=walkHeight(x,z)) {      // put the walker somewhere and bring the camera along
    const mx=x-hero.x,my=y-hero.y,mz=z-hero.z;
    hero.x=x;hero.y=y;hero.z=z;
    if(flight) {
      flight.from.x+=mx;flight.from.y+=my;flight.from.z+=mz;
      flight.to.x+=mx;flight.to.y+=my;flight.to.z+=mz;
    }
    controls.target.x+=mx;controls.target.y+=my;controls.target.z+=mz;camera.position.x+=mx;camera.position.y+=my;camera.position.z+=mz;
  }
  const waterRing=picture(64,64,g=>{
    g.strokeStyle='#c2f4f3';g.lineWidth=3;g.beginPath();g.arc(32,32,28,0,Math.PI*2);g.stroke();
  });
  const ripples=Array.from({length:3},()=>{
    const mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:waterRing,transparent:true,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return mesh;
  });
  let nextRipple=0;
  function ripple(x,z,big) {
    const q=poolAt(x,z);if(!q)return;
    const mesh=ripples[nextRipple++ % ripples.length];
    const radius=Math.min(big?.12:.055,q.half-Math.abs(x-q.cx),q.front-z,z-q.back);
    mesh.userData.radius=radius;mesh.userData.age=0;mesh.scale.setScalar(.01);
    mesh.material.opacity=.8;mesh.position.set(x,q.waterY+.002,z);mesh.visible=true;
  }
  function splash(x,z,big) {ripple(x,z,big);sound.splash(big);}
  function startSwing() {
    const seat=swings[0];let amp=.32,t=0;
    const off=()=>{ride=null;seat.rotation.x=0;hero.root.rotation.set(0,0,0);hero.heading=0;moveHero(seat.position.x,2.5);};
    moveHero(seat.position.x,SWING[1]);
    ride={acts:[['Push!',()=>{amp=Math.min(1.1,amp+.26);sound.good();},'push'],['Hop off',off,'off']],
      step(dt,push) {
        if(push>.3 && t>.5)return off();
        t+=dt;amp=Math.max(.1,amp-dt*.045);
        const lean=amp*Math.sin(t*4.4);
        seat.rotation.x=lean;
        hero.root.position.set(seat.position.x,.17-.123*Math.cos(lean),SWING[1]-.123*Math.sin(lean));hero.root.rotation.set(lean,0,0);
        hero.body.position.y=0;hero.body.rotation.set(0,0,0);
        for(const foot of hero.feet){foot.position.z=.006+.012;foot.position.y=0;}
      }};
  }
  function startSlide() {
    const from=[hero.x,hero.z];let t=0;
    ride={acts:[],step(dt) {
      t+=dt;let x=SLIDE[0],z,y,tilt=0;
      if(t<.55) {
        const k=t/.55;
        x=from[0]+(x-from[0])*k;z=from[1]+(SLIDE[1]-from[1])*k;y=.126*k;
      } else if(t<1.45) {
        if(t-dt<.55)sound.whoosh();
        const k=((t-.55)/.90)**1.5;
        z=SLIDE[1]+.208*k;y=.126-.120*k;tilt=-.28;
      } else {
        const k=Math.min(1,(t-1.45)/.30);
        z=2.619+.095*k;y=.006*(1-k);tilt=-.28*(1-k);
        if(k===1){ride=null;sound.thunk();}
      }
      moveHero(x,z);hero.heading=0;hero.root.position.set(x,y,z);hero.root.rotation.set(tilt,0,0);
      hero.body.position.y=0;hero.body.rotation.set(0,0,0);
      for(const foot of hero.feet){foot.position.z=tilt<0?.017:.006;foot.position.y=0;}
    }};
  }
  function dive(q) {
    const from=[hero.x,hero.z],to=[q.cx,clamp(hero.z,q.back+.12,q.front-.12)];
    const face=Math.atan2(to[0]-from[0],to[1]-from[1]);let t=0;
    sound.good();
    ride={acts:[],step(dt) {
      t+=dt;const k=Math.min(1,t/.72),x=from[0]+(to[0]-from[0])*k,z=from[1]+(to[1]-from[1])*k;
      const y=q.deckY+(q.waterY-.045-q.deckY)*k+Math.sin(k*Math.PI)*.14;
      moveHero(x,z);hero.heading=face;hero.root.position.set(x,y,z);hero.root.rotation.set(k*Math.PI*2,face,0);
      hero.body.position.y=0;hero.body.rotation.set(0,0,0);
      if(k===1){ride=null;hero.root.rotation.set(0,face,0);hero.wet=true;splash(x,z,true);}
    }};
  }
  function visitDeck(q) {
    hero.wet=false;hero.heading=Math.PI;moveHero(q.cx,q.front+q.endRim/2);
    fly(new T.Vector3(q.cx,q.waterY+.055,hero.z-.022),Math.max(1.05,.9/camera.aspect),0,.76,38);
  }
  // Your own house: a porch light and a few flowers by the gate, remembered on this phone.
  let nest={u:'',light:false,plants:0};
  try{nest={...nest,...JSON.parse(localStorage.getItem('taman-pip-home')||'{}')};}catch{}
  const garden=new Group(),fixture=new Group(),housing=fresh();
  block(housing,0,0,0,.032,.012,.025,'#50483d');fixture.add(solidMesh(housing));
  const bulbMaterial=new T.MeshLambertMaterial({color:0xf1dfbc,emissive:0xffd296});
  const bulb=new T.Mesh(ball(.009,'#ffffff'),bulbMaterial);
  bulb.position.y=-.017;fixture.add(bulb);
  const lamp=new T.PointLight(0xffd295,.009,.32,2);
  lamp.position.set(0,-.023,.011);fixture.add(lamp);fixture.visible=false;scene.add(garden,fixture);
  const frontOf=who=>{
    const back={mansion:.2,apartment:.3}[who.kind]||.09;
    return [who.g[0]-Math.sin(who.face)*back,who.g[1]-Math.cos(who.face)*back];
  };
  function homeLook() {
    fixture.visible=false;
    for(const flower of [...garden.children]){garden.remove(flower);flower.geometry.dispose();flower.children[0].geometry.dispose();}
    if(!me || me.kind==='stall')return;
    if(nest.u!==me.u)nest={u:me.u,light:false,plants:0};
    const [bx,bz]=frontOf(me),f=me.face,y=groundAt(me.g[0],me.g[1]);
    for(let i=0;i<nest.plants;i++) {
      const out=fresh(),side=i<3?-(.05+i*.03):.05+(i-3)*.03;block(out,0,.014,0,.004,.028,.004,'#4f7f43');
      const flower=solidMesh(out),head=new T.Mesh(ball(.009,['#e9617c','#f4ce70','#f3efe6','#c77ad1','#f08a4b','#7fb8e8'][i]),folkPaint);
      head.position.y=.022;flower.add(head);flower.position.set(bx+Math.cos(f)*side,y,bz-Math.sin(f)*side);garden.add(flower);
    }
    let depth=.35,side=-.15,height=y+.16;
    if(me.kind==='semi'){depth=.52;side=Number(me.lot.slice(1))%2?-.12:.12;height=y+.164;}
    else if(me.kind==='mansion'){depth=.77;side=me.p[0]-me.g[0];height=.275;}
    else if(me.kind==='pip'){depth=.275;side=-.105;height=y+.185;}
    else if(me.kind==='apartment'){depth=.498;side=-.14;height=me.p[1]-.07;}
    fixture.position.set(me.g[0]-Math.sin(f)*depth+Math.cos(f)*side,height,me.g[1]-Math.cos(f)*depth-Math.sin(f)*side);
    fixture.rotation.y=f;fixture.visible=true;lamp.visible=nest.light;bulbMaterial.emissiveIntensity=nest.light?1.3:0;
    try{localStorage.setItem('taman-pip-home',JSON.stringify(nest));}catch{}
    wake();
  }
  refreshHome=homeLook;homeLook();
  function ring(o) {                             // the neighbour comes to the gate, waves and goes back in
    sound.bell();
    if(caller)scene.remove(caller.n.root,caller.tag);
    const n=makeFolk(0,false,lookOf(o)),tag=new T.Mesh(new T.PlaneGeometry(1,.3),atlas.material);
    atlas.cellUV(tag.geometry,atlas.index(o));scene.add(tag);
    n.x=o.g[0]-Math.sin(o.face)*.07;n.z=o.g[1]-Math.cos(o.face)*.07;n.y=groundAt(n.x,n.z);n.heading=o.face;n.size=.95;n.show=0;
    caller={n,tag,t:0};wake();
  }
  function actions() {
    if(!walking || !hero)return [];
    if(ride)return ride.acts;
    const out=[],x=hero.x,z=hero.z;
    if(Math.hypot(x-SWING[0],z-2.48)<.2)out.push(['Swing',startSwing,'swing']);
    if(Math.hypot(x-boarding.x,z-boarding.z)<.18)out.push(['Slide',startSlide,'slide']);
    for(const q of pools) {
      if(Math.hypot(x-q.gate,z+3.62)<.2)out.push(['Visit the pool',()=>visitDeck(q),'in'+q.o.u]);
    }
    for(const id of ['gerai-hlr','fried-rice']) {
      const place=places.find(p=>p.id===id),label=counterLabel(place);
      if(label && Math.hypot(x-place.point[0],z-(place.point[2]+(place.reverse?-.25:.25)))<.27)
        out.push([label,()=>openCounter(place),id]);
    }
    const deck=deckAt(x,z);
    if(deck) {
      if(hero.wet)out.push(['Climb out',()=>visitDeck(deck),'climb']);
      else out.push(['Cannonball!',()=>dive(deck),'dive'],['Back to the street',()=>{
        hero.heading=0;moveHero(deck.gate,-3.62);
        fly(new T.Vector3(hero.x,hero.y+.09,hero.z),1.25,0,1,38);
      },'out'+deck.o.u]);
    }
    let near=null,reach=.17;
    for(const o of people){if(o.kind==='stall')continue;const d=Math.hypot(x-o.g[0],z-o.g[1]);if(d<reach || (o===me && near && Math.abs(d-reach)<.00001)){reach=d;near=o;}}
    if(near && near===me) {
      out.push([nest.light?'Porch light off':'Porch light on',()=>{nest.light=!nest.light;sound.good();homeLook();},'light'+nest.light]);
      out.push([nest.plants<6?'Water the plants':'Water the garden',()=>{
        if(nest.plants<6)nest.plants++;
        const [bx,bz]=frontOf(me);for(let i=0;i<6;i++)puff(bx,hero.y+.05,bz,.1,.06,.5);
        sound.sizzle();homeLook();
      },'water'+nest.plants]);
    }
    else if(near)out.push(['Ring @'+(near.u.length>15?near.u.slice(0,14)+'…':near.u),()=>ring(near),'ring'+near.u]);
    return out;
  }
  function showActs() {
    const list=actions(),key=list.map(a=>a[2]).join('|');
    if(key===actKey)return;
    actKey=key;
    $('act-list').replaceChildren(...list.map(([label,press])=>{
      const b=document.createElement('button');b.className='act';b.textContent=label;
      b.onclick=()=>{press();showActs();wake();};return b;
    }));
  }
  function doStep(dt,now) {
    const still=reducedMotion.matches;
    for(const b of beacons) {
      const far=camera.position.distanceTo(b.mesh.position),s=clamp(far*.034,.05,.34);
      b.mesh.scale.set(s,s,1);b.mesh.position.y=b.y+(still?0:Math.sin(now/420+b.k)*.012);b.mesh.quaternion.copy(camera.quaternion);
      if(!still)b.mesh.rotateZ(Math.sin(now/600+b.k)*.25);
    }
    let waterMoving=false;
    for(const mesh of ripples)if(mesh.visible) {
      const k=Math.min(1,(mesh.userData.age+=dt)/.55);
      mesh.scale.setScalar(mesh.userData.radius*2*(.15+.85*k));mesh.material.opacity=.8*(1-k);
      mesh.visible=k<1;waterMoving ||= mesh.visible;
    }
    if(!caller)return waterMoving;
    const c=caller,n=c.n;c.t+=dt;
    n.show=c.t<3.2?Math.min(1,c.t*5):Math.max(0,1-(c.t-3.2)*5);
    n.hello=c.t>.4 && c.t<1.3?1.3-c.t:c.t>1.3 && c.t<2.2?2.2-c.t:0;
    if(hero)turnTo(n,Math.atan2(hero.x-n.x,hero.z-n.z),dt,10);
    pose(n,0,now);
    c.tag.visible=n.show>.5;c.tag.scale.set(.2,.2,1);c.tag.position.set(n.x,n.y+.165,n.z);c.tag.quaternion.copy(camera.quaternion);
    if(c.t>3.45){scene.remove(n.root,c.tag);caller=null;}
    return true;
  }
  todo=[
    {name:'Swim in a mansion pool',note:'Mansion Row · cannonballs allowed',tone:'#3f8fa6',go:()=>{const q=pools.find(o=>o.o===me)||pools[Math.floor(Math.random()*pools.length)];if(q)startWalk({x:q.gate,z:-3.62,face:Math.PI});}},
    {name:'Playground swing',note:'Hop on and push',tone:'#3f6e9a',go:()=>startWalk({x:SWING[0],z:2.52,face:Math.PI})},
    {name:'Playground slide',note:'Up the tower and down',tone:'#c58a2b',go:()=>startWalk(boarding)},
    {name:'Ring a doorbell',note:'A neighbour comes out to wave',tone:'#7a4c7e',go:()=>{const list=people.filter(o=>o!==me && o.kind!=='stall'),o=list[Math.floor(Math.random()*list.length)];if(o)startWalk({x:o.g[0],z:o.g[1],face:o.face+Math.PI});}},
    {name:'Your own house',note:'Porch light and plants · pick Explore as on your house first',tone:'#5b7d4a',go:()=>{if(me)startWalk();else{tab='people';directory();drawer(true);}}}
  ];
  directory();
  const clamp=T.MathUtils.clamp;
  const keys={};let stickX=0,stickY=0,clock=0,sprint=false,lean=0;
  function stride(now) {
    const dt=Math.min(.05,(now-clock)/1000||0);clock=now;
    let jx=stickX+(keys.right?1:0)-(keys.left?1:0),jy=stickY+(keys.up?1:0)-(keys.down?1:0);
    const push=Math.hypot(jx,jy);moving=push>.1;
    if(ride){moving=true;ride.step(dt,push,now);showActs();return;}
    if(moving) {
      if(push>1){jx/=push;jy/=push;}
      flight=null;
      const turn=controls.getAzimuthalAngle(),dx=-Math.sin(turn)*jy+Math.cos(turn)*jx,dz=-Math.cos(turn)*jy-Math.sin(turn)*jx;
      const run=(sprint||keys.run)?1:0;lean+=(run-lean)*Math.min(1,dt*8);
      const step=.62*(1+lean*.95)*(hero.wet?.5:1)*dt;let nx=hero.x+dx*step,nz=hero.z+dz*step;
      if(!deckAt(nx,nz) && blocked(nx,nz)){ if(deckAt(nx,hero.z) || !blocked(nx,hero.z))nz=hero.z; else if(deckAt(hero.x,nz) || !blocked(hero.x,nz))nx=hero.x; else{nx=hero.x;nz=hero.z;} }
      const want=Math.atan2(dx,dz),gap=Math.atan2(Math.sin(want-hero.heading),Math.cos(want-hero.heading));
      const before=Math.floor(hero.phase/Math.PI);
      hero.heading+=gap*Math.min(1,dt*12);hero.phase+=dt*15*(1+lean*.7)*Math.min(1,push);
      if(Math.floor(hero.phase/Math.PI)!==before && !hero.wet)sound.step();
      const ny=walkHeight(nx,nz),mx=nx-hero.x,my=ny-hero.y,mz=nz-hero.z;
      hero.x=nx;hero.y=ny;hero.z=nz;
      const wet=!!poolAt(nx,nz);
      if(wet!==!!hero.wet){hero.wet=wet;if(wet)splash(nx,nz,false);}
      if(wet && now>(hero.ripple||0)){hero.ripple=now+240;ripple(nx,nz,false);}
      for(const spot of spots) {
        const here=Math.hypot(nx-spot.x,nz-spot.z)<spot.r;
        if(here && !spot.in)found(spot.id);
        spot.in=here;
      }
      atMarket=inMarket(nx,nz);
      const stallNow=stallAt(nx,nz);
      if(stallNow!==nearStall){nearStall=stallNow;playButton();}
      controls.target.x+=mx;controls.target.y+=my;controls.target.z+=mz;
      camera.position.x+=mx;camera.position.y+=my;camera.position.z+=mz;
    }
    if(!moving)lean+=(0-lean)*Math.min(1,dt*8);
    const swing=moving?Math.sin(hero.phase):0;
    hero.root.position.set(hero.x,hero.y-(hero.wet?.045-Math.sin(now/260)*.004:0),hero.z);hero.root.rotation.y=hero.heading;
    hero.body.position.y=moving && !hero.wet?Math.abs(Math.cos(hero.phase))*(.006+lean*.006):0;hero.body.rotation.z=swing*.09;hero.body.rotation.x=lean*.26+(hero.wet && moving?.32:0);
    hero.feet[0].position.z=.006+swing*.016;hero.feet[1].position.z=.006-swing*.016;
    hero.feet[0].position.y=Math.max(0,swing)*.008;hero.feet[1].position.y=Math.max(0,-swing)*.008;
    showActs();
  }
  startWalk=at=>{
    if(!at || at.x===undefined)at=null;
    if(!atlas)return;                            // name tags (and so the roster) are not ready yet
    if(!grid)buildGrid();
    if(!hero)buildHero();
    dress(me);
    const shop=!at && active?.detail ? active : null;
    const approach=shop?.reverse ? -1 : 1;
    let [x,z]=at ? [at.x,at.z] : shop ? [shop.point[0],shop.point[2]+approach*.26] : me ? me.g : [0,6.2];
    if(blocked(x,z)) search: for(let r=1;r<40;r++)for(let i=0;i<16;i++) {  // nearest clear spot
      const t=i/16*Math.PI*2,tx=x+Math.cos(t)*r*CELL,tz=z+Math.sin(t)*r*CELL;
      if(!blocked(tx,tz)){x=tx;z=tz;break search;}
    }
    hero.x=x;hero.z=z;hero.y=walkHeight(x,z);hero.heading=at ? at.face : shop ? (shop.reverse ? 0 : Math.PI) : me ? me.face : Math.PI;hero.phase=0;
    ride=null;hero.wet=!!poolAt(x,z);hero.root.rotation.set(0,0,0);swings[0].rotation.x=0;homeLook();$('acts').prepend($('play'));
    hero.root.visible=hero.tag.visible=true;
    atMarket=inMarket(x,z);nearStall=stallAt(x,z);
    walking=true;person=null;active=null;street=false;stickX=stickY=0;for(const k in keys)keys[k]=false;
    card();marks();remember();
    for(const pin of $('pins').children)pin.classList.remove('current');
    $('gesture-hint').hidden=true;
    document.body.classList.add('walking');$('walk').setAttribute('aria-pressed','true');$('walk-label').textContent='Exit walk';
    $('view-name').textContent=me?'Walking as @'+me.u:'Walking as a visitor';
    if(mobile.matches)drawer(false,false);
    atHome=false;clock=performance.now();
    // Residents are met from the street with their house behind them; in the narrow lanes the camera
    // looks along the lane from above the roofs. Visitors are followed from behind, towards the arch.
    const lane=me && (me.kind==='terrace' || me.kind==='semi'),reach=Math.min(1.35,Math.max(1,.78/camera.aspect));
    // A frontage stall has the shophouses just behind the walker: look down over their roof, not from inside them.
    if(shop) fly(new T.Vector3(x,hero.y+.09,z),.78*reach,shop.angle,!shop.reverse && shop.point[2]<3.3 && shop.point[0]<5.95?.5:1.14,38);
    else if(at===boarding) fly(new T.Vector3(x,hero.y+.09,z),.92*reach,1.05,1.03,38);
    else if(at) fly(new T.Vector3(x,hero.y+.09,z),1.25*reach,0,1.0,38);
    else if(!me) fly(new T.Vector3(x,hero.y+.09,z),1.45*reach,0,1.22,38);
    else if(lane) fly(new T.Vector3(x,hero.y+.09,z),1.5*reach,hero.heading+Math.PI/2,.86,38);
    else fly(new T.Vector3(x,hero.y+.09,z),1.35*reach,hero.heading+.35,1.16,38);
  };
  stopWalk=()=>{
    if(!walking)return;
    walking=false;moving=false;hero.root.visible=hero.tag.visible=false;ride=null;swings[0].rotation.x=0;showActs();$('stick').before($('play'));playButton();runLock=false;runDown=0;runState();
    document.body.classList.remove('walking');$('walk').setAttribute('aria-pressed','false');$('walk-label').textContent='Walk';
    $('view-name').textContent='Town overview';wake();
  };
  const pad=$('stick'),knob=$('stick-knob');
  const steer=e=>{
    const r=pad.getBoundingClientRect(),reach=r.width/2-18;
    let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const far=Math.hypot(x,y);
    if(far>reach){x*=reach/far;y*=reach/far;}
    stickX=x/reach;stickY=-y/reach;knob.style.transform='translate('+x+'px,'+y+'px)';clock=clock||performance.now();wake();
  };
  const release=()=>{stickX=stickY=0;knob.style.transform='';wake();};
  pad.addEventListener('pointerdown',e=>{e.preventDefault();pad.setPointerCapture(e.pointerId);clock=performance.now();steer(e);});
  pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId))steer(e);});
  pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);pad.addEventListener('lostpointercapture',release);
  // Run: hold the button (or Shift) to run; a quick tap locks it on, another tap lets go.
  const runner=$('run');let runDown=0,runLock=false;
  const runState=()=>{sprint=runLock||runDown>0;runner.setAttribute('aria-pressed',String(sprint));};
  runner.addEventListener('pointerdown',e=>{e.preventDefault();runner.setPointerCapture(e.pointerId);runDown=performance.now();runState();});
  const runUp=()=>{if(!runDown)return;if(performance.now()-runDown<260)runLock=!runLock;runDown=0;runState();};
  runner.addEventListener('pointerup',runUp);runner.addEventListener('pointercancel',runUp);
  runner.addEventListener('contextmenu',e=>e.preventDefault());
  const walkKeys={Shift:'run',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  addEventListener('keydown',e=>{
    if(!walking || !walkKeys[e.key] || e.target.matches?.('input,textarea') || e.metaKey || e.ctrlKey)return;
    e.preventDefault();if(!moving)clock=performance.now();keys[walkKeys[e.key]]=true;wake();
  });
  addEventListener('keyup',e=>{if(walkKeys[e.key])keys[walkKeys[e.key]]=false;});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false;release();});
  $('walk').hidden=false;
  roster.then(async list=>{
    if(!list.length)return;
    try{await document.fonts.load('650 40px "DM Sans"');}catch{}
    // One texture holds every name tag: a cream pill like the roof signs in the films.
    const cols=6,cw=320,ch=96,cells=[...list,{u:'',kind:'pip'}],rows=Math.ceil(cells.length/cols);
    const sheet=document.createElement('canvas');sheet.width=cols*cw;sheet.height=rows*ch;
    const g=sheet.getContext('2d');g.textAlign='center';g.textBaseline='middle';
    cells.forEach((o,i)=>{
      const x=i%cols*cw,y=Math.floor(i/cols)*ch;
      g.beginPath();g.roundRect(x+6,y+8,cw-12,ch-16,(ch-16)/2);
      g.fillStyle='#fbf3e2';g.fill();g.lineWidth=5;g.strokeStyle=kinds[o.kind].tone;g.stroke();
      let size=44;const text=o.u?'@'+o.u:'Visitor';
      do{g.font='650 '+size+'px "DM Sans",Arial,sans-serif';size-=2;}while(g.measureText(text).width>cw-52 && size>18);
      g.fillStyle='#213f31';g.fillText(text,x+cw/2,y+ch/2+2);
    });
    const texture=new T.CanvasTexture(sheet);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const material=new T.MeshBasicMaterial({map:texture,alphaTest:.5});
    const cellUV=(shape,i)=>{
      const uv=shape.attributes.uv,u=i%cols/cols,v=1-Math.floor(i/cols)/rows;
      uv.setXY(0,u,v);uv.setXY(1,u+1/cols,v);uv.setXY(2,u,v-1/rows);uv.setXY(3,u+1/cols,v-1/rows);uv.needsUpdate=true;
    };
    atlas={material,cellUV,index:o=>o?list.indexOf(o):list.length};
    // The owner's handle on the front of each market pitch, drawn here so it stays sharp (3D lettering this
    // small does not survive the model's compression). `sign` in the catalogue places one by hand.
    for(const shop of places){
      if(!shop.banner)continue;                      // the name on a tent's valance, white on its canvas
      const [text,tone,dy,dz,width,height]=shop.banner,plate=document.createElement('canvas');plate.width=1024;plate.height=Math.round(1024*height/width);
      const p=plate.getContext('2d'),h=plate.height;p.textAlign='center';p.textBaseline='middle';
      p.fillStyle=tone;p.fillRect(0,0,1024,h);p.fillStyle='#f4efe2';
      let size=h*.74;do{p.font='700 '+size+'px "DM Sans",Arial,sans-serif';size-=2;}while(p.measureText(text).width>940 && size>20);
      p.fillText(text,512,h*.54);
      const picture=new T.CanvasTexture(plate);picture.colorSpace=T.SRGBColorSpace;picture.anisotropy=8;
      const way=shop.reverse?-1:1,board=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:picture,color:0xc9c5bb}));
      board.position.set(shop.point[0],dy,shop.point[2]+dz*way);board.rotation.y=shop.reverse?Math.PI:0;scene.add(board);
    }
    for(const shop of places){
      if(!shop.board)continue;                       // a painted signboard, redrawn for the same reason
      const [small,big,foot,dy,dz,width,height]=shop.board,plate=document.createElement('canvas');plate.width=768;plate.height=Math.round(768*height/width);
      const p=plate.getContext('2d'),h=plate.height;p.textAlign='center';p.textBaseline='middle';
      p.fillStyle=shop.boardColor || '#8a2a26';p.fillRect(0,0,768,h);p.fillStyle='#f7e6bf';
      p.font='600 26px "DM Sans",Arial,sans-serif';p.letterSpacing='3px';p.fillText(small,384,h*.19);p.fillText(foot,384,h*.84);
      p.font='700 78px "DM Sans",Arial,sans-serif';p.letterSpacing='2px';p.fillText(big,384,h*.52);
      const picture=new T.CanvasTexture(plate);picture.colorSpace=T.SRGBColorSpace;picture.anisotropy=8;
      const board=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:picture,color:0xd8d2c6}));
      board.position.set(shop.point[0],dy,shop.point[2]+dz);scene.add(board);
    }
    for(const shop of places){
      if(!shop.owner || !(shop.pitch || shop.sign))continue;
      const plate=document.createElement('canvas');plate.width=640;plate.height=96;
      const p=plate.getContext('2d');p.textAlign='center';p.textBaseline='middle';
      p.beginPath();p.roundRect(3,3,634,90,14);p.fillStyle='#f7e6bf';p.fill();p.lineWidth=6;p.strokeStyle=shop.tone;p.stroke();
      let size=58;const text='@'+shop.owner;
      do{p.font='700 '+size+'px "DM Sans",Arial,sans-serif';size-=2;}while(p.measureText(text).width>590 && size>20);
      p.fillStyle='#213f31';p.fillText(text,320,51);
      const picture=new T.CanvasTexture(plate);picture.colorSpace=T.SRGBColorSpace;picture.anisotropy=8;
      const way=shop.reverse?-1:1,[x,,z]=shop.point,[dx,y,dz,width]=shop.sign||[0,.0695,.1128,.31];
      const board=new T.Mesh(new T.PlaneGeometry(width,width*.15),new T.MeshBasicMaterial({map:picture,color:0xe9e4d8}));
      board.position.set(x+dx*way,y,z+dz*way);board.rotation.y=shop.reverse?Math.PI:0;scene.add(board);
    }
    list.forEach((o,i)=>{
      const shape=new T.PlaneGeometry(1,.3);cellUV(shape,i);
      const mesh=new T.Mesh(shape,material);scene.add(mesh);
      tags.push({who:o,mesh,at:new T.Vector3(...o.p)});
    });
    // The entrance arch counts everyone who lives here, the chairman included, as in the films.
    for(const side of [1,-1]){
      const plate=document.createElement('canvas');plate.width=1024;plate.height=268;
      const p=plate.getContext('2d');p.textAlign='center';p.textBaseline='middle';
      p.fillStyle='#f3ead2';p.fillRect(0,0,1024,268);p.strokeStyle='#7a2e35';p.lineWidth=10;p.strokeRect(14,14,996,240);
      p.fillStyle='#7a2e35';p.font='700 118px "DM Sans",Arial,sans-serif';p.letterSpacing='6px';p.fillText('TAMAN PIP',512,104);
      p.fillStyle='#3b3a34';p.font='600 56px "DM Sans",Arial,sans-serif';p.letterSpacing='5px';p.fillText('POPULATION: '+list.length,512,200);
      const picture=new T.CanvasTexture(plate);picture.colorSpace=T.SRGBColorSpace;picture.anisotropy=8;
      const board=new T.Mesh(new T.PlaneGeometry(.6,.157),new T.MeshBasicMaterial({map:picture,color:0xdcd6c8}));
      board.position.set(0,.4825,side>0?5.757:5.731);board.rotation.y=side>0?0:Math.PI;scene.add(board);
    }
    // Whoever runs a shop or a market pitch has their name over it too; tapping it opens the place.
    for(const shop of places){
      const owner=shop.owner && list.find(o=>o.u===shop.owner);
      if(!owner || owner.kind==='stall')continue;       // the fried rice seller's own tag is already over the stall
      const shape=new T.PlaneGeometry(1,.3);cellUV(shape,list.indexOf(owner));
      const mesh=new T.Mesh(shape,material);scene.add(mesh);
      const [x,,z]=shop.point;
      tags.push({who:owner,shop,mesh,at:new T.Vector3(x,shop.roof||(shop.pitch?.345:.40),z)});
    }
    document.body.dataset.tags='ready';
    if(person)showPerson();else wake();
  });
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showFallback();});
  wake();
}
start().catch(error=>{console.error('Town renderer:',error);showFallback();});
