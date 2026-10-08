"""Turns overlapping panel slabs into finger joints.

Every panel is modelled at its full outer size, so neighbours overlap in thin
prisms. Each prism is split into an odd number of segments that alternate
between the two panels; a cube shared by three panels goes to the highest
priority. The panel's 2D outline is whatever material it still owns.
"""
import itertools

from .outline import trace_loops


class _Joint:
    def __init__(self, first, second, lo, hi, finger: float) -> None:
        self.first, self.second = first, second          # first owns the even segments
        extents = [hi[i] - lo[i] for i in range(3)]
        self.axis = extents.index(max(extents))
        self.start, self.length = lo[self.axis], extents[self.axis]
        n = max(3, int(self.length / finger))
        self.count = n if n % 2 else n - 1
        self.count = max(3, self.count)

    def splits(self) -> list:
        step = self.length / self.count
        return [self.start + k * step for k in range(1, self.count)]

    def owner(self, c):
        k = int((c[self.axis] - self.start) / (self.length / self.count))
        return self.first if k % 2 == 0 else self.second


class FingerJointSolver:
    def __init__(self, panels: list, finger: float, thickness: float) -> None:
        self.panels = panels
        self.finger = finger
        self.min_joint = 1.5 * thickness
        self.joints = self._find_joints()
        self.breaks = self._breakpoints()

    def solve(self) -> None:
        for p in self.panels:
            p.loops = self._outline(p)

    # ---------------------------------------------------------------- joints
    def _find_joints(self) -> dict:
        joints = {}
        for a, b in itertools.combinations(self.panels, 2):
            lo = [max(a.lo[i], b.lo[i]) for i in range(3)]
            hi = [min(a.hi[i], b.hi[i]) for i in range(3)]
            if any(hi[i] - lo[i] <= 1e-6 for i in range(3)):
                continue
            if max(hi[i] - lo[i] for i in range(3)) < self.min_joint:
                continue
            first, second = (a, b) if a.priority >= b.priority else (b, a)
            joints[frozenset((a.name, b.name))] = _Joint(first, second, lo, hi, self.finger)
        return joints

    def _breakpoints(self) -> list:
        axes = [set(), set(), set()]
        for p in self.panels:
            for i in range(3):
                axes[i].update((round(p.lo[i], 6), round(p.hi[i], 6)))
        for j in self.joints.values():
            axes[j.axis].update(round(s, 6) for s in j.splits())
        return [sorted(a) for a in axes]

    # ------------------------------------------------------------- ownership
    def _owner(self, c):
        inside = [p for p in self.panels if p.contains(c)]
        if len(inside) == 1:
            return inside[0]
        if len(inside) == 2:
            joint = self.joints.get(frozenset(p.name for p in inside))
            if joint:
                return joint.owner(c)
        return max(inside, key=lambda p: p.priority)

    def _cells(self, panel, axis: int) -> list:
        b = [x for x in self.breaks[axis] if panel.lo[axis] - 1e-6 <= x <= panel.hi[axis] + 1e-6]
        return list(zip(b, b[1:]))

    def _outline(self, panel) -> list:
        ua, va = panel.uv_axes
        us, vs = self._cells(panel, ua), self._cells(panel, va)
        ts = self._cells(panel, panel.axis)
        owned = set()
        for i, (u0, u1) in enumerate(us):
            for j, (v0, v1) in enumerate(vs):
                if all(self._owns(panel, ua, va, (u0 + u1) / 2, (v0 + v1) / 2, (t0 + t1) / 2)
                       for t0, t1 in ts):
                    owned.add((i, j))
        u_edges = [u for u, _ in us] + [us[-1][1]]
        v_edges = [v for v, _ in vs] + [vs[-1][1]]
        return trace_loops(owned, u_edges, v_edges)

    def _owns(self, panel, ua: int, va: int, u: float, v: float, t: float) -> bool:
        c = [0.0, 0.0, 0.0]
        c[ua], c[va], c[panel.axis] = u, v, t
        return self._owner(c) is panel
