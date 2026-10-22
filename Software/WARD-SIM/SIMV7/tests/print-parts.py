"""Generate unioned, watertight PLA STLs from the simulator's primitive manifest.

Install requirements-print.txt in a venv, or set MOTIO_PYTHON_MODULES to a local
package folder. No OpenSCAD installation or manual CAD reconstruction is needed.
"""
from pathlib import Path
import json, math, os, sys

root = Path(__file__).resolve().parents[1]
local = root.parents[2] / 'tmp' / 'simv7-tools'
deps = os.environ.get('MOTIO_PYTHON_MODULES', str(local))
if Path(deps).is_dir():
    sys.path.insert(0, deps)
import manifold3d as md
import numpy as np
import trimesh

out = root / 'exports'
manifest = json.loads((out / 'print-manifest.json').read_text(encoding='utf-8'))
SEGMENTS = 96

def cylinder(r, h, center, axis='z', angle=0, segments=SEGMENTS):
    solid = md.Manifold.cylinder(h, r, circular_segments=segments, center=True)
    if axis == 'x':
        solid = solid.rotate((0, 90, math.degrees(angle)))
    return solid.translate(center)

def primitive(b):
    if b['shape'] == 'beam':
        a, c = b['a'], b['b']
        length = math.hypot(c['x']-a['x'], c['y']-a['y'])
        angle = math.degrees(math.atan2(c['y']-a['y'], c['x']-a['x']))
        solid = md.Manifold.cube((length, b['w'], b['h']), center=True)
        if b.get('wall'):
            t = b['wall']
            solid -= md.Manifold.cube((length-2*t, b['w']-2*t, b['h']-2*t), center=True)
        return solid.rotate((0, 0, angle)).translate(((a['x']+c['x'])/2, (a['y']+c['y'])/2, b['z']))
    center = (b['x'], b['y'], b['z'])
    if b['shape'] == 'box':
        solid = md.Manifold.cube((b['w'], b['l'], b['h']), center=True).translate(center)
    else:
        solid = cylinder(b['r'], b['h'], center, b.get('axis','z'), b.get('angle',0), b.get('segments',SEGMENTS))
        if b.get('inner'):
            solid -= cylinder(b['inner'], b['h']+2, center, b.get('axis','z'), b.get('angle',0))
    for hole in b.get('holes', []):
        at = (b['x']+hole.get('x',0), b['y']+hole.get('y',0), b['z']+hole.get('z',0))
        solid -= cylinder(hole['r'], hole['h'], at, hole.get('axis','z'), hole.get('angle',0), hole.get('segments',SEGMENTS))
    for slot in b.get('slots', []):
        height = slot.get('h', b['h']+2)
        cutter = md.Manifold.cube((slot['w'],slot['l'],height), center=True)
        cutter = cutter.rotate((0,0,math.degrees(slot.get('angle',0))))
        solid -= cutter.translate((b['x']+slot['x'],b['y']+slot['y'],b['z']+slot.get('z',0)))
    return solid

def save(solid, filename):
    assert str(solid.status()).endswith('NoError'), (filename, solid.status())
    shells = solid.decompose()
    assert sum(p.volume() > 0 for p in shells) == 1, (filename, 'Disconnected solid', [p.volume() for p in shells])
    mesh_data = solid.to_mesh()
    mesh = trimesh.Trimesh(vertices=mesh_data.vert_properties[:,:3], faces=mesh_data.tri_verts, process=True)
    mesh.apply_translation((-mesh.bounds[0,0],-mesh.bounds[0,1],-mesh.bounds[0,2]))
    assert mesh.is_watertight and mesh.is_winding_consistent and mesh.volume > 0, filename
    path = out / filename
    mesh.export(path, file_type='stl')
    # STL loses indexed topology: independently reimport and check the actual file.
    check = trimesh.load(path, force='mesh', process=True)
    assert check.is_watertight and check.is_winding_consistent and check.volume > 0, filename
    # A capped hollow tube has one positive outer shell and a negative cavity
    # shell. The material is connected; the enclosed air is not a second part.
    imported_shells = check.split()
    assert sum(p.volume > 0 for p in imported_shells) == 1, (filename, 'Disconnected material')
    return dict(file=filename,watertight=True,connected=True,cavity_shells=int(sum(p.volume < 0 for p in imported_shells)),triangles=len(check.faces),
                dimensions_mm=np.round(check.extents,3).tolist(),volume_mm3=round(check.volume,2))

report=[]
for item in manifest['parts']:
    solids = [primitive(b) for b in item['parts']]
    solid = solids[0]
    for piece in solids[1:]:
        solid += piece
    solid = solid.translate((-item['origin']['x'],-item['origin']['y'],0))
    solid = solid.rotate((0,0,math.degrees(item['angle']))).rotate(item['rotate'])
    entry = save(solid, item['filename'])
    entry.update(id=item['id'],quantity=item['qty'])
    report.append(entry)
    print(item['filename']+' · '+str(entry['triangles'])+' triangles · watertight')

# A real fit coupon is cheaper than reprinting long arms after a tolerance mismatch.
coupon = md.Manifold.cube((150,82,8))
for y,diameters in [(21,[22,22.1,22.2]),(60,[32,32.1,32.2])]:
    for x,diameter in zip([25,75,125],diameters):
        coupon -= cylinder(diameter/2,12,(x,y,4))
report.append(save(coupon,'MOTIO-V7-fit-coupon.stl'))
shaft = cylinder(9.95,14,(0,0,10))-cylinder(6.5,22,(0,0,10))
shaft += cylinder(12,3,(0,0,1.5))-cylinder(6.5,8,(0,0,1.5))
report.append(save(shaft,'MOTIO-V7-shaft-coupon.stl'))
(out/'print-validation.json').write_text(json.dumps({'generator':'manifold3d + independent STL reimport with trimesh','parts':report},indent=2),encoding='utf-8')
print(str(len(report))+' verified STL files exported.')
