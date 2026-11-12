"""Distance of the pen from the platter centre during the animation (no Fusion dependency)."""
import math

from .. import config as cfg


def pen_radius(progress: float) -> float:
    """Radius in mm for `progress` from 0 to 1: a rose that grows out of the centre in the first moments."""
    angle = 2 * math.pi * cfg.ANIMATION_PLATTER_TURNS * progress
    rose = cfg.ROSE_MEAN_RADIUS + cfg.ROSE_AMPLITUDE * math.cos(cfg.ROSE_PETALS_PER_TURN * angle)
    return rose * _smoothstep(progress / cfg.ROSE_GROW_FRACTION)


def _smoothstep(t: float) -> float:
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)
