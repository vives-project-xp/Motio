"""Builds all panels of the v1 box (one box + divider) and solves their finger joints."""
from .finger_solver import FingerJointSolver
from .panel import Panel
from .spec import DividedBoxSpec

HORIZONTAL, FRONT_BACK, SIDE = 3, 2, 1   # corner-cube priority
SECTION = "box"


class DividedBox:
    def __init__(self, spec: DividedBoxSpec, axle_points: list = ()) -> None:
        """axle_points: (x, y) of the gear axles, Y measured from the front."""
        self.spec = spec
        self.panels = []
        self._shell()
        self._divider()
        self._lid(axle_points)
        FingerJointSolver(self.panels, spec.finger, spec.thickness).solve()

    def _shell(self) -> None:
        s, t = self.spec, self.spec.thickness
        w, d, h = s.width, s.depth, s.height
        self._add("Bottom", (0, 0, 0), (w, d, t), 2, HORIZONTAL)
        self._add("Front", (0, 0, 0), (w, t, h), 1, FRONT_BACK)
        self._add("Back", (0, d - t, 0), (w, d, h), 1, FRONT_BACK)
        self._add("Left", (0, 0, 0), (t, d, h), 0, SIDE)
        self._add("Right", (w - t, 0, 0), (w, d, h), 0, SIDE)

    def _divider(self) -> None:
        s = self.spec
        z = s.divider_z
        divider = self._add("Divider", (0, 0, z), (s.width, s.depth, z + s.thickness), 2, HORIZONTAL)
        divider.holes.append((s.width / 2, s.depth / 2, s.cable_hole))

    def _lid(self, axle_points: list) -> None:
        s = self.spec
        lid = self._add("Lid", (0, 0, s.lid_z), (s.width, s.depth, s.height), 2, HORIZONTAL)
        lid.holes += [(x, y, 10.5) for x, y in axle_points]

    def _add(self, name, lo, hi, axis, priority) -> Panel:
        panel = Panel(name, lo, hi, axis, priority, SECTION)
        self.panels.append(panel)
        return panel
