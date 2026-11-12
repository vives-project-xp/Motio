"""Round and rectangular solids: motor parts, hubs, bushings, paper and pen."""
from .. import config as cfg
from ..fusion import sketch_tools as st
from ..fusion.assembly_tools import new_component, new_occurrence, placement


class SolidBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette

    def ring(self, name: str, xy, z: float, outer: float, inner: float, height: float, role: str):
        occ = new_occurrence(self.parent, name, placement(xy[0], xy[1], z))
        sketch = st.new_sketch(occ.component)
        st.circle(sketch, 0, 0, outer)
        if inner:
            st.circle(sketch, 0, 0, inner)
        self.palette.apply(st.extrude_sketch(occ.component, sketch, height), role)
        return occ

    def block(self, name: str, xy, z: float, width: float, height: float, role: str):
        comp = new_component(self.parent, name, placement(xy[0], xy[1], z))
        sketch = st.new_sketch(comp)
        half = width / 2
        st.polyline(sketch, [(-half, -half), (half, -half), (half, half), (-half, half)])
        self.palette.apply(st.extrude_sketch(comp, sketch, height), role)
        return comp
