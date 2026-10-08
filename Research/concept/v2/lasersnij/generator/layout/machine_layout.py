"""Places the gears on the lid and checks that everything fits."""
import math
from dataclasses import dataclass

import config as cfg
from geometry.involute_gear import InvoluteGear


@dataclass(frozen=True)
class PlacedGear:
    name: str
    gear: InvoluteGear
    x: float
    y: float


class MachineLayout:
    def __init__(self) -> None:
        m = cfg.MODULE
        self.turntable = InvoluteGear(cfg.TURNTABLE_TEETH, m)
        cx, cy = cfg.TURNTABLE_CENTRE
        self.gears = [
            PlacedGear("draaitafel", self.turntable, cx, cy),
            self._mesh("links", InvoluteGear(cfg.LEFT_TEETH, m), -cfg.SIDE_GEAR_DX, up=True),
            self._mesh("rechts", InvoluteGear(cfg.RIGHT_TEETH, m), cfg.SIDE_GEAR_DX, up=True),
            self._mesh("slinger", InvoluteGear(cfg.CRANK_TEETH, m), cfg.CRANK_DX, up=False),
        ]

    def _mesh(self, name: str, gear: InvoluteGear, dx: float, up: bool) -> PlacedGear:
        cx, cy = cfg.TURNTABLE_CENTRE
        dist = self.turntable.center_distance(gear)
        dy = math.sqrt(dist ** 2 - dx ** 2)
        return PlacedGear(name, gear, cx + dx, cy - dy if up else cy + dy)

    def validate(self) -> list[str]:
        """Return a list of problems (empty = OK)."""
        problems = []
        lo, hi_x, hi_y = cfg.LID_EDGE_MARGIN, cfg.LID_WIDTH - cfg.LID_EDGE_MARGIN, cfg.LID_DEPTH - cfg.LID_EDGE_MARGIN
        for p in self.gears:
            r = p.gear.tip_radius
            if p.x - r < lo or p.y - r < lo or p.x + r > hi_x or p.y + r > hi_y:
                problems.append(f"{p.name} sticks out over the lid edge")
        for i, a in enumerate(self.gears[1:], 1):
            for b in self.gears[i + 1:]:
                if math.dist((a.x, a.y), (b.x, b.y)) < a.gear.tip_radius + b.gear.tip_radius + 3:
                    problems.append(f"{a.name} hits {b.name}")
        return problems
