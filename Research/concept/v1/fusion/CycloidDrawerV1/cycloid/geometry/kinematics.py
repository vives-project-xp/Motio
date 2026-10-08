"""Gear mesh phasing and the five-bar linkage pose (no Fusion dependency)."""
import math


def mesh_rotation(driver, driver_rot: float, driver_xy, gear, gear_xy, wanted: float) -> float:
    """Rotation (rad) for `gear` so its teeth sit in the gaps of `driver`.

    Of all valid rotations (one per tooth pitch) the one closest to `wanted` is returned.
    """
    alpha = math.atan2(gear_xy[1] - driver_xy[1], gear_xy[0] - driver_xy[0])
    beta = alpha + math.pi
    t = ((alpha - driver_rot) / driver.pitch_angle) % 1.0
    s = (0.5 - t) % 1.0
    base = beta - s * gear.pitch_angle
    steps = round((wanted - base) / gear.pitch_angle)
    return base + steps * gear.pitch_angle


def circle_intersections(p1, r1: float, p2, r2: float) -> list:
    d = math.dist(p1, p2)
    if d == 0 or d > r1 + r2 or d < abs(r1 - r2):
        return []
    a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d)
    h = math.sqrt(max(r1 ** 2 - a ** 2, 0.0))
    mx = p1[0] + a * (p2[0] - p1[0]) / d
    my = p1[1] + a * (p2[1] - p1[1]) / d
    ox, oy = -h * (p2[1] - p1[1]) / d, h * (p2[0] - p1[0]) / d
    return [(mx + ox, my + oy), (mx - ox, my - oy)]


class FiveBarPose:
    """Two arms pinned on the gear pins, joined with one bolt; pen at the end of arm A."""

    def __init__(self, pin_a, pin_b, hole_positions: list, pen_offset: float, target) -> None:
        self.pin_a, self.pin_b = pin_a, pin_b
        self.joint, self.hole_a, self.hole_b, self.pen = self._solve(hole_positions, pen_offset, target)

    def _solve(self, holes: list, pen_offset: float, target):
        best = None
        first = holes[0]
        for ha in holes[2:]:
            for hb in holes[2:]:
                for j in circle_intersections(self.pin_a, ha - first, self.pin_b, hb - first):
                    if j[1] > min(self.pin_a[1], self.pin_b[1]):
                        continue  # joint must hang towards the turntable
                    if not 50 < self._arm_angle(j) < 130:
                        continue  # avoid a near-straight (locking) linkage
                    pen = self._along(self.pin_a, j, pen_offset - first)
                    score = math.dist(pen, target)
                    if best is None or score < best[0]:
                        best = (score, j, ha, hb, pen)
        if best is None:
            raise ValueError("No valid arm pose found - check pin positions")
        return best[1:]

    def _arm_angle(self, j) -> float:
        a1 = math.atan2(self.pin_a[1] - j[1], self.pin_a[0] - j[0])
        a2 = math.atan2(self.pin_b[1] - j[1], self.pin_b[0] - j[0])
        return abs(math.degrees((a1 - a2 + math.pi) % (2 * math.pi) - math.pi))

    @staticmethod
    def _along(p, q, dist: float):
        ang = math.atan2(q[1] - p[1], q[0] - p[0])
        return (p[0] + dist * math.cos(ang), p[1] + dist * math.sin(ang))

    def arm_angle_a(self) -> float:
        return math.atan2(self.joint[1] - self.pin_a[1], self.joint[0] - self.pin_a[0])

    def arm_angle_b(self) -> float:
        return math.atan2(self.joint[1] - self.pin_b[1], self.joint[0] - self.pin_b[0])
