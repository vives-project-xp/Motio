"""Parses the simple SVG path data this generator writes (M, L, A, Z) into contours."""
import math
import re
from dataclasses import dataclass, field

_TOKEN = re.compile(r"[MLAZ]|-?\d+(?:\.\d+)?(?:e-?\d+)?")


@dataclass
class Segment:
    end: tuple
    arc_center: tuple = None      # None = straight line
    ccw: bool = True              # arc direction in a Y-up frame


@dataclass
class Contour:
    start: tuple
    segments: list = field(default_factory=list)
    closed: bool = False

    def as_circle(self):
        """(center, radius) if this contour is two half-circle arcs, else None."""
        if len(self.segments) != 2 or not all(s.arc_center for s in self.segments):
            return None
        c0, c1 = self.segments[0].arc_center, self.segments[1].arc_center
        if math.dist(c0, c1) > 1e-6 or math.dist(self.segments[1].end, self.start) > 1e-6:
            return None
        return c0, math.dist(c0, self.start)


def parse_path(d: str, flip_height: float) -> list:
    """Contours in a Y-up frame (y' = flip_height - y), as DXF expects."""
    tokens = _TOKEN.findall(d)
    contours, current, pos, i = [], None, None, 0
    num = lambda k: float(tokens[k])
    flip = lambda x, y: (x, flip_height - y)
    while i < len(tokens):
        cmd = tokens[i]
        if cmd == "M":
            pos = flip(num(i + 1), num(i + 2))
            current = Contour(pos)
            contours.append(current)
            i += 3
        elif cmd == "L":
            pos = flip(num(i + 1), num(i + 2))
            current.segments.append(Segment(pos))
            i += 3
        elif cmd == "A":
            r, large, sweep = num(i + 1), int(num(i + 4)), int(num(i + 5))
            end = flip(num(i + 6), num(i + 7))
            ccw = sweep == 0          # SVG sweep=1 looks clockwise on screen, and still does with Y up
            current.segments.append(Segment(end, _arc_center(pos, end, r, large, ccw), ccw))
            pos = end
            i += 8
        elif cmd == "Z":
            current.closed = True
            i += 1
        else:
            raise ValueError(f"unsupported path token {cmd!r}")
    return contours


def _arc_center(p0, p1, r: float, large: int, ccw: bool) -> tuple:
    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    half = math.hypot(dx, dy) / 2
    h = math.sqrt(max(r * r - half * half, 0.0))
    nx, ny = -dy / (2 * half), dx / (2 * half)          # unit normal, left of p0 -> p1
    side = 1 if (large == 0) == ccw else -1             # small CCW arc: centre on the left
    return (mx + side * h * nx, my + side * h * ny)
