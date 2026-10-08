"""Pen arm: rounded bar, local origin on its first hole, lying along +X."""
from .. import config as cfg
from ..fusion import sketch_tools as st
from ..fusion.assembly_tools import new_component, placement


class ArmBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette

    def build(self, name: str, pin_xy, angle: float, z: float):
        comp = new_component(self.parent, name, placement(pin_xy[0], pin_xy[1], z, angle))
        first = cfg.ARM_FIRST_HOLE
        sketch = st.new_sketch(comp)
        end = cfg.ARM_LENGTH - cfg.ARM_WIDTH / 2 - first
        st.polyline(sketch, st.stadium_points(cfg.ARM_WIDTH / 2 - first, end, 0, cfg.ARM_WIDTH))
        for i in range(cfg.ARM_HOLE_COUNT):
            st.circle(sketch, i * cfg.ARM_HOLE_PITCH, 0, cfg.M10_HOLE)
        st.circle(sketch, cfg.ARM_PEN_HOLE - first, 0, cfg.PEN_HOLE)
        body = st.extrude_sketch(comp, sketch, cfg.MATERIAL)
        self.palette.apply(body, "wood")
        return comp
