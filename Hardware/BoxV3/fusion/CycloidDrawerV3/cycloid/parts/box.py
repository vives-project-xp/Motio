"""Box: finger-jointed panels from the shared box design."""
from .. import config as cfg
from ..box_design.box_design import TwoCompartmentBox
from ..fusion import sketch_tools as st
from ..fusion.assembly_tools import frame, new_component

# Panel-local (u, v, thickness) -> world axes, per thickness axis.
# Sketch coordinates are absolute world values, so only the thickness offset is needed.
_FRAMES = {
    2: lambda p: frame((0, 0, p.lo[2]), (1, 0, 0), (0, 1, 0), (0, 0, 1)),
    1: lambda p: frame((0, p.hi[1], 0), (1, 0, 0), (0, 0, 1), (0, -1, 0)),
    0: lambda p: frame((p.lo[0], 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0)),
}


class BoxBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette

    def build(self, lid_holes: list):
        """Returns the group component holding all panels."""
        box = TwoCompartmentBox(cfg.BOX_SPEC, lid_holes)
        group = new_component(self.parent, "Box")
        for panel in box.panels:
            self._panel(group, panel)
        return group

    def _panel(self, group, panel) -> None:
        comp = new_component(group, panel.name, _FRAMES[panel.axis](panel))
        sketch = st.new_sketch(comp)
        for loop in panel.loops:
            st.polyline(sketch, loop)
        for u, v, d in panel.holes:
            st.circle(sketch, u, v, d)
        for loop in panel.cutouts:
            st.polyline(sketch, loop)
        self.palette.apply(st.extrude_sketch(comp, sketch, cfg.MATERIAL), "wood")
