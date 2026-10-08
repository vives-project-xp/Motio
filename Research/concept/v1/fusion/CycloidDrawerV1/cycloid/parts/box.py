"""v1 box: one finger-jointed box with a horizontal divider."""
from .. import config as cfg
from ..box_design.box_design import DividedBox
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

    def build(self, axle_points: list):
        """Returns (box group component, {panel name: panel component})."""
        box = DividedBox(cfg.BOX_SPEC, axle_points)
        group = new_component(self.parent, "Box")
        panels = {panel.name: self._panel(group, panel) for panel in box.panels}
        return group, panels

    def _panel(self, group, panel):
        comp = new_component(group, panel.name, _FRAMES[panel.axis](panel))
        sketch = st.new_sketch(comp)
        for loop in panel.loops:
            st.polyline(sketch, loop)
        for u, v, d in panel.holes:
            st.circle(sketch, u, v, d)
        body = st.extrude_sketch(comp, sketch, cfg.MATERIAL)
        self.palette.apply(body, "wood")
        return comp
