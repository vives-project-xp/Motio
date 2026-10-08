"""Thin helpers around the Fusion sketch/extrude API. All inputs in mm."""
import math

import adsk.core
import adsk.fusion

MM = 0.1  # Fusion's internal unit is cm


def point(x: float, y: float, z: float = 0.0) -> adsk.core.Point3D:
    return adsk.core.Point3D.create(x * MM, y * MM, z * MM)


def new_sketch(comp: adsk.fusion.Component) -> adsk.fusion.Sketch:
    sketch = comp.sketches.add(comp.xYConstructionPlane)
    sketch.isComputeDeferred = True
    return sketch


def polyline(sketch: adsk.fusion.Sketch, pts: list) -> None:
    """Closed polyline through (x, y) points in mm."""
    lines = sketch.sketchCurves.sketchLines
    first = lines.addByTwoPoints(point(*pts[0]), point(*pts[1]))
    prev = first
    for p in pts[2:]:
        prev = lines.addByTwoPoints(prev.endSketchPoint, point(*p))
    lines.addByTwoPoints(prev.endSketchPoint, first.startSketchPoint)


def circle(sketch: adsk.fusion.Sketch, x: float, y: float, d: float) -> None:
    sketch.sketchCurves.sketchCircles.addByCenterRadius(point(x, y), d / 2 * MM)


def rectangle(sketch: adsk.fusion.Sketch, x0: float, y0: float, x1: float, y1: float) -> None:
    sketch.sketchCurves.sketchLines.addTwoPointRectangle(point(x0, y0), point(x1, y1))


def hexagon(sketch: adsk.fusion.Sketch, across_flats: float) -> None:
    r = across_flats / math.sqrt(3)
    polyline(sketch, [(r * math.cos(math.pi / 3 * i), r * math.sin(math.pi / 3 * i)) for i in range(6)])


def stadium_points(x0: float, x1: float, y: float, width: float, steps: int = 12) -> list:
    """Slot / rounded bar from centre (x0, y) to (x1, y)."""
    r = width / 2
    pts = [(x1 + r * math.cos(-math.pi / 2 + math.pi * k / steps),
            y + r * math.sin(-math.pi / 2 + math.pi * k / steps)) for k in range(steps + 1)]
    pts += [(x0 + r * math.cos(math.pi / 2 + math.pi * k / steps),
             y + r * math.sin(math.pi / 2 + math.pi * k / steps)) for k in range(steps + 1)]
    return pts


def rotate_points(pts: list, angle: float) -> list:
    c, s = math.cos(angle), math.sin(angle)
    return [(x * c - y * s, x * s + y * c) for x, y in pts]


def largest_profile(sketch: adsk.fusion.Sketch) -> adsk.fusion.Profile:
    sketch.isComputeDeferred = False
    best, best_area = None, -1.0
    for i in range(sketch.profiles.count):
        prof = sketch.profiles.item(i)
        area = prof.areaProperties(adsk.fusion.CalculationAccuracy.LowCalculationAccuracy).area
        if area > best_area:
            best, best_area = prof, area
    return best


def extrude(comp: adsk.fusion.Component, profile, height: float,
            operation=adsk.fusion.FeatureOperations.NewBodyFeatureOperation):
    dist = adsk.core.ValueInput.createByReal(height * MM)
    return comp.features.extrudeFeatures.addSimple(profile, dist, operation)


def extrude_sketch(comp: adsk.fusion.Component, sketch: adsk.fusion.Sketch, height: float):
    """Extrude the largest region of a sketch (outline minus its holes) as a new body."""
    feature = extrude(comp, largest_profile(sketch), height)
    return feature.bodies.item(0)
