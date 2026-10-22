"""Pose of the two-arm linkage of SIMV7 (no Fusion dependency): two cranks, two arms, the pen where the arms meet."""
import math


def crank_tip(pivot, radius: float, angle: float) -> tuple:
    return (pivot[0] + radius * math.cos(angle), pivot[1] + radius * math.sin(angle))


def pen_position(tip_a, tip_b, length_a: float, length_b: float, branch: int) -> tuple:
    """Intersection of the circles round both crank tips; `branch` (+1 or -1) picks one of the two."""
    d = math.dist(tip_a, tip_b)
    if d >= length_a + length_b or d <= abs(length_a - length_b):
        raise ValueError("The arms cannot close for these crank angles")
    along = (length_a ** 2 - length_b ** 2 + d ** 2) / (2 * d)
    height = math.sqrt(length_a ** 2 - along ** 2) * branch
    ux, uy = (tip_b[0] - tip_a[0]) / d, (tip_b[1] - tip_a[1]) / d
    return (tip_a[0] + along * ux - height * uy, tip_a[1] + along * uy + height * ux)


def direction(start, end) -> float:
    return math.atan2(end[1] - start[1], end[0] - start[0])
