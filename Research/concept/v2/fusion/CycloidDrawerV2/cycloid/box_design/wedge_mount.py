"""Slots in the front wall for the control-panel wedge (see Hardware/Bedieningspaneel).

Each side panel of the wedge ends in a T-shaped hook. It goes flat through a horizontal slot and, after a
quarter turn, the wide head sits behind the wall. The neck turns inside a round widening of the slot (keyhole).
The slot of the cable side runs on towards the middle of the box so the cables can pass beside the neck.

Keep the numbers in sync with Hardware/Bedieningspaneel/paneel_maten.py.
"""
import math
from dataclasses import dataclass

ARC_STEPS = 12


@dataclass(frozen=True)
class WedgeMount:
    wedge_width: float = 267.5     # width of the wedge plates, the wedge is centred on the box
    side_x: tuple = (4.0, 259.5)   # outer face of each side panel, measured from the plate edge on the cable side
    side_thickness: float = 4.0
    hook_height: float = 94.0      # centre of the hook above the box floor (inside the upper front wall)
    head_width: float = 40.0
    head_play: float = 1.0         # extra slot length per side so the head passes flat
    slot_height: float = 4.3
    keyhole_diameter: float = 6.4  # the 4 x 4 mm neck turns inside this (diagonal 5.7 mm)
    cable_slot_end: float = 67.0   # the cable-side slot runs on until here, measured from the plate edge

    def box_x(self, box_width: float, plate_x: float) -> float:
        """Plate x counts from the cable side, which is the right-hand side seen from the front (Fusion +X)."""
        return (box_width + self.wedge_width) / 2 - plate_x

    def neck_positions(self, box_width: float) -> list:
        return [self.box_x(box_width, x + self.side_thickness / 2) for x in self.side_x]

    def slot_loops(self, box_width: float) -> list:
        """One closed keyhole-slot loop (u = X, v = Z) per side panel."""
        half = self.head_width / 2 + self.head_play
        loops = []
        for index, neck in enumerate(self.neck_positions(box_width)):
            x0, x1 = neck - half, neck + half
            if index == 0:
                x0 = min(x0, self.box_x(box_width, self.cable_slot_end))
            loops.append(self._keyhole_slot(x0, x1, neck))
        return loops

    def _keyhole_slot(self, x0: float, x1: float, neck: float) -> list:
        z, h, r = self.hook_height, self.slot_height / 2, self.keyhole_diameter / 2
        start = math.asin(h / r)
        bottom = self._arc(neck, z, r, math.pi + start, 2 * math.pi - start)
        top = self._arc(neck, z, r, start, math.pi - start)
        return [(x0, z - h)] + bottom + [(x1, z - h), (x1, z + h)] + top + [(x0, z + h)]

    @staticmethod
    def _arc(cx: float, cy: float, r: float, a0: float, a1: float) -> list:
        return [(cx + r * math.cos(a0 + (a1 - a0) * k / ARC_STEPS),
                 cy + r * math.sin(a0 + (a1 - a0) * k / ARC_STEPS)) for k in range(ARC_STEPS + 1)]
