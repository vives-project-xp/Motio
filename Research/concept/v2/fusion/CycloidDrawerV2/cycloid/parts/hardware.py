"""Simplified fasteners and round parts (bolts, nuts, washers, sleeves, paper, pen)."""
import math

import adsk.fusion

from .. import config as cfg
from ..fusion import sketch_tools as st
from ..fusion.assembly_tools import new_component, placement

STANDARD_LENGTHS = [16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80]


def standard_length(needed: float) -> int:
    return next((l for l in STANDARD_LENGTHS if l >= needed - 0.5), math.ceil(needed))


class HardwareBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette
        self.bill = {}  # description -> count, reported at the end

    # --- fasteners -----------------------------------------------------------
    def bolt(self, xy, head_bottom_z: float, shank_top_z: float, size: str = "M10") -> None:
        """Head below, shank pointing up to `shank_top_z`."""
        d, af, hh = (10.0, cfg.HEAD_M10_AF, cfg.HEAD_M10_H) if size == "M10" else (6.0, 10.0, 4.0)
        length = standard_length(shank_top_z - (head_bottom_z + hh))
        name = f"Bolt {size}x{length}"
        comp = new_component(self.parent, name, placement(xy[0], xy[1], head_bottom_z))
        head = st.new_sketch(comp)
        st.hexagon(head, af)
        body = st.extrude_sketch(comp, head, hh)
        shank = st.new_sketch(comp)
        st.circle(shank, 0, 0, d)
        st.extrude(comp, st.largest_profile(shank), hh + length,
                   adsk.fusion.FeatureOperations.JoinFeatureOperation)
        self.palette.apply(body, "steel")
        self._count(name)

    def nut(self, xy, z: float, size: str = "M10") -> None:
        af, h, hole = (cfg.NUT_M10_AF, cfg.NUT_M10_H, 10.0) if size == "M10" else (10.0, 5.0, 6.0)
        comp = new_component(self.parent, f"Nut {size}", placement(xy[0], xy[1], z))
        sketch = st.new_sketch(comp)
        st.hexagon(sketch, af)
        st.circle(sketch, 0, 0, hole)
        self.palette.apply(st.extrude_sketch(comp, sketch, h), "steel")
        self._count(f"Nut {size}")

    # --- round parts -----------------------------------------------------------
    def ring(self, name: str, xy, z: float, outer: float, inner: float, height: float, role: str) -> None:
        comp = new_component(self.parent, name, placement(xy[0], xy[1], z))
        sketch = st.new_sketch(comp)
        st.circle(sketch, 0, 0, outer)
        if inner:
            st.circle(sketch, 0, 0, inner)
        self.palette.apply(st.extrude_sketch(comp, sketch, height), role)
        self._count(name)

    def ptfe_washer(self, xy, z: float) -> None:
        self.ring("PTFE washer M10", xy, z, cfg.WASHER_PTFE_D, 10.5, cfg.WASHER_PTFE_T, "ptfe")

    def spacer(self, xy, z_from: float, z_to: float) -> None:
        if z_to - z_from > 0.1:
            self.ring(f"Spacer M10 {z_to - z_from:.1f} mm", xy, z_from, cfg.SPACER_D, 10.5,
                      z_to - z_from, "steel")

    def _count(self, name: str) -> None:
        self.bill[name] = self.bill.get(name, 0) + 1
