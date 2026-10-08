"""Adds axle holes and gear outlines (engraved) to the top panel of the existing box SVG."""
import config as cfg
from export.svg_document import CUT, ENGRAVE
from geometry import shapes


class LidPatcher:
    def __init__(self, layout) -> None:
        self.layout = layout

    def patch(self, box_svg: str) -> str:
        ox, oy = cfg.LID_ORIGIN_IN_BOX_SVG
        extra = []
        for p in self.layout.gears:
            x, y = ox + p.x, oy + p.y
            extra.append(self._path(shapes.circle_path(x, y, cfg.M10_HOLE / 2), CUT, f"lid_axle_{p.name}"))
            extra.append(self._path(shapes.circle_path(x, y, p.gear.pitch_radius), ENGRAVE,
                                    f"lid_mark_{p.name}"))
        return box_svg.replace("</g></svg>", "\n".join(extra) + "</g></svg>")

    @staticmethod
    def _path(d: str, colour: str, ident: str) -> str:
        return (f'<path id="{ident}" d="{d}" fill="none" stroke="{colour}" stroke-width="0.1" '
                f'style="stroke:{colour};stroke-width:0.1" vector-effect="non-scaling-stroke"/>')
