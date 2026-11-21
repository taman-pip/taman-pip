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
let active = null;
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
function choose(place) {
  active = place;
  $('gesture-hint').hidden = true;
  $('view-name').textContent = place ? place.name : 'Town overview';
  for (const button of $('places').querySelectorAll('button')) {
    button.setAttribute('aria-current', String(button.dataset.id === place?.id));
  }
  for (const pin of $('pins').children) pin.classList.toggle('current', pin.dataset.id === place?.id);
  if (mobile.matches) drawer(false);
  if (fallback) showFallback();
  else if (place) navigate?.(place);
  else resetCamera?.();
}
function directory() {
  const query = $('search').value.trim().toLowerCase();
  const entries = places.filter(p => (p.name + ' ' + p.type).toLowerCase().includes(query));
  $('places').replaceChildren();
  for (const p of entries) {
    const b = document.createElement('button');
    b.className = 'place'; b.dataset.id = p.id;
    b.setAttribute('aria-current', String(p === active));
    const img = new Image(); img.src = './assets/' + p.id + '.webp'; img.alt = ''; img.width = 63; img.height = 50;
    const words = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = p.name;
    const type = document.createElement('small'); type.textContent = p.type;
    words.append(title, type); b.append(img, words); b.onclick = () => choose(p);
    $('places').append(b);
  }
  if (!entries.length) {
    const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'No matching places.';
    $('places').append(empty);
  }
}
$('search').oninput = directory;
directory();

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
  function fly(target,distance,angle,tilt) {
    const a=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const turn=Math.atan2(Math.sin(angle-a.theta), Math.cos(angle-a.theta));
    flight={start:performance.now(),from:controls.target.clone(),to:target.clone(),a,
            dist:distance,turn,tilt,duration:reducedMotion.matches?0:650};
    wake();
  }
  function render(now) {
    frame=0;
    if(flight) {
      const f=flight,t=f.duration?Math.min(1,(now-f.start)/f.duration):1,k=t*t*(3-2*t);
      controls.target.lerpVectors(f.from,f.to,k);
      const distance=Math.exp(Math.log(f.a.radius)*(1-k)+Math.log(f.dist)*k);
      camera.position.copy(positionFor(controls.target,distance,f.a.theta+k*f.turn,f.a.phi+(f.tilt-f.a.phi)*k));
      if(t===1) flight=null;
    }
    shift.copy(controls.target);controls.target.x=T.MathUtils.clamp(shift.x,-9.15,9.15);controls.target.z=T.MathUtils.clamp(shift.z,-9.15,9.15);
    controls.target.y=T.MathUtils.clamp(shift.y,0,1.7);
    camera.position.sub(shift.sub(controls.target));
    controls.update();camera.updateMatrixWorld();renderer.render(scene,camera);
    const w=view.clientWidth,h=view.clientHeight;
    $('needle').style.transform='rotate('+controls.getAzimuthalAngle()+'rad)';
    // Give the closest/selected destinations first choice of label space.
    const used=[]; const dist=controls.getDistance();
    const order=[...pins].sort((a,b)=>(+(b.p===active)- +(a.p===active)) || (mobile.matches && dist>9 ? 0 : a.anchor.distanceTo(camera.position)-b.anchor.distanceTo(camera.position)));
    for (const pin of order) {
      point.copy(pin.anchor).project(camera);
      const x=(point.x+1)*w/2,y=(1-point.y)*h/2;
      const width=pin.p.name.length*6.8+31;
      const sampled=dist>9 || pin.p===active || pin.anchor.distanceTo(controls.target)<dist*.7;
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
  renderer.domElement.addEventListener('pointerdown',e=>{dragStart=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragStart && Math.hypot(e.clientX-dragStart[0],e.clientY-dragStart[1])>3)atHome=false;});
  renderer.domElement.addEventListener('pointerup',()=>{dragStart=null;});renderer.domElement.addEventListener('pointercancel',()=>{dragStart=null;});
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
  navigate=p=>{atHome=false;fly(new T.Vector3(...p.point),p.distance*Math.max(1,.78/camera.aspect),p.angle,p.tilt);};
  resetCamera=()=>{atHome=true;fly(homeTarget,homeDistance(),.43,homeTilt());};
  function resize() {
    const w=view.clientWidth,h=view.clientHeight;
    if(!w||!h)return;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    if(atHome)locate(true);
    wake();
  }
  new ResizeObserver(resize).observe(view);resize();
  const loader=new T.GLTFLoader().setMeshoptDecoder(T.MeshoptDecoder);
  const asset=await loader.loadAsync('./assets/town.glb');
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
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showFallback();});
  wake();
}
start().catch(error=>{console.error('Town renderer:',error);showFallback();});
