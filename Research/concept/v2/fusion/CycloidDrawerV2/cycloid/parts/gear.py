"""Gear bodies: a root-circle disc with holes, one involute tooth, circular pattern."""
import adsk.core
import adsk.fusion

from .. import config as cfg
from ..fusion import sketch_tools as st
from ..fusion.assembly_tools import new_component, placement


class GearFeatures:
    """What gets cut into the gear disc besides the axle hole."""

    def __init__(self, pin_slots: bool = False, handle_hole: bool = False) -> None:
        self.pin_slots = pin_slots
        self.handle_hole = handle_hole


class GearBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette

    def build(self, name: str, gear, xy, rotation: float, features: GearFeatures):
        comp = new_component(self.parent, name, placement(xy[0], xy[1], cfg.GEAR_Z, rotation))
        body = self._disc(comp, gear, features)
        self._teeth(comp, gear)
        self.palette.apply(body, "gear")
        return comp

    def _disc(self, comp, gear, features: GearFeatures):
        sketch = st.new_sketch(comp)
        st.circle(sketch, 0, 0, 2 * gear.root_radius)
        st.circle(sketch, 0, 0, cfg.M10_HOLE)
        if features.pin_slots:
            outer = gear.root_radius - cfg.M10_HOLE / 2 - 5
            slot = st.stadium_points(cfg.PIN_SLOT_MIN_RADIUS, outer, 0, cfg.M10_HOLE)
            st.polyline(sketch, slot)
            st.polyline(sketch, st.rotate_points(slot, 3.141592653589793))
        if features.handle_hole:
            st.circle(sketch, cfg.HANDLE_RADIUS, 0, cfg.HANDLE_HOLE)
        return st.extrude_sketch(comp, sketch, cfg.MATERIAL)

    @staticmethod
    def _teeth(comp, gear) -> None:
        sketch = st.new_sketch(comp)
        st.polyline(sketch, gear.tooth_outline())
        tooth = st.extrude(comp, st.largest_profile(sketch), cfg.MATERIAL,
                           adsk.fusion.FeatureOperations.JoinFeatureOperation)
        entities = adsk.core.ObjectCollection.create()
        entities.add(tooth)
        patterns = comp.features.circularPatternFeatures
        pattern_input = patterns.createInput(entities, comp.zConstructionAxis)
        pattern_input.quantity = adsk.core.ValueInput.createByReal(gear.teeth)
        pattern_input.totalAngle = adsk.core.ValueInput.createByString("360 deg")
        pattern_input.isSymmetric = False
        patterns.add(pattern_input)
