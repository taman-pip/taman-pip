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
    if obj.name.startswith(('ep2 photo','ep2 speech','tree proto','trunk ring','flower leaf','terrace window grille','name tag','ep2 banner','boom arm')):continue   # boom arms are animated in the explorer
    if inst.is_instance and any(c.name=='Stall - AIR BALANG' for c in obj.original.users_collection):
        # Serve drinks into the north aisle; the original chicken stall backs onto this tent.
        world=world.copy()
        world[:2,3]=2*np.array([5.48,-2.32])-world[:2,3]
        world[:2,:3]*=-1
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
    if 6.16 < x < 9.28 and -4.93 < y < -2.98:continue  # aisle and approach beside the pond
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
def place_group(parent, origin, destination, reverse=False, dessert=False):
    # Apply the same stage-to-town transform to a stall and its cook.
    direction = -1 if reverse else 1
    rotation = np.diag([direction, direction, 1])
    for obj in parent.children_recursive:
        if obj.type not in ('MESH','CURVE','FONT') or obj.hide_render:continue
        if dessert and obj.name.startswith(('pot.', 'prepared food.')):continue
        evaluated=obj.evaluated_get(dg)
        matrix=np.array(evaluated.matrix_world)
        matrix[:3,3]=rotation@(matrix[:3,3]-origin)+destination
        matrix[:3,:3]=rotation@matrix[:3,:3]
        mesh_arrays(evaluated,matrix)

for name,destination in [('Ramly burger pitch',(6.02,-2.94,.020)),
                         ('CHINESE FRIED RICE',(4.94,-2.85,.020)),
                         ('fried rice seller',(4.94,-2.737,.077))]:
    parent=hero.objects[name]
    place_group(parent,np.array(parent.matrix_world.translation),destination)

def block(center, size, color):
    center, size = np.array(center), np.array(size)
    boxed(np.array([center-size/2, center+size/2]),np.eye(4),color)

# A low paved extension joins the original market at its southeast corner.
block((7.64,-3.83,.002),(2.70,1.55,.018),(.55,.47,.37))
for place in places:
    if 'pitch' not in place:continue
    x,_,z=place['point']
    root=hero.objects[place['pitch']]
    seller=hero.objects['cook @'+place['owner']]
    dessert=place['id']=='dessert'
    for group in (root,seller):
        place_group(group,np.array(root.matrix_world.translation),(x,-z,.012),place.get('reverse'),dessert)
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
