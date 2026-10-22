"""The platter: a 4 mm MDF disc that carries the paper, bolted to the hub of motor C."""
import math

import config as cfg
from export.svg_document import SvgDocument
from geometry import shapes

BOLT_COUNT = 4


class PlatterPart:
    size = cfg.PLATTER_DIAMETER

    def draw(self, doc: SvgDocument, cx: float, cy: float) -> None:
        doc.cut(shapes.circle_path(cx, cy, cfg.PLATTER_DIAMETER / 2), "platter_outline")
        doc.cut(shapes.circle_path(cx, cy, cfg.PLATTER_CENTRE_HOLE / 2), "platter_axle")
        for k in range(BOLT_COUNT):
            angle = 2 * math.pi * k / BOLT_COUNT
            bx = cx + cfg.PLATTER_BOLT_RADIUS * math.cos(angle)
            by = cy + cfg.PLATTER_BOLT_RADIUS * math.sin(angle)
            doc.cut(shapes.circle_path(bx, by, cfg.PLATTER_BOLT_HOLE / 2), "platter_bolt")
        doc.engrave(shapes.circle_path(cx, cy, cfg.DRAW_ZONE_DIAMETER / 2), "draw_zone")
        doc.label(cx, cy + cfg.DRAW_ZONE_DIAMETER / 2 + 8, "platter - countersink the 4 bolt holes afterwards")
