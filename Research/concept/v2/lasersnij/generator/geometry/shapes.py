"""Basic 2D shapes rendered as SVG path data (units: mm)."""
import math


def polyline_path(points, dx: float = 0, dy: float = 0) -> str:
    head, *tail = points
    d = f"M {head[0] + dx:.3f} {head[1] + dy:.3f} "
    d += " ".join(f"L {x + dx:.3f} {y + dy:.3f}" for x, y in tail)
    return d + " Z"


def circle_path(cx: float, cy: float, r: float) -> str:
    return (f"M {cx - r:.3f} {cy:.3f} A {r:.3f} {r:.3f} 0 1 0 {cx + r:.3f} {cy:.3f} "
            f"A {r:.3f} {r:.3f} 0 1 0 {cx - r:.3f} {cy:.3f} Z")


def slot_path(x1: float, y1: float, x2: float, y2: float, width: float) -> str:
    """Stadium-shaped slot between two centre points."""
    r = width / 2
    ang = math.atan2(y2 - y1, x2 - x1)
    nx, ny = -math.sin(ang) * r, math.cos(ang) * r
    return (f"M {x1 + nx:.3f} {y1 + ny:.3f} L {x2 + nx:.3f} {y2 + ny:.3f} "
            f"A {r:.3f} {r:.3f} 0 0 0 {x2 - nx:.3f} {y2 - ny:.3f} "
            f"L {x1 - nx:.3f} {y1 - ny:.3f} "
            f"A {r:.3f} {r:.3f} 0 0 0 {x1 + nx:.3f} {y1 + ny:.3f} Z")


def radial_slot_path(cx: float, cy: float, r_in: float, r_out: float,
                     angle_deg: float, width: float) -> str:
    a = math.radians(angle_deg)
    return slot_path(cx + r_in * math.cos(a), cy + r_in * math.sin(a),
                     cx + r_out * math.cos(a), cy + r_out * math.sin(a), width)


def square_path(cx: float, cy: float, side: float) -> str:
    h = side / 2
    return (f"M {cx - h:.3f} {cy - h:.3f} L {cx + h:.3f} {cy - h:.3f} "
            f"L {cx + h:.3f} {cy + h:.3f} L {cx - h:.3f} {cy + h:.3f} Z")
