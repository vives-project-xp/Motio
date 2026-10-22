"""Writes the paths of an SvgDocument as a DXF (mm): cut lines on layer CUT, engraving on layer ENGRAVE.

Only the two path shapes of geometry/shapes.py occur: closed polylines (M L ... Z) and full circles (M A A Z).
"""
import re

from export.svg_document import CUT, SvgDocument

LAYERS = {CUT: "CUT"}
DEFAULT_LAYER = "ENGRAVE"
NUMBER = re.compile(r"-?\d+(?:\.\d+)?")


def _numbers(d: str) -> list[float]:
    return [float(n) for n in NUMBER.findall(d)]


def _circle(layer: str, d: str) -> list[str]:
    """Path 'M x1 y A r r 0 1 0 x2 y A ...': the two end points lie on a horizontal diameter."""
    x1, y, radius, _, _, _, _, x2 = _numbers(d)[:8]
    return ["0", "CIRCLE", "8", layer, "10", f"{(x1 + x2) / 2:.3f}", "20", f"{-y:.3f}", "30", "0", "40", f"{radius:.3f}"]


def _polyline(layer: str, d: str) -> list[str]:
    values = _numbers(d)
    points = list(zip(values[0::2], values[1::2]))
    out = ["0", "LWPOLYLINE", "8", layer, "90", str(len(points)), "70", "1"]
    for x, y in points:
        out += ["10", f"{x:.3f}", "20", f"{-y:.3f}"]   # DXF has y pointing up
    return out


def render(doc: SvgDocument) -> str:
    out = ["0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"]
    for colour, d in doc.paths:
        layer = LAYERS.get(colour, DEFAULT_LAYER)
        out += _circle(layer, d) if " A " in d else _polyline(layer, d)
    return "\r\n".join(out + ["0", "ENDSEC", "0", "EOF"]) + "\r\n"


def save(doc: SvgDocument, path: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(render(doc))
