"""Linkage arms: a rounded bar with M10 holes, an optional slot and a pen hole."""
from dataclasses import dataclass, field

import config as cfg
from export.svg_document import SvgDocument
from geometry import shapes


@dataclass
class ArmPart:
    name: str
    length: float
    width: float = 26.0
    holes: list[float] = field(default_factory=list)          # positions along the arm
    slot: tuple[float, float] | None = None                    # (start, end) along the arm
    pen_hole: float | None = None

    def draw(self, doc: SvgDocument, x: float, y: float) -> None:
        """(x, y) = top-left corner of the arm; the arm lies horizontally."""
        cy = y + self.width / 2
        doc.cut(shapes.slot_path(x + self.width / 2, cy, x + self.length - self.width / 2,
                                 cy, self.width), f"{self.name}_outline")
        for pos in self.holes:
            doc.cut(shapes.circle_path(x + pos, cy, cfg.M10_HOLE / 2))
        if self.slot:
            doc.cut(shapes.slot_path(x + self.slot[0], cy, x + self.slot[1], cy, cfg.M10_HOLE))
        if self.pen_hole is not None:
            doc.cut(shapes.circle_path(x + self.pen_hole, cy, cfg.PEN_HOLE / 2))
        doc.label(x + self.length / 2, y - 2, self.name, 5)


def build_arms() -> list[ArmPart]:
    end = 13.0
    pen_arm = dict(length=260.0, holes=[end + 20 * i for i in range(11)], pen_hole=245.0)
    return [
        ArmPart("dwarsarm", 330.0, holes=[end] + [45 + 20 * i for i in range(5)],
                slot=(165.0, 317.0)),
        ArmPart("penarm A", **pen_arm),
        ArmPart("penarm B", **pen_arm),
    ]
