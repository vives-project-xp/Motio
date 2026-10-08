"""Involute spur gear profile (pure geometry, no SVG)."""
import math
from dataclasses import dataclass


def _inv(alpha: float) -> float:
    """Involute function."""
    return math.tan(alpha) - alpha


@dataclass(frozen=True)
class InvoluteGear:
    teeth: int
    module: float
    pressure_angle_deg: float = 20.0
    backlash: float = 0.15  # mm removed from the tooth thickness (laser tolerance)

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
        return self.pitch_radius * math.cos(math.radians(self.pressure_angle_deg))

    def center_distance(self, other: "InvoluteGear") -> float:
        return self.pitch_radius + other.pitch_radius

    def _half_angle(self, rho: float) -> float:
        """Half angular tooth thickness at radius rho."""
        rho = max(rho, self.base_radius)
        thickness = math.pi * self.module / 2 - self.backlash
        alpha0 = math.radians(self.pressure_angle_deg)
        alpha_rho = math.acos(self.base_radius / rho)
        return thickness / (2 * self.pitch_radius) + _inv(alpha0) - _inv(alpha_rho)

    def outline(self, steps: int = 8) -> list[tuple[float, float]]:
        """Closed outline as a list of (x, y) points, centred on (0, 0)."""
        start = max(self.base_radius, self.root_radius)
        radii = [start + (self.tip_radius - start) * i / steps for i in range(steps + 1)]
        pitch_angle = 2 * math.pi / self.teeth
        points: list[tuple[float, float]] = []
        for i in range(self.teeth):
            centre = i * pitch_angle
            points += self._tooth(centre, radii, steps)
            points += self._root_arc(centre, centre + pitch_angle, steps)
        return points

    def _tooth(self, centre: float, radii: list[float], steps: int) -> list[tuple[float, float]]:
        pts = []
        if self.base_radius > self.root_radius:
            pts.append(_polar(self.root_radius, centre - self._half_angle(self.base_radius)))
        pts += [_polar(r, centre - self._half_angle(r)) for r in radii]
        tip = self._half_angle(self.tip_radius)
        pts += [_polar(self.tip_radius, centre - tip + 2 * tip * k / steps) for k in range(1, steps)]
        pts += [_polar(r, centre + self._half_angle(r)) for r in reversed(radii)]
        if self.base_radius > self.root_radius:
            pts.append(_polar(self.root_radius, centre + self._half_angle(self.base_radius)))
        return pts

    def _root_arc(self, centre: float, next_centre: float, steps: int) -> list[tuple[float, float]]:
        start_r = max(self.base_radius, self.root_radius)
        a0 = centre + self._half_angle(start_r)
        a1 = next_centre - self._half_angle(start_r)
        return [_polar(self.root_radius, a0 + (a1 - a0) * k / steps) for k in range(1, steps)]


def _polar(r: float, a: float) -> tuple[float, float]:
    return (r * math.cos(a), r * math.sin(a))
