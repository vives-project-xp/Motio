"""Dimensions of the two-compartment box (mm). Pure data, no CAD dependency.

Section view (Z up): four walls of one piece each, with the divider and the lid fingered into them.

    lid  ──────────────────────  top_z
    │      motor compartment    │
    divider ────────────────────  divider_z
    │   electronics compartment │
    bottom ───────────────────  z = 0
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class BoxSpec:
    width: float = 343.4          # X, outer
    depth: float = 304.3          # Y, outer
    thickness: float = 4.0
    divider_z: float = 60.0       # underside of the divider: the electronics compartment is this high
    motor_space: float = 60.0     # clear height between divider and lid (NEMA17 = 48 mm)
    finger: float = 40.0          # target finger length
    cable_hole: float = 30.0      # hole in the divider for wires

    @property
    def lid_z(self) -> float:
        return self.divider_z + self.thickness + self.motor_space

    @property
    def top_z(self) -> float:
        return self.lid_z + self.thickness
