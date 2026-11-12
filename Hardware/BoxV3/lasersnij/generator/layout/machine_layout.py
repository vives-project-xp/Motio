"""Places the three motors on the lid and checks that everything fits."""
import math
from dataclasses import dataclass

import config as cfg


@dataclass(frozen=True)
class PlacedMotor:
    name: str
    x: float
    y: float

    def lid_holes(self) -> list:
        """(x, y, diameter) of the boss hole and the four bolt holes, y measured from the back edge."""
        half = cfg.MOTOR_BOLT_PITCH / 2
        bolts = [(self.x + dx, self.y + dy, cfg.MOTOR_BOLT_HOLE) for dx in (-half, half) for dy in (-half, half)]
        return [(self.x, self.y, cfg.MOTOR_BOSS_HOLE)] + bolts


class MachineLayout:
    def __init__(self) -> None:
        self.motors = [PlacedMotor(name, x, y) for name, (x, y) in cfg.MOTOR_CENTRES.items()]

    @property
    def platter_motor(self) -> PlacedMotor:
        return next(m for m in self.motors if m.name == cfg.PLATTER_MOTOR)

    def validate(self) -> list[str]:
        """Return a list of problems (empty = OK)."""
        problems = []
        for motor in self.motors:
            if not self._fits_on_lid(motor, self._reach(motor)):
                problems.append(f"motor {motor.name} or the part it turns sticks out over the lid edge")
        problems += self._motor_collisions()
        return problems

    @staticmethod
    def _reach(motor: PlacedMotor) -> float:
        """How far the part driven by this motor reaches from the motor axis (the motor body itself is smaller)."""
        return cfg.PLATTER_RADIUS if motor.name == cfg.PLATTER_MOTOR else cfg.CRANK_SWEEP_RADIUS

    def _fits_on_lid(self, motor: PlacedMotor, radius: float) -> bool:
        lo, hi_x, hi_y = cfg.CLEARANCE, cfg.LID_WIDTH - cfg.CLEARANCE, cfg.LID_DEPTH - cfg.CLEARANCE
        return motor.x - radius >= lo and motor.y - radius >= lo and motor.x + radius <= hi_x and motor.y + radius <= hi_y

    def _motor_collisions(self) -> list[str]:
        problems = []
        for i, a in enumerate(self.motors):
            for b in self.motors[i + 1:]:
                if max(abs(a.x - b.x), abs(a.y - b.y)) < cfg.MOTOR_WIDTH:
                    problems.append(f"motor {a.name} hits motor {b.name}")
        return problems
