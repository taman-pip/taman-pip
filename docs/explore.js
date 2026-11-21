import { games, openGames } from './games.js?v=202611211548';
import { sound } from './sound.js?v=202611211548';
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
  const response = await fetch('./assets/episode3-places.json');
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
  sale: {from: 'Episode 2 \u00b7 Pip vs 11.11', line: '\u201cAdd to cart only.\u201d', note: 'It\u2019s the twelfth. The sale did not get the memo.', hint: 'Search for the biggest sale date of the year.', reel: REEL[2]},
  moon: {from: 'The Town That Never Looked at the Moon', line: '“And the moon looked back.”', note: 'Quick. Use a mirror.', hint: 'Look low in the northern sky.', reel: REEL.moon},
  roadster: {from: 'Pip’s Flying Roadster', line: '“Pip… can it go Genting?”', note: 'Toll not paid.', hint: 'Something red is parked near the entrance. Something red also flies.', reel: REEL.roadster},
  gate: {from: 'Taman Pip · Episode 1', line: 'Please don’t park at this gate.', note: 'Not even for “5 MINIT”.', hint: 'Walk up to the chairman’s gate.', reel: TAMAN_1},
  guard: {from: 'Taman Pip · Episode 1', line: '“Why their house bigger than mine?”', note: 'The mansions have their own guardhouse. It has one plastic chair.', hint: 'Walk up to where the mansions begin.', reel: TAMAN_1},
  pipchun: {from: 'Taman Pip · Episode 2', line: '“Eh, Ayam Gepuk Pipchun!”', note: 'The first stall in the pasar malam.', hint: 'Play a round of Gepuk! at the stalls.', reel: REEL.taman2},
  huss: {from: 'Taman Pip · Episode 3', line: 'Hus hus hus.', note: 'A very suspicious sound from behind the counter.', hint: 'Wrap or serve a burger at the stall.', reel: REEL.taman3},
  eggs: {from: 'What If Costco Opened in Malaysia?', line: '“…Eggs.”', note: 'He only came in for one thing.', hint: 'Search for the one thing Pip went shopping for.', reel: REEL.costco},
  look: {from: 'What If Malaysia Got Disneyland Before Singapore?', line: '“I’m just here to look.”', note: 'Castle view, mah. Breakfast extra.', hint: 'Search for a theme park Malaysia does not have.', reel: REEL.disneyland},
  seat: {from: 'Episode 3 · The Queue That Never Ended', line: 'Reserved.', note: 'A tissue packet is holding this seat.', hint: 'Walk to where the bus stops.', reel: REEL[3]}
};
const eggWords = {water: 'water', air: 'water', '11.11': 'sale', '1111': 'sale', '11/11': 'sale', sale: 'sale', eggs: 'eggs', egg: 'eggs', telur: 'eggs', disneyland: 'look', castle: 'look', moon: 'moon', bulan: 'moon', genting: 'roadster', roadster: 'roadster'};
let eggsFound = {};   // id -> time found
try {
  const saved = JSON.parse(localStorage.getItem('taman-pip-eggs') || '{}');
  if (Array.isArray(saved)) for (const id of saved) eggsFound[id] = Date.now();      // the first version kept a plain list
  else for (const id in saved) eggsFound[id] = saved[id];
  for (const id in eggsFound) if (!eggs[id]) delete eggsFound[id];
} catch {}
let eggTimer = 0, lastWord = '';
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
  const egg = eggs[id], fresh = !eggsFound[id];
  if (fresh) { eggsFound[id] = Date.now(); saveEggs(); }
  $('egg-from').textContent = egg.from; $('egg-line').textContent = egg.line; $('egg-note').textContent = egg.note;
  $('egg-tally').textContent = (fresh ? 'Easter egg found · ' : 'Found before · ') + eggTally() + ' of ' + eggTotal + ' · tap to see them all';
  $('egg').hidden = false; eggCount(); sound.great();
  clearTimeout(eggTimer); eggTimer = setTimeout(() => { $('egg').hidden = true; }, 7000);
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
  const {id, score} = event.detail, egg = id === 'gepuk' ? 'pipchun' : (id === 'hus' || id === 'special') && score > 0 ? 'huss' : null;
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
let startWalk;
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
  view.style.setProperty('--fallback', 'url("./assets/' + file + '.webp")');
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
function playButton() {
  $('play').hidden = !(active?.id === 'market' || (active?.detail && !active.type.startsWith('Shophouse')) || person?.kind === 'stall' || (walking && atMarket));
}
$('play').onclick = () => openGames(null, me?.u);
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
  const business = places.find(p => p.owner === person.u);
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
$('population').onclick = () => { tab = 'people'; $('search').value = ''; directory(); if (mobile.matches) drawer(true); else $('search').focus(); };
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
  const lot = document.createElement('span'); lot.className = 'lot'; lot.style.setProperty('--tone', game.tone); lot.textContent = 'Play';
  const words = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = game.name;
  const type = document.createElement('small'); type.textContent = game.stall;
  words.append(title, type); b.append(lot, words);
  b.onclick = () => { if (mobile.matches) drawer(false, false); openGames(game.id, me?.u); };
  $('places').append(b);
}
function placeRow(p) {
  const b = document.createElement('button');
  b.className = 'place'; b.dataset.id = p.id;
  const img = new Image(); img.src = './assets/' + p.id + '.webp'; img.alt = ''; img.width = 63; img.height = 50; img.loading = 'lazy';
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
  if (eggWords[query] && query !== lastWord) found(eggWords[query]);
  lastWord = query;
  const foundPlaces = places.filter(p => [p.name, p.type, p.owner, p.keywords].join(' ').toLowerCase().includes(query));
  const foundPeople = people.filter(o => (o.u + ' ' + o.lot + ' ' + kinds[o.kind].label + ' ' + kinds[o.kind].where).toLowerCase().includes(query));
  $('count-people').textContent = people.filter(o => o.kind !== 'pip').length || '';
  $('count-places').textContent = places.length;
  $('count-games').textContent = games.length;
  $('tab-games').setAttribute('aria-selected', String(tab === 'games'));
  const foundGames = games.filter(o => (o.name + ' ' + o.stall + ' game games').toLowerCase().includes(query));
  $('tab-people').setAttribute('aria-selected', String(tab === 'people'));
  $('tab-places').setAttribute('aria-selected', String(tab === 'places'));
  document.querySelector('.tabs').hidden = !!query;
  $('places').replaceChildren(); $('places').scrollTop = 0;
  if (query) {
    if (foundPeople.length) { heading('Neighbours'); foundPeople.forEach(personRow); }
    if (foundPlaces.length) { heading('Places'); foundPlaces.forEach(placeRow); }
    if (foundGames.length) { heading('Games'); foundGames.forEach(gameRow); }
    if (!foundPeople.length && !foundPlaces.length && !foundGames.length) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = 'Nobody and nowhere by that name yet. Usernames are spelled as on Instagram.';
      $('places').append(empty);
    }
  } else if (tab === 'places') {
    for (const [label, group] of [['Town landmarks', places.filter(p => !p.detail)], ['Pasar Malam', places.filter(p => p.detail && !p.type.startsWith('Shophouse'))], ['Shophouses', places.filter(p => p.type.startsWith('Shophouse'))]]) {
      if (group.length) { heading(label); group.forEach(placeRow); }
    }
  }
  else if (tab === 'games') { heading('Pasar malam stalls'); games.forEach(gameRow); }
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
if (params.get('game')) openGames(params.get('game'));
$('search').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); $('places').querySelector('button')?.click(); } };
$('search').oninput = directory;
directory();

const order = ['pip', 'mansion', 'semi', 'terrace', 'apartment', 'stall'];
const linkedPlace = places.find(p => p.id === params.get('place'));
if (linkedPlace) choose(linkedPlace, true);
const roster = fetch('./assets/residents.json').then(r => r.json()).then(data => {
  people = data.residents.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.lot.localeCompare(b.lot));
  const count = people.filter(o => o.kind !== 'pip').length;
  $('population-count').textContent = count + ' neighbours';
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
  const T = await import('./assets/engine.js');
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
  let props=null, busy=false, tappable=[], heard=0;
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
      point.copy(pin.anchor).project(camera);
      const x=(point.x+1)*w/2,y=(1-point.y)*h/2;
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
    if(flight || trip || busy || moonLook || (walking && moving))wake();
  }
  wake=()=>{if(!frame)frame=requestAnimationFrame(render);};
  controls.addEventListener('change',wake);
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
      point.copy(tag.mesh.position).project(camera);
      if(point.z>1||point.z<-1)continue;
      const half=tag.mesh.scale.x*rect.height/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.distanceTo(tag.mesh.position))/2;
      const dx=Math.abs((point.x+1)*rect.width/2-px),dy=Math.abs((1-point.y)*rect.height/2-py);
      const miss=Math.hypot(Math.max(0,dx-half),dy);
      if(miss<Math.max(16,half*.5) && miss+dx*.01<reach){reach=miss+dx*.01;best=tag;}
    }
    if(best)visit(best.who);
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
  asset=await loader.loadAsync('./assets/town.glb?v=ep3-market',e=>{
    if(e.lengthComputable && e.total)$('map-status').textContent='Loading the town\u2026 '+Math.round(e.loaded/e.total*100)+'%';
  });
  asset.scene.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    // Lambert retains the Blender palette without metallic shader overhead.
    const m=o.material;
    o.material=new T.MeshLambertMaterial({color:m.color,vertexColors:m.vertexColors,map:m.map,side:m.side,alphaTest:m.alphaTest});
    m.dispose();
  });
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
  function dress(who) {                          // shell on top, an outfit colour picked from the username below
    let h=7;for(const ch of who?who.u:'visitor')h=(h*31+ch.charCodeAt(0))>>>0;
    const suit=who?.kind==='pip'?'#7a2e35':outfits[h%outfits.length],shell=who?.kind==='pip'?'#f3ead8':['#f1e2c6','#ecd3b0','#e2c39c','#f4e8d2'][h%4];
    const rings=[];
    for(let i=0;i<=14;i++) {
      const t=i/14*Math.PI,y=.054*(1-Math.cos(t));
      if(rings.length && rings.at(-1)[1]<.047 && y>=.047){rings.push([eggRadius(Math.acos(1-.047/.054)),.047,suit],[eggRadius(Math.acos(1-.047/.054)),.047,shell]);}
      rings.push([eggRadius(t),y,y<.047?suit:shell]);
    }
    if(hero.suit){hero.body.remove(hero.suit);hero.suit.geometry.dispose();}
    hero.suit=new T.Mesh(lathe(rings,20),hero.body.children[0].material);hero.suit.position.y=.008;hero.body.add(hero.suit);
    atlas.cellUV(hero.tag.geometry,atlas.index(who));
  }
  const pipGate=people.find(o=>o.kind==='pip')?.g||[-.28,5.05];
  const spots=[{id:'gate',x:pipGate[0],z:pipGate[1],r:.2},{id:'guard',x:.62,z:-3.1,r:.5},{id:'seat',x:.45,z:3.5,r:.3},{id:'water',x:7.3,z:2.2,r:1.35}];
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
      const goal=near?1:0;
      if(near && gate.open===0){gate.hop=.45;sound.good();}
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
  };
  const clamp=T.MathUtils.clamp;
  const keys={};let stickX=0,stickY=0,clock=0,sprint=false,lean=0;
  function stride(now) {
    const dt=Math.min(.05,(now-clock)/1000||0);clock=now;
    let jx=stickX+(keys.right?1:0)-(keys.left?1:0),jy=stickY+(keys.up?1:0)-(keys.down?1:0);
    const push=Math.hypot(jx,jy);moving=push>.1;
    if(moving) {
      if(push>1){jx/=push;jy/=push;}
      flight=null;
      const turn=controls.getAzimuthalAngle(),dx=-Math.sin(turn)*jy+Math.cos(turn)*jx,dz=-Math.cos(turn)*jy-Math.sin(turn)*jx;
      const run=(sprint||keys.run)?1:0;lean+=(run-lean)*Math.min(1,dt*8);
      const step=.62*(1+lean*.95)*dt;let nx=hero.x+dx*step,nz=hero.z+dz*step;
      if(blocked(nx,nz)){ if(!blocked(nx,hero.z))nz=hero.z; else if(!blocked(hero.x,nz))nx=hero.x; else{nx=hero.x;nz=hero.z;} }
      const want=Math.atan2(dx,dz),gap=Math.atan2(Math.sin(want-hero.heading),Math.cos(want-hero.heading));
      const before=Math.floor(hero.phase/Math.PI);
      hero.heading+=gap*Math.min(1,dt*12);hero.phase+=dt*15*(1+lean*.7)*Math.min(1,push);
      if(Math.floor(hero.phase/Math.PI)!==before)sound.step();
      const ny=groundAt(nx,nz),mx=nx-hero.x,my=ny-hero.y,mz=nz-hero.z;
      hero.x=nx;hero.y=ny;hero.z=nz;
      for(const spot of spots) {
        const here=Math.hypot(nx-spot.x,nz-spot.z)<spot.r;
        if(here && !spot.in)found(spot.id);
        spot.in=here;
      }
      const among=inMarket(nx,nz);
      if(among!==atMarket){atMarket=among;playButton();}
      controls.target.x+=mx;controls.target.y+=my;controls.target.z+=mz;
      camera.position.x+=mx;camera.position.y+=my;camera.position.z+=mz;
    }
    if(!moving)lean+=(0-lean)*Math.min(1,dt*8);
    const swing=moving?Math.sin(hero.phase):0;
    hero.root.position.set(hero.x,hero.y,hero.z);hero.root.rotation.y=hero.heading;
    hero.body.position.y=moving?Math.abs(Math.cos(hero.phase))*(.006+lean*.006):0;hero.body.rotation.z=swing*.09;hero.body.rotation.x=lean*.26;
    hero.feet[0].position.z=.006+swing*.016;hero.feet[1].position.z=.006-swing*.016;
    hero.feet[0].position.y=Math.max(0,swing)*.008;hero.feet[1].position.y=Math.max(0,-swing)*.008;
  }
  startWalk=()=>{
    if(!atlas)return;                            // name tags (and so the roster) are not ready yet
    if(!grid)buildGrid();
    if(!hero)buildHero();
    dress(me);
    const shop=active?.detail ? active : null;
    const approach=shop?.reverse ? -1 : 1;
    let [x,z]=shop ? [shop.point[0],shop.point[2]+approach*.26] : me ? me.g : [0,6.2];
    if(blocked(x,z)) search: for(let r=1;r<40;r++)for(let i=0;i<16;i++) {  // nearest clear spot
      const t=i/16*Math.PI*2,tx=x+Math.cos(t)*r*CELL,tz=z+Math.sin(t)*r*CELL;
      if(!blocked(tx,tz)){x=tx;z=tz;break search;}
    }
    hero.x=x;hero.z=z;hero.y=groundAt(x,z);hero.heading=shop ? (shop.reverse ? 0 : Math.PI) : me ? me.face : Math.PI;hero.phase=0;
    hero.root.visible=hero.tag.visible=true;
    atMarket=inMarket(x,z);
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
    if(shop) fly(new T.Vector3(x,hero.y+.09,z),.78*reach,shop.angle,1.14,38);
    else if(!me) fly(new T.Vector3(x,hero.y+.09,z),1.45*reach,0,1.22,38);
    else if(lane) fly(new T.Vector3(x,hero.y+.09,z),1.5*reach,hero.heading+Math.PI/2,.86,38);
    else fly(new T.Vector3(x,hero.y+.09,z),1.35*reach,hero.heading+.35,1.16,38);
  };
  stopWalk=()=>{
    if(!walking)return;
    walking=false;moving=false;hero.root.visible=hero.tag.visible=false;playButton();runLock=false;runDown=0;runState();
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
    list.forEach((o,i)=>{
      const shape=new T.PlaneGeometry(1,.3);cellUV(shape,i);
      const mesh=new T.Mesh(shape,material);scene.add(mesh);
      tags.push({who:o,mesh,at:new T.Vector3(...o.p)});
    });
    document.body.dataset.tags='ready';
    if(person)showPerson();else wake();
  });
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showFallback();});
  wake();
}
start().catch(error=>{console.error('Town renderer:',error);showFallback();});
