"""Crank and arm: rounded bars, local origin on the pivot, lying along +X."""
from .. import config as cfg
from ..fusion import sketch_tools as st
from ..fusion.assembly_tools import new_occurrence, placement


class BarBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette

    def build(self, name: str, pivot_xy, angle: float, z: float, length: float, width: float, height: float,
              holes: tuple = ()):
        """A bar from the pivot over `length` (centre to centre of its two ends), `height` thick from z up.

        `holes` are (distance from the pivot, diameter) pairs; the animation joints turn about them.
        """
        occ = new_occurrence(self.parent, name, placement(pivot_xy[0], pivot_xy[1], z, angle))
        sketch = st.new_sketch(occ.component)
        st.polyline(sketch, st.stadium_points(0, length, 0, width))
        for distance, diameter in holes:
            st.circle(sketch, distance, 0, diameter)
        self.palette.apply(st.extrude_sketch(occ.component, sketch, height), "pla")
        return occ
