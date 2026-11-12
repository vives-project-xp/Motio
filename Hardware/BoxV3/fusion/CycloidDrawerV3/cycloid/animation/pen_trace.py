"""The line the pen draws on the paper, as a sketch that turns along with the paper."""
import math

import adsk.core
import adsk.fusion

from .. import config as cfg
from ..fusion import sketch_tools as st

MIN_SEGMENT = 0.01  # mm; shorter steps would give zero-length lines


class PenTrace:
    def __init__(self, paper: adsk.fusion.Component) -> None:
        self._sketch = paper.sketches.add(self._plane_on_paper(paper))
        self._sketch.isComputeDeferred = True  # the crossing lines would make every added line slower
        self._last_xy = None
        self._last_point = None

    @staticmethod
    def _plane_on_paper(paper: adsk.fusion.Component):
        plane_input = paper.constructionPlanes.createInput()
        offset = adsk.core.ValueInput.createByReal(cfg.PAPER_T * st.MM)
        plane_input.setByOffset(paper.xYConstructionPlane, offset)
        return paper.constructionPlanes.add(plane_input)

    def extend_to(self, paper_xy: tuple) -> None:
        """Draw on to `paper_xy` (mm, in the paper's own frame); the first call only sets the starting point."""
        if self._last_xy is None:
            self._last_xy = paper_xy
            return
        if math.dist(paper_xy, self._last_xy) < MIN_SEGMENT:
            return
        start = self._last_point or st.point(*self._last_xy)
        line = self._sketch.sketchCurves.sketchLines.addByTwoPoints(start, st.point(*paper_xy))
        self._last_point = line.endSketchPoint
        self._last_xy = paper_xy
