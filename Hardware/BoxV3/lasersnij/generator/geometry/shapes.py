"""Basic 2D shapes rendered as SVG path data (units: mm)."""


def polyline_path(points, dx: float = 0, dy: float = 0) -> str:
    head, *tail = points
    d = f"M {head[0] + dx:.3f} {head[1] + dy:.3f} "
    d += " ".join(f"L {x + dx:.3f} {y + dy:.3f}" for x, y in tail)
    return d + " Z"


def circle_path(cx: float, cy: float, r: float) -> str:
    return (f"M {cx - r:.3f} {cy:.3f} A {r:.3f} {r:.3f} 0 1 0 {cx + r:.3f} {cy:.3f} "
            f"A {r:.3f} {r:.3f} 0 1 0 {cx - r:.3f} {cy:.3f} Z")
