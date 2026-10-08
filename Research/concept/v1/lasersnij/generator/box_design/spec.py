"""Dimensions of the v1 box (mm): one box with a horizontal divider. No CAD dependency.

Section view (Z up):

    lid  ──────────────────────  height
    │      motor compartment    │
    divider ─────────────────── divider_z (middle by default)
    │   electronics compartment │
    bottom ───────────────────  z = 0

All panels interlock with finger joints; the divider's tabs go through slots in the walls.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class DividedBoxSpec:
    width: float = 358.0          # X, outer
    depth: float = 408.0          # Y, outer
    height: float = 108.0         # Z, outer
    thickness: float = 4.0
    divider_bottom: Optional[float] = None   # None = divider centred in the inside height
    finger: float = 40.0          # target finger length
    cable_hole: float = 30.0      # hole in the divider for wires

    @property
    def divider_z(self) -> float:
        if self.divider_bottom is not None:
            return self.divider_bottom
        inside_mid = self.height / 2
        return inside_mid - self.thickness / 2

    @property
    def lid_z(self) -> float:
        return self.height - self.thickness

    @property
    def lower_space(self) -> float:
        return self.divider_z - self.thickness

    @property
    def upper_space(self) -> float:
        return self.lid_z - (self.divider_z + self.thickness)
