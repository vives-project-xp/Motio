"""Builds all panels of the two-compartment box and solves their finger joints."""
from .finger_solver import FingerJointSolver
from .panel import Panel
from .spec import BoxSpec

HORIZONTAL, FRONT_BACK, SIDE = 3, 2, 1   # corner-cube priority


class TwoCompartmentBox:
    def __init__(self, spec: BoxSpec, axle_points: list = ()) -> None:
        """axle_points: (x, y) of the gear axles, Y measured from the front."""
        self.spec = spec
        self.panels = []
        self._bottom_section()
        self._collar()
        self._top_section(axle_points)
        FingerJointSolver(self.panels, spec.finger, spec.thickness).solve()

    def by_section(self, section: str) -> list:
        return [p for p in self.panels if p.section == section]

    # -------------------------------------------------------------- sections
    def _bottom_section(self) -> None:
        s = self.spec
        self._add("Bottom", (0, 0, 0), (s.width, s.depth, s.thickness), 2, HORIZONTAL, "bottom")
        self._walls("Lower", 0.0, s.lower_height, 0.0, "bottom")

    def _collar(self) -> None:
        s = self.spec
        z0, z1 = s.collar_z
        self._walls("Collar", z0, z1, s.collar_inset, "collar")

    def _top_section(self, axle_points: list) -> None:
        s = self.spec
        self._walls("Upper", s.lower_height, s.top_z, 0.0, "top")
        divider = self._add("Divider", (0, 0, s.divider_z), (s.width, s.depth, s.divider_z + s.thickness),
                            2, HORIZONTAL, "top")
        divider.holes.append((s.width / 2, s.depth / 2, s.cable_hole))
        lid = self._add("Lid", (0, 0, s.lid_z), (s.width, s.depth, s.top_z), 2, HORIZONTAL, "top")
        lid.holes += [(x, y, 10.5) for x, y in axle_points]

    # --------------------------------------------------------------- helpers
    def _walls(self, prefix: str, z0: float, z1: float, inset: float, section: str) -> None:
        s, t = self.spec, self.spec.thickness
        x0, x1, y0, y1 = inset, s.width - inset, inset, s.depth - inset
        self._add(f"{prefix} front", (x0, y0, z0), (x1, y0 + t, z1), 1, FRONT_BACK, section)
        self._add(f"{prefix} back", (x0, y1 - t, z0), (x1, y1, z1), 1, FRONT_BACK, section)
        self._add(f"{prefix} left", (x0, y0, z0), (x0 + t, y1, z1), 0, SIDE, section)
        self._add(f"{prefix} right", (x1 - t, y0, z0), (x1, y1, z1), 0, SIDE, section)

    def _add(self, name, lo, hi, axis, priority, section) -> Panel:
        panel = Panel(name, lo, hi, axis, priority, section)
        self.panels.append(panel)
        return panel
