"""Dimensions of the two-compartment box (mm). Pure data, no CAD dependency.

Section view (Z up):

    lid  ──────────────────────  top_z
    │      motor compartment    │   upper walls
    divider (floor of the top) ─
    │ skirt │collar│     │collar│ │   <- collar slides into the skirt
    ──────── lower walls top ──
    │   electronics compartment │
    bottom ───────────────────  z = 0
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class BoxSpec:
    width: float = 358.0          # X, outer
    depth: float = 408.0          # Y, outer
    thickness: float = 4.0
    lower_height: float = 50.0    # outer height of the electronics section
    skirt: float = 10.0           # how far the collar reaches into the top section
    collar_glue: float = 10.0     # how far the collar sits inside the bottom section
    collar_gap: float = 0.3       # play per side between collar and top-section walls
    motor_space: float = 60.0     # clear height between divider and lid (NEMA17 = 48 mm)
    finger: float = 40.0          # target finger length
    cable_hole: float = 30.0      # hole in the divider for wires

    @property
    def divider_z(self) -> float:
        return self.lower_height + self.skirt

    @property
    def lid_z(self) -> float:
        return self.divider_z + self.thickness + self.motor_space

    @property
    def top_z(self) -> float:
        return self.lid_z + self.thickness

    @property
    def collar_z(self) -> tuple:
        return (self.lower_height - self.collar_glue, self.divider_z)

    @property
    def collar_inset(self) -> float:
        return self.thickness + self.collar_gap
