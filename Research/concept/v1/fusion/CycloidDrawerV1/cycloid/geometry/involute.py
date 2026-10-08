"""Involute spur gear maths (no Fusion dependency)."""
import math


def _inv(alpha: float) -> float:
    return math.tan(alpha) - alpha


def polar(r: float, a: float) -> tuple:
    return (r * math.cos(a), r * math.sin(a))


class InvoluteGear:
    def __init__(self, teeth: int, module: float, backlash: float = 0.15,
                 pressure_angle_deg: float = 20.0) -> None:
        self.teeth = teeth
        self.module = module
        self.backlash = backlash
        self.alpha0 = math.radians(pressure_angle_deg)

    @property
    def pitch_radius(self) -> float:
        return self.module * self.teeth / 2

    @property
    def tip_radius(self) -> float:
        return self.pitch_radius + self.module

    @property
    def root_radius(self) -> float:
        return self.pitch_radius - 1.25 * self.module

    @property
    def base_radius(self) -> float:
        return self.pitch_radius * math.cos(self.alpha0)

    @property
    def pitch_angle(self) -> float:
        return 2 * math.pi / self.teeth

    def _half_angle(self, rho: float) -> float:
        rho = max(rho, self.base_radius)
        thickness = math.pi * self.module / 2 - self.backlash
        return (thickness / (2 * self.pitch_radius) + _inv(self.alpha0)
                - _inv(math.acos(self.base_radius / rho)))

    def tooth_outline(self, overlap: float = 0.5, steps: int = 8) -> list:
        """Closed outline of one tooth centred on angle 0.

        The base dips `overlap` mm below the root circle so it fuses with the disc.
        """
        start = max(self.base_radius, self.root_radius)
        radii = [start + (self.tip_radius - start) * i / steps for i in range(steps + 1)]
        base_r = self.root_radius - overlap
        pts = [polar(base_r, -self._half_angle(start))]
        pts += [polar(r, -self._half_angle(r)) for r in radii]
        tip = self._half_angle(self.tip_radius)
        pts += [polar(self.tip_radius, -tip + 2 * tip * k / steps) for k in range(1, steps)]
        pts += [polar(r, self._half_angle(r)) for r in reversed(radii)]
        pts.append(polar(base_r, self._half_angle(start)))
        return pts
