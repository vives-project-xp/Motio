"""One frame of the animation (no Fusion dependency)."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Pose:
    tip_a: tuple
    tip_b: tuple
    pen_xy: tuple
    platter_angle: float  # radians, counter-clockwise seen from above
