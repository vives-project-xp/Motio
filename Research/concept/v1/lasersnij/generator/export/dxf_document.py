"""DXF (R12, mm) writer with the same interface as SvgDocument.

Each closed contour becomes one closed POLYLINE, full circles become CIRCLE entities.
Other arcs are written as short straight pieces (max 0.02 mm off the true curve): not every
laser program (or LibreOffice) reads polyline bulges, but all of them read lines.
Layers: CUT (red), ENGRAVE (blue), LABELS (grey text).
"""
import math
from dataclasses import dataclass, field

from .path_parser import parse_path

LAYERS = {"CUT": 1, "ENGRAVE": 5, "LABELS": 8}   # AutoCAD colour index


@dataclass
class DxfDocument:
    width: float
    height: float
    _entities: list = field(default_factory=list)

    def cut(self, d: str, ident: str = "") -> None:
        self._add_path(d, "CUT")

    def engrave(self, d: str, ident: str = "") -> None:
        self._add_path(d, "ENGRAVE")

    def label(self, x: float, y: float, text: str, size: float = 6) -> None:
        y = self.height - y
        self._entities.append(_group(0, "TEXT", 8, "LABELS", 10, x, 20, y, 30, 0.0, 40, size, 1, text,
                                     72, 1, 11, x, 21, y, 31, 0.0))

    def save(self, path: str) -> None:
        with open(path, "w", encoding="ascii", errors="replace", newline="\r\n") as fh:
            fh.write(self.render())

    def render(self) -> str:
        parts = [_group(0, "SECTION", 2, "HEADER", 9, "$ACADVER", 1, "AC1009", 9, "$INSUNITS", 70, 4,
                        9, "$EXTMIN", 10, 0.0, 20, 0.0, 30, 0.0,
                        9, "$EXTMAX", 10, self.width, 20, self.height, 30, 0.0, 0, "ENDSEC"),
                 self._tables(),
                 _group(0, "SECTION", 2, "ENTITIES"), *self._entities, _group(0, "ENDSEC", 0, "EOF")]
        return "".join(parts)

    # ----------------------------------------------------------------- helpers
    def _add_path(self, d: str, layer: str) -> None:
        for contour in parse_path(d, self.height):
            circle = contour.as_circle()
            if circle:
                (cx, cy), r = circle
                self._entities.append(_group(0, "CIRCLE", 8, layer, 10, cx, 20, cy, 30, 0.0, 40, r))
            else:
                self._entities.append(self._polyline(contour, layer))

    @staticmethod
    def _polyline(contour, layer: str) -> str:
        out = [_group(0, "POLYLINE", 8, layer, 66, 1, 10, 0.0, 20, 0.0, 30, 0.0, 70, 1 if contour.closed else 0)]
        pos = contour.start
        segments = list(contour.segments)
        last = segments[-1] if segments else None
        if contour.closed and last and not last.arc_center and math.dist(last.end, contour.start) < 1e-6:
            segments.pop()   # a straight closing line is implied by the closed flag
        for seg in segments:
            for x, y in [pos] + _arc_points(pos, seg):
                out.append(_group(0, "VERTEX", 8, layer, 10, x, 20, y, 30, 0.0))
            pos = seg.end
        if not contour.closed or not segments or math.dist(pos, contour.start) > 1e-6:
            out.append(_group(0, "VERTEX", 8, layer, 10, pos[0], 20, pos[1], 30, 0.0))
        out.append(_group(0, "SEQEND", 8, layer))
        return "".join(out)

    @staticmethod
    def _tables() -> str:
        layers = "".join(_group(0, "LAYER", 2, name, 70, 0, 62, colour, 6, "CONTINUOUS")
                         for name, colour in LAYERS.items())
        return (_group(0, "SECTION", 2, "TABLES", 0, "TABLE", 2, "LAYER", 70, len(LAYERS))
                + layers + _group(0, "ENDTAB", 0, "ENDSEC"))


CHORD_TOLERANCE = 0.02  # mm


def _arc_points(start, seg) -> list:
    """Intermediate points of an arc segment (empty for a straight line)."""
    if not seg.arc_center:
        return []
    c = seg.arc_center
    r = math.dist(c, start)
    a0 = math.atan2(start[1] - c[1], start[0] - c[0])
    a1 = math.atan2(seg.end[1] - c[1], seg.end[0] - c[0])
    sweep = (a1 - a0) % (2 * math.pi) if seg.ccw else -((a0 - a1) % (2 * math.pi))
    max_step = 2 * math.acos(max(-1.0, 1 - CHORD_TOLERANCE / r))
    n = max(2, math.ceil(abs(sweep) / max_step))
    return [(c[0] + r * math.cos(a0 + sweep * k / n), c[1] + r * math.sin(a0 + sweep * k / n))
            for k in range(1, n)]


def _group(*pairs) -> str:
    lines = []
    for code, value in zip(pairs[::2], pairs[1::2]):
        text = f"{value:.4f}" if isinstance(value, float) else str(value)
        lines.append(f"{code:>3}\n{text}\n")
    return "".join(lines)
