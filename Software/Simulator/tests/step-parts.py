"""Build editable STEP solids from the same primitives as print-parts.py.

Round surfaces remain analytic; six-sided nut pockets remain hexagonal.
No STL-to-BRep conversion. Units, orientation and origin match the print export.
Install requirements-cad.txt or set MOTIO_CAD_MODULES to a package directory.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import os
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT.parents[1] / 'tmp' / 'cad-tools'
deps = Path(os.environ.get('MOTIO_CAD_MODULES', str(LOCAL)))
if deps.is_dir():
    sys.path.insert(0, str(deps))
import cadquery as cq


def rotate(solid, angles):
    for axis, angle in zip(((1, 0, 0), (0, 1, 0), (0, 0, 1)), angles):
        if angle:
            solid = solid.rotate((0, 0, 0), axis, angle)
    return solid


def box(w, length, h):
    return cq.Solid.makeBox(w, length, h).translate((-w / 2, -length / 2, -h / 2))


def cylinder(r, h, center, axis='z', angle=0, segments=None):
    if axis not in ('x', 'z'):
        raise ValueError(f'Unsupported cylinder axis: {axis}')
    if segments is not None and segments < 3:
        raise ValueError('A polygon needs at least three sides')
    if segments is not None and segments < 96:
        # The manifest radius is the circumradius, also for hexagonal pockets.
        points = [(r * math.cos(2 * math.pi * i / segments),
                   r * math.sin(2 * math.pi * i / segments)) for i in range(segments)]
        solid = cq.Workplane('XY').polyline(points).close().extrude(h).val().translate((0, 0, -h / 2))
    else:
        solid = cq.Solid.makeCylinder(r, h, cq.Vector(0, 0, -h / 2))
    if axis == 'x':
        solid = rotate(solid, (0, 90, math.degrees(angle)))
    return solid.translate(center)


def primitive(b):
    if b['shape'] == 'beam':
        a, end = b['a'], b['b']
        length = math.hypot(end['x'] - a['x'], end['y'] - a['y'])
        angle = math.degrees(math.atan2(end['y'] - a['y'], end['x'] - a['x']))
        solid = box(length, b['w'], b['h'])
        if b.get('wall'):
            t = b['wall']
            solid = solid.cut(box(length - 2 * t, b['w'] - 2 * t, b['h'] - 2 * t))
        return rotate(solid, (0, 0, angle)).translate(
            ((a['x'] + end['x']) / 2, (a['y'] + end['y']) / 2, b['z']))

    center = (b['x'], b['y'], b['z'])
    if b['shape'] == 'box':
        solid = box(b['w'], b['l'], b['h']).translate(center)
    elif b['shape'] in ('ring', 'cylinder'):
        solid = cylinder(b['r'], b['h'], center, b.get('axis', 'z'), b.get('angle', 0), b.get('segments'))
        if b.get('inner'):
            solid = solid.cut(cylinder(b['inner'], b['h'] + 2, center, b.get('axis', 'z'), b.get('angle', 0)))
    else:
        raise ValueError(f"Unsupported shape: {b['shape']}")
    # Cuts belong to each primitive BEFORE union, exactly as in print-parts.py.
    # Cutting the union instead would remove material from neighbouring pieces.
    for hole in b.get('holes', []):
        at = tuple(b[k] + hole.get(k, 0) for k in ('x', 'y', 'z'))
        solid = solid.cut(cylinder(hole['r'], hole['h'], at, hole.get('axis', 'z'),
                                   hole.get('angle', 0), hole.get('segments')))
    for slot in b.get('slots', []):
        cutter = rotate(box(slot['w'], slot['l'], slot.get('h', b['h'] + 2)),
                        (0, 0, math.degrees(slot.get('angle', 0))))
        at = (b['x'] + slot['x'], b['y'] + slot['y'], b['z'] + slot.get('z', 0))
        solid = solid.cut(cutter.translate(at))
    return solid


def part_solid(item):
    pieces = [primitive(b) for b in item['parts']]
    solid = pieces[0]
    for piece in pieces[1:]:
        solid = solid.fuse(piece)
    solid = solid.clean().translate((-item['origin']['x'], -item['origin']['y'], 0))
    solid = rotate(rotate(solid, (0, 0, math.degrees(item['angle']))), item['rotate'])
    bounds = solid.BoundingBox()
    return solid.translate((-bounds.xmin, -bounds.ymin, -bounds.zmin)).clean()


def coupons():
    coupon = cq.Solid.makeBox(150, 82, 8)
    for y, diameters in ((21, (22, 22.1, 22.2)), (60, (32, 32.1, 32.2))):
        for x, diameter in zip((25, 75, 125), diameters):
            coupon = coupon.cut(cylinder(diameter / 2, 12, (x, y, 4)))
    shaft = cylinder(9.95, 14, (0, 0, 10)).cut(cylinder(6.5, 22, (0, 0, 10)))
    flange = cylinder(12, 3, (0, 0, 1.5)).cut(cylinder(6.5, 8, (0, 0, 1.5)))
    yield 'fit-coupon', coupon.clean()
    yield 'shaft-coupon', shaft.fuse(flange).clean().translate((12, 12, 0))


def dimensions(solid):
    b = solid.BoundingBox()
    return [b.xlen, b.ylen, b.zlen]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def stl_metrics(path):
    """Read existing binary STL independently, with no mesh dependencies."""
    data = path.read_bytes()
    count, = struct.unpack_from('<I', data, 80)
    require(len(data) == 84 + count * 50, f'{path.name}: expected a binary STL')
    low, high, volume = [math.inf] * 3, [-math.inf] * 3, 0.0
    for i in range(count):
        v = struct.unpack_from('<9f', data, 84 + i * 50 + 12)
        a, b, c = v[:3], v[3:6], v[6:]
        for p in (a, b, c):
            for k in range(3):
                low[k], high[k] = min(low[k], p[k]), max(high[k], p[k])
        volume += (a[0] * (b[1] * c[2] - b[2] * c[1])
                   + a[1] * (b[2] * c[0] - b[0] * c[2])
                   + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    return [hi - lo for lo, hi in zip(low, high)], volume


def save(solid, path, compare_stl):
    require(solid.isValid() and len(solid.Solids()) == 1 and solid.Volume() > 0,
            f'{path.name}: invalid or disconnected source solid')
    cq.exporters.export(solid, str(path), exportType='STEP')  # CadQuery uses mm.
    imported = cq.importers.importStep(str(path)).val()
    require(imported.isValid() and len(imported.Solids()) == 1 and imported.Volume() > 0,
            f'{path.name}: invalid or disconnected STEP after reimport')
    dims = dimensions(imported)
    require(max(abs(a - b) for a, b in zip(dimensions(solid), dims)) < 1e-5,
            f'{path.name}: dimensions changed during STEP roundtrip')
    require(abs(imported.Volume() - solid.Volume()) < max(1e-5, solid.Volume() * 1e-8),
            f'{path.name}: volume changed during STEP roundtrip')
    face_types = {}
    for face in imported.Faces():
        kind = face.geomType()
        face_types[kind] = face_types.get(kind, 0) + 1
    result = dict(file=path.name, valid=True, solids=1, dimensions_mm=[round(d, 6) for d in dims],
                  volume_mm3=round(imported.Volume(), 6), faces=face_types,
                  sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    if compare_stl:
        stl_path = path.with_suffix('.stl')
        stl_dims, stl_volume = stl_metrics(stl_path)
        dim_error = max(abs(a - b) for a, b in zip(dims, stl_dims))
        volume_error = abs(imported.Volume() - stl_volume) / imported.Volume()
        # STL uses 96-sided approximations; STEP circles are exact. The volume
        # error can be larger for thin-walled tubes than for solid cylinders.
        require(dim_error < 0.05, f'{path.name}: STL dimensions differ by {dim_error:.6f} mm')
        require(volume_error < 0.01, f'{path.name}: STL volume differs by {volume_error:.4%}')
        result['stl_comparison'] = dict(file=stl_path.name, max_dimension_error_mm=round(dim_error, 6),
                                        relative_volume_error=round(volume_error, 8),
                                        sha256=hashlib.sha256(stl_path.read_bytes()).hexdigest())
    print(f'{path.name}: 1 valid solid; {len(imported.Faces())} CAD faces', flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pen2-only', action='store_true')
    parser.add_argument('--compare-stl', action='store_true', help='Also check existing STL dimensions and volume')
    args = parser.parse_args()
    out = ROOT / 'exports'
    report = dict(generator=f'CadQuery {cq.__version__} / OpenCascade; independent STEP reimport',
                  units='mm', native_fusion_history=False, sources={}, parts=[])
    manifests = ['print-pen2-manifest.json'] if args.pen2_only else ['print-manifest.json', 'print-pen2-manifest.json']
    for name in manifests:
        data = (out / name).read_bytes()
        report['sources'][name] = hashlib.sha256(data).hexdigest()
        for item in json.loads(data)['parts']:
            path = out / Path(item['filename']).with_suffix('.step')
            entry = save(part_solid(item), path, args.compare_stl)
            entry.update(id=item['id'], quantity=item['qty'], source=name)
            report['parts'].append(entry)
    if not args.pen2_only:
        for name, solid in coupons():
            entry = save(solid, out / f'MOTIO-V7-{name}.step', args.compare_stl)
            entry.update(id=name, quantity=1, source='step-parts.py / coupons (same dimensions as print-parts.py)')
            report['parts'].append(entry)
    name = 'step-pen2-validation.json' if args.pen2_only else 'step-validation.json'
    (out / name).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f"{len(report['parts'])} verified STEP files exported.")


if __name__ == '__main__':
    main()
