"""A laser-cut gear: tooth outline + axle hole + radial M10 slots + engravings."""
from dataclasses import dataclass, field

import config as cfg
from export.svg_document import SvgDocument
from geometry import shapes
from geometry.involute_gear import InvoluteGear


@dataclass
class RadialSlot:
    r_in: float
    r_out: float
    angle_deg: float


@dataclass
class GearPart:
    name: str
    gear: InvoluteGear
    slots: list[RadialSlot] = field(default_factory=list)
    engrave_paper_guides: bool = False
    handle_hole: bool = False

    @property
    def size(self) -> float:
        return 2 * self.gear.tip_radius

    def draw(self, doc: SvgDocument, cx: float, cy: float) -> None:
        doc.cut(shapes.polyline_path(self.gear.outline(), cx, cy), f"{self.name}_outline")
        doc.cut(shapes.circle_path(cx, cy, cfg.M10_HOLE / 2), f"{self.name}_axle")
        for s in self.slots:
            doc.cut(shapes.radial_slot_path(cx, cy, s.r_in, s.r_out, s.angle_deg, cfg.M10_HOLE))
        if self.handle_hole:
            doc.cut(shapes.circle_path(cx + cfg.HANDLE_RADIUS, cy, cfg.HANDLE_HOLE / 2), "handle")
        if self.engrave_paper_guides:
            doc.engrave(shapes.circle_path(cx, cy, cfg.PAPER_CIRCLE / 2), "paper_circle")
            doc.engrave(shapes.square_path(cx, cy, cfg.PAPER_SQUARE), "paper_square")
        doc.label(cx, cy + self._label_offset(), f"{self.name} z{self.gear.teeth}")

    def _label_offset(self) -> float:
        return 16 if not self.engrave_paper_guides else cfg.PAPER_SQUARE / 2 + 10


def build_gear_parts(layout) -> list[GearPart]:
    """Gears with their slots, based on the placed gears from the layout."""
    parts = []
    for placed in layout.gears:
        g = placed.gear
        usable = g.root_radius - cfg.M10_HOLE / 2 - 5   # 5 mm wall to the tooth root
        inner = cfg.PIN_SLOT_MIN_RADIUS
        if placed.name == "draaitafel":
            parts.append(GearPart(placed.name, g, engrave_paper_guides=True))
        elif placed.name == "slinger":
            parts.append(GearPart(placed.name, g, handle_hole=True))
        else:  # crank-pin gears: two opposite slots for more settings
            parts.append(GearPart(placed.name, g,
                                  [RadialSlot(inner, usable, 0), RadialSlot(inner, usable, 180)]))
    return parts
