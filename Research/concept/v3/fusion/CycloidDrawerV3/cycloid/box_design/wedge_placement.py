"""Where the control-panel wedge (Hardware/Bedieningspaneel) stands on the box. Pure maths, no CAD dependency.

The wedge has its own axes: X = width (counting from the cable side), Y = depth (0 = the vertical edge, the
front of the wedge is positive), Z = height (0 = top of its bottom plate). It stands against the front wall
of the box, turned 180 degrees about the vertical axis, centred on the box and on the same floor.
"""
import importlib
import math
import sys
from pathlib import Path

WEDGE_DIR = Path(__file__).resolve().parents[7] / "Hardware" / "Bedieningspaneel"


def load_wedge_parts() -> tuple:
    """Returns (parts, wedge_width, floor_offset); parts = [(flat part, place)] straight from the wedge generator."""
    _forget_cached_modules()
    sys.path.insert(0, str(WEDGE_DIR))
    try:
        maten = importlib.import_module("paneel_maten")
        montage = importlib.import_module("montage")
    finally:
        sys.path.remove(str(WEDGE_DIR))
    return montage.maakOpstelling(), maten.PLAAT_BREEDTE, maten.MDF_DIKTE


def _forget_cached_modules() -> None:
    """Fusion keeps modules between runs: drop the wedge modules so edits are picked up."""
    for name in [n for n, m in sys.modules.items() if str(WEDGE_DIR) in str(getattr(m, "__file__", "") or "")]:
        del sys.modules[name]


class WedgePlacement:
    def __init__(self, box_width: float, wedge_width: float, floor_offset: float) -> None:
        """floor_offset: thickness of the wedge's bottom plate, which stands on the floor level of the box."""
        self.shift_x = (box_width + wedge_width) / 2
        self.floor_offset = floor_offset

    def case_point(self, p: tuple) -> tuple:
        return (self.shift_x - p[0], -p[1], p[2] + self.floor_offset)

    def axes(self, place, thickness: float) -> tuple:
        """Origin and unit axes (u, v, w) of a flat part in box coordinates; u x v = w, the part extrudes along w."""
        at = lambda point, layer: self.case_point(place(point, layer))
        origin = at((0.0, 0.0), 0.0)
        u, v = _unit(_minus(at((1.0, 0.0), 0.0), origin)), _unit(_minus(at((0.0, 1.0), 0.0), origin))
        w = _unit(_minus(at((0.0, 0.0), 1.0), origin))
        if _dot(_cross(u, v), w) > 0:
            return origin, u, v, w
        return at((0.0, 0.0), thickness), u, v, tuple(-c for c in w)


def _minus(a: tuple, b: tuple) -> tuple:
    return tuple(x - y for x, y in zip(a, b))


def _unit(a: tuple) -> tuple:
    length = math.sqrt(sum(c * c for c in a))
    return tuple(c / length for c in a)


def _dot(a: tuple, b: tuple) -> float:
    return sum(x * y for x, y in zip(a, b))


def _cross(a: tuple, b: tuple) -> tuple:
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
