"""Two-compartment box: finger-jointed panels from the shared box design."""
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
_SECTIONS = {"bottom": "Box - electronics section", "top": "Box - motor section"}
_ROLE = {"bottom": "wood", "top": "wood", "collar": "gear"}


class BoxBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette

    def build(self, axle_points: list) -> None:
        box = TwoCompartmentBox(cfg.BOX_SPEC, axle_points)
        groups = {key: new_component(self.parent, name) for key, name in _SECTIONS.items()}
        groups["collar"] = new_component(groups["bottom"], "Collar (glued inside)")
        for panel in box.panels:
            self._panel(groups[panel.section], panel)

    def _panel(self, group, panel) -> None:
        comp = new_component(group, panel.name, _FRAMES[panel.axis](panel))
        sketch = st.new_sketch(comp)
        for loop in panel.loops:
            st.polyline(sketch, loop)
        for u, v, d in panel.holes:
            st.circle(sketch, u, v, d)
        body = st.extrude_sketch(comp, sketch, cfg.MATERIAL)
        self.palette.apply(body, _ROLE[panel.section])
