"""Lays the finger-jointed box panels out flat on a laser sheet."""
import config as cfg
from box_design.box_design import DividedBox
from box_design.spec import DividedBoxSpec
from export.formats import new_document
from geometry import shapes

SHEET_WIDTH = 1130.0   # same width as the original box file
GAP = 6.0


class BoxSheet:
    def __init__(self, layout) -> None:
        axles = [(p.x, cfg.LID_DEPTH - p.y) for p in layout.gears]   # Y from the front
        spec = DividedBoxSpec(width=cfg.LID_WIDTH, depth=cfg.LID_DEPTH, height=cfg.BOX_HEIGHT,
                              thickness=cfg.MATERIAL, divider_bottom=cfg.BOX_DIVIDER_BOTTOM)
        self.box = DividedBox(spec, axles)

    def save(self, path: str) -> None:
        placements, height = self._pack()
        doc = new_document(path, SHEET_WIDTH, height)
        for panel, (x, y) in placements:
            self._draw(doc, panel, x, y)
        doc.save(path)

    def _pack(self):
        """Simple shelf packing, largest panels first."""
        panels = sorted(self.box.panels, key=lambda p: -p.size_uv()[1])
        placements, x, y, shelf = [], GAP, GAP, 0.0
        for p in panels:
            w, h = p.size_uv()
            if x + w > SHEET_WIDTH - GAP:
                x, y, shelf = GAP, y + shelf + GAP, 0.0
            placements.append((p, (x, y)))
            x, shelf = x + w + GAP, max(shelf, h)
        return placements, y + shelf + GAP

    @staticmethod
    def _draw(doc, panel, x: float, y: float) -> None:
        ua, va = panel.uv_axes
        u0, v0 = panel.lo[ua], panel.lo[va]
        _, h = panel.size_uv()
        to_sheet = lambda u, v: (x + u - u0, y + h - (v - v0))   # flip: top view stays readable
        for loop in panel.loops:
            doc.cut(shapes.polyline_path([to_sheet(u, v) for u, v in loop]), panel.name.replace(" ", "_"))
        for u, v, d in panel.holes:
            sx, sy = to_sheet(u, v)
            doc.cut(shapes.circle_path(sx, sy, d / 2))
        w, _ = panel.size_uv()
        label_y = y + h / 2 + (14 if panel.name in ("Lid", "Divider") else 2)
        doc.label(x + w / 2, label_y, panel.name, 5)
