const places = [
  { id: 'market', name: 'Pasar Malam', type: 'Night market', tone: '#bb6845', point: [5.45, .16, 2.62], distance: 2.75, angle: 1.0, tilt: 1.03 },
  { id: 'gate', name: 'Town entrance', type: 'Welcome arch', tone: '#658052', point: [0, .15, 5.75], distance: 1.95, angle: .20, tilt: 1.22 },
  { id: 'terraces', name: 'Terrace Lane', type: 'Terrace houses', tone: '#aa744b', point: [-4.84, .22, 1.4], distance: 3.8, angle: -.48, tilt: 1.08 },
  { id: 'shops', name: 'The shophouses', type: 'Shops & clinic', tone: '#b25b50', point: [4.25, .22, 4.35], distance: 3.4, angle: .15, tilt: 1.17 },
  { id: 'apartments', name: 'The apartments', type: 'Apartment blocks', tone: '#77869c', point: [3.0, .53, 1.43], distance: 5.6, angle: .57, tilt: 1.08 },
  { id: 'mansions', name: 'Mansion Row', type: 'Hillside homes', tone: '#5d897b', point: [-1.64, .25, -4.24], distance: 3.7, angle: .43, tilt: 1.10 }
];
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
const params = new URLSearchParams(location.search);
let people = [];
let person = null;      // the house being visited
let me = null;          // the neighbour the visitor explores as
let street = false;
let tab = 'people';
let active = null;
let showPerson;
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
  const query = me ? '?as=' + me.u : person ? '?u=' + person.u : '';
  try { history.replaceState(null, '', location.pathname + query); } catch {}
  try { me ? localStorage.setItem('taman-pip-me', me.u) : localStorage.removeItem('taman-pip-me'); } catch {}
}
function marks() {
  for (const button of $('places').querySelectorAll('button')) {
    button.setAttribute('aria-current', String(button.dataset.id === (active?.id ?? (person && '@' + person.u))));
  }
}
function card() {
  $('card').hidden = !person;
  document.body.classList.toggle('has-card', !!person);
  if (!person) return;
  const k = kinds[person.kind], mine = person === me;
  $('card-lot').textContent = person.kind === 'stall' ? 'Stall' : person.kind === 'pip' ? 'No. 1' : person.lot;
  $('card-lot').style.setProperty('--tone', k.tone);
  $('card-eyebrow').textContent = mine ? 'You live here' : person.kind === 'pip' ? 'The chairman' : 'Neighbour since Episode ' + person.since;
  $('card-name').textContent = '@' + person.u;
  $('card-where').textContent = person.floor ? 'Apartment \u00b7 Block A, floor ' + person.floor : k.label + ' \u00b7 ' + k.where;
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
  $('card-as').querySelector('span').textContent = mine ? 'Stop exploring as me' : 'Explore as @' + person.u;
  $('card-as').classList.toggle('primary', !mine);
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
  person = who; active = null; street = false;
  $('gesture-hint').hidden = true;
  $('view-name').textContent = '@' + who.u + (who.lot && who.kind !== 'pip' ? ' \u00b7 ' + who.lot : '');
  marks(); card(); remember();
  if (mobile.matches && !keepDrawer) drawer(false, false);
  if (!fallback) showPerson?.();
}
$('card-close').onclick = () => { const low = street; person = null; street = false; card(); remember(); $('view-name').textContent = 'Town overview'; marks(); if (low) resetCamera?.(); else wake?.(); };
$('card-as').onclick = () => { me = person === me ? null : person; identity(); card(); remember(); wake?.(); };
$('card-street').onclick = () => { street = !street; card(); showPerson?.(); };
$('card-share').onclick = async () => {
  const url = location.origin + location.pathname + '?u=' + person.u;
  const label = $('card-share').querySelector('span');
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({title: 'Taman Pip', text: '@' + person.u + ' lives here in Taman Pip', url});
    else { await navigator.clipboard.writeText(url); label.textContent = 'Link copied'; }
  } catch (error) { if (error.name !== 'AbortError') { prompt('Copy this link', url); } }
};
$('me').onclick = () => me && visit(me);
$('population').onclick = () => { tab = 'people'; $('search').value = ''; directory(); if (mobile.matches) drawer(true); else $('search').focus(); };
function choose(place) {
  active = place; person = null; street = false; card(); remember();
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
function placeRow(p) {
  const b = document.createElement('button');
  b.className = 'place'; b.dataset.id = p.id;
  const img = new Image(); img.src = './assets/' + p.id + '.webp'; img.alt = ''; img.width = 63; img.height = 50; img.loading = 'lazy';
  const words = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = p.name;
  const type = document.createElement('small'); type.textContent = p.type;
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
  const foundPlaces = places.filter(p => (p.name + ' ' + p.type).toLowerCase().includes(query));
  const foundPeople = people.filter(o => (o.u + ' ' + o.lot + ' ' + kinds[o.kind].label + ' ' + kinds[o.kind].where).toLowerCase().includes(query));
  $('count-people').textContent = people.filter(o => o.kind !== 'pip').length || '';
  $('count-places').textContent = places.length;
  $('tab-people').setAttribute('aria-selected', String(tab === 'people'));
  $('tab-places').setAttribute('aria-selected', String(tab === 'places'));
  document.querySelector('.tabs').hidden = !!query;
  $('places').replaceChildren(); $('places').scrollTop = 0;
  if (query) {
    if (foundPeople.length) { heading('Neighbours'); foundPeople.forEach(personRow); }
    if (foundPlaces.length) { heading('Places'); foundPlaces.forEach(placeRow); }
    if (!foundPeople.length && !foundPlaces.length) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = 'Nobody and nowhere by that name yet. Usernames are spelled as on Instagram.';
      $('places').append(empty);
    }
  } else if (tab === 'places') foundPlaces.forEach(placeRow);
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
$('search').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); $('places').querySelector('button')?.click(); } };
$('search').oninput = directory;
directory();

const order = ['pip', 'mansion', 'semi', 'terrace', 'apartment', 'stall'];
const roster = fetch('./assets/residents.json').then(r => r.json()).then(data => {
  people = data.residents.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.lot.localeCompare(b.lot));
  const count = people.filter(o => o.kind !== 'pip').length;
  $('population-count').textContent = count + ' neighbours';
  const flats = data.apartments - people.filter(o => o.kind === 'apartment').length;
  $('milestone-text').textContent = flats + ' more apartments to fill.';
  const find = name => name && people.find(o => o.u.toLowerCase() === name.toLowerCase().replace(/^@/, ''));
  let saved = null; try { saved = localStorage.getItem('taman-pip-me'); } catch {}
  me = find(params.get('as')) || (!params.get('u') && find(saved)) || null;
  identity(); directory();
  const first = find(params.get('u')) || me;
  if (first) visit(first, true);
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
  const pad = document.createElement('canvas'); pad.width=pad.height=128;
  const ctx = pad.getContext('2d'), grad = ctx.createRadialGradient(64,64,20,64,64,63);
  grad.addColorStop(0,'rgba(51,76,53,.43)'); grad.addColorStop(.62,'rgba(66,92,65,.30)'); grad.addColorStop(1,'rgba(66,92,65,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const shadow = new T.Mesh(new T.PlaneGeometry(33,33),new T.MeshBasicMaterial({map:new T.CanvasTexture(pad),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(.6,-.73,-.3);scene.add(shadow);
  const hitPlane = new T.PlaneGeometry(19,19);
  const ground = new T.Mesh(hitPlane,new T.MeshBasicMaterial());ground.rotation.x=-Math.PI/2;ground.updateMatrixWorld();
  const ray=new T.Raycaster();
  const pins = places.map(p => {
    const el = document.createElement('button'); el.className='pin'; el.dataset.id=p.id; el.style.setProperty('--tone',p.tone);
    el.textContent=p.name;el.setAttribute('aria-label','Visit '+p.name); el.onclick=()=>choose(p); el.hidden=true;
    $('pins').append(el);
    return {p,el,anchor:new T.Vector3(...p.point).add(new T.Vector3(0,p.id==='apartments'?.7:.49,0))};
  });
  // Two pins follow people: the house being visited and the visitor's own.
  const homePins = ['visiting','mine'].map(kind => {
    const el = document.createElement('button'); el.className='pin home '+kind; el.hidden=true;
    el.onclick=()=>{const who=kind==='mine'?me:person; if(who)visit(who);};
    $('pins').append(el);
    return {kind,el,anchor:new T.Vector3()};
  });
  const tags = [];
  let framed='';
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
      const show=who && loaded && tags.length && (pin.kind==='mine' || (person!==me && away>7));
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
      const sampled=(dist>9 && !person) || pin.p===active || pin.anchor.distanceTo(controls.target)<dist*.7;
      const r={l:x-width/2,r:x+width/2,t:y-45,b:y};
      const blocked=used.some(b=>r.l<b.r+4 && r.r>b.l-4 && r.t<b.b && r.b>b.t);
      const visible=loaded && sampled && !blocked && point.z<1 && point.z>-1 && r.l>2 && r.r<w-2 && y>84 && y<h-58;
      pin.el.hidden=!visible;
      if(visible) {
        pin.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,calc(-100% - 9px))';
        used.push(r);
      }
    }
    if(flight)wake();
  }
  wake=()=>{if(!frame)frame=requestAnimationFrame(render);};
  controls.addEventListener('change',wake);
  controls.addEventListener('start',()=>{flight=null; $('gesture-hint').hidden=true;});
  renderer.domElement.addEventListener('pointerdown',e=>{dragStart=[e.clientX,e.clientY,performance.now(),e.isPrimary];});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragStart && Math.hypot(e.clientX-dragStart[0],e.clientY-dragStart[1])>3)atHome=false;});
  renderer.domElement.addEventListener('pointerup',e=>{
    const d=dragStart;dragStart=null;
    // A tap (not a drag) on or near a rooftop tag opens that house.
    if(!d || !d[3] || !tags.length || performance.now()-d[2]>450 || Math.hypot(e.clientX-d[0],e.clientY-d[1])>6)return;
    const rect=view.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
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
  navigate=p=>{atHome=false;fly(new T.Vector3(...p.point),p.distance*Math.max(1,.78/camera.aspect),p.angle,p.tilt,38);};
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
  const asset=await loader.loadAsync('./assets/town.glb',e=>{
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
  roster.then(async list=>{
    if(!list.length)return;
    try{await document.fonts.load('650 40px "DM Sans"');}catch{}
    // One texture holds every name tag: a cream pill like the roof signs in the films.
    const cols=6,cw=320,ch=96,rows=Math.ceil(list.length/cols);
    const sheet=document.createElement('canvas');sheet.width=cols*cw;sheet.height=rows*ch;
    const g=sheet.getContext('2d');g.textAlign='center';g.textBaseline='middle';
    list.forEach((o,i)=>{
      const x=i%cols*cw,y=Math.floor(i/cols)*ch;
      g.beginPath();g.roundRect(x+6,y+8,cw-12,ch-16,(ch-16)/2);
      g.fillStyle='#fbf3e2';g.fill();g.lineWidth=5;g.strokeStyle=kinds[o.kind].tone;g.stroke();
      let size=44;const text='@'+o.u;
      do{g.font='650 '+size+'px "DM Sans",Arial,sans-serif';size-=2;}while(g.measureText(text).width>cw-52 && size>18);
      g.fillStyle='#213f31';g.fillText(text,x+cw/2,y+ch/2+2);
    });
    const texture=new T.CanvasTexture(sheet);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const material=new T.MeshBasicMaterial({map:texture,alphaTest:.5});
    list.forEach((o,i)=>{
      const shape=new T.PlaneGeometry(1,.3),uv=shape.attributes.uv;
      const u=i%cols/cols,v=1-Math.floor(i/cols)/rows;
      uv.setXY(0,u,v);uv.setXY(1,u+1/cols,v);uv.setXY(2,u,v-1/rows);uv.setXY(3,u+1/cols,v-1/rows);
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
