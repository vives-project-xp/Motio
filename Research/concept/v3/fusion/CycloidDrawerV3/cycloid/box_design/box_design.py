"""Builds all panels of the two-compartment box and solves their finger joints."""
from .finger_solver import FingerJointSolver
from .panel import Panel
from .spec import BoxSpec
from .wedge_mount import WedgeMount

HORIZONTAL, FRONT_BACK, SIDE = 3, 2, 1   # corner-cube priority


class TwoCompartmentBox:
    def __init__(self, spec: BoxSpec, lid_holes: list = ()) -> None:
        """lid_holes: (x, y, diameter) of the motor holes in the lid, Y measured from the front."""
        self.spec = spec
        self.panels = []
        self._plates(lid_holes)
        self._walls()
        self._wedge_slots()
        FingerJointSolver(self.panels, spec.finger, spec.thickness).solve()

    # ---------------------------------------------------------------- panels
    def _plates(self, lid_holes: list) -> None:
        s = self.spec
        self._add("Bottom", (0, 0, 0), (s.width, s.depth, s.thickness), 2, HORIZONTAL)
        divider = self._add("Divider", (0, 0, s.divider_z), (s.width, s.depth, s.divider_z + s.thickness),
                            2, HORIZONTAL)
        divider.holes.append((s.width / 2, s.depth / 2, s.cable_hole))
        lid = self._add("Lid", (0, 0, s.lid_z), (s.width, s.depth, s.top_z), 2, HORIZONTAL)
        lid.holes += list(lid_holes)

    def _walls(self) -> None:
        """Four walls over the full height, each in one piece."""
        s, t = self.spec, self.spec.thickness
        self._add("Front", (0, 0, 0), (s.width, t, s.top_z), 1, FRONT_BACK)
        self._add("Back", (0, s.depth - t, 0), (s.width, s.depth, s.top_z), 1, FRONT_BACK)
        self._add("Left", (0, 0, 0), (t, s.depth, s.top_z), 0, SIDE)
        self._add("Right", (s.width - t, 0, 0), (s.width, s.depth, s.top_z), 0, SIDE)

    def _wedge_slots(self) -> None:
        """Keyhole slots for the control-panel wedge, in the front wall (above the divider, clear of the lid)."""
        front = next(p for p in self.panels if p.name == "Front")
        front.cutouts += WedgeMount().slot_loops(self.spec.width)

    def _add(self, name, lo, hi, axis, priority) -> Panel:
        panel = Panel(name, lo, hi, axis, priority)
        self.panels.append(panel)
        return panel
