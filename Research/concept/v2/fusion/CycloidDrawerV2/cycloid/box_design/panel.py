"""A flat panel: an axis-aligned slab in 3D plus round holes in its own plane."""
from dataclasses import dataclass, field

# thickness axis -> which world axes become the panel's (u, v)
PLANE_AXES = {2: (0, 1), 1: (0, 2), 0: (1, 2)}


@dataclass
class Panel:
    name: str
    lo: tuple                 # (x0, y0, z0)
    hi: tuple                 # (x1, y1, z1)
    axis: int                 # thickness axis: 0 = X, 1 = Y, 2 = Z
    priority: int             # wins corner cubes shared by 3 panels
    section: str              # "bottom", "collar", "top"
    holes: list = field(default_factory=list)   # (u, v, diameter) in world units
    loops: list = field(default_factory=list)   # filled in by the solver

    @property
    def uv_axes(self) -> tuple:
        return PLANE_AXES[self.axis]

    def contains(self, p, eps: float = 1e-6) -> bool:
        return all(self.lo[i] + eps < p[i] < self.hi[i] - eps for i in range(3))

    def size_uv(self) -> tuple:
        a, b = self.uv_axes
        return (self.hi[a] - self.lo[a], self.hi[b] - self.lo[b])
