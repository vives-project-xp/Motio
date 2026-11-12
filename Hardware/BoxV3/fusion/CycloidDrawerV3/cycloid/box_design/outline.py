"""Boundary tracing of a set of filled grid cells into closed polygons."""
from collections import defaultdict


def trace_loops(cells: set, u_edges: list, v_edges: list) -> list:
    """Return closed loops [(u, v), ...]; outer loops CCW, holes CW."""
    edges = defaultdict(list)
    for i, j in cells:
        # every cell side that faces an empty neighbour becomes a CCW directed edge
        if (i, j - 1) not in cells:
            edges[(i, j)].append((i + 1, j))
        if (i + 1, j) not in cells:
            edges[(i + 1, j)].append((i + 1, j + 1))
        if (i, j + 1) not in cells:
            edges[(i + 1, j + 1)].append((i, j + 1))
        if (i - 1, j) not in cells:
            edges[(i, j + 1)].append((i, j))
    return [_simplify([(u_edges[i], v_edges[j]) for i, j in loop]) for loop in _chain(edges)]


def _chain(edges: dict) -> list:
    loops = []
    while any(edges.values()):
        start = next(k for k, v in edges.items() if v)
        loop, cur = [start], start
        while True:
            cur = edges[cur].pop(0)
            if cur == start:
                break
            loop.append(cur)
        loops.append(loop)
    return loops


def _simplify(pts: list) -> list:
    """Drop points that lie on a straight line between their neighbours."""
    keep = []
    n = len(pts)
    for k in range(n):
        a, b, c = pts[k - 1], pts[k], pts[(k + 1) % n]
        if abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) > 1e-9:
            keep.append(b)
    return keep
