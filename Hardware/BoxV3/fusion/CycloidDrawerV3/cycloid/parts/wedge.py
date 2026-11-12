"""Control-panel wedge ('houder') on the front of the box, built from the flat parts of Hardware/Bedieningspaneel."""
from .. import config as cfg
from ..box_design.wedge_placement import WedgePlacement, load_wedge_parts
from ..fusion import sketch_tools as st
from ..fusion.assembly_tools import frame, new_component


class WedgeBuilder:
    def __init__(self, parent, palette) -> None:
        self.parent = parent
        self.palette = palette

    def build(self):
        """Returns the group component holding all wedge parts."""
        parts, wedge_width, floor_offset = load_wedge_parts()
        placement = WedgePlacement(cfg.BOX_WIDTH, wedge_width, floor_offset)
        group = new_component(self.parent, "Control panel wedge")
        for number, (part, place) in enumerate(parts, 1):
            self._part(group, f"{part.naam} {number}", part, placement.axes(place, part.dikte))
        return group

    def _part(self, group, name: str, part, axes: tuple) -> None:
        comp = new_component(group, name, frame(*axes))
        sketch = st.new_sketch(comp)
        for loop in part.geefVormen():
            st.polyline(sketch, loop)
        body = st.extrude_sketch(comp, sketch, part.dikte)
        self.palette.apply(body, part.materiaal)
