"""Export the Episode 3 town to a flat, browser-friendly glTF scene.
From the public repository root, use the Episode 3 Blender production assets:

    blender -b /path/to/taman-pip/03-pasar-malam/project/taman-pip-ep3-town-v4.blend --python-exit-code 1 -P docs/tools/export_explorer.py -- /tmp/town-raw.glb
    npx gltfpack@0.25.0 -i /tmp/town-raw.glb -o docs/assets/town.glb -cc -si 0.72 -slb

Keep the Episode 3 hero scene beside the town scene and the kit and episode texture
directories in their original production layout.

Keep -slb (locked borders): without it the simplifier halves every sign card to one triangle and the
signs (arch, shops, boards) show blank.
"""
import collections
import io
import json
import math
import struct
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from PIL import Image

out = Path(sys.argv[sys.argv.index('--') + 1])
kit = Path(bpy.data.filepath).resolve().parents[2]/'kit'
scene = bpy.context.scene
scene.frame_set(802)
places = json.loads((Path(__file__).resolve().parents[1]/'assets/episode3-places.json').read_text())
market = scene.objects['TP - First Pasar Malam']
market.animation_data_clear()
market.hide_viewport = market.hide_render = False
dg = bpy.context.evaluated_depsgraph_get()
buffers = collections.defaultdict(list)
colors = {}
photos = {}
axis = np.array([[1,0,0],[0,0,1],[0,-1,0]])
EPISODE_SIGNS = {'arch.png','ayam.png','polish-stall-open.png'}                 # signs kept from an episode's own tex folder

def surface(mat):
    if not mat or not mat.node_tree:
        return (.62,.62,.54), ''
    key = mat.as_pointer()
    if key in colors:
        return colors[key]
    nodes = mat.node_tree.nodes
    color = (.59,.51,.39)
    photo = ''
    for n in nodes:
        if n.type == 'TEX_IMAGE' and n.image:
            img = n.image
            # Use the physical shop/entrance signs; captions and resident data
            # used for the episode edit do not belong to the web map.
            name = img.name.split('.png')[0]+'.png'
            path = kit/'tex'/name
            if not path.exists() and name in EPISODE_SIGNS:
                # The entrance arch carries the current population, redrawn per episode.
                path = Path(bpy.path.abspath(img.filepath))
                if not path.exists() and name != 'arch.png':
                    path = kit.parent/'02-move-in-day/tex'/name
            if path.exists():
                photo = name
                photos[name] = path
                color = (1,1,1)
                break
        if n.type == 'MIX':
            rgba = [q.default_value[:3] for q in n.inputs if q.enabled and q.type=='RGBA']
            if len(rgba)==2:
                color = np.mean(rgba,axis=0)
                break
        if n.type == 'BSDF_PRINCIPLED':
            color = n.inputs['Base Color'].default_value[:3]
        if n.type == 'EMISSION':
            color = n.inputs['Color'].default_value[:3]
    colors[key] = color,photo
    return color,photo

def emit(pos,norm,color,photo='',uv=None):
    if uv is None: uv=np.zeros((len(pos),2))
    full=np.column_stack((pos@axis.T,norm@axis.T,np.broadcast_to(color,pos.shape),uv))
    buffers[photo].append(full.astype('f4'))

cube = np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],dtype=float)
faces = np.array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],
                  [2,3,7],[2,7,6],[3,0,4],[3,4,7]])
def boxed(local,matrix,color):
    lo,hi=local.min(axis=0),local.max(axis=0)
    world=(cube*(hi-lo)+lo)@matrix[:3,:3].T+matrix[:3,3]
    tris=world[faces]
    normals=np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0])
    normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
    emit(tris.reshape(-1,3),np.repeat(normals,3,axis=0),color)

def excluded(obj):
    while obj:
        if (obj.hide_render or obj.name.startswith(('ep2 resident','ep2 proposed','ep2 locked','Vacant terrace plate','lot SCHOOL','Address plate','Current roster','ep2 drawing table')) or '@' in obj.name):
            return True
        obj=obj.parent
    return False

def mesh_arrays(obj, world):
    mesh=obj.to_mesh()
    try:
        if not mesh or not mesh.polygons:return
        verts=np.empty(len(mesh.vertices)*3,dtype='f4')
        mesh.vertices.foreach_get('co',verts)
        local=verts.reshape(-1,3)
        materials=list(mesh.materials) or [None]
        color,photo=surface(materials[0])
        if len(materials)==1 and not photo and len(local) in (8,24,56):
            aligned={tuple(round(v,3) for v in p.normal) for p in mesh.polygons}
            if all(tuple(k*sign for k in unit) in aligned for unit in ((1,0,0),(0,1,0),(0,0,1)) for sign in (1,-1)):
                boxed(local,world,color)
                return
        mesh.calc_loop_triangles()
        tris=mesh.loop_triangles
        if not tris:return
        idx=np.empty(len(tris)*3,dtype='i4');tris.foreach_get('vertices',idx)
        pos=(local@world[:3,:3].T+world[:3,3])[idx]
        vnorm=np.empty_like(verts);mesh.vertices.foreach_get('normal',vnorm)
        norms=vnorm.reshape(-1,3)[idx].copy()
        flat=np.array([not t.use_smooth for t in tris])
        if flat.any():
            norms.reshape(-1,3,3)[flat]=np.array([t.normal[:] for t in tris])[flat,None,:]
        norms=norms@np.linalg.pinv(world[:3,:3])
        norms/=np.maximum(np.linalg.norm(norms,axis=1)[:,None],1e-8)
        uv=None
        if mesh.uv_layers.active and any(surface(m)[1] for m in materials):
            layer=mesh.uv_layers.active.data
            coords=np.empty(len(layer)*2,dtype='f4');layer.foreach_get('uv',coords)
            loops=np.empty_like(idx);tris.foreach_get('loops',loops)
            uv=coords.reshape(-1,2)[loops];uv[:,1]=1-uv[:,1]
        if len(materials)==1:emit(pos,norms,color,photo,uv)
        else:
            material_ids=np.repeat([t.material_index for t in tris],3)
            for i,mat in enumerate(materials):
                use=material_ids==i
                if use.any():emit(pos[use],norms[use],*surface(mat),uv[use] if uv is not None else None)
    finally: obj.to_mesh_clear()

for inst in dg.object_instances:
    obj=inst.object
    if obj.type not in ('MESH','FONT','CURVE') or excluded(obj):continue
    if inst.is_instance and (inst.parent is None or inst.parent.original!=market):continue
    world=np.asarray(inst.matrix_world)
    if any(abs(t)>10 for t in world[:2,3]) or abs(world[2,3])>6:continue
    if obj.name.startswith(('ep2 photo','ep2 speech','tree proto','trunk ring','flower leaf','terrace window grille','name tag','ep2 banner','boom arm','ep2 access barrier','ep2 road notice')):continue   # boom arms are animated in the explorer
    if obj.parent and obj.parent.name=='lot T20' and obj.name.startswith('terrace roof'):
        continue  # The street-level terrace becomes the base of Antilia.
    if inst.is_instance and any(c.name=='Stall - AIR BALANG' for c in obj.original.users_collection):
        # Serve drinks into the north aisle; the original chicken stall backs onto this tent.
        world=world.copy()
        world[:2,3]=2*np.array([5.48,-2.32])-world[:2,3]
        world[:2,:3]*=-1
    if obj.name=='slide' and obj.parent and obj.parent.name=='lot PLAY':
        # The original chute rises away from the tower. Join the high lip to
        # the platform at y=-2.41, z=.126 and the low lip to the rubber mat.
        a=math.radians(56)
        turn=np.array([[1,0,0],[0,math.cos(a),-math.sin(a)],[0,math.sin(a),math.cos(a)]])
        world=world.copy()
        world[:3,:3]=turn@world[:3,:3]
        world[1:3,3]=(-2.511,.059)
    if obj.name=='ep2 big pool water':
        # On M04 the coping and the water otherwise have coplanar top faces.
        world=world.copy()
        world[2,3]+=.0035
    mesh_arrays(obj, world)

# Reduce the ring of thousands of felt trees to low-poly crowns. Keep their
# Blender placement and colours and retain the full-detail street trees.
bm=bmesh.new()
bmesh.ops.create_icosphere(bm,subdivisions=2,radius=1)
bm.verts.ensure_lookup_table();bm.verts.index_update()
sphere=np.array([v.co[:] for v in bm.verts])
indices=np.array([[v.index for v in f.verts] for f in bm.faces]).reshape(-1)
unit=sphere[indices];bm.free()
rng=np.random.default_rng(454)
for i,tree in enumerate(o for o in scene.objects if o.name.startswith('forest tree')):
    if i%2:continue
    x,y,z=tree.matrix_world.translation
    if 6.16 < x < 9.28 and -4.93 < y < -2.20:continue  # aisle and approach beside the pond
    sc=tree.scale.x
    h=(.36+rng.uniform(-.06,.12))*sc
    col=np.array([.13,.25,.088])*rng.uniform(.74,1.32)
    for dx,dy,factor,lift in [(0,0,1,.60),(.066,-.049,.69,.72)]:
        radii=np.array([.162*sc,.145*sc,h*.47])*factor
        points=unit*radii+np.array([x+dx*sc,y+dy*sc,z+h*lift])
        normals=unit/radii;normals/=np.linalg.norm(normals,axis=1)[:,None]
        emit(points,normals,col*(1 if factor==1 else 1.10))

# The close-up food pitches were shot on their own stage in Episode 3.
# Move them onto the open frontage of the same market in the public town.
hero_path=Path(bpy.data.filepath).with_name('taman-pip-ep3-v3.blend')
bpy.ops.wm.open_mainfile(filepath=str(hero_path))
hero=bpy.context.scene
hero.frame_set(710)
dg=bpy.context.evaluated_depsgraph_get()
colors.clear()
def place_group(parent, origin, destination, reverse=False, strip=False):
    # Apply the same stage-to-town transform to a stall and its cook.
    direction = -1 if reverse else 1
    rotation = np.diag([direction, direction, 1])
    for obj in parent.children_recursive:
        if obj.type not in ('MESH','CURVE','FONT') or obj.hide_render:continue
        if parent.name=='Ramly burger pitch' and (obj.parent.name=='Vacancy swing' or obj.name=='TAPAK PENJAJA'):
            continue
        if strip and (obj.name.startswith(('pot', 'prepared food', 'pancake griddle', 'golden pancake')) or (obj.type=='FONT' and obj.data.body.startswith('@'))):continue
        evaluated=obj.evaluated_get(dg)
        matrix=np.array(evaluated.matrix_world)
        matrix[:3,3]=rotation@(matrix[:3,3]-origin)+destination
        matrix[:3,:3]=rotation@matrix[:3,:3]
        mesh_arrays(evaluated,matrix)

# The burger pitch stands forward of and apart from the Ayam Gepuk Pipchun stall; the fried rice stall backs
# onto the shophouses' rear wall (y -3.35) and faces north, so one half-metre aisle runs between it and the
# first row. Side by side they left the walker 5-12 cm gaps and a 15 cm aisle.
for name,destination,reverse in [('Ramly burger pitch',(6.10,-3.04,.020),False),
                                 ('CHINESE FRIED RICE',(4.94,-3.235,.020),True),
                                 ('fried rice seller',(4.94,-3.348,.077),True)]:
    parent=hero.objects[name]
    place_group(parent,np.array(parent.matrix_world.translation),destination,reverse,name=='CHINESE FRIED RICE')

def lin(code):
    """A colour written as on screen (#RRGGBB) in the linear values the materials use."""
    v=np.array([int(code[i:i+2],16) for i in (1,3,5)])/255
    return np.where(v<=.04045,v/12.92,((v+.055)/1.055)**2.4)

class Counter:
    """What a pitch sells, laid out on its counter. The pitch's own axes: x along the counter, y towards the
    cook (customers stand at -y), z up from the paving; the counter top is at TOP. The 3D lettering of the
    owner's handle and the three stand-in pots are left out of the export (place_group strip): the explorer
    draws the handle itself, and each pitch gets the food its sign names."""
    TOP=.111
    def __init__(self,destination,reverse=False):
        self.at=np.array(destination,dtype=float);self.turn=np.diag([-1,-1,1]) if reverse else np.eye(3)
    def put(self,points,normals,color):
        points=np.asarray(points,dtype=float).reshape(-1,3,3);normals=np.asarray(normals,dtype=float).reshape(-1,3,3)
        face=np.cross(points[:,1]-points[:,0],points[:,2]-points[:,0])
        back=(face*normals.mean(axis=1)).sum(axis=1)<0
        points[back]=points[back][:,::-1];normals[back]=normals[back][:,::-1]
        color=lin(color) if isinstance(color,str) else color
        emit(points.reshape(-1,3)@self.turn.T+self.at,normals.reshape(-1,3)@self.turn.T,color)
    def box(self,c,size,color,spin=0):
        c,size=np.array(c,dtype=float),np.array(size,dtype=float)
        tris=((cube-.5)*size)[faces]
        normals=np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0]);normals/=np.linalg.norm(normals,axis=1)[:,None]
        normals=np.repeat(normals,3,axis=0).reshape(-1,3);tris=tris.reshape(-1,3)
        co,si=math.cos(spin),math.sin(spin);rot=np.array([[co,-si,0],[si,co,0],[0,0,1]])
        self.put(tris@rot.T+c+[0,0,size[2]/2],normals@rot.T,color)
    def cyl(self,c,r,h,color,top=None,n=14,arc=math.tau,start=0,cap=None):
        """A drum standing on c: radius r at the foot and `top` at the height h. `arc` under a full turn gives
        a wedge or half-moon; `cap` colours the top face differently."""
        top=r if top is None else top;c=np.array(c,dtype=float)
        ang=start+np.linspace(0,arc,n+1);ring=np.column_stack((np.cos(ang),np.sin(ang),np.zeros(n+1)))
        lo,hi=ring*r+c,ring*top+c+[0,0,h];slope=(r-top)/max(h,1e-6)
        out=ring+[0,0,slope];out/=np.linalg.norm(out,axis=1)[:,None]
        pts=[];nor=[]
        for i in range(n):
            pts+=[lo[i],lo[i+1],hi[i+1],lo[i],hi[i+1],hi[i]];nor+=[out[i],out[i+1],out[i+1],out[i],out[i+1],out[i]]
        self.put(pts,nor,color)
        mid=c+[0,0,h];pts=[]
        for i in range(n):pts+=[mid,hi[i],hi[i+1]]
        self.put(pts,np.tile([0,0,1.],(len(pts),1)),cap or color)
        if arc<math.tau-1e-6:
            for edge in (0,n):
                quad=[c,lo[edge],hi[edge],c,hi[edge],mid];normal=np.cross(lo[edge]-c,[0,0,1.])*(1 if edge==0 else -1)
                self.put(quad,np.tile(normal/np.linalg.norm(normal),(6,1)),cap or color)
    def ball(self,c,radii,color,spin=0):
        radii=np.array(radii,dtype=float)*np.ones(3)
        co,si=math.cos(spin),math.sin(spin);rot=np.array([[co,-si,0],[si,co,0],[0,0,1]])
        normals=unit/radii;normals/=np.linalg.norm(normals,axis=1)[:,None]
        self.put((unit*radii)@rot.T+np.array(c,dtype=float),normals@rot.T,color)
    # Things several pitches share.
    def bowl(self,x,y,r,h,color,fill,z=None):
        z=self.TOP if z is None else z
        self.cyl((x,y,z),r*.62,h,color,top=r,n=16,cap=fill)
        return z+h
    def plate(self,x,y,r=.036,color='#F4EFE2'):
        self.cyl((x,y,self.TOP),r*.8,.004,color,top=r,n=18);return self.TOP+.004
    def tray(self,x,y,w,d,color='#8A6238'):
        self.box((x,y,self.TOP),(w,d,.005),color);return self.TOP+.005
    def bits(self,x,y,z,r,colors,count,seed,size=.004,flat=.5):
        rng=np.random.default_rng(seed)
        for i in range(count):
            a=rng.uniform(0,math.tau);d=r*math.sqrt(rng.uniform())
            self.ball((x+d*math.cos(a),y+d*math.sin(a),z),(size,size*rng.uniform(.6,1),size*flat),colors[i%len(colors)],a)
    def pancake(self,x,y,z,r,spin,fillings):
        """A folded apam balik: a thick golden half-moon with its filling showing along the cut edge."""
        self.cyl((x,y,z),r,.011,'#B9722A',n=10,arc=math.pi,start=spin,cap='#D39A45')
        for i,t in enumerate(np.linspace(-.8,.8,7)):
            px,py=x+math.cos(spin)*r*t,y+math.sin(spin)*r*t
            self.ball((px-math.sin(spin)*-.002,py+math.cos(spin)*-.002,z+.006),(.0042,.0042,.004),fillings[i%len(fillings)])
    def fried(self,x,y,z,spin=0,scale=1.0,color='#B56A24'):
        """A piece of smashed fried chicken: a flattened, craggy golden slab."""
        self.ball((x,y,z+.006*scale),(.026*scale,.017*scale,.007*scale),color,spin)
        for i,(dx,dy) in enumerate(((-.012,.006),(.010,-.007),(.004,.009),(-.004,-.008))):
            co,si=math.cos(spin),math.sin(spin)
            self.ball((x+(dx*co-dy*si)*scale,y+(dx*si+dy*co)*scale,z+.010*scale),(.009*scale,.007*scale,.005*scale),'#C98331' if i%2 else '#9C5519',spin+i)
    def rice(self,x,y,z,r=.016):
        self.ball((x,y,z),(r,r,r*.8),'#F6F1E4')
    def cucumber(self,x,y,z,count=3,step=(.009,.003)):
        for i in range(count):self.cyl((x+i*step[0],y+i*step[1],z+i*.0012),.007,.002,'#3E7A3A',n=10,cap='#CFE3A6')
    def gepuk_plate(self,x,y,sambal,spin=0):
        z=self.plate(x,y,.040,'#7A5230')                # a rattan-brown plate lined with a banana leaf
        self.cyl((x,y,z),.034,.0015,'#2F6B34',n=16)
        z+=.0015
        self.rice(x-.014,y+.012,z);self.fried(x+.008,y-.004,z,spin)
        self.ball((x-.016,y-.016,z+.003),(.010,.008,.004),sambal);self.cucumber(x+.004,y+.020,z)
    def serve(self,what):
        T=self.TOP
        if what in ('apam-balik','spam-balik'):
            spam=what=='spam-balik'
            fill=['#E8908A','#F1D25A','#E8908A','#C9A46A'] if spam else ['#F1D25A','#C9A46A','#F1D25A','#8A5A2B']
            # The round brass pan with one cooking, its filling scattered over it.
            self.cyl((-.135,-.034,T),.043,.008,'#2B2B2E',n=18,cap='#C98C3A')
            self.cyl((-.135,-.034,T+.008),.036,.003,'#E2B55C',n=18)
            self.bits(-.135,-.034,T+.012,.028,fill,16,5,.0042)
            self.box((-.085,-.034,T+.004),(.03,.008,.006),'#5A3A1E')        # pan handle
            z=self.tray(.02,-.034,.17,.10,'#9A7040')
            for i,(px,py,spin) in enumerate(((-.035,-.062,.25),(.02,-.058,.05),(.073,-.062,-.2),(-.01,-.018,.15),(.05,-.016,-.1))):
                self.pancake(px,py,z+(.004 if i>2 else 0),.034,spin,fill)
            if spam:
                self.box((.165,-.012,T),(.05,.03,.026),'#E38A84')           # the loaf, and slices cut from it
                for i in range(4):self.box((.150+i*.012,-.060,T+i*.0005),(.03,.022,.005),'#EFA39C',.3)
            else:
                h=self.bowl(.165,-.012,.026,.018,'#F4EFE2','#C9A46A');self.bits(.165,-.012,h,.018,['#B98A4E','#8A5A2B'],10,7,.004)
                h=self.bowl(.165,-.066,.024,.016,'#F4EFE2','#F1D25A');self.bits(.165,-.066,h,.016,['#F6DD6E','#E9BE3C'],10,8,.0038,.9)
        elif what=='tomyam':
            float_=lambda x,y,z,r,seed:(self.bits(x,y,z,r*.8,['#F08A5B','#F3A27C'],5,seed,.0075,.55),      # prawns
                                        self.bits(x,y,z,r*.85,['#E9DDC4','#3F7F3A','#C6241D','#3F7F3A','#E9DDC4'],9,seed+1,.0048,.6))
            self.box((-.12,-.03,T),(.085,.085,.012),'#2B2B2E')                # burner
            h=self.bowl(-.12,-.03,.052,.045,'#4A4B50','#C8431C',T+.012);float_(-.12,-.03,h+.001,.045,11)
            self.box((-.068,-.008,h-.004),(.035,.007,.005),'#5A3A1E',.5)      # ladle
            for i,(px,py) in enumerate(((.02,-.058),(.095,-.052))):
                h=self.bowl(px,py,.031,.022,'#F4EFE2','#D2532A');float_(px,py,h+.001,.026,21+i*4)
            z=self.plate(.165,-.005,.030)                                    # limes and bird's eye chillies
            for i,(dx,dy) in enumerate(((-.010,.006),(.010,.004),(0,-.011))):self.ball((.165+dx,-.005+dy,z+.007),.008,'#7FA63A')
            self.bits(.05,.0,T+.003,.022,['#C6241D','#3F7F3A'],8,31,.006,.45)
            z=self.plate(.165,-.068,.028);self.bits(.165,-.068,z+.003,.018,['#E9DDC4','#D8C7A8'],9,33,.006,.7)   # mushrooms
        elif what=='gerai-kedah':
            # Laksa Kedah: a pot of fish gravy, nests of rice noodles, and bowls dressed with egg, cucumber and chilli.
            self.box((-.14,-.03,T),(.08,.08,.012),'#2B2B2E')
            self.bowl(-.14,-.03,.046,.045,'#8C8F96','#A8683A',T+.012)
            z=self.tray(-.045,-.008,.075,.075,'#E9E2D0')
            for dx,dy in ((-.018,-.018),(.018,-.018),(-.018,.018),(.018,.018)):
                self.ball((-.045+dx,-.008+dy,z+.006),(.015,.015,.008),'#FBF7EC');self.ball((-.045+dx,-.008+dy,z+.012),(.008,.008,.005),'#EFE8D6')
            for i,(px,py) in enumerate(((.045,-.058),(.125,-.058),(.085,.004))):
                h=self.bowl(px,py,.033,.022,'#F4EFE2','#B5733F')
                self.ball((px-.004,py+.004,h),(.017,.015,.006),'#FBF7EC')                               # noodles
                self.ball((px+.012,py-.010,h+.004),(.009,.007,.006),'#FFFFFF');self.ball((px+.012,py-.010,h+.008),(.005,.004,.003),'#F0B429')   # half an egg
                self.bits(px-.010,py-.010,h+.004,.008,['#3F8A3C','#7DB64F'],6,41+i,.005,.4)
                self.bits(px+.002,py+.012,h+.005,.007,['#C6241D','#7A3A6A'],4,51+i,.004,.5)                # chilli and onion
            z=self.plate(.185,-.01,.030);self.bits(.185,-.01,z+.003,.02,['#3F8A3C','#7DB64F','#C6241D'],12,61,.006,.5)
        elif what in ('pak-gembus-myss','ayam-gepuk'):
            pak=what.startswith('pak')
            sambal='#D9632A' if pak else '#B3201A'                           # the cashew sambal is paler than the red one
            self.gepuk_plate(-.155,-.036,sambal,.3);self.gepuk_plate(-.060,-.040,sambal,-.4)
            # The stone mortar the chicken is smashed in, with the pestle resting in the sambal.
            h=self.bowl(.035,-.030,.040,.020,'#55565A',sambal)
            self.fried(.030,-.030,h-.002,.6,.9)
            self.cyl((.062,-.012,h),.007,.03,'#6E7075',top=.009,n=8)
            z=self.tray(.150,-.030,.11,.10,'#9A7040')                        # fried and waiting: chicken, tofu, tempe
            for i,(dx,dy,spin) in enumerate(((-.025,-.025,.2),(.025,-.022,1.2),(-.02,.022,2.0))):self.fried(.150+dx,-.030+dy,z,spin,.85)
            for i in range(3):self.box((.165+i*.012,-.012+i*.004,z),(.016,.016,.010),'#E0B052' if pak else '#C9A36A',.3*i)
            if not pak:
                self.cyl((.035,.018,T),.016,.03,'#F4EFE2',n=12,cap='#B3201A') # a tub of extra sambal
        elif what=='kopitandori':
            # Kopi on one side, tandoori on the other.
            for i,px in enumerate((-.185,-.135)):
                self.cyl((px,-.058,T),.014,.036,'#5A3620',top=.017,n=12,cap='#E7D3B1')
                self.cyl((px,-.058,T+.036),.012,.003,'#F3E6CC',n=12)
            self.cyl((-.160,.0,T),.022,.034,'#B9B9BD',top=.018,n=14)          # the long-spouted pot
            self.cyl((-.160,.0,T+.034),.010,.01,'#8C8F96',n=10)
            z=self.tray(.0,-.040,.14,.085,'#3A3A3E')
            for i,(dx,dy,spin) in enumerate(((-.042,-.012,.5),(-.005,-.016,.3),(.034,-.010,.6),(-.02,.018,.4),(.02,.02,.2))):
                x0,y0=dx,-.040+dy
                self.ball((x0,y0,z+.010),(.017,.011,.010),'#C8371F',spin)                               # drumstick
                self.ball((x0-.006,y0+.002,z+.017),(.005,.004,.002),'#5A1E12',spin)                      # char
                self.cyl((x0+math.cos(spin)*.016,y0+math.sin(spin)*.016,z+.006),.003,.012,'#F4EFE2',n=6)   # bone
            z=self.plate(.125,-.040,.038,'#E9E2D0')
            for i in range(3):
                self.ball((.125+i*.003,-.040-i*.003,z+.003+i*.004),(.030,.024,.003),'#E8C98C',.5*i)       # naan
            self.bits(.127,-.043,z+.014,.018,['#8A5A2B','#6B4420'],7,71,.004,.3)
            h=self.bowl(.195,-.005,.018,.012,'#F4EFE2','#5E9A45')                                        # mint chutney
            z=self.plate(.195,-.066,.022);self.bits(.195,-.066,z+.002,.012,['#F4EFE2','#7A3A6A','#F1D25A'],8,73,.006,.3)   # onion and lemon

def block(center, size, color):
    center, size = np.array(center), np.array(size)
    boxed(np.array([center-size/2, center+size/2]),np.eye(4),color)

# T20 keeps its front door and neighbours. Staggered glass floors and planted
# sky terraces give the narrow plot its own miniature Antilia.
antilia=Counter((-4.135,-2.11,0))
for floor in range(7):
    z=.37+floor*.119
    dx=(0,.036,-.027)[floor%3]
    antilia.box((dx,0,z),(.42,.32,.102),'#789a9c')
    antilia.box((dx-.008,0,z+.101),(.49,.36,.017),'#e9d5ad')
    for dy in (-.115,0,.115):
        antilia.box((dx-.213,dy,z),(.009,.012,.098),'#d1c2aa')
    if floor in (1,3,6):
        for dy in (-.105,.095):
            antilia.ball((dx-.184,dy,z+.138),(.035,.039,.027),'#537d47')
# Stake out the school before the civic unlock. The browser paints the staff sign.
site=Counter((3,2.13,0))
for x in (-.42,.42):
    site.box((x,0,0),(.037,.04,.27),'#756344')
site.box((0,-.023,.139),(.94,.035,.19),'#2e5160')
# A food and parcel counter beside the other market pitches.
hlr=next(shop for shop in places if shop['id']=='gerai-hlr')
hx,_,hz=hlr['point']
block((hx,-hz-.18,.002),(.83,.92,.018),(.55,.47,.37))
root=hero.objects['DESSERT']
place_group(root,np.array(root.matrix_world.translation),(hx,-hz,.012),False,True)
# Market staff use the same apron-clad town figurines as the neighbouring stalls.
for model,position in [('cook @mellxh_',(6.10,-2.985,.088)),('cook @a1r1ff',(hx,-hz+.075,.081))]:
    cook=hero.objects[model]
    place_group(cook,np.array(cook.matrix_world.translation),position,False,True)
counter=Counter((hx,-hz,.012))
z=counter.TOP
for x,y in ((-.145,-.035),(-.088,.01)):
    h=counter.plate(x,y,.027)
    for dz,r,color in ((0,.020,'#dca355'),(.007,.021,'#553728'),(.011,.021,'#6f913e'),(.014,.020,'#deb169')):
        counter.ball((x,y,h+dz),(r,r,.007),color)
for x,color in ((.001,'#e3b86a'),(.062,'#d39447')):
    h=counter.plate(x,-.04,.028)
    counter.ball((x,-.04,h+.005),(.024,.013,.007),color,.12)
h=counter.plate(-.01,.035,.029)
counter.rice(-.018,.035,h+.005)
counter.cucumber(.002,.031,h+.003)
for x in (-.185,-.14):
    counter.cyl((x,.055,z),.012,.034,'#d88c4b',cap='#edba75')
for x,y,h in ((.144,-.029,.036),(.178,.035,.040),(.137,.027,.033)):
    counter.box((x,y,z),(.059,.045,h),'#b5804f')
    counter.box((x,y,z+h),(.010,.046,.002),'#e8d8af')

# A low paved extension joins the original market at its southeast corner.
block((7.64,-3.83,.002),(2.70,1.55,.018),(.55,.47,.37))
for place in places:
    if 'pitch' not in place:continue
    x,_,z=place['point']
    root=hero.objects[place['pitch']]
    seller=hero.objects['cook @'+place['owner']]
    dessert=place['id']=='dessert'
    for group in (root,seller):
        place_group(group,np.array(root.matrix_world.translation),(x,-z,.012),place.get('reverse'),True)
    Counter((x,-z,.012),place.get('reverse')).serve(place['id'])
    if dessert:
        # Three trays of kuih lapis, cut into slices so the stripes face the aisle.
        for j,top in enumerate(((.70,.20,.31),(.21,.46,.26),(.75,.42,.10))):
            cx=x+(j-1)*.13
            block((cx,-z-.035,.126),(.106,.083,.006),(.54,.34,.19))
            for dx in (-.023,.023):
                for dy in (-.018,.018):
                    for layer in range(5):
                        color=top if layer%2==0 else (.94,.78,.55)
                        block((cx+dx,-z-.035+dy,.132+layer*.006),(.042,.032,.006),color)

data=bytearray()
doc={'asset':{'version':'2.0','generator':'Taman Pip town exporter'},'buffers':[{}],
     'bufferViews':[],'accessors':[],'materials':[],'meshes':[],'nodes':[{'mesh':0}],
     'scenes':[{'nodes':[0]}],'scene':0}
def view(blob):
    while len(data)%4:data.append(0)
    idx=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(data),'byteLength':len(blob)})
    data.extend(blob);return idx
def attribute(arr,kind,bounds=False):
    value=np.ascontiguousarray(arr,dtype='<f4')
    a={'bufferView':view(value.tobytes()),'componentType':5126,'count':len(arr),'type':kind}
    if bounds:a.update(min=value.min(axis=0).tolist(),max=value.max(axis=0).tolist())
    idx=len(doc['accessors']);doc['accessors'].append(a);return idx

primitives=[]
for photo,pieces in buffers.items():
    v=np.concatenate(pieces);print('town primitive',photo,len(v)//3)
    material={'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':1},'doubleSided':True}
    attrs={'POSITION':attribute(v[:,:3],'VEC3',True),'NORMAL':attribute(v[:,3:6],'VEC3')}
    if photo:
        img=Image.open(photos[photo]).convert('RGBA');img.thumbnail((512,256))
        png=io.BytesIO();img.save(png,format='PNG')
        ii=len(doc.setdefault('images',[]));doc['images'].append({'bufferView':view(png.getvalue()),'mimeType':'image/png'})
        ti=len(doc.setdefault('textures',[]));doc['textures'].append({'source':ii})
        material['pbrMetallicRoughness']['baseColorTexture']={'index':ti}
        material.update(alphaMode='MASK',alphaCutoff=.45)
        attrs['TEXCOORD_0']=attribute(v[:,9:],'VEC2')
    else:attrs['COLOR_0']=attribute(v[:,6:9],'VEC3')
    primitives.append({'attributes':attrs,'material':len(doc['materials'])})
    doc['materials'].append(material)
doc['meshes'].append({'primitives':primitives})
while len(data)%4:data.append(0)
doc['buffers'][0]['byteLength']=len(data)
head=json.dumps(doc,separators=(',',':')).encode()
head+=b' '*(-len(head)%4)
with out.open('wb') as f:
    f.write(struct.pack('<4sII',b'glTF',2,28+len(head)+len(data)))
    f.write(struct.pack('<I4s',len(head),b'JSON')+head)
    f.write(struct.pack('<I4s',len(data),b'BIN\0')+data)
